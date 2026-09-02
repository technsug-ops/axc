/**
 * İADE NOTLARININ GERÇEK ŞEKLİ — SALT OKUMA.
 * BETIK SINIFI: TEK_SEFERLIK — listede sebep gösterme kararı için.
 * Not biçimi VARSAYILMAZ: kaç notun kurallı kalıbı var, kaçı serbest metin?
 */
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) { console.log("yapılandırma yok"); process.exitCode = 1; return; }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");

  const hepsi = await prisma.return.findMany({
    select: { note: true, sale: { select: { code: true } } },
    orderBy: { occurredAt: "desc" },
  });
  const dolu = hepsi.filter((r) => (r.note ?? "").trim() !== "");
  const kalip = /^IADE_SEBEP\[kaynak:([^\]]+)\]:\s*«(.+)»$/;

  console.log("=".repeat(72));
  console.log("  İADE NOTLARI — ŞEKİL ÖLÇÜMÜ");
  console.log("=".repeat(72));
  console.log(`  toplam Return      : ${hepsi.length}`);
  console.log(`  notu DOLU          : ${dolu.length}`);
  console.log(`  notu BOŞ           : ${hepsi.length - dolu.length}`);

  const kalipli = dolu.filter((r) => kalip.test((r.note ?? "").trim()));
  const serbest = dolu.filter((r) => !kalip.test((r.note ?? "").trim()));
  console.log(`\n  ⭐ kurallı kalıp    : ${kalipli.length}`);
  console.log(`  ⚠ serbest metin    : ${serbest.length}`);

  console.log("\n  KURALLI OLANLAR (kalıptan çıkan sebep):");
  for (const r of kalipli) {
    const m = kalip.exec((r.note ?? "").trim());
    console.log(`    ${(r.sale?.code ?? "—").padEnd(14)} kaynak=${m?.[1]}  sebep="${m?.[2]}"`);
  }
  if (serbest.length > 0) {
    console.log("\n  ⚠ SERBEST METİN — kalıp ÇÖZEMEZ, ham gösterilmeli:");
    for (const r of serbest) {
      console.log(`    ${(r.sale?.code ?? "—").padEnd(14)} "${(r.note ?? "").slice(0, 70)}"`);
    }
  }
  console.log("\n  uzunluk: en uzun sebep metni =",
    Math.max(0, ...kalipli.map((r) => (kalip.exec((r.note ?? "").trim())?.[2] ?? "").length)),
    "karakter");
  console.log("=".repeat(72) + "\n");
  await prisma.$disconnect();
}
main().catch((e) => { console.error("HATA:", e instanceof Error ? e.stack : e); process.exitCode = 1; });
