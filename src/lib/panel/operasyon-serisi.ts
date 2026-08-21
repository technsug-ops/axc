import {
  ayKaydir,
  gunDegeri,
  gunEkle,
  gunMetni,
  isTakvimGunu,
  type Pencere,
  type PencereTuru,
} from "@/lib/donem";

/**
 * ============================================================================
 *  GÜNLÜK OPERASYON SERİSİ — ALIM · SATIŞ · KARGO
 * ----------------------------------------------------------------------------
 *  Kullanıcı isteği 21.08.2026, iki gerekçeyle:
 *    1. _"Günlük operasyonlarım bu üç kalemden oluşuyor."_
 *    2. _"Alım KDV'si ile satış KDV'si arasındaki fark o ay ödeyeceğim
 *       vergiyi belli ediyor."_
 *
 *  ⚠⚠ İKİNCİ GEREKÇE İÇİN BU GRAFİK YETMEZ — VE EKRAN DA BUNU YAZAR.
 *
 *  Ödenecek KDV = (satış KDV'si) − (alış KDV'si). Bu grafik CİRO gösterir,
 *  KDV değil. İki tutarın farkı vergiyi VERMEZ çünkü KDV oranı ürüne göre
 *  değişir (%1 · %10 · %20; kategoriden gelir) ve aynı ciroda farklı oranlı
 *  ürünler bambaşka KDV üretir. Grafik günlük operasyonu gösterir; KDV için
 *  ayrı bir hesap gerekir.
 *
 *  ── ⚠ ÜÇ SAYININ BİRİMİ AYNI DEĞİL ──────────────────────────────────────
 *  ADET görünümünde: alım = ALIM KAYDI, satış = SATIŞ KAYDI, kargo =
 *  KARGOYA VERİLEN paket. Üçü de "kaç iş yaptım"ın cevabı ve panelin
 *  üstündeki kutularla AYNI ölçüt — ekranda iki farklı "satış adedi" olmasın.
 *
 *  ── ⚠ ÜÇ FARKLI TARİH EKSENİ ────────────────────────────────────────────
 *  Alım `purchasedAt`, satış satış tarihi, kargo `shippedAt` ile kovaya
 *  girer. Aynı gün olmak ZORUNDA DEĞİL: dün satılan bugün kargolanır. Tek
 *  eksene indirgemek 15.08.2026'da yaşanmış bir hatadır.
 * ============================================================================
 */

/**
 * KIRILIM — noktanın kaç günü topladığı.
 *
 * ⚠ NİYE SABİT "GÜN" DEĞİL (kullanıcı kararı 21.08.2026): 1 yıllık pencerede
 * 365 nokta çizilirse grafik okunmaz bir tarağa döner ve altındaki tablo
 * 365 satır olur. Uzun pencerede soru zaten "hangi gün" değil "hangi ay".
 */
export const KIRILIMLAR = ["GUN", "HAFTA", "AY"] as const;
export type Kirilim = (typeof KIRILIMLAR)[number];

/**
 * Pencere türüne göre kırılım — kullanıcının verdiği eşleme:
 *   Son 30 gün → gün · Bu ay → hafta · Son 3/6 ay ve 1 yıl → ay
 *
 * ⚠ ÖZEL ARALIK TÜRDEN ÇÖZÜLEMEZ, UZUNLUKTAN ÇÖZÜLÜR: "OZEL" bir gün de
 * olabilir üç yıl da. Gün sayısına bakılıyor ve eşikler yukarıdaki
 * eşlemeyle AYNI mantıkta: bir aya kadar gün, bir çeyreğe kadar hafta,
 * ötesi ay.
 */
export function kirilimSec(tur: PencereTuru, gunSayisi: number): Kirilim {
  switch (tur) {
    case "BUGUN":
    case "DUN":
    case "BU_HAFTA":
    case "SON_15_GUN":
    case "SON_30_GUN":
      return "GUN";
    case "BU_AY":
      return "HAFTA";
    case "SON_3_AY":
    case "SON_6_AY":
    case "SON_1_YIL":
      return "AY";
    default:
      return gunSayisi <= 31 ? "GUN" : gunSayisi <= 92 ? "HAFTA" : "AY";
  }
}

/** Serinin bir noktası. Kendi tarih aralığını TAŞIR — süzgeç bağlantısı için. */
export type OperasyonNoktasi = {
  /** Kova anahtarı — "2026-08-21" | "2026-W34" | "2026-08". */
  anahtar: string;
  /** Noktanın kapsadığı ilk gün (DAHİL) — süzgeç adresinin başlangıcı. */
  baslangic: Date;
  /** Noktanın kapsadığı son gün (DAHİL) — süzgeç adresinin bitişi. */
  sonGun: Date;
  alimAdet: number;
  alimTutar: number;
  satisAdet: number;
  satisCiro: number;
  kargoAdet: number;
  kargoCiro: number;
};

export type OperasyonGirdisi = {
  pencere: Pencere;
  kirilim: Kirilim;
  alimlar: { tarih: Date; tutar: number }[];
  satislar: { tarih: Date; gelir: number }[];
  /** Kargoya VERİLENLER — verilmemişler listede olmamalı. */
  kargolar: { tarih: Date; gelir: number }[];
};

/** Bir tarihin hangi kovaya düştüğü — kova anahtarı ve sınırları. */
function kova(tarih: Date, kirilim: Kirilim): { anahtar: string; baslangic: Date } {
  if (kirilim === "GUN") {
    const g = gunDegeri(isTakvimGunu(tarih));
    return { anahtar: gunMetni(g), baslangic: g };
  }
  if (kirilim === "HAFTA") {
    /**
     * ⚠ HAFTA PAZARTESİ BAŞLAR — Türkiye'de hafta böyle konuşulur ve
     * `pencereOlustur` da "BU_HAFTA"yı böyle kuruyor. İki yerde iki farklı
     * hafta tanımı olsaydı süzgeç ile grafik ayrışırdı.
     */
    const g = gunDegeri(isTakvimGunu(tarih));
    const pazartesiyeUzaklik = (g.getUTCDay() + 6) % 7;
    const bas = gunEkle(g, -pazartesiyeUzaklik);
    return { anahtar: `H${gunMetni(bas)}`, baslangic: bas };
  }
  const t = isTakvimGunu(tarih);
  const bas = gunDegeri({ yil: t.yil, ay: t.ay, gun: 1 });
  return { anahtar: `${t.yil}-${String(t.ay).padStart(2, "0")}`, baslangic: bas };
}

/** Kovanın bir sonrakine geçişi — kova genişliği kırılıma bağlı. */
function sonrakiKova(baslangic: Date, kirilim: Kirilim): Date {
  if (kirilim === "GUN") return gunEkle(baslangic, 1);
  if (kirilim === "HAFTA") return gunEkle(baslangic, 7);
  const t = isTakvimGunu(baslangic);
  const s = ayKaydir(t.yil, t.ay, 1);
  return gunDegeri({ yil: s.yil, ay: s.ay, gun: 1 });
}

/**
 * Pencereyi kırılıma göre kovalara böler ve her kovaya bir nokta üretir.
 *
 * ── AÇIK SIFIR ──────────────────────────────────────────────────────────
 * Hareketsiz kova ATLANMAZ. Atlansaydı grafikte iki kova yan yana çizilir
 * ve aradaki boşluk görünmezdi — "o hafta hiç iş yapmadım" bilgisi kaybolur.
 *
 * ⚠ İLK VE SON KOVA PENCEREYE KIRPILIR: "Bu ay" 1 Ağustos'ta başlıyorsa ilk
 * haftanın kovası 27 Temmuz'da başlasa bile noktanın `baslangic`ı 1 Ağustos
 * yazar. Yoksa noktaya tıklayınca pencere DIŞINA süzülmüş bir liste açılır
 * ve grafikteki sayı ile listenin sayısı tutmaz.
 */
export function operasyonSerisi(girdi: OperasyonGirdisi): OperasyonNoktasi[] {
  const noktalar: OperasyonNoktasi[] = [];
  const dizin = new Map<string, OperasyonNoktasi>();

  let imlec = kova(girdi.pencere.baslangic, girdi.kirilim).baslangic;
  while (imlec.getTime() < girdi.pencere.bitisHaric.getTime()) {
    const sonraki = sonrakiKova(imlec, girdi.kirilim);
    const { anahtar } = kova(imlec, girdi.kirilim);

    /** Pencereye kırpma — nokta pencerenin dışına taşmaz. */
    const bas =
      imlec.getTime() < girdi.pencere.baslangic.getTime()
        ? girdi.pencere.baslangic
        : imlec;
    const bitHaric =
      sonraki.getTime() > girdi.pencere.bitisHaric.getTime()
        ? girdi.pencere.bitisHaric
        : sonraki;

    const nokta: OperasyonNoktasi = {
      anahtar,
      baslangic: bas,
      sonGun: gunEkle(bitHaric, -1),
      alimAdet: 0,
      alimTutar: 0,
      satisAdet: 0,
      satisCiro: 0,
      kargoAdet: 0,
      kargoCiro: 0,
    };
    noktalar.push(nokta);
    dizin.set(anahtar, nokta);
    imlec = sonraki;
  }

  for (const a of girdi.alimlar) {
    const n = dizin.get(kova(a.tarih, girdi.kirilim).anahtar);
    if (!n) continue;
    n.alimAdet++;
    n.alimTutar += a.tutar;
  }
  for (const s of girdi.satislar) {
    const n = dizin.get(kova(s.tarih, girdi.kirilim).anahtar);
    if (!n) continue;
    n.satisAdet++;
    n.satisCiro += s.gelir;
  }
  for (const k of girdi.kargolar) {
    const n = dizin.get(kova(k.tarih, girdi.kirilim).anahtar);
    if (!n) continue;
    n.kargoAdet++;
    n.kargoCiro += k.gelir;
  }

  return noktalar;
}

/** Grafiğin iki görünümü — sekme adreste yaşar (İlke #13). */
export const OPERASYON_GORUNUMLERI = ["adet", "ciro"] as const;
export type OperasyonGorunumu = (typeof OPERASYON_GORUNUMLERI)[number];

export function gorunumCoz(deger: string | undefined): OperasyonGorunumu {
  return deger === "ciro" ? "ciro" : "adet";
}

/**
 * Seçili görünümün üç serisi.
 *
 * ⚠ ÜÇÜNCÜ SERİ GÖRÜNÜME GÖRE DEĞİŞİR (kullanıcı kararı 21.08.2026):
 *   adet → KARGO (kaç paket çıktı)
 *   ciro → ALIM−SATIŞ FARKI (kargo cirosu istenmedi: "ihtiyaç yok")
 *
 * Fark neden kargo yerine: ciro görünümünde sorulan soru "para hangi yöne
 * aktı". Kargo cirosu satış cirosunun gecikmiş kopyasıdır — aynı parayı
 * ikinci kez çizer ve grafiği kalabalıklaştırır. Fark ise iki çizginin
 * arasındaki mesafeyi TEK ÇİZGİYE indirir ve göz onu zaten arıyor.
 */
export function serileriKur(
  noktalar: OperasyonNoktasi[],
  gorunum: OperasyonGorunumu,
): { alim: number[]; satis: number[]; ucuncu: number[] } {
  return gorunum === "ciro"
    ? {
        alim: noktalar.map((n) => n.alimTutar),
        satis: noktalar.map((n) => n.satisCiro),
        /** ⚠ SATIŞ − ALIM: pozitif "içeri para girdi" demek. */
        ucuncu: noktalar.map((n) => n.satisCiro - n.alimTutar),
      }
    : {
        alim: noktalar.map((n) => n.alimAdet),
        satis: noktalar.map((n) => n.satisAdet),
        ucuncu: noktalar.map((n) => n.kargoAdet),
      };
}

/** Dönemin toplamı — grafiğin altında yazar (İlke #15). */
export function operasyonToplami(noktalar: OperasyonNoktasi[]): {
  alimAdet: number;
  alimTutar: number;
  satisAdet: number;
  satisCiro: number;
  kargoAdet: number;
  /** Üç kalemin toplam işlem sayısı — "bu dönemde kaç iş yaptım". */
  islemAdedi: number;
  /** SATIŞ − ALIM. Pozitif: içeri para girdi. */
  fark: number;
} {
  const t = noktalar.reduce(
    (a, n) => ({
      alimAdet: a.alimAdet + n.alimAdet,
      alimTutar: a.alimTutar + n.alimTutar,
      satisAdet: a.satisAdet + n.satisAdet,
      satisCiro: a.satisCiro + n.satisCiro,
      kargoAdet: a.kargoAdet + n.kargoAdet,
    }),
    { alimAdet: 0, alimTutar: 0, satisAdet: 0, satisCiro: 0, kargoAdet: 0 },
  );
  return {
    ...t,
    islemAdedi: t.alimAdet + t.satisAdet + t.kargoAdet,
    fark: t.satisCiro - t.alimTutar,
  };
}

/**
 * TABLO TAVANI — grafiğin altındaki tablo en fazla bu kadar satır gösterir.
 *
 * ⚠ Kullanıcı kararı 21.08.2026: _"en fazla 15 günlük tablo aşağı açılsın,
 * daha fazlası için ayrı sayfa seçeneği çıksın"_. Gerekçe anayasada zaten
 * var (İlke #13): satır sayısı veriyle BÜYÜYEN hiçbir şey özet ekranına
 * konmaz. 365 satırlık bir tablo paneli özet olmaktan çıkarır.
 */
export const TABLO_TAVANI = 15;

/**
 * Tabloda gösterilecek noktalar — SONDAN, yani en YENİ.
 *
 * ⚠ BAŞTAN DEĞİL SONDAN kırpılıyor: kırpılan bilgi eski taraf olmalı.
 * Baştan alsaydık kullanıcı dünü göremezdi ve tablo işe yaramazdı.
 */
export function tabloNoktalari(
  noktalar: OperasyonNoktasi[],
): { gosterilen: OperasyonNoktasi[]; gizlenen: number } {
  if (noktalar.length <= TABLO_TAVANI) {
    return { gosterilen: noktalar, gizlenen: 0 };
  }
  return {
    gosterilen: noktalar.slice(-TABLO_TAVANI),
    gizlenen: noktalar.length - TABLO_TAVANI,
  };
}
