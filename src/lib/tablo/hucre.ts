import { gunDegeri } from "@/lib/donem";

/**
 * ============================================================================
 *  TABLO HÜCRESİ ÇÖZÜCÜLERİ — BAŞLIK, SAYI, TARİH
 * ----------------------------------------------------------------------------
 *  Elektronik tablodan gelen ham hücreleri okunur değerlere çevirir.
 *  Veritabanına GİTMEZ, dosya AÇMAZ — gerçek dosya olmadan sınanabilir.
 *
 *  BAŞLIK EŞLEŞTİRME TOLERANSLI: pazaryerleri kolon başlıklarını haber
 *  vermeden değiştirir — fazladan boşluk, büyük/küçük harf, "İ" yerine "I".
 *  Birebir eşleştirme yapılsaydı tek boşluk yüzünden okuyucu tutmazdı ve
 *  hata "kolon yok" diye görünürdü. Bu yüzden başlıklar normalize edilerek
 *  karşılaştırılır.
 *
 *  13.08.2026'da `hakedis/okuyucu.ts` içinden buraya taşındı: komisyon
 *  listesi okuyucusu da aynı toleransa ihtiyaç duyuyor. Hakediş tarafı
 *  bunları kendi modülünden yeniden dışa veriyor, çağıranları değişmedi.
 * ============================================================================
 */

/** Başlık karşılaştırma anahtarı: Türkçe küçük harf, tek boşluk, sadeleşmiş. */
export function basligiNormalle(ham: string): string {
  return (
    String(ham ?? "")
      /**
       * KIRILMAZ BOŞLUK (U+00A0) — pazaryeri başlıklarında normal boşluk gibi
       * GÖRÜNÜR ama ona eşit değildir. Kaçış dizisiyle yazılıyor: düz karakter
       * yazılırsa bir sonraki düzenlemede sessizce normal boşluğa dönüşür ve
       * başlık eşleşmesi hiç uyarı vermeden bozulur.
       */
      .replace(/ /g, " ")
      .trim()
      .toLocaleLowerCase("tr")
      .replace(/\s+/g, " ")
  );
}

/** Başlık satırından "normalize başlık → kolon sırası" haritası. */
export function basliklariDizinle(basliklar: unknown[]): Map<string, number> {
  const dizin = new Map<string, number>();
  basliklar.forEach((b, i) => {
    const anahtar = basligiNormalle(String(b ?? ""));
    if (anahtar !== "" && !dizin.has(anahtar)) dizin.set(anahtar, i);
  });
  return dizin;
}

/**
 * "1.234,56" · "1234.56" · "-52,87" · 1958 → sayı.
 * Elektronik tabloda tutar hem sayı hem metin gelebilir.
 */
export function sayiCoz(ham: unknown): number | null {
  if (typeof ham === "number") return Number.isFinite(ham) ? ham : null;
  const metin = String(ham ?? "")
    .replace(/\s|₺|TL/gi, "")
    .trim();
  if (metin === "") return null;

  // Binlik ayıracı nokta, ondalık virgül (TR) — ama "1234.56" de gelebilir.
  const trBicim = /^-?\d{1,3}(\.\d{3})*(,\d+)?$/.test(metin);
  const sade = trBicim
    ? metin.replace(/\./g, "").replace(",", ".")
    : metin.replace(",", ".");

  const sayi = Number(sade);
  return Number.isFinite(sayi) ? sayi : null;
}

/**
 * "10.08.2026" · "2026-08-10" · Date → UTC gece yarısı.
 * İş tarihleri saat taşımaz (donem.ts kuralı).
 */
export function tarihCoz(ham: unknown): Date | null {
  if (ham instanceof Date) {
    return gunDegeri({
      yil: ham.getUTCFullYear(),
      ay: ham.getUTCMonth() + 1,
      gun: ham.getUTCDate(),
    });
  }
  const metin = String(ham ?? "").trim();
  if (metin === "") return null;

  const noktali = /^(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})/.exec(metin);
  if (noktali) {
    return gunDegeri({
      yil: Number(noktali[3]),
      ay: Number(noktali[2]),
      gun: Number(noktali[1]),
    });
  }
  const tireli = /^(\d{4})-(\d{2})-(\d{2})/.exec(metin);
  if (tireli) {
    return gunDegeri({
      yil: Number(tireli[1]),
      ay: Number(tireli[2]),
      gun: Number(tireli[3]),
    });
  }
  return null;
}
