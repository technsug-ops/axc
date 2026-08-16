import {
  kurusaYuvarla,
  kurusAsiyorMu,
  kurusSifirMi,
} from "@/lib/para";

/** Geriye dönük yayın — mevcut çağıranlar bu modülden alıyor. */
export { kurusaYuvarla };

/**
 * ============================================================================
 *  KART EKSTRE ÖDEMESİ — SAF KURALLAR
 * ----------------------------------------------------------------------------
 *  Veritabanına dokunmaz, ekran bilmez: düz sayı alır, düz sayı döndürür.
 *  Kural burada olduğu için `kart-odeme:dogrula` onu ÇAĞIRARAK sınayabiliyor;
 *  transaction'ın ortasına gömülseydi hiçbir test göremezdi (bkz. bu
 *  oturumda `varyantAra` boşluğu).
 *
 *  ── İKİ RAKAM AYRI, TOPLANMAZ, KARIŞMAZ ─────────────────────────────────
 *  ANA BORÇ ÖDEMESİ KÂRI ETKİLEMEZ — o maliyet alım kaydedilirken zaten
 *  sayıldı. İkinci kez düşülürse kâr iki kat eksik çıkar ve kimse fark
 *  etmez, çünkü rakam "makul" görünür.
 *  FAİZ EK GİDERDİR — dönemin kârını düşürür.
 *  `odemeOnizlemesi` bu ayrımı AÇIKÇA döndürüyor (`karaEtki`), test de onu
 *  sınıyor.
 * ============================================================================
 */

/**
 * FAİZ GİRİŞİ — İKİ YOL, AYRIK BİRLEŞİM.
 *
 * Ayrık birleşim (discriminated union) bilerek: "hem oran hem tutar
 * girilirse hangisi kazanır" sorusunu doğurmuyoruz. Kullanıcı yolu SEÇER,
 * ekran da seçileni gösterir. Sessiz öncelik kuralı, altı ay sonra kimsenin
 * hatırlamadığı bir davranış olurdu.
 */
export type FaizGirdisi =
  | { yol: "yok" }
  | {
      yol: "hesapla";
      /** Faizin işlediği tutar — gecikmiş ana para. */
      matrah: number;
      /** GÜNLÜK oran, yüzde olarak (%3 → 3). */
      oran: number;
      gun: number;
    }
  | { yol: "elle"; tutar: number };

/**
 * Faiz tutarı.
 *
 * SİSTEM ORANI ÜRETMEZ, YALNIZ ÇARPAR. Oran bankaya, karta ve güne göre
 * değişir; uydurulursa panel yanlış olur. Sözleşmedeki kilit örnek:
 * 1.000 × %3 × 2 gün = 60.
 *
 * EKSİ GİRDİ SIFIRA ÇEKİLMEZ, OLDUĞU GİBİ HESAPLANIR — ama `gecerliMi`
 * onu reddeder. Sessizce düzeltmek, kullanıcının yazdığını değiştirmektir.
 */
export function faizTutari(girdi: FaizGirdisi): number {
  switch (girdi.yol) {
    case "yok":
      return 0;
    case "elle":
      return girdi.tutar;
    case "hesapla":
      return (girdi.matrah * girdi.oran * girdi.gun) / 100;
  }
}

/** Faiz girdisi ekrana basılmadan önce geçerli mi. */
export function faizGecerliMi(girdi: FaizGirdisi): boolean {
  if (girdi.yol === "yok") return true;
  if (girdi.yol === "elle") return Number.isFinite(girdi.tutar) && girdi.tutar >= 0;
  return (
    Number.isFinite(girdi.matrah) &&
    Number.isFinite(girdi.oran) &&
    Number.isInteger(girdi.gun) &&
    girdi.matrah >= 0 &&
    girdi.oran >= 0 &&
    girdi.gun >= 0
  );
}

/**
 * KALAN — TÜRETİLİR, SAKLANMAZ.
 *
 * Saklansaydı iki rakam birbirinden sapabilir ve ekran "borç 1.000,
 * ödenen 400, kalan 700" gibi imkânsız bir şey yazabilirdi.
 *
 * EKSİ KALAN KIRPILMAZ: fazla ödeme gerçek bir olaydır (banka fazla çekti,
 * kullanıcı yuvarladı). Sıfıra çekmek o parayı ekrandan silmek olurdu.
 */
export function kalanHesapla(ekstreBorcu: number, odenenAnaBorc: number): number {
  return ekstreBorcu - odenenAnaBorc;
}

/**
 * O DÖNEME DAHA ÖNCE NE ÖDENDİ.
 *
 * TERS KAYIT AYNI TUTARI TERS İŞARETLE TAŞIR (stok defterindeki ters
 * işaretli ADJUSTMENT ile aynı ilke), bu yüzden düz toplam net sonucu
 * verir. `isReversal` yalnız EKRAN etiketi; hesaba girmez. Filtreyle
 * ayıklamaya kalksaydık, ters kaydı unutmak sessiz bir çift sayım olurdu.
 */
export function oncekiOdenen(
  kayitlar: { odenenAnaBorc: number }[],
): number {
  return kayitlar.reduce((t, k) => t + k.odenenAnaBorc, 0);
}

export type MukerrerUyarisi = {
  /** Ekranda uyarı çıkacak mı. */
  uyar: boolean;
  /**
   * EKSTRE HENÜZ KESİLMEMİŞ — kesim tarihi gelecekte.
   *
   * En üst seviye uyarıdır: "zaten kapalı"dan da önce gelir, çünkü burada
   * ödenen şey henüz var olmayan bir borçtur.
   */
  kesilmemis: boolean;
  /** Bu döneme daha önce ödenmiş net tutar. */
  oncekiToplam: number;
  /** Önceki ödemelerden sonra kalan borç. */
  kalanBorc: number;
  /**
   * Yeni ödeme bu kalanı AŞIYOR mu. Aşmak yasak değil (banka fazla
   * çekebilir) ama kaza ihtimali yüksektir; uyarı bunu söyler.
   */
  asiyorMu: boolean;
  /**
   * EKSTRE ZATEN KAPALI MI — önceki ödemeler borcu bitirmiş.
   *
   * 16.08.2026 canlı bulgusu: kullanıcı aynı ekstreye iki kez TAM ödeme
   * girebildi. Uyarı bayrağı doğru dönüyordu ama tek bir seviyesi vardı;
   * "biraz daha ödeme yapıyorsun" ile "bu ekstre zaten kapalı" aynı tonda
   * görünüyordu. Kısmi ödeme MEŞRU, mükerrer tam ödeme KAZA — ikisi ayrı
   * seviyede söylenmeli.
   */
  zatenKapali: boolean;
};

/**
 * MÜKERRER ÖDEME KORUMASI — DB KISITI DEĞİL, ÖNİZLEME (mimar kararı).
 *
 * `@@unique([cardId, donem])` KONULMADI: kısmi ödeme ve ters kayıt aynı
 * döneme düşer, kısıt meşru işi engellerdi. Kaza ise kaydetmeden önce
 * yakalanır — "bu ekstreye daha önce ₺X ödenmiş, kalan ₺Y, yine de ekle?".
 *
 * KISMİ ÖDEME MEŞRUDUR: uyarı çıkar ama yol kapanmaz. Uyarı bir ONAY
 * kapısıdır, bir yasak değil.
 */
export function mukerrerUyarisi(girdi: {
  ekstreBorcu: number;
  /** Bu kart+dönem için mevcut kayıtlar (ters kayıtlar dahil). */
  mevcutKayitlar: { odenenAnaBorc: number }[];
  /** Şimdi eklenmek istenen ödeme. */
  yeniOdeme: number;
  /**
   * EKSTRE KESİLDİ Mİ — hesap kesim tarihi geçti mi.
   *
   * ⚠ 16.08.2026 canlı bulgusu, ₺163.782,83'lük kaza. Kullanıcı geçmiş
   * ekstreleri kapatırken HENÜZ KESİLMEMİŞ ekstrelere de ödeme kaydetti:
   * sekiz kartta, aylar sonrasına ait ekstreler "ödendi" oldu. Ekran bunu
   * hiç sorgulamadı — her ekstrenin altında aynı "Ödendi işaretle" düğmesi
   * vardı ve gelecek bir ekstre ile geçmiş bir ekstre birbirinden
   * ayırt edilemiyordu.
   *
   * Kesilmemiş ekstreye ödeme YASAK değildir (banka erken çekebilir, kart
   * kapatılıyor olabilir) ama olağan iş değildir; kaza ihtimali yüksektir.
   * Bu yüzden engel değil, UYARI + onay kapısı.
   *
   * Varsayılanı `true`: bilgi verilmemişse eski davranış korunur, sessizce
   * uyarı üretilmez.
   */
  kesilmisMi?: boolean;
}): MukerrerUyarisi {
  const oncekiToplam = oncekiOdenen(girdi.mevcutKayitlar);
  const kalanBorc = girdi.ekstreBorcu - oncekiToplam;
  const kesilmemis = girdi.kesilmisMi === false;
  return {
    kesilmemis,
    /**
     * Daha önce HİÇ ödeme yoksa uyarı yok — ilk ödeme sıradan bir iştir.
     * Ama ekstre henüz kesilmemişse ilk ödeme de sıradan DEĞİLDİR.
     */
    uyar: girdi.mevcutKayitlar.length > 0 || kesilmemis,
    oncekiToplam,
    kalanBorc,
    /**
     * KURUŞ DÜZEYİNDE karşılaştırılır. Ham `>` ile 1e-13'lük bir artık
     * "aşıyor" saydırıyordu: kullanıcı ₺7.137,87 girdiğinde ekran
     * "kalan yalnızca ₺7.137,87, aşıyorsun" diyordu (16.08.2026).
     */
    asiyorMu: kurusAsiyorMu(girdi.yeniOdeme, kalanBorc),
    // Borç bitmişken yeni ödeme: ekstre zaten kapalı.
    zatenKapali:
      girdi.mevcutKayitlar.length > 0 && kurusSifirMi(kalanBorc),
  };
}

export type OdemeOnizlemesi = {
  ekstreBorcu: number;
  /** Bu ekstreye DAHA ÖNCE ödenmiş net tutar. */
  oncekiToplam: number;
  odenenAnaBorc: number;
  /**
   * BU ÖDEMEDEN SONRA KALAN — önceki ödemeler DAHİL.
   *
   * ⚠ 16.08.2026 düzeltmesi. Önce yalnız `ekstreBorcu − buÖdeme`ydi, yani
   * önceki ödemeleri SAYMIYORDU. Ekranda çelişki doğuyordu: üstteki not
   * "kalan borç ₺0,00" derken hemen altındaki kutu "Kalan ₺1.199,66"
   * yazıyordu. Aynı kelime, iki farklı hesap — hangisine inanacağını
   * kullanıcı bilemez.
   */
  kalan: number;
  faiz: number;
  /** Faiz için gider kaydı doğacak mı. Sıfır faizde gider YAZILMAZ. */
  giderYazilacakMi: boolean;
  /**
   * BU ÖDEMENİN DÖNEM KÂRINA ETKİSİ — YALNIZ FAİZ KADAR, EKSİ.
   * Ana borç burada YOKTUR; maliyet alımda sayıldı.
   */
  karaEtki: number;
  mukerrer: MukerrerUyarisi;
};

/**
 * PREVIEW-BEFORE-WRITE — kaydetmeden önce ne olacağının tam dökümü.
 *
 * Ekran bu nesneyi olduğu gibi basar; ekranda ikinci bir hesap YAPILMAZ.
 * Yapılsaydı önizleme ile kayıt birbirinden sapabilir ve kullanıcı gördüğü
 * rakamdan başkasını kaydetmiş olurdu.
 */
export function odemeOnizlemesi(girdi: {
  ekstreBorcu: number;
  odenenAnaBorc: number;
  faiz: FaizGirdisi;
  mevcutKayitlar: { odenenAnaBorc: number }[];
  /** Ekstre kesildi mi; verilmezse uyarı üretilmez (eski davranış). */
  kesilmisMi?: boolean;
}): OdemeOnizlemesi {
  const faiz = faizTutari(girdi.faiz);
  const onceki = oncekiOdenen(girdi.mevcutKayitlar);
  return {
    ekstreBorcu: girdi.ekstreBorcu,
    oncekiToplam: onceki,
    odenenAnaBorc: girdi.odenenAnaBorc,
    /**
     * Önceki ödemeler DAHİL: ekranda tek bir "kalan" kavramı olsun.
     *
     * SUNUM SINIRI olduğu için kuruşa yuvarlanır. Yuvarlanmadığında ekranda
     * "−₺0,00" görünüyordu (16.08.2026): tam ödemede kalan −9e-13 çıkıyor,
     * biçimlendirici eksi işaretini koruyup sıfıra yuvarlıyordu. Kullanıcı
     * için "eksi sıfır" diye bir tutar yoktur.
     */
    kalan: kurusaYuvarla(
      kalanHesapla(girdi.ekstreBorcu, onceki + girdi.odenenAnaBorc),
    ),
    faiz,
    giderYazilacakMi: faiz > 0,
    // ⚠ ANA BORÇ BURAYA GİRMEZ. Girerse kâr iki kez düşer.
    karaEtki: -faiz,
    mukerrer: mukerrerUyarisi({
      ekstreBorcu: girdi.ekstreBorcu,
      mevcutKayitlar: girdi.mevcutKayitlar,
      yeniOdeme: girdi.odenenAnaBorc,
      kesilmisMi: girdi.kesilmisMi,
    }),
  };
}

/**
 * TERS KAYIT — düzeltmenin TEK yolu.
 *
 * Silme yok. Yanlış kayıt, aynı tutarların ters işaretlisiyle nötrlenir ve
 * ikisi de defterde kalır (StockMovement ilkesi). Faiz de terslenir: yanlış
 * kaydın gideri de geri alınmalı, yoksa kâr kalıcı olarak eksik kalır.
 */
export function tersKayit(asil: {
  ekstreBorcu: number;
  odenenAnaBorc: number;
  faizTutar: number;
}): { ekstreBorcu: number; odenenAnaBorc: number; faizTutar: number; isReversal: true } {
  return {
    // Ekstre borcu SNAPSHOT'tır; ters kayıtta da aynı snapshot taşınır ki
    // "hangi borç üzerinden ters alındı" görülebilsin.
    ekstreBorcu: asil.ekstreBorcu,
    odenenAnaBorc: -asil.odenenAnaBorc,
    faizTutar: -asil.faizTutar,
    isReversal: true,
  };
}

