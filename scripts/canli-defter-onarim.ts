/**
 * ============================================================================
 *  DEFTER ONARIMI — VAKA BAZLI, KİMLİĞE KİLİTLİ
 * ----------------------------------------------------------------------------
 *  Çalıştırma:
 *      npm run canli:defter-onarim              → ÖNİZLEME (yazmaz)
 *      npm run canli:defter-onarim -- --uygula  → onarır
 *      npm run canli:defter-onarim -- --geri    → geri alır
 *
 *  ── ⚠ NE DEĞİŞİYOR: MİKTAR VE PARA DEĞİL ────────────────────────────────
 *  Üç vakanın hiçbiri `quantityDelta` değiştirmiyor, kayıt silmiyor, yeni
 *  hareket yazmıyor. Değişen alanlar:
 *    · `sourceMovementId` — hareketin HANGİ PARTİYE bağlı olduğu
 *    · `unitCostAmount`   — çıkışın maliyet DAMGASI
 *  Yani ledger toplamı **hiç oynamıyor**; yalnız FIFO defteriyle ledger'ın
 *  ayrışması kapanıyor ve kopmuş maliyet bağı yeniden kuruluyor.
 *
 *  ── METADATA DÜZELTMESİ DAR İSTİSNASI — üç şart da sağlanıyor ───────────
 *  1. Değişen alan **miktar ya da para DEĞİL** (bağ ve damga).
 *  2. **Alternatifler ölçülüp elendi:**
 *     · Ekran? `stok/duzeltme` YENİ hareket yazar; pozitif düzeltme İKİ
 *       deftere birden yazar ve ayrışmayı KAPATMAZ — 20.08'de tam bu oldu
 *       (ledger 3→4 ✓ ama FIFO 4→5 ✗). Ayrışma yön değiştirdi, kapanmadı.
 *     · Ters kayıt? Adet düzeltir, BAĞ düzeltmez.
 *     · Silmek? FIFO bağı `Restrict`; ayrıca ledger'ı bozar.
 *     · `canli:maliyet-hizala`? Damgayı PARTİNİN maliyetiyle hizalar —
 *       o partinin de maliyeti yok, bu vakada işe yaramaz.
 *  3. **İz bırakılıyor** — `AuditLog`a eski ve yeni değer BİRLİKTE.
 *
 *  ── ⚠ HER VAKA TEK KAYDA KİLİTLİ ────────────────────────────────────────
 *  Ölçüt bir kaydı DEĞİL, tam olarak bir kaydı bulmalı. Sıfır ya da birden
 *  çok eşleşme → o vaka ATLANIR ve koşum başarısız sayılır. Genel bir
 *  "defteri hizala" aracı, istisnayı kurala çevirirdi.
 * ============================================================================
 */

import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

const EYLEM = "DEFTER_ONARIMI";
const UYGULA = process.argv.includes("--uygula");
const GERI = process.argv.includes("--geri");

function p2(n: unknown): string {
  if (n === null || n === undefined) return "—";
  return Number(n.toString()).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

type Degisiklik = {
  vaka: string;
  aciklama: string;
  hareketId: string;
  alan: "sourceMovementId" | "unitCostAmount";
  eski: string | null;
  yeni: string | null;
};

async function main() {
  if (UYGULA && GERI) {
    console.log("\n  ⛔ --uygula ve --geri BİRLİKTE verilemez.\n");
    process.exitCode = 1;
    return;
  }
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");
  const { acikPartiler } = await import("../src/lib/stok");
  const { karYenidenYaz } = await import("../src/lib/kar-yeniden");

  console.log("");
  console.log("DEFTER ONARIMI — vaka bazlı");
  console.log("  hedef      " + y.veri.adres.hostname);
  console.log(
    "  kip        " +
      (GERI ? "GERİ AL" : UYGULA ? "UYGULA" : "ÖNİZLEME — hiçbir şey yazılmaz"),
  );
  console.log("  ⚠ Ledger toplamı DEĞİŞMEZ — yalnız bağ ve damga onarılır.");
  console.log("");

  // ── GERİ ALMA — izden okunur, uydurulmaz ────────────────────────────
  if (GERI) {
    const izler = await prisma.auditLog.findMany({
      where: { action: EYLEM },
      orderBy: { createdAt: "desc" },
    });
    if (izler.length === 0) {
      console.log("  ⛔ GERİ ALINACAK İZ YOK — bu betik hiç uygulanmamış.");
      console.log("");
      await prisma.$disconnect();
      process.exitCode = 1;
      return;
    }
    const gorulen = new Set<string>();
    for (const iz of izler) {
      const d = JSON.parse(String(iz.detail)) as Degisiklik;
      /** ⚠ En YENİ iz kazanır; aynı hareket ikinci kez geri alınmaz. */
      const anahtar = d.hareketId + "|" + d.alan;
      if (gorulen.has(anahtar)) continue;
      gorulen.add(anahtar);
      await prisma.stockMovement.update({
        where: { id: d.hareketId },
        data: { [d.alan]: d.eski } as never,
      });
      console.log("  ↩ " + d.vaka + " · " + d.alan + " ← " + (d.eski ?? "null"));
    }
    console.log("");
    console.log("  ⚠ Kâr damgaları geri alındıysa satış kartından");
    console.log("    'Yeniden Hesapla' ile NET tazelenmelidir.");
    console.log("");
    await prisma.$disconnect();
    return;
  }

  const degisiklikler: Degisiklik[] = [];
  let hata = 0;

  /** Tek kayda kilit — sıfır ya da çoklu eşleşme vakayı düşürür. */
  function tekKayit<T>(vaka: string, kayitlar: T[]): T | null {
    if (kayitlar.length === 1) return kayitlar[0];
    console.log(
      "  ⛔ " + vaka + " — " +
        (kayitlar.length === 0
          ? "EŞLEŞME YOK (zaten onarılmış olabilir; bu BAŞARILI sayılmaz)"
          : kayitlar.length + " kayıt eşleşti, kilit tek kayıt bekliyor"),
    );
    hata++;
    return null;
  }

  // ── VAKA 1 — LEGO: hayalet hareketi açık partiye bağla ──────────────
  {
    const vaka = "lego-hayalet-bag";
    const v = await prisma.productVariant.findUnique({
      where: { sku: "OYU-LG-598P-01" },
      select: { id: true },
    });
    if (!v) {
      console.log("  ⛔ " + vaka + " — varyant bulunamadı.");
      hata++;
    } else {
      const partiler = await acikPartiler(prisma, v.id);
      /**
       * ⚠ AYIRT EDİCİ: FAZLA TÜKETİLMİŞ PARTİ.
       *
       * İlk denemede ölçüt "kaynağı açık partiler arasında yok" idi ve
       * YANLIŞTI: bir partiyi SON adedine kadar tüketen hareket de o
       * partiyi açık listeden çıkarır. Doğru çalışan hareket ile hayalet
       * aynı görünüyordu — kilit iki kayıt bulup haklı olarak durdu.
       *
       * Doğru ölçüt kapasiteyle kıyas: bir partiye yazılan toplam tüketim
       * `girenAdet`i AŞIYORSA, o partiyi aşırıya taşıyan SON hareket
       * hayalettir. Ölçüldü: `qini5r7j` kapasite 1, tüketim 2.
       */
      const tumu = await prisma.stockMovement.findMany({
        where: { variantId: v.id },
        select: {
          id: true,
          quantityDelta: true,
          sourceMovementId: true,
          unitCostAmount: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      });
      const adaylar: { id: string; sourceMovementId: string | null }[] = [];
      for (const parti of tumu.filter((m) => m.quantityDelta > 0)) {
        const tuketenler = tumu.filter(
          (m) => m.sourceMovementId === parti.id && m.quantityDelta < 0,
        );
        const toplam = tuketenler.reduce((t, m) => t + Math.abs(m.quantityDelta), 0);
        if (toplam > parti.quantityDelta) {
          /** Aşırıya taşıyan SON hareket — zaman sırasında en yenisi. */
          const son = tuketenler[tuketenler.length - 1];
          if (son) adaylar.push(son);
        }
      }
      const hedef = tekKayit(vaka, adaylar);
      /** FIFO sırası: en eski açık parti tüketilir. */
      const parti = partiler[0] ?? null;
      if (hedef && parti) {
        degisiklikler.push({
          vaka,
          aciklama:
            "Tükenmiş partiye bağlı hayalet hareket, FIFO'daki EN ESKİ açık partiye bağlanıyor → FIFO 1 azalır, ledger DEĞİŞMEZ",
          hareketId: hedef.id,
          alan: "sourceMovementId",
          eski: hedef.sourceMovementId,
          yeni: parti.hareketId,
        });
      } else if (hedef && !parti) {
        console.log("  ⛔ " + vaka + " — bağlanacak AÇIK PARTİ yok.");
        hata++;
      }
    }
  }

  // ── VAKA 2 — LEGO: satışın maliyet damgası ──────────────────────────
  {
    const vaka = "lego-maliyet-damgasi";
    const MALIYET = "3599";
    const adaylar = await prisma.stockMovement.findMany({
      where: {
        type: "SALE_OUT",
        unitCostAmount: null,
        saleItem: { sale: { code: "11518018178" } },
      },
      select: { id: true, unitCostAmount: true },
    });
    const hedef = tekKayit(vaka, adaylar);
    if (hedef)
      degisiklikler.push({
        vaka,
        aciklama:
          "Maliyet damgası boş; kaynağı ALM-NON-260813-02 (sipariş no 297577854427, 2 × 3.599). Damga girilince NET-2 doğruya döner",
        hareketId: hedef.id,
        alan: "unitCostAmount",
        eski: null,
        yeni: MALIYET,
      });
  }

  // ── VAKA 3 — Anker: ayna hareketin kaynak bağı silinir ──────────────
  {
    const vaka = "anker-ayna-bagi";
    const v = await prisma.productVariant.findUnique({
      where: { sku: "axcali1667" },
      select: { id: true },
    });
    if (!v) {
      console.log("  ⛔ " + vaka + " — varyant bulunamadı.");
      hata++;
    } else {
      const adaylar = await prisma.stockMovement.findMany({
        where: {
          variantId: v.id,
          type: "SALE_CANCEL_IN",
          sourceMovementId: { not: null },
        },
        select: { id: true, sourceMovementId: true },
      });
      const hedef = tekKayit(vaka, adaylar);
      if (hedef)
        degisiklikler.push({
          vaka,
          aciklama:
            "Ayna hareket kaynak bağı taşıyor (17.08 öncesi davranış): hem partinin tüketimini sıfırlıyor hem kendisi parti sayılıyor. Bağ silinince FIFO 1 azalır",
          hareketId: hedef.id,
          alan: "sourceMovementId",
          eski: hedef.sourceMovementId,
          yeni: null,
        });
    }
  }

  // ── ÖNİZLEME ────────────────────────────────────────────────────────
  console.log("  DEĞİŞECEK ALAN: " + degisiklikler.length);
  for (const d of degisiklikler) {
    console.log("");
    console.log("    " + d.vaka);
    console.log("      hareket " + d.hareketId);
    console.log(
      "      " + d.alan + ":  " +
        (d.alan === "unitCostAmount" ? p2(d.eski) : (d.eski ?? "null")) +
        "  →  " +
        (d.alan === "unitCostAmount" ? p2(d.yeni) : (d.yeni ?? "null")),
    );
    console.log("      " + d.aciklama);
  }
  console.log("");

  if (hata > 0) {
    console.log("  ⛔ " + hata + " VAKA KİLİDİ TUTMADI — hiçbir şey yazılmadı.");
    console.log("     Kısmi onarım YAPILMAZ: yarısı uygulanmış bir defter,");
    console.log("     hiç dokunulmamış defterden daha zor teşhis edilir.");
    console.log("");
    await prisma.$disconnect();
    process.exitCode = 1;
    return;
  }

  if (!UYGULA) {
    console.log("  ÖNİZLEME — hiçbir şey yazılmadı.");
    console.log("  Doğruysa:  npm run canli:defter-onarim -- --uygula");
    console.log("  Geri al :  npm run canli:defter-onarim -- --geri");
    console.log("");
    await prisma.$disconnect();
    return;
  }

  // ── UYGULA ──────────────────────────────────────────────────────────
  for (const d of degisiklikler) {
    await prisma.$transaction([
      prisma.stockMovement.update({
        where: { id: d.hareketId },
        data: { [d.alan]: d.yeni } as never,
      }),
      prisma.auditLog.create({
        data: {
          action: EYLEM,
          targetType: "StockMovement",
          targetId: d.hareketId,
          detail: JSON.stringify(d),
        },
      }),
    ]);
    console.log("  ✓ " + d.vaka + " · " + d.alan + " onarıldı");
  }

  /**
   * ⚠ MALİYET DAMGASI DEĞİŞTİYSE KÂR TAZELENİR — yoksa ekran eski
   * (şişik) NET'i göstermeye devam eder ve onarım görünmez kalır.
   */
  if (degisiklikler.some((d) => d.alan === "unitCostAmount")) {
    const satis = await prisma.sale.findFirst({
      where: { code: "11518018178" },
      select: {
        id: true,
        net2Amount: true,
        cargoCarrierId: true,
        cargoDesi: true,
        cargoAmount: true,
        items: { select: { id: true, commissionRate: true } },
      },
    });
    if (satis) {
      const eski = satis.net2Amount;
      const { kdvDahilKargo } = await import("../src/lib/kargo-kdv");
      /**
       * ⚠ ÇAĞRI DÜZENLEME YOLUYLA AYNI — oran kalemden, komisyon TUTARI
       * null, kargo saklı tutardan. Farklı çağrılsaydı aynı satış betikle
       * ekrandan başka hesaplanırdı.
       */
      await karYenidenYaz({
        saleId: satis.id,
        kalemler: satis.items.map((i) => ({
          saleItemId: i.id,
          commissionRate:
            i.commissionRate === null ? null : Number(i.commissionRate.toString()),
          commissionAmount: null,
        })),
        cargoCarrierId: satis.cargoCarrierId,
        cargoDesi:
          satis.cargoDesi === null ? null : Number(satis.cargoDesi.toString()),
        cargoAmountManual: kdvDahilKargo(
          satis.cargoAmount === null ? null : Number(satis.cargoAmount.toString()),
        ),
      });
      const yeni = await prisma.sale.findUnique({
        where: { id: satis.id },
        select: { net2Amount: true },
      });
      console.log("");
      console.log(
        "  ✓ KÂR TAZELENDİ — NET-2  " + p2(eski) + "  →  " + p2(yeni?.net2Amount),
      );
    }
  }

  console.log("");
  console.log("  SIRADAKİ ADIM — DOĞRULAMA:");
  console.log("      npm run canli:defter-ayrismasi");
  console.log("    İki defter tutuyorsa çıkış kodu 0 döner.");
  console.log("");

  await prisma.$disconnect();
}

main();
