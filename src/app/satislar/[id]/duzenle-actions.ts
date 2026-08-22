"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import {
  duzenlemeOnizle,
  duzenlemeUygula,
  type YeniDegerler,
} from "@/lib/satis-duzenleme-veri";
import type { DuzenlemeNedeni, Fark } from "@/lib/satis-duzenleme";
import { kdvDahilKargo } from "@/lib/kargo-kdv";
import { prisma } from "@/lib/prisma";
import { yetkiIste } from "@/lib/yetki";

/**
 * ============================================================================
 *  SATIŞ DÜZENLEME — SUNUCU EYLEMLERİ
 * ----------------------------------------------------------------------------
 *  İki adım: ÖNİZLE (hiçbir şey yazmaz) → UYGULA (imza doğrularsa yazar).
 *
 *  Onay düğmesi önizleme çizilmeden aktif olmaz; imza da ancak önizlemeden
 *  gelir. Yani "gördüğünü onayla" kuralı hem ekranda hem sunucuda duruyor.
 * ============================================================================
 */

export type OnizlemeSonucu =
  | {
      tamam: true;
      farklar: Fark[];
      eskiCiro: number;
      yeniCiro: number;
      ciroFarki: number;
      paraBirimi: string;
      imza: string;
    }
  | { tamam: false; hata: string };

export async function duzenlemeyiOnizle(
  saleId: string,
  yeni: YeniDegerler,
  neden: DuzenlemeNedeni | null,
  aciklama: string | null,
): Promise<OnizlemeSonucu> {
  /**
   * ⚠ `satis.yaz` DEĞİL — 18.08.2026. Yeni satış girmek ile YAZILMIŞ bir
   * satışın fiyatını/adedini değiştirmek aynı yetki değildir: ikincisi
   * geçmişi ve NET'i değiştirir, adet değişince stok defterine hareket
   * yazar. Depocu satış girer, fiyat düzeltemez.
   */
  await yetkiIste("satis.duzenle");
  const t = await getTranslations("SatisDuzenleme");

  const kurulum = await duzenlemeOnizle(saleId, yeni, neden, aciklama);
  if (kurulum === null) return { tamam: false, hata: t("satisYok") };

  const { plan, imza } = kurulum;
  if (!plan.olur) {
    // Her engel KENDİ cümlesini alır — "olmadı" demek yetmez, NEDEN yazar.
    return { tamam: false, hata: t(`engel_${plan.engel}`) };
  }

  return {
    tamam: true,
    farklar: plan.farklar,
    eskiCiro: plan.eskiCiro,
    yeniCiro: plan.yeniCiro,
    ciroFarki: plan.ciroFarki,
    paraBirimi: plan.paraBirimi,
    imza,
  };
}

export type UygulamaSonucu =
  | { tamam: true; eskiNet2: number | null; yeniNet2: number | null }
  | { tamam: false; hata: string };

export async function duzenlemeyiUygula(
  saleId: string,
  yeni: YeniDegerler,
  neden: DuzenlemeNedeni,
  aciklama: string | null,
  onaylananImza: string,
): Promise<UygulamaSonucu> {
  const baglam = await yetkiIste("satis.duzenle");
  const t = await getTranslations("SatisDuzenleme");

  const sonuc = await duzenlemeUygula({
    saleId,
    yeni,
    neden,
    aciklama,
    onaylananImza,
    kullaniciId: baglam.kullaniciId,
    an: new Date(),
  });

  if (!sonuc.tamam) {
    /**
     * DURUM DEĞİŞTİ — sessizce yeni plana göre yazılmaz. Kullanıcıya
     * önizlemeyi tazelemesi söylenir; onay gösterilene verilmiştir.
     */
    if (sonuc.kod === "DURUM_DEGISTI") {
      return { tamam: false, hata: t("durumDegisti") };
    }
    if (sonuc.kod === "SATIS_YOK") return { tamam: false, hata: t("satisYok") };

    /**
     * STOK YETMİYORSA RAKAMI SÖYLE: "yapamazsın" demek yetmez — kaç adet
     * gerektiği ve kaç adet olduğu yazılır (Kullanıcı Kolaylığı #5).
     */
    if (sonuc.engel === "STOK_YETMIYOR" && sonuc.ayrinti) {
      return {
        tamam: false,
        hata: t("engel_STOK_YETMIYOR", {
          urun: sonuc.ayrinti.urunAdi,
          gereken: sonuc.ayrinti.gereken,
          mevcut: sonuc.ayrinti.mevcut,
        }),
      };
    }
    return { tamam: false, hata: t(`engel_${sonuc.engel}`) };
  }

  revalidatePath(`/satislar/${saleId}`);
  revalidatePath("/satislar");
  // Panel, rapor ve kârlılık kartı aynı snapshot'ı okur — hepsi tazelensin.
  revalidatePath("/");
  revalidatePath("/rapor");

  return { tamam: true, eskiNet2: sonuc.eskiNet2, yeniNet2: sonuc.yeniNet2 };
}

/**
 * ============================================================================
 *  DESİ DEĞİŞTİ — KARGO ÜCRETİ TARİFEDEN YENİDEN OKUNUR
 * ----------------------------------------------------------------------------
 *  ⚠ NİYE VAR — KULLANICI BİLDİRDİ 22.08.2026:
 *  _"Kargoda normalde bizim yazdığımızdan farklı bir desi çıktı; 3 yazmışız,
 *  kargoda 5 çıktı, 3'ü 5 yapıyorum. Bazen ben yüksek yazıyorum, kargodan
 *  nihai desi düşük geliyor. Desiye göre fiyat normalde değişmeli, fakat
 *  Selliora'da kargo ücreti değişmiyor."_
 *
 *  KÖK SEBEP ölçüldü (`lib/kar-yeniden.ts`): motor "elle girilen tutar
 *  tarifeyi EZER" kuralıyla çalışıyor ve düzenleme formu tutar alanını
 *  HER ZAMAN dolu gönderiyordu (mevcut ücret önceden yazılı). Yani
 *  `cargoAmountManual` hiçbir zaman null olmuyor, tarife dalı HİÇ
 *  çalışmıyordu. Desiyi değiştirmek gerçekten hiçbir şeyi değiştirmiyordu.
 *
 *  ⚠ MOTOR KURALI DOĞRU, DEĞİŞTİRİLMEDİ. "Elle tutar tarifeyi ezer" kuralı
 *  gerekli: kullanıcı kargodan farklı bir tutar ödediyse onu yazabilmeli.
 *  Kırık olan EKRANDI — desi değişince tutarın yenilenmesi gerekiyordu.
 *
 *  Bu eylem yalnız OKUR: tarifeyi döndürür, hiçbir şey yazmaz. Yazma kararı
 *  kullanıcıda kalır (önizleme + onay zinciri aynen işler).
 * ============================================================================
 */
export type KargoTarifeSonucu =
  | { tur: "TARIFE"; kdvDahil: number; desi: number }
  /** Firma bu desiyi taşımıyor — tarife satırı yok. */
  | { tur: "TARIFE_YOK"; desi: number }
  /** Satışta kargo firması seçili değil; okunacak tarife de yok. */
  | { tur: "FIRMA_YOK" }
  | { tur: "SATIS_YOK" };

export async function kargoTarifesiniOku(
  saleId: string,
  desi: number,
): Promise<KargoTarifeSonucu> {
  /**
   * ⚠ EKRANIN KENDİ İZNİ. `kargoSecenekleriGetir` `satis.yaz` istiyor ama
   * bu ekran `satis.duzenle` ile açılıyor: satış girebilen ile yazılmış bir
   * satışı düzeltebilen aynı kişi olmak zorunda değil. Var olan eylemi
   * çağırsaydık, düzeltme yetkisi olan ama satış yazma yetkisi olmayan
   * kullanıcıda ekran sessizce çalışmazdı.
   */
  await yetkiIste("satis.duzenle");

  const satis = await prisma.sale.findUnique({
    where: { id: saleId },
    select: {
      cargoCarrierId: true,
      channelAccount: { select: { channelId: true } },
    },
  });
  if (satis === null) return { tur: "SATIS_YOK" };
  if (satis.cargoCarrierId === null) return { tur: "FIRMA_YOK" };

  /** ⚠ Kargo firmaları desiyi YUKARI yuvarlar — 3,2 desi 4 desi ücretidir. */
  const tamDesi = Math.max(0, Math.ceil(desi));

  const tarife = await prisma.cargoTariff.findFirst({
    where: {
      channelId: satis.channelAccount.channelId,
      carrierId: satis.cargoCarrierId,
      desi: tamDesi,
    },
    select: { amount: true },
  });
  if (tarife === null) return { tur: "TARIFE_YOK", desi: tamDesi };

  /**
   * ⚠ TARİFE KDV HARİÇ SAKLANIR, EKRAN KDV DAHİL GÖSTERİR. Çeviri tek
   * kaynaktan (`kargo-kdv.ts`) — form kendi çarpanını yazsaydı motorla
   * ayrışırdı ve ekranda bir rakam, hesapta başka bir rakam olurdu.
   */
  return {
    tur: "TARIFE",
    kdvDahil: kdvDahilKargo(Number(tarife.amount.toString())) ?? 0,
    desi: tamDesi,
  };
}
