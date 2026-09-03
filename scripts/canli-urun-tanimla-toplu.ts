/** BETIK SINIFI: TEK_SEFERLIK — Guncel Satislar dosyasindaki TANIMSIZ urunleri acar; parti `urun-tanim-20260903` kilidinde, dosya md5 dogrulamali. */
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

import readXlsxFile from "read-excel-file/node";

import { paketiNormalle } from "../src/lib/tablo/paket";
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  TOPLU ÜRÜN TANIMI — SATIŞ DOSYASINDAKİ TANIMSIZ ÜRÜNLER
 * ----------------------------------------------------------------------------
 *      npm run canli:urun-tanimla-toplu             → KURU KOŞUM (yazmaz)
 *      npm run canli:urun-tanimla-toplu -- --uygula → YAZAR
 *
 *  ── YETKİ ───────────────────────────────────────────────────────────────
 *  Halil 03.09.2026: _"satış listesini tekrar veriyorum … kontrol et ve
 *  HEPSİNİ içeri al."_ Satışların girmesinin ön şartı ürün tanımı; bu
 *  betik o ön şartı açar. Satışın kendisini YAZMAZ — onu mevcut aktarma
 *  (`canli:satis-ice-aktar`) yazar; ikinci motor açılmaz.
 *
 *  ── KOD YERLEŞİMİ (adlandırma standardı) ────────────────────────────────
 *  · EAN görünümlü kod (yalnız rakam, 8–14 hane) → `barcode`
 *  · Kanal katalog kodu (HBCV… / TYBA… / ENT-…) → `sku` (sistem içi kod
 *    olarak; ChannelSku AÇILMAZ çünkü komisyon oranı satırda dosyadan
 *    geliyor ve hesap eşlemesi aktarmanın işi)
 *  · `companySku` zorunlu-benzersiz → kod aynen; gerçek firma etiketi
 *    verilince ekrandan güncellenir. Bu bir VEKİL değil BEYANDIR: alan
 *    dolu olmak zorunda ve kaynağı nota yazılıyor.
 *  · Kategori BOŞ → KDV çözümü anayasadaki sırayla varsayılan %20'ye düşer
 *    (ürün istisnası > kategori > %20). Kategoriyi Halil sonra atar.
 *
 *  ── ⛔ İKİ KOD AYNI ÜRÜNSE TEK ÜRÜN ─────────────────────────────────────
 *  Aynı satırda hem SKU hem BARKOD doluysa ikisi TEK varyanta yazılır;
 *  gruplar kod ortaklığıyla birleştirilir (union-find). İki ayrı ürün
 *  açmak, kâr geçmişini ikiye bölerdi.
 *
 *  ── TEKRAR KOŞULABİLİRLİK ───────────────────────────────────────────────
 *  Ölçüt liste değil: _"bu kodlardan HERHANGİ biri sistemde tanımlı mı"_ —
 *  tanımlıysa grup atlanır. İkinci koşum zararsızdır.
 *  Geri alma ölçütü: `AuditLog` partisi + o varyantın HİÇBİR satış/alım
 *  kaydına bağlanmamış olması. Liste saklanmaz.
 * ============================================================================
 */

const DOSYA = "C:/Users/yapra/Downloads/Guncel Satislar..xlsx";
const PARTI = "urun-tanim-20260903";
const UYGULA = process.argv.includes("--uygula");

const metne = (h: unknown): string =>
  h instanceof Date ? h.toISOString().slice(0, 10) : String(h ?? "").trim();
const anahtarla = (s: string) => s.toLocaleLowerCase("tr-TR").replace(/[\s_-]+/g, "");
const num = (h: unknown): number => (typeof h === "number" && Number.isFinite(h) ? h : 0);
const p2 = (x: number) =>
  x.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** Çöp kod: boş ya da hiç rakam içermeyen ("trendyol", "TRENDYOL" vb.). */
const copMu = (k: string) => k === "" || !/\d/.test(k);
const eanMi = (k: string) => /^\d{8,14}$/.test(k);

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");

  const ham = readFileSync(DOSYA);
  const md5 = createHash("md5").update(ham).digest("hex");
  console.log("=".repeat(96));
  console.log(`  TOPLU ÜRÜN TANIMI · KİP: ${UYGULA ? "⚠ UYGULA (YAZAR)" : "KURU KOŞUM (yazmaz)"}`);
  console.log(`  dosya ${DOSYA.split("/").pop()} · md5 ${md5}`);
  console.log("=".repeat(96));

  const sayfalar = await readXlsxFile(paketiNormalle(ham).bayt);
  const sayfa = sayfalar[0];
  const bi = sayfa.data.findIndex((r) =>
    r.some((h) => metne(h).toLowerCase().includes("sipariş")));
  const bas = sayfa.data[bi].map((h) => metne(h));
  const K = (a: string) => bas.findIndex((h) => anahtarla(h) === anahtarla(a));
  const kol = {
    sku: K("SKU"), barkod: K("AXCALI BARKOD"), urun: K("Ürün"), tur: K("TÜR"),
    marka: K("PAZAR YERI"), fiyat: K("ÜRÜN LİSTE FİYATI"), adet: K("Satış Miktarı"),
  };
  /** ⛔ KOLON ADLA BULUNUR, İNDEKS VARSAYILMAZ — bir önceki turda [1]/[2]
   *  ters okundu ve yakalanması ölçüm gerektirdi. Bulunamayan kolon hata. */
  for (const [ad, i] of Object.entries(kol))
    if (i < 0) { console.log(`⛔ KOLON YOK: ${ad}`); process.exitCode = 1; return; }
  const satisTuru = (t: string) => anahtarla(t).includes("satış") || anahtarla(t).includes("satis");

  /* ── Sistemde TANIMLI kodlar (aktarmanın kendi haritasıyla birebir) ── */
  const varyantlar = await prisma.productVariant.findMany({
    select: { sku: true, companySku: true, barcode: true,
      channelSkus: { select: { channelSku: true } } },
  });
  const tanimli = new Set<string>();
  for (const v of varyantlar) {
    if (v.barcode) tanimli.add(v.barcode);
    tanimli.add(v.companySku);
    tanimli.add(v.sku);
    for (const k of v.channelSkus) tanimli.add(k.channelSku);
  }

  /* ── Gruplama: kod ortaklığıyla birleştir ── */
  const grupNo = new Map<string, number>();       // kod → grup
  type Grup = { kodlar: Set<string>; ad: string; n: number; ciro: number };
  const gruplar = new Map<number, Grup>();
  let siradaki = 0;
  const kova = new Map<string, number>();
  const say = (k: string) => kova.set(k, (kova.get(k) ?? 0) + 1);

  for (let i = bi + 1; i < sayfa.data.length; i += 1) {
    const r = sayfa.data[i];
    if (!satisTuru(metne(r[kol.tur]))) { say("turFarkli"); continue; }
    const kodlar = [metne(r[kol.sku]), metne(r[kol.barkod])].filter((k) => !copMu(k));
    if (kodlar.length === 0) { say("kullanilabilirKodYok"); continue; }
    if (kodlar.some((k) => tanimli.has(k))) { say("zatenTanimli"); continue; }
    say("tanimsiz");
    let no = kodlar.map((k) => grupNo.get(k)).find((x) => x !== undefined);
    if (no === undefined) { no = siradaki; siradaki += 1;
      gruplar.set(no, { kodlar: new Set(), ad: "", n: 0, ciro: 0 }); }
    const g = gruplar.get(no)!;
    for (const k of kodlar) {
      /** İki grup aynı koda çıkarsa birleştir. */
      const eski = grupNo.get(k);
      if (eski !== undefined && eski !== no) {
        const e = gruplar.get(eski)!;
        for (const kk of e.kodlar) { g.kodlar.add(kk); grupNo.set(kk, no); }
        g.n += e.n; g.ciro += e.ciro;
        if (g.ad.length < e.ad.length) g.ad = e.ad;
        gruplar.delete(eski);
      }
      g.kodlar.add(k); grupNo.set(k, no);
    }
    const ad = metne(r[kol.urun]);
    if (ad.length > g.ad.length) g.ad = ad;   // en uzun ad en bilgilendirici
    g.n += 1; g.ciro += num(r[kol.fiyat]) * (num(r[kol.adet]) || 1);
  }

  console.log("\n① OKUMA KOVALARI");
  for (const [k, n] of [...kova.entries()].sort((a, b) => b[1] - a[1]))
    console.log(`   ${k.padEnd(24)} ${String(n).padStart(6)} satır`);

  /* ── Plan ── */
  type Plan = { adlar: { sku: string; barcode: string | null; companySku: string };
    ad: string; n: number; ciro: number };
  const plan: Plan[] = [];
  let adsiz = 0;
  for (const g of gruplar.values()) {
    if (g.ad === "") { adsiz += 1; continue; }  // adsız ürün AÇILMAZ (İlke #14'ün veri hâli)
    const kodlar = [...g.kodlar];
    const ean = kodlar.find(eanMi) ?? null;
    const kanalKodu = kodlar.find((k) => !eanMi(k)) ?? null;
    /** sku: kanal kodu varsa o (sistem içi ayırt edici), yoksa EAN. */
    const sku = kanalKodu ?? ean!;
    plan.push({ adlar: { sku, barcode: ean, companySku: sku },
      ad: g.ad.slice(0, 190), n: g.n, ciro: g.ciro });
  }
  plan.sort((a, b) => b.ciro - a.ciro);
  const toplamCiro = plan.reduce((a, x) => a + x.ciro, 0);
  console.log(`\n② PLAN — açılacak ürün: ${plan.length}  (adsız atlandı: ${adsiz})`);
  console.log(`   bu ürünlerin dosyadaki satış hacmi: ₺${p2(toplamCiro)}`);
  console.log("\n   ciroya göre ilk 15:");
  for (const u of plan.slice(0, 15))
    console.log(`   ${u.adlar.sku.slice(0, 20).padEnd(21)} brk ${(u.adlar.barcode ?? "—").padEnd(15)}` +
      ` ${String(u.n).padStart(4)} satır ₺${p2(u.ciro).padStart(13)}  ${u.ad.slice(0, 34)}`);

  const csv = ["sku;barcode;urun;satir;ciro"];
  for (const u of plan)
    csv.push([u.adlar.sku, u.adlar.barcode ?? "", u.ad.replace(/;/g, ","), u.n, u.ciro.toFixed(2)].join(";"));
  writeFileSync("raporlar/urun-tanim-plani.csv", "\uFEFF" + csv.join("\r\n"), "utf8");
  console.log(`\n   ⭐ tam plan: raporlar/urun-tanim-plani.csv (${plan.length})`);

  if (!UYGULA) {
    console.log("\n  KURU KOŞUM — hiçbir şey yazılmadı. Yazmak için: -- --uygula\n");
    await prisma.$disconnect();
    return;
  }

  /* ── YAZIM — ürün başına atomik; tekrar koşum zararsız ── */
  const onceUrun = await prisma.product.count();
  const onceVaryant = await prisma.productVariant.count();
  let yazilan = 0, atlanan = 0, hata = 0;
  for (const u of plan) {
    try {
      /** Yazım kapısı = okuma ölçütünün AYNISI: kod hâlâ tanımsız mı. */
      const varMi = await prisma.productVariant.findFirst({
        where: { OR: [
          { sku: u.adlar.sku }, { companySku: u.adlar.companySku },
          ...(u.adlar.barcode ? [{ barcode: u.adlar.barcode }] : []),
        ] },
        select: { id: true },
      });
      if (varMi) { atlanan += 1; continue; }
      await prisma.product.create({
        data: {
          name: u.ad,
          description:
            `${PARTI}: satış dosyasından otomatik tanım (Halil talimatı 03.09.2026: ` +
            `"hepsini içeri al"). Kategori boş → KDV varsayılan %20. ` +
            `companySku koddan kopya; gerçek firma etiketi verilince güncellenir.`,
          variants: { create: {
            sku: u.adlar.sku, companySku: u.adlar.companySku,
            barcode: u.adlar.barcode, isDefault: true,
          } },
        },
      });
      yazilan += 1;
    } catch (e) {
      hata += 1;
      console.log(`   ⛔ ${u.adlar.sku} — ${(e as Error).message.replace(/\n/g, " ").slice(-160)}`);
    }
  }
  const sonraUrun = await prisma.product.count();
  const sonraVaryant = await prisma.productVariant.count();
  console.log(`\n③ YAZIM  yazılan ${yazilan} · atlanan(yarışta tanımlanmış) ${atlanan} · hata ${hata}`);
  console.log(`   Product        ${onceUrun} → ${sonraUrun}   (fark ${sonraUrun - onceUrun})`);
  console.log(`   ProductVariant ${onceVaryant} → ${sonraVaryant}   (fark ${sonraVaryant - onceVaryant})`);
  if (sonraUrun - onceUrun !== yazilan) {
    console.log("   ⛔ SAYIM TUTMUYOR — araya başka yazım girdi ya da yazım yarım. İNCELE.");
    process.exitCode = 1;
  }
  await prisma.auditLog.create({
    data: {
      action: "URUN_TANIM_TOPLU",
      targetType: "Product",
      targetId: PARTI,
      detail: JSON.stringify({
        parti: PARTI, dosya: DOSYA.split("/").pop(), md5,
        yazilan, atlanan, hata, planUzunlugu: plan.length, adsizAtlandi: adsiz,
        gerekce: "Halil 03.09.2026: 'kontrol et ve hepsini iceri al' — satis aktarmasinin on sarti",
        geriAlmaOlcutu:
          "description alaninda parti kodu gecen Product kayitlarindan, hicbir satis/alim/hareket bagi olmayanlar",
      }),
    },
  });
  console.log(`\n   iz: AuditLog → URUN_TANIM_TOPLU / ${PARTI}\n`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("HATA:", e instanceof Error ? e.stack : e);
  process.exitCode = 1;
});
