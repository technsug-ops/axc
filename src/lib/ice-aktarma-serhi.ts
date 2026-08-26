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

/**
 * ============================================================================
 *  MARJ ŞERHİ — "CİRODA VAR, KÂRDA YOK"
 * ----------------------------------------------------------------------------
 *  ⛔ CANLI ÖLÇÜM 26.08.2026 — ve risk beklenenin TERSİ çıktı.
 *
 *  İçe aktarılan 425 satışın 425'inde `profitStatus = null`. Ciro süzgeci
 *  yalnız iptali eliyor, dolayısıyla o satışlar CİROYA GİRİYOR; NET ise
 *  `null` olduğu için toplama KATILMIYOR (Prisma `_sum` null'ları atlar).
 *
 *      CİRO (ekran)                1.797.629,72
 *      NET-2 (ekran)                  46.462,11
 *      MARJ (ekran)                        2,58%
 *      MARJ (yalnız maliyet bağlı)         9,31%
 *
 *  Aylık daha da sert: 2026-06 **%0,3** (47 satışın 46'sı içe aktarma),
 *  2026-07 **%0,2** (287'nin 283'ü). O aylarda ekran marjı **anlamsız**.
 *
 *  ⚠ YANİ KÂR ŞİŞKİN DEĞİL, MARJ ÇÖKMÜŞ GÖRÜNÜYOR. Şerh metni bunu
 *  DOĞRU yönde söylemeli: "kâra dahil değil" — "şişkin" değil.
 *  _(Anayasa: "metin, sahip olmadığı anlamı iddia etmez".)_
 * ============================================================================
 */

export type MarjSerhi = {
  /** Maliyet bağı bekleyen satış sayısı — iptalsiz. */
  bekleyen: number;
  /** Yalnız maliyet bağı OLAN satışların marjı (%). Hesaplanamazsa null. */
  baglıMarj: number | null;
  /** Ekranda görünen marj (%) — bekleyenler ciroya dahil. */
  ekranMarji: number | null;
};

/**
 * ⚠ İKİ RAKAM BİRLİKTE ÜRETİLİR — TEK SORGUDAN.
 * Ayrı ayrı üretilseydi ikisi farklı ana bakabilir ve "ekran %2,58 diyor
 * ama şerh %2,61 diyor" gibi bir çelişki doğardı.
 * _(Anayasa: "sonda parametresi ekranın parametresi değildir".)_
 */
export async function marjSerhi(
  db: Pick<PrismaClient, "saleItem">,
  pencere?: { bas: Date; son: Date },
): Promise<MarjSerhi> {
  const kalemler = await db.saleItem.findMany({
    where: {
      sale: {
        iptalTarihi: null,
        ...(pencere ? { soldAt: { gte: pencere.bas, lte: pencere.son } } : {}),
      },
    },
    select: {
      quantity: true,
      unitPriceAmount: true,
      sale: {
        select: { id: true, importBatch: true, profitStatus: true, net2Amount: true },
      },
    },
  });

  let ciroHepsi = 0;
  let ciroBagli = 0;
  const netler = new Map<string, number>();
  const bekleyenler = new Set<string>();
  for (const k of kalemler) {
    const tutar = Number(k.unitPriceAmount) * k.quantity;
    ciroHepsi += tutar;
    /**
     * ⚠ ÖLÇÜT `importBatch` DEĞİL, KÂRIN HESAPLANMIŞ OLMASI. Maliyet bağı
     * kurulup kâr hesaplanınca satır hâlâ `importBatch` taşıyacak ama
     * artık şerhe girmemeli. `importBatch`e bakan bir sayaç o gün de
     * yanmaya devam ederdi — sönmeyen şerh okunmaz olur.
     */
    if (k.sale.profitStatus === null) {
      if (k.sale.importBatch) bekleyenler.add(k.sale.id);
      continue;
    }
    ciroBagli += tutar;
    if (k.sale.net2Amount !== null) netler.set(k.sale.id, Number(k.sale.net2Amount));
  }
  let net = 0;
  for (const v of netler.values()) net += v;

  return {
    bekleyen: bekleyenler.size,
    baglıMarj: ciroBagli > 0 ? (net / ciroBagli) * 100 : null,
    ekranMarji: ciroHepsi > 0 ? (net / ciroHepsi) * 100 : null,
  };
}
