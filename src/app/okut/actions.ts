"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { bulunanAlan, kaydiOku, kaydiYaz } from "@/lib/okuma/kayit";
import {
  eslestirilebilirMi,
  eylemKovasi,
  ilkKova,
  kovaEylemi,
  type OkumaKovasi,
} from "@/lib/okuma/kova";
import { kodKosulu, type KodRolu } from "@/lib/varyant-arama-kurali";
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
  /** Sipariş numarası — pazaryerinin kodu. Girilmemiş olabilir. */
  kod: string | null;
  adet: number;
  satisTarihi: Date;
  kanal: string;
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

  const siparisler: AcikSiparis[] = kalemler.map((k) => ({
    kod: k.sale.code,
    adet: k.quantity,
    satisTarihi: k.sale.soldAt,
    kanal: `${k.sale.channelAccount.channel.name} — ${k.sale.channelAccount.name}`,
  }));

  const kova = ilkKova({
    bulunduMu: varyant !== null,
    acikSiparisVar: siparisler.length > 0,
  });

  const alan = varyant ? bulunanAlan(temiz, varyant) : null;
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
    siparisler,
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
