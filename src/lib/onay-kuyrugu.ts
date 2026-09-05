import type { PrismaClient } from "@/generated/prisma/client";

import { gunHassasiyetliMi } from "@/lib/donem";
import { onayCekirdegi } from "@/lib/onay-cekirdegi";
import { satisKarTazele } from "@/lib/kar-yeniden";
import { acikPartiler, gunSonu } from "@/lib/stok";
import type { IslemIstemcisi } from "@/lib/prisma";

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
  /** Onayın ÖZ İZİ (K164-②): kolonu yalnız `siparisiOnayla` doldurur. */
  onaylandiAt: null,
  /** İkinci savunma — bağı BAŞKA yoldan kurulmuş satış da kuyruğa girmez. */
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
  /** Onayın öz izi — `siparisiOnayla` yazar (K164-②). */
  onaylandiAt: Date | null;
  saleOutSayisi: number;
}):
  | { uygun: true }
  | { uygun: false; sebep: "ICE_AKTARMA_DEGIL" | "KARGOLANMIS" | "IPTALLI" | "ZATEN_ONAYLI" | "TARIHSEL" } {
  if (satis.importKaynak === null) return { uygun: false, sebep: "ICE_AKTARMA_DEGIL" };
  if (satis.shippedAt !== null) return { uygun: false, sebep: "KARGOLANMIS" };
  if (satis.iptalTarihi !== null) return { uygun: false, sebep: "IPTALLI" };
  /** İki ayrı soru, iki ayrı kontrol: ① onay İZİ var mı (öz iz) ·
   *  ② stok bağı BAŞKA yoldan kurulmuş mu (çift düşüm emniyeti). */
  if (satis.onaylandiAt !== null) return { uygun: false, sebep: "ZATEN_ONAYLI" };
  if (satis.saleOutSayisi > 0) return { uygun: false, sebep: "ZATEN_ONAYLI" };
  if (gunHassasiyetliMi(satis.soldAt)) return { uygun: false, sebep: "TARIHSEL" };
  return { uygun: true };
}

/**
 * ============================================================================
 *  OTOMATİK ONAY — TEK PARTİLİ SİPARİŞTE ONAYA GEREK YOK (K168)
 * ----------------------------------------------------------------------------
 *  Halil 05.09.2026: _"tek parti mal varsa onaya gerek olmasın."_ Seçilecek
 *  bir şey yoksa (her kalemde sınır-içi TAM BİR açık parti) sipariş çekim
 *  anında kendiliğinden onaylanır: stok düşer, NET hesaplanır, kargolanacak
 *  kümesine girer.
 *
 *  ⚠ AYNI KAPILARDAN GEÇER: `onayCekirdegi` (uygunluk · sayım · dönem ·
 *  FIFO · SALE_OUT · iz) — sayım/dönem duraksatırsa otomatik onaylanmaz,
 *  kuyrukta kalır ve elle onaya düşer. Sessiz yazım yok.
 *
 *  ⚠ ÇEKİM BETİĞİNİN PRISMA'SIYLA ÇALIŞIR (parametre) — global `prisma`
 *  betikte canlıyı göstermeyebilir; kâr tazeleme de AYNI istemciyle.
 *
 *  ⚠ SAYFA AÇILIŞINDA (GET) ÇAĞRILMAZ — yalnız çekim (yazım işi) tetikler.
 *  GET'te sessiz yazım bu deponun kaçındığı şeydir (PWA/önbellek kararının
 *  kardeşi). Çekim 10 dakikada bir koştuğu için eski kuyruk da en geç o
 *  kadar bekler.
 * ============================================================================
 */

/** Bir siparişin her kaleminde sınır-içi TAM BİR açık parti var mı — yani
 *  seçilecek bir şey yok mu. Boş kalemli/partisiz sipariş `false` (otomatik
 *  onaylanmaz; stok yetersizliği elle görülür). */
async function tekPartiMi(
  db: IslemIstemcisi,
  satis: { soldAt: Date; items: { variantId: string }[] },
): Promise<boolean> {
  if (satis.items.length === 0) return false;
  const sinir = gunSonu(satis.soldAt);
  for (const k of satis.items) {
    const partiler = await acikPartiler(db, k.variantId, sinir);
    if (partiler.length !== 1) return false;
  }
  return true;
}

export type OtomatikOnayOzeti = {
  aday: number;
  onaylanan: number;
  cokParti: number;
  atlanan: number;
};

/**
 * Kuyruktaki TEK PARTİLİ siparişleri otomatik onaylar. Çekim yazımdan sonra
 * çağırır (kendi prisma'sıyla). Her sipariş AYRI işlemde: biri sayım/dönem
 * kapısına takılırsa öteki etkilenmez.
 *
 * ⚠ `prismaTam` — kâr tazeleme `$transaction` gerektirdiği için tam istemci
 * (tx değil). `onayBekleyenler` de aynı istemciyi kullanır.
 */
export async function otomatikOnaylaKuyruk(
  prismaTam: PrismaClient,
): Promise<OtomatikOnayOzeti> {
  const bekleyenler = await onayBekleyenler(prismaTam);
  let onaylanan = 0;
  let cokParti = 0;
  let atlanan = 0;
  for (const b of bekleyenler) {
    const satis = await prismaTam.sale.findUnique({
      where: { id: b.id },
      select: { soldAt: true, items: { select: { variantId: true } } },
    });
    if (!satis) {
      atlanan++;
      continue;
    }
    if (!(await tekPartiMi(prismaTam, satis))) {
      cokParti++;
      continue;
    }
    try {
      const sonuc = await prismaTam.$transaction((tx) =>
        onayCekirdegi(tx, { saleId: b.id, secimler: {}, otomatik: true }),
      );
      if (sonuc.tamam) {
        await satisKarTazele(b.id, prismaTam);
        onaylanan++;
      } else {
        /** Sayım/dönem/stok kapısına takıldı → elle onaya kalır. */
        atlanan++;
      }
    } catch {
      /** Dönem kapalı vb. — kayıt kuyrukta kalır, elle onaylanır. */
      atlanan++;
    }
  }
  return { aday: bekleyenler.length, onaylanan, cokParti, atlanan };
}
