import { writeFileSync } from "node:fs";

import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";
import { geciciKopyaMi, GECICI_FATURA_NO, type MevcutHakedisSatiri } from "../src/lib/hakedis/gecici-fatura";

/**
 * ============================================================================
 *  HB HAKEDİŞ — «.» GEÇİCİ FATURA NO KOPYALARININ TEMİZLİĞİ (K325-④, 13.10.2026)
 * ----------------------------------------------------------------------------
 *      Kuru:   npx tsx scripts/canli-hb-hakedis-gecici-temizle.ts
 *      Yazım:  npx tsx scripts/canli-hb-hakedis-gecici-temizle.ts --yaz --anlik="C:\…\oncesi.json"
 *
 *  BETIK SINIFI: TEK_SEFERLIK — çekim 13.10.2026'da düzeltildi (`gecici-fatura.ts`:
 *  «.» satırı gerçek numaraya terfi eder, kopya yazılmaz); bu betik o tarihten
 *  ÖNCE yazılmış kopyaları temizler. Yeni kopya doğmadığı için tekrar koşulması
 *  gerekmez (koşulursa 0 bulur).
 *
 *  ÖLÇÜT `geciciKopyaMi` — çekimin «ATLA» kararıyla AYNI eşleşme (iki yerde iki
 *  ölçüt olmaz) ve yeniden hesaplanabilir: ödenmemiş «.» satırı + aynı sipariş ·
 *  ham tip · tutarda gerçek fatura numaralı eşi. Liste SAKLANMAZ, her koşumda
 *  baştan hesaplanır (anayasa: geri alma yolu listeye değil ölçüte dayanır).
 *  Gerçek numaralı satıra DOKUNULMAZ — kanal ödemeyi onunla yapıyor.
 *
 *  ⛔ TOPLU YAZIM ÜÇ ŞARTI: (a) `--anlik` zorunlu — silinecek satırların TAM
 *  içeriği yazımdan ÖNCE dosyaya; (b) satır satır, tekrar koşulabilir; (c) her
 *  satır tam içeriğiyle `AuditLog`a (`HB_HAKEDIS_GECICI_KOPYA_SIL`) — geri alma
 *  kaynağı odur. Partinin toplamı (`Settlement.amount`) kalan satırlardan yeniden
 *  hesaplanır, eski/yeni değer ize yazılır.
 * ============================================================================
 */

const YAZ = process.argv.includes("--yaz");
const ANLIK = process.argv.find((a) => a.startsWith("--anlik="))?.slice("--anlik=".length) ?? null;
const ODEME_GUNU_DENETIMI = { bas: "2026-10-14", bit: "2026-10-20", panel: 75970.9 };

async function main() {
  if (YAZ && !ANLIK) throw new Error("--yaz için --anlik=<dosya> zorunlu — hiçbir şey yazılmadı");
  const y = canliYapilandirma();
  if (!y.tamam) throw new Error("canlı yapılandırma okunamadı");
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");
  const { izYaz } = await import("../src/lib/iz");
  const { isTakvimGunu, gunDegeri } = await import("../src/lib/donem");
  try {
    const hesaplar = await prisma.channelAccount.findMany({ where: { channel: { code: "HEPSIBURADA" } }, select: { id: true, name: true } });
    const noktalar = await prisma.settlementItem.findMany({
      where: { channelAccountId: { in: hesaplar.map((h) => h.id) }, externalId: GECICI_FATURA_NO },
    });
    const siparisler = [...new Set(noktalar.map((n) => n.orderNo).filter((o): o is string => o !== null))];
    const ayniSiparis = await prisma.settlementItem.findMany({
      where: { channelAccountId: { in: hesaplar.map((h) => h.id) }, orderNo: { in: siparisler } },
      select: { id: true, externalId: true, orderNo: true, rawType: true, amount: true, paidAt: true, channelAccountId: true },
    });
    const sade = (m: { id: string; externalId: string; orderNo: string | null; rawType: string | null; amount: unknown; paidAt: Date | null }): MevcutHakedisSatiri =>
      ({ id: m.id, externalId: m.externalId, orderNo: m.orderNo, rawType: m.rawType, amount: Number(String(m.amount)), paidAt: m.paidAt });
    const grup = new Map<string, MevcutHakedisSatiri[]>();
    for (const m of ayniSiparis) {
      const k = `${m.channelAccountId}|${m.orderNo}`;
      grup.set(k, [...(grup.get(k) ?? []), sade(m)]);
    }
    const kopyalar = noktalar.filter((n) => geciciKopyaMi(sade(n), grup.get(`${n.channelAccountId}|${n.orderNo}`) ?? []));
    const kalanNokta = noktalar.length - kopyalar.length;

    console.log(`\nHB HAKEDİŞ «.» KOPYA TEMİZLİĞİ · ${YAZ ? "⚠ YAZIM" : "KURU KOŞUM"}`);
    console.log(`  «.» satırı ${noktalar.length} · KOPYA (silinecek) ${kopyalar.length} · eşi olmayan, KALIR ${kalanNokta}`);
    const turBazinda = new Map<string, { n: number; t: number }>();
    for (const k of kopyalar) {
      const v = turBazinda.get(k.rawType ?? "-") ?? { n: 0, t: 0 };
      v.n++; v.t += Number(String(k.amount));
      turBazinda.set(k.rawType ?? "-", v);
    }
    for (const [tur, v] of [...turBazinda].sort((a, b) => b[1].n - a[1].n)) console.log(`    ${tur.padEnd(34)} ${String(v.n).padStart(4)} satır · ${v.t.toFixed(2)} TL`);
    console.log(`  etkilenen sipariş ${new Set(kopyalar.map((k) => k.orderNo)).size}`);

    /* Partiler: kaç satır gidiyor, toplam ne olmalı, boşalan var mı. */
    const partiIdler = [...new Set(kopyalar.map((k) => k.settlementId))];
    const partiler = await prisma.settlement.findMany({ where: { id: { in: partiIdler } }, select: { id: true, sourceFile: true, amount: true, _count: { select: { items: true } } } });
    const silinecekPartide = new Map<string, number>();
    for (const k of kopyalar) silinecekPartide.set(k.settlementId, (silinecekPartide.get(k.settlementId) ?? 0) + 1);
    const partiDurumu: { id: string; dosya: string | null; eskiToplam: number; yeniToplam: number; kalanSatir: number }[] = [];
    for (const p of partiler) {
      const kalan = await prisma.settlementItem.aggregate({
        where: { settlementId: p.id, id: { notIn: kopyalar.filter((k) => k.settlementId === p.id).map((k) => k.id) } },
        _sum: { amount: true }, _count: { _all: true },
      });
      partiDurumu.push({ id: p.id, dosya: p.sourceFile, eskiToplam: Number(String(p.amount)), yeniToplam: Number(String(kalan._sum.amount ?? 0)), kalanSatir: kalan._count._all });
    }
    console.log("  partiler:");
    for (const p of partiDurumu) console.log(`    ${String(p.dosya).padEnd(36)} silinecek ${String(silinecekPartide.get(p.id)).padStart(4)} · kalan satır ${String(p.kalanSatir).padStart(4)} · toplam ${p.eskiToplam.toFixed(2)} → ${p.yeniToplam.toFixed(2)}`);

    /* Denetim: HB panelinin 20.10 ödemesi (hak ediş dönemi 14–20 Ekim) — temizlik sonrası panelle kuruşuna tutmalı. */
    const odenmemis = await prisma.settlementItem.findMany({
      where: { channelAccountId: { in: hesaplar.map((h) => h.id) }, paidAt: null, NOT: { dueDate: null } },
      select: { id: true, amount: true, dueDate: true },
    });
    const silinecek = new Set(kopyalar.map((k) => k.id));
    const donemde = odenmemis.filter((o) => {
      const gun = gunDegeri(isTakvimGunu(o.dueDate!)).toISOString().slice(0, 10);
      return gun >= ODEME_GUNU_DENETIMI.bas && gun <= ODEME_GUNU_DENETIMI.bit;
    });
    const once = donemde.reduce((t, o) => t + Number(String(o.amount)), 0);
    const sonra = donemde.filter((o) => !silinecek.has(o.id)).reduce((t, o) => t + Number(String(o.amount)), 0);
    console.log(`  DENETİM 20.10 ödemesi (vade ${ODEME_GUNU_DENETIMI.bas}–${ODEME_GUNU_DENETIMI.bit}): önce ${once.toFixed(2)} · sonra ${sonra.toFixed(2)} · HB paneli ${ODEME_GUNU_DENETIMI.panel.toFixed(2)} → ${Math.abs(sonra - ODEME_GUNU_DENETIMI.panel) < 0.01 ? "TUTUYOR ✓" : "TUTMUYOR ✗"}`);

    if (!YAZ) { console.log("  KURU KOŞUM — hiçbir şey yazılmadı."); return; }

    writeFileSync(ANLIK!, JSON.stringify({ kopyalar, partiDurumu }, null, 1));
    console.log(`  anlık görüntü → ${ANLIK} (${kopyalar.length} satır, ${partiDurumu.length} parti)`);
    let silinen = 0;
    for (const k of kopyalar) {
      await prisma.$transaction(async (tx) => {
        await tx.settlementItem.delete({ where: { id: k.id } });
        await izYaz({ action: "HB_HAKEDIS_GECICI_KOPYA_SIL", targetType: "SettlementItem", targetId: k.id, userId: null, detail: JSON.stringify(k) }, tx);
      });
      silinen++;
    }
    for (const p of partiDurumu) {
      if (Math.abs(p.eskiToplam - p.yeniToplam) < 0.005) continue;
      await prisma.$transaction(async (tx) => {
        await tx.settlement.update({ where: { id: p.id }, data: { amount: p.yeniToplam.toFixed(4) } });
        await izYaz({ action: "HB_HAKEDIS_PARTI_TOPLAM_TAZELE", targetType: "Settlement", targetId: p.id, userId: null, detail: JSON.stringify({ sebep: "K325-④ «.» kopya temizliği", eskiToplam: p.eskiToplam, yeniToplam: p.yeniToplam, kalanSatir: p.kalanSatir }) }, tx);
      });
    }
    console.log(`  ✓ silinen ${silinen} satır · toplamı tazelenen parti ${partiDurumu.filter((p) => Math.abs(p.eskiToplam - p.yeniToplam) >= 0.005).length}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
