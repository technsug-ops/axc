import { izYaz } from "@/lib/iz";
import { enSikYazim, kodDenetle, kodOner, markaAnahtari, type KodHatasi } from "@/lib/marka-kodu";
import { prisma } from "@/lib/prisma";

/**
 * ============================================================================
 *  MARKA KOD TABLOSU — YAZIM ÇEKİRDEĞİ (K285)
 * ----------------------------------------------------------------------------
 *  Ekranın üç eylemi (tek ekle · hepsini ekle · kod değiştir) ve ürün
 *  kaydı bu gövdeyi kullanır. Kurallar:
 *   · Kod verilmezse ÖNERİ kullanılır; öneri yoksa KAYIT AÇILMAZ (uydurma yok).
 *   · Bağ ŞARTLI kurulur (`brandId: null` olan ürüne) — arada elle bağlanmış
 *     ürün ezilmez.
 *   · Her ekleme / bağ / kod değişikliği İZE (eski ve yeni değerle).
 * ============================================================================
 */

export type EkleSonucu =
  | { durum: "EKLENDI" | "BAGLANDI"; brandId: string; kod: string; baglanan: number }
  | { durum: "KODSUZ" | "URUN_YOK" }
  | { durum: "KOD_HATASI"; hata: KodHatasi };

/** P2002 = benzersizlik çakışması (depo deseni: kod nesneden okunur). */
const benzersizlikHatasi = (e: unknown) =>
  typeof e === "object" && e !== null && "code" in e && String((e as { code: unknown }).code) === "P2002";

/** Anahtarı `anahtar` olan, henüz bağlanmamış ürünlerin kimlikleri ve yazımları. */
async function bagsizUrunler(anahtar: string) {
  const adaylar = await prisma.product.findMany({
    where: { brandId: null, NOT: { brand: null } },
    select: { id: true, brand: true },
  });
  return adaylar.filter((u) => markaAnahtari(u.brand) === anahtar);
}

/**
 * Anahtarı tabloya ekler (yoksa) ve bağsız ürünlerini bağlar.
 * `kod` verilirse o denenir (biçim + benzersizlik), verilmezse öneri.
 */
export async function markaEkleVeBagla(anahtar: string, kod?: string): Promise<EkleSonucu> {
  const urunler = await bagsizUrunler(anahtar);
  let marka = await prisma.brand.findUnique({ where: { anahtar }, select: { id: true, code: true } });
  let durum: "EKLENDI" | "BAGLANDI" = "BAGLANDI";

  if (!marka) {
    if (urunler.length === 0) return { durum: "URUN_YOK" };
    const kodlar = new Set((await prisma.brand.findMany({ select: { code: true } })).map((m) => m.code));
    const secilen = kod ?? kodOner(anahtar, kodlar);
    if (!secilen) return { durum: "KODSUZ" };
    const hata = kodDenetle(secilen, kodlar);
    if (hata) return { durum: "KOD_HATASI", hata };
    const yazimlar = new Map<string, number>();
    for (const u of urunler) yazimlar.set(u.brand!.trim(), (yazimlar.get(u.brand!.trim()) ?? 0) + 1);
    const ad = enSikYazim(yazimlar);
    try {
      marka = await prisma.brand.create({ data: { anahtar, name: ad, code: secilen }, select: { id: true, code: true } });
    } catch (e) {
      /* Arada aynı kod ya da anahtar başka kayda yazılmış — ezmez, söyler. */
      if (benzersizlikHatasi(e)) return { durum: "KOD_HATASI", hata: "KULLANIMDA" };
      throw e;
    }
    durum = "EKLENDI";
    await izYaz({
      action: "MARKA_EKLENDI",
      targetType: "Brand",
      targetId: marka.id,
      detail: JSON.stringify({ anahtar, ad, kod: secilen, oneriMi: kod === undefined }),
    });
  }

  const r = urunler.length
    ? await prisma.product.updateMany({
        where: { id: { in: urunler.map((u) => u.id) }, brandId: null },
        data: { brandId: marka.id },
      })
    : { count: 0 };
  if (r.count > 0) {
    await izYaz({
      action: "MARKA_BAGLANDI",
      targetType: "Brand",
      targetId: marka.id,
      detail: JSON.stringify({ anahtar, adet: r.count }),
    });
  }
  return { durum, brandId: marka.id, kod: marka.code, baglanan: r.count };
}

export type KodDegistirSonucu =
  | { durum: "DEGISTI"; eski: string; yeni: string }
  | { durum: "AYNI" | "YOK" | "DEGISMIS" }
  | { durum: "KOD_HATASI"; hata: KodHatasi };

/** Kod değiştirir — ŞARTLI (okunan eski kod hâlâ yerindeyse). */
export async function markaKoduDegistir(id: string, yeniHam: string): Promise<KodDegistirSonucu> {
  const marka = await prisma.brand.findUnique({ where: { id }, select: { code: true } });
  if (!marka) return { durum: "YOK" };
  const yeni = markaAnahtari(yeniHam);
  if (yeni === marka.code) return { durum: "AYNI" };
  const digerler = new Set(
    (await prisma.brand.findMany({ where: { NOT: { id } }, select: { code: true } })).map((m) => m.code),
  );
  const hata = kodDenetle(yeni, digerler);
  if (hata) return { durum: "KOD_HATASI", hata };
  try {
    const r = await prisma.brand.updateMany({ where: { id, code: marka.code }, data: { code: yeni } });
    if (r.count !== 1) return { durum: "DEGISMIS" };
  } catch (e) {
    if (benzersizlikHatasi(e)) return { durum: "KOD_HATASI", hata: "KULLANIMDA" };
    throw e;
  }
  await izYaz({
    action: "MARKA_KODU_DEGISTI",
    targetType: "Brand",
    targetId: id,
    detail: JSON.stringify({ eski: marka.code, yeni }),
  });
  return { durum: "DEGISTI", eski: marka.code, yeni };
}

/** Ürün kaydında yazılan marka metninin tablo bağı (yoksa `null`). */
export async function markaBagiBul(yazim: string | null | undefined): Promise<string | null> {
  const anahtar = markaAnahtari(yazim);
  if (anahtar === "") return null;
  return (await prisma.brand.findUnique({ where: { anahtar }, select: { id: true } }))?.id ?? null;
}
