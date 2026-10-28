import { prisma } from "@/lib/prisma";

import { BUYBOX_KANALLARI, buyboxOzeti, type BuyboxKanali } from "./buybox";
import { olcumAlinsinMi, degisimler, rakipliOzet, savasSayilari, type KayitDurumu, type OlcumNoktasi } from "./buybox-istatistik";
import { buyboxDurumlari, buyboxUrunleri } from "./buybox-verisi";

/**
 * ============================================================================
 *  BUYBOX İSTATİSTİĞİ — OKUMA/YAZMA (SUNUCU, K363 Faz 3-b). Hesap
 *  `buybox-istatistik.ts`te (saf).
 * ----------------------------------------------------------------------------
 *  Saatlik zamanlayıcı (`/api/cron/buybox-olcum`) `buyboxOlcumuYaz`ı çağırır:
 *  Buybox ekranının AYNI sorgusu (rafta olan + ilanı olan ürünler) koşar,
 *  toplam sayılar `BuyboxOlcumu`na, durumu değişen ürünler `BuyboxDegisimi`ne
 *  yazılır. ⛔ Kanala HİÇBİR ŞEY yazılmaz (yalnız okuma uçları).
 *  ⚠ BÜTÜN ÜRÜNLER SORGULANAMADIYSA ölçüm YAZILMAZ: «0 Buybox» bir ölçüm
 *  değil, sorgunun düşmesidir; grafikte sahte bir çukur açardı. O saat
 *  «ölçülmedi» kalır ve sebep cevapta döner.
 *  ⚠ İDEMPOTENT: aynı saat diliminde ölçüm varsa atlanır (çift tetik
 *  zararsız). Yazım tek işlemde — yarım ölçüm (sayı var, değişim yok) olmaz.
 * ============================================================================
 */

const KANAL_ADI: Record<BuyboxKanali, string> = { TY: "Trendyol", HB: "Hepsiburada" };

export type KanalOlcumSonucu =
  | { kanal: BuyboxKanali; durum: "YAZILDI"; incelenen: number; birinci: number; degisim: number; sorgulanamadi: number; sebepler: string[] }
  | { kanal: BuyboxKanali; durum: "ATLANDI"; sebep: "CIFT_TETIK" | "HESAP_YOK" | "URUN_YOK" | "HEPSI_SORGULANAMADI"; sebepler?: string[] };

export async function buyboxOlcumuYaz(kanal: BuyboxKanali, simdi: Date): Promise<KanalOlcumSonucu> {
  const hesap = await prisma.channelAccount.findFirst({
    where: { channel: { name: KANAL_ADI[kanal] }, satisIcin: true, isActive: true },
    select: { id: true, defaultCurrency: true },
  });
  if (!hesap) return { kanal, durum: "ATLANDI", sebep: "HESAP_YOK" };

  const son = await prisma.buyboxOlcumu.findFirst({ where: { channelAccountId: hesap.id }, orderBy: { olculduAt: "desc" }, select: { olculduAt: true } });
  if (!olcumAlinsinMi(son?.olculduAt ?? null, simdi)) return { kanal, durum: "ATLANDI", sebep: "CIFT_TETIK" };

  const urunler = await buyboxUrunleri(kanal, { yalnizStoklu: true });
  if (urunler.urunler.length === 0) return { kanal, durum: "ATLANDI", sebep: "URUN_YOK" };
  const olculduAt = new Date();
  const sonuc = await buyboxDurumlari(kanal, urunler);
  const ozet = buyboxOzeti(sonuc.satirlar);
  if (ozet.sorgulanamadi === ozet.incelenen) return { kanal, durum: "ATLANDI", sebep: "HEPSI_SORGULANAMADI", sebepler: sonuc.sebepler };

  /** Her ürünün SON bilinen durumu — o hesap+varyant için en yeni değişim satırı. */
  const ids = sonuc.satirlar.map((s) => s.variantId);
  const gecmis = await prisma.buyboxDegisimi.findMany({
    where: { channelAccountId: hesap.id, variantId: { in: ids } },
    orderBy: { olculduAt: "asc" },
    select: { variantId: true, yeniDurum: true },
  });
  const oncekiler = new Map<string, KayitDurumu>();
  for (const g of gecmis) oncekiler.set(g.variantId, g.yeniDurum);
  const yazilacak = degisimler(sonuc.satirlar, oncekiler);

  /** Decimal alanına metin verilir — kayan nokta kuyruğu kayda girmez. */
  const para = (n: number | null) => (n === null ? null : n.toFixed(4));
  await prisma.$transaction(
    async (tx) => {
      const olcum = await tx.buyboxOlcumu.create({
        data: {
          channelAccountId: hesap.id,
          olculduAt,
          incelenen: ozet.incelenen,
          birinci: ozet.birinci,
          kaybedilen: ozet.kaybedilen,
          gorunmuyor: ozet.gorunmuyor,
          sorgulanamadi: ozet.sorgulanamadi,
          ...rakipliOzet(sonuc.satirlar),
        },
        select: { id: true },
      });
      if (yazilacak.length > 0) {
        await tx.buyboxDegisimi.createMany({
          data: yazilacak.map((d) => ({
            olcumId: olcum.id,
            channelAccountId: hesap.id,
            variantId: d.satir.variantId,
            olculduAt,
            oncekiDurum: d.onceki,
            yeniDurum: d.yeni,
            siramiz: d.satir.siramiz,
            bizimFiyatAmount: para(d.satir.bizimFiyat),
            buyboxFiyatAmount: para(d.satir.buyboxFiyati),
            currency: hesap.defaultCurrency,
            buyboxSaticisi: d.satir.buyboxSaticisi,
          })),
        });
      }
    },
    /** Tavan yazım boyutuna göre AÇIKÇA (anayasa: varsayılan 5 sn'ye bel bağlanmaz) — ilk koşum ~210 başlangıç satırı. */
    { timeout: 60_000 },
  );
  return { kanal, durum: "YAZILDI", incelenen: ozet.incelenen, birinci: ozet.birinci, degisim: yazilacak.length, sorgulanamadi: ozet.sorgulanamadi, sebepler: sonuc.sebepler };
}

/** Grafik için bir kanalın `[bas, bit)` aralığındaki ölçümleri. Hesap yoksa boş. */
export async function buyboxOlcumleri(kanal: BuyboxKanali, bas: Date, bit: Date): Promise<OlcumNoktasi[]> {
  return prisma.buyboxOlcumu.findMany({
    where: { channelAccount: { channel: { name: KANAL_ADI[kanal] }, satisIcin: true, isActive: true }, olculduAt: { gte: bas, lt: bit } },
    orderBy: { olculduAt: "asc" },
    select: { olculduAt: true, birinci: true, incelenen: true, rakipli: true, rakipliBirinci: true },
  });
}

/** Kanalın İLK ölçüm anı — ondan önceki boşluk kaçırma sayılmaz. Hiç yoksa `null`. */
export async function ilkOlcumAni(kanal: BuyboxKanali): Promise<Date | null> {
  const ilk = await prisma.buyboxOlcumu.findFirst({
    where: { channelAccount: { channel: { name: KANAL_ADI[kanal] }, satisIcin: true, isActive: true } },
    orderBy: { olculduAt: "asc" },
    select: { olculduAt: true },
  });
  return ilk?.olculduAt ?? null;
}

export type PanelKanalOzeti = {
  kanal: BuyboxKanali;
  /** Son saatlik ölçüm; hiç ölçülmediyse `null` (rakam UYDURULMAZ). */
  son: { olculduAt: Date; incelenen: number; birinci: number; kaybedilen: number; gorunmuyor: number } | null;
  /** `[bas, simdi)` aralığındaki el değiştirmeler (`savasSayilari`). */
  alinan: number;
  kaybedilen: number;
};

/**
 * PANEL «BUYBOX SAVAŞLARI» (28.10.2026) — kanala SORU SORMAZ, saatlik
 * ölçümden okur: panel her açılışta TY/HB'ye gitseydi yavaşlardı. Açılan
 * Buybox ekranı CANLI sorgudur; kutu son ölçüm saatini yazar ki iki rakam
 * arasındaki fark (en çok bir saat) okunabilsin.
 */
export async function panelBuyboxOzeti(bas: Date): Promise<PanelKanalOzeti[]> {
  return Promise.all(
    BUYBOX_KANALLARI.map(async (kanal) => {
      const hesap = { channel: { name: KANAL_ADI[kanal] }, satisIcin: true, isActive: true };
      const [son, kayitlar] = await Promise.all([
        prisma.buyboxOlcumu.findFirst({
          where: { channelAccount: hesap },
          orderBy: { olculduAt: "desc" },
          select: { olculduAt: true, incelenen: true, birinci: true, kaybedilen: true, gorunmuyor: true },
        }),
        prisma.buyboxDegisimi.findMany({
          where: { channelAccount: hesap, olculduAt: { gte: bas }, oncekiDurum: { not: null } },
          select: { oncekiDurum: true, yeniDurum: true },
        }),
      ]);
      const savas = savasSayilari(kayitlar.map((k) => ({ onceki: k.oncekiDurum, yeni: k.yeniDurum })));
      return { kanal, son, alinan: savas.alinan, kaybedilen: savas.kaybedilen };
    }),
  );
}

/** Zamanlayıcının bütün kanalları — biri düşerse öteki yine koşar. */
export async function buyboxOlcumleriniYaz(simdi: Date): Promise<(KanalOlcumSonucu | { kanal: BuyboxKanali; durum: "COKTU"; mesaj: string })[]> {
  const sonuc: (KanalOlcumSonucu | { kanal: BuyboxKanali; durum: "COKTU"; mesaj: string })[] = [];
  for (const kanal of BUYBOX_KANALLARI) {
    sonuc.push(
      await buyboxOlcumuYaz(kanal, simdi).catch((e: unknown) => ({
        kanal,
        durum: "COKTU" as const,
        mesaj: (e instanceof Error ? (e.stack ?? e.message) : String(e)).replace(/\r?\n/g, " "),
      })),
    );
  }
  return sonuc;
}
