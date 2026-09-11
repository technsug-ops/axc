import type { OzetVeriPaketi } from "./veri-toplama";

/**
 * ============================================================================
 *  DETERMİNİSTİK YEDEK ANLATI (K-OZET)
 * ----------------------------------------------------------------------------
 *  LLM doğrulamadan geçemediğinde (REDDEDILDI) ya da hiç çağrılamadığında
 *  (HATA) ekran BOŞ KALMAZ (sessiz başarısızlık yasak, İlke #5) — ama LLM
 *  de KARIŞMAZ. Bu, `OzetVeriPaketi`nin ZATEN BİÇİMLENMİŞ `goruntu`
 *  değerlerini sıralayıp listeleyen SAF bir şablon; hiçbir rakam üretmez,
 *  yalnız var olanı gösterir — yapı gereği sayı-güvenlidir.
 * ============================================================================
 */

const ONEM_SIRASI: Record<"kirmizi" | "amber" | "notr", number> = {
  kirmizi: 0,
  amber: 1,
  notr: 2,
};

export function yedekAnlatiOlustur(paket: OzetVeriPaketi): string {
  if (paket.baglamlar.length === 0) {
    return "Bugün için öne çıkan bir kalem yok — sinyaller temiz.";
  }

  const siraliBaglamlar = [...paket.baglamlar].sort(
    (a, b) => ONEM_SIRASI[a.onem] - ONEM_SIRASI[b.onem],
  );

  return siraliBaglamlar
    .map((b) => {
      const degerler = paket.sayilar
        .filter(
          (s) => s.anahtar === b.anahtar || s.anahtar.startsWith(b.anahtar + "_"),
        )
        .map((s) => s.goruntu)
        .join(" · ");
      return `- ${b.baslik}: ${degerler}`;
    })
    .join("\n");
}
