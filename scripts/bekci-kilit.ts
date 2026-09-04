import { existsSync, readFileSync, statSync } from "node:fs";

/**
 * ============================================================================
 *  BEKÇİ TURU KİLİDİ — TEK ÖLÇÜT, İKİ OKUYUCU (K161 + K162-②)
 * ----------------------------------------------------------------------------
 *  "Tur gerçekten koşuyor mu" sorusunu İKİ yer soruyor:
 *    · `bekci.ts`             — ikinci tur açılmasın (K161)
 *    · `canli-ty-ice-aktar`   — tur sırasında canlı yazım koşmasın (K162-②)
 *  İki yerde iki farklı ölçüt olmaz (anayasa); ikisi de BU gövdeyi okur.
 *
 *  CANLI kilit = dosya var + PID yaşıyor + 90 dakikadan genç. Ölü PID ya da
 *  bayat damga "canlı değil" sayılır — kill edilen bir turun kilidi çekimi
 *  sonsuza kadar durduramaz, bekçiyi de kilitleyemez.
 * ============================================================================
 */
export const KILIT = ".bekci-kilidi";
export const KILIT_BAYAT_MS = 90 * 60_000;

export function pidYasiyor(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    /** EPERM = süreç VAR ama dokunma iznimiz yok → yaşıyor sayılır. */
    return (e as NodeJS.ErrnoException).code === "EPERM";
  }
}

export type KilitDurumu =
  | { canli: true; pid: number; yasMs: number }
  | { canli: false; pid: number | null; yasMs: number | null };

export function kilitDurumu(): KilitDurumu {
  if (!existsSync(KILIT)) return { canli: false, pid: null, yasMs: null };
  const pid = parseInt(readFileSync(KILIT, "utf8").trim(), 10);
  const yasMs = Date.now() - statSync(KILIT).mtimeMs;
  const canli = Number.isFinite(pid) && pidYasiyor(pid) && yasMs < KILIT_BAYAT_MS;
  return canli ? { canli: true, pid, yasMs } : { canli: false, pid: Number.isFinite(pid) ? pid : null, yasMs };
}
