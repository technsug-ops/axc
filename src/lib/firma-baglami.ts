import { AsyncLocalStorage } from "node:async_hooks";

/**
 * ============================================================================
 *  AKTİF FİRMA BAĞLAMI — K303 Aşama 3a
 * ----------------------------------------------------------------------------
 *  Sıra (ilk bulunan kazanır):
 *  ① açıkça kurulmuş bağlam — `firmaBaglamindaCalistir(companyId, fn)`;
 *     zamanlanmış işler ve betikler firma firma bunu kullanır (Aşama 3b);
 *  ② istek bağlamı — oturumdaki kullanıcının üyeliği (`yetkiBaglami`).
 *  Hiçbiri yoksa `null` — süzgeç sorguyu HATA ile durdurur. «Firma
 *  bilinmiyor → hepsini göster» diye bir dal YOK (tasarım §4).
 * ============================================================================
 */

const depo = new AsyncLocalStorage<{ companyId: string }>();

export function firmaBaglamindaCalistir<T>(companyId: string, fn: () => PromiseLike<T> | T): Promise<T> {
  if (!companyId) throw new Error("firmaBaglamindaCalistir: companyId boş");
  /**
   * ⛔ `await` BAĞLAMIN İÇİNDE. Prisma sorguları TEMBELDİR: `prisma.sale.count()`
   * bir «PrismaPromise» döndürür ve sorgu ancak beklendiğinde koşar. `fn`
   * doğrudan döndürülseydi bekleme `run` kapsamının DIŞINDA olur, süzgeç
   * bağlamı göremez ve `FIRMA_BAGLAMI_YOK` verirdi (ölçüldü 03.10.2026 —
   * ilk ölçüm betiği tam bunu yakaladı).
   */
  return depo.run({ companyId }, async () => await fn());
}

/** ① açık bağlam (yalnız ALS). Saf okuma; istek bağlamına bakmaz. */
export function acikFirmaBaglami(): string | null {
  return depo.getStore()?.companyId ?? null;
}

/**
 * ① yoksa ② istek bağlamı. `yetki` modülü burada DİNAMİK yüklenir: o modül
 * ortak istemciyi kullanır ve statik içe aktarma döngü kurardı.
 * Next istek kapsamı dışında (betik) `cookies()` hata verir → `null`.
 */
export async function aktifFirmaKimligi(): Promise<string | null> {
  const acik = acikFirmaBaglami();
  if (acik) return acik;
  const { yetkiBaglami } = await import("@/lib/yetki");
  try {
    return (await yetkiBaglami())?.companyId ?? null;
  } catch (e) {
    /**
     * ⛔ YALNIZ «istek kapsamı dışında» yutulur (betik, zamanlanmış iş). Başka
     * her hata (veritabanı kopuk vb.) OLDUĞU GİBİ fırlatılır — yutulsaydı
     * «firma bilinmiyor» gibi görünür, gerçek sebep kaybolurdu (anayasa:
     * «yakalanmamış hata, yutulmuş hatanın kardeşidir»).
     */
    if (e instanceof Error && /request scope|outside a request|was called outside/i.test(e.message)) {
      return null;
    }
    throw e;
  }
}

/**
 * Çekim betiklerinin firması: açıkça verilen, yoksa açık bağlam. İkisi de
 * yoksa HATA — «parametresiz koşum HATA verir» (tasarım §5). Oturuma BAKMAZ:
 * betik ve zamanlanmış işin oturumu yoktur.
 */
export function zorunluFirma(verilen: string | undefined, yer: string): string {
  const id = verilen ?? acikFirmaBaglami();
  if (!id) throw new Error(`FIRMA_BAGLAMI_YOK: ${yer} firmasız çağrıldı (--firma=<kod> ya da zamanlanmış iş döngüsü)`);
  return id;
}
