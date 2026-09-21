/**
 * ============================================================================
 *  KARGO TARİFESİ — HANGİ KANALIN OKUYUCUSU VAR (K229, 21.09.2026)
 * ----------------------------------------------------------------------------
 *  Veritabanına GİTMEZ. Ekranın ve bekçinin TEK doğruluk kaynağı.
 *
 *  ── NİYE DOĞDU (kullanıcı tespiti 21.09.2026) ──────────────────────────
 *  _"Bu sadece HB'ye özel değil, diğer pazaryerleri de arada bir değiştiriyor.
 *  Onlara has bir yer de olmalı."_ Haklıydı — ve ekranın ADINDA kanal gömülü
 *  olması anayasanın adlandırma kuralına da aykırıydı: kanal VERİ olabilir,
 *  YAPI olamaz.
 *
 *  ⭐ ÖLÇÜLDÜ VE SORUN SANILANDAN GENİŞ ÇIKTI (canlı, 21.09.2026):
 *
 *      Trendyol      4.210 satır · 10 taşıyıcı · tek parti 2026-07-16
 *      Hepsiburada  85.702 satır · 11 taşıyıcı · 2026-08-01 + 2026-09-10
 *      N11 ve 9 kanal daha              TARİFE YOK
 *
 *  Trendyol'un tarifesi **seed'den** gelmiş (`prisma/seed-kar-motoru.ts` →
 *  `veri/kargo-tarifeleri.xlsx`) ve bir daha tazelenmemiş; tazeleyecek ekran
 *  da yoktu. Yani TY satışlarında kargo maliyeti iki aylık bir tarifeden
 *  hesaplanıyor ve bunu HİÇBİR EKRAN SÖYLEMİYOR.
 *
 *  ── VERİ MODELİ ZATEN KANAL BAĞIMSIZ ───────────────────────────────────
 *  `CargoTariff.channelId` herhangi bir kanala bağlanıyor (ölçüldü). Yani
 *  şema değişikliği GEREKMİYOR — eksik olan yalnız ekran ve okuyucu.
 * ============================================================================
 */

/**
 * KARGO TARİFESİ OKUYUCUSU OLAN KANALLAR — **KANAL KODUYLA**, adla değil.
 *
 * ⛔ AD DEĞİL KOD: yazıcı bugüne kadar kanalı `name: { contains: "Hepsiburada" }`
 * ile buluyordu. Bu deponun K13b dersi tam olarak bunun bedelini ölçmüştü:
 * `kanalAdi === "Hepsiburada"` hiç tutmadı çünkü alan `"Hepsiburada — AXCALI"`
 * üretiyordu ve 29 ürün sessizce elendi. Ad bir ETİKETTİR; eşleştirme
 * kimlikle yapılır.
 *
 * ⚠ BU LİSTE "ÖTEKİ KANALLAR TARİFE YAYIMLAMIYOR" DEMEZ. Söylediği yalnız
 * şu: **bizim o kanal için okuyucumuz yok, çünkü öyle bir dosya elimize
 * gelmedi.** Geldiği gün okuyucu yazılır ve kod buraya eklenir.
 */
export const KARGO_OKUYUCUSU_OLAN_KANAL_KODLARI: readonly string[] = [
  /** Resmî kargo tarifesi PDF'i — `lib/kargo-tarife-pdf`. */
  "HEPSIBURADA",
];

export function kargoOkuyucusuVarMi(kanalKodu: string): boolean {
  return KARGO_OKUYUCUSU_OLAN_KANAL_KODLARI.includes(kanalKodu.toUpperCase());
}

/**
 * Bir kanalın kargo tarifesinin özeti — kart bunu gösterir.
 *
 * ⚠ "BAYAT" DİYE BİR EŞİK YOK VE BİLEREK YOK. Kargo tarifesinin bitiş
 * tarihi VERİDE YOK (`CargoTariff`te yalnız `effectiveFrom` var), yani
 * "kaç gün sonra bayatlar" sorusunun veriden türetilebilir bir cevabı
 * yok. Uydurma bir gün sayısı koymak, anayasanın _"eşik dağılımın
 * gediğine konur, uydurulmaz"_ kuralını çiğnerdi. Kart bunun yerine
 * ÖLÇÜLEBİLİR OLANI yazar: son tarifenin tarihi ve kaç gün geçtiği.
 * Hükmü operatör verir — ama artık rakamı görerek verir.
 */
export type KargoKanalOzeti = {
  kanalId: string;
  kanalKodu: string;
  kanalAdi: string;
  okuyucuVar: boolean;
  satirSayisi: number;
  tasiyiciSayisi: number;
  /** En son yürürlük tarihi; hiç tarife yoksa `null`. */
  sonTarife: Date | null;
  /** `sonTarife` üstünden geçen tam gün; tarife yoksa `null`. */
  gecenGun: number | null;
};

/** Gün farkı — saat farkından değil, TAM GÜNDEN. */
export function gecenGunHesapla(sonTarife: Date | null, bugun: Date): number | null {
  if (sonTarife === null) return null;
  const fark = bugun.getTime() - sonTarife.getTime();
  return Math.max(0, Math.floor(fark / 86_400_000));
}
