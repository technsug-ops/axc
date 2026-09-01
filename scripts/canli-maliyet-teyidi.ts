/**
 * ============================================================================
 *  MALİYET TEYİDİ — KULLANICI DOĞRULAMASINI DEFTERE YAZAR
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npx tsx scripts/canli-maliyet-teyidi.ts [--yaz]
 *
 *  BETIK SINIFI: TEK_SEFERLIK — 02.09.2026 maliyet doğrulama turunun izi;
 *  rutin koşmaz, kendi kapalı listesine kilitli.
 *
 *  ⛔ NİYE VAR: `canli-uydurma-maliyet.ts` yedi partiyi "kaynağı belgesiz"
 *  diye listeliyordu. Kullanıcı altısını tek tek doğruladı ve **altısı da
 *  sistemde yazan değerle BİREBİR aynı çıktı** — yani düzeltilecek bir şey
 *  yok. Ama teyit hiçbir yere yazılmazsa liste onları YARIN DA sorar;
 *  sönmeyen bir uyarı okunmaz olur ve listenin tamamına olan güveni götürür.
 *  _(Anayasa K6: her "şüpheli"nin bir DOĞRULANDI yolu olmak zorundadır.)_
 *
 *  ── ⛔ TEYİT KAYDIN HÂLİNE BAĞLANIR, KALICI MUAFİYET DEĞİL ──────────────
 *  Damga, partinin O GÜNKÜ `unitCostAmount` değerini taşır. Maliyet
 *  sonradan değişirse damga **düşer** ve satır listeye geri gelir.
 *  Karşılaştırma **kuruşuna** — tolerans, "ne kadar değişirse yeniden
 *  sorulur" diye ikinci bir uydurma eşik açardı.
 *
 *  ── ⚠ MEVCUT `VERI_DOGRULANDI` MEKANİZMASI KULLANILMADI — BİLEREK ───────
 *  `src/lib/uyari/veri-dogrulama.ts` var ve aynı deseni taşıyor, ama kapsamı
 *  AÇIKÇA dar: _"yalnız `veriSupheli` doğrulanabilir"_ ve hedefi SATIŞ
 *  kaydı. Buradaki hedef bir STOK HAREKETİ (parti). O mekanizmayı buraya
 *  genişletmek, dar tutulmasının gerekçesini çiğnerdi.
 *  _(Anayasa: "ilke, kendi kapsamının dışına uygulanırsa hatayı korur".)_
 *  Bu yüzden aynı desen, AYRI bir eylem adıyla yazılıyor.
 *
 *  ── ⚠ İZİN DOĞUM TARİHİ ────────────────────────────────────────────────
 *  `MALIYET_TEYIDI` izi **02.09.2026**'da açıldı. Bu tarihten öncesi için
 *  "teyit yok" bir HÜKÜM DEĞİLDİR — mekanizma yoktu.
 * ============================================================================
 */

import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";
import { canliYapilandirma } from "./canli-ortak";

/** `AuditLog.action` — iz 02.09.2026'da açıldı. */
export const TEYIT_EYLEMI = "MALIYET_TEYIDI";
export const IZ_DOGUM_TARIHI = "02.09.2026";

/**
 * Kullanıcının 02.09.2026'da barkodla verdiği liste.
 *
 * ⛔ ANAHTAR BARKOD, AD DEĞİL — kullanıcı listeyi barkodla verdi ve
 * eşleştirme kimlikle yapılır. _(Anayasa: "kimlik varken dizeyle aranmaz".)_
 */
const TEYIT_LISTESI: ReadonlyArray<{ barkod: string; kurus: number }> = [
  { barkod: "3168430275010", kurus: 75990 }, // DeliBake kek kalıbı
  { barkod: "6939236348423", kurus: 179200 }, // Stanley shot bardak seti
  { barkod: "9723484564032", kurus: 79600 }, // Korbell bebek bezi çöp kovası
  { barkod: "8697975600803", kurus: 236150 }, // Tefal Easyblend
  { barkod: "8683650330486", kurus: 127500 }, // Refika Swiss Crystal
  { barkod: "8683650003847", kurus: 42748 }, // Cake Pro döküm kek kalıbı
  { barkod: "8699131860571", kurus: 119900 }, // Schafer Black Stone 3'lü tava seti
];

/**
 * Kullanıcının kendi cümlesi — teyit gerekçesi izde YAŞAR. Sebepsiz teyit,
 * üç ay sonra "bunu neden geçmiştik" sorusuna cevap bırakmaz.
 */
const GEREKCE =
  "Kullanici 02.09.2026'da barkod listesiyle teyit etti; degerler sistemdekiyle birebir tuttu. "
  + "Yedinci satir (Schafer tava seti) ayni gun ikinci turda geldi.";

/** Stanley icin kullanicinin ek aciklamasi — hipotezimi curuttu, kayda gecer. */
const STANLEY_NOTU =
  "Kullanici: '1792 bu 2025'deki satisla alakali; agustosta olan satislarin " +
  "maliyetleri bu degil.' Yani Tem 2025 alimi 1792, Agu 2026 alimi 1069,49 — " +
  "iki AYRI alim, iki ayri fiyat. 'Fiyat yukselir, dusmez' varsayimim yanlisti.";

function kurusaCevir(d: unknown): number | null {
  if (d === null || d === undefined) return null;
  return Math.round(Number(String(d)) * 100);
}

async function main() {
  const yazmaKipi = process.argv.includes("--yaz");
  const c = canliYapilandirma();
  if (!c.tamam) {
    console.log("Canlı yapılandırma okunamadı:", c.hata);
    process.exitCode = 1;
    return;
  }
  const prisma = new PrismaClient({ adapter: new PrismaMariaDb(c.veri.ham) });

  console.log("=".repeat(74));
  console.log(`  MALİYET TEYİDİ — ${yazmaKipi ? "YAZMA" : "PROVA (salt okuma)"}`);
  console.log("=".repeat(74));

  let uyan = 0;
  let sapan = 0;
  let bulunamayan = 0;
  let atlanan = 0;
  const yazilacak: { partiId: string; barkod: string; kurus: number }[] = [];

  for (const t of TEYIT_LISTESI) {
    const parti = await prisma.stockMovement.findFirst({
      where: {
        quantityDelta: { gt: 0 },
        variant: { barcode: t.barkod },
        OR: [
          { note: { contains: "eksik-alim-20260829" } },
          { note: { contains: "sayim-fiziksel-20260829" } },
        ],
      },
      select: {
        id: true,
        unitCostAmount: true,
        variant: { select: { companySku: true, product: { select: { name: true } } } },
      },
    });

    if (parti === null) {
      bulunamayan++;
      console.log(`  ⛔ BULUNAMADI  ${t.barkod} — parti yok, teyit YAZILMAZ`);
      continue;
    }

    const sistem = kurusaCevir(parti.unitCostAmount);
    const ad = (parti.variant.product.name ?? "").slice(0, 34);
    const sku = parti.variant.companySku ?? "—";

    /**
     * ⛔ KURUŞUNA EŞİTLİK. Tutmuyorsa teyit YAZILMAZ: kullanıcı başka bir
     * rakam söylemiş demektir ve o bir DÜZELTME işidir, teyit değil.
     */
    if (sistem !== t.kurus) {
      sapan++;
      console.log(
        `  ⚠ SAPMA      ${sku.padEnd(16)} sistem ${(sistem ?? 0) / 100} ≠ ` +
          `beyan ${t.kurus / 100}  → DÜZELTME gerekir, teyit değil  · ${ad}`,
      );
      continue;
    }

    uyan++;

    /**
     * ⛔ TEKRAR KOŞULABİLİR: aynı damgayı taşıyan iz zaten varsa YENİSİ
     * YAZILMAZ. Anayasa "eski iz silinmez, yenisi yazılır" diyor — ama o
     * kural DEĞİŞEN bir hüküm içindir; birebir aynı damgayı ikinci kez
     * yazmak defterde gürültüden başka bir şey üretmez.
     * _(Anayasa: "satır satır tekrar-koşulabilir · ikinci koşum zararsız".)_
     */
    const mevcut = await prisma.auditLog.findFirst({
      where: { action: TEYIT_EYLEMI, targetId: parti.id },
      select: { detail: true },
      orderBy: { createdAt: "desc" },
    });
    let ayniDamga = false;
    try {
      const d = JSON.parse(mevcut?.detail ?? "{}") as { damgaKurus?: number };
      ayniDamga = d.damgaKurus === t.kurus;
    } catch {
      /** Çözülemeyen iz teyit SAYILMAZ — yenisi yazılır. */
    }
    if (ayniDamga) {
      atlanan++;
      console.log(
        `  · zaten teyitli ${sku.padEnd(16)} ${(t.kurus / 100).toFixed(2).padStart(10)}  · ${ad}`,
      );
      continue;
    }

    yazilacak.push({ partiId: parti.id, barkod: t.barkod, kurus: t.kurus });
    console.log(
      `  ✓ TEYİT      ${sku.padEnd(16)} ${(t.kurus / 100).toFixed(2).padStart(10)}  · ${ad}`,
    );
  }

  console.log("");
  console.log(`  incelenen: ${TEYIT_LISTESI.length}`);
  console.log(`  birebir tutan (teyit edilebilir): ${uyan}`);
  console.log(`  sapan (düzeltme işi): ${sapan}`);
  console.log(`  partisi bulunamayan: ${bulunamayan}`);
  console.log(`  zaten teyitli (yeniden yazılmadı): ${atlanan}`);
  console.log(`  yazılacak yeni iz: ${yazilacak.length}`);

  if (!yazmaKipi) {
    console.log("\n  PROVA — hiçbir şey yazılmadı. Yazmak için: --yaz");
    await prisma.$disconnect();
    return;
  }

  /**
   * ⛔ TEK `createMany` — satır satır gidiş-dönüş, zaman aşımı tavanına
   * dayanan bir yazımdır. _(Anayasa: toplu yazım üç şartla koşar.)_
   * İzler bağımsız satırlar olduğu için ikinci koşum zararsız: eski iz
   * SİLİNMEZ, yenisi yazılır ve en yenisi okunur.
   */
  if (yazilacak.length === 0) {
    console.log("\n  Yazılacak yeni iz yok — hepsi zaten teyitli.");
    await prisma.$disconnect();
    return;
  }
  const now = new Date().toISOString();
  await prisma.auditLog.createMany({
    data: yazilacak.map((y) => ({
      action: TEYIT_EYLEMI,
      userId: null,
      targetType: "StockMovement",
      targetId: y.partiId,
      detail: JSON.stringify({
        barkod: y.barkod,
        damgaKurus: y.kurus,
        gerekce: GEREKCE,
        ...(y.barkod === "6939236348423" ? { ek: STANLEY_NOTU } : {}),
        yazildi: now,
      }),
    })),
  });

  console.log(`\n  ✓ ${yazilacak.length} teyit izi yazıldı (${TEYIT_EYLEMI}).`);
  console.log(
    "  ⚠ Damga o günkü maliyete bağlı: maliyet değişirse teyit DÜŞER ve",
  );
  console.log("     satır listeye geri gelir.");
  await prisma.$disconnect();
}

main();
