import { prisma } from "@/lib/prisma";
import { varyantinTarifeKalemleri } from "@/lib/komisyon/tarife-eslesme-veri";
import type { TarifeDizinleri } from "@/lib/komisyon/tarife-eslesme";
import { VARSAYILAN_KDV_ORANI } from "@/lib/kar";
import { kdvOraniniCoz } from "@/lib/kdv";
import type { TarifeDilimi } from "@/lib/komisyon/tarife-okuyucu";

/**
 * ============================================================================
 *  FİYAT SİMÜLASYONU — KART İÇİN VERİ TOPLAMA
 * ----------------------------------------------------------------------------
 *  Saf motor (`simulasyon.ts`) veritabanına gitmez; girdisini bu modül kurar.
 *
 *  ── EN GÜNCEL TARİFE SEÇİLİR, PENCERESİ DE TAŞINIR ──────────────────────
 *  Bir varyantın birden çok pencerede tarifesi olabilir. En yenisi alınır,
 *  ama penceresi de birlikte gelir — bitmişse motor BEYAN eder. Sessizce
 *  en yeniyi alıp "güncel" demek, bayat oranla fiyat değiştirtirdi.
 *
 *  ── DİLİM YOKSA TEK ORAN ────────────────────────────────────────────────
 *  Tarife bulunamayan üründe `ChannelSku.commissionRate` yedek olarak
 *  taşınır; motor onu kullanıp "dilim verisi yok" beyanı üretir.
 * ============================================================================
 */

export type SimulasyonZemini = {
  kanalAdi: string;
  channelAccountId: string;
  dilimler: TarifeDilimi[] | null;
  pencereBitis: Date | null;
  tekOran: number | null;
  komisyonKdvOrani: number | null;
  siparisKesintileri: {
    code: string;
    basis: "SALE_AMOUNT" | "FIXED";
    rate: number | null;
    amount: number | null;
  }[];
};

/**
 * Bir varyantın simülasyon zeminleri — her SATIŞ kanalı için bir tane.
 *
 * Kanal başına ayrı: komisyon dilimleri, KDV kuralı ve sipariş kesintileri
 * kanaldan kanala değişiyor. Tek bir "ortalama" zemin üretmek, hangi
 * kanalda ne olacağı sorusunu cevapsız bırakırdı.
 */
export async function simulasyonZeminleri(
  variantId: string,
  an: Date,
): Promise<SimulasyonZemini[]> {
  const eslemeler = await prisma.channelSku.findMany({
    where: { variantId, isActive: true, channelAccount: { satisIcin: true } },
    select: {
      channelAccountId: true,
      commissionRate: true,
      channelAccount: {
        select: { name: true, channelId: true, channel: { select: { name: true } } },
      },
    },
  });
  if (eslemeler.length === 0) return [];

  const zeminler: SimulasyonZemini[] = [];
  /** K298-②: hesap başına eşleşme dizini bir kez kurulur (birden çok pencere denenir). */
  const dizinOnbellegi = new Map<string, TarifeDizinleri>();

  for (const e of eslemeler) {
    /**
     * EN GÜNCEL TARİFE — bu hesapta, bu varyant için kalemi olan en yeni
     * pencere. `orderBy pencereBaslangic desc` + ilk kayıt.
     */
    /*
     * ⛔ K298-② (28.09.2026): eski hâl «bu varyanta BAĞLI kalemi olan en yeni
     * pencere»ydi (`kalemler: { some: { variantId } }`). Bağ yükleme anının
     * fotoğrafı: tarifeden SONRA kurulan kanal kodu bağsız kalıyor, dilim hiç
     * bulunmuyor ve deneme ürünün TEK oranına düşüyordu (Philips HB: «%15»,
     * dilimler %11,8 · %9,5 · %7,8). Artık aday pencereler bağlı YA DA bağsız
     * kalemi olanlar; seçim ortak kuraldan (`varyantinTarifeKalemleri`), yazmaz.
     */
    const pencereler = await prisma.komisyonTarifesi.findMany({
      where: {
        channelAccountId: e.channelAccountId,
        kalemler: { some: { OR: [{ variantId }, { variantId: null }] } },
      },
      orderBy: { pencereBaslangic: "desc" },
      select: { id: true, pencereBitis: true },
    });
    let tarife: { pencereBitis: Date; kalemler: Awaited<ReturnType<typeof varyantinTarifeKalemleri>> } | null = null;
    for (const p of pencereler) {
      const kalemler = await varyantinTarifeKalemleri(p.id, e.channelAccountId, variantId, dizinOnbellegi);
      if (kalemler.length > 0) {
        tarife = { pencereBitis: p.pencereBitis, kalemler };
        break;
      }
    }

    const dilimler: TarifeDilimi[] | null =
      tarife === null || tarife.kalemler.length === 0
        ? null
        : tarife.kalemler.map((k) => ({
            sira: k.dilimSirasi,
            altLimit: k.altLimit === null ? null : Number(k.altLimit.toString()),
            ustLimit: k.ustLimit === null ? null : Number(k.ustLimit.toString()),
            oran: Number(k.oran.toString()),
          }));

    /** Kanal kesinti kuralları — kâr motoruna olduğu gibi geçecek. */
    const kurallar = await prisma.channelFee.findMany({
      where: { channelId: e.channelAccount.channelId, isActive: true, validFrom: { lte: an } },
      orderBy: { validFrom: "desc" },
    });
    const gecerli = new Map<string, (typeof kurallar)[number]>();
    for (const k of kurallar) if (!gecerli.has(k.code)) gecerli.set(k.code, k);

    const komisyonKdv = gecerli.get("KOMISYON_KDV");

    zeminler.push({
      kanalAdi: `${e.channelAccount.channel.name} — ${e.channelAccount.name}`,
      channelAccountId: e.channelAccountId,
      dilimler,
      pencereBitis: tarife?.pencereBitis ?? null,
      tekOran: e.commissionRate === null ? null : Number(e.commissionRate.toString()),
      komisyonKdvOrani: komisyonKdv?.rate ? Number(komisyonKdv.rate.toString()) : null,
      siparisKesintileri: [...gecerli.values()]
        .filter((k) => k.scope === "PER_SALE")
        .map((k) => ({
          code: k.code,
          basis: k.basis === "FIXED" ? ("FIXED" as const) : ("SALE_AMOUNT" as const),
          rate: k.rate ? Number(k.rate.toString()) : null,
          amount: k.amount ? Number(k.amount.toString()) : null,
        })),
    });
  }

  return zeminler;
}

/**
 * Ürünün KDV oranı.
 *
 * ⚠ KENDİ ÇÖZÜMÜMÜ YAZMADIM: `kdvOraniniCoz` zaten var ve sırayı
 * tanımlıyor (ürün istisnası > kategori > varsayılan %20). İkinci bir
 * çözüm yazsaydım aynı kural sistemde iki yerde yaşardı ve kategori
 * oranı değiştiğinde biri sessizce eski davranışta kalırdı.
 */
export async function varyantKdvOrani(variantId: string): Promise<number> {
  const v = await prisma.productVariant.findUnique({
    where: { id: variantId },
    select: {
      product: {
        select: {
          vatRateOverride: true,
          category: { select: { name: true, vatRate: true } },
        },
      },
    },
  });
  if (v === null) return VARSAYILAN_KDV_ORANI;
  return kdvOraniniCoz(v.product).oran;
}


/**
 * ============================================================================
 *  KAYIT OLMAYAN SATIŞ KANALLARI — SESSİZ EKSİKLİĞİN BEYANI
 * ----------------------------------------------------------------------------
 *  ⚠ `simulasyonZeminleri` yalnız KAYDI OLAN kanalları döndürüyor. Kaydı
 *  olmayan kanal ekranda hiç görünmüyordu — ve görünmemek, "o kanalda
 *  sorun yok" diye okunuyordu. Oysa doğrusu "o kanal HESAPLANAMADI".
 *
 *  Kullanıcı N11'de satıyor, kartta N11 kutusu yok, ve bunun sebebinin
 *  "kanal kodu tanımlı değil" olduğunu hiçbir şey söylemiyor.
 *
 *  ── GÜRÜLTÜ RİSKİ ÖLÇÜLDÜ ───────────────────────────────────────────────
 *  19.08.2026: `isActive && satisIcin` olan hesap sayısı **3** (Trendyol,
 *  Hepsiburada, N11 — hepsi AXCALI). Yani bu liste en fazla 2 satır olur.
 *  Alış hesapları dışarıda; onlarda komisyon kaydı beklemek anlamsızdı.
 *
 *  _Uyarı merkezindeki 499'luk küme dersi burada da geçerli: kartezyen
 *  küme değil, FİİLEN SATIŞ YAPILAN hesaplar._
 * ============================================================================
 */
export async function kayitsizSatisKanallari(
  variantId: string,
): Promise<string[]> {
  const [hesaplar, kayitlar] = await Promise.all([
    prisma.channelAccount.findMany({
      where: { isActive: true, satisIcin: true },
      select: { id: true, name: true, channel: { select: { name: true } } },
    }),
    prisma.channelSku.findMany({
      where: { variantId, isActive: true },
      select: { channelAccountId: true },
    }),
  ]);
  const kayitli = new Set(kayitlar.map((k) => k.channelAccountId));
  return hesaplar
    .filter((h) => !kayitli.has(h.id))
    .map((h) => `${h.channel.name} — ${h.name}`);
}

/**
 * ============================================================================
 *  SATIŞ TARİHİNİN TARİFESİ — GEÇMİŞE DOĞRU BAKIŞ
 * ----------------------------------------------------------------------------
 *  ⚠ KART İLE FORM AYNI SORUYU SORMUYOR (ölçüldü 20.08.2026).
 *
 *  Kârlılık kartındaki "Fiyat dene" **bugün ne yapayım** diye sorar; orada
 *  EN YENİ pencere doğrudur. Satış formu ise geçmiş bir siparişi kaydederken
 *  **o gün ne geçerliydi** diye sorar; orada en yeni pencere YANLIŞ CEVAPTIR.
 *
 *  Fark somut: kullanıcı bildirdi ki farklı dönemlerde **%1'lik kampanyalar**
 *  da olmuş. Temmuz satışına %1 girildiğinde ağustos penceresinin tabanına
 *  (%2,7) bakan bir kontrol, DOĞRU bir oranı şüpheli ilan ederdi.
 *
 *  ── ÖLÇÜM ───────────────────────────────────────────────────────────────
 *  20.08.2026: yüklü tarife penceresi **1** (14–18.08), satışlar
 *  **17.06–20.08** arasında ve **54 satışın yalnız 24'ü** o pencereye
 *  düşüyor. Yani bugün satışların yarısından çoğu için o dönemin tarifesi
 *  elimizde YOK.
 *
 *  ── PENCERE YOKSA HÜKÜM YOK ─────────────────────────────────────────────
 *  Kapsayan pencere bulunamazsa `null` döner ve düşüklük/dilim hükmü
 *  VERİLMEZ. En yakın pencereye "yaklaşık" diye bakmak, bilmediğimiz bir
 *  dönem hakkında iddia kurmak olurdu.
 * ============================================================================
 */
export async function satisTarihiTarifesi(
  variantId: string,
  channelAccountId: string,
  satisTarihi: Date,
): Promise<{ dilimler: TarifeDilimi[] | null; tarifeTabani: number | null }> {
  const tarife = await prisma.komisyonTarifesi.findFirst({
    where: {
      channelAccountId,
      pencereBaslangic: { lte: satisTarihi },
      pencereBitis: { gte: satisTarihi },
    },
    orderBy: { pencereBaslangic: "desc" },
    select: { id: true },
  });
  if (!tarife) return { dilimler: null, tarifeTabani: null };

  const [kalemler, taban] = await Promise.all([
    /*
     * ⛔ K298-②: satış kaydının oranı da ORTAK kuraldan — bağsız satır bugünkü
     * katalogla çözülür (satış anında «bugün» = satış günü). Eski hâl yalnız
     * kayıtlı bağa bakıyordu; bağ yoksa dilim bulunmuyor, tek oran yazılıyordu.
     * Ölçüldü 28.09: geçmişte etkilenen 1 kalem (HB 4711041918, ₺2.848 en üst
     * dilim → %15 zaten doğru) — düzeltilecek geçmiş yok, mekanizma kuruldu.
     */
    varyantinTarifeKalemleri(tarife.id, channelAccountId, variantId),
    /** ⚠ TABAN O PENCEREDEN — bütün tarifelerin en düşüğünden DEĞİL. */
    prisma.komisyonTarifeKalemi.aggregate({
      where: { tarifeId: tarife.id },
      _min: { oran: true },
    }),
  ]);

  return {
    dilimler:
      kalemler.length === 0
        ? null
        : kalemler.map((k) => ({
            sira: k.dilimSirasi,
            altLimit: k.altLimit === null ? null : Number(k.altLimit.toString()),
            ustLimit: k.ustLimit === null ? null : Number(k.ustLimit.toString()),
            oran: Number(k.oran.toString()),
          })),
    tarifeTabani:
      taban._min.oran === null ? null : Number(taban._min.oran.toString()),
  };
}
