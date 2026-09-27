"use server";

import { yetkiIste } from "@/lib/yetki";
import { sonrakiSira } from "@/lib/kimlik";
import { markaBagiBul } from "@/lib/marka-kodu-yaz";
import { prisma } from "@/lib/prisma";
import { skuKodu } from "@/lib/sku-onizleme";

/**
 * ============================================================================
 *  SKU ÖNERİSİ
 * ----------------------------------------------------------------------------
 *  KOZ-PH-MG594-01 = kategori kodu · marka kısaltması · MODEL · sıra
 *
 *  ÜÇ KURAL (bkz. src/lib/kimlik.ts):
 *   - Kod İPUCUDUR, gerçek veritabanındadır. Kategori sonradan değişse kod
 *     değişmez.
 *   - Doğduktan sonra değişmez (hareket görmüş üründe kilitli).
 *   - Öneri DAYATMA DEĞİLDİR: düğmeye basılmadan alan dolmaz.
 *
 *  ----------------------------------------------------------------------
 *  12.08.2026 — GERÇEK KATALOGDA ÇIKAN İKİ KUSUR VE ÇÖZÜMLERİ
 *  ----------------------------------------------------------------------
 *  KUSUR 1 — sıra sayacı KÖRDÜ. Sorgu yalnız `sku` sütununa bakıyordu.
 *  Kullanıcının ürünlerinde `sku` pazaryeri kodunu taşıyor (HBCV...),
 *  üretilen kod ise `companySku`'ya yazılıyordu. Sorgu hiçbir şey bulamıyor,
 *  max=0 çıkıyor ve HER SEFERİNDE "-01" öneriliyordu. Ölçüm:
 *      KOZ-PH-260812- ön eki · sku sütununda 0 · companySku sütununda 3
 *  Çözüm: arama İKİ SÜTUNDA birden yapılır (aşağıda `mevcutKodlar`).
 *
 *  KUSUR 2 — kod MODELİ AYIRT ETMİYORDU. {kategori}-{marka}-{gün} biçiminde
 *  aynı markanın aynı gün girilen bütün ürünleri aynı ön eki paylaşıyordu.
 *  Çözüm: gün yerine ürün adından türetilen model (bkz. modelAyirtEdici).
 *
 *  ÖZDEŞLİK DALI (kullanıcı kararı): SKU zaten doluysa — ki içe aktarılan
 *  1054 ürünün hemen hepsinde pazaryeri kodu dolu — üretim yapılmaz, Firma
 *  SKU'ya SKU'nun AYNISI önerilir. Üretim formülü yalnız SKU da boşken
 *  devreye girer.
 * ============================================================================
 */

/**
 * ============================================================================
 *  K287 (27.09.2026) — BİÇİM DEĞİŞTİ: KAT-MRK-NNNN
 * ----------------------------------------------------------------------------
 *  Kullanıcı kararları 26–27.09: model parçası ADDAN TAHMİN EDİLMEZ (canlıda
 *  «1000W» güç değeri, «KX» marka harfleri model sanıldı); marka parçası
 *  ADDAN HESAPLANMAZ, marka tablosundan okunur (K285 — eski 2 harfli kısaltma
 *  Karaca/Karcher'ı KR'de çakıştırıyordu); yeni kod FİRMA SKU'ya yazılır.
 *
 *  ⚠ ESKİ GEREKÇE SİLİNMEDİ (yukarıda): «özdeşlik dalı» 12.08 kararıydı —
 *  SKU doluysa Firma SKU'ya aynısı önerilirdi. 26.09 kararıyla Firma SKU
 *  fiziksel etiketin anlamlı kodu oldu ve pazaryeri kodundan AYRILDI; dal
 *  kaldırıldı. Form öneriyi Firma SKU'ya yazar, SKU'yu yalnız BOŞSA doldurur.
 *
 *  Sıra: aynı ön ekteki en büyük numara + 1 — SKU · Firma SKU · ESKİ KOD
 *  üçünde birden aranır (silinen/eski numara yeniden verilmez).
 * ============================================================================
 */

export type SkuOnerisi =
  | { kod: string; kaynak: "URETILDI" }
  | {
      hata: "KATEGORI_SECILMEDI" | "KATEGORI_KODSUZ" | "MARKA_TABLODA_YOK" | "KISALTMA_YOK";
      ad?: string;
    };

/** Çakışma denemesinde kaç sıra ileri gidilir. */
const EN_FAZLA_DENEME = 200;

export async function skuOner(girdi: {
  kategoriId: string;
  ad: string;
  marka: string;
  /** Formdaki SKU alanının değeri — K287'den beri öneriyi ETKİLEMEZ (bkz. üstteki not). */
  mevcutSku?: string;
  /**
   * Aynı formda HENÜZ KAYDEDİLMEMİŞ varyantların kodları.
   * Veritabanı bunları bilmez; çok varyantlı üründe ikinci varyant
   * birincinin numarasını alırdı.
   */
  kullanilan?: string[];
}): Promise<SkuOnerisi> {
  await yetkiIste("urun.gor");

  if (!girdi.kategoriId) return { hata: "KATEGORI_SECILMEDI" };
  const kategori = await prisma.category.findUnique({
    where: { id: girdi.kategoriId },
    select: { name: true, code: true },
  });
  if (!kategori) return { hata: "KATEGORI_SECILMEDI" };
  if (!kategori.code) return { hata: "KATEGORI_KODSUZ", ad: kategori.name };

  const brandId = await markaBagiBul(girdi.marka);
  const marka = brandId ? await prisma.brand.findUnique({ where: { id: brandId }, select: { code: true } }) : null;
  if (!marka) return { hata: "MARKA_TABLODA_YOK", ad: girdi.marka.trim() };

  const onEk = `${kategori.code}-${marka.code}-`;
  const [mevcutlar, eskiler] = await Promise.all([
    prisma.productVariant.findMany({
      where: { OR: [{ sku: { startsWith: onEk } }, { companySku: { startsWith: onEk } }] },
      select: { sku: true, companySku: true },
    }),
    prisma.eskiKod.findMany({ where: { kod: { startsWith: onEk } }, select: { kod: true } }),
  ]);
  const mevcutKodlar = [
    ...mevcutlar.flatMap((v) => [v.sku, v.companySku]),
    ...eskiler.map((e) => e.kod),
    ...(girdi.kullanilan ?? []),
  ];

  let sira = sonrakiSira(mevcutKodlar, onEk);
  const kullanilanKume = new Set(girdi.kullanilan ?? []);
  for (let deneme = 0; deneme < EN_FAZLA_DENEME; deneme++) {
    const kod = skuKodu(kategori.code, marka.code, sira);
    const cakisma =
      kullanilanKume.has(kod) ||
      (await prisma.productVariant.count({ where: { OR: [{ sku: kod }, { companySku: kod }, { barcode: kod }] } })) > 0 ||
      (await prisma.eskiKod.count({ where: { kod } })) > 0;
    if (!cakisma) return { kod, kaynak: "URETILDI" };
    sira++;
  }
  /* 200 denemede boş kod bulunamadıysa öneri verilmez — kullanıcı elle yazsın. */
  return { hata: "KISALTMA_YOK" };
}
