import type { PrismaClient } from "@/generated/prisma/client";

import { satisKodKosulu } from "@/lib/varyant-arama-kurali";

/**
 * ============================================================================
 *  SATIŞ KİMLİĞİNDEN VARYANT — "BU SİPARİŞTE HANGİ ÜRÜN GİTTİ" (08.09.2026)
 * ----------------------------------------------------------------------------
 *  Kullanıcı isteği: _"Stoktaki arama butonu sipariş numarasını da
 *  eşleştirebilsin — 4864776792 · 4825253981."_
 *
 *  ⛔ ÖLÇÜLDÜ: bugünkü `/stok` koşulu o numaraya **0 varyant** döndürüyor.
 *  Bilgi sistemde VAR — ikisi de tek satışa ve tek varyanta çözülüyor
 *  (`axcali2850` · `KUC-PH-1200W-01`, ikisi de aktif). Yani ekran susmuyor,
 *  **yanlış cevap** veriyordu: "böyle bir şey yok" diyordu.
 *  _(K100'ün aynısı: baştaki sıfır vakasında da bilgi vardı, arama
 *  sormuyordu.)_
 *
 *  ⚠ NİYE AYRI GÖVDE — VARYANT KOŞULUNA EKLENEMEZ. Sipariş numarası bir
 *  SATIŞ kimliğidir (`Sale.code`); `ProductVariantWhereInput` içine
 *  yazılamaz. K41①'de aynı sınır gönderi numarası için ölçülmüştü ve
 *  cevabı buydu: kapsam ayrı, gövde ayrı. Çözüm iki adımlı — önce satış
 *  kimliğinden varyant kimlikleri bulunur, sonra varyant sorgusuna
 *  `id: { in: … }` olarak girer.
 *
 *  ⚠ TEK GÖVDE, İKİ EKRAN. `/stok` ve `/urunler` aynı kodu aynı sonuca
 *  götürmek ZORUNDA (İlke #10) — ve bu ikilinin ayrışması bu depoda ZATEN
 *  yaşandı: kanal SKU'su 12.08'de `/urunler`de düzeltildi, `/stok` unutuldu
 *  ve kullanıcı iki gün sonra buldu (`stok/page.tsx` içindeki not). Aynı
 *  hatayı ayna simetrisiyle tekrarlamamak için gövde tek yerde.
 * ============================================================================
 */

/**
 * Bir arama sorgusunu SATIŞ kimliği olarak çözer ve o satışın kalemlerindeki
 * varyant kimliklerini döndürür. Eşleşme yoksa boş dizi.
 *
 * ⛔ TAM EŞLEŞME, KISMİ DEĞİL — VE BU BİR TERCİH DEĞİL, GÖVDENİN KENDİSİ.
 * `satisKodKosulu` iki alanı da `@unique` olduğu için tam eşleştirir. Kısmi
 * eşleşme burada **yanlış ürünü** stok listesine sokardı: "48252" yazan biri
 * ilgisiz bir siparişin ürününü görür ve onu aradığı ürün sanar. Serbest
 * metinde kısmi eşleşme şarttır (insan tam kod yazmaz), ama bir KİMLİĞİ
 * ürüne çeviren adımda değildir.
 * _(Anayasa: "okutmada kısmi eşleşme yasak" — aynı gerekçe.)_
 *
 * ⚠ İPTAL SÜZGECİ BİLEREK YOK. "Bu siparişte hangi ürün gitti" sorusunun
 * cevabı sipariş iptal edilse de aynıdır; süzgeç konsaydı iptal edilmiş bir
 * siparişin numarası sessizce hiçbir şey bulamaz ve kullanıcı numarayı
 * yanlış yazdığını sanırdı.
 *
 * ⚠ HER ARAMADA BİR SORGU KOŞAR — ve bu bilinçli. Alternatif "numaraya
 * benziyorsa sor" biçim süzgeci olurdu; bu depoda biçim süzgecinin
 * TESADÜFEN doğru çalıştığı bir vaka var (`/^1\d{10}$/`, 26.08) ve biçim
 * değiştiği gün sessizce yanlış küme verirdi. Maliyet ölçüldü: canlıya
 * sıcak gidiş-dönüş ~29 ms ve sorgu iki `@unique` alanda eşitlik.
 */
export async function satisKodundanVaryantIdleri(
  db: Pick<PrismaClient, "sale">,
  sorgu: string,
): Promise<string[]> {
  const temiz = satisAramasiHazirla(sorgu);
  if (temiz === null) return [];
  const satislar = await db.sale.findMany({
    where: { OR: satisKodKosulu(temiz) },
    select: { items: { select: { variantId: true } } },
  });
  return varyantIdleriniTopla(satislar);
}

/**
 * ⭐ SORULACAK MI — SAF KAPI. Boş/boşluk sorguda `null` döner ve çağıran
 * veritabanına HİÇ GİTMEZ; kullanıcı kutuyu temizlediğinde gereksiz bir
 * gidiş-dönüş olmaz.
 *
 * ⚠ AYRI GÖVDE ÇÜNKÜ SINANABİLİR OLMASI GEREKİYOR: bekçi CJS'e derleniyor
 * ve üst düzey `await` desteklenmiyor — `async` gövdeyi doğrudan çağıran
 * bir ölçüt, sonucunu ancak ÖZETTEN SONRA okuyabilirdi ve sayaç kimsenin
 * bakmadığı bir yerde artardı. _(Anayasa: "ölçüt bloğu, özet ve çıkış
 * kodundan ÖNCE koşar".)_ Saf parçalar ayrılınca değer testi senkron olur.
 */
export function satisAramasiHazirla(sorgu: string): string | null {
  const temiz = sorgu.trim();
  return temiz === "" ? null : temiz;
}

/**
 * ⭐ KALEMLERDEN TEKİL VARYANT KİMLİKLERİ — SAF.
 *
 * ⚠ TEKİLLEŞTİRME ŞART: aynı varyant bir siparişte iki kalemde geçebilir
 * (ör. iki ayrı satır). Tekilleştirilmeseydi `id: { in: [...] }` aynı
 * kimliği tekrar tekrar taşırdı — sonuç değişmez ama sorgu şişer ve
 * "kaç varyant bulundu" sayısı okuyanı yanıltırdı.
 */
export function varyantIdleriniTopla(
  satislar: { items: { variantId: string }[] }[],
): string[] {
  return [...new Set(satislar.flatMap((s) => s.items.map((k) => k.variantId)))];
}
