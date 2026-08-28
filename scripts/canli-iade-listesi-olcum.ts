import { readFileSync } from "node:fs";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import readXlsxFile from "read-excel-file/node";
import { PrismaClient } from "../src/generated/prisma/client";
import { paketiNormalle } from "../src/lib/tablo/paket";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  KULLANICININ İADE LİSTESİ — SİSTEMDEKİ KARŞILIĞI (SALT OKUMA)
 * ----------------------------------------------------------------------------
 *  Kullanıcı 28.08.2026 `Unbenannte Tabelle.xlsx` ile ters satırların
 *  tam listesini verdi: 391 satır.
 *
 *  ⚠ SAYIM UYUŞMAZLIĞI ÇÖZÜLDÜ: kullanıcı "256" demişti, benim ölçümüm
 *  `ÜRÜN ALIŞ FİYATI` sütununda 391 diyordu. Listenin kendisi 391 satır —
 *  yani ölçüm doğruydu. Rakamı liste kapattı, tartışma değil.
 *  _(Anayasa: "iki çelişen rakam yan yana bırakılmaz; kaynağıyla yazılır
 *  ve hangisinin geçerli olduğu söylenir.")_
 * ============================================================================
 */
const D = "C:/Users/yapra/Desktop/excel/Unbenannte Tabelle.xlsx";
const n = (h: unknown) => (Number.isFinite(Number(h)) ? Number(h) : 0);
const t2 = (x: number) => x.toFixed(2).padStart(14);

async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) { console.log("CANLI ADRES OKUNAMADI"); process.exitCode = 1; return; }
  const p = new PrismaClient({ adapter: new PrismaMariaDb(c.veri.ham) });
  const s = (await readXlsxFile(paketiNormalle(readFileSync(D)).bayt))[0];
  const b = s.data[0].map((h) => String(h ?? "").trim());
  const i = (a: string) => b.indexOf(a);
  const veri = s.data.slice(1).filter((r) => String(r[i("Sipariş Numarası")] ?? "").trim() !== "");

  console.log("\n" + "=".repeat(100));
  console.log("İADE LİSTESİ — SİSTEMDEKİ KARŞILIĞI (salt okuma)");
  console.log("=".repeat(100));
  console.log("\n   liste satırı: " + veri.length);
  const tur = new Map<string, number>();
  for (const r of veri) { const k = String(r[i("TÜR")] ?? "—").trim(); tur.set(k, (tur.get(k) ?? 0) + 1); }
  console.log("   TÜR: " + [...tur].map(([k, v]) => k + "=" + v).join(" · "));
  console.log("   iade tutarı (|liste fiyatı|): " +
    t2(veri.reduce((t, r) => t + Math.abs(n(r[i("ÜRÜN LİSTE FİYATI")])), 0)));

  const nolar = [...new Set(veri.map((r) => String(r[i("Sipariş Numarası")]).trim()))];
  const sale = new Map<string, { id: string; iptal: Date | null; ciro: number; durum: string | null }>();
  for (let k = 0; k < nolar.length; k += 400) {
    for (const x of await p.sale.findMany({
      where: { code: { in: nolar.slice(k, k + 400) } },
      select: { id: true, code: true, iptalTarihi: true, profitStatus: true,
        items: { select: { quantity: true, unitPriceAmount: true } } },
    })) {
      sale.set(x.code!, { id: x.id, iptal: x.iptalTarihi, durum: x.profitStatus,
        ciro: x.items.reduce((t, y) => t + Number(y.unitPriceAmount.toString()) * y.quantity, 0) });
    }
  }
  const iadeli = new Set((await p.returnNotice.findMany({
    where: { sale: { code: { in: nolar } } }, select: { sale: { select: { code: true } } },
  })).map((x) => x.sale.code!));

  let varIadeYok = 0, varIadeVar = 0, iptal = 0, yok = 0;
  let fazlaCiro = 0;
  for (const no of nolar) {
    const x = sale.get(no);
    if (!x) { yok++; continue; }
    if (x.iptal) { iptal++; continue; }
    if (iadeli.has(no)) { varIadeVar++; continue; }
    varIadeYok++;
    fazlaCiro += x.ciro;
  }
  console.log("\n   farklı sipariş: " + nolar.length);
  console.log("     ⛔ satış VAR, iade kaydı YOK : " + varIadeYok + "   ciro " + t2(fazlaCiro));
  console.log("        satış var, iade kaydı var  : " + varIadeVar);
  console.log("        satış İPTAL edilmiş        : " + iptal);
  console.log("        satış sistemde YOK         : " + yok);
  console.log("\n   ⚠ 'ciro' sütunu o satışların TAMAMININ cirosudur — iadenin");
  console.log("     tutarı DEĞİL. Fazla yazılan ciroyu bulmak için iade edilen");
  console.log("     KALEM eşleştirilmeli; bu ayrı bir ölçüm.");
  console.log("\nSALT OKUMA — HİÇBİR ŞEY YAZILMADI. HÜKÜM YOK.\n");
  await p.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
