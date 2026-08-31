import { mkdirSync, writeFileSync } from "node:fs";
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";
import { kimlikOku, baslikKur, tumSayfalar } from "./ty/istemci";

/**
 * ============================================================================
 *  K112b — TRENDYOL ÜRÜN TAM TARAMASI (SALT OKUMA)
 * ----------------------------------------------------------------------------
 *      npx tsx scripts/canli-ty-urun-taramasi.ts
 *
 *  BETIK SINIFI: TEK_SEFERLIK — bir soruyu cevaplar, rutin koşmaz.
 *
 *  ⛔ HİÇBİR ŞEY YAZMAZ — ne veritabanına ne Trendyol'a. Kullanıcı şartı
 *  (31.08.2026): _"Veritabanına yazma."_ Kullanılan uçların hepsi OKUMA.
 *
 *  ── SORU ──────────────────────────────────────────────────────────────
 *  "Mal kabul ettim — satışa açtım mı?" (K112). Bu betik Trendyol'daki
 *  BÜTÜN ürünleri tarar ve beş sınıfa ayırır.
 *
 *  ── ⚠ SINIF TANIMLARI BURADA YAZILI ─────────────────────────────────
 *  Alan adları VARSAYILMADI, uçtan ölçüldü (01.09.2026, `size=3` sondası):
 *  `approved · archived · onSale · rejected · blacklisted · locked ·
 *  quantity · barcode · stockCode · productMainId`.
 *
 *    A) SATIŞA AÇIK      onaylı · arşivsiz · onSale · quantity > 0
 *    B) STOKSUZ          onaylı · arşivsiz · quantity = 0  → satılamaz
 *    C) ONAY BEKLİYOR    !approved ya da rejected
 *    D) PASİF            archived · locked · blacklisted
 *    E) BİZDE VAR, TY'DE YOK   barkodu TY listesinde bulunmayan varyantımız
 *
 *  ⚠ SINIFLAR ÖNCELİK SIRALIDIR: bir ürün birden çok bayrağı taşıyabilir
 *  (arşivli VE stoksuz gibi). Sıra D → C → B → A; en KISITLAYICI durum
 *  kazanır, yoksa aynı ürün iki sınıfta sayılır ve toplam şişer.
 *
 *  ── ⚠ EŞLEŞTİRME KİMLİKLE, DİZEYLE DEĞİL ────────────────────────────
 *  Barkod üzerinden. _(Anayasa: "kimlik varken dizeyle aranmaz" ve "benzer
 *  ad aynı kimlik değildir".)_ Ve E sınıfı için ÜÇ SIFIR ayrı sayılır:
 *  barkodu olmayan varyant · barkodu olup TY'de bulunmayan · stoksuz olup
 *  hiç listelenmemiş.
 * ============================================================================
 */

const CIKTI = "veri/ozel";

type Urun = Record<string, unknown>;

function b(u: Urun, ad: string): boolean {
  return u[ad] === true;
}
function s(u: Urun, ad: string): string {
  const v = u[ad];
  return v === null || v === undefined ? "" : String(v);
}
function n(u: Urun, ad: string): number {
  const v = u[ad];
  return typeof v === "number" ? v : Number.NaN;
}

/** ⚠ CSV kaçışı: alan içinde `;` ya da tırnak varsa sarılır. */
function csvAlan(x: string): string {
  return /[;"\n]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x;
}

async function main() {
  const kimlik = kimlikOku();
  if (kimlik === null) {
    console.log("⛔ TY kimliği okunamadı (.env.canli) — tarama yapılamaz.");
    process.exitCode = 1;
    return;
  }
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");

  console.log("\nK112b — TRENDYOL ÜRÜN TAM TARAMASI");
  console.log("  satıcı  " + kimlik.saticiId);
  console.log("  kip     SALT OKUMA — hiçbir şey yazılmaz");
  console.log("  an      " + new Date().toISOString());
  console.log("=".repeat(72));

  /* ═══ ① TARAMA ══════════════════════════════════════════════════ */
  console.log("\n   taranıyor...");
  const sonuc = await tumSayfalar(
    (sayfa) =>
      `/integration/product/sellers/${kimlik.saticiId}/products?page=${sayfa}&size=200`,
    baslikKur(kimlik),
    60,
  );

  if (sonuc.tur === "HATA") {
    /** ⛔ HATA TAM TAŞINIR — kırpmak teşhisi kırpar. */
    console.log("\n   ⛔ TARAMA DÜŞTÜ — ilk sayfa okunamadı.");
    console.log("   " + JSON.stringify(sonuc.sonuc));
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }

  const urunler = sonuc.kayitlar as Urun[];
  console.log(`   ${sonuc.sayfa} sayfa · ${urunler.length} ürün`);
  if (sonuc.kesildiMi) {
    /**
     * ⛔ TAVANA ÇARPTIYSA LİSTE TAM DEĞİLDİR ve öyle YAZAR.
     * _(Anayasa: "bir kaynağın listesi kendi tamlığını kanıtlayamaz" —
     * tavana çarpan liste bir ALT SINIRDIR.)_
     */
    console.log("   ⚠ SAYFA TAVANINA ÇARPILDI — bu liste bir ALT SINIRDIR.");
  }

  /* ═══ ② SINIFLAMA ═══════════════════════════════════════════════ */
  const sinif = new Map<string, Urun[]>([
    ["A", []],
    ["B", []],
    ["C", []],
    ["D", []],
  ]);
  for (const u of urunler) {
    /** ⚠ ÖNCELİK SIRALI — en kısıtlayıcı durum kazanır. */
    if (b(u, "archived") || b(u, "locked") || b(u, "blacklisted")) {
      sinif.get("D")!.push(u);
    } else if (!b(u, "approved") || b(u, "rejected")) {
      sinif.get("C")!.push(u);
    } else if (n(u, "quantity") <= 0) {
      sinif.get("B")!.push(u);
    } else {
      sinif.get("A")!.push(u);
    }
  }

  /* ═══ ③ E SINIFI — BİZDE VAR, TY'DE YOK ════════════════════════ */
  const tyBarkodlari = new Set<string>();
  for (const u of urunler) {
    for (const alan of ["barcode", "stockCode", "productMainId"]) {
      const v = s(u, alan).trim();
      if (v !== "") tyBarkodlari.add(v);
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

  const barkodsuz: typeof varyantlar = [];
  const tydeYok: typeof varyantlar = [];
  let tydeVar = 0;
  for (const v of varyantlar) {
    const bk = (v.barcode ?? "").trim();
    /** ⛔ ÜÇ SIFIR AYRI: barkodu YOK ≠ TY'de bulunamadı. */
    if (bk === "") {
      barkodsuz.push(v);
      continue;
    }
    if (tyBarkodlari.has(bk)) tydeVar += 1;
    else tydeYok.push(v);
  }

  /* ═══ ④ RAPOR ═══════════════════════════════════════════════════ */
  const A = sinif.get("A")!.length;
  const B = sinif.get("B")!.length;
  const C = sinif.get("C")!.length;
  const D = sinif.get("D")!.length;

  console.log("\n   TRENDYOL TARAFI\n");
  console.log(`   A) SATIŞA AÇIK    (onaylı·arşivsiz·onSale·stok>0)   ${A}`);
  console.log(`   B) STOKSUZ        (onaylı ama quantity = 0)         ${B}`);
  console.log(`   C) ONAY BEKLİYOR  (!approved ya da rejected)        ${C}`);
  console.log(`   D) PASİF          (archived·locked·blacklisted)     ${D}`);
  console.log(`   ${"".padEnd(52)} ${"-".repeat(5)}`);
  console.log(`   TOPLAM${"".padEnd(46)} ${A + B + C + D}  (taranan ${urunler.length})`);

  console.log("\n   BİZİM TARAFIMIZ (aktif varyant " + varyantlar.length + ")\n");
  console.log(`   TY'de BULUNAN                                      ${tydeVar}`);
  console.log(`   E) BİZDE VAR, TY'DE YOK                            ${tydeYok.length}`);
  console.log(`   ⚠ barkodu OLMAYAN (hüküm verilemez)                ${barkodsuz.length}`);

  /* ═══ ⑤ ASIL SORU — STOKLU VARYANTIMIZ SATIŞA AÇIK MI ══════════ */
  /**
   * ⛔ K112'NİN ASIL SORUSU BU: "mal kabul ettim, satışa açtım mı?"
   * Üstteki sayımlar TY'nin TAMAMINI anlatıyor — ama elimizde MALI OLMAYAN
   * bir ürünün stoksuz listelenmesi kusur değildir. Kusur, **elimizde mal
   * olduğu hâlde satışa açık olmayan** varyanttır.
   *
   * ⚠ STOK LEDGER'DAN: `quantityDelta` toplamı > 0 olan varyantlar.
   */
  const stokGrup = await prisma.stockMovement.groupBy({
    by: ["variantId"],
    _sum: { quantityDelta: true },
    orderBy: { variantId: "asc" },
  });
  const stoklu = new Set(
    stokGrup.filter((g) => (g._sum.quantityDelta ?? 0) > 0).map((g) => g.variantId),
  );

  /** TY barkodu → sınıfı. */
  const barkodSinifi = new Map<string, string>();
  for (const [ad, liste] of sinif) {
    for (const u of liste) {
      for (const alan of ["barcode", "stockCode", "productMainId"]) {
        const v = s(u, alan).trim();
        /** ⚠ ÖNCELİK: bir barkod birden çok kayıtta geçerse EN İYİ sınıf kalır. */
        const mevcut = barkodSinifi.get(v);
        if (v !== "" && (mevcut === undefined || ad < mevcut)) barkodSinifi.set(v, ad);
      }
    }
  }

  const stokluDurum = new Map<string, number>([["A", 0], ["B", 0], ["C", 0], ["D", 0], ["E", 0], ["BARKODSUZ", 0]]);
  const acikOlmayan: string[] = [];
  for (const v of varyantlar) {
    if (!stoklu.has(v.id)) continue;
    const bk = (v.barcode ?? "").trim();
    if (bk === "") { stokluDurum.set("BARKODSUZ", stokluDurum.get("BARKODSUZ")! + 1); continue; }
    const sn = barkodSinifi.get(bk) ?? "E";
    stokluDurum.set(sn, (stokluDurum.get(sn) ?? 0) + 1);
    if (sn !== "A" && acikOlmayan.length < 15) {
      acikOlmayan.push(`     ${sn}  ${v.sku.padEnd(18)} ${(v.product.name + " " + (v.name ?? "")).trim().slice(0, 44)}`);
    }
  }
  const stokluToplam = [...stokluDurum.values()].reduce((t, x) => t + x, 0);

  console.log("");
  console.log("   ⭐ ASIL SORU — ELİMİZDE MAL VARKEN SATIŞA AÇIK MI");
  console.log("");
  console.log(`   stoklu varyant                                     ${stokluToplam}`);
  console.log(`     A) TY'de SATIŞA AÇIK                             ${stokluDurum.get("A")}`);
  console.log(`     B) TY'de STOKSUZ görünüyor  ⛔ SATILAMIYOR        ${stokluDurum.get("B")}`);
  console.log(`     C) onay bekliyor            ⛔ SATILAMIYOR        ${stokluDurum.get("C")}`);
  console.log(`     D) pasif                    ⛔ SATILAMIYOR        ${stokluDurum.get("D")}`);
  console.log(`     E) TY'de hiç yok            ⛔ SATILAMIYOR        ${stokluDurum.get("E")}`);
  console.log(`     barkodsuz (hüküm verilemez)                      ${stokluDurum.get("BARKODSUZ")}`);
  if (acikOlmayan.length > 0) {
    console.log("");
    console.log("   MAL VAR AMA SATIŞA AÇIK DEĞİL (ilk 15):");
    for (const o of acikOlmayan) console.log(o);
  }

  /* ═══ ⑤ DOSYALAR ════════════════════════════════════════════════ */
  mkdirSync(CIKTI, { recursive: true });
  const gun = new Date().toISOString().slice(0, 10);

  /** Ham JSON — ölçüm tekrar edilebilsin diye. */
  const hamYol = `${CIKTI}/ty-urun-taramasi-${gun}.json`;
  writeFileSync(
    hamYol,
    JSON.stringify(
      {
        _UYARI: "CANLI VERI — depoya girmez. Salt okuma taramasi.",
        alindi: new Date().toISOString(),
        saticiId: kimlik.saticiId,
        sayfa: sonuc.sayfa,
        kesildiMi: sonuc.kesildiMi,
        adet: urunler.length,
        urunler,
      },
      null,
      1,
    ),
    "utf8",
  );

  const csvYol = `${CIKTI}/ty-urun-taramasi-${gun}.csv`;
  const satirlar: string[] = [
    [
      "sinif",
      "barkod",
      "stockCode",
      "baslik",
      "onaylı",
      "arşivli",
      "onSale",
      "reddedildi",
      "kilitli",
      "karaListe",
      "stok",
      "satisFiyati",
      "kategori",
      "urunUrl",
    ].join(";"),
  ];
  for (const [ad, liste] of sinif) {
    for (const u of liste) {
      satirlar.push(
        [
          ad,
          s(u, "barcode"),
          s(u, "stockCode"),
          s(u, "title"),
          String(b(u, "approved")),
          String(b(u, "archived")),
          String(b(u, "onSale")),
          String(b(u, "rejected")),
          String(b(u, "locked")),
          String(b(u, "blacklisted")),
          s(u, "quantity"),
          s(u, "salePrice"),
          s(u, "categoryName"),
          s(u, "productUrl"),
        ]
          .map(csvAlan)
          .join(";"),
      );
    }
  }
  /** E sınıfı bizim taraftan — TY sütunları boş kalır ve bu doğrudur. */
  for (const v of tydeYok) {
    satirlar.push(
      [
        "E",
        v.barcode ?? "",
        v.companySku ?? "",
        `${v.product.name} ${v.name ?? ""}`.trim(),
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        v.sku,
      ]
        .map(csvAlan)
        .join(";"),
    );
  }
  /** ⚠ BOM: Excel Türkçe karakteri UTF-8 olarak tanısın diye. */
  writeFileSync(csvYol, "﻿" + satirlar.join("\r\n"), "utf8");

  console.log("\n   DOSYALAR");
  console.log("   ham JSON  " + hamYol);
  console.log("   CSV       " + csvYol + `  (${satirlar.length - 1} satır)`);
  console.log("\n   ⛔ HİÇBİR ŞEY YAZILMADI — ne veritabanına ne Trendyol'a.");

  await prisma.$disconnect();
}

void main();
