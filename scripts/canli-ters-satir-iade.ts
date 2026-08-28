import { readFileSync } from "node:fs";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import readXlsxFile from "read-excel-file/node";
import { PrismaClient } from "../src/generated/prisma/client";
import { paketiNormalle } from "../src/lib/tablo/paket";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  TERS SATIRLA KAPATILMIŞ İADELER — KAPSAM ÖLÇÜMÜ (SALT OKUMA)
 * ----------------------------------------------------------------------------
 *  ⚠ Kullanıcı 28.08.2026: _"iadeleri daha önce ters işlem yani negatif
 *  tutarla kapattım."_ Yani dosyada iade bir SATIŞ SATIRI olarak, negatif
 *  tutarla duruyor.
 *
 *  ⛔ SORU: içe aktarma bunları ne yaptı? `if (s.adet <= 0) continue`
 *  kapısı ADEDE bakıyor — adedi negatif olan satır ELENDİ (`adetSifir`),
 *  ama adedi pozitif / fiyatı negatif olan GEÇTİ (11265267349 vakası).
 *
 *  ⚠ VE ASIL RİSK ŞU: iade satırı elenip SATIŞ satırı geçtiyse, ciro
 *  fazladan yazılmış demektir — mal geri geldi, defter hâlâ satılmış
 *  sayıyor.
 * ============================================================================
 */
const D = "C:/Users/yapra/Desktop/excel/satis.xlsx";
const n = (h: unknown) => (Number.isFinite(Number(h)) ? Number(h) : 0);
const t2 = (x: number) => x.toFixed(2).padStart(14);

async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) { console.log("CANLI ADRES OKUNAMADI"); process.exitCode = 1; return; }
  const p = new PrismaClient({ adapter: new PrismaMariaDb(c.veri.ham) });

  const s = (await readXlsxFile(paketiNormalle(readFileSync(D)).bayt))
    .find((x) => String(x.sheet).includes("SATIŞ"))!;
  const b = s.data[5].map((h) => String(h ?? "").trim());
  const i = (a: string) => b.indexOf(a);
  const veri = s.data.slice(6).filter((r) => String(r[i("Ürün")] ?? "").trim() !== "");

  const negAdet = veri.filter((r) => n(r[i("Satış Miktarı")]) < 0);
  const negFiyat = veri.filter((r) => n(r[i("ÜRÜN LİSTE FİYATI")]) < 0);
  const ters = veri.filter((r) =>
    n(r[i("Satış Miktarı")]) < 0 || n(r[i("ÜRÜN LİSTE FİYATI")]) < 0);

  console.log("\n" + "=".repeat(100));
  console.log("TERS SATIRLA KAPATILMIŞ İADELER — KAPSAM (salt okuma)");
  console.log("=".repeat(100));
  console.log("\n   dosya satırı           : " + veri.length);
  console.log("   negatif ADET           : " + negAdet.length);
  console.log("   negatif FİYAT          : " + negFiyat.length);
  console.log("   ⭐ TERS SATIR (biri/ikisi): " + ters.length);
  console.log("   ters satırların tutarı : " +
    t2(ters.reduce((t, r) => t + n(r[i("ÜRÜN LİSTE FİYATI")]) * Math.abs(n(r[i("Satış Miktarı")])), 0)));

  const tur = new Map<string, number>();
  for (const r of ters) {
    const k = String(r[i("TÜR")] ?? "—").trim();
    tur.set(k, (tur.get(k) ?? 0) + 1);
  }
  console.log("\n   TÜR dağılımı: " + [...tur].map(([k, v]) => k + "=" + v).join(" · "));

  /** ⛔ ASIL SORU: ters satırın SATIŞI sistemde var mı, İADESİ yok mu? */
  const nolar = [...new Set(ters.map((r) => String(r[i("Sipariş Numarası")] ?? "").trim()).filter((x) => x !== ""))];
  const sistemde = new Map<string, { id: string; iptal: Date | null; kalem: number; ciro: number }>();
  for (let k = 0; k < nolar.length; k += 400) {
    for (const x of await p.sale.findMany({
      where: { code: { in: nolar.slice(k, k + 400) } },
      select: { id: true, code: true, iptalTarihi: true,
        items: { select: { quantity: true, unitPriceAmount: true } } },
    })) {
      sistemde.set(x.code!, { id: x.id, iptal: x.iptalTarihi, kalem: x.items.length,
        ciro: x.items.reduce((t, y) => t + Number(y.unitPriceAmount.toString()) * y.quantity, 0) });
    }
  }
  const iadeBildirimi = new Set(
    (await p.returnNotice.findMany({
      where: { sale: { code: { in: nolar } } }, select: { sale: { select: { code: true } } },
    })).map((x) => x.sale.code!),
  );

  let satisVarIadeYok = 0, satisYok = 0, iptalli = 0, iadesiVar = 0;
  const liste: string[] = [];
  for (const no of nolar) {
    const sat = sistemde.get(no);
    if (!sat) { satisYok++; continue; }
    if (sat.iptal) { iptalli++; continue; }
    if (iadeBildirimi.has(no)) { iadesiVar++; continue; }
    satisVarIadeYok++;
    if (liste.length < 20) {
      liste.push(no.padEnd(14) + "kalem " + sat.kalem + " · ciro " + sat.ciro.toFixed(2).padStart(11));
    }
  }
  console.log("\n   ⭐ TERS SATIRI OLAN SİPARİŞLERİN SİSTEMDEKİ HÂLİ (" + nolar.length + " sipariş)");
  console.log("     ⛔ satış VAR, iade kaydı YOK : " + satisVarIadeYok + "   ← ciro FAZLA yazılmış olabilir");
  console.log("     satış var, iade bildirimi var: " + iadesiVar);
  console.log("     satış İPTAL edilmiş           : " + iptalli);
  console.log("     satış sistemde YOK            : " + satisYok);
  for (const x of liste) console.log("       " + x);

  console.log("\n   ⚠ HÜKÜM YOK: 'iade kaydı yok' demek, o iadenin yaşanmadığı");
  console.log("     anlamına gelmez — kullanıcı onu ters satırla kapatmış ve");
  console.log("     sistem o satırı hiç almamış olabilir.");
  console.log("\nSALT OKUMA — HİÇBİR ŞEY YAZILMADI.\n");
  await p.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
