"use server";

import { yetkiIste } from "@/lib/yetki";
import { basariAdresi } from "@/lib/bildirim";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { gunDegeri, gunMetninden, isTakvimGunu } from "@/lib/donem";
import { DonemKorumasiHatasi } from "@/lib/donem-kapisi";
import {
  satisKaydet,
  SiparisNoCakismasiHatasi,
  SayimKorumasiHatasi,
  YetersizStokHatasi,
} from "@/lib/satis";

export type SatisDurumu = {
  hatalar?: string[];
  /**
   * Sipariş numarası zaten kayıtlıysa VAR OLAN satışa götürür.
   * Metin içine bağlantı konamıyordu; kullanıcı aynı siparişi ikinci kez
   * girmeye çalışırken "zaten kayıtlı" deyip bırakmak, o kaydı elle
   * aratmak demekti (eyleme dönük hata ilkesi).
   */
  mevcutSatisId?: string;
  /**
   * ⭐ SAYIM KAPISI DURAKSATTI — form ısrar bloğunu ÇİZSİN diye.
   * ⚠ Ekran bu bayrağa bakarak bloğu açar; sunucu yine de kendi ölçütünü
   * koşar. İki yerde iki ölçüt yok, tek gövde iki yerden çağrılıyor.
   */
  sayimDuraksatti?: boolean;
  /** ⭐ DÖNEM KAPISI DURAKSATTI (K108) — sayım bayrağından AYRI.
   *  Tek bayrak ekranın YANLIŞ ısrar bloğunu açmasına yol açardı. */
  donemDuraksatti?: boolean;
  donem?: string;
  donemSatisSayisi?: number;
  /** Çakışan satış İPTALLİ mi — kutu metnini bu belirler. */
  mevcutSatisIptalli?: boolean;
};

/** Sözlükten çözülen çeviri işlevi. */
type Ceviri = (
  anahtar: string,
  degerler?: Record<string, string | number>,
) => string;

/**
 * Şema, mesajlar çözüldükten SONRA kurulur.
 * Modül seviyesinde kurulamaz: getTranslations() istek kapsamlıdır.
 */
function satisSemasiKur(t: Ceviri) {
  const kalemSemasi = z.object({
    variantId: z.string().min(1, t("urunSecilmeli")),
    quantity: z
      .number({ message: t("adetSayiOlmali") })
      .int(t("adetTamSayi"))
      .min(1, t("adetEnAzBir")),
    unitPriceAmount: z
      .number({ message: t("fiyatSayiOlmali") })
      .min(0, t("fiyatNegatifOlamaz")),
    unitPriceCurrency: z.enum(["TRY", "EUR"], {
      message: t("paraBirimiGecersiz"),
    }),
    // Kâr hesabı için formdan gelen SON değerler (snapshot).
    vatRate: z.number().min(0).max(100),
    commissionRate: z.number().min(0).max(100).nullable(),
    commissionAmount: z.number().min(0).nullable(),
  });

  return z.object({
    // Kanal sipariş numarası opsiyoneldir; girilirse benzersizdir.
    code: z.string().trim().max(191),
    /** GÖNDERİ (TAKİP) NUMARASI — sipariş no ile aynı kalıp (K41①). */
    shipmentCode: z.string().trim().max(191).default(""),
    soldAt: z.string().min(1, t("tarihZorunlu")),
    channelAccountId: z.string().min(1, t("kanalHesabiZorunlu")),
    note: z.string().trim(),
    cargoCarrierId: z.string().nullable(),
    cargoDesi: z.number().min(0).nullable(),
    /**
     * ⚠ EN AZ 1 — "0 paket" diye bir gerçeklik yok ve sıfır, paket başına
     * kesintiyi yok ederdi. Alan gelmezse 1 (bölünmemiş sipariş).
     */
    paketSayisi: z.number().int().min(1).default(1),
    // Elle girilen KDV DAHIL kargo tutari; doluysa tarife kullanilmaz.
    cargoAmountManual: z.number().min(0).nullable(),
    kalemler: z.array(kalemSemasi).min(1, t("enAzBirKalem")),
    /**
     * ⭐ SAYIM KAPISI ISRARI — satış başına.
     * ⚠ `optional` çünkü kapı çoğu satışta hiç tetiklenmiyor; gelmezse
     * "ısrar edilmemiş" sayılır ve kapı duraksatır.
     */
    sayimIsrari: z
      .object({
        onaylandi: z.boolean(),
        sebep: z
          .enum(["GEC_GIRILEN_ALIM", "GEC_GIRILEN_SATIS", "SAYIM_HATALI", "DIGER"])
          .nullable(),
        aciklama: z.string().trim().max(500),
      })
      .optional(),
    /**
     * ⭐ DÖNEM KAPISI ISRARI (K108) — sayım ısrarından AYRI alan.
     * ⚠ Sebep listesi de ayrı: sayımın sebepleri FİZİKSEL, dönemin MALİ.
     * Tek alanda toplansalardı kullanıcı sayım için verdiği onayla
     * kapanmış bir dönemi de geçerdi.
     */
    donemIsrari: z
      .object({
        onaylandi: z.boolean(),
        sebep: z
          .enum([
            "GEC_GIRILEN_KAYIT",
            "MUHASEBECI_ONAYLADI",
            "DONEM_YANLIS_KAPATILDI",
            "DIGER",
          ])
          .nullable(),
        aciklama: z.string().trim().max(500),
      })
      .optional(),
  });
}

function hataMesaji(yol: PropertyKey[], mesaj: string, t: Ceviri): string {
  if (yol[0] === "kalemler" && typeof yol[1] === "number") {
    return t("kalemHataKalibi", { sira: yol[1] + 1, mesaj });
  }
  return mesaj;
}

export async function satisOlustur(
  _oncekiDurum: SatisDurumu,
  formData: FormData,
): Promise<SatisDurumu> {
  await yetkiIste("satis.yaz");

  const t = await getTranslations("Satis");

  const ham = formData.get("veri");
  if (typeof ham !== "string") return { hatalar: [t("formOkunamadi")] };

  let json: unknown;
  try {
    json = JSON.parse(ham);
  } catch {
    return { hatalar: [t("formBozuk")] };
  }

  const sonuc = satisSemasiKur(t).safeParse(json);
  if (!sonuc.success) {
    return {
      hatalar: sonuc.error.issues.map((i) => hataMesaji(i.path, i.message, t)),
    };
  }
  const veri = sonuc.data;

  const tarih = new Date(veri.soldAt);
  if (Number.isNaN(tarih.getTime())) {
    return { hatalar: [t("tarihGecersiz")] };
  }

  const hesap = await prisma.channelAccount.findUnique({
    where: { id: veri.channelAccountId },
    select: { id: true },
  });
  if (!hesap) return { hatalar: [t("kanalHesabiBulunamadi")] };

  const varyantIdleri = [...new Set(veri.kalemler.map((k) => k.variantId))];
  const varyantlar = await prisma.productVariant.findMany({
    where: { id: { in: varyantIdleri } },
    select: { id: true, sku: true, product: { select: { name: true } } },
  });
  if (varyantlar.length !== varyantIdleri.length) {
    return { hatalar: [t("kalemMevcutDegil")] };
  }

  let yeniId: string;
  try {
    // Satış kaydı, FIFO düşümü ve negatif stok engeli TEK transaction:
    // bkz. src/lib/satis.ts. Yarım satış kaydı oluşamaz.
    yeniId = await satisKaydet({
      code: veri.code || null,
      /**
       * ⚠ BOŞ İSE null — boş dize DEĞİL. `@unique` sütunda boş dize İKİNCİ
       * kayıtta çakışırdı; NULL'lar çakışmaz. `code` ile aynı kalıp.
       */
      shipmentCode: veri.shipmentCode || null,
      channelAccountId: veri.channelAccountId,
      soldAt: tarih,
      note: veri.note || null,
      cargoCarrierId: veri.cargoCarrierId || null,
      cargoDesi: veri.cargoDesi,
      paketSayisi: veri.paketSayisi,
      cargoAmountManual: veri.cargoAmountManual,
      sayimIsrari: veri.sayimIsrari,
      donemIsrari: veri.donemIsrari,
      kalemler: veri.kalemler.map((k) => ({
        variantId: k.variantId,
        quantity: k.quantity,
        // Decimal'e string olarak gider; float'a çevrilmez.
        unitPriceAmount: String(k.unitPriceAmount),
        unitPriceCurrency: k.unitPriceCurrency,
        vatRate: k.vatRate,
        commissionRate: k.commissionRate,
        commissionAmount: k.commissionAmount,
      })),
    });
  } catch (e) {
    if (e instanceof YetersizStokHatasi) {
      // Hangi üründe, ne kadar var — kullanıcı ekranda görsün (#5).
      const varyant = varyantlar.find((v) => v.id === e.variantId);
      return {
        hatalar: [
          t("yetersizStok", {
            urun: varyant
              ? `${varyant.product.name} (${varyant.sku})`
              : e.variantId,
            istenen: e.istenen,
            mevcut: e.mevcut,
          }),
        ],
      };
    }
    /**
     * ⭐ SAYIM KAPISI DURAKSATTI — ve mesaj ÇIKIŞI DA SÖYLÜYOR.
     *
     * ⚠ İki yön iki AYRI cümle: kullanıcının yapması gereken kontrol farklı.
     * DÜŞÜREN "sayılmış malı yok ediyorsunuz" · ARTIRAN "sayan kişi onu
     * zaten saydı". Tek cümleye indirseydik yanlış kontrole yönlendirirdik.
     *
     * ⚠ VE NİYE İLERLEMEDİĞİ YAZILI (İlke #5): eksik olan onay mı, sebep mi,
     * açıklama mı — kilitli düğme sessiz kalmaz.
     */
    /**
     * ⚠ DÖNEM KAPISI SAYIMDAN ÖNCE YAKALANIR — ikisi aynı anda duraksatabilir
     * ve o hâlde önce MALİ olanı söylemek doğru: dönem kapalıysa kayıt zaten
     * beyanı etkiliyor, sayım ondan sonra gelir.
     */
    if (e instanceof DonemKorumasiHatasi) {
      return {
        hatalar: [
          t("donemKapali", { donem: e.donem, sayi: e.satisSayisi }),
          e.eksik === "onay"
            ? t("donemIsrariOnayGerek")
            : e.eksik === "sebep"
              ? t("donemIsrariSebepGerek")
              : t("donemIsrariAciklamaGerek"),
        ],
        donemDuraksatti: true,
        donem: e.donem,
        donemSatisSayisi: e.satisSayisi,
      };
    }
    if (e instanceof SayimKorumasiHatasi) {
      const dusuren = e.duraksayanlar.some((x) => x.yon === "DUSUREN");
      return {
        hatalar: [
          dusuren
            ? t("sayimIsrariDusuren", { adet: e.duraksayanlar.length })
            : t("sayimIsrariArtiran", { adet: e.duraksayanlar.length }),
          e.eksik === "onay"
            ? t("sayimIsrariOnayGerek")
            : e.eksik === "sebep"
              ? t("sayimIsrariSebepGerek")
              : t("sayimIsrariAciklamaGerek"),
        ],
        sayimDuraksatti: true,
      };
    }
    if (e instanceof SiparisNoCakismasiHatasi) {
      /**
       * ⚠ İPTALLİ ÇAKIŞMA BİR HATA DEĞİL, BİR YÖNLENDİRMEDİR.
       * Operatör iptal edip aynı numarayla yeniden girmeye çalışıyorsa
       * ona "olmaz" demek yetmez — 20.08.2026'da tam bu yüzden numaranın
       * sonuna `0` eklendi ve gerçek bir sipariş var olmayan bir numarayla
       * kaydedildi. Mesaj artık çıkışı da söylüyor: iptali geri al.
       *
       * Hüküm hatanın içinde geliyor; ikinci bir sorgu atılmıyor
       * (iki sorgu iki gerçek demektir, arada kayıt değişebilir).
       */
      const iptalli = e.hukum.tur === "IPTALLI";
      return {
        hatalar: [
          iptalli
            ? t("siparisNoIptalliKayitli", { kod: e.code })
            : t("siparisNoZatenKayitli", { kod: e.code }),
        ],
        mevcutSatisId: e.hukum.satisId,
        mevcutSatisIptalli: iptalli,
      };
    }

    const kod =
      typeof e === "object" && e !== null && "code" in e
        ? String((e as { code: unknown }).code)
        : "";
    if (kod === "P2002") {
      return { hatalar: [t("siparisNoCakisti")] };
    }

    console.error("[satis] beklenmeyen hata:", e);
    return { hatalar: [t("kaydedilemedi")] };
  }

  revalidatePath("/satislar");
  revalidatePath("/stok");
  redirect(basariAdresi(`/satislar/${yeniId}`, "eklendi"));
}

/**
 * ============================================================================
 *  KARGOYA VERİLDİ İŞARETİ — ELLE, GERİ ALINABİLİR
 * ----------------------------------------------------------------------------
 *  _Kullanıcı kararı 14.08.2026: "kargoya teslim edilen ürünü manuel
 *  girebilirim."_ Pazaryeri API'si gelene kadar (Faz 4) bu bilgi başka
 *  hiçbir yerden türetilemiyor.
 *
 *  LEDGER DEĞİL, DURUM: stok hareketi gibi dokunulmaz bir kayıt değil.
 *  Yanlış işaretlenirse temizlenir; ters kayıt gerekmez, kâr hesabına da
 *  girmez. Bu yüzden tek düğmeyle açılıp kapanabiliyor.
 *
 *  TARİH İŞ TAKVİMİNDEN GELİR (Europe/Istanbul, UTC gece yarısı): Almanya'da
 *  gece yarısından sonra işaretlense bile Türkiye'nin günü yazılır — anayasa
 *  kuralı. Boş tarih = "kargoya verilmedi"ye geri döndür.
 * ============================================================================
 */
export async function kargoDurumuGuncelle(
  saleId: string,
  tarih: string | null,
): Promise<{ hata?: string }> {
  await yetkiIste("satis.yaz");
  const t = await getTranslations("Satis");

  const satis = await prisma.sale.findUnique({
    where: { id: saleId },
    select: { id: true },
  });
  if (!satis) return { hata: t("bulunamadi") };

  /**
   * ÜÇ GİRDİ:
   *   null / ""  → işaret KALDIRILIR (kargoya verilmedi)
   *   "BUGUN"    → İŞ TAKVİMİ günü yazılır (Europe/Istanbul). Liste
   *                düğmesi bunu gönderir; tarayıcının saatine güvenilmez,
   *                Almanya'da gece yarısından sonra bir gün geriye yazardı.
   *   "2026-08-14" → verilen gün (detaydaki geçmişe dönük giriş)
   *
   * Ayrıştırılamayan tarih SESSİZCE bugüne düşmez, hata döner.
   */
  let deger: Date | null = null;
  const ham = (tarih ?? "").trim();
  if (ham === "BUGUN") {
    deger = gunDegeri(isTakvimGunu(new Date()));
  } else if (ham !== "") {
    deger = gunMetninden(ham);
    if (!deger) return { hata: t("kargoTarihiGecersiz") };
  }

  await prisma.sale.update({
    where: { id: saleId },
    data: { shippedAt: deger },
  });

  revalidatePath("/satislar");
  revalidatePath(`/satislar/${saleId}`);
  // Panel kutusu bu sayıdan besleniyor.
  revalidatePath("/");
  return {};
}

/**
 * ============================================================================
 *  TOPLU "KARGOYA VERİLDİ" — EKRANDAKİLERİ TEK TIKLA İŞARETLE
 * ----------------------------------------------------------------------------
 *  Kullanıcı 24.08.2026: _"hepsini birden kargoya verildi işaretlesin."_
 *
 *  ⚠ İSTEMCİDEN GELEN LİSTEYE GÜVENİLMEZ. Kimlikler ekrandan geliyor ama
 *  süzgeç SUNUCUDA bir kez daha uygulanıyor: yalnız `shippedAt: null` ve
 *  `iptalTarihi: null` olanlar işaretlenir.
 *
 *  ⚠ NİYE ŞART: ekranda süzgeç "Tüm Kargo" iken ZATEN kargoya verilmiş
 *  siparişler de listede. Onları da yazsaydık kargo TARİHLERİ bugüne kayardı
 *  — panelin "hangi gün kargoladım" sayacı bozulur ve geri alınması tek tek
 *  elle olurdu. Ekran bunu zaten süzüyor; sunucu SUSMAZ, kendi de süzer.
 *  (Anayasa: düğmeyi gizlemek, kuralı koymak değildir.)
 *
 *  ⚠ TARİH İŞ TAKVİMİNDEN — tarayıcının saatinden DEĞİL. Kullanıcı
 *  Almanya'da, operasyon Türkiye'de; gece yarısından sonra tarayıcı saati
 *  bir gün geriye yazardı. Tek satırlık işaretlemeyle AYNI gövde.
 * ============================================================================
 */
export async function topluKargoyaVerildi(
  kimlikler: string[],
): Promise<{ hata?: string; isaretlenen?: number }> {
  await yetkiIste("satis.duzenle");
  const t = await getTranslations("Satis");

  const temiz = [...new Set(kimlikler.filter((k) => k.trim() !== ""))];
  if (temiz.length === 0) return { hata: t("topluKargoBosIstek") };

  const gun = gunDegeri(isTakvimGunu(new Date()));

  const sonuc = await prisma.sale.updateMany({
    where: {
      id: { in: temiz },
      /** ⚠ SUNUCU SÜZGECİ — istemci ne gönderirse göndersin. */
      shippedAt: null,
      iptalTarihi: null,
      /**
       * ⛔ İÇE AKTARILMIŞ SİPARİŞ TOPLU İŞARETLENMEZ (K60, 27.08.2026).
       *
       * VAKA: görev kutusunda kapatılamayan 5192 maddelik bir yığın vardı
       * (içe aktarılan geçmiş satışların `shippedAt`i yok) ve bu düğme onu
       * kapatmanın tek görünen yoluydu. İki tıkla **5601 siparişe** BUGÜNÜN
       * tarihi kargo tarihi olarak yazıldı — sistemin hiç bilmediği bir
       * tarih. Geri alması ayrı bir betik gerektirdi.
       *
       * ⚠ HATA KULLANICIDA DEĞİLDİ: kutuya kapatılamayan madde koyan,
       * kapatma yolunu da güvenli hâlde koymak zorundadır. Düğme uyarmadı,
       * liste sayfalanmıyordu, geri alma yolu yoktu.
       *
       * ⛔ VE KURAL BUNDAN GENEL: **toplu işlem, sistemin BİLMEDİĞİ bir
       * değeri yazamaz.** İçe aktarılmış siparişin gerçek kargo tarihi
       * defterde YOK; bugünün tarihini yazmak veri üretmek olur.
       * `shippedAt = null` doğru cevaptır ve K60 onu `BILINMIYOR` kovasında
       * görev saymadan gösterir.
       *
       * Tek tek işaretleme AÇIK kalır (`kargoDurumuKaydet`): orada kullanıcı
       * TARİHİ KENDİSİ giriyor, yani bir kaynağı var.
       */
      importKaynak: null,
    },
    data: { shippedAt: gun },
  });

  revalidatePath("/satislar");
  /** Panel kutusu bu sayıdan besleniyor. */
  revalidatePath("/");
  return { isaretlenen: sonuc.count };
}
