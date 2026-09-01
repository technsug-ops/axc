"use server";

/**
 * CIKIS YAZMAZ: bu gövde yalnız POZİTİF hareket yazıyor (mal girişi).
 * Parti bağı (`sourceMovementId`) ÇIKIŞIN alanıdır; giriş zaten partinin
 * KENDİSİDİR. _(K54 beyanı — çıkış yazan her gövde partiyi bağlamak
 * zorunda; yazmıyorsa gerekçesini beyan eder.)_
 */
import { yetkiIste } from "@/lib/yetki";
import { izYaz } from "@/lib/iz";
import { basariAdresi } from "@/lib/bildirim";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { sonSayimTarihleri, sayimGecersizlestir } from "@/lib/sayim-damgasi";
import {
  israrGecerliMi,
  SAYIM_ISRAR_SEBEPLERI,
  sayimKorumasi,
  type SayimIsrari,
  type SayimIsrarSebebi,
} from "@/lib/sayim-korumasi";
import { alimDurumunuHesapla, kalemTeslimAlinanlar } from "@/lib/stok";
import {
  DonemKorumasiHatasi,
  donemKapisi,
  donemIsrariniOku,
  donemIstisnaIzi,
  DONEM_ISTISNA_EYLEMI,
} from "@/lib/donem-kapisi";

export type MalKabulDurumu = {
  hatalar?: string[];
  /**
   * ⭐ SAYIM KAPISI DURAKSATTI — form ısrar bloğunu ÇİZSİN diye.
   * ⚠ Ekran bu bayrağa bakarak bloğu açar; sunucu yine de kendi ölçütünü
   * koşar. Tek gövde, iki yerden çağrılıyor.
   */
  sayimDuraksatti?: boolean;
  /**
   * ⭐ DÖNEM KAPISI DURAKSATTI (K108) — AYRI BAYRAK, bilerek.
   * Tek bayrak olsaydı ekran hangi kapının yandığını bilemez ve YANLIŞ
   * ısrar bloğunu açardı: kullanıcı sayım sebebi seçer, sunucu dönem
   * sebebi bekler, kimse niye ilerlemediğini anlamaz (İlke #5).
   */
  donemDuraksatti?: boolean;
  /**
   * ⚠ SOMUT SAYI EKRANA TAŞINIR (kullanıcı şartı 31.08.2026).
   * Yalnız bayrak dönseydi ekran "kapalı dönem" diye SOYUT bir cümle
   * kurardı; kullanıcı ne kadar şeyi etkilediğini görmeden ısrar
   * edemez. Rakam kapıda ZATEN ölçülüyor — taşımamak onu atmak olurdu.
   */
  donem?: string;
  donemSatisSayisi?: number;
};

/** Sözlükten çözülen çeviri işlevi. */
type Ceviri = (
  anahtar: string,
  degerler?: Record<string, string | number>,
) => string;

/**
 * Şema, mesajlar çözüldükten SONRA kurulur.
 * Modül seviyesinde kurulamaz: getTranslations() istek kapsamlıdır.
 */
function kabulSemasiKur(t: Ceviri) {
  const satirSemasi = z.object({
    purchaseItemId: z.string().min(1),
    saglam: z
      .number({ message: t("saglamSayiOlmali") })
      .int(t("saglamTamSayi"))
      .min(0, t("saglamNegatifOlamaz")),
    hasarli: z
      .number({ message: t("hasarliSayiOlmali") })
      .int(t("hasarliTamSayi"))
      .min(0, t("hasarliNegatifOlamaz")),
    locationId: z.string(),
    hasarNotu: z.string().trim().max(2000),
  });

  return z.object({
    teslimTarihi: z.string().min(1, t("teslimTarihiZorunlu")),
    satirlar: z.array(satirSemasi).min(1, t("kalemBulunamadi")),
  });
}

/**
 * MAL KABUL
 * ---------------------------------------------------------------------------
 * - SAĞLAM adet  -> PURCHASE_IN stok hareketi (ledger'a girer) + raf bilgisi
 * - HASARLI adet -> stoğa GİRMEZ, kalemdeki sayaca eklenir
 * - Aynı alım için birden fazla kez çalıştırılabilir (parçalı teslim)
 * - Hiçbir hareket silinmez/değiştirilmez; yalnızca yeni kayıt eklenir
 */
export async function malKabulEt(
  _oncekiDurum: MalKabulDurumu,
  formData: FormData,
): Promise<MalKabulDurumu> {
  await yetkiIste("malkabul.yaz");

  const t = await getTranslations("MalKabul");

  const alimId = String(formData.get("alimId") ?? "");
  if (!alimId) return { hatalar: [t("alimKimligiBulunamadi")] };

  const ham = formData.get("veri");
  if (typeof ham !== "string") return { hatalar: [t("formOkunamadi")] };

  let json: unknown;
  try {
    json = JSON.parse(ham);
  } catch {
    return { hatalar: [t("formBozuk")] };
  }

  const sonuc = kabulSemasiKur(t).safeParse(json);
  if (!sonuc.success) {
    return { hatalar: sonuc.error.issues.map((i) => i.message) };
  }
  const veri = sonuc.data;

  const tarih = new Date(veri.teslimTarihi);
  if (Number.isNaN(tarih.getTime())) {
    return { hatalar: [t("teslimTarihiGecersiz")] };
  }


  const alim = await prisma.purchase.findUnique({
    where: { id: alimId },
    include: { items: true },
  });
  if (!alim) return { hatalar: [t("alimBulunamadi")] };

  if (alim.status === "CANCELLED") {
    return { hatalar: [t("iptalEdilmisAlim")] };
  }
  if (alim.status === "RECEIVED") {
    return { hatalar: [t("zatenTamamlanmis")] };
  }

  // Girilen satırlar gerçekten bu alıma mı ait?
  const kalemHaritasi = new Map(alim.items.map((k) => [k.id, k]));
  for (const satir of veri.satirlar) {
    if (!kalemHaritasi.has(satir.purchaseItemId)) {
      return { hatalar: [t("kalemBuAlimaAitDegil")] };
    }
  }

  // Şu ana kadar teslim alınan sağlam adetler (ledger'dan).
  const teslimAlinanlar = await kalemTeslimAlinanlar(
    alim.items.map((k) => k.id),
  );

  // Fazla kabul engeli: beklenenden çok mal girilemez.
  const hatalar: string[] = [];
  let toplamIslem = 0;

  for (const satir of veri.satirlar) {
    const kalem = kalemHaritasi.get(satir.purchaseItemId)!;
    const oncekiSaglam = teslimAlinanlar.get(kalem.id) ?? 0;
    const kalan = kalem.quantity - oncekiSaglam - kalem.damagedQuantity;
    const girilen = satir.saglam + satir.hasarli;

    toplamIslem += girilen;

    if (girilen > kalan) {
      hatalar.push(
        t("fazlaGiris", { kalan, girilen }),
      );
    }
  }

  if (toplamIslem === 0) {
    hatalar.push(t("enAzBirAdet"));
  }
  if (hatalar.length) return { hatalar };

  /**
   * ═══ SAYIM KAPISI ════════════════════════════════════════════════════════
   *
   * ⭐ ANAYASA: **FİZİKSEL SAYIM SON SÖZDÜR.** Teslim tarihi kullanıcıdan
   * geliyor; geç girilen bir mal kabulü sayımdan ÖNCEYE düşebilir.
   *
   * ⚠ YÖN ARTIRAN VE MEŞRU — VE BU ÖLÇÜLDÜ: 29.08.2026'da sayımdan sonra
   * yazılan 15 geriye dönük hareketin **hepsi `PURCHASE_IN`**di, yani
   * gerçekten olmuş mal kabulleri. Yasaklamak çalışan bir işi kilitlerdi.
   *
   * ⛔ AMA SESSİZ DE GEÇMEZ: mal sayım sırasında raftaysa **SAYAN KİŞİ ONU
   * ZATEN SAYDI**; geriye dönük alım aynı malı İKİNCİ KEZ ekler ve stok
   * ŞİŞER. Kullanıcı ısrar ederse geçer — sebebiyle ve izle.
   *
   * ⚠ KAPI KALEM BAŞINA ÖLÇÜLÜR, ISRAR MAL KABUL BAŞINA: teslim tarihi tek.
   */
  const kabulEdilenler = veri.satirlar.filter((s) => s.saglam > 0);
  const varyantIdleri = [
    ...new Set(
      kabulEdilenler.map((s) => kalemHaritasi.get(s.purchaseItemId)!.variantId),
    ),
  ];
  /**
   * ═══ DÖNEM KAPISI (K108) — SAYIM KAPISINDAN ÖNCE ═══
   * ⚠ SIRA ÖNEMSİZ AMA AYRI: iki kapı iki farklı riski soruyor. Dönem
   * MALİ (beyan edilmiş vergi), sayım FİZİKSEL (rafta ne var). Tek onayda
   * birleştirilselerdi kullanıcı birini geçmek için ötekini de geçerdi.
   */
  try {
    const donemSonucu = await donemKapisi(
      prisma,
      tarih,
      donemIsrariniOku(formData),
    );
    if (donemSonucu.durum === "ISRARLA_GECILDI") {
      /**
       * ⛔ İZ ORTAK GÖVDEDEN — `userId` KENDİLİĞİNDEN DAMGALANIR (K90).
       * İSTISNA İZLERİ ÖZELLİKLE ÖNEMLİ: bunlar bir insanın uyarıyı AŞTIĞINI
       * kaydeder. "Kim" yazılmazsa üç ay sonra "bunu neden geçmişiz"
       * sorusunun cevabı yarım kalır.
       */
      await izYaz({
        action: DONEM_ISTISNA_EYLEMI,
        targetType: "Purchase",
        targetId: alimId,
        detail: donemIstisnaIzi({
          yol: "/alimlar/[id]/mal-kabul",
          donem: donemSonucu.donem,
          isTarihi: tarih,
          israr: donemIsrariniOku(formData),
        }),
      });
    }
  } catch (e) {
    if (e instanceof DonemKorumasiHatasi) {
      return {
        hatalar: [
          t("donemKapali", { donem: e.donem, sayi: e.satisSayisi }),
          e.eksik === "onay"
            ? t("donemIsrariOnayGerek")
            : e.eksik === "sebep"
              ? t("donemIsrariSebepGerek")
              : t("donemIsrariAciklamaGerek"),
        ],
        donemDuraksatti: true,
        donem: e.donem,
        donemSatisSayisi: e.satisSayisi,
      };
    }
    throw e;
  }

  const sonSayimlar = await sonSayimTarihleri(prisma, varyantIdleri);
  const duraksayanlar: string[] = [];
  for (const satir of kabulEdilenler) {
    const kalem = kalemHaritasi.get(satir.purchaseItemId)!;
    const karar = sayimKorumasi({
      sonSayimIsTarihi: sonSayimlar.get(kalem.variantId) ?? null,
      hareketIsTarihi: tarih,
      /** ⚠ Mal kabul giriştir — işaret ARTI. */
      adet: satir.saglam,
    });
    if (karar.sonuc === "DURAKSA") duraksayanlar.push(kalem.variantId);
  }
  if (duraksayanlar.length > 0) {
    /**
     * ⛔ SUNUCU EKRANA GÜVENMEZ — aynı saf gövde burada da koşuyor.
     */
    const israr: SayimIsrari = {
      onaylandi: String(formData.get("sayimIsrariOnay") ?? "") === "1",
      sebep: (SAYIM_ISRAR_SEBEPLERI as readonly string[]).includes(
        String(formData.get("sayimIsrariSebep") ?? ""),
      )
        ? (String(formData.get("sayimIsrariSebep")) as SayimIsrarSebebi)
        : null,
      aciklama: String(formData.get("sayimIsrariAciklama") ?? ""),
    };
    const g = israrGecerliMi(israr);
    if (!g.gecerli) {
      return {
        hatalar: [
          t("sayimIsrariArtiran", { adet: duraksayanlar.length }),
          g.eksik === "onay"
            ? t("sayimIsrariOnayGerek")
            : g.eksik === "sebep"
              ? t("sayimIsrariSebepGerek")
              : t("sayimIsrariAciklamaGerek"),
        ],
        sayimDuraksatti: true,
      };
    }
    /**
     * ⚠ İSTİSNA GEÇTİ — İZ İKİ YERE. `AuditLog` geçmişe bakan, damga
     * ileriye bakan; biri ötekinin yerine geçmez.
     */
    const an = new Date();
    await sayimGecersizlestir(prisma, duraksayanlar, an);
    /**
     * ⛔ İZ ORTAK GÖVDEDEN — `userId` KENDİLİĞİNDEN DAMGALANIR (K90).
     * İSTISNA İZLERİ ÖZELLİKLE ÖNEMLİ: bunlar bir insanın uyarıyı AŞTIĞINI
     * kaydeder. "Kim" yazılmazsa üç ay sonra "bunu neden geçmişiz"
     * sorusunun cevabı yarım kalır.
     */
    await izYaz({
      action: "SAYIM_KORUMASI_ISTISNASI",
      targetType: "Purchase",
      targetId: alimId,
      detail: JSON.stringify({
        yol: "/alimlar/[id]/mal-kabul",
        yon: "ARTIRAN",
        teslimTarihi: tarih.toISOString(),
        sebep: israr.sebep,
        aciklama: israr.aciklama.trim() || null,
        varyantlar: duraksayanlar,
        sonuc: "SAYIM GECERSIZLESTI — bu varyantlar yeniden sayilmali.",
      }),
    });
  }

  // Raf seçimleri geçerli mi?
  const rafIdleri = [
    ...new Set(veri.satirlar.map((s) => s.locationId).filter(Boolean)),
  ];
  if (rafIdleri.length) {
    const bulunan = await prisma.location.count({
      where: { id: { in: rafIdleri } },
    });
    if (bulunan !== rafIdleri.length) {
      return { hatalar: [t("rafMevcutDegil")] };
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      for (const satir of veri.satirlar) {
        const kalem = kalemHaritasi.get(satir.purchaseItemId)!;
        const raf = satir.locationId || null;

        // 1) SAĞLAM -> ledger'a giriş
        if (satir.saglam > 0) {
          await tx.stockMovement.create({
            data: {
              variantId: kalem.variantId,
              type: "PURCHASE_IN",
              quantityDelta: satir.saglam,
              occurredAt: tarih,
              purchaseItemId: kalem.id,
              locationId: raf,
              // Giriş anındaki maliyet ileride stok değerlemesinde kullanılacak.
              unitCostAmount: kalem.unitCostAmount,
              unitCostCurrency: kalem.unitCostCurrency,
              note: `Mal kabul — ${alim.code}`,
            },
          });

          // Varyantın güncel rafı, en son yerleştirilen raf olsun.
          if (raf) {
            await tx.productVariant.update({
              where: { id: kalem.variantId },
              data: { locationId: raf },
            });
          }
        }

        // 2) HASARLI -> stoğa girmez, kalemdeki sayaç artar
        if (satir.hasarli > 0 || satir.hasarNotu) {
          const yeniNot = [kalem.damageNote, satir.hasarNotu]
            .filter(Boolean)
            .join("\n");

          await tx.purchaseItem.update({
            where: { id: kalem.id },
            data: {
              damagedQuantity: { increment: satir.hasarli },
              damageNote: yeniNot || null,
            },
          });
        }
      }
    });
  } catch (e) {
    console.error("[mal kabul] beklenmeyen hata:", e);
    return { hatalar: [t("kaydedilemedi")] };
  }

  // Durumu yeniden hesapla (işlem sonrası güncel ledger ile).
  const guncelKalemler = await prisma.purchaseItem.findMany({
    where: { purchaseId: alimId },
    select: { id: true, quantity: true, damagedQuantity: true },
  });
  const guncelTeslimler = await kalemTeslimAlinanlar(
    guncelKalemler.map((k) => k.id),
  );

  const yeniDurum = alimDurumunuHesapla(
    guncelKalemler.map((k) => ({
      beklenen: k.quantity,
      saglam: guncelTeslimler.get(k.id) ?? 0,
      hasarli: k.damagedQuantity,
    })),
  );

  await prisma.purchase.update({
    where: { id: alimId },
    data: {
      status: yeniDurum,
      receivedAt: yeniDurum === "RECEIVED" ? tarih : null,
    },
  });

  revalidatePath("/alimlar");
  revalidatePath(`/alimlar/${alimId}`);
  revalidatePath("/stok");
  revalidatePath("/urunler");

  // Sonucu detay sayfasında görünür şekilde bildir (#5) — sessiz başarı yasak.
  const toplamSaglam = veri.satirlar.reduce((t, s) => t + s.saglam, 0);
  const toplamHasarli = veri.satirlar.reduce((t, s) => t + s.hasarli, 0);
  redirect(
    basariAdresi(`/alimlar/${alimId}?saglam=${toplamSaglam}&hasarli=${toplamHasarli}`, "malKabul"),
  );
}
