/**
 * ============================================================================
 *  ANTİ-HALÜSİNASYON DOĞRULAMASI — PAYLAŞILAN LLM GÜVENLİK KATMANI
 * ----------------------------------------------------------------------------
 *  Anayasa: "KAYNAĞI YAZILMAYAN SAYI KULLANILAMAZ". LLM bir rakamı yalnız
 *  `{{anahtar}}` yer tutucusuyla işaret edebilir — asla rakamı kendisi
 *  YAZAMAZ. Bu, modelin doğru bir rakamı YANLIŞ sinyale bağlamasını da
 *  yapısal olarak imkânsız kılar (önleme, tespit değil).
 *
 *  ⚠ 11.09.2026 — K-OZET'TEN TAVSİYE ÖZELLİĞİNE TAŞINDI (K-TAVSIYE). Bu
 *  dosya (eski adı `ozet/dogrulama.ts`, `ozetMetniDogrula`) tamamen
 *  jenerik — hiçbir alanı "günlük özet"e özel değil. İki özellik ortak bu
 *  katmanı paylaşıyor; kopya yasak ilkesi gereği yeniden yazılmadı, TAŞINDI.
 *  Gövde birebir aynı kaldı (5 mutasyonla kanıtlı davranış korunuyor).
 *
 *  İKİ AYRI, SIRAYLA ÇALIŞAN KAPI (İKİ YÖN AYRI SINANIR):
 *   1) ÇÖZÜLEMEYEN ANAHTAR — model uydurma/yanlış yazılmış bir anahtar
 *      kullandı (yanlış yanma: fazladan/geçersiz bir referans üretti).
 *   2) SERBEST SAYI — yer tutucular dışında model rakam YAZDI (yanlış
 *      yanma: talimatı yok sayıp rakamı kendi elleriyle bastı).
 *
 *  Başarısızlıkta metin HİÇ GÖSTERİLMEZ — çağıran taraf deterministik
 *  yedeğe düşer (sessiz başarısızlık yasak, İlke #5).
 * ============================================================================
 */

/** Model çıktısında yer tutucuyla işaret edilebilir tek bir doğrulanmış sayı. */
export type DogrulanabilirSayi = { anahtar: string; goruntu: string; ham: number };

export type DogrulamaSonucu =
  | { tamam: true; metin: string }
  | {
      tamam: false;
      sebep: "COZULMEYEN_ANAHTAR" | "SERBEST_SAYI";
      detay: string[];
    };

/** `{{anahtar}}` — harf/rakam/alt çizgi. Anahtarların kendisi hiçbir zaman rakam DESENİ taşımaz (bkz. çağıranların anahtar adlandırması), bu yüzden anahtar içindeki rakamlar serbest-sayı taramasını bulaştırmaz. */
const YER_TUTUCU_DESENI = /\{\{([a-zA-Z0-9_]+)\}\}/g;

/**
 * SERBEST RAKAM DESENİ — bicim-ortak.ts'in ürettiği GERÇEK biçimlere göre:
 * ₺555,00 · %12,5 · 1.284 · -374 · 3. Herhangi bir çıplak basamak dizisi de
 * yakalanır (küçük tamsayılar dahil) — model "3 kalem" gibi bir rakamı da
 * kendi eliyle yazamaz.
 */
const SERBEST_SAYI_DESENI = /[₺€%]?-?\d{1,3}(?:\.\d{3})*(?:,\d+)?%?/g;

export function llmMetniDogrula(
  ham: string,
  sayilar: DogrulanabilirSayi[],
): DogrulamaSonucu {
  const sozluk = new Map(sayilar.map((s) => [s.anahtar, s.goruntu]));

  const cozulemeyenler = new Set<string>();
  for (const es of ham.matchAll(YER_TUTUCU_DESENI)) {
    if (!sozluk.has(es[1])) cozulemeyenler.add(es[1]);
  }
  if (cozulemeyenler.size > 0) {
    return {
      tamam: false,
      sebep: "COZULMEYEN_ANAHTAR",
      detay: [...cozulemeyenler].sort(),
    };
  }

  /**
   * ⚠ MASKELEME, YER DEĞİŞTİRME DEĞİL. Yer tutucular gerçek `goruntu`
   * değerleriyle DOLDURULSAYDI (rakam içerirler), bu tarama kendi
   * doldurduğu rakamı "serbest sayı" sanıp yanlış pozitif üretirdi. Bu
   * yüzden önce nötr bir işaretle (`#`) MASKELENİR, tarama ondan sonra.
   */
  const maskelenmis = ham.replace(/\{\{[a-zA-Z0-9_]+\}\}/g, "#");
  const serbestSayilar = [...maskelenmis.matchAll(SERBEST_SAYI_DESENI)].map(
    (m) => m[0],
  );
  if (serbestSayilar.length > 0) {
    return { tamam: false, sebep: "SERBEST_SAYI", detay: serbestSayilar };
  }

  const metin = ham.replace(
    YER_TUTUCU_DESENI,
    (_, anahtar: string) => sozluk.get(anahtar)!,
  );
  return { tamam: true, metin };
}
