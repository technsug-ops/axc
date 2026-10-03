import { existsSync, mkdirSync, writeFileSync } from "node:fs";

import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  KOPYA ÜRÜN KAYITLARINI BİRLEŞTİRME (K299, 28.09.2026)
 * ----------------------------------------------------------------------------
 *  BETIK SINIFI: TEK_SEFERLIK — ölçülmüş 9 çifte (sku ile) KİLİTLİ. Genel
 *  araç değildir; genel araç istisnayı kurala çevirir.
 *
 *  ⛔ VARSAYILAN KURU KOŞUM. Yazmak için `--uygula` gerekir.
 *
 *  ── NİYE ────────────────────────────────────────────────────────────────
 *  HB EAN taraması (26.09, `hb-ean-taramasi-2026-09-26.xlsx`) aynı ürünün iki
 *  ayrı kartta kayıtlı olduğunu kanıtladı: HB'nin kendi siparişindeki EAN,
 *  başka bir aktif kartın barkodunda duruyor. Satış geçmişi iki karta
 *  bölünüyor, ürün raporları eksik gösteriyor; dördünde iki kart birden aktif.
 *  Ölçüm (salt okuma, 28.09): bütün kopyaların stoğu 0.
 *  Kullanıcı kararı 28.09.2026: geçmiş asıl karta taşınır, boşalan kopya
 *  silinir; Robochop birleşir ve pasif kalır. Korbell (taramanın 1. satırı)
 *  gerçek kopya DEĞİL — boş kart pasif, taşınacak bir şey yok; listede yok.
 *
 *  ── NE YAPAR (çift başına TEK işlem, tamamı ya da hiçbiri) ────────────────
 *  ① Kopyanın stok hareketi · alım · satış · iade · iade bildirimi · sayım
 *     satırı · tarife kalemi · kanal kodu · eski kodu ASIL varyanta bağlanır.
 *     ⚠ Hareketin TARİHİ, ADEDİ, TUTARI, MALİYETİ ve FIFO bağı DEĞİŞMEZ —
 *     değişen yalnız hangi karta bağlı olduğu. (Anayasa: "metadata düzeltmesi
 *     — dar istisna": alan para/miktar DEĞİL · alternatif ölçüldü ve elendi —
 *     pasife almak geçmişi bölük bırakıyor, ekranda kart taşıma yok · iz var.)
 *  ② Kopyanın SKU · Firma SKU · barkodu asıl kartın ESKİ KODU olur: raftaki
 *     eski etiket okutulunca asıl kart açılır.
 *  ③ Asıl kartta raf/görsel yoksa kopyanınki taşınır.
 *  ④ İçi boşalan kopya varyant ve ürünü SİLİNİR (tam dökümü önce yerel
 *     anlık görüntüye ve ize yazılır).
 *
 *  ── DURDURAN KOŞULLAR (çift atlanır, SEBEBİ yazılır) ───────────────────────
 *  · kopyanın stoğu 0 değil (birleştirme stok rakamı değiştirmemeli)
 *  · kopyanın ürününde başka varyant var (ürün silinemez)
 *  · asıl kart pasif (Robochop hariç — beyanlı)
 *  · aynı pazaryeri hesabında iki kanal kodu (hesap×varyant TEKİL)
 *  · aynı sayımda ikisinin de satırı var (sayım×varyant TEKİL)
 *  · eski kod olacak bir kod BAŞKA bir kartta duruyor
 *
 *  ── GERİ ALMA ──────────────────────────────────────────────────────────
 *  Taşınan satır kimlikleri çift başına ize (`KOPYA_BIRLESTIRME`) ve yerel
 *  anlık görüntüye yazılır; silinen kopyanın tam satırı da. Otomatik `--geri`
 *  YOK — geri alma gerekirse görüntüden izli ayrı bir betikle yapılır.
 *  İkinci koşum zararsız: kopya bulunamaz ve "zaten birleşmiş" yazar.
 * ============================================================================
 */

type Cift = { ad: string; kopya: string; asil: string; asilPasifOlabilir?: true };

/**
 * ÖLÇÜLDÜ 28.09.2026 (salt okuma) — sku ile.
 *
 * ⛔ İKİ ÇİFT BİLEREK DIŞARIDA — kuru koşum durdurdu, sebep ölçüldü:
 *   · LEGO 76335 (`axcali1928` → `OYU-LG-LM-03`): Trendyol'da İKİ GERÇEK
 *     ilan — eski `TYBKQWQLTY0D5QJI54` (STOKSUZ) ve yeni `5702018063187` (AÇIK).
 *   · Tefal kek kalıbı (`axcali2385` → `axcali2723`): Hepsiburada'da İKİ
 *     ilan — `HBV00000BYVL3` (PASIF) ve `HBCV00000BLT0Y` (STOKSUZ).
 *   `ChannelSku @@unique([channelAccountId, variantId])` bir karta hesap
 *   başına TEK kod izin veriyor; birleştirmek eski ilanın bağını koparmayı
 *   gerektirir ve o ilandan gelen sipariş eşleşmeyebilir. Karar kullanıcının.
 */
const CIFTLER: Cift[] = [
  { ad: "Karaca Hatir Hup Duet Bronze", kopya: "ENT-HB8683650260073", asil: "axcali2234" },
  { ad: "Philips QP630/51 yedek bicak", kopya: "axcali2120", asil: "8720689013918" },
  { ad: "A4Tech FB2535C set", kopya: "4554356806", asil: "axcali2147" },
  { ad: "Karaca Coffee Art Barista", kopya: "HBCV0000492S73", asil: "8683650112761" },
  { ad: "Tefal salata kurutucu 4 L", kopya: "HBV00000UVG52", asil: "axcali2314" },
  { ad: "Tefal Comfort 3lu bicak", kopya: "HBCV00002TL9GX", asil: "MUT-TF-3LU-01" },
  { ad: "Jumbo hazneli rende", kopya: "HBV000018X1AO", asil: "8681085393533" },
  { ad: "LEGO 76424 Ford Anglia", kopya: "axcali2991", asil: "5702017583075" },
  /** İkisi de pasif, aktif kaydı yok — kullanıcı: birleşsin, pasif kalsın. */
  { ad: "Homend Robochop 2101H", kopya: "HBCV000074REWV", asil: "AXCALI180734", asilPasifOlabilir: true },
];

const IZ_TAVANI = 60_000; // AuditLog.detail MySQL TEXT (65.535 bayt) — kırpılırsa JSON bozulur

async function main() {
  const uygula = process.argv.includes("--uygula");
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");

  const varyantSec = {
    id: true, productId: true, sku: true, companySku: true, barcode: true, name: true,
    isDefault: true, isActive: true, locationId: true, gorselUrl: true, gorselKaynak: true,
    gorselAt: true, gorselKirikUrl: true, sayimGecersizAt: true, createdAt: true, updatedAt: true,
    product: true,
    channelSkus: { select: { id: true, channelAccountId: true, channelSku: true } },
    eskiKodlar: { select: { id: true, kod: true, kaynak: true } },
    sayimSatirlari: { select: { id: true, sayimId: true } },
    _count: { select: { options: true } },
  } as const;

  console.log("\nKOPYA ÜRÜN BİRLEŞTİRME (K299)");
  console.log(`  kip  ${uygula ? "YAZIYOR" : "KURU KOŞUM — hiçbir şey yazılmaz"}`);
  console.log("=".repeat(78));

  type Plan = {
    cift: Cift;
    kopya: NonNullable<Awaited<ReturnType<typeof oku>>>;
    asil: NonNullable<Awaited<ReturnType<typeof oku>>>;
    eskiKodEkle: { kod: string; kaynak: string }[];
    rafTasi: boolean;
    gorselTasi: boolean;
    sayimDamgasiTasi: boolean;
    urunVeri: Record<string, unknown>;
    sayilar: Record<string, number>;
  };
  const oku = (sku: string) => prisma.productVariant.findFirst({ where: { sku }, select: varyantSec });

  const planlar: Plan[] = [];
  let durdu = 0;
  let zaten = 0;
  const stokToplami = async (variantId: string) =>
    Number((await prisma.stockMovement.aggregate({ where: { variantId }, _sum: { quantityDelta: true } }))._sum.quantityDelta ?? 0);

  for (const cift of CIFTLER) {
    console.log(`\n■ ${cift.ad}   ${cift.kopya}  →  ${cift.asil}`);
    const [kopya, asil] = await Promise.all([oku(cift.kopya), oku(cift.asil)]);
    if (!asil) { console.log("  ⛔ ASIL kart bulunamadı — DURDU"); durdu++; continue; }
    if (!kopya) {
      const iz = await prisma.eskiKod.findFirst({ where: { kod: cift.kopya }, select: { variantId: true } });
      if (iz?.variantId === asil.id) { console.log("  ✓ zaten birleşmiş (kopyanın kodu asıl kartın eski kodu)"); zaten++; }
      else { console.log("  ⛔ KOPYA kart bulunamadı ve birleşme izi yok — DURDU"); durdu++; }
      continue;
    }
    const sebepler: string[] = [];
    const kopyaStok = await stokToplami(kopya.id);
    if (kopyaStok !== 0) sebepler.push(`kopyanın stoğu ${kopyaStok} (0 olmalı)`);
    const kardes = await prisma.productVariant.count({ where: { productId: kopya.productId } });
    if (kardes !== 1) sebepler.push(`kopyanın ürününde ${kardes} varyant var`);
    if (kopya._count.options > 0) sebepler.push(`kopyanın ${kopya._count.options} seçeneği var`);
    if (kopya.productId === asil.productId) sebepler.push("iki kart aynı ürünün altında");
    if (!asil.isActive && !cift.asilPasifOlabilir) sebepler.push("asıl kart PASİF");

    const asilHesaplar = new Set(asil.channelSkus.map((k) => k.channelAccountId));
    for (const k of kopya.channelSkus) {
      if (asilHesaplar.has(k.channelAccountId)) sebepler.push(`kanal kodu ${k.channelSku}: asıl kartın aynı hesapta zaten kodu var`);
    }
    const asilSayimlar = new Set(asil.sayimSatirlari.map((s) => s.sayimId));
    for (const s of kopya.sayimSatirlari) if (asilSayimlar.has(s.sayimId)) sebepler.push(`aynı sayımda iki satır (${s.sayimId})`);

    // Eski kod olacaklar: asıl kartın (taşınan kanal kodları dahil) zaten taşımadığı kodlar.
    const asilTasiyor = new Set(
      [asil.sku, asil.companySku, asil.barcode, ...asil.channelSkus.map((k) => k.channelSku), ...asil.eskiKodlar.map((e) => e.kod),
        ...kopya.channelSkus.map((k) => k.channelSku), ...kopya.eskiKodlar.map((e) => e.kod)]
        .filter((x): x is string => !!x).map((x) => x.trim()),
    );
    const eskiKodEkle: { kod: string; kaynak: string }[] = [];
    for (const [kod, kaynak] of [[kopya.sku, "SKU"], [kopya.companySku, "FIRMA_SKU"], [kopya.barcode, "BARKOD"]] as const) {
      const k = (kod ?? "").trim();
      if (k === "" || asilTasiyor.has(k) || eskiKodEkle.some((e) => e.kod === k)) continue;
      eskiKodEkle.push({ kod: k, kaynak });
    }
    // Eski kod olacak ya da taşınacak her kod BAŞKA bir kartta durmamalı.
    for (const k of [...eskiKodEkle.map((e) => e.kod), ...kopya.channelSkus.map((c) => c.channelSku)]) {
      const baska = await prisma.productVariant.findMany({
        where: {
          id: { notIn: [kopya.id, asil.id] },
          OR: [{ sku: k }, { companySku: k }, { barcode: k }, { channelSkus: { some: { channelSku: k } } }, { eskiKodlar: { some: { kod: k } } }],
        },
        select: { sku: true },
      });
      if (baska.length > 0) sebepler.push(`kod ${k} başka kartta: ${baska.map((b) => b.sku).join(",")}`);
    }

    const [hareket, alim, satis, iade, degisim, ayrilan, donen, tarife] = await Promise.all([
      prisma.stockMovement.count({ where: { variantId: kopya.id } }),
      prisma.purchaseItem.count({ where: { variantId: kopya.id } }),
      prisma.saleItem.count({ where: { variantId: kopya.id } }),
      prisma.returnItem.count({ where: { variantId: kopya.id } }),
      prisma.returnItem.count({ where: { exchangeVariantId: kopya.id } }),
      prisma.returnNotice.count({ where: { reservedVariantId: kopya.id } }),
      prisma.returnNotice.count({ where: { returnedVariantId: kopya.id } }),
      prisma.komisyonTarifeKalemi.count({ where: { variantId: kopya.id } }),
    ]);
    const sayilar = {
      hareket, alim, satis, iade, degisim, ayrilan, donen, tarife,
      sayim: kopya.sayimSatirlari.length, kanal: kopya.channelSkus.length, eskiKod: kopya.eskiKodlar.length,
    };
    const rafTasi = !asil.locationId && !!kopya.locationId;
    const gorselTasi = !asil.gorselUrl && !!kopya.gorselUrl;
    const sayimDamgasiTasi = !asil.sayimGecersizAt && !!kopya.sayimGecersizAt;
    // Ürün düzeyi: asıl kartta BOŞ olan desi/kategori/marka kopyadan alınır (kargo ve KDV kaybolmasın).
    const urunVeri: Record<string, unknown> = {};
    if (asil.product.desi === null && kopya.product.desi !== null) urunVeri.desi = kopya.product.desi;
    if (asil.product.categoryId === null && kopya.product.categoryId !== null) urunVeri.categoryId = kopya.product.categoryId;
    if (asil.product.brandId === null && kopya.product.brandId !== null) urunVeri.brandId = kopya.product.brandId;
    if (asil.product.tyKategori === null && kopya.product.tyKategori !== null) urunVeri.tyKategori = kopya.product.tyKategori;

    console.log(`  kopya: ${kopya.isActive ? "aktif" : "pasif"} · firma ${kopya.companySku} · ${kopya.product.name.slice(0, 60)}`);
    console.log(`  asıl : ${asil.isActive ? "aktif" : "pasif"} · firma ${asil.companySku} · ${asil.product.name.slice(0, 60)}`);
    console.log(`  taşınacak: ${Object.entries(sayilar).filter(([, n]) => n > 0).map(([a, n]) => `${a} ${n}`).join(" · ") || "yok"}`);
    console.log(`  kanal kodları: ${kopya.channelSkus.map((k) => k.channelSku).join(", ") || "-"}`);
    console.log(`  yeni eski kod: ${eskiKodEkle.map((e) => `${e.kod} (${e.kaynak})`).join(", ") || "-"}`);
    console.log(`  kopyadan alınacak: ${[rafTasi && "raf", gorselTasi && "görsel", sayimDamgasiTasi && "sayım damgası", ...Object.keys(urunVeri)].filter(Boolean).join(", ") || "-"}`);
    console.log(`  silinecek: kopya varyant + ürün (${kopya.product.name.slice(0, 40)})`);
    if (sebepler.length > 0) {
      for (const s of sebepler) console.log(`  ⛔ ${s}`);
      console.log("  → BU ÇİFT DURDU");
      durdu++;
      continue;
    }
    planlar.push({ cift, kopya, asil, eskiKodEkle, rafTasi, gorselTasi, sayimDamgasiTasi, urunVeri, sayilar });
  }

  console.log("\n" + "=".repeat(78));
  console.log(`ÖZET  çift ${CIFTLER.length} · birleşecek ${planlar.length} · durdu ${durdu} · zaten birleşmiş ${zaten}`);
  if (!uygula) {
    console.log("KURU KOŞUM BİTTİ — hiçbir şey yazılmadı.");
    console.log("Yazmak için:  npm run canli:kopya-birlestir -- --uygula");
    await prisma.$disconnect();
    if (durdu > 0) process.exitCode = 1;
    return;
  }
  if (durdu > 0) {
    console.log("⛔ Duran çift var — hiçbiri yazılmadı. Önce sebebi çözülür.");
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }

  /* --------------------------------------------------- YEREL GÖRÜNTÜ -- */
  const damga = new Date().toISOString().replace(/[:.]/g, "-");
  if (!existsSync("veri/ozel")) mkdirSync("veri/ozel", { recursive: true });
  const goruntuYolu = `veri/ozel/kopya-birlestirme-${damga}.json`;
  const goruntu: unknown[] = [];
  for (const p of planlar) {
    const [hareketler, alimlar, satislar, iadeler, degisimler, ayrilanlar, donenler, tarifeler] = await Promise.all([
      prisma.stockMovement.findMany({ where: { variantId: p.kopya.id }, select: { id: true } }),
      prisma.purchaseItem.findMany({ where: { variantId: p.kopya.id }, select: { id: true } }),
      prisma.saleItem.findMany({ where: { variantId: p.kopya.id }, select: { id: true } }),
      prisma.returnItem.findMany({ where: { variantId: p.kopya.id }, select: { id: true } }),
      prisma.returnItem.findMany({ where: { exchangeVariantId: p.kopya.id }, select: { id: true } }),
      prisma.returnNotice.findMany({ where: { reservedVariantId: p.kopya.id }, select: { id: true } }),
      prisma.returnNotice.findMany({ where: { returnedVariantId: p.kopya.id }, select: { id: true } }),
      prisma.komisyonTarifeKalemi.findMany({ where: { variantId: p.kopya.id }, select: { id: true } }),
    ]);
    goruntu.push({
      cift: p.cift, kopya: p.kopya, asil: p.asil,
      asilStok: await stokToplami(p.asil.id),
      tasinan: {
        hareket: hareketler.map((x) => x.id), alim: alimlar.map((x) => x.id), satis: satislar.map((x) => x.id),
        iade: iadeler.map((x) => x.id), degisim: degisimler.map((x) => x.id), ayrilan: ayrilanlar.map((x) => x.id),
        donen: donenler.map((x) => x.id), tarife: tarifeler.map((x) => x.id),
        sayim: p.kopya.sayimSatirlari.map((x) => x.id), kanal: p.kopya.channelSkus.map((x) => x.id), eskiKod: p.kopya.eskiKodlar.map((x) => x.id),
      },
    });
  }
  writeFileSync(goruntuYolu, JSON.stringify({ alindi: new Date().toISOString(), goruntu }, null, 2), "utf8");
  console.log(`\nYEREL ANLIK GÖRÜNTÜ: ${goruntuYolu}`);

  /* ----------------------------------------------------------- YAZIM -- */
  let yazilan = 0;
  for (let i = 0; i < planlar.length; i++) {
    const p = planlar[i];
    const g = goruntu[i] as { tasinan: Record<string, string[]>; asilStok: number };
    const detay = JSON.stringify({
      gerekce: "HB EAN taramasi (26.09): ayni urun iki kartta; kullanici karari 28.09 - gecmis asil karta, kopya silinir",
      kopya: { variant: { ...p.kopya, product: undefined, channelSkus: undefined, eskiKodlar: undefined, sayimSatirlari: undefined, _count: undefined }, product: p.kopya.product },
      asil: { id: p.asil.id, sku: p.asil.sku },
      tasinan: g.tasinan,
      eskiKodEklendi: p.eskiKodEkle,
      kopyadanAlinan: { raf: p.rafTasi ? p.kopya.locationId : null, gorsel: p.gorselTasi ? p.kopya.gorselUrl : null, sayimDamgasi: p.sayimDamgasiTasi, urun: p.urunVeri },
      goruntu: goruntuYolu,
    });
    if (detay.length > IZ_TAVANI) {
      console.log(`⛔ ${p.cift.ad}: iz ${detay.length} karakter (tavan ${IZ_TAVANI}) — bu çift ve sonrası YAZILMADI`);
      process.exitCode = 1;
      break;
    }
    const k = p.kopya.id;
    const a = p.asil.id;
    await prisma.$transaction(
      async (tx) => {
        const kosul = { variantId: k };
        const sonuc = [
          await tx.stockMovement.updateMany({ where: kosul, data: { variantId: a } }),
          await tx.purchaseItem.updateMany({ where: kosul, data: { variantId: a } }),
          await tx.saleItem.updateMany({ where: kosul, data: { variantId: a } }),
          await tx.returnItem.updateMany({ where: kosul, data: { variantId: a } }),
          await tx.returnItem.updateMany({ where: { exchangeVariantId: k }, data: { exchangeVariantId: a } }),
          await tx.returnNotice.updateMany({ where: { reservedVariantId: k }, data: { reservedVariantId: a } }),
          await tx.returnNotice.updateMany({ where: { returnedVariantId: k }, data: { returnedVariantId: a } }),
          await tx.komisyonTarifeKalemi.updateMany({ where: kosul, data: { variantId: a } }),
          await tx.stokSayimSatiri.updateMany({ where: kosul, data: { variantId: a } }),
          await tx.channelSku.updateMany({ where: kosul, data: { variantId: a } }),
          await tx.eskiKod.updateMany({ where: kosul, data: { variantId: a } }),
        ];
        const beklenen = [p.sayilar.hareket, p.sayilar.alim, p.sayilar.satis, p.sayilar.iade, p.sayilar.degisim, p.sayilar.ayrilan, p.sayilar.donen, p.sayilar.tarife, p.sayilar.sayim, p.sayilar.kanal, p.sayilar.eskiKod];
        const tutmayan = sonuc.findIndex((s, j) => s.count !== beklenen[j]);
        if (tutmayan >= 0) throw new Error(`taşınan satır sayısı tutmadı (sıra ${tutmayan}: ${sonuc[tutmayan].count} ≠ ${beklenen[tutmayan]}) — işlem geri alındı`);

        const kalan = await tx.stockMovement.count({ where: kosul });
        if (kalan !== 0) throw new Error("kopyada hareket kaldı — işlem geri alındı");

        await tx.productVariant.delete({ where: { id: k } });
        await tx.product.delete({ where: { id: p.kopya.productId } });

        if (p.eskiKodEkle.length > 0) {
          await tx.eskiKod.createMany({ data: p.eskiKodEkle.map((e) => ({ variantId: a, kod: e.kod, kaynak: e.kaynak })) });
        }
        const asilVeri: Record<string, unknown> = {};
        if (p.rafTasi) asilVeri.locationId = p.kopya.locationId;
        if (p.gorselTasi) Object.assign(asilVeri, { gorselUrl: p.kopya.gorselUrl, gorselKaynak: p.kopya.gorselKaynak, gorselAt: p.kopya.gorselAt });
        if (p.sayimDamgasiTasi) asilVeri.sayimGecersizAt = p.kopya.sayimGecersizAt;
        if (Object.keys(asilVeri).length > 0) await tx.productVariant.update({ where: { id: a }, data: asilVeri });
        if (Object.keys(p.urunVeri).length > 0) await tx.product.update({ where: { id: p.asil.productId }, data: p.urunVeri });

        await tx.auditLog.create({ data: { action: "KOPYA_BIRLESTIRME", targetType: "ProductVariant", targetId: a, detail: detay } });
      },
      { timeout: 120_000, maxWait: 20_000 },
    );

    // VERİ doğrulaması — iz değil (anayasa: "iz, yazımın kanıtı değil NİYETİDİR").
    const [kopyaVar, asilStokSonra, asilHareket] = await Promise.all([
      prisma.productVariant.findUnique({ where: { id: k }, select: { id: true } }),
      stokToplami(a),
      prisma.stockMovement.count({ where: { variantId: a } }),
    ]);
    const tamam = kopyaVar === null && asilStokSonra === g.asilStok && g.tasinan.hareket.every(Boolean);
    console.log(`  ${tamam ? "✓" : "⛔"} ${p.cift.ad} · asıl stok ${g.asilStok} → ${asilStokSonra} · asıl hareket ${asilHareket} · kopya ${kopyaVar ? "DURUYOR" : "silindi"}`);
    if (!tamam) { process.exitCode = 1; break; }
    yazilan++;
  }

  console.log(`\n${yazilan}/${planlar.length} çift birleştirildi · iz KOPYA_BIRLESTIRME`);
  console.log("Sıradaki: npm run canli:defter-ayrismasi (stok ↔ FIFO)");
  console.log("=".repeat(78));
  await prisma.$disconnect();
}

main();
