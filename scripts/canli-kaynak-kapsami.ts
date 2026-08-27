import { readFileSync } from "node:fs";
import readXlsxFile from "read-excel-file/node";
import { paketiNormalle } from "../src/lib/tablo/paket";

/**
 * KAYNAK KAPSAMI — satış dosyası hangi dönemi görüyor?
 * ⛔ "İz bulunamadı" hükmü ancak kaynağın O DÖNEMİ gördüğü biliniyorsa kurulur.
 */
const SATIS_DOSYA = "C:/Users/yapra/Downloads/satis.xlsx";

async function main() {
  const s = (await readXlsxFile(paketiNormalle(readFileSync(SATIS_DOSYA)).bayt))
    .find((x) => String(x.sheet).includes("SATIŞ"))!;
  const bas = s.data[5].map((h) => String(h ?? "").trim());
  console.log("\nBAŞLIKLAR: " + bas.filter((b) => b !== "").join(" | "));
  const jTar = bas.findIndex((b) => /tarih/i.test(b));
  const jUrun = bas.indexOf("Ürün");
  const satir = s.data.slice(6).filter((r) => String(r[jUrun] ?? "").trim() !== "");
  console.log("\nsatır: " + satir.length + "   ·   tarih kolonu: [" + jTar + "] " + bas[jTar]);

  const aylar = new Map<string, number>();
  for (const r of satir) {
    const ham = r[jTar];
    const d = ham instanceof Date ? ham : new Date(String(ham));
    const ay = Number.isNaN(d.getTime()) ? "OKUNAMADI" : d.toISOString().slice(0, 7);
    aylar.set(ay, (aylar.get(ay) ?? 0) + 1);
  }
  console.log("\nAY BAŞINA SATIR:");
  for (const [ay, n] of [...aylar].sort()) console.log("  " + ay + "   " + String(n).padStart(5));

  const tyBas = new Date(Date.now() - 90 * 86400_000);
  console.log("\nTY API penceresi (son 90 gün): " + tyBas.toISOString().slice(0, 10) + " → bugün");
  console.log("⛔ Bu tarihten ÖNCEKİ TY satışları için API bir kaynak DEĞİLDİR.");
  console.log("⛔ HB için hiçbir dönemde okuma API'si YOK.\n");
}
main().catch((e) => { console.error(e); process.exit(1); });
