import { izYaz } from "@/lib/iz";
import { prisma } from "@/lib/prisma";
import {
  kategoriKarari,
  tyKategoriAnahtari,
  type KategoriAtlamaSebebi,
} from "@/lib/kategori-eslesme";

/**
 * ============================================================================
 *  TRENDYOL KATEGORİ EŞLEŞMESİ — OKUMA/YAZMA (K283, 26.09.2026)
 * ----------------------------------------------------------------------------
 *  Karar SAF kuraldan (`kategoriKarari`); burada yalnız okuma ve yazma.
 *  İki giriş, TEK çekirdek (`uygula`):
 *   · `tyKategorileriniYaz` — listeleme senkronu (barkod + TY kategorisi).
 *     Yeni görülen TY kategorisi tabloya KARŞILIKSIZ girer (tahmin yok).
 *   · `eslesmeyiUrunlereUygula` — ekranda eşleşme değişince, o TY
 *     kategorisindeki ürünlere (ürünün saklı `tyKategori`sinden; API'ye
 *     yeniden gidilmez).
 *
 *  ⛔ TOPLU YAZIM ŞARTLARI: satır satır, TEKRAR KOŞULABİLİR — güncelleme
 *  `categoryId = okunan değer` şartıyla yapılır (arada biri elle değiştirdiyse
 *  ezilmez), ikinci koşum değişiklik yoksa 0 yazar. Koşum başına TAVAN var.
 *  İZ: kategori değişen her ürün için eski ve yeni değer (`izYaz`).
 * ============================================================================
 */
export const KATEGORI_YAZIM_TAVANI = 300;
export const KATEGORI_IZ_EYLEMI = "KATEGORI_TY_ESLESME";

export type KategoriYazimOzeti = {
  aday: number;
  yeniTyKategori: number;
  eslesenUrun: number;
  tyYazilan: number;
  kategoriYazilan: number;
  atlanan: Record<KategoriAtlamaSebebi | "CAKISAN", number>;
  tavandaKalan: number;
};

const bosAtlanan = (): KategoriYazimOzeti["atlanan"] => ({
  KARSILIK_YOK: 0,
  AYNI: 0,
  ELLE: 0,
  KDV_DEGISIR: 0,
  CAKISAN: 0,
});

async function eslesmeHaritasi(): Promise<Map<string, { categoryId: string | null; kdv: number | null }>> {
  const satirlar = await prisma.tyKategoriEslesme.findMany({
    select: { tyKategori: true, categoryId: true, category: { select: { vatRate: true } } },
  });
  return new Map(
    satirlar.map((s) => [
      s.tyKategori,
      { categoryId: s.categoryId, kdv: s.category ? Number(s.category.vatRate.toString()) : null },
    ]),
  );
}

/** ÇEKİRDEK — ürün başına tek TY kategorisi verilir. */
async function uygula(
  urunTy: Map<string, string>,
  kuru: boolean,
  ek: { aday: number; yeniTyKategori: number; cakisan: number },
): Promise<KategoriYazimOzeti> {
  const atlanan = bosAtlanan();
  atlanan.CAKISAN = ek.cakisan;
  if (urunTy.size === 0) {
    return { ...ek, eslesenUrun: 0, tyYazilan: 0, kategoriYazilan: 0, atlanan, tavandaKalan: 0 };
  }
  const harita = await eslesmeHaritasi();
  const urunler = await prisma.product.findMany({
    where: { id: { in: [...urunTy.keys()] } },
    select: {
      id: true,
      categoryId: true,
      kategoriKaynak: true,
      tyKategori: true,
      vatRateOverride: true,
      category: { select: { vatRate: true } },
    },
  });

  const yazilacak: {
    id: string;
    eskiKategori: string | null;
    tyKategori: string;
    tyDegisir: boolean;
    yeniKategori: string | null;
  }[] = [];
  for (const u of urunler) {
    const ty = urunTy.get(u.id)!;
    const h = harita.get(ty);
    const karar = kategoriKarari({
      mevcutKategoriId: u.categoryId,
      mevcutKaynak: u.kategoriKaynak,
      mevcutKategoriKdv: u.category ? Number(u.category.vatRate.toString()) : null,
      urunIstisnasi: u.vatRateOverride !== null ? Number(u.vatRateOverride.toString()) : null,
      hedefKategoriId: h?.categoryId ?? null,
      hedefKategoriKdv: h?.kdv ?? null,
    });
    const yeniKategori = "yaz" in karar ? karar.yaz : null;
    if ("atla" in karar) atlanan[karar.atla]++;
    const tyDegisir = u.tyKategori !== ty;
    if (tyDegisir || yeniKategori !== null) {
      yazilacak.push({ id: u.id, eskiKategori: u.categoryId, tyKategori: ty, tyDegisir, yeniKategori });
    }
  }

  const bu = yazilacak.slice(0, KATEGORI_YAZIM_TAVANI);
  let tyYazilan = 0;
  let kategoriYazilan = 0;
  for (const y of kuru ? [] : bu) {
    const r = await prisma.product.updateMany({
      where: { id: y.id, categoryId: y.eskiKategori },
      data: {
        tyKategori: y.tyKategori,
        ...(y.yeniKategori !== null
          ? { categoryId: y.yeniKategori, kategoriKaynak: "TRENDYOL" as const, kategoriKaynakAt: new Date() }
          : {}),
      },
    });
    if (r.count !== 1) continue;
    if (y.tyDegisir) tyYazilan++;
    if (y.yeniKategori !== null) {
      kategoriYazilan++;
      await izYaz({
        action: KATEGORI_IZ_EYLEMI,
        userId: null,
        targetType: "Product",
        targetId: y.id,
        detail: JSON.stringify({ eski: y.eskiKategori, yeni: y.yeniKategori, tyKategori: y.tyKategori }),
      });
    }
  }
  return {
    ...ek,
    eslesenUrun: urunler.length,
    tyYazilan,
    kategoriYazilan,
    atlanan,
    tavandaKalan: yazilacak.length - bu.length,
  };
}

/** SENKRON girişi — Trendyol taramasındaki her ürünün barkodu ve kategorisi. */
export async function tyKategorileriniYaz(
  adaylar: readonly { barkod: string; tyKategori: string }[],
  /** KURU: hesaplar, YAZMAZ (tabloya yeni kategori de eklemez). */
  kuru = false,
): Promise<KategoriYazimOzeti> {
  const tekil = new Map<string, string>();
  for (const a of adaylar) {
    const b = a.barkod.trim();
    const k = tyKategoriAnahtari(a.tyKategori);
    if (b === "" || k === "" || tekil.has(b)) continue;
    tekil.set(b, k);
  }
  const bos = { aday: tekil.size, yeniTyKategori: 0, cakisan: 0 };
  if (tekil.size === 0) return uygula(new Map(), kuru, bos);

  /* Yeni görülen TY kategorisi tabloya KARŞILIKSIZ girer — tahmin edilmez. */
  const tumu = [...new Set(tekil.values())];
  const bilinen = new Set(
    (await prisma.tyKategoriEslesme.findMany({ where: { tyKategori: { in: tumu } }, select: { tyKategori: true } })).map(
      (s) => s.tyKategori,
    ),
  );
  const yeni = tumu.filter((k) => !bilinen.has(k));
  if (!kuru && yeni.length > 0) {
    await prisma.tyKategoriEslesme.createMany({ data: yeni.map((tyKategori) => ({ tyKategori })), skipDuplicates: true });
  }

  const varyantlar = await prisma.productVariant.findMany({
    where: { barcode: { in: [...tekil.keys()] } },
    select: { barcode: true, productId: true },
  });
  const kume = new Map<string, Set<string>>();
  for (const v of varyantlar) {
    const k = v.barcode ? tekil.get(v.barcode.trim()) : undefined;
    if (!k) continue;
    const s = kume.get(v.productId) ?? new Set<string>();
    s.add(k);
    kume.set(v.productId, s);
  }
  /* Bir ürünün varyantları FARKLI TY kategorilerindeyse karar verilmez. */
  const urunTy = new Map<string, string>();
  let cakisan = 0;
  for (const [id, s] of kume) {
    if (s.size === 1) urunTy.set(id, [...s][0]);
    else cakisan++;
  }
  return uygula(urunTy, kuru, { aday: tekil.size, yeniTyKategori: kuru ? 0 : yeni.length, cakisan });
}

/** EKRAN girişi — eşleşme değişince o TY kategorisindeki AKTİF ürünlere. */
export async function eslesmeyiUrunlereUygula(tyKategori: string): Promise<KategoriYazimOzeti> {
  const urunler = await prisma.product.findMany({
    where: { tyKategori, isActive: true },
    select: { id: true },
  });
  const urunTy = new Map(urunler.map((u) => [u.id, tyKategori]));
  return uygula(urunTy, false, { aday: urunler.length, yeniTyKategori: 0, cakisan: 0 });
}

/**
 * Karşılığı SEÇİLMEMİŞ ve en az bir AKTİF ürünü olan TY kategorisi sayısı.
 * Çan uyarısı ve Kategoriler sayfası kartı BURAYI çağırır — iki sayı ayrışamaz.
 */
export async function tyKategoriKarsiliksizSayisi(): Promise<number> {
  const dolu = await prisma.product.findMany({
    where: { isActive: true, tyKategori: { not: null } },
    select: { tyKategori: true },
    distinct: ["tyKategori"],
  });
  if (dolu.length === 0) return 0;
  return prisma.tyKategoriEslesme.count({
    where: { categoryId: null, tyKategori: { in: dolu.map((d) => d.tyKategori!) } },
  });
}
