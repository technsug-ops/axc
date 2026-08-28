import { acikPartilerToplu } from "@/lib/stok";
import { kalemDusumleri } from "@/lib/satis";
import { prisma } from "@/lib/prisma";
import { tedarikciAdi } from "@/lib/tedarikci-adi";
import {
  VARYANT_SECIMI,
  varyantiOzetle,
  type VaryantSonucu,
} from "@/lib/varyant-ozet";
import { yasBandi, gunFarki, type YasBandi } from "@/lib/yaslanma";
import {
  kartOzeti,
  type KartGirdisi,
  type KartOzeti,
  type KartSatisi,
} from "@/lib/urun-karti";
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
  /**
   * ÜRÜN KÜNYESİ — kategori · desi · KDV kaynağı (24.08.2026).
   *
   * ⚠ KART OKUMA YÜZEYİ, SAYFA EYLEM YÜZEYİ. Bu üçü BİLGİ olarak giriyor;
   * "Alım gir / Düzenle / Sil" karta GİRMEZ, ürün sayfasında kalır.
   *
   * ⚠ `kdvKaynagi` ORANIN KENDİSİ DEĞİL, NEREDEN GELDİĞİ. Oran zaten
   * `varyantKdvOrani` ile çözülüyor (ürün istisnası > kategori > %20);
   * kartta ikinci bir oran hesaplamak, defterle çelişebilecek ikinci bir
   * gerçek olurdu. Burada yalnız kaynak söyleniyor.
   */
  kategoriAdi: string | null;
  desi: number | null;
  kdvKaynagi: "URUN" | "KATEGORI" | "VARSAYILAN";
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
  /**
   * Son alımın partisi hâlâ açık mı? `false` ise o alımdan stok kalmamış
   * demektir ve kart bunu YAZAR — rakam çerçevesiz durmaz.
   */
  sonAlimAcikMi: boolean;
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
      /**
       * ⚠ KATEGORİ · KDV · DESİ KARTA GİRDİ (24.08.2026).
       *
       * Kullanıcı: _"bunlar sadece ürün sayfasında var; karta eklersen iş
       * hallolur."_ Kart bir OKUMA yüzeyi; bu üçü de okunacak bilgi.
       *
       * ⚠ KDV ORANI ÜRÜN İSTİSNASI > KATEGORİ > %20 sırasıyla çözülür ve
       * kartta zaten `varyantKdvOrani` ile HESAPLANIYOR. Burada çekilen
       * `vatRate`, o zincirin İLK halkası (ürün istisnası) — kartta oranın
       * NEREDEN geldiğini söyleyebilmek için gerekiyor. İkisi çelişmez;
       * biri sonuç, öteki kaynak.
       */
      product: {
        select: {
          id: true,
          name: true,
          brand: true,
          desi: true,
          vatRateOverride: true,
          category: { select: { name: true, vatRate: true } },
        },
      },
      location: { select: { code: true } },
    },
  });
  if (varyant === null) return null;

  const [kalemler, partiHaritasi, stokToplami, iadeler] = await Promise.all([
    prisma.saleItem.findMany({
      /**
       * İPTAL EDİLEN SATIŞ KARTA GİRMEZ. Kart bir ALIM KARARI aracıdır:
       * gerçekleşmemiş satış "bu ürün satıyor" izlenimi verir, marj ve hız
       * rakamlarını şişirir ve mağazada yanlış karar verdirir.
       */
      where: { variantId, sale: { iptalTarihi: null } },
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
      birimMaliyet: p.birimMaliyet === null ? null : Number(p.birimMaliyet),
    })),
    /**
     * ⚠ EK SORGU YOK — `kalemDusumleri` bu hareketleri zaten çekiyor
     * (`quantityDelta` + `unitCostAmount`). Ayrı bir sorgu açmak, aynı
     * satırları ikinci kez okumak olurdu.
     * ⚠ Yalnız SEÇİLEN para birimindeki kalemler: kartın geri kalanı da
     * o kümeden hesaplanıyor, iki rakam farklı kümeden gelmemeli.
     */
    satilanDusumleri: secilenler.flatMap((k) =>
      (dusumler.get(k.id) ?? []).map((d) => ({
        adet: Math.abs(d.quantityDelta),
        birimMaliyet:
          d.unitCostAmount === null ? null : Number(d.unitCostAmount.toString()),
      })),
    ),
    iadeAdedi: iadeler.reduce((t, i) => t + i.quantity, 0),
    // Aynı iade birden çok kalem taşıyabilir; "kaç iade" tekil sayılır.
    iadeSayisi: new Set(iadeler.map((i) => i.returnId)).size,
  };

  /** Yaş EN ESKİ açık partiden — ortalama değil, son giriş değil. */
  const enEski = partiler[0] ?? null;
  const yas = enEski === null ? null : gunFarki(enEski.occurredAt, new Date());

  /**
   * ============================================================================
   *  SON ALIM — GEÇMİŞ SORUSU, STOK SORUSU DEĞİL
   * ----------------------------------------------------------------------------
   *  ⚠ KULLANICI BİLDİRDİ 21.08.2026: _"stok bitince geçmişe dönük alım
   *  verileri gelmiyor"_. Haklıydı ve sebebi buradaydı.
   *
   *  Son alım EN YENİ AÇIK PARTİDEN okunuyordu. Stok bitince açık parti
   *  kalmaz; `enYeni` null olur ve kart **"alım yok"** derdi — oysa alım
   *  vardı, STOK yoktu. İki apayrı şey aynı cümleye düşüyordu.
   *
   *  ÖLÇÜLDÜ (canlı, 21.08.2026, salt okuma): alım geçmişi olan 93 varyantın
   *  **26'sı** (%28) bu yüzden "alım yok" diyordu. Aralarında 4 alımı olan ve
   *  aktif satılan ürünler vardı (Grundig Vcc 2170 · axcali1653).
   *
   *  ── DOĞRU KAYNAK: LEDGER, FIFO DEĞİL ────────────────────────────────────
   *  Alım geçmişi, partinin tüketilmesiyle SİLİNMEZ — hareket kaydı yerinde
   *  durur. Bu yüzden soru artık en yeni AÇIK partiye değil, alıma bağlı en
   *  yeni GİRİŞ HAREKETİNE soruluyor.
   *
   *  ⚠ VE MALİYET YİNE HAREKETİN DAMGASINDAN okunuyor (`unitCost`), alım
   *  kaleminden değil: kasadan fiilen çıkan tutarı taşıyan yer orası
   *  (kupon vakası, 19.08.2026 — ürünün piyasa değeri ile bize maliyeti
   *  farklı şeylerdir ve defter ikincisini yazar).
   *
   *  ── YAŞ VE ORTALAMA MALİYET DEĞİŞMEDİ ───────────────────────────────────
   *  Onlar gerçekten ELDEKİ stoğun soruları; stok yokken null olmaları
   *  doğrudur. Yalnız "son alım" yanlış kapıya soruluyordu.
   * ============================================================================
   */
  const sonAlimHareketi = await prisma.stockMovement.findFirst({
    where: {
      variantId,
      /** Alıma bağlı GİRİŞ — düzeltme ya da iade girişi "alım" değildir. */
      purchaseItemId: { not: null },
      quantityDelta: { gt: 0 },
    },
    orderBy: { occurredAt: "desc" },
    select: {
      id: true,
      occurredAt: true,
      unitCostAmount: true,
      unitCostCurrency: true,
      purchaseItem: {
        select: {
          purchase: {
            select: {
              code: true,
              /**
               * İKİ ALAN DA SORULUR. `supplierName` 10.08.2026 öncesi
               * kayıtların ve içe aktarmanın tedarikçisini taşıyor; yalnız
               * ilişkiyi sormak, o kayıtlarda tedarikçiyi SESSİZCE kaybetmek
               * demekti (canlı hata 17.08.2026).
               */
              supplier: { select: { name: true } },
              supplierName: true,
            },
          },
        },
      },
    },
  });

  /**
   * O PARTİ HÂLÂ AÇIK MI — rakamın yanında yazacak.
   *
   * ⚠ SESSİZ KALAMAZ: "son alım ₺3.899" yazıp stoğun bittiğini söylememek,
   * bu sefer TERS yönde yanlış bir izlenim verirdi (mal elde sanılır).
   * Kullanıcının şikâyeti veriyi göstermemekti; çaresi veriyi ÇERÇEVESİZ
   * göstermek değil.
   */
  const sonAlimAcikMi =
    sonAlimHareketi !== null &&
    partiler.some((p) => p.hareketId === sonAlimHareketi.id);

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
    kategoriAdi: varyant.product.category?.name ?? null,
    desi:
      varyant.product.desi === null ? null : Number(varyant.product.desi),
    /**
     * ⚠ SIRA ANAYASADAN: ürün istisnası > kategori oranı > varsayılan %20.
     * Kartta gösterilen ORAN başka yerden (varyantKdvOrani) geliyor; burada
     * yalnız o oranın hangi halkadan çıktığı söyleniyor.
     */
    kdvKaynagi:
      varyant.product.vatRateOverride !== null
        ? "URUN"
        : varyant.product.category?.vatRate != null
          ? "KATEGORI"
          : "VARSAYILAN",
    eldekiAdet: stokToplami._sum.quantityDelta ?? 0,
    yasGun: yas,
    yasBandi: yas === null ? null : yasBandi(yas),
    sonAlimMaliyeti:
      sonAlimHareketi?.unitCostAmount == null
        ? null
        : Number(sonAlimHareketi.unitCostAmount),
    sonAlimTarihi: sonAlimHareketi?.occurredAt ?? null,
    sonAlimParaBirimi: sonAlimHareketi?.unitCostCurrency ?? null,
    sonAlimAcikMi,
    sonAlimTedarikcisi: sonAlimHareketi?.purchaseItem?.purchase
      ? tedarikciAdi(sonAlimHareketi.purchaseItem.purchase)
      : null,
    sonAlimKodu: sonAlimHareketi?.purchaseItem?.purchase.code ?? null,
    iadeSebepleri: [...sebepSayaci.entries()]
      .map(([sebep, sayi]) => ({ sebep: sebep as ReturnReason, sayi }))
      .sort((a, b) => b.sayi - a.sayi),
    ozet: kartOzeti(girdi),
    paraBirimi: paraSayaci.size > 1 ? null : baskinPara,
  };
}
