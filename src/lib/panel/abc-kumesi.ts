import type { Currency } from "@/generated/prisma/enums";
import { KALEM_GECERLI } from "@/lib/kalem-gecerli";
import { abcUyelikleri, ABC_KOVALARI, type AbcGirdisi, type AbcKovasi } from "@/lib/panel/bi";
import type { prisma as prismaIstemcisi } from "@/lib/prisma";
import { acikPartilerToplu } from "@/lib/stok";

/**
 * ============================================================================
 *  ABC KÜMESİ — PANEL İLE LİSTE AYNI GÖVDEDEN (kullanıcı isteği 09.10.2026)
 * ----------------------------------------------------------------------------
 *  «A · B · C · dönemde satışı yok satırlarına tıklanınca listeye gitmeli.»
 *  (İlke #16: performans değerlendirmesi kaynağına götürür.)
 *
 *  ⭐ TEK YÜKLEYİCİ: panelin ABC kartı ve Ürünler listesindeki `abc=` süzgeci
 *  girdiyi BURADAN alır (dönemin satış kalemlerinden ürün cirosu · bugünkü açık
 *  partilerden stok değeri). İki ekran ayrı sorgu yazsaydı «67 ürün» diyen
 *  satır başka bir 67'yi açabilirdi. Sınıflama da tek döngüden (`abcUyelikleri`).
 *
 *  ⭐ KAPSAM ADRESTE ÇÖZÜLMÜŞ HÂLİYLE: panelin dönemi kendi varsayılanından
 *  çözülür, Ürünler'inki başka — bu yüzden bağlantı dönemi ANLARIYLA taşır
 *  (başlangıç · bitiş-hariç · para · kanal), tek parametrede (`abc=`): sayfalama,
 *  Excel ve düğmeler onu tek değer olarak taşır, bir parçası unutulamaz.
 *  ⚠ Stok değeri BUGÜNÜN açık partilerinden (panelle aynı tanım) — bağlantı
 *  sonraki gün açılırsa «satışsız» kümesi stokla birlikte değişebilir; ciro
 *  sınıfları dönem anlarıyla sabittir.
 * ============================================================================
 */

export type AbcKapsami = { baslangic: Date; bitisHaric: Date; para: Currency; kanal: string | null };

export const ABC_PARAMETRESI = "abc";
const AYRAC = "~";
const PARALAR: readonly Currency[] = ["TRY", "EUR"];

/** Panelden Ürünler'e giden adres — kapsam çözülmüş hâliyle. */
export function abcAdresi(kova: AbcKovasi, k: AbcKapsami): string {
  const deger = [kova, k.baslangic.getTime(), k.bitisHaric.getTime(), k.para, k.kanal ?? ""].join(AYRAC);
  return `/urunler?${ABC_PARAMETRESI}=${encodeURIComponent(deger)}`;
}

/** Adresteki değeri çözer; bozuk/eksik/ters aralık → `null` (süzgeç uygulanmaz, uydurulmaz). */
export function abcSuzgeciCoz(ham: string | undefined): { kova: AbcKovasi; kapsam: AbcKapsami } | null {
  if (!ham) return null;
  const [kova, bas, bit, para, kanal, ...fazla] = ham.split(AYRAC);
  if (fazla.length > 0 || kanal === undefined) return null;
  if (!(ABC_KOVALARI as readonly string[]).includes(kova ?? "")) return null;
  if (!(PARALAR as readonly string[]).includes(para ?? "")) return null;
  if (!/^\d+$/.test(bas ?? "") || !/^\d+$/.test(bit ?? "")) return null;
  const baslangic = new Date(Number(bas));
  const bitisHaric = new Date(Number(bit));
  if (!(baslangic.getTime() < bitisHaric.getTime())) return null;
  return {
    kova: kova as AbcKovasi,
    kapsam: { baslangic, bitisHaric, para: para as Currency, kanal: kanal === "" ? null : kanal },
  };
}

/** ABC girdisi — dönem cirosu (ürün başına) + bugünkü stok değeri (ürün başına). */
export async function abcGirdileriniYukle(
  db: typeof prismaIstemcisi,
  k: AbcKapsami,
): Promise<{ girdiler: AbcGirdisi[]; toplamStokDegeri: number }> {
  const [kalemler, partiler] = await Promise.all([
    db.saleItem.findMany({
      where: {
        ...KALEM_GECERLI,
        unitPriceCurrency: k.para,
        sale: {
          soldAt: { gte: k.baslangic, lt: k.bitisHaric },
          iptalTarihi: null,
          ...(k.kanal ? { channelAccount: { channel: { code: k.kanal } } } : {}),
        },
      },
      select: { quantity: true, unitPriceAmount: true, variant: { select: { productId: true } } },
    }),
    acikPartilerToplu(db, null),
  ]);
  const ciro = new Map<string, number>();
  for (const kl of kalemler) {
    ciro.set(kl.variant.productId, (ciro.get(kl.variant.productId) ?? 0) + Number(kl.unitPriceAmount) * kl.quantity);
  }
  const varyantlar = await db.productVariant.findMany({
    where: { id: { in: [...partiler.keys()] } },
    select: { id: true, productId: true },
  });
  const urunu = new Map(varyantlar.map((v) => [v.id, v.productId]));
  const stok = new Map<string, number>();
  for (const [varyantId, liste] of partiler) {
    const urunId = urunu.get(varyantId);
    if (!urunId) continue;
    for (const p of liste) {
      if (p.birimMaliyet === null || p.birimMaliyetParaBirimi !== k.para) continue;
      stok.set(urunId, (stok.get(urunId) ?? 0) + p.kalanAdet * Number(p.birimMaliyet));
    }
  }
  const urunler = new Set([...ciro.keys(), ...stok.keys()]);
  return {
    girdiler: [...urunler].map((urunId) => ({ urunId, ciro: ciro.get(urunId) ?? 0, stokDegeri: stok.get(urunId) ?? 0 })),
    toplamStokDegeri: [...stok.values()].reduce((a, b) => a + b, 0),
  };
}

/** Listenin süzgeci — sınıftaki ürün kimlikleri (panelle aynı yükleyici + aynı döngü). */
export async function abcUrunIdleri(db: typeof prismaIstemcisi, kova: AbcKovasi, k: AbcKapsami): Promise<string[]> {
  const { girdiler } = await abcGirdileriniYukle(db, k);
  return [...abcUyelikleri(girdiler)].filter(([, s]) => s === kova).map(([id]) => id);
}
