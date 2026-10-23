/**
 * ============================================================================
 *  STOK KİLİDİ BEKÇİSİ — EŞZAMANLI İKİ TÜKETİM AYNI PARTİYİ YİYEMEZ (K362)
 * ----------------------------------------------------------------------------
 *  Kullanıcı kararı 23.10.2026 («başla»): çok kullanıcıdan önce stok düşümüne kilit.
 *  Risk bugün de var: TY/HB/N11 çekimleri 5 dakikada bir arka planda, kullanıcı aynı
 *  anda elle satış/iade/düzeltme girebiliyor. Kilitsiz iki işlem aynı açık partiyi
 *  okur ve ikisi de düşer → ledger ile FIFO sessizce ayrışır.
 *
 *  GERÇEK VERİTABANINDA, GERÇEK `acikPartiler` ile (desen aramaz). Yerel veritabanına
 *  geçici ürün açar, sonunda siler. Her senaryo işlem içinde ÖNCE kilitsiz bir okuma
 *  yapar: veritabanının «işlem başı fotoğrafı» (REPEATABLE READ) o anda alınır —
 *  kilit tek başına yetmez, okuma da güncel olmalı.
 *
 *   ① iki işlem · tek adetlik parti → tam BİR tüketim, parti aşırı tüketilmez
 *   ② farklı ürünler birbirini BEKLEMEZ (kilit ürün başına, küresel değil)
 *   ③ işlem DIŞI okuma (ekranlar) kilit beklemez
 *   ④ kilitli yol ile kilitsiz yol AYNI partileri döndürür (sınır dahil)
 * ============================================================================
 */
/** BETIK SINIFI: TEK_SEFERLIK — BEKCI — kendi test verisini (KILITTEST-) yazip siler, canli stoga dokunmaz. */
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { acikPartiler, fifoDagit, gunSonu, tuketilecekPartiler } from "../src/lib/stok";
import { kaynakOku } from "./kaynak-oku";

const ONEK = "KILITTEST-";
let basarisiz = 0;
let calisan = 0;
const BOLUM_SAYISI = 6;
const kosanBolumler: string[] = [];

function kontrol(ad: string, kosul: boolean, ayrinti?: unknown) {
  calisan++;
  if (kosul) console.log(`  OK    ${ad}`);
  else {
    basarisiz++;
    console.log(`  HATA  ${ad}`);
    if (ayrinti !== undefined) console.log("        ", ayrinti);
  }
}

/** İki tarafın da noktaya gelmesini bekleyen basit bariyer. */
function bariyer(n: number) {
  let gelen = 0;
  let ac!: () => void;
  const acildi = new Promise<void>((r) => (ac = r));
  return async () => {
    gelen++;
    if (gelen >= n) ac();
    await acildi;
  };
}

const bekle = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** Süre aşılırsa "ZAMAN_ASIMI" döner — kilitlenmeyi «geçti» saymamak için. */
const sureli = <T,>(p: Promise<T>, ms: number) =>
  Promise.race([p, bekle(ms).then(() => "ZAMAN_ASIMI" as const)]);

async function urunKur(ad: string, partiler: { adet: number; tarih: string; maliyet: string }[]) {
  const urun = await prisma.product.create({
    data: { name: `${ONEK}${ad}`, variants: { create: { sku: `${ONEK}${ad}`, companySku: `${ONEK}F-${ad}`, isDefault: true } } },
    include: { variants: true },
  });
  const variantId = urun.variants[0].id;
  for (const p of partiler) {
    await prisma.stockMovement.create({
      data: { variantId, type: "PURCHASE_IN", quantityDelta: p.adet, occurredAt: new Date(p.tarih), unitCostAmount: p.maliyet, unitCostCurrency: "TRY" },
    });
  }
  return variantId;
}

/** Bir «satış»ın stok çekirdeği: kilitsiz okuma (fotoğraf) → bariyer → parti oku → düş. */
async function tuketimIslemi(variantId: string, adet: number, bariyereGel: () => Promise<void>) {
  return prisma.$transaction(
    async (tx) => {
      await tx.productVariant.findUnique({ where: { id: variantId }, select: { id: true } });
      await tx.stockMovement.count({ where: { variantId } });
      await bariyereGel();
      // SINIR YOK: eşzamanlılık testi — tarih sınırı değil kilit sınanıyor (sınır ④'te ayrıca)
      const partiler = await tuketilecekPartiler(tx, variantId);
      const dagitim = fifoDagit(partiler, adet);
      if (!dagitim.yeterliMi) return false;
      for (const pay of dagitim.dagitim) {
        await tx.stockMovement.create({
          data: { variantId, type: "SALE_OUT", quantityDelta: -pay.adet, sourceMovementId: pay.parti.hareketId, unitCostAmount: pay.parti.birimMaliyet, unitCostCurrency: "TRY", note: `${ONEK}tüketim` },
        });
      }
      return true;
    },
    { timeout: 20_000, maxWait: 10_000 },
  );
}

/** Bu betiğin ürettiği test verisi — başta (yarım kalmış eski koşum) ve sonda silinir. */
async function temizle() {
  const vs = await prisma.productVariant.findMany({ where: { sku: { startsWith: ONEK } }, select: { id: true, productId: true } });
  const ids = vs.map((v) => v.id);
  if (ids.length) {
    await prisma.stockMovement.deleteMany({ where: { variantId: { in: ids }, quantityDelta: { lt: 0 } } });
    await prisma.stockMovement.deleteMany({ where: { variantId: { in: ids } } });
    await prisma.productVariant.deleteMany({ where: { id: { in: ids } } });
  }
  await prisma.product.deleteMany({ where: { OR: [{ name: { startsWith: ONEK } }, { id: { in: vs.map((v) => v.productId) } }] } });
}

async function ana() {
  await temizle();
  try {
    // ── ① İKİ İŞLEM · TEK ADETLİK PARTİ ─────────────────────────────────
    console.log("\n① iki eşzamanlı tüketim, tek adetlik parti");
    {
      const vid = await urunKur("TEK", [{ adet: 1, tarih: "2026-01-01", maliyet: "100" }]);
      const gel = bariyer(2);
      const sonuc = await sureli(Promise.allSettled([tuketimIslemi(vid, 1, gel), tuketimIslemi(vid, 1, gel)]), 30_000);
      kontrol("iki işlem de bitti (kilitlenme yok)", sonuc !== "ZAMAN_ASIMI", sonuc);
      const basarili = sonuc === "ZAMAN_ASIMI" ? [] : sonuc.filter((s) => s.status === "fulfilled" && s.value === true);
      const reddedilen = sonuc === "ZAMAN_ASIMI" ? [] : sonuc.filter((s) => s.status === "fulfilled" && s.value === false);
      kontrol("tam BİR tüketim yazıldı, öteki «stok yok» gördü", basarili.length === 1 && reddedilen.length === 1, sonuc);
      const ledger = (await prisma.stockMovement.aggregate({ where: { variantId: vid }, _sum: { quantityDelta: true } }))._sum.quantityDelta;
      kontrol("ledger 0 (eksiye düşmedi)", ledger === 0, ledger);
      /* Kalan ≤ 0 parti listeden ELENİR — «FIFO 0» aşırı tüketimi göremez; tüketim sayılır. */
      const tuketim = (await prisma.stockMovement.aggregate({ where: { variantId: vid, quantityDelta: { lt: 0 } }, _sum: { quantityDelta: true } }))._sum.quantityDelta;
      kontrol("parti BİR kez tüketildi (aşırı tüketim yok)", tuketim === -1, tuketim);
    }
    kosanBolumler.push("tek-parti");

    // ── ② FARKLI ÜRÜNLER BİRBİRİNİ BEKLEMEZ ────────────────────────────
    console.log("\n② farklı ürünler birbirini beklemez");
    {
      const v1 = await urunKur("FARK1", [{ adet: 2, tarih: "2026-01-01", maliyet: "100" }]);
      const v2 = await urunKur("FARK2", [{ adet: 2, tarih: "2026-01-01", maliyet: "100" }]);
      /* A, v1'in kilidini alıp B'nin v2 kilidini almasını BEKLER. Kilit küresel olsaydı
         B hiç alamaz, A süresiz bekler → zaman aşımı. */
      let bKilitAldi!: () => void;
      const bAldi = new Promise<void>((r) => (bKilitAldi = r));
      const a = prisma.$transaction(async (tx) => {
        // SINIR YOK: eşzamanlılık testi — tarih sınırı değil kilit sınanıyor (sınır ④'te ayrıca)
        await tuketilecekPartiler(tx, v1);
        await sureli(bAldi, 8_000);
        return "A";
      }, { timeout: 20_000 });
      await bekle(300);
      const b = prisma.$transaction(async (tx) => {
        // SINIR YOK: eşzamanlılık testi — tarih sınırı değil kilit sınanıyor (sınır ④'te ayrıca)
        await tuketilecekPartiler(tx, v2);
        bKilitAldi();
        return "B";
      }, { timeout: 20_000 });
      const t0 = Date.now();
      const sonuc = await sureli(Promise.all([a, b]), 15_000);
      kontrol("iki ürünün işlemi aynı anda ilerledi (birbirini beklemedi)", sonuc !== "ZAMAN_ASIMI" && Date.now() - t0 < 6_000, { sure: Date.now() - t0 });
    }
    kosanBolumler.push("farkli-urun");

    // ── ③ İŞLEM DIŞI OKUMA KİLİT BEKLEMEZ ──────────────────────────────
    console.log("\n③ ekran okuması (işlem dışı) kilit beklemez");
    {
      const v = await urunKur("EKRAN", [{ adet: 3, tarih: "2026-01-01", maliyet: "100" }]);
      let bitir!: () => void;
      const bitis = new Promise<void>((r) => (bitir = r));
      let kilitAlindi!: () => void;
      const alindi = new Promise<void>((r) => (kilitAlindi = r));
      const tutan = prisma.$transaction(async (tx) => {
        // SINIR YOK: eşzamanlılık testi — tarih sınırı değil kilit sınanıyor (sınır ④'te ayrıca)
        await tuketilecekPartiler(tx, v);
        kilitAlindi();
        await sureli(bitis, 10_000);
      }, { timeout: 20_000 });
      await alindi;
      const t0 = Date.now();
      // SINIR YOK: eşzamanlılık testi — tarih sınırı değil kilit sınanıyor (sınır ④'te ayrıca)
      const okuma = await sureli(acikPartiler(prisma, v), 3_000);
      kontrol("kilit tutulurken ekran okuması hemen döndü", okuma !== "ZAMAN_ASIMI" && Date.now() - t0 < 2_000, { sure: Date.now() - t0 });
      bitir();
      await tutan;
    }
    kosanBolumler.push("ekran");

    // ── ④ KİLİTLİ YOL = KİLİTSİZ YOL ───────────────────────────────────
    console.log("\n④ kilitli okuma ile ekran okuması aynı partileri verir");
    {
      const v = await urunKur("ESIT", [
        { adet: 3, tarih: "2026-01-01", maliyet: "100.5" },
        { adet: 5, tarih: "2026-02-01", maliyet: "120" },
        { adet: 2, tarih: "2026-03-01", maliyet: "130.25" },
      ]);
      // SINIR YOK: eşzamanlılık testi — tarih sınırı değil kilit sınanıyor (sınır ④'te ayrıca)
      const ilk = (await acikPartiler(prisma, v))[0];
      await prisma.stockMovement.create({ data: { variantId: v, type: "SALE_OUT", quantityDelta: -2, sourceMovementId: ilk.hareketId, unitCostAmount: "100.5", unitCostCurrency: "TRY", note: `${ONEK}tüketim` } });
      const sinir = new Date("2026-02-14");
      for (const [ad, s] of [["sınırsız", undefined], ["sınırlı", sinir]] as const) {
        const ekran = await acikPartiler(prisma, v, s === undefined ? undefined : gunSonu(s));
        const kilitli = await prisma.$transaction((tx) => tuketilecekPartiler(tx, v, s === undefined ? undefined : gunSonu(s)));
        const biçim = (l: typeof ekran) => JSON.stringify(l.map((p) => ({ ...p, occurredAt: p.occurredAt.toISOString(), birimMaliyet: p.birimMaliyet === null ? null : Number(p.birimMaliyet) })));
        kontrol(`${ad}: iki yol birebir (${ekran.length} parti)`, ekran.length > 0 && biçim(ekran) === biçim(kilitli), { ekran: biçim(ekran), kilitli: biçim(kilitli) });
      }
    }
    kosanBolumler.push("esitlik");

    // ── ⑥ KİLİT BEKLENİRKEN GELEN YENİ PARTİ GÖRÜLÜR ───────────────────
    /* Girişler de kilitli okunur: bekleyen işlem, beklerken eklenen partiyi (mal
       kabul · iade girişi) görmezse YANLIŞLIKLA «stok yok» der. (Mutasyonla bulundu:
       giriş okuması düz yapılınca ①–④ yeşil kalıyordu — korumanın ölçütü yoktu.) */
    console.log("\n⑥ kilit beklerken eklenen yeni parti görülür");
    {
      const v = await urunKur("YENIPARTI", [{ adet: 1, tarih: "2026-01-01", maliyet: "100" }]);
      const gel = bariyer(2);
      const a = prisma.$transaction(async (tx) => {
        await tx.stockMovement.count({ where: { variantId: v } });
        await gel();
        // SINIR YOK: eşzamanlılık testi — tarih sınırı değil kilit sınanıyor (sınır ④'te ayrıca)
        await tuketilecekPartiler(tx, v);
        await bekle(300);
        await tx.stockMovement.create({ data: { variantId: v, type: "PURCHASE_IN", quantityDelta: 4, occurredAt: new Date("2026-01-02"), unitCostAmount: "110", unitCostCurrency: "TRY" } });
      }, { timeout: 20_000 });
      const b = prisma.$transaction(async (tx) => {
        await tx.stockMovement.count({ where: { variantId: v } });
        await gel();
        await bekle(100);
        // SINIR YOK: eşzamanlılık testi — tarih sınırı değil kilit sınanıyor (sınır ④'te ayrıca)
        return (await tuketilecekPartiler(tx, v)).reduce((t, p) => t + p.kalanAdet, 0);
      }, { timeout: 20_000 });
      const [, bGordu] = await Promise.all([a, b]);
      kontrol("bekleyen işlem yeni partiyi gördü (1 + 4 = 5)", bGordu === 5, bGordu);
    }
    kosanBolumler.push("yeni-parti");

    // ── ⑤ DESEN YASAĞI — İŞLEM İÇİNDE KİLİTSİZ PARTİ OKUMASI YOK ───────
    console.log("\n⑤ stoktan düşen her yol kilitli okumayı kullanır (desen yasağı, liste yok)");
    {
      const dosyalar: string[] = [];
      const gez = (d: string) => {
        for (const ad of readdirSync(d)) {
          const yol = join(d, ad);
          if (statSync(yol).isDirectory()) { if (ad !== "generated") gez(yol); }
          else if (/\.(ts|tsx)$/.test(ad)) dosyalar.push(yol);
        }
      };
      gez("src");
      const yorumsuz = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
      const ihlal: string[] = [];
      let kilitliCagri = 0;
      for (const f of dosyalar) {
        const k = yorumsuz(kaynakOku(f.split("\\").join("/")));
        // SINIR YOK: bu iki satır çağrı değil, DESEN — fifo-sinir bekçisi adı çağrı sanıyor
        if (/acikPartiler(Toplu)?\(\s*tx\b/.test(k)) ihlal.push(f);
        // SINIR YOK: çağrı değil, DESEN (taban sayımı)
        kilitliCagri += (k.match(/tuketilecekPartiler(Toplu)?\(\s*(tx|db)\b/g) ?? []).length;
      }
      kontrol("taban DOLU: src taraması dosya buldu", dosyalar.length > 100, dosyalar.length);
      kontrol("işlem içinde (`tx`) kilitsiz `acikPartiler` çağrısı YOK", ihlal.length === 0, ihlal);
      /* Bugün 8 yol: satış · onay · iade (değişim + geri dönen) · düzeltme · bildirim · sayım · iade geri alma. */
      kontrol("kilitli okuma en az 8 yerde çağrılıyor (taban)", kilitliCagri >= 8, kilitliCagri);
      const geriAlma = yorumsuz(kaynakOku("src/lib/iade-geri-alma-veri.ts"));
      kontrol("iade geri alma YAZIM yolu kilitli okur",
        /iadeGeriAlmaOku\(tx, girdi\.returnId, true\)/.test(geriAlma) && /kilitli\s*\?\s*await tuketilecekPartilerToplu\(db, girisVaryantlari\)/.test(geriAlma));
    }
    kosanBolumler.push("desen");
  } catch (e) {
    basarisiz++;
    console.log("  HATA  betik istisnayla kesildi", e);
  } finally {
    await temizle();
    const kalan = await prisma.productVariant.count({ where: { sku: { startsWith: ONEK } } });
    console.log(`\nTemizlik: kalan test ürünü = ${kalan}`);
    if (kalan !== 0) basarisiz++;
    await prisma.$disconnect();
  }

  console.log("");
  if (kosanBolumler.length !== BOLUM_SAYISI) {
    console.log(`KOŞUM YARIM KALDI — sonuç GEÇERSİZ (${kosanBolumler.length}/${BOLUM_SAYISI})`);
    process.exit(1);
  } else if (basarisiz === 0) {
    console.log(`TÜM KONTROLLER GEÇTİ (${calisan})`);
    process.exit(0);
  } else {
    console.log(`${basarisiz} KONTROL BAŞARISIZ (${calisan} kontrol içinde)`);
    process.exit(1);
  }
}

void ana();
