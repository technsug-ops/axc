import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  SABİT GİDER — SİPARİŞ BAŞINA BİR KEZ Mİ (SALT OKUMA)
 * ----------------------------------------------------------------------------
 *  BETIK SINIFI: TEK_SEFERLIK — bir para riskini ölçer, rutin koşmaz.
 *
 *  ⛔ NİYE: ölçüldü ki aynı satışta aynı varyanttan BİRDEN ÇOK SATIR olan
 *  86 çift var — yani "adet 2" yerine "2 satır" yazılmış. Ciro ve maliyet
 *  tarafında bu ARİTMETİK OLARAK EŞDEĞERDİR (2×1 = 1×2).
 *
 *  ⚠ AMA SABİT GİDERLERDE DEĞİL. Anayasa: "Trendyol: 13,19 TL sabit gider,
 *  SİPARİŞ BAŞINA BİR KEZ (kalem sayısından bağımsız)" ve HB'nin ₺12,60
 *  hizmet bedeli de sipariş başınadır. Kalem başına uygulanıyorsa bölünmüş
 *  satışlarda gider İKİ KEZ kesilir ve NET olduğundan DÜŞÜK çıkar.
 *
 *  ⚠ VE HÜKÜM KURULMADAN ÖNCE KAPSAM: kıyas yalnız o giderin geçtiği
 *  satışlarda yapılır — hiç kesilmemiş satışta "eksik" demek kapsam
 *  boşluğunu fark diye okumak olurdu.
 * ============================================================================
 */

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");

  console.log("\nSABİT GİDER — SİPARİŞ BAŞINA BİR KEZ Mİ");
  console.log("  kip  SALT OKUMA");
  console.log("=".repeat(64));

  /* Çok satırlı satışları bul (aynı varyant birden çok kez). */
  const ciftler = await prisma.saleItem.groupBy({
    by: ["saleId", "variantId"],
    _count: { _all: true },
    having: { saleId: { _count: { gt: 1 } } },
  });
  const bolunmusSatisIdleri = [...new Set(ciftler.map((c) => c.saleId))];

  console.log(`\n   aynı varyanttan çok satırlı satış   ${bolunmusSatisIdleri.length}`);

  /* O satışların sabit giderleri kaç kez yazılmış. */
  const giderler = await prisma.saleFee.groupBy({
    by: ["saleId", "code"],
    where: { saleId: { in: bolunmusSatisIdleri } },
    _count: { _all: true },
    _sum: { amount: true },
  });

  const tipBasina = new Map<string, { satis: number; cokKez: number }>();
  for (const g of giderler) {
    const k = String(g.code);
    const v = tipBasina.get(k) ?? { satis: 0, cokKez: 0 };
    v.satis += 1;
    if (g._count._all > 1) v.cokKez += 1;
    tipBasina.set(k, v);
  }

  console.log("\n① BÖLÜNMÜŞ SATIŞLARDA GİDER SATIRI SAYISI\n");
  console.log(`   ${"gider tipi".padEnd(24)} ${"satış".padStart(6)} ${"1'DEN ÇOK SATIR".padStart(16)}`);
  for (const [tip, v] of [...tipBasina].sort((a, b) => b[1].cokKez - a[1].cokKez)) {
    console.log(`   ${tip.padEnd(24)} ${String(v.satis).padStart(6)} ${String(v.cokKez).padStart(16)}`);
  }
  if (tipBasina.size === 0) console.log("   (bu satışlarda hiç gider kaydı yok)");

  /**
   * ⚠ KIYAS TABANI: aynı ölçüm BÖLÜNMEMİŞ satışlarda da yapılır. Yalnız
   * bölünmüşlere bakıp "çok satır var" demek, oranın NORMALDE de böyle olup
   * olmadığını söylemez. _(Anayasa: kontrol, veri kapsamı doğrulanmadan
   * "fark" üretmez.)_
   */
  const normalGiderler = await prisma.saleFee.groupBy({
    by: ["saleId", "code"],
    where: { saleId: { notIn: bolunmusSatisIdleri }, sale: { iptalTarihi: null } },
    _count: { _all: true },
  });
  const normalTip = new Map<string, { satis: number; cokKez: number }>();
  for (const g of normalGiderler) {
    const k = String(g.code);
    const v = normalTip.get(k) ?? { satis: 0, cokKez: 0 };
    v.satis += 1;
    if (g._count._all > 1) v.cokKez += 1;
    normalTip.set(k, v);
  }
  console.log("\n② KIYAS — BÖLÜNMEMİŞ satışlarda aynı ölçüm\n");
  console.log(`   ${"gider tipi".padEnd(24)} ${"satış".padStart(6)} ${"1'DEN ÇOK SATIR".padStart(16)}`);
  for (const [tip, v] of [...normalTip].sort((a, b) => b[1].cokKez - a[1].cokKez)) {
    console.log(`   ${tip.padEnd(24)} ${String(v.satis).padStart(6)} ${String(v.cokKez).padStart(16)}`);
  }

  await prisma.$disconnect();
}

void main();
