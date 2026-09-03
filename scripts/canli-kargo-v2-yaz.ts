/** BETIK SINIFI: TEK_SEFERLIK — V2 baz dosyasindan KARGO doldurma (602 satis); dosya md5 kilidi. */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

import readXlsxFile from "read-excel-file/node";

import { paketiNormalle } from "../src/lib/tablo/paket";
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  KARGO V2 DOLDURMA — DEFTERDE KARGOSU OLMAYAN SATIŞLARA DOSYADAN
 * ----------------------------------------------------------------------------
 *      npm run canli:kargo-v2-yaz             → KURU KOŞUM (yazmaz)
 *      npm run canli:kargo-v2-yaz -- --uygula → YAZAR
 *
 *  ── YETKİ ───────────────────────────────────────────────────────────────
 *  Halil 03.09.2026: _"O sütunu KARGO ... bunlar baz olarak
 *  kullanılabilecek içerikler."_ K146'da aynı iş 19 satışa yapılmıştı
 *  (Halil'in elle doldurduğu listeden); bu tur kaynağı V2 baz dosyası.
 *
 *  ── TABAN — ÖLÇÜLDÜ, VARSAYILMADI (03.09.2026) ─────────────────────────
 *  Kargosu ZATEN olan 5.270 ortak satışta defter ÷ dosya = p25/p50/p75
 *  **tam 0,833 = 1/1,20**. Yani dosya kolonu KDV DAHİL, defter alanı
 *  (`Sale.cargoAmount`) KDV HARİÇ tutuyor. Yazım: dosya ÷ 1,20.
 *
 *  ── KARGO FİRMASI BİLİNMİYOR — BEYANLA BOŞ ──────────────────────────────
 *  V2'de firma kolonu yok; uydurulmaz, `cargoCarrierId` null kalır.
 *  (K146'da firma Halil'in listesinden gelmişti; burada kaynak yok.)
 *
 *  ── TEKRAR KOŞULABİLİRLİK ───────────────────────────────────────────────
 *  Ölçüt: "satışın kargosu hâlâ boş mu" — dolanlar atlanır; liste yok.
 *  Kâr tazeleme ekranın gövdesiyle (`karYenidenYaz`) — ikinci motor yok.
 * ============================================================================
 */

const V2 = "C:/Users/yapra/Downloads/Satislar_V2.xlsx";
const V2_MD5 = "3872cefdd19f158404a2498c37e83f4a";
const KDV_CARPANI = 1.2;
const UYGULA = process.argv.includes("--uygula");

const metne = (h: unknown): string =>
  h instanceof Date ? h.toISOString().slice(0, 10) : String(h ?? "").trim();
const anahtarla = (s: string) => s.toLocaleLowerCase("tr-TR").replace(/[\s_-]+/g, "");
const num = (h: unknown): number => (typeof h === "number" && Number.isFinite(h) ? h : 0);
const p2 = (x: number) =>
  x.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");
  const { karYenidenYaz } = await import("../src/lib/kar-yeniden");
  const { kdvDahilKargo } = await import("../src/lib/kargo-kdv");

  const ham = readFileSync(V2);
  const md5 = createHash("md5").update(ham).digest("hex");
  console.log("=".repeat(96));
  console.log(`  KARGO V2 DOLDURMA · KİP: ${UYGULA ? "⚠ UYGULA (YAZAR)" : "KURU KOŞUM (yazmaz)"}`);
  console.log(`  dosya ${V2.split("/").pop()} · md5 ${md5}`);
  console.log("=".repeat(96));
  if (md5 !== V2_MD5) {
    console.log("\n⛔ MD5 TUTMUYOR — baz dosya bu değil. ÇIKILDI.\n");
    process.exitCode = 1;
    return;
  }

  const sf = await readXlsxFile(paketiNormalle(ham).bayt);
  const sayfa = sf[0];
  const bas = sayfa.data[0].map((h) => metne(h));
  const K = (a: string) => bas.findIndex((h) => anahtarla(h) === anahtarla(a));
  const kSip = K("Sipariş Numarası"), kTur = K("TÜR"), kKargo = K("KARGO");
  const dosya = new Map<string, number>();
  for (let i = 1; i < sayfa.data.length; i += 1) {
    const r = sayfa.data[i];
    const t = anahtarla(metne(r[kTur]));
    if (!t.includes("satis") && !t.includes("satış")) continue;
    const sip = metne(r[kSip]).replace(/\s+/g, "");
    if (sip === "") continue;
    dosya.set(sip, (dosya.get(sip) ?? 0) + num(r[kKargo]));
  }

  const satislar = await prisma.sale.findMany({
    where: { soldAt: { gte: new Date("2025-08-01T00:00:00Z") }, iptalTarihi: null },
    select: { id: true, code: true, cargoAmount: true, cargoCarrierId: true,
      cargoDesi: true,
      channelAccount: { select: { channel: { select: { name: true } } } },
      items: { select: { id: true, commissionRate: true } } },
  });
  type Plan = { s: (typeof satislar)[number]; kdvDahil: number; kdvHaric: number };
  const plan: Plan[] = [];
  let zatenDolu = 0, dosyadaYok = 0;
  const kanal = new Map<string, { n: number; t: number }>();
  for (const s of satislar) {
    const d = dosya.get((s.code ?? "").replace(/\s+/g, ""));
    if (d === undefined || d <= 0) { dosyadaYok += 1; continue; }
    if (s.cargoAmount !== null && Number(s.cargoAmount.toString()) > 0) { zatenDolu += 1; continue; }
    const kdvHaric = Math.round((d / KDV_CARPANI) * 100) / 100;
    plan.push({ s, kdvDahil: d, kdvHaric });
    const kn = s.channelAccount.channel.name;
    const g = kanal.get(kn) ?? { n: 0, t: 0 }; g.n += 1; g.t += d; kanal.set(kn, g);
  }
  console.log(`\n① PLAN — kargosu doldurulacak: ${plan.length} satış`);
  console.log(`   (kargosu zaten dolu ${zatenDolu} · dosyada kargosu yok/0 ${dosyadaYok})`);
  console.log(`   dosya toplamı (KDV dahil) ₺${p2(plan.reduce((a, x) => a + x.kdvDahil, 0))}` +
    ` → deftere yazılacak (KDV hariç) ₺${p2(plan.reduce((a, x) => a + x.kdvHaric, 0))}`);
  for (const [k, g] of [...kanal.entries()].sort((a, b) => b[1].t - a[1].t))
    console.log(`   ${k.padEnd(14)} ${String(g.n).padStart(4)} satış · ₺${p2(g.t)} (dahil)`);
  const csv = ["siparis;kanal;kdvDahil;kdvHaric"];
  for (const p of plan)
    csv.push([p.s.code, p.s.channelAccount.channel.name, p.kdvDahil.toFixed(2),
      p.kdvHaric.toFixed(2)].join(";"));
  writeFileSync("raporlar/kargo-v2-plani.csv", "\uFEFF" + csv.join("\r\n"), "utf8");
  console.log(`   ⭐ plan: raporlar/kargo-v2-plani.csv (${plan.length})`);

  if (!UYGULA) {
    console.log("\n  KURU KOŞUM — hiçbir şey yazılmadı. Yazmak için: -- --uygula\n");
    await prisma.$disconnect();
    return;
  }

  /* ── YAZIM — satış başına: cargoAmount + kâr tazeleme ── */
  let yazilan = 0, atlanan = 0, hata = 0;
  const hatalar: string[] = [];
  for (const p of plan) {
    try {
      /** Yazım kapısı = okuma ölçütü: kargo hâlâ boş mu. */
      const guncel = await prisma.sale.findUnique({
        where: { id: p.s.id }, select: { cargoAmount: true } });
      if (guncel?.cargoAmount !== null && Number(guncel!.cargoAmount!.toString()) > 0) {
        atlanan += 1; continue;
      }
      await prisma.sale.update({
        where: { id: p.s.id },
        data: { cargoAmount: String(p.kdvHaric), cargoCurrency: "TRY" },
      });
      const ok = await karYenidenYaz({
        saleId: p.s.id,
        kalemler: p.s.items.map((k) => ({
          saleItemId: k.id,
          commissionRate: k.commissionRate === null ? null : Number(k.commissionRate.toString()),
          commissionAmount: null,
        })),
        cargoCarrierId: p.s.cargoCarrierId,
        cargoDesi: p.s.cargoDesi === null ? null : Number(p.s.cargoDesi.toString()),
        cargoAmountManual: kdvDahilKargo(p.kdvHaric),
      });
      if (!ok) { hata += 1; hatalar.push(p.s.code + " — karYenidenYaz false"); continue; }
      yazilan += 1;
      if (yazilan % 100 === 0) console.log(`   … ${yazilan}/${plan.length}`);
    } catch (e) {
      hata += 1;
      hatalar.push(`${p.s.code} — ${(e as Error).message.replace(/\n/g, " ")}`);
      if (hatalar.length <= 6) console.log(`   ⛔ ${hatalar[hatalar.length - 1].slice(-160)}`);
    }
  }
  console.log(`\n② YAZIM  yazılan ${yazilan} · atlanan ${atlanan} · hata ${hata}`);
  const dolu = await prisma.sale.count({
    where: { soldAt: { gte: new Date("2025-08-01T00:00:00Z") }, iptalTarihi: null,
      cargoAmount: { not: null } } });
  console.log(`   resmî dönem kargolu satış artık: ${dolu}`);
  await prisma.auditLog.create({
    data: {
      action: "KARGO_DOSYADAN_YAZILDI",
      targetType: "Sale",
      targetId: "kargo-v2-20260903",
      detail: JSON.stringify({
        dosya: V2.split("/").pop(), md5, yazilan, atlanan, hata,
        taban: "dosya KDV DAHIL (olculdu: defter/dosya=0,833 tam) → defter KDV HARIC ÷1,20",
        firma: "V2'de firma kolonu YOK — cargoCarrierId null birakildi, uydurulmadi",
        geriAlmaOlcutu:
          "kargosu, V2 dosyasindaki degerin 1,20'ye bolumune kurusuna esit olan satislar (liste yok)",
        hatalar: hatalar.slice(0, 15),
      }),
    },
  });
  console.log(`   iz: AuditLog → KARGO_DOSYADAN_YAZILDI / kargo-v2-20260903\n`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("HATA:", e instanceof Error ? e.stack : e);
  process.exitCode = 1;
});
