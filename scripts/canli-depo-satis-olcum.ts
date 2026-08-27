import { readFileSync } from "node:fs";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import readXlsxFile from "read-excel-file/node";

import { PrismaClient } from "../src/generated/prisma/client";
import { paketiNormalle } from "../src/lib/tablo/paket";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  "DEPO" SATIRLARI — ELDEN SATIŞ MI (SALT OKUMA)
 * ----------------------------------------------------------------------------
 *      npm run canli:depo-olcum
 *
 *  ⚠ ESKİ GEREKÇE ÇÜRÜDÜ VE SİLİNMİYOR — NİYE ÇÜRÜDÜĞÜYLE BİRLİKTE DURUYOR.
 *  `canli-satis-ice-aktar.ts` şöyle diyordu:
 *
 *      "⛔ `DEPO` BİR KANAL DEĞİL — pazaryeri değil, depo hareketi.
 *       Satış olarak yazmak ciroyu şişirirdi."
 *
 *  Kullanıcı düzeltti (28.08.2026): **bunlar ELDEN YAPILAN SATIŞLARDIR.**
 *  Alışı ve satışı var, yalnız pazaryeri komisyonu yok. Yani cümlenin
 *  ikinci yarısı ters: satış olarak yazmamak ciroyu EKSİK bırakıyor.
 *
 *  ⛔ Ve "elden satış" iddiası da ölçülür: alış/satış dolu mu, komisyon
 *  gerçekten sıfır mı, kimlikler çözülüyor mu, sistemde zaten var mı.
 *
 *  ⛔ HÜKÜM YOK, YAZMA YOK.
 * ============================================================================
 */

const SATIS_DOSYA = "C:/Users/yapra/Downloads/satis.xlsx";

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
  const jAlis = J("ÜRÜN ALIŞ FİYATI");
  const jListe = J("ÜRÜN LİSTE FİYATI");
  const jKomO = J("KOMİSYON ORANI");
  const jKomT = J("KOMİSYON TUTARI");
  const jKargo = J("KARGO");
  const jDiger = J("DİĞER GİDERLER");

  const veri = s.data.slice(6).filter((r) => String(r[jUrun] ?? "").trim() !== "");
  const depo = veri.filter((r) => String(r[jPy] ?? "").trim().toUpperCase() === "DEPO");

  console.log("\n" + "=".repeat(108));
  console.log("'DEPO' SATIRLARI — ELDEN SATIŞ İDDİASININ ÖLÇÜMÜ");
  console.log("=".repeat(108));
  console.log("\n   satır: " + depo.length);

  const tur = new Map<string, number>();
  for (const r of depo) {
    const k = String(r[jTur] ?? "—").trim() || "(BOŞ)";
    tur.set(k, (tur.get(k) ?? 0) + 1);
  }
  console.log("   TÜR: " + [...tur].map(([k, n]) => k + "=" + n).join(" · "));

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
  const nolar = [...new Set(depo.map((r) => String(r[jSip] ?? "").trim()).filter((x) => x !== ""))];
  const sistemde = new Set(
    (await p.sale.findMany({ where: { code: { in: nolar } }, select: { code: true } }))
      .map((x) => x.code!),
  );

  console.log("\n   tarih       sipariş no          adet    alış     satış   kom.O  kom.T  kargo  diğer  kimlik   sistemde");
  console.log("   " + "─".repeat(104));

  let komisyonluSatir = 0;
  let kargoluSatir = 0;
  let cozulen = 0;
  let toplamAdet = 0;
  let toplamCiro = 0;
  let toplamAlis = 0;
  const cozulmeyenler: string[] = [];

  for (const r of depo) {
    const no = String(r[jSip] ?? "").trim();
    const sku = String(r[jSku] ?? "").trim();
    const bar = String(r[jBar] ?? "").trim();
    const v = indeks.get(sku) ?? indeks.get(bar);
    const d = r[jTar] instanceof Date ? (r[jTar] as Date).toISOString().slice(0, 10) : "?";
    const komT = sayi(r[jKomT]);
    const kargo = sayi(r[jKargo]);
    const adet = sayi(r[jAdet]);

    if (komT > 0) komisyonluSatir++;
    if (kargo > 0) kargoluSatir++;
    if (v) { cozulen++; } else { cozulmeyenler.push(no + "  " + (sku || "(BOŞ)") + "  " + String(r[jUrun]).slice(0, 40)); }
    toplamAdet += adet;
    toplamCiro += sayi(r[jListe]) * adet;
    toplamAlis += sayi(r[jAlis]) * adet;

    console.log("   " + d + "  " + (no || "(NUMARASIZ)").padEnd(20) +
      String(adet).padStart(4) +
      sayi(r[jAlis]).toFixed(0).padStart(9) + sayi(r[jListe]).toFixed(0).padStart(9) +
      sayi(r[jKomO]).toFixed(1).padStart(7) + komT.toFixed(0).padStart(7) +
      kargo.toFixed(0).padStart(7) + sayi(r[jDiger]).toFixed(0).padStart(7) +
      "   " + (v ? "✓ " + v.sku.slice(0, 12) : "⛔ YOK").padEnd(16) +
      (no === "" ? "—" : sistemde.has(no) ? "VAR" : "yok"));
  }

  console.log("\n   ═══ İDDİA SINAMASI ═══");
  console.log("   'komisyon yok' → komisyon TUTARI > 0 olan satır: " + komisyonluSatir + " / " + depo.length);
  console.log("   kargo > 0 olan satır                           : " + kargoluSatir + " / " + depo.length);
  console.log("   kimliği çözülen                                : " + cozulen + " / " + depo.length);
  for (const x of cozulmeyenler) console.log("      ⛔ " + x);
  console.log("   sipariş no'su BOŞ olan                         : " +
    depo.filter((r) => String(r[jSip] ?? "").trim() === "").length + " / " + depo.length);
  console.log("   sistemde ZATEN olan                            : " +
    depo.filter((r) => sistemde.has(String(r[jSip] ?? "").trim())).length + " / " + depo.length);

  console.log("\n   ═══ GİRİLİRSE ═══");
  console.log("   " + toplamAdet + " adet · ciro " + toplamCiro.toFixed(2) +
    " TL · mal bedeli(alış) " + toplamAlis.toFixed(2) + " TL   (ikisi de KDV DAHİL taban)");

  console.log("\n   ═══ KANAL TARAFI — ÖLÇÜLDÜ ═══");
  const kanallar = await p.channel.findMany({
    select: { code: true, name: true, type: true, isActive: true,
      accounts: { select: { name: true, satisIcin: true } } },
    orderBy: { code: "asc" },
  });
  console.log("   ChannelType enum değerleri: MARKETPLACE · OWN_STORE   (şemadan okundu)");
  for (const k of kanallar) {
    console.log("     " + k.code.padEnd(14) + String(k.type).padEnd(13) +
      k.accounts.filter((a) => a.satisIcin).length + " satış hesabı");
  }
  console.log("\n   ⛔ ELDEN SATIŞ İÇİN UYGUN BİR KANAL YOK: iki tip de pazaryeri ya da");
  console.log("     kendi mağazası anlatıyor. `Sale.channelAccountId` ZORUNLU olduğundan");
  console.log("     bu satırlar bir kanal hesabı olmadan yazılamaz.");
  console.log("   ⚠ MERDİVEN: yeni ENUM DEĞERİ (şema) en pahalı basamak. Önce sorulur —");
  console.log("     mevcut bir tip bunu taşıyabilir mi, taşırsa hangi bilgi kaybolur?");

  console.log("\n" + "=".repeat(108));
  console.log("SALT OKUMA — HİÇBİR ŞEY YAZILMADI. HÜKÜM YOK.");
  console.log("=".repeat(108) + "\n");
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
