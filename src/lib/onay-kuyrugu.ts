import type { PrismaClient } from "@/generated/prisma/client";

import { gunHassasiyetliMi } from "@/lib/donem";

/**
 * ============================================================================
 *  ONAY KUYRUĞU — API'DEN GELEN SİPARİŞİN OPERASYONA GİRİŞ KAPISI (K164)
 * ----------------------------------------------------------------------------
 *  Halil kararı 04.09.2026: _"sipariş düşer, maliyet seçilince onaylanır ve
 *  kargolanacak sekmesine dahil olur — pazaryerlerindeki gibi."_
 *
 *  API çekimi satışı YALNIZ DEFTERE yazar (ciroya girer): stok düşümü ve
 *  kâr bağı ONAYLA kurulur. Bu dosya "kim onay bekliyor" sorusunun TEK
 *  sahibidir — panel sayısı, liste süzgeci ve eylem ön-kontrolü hepsi
 *  buradan okur (İlke #16: sayı = liste; K157 `marjSebep` deseni).
 *
 *  ⚠ CANLI AKIŞ AYRIMI — TARİH GÖMÜLMEDEN: kuyruğa yalnız `soldAt`i SAATLİ
 *  satış girer (`gunHassasiyetliMi` false). Gerekçe: K163'ten beri canlı
 *  çekim gerçek anı yazıyor; geçmiş içe aktarmalar GÜNE damgalı ve Halil
 *  kararıyla öyle KALACAK (_"saatleri geçmişe devam ettirmene gerek yok"_).
 *  Yani "saatli = canlı akış" veriden türeyen bir ayrımdır, sabit tarih
 *  değil. Tarihsel ~425 kayıt kuyruğu BOĞMAZ (K49: kapatılamayan madde
 *  kutuyu öldürür; K60: kapatılamayan yığın kullanıcıyı yıkıcı işleme iter).
 *
 *  ⚠ SQL'DE İFADE EDİLEMEZ: "saatli" koşulu (ms % 86.400.000 ≠ 0) Prisma
 *  where'e yazılamıyor; aday küme DB'den daraltılıp saat süzgeci JS'te
 *  koşuyor — `supheliIdler`/`marjIdler` ile aynı kimlik-kümesi deseni.
 * ============================================================================
 */

export const ONAY_PARAM = "onay";

/** İlke #16: adres, süzgeç sözleşmesinin sahibi dosyadan üretilir. */
export function onayAdresi(): string {
  return `/satislar?${ONAY_PARAM}=1`;
}

/**
 * DB tarafı — geniş aday kümesi. Saat süzgeci BURADA DEĞİL (SQL'e sığmaz);
 * çağıran `onayBekleyenler` üzerinden geçmek ZORUNDA.
 *
 * ⚠ "Stok bağı yok" OLAYIN İZİYLE ölçülür (SALE_OUT hareketi) — alan
 * doluluğuyla değil (K60-② dersi: alanın dolu olması olayı kanıtlamaz).
 */
export const ONAY_ADAY_KOSULU = {
  importKaynak: { not: null },
  shippedAt: null,
  NOT: { items: { some: { stockMovements: { some: { type: "SALE_OUT" as const } } } } },
} as const;

export type OnayBekleyen = { id: string; soldAt: Date };

export async function onayBekleyenler(
  db: Pick<PrismaClient, "sale">,
): Promise<OnayBekleyen[]> {
  const adaylar = await db.sale.findMany({
    /** `iptalTarihi: null` ÇAĞRI YERİNDE YAZILI — sabite saklanmıyor:
     *  `iptal:bekci` sabitin içini GÖREMİYOR; süzgeç bekçinin görebileceği
     *  yerde durur (okut/actions ile aynı karar, 27.08.2026). */
    where: { ...ONAY_ADAY_KOSULU, iptalTarihi: null },
    select: { id: true, soldAt: true },
    orderBy: { soldAt: "asc" },
  });
  return adaylar.filter((a) => !gunHassasiyetliMi(a.soldAt));
}

export async function onayBekleyenIdleri(
  db: Pick<PrismaClient, "sale">,
): Promise<string[]> {
  return (await onayBekleyenler(db)).map((a) => a.id);
}

/**
 * EYLEM ÖN-KONTROLÜ — saf. Sunucu eylemi yazmadan önce AYNI ölçütten geçer;
 * ekran süzgeci ile eylem kapısı ayrışırsa biri ötekinin göstermediğini
 * yazar (iki yerde iki ölçüt olmaz).
 */
export function onayaUygunMu(satis: {
  importKaynak: string | null;
  shippedAt: Date | null;
  iptalTarihi: Date | null;
  soldAt: Date;
  saleOutSayisi: number;
}):
  | { uygun: true }
  | { uygun: false; sebep: "ICE_AKTARMA_DEGIL" | "KARGOLANMIS" | "IPTALLI" | "ZATEN_ONAYLI" | "TARIHSEL" } {
  if (satis.importKaynak === null) return { uygun: false, sebep: "ICE_AKTARMA_DEGIL" };
  if (satis.shippedAt !== null) return { uygun: false, sebep: "KARGOLANMIS" };
  if (satis.iptalTarihi !== null) return { uygun: false, sebep: "IPTALLI" };
  if (satis.saleOutSayisi > 0) return { uygun: false, sebep: "ZATEN_ONAYLI" };
  if (gunHassasiyetliMi(satis.soldAt)) return { uygun: false, sebep: "TARIHSEL" };
  return { uygun: true };
}
