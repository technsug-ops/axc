import { revalidatePath } from "next/cache";

import { izYaz } from "@/lib/iz";
import { prisma } from "@/lib/prisma";
import { varyantStogu } from "@/lib/stok";
import { parcaHukmu, type ParcaHukmu } from "@/lib/kanal-gonderim-hb";
import { tyBatchCoz, type TyBatchDurumu } from "@/lib/kanal-gonderim-ty";

import { kimlikOku } from "../../scripts/ty/istemci";
import { gonderimSonucu, stokFiyatGonder } from "../../scripts/ty/yazici";
import { kimlikOku as hbKimlikOku } from "../../scripts/hb/istemci";
import {
  kanaldakiIlan as hbKanaldakiIlan,
  stokFiyatGonder as hbStokFiyatIste,
  yuklemeDurumu as hbYuklemeDurumu,
  type KanaldakiIlan as HbKanaldakiIlan,
  type YuklemeSonucu as HbYuklemeSonucu,
} from "../../scripts/hb/yazici";

/**
 * ============================================================================
 *  KANALA STOK/FİYAT YAZMA ÇEKİRDEĞİ — TY ve HB (K366 adım 3, 27.10.2026)
 * ----------------------------------------------------------------------------
 *  Bu gövdeler 27.10.2026'ya kadar ürün kartının sunucu eylemlerinin İÇİNDEYDİ
 *  (`src/app/kart/[variantId]/actions.ts`). Buybox otomatik modu aynı gönderimi
 *  OTURUMSUZ bir zamanlanmış işten yapmak zorunda; eylemler ise ilk satırda
 *  oturumdaki kullanıcının iznini istiyor. Gönderim mantığı İKİ KOPYAYA
 *  bölünmesin diye (kanal kuralları, iz, geri okuma tek yerde) gövde buraya
 *  taşındı; eylem artık «izin + bu gövde»dir. Davranış DEĞİŞMEDİ.
 *
 *  ⛔ BU DOSYADA İZİN KAPISI YOK — kapı ÇAĞIRANDADIR. Bu yüzden:
 *   · `"use server"` TAŞIMAZ (taşısaydı her dışa aktarım tarayıcıdan
 *     çağrılabilen, izinsiz bir eylem olurdu);
 *   · yalnız BEYANLI dosyalar içe alır (`buybox-kural:dogrula` → içe alanlar
 *     taranır, beyansız içe alan KIRMIZI): kart eylemleri (`yetkiIste`) ve
 *     Buybox otomatik işi (`CRON_SECRET` kapılı uç).
 *  Kurallar (K169 · K194-HB) AYNEN: sunucu ekrana güvenmez (barkod/stok burada
 *  çözülür) · izsiz gönderim yok (KABUL ve RED iz bırakır) · HB'de başarı
 *  ilan geri okunarak verilir.
 * ============================================================================
 */

export type TyBaglam =
  | {
      tamam: false;
      kod: "HESAP_YOK" | "VARYANT_YOK" | "KANAL_SKU_YOK" | "VARYANT_BARKODU_YOK";
    }
  | {
      tamam: true;
      /** ⛔ TY'YE GİDECEK GERÇEK BARKOD — `variant.barcode`, `channelSku` DEĞİL. */
      barkod: string;
      kanalSku: {
        kanalAdet: number | null;
        listelemeDurumu: string;
      };
    };

export async function tyBaglami(variantId: string): Promise<TyBaglam> {
  const hesap = await prisma.channelAccount.findFirst({
    where: { channel: { name: "Trendyol" }, satisIcin: true, isActive: true },
    select: { id: true },
  });
  if (!hesap) return { tamam: false, kod: "HESAP_YOK" };
  const varyant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    select: { id: true, barcode: true },
  });
  if (!varyant) return { tamam: false, kod: "VARYANT_YOK" };
  const kanalSku = await prisma.channelSku.findFirst({
    where: { variantId, channelAccountId: hesap.id, isActive: true },
    select: { kanalAdet: true, listelemeDurumu: true },
  });
  if (!kanalSku) return { tamam: false, kod: "KANAL_SKU_YOK" };
  const barkod = (varyant.barcode ?? "").trim();
  if (barkod === "") return { tamam: false, kod: "VARYANT_BARKODU_YOK" };
  return { tamam: true, barkod, kanalSku };
}

export type TyGonderimSonucu =
  | {
      tamam: true;
      barkod: string;
      gonderilenStok: number | null;
      gonderilenFiyat: number | null;
      batchRequestId: string;
      /**
       * TY'nin KENDİ sonucu (kalem satırından — `tyBatchCoz`). 12 sn'ye kadar
       * beklenir; bitmediyse ISLEMDE. Eskiden üst seviyede aranıyordu ve hep
       * «ISLEMDE» dönüyordu (01.10.2026 bulgusu).
       */
      batchDurumu: TyBatchDurumu;
      /** TY'nin red sebepleri (BASARISIZ ise). */
      sebepler: string[];
    }
  | {
      tamam: false;
      kod:
        | "KANAL_SKU_YOK"
        | "HESAP_YOK"
        | "VARYANT_YOK"
        | "VARYANT_BARKODU_YOK"
        | "GONDERILECEK_YOK"
        | "FIYAT_GECERSIZ"
        | "ANAHTAR_YOK"
        | "TEKRAR_15DK"
        | "KANAL_REDDETTI"
        | "ULASILAMADI";
      ayrinti?: string;
    };

export async function tyStokFiyatYaz(
  variantId: string,
  niyet: { stokGonder: boolean; fiyat: number | null },
): Promise<TyGonderimSonucu> {
  const b = await tyBaglami(variantId);
  if (!b.tamam) return { tamam: false, kod: b.kod };
  if (!niyet.stokGonder && niyet.fiyat === null) {
    return { tamam: false, kod: "GONDERILECEK_YOK" };
  }
  if (niyet.fiyat !== null && !(Number.isFinite(niyet.fiyat) && niyet.fiyat > 0)) {
    return { tamam: false, kod: "FIYAT_GECERSIZ" };
  }
  const k = kimlikOku();
  if (!k) return { tamam: false, kod: "ANAHTAR_YOK" };

  /** Stok SUNUCUDA yeniden çözülür — istemciden sayı alınmaz. */
  const stok = niyet.stokGonder ? await varyantStogu(variantId) : null;
  const kalem = {
    barcode: b.barkod,
    ...(stok === null ? {} : { quantity: stok }),
    ...(niyet.fiyat === null
      ? {}
      : { salePrice: niyet.fiyat, listPrice: niyet.fiyat }),
  };

  const sonuc = await stokFiyatGonder(k, kalem);
  if (sonuc.tur === "YETKISIZ") {
    return { tamam: false, kod: "KANAL_REDDETTI", ayrinti: "HTTP " + sonuc.durum };
  }
  if (sonuc.tur === "ULASILAMADI") {
    return { tamam: false, kod: "ULASILAMADI", ayrinti: sonuc.sebep };
  }
  if (sonuc.tur === "ISTEK_HATALI") {
    const tekrarMi = /15 minutes|15 dakika|same request/i.test(sonuc.mesaj);
    /** ⚠ RED DE İZ BIRAKIR — "gönderdim sanıyordum" sorusuna cevap kalsın. */
    await izYaz({
      action: "KANAL_GONDERIMI",
      targetType: "ProductVariant",
      targetId: variantId,
      detail: JSON.stringify({
        kanal: "Trendyol",
        barkod: kalem.barcode,
        istek: kalem,
        sonuc: "RED",
        durum: sonuc.durum,
        mesaj: sonuc.mesaj,
      }),
    });
    return {
      tamam: false,
      kod: tekrarMi ? "TEKRAR_15DK" : "KANAL_REDDETTI",
      ayrinti: sonuc.mesaj.slice(0, 160),
    };
  }

  /**
   * Kabul edildi — TY'nin sonucu 12 sn'ye kadar (2 sn + 4 × 2,5 sn) okunur,
   * bitince durulur. ⚠ Sonuç TY'de bir süre sonra SİLİNİYOR (ölçüldü) — bu
   * yüzden gönderim ANINDA okunur ve ize yazılır.
   */
  let sonucOkuma: { durum: TyBatchDurumu; sebepler: string[] } = { durum: "SORGULANAMADI", sebepler: [] };
  for (let deneme = 0; deneme < 5; deneme++) {
    await new Promise((coz) => setTimeout(coz, deneme === 0 ? 2000 : 2500));
    const batch = await gonderimSonucu(k, sonuc.batchRequestId);
    sonucOkuma = batch.tur === "VERI" ? tyBatchCoz(batch.govde) : { durum: "SORGULANAMADI", sebepler: [] };
    if (sonucOkuma.durum === "BASARILI" || sonucOkuma.durum === "BASARISIZ") break;
  }
  const batchDurumu = sonucOkuma.durum;

  await izYaz({
    action: "KANAL_GONDERIMI",
    targetType: "ProductVariant",
    targetId: variantId,
    detail: JSON.stringify({
      kanal: "Trendyol",
      barkod: kalem.barcode,
      istek: kalem,
      sonuc: "KABUL",
      batchRequestId: sonuc.batchRequestId,
      batchDurumu,
      sebepler: sonucOkuma.sebepler,
    }),
  });
  revalidatePath("/kart/" + variantId);
  return {
    tamam: true,
    barkod: kalem.barcode,
    gonderilenStok: stok,
    gonderilenFiyat: niyet.fiyat,
    batchRequestId: sonuc.batchRequestId,
    batchDurumu,
    sebepler: sonucOkuma.sebepler,
  };
}

export type HbBaglam =
  | { tamam: false; kod: "HESAP_YOK" | "VARYANT_YOK" | "KANAL_SKU_YOK" }
  | { tamam: true; kanalSku: { channelSku: string; kanalAdet: number | null; listelemeDurumu: string } };

export async function hbBaglami(variantId: string): Promise<HbBaglam> {
  const hesap = await prisma.channelAccount.findFirst({
    where: { channel: { name: "Hepsiburada" }, satisIcin: true, isActive: true },
    select: { id: true },
  });
  if (!hesap) return { tamam: false, kod: "HESAP_YOK" };
  const varyant = await prisma.productVariant.findUnique({ where: { id: variantId }, select: { id: true } });
  if (!varyant) return { tamam: false, kod: "VARYANT_YOK" };
  const kanalSku = await prisma.channelSku.findFirst({
    where: { variantId, channelAccountId: hesap.id, isActive: true },
    select: { channelSku: true, kanalAdet: true, listelemeDurumu: true },
  });
  if (!kanalSku) return { tamam: false, kod: "KANAL_SKU_YOK" };
  return { tamam: true, kanalSku };
}

/** Bir parçanın (stok ya da fiyat) sonucu. */
export type HbParcaSonucu = {
  gonderilen: number;
  hukum: ParcaHukmu;
  /** HB'nin satır hataları (kodlar — ekranda sözlükle çevrilir). */
  hatalar: string[];
  kilitler: { tip: string; min: number | null; max: number | null }[];
  /** İlanda geri okunan rakam (stok ya da fiyat) — doğrulama. `null` = okunamadı. */
  kanaldaki?: number | null;
  /** Kabul edilmediyse sebep (HTTP durumu / kanalın metni). */
  ayrinti?: string;
};

export type HbGonderimSonucu =
  | { tamam: true; hbSku: string; ortam: string; stok: HbParcaSonucu | null; fiyat: HbParcaSonucu | null }
  | {
      tamam: false;
      kod:
        | "KANAL_SKU_YOK"
        | "HESAP_YOK"
        | "VARYANT_YOK"
        | "GONDERILECEK_YOK"
        | "FIYAT_GECERSIZ"
        | "KURAL_IHLALI"
        | "ANAHTAR_YOK"
        | "CANLI_KAPALI";
      ayrinti?: string;
    };

export async function hbStokFiyatYaz(
  variantId: string,
  /** ⚠ İSTEMCİDEN YALNIZ NİYET GELİR — stok sunucuda yeniden çözülür. */
  niyet: { stokGonder: boolean; fiyat: number | null },
): Promise<HbGonderimSonucu> {
  const b = await hbBaglami(variantId);
  if (!b.tamam) return { tamam: false, kod: b.kod };
  if (niyet.fiyat !== null && !(Number.isFinite(niyet.fiyat) && niyet.fiyat > 0)) {
    return { tamam: false, kod: "FIYAT_GECERSIZ" };
  }
  if (!niyet.stokGonder && niyet.fiyat === null) return { tamam: false, kod: "GONDERILECEK_YOK" };

  const k = hbKimlikOku();
  if (!k) return { tamam: false, kod: "ANAHTAR_YOK" };

  /** Stok SUNUCUDA yeniden çözülür — istemciden sayı alınmaz. */
  const stok = niyet.stokGonder ? await varyantStogu(variantId) : null;
  const hbSku = b.kanalSku.channelSku;
  const kalem = {
    hepsiburadaSku: hbSku,
    ...(stok === null ? {} : { availableStock: stok }),
    ...(niyet.fiyat === null ? {} : { price: niyet.fiyat }),
  };

  const sonuc = await hbStokFiyatIste(k, kalem);
  /** Kural ihlali ve canlı kilidi AĞA ÇIKMADAN döner — kanala bir şey gitmediği için iz YAZILMAZ. */
  if (sonuc.tur === "KURAL_IHLALI") return { tamam: false, kod: "KURAL_IHLALI", ayrinti: sonuc.mesaj };
  if (sonuc.tur === "CANLI_KAPALI") return { tamam: false, kod: "CANLI_KAPALI" };

  /**
   * ⛔ DOĞRULAMA İLAN GERİ OKUNARAK — HB'nin «Ready»/«Done» durumu başarıyı
   * kanıtlamaz (ölçüldü 01.10.2026: olmayan SKU'ya stok «Ready»; fiyat «Done»
   * dendiği anda ilan eski fiyattaydı). HB yüklemeyi ~5–6 sn sonra ilana
   * yansıtıyor; ilan 12 sn'ye kadar (2 sn + 4 × 2,5 sn) yeniden okunur ve
   * gönderilen rakamlar görülünce durulur. Görülmezse ekran «henüz
   * görünmüyor» der — «tamam» demez.
   */
  const parcalar: { tur: "STOK" | "FIYAT"; gonderilen: number; y: HbYuklemeSonucu }[] = [];
  if (stok !== null && sonuc.stok) parcalar.push({ tur: "STOK", gonderilen: stok, y: sonuc.stok });
  if (niyet.fiyat !== null && sonuc.fiyat) parcalar.push({ tur: "FIYAT", gonderilen: niyet.fiyat, y: sonuc.fiyat });
  const kabulEdilenler = parcalar.filter((p) => p.y.tur === "KABUL");

  let ilan: HbKanaldakiIlan | null = null;
  const kanaldaki = (tur: "STOK" | "FIYAT") => (tur === "STOK" ? ilan?.stok : ilan?.fiyat) ?? null;
  const hepsiGorundu = () =>
    kabulEdilenler.every((p) => parcaHukmu(null, p.gonderilen, kanaldaki(p.tur)) === "DOGRULANDI");
  for (let deneme = 0; kabulEdilenler.length > 0 && deneme < 5; deneme++) {
    await new Promise((coz) => setTimeout(coz, deneme === 0 ? 2000 : 2500));
    ilan = await hbKanaldakiIlan(k, hbSku);
    if (hepsiGorundu()) break;
  }

  const sonuclar: Partial<Record<"STOK" | "FIYAT", HbParcaSonucu>> = {};
  for (const p of parcalar) {
    const y = p.y;
    if (y.tur !== "KABUL") {
      const ayrinti = y.tur === "ULASILAMADI" ? y.sebep : y.tur === "YETKISIZ" ? "HTTP " + y.durum : "HTTP " + y.durum + " · " + y.mesaj;
      /** ⚠ RED DE İZ BIRAKIR — kanala gitti ve reddedildi; bu bir olaydır. */
      await izYaz({
        action: "KANAL_GONDERIMI",
        targetType: "ProductVariant",
        targetId: variantId,
        detail: JSON.stringify({ kanal: "Hepsiburada", ortam: k.ortam, hbSku, tur: p.tur, gonderilen: p.gonderilen, sonuc: "RED", durum: y.tur, mesaj: ayrinti }),
      });
      sonuclar[p.tur] = { gonderilen: p.gonderilen, hukum: "RED", hatalar: [], kilitler: [], ayrinti: ayrinti.slice(0, 160) };
      continue;
    }
    const durum = await hbYuklemeDurumu(k, p.tur, y.id);
    const hukum = parcaHukmu(durum, p.gonderilen, kanaldaki(p.tur));
    await izYaz({
      action: "KANAL_GONDERIMI",
      targetType: "ProductVariant",
      targetId: variantId,
      detail: JSON.stringify({
        kanal: "Hepsiburada",
        ortam: k.ortam,
        hbSku,
        tur: p.tur,
        gonderilen: p.gonderilen,
        sonuc: "KABUL",
        yuklemeId: y.id,
        hbDurumu: durum?.durum ?? "SORGULANAMADI",
        hatalar: durum?.hatalar ?? [],
        kilitler: durum?.kilitler ?? [],
        kanaldaki: kanaldaki(p.tur),
        hukum,
      }),
    });
    sonuclar[p.tur] = {
      gonderilen: p.gonderilen,
      hukum,
      hatalar: durum?.hatalar ?? [],
      kilitler: durum?.kilitler ?? [],
      kanaldaki: kanaldaki(p.tur),
    };
  }

  revalidatePath("/kart/" + variantId);
  return { tamam: true, hbSku, ortam: k.ortam.toUpperCase(), stok: sonuclar.STOK ?? null, fiyat: sonuclar.FIYAT ?? null };
}
