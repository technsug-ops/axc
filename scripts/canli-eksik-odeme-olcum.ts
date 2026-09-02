/**
 * ============================================================================
 *  EKSİK ÖDEME ÖLÇÜMÜ — SALT OKUMA
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run canli:eksik-odeme
 *
 *  BETIK SINIFI: TEK_SEFERLIK — K134'ten sonra görünür hâle gelen
 *  `EKSIK_ODEME` kümesini ölçer. HİÇBİR ŞEY YAZMAZ; yazma bayrağı yoktur.
 *
 *  ── SORDUĞU SORU ────────────────────────────────────────────────────────
 *  02.09.2026'da 1209 hakediş kalemi satışlara bağlandı ve teyit ekranı ilk
 *  kez rakam üretti: **`EKSIK_ODEME` 31 sipariş**, bazıları −₺7.033 gibi
 *  büyük negatifler taşıyor.
 *
 *  ⛔ BU RAKAM HENÜZ BİR HÜKÜM DEĞİL. Teyit şöyle hesaplıyor:
 *      beklenen    = NET-1 + maliyet          (bizim hesabımız)
 *      gerçekleşen = Σ o satışın hakediş kalemleri
 *  Eğer toplama **iade/kesinti satırları** karışıyorsa, "eksik ödeme"
 *  aslında bir NETLEMEDİR ve ortada eksik ödeme YOKTUR.
 *
 *  ⭐ AYIRT EDİCİ ÖLÇÜM: eksik görünen siparişlerin kalem KODLARINA bak.
 *  Negatif kod (iade, kesinti) taşıyorlarsa açıklama netlemedir; yalnız
 *  pozitif satış kodu taşıyıp yine de eksikse soru GERÇEKTİR.
 *  _(Anayasa: "iki okumayla da uyumlu bir gözlem hiçbirini kanıtlamaz" —
 *  ayırt edici kanıt, iki okumanın FARKLI sonuç vereceği yerden gelir.)_
 *
 *  ⚠ VE HÜKÜM VERİLMEZ. Rapor kümeleri sayar ve örnekleri gösterir;
 *  "şu kadar para eksik" cümlesi kurulmaz — o cümle ancak netleme
 *  ihtimali elendikten sonra kurulabilir.
 * ============================================================================
 */

import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";
import { beklenenHakedis } from "../src/lib/hakedis/eslestir";
import { canliYapilandirma } from "./canli-ortak";

function para(x: number | null): string {
  return x === null
    ? "—"
    : x.toLocaleString("tr-TR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
}
function doldur(m: string, n: number): string {
  return m.length >= n ? m.slice(0, n) : m + " ".repeat(n - m.length);
}
function saga(m: string, n: number): string {
  return m.length >= n ? m : " ".repeat(n - m.length) + m;
}

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  const prisma = new PrismaClient({ adapter: new PrismaMariaDb(y.veri.ham) });

  console.log("=".repeat(78));
  console.log("  EKSİK ÖDEME ÖLÇÜMÜ — salt okuma");
  console.log("=".repeat(78));

  // ── 1) BÜTÜN KALEM KODLARI — negatif kodlar hangileri ───────────────────
  const kodlar = await prisma.settlementItem.groupBy({
    by: ["code"],
    _count: { _all: true },
    _sum: { amount: true },
  });
  console.log("\n" + "-".repeat(78));
  console.log("  1) HAKEDİŞ KALEM KODLARI — ne var elimizde");
  console.log("-".repeat(78));
  for (const k of [...kodlar].sort(
    (a, b) => (b._count?._all ?? 0) - (a._count?._all ?? 0),
  )) {
    const toplam = Number(k._sum?.amount ?? 0);
    console.log(
      `  ${doldur(k.code, 30)} ${saga(String(k._count?._all ?? 0), 6)} kalem` +
        `   ${saga(para(toplam), 16)}` +
        (toplam < 0 ? "   ⚠ NEGATİF" : ""),
    );
  }

  // ── 2) EKSİK GÖRÜNEN SİPARİŞLER ─────────────────────────────────────────
  /**
   * ⚠ TEYİT EKRANIYLA AYNI GÖVDE (`beklenenHakedis`) — ikinci bir hesap
   * yazsaydım iki rapor aynı siparişe iki farklı "beklenen" verirdi.
   */
  const satislar = await prisma.sale.findMany({
    where: { iptalTarihi: null, settlementItems: { some: {} } },
    select: {
      code: true,
      net1Amount: true,
      fees: { select: { amount: true } },
      settlementItems: { select: { code: true, amount: true } },
    },
  });

  type Satir = {
    kod: string;
    beklenen: number;
    gerceklesen: number;
    fark: number;
    kodlar: string[];
    negatifKalem: number;
  };
  const eksikler: Satir[] = [];
  let olculebilen = 0;

  for (const s of satislar) {
    const maliyet = s.fees.reduce((t, f) => t + Number(f.amount.toString()), 0);
    const beklenen = beklenenHakedis(
      s.net1Amount === null ? null : Number(s.net1Amount.toString()),
      maliyet,
    );
    if (beklenen === null) continue;
    olculebilen++;
    const gerceklesen = s.settlementItems.reduce(
      (t, k) => t + Number(k.amount.toString()),
      0,
    );
    const fark = gerceklesen - beklenen;
    /** Eşik uydurulmadı: 1 kuruştan büyük EKSİK olan her satır. */
    if (fark >= -0.01) continue;
    eksikler.push({
      kod: s.code ?? "—",
      beklenen,
      gerceklesen,
      fark,
      kodlar: [...new Set(s.settlementItems.map((k) => k.code))].sort(),
      negatifKalem: s.settlementItems.filter(
        (k) => Number(k.amount.toString()) < 0,
      ).length,
    });
  }
  eksikler.sort((a, b) => a.fark - b.fark);

  console.log("\n" + "-".repeat(78));
  console.log("  2) EKSİK GÖRÜNEN SİPARİŞLER — ve KALEM KODLARI");
  console.log("-".repeat(78));
  console.log(`  ölçülebilen sipariş (beklenen hesaplanabildi): ${olculebilen}`);
  console.log(`  EKSİK görünen                                : ${eksikler.length}`);

  /**
   * ⛔ EN GÜÇLÜ CÜMLE BU SATIRDA — VE HÜKMÜ O KURUYOR.
   *
   * Eksik görünen / ölçülebilen oranı **%100**'e yakınsa, ortada 503 ayrı
   * eksik ödeme YOKTUR: hiçbir pazaryeri her siparişte eksik ödemez. Böyle
   * bir oran **tanım uyuşmazlığının** imzasıdır — bizim `beklenen`imiz ile
   * kanalın satır anlamı aynı şeyi ölçmüyordur.
   *
   * ⚠ VE BU RAPOR O TANIMI BULMUYOR. Ölçtüğü şey oranın kendisi; sebebi
   * ayrı bir iştir ve uydurulmaz.
   * _(Anayasa: "en güçlü cümle, en çok tartışmadan sağ çıkandır" — kapsam
   * ve hesap tartışmalarının hiçbiri %100'ü açıklamaz.)_
   */
  const oran = olculebilen === 0 ? 0 : (eksikler.length / olculebilen) * 100;
  console.log(`  ⭐ EKSİK ORANI                                 : %${oran.toFixed(1)}`);
  if (oran > 95) {
    console.log("");
    console.log("  ⛔ ORAN %95'İN ÜSTÜNDE — BU 'EKSİK ÖDEME' DEĞİLDİR.");
    console.log("     Hiçbir pazaryeri HER siparişte eksik ödemez. Bu oran");
    console.log("     TANIM UYUŞMAZLIĞININ imzasıdır: `beklenen` ile kanalın");
    console.log("     satır anlamı aynı şeyi ölçmüyor. Sebep AYRI bir iştir");
    console.log("     ve bu rapor onu UYDURMAZ.");
  }

  /**
   * ⭐ AYIRT EDİCİ AYRIM — bu ölçümün bütün amacı bu satır.
   * · Negatif kalem TAŞIYAN sipariş → toplam bir NETLEMEDİR; "eksik ödeme"
   *   açıklanmış olur ve soru kapanır.
   * · Yalnız pozitif kalem taşıyıp YİNE DE eksik olan → soru GERÇEKTİR.
   */
  const netlemeli = eksikler.filter((e) => e.negatifKalem > 0);
  const netlemesiz = eksikler.filter((e) => e.negatifKalem === 0);
  console.log(
    `\n  ⭐ negatif kalem TAŞIYAN (netleme — soru KAPANIR)  : ${netlemeli.length}` +
      `   toplam ${para(netlemeli.reduce((t, e) => t + e.fark, 0))}`,
  );
  console.log(
    `  ⚠ yalnız POZİTİF kalem, yine de eksik (soru AÇIK): ${netlemesiz.length}` +
      `   toplam ${para(netlemesiz.reduce((t, e) => t + e.fark, 0))}`,
  );

  const yaz = (baslik: string, liste: Satir[]) => {
    if (liste.length === 0) return;
    console.log("\n  " + baslik);
    console.log(
      "  " +
        doldur("sipariş", 15) +
        saga("beklenen", 12) +
        saga("gerçekleşen", 13) +
        saga("fark", 12) +
        "  kalem kodları",
    );
    for (const e of liste.slice(0, 12)) {
      console.log(
        "  " +
          doldur(e.kod, 15) +
          saga(para(e.beklenen), 12) +
          saga(para(e.gerceklesen), 13) +
          saga(para(e.fark), 12) +
          "  " +
          e.kodlar.join(" · "),
      );
    }
    if (liste.length > 12) console.log(`     … ve ${liste.length - 12} satır daha`);
  };
  /**
   * ⭐ AYIRT EDİCİ ÖLÇÜM — "SORU AÇIK" KÜMESİ GERÇEKTEN AÇIK MI?
   *
   * İlk bakışta bu satırlar "pazaryeri eksik ödedi" gibi okunuyor. Ama
   * farkın BEKLENENE ORANI hesaplanınca sayılar komisyon oranlarına
   * benziyor (%7,3 · %13,5 · %14 · %16 …). Eğer öyleyse eksik olan ödeme
   * değil, BİZİM HESABIMIZ: `beklenen` komisyonu düşmemiş demektir.
   *
   * ⛔ K66 BU DESENİ ZATEN KAYDETMİŞTİ: `commissionRate` boş yazılınca kâr
   * `RULE_MISSING` olur, komisyon HİÇ düşülmez ve NET olduğundan YÜKSEK
   * çıkar. O hâlde `beklenen` de yüksek çıkar ve pazaryeri "eksik ödemiş"
   * görünür — oysa doğru ödemiştir.
   *
   * ⚠ ORAN TEK BAŞINA KANIT DEĞİL: komisyona benzeyen bir oran başka bir
   * kesintiden de gelebilir. Bu yüzden kalemin `commissionRate`i AYRICA
   * okunuyor — iki okumanın FARKLI sonuç vereceği yer orası.
   */
  console.log("");
  console.log("-".repeat(78));
  console.log("  3) 'SORU AÇIK' KÜMESİ — FARK KOMİSYONA MI BENZİYOR?");
  console.log("-".repeat(78));
  const oranlar = netlemesiz
    .filter((e) => e.beklenen > 0)
    .map((e) => (-e.fark / e.beklenen) * 100)
    .sort((a, b) => a - b);
  if (oranlar.length > 0) {
    const yuzdelik = (q: number) =>
      oranlar[Math.min(oranlar.length - 1, Math.floor(oranlar.length * q))];
    console.log(
      `  fark/beklenen oranı  min %${oranlar[0].toFixed(1)}` +
        ` · p25 %${yuzdelik(0.25).toFixed(1)}` +
        ` · ortanca %${yuzdelik(0.5).toFixed(1)}` +
        ` · p75 %${yuzdelik(0.75).toFixed(1)}` +
        ` · max %${oranlar[oranlar.length - 1].toFixed(1)}`,
    );
    console.log(
      "  ⚠ Bu aralık TY komisyon oranlarının aralığıyla örtüşüyorsa,",
    );
    console.log(
      "    'eksik ödeme' değil BİZİM HESABIMIZ eksik demektir.",
    );
  }

  /** ⭐ KESİN AYRIM: bu satışların kalemlerinde komisyon oranı YAZILI MI? */
  const kodlarListesi = netlemesiz.map((e) => e.kod);
  const kalemler = await prisma.saleItem.findMany({
    where: { sale: { code: { in: kodlarListesi } } },
    select: { commissionRate: true, sale: { select: { profitStatus: true } } },
  });
  const oransiz = kalemler.filter((k) => k.commissionRate === null).length;
  const kuralEksik = kalemler.filter(
    (k) => k.sale.profitStatus === "RULE_MISSING",
  ).length;
  const yuzdeMetni =
    kalemler.length === 0
      ? "—"
      : ((oransiz / kalemler.length) * 100).toFixed(1);
  console.log("");
  console.log(`  ⭐ bu satışların kalemleri : ${kalemler.length}`);
  console.log(`     commissionRate BOŞ olan : ${oransiz} (%${yuzdeMetni})`);
  console.log(`     profitStatus RULE_MISSING: ${kuralEksik}`);
  if (oransiz > 0) {
    console.log("  ⛔ KOMİSYON ORANI BOŞ — 'eksik ödeme' teşhisi ÇÜRÜDÜ:");
    console.log("     beklenen, komisyonu düşmediği için yüksek çıkıyor.");
    console.log("     (K66 deseni — kayıtta duruyor.)");
  } else {
    console.log("  ✓ Komisyon oranı DOLU — fark komisyondan gelmiyor;");
    console.log("     soru AÇIK kalır ve başka bir sebep aranmalı.");
  }

  yaz("⚠ SORU AÇIK — yalnız pozitif kalem taşıyanlar:", netlemesiz);
  yaz("✓ NETLEME — negatif kalem taşıyanlar:", netlemeli);

  console.log("\n" + "-".repeat(78));
  console.log(
    "  ⛔ BU RAPOR HÜKÜM VERMEZ. 'Netleme' sütunu bir AÇIKLAMADIR, kanıt\n" +
      "     değil: negatif kalem taşıyan bir siparişte fark netlemeden\n" +
      "     gelmiş OLABİLİR — kesinleşmesi için kalemin ne olduğuna\n" +
      "     (iade mi, kesinti mi) tek tek bakılmalı.\n" +
      "  ⚠ 'Soru açık' kümesi de tek başına 'para eksik' demek DEĞİLDİR:\n" +
      "     beklenen tarafı bizim hesabımız ve o da yanılabilir.",
  );

  console.log("\n" + "=".repeat(78));
  console.log("  Salt okuma. Hiçbir şey yazılmadı.");
  console.log("=".repeat(78) + "\n");

  await prisma.$disconnect();
}

main().catch((e) => {
  /** Mesaj TAM taşınır — kısaltma teşhisi kısaltır. */
  console.error("HATA:", e instanceof Error ? e.stack : e);
  process.exitCode = 1;
});
