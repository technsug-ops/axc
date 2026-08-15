import { gunDegeri, isTakvimGunu, type Pencere } from "@/lib/donem";

/**
 * ============================================================================
 *  DÖNEM KARŞILAŞTIRMASI — "GEÇEN SENE BU DÖNEM NASILDIM"
 * ----------------------------------------------------------------------------
 *  Kullanıcı isteği 15.08.2026: "Geçen sene bu dönem, 3 ay öncesine göre
 *  nasılım gibi karşılaştırmalar yapmak istiyorum. Bu karşılaştırmaları hem
 *  sayı hem de oranlarla ifade etmek istiyorum."
 *
 *  ── KIYAS PENCERESİ AY KAYDIRMASIYLA KURULUR ────────────────────────────
 *  Alternatif "aynı uzunlukta hemen önceki aralık" idi ve YANLIŞ olurdu:
 *  ayın 15'indeyken "bu ay" (1–15 Ağu) ile kıyaslanacak aralık 17–31 Tem
 *  çıkardı — kimsenin kafasındaki karşılaştırma bu değil. Ay kaydırması
 *  1–15 Tem verir: aynı takvim konumu, aynı gün sayısı.
 *
 *  ── KISMİ DÖNEM TUZAĞI (ölçüldü, ekranda yazılı) ────────────────────────
 *  Rapor ekranı DÖNEM GİDERLERİNİ de düşüyor ve gider yığılmalıdır (kira,
 *  muhasebe, abonelik ayda bir düşer). Ayın 15'indeyken ciro yarım ay,
 *  gider tam ay olsaydı "gerçek net" yapay olarak kötü görünür ve rozet
 *  ▼%60 yazardı — hiçbir şey kötüye gitmemişken.
 *
 *  Ay kaydırması bu tuzağı BÜYÜK ÖLÇÜDE kapatır çünkü iki pencere de aynı
 *  şekilde kısmidir (1–15 Ağu ↔ 1–15 Tem). Ama GİDERİN AYIN HANGİ GÜNÜNE
 *  düştüğü hâlâ oynatabilir; bu yüzden kıyaslanan aralık ekranda YAZILI
 *  durur ve gider satırının kendi notu vardır. Sessiz varsayım bırakmıyoruz.
 *
 *  ── İADE UYARISI ────────────────────────────────────────────────────────
 *  Geçen ayın malı bu ay iade edilirse etkisi BU ayın hanesine yazılır.
 *  Karşılaştırma bunu "performans düşüşü" gibi gösterebilir. Rakam yanlış
 *  değil, OKUMASI tuzaklı — ekrandaki not bunu söyler.
 * ============================================================================
 */

/** Seçilebilir kıyas tabanları. Değer = kaç ay geriye kaydırılacağı. */
export const KIYAS_TURLERI = {
  onceki: 1,
  ucAy: 3,
  gecenYil: 12,
} as const;

export type KiyasTuru = keyof typeof KIYAS_TURLERI;

export const KIYAS_ANAHTARLARI = Object.keys(KIYAS_TURLERI) as KiyasTuru[];

/** Adres parametresini tanır; tanımadığını sessizce varsayılana düşürmez. */
export function kiyasCoz(deger: string | undefined): KiyasTuru | null {
  if (!deger) return null;
  return (KIYAS_ANAHTARLARI as string[]).includes(deger)
    ? (deger as KiyasTuru)
    : null;
}

/**
 * Bir tarihi N ay geriye kaydırır.
 *
 * AYIN SONU KIRPILIR: 31 Mart'tan 1 ay geri 31 Şubat olmaz. Şubat'ın son
 * gününe düşer. Kırpma SESSİZ DEĞİL — çağıran, kıyas aralığını ekranda
 * yazdığı için kullanıcı hangi aralıkla kıyaslandığını görür.
 */
export function ayGeriKaydir(tarih: Date, ay: number): Date {
  const g = isTakvimGunu(tarih);
  const toplamAy = g.yil * 12 + (g.ay - 1) - ay;
  const yeniYil = Math.floor(toplamAy / 12);
  const yeniAy = (toplamAy % 12) + 1;
  // Hedef ayın son günü: bir sonraki ayın 0'ıncı günü.
  const sonGun = new Date(Date.UTC(yeniYil, yeniAy, 0)).getUTCDate();
  return gunDegeri({ yil: yeniYil, ay: yeniAy, gun: Math.min(g.gun, sonGun) });
}

/**
 * Kıyas penceresi — seçili pencerenin N ay geriye kaydırılmış hâli.
 *
 * `bitisHaric` DOĞRUDAN kaydırılmaz, `sonGun` kaydırılıp bir gün eklenir.
 * Doğrudan kaydırılsaydı ayın 1'i olan bir üst sınır bir önceki ayın 1'ine
 * düşer ve pencere bir gün kısalırdı — sessiz bir kayıp.
 */
export function kiyasPenceresi(pencere: Pencere, tur: KiyasTuru): Pencere {
  const ay = KIYAS_TURLERI[tur];
  const baslangic = ayGeriKaydir(pencere.baslangic, ay);
  const sonGun = ayGeriKaydir(pencere.sonGun, ay);
  return {
    tur: pencere.tur,
    baslangic,
    sonGun,
    bitisHaric: new Date(sonGun.getTime() + 24 * 60 * 60 * 1000),
  };
}

/**
 * Bir ölçünün iki dönem arasındaki değişimi.
 *
 * ÜÇ AYRI HÂL, ÜÇÜ DE FARKLI ŞEY SÖYLER (sessiz sıfır yasağı):
 *
 *   `veriYok`   → kıyas döneminde HİÇ KAYIT yok. Ekran "karşılaştırılamaz"
 *                 der. %0 yazmak "hiç değişmedi", boş bırakmak "sorun yok"
 *                 anlamına gelirdi; ikisi de yalan.
 *   `yuzde null`→ kayıt VAR ama değer sıfırdı. Fark SAYI olarak gösterilir,
 *                 yüzde gösterilmez: sıfırdan artışın yüzdesi yoktur.
 *   normal      → hem sayı hem yüzde.
 */
export type Degisim = {
  /** Şimdiki değer. */
  simdi: number;
  /** Kıyas dönemindeki değer. Kayıt yoksa `null`. */
  onceki: number | null;
  /** Fark — SAYI olarak. Kıyas döneminde kayıt yoksa `null`. */
  mutlak: number | null;
  /** Yüzde değişim. Kayıt yoksa ya da önceki değer 0 ise `null`. */
  yuzde: number | null;
  /**
   * Kıyas döneminde KAYIT VAR MI. `false` → ekran "karşılaştırılamaz" der.
   * "Değer sıfırdı" ile "hiç kayıt yoktu" AYNI ŞEY DEĞİLDİR; ilki bir
   * ölçüm, ikincisi ölçümün yokluğudur.
   */
  karsilastirilabilir: boolean;
};

/**
 * İki dönemi karşılaştırır. `onceki` `null` ise kıyas döneminde kayıt yok.
 *
 * YÜZDE PAYDASI MUTLAK DEĞER. Eksiden eksiye iyileşme doğru işaretlensin:
 * −100'den −50'ye geçmek +%50'dir (iyileşme), −%50 değil. Ham bölme
 * kullanılsaydı işaret ters dönerdi ve zarardan çıkan bir dönem "kötüleşti"
 * görünürdü — tam da bakılan rakamda.
 */
export function degisim(simdi: number, onceki: number | null): Degisim {
  if (onceki === null) {
    return {
      simdi,
      onceki: null,
      mutlak: null,
      yuzde: null,
      karsilastirilabilir: false,
    };
  }
  const mutlak = simdi - onceki;
  return {
    simdi,
    onceki,
    mutlak,
    yuzde: onceki === 0 ? null : (mutlak / Math.abs(onceki)) * 100,
    karsilastirilabilir: true,
  };
}

/**
 * Ciroya oranla kâr — kullanıcı isteği 15.08.2026: "ciroya oranla NET-1 ve
 * NET-2'yi görmek isterim."
 *
 * Payda BRÜT CİRO (KDV dâhil): paneldeki "satış fiyatına göre" oranıyla
 * AYNI tanım. İki ekran aynı kavramı farklı hesaplasaydı hangisinin doğru
 * olduğu sorulurdu.
 *
 * Ciro yoksa `null` — %0 yazmak "kâr yok" demektir, oysa doğru cevap
 * "hesaplanamıyor"dur.
 */
export function ciroyaOran(net: number, ciro: number): number | null {
  if (!Number.isFinite(net) || !Number.isFinite(ciro)) return null;
  if (ciro <= 0) return null;
  return (net / ciro) * 100;
}
