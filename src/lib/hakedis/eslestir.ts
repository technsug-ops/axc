import { isGunuEkle, gunEkle } from "@/lib/donem";

import {
  HAKEDIS_ESIKLERI,
  SIPARIS_DISI_KODLAR,
  type HakedisSatiri,
} from "./model";

/**
 * ============================================================================
 *  EŞLEŞTİRME VE BEKLEYEN PARA — SAF HESAP
 * ----------------------------------------------------------------------------
 *  Veritabanına GİTMEZ: mevcut satışlar dışarıdan dizi olarak verilir.
 *  Böylece "hangi satır hangi satışa bağlanır" kuralı gerçek veri olmadan
 *  sınanabilir.
 * ============================================================================
 */

/** Eşleştirme için yeterli olan satış özeti. */
export type MevcutSatis = {
  id: string;
  /** Pazaryeri sipariş numarası. */
  kod: string | null;
  /** Satış tarihi — beklenen vade bundan hesaplanır. */
  satisTarihi: Date;
};

export type EslesmeSonucu = {
  /** Satışa bağlanan satırlar. */
  eslesenler: { satir: HakedisSatiri; saleId: string }[];
  /** Sipariş numarası olan ama sistemde karşılığı bulunmayanlar. */
  eslesmeyenler: HakedisSatiri[];
  /** Sipariş numarası olmayan dönem kalemleri. */
  siparisDisi: HakedisSatiri[];
};

/**
 * Satırları satışlara bağlar.
 *
 * ÜÇ KOVA, ÜÇÜ DE YAZILIR:
 *  - eşleşen      → saleId dolu
 *  - eşleşmeyen   → saleId boş, UYARI listesinde görünür, satış sonradan
 *                   girilince bağlanabilir (kullanıcı kararı 11.08.2026)
 *  - sipariş dışı → döneme yazılır, satışa bağlanmaz
 *
 * Eşleşmeyen satır HATA DEĞİLDİR: hakediş raporunda sisteme henüz
 * girilmemiş bir satış olması normaldir. Hata yapılsaydı tek eksik sipariş
 * yüzünden 300 satırlık rapor hiç yüklenmezdi.
 */
export function satirlariEslestir(
  satirlar: HakedisSatiri[],
  satislar: MevcutSatis[],
): EslesmeSonucu {
  const dizin = new Map<string, string>();
  for (const s of satislar) {
    if (s.kod) dizin.set(s.kod.trim(), s.id);
  }

  const sonuc: EslesmeSonucu = {
    eslesenler: [],
    eslesmeyenler: [],
    siparisDisi: [],
  };

  for (const satir of satirlar) {
    if (satir.siparisNo === null || SIPARIS_DISI_KODLAR.includes(satir.kod)) {
      sonuc.siparisDisi.push(satir);
      continue;
    }
    const saleId = dizin.get(satir.siparisNo);
    if (saleId) sonuc.eslesenler.push({ satir, saleId });
    else sonuc.eslesmeyenler.push(satir);
  }

  return sonuc;
}

/**
 * Bir siparişin hakediş NETİ: o siparişe ait TÜM satırların toplamı.
 *
 * Bir sipariş çok satırlıdır. Gerçek zincir (11471381662):
 *   Satış +7025,75 → Kupon −13,42 → Kupon İptal +13,42 → İade −7025,75 = 0
 * İade edilmiş siparişin hakedişi sıfırdır; tek satıra bakan hesap
 * "7025 alacağım var" derdi.
 */
export function siparisNetleri(
  satirlar: HakedisSatiri[],
): Map<string, number> {
  const harita = new Map<string, number>();
  for (const s of satirlar) {
    if (s.siparisNo === null) continue;
    harita.set(s.siparisNo, (harita.get(s.siparisNo) ?? 0) + s.tutar);
  }
  return harita;
}

// ---------------------------------------------------------------------------
//  BEKLEYEN PARA
// ---------------------------------------------------------------------------

export type BeklenenVade = {
  tarih: Date;
  /** Rapordan mı okundu, yoksa ayardan mı tahmin edildi? */
  kaynak: "RAPOR" | "TAHMIN";
};

/**
 * Bir satışın beklenen ödeme tarihi.
 *
 * RAPOR VARSA RAPOR KAZANIR. Aynı hesapta 21 ve 28 iş günlük satırlar bir
 * arada çıkıyor (11.08.2026 ölçümü, 5 dosyada 23 farklı vade tarihi);
 * kanal ayarındaki tek sayı gerçeği temsil etmiyor.
 *
 * Ayar YALNIZCA rapora henüz düşmemiş satışlar için ön-tahmindir ve
 * ekranda öyle işaretlenir — tahmini gerçek gibi göstermek, olmayan bir
 * kesinlik satmaktır.
 */
export function beklenenVade(
  satisTarihi: Date,
  rapordakiVade: Date | null,
  payoutDays: number | null,
  isGunuMu: boolean,
): BeklenenVade | null {
  if (rapordakiVade) return { tarih: rapordakiVade, kaynak: "RAPOR" };
  if (payoutDays === null) return null;

  return {
    tarih: isGunuMu
      ? isGunuEkle(satisTarihi, payoutDays)
      : gunEkle(satisTarihi, payoutDays),
    kaynak: "TAHMIN",
  };
}

export type OdemeDurumu =
  | "ODENDI"
  | "BEKLIYOR"
  | "GECIKTI"
  | "EKSIK_ODEME"
  | "FAZLA_ODEME";

/**
 * Bir siparişin ödeme durumu.
 *
 * @param beklenenTutar  Bizim hesabımız (kâr motorundan gelen net hakediş).
 * @param gerceklesenTutar Rapordan gelen toplam.
 * @param odendiMi Rapor "ödendi" diyor mu (HB'de var, TY'de yok).
 * @param bugun İş saat dilimindeki bugün — dışarıdan verilir.
 */
export function odemeDurumu(girdi: {
  beklenenTutar: number | null;
  gerceklesenTutar: number | null;
  vade: Date | null;
  odendiMi: boolean;
  bugun: Date;
  gecikmeIsGunu?: number;
}): OdemeDurumu {
  const esik = girdi.gecikmeIsGunu ?? HAKEDIS_ESIKLERI.gecikmeIsGunu;

  if (girdi.odendiMi) {
    // Ödendi ama tutar tutmuyor mu? Kuruş farkı gürültüdür, susulur.
    if (girdi.beklenenTutar !== null && girdi.gerceklesenTutar !== null) {
      const fark = girdi.gerceklesenTutar - girdi.beklenenTutar;
      if (fark < -HAKEDIS_ESIKLERI.tutarFarki) return "EKSIK_ODEME";
      if (fark > HAKEDIS_ESIKLERI.tutarFarki) return "FAZLA_ODEME";
    }
    return "ODENDI";
  }

  // Vade bilinmiyorsa gecikme de bilinemez — "bekliyor" der, uydurmaz.
  if (girdi.vade === null) return "BEKLIYOR";

  // Vadeye eşik kadar iş günü eklenip bugünle karşılaştırılır. Eşik,
  // resmî tatilleri saymadığımız için var (bkz. HAKEDIS_ESIKLERI).
  const sinir = isGunuEkle(girdi.vade, esik);
  return girdi.bugun.getTime() > sinir.getTime() ? "GECIKTI" : "BEKLIYOR";
}
