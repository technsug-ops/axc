/**
 * ============================================================================
 *  KÜÇÜK XLSX OKUYUCU — SEED İÇİN
 * ----------------------------------------------------------------------------
 *  .xlsx aslında zip'lenmiş XML'dir. Sadece seed sırasında, bilinen bir
 *  dosyayı okumak için kullanıldığından tam bir Excel kütüphanesi eklemeye
 *  gerek yok: paylaşılan metinler + hücre değerleri yeterli.
 *
 *  KAPSAM DIŞI: formüller, biçimler, tarih dönüşümü, birleştirilmiş hücreler.
 *  İleride içe/dışa aktarma modülü gelince (bkz. ARSIV.md) orada CSV
 *  kullanılacak; bu okuyucu tarife seed'ine özeldir.
 * ============================================================================
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** Satır dizisi; her satır sütun dizisi. Boş hücreler undefined kalır. */
export type Sayfa = (string | undefined)[][];

function xmlCoz(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function sutunIndeksi(ref: string): number {
  const harf = ref.match(/^[A-Z]+/)![0];
  let n = 0;
  for (const c of harf) n = n * 26 + (c.charCodeAt(0) - 64);
  return n - 1;
}

/**
 * Kitaptaki sayfaları ada göre döndürür.
 * Zip açmak için Windows'ta PowerShell'in Expand-Archive'ı kullanılır;
 * ek paket gerekmez.
 */
export function xlsxOku(dosya: string): Map<string, Sayfa> {
  const gecici = mkdtempSync(join(tmpdir(), "selliora-xlsx-"));
  try {
    execFileSync(
      "powershell",
      [
        "-NoProfile",
        "-Command",
        `Copy-Item -LiteralPath '${dosya}' -Destination '${gecici}\\k.zip' -Force; ` +
          `Expand-Archive -LiteralPath '${gecici}\\k.zip' -DestinationPath '${gecici}\\acik' -Force`,
      ],
      { stdio: "pipe" },
    );

    const kok = join(gecici, "acik");

    // --- paylaşılan metinler ---
    let metinler: string[] = [];
    try {
      const ss = readFileSync(join(kok, "xl", "sharedStrings.xml"), "utf8");
      metinler = [...ss.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((e) => {
        let s = "";
        // Bir <si> içinde birden fazla <t> olabilir (biçimli parçalar).
        for (const t of e[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)) s += t[1];
        return xmlCoz(s);
      });
    } catch {
      metinler = [];
    }

    // --- sayfa adı -> dosya eşlemesi ---
    const wb = readFileSync(join(kok, "xl", "workbook.xml"), "utf8");
    const rels = readFileSync(
      join(kok, "xl", "_rels", "workbook.xml.rels"),
      "utf8",
    );
    const hedefler = new Map<string, string>();
    for (const e of rels.matchAll(
      /<Relationship Id="([^"]*)"[^>]*Target="([^"]*)"/g,
    )) {
      hedefler.set(e[1], e[2]);
    }

    const sayfalar = new Map<string, Sayfa>();
    for (const e of wb.matchAll(
      /<sheet[^>]*name="([^"]*)"[^>]*r:id="([^"]*)"/g,
    )) {
      const ad = xmlCoz(e[1]);
      const hedef = hedefler.get(e[2]);
      if (!hedef) continue;

      const xml = readFileSync(join(kok, "xl", hedef), "utf8");
      const satirlar: Sayfa = [];

      for (const r of xml.matchAll(
        /<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g,
      )) {
        const no = Number(r[1]);
        const hucreler: (string | undefined)[] = [];
        for (const c of r[2].matchAll(/<c([^>]*)>([\s\S]*?)<\/c>/g)) {
          const ref = c[1].match(/r="([A-Z]+\d+)"/)?.[1];
          if (!ref) continue;
          const tip = c[1].match(/t="([^"]+)"/)?.[1];
          let deger: string | undefined;

          if (tip === "s") {
            const v = c[2].match(/<v>([\s\S]*?)<\/v>/)?.[1];
            if (v !== undefined) deger = metinler[Number(v)];
          } else if (tip === "inlineStr") {
            let s = "";
            for (const t of c[2].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)) s += t[1];
            deger = xmlCoz(s);
          } else {
            const v = c[2].match(/<v>([\s\S]*?)<\/v>/)?.[1];
            if (v !== undefined) deger = v;
          }

          if (deger !== undefined && deger.trim() !== "") {
            hucreler[sutunIndeksi(ref)] = deger.trim();
          }
        }
        if (hucreler.length) satirlar[no] = hucreler;
      }

      sayfalar.set(ad.trim(), satirlar);
    }

    return sayfalar;
  } finally {
    rmSync(gecici, { recursive: true, force: true });
  }
}

/**
 * Hücre metnini tutara çevirir.
 *   "₺1.124,48"          -> 1124.48   (TR biçimi: binlik nokta, ondalık virgül)
 *   "77.540000000000006" -> 77.54     (düz ondalık)
 * Çevrilemezse null döner — çağıran taraf o hücreyi ATLAR, sıfır saymaz.
 */
export function tutarCoz(ham: string | undefined): number | null {
  if (ham === undefined) return null;
  let s = ham.trim();
  if (s === "") return null;

  const trBicimi = s.includes("₺") || (s.includes(",") && !/^-?\d+(\.\d+)?$/.test(s));
  if (trBicimi) {
    s = s.replace(/₺/g, "").replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  }

  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}
