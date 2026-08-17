import { acikPartilerToplu } from "@/lib/stok";
import { kalemDusumleri } from "@/lib/satis";
import { prisma } from "@/lib/prisma";
import { VARYANT_SECIMI, varyantiOzetle, type VaryantSonucu } from "@/lib/varyant-ozet";
import { yasBandi, gunFarki, type YasBandi } from "@/lib/yaslanma";
import { kartOzeti, type KartGirdisi, type KartOzeti, type KartSatisi } from "@/lib/urun-karti";
import type { KalemGirdisi } from "@/lib/panel-listeler";
import type { Currency, ReturnReason } from "@/generated/prisma/enums";

/**
 * ============================================================================
 *  ÜRÜN KÂRLILIK KARTI — VERİ TARAFI
 * ----------------------------------------------------------------------------
 *  Hesap `lib/urun-karti.ts`te; burası yalnız OKUR. Hiçbir rakam burada
 *  üretilmez — kartın taahhüdü "kopya hesap yok".
 *
 *  ── HER SORGU `select` İLE DAR ──────────────────────────────────────────
 *  `include` bütün sütunları çeker. Şemaya yeni bir sütun eklenip canlıya
 *  henüz gitmediğinde `include` "Unknown column" verir ve ekran 500 döner —
 *  `8cb0023` vakasında canlıyı yatıran şey tam olarak buydu. `select` ile
 *  yalnız gereken alanlar isteniyor.
 *
 *  ⚠ İPTAL SÜZGECİ BURADA YOK. Satış iptali paketi geldiğinde süzgeç TEK
 *  YERDEN (`lib/liste-suzgeci.ts` ailesi) eklenecek ve 47-sorgu bekçisi bu
 *  dosyayı da tarayacak. Bugün iptal alanı canlıda olmadığı için sorguya
 *  yazmak, olmayan bir sütunu sormak olurdu.
 * ============================================================================
 */

export type KartVerisi = {
  varyant: VaryantSonucu;
  urunId: string;
  /** Raf konumu — `ProductVariant.location`. */
  rafKodu: string | null;
  eldekiAdet: number;
  /** En eski açık partinin yaşı; parti yoksa null. */
  yasGun: number | null;
  yasBandi: YasBandi | null;
  /** Son alımın birim maliyeti ve tarihi (en YENİ açık parti). */
  sonAlimMaliyeti: number | null;
  sonAlimTarihi: Date | null;
  sonAlimParaBirimi: Currency | null;
  /** Son alımın tedarikçisi — bağ kurulamazsa null ("bilinmiyor"). */
  sonAlimTedarikcisi: string | null;
  /** Son alımın kodu — kayda gitmek için. */
  sonAlimKodu: string | null;
  /** İade sebepleri ve kaç kez geldiği; sebebi beyan edilmemiş iadeler yok. */
  iadeSebepleri: { sebep: ReturnReason; sayi: number }[];
  /** Kartın hesaplanmış özeti. */
  ozet: KartOzeti;
  /** Satışların para birimi — karışıksa null ve ekran bunu söyler. */
  paraBirimi: Currency | null;
};

/**
 * Varyantın kâr kartı verisi. `null` = böyle bir varyant YOK (ekran
 * "kayıtlı değil — yeni ürün" der; sessiz boş sayfa DEĞİL).
 */
export async function kartVerisiniTopla(
  variantId: string,
): Promise<KartVerisi | null> {
  const varyant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    select: {
      ...VARYANT_SECIMI,
      product: { select: { id: true, name: true, brand: true } },
      location: { select: { code: true } },
    },
  });
  if (varyant === null) return null;

  const [kalemler, partiHaritasi, stokToplami, iadeler] = await Promise.all([
    prisma.saleItem.findMany({
      where: { variantId },
      select: {
        id: true,
        quantity: true,
        unitPriceAmount: true,
        unitPriceCurrency: true,
        net1Amount: true,
        net2Amount: true,
        profitStatus: true,
        sale: {
          select: {
            id: true,
            soldAt: true,
            channelAccount: {
              select: { channel: { select: { name: true } } },
            },
          },
        },
      },
      orderBy: { sale: { soldAt: "desc" } },
    }),
    acikPartilerToplu(prisma, [variantId]),
    /**
     * STOK LEDGER'DAN TOPLANIR — stok kolonu YOKTUR (anayasa kuralı).
     * `varyantStogu` da aynı toplamı yapıyor; burada tek gidiş-dönüşte
     * alınıyor çünkü zaten toplu sorgu atıyoruz.
     */
    prisma.stockMovement.aggregate({
      where: { variantId },
      _sum: { quantityDelta: true },
    }),
    /**
     * İADE SEBEBİ MÜŞTERİNİN BEYANIDIR ve `ReturnNotice`te durur —
     * `Return`da sebep alanı YOKTUR, orada yalnız TÜR vardır
     * (UNDELIVERED/NORMAL/DISPUTED). İkisi ayrı sorulara cevap verir:
     * tür "nasıl döndü", sebep "neden döndü". Alım kararı için ikincisi
     * daha çok şey söyler — "beğenmedi" ile "çalışmıyor" aynı ürün değildir.
     */
    prisma.returnItem.findMany({
      where: { variantId },
      select: {
        quantity: true,
        returnId: true,
        return: {
          select: {
            returnType: true,
            notice: { select: { reason: true } },
          },
        },
      },
    }),
  ]);

  /**
   * FIFO DÜŞÜMLERİ — "alımdan satışa kaç gün" bunlardan çıkar.
   * `sourceMovement.occurredAt` çıkışın düştüğü GİRİŞ partisinin tarihidir.
   * Bağı kurulamamış hareket listeye girmez; hesap tahmin üretmez.
   */
  const dusumler = await kalemDusumleri(kalemler.map((k) => k.id));

  /**
   * PARA BİRİMİ TEK OLMALI. Karışıksa kart tek bir NET rakamı veremez;
   * en çok kalemi olan para birimi seçilir, ekran karışıklığı YAZAR.
   */
  const paraSayaci = new Map<Currency, number>();
  for (const k of kalemler) {
    paraSayaci.set(
      k.unitPriceCurrency,
      (paraSayaci.get(k.unitPriceCurrency) ?? 0) + 1,
    );
  }
  const baskinPara =
    [...paraSayaci.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const secilenler =
    baskinPara === null
      ? []
      : kalemler.filter((k) => k.unitPriceCurrency === baskinPara);

  const sayi = (d: { toString(): string } | null) =>
    d === null ? null : Number(d.toString());

  const kartKalemleri: KalemGirdisi[] = secilenler.map((k) => ({
    variantId,
    urunAdi: varyant.product.name,
    sku: varyant.sku,
    adet: k.quantity,
    ciro: Number(k.unitPriceAmount.toString()) * k.quantity,
    net1: sayi(k.net1Amount),
    net2: sayi(k.net2Amount),
    durum: k.profitStatus,
  }));

  const satislar: KartSatisi[] = secilenler.map((k) => ({
    satisId: k.sale.id,
    soldAt: k.sale.soldAt,
    kanalAdi: k.sale.channelAccount.channel.name,
    adet: k.quantity,
    net2: sayi(k.net2Amount),
    girisTarihleri: (dusumler.get(k.id) ?? [])
      .map((d) => d.sourceMovement?.occurredAt ?? null)
      .filter((t): t is Date => t !== null),
  }));

  const partiler = partiHaritasi.get(variantId) ?? [];
  const girdi: KartGirdisi = {
    kalemler: kartKalemleri,
    satislar,
    acikPartiler: partiler.map((p) => ({
      kalanAdet: p.kalanAdet,
      birimMaliyet:
        p.birimMaliyet === null ? null : Number(p.birimMaliyet),
    })),
    iadeAdedi: iadeler.reduce((t, i) => t + i.quantity, 0),
    // Aynı iade birden çok kalem taşıyabilir; "kaç iade" tekil sayılır.
    iadeSayisi: new Set(iadeler.map((i) => i.returnId)).size,
  };

  /** Yaş EN ESKİ açık partiden — ortalama değil, son giriş değil. */
  const enEski = partiler[0] ?? null;
  const yas = enEski === null ? null : gunFarki(enEski.occurredAt, new Date());

  /** Son alım EN YENİ açık parti; partiler FIFO sırasında (eskiden yeniye). */
  const enYeni = partiler.length > 0 ? partiler[partiler.length - 1] : null;

  /**
   * SON ALIMIN TEDARİKÇİSİ — parti hareketinden alım kalemine, oradan alıma.
   * `Parti` tipi tedarikçi taşımıyor (stok motorunun işi değil); kart kendi
   * sorusunu kendi soruyor. Bağ kurulamazsa null — "bilinmiyor" yazılır,
   * uydurulmaz.
   */
  const sonAlimHareketi =
    enYeni === null
      ? null
      : await prisma.stockMovement.findUnique({
          where: { id: enYeni.hareketId },
          select: {
            purchaseItem: {
              select: {
                purchase: {
                  select: {
                    code: true,
                    supplier: { select: { name: true } },
                  },
                },
              },
            },
          },
        });

  /** İade sebepleri — aynı sebepten kaç iade geldiği sayılır. */
  const sebepSayaci = new Map<string, number>();
  for (const i of iadeler) {
    const sebep = i.return.notice?.reason ?? null;
    if (sebep === null) continue;
    sebepSayaci.set(sebep, (sebepSayaci.get(sebep) ?? 0) + 1);
  }

  return {
    varyant: varyantiOzetle(varyant),
    urunId: varyant.product.id,
    rafKodu: varyant.location?.code ?? null,
    eldekiAdet: stokToplami._sum.quantityDelta ?? 0,
    yasGun: yas,
    yasBandi: yas === null ? null : yasBandi(yas),
    sonAlimMaliyeti:
      enYeni?.birimMaliyet == null ? null : Number(enYeni.birimMaliyet),
    sonAlimTarihi: enYeni?.occurredAt ?? null,
    sonAlimParaBirimi: enYeni?.birimMaliyetParaBirimi ?? null,
    sonAlimTedarikcisi:
      sonAlimHareketi?.purchaseItem?.purchase.supplier?.name ?? null,
    sonAlimKodu: sonAlimHareketi?.purchaseItem?.purchase.code ?? null,
    iadeSebepleri: [...sebepSayaci.entries()]
      .map(([sebep, sayi]) => ({ sebep: sebep as ReturnReason, sayi }))
      .sort((a, b) => b.sayi - a.sayi),
    ozet: kartOzeti(girdi),
    paraBirimi: paraSayaci.size > 1 ? null : baskinPara,
  };
}
