import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";

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

/**
 * ============================================================================
 *  TURUN PENCERESİ — "İNDEKS TURUN İÇİNDE Mİ HAZIRLANDI" (K198, 09.09.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ NİYE: commit kapısı turu koşarken commit'i durduruyor — AMA `git add`i
 *  durdurmuyor. 09.09'da bu yaşandı: tur koşarken `git add -A` çalıştı ve
 *  indekse CANLI bir mutasyon girdi:
 *
 *      -    if (enSon === null || ms > enSon) enSon = ms;
 *      +    if (enSon === null) enSon = ms;
 *
 *  Kapı o anki commit'i reddetti, ama **zehirlenmiş indeks hayatta kaldı**.
 *  Tur bittikten sonra atılacak sıradan bir commit onu sessizce içine alırdı
 *  ve kapı o an açık olduğu için hiçbir şey söylemezdi. Koruma engellediği
 *  ANI koruyordu, sonrasını değil.
 *
 *  ⭐ ÖLÇÜT OLAYA DEĞİL HÂLE BAĞLANIR: "commit denendi mi" değil, **indeks
 *  ne zaman yazıldı**. Yeniden hesaplanabilir bir ölçüttür (`.git/index`
 *  damgası) ve kendini iyileştirir: indeks yeniden hazırlandığı an damga
 *  pencerenin dışına çıkar ve kapı susar.
 *  _(Anayasa: "geri alma yolu saklanan listeye değil yeniden hesaplanabilir
 *  ölçüte dayanır" — ve "ölçüt olaya değil hâle bağlanır".)_
 * ============================================================================
 */
export const SON_TUR = ".bekci-son-tur";

export type TurPenceresi = { basladi: number; bitti: number };

/** Tur biterken çağrılır — kilit SİLİNMEDEN ÖNCE mtime'ı okunmalıdır. */
export function sonTurPenceresiniYaz(basladiMs: number): void {
  writeFileSync(
    SON_TUR,
    JSON.stringify({ basladi: basladiMs, bitti: Date.now() }),
    "utf8",
  );
}

export function sonTurPenceresi(): TurPenceresi | null {
  try {
    if (!existsSync(SON_TUR)) return null;
    const o = JSON.parse(readFileSync(SON_TUR, "utf8")) as TurPenceresi;
    return Number.isFinite(o.basladi) && Number.isFinite(o.bitti) ? o : null;
  } catch {
    return null;
  }
}

/**
 * `.git/index` yolu.
 * ⚠ WORKTREE'DE `.git` BİR DOSYADIR ve gitdir'i gösterir; klasör varsayan
 * bir okuma orada sessizce "ölçemedim"e düşerdi.
 */
export function indeksYolu(): string | null {
  try {
    if (!existsSync(".git")) return null;
    if (statSync(".git").isDirectory()) return ".git/index";
    const e = /gitdir:\s*(.+)/.exec(readFileSync(".git", "utf8"));
    return e ? e[1].trim() + "/index" : null;
  } catch {
    return null;
  }
}

export type IndeksDurumu =
  | { olculdu: false; sebep: string }
  | { olculdu: true; supheli: boolean; indeksMs: number; pencere: TurPenceresi | null };

/**
 * ⚠ "ÖLÇEMEDİM" İLE "TEMİZ" AYRI DÖNER. Kapı ölçemediğini SÖYLER; sessizce
 * yeşil vermez. _(Anayasa: "boş sonuç ile temiz sonucu ayırt edemeyen
 * denetim, denetim değildir".)_
 */
export function indeksDurumu(): IndeksDurumu {
  const yol = indeksYolu();
  if (yol === null) return { olculdu: false, sebep: "`.git` çözülemedi" };
  if (!existsSync(yol)) {
    return { olculdu: false, sebep: "`.git/index` yok — hiç `git add` yapılmamış" };
  }
  const indeksMs = statSync(yol).mtimeMs;
  const pencere = sonTurPenceresi();
  if (pencere === null) {
    return { olculdu: true, supheli: false, indeksMs, pencere: null };
  }
  return {
    olculdu: true,
    supheli: indeksMs >= pencere.basladi && indeksMs <= pencere.bitti,
    indeksMs,
    pencere,
  };
}

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
