"use server";

import { basariAdresi } from "@/lib/bildirim";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { benzerleriBul } from "@/lib/benzerlik";
import { degisenKodlar, urunHareketliMi } from "@/lib/urun-hareket";

/**
 * Formun sunucudan geri aldığı durum. Hataları tek bir listede topluyoruz;
 * form bunları en üstte kırmızı kutuda gösteriyor.
 */
/**
 * Kod çakışması METİN DEĞİL YAPIDIR. Metin içine bağlantı konamaz; kullanıcı
 * "bu barkod başka üründe" cümlesini okuyup o ürünü elle aramak zorunda
 * kalıyordu. Artık hangi ürün olduğu ve oraya gidiş yolu birlikte dönüyor.
 */
export type KodCakismasi = {
  /** "sku" | "firmaSku" | "barkod" — ekranda sözlükten çözülür. */
  alan: "sku" | "firmaSku" | "barkod";
  deger: string;
  urunId: string;
  urunAdi: string;
};

/** Ad+marka benzerliği — ENGEL DEĞİL SORGU. */
export type BenzerUrun = {
  urunId: string;
  ad: string;
  marka: string | null;
};

export type FormDurumu = {
  hatalar?: string[];
  /** Eyleme dönük çakışma: "Ürüne git" / "Bu ürüne alım ekle". */
  cakismalar?: KodCakismasi[];
  /** Kaydetmeden önce sorulan benzerlik uyarısı. */
  benzerler?: BenzerUrun[];
};

// ---------------------------------------------------------------------------
//  ŞEMALAR (zod)
// ---------------------------------------------------------------------------

/** Sözlükten çözülen çeviri işlevi (anahtarlar bugün serbest metin). */
type Ceviri = (
  anahtar: string,
  degerler?: Record<string, string | number>,
) => string;

/**
 * Şema, mesajlar çözüldükten SONRA kurulur.
 * Modül seviyesinde kurulamaz: getTranslations() istek kapsamlıdır.
 */
function urunSemasiKur(t: Ceviri) {
  const secenekSemasi = z.object({
    ad: z.string().trim().min(1, t("secenekAdiBos")).max(191),
    deger: z.string().trim().min(1, t("secenekDegeriBos")).max(191),
  });

  const varyantSemasi = z.object({
    /** Düzenlemede mevcut varyantı işaret eder; yeni varyantta boştur. */
    id: z.string().optional(),
    /** Gösterim adı: "M / Kırmızı". Varyantsız üründe boş kalır. */
    ad: z.string().trim().max(191).optional(),
    sku: z.string().trim().min(1, t("skuZorunlu")).max(191),
    companySku: z.string().trim().min(1, t("firmaSkuZorunlu")).max(191),
    barcode: z.string().trim().max(191).optional(),
    locationId: z.string().optional(),
    secenekler: z.array(secenekSemasi).default([]),
  });

  return z.object({
    ad: z.string().trim().min(1, t("urunAdiZorunlu")).max(191),
    marka: z.string().trim().max(191).optional(),
    aciklama: z.string().trim().optional(),
    kategoriId: z.string().optional(),
    // KDV istisnası ve desi boş bırakılabilir; boşsa null yazılır.
    kdvIstisnasi: z.number().min(0).max(100).nullable().optional(),
    desi: z.number().min(0).nullable().optional(),
    varyantliMi: z.boolean(),
    varyantlar: z.array(varyantSemasi).min(1, t("enAzBirVaryant")),
  });
}

type UrunVerisi = z.infer<ReturnType<typeof urunSemasiKur>>;

// ---------------------------------------------------------------------------
//  YARDIMCILAR
// ---------------------------------------------------------------------------

/** "varyantlar.1.sku" yolunu "2. varyant: SKU zorunlu" gibi okunur hale getirir. */
function hataMesaji(yol: PropertyKey[], mesaj: string, t: Ceviri): string {
  if (yol[0] === "varyantlar" && typeof yol[1] === "number") {
    return t("varyantHataKalibi", { sira: yol[1] + 1, mesaj });
  }
  return mesaj;
}

function veritabaniHatasi(e: unknown, t: Ceviri): string {
  const kod =
    typeof e === "object" && e !== null && "code" in e
      ? String((e as { code: unknown }).code)
      : "";

  if (kod === "P2002") {
    return t("kodZatenKayitli");
  }
  if (kod === "P2003" || kod === "P2014") {
    return t("iliskiliKayit");
  }

  console.error("[urun actions] beklenmeyen hata:", e);
  return t("beklenmeyenVeritabani");
}

/** Formdaki gizli JSON alanını okur ve doğrular. */
function veriyiAyristir(
  formData: FormData,
  t: Ceviri,
): { veri: UrunVerisi } | { hatalar: string[] } {
  const ham = formData.get("veri");

  if (typeof ham !== "string") {
    return { hatalar: [t("formOkunamadi")] };
  }

  let json: unknown;
  try {
    json = JSON.parse(ham);
  } catch {
    return { hatalar: [t("formBozuk")] };
  }

  const sonuc = urunSemasiKur(t).safeParse(json);
  if (!sonuc.success) {
    return {
      hatalar: sonuc.error.issues.map((i) => hataMesaji(i.path, i.message, t)),
    };
  }

  return { veri: sonuc.data };
}

/**
 * Üç kodun da benzersiz olduğunu doğrular: sku, companySku, barcode.
 *
 * NOT: barcode dışındaki ikisi veritabanında zaten UNIQUE. Burada önceden
 * kontrol etmemizin sebebi, kullanıcıya çiğ bir veritabanı hatası yerine
 * hangi kodun çakıştığını Türkçe söyleyebilmek.
 */
async function benzersizlikHatalari(
  varyantlar: UrunVerisi["varyantlar"],
  t: Ceviri,
  haricUrunId?: string,
): Promise<{ hatalar: string[]; cakismalar: KodCakismasi[] }> {
  const hatalar: string[] = [];
  const cakismalar: KodCakismasi[] = [];

  // 1) Formun kendi içinde tekrar
  const tekrarKontrol = (alanAdi: string, degerler: (string | undefined)[]) => {
    const gorulen = new Set<string>();
    for (const deger of degerler) {
      if (!deger) continue;
      if (gorulen.has(deger)) {
        hatalar.push(t("formdaTekrar", { alan: alanAdi, deger }));
      }
      gorulen.add(deger);
    }
  };

  const skular = varyantlar.map((v) => v.sku);
  const axcaliKodlari = varyantlar.map((v) => v.companySku);
  const barkodlar = varyantlar
    .map((v) => v.barcode)
    .filter((b): b is string => Boolean(b));

  tekrarKontrol(t("alanSku"), skular);
  tekrarKontrol(t("alanFirmaSku"), axcaliKodlari);
  tekrarKontrol(t("alanBarkod"), barkodlar);

  // 2) Veritabanında başka bir ürüne ait mi
  const cakisanlar = await prisma.productVariant.findMany({
    where: {
      ...(haricUrunId ? { productId: { not: haricUrunId } } : {}),
      OR: [
        { sku: { in: skular } },
        { companySku: { in: axcaliKodlari } },
        ...(barkodlar.length ? [{ barcode: { in: barkodlar } }] : []),
      ],
    },
    select: {
      sku: true,
      companySku: true,
      barcode: true,
      product: { select: { id: true, name: true } },
    },
  });

  for (const cakisan of cakisanlar) {
    const urunId = cakisan.product.id;
    const urunAdi = cakisan.product.name;
    if (skular.includes(cakisan.sku)) {
      hatalar.push(t("skuBaskaUrunde", { deger: cakisan.sku }));
      cakismalar.push({ alan: "sku", deger: cakisan.sku, urunId, urunAdi });
    }
    if (axcaliKodlari.includes(cakisan.companySku)) {
      hatalar.push(t("firmaSkuBaskaUrunde", { deger: cakisan.companySku }));
      cakismalar.push({
        alan: "firmaSku",
        deger: cakisan.companySku,
        urunId,
        urunAdi,
      });
    }
    if (cakisan.barcode && barkodlar.includes(cakisan.barcode)) {
      hatalar.push(t("barkodBaskaUrunde", { deger: cakisan.barcode }));
      cakismalar.push({
        alan: "barkod",
        deger: cakisan.barcode,
        urunId,
        urunAdi,
      });
    }
  }

  return { hatalar: [...new Set(hatalar)], cakismalar };
}

/**
 * Varyant satırını veritabanı alanlarına çevirir.
 * sira === 0 olan varyant isDefault = true olur — CLAUDE.md kuralı:
 * her üründe TAM OLARAK BİR varsayılan varyant bulunur.
 */
function varyantVerisi(v: UrunVerisi["varyantlar"][number], sira: number) {
  return {
    sku: v.sku,
    companySku: v.companySku,
    barcode: v.barcode || null,
    name: v.ad || null,
    isDefault: sira === 0,
    locationId: v.locationId || null,
  };
}

/**
 * Ad + marka benzeyen mevcut ürünler.
 *
 * Marka VARSA karşılaştırma "marka + ad" üzerinden yapılır: "LEGO Glinda"
 * ile "Karaca Glinda" birbirine benzemez, ama "LEGO Wicked Glinda" ile
 * "LEGO Wicked Glinda 42221" benzer.
 *
 * Aktif olmayan ürünler de aranır — pasife alınmış bir ürünün ikizini
 * açmak, aktif olanınkini açmak kadar yanlıştır.
 */
async function benzerUrunleriBul(
  ad: string,
  marka: string | null | undefined,
): Promise<BenzerUrun[]> {
  const adaylar = await prisma.product.findMany({
    select: { id: true, name: true, brand: true },
    take: 500,
  });

  const metin = (u: { name: string; brand: string | null }) =>
    u.brand ? `${u.brand} ${u.name}` : u.name;

  const aranan = marka ? `${marka} ${ad}` : ad;

  return benzerleriBul(aranan, adaylar, metin).map((u) => ({
    urunId: u.id,
    ad: u.name,
    marka: u.brand,
  }));
}

// ---------------------------------------------------------------------------
//  ACTION: YENİ ÜRÜN
// ---------------------------------------------------------------------------

export async function urunOlustur(
  _oncekiDurum: FormDurumu,
  formData: FormData,
): Promise<FormDurumu> {
  const t = await getTranslations("Urun");

  const ayristirma = veriyiAyristir(formData, t);
  if ("hatalar" in ayristirma) return ayristirma;
  const veri = ayristirma.veri;

  const benzersizlik = await benzersizlikHatalari(veri.varyantlar, t);
  if (benzersizlik.hatalar.length) {
    return {
      hatalar: benzersizlik.hatalar,
      cakismalar: benzersizlik.cakismalar,
    };
  }

  /**
   * MÜKERRER ÜRÜN SORUSU — ENGEL DEĞİL.
   * Kodlar benzersiz olduğu için aynı ürün İKİNCİ KEZ farklı kodla
   * açılabiliyor ve sistem bunu fark etmiyordu. Ad+marka benzeyen kayıt
   * varsa kaydetmeden önce sorulur; kullanıcı "farklı ürün" derse geçilir.
   * Onay bayrağı formdan gelir, ikinci gönderimde kontrol atlanır.
   */
  if (formData.get("benzerlikOnaylandi") !== "1") {
    const benzerler = await benzerUrunleriBul(veri.ad, veri.marka);
    if (benzerler.length) return { benzerler };
  }

  let yeniUrunId: string;

  try {
    const urun = await prisma.product.create({
      data: {
        name: veri.ad,
        brand: veri.marka || null,
        description: veri.aciklama || null,
        hasVariants: veri.varyantliMi,
        categoryId: veri.kategoriId || null,
        vatRateOverride:
          veri.kdvIstisnasi === null || veri.kdvIstisnasi === undefined
            ? null
            : String(veri.kdvIstisnasi),
        desi:
          veri.desi === null || veri.desi === undefined
            ? null
            : String(veri.desi),
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
    return { hatalar: [veritabaniHatasi(e, t)] };
  }

  revalidatePath("/urunler");
  // redirect() bilerek try/catch DIŞINDA: içeride olsaydı fırlattığı
  // yönlendirme sinyali hata sanılıp yutulurdu.
  redirect(basariAdresi(`/urunler/${yeniUrunId}`, "eklendi"));
}

// ---------------------------------------------------------------------------
//  ACTION: ÜRÜN GÜNCELLE
// ---------------------------------------------------------------------------

export async function urunGuncelle(
  _oncekiDurum: FormDurumu,
  formData: FormData,
): Promise<FormDurumu> {
  const t = await getTranslations("Urun");

  const urunId = formData.get("id");
  if (typeof urunId !== "string" || !urunId) {
    return { hatalar: [t("kimlikBulunamadi")] };
  }

  const ayristirma = veriyiAyristir(formData, t);
  if ("hatalar" in ayristirma) return ayristirma;
  const veri = ayristirma.veri;

  const benzersizlik = await benzersizlikHatalari(veri.varyantlar, t, urunId);
  if (benzersizlik.hatalar.length) {
    return {
      hatalar: benzersizlik.hatalar,
      cakismalar: benzersizlik.cakismalar,
    };
  }

  // KİMLİK KİLİDİ — istemcideki disabled yalnızca kolaylık; asıl koruma
  // burada. Hareket görmüş üründe SKU ve Firma SKU değiştirilemez.
  if (await urunHareketliMi(urunId)) {
    const degisenler = await degisenKodlar(urunId, veri.varyantlar);
    if (degisenler.length) {
      return {
        hatalar: [t("kodKilitli", { kodlar: degisenler.join(", ") })],
      };
    }
  }

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
          t("varyantSilinemez"),
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
          categoryId: veri.kategoriId || null,
          vatRateOverride:
            veri.kdvIstisnasi === null || veri.kdvIstisnasi === undefined
              ? null
              : String(veri.kdvIstisnasi),
          desi:
            veri.desi === null || veri.desi === undefined
              ? null
              : String(veri.desi),
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
    return { hatalar: [veritabaniHatasi(e, t)] };
  }

  revalidatePath("/urunler");
  revalidatePath(`/urunler/${urunId}`);
  redirect(basariAdresi(`/urunler/${urunId}`, "guncellendi"));
}

// ---------------------------------------------------------------------------
//  ACTION: ÜRÜN SİL
// ---------------------------------------------------------------------------

export async function urunSil(
  _oncekiDurum: FormDurumu,
  formData: FormData,
): Promise<FormDurumu> {
  const t = await getTranslations("Urun");

  const urunId = formData.get("id");
  if (typeof urunId !== "string" || !urunId) {
    return { hatalar: [t("kimlikBulunamadi")] };
  }

  // Stok hareketi olan ürün silinemez. Şu an hiç hareket yok ama kural
  // baştan kodda dursun ki satış/alım fazında kendiliğinden devreye girsin.
  const hareketSayisi = await prisma.stockMovement.count({
    where: { variant: { productId: urunId } },
  });
  if (hareketSayisi > 0) {
    return {
      hatalar: [
        t("urunSilinemez"),
      ],
    };
  }

  try {
    // Varyantlar ve seçenekleri şema gereği (onDelete: Cascade) birlikte silinir.
    await prisma.product.delete({ where: { id: urunId } });
  } catch (e) {
    return { hatalar: [veritabaniHatasi(e, t)] };
  }

  revalidatePath("/urunler");
  redirect(basariAdresi("/urunler", "silindi"));
}
