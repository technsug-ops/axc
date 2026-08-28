import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  ALIM KAYDI VAR AMA `PURCHASE_IN` HAREKETİ YOK MU — SALT OKUMA
 * ----------------------------------------------------------------------------
 *  Kullanıcı sorusu 28.08.2026: _"alım kaydı var ama mal kabul HAREKETİ
 *  yazılmış mı? Panelde '17 mal kabul bekleyen alım' yazıyor — ilgisi var mı?"_
 *
 *  ⛔ ÜÇ FARKLI DURUM AYRI SAYILIR — üçü de "alım eksik" gibi görünür ama
 *  üçü de BAŞKA İŞ ister:
 *    ① alım kaydı HİÇ YOK                → alımı gir
 *    ② alım kaydı var, HAREKET yok       → MAL KABUL yap
 *    ③ alım + hareket var, ADET YETMİYOR → eksik adedi gir
 * ============================================================================
 */
const t2 = (n: number) => n.toFixed(2).padStart(14);

async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) { console.log("CANLI ADRES OKUNAMADI"); process.exitCode = 1; return; }
  const p = new PrismaClient({ adapter: new PrismaMariaDb(c.veri.ham) });

  const kalemler = await p.saleItem.findMany({
    where: { sale: { iptalTarihi: null }, stockMovements: { none: {} } },
    select: { quantity: true, unitPriceAmount: true, variantId: true,
      variant: { select: { sku: true, product: { select: { name: true } } } } },
  });
  const varyantIds = [...new Set(kalemler.map((k) => k.variantId))];

  /** ① ALIM KAYDI (PurchaseItem) var mı — hareketten BAĞIMSIZ. */
  const alimKaydi = new Map(
    (await p.purchaseItem.groupBy({
      by: ["variantId"], where: { variantId: { in: varyantIds } },
      _sum: { quantity: true }, _count: true,
    })).map((x) => [x.variantId, { adet: x._sum.quantity ?? 0, kayit: x._count }]),
  );
  /** ② PURCHASE_IN HAREKETİ var mı. */
  const hareket = new Map(
    (await p.stockMovement.groupBy({
      by: ["variantId"], where: { variantId: { in: varyantIds }, type: "PURCHASE_IN" },
      _sum: { quantityDelta: true },
    })).map((x) => [x.variantId, x._sum.quantityDelta ?? 0]),
  );

  type K = { v: number; kalem: number; ciro: number };
  const bos = (): K => ({ v: 0, kalem: 0, ciro: 0 });
  const hicAlim = bos(), kabulBekliyor = bos(), yetmiyor = bos();
  const kabulListe: { sku: string; ad: string; alimAdet: number; kayit: number }[] = [];

  for (const vid of varyantIds) {
    const kal = kalemler.filter((k) => k.variantId === vid);
    const ciro = kal.reduce((t, k) => t + Number(k.unitPriceAmount.toString()) * k.quantity, 0);
    const a = alimKaydi.get(vid);
    const h = hareket.get(vid) ?? 0;
    let kova: K;
    if (a === undefined || a.adet <= 0) kova = hicAlim;
    else if (h <= 0) {
      kova = kabulBekliyor;
      kabulListe.push({ sku: kal[0].variant.sku, ad: kal[0].variant.product.name, alimAdet: a.adet, kayit: a.kayit });
    } else kova = yetmiyor;
    kova.v++; kova.kalem += kal.length; kova.ciro += ciro;
  }

  console.log("\n" + "=".repeat(100));
  console.log("BAĞSIZ SATIŞLAR — ÜÇ AYRI SEBEP (salt okuma)");
  console.log("=".repeat(100));
  console.log("\n   durum                                    varyant  kalem           ciro   YAPILACAK İŞ");
  console.log("   " + "─".repeat(94));
  console.log("   ① ALIM KAYDI HİÇ YOK                    " + String(hicAlim.v).padStart(6) +
    String(hicAlim.kalem).padStart(7) + t2(hicAlim.ciro) + "   alımı GİR");
  console.log("   ② alım kaydı VAR, HAREKET YOK           " + String(kabulBekliyor.v).padStart(6) +
    String(kabulBekliyor.kalem).padStart(7) + t2(kabulBekliyor.ciro) + "   MAL KABUL yap");
  console.log("   ③ alım + hareket var, ADET YETMİYOR     " + String(yetmiyor.v).padStart(6) +
    String(yetmiyor.kalem).padStart(7) + t2(yetmiyor.ciro) + "   eksik adedi gir");

  if (kabulListe.length > 0) {
    console.log("\n   ⭐ ② MAL KABUL BEKLEYENLER — alım girilmiş, stoğa girmemiş");
    console.log("     SKU                alımAdet  kayıt  ürün");
    for (const x of kabulListe.slice(0, 25)) {
      console.log("     " + x.sku.padEnd(19) + String(x.alimAdet).padStart(7) +
        String(x.kayit).padStart(7) + "  " + x.ad.slice(0, 40));
    }
    if (kabulListe.length > 25) console.log("     … ve " + (kabulListe.length - 25) + " varyant daha");
  } else {
    console.log("\n   ✓ ② KOVASI BOŞ — alım kaydı olup hareketi olmayan varyant YOK.");
  }

  /** Panel kutusuyla bağı: mal kabul bekleyen alım sayısı. */
  const bekleyenAlim = await p.purchase.count({ where: { status: { in: ["ORDERED", "PARTIALLY_RECEIVED"] } } });
  const bekleyenVaryant = await p.purchaseItem.findMany({
    where: { purchase: { status: { in: ["ORDERED", "PARTIALLY_RECEIVED"] } } },
    select: { variantId: true },
  });
  const bekleyenSet = new Set(bekleyenVaryant.map((x) => x.variantId));
  const kesisim = varyantIds.filter((v) => bekleyenSet.has(v)).length;
  console.log("\n   PANEL KUTUSUYLA BAĞI");
  console.log("     mal kabul bekleyen ALIM  : " + bekleyenAlim);
  console.log("     o alımların varyantı     : " + bekleyenSet.size);
  console.log("     bağsız kümeyle KESİŞİM   : " + kesisim + " varyant");
  console.log("     ⚠ Kesişim küçükse iki kutu FARKLI işleri anlatıyor demektir.");

  console.log("\nSALT OKUMA — HİÇBİR ŞEY YAZILMADI. HÜKÜM YOK.\n");
  await p.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
