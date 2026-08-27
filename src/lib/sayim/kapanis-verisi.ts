import type { PrismaClient } from "@/generated/prisma/client";
import { satirHali, type SatirGirdisi, type SatirHali } from "@/lib/sayim/kova";
import { satirKarari, type SatirKarari } from "@/lib/sayim/karar";
import { sayimOzeti, type SayimOzeti } from "@/lib/sayim/ozet";

/**
 * ============================================================================
 *  SAYIM KAPANIŞI — VERİ TOPLAMA (K57 ②)
 * ----------------------------------------------------------------------------
 *  ⛔ HÜKÜM BURADA DEĞİL. Bu dosya yalnız OKUR; kova ayrımını `kova.ts`,
 *  yolları `karar.ts`, sayıları `ozet.ts` veriyor ve üçü de veritabanısız
 *  sınanıyor. Burada bir kural yazılsaydı sınanamaz bir yerde yaşardı.
 *
 *  ═══ ÜÇ ÖLÇÜM, HEPSİ SAYIM GÜNÜNE GÖRE ═══
 *
 *  ① `sistemAdedi` — **sayım günü SONU** itibarıyla (`occurredAt <= sayimGunu`).
 *     "Bugünkü stok" DEĞİL: sayımdan sonraki hareketler sapma sayılmaz.
 *
 *  ② `ayniGunHareketVar` — sayım gününde o varyantın hareketi var mı.
 *     Defter GÜN çözünürlüğünde; sayımın o hareketten önce mi sonra mı
 *     yapıldığı AYRILAMAZ. Satır "belirsiz" işaretlenir ve YAZILMAZ.
 *
 *  ③ `hareketsizSatis` — o varyantta stok hareketi OLMAYAN satış kalemi.
 *     ⚠ NİYE (kullanıcı sorusu 28.08.2026): eksik çıkan bir varyantta
 *     "satışı gir" demek, satış ZATEN kayıtlıysa **ciroyu iki kez sayar.**
 *     Ölçüldü: canlıda 2553/5866 satış kalemi (%43,5) stok hareketi taşımıyor.
 *     Sayım kapsamındaki 204 varyanttan yalnız 1'i bu durumda — risk düşük
 *     ama SIFIR DEĞİL, ve ekranda yazması gerekiyor.
 * ============================================================================
 */

export type KapanisSatiri = {
  variantId: string;
  sku: string;
  urunAdi: string;
  varyantAdi: string | null;
  sayilanAdet: number | null;
  sistemAdedi: number;
  hal: SatirHali;
  karar: SatirKarari;
  /** Bu varyantta stok hareketi olmayan satış kaydı sayısı (③). */
  hareketsizSatis: number;
  /**
   * ④ Bu varyantın DAHA ÖNCE alımı var mı.
   *
   * ⛔ FAZLA KOVASINI İKİYE AYIRIR ve ayrım iş üretir:
   *   var  → maliyeti sistem ZATEN biliyor; doğru iş "alımı gir"
   *   yok  → maliyet gerçekten bilinmiyor
   *
   * ⚠ NİYE ÖLÇÜLDÜ (28.08.2026): 103 fazla ürüne elle maliyet girmek
   * **₺400.252,88** yaratacaktı. Ölçüm gösterdi ki **80'inin alım geçmişi
   * VAR** — yani o maliyetlerin uydurulmasına gerek yok. Ekran ikisini ayırt
   * etmeden gösterirse kullanıcı hepsine elle maliyet yazar.
   */
  alimGecmisiVar: boolean;
};

export type KapanisVerisi = {
  sayimId: string;
  kod: string;
  sayimGunu: Date;
  kapandiMi: boolean;
  yazildiMi: boolean;
  ozet: SayimOzeti;
  /** ⛔ Beşinci sayı — dördün DIŞINDA. */
  belirsiz: number;
  /** Hiç okuma almamış kapalı oturum. Türetilir, alan AÇILMADI. */
  bosKapandi: boolean;
  /**
   * SAPMA BULDU AMA HİÇ DÜZELTME YAZMADI.
   *
   * ⚠ BU BİR EKSİKLİK DEĞİL, MEŞRU BİR SONUÇ (kullanıcı kararı 28.08.2026):
   * bir sayım bulgularını KAYIT olarak tutabilir ve düzeltmeler alım/satış
   * girişleriyle yapılabilir. Ekran bunu AÇIKÇA söylemek zorunda — yoksa
   * kullanıcı "sayım bir işe yaramadı" sanır.
   */
  duzeltmesizKapandi: boolean;
  fazla: KapanisSatiri[];
  eksik: KapanisSatiri[];
  okutulmayanlar: { variantId: string; sku: string; urunAdi: string }[];
};

export async function kapanisVerisi(
  db: PrismaClient,
  sayimId: string,
): Promise<KapanisVerisi | null> {
  const sayim = await db.stokSayimi.findUnique({
    where: { id: sayimId },
    select: { id: true, kod: true, sayimGunu: true, kapanisAt: true, yazimAt: true },
  });
  if (!sayim) return null;

  const satirlar = await db.stokSayimSatiri.findMany({
    where: { sayimId },
    select: {
      variantId: true,
      sayilanAdet: true,
      kapsamdaydi: true,
      duzeltmeYazildiAt: true,
      damgaSistemAdedi: true,
      variant: {
        select: { sku: true, name: true, product: { select: { name: true } } },
      },
    },
  });
  const kimlikler = satirlar.map((s) => s.variantId);

  /** ① SAYIM GÜNÜ SONU stoğu — sayımdan sonraki hareketler DIŞARIDA. */
  const stokGruplari = await db.stockMovement.groupBy({
    by: ["variantId"],
    where: { variantId: { in: kimlikler }, occurredAt: { lte: sayim.sayimGunu } },
    _sum: { quantityDelta: true },
  });
  const stok = new Map(stokGruplari.map((g) => [g.variantId, g._sum.quantityDelta ?? 0]));

  /** ② Sayım gününde hareketi olan varyantlar — hüküm verilemez. */
  const ayniGun = await db.stockMovement.groupBy({
    by: ["variantId"],
    where: { variantId: { in: kimlikler }, occurredAt: sayim.sayimGunu },
    _count: { _all: true },
  });
  const ayniGunKume = new Set(ayniGun.map((g) => g.variantId));

  /**
   * ③ Stok hareketi OLMAYAN satış kalemleri.
   * ⚠ İptal edilmiş satış sayılmaz: o zaten ciroya girmiyor ve "önce ona
   * bak" demek kullanıcıyı boş bir işe yollardı.
   */
  const satisKalemleri = await db.saleItem.findMany({
    where: { variantId: { in: kimlikler }, sale: { iptalTarihi: null } },
    select: { variantId: true, stockMovements: { select: { id: true } } },
  });

  /** ④ Alım geçmişi — fazla kovasını "alım bekliyor" / "maliyet yok" diye ayırır. */
  const alimliVaryantlar = new Set(
    (
      await db.purchaseItem.groupBy({
        by: ["variantId"],
        where: { variantId: { in: kimlikler } },
      })
    ).map((g) => g.variantId),
  );
  const hareketsiz = new Map<string, number>();
  for (const k of satisKalemleri) {
    if (k.stockMovements.length > 0) continue;
    hareketsiz.set(k.variantId, (hareketsiz.get(k.variantId) ?? 0) + 1);
  }

  const girdiler: SatirGirdisi[] = satirlar.map((s) => ({
    sayilanAdet: s.sayilanAdet,
    sistemAdedi: stok.get(s.variantId) ?? 0,
    kapsamdaydi: s.kapsamdaydi,
    ayniGunHareketVar: ayniGunKume.has(s.variantId),
    duzeltmeYazildiAt: s.duzeltmeYazildiAt,
    damgaSistemAdedi: s.damgaSistemAdedi,
  }));

  const zenginler: KapanisSatiri[] = satirlar.map((s, i) => {
    const hal = satirHali(girdiler[i]);
    return {
      variantId: s.variantId,
      sku: s.variant.sku,
      urunAdi: s.variant.product.name,
      varyantAdi: s.variant.name,
      sayilanAdet: s.sayilanAdet,
      sistemAdedi: girdiler[i].sistemAdedi,
      hal,
      karar: satirKarari(hal),
      hareketsizSatis: hareketsiz.get(s.variantId) ?? 0,
      alimGecmisiVar: alimliVaryantlar.has(s.variantId),
    };
  });

  const ozet = sayimOzeti(girdiler);

  return {
    sayimId: sayim.id,
    kod: sayim.kod,
    sayimGunu: sayim.sayimGunu,
    kapandiMi: sayim.kapanisAt !== null,
    yazildiMi: sayim.yazimAt !== null,
    ozet,
    /** ⛔ BEŞİNCİ SAYI, dördün DIŞINDA — dörtlüye karışmaz. */
    belirsiz: ozet.belirsiz,
    /**
     * ⚠ TÜRETİLİYOR, ALAN AÇILMADI. "Hiç okuma almamış kapalı oturum"
     * sorusunun cevabı özet zaten veriyor (`sayildi === 0`); şemaya
     * `bosKapandi` sütunu eklemek, aynı bilgiyi ikinci kez saklamak olurdu.
     */
    bosKapandi: sayim.kapanisAt !== null && ozet.sayildi === 0,
    /**
     * ⚠ SAPMA VARKEN hiç düzeltme yazılmamışsa — "kayıt olarak tutuldu".
     * Sapma YOKSA bu bayrak yanmaz: yazacak bir şey olmadığı için yazmamak
     * bir karar değildir.
     */
    duzeltmesizKapandi:
      sayim.kapanisAt !== null &&
      ozet.sapan > 0 &&
      zenginler.every((z) => z.hal.damga === "YAZILMADI"),
    fazla: zenginler.filter((z) => z.hal.kova === "FAZLA"),
    eksik: zenginler.filter((z) => z.hal.kova === "EKSIK"),
    okutulmayanlar: zenginler
      .filter((z) => z.hal.kova === "SAYILMADI" && !z.hal.kapsamDisi)
      .map((z) => ({ variantId: z.variantId, sku: z.sku, urunAdi: z.urunAdi })),
  };
}
