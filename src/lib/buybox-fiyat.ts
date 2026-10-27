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
 *  Gönderim (25.10.2026'dan beri) iki kanala: Trendyol + Hepsiburada.
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
 * K366 (27.10.2026): maliyet tercihi ÜRÜN ÜRÜN seçilir — elde kalan stoğun en
 * düşük · ortalama · en yüksek alışı (varsayılan en düşük, 25.10 kararının
 * aynısı). Kutu ve öneri aynı tercihi okur (İlke #10).
 */
export const MALIYET_TERCIHLERI = ["EN_DUSUK", "ORTALAMA", "EN_YUKSEK"] as const;
export type MaliyetTercihi = (typeof MALIYET_TERCIHLERI)[number];

/**
 * Rafta duran (kalanAdet > 0) partilerden seçilen maliyet (KDV dahil):
 * en düşük · ADETLE AĞIRLIKLI ortalama · en yüksek. Stoku bitmiş alış girmez.
 * Para birimi tutmayan ya da maliyeti boş parti sayılmaz — `null` = rafta
 * maliyeti bilinen mal yok (NET hesaplanmaz, uydurulmaz).
 */
export function acikMaliyet(
  partiler: readonly AcikParti[],
  paraBirimi: string,
  tercih: MaliyetTercihi,
): { maliyet: number | null; partiSayisi: number; rafAdedi: number } {
  let enDusuk: number | null = null;
  let enYuksek: number | null = null;
  let toplam = 0;
  let adet = 0;
  let partiSayisi = 0;
  let rafAdedi = 0;
  for (const p of partiler) {
    if (p.kalanAdet <= 0) continue;
    rafAdedi += p.kalanAdet;
    if (p.birimMaliyet === null || p.birimMaliyetParaBirimi !== paraBirimi) continue;
    const m = Number(p.birimMaliyet);
    if (!Number.isFinite(m)) continue;
    partiSayisi += 1;
    if (enDusuk === null || m < enDusuk) enDusuk = m;
    if (enYuksek === null || m > enYuksek) enYuksek = m;
    toplam += m * p.kalanAdet;
    adet += p.kalanAdet;
  }
  const maliyet =
    partiSayisi === 0 ? null : tercih === "EN_DUSUK" ? enDusuk : tercih === "EN_YUKSEK" ? enYuksek : Math.round((toplam / adet) * 100) / 100;
  return { maliyet, partiSayisi, rafAdedi };
}

/** Rafta duran partilerin EN DÜŞÜĞÜ — `acikMaliyet(…, "EN_DUSUK")`. */
export function enDusukAcikMaliyet(partiler: readonly AcikParti[], paraBirimi: string) {
  return acikMaliyet(partiler, paraBirimi, "EN_DUSUK");
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
 * HB KENDİ İNDİRİMİ (26.10.2026, kullanıcı: «HB onu 1.887,90'a indirmiş ama bana
 * 2.170'ten ödeyecek … liste fiyatından ne kadar indirmemiz gerek ona bakacağız»).
 * Kutuya yazılan ve kanala giden fiyat LİSTE fiyatıdır; müşteri onu
 * `liste × (1 − indirim)` görür. Kâr liste fiyatından hesaplanır. İndirim 0 →
 * iki fiyat aynı (TY ve indirimsiz HB ürünü bugünkü gibi çalışır).
 */
export function musteriFiyati(liste: number, indirim: number): number {
  return Math.round(liste * (1 - indirim) * 100) / 100;
}

/**
 * Müşteri fiyatını EN ÇOK `hedef` yapacak en yüksek liste fiyatı (kuruşa).
 * Aşağı yuvarlanır: yukarı yuvarlamak müşteri fiyatını hedefin ÜSTÜNE
 * çıkarabilirdi (Buybox'ı kaçırır). Sonuç yine sınanır.
 */
export function listeFiyatiIcin(hedef: number, indirim: number): number {
  if (!(indirim > 0) || indirim >= 1) return Math.round(hedef * 100) / 100;
  let kurus = Math.floor((hedef / (1 - indirim)) * 100 + 1e-6);
  while (kurus > 1 && musteriFiyati(kurus / 100, indirim) > hedef + 1e-9) kurus -= 1;
  return kurus / 100;
}

/** `fiyat` LİSTE fiyatı (kutuya yazılır, kanala gider); `musteri` HB indirimi düşülmüş hâli. */
export type HizliFiyat = { anahtar: "buyboxAlti" | "buybox" | "ikinciAlti"; fiyat: number; musteri: number };

/**
 * HIZLI DOLDURMA (25.10.2026, kullanıcı «frontend zayıf»): kutuyu tek tıkla
 * dolduran adaylar. ÖNERİ DEĞİL — yalnız kutuya yazar; kâr hesabı ve onay aynı.
 * · Kaybedilmişse: Buybox'ın 1 ₺ altı · Buybox fiyatı.
 * · Buybox bizdeyse: 2. fiyatın 1 ₺ altı (yalnız bizim fiyatımızdan YÜKSEKSE —
 *   öndeliği koruyup fiyatı yükseltme adayı; değilse aday yok).
 * Hedefler MÜŞTERİ fiyatıdır (Buybox müşteri fiyatıyla yarışır); kutuya o
 * müşteri fiyatını veren LİSTE fiyatı yazılır (`indirim`; TY'de 0).
 * Sıfır/eksi aday üretilmez.
 */
export function hizliFiyatlar(s: { durum: string; bizimFiyat: number | null; buyboxFiyati: number | null; ikinciFiyat: number | null; indirim: number }): HizliFiyat[] {
  const aday = (anahtar: HizliFiyat["anahtar"], hedef: number): HizliFiyat => {
    const fiyat = listeFiyatiIcin(hedef, s.indirim);
    return { anahtar, fiyat, musteri: musteriFiyati(fiyat, s.indirim) };
  };
  const sonuc: HizliFiyat[] = [];
  if (s.durum === "KAYBEDILDI" && s.buyboxFiyati !== null && s.buyboxFiyati > 0) {
    if (s.buyboxFiyati - 1 > 0) sonuc.push(aday("buyboxAlti", s.buyboxFiyati - 1));
    sonuc.push(aday("buybox", s.buyboxFiyati));
  }
  if (s.durum === "BIRINCI" && s.ikinciFiyat !== null && s.bizimFiyat !== null && s.ikinciFiyat - 1 > s.bizimFiyat) {
    sonuc.push(aday("ikinciAlti", s.ikinciFiyat - 1));
  }
  return sonuc;
}

/**
 * ZARAR KAPISI — NET-2 eksiyse gönderim açık onay ister (kullanıcı kararı
 * 25.10.2026: «uyarıp onay iste»). NET hesaplanamıyorsa (maliyet/oran yok)
 * de onay istenir: kârı bilinmeyen fiyat «kârlı» sayılmaz.
 */
export function zararOnayiGerekirMi(s: Pick<FiyatSonucu, "net2">): boolean {
  return s.net2 === null || s.net2 < 0;
}
