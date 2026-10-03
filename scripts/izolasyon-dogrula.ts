import "dotenv/config";

/**
 * ============================================================================
 *  FİRMA İZOLASYONU BEKÇİSİ — K303 Aşama 4 (03.10.2026)
 * ----------------------------------------------------------------------------
 *      npm run izolasyon:dogrula
 *
 *  Tasarım §4: «A firmasının oturumu B'nin satırını GÖRMEMELİ (yanlış susma)
 *  ve kendi satırını KAYBETMEMELİ (yanlış yanma)» — İKİ YÖN ayrı sınanır.
 *
 *  GERÇEK VERİTABANINDA, GERÇEK SÜZGEÇLE: iki GEÇİCİ firma açılır, ikisine de
 *  AYNI SKU'lu ürün yazılır, sonra her firmanın bağlamında okunur/yazılır.
 *  Bütün sınama TEK işlemin içinde koşar ve sonunda GERİ ALINIR — hiçbir
 *  veritabanında iz kalmaz (geri alındığı da ayrıca ölçülür).
 *
 *  Firma, istekteki gibi bağlamdan gelir (`firmaBaglamindaCalistir`); işlem
 *  istemcisi süzgeçlidir ve firmayı HER sorguda bağlamdan okur.
 * ============================================================================
 */

const BOLUM_SAYISI = 7;
const kosanBolumler: string[] = [];
let gecen = 0;
let hata = 0;
function kontrol(ad: string, kosul: boolean, gorulen?: unknown) {
  if (kosul) { gecen++; console.log("  OK    " + ad); }
  else { hata++; console.log("  HATA  " + ad + (gorulen !== undefined ? `  (görülen: ${JSON.stringify(gorulen)})` : "")); }
}
const GERI_AL = "IZOLASYON_GERI_AL";
const ONEK = "ZZIZO-";

async function main() {
  const { prisma, sistemPrisma } = await import("../src/lib/prisma");
  const { firmaBaglamindaCalistir } = await import("../src/lib/firma-baglami");

  // SISTEM: kanal ortak tablodur; sınama hesabı için var olan bir kanal seçilir.
  const kanal = await sistemPrisma.channel.findFirst({ select: { id: true } });
  if (!kanal) throw new Error("kanal yok — bekçi koşamaz");

  try {
    await prisma.$transaction(
      async (tx) => {
        const A = await tx.company.create({ data: { name: `${ONEK}A`, code: `${ONEK}A` } });
        const B = await tx.company.create({ data: { name: `${ONEK}B`, code: `${ONEK}B` } });
        const firmada = <T>(f: { id: string }, is: () => Promise<T>) => firmaBaglamindaCalistir(f.id, is);

        /* Her firmaya: aynı SKU'lu ürün + varyant + kanal hesabı + satış */
        const kur = (f: { id: string }, etiket: string) =>
          firmada(f, async () => {
            const urun = await tx.product.create({
              data: { name: `${ONEK}urun-${etiket}`, variants: { create: { sku: `${ONEK}SKU`, companySku: `${ONEK}FSKU`, isDefault: true } } },
              include: { variants: true },
            });
            const hesap = await tx.channelAccount.create({
              data: { channelId: kanal.id, code: `${ONEK}H`, name: `${ONEK}hesap-${etiket}`, defaultCurrency: "TRY" },
            });
            const satis = await tx.sale.create({
              data: {
                code: `${ONEK}SAT`, channelAccountId: hesap.id, soldAt: new Date(),
                items: { create: { variantId: urun.variants[0]!.id, quantity: 1, unitPriceAmount: "100", unitPriceCurrency: "TRY" } },
              },
              include: { items: true },
            });
            return { urun, varyant: urun.variants[0]!, hesap, satis };
          });

        /* ① FİRMA İÇİ TEKİL — iki firmada aynı SKU/satış kodu/hesap kodu */
        const a = await kur(A, "A");
        const b = await kur(B, "B");
        kontrol("iki firmada AYNI SKU, AYNI satış kodu, AYNI hesap kodu açılabildi", a.varyant.sku === b.varyant.sku && a.satis.code === b.satis.code);
        kontrol("  ...her kayıt kendi firmasına yazıldı (süzgeç)", a.urun.companyId === A.id && b.urun.companyId === B.id && a.satis.companyId === A.id);
        kontrol("  ...iç içe oluşturulan varyant ve satış kalemi de kendi firmasında",
          a.varyant.companyId === A.id && a.satis.items[0]!.companyId === A.id && b.satis.items[0]!.companyId === B.id);
        kosanBolumler.push("tekil");

        /* ② GÖRMEME — A, B'nin satırını görmez (yanlış susma) */
        await firmada(A, async () => {
          const urunler = await tx.product.findMany({ where: { name: { startsWith: ONEK } }, select: { id: true } });
          kontrol("A ürün listesinde yalnız KENDİ ürünü (1)", urunler.length === 1 && urunler[0]!.id === a.urun.id, urunler.length);
          kontrol("A, B'nin ürününü kimliğiyle bile bulamaz (findUnique → null)", (await tx.product.findUnique({ where: { id: b.urun.id } })) === null);
          kontrol("A, B'nin satışını SKU/satış koduyla bulamaz", (await tx.sale.findFirst({ where: { id: b.satis.id } })) === null);
          const say = await tx.sale.count({ where: { code: `${ONEK}SAT` } });
          kontrol("A satış sayımı yalnız kendi (1)", say === 1, say);
          const ag = await tx.saleItem.aggregate({ _sum: { quantity: true }, where: { sale: { code: `${ONEK}SAT` } } });
          kontrol("A toplamı yalnız kendi kalemleri (aggregate 1)", ag._sum.quantity === 1, ag._sum.quantity);
        });
        kosanBolumler.push("gormeme");

        /* ③ KAYBETMEME — B kendi satırını görür (yanlış yanma) */
        await firmada(B, async () => {
          const v = await tx.productVariant.findFirst({ where: { sku: `${ONEK}SKU` }, select: { id: true, companyId: true } });
          kontrol("B kendi varyantını SKU ile bulur", v?.id === b.varyant.id && v?.companyId === B.id);
          const s = await tx.sale.findFirst({ where: { code: `${ONEK}SAT` }, include: { items: { include: { variant: true } } } });
          kontrol("B kendi satışını kalemi ve varyantıyla okur", s?.id === b.satis.id && s?.items[0]?.variant.id === b.varyant.id);
        });
        kosanBolumler.push("kaybetmeme");

        /* ④ YAZMA — A, B'nin satırını değiştiremez/silemez; toplu işlem yalnız kendi */
        await firmada(A, async () => {
          let atti = false;
          try { await tx.product.update({ where: { id: b.urun.id }, data: { name: `${ONEK}SALDIRI` } }); } catch { atti = true; }
          kontrol("A, B'nin ürününü kimlikle GÜNCELLEYEMEZ", atti);
          const n = await tx.product.updateMany({ where: { name: { startsWith: ONEK } }, data: { isFavorite: true } });
          kontrol("A'nın toplu güncellemesi yalnız kendi satırına (1)", n.count === 1, n.count);
        });
        await firmada(B, async () => {
          const u = await tx.product.findFirst({ where: { id: b.urun.id }, select: { name: true, isFavorite: true } });
          kontrol("  ...B'nin ürünü DEĞİŞMEDİ (ad ve işaret aynı)", u?.name === `${ONEK}urun-B` && u?.isFavorite === false, u);
        });
        kosanBolumler.push("yazma");

        /* ⑤ ÇAKIŞMA — A bağlamında B'nin kimliğiyle yazım HATA */
        await firmada(A, async () => {
          let kod = "";
          try { await tx.product.create({ data: { name: `${ONEK}x`, companyId: B.id } }); } catch (e) { kod = (e as Error).message; }
          kontrol("A bağlamında companyId=B ile yazım FIRMA_CAKISMASI", kod.startsWith("FIRMA_CAKISMASI"), kod.slice(0, 60));
        });
        kosanBolumler.push("cakisma");

        /* ⑥ BAĞ KAPISI — A'nın kaydı B'nin kaydına BAĞLANAMAZ (tasarım §4.5) */
        await firmada(A, async () => {
          let reddedildi = false;
          let mesaj = "";
          try {
            await tx.saleItem.create({ data: { saleId: a.satis.id, variantId: b.varyant.id, quantity: 1, unitPriceAmount: "1", unitPriceCurrency: "TRY" } });
          } catch (e) { reddedildi = true; mesaj = (e as Error).message; }
          kontrol("A'nın satış kalemi B'nin VARYANTINA bağlanamaz", reddedildi, mesaj.slice(0, 80) || "kabul edildi");
          let r2 = false;
          try {
            await tx.sale.create({ data: { code: `${ONEK}SAT2`, channelAccountId: b.hesap.id, soldAt: new Date() } });
          } catch { r2 = true; }
          kontrol("A'nın satışı B'nin KANAL HESABINA bağlanamaz", r2);
          let r3 = false;
          try {
            await tx.sale.create({ data: { code: `${ONEK}SAT3`, soldAt: new Date(), channelAccount: { connect: { id: b.hesap.id } } } });
          } catch { r3 = true; }
          kontrol("A'nın satışı B'nin hesabına `connect` ile de bağlanamaz", r3);
        });
        kosanBolumler.push("bag-kapisi");

        /* ⑦ SINIR — süzgeçsiz istemci ikisini de görür (sınamanın kendisi ölçüyor mu) */
        // SISTEM: kontrol — süzgeçsiz bakışta iki firmanın ürünü de var olmalı; yoksa sınama boş kümeyi ölçüyordur.
        const ham = await tx.$queryRawUnsafe<{ n: bigint }[]>(
          "SELECT COUNT(*) n FROM `Product` WHERE name LIKE ?", `${ONEK}urun-%`,
        );
        kontrol("taban DOLU: süzgeçsiz bakışta iki firmanın ürünü de var (2)", Number(ham[0]!.n) === 2, Number(ham[0]!.n));
        kosanBolumler.push("taban");

        throw new Error(GERI_AL);
      },
      { timeout: 120_000, maxWait: 20_000 },
    );
  } catch (e) {
    if (!(e instanceof Error) || e.message !== GERI_AL) throw e;
  }

  // SISTEM: geri alma ölçümü — sınama hiçbir iz bırakmamalı.
  const kalan = await sistemPrisma.company.count({ where: { code: { startsWith: ONEK } } });
  kontrol("sınama GERİ ALINDI — geçici firma kalmadı", kalan === 0, kalan);
  await sistemPrisma.$disconnect();
}

console.log("\nFİRMA İZOLASYONU BEKÇİSİ\n");
main().then(
  () => {
    if (kosanBolumler.length !== BOLUM_SAYISI) {
      console.log(`\nKOŞUM YARIM KALDI (${kosanBolumler.length}/${BOLUM_SAYISI}) — sonuç GEÇERSİZ`);
      process.exit(1);
    }
    console.log("\n" + (hata === 0 ? "TÜM KONTROLLER GEÇTİ" : "BAŞARISIZ") + ` (${gecen}/${gecen + hata})\n`);
    process.exit(hata === 0 ? 0 : 1);
  },
  (e) => {
    console.log("\nBEKÇİ ÇÖKTÜ — sonuç GEÇERSİZ:", e instanceof Error ? `${e.name}: ${e.message}`.replace(/\s+/g, " ") : e);
    process.exit(1);
  },
);
