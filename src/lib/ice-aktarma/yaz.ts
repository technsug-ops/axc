import { sonSayimTarihleri, sayimGecersizlestir } from "@/lib/sayim-damgasi";
import { izYaz } from "@/lib/iz";
import {
  israrGecerliMi,
  sayimKorumasi,
  type SayimIsrari,
} from "@/lib/sayim-korumasi";
import { SayimKorumasiHatasi } from "@/lib/satis";
import { prisma } from "@/lib/prisma";
import { topluGuncelle } from "@/lib/toplu-guncelle";

import type { YazimPlani } from "./dogrula";
import { betikDonemKarari } from "@/lib/donem-kapisi";
import { kapaliDonemler } from "@/lib/muhasebe-donemi";

/**
 * ============================================================================
 *  PLANI YAZ — TEK TRANSACTION, YA HEPSİ YA HİÇİ
 * ----------------------------------------------------------------------------
 *  Buraya yalnızca HATASIZ bir plan gelir; doğrulayıcı hata bulduysa planı
 *  zaten boşaltmıştır. Yine de yazımın kendisi tek transaction'dadır: bir
 *  kalem patlarsa (ör. aynı anda başka bir yerden aynı SKU açıldıysa)
 *  hiçbir satır kalmaz.
 *
 *  İKİ TEKNİK KARAR (kullanıcı onayı 10.08.2026):
 *
 *  1. SÜRE YÜKSELTİLDİ. Prisma'nın varsayılan transaction süresi 5 saniyedir;
 *     birkaç yüz satırlık bir açılış aktarması bunu rahatça aşar ve kullanıcı
 *     sebepsiz bir hata görürdü.
 *
 *  2. KİMLİKLER UYGULAMADA ÜRETİLİR. MySQL'de `createMany` üretilen kimlikleri
 *     geri vermez; ürün -> varyant -> stok hareketi zinciri için kimlikler
 *     ÖNCEDEN gerekli. Satır satır `create` yapmak 1000 satırda 1000 gidiş
 *     dönüş demekti. Kimlikler doğrulama aşamasında üretilip plana yazılır,
 *     burada toplu yazılır. (Kimlik biçimi opaktır; hiçbir kod ayrıştırmaz.)
 * ============================================================================
 */

/** Büyük dosyalar için: 5 sn'lik varsayılan yetmez. */
const ISLEM_SURESI_MS = 120_000;
const BEKLEME_SURESI_MS = 30_000;

export type YazimSonucu = {
  urun: number;
  varyant: number;
  guncellenenVaryant: number;
  hareket: number;
  adet: number;
  kanalSku: number;
  guncellenenKanalSku: number;
};

export async function planiYaz(
  plan: YazimPlani,
  /**
   * ⭐ SAYIM KAPISI ISRARI — YÜKLEME BAŞINA.
   * Verilmezse "ısrar edilmemiş" sayılır ve kapı duraksatır.
   */
  sayimIsrari?: SayimIsrari,
): Promise<YazimSonucu> {
  return prisma.$transaction(
    async (tx) => {
      /**
       * ═══ SAYIM KAPISI ══════════════════════════════════════════════════
       *
       * ⭐ ANAYASA: **FİZİKSEL SAYIM SON SÖZDÜR.** Ve bu yol tam olarak
       * 29.08.2026 arızasını yapan sınıfın kardeşi: bir Excel aktarımı
       * sayılmış stoğu ezebiliyordu.
       *
       * ⛔ VE HİPOTEZ ÖLÇÜMLE ÇÜRÜTÜLDÜ: "açılış stoğu yalnız YENİ
       * varyantlara yazılır, yeni varyantın sayım damgası olamaz" diye
       * düşünülmüştü. Yanlış — `varyantiBul` **`mevcutSku`ya da düşüyor**
       * (`lib/ice-aktarma/dogrula.ts`), yani zaten sayılmış bir varyanta
       * açılış stoğu yazılabiliyor.
       *
       * ⚠ YÖN ARTIRAN (`INITIAL`, pozitif): mal sayım sırasında raftaysa
       * SAYAN KİŞİ ONU ZATEN SAYDI; açılış stoğu aynı malı İKİNCİ KEZ
       * ekler ve stok ŞİŞER.
       *
       * ⚠ YENİ VARYANTLAR KENDİLİĞİNDEN SERBEST: damgaları yok, kapı
       * `SERBEST` döner. Ayrı bir süzgeç GEREKMİYOR — ölçüt zaten
       * "damga var mı" diye soruyor.
       */
      if (plan.acilisHareketleri.length) {
        const sonSayimlar = await sonSayimTarihleri(
          tx,
          [...new Set(plan.acilisHareketleri.map((h) => h.varyantId))],
        );
        const duraksayanlar: {
          variantId: string;
          yon: "ARTIRAN" | "DUSUREN";
          sayimTarihi: Date;
        }[] = [];
        for (const h of plan.acilisHareketleri) {
          const karar = sayimKorumasi({
            sonSayimIsTarihi: sonSayimlar.get(h.varyantId) ?? null,
            hareketIsTarihi: h.tarih,
            adet: h.adet,
          });
          if (karar.sonuc === "DURAKSA") {
            duraksayanlar.push({
              variantId: h.varyantId,
              yon: karar.yon,
              sayimTarihi: karar.sayimTarihi,
            });
          }
        }
        if (duraksayanlar.length > 0) {
          /** ⛔ SUNUCU EKRANA GÜVENMEZ — aynı saf gövde burada da koşuyor. */
          const g = israrGecerliMi(
            sayimIsrari ?? { onaylandi: false, sebep: null, aciklama: "" },
          );
          if (!g.gecerli) throw new SayimKorumasiHatasi(duraksayanlar, g.eksik);
          /** ⚠ İZ İKİ YERE, VE İŞLEM İÇİNDE — yükleme geri sarılırsa damga da. */
          const an = new Date();
          await sayimGecersizlestir(
            tx,
            duraksayanlar.map((x) => x.variantId),
            an,
          );
          /** ⛔ İZ ORTAK GÖVDEDEN — `userId` kendiliğinden damgalanır (K90). */
          await izYaz({
            action: "SAYIM_KORUMASI_ISTISNASI",
            targetType: "StockMovement",
            detail: JSON.stringify({
              yol: "/ayarlar/ice-aktarma — açılış stoğu",
              yon: "ARTIRAN",
              sebep: sayimIsrari?.sebep ?? null,
              aciklama: sayimIsrari?.aciklama.trim() || null,
              duraksayanlar,
              sonuc: "SAYIM GECERSIZLESTI — bu varyantlar yeniden sayilmali.",
            }),
          },
            tx);
        }
      }

      // --- 1) ÜRÜNLER ---
      if (plan.yeniUrunler.length) {
        await tx.product.createMany({
          data: plan.yeniUrunler.map((u) => ({
            id: u.id,
            name: u.ad,
            brand: u.marka,
            categoryId: u.kategoriId,
            desi: u.desi === null ? null : String(u.desi),
            hasVariants: u.cokVaryantli,
          })),
        });
      }

      // --- 2) VARYANTLAR ---
      if (plan.yeniVaryantlar.length) {
        await tx.productVariant.createMany({
          data: plan.yeniVaryantlar.map((v) => ({
            id: v.id,
            productId: v.urunId,
            sku: v.sku,
            companySku: v.firmaSku,
            barcode: v.barkod,
            name: v.ad,
            isDefault: v.varsayilan,
            locationId: v.rafId,
          })),
        });
      }

      // --- 3) MEVCUT VARYANT GÜNCELLEMELERİ ---
      // TEK TEK DEĞİL TOPLU: 1054 satırda tek tek update 90 sn sürüyordu ve
      // 120 sn'lik işlem sınırına tehlikeli biçimde yaklaşıyordu (ölçüm
      // 12.08.2026, bkz. lib/toplu-guncelle.ts).
      await topluGuncelle(
        tx,
        "ProductVariant",
        plan.guncellenenVaryantlar.map((v) => ({
          id: v.id,
          degerler: {
            companySku: v.firmaSku,
            barcode: v.barkod,
            name: v.ad,
            locationId: v.rafId,
          },
        })),
      );

      /**
       * ═══ DÖNEM KAPISI — BETİK YOLU: SORMA, ATLA VE RAPORLA (K108) ═══
       *
       * ⛔ BURADA SORU SORULMAZ. İçe aktarma toplu bir yazımdır ve soracak
       * kimse yok; sayım korumasında da aynı kural geçerli. Kapanmış bir
       * döneme sessizce yazmak, beyan edilmiş bir dönemi kimsenin haberi
       * olmadan bozmak olurdu.
       *
       * ⚠ VE ATLANAN SATIR KAYBOLMAZ: kimliğiyle sonuca yazılıyor ve ekran
       * onu gösteriyor. Sessizce atlanan satır, atlanmamış satırdan
       * tehlikelidir — kullanıcı hepsinin yazıldığını sanır.
       *
       * ⚠ KÜME BİR KEZ OKUNUYOR: satır başına sorgu atmak binlerce satırlık
       * bir aktarımı yüzlerce tura çıkarırdı.
       */
      const kapaliKume = await kapaliDonemler(tx);
      const donemAtlananlar: { id: string; varyantId: string; donem: string }[] = [];
      const yazilacakHareketler = plan.acilisHareketleri.filter((h) => {
        const karar = betikDonemKarari({
          isTarihi: h.tarih,
          kapaliDonemler: kapaliKume,
        });
        if (karar.islem === "ATLA") {
          donemAtlananlar.push({
            id: h.id,
            varyantId: h.varyantId,
            donem: karar.donem,
          });
          return false;
        }
        return true;
      });

      // --- 4) AÇILIŞ STOĞU — her satır AYRI bir FIFO partisi ---
      if (yazilacakHareketler.length) {
        await tx.stockMovement.createMany({
          data: yazilacakHareketler.map((h) => ({
            id: h.id,
            variantId: h.varyantId,
            type: "INITIAL" as const,
            quantityDelta: h.adet,
            occurredAt: h.tarih,
            locationId: h.rafId,
            unitCostAmount:
              h.birimMaliyet === null ? null : String(h.birimMaliyet),
            unitCostCurrency: h.paraBirimi,
            note: h.not,
          })),
        });
      }

      // --- 5) KANAL SKU: yeni ---
      if (plan.yeniKanalSkulari.length) {
        await tx.channelSku.createMany({
          data: plan.yeniKanalSkulari.map((k) => ({
            id: k.id,
            variantId: k.varyantId,
            channelAccountId: k.kanalHesabiId,
            channelSku: k.kanalKodu,
            commissionRate:
              k.komisyonOrani === null ? null : String(k.komisyonOrani),
            commissionUpdatedAt: k.komisyonOrani === null ? null : new Date(),
          })),
        });
      }

      // --- 6) KANAL SKU: güncelleme (haftalık komisyon akışı) ---
      // BU AKIŞ HER HAFTA ÇALIŞACAK (Trendyol salı, Hepsiburada çarşamba
      // komisyon günceller) — en çok satır gören yol burasıdır.
      //
      // Plan kaydı KİMLİKLE değil hesap+varyant ÇİFTİYLE tanır. Toplu
      // güncelleme tek anahtarla çalıştığı için kimlikler ÖNCE tek sorguda
      // çözülüyor: 1054 gidiş-geliş yerine 1 + 3.
      if (plan.guncellenenKanalSkulari.length) {
        const cift = (hesapId: string, varyantId: string) =>
          `${hesapId}|${varyantId}`;

        const mevcutlar = await tx.channelSku.findMany({
          where: {
            OR: plan.guncellenenKanalSkulari.map((k) => ({
              channelAccountId: k.kanalHesabiId,
              variantId: k.varyantId,
            })),
          },
          select: { id: true, channelAccountId: true, variantId: true },
        });

        const kimlikler = new Map(
          mevcutlar.map((m) => [cift(m.channelAccountId, m.variantId), m.id]),
        );

        const an = new Date();
        const satirlar = plan.guncellenenKanalSkulari.flatMap((k) => {
          const id = kimlikler.get(cift(k.kanalHesabiId, k.varyantId));
          // Kayıt bulunamazsa SESSİZCE ATLANMAZ: plan onu "mevcut" saymıştı,
          // arada silinmiş olabilir. Yazılmadığı için sayım da tutmaz ve
          // aşağıdaki kontrol işlemi geri alır.
          if (!id) return [];
          return [
            {
              id,
              degerler: {
                channelSku: k.kanalKodu,
                commissionRate:
                  k.komisyonOrani === null ? null : String(k.komisyonOrani),
                // Oran verilmediyse damga DEĞİŞMEZ: "ne zaman güncellendi"
                // bilgisi, güncellenmemiş bir oran için yalan söylememeli.
                ...(k.komisyonOrani === null
                  ? {}
                  : { commissionUpdatedAt: an }),
              },
            },
          ];
        });

        if (satirlar.length !== plan.guncellenenKanalSkulari.length) {
          throw new Error(
            `Kanal SKU kaydı bulunamadı: ${plan.guncellenenKanalSkulari.length - satirlar.length} satır. İşlem geri alındı.`,
          );
        }

        await topluGuncelle(tx, "ChannelSku", satirlar);
      }

      return {
        urun: plan.yeniUrunler.length,
        varyant: plan.yeniVaryantlar.length,
        guncellenenVaryant: plan.guncellenenVaryantlar.length,
        /** ⚠ GERÇEKTEN YAZILAN — planlanan DEĞİL. Plan sayısını basmak,
         *  atlanan satırları yazılmış gibi göstermek olurdu. */
        hareket: yazilacakHareketler.length,
        adet: yazilacakHareketler.reduce((t, h) => t + h.adet, 0),
        /** Kapalı döneme düştüğü için ATLANAN satırlar — kimliğiyle. */
        donemAtlananlar,
        kanalSku: plan.yeniKanalSkulari.length,
        guncellenenKanalSku: plan.guncellenenKanalSkulari.length,
      };
    },
    { timeout: ISLEM_SURESI_MS, maxWait: BEKLEME_SURESI_MS },
  );
}
