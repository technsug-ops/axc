import { prisma } from "@/lib/prisma";
import { kodKosulu } from "@/lib/varyant-arama-kurali";

/**
 * ============================================================================
 *  KOD → VARYANT ÇÖZÜMÜ — "TEKİ" GARANTİ EDEN TEK GÖVDE (21.09.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ NİYE DOĞDU — CANLI ARIZA. Hepsiburada siparişi onaylanamıyordu:
 *  `Stok yetersiz (HBCV00000R0H0K: 0/1)`. Rakam DOĞRUYDU; yanlış olan, kodun
 *  hangi varyanta çözüldüğüydü. `HBCV00000R0H0K` İKİ aktif varyanta birden
 *  uyuyordu — biri gerçek ürün (stok 4, kanal eşleşmesi doğru), öteki bir
 *  içe aktarmanın yarattığı ikiz (stok 0, pazaryeri kodu KİMLİK alanına
 *  yazılmış).
 *
 *  Beş çağıranın BEŞİ de şunu yapıyordu:
 *
 *      prisma.productVariant.findFirst({ where: { OR: kodKosulu(kod) } })
 *
 *  `findFirst` + sıralama yok = **veritabanının o anki sırası kazanır.**
 *  Kaybeden sessizce düşer; ne hata çıkar, ne uyarı. Anayasa bu sınıfı adıyla
 *  anıyor: _"seçici ölçüt, evren genişlediğinde ne yapacağıyla tasarlanır —
 *  bugün doğru cevabı vermesi, sınanmış olduğunu göstermez."_
 *
 *  ── BU GÖVDE SEÇMEZ, SAYAR ─────────────────────────────────────────────
 *  Üç sonuç ayrıdır ve üçü de çağırana AÇIKÇA söylenir:
 *    · `YOK` — hiçbir varyanta uymuyor
 *    · `TEK` — tam bir karşılığı var
 *    · `COK` — birden çok karşılığı var; **çağıran seçmez, SORAR ya da SÖYLER**
 *
 *  `YOK` ile `COK` aynı kefeye konmaz: biri "böyle bir ürün yok", öteki
 *  "birden fazla var". İkisi "bulunamadı" diye tek kefeye konsaydı operatör
 *  var olan bir ürünü yeniden tanımlamaya kalkardı ve ikizlerin sayısı
 *  artardı — arızanın kendisini besleyen bir mesaj.
 *  _(Anayasa: "sıfır üç farklı şey olabilir — üçü ayrı sayılır.")_
 *
 *  ⚠ TAVAN NİYE `ADAY_TAVANI`: kaç aday olduğunu SÖYLEYEBİLMEK için ikiden
 *  fazlası da okunur. `take: 2` "en az iki" derdi, "kaç" diyemezdi — ve
 *  ekranda "2 ürüne uyuyor" yazarken gerçekte 5 olması, doğru sayı sanılan
 *  yanlış bir rakam üretirdi.
 * ============================================================================
 */

/** Adayı TANITMAYA yeten alanlar — operatör hangisi olduğunu ayırt edebilmeli. */
const ADAY_SECIMI = {
  id: true,
  sku: true,
  companySku: true,
  barcode: true,
  /** K237: kapı, sahibin AKTİF mi PASİF mi olduğunu bilmeden karar veremez. */
  isActive: true,
  name: true,
  product: { select: { id: true, name: true } },
} as const;

/**
 * ⚠ TAVAN BİR GÖSTERİM SINIRIDIR, ÖLÇÜM SINIRI DEĞİL. Tavana DAYANAN bir
 * sonuç ekranda "en az N" diye yazılır; "tam N" diye değil.
 */
export const ADAY_TAVANI = 5;

export type KodAdayi = {
  id: string;
  /** Sahibi olan ÜRÜN — düzenleme ekranı kendi ürününü hariç tutabilsin. */
  urunId: string;
  sku: string;
  companySku: string;
  barcode: string | null;
  ad: string;
  /**
   * K237 (23.09.2026) — SAHİBİN HÂLİ KARARIN PARÇASIDIR. Pasife alınmış bir
   * ikizin kodu, AKTİF tarafta çakışma üretmez; orada sert yasak, temizlenmiş
   * bir çarpışmanın enkazını kalıcı engele çevirir (bkz. `kanal-sku/actions`).
   */
  aktifMi: boolean;
};

export type KodCozumu =
  | { durum: "YOK" }
  | { durum: "TEK"; id: string; aday: KodAdayi }
  | { durum: "COK"; adaylar: KodAdayi[]; tavandaMi: boolean };

/**
 * Kodu varyantlara çözer ve **kaç tane** olduğunu söyler.
 *
 * ⛔ VARSAYILAN: YALNIZ AKTİF. Pasife alınmış bir kayıt bilerek aramanın
 * dışındadır — ikiz temizliğinin dayandığı davranış budur ve süzgeci
 * gevşetmek temizlenen çarpışmaları geri getirirdi.
 *
 * ⚠ `pasifDahil` TEK BİR ÇAĞIRAN İÇİN VAR VE GEREKÇESİ ONUN YANINDA:
 * fiziksel sayım rafta NE VARSA onu kaydeder; pasife alınmış bir mal da
 * raftadır ve okutulunca çözülmelidir _(K121b · kullanıcı kuralı
 * 29.08.2026: "esas unsur fiziki varlıktır")_. Kip AÇILDIĞINDA çakışma
 * ihtimali ARTAR — pasife alınmış ikizler yeniden kapsama girer — bu yüzden
 * o çağıranın "COK" dalını işlemesi daha da zorunludur.
 */
export async function kodlaVaryantCoz(
  kod: string,
  secenek: { pasifDahil?: boolean } = {},
): Promise<KodCozumu> {
  const temiz = kod.trim();
  if (!temiz) return { durum: "YOK" };

  const satirlar = await prisma.productVariant.findMany({
    where: {
      ...(secenek.pasifDahil ? {} : { isActive: true }),
      OR: kodKosulu(temiz),
    },
    select: ADAY_SECIMI,
    take: ADAY_TAVANI,
  });

  const adaylar: KodAdayi[] = satirlar.map((v) => ({
    id: v.id,
    urunId: v.product.id,
    sku: v.sku,
    companySku: v.companySku,
    barcode: v.barcode,
    ad: v.name ? `${v.product.name} — ${v.name}` : v.product.name,
    aktifMi: v.isActive,
  }));

  if (adaylar.length === 0) return { durum: "YOK" };
  if (adaylar.length === 1) return { durum: "TEK", id: adaylar[0]!.id, aday: adaylar[0]! };
  return { durum: "COK", adaylar, tavandaMi: adaylar.length === ADAY_TAVANI };
}

/**
 * ============================================================================
 *  YAZMA KAPISI — BU KOD BAŞKASININ MI (21.09.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ MUSLUĞUN KENDİSİ BURADAYDI. Üç ikiz kaydı temizledik ama DOĞDUKLARI yol
 *  açık kalmıştı. Ölçüldü ve sebep tek cümle:
 *
 *      **YAZMA KAPISI, OKUMA KAPISINDAN DARDI.**
 *
 *  · Ürün formu bir varyantın `sku`/`firmaSku`/`barkod`unu yalnız ÖTEKİ
 *    varyantların AYNI alanlarına karşı sınıyordu — Kanal SKU'lara DEĞİL.
 *  · Kanal eşleştirme ekranı yeni kodu yalnız ÖTEKİ kanal kodlarına karşı
 *    sınıyordu — varyantların kimlik alanlarına DEĞİL.
 *
 *  Arama (`kodKosulu`) ise **dört rolü birden** görüyor. Yani iki kapı da
 *  "temiz" diyor, sonra arama iki kayıt buluyor ve sessizce birini seçiyordu.
 *  _(Anayasa: "yazımın kapısı ile okumanın kapısı AYNI ölçüde bakar; iki
 *  yerde iki farklı ölçüt olursa biri ötekinin yazdığını göremez.")_
 *
 *  ⚠ VE BU BİR ENGEL DEĞİL, BİR SORUDUR: kapı çakışmayı SÖYLER, kararı
 *  operatöre bırakır. Sert yasak, meşru bir kaydı kilitleyebilirdi —
 *  bu depoda `soldAt` sınırı defterin %48'ini kilitleyecekti.
 * ============================================================================
 */
export async function kodBaskaVaryantaAitMi(
  kod: string,
  haric: { variantId?: string; urunId?: string } = {},
): Promise<KodAdayi | null> {
  /**
   * ⚠ PASİF DAHİL — VE BU BİLEREK. Pasife alınmış bir ikizin kodunu ikinci
   * kez kullanmak, temizlenen çarpışmayı geri getirir. Yazma kapısı arama
   * kapısından DAHA GENİŞ bakar; tersi olsaydı kapı kendi temizlediği şeyi
   * yeniden üretirdi.
   */
  const cozum = await kodlaVaryantCoz(kod, { pasifDahil: true });
  if (cozum.durum === "YOK") return null;

  const adaylar = cozum.durum === "TEK" ? [cozum.aday] : cozum.adaylar;
  return (
    adaylar.find(
      (a) => a.id !== haric.variantId && a.urunId !== haric.urunId,
    ) ?? null
  );
}
