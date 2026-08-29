/** BETIK SINIFI: TEK_SEFERLIK — 29.08 fiziksel sayim yazimi, `sayim-fiziksel-20260829` kodunda kilitli; ikinci kosum 0 dondurur. */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import readXlsxFile from "read-excel-file/node";

import { paketiNormalle } from "../src/lib/tablo/paket";
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  FİZİKSEL SAYIM ESAS — STOK DÜZELTME (KURU KOŞUM)
 * ----------------------------------------------------------------------------
 *      npm run canli:sayim-esas            → KURU KOŞUM
 *      npm run canli:sayim-esas -- --yaz   → yazar
 *      npm run canli:sayim-esas -- --geri  → geri alır
 *
 *  ⭐ HALİL 7 SAAT FİZİKSEL SAYIM YAPTI VE KURALI KOYDU: **fiziki varlık
 *  esastır.** Sonraki Excel aktarımları stok rakamlarını bozdu; sıra
 *  yanlıştı, sayım SON SÖZ olmalı.
 *
 *  ⚠ VE İKİ FARK AYRI ÖLÇÜLÜR — KARIŞTIRILMAZ:
 *   ① SAYIM ANINDAKİ fark: dosyanın kendi iki sütunu arasındaki fark
 *     (o gün sistem ne diyordu ↔ rafta ne vardı).
 *   ② BUGÜNKÜ fark: sistemin ŞU ANKİ adedi ↔ sayılan adet.
 *  Aradan aktarımlar ve satışlar geçti; ikisi AYNI OLMAK ZORUNDA DEĞİL ve
 *  düzeltme ②'ye göre yapılır. ①'i basmanın sebebi: aradaki kaymanın
 *  büyüklüğü kendi başına bir bulgudur.
 *
 *  ⛔ TRENDYOL SAYFASI BU İŞE DAHİL DEĞİL — o kanal listeleme stoğu.
 *
 *  ⛔ HÜKÜM YOK, YAZMA YOK (kuru koşumda).
 * ============================================================================
 */

const DOSYA = "C:/Users/yapra/Downloads/Stok (1).xlsx";
const MD5 = "41d7b24b7b1a2ebf8d9276d836d21652";
const SAYIM_KODU = "sayim-fiziksel-20260829";
const YAZ = process.argv.includes("--yaz");
const GERI = process.argv.includes("--geri");

const metin = (h: unknown) => String(h ?? "").trim();
const t2 = (x: number) => x.toFixed(2).padStart(13);

async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) {
    console.log("\n⛔ CANLI ADRES OKUNAMADI\n");
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(c.veri.ham);
  const { prisma: p } = await import("../src/lib/prisma");

  console.log("\n" + "=".repeat(104));
  console.log("FİZİKSEL SAYIM ESAS — " +
    (GERI ? "⚠ GERİ ALMA" : YAZ ? "⚠ YAZIM" : "KURU KOŞUM (yazmaz)"));
  console.log("=".repeat(104));

  if (GERI) {
    const hh = await p.stockMovement.findMany({
      where: { note: { contains: SAYIM_KODU } },
      select: { id: true, quantityDelta: true },
    });
    console.log("\n   bu sayımın yazdığı hareket: " + hh.length);
    if (hh.length === 0) {
      console.log("   ⛔ GERİ ALINACAK KAYIT YOK.\n");
      await p.$disconnect();
      return;
    }
    const cikis = hh.filter((x) => x.quantityDelta < 0).map((x) => x.id);
    const giris = hh.filter((x) => x.quantityDelta > 0).map((x) => x.id);
    await p.stockMovement.deleteMany({ where: { id: { in: cikis } } });
    await p.stockMovement.deleteMany({ where: { id: { in: giris } } });
    console.log("   ⭐ silinen: çıkış " + cikis.length + " · giriş " + giris.length);
    console.log("   ⚠ Kâr TAZELENMEDİ — ayrıca koşulmalı.\n");
    await p.$disconnect();
    return;
  }

  // ── ⓪ DOSYA KİMLİĞİ ───────────────────────────────────────────────────
  const ham = readFileSync(DOSYA);
  const md5 = createHash("md5").update(ham).digest("hex");
  console.log("\n⓪ DOSYA KİMLİĞİ");
  console.log("   md5 " + md5 + (md5 === MD5 ? "   ⭐ BEYANLA AYNI ✓" : "   ⛔ FARKLI"));
  const tum = await readXlsxFile(paketiNormalle(ham).bayt);
  console.log("   sayfalar: " + tum.map((x) => String(x.sheet)).join(" · "));

  const s = tum.find((x) => /sell/i.test(String(x.sheet)));
  if (!s) {
    console.log("\n⛔ SELLİORA SAYFASI BULUNAMADI.\n");
    await p.$disconnect();
    return;
  }
  const bas = s.data[0].map((h) => metin(h));
  console.log("\n   sayfa \"" + s.sheet + "\" · satır " + (s.data.length - 1));
  console.log("   sütunlar: " + bas.map((h, i) =>
    String.fromCharCode(65 + i) + "=" + (h || "⛔BOŞ")).join(" · "));

  const iSku = bas.findIndex((h) => /^sku$/i.test(h)) >= 0
    ? bas.findIndex((h) => /^sku$/i.test(h))
    : bas.findIndex((h) => /sku/i.test(h));
  const iGorunen = bas.findIndex((h) => /görünen|gorunen/i.test(h));
  const iOlmasi = bas.findIndex((h) => /olması gereken|olmasi gereken/i.test(h));
  console.log("\n   SKU sütunu            : " +
    (iSku < 0 ? "⛔ YOK" : String.fromCharCode(65 + iSku) + " — \"" + bas[iSku] + "\""));
  console.log("   'görünen stok' sütunu : " +
    (iGorunen < 0 ? "⛔ YOK" : String.fromCharCode(65 + iGorunen) + " — \"" + bas[iGorunen] + "\""));
  console.log("   'olması gereken'      : " +
    (iOlmasi < 0 ? "⛔ YOK" : String.fromCharCode(65 + iOlmasi) + " — \"" + bas[iOlmasi] + "\""));
  if (iSku < 0 || iOlmasi < 0) {
    console.log("\n⛔ ZORUNLU SÜTUN BULUNAMADI — ölçüm YAPILMADI (boş sonuç, temiz sonuç değil).\n");
    await p.$disconnect();
    process.exitCode = 1;
    return;
  }

  /** ⚠ "Olması gereken" DOLU olan satırlar — boş olan sayılmamış demektir. */
  const sayilan: { sku: string; gorunen: number | null; olmasi: number }[] = [];
  let bosSayim = 0;
  for (const r of s.data.slice(1)) {
    const sku = metin(r[iSku]);
    const o = r[iOlmasi];
    if (sku === "") continue;
    if (o === null || o === undefined || metin(o) === "") { bosSayim++; continue; }
    const olmasi = Number(o);
    if (!Number.isFinite(olmasi)) { bosSayim++; continue; }
    const g = iGorunen < 0 ? null : Number(r[iGorunen]);
    sayilan.push({ sku, gorunen: Number.isFinite(g as number) ? (g as number) : null, olmasi });
  }
  console.log("\n① SAYILAN SATIRLAR");
  console.log("   \"Olması gereken\" DOLU : " + sayilan.length + "   (beyan 207)");
  console.log("   boş / sayılmamış      : " + bosSayim);

  // ── ② SKU EŞLEŞMESİ ───────────────────────────────────────────────────
  const skular = sayilan.map((x) => x.sku);
  const varyantlar = new Map<string, {
    id: string; sku: string; ad: string; stok: number;
  }>();
  for (let k = 0; k < skular.length; k += 300) {
    for (const v of await p.productVariant.findMany({
      where: { OR: [{ sku: { in: skular.slice(k, k + 300) } },
        { barcode: { in: skular.slice(k, k + 300) } }] },
      select: { id: true, sku: true, barcode: true,
        product: { select: { name: true } } },
    })) {
      const kayit = { id: v.id, sku: v.sku ?? "—",
        ad: v.product.name ?? "", stok: 0 };
      if (v.sku) varyantlar.set(v.sku, kayit);
      if (v.barcode) varyantlar.set(v.barcode, kayit);
    }
  }
  /** BUGÜNKÜ stok — ledger toplamı. */
  const idler = [...new Set([...varyantlar.values()].map((x) => x.id))];
  const toplamlar = await p.stockMovement.groupBy({
    by: ["variantId"], where: { variantId: { in: idler } },
    _sum: { quantityDelta: true },
  });
  const stokHaritasi = new Map(toplamlar.map((t) =>
    [t.variantId, t._sum.quantityDelta ?? 0]));

  const eslesen = sayilan.filter((x) => varyantlar.has(x.sku));
  const eslesmeyen = sayilan.filter((x) => !varyantlar.has(x.sku));
  console.log("\n② SKU EŞLEŞMESİ");
  console.log("   ⭐ sistemde BULUNAN   : " + eslesen.length);
  console.log("   ⛔ BULUNAMAYAN        : " + eslesmeyen.length);
  for (const x of eslesmeyen.slice(0, 10)) {
    console.log("     " + x.sku.padEnd(20) + " sayılan " + x.olmasi);
  }
  if (eslesmeyen.length > 10) console.log("     … +" + (eslesmeyen.length - 10));

  // ── ③ İKİ FARK — AYRI ─────────────────────────────────────────────────
  type Sat = {
    sku: string; id: string; ad: string;
    sayimAni: number | null; bugun: number; olmasi: number;
    farkSayim: number | null; farkBugun: number;
  };
  const satirlar: Sat[] = eslesen.map((x) => {
    const v = varyantlar.get(x.sku)!;
    const bugun = stokHaritasi.get(v.id) ?? 0;
    return {
      sku: x.sku, id: v.id, ad: v.ad,
      sayimAni: x.gorunen, bugun, olmasi: x.olmasi,
      farkSayim: x.gorunen === null ? null : x.olmasi - x.gorunen,
      farkBugun: x.olmasi - bugun,
    };
  });

  const say = (f: (s: Sat) => number | null) => {
    let tutan = 0, fazla = 0, az = 0, fazlaAdet = 0, azAdet = 0;
    for (const s of satirlar) {
      const d = f(s);
      if (d === null) continue;
      if (d === 0) tutan++;
      else if (d < 0) { fazla++; fazlaAdet += d; }
      else { az++; azAdet += d; }
    }
    return { tutan, fazla, az, fazlaAdet, azAdet, net: fazlaAdet + azAdet };
  };
  const a = say((s) => s.farkSayim);
  const b = say((s) => s.farkBugun);

  console.log("\n③ İKİ FARK — AYRI ÖLÇÜLDÜ (karıştırılmaz)");
  console.log("\n   ① SAYIM ANINDAKİ FARK (dosyanın kendi iki sütunu)");
  console.log("      tutuyor " + a.tutan + " · sistem FAZLA " + a.fazla +
    " (" + a.fazlaAdet + " adet) · sistem AZ " + a.az + " (+" + a.azAdet + ")");
  console.log("      net " + a.net + " adet");
  console.log("      ⭐ mimarın ölçümü: tutuyor 106 · fazla 52 (−207) · az 49 (+104) · net −103");
  console.log("\n   ② ⭐ BUGÜNKÜ FARK — DÜZELTME BUNA GÖRE YAPILIR");
  console.log("      tutuyor " + b.tutan + " · sistem FAZLA " + b.fazla +
    " (" + b.fazlaAdet + " adet) · sistem AZ " + b.az + " (+" + b.azAdet + ")");
  console.log("      net " + b.net + " adet");
  const kaymis = satirlar.filter((s) =>
    s.farkSayim !== null && s.farkSayim !== s.farkBugun).length;
  console.log("\n   ⚠ SAYIMDAN BUGÜNE KAYAN SATIR: " + kaymis + " / " + satirlar.length);
  console.log("     (aradan satış/aktarım geçti — iki fark aynı olmak zorunda değil)");

  console.log("\n   EN BÜYÜK ON FARK (bugüne göre):");
  for (const s of [...satirlar].sort((x, y) =>
    Math.abs(y.farkBugun) - Math.abs(x.farkBugun)).slice(0, 10)) {
    console.log("     " + s.sku.padEnd(16) +
      "bugün " + String(s.bugun).padStart(4) + " → sayılan " + String(s.olmasi).padStart(4) +
      "  fark " + (s.farkBugun > 0 ? "+" : "") + String(s.farkBugun).padStart(4) +
      "   " + s.ad.slice(0, 38));
  }

  // ── ④ DÜZELTME PLANI VE MALİYET ───────────────────────────────────────
  console.log("\n④ DÜZELTME PLANI — `COUNT_CORRECTION`");
  const eksiler = satirlar.filter((s) => s.farkBugun < 0);
  const artilar = satirlar.filter((s) => s.farkBugun > 0);
  console.log("   EKSİ yön (mal gitmiş) : " + eksiler.length + " varyant · " +
    eksiler.reduce((t, s) => t + s.farkBugun, 0) + " adet");
  console.log("   ARTI yön (mal fazla)  : " + artilar.length + " varyant · +" +
    artilar.reduce((t, s) => t + s.farkBugun, 0) + " adet");

  /** ⚠ ARTI YÖNDE MALİYET: FIFO'da parti varsa ondan, yoksa NO_COST. */
  let artiMaliyetli = 0, artiNoCost = 0, artiDeger = 0;
  for (const s of artilar) {
    const sonParti = await p.stockMovement.findFirst({
      where: { variantId: s.id, quantityDelta: { gt: 0 }, unitCostAmount: { not: null } },
      orderBy: [{ occurredAt: "desc" }],
      select: { unitCostAmount: true },
    });
    if (sonParti) {
      artiMaliyetli++;
      artiDeger += s.farkBugun * Number(sonParti.unitCostAmount!.toString());
    } else artiNoCost++;
  }
  console.log("\n   ARTI yönde maliyet kaynağı:");
  console.log("     ⭐ FIFO'da parti VAR (son partinin maliyeti) : " + artiMaliyetli +
    " · değer " + t2(artiDeger));
  console.log("     ⛔ parti YOK → NO_COST parti                : " + artiNoCost);
  console.log("     ⚠ Uydurma maliyet YAZILMAZ; NO_COST parti satılınca kâr");
  console.log("       'hesaplanamadı' der ve bu DOĞRU cevaptır.");

  /** EKSİ yönde: FIFO'dan düşer, maliyeti gider olur. */
  let eksiDeger = 0, eksiYetersiz = 0;
  const { acikPartiler, fifoDagit, gunSonu } = await import("../src/lib/stok");
  for (const s of eksiler) {
    /**
     * SINIR YOK: bu döngü SAYIMIN DEĞERLEMESİ — `eksiDeger` toplar, hiçbir
     * hareket yazmaz. Sayım BUGÜN yapıldı, dolayısıyla "bugün açık olan
     * partiler" zaten doğru kümedir. Yazım yolu ayrı ve orada `gunSonu`
     * uygulanıyor.
     */
    const partiler = await acikPartiler(p, s.id);
    const d = fifoDagit(partiler, Math.abs(s.farkBugun));
    if (!d.yeterliMi) { eksiYetersiz++; continue; }
    for (const x of d.dagitim) {
      eksiDeger += x.adet * Number(x.parti.birimMaliyet ?? 0);
    }
  }
  console.log("\n   EKSİ yönde FIFO:");
  console.log("     düşülecek maliyet (gider) : " + t2(eksiDeger));
  console.log("     ⛔ FIFO'da parti YETMEYEN  : " + eksiYetersiz +
    (eksiYetersiz > 0 ? "   ← bunlar YAZILAMAZ, ayrı raporlanır" : ""));

  // ── ⑤ ETKİLENECEK KÂR ─────────────────────────────────────────────────
  console.log("\n⑤ KÂR ETKİSİ");
  console.log("   ⭐ `COUNT_CORRECTION` kâr tablosuna GİRMEZ (kullanıcı kararı");
  console.log("     12.08.2026): düzeltme bir satış değildir, NET-1/NET-2");
  console.log("     hesabına karışmaz. Dönem raporunda AYRI kalem olarak");
  console.log("     GERÇEK NET'ten düşer.");
  const etkilenen = await p.saleItem.count({
    where: { variantId: { in: satirlar.map((s) => s.id) },
      sale: { iptalTarihi: null }, stockMovements: { none: {} } },
  });
  console.log("   ⚠ AMA ARTI yönde açılan parti, maliyetsiz kalmış satışlara");
  console.log("     bağlanabilir hâle gelir: bu varyantlarda maliyet bağı");
  console.log("     OLMAYAN satış kalemi " + etkilenen + " tane.");
  console.log("     ⛔ Bu bağlama BU BETİĞİN İŞİ DEĞİL — ayrı karar.");

  console.log("\n⑥ GERİ ALMA — DETERMİNİSTİK ÖLÇÜT");
  console.log("   Kimlik listesi DEĞİL: `note` içinde \"" + SAYIM_KODU + "\"");
  console.log("   geçen hareketler. Komut: npm run canli:sayim-esas -- --geri");

  if (!YAZ) {
    console.log("\n" + "=".repeat(104));
    console.log("KURU KOŞUM — HİÇBİR ŞEY YAZILMADI.");
    console.log("=".repeat(104) + "\n");
    await p.$disconnect();
    return;
  }
  // ═══ YAZIM ═══════════════════════════════════════════════════════════
  /** ⭐ İKİNCİ KOŞUM SIFIR: bu sayım kodu zaten yazılmışsa DURUR. */
  const zaten = await p.stockMovement.count({ where: { note: { contains: SAYIM_KODU } } });
  if (zaten > 0) {
    console.log("\n⭐ BU SAYIM ZATEN YAZILMIŞ — " + zaten + " hareket var.");
    console.log("   Yazılacak yeni hareket: 0   (ikinci koşum etkisiz)");
    console.log("   Geri almak için: npm run canli:sayim-esas -- --geri\n");
    await p.$disconnect();
    return;
  }

  const stokOnce = await p.stockMovement.aggregate({ _sum: { quantityDelta: true } });
  const an = new Date();
  an.setUTCHours(0, 0, 0, 0);

  console.log("\n⚠ YAZILIYOR — " + satirlar.filter((x) => x.farkBugun !== 0).length + " varyant");
  const noCostListe: { sku: string; adet: number; ad: string }[] = [];
  const yazilamayan: string[] = [];
  let hareket = 0, artiDegerY = 0, eksiDegerY = 0;

  for (const st of satirlar) {
    if (st.farkBugun === 0) continue;
    if (st.farkBugun < 0) {
      /** EKSİ: FIFO'dan düşer, HER PARTİ İÇİN AYRI hareket (parti izi korunur). */
      const partiler = await acikPartiler(p, st.id, gunSonu(an));
      const d = fifoDagit(partiler, Math.abs(st.farkBugun));
      if (!d.yeterliMi) { yazilamayan.push(st.sku + " (FIFO yetmedi)"); continue; }
      for (const x of d.dagitim) {
        await p.stockMovement.create({
          data: {
            variantId: st.id, type: "COUNT_CORRECTION", quantityDelta: -x.adet,
            occurredAt: an, sourceMovementId: x.parti.hareketId,
            unitCostAmount: x.parti.birimMaliyet === null ? null : String(x.parti.birimMaliyet),
            unitCostCurrency: x.parti.birimMaliyet === null ? null : "TRY",
            note: SAYIM_KODU + " · fiziksel sayim esas (Halil, 7 saat). Defter " +
              st.bugun + ", sayilan " + st.olmasi + ".",
          },
        });
        hareket++;
        eksiDegerY += x.adet * Number(x.parti.birimMaliyet ?? 0);
      }
    } else {
      /** ARTI: yeni parti. Maliyet FIFO'daki son partiden; yoksa NO_COST. */
      const sonParti = await p.stockMovement.findFirst({
        where: { variantId: st.id, quantityDelta: { gt: 0 }, unitCostAmount: { not: null } },
        orderBy: [{ occurredAt: "desc" }],
        select: { unitCostAmount: true, unitCostCurrency: true },
      });
      const m = sonParti === null ? null : Number(sonParti.unitCostAmount!.toString());
      if (m === null) noCostListe.push({ sku: st.sku, adet: st.farkBugun, ad: st.ad });
      else artiDegerY += st.farkBugun * m;
      await p.stockMovement.create({
        data: {
          variantId: st.id, type: "COUNT_CORRECTION", quantityDelta: st.farkBugun,
          occurredAt: an,
          unitCostAmount: m === null ? null : String(m),
          unitCostCurrency: m === null ? null : (sonParti!.unitCostCurrency ?? "TRY"),
          note: SAYIM_KODU + " · fiziksel sayim esas (Halil, 7 saat). Defter " +
            st.bugun + ", sayilan " + st.olmasi + "." +
            (m === null ? " MALIYET BILINMIYOR — parti NO_COST (uydurulmadi)." : ""),
        },
      });
      hareket++;
    }
  }
  console.log("   ⭐ yazılan hareket: " + hareket);
  if (yazilamayan.length > 0) {
    console.log("   ⛔ YAZILAMAYAN: " + yazilamayan.join(" · "));
  }

  const stokSonra = await p.stockMovement.aggregate({ _sum: { quantityDelta: true } });
  const fark = (stokSonra._sum.quantityDelta ?? 0) - (stokOnce._sum.quantityDelta ?? 0);
  console.log("\n   DOĞRULAMA:");
  console.log("     net stok: " + (stokOnce._sum.quantityDelta ?? 0) + " → " +
    (stokSonra._sum.quantityDelta ?? 0) + "   fark " + fark +
    "   (beklenen " + b.net + ")" + (fark === b.net ? "   ✓" : "   ⛔"));
  console.log("     envanter değeri: ARTI +" + t2(artiDegerY) +
    " · EKSİ −" + t2(eksiDegerY) + "   ⭐ NET " + t2(artiDegerY - eksiDegerY));

  console.log("\n   ⭐ NO_COST PARTİLER (" + noCostListe.length + "):");
  if (noCostListe.length === 0) console.log("     (yok)");
  for (const x of noCostListe) {
    console.log("     " + x.sku.padEnd(18) + "+" + String(x.adet).padStart(3) +
      " adet · " + x.ad.slice(0, 46));
  }

  await p.auditLog.create({
    data: {
      action: "FIZIKSEL_SAYIM_ESAS_ALINDI",
      targetType: "StockMovement",
      detail: JSON.stringify({
        sayimKodu: SAYIM_KODU,
        gerekce: "Halil 7 saat fiziksel sayim yapti ve kurali koydu: FIZIKI VARLIK ESASTIR. Sonraki Excel aktarimlari stok rakamlarini bozmustu.",
        dosya: { ad: "Stok.xlsx", md5: MD5, sayfa: "SELLIORA",
          trendyolSayfasi: "DAHIL DEGIL — kanal listeleme stogu, ayri kalem." },
        sayilanSatir: sayilan.length,
        eslesme: eslesen.length + "/" + sayilan.length,
        sayimAnindakiFark: {
          aciklama: "Dosyanin kendi iki sutunu: sayim gunu sistem ne diyordu ile rafta ne vardi. Duzeltme BUNA gore degil, BUGUNKU farka gore yapildi; bu rakam KAYIT olarak duruyor.",
          tutuyor: a.tutan, sistemFazla: a.fazla, fazlaAdet: a.fazlaAdet,
          sistemAz: a.az, azAdet: a.azAdet, net: a.net,
        },
        bugunkuFark: {
          tutuyor: b.tutan, sistemFazla: b.fazla, fazlaAdet: b.fazlaAdet,
          sistemAz: b.az, azAdet: b.azAdet, net: b.net,
        },
        sayimdanBuguneKayanSatir: kaymis,
        yazilan: { hareket, netStokFarki: fark, yazilamayan },
        envanterDegeri: { arti: artiDegerY.toFixed(2), eksi: eksiDegerY.toFixed(2),
          net: (artiDegerY - eksiDegerY).toFixed(2) },
        noCostPartiler: noCostListe,
        geriAlmaOlcutu: "Kimlik listesi DEGIL: note icinde sayim kodu gecen hareketler. Komut: npm run canli:sayim-esas -- --geri",
      }),
    },
  });
  console.log("\n   ✓ AuditLog: FIZIKSEL_SAYIM_ESAS_ALINDI");
  console.log("     ⭐ Sayım anındaki fark (①) ize YAZILDI — kaybolmuyor.");

  console.log("\n" + "=".repeat(104));
  console.log("YAZILDI. Geri alma: npm run canli:sayim-esas -- --geri");
  console.log("=".repeat(104) + "\n");
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
