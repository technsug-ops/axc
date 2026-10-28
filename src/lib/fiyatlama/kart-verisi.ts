import { prisma } from "@/lib/prisma";
import { varyantinTarifeKalemleri } from "@/lib/komisyon/tarife-eslesme-veri";
import { tarifeAdayi, type TarifeDizinleri } from "@/lib/komisyon/tarife-eslesme";
import { VARSAYILAN_KDV_ORANI } from "@/lib/kar";
import { kdvOraniniCoz } from "@/lib/kdv";
import { komisyonKdvOrani, siparisKesintiKurallari, type SiparisKesintiKurali } from "@/lib/siparis-kesintileri";
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
  /** Ortak gövdeden (`siparisKesintiKurallari`) — sipariş VE paket başına kurallar. */
  siparisKesintileri: SiparisKesintiKurali[];
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
      select: { id: true, pencereBaslangic: true, pencereBitis: true },
    });
    /*
     * ⛔ 28.10.2026 — BUGÜNÜ KAPSAYAN ÖNCE. Eski hâl «ürünün kalemi olan EN YENİ
     * pencere»ydi (başlangıcı en geç). Hepsiburada teklifleri ürün başına
     * tarihli olunca bu yanlış oldu: Ekim'in tamamını kapsayan teklif kaydı
     * (başlangıç 1 Ekim) 21–25 Ekim'in BİTMİŞ haftalık kaydından «eski» sayılıp
     * atlanıyordu. Artık o an geçerli olan ilk aday seçilir; hiçbiri kapsamıyorsa
     * eski davranış: en yeni aday + motorun «pencere bitti» beyanı.
     */
    type Secilen = { pencereBitis: Date; kalemler: Awaited<ReturnType<typeof varyantinTarifeKalemleri>> };
    let tarife: Secilen | null = null;
    let yedek: Secilen | null = null;
    for (const p of pencereler) {
      const kalemler = await varyantinTarifeKalemleri(p.id, e.channelAccountId, variantId, dizinOnbellegi);
      if (kalemler.length === 0) continue;
      const aday = tarifeAdayi(p, kalemler, an);
      if (aday.kapsiyor) {
        tarife = { pencereBitis: aday.bitis, kalemler: aday.kalemler };
        break;
      }
      yedek ??= { pencereBitis: aday.bitis, kalemler: aday.kalemler };
    }
    tarife ??= yedek;

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

    zeminler.push({
      kanalAdi: `${e.channelAccount.channel.name} — ${e.channelAccount.name}`,
      channelAccountId: e.channelAccountId,
      dilimler,
      pencereBitis: tarife?.pencereBitis ?? null,
      tekOran: e.commissionRate === null ? null : Number(e.commissionRate.toString()),
      komisyonKdvOrani: komisyonKdvOrani(kurallar),
      /**
       * ⛔ ORTAK GÖVDE (25.10.2026). Burada kendi süzgeci vardı ve YALNIZ
       * `PER_SALE` alıyordu; Trendyol'un ₺13,19 sabit gideri `PER_PACKAGE`
       * olduğu için fiyat denemesi TY kârını her satışta ₺13,19 FAZLA
       * gösteriyordu (canlı ChannelFee ölçümü 25.10: TY SABIT_GIDER
       * PER_PACKAGE FIXED 13,19). Satış kaydı ve kâr yenileme zaten ortak
       * gövdedeydi; deneme paket sayısını bilmez → motorun varsayılanı 1 paket.
       */
      siparisKesintileri: siparisKesintiKurallari(kurallar),
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
  /*
   * ⛔ 28.10.2026 — KAPSAYAN BİRDEN ÇOK KAYIT OLABİLİR. Ürün başına tarihli
   * teklif kaydı (Hepsiburada) geniş bir pencere taşır ve haftalık kayıtlarla
   * üst üste biner. Eski hâl yalnız İLK kapsayan kaydı açıyordu; ürün orada
   * yoksa dilim bulunmuyordu. Artık kapsayan kayıtlar en yeniden eskiye denenir
   * ve ürünün o GÜN geçerli kalemi olan ilki seçilir (`tarifeAdayi`: kalemin
   * kendi aralığı varsa ona bakılır). Hiçbirinde yoksa taban yine İLK kapsayan
   * kayıttan okunur — eski davranışın aynısı.
   */
  const kapsayanlar = await prisma.komisyonTarifesi.findMany({
    where: {
      channelAccountId,
      pencereBaslangic: { lte: satisTarihi },
      pencereBitis: { gte: satisTarihi },
    },
    orderBy: { pencereBaslangic: "desc" },
    select: { id: true, pencereBaslangic: true, pencereBitis: true },
  });
  if (kapsayanlar.length === 0) return { dilimler: null, tarifeTabani: null };

  /*
   * ⛔ K298-②: satış kaydının oranı da ORTAK kuraldan — bağsız satır bugünkü
   * katalogla çözülür (satış anında «bugün» = satış günü). Eski hâl yalnız
   * kayıtlı bağa bakıyordu; bağ yoksa dilim bulunmuyor, tek oran yazılıyordu.
   * Ölçüldü 28.09: geçmişte etkilenen 1 kalem (HB 4711041918, ₺2.848 en üst
   * dilim → %15 zaten doğru) — düzeltilecek geçmiş yok, mekanizma kuruldu.
   */
  let tarife = kapsayanlar[0]!;
  let kalemler: Awaited<ReturnType<typeof varyantinTarifeKalemleri>> = [];
  for (const aday of kapsayanlar) {
    const hepsi = await varyantinTarifeKalemleri(aday.id, channelAccountId, variantId);
    const secim = tarifeAdayi(aday, hepsi, satisTarihi);
    if (secim.kapsiyor && secim.kalemler.length > 0) {
      tarife = aday;
      kalemler = secim.kalemler;
      break;
    }
  }
  /** ⚠ TABAN O PENCEREDEN — bütün tarifelerin en düşüğünden DEĞİL. */
  const taban = await prisma.komisyonTarifeKalemi.aggregate({
    where: { tarifeId: tarife.id },
    _min: { oran: true },
  });

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
