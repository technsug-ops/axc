import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  MALIYET = 0  mi  "MALIYET YOK" mu — SALT OKUMA
 * ----------------------------------------------------------------------------
 *  ⛔ `kalemMaliyeti` BOS listede `null` DEGIL `0` donuyor:
 *
 *      for (const h of hareketler) { ... }   <- hic donmez
 *      return { maliyet: dortBasamak(0), paraBirimi };   <- 0
 *
 *  Yani "hic FIFO bagi yok" ile "maliyeti gercekten sifir" AYNI gorunuyor.
 *  Sonuc: kalem `CALCULATED` sayiliyor ve net2 maliyet dusulmeden yaziliyor.
 *
 *  ⚠ Bu, bugun duzelttigimiz `commissionRate` null-0 hatasinin KAR
 *  tarafindaki hali — ama TERS: orada null yaziliyordu, burada 0.
 * ============================================================================
 */
const t2 = (n: number) => n.toFixed(2).padStart(15);
async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) { console.log("CANLI ADRES OKUNAMADI"); process.exitCode = 1; return; }
  const p = new PrismaClient({ adapter: new PrismaMariaDb(c.veri.ham) });

  const hrk = new Set((await p.stockMovement.findMany({
    where: { saleItemId: { not: null } }, select: { saleItemId: true },
  })).map((h) => h.saleItemId!));

  const kalemler = await p.saleItem.findMany({
    where: { sale: { iptalTarihi: null } },
    select: { id: true, quantity: true, unitPriceAmount: true, profitStatus: true, net2Amount: true },
  });

  let hicHareket = 0, hareketli = 0, hicHareketCiro = 0, hicHareketNet2 = 0;
  const durum = new Map<string, number>();
  for (const k of kalemler) {
    const ciro = Number(k.unitPriceAmount.toString()) * k.quantity;
    if (hrk.has(k.id)) { hareketli++; continue; }
    hicHareket++;
    hicHareketCiro += ciro;
    if (k.net2Amount !== null) hicHareketNet2 += Number(k.net2Amount.toString());
    const d = k.profitStatus ?? "(bos)";
    durum.set(d, (durum.get(d) ?? 0) + 1);
  }

  console.log("\n" + "=".repeat(96));
  console.log("MALIYET SIFIR MI, YOK MU — TESHIS");
  console.log("=".repeat(96));
  console.log("\n① HIC STOK HAREKETI OLMAYAN KALEM (FIFO bagi yok)");
  console.log("   hareketi OLAN : " + hareketli);
  console.log("   hareketi YOK  : " + hicHareket + "   ciro " + t2(hicHareketCiro) +
    "   net2 " + t2(hicHareketNet2));
  console.log("\n   ⛔ BU KALEMLERIN KAR DURUMU — 'NO_COST' olmasi gerekirdi:");
  for (const [d, n] of [...durum].sort((a, b) => b[1] - a[1])) {
    console.log("     " + d.padEnd(18) + String(n).padStart(6) +
      (d === "CALCULATED" ? "   <-- YANLIS: maliyet 0 sayildi" : ""));
  }

  console.log("\n② MALIYET KALEMI 0 OLANLAR — hareketle karsilastir");
  const fee = await p.saleFee.findMany({
    where: { code: "MALIYET" },
    select: { amount: true, saleItemId: true },
  });
  let sifirVeHareketsiz = 0, sifirAmaHareketli = 0, sifirOlmayan = 0;
  for (const f of fee) {
    const s = Number(f.amount.toString()) === 0;
    if (!s) { sifirOlmayan++; continue; }
    if (f.saleItemId && hrk.has(f.saleItemId)) sifirAmaHareketli++;
    else sifirVeHareketsiz++;
  }
  console.log("   MALIYET kalemi toplam       : " + fee.length);
  console.log("   sifir DEGIL                 : " + sifirOlmayan);
  console.log("   SIFIR ve hareketi YOK       : " + sifirVeHareketsiz + "  <-- 'bilinmiyor' olmali");
  console.log("   SIFIR ama hareketi VAR      : " + sifirAmaHareketli +
    "  <-- gercekten 0 maliyetli parti (ya da damgasiz)");
  console.log("\n   ⚠ Ikisi ayni gorunuyor: SaleFee 'MALIYET=0' satiri her iki halde de");
  console.log("     yaziliyor. 'Bedava mal' ile 'maliyet bilinmiyor' ayirt edilemiyor.");

  console.log("\n③ ESIK NEYI SAYIYOR — marjSerhi vs panel");
  console.log("   `marjSerhi.kapsanmayanPay` MALIYET BAGINI olcuyor (giris hareketi var mi)");
  console.log("   ve `marjBasilabilirMi` esigi ona bakiyor — DOGRU olcut.");
  console.log("   ⚠ AMA O SERH YALNIZ /rapor EKRANINDA (`rapor/page.tsx:464`).");
  console.log("     PANEL kendi marjini `donemOrtalamaMarji` ile uretiyor ve o govde");
  console.log("     maliyet kapsamina HIC bakmiyor — yalniz NET-2'yi ciroya boluyor.");
  console.log("\nSALT OKUMA — HICBIR SEY YAZILMADI.\n");
  await p.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
