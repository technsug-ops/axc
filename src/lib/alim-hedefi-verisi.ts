import { izYaz } from "@/lib/iz";
import { prisma } from "@/lib/prisma";
import { varyantStoklari } from "@/lib/stok";
import type { GorselKaynagi } from "@/lib/urun-gorseli";

import { BUYBOX_KANALLARI, type BuyboxKanali } from "./buybox";
import { buyboxDurumlari, buyboxUrunleri } from "./buybox-verisi";
import { altindakiler, enUcuz, firsatFiyati, hedefCoz, hedefinAltinda, type HedefSatiri } from "./alim-hedefi";
import { hedefGirdiMetni, onerilenHedef, oneriDurumu, TOPLU_TAVAN } from "./alim-hedefi-oneri";
import { alisKayitlari } from "./alim-fiyat-hafizasi-verisi";
import { fiyatHafizasi, type FiyatHafizasi } from "./alim-fiyat-hafizasi";
import { ilanAdresi } from "./kanal-ilan-adresi";

/**
 * ============================================================================
 *  ALIM FIRSATI TAKİBİ — OKUMA/YAZMA (SUNUCU, K363 Faz 3-d). Hesap
 *  `alim-hedefi.ts`te (saf).
 * ----------------------------------------------------------------------------
 *  · Saatlik ölçüm (`/api/cron/buybox-olcum`, Buybox ölçümünden SONRA):
 *    aktif hedeflerin TY + HB fiyatı resmî uçlardan okunur — STOK ŞARTI YOK
 *    (alım fırsatı en çok tükenen üründe aranır; Buybox ölçümü yalnız rafta
 *    olanlara bakıyor). ⛔ Kanala HİÇBİR ŞEY yazılmaz.
 *  · Bir kanalın sorgusu BÜTÜNÜYLE düştüyse o kanalın son fiyatları EZİLMEZ
 *    («0 fiyat» bir ölçüm değil, sorgunun düşmesidir) ve sebep cevapta döner.
 *    Tek ürün sorgulanamadıysa o ürünün fiyatı boşalır (bilinmiyor — eski
 *    fiyat bugünkü gibi gösterilmez).
 *  · İDEMPOTENT: aynı saatte iki kez koşmak yalnız fiyatı tazeler.
 *  · Hedef yazma/silme İZ bırakır (`ALIM_HEDEFI_*`, eski ve yeni değer).
 * ============================================================================
 */

export type HedefListeSatiri = HedefSatiri & {
  urunId: string | null;
  sku: string;
  barkod: string | null;
  firmaSku: string | null;
  gorselUrl: string | null;
  gorselKaynak: GorselKaynagi | null;
  raf: number;
  sonKontrolAt: Date | null;
  sonAltindaAt: Date | null;
  sonAltindaFiyat: number | null;
  sonAltindaKanal: BuyboxKanali | null;
  /** Ürünün bu kanalda aktif ilanı var mı — yoksa o kanaldan fiyat OKUNAMAZ (ekran söyler). */
  ilan: Record<BuyboxKanali, boolean>;
};

const sayi = (d: { toString(): string } | null) => (d === null ? null : Number(d.toString()));
const kanalMi = (k: string | null): k is BuyboxKanali => k === "TY" || k === "HB";
const KANAL_ADI: Record<BuyboxKanali, string> = { TY: "Trendyol", HB: "Hepsiburada" };

/**
 * «Bu ürün takip edilebilir mi» — TY ya da HB'de SATIŞ hesabında aktif ilan.
 * Yazım kapısı, öneri listesi ve ürün bilgisi AYNI koşulu okur (iki yerde iki
 * ölçüt olsaydı listede «takip edilebilir» görünen ürün yazımda reddedilirdi).
 */
const TAKIP_ILANI = { isActive: true, channelAccount: { satisIcin: true, isActive: true, channel: { name: { in: Object.values(KANAL_ADI) } } } } as const;

/** Bütün hedefler (aktif + pasif), ekranın ihtiyacıyla. Sıralama ekranda (`hedefSirala`). */
export async function alimHedefleri(): Promise<HedefListeSatiri[]> {
  const kayitlar = await prisma.alimHedefi.findMany({
    select: {
      id: true,
      variantId: true,
      hedefAmount: true,
      aktif: true,
      sonKontrolAt: true,
      tyFiyatAmount: true,
      hbFiyatAmount: true,
      sonAltindaAt: true,
      sonAltindaAmount: true,
      sonAltindaKanal: true,
      variant: {
        select: {
          sku: true,
          barcode: true,
          companySku: true,
          gorselUrl: true,
          gorselKaynak: true,
          product: { select: { id: true, name: true } },
          channelSkus: { where: { isActive: true, channelAccount: { satisIcin: true, isActive: true } }, select: { channelAccount: { select: { channel: { select: { name: true } } } } } },
        },
      },
    },
  });
  const stok = await varyantStoklari(kayitlar.map((k) => k.variantId));
  return kayitlar.map((k) => {
    const kanallar = new Set(k.variant.channelSkus.map((c) => c.channelAccount.channel.name));
    return {
      id: k.id,
      variantId: k.variantId,
      aktif: k.aktif,
      hedef: Number(k.hedefAmount.toString()),
      ty: sayi(k.tyFiyatAmount),
      hb: sayi(k.hbFiyatAmount),
      urunAdi: k.variant.product?.name ?? k.variant.sku,
      urunId: k.variant.product?.id ?? null,
      sku: k.variant.sku,
      barkod: k.variant.barcode,
      firmaSku: k.variant.companySku,
      gorselUrl: k.variant.gorselUrl,
      gorselKaynak: k.variant.gorselKaynak,
      raf: stok.get(k.variantId) ?? 0,
      sonKontrolAt: k.sonKontrolAt,
      sonAltindaAt: k.sonAltindaAt,
      sonAltindaFiyat: sayi(k.sonAltindaAmount),
      sonAltindaKanal: kanalMi(k.sonAltindaKanal) ? k.sonAltindaKanal : null,
      ilan: { TY: kanallar.has(KANAL_ADI.TY), HB: kanallar.has(KANAL_ADI.HB) },
    };
  });
}

/** ÇAN — sekmedeki «hedefin altında» listesiyle AYNI gövde (`altindakiler`). */
export async function alimHedefiCanSayisi(): Promise<number> {
  return altindakiler(await alimHedefleri()).length;
}

export type HedefOlcumSonucu = { durum: "YAZILDI" | "ATLANDI"; hedef: number; altinda: number; kanallar: { kanal: BuyboxKanali; sorgulanan: number; dustu: boolean; sebepler: string[] }[] };

/** Saatlik ölçüm: aktif hedeflerin iki kanaldaki «başka satıcının en ucuz» fiyatı. */
export async function alimHedefleriniOlc(): Promise<HedefOlcumSonucu> {
  const hedefler = await prisma.alimHedefi.findMany({ where: { aktif: true }, select: { id: true, variantId: true, hedefAmount: true } });
  if (hedefler.length === 0) return { durum: "ATLANDI", hedef: 0, altinda: 0, kanallar: [] };
  const ids = hedefler.map((h) => h.variantId);
  const fiyat: Record<BuyboxKanali, Map<string, number | null>> = { TY: new Map(), HB: new Map() };
  const dusen = new Set<BuyboxKanali>();
  const kanallar: HedefOlcumSonucu["kanallar"] = [];
  for (const kanal of BUYBOX_KANALLARI) {
    const urunler = await buyboxUrunleri(kanal, { variantIds: ids, yalnizStoklu: false });
    const sonuc = await buyboxDurumlari(kanal, urunler, { fiyatlarimiz: false });
    const dustu = sonuc.satirlar.length > 0 && sonuc.satirlar.every((s) => s.durum === "SORGULANAMADI");
    if (dustu) dusen.add(kanal);
    for (const s of sonuc.satirlar) fiyat[kanal].set(s.variantId, firsatFiyati(s, urunler.magazaAdi ?? ""));
    kanallar.push({ kanal, sorgulanan: sonuc.satirlar.length, dustu, sebepler: sonuc.sebepler });
  }

  const simdi = new Date();
  const para = (n: number | null) => (n === null ? null : n.toFixed(4));
  let altinda = 0;
  await prisma.$transaction(
    async (tx) => {
      for (const h of hedefler) {
        /** İlanı olmayan kanal satır döndürmez → bilinmiyor (null). Düşen kanal ESKİ değeri korur. */
        const veri: Record<string, unknown> = { sonKontrolAt: simdi };
        if (!dusen.has("TY")) veri.tyFiyatAmount = para(fiyat.TY.get(h.variantId) ?? null);
        if (!dusen.has("HB")) veri.hbFiyatAmount = para(fiyat.HB.get(h.variantId) ?? null);
        const f = { hedef: Number(h.hedefAmount.toString()), ty: fiyat.TY.get(h.variantId) ?? null, hb: fiyat.HB.get(h.variantId) ?? null };
        if (hedefinAltinda(f)) {
          const e = enUcuz(f);
          if (e !== null) {
            altinda++;
            veri.sonAltindaAt = simdi;
            veri.sonAltindaAmount = para(e.fiyat);
            veri.sonAltindaKanal = e.kanal;
          }
        }
        await tx.alimHedefi.update({ where: { id: h.id }, data: veri });
      }
    },
    /** Tavan yazım boyutuna göre AÇIKÇA (anayasa: varsayılan 5 sn'ye bel bağlanmaz) — hedef başına tek güncelleme. */
    { timeout: 60_000 },
  );
  return { durum: "YAZILDI", hedef: hedefler.length, altinda, kanallar };
}

export type HedefYazHatasi = "FIYAT_GECERSIZ" | "URUN_YOK" | "ILAN_YOK" | "YOK";
export type HedefYazSonucu = { tamam: true } | { tamam: false; hata: HedefYazHatasi };

/**
 * Hedef yaz (yeni ya da güncelle). Ürünün TY ya da HB'de aktif ilanı yoksa
 * REDDEDİLİR: fiyat okunamayacak bir hedef, hiç haber vermeyen bir takip olurdu.
 */
export async function alimHedefiYaz(variantId: string, hamFiyat: string): Promise<HedefYazSonucu> {
  const hedef = hedefCoz(hamFiyat);
  if (hedef === null) return { tamam: false, hata: "FIYAT_GECERSIZ" };
  const varyant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    select: {
      id: true,
      channelSkus: { where: TAKIP_ILANI, select: { id: true } },
      alimHedefi: { select: { id: true, hedefAmount: true, aktif: true } },
    },
  });
  if (!varyant) return { tamam: false, hata: "URUN_YOK" };
  if (varyant.channelSkus.length === 0) return { tamam: false, hata: "ILAN_YOK" };
  const eski = varyant.alimHedefi;
  await prisma.$transaction(async (tx) => {
    const kayit = await tx.alimHedefi.upsert({
      where: { variantId },
      create: { variantId, hedefAmount: hedef.toFixed(4), currency: "TRY" },
      /** Hedef değişince «son altında» izi ESKİ hedefe aitti — sıfırlanır; son fiyatlar kalır (ölçümdür). */
      update: { hedefAmount: hedef.toFixed(4), aktif: true, sonAltindaAt: null, sonAltindaAmount: null, sonAltindaKanal: null },
      select: { id: true },
    });
    await izYaz(
      {
        action: eski ? "ALIM_HEDEFI_GUNCELLE" : "ALIM_HEDEFI_EKLE",
        targetType: "AlimHedefi",
        targetId: kayit.id,
        detail: JSON.stringify({ variantId, eski: eski ? { hedef: eski.hedefAmount.toString(), aktif: eski.aktif } : null, yeni: { hedef: hedef.toFixed(2) } }),
      },
      tx,
    );
  });
  return { tamam: true };
}

/** Takibi kapat/aç — fiyat okunmaya devam etmez, çana girmez; hedef ve son izler kalır. */
export async function alimHedefiAktif(id: string, aktif: boolean): Promise<HedefYazSonucu> {
  const eski = await prisma.alimHedefi.findUnique({ where: { id }, select: { aktif: true, variantId: true } });
  if (!eski) return { tamam: false, hata: "YOK" };
  await prisma.$transaction(async (tx) => {
    await tx.alimHedefi.update({ where: { id }, data: { aktif } });
    await izYaz({ action: "ALIM_HEDEFI_AKTIF", targetType: "AlimHedefi", targetId: id, detail: JSON.stringify({ variantId: eski.variantId, eski: eski.aktif, yeni: aktif }) }, tx);
  });
  return { tamam: true };
}

/** Hedefi sil — AYAR verisidir (defter değil); iz eski değeri saklar. */
export async function alimHedefiSil(id: string): Promise<HedefYazSonucu> {
  const eski = await prisma.alimHedefi.findUnique({ where: { id }, select: { variantId: true, hedefAmount: true } });
  if (!eski) return { tamam: false, hata: "YOK" };
  await prisma.$transaction(async (tx) => {
    await tx.alimHedefi.delete({ where: { id } });
    await izYaz({ action: "ALIM_HEDEFI_SIL", targetType: "AlimHedefi", targetId: id, detail: JSON.stringify({ variantId: eski.variantId, hedef: eski.hedefAmount.toString() }) }, tx);
  });
  return { tamam: true };
}

export type TakipKanali = { ilan: boolean; adres: string | null };

/**
 * Varyant başına TY/HB: aktif ilan var mı + ÜRÜN SAYFASI linki. ⚠ Link bizim
 * mağazamızı DEĞİL ürün sayfasını açar (satıcı kimliği / mağaza adı verilmez):
 * alım için bakılan şey en ucuz satıcıdır, pazaryeri onu öne çıkarır.
 */
export async function takipKanallari(variantIds: readonly string[]): Promise<Map<string, Record<BuyboxKanali, TakipKanali>>> {
  const kayitlar =
    variantIds.length === 0
      ? []
      : await prisma.channelSku.findMany({
          where: { variantId: { in: [...variantIds] }, ...TAKIP_ILANI },
          select: { variantId: true, channelSku: true, externalListingId: true, channelAccount: { select: { channel: { select: { code: true, name: true } } } } },
        });
  const harita = new Map<string, Record<BuyboxKanali, TakipKanali>>();
  for (const id of variantIds) harita.set(id, { TY: { ilan: false, adres: null }, HB: { ilan: false, adres: null } });
  for (const k of kayitlar) {
    const kanal = (Object.keys(KANAL_ADI) as BuyboxKanali[]).find((x) => KANAL_ADI[x] === k.channelAccount.channel.name);
    const yer = harita.get(k.variantId);
    if (!kanal || !yer) continue;
    yer[kanal].ilan = true;
    yer[kanal].adres ??= ilanAdresi(k.channelAccount.channel.code, { channelSku: k.channelSku, externalListingId: k.externalListingId, saticiId: null, magazaAdi: null });
  }
  return harita;
}

export type UrunTakipBilgisi = {
  hafiza: Pick<FiyatHafizasi, "enUcuz" | "normal" | "alisSayisi"> | null;
  /** Hedef kutusuna önerilen metin (en düşük alış); alış yoksa `null`. */
  hedefGirdi: string | null;
  ilan: Record<BuyboxKanali, boolean>;
  takipte: boolean;
};

/** Formda ürün seçilince: en düşük alış · normal · hangi kanaldan okunacağı · zaten takipte mi. */
export async function urunTakipBilgisi(variantId: string): Promise<UrunTakipBilgisi> {
  const [kayit, kanallar, hedef] = await Promise.all([
    alisKayitlari({ variantIds: [variantId] }),
    takipKanallari([variantId]),
    prisma.alimHedefi.findUnique({ where: { variantId }, select: { id: true } }),
  ]);
  const h = fiyatHafizasi(kayit.get(variantId) ?? [], "TRY");
  const oneri = onerilenHedef(h);
  const k = kanallar.get(variantId);
  return {
    hafiza: h ? { enUcuz: h.enUcuz, normal: h.normal, alisSayisi: h.alisSayisi } : null,
    hedefGirdi: oneri === null ? null : hedefGirdiMetni(oneri),
    ilan: { TY: k?.TY.ilan ?? false, HB: k?.HB.ilan ?? false },
    takipte: hedef !== null,
  };
}

export type TopluYazSonucu =
  | { tamam: true; alindi: number; takipte: number; ilanYok: number; alisYok: number; bulunamadi: number }
  | { tamam: false; hata: "BOS" | "COK_FAZLA" };

/**
 * TOPLU TAKİBE AL. Hedef İSTEMCİDEN ALINMAZ — sunucuda en düşük alıştan yeniden
 * hesaplanır (ekrandaki öneriyle aynı gövde: `onerilenHedef`). Takipte olanın
 * hedefi EZİLMEZ (atlanır), ilanı ya da alışı olmayan atlanır; hepsi SAYILIR ve
 * döner. Tek işlem: ya hepsi yazılır ya hiçbiri; tek iz, eklenen her ürünün
 * hedefiyle (geri alma yolu listeye bağlı değil — her takip tek tek silinebilir).
 */
export async function alimHedefleriTopluYaz(variantIds: readonly string[]): Promise<TopluYazSonucu> {
  const ids = [...new Set(variantIds)];
  if (ids.length === 0) return { tamam: false, hata: "BOS" };
  if (ids.length > TOPLU_TAVAN) return { tamam: false, hata: "COK_FAZLA" };
  const [varyantlar, kayit] = await Promise.all([
    prisma.productVariant.findMany({
      where: { id: { in: ids } },
      select: { id: true, alimHedefi: { select: { id: true } }, channelSkus: { where: TAKIP_ILANI, select: { channelAccount: { select: { channel: { select: { name: true } } } } } } },
    }),
    alisKayitlari({ variantIds: ids }),
  ]);
  /** Silinmiş/bulunamayan ürün de SAYILIR — seçilen her satır bir kovaya düşer. */
  const sonuc = { alindi: 0, takipte: 0, ilanYok: 0, alisYok: 0, bulunamadi: ids.length - varyantlar.length };
  const yazilacak: { variantId: string; hedef: number }[] = [];
  for (const v of varyantlar) {
    const adlar = new Set(v.channelSkus.map((c) => c.channelAccount.channel.name));
    const hedef = onerilenHedef(fiyatHafizasi(kayit.get(v.id) ?? [], "TRY"));
    const d = oneriDurumu({ takipte: v.alimHedefi !== null, ilan: { TY: adlar.has(KANAL_ADI.TY), HB: adlar.has(KANAL_ADI.HB) }, hedef });
    if (d === "TAKIPTE") sonuc.takipte++;
    else if (d === "ILAN_YOK") sonuc.ilanYok++;
    else if (d === "ALIS_YOK") sonuc.alisYok++;
    else yazilacak.push({ variantId: v.id, hedef: hedef as number });
  }
  if (yazilacak.length > 0) {
    await prisma.$transaction(
      async (tx) => {
        const r = await tx.alimHedefi.createMany({
          data: yazilacak.map((y) => ({ variantId: y.variantId, hedefAmount: y.hedef.toFixed(4), currency: "TRY" as const })),
          skipDuplicates: true,
        });
        sonuc.alindi = r.count;
        /** Yarışta başka biri aynı ürünü eklediyse createMany atlar — atlanan «takipte» sayılır (sessiz kayıp yok). */
        sonuc.takipte += yazilacak.length - r.count;
        await izYaz(
          {
            action: "ALIM_HEDEFI_TOPLU_EKLE",
            targetType: "AlimHedefi",
            detail: JSON.stringify({ kaynak: "en dusuk alis", eklenen: yazilacak.map((y) => ({ variantId: y.variantId, hedef: y.hedef.toFixed(2) })), atlanan: { takipte: sonuc.takipte, ilanYok: sonuc.ilanYok, alisYok: sonuc.alisYok, bulunamadi: sonuc.bulunamadi } }),
          },
          tx,
        );
      },
      { timeout: 60_000 },
    );
  }
  return { tamam: true, ...sonuc };
}
