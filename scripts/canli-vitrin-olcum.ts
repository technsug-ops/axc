import { readFileSync, readdirSync } from "node:fs";
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  K121 ⓪ — VİTRİN/RAF ÖLÇÜMLERİ (SALT OKUMA, YENİ API ÇAĞRISI YOK)
 * ----------------------------------------------------------------------------
 *      npx tsx scripts/canli-vitrin-olcum.ts
 *
 *  BETIK SINIFI: TEK_SEFERLIK — K121 tasarım kararını besleyen ölçüm.
 *
 *  ⛔ TRENDYOL'A ÇAĞRI YOK: K112b taramasının kaydettiği ham JSON okunuyor.
 *  Kullanıcı şartı — "mevcut JSON'dan, çağrı yok".
 *
 *  ── ÜÇ SORU ───────────────────────────────────────────────────────────
 *  ① Satılamayan stoklu ürünlerin ₺ maliyet toplamı — SINIF BAZINDA
 *  ② TERS YÖN: bizde stok 0 ama TY'de satışa açık ve quantity > 0
 *     → kaç ürün, kaç HAYALET ADET (iptal ve ceza puanı riski)
 *  ③ ADET FARKI: ikisinde de var ama sayılar tutmuyor
 *
 *  ⚠ TASARIM BU RAKAMLARA BAĞLI: ters yön büyükse kutu İKİ BAŞLIKLI olur.
 *  Ölçmeden kutu çizilmez.
 * ============================================================================
 */

const KLASOR = "veri/ozel";

type Urun = Record<string, unknown>;

function metin(u: Urun, ad: string): string {
  const v = u[ad];
  return v === null || v === undefined ? "" : String(v).trim();
}
function bayrak(u: Urun, ad: string): boolean {
  return u[ad] === true;
}
function sayi(u: Urun, ad: string): number {
  const v = u[ad];
  return typeof v === "number" ? v : Number.NaN;
}

/** Sınıf önceliği D → C → B → A (en kısıtlayıcı kazanır). */
function sinifla(u: Urun): "A" | "B" | "C" | "D" {
  if (bayrak(u, "archived") || bayrak(u, "locked") || bayrak(u, "blacklisted")) return "D";
  if (!bayrak(u, "approved") || bayrak(u, "rejected")) return "C";
  if (sayi(u, "quantity") <= 0) return "B";
  return "A";
}

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");
  const { acikPartilerToplu } = await import("../src/lib/stok");

  /** En yeni tarama dosyası. */
  const dosyalar = readdirSync(KLASOR)
    .filter((a) => a.startsWith("ty-urun-taramasi-") && a.endsWith(".json"))
    .sort();
  const dosya = dosyalar.at(-1);
  if (dosya === undefined) {
    console.log("⛔ Tarama dosyası yok — önce: npm run canli:ty-urun-taramasi");
    process.exitCode = 1;
    return;
  }
  const ham = JSON.parse(readFileSync(`${KLASOR}/${dosya}`, "utf8")) as {
    alindi: string;
    urunler: Urun[];
  };

  console.log("\nK121 ⓪ — VİTRİN/RAF ÖLÇÜMLERİ");
  console.log("  tarama dosyası  " + dosya);
  console.log("  tarama anı      " + ham.alindi);
  console.log("  kip             SALT OKUMA · TY'ye ÇAĞRI YOK");
  console.log("=".repeat(72));

  /** Barkod → en iyi sınıf + o kaydın adedi. */
  const tyDurum = new Map<string, { sinif: string; adet: number }>();
  for (const u of ham.urunler) {
    const sn = sinifla(u);
    const q = Number.isFinite(sayi(u, "quantity")) ? sayi(u, "quantity") : 0;
    for (const alan of ["barcode", "stockCode", "productMainId"]) {
      const bk = metin(u, alan);
      if (bk === "") continue;
      const mevcut = tyDurum.get(bk);
      /** ⚠ Aynı barkod birden çok kayıtta olabilir — EN İYİ sınıf kalır,
       *  adet TOPLANIR (aynı barkodun iki listesi varsa ikisi de satar). */
      if (mevcut === undefined) tyDurum.set(bk, { sinif: sn, adet: q });
      else
        tyDurum.set(bk, {
          sinif: sn < mevcut.sinif ? sn : mevcut.sinif,
          adet: mevcut.adet, // ⚠ AYNI LİSTELEME — adet TEKRAR eklenmez
        });
    }
  }

  /* ═══ BİZİM TARAF ═══════════════════════════════════════════════ */
  const varyantlar = await prisma.productVariant.findMany({
    where: { isActive: true },
    select: {
      id: true,
      sku: true,
      barcode: true,
      name: true,
      product: { select: { name: true } },
    },
  });
  const stokGrup = await prisma.stockMovement.groupBy({
    by: ["variantId"],
    _sum: { quantityDelta: true },
    orderBy: { variantId: "asc" },
  });
  const stok = new Map(
    stokGrup.map((g) => [g.variantId, g._sum.quantityDelta ?? 0]),
  );

  /** Envanter değeri — açık partilerden, FIFO gövdesi çağrılarak. */
  const partiler = await acikPartilerToplu(prisma, null);
  const deger = new Map<string, number>();
  const bilinmeyenMaliyet = new Set<string>();
  for (const [vid, liste] of partiler) {
    let t = 0;
    for (const p of liste) {
      if (p.birimMaliyet === null) {
        bilinmeyenMaliyet.add(vid);
        continue;
      }
      t += p.kalanAdet * Number(p.birimMaliyet);
    }
    deger.set(vid, t);
  }

  /* ═══ ① SATILAMAYAN STOKLU ÜRÜNLER — ₺ SINIF BAZINDA ═══════════ */
  const kova = new Map<string, { adet: number; tutar: number; ornek: string[] }>([
    ["B", { adet: 0, tutar: 0, ornek: [] }],
    ["C", { adet: 0, tutar: 0, ornek: [] }],
    ["D", { adet: 0, tutar: 0, ornek: [] }],
    ["E", { adet: 0, tutar: 0, ornek: [] }],
  ]);
  let acikTutar = 0;
  let acikAdet = 0;
  let barkodsuz = 0;

  /* ═══ ② TERS YÖN — HAYALET ═══════════════════════════════════════ */
  let hayaletUrun = 0;
  let hayaletAdet = 0;
  const hayaletOrnek: string[] = [];

  /* ═══ ③ ADET FARKI ═══════════════════════════════════════════════ */
  let tyFazla = 0;
  let tyFazlaAdet = 0;
  let tyEksik = 0;
  let tyEksikAdet = 0;
  const farkOrnek: string[] = [];

  for (const v of varyantlar) {
    const bk = (v.barcode ?? "").trim();
    const bizdekiStok = stok.get(v.id) ?? 0;
    if (bk === "") {
      if (bizdekiStok > 0) barkodsuz += 1;
      continue;
    }
    const ty = tyDurum.get(bk);
    const ad = `${v.sku.padEnd(16)} ${(v.product.name + " " + (v.name ?? "")).trim().slice(0, 40)}`;

    if (bizdekiStok > 0) {
      const sn = ty?.sinif ?? "E";
      if (sn === "A") {
        acikAdet += 1;
        acikTutar += deger.get(v.id) ?? 0;
      } else {
        const k = kova.get(sn)!;
        k.adet += 1;
        k.tutar += deger.get(v.id) ?? 0;
        if (k.ornek.length < 6) k.ornek.push(`       ${ad}  ₺${(deger.get(v.id) ?? 0).toFixed(2)}`);
      }
    } else if (ty !== undefined && ty.sinif === "A" && ty.adet > 0) {
      /**
       * ⛔ TERS YÖN: bizde stok YOK ama vitrin açık ve adet bildirilmiş.
       * Satılırsa gönderilemez → iptal + ceza puanı.
       */
      hayaletUrun += 1;
      hayaletAdet += ty.adet;
      if (hayaletOrnek.length < 8) hayaletOrnek.push(`       ${ad}  TY adet ${ty.adet}`);
    }

    /** ③ İkisinde de var ama sayılar tutmuyor. */
    if (bizdekiStok > 0 && ty !== undefined && ty.sinif === "A") {
      const fark = ty.adet - bizdekiStok;
      if (fark > 0) {
        tyFazla += 1;
        tyFazlaAdet += fark;
        if (farkOrnek.length < 8) farkOrnek.push(`       TY FAZLA +${fark}  ${ad}  (TY ${ty.adet} · biz ${bizdekiStok})`);
      } else if (fark < 0) {
        tyEksik += 1;
        tyEksikAdet += -fark;
        if (farkOrnek.length < 8) farkOrnek.push(`       TY EKSİK  ${fark}  ${ad}  (TY ${ty.adet} · biz ${bizdekiStok})`);
      }
    }
  }

  /* ═══ RAPOR ═════════════════════════════════════════════════════ */
  const etiket: Record<string, string> = {
    B: "stok bildirimi KAPALI (TY quantity = 0)",
    C: "onay bekliyor / reddedildi",
    D: "pasif (arşiv · kilit · kara liste)",
    E: "TY'de HİÇ listelenmemiş",
  };

  console.log("\n① RAFTA VAR, VİTRİNDE YOK — sınıf bazında\n");
  let toplamAdet = 0;
  let toplamTutar = 0;
  for (const [sn, k] of kova) {
    if (k.adet === 0) continue;
    toplamAdet += k.adet;
    toplamTutar += k.tutar;
    console.log(`   ${sn})  ${etiket[sn]!.padEnd(42)} ${String(k.adet).padStart(3)} ürün · ₺${k.tutar.toFixed(2)}`);
    for (const o of k.ornek) console.log(o);
  }
  console.log(`   ${"".padEnd(46)} ${"-".repeat(20)}`);
  console.log(`   TOPLAM${"".padEnd(41)} ${String(toplamAdet).padStart(3)} ürün · ₺${toplamTutar.toFixed(2)}`);
  console.log(`\n   (karşılaştırma: satışa AÇIK ${acikAdet} ürün · ₺${acikTutar.toFixed(2)})`);
  if (barkodsuz > 0) console.log(`   ⚠ barkodsuz stoklu varyant ${barkodsuz} — hüküm verilemez, sayıya girmedi`);
  if (bilinmeyenMaliyet.size > 0)
    console.log(`   ⚠ maliyeti bilinmeyen parti taşıyan varyant ${bilinmeyenMaliyet.size} — tutara girmedi`);

  console.log("\n② TERS YÖN — VİTRİN AÇIK, RAF BOŞ (hayalet stok)\n");
  console.log(`   ürün                ${hayaletUrun}`);
  console.log(`   TY'de bildirilen adet ${hayaletAdet}   ← satılırsa gönderilemez`);
  for (const o of hayaletOrnek) console.log(o);

  console.log("\n③ ADET FARKI — ikisinde de var, sayılar tutmuyor\n");
  console.log(`   TY FAZLA bildiriyor   ${tyFazla} ürün · +${tyFazlaAdet} adet   ← iptal riski`);
  console.log(`   TY EKSİK bildiriyor   ${tyEksik} ürün · ${tyEksikAdet} adet   ← kaçan satış`);
  for (const o of farkOrnek) console.log(o);

  console.log("\n" + "-".repeat(72));
  console.log("   ⛔ HİÇBİR ŞEY YAZILMADI — ne veritabanına ne Trendyol'a.");

  await prisma.$disconnect();
}

void main();
