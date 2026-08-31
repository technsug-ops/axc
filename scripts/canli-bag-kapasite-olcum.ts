import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";
import { bagOnarimPlani } from "../src/lib/bag-onarim";

/**
 * ============================================================================
 *  K91c — KAPASİTE YÖN ÖLÇÜMÜ (SALT OKUMA, KOD KARARI SONRA)
 * ----------------------------------------------------------------------------
 *      npx tsx scripts/canli-bag-kapasite-olcum.ts
 *
 *  BETIK SINIFI: TEK_SEFERLIK — bir kısıtın YÖNÜNÜ ölçer; hiçbir şey yazmaz.
 *
 *  ⛔ NİYE: 31.08 yazımı ileri-yiyen bağı hedefe indirdi (802 → 739) ama
 *  **kalanı NEGATİF parti 1 → 32** yaptı ve geri alındı. Sebep: plan her
 *  çıkış için tek aday buluyor, ama **birden çok çıkış aynı partiyi
 *  gösterebiliyor** ve toplamları o partinin adedini aşıyor.
 *
 *  ⛔ VE KISIT YAZILMADAN ÖNCE YÖNÜ ÖLÇÜLÜR. Anayasa: "bir sınırın yönü
 *  ölçülmeden çevrilmez" — 29.08'de `soldAt` sınırı defterin %48,72'sini
 *  kilitleyecekti. Buradaki soru: kapasite kısıtı kaç satırı kurtarır, kaç
 *  satırı dışarıda bırakır?
 *
 *  ── ⚠ DOĞRULAMA ŞARTI: 32 SAYISI BU ÖLÇÜMDEN BİREBİR ÇIKMALI ─────────
 *  Çıkmıyorsa ölçüm yazımın GÖRDÜĞÜNÜ görmüyor demektir ve rapor
 *  yayımlanmaz. _(Anayasa: ölçüm ile yazım aynı ölçüte bakmalı.)_
 * ============================================================================
 */

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");

  console.log("\nK91c — KAPASİTE YÖN ÖLÇÜMÜ");
  console.log("  hedef  " + y.veri.adres.hostname);
  console.log("  kip    SALT OKUMA — hiçbir şey yazılmaz");
  console.log("  an     " + new Date().toISOString());
  console.log("=".repeat(72));

  const ham = await prisma.stockMovement.findMany({
    select: {
      id: true,
      variantId: true,
      occurredAt: true,
      createdAt: true,
      quantityDelta: true,
      unitCostAmount: true,
      sourceMovementId: true,
    },
  });
  const hareketler = ham.map((h) => ({
    ...h,
    unitCostAmount:
      h.unitCostAmount === null ? null : h.unitCostAmount.toString(),
  }));

  /* ═══ ⓪ TABAN ══════════════════════════════════════════════════════ */
  const partiAdedi = new Map<string, number>();
  const partiTarihi = new Map<string, Date>();
  for (const h of hareketler) {
    if (h.quantityDelta > 0) {
      partiAdedi.set(h.id, h.quantityDelta);
      partiTarihi.set(h.id, h.occurredAt);
    }
  }
  /** Her partinin BUGÜNKÜ tüketimi (zaman sırası gözetmeden — yazım ölçüsü). */
  const tuketim = new Map<string, number>();
  let ileriYiyen = 0;
  for (const h of hareketler) {
    if (h.quantityDelta >= 0 || h.sourceMovementId === null) continue;
    tuketim.set(
      h.sourceMovementId,
      (tuketim.get(h.sourceMovementId) ?? 0) + -h.quantityDelta,
    );
    const p = partiTarihi.get(h.sourceMovementId);
    if (p !== undefined && p > h.occurredAt) ileriYiyen += 1;
  }
  const negatifOnce = [...partiAdedi].filter(
    ([id, adet]) => adet - (tuketim.get(id) ?? 0) < 0,
  ).length;

  const plan = bagOnarimPlani(hareketler);

  console.log("\n⓪ TABAN (bugünkü defter)\n");
  console.log("   toplam hareket              " + hareketler.length);
  console.log("   ileri partiye bağlı çıkış   " + ileriYiyen);
  console.log("   düzeltilebilir aday         " + plan.yazilacak.length);
  console.log("   kalanı NEGATİF parti        " + negatifOnce);

  /* ═══ ① KAPASİTE SINIFLAMASI ══════════════════════════════════════ */
  /**
   * ⭐ ÖLÇÜ YAZIMIN ÖLÇÜSÜYLE AYNI: yazımdan SONRA her partinin tüketimi
   * ne olurdu. Giden çıkış eski partiden düşer, yeni partiye eklenir.
   */
  const sonrakiTuketim = new Map(tuketim);
  const adet = new Map<string, number>();
  for (const h of hareketler) if (h.quantityDelta < 0) adet.set(h.id, -h.quantityDelta);

  /** Hangi çıkışlar hangi hedefe gidiyor. */
  const hedefeGelenler = new Map<string, { cikis: string; adet: number; tarih: Date }[]>();
  const tarihi = new Map<string, Date>();
  for (const h of hareketler) tarihi.set(h.id, h.occurredAt);

  for (const s of plan.yazilacak) {
    const a = adet.get(s.cikis) ?? 0;
    sonrakiTuketim.set(s.eski, (sonrakiTuketim.get(s.eski) ?? 0) - a);
    sonrakiTuketim.set(s.yeni, (sonrakiTuketim.get(s.yeni) ?? 0) + a);
    const l = hedefeGelenler.get(s.yeni) ?? [];
    l.push({ cikis: s.cikis, adet: a, tarih: tarihi.get(s.cikis) ?? new Date(0) });
    hedefeGelenler.set(s.yeni, l);
  }

  const negatifSonra = [...partiAdedi].filter(
    ([id, kap]) => kap - (sonrakiTuketim.get(id) ?? 0) < 0,
  );

  console.log("\n① YAZIM SİMÜLASYONU — kapasite ölçüsüyle\n");
  console.log("   yazılsaydı kalanı NEGATİF parti   " + negatifSonra.length);
  console.log("   (31.08 yazımı 32 ölçmüştü)");
  const dogrulama = negatifSonra.length === 32;
  console.log(
    "   ÖLÇÜM YAZIMIN GÖRDÜĞÜNÜ GÖRÜYOR MU: " +
      (dogrulama ? "EVET (32 = 32)" : "⛔ HAYIR — rapor YAYIMLANMAZ"),
  );

  /* ═══ SATIR SINIFLAMASI: a1 / a2 ══════════════════════════════════ */
  const asanPartiler = new Set(negatifSonra.map(([id]) => id));
  const a1: typeof plan.yazilacak = [];
  const a2: typeof plan.yazilacak = [];
  for (const s of plan.yazilacak) {
    if (asanPartiler.has(s.yeni)) a2.push(s);
    else a1.push(s);
  }

  let asimToplam = 0;
  for (const [id, kap] of negatifSonra) {
    asimToplam += (sonrakiTuketim.get(id) ?? 0) - kap;
  }

  console.log("\n   SATIR SINIFLAMASI\n");
  console.log("   a1) kapasite YETER — güvenle yazılabilir   " + a1.length + " satır");
  console.log("   a2) kapasite AŞILIYOR — yarışan            " + a2.length + " satır");
  console.log("       aşan parti sayısı                      " + negatifSonra.length);
  console.log("       toplam aşım                            " + asimToplam + " adet");

  /* ═══ ② YARIŞANLARDA SEÇİM DETERMİNİSTİK Mİ ══════════════════════ */
  /**
   * ⛔ ZORLAMA SIRALAMA UYDURULMAZ. Soru şu: aynı partiye yarışan çıkışlar
   * arasında **iş tarihi** doğal bir sıra veriyor mu, yoksa berabere mi
   * kalıyorlar? Berabere kalan satırlar DOKUNULMAZ sınıfına düşer.
   */
  let deterministik = 0;
  let belirsiz = 0;
  const belirsizOrnek: string[] = [];
  for (const [id] of negatifSonra) {
    const gelenler = hedefeGelenler.get(id) ?? [];
    if (gelenler.length <= 1) continue;
    const gunler = gelenler.map((g) => g.tarih.toISOString().slice(0, 10));
    const tekil = new Set(gunler);
    if (tekil.size === gelenler.length) {
      deterministik += 1;
    } else {
      belirsiz += 1;
      if (belirsizOrnek.length < 5) {
        belirsizOrnek.push(
          `parti ${id.slice(0, 10)} · ${gelenler.length} yarışan · günler ${[...tekil].join(",")}`,
        );
      }
    }
  }

  console.log("\n② YARIŞANLARDA SEÇİM DETERMİNİSTİK Mİ (iş tarihi)\n");
  console.log("   birden çok yarışanı olan aşan parti   " + (deterministik + belirsiz));
  console.log("     iş tarihi AYIRT EDİYOR (deterministik) " + deterministik);
  console.log("     iş tarihi AYIRT ETMİYOR (belirsiz)     " + belirsiz);
  for (const o of belirsizOrnek) console.log("       " + o);

  /* ═══ ③ İNCE SINIFLAMA — İŞ TARİHİ SIRASIYLA KAÇI SIĞAR ═════════ */
  /**
   * ⛔ ①'DEKİ SINIFLAMA KABA: bir partiyi hedefleyen BÜTÜN satırları a2'ye
   * atıyor, oysa bir kısmı kapasiteye SIĞABİLİR. Asıl karar sayısı bu.
   *
   * ⭐ SIRA UYDURULMUYOR, İŞ TARİHİNDEN GELİYOR: yarışanlar iş tarihine göre
   * sıralanır ve kapasite bitene kadar KABUL EDİLİR. Bu FIFO'nun kendi
   * kuralıdır — dışarıdan bir tercih değil.
   *
   * ⛔ BERABERE KALAN DOKUNULMAZ: aynı iş tarihinde yarışan iki çıkış
   * arasında sıra YOKTUR; birini seçmek uydurma olur. O satırlar ve
   * SONRASINDAKİLER (sıra belirsizleştiği için) dokunulmaz sayılır.
   */
  let sigan = 0;
  let sigmayan = 0;
  let beraberedenDusen = 0;
  for (const [pid, kapasite] of partiAdedi) {
    const gelenler = hedefeGelenler.get(pid) ?? [];
    if (gelenler.length === 0) continue;
    /** Yeni gelenler DIŞINDAKİ mevcut tüketim — kapasitenin kalanı budur. */
    const gelenToplam = gelenler.reduce((t, g) => t + g.adet, 0);
    let kalanKapasite = kapasite - ((sonrakiTuketim.get(pid) ?? 0) - gelenToplam);
    const sirali = [...gelenler].sort((a, b) => +a.tarih - +b.tarih);
    let beraberlikVar = false;
    for (let i = 0; i < sirali.length; i++) {
      const g = sirali[i]!;
      /** Aynı iş tarihinden ikinci bir yarışan → sıra belirsiz, DUR. */
      const oncekiAyni = i > 0 && +sirali[i - 1]!.tarih === +g.tarih;
      if (oncekiAyni) beraberlikVar = true;
      if (beraberlikVar) {
        sigmayan += 1;
        beraberedenDusen += 1;
        continue;
      }
      if (g.adet <= kalanKapasite) {
        sigan += 1;
        kalanKapasite -= g.adet;
      } else {
        sigmayan += 1;
      }
    }
  }

  console.log("");
  console.log("③ İNCE SINIFLAMA — iş tarihi sırasıyla kapasiteye kaçı sığar");
  console.log("");
  console.log("   SIĞAN (deterministik, güvenle yazılabilir)  " + sigan + " satır");
  console.log("   sığmayan                                    " + sigmayan + " satır");
  console.log("     bunlardan BERABERLİK yüzünden düşen       " + beraberedenDusen);
  console.log("   ⚠ Beraberlikte sıra YOKTUR; birini seçmek uydurma olurdu.");

  /* ═══ HÜKÜM ══════════════════════════════════════════════════════ */
  console.log("\n" + "-".repeat(72));
  if (!dogrulama) {
    console.log("   ⛔ ÖLÇÜM YAZIMIN GÖRDÜĞÜNÜ GÖRMÜYOR — bu rapor kullanılamaz.");
    process.exitCode = 1;
  } else {
    console.log(
      `   KABA sınıflama : ${a1.length} yazılabilir · ${a2.length} dokunulmaz`,
    );
    console.log(
      `   İNCE sınıflama : ${sigan} yazılabilir · ${sigmayan} dokunulmaz`,
    );
    console.log(`   İleri-yiyen beklenen düşüş: ${ileriYiyen} → ${ileriYiyen - sigan}`);
    console.log("   ⛔ KOD YAZILMADI — karar kullanıcıda.");
  }

  await prisma.$disconnect();
}

void main();
