import readXlsxFile from "read-excel-file/node";

import { prisma } from "@/lib/prisma";
import { paketiNormalle } from "@/lib/tablo/paket";

import { tarifeOku, type TarifeOkumasi } from "./tarife-okuyucu";
import {
  tarifePlaniKur,
  yazilabilirMi,
  type TarifePlani,
} from "./tarife-plan";

/**
 * ============================================================================
 *  TARİFE YAZIMI — VERİ KATMANI
 * ----------------------------------------------------------------------------
 *  Okuma ve plan saf katmanda (`tarife-okuyucu.ts`, `tarife-plan.ts`);
 *  burada yalnız veritabanı işi var.
 *
 *  ── AYNI PENCERE İKİNCİ KEZ: ÜZERİNE YAZILIR ────────────────────────────
 *  Mimar kararı 18.08.2026, gerekçesi şu: bir pencerenin tarifesi kanalın
 *  YAYIMLADIĞI BİR OLGUDUR; aynı pencerenin iki yüklemesi aynı içeriğe
 *  yakınsamalıdır. Reddetseydik ilk yükleme eksik ya da bozuk geldiğinde
 *  düzeltmenin tek yolu elle silmek olurdu.
 *
 *  **Ledger dokunulmazlığı burada GEÇERLİ DEĞİL** — bu referans veri,
 *  hareket kaydı değil. Stok/kâr defterlerinde kayıt silinmez; tarife ise
 *  kanalın o hafta ne dediğinin kopyasıdır.
 *
 *  Ama sessiz olmuyor: `yuklemeSayisi` artıyor, `yuklendiAt` tazeleniyor
 *  ve rapor "aynı pencere N. kez yüklendi" diyor.
 *
 *  ── KOMİSYON ORANI BURADAN YAZILMAZ ─────────────────────────────────────
 *  ⚠ `ChannelSku.commissionRate`e bu modül DOKUNMAZ. O alanı mevcut
 *  komisyon yükleme yolu (`komisyon/yukle.ts`) yazıyor ve orada üç aşamalı
 *  eşleştirme, eksik eşleme yaratma gibi sınanmış bir mantık var.
 *  Buraya kopyalasaydık aynı kural sistemde İKİ yerde yaşardı — bu paketin
 *  ilk dersi tam olarak buydu. İki yol aynı dosyayı okur, farklı şeyler
 *  yazar: biri güncel oranı, öteki tam tarifeyi.
 * ============================================================================
 */

export type TarifeYuklemeSonucu =
  | {
      durum: "HATA";
      /**
       * MAKİNE OKUNUR KOD — ekran bunu Türkçeye çevirir.
       * ⚠ 25.08.2026 canlı hatası: yalnız `engel` vardı ve ekran onu OLDUĞU
       * GİBİ basıyordu; kullanıcı Hepsiburada teklif dosyasını yükleyince
       * ham `SUTUN_EKSIK` gördü. Kod ile insan cümlesi AYRI alanlar: betik
       * kodu/ham metni yazar, ekran çeviriyi.
       */
      kod: "DOSYA_OKUNAMADI" | "SUTUN_EKSIK" | "PENCERE_YOK" | "SATIR_YOK";
      /** Betik çıktısı için ham metin — ekranda GÖSTERİLMEZ. */
      engel: string;
      eksikler?: string[];
    }
  | {
      durum: "ONIZLEME";
      okuma: TarifeOkumasi;
      plan: TarifePlani;
      /** Aynı pencere daha önce yüklenmiş mi — kullanıcı ONAYDAN ÖNCE bilsin. */
      mevcutYukleme: { yuklemeSayisi: number; yuklendiAt: Date } | null;
    }
  | {
      durum: "YAZILDI";
      tarifeId: string;
      plan: TarifePlani;
      pencere: { baslangic: Date; bitis: Date };
      yuklemeSayisi: number;
    };

/** Dosyayı okur ve planı kurar — HİÇBİR ŞEY YAZMAZ. */
export async function tarifeDenetle(
  dosya: Buffer,
  channelAccountId: string,
  bugun: Date,
): Promise<TarifeYuklemeSonucu> {
  let veri: unknown[][];
  try {
    /**
     * NORMALLEŞTİRİCİDEN GEÇER — Trendyol dosyaları ZIP64 + veri
     * tanımlayıcılı geliyor ve `read-excel-file` onları açamıyor
     * (`lib/tablo/paket.ts`, ölçüm 11.08.2026).
     */
    const { bayt } = paketiNormalle(dosya);
    const sayfalar = (await readXlsxFile(bayt)) as unknown as {
      sheet: string;
      data: unknown[][];
    }[];
    /**
     * TARİFE SAYFASINI ARA. Dosya birden çok sayfa taşıyabilir; ilkine
     * bakıp "kolon yok" demek yanlış sayfaya bakmak olurdu.
     */
    let secilen: unknown[][] | null = null;
    for (const s of sayfalar) {
      const deneme = tarifeOku(s.data ?? [], bugun);
      if (deneme.eksikSutunlar.length === 0) {
        secilen = s.data ?? [];
        break;
      }
    }
    veri = secilen ?? (sayfalar[0]?.data ?? []);
  } catch (e) {
    return {
      durum: "HATA",
      kod: "DOSYA_OKUNAMADI",
      engel: `DOSYA_OKUNAMADI: ${String(e).slice(0, 200)}`,
    };
  }

  const okuma = tarifeOku(veri, bugun);
  const izin = yazilabilirMi(okuma);
  if (!izin.olur) {
    return {
      durum: "HATA",
      kod: izin.engel,
      engel: izin.engel,
      eksikler: "eksikler" in izin ? izin.eksikler : undefined,
    };
  }

  const varyantlar = await prisma.productVariant.findMany({
    where: { barcode: { not: null } },
    select: { id: true, barcode: true },
  });
  /**
   * O HESABIN KANAL SKU'LARI — birincil eşleşme anahtarı. Dosya
   * pazaryerinin kendi kodunu taşıyor; katalog barkodumuz aynı olmak
   * zorunda değil (ölçüldü 19.08.2026: 3 bağsızın biri bu yüzdendi).
   */
  const kanalKodlari = await prisma.channelSku.findMany({
    where: { channelAccountId, isActive: true },
    select: { channelSku: true, variantId: true },
  });

  const plan = tarifePlaniKur(
    okuma,
    varyantlar.map((v) => ({ id: v.id, barkod: v.barcode })),
    kanalKodlari.map((k) => ({ kanalKodu: k.channelSku, variantId: k.variantId })),
  );

  const mevcut = await prisma.komisyonTarifesi.findUnique({
    where: {
      channelAccountId_pencereBaslangic: {
        channelAccountId,
        pencereBaslangic: okuma.pencere!.baslangic,
      },
    },
    select: { yuklemeSayisi: true, yuklendiAt: true },
  });

  return { durum: "ONIZLEME", okuma, plan, mevcutYukleme: mevcut };
}

/** Tarifeyi yazar. Önizleme ile AYNI yoldan geçer — iki hesap olmasın. */
export async function tarifeYaz(girdi: {
  dosya: Buffer;
  dosyaAdi: string;
  channelAccountId: string;
  bugun: Date;
}): Promise<TarifeYuklemeSonucu> {
  const onizleme = await tarifeDenetle(
    girdi.dosya,
    girdi.channelAccountId,
    girdi.bugun,
  );
  if (onizleme.durum !== "ONIZLEME") return onizleme;

  const { okuma, plan } = onizleme;
  const pencere = okuma.pencere!;

  const tarifeId = await prisma.$transaction(async (tx) => {
    const mevcut = await tx.komisyonTarifesi.findUnique({
      where: {
        channelAccountId_pencereBaslangic: {
          channelAccountId: girdi.channelAccountId,
          pencereBaslangic: pencere.baslangic,
        },
      },
      select: { id: true, yuklemeSayisi: true },
    });

    let id: string;
    if (mevcut) {
      /**
       * ÜZERİNE YAZ — önce eski kalemler silinir. Silmeden `createMany`
       * yapsaydık tekillik anahtarına çarpardı; `upsert` ile tek tek
       * yazmak da dosyadan DÜŞEN bir kalemi (artık yayımlanmayan ürün)
       * eskisi gibi bırakırdı. Pencere içeriği bütün olarak yenilenir.
       */
      await tx.komisyonTarifeKalemi.deleteMany({ where: { tarifeId: mevcut.id } });
      await tx.komisyonTarifesi.update({
        where: { id: mevcut.id },
        data: {
          pencereBitis: pencere.bitis,
          tarifeGrubu: okuma.tarifeGrubu,
          kaynakDosyaAdi: girdi.dosyaAdi,
          yuklemeSayisi: mevcut.yuklemeSayisi + 1,
          yuklendiAt: girdi.bugun,
        },
      });
      id = mevcut.id;
    } else {
      const yeni = await tx.komisyonTarifesi.create({
        data: {
          channelAccountId: girdi.channelAccountId,
          pencereBaslangic: pencere.baslangic,
          pencereBitis: pencere.bitis,
          tarifeGrubu: okuma.tarifeGrubu,
          kaynakDosyaAdi: girdi.dosyaAdi,
          yuklendiAt: girdi.bugun,
        },
        select: { id: true },
      });
      id = yeni.id;
    }

    await tx.komisyonTarifeKalemi.createMany({
      data: plan.kalemler.map((k) => ({
        tarifeId: id,
        barkod: k.barkod,
        saticiStokKodu: k.saticiStokKodu,
        urunAdi: k.urunAdi,
        variantId: k.variantId,
        dilimSirasi: k.dilimSirasi,
        altLimit: k.altLimit === null ? null : String(k.altLimit),
        ustLimit: k.ustLimit === null ? null : String(k.ustLimit),
        oran: String(k.oran),
      })),
    });

    return id;
  });

  const sonrasi = await prisma.komisyonTarifesi.findUnique({
    where: { id: tarifeId },
    select: { yuklemeSayisi: true },
  });

  return {
    durum: "YAZILDI",
    tarifeId,
    plan,
    pencere,
    yuklemeSayisi: sonrasi?.yuklemeSayisi ?? 1,
  };
}
