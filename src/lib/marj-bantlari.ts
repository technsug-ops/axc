/**
 * ============================================================================
 *  MARJ BANTLARI — "%9" NE DEMEK, TEK YERDE
 * ----------------------------------------------------------------------------
 *  Kullanıcı isteği 21.08.2026: satış listesindeki marj rozeti tek renkli
 *  (kâr yeşil / zarar kırmızı) idi. İstenen, gönderilen PİL ölçeği: kötüden
 *  iyiye doğru DERECELİ renk, yatay biçimde.
 *
 *  ── EŞİKLER KULLANICININ, ÖLÇÜM BENİM ───────────────────────────────────
 *  Bu depoda eşik uydurulmaz; ölçülür (bkz. anayasa → "eşik dağılımın
 *  gediğine konur"). Ama bu eşikler İSTATİSTİK DEĞİL, İŞ KARARIDIR: "%4 marj
 *  benim için zayıftır" cümlesini veriden türetemem, onu işin sahibi söyler.
 *  Ölçüm burada başka bir soruyu cevaplar: **bu ölçek gerçek veriyi ayırıyor
 *  mu, yoksa her satır aynı banda mı düşüyor?**
 *
 *  ÖLÇÜLDÜ — 21.08.2026, canlı, 58 satış (iptalsiz), satış düzeyinde:
 *
 *      min −1,9 · p25 4,7 · ortanca 9,0 · p75 15,6 · p90 19,7 · max 61,5
 *
 *      zarar      (<0)      2   %3,4   █
 *      çok riskli (0–3)     3   %5,2   ██
 *      zayıf      (3–5)    12  %20,7   ████████
 *      kabul      (5–8)     7  %12,1   █████
 *      iyi        (8–12)   14  %24,1   ██████████
 *      çok iyi    (12+)    20  %34,5   ██████████████
 *
 *  ALTI BANDIN ALTISI DA DOLU, en kalabalık bant %34,5. Yani ölçek işe
 *  yarıyor: renk her satırda aynı olsaydı hiçbir şey söylemezdi.
 *
 *  ── YALNIZ CİRO MARJI ───────────────────────────────────────────────────
 *  ⚠ Bu bantlar YÜZDE ölçeğine aittir. "Sermaye verimi" bir KAT sayısıdır
 *  (0,13× · 3,4×) ve aynı eşiklerle okunamaz — %8 ile 8× aynı şey değildir.
 *  Sermaye ölçüsü seçiliyken bant çizilmez; rozet eski ikili dilinde kalır.
 *  Sermaye için bir ölçek istenirse KENDİ dağılımından ölçülür.
 * ============================================================================
 */

export const MARJ_BANTLARI = [
  "zarar",
  "cokRiskli",
  "zayif",
  "kabul",
  "iyi",
  "cokIyi",
] as const;

export type MarjBandi = (typeof MARJ_BANTLARI)[number];

/**
 * ALT SINIRLAR — her bant kendi alt sınırından başlar, bir sonrakine kadar
 * sürer. Aralıklar yarı açıktır: `%3` tam değeri "zayıf"tır, "çok riskli"
 * değil (kullanıcının gönderdiği ölçekte "%3–5 Zayıf" yazıyor).
 *
 * Sıra BÜYÜKTEN KÜÇÜĞE: `marjBandi` ilk eşleşeni döndürür, böylece bant
 * eklemek tek satırlık iştir ve zincirin sırası kodda görünür.
 */
export const MARJ_ALT_SINIRLARI: ReadonlyArray<readonly [MarjBandi, number]> = [
  ["cokIyi", 12],
  ["iyi", 8],
  ["kabul", 5],
  ["zayif", 3],
  ["cokRiskli", 0],
  ["zarar", -Infinity],
] as const;

/**
 * PİL DOLULUĞU — kaç bölme yanıyor (0–5).
 *
 * ⚠ ZARAR SIFIR BÖLME: "çok riskli"den ayrışması RENKLE DEĞİL uzunlukla da
 * olmalı. İkisi de kırmızı; renk körü bir kullanıcı için tek ayırt edici
 * kanal bölme sayısıdır (renk sistemi kısıt #1).
 */
export const PIL_BOLME_SAYISI = 5;

export const MARJ_DOLULUGU: Record<MarjBandi, number> = {
  zarar: 0,
  cokRiskli: 1,
  zayif: 2,
  kabul: 3,
  iyi: 4,
  cokIyi: 5,
};

/**
 * Bir yüzdenin bandı. Girdi ZATEN yüzdedir (9 = %9), oran değil.
 *
 * `null` → bant yok: marj hesaplanamamış demektir ve "en kötü bant"
 * saymak sessiz bir varsayım olurdu (bkz. "sıfır üç farklı şey olabilir").
 */
export function marjBandi(yuzde: number | null): MarjBandi | null {
  if (yuzde === null || !Number.isFinite(yuzde)) return null;
  for (const [bant, altSinir] of MARJ_ALT_SINIRLARI) {
    if (yuzde >= altSinir) return bant;
  }
  return "zarar";
}
