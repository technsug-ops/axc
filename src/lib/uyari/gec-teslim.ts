/**
 * ============================================================================
 *  GEÇ TESLİM UYARISI — "TESLİM GERÇEKTEN BUGÜN MÜ?"
 * ----------------------------------------------------------------------------
 *  Mimar kararı 19.08.2026. Kök sebep: mal kabul formundaki teslim tarihi
 *  BUGÜNE varsayılan geliyor ve geçmiş veri girilirken değiştirilmiyor.
 *
 *  İki gün içinde İKİ vaka çıktı — ikisi de aynı desende:
 *    · Schafer  `ALM-AMZ-260813-05` → parti satıştan 30 gün SONRA
 *    · LEGO     `ALM-AMZ-260819-01` → parti satıştan 1 gün SONRA
 *  Düzeltmesi ledger'a elle müdahale gerektiriyor (dar istisna). Önlemek
 *  düzeltmekten ucuz.
 *
 *  ── EŞİK ÖLÇÜLDÜ, MİMARIN TAHMİNİ DÜZELTİLDİ ────────────────────────────
 *  Mimar "30+ gün" önerdi. Canlı dağılım (n=113 mal kabul hareketi,
 *  19.08.2026) başka bir şey söylüyor:
 *
 *      min −28 · p25 2 · **ortanca 2** · p75 3 · p90 4 · p95 7 · max 48
 *
 *      0–2 gün   57   ████████████
 *      3–5 gün   45   ██████████
 *      6–10 gün   5   ██
 *      11–20 gün  0   ← BOŞ BANT
 *      21–30 gün  2
 *      31–60 gün  2
 *
 *  ⚠ GÖVDE 0–10 GÜN (113'ün 107'si), sonra **11–20 arası TAMAMEN BOŞ**,
 *  sonra 4 aykırı. Eşik o boş banda konuldu: **15 gün.**
 *
 *  `30` seçilseydi 21 günlük kaydı KAÇIRIRDI. `15` dördünü de yakalıyor —
 *  ve yakaladığı dördün İKİSİ zaten bilinen bozuk kayıtlar (Schafer 48,
 *  LEGO 30). Yani uyarı, var olsaydı iki vakayı da önlerdi.
 *  _(Anayasa: eşik dağılımın gediğine konur.)_
 * ============================================================================
 */

/** Ölçümün kaynağı — eşik kaynağıyla anılır. */
export const TESLIM_OLCUMU = {
  tarih: "19.08.2026",
  ornek: 113,
  ortanca: 2,
  p95: 7,
  bosBant: [11, 20] as const,
} as const;

/** Sipariş ile teslim arası bu günü aşarsa form sorar. */
export const GEC_TESLIM_GUN = 15;

/**
 * Teslim tarihi siparişten çok uzak mı — form SORAR, ENGELLEMEZ.
 *
 * ⚠ ENGEL DEĞİL: mal gerçekten geç gelmiş olabilir (gümrük, tedarik
 * gecikmesi; ölçümde 21–48 gün arası dört gerçek kayıt var). Engelleseydik
 * operasyoncu doğru veriyi giremezdi.
 *
 * ⚠ TERS FARK DA UYARIR. Ölçümde `min −28` çıktı: teslim, siparişten ÖNCE
 * damgalanmış kayıtlar var. Bu imkânsızdır ve sessiz geçilemez.
 */
export function gecTeslimMi(
  siparisTarihi: Date | null,
  teslimTarihi: Date | null,
): { gun: number; tur: "GEC" | "TERS" } | null {
  if (siparisTarihi === null || teslimTarihi === null) return null;
  const gun = Math.round(
    (teslimTarihi.getTime() - siparisTarihi.getTime()) / 86400000,
  );
  if (gun < 0) return { gun, tur: "TERS" };
  if (gun > GEC_TESLIM_GUN) return { gun, tur: "GEC" };
  return null;
}
