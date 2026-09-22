import { writeFileSync } from "node:fs";

import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  PASİF VARYANTA BAĞLI ONAYSIZ SATIŞ KALEMLERİNİ GERÇEK VARYANTA ÇEVİR
 * ----------------------------------------------------------------------------
 *  BETIK SINIFI: TEK_SEFERLIK — ölçüt yeniden hesaplanabilir, kip kuru koşum.
 *
 *      npx tsx scripts/canli-pasif-bagi-onar.ts            → KURU KOŞUM
 *      npx tsx scripts/canli-pasif-bagi-onar.ts --uygula   → YAZAR
 *
 *  ── NİYE DOĞDU (22.09.2026) ────────────────────────────────────────────
 *  K231'de üç ikiz kayıt pasife alındı; arama artık onları görmüyor. Ama
 *  ÜÇ İÇE AKTARMA (`canli-hb/ty/n11-ice-aktar`) varyantı `isActive`
 *  süzmeden buluyordu — Hepsiburada'nın 22.09 08:16 siparişi (4748270482)
 *  yine ikize bağlandı, onaylanamadı.
 *  _(Anayasa: "kararın kapsamı, uygulandığı yerle sınırlı sayılmaz".)_
 *
 *  ── ÖLÇÜT — SAKLANAN LİSTE DEĞİL ───────────────────────────────────────
 *  Kalem: ONAYSIZ ∧ İPTALSİZ ∧ varyantı PASİF ∧ **STOK HAREKETİ YOK**.
 *  Hedef: pasif varyantın kimlik kodları (sku · firmaSku · barkod)
 *  `kodlaVaryantCoz` ile — yalnız AKTİF kayıtlar — **TEK** varyanta
 *  çözülüyorsa o. `COK`/`YOK` ise dokunulmaz, raporlanır.
 *
 *  ⛔ İKİ DEFTER KAPISI — "ONAYSIZ" ≠ "HAREKETSİZ". Ölçüldü 22.09: pasif
 *  varyanta bağlı 30 onaysız kalemin **29'u** 2025 tarihli Excel satışı
 *  (`satis-excel`, 03.09'da içe aktarılmış) ve `SALE_OUT` hareketleri ikizin
 *  üstünde. Kalemi çevirip hareketi ikizde bırakmak iki defteri ayrıştırırdı
 *  (kalem A'da, stok B'den düşmüş). Hareketi olan kalem DOKUNULMAZ — o
 *  geçmiştir, ayrı karar. Bugünkü sipariş hareketsiz: yalnız o çevrilir.
 *
 *  ⚠ İkinci koşum zararsız: çevrilen kalem artık pasif varyanta bağlı değil.
 * ============================================================================
 */

async function main() {
  const uygula = process.argv.includes("--uygula");
  const y = canliYapilandirma();
  if (!y.tamam) { console.log("Canlı yapılandırma okunamadı:", y.hata); process.exitCode = 1; return; }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");
  const { kodlaVaryantCoz } = await import("../src/lib/varyant-kod-cozumu");

  console.log("\nPASİF BAĞI ONARIMI — onaysız · hareketsiz kalem → aktif varyant");
  console.log(`  kip  ${uygula ? "⚠ YAZIM" : "KURU KOŞUM — hiçbir şey yazılmaz"}`);
  console.log("=".repeat(72));

  const kalemler = await prisma.saleItem.findMany({
    where: { variant: { isActive: false }, sale: { onaylandiAt: null, iptalTarihi: null } },
    select: {
      id: true, quantity: true, variantId: true,
      sale: { select: { id: true, code: true, createdAt: true, importKaynak: true } },
      variant: { select: { sku: true, companySku: true, barcode: true, product: { select: { name: true } } } },
      _count: { select: { stockMovements: true } },
    },
  });
  console.log(`\nonaysız · iptalsiz · PASİF varyanta bağlı kalem: ${kalemler.length}`);

  const plan: { kalemId: string; siparis: string; eski: string; yeni: string; yeniSku: string }[] = [];
  const cozulemeyen: string[] = [];
  const hareketli: string[] = [];

  for (const k of kalemler) {
    if (k._count.stockMovements > 0) {
      hareketli.push(`${k.sale.code ?? k.sale.id} → ${k.variant.sku} (${k._count.stockMovements} hareket, kaynak ${k.sale.importKaynak ?? "-"})`);
      continue;
    }
    let hedef: { id: string; sku: string } | null = null;
    let cok = false;
    for (const kod of [k.variant.sku, k.variant.companySku, k.variant.barcode]) {
      if (!kod) continue;
      const c = await kodlaVaryantCoz(kod);
      if (c.durum === "TEK" && c.id !== k.variantId) { hedef = { id: c.id, sku: c.aday.sku }; break; }
      if (c.durum === "COK") cok = true;
    }
    if (!hedef) { cozulemeyen.push(`${k.sale.code} → ${k.variant.sku} (${cok ? "ÇOK eşleşme" : "aktif karşılık YOK"})`); continue; }
    plan.push({ kalemId: k.id, siparis: k.sale.code ?? k.sale.id, eski: k.variantId, yeni: hedef.id, yeniSku: hedef.sku });
    console.log(`  ÇEVRİLECEK ${(k.sale.code ?? "-").padEnd(13)} ${k.sale.createdAt.toISOString().slice(0, 10)}  ${k.variant.sku.padEnd(16)} → ${hedef.sku.padEnd(18)} "${k.variant.product.name.slice(0, 34)}"`);
  }

  console.log(`\nçevrilecek ${plan.length} · çözülemeyen ${cozulemeyen.length} · HAREKETLİ — geçmiş, dokunulmadı ${hareketli.length}`);
  for (const c of cozulemeyen) console.log("  ⛔ " + c);
  for (const h of hareketli.slice(0, 4)) console.log("  ○ geçmiş " + h);
  if (hareketli.length > 4) console.log(`  ○ … ve ${hareketli.length - 4} tane daha`);

  if (!uygula) { console.log("\nKURU KOŞUM BİTTİ — hiçbir şey yazılmadı.  Yazmak için: -- --uygula"); await prisma.$disconnect(); return; }

  const damga = new Date();
  const goruntu = `veri/ozel/pasif-bagi-onar-${damga.toISOString().replace(/[:.]/g, "-")}.json`;
  writeFileSync(goruntu, JSON.stringify({ damga: damga.toISOString(), plan, cozulemeyen, hareketli }, null, 2), "utf8");
  let yazilan = 0;
  for (const p of plan) { await prisma.saleItem.update({ where: { id: p.kalemId }, data: { variantId: p.yeni } }); yazilan++; }
  await prisma.auditLog.create({ data: { action: "PASIF_BAGI_ONARIM", targetType: "SaleItem", targetId: null,
    detail: JSON.stringify({ damga: damga.toISOString(), yazilan, cozulemeyen: cozulemeyen.length, hareketliDokunulmadi: hareketli.length, goruntu, plan,
      gerekce: "ice aktarmalar isActive suzmuyordu; hareketsiz onaysiz kalemler pasif ikize bagliydi" }) } });
  console.log(`\n${yazilan} kalem çevrildi · iz bırakıldı · görüntü ${goruntu}`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
