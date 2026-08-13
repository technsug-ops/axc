import readXlsxFile from "read-excel-file/node";

import { prisma } from "@/lib/prisma";
import { paketiNormalle } from "@/lib/tablo/paket";
import { topluGuncelle } from "@/lib/toplu-guncelle";

import { komisyonOku, platformTani, type SayfaGirdisi } from "./okuyucu";
import type { KomisyonPlatformu } from "./model";
import {
  cakisanKodlariAyikla,
  planKur,
  type KomisyonPlani,
  type KomisyonSayimi,
  type MevcutEsleme,
  type PlanGuncelleme,
  type PlanYaratma,
  type VaryantKaydi,
} from "./plan";

/**
 * ============================================================================
 *  KOMİSYON İÇE AKTARMA BORU HATTI
 * ----------------------------------------------------------------------------
 *  DENETLE → ÖNİZLE → ONAYLA → TEK TRANSACTION. Hakediş yüklemesiyle aynı
 *  kalıp; kullanıcı üçüncü kez aynı akışı görüyor (İlke #10 tutarlılık).
 *
 *  YÜKLEMEYİ DURDURAN ŞEYLER DAR TUTULDU: dosya açılamıyorsa, hangi
 *  pazaryerine ait olduğu anlaşılamıyorsa, seçilen hesabın kanalıyla
 *  ÇELİŞİYORSA ya da zorunlu kolon yoksa durur. Bunların dışındaki her şey
 *  (katalogda olmayan ürün, okunamayan oran, tekrar eden satır) HABERDİR:
 *  sayılır, örneklenir, yükleme devam eder. 2151 satırlık gerçek dosyanın
 *  1081 satırı bizde olmayan ürünler — bunlar hata sayılsaydı dosya hiç
 *  yüklenemezdi.
 *
 *  DOSYA İKİ KEZ GÖNDERİLİR (önizleme + yazım) ve sunucuda durum tutulmaz;
 *  ikinci gönderimde her şey BAŞTAN okunur. Arada başka bir yerden oran
 *  değiştiyse önizlemedeki sayı değil, o anki gerçek durum yazılır.
 * ============================================================================
 */

/** Prisma'nın 5 sn'lik varsayılanı 1000+ satırlık aktarmaya yetmez. */
const ISLEM_SURESI_MS = 120_000;
const BEKLEME_SURESI_MS = 30_000;

export type KomisyonHatasi =
  | { kod: "HESAP_YOK" }
  | { kod: "HESAP_SATIS_DEGIL"; hesap: string }
  | { kod: "DOSYA_OKUNAMADI"; ayrinti: string }
  | { kod: "TANINMAYAN_DOSYA"; sayfalar: string[] }
  | { kod: "PLATFORM_UYUSMAZ"; dosya: string; hesap: string }
  | { kod: "SUTUN_EKSIK"; sutunlar: string[] }
  | { kod: "SATIR_YOK" };

export type KomisyonOnizlemesi = {
  platform: KomisyonPlatformu;
  /** Dosyanın hangi sayfasından okundu. */
  sayfa: string;
  sayim: KomisyonSayimi;
  /** Yazılacak toplam satır: güncellenecek + yaratılacak. */
  yazilacak: number;
  /** Kanal kodu dosyanın kendi içinde çakıştığı için atlanan yeni eşleme. */
  kodCakisti: number;
  degisenOrnekleri: KomisyonPlani["degisenOrnekleri"];
  oranOrnekleri: KomisyonPlani["oranOrnekleri"];
  bulunamayanOrnekleri: KomisyonPlani["bulunamayanOrnekleri"];
  yeniEslemeOrnekleri: { kanalKodu: string; varyantSku: string; oran: number }[];
  /** Yazımdan sonra oranı boş kalacak eşlemelerden örnekler. */
  kalanBosOranOrnekleri: KomisyonPlani["kalanBosOranOrnekleri"];
};

export type KomisyonDenetimi =
  | { durum: "HATA"; hatalar: KomisyonHatasi[] }
  | {
      durum: "ONIZLEME";
      onizleme: KomisyonOnizlemesi;
      /** Onaydan sonra yazılacak plan. */
      yazim: {
        guncellenecekler: PlanGuncelleme[];
        yaratilacaklar: PlanYaratma[];
      };
    };

/** Kanal kodundan platform — dosya ile hesabın çelişip çelişmediğini bilmek için. */
function kanalPlatformu(kanalKodu: string): KomisyonPlatformu | null {
  const k = kanalKodu.toUpperCase();
  if (k.includes("TRENDYOL")) return "TRENDYOL";
  if (k.includes("HEPSIBURADA")) return "HEPSIBURADA";
  return null;
}

/**
 * Dosyayı okur, eşleştirir, önizleme üretir. HİÇBİR ŞEY YAZMAZ.
 */
export async function komisyonDenetle(
  dosya: Buffer,
  channelAccountId: string,
): Promise<KomisyonDenetimi> {
  const hesap = await prisma.channelAccount.findUnique({
    where: { id: channelAccountId },
    include: { channel: { select: { code: true, name: true } } },
  });
  if (!hesap) return { durum: "HATA", hatalar: [{ kod: "HESAP_YOK" }] };

  /**
   * ALIŞ HESABINA KOMİSYON YAZILMAZ. Alış hesabındaki kod, ürünün tedarikçi
   * kataloğundaki kodudur; komisyonu yoktur (bkz. /kanal-sku ekranı). Form
   * yalnız satış hesaplarını listeliyor ama istek elle de kurulabilir.
   */
  if (!hesap.satisIcin) {
    return {
      durum: "HATA",
      hatalar: [{ kod: "HESAP_SATIS_DEGIL", hesap: hesap.name }],
    };
  }

  // Trendyol'un ürün listesi de hakediş dosyaları gibi ZIP64 + veri
  // tanımlayıcılı geliyor (ölçüldü); normalleştirici gerekiyorsa kabı değişir.
  let sayfalar: SayfaGirdisi[];
  try {
    const { bayt } = paketiNormalle(dosya);
    sayfalar = (await readXlsxFile(bayt)) as unknown as SayfaGirdisi[];
  } catch (e) {
    return {
      durum: "HATA",
      hatalar: [{ kod: "DOSYA_OKUNAMADI", ayrinti: String(e).slice(0, 200) }],
    };
  }

  const tanima = platformTani(sayfalar ?? []);
  if (tanima.durum === "TANINMADI") {
    return {
      durum: "HATA",
      hatalar: [{ kod: "TANINMAYAN_DOSYA", sayfalar: tanima.sayfalar }],
    };
  }

  /**
   * YANLIŞ DOSYA REDDİ. Trendyol listesini Hepsiburada hesabına yüklemek,
   * 1581 satırın tamamının o hesapta karşılığı olmadığı için "hiçbir şey
   * eşleşmedi" gibi görünürdü — kullanıcı sistemin bozuk olduğunu sanardı.
   * Asıl sebep söylenir.
   */
  const hesapPlatformu = kanalPlatformu(hesap.channel.code);
  if (hesapPlatformu !== tanima.platform) {
    return {
      durum: "HATA",
      hatalar: [
        {
          kod: "PLATFORM_UYUSMAZ",
          dosya: tanima.platform,
          hesap: hesap.channel.name,
        },
      ],
    };
  }

  const okuma = komisyonOku(tanima);
  if (okuma.eksikSutunlar.length > 0) {
    return {
      durum: "HATA",
      hatalar: [{ kod: "SUTUN_EKSIK", sutunlar: okuma.eksikSutunlar }],
    };
  }
  if (okuma.satirlar.length === 0) {
    return { durum: "HATA", hatalar: [{ kod: "SATIR_YOK" }] };
  }

  const [eslemeKayitlari, varyantKayitlari] = await Promise.all([
    prisma.channelSku.findMany({
      where: { channelAccountId },
      select: {
        id: true,
        channelSku: true,
        variantId: true,
        commissionRate: true,
      },
    }),
    prisma.productVariant.findMany({
      select: { id: true, barcode: true, sku: true },
    }),
  ]);

  const mevcutlar: MevcutEsleme[] = eslemeKayitlari.map((e) => ({
    id: e.id,
    kanalKodu: e.channelSku,
    varyantId: e.variantId,
    oran: e.commissionRate === null ? null : Number(e.commissionRate.toString()),
  }));
  const varyantlar: VaryantKaydi[] = varyantKayitlari.map((v) => ({
    id: v.id,
    barkod: v.barcode,
    sku: v.sku,
  }));

  const plan = planKur(okuma, mevcutlar, varyantlar);
  const { temiz, cakisan } = cakisanKodlariAyikla(plan);

  return {
    durum: "ONIZLEME",
    onizleme: {
      platform: plan.platform,
      sayfa: plan.sayfa,
      sayim: {
        ...plan.sayim,
        // Çakışan kod yüzünden yaratılmayacak satır "yeni eşleme" sayılmaz.
        yeniEsleme: temiz.length,
      },
      yazilacak: plan.guncellenecekler.length + temiz.length,
      kodCakisti: cakisan.length,
      degisenOrnekleri: plan.degisenOrnekleri,
      oranOrnekleri: plan.oranOrnekleri,
      bulunamayanOrnekleri: plan.bulunamayanOrnekleri,
      yeniEslemeOrnekleri: temiz.slice(0, 20).map((y) => ({
        kanalKodu: y.kanalKodu,
        varyantSku: y.varyantSku,
        oran: y.oran,
      })),
      kalanBosOranOrnekleri: plan.kalanBosOranOrnekleri,
    },
    yazim: { guncellenecekler: plan.guncellenecekler, yaratilacaklar: temiz },
  };
}

export type KomisyonYazimi = {
  guncellenen: number;
  yaratilan: number;
  /**
   * YAZIMDAN SONRA bu hesapta oranı HÂLÂ boş olan eşleme sayısı.
   *
   * Mimar kararı 13.08.2026: "açık sıfır, sessiz yokluk değil." Tahmin
   * DEĞİL ölçüm: transaction bittikten sonra veritabanına sorulur, çünkü
   * kullanıcıya söylenen kapanış rakamı gerçeğin kendisi olmalı.
   */
  kalanBosOran: number;
};

/**
 * Onaydan sonra yazar. TEK TRANSACTION — ya hepsi ya hiçi.
 *
 * NEDEN `topluGuncelle`: satır başına bir `update` 1054 satırda 90 saniye
 * sürüyordu ve işlem sınırına 25 saniye pay kalıyordu (ölçüm 12.08.2026,
 * bkz. toplu-guncelle.ts). Bu ekran tam olarak o yükü taşıyor: haftalık
 * komisyon güncellemesi 1000+ satır demek.
 */
export async function komisyonYaz(
  channelAccountId: string,
  yazim: {
    guncellenecekler: PlanGuncelleme[];
    yaratilacaklar: PlanYaratma[];
  },
): Promise<KomisyonYazimi> {
  return prisma.$transaction(
    async (tx) => {
      const an = new Date();

      // --- 1) MEVCUT EŞLEMELERİN ORANI ---
      let guncellenen = 0;
      if (yazim.guncellenecekler.length > 0) {
        const idler = yazim.guncellenecekler.map((g) => g.eslemeId);

        /**
         * KAYIT HÂLÂ ORADA MI? Önizleme ile onay arasında bir eşleme
         * silinmiş ya da başka hesaba taşınmış olabilir. Ham SQL ile
         * güncellerken böyle bir satır sessizce atlanır ve sayı tutmaz;
         * bu yüzden önce sayılır ve tutmuyorsa işlem geri alınır.
         */
        const duran = await tx.channelSku.count({
          where: { id: { in: idler }, channelAccountId },
        });
        if (duran !== idler.length) {
          throw new Error(
            `Kanal SKU kaydı bulunamadı: ${idler.length - duran} satır. İşlem geri alındı.`,
          );
        }

        /**
         * SAYIYI SÜRÜCÜDEN DEĞİL PLANDAN OKUYORUZ. `topluGuncelle` MySQL'in
         * "etkilenen satır" sayısını döndürür; o sayı, değeri zaten aynı
         * olan satırları saymaz ve sürücü ayarına göre "eşleşen" ile
         * "değişen" arasında oynar. Kayıtların var olduğu yukarıda aynı
         * transaction içinde doğrulandı, oranı değişmeyen satırlar da plana
         * hiç girmedi — bu yüzden plan uzunluğu gerçeği söyler.
         */
        await topluGuncelle(
          tx,
          "ChannelSku",
          yazim.guncellenecekler.map((g) => ({
            id: g.eslemeId,
            degerler: {
              commissionRate: String(g.yeniOran),
              commissionUpdatedAt: an,
              /**
               * `updatedAt` ELLE YAZILIR: Prisma'nın `@updatedAt` sihri
               * yalnız Prisma'nın kendi `update`inde çalışır, ham SQL'de
               * çalışmaz. Yazılmasa kayıt "hiç değişmemiş" görünürdü.
               */
              updatedAt: an,
            },
          })),
        );
        guncellenen = yazim.guncellenecekler.length;
      }

      // --- 2) EKSİK EŞLEMELER ---
      let yaratilan = 0;
      if (yazim.yaratilacaklar.length > 0) {
        const sonuc = await tx.channelSku.createMany({
          data: yazim.yaratilacaklar.map((y) => ({
            channelAccountId,
            variantId: y.varyantId,
            channelSku: y.kanalKodu,
            commissionRate: String(y.oran),
            commissionUpdatedAt: an,
          })),
        });
        yaratilan = sonuc.count;
      }

      /**
       * KAPANIŞ RAKAMI AYNI TRANSACTION İÇİNDE ÖLÇÜLÜR. Dışarıda ölçseydik
       * araya başka bir yazım girip sayıyı değiştirebilirdi ve kullanıcıya
       * bu yüklemeye ait olmayan bir rakam söylenirdi.
       */
      const kalanBosOran = await tx.channelSku.count({
        where: { channelAccountId, commissionRate: null },
      });

      return { guncellenen, yaratilan, kalanBosOran };
    },
    { timeout: ISLEM_SURESI_MS, maxWait: BEKLEME_SURESI_MS },
  );
}

/** Yazacak bir şey yokken de kapanış rakamı söylenir — sessiz yokluk olmaz. */
export async function bosOranSayisi(channelAccountId: string): Promise<number> {
  return prisma.channelSku.count({
    where: { channelAccountId, commissionRate: null },
  });
}
