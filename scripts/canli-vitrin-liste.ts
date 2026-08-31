import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  K121 — VİTRİN/RAF EYLEM LİSTESİ (SALT OKUMA, TY'YE ÇAĞRI YOK)
 * ----------------------------------------------------------------------------
 *      npx tsx scripts/canli-vitrin-liste.ts
 *
 *  BETIK SINIFI: TEK_SEFERLIK — "hangileri" sorusunun cevabı.
 *
 *  ⛔ NİYE AYRI DOSYA: K112b'nin CSV'si TY'nin TAMAMINI döküyor (1663 satır)
 *  ve orada `E` sınıfı **34 satır** — yani TY'de olmayan BÜTÜN varyantlar.
 *  Ama iş listesi o değil: stoğu OLUP satılamayan 27 ürün, stoğu olmayıp
 *  vitrini açık olanlar ve adedi tutmayanlar AYRI kümeler ve AYRI iş
 *  istiyorlar. Tek CSV'de karışınca hiçbiri eyleme dönüşmüyor.
 *
 *  ⚠ HER SATIR NE YAPILACAĞINI DA TAŞIR — sınıf kodu tek başına iş tarif
 *  etmiyor. _(Anayasa: rakam kaynağına götürür; ve kapatılamayan madde
 *  kullanıcıyı yanlış işe iter.)_
 * ============================================================================
 */

const KLASOR = "veri/ozel";
type Urun = Record<string, unknown>;

const metin = (u: Urun, a: string) =>
  u[a] === null || u[a] === undefined ? "" : String(u[a]).trim();
const bayrak = (u: Urun, a: string) => u[a] === true;
const say = (u: Urun, a: string) => (typeof u[a] === "number" ? (u[a] as number) : 0);

function sinifla(u: Urun): "A" | "B" | "C" | "D" {
  if (bayrak(u, "archived") || bayrak(u, "locked") || bayrak(u, "blacklisted")) return "D";
  if (!bayrak(u, "approved") || bayrak(u, "rejected")) return "C";
  if (say(u, "quantity") <= 0) return "B";
  return "A";
}

const csv = (x: string) => (/[;"\n]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x);

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

  const dosya = readdirSync(KLASOR)
    .filter((a) => a.startsWith("ty-urun-taramasi-") && a.endsWith(".json"))
    .sort()
    .at(-1);
  if (dosya === undefined) {
    console.log("⛔ Tarama dosyası yok — önce: npm run canli:ty-urun-taramasi");
    process.exitCode = 1;
    return;
  }
  const ham = JSON.parse(readFileSync(`${KLASOR}/${dosya}`, "utf8")) as {
    alindi: string;
    urunler: Urun[];
  };

  /** Barkod → { en iyi sınıf, toplam adet, başlık }. */
  const ty = new Map<string, { sinif: string; adet: number; baslik: string }>();
  for (const u of ham.urunler) {
    const sn = sinifla(u);
    const q = say(u, "quantity");
    for (const alan of ["barcode", "stockCode", "productMainId"]) {
      const bk = metin(u, alan);
      if (bk === "") continue;
      const v = ty.get(bk);
      if (v === undefined)
        ty.set(bk, { sinif: sn, adet: q, baslik: metin(u, "title") });
      else
        ty.set(bk, {
          sinif: sn < v.sinif ? sn : v.sinif,
          adet: v.adet + q,
          baslik: v.baslik,
        });
    }
  }

  const varyantlar = await prisma.productVariant.findMany({
    where: { isActive: true },
    select: {
      id: true,
      sku: true,
      barcode: true,
      companySku: true,
      name: true,
      product: { select: { name: true } },
    },
  });
  const grup = await prisma.stockMovement.groupBy({
    by: ["variantId"],
    _sum: { quantityDelta: true },
    orderBy: { variantId: "asc" },
  });
  const stok = new Map(grup.map((g) => [g.variantId, g._sum.quantityDelta ?? 0]));

  const partiler = await acikPartilerToplu(prisma, null);
  const deger = new Map<string, number>();
  for (const [vid, liste] of partiler) {
    let t = 0;
    for (const p of liste) if (p.birimMaliyet !== null) t += p.kalanAdet * Number(p.birimMaliyet);
    deger.set(vid, t);
  }

  type Satir = {
    kume: string;
    yapilacak: string;
    sku: string;
    barkod: string;
    firmaSku: string;
    ad: string;
    bizStok: number;
    tyAdet: string;
    tySinif: string;
    tutar: number;
  };
  const satirlar: Satir[] = [];

  const YAPILACAK: Record<string, string> = {
    B: "TY'de stok bildirimini AÇ (quantity gir)",
    C: "TY onayını takip et / red sebebini gider",
    D: "TY'de ürünü arşivden çıkar / kilidi çözdür",
    E: "TY'de ÜRÜNÜ AÇ (hiç listelenmemiş)",
    HAYALET: "TY adedini SIFIRLA — elimizde mal yok, satılırsa iptal+ceza",
    FARK: "TY adedini gerçek stoğa çek",
    BARKODSUZ: "Varyanta BARKOD gir — TY ile eşleşemiyor",
  };

  for (const v of varyantlar) {
    const bk = (v.barcode ?? "").trim();
    const biz = stok.get(v.id) ?? 0;
    const ad = `${v.product.name} ${v.name ?? ""}`.trim();
    const tutar = deger.get(v.id) ?? 0;
    const temel = {
      sku: v.sku,
      barkod: bk,
      firmaSku: v.companySku ?? "",
      ad,
      bizStok: biz,
      tutar,
    };

    if (bk === "") {
      if (biz > 0)
        satirlar.push({
          ...temel,
          kume: "BARKODSUZ",
          yapilacak: YAPILACAK.BARKODSUZ!,
          tyAdet: "",
          tySinif: "",
        });
      continue;
    }

    const t = ty.get(bk);
    const sinif = t?.sinif ?? "E";

    if (biz > 0 && sinif !== "A") {
      satirlar.push({
        ...temel,
        kume: "RAFTA VAR VITRINDE YOK",
        yapilacak: YAPILACAK[sinif] ?? "",
        tyAdet: t ? String(t.adet) : "",
        tySinif: sinif,
      });
    } else if (biz <= 0 && t !== undefined && sinif === "A" && t.adet > 0) {
      satirlar.push({
        ...temel,
        kume: "VITRIN ACIK RAF BOS",
        yapilacak: YAPILACAK.HAYALET!,
        tyAdet: String(t.adet),
        tySinif: sinif,
      });
    } else if (biz > 0 && t !== undefined && sinif === "A" && t.adet !== biz) {
      satirlar.push({
        ...temel,
        kume: "ADET FARKI",
        yapilacak: YAPILACAK.FARK!,
        tyAdet: String(t.adet),
        tySinif: sinif,
      });
    }
  }

  /** ⚠ TY'de HİÇ OLMAYAN varyantlar — stoksuz olanlar da dahil, AYRI küme. */
  for (const v of varyantlar) {
    const bk = (v.barcode ?? "").trim();
    if (bk === "" || ty.has(bk)) continue;
    if ((stok.get(v.id) ?? 0) > 0) continue; // zaten üstte sayıldı
    satirlar.push({
      kume: "TY'DE YOK (stoksuz)",
      yapilacak: "bilgi — stok gelince listelenmeli",
      sku: v.sku,
      barkod: bk,
      firmaSku: v.companySku ?? "",
      ad: `${v.product.name} ${v.name ?? ""}`.trim(),
      bizStok: stok.get(v.id) ?? 0,
      tyAdet: "",
      tySinif: "E",
      tutar: 0,
    });
  }

  mkdirSync(KLASOR, { recursive: true });
  const gun = new Date().toISOString().slice(0, 10);
  const yol = `${KLASOR}/vitrin-eylem-listesi-${gun}.csv`;
  const cikti = [
    ["kume", "yapilacak", "sku", "barkod", "firmaSku", "ad", "bizStok", "tyAdet", "tySinif", "envanterTutari"].join(";"),
    ...satirlar
      .sort((a, b) => a.kume.localeCompare(b.kume, "tr") || b.tutar - a.tutar)
      .map((s) =>
        [
          s.kume, s.yapilacak, s.sku, s.barkod, s.firmaSku, s.ad,
          String(s.bizStok), s.tyAdet, s.tySinif, s.tutar.toFixed(2),
        ].map(csv).join(";"),
      ),
  ];
  writeFileSync(yol, "﻿" + cikti.join("\r\n"), "utf8");

  /* ── EKRANA DA DÖK ── */
  console.log("\nK121 — VİTRİN/RAF EYLEM LİSTESİ");
  console.log("  tarama  " + dosya + "  (" + ham.alindi + ")");
  console.log("=".repeat(78));
  const kumeler = [...new Set(satirlar.map((s) => s.kume))];
  for (const k of kumeler) {
    const liste = satirlar.filter((s) => s.kume === k);
    const t = liste.reduce((x, s) => x + s.tutar, 0);
    console.log(`\n${k}  —  ${liste.length} ürün${t > 0 ? ` · ₺${t.toFixed(2)}` : ""}\n`);
    for (const s of liste) {
      console.log(
        `   ${s.sku.padEnd(16)} ${s.ad.slice(0, 42).padEnd(43)} stok ${String(s.bizStok).padStart(3)} · TY ${(s.tyAdet || "—").padStart(3)} [${s.tySinif || "—"}]${s.tutar > 0 ? ` · ₺${s.tutar.toFixed(2)}` : ""}`,
      );
    }
  }
  console.log("\n  CSV  " + yol + `  (${satirlar.length} satır)`);
  console.log("  ⛔ HİÇBİR ŞEY YAZILMADI.");

  await prisma.$disconnect();
}

void main();
