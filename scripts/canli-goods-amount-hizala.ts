import { writeFileSync } from "node:fs";

import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  ÖZET ALANI HİZALAMA — `Purchase.goodsAmount` = Σ(birim × adet)
 * ----------------------------------------------------------------------------
 *  Rapor (yazmaz):  npm run canli:goods-hizala
 *  Yazım:           npm run canli:goods-hizala -- --uygula
 *
 *  BETIK SINIFI: SUREKLI — stok YAZMAZ, yalnız özet alanını hizalar.
 *
 *  ── ⛔ NİYE VAR ─────────────────────────────────────────────────────────
 *  `goodsAmount` şemada "opsiyonel özet" diye duruyor ve gerçeğin kaynağı
 *  KALEMLERDİR. Ama maliyet düzeltme aracı (`canli:alim-maliyet-duzelt`)
 *  kalemi ve damgaları düzeltirken bu alana DOKUNMUYOR — yani her maliyet
 *  düzeltmesi arkasında bayat bir özet bırakıyor.
 *
 *  Ölçüldü (06.09.2026, canlı): 2024 alımın 2022'si temiz, **2 sapan** —
 *  `ALM-HB-260216-03` (goodsAmount 15.283,00 ↔ kalem 1.598,00; eski birim
 *  7.641,50 × 2 = 15.283, yani 03.09 düzeltmesinin artığı) ve
 *  `ALM-HB-251224-01` (875,00 ↔ 874,00, ₺1,00).
 *
 *  ⚠ BUGÜN HİÇBİR EKRAN `goodsAmount` OKUMUYOR (ölçüldü: yalnız
 *  `alimlar/actions.ts` YAZIYOR; `kart-borcu` kalemlerden hesaplıyor).
 *  Yani bayat değer bugün yanlış rakam üretmiyor — ama alan bir İDDİADIR
 *  ve onu gören biri üstüne akıl yürütür. _(Anayasa: "şemadaki alan da bir
 *  iddiadır — yazıcısı yoksa vaat boştur"; burada yazıcı VAR ama eksik.)_
 *
 *  ── ÖLÇÜT LİSTE DEĞİL, YENİDEN HESAPLANABİLİR ───────────────────────────
 *  Hangi kaydın hizalanacağı bir listeden değil ŞU KOŞULDAN gelir:
 *      goodsAmount != Σ(unitCostAmount × quantity)   (tek para birimliyse)
 *  Aynı ölçüt hem yazımın hem geri almanın kapısıdır; iki yerde iki farklı
 *  ölçüt olsaydı biri ötekinin yazdığını göremezdi.
 *
 *  ⚠ KARIŞIK PARA BİRİMLİ ALIM İNCELENEMEZ ve öyle SAYILIR — şema zaten
 *  "sadece tek para birimli alımlarda doldurulur" diyor. Bunu "temiz"
 *  saymak, bakılamayan bir kümeyi hüküm gibi göstermek olurdu.
 * ============================================================================
 */

const UYGULA = process.argv.includes("--uygula");

function para(x: number): string {
  return x.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function kurus(x: number): number {
  return Math.round(x * 100) / 100;
}

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("CANLI ADRES OKUNAMADI");
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");

  const hepsi = await prisma.purchase.findMany({
    where: { goodsAmount: { not: null } },
    select: {
      id: true,
      code: true,
      goodsAmount: true,
      goodsCurrency: true,
      items: {
        select: {
          quantity: true,
          unitCostAmount: true,
          unitCostCurrency: true,
          variant: { select: { sku: true } },
        },
      },
    },
  });

  let incelenen = 0;
  let temiz = 0;
  let incelenemeyen = 0;
  const sebepler = new Map<string, number>();
  const sapanlar: {
    id: string; code: string; eski: number; yeni: number;
    kalemler: string[];
  }[] = [];

  for (const a of hepsi) {
    if (a.items.length === 0) {
      incelenemeyen++;
      sebepler.set("kalemsiz", (sebepler.get("kalemsiz") ?? 0) + 1);
      continue;
    }
    const paralar = new Set(a.items.map((i) => i.unitCostCurrency));
    if (paralar.size > 1) {
      incelenemeyen++;
      sebepler.set("karışık para birimi", (sebepler.get("karışık para birimi") ?? 0) + 1);
      continue;
    }
    incelenen++;
    const kalemToplami = kurus(
      a.items.reduce((t, i) => t + Number(i.unitCostAmount.toString()) * i.quantity, 0),
    );
    const eski = kurus(Number(a.goodsAmount!.toString()));
    if (Math.abs(eski - kalemToplami) < 0.005) {
      temiz++;
      continue;
    }
    sapanlar.push({
      id: a.id, code: a.code, eski, yeni: kalemToplami,
      kalemler: a.items.map((i) =>
        `${i.variant.sku} ×${i.quantity} @ ${para(Number(i.unitCostAmount.toString()))}`),
    });
  }

  console.log("\n" + "=".repeat(92));
  console.log("  ÖZET ALANI HİZALAMA — goodsAmount = Σ(birim × adet)" +
    (UYGULA ? "   [YAZIM]" : "   [RAPOR — yazmaz]"));
  console.log("=".repeat(92));
  /** Dört sayı AYRI yazılır: "bulamadım" ile "bakamadım" aynı şey değildir. */
  console.log(`  incelenen ${incelenen} · temiz ${temiz} · SAPAN ${sapanlar.length}` +
    ` · incelenemeyen ${incelenemeyen}` +
    (incelenemeyen > 0 ? "  (" + [...sebepler].map(([k, v]) => `${k}: ${v}`).join(" · ") + ")" : ""));

  if (sapanlar.length === 0) {
    console.log("\n  ⭐ SAPMA YOK — özet alanları kalem toplamlarıyla tutuyor.\n");
    await prisma.$disconnect();
    return;
  }

  console.log("");
  for (const s of sapanlar) {
    console.log(`  ${s.code}`);
    console.log(`     goodsAmount ${para(s.eski).padStart(12)}  →  kalem toplamı ${para(s.yeni).padStart(12)}` +
      `   fark ${para(kurus(s.eski - s.yeni)).padStart(11)}`);
    for (const k of s.kalemler) console.log(`     · ${k}`);
  }

  if (!UYGULA) {
    console.log("\n" + "=".repeat(92));
    console.log("  ⛔ RAPOR — HİÇBİR ŞEY YAZILMADI.");
    console.log("     Yazmak için: npm run canli:goods-hizala -- --uygula");
    console.log("=".repeat(92) + "\n");
    await prisma.$disconnect();
    return;
  }

  /** (a) YEREL ANLIK GÖRÜNTÜ — iz sayısı kısmi yazım kanıtı DEĞİLDİR. */
  const gYol = `veri/ozel/goods-amount-hizalama-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "")}.json`;
  writeFileSync(gYol, JSON.stringify({ an: new Date().toISOString(), sapanlar }, null, 2), "utf8");
  console.log(`\n  ⭐ ANLIK GÖRÜNTÜ: ${gYol}`);

  const kullanici = await prisma.user.findFirst({ select: { id: true } });
  if (kullanici === null) {
    console.log("  ⛔ Kullanıcı yok — iz yazılamaz. DURDU.");
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }

  /**
   * (b) TAMAMI-YA-HİÇBİRİ — ve zaman aşımı yazım boyutuna göre AÇIKÇA ayarlı.
   * (c) Kapasite kısıtı YOK: her satırın hedefi kendi kaydı, çakışma olamaz.
   * ⚠ Her satırın ESKİ DEĞERİ ize yazılır — toplam tek başına yetmez,
   *   sonradan doğan bir fark kime ait diye sorulamaz.
   */
  await prisma.$transaction(
    async (tx) => {
      for (const s of sapanlar) {
        await tx.purchase.update({ where: { id: s.id }, data: { goodsAmount: s.yeni } });
      }
      await tx.auditLog.createMany({
        data: sapanlar.map((s) => ({
          userId: kullanici.id,
          action: "GOODS_AMOUNT_HIZALANDI",
          targetType: "Purchase",
          targetId: s.id,
          detail: JSON.stringify({
            alim: s.code, eski: s.eski, yeni: s.yeni,
            fark: kurus(s.eski - s.yeni),
            olcut: "goodsAmount != Σ(unitCostAmount × quantity)",
          }),
        })),
      });
    },
    { timeout: 120_000 },
  );

  /** Kanıt VERİNİN KENDİSİNDEN okunur — iz sayısı niyeti söyler, sonucu değil. */
  let dogrulanan = 0;
  for (const s of sapanlar) {
    const a = await prisma.purchase.findUnique({
      where: { id: s.id }, select: { goodsAmount: true },
    });
    if (a?.goodsAmount != null && Math.abs(Number(a.goodsAmount.toString()) - s.yeni) < 0.005) {
      dogrulanan++;
    }
  }
  console.log(`\n  ④ DOĞRULAMA — defterden okundu: ${dogrulanan}/${sapanlar.length}` +
    (dogrulanan === sapanlar.length ? " ✓" : " ⛔ EKSİK"));
  if (dogrulanan !== sapanlar.length) process.exitCode = 1;
  console.log("");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
