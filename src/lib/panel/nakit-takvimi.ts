import { gunEkle, gunMetni } from "@/lib/donem";

/**
 * ============================================================================
 *  NAKİT TAKVİMİ — SAF MANTIK
 * ----------------------------------------------------------------------------
 *  SORU: "önümüzdeki iki hafta ne zaman sıkışacağım?"
 *
 *  Cevap iki taraftan gelir ve ikisi de ZATEN VAR olan motorlardan okunur —
 *  bu dosya ikinci bir motor AÇMAZ, yalnız iki akışı tek takvimde birleştirir:
 *    ÇIKACAK  ← `lib/kart-borcu.ts` (ekstre son ödeme günü + tutarı)
 *    GİRECEK  ← `lib/hakedis/eslestir.ts` (beklenen vade + NET-1 + maliyet)
 *
 *  ÜÇ KURAL, ÜÇÜ DE MİMAR KARARI (14.08.2026):
 *
 *  1. TEK PARA BİRİMİ: TRY. Kur çevrilmez, EUR satır takvime GİRMEZ —
 *     girseydi TL toplamına karışır ve rakam yalan olurdu. EUR'lu satır
 *     `disaridaKalanlar`a düşer ve ekranda ayrıca sayılır. Mimari EUR'ya
 *     hazır (satır para birimi taşıyor) ama bugün EUR mantığı yok.
 *
 *  2. VADESİ BİLİNMEYEN SATIR TAKVİME GİRMEZ ve TOPLAMA KATILMAZ.
 *     "Sıfır varsayma" ilkesinin takvimdeki karşılığı: kesim günü tanımsız
 *     bir kart ya da vadesi bilinmeyen bir satış, sıfır TL borç DEĞİLDİR.
 *     Ayrı listede "?" ile durur; toplamı sessizce şişirmez/eksiltmez.
 *
 *  3. GECİKMİŞLER TAKVİMDE KALIR VE TOPLAMA GİRER. Vadesi geçmiş ama
 *     ödenmemiş borç bugün hâlâ ödenecek paradır; pencerenin dışında
 *     bırakmak onu görünmez yapardı. En üstte ayrı başlıkta durur, ama
 *     toplam ondan haberdardır — bu yüzden `gecikmisCikacak` ayrıca
 *     dönüyor: ekran "toplamın şu kadarı gecikmiş" diyebilsin.
 *
 *  ÇİFT SAYIM: bu dosya çözmez, çağıran taraf çözer ("rapor kazanır" —
 *  rapordan kalemi olan satış tahmin listesine hiç girmez). Kural
 *  `panel:dogrula`da ayrıca kilitli.
 * ============================================================================
 */

export type TakvimYonu = "CIKACAK" | "GIRECEK";

export type TakvimKaynagi =
  /** Kredi kartı ekstresi — son ödeme günü. */
  | "KART"
  /** Pazaryeri raporundan gelen, ödenmemiş hakediş kalemi. Vade KESİN. */
  | "HAKEDIS_RAPOR"
  /** Rapora henüz düşmemiş satış; vade kanal ayarından TAHMİN. */
  | "HAKEDIS_TAHMIN";

export type TakvimSatiri = {
  yon: TakvimYonu;
  kaynak: TakvimKaynagi;
  /** Vade günü. `null` = BİLİNMİYOR (takvime girmez, "?" ile listelenir). */
  tarih: Date | null;
  tutar: number;
  paraBirimi: string;
  /** Ekranda yazan ad — kart etiketi ya da sipariş no. */
  baslik: string;
  /** Tıklanınca gidilecek yer; satır kaynağına ulaşmalı. */
  adres: string;
};

export type TakvimGunu = {
  /** YYYY-MM-DD — İstanbul günü. */
  gun: string;
  satirlar: TakvimSatiri[];
  cikacak: number;
  girecek: number;
  /**
   * O GÜNÜN SONUNDAKİ YÜRÜYEN BAKİYE — gecikmiş dahil, birikimli.
   *
   * ⚠ MUTLAK DEĞİL GÖRELİ. Sistem banka/kasa bakiyesi tutmuyor (ölçüldü
   * 24.08.2026: öyle bir model yok). Bu yüzden sayı "kasanızda şu kadar
   * olacak" DEMEZ; _"bugüne göre şu kadar aşağıda/yukarıda olacaksınız"_
   * der. Mutlak sanılırsa, parası olmayan biri kendini borçlu, borçlu olan
   * kendini rahat sanar.
   *
   * ⚠ GECİKMİŞLERDEN BAŞLAR. `netPozisyon` onları zaten içeriyor; başlangıcı
   * sıfır alsaydık son günün yürüyen bakiyesi `netPozisyon`u TUTMAZDI ve
   * aynı ekranda iki farklı rakam olurdu.
   */
  yuruyenBakiye: number;
};

export type NakitTakvimi = {
  /** Vadesi geçmiş, hâlâ kapanmamış satırlar. Toplamlara DAHİLDİR. */
  gecikmis: TakvimSatiri[];
  /** Pencere içindeki günler — boş günler de çizilebilsin diye hepsi var. */
  gunler: TakvimGunu[];
  cikacakToplam: number;
  girecekToplam: number;
  /** girecek − çıkacak. Eksiyse o pencerede açık var demektir. */
  netPozisyon: number;
  /**
   * EN DİP NOKTA — yürüyen bakiyenin en düşük olduğu gün.
   *
   * ⚠ NAKİT TAKVİMİNİN ASIL SORUSU BU. Dönem sonu neti pozitif olsa bile
   * arada bir çukura düşülebilir: para 20'sinde giriyor ama kart borcu
   * 12'sinde ödeniyorsa, 12'sinde para YOKTUR. Yalnız toplam gösteren bir
   * takvim o günü hiç söylemez.
   *
   * `null` = pencere boş (hiç gün yok).
   */
  enDip: { gun: string; bakiye: number } | null;
  gecikmisCikacak: number;
  gecikmisGirecek: number;
  /** Vadesi bilinmeyen satırlar — toplamlara GİRMEZ. */
  vadesizler: TakvimSatiri[];
  /**
   * Pencerenin dışında kaldığı ya da para birimi TRY olmadığı için
   * hesaba katılmayan satırlar. Sessizce yutulmasınlar diye dönüyor.
   */
  disaridaKalanlar: TakvimSatiri[];
};

export const TAKVIM_PENCERELERI = [14, 30] as const;
export type TakvimPenceresi = (typeof TAKVIM_PENCERELERI)[number];

/** Takvimin konuştuğu tek para birimi. EUR için bkz. büyüme paketi. */
export const TAKVIM_PARA_BIRIMI = "TRY";

export function nakitTakvimiKur(girdi: {
  satirlar: TakvimSatiri[];
  /** İş takvimindeki bugün (Europe/Istanbul) — dışarıdan verilir. */
  bugun: Date;
  pencereGun: TakvimPenceresi;
}): NakitTakvimi {
  const { satirlar, bugun, pencereGun } = girdi;

  const bugunMetni = gunMetni(bugun);
  // Pencere YARI AÇIK: bugün dahil, bugün + pencereGun hariç.
  const bitisHaricMetni = gunMetni(gunEkle(bugun, pencereGun));

  const gecikmis: TakvimSatiri[] = [];
  const vadesizler: TakvimSatiri[] = [];
  const disaridaKalanlar: TakvimSatiri[] = [];
  /** YYYY-MM-DD → satırlar. */
  const gunHaritasi = new Map<string, TakvimSatiri[]>();

  for (const s of satirlar) {
    // KUR ÇEVRİLMEZ: başka para birimi TL toplamına karışamaz.
    if (s.paraBirimi !== TAKVIM_PARA_BIRIMI) {
      disaridaKalanlar.push(s);
      continue;
    }
    if (s.tarih === null) {
      vadesizler.push(s);
      continue;
    }

    const gun = gunMetni(s.tarih);
    if (gun < bugunMetni) {
      gecikmis.push(s);
      continue;
    }
    if (gun >= bitisHaricMetni) {
      disaridaKalanlar.push(s);
      continue;
    }

    const liste = gunHaritasi.get(gun) ?? [];
    liste.push(s);
    gunHaritasi.set(gun, liste);
  }

  /**
   * BOŞ GÜNLER DE ÜRETİLİR. Ekran "o gün hiçbir şey yok"u gösterebilmeli;
   * yalnız dolu günleri döndürmek, aradaki boşluğu görünmez yapardı ve
   * "14 gün" iddiası ekranda karşılıksız kalırdı.
   */
  const gunler: TakvimGunu[] = [];
  for (let i = 0; i < pencereGun; i++) {
    const gun = gunMetni(gunEkle(bugun, i));
    const gunSatirlari = gunHaritasi.get(gun) ?? [];
    gunler.push({
      gun,
      satirlar: gunSatirlari,
      cikacak: toplam(gunSatirlari, "CIKACAK"),
      girecek: toplam(gunSatirlari, "GIRECEK"),
      /* Aşağıdaki döngüde dolduruluyor — gecikmiş bakiyesinden başlaması
         gerektiği için burada hesaplanamaz. */
      yuruyenBakiye: 0,
    });
  }

  const gecikmisCikacak = toplam(gecikmis, "CIKACAK");
  const gecikmisGirecek = toplam(gecikmis, "GIRECEK");

  /**
   * YÜRÜYEN BAKİYE — gecikmiş bakiyesinden başlar, gün gün birikir.
   *
   * ⚠ SON GÜNÜN BAKİYESİ `netPozisyon`A EŞİT OLMAK ZORUNDA. İkisi aynı
   * ekranda yan yana duruyor; ayrışırlarsa kullanıcı hangisine güveneceğini
   * bilemez. Bekçi bu eşitliği kuruşuna sabitliyor.
   */
  let yuruyen = gecikmisGirecek - gecikmisCikacak;
  let enDip: { gun: string; bakiye: number } | null = null;
  for (const g of gunler) {
    yuruyen += g.girecek - g.cikacak;
    g.yuruyenBakiye = yuruyen;
    /* İLK en düşük gün tutulur: aynı dip iki gün sürerse ERKEN olanı uyarır. */
    if (enDip === null || yuruyen < enDip.bakiye) {
      enDip = { gun: g.gun, bakiye: yuruyen };
    }
  }
  const pencereCikacak = gunler.reduce((t, g) => t + g.cikacak, 0);
  const pencereGirecek = gunler.reduce((t, g) => t + g.girecek, 0);

  const cikacakToplam = pencereCikacak + gecikmisCikacak;
  const girecekToplam = pencereGirecek + gecikmisGirecek;

  return {
    gecikmis,
    gunler,
    cikacakToplam,
    girecekToplam,
    netPozisyon: girecekToplam - cikacakToplam,
    enDip,
    gecikmisCikacak,
    gecikmisGirecek,
    vadesizler,
    disaridaKalanlar,
  };
}

function toplam(satirlar: TakvimSatiri[], yon: TakvimYonu): number {
  return satirlar
    .filter((s) => s.yon === yon)
    .reduce((t, s) => t + s.tutar, 0);
}
