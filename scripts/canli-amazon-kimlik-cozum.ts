import { readFileSync } from "node:fs";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import readXlsxFile from "read-excel-file/node";

import { PrismaClient } from "../src/generated/prisma/client";
import { paketiNormalle } from "../src/lib/tablo/paket";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  BÜYÜK SATIŞ DOSYASINDAKİ AMAZON SATIRLARI — KİMLİK ÇÖZÜMÜ (SALT OKUMA)
 * ----------------------------------------------------------------------------
 *      npm run canli:amazon-kimlik
 *
 *  ⚠ ÖNCEKİ ÖLÇÜMÜM DAR KAPSAMLIYDI VE DÜZELTİLİYOR: "53 satır ASIN taşıyor,
 *  girilemez" sonucu `amazon satışlar.xlsx`ten çıkmıştı. AYNI SİPARİŞLER
 *  büyük `satis.xlsx` dosyasında da var ve orada SKU kolonu çoğunlukla
 *  BARKOD taşıyor. Kapsamı dar bir dosyadan çıkan sayı, geniş dosyadaki
 *  gerçeği temsil etmiyordu.
 *
 *  ⛔ HÜKÜM YOK, YAZMA YOK.
 * ============================================================================
 */

const SATIS_DOSYA = "C:/Users/yapra/Downloads/satis.xlsx";
/** Amazon sipariş no deseni: 3-7-7. TY (11 hane) ve HB (10 hane) ile karışmaz. */
const AMZ_DESEN = /^\d{3}-\d{7}-\d{7}$/;

const sayi = (h: unknown) => (Number.isFinite(Number(h)) ? Number(h) : 0);

async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) {
    console.log("\n⛔ CANLI ADRES OKUNAMADI\n");
    process.exitCode = 1;
    return;
  }
  const p = new PrismaClient({ adapter: new PrismaMariaDb(c.veri.ham) });

  const s = (await readXlsxFile(paketiNormalle(readFileSync(SATIS_DOSYA)).bayt))
    .find((x) => String(x.sheet).includes("SATIŞ"))!;
  const bas = s.data[5].map((h) => String(h ?? "").trim());
  const J = (ad: string) => {
    const i = bas.indexOf(ad);
    if (i < 0) throw new Error("KOLON YOK: " + ad + " — ölçüm KOŞMAZ.");
    return i;
  };
  const jSip = J("Sipariş Numarası");
  const jSku = J("SKU");
  const jBar = J("AXCALI BARKOD");
  const jPy = J("PAZAR YERI");
  const jTur = J("TÜR");
  const jUrun = J("Ürün");
  const jAdet = J("Satış Miktarı");
  const jTar = J("Tarih");
  const jListe = J("ÜRÜN LİSTE FİYATI");

  const veri = s.data.slice(6).filter((r) => String(r[jUrun] ?? "").trim() !== "");
  const amz = veri.filter((r) =>
    String(r[jPy] ?? "").trim().toUpperCase() === "AMZN" ||
    AMZ_DESEN.test(String(r[jSip] ?? "").trim()));

  const varyantlar = await p.productVariant.findMany({
    select: {
      id: true, sku: true, barcode: true, companySku: true,
      channelSkus: { select: { channelSku: true } },
      product: { select: { name: true } },
    },
  });
  const indeks = new Map<string, (typeof varyantlar)[number]>();
  for (const v of varyantlar) {
    for (const k of [v.sku, v.barcode, v.companySku, ...v.channelSkus.map((x) => x.channelSku)]) {
      if (k && k.trim() !== "") indeks.set(k.trim(), v);
    }
  }

  console.log("\n" + "=".repeat(104));
  console.log("BÜYÜK SATIŞ DOSYASINDAKİ AMAZON SATIRLARI — KİMLİK ÇÖZÜMÜ");
  console.log("=".repeat(104));
  console.log("\n   Amazon satırı: " + amz.length);

  const tur = new Map<string, number>();
  for (const r of amz) {
    const k = String(r[jTur] ?? "—").trim();
    tur.set(k, (tur.get(k) ?? 0) + 1);
  }
  console.log("   TÜR: " + [...tur].map(([k, n]) => k + "=" + n).join(" · "));

  const satisSatir = amz.filter((r) => String(r[jTur] ?? "").trim() === "satış");

  let cozulen = 0;
  let cozulmeyen = 0;
  let cozulenAdet = 0;
  let cozulenCiro = 0;
  const kalanlar: string[] = [];
  const asinDesen = /^B0[A-Z0-9]{8}$/;
  let asinSayisi = 0;

  for (const r of satisSatir) {
    const sku = String(r[jSku] ?? "").trim();
    const bar = String(r[jBar] ?? "").trim();
    if (asinDesen.test(sku)) asinSayisi++;
    const v = indeks.get(sku) ?? indeks.get(bar);
    if (v) {
      cozulen++;
      cozulenAdet += sayi(r[jAdet]);
      cozulenCiro += sayi(r[jListe]) * sayi(r[jAdet]);
    } else {
      cozulmeyen++;
      kalanlar.push(String(r[jSip]).padEnd(22) + (sku || "(BOŞ)").padEnd(16) +
        (bar || "—").padEnd(15) + String(r[jUrun]).slice(0, 40));
    }
  }

  console.log("\n   SKU kolonu ASIN deseninde (B0…): " + asinSayisi + " / " + satisSatir.length);
  console.log("\n   ✓ KİMLİĞİ ÇÖZÜLEN   : " + cozulen + " / " + satisSatir.length +
    "   ·   " + cozulenAdet + " adet   ·   " + cozulenCiro.toFixed(2) + " TL");
  console.log("   ⛔ ÇÖZÜLMEYEN        : " + cozulmeyen + " / " + satisSatir.length);
  for (const k of kalanlar) console.log("      " + k);

  const tarih = satisSatir
    .map((r) => (r[jTar] instanceof Date ? (r[jTar] as Date) : new Date(String(r[jTar]))))
    .filter((d) => !Number.isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());
  console.log("\n   tarih aralığı: " + tarih[0].toISOString().slice(0, 10) +
    " → " + tarih[tarih.length - 1].toISOString().slice(0, 10));

  console.log("\n   ⛔ TEK ENGEL KALDI: AMZN satırları hangi Amazon HESABINA yazılacak?");
  const hesaplar = await p.channelAccount.findMany({
    where: { channel: { code: "AMAZON" } },
    select: { name: true, satisIcin: true, isActive: true },
  });
  for (const h of hesaplar) {
    console.log("      · " + h.name.padEnd(16) + "satışIçin=" + (h.satisIcin ? "EVET" : "hayır") +
      "  aktif=" + (h.isActive ? "evet" : "hayır"));
  }
  console.log("      Bu VERİDEN ÇIKMIYOR — dosyada hesap kolonu yok. Kullanıcı söylemeli.");

  console.log("\n" + "=".repeat(104));
  console.log("SALT OKUMA — HİÇBİR ŞEY YAZILMADI. HÜKÜM YOK.");
  console.log("=".repeat(104) + "\n");
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
