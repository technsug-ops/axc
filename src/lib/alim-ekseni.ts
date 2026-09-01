/**
 * ============================================================================
 *  ALIM TARİH EKSENİ — SİPARİŞ Mİ, MAL KABUL MÜ (K114, 01.09.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ NİYE DOĞDU: kullanıcı 31.08.2026'da _"alımlarda normalde böyle
 *  filtreleme var ama bugün teslim aldıklarım çıkmıyor"_ dedi. `/alimlar`
 *  tarih süzgeci `purchasedAt`e (SİPARİŞ günü) bakıyordu; mal kabul günü
 *  başka bir alan (`receivedAt`) ve ekranda ona bakan hiçbir yol yoktu.
 *
 *  ── ⚠ İKİ EKSEN NEREDEYSE HİÇ ÖRTÜŞMÜYOR — ÖLÇÜLDÜ ───────────────────
 *  Canlı (01.09.2026, n=1959 mal kabul yapılmış alım):
 *      sipariş → kabul gecikmesi   ortanca **3 gün**  (p25 2 · p75 4 · max 48)
 *      aynı gün olan               yalnız **%1,4** (27 alım)
 *  Yani "bugün ne aldım" ile "bugün ne geldi" pratikte AYRI iki sorudur ve
 *  tek eksenle ikisi birden cevaplanamaz.
 *
 *  ── ⛔ VARSAYILAN SİPARİŞ EKSENİ — VE BU MEVCUT DAVRANIŞIN KORUNMASI ──
 *  Ekran bugüne kadar `purchasedAt`e bakıyordu. Varsayılan kabul yapılsaydı
 *  adres çubuğundaki eski bağlantılar ve alışkanlıklar SESSİZCE başka bir
 *  küme gösterirdi.
 *
 *  ── ⛔ KABUL EKSENİ 31 ALIMI DIŞARIDA BIRAKIR VE BU YAZILIR ───────────
 *  Ölçüldü: 1990 alımın **31'inde (%1,6)** `receivedAt` yok. Onlar kabul
 *  ekseninde hiçbir pencerede görünmez — bu bir kusur değil, o alımların mal
 *  kabulü henüz yapılmamış. Ama SESSİZ kalırsa "kayboldu" sanılır.
 *  _(Anayasa: boş sonuç ile temiz sonucu ayırt edemeyen ekran, ekran değildir.)_
 *
 *  ⭐ SAF: veritabanına gitmez, ekran bilmez. Bekçi gövdeyi ÇAĞIRIP değerini
 *  ölçüyor.
 * ============================================================================
 */

export const ALIM_EKSENLERI = ["siparis", "kabul"] as const;
export type AlimEkseni = (typeof ALIM_EKSENLERI)[number];

/**
 * ⚠ VARSAYILAN `siparis` — bugünkü davranış. Tanınmayan değer de buraya
 * düşer; boş listeye düşseydi bozuk bir adres ekranı sessizce boşaltırdı.
 */
export const VARSAYILAN_EKSEN: AlimEkseni = "siparis";

export function alimEkseniCoz(ham: string | null | undefined): AlimEkseni {
  return (ALIM_EKSENLERI as readonly string[]).includes(ham ?? "")
    ? (ham as AlimEkseni)
    : VARSAYILAN_EKSEN;
}

/**
 * Eksenin baktığı ALAN ADI — hem süzgeç hem sıralama buradan okur.
 *
 * ⛔ İKİ YERDE İKİ ALAN ADI YAZILMAZ: süzgeç `receivedAt`e bakıp sıralama
 * `purchasedAt`te kalsaydı liste doğru kümeyi YANLIŞ sırada gösterirdi —
 * ve "mal kabul sırasına göre bak" cümlesi sessizce yalan olurdu.
 */
export function eksenAlani(eksen: AlimEkseni): "purchasedAt" | "receivedAt" {
  return eksen === "kabul" ? "receivedAt" : "purchasedAt";
}

/** Sözlük anahtarı — ekran metni koda gömülmez. */
export function eksenAnahtari(eksen: AlimEkseni): string {
  return eksen === "kabul" ? "eksenKabul" : "eksenSiparis";
}

/**
 * Boş sonuç kendini anlatabilsin diye: ÖTEKİ eksen hangisi.
 *
 * ⭐ EKRAN "KAYIT YOK" DEMEZ, NEDEN OLMADIĞINI SÖYLER: "sipariş tarihine
 * göre bakıyorsun, mal kabul tarihine göre N kayıt var" cümlesi kullanıcıyı
 * doğrudan çözüme götürür. Yalnız ekseni adlandırmak yetmezdi — rakam
 * olmadan kullanıcı öteki eksende de boş olup olmadığını bilemez.
 */
export function otekiEksen(eksen: AlimEkseni): AlimEkseni {
  return eksen === "kabul" ? "siparis" : "kabul";
}
