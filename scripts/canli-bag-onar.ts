/** BETIK SINIFI: TEK_SEFERLIK — K91 yanlis parti bagi onarimi, `bag-onar-20260829` kodlu. */
/** SAYIM KORUMASI YOK: hicbir hareket YAZILMIYOR/SILINMIYOR — yalniz `sourceMovementId` cevriliyor; adet ve para degismiyor. */
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  K91 — YANLIŞ PARTİYE BAKAN BAĞLARIN ONARIMI
 * ----------------------------------------------------------------------------
 *      npm run canli:bag-onar            → KURU KOŞUM
 *      npm run canli:bag-onar -- --yaz   → yazar
 *      npm run canli:bag-onar -- --geri  → geri alır
 *
 *  ⛔ SORUN: 26.08 içe aktarması `SALE_OUT` hareketlerinde maliyeti DOĞRU
 *  partiden damgaladı ama `sourceMovementId`'yi YANLIŞ (ileri tarihli)
 *  partiye kurdu. Ölçüldü: 6036 bağlı hareketin 788'inde damga ≠ bağlı
 *  partinin maliyeti, ve bu 788'in **787'si** ileri parti yiyen küme.
 *
 *  ⭐ ONARIM TAHMİN DEĞİL: hedef parti, hareketin KENDİ maliyet damgasından
 *  türetilir — damga zaten doğru partiyi gösteriyor. Üç vakada birebir
 *  doğrulandı (₺340 · ₺1.792 · ₺796).
 *
 *  ÖLÇÜT (kullanıcı kararı 29.08.2026):
 *    "çıkışın iş tarihinde AÇIK olan ve `unitCostAmount`'ı damgaya
 *     KURUŞUNA eşit parti."
 *  ⚠ Aday YOKSA ya da BİRDEN ÇOKSA onarılmaz — ayrı kovada listelenir.
 *
 *  ⚠ PARA DEĞİŞMEZ: `quantityDelta` ve `unitCostAmount` hiç yazılmıyor.
 *  Dolayısıyla LEDGER matematiksel olarak DEĞİŞEMEZ; betik bunu ayrıca
 *  ÖLÇER ve değişmişse yazmaz.
 *
 *  ⚠ GERİ ALMA ÖLÇÜTE BAĞLI, LİSTEYE DEĞİL — eski bağ `AuditLog`a
 *  hareket bazında yazılır ve geri alma o izden okur.
 *  _(Anayasa: "toplu yazımda önceki değer satır bazında saklanır" ve
 *  "geri alma yolu yeniden hesaplanabilir ölçüte dayanır".)_
 * ============================================================================
 */

/**
 * ⚠ KOD KİPE GÖRE AYRI — iki tur AYRI geri alınabilsin diye. Tek kod
 * olsaydı ikinci turun geri alması birinciyi de söker ve "yalnız
 * çok-adayları geri al" demek imkânsız olurdu.
 */
const KOD_TEK = "bag-onar-20260829";
const KOD_COK = "bag-onar-cokaday-20260829";
const YAZ = process.argv.includes("--yaz");
const GERI = process.argv.includes("--geri");
/**
 * ⭐ ÇOK-ADAY KİPİ — kullanıcı kararı 29.08.2026.
 *
 * Varsayılan kip birden çok aday çıkan bağı ONARMAZ ("tahmin yok"). Ama
 * ölçüldü: bu kümede adayların HEPSİ AYNI MALİYETTE — aynı ürün, aynı
 * fiyattan birkaç kez alınmış. Hangisi seçilirse seçilsin **para birebir
 * aynı**, dolayısıyla ortada tahmin edilecek bir şey yok; FIFO sırası
 * (en eski, kapasitesi olan) sistemin o gün zaten yapacağı seçimdir.
 *
 * ⛔ ŞART SIKI: adaylar arasında **tek kuruş** fark varsa o bağ yine
 * DIŞARIDA kalır — orada seçim parayı değiştirir ve tahmin başlar.
 */
const COK_ADAY = process.argv.includes("--cok-aday");
const KOD = COK_ADAY ? KOD_COK : KOD_TEK;

/** ⚠ Kuruşuna kıyas — `Decimal` metnini sayıya çevirip kuruşa yuvarlar. */
const kurus = (h: unknown): number | null => {
  if (h === null || h === undefined) return null;
  const n = Number(h);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
};

/** Olayın GÜN SONU sınırı — aynı gün alınıp aynı gün satılan mal İÇERİDE. */
function gunSonuYerel(an: Date): Date {
  const d = new Date(an);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

type Hareket = {
  id: string;
  variantId: string;
  type: string;
  quantityDelta: number;
  occurredAt: Date;
  sourceMovementId: string | null;
  unitCostAmount: unknown;
};

/** Varyant bazında ledger ve FIFO — tek gövde, iki yerde çağrılır. */
function defterler(hh: Hareket[]) {
  const tuk = new Map<string, number>();
  for (const x of hh) {
    if (x.sourceMovementId) {
      tuk.set(x.sourceMovementId, (tuk.get(x.sourceMovementId) ?? 0) + x.quantityDelta);
    }
  }
  const led = new Map<string, number>();
  const fifo = new Map<string, number>();
  for (const x of hh) {
    led.set(x.variantId, (led.get(x.variantId) ?? 0) + x.quantityDelta);
    if (x.quantityDelta > 0) {
      const kalan = Math.max(0, x.quantityDelta + (tuk.get(x.id) ?? 0));
      fifo.set(x.variantId, (fifo.get(x.variantId) ?? 0) + kalan);
    }
  }
  return { led, fifo, tuk };
}

async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) {
    console.log("\n⛔ CANLI ADRES OKUNAMADI\n");
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(c.veri.ham);
  const { prisma: p } = await import("../src/lib/prisma");

  console.log("\n" + "=".repeat(96));
  console.log(
    "K91 BAĞ ONARIMI — " + (GERI ? "⚠ GERİ ALMA" : YAZ ? "⚠ YAZIM" : "KURU KOŞUM"),
  );
  console.log("=".repeat(96));

  // ═══ GERİ ALMA ═══════════════════════════════════════════════════════════
  if (GERI) {
    const izler = await p.auditLog.findMany({
      where: { action: "BAG_ONARIMI", detail: { contains: KOD } },
      select: { id: true, detail: true },
      orderBy: { createdAt: "desc" },
    });
    console.log("\n   iz kaydı: " + izler.length);
    let geri = 0;
    for (const iz of izler) {
      let veri: { kod?: string; baglar?: { h: string; eski: string | null }[] };
      try {
        veri = JSON.parse(iz.detail ?? "{}");
      } catch {
        /** ⚠ Çözülemeyen iz SESSİZCE GEÇİLMEZ — sayılır ve yazılır. */
        console.log("   ⛔ iz çözülemedi: " + iz.id);
        continue;
      }
      for (const b of veri.baglar ?? []) {
        await p.stockMovement.update({
          where: { id: b.h },
          data: { sourceMovementId: b.eski },
        });
        geri++;
      }
    }
    console.log("   ⭐ geri çevrilen bağ: " + geri + "\n");
    await p.$disconnect();
    return;
  }

  // ═══ ÖLÇÜM ═══════════════════════════════════════════════════════════════
  const hh: Hareket[] = await p.stockMovement.findMany({
    select: {
      id: true,
      variantId: true,
      type: true,
      quantityDelta: true,
      occurredAt: true,
      sourceMovementId: true,
      unitCostAmount: true,
    },
    orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }],
  });
  const byId = new Map(hh.map((x) => [x.id, x]));
  const once = defterler(hh);
  console.log("\n① KAPSAM");
  console.log("   taranan hareket " + hh.length + " · varyant " + once.led.size);

  /** Varyant → giriş partileri (FIFO sırasında). */
  const partiler = new Map<string, Hareket[]>();
  for (const x of hh) {
    if (x.quantityDelta <= 0) continue;
    partiler.set(x.variantId, [...(partiler.get(x.variantId) ?? []), x]);
  }

  /**
   * ⚠ BOZUK BAĞ ÖLÇÜTÜ İKİ ŞARTLI: hem ileri parti yiyecek hem damga
   * tutmayacak. Yalnız "ileri" deseydik, damgası da ileri partiden gelen
   * (yani tutarlı ama tarihi geç) bağlar da kümeye girerdi ve onlarda
   * onaracak bir şey yok — hedef parti damgadan türetilemez.
   */
  const bozuk = hh.filter((x) => {
    if (!x.sourceMovementId) return false;
    const k = byId.get(x.sourceMovementId);
    if (!k) return false;
    if (x.occurredAt >= k.occurredAt) return false;
    return kurus(x.unitCostAmount) !== kurus(k.unitCostAmount);
  });
  console.log("   ⭐ BOZUK BAĞ (ileri parti + damga tutmuyor): " + bozuk.length);

  /** Tüketim tablosu — plan ilerledikçe güncellenir (kapasite kontrolü). */
  const tuketim = new Map(once.tuk);

  const plan: { h: Hareket; eski: string; yeni: string }[] = [];
  const kovaAdaysiz: Hareket[] = [];
  const kovaCokAday: { h: Hareket; n: number }[] = [];
  const kovaKapasite: Hareket[] = [];
  /** ⛔ Çok-aday kipinde adaylar arasında kuruş farkı olanlar. */
  const kovaKurusFarki: { h: Hareket; n: number }[] = [];
  const kovaDamgasiz: Hareket[] = [];

  for (const x of bozuk) {
    const damga = kurus(x.unitCostAmount);
    if (damga === null) {
      kovaDamgasiz.push(x);
      continue;
    }
    const sinir = gunSonuYerel(x.occurredAt);
    const adaylar = (partiler.get(x.variantId) ?? []).filter(
      (q) => q.occurredAt < sinir && kurus(q.unitCostAmount) === damga,
    );
    if (adaylar.length === 0) {
      kovaAdaysiz.push(x);
      continue;
    }
    if (adaylar.length > 1 && !COK_ADAY) {
      /** ⛔ TAHMİN YOK — varsayılan kip. */
      kovaCokAday.push({ h: x, n: adaylar.length });
      continue;
    }
    /**
     * ⛔ ÇOK-ADAY KİPİNDE BİLE KURUŞ FARKI VARSA DIŞARIDA.
     * ⚠ Ölçüt adayların KENDİ maliyetleri arasındaki farka bakar —
     * damgaya değil. Damgaya bakan bir ölçüt hepsini eşit görürdü
     * (zaten damgaya eşit oldukları için aday oldular) ve bu kontrol
     * hiçbir şey ölçmezdi.
     */
    if (adaylar.length > 1) {
      const farkli = new Set(adaylar.map((q) => kurus(q.unitCostAmount)));
      if (farkli.size > 1) {
        kovaKurusFarki.push({ h: x, n: adaylar.length });
        continue;
      }
    }
    /**
     * ⭐ FIFO SIRASI — en eski, KAPASİTESİ OLAN aday. `partiler` zaten
     * `occurredAt` sırasında; ilk uygun olanı seçmek sistemin o gün
     * yapacağı seçimin aynısıdır ve deterministiktir.
     */
    const hedef =
      adaylar.find(
        (q) => q.quantityDelta + (tuketim.get(q.id) ?? 0) + x.quantityDelta >= 0,
      ) ?? adaylar[0];
    /** ⚠ Hedef parti eksiye inecekse onarılmaz — bir yarayı ötekine taşımak. */
    const sonra = hedef.quantityDelta + (tuketim.get(hedef.id) ?? 0) + x.quantityDelta;
    if (sonra < 0) {
      kovaKapasite.push(x);
      continue;
    }
    tuketim.set(hedef.id, (tuketim.get(hedef.id) ?? 0) + x.quantityDelta);
    tuketim.set(x.sourceMovementId!, (tuketim.get(x.sourceMovementId!) ?? 0) - x.quantityDelta);
    plan.push({ h: x, eski: x.sourceMovementId!, yeni: hedef.id });
  }

  console.log("\n② PLAN");
  console.log("   ⭐ ONARILACAK              " + String(plan.length).padStart(4));
  console.log("   ⛔ aday YOK                " + String(kovaAdaysiz.length).padStart(4));
  console.log("   ⛔ BİRDEN ÇOK aday         " + String(kovaCokAday.length).padStart(4));
  console.log("   ⛔ hedef parti KAPASİTESİZ " + String(kovaKapasite.length).padStart(4));
  console.log("   ⛔ damgası YOK             " + String(kovaDamgasiz.length).padStart(4));
  if (COK_ADAY) {
    console.log(
      "   ⛔ adaylar arası KURUŞ FARKI" + String(kovaKurusFarki.length).padStart(4) +
        "   ← seçim parayı değiştirir, dışarıda",
    );
  }
  const toplam =
    kovaKurusFarki.length +
    plan.length +
    kovaAdaysiz.length +
    kovaCokAday.length +
    kovaKapasite.length +
    kovaDamgasiz.length;
  console.log(
    "   TOPLAM → " + toplam + " = " + bozuk.length + (toplam === bozuk.length ? " ✓" : " ⛔"),
  );
  if (kovaCokAday.length > 0) {
    const dag = new Map<number, number>();
    for (const k of kovaCokAday) dag.set(k.n, (dag.get(k.n) ?? 0) + 1);
    console.log(
      "     çok-aday dağılımı: " +
        [...dag].sort((a, b) => a[0] - b[0]).map(([n, k]) => n + " aday×" + k).join(" · "),
    );
  }

  // ═══ SİMÜLASYON — defterler nasıl değişiyor ═══════════════════════════════
  const sonraHH: Hareket[] = hh.map((x) => {
    const y = plan.find((q) => q.h.id === x.id);
    return y ? { ...x, sourceMovementId: y.yeni } : x;
  });
  const sonra = defterler(sonraHH);
  const ledDegisen: string[] = [];
  const fifoDegisen: { vid: string; o: number; s: number }[] = [];
  for (const [vid, o] of once.led) {
    if ((sonra.led.get(vid) ?? 0) !== o) ledDegisen.push(vid);
  }
  for (const [vid, o] of once.fifo) {
    const s = sonra.fifo.get(vid) ?? 0;
    if (s !== o) fifoDegisen.push({ vid, o, s });
  }
  console.log("\n③ ⭐ DEFTER ETKİSİ");
  console.log(
    "   LEDGER değişen varyant : " + ledDegisen.length +
      (ledDegisen.length === 0 ? "   ✓ (para/adet yazılmadığı için değişemez)" : "   ⛔"),
  );
  console.log("   FIFO değişen varyant   : " + fifoDegisen.length);

  const vv = await p.productVariant.findMany({
    where: { id: { in: fifoDegisen.map((x) => x.vid) } },
    select: { id: true, sku: true },
  });
  const ad = new Map(vv.map((v) => [v.id, v.sku]));
  for (const d of fifoDegisen) {
    const l = once.led.get(d.vid) ?? 0;
    console.log(
      "     " + (ad.get(d.vid) ?? "?").padEnd(18) +
        " FIFO " + d.o + " → " + d.s + " · ledger " + l +
        (d.s === l ? "   ✓ EŞİTLENDİ" : "   ⛔ HÂLÂ AYRI"),
    );
  }

  console.log("\n④ ⭐ SAPAN VARYANTLAR — ÖNCE / SONRA");
  const sapanOnce = [...once.led].filter(([v, l]) => (once.fifo.get(v) ?? 0) !== l);
  const sapanSonra = [...sonra.led].filter(([v, l]) => (sonra.fifo.get(v) ?? 0) !== l);
  console.log("   ledger ≠ FIFO olan varyant: " + sapanOnce.length + " → " + sapanSonra.length);
  const kalanVV = await p.productVariant.findMany({
    where: { id: { in: sapanSonra.map(([v]) => v) } },
    select: { id: true, sku: true },
  });
  for (const [vid, l] of sapanSonra) {
    console.log(
      "     KALAN: " + (kalanVV.find((x) => x.id === vid)?.sku ?? "?").padEnd(18) +
        " ledger " + l + " · FIFO " + (sonra.fifo.get(vid) ?? 0),
    );
  }

  if (!YAZ) {
    console.log("\n   KURU KOŞUM — hiçbir şey yazılmadı. Yazmak için: -- --yaz\n");
    await p.$disconnect();
    return;
  }
  /** ⛔ LEDGER DEĞİŞİYORSA YAZILMAZ — bu betik para/adet değiştirmez. */
  if (ledDegisen.length > 0) {
    console.log("\n⛔ LEDGER DEĞİŞİYOR — YAZILMADI. Bu betik adet/para değiştirmez.\n");
    await p.$disconnect();
    process.exitCode = 1;
    return;
  }

  console.log("\n⑤ YAZILIYOR — " + plan.length + " bağ");
  let n = 0;
  const izBoyu = 400;
  for (let i = 0; i < plan.length; i += 20) {
    await Promise.all(
      plan.slice(i, i + 20).map(async (q) => {
        await p.stockMovement.update({
          where: { id: q.h.id },
          data: { sourceMovementId: q.yeni },
        });
      }),
    );
    n += plan.slice(i, i + 20).length;
    if (n % 200 === 0) console.log("   … " + n + "/" + plan.length);
  }
  console.log("   ⭐ çevrilen bağ: " + n);

  /**
   * ⚠ İZ PARÇALARA BÖLÜNÜR — `AuditLog.detail` MySQL `TEXT` (65.535 bayt)
   * ve 787 kimlik çifti tek JSON'a sığmaz. 28.08'de tam bu kırpılma
   * yaşandı ve geri alma yolu YAZILDIĞI ANDA bozuktu.
   * _(Anayasa: "geri alma yolu, saklanan listeye değil yeniden
   * hesaplanabilir ölçüte dayanır" — burada iz TEŞHİS için, geri alma
   * yolu ise parçaların TAMAMI okunarak kurulur ve her parça kendi
   * bütünlüğünü taşır.)_
   */
  for (let i = 0; i < plan.length; i += izBoyu) {
    const dilim = plan.slice(i, i + izBoyu);
    await p.auditLog.create({
      data: {
        action: "BAG_ONARIMI",
        targetType: "StockMovement",
        detail: JSON.stringify({
          kod: KOD,
          parca: Math.floor(i / izBoyu) + 1,
          parcaSayisi: Math.ceil(plan.length / izBoyu),
          toplamBag: plan.length,
          olcut:
            "cikisin is tarihinde ACIK olan ve unitCostAmount'i damgaya " +
            "KURUSUNA esit parti; aday yoksa ya da birden coksa onarilmaz.",
          gerekce:
            "26.08 ice aktarmasi maliyeti DOGRU partiden damgaladi, " +
            "sourceMovementId'yi YANLIS (ileri tarihli) partiye kurdu. " +
            "Para ve adet DEGISMEDI; yalniz bag cevrildi.",
          baglar: dilim.map((q) => ({ h: q.h.id, eski: q.eski, yeni: q.yeni })),
        }),
      },
    });
  }
  console.log("   ✓ AuditLog: BAG_ONARIMI · " + Math.ceil(plan.length / izBoyu) + " parça");

  const teyit = defterler(
    await p.stockMovement.findMany({
      select: {
        id: true,
        variantId: true,
        type: true,
        quantityDelta: true,
        occurredAt: true,
        sourceMovementId: true,
        unitCostAmount: true,
      },
    }),
  );
  const sapanTeyit = [...teyit.led].filter(([v, l]) => (teyit.fifo.get(v) ?? 0) !== l);
  console.log("\n⑥ TEYİT — canlıdan yeniden okundu");
  console.log(
    "   ledger ≠ FIFO olan varyant: " + sapanTeyit.length +
      "   (beklenen " + sapanSonra.length + ")" +
      (sapanTeyit.length === sapanSonra.length ? "   ✓" : "   ⛔"),
  );
  console.log("\n   GERİ ALMA: npm run canli:bag-onar -- --geri\n");
  await p.$disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
