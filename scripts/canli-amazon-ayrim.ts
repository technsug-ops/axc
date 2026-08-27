import { readFileSync } from "node:fs";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import readXlsxFile from "read-excel-file/node";

import { PrismaClient } from "../src/generated/prisma/client";
import { paketiNormalle } from "../src/lib/tablo/paket";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  "AMAZON SATIŞLAR" DOSYASI — PAZAR YERİ × SİSTEMDE VAR MI (SALT OKUMA)
 * ----------------------------------------------------------------------------
 *      npm run canli:amazon-ayrim
 *
 *  ⛔ NİYE: dosyanın adı "amazon satışlar" ama içinde ÜÇ pazaryeri var
 *  (AMZN · TY · HB). Dosyayı topluca girmek, sistemde ZATEN duran TY/HB
 *  satışlarını İKİNCİ KEZ yazmak olurdu — ciro, KDV ve stopaj matrahı
 *  şişerdi ve stok iki kez düşerdi.
 *
 *  ⚠ DOSYA ADI BİR İDDİADIR, İÇERİĞİN NE OLDUĞUNU SÖYLEMEZ.
 *  Ayrım `PAZAR YERI` kolonundan ve sipariş no'nun sistemde bulunup
 *  bulunmamasından ÖLÇÜLÜR — dosya adından değil.
 *
 *  ⛔ HÜKÜM YOK, YAZMA YOK.
 * ============================================================================
 */

const DOSYA = "C:/Users/yapra/Downloads/amazon satışlar.xlsx";

const sayi = (h: unknown) => (Number.isFinite(Number(h)) ? Number(h) : 0);
const t2 = (n: number) => n.toFixed(2).padStart(13);

async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) {
    console.log("\n⛔ CANLI ADRES OKUNAMADI\n");
    process.exitCode = 1;
    return;
  }
  const p = new PrismaClient({ adapter: new PrismaMariaDb(c.veri.ham) });

  const s = (await readXlsxFile(paketiNormalle(readFileSync(DOSYA)).bayt))[0];
  const bas = s.data[0].map((h) => String(h ?? "").trim());
  const J = (ad: string) => {
    const i = bas.indexOf(ad);
    if (i < 0) throw new Error("KOLON YOK: " + ad + " — ölçüm KOŞMAZ.");
    return i;
  };
  const jSip = J("Sipariş Numarası");
  const jSku = J("SKU");
  const jPy = J("PAZAR YERI");
  const jUrun = J("Ürün");
  const jTur = J("TÜR");
  const jAdet = J("Satış Miktarı");
  const jTar = J("Tarih");
  const jListe = J("ÜRÜN LİSTE FİYATI");

  const satir = s.data.slice(1).filter((r) => String(r[jSip] ?? "").trim() !== "");
  const nolar = [...new Set(satir.map((r) => String(r[jSip]).trim()))];
  const sistemde = new Set(
    (await p.sale.findMany({ where: { code: { in: nolar } }, select: { code: true } }))
      .map((x) => x.code!),
  );

  console.log("\n" + "=".repeat(104));
  console.log("'amazon satışlar.xlsx' — PAZAR YERİ × SİSTEMDE VAR MI");
  console.log("=".repeat(104));

  type Kova = { satir: number; adet: number; ciro: number };
  const kova = new Map<string, Kova>();
  const ekle = (k: string, adet: number, ciro: number) => {
    const v = kova.get(k) ?? { satir: 0, adet: 0, ciro: 0 };
    v.satir++; v.adet += adet; v.ciro += ciro;
    kova.set(k, v);
  };

  for (const r of satir) {
    const py = String(r[jPy] ?? "—").trim();
    const tt = String(r[jTur] ?? "—").trim();
    const var_ = sistemde.has(String(r[jSip]).trim()) ? "SİSTEMDE VAR" : "sistemde yok";
    ekle(py + " │ " + tt.padEnd(6) + " │ " + var_, sayi(r[jAdet]), sayi(r[jListe]) * sayi(r[jAdet]));
  }

  console.log("\n   pazaryeri │ tür    │ durum          satır   adet          ciro");
  console.log("   " + "─".repeat(74));
  for (const [k, v] of [...kova].sort()) {
    console.log("   " + k.padEnd(38) + String(v.satir).padStart(5) +
      String(v.adet).padStart(7) + t2(v.ciro));
  }

  /** ⛔ GİRİLEBİLİR KÜME: yalnız AMZN + satış + sistemde YOK. */
  const girilebilir = satir.filter((r) =>
    String(r[jPy] ?? "").trim() === "AMZN" &&
    String(r[jTur] ?? "").trim() === "satış" &&
    !sistemde.has(String(r[jSip]).trim()));
  const gAdet = girilebilir.reduce((t, r) => t + sayi(r[jAdet]), 0);
  const gCiro = girilebilir.reduce((t, r) => t + sayi(r[jListe]) * sayi(r[jAdet]), 0);

  console.log("\n\n   ═══ GİRİLEBİLİR KÜME — AMZN + satış + sistemde YOK ═══");
  console.log("   satır " + girilebilir.length + "   ·   " + gAdet + " adet   ·   " +
    gCiro.toFixed(2) + " TL   (KDV DAHİL liste fiyatı tabanı)");

  const tarih = girilebilir
    .map((r) => (r[jTar] instanceof Date ? (r[jTar] as Date) : new Date(String(r[jTar]))))
    .sort((a, b) => a.getTime() - b.getTime());
  console.log("   tarih aralığı: " + tarih[0].toISOString().slice(0, 10) +
    " → " + tarih[tarih.length - 1].toISOString().slice(0, 10));

  /** Kimliği çözülmeyen satır GİRİLEMEZ — hangi varyanta yazılacağı belirsizdir. */
  const varyantlar = await p.productVariant.findMany({
    select: { id: true, sku: true, barcode: true, companySku: true,
      channelSkus: { select: { channelSku: true } } },
  });
  const indeks = new Set<string>();
  for (const v of varyantlar) {
    for (const k of [v.sku, v.barcode, v.companySku, ...v.channelSkus.map((x) => x.channelSku)]) {
      if (k && k.trim() !== "") indeks.add(k.trim());
    }
  }
  const cozulen = girilebilir.filter((r) => indeks.has(String(r[jSku] ?? "").trim()));
  const cozulmeyen = girilebilir.filter((r) => !indeks.has(String(r[jSku] ?? "").trim()));
  console.log("\n   kimliği ÇÖZÜLEN   : " + cozulen.length + " satır · " +
    cozulen.reduce((t, r) => t + sayi(r[jAdet]), 0) + " ad · " +
    cozulen.reduce((t, r) => t + sayi(r[jListe]) * sayi(r[jAdet]), 0).toFixed(2) + " TL");
  console.log("   kimliği ÇÖZÜLMEYEN: " + cozulmeyen.length + " satır · " +
    cozulmeyen.reduce((t, r) => t + sayi(r[jAdet]), 0) + " ad · " +
    cozulmeyen.reduce((t, r) => t + sayi(r[jListe]) * sayi(r[jAdet]), 0).toFixed(2) + " TL");
  console.log("   ⛔ Çözülmeyenler ASIN kodudur (B0…). Kanal SKU olarak tanımlanmadan");
  console.log("     hangi varyanta yazılacağı belirsizdir — girilemez, önce eşleştirilir.");
  for (const r of cozulmeyen.slice(0, 8)) {
    console.log("       " + String(r[jSku]).padEnd(16) + String(r[jUrun]).slice(0, 52));
  }

  console.log("\n" + "=".repeat(104));
  console.log("SALT OKUMA — HİÇBİR ŞEY YAZILMADI. HÜKÜM YOK.");
  console.log("=".repeat(104) + "\n");
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
