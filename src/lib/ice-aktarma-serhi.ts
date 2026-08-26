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
  /**
   * ⛔ SEBEP AYRIŞTIRILDI (Halil kararı 26.08.2026) — çünkü ÇÖZÜMÜN YERİ
   * FARKLI. İki ayrı şey tek cümleye karışırsa okuyan yanlış tarafta
   * çözüm arar:
   *
   *   `alimYok`  — o ürünün ALIMI deftere hiç girmemiş. Satış tarafında
   *                yapılacak bir şey YOK; iş alım defterindedir (K55).
   *   `bekleyen` — bağlanabilirdi ama henüz bağlanmadı (bağ koşumu
   *                yapılmadı ya da yarım kaldı).
   *
   * ⚠ Ölçüldü 26.08.2026: bağ koşumundan sonra `bekleyen` 0'a indi ve
   * geriye YALNIZ `alimYok` kaldı (329 satış). Yani bugün ekranda görünen
   * şey bir satış arızası değil, **eksik alım defteri tutanağıdır.**
   */
  alimYok: number;
  /** Maliyet bağı kurulabilir ama henüz kurulmamış satış — iptalsiz. */
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
      /**
       * ⚠ TEK HAREKET YETER — sayı değil VARLIK soruluyor. `take: 1`
       * olmadan 154 varyantın bütün hareket geçmişi çekilirdi.
       */
      variant: {
        select: { stockMovements: { take: 1, select: { id: true } } },
      },
    },
  });

  let ciroHepsi = 0;
  let ciroBagli = 0;
  const netler = new Map<string, number>();
  const bekleyenler = new Set<string>();
  const alimsizlar = new Set<string>();
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
      if (k.sale.importBatch) {
        /**
         * ⚠ AYIRT EDİCİ ÖLÇÜT: O VARYANTIN HİÇ AÇIK PARTİSİ VAR MI.
         * Kalemin kendi stok hareketi yoksa iki ihtimal var ve ikisi
         * ayrı işe gider — bu yüzden varyantın alım geçmişine bakılıyor,
         * kalemin durumuna değil.
         */
        if (k.variant.stockMovements.length === 0) alimsizlar.add(k.sale.id);
        else bekleyenler.add(k.sale.id);
      }
      continue;
    }
    ciroBagli += tutar;
    if (k.sale.net2Amount !== null) netler.set(k.sale.id, Number(k.sale.net2Amount));
  }
  let net = 0;
  for (const v of netler.values()) net += v;

  return {
    alimYok: alimsizlar.size,
    bekleyen: bekleyenler.size,
    baglıMarj: ciroBagli > 0 ? (net / ciroBagli) * 100 : null,
    ekranMarji: ciroHepsi > 0 ? (net / ciroHepsi) * 100 : null,
  };
}

/**
 * ============================================================================
 *  DEFTER DERİNLİĞİ ŞERHİ — "ALIŞ DEFTERİ SATIŞ DEFTERİNDEN DERİN"
 * ----------------------------------------------------------------------------
 *  ⛔ CANLI BULGU 26.08.2026 (Halil): alışlar girince stok **₺8,5M / 3595
 *  adet** göründü. Sebep ölçülü ama EKRANDA YAZILI DEĞİLDİ:
 *
 *      alım defteri   1955 kayıt · en eski 2024-05-30
 *      satış defteri   556 kayıt · en eski 2026-06-17
 *      → satış defteri 748 GÜN SIĞ
 *
 *  O 748 günlük pencerede alınan mal deftere girdi, SATILDIĞI girmedi.
 *  Envanter fotoğrafı onu hâlâ depoda gösteriyor.
 *
 *  ⚠ BU 69'LUK ŞERHİN YERİNE DEĞİL, YANINA. İki AYRI sebep:
 *    · 69'luk  → satış defterde VAR, maliyet bağı yok
 *    · bu şerh → satış defterde HİÇ YOK
 *  Tek cümleye karışsalardı okuyan yanlış tarafta çözüm arardı.
 *
 *  ⚠ ÖLÇÜT SABİT SAYI DEĞİL — ve "gün farkı" da değil. Gün farkına
 *  bağlansaydı satış aktarımından sonra da (2024-06 vs 2024-05-30) ~18
 *  günlük bir fark kalır ve şerh SÖNMEZDİ. Ölçüt, farkın KENDİSİ değil
 *  ONUN ÜRETTİĞİ ÇARPIKLIK: satış kapsamı BAŞLAMADAN ÖNCE alınmış ve
 *  HÂLÂ AÇIK olan parti adedi. Sıfırsa çarpıklık yok, şerh çıkmaz.
 * ============================================================================
 */

export type DefterDerinligi = {
  alimSayisi: number;
  alimEnEski: Date | null;
  satisSayisi: number;
  satisEnEski: Date | null;
  /** Satış kapsamı başlamadan ÖNCE alınmış, hâlâ açık parti adedi. */
  kapsamsizAdet: number;
  /** İki defterin başlangıcı arasındaki gün — GÖSTERİM için, ölçüt değil. */
  farkGun: number;
};

export async function defterDerinligi(
  db: Pick<PrismaClient, "purchase" | "sale" | "stockMovement">,
): Promise<DefterDerinligi> {
  const [alim, satis] = await Promise.all([
    db.purchase.aggregate({ _min: { purchasedAt: true }, _count: { _all: true } }),
    db.sale.aggregate({
      where: { iptalTarihi: null },
      _min: { soldAt: true },
      _count: { _all: true },
    }),
  ]);
  const alimEnEski = alim._min.purchasedAt ?? null;
  const satisEnEski = satis._min.soldAt ?? null;

  const bos: DefterDerinligi = {
    alimSayisi: alim._count._all,
    alimEnEski,
    satisSayisi: satis._count._all,
    satisEnEski,
    kapsamsizAdet: 0,
    farkGun: 0,
  };
  /** ⚠ Bir defter boşsa kıyas kurulamaz — "temiz" denmez, hüküm verilmez. */
  if (alimEnEski === null || satisEnEski === null) return bos;
  if (alimEnEski >= satisEnEski) return bos;

  /**
   * ⚠ AÇIK PARTİ = giriş − tüketim. `sourceMovementId` tüketimi partiye
   * bağlıyor; tüketilmiş bir parti depoda DURMUYOR ve çarpıklık üretmez.
   */
  const girisler = await db.stockMovement.findMany({
    where: { type: "PURCHASE_IN", occurredAt: { lt: satisEnEski } },
    select: { id: true, quantityDelta: true },
  });
  if (girisler.length === 0) return bos;
  const tuketimler = await db.stockMovement.groupBy({
    by: ["sourceMovementId"],
    where: { sourceMovementId: { in: girisler.map((g) => g.id) } },
    _sum: { quantityDelta: true },
  });
  const tuketim = new Map(
    tuketimler.map((t) => [t.sourceMovementId!, Number(t._sum.quantityDelta ?? 0)]),
  );
  let acik = 0;
  for (const g of girisler) {
    /** Tüketim negatif gelir; kalan = giriş + tüketim. */
    const kalan = g.quantityDelta + (tuketim.get(g.id) ?? 0);
    if (kalan > 0) acik += kalan;
  }
  return {
    ...bos,
    kapsamsizAdet: acik,
    farkGun: Math.round((satisEnEski.getTime() - alimEnEski.getTime()) / 86_400_000),
  };
}
