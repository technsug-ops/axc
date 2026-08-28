import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  528 VARYANT — "ALIM HİÇ YOK" mu, "ALIM YETMİYOR" mu (SALT OKUMA)
 * ----------------------------------------------------------------------------
 *  ⛔ BENİM HATAM 28.08.2026: `canli:stok-bagi` atlananlar için şunu
 *  basıyor ve ben de raporumda tekrarladım —
 *
 *      "BU BİR HATA DEĞİL, EKSİK ALIM DEFTERİ. O ürünlerin alımı
 *       sisteme hiç girilmemiş."
 *
 *  Kullanıcı `axcali1869` ile çürüttü: alım GİRİLMİŞ (ALM-HB-260815-09,
 *  4 adet, teslim alınmış) ama **10 adet satılmış**. Yani alım yok değil,
 *  YETMİYOR. İki durum tek cümleye sıkışmış ve yanlış iş tarif etmiş:
 *  "alımı gir" ile "eksik adedi gir" farklı işlerdir.
 *
 *  Bu betik ikisini AYRI sayar. _(Anayasa: "boş sonuç ile temiz sonucu
 *  ayırt edemeyen denetim, denetim değildir" — burada iki farklı EKSİK
 *  tek kefeye konmuştu.)_
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
      sale: { select: { soldAt: true } },
      variant: { select: { sku: true, product: { select: { name: true } } } } },
  });

  const varyantIds = [...new Set(kalemler.map((k) => k.variantId))];
  /** Alım GİRİŞİ var mı — `PURCHASE_IN` hareketi. */
  const girisler = await p.stockMovement.groupBy({
    by: ["variantId"],
    where: { variantId: { in: varyantIds }, type: "PURCHASE_IN" },
    _sum: { quantityDelta: true }, _count: true,
  });
  const alim = new Map(girisler.map((g) => [g.variantId, { adet: g._sum.quantityDelta ?? 0, kayit: g._count }]));
  /** Satılan toplam adet (iptalsiz) — bağlı + bağsız. */
  const satisAdet = new Map<string, number>();
  for (const k of await p.saleItem.findMany({
    where: { variantId: { in: varyantIds }, sale: { iptalTarihi: null } },
    select: { variantId: true, quantity: true },
  })) satisAdet.set(k.variantId, (satisAdet.get(k.variantId) ?? 0) + k.quantity);

  type Kova = { varyant: number; kalem: number; adet: number; ciro: number };
  const bos = (): Kova => ({ varyant: 0, kalem: 0, adet: 0, ciro: 0 });
  const hicYok = bos(), yetmiyor = bos();
  const yetmiyorListe: { sku: string; ad: string; alim: number; satis: number; eksik: number; kalem: number; sonSatis: Date }[] = [];

  for (const vid of varyantIds) {
    const a = alim.get(vid);
    const kal = kalemler.filter((k) => k.variantId === vid);
    const kova = a === undefined || a.adet <= 0 ? hicYok : yetmiyor;
    kova.varyant++;
    kova.kalem += kal.length;
    kova.adet += kal.reduce((t, k) => t + k.quantity, 0);
    kova.ciro += kal.reduce((t, k) => t + Number(k.unitPriceAmount.toString()) * k.quantity, 0);
    if (a !== undefined && a.adet > 0) {
      const s = satisAdet.get(vid) ?? 0;
      yetmiyorListe.push({
        sku: kal[0].variant.sku, ad: kal[0].variant.product.name,
        alim: a.adet, satis: s, eksik: s - a.adet, kalem: kal.length,
        sonSatis: kal.map((k) => k.sale.soldAt).sort((x, y) => y.getTime() - x.getTime())[0],
      });
    }
  }

  console.log("\n" + "=".repeat(104));
  console.log("BAĞSIZ SATIŞLARIN SEBEBİ — İKİ AYRI DURUM");
  console.log("=".repeat(104));
  console.log("\n   durum                          varyant   kalem   adet           ciro");
  console.log("   " + "─".repeat(70));
  console.log("   ⛔ ALIM HİÇ GİRİLMEMİŞ         " + String(hicYok.varyant).padStart(7) +
    String(hicYok.kalem).padStart(8) + String(hicYok.adet).padStart(7) + t2(hicYok.ciro));
  console.log("   ⚠ ALIM VAR AMA YETMİYOR       " + String(yetmiyor.varyant).padStart(7) +
    String(yetmiyor.kalem).padStart(8) + String(yetmiyor.adet).padStart(7) + t2(yetmiyor.ciro));
  console.log("\n   ⚠ İKİSİ FARKLI İŞ TARİF EDER:");
  console.log("     · 'alım hiç yok'  → o ürünün alımını GİR");
  console.log("     · 'alım yetmiyor' → EKSİK ADEDİ gir (mevcut alım doğru, tam değil)");

  console.log("\n   ALIM VAR AMA YETMİYOR — en güncel 20");
  console.log("   sonSatış     alım  satış  eksik  bağsızKalem  SKU / ürün");
  console.log("   " + "─".repeat(92));
  for (const y of yetmiyorListe.sort((a, b) => b.sonSatis.getTime() - a.sonSatis.getTime()).slice(0, 20)) {
    console.log("   " + y.sonSatis.toISOString().slice(0, 10) +
      String(y.alim).padStart(8) + String(y.satis).padStart(7) + String(y.eksik).padStart(7) +
      String(y.kalem).padStart(13) + "  " + y.sku.padEnd(18) + y.ad.slice(0, 28));
  }

  console.log("\n   ⭐ ÖRNEK — kullanıcının bildirdiği vaka:");
  const ornek = yetmiyorListe.find((y) => y.sku === "axcali1869");
  if (ornek) {
    console.log("     " + ornek.sku + "  alım " + ornek.alim + " adet · satış " + ornek.satis +
      " adet · EKSİK " + ornek.eksik + " adet   " + ornek.ad.slice(0, 40));
  } else console.log("     axcali1869 bu kovada DEĞİL");

  console.log("\nSALT OKUMA — HİÇBİR ŞEY YAZILMADI.\n");
  await p.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
