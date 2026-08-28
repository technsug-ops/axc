import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import { canliYapilandirma } from "./canli-ortak";

/**
 * YAZIM SONRASI — NE DEGISTI. SALT OKUMA.
 * ⛔ Once/sonra TOPLAMLARI karsilastirilamaz: 2443 satisin net2'si YOKTU,
 *    simdi VAR. Kume degisti, oran degil. Bu yuzden komisyonun etkisi
 *    dogrudan SaleFee'den olculuyor.
 */
const t2 = (n: number) => n.toFixed(2).padStart(15);
async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) { console.log("CANLI ADRES OKUNAMADI"); process.exitCode = 1; return; }
  const p = new PrismaClient({ adapter: new PrismaMariaDb(c.veri.ham) });

  console.log("\n① KOMISYON — fiilen dusulen (SaleFee)");
  const kom = await p.saleFee.aggregate({ where: { code: "KOMISYON" }, _sum: { amount: true }, _count: true });
  console.log("   kayit " + kom._count + " · toplam " + t2(Number(kom._sum.amount?.toString() ?? 0)));
  console.log("   ⚠ Kuru kosum tahmini: 1.811.040,15 (KDV haric) / 1.979.025,43 (HB KDV'li)");

  console.log("\n② MALIYET — CALCULATED satislarda sifir mi");
  const mal = await p.saleFee.findMany({ where: { code: "MALIYET" }, select: { amount: true, saleId: true } });
  const sifir = mal.filter((x) => Number(x.amount.toString()) === 0);
  console.log("   MALIYET kalemi " + mal.length + " · SIFIR olan " + sifir.length +
    "  (" + ((sifir.length / Math.max(1, mal.length)) * 100).toFixed(1) + "%)");
  console.log("   toplam maliyet " + t2(mal.reduce((t, x) => t + Number(x.amount.toString()), 0)));
  console.log("   ⚠ MALIYET=0 demek 'bedava mal' demek DEGIL, 'FIFO partisi baglanmamis' demek.");
  console.log("     O satislarda net2 maliyet dusulmeden hesaplaniyor ve OLDUGUNDAN YUKSEK.");

  console.log("\n③ MARJ — maliyeti OLAN ve OLMAYAN ayri");
  const s = await p.sale.findMany({
    where: { iptalTarihi: null, profitStatus: "CALCULATED" },
    select: { net2Amount: true, items: { select: { quantity: true, unitPriceAmount: true } },
      fees: { where: { code: "MALIYET" }, select: { amount: true } } },
  });
  let aC = 0, aN = 0, aS = 0, bC = 0, bN = 0, bS = 0;
  for (const x of s) {
    const ciro = x.items.reduce((t, i) => t + Number(i.unitPriceAmount.toString()) * i.quantity, 0);
    const n2 = Number(x.net2Amount?.toString() ?? 0);
    const maliyet = x.fees.reduce((t, f) => t + Number(f.amount.toString()), 0);
    if (maliyet > 0) { aC += ciro; aN += n2; aS++; } else { bC += ciro; bN += n2; bS++; }
  }
  console.log("   maliyeti OLAN  : " + String(aS).padStart(5) + " satis · ciro " + t2(aC) +
    " · net2 " + t2(aN) + "  marj " + (aC > 0 ? ((aN / aC) * 100).toFixed(2) : "—") + "%");
  console.log("   maliyeti YOK   : " + String(bS).padStart(5) + " satis · ciro " + t2(bC) +
    " · net2 " + t2(bN) + "  marj " + (bC > 0 ? ((bN / bC) * 100).toFixed(2) : "—") + "%  ⚠ SISIK");

  console.log("\n④ ORANI HALA BOS KALEM");
  const bos = await p.saleItem.count({ where: { commissionRate: null, sale: { iptalTarihi: null } } });
  const hepsi = await p.saleItem.count({ where: { sale: { iptalTarihi: null } } });
  console.log("   " + bos + " / " + hepsi);
  const kova = new Map<string, number>();
  for (const k of await p.saleItem.findMany({
    where: { commissionRate: null, sale: { iptalTarihi: null } },
    select: { sale: { select: { channelAccount: { select: { channel: { select: { code: true } } } } } } },
  })) {
    const kk = k.sale.channelAccount.channel.code;
    kova.set(kk, (kova.get(kk) ?? 0) + 1);
  }
  for (const [k, n] of kova) console.log("     " + k.padEnd(14) + n);

  console.log("\n⑤ KOR KOVA — yalniz komisyon eksik (K67 ② kovasi)");
  const girisli = new Set((await p.stockMovement.findMany({
    where: { saleItemId: { not: null } }, select: { saleItemId: true },
  })).map((h) => h.saleItemId!));
  const kalemler = await p.saleItem.findMany({
    where: { sale: { iptalTarihi: null } }, select: { id: true, commissionRate: true },
  });
  let yalnizKom = 0, yalnizMal = 0, ikisi = 0, tam = 0;
  for (const k of kalemler) {
    const m = girisli.has(k.id), o = k.commissionRate !== null;
    if (m && o) tam++; else if (m && !o) yalnizKom++; else if (!m && o) yalnizMal++; else ikisi++;
  }
  console.log("   tam " + tam + " · yalniz komisyon eksik " + yalnizKom +
    " · yalniz maliyet eksik " + yalnizMal + " · ikisi de " + ikisi);
  console.log("\nSALT OKUMA — HICBIR SEY YAZILMADI.\n");
  await p.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
