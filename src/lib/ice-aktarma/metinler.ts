import { getTranslations } from "next-intl/server";

import type { SablonMetinleri } from "./sablon";
import type { SayfaAnahtari } from "./sutunlar";

/**
 * ============================================================================
 *  ŞABLON VE OKUYUCU METİNLERİ — TEK YERDEN
 * ----------------------------------------------------------------------------
 *  Şablonu ÜRETEN kod da yüklenen dosyayı OKUYAN kod da aynı başlıkları
 *  kullanmak zorunda: başlıklar sözlükten geldiği için, ikisi ayrı yerde
 *  çözülseydi bir gün biri değişip öteki kalırdı.
 *
 *  Anahtarlar BİLEREK tek tek yazıldı, döngüyle üretilmedi. Sözlük denetimi
 *  (`npm run i18n:kontrol`) yalnızca metin sabiti olan çağrıları görebiliyor;
 *  döngüyle üretilen anahtarlar denetimin kör noktasında kalırdı.
 * ============================================================================
 */
export async function sablonMetinleri(): Promise<SablonMetinleri> {
  const t = await getTranslations("IceAktarma");

  const sayfaAdlari: Record<SayfaAnahtari, string> = {
    urunler: t("sayfaUrunler"),
    acilisStogu: t("sayfaAcilisStogu"),
    kanalSku: t("sayfaKanalSku"),
  };

  const sutunAdlari: Record<string, string> = {
    urunAdi: t("sutunUrunAdi"),
    marka: t("sutunMarka"),
    varyantAdi: t("sutunVaryantAdi"),
    sku: t("sutunSku"),
    firmaSku: t("sutunFirmaSku"),
    barkod: t("sutunBarkod"),
    kategori: t("sutunKategori"),
    desi: t("sutunDesi"),
    raf: t("sutunRaf"),
    adet: t("sutunAdet"),
    birimMaliyet: t("sutunBirimMaliyet"),
    paraBirimi: t("sutunParaBirimi"),
    tarih: t("sutunTarih"),
    not: t("sutunNot"),
    kanalHesabi: t("sutunKanalHesabi"),
    kanalKodu: t("sutunKanalKodu"),
    komisyonOrani: t("sutunKomisyonOrani"),
  };

  return {
    sayfaAdlari,
    sutunAdlari,
    yardimciSayfaAdlari: {
      listeler: t("sayfaListeler"),
      yardim: t("sayfaYardim"),
    },
    listeBasliklari: {
      kategoriler: t("listeKategoriler"),
      kdvOrani: t("listeKdvOrani"),
      raflar: t("listeRaflar"),
      kanalHesaplari: t("listeKanalHesaplari"),
      paraBirimleri: t("listeParaBirimleri"),
    },
    yardimSatirlari: [
      t("yardim1"),
      t("yardim2"),
      t("yardim3"),
      t("yardim4"),
      t("yardim5"),
      t("yardim6"),
      t("yardim7"),
      t("yardim8"),
      t("yardim9"),
      t("yardim10"),
      t("yardim11"),
      t("yardim12"),
      t("yardim13"),
      t("yardim14"),
    ],
    zorunluIsareti: t("zorunluIsareti"),
  };
}
