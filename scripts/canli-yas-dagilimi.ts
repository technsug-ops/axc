/**
 * ============================================================================
 *  RAF YAŞI DAĞILIMI — SALT OKUMA
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run canli:yas-dagilimi
 *
 *  BETIK SINIFI: TEK_SEFERLIK — K131'in kova sınırlarını ölçmek için. Rutin
 *  koşmaz, HİÇBİR ŞEY YAZMAZ; yazma bayrağı yoktur.
 *
 *  ── NİYE ÖLÇÜLÜYOR ──────────────────────────────────────────────────────
 *  Kullanıcı 7 kova istedi (`0-15 · 16-30 · 31-45 · 46-60 · 61-90 · 91-180 ·
 *  181+`). Kovalar KULLANICININ operasyonel aralıkları, uydurma değil — ama
 *  bir kovanın canlıda **hep boş** kalacağını bilerek yazmak ile sonradan
 *  keşfetmek farklı şeylerdir. Boş kova zararsız değildir: süzgeç listesinde
 *  yer kaplar ve tıklayan kişi "sistem bozuk mu" diye sorar.
 *
 *  ⚠ VE KOVA/BANT ÖRTÜŞMESİ ÖLÇÜLÜYOR. Kullanıcı 02.09.2026'da sınırların
 *  bir fazladan başlaması gerektiğini sordu ve ÖLÇÜM HAKLI ÇIKARDI: yarı
 *  açık sınırlarda İKİ kova rozet bandını KESİYORDU. Kapalı aralıkta kova
 *  bandın İÇİNE tam oturuyor ve betik bunu HER KOŞUMDA doğruluyor.
 * ============================================================================
 */

import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";
import { kdvOraniniCoz } from "../src/lib/kdv";
import { acikPartilerToplu } from "../src/lib/stok";
import {
  YAS_BANTLARI,
  YAS_KOVALARI,
  yaslanmaListesi,
  type YaslanmaGirdisi,
} from "../src/lib/yaslanma";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ⛔ KOVALAR ARTIK GÖVDEDEN OKUNUYOR — burada İKİNCİ BİR LİSTE TUTULMUYOR.
 * İlk yazımda sınırlar bu betikte elle yazılıydı ve `yaslanma.ts`teki
 * gövdeyle ayrışabilirdi: ölçüm bir sınır, ekran başka bir sınır kullanır
 * ve rapor "doğrulanmış" görünürdü. _(Anayasa: "iki yerde iki ölçüt olmaz".)_
 */
const KOVALAR = YAS_KOVALARI;

function para(x: number): string {
  return x.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
function doldur(m: string, n: number): string {
  return m.length >= n ? m : m + " ".repeat(n - m.length);
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

  console.log("=".repeat(74));
  console.log("  RAF YAŞI DAĞILIMI — salt okuma");
  console.log("=".repeat(74));

  const varyantlar = await prisma.productVariant.findMany({
    where: { isActive: true },
    select: {
      id: true,
      sku: true,
      product: {
        select: {
          name: true,
          vatRateOverride: true,
          category: { select: { name: true, vatRate: true } },
        },
      },
    },
  });

  const partiHaritasi = await acikPartilerToplu(
    prisma,
    varyantlar.map((v) => v.id),
  );
  const girdiler: YaslanmaGirdisi[] = varyantlar.map((v) => ({
    variantId: v.id,
    partiler: partiHaritasi.get(v.id) ?? [],
    kdvOrani: kdvOraniniCoz(v.product).oran,
  }));

  const bugun = new Date();
  bugun.setUTCHours(0, 0, 0, 0);
  const satirlar = yaslanmaListesi(girdiler, bugun, "yas");

  console.log(`\n  aktif varyant            : ${varyantlar.length}`);
  console.log(`  RAFTA STOĞU OLAN         : ${satirlar.length}`);
  console.log(
    "  ⚠ Stoğu olmayan varyant listeye HİÇ girmiyor (gövdenin kuralı);" +
      "\n    kovalar bu yüzden aktif varyant sayısına değil, RAFTAKİNE bölünür.",
  );

  if (satirlar.length === 0) {
    console.log("\n  ⛔ RAFTA HİÇ STOK YOK — kova ölçümü yapılamadı.");
    console.log("     Bu 'kovalar boş' DEMEK DEĞİL: ölçülemedi.");
    await prisma.$disconnect();
    return;
  }

  // ── YÜZDELİKLER ─────────────────────────────────────────────────────────
  const yaslar = satirlar.map((s) => s.yasGun).sort((a, b) => a - b);
  const yuzdelik = (p: number) =>
    yaslar[Math.min(yaslar.length - 1, Math.floor(yaslar.length * p))];
  console.log("\n" + "-".repeat(74));
  console.log("  DAĞILIM (gün)");
  console.log("-".repeat(74));
  console.log(
    `  min ${yaslar[0]} · p25 ${yuzdelik(0.25)} · ortanca ${yuzdelik(0.5)}` +
      ` · p75 ${yuzdelik(0.75)} · p90 ${yuzdelik(0.9)} · max ${yaslar[yaslar.length - 1]}`,
  );

  // ── KOVALAR ─────────────────────────────────────────────────────────────
  console.log("\n" + "-".repeat(74));
  console.log("  KULLANICININ 7 KOVASI — KAPALI aralık [alt, üst], üst DAHİL");
  console.log("-".repeat(74));
  let toplamKalem = 0;
  let bosKova = 0;
  for (const k of KOVALAR) {
    /** ⚠ KAPALI aralık — üst sınır DAHİL (kullanıcı düzeltmesi 02.09.2026). */
    const icinde = satirlar.filter(
      (s) => s.yasGun >= k.alt && (k.ust === null || s.yasGun <= k.ust),
    );
    toplamKalem += icinde.length;
    if (icinde.length === 0) bosKova++;
    /** ⚠ Sermayesi bilinmeyen SIFIR sayılmaz — ayrı sayılıyor. */
    const sermayeli = icinde.filter(
      (s) => s.sermayeKdvHaric !== null && s.sermayeParaBirimi === "TRY",
    );
    const sermaye = sermayeli.reduce((x, s) => x + (s.sermayeKdvHaric ?? 0), 0);
    const bilinmeyen = icinde.length - sermayeli.length;
    console.log(
      `  ${doldur(k.kod, 18)} ${saga(String(icinde.length), 5)} kalem` +
        `   ₺${saga(para(sermaye), 14)}` +
        (bilinmeyen > 0 ? `   (maliyeti bilinmeyen ${bilinmeyen})` : "") +
        (icinde.length === 0 ? "   ⚠ BOŞ" : ""),
    );
  }
  console.log("-".repeat(74));
  console.log(
    `  toplam ${toplamKalem} kalem · boş kova: ${bosKova}/${KOVALAR.length}`,
  );
  /** ⛔ Kapsama kanıtı: kovalar kümenin TAMAMINI örtmeli, yoksa satır kaybolur. */
  console.log(
    toplamKalem === satirlar.length
      ? "  ✓ KAPSAMA TAM — hiçbir kalem kovaların dışında kalmıyor"
      : `  ⛔ KAPSAMA EKSİK — ${satirlar.length - toplamKalem} kalem hiçbir kovaya girmedi`,
  );

  // ── ROZET BANTLARI — kovalar bunların İÇİNE oturuyor, kesmiyor ────────
  console.log("\n" + "-".repeat(74));
  console.log("  MEVCUT ROZET BANTLARI (14.08.2026 mimar kararı — DOKUNULMUYOR)");
  console.log("-".repeat(74));
  const notr = satirlar.filter((s) => s.bant === "NOTR").length;
  const amber = satirlar.filter((s) => s.bant === "AMBER").length;
  const kirmizi = satirlar.filter((s) => s.bant === "KIRMIZI").length;
  console.log(`  NÖTR    (< ${YAS_BANTLARI.amberGun} gün)   : ${notr}`);
  console.log(`  AMBER   (${YAS_BANTLARI.amberGun}–${YAS_BANTLARI.kirmiziGun - 1})     : ${amber}`);
  console.log(`  KIRMIZI (${YAS_BANTLARI.kirmiziGun}+ gün)   : ${kirmizi}`);
  /**
   * ⭐ ÖRTÜŞME KANITI — kullanıcı düzeltmesi 02.09.2026.
   * Kovalar bantların İÇİNE tam oturuyor. Eskiden sınırlar yarı açıktı ve
   * İKİ kova bandı KESİYORDU (`30-45` = NÖTR+AMBER, `60-90` = AMBER+KIRMIZI):
   * tek bir kovada iki farklı renkte satır çıkıyordu.
   *
   * ⚠ ÖLÇÜT SAYILARA DEĞİL, KÜMEYE BAĞLI: bant sayısı ile kovaların toplamı
   * karşılaştırılıyor. Sınırlar elle karşılaştırılsaydı gövde değişince
   * ölçüt yine yeşil kalırdı.
   */
  const kovaToplami = (kodlar: readonly string[]) =>
    satirlar.filter((s) => {
      const k = KOVALAR.find(
        (x) => s.yasGun >= x.alt && (x.ust === null || s.yasGun <= x.ust),
      );
      return k !== undefined && kodlar.includes(k.kod);
    }).length;
  const esler = [
    ["NÖTR", notr, ["0-15", "16-30"]],
    ["AMBER", amber, ["31-45", "46-60"]],
    ["KIRMIZI", kirmizi, ["61-90", "91-180", "181+"]],
  ] as const;
  console.log("\n  ⭐ KOVA/BANT ÖRTÜŞMESİ — kova bandı KESMEZ:");
  let tuttu = 0;
  for (const [ad, bantSayisi, kodlar] of esler) {
    const kovaSayisi = kovaToplami(kodlar);
    const ayni = bantSayisi === kovaSayisi;
    if (ayni) tuttu++;
    console.log(
      `     ${doldur(ad, 8)} bant ${saga(String(bantSayisi), 4)}` +
        ` = ${doldur(kodlar.join(" + "), 24)} ${saga(String(kovaSayisi), 4)}` +
        (ayni ? "   ✓" : "   ⛔ AYRIŞIYOR"),
    );
  }
  console.log(
    tuttu === esler.length
      ? "     ✓ ÜÇÜ DE TUTUYOR — hiçbir kova iki bandı birden içermiyor"
      : "     ⛔ ÖRTÜŞME BOZUK — bir kova bandı kesiyor",
  );
  /** Panelin ölü sermaye rozeti bu koda gidiyor — kırılmamalı. */
  console.log(
    `\n  ⛔ PANEL BAĞLANTISI: /stok?yas=kirmizi → ${kirmizi} kalem.` +
      "\n     Kovalar bu kodun YERİNE geçerse bu bağlantı sessizce kırılır.",
  );

  console.log("\n" + "=".repeat(74));
  console.log("  Salt okuma. Hiçbir şey yazılmadı.");
  console.log("=".repeat(74) + "\n");

  await prisma.$disconnect();
}

main().catch((e) => {
  /** Mesaj TAM taşınır — kısaltma teşhisi kısaltır. */
  console.error("HATA:", e instanceof Error ? e.stack : e);
  process.exitCode = 1;
});
