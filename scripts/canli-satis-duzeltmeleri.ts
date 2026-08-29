/** BETIK SINIFI: TEK_SEFERLIK — Halil'in 30.08 satis duzeltmeleri, `satis-duzeltme-20260830` kodlu. */
/**
 * SAYIM KORUMASI YOK: ② net-sifir cift yaziyor (+N sonra −N, ayni tarih,
 * ayni varyant) ve ③ mevcut bir cikisi geri aliyor. Ikisi de sayilmis
 * stogu TANIMI GEREGI bozamaz: ②'nin net etkisi sifir, ③'un net etkisi
 * ARTIRAN yonde ve zaten hatali bir cikisi telafi ediyor. Kapi cagrilsaydi
 * ②'nin `−N` bacagini ATLAR, `+N` bacagini yazar ve stogu SISIRIRDI —
 * ilke kendi kapsaminin disina uygulaninca hatayi korur.
 */
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  HALİL'İN SATIŞ DÜZELTMELERİ — 30.08.2026
 * ----------------------------------------------------------------------------
 *      npm run canli:satis-duzeltme            → KURU KOŞUM
 *      npm run canli:satis-duzeltme -- --yaz   → yazar
 *      npm run canli:satis-duzeltme -- --geri  → geri alır
 *
 *  ② MALİYETSİZ 9 SATIŞA MALİYET — net-sıfır çift.
 *    Satışların stok hareketi YOK (mal defter başlamadan önce alınmış).
 *    Maliyet yalnız `SALE_OUT` hareketinde yaşayabilir (`SaleItem`'da
 *    maliyet alanı YOK — şema açıkça söylüyor). Bu yüzden 28.08'de
 *    onaylanmış mekanizma uygulanıyor: satış tarihine `PURCHASE_IN`,
 *    hemen ardından `SALE_OUT`. **Net stok etkisi SIFIR** — Halil'in
 *    saydığı rakamlar bozulmaz.
 *
 *  ③a `4120311526` — TESLİM EDİLEMEYEN sipariş → İPTAL.
 *    Mevcut `SALE_OUT` silinmez; `SALE_CANCEL_IN` ile geri alınır.
 *
 *  ③b `10559161422` — AYNI SİPARİŞ İKİ KEZ YAZILMIŞ.
 *    ⛔ K78: sistemde sipariş KALEMİ kaldıracak ekran ya da yol YOK.
 *    ⚠ VE SİLMEK ÇARE DEĞİL: `StockMovement.saleItemId` `SetNull` —
 *    kalem silinirse çıkış hareketi SAHİPSİZ kalır; stok düşük kalır,
 *    düşüren kaybolur. (Anayasa'nın satış silme yasağının aynı gerekçesi.)
 *
 *    ⭐ EN AZ VERİ BOZAN YOL — üç şart birden:
 *      · kayıt SİLİNMEZ (mükerrer satır geçmişte durur, izlenebilir)
 *      · ciro katkısı SIFIRLANIR (`quantity = 0`)
 *      · stok çıkışı GERİ ALINIR — `SALE_CANCEL_IN` **kaleme bağlı**
 *        (`saleItemId`) yazılır; kâr motoru maliyeti kalemin KENDİ
 *        hareketlerinden topluyor, net −1+1 = 0 olur.
 *    Böylece hem ciro hem maliyet sıfırlanır, defter tek yönlü kaymaz.
 * ============================================================================
 */

const KOD = "satis-duzeltme-20260830";
const YAZ = process.argv.includes("--yaz");
const GERI = process.argv.includes("--geri");

/** ② Halil beyanı — sipariş no → birim maliyet (KDV DAHİL). */
const MALIYET: Record<string, number> = {
  "11540657420": 1200,
  "10513820281": 1404,
  "10506626909": 1404,
  "10500979162": 1404,
  "10495148772": 1404,
  "10493815455": 1404,
  "10493475965": 1404,
  "10493055066": 1404,
  "10381754175": 1404,
};
const IPTAL_EDILECEK = "4120311526";
const MUKERRER = "10559161422";

const tl = (n: number) =>
  n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const g = (d: Date) => d.toISOString().slice(0, 10);

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
    "SATIŞ DÜZELTMELERİ — " + (GERI ? "⚠ GERİ ALMA" : YAZ ? "⚠ YAZIM" : "KURU KOŞUM"),
  );
  console.log("=".repeat(92));

  if (GERI) {
    /** ⚠ ÖLÇÜT: `note` içinde bu koşumun kodu. Liste saklanmaz. */
    const hh = await p.stockMovement.findMany({
      where: { note: { contains: KOD } },
      select: { id: true, sourceMovementId: true, quantityDelta: true },
    });
    /**
     * ⛔ SİLME SIRASI ÖNEMLİ — VE İLK SÜRÜM BUNU KAÇIRDI.
     *
     * `deleteMany` sırayı garanti etmiyor; parti (`PURCHASE_IN`) önce
     * silinmeye çalışılınca onu tüketen `SALE_OUT`un `sourceMovementId`
     * yabancı anahtarı patlıyor:
     *     Foreign key constraint violated on the fields: (`sourceMovementId`)
     *
     * ⚠ VE BU YAZILDIĞI ANDA BOZUKTU, KULLANILDIĞI ANDA GÖRÜLDÜ — tam da
     * anayasanın uyardığı biçim. Geri alma turu koşulmasaydı, gerçekten
     * geri almak gerektiği gün öğrenecektik.
     *
     * ⭐ ÇARE: önce TÜKETENLER (kaynağı olanlar), sonra PARTİLER.
     */
    const tuketenler = hh.filter((x) => x.sourceMovementId !== null).map((x) => x.id);
    const partiler = hh.filter((x) => x.sourceMovementId === null).map((x) => x.id);
    await p.stockMovement.deleteMany({ where: { id: { in: tuketenler } } });
    await p.stockMovement.deleteMany({ where: { id: { in: partiler } } });
    /** ③b — sıfırlanan kalemin adedi geri yazılır (iz kaydından). */
    const izler = await p.auditLog.findMany({
      where: { action: "SATIS_DUZELTMELERI", detail: { contains: KOD } },
      select: { detail: true },
    });
    let kalemGeri = 0;
    for (const iz of izler) {
      let v: { sifirlanan?: { id: string; eskiAdet: number }[] };
      try {
        v = JSON.parse(iz.detail ?? "{}");
      } catch {
        console.log("   ⛔ iz çözülemedi");
        continue;
      }
      for (const k of v.sifirlanan ?? []) {
        await p.saleItem.update({ where: { id: k.id }, data: { quantity: k.eskiAdet } });
        kalemGeri++;
      }
    }
    await p.sale.updateMany({
      where: { code: IPTAL_EDILECEK },
      data: { iptalTarihi: null, iptalSebebi: null, iptalNotu: null },
    });
    console.log("\n   ⭐ silinen hareket " + hh.length + " · adedi geri yazılan kalem " +
      kalemGeri + " · iptal geri alındı\n");
    await p.$disconnect();
    return;
  }

  const an = new Date();

  // ═══ ② MALİYETSİZ SATIŞLAR ═══════════════════════════════════════════════
  console.log("\n② MALİYETSİZ SATIŞLARA MALİYET — net-sıfır çift");
  const plan2: {
    kod: string;
    itemId: string;
    variantId: string;
    sku: string;
    adet: number;
    birim: number;
    tarih: Date;
  }[] = [];
  const kova2: string[] = [];
  for (const [kod, birim] of Object.entries(MALIYET)) {
    const s = await p.sale.findFirst({
      where: { code: kod },
      select: {
        id: true,
        soldAt: true,
        iptalTarihi: true,
        items: {
          select: {
            id: true,
            quantity: true,
            variantId: true,
            variant: { select: { sku: true } },
            stockMovements: { select: { id: true } },
          },
        },
      },
    });
    if (!s) {
      kova2.push(kod + " — satış YOK");
      continue;
    }
    if (s.iptalTarihi) {
      kova2.push(kod + " — İPTALLİ, dokunulmaz");
      continue;
    }
    for (const it of s.items) {
      if (it.stockMovements.length > 0) {
        kova2.push(kod + "/" + it.variant.sku + " — zaten hareketi VAR");
        continue;
      }
      plan2.push({
        kod,
        itemId: it.id,
        variantId: it.variantId,
        sku: it.variant.sku,
        adet: it.quantity,
        birim,
        tarih: s.soldAt,
      });
    }
  }
  console.log("   ⭐ YAZILACAK çift " + plan2.length +
    " · adet " + plan2.reduce((a, x) => a + x.adet, 0) +
    " · maliyet ₺" + tl(plan2.reduce((a, x) => a + x.adet * x.birim, 0)));
  for (const q of plan2) {
    console.log("     " + q.kod.padEnd(13) + g(q.tarih) + "  " + q.sku.padEnd(17) +
      q.adet + " × ₺" + tl(q.birim).padStart(9));
  }
  if (kova2.length) {
    console.log("   ⛔ DIŞARIDA:");
    for (const k of kova2) console.log("     " + k);
  }

  // ═══ ③a İPTAL ════════════════════════════════════════════════════════════
  console.log("\n③a `" + IPTAL_EDILECEK + "` — TESLİM EDİLEMEYEN → İPTAL");
  const iptal = await p.sale.findFirst({
    where: { code: IPTAL_EDILECEK },
    select: {
      id: true,
      iptalTarihi: true,
      items: {
        select: {
          id: true,
          variant: { select: { sku: true } },
          stockMovements: {
            select: {
              id: true,
              variantId: true,
              quantityDelta: true,
              sourceMovementId: true,
              locationId: true,
              unitCostAmount: true,
              unitCostCurrency: true,
            },
          },
        },
      },
    },
  });
  const iptalHareketleri = (iptal?.items ?? []).flatMap((i) =>
    i.stockMovements.filter((h) => h.quantityDelta < 0),
  );
  if (!iptal) console.log("   ⛔ SATIŞ YOK");
  else if (iptal.iptalTarihi) console.log("   ✓ ZATEN İPTALLİ (" + g(iptal.iptalTarihi) + ")");
  else
    console.log("   geri alınacak çıkış " + iptalHareketleri.length +
      " · adet " + iptalHareketleri.reduce((a, h) => a + Math.abs(h.quantityDelta), 0));

  // ═══ ③b MÜKERRER KALEM ═══════════════════════════════════════════════════
  console.log("\n③b `" + MUKERRER + "` — AYNI SİPARİŞ İKİ KEZ YAZILMIŞ");
  const muk = await p.sale.findFirst({
    where: { code: MUKERRER },
    select: {
      id: true,
      iptalTarihi: true,
      items: {
        orderBy: { id: "asc" },
        select: {
          id: true,
          quantity: true,
          variantId: true,
          unitPriceAmount: true,
          variant: { select: { sku: true } },
          stockMovements: {
            select: {
              id: true,
              variantId: true,
              quantityDelta: true,
              sourceMovementId: true,
              locationId: true,
              unitCostAmount: true,
              unitCostCurrency: true,
            },
          },
        },
      },
    },
  });
  /**
   * ⚠ HANGİ KALEM SIFIRLANIR — KURAL, TERCİH DEĞİL: kalemler `id`
   * sırasında ve SONUNCUSU sıfırlanır. Deterministik; iki koşum aynı
   * kalemi seçer. Kalemler birebir aynı olduğu için hangisinin
   * seçildiğinin PARA açısından hiçbir farkı yok.
   */
  const mukerrerKalem =
    muk && muk.items.length > 1 && muk.items.every((i) =>
      i.variantId === muk.items[0].variantId &&
      String(i.unitPriceAmount) === String(muk.items[0].unitPriceAmount))
      ? muk.items[muk.items.length - 1]
      : null;
  if (!muk) console.log("   ⛔ SATIŞ YOK");
  else if (!mukerrerKalem)
    console.log("   ⛔ KALEMLER ÖZDEŞ DEĞİL ya da tek kalem — YAZILMAZ (" +
      muk.items.length + " kalem)");
  else if (mukerrerKalem.quantity === 0) console.log("   ✓ ZATEN SIFIRLANMIŞ");
  else {
    console.log("   kalem " + muk.items.length + " · hepsi özdeş (" +
      mukerrerKalem.variant.sku + " ₺" + tl(Number(mukerrerKalem.unitPriceAmount)) + ")");
    console.log("   ⭐ SIFIRLANACAK: son kalem · adet " + mukerrerKalem.quantity +
      " → 0 · çıkışı geri alınacak (" + mukerrerKalem.stockMovements.length + " hareket)");
    console.log("   ⛔ SİLİNMİYOR: `StockMovement.saleItemId` SetNull —");
    console.log("     kalem silinseydi çıkış hareketi SAHİPSİZ kalırdı.");
  }

  if (!YAZ) {
    console.log("\n   KURU KOŞUM — hiçbir şey yazılmadı. Yazmak için: -- --yaz\n");
    await p.$disconnect();
    return;
  }

  // ═══ YAZIM ═══════════════════════════════════════════════════════════════
  const once = {
    hareket: await p.stockMovement.count(),
    maliyetsizSatis: await p.sale.count({
      where: { iptalTarihi: null, items: { none: { stockMovements: { some: {} } } } },
    }),
    iptalli: await p.sale.count({ where: { iptalTarihi: { not: null } } }),
  };

  let yazilan2 = 0;
  for (const q of plan2) {
    const parti = await p.stockMovement.create({
      data: {
        variantId: q.variantId,
        type: "PURCHASE_IN",
        quantityDelta: q.adet,
        occurredAt: q.tarih,
        unitCostAmount: q.birim.toFixed(2),
        unitCostCurrency: "TRY",
        note:
          KOD + " · Halil beyani: bu satisin mali defter baslamadan once " +
          "alinmisti; kaydi yok. Maliyet verilebilsin diye satis tarihine " +
          "parti acildi ve AYNI ANDA tuketildi — NET STOK ETKISI SIFIR.",
      },
    });
    await p.stockMovement.create({
      data: {
        variantId: q.variantId,
        type: "SALE_OUT",
        quantityDelta: -q.adet,
        occurredAt: q.tarih,
        saleItemId: q.itemId,
        sourceMovementId: parti.id,
        unitCostAmount: q.birim.toFixed(2),
        unitCostCurrency: "TRY",
        note: KOD + " · net-sifir ciftin cikis bacagi.",
      },
    });
    yazilan2 += 2;
  }
  console.log("\n④ YAZILDI");
  console.log("   ② net-sıfır çift hareketi  " + yazilan2);

  let yazilan3a = 0;
  if (iptal && !iptal.iptalTarihi) {
    for (const h of iptalHareketleri) {
      await p.stockMovement.create({
        data: {
          variantId: h.variantId,
          type: "SALE_CANCEL_IN",
          quantityDelta: Math.abs(h.quantityDelta),
          occurredAt: an,
          locationId: h.locationId,
          unitCostAmount: h.unitCostAmount,
          unitCostCurrency: h.unitCostCurrency,
          /**

           * ⛔ `sourceMovementId` VERİLMEZ — ÖLÇÜLDÜ 30.08.2026.

           *

           * İlk sürüm partiye bağlıyordu ve hareket İKİ KEZ sayıldı: hem

           * partinin tüketimini geri alıyor (kalan 0→1) hem de kendisi

           * pozitif olduğu için `acikPartiler` onu YENİ PARTİ sayıyor.

           * Sonuç: ledger 1, FIFO 2 — iki varyantta ayrışma.

           *

           * ⭐ VE DEPONUN KURALI ZATEN BUYDU: mevcut 12 `SALE_CANCEL_IN`in

           * 12sinde de bu alan BOŞ. Geri dönen mal YENİ bir parti oluşturur;

           * eski partiyi geri doldurmaz. Kuralı ölçmeden yazdım.

           */
          note: KOD + " · Halil: teslim edilemeyen siparis, iptal.",
        },
      });
      yazilan3a++;
    }
    await p.sale.update({
      where: { id: iptal.id },
      data: {
        iptalTarihi: an,
        iptalSebebi: "MAGAZA_DIGER",
        iptalNotu: "Teslim edilemeyen siparis (Halil beyani 30.08.2026). " + KOD,
      },
    });
  }
  console.log("   ③a iptal geri alma hareketi " + yazilan3a);

  let yazilan3b = 0;
  const sifirlanan: { id: string; eskiAdet: number }[] = [];
  if (mukerrerKalem && mukerrerKalem.quantity > 0) {
    for (const h of mukerrerKalem.stockMovements.filter((x) => x.quantityDelta < 0)) {
      await p.stockMovement.create({
        data: {
          variantId: h.variantId,
          type: "SALE_CANCEL_IN",
          quantityDelta: Math.abs(h.quantityDelta),
          occurredAt: an,
          /** ⭐ KALEME BAĞLI — kâr motoru maliyeti kalemin KENDİ
           *  hareketlerinden topluyor; bağsız yazılsaydı maliyet
           *  sıfırlanmaz, kalem "maliyeti var, cirosu yok" olurdu. */
          saleItemId: mukerrerKalem.id,
          locationId: h.locationId,
          unitCostAmount: h.unitCostAmount,
          unitCostCurrency: h.unitCostCurrency,
          /** ⛔ `sourceMovementId` VERİLMEZ — çift sayım; gerekçe yukarıda. */
          note: KOD + " · mukerrer kalem: ayni siparis iki kez yazilmis (Halil).",
        },
      });
      yazilan3b++;
    }
    sifirlanan.push({ id: mukerrerKalem.id, eskiAdet: mukerrerKalem.quantity });
    await p.saleItem.update({ where: { id: mukerrerKalem.id }, data: { quantity: 0 } });
  }
  console.log("   ③b mükerrer kalem geri alma " + yazilan3b +
    " · sıfırlanan kalem " + sifirlanan.length);

  const sonra = {
    hareket: await p.stockMovement.count(),
    maliyetsizSatis: await p.sale.count({
      where: { iptalTarihi: null, items: { none: { stockMovements: { some: {} } } } },
    }),
    iptalli: await p.sale.count({ where: { iptalTarihi: { not: null } } }),
  };
  const satir = (ad: string, o: number, s: number, bek: number) =>
    console.log("   " + ad.padEnd(26) + o + " → " + s + "   (fark " + (s - o) +
      ", beklenen " + bek + ")" + (s - o === bek ? " ✓" : " ⛔ TUTMADI"));
  console.log("");
  satir("StockMovement", once.hareket, sonra.hareket, yazilan2 + yazilan3a + yazilan3b);
  satir("maliyetsiz satış", once.maliyetsizSatis, sonra.maliyetsizSatis, -plan2.length);
  satir("iptalli satış", once.iptalli, sonra.iptalli, iptal && !iptal.iptalTarihi ? 1 : 0);
  /** ⚠ TUTMAYAN SAYIM YORUMLANMAZ — ham hâliyle yukarıda. */

  await p.auditLog.create({
    data: {
      action: "SATIS_DUZELTMELERI",
      targetType: "Sale",
      detail: JSON.stringify({
        kod: KOD,
        kaynak: "BEYAN",
        beyanSahibi: "Halil",
        beyanTarihi: "2026-08-30",
        netSifirCift: plan2.map((q) => ({
          siparis: q.kod, sku: q.sku, adet: q.adet, birim: q.birim,
        })),
        iptal: { siparis: IPTAL_EDILECEK, hareket: yazilan3a,
          sebep: "teslim edilemeyen siparis" },
        mukerrer: { siparis: MUKERRER, hareket: yazilan3b },
        sifirlanan,
        k78Cozumu:
          "Kalem SILINMEDI (StockMovement.saleItemId SetNull — silinse cikis " +
          "hareketi sahipsiz kalirdi). Yerine: quantity 0 + kaleme BAGLI " +
          "SALE_CANCEL_IN. Hem ciro hem maliyet sifirlanir, kayit gecmiste durur.",
        geriAlmaOlcutu: "note icinde '" + KOD + "' gecen hareketler + iz'deki eski adet.",
      }),
    },
  });
  /**
   * ⭐ KÂR DAMGASI TAZELENİR — YOKSA BAĞ KURULUR AMA EKRAN ESKİ KALIR.
   *
   * ⛔ ÖLÇÜLDÜ 30.08.2026: bağ yazıldıktan sonra 9 satış hâlâ `NO_COST`
   * damgalıydı. `canli:maliyet-tazele` onları GÖRMÜYOR — o araç "en az bir
   * kalemi BAĞSIZ" olanları hedefliyor ve bağ artık VAR. Yani kod düzeldi,
   * defterdeki damga eski kaldı.
   * _(Anayasa: "düzeltme yolu, TÜM okuyuculara ulaştığı ölçülmeden 'var'
   * sayılmaz" — burada okuyucu `profitStatus` damgasıydı.)_
   */
  const { satisKarTazele } = await import("../src/lib/kar-yeniden");
  const tazelenecek = [...new Set(plan2.map((q) => q.kod))];
  let tazelendi = 0;
  for (const kod of tazelenecek) {
    const s = await p.sale.findFirst({ where: { code: kod }, select: { id: true } });
    if (s && (await satisKarTazele(s.id))) tazelendi++;
  }
  /** ③b'nin satışı da tazelenir — bir kalemi sıfırlandı, NET değişti. */
  if (mukerrerKalem) {
    const s = await p.sale.findFirst({ where: { code: MUKERRER }, select: { id: true } });
    if (s && (await satisKarTazele(s.id))) tazelendi++;
  }
  console.log("   ⭐ kâr damgası tazelenen satış " + tazelendi + "/" +
    (tazelenecek.length + (mukerrerKalem ? 1 : 0)));

  console.log("\n   ✓ AuditLog: SATIS_DUZELTMELERI");
  console.log("   GERİ ALMA: npm run canli:satis-duzeltme -- --geri\n");
  await p.$disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
