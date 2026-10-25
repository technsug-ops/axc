import { prisma } from "@/lib/prisma";
import { varyantStoklari } from "@/lib/stok";

import * as hb from "../../scripts/hb/istemci";
import { tyBuyboxSorgula, TY_BUYBOX_PARTI } from "../../scripts/ty/buybox";
import * as ty from "../../scripts/ty/istemci";

import { hbSatiri, partilere, sorgulanamadi, tySatiri, type BuyboxKanali, type BuyboxSatiri, type BuyboxUrunu, type HbRakip, type PiyasaFiyati } from "./buybox";

/**
 * ============================================================================
 *  BUYBOX — OKUMA (SUNUCU, K363 Faz 3-a). Hesap `buybox.ts`te (saf).
 * ----------------------------------------------------------------------------
 *  Kanal SATIŞ hesabının aktif kodları (TY: varyant BARKODU — K201-3, kanal
 *  kodu iç SKU'ya düşebilir; HB: `channelSku` = hepsiburadaSku). Sorgu her
 *  açılışta canlı; HİÇBİR ŞEY yazılmaz (defter de kanal da).
 *  Hacim (ölçüldü 25.10.2026): stoklu TY 209 · HB 205 → kanal başına ~21 parti
 *  (tek istekte en çok 10 kod) + TY'de kendi fiyatımız için onaylı ürün
 *  listesi (17 sayfa). Partiler `ESZAMANLI` ile paralel.
 *  Bir parti düşerse o partinin ürünleri «sorgulanamadı» olur ve sebep yazılır
 *  — boş sonuç «temiz» sayılmaz.
 * ============================================================================
 */

const ESZAMANLI = 4;
const KANAL_ADI: Record<BuyboxKanali, string> = { TY: "Trendyol", HB: "Hepsiburada" };

async function paralel<T, R>(isler: readonly T[], fn: (is: T) => Promise<R>): Promise<R[]> {
  const sonuc: R[] = new Array(isler.length);
  let sira = 0;
  const isci = async () => {
    while (sira < isler.length) {
      const i = sira++;
      sonuc[i] = await fn(isler[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(ESZAMANLI, isler.length) }, isci));
  return sonuc;
}

export type KanalUrunleri = { urunler: BuyboxUrunu[]; magazaAdi: string | null; hesapVar: boolean };

/**
 * Kanalın satış hesabındaki aktif kodlar. `variantIds` verilirse yalnız onlar
 * (alım rehberi); `yalnizStoklu` → rafta olanlar (Buybox ekranı).
 */
export async function buyboxUrunleri(kanal: BuyboxKanali, p: { variantIds?: readonly string[]; yalnizStoklu: boolean }): Promise<KanalUrunleri> {
  const hesap = await prisma.channelAccount.findFirst({
    where: { channel: { name: KANAL_ADI[kanal] }, satisIcin: true, isActive: true },
    select: { id: true, magazaAdi: true },
  });
  if (!hesap) return { urunler: [], magazaAdi: null, hesapVar: false };
  const kodlar = await prisma.channelSku.findMany({
    where: { channelAccountId: hesap.id, isActive: true, ...(p.variantIds ? { variantId: { in: [...p.variantIds] } } : {}) },
    select: {
      variantId: true,
      channelSku: true,
      variant: { select: { sku: true, barcode: true, companySku: true, gorselUrl: true, gorselKaynak: true, product: { select: { id: true, name: true } } } },
    },
  });
  const stok = await varyantStoklari(kodlar.map((k) => k.variantId));
  const urunler: BuyboxUrunu[] = [];
  for (const k of kodlar) {
    const adet = stok.get(k.variantId) ?? 0;
    if (p.yalnizStoklu && adet <= 0) continue;
    const kanalKodu = kanal === "TY" ? k.variant.barcode : k.channelSku;
    if (!kanalKodu) continue;
    urunler.push({
      variantId: k.variantId,
      urunId: k.variant.product?.id ?? null,
      urunAdi: k.variant.product?.name ?? k.variant.sku,
      sku: k.variant.sku,
      barkod: k.variant.barcode,
      firmaSku: k.variant.companySku,
      kanalKodu,
      stok: adet,
      gorselUrl: k.variant.gorselUrl,
      gorselKaynak: k.variant.gorselKaynak,
    });
  }
  return { urunler, magazaAdi: hesap.magazaAdi, hesapVar: true };
}

export type BuyboxSonucu = { satirlar: BuyboxSatiri[]; sebepler: string[]; kimlikVar: boolean };

/** TY: kendi müşteri fiyatımız — onaylı ürün listesinin bütün sayfaları (paralel). Barkod → priceSeenByCustomer. */
async function tyFiyatlarimiz(k: NonNullable<ReturnType<typeof ty.kimlikOku>>, sebepler: Set<string>): Promise<Map<string, number>> {
  const b = ty.baslikKur(k);
  const fiyat = new Map<string, number>();
  const oku = (govde: unknown) => {
    for (const u of ((govde as { content?: Record<string, unknown>[] }).content ?? [])) {
      for (const v of ((u.variants as Record<string, unknown>[] | undefined) ?? [])) {
        const p = v.price as { priceSeenByCustomer?: unknown; salePrice?: unknown } | undefined;
        const deger = typeof p?.priceSeenByCustomer === "number" ? p.priceSeenByCustomer : typeof p?.salePrice === "number" ? p.salePrice : null;
        if (typeof v.barcode === "string" && deger !== null) fiyat.set(v.barcode, deger);
      }
    }
  };
  const ilk = await ty.apiGet(ty.UCLAR.onayliUrunler(k.saticiId, 0, 100), b);
  if (ilk.tur !== "VERI") {
    sebepler.add(`TY fiyat listesi: ${ilk.tur}`);
    return fiyat;
  }
  oku(ilk.govde);
  const sayfa = Number((ilk.govde as { totalPages?: unknown }).totalPages ?? 1);
  const kalan = Array.from({ length: Math.max(0, Math.min(sayfa, 60) - 1) }, (_, i) => i + 1);
  const sonuclar = await paralel(kalan, (s) => ty.apiGet(ty.UCLAR.onayliUrunler(k.saticiId, s, 100), b));
  for (const s of sonuclar) {
    if (s.tur === "VERI") oku(s.govde);
    else sebepler.add(`TY fiyat listesi: ${s.tur}`);
  }
  return fiyat;
}

/**
 * `fiyatlarimiz: false` — TY'de kendi fiyatımızı okumak için onaylı listenin 17
 * sayfası taranmaz (alım rehberinin piyasa sütunu yalnız Buybox fiyatını ister).
 */
export async function buyboxDurumlari(kanal: BuyboxKanali, k: KanalUrunleri, secenek: { fiyatlarimiz?: boolean } = {}): Promise<BuyboxSonucu> {
  const sebepler = new Set<string>();
  if (k.urunler.length === 0) return { satirlar: [], sebepler: [], kimlikVar: true };

  if (kanal === "TY") {
    const kimlik = ty.kimlikOku();
    if (!kimlik) return { satirlar: k.urunler.map((u) => sorgulanamadi(u, "TY")), sebepler: ["KIMLIK_YOK"], kimlikVar: false };
    const [fiyatlar, partiler] = await Promise.all([
      secenek.fiyatlarimiz === false ? Promise.resolve(new Map<string, number>()) : tyFiyatlarimiz(kimlik, sebepler),
      paralel(partilere(k.urunler, TY_BUYBOX_PARTI), async (parti) => ({ parti, sonuc: await tyBuyboxSorgula(kimlik, parti.map((u) => u.kanalKodu)) })),
    ]);
    const satirlar: BuyboxSatiri[] = [];
    for (const { parti, sonuc } of partiler) {
      if (sonuc.tur !== "VERI") {
        sebepler.add(`TY Buybox: ${sonuc.tur}${sonuc.tur === "ULASILAMADI" ? ` (${sonuc.sebep})` : sonuc.tur === "ISTEK_HATALI" ? ` (${sonuc.mesaj.slice(0, 160)})` : ""}`);
        satirlar.push(...parti.map((u) => sorgulanamadi(u, "TY")));
        continue;
      }
      const harita = new Map(sonuc.kayitlar.map((x) => [x.barkod, x]));
      for (const u of parti) satirlar.push(tySatiri(u, harita.get(u.kanalKodu) ?? null, fiyatlar.get(u.kanalKodu) ?? null));
    }
    return { satirlar, sebepler: [...sebepler], kimlikVar: true };
  }

  const kimlik = hb.kimlikOku();
  if (!kimlik) return { satirlar: k.urunler.map((u) => sorgulanamadi(u, "HB")), sebepler: ["KIMLIK_YOK"], kimlikVar: false };
  if (!k.magazaAdi) sebepler.add("HB_MAGAZA_ADI_YOK");
  const b = hb.baslikKur(kimlik);
  const partiler = await paralel(partilere(k.urunler, hb.HB_BUYBOX_PARTI), async (parti) => ({
    parti,
    sonuc: await hb.apiGet(hb.UCLAR.buyboxSiralama(kimlik, parti.map((u) => u.kanalKodu)), b),
  }));
  const satirlar: BuyboxSatiri[] = [];
  for (const { parti, sonuc } of partiler) {
    const dizi = sonuc.tur === "VERI" ? (sonuc.govde as { variants?: unknown }).variants : undefined;
    if (!Array.isArray(dizi)) {
      sebepler.add(`HB Buybox: ${sonuc.tur === "VERI" ? "ZARF_TANINMADI" : sonuc.tur}${sonuc.tur === "ULASILAMADI" ? ` (${sonuc.sebep})` : sonuc.tur === "ISTEK_HATALI" ? ` (${sonuc.mesaj.slice(0, 160)})` : ""}`);
      satirlar.push(...parti.map((u) => sorgulanamadi(u, "HB")));
      continue;
    }
    const harita = new Map<string, HbRakip[]>();
    for (const v of dizi as Record<string, unknown>[]) {
      const liste = Array.isArray(v.buyboxOrders) ? (v.buyboxOrders as Record<string, unknown>[]) : [];
      harita.set(
        String(v.sku ?? "").toUpperCase(),
        liste
          .filter((r) => typeof r.rank === "number" && typeof r.price === "number")
          .map((r) => ({ sira: r.rank as number, satici: String(r.merchantName ?? ""), fiyat: r.price as number, listeFiyati: typeof r.originalPrice === "number" ? r.originalPrice : null })),
      );
    }
    for (const u of parti) satirlar.push(hbSatiri(u, harita.get(u.kanalKodu.toUpperCase()) ?? null, k.magazaAdi ?? ""));
  }
  return { satirlar, sebepler: [...sebepler], kimlikVar: true };
}

/**
 * ALIM REHBERİ — PİYASA FİYATI (K363 Faz 3-a, «her ikisi de»). Verilen
 * varyantlar için iki kanalın Buybox fiyatı; stok şartı YOK (tükenen ürünün de
 * piyasası sorulur). İstek üzerine çağrılır (rehberde `?piyasa=1`).
 */
export async function piyasaFiyatlari(variantIds: readonly string[]): Promise<{ harita: Map<string, PiyasaFiyati>; sebepler: string[] }> {
  const harita = new Map<string, PiyasaFiyati>(variantIds.map((id) => [id, { TY: null, HB: null }]));
  const sebepler: string[] = [];
  await Promise.all(
    (["TY", "HB"] as const).map(async (kanal) => {
      const urunler = await buyboxUrunleri(kanal, { variantIds, yalnizStoklu: false });
      const sonuc = await buyboxDurumlari(kanal, urunler, { fiyatlarimiz: false });
      sebepler.push(...sonuc.sebepler);
      for (const s of sonuc.satirlar) {
        const p = harita.get(s.variantId);
        if (p) p[kanal] = s.durum === "SORGULANAMADI" ? null : s.buyboxFiyati;
      }
    }),
  );
  return { harita, sebepler };
}
