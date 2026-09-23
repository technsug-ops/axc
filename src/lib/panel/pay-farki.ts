/**
 * ============================================================================
 *  CİRO PAYI ↔ NET PAYI FARKI — TEK CÜMLELİK HÜKÜM (K246, 23.09.2026)
 * ----------------------------------------------------------------------------
 *  Kanal kartı iki pay çubuğu çiziyor (cironun yüzde kaçı · NET-2'nin yüzde
 *  kaçı) ve aradaki fark ZATEN önemli diye oraya konmuştu. Ama fark
 *  ÇUBUKLARDAN OKUNUYORDU: iki uzunluğu gözle karşılaştırıp aradaki birkaç
 *  pikseli yorumlamak gerekiyordu.
 *
 *  ⛔ NİYE CÜMLE: cironun %31,6'sını taşıyan bir kanal NET'in %31,1'ini
 *  getiriyorsa, o kanal **lira başına daha az kazandırıyor** demektir.
 *  Bu bir HÜKÜMDÜR ve panel hüküm yeridir; iki çubuk arasındaki farkı
 *  okuyucunun çıkarmasına bırakmak, çoğu zaman çıkarılmaması demektir.
 *  _(Anayasa: İlke #16 — rakam kaynağına götürür; ve "toplam rakam yorum
 *  kaldırır, satır kaldırmaz".)_
 *
 *  ⚠ FARK **PUAN** CİNSİNDEN (K245 ile aynı kural): iki oran arasındaki
 *  hareket yüzdeyle anlatılamaz. %31,6 ↔ %31,1 farkı 0,5 PUAN'dır.
 * ============================================================================
 */

/**
 * Çubukların ayrıştığını saymak için eşik — PUAN.
 *
 * ⚠ UYDURMA DEĞİL, ROZETİN İŞİNDEN GELİYOR: yuvarlama artığı yüzünden iki
 * pay neredeyse hiçbir zaman kuruşuna eşit olmaz. Eşik olmasaydı her kanal
 * kartında "0,01 puan üstünde" yazardı ve cümle gürültüye dönerdi.
 * K245'teki rozet eşiğiyle aynı değer — iki yerde iki eşik olmasın.
 */
export const PAY_FARKI_ESIGI = 0.05;

export type PayYonu = "USTUNDE" | "ALTINDA" | "AYNI";

export type PayFarki = {
  /** Mutlak fark, PUAN. Yön ayrı alanda; burada işaret taşınmaz. */
  puan: number;
  yon: PayYonu;
};

/**
 * NET payı ile ciro payı arasındaki farkı hükme çevirir.
 *
 * ⛔ NET PAYI `null` İSE HÜKÜM YOK: o kanalda kâr hesaplanamamış demektir
 * ve "aynı hizada" demek olmayan bir bilgiyi varmış gibi sunardı.
 * _(Anayasa: "sistem, kendi defterinde takip etmediği şey hakkında iddia
 * kurmaz".)_
 */
export function payFarki(
  ciroPayi: number,
  net2Payi: number | null,
): PayFarki | null {
  if (net2Payi === null) return null;
  if (!Number.isFinite(ciroPayi) || !Number.isFinite(net2Payi)) return null;
  const fark = net2Payi - ciroPayi;
  if (Math.abs(fark) < PAY_FARKI_ESIGI) return { puan: 0, yon: "AYNI" };
  return { puan: Math.abs(fark), yon: fark > 0 ? "USTUNDE" : "ALTINDA" };
}
