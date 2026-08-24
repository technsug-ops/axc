"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { bulunanAlan, kaydiOku, kaydiYaz } from "@/lib/okuma/kayit";
import {
  PAKETLEME_EYLEMLERI,
  PAKETLENDI_EYLEMI,
  PAKETLEME_GERI_ALINDI_EYLEMI,
  hazirlananSiparisler,
} from "@/lib/okuma/paketleme";
import {
  eslestirilebilirMi,
  eylemKovasi,
  ilkKova,
  kovaEylemi,
  type OkumaKovasi,
} from "@/lib/okuma/kova";
import {
  kodKosulu,
  satisKodKosulu,
  type KodRolu,
} from "@/lib/varyant-arama-kurali";
import {
  VARYANT_SECIMI,
  varyantiOzetle,
  type VaryantSonucu,
} from "@/lib/varyant-ozet";
import { oturumdakiKullanici } from "@/lib/oturum";
import { yetkiIste } from "@/lib/yetki";

/**
 * ============================================================================
 *  DEPO OKUMASI — SUNUCU EYLEMLERİ (K34a)
 * ----------------------------------------------------------------------------
 *  ⚠ BURADA KAPI YOK. Hiçbir eylem "izin vermiyorum" demez, hiçbir sonuç
 *  bir işi durdurmaz. Ekran yalnız BİLDİĞİNİ söyler ve okumayı KAYDEDER.
 *  Kontrol katmanı (K34) ağustos defteri kapanana kadar açılmıyor.
 * ============================================================================
 */

export type AcikSiparis = {
  /** Satış kimliği — "Paketlendi" izi BUNA bağlanır, okumaya değil. */
  saleId: string;
  /** Sipariş numarası — pazaryerinin kodu. Girilmemiş olabilir. */
  kod: string | null;
  adet: number;
  satisTarihi: Date;
  kanal: string;
  /**
   * `AuditLog` izinden TÜRETİLİR — yeni durum sütunu açılmadı.
   * En yeni iz `PAKETLENDI` ise doğru, `PAKETLEME_GERI_ALINDI` ise yanlış.
   */
  hazirlaniyor: boolean;
};

export type OkumaSonucu = {
  /** `AuditLog` satırının kimliği — eşleştirme bu ize bağlanır. */
  izId: string | null;
  kod: string;
  kova: OkumaKovasi;
  alan: KodRolu | null;
  urun: VaryantSonucu | null;
  siparisler: AcikSiparis[];
};


/**
 * BARKODU OKUT — ekranın tek girişi.
 *
 * ⚠ ARAMA KURALI BURADA YAZILMAZ, ORTAK KAYNAKTAN GELİR (`kodKosulu`):
 * barkod · Firma SKU · sistem SKU · Kanal SKU. Mimar üç alan istemişti;
 * ortak kural DÖRDÜNÜ birden sorar ve fazlası bedava — Soundcore vakası
 * (rapordaki barkod sistemdekinden farklıydı) tam da eksik alan sorgulamanın
 * ürünüydü. Buraya ayrı bir liste yazsaydık, kural bir gün değiştiğinde bu
 * ekran sessizce eski kalırdı.
 */
export async function barkoduOkut(kod: string): Promise<OkumaSonucu | null> {
  await yetkiIste("stok.gor");

  const temiz = kod.trim();
  if (!temiz) return null;

  const varyant = await prisma.productVariant.findFirst({
    where: { isActive: true, OR: kodKosulu(temiz) },
    select: VARYANT_SECIMI,
  });

  /**
   * AÇIK SİPARİŞLER — yalnız varyant bulunduysa sorulur. Bulunamamış bir
   * kod için "siparişi var mı" sorusunun cevabı YOKTUR; boş liste dönmek
   * "siparişi yok" demek olurdu ve bu, bilmediğimiz bir şey hakkında iddia
   * kurmaktır (anayasa: _"sistem, defterinde takip etmediği şey hakkında
   * iddia kurmaz"_).
   */
  /**
   * ════════════════════════════════════════════════════════════════════════
   *  SATIŞ KİMLİĞİYLE OKUTMA — GÖNDERİ NUMARASI (K41①, 24.08.2026)
   * ------------------------------------------------------------------------
   *  Varyant bulunamadıysa kod bir SATIŞ kimliği olabilir: gönderi (takip)
   *  numarası ya da sipariş numarası. Depoda elindeki kâğıtta hangisi
   *  yazıyorsa onu okutur.
   *
   *  ⚠ YALNIZ VARYANT BULUNAMADIYSA SORULUR. Önce varyant denenir çünkü
   *  günlük iş ürün okutmaktır; her okumada iki sorgu atmak, %99'unda
   *  gereksiz bir gidiş-dönüş olurdu.
   *
   *  ⚠ SONUÇ TEKİLDİR — `shipmentCode` ve `code` ikisi de `@unique`.
   *  Bu yüzden "Paketlendi" düğmesi elle sipariş seçimi olmadan doğrudan
   *  o satıra bağlanabiliyor.
   *
   *  ⚠ İPTAL EDİLMİŞ SATIŞ AÇIK SİPARİŞ SAYILMAZ — süzgeç aşağıdaki
   *  kalem sorgusuyla AYNI: `shippedAt: null, iptalTarihi: null`.
   * ════════════════════════════════════════════════════════════════════════
   */
  const satisKaydi = varyant
    ? null
    : await prisma.sale.findFirst({
        where: {
          OR: satisKodKosulu(temiz),
          shippedAt: null,
          iptalTarihi: null,
        },
        select: {
          id: true,
          code: true,
          shipmentCode: true,
          soldAt: true,
          items: { select: { quantity: true } },
          channelAccount: {
            select: { name: true, channel: { select: { name: true } } },
          },
        },
      });

  const kalemler = varyant
    ? await prisma.saleItem.findMany({
        where: {
          variantId: varyant.id,
          /**
           * ⚠ SÜZGEÇ ÇAĞRI YERİNDE YAZILI — SABİTE SAKLANMIYOR.
           *
           * İlk hâlinde bu iki alan `ACIK_SIPARIS_KOSULU` adlı bir sabitte
           * duruyordu ve `iptal:bekci` kırmızı yandı: iptalli satışın ciroya
           * sızmasını arayan bekçi, sorgunun yanında `iptalTarihi: null`
           * GÖREMİYORDU. Süzgeç doğruydu ama görünmüyordu — ve bir bekçinin
           * göremediği süzgeç, yarın silindiğinde de görünmezdi.
           *
           * `shippedAt: null` = paket henüz çıkmadı (şemadaki tanım).
           * `iptalTarihi: null` = iptal edilmiş satış açık sipariş sayılmaz.
           */
          sale: { shippedAt: null, iptalTarihi: null },
        },
        select: {
          quantity: true,
          sale: {
            select: {
              id: true,
              code: true,
              soldAt: true,
              channelAccount: {
                select: { name: true, channel: { select: { name: true } } },
              },
            },
          },
        },
        orderBy: { sale: { soldAt: "desc" } },
        take: 20,
      })
    : [];

  /**
   * PAKETLEME İZLERİ TEK SORGUDA. Satış başına ayrı sorgu atmak, üç açık
   * siparişi olan bir üründe üç gidiş-dönüş demekti.
   */
  const hazirlananlar = kalemler.length
    ? hazirlananSiparisler(
        await prisma.auditLog.findMany({
          where: {
            action: { in: [...PAKETLEME_EYLEMLERI] },
            targetType: "Sale",
            targetId: { in: kalemler.map((k) => k.sale.id) },
          },
          select: { action: true, createdAt: true, targetId: true },
        }),
      )
    : new Set<string>();

  /**
   * ⚠ SATIŞTAN GELEN SİPARİŞ DE AYNI LİSTEYE GİRER. Ayrı bir yol yazsaydık
   * "Paketlendi" düğmesi iki farklı yerde iki farklı davranış kazanırdı.
   */
  const satistanGelen: AcikSiparis[] = satisKaydi
    ? [
        {
          saleId: satisKaydi.id,
          kod: satisKaydi.code,
          adet: satisKaydi.items.reduce((t, k) => t + k.quantity, 0),
          satisTarihi: satisKaydi.soldAt,
          kanal: `${satisKaydi.channelAccount.channel.name} — ${satisKaydi.channelAccount.name}`,
          hazirlaniyor: hazirlananSiparisler(
            await prisma.auditLog.findMany({
              where: {
                action: { in: [...PAKETLEME_EYLEMLERI] },
                targetType: "Sale",
                targetId: satisKaydi.id,
              },
              select: { action: true, createdAt: true, targetId: true },
            }),
          ).has(satisKaydi.id),
        },
      ]
    : [];

  const siparisler: AcikSiparis[] = kalemler.map((k) => ({
    saleId: k.sale.id,
    kod: k.sale.code,
    adet: k.quantity,
    satisTarihi: k.sale.soldAt,
    kanal: `${k.sale.channelAccount.channel.name} — ${k.sale.channelAccount.name}`,
    hazirlaniyor: hazirlananlar.has(k.sale.id),
  }));

  /**
   * ⚠ İKİ KAYNAK TEK LİSTEDE BİRLEŞİR. Varyanttan gelen kalemler ya da
   * satış kimliğinden gelen tekil sipariş — hangisi doluysa o.
   */
  const tumSiparisler = [...siparisler, ...satistanGelen];

  /**
   * ⚠ KOVA "BULUNDU MU" SORUSUNU İKİ KAYNAKTAN BİRDEN CEVAPLAR. Yalnız
   * varyanta baksaydı, gönderi numarasından bulunan bir sipariş
   * `BILINMEYEN` kovasına düşerdi ve haftalık kapsama ölçümü yanlış
   * çıkardı — bulunmuş bir kod "bulunamadı" diye sayılırdı.
   */
  const kova = ilkKova({
    bulunduMu: varyant !== null || satisKaydi !== null,
    acikSiparisVar: tumSiparisler.length > 0,
  });

  /**
   * ⚠ HANGİ ALANDA BULUNDUĞU SÖYLENİR — satış kimliğinde de.
   * Kullanıcı "gönderi numarasından bulundu" görmezse, kodun neden
   * eşleştiğini bilemez ve yanlış kutuyu paketleyebilir.
   */
  const alan: KodRolu | null = varyant
    ? bulunanAlan(temiz, varyant)
    : satisKaydi
      ? satisKaydi.shipmentCode === temiz
        ? "shipmentCode"
        : null
      : null;
  const izId = await iziYaz(kova, {
    kod: temiz,
    alan,
    varyantId: varyant?.id ?? null,
    sebep: null,
  });

  revalidatePath("/okut");
  return {
    izId,
    kod: temiz,
    kova,
    alan,
    urun: varyant ? varyantiOzetle(varyant) : null,
    siparisler: tumSiparisler,
  };
}

/**
 * "BİLİYORSAN GÖSTER" — İSTEĞE BAĞLI İKİNCİ ADIM.
 *
 * ⚠ BU BİR KAPI DEĞİL. Atlanabilir, hiçbir şeyi engellemez, sorulmaz —
 * yalnız TEKLİF edilir. Amacı tek: `BILINMEYEN` kovasını hükme çevirmek.
 *
 * ⚠ VE KOVA ADI BİR EYLEMDİR: `ESLESTIRILDI`, "EAN tutmuyor" DEĞİL.
 * Kullanıcının yaptığı şey eşleştirmedir; okumanın NİYE tutmadığı (ürünün
 * barkodu farklı · kayıtta EAN yanlış · parti farklı geldi) ayrı bir
 * sorudur ve bugün SORULMUYOR. Vaka biriktiğinde desen kendisi çıkacak.
 *
 * ⚠ TEK YÖN: yalnız `BILINMEYEN` yükseltilebilir. Tanınmış bir okuma elle
 * bozulamaz — eşleştirme, hüküm verilemeyeni hükme çevirir; hükmü değiştirmez.
 */
export async function okumayiEslestir(
  izId: string,
  variantId: string,
): Promise<{ ok: true } | { hata: "iz-yok" | "kova-uygun-degil" }> {
  await yetkiIste("stok.gor");

  const iz = await prisma.auditLog.findUnique({
    where: { id: izId },
    select: { action: true, detail: true },
  });
  if (!iz) return { hata: "iz-yok" };

  const kova = eylemKovasi(iz.action);
  if (!kova || !eslestirilebilirMi(kova)) return { hata: "kova-uygun-degil" };

  /**
   * ⚠ ESKİ İZ SİLİNMEZ, YENİSİ YAZILIR. Ledger ilkesi: bir okumanın önce
   * tanınmayıp sonra eşleştirilmiş olması KENDİ BAŞINA bilgidir — kaç
   * okumanın elle kurtarıldığını ancak ikisi de dururken sayabiliriz.
   * Sayım en yeni satırı okur.
   */
  const eski = kaydiOku(iz.detail);
  await iziYaz("ESLESTIRILDI", {
    kod: eski?.kod ?? "",
    alan: null,
    varyantId: variantId,
    sebep: null,
  });

  revalidatePath("/okut");
  return { ok: true };
}

async function iziYaz(
  kova: OkumaKovasi,
  kayit: Parameters<typeof kaydiYaz>[0],
): Promise<string | null> {
  try {
    const kullanici = await oturumdakiKullanici();
    const satir = await prisma.auditLog.create({
      data: {
        userId: kullanici?.id ?? null,
        action: kovaEylemi(kova),
        targetType: kayit.varyantId ? "ProductVariant" : null,
        targetId: kayit.varyantId,
        detail: kaydiYaz(kayit),
      },
      select: { id: true },
    });
    return satir.id;
  } catch (e) {
    /**
     * ⚠ İZ TUTULAMADIYSA OKUMA YİNE DE CEVAP VERİR. Bu ekran depoda
     * paketleme sırasında kullanılıyor; ölçüm uğruna operasyonu durdurmak,
     * ölçülecek operasyonu bozmak olurdu.
     */
    console.error("[okuma] iz yazılamadı:", e);
    return null;
  }
}

/**
 * ============================================================================
 *  PAKETLENDİ — VE GERİ ALMA (K34a ek, İŞ 2)
 * ----------------------------------------------------------------------------
 *  ⚠ SATIŞA BAĞLANIR, OKUMAYA DEĞİL. Barkod ÜRÜNÜ söyler, SİPARİŞİ söylemez;
 *  aynı ürün üç açık siparişte geçiyorsa hangisine paketlendiğini yalnız
 *  kullanıcı bilir. Bu yüzden `saleId` parametredir ve tuş satırın yanındadır.
 *
 *  ⚠ KAPI DEĞİL. Tuşa basmadan da paketlenebilir; hiçbir akış engellenmiyor,
 *  hiçbir uyarı çıkmıyor. Bu bir İZ, bir kontrol değil.
 * ============================================================================
 */
export async function paketlendiIsaretle(
  saleId: string,
  kod: string,
  alan: KodRolu | null,
): Promise<{ ok: true } | { hata: "satis-yok" }> {
  await yetkiIste("stok.gor");

  const satis = await prisma.sale.findUnique({
    where: { id: saleId },
    select: { id: true },
  });
  if (!satis) return { hata: "satis-yok" };

  await paketlemeIziYaz(PAKETLENDI_EYLEMI, saleId, { kod, alan });
  revalidatePath("/okut");
  return { ok: true };
}

/**
 * ⚠ SİLME YOK — TERS KAYIT. Yanlış tuşa basıldığında önceki iz silinmez;
 * ikinci bir kayıt yazılır ve okuma en yenisini alır. Bir paketin kaç kez
 * işaretlenip geri alındığı kendi başına bilgidir.
 */
export async function paketlemeyiGeriAl(
  saleId: string,
): Promise<{ ok: true } | { hata: "satis-yok" }> {
  await yetkiIste("stok.gor");

  const satis = await prisma.sale.findUnique({
    where: { id: saleId },
    select: { id: true },
  });
  if (!satis) return { hata: "satis-yok" };

  await paketlemeIziYaz(PAKETLEME_GERI_ALINDI_EYLEMI, saleId, null);
  revalidatePath("/okut");
  return { ok: true };
}

async function paketlemeIziYaz(
  eylem: string,
  saleId: string,
  okuma: { kod: string; alan: KodRolu | null } | null,
): Promise<void> {
  try {
    const kullanici = await oturumdakiKullanici();
    await prisma.auditLog.create({
      data: {
        userId: kullanici?.id ?? null,
        action: eylem,
        targetType: "Sale",
        targetId: saleId,
        /**
         * ⚠ YAPILANDIRILMIŞ, SERBEST METİN DEĞİL — K34a ④ ile aynı kural.
         * "Hangi barkodla paketlendi" sorusu ileride metin ayrıştırmaya
         * dönmesin diye şekil bugün sabitleniyor.
         */
        detail: okuma ? JSON.stringify(okuma) : null,
      },
    });
  } catch (e) {
    /* İz tutulamadıysa paket yine hazırlanır; operasyon ölçüm için durmaz. */
    console.error("[okuma] paketleme izi yazılamadı:", e);
  }
}
