import type { SimulasyonZemini } from "./fiyatlama/kart-verisi";
import { simulasyonKur, type SimulasyonSonucu } from "./fiyatlama/simulasyon";
import { ciroMarji } from "./marj-gosterge";

/**
 * ============================================================================
 *  BUYBOX FİYAT KUTUSU — SAF HESAP (K363 Faz 3-c, kullanıcı kararı 25.10.2026)
 * ----------------------------------------------------------------------------
 *  Buybox satırında: bizim fiyat · Buybox fiyatı · elle girilen fiyat için
 *  NET ve marj. Motor ürün kartının fiyat denemesiyle AYNI (`simulasyonKur` →
 *  `karHesapla`); zemin de aynı gövdeden (`simulasyonZeminleri`). Tarayıcıda
 *  da çalışır (veritabanına gitmez).
 *  İki fark beyanlıdır:
 *  · MALİYET = RAFTA DURAN partilerin EN DÜŞÜĞÜ (kullanıcı kararı: «stoktaki en
 *    düşük fiyat olmalı ama stok olması önemli» — stoku bitmiş alış girmez).
 *    Kart açık partilerin ağırlıklı ORTALAMASINI kullanır; ikisi farklı soru.
 *  · KARGO DAHİL: ürünün desisi + o kanaldaki son satışının kargo firması +
 *    bugünkü tarife (kart denemesi kargoyu katmıyor). Bilinmiyorsa uydurulmaz:
 *    NET kargo hariç hesaplanır ve ekran bunu SÖYLER.
 * ============================================================================
 */

export type AcikParti = { kalanAdet: number; birimMaliyet: string | null; birimMaliyetParaBirimi: string | null };

/**
 * Rafta duran (kalanAdet > 0) partilerin EN DÜŞÜK birim maliyeti (KDV dahil).
 * Para birimi tutmayan ya da maliyeti boş parti sayılmaz — `null` = rafta
 * maliyeti bilinen mal yok (NET hesaplanmaz, uydurulmaz).
 */
export function enDusukAcikMaliyet(partiler: readonly AcikParti[], paraBirimi: string): { maliyet: number | null; partiSayisi: number; rafAdedi: number } {
  let maliyet: number | null = null;
  let partiSayisi = 0;
  let rafAdedi = 0;
  for (const p of partiler) {
    if (p.kalanAdet <= 0) continue;
    rafAdedi += p.kalanAdet;
    if (p.birimMaliyet === null || p.birimMaliyetParaBirimi !== paraBirimi) continue;
    const m = Number(p.birimMaliyet);
    if (!Number.isFinite(m)) continue;
    partiSayisi += 1;
    if (maliyet === null || m < maliyet) maliyet = m;
  }
  return { maliyet, partiSayisi, rafAdedi };
}

export type FiyatZemini = {
  zemin: SimulasyonZemini;
  kdvOrani: number;
  paraBirimi: "TRY" | "EUR";
  /** KDV dahil; `null` = rafta maliyeti bilinen parti yok. */
  maliyet: number | null;
  /** KDV HARİÇ kargo tarifesi; `null` = bilinmiyor (NET kargo hariç). */
  kargoTarifesi: number | null;
};

export type FiyatSonucu = {
  fiyat: number;
  net1: number | null;
  net2: number | null;
  /** Ciro marjı (%) — NET-2 / fiyat. */
  marj: number | null;
  komisyonOrani: number | null;
  kargoDahil: boolean;
  beyanlar: SimulasyonSonucu["beyanlar"];
};

/** Bir fiyatın tek adetlik sonucu — kartla aynı motor. */
export function fiyatSonucu(z: FiyatZemini, fiyat: number, bugun: Date): FiyatSonucu {
  const s = simulasyonKur({
    hedefFiyat: fiyat,
    adet: 1,
    birimMaliyet: z.maliyet,
    kdvOrani: z.kdvOrani,
    paraBirimi: z.paraBirimi,
    dilimler: z.zemin.dilimler,
    pencereBitis: z.zemin.pencereBitis,
    tekOran: z.zemin.tekOran,
    komisyonKdvOrani: z.zemin.komisyonKdvOrani,
    siparisKesintileri: z.zemin.siparisKesintileri,
    kargoTarifesi: z.kargoTarifesi,
    bugun,
  });
  return {
    fiyat,
    net1: s.net1,
    net2: s.net2,
    marj: ciroMarji(s.net2, s.ciro),
    komisyonOrani: s.komisyonOrani,
    kargoDahil: z.kargoTarifesi !== null,
    beyanlar: s.beyanlar,
  };
}

/**
 * Türkçe fiyat girişi: «1.555,90» → 1555.9 · «1555» → 1555. Boş → `null`,
 * çözülemeyen ya da sıfır/eksi → `NaN` (gönderilmez; ekran sebebini yazar).
 */
export function fiyatMetniCoz(metin: string): number | null {
  const temiz = metin.trim().replace(/\s|₺/g, "");
  if (temiz === "") return null;
  const sayi = Number(temiz.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(sayi) && sayi > 0 ? Math.round(sayi * 100) / 100 : Number.NaN;
}

/**
 * ZARAR KAPISI — NET-2 eksiyse gönderim açık onay ister (kullanıcı kararı
 * 25.10.2026: «uyarıp onay iste»). NET hesaplanamıyorsa (maliyet/oran yok)
 * de onay istenir: kârı bilinmeyen fiyat «kârlı» sayılmaz.
 */
export function zararOnayiGerekirMi(s: Pick<FiyatSonucu, "net2">): boolean {
  return s.net2 === null || s.net2 < 0;
}
