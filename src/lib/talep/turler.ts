/**
 * ============================================================================
 *  DESTEK TALEBİ — SAF KURALLAR
 * ----------------------------------------------------------------------------
 *  Veritabanına gitmez, ekran bilmez. Durum akışı burada karara bağlanır ve
 *  `talep:dogrula` bunu ÇAĞIRARAK sınayabiliyor. Sunucu eyleminin içine
 *  gömülseydi hiçbir test göremezdi.
 * ============================================================================
 */

export const TALEP_TURLERI = ["HATA", "ISTEK"] as const;
export type TalepTuru = (typeof TALEP_TURLERI)[number];

export const TALEP_DURUMLARI = [
  "ACIK",
  "INCELENIYOR",
  "YAPILIYOR",
  "COZULDU",
  "KAPANDI",
  "REDDEDILDI",
  "ERTELENDI",
] as const;
export type TalepDurumu = (typeof TALEP_DURUMLARI)[number];

/** İş bitmiş sayılan durumlar — listede "kapalı" tarafına düşer. */
export const KAPALI_DURUMLAR = ["KAPANDI", "REDDEDILDI"] as const;

/**
 * BİR DURUMDAN HANGİLERİNE GEÇİLEBİLİR.
 *
 * ── NEDEN SERBEST BIRAKILMADI ───────────────────────────────────────────
 * "Her durumdan her duruma" demek, KAPANDI bir talebin bir tık kazayla
 * YAPILIYOR'a dönmesi demektir. Akış bir söz veriyor: kullanıcı talebinin
 * nerede olduğunu görüyor. Söz, geri sıçramayan bir sırayla anlam kazanır.
 *
 * ── AMA TEK YÖNLÜ DE DEĞİL ──────────────────────────────────────────────
 * COZULDU'dan YAPILIYOR'a dönülebilir: "çözdüm" denip çözülmediği anlaşılan
 * talep gerçek bir durumdur, onu yeni talep açmaya zorlamak geçmişi böler.
 * KAPANDI ise SON: kapanmış talep yeniden açılmaz, yenisi açılır.
 *
 * ERTELENDI her açık durumdan gidilebilir ve geri dönebilir — erteleme bir
 * son değil, duraklamadır.
 */
export const GECISLER: Record<TalepDurumu, readonly TalepDurumu[]> = {
  ACIK: ["INCELENIYOR", "YAPILIYOR", "REDDEDILDI", "ERTELENDI"],
  INCELENIYOR: ["YAPILIYOR", "COZULDU", "REDDEDILDI", "ERTELENDI"],
  YAPILIYOR: ["COZULDU", "ERTELENDI", "REDDEDILDI"],
  COZULDU: ["KAPANDI", "YAPILIYOR"],
  ERTELENDI: ["ACIK", "INCELENIYOR", "YAPILIYOR", "REDDEDILDI"],
  // SON DURAKLAR — buradan çıkış yok.
  KAPANDI: [],
  REDDEDILDI: [],
};

export function gecisGecerliMi(
  mevcut: TalepDurumu,
  yeni: TalepDurumu,
): boolean {
  // Aynı duruma "geçmek" bir değişiklik değildir; sessizce geçerli saymayız.
  if (mevcut === yeni) return false;
  return GECISLER[mevcut].includes(yeni);
}

/** Talep hâlâ iş bekliyor mu — listede "açık" sayacı bunu kullanır. */
export function acikMi(durum: TalepDurumu): boolean {
  return !(KAPALI_DURUMLAR as readonly string[]).includes(durum);
}

/**
 * `kapatilmaZamani` bu geçişte yazılmalı mı.
 *
 * COZULDU da sayılır: çözüm anı, kapanış anından farklı olabilir ve
 * "ne kadar sürdü" sorusunun cevabı ÇÖZÜM anıdır. KAPANDI'ya geçerken
 * zaten dolu olan alan EZİLMEZ (bkz. `kapanisZamani`).
 */
export function kapanisSayilirMi(durum: TalepDurumu): boolean {
  return durum === "COZULDU" || durum === "KAPANDI" || durum === "REDDEDILDI";
}

/**
 * Yeni kapanış zamanı — ilk kapanış korunur.
 *
 * COZULDU → KAPANDI geçişinde zaman GÜNCELLENMEZ: ölçmek istediğimiz
 * "kullanıcının derdi ne zaman bitti", "kayıt ne zaman arşivlendi" değil.
 */
export function kapanisZamani(
  mevcutZaman: Date | null,
  yeniDurum: TalepDurumu,
  simdi: Date,
): Date | null {
  if (!kapanisSayilirMi(yeniDurum)) return null;
  return mevcutZaman ?? simdi;
}

/**
 * TALEP KODU — TLP-0001.
 *
 * Konuşurken referans verilebilsin diye var: "TLP-0007 ne oldu?" cümlesi
 * cuid ile kurulamaz. Dört hane 9999 talebe yeter; aşarsa doğal olarak
 * beşe çıkar, kesilmez.
 */
export function talepKodu(sonrakiSira: number): string {
  return `TLP-${String(sonrakiSira).padStart(4, "0")}`;
}

/**
 * Var olan en büyük koddan sonraki sırayı bulur.
 *
 * SAYIYA GÖRE DEĞİL METNE göre max alınsaydı "TLP-0009" ile "TLP-0010"
 * karşılaştırmasında 9 kazanırdı; kodlar sabit haneli olduğu için bugün
 * çalışır ama hane sayısı değişince sessizce bozulurdu. Sayıya çeviriyoruz.
 */
export function sonrakiSira(mevcutKodlar: string[]): number {
  let enBuyuk = 0;
  for (const kod of mevcutKodlar) {
    const m = /^TLP-(\d+)$/.exec(kod);
    if (!m) continue;
    const sayi = Number(m[1]);
    if (Number.isFinite(sayi) && sayi > enBuyuk) enBuyuk = sayi;
  }
  return enBuyuk + 1;
}

export type TalepHatasi =
  | "BASLIK_BOS"
  | "BASLIK_COK_UZUN"
  | "ACIKLAMA_BOS"
  | "TUR_GECERSIZ";

/** Girdi denetimi — sunucu ekrana güvenmez. */
export function talebiDogrula(girdi: {
  baslik: string;
  aciklama: string;
  tur: string;
}): TalepHatasi[] {
  const hatalar: TalepHatasi[] = [];
  const baslik = girdi.baslik.trim();
  if (baslik === "") hatalar.push("BASLIK_BOS");
  // 191: MySQL index sınırı. Kesip kaydetmek yerine REDDEDİYORUZ —
  // sessizce kırpılan başlık, kullanıcının yazdığından farklı olurdu.
  else if (baslik.length > 191) hatalar.push("BASLIK_COK_UZUN");
  if (girdi.aciklama.trim() === "") hatalar.push("ACIKLAMA_BOS");
  if (!(TALEP_TURLERI as readonly string[]).includes(girdi.tur)) {
    hatalar.push("TUR_GECERSIZ");
  }
  return hatalar;
}

/**
 * OTOMATİK YAKALANAN BAĞLAM — KIRPILIR, REDDEDİLMEZ.
 *
 * Kullanıcının yazdığı metin kırpılmaz (yukarıya bak), ama bunu kullanıcı
 * yazmıyor: tarayıcı üretiyor ve bazı user-agent'lar çok uzun. Uzun diye
 * talebi reddetmek, bildirimi kullanıcının hatası yüzünden değil TARAYICISI
 * yüzünden engellemek olurdu.
 */
export function bagalamiKirp(deger: string | null | undefined): string | null {
  if (!deger) return null;
  const temiz = deger.trim();
  if (temiz === "") return null;
  return temiz.slice(0, 500);
}
