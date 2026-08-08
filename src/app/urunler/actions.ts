"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

/**
 * Formun sunucudan geri aldığı durum. Hataları tek bir listede topluyoruz;
 * form bunları en üstte kırmızı kutuda gösteriyor.
 */
export type FormDurumu = {
  hatalar?: string[];
};

// ---------------------------------------------------------------------------
//  ŞEMALAR (zod)
// ---------------------------------------------------------------------------

const secenekSemasi = z.object({
  ad: z.string().trim().min(1, "seçenek adı boş olamaz").max(191),
  deger: z.string().trim().min(1, "seçenek değeri boş olamaz").max(191),
});

const varyantSemasi = z.object({
  /** Düzenlemede mevcut varyantı işaret eder; yeni varyantta boştur. */
  id: z.string().optional(),
  /** Gösterim adı: "M / Kırmızı". Varyantsız üründe boş kalır. */
  ad: z.string().trim().max(191).optional(),
  sku: z.string().trim().min(1, "SKU zorunlu").max(191),
  axcaliSku: z.string().trim().min(1, "Axcali SKU zorunlu").max(191),
  barcode: z.string().trim().max(191).optional(),
  locationId: z.string().optional(),
  secenekler: z.array(secenekSemasi).default([]),
});

const urunSemasi = z.object({
  ad: z.string().trim().min(1, "Ürün adı zorunlu").max(191),
  marka: z.string().trim().max(191).optional(),
  aciklama: z.string().trim().optional(),
  varyantliMi: z.boolean(),
  varyantlar: z.array(varyantSemasi).min(1, "En az bir varyant gerekli"),
});

type UrunVerisi = z.infer<typeof urunSemasi>;

// ---------------------------------------------------------------------------
//  YARDIMCILAR
// ---------------------------------------------------------------------------

/** "varyantlar.1.sku" yolunu "2. varyant: SKU zorunlu" gibi okunur hale getirir. */
function hataMesaji(yol: PropertyKey[], mesaj: string): string {
  if (yol[0] === "varyantlar" && typeof yol[1] === "number") {
    return `${yol[1] + 1}. varyant: ${mesaj}`;
  }
  return mesaj;
}

function veritabaniHatasi(e: unknown): string {
  const kod =
    typeof e === "object" && e !== null && "code" in e
      ? String((e as { code: unknown }).code)
      : "";

  if (kod === "P2002") {
    return "Bu SKU, Axcali SKU veya barkod zaten kayıtlı. Değerleri kontrol edin.";
  }
  if (kod === "P2003" || kod === "P2014") {
    return "Bu kayıt başka kayıtlarla ilişkili olduğu için işlem yapılamadı.";
  }

  console.error("[urun actions] beklenmeyen hata:", e);
  return "Beklenmeyen bir veritabanı hatası oluştu.";
}

/** Formdaki gizli JSON alanını okur ve doğrular. */
function veriyiAyristir(
  formData: FormData,
): { veri: UrunVerisi } | { hatalar: string[] } {
  const ham = formData.get("veri");

  if (typeof ham !== "string") {
    return { hatalar: ["Form verisi okunamadı."] };
  }

  let json: unknown;
  try {
    json = JSON.parse(ham);
  } catch {
    return { hatalar: ["Form verisi bozuk."] };
  }

  const sonuc = urunSemasi.safeParse(json);
  if (!sonuc.success) {
    return {
      hatalar: sonuc.error.issues.map((i) => hataMesaji(i.path, i.message)),
    };
  }

  return { veri: sonuc.data };
}

/**
 * Üç kodun da benzersiz olduğunu doğrular: sku, axcaliSku, barcode.
 *
 * NOT: barcode dışındaki ikisi veritabanında zaten UNIQUE. Burada önceden
 * kontrol etmemizin sebebi, kullanıcıya çiğ bir veritabanı hatası yerine
 * hangi kodun çakıştığını Türkçe söyleyebilmek.
 */
async function benzersizlikHatalari(
  varyantlar: UrunVerisi["varyantlar"],
  haricUrunId?: string,
): Promise<string[]> {
  const hatalar: string[] = [];

  // 1) Formun kendi içinde tekrar
  const tekrarKontrol = (alanAdi: string, degerler: (string | undefined)[]) => {
    const gorulen = new Set<string>();
    for (const deger of degerler) {
      if (!deger) continue;
      if (gorulen.has(deger)) {
        hatalar.push(`${alanAdi} "${deger}" formda birden fazla varyantta kullanılmış.`);
      }
      gorulen.add(deger);
    }
  };

  const skular = varyantlar.map((v) => v.sku);
  const axcaliKodlari = varyantlar.map((v) => v.axcaliSku);
  const barkodlar = varyantlar
    .map((v) => v.barcode)
    .filter((b): b is string => Boolean(b));

  tekrarKontrol("SKU", skular);
  tekrarKontrol("Axcali SKU", axcaliKodlari);
  tekrarKontrol("Barkod", barkodlar);

  // 2) Veritabanında başka bir ürüne ait mi
  const cakisanlar = await prisma.productVariant.findMany({
    where: {
      ...(haricUrunId ? { productId: { not: haricUrunId } } : {}),
      OR: [
        { sku: { in: skular } },
        { axcaliSku: { in: axcaliKodlari } },
        ...(barkodlar.length ? [{ barcode: { in: barkodlar } }] : []),
      ],
    },
    select: { sku: true, axcaliSku: true, barcode: true },
  });

  for (const cakisan of cakisanlar) {
    if (skular.includes(cakisan.sku)) {
      hatalar.push(`SKU "${cakisan.sku}" başka bir üründe kullanılıyor.`);
    }
    if (axcaliKodlari.includes(cakisan.axcaliSku)) {
      hatalar.push(`Axcali SKU "${cakisan.axcaliSku}" başka bir üründe kullanılıyor.`);
    }
    if (cakisan.barcode && barkodlar.includes(cakisan.barcode)) {
      hatalar.push(`Barkod "${cakisan.barcode}" başka bir üründe kullanılıyor.`);
    }
  }

  return [...new Set(hatalar)];
}

/**
 * Varyant satırını veritabanı alanlarına çevirir.
 * sira === 0 olan varyant isDefault = true olur — CLAUDE.md kuralı:
 * her üründe TAM OLARAK BİR varsayılan varyant bulunur.
 */
function varyantVerisi(v: UrunVerisi["varyantlar"][number], sira: number) {
  return {
    sku: v.sku,
    axcaliSku: v.axcaliSku,
    barcode: v.barcode || null,
    name: v.ad || null,
    isDefault: sira === 0,
    locationId: v.locationId || null,
  };
}

// ---------------------------------------------------------------------------
//  ACTION: YENİ ÜRÜN
// ---------------------------------------------------------------------------

export async function urunOlustur(
  _oncekiDurum: FormDurumu,
  formData: FormData,
): Promise<FormDurumu> {
  const ayristirma = veriyiAyristir(formData);
  if ("hatalar" in ayristirma) return ayristirma;
  const veri = ayristirma.veri;

  const benzersizlik = await benzersizlikHatalari(veri.varyantlar);
  if (benzersizlik.length) return { hatalar: benzersizlik };

  let yeniUrunId: string;

  try {
    const urun = await prisma.product.create({
      data: {
        name: veri.ad,
        brand: veri.marka || null,
        description: veri.aciklama || null,
        hasVariants: veri.varyantliMi,
        variants: {
          create: veri.varyantlar.map((v, sira) => ({
            ...varyantVerisi(v, sira),
            options: {
              create: v.secenekler.map((s) => ({ name: s.ad, value: s.deger })),
            },
          })),
        },
      },
      select: { id: true },
    });
    yeniUrunId = urun.id;
  } catch (e) {
    return { hatalar: [veritabaniHatasi(e)] };
  }

  revalidatePath("/urunler");
  // redirect() bilerek try/catch DIŞINDA: içeride olsaydı fırlattığı
  // yönlendirme sinyali hata sanılıp yutulurdu.
  redirect(`/urunler/${yeniUrunId}`);
}

// ---------------------------------------------------------------------------
//  ACTION: ÜRÜN GÜNCELLE
// ---------------------------------------------------------------------------

export async function urunGuncelle(
  _oncekiDurum: FormDurumu,
  formData: FormData,
): Promise<FormDurumu> {
  const urunId = formData.get("id");
  if (typeof urunId !== "string" || !urunId) {
    return { hatalar: ["Ürün kimliği bulunamadı."] };
  }

  const ayristirma = veriyiAyristir(formData);
  if ("hatalar" in ayristirma) return ayristirma;
  const veri = ayristirma.veri;

  const benzersizlik = await benzersizlikHatalari(veri.varyantlar, urunId);
  if (benzersizlik.length) return { hatalar: benzersizlik };

  const mevcutVaryantlar = await prisma.productVariant.findMany({
    where: { productId: urunId },
    select: { id: true },
  });
  const mevcutIdler = mevcutVaryantlar.map((v) => v.id);
  const gelenIdler = veri.varyantlar
    .map((v) => v.id)
    .filter((id): id is string => Boolean(id));
  const silinecekler = mevcutIdler.filter((id) => !gelenIdler.includes(id));

  // Stok hareketi olan varyant silinemez (CLAUDE.md: ledger değiştirilmez).
  if (silinecekler.length) {
    const hareketSayisi = await prisma.stockMovement.count({
      where: { variantId: { in: silinecekler } },
    });
    if (hareketSayisi > 0) {
      return {
        hatalar: [
          "Stok hareketi bulunan bir varyant silinemez. Miktar düzeltmesi ters işaretli ADJUSTMENT kaydıyla yapılır.",
        ],
      };
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: urunId },
        data: {
          name: veri.ad,
          brand: veri.marka || null,
          description: veri.aciklama || null,
          hasVariants: veri.varyantliMi,
        },
      });

      if (silinecekler.length) {
        await tx.variantOption.deleteMany({
          where: { variantId: { in: silinecekler } },
        });
        await tx.productVariant.deleteMany({
          where: { id: { in: silinecekler } },
        });
      }

      for (const [sira, v] of veri.varyantlar.entries()) {
        const alanlar = varyantVerisi(v, sira);

        if (v.id && mevcutIdler.includes(v.id)) {
          const varyantId = v.id;
          await tx.productVariant.update({
            where: { id: varyantId },
            data: alanlar,
          });
          // Seçenekleri tazelemek en basit ve tutarlı yol: sil, yeniden yaz.
          await tx.variantOption.deleteMany({
            where: { variantId: varyantId },
          });
          if (v.secenekler.length) {
            await tx.variantOption.createMany({
              data: v.secenekler.map((s) => ({
                variantId: varyantId,
                name: s.ad,
                value: s.deger,
              })),
            });
          }
        } else {
          await tx.productVariant.create({
            data: {
              ...alanlar,
              productId: urunId,
              options: {
                create: v.secenekler.map((s) => ({
                  name: s.ad,
                  value: s.deger,
                })),
              },
            },
          });
        }
      }
    });
  } catch (e) {
    return { hatalar: [veritabaniHatasi(e)] };
  }

  revalidatePath("/urunler");
  revalidatePath(`/urunler/${urunId}`);
  redirect(`/urunler/${urunId}`);
}

// ---------------------------------------------------------------------------
//  ACTION: ÜRÜN SİL
// ---------------------------------------------------------------------------

export async function urunSil(
  _oncekiDurum: FormDurumu,
  formData: FormData,
): Promise<FormDurumu> {
  const urunId = formData.get("id");
  if (typeof urunId !== "string" || !urunId) {
    return { hatalar: ["Ürün kimliği bulunamadı."] };
  }

  // Stok hareketi olan ürün silinemez. Şu an hiç hareket yok ama kural
  // baştan kodda dursun ki satış/alım fazında kendiliğinden devreye girsin.
  const hareketSayisi = await prisma.stockMovement.count({
    where: { variant: { productId: urunId } },
  });
  if (hareketSayisi > 0) {
    return {
      hatalar: [
        "Bu ürünün stok hareketi var, silinemez. Kullanımdan kaldırmak için ürünü pasife alın.",
      ],
    };
  }

  try {
    // Varyantlar ve seçenekleri şema gereği (onDelete: Cascade) birlikte silinir.
    await prisma.product.delete({ where: { id: urunId } });
  } catch (e) {
    return { hatalar: [veritabaniHatasi(e)] };
  }

  revalidatePath("/urunler");
  redirect("/urunler");
}
