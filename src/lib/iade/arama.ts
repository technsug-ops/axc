import { kodEsdegerleri } from "@/lib/varyant-arama-kurali";

/**
 * ============================================================================
 *  İŞLENMİŞ İADE ARAMASI — SAF KURAL
 * ----------------------------------------------------------------------------
 *  Kullanıcı 02.09.2026: _"iadeler kısmında arama kısmı yok."_
 *
 *  ⛔ VE HAKLIYDI, AMA EKSİK DEĞİL YARIM: `/iadeler` ekranında arama kutusu
 *  VARDI — yalnız **Bildirimler** sekmesinde (`bq` parametresi). İşlenmiş
 *  iadeler sekmesinde tarih penceresi ve üç açılır süzgeç vardı, arama YOKTU.
 *  Yani ortak bileşen bu sayfaya girmiş ama İKİNCİ sekmeye taşınmamıştı.
 *
 *  ── NİYE AYRI DOSYA, NİYE SAYFANIN İÇİNDE DEĞİL ─────────────────────────
 *  Koşul sayfanın içine gömülseydi DEĞER TESTİ yazılamaz, ölçüt kaynak
 *  taramaya düşerdi — bu deponun en sık yalancı yeşil üreten yolu. Saf
 *  gövde `iade:dogrula`dan doğrudan ÇAĞRILIR ve dönen nesne sınanır.
 *  _(Anayasa: "saf hesap katmanı, desen tarayan bekçiye muhtaç olmaz".)_
 *
 *  ⚠ VE `bildirimAramaKosulu` KOPYALANMADI, KARDEŞİ YAZILDI. İkisi FARKLI
 *  tabloları arıyor: bildirim `ReturnNotice`, bu `Return`. Ortak bir gövdeye
 *  zorlamak, iki farklı şemayı tek `where` tipine sıkıştırmak olurdu.
 *  Ortak olan ŞEKİL (`OR` + `contains` + boş aramada boş nesne) ve o şekil
 *  burada da birebir korunuyor.
 * ============================================================================
 */

/**
 * ARANAN ALANLAR — TEK KAYIT YERİ, bekçi bunları dolaşır.
 *
 * ⚠ ÜÇ AİLE VAR VE ÜÇÜ DE OPERASYONUN ELİNDE OLAN ŞEYLER:
 *   · İADENİN kendi kimliği   — talep no, sebep notu
 *   · SATIŞIN kimliği         — sipariş no, gönderi no (kargo etiketi)
 *   · DÖNEN ÜRÜNÜN kimliği    — SKU, firma SKU, barkod, kanal SKU, ad
 *
 * ⭐ `note` DE ARANIYOR — VE BU BİLİNÇLİ. K136a'da iade sebebi buraya
 * yazıldı (`IADE_SEBEP[kaynak:…]: «Beğenmedim»`) çünkü `ReturnReason`
 * enum'unda karşılığı yoktu. Sebep aranabilir olmazsa "kaç iade
 * beğenmemekten" sorusunun hiçbir cevabı olmaz — ve o soru enum
 * genişletmesinin açılış şartı.
 *
 * ⛔ `sale.shipmentCode` UNUTULMADI: gönderi numarası bir SATIŞ kimliğidir
 * (`ROL_KAPSAMI` → `SATIS`) ve K41①'de "mevcut aramalara katılsın" diye
 * karara bağlandı. Varyant koşuluna konsaydı geçersiz sorgu üretirdi.
 */
export const IADE_ARAMA_ALANLARI = [
  "code",
  "note",
  "sale.code",
  "sale.shipmentCode",
  "items.some.variant.sku",
  "items.some.variant.companySku",
  "items.some.variant.barcode",
  "items.some.variant.product.name",
] as const;

/**
 * Kanal SKU ayrı duruyor çünkü şekli farklı: iki `some` iç içe geçiyor ve
 * `isActive` şartı var — pasife alınmış bir eşleşme o ürünü artık
 * getirmemeli (`aramaKosulu` ile aynı gerekçe).
 */
function kanalSkuKosulu(e: string): Record<string, unknown> {
  return {
    items: {
      some: {
        variant: {
          channelSkus: { some: { channelSku: { contains: e }, isActive: true } },
        },
      },
    },
  };
}

/** Noktalı yolu iç içe nesneye çevirir; `some` özel anahtar olarak geçer. */
function icIceKosul(yol: string, deger: unknown): Record<string, unknown> {
  const parcalar = yol.split(".");
  let sonuc: unknown = deger;
  for (let i = parcalar.length - 1; i >= 0; i--) {
    sonuc = { [parcalar[i]]: sonuc };
  }
  return sonuc as Record<string, unknown>;
}

/**
 * Prisma `where` parçası.
 *
 * ⛔ BOŞ ARAMADA BOŞ NESNE DÖNER — "hiçbir şey eşleşmesin" DEĞİL, "süzme"
 * demektir. İkisini karıştırmak listeyi sessizce boşaltır ve kullanıcı
 * "iadeler kayboldu" der.
 *
 * ⭐ EŞDEĞERLER SERBEST METİNDE DE GEÇERLİ (K100): aranan `0194644037598`,
 * kayıtlı `194644037598`den UZUN olduğu için `contains` onu HİÇ bulamaz.
 * "Kısmi eşleşme zaten yakalar" sanısı burada yanlıştır.
 */
export function iadeAramaKosulu(arama: string): Record<string, unknown> {
  const q = arama.trim();
  if (q === "") return {};
  const esdegerler = kodEsdegerleri(q);
  return {
    OR: esdegerler.flatMap((e) => [
      ...IADE_ARAMA_ALANLARI.map((yol) => icIceKosul(yol, { contains: e })),
      kanalSkuKosulu(e),
    ]),
  };
}
