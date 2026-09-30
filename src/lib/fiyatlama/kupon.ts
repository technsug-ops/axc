import { simulasyonKur, type SimulasyonGirdisi, type SimulasyonSonucu } from "@/lib/fiyatlama/simulasyon";

/**
 * ============================================================================
 *  TAKİPÇİ KUPONU — FİYAT DENEMESİNDE (K19-②, 30.09.2026)
 * ----------------------------------------------------------------------------
 *  Mağazayı takip eden müşteri bir kez ₺15 indirim alır ve kuponu MAĞAZA
 *  öder. Fiyat denemesi bunu bilmiyordu: kuponlu satışlarda gösterdiği NET
 *  gerçekte olduğundan yüksekti.
 *
 *  📏 ÖLÇÜLDÜ (30.09.2026, canlı, kuponlu tek kalemli 389 TY satışı):
 *  374'ünde (%96) TY'nin ödediği = defterdeki satış tutarı × (1 − oran),
 *  kupon satırı 349'unda tam `15 × (1 − oran)`. Yani komisyon KUPON DÜŞÜLMÜŞ
 *  tutardan alınır ve defter satışı kupon düşülmüş tutarla tutar. Kuponlu
 *  satışın hesabı bu yüzden «fiyat − kupon» ile AYNI motordan koşar —
 *  ayrı bir kupon formülü YAZILMAZ (iki yerde iki kural olmaz).
 *
 *  ⚠ ÖLÇÜLMEYEN TEK ŞEY: komisyon DİLİMİNİN liste fiyatına mı kuponlu fiyata
 *  mı göre seçildiği. Kupon fiyatı dilim sınırının altına indiriyorsa hesap
 *  kuponlu fiyatın dilimini kullanır ve bu ekranda AYRICA yazılır
 *  (`dilimDegisti`) — sessizce bir varsayım seçilmez.
 * ============================================================================
 */

export type KuponluSonuc = {
  kupon: number;
  sonuc: SimulasyonSonucu;
  /** Kuponsuz NET-2'ye göre fark (genelde eksi). Biri hesaplanamıyorsa null. */
  net2Farki: number | null;
  /** Kuponlu fiyat başka bir komisyon dilimine düştü mü. */
  dilimDegisti: boolean;
};

/** Kupon geçersizse (boş, sıfır, eksi, fiyattan büyük/eşit) null — hesap yapılmaz. */
export function kuponluSimulasyon(
  girdi: SimulasyonGirdisi,
  kuponsuz: SimulasyonSonucu,
  kupon: number | null,
): KuponluSonuc | null {
  if (kupon === null || !Number.isFinite(kupon) || kupon <= 0 || kupon >= girdi.hedefFiyat) return null;
  const sonuc = simulasyonKur({ ...girdi, hedefFiyat: girdi.hedefFiyat - kupon });
  return {
    kupon,
    sonuc,
    net2Farki: sonuc.net2 === null || kuponsuz.net2 === null ? null : sonuc.net2 - kuponsuz.net2,
    dilimDegisti: (sonuc.dilim?.sira ?? null) !== (kuponsuz.dilim?.sira ?? null),
  };
}
