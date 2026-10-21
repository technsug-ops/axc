/** BETIK SINIFI: SUREKLI — el kitabı ekran görüntüleri için AYRI yerel veritabanına (axcali_ekran) örnek veri kurar; başka adreste DURUR. */
/**
 * ============================================================================
 *  EL KİTABI EKRAN GÖRÜNTÜLERİ — ÖRNEK VERİ (K350-③, 21.10.2026)
 *      npm run ekran:veri
 *  KURULUM SIRASI (hepsi `.env.ekran` yüklüyken, DATABASE_URL=…/axcali_ekran):
 *    ① yerel MySQL: CREATE DATABASE axcali_ekran  ② npx prisma migrate deploy
 *    ③ npm run kullanici:olustur -- ornek@ornek.local "<parola>"  ④ npx tsx prisma/seed.ts
 *    ⑤ npm run ekran:veri  ⑥ sunucu: npx next dev -p 3100  ⑦ EKRAN_PAROLA=… npm run ekran:cek
 * ----------------------------------------------------------------------------
 *  NİYE VAR: kullanıcı «El kitabına ekran görüntüleriyle destek sağla» dedi ve
 *  «örnek veri» seçti. Gerçek defter fotoğraflanmaz (müşteri, kâr, kanal hesabı
 *  sızar); görüntüler bu betiğin kurduğu UYDURMA ama TUTARLI veriden çekilir.
 *  Satışlar sistemin KENDİ satış yolundan (`satisKaydet`: FIFO + kâr) girer —
 *  yani ekrandaki NET rakamları gerçek motorun ürettiği rakamlardır.
 *
 *  ⛔ YALNIZ `axcali_ekran`: adres yerel değilse YA DA veritabanı adı
 *  `axcali_ekran` değilse DURUR, çıkış 1. Günlük yerel veritabanına bile yazmaz.
 *  İkinci koşum zararsız: `ORN-` ürünleri varsa hiçbir şey eklemez.
 *  Ürün/firma adları VERİDİR ve hiçbir gerçek markayı taşımaz.
 *
 *  SAYIM KORUMASI YOK: yalnız bu betiğin sıfırdan kurduğu görüntü veritabanına yazar; orada
 *  sayım damgası olamaz, korunacak sayılmış raf yoktur. Başka adrese yazmayı en başta REDDEDER.
 * ============================================================================
 */
import "dotenv/config";

/** Sabit tohumlu sözde rastgele — her koşumda AYNI görüntü verisi. */
function rastgele(tohum: number) {
  let s = tohum;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

const URUNLER = [
  { ad: "Çelik Tencere Seti 7 Parça", maliyet: 1604, fiyat: 2499, kategori: "Genel", desi: 6 },
  { ad: "Smoothie Blender 300 W", maliyet: 999, fiyat: 1699, kategori: "Genel", desi: 4 },
  { ad: "Buharlı Ütü 2400 W", maliyet: 450.5, fiyat: 799.9, kategori: "İndirimli", desi: 3 },
  { ad: "Cam Su Isıtıcı 1,7 L", maliyet: 320, fiyat: 549, kategori: "Genel", desi: 2 },
  { ad: "Kablosuz Kulaklık", maliyet: 780, fiyat: 1299, kategori: "Genel", desi: 1 },
  { ad: "Araç Şarj Cihazı 75 W", maliyet: 410, fiyat: 699, kategori: "Süper İndirimli", desi: 1 },
  { ad: "Kablosuz Klavye", maliyet: 1890, fiyat: 2999, kategori: "Genel", desi: 2 },
  { ad: "Termos 1 L", maliyet: 560, fiyat: 949, kategori: "İndirimli", desi: 2 },
  { ad: "Tost Makinesi", maliyet: 870, fiyat: 1449, kategori: "Genel", desi: 4 },
  { ad: "Saç Kurutma Makinesi", maliyet: 640, fiyat: 1099, kategori: "Genel", desi: 2 },
  { ad: "Elektrikli Diş Fırçası", maliyet: 520, fiyat: 899, kategori: "İndirimli", desi: 1 },
  { ad: "Robot Süpürge", maliyet: 5200, fiyat: 7999, kategori: "Genel", desi: 8 },
];

async function main() {
  const adres = process.env.DATABASE_URL ?? "";
  if (!/@(localhost|127\.0\.0\.1)[:/]/.test(adres) || !/\/axcali_ekran(\?|$)/.test(adres)) {
    console.error("⛔ DURDU — DATABASE_URL yerel `axcali_ekran` değil. Bu betik yalnız görüntü veritabanına yazar.");
    process.exitCode = 1;
    return;
  }
  const { prisma } = await import("../src/lib/prisma");
  const { satisKaydet } = await import("../src/lib/satis");
  const r = rastgele(20261021);
  try {
    if ((await prisma.productVariant.count({ where: { sku: { startsWith: "ORN-" } } })) > 0) {
      console.log("örnek veri zaten var — eklenmedi");
      return;
    }
    await prisma.company.updateMany({ data: { name: "Örnek Firma" } });

    const simdi = new Date();
    const gunOnce = (g: number, saat = 10, dk = 0) => {
      const d = new Date(simdi.getTime() - g * 86_400_000);
      d.setUTCHours(saat - 3, dk, 0, 0); // İstanbul saati (UTC+3)
      return d;
    };

    /* Raflar · tedarikçi · kart */
    const raflar = [];
    for (const kod of ["A-01", "A-02", "A-03", "B-01", "B-02", "C-01"]) raflar.push(await prisma.location.create({ data: { code: kod, name: `Raf ${kod}` } }));
    const tedarikci = await prisma.supplier.create({ data: { name: "Örnek Tedarikçi" } });
    const kart = await prisma.creditCard.create({
      data: { label: "Örnek Kart", bankName: "Örnek Banka", last4: "4242", currency: "TRY", creditLimitAmount: "250000", creditLimitCurrency: "TRY", statementDay: 12, dueDay: 22 },
    });

    /* Kanal hesapları */
    const kanallar = await prisma.channel.findMany({ where: { code: { in: ["TRENDYOL", "HEPSIBURADA", "N11"] } } });
    const hesap = new Map<string, string>();
    for (const k of kanallar) hesap.set(k.code, (await prisma.channelAccount.create({ data: { channelId: k.id, code: `ORN-${k.code}`, name: "Örnek Mağaza", defaultCurrency: "TRY" } })).id);

    /* Ürünler */
    const kategoriler = new Map((await prisma.category.findMany()).map((c) => [c.name, c.id]));
    const varyantlar: { id: string; u: (typeof URUNLER)[number] }[] = [];
    for (const [i, u] of URUNLER.entries()) {
      const no = String(i + 1).padStart(3, "0");
      const urun = await prisma.product.create({
        data: {
          name: u.ad,
          ...(kategoriler.get(u.kategori) ? { categoryId: kategoriler.get(u.kategori)! } : {}),
          variants: { create: { sku: `ORN-${no}`, companySku: `FSKU-${no}`, barcode: `86900000${String(10000 + i)}`, isDefault: true, locationId: raflar[i % raflar.length]!.id } },
        },
        include: { variants: true },
      });
      const v = urun.variants[0]!.id;
      varyantlar.push({ id: v, u });
      for (const [kod, hid] of hesap) {
        await prisma.channelSku.create({ data: { channelAccountId: hid, variantId: v, channelSku: `${kod.slice(0, 2)}-${no}`, commissionRate: kod === "TRENDYOL" ? "15" : kod === "HEPSIBURADA" ? "12" : "10" } });
      }
    }

    /* Alımlar — 4 parti, mal kabulü yapılmış; sonuncusu yolda (mal kabul bekliyor) */
    const partiler = [
      { gun: 44, kalemler: [0, 1, 2, 3, 4, 5], adet: 12 },
      { gun: 30, kalemler: [6, 7, 8, 9], adet: 10 },
      { gun: 16, kalemler: [10, 11, 0, 4], adet: 8 },
      { gun: 2, kalemler: [1, 3, 7], adet: 6, yolda: true },
    ];
    for (const [pi, p] of partiler.entries()) {
      const tarih = gunOnce(p.gun, 11);
      const alim = await prisma.purchase.create({
        data: {
          code: `ALM-2026-${String(pi + 1).padStart(4, "0")}`,
          status: p.yolda ? "ORDERED" : "RECEIVED",
          supplierId: tedarikci.id,
          supplierName: tedarikci.name,
          supplierOrderNo: `SIP-${70010 + pi}`,
          purchasedAt: tarih,
          receivedAt: p.yolda ? null : gunOnce(p.gun - 1, 14),
          creditCardId: kart.id,
          installmentCount: pi % 2 === 0 ? 3 : 1,
          items: { create: p.kalemler.map((k) => ({ variantId: varyantlar[k]!.id, quantity: p.adet, unitCostAmount: String(varyantlar[k]!.u.maliyet), unitCostCurrency: "TRY" as const })) },
        },
        include: { items: true },
      });
      if (p.yolda) continue;
      for (const kalem of alim.items) {
        await prisma.stockMovement.create({
          data: {
            variantId: kalem.variantId,
            type: "PURCHASE_IN",
            quantityDelta: kalem.quantity,
            occurredAt: gunOnce(p.gun - 1, 14),
            purchaseItemId: kalem.id,
            locationId: raflar[varyantlar.findIndex((v) => v.id === kalem.variantId) % raflar.length]!.id,
            unitCostAmount: kalem.unitCostAmount,
            unitCostCurrency: "TRY",
            note: `Mal kabul — ${alim.code}`,
          },
        });
      }
    }

    /* Satışlar — son 28 gün; bugün de birkaç sipariş. Sistemin kendi yolu (FIFO + kâr). */
    const aras = await prisma.cargoCarrier.findFirst({ where: { name: "Aras Kargo" } });
    const kanalSirasi = ["TRENDYOL", "TRENDYOL", "HEPSIBURADA", "TRENDYOL", "HEPSIBURADA", "N11"];
    let no = 0;
    for (let gun = 27; gun >= 0; gun--) {
      const adet = gun === 0 ? 4 : 1 + Math.floor(r() * 2.4);
      for (let s = 0; s < adet; s++) {
        no++;
        const kanal = kanalSirasi[Math.floor(r() * kanalSirasi.length)]!;
        const hid = hesap.get(kanal);
        if (!hid) continue;
        const soldAt = gunOnce(gun, 9 + Math.floor(r() * 11), Math.floor(r() * 60));
        if (soldAt > simdi) soldAt.setTime(simdi.getTime() - 3_600_000);
        /* FIFO satış GÜNÜNDEN önce gelmiş partiyi tüketir — stok o güne göre ölçülür. */
        const stoklu = [];
        for (const v of varyantlar) {
          const st = await prisma.stockMovement.aggregate({ where: { variantId: v.id, occurredAt: { lte: soldAt } }, _sum: { quantityDelta: true } });
          if ((st._sum.quantityDelta ?? 0) > 1) stoklu.push(v);
        }
        if (stoklu.length === 0) continue;
        const v = stoklu[Math.floor(r() * stoklu.length)]!;
        const miktar = r() < 0.12 ? 2 : 1;
        const oran = kanal === "TRENDYOL" ? 15 : kanal === "HEPSIBURADA" ? 12 : 10;
        const fiyat = v.u.fiyat;
        const id = await satisKaydet({
          code: kanal === "HEPSIBURADA" ? `42${String(74800000 + no)}` : `11${String(734600000 + no)}`,
          shipmentCode: null,
          channelAccountId: hid,
          soldAt,
          note: null,
          cargoCarrierId: aras?.id ?? null,
          cargoDesi: v.u.desi,
          cargoAmountManual: Math.round((60 + v.u.desi * 9) * 1.2 * 100) / 100,
          kalemler: [{ variantId: v.id, quantity: miktar, unitPriceAmount: String(fiyat), unitPriceCurrency: "TRY", vatRate: 20, commissionRate: oran, commissionAmount: Math.round(fiyat * miktar * oran) / 100, secilenPartiId: null }],
        });
        /* Kargo/teslim izi: eski siparişler teslim edilmiş, dünküler yolda, bugünküler bekliyor. */
        if (gun >= 1) {
          await prisma.sale.update({
            where: { id },
            data: { shippedAt: gunOnce(gun - (gun >= 1 ? 1 : 0), 15), ...(gun >= 4 ? { deliveredAt: gunOnce(gun - 3, 13) } : {}) },
          });
        }
      }
    }

    /* Giderler */
    const giderKat = new Map((await prisma.expenseCategory.findMany()).map((c) => [c.name, c.id]));
    const giderler = [
      { kat: "Kira", tutar: 12000, gun: 20, kdv: 20, aciklama: "Depo kirası" },
      { kat: "Muhasebe", tutar: 3500, gun: 18, kdv: 20, aciklama: "Aylık muhasebe ücreti" },
      { kat: "Sarf malzeme", tutar: 1840.5, gun: 9, kdv: 20, aciklama: "Koli ve bant" },
      { kat: "Abonelik", tutar: 649, gun: 5, kdv: 20, aciklama: "Yazılım aboneliği" },
    ];
    for (const g of giderler) {
      const kat = giderKat.get(g.kat);
      if (!kat) continue;
      await prisma.expense.create({ data: { spentAt: gunOnce(g.gun, 12), categoryId: kat, amount: String(g.tutar), currency: "TRY", vatRate: String(g.kdv), description: g.aciklama, odemeYontemi: g.kat === "Sarf malzeme" ? "KART" : "HAVALE", ...(g.kat === "Sarf malzeme" ? { creditCardId: kart.id } : {}) } });
    }

    /* Hedefler — ekranda hem geçilmiş hem süren hedef görünsün. */
    /* Yıl başından geçerli: hafta/ay/çeyrek pencerelerinin başında da hedef tanımlı olsun. */
    const bugun = new Date(Date.UTC(simdi.getUTCFullYear(), 0, 1));
    for (const h of [
      { olcut: "CIRO" as const, donem: "GUN" as const, tutar: "5000" },
      { olcut: "CIRO" as const, donem: "HAFTA" as const, tutar: "30000" },
      { olcut: "NET2" as const, donem: "AY" as const, tutar: "15000" },
      { olcut: "SIPARIS" as const, donem: "AY" as const, tutar: "60" },
    ]) await prisma.hedef.create({ data: { ...h, gecerlilik: bugun } });

    const ozet = {
      urun: await prisma.product.count(),
      alim: await prisma.purchase.count(),
      satis: await prisma.sale.count(),
      kari_hesaplanan: await prisma.sale.count({ where: { profitStatus: "CALCULATED" } }),
      gider: await prisma.expense.count(),
    };
    console.log("örnek veri kuruldu:", JSON.stringify(ozet));
    if (ozet.satis < 20 || ozet.kari_hesaplanan < ozet.satis * 0.8) {
      console.error("⛔ örnek veri EKSİK — ekranlar boş/yanlış görünür:", JSON.stringify(ozet));
      process.exitCode = 1;
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("⛔ ÖRNEK VERİ HATASI:", e);
  process.exitCode = 1;
});
