import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";
import { bagOnarimPlani, type OnarimSatiri } from "../src/lib/bag-onarim";

/**
 * ============================================================================
 *  K91 — PARTİ BAĞI ONARIMI · YAZIM (mimar onayı 31.08.2026)
 * ----------------------------------------------------------------------------
 *      npx tsx scripts/canli-bag-onarim-yaz.ts          → KURU (yazmaz)
 *      npx tsx scripts/canli-bag-onarim-yaz.ts --yaz    → YAZAR
 *
 *  BETIK SINIFI: TEK_SEFERLIK — belirli bir onarımı bir kez uygular.
 *
 *  ── ⛔ VARSAYILAN KURU ─────────────────────────────────────────────────
 *  Bayraksız koşum HİÇBİR ŞEY YAZMAZ. Yazma varsayılan olsaydı, bu dosyayı
 *  merak edip çalıştıran biri canlı defteri değiştirirdi.
 *
 *  ── ⛔ ÖLÇÜT KURU KOŞUMLA AYNI GÖVDEDEN ───────────────────────────────
 *  `bagOnarimPlani` hem kuru koşumun hem yazımın ölçütü. İki yerde iki ölçüt
 *  olsaydı biri ötekinin yazdığını göremezdi. Doğrulandı (31.08.2026): saf
 *  gövde kuru koşumun ALTI sayısını da birebir üretiyor
 *  (64 · 3861 · 1487 · 664 · 6 · 0).
 *
 *  ── ⛔ GERİ ALMA LİSTEYE DEĞİL ÖLÇÜTE BAĞLI ───────────────────────────
 *  Anayasa: "geri alma kümesi yeniden hesaplanabilir bir ÖLÇÜTTEN kurulur."
 *  Geri alınacak küme `AuditLog`ta `BAG_ONARILDI` damgası taşıyan ve
 *  `detail`inde eski/yeni bağı bulunan satırlardan **satır satır** üretilir;
 *  hiçbir yerde tek parça bir liste tutulmaz (65.511 karakterde kırpılan
 *  JSON vakası tam buydu).
 *
 *  ── ⛔ ÖNCEKİ DEĞER SATIR BAZINDA SAKLANIR ────────────────────────────
 *  Her satır için ayrı `AuditLog`: eski bağ, yeni bağ, damga, varyant.
 *  Toplam saklamak, sonradan doğan bir farkın KAYNAĞINI aramaya izin vermez.
 *
 *  ── ⚠ DEĞİŞMEZLİK TURU YAZIMDAN SONRA KOŞAR VE SONUÇ KARŞILAŞTIRILIR ──
 *  Para ve adet DEĞİŞMEMELİ; değişen tek şey hangi partinin tüketildiği.
 * ============================================================================
 */

const YAZ = process.argv.includes("--yaz");

type Olcum = {
  hareket: number;
  negatif: number;
  satis: number;
  net2: string;
  /** Varyant → ledger stoğu. */
  stok: Map<string, number>;
  /** İleri partiye bağlı çıkış sayısı — onarımın ASIL hedefi. */
  ileriYiyen: number;
  /** Kalanı NEGATİF çıkan parti sayısı — 0 olmalı. */
  negatifKalan: number;
};

type Istemci = (typeof import("../src/lib/prisma"))["prisma"];

async function olc(prisma: Istemci): Promise<Olcum> {
  const hareketler = await prisma.stockMovement.findMany({
    select: {
      id: true,
      variantId: true,
      occurredAt: true,
      quantityDelta: true,
      sourceMovementId: true,
    },
  });

  const stok = new Map<string, number>();
  const partiTarihi = new Map<string, Date>();
  const kalan = new Map<string, number>();
  for (const h of hareketler) {
    stok.set(h.variantId, (stok.get(h.variantId) ?? 0) + h.quantityDelta);
    if (h.quantityDelta > 0) {
      partiTarihi.set(h.id, h.occurredAt);
      kalan.set(h.id, (kalan.get(h.id) ?? 0) + h.quantityDelta);
    }
  }

  let ileriYiyen = 0;
  for (const h of hareketler) {
    if (h.quantityDelta >= 0 || h.sourceMovementId === null) continue;
    kalan.set(
      h.sourceMovementId,
      (kalan.get(h.sourceMovementId) ?? 0) + h.quantityDelta,
    );
    const p = partiTarihi.get(h.sourceMovementId);
    /** ⚠ ÖLÇÜT `>` — aynı gün alıp aynı gün satmak İŞİN KENDİSİ, ileri değil. */
    if (p !== undefined && p > h.occurredAt) ileriYiyen += 1;
  }

  let negatifKalan = 0;
  for (const k of kalan.values()) if (k < 0) negatifKalan += 1;

  const satis = await prisma.sale.count({ where: { iptalTarihi: null } });
  const net = await prisma.sale.aggregate({
    where: { iptalTarihi: null },
    _sum: { net2Amount: true },
  });

  return {
    hareket: hareketler.length,
    negatif: hareketler.filter((h) => h.quantityDelta < 0).length,
    satis,
    /** ⚠ DİZE OLARAK: float karşılaştırma kuruş farkını yutabilir. */
    net2: net._sum.net2Amount?.toString() ?? "—",
    stok,
    ileriYiyen,
    negatifKalan,
  };
}

function stokFarki(a: Map<string, number>, b: Map<string, number>): string[] {
  const farklar: string[] = [];
  const kimlikler = new Set([...a.keys(), ...b.keys()]);
  for (const k of kimlikler) {
    const x = a.get(k) ?? 0;
    const z = b.get(k) ?? 0;
    if (x !== z) farklar.push(`${k}: ${x} → ${z}`);
  }
  return farklar;
}

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");

  console.log("\nK91 — PARTİ BAĞI ONARIMI");
  console.log("  hedef  " + y.veri.adres.hostname);
  console.log("  kip    " + (YAZ ? "⚠ YAZIM — defter DEĞİŞECEK" : "KURU — hiçbir şey yazılmaz"));
  console.log("  an     " + new Date().toISOString());
  console.log("=".repeat(70));

  /* ═══ PLAN — kuru koşumla AYNI GÖVDEDEN ═════════════════════════ */
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
  const plan = bagOnarimPlani(
    ham.map((h) => ({
      ...h,
      unitCostAmount:
        h.unitCostAmount === null ? null : h.unitCostAmount.toString(),
    })),
  );

  console.log("\n   PLAN");
  console.log("   incelenen        " + plan.incelenen);
  console.log("   YAZILACAK        " + plan.yazilacak.length);
  console.log("   zaten doğru      " + plan.zatenDogru);
  console.log("   belirsiz (dokunulmaz)  " + plan.belirsiz);
  console.log("   çözülemez (dokunulmaz) " + plan.cozulemez);
  console.log("   damgasız / bağsız      " + plan.damgasiz + " / " + plan.bagsiz);

  if (plan.yazilacak.length === 0) {
    console.log("\n   Yazılacak satır yok — defter ölçüte göre temiz.");
    await prisma.$disconnect();
    return;
  }

  /* ═══ ÖNCE ÖLÇÜM ════════════════════════════════════════════════ */
  const once = await olc(prisma);
  console.log("\n   ÖNCE");
  console.log("   hareket " + once.hareket + " · negatif " + once.negatif + " · satış " + once.satis);
  console.log("   NET-2   " + once.net2);
  console.log("   ileri partiye bağlı çıkış  " + once.ileriYiyen);
  console.log("   kalanı NEGATİF parti       " + once.negatifKalan);

  if (!YAZ) {
    console.log("\n   " + "-".repeat(66));
    console.log("   KURU KOŞUM — hiçbir şey yazılmadı.");
    console.log("   Yazmak için:  npx tsx scripts/canli-bag-onarim-yaz.ts --yaz");
    console.log("   ⚠ ÖNCE YEDEK:  npm run canli:yedek");
    await prisma.$disconnect();
    return;
  }

  /* ═══ YAZIM ═════════════════════════════════════════════════════ */
  const damga = "K91-" + new Date().toISOString().slice(0, 10);
  console.log("\n   YAZILIYOR — parti damgası " + damga);

  await prisma.$transaction(async (tx) => {
    for (const s of plan.yazilacak) {
      /**
       * ⛔ ÖNCEKİ DEĞER SATIR BAZINDA — toplam saklamak, sonradan doğan bir
       * farkın KAYNAĞINI aramaya izin vermez.
       * ⚠ Ve iz ÖNCE yazılıyor: güncelleme düşerse iz de düşer (aynı işlem).
       */
      await tx.auditLog.create({
        data: {
          action: "BAG_ONARILDI",
          targetType: "StockMovement",
          targetId: s.cikis,
          detail: JSON.stringify({
            parti: damga,
            variantId: s.variantId,
            eski: s.eski,
            yeni: s.yeni,
            damga: s.damga,
          }),
        },
      });
      await tx.stockMovement.update({
        where: { id: s.cikis },
        data: { sourceMovementId: s.yeni },
      });
    }
  });

  console.log("   " + plan.yazilacak.length + " satır yazıldı.");

  /* ═══ SONRA ÖLÇÜM VE KARŞILAŞTIRMA ══════════════════════════════ */
  const sonra = await olc(prisma);
  console.log("\n   SONRA");
  console.log("   hareket " + sonra.hareket + " · negatif " + sonra.negatif + " · satış " + sonra.satis);
  console.log("   NET-2   " + sonra.net2);
  console.log("   ileri partiye bağlı çıkış  " + sonra.ileriYiyen);
  console.log("   kalanı NEGATİF parti       " + sonra.negatifKalan);

  console.log("\n   " + "-".repeat(66));
  console.log("   DEĞİŞMEZLİK TURU\n");
  const kirmizi: string[] = [];
  const yesil = (ad: string, tamam: boolean, not = "") => {
    console.log(`   ${tamam ? "OK " : "⛔ "} ${ad}${not ? "  " + not : ""}`);
    if (!tamam) kirmizi.push(ad);
  };

  yesil("hareket sayısı DEĞİŞMEDİ", once.hareket === sonra.hareket);
  yesil("negatif hareket DEĞİŞMEDİ", once.negatif === sonra.negatif);
  yesil("satış sayısı DEĞİŞMEDİ", once.satis === sonra.satis);
  yesil(
    "NET-2 KURUŞUNA AYNI",
    once.net2 === sonra.net2,
    once.net2 + " → " + sonra.net2,
  );
  const farklar = stokFarki(once.stok, sonra.stok);
  yesil(
    "varyant bazında stok DEĞİŞMEDİ",
    farklar.length === 0,
    farklar.length ? farklar.slice(0, 5).join(" · ") : "",
  );
  yesil("kalanı NEGATİF parti YOK", sonra.negatifKalan === 0);
  /**
   * ⛔ ASIL HEDEF: ileri partiye bağlı çıkış sayısı TAM YAZILAN KADAR
   * düşmeli. Daha az düşerse yazım tutmamış, daha çok düşerse yazım
   * hedeflenenden fazlasına dokunmuş demektir — ikisi de kırmızı.
   */
  const beklenen = once.ileriYiyen - plan.yazilacak.length;
  yesil(
    "ileri partiye bağlı çıkış TAM " + plan.yazilacak.length + " azaldı",
    sonra.ileriYiyen === beklenen,
    once.ileriYiyen + " → " + sonra.ileriYiyen + " (beklenen " + beklenen + ")",
  );

  console.log("\n" + "-".repeat(70));
  if (kirmizi.length === 0) {
    console.log("   OK  değişmezlik turu TEMİZ — para ve adet değişmedi.");
  } else {
    console.log("   ⛔ DEĞİŞMEZLİK BOZULDU:");
    for (const k of kirmizi) console.log("     " + k);
    console.log("\n   Geri alma: AuditLog BAG_ONARILDI · parti " + damga);
    process.exitCode = 1;
  }

  await prisma.$disconnect();
}

void main();
