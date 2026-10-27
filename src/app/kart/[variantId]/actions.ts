"use server";

import { revalidatePath } from "next/cache";

import { izYaz } from "@/lib/iz";
import { prisma } from "@/lib/prisma";
import { varyantStogu } from "@/lib/stok";
import { yetkiIste } from "@/lib/yetki";

import { kimlikOku } from "../../../../scripts/ty/istemci";
import { gonderimSonucu } from "../../../../scripts/ty/yazici";
import { kimlikOku as n11KimlikOku } from "../../../../scripts/n11/istemci";
import { stokFiyatGonder as n11StokFiyatIste } from "../../../../scripts/n11/yazici";
import { kimlikOku as hbKimlikOku } from "../../../../scripts/hb/istemci";
import { HB_CANLI_YAZMA_ACIK, hbYazmaAcikMi } from "../../../../scripts/hb/yazici";
import { tyBatchCoz, type TyBatchDurumu } from "@/lib/kanal-gonderim-ty";
import { hbBaglami, hbStokFiyatYaz, tyBaglami, tyStokFiyatYaz, type HbGonderimSonucu, type TyGonderimSonucu } from "@/lib/kanal-fiyat-yaz";

/**
 * ============================================================================
 *  K169 — TRENDYOL'A STOK/FİYAT GÖNDERİMİ (ürün kartından, tek varyant)
 * ----------------------------------------------------------------------------
 *  Halil kararı 05.09.2026. İlk kanala-yazma akışı; üç kural:
 *  ① RAKAM GÖRÜLMEDEN GÖNDERİLMEZ — önizleme eylemi ayrı ve salt okuma;
 *    diyalog rakamları basar, onay o rakamların üstüne verilir (K164-③
 *    maliyet kuralının kanal tarafı).
 *  ② SUNUCU EKRANA GÜVENMEZ — gönderim, önizlemenin verisini İSTEMCİDEN
 *    almaz; barkodu ve stoğu kendisi YENİDEN çözer. İstemciden yalnız
 *    NİYET gelir (stok gönderilsin mi · fiyat kaç).
 *  ③ İZSİZ GÖNDERİM YOK — ne gönderildiği, TY'nin batch cevabı ve sonucu
 *    `KANAL_GONDERIMI` iziyle deftere yazılır (kim gönderdi dahil).
 *
 *  ⚠ Hata KODLA döner (K57-③); TY'nin "15 dk aynı istek" reddi de ayrı
 *  kodla taşınır — kullanıcı "bozuk" sanmasın.
 *
 *  ⛔ K201-3 DÜZELTMESİ (16.09.2026) — TY'YE GÖNDERİLEN `barcode`,
 *  `ChannelSku.channelSku` DEĞİL `ProductVariant.barcode`DAN OKUNUR.
 *  Kanal SKU (`channelSku`) genel bir "kanal kodu" alanıdır (CLAUDE.md:
 *  "Kanal SKU — pazaryeri kodu") ve boş bırakılırsa sistem SKU'suna düşer
 *  (`kanal-sku/actions.ts:100`); TY'nin `price-and-inventory` ucu ise
 *  `barcode` alanını GERÇEK EAN sanıyor — okuma tarafı (`kanal-listeleme-yaz.ts`)
 *  zaten `variant.barcode` ile eşleştiriyordu, yazma tarafı farklı bir alan
 *  kullanıyordu ("iki yerde iki ölçüt olmaz").
 *  ⚠ CANLI KANIT: 09.09.2026 04:51 — "Schafer Kitchenhouse Termos 2 L-Inox"
 *  (sku=KAM-SC-SK-01, gerçek barkod=8699131930403) için gönderilen istek
 *  `channelSku`den okunan `8699131308196`i taşıdı; TY bunu KABUL etti ve bu
 *  değer bizim hiçbir ürünümüzün barkodu değil — stok, alakasız/bize ait
 *  olmayan bir TY listelemesine gitmiş olabilir. 1090 aktif TY Kanal SKU'sunun
 *  17'sinde `channelSku`, `variant.barcode`den farklıydı.
 * ============================================================================
 */

export type TyGonderimOnizlemesi =
  | {
      tamam: true;
      barkod: string;
      sistemStogu: number;
      kanalAdet: number | null;
      listelemeDurumu: string;
    }
  | {
      tamam: false;
      kod: "KANAL_SKU_YOK" | "HESAP_YOK" | "VARYANT_YOK" | "VARYANT_BARKODU_YOK";
    };



export async function tyGonderimOnizle(
  variantId: string,
): Promise<TyGonderimOnizlemesi> {
  await yetkiIste("kanal.yaz");
  const b = await tyBaglami(variantId);
  if (!b.tamam) return { tamam: false, kod: b.kod };
  return {
    tamam: true,
    barkod: b.barkod,
    sistemStogu: await varyantStogu(variantId),
    kanalAdet: b.kanalSku.kanalAdet,
    listelemeDurumu: b.kanalSku.listelemeDurumu,
  };
}

export type { TyGonderimSonucu } from "@/lib/kanal-fiyat-yaz";

export async function tyStokFiyatGonder(
  variantId: string,
  niyet: { stokGonder: boolean; fiyat: number | null },
): Promise<TyGonderimSonucu> {
  await yetkiIste("kanal.yaz");
  return tyStokFiyatYaz(variantId, niyet);
}

/**
 * ============================================================================
 *  K194 — N11'E STOK/FİYAT GÖNDERİMİ (ürün kartından, tek varyant)
 * ----------------------------------------------------------------------------
 *  Halil kararı 09.09.2026: stok TEK düğmeyle üç kanala, fiyat kanal başına
 *  AYRI düğmeyle. TY'nin üç kuralı burada AYNEN geçerli (önizleme · sunucu
 *  ekrana güvenmez · izsiz gönderim yok) ve dördüncüsü ekleniyor:
 *
 *  ⛔ ④ KANALIN KURALI İSTEK GİTMEDEN SINANIR. N11 dokümanı üç şart koyuyor
 *  — `listPrice` ve `salePrice` BİRLİKTE · `listPrice > salePrice` · küsurat
 *  en fazla 2 hane — ve ihlalde isteği FAIL yapıyor. Bunları kanala
 *  sordurmak, önlenebilir bir gürültüyü canlıya taşımak olurdu. Ölçüt
 *  `kalemGecerliMi` içinde SAF gövdede ve bekçi onu ÇAĞIRARAK ölçüyor.
 *
 *  ⚠ TY'DEN FARK — FİYAT İKİ SAYIDIR: TY'ye `salePrice` ve `listPrice` AYNI
 *  değer gidiyor; N11 bunu reddediyor (liste, satıştan YÜKSEK olmalı). Bu
 *  yüzden N11 formu iki rakam sorar; tek "fiyat" alanı KULLANILAMAZ.
 * ============================================================================
 */

export type N11GonderimOnizlemesi =
  | {
      tamam: true;
      stockCode: string;
      sistemStogu: number;
      kanalAdet: number | null;
      listelemeDurumu: string;
    }
  | { tamam: false; kod: "KANAL_SKU_YOK" | "HESAP_YOK" | "VARYANT_YOK" };

type N11Baglam =
  | { tamam: false; kod: "HESAP_YOK" | "VARYANT_YOK" | "KANAL_SKU_YOK" }
  | {
      tamam: true;
      kanalSku: {
        channelSku: string;
        kanalAdet: number | null;
        listelemeDurumu: string;
      };
    };

async function n11Baglami(variantId: string): Promise<N11Baglam> {
  const hesap = await prisma.channelAccount.findFirst({
    where: { channel: { name: "N11" }, satisIcin: true, isActive: true },
    select: { id: true },
  });
  if (!hesap) return { tamam: false, kod: "HESAP_YOK" };
  const varyant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    select: { id: true },
  });
  if (!varyant) return { tamam: false, kod: "VARYANT_YOK" };
  const kanalSku = await prisma.channelSku.findFirst({
    where: { variantId, channelAccountId: hesap.id, isActive: true },
    select: { channelSku: true, kanalAdet: true, listelemeDurumu: true },
  });
  if (!kanalSku) return { tamam: false, kod: "KANAL_SKU_YOK" };
  return { tamam: true, kanalSku };
}

export async function n11GonderimOnizle(
  variantId: string,
): Promise<N11GonderimOnizlemesi> {
  await yetkiIste("kanal.yaz");
  const b = await n11Baglami(variantId);
  if (!b.tamam) return { tamam: false, kod: b.kod };
  return {
    tamam: true,
    stockCode: b.kanalSku.channelSku,
    sistemStogu: await varyantStogu(variantId),
    kanalAdet: b.kanalSku.kanalAdet,
    listelemeDurumu: b.kanalSku.listelemeDurumu,
  };
}

export type N11GonderimSonucu =
  | {
      tamam: true;
      stockCode: string;
      gonderilenStok: number | null;
      gonderilenListe: number | null;
      gonderilenSatis: number | null;
      taskId: number;
      /** N11 kuyruğu asenkron — kabul anındaki durum (IN_QUEUE olabilir). */
      taskDurumu: string;
      sebepler: string[];
    }
  | {
      tamam: false;
      kod:
        | "KANAL_SKU_YOK"
        | "HESAP_YOK"
        | "VARYANT_YOK"
        | "GONDERILECEK_YOK"
        | "KURAL_IHLALI"
        | "ANAHTAR_YOK"
        | "KANAL_REDDETTI"
        | "ULASILAMADI";
      ayrinti?: string;
    };

export async function n11StokFiyatGonder(
  variantId: string,
  /**
   * ⚠ İSTEMCİDEN YALNIZ NİYET GELİR. Stok sunucuda yeniden çözülür; fiyat
   * kullanıcının kararıdır ve iki rakam olarak gelir (N11 şartı).
   */
  niyet: {
    stokGonder: boolean;
    listeFiyati: number | null;
    satisFiyati: number | null;
  },
): Promise<N11GonderimSonucu> {
  await yetkiIste("kanal.yaz");
  const b = await n11Baglami(variantId);
  if (!b.tamam) return { tamam: false, kod: b.kod };

  const fiyatVar = niyet.listeFiyati !== null || niyet.satisFiyati !== null;
  if (!niyet.stokGonder && !fiyatVar) {
    return { tamam: false, kod: "GONDERILECEK_YOK" };
  }

  const k = n11KimlikOku();
  if (!k) return { tamam: false, kod: "ANAHTAR_YOK" };

  /** Stok SUNUCUDA yeniden çözülür — istemciden sayı alınmaz. */
  const stok = niyet.stokGonder ? await varyantStogu(variantId) : null;
  const kalem = {
    stockCode: b.kanalSku.channelSku,
    ...(stok === null ? {} : { quantity: stok }),
    ...(niyet.listeFiyati === null ? {} : { listPrice: niyet.listeFiyati }),
    ...(niyet.satisFiyati === null ? {} : { salePrice: niyet.satisFiyati }),
  };

  const sonuc = await n11StokFiyatIste(k, kalem);

  /**
   * ⛔ KURAL İHLALİ AĞA ÇIKMADAN DÖNER — ve iz YAZILMAZ, çünkü kanala
   * hiçbir şey gitmedi. "Gönderdim sanıyordum" sorusu burada doğmaz;
   * kullanıcı ekranda NEDEN gitmediğini görür.
   */
  if (sonuc.tur === "KURAL_IHLALI") {
    return { tamam: false, kod: "KURAL_IHLALI", ayrinti: sonuc.mesaj };
  }
  if (sonuc.tur === "YETKISIZ") {
    return {
      tamam: false,
      kod: "KANAL_REDDETTI",
      ayrinti: "HTTP " + sonuc.durum,
    };
  }
  if (sonuc.tur === "ULASILAMADI") {
    return { tamam: false, kod: "ULASILAMADI", ayrinti: sonuc.sebep };
  }
  if (sonuc.tur === "ISTEK_HATALI" || sonuc.tur === "REDDEDILDI") {
    const mesaj =
      sonuc.tur === "REDDEDILDI"
        ? sonuc.sebepler.join(" · ") || "(sebep bildirilmedi)"
        : sonuc.mesaj;
    /** ⚠ RED DE İZ BIRAKIR — kanala gitti ve reddedildi; bu bir olaydır. */
    await izYaz({
      action: "KANAL_GONDERIMI",
      targetType: "ProductVariant",
      targetId: variantId,
      detail: JSON.stringify({
        kanal: "N11",
        stockCode: kalem.stockCode,
        istek: kalem,
        sonuc: "RED",
        durum: sonuc.tur,
        mesaj,
      }),
    });
    return {
      tamam: false,
      kod: "KANAL_REDDETTI",
      ayrinti: mesaj.slice(0, 160),
    };
  }

  await izYaz({
    action: "KANAL_GONDERIMI",
    targetType: "ProductVariant",
    targetId: variantId,
    detail: JSON.stringify({
      kanal: "N11",
      stockCode: kalem.stockCode,
      istek: kalem,
      sonuc: "KABUL",
      taskId: sonuc.taskId,
      taskDurumu: sonuc.durum,
      sebepler: sonuc.sebepler,
      /**
       * ⚠ SONUÇ SORGUSU HENÜZ YOK — TaskDetails ucunun yolu dokümanda
       * verilmedi. IN_QUEUE "kuyruğa alındı" demektir, "işlendi" DEMEZ;
       * iz bunu açıkça taşıyor ki sonradan "başarılı" diye okunmasın.
       */
      not: "taskId kaydedildi; TaskDetails ucu gelince sonuc sorgulanacak",
    }),
  });
  revalidatePath("/kart/" + variantId);
  return {
    tamam: true,
    stockCode: kalem.stockCode,
    gonderilenStok: stok,
    gonderilenListe: niyet.listeFiyati,
    gonderilenSatis: niyet.satisFiyati,
    taskId: sonuc.taskId,
    taskDurumu: sonuc.durum,
    sebepler: sonuc.sebepler,
  };
}

/**
 * ============================================================================
 *  K194-HB — HEPSİBURADA'YA STOK/FİYAT GÖNDERİMİ (ürün kartından, tek varyant)
 * ----------------------------------------------------------------------------
 *  TY (K169) ve N11 (K194) ile AYNI üç kural: rakam görülmeden gönderilmez ·
 *  sunucu ekrana güvenmez (stok burada yeniden çözülür) · izsiz gönderim yok.
 *
 *  HB'ye özgü (SIT'te ölçüldü 01.10.2026, `scripts/hb/yazici.ts`):
 *  · stok ve fiyat AYRI yüklemeler — sonuç da parça parça döner ve İZ de
 *    parça parça yazılır; biri reddedilip öteki gitmiş olabilir;
 *  · stok yüklemesinin durumu başarıyı KANITLAMAZ → ilan geri okunur;
 *  · kanal kodu `ChannelSku.channelSku` = HB SKU'su (HBCV…/HBV…) —
 *    ölçüldü: 1.115 aktif HB ilanında bu alan HB SKU'sunu tutuyor.
 *  · canlı mağaza `HB_CANLI_YAZMA_ACIK` kilidiyle kapalı başlar; önizleme
 *    bunu SÖYLER, gönder düğmesi kapalı kalır.
 * ============================================================================
 */

export type HbGonderimOnizlemesi =
  | {
      tamam: true;
      hbSku: string;
      sistemStogu: number;
      kanalAdet: number | null;
      listelemeDurumu: string;
      /** Hangi mağazaya gideceği — TEST (deneme) ya da CANLI. */
      ortam: string;
      /** Canlı mağaza kilidi kapalıysa gönderim YAPILAMAZ ve ekran bunu söyler. */
      canliKapali: boolean;
    }
  | { tamam: false; kod: "KANAL_SKU_YOK" | "HESAP_YOK" | "VARYANT_YOK" | "ANAHTAR_YOK" };



export async function hbGonderimOnizle(variantId: string): Promise<HbGonderimOnizlemesi> {
  await yetkiIste("kanal.yaz");
  const b = await hbBaglami(variantId);
  if (!b.tamam) return { tamam: false, kod: b.kod };
  const k = hbKimlikOku();
  if (!k) return { tamam: false, kod: "ANAHTAR_YOK" };
  const ortam = k.ortam.toUpperCase();
  return {
    tamam: true,
    hbSku: b.kanalSku.channelSku,
    sistemStogu: await varyantStogu(variantId),
    kanalAdet: b.kanalSku.kanalAdet,
    listelemeDurumu: b.kanalSku.listelemeDurumu,
    ortam,
    canliKapali: !hbYazmaAcikMi(ortam, HB_CANLI_YAZMA_ACIK),
  };
}

export type { HbGonderimSonucu, HbParcaSonucu } from "@/lib/kanal-fiyat-yaz";

export async function hbStokFiyatGonder(
  variantId: string,
  /** ⚠ İSTEMCİDEN YALNIZ NİYET GELİR — stok sunucuda yeniden çözülür. */
  niyet: { stokGonder: boolean; fiyat: number | null },
): Promise<HbGonderimSonucu> {
  await yetkiIste("kanal.yaz");
  return hbStokFiyatYaz(variantId, niyet);
}

/**
 * ============================================================================
 *  K169 — TY SONUCUNU PENCERE SORMAYA DEVAM EDER (01.10.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ ÖLÇÜLDÜ: TY işlemeyi 12 sn'de BİTİRMİYOR — 01.10'daki iki gönderim de
 *  gönderim anında «işleniyor», 14 dk sonra sorulduğunda SUCCESS. TY bitiş
 *  anını vermiyor (`creationDate` = `lastModification`); süre ancak bizim
 *  sorumuzla ölçülür. Sunucuyu dakikalarca bekletmek yerine pencere 5 sn'de
 *  bir bu eylemi çağırır (en fazla 2 dk).
 *
 *  ⚠ SALT OKUMA (TY'ye GET) — kanala yeni bir şey göndermez. Yalnız BU
 *  varyantın kendi gönderim izinde duran kimlik sorgulanır; başka bir kimlik
 *  `GONDERIM_YOK` alır. Kesin sonuç (işlendi/reddedildi) bir kez ize yazılır,
 *  geçen süreyle — Trendyol'un gerçek işleme süresi böylece birikir.
 * ============================================================================
 */
export type TySonucSorgusu =
  | { tamam: true; batchDurumu: TyBatchDurumu; sebepler: string[] }
  | { tamam: false; kod: "GONDERIM_YOK" | "ANAHTAR_YOK" };

export async function tyGonderimSonucuSorgula(
  variantId: string,
  batchRequestId: string,
): Promise<TySonucSorgusu> {
  await yetkiIste("kanal.yaz");
  const kimlikDeseni = `"batchRequestId":${JSON.stringify(batchRequestId)}`;
  const gonderim = await prisma.auditLog.findFirst({
    where: { action: "KANAL_GONDERIMI", targetType: "ProductVariant", targetId: variantId, detail: { contains: kimlikDeseni } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (!gonderim) return { tamam: false, kod: "GONDERIM_YOK" };
  const k = kimlikOku();
  if (!k) return { tamam: false, kod: "ANAHTAR_YOK" };

  const batch = await gonderimSonucu(k, batchRequestId);
  const okuma: { durum: TyBatchDurumu; sebepler: string[] } =
    batch.tur === "VERI" ? tyBatchCoz(batch.govde) : { durum: "SORGULANAMADI", sebepler: [] };

  if (okuma.durum === "BASARILI" || okuma.durum === "BASARISIZ") {
    const yazilmis = await prisma.auditLog.count({
      where: { action: "KANAL_GONDERIMI_SONUCU", targetType: "ProductVariant", targetId: variantId, detail: { contains: kimlikDeseni } },
    });
    if (yazilmis === 0) {
      await izYaz({
        action: "KANAL_GONDERIMI_SONUCU",
        targetType: "ProductVariant",
        targetId: variantId,
        detail: JSON.stringify({
          kanal: "Trendyol",
          batchRequestId,
          batchDurumu: okuma.durum,
          sebepler: okuma.sebepler,
          /** Gönderim izinden bu yana — iz, gönderimden ~12 sn sonra yazılır. */
          izdenSonraSn: Math.round((Date.now() - gonderim.createdAt.getTime()) / 1000),
        }),
      });
    }
  }
  return { tamam: true, batchDurumu: okuma.durum, sebepler: okuma.sebepler };
}
