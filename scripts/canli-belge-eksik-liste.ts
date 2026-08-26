import { writeFileSync } from "node:fs";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  BELGE EKSİK VARYANTLAR — HALİL İÇİN ÇALIŞMA LİSTESİ · SALT OKUMA
 * ----------------------------------------------------------------------------
 *      npm run canli:belge-eksik
 *      npm run canli:belge-eksik -- --excel="C:/.../liste.xlsx"
 *
 *  ⛔ BU LİSTE KAPANABİLİR AÇIĞI TAŞIR — kapanamayanı DEĞİL.
 *  Kova ölçütü: varyantın ilk alımı satıştan ÖNCE (yani kapsam var) ama
 *  TOPLAM alım adedi TOPLAM satış adedinden AZ. O fark kadar alım kaydı
 *  defterde yok ve belge bulunursa kapanır.
 *
 *  ⚠ KAPSAM DIŞI (ilk alım satıştan sonra) BU LİSTEYE GİRMEZ — onlar
 *  belge aramakla kapanmaz, tutanaktır. Karıştırmak Halil'i bulunamayacak
 *  bir belgenin peşine gönderirdi.
 *  _(Anayasa: "kapanamayacak kayıp, görev değil kayıttır".)_
 * ============================================================================
 */

const excelArg = process.argv.find((a) => a.startsWith("--excel="));
const EXCEL = excelArg?.slice("--excel=".length) ?? null;

const t2 = (n: number) => n.toFixed(2).padStart(13);
const gun = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(d);

async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) {
    console.log("\n⛔ CANLI ADRES OKUNAMADI\n");
    process.exitCode = 1;
    return;
  }
  const p = new PrismaClient({ adapter: new PrismaMariaDb(c.veri.ham) });

  const ilkAlim = new Map<string, Date>();
  const alimAdet = new Map<string, number>();
  for (const a of await p.purchaseItem.findMany({
    select: { variantId: true, quantity: true, purchase: { select: { purchasedAt: true } } },
  })) {
    const o = ilkAlim.get(a.variantId);
    if (!o || a.purchase.purchasedAt < o) ilkAlim.set(a.variantId, a.purchase.purchasedAt);
    alimAdet.set(a.variantId, (alimAdet.get(a.variantId) ?? 0) + a.quantity);
  }
  const satisAdet = new Map<string, number>();
  for (const s of await p.saleItem.findMany({
    where: { sale: { iptalTarihi: null } },
    select: { variantId: true, quantity: true },
  })) satisAdet.set(s.variantId, (satisAdet.get(s.variantId) ?? 0) + s.quantity);

  /** Karşılıksız kalemler — kova ölçütünün kendisi. */
  const kalemler = await p.saleItem.findMany({
    where: { sale: { importBatch: { not: null }, iptalTarihi: null, profitStatus: null } },
    select: {
      quantity: true, unitPriceAmount: true, variantId: true,
      sale: { select: { soldAt: true } },
      variant: { select: { sku: true, barcode: true, product: { select: { name: true } } } },
    },
  });

  type Satir = {
    sku: string; barkod: string; ad: string;
    alim: number; satis: number; acikFark: number;
    kalem: number; tutar: number; ilkSatis: Date; sonSatis: Date;
  };
  const liste = new Map<string, Satir>();
  for (const k of kalemler) {
    const ilk = ilkAlim.get(k.variantId);
    /** ⚠ (b) — hiç alımı yok: bu liste ONA ait değil. */
    if (ilk === undefined) continue;
    /** ⚠ (c) — kapsam dışı: belge aramakla kapanmaz, listeye GİRMEZ. */
    if (k.sale.soldAt.getTime() < ilk.getTime()) continue;
    const al = alimAdet.get(k.variantId) ?? 0;
    const sa = satisAdet.get(k.variantId) ?? 0;
    /** ⚠ Adet yeterliyse belge eksik DEĞİL — parti başka satışlarda tükenmiş. */
    if (al >= sa) continue;

    const m = liste.get(k.variantId) ?? {
      sku: k.variant.sku,
      barkod: k.variant.barcode ?? "",
      ad: k.variant.product.name ?? "—",
      alim: al, satis: sa, acikFark: sa - al,
      kalem: 0, tutar: 0, ilkSatis: k.sale.soldAt, sonSatis: k.sale.soldAt,
    };
    m.kalem++;
    m.tutar += Number(k.unitPriceAmount) * k.quantity;
    if (k.sale.soldAt < m.ilkSatis) m.ilkSatis = k.sale.soldAt;
    if (k.sale.soldAt > m.sonSatis) m.sonSatis = k.sale.soldAt;
    liste.set(k.variantId, m);
  }

  const sirali = [...liste.values()].sort((a, b) => b.tutar - a.tutar);
  const toplam = sirali.reduce((t, m) => t + m.tutar, 0);

  console.log("\n" + "=".repeat(104));
  console.log("BELGE EKSİK VARYANTLAR — ÇALIŞMA LİSTESİ · SALT OKUMA");
  console.log("=".repeat(104));
  console.log("\n   varyant " + sirali.length + " · kalem " + sirali.reduce((t, m) => t + m.kalem, 0) +
    " · açık fark " + sirali.reduce((t, m) => t + m.acikFark, 0) + " adet · " + t2(toplam));

  /**
   * ⚠ YOĞUNLAŞMA YAZILIR — Halil kaç belge arayacağını bilsin.
   * "188 varyant" tek başına iş büyüklüğü söylemez; %80'i kaç üründe
   * toplanıyor, onu söyler.
   */
  console.log("\n   YOĞUNLAŞMA:");
  for (const e of [10, 30, 60, 100]) {
    const t = sirali.slice(0, e).reduce((x, m) => x + m.tutar, 0);
    console.log("     ilk " + String(e).padStart(3) + " varyant → %" + ((t / toplam) * 100).toFixed(1) + "  " + t2(t));
  }

  console.log("\n   EN BÜYÜK 30:\n");
  console.log("   SKU                ALIM  SATIŞ  AÇIK  KALEM         TUTAR  İLK SATIŞ   SON SATIŞ   ÜRÜN");
  for (const m of sirali.slice(0, 30)) {
    console.log(
      "   " + m.sku.slice(0, 17).padEnd(19) +
        String(m.alim).padStart(4) + String(m.satis).padStart(7) + String(m.acikFark).padStart(6) +
        String(m.kalem).padStart(7) + t2(m.tutar) + "  " +
        gun(m.ilkSatis).padEnd(12) + gun(m.sonSatis).padEnd(12) + m.ad.slice(0, 30),
    );
  }

  if (EXCEL) {
    /**
     * ⚠ CSV YAZILIYOR, XLSX DEĞİL — ve niye: depoda xlsx YAZAN bir
     * gövde yok (`read-excel-file` yalnız okur). Yeni bir bağımlılık
     * eklemek yerine Excel'in doğrudan açtığı biçim seçildi.
     * ⚠ BOM + noktalı virgül: Türkçe Excel `;` ayracı bekler ve BOM
     * olmadan UTF-8'i bozar. İkisi de olmadan dosya Halil'de "ÜRÜN"
     * yerine "ÃœRÃœN" gösterir.
     */
    const bas = ["SKU", "Barkod", "Ürün", "Alım adedi", "Satış adedi", "AÇIK FARK", "Karşılıksız kalem", "Karşılıksız tutar", "İlk satış", "Son satış"];
    const kacis = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const satirlar = sirali.map((m) =>
      [
        kacis(m.sku), kacis(m.barkod), kacis(m.ad),
        String(m.alim), String(m.satis), String(m.acikFark), String(m.kalem),
        m.tutar.toFixed(2).replace(".", ","),
        gun(m.ilkSatis), gun(m.sonSatis),
      ].join(";"),
    );
    const icerik = "\uFEFF" + [bas.map(kacis).join(";"), ...satirlar].join("\r\n") + "\r\n";
    writeFileSync(EXCEL, icerik, "utf8");
    console.log("\n   ✓ DIŞA AKTARILDI: " + EXCEL);
    console.log("     " + sirali.length + " satır · CSV (Excel doğrudan açar, `;` ayraç + BOM)");
  } else {
    console.log("\n   ⚠ Excel için: -- --excel=\"C:/Users/yapra/Downloads/belge-eksik.csv\"");
  }

  console.log("\n   ⛔ BU LİSTE KAPANABİLİR AÇIĞI TAŞIR. Kapsam dışı (ilk alım");
  console.log("     satıştan sonra) ve alımı hiç olmayan varyantlar GİRMEDİ —");
  console.log("     onlar belge aramakla kapanmaz.\n");

  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
