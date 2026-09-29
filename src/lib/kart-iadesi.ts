import type { BorcAlimi } from "./kart-borcu";

/**
 * ============================================================================
 *  KARTA DÖNEN ALIM İADESİ → KART BORCU (K305, kullanıcı kararı 29.09.2026)
 * ----------------------------------------------------------------------------
 *  Mal kabulde HASARLI gelip stoğa hiç girmeyen adedin parası tedarikçiden
 *  tahsil edildiğinde, para ALIMIN YAPILDIĞI ORİJİNAL KARTA döner (kart ağının
 *  kendi mekaniği — 11.09.2026 kararı: seçim ekranı YOK, kart alımdan gelir).
 *  Bu yüzden kart borcundan düşer ve GERÇEK NET'e gelir olarak GİRMEZ
 *  (bkz. `RaporTazminat.alimIadesi`). Ölçüldü: 5 kayıt · ₺13.001,61.
 *
 *  SAF: veritabanına gitmez. Karta dönen para EKSİ tutarlı, tek çekim bir
 *  kalem olarak tahsil gününün ekstresine düşer (`kartBorcuHesapla` ekstreyi
 *  sıfırın altına indirmez).
 *
 *  ⛔ DESEN: kart borcunu kuran HER gövde bunu `giderleriBorcaCevir` ile
 *  birlikte çağırır — biri unutursa iki ekran farklı borç söyler
 *  (bekçi: `kart-iadesi:dogrula`, dosya listesi tutmaz).
 * ============================================================================
 */
export type KartIadesi = {
  /** Tazminat talebinin kimliği. */
  id: string;
  kartId: string;
  /** Alım kodu — ekstre dökümünde hangi alımın iadesi olduğu okunsun. */
  alimKodu: string;
  tutar: number;
  paraBirimi: string;
  /** Tahsil günü (iz kaydından). */
  tarih: Date;
};

export function alimIadeleriniBorcaCevir(iadeler: readonly KartIadesi[], kartId: string, paraBirimi: string): BorcAlimi[] {
  return iadeler
    .filter((i) => i.kartId === kartId && i.paraBirimi === paraBirimi && i.tutar > 0)
    .map((i) => ({ id: `iade-${i.id}`, kod: `${i.alimKodu} · iade`, tarih: i.tarih, tutar: -i.tutar, taksitSayisi: 1 }));
}
