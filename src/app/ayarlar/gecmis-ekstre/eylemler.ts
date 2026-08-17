"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import readXlsxFile from "read-excel-file/node";

import { donemAnahtari } from "@/lib/kart-borcu";
import { prisma } from "@/lib/prisma";
import { paketiNormalle } from "@/lib/tablo/paket";
import { eslesmeOnerileri, type EslesmeOnerisi } from "@/lib/gecmis/kart-eslesme";
import {
  onizlemeKur,
  type MevcutDonem,
  type OnaylananEslesme,
  type Onizleme,
} from "@/lib/gecmis/onizleme";
import { ekstreleriOku, type OkumaSonucu } from "@/lib/gecmis/okuyucu";
import { yetkiIste } from "@/lib/yetki";

/**
 * ============================================================================
 *  GEÇMİŞ EKSTRE İÇE AKTARMA — SUNUCU EYLEMLERİ
 * ----------------------------------------------------------------------------
 *  Hesap saf katmanda (`lib/gecmis/*`); burada yalnız izin, dosya okuma ve
 *  YAZMA var.
 *
 *  ── İKİ KATMANLI ÖNİZLEME (mimar şartı) ─────────────────────────────────
 *  1. Dosya çözülür → kart eşleşme ÖNERİLERİ + okuma raporu döner.
 *     Kullanıcı 10 kartı tek tek onaylar/değiştirir/atlar.
 *  2. Onaylanan eşleşmelerle ÖNİZLEME kurulur → "N yazılacak, M atlandı".
 *     Kullanıcı bunu görüp onaylar.
 *  3. Ancak o zaman yazılır.
 *
 *  Hiçbir adım tek başına yazmaz. 160 satır yazan bir işlem, ne yazacağını
 *  önce göstermek zorundadır.
 * ============================================================================
 */

/** Dosya çözümü — HİÇBİR ŞEY YAZMAZ. */
export type CozumSonucu =
  | {
      tamam: true;
      okuma: OkumaSonucu;
      oneriler: EslesmeOnerisi[];
      kartlar: { id: string; label: string; bankName: string | null }[];
    }
  | { tamam: false; hata: string };

async function dosyayiCoz(dosya: File): Promise<OkumaSonucu | string> {
  const t = await getTranslations("GecmisEkstre");
  let sayfalar: { sheet: string; data: unknown[][] }[];
  try {
    const bayt = Buffer.from(await dosya.arrayBuffer());
    const { bayt: duz } = paketiNormalle(bayt);
    sayfalar = (await readXlsxFile(duz)) as unknown as typeof sayfalar;
  } catch {
    return t("hataDosyaOkunamadi");
  }

  /**
   * SAYFA ADIYLA DEĞİL YAPISIYLA BULUNUR. Gerçek dosyada sayfa adı
   * "KREDİ KART EKSTRELERİ " (sonda boşluk var) — ada güvenmek, kullanıcı
   * sekmeyi yeniden adlandırdığı gün sessizce çalışmaz olurdu.
   * Ölçüt: bir satırında hem "Dönem" hem "Borç" başlığı geçen sayfa.
   */
  const uygun = sayfalar.find((s) =>
    (s.data ?? []).some(
      (r) =>
        r.some((h) => typeof h === "string" && h.trim() === "Dönem") &&
        r.some((h) => typeof h === "string" && h.trim() === "Borç"),
    ),
  );
  if (!uygun) return t("hataSayfaBulunamadi");

  const basliklarSatiri = uygun.data.findIndex(
    (r) => r.some((h) => typeof h === "string" && h.trim() === "Dönem"),
  );
  // Kart etiketleri başlıkların BİR ÜSTÜNDE, veri BİR ALTINDA.
  if (basliklarSatiri < 1) return t("hataYapiTaninmadi");

  return ekstreleriOku({
    satirlar: uygun.data,
    etiketSatiriNo: basliklarSatiri - 1,
    veriBaslangici: basliklarSatiri + 1,
  });
}

export async function dosyayiIncele(
  _onceki: CozumSonucu | null,
  formData: FormData,
): Promise<CozumSonucu> {
  await yetkiIste("veri.aktar");
  const t = await getTranslations("GecmisEkstre");

  const dosya = formData.get("dosya");
  if (!(dosya instanceof File) || dosya.size === 0) {
    return { tamam: false, hata: t("hataDosyaYok") };
  }

  const okuma = await dosyayiCoz(dosya);
  if (typeof okuma === "string") return { tamam: false, hata: okuma };
  if (okuma.kartlar.length === 0) {
    return { tamam: false, hata: t("hataKartBulunamadi") };
  }

  const kartlar = await prisma.creditCard.findMany({
    where: { isActive: true },
    select: { id: true, label: true, bankName: true, holderName: true },
    orderBy: { label: "asc" },
  });

  return {
    tamam: true,
    okuma,
    oneriler: eslesmeOnerileri(
      okuma.kartlar.map((k) => k.etiket),
      kartlar,
    ),
    kartlar: kartlar.map((k) => ({
      id: k.id,
      label: k.label,
      bankName: k.bankName,
    })),
  };
}

/**
 * Sistemde o kart+dönem için ZATEN kayıt var mı — çakışma kuralının girdisi.
 *
 * İki kaynak: `GecmisEkstre` (önceki beyan) ve TÜRETİLMİŞ ekstreler.
 * Türetilmiş ekstre saklanmıyor, alımlardan hesaplanıyor; bu yüzden
 * `KartOdeme` kayıtları DEĞİL, gerçek türetme motoru sorulmalı. Ama motor
 * bütün alımları okuyor ve burada yalnız "o ayda ekstre var mı" bilgisi
 * gerekiyor: alım tarihi aralığı yeterli bir yaklaşımdır DEĞİL — yanlış
 * olurdu. Bu yüzden motor gerçekten çağrılıyor.
 */
async function mevcutDonemleriTopla(): Promise<MevcutDonem[]> {
  const { kartBorcuHesapla } = await import("@/lib/kart-borcu");
  const [kartlar, alimlar, odemeler, beyanlar] = await Promise.all([
    prisma.creditCard.findMany({ where: { isActive: true } }),
    prisma.purchase.findMany({
      where: { creditCardId: { not: null }, NOT: { status: "CANCELLED" } },
      select: {
        id: true,
        code: true,
        purchasedAt: true,
        installmentCount: true,
        creditCardId: true,
        items: {
          select: {
            quantity: true,
            unitCostAmount: true,
            unitCostCurrency: true,
          },
        },
      },
    }),
    prisma.kartOdeme.findMany({
      select: { cardId: true, donem: true, odenenAnaBorc: true },
    }),
    prisma.gecmisEkstre.findMany({ select: { cardId: true, donem: true } }),
  ]);

  const sonuc: MevcutDonem[] = beyanlar.map((b) => ({
    kartId: b.cardId,
    donemAnahtari: donemAnahtari(b.donem),
    kaynak: "GECMIS_EXCEL",
  }));

  for (const kart of kartlar) {
    const borc = [];
    for (const a of alimlar) {
      if (a.creditCardId !== kart.id) continue;
      let tutar = 0;
      for (const k of a.items) {
        if (k.unitCostCurrency !== kart.currency) continue;
        tutar += Number(k.unitCostAmount.toString()) * k.quantity;
      }
      if (tutar > 0) {
        borc.push({
          id: a.id,
          kod: a.code,
          tarih: a.purchasedAt,
          tutar,
          taksitSayisi: a.installmentCount,
        });
      }
    }
    const hesap = kartBorcuHesapla(
      borc,
      {
        kesimGunu: kart.statementDay,
        sonOdemeGunu: kart.dueDay,
        limit: null,
      },
      new Date(),
      odemeler
        .filter((o) => o.cardId === kart.id)
        .map((o) => ({
          donem: o.donem,
          odenenAnaBorc: Number(o.odenenAnaBorc.toString()),
        })),
    );
    if (!hesap.hesaplanabilir) continue;
    for (const e of hesap.ekstreler) {
      sonuc.push({
        kartId: kart.id,
        donemAnahtari: donemAnahtari(e.kesimTarihi),
        kaynak: "TURETILEN",
      });
    }
  }
  return sonuc;
}

export type OnizlemeSonucu =
  | { tamam: true; onizleme: Onizleme }
  | { tamam: false; hata: string };

/** İkinci katman: onaylanan eşleşmelerle önizleme. HİÇBİR ŞEY YAZMAZ. */
export async function onizlemeGetir(
  ekstrelerJson: string,
  atlananlarJson: string,
  eslesmeler: OnaylananEslesme[],
): Promise<OnizlemeSonucu> {
  await yetkiIste("veri.aktar");
  const t = await getTranslations("GecmisEkstre");
  try {
    const ham = JSON.parse(ekstrelerJson) as {
      kartEtiketi: string;
      yil: number;
      ay: number;
      donem: string;
      hamDonemMetni: string;
      borc: number;
      odenenTutar: number | null;
      odemeTarihi: string | null;
    }[];
    const onizleme = onizlemeKur({
      ekstreler: ham.map((e) => ({
        ...e,
        donem: new Date(e.donem),
        odemeTarihi: e.odemeTarihi === null ? null : new Date(e.odemeTarihi),
      })),
      atlananlar: JSON.parse(atlananlarJson),
      eslesmeler,
      mevcutDonemler: await mevcutDonemleriTopla(),
    });
    return { tamam: true, onizleme };
  } catch (e) {
    console.error("[gecmis onizleme] hata:", e);
    return { tamam: false, hata: t("hataOnizleme") };
  }
}

export type YazmaSonucu =
  | { tamam: true; yazilan: number; partiKodu: string }
  | { tamam: false; hata: string };

/**
 * Üçüncü katman: YAZAR. Tek transaction, parti damgalı.
 *
 * PARTİ KODU olmadan yanlış bir aktarımı geri almak tek tek silmek demektir
 * (bkz. şema notu). Kod zaman damgasından üretiliyor — kullanıcı hangi
 * aktarım olduğunu tarihinden tanır.
 */
export async function ekstreleriYaz(
  satirlarJson: string,
): Promise<YazmaSonucu> {
  await yetkiIste("veri.aktar");
  const t = await getTranslations("GecmisEkstre");

  let satirlar: {
    kartId: string;
    donem: string;
    hamDonemMetni: string;
    borc: number;
    odenenTutar: number | null;
    odemeTarihi: string | null;
  }[];
  try {
    satirlar = JSON.parse(satirlarJson);
  } catch {
    return { tamam: false, hata: t("hataOnizleme") };
  }
  if (satirlar.length === 0) return { tamam: false, hata: t("hataYazacakYok") };

  const partiKodu = `GE-${new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "")}`;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.gecmisEkstre.createMany({
        data: satirlar.map((s) => ({
          cardId: s.kartId,
          donem: new Date(s.donem),
          borc: String(s.borc),
          odenenTutar: s.odenenTutar === null ? null : String(s.odenenTutar),
          odemeTarihi: s.odemeTarihi === null ? null : new Date(s.odemeTarihi),
          hamDonemMetni: s.hamDonemMetni,
          iceAktarimKodu: partiKodu,
        })),
      });
    });
  } catch (e) {
    console.error("[gecmis yaz] hata:", e);
    return { tamam: false, hata: t("hataYazilamadi") };
  }

  revalidatePath("/kart-borcu");
  revalidatePath("/ayarlar/gecmis-ekstre");
  return { tamam: true, yazilan: satirlar.length, partiKodu };
}
