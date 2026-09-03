/** BETIK SINIFI: TEK_SEFERLIK — HB komisyonu KDV-haric yazilmis satislari V2 baz degerine ceker; V2 md5 kilidi. */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

import readXlsxFile from "read-excel-file/node";

import { paketiNormalle } from "../src/lib/tablo/paket";
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  KOMİSYON V2 DÜZELTMESİ — HB'NİN KDV'SİZ YAZILMIŞ DÖNEMİ
 * ----------------------------------------------------------------------------
 *      npm run canli:komisyon-v2-duzelt             → KURU KOŞUM
 *      npm run canli:komisyon-v2-duzelt -- --uygula → YAZAR
 *
 *  ── BULGU (ölçüldü 03.09.2026) ──────────────────────────────────────────
 *  Resmî dönemde 959 satışın komisyonu V2'den sapıyor; paranın tamamı
 *  HB Ağu–Ara 2025'te ve baskın desen **defter = dosya ÷ 1,20**. Motor
 *  (`kar.ts`) `komisyonTutari`ni OLDUĞU GİBİ kullanır — HB'de KDV DAHİL
 *  beklenir; o dönem HARİÇ yazılmış → NET o ayların komisyon KDV'si kadar
 *  İYİMSER. 2026 kayıtları dosyayla birebir (940/959'da oran zaten aynı —
 *  fark ORAN değil TABAN).
 *
 *  ── ÖLÇÜT — DESEN UYANLAR YAZILIR, UYMAYANLAR LİSTEYE ───────────────────
 *  · kanal HB · |defter−dosya| ≥ 1 kuruş · defter/dosya ∈ [0,830–0,837]
 *  · TEK kalemli satış (komisyon kaleme yazılır; çok kalemlide dosya
 *    sipariş toplamı — paylaştırma UYDURULMAZ, Halil listesine düşer)
 *  Kalanlar (oran farklı 19 · ×2,0 / ×1,38 / ×0,65 tekiller · TY küçük
 *  sapmalar) YAZILMAZ — `raporlar/komisyon-v2-halile.csv`.
 *
 *  ── MEKANİZMA ───────────────────────────────────────────────────────────
 *  `karYenidenYaz` (ekranın gövdesi) `commissionAmount = dosya` ile —
 *  motor tutari olduğu gibi alır (HB kuralı: DAHİL). SaleFee satırları
 *  motor tarafından yeniden yazılır; ikinci yazma yolu YOK.
 *  Tekrar koşum zararsız: düzeltilen satış artık kuruşuna eşit → atlanır.
 * ============================================================================
 */

const V2 = "C:/Users/yapra/Downloads/Satislar_V2.xlsx";
const V2_MD5 = "3872cefdd19f158404a2498c37e83f4a";
const ORAN_ALT = 0.83, ORAN_UST = 0.837;
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
  console.log(`  KOMİSYON V2 DÜZELTMESİ · KİP: ${UYGULA ? "⚠ UYGULA (YAZAR)" : "KURU KOŞUM (yazmaz)"}`);
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
  const kSip = K("Sipariş Numarası"), kTur = K("TÜR"), kKomT = K("KOMİSYON TUTARI");
  const dosya = new Map<string, number>();
  for (let i = 1; i < sayfa.data.length; i += 1) {
    const r = sayfa.data[i];
    const t = anahtarla(metne(r[kTur]));
    if (!t.includes("satis") && !t.includes("satış")) continue;
    const sip = metne(r[kSip]).replace(/\s+/g, "");
    if (sip === "") continue;
    dosya.set(sip, (dosya.get(sip) ?? 0) + num(r[kKomT]));
  }

  const satislar = await prisma.sale.findMany({
    where: { soldAt: { gte: new Date("2025-08-01T00:00:00Z") }, iptalTarihi: null },
    select: { id: true, code: true, soldAt: true, cargoCarrierId: true, cargoDesi: true,
      cargoAmount: true,
      channelAccount: { select: { channel: { select: { name: true } } } },
      items: { select: { id: true, commissionRate: true } },
      fees: { where: { code: "KOMISYON" }, select: { amount: true } } },
  });
  type Plan = { s: (typeof satislar)[number]; def: number; dos: number };
  const plan: Plan[] = [];
  const halile: string[] = ["siparis;kanal;ay;defter;dosya;oran;sebep"];
  let esit = 0;
  for (const s of satislar) {
    const d = dosya.get((s.code ?? "").replace(/\s+/g, ""));
    if (d === undefined || d <= 0) continue;
    const def = s.fees.reduce((a, f) => a + Number(f.amount.toString()), 0);
    if (def <= 0) continue;
    if (Math.abs(def - d) < 0.01) { esit += 1; continue; }
    const oran = def / d;
    const kanal = s.channelAccount.channel.name;
    const ay = s.soldAt.toISOString().slice(0, 7);
    const hb = anahtarla(kanal).includes("hepsiburada");
    if (hb && oran >= ORAN_ALT && oran <= ORAN_UST && s.items.length === 1) {
      plan.push({ s, def, dos: d });
    } else {
      const sebep = !hb ? "kanal HB degil"
        : s.items.length !== 1 ? "COK KALEMLI — paylastirma uydurulmaz"
        : "oran deseni uymuyor (" + oran.toFixed(3) + ")";
      halile.push([s.code, kanal, ay, def.toFixed(2), d.toFixed(2),
        oran.toFixed(3), sebep].join(";"));
    }
  }
  const farkTop = plan.reduce((a, x) => a + (x.dos - x.def), 0);
  console.log(`\n① PLAN — düzeltilecek: ${plan.length} satış (kuruşuna eşit ${esit})`);
  console.log(`   komisyon artışı toplamı: ₺${p2(farkTop)}  (dosya DAHİL − defter HARİÇ)`);
  const ayk = new Map<string, { n: number; t: number }>();
  for (const p of plan) {
    const ay = p.s.soldAt.toISOString().slice(0, 7);
    const g = ayk.get(ay) ?? { n: 0, t: 0 }; g.n += 1; g.t += p.dos - p.def; ayk.set(ay, g);
  }
  for (const [a, g] of [...ayk.entries()].sort())
    console.log(`   ${a}  ${String(g.n).padStart(4)} satış · +₺${p2(g.t)}`);
  console.log(`   ⚠ HALİL LİSTESİNE düşen: ${halile.length - 1}`);
  writeFileSync("raporlar/komisyon-v2-halile.csv", "\uFEFF" + halile.join("\r\n"), "utf8");
  const pcsv = ["siparis;defterEski;dosyaYeni"];
  for (const p of plan) pcsv.push([p.s.code, p.def.toFixed(2), p.dos.toFixed(2)].join(";"));
  writeFileSync("raporlar/komisyon-v2-plani.csv", "\uFEFF" + pcsv.join("\r\n"), "utf8");
  console.log(`   ⭐ plan: raporlar/komisyon-v2-plani.csv · sorulacaklar: komisyon-v2-halile.csv`);

  if (!UYGULA) {
    console.log("\n  KURU KOŞUM — hiçbir şey yazılmadı. Yazmak için: -- --uygula\n");
    await prisma.$disconnect();
    return;
  }

  let yazilan = 0, hata = 0;
  const hatalar: string[] = [];
  for (const p of plan) {
    try {
      const ok = await karYenidenYaz({
        saleId: p.s.id,
        kalemler: p.s.items.map((k) => ({
          saleItemId: k.id,
          commissionRate: k.commissionRate === null ? null : Number(k.commissionRate.toString()),
          /** ⭐ TUTAR VERİLİNCE motor onu OLDUĞU GİBİ kullanır (HB: DAHİL). */
          commissionAmount: p.dos,
        })),
        cargoCarrierId: p.s.cargoCarrierId,
        cargoDesi: p.s.cargoDesi === null ? null : Number(p.s.cargoDesi.toString()),
        cargoAmountManual: kdvDahilKargo(
          p.s.cargoAmount === null ? null : Number(p.s.cargoAmount.toString())),
      });
      if (!ok) { hata += 1; hatalar.push(p.s.code + " — false"); continue; }
      yazilan += 1;
      if (yazilan % 100 === 0) console.log(`   … ${yazilan}/${plan.length}`);
    } catch (e) {
      hata += 1;
      hatalar.push(`${p.s.code} — ${(e as Error).message.replace(/\n/g, " ")}`);
      if (hatalar.length <= 6) console.log(`   ⛔ ${hatalar[hatalar.length - 1].slice(-150)}`);
    }
  }
  console.log(`\n② YAZIM  yazılan ${yazilan} · hata ${hata}`);
  await prisma.auditLog.create({
    data: {
      action: "KOMISYON_V2_DUZELTILDI",
      targetType: "Sale",
      targetId: "komisyon-v2-20260903",
      detail: JSON.stringify({
        dosya: V2.split("/").pop(), md5, yazilan, hata,
        halileDusen: halile.length - 1,
        bulgu: "HB Agu-Ara 2025 komisyonlari KDV HARIC yazilmisti (defter/dosya=0,833 deseni); V2 DAHIL degerine cekildi",
        komisyonArtisi: farkTop.toFixed(2),
        olcut: "kanal HB + oran 0,830-0,837 + tek kalem; digerleri yazilmadi, listede",
        geriAlmaOlcutu: "komisyonu dosya degerine kurusuna esit olan satislar (liste yok)",
        hatalar: hatalar.slice(0, 15),
      }),
    },
  });
  console.log(`   iz: AuditLog → KOMISYON_V2_DUZELTILDI\n`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("HATA:", e instanceof Error ? e.stack : e);
  process.exitCode = 1;
});
