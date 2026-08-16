import { kurusaYuvarla } from "@/lib/para";

import { ayKaydir, gunDegeri, type TakvimGunu } from "@/lib/donem";

/**
 * ============================================================================
 *  KART BORCU — SAF HESAP, TABLO YOK
 * ----------------------------------------------------------------------------
 *  Ekstre kaydı TUTULMAZ (kullanıcı kararı 10.08.2026): borç, alımların
 *  tarihinden + kartın kesim gününden + taksit sayısından TÜRETİLİR. Böylece
 *  elle giriş yok, yanlış yazma riski yok ve şemaya yeni tablo eklenmiyor —
 *  gereken üç alan (statementDay, dueDay, creditLimit) Faz 1'den beri duruyor.
 *
 *  Veritabanına gitmez, saati kendi okumaz. `kart:dogrula` ile sınanır.
 *
 *  İKİ YORUM KARARI — kullanıcı teyidi bekliyor, kod bunları AÇIKÇA yazıyor:
 *
 *  1. KESİM GÜNÜNDE yapılan alım O AYIN ekstresine düşer (küçük-eşit).
 *     Kesim gününden SONRAKİ alımlar bir sonraki ekstreye kalır.
 *  2. Taksitli alımda tutar eşit bölünür; bölünmeyen kuruş SON taksite
 *     eklenir. (1.000 TL / 3 -> 333,33 + 333,33 + 333,34)
 *
 *  Bu ikisi VARSAYILAN olarak doğru kabul edildi (kullanıcı onayı 10.08.2026)
 *  ama BANKA DAVRANIŞINA GÖRE DOĞRULANACAK: canlıda ilk gerçek ekstre geldiğinde
 *  sistemin hesabıyla karşılaştırılıp teyit edilecek. Fark çıkarsa ikisi de tek
 *  satırlık düzeltmedir — bu yüzden varsayım gizlenmiyor, yazılı duruyor.
 * ============================================================================
 */

export type KartAyari = {
  /** Hesap kesim günü (1-31). Yoksa borç hesaplanamaz. */
  kesimGunu: number | null;
  /** Son ödeme günü (1-31). Yoksa yalnız kesim tarihi gösterilir. */
  sonOdemeGunu: number | null;
  /** Kart limiti. Yoksa "kalan limit" hesaplanmaz. */
  limit: number | null;
};

export type BorcAlimi = {
  id: string;
  kod: string;
  /** Alım tarihi — UTC gece yarısı takvim günü. */
  tarih: Date;
  /** Karta yansıyan toplam tutar (kartın para biriminde). */
  tutar: number;
  /** 1 = tek çekim. */
  taksitSayisi: number;
};

export type Taksit = {
  alimId: string;
  alimKodu: string;
  sira: number;
  toplamTaksit: number;
  tutar: number;
};

export type Ekstre = {
  /** Hesabın kesildiği gün. */
  kesimTarihi: Date;
  /** Son ödeme günü. Kartta tanımlı değilse null. */
  sonOdemeTarihi: Date | null;
  toplam: number;
  taksitler: Taksit[];
  /** Bugün itibarıyla geçmiş bir ekstre mi? */
  gecmisMi: boolean;
  /** Bu döneme yapılmış NET ödeme (ters kayıtlar dahil, işaretli toplam). */
  odenen: number;
  /** `toplam − odenen`, sıfırın altına inmez. */
  kalan: number;
};

/**
 * Bir ekstreye yapılmış ödeme kaydı.
 *
 * `donem` ekstrenin KESİM ayını işaret eder; eşleme yıl-ay üzerinden yapılır
 * (bkz. `donemAnahtari`). Gün tutmuyoruz çünkü aynı ekstreye farklı günlerde
 * birden çok ödeme yapılabilir ve hepsi aynı döneme yazılmalıdır.
 */
export type EkstreOdemesi = { donem: Date; odenenAnaBorc: number };

/** Ekstre dönemi anahtarı — kesim tarihinin ayı (ISO, ayın 1'i). */
export function donemAnahtari(kesim: Date): string {
  return `${kesim.getUTCFullYear()}-${String(kesim.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

export type BorcSonucu = {
  /** Kesim günü tanımlı değilse hesap yapılamaz — sessizce sıfır gösterilmez. */
  hesaplanabilir: boolean;
  ekstreler: Ekstre[];
  /** Kesilmiş ama HÂLÂ kapanmamış ekstrelerin kalanı — gerçek gecikme. */
  gecikmisToplam: number;
  /** Henüz kesilmemiş ekstrelerin kalanı. */
  bekleyenToplam: number;
  /** `gecikmisToplam + bekleyenToplam` — kartın kapanmamış borcunun tamamı. */
  acikToplam: number;
  /** Limit tanımlıysa: limit − açık borç. Yoksa null. */
  kalanLimit: number | null;
};

// ---------------------------------------------------------------------------

/** Ayın istenen günü; ay o kadar çekmiyorsa ayın SON günü. */
export function ayinGununuKirp(yil: number, ay: number, gun: number): TakvimGunu {
  const sonrakiAy = ayKaydir(yil, ay, 1);
  const ayinSonGunu = new Date(
    gunDegeri({ ...sonrakiAy, gun: 1 }).getTime() - 1,
  ).getUTCDate();
  return { yil, ay, gun: Math.min(gun, ayinSonGunu) };
}

/**
 * Bir alımın düştüğü EKSTRE KESİM tarihi.
 *
 * Kesim gününde veya öncesinde yapılan alım o ayın ekstresine, sonrasında
 * yapılan bir sonraki ayın ekstresine düşer.
 */
export function ekstreKesimi(alimTarihi: Date, kesimGunu: number): Date {
  const yil = alimTarihi.getUTCFullYear();
  const ay = alimTarihi.getUTCMonth() + 1;
  const gun = alimTarihi.getUTCDate();

  const buAyinKesimi = ayinGununuKirp(yil, ay, kesimGunu);
  if (gun <= buAyinKesimi.gun) return gunDegeri(buAyinKesimi);

  const sonraki = ayKaydir(yil, ay, 1);
  return gunDegeri(ayinGununuKirp(sonraki.yil, sonraki.ay, kesimGunu));
}

/**
 * Kesim tarihinden sonraki son ödeme günü.
 *
 * Son ödeme günü kesim gününden KÜÇÜKSE ödeme bir sonraki aya sarkar
 * (kesim 25, son ödeme 5 -> ertesi ayın 5'i).
 */
export function sonOdemeTarihi(kesimTarihi: Date, sonOdemeGunu: number): Date {
  const yil = kesimTarihi.getUTCFullYear();
  const ay = kesimTarihi.getUTCMonth() + 1;
  const kesimGunu = kesimTarihi.getUTCDate();

  if (sonOdemeGunu > kesimGunu) {
    return gunDegeri(ayinGununuKirp(yil, ay, sonOdemeGunu));
  }
  const sonraki = ayKaydir(yil, ay, 1);
  return gunDegeri(ayinGununuKirp(sonraki.yil, sonraki.ay, sonOdemeGunu));
}

/**
 * Tutarı taksitlere böler.
 * Kuruş artığı SON taksite eklenir; toplam her zaman tam tutarı verir.
 */
export function taksitlereBol(tutar: number, taksitSayisi: number): number[] {
  const adet = Math.max(1, Math.floor(taksitSayisi));
  const kurus = Math.round(tutar * 100);
  const taban = Math.floor(kurus / adet);
  const artik = kurus - taban * adet;

  return Array.from({ length: adet }, (_, sira) =>
    sira === adet - 1 ? (taban + artik) / 100 : taban / 100,
  );
}

// ---------------------------------------------------------------------------

export function kartBorcuHesapla(
  alimlar: BorcAlimi[],
  kart: KartAyari,
  /** "Bugün" — dışarıdan verilir ki test gerçek takvimi beklemesin. */
  bugun: Date,
  /**
   * ÖDEME KAYITLARI — ZORUNLU, VARSAYILANI YOK (16.08.2026).
   *
   * Boş dizi geçmek meşrudur ("bu kartın hiç ödemesi yok") ama parametreyi
   * İSTEĞE BAĞLI yapmak değildir: unutan çağıran sessizce "hiç ödenmemiş"
   * hesabı alır ve ekranda şişmiş bir borç görünür. Zorunlu olunca derleyici
   * her çağıranı tek tek sorar.
   */
  odemeler: EkstreOdemesi[],
): BorcSonucu {
  if (kart.kesimGunu === null) {
    return {
      hesaplanabilir: false,
      ekstreler: [],
      gecikmisToplam: 0,
      bekleyenToplam: 0,
      acikToplam: 0,
      kalanLimit: null,
    };
  }

  const kesimGunu = kart.kesimGunu;
  /** Kesim tarihi (zaman damgası) -> ekstre. */
  const ekstreHaritasi = new Map<number, Ekstre>();

  for (const alim of alimlar) {
    const ilkKesim = ekstreKesimi(alim.tarih, kesimGunu);
    const paylar = taksitlereBol(alim.tutar, alim.taksitSayisi);

    paylar.forEach((pay, sira) => {
      // 1. taksit ilk ekstreye, sonrakiler ardışık aylara.
      const kesimAyi = ayKaydir(
        ilkKesim.getUTCFullYear(),
        ilkKesim.getUTCMonth() + 1,
        sira,
      );
      const kesim = gunDegeri(
        ayinGununuKirp(kesimAyi.yil, kesimAyi.ay, kesimGunu),
      );
      const anahtar = kesim.getTime();

      let ekstre = ekstreHaritasi.get(anahtar);
      if (!ekstre) {
        ekstre = {
          kesimTarihi: kesim,
          sonOdemeTarihi:
            kart.sonOdemeGunu === null
              ? null
              : sonOdemeTarihi(kesim, kart.sonOdemeGunu),
          toplam: 0,
          taksitler: [],
          gecmisMi: kesim.getTime() < bugun.getTime(),
          odenen: 0,
          kalan: 0,
        };
        ekstreHaritasi.set(anahtar, ekstre);
      }

      ekstre.toplam += pay;
      ekstre.taksitler.push({
        alimId: alim.id,
        alimKodu: alim.kod,
        sira: sira + 1,
        toplamTaksit: paylar.length,
        tutar: pay,
      });
    });
  }

  const ekstreler = [...ekstreHaritasi.values()].sort(
    (a, b) => a.kesimTarihi.getTime() - b.kesimTarihi.getTime(),
  );
  for (const ekstre of ekstreler) {
    ekstre.taksitler.sort(
      (a, b) => a.alimKodu.localeCompare(b.alimKodu) || a.sira - b.sira,
    );
  }

  /**
   * ════════════════════════════════════════════════════════════════════
   *  "GEÇMİŞ EKSTRE ÖDENMİŞ SAYILIR" VARSAYIMI KALKTI (16.08.2026)
   * --------------------------------------------------------------------
   *  Eskiden bekleyen = "bugünden sonraki ekstreler" demekti ve kesilmiş
   *  ekstreler görmezden gelinirdi. Sebep dürüsttü: sistemde ödeme kaydı
   *  YOKTU, aksi hâlde aylar öncesinin borcu uydurma bir gecikme yığınına
   *  dönüşürdü.
   *
   *  Artık `KartOdeme` var. Bir ekstrenin kapanıp kapanmadığı VARSAYILMAZ,
   *  kayıttan OKUNUR. Geçmiş ama kapanmamış ekstre gerçekten gecikmiştir
   *  ve öyle görünür; kapanmışsa hiçbir yerde toplanmaz.
   *
   *  Ödeme ekstreyi AŞARSA kalan eksiye inmez (0'da durur): fazla ödeme
   *  o kartın başka bir borcunu kapatmaz, kendi döneminde fazladır.
   * ════════════════════════════════════════════════════════════════════
   */
  const odemeToplami = new Map<string, number>();
  for (const o of odemeler) {
    const k = donemAnahtari(o.donem);
    odemeToplami.set(k, (odemeToplami.get(k) ?? 0) + o.odenenAnaBorc);
  }

  let gecikmisToplam = 0;
  let bekleyenToplam = 0;
  for (const ekstre of ekstreler) {
    /**
     * ÖDENEN DE KURUŞA YUVARLANIR — yoksa "kısmen ödendi" yalanı doğar.
     *
     * 16.08.2026, S.ahmet Vakıf 17.09 ekstresi: dört ödeme ve dört ters
     * kaydı vardı, net sıfır olması gerekiyordu. Kayan noktada toplam
     * `5.68e-14` çıktı ve `odenen > 0` doğru döndü: ekstre sarı "kısmen
     * ödendi" rozetiyle göründü, oysa geçerli tek bir ödemesi yoktu.
     *
     * `kalan` yuvarlanıyordu ama `odenen` yuvarlanmıyordu — aynı tuzağın
     * üçüncü ayağı. Bir tutarın SUNUMU yuvarlanıp KARARI ham sayıyla
     * verildiğinde ekran hep kendiyle çelişir.
     */
    ekstre.odenen = kurusaYuvarla(
      odemeToplami.get(donemAnahtari(ekstre.kesimTarihi)) ?? 0,
    );
    /**
     * KURUŞA YUVARLANIR — yoksa kapalı ekstre "ödenmedi" görünür.
     *
     * Ekstre toplamı taksit paylarının toplamıdır ve kayan noktada
     * `7137.869999999999` gibi çıkabilir (16.08.2026, canlı). Tam ödeme
     * kaydedildiğinde kalan `+9e-13` kalırsa `kalan > 0` doğru döner:
     * ekstre kırmızı "ödenmedi" listesinde durur, kullanıcı ödediği hâlde
     * ödenmemiş görür ve tekrar öder. Kuruşun altında para yoktur.
     */
    ekstre.kalan = Math.max(0, kurusaYuvarla(ekstre.toplam - ekstre.odenen));
    if (ekstre.gecmisMi) gecikmisToplam += ekstre.kalan;
    else bekleyenToplam += ekstre.kalan;
  }
  const acikToplam = gecikmisToplam + bekleyenToplam;

  return {
    hesaplanabilir: true,
    ekstreler,
    gecikmisToplam,
    bekleyenToplam,
    acikToplam,
    kalanLimit: kart.limit === null ? null : kart.limit - acikToplam,
  };
}
