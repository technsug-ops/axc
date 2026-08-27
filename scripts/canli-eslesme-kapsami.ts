import { readFileSync } from "node:fs";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import readXlsxFile from "read-excel-file/node";

import { PrismaClient } from "../src/generated/prisma/client";
import { paketiNormalle } from "../src/lib/tablo/paket";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  SATIŞ DOSYASI EŞLEŞME KAPSAMI — KURTARILABİLİR Mİ · SALT OKUMA
 * ----------------------------------------------------------------------------
 *      npm run canli:eslesme-kapsami
 *
 *  ⛔ HİÇBİR ŞEY YAZMAZ.
 *
 *  Ölçülen: dosyanın %38,6'sı (3934 satır) hiçbir kimlikle eşleşmiyor. İki
 *  kalem toplamın %72'si — HBCV kodları (1171) ve SKU sütununda kanal adı
 *  yazan satırlar (1669). Soru: bunlar KAPATILABİLİR mi?
 *
 *  ⛔ ÜRÜN ADIYLA EŞLEŞTİRME DENENMEZ. 26.08.2026'da ölçüldü ve ÇÜRÜDÜ:
 *  "SC 3" ile "SC 4", "Mor" ile "Mavi" adları birbirine yeterince benziyor.
 *  Ada dayalı bir eşleşme ADAY BİLE sayılmaz — yanlış ürüne satış yazmak,
 *  hiç yazmamaktan kötüdür.
 *  _(Anayasa: "kimlik varken dizeyle aranmaz" · "benzer ad, aynı kimlik
 *  değildir".)_
 *
 *  ⚠ ARANAN ŞEY KİMLİK KÖPRÜSÜ: dosyanın KENDİ içinde, aynı kodu bir yerde
 *  çözülebilir bir kimlikle yan yana gösteren bir satır var mı?
 * ============================================================================
 */

const DOSYA = "C:/Users/yapra/Downloads/satis.xlsx";

const anah = (s: unknown) =>
  String(s ?? "")
    .toLocaleLowerCase("tr")
    .replace(/[ıİ]/g, "i")
    .replace(/[şŞ]/g, "s")
    .replace(/[ğĞ]/g, "g")
    .replace(/[üÜ]/g, "u")
    .replace(/[öÖ]/g, "o")
    .replace(/[çÇ]/g, "c")
    .replace(/[^a-z0-9]/g, "");

const t2 = (n: number) => n.toFixed(2).padStart(12);

async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) {
    console.log("\n⛔ CANLI ADRES OKUNAMADI\n");
    process.exitCode = 1;
    return;
  }
  const p = new PrismaClient({ adapter: new PrismaMariaDb(c.veri.ham) });

  const ham = readFileSync(DOSYA);
  const sayfalar = await readXlsxFile(paketiNormalle(ham).bayt);
  const sayfa = sayfalar.find((s) => String(s.sheet).includes("SATIŞ"))!;
  const bas = sayfa.data[5].map((h) => String(h ?? "").trim());
  const s2i = (ad: string) => bas.indexOf(ad);
  const iSip = s2i("Sipariş Numarası");
  const iSku = s2i("SKU");
  const iBar = s2i("AXCALI BARKOD");
  const iUrun = s2i("Ürün");
  const iAdet = s2i("Satış Miktarı");
  const iFiyat = s2i("ÜRÜN LİSTE FİYATI");
  const iKanal = s2i("PAZAR YERI");

  type Satir = {
    siparis: string; sku: string; barkod: string; urun: string;
    adet: number; fiyat: number; kanal: string;
  };
  const dosya: Satir[] = sayfa.data.slice(6)
    .filter((r) => String(r[iUrun] ?? "").trim() !== "")
    .map((r) => ({
      siparis: String(r[iSip] ?? "").trim(),
      sku: String(r[iSku] ?? "").trim(),
      barkod: String(r[iBar] ?? "").trim(),
      urun: String(r[iUrun] ?? "").trim(),
      /** ⚠ "TATİL" yazan 8 satır var — sayı değil; 0 sayılıyor ve BEYAN ediliyor. */
      adet: Number.isFinite(Number(r[iAdet])) ? Number(r[iAdet]) : 0,
      fiyat: Number.isFinite(Number(r[iFiyat])) ? Number(r[iFiyat]) : 0,
      kanal: String(r[iKanal] ?? "").trim(),
    }));

  /** Sistemdeki bütün kimlikler → varyant. */
  const kimlik = new Map<string, string>();
  for (const v of await p.productVariant.findMany({
    select: { id: true, sku: true, barcode: true, companySku: true,
      channelSkus: { select: { channelSku: true } } },
  })) {
    for (const k of [v.sku, v.barcode, v.companySku, ...v.channelSkus.map((x) => x.channelSku)]) {
      if (k && k.trim() !== "") kimlik.set(k.trim(), v.id);
    }
  }
  const cozulur = (d: Satir) => kimlik.has(d.sku) || kimlik.has(d.barkod);
  const eslesmeyen = dosya.filter((d) => !cozulur(d));

  console.log("\n" + "=".repeat(96));
  console.log("SATIŞ DOSYASI EŞLEŞME KAPSAMI — SALT OKUMA");
  console.log("=".repeat(96));
  console.log("\n   dosya " + dosya.length + " satır · eşleşmeyen " + eslesmeyen.length +
    "  (%" + ((eslesmeyen.length / dosya.length) * 100).toFixed(1) + ")");
  console.log("   ⚠ 8 satırda adet sayı değil (`TATİL`) — 0 sayıldı, adet toplamları o kadar eksik.");

  const hbcv = eslesmeyen.filter((d) => /^HBCV/i.test(d.sku));
  const kanalAdi = eslesmeyen.filter((d) => /^[a-zçğıöşü]+$/i.test(d.sku) && !/^HBCV/i.test(d.sku));

  // ═══ A) HBCV KALEMİ ══════════════════════════════════════════════════
  console.log("\n\nA) HBCV KALEMİ — kod GERÇEK, sahibi bulunabilir mi\n");
  const hbcvKodlar = new Map<string, Satir[]>();
  for (const d of hbcv) hbcvKodlar.set(d.sku, [...(hbcvKodlar.get(d.sku) ?? []), d]);
  console.log("   satır " + hbcv.length + " · BENZERSİZ HBCV kodu " + hbcvKodlar.size +
    " · adet " + hbcv.reduce((t, d) => t + d.adet, 0));
  console.log("   tutar " + t2(hbcv.reduce((t, d) => t + d.fiyat * d.adet, 0)) + " TL");

  /** ① Sistemde ZATEN HBCV kodu tanımlı mı — desen var mı? */
  const sistemdeHbcv = [...kimlik.keys()].filter((k) => /^HBCV/i.test(k));
  console.log("\n   sistemde tanımlı HBCV kodu: " + sistemdeHbcv.length +
    "   ← bu bir Kanal SKU deseni olarak ZATEN kullanılıyor mu");

  /**
   * ② KİMLİK KÖPRÜSÜ — dosyanın KENDİ içinde: aynı HBCV kodu, başka bir
   * satırda çözülebilir bir kimlikle (barkod ya da tanınan SKU) yan yana
   * geçiyor mu? Ad benzerliği KULLANILMIYOR.
   */
  let kopruluKod = 0, kopruluSatir = 0;
  const koprular: string[] = [];
  for (const [kod, satirlar] of hbcvKodlar) {
    const barkodlar = new Set(satirlar.map((s) => s.barkod).filter((b) => b !== "" && kimlik.has(b)));
    if (barkodlar.size > 0) {
      kopruluKod++;
      kopruluSatir += satirlar.length;
      if (koprular.length < 5) koprular.push(kod + " → " + [...barkodlar].join(","));
    }
  }
  console.log("   dosya İÇİNDE barkodla köprülenen HBCV kodu: " + kopruluKod + " / " + hbcvKodlar.size +
    "   (" + kopruluSatir + " satır)");
  for (const k of koprular) console.log("     " + k);

  /** ③ SİPARİŞ KÖPRÜSÜ — aynı sipariş sistemde var mı. */
  const hbcvSiparis = new Set(hbcv.map((d) => d.siparis).filter((s) => s !== ""));
  const sistemdekiSiparis = new Set(
    (await p.sale.findMany({ where: { code: { in: [...hbcvSiparis] } }, select: { code: true } }))
      .map((s) => s.code).filter((x): x is string => x !== null),
  );
  console.log("\n   HBCV satırlarının siparişi: " + hbcvSiparis.size +
    " · bunlardan SİSTEMDE olan: " + sistemdekiSiparis.size);
  console.log("   ⚠ Sipariş sistemde olmak, o SATIRIN ürününü SÖYLEMEZ — yalnız siparişin");
  console.log("     kaydedildiğini gösterir. Kimlik köprüsü değildir.");

  // ═══ B) KANAL ADI KALEMİ ═════════════════════════════════════════════
  console.log("\n\nB) SKU SÜTUNUNDA KANAL ADI — başka kimlik var mı\n");
  console.log("   satır " + kanalAdi.length + " · adet " + kanalAdi.reduce((t, d) => t + d.adet, 0) +
    " · tutar " + t2(kanalAdi.reduce((t, d) => t + d.fiyat * d.adet, 0)) + " TL");
  const degerler = new Map<string, number>();
  for (const d of kanalAdi) degerler.set(d.sku, (degerler.get(d.sku) ?? 0) + 1);
  console.log("\n   SKU sütununda ne yazıyor:");
  for (const [k, n] of [...degerler.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)) {
    console.log("     " + k.slice(0, 24).padEnd(26) + String(n).padStart(5));
  }

  const barkodlu = kanalAdi.filter((d) => d.barkod !== "");
  const barkoduCozulen = kanalAdi.filter((d) => kimlik.has(d.barkod));
  console.log("\n   BARKOD sütunu dolu olan   " + String(barkodlu.length).padStart(5) +
    " / " + kanalAdi.length);
  console.log("   barkodu SİSTEMDE çözülen  " + String(barkoduCozulen.length).padStart(5) +
    "   ← doğrudan kurtarılabilir");

  /** ⭐ SİPARİŞ KÖPRÜSÜ: aynı siparişin BAŞKA satırı çözülüyor mu. */
  const siparisSatirlari = new Map<string, Satir[]>();
  for (const d of dosya) if (d.siparis) siparisSatirlari.set(d.siparis, [...(siparisSatirlari.get(d.siparis) ?? []), d]);
  let kardesiCozulen = 0, tekKalem = 0;
  for (const d of kanalAdi) {
    const kardesler = (siparisSatirlari.get(d.siparis) ?? []).filter((x) => x !== d);
    if (kardesler.length === 0) { tekKalem++; continue; }
    if (kardesler.some(cozulur)) kardesiCozulen++;
  }
  console.log("\n   siparişte TEK kalem (kardeşi yok)     " + String(tekKalem).padStart(5));
  console.log("   kardeş satırı ÇÖZÜLEN                 " + String(kardesiCozulen).padStart(5));
  console.log("   ⛔ VE BU DA KİMLİK VERMEZ: kardeşin ürünü bilinmesi, BU satırın ürününü");
  console.log("     söylemez — çok kalemli siparişte kalemler FARKLI ürünlerdir.");

  // ═══ C) 19 EKSİĞE ETKİSİ ═════════════════════════════════════════════
  console.log("\n\nC) 19 EKSİĞE ETKİSİ\n");
  const sayim = await p.stokSayimi.findFirst({ where: { kod: "sayim-20260827-2" }, select: { id: true } });
  const eksikSatirlari = await p.stokSayimSatiri.findMany({
    where: { sayimId: sayim!.id, kapsamdaydi: true },
    select: { variantId: true, variant: { select: { sku: true, barcode: true, companySku: true,
      channelSkus: { select: { channelSku: true } }, product: { select: { name: true } } } } },
  });
  /** Eksik kovasındaki varyantların kimlikleri. */
  let cozulenSatir = 0;
  for (const es of eksikSatirlari) {
    const kodlar = new Set([es.variant.sku, es.variant.barcode, es.variant.companySku,
      ...es.variant.channelSkus.map((k) => k.channelSku)].filter((k): k is string => !!k));
    const dosyada = eslesmeyen.filter((d) => kodlar.has(d.sku) || kodlar.has(d.barkod));
    cozulenSatir += dosyada.length;
  }
  console.log("   sayım kapsamındaki varyantların KİMLİĞİYLE eşleşen eşleşmeyen satır: " + cozulenSatir);
  console.log("   ⚠ SIFIRSA ANLAMI ŞU: o satırlar sistemdeki HİÇBİR kodu taşımıyor —");
  console.log("     yani A ve B kapansa bile bu ürünlere KENDİLİĞİNDEN bağlanmazlar.");

  console.log("\n" + "=".repeat(96));
  console.log("SALT OKUMA — HİÇBİR ŞEY YAZILMADI.");
  console.log("=".repeat(96) + "\n");
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
