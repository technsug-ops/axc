import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  K121c KURU KOŞUM — ÜÇ ÇIPLAK DAL ORTAK GÖVDEYE BAĞLANIRSA NE DEĞİŞİR
 * ----------------------------------------------------------------------------
 *      npm run canli:k121c-kuru
 *
 *  BETIK SINIFI: SUREKLI — hiçbir yere YAZMAZ.
 *
 *  Mimarın sorduğu iki soru:
 *    ① kaç iade kaydını etkiliyor
 *    ② hangi pasif listing iade aramasında artık görünür
 *  Ayrıca /stok ve /urunler için "davranış değişmez" İDDİASI da ölçülüyor —
 *  iddia sınanmadan taşınmaz.
 * ============================================================================
 */

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) { console.log("⛔", y.hata); process.exitCode = 1; return; }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");
  const { aramaKosulu, kodEsdegerleri } = await import("../src/lib/varyant-arama-kurali");
  const { iadeAramaKosulu } = await import("../src/lib/iade/arama");

  console.log("");
  console.log("K121c KURU KOŞUM · " + new Date().toISOString());
  console.log("=".repeat(74));

  const pasifListingler = await prisma.channelSku.findMany({
    where: { isActive: false },
    select: { channelSku: true, variant: { select: { sku: true, id: true } } },
  });
  const iadeToplam = await prisma.return.count();
  console.log(`taban: iade kaydı ${iadeToplam} · pasif listing ${pasifListingler.length}`);

  /* ═══ ① İADE ARAMASI — ESKİ (süzgeçli) vs YENİ (ortak gövde) ═══════ */
  console.log("");
  console.log("① İADE ARAMASI — pasif listing kodları");
  let etkilenenIade = 0;
  for (const l of pasifListingler) {
    const eski = await prisma.return.count({
      where: iadeAramaKosulu(l.channelSku) as never,
    });
    /**
     * YENİ hâl: kanal dalı ortak gövdeden gelir, yani `isActive` şartı YOK.
     * Ölçüm için elle kuruluyor — yazımdan önce ETKİYİ görmek şart.
     */
    const yeni = await prisma.return.count({
      where: {
        OR: kodEsdegerleri(l.channelSku).map((e) => ({
          items: { some: { variant: { OR: aramaKosulu(e) } } },
        })),
      } as never,
    });
    console.log(`   ${l.channelSku.padEnd(16)} → ${l.variant.sku.padEnd(14)} ÖNCE ${eski} · SONRA ${yeni}`);
    if (eski !== yeni) etkilenenIade += yeni - eski;
  }
  console.log(`   → etkilenen iade kaydı: ${etkilenenIade}`);

  /** O varyantların iadeyle bağı hiç var mı — "0" niye 0 olduğunu söylesin. */
  for (const l of pasifListingler) {
    const kalem = await prisma.returnItem.count({ where: { variantId: l.variant.id } });
    const satisKalemi = await prisma.saleItem.count({ where: { variantId: l.variant.id } });
    console.log(`   ${l.variant.sku}: iade kalemi ${kalem} · satış kalemi ${satisKalemi}`);
  }

  /* ═══ ② /stok — inline dal ile ortak gövde AYNI SONUCU MU VERİYOR ═══ */
  console.log("");
  console.log("② /stok — inline dal vs ortak gövde (davranış değişmez İDDİASI)");
  /**
   * ⚠ ÖRNEKLEM TEK KOD TÜRÜNDEN OLMAZ. İlk turda yalnız kanal kodlarıyla
   * sınadım; inline dal ile ortak gövde BEŞ dal taşıyor (sku · firmaSKU ·
   * barkod · ürün adı · kanal kodu) ve yalnız birini sınayan bir ölçüm
   * ötekiler hakkında hiçbir şey söylemez.
   * _(Anayasa: "örnek veri ayrımın iki yakasını göstermeli".)_
   */
  const genisOrneklem = [
    ...pasifListingler.map((l) => l.channelSku),
    ...(await prisma.channelSku.findMany({ where: { isActive: true }, take: 15, select: { channelSku: true } })).map((c) => c.channelSku),
    ...(await prisma.productVariant.findMany({ take: 15, select: { sku: true } })).map((v) => v.sku),
    /** ⚠ Boş alan JS tarafında eleniyor: Prisma 7 `null` süzgecini bu
     *  biçimde kabul etmiyor ve amaç örneklem toplamak, süzgeç sınamak değil. */
    ...(await prisma.productVariant.findMany({ take: 60, select: { barcode: true, companySku: true } }))
      .flatMap((v) => [v.barcode, v.companySku])
      .filter((k): k is string => typeof k === "string" && k.length > 0)
      .slice(0, 25),
    ...(await prisma.product.findMany({ take: 10, select: { name: true } })).map((p) => p.name.slice(0, 12)),
    /** ⚠ MARKA DALI AYRICA TETİKLENİR: `/urunler`de `brand` var ve
     *  örneklemde marka-eşleşen kod yoksa o dal HİÇ sınanmaz —
     *  "fark 0" o dal hakkında hiçbir şey söylemez. */
    ...(await prisma.product.findMany({ take: 40, select: { brand: true } }))
      .map((p) => p.brand)
      .filter((b): b is string => typeof b === "string" && b.length > 2)
      .slice(0, 12),
  ];
  let stokFark = 0;
  for (const kod of genisOrneklem) {
    const inline = await prisma.productVariant.count({
      where: {
        OR: kodEsdegerleri(kod).flatMap((e) => [
          { sku: { contains: e } },
          { companySku: { contains: e } },
          { barcode: { contains: e } },
          { product: { name: { contains: e } } },
          { channelSkus: { some: { channelSku: { contains: e } } } },
        ]),
      },
    });
    /** ⚠ `aramaKosulu` eşdeğerleri KENDİSİ açıyor — dıştan ikinci bir
     *  `kodEsdegerleri` döngüsü yerine geçecek ifade DEĞİLDİR. */
    const ortak = await prisma.productVariant.count({
      where: { OR: aramaKosulu(kod) },
    });
    if (inline !== ortak) { stokFark++; console.log(`   ⛔ ${kod}: inline ${inline} · ortak ${ortak}`); }
  }
  console.log(`   ${genisOrneklem.length} kod denendi · FARK ${stokFark} ${stokFark === 0 ? "✓ iddia doğrulandı" : "⛔ İDDİA ÇÜRÜDÜ"}`);

  /* === ③ /urunler — URUN duzeyi, ayni iddia ayrica olculur ========== */
  /**
   * ⚠ `/urunler` VARYANT değil ÜRÜN sorguluyor (`variants: { some: ... }`).
   * "/stok'ta tuttu, burada da tutar" DEMEK ÖLÇÜM DEĞİLDİR — şekil farklı,
   * ayrı ölçülür. _(Anayasa: "kararın kapsamı, uygulandığı yerle sınırlı
   * sayılmaz" — ve her yer ayrı sınanır.)_
   */
  console.log("");
  console.log("③ /urunler — inline dal vs ortak gövde (ÜRÜN düzeyi)");
  let urunFark = 0;
  for (const kod of genisOrneklem) {
    /**
     * ⚠ İLK TURDA `brand` DALINI ATLAMIŞTIM — ve ölçüm yine FARK 0 dedi,
     * çünkü örneklemde marka-eşleşen kod yoktu. Eksik formülle alınan bir
     * "fark 0", yerine geçecek formülü DOĞRULAMAZ. Aşağıdaki iki blok artık
     * gerçek inline dal ile gerçek YERİNE GEÇECEK ifadedir.
     * _(Anayasa: "iki okumayla da uyumlu bir gözlem hiçbirini kanıtlamaz".)_
     */
    const inline = await prisma.product.count({
      where: {
        OR: kodEsdegerleri(kod).flatMap((e) => [
          { name: { contains: e } },
          { brand: { contains: e } },
          { variants: { some: { sku: { contains: e } } } },
          { variants: { some: { companySku: { contains: e } } } },
          { variants: { some: { barcode: { contains: e } } } },
          { variants: { some: { channelSkus: { some: { channelSku: { contains: e } } } } } },
        ]),
      },
    });
    const ortak = await prisma.product.count({
      where: {
        OR: [
          ...kodEsdegerleri(kod).flatMap((e) => [
            { name: { contains: e } },
            { brand: { contains: e } },
          ]),
          ...aramaKosulu(kod).map((k) => ({ variants: { some: k } })),
        ],
      },
    });
    if (inline !== ortak) {
      urunFark++;
      console.log(`   ⛔ ${kod}: inline ${inline} · ortak ${ortak}`);
    }
  }
  /** ⚠ TABAN DOLULUĞU: marka dalı gerçekten eşleşti mi, yoksa hep 0 mı. */
  let markaEslesen = 0;
  for (const kod of genisOrneklem) {
    const n = await prisma.product.count({
      where: { OR: kodEsdegerleri(kod).map((e) => ({ brand: { contains: e } })) },
    });
    if (n > 0) markaEslesen++;
  }
  console.log(
    `   ${genisOrneklem.length} kod denendi · FARK ${urunFark} ${urunFark === 0 ? "✓ iddia doğrulandı" : "⛔ İDDİA ÇÜRÜDÜ"}`,
  );
  console.log(
    `   marka dalını GERÇEKTEN tetikleyen kod: ${markaEslesen} ${markaEslesen > 0 ? "✓ dal sınandı" : "⛔ DAL HİÇ SINANMADI"}`,
  );

  await prisma.$disconnect();
}
main();
