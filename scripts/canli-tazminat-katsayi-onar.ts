import { writeFileSync } from "node:fs";

import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  TAZMİNAT TUTARI ×10.000 ONARIMI (K238, 23.09.2026)
 * ----------------------------------------------------------------------------
 *  BETIK SINIFI: TEK_SEFERLIK — ölçüt yeniden hesaplanabilir, kip kuru koşum.
 *
 *      npx tsx scripts/canli-tazminat-katsayi-onar.ts            → KURU KOŞUM
 *      npx tsx scripts/canli-tazminat-katsayi-onar.ts --uygula   → YAZAR
 *      npx tsx scripts/canli-tazminat-katsayi-onar.ts --geri=<görüntü.json>
 *
 *  ── NİYE ────────────────────────────────────────────────────────────────
 *  Form makine biçimi yazıyordu (`799.9100`), sunucu noktayı BİNLİK AYIRACI
 *  sanıp siliyordu → `7999100`. Kod düzeltildi (`talepTutariniCoz`); bu betik
 *  ZATEN YAZILMIŞ kayıtları onarır.
 *
 *  ── ÖLÇÜT — SAKLANAN LİSTE DEĞİL ────────────────────────────────────────
 *  Bir talep şu üç şart BİRDEN sağlanıyorsa bozuktur:
 *    ① alım kalemine bağlı (birim maliyet BİLİNİYOR),
 *    ② `amount` ile `adet × birim maliyet` oranı TAM 10.000 (kuruşuna),
 *    ③ doğru değer kuruşa yuvarlandığında tam oturuyor.
 *  Oran 1,00 olan kayıtlara DOKUNULMAZ; iade kaynaklı taleplerde birim
 *  maliyet yok, onlar kapsam DIŞI ve raporlanır.
 *  ⛔ Yaklaşık oran kabul edilmez: 10.000'e "yakın" bir kayıt başka bir
 *  sebeple yanlış olabilir ve onu bu betik düzeltmemeli.
 *
 *  ── YEREL ANLIK GÖRÜNTÜ ────────────────────────────────────────────────
 *  Yazımdan önce dokunulacak her satırın ESKİ değeri `veri/ozel/`e yazılır;
 *  geri alma o dosyadan okur. (Anayasa: "toplu yazımda önceki değer SATIR
 *  BAZINDA saklanır" — toplam tek başına yetmez.)
 * ============================================================================
 */

const KATSAYI = 10_000;
/** Kuruş toleransı: `Decimal`→float kuyruğu yüzünden tam eşitlik aranmaz. */
const KURUS = 0.005;

async function main() {
  const uygula = process.argv.includes("--uygula");
  const geri = process.argv.find((a) => a.startsWith("--geri="))?.slice(7);
  const y = canliYapilandirma();
  if (!y.tamam) { console.log("Canlı yapılandırma okunamadı:", y.hata); process.exitCode = 1; return; }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");

  console.log("\nTAZMİNAT TUTARI ×10.000 ONARIMI");
  console.log(`  kip  ${geri ? "GERİ ALMA" : uygula ? "⚠ YAZIM" : "KURU KOŞUM — hiçbir şey yazılmaz"}`);
  console.log("=".repeat(78));

  if (geri) {
    const { readFileSync } = await import("node:fs");
    const g = JSON.parse(readFileSync(geri, "utf8")) as {
      plan: { id: string; eski: string }[];
    };
    for (const p of g.plan) {
      await prisma.compensation.update({ where: { id: p.id }, data: { amount: p.eski } });
    }
    await prisma.auditLog.create({ data: { action: "TAZMINAT_KATSAYI_GERI", targetType: "Compensation", targetId: null,
      detail: JSON.stringify({ goruntu: geri, geriAlinan: g.plan.length }) } });
    console.log(`${g.plan.length} kayıt eski değerine döndürüldü · iz bırakıldı`);
    await prisma.$disconnect();
    return;
  }

  const kayitlar = await prisma.compensation.findMany({
    select: {
      id: true, amount: true, currency: true, quantity: true, status: true, occurredAt: true,
      purchaseItem: {
        select: {
          unitCostAmount: true,
          variant: { select: { product: { select: { name: true } } } },
        },
      },
    },
    orderBy: { occurredAt: "desc" },
  });

  const plan: { id: string; eski: string; yeni: string; ad: string; tarih: string }[] = [];
  let dokunulmayan = 0;
  let kapsamDisi = 0;

  for (const k of kayitlar) {
    if (!k.purchaseItem) { kapsamDisi++; continue; }
    const birim = Number(k.purchaseItem.unitCostAmount);
    const dogru = Math.round(birim * k.quantity * 100) / 100;
    const mevcut = Number(k.amount);
    if (dogru <= 0) { dokunulmayan++; continue; }
    /** ⛔ TAM 10.000 — "yaklaşık" kabul edilmez. */
    if (Math.abs(mevcut - dogru * KATSAYI) > KURUS * KATSAYI) { dokunulmayan++; continue; }
    plan.push({
      id: k.id,
      eski: k.amount.toString(),
      yeni: dogru.toFixed(4),
      ad: k.purchaseItem.variant.product.name.slice(0, 44),
      tarih: k.occurredAt.toISOString().slice(0, 10),
    });
  }

  console.log(`\nincelenen ${kayitlar.length} · ONARILACAK ${plan.length} · dokunulmayan ${dokunulmayan} · kapsam dışı (iade kaynaklı, birim maliyet yok) ${kapsamDisi}\n`);
  let eskiToplam = 0;
  let yeniToplam = 0;
  for (const p of plan) {
    eskiToplam += Number(p.eski);
    yeniToplam += Number(p.yeni);
    console.log(`  ${p.tarih}  ${Number(p.eski).toLocaleString("tr-TR").padStart(16)} → ${Number(p.yeni).toLocaleString("tr-TR").padStart(12)}   ${p.ad}`);
  }
  console.log(`\n  TOPLAM  ${eskiToplam.toLocaleString("tr-TR")} → ${yeniToplam.toLocaleString("tr-TR")}`);
  console.log(`  GERÇEK NET'ten düşecek: ${(eskiToplam - yeniToplam).toLocaleString("tr-TR")} (yalnız TAHSİL EDİLMİŞ olanlar GERÇEK NET'e giriyordu)`);

  if (!uygula) {
    console.log("\nKURU KOŞUM BİTTİ — hiçbir şey yazılmadı.  Yazmak için: -- --uygula\n");
    await prisma.$disconnect();
    return;
  }

  const damga = new Date();
  const goruntu = `veri/ozel/tazminat-katsayi-${damga.toISOString().replace(/[:.]/g, "-")}.json`;
  writeFileSync(goruntu, JSON.stringify({ damga: damga.toISOString(), plan }, null, 2), "utf8");
  for (const p of plan) {
    await prisma.compensation.update({ where: { id: p.id }, data: { amount: p.yeni } });
  }
  await prisma.auditLog.create({ data: { action: "TAZMINAT_KATSAYI_ONARIM", targetType: "Compensation", targetId: null,
    detail: JSON.stringify({ damga: damga.toISOString(), onarilan: plan.length, eskiToplam, yeniToplam, goruntu,
      gerekce: "form makine bicimi yaziyordu, sunucu noktayi binlik ayiraci sanip siliyordu (K238)" }) } });
  console.log(`\n${plan.length} kayıt onarıldı · iz bırakıldı · görüntü ${goruntu}`);
  console.log(`geri almak için:  npx tsx scripts/canli-tazminat-katsayi-onar.ts --geri=${goruntu}`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
