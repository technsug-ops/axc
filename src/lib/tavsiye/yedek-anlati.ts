import type { TavsiyeVeriPaketi } from "./veri-toplama";

/**
 * ============================================================================
 *  DETERMİNİSTİK YEDEK — LLM DOĞRULAMADAN GEÇEMEDİĞİNDE (K-TAVSIYE)
 * ----------------------------------------------------------------------------
 *  ⚠ K-OZET'in yedeğinden FARKLI BİR ÇERÇEVE: orada bir "özet" hâlâ
 *  anlamlıydı (rakamları sırala, anlat). Burada deterministik bir
 *  TAVSİYE üretmek zaten çelişki olur — verdiği yargı model'e ait.
 *  Bu yüzden ekrana bir tavsiye değil, kaynaklı rakamların DÜZ LİSTESİ +
 *  açık bir "karar sizde" çerçevesi konur. Sayı güvenliği yapı gereği
 *  korunur (yalnız zaten doğrulanmış `goruntu` değerleri listelenir).
 * ============================================================================
 */
export function tavsiyeYedekAnlatiOlustur(paket: TavsiyeVeriPaketi): string {
  if (paket.baglamlar.length === 0) {
    return "Bu ürün için yeterli veri yok.";
  }

  const satirlar = paket.baglamlar
    .map((b) => {
      const sayi = paket.sayilar.find((s) => s.anahtar === b.anahtar);
      return sayi ? `- ${b.aciklama}: ${sayi.goruntu}` : null;
    })
    .filter((s): s is string => s !== null);

  return (
    "Öneri üretilemedi; rakamlara göre siz karar verin:\n\n" +
    satirlar.join("\n")
  );
}
