import { readFileSync } from "node:fs";
import readXlsxFile from "read-excel-file/node";
import { paketiNormalle } from "../src/lib/tablo/paket";

/**
 * AMAZON SATIŞ DOSYASI — MUAYENE. SALT OKUMA.
 * ⛔ Hiçbir kolon adı VARSAYILMAZ: kolon başlığı bir İDDİADIR, içeriğin ne
 *    olduğunu söylemez. Önce ham başlıklar ve örnek satırlar dökülür.
 */
const DOSYA = "C:/Users/yapra/Downloads/amazon satışlar.xlsx";

async function main() {
  const sayfalar = await readXlsxFile(paketiNormalle(readFileSync(DOSYA)).bayt);
  console.log("\n" + "=".repeat(96));
  console.log("AMAZON SATIŞ DOSYASI — MUAYENE");
  console.log("=".repeat(96));
  console.log("\nsayfa sayısı: " + sayfalar.length);
  for (const s of sayfalar) {
    console.log("\n── sayfa '" + s.sheet + "' — " + s.data.length + " satır");
    for (let i = 0; i < Math.min(6, s.data.length); i++) {
      const hucreler = s.data[i].map((h, j) =>
        String(h ?? "").trim() === "" ? "" : "[" + j + "]" + String(h).slice(0, 26));
      console.log("  r" + i + ": " + hucreler.filter((x) => x !== "").join(" | ").slice(0, 300));
    }
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
