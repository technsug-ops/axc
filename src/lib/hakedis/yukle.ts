import readXlsxFile from "read-excel-file/node";

import { prisma } from "@/lib/prisma";

import {
  satirlariEslestir,
  type EslesmeSonucu,
  type MevcutSatis,
} from "./eslestir";
import type { HakedisSatiri } from "./model";
import {
  hepsiburadaOku,
  satirAnahtari,
  taninmayanTipler,
  trendyolOku,
  turkiyeDisiMi,
} from "./okuyucu";
import { paketiNormalle } from "./paket";

/**
 * ============================================================================
 *  HAKEDİŞ YÜKLEME BORU HATTI
 * ----------------------------------------------------------------------------
 *  İçe aktarma modülüyle aynı akış: DENETLE → ÖNİZLE → ONAYLA → TEK
 *  TRANSACTION. Fark: burada "ya hepsi ya hiçi" hata kanalı çok dar tutuldu.
 *
 *  NEDEN: hakediş raporu DIŞ dünyanın kaydıdır, biz üretmiyoruz. Sistemde
 *  olmayan bir sipariş, tanımadığımız bir kesinti tipi, Türkiye dışı bir
 *  satır — bunlar hata değil, HABERDİR. Hata sayılsaydı tek eksik sipariş
 *  yüzünden 539 satırlık rapor hiç yüklenmezdi.
 *
 *  Yüklemeyi DURDURAN tek şey: dosyanın okunamaması ya da zorunlu kolonun
 *  bulunmaması. Onlarda satır üretilemez, devam etmenin anlamı yoktur.
 * ============================================================================
 */

export type HakedisHatasi =
  | { kod: "DOSYA_OKUNAMADI"; ayrinti: string }
  | { kod: "SAYFA_YOK" }
  | { kod: "SUTUN_EKSIK"; sutunlar: string[] }
  | { kod: "SATIR_YOK" }
  | { kod: "HESAP_YOK" };

export type HakedisUyarisi =
  | { kod: "SIPARIS_BULUNAMADI"; siparisNo: string; sayi: number; toplam: number }
  | { kod: "TANINMAYAN_TIP"; hamTip: string; sayi: number; toplam: number }
  | { kod: "TURKIYE_DISI"; sayi: number }
  | { kod: "ZATEN_YUKLU"; sayi: number };

export type HakedisOnizleme = {
  kanal: "TRENDYOL" | "HEPSIBURADA";
  /** Dosyadaki toplam satır. */
  okunan: number;
  /** Daha önce yüklenmiş, bu sefer atlanacak satırlar. */
  atlanan: number;
  /** Yazılacak satırlar. */
  yazilacak: number;
  eslesenSatir: number;
  eslesmeyenSatir: number;
  siparisDisiSatir: number;
  /** Eşleşen farklı sipariş sayısı. */
  eslesenSiparis: number;
  /** Para birimi başına net toplam. */
  netToplam: { paraBirimi: string; tutar: number }[];
  uyarilar: HakedisUyarisi[];
};

export type HakedisDenetimi =
  | { durum: "HATA"; hatalar: HakedisHatasi[] }
  | {
      durum: "ONIZLEME";
      onizleme: HakedisOnizleme;
      /** Yazım için hazır satırlar — onaydan sonra kullanılır. */
      yazilacaklar: { satir: HakedisSatiri; saleId: string | null }[];
    };

/** Kanal adından okuyucu seçer. */
function okuyucuSec(kanalKodu: string) {
  const k = kanalKodu.toUpperCase();
  if (k.includes("TRENDYOL")) return trendyolOku;
  if (k.includes("HEPSIBURADA")) return hepsiburadaOku;
  return null;
}

/**
 * Dosyayı okur, eşleştirir, önizleme üretir. HİÇBİR ŞEY YAZMAZ.
 */
export async function hakedisDenetle(
  dosya: Buffer,
  channelAccountId: string,
): Promise<HakedisDenetimi> {
  const hesap = await prisma.channelAccount.findUnique({
    where: { id: channelAccountId },
    include: { channel: { select: { code: true, name: true } } },
  });
  if (!hesap) return { durum: "HATA", hatalar: [{ kod: "HESAP_YOK" }] };

  const oku = okuyucuSec(hesap.channel.code);
  if (!oku) {
    return {
      durum: "HATA",
      hatalar: [{ kod: "DOSYA_OKUNAMADI", ayrinti: hesap.channel.name }],
    };
  }

  // Trendyol dosyaları ZIP64 + veri tanımlayıcılı geliyor; kütüphane onları
  // açamıyor. Normalleştirici gerekiyorsa kabı değiştirir (bkz. paket.ts).
  let ham: unknown[][];
  try {
    const { bayt } = paketiNormalle(dosya);
    const sayfalar = await readXlsxFile(bayt);
    const ilk = sayfalar[0] as unknown as { sheet: string; data: unknown[][] };
    if (!ilk?.data) return { durum: "HATA", hatalar: [{ kod: "SAYFA_YOK" }] };
    ham = ilk.data;
  } catch (e) {
    return {
      durum: "HATA",
      hatalar: [{ kod: "DOSYA_OKUNAMADI", ayrinti: String(e).slice(0, 200) }],
    };
  }

  const okuma = oku(ham);
  if (okuma.eksikSutunlar.length > 0) {
    return {
      durum: "HATA",
      hatalar: [{ kod: "SUTUN_EKSIK", sutunlar: okuma.eksikSutunlar }],
    };
  }
  if (okuma.satirlar.length === 0) {
    return { durum: "HATA", hatalar: [{ kod: "SATIR_YOK" }] };
  }

  // --- TEKRAR YÜKLEME: daha önce girmiş satırlar atlanır ---
  const anahtarlar = okuma.satirlar.map(satirAnahtari);
  const mevcutlar = await prisma.settlementItem.findMany({
    where: { channelAccountId, rowKey: { in: anahtarlar } },
    select: { rowKey: true },
  });
  const yuklu = new Set(mevcutlar.map((m) => m.rowKey));
  const yeniler = okuma.satirlar.filter((s) => !yuklu.has(satirAnahtari(s)));

  // --- eşleştirme ---
  const siparisNolar = [
    ...new Set(yeniler.map((s) => s.siparisNo).filter((n): n is string => !!n)),
  ];
  const satisKayitlari = await prisma.sale.findMany({
    where: { code: { in: siparisNolar } },
    select: { id: true, code: true, soldAt: true },
  });
  const satislar: MevcutSatis[] = satisKayitlari.map((s) => ({
    id: s.id,
    kod: s.code,
    satisTarihi: s.soldAt,
  }));

  const eslesme = satirlariEslestir(yeniler, satislar);

  return {
    durum: "ONIZLEME",
    onizleme: onizlemeKur(okuma.kanal, okuma.satirlar, yuklu.size, eslesme),
    yazilacaklar: [
      ...eslesme.eslesenler.map((e) => ({ satir: e.satir, saleId: e.saleId })),
      ...eslesme.eslesmeyenler.map((s) => ({ satir: s, saleId: null })),
      ...eslesme.siparisDisi.map((s) => ({ satir: s, saleId: null })),
    ],
  };
}

function onizlemeKur(
  kanal: "TRENDYOL" | "HEPSIBURADA",
  tumSatirlar: HakedisSatiri[],
  atlanan: number,
  eslesme: EslesmeSonucu,
): HakedisOnizleme {
  const yazilacak =
    eslesme.eslesenler.length +
    eslesme.eslesmeyenler.length +
    eslesme.siparisDisi.length;

  const uyarilar: HakedisUyarisi[] = [];

  if (atlanan > 0) uyarilar.push({ kod: "ZATEN_YUKLU", sayi: atlanan });

  // Eşleşmeyen siparişler — sipariş bazında grupla, her biri ayrı satır
  // olarak listelenmesin (bir sipariş 7 kalem olabilir).
  const eksikler = new Map<string, { sayi: number; toplam: number }>();
  for (const s of eslesme.eslesmeyenler) {
    const anahtar = s.siparisNo ?? "";
    const m = eksikler.get(anahtar) ?? { sayi: 0, toplam: 0 };
    m.sayi++;
    m.toplam += s.tutar;
    eksikler.set(anahtar, m);
  }
  for (const [siparisNo, m] of eksikler) {
    uyarilar.push({ kod: "SIPARIS_BULUNAMADI", siparisNo, ...m });
  }

  for (const t of taninmayanTipler({ kanal, satirlar: tumSatirlar, eksikSutunlar: [] })) {
    uyarilar.push({ kod: "TANINMAYAN_TIP", ...t });
  }

  // --- para birimi başına net ---
  const paralar = new Map<string, number>();
  const tumu = [
    ...eslesme.eslesenler.map((e) => e.satir),
    ...eslesme.eslesmeyenler,
    ...eslesme.siparisDisi,
  ];
  for (const s of tumu) {
    paralar.set(s.paraBirimi, (paralar.get(s.paraBirimi) ?? 0) + s.tutar);
  }

  return {
    kanal,
    okunan: tumSatirlar.length,
    atlanan,
    yazilacak,
    eslesenSatir: eslesme.eslesenler.length,
    eslesmeyenSatir: eslesme.eslesmeyenler.length,
    siparisDisiSatir: eslesme.siparisDisi.length,
    eslesenSiparis: new Set(
      eslesme.eslesenler.map((e) => e.satir.siparisNo),
    ).size,
    netToplam: [...paralar.entries()]
      .map(([paraBirimi, tutar]) => ({ paraBirimi, tutar }))
      .sort((a, b) => a.paraBirimi.localeCompare(b.paraBirimi)),
    uyarilar,
  };
}

/**
 * Onaydan sonra yazar. TEK TRANSACTION.
 *
 * Yükleme bir PARTİDİR: bir dosya = bir Settlement (kullanıcı kararı
 * 11.08.2026). Tarihler kalemlerde durur, raporlama dinamik gruplar.
 */
export async function hakedisYaz(girdi: {
  channelAccountId: string;
  dosyaAdi: string;
  satirlar: { satir: HakedisSatiri; saleId: string | null }[];
}): Promise<{ settlementId: string; yazilan: number }> {
  const paraBirimi = girdi.satirlar[0]?.satir.paraBirimi ?? "TRY";
  const toplam = girdi.satirlar.reduce((t, s) => t + s.satir.tutar, 0);

  // Partinin ödeme tarihi: kalemlerdeki EN GEÇ ödeme günü. Hiçbiri
  // ödenmemişse boş kalır — uydurulmaz.
  const odemeler = girdi.satirlar
    .map((s) => s.satir.odemeTarihi)
    .filter((t): t is Date => t !== null);
  const paidAt =
    odemeler.length > 0
      ? new Date(Math.max(...odemeler.map((t) => t.getTime())))
      : null;

  return prisma.$transaction(async (tx) => {
    const parti = await tx.settlement.create({
      data: {
        channelAccountId: girdi.channelAccountId,
        sourceFile: girdi.dosyaAdi,
        paidAt,
        amount: String(toplam),
        currency: paraBirimi,
      },
      select: { id: true },
    });

    await tx.settlementItem.createMany({
      data: girdi.satirlar.map(({ satir, saleId }) => ({
        settlementId: parti.id,
        channelAccountId: girdi.channelAccountId,
        saleId,
        externalId: satir.externalId,
        rowKey: satirAnahtari(satir),
        code: satir.kod,
        rawType: satir.hamTip,
        orderNo: satir.siparisNo,
        amount: String(satir.tutar),
        currency: satir.paraBirimi,
        dueDate: satir.vadeTarihi,
        paidAt: satir.odemeTarihi,
        rawRow: satir.ham,
      })),
    });

    return { settlementId: parti.id, yazilan: girdi.satirlar.length };
  });
}

/** Türkiye dışı satır sayısı — uyarı için (TY'de para birimi kolonu yok). */
export function turkiyeDisiSayisi(satirlar: { ham: string }[]): number {
  return satirlar.filter((s) => turkiyeDisiMi(s.ham)).length;
}
