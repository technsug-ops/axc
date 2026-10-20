import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { KALEM_GECERLI } from "@/lib/kalem-gecerli";
import { IADE_GECERLI } from "@/lib/iade-geri-alma";
import { panelHesapla } from "@/lib/panel";
import { panelIadesiKur, panelSatisiKur } from "@/app/panel-satir";
import type { Pencere } from "@/lib/donem";
import { HEDEF_DONEMLERI, hedefDurumlari, hedefPenceresi, type DonemRakamlari, type HedefDonemi, type HedefDurumu, type HedefSatiri } from "./hedef-karar";

/**
 * ============================================================================
 *  SATIŞ HEDEFLERİ — VERİ (K349, 20.10.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ RAKAM PANELİN KENDİ MOTORUNDAN: sorgular panelin sorgularıyla AYNI süzgeçleri
 *  taşır (iptal edilen satış yok · kaldırılmış kalem yok · geri alınmış iade yok ·
 *  iade SATIŞIN gününe) ve satırlar AYNI dönüştürmeden (`panel-satir.ts`) geçip
 *  AYNI motora (`panelHesapla`) girer. İkinci bir ciro/NET-2 hesabı YOK — hedef
 *  ekranı panelle çelişirse ikisinden birine güven kalmaz («iki yerde iki ölçüt olmaz»).
 *    ciro    = TRY bloğu: toplamGelir − toplamIadeTutari (paneldeki net ciro)
 *    NET2    = TRY bloğu: toplamNet2 (kanal başına kırpılmış)
 *    SIPARIS = TRY bloğu: toplamAdet
 *  ⚠ TRY: panel para birimlerini çevirmez; hedefler TRY satışlarına göre ölçülür.
 * ============================================================================
 */

type Istemci = Prisma.TransactionClient;

export async function hedefRakamlari(an: Date, istemci: Istemci = prisma): Promise<{ pencereler: Record<HedefDonemi, Pencere>; rakamlar: Record<HedefDonemi, DonemRakamlari> }> {
  const pencereler = Object.fromEntries(HEDEF_DONEMLERI.map((d) => [d, hedefPenceresi(d, an)])) as Record<HedefDonemi, Pencere>;
  // En geniş aralık: yılbaşı ya da (yılın ilk günlerinde) önceki yıla taşan haftanın pazartesisi.
  const bas = new Date(Math.min(...HEDEF_DONEMLERI.map((d) => pencereler[d].baslangic.getTime())));
  const son = new Date(Math.max(...HEDEF_DONEMLERI.map((d) => pencereler[d].bitisHaric.getTime())));
  const kanalHesabi = { select: { id: true, name: true, channel: { select: { code: true, name: true } } } } as const;
  const [satislar, iadeler] = await Promise.all([
    istemci.sale.findMany({
      where: { soldAt: { gte: bas, lt: son }, iptalTarihi: null },
      select: {
        soldAt: true, net1Amount: true, net2Amount: true, profitCurrency: true, profitStatus: true,
        channelAccount: kanalHesabi,
        items: { where: { ...KALEM_GECERLI }, select: { quantity: true, unitPriceAmount: true, unitPriceCurrency: true, vatRate: true } },
      },
    }),
    istemci.return.findMany({
      where: { sale: { soldAt: { gte: bas, lt: son } }, ...IADE_GECERLI },
      select: {
        net1Amount: true, net2Amount: true, profitCurrency: true, profitStatus: true,
        fees: { select: { code: true, amount: true } },
        sale: { select: { soldAt: true, channelAccount: kanalHesabi } },
      },
    }),
  ]);
  const panelSatislari = satislar.map(panelSatisiKur);
  const panelIadeleri = iadeler.map(panelIadesiKur);
  const rakamlar = {} as Record<HedefDonemi, DonemRakamlari>;
  for (const donem of HEDEF_DONEMLERI) {
    const blok = panelHesapla(pencereler[donem], panelSatislari, panelIadeleri).find((b) => b.paraBirimi === "TRY");
    rakamlar[donem] = blok
      ? { CIRO: blok.toplamGelir - blok.toplamIadeTutari, NET2: blok.toplamNet2, SIPARIS: blok.toplamAdet }
      : { CIRO: 0, NET2: 0, SIPARIS: 0 };
  }
  return { pencereler, rakamlar };
}

/** Tanımlı hedef sürümleri (hepsi; seçim saf gövdede). */
export async function hedefSatirlari(istemci: Istemci = prisma): Promise<HedefSatiri[]> {
  const satirlar = await istemci.hedef.findMany({ select: { id: true, olcut: true, donem: true, tutar: true, gecerlilik: true, createdAt: true } });
  return satirlar.map((s) => ({ ...s, tutar: s.tutar === null ? null : Number(s.tutar) }));
}

/** Panel kartı ve tebrik için: hedefi konmuş her ölçüt × dönemin ilerlemesi. */
export async function hedefDurumuGetir(an = new Date(), istemci: Istemci = prisma): Promise<HedefDurumu[]> {
  const satirlar = await hedefSatirlari(istemci);
  if (!satirlar.some((s) => s.tutar !== null)) return [];
  const { pencereler, rakamlar } = await hedefRakamlari(an, istemci);
  return hedefDurumlari(satirlar, rakamlar, pencereler);
}
