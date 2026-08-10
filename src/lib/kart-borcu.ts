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
 *  Yanlışsa ikisi de tek satırlık düzeltmedir; tahmin edip sessiz kalmaktansa
 *  yazılı durmaları iyidir.
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
};

export type BorcSonucu = {
  /** Kesim günü tanımlı değilse hesap yapılamaz — sessizce sıfır gösterilmez. */
  hesaplanabilir: boolean;
  ekstreler: Ekstre[];
  /** Henüz ödenmemiş (bugünden sonraki) ekstrelerin toplamı. */
  bekleyenToplam: number;
  /** Limit tanımlıysa: limit − bekleyen. Yoksa null. */
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
): BorcSonucu {
  if (kart.kesimGunu === null) {
    return {
      hesaplanabilir: false,
      ekstreler: [],
      bekleyenToplam: 0,
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

  // Bekleyen = henüz kesilmemiş ekstreler. Kesilmiş olanlar ödenmiş SAYILMAZ
  // ama sistem ödemeyi bilmiyor; bu yüzden "bekleyen" ifadesi bilinçli olarak
  // "gelecek ekstreler" demektir, ekranda da öyle yazar.
  const bekleyenToplam = ekstreler
    .filter((e) => !e.gecmisMi)
    .reduce((toplam, e) => toplam + e.toplam, 0);

  return {
    hesaplanabilir: true,
    ekstreler,
    bekleyenToplam,
    kalanLimit: kart.limit === null ? null : kart.limit - bekleyenToplam,
  };
}
