/** BETIK SINIFI: TEK_SEFERLIK — K54 eksik parti bagi onarimi, `eksik-bag-20260829` kodlu. */
/** SAYIM KORUMASI YOK: hicbir hareket YAZILMIYOR/SILINMIYOR — yalniz eksik `sourceMovementId` kuruluyor; adet ve para degismiyor, net stok etkisi SIFIR. */
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  K54 — PARTİSİZ ÇIKIŞLARIN BAĞLANMASI
 * ----------------------------------------------------------------------------
 *      npm run canli:eksik-bag            → KURU KOŞUM
 *      npm run canli:eksik-bag -- --yaz   → yazar
 *      npm run canli:eksik-bag -- --geri  → geri alır
 *
 *  ⛔ SORUN: bazı çıkışlar (`EXCHANGE_OUT` gibi) `sourceMovementId`
 *  TAŞIMADAN yazıldı. Ledger düşer, FIFO düşmez — ekran bir sayı, kâr
 *  motoru başka sayı görür ve **hiçbiri hata vermez.**
 *
 *  ⚠ K91'İN TERSİ MEKANİZMA, AYNI İŞARET. K91'de bağ VARDI ama yanlış
 *  partiye bakıyordu (fazla tüketim). Burada bağ HİÇ YOK (eksik bağ).
 *  İkisi `−1` üretir; tek kefeye konursa yanlış çare uygulanır.
 *
 *  ÖLÇÜT — K91 ile AYNI, tek farkla:
 *    "çıkışın iş tarihinde AÇIK olan, KAPASİTESİ olan ve
 *     `unitCostAmount`'ı damgaya KURUŞUNA eşit parti."
 *
 *  ⭐ BİRDEN ÇOK ADAY VARSA FIFO SIRASI — kullanıcı kararı 29.08.2026:
 *  _"'Tahmin yok' kuralı, seçimin SONUCU değişmiyorsa uygulanmaz.
 *   Birden çok aday arasında para/adet birebir aynıysa ortada tahmin
 *   yoktur; deterministik bir sıra (FIFO) kuralın kendisidir."_
 *  ⛔ ŞART SIKI: adaylar arasında **tek kuruş** fark varsa onarılmaz.
 *
 *  ⚠ PARA DEĞİŞMEZ: `quantityDelta` ve `unitCostAmount` yazılmaz. Ledger
 *  matematiksel olarak DEĞİŞEMEZ; betik bunu ayrıca ÖLÇER ve değişmişse
 *  yazmaz.
 * ============================================================================
 */

const KOD = "eksik-bag-20260829";
const YAZ = process.argv.includes("--yaz");
const GERI = process.argv.includes("--geri");

const kurus = (h: unknown): number | null => {
  if (h === null || h === undefined) return null;
  const n = Number(h);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
};

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
      fifo.set(
        x.variantId,
        (fifo.get(x.variantId) ?? 0) + Math.max(0, x.quantityDelta + (tuk.get(x.id) ?? 0)),
      );
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

  console.log("\n" + "=".repeat(92));
  console.log(
    "K54 EKSİK BAĞ ONARIMI — " + (GERI ? "⚠ GERİ ALMA" : YAZ ? "⚠ YAZIM" : "KURU KOŞUM"),
  );
  console.log("=".repeat(92));

  if (GERI) {
    const izler = await p.auditLog.findMany({
      where: { action: "EKSIK_BAG_ONARIMI", detail: { contains: KOD } },
      select: { id: true, detail: true },
    });
    let geri = 0;
    for (const iz of izler) {
      let veri: { baglar?: { h: string }[] };
      try {
        veri = JSON.parse(iz.detail ?? "{}");
      } catch {
        console.log("   ⛔ iz çözülemedi: " + iz.id);
        continue;
      }
      for (const b of veri.baglar ?? []) {
        /** ⚠ Eksik bağ onarımının tersi: bağı BOŞA çevirmek. */
        await p.stockMovement.update({
          where: { id: b.h },
          data: { sourceMovementId: null },
        });
        geri++;
      }
    }
    console.log("\n   iz kaydı " + izler.length + " · ⭐ boşa çevrilen bağ: " + geri + "\n");
    await p.$disconnect();
    return;
  }

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
  const once = defterler(hh);
  console.log("\n① KAPSAM");
  console.log("   taranan hareket " + hh.length + " · varyant " + once.led.size);

  const partiler = new Map<string, Hareket[]>();
  for (const x of hh) {
    if (x.quantityDelta <= 0) continue;
    partiler.set(x.variantId, [...(partiler.get(x.variantId) ?? []), x]);
  }

  /**
   * ⚠ ÖLÇÜT: partisiz ÇIKIŞ. `COUNT_CORRECTION` gibi bilerek partisiz
   * yazılabilen tipler de buraya düşer — ama onlarda da bağ kurmak
   * DOĞRUDUR: maliyeti olan bir çıkış bir partiden gelmiştir.
   * ⛔ Maliyet damgası YOKSA aday türetilemez; ayrı kovaya düşer.
   */
  const partisiz = hh.filter((x) => x.quantityDelta < 0 && x.sourceMovementId === null);
  console.log("   ⭐ PARTİSİZ ÇIKIŞ: " + partisiz.length + " hareket");

  const tuketim = new Map(once.tuk);
  const plan: { h: Hareket; yeni: string }[] = [];
  const kovaDamgasiz: Hareket[] = [];
  const kovaAdaysiz: Hareket[] = [];
  const kovaKurusFarki: Hareket[] = [];

  for (const x of partisiz) {
    const damga = kurus(x.unitCostAmount);
    if (damga === null) {
      kovaDamgasiz.push(x);
      continue;
    }
    const sinir = gunSonuYerel(x.occurredAt);
    const adaylar = (partiler.get(x.variantId) ?? []).filter(
      (q) =>
        q.occurredAt < sinir &&
        kurus(q.unitCostAmount) === damga &&
        q.quantityDelta + (tuketim.get(q.id) ?? 0) > 0,
    );
    if (adaylar.length === 0) {
      kovaAdaysiz.push(x);
      continue;
    }
    /**
     * ⛔ ADAYLAR ARASINDA KURUŞ FARKI VARSA ONARILMAZ.
     * ⚠ Ölçüt adayların KENDİ maliyetleri arasına bakar. Damgaya bakan bir
     * kontrol hiçbir şey ölçmezdi — zaten damgaya eşit oldukları için aday
     * oldular.
     */
    if (new Set(adaylar.map((q) => kurus(q.unitCostAmount))).size > 1) {
      kovaKurusFarki.push(x);
      continue;
    }
    /** ⭐ FIFO SIRASI — `partiler` zaten `occurredAt` sırasında. */
    const hedef = adaylar.find(
      (q) => q.quantityDelta + (tuketim.get(q.id) ?? 0) + x.quantityDelta >= 0,
    );
    if (!hedef) {
      kovaAdaysiz.push(x);
      continue;
    }
    tuketim.set(hedef.id, (tuketim.get(hedef.id) ?? 0) + x.quantityDelta);
    plan.push({ h: x, yeni: hedef.id });
  }

  console.log("\n② PLAN");
  console.log("   ⭐ ONARILACAK              " + String(plan.length).padStart(4));
  console.log("   ⛔ aday YOK / kapasitesiz  " + String(kovaAdaysiz.length).padStart(4));
  console.log("   ⛔ adaylar arası KURUŞ farkı" + String(kovaKurusFarki.length).padStart(4));
  console.log("   ⛔ maliyet damgası YOK     " + String(kovaDamgasiz.length).padStart(4));
  const toplam =
    plan.length + kovaAdaysiz.length + kovaKurusFarki.length + kovaDamgasiz.length;
  console.log(
    "   TOPLAM → " + toplam + " = " + partisiz.length + (toplam === partisiz.length ? " ✓" : " ⛔"),
  );

  const sonraHH: Hareket[] = hh.map((x) => {
    const y = plan.find((q) => q.h.id === x.id);
    return y ? { ...x, sourceMovementId: y.yeni } : x;
  });
  const sonra = defterler(sonraHH);
  const ledDegisen = [...once.led].filter(([v, l]) => (sonra.led.get(v) ?? 0) !== l);
  const fifoDegisen = [...once.fifo].filter(([v, f]) => (sonra.fifo.get(v) ?? 0) !== f);
  console.log("\n③ ⭐ DEFTER ETKİSİ");
  console.log(
    "   LEDGER değişen varyant : " + ledDegisen.length +
      (ledDegisen.length === 0 ? "   ✓ (para/adet yazılmadığı için değişemez)" : "   ⛔"),
  );
  console.log("   FIFO değişen varyant   : " + fifoDegisen.length);
  const vv = await p.productVariant.findMany({
    where: { id: { in: fifoDegisen.map(([v]) => v) } },
    select: { id: true, sku: true },
  });
  const ad = new Map(vv.map((v) => [v.id, v.sku]));
  for (const [vid, f] of fifoDegisen) {
    const s = sonra.fifo.get(vid) ?? 0;
    const l = once.led.get(vid) ?? 0;
    console.log(
      "     " + (ad.get(vid) ?? "?").padEnd(18) + " FIFO " + f + " → " + s +
        " · ledger " + l + (s === l ? "   ✓ EŞİTLENDİ" : "   ⛔ HÂLÂ AYRI"),
    );
  }
  const sapanOnce = [...once.led].filter(([v, l]) => (once.fifo.get(v) ?? 0) !== l);
  const sapanSonra = [...sonra.led].filter(([v, l]) => (sonra.fifo.get(v) ?? 0) !== l);
  console.log("\n④ ledger ≠ FIFO olan varyant: " + sapanOnce.length + " → " + sapanSonra.length);

  if (!YAZ) {
    console.log("\n   KURU KOŞUM — hiçbir şey yazılmadı. Yazmak için: -- --yaz\n");
    await p.$disconnect();
    return;
  }
  if (ledDegisen.length > 0) {
    console.log("\n⛔ LEDGER DEĞİŞİYOR — YAZILMADI. Bu betik adet/para değiştirmez.\n");
    await p.$disconnect();
    process.exitCode = 1;
    return;
  }

  for (const q of plan) {
    await p.stockMovement.update({
      where: { id: q.h.id },
      data: { sourceMovementId: q.yeni },
    });
  }
  console.log("\n⑤ ⭐ kurulan bağ: " + plan.length);
  await p.auditLog.create({
    data: {
      action: "EKSIK_BAG_ONARIMI",
      targetType: "StockMovement",
      detail: JSON.stringify({
        kod: KOD,
        toplamBag: plan.length,
        olcut:
          "cikisin is tarihinde ACIK, KAPASITESI olan ve unitCostAmount'i " +
          "damgaya KURUSUNA esit parti; birden cok adayda FIFO sirasi " +
          "(adaylarin maliyeti ayni oldugu icin secim parayi degistirmez).",
        gerekce:
          "Partisiz cikis ledger'i dusuruyor ama FIFO'yu dusurmuyordu; " +
          "ekran bir sayi, kar motoru baska sayi goruyordu. Para ve adet " +
          "DEGISMEDI; yalniz eksik bag kuruldu.",
        baglar: plan.map((q) => ({ h: q.h.id, yeni: q.yeni })),
      }),
    },
  });
  console.log("   ✓ AuditLog: EKSIK_BAG_ONARIMI");

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
  console.log("\n   GERİ ALMA: npm run canli:eksik-bag -- --geri\n");
  await p.$disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
