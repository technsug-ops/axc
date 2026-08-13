"use server";

import { yetkiIste } from "@/lib/yetki";
import {
  modelAyirtEdici,
  skuOnEki,
  skuUret,
  sonrakiSira,
  urunKisaltmasi,
} from "@/lib/kimlik";
import { prisma } from "@/lib/prisma";

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

export type SkuOnerisi =
  | { kod: string; kaynak: "OZDESLIK" | "URETILDI" }
  | {
      hata: "KATEGORI_SECILMEDI" | "KATEGORI_KODSUZ" | "KISALTMA_YOK";
      ad?: string;
    };

/** Çakışma denemesinde kaç sıra ileri gidilir. */
const EN_FAZLA_DENEME = 200;

export async function skuOner(girdi: {
  kategoriId: string;
  ad: string;
  marka: string;
  /** Formdaki SKU alanının mevcut değeri — doluysa özdeşlik dalı çalışır. */
  mevcutSku?: string;
  /**
   * Aynı formda HENÜZ KAYDEDİLMEMİŞ varyantların kodları.
   * Veritabanı bunları bilmez; çok varyantlı üründe ikinci varyant
   * birincinin numarasını alırdı.
   */
  kullanilan?: string[];
}): Promise<SkuOnerisi> {
  await yetkiIste("urun.gor");

  // --- ÖZDEŞLİK DALI: SKU doluysa üretme, aynısını öner ---
  // Kararımız SKU ile Firma SKU'nun özdeş olması. Pazaryeri kodu varken
  // ikinci bir kod uydurmak, aynı ürüne iki kimlik takmak olurdu.
  const mevcutSku = (girdi.mevcutSku ?? "").trim();
  if (mevcutSku !== "") {
    return { kod: mevcutSku, kaynak: "OZDESLIK" };
  }

  if (!girdi.kategoriId) return { hata: "KATEGORI_SECILMEDI" };

  const kategori = await prisma.category.findUnique({
    where: { id: girdi.kategoriId },
    select: { name: true, code: true },
  });
  if (!kategori) return { hata: "KATEGORI_SECILMEDI" };
  if (!kategori.code) return { hata: "KATEGORI_KODSUZ", ad: kategori.name };

  const kisaltma = urunKisaltmasi(girdi.ad, girdi.marka);
  // Model üretilemezse (ad boş/anlamsız) kısaltma tek başına ayırt edici olur.
  const ayirt = modelAyirtEdici(girdi.ad) ?? kisaltma;
  if (!kisaltma || !ayirt) return { hata: "KISALTMA_YOK" };

  const onEk = skuOnEki({ kategoriKodu: kategori.code, kisaltma, ayirt });

  // --- İKİ SÜTUNDA BİRDEN ARA (kusur 1) ---
  const mevcutlar = await prisma.productVariant.findMany({
    where: {
      OR: [
        { sku: { startsWith: onEk } },
        { companySku: { startsWith: onEk } },
      ],
    },
    select: { sku: true, companySku: true },
  });

  const mevcutKodlar = [
    ...mevcutlar.map((v) => v.sku),
    ...mevcutlar.flatMap((v) => (v.companySku ? [v.companySku] : [])),
    ...(girdi.kullanilan ?? []),
  ];

  let sira = sonrakiSira(mevcutKodlar, onEk);
  let kod = skuUret({ kategoriKodu: kategori.code, kisaltma, ayirt, sira });

  // --- ÇAKIŞMA KONTROLÜ (kusur 3) ---
  // `sonrakiSira` ön ekle başlayan kodlara bakar; ama aynı kod ön ek DIŞI
  // bir yolla da girilmiş olabilir (elle yazılmış, içe aktarılmış). Kullanıcıya
  // kaydedilemeyecek bir kod önermemek için gerçekten boş olduğu doğrulanır.
  const kullanilanKume = new Set(girdi.kullanilan ?? []);
  for (let deneme = 0; deneme < EN_FAZLA_DENEME; deneme++) {
    const cakisma =
      kullanilanKume.has(kod) ||
      (await prisma.productVariant.count({
        where: { OR: [{ sku: kod }, { companySku: kod }] },
      })) > 0;

    if (!cakisma) return { kod, kaynak: "URETILDI" };

    sira++;
    kod = skuUret({ kategoriKodu: kategori.code, kisaltma, ayirt, sira });
  }

  // 200 denemede boş kod bulunamadıysa öneri verilmez — sonsuza kadar
  // denemek yerine kullanıcı elle yazsın.
  return { hata: "KISALTMA_YOK" };
}
