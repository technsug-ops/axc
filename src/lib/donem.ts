import { IS_SAAT_DILIMI } from "@/i18n/ayarlar";

/**
 * ============================================================================
 *  DÖNEM PENCERESİ — RAPORUN SINIRLARI
 * ----------------------------------------------------------------------------
 *  Saf hesap: veritabanına gitmez, "şu an"ı kendi kendine okumaz. Zaman
 *  DIŞARIDAN verilir (`an` parametresi), böylece ay başı/ay sonu davranışı
 *  gerçek takvimi beklemeden sınanabilir.
 *
 *  İKİ FARKLI ZAMAN KAVRAMI — karıştırılırsa rapor bir gün kayar:
 *
 *  1. "BUGÜN HANGİ GÜN?"  → İŞ saat diliminde (Europe/Istanbul) çözülür.
 *     Almanya'da 31 Temmuz 23:30 iken Türkiye'de 1 Ağustos'tur; rapor
 *     Ağustos'u göstermelidir.
 *
 *  2. "BİR KAYIT HANGİ GÜNE AİT?"  → İş tarihleri (soldAt, occurredAt,
 *     spentAt) takvim günü olarak, UTC GECE YARISI biçiminde saklanır.
 *     Saat bileşeni yoktur.
 *
 *  Bu yüzden pencere sınırları da UTC gece yarısıdır ve karşılaştırma
 *  gün-güne yapılır. Aralık YARI AÇIKTIR: [baslangic, bitisHaric)
 *  Böylece "son gün dahil mi?" belirsizliği hiç doğmaz.
 * ============================================================================
 */

/**
 * İKİ ÖLÇÜ BİR ARADA — bilerek, ama karıştırılmadan.
 *
 * "Son 15 gün" GÜN sayar, "Son 3 ay" TAKVİM AYI sayar. İkisi aynı menüde
 * durduğu için ekran her seçeneğin altına gerçek tarih aralığını yazar
 * ("01.06.2026 – 13.08.2026"); kullanıcı tanımı tahmin etmek zorunda kalmaz.
 *
 * Ay ölçüsü DEĞİŞTİRİLMEDİ: "Son 3 ay" hâlâ BU AY DAHİL son 3 takvim ayıdır
 * (karar 10.08.2026). Değiştirseydik eski raporlar sessizce kayardı.
 */
export const PENCERE_TURLERI = [
  "BUGUN",
  /**
   * DÜN — kullanıcı isteği 21.08.2026.
   *
   * ⚠ TEK GÜNLÜK VE KAYAN DEĞİL: `[dün, dün]`. "Son 2 gün" DEĞİL — bugünü
   * içermez. Operasyon "dün ne oldu" diye soruyor; bugünü de katan bir
   * pencere o soruya cevap vermez, iki günü toplar.
   */
  "DUN",
  "BU_HAFTA",
  "SON_15_GUN",
  "SON_30_GUN",
  "BU_AY",
  "SON_3_AY",
  "SON_6_AY",
  "SON_1_YIL",
  "OZEL",
] as const;

/**
 * RAPOR'un menüsü — bilinçli olarak DAR.
 *
 * Rapor dönem kârı okur; "bugün" ya da "bu hafta" orada anlamlı bir kâr
 * dönemi değildir (kesintiler ve hakedişler aylık işler). Liste ekranları
 * ise günlük çalışır ve dar aralıklara ihtiyaç duyar. Motor tek, menüler
 * ekranın işine göre ayrı.
 */
export const RAPOR_PENCERELERI = [
  "BU_AY",
  "SON_3_AY",
  "SON_6_AY",
  "OZEL",
] as const satisfies readonly PencereTuru[];

/** Liste ekranlarının menüsü — operasyon günlük çalışır, dar aralık ister. */
export const LISTE_PENCERELERI = [
  /**
   * ⚠ SIRA: DÜN ÖNDE (kullanıcı kararı 21.08.2026).
   *
   * Kronolojik olarak ters görünür ama operasyonun sorusu öyle: gün
   * içinde "bugün ne oldu" cevabı henüz oluşmamıştır — siparişler akıyor,
   * kargo çıkmamış, hakediş yok. Kapanmış gün DÜNDÜR ve ilk bakılan odur.
   *
   * ⚠ BU LİSTENİN SIRASI EKRANDAKİ DÜĞME SIRASIDIR — `SuzgecCubugu`
   * doğrudan bunu geziyor. Yani burada sıra değiştirmek Panel, Satışlar,
   * Alımlar ve İadeler'in HEPSİNİ birden değiştirir; tek ekran için
   * sıralama isteniyorsa bu liste kopyalanmaz, ayrı liste açılır.
   */
  "DUN",
  "BUGUN",
  "BU_HAFTA",
  "SON_15_GUN",
  "SON_30_GUN",
  "BU_AY",
  "SON_3_AY",
  "SON_6_AY",
  "SON_1_YIL",
  "OZEL",
] as const satisfies readonly PencereTuru[];

/**
 * ============================================================================
 *  PANEL VARSAYILAN DÖNEMİ
 * ----------------------------------------------------------------------------
 *  ⚠ 21.08.2026'DA "BU_AY"DAN "BUGUN"A ÇEVRİLDİ — kullanıcı kararı.
 *
 *  ── ESKİ GEREKÇE (silinmedi) ────────────────────────────────────────────
 *  "Liste ekranlarının varsayılanı tüm zamanlar, ama panelin varsayılanı BU
 *  AY: panel 'ne oldu' özetidir, tüm zamanların toplamı bir gösterge
 *  tablosunda bilgi taşımaz."
 *
 *  ── NİYE ÇEVRİLDİ ───────────────────────────────────────────────────────
 *  Gerekçe çürümedi, DARALDI: aynı mantık bir adım ileri gidiyor. Panel
 *  günlük iş ekranı — açılışta sorulan soru "bu ay ne oldu" değil, "bugün
 *  ne yapmam gerekiyor". Aylık resim bir tık ötede duruyor.
 *
 *  ⚠ LİSTELERİN VARSAYILANI DEĞİŞMEDİ. Onlarda "tüm zamanlar" kararı
 *  (13.08.2026) yerinde: orada süzgeç eklemek KAYIT GİZLEMEK olur, panelde
 *  ise dönem zaten hiç boş olamıyor.
 * ============================================================================
 */
export const PANEL_VARSAYILAN_PENCERE = "BUGUN" satisfies PencereTuru;

export type PencereTuru = (typeof PENCERE_TURLERI)[number];

export type Pencere = {
  tur: PencereTuru;
  /** DAHİL — UTC gece yarısı. */
  baslangic: Date;
  /** HARİÇ — pencere [baslangic, bitisHaric) yarı açık aralıktır. */
  bitisHaric: Date;
  /** Ekranda yazılan son gün (DAHİL) = bitisHaric − 1 gün. */
  sonGun: Date;
};

/** Takvim günü — ay 1-12 (JavaScript'in 0-11'i DEĞİL). */
export type TakvimGunu = { yil: number; ay: number; gun: number };

const GUN_MS = 24 * 60 * 60 * 1000;

/**
 * Bir ANIN iş saat dilimindeki takvim günü.
 * `formatToParts` ile parça parça okunur — yerel ayarın gün/ay sırasına
 * bağımlılık kalmaz.
 */
export function isTakvimGunu(an: Date): TakvimGunu {
  const parcalar = new Intl.DateTimeFormat("en-US", {
    timeZone: IS_SAAT_DILIMI,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(an);

  const al = (tur: Intl.DateTimeFormatPartTypes) =>
    Number(parcalar.find((p) => p.type === tur)?.value ?? "0");

  return { yil: al("year"), ay: al("month"), gun: al("day") };
}

/** Takvim gününü, iş tarihlerinin saklandığı biçime çevirir: UTC gece yarısı. */
export function gunDegeri({ yil, ay, gun }: TakvimGunu): Date {
  return new Date(Date.UTC(yil, ay - 1, gun));
}

/**
 * GÜN HASSASİYETLİ Mİ — `soldAt` sözleşmesi (K163): elle ve Excel kayıtları
 * UTC gece yarısına damgalı (saat BİLİNMİYOR), API çekimi gerçek anı yazar.
 * UTC 00:00:00.000 = "saat bilinmiyor" kabulüdür; ekran bu kayıtta saat
 * basmaz. ⚠ İstanbul 03:00:00.000'ın MİLİSANİYESİNDE verilmiş gerçek bir
 * sipariş de bu değere düşer ve saati gizlenir — olasılık ihmal edildi,
 * bilinçli (bir güne ~1/86.400.000).
 */
export function gunHassasiyetliMi(tarih: Date): boolean {
  return tarih.getTime() % 86_400_000 === 0;
}

/**
 * UTC gece yarısı bir tarihe gün ekler/çıkarır.
 * UTC'de yaz saati uygulaması olmadığı için düz milisaniye toplamı güvenlidir.
 */
export function gunEkle(tarih: Date, gunSayisi: number): Date {
  return new Date(tarih.getTime() + gunSayisi * GUN_MS);
}

/** Ay kaydırma: (2026, 1) −2 → (2025, 11). Yıl sınırını doğru geçer. */
export function ayKaydir(
  yil: number,
  ay: number,
  fark: number,
): { yil: number; ay: number } {
  const toplam = yil * 12 + (ay - 1) + fark;
  return { yil: Math.floor(toplam / 12), ay: (toplam % 12) + 1 };
}

/** "2026-08-01" → UTC gece yarısı. Biçim bozuksa null. */
export function gunMetninden(metin: string): Date | null {
  const eslesme = /^(\d{4})-(\d{2})-(\d{2})$/.exec(metin.trim());
  if (!eslesme) return null;

  const yil = Number(eslesme[1]);
  const ay = Number(eslesme[2]);
  const gun = Number(eslesme[3]);
  if (ay < 1 || ay > 12 || gun < 1 || gun > 31) return null;

  const tarih = gunDegeri({ yil, ay, gun });
  // 31 Şubat gibi taşan tarihler sessizce mart olur — reddet.
  if (tarih.getUTCMonth() + 1 !== ay || tarih.getUTCDate() !== gun) return null;

  return tarih;
}

/** UTC gece yarısı tarihi <input type="date"> biçimine çevirir. */
export function gunMetni(tarih: Date): string {
  const ay = String(tarih.getUTCMonth() + 1).padStart(2, "0");
  const gun = String(tarih.getUTCDate()).padStart(2, "0");
  return `${tarih.getUTCFullYear()}-${ay}-${gun}`;
}

// ---------------------------------------------------------------------------
//  İŞ GÜNÜ
// ---------------------------------------------------------------------------

/**
 * ⚠ TATİLLER SAYILMIYOR — yalnız hafta sonu.
 *
 * Trendyol vadesi İŞ GÜNÜ cinsindendir (28 iş günü ≈ 41 takvim günü).
 * Takvim günü sayılsaydı "geç ödeme" uyarısı 13 gün yanılırdı.
 *
 * Resmî tatiller hesaba KATILMIYOR: yıl yıl değişir, dinî bayramlar kayar,
 * yani VERİ gerektirir — bugün öyle bir tablo yok. Sonuç: araya bayram
 * girdiği dönemlerde beklenen tarih 2-3 gün ERKEN çıkar. Bu yüzden gecikme
 * eşiği (bkz. HAKEDIS_ESIKLERI) sıfır değil, birkaç iş günüdür.
 * _Karar 11.08.2026: önce hafta sonu; tatil tablosu BEKLEYENLER'de._
 */
export function haftaSonuMu(tarih: Date): boolean {
  const gun = tarih.getUTCDay(); // 0 pazar · 6 cumartesi
  return gun === 0 || gun === 6;
}

/**
 * Bir tarihe İŞ GÜNÜ ekler. Başlangıç günü SAYILMAZ; ilk iş günü 1'dir.
 * `sayi = 0` verilirse tarih olduğu gibi döner.
 */
export function isGunuEkle(tarih: Date, sayi: number): Date {
  if (sayi <= 0) return tarih;

  let gecerli = tarih;
  let kalan = sayi;
  // Üst sınır yok ama sonsuz döngü de yok: her adım bir gün ilerler.
  while (kalan > 0) {
    gecerli = gunEkle(gecerli, 1);
    if (!haftaSonuMu(gecerli)) kalan--;
  }
  return gecerli;
}

/**
 * İki tarih arasındaki İŞ GÜNÜ sayısı. Başlangıç hariç, bitiş dahil.
 * Bitiş başlangıçtan önceyse NEGATİF döner — "3 iş günü geç" ile
 * "3 iş günü erken" ayırt edilebilsin.
 */
export function isGunuFarki(baslangic: Date, bitis: Date): number {
  const ileri = bitis.getTime() >= baslangic.getTime();
  const [bas, son] = ileri ? [baslangic, bitis] : [bitis, baslangic];

  let sayac = 0;
  let gecerli = bas;
  while (gecerli.getTime() < son.getTime()) {
    gecerli = gunEkle(gecerli, 1);
    if (!haftaSonuMu(gecerli)) sayac++;
  }
  return ileri ? sayac : -sayac;
}

export class PencereHatasi extends Error {
  constructor(readonly kod: "ARALIK_EKSIK" | "ARALIK_GECERSIZ" | "TERS_ARALIK") {
    super(kod);
    this.name = "PencereHatasi";
  }
}

/**
 * Dönem penceresi üretir.
 *
 * "Son 3 ay" = BU AY DAHİL son 3 takvim ayı (kullanıcı kararı 10.08.2026).
 * 10 Ağustos'ta: 1 Haziran → 10 Ağustos. Yani başlangıç ay başına yaslanır,
 * bitiş BUGÜNDÜR — henüz yaşanmamış günler pencereye girmez.
 *
 * @param an  "Şu an". Dışarıdan verilir; fonksiyon saati kendi okumaz.
 */
export function pencereOlustur(
  tur: PencereTuru,
  an: Date,
  ozel?: { baslangic: string; bitis: string },
): Pencere {
  if (tur === "OZEL") {
    if (!ozel) throw new PencereHatasi("ARALIK_EKSIK");

    const baslangic = gunMetninden(ozel.baslangic);
    const sonGun = gunMetninden(ozel.bitis);
    if (!baslangic || !sonGun) throw new PencereHatasi("ARALIK_GECERSIZ");
    if (sonGun.getTime() < baslangic.getTime()) {
      throw new PencereHatasi("TERS_ARALIK");
    }

    // Bitiş günü DAHİLDİR; yarı açık aralık için bir gün ileri taşınır.
    return { tur, baslangic, bitisHaric: gunEkle(sonGun, 1), sonGun };
  }

  const bugun = isTakvimGunu(an);
  const sonGun = gunDegeri(bugun);

  // --- GÜN ÖLÇÜSÜ: bugünden geriye kayan pencere, BUGÜN DAHİL ---
  // "Son 15 gün" = bugün + geriye 14 gün. Bugünü saymasaydık 15 gün seçen
  // kullanıcı 16 günlük veri görürdü.
  if (tur === "BUGUN" || tur === "SON_15_GUN" || tur === "SON_30_GUN") {
    const geriGun = tur === "BUGUN" ? 0 : tur === "SON_15_GUN" ? 14 : 29;
    const baslangic = gunEkle(sonGun, -geriGun);
    return { tur, baslangic, bitisHaric: gunEkle(sonGun, 1), sonGun };
  }

  /**
   * --- DÜN: TEK GÜN, BUGÜNÜ İÇERMEZ ---
   * ⚠ Yukarıdaki blokla BİRLEŞTİRİLMEDİ. Orası "bugünden geriye kayan,
   * bugün DAHİL" penceredir; dün ise bugünü DIŞARIDA bırakır. Aynı if'e
   * eklenseydi `sonGun` bugün kalır ve "dün" iki günü kapsardı.
   */
  if (tur === "DUN") {
    const dun = gunEkle(sonGun, -1);
    return { tur, baslangic: dun, bitisHaric: sonGun, sonGun: dun };
  }

  // --- HAFTA: PAZARTESİ başlar (Türkiye'de hafta böyle konuşulur) ---
  if (tur === "BU_HAFTA") {
    // getUTCDay: 0 pazar … 6 cumartesi. Pazartesiye kaç gün geri gidilecek:
    // pazartesi 0, salı 1, … pazar 6.
    const pazartesiyeUzaklik = (sonGun.getUTCDay() + 6) % 7;
    const baslangic = gunEkle(sonGun, -pazartesiyeUzaklik);
    return { tur, baslangic, bitisHaric: gunEkle(sonGun, 1), sonGun };
  }

  // --- AY ÖLÇÜSÜ: BU AY DAHİL son N takvim ayı; başlangıç ay başına yaslanır ---
  const geriAy =
    tur === "BU_AY" ? 0 : tur === "SON_3_AY" ? 2 : tur === "SON_6_AY" ? 5 : 11;
  const bas = ayKaydir(bugun.yil, bugun.ay, -geriAy);

  const baslangic = gunDegeri({ yil: bas.yil, ay: bas.ay, gun: 1 });

  return { tur, baslangic, bitisHaric: gunEkle(sonGun, 1), sonGun };
}

/** Kayıt bu pencerenin içinde mi? */
export function pencerede(pencere: Pencere, tarih: Date): boolean {
  const t = tarih.getTime();
  return t >= pencere.baslangic.getTime() && t < pencere.bitisHaric.getTime();
}
