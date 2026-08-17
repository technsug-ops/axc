/**
 * ============================================================================
 *  KART ARAMASI — YÖNLENDİRME KARARI (SAF)
 * ----------------------------------------------------------------------------
 *  ⚠ NEDEN AYRI DOSYA (17.08.2026, canlı hata)
 *
 *  Kural önce yalnız KAMERA yolunda vardı: okutulan kod tam eşleşirse kart
 *  doğrudan açılıyordu. Klavyeyle yazıp Ara'ya basınca aynı kod TEK ELEMANLI
 *  bir liste gösteriyor ve bir tıklama daha istiyordu.
 *
 *  Aynı sorunun iki giriş yolunda iki farklı cevabı olamaz. Karar artık
 *  burada, tek yerde; istemci tarafı kendi kopyasını taşımıyor — kamera da
 *  klavye de `/kart?q=...` adresine gidiyor ve kararı sunucu veriyor.
 *
 *  ── TEK SONUÇLU LİSTE ANLAMSIZDIR ───────────────────────────────────────
 *  Elinde ürünle bekleyen birine tek satırlık bir liste gösterip "şuna tıkla"
 *  demek, cevabı bilip söylememektir (İlke #9 — az tıkla).
 * ============================================================================
 */

export type AramaKarari =
  | { tur: "YONLEN"; variantId: string }
  | { tur: "LISTE" }
  | { tur: "BOS" };

export function aramaKarari(girdi: {
  /** Kod ile TAM eşleşen varyant (barkod/SKU/firma SKU/kanal SKU). */
  tamEslesmeId: string | null;
  /** Serbest metin aramasının sonuçları. */
  sonuclar: readonly { id: string }[];
}): AramaKarari {
  const { tamEslesmeId, sonuclar } = girdi;

  /**
   * 1) TAM EŞLEŞME HER ŞEYDEN ÖNCE GELİR. Kısmi arama daha çok sonuç
   * döndürse bile, kullanıcı bir KOD yazdıysa aradığı şey bellidir.
   */
  if (tamEslesmeId !== null) {
    return { tur: "YONLEN", variantId: tamEslesmeId };
  }

  // 2) Tek kısmi sonuç da doğrudan açılır — seçilecek bir şey yok.
  if (sonuclar.length === 1) {
    return { tur: "YONLEN", variantId: sonuclar[0].id };
  }

  // 3) Hiç sonuç yoksa "kayıtlı değil" ekranı; sessiz boş sayfa DEĞİL.
  if (sonuclar.length === 0) return { tur: "BOS" };

  // 4) Ancak birden çok sonuçta liste anlamlıdır.
  return { tur: "LISTE" };
}
