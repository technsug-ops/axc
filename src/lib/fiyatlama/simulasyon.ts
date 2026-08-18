import { karHesapla, type KarGirdisi } from "@/lib/kar";
import { dilimBul, type TarifeDilimi } from "@/lib/komisyon/tarife-okuyucu";

/**
 * ============================================================================
 *  FİYAT SİMÜLASYONU — "BİR DİLİM AŞAĞI İNSEM NE OLUR?"
 * ----------------------------------------------------------------------------
 *  Aşama 1'in çekirdeği. Trendyol'un mekanizması şu: **fiyatı düşürene
 *  komisyon indirimi.** Manuel Rondo'da 769,99'dan 769,98'e BİR KURUŞ inmek
 *  komisyonu %18'den %12,8'e düşürüyor — ciro başına 5,2 puan.
 *
 *  Soru tek cümle: _bir dilim aşağı inmenin komisyon kazancı, fiyat
 *  kaybını telafi ediyor mu?_ Melontik'in 18. slaydı bu hesabı yapıyor;
 *  aynı veri bizde de var.
 *
 *  ── SİMÜLASYON KAYIT DEĞİLDİR ───────────────────────────────────────────
 *  ⚠ Buradan çıkan hiçbir rakam veritabanına YAZILMAZ. `ChannelSku`daki
 *  oran kanalın BEYANIDIR (mimar kararı 18.08.2026) ve bu modül onu
 *  değiştirmez. Burada üretilen oran "fiyat şu olsaydı hangi dilime
 *  düşerdi" sorusunun cevabıdır — bir tahmin, bir kayıt değil.
 *
 *  ── NET HESABI KOPYALANMAZ ──────────────────────────────────────────────
 *  NET-1/NET-2 mevcut kâr motorundan (`karHesapla`) gelir. Kendi
 *  formülümüzü yazsaydık aynı kural sistemde İKİ yerde yaşardı ve biri
 *  değişince öteki sessizce ayrışırdı — bu projenin birinci dersi.
 *  Simülasyon yalnız GİRDİYİ değiştirir, hesabı değiştirmez.
 *
 *  ── EKSİK VERİ SESSİZ KALMAZ ────────────────────────────────────────────
 *  Dilim verisi olmayan üründe tek oranla hesaplanır ve bu **BEYAN
 *  EDİLİR**. Beyansız bir tahmin, dilim bilgisi varmış gibi okunur ve
 *  kullanıcı olmayan bir kesinliğe dayanarak fiyat değiştirir.
 * ============================================================================
 */

/** Simülasyonun dayandığı zeminle ilgili beyanlar — hepsi görünür olmalı. */
export type Beyan =
  | { tur: "DILIM_YOK" }
  | { tur: "PENCERE_BITTI"; bitis: Date }
  | { tur: "MALIYET_YOK" }
  | { tur: "ORAN_YOK" };

export type SimulasyonGirdisi = {
  /** Denenmek istenen KDV DAHİL birim fiyat. */
  hedefFiyat: number;
  adet: number;
  /** KDV DAHİL birim maliyet. Yoksa NET hesaplanamaz. */
  birimMaliyet: number | null;
  kdvOrani: number;
  paraBirimi: "TRY" | "EUR";

  /** Ürünün tarife dilimleri. Yoksa tek orana düşülür. */
  dilimler: TarifeDilimi[] | null;
  /** Tarifenin geçerlilik penceresi — bittiyse beyan edilir. */
  pencereBitis: Date | null;
  /** Dilim yoksa kullanılacak oran (`ChannelSku.commissionRate`). */
  tekOran: number | null;

  /** Kanal kuralları — kâr motoruna olduğu gibi geçer. */
  komisyonKdvOrani: number | null;
  siparisKesintileri: KarGirdisi["siparisKesintileri"];
  kargoTarifesi: number | null;

  /** "Bugün" İŞ saat diliminden gelir; pencere kıyası için. */
  bugun: Date;
};

export type SimulasyonSonucu = {
  hedefFiyat: number;
  ciro: number;
  /** Kullanılan komisyon oranı ve nereden geldiği. */
  komisyonOrani: number | null;
  oranKaynagi: "DILIM" | "TEK_ORAN" | "YOK";
  /** Fiyatın düştüğü dilim; dilim verisi yoksa null. */
  dilim: TarifeDilimi | null;
  net1: number | null;
  net2: number | null;
  /** Zeminle ilgili her şey burada — hiçbiri sessiz kalmaz. */
  beyanlar: Beyan[];
};

/**
 * Tek bir fiyat için simülasyon. SAF — veritabanına gitmez.
 */
export function simulasyonKur(girdi: SimulasyonGirdisi): SimulasyonSonucu {
  const beyanlar: Beyan[] = [];
  const ciro = girdi.hedefFiyat * girdi.adet;

  /**
   * ORAN ÇÖZÜMÜ — önce dilim, sonra tek oran.
   *
   * Dilim varsa fiyat hangi dilime düşüyorsa onun oranı geçerlidir;
   * simülasyonun bütün değeri bu adımda.
   */
  let dilim: TarifeDilimi | null = null;
  let oran: number | null = null;
  let kaynak: SimulasyonSonucu["oranKaynagi"] = "YOK";

  if (girdi.dilimler !== null && girdi.dilimler.length > 0) {
    dilim = dilimBul(girdi.dilimler, girdi.hedefFiyat);
    if (dilim !== null) {
      oran = dilim.oran;
      kaynak = "DILIM";
    }
    /**
     * ⚠ PENCERE BİTMİŞSE SİMÜLASYON YİNE YAPILIR AMA BEYAN EDİLİR.
     * Engellemek yanlış olurdu: eski tarife de bir fikir verir. Ama
     * "bu oranlar artık geçerli olmayabilir" demeden göstermek, kullanıcıya
     * bayat bir sayıyla fiyat değiştirtir.
     */
    if (girdi.pencereBitis !== null && girdi.pencereBitis < girdi.bugun) {
      beyanlar.push({ tur: "PENCERE_BITTI", bitis: girdi.pencereBitis });
    }
  } else {
    beyanlar.push({ tur: "DILIM_YOK" });
    if (girdi.tekOran !== null) {
      oran = girdi.tekOran;
      kaynak = "TEK_ORAN";
    }
  }

  if (oran === null) beyanlar.push({ tur: "ORAN_YOK" });
  if (girdi.birimMaliyet === null) beyanlar.push({ tur: "MALIYET_YOK" });

  /**
   * NET HESABI MEVCUT MOTORDAN. Maliyet ya da oran yoksa motor zaten
   * hesaplayamaz; uydurma bir sayı üretmektense null döneriz.
   */
  if (girdi.birimMaliyet === null || oran === null) {
    return {
      hedefFiyat: girdi.hedefFiyat,
      ciro,
      komisyonOrani: oran,
      oranKaynagi: kaynak,
      dilim,
      net1: null,
      net2: null,
      beyanlar,
    };
  }

  const sonuc = karHesapla({
    kalemler: [
      {
        satisTutari: ciro,
        satisParaBirimi: girdi.paraBirimi,
        maliyet: girdi.birimMaliyet * girdi.adet,
        maliyetParaBirimi: girdi.paraBirimi,
        kdvOrani: girdi.kdvOrani,
        komisyonOrani: oran,
      },
    ],
    komisyonKdvOrani: girdi.komisyonKdvOrani,
    siparisKesintileri: girdi.siparisKesintileri,
    kargoTarifesi: girdi.kargoTarifesi,
  });

  return {
    hedefFiyat: girdi.hedefFiyat,
    ciro,
    komisyonOrani: oran,
    oranKaynagi: kaynak,
    dilim,
    net1: sonuc.net1,
    net2: sonuc.net2,
    beyanlar,
  };
}

/**
 * BİR ALT DİLİME İNMEK İÇİN GEREKEN FİYAT.
 *
 * Asıl soruyu tek bakışta cevaplayan şey bu: kullanıcı fiyat denemeden
 * "769,98'e inersen %12,8" yazısını görmeli. Elle deneyerek bulması
 * beklenirse özellik kullanılmaz.
 *
 * Bir alt dilimin ÜST sınırı hedeftir — o fiyat, alt dilimin en yüksek
 * noktasıdır. Bir kuruş daha inmek gereksiz kayıptır.
 */
export function birAltDilim(
  dilimler: TarifeDilimi[],
  mevcutFiyat: number,
): {
  hedefFiyat: number;
  dilim: TarifeDilimi;
  /**
   * Kaç PUAN komisyon kazanılıyor. **Sıfır ya da eksi olabilir.**
   *
   * ⚠ CANLI ÖLÇÜM 19.08.2026: stoklu 30 üründen **8'inde** 1. ve 2.
   * dilimin oranı AYNI. O ürünlerde inmek komisyon kazandırmaz, yalnız
   * ciro kaybettirir — ve sebebi "kâr azaldı"dan farklıdır. Ekran ikisini
   * ayırabilsin diye kazanç puanı da dönüyor.
   */
  oranKazanci: number;
} | null {
  const simdiki = dilimBul(dilimler, mevcutFiyat);
  if (simdiki === null) return null;

  const alt = dilimler.find((d) => d.sira === simdiki.sira + 1);
  /** En ucuz dilimdeyse inecek yer yok. */
  if (alt === undefined) return null;
  /**
   * Alt dilimin üst sınırı yoksa hedef fiyat hesaplanamaz. Uçları açık
   * olan tek dilim EN UCUZ olandır ve ona zaten yukarıdaki satır bakıyor;
   * yine de uydurma bir fiyat üretmemek için kontrol duruyor.
   */
  if (alt.ustLimit === null) return null;

  return {
    hedefFiyat: alt.ustLimit,
    dilim: alt,
    oranKazanci: Math.round((simdiki.oran - alt.oran) * 100) / 100,
  };
}
