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
 *
 *  ⭐ 2. MADDE BANKAYLA ÖLÇÜLDÜ VE ÇEVRİLDİ (30.09.2026, kullanıcı: «bankaya
 *  uysun»): S.ahmet Garanti ekstresi ₺799,91'lik 3 taksitli iadenin İLK
 *  taksitini **266,65** gösterdi → banka artan kuruşu İLK taksite koyuyor
 *  (266,65 + 266,63 + 266,63). Kuruş artık ilk taksitte; yukarıdaki «SON
 *  taksite» cümlesi ESKİ varsayımdır, kanıt olarak bırakıldı.
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
export type EkstreOdemesi = {
  donem: Date;
  odenenAnaBorc: number;
  /**
   * Ödeme kaydedildiği an sistemin hesapladığı ekstre borcu (`KartOdeme.ekstreBorcu`
   * snapshot'ı). ZORUNLU ANAHTAR — unutan çağıran derlenmez; bilinmiyorsa `null`.
   * «Tam ödendi» kararı buna bakar (aşağıdaki not).
   */
  ekstreBorcu: number | null;
};

/**
 * `KartOdeme` satırlarından bir kartın ekstre ödemeleri — TEK GÖVDE (30.09.2026).
 * Bu dönüşüm dört yerde ayrı ayrı yazılmıştı; `ekstreBorcu` eklenince biri geride
 * kalsaydı o ekran tam ödenmiş ekstreyi yine «ödenmemiş» gösterirdi.
 */
type Sayisal = { toString(): string };
export const KART_ODEME_SECIMI = { cardId: true, donem: true, odenenAnaBorc: true, ekstreBorcu: true } as const;
export function kartinEkstreOdemeleri(
  odemeler: readonly { cardId: string; donem: Date; odenenAnaBorc: Sayisal; ekstreBorcu: Sayisal | null }[],
  kartId: string,
): EkstreOdemesi[] {
  return odemeler
    .filter((o) => o.cardId === kartId)
    .map((o) => ({
      donem: o.donem,
      odenenAnaBorc: Number(o.odenenAnaBorc.toString()),
      ekstreBorcu: o.ekstreBorcu === null ? null : Number(o.ekstreBorcu.toString()),
    }));
}

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
 * Kuruş artığı İLK taksite eklenir (bankayla ölçüldü 30.09.2026 — başlıktaki
 * not); toplam her zaman tam tutarı verir.
 */
export function taksitlereBol(tutar: number, taksitSayisi: number): number[] {
  /**
   * ⚠ EKSİ TUTAR (karta dönen iade) AYNA GİBİ BÖLÜNÜR: mutlak değer bölünür,
   * işaret sonra konur. `Math.floor` eksi sayıda aşağı yuvarladığı için
   * doğrudan bölmek −799,91'i [−266,64 · −266,64 · −266,63] yapar —
   * alımın [266,65 · 266,63 · 266,63] bölmesinin aynası DEĞİL.
   */
  if (tutar < 0) return taksitlereBol(-tutar, taksitSayisi).map((p) => (p === 0 ? 0 : -p));
  const adet = Math.max(1, Math.floor(taksitSayisi));
  const kurus = Math.round(tutar * 100);
  const taban = Math.floor(kurus / adet);
  const artik = kurus - taban * adet;

  return Array.from({ length: adet }, (_, sira) =>
    sira === 0 ? (taban + artik) / 100 : taban / 100,
  );
}

// ---------------------------------------------------------------------------

/**
 * ============================================================================
 *  PARA BİRİMİ BAŞINA AÇIK TOPLAM — GÜNLÜK ÖZET İÇİN (K-OZET)
 * ----------------------------------------------------------------------------
 *  `kart-borcu/page.tsx`'teki `paraOzeti` haritasının kendisi limit/adet gibi
 *  ekran-özel alanlar da taşıdığı için burada TEKRARLANMIYOR; bu yalnız
 *  günlük özetin ihtiyaç duyduğu dar toplamı üretir — her kartın ZATEN
 *  hesaplanmış (`kartBorcuHesapla` + `birlesikToplamlar`) açık toplamını
 *  para birimine göre gruplar. Yeni bir borç kuralı YAZMAZ.
 * ============================================================================
 */
export function kartlarinAcikToplami(
  kartlar: { paraBirimi: string; acikToplam: number }[],
): { paraBirimi: string; tutar: number }[] {
  const harita = new Map<string, number>();
  for (const k of kartlar) {
    harita.set(k.paraBirimi, (harita.get(k.paraBirimi) ?? 0) + k.acikToplam);
  }
  return [...harita.entries()]
    .map(([paraBirimi, tutar]) => ({ paraBirimi, tutar }))
    .sort((a, b) => a.paraBirimi.localeCompare(b.paraBirimi));
}

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
  /** Dönemin ödeme kayıtlarındaki EN BÜYÜK borç snapshot'ı — «o gün ne kadar borç vardı». */
  const odemeAnindakiBorc = new Map<string, number>();
  for (const o of odemeler) {
    const k = donemAnahtari(o.donem);
    odemeToplami.set(k, (odemeToplami.get(k) ?? 0) + o.odenenAnaBorc);
    if (o.ekstreBorcu !== null) {
      odemeAnindakiBorc.set(k, Math.max(odemeAnindakiBorc.get(k) ?? 0, o.ekstreBorcu));
    }
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
    /**
     * ⭐ TAM ÖDENMİŞ EKSTRE KAPALIDIR (kullanıcı kararı 30.09.2026).
     *
     * ⛔ VAKA: taksit bölmesinde artan kuruş son taksitten İLK taksite taşındı
     * (Garanti ekstresiyle ölçüldü). Geçmiş ödemeler eski bölmenin toplamıyla
     * kaydedilmişti; yeniden hesap 30 kapalı ekstrede ₺0,01–₺0,30 «ödenmemiş»
     * bıraktı (toplam ₺1,66) ve nakit takviminde «gecikmiş» göründü. Eski
     * kuralla aynı ölçüm 0 artık veriyordu — artığı hesap değişikliği üretti,
     * borç değil.
     *
     * KURAL: ödeme kaydı, KAYDEDİLDİĞİ ANDAKİ borcun (`ekstreBorcu`) tamamını
     * karşılıyorsa ekstre kapalıdır; sonradan yeniden hesap borcu kaydırsa da
     * yeniden açılmaz. Gerekçe: banka o ekstreyi o gün tahsil etti.
     * ⚠ BEDELİ BEYAN EDİLDİ: tam ödenmiş bir ekstreye sonradan unutulmuş bir
     * alım eklenirse o da borç görünmez — banka onu da o gün tahsil etmişti.
     * ⚠ KISMİ ödeme ve ters kayıt bu kapıdan geçmez: toplam ödenen, snapshot'ın
     * altındaysa kalan her zamanki gibi hesaplanır.
     */
    const anindakiBorc = odemeAnindakiBorc.get(donemAnahtari(ekstre.kesimTarihi));
    const tamOdendi =
      anindakiBorc !== undefined &&
      ekstre.odenen > 0 &&
      ekstre.odenen >= kurusaYuvarla(anindakiBorc);
    ekstre.kalan = tamOdendi ? 0 : Math.max(0, kurusaYuvarla(ekstre.toplam - ekstre.odenen));
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

/**
 * EKSTRE SATIRININ GİDECEĞİ SAYFA (K305 bulgusu, 30.09.2026). Ekstrede üç tür
 * satır var ve üçü farklı sayfaya gider; önek türü taşır:
 *   `gider-<id>` → giderin düzenleme sayfası · `iade-<id>` → Tazminat ·
 *   önek yok → alım detayı.
 * ⛔ Eskiden HEPSİ `/alimlar/<id>`e gidiyordu: gider ve iade satırları var
 * olmayan bir sayfaya götürüyordu (anayasa: «gösterdiğim link var olan bir
 * ekrana mı gidiyor»).
 */
export function ekstreSatirAdresi(kimlik: string): string {
  if (kimlik.startsWith("gider-")) return `/giderler/${kimlik.slice("gider-".length)}/duzenle`;
  if (kimlik.startsWith("iade-")) return "/tazminat";
  return `/alimlar/${kimlik}`;
}
