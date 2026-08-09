/**
 * ============================================================================
 *  FIFO DOĞRULAMA — tek seferlik/elle çalıştırılan doğrulama betiği
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npx tsx scripts/fifo-dogrula.ts
 *
 *  İKİ BÖLÜM:
 *  1) SAF MANTIK — fifoDagit() dağıtım kuralları (veritabanına dokunmaz).
 *  2) UÇTAN UCA  — geçici test verisiyle gerçek satış kaydı, FIFO düşümü ve
 *     negatif stok engeli sınanır; sonunda oluşturulan HER ŞEY silinir.
 *
 *  UYARI: 2. bölüm veritabanına yazar. Test verisi "ZZTEST-" önekiyle
 *  oluşturulur ve betik bitiminde temizlenir. Gerçek kayıtlara dokunmaz.
 * ============================================================================
 */

import "dotenv/config";

import { fifoDagit, type Parti } from "../src/lib/stok";
import { prisma } from "../src/lib/prisma";
import {
  satisKaydet,
  YetersizStokHatasi,
  SiparisNoCakismasiHatasi,
} from "../src/lib/satis";

let basarisiz = 0;
let calisan = 0;

/**
 * Uçtan uca bölüm sonuna kadar geldi mi? Betik bir istisnayla yarıda kesilirse
 * kontroller hiç çalışmamış olabilir; bunu "hepsi geçti" diye raporlamak
 * sessiz başarısızlık olur (#5). Sabit bir sayı yerine bayrak kullanıyoruz ki
 * yeni kontrol eklendiğinde güncellemek gerekmesin.
 */
let ucanUcaTamamlandi = false;

function kontrol(ad: string, kosul: boolean, ayrinti?: unknown) {
  calisan++;
  if (kosul) {
    console.log(`  OK    ${ad}`);
  } else {
    basarisiz++;
    console.log(`  HATA  ${ad}`);
    if (ayrinti !== undefined) console.log("        ", ayrinti);
  }
}

function parti(id: string, kalan: number, maliyet: string | null): Parti {
  return {
    hareketId: id,
    occurredAt: new Date(),
    girenAdet: kalan,
    kalanAdet: kalan,
    birimMaliyet: maliyet,
    birimMaliyetParaBirimi: maliyet ? "TRY" : null,
    locationId: null,
  };
}

// ---------------------------------------------------------------------------
console.log("\n1) SAF MANTIK — fifoDagit()");
// ---------------------------------------------------------------------------
{
  const partiler = [parti("A", 3, "100"), parti("B", 5, "120")];

  const tek = fifoDagit(partiler, 2);
  kontrol("tek partiden düşer", tek.yeterliMi && tek.dagitim.length === 1);
  kontrol(
    "en eski parti seçilir",
    tek.yeterliMi && tek.dagitim[0].parti.hareketId === "A",
  );
  kontrol(
    "kalan doğru güncellenir",
    tek.yeterliMi && tek.kalanPartiler[0].kalanAdet === 1,
    tek.yeterliMi ? tek.kalanPartiler.map((p) => p.kalanAdet) : tek,
  );

  const bolunmus = fifoDagit(partiler, 5);
  kontrol(
    "iki partiye bölünür (3+2)",
    bolunmus.yeterliMi &&
      bolunmus.dagitim.length === 2 &&
      bolunmus.dagitim[0].adet === 3 &&
      bolunmus.dagitim[1].adet === 2,
    bolunmus.yeterliMi ? bolunmus.dagitim.map((d) => d.adet) : bolunmus,
  );
  kontrol(
    "tükenen parti listeden düşer",
    bolunmus.yeterliMi &&
      bolunmus.kalanPartiler.length === 1 &&
      bolunmus.kalanPartiler[0].hareketId === "B",
  );
  kontrol(
    "her payda kendi maliyeti taşınır",
    bolunmus.yeterliMi &&
      bolunmus.dagitim[0].parti.birimMaliyet === "100" &&
      bolunmus.dagitim[1].parti.birimMaliyet === "120",
  );

  const tamam = fifoDagit(partiler, 8);
  kontrol("tam stok kadar satış geçer", tamam.yeterliMi);

  const yetersiz = fifoDagit(partiler, 9);
  kontrol("stok yetmezse reddedilir", !yetersiz.yeterliMi);
  kontrol(
    "mevcut adet doğru bildirilir",
    !yetersiz.yeterliMi && yetersiz.mevcut === 8,
    yetersiz,
  );

  kontrol(
    "girdi dizisi değiştirilmez",
    partiler[0].kalanAdet === 3 && partiler[1].kalanAdet === 5,
    partiler.map((p) => p.kalanAdet),
  );

  const bos = fifoDagit([], 1);
  kontrol("hiç parti yoksa reddedilir", !bos.yeterliMi);
}

// ---------------------------------------------------------------------------
console.log("\n2) UÇTAN UCA — gerçek kayıt (test verisi sonda silinir)");
// ---------------------------------------------------------------------------
const ONEK = "ZZTEST-";
let urunId: string | null = null;
let hesapId: string | null = null;
let kanalId: string | null = null;
const satisIdleri: string[] = [];

async function ucanUca() {
  try {
    const kanal = await prisma.channel.create({
      data: { name: `${ONEK}Kanal`, code: `${ONEK}K`, type: "MARKETPLACE" },
    });
    kanalId = kanal.id;

    const hesap = await prisma.channelAccount.create({
      data: {
        channelId: kanal.id,
        code: `${ONEK}H`,
        name: `${ONEK}Hesap`,
        defaultCurrency: "TRY",
      },
    });
    hesapId = hesap.id;

    const urun = await prisma.product.create({
      data: {
        name: `${ONEK}Ürün`,
        variants: {
          create: {
            sku: `${ONEK}SKU`,
            companySku: `${ONEK}FSKU`,
            isDefault: true,
          },
        },
      },
      include: { variants: true },
    });
    urunId = urun.id;
    const variantId = urun.variants[0].id;

    // İki parti: önce 3 adet (100 TRY), sonra 5 adet (120 TRY).
    const eski = await prisma.stockMovement.create({
      data: {
        variantId,
        type: "PURCHASE_IN",
        quantityDelta: 3,
        occurredAt: new Date("2026-01-01"),
        unitCostAmount: "100",
        unitCostCurrency: "TRY",
      },
    });
    const yeni = await prisma.stockMovement.create({
      data: {
        variantId,
        type: "PURCHASE_IN",
        quantityDelta: 5,
        occurredAt: new Date("2026-02-01"),
        unitCostAmount: "120",
        unitCostCurrency: "TRY",
      },
    });

    // --- 5 adet sat: 3 eski partiden + 2 yeni partiden gelmeli ---
    const satisId = await satisKaydet({
      code: `${ONEK}SIP-1`,
      channelAccountId: hesap.id,
      soldAt: new Date("2026-03-01"),
      note: null,
      cargoCarrierId: null,
      cargoDesi: null,
      cargoAmountManual: null,
      kalemler: [
        {
          variantId,
          quantity: 5,
          unitPriceAmount: "200",
          unitPriceCurrency: "TRY",
          vatRate: 20,
          commissionRate: null,
          commissionAmount: 0,
        },
      ],
    });
    satisIdleri.push(satisId);

    const cikislar = await prisma.stockMovement.findMany({
      where: { type: "SALE_OUT", variantId },
      orderBy: { createdAt: "asc" },
    });

    kontrol(
      "iki ayrı SALE_OUT hareketi yazıldı",
      cikislar.length === 2,
      cikislar.length,
    );
    kontrol(
      "adetler negatif ve doğru (-3, -2)",
      cikislar[0]?.quantityDelta === -3 && cikislar[1]?.quantityDelta === -2,
      cikislar.map((c) => c.quantityDelta),
    );
    kontrol(
      "partiler doğru sırayla tüketildi (eski önce)",
      cikislar[0]?.sourceMovementId === eski.id &&
        cikislar[1]?.sourceMovementId === yeni.id,
    );
    kontrol(
      "maliyet partiden kopyalandı (100 ve 120)",
      cikislar[0]?.unitCostAmount?.toString() === "100" &&
        cikislar[1]?.unitCostAmount?.toString() === "120",
      cikislar.map((c) => c.unitCostAmount?.toString()),
    );

    const kalanStok = await prisma.stockMovement.aggregate({
      where: { variantId },
      _sum: { quantityDelta: true },
    });
    kontrol(
      "stok 8 - 5 = 3",
      kalanStok._sum.quantityDelta === 3,
      kalanStok._sum,
    );

    // --- Yetersiz stok: 4 adet daha satılamaz (3 kaldı) ---
    let yakalandi: unknown = null;
    try {
      await satisKaydet({
        code: `${ONEK}SIP-2`,
        channelAccountId: hesap.id,
        soldAt: new Date("2026-03-02"),
        note: null,
        cargoCarrierId: null,
        cargoDesi: null,
        cargoAmountManual: null,
        kalemler: [
          {
            variantId,
            quantity: 4,
            unitPriceAmount: "200",
            unitPriceCurrency: "TRY",
            vatRate: 20,
            commissionRate: null,
            commissionAmount: 0,
          },
        ],
      });
    } catch (e) {
      yakalandi = e;
    }

    kontrol(
      "yetersiz stokta YetersizStokHatasi fırlatılır",
      yakalandi instanceof YetersizStokHatasi,
      yakalandi,
    );
    kontrol(
      "mevcut adet hatada bildirilir (3)",
      yakalandi instanceof YetersizStokHatasi && yakalandi.mevcut === 3,
    );

    const yarimSatis = await prisma.sale.findUnique({
      where: { code: `${ONEK}SIP-2` },
    });
    kontrol("reddedilen satıştan HİÇ kayıt kalmadı", yarimSatis === null);

    const stokDegismedi = await prisma.stockMovement.aggregate({
      where: { variantId },
      _sum: { quantityDelta: true },
    });
    kontrol(
      "reddedilen satış stoğu değiştirmedi",
      stokDegismedi._sum.quantityDelta === 3,
    );

    // --- Aynı varyant iki kalemde: partiler iki kez tüketilmemeli ---
    let cokKalemHatasi: unknown = null;
    try {
      await satisKaydet({
        code: `${ONEK}SIP-3`,
        channelAccountId: hesap.id,
        soldAt: new Date("2026-03-03"),
        note: null,
        cargoCarrierId: null,
        cargoDesi: null,
        cargoAmountManual: null,
        kalemler: [
          {
            variantId,
            quantity: 2,
            unitPriceAmount: "200",
            unitPriceCurrency: "TRY",
            vatRate: 20,
            commissionRate: null,
            commissionAmount: 0,
          },
          {
            variantId,
            quantity: 2,
            unitPriceAmount: "210",
            unitPriceCurrency: "TRY",
            vatRate: 20,
            commissionRate: null,
            commissionAmount: 0,
          },
        ],
      });
    } catch (e) {
      cokKalemHatasi = e;
    }
    kontrol(
      "aynı varyant iki kalemde toplam 4 > 3 ise reddedilir",
      cokKalemHatasi instanceof YetersizStokHatasi,
      cokKalemHatasi,
    );

    // --- Aynı varyant iki kalemde, toplam stoğa sığıyor ---
    const cokKalemId = await satisKaydet({
      code: `${ONEK}SIP-4`,
      channelAccountId: hesap.id,
      soldAt: new Date("2026-03-04"),
      note: null,
      cargoCarrierId: null,
      cargoDesi: null,
      cargoAmountManual: null,
      kalemler: [
        {
          variantId,
          quantity: 2,
          unitPriceAmount: "200",
          unitPriceCurrency: "TRY",
          vatRate: 20,
          commissionRate: null,
          commissionAmount: 0,
        },
        {
          variantId,
          quantity: 1,
          unitPriceAmount: "210",
          unitPriceCurrency: "TRY",
          vatRate: 20,
          commissionRate: null,
          commissionAmount: 0,
        },
      ],
    });
    satisIdleri.push(cokKalemId);

    const sonStok = await prisma.stockMovement.aggregate({
      where: { variantId },
      _sum: { quantityDelta: true },
    });
    kontrol(
      "stok tam sıfırlandı",
      sonStok._sum.quantityDelta === 0,
      sonStok._sum,
    );

    // --- Sipariş no benzersizliği ---
    let cakismaHatasi: unknown = null;
    try {
      await satisKaydet({
        code: `${ONEK}SIP-1`,
        channelAccountId: hesap.id,
        soldAt: new Date("2026-03-05"),
        note: null,
        cargoCarrierId: null,
        cargoDesi: null,
        cargoAmountManual: null,
        kalemler: [],
      });
    } catch (e) {
      cakismaHatasi = e;
    }
    kontrol(
      "aynı sipariş no ikinci kez kabul edilmez",
      cakismaHatasi instanceof SiparisNoCakismasiHatasi,
      cakismaHatasi,
    );

    ucanUcaTamamlandi = true;
  } catch (e) {
    // Beklenmeyen istisna da başarısızlıktır; temizlik yine de yapılsın diye
    // burada yakalanıp sayaca işleniyor.
    basarisiz++;
    console.log("  HATA  betik istisnayla kesildi");
    console.log("        ", e);
  } finally {
    // ------------------------- TEMİZLİK -------------------------
    // Ledger normalde silinmez; burada SADECE bu betiğin ürettiği test
    // verisi temizleniyor. Sıra önemli: hareketler -> satış -> ürün -> hesap.
    const testVaryantlari = await prisma.productVariant.findMany({
      where: { sku: { startsWith: ONEK } },
      select: { id: true },
    });
    const varyantIdleri = testVaryantlari.map((v) => v.id);

    if (varyantIdleri.length) {
      // Çıkışlar girişlere FK ile bağlı; önce çıkışlar silinmeli.
      await prisma.stockMovement.deleteMany({
        where: { variantId: { in: varyantIdleri }, quantityDelta: { lt: 0 } },
      });
      await prisma.stockMovement.deleteMany({
        where: { variantId: { in: varyantIdleri } },
      });
    }
    await prisma.sale.deleteMany({ where: { code: { startsWith: ONEK } } });
    if (urunId) await prisma.product.delete({ where: { id: urunId } });
    if (hesapId) await prisma.channelAccount.delete({ where: { id: hesapId } });
    if (kanalId) await prisma.channel.delete({ where: { id: kanalId } });

    const kalanTest = await prisma.product.count({
      where: { name: { startsWith: ONEK } },
    });
    console.log(`\nTemizlik: kalan test kaydı = ${kalanTest}`);

    if (!ucanUcaTamamlandi) {
      basarisiz++;
      console.log("  HATA  uçtan uca bölüm sonuna kadar çalışmadı");
    }

    console.log(
      basarisiz === 0
        ? `TÜM KONTROLLER GEÇTİ (${calisan})`
        : `${basarisiz} KONTROL BAŞARISIZ`,
    );
    process.exit(basarisiz === 0 ? 0 : 1);
  }
}

void ucanUca();
