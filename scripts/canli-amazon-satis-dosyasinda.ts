import { readFileSync } from "node:fs";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import readXlsxFile from "read-excel-file/node";

import { PrismaClient } from "../src/generated/prisma/client";
import { paketiNormalle } from "../src/lib/tablo/paket";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  AMAZON SATIŞLARI BÜYÜK SATIŞ DOSYASINDA MI — SALT OKUMA
 * ----------------------------------------------------------------------------
 *      npm run canli:amazon-dosyada
 *
 *  ⚠ SORU (kullanıcı, 28.08): "Amazon satışları zaten verdiğim satış
 *  listesinde olmalı — yanlış mıyım, yoksa bunları içeri aldık mı?"
 *
 *  ⛔ ÜÇ AYRI ŞEY SORULUYOR VE ÜÇÜ AYRI ÖLÇÜLÜR:
 *    ① `satis.xlsx` Amazon satırı TAŞIYOR MU
 *    ② taşıyorsa, bu satırlar SİSTEME GİRMİŞ Mİ
 *    ③ girmemişse NEDEN — kimlik mi çözülmedi, kanal mı tanınmadı
 *
 *  "İçeri aldık" ile "dosyada vardı" aynı şey değildir: bir satır dosyada
 *  bulunup içe aktarmada elenmişse, sistemde YOK ama kullanıcı VAR sanır.
 *
 *  ⛔ HÜKÜM YOK, YAZMA YOK.
 * ============================================================================
 */

const SATIS_DOSYA = "C:/Users/yapra/Downloads/satis.xlsx";
const AMZ_DOSYA = "C:/Users/yapra/Downloads/amazon satışlar.xlsx";

const sayi = (h: unknown) => (Number.isFinite(Number(h)) ? Number(h) : 0);

async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) {
    console.log("\n⛔ CANLI ADRES OKUNAMADI\n");
    process.exitCode = 1;
    return;
  }
  const p = new PrismaClient({ adapter: new PrismaMariaDb(c.veri.ham) });

  // ── Büyük satış dosyası ────────────────────────────────────────────────
  const s = (await readXlsxFile(paketiNormalle(readFileSync(SATIS_DOSYA)).bayt))
    .find((x) => String(x.sheet).includes("SATIŞ"))!;
  const bas = s.data[5].map((h) => String(h ?? "").trim());
  const jSip = bas.indexOf("Sipariş Numarası");
  const jUrun = bas.indexOf("Ürün");
  const jSku = bas.indexOf("SKU");
  const jAdet = bas.indexOf("Satış Miktarı");
  const jPy = bas.findIndex((b) => /pazar\s*yeri/i.test(b));
  const veri = s.data.slice(6).filter((r) => String(r[jUrun] ?? "").trim() !== "");

  console.log("\n" + "=".repeat(104));
  console.log("AMAZON SATIŞLARI BÜYÜK SATIŞ DOSYASINDA MI");
  console.log("=".repeat(104));

  console.log("\n① BÜYÜK DOSYANIN KOLONLARI");
  console.log("   " + bas.filter((b) => b !== "").join(" | "));
  console.log("\n   satır: " + veri.length +
    "   ·   PAZAR YERI kolonu: " + (jPy < 0 ? "⛔ YOK" : "[" + jPy + "] " + bas[jPy]));

  if (jPy >= 0) {
    const py = new Map<string, number>();
    for (const r of veri) {
      const k = String(r[jPy] ?? "—").trim() || "(BOŞ)";
      py.set(k, (py.get(k) ?? 0) + 1);
    }
    console.log("\n   PAZAR YERİ DAĞILIMI:");
    for (const [k, n] of [...py].sort((a, b) => b[1] - a[1])) {
      console.log("     " + k.padEnd(14) + String(n).padStart(6) + " satır");
    }
  }

  /**
   * ⛔ KİMLİK ÖLÇÜTÜ: Amazon sipariş numarası `3-7-7` haneli desenlidir
   * (`403-5885920-6288341`). Bu desen TY (11 hane) ve HB (10 hane) ile
   * karışmaz — biçim burada kimlik yerine geçebilir çünkü ayraç taşıyor.
   */
  const amzDesen = /^\d{3}-\d{7}-\d{7}$/;
  const buyukAmz = veri.filter((r) => amzDesen.test(String(r[jSip] ?? "").trim()));
  console.log("\n② BÜYÜK DOSYADA AMAZON DESENLİ SİPARİŞ NO");
  console.log("   " + buyukAmz.length + " satır   (desen 3-7-7, ör. 403-5885920-6288341)");

  // ── Amazon dosyası ─────────────────────────────────────────────────────
  const a = (await readXlsxFile(paketiNormalle(readFileSync(AMZ_DOSYA)).bayt))[0];
  const aBas = a.data[0].map((h) => String(h ?? "").trim());
  const aSip = aBas.indexOf("Sipariş Numarası");
  const aPy = aBas.indexOf("PAZAR YERI");
  const aTur = aBas.indexOf("TÜR");
  const aSku = aBas.indexOf("SKU");
  const aUrun = aBas.indexOf("Ürün");
  const aAdet = aBas.indexOf("Satış Miktarı");
  const aSatir = a.data.slice(1).filter((r) => String(r[aSip] ?? "").trim() !== "");
  const amzSatis = aSatir.filter((r) =>
    String(r[aPy] ?? "").trim() === "AMZN" && String(r[aTur] ?? "").trim() === "satış");

  console.log("\n③ KARŞILAŞTIRMA — Amazon dosyasındaki " + amzSatis.length + " satış satırı");
  const buyukNolar = new Set(veri.map((r) => String(r[jSip] ?? "").trim()));
  const sistemNolar = new Set(
    (await p.sale.findMany({
      where: { code: { in: [...new Set(amzSatis.map((r) => String(r[aSip]).trim()))] } },
      select: { code: true },
    })).map((x) => x.code!),
  );

  let dosyadaVar = 0;
  let sistemdeVar = 0;
  const hicbirYerde: string[] = [];
  for (const r of amzSatis) {
    const no = String(r[aSip]).trim();
    const d = buyukNolar.has(no);
    const sis = sistemNolar.has(no);
    if (d) dosyadaVar++;
    if (sis) sistemdeVar++;
    if (!d && !sis) hicbirYerde.push(no + "  " + String(r[aSku] ?? "—").padEnd(15) + String(r[aUrun]).slice(0, 44));
  }
  console.log("   büyük satış dosyasında bulunan : " + dosyadaVar + " / " + amzSatis.length);
  console.log("   sistemde bulunan               : " + sistemdeVar + " / " + amzSatis.length);
  console.log("   ⛔ HİÇBİR YERDE OLMAYAN         : " + hicbirYerde.length + " / " + amzSatis.length);
  for (const h of hicbirYerde.slice(0, 10)) console.log("     · " + h);
  if (hicbirYerde.length > 10) console.log("     … (" + (hicbirYerde.length - 10) + " satır daha)");

  console.log("\n④ TERS YÖN — büyük dosyadaki Amazon satırları sisteme girmiş mi");
  if (buyukAmz.length > 0) {
    const bNolar = [...new Set(buyukAmz.map((r) => String(r[jSip]).trim()))];
    const bSistem = new Set(
      (await p.sale.findMany({ where: { code: { in: bNolar } }, select: { code: true } }))
        .map((x) => x.code!),
    );
    console.log("   farklı sipariş no: " + bNolar.length + "   ·   sistemde olan: " + bSistem.size);
    const girmemis = buyukAmz.filter((r) => !bSistem.has(String(r[jSip]).trim()));
    console.log("   ⛔ GİRMEMİŞ: " + girmemis.length + " satır · " +
      girmemis.reduce((t, r) => t + sayi(r[jAdet]), 0) + " adet");
    for (const r of girmemis.slice(0, 8)) {
      console.log("     · " + String(r[jSip]).padEnd(22) + String(r[jSku] ?? "—").padEnd(16) +
        String(r[jUrun]).slice(0, 40));
    }
  } else {
    console.log("   büyük dosyada Amazon desenli sipariş no YOK — karşılaştırma kurulamaz.");
    console.log("   ⚠ Bu bir YOKLUK bulgusudur: dosya Amazon'u hiç taşımıyor.");
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
