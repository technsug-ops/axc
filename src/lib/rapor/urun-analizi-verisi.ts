import type { Currency } from "@/generated/prisma/enums";
import type { Pencere } from "@/lib/donem";
import { kdvOraniniCoz } from "@/lib/kdv";
import { urunlereTopla, type KalemGirdisi } from "@/lib/panel-listeler";
import { prisma } from "@/lib/prisma";
import { acikPartilerToplu } from "@/lib/stok";
import { yaslanmaListesi, type YaslanmaGirdisi } from "@/lib/yaslanma";

import type { AnalizSatiri } from "./urun-analizi";

/**
 * KİMLİK KODLARI — İKİ EKSENDE DE AYNI ŞEKİLDE (İlke #10).
 * Satış ekseni ile stok ekseni farklı sorgular kullanıyor; kodların seçimi
 * ve biçimi TEK GÖVDEDEN geçiyor ki iki ekranda ayrışmasın.
 */
const KIMLIK_SECIMI = {
  sku: true,
  companySku: true,
  barcode: true,
  channelSkus: {
    select: {
      channelSku: true,
      channelAccount: { select: { channel: { select: { name: true } } } },
    },
  },
} as const;

type KimlikKaynagi = {
  sku: string;
  companySku: string;
  barcode: string | null;
  channelSkus: {
    channelSku: string;
    channelAccount: { channel: { name: string } };
  }[];
};

function kimlikCoz(
  v: KimlikKaynagi | null,
): Pick<AnalizSatiri, "barkod" | "firmaSku" | "kanalKodlari"> {
  if (v === null) return { barkod: null, firmaSku: null, kanalKodlari: [] };
  return {
    barkod: v.barcode,
    /**
     * ⚠ AYNIYSA `null` — ölçüldü 02.09.2026: 1110 varyantın 1084'ünde
     * (%97,7) `companySku === sku`. Aynı değeri iki kez basmak satırı
     * gürültüye boğar ve okuyana hiçbir şey söylemez.
     */
    firmaSku: v.companySku === v.sku ? null : v.companySku,
    /** Aynı kanalda birden çok hesap olabilir; kod TEKİLLEŞTİRİLİYOR. */
    kanalKodlari: [
      ...new Map(
        v.channelSkus.map((c) => [
          `${c.channelAccount.channel.name}|${c.channelSku}`,
          { kanal: c.channelAccount.channel.name, kod: c.channelSku },
        ]),
      ).values(),
    ].sort((a, b) => a.kanal.localeCompare(b.kanal, "tr")),
  };
}

/**
 * ============================================================================
 *  ÜRÜN ANALİZİ — VERİ TOPLAMA (SUNUCU)
 * ----------------------------------------------------------------------------
 *  Saf hesap `urun-analizi.ts`te; bu dosya yalnız veriyi getirir ve o
 *  gövdenin beklediği şekle sokar.
 *
 *  ── ⛔ İKİ EKSEN, İKİ AYRI KÜME — VE BU BİR KUSUR DEĞİL, TANIMIN KENDİSİ ─
 *  · **Satış eksenleri** (dağılım · marj · hacim): kümesi DÖNEMDE SATILMIŞ
 *    ürünler. Dönem süzgeci burada anlamlı.
 *  · **Stok ekseni** (stokta bekleyen): kümesi BUGÜN RAFTA DURAN mal.
 *
 *  İkisini tek sorguya sıkıştırmak cazip görünüyor ve YANLIŞ olurdu: dönemde
 *  hiç satılmamış ama aylardır rafta bekleyen mal, satış kümesinde HİÇ
 *  GÖRÜNMEZ — oysa ölü sermayenin ta kendisi odur. Kümeyi daraltmak, aranan
 *  şeyi tam olarak listeden düşürürdü.
 *
 *  ⚠ VE BU EKRANDA YAZAR: stok ekseninde dönem süzgeci UYGULANMAZ ve
 *  uygulanmadığı söylenir. Sessizce yok sayılsaydı kullanıcı "temmuzu
 *  seçtim, rakam değişmedi" diye sisteme güvenini yitirirdi.
 *  _(Anayasa: "aynı veri, farklı soruya farklı pencereden bakar" — ama
 *  hangi ekranın hangi soruyu sorduğu KODDA yazılı olmalıdır.)_
 * ============================================================================
 */

/**
 * ⛔ PENCERE SÖZLEŞMESİ REPONUN KENDİSİNDEN GELİR — kendi tipimi kurmadım.
 * `@/lib/donem` yarı açık aralık kullanıyor: `[baslangic, bitisHaric)`.
 * Buraya `lte: bitis` yazsaydım sınır günü İKİ ekranda farklı davranırdı
 * ve fark yalnız ayın son gününde görünürdü — bulunması en zor hata sınıfı.
 */
export type AnalizPenceresi = Pick<Pencere, "baslangic" | "bitisHaric">;

/**
 * SATIŞ EKSENLERİ — dönemde satılmış ürünler.
 *
 * ⚠ İPTAL EDİLMİŞ SATIŞ GİRMEZ. Kârı zaten hesaplanmıyor ve ciroya da
 * girmiyor; listeye alınsaydı adet ve ciro şişer, marj bozulurdu.
 * _(Anayasa: "kayıp abartısı, kayıp küçültmesi kadar yanlıştır".)_
 */
export async function satisEkseniVerisi(
  pencere: AnalizPenceresi,
  paraBirimi: Currency,
  kanalKodu: string | null,
): Promise<AnalizSatiri[]> {
  const satislar = await prisma.sale.findMany({
    where: {
      iptalTarihi: null,
      soldAt: { gte: pencere.baslangic, lt: pencere.bitisHaric },
      ...(kanalKodu === null
        ? {}
        : { channelAccount: { channel: { code: kanalKodu } } }),
    },
    select: {
      soldAt: true,
      profitCurrency: true,
      items: {
        select: {
          variantId: true,
          quantity: true,
          unitPriceAmount: true,
          unitPriceCurrency: true,
          net1Amount: true,
          net2Amount: true,
          profitStatus: true,
          variant: {
            select: {
              ...KIMLIK_SECIMI,
              product: {
                select: {
                  id: true,
                  name: true,
                  brand: true,
                  vatRateOverride: true,
                  category: { select: { name: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  /** variantId → sunuma giren kimlik (hesaba girmez). */
  const kimlik = new Map<
    string,
    {
      urunId: string;
      marka: string | null;
      kategori: string | null;
      kodlar: ReturnType<typeof kimlikCoz>;
    }
  >();
  const kalemler: KalemGirdisi[] = [];

  for (const satis of satislar) {
    /** Para birimi kuralı PANELİN AYNISI — iki ekran ayrışmasın. */
    const para: Currency =
      satis.profitCurrency ?? satis.items[0]?.unitPriceCurrency ?? "TRY";
    if (para !== paraBirimi) continue;

    for (const k of satis.items) {
      /** Satışın para biriminden farklı kalem ciroya girmiyor (panel kuralı). */
      if (k.unitPriceCurrency !== para) continue;
      kimlik.set(k.variantId, {
        urunId: k.variant.product.id,
        marka: k.variant.product.brand,
        kategori: k.variant.product.category?.name ?? null,
        kodlar: kimlikCoz(k.variant),
      });
      kalemler.push({
        variantId: k.variantId,
        urunAdi: k.variant.product.name,
        sku: k.variant.sku,
        adet: k.quantity,
        ciro: Number(k.unitPriceAmount.toString()) * k.quantity,
        net1: k.net1Amount === null ? null : Number(k.net1Amount.toString()),
        net2: k.net2Amount === null ? null : Number(k.net2Amount.toString()),
        durum: k.profitStatus,
      });
    }
  }

  /**
   * ⚠ SATIŞ EKSENİNDE YAŞ VE SERMAYE `null` — SIFIR DEĞİL.
   * Bu eksende o sorular sorulmuyor; sıfır yazmak "rafta hiç mal yok"
   * demek olurdu ve sıralama o sütuna göre yapılırsa yanlış cevap verirdi.
   */
  return urunlereTopla(kalemler).map((s) => ({
    ...s,
    urunId: kimlik.get(s.variantId)?.urunId ?? null,
    marka: kimlik.get(s.variantId)?.marka ?? null,
    kategori: kimlik.get(s.variantId)?.kategori ?? null,
    yasGun: null,
    bagliSermaye: null,
    rafAdedi: null,
    ...(kimlik.get(s.variantId)?.kodlar ?? kimlikCoz(null)),
  }));
}

/**
 * STOK EKSENİ — bugün rafta duran mal.
 *
 * ⛔ DÖNEM SÜZGECİ BURAYA GİRMEZ (yukarıdaki gerekçe). Kanal süzgeci de
 * girmez: raftaki mal bir kanala ait değildir, satılınca bir kanala gider.
 * Kanalı buraya uygulamak, olmayan bir bağı varmış gibi göstermek olurdu.
 */
export async function stokEkseniVerisi(bugun: Date): Promise<AnalizSatiri[]> {
  const varyantlar = await prisma.productVariant.findMany({
    where: { isActive: true },
    select: {
      id: true,
      ...KIMLIK_SECIMI,
      product: {
        select: {
          id: true,
          name: true,
          brand: true,
          vatRateOverride: true,
          category: { select: { name: true, vatRate: true } },
        },
      },
    },
  });

  const partiHaritasi = await acikPartilerToplu(
    prisma,
    varyantlar.map((v) => v.id),
  );

  const girdiler: YaslanmaGirdisi[] = varyantlar.map((v) => ({
    variantId: v.id,
    partiler: partiHaritasi.get(v.id) ?? [],
    kdvOrani: kdvOraniniCoz(v.product).oran,
  }));

  /** Sıralama burada YAPILMAZ — ortak `sirala` gövdesi karar verir. */
  const yaslanma = yaslanmaListesi(girdiler, bugun, "yas");
  const kimlik = new Map(varyantlar.map((v) => [v.id, v]));

  return yaslanma.map((y) => {
    const v = kimlik.get(y.variantId);
    return {
      variantId: y.variantId,
      urunAdi: v?.product.name ?? "—",
      sku: v?.sku ?? "—",
      urunId: v?.product.id ?? null,
      marka: v?.product.brand ?? null,
      kategori: v?.product.category?.name ?? null,
      /**
       * ⚠ SATIŞ ALANLARI SIFIR — ve bu bir DEĞER, boşluk değil: stok
       * ekseninde "bu dönem ne sattı" sorusu sorulmuyor. Sıralama bu
       * sütunlara göre yapılırsa hepsi eşit çıkar ve ikinci ölçüte düşer.
       */
      adet: 0,
      ciro: 0,
      net1: 0,
      net2: 0,
      hesaplananCiro: 0,
      hesaplananAdet: 0,
      hesaplanamayanKalem: 0,
      kalemSayisi: 0,
      yasGun: y.yasGun,
      rafAdedi: y.adet,
      /**
       * ⚠ `null` KORUNUR — VE İKİ SEBEBİ VAR, İKİSİ DE "SIFIR" DEĞİL:
       *   ① maliyeti bilinmeyen parti (sıfır saymak "bedava mal" demek),
       *   ② partiler farklı para biriminde — toplamak kur çevirisi olurdu.
       * `sermayeKdvHaric` ikisini de `null` döndürüyor; burada para birimi
       * ayrıca sınanıyor ki TRY olmayan bir tutar TRY toplamına sızmasın.
       */
      bagliSermaye:
        y.sermayeParaBirimi === "TRY" ? y.sermayeKdvHaric : null,
      ...kimlikCoz(v ?? null),
    };
  });
}
