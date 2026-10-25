import { prisma } from "@/lib/prisma";
import { acikPartiler } from "@/lib/stok";

import type { BuyboxKanali } from "./buybox";
import { enDusukAcikMaliyet, type FiyatZemini } from "./buybox-fiyat";
import { simulasyonZeminleri, varyantKdvOrani } from "./fiyatlama/kart-verisi";

/**
 * ============================================================================
 *  BUYBOX FİYAT KUTUSU — ZEMİN OKUMA (SUNUCU, K363 Faz 3-c). Hesap
 *  `buybox-fiyat.ts`te (saf).
 * ----------------------------------------------------------------------------
 *  Tek varyant, tek kanal: satır «Hesapla»ya basınca çağrılır (sayfa açılışında
 *  ~200 ürünün zemini kurulmaz — her biri birkaç sorgu; KAS bağlantı kotası).
 *  Komisyon/kesinti zemini ürün kartıyla AYNI gövdeden (`simulasyonZeminleri`).
 *  ⛔ HİÇBİR ŞEY YAZMAZ.
 * ============================================================================
 */

const KANAL_ADI: Record<BuyboxKanali, string> = { TY: "Trendyol", HB: "Hepsiburada" };

export type KargoBilgisi = {
  desi: number | null;
  firma: string | null;
  /** Firma nereden: ürünün bu kanaldaki son satışı · kanalda en sık kullanılan firma. */
  firmaKaynagi: "URUN" | "KANAL" | null;
  /** Bilinmiyorsa NEDEN — ekran yazar, NET kargo hariç hesaplanır. */
  sebep: "DESI_YOK" | "FIRMA_YOK" | "TARIFE_YOK" | null;
};

export type FiyatZeminiSonucu =
  | { tamam: true; zemin: FiyatZemini; kargo: KargoBilgisi; partiSayisi: number; rafAdedi: number }
  | { tamam: false; kod: "KANAL_KODU_YOK" };

export async function buyboxFiyatZemini(variantId: string, kanal: BuyboxKanali, an: Date): Promise<FiyatZeminiSonucu> {
  /** Buybox ekranının satış hesabı (`buyboxUrunleri` ile aynı süzgeç); zemin bu hesabın KİMLİĞİYLE seçilir — ad bir etikettir. */
  const [hesap, zeminler] = await Promise.all([
    prisma.channelAccount.findFirst({
      where: { channel: { name: KANAL_ADI[kanal] }, satisIcin: true, isActive: true },
      select: { id: true, channelId: true, defaultCurrency: true },
    }),
    simulasyonZeminleri(variantId, an),
  ]);
  const zemin = hesap === null ? null : (zeminler.find((z) => z.channelAccountId === hesap.id) ?? null);
  if (hesap === null || zemin === null) return { tamam: false, kod: "KANAL_KODU_YOK" };
  const paraBirimi = hesap.defaultCurrency === "EUR" ? "EUR" : "TRY";

  const [kdvOrani, partiler, varyant, sonSatis] = await Promise.all([
    varyantKdvOrani(variantId),
    acikPartiler(prisma, variantId),
    prisma.productVariant.findUnique({ where: { id: variantId }, select: { product: { select: { desi: true } } } }),
    /** Kargo firması: bu ürünün BU HESAPTAKİ son satışının firması. */
    prisma.sale.findFirst({
      where: { channelAccountId: zemin.channelAccountId, iptalTarihi: null, cargoCarrierId: { not: null }, items: { some: { variantId } } },
      orderBy: { soldAt: "desc" },
      select: { cargoCarrierId: true, cargoCarrier: { select: { name: true } } },
    }),
  ]);
  const m = enDusukAcikMaliyet(partiler, paraBirimi);

  /**
   * KARGO FİRMASI — ürünün bu hesaptaki son satışının firması; yoksa bu
   * hesapta EN SIK kullanılan firma (son 365 gün). ⚠ ÖLÇÜLDÜ 25.10.2026: son
   * 30 günde TY 250 satışın 4'ünde, HB 157'nin 0'ında firma kayıtlı (API
   * çekimi firma yazmıyor) — yalnız ürünün son satışına bakmak neredeyse her
   * üründe «kargo hariç» derdi. Eski kayıtlarda kanal başına tek firma baskın
   * (TY Aras 242 · HB hepsiJET 78). Hangisinin kullanıldığı ekranda yazar.
   */
  let firmaId = sonSatis?.cargoCarrierId ?? null;
  let firma = sonSatis?.cargoCarrier?.name ?? null;
  let firmaKaynagi: KargoBilgisi["firmaKaynagi"] = firmaId ? "URUN" : null;
  if (firmaId === null) {
    const sik = await prisma.sale.groupBy({
      by: ["cargoCarrierId"],
      where: { channelAccountId: hesap.id, iptalTarihi: null, cargoCarrierId: { not: null }, soldAt: { gte: new Date(an.getTime() - 365 * 86_400_000) } },
      _count: { _all: true },
      orderBy: { _count: { cargoCarrierId: "desc" } },
      take: 1,
    });
    firmaId = sik[0]?.cargoCarrierId ?? null;
    if (firmaId) {
      firma = (await prisma.cargoCarrier.findUnique({ where: { id: firmaId }, select: { name: true } }))?.name ?? null;
      firmaKaynagi = "KANAL";
    }
  }

  const desiHam = varyant?.product?.desi;
  const desi = desiHam === null || desiHam === undefined ? null : Number(desiHam.toString());
  let kargoTarifesi: number | null = null;
  const kargo: KargoBilgisi = { desi, firma, firmaKaynagi, sebep: null };
  if (desi === null || !(desi > 0)) kargo.sebep = "DESI_YOK";
  else if (firmaId === null) kargo.sebep = "FIRMA_YOK";
  else {
    /** Kâr motoruyla aynı arama: en yeni geçerli tarife (`kar-yeniden.ts`), bugün. */
    const tarife = await prisma.cargoTariff.findFirst({
      where: { channelId: hesap.channelId, carrierId: firmaId, desi: Math.max(0, Math.ceil(desi)), effectiveFrom: { lte: an } },
      orderBy: { effectiveFrom: "desc" },
      select: { amount: true },
    });
    if (tarife) kargoTarifesi = Number(tarife.amount.toString());
    else kargo.sebep = "TARIFE_YOK";
  }

  return {
    tamam: true,
    zemin: { zemin, kdvOrani, paraBirimi, maliyet: m.maliyet, kargoTarifesi },
    kargo,
    partiSayisi: m.partiSayisi,
    rafAdedi: m.rafAdedi,
  };
}
