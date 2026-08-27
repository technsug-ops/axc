import { readFileSync } from "node:fs";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import readXlsxFile from "read-excel-file/node";

import { PrismaClient } from "../src/generated/prisma/client";
import { paketiNormalle } from "../src/lib/tablo/paket";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  HB KANAL SKU TANIMLAMA — VARSAYILAN SALT OKUMA
 * ----------------------------------------------------------------------------
 *      npm run canli:hb-kanal-sku            → KURU KOŞUM
 *      npm run canli:hb-kanal-sku -- --yaz   → yazar
 *
 *  Hepsiburada "Listelerim" dökümündeki 224 listingin 221'i sistemde zaten
 *  çözülüyor. ÜÇÜ çözülmüyor ve üçü de bugün açılan LEGO ürünleri.
 *
 *  ⛔ AD BENZERLİĞİYLE EŞLEŞTİRME YOK. 26.08.2026'da ölçüldü ve çürüdü
 *  ("SC 3" ↔ "SC 4", "Mor" ↔ "Mavi"). Burada kullanılan işaret **LEGO SET
 *  NUMARASI** — üreticinin kendi kimliği, ad değil. Set numarası hem HB
 *  adında hem bizim ürün adımızda geçiyorsa bu bir KİMLİK eşleşmesidir.
 *
 *  ⚠ VE YİNE DE KESİN SAYILMAZ: aday GÖSTERİLİR, yazım onayla yapılır.
 *  Aday sayısı 1 değilse (0 ya da 2+) o kod **YAZILMAZ** ve ekrana
 *  "BELİRSİZ — SORULACAK" diye düşer.
 * ============================================================================
 */

const YAZ = process.argv.includes("--yaz");
const HB_DOSYA = "C:/Users/yapra/Downloads/Satisbilgisi-28-08-2026-00_09.xlsx";
const SATIS_DOSYA = "C:/Users/yapra/Downloads/satis.xlsx";

/** İlgilenilen üç kod — dosyada çözülmeyenler. */
const KODLAR = ["HBCV00007GPY0Z", "HBCV00003JIJSK", "HBCV00007GYFKL"];

/** LEGO set numarası: 4–6 haneli, ürün adında geçen üretici kimliği. */
function setNolari(ad: string): string[] {
  return [...ad.matchAll(/\b(\d{4,6})\b/g)]
    .map((m) => m[1])
    /** ⚠ Yıl ve parça sayısı gibi gürültüyü ele: LEGO setleri 5 haneli ağırlıklı. */
    .filter((n) => n.length >= 4 && !/^20\d\d$/.test(n));
}

async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) {
    console.log("\n⛔ CANLI ADRES OKUNAMADI\n");
    process.exitCode = 1;
    return;
  }
  const p = new PrismaClient({ adapter: new PrismaMariaDb(c.veri.ham) });

  const hbSayfa = (await readXlsxFile(paketiNormalle(readFileSync(HB_DOSYA)).bayt))[0];
  const hbBas = hbSayfa.data[0].map((h) => String(h ?? "").trim());
  const iSku = hbBas.indexOf("SKU");
  const iAd = hbBas.indexOf("Ürün Adı");
  const hbSatir = hbSayfa.data.slice(1).filter((r) => KODLAR.includes(String(r[iSku] ?? "").trim()));

  const varyantlar = await p.productVariant.findMany({
    select: { id: true, sku: true, barcode: true, companySku: true,
      product: { select: { name: true } }, name: true,
      channelSkus: { select: { channelSku: true, channelAccount: { select: { name: true } } } } },
  });

  /** HB satış hesabı — Kanal SKU bir HESABA bağlanır, kanala değil. */
  const hbHesaplar = await p.channelAccount.findMany({
    where: { channel: { code: "HEPSIBURADA" }, satisIcin: true, isActive: true },
    select: { id: true, name: true },
  });

  /** Satış dosyasındaki HB satırları — kaç satış eşleşmeye başlar. */
  const sSayfa = (await readXlsxFile(paketiNormalle(readFileSync(SATIS_DOSYA)).bayt))
    .find((x) => String(x.sheet).includes("SATIŞ"))!;
  const sBas = sSayfa.data[5].map((h) => String(h ?? "").trim());
  const jSku = sBas.indexOf("SKU");
  const jAdet = sBas.indexOf("Satış Miktarı");
  const satisSatirlari = sSayfa.data.slice(6);

  console.log("\n" + "=".repeat(94));
  console.log("HB KANAL SKU — " + (YAZ ? "⚠ YAZIM KİPİ" : "KURU KOŞUM (salt okuma)"));
  console.log("=".repeat(94));
  console.log("\n   HB satış hesabı: " + hbHesaplar.map((h) => h.name).join(" · ") +
    "   (" + hbHesaplar.length + " adet)");
  if (hbHesaplar.length !== 1) {
    console.log("   ⛔ TEK HB SATIŞ HESABI BEKLENİYORDU — hangisine yazılacağı belirsiz, DURULDU.\n");
    await p.$disconnect();
    process.exitCode = 1;
    return;
  }
  const hesap = hbHesaplar[0];

  type Plan = { kod: string; hbAd: string; varyantId: string; varyantSku: string; kanit: string; satis: number };
  const plan: Plan[] = [];
  const belirsiz: string[] = [];

  for (const r of hbSatir) {
    const kod = String(r[iSku] ?? "").trim();
    const hbAd = String(r[iAd] ?? "").trim();
    const setler = setNolari(hbAd);

    /** ⛔ ÇAKIŞMA: bu kod başka bir varyanta zaten bağlı mı? */
    const cakisan = varyantlar.find((v) => v.channelSkus.some((k) => k.channelSku === kod));
    if (cakisan) {
      belirsiz.push(kod + " — ZATEN BAĞLI: " + cakisan.sku + " (yazılmaz)");
      continue;
    }

    /** KİMLİK EŞLEŞMESİ: set numarası hem HB adında hem bizim adımızda. */
    const adaylar = varyantlar.filter((v) => {
      const bizim = setNolari(v.product.name + " " + (v.name ?? ""));
      return setler.some((n) => bizim.includes(n));
    });

    const satisAdet = satisSatirlari
      .filter((x) => String(x[jSku] ?? "").trim() === kod)
      .reduce((t, x) => t + (Number.isFinite(Number(x[jAdet])) ? Number(x[jAdet]) : 0), 0);

    console.log("\n   ● " + kod);
    console.log("     HB adı      : " + hbAd.slice(0, 70));
    console.log("     set no      : " + (setler.join(", ") || "(bulunamadı)"));
    console.log("     satış dosyası: " + satisAdet + " adet");
    if (adaylar.length === 1) {
      const a = adaylar[0];
      const ortak = setler.filter((n) => setNolari(a.product.name + " " + (a.name ?? "")).includes(n));
      console.log("     ✓ TEK ADAY  : " + a.sku + "  —  " + a.product.name.slice(0, 50));
      console.log("       kanıt     : ortak set no " + ortak.join(","));
      /** Aynı varyantın bu hesapta başka kodu var mı (@@unique çakışması). */
      const mevcut = a.channelSkus.find((k) => k.channelAccount.name === hesap.name);
      if (mevcut) {
        belirsiz.push(kod + " — varyant " + a.sku + " bu hesapta ZATEN '" + mevcut.channelSku + "' taşıyor (yazılmaz)");
        console.log("     ⛔ ÇAKIŞMA : bu hesapta zaten '" + mevcut.channelSku + "' bağlı");
      } else {
        plan.push({ kod, hbAd, varyantId: a.id, varyantSku: a.sku, kanit: ortak.join(","), satis: satisAdet });
      }
    } else {
      console.log("     ⛔ ADAY SAYISI " + adaylar.length + " — YAZILMAZ, SORULACAK");
      for (const a of adaylar.slice(0, 5)) console.log("        · " + a.sku.padEnd(18) + a.product.name.slice(0, 46));
      belirsiz.push(kod + " — aday " + adaylar.length + " (set no: " + (setler.join(",") || "yok") + ")");
    }
  }

  console.log("\n\n   ═══ PLAN ═══");
  console.log("   YAZILACAK : " + plan.length);
  for (const x of plan) console.log("     " + x.kod + " → " + x.varyantSku + "   (set " + x.kanit + " · " + x.satis + " satış)");
  console.log("   BELİRSİZ  : " + belirsiz.length);
  for (const b of belirsiz) console.log("     " + b);
  console.log("\n   eşleşmeye başlayacak HB satışı: " + plan.reduce((t, x) => t + x.satis, 0) + " adet");

  if (!YAZ) {
    console.log("\n" + "=".repeat(94));
    console.log("KURU KOŞUM — HİÇBİR ŞEY YAZILMADI.");
    console.log("Yazmak için:  npm run canli:hb-kanal-sku -- --yaz");
    console.log("=".repeat(94) + "\n");
    await p.$disconnect();
    return;
  }

  console.log("\n⚠ YAZILIYOR…");
  for (const x of plan) {
    await p.channelSku.create({
      data: { channelAccountId: hesap.id, variantId: x.varyantId, channelSku: x.kod },
    });
    console.log("   ✓ " + x.kod + " → " + x.varyantSku);
  }
  await p.auditLog.create({
    data: {
      action: "HB_KANAL_SKU_TANIMLANDI",
      targetType: "ChannelSku",
      detail: JSON.stringify({
        gerekce: "HB 'Listelerim' dökümünde sistemde çözülmeyen listingler; kimlik işareti LEGO SET NUMARASI (ad benzerliği DEĞİL).",
        hesap: hesap.name,
        yazilan: plan.map((x) => ({ kod: x.kod, varyant: x.varyantSku, setNo: x.kanit })),
        belirsiz,
      }),
    },
  });
  console.log("   ✓ AuditLog: HB_KANAL_SKU_TANIMLANDI\n");
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
