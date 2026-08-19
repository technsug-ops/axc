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

/**
 * ============================================================================
 *  YÖN HÜKMÜ — "NEREYE VARIYORUZ", SADECE "NE TARAFA" DEĞİL
 * ----------------------------------------------------------------------------
 *  ⚠ CANLI TESTTE YANILDI — mimar bulgusu 19.08.2026.
 *
 *  Yön satırı NET-2 zaten NEGATİFKEN de yeşil "ARTAR — inmek kazandırıyor"
 *  diyordu. Yeşil renk + "kazandırıyor" kelimesi **"kâra geçer" diye
 *  okunuyor**; oysa ürün hâlâ zararda, sadece daha az zararda.
 *
 *  Yön DOĞRUYDU, VARIŞ NOKTASI beyansızdı. _"Kaydedilen ≠ görünen"
 *  dersinin yön satırındaki hâli: fark rakamı kayıtta vardı, ne anlama
 *  geldiği ekranda yoktu._
 *
 *  Bu yüzden hüküm iki şeye birden bakar: FARKIN İŞARETİ ve SONUCUN
 *  İŞARETİ. Dört gerçek durum var ve dördü farklı karar gerektirir.
 * ============================================================================
 */

export type YonHukmu =
  /** Zarardan kâra geçiyor — en güçlü olumlu. */
  | { tur: "KARA_GECER"; fark: number; sonuc: number }
  /** Zaten kârdaydı, kâr artıyor. */
  | { tur: "KAR_ARTAR"; fark: number; sonuc: number }
  /** İyileşiyor ama HÂLÂ ZARARDA — yeşil OLMAZ, amber. */
  | { tur: "ZARAR_AZALIR"; fark: number; sonuc: number }
  /** Kârdayken zarara düşüyor — en güçlü olumsuz. */
  | { tur: "ZARARA_GECER"; fark: number; sonuc: number }
  /** Kötüleşiyor. */
  | { tur: "KOTULESIR"; fark: number; sonuc: number };

/**
 * Mevcut ve hedef NET-2'den yön hükmü. SAF.
 *
 * @param mevcut Bugünkü fiyatın NET-2'si.
 * @param hedef  Önerilen fiyatın NET-2'si.
 */
export function yonHukmu(mevcut: number, hedef: number): YonHukmu {
  const fark = Math.round((hedef - mevcut) * 100) / 100;

  if (fark > 0) {
    /**
     * ⚠ SIFIR KÂR SAYILMAZ. `hedef > 0` şartı katıdır: NET-2 tam sıfıra
     * gelmek "kâra geçmek" değildir, başabaştır. Yeşil demek, olmayan bir
     * kazancı müjdelemek olurdu.
     */
    if (hedef > 0) {
      return mevcut > 0
        ? { tur: "KAR_ARTAR", fark, sonuc: hedef }
        : { tur: "KARA_GECER", fark, sonuc: hedef };
    }
    /** İyileşme gerçek ama varış hâlâ zararda — AMBER. */
    return { tur: "ZARAR_AZALIR", fark, sonuc: hedef };
  }

  /** Kârdan zarara düşmek, "biraz azaldı"dan başka bir şeydir. */
  if (mevcut > 0 && hedef <= 0) {
    return { tur: "ZARARA_GECER", fark, sonuc: hedef };
  }
  return { tur: "KOTULESIR", fark, sonuc: hedef };
}

/** Hükmün rengi — ekranlar aynı eşlemeyi kullansın diye burada. */
export function yonRengi(h: YonHukmu): "olumlu" | "uyari" | "olumsuz" {
  switch (h.tur) {
    case "KARA_GECER":
    case "KAR_ARTAR":
      return "olumlu";
    /** İyileşiyor ama zararda — yeşil YANLIŞ okunur. */
    case "ZARAR_AZALIR":
      return "uyari";
    case "ZARARA_GECER":
    case "KOTULESIR":
      return "olumsuz";
    default: {
      const asla: never = h;
      return asla;
    }
  }
}

/**
 * ============================================================================
 *  BAŞABAŞ FİYATI — NET-2'nin SIFIRLANDIĞI NOKTA
 * ----------------------------------------------------------------------------
 *  Kullanıcı isteği 19.08.2026. Ekranda NET-1 ₺0,04 ve NET-2 −₺1,53
 *  görünüyordu: başabaş tam oradan geçiyordu ama araç söylemiyordu.
 *  "Kaç liraya satarsam zarar etmem" günlük bir soru ve deneme yanılmayla
 *  cevaplanıyordu.
 *
 *  ── FORMÜL YAZILMADI, MOTOR ARANDI ──────────────────────────────────────
 *  Başabaşı cebirle çözmek, NET-2 formülünü İKİNCİ KEZ yazmak olurdu:
 *  KDV mahsubu, stopaj matrahı, komisyon KDV'si, sabit sipariş
 *  kesintileri... Biri değişince başabaş sessizce yanlış olurdu.
 *  Bunun yerine **mevcut motor ikiye bölme ile aranıyor.** Yavaş ama
 *  tek kaynak; ~50 çağrı ve hepsi saf.
 *
 *  ── DİLİM İÇİNDE ARANIR ─────────────────────────────────────────────────
 *  ⚠ NET-2 fiyata göre TEKDÜZE ARTMAZ: dilim sınırında oran düştüğü için
 *  fiyat DÜŞERKEN kâr ARTABİLİR. Bu yüzden tek bir "başabaş fiyatı"
 *  aramak yanıltıcıdır — arama HER DİLİMİN KENDİ ARALIĞINDA yapılır.
 *  Dilim içinde ise ilişki tekdüzedir (oran sabit, katsayı pozitif) ve
 *  ikiye bölme güvenlidir.
 * ============================================================================
 */

export type BasabasSonucu = {
  /** Bu dilimde NET-2'yi sıfırlayan fiyat; dilim boyunca hep aynı işaretse null. */
  fiyat: number | null;
  dilimSira: number | null;
  /** Dilimin tamamında kâr mı, zarar mı — başabaş yoksa cevap bu. */
  dilimHep: "KAR" | "ZARAR" | null;
};

/** Kuruş hassasiyeti — dilim sınırları kuruşla oynanıyor. */
const KURUS = 0.01;

/**
 * Bir aralıkta NET-2'yi sıfırlayan fiyatı arar.
 *
 * Dilim içinde NET-2 fiyatla ARTAR (katsayı `1 − oran/100` pozitiftir),
 * bu yüzden kök tektir ve ikiye bölme kesin sonuç verir. Bulunan fiyat
 * kuruşa YUKARI yuvarlanır: aşağı yuvarlamak başabaşın bir kuruş altında
 * kalmak, yani zarar demek olurdu.
 */
function aralıktaAra(
  girdi: SimulasyonGirdisi,
  alt: number,
  ust: number,
): number | null {
  const net = (f: number) => simulasyonKur({ ...girdi, hedefFiyat: f }).net2;

  const altNet = net(alt);
  const ustNet = net(ust);
  if (altNet === null || ustNet === null) return null;
  /** İki uç da aynı işaretteyse bu aralıkta kök yoktur. */
  if (altNet > 0 || ustNet < 0) return null;

  let a = alt;
  let b = ust;
  /** 60 adım, kuruşun çok altına iner; sonsuz döngü riski yok. */
  for (let i = 0; i < 60 && b - a > KURUS / 10; i++) {
    const orta = (a + b) / 2;
    const d = net(orta);
    if (d === null) return null;
    if (d < 0) a = orta;
    else b = orta;
  }
  return Math.ceil(b * 100) / 100;
}

/**
 * Fiyatın bulunduğu dilim içindeki başabaş noktası.
 *
 * Dilim yoksa (tek oran) aralık maliyetten başlayıp makul bir üst sınıra
 * kadar taranır — üst sınır maliyetin on katı: hiçbir gerçek başabaş
 * oraya kadar gitmez, ama sonsuz aralık aranamaz.
 */
export function basabasFiyati(girdi: SimulasyonGirdisi): BasabasSonucu {
  const maliyet = girdi.birimMaliyet;
  if (maliyet === null) return { fiyat: null, dilimSira: null, dilimHep: null };

  const simdiki =
    girdi.dilimler === null ? null : dilimBul(girdi.dilimler, girdi.hedefFiyat);

  /** Aralık: dilimin sınırları, ya da dilim yoksa maliyet–10× maliyet. */
  const alt = simdiki?.altLimit ?? Math.max(KURUS, maliyet * 0.1);
  const ust = simdiki?.ustLimit ?? Math.max(maliyet * 10, girdi.hedefFiyat * 2);

  const fiyat = aralıktaAra(girdi, alt, ust);
  if (fiyat !== null) {
    return { fiyat, dilimSira: simdiki?.sira ?? null, dilimHep: null };
  }

  /**
   * KÖK YOKSA SESSİZ KALINMAZ: dilimin tamamı kâr mı zarar mı, o söylenir.
   * "Başabaş bulunamadı" demek kullanıcıyı boşlukta bırakırdı.
   */
  const ortaNet = simulasyonKur({ ...girdi, hedefFiyat: (alt + ust) / 2 }).net2;
  return {
    fiyat: null,
    dilimSira: simdiki?.sira ?? null,
    dilimHep: ortaNet === null ? null : ortaNet >= 0 ? "KAR" : "ZARAR",
  };
}


/**
 * ============================================================================
 *  SINIRA MESAFE — ÖNERİ NE KADAR BÜYÜK BİR İNDİRİM İSTİYOR?
 * ----------------------------------------------------------------------------
 *  Karar bana bırakılmıştı (mimar, 19.08.2026). Verdiğim karar ve gerekçesi:
 *
 *  ── ÖNERİ GİZLENMEZ, MESAFESİ YAZILIR ───────────────────────────────────
 *  Bir eşik koyup "çok uzaksa öneriyi hiç gösterme" demeyi REDDETTİM.
 *  Araç karar vermez, gösterir; gizlenen öneri sessiz kayıptır ve
 *  kullanıcı o dilimin var olduğunu hiç öğrenemez. Üstelik uzak sınır
 *  bazen doğru hamledir (stok eritme, sezon sonu).
 *
 *  Bunun yerine MESAFE HER ZAMAN YAZILIR: "₺769,98 (mevcut fiyatın %49
 *  altı)". Yüzde, soyut bir hedef fiyatı büyüklüğe çevirir; kullanıcı
 *  %5 ile %49'u bir bakışta ayırır.
 *
 *  ── "UZAK" EŞİĞİ ÖLÇÜLDÜ, YUVARLANMADI ──────────────────────────────────
 *  Canlı dağılım (19.08.2026, tarifesi ve satışı olan 18 ürün):
 *
 *      min %5,1 · ortanca %14,2 · p75 %20,6 · p90 %41,3 · max %45,6
 *
 *  ⚠ DAĞILIMDA AÇIK BİR BOŞLUK VAR: gövde %5–%20,6 arasında (18 üründen
 *  14'ü), sonra %30,6'ya sıçrıyor. Eşik o boşluğa konuldu — dağılımın
 *  içine düşen bir eşik her üründe yanardı ve uyarı okunmaz olurdu.
 *
 *  `%25` seçimi: p75'in (%20,6) üstünde, ilk sıçramanın (%30,6) altında.
 *  Bugün 18 üründen 4'ünde yanıyor ve dördü de gerçekten büyük kesintiler
 *  (%30,6 · %35,9 · %41,3 · %45,6).
 * ============================================================================
 */

/** Ölçümün kaynağı — eşik kaynağıyla anılır. */
export const MESAFE_OLCUMU = {
  tarih: "19.08.2026",
  ornek: 18,
  ortanca: 0.142,
  p75: 0.206,
  ilkSicrama: 0.306,
} as const;

/** Bu payın üstündeki indirimler "sınır uzak" diye işaretlenir. */
export const MESAFE_UZAK = 0.25;

export type MesafeHukmu = {
  /** Mevcut fiyata göre indirim payı (0,49 = %49 altı). */
  pay: number;
  /** Eşiğin üstünde mi — ekran ayrıca uyarır. */
  uzak: boolean;
};

/**
 * Öneriye inmek mevcut fiyatın yüzde kaçını feda ediyor?
 *
 * ⚠ PAYDA MEVCUT FİYAT. Hedefe bölmek matematiksel olarak da mümkündü ama
 * kullanıcı "fiyatımın yüzde kaçını veriyorum" diye düşünüyor; hedefe
 * göre oran aynı hamleyi daha büyük gösterir (1500→770 hedefe göre %95,
 * mevcuda göre %49) ve rakam abartılı okunurdu.
 */
export function mesafeHukmu(mevcut: number, hedef: number): MesafeHukmu | null {
  if (!(mevcut > 0) || !(hedef > 0) || hedef >= mevcut) return null;
  const pay = (mevcut - hedef) / mevcut;
  return { pay, uzak: pay > MESAFE_UZAK };
}
