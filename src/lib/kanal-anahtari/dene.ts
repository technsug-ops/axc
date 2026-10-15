import { apiGet as hbGet, baslikKur as hbBaslik, UCLAR as HB } from "../../../scripts/hb/istemci";
import { apiGet as n11Get, baslikKur as n11Baslik, UCLAR as N11 } from "../../../scripts/n11/istemci";
import { apiGet as tyGet, baslikKur as tyBaslik, UCLAR as TY } from "../../../scripts/ty/istemci";

import type { KanalKimligi } from "./kimlik";

/**
 * ============================================================================
 *  BAĞLANTIYI DENE — K337 3. adım ② (15.10.2026)
 * ----------------------------------------------------------------------------
 *  Hesabın KENDİ anahtarıyla pazaryerine TEK, ZARARSIZ bir okuma isteği:
 *  TY onaylı ürünlerden 1 · HB ilanlardan 1 · N11 paketlerden 1 kayıt.
 *  Yazma YOK (istemcilerin tek çağrı noktası yalnız okur). Veritabanına da
 *  dokunmaz — sonucu çağıran depoya yazar (`depo.ts → denemeSonucuYaz`).
 *
 *  ⚠ Sonuç KOD döner; pazaryerinin ham hata metni ekrana/kayda taşınmaz
 *  (anahtarın parçası yansıyabilir — anayasa: hata koda çevrilir).
 * ============================================================================
 */

export type DenemeSonucu = "BAGLANDI" | "REDDEDILDI" | "ISTEK_HATALI" | "ULASILAMADI";

/**
 * SAF — istemci okuma sonucunun türü → deneme sonucu.
 *  · VERI / BOS: uç cevap verdi, anahtar kabul edildi (boş liste de bağlantıdır).
 *  · YETKISIZ (401/403): anahtar REDDEDİLDİ.
 *  · ISTEK_HATALI (400): uç ayakta ama kimlikteki satıcı/mağaza no gibi bir alan tutmuyor.
 *  · BULUNAMADI · ULASILAMADI · bilinmeyen: pazaryerine ulaşılamadı — anahtar hakkında HÜKÜM YOK.
 */
export function okumayiYorumla(tur: string): DenemeSonucu {
  if (tur === "VERI" || tur === "BOS") return "BAGLANDI";
  if (tur === "YETKISIZ") return "REDDEDILDI";
  if (tur === "ISTEK_HATALI") return "ISTEK_HATALI";
  return "ULASILAMADI";
}

export async function baglantiyiDene(k: KanalKimligi): Promise<DenemeSonucu> {
  switch (k.kanal) {
    case "TRENDYOL":
      return okumayiYorumla((await tyGet(TY.onayliUrunler(k.kimlik.saticiId, 0, 1), tyBaslik(k.kimlik), 15_000)).tur);
    case "HEPSIBURADA":
      return okumayiYorumla((await hbGet(HB.listingler(k.kimlik, 0, 1), hbBaslik(k.kimlik), 15_000)).tur);
    case "N11":
      return okumayiYorumla((await n11Get(N11.paketler(0, 1), n11Baslik(k.kimlik), 15_000)).tur);
  }
}
