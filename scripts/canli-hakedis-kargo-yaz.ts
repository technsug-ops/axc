import { writeFileSync } from "node:fs";

import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  HAKEDİŞTEN GELEN GERÇEK KARGO — YAZIM (kullanıcı kararı 07.10.2026)
 * ----------------------------------------------------------------------------
 *      Kuru:   npx tsx scripts/canli-hakedis-kargo-yaz.ts
 *      Yazım:  npx tsx scripts/canli-hakedis-kargo-yaz.ts --yaz --anlik="C:\…\oncesi.json"
 *
 *  BETIK SINIFI: TEK_SEFERLIK — HB'de API'den önceki dönemde kargo TAHMİNLE
 *  yazılmış ve hakediş gelince düzeltilmemişti. Kullanıcı: «esas olan
 *  hakedişte kesilen kargo; o rakamlara göre düzelt — şu an öyle bir problem
 *  yok, gerçek rakamları çektiği için ileriki hakedişlerde tutması lazım.»
 *
 *  ÖLÇÜT `canli-hakedis-kargo-kosum.ts` (K197-③ kuru koşum) İLE AYNI:
 *    · hakedişte `KARGO` kalemi olan, satışa BAĞLI, iptal edilmemiş satış;
 *    · TEK kargo satırı (çok satırlı → hüküm YOK: ikinci satır değişim/iade
 *      gönderisi olabilir, o kargo iade kaydına aittir — toplamak çift düşerdi);
 *    · yeni = |hakediş| ÷ 1,20 (hakediş KDV DAHİL ölçüldü, `cargoAmount` KDV HARİÇ);
 *    · defterde yoksa ya da 1 kuruştan fazla farklıysa yazılır.
 *  `tahminiKargo` YERİNDE KALIR (kargo-kaynagi: gerçekleşen varsa o okunur).
 *
 *  ⛔ TOPLU YAZIM ÜÇ ŞARTI: (a) `--anlik` zorunlu — dokunulacak alanlar yazımdan
 *  ÖNCE dosyaya; (b) satır satır, tekrar koşulabilir (ölçüt yeniden hesaplanır,
 *  ikinci koşum 0 bulur); (c) her satır eski/yeni değeri `AuditLog`a yazar
 *  (`HAKEDIS_KARGO_YAZIM`) — geri alma kaynağı odur.
 * ============================================================================
 */

const YAZ = process.argv.includes("--yaz");
const ANLIK = process.argv.find((a) => a.startsWith("--anlik="))?.slice("--anlik=".length) ?? null;
const KDV = 1.2;

async function main() {
  if (YAZ && !ANLIK) throw new Error("--yaz için --anlik=<dosya> zorunlu — hiçbir şey yazılmadı");
  const y = canliYapilandirma();
  if (!y.tamam) throw new Error("canlı yapılandırma okunamadı");
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");
  const { satisKarTazele } = await import("../src/lib/kar-yeniden");
  const { izYaz } = await import("../src/lib/iz");
  try {
    const kalemler = await prisma.settlementItem.findMany({ where: { code: "KARGO", NOT: { saleId: null } }, select: { saleId: true, amount: true } });
    const kanal = new Map<string, { dahil: number; satir: number }>();
    for (const k of kalemler) {
      const v = kanal.get(k.saleId!) ?? { dahil: 0, satir: 0 };
      v.dahil += Math.abs(Number(k.amount));
      v.satir += 1;
      kanal.set(k.saleId!, v);
    }
    const satislar = await prisma.sale.findMany({
      where: { id: { in: [...kanal.keys()] } },
      select: { id: true, code: true, iptalTarihi: true, cargoAmount: true, tahminiKargo: true, net1Amount: true, net2Amount: true, profitStatus: true,
        fees: { select: { id: true, code: true, amount: true, saleItemId: true } }, items: { select: { id: true, net1Amount: true, net2Amount: true, profitStatus: true } } },
    });
    const hedef: { s: (typeof satislar)[number]; yeni: number; eski: number | null }[] = [];
    const cokSatir: string[] = [];
    for (const s of satislar) {
      if (s.iptalTarihi !== null) continue;
      const k = kanal.get(s.id)!;
      if (k.satir > 1) { cokSatir.push(s.code ?? s.id); continue; }
      const yeni = k.dahil / KDV;
      const eski = s.cargoAmount === null ? null : Number(s.cargoAmount);
      if (eski !== null && Math.abs(yeni - eski) < 0.01) continue;
      hedef.push({ s, yeni, eski });
    }
    console.log(`\nHAKEDİŞ KARGO YAZIMI · ${YAZ ? "⚠ YAZIM" : "KURU KOŞUM"}`);
    console.log(`  yazılacak ${hedef.length} (değişen ${hedef.filter((h) => h.eski !== null).length} · ilk kez ${hedef.filter((h) => h.eski === null).length}) · çok satırlı (hüküm yok) ${cokSatir.length}`);
    if (!YAZ) { console.log("  KURU KOŞUM — hiçbir şey yazılmadı."); return; }

    writeFileSync(ANLIK!, JSON.stringify(hedef.map((h) => h.s), null, 1));
    console.log(`  anlık görüntü → ${ANLIK} (${hedef.length} satış)`);
    let yazilan = 0;
    let karHata = 0;
    for (const { s, yeni, eski } of hedef) {
      await prisma.sale.update({ where: { id: s.id }, data: { cargoAmount: yeni.toFixed(4) } });
      await izYaz({ action: "HAKEDIS_KARGO_YAZIM", targetType: "Sale", targetId: s.id, userId: null,
        detail: JSON.stringify({ kod: s.code, eskiCargoAmount: eski, yeniCargoAmount: Number(yeni.toFixed(4)), tahminiKargo: s.tahminiKargo === null ? null : Number(s.tahminiKargo), eskiNet2: s.net2Amount === null ? null : Number(s.net2Amount), kaynak: "hakediş KARGO ÷ 1,20" }) });
      try { await satisKarTazele(s.id); } catch (e) { karHata++; console.log(`  ⛔ kâr tazelenemedi ${s.code}: ${String(e).replace(/\s+/g, " ").slice(0, 300)}`); }
      yazilan++;
      if (yazilan % 50 === 0) console.log(`  … ${yazilan}/${hedef.length}`);
    }
    console.log(`  ✓ YAZILAN ${yazilan} · kâr tazeleme hatası ${karHata}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("HATA:", e instanceof Error ? `${e.name}: ${e.message}`.replace(/\s+/g, " ") : e);
  process.exitCode = 1;
});
