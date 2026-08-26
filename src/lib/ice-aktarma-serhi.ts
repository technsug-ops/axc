import type { PrismaClient } from "@/generated/prisma/client";

/**
 * ============================================================================
 *  İÇE AKTARMA ŞERHİ — STOK AYRIŞMASI GÖRÜNÜR OLSUN
 * ----------------------------------------------------------------------------
 *  A3-③'te içe aktarılan satışlar **bilinçli olarak** stok düşürmedi:
 *  `SALE_OUT` yazılsaydı FIFO'dan mal düşerdi ve geri alması ledger'a ters
 *  kayıt gerektirirdi. Stok bağı AYRI ve SONRAKİ bir karar.
 *
 *  ⛔ AMA "BİLİNÇLİ" DEMEK "GÖRÜNMEZ" DEMEK DEĞİLDİR. Stok ekranına bakan
 *  biri, satışı defterde görüp stoğun düşmediğini fark ederse sistemin
 *  bozuk olduğunu düşünür. Bilinen bir ayrışma, EKRANDA yazmazsa bilinmiyor
 *  demektir.
 *
 *  ⚠ SAYI CANLI, SABİT DEĞİL. `N` sorgudan gelir; sabit yazılsaydı stok
 *  bağı kurulduğu gün ekranda yanlış bir rakam kalırdı ve onu güncellemesi
 *  gereken kişi bunu hatırlamak zorunda olurdu.
 *
 *  ⚠ VE SIFIRSA HİÇ ÇIKMAZ: sönmeyen bir şerh okunmaz olur ve yanındaki
 *  gerçek uyarıların da güvenini götürür.
 * ============================================================================
 */

/**
 * Stok düşümü YAPILMAMIŞ içe aktarma satışlarının sayısı.
 *
 * ⚠ ÖLÇÜT `importBatch` DEĞİL, BAĞ. "İçe aktarıldı" ile "stok düşmedi"
 * ayrı şeylerdir: stok bağı kurulduğu gün aynı satırlar hâlâ
 * `importBatch` taşıyacak ama artık ayrışmış olmayacaklar. Ölçüt bu yüzden
 * hareketin VARLIĞINA bakar — kaydın nereden geldiğine değil.
 * _(Anayasa: "tip listesi değil, BAĞ".)_
 */
export async function iceAktarmaStokAyrismasi(
  db: Pick<PrismaClient, "sale">,
): Promise<number> {
  return db.sale.count({
    where: {
      importBatch: { not: null },
      /**
       * ⚠ İPTALLİ SATIŞ SAYILMAZ — VE BU BİR KARAR DEĞİŞİKLİĞİDİR.
       *
       * ⛔ ESKİ GEREKÇEM (yanlış, silinmiyor): _"iptalliyi ayıklamak sayıyı
       * iki farklı sorgunun ortasına düşürür"_ demiştim. `iptal:bekci`
       * kırmızı yandı ve haklıydı.
       *
       * İptal edilmiş satış stok düşürmez — ne bugün ne yarın. Yani
       * "stok bağı bekleyen" değil, **doğru biçimde stoksuz**. Sayıya
       * katılsaydı 26 satır burada SONSUZA KADAR kalırdı: 399 satırın bağı
       * kurulduğu gün bile şerh `26` deyip yanmaya devam ederdi.
       * _(Anayasa: "sonsuza kadar yanan uyarı olmaz" — sönmeyen uyarı
       * okunmaz olur ve yanındaki gerçek uyarıların güvenini götürür.)_
       */
      iptalTarihi: null,
      items: { none: { stockMovements: { some: {} } } },
    },
  });
}

/**
 * ⚠ SAYININ ETİKETİ — kapsamı yanında taşır.
 * _(Anayasa: "bir sayı etiketiyle taşınır".)_
 */
export const SERH_KAPSAMI =
  "importBatch dolu + İPTALSİZ + hiçbir kaleminde stok hareketi yok";
