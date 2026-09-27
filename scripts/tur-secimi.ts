import { existsSync, readFileSync } from "node:fs";
import { dirname, join, normalize } from "node:path";

import { gercekHedefler, harnessDosyaYolu } from "./mutasyon-hedefleri";

/**
 * ============================================================================
 *  TUR SEÇİMİ — PUSH'TA HANGİ MUTASYON DENETİMİ KOŞAR (K290, 27.09.2026)
 * ----------------------------------------------------------------------------
 *  Kullanıcı kararı 27.09.2026: push başına 40–45 dk sürdürülemez. Yeni düzen:
 *    · push:   BÜTÜN bekçiler (davranış) + YALNIZ değişen dosyalara dokunan
 *              mutasyon denetimleri
 *    · gece:   TAM tur (her şey) + kırmızıda geriye tarama (`gece-turu.ts`)
 *  ⚠ ESKİ KARAR SİLİNMEDİ (CLAUDE.md, 22.08.2026: «BÜTÜN bekçiler, seçilmişler
 *  değil»). O kararın gerekçesi — kırmızı bekçinin günlerce fark edilmemesi —
 *  KORUNUYOR: bekçilerin hepsi yine her push'ta koşar; atlanan yalnız
 *  dokunulmamış dosyaların mutasyon denetimidir ve o da her gece koşar.
 *
 *  ⛔ TEMEL SÖZ: değişen bir dosyaya dokunan denetim ASLA atlanmaz. Bu yüzden
 *  kural «emin değilsen KOŞ» yönünde kurulur:
 *    · değişen dosya listesi bilinmiyorsa           → HEPSİ
 *    · ortak altyapı değiştiyse (harness/tur/okuma)  → HEPSİ
 *    · denetimin bekçisi ya da hedefi çözülemiyorsa  → o denetim KOŞAR
 *  «Dokunmak»: denetimin BOZDUĞU dosya · denetimin kendi dosyası · bekçi
 *  dosyası · bekçinin içe aktardığı depo dosyaları (bir seviye).
 * ============================================================================
 */

/**
 * Değişince BÜTÜN mutasyon denetimlerinin koşması gereken ortak altyapı —
 * denetimlerin SONUCUNU değiştirebilen dosyalar (harness'lerin yazma/okuma
 * araçları, derleyici ayarı).
 * ⚠ ÖLÇÜLEREK DARALTILDI (27.09.2026): ilk hâlde `package.json` ve
 * `mutasyon-hedefleri.ts` de buradaydı; son 4 paketin (K285–K288) DÖRDÜNDE
 * de seçim «hepsi»ne düştü — her paket oraya yeni komut / sıralama satırı
 * ekliyor ve bu ekleme başka denetimin SONUCUNU değiştirmez, yalnız SIRASINI.
 * `bekci.ts` · `tur-secimi.ts` seçimi yönetir, sonucu değil; kendi bekçileri
 * her push'ta koşar.
 */
export const ORTAK_ALTYAPI: readonly string[] = [
  "scripts/mutasyon-deseni.ts",
  "scripts/kaynak-oku.ts",
  "tsconfig.json",
];

export type DenetimBagi = {
  ad: string;
  /** `null` = çözülemedi → KOŞAR. */
  dosyalar: string[] | null;
};

const yolu = (p: string) => normalize(p).replace(/\\/g, "/");

/** Bekçi dosyasının içe aktardığı DEPO dosyaları (bir seviye; `../src/...`, `./x`). */
export function iceAktarilanlar(dosya: string, metin: string): string[] {
  const cikti: string[] = [];
  for (const m of metin.matchAll(/from\s+"(\.{1,2}\/[^"]+)"/g)) {
    const taban = yolu(join(dirname(dosya), m[1]!));
    /* Uzantısız içe aktarmanın olası bütün karşılıkları eklenir — fazla kapsama zararsız, eksik kapsama değil. */
    if (/\.(ts|tsx|mjs|js)$/.test(taban)) cikti.push(taban);
    else cikti.push(`${taban}.ts`, `${taban}.tsx`, `${taban}/index.ts`);
  }
  return cikti;
}

/** Bir mutasyon denetiminin «dokunduğu» dosyalar; çözülemezse `null`. */
export function denetimBagi(npmAdi: string): DenetimBagi {
  try {
    const harness = harnessDosyaYolu(npmAdi);
    if (!existsSync(harness)) return { ad: npmAdi, dosyalar: null };
    const metin = readFileSync(harness, "utf8");
    const hedefler = gercekHedefler(harness);
    const bekci = metin.match(/^const\s+BEKCI\s*=\s*"([^"]+)"\s*;/m)?.[1] ?? null;
    if (hedefler.length === 0 || bekci === null || !existsSync(bekci)) return { ad: npmAdi, dosyalar: null };
    const dosyalar = new Set<string>([harness, bekci, ...hedefler].map(yolu));
    for (const d of iceAktarilanlar(bekci, readFileSync(bekci, "utf8"))) dosyalar.add(d);
    return { ad: npmAdi, dosyalar: [...dosyalar] };
  } catch {
    return { ad: npmAdi, dosyalar: null };
  }
}

export type Secim = { kos: string[]; atla: string[]; hepsiSebebi: string | null };

/**
 * SAF KARAR. `degisen === null` → değişiklik listesi bilinmiyor → HEPSİ.
 */
export function mutasyonSecimi(denetimler: readonly DenetimBagi[], degisen: readonly string[] | null): Secim {
  const hepsi = (sebep: string): Secim => ({ kos: denetimler.map((d) => d.ad), atla: [], hepsiSebebi: sebep });
  if (degisen === null) return hepsi("değişen dosya listesi bilinmiyor");
  const kume = new Set(degisen.map(yolu));
  const altyapi = ORTAK_ALTYAPI.find((a) => kume.has(a));
  if (altyapi) return hepsi(`ortak altyapı değişti: ${altyapi}`);
  const kos: string[] = [];
  const atla: string[] = [];
  for (const d of denetimler) {
    if (d.dosyalar === null || d.dosyalar.some((f) => kume.has(f))) kos.push(d.ad);
    else atla.push(d.ad);
  }
  return { kos, atla, hepsiSebebi: null };
}
