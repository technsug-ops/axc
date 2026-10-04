import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

/**
 * ============================================================================
 *  DENEME KURULUMU — İKİNCİ FİRMA «Damisell» (K303 Aşama 4b, 03.10.2026)
 * ----------------------------------------------------------------------------
 *  BETIK SINIFI: TEK_SEFERLIK — yalnız deneme veritabanına (3307) ikinci firmayı
 *  ve örnek verisini kurar; canlıya ve geliştirme veritabanına yazamaz (hedef
 *  kilidi + DENEME_ORTAMI şartı).
 *
 *  ⛔ TAMAMI-YA-HİÇBİRİ DEĞİL — ve bu bilerek söyleniyor: tohumlar firma
 *  istemcisiyle, satış kendi işlemiyle yazıyor; tek işleme sığmıyor. Bu yüzden:
 *   · KOŞMADAN ÖNCE deneme veritabanının YEDEĞİ alınır (koşum adımı, betik dışı)
 *     — yarım kalırsa o yedeğe dönülür; firma silinemez (bağları RESTRICT).
 *   · Firma ZATEN VARSA: kurulum TAMAMSA (giriş kullanıcısı + üyeliği var)
 *     hiçbir şey yazılmaz; YARIMSA betik DURUR ve ne bulduğunu söyler —
 *     «zaten kurulu» deyip yarım firmayı geçmez.
 *   · Yazmayı engelleyecek her şart (giriş dosyası, e-posta) YAZMADAN ÖNCE.
 *
 *  Kullanıcı kararı 03.10.2026: ikinci firma DEMO «Damisell»; ad VERİDİR
 *  (`DENEME_FIRMA_ADI`), yapıya gömülmez. Verisi ÖRNEKTİR — izolasyonu ekranda
 *  göstermek içindir, Halil testinin «gerçek veri» şartının yerine geçmez.
 *
 *  Sistemin KENDİ gövdeleri: firmaya ait tohumlar firma istemcisiyle, satış
 *  uygulamanın satış kaydıyla (`satisKaydet` — FIFO, kâr, stok düşümü).
 *  ⚠ MAL KABUL bir ekran eylemidir (`malKabulEt`: yetki + oturum + yönlendirme),
 *  betikten çağrılamaz. Betik ONUN yazdığı hareketin AYNISINI yazar (PURCHASE_IN
 *  · purchaseItemId · birim maliyet · «Mal kabul — kod» notu; raf seçilmemiş)
 *  ve alımı onun yeniden hesabıyla aynı sonuca koyar (RECEIVED + receivedAt).
 *  Varsayılan alımda iniş maliyeti = fatura fiyatı (K309), yani maliyet aynı.
 *  Bilerek bir Axcali ürünüyle AYNI barkodlu ürün açılır (firma içi tekillik).
 *
 *      npx tsx scripts/deneme-damisell-kur.ts
 * ============================================================================
 */

const GIRIS_DOSYASI = "C:/Users/yapra/Desktop/axcali-deneme-damisell-giris.txt";
const EPOSTA = "damisell@damisell.local";

async function main() {
  const env = readFileSync(".env", "utf8");
  const adres = /^DATABASE_URL="?([^"\r\n]+)"?/m.exec(env)?.[1] ?? "";
  if (!/@127\.0\.0\.1:3307\/selliora_deneme(\?|$)/.test(adres)) throw new Error("HEDEF selliora_deneme (3307) DEĞİL — hiçbir şey yazılmadı");
  if (!/^DENEME_ORTAMI="?1"?/m.test(env)) throw new Error("DENEME_ORTAMI=1 değil — hiçbir şey yazılmadı");
  const firmaAdi = /^DENEME_FIRMA_ADI="?([^"\r\n]+)"?/m.exec(env)?.[1]?.trim();
  if (!firmaAdi) throw new Error("DENEME_FIRMA_ADI tanımlı değil");
  process.env.DATABASE_URL = adres;

  const { sistemPrisma, prisma } = await import("../src/lib/prisma");
  const { firmaIstemcisi } = await import("../src/lib/firma-istemcisi");
  const { firmaBaglamindaCalistir } = await import("../src/lib/firma-baglami");
  const { karMotoruSeed } = await import("../prisma/seed-kar-motoru");
  const { iadeSeed } = await import("../prisma/seed-iade");
  const { giderSeed } = await import("../prisma/seed-gider");
  const { stokDuzeltmeSeed } = await import("../prisma/seed-stok-duzeltme");
  const { yetkiSeed } = await import("../prisma/seed-yetki");
  const { parolaOzetle } = await import("../src/lib/parola");
  const { satisKaydet } = await import("../src/lib/satis");

  // SISTEM: firma açılışı firmalar-üstü bir işlemdir.
  const varMi = await sistemPrisma.company.findUnique({ where: { code: "DMS" } });
  // SISTEM: kullanıcı küreseldir; üyelik firmalar-üstü okunur (yalnız okuma).
  const varolanKullanici = await sistemPrisma.user.findUnique({
    where: { email: EPOSTA },
    select: { id: true, userCompanyRoles: { select: { companyId: true } } },
  });
  if (varMi) {
    const tamam = Boolean(varolanKullanici?.userCompanyRoles.some((u) => u.companyId === varMi.id));
    await sistemPrisma.$disconnect();
    if (tamam) {
      console.log(`⏭ ${varMi.name} zaten TAM kurulu (firma + giriş kullanıcısı + üyelik) — hiçbir şey yazılmadı.`);
      return;
    }
    throw new Error(
      `YARIM KURULUM: firma ${varMi.code} var ama giriş kullanıcısı/üyeliği ${varolanKullanici ? "üyeliksiz" : "yok"} — hiçbir şey yazılmadı; koşumdan önce alınan yedeğe dönün`,
    );
  }
  if (varolanKullanici) throw new Error(`${EPOSTA} zaten var (firma yokken) — hiçbir şey yazılmadı`);
  if (existsSync(GIRIS_DOSYASI)) throw new Error("giriş dosyası zaten var — hiçbir şey yazılmadı (eski dosyayı kaldırın)");

  const firma = await sistemPrisma.company.create({ data: { name: firmaAdi, code: "DMS" } });
  console.log(`Firma açıldı: ${firma.name} (${firma.code})`);

  /* 1) Firmanın kendi tanımları — sistemin tohumları, FİRMA İSTEMCİSİYLE */
  const fp = firmaIstemcisi(adres, firma.id);
  try {
    await karMotoruSeed(fp, firma.id);
    await iadeSeed(fp, firma.id);
    await giderSeed(fp, firma.id);
    await stokDuzeltmeSeed(fp, firma.id);
    await yetkiSeed(fp, firma);
  } finally {
    await fp.$disconnect();
  }

  /* 2) Örnek veri — firmanın BAĞLAMINDA, uygulamanın ortak istemcisiyle */
  // SISTEM: ortak kanal tablosu + Axcali'den paylaşılacak bir barkod (yalnız okuma).
  const ty = await sistemPrisma.channel.findUniqueOrThrow({ where: { code: "TRENDYOL" }, select: { id: true } });
  const axcBarkod = await sistemPrisma.productVariant.findFirst({
    where: { company: { code: "AXC" }, barcode: { not: null }, isActive: true },
    select: { barcode: true, product: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });

  const ozet = await firmaBaglamindaCalistir(firma.id, async () => {
    const kategori = await prisma.category.findFirstOrThrow({ orderBy: { name: "asc" }, select: { id: true, name: true } });
    const hesap = await prisma.channelAccount.create({
      data: { channelId: ty.id, code: "DAMISELL", name: `Trendyol — ${firmaAdi}`, defaultCurrency: "TRY", satisIcin: true, alisIcin: false },
    });
    const urunler = [
      { ad: "Saten Gömlek — Krem", sku: "DMS-0001", maliyet: "420", fiyat: "899" },
      { ad: "Keten Pantolon — Bej", sku: "DMS-0002", maliyet: "510", fiyat: "1099" },
      { ad: "Örgü Hırka — Antrasit", sku: "DMS-0003", maliyet: "380", fiyat: "799" },
      { ad: `Ortak ürün (Axcali ile aynı barkod) — ${axcBarkod?.product.name ?? "örnek"}`, sku: "DMS-0004", maliyet: "250", fiyat: "549", barkod: axcBarkod?.barcode ?? null },
    ];
    const varyantlar: { id: string; fiyat: string }[] = [];
    for (const u of urunler) {
      const p = await prisma.product.create({
        data: {
          name: u.ad, categoryId: kategori.id,
          variants: { create: { sku: u.sku, companySku: u.sku, barcode: u.barkod ?? null, isDefault: true } },
        },
        include: { variants: { select: { id: true } } },
      });
      varyantlar.push({ id: p.variants[0]!.id, fiyat: u.fiyat });
    }
    /* Alım + mal kabul (her üründen 10 adet) — partiler FIFO'ya girer */
    const simdi = new Date();
    const alim = await prisma.purchase.create({
      data: {
        code: "DMS-ALIM-0001", purchasedAt: simdi, receivedAt: simdi, status: "RECEIVED",
        supplierName: "Örnek Tedarikçi", note: "Deneme kurulumu örnek alımı",
        items: { create: urunler.map((u, i) => ({ variantId: varyantlar[i]!.id, quantity: 10, unitCostAmount: u.maliyet, unitCostCurrency: "TRY" })) },
      },
      include: { items: true },
    });
    for (const k of alim.items) {
      await prisma.stockMovement.create({
        data: {
          variantId: k.variantId, type: "PURCHASE_IN", quantityDelta: 10, occurredAt: simdi, purchaseItemId: k.id,
          unitCostAmount: k.unitCostAmount, unitCostCurrency: k.unitCostCurrency, note: `Mal kabul — ${alim.code}`,
        },
      });
    }
    /* Satış — uygulamanın kendi satış kaydıyla (FIFO, kâr, stok düşümü) */
    const satisId = await satisKaydet({
      code: "DMS-SAT-0001", shipmentCode: null, channelAccountId: hesap.id, soldAt: new Date(simdi.getTime() + 60_000),
      note: "Deneme kurulumu örnek satışı",
      kalemler: [
        { variantId: varyantlar[0]!.id, quantity: 2, unitPriceAmount: varyantlar[0]!.fiyat, unitPriceCurrency: "TRY", vatRate: 20, commissionRate: 18, commissionAmount: null, secilenPartiId: null },
        { variantId: varyantlar[3]!.id, quantity: 1, unitPriceAmount: varyantlar[3]!.fiyat, unitPriceCurrency: "TRY", vatRate: 20, commissionRate: 18, commissionAmount: null, secilenPartiId: null },
      ],
      cargoCarrierId: null, cargoDesi: null, cargoAmountManual: null,
    });
    return { kategori: kategori.name, urun: urunler.length, alim: alim.code, satisId, ortakBarkod: Boolean(axcBarkod?.barcode) };
  });
  console.log(`Örnek veri: ${ozet.urun} ürün · kategori «${ozet.kategori}» · alım ${ozet.alim} (40 adet) · satış 1 · ortak barkod: ${ozet.ortakBarkod ? "var" : "YOK"}`);

  /* 3) Damisell giriş kullanıcısı — YALNIZ Damisell üyesi */
  const parola = randomBytes(12).toString("base64url");
  // SISTEM: kullanıcı küreseldir (tasarım §2); üyelik aşağıda firma bağlamında.
  const kullanici = await sistemPrisma.user.create({
    data: { email: EPOSTA, name: `${firmaAdi} Deneme`, passwordHash: await parolaOzetle(parola), mustChangePassword: false },
  });
  await firmaBaglamindaCalistir(firma.id, async () => {
    const sahip = await prisma.role.findFirstOrThrow({ where: { isSystem: true }, select: { id: true, name: true } });
    await prisma.userCompanyRole.create({ data: { userId: kullanici.id, companyId: firma.id, roleId: sahip.id } });
  });
  // `wx`: dosya bu arada oluştuysa ÜZERİNE YAZMAZ (varlığı en başta da soruldu).
  writeFileSync(GIRIS_DOSYASI, `SELLIORA DENEME — ${firmaAdi} (yalniz bu bilgisayar)\nAdres : http://localhost:3100\nFirma kodu: ${firma.code}\nE-posta: ${EPOSTA}\nParola : ${parola}\n`, { flag: "wx" });
  console.log(`Giriş kullanıcısı: ${EPOSTA} · parola masaüstündeki dosyada (ekrana basılmadı)`);
  await sistemPrisma.$disconnect();
}

main().catch((e) => {
  console.error("HATA:", e instanceof Error ? `${e.name}: ${e.message}`.replace(/\s+/g, " ") : e);
  process.exitCode = 1;
});
