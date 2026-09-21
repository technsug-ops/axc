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
  name: true,
  product: { select: { name: true } },
} as const;

/**
 * ⚠ TAVAN BİR GÖSTERİM SINIRIDIR, ÖLÇÜM SINIRI DEĞİL. Tavana DAYANAN bir
 * sonuç ekranda "en az N" diye yazılır; "tam N" diye değil.
 */
export const ADAY_TAVANI = 5;

export type KodAdayi = {
  id: string;
  sku: string;
  companySku: string;
  barcode: string | null;
  ad: string;
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
    sku: v.sku,
    companySku: v.companySku,
    barcode: v.barcode,
    ad: v.name ? `${v.product.name} — ${v.name}` : v.product.name,
  }));

  if (adaylar.length === 0) return { durum: "YOK" };
  if (adaylar.length === 1) return { durum: "TEK", id: adaylar[0]!.id, aday: adaylar[0]! };
  return { durum: "COK", adaylar, tavandaMi: adaylar.length === ADAY_TAVANI };
}
