import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  CALCULATED AMA MALIYET BAGI YOK — GENEL TARAMA (SALT OKUMA)
 * ----------------------------------------------------------------------------
 *      npm run canli:calculated-maliyetsiz
 *
 *  ⛔ Tazeleme bittikten SONRA bu sayi SIFIR olmali. Sifir degilse bir
 *  KACIS mekanizmasi var ve olculmeli — "herhalde tazeleme ulasmadi"
 *  demek, olcmeden hukum vermek olurdu.
 * ============================================================================
 */
const t2 = (n: number) => n.toFixed(2).padStart(15);
async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) { console.log("CANLI ADRES OKUNAMADI"); process.exitCode = 1; return; }
  const p = new PrismaClient({ adapter: new PrismaMariaDb(c.veri.ham) });

  const hareketli = new Set((await p.stockMovement.findMany({
    where: { saleItemId: { not: null } }, select: { saleItemId: true },
  })).map((h) => h.saleItemId!));

  const kalemler = await p.saleItem.findMany({
    where: { sale: { iptalTarihi: null } },
    select: { id: true, saleId: true, quantity: true, unitPriceAmount: true,
      profitStatus: true, net2Amount: true,
      sale: { select: { code: true, soldAt: true, profitStatus: true } } },
  });

  let ihlalKalem = 0, ihlalCiro = 0, ihlalNet2 = 0;
  const ihlalSatis = new Set<string>();
  const ornek: string[] = [];
  const kalemDurum = new Map<string, number>();
  for (const k of kalemler) {
    if (hareketli.has(k.id)) continue;
    const d = k.profitStatus ?? "(bos)";
    kalemDurum.set(d, (kalemDurum.get(d) ?? 0) + 1);
    if (d !== "CALCULATED") continue;
    ihlalKalem++;
    ihlalCiro += Number(k.unitPriceAmount.toString()) * k.quantity;
    if (k.net2Amount !== null) ihlalNet2 += Number(k.net2Amount.toString());
    ihlalSatis.add(k.saleId);
    if (ornek.length < 10) {
      ornek.push((k.sale.code ?? "—").padEnd(14) + k.sale.soldAt.toISOString().slice(0, 10) +
        "  satisDurum=" + k.sale.profitStatus);
    }
  }

  console.log("\n" + "=".repeat(96));
  console.log("CALCULATED AMA MALIYET BAGI YOK — GENEL TARAMA");
  console.log("=".repeat(96));
  console.log("\n   iptalsiz kalem toplam       : " + kalemler.length);
  console.log("   maliyet bagi OLMAYAN kalem  : " + [...kalemDurum.values()].reduce((a, b) => a + b, 0));
  console.log("\n   BAGSIZ KALEMLERIN KALEM DURUMU:");
  for (const [d, n] of [...kalemDurum].sort((a, b) => b[1] - a[1])) {
    console.log("     " + d.padEnd(18) + String(n).padStart(6) +
      (d === "CALCULATED" ? "   <-- IHLAL" : ""));
  }
  console.log("\n   ⭐ IHLAL: " + ihlalKalem + " kalem · " + ihlalSatis.size + " satis");
  console.log("      ciro " + t2(ihlalCiro) + "   yazilmis net2 " + t2(ihlalNet2));
  if (ihlalKalem === 0) console.log("      ✓ SIFIR — kacis yok.");
  else for (const o of ornek) console.log("        " + o);

  /** ⚠ Hedef kume ile karsilastir: bu satislar tazelenecekler arasinda miydi? */
  const hedef = new Set<string>();
  for (const k of kalemler) if (!hareketli.has(k.id)) hedef.add(k.saleId);
  console.log("\n   tazeleme hedef kumesi (en az bir kalemi bagsiz satis): " + hedef.size);
  const ihlalHedefte = [...ihlalSatis].filter((s) => hedef.has(s)).length;
  console.log("   ihlalli satislarin " + ihlalHedefte + " / " + ihlalSatis.size + " tanesi HEDEF kumede");
  console.log("   ⚠ Hepsi hedefteyse KACIS YOK, kosum HENUZ ULASMAMIS demektir.");
  console.log("     Hedefte OLMAYAN varsa gercek bir kacis vardir ve sebebi aranir.");

  console.log("\nSALT OKUMA — HICBIR SEY YAZILMADI.\n");
  /**
   * ⛔ IHLAL VARSA CIKIS KODU 1 — "olcum ile karar arasindaki boru".
   * Rapor basip sifir donmek, kirmizi yanan ama durdurmayan bekci olurdu.
   * ⚠ Tazeleme KOSARKEN bu sayi gecici olarak sifirdan buyuktur; bu arac
   *   tazeleme BITTIKTEN sonra kosulmak uzere yazildi.
   */
  if (ihlalKalem > 0) process.exitCode = 1;

  await p.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
