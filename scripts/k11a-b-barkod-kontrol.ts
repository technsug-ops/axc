/**
 * ============================================================================
 *  K11a-b — BARKODLA ÜRÜN KONTROLÜ (ad deseni DEĞİL)
 * ----------------------------------------------------------------------------
 *  Çalıştırma:
 *      npm run canli:k11a-b -- 8720689013949 8720689047586 8683650111184
 *
 *  ⚠ SALT OKUMA. Yazma bayrağı YOK.
 *
 *  ── NİYE VAR ────────────────────────────────────────────────────────────
 *  K11a dört üründen ikisini AD DESENİYLE aradı (`QP2824`, `burby`) ve
 *  sıfır buldu. **Sıfır, satışın yokluğunu değil DİZENİN bulunamadığını
 *  söyler.** Kaynak raporda `Barkod` kolonu var — kimlik elimizdeyken
 *  dizeyle arama yapmak, `panel.ts` için "tuzak" diye yazdığımız şeyin
 *  aynısıdır.
 *
 *  ── ⚠ BARKOD KODA GÖMÜLMEZ ──────────────────────────────────────────────
 *  Argümandan alınır. Gömülseydi rapor değiştiğinde betik eski ürünleri
 *  aramaya devam eder ve bunu haber vermezdi.
 *
 *  ── ÜÇ SONUÇ AYRI — TEK "BULUNAMADI" YAZILMAZ ───────────────────────────
 *  (a) barkod sistemde HİÇ YOK      → ürün hiç tanımlanmamış
 *  (b) ürün var, TY kanal-SKU yok   → eşleştirme kurulmamış
 *  (c) ürün + SKU var, satış yok    → GİRİŞ EKSİKLİĞİ (en güçlü kanıt)
 *  Üçü aynı ekrana "bulunamadı" diye basılsaydı, en güçlü kanıt en zayıfla
 *  aynı kefeye girerdi.
 *
 *  ── BAŞKA KANAL DA SORULUR ──────────────────────────────────────────────
 *  Aynı barkodun TY dışındaki satışları ayrıca basılır: TY'de yok ama
 *  başka kanalda varsa bu **bambaşka bir bulgudur** (ürün var, satılıyor,
 *  yalnız TY tarafı girilmiyor).
 *
 *  ── ⚠ H20 ───────────────────────────────────────────────────────────────
 *  `soldAt` saat taşımıyor; pencere uçları GÜN düzeyinde kesilir.
 * ============================================================================
 *
 * ⛔ BEKCI SINIFI: BAGIMSIZ — K11a-b vakasinin tek seferlik olcumu; CANLI veri ister ve tekrarlanabilir bir olcut degil, bir tesis kaydidir.
 */

import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

const KANAL = "Trendyol";
const BASLANGIC = "2026-06-01";
const BITIS = "2026-08-20";

function gun(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function main() {
  /** ⚠ Argümandan; `--` sonrası gelen her şey barkod sayılır. */
  const barkodlar = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  if (barkodlar.length === 0) {
    console.log("");
    console.log("  ⛔ BARKOD VERİLMEDİ — betik koda gömülü liste taşımaz.");
    console.log("     Kullanım:");
    console.log("       npm run canli:k11a-b -- <barkod> [<barkod> ...]");
    console.log("     Barkodlar K9 kaynak raporunun `Barkod` kolonundan alınır.");
    console.log("");
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

  console.log("");
  console.log("K11a-b — BARKODLA KONTROL (" + barkodlar.length + " barkod)");
  console.log("  hedef      " + y.veri.adres.hostname);
  console.log("  kip        SALT OKUMA");
  console.log("  dönem      " + BASLANGIC + " → " + BITIS + "  (⚠ H20: gün düzeyinde)");
  console.log("");

  const bas = new Date(BASLANGIC + "T00:00:00.000Z");
  const bit = new Date(BITIS + "T23:59:59.999Z");

  const sayac = { yok: 0, skuYok: 0, satisYok: 0, satisVar: 0 };

  for (const barkod of barkodlar) {
    console.log("─".repeat(74));
    console.log("BARKOD " + barkod);

    const varyant = await prisma.productVariant.findUnique({
      where: { barcode: barkod },
      select: {
        id: true,
        sku: true,
        companySku: true,
        isActive: true,
        product: { select: { name: true, isActive: true } },
      },
    });

    // ── (a) SİSTEMDE HİÇ YOK ────────────────────────────────────────────
    if (!varyant) {
      sayac.yok++;
      console.log("  (a) ⛔ ÜRÜN SİSTEMDE HİÇ YOK — bu barkodla varyant kaydı yok.");
      /**
       * ⚠ ADLA DA BİR KEZ BAKILIR — ama YALNIZ TEŞHİS İÇİN. Ürün başka bir
       * barkodla kayıtlıysa bulgu "tanımlanmamış" değil "barkodu farklı"dır
       * ve bu ikisi apayrı işlere yol açar.
       */
      console.log("      ⓘ aynı ürün BAŞKA barkodla kayıtlı olabilir; ad kontrolü");
      console.log("        için rapordaki ürün adı elle aranmalı (dize araması");
      console.log("        kimlik yerine geçmez, yalnız ipucu verir).");
      console.log("");
      continue;
    }

    console.log(
      "  ürün      " + varyant.product.name.slice(0, 56) +
        (varyant.product.isActive ? "" : "  ⚠ ÜRÜN PASİF"),
    );
    console.log(
      "  varyant   sku=" + varyant.sku + " · firmaSku=" + varyant.companySku +
        (varyant.isActive ? "" : "  ⚠ VARYANT PASİF"),
    );

    // ── (b) TY KANAL-SKU ────────────────────────────────────────────────
    const kanalSkular = await prisma.channelSku.findMany({
      where: { variantId: varyant.id, channelAccount: { channel: { name: KANAL } } },
      select: {
        channelSku: true,
        isActive: true,
        channelAccount: { select: { id: true, name: true } },
      },
    });
    if (kanalSkular.length === 0) {
      sayac.skuYok++;
      console.log("  (b) ⛔ " + KANAL + " KANAL-SKU YOK — eşleştirme kurulmamış.");
    } else {
      for (const k of kanalSkular)
        console.log(
          "  (b) ✓ kanal-SKU  " + k.channelSku.padEnd(18) +
            k.channelAccount.name.padEnd(10) +
            (k.isActive ? "aktif" : "⚠ PASİF"),
        );
    }

    // ── (c) TY SATIŞLARI ────────────────────────────────────────────────
    const kalemler = await prisma.saleItem.findMany({
      where: {
        variantId: varyant.id,
        sale: {
          channelAccount: { channel: { name: KANAL } },
          soldAt: { gte: bas, lte: bit },
        },
      },
      select: {
        id: true,
        quantity: true,
        sale: {
          select: {
            soldAt: true,
            iptalTarihi: true,
            channelAccount: { select: { name: true } },
          },
        },
      },
    });
    const iptalli = kalemler.filter((k) => k.sale.iptalTarihi !== null);
    const gecerli = kalemler.filter((k) => k.sale.iptalTarihi === null);
    const iadeler = await prisma.returnItem.findMany({
      where: { saleItemId: { in: gecerli.map((k) => k.id) } },
      select: { saleItemId: true, quantity: true },
    });
    const iadeToplam = iadeler.reduce((t, i) => t + i.quantity, 0);
    const brut = gecerli.reduce((t, k) => t + k.quantity, 0);

    if (gecerli.length === 0) {
      sayac.satisYok++;
      const etiket =
        kanalSkular.length > 0
          ? "  (c) 🔴 ÜRÜN VAR + KANAL-SKU VAR + SATIŞ YOK → GİRİŞ EKSİKLİĞİ"
          : "  (c) ⛔ satış yok (kanal-SKU da yok — önce (b) çözülür)";
      console.log(etiket);
      if (iptalli.length > 0)
        console.log("      ⓘ " + iptalli.length + " İPTALLİ kalem var (sayıma girmez).");
    } else {
      sayac.satisVar++;
      const aylar = new Map<string, { satir: number; brut: number }>();
      for (const k of gecerli) {
        const ay = gun(k.sale.soldAt).slice(0, 7);
        const g = aylar.get(ay) ?? { satir: 0, brut: 0 };
        g.satir++;
        g.brut += k.quantity;
        aylar.set(ay, g);
      }
      console.log(
        "  (c) ✓ TY SATIŞI VAR — " + gecerli.length + " satır · brüt " + brut +
          " · net " + (brut - iadeToplam) +
          (iptalli.length ? "  (+" + iptalli.length + " iptalli)" : ""),
      );
      for (const [ay, g] of [...aylar].sort())
        console.log("      " + ay + "  " + g.satir + " satır · brüt " + g.brut);
      const hesaplar = [...new Set(gecerli.map((k) => k.sale.channelAccount.name))];
      console.log("      hesap: " + hesaplar.join(", "));
    }

    // ── BAŞKA KANALLAR — ayrı bulgu ─────────────────────────────────────
    const digerKalemler = await prisma.saleItem.findMany({
      where: {
        variantId: varyant.id,
        sale: {
          iptalTarihi: null,
          channelAccount: { channel: { name: { not: KANAL } } },
        },
      },
      select: {
        quantity: true,
        sale: {
          select: {
            soldAt: true,
            channelAccount: {
              select: { name: true, channel: { select: { name: true } } },
            },
          },
        },
      },
    });
    if (digerKalemler.length === 0) {
      console.log("  (d) başka kanalda satış: YOK");
    } else {
      const kanallar = new Map<string, { satir: number; brut: number }>();
      for (const k of digerKalemler) {
        const ad = k.sale.channelAccount.channel.name;
        const g = kanallar.get(ad) ?? { satir: 0, brut: 0 };
        g.satir++;
        g.brut += k.quantity;
        kanallar.set(ad, g);
      }
      console.log(
        "  (d) ⚠ BAŞKA KANALDA SATILIYOR — " +
          [...kanallar].map(([a, g]) => a + " " + g.satir + " satır/brüt " + g.brut).join(" · "),
      );
      console.log("      Bu AYRI bir bulgudur: ürün var, satılıyor, yalnız");
      console.log("      " + KANAL + " tarafı girilmiyor.");
    }
    console.log("");
  }

  console.log("═".repeat(74));
  console.log("ÖZET — üç sonuç AYRI sayıldı");
  console.log("  (a) barkod sistemde HİÇ YOK      " + sayac.yok);
  console.log("  (b) ürün var, TY kanal-SKU yok   " + sayac.skuYok);
  console.log("  (c) ürün+SKU var, TY satışı yok  " + sayac.satisYok + "   ← giriş eksikliği");
  console.log("      TY satışı olan                " + sayac.satisVar);
  console.log("");
  console.log("  ⚠ HÜKÜM VERİLMEDİ, ONARIM YAPILMADI — bu bir ÖLÇÜM.");
  console.log("");

  await prisma.$disconnect();
}

main();
