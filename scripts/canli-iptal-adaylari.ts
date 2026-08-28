import { readFileSync } from "node:fs";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import readXlsxFile from "read-excel-file/node";
import { PrismaClient } from "../src/generated/prisma/client";
import { paketiNormalle } from "../src/lib/tablo/paket";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  DOSYADA İPTAL, SİSTEMDE NORMAL — LİSTE (SALT OKUMA)
 * ----------------------------------------------------------------------------
 *      npm run canli:iptal-adaylari
 *
 *  Ölçüm 24 iptal satırından 5'inin sistemde NORMAL göründüğünü söylemişti
 *  ama KİMLİKLERİ yazılmamıştı. Bir sayı, gidilecek yeri söylemiyorsa
 *  bakılamaz (İlke #16).
 *
 *  ⛔ HÜKÜM YOK: "dosyada iptal yazıyor" bir iddiadır ve kullanıcı
 *  doğrulayacak. Bu liste bir DAVETTİR, karar değil.
 * ============================================================================
 */
const LISTE = "C:/Users/yapra/Desktop/excel/Unbenannte Tabelle.xlsx";
const n = (h: unknown) => (Number.isFinite(Number(h)) ? Number(h) : 0);

async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) { console.log("CANLI ADRES OKUNAMADI"); process.exitCode = 1; return; }
  const p = new PrismaClient({ adapter: new PrismaMariaDb(c.veri.ham) });
  const s = (await readXlsxFile(paketiNormalle(readFileSync(LISTE)).bayt))[0];
  const b = s.data[0].map((h) => String(h ?? "").trim());
  const i = (a: string) => b.indexOf(a);

  const iptalSatir = s.data.slice(1).filter((r) =>
    String(r[i("TÜR")] ?? "").trim() === "iptal" &&
    String(r[i("Sipariş Numarası")] ?? "").trim() !== "");

  const nolar = [...new Set(iptalSatir.map((r) => String(r[i("Sipariş Numarası")]).trim()))];
  const satislar = await p.sale.findMany({
    where: { code: { in: nolar } },
    select: { code: true, soldAt: true, iptalTarihi: true, profitStatus: true,
      net2Amount: true, importKaynak: true,
      channelAccount: { select: { name: true, channel: { select: { code: true } } } },
      items: { select: { quantity: true, unitPriceAmount: true,
        variant: { select: { sku: true, product: { select: { name: true } } } } } } },
  });
  const harita = new Map(satislar.map((x) => [x.code!, x]));

  console.log("\n" + "=".repeat(112));
  console.log("DOSYADA İPTAL · SİSTEMDE NORMAL — DOĞRULANACAK LİSTE (salt okuma)");
  console.log("=".repeat(112));
  console.log("\n   dosyadaki iptal satırı: " + iptalSatir.length +
    " · farklı sipariş: " + nolar.length);

  const normal = nolar.filter((no) => harita.has(no) && harita.get(no)!.iptalTarihi === null);
  const zatenIptal = nolar.filter((no) => harita.has(no) && harita.get(no)!.iptalTarihi !== null);
  console.log("     sistemde NORMAL : " + normal.length + "   ← aşağıda");
  console.log("     sistemde İPTAL  : " + zatenIptal.length);
  console.log("     sistemde YOK    : " + (nolar.length - normal.length - zatenIptal.length));

  console.log("\n   ⭐ BAKILACAK " + normal.length + " SATIŞ\n");
  for (const no of normal) {
    const x = harita.get(no)!;
    const dosyaSatir = iptalSatir.find((r) => String(r[i("Sipariş Numarası")]).trim() === no)!;
    const ciro = x.items.reduce((t, k) => t + Number(k.unitPriceAmount.toString()) * k.quantity, 0);
    console.log("   ● " + no + "   " + x.soldAt.toISOString().slice(0, 10) +
      "   " + (x.channelAccount.channel.code + " — " + x.channelAccount.name).padEnd(26));
    for (const k of x.items) {
      console.log("       " + k.variant.sku.padEnd(18) + String(k.quantity) + " adet · " +
        Number(k.unitPriceAmount.toString()).toFixed(2).padStart(10) + "   " +
        k.variant.product.name.slice(0, 44));
    }
    console.log("       sistem: ciro " + ciro.toFixed(2) + " · durum " + x.profitStatus +
      " · NET-2 " + (x.net2Amount?.toString() ?? "—") +
      " · kaynak " + (x.importKaynak ?? "elle") + "   ⛔ İPTAL DEĞİL");
    console.log("       dosya : TÜR=iptal · tutar " +
      Math.abs(n(dosyaSatir[i("ÜRÜN LİSTE FİYATI")])).toFixed(2) +
      " · tarih " + String(dosyaSatir[i("Tarih")]).slice(0, 24));
    console.log("");
  }

  const toplam = normal.reduce((t, no) => {
    const x = harita.get(no)!;
    return t + x.items.reduce((a, k) => a + Number(k.unitPriceAmount.toString()) * k.quantity, 0);
  }, 0);
  console.log("   TOPLAM CİRO (bu 5 satış): " + toplam.toFixed(2) + " TL");
  console.log("\n   ⛔ HÜKÜM YOK: 'dosyada iptal yazıyor' bir İDDİADIR.");
  console.log("     Gerçekten iptal edildilerse ciro bu kadar fazla; iptal");
  console.log("     DEĞİLLERSE dosyadaki etiket yanlış. Kullanıcı bakacak.");
  console.log("\nSALT OKUMA — HİÇBİR ŞEY YAZILMADI.\n");
  await p.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
