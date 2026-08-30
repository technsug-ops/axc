/**
 * ============================================================================
 *  YERLEŞTİRME KARARI — SAF GÖVDE (K50 ④)
 * ----------------------------------------------------------------------------
 *  Okutulan bir kod üç şeyden biri olabilir: ÜRÜN · RAF · hiçbiri. Karar
 *  burada veriliyor; ekran yalnız çiziyor, sunucu eylemi yalnız yazıyor.
 *
 *  ⚠ VERİTABANI YOK — `depo:dogrula` bunu ÇAĞIRARAK sınıyor, kaynak
 *  tarayarak değil. (Anayasa: "saf hesap katmanı desen tarayan bekçiye
 *  muhtaç olmaz".)
 *
 *  ── SIRA ÖLÇÜLDÜ: ÖNCE ÜRÜN ─────────────────────────────────────────────
 *  Günlük iş ürün okutmaktır; raf etiketi istisnadır. Ürün önce sorulmasa
 *  her okumada iki gidiş-dönüş olurdu.
 *
 *  ⚠ VE ÇAKIŞMA RİSKİ CANLIDA ÖLÇÜLDÜ (30.08.2026): 41 raf kodunun HİÇBİRİ
 *  bir ürünün SKU/Firma SKU/barkoduyla çakışmıyor (`0` eşleşme). Yani sıra
 *  bugün hiçbir kaydı yanlış tarafa göndermiyor. Çakışma doğarsa ürün
 *  kazanır — ve rafı değiştirmenin İKİNCİ yolu her zaman açık: üstteki raf
 *  kutusuna okutmak.
 * ============================================================================
 */

export type YerlestirmeGirdisi = {
  /** Okutulan kod bir ürüne çözüldü mü. */
  varyantVar: boolean;
  /** Ürünün ŞU ANKİ konumu — hiç konumu yoksa `null`. */
  varyantKonumId: string | null;
  /** Okutulan kod bir rafa çözüldü mü. */
  rafVar: boolean;
  /** Ekranda seçili duran raf — seçilmemişse `null`. */
  seciliRafId: string | null;
};

export type YerlestirmeKarari =
  /** Ürün okundu ama raf seçilmemiş — İlke #5: NİYE ilerlemediği söylenir. */
  | { tur: "RAF_SECILMEDI" }
  /** Yazılacak. `ayniRaf` ise yazma yine yapılır ama ekran "zaten burada" der. */
  | { tur: "URUN_YERLESTIR"; ayniRaf: boolean }
  /** Okutulan kod bir raf etiketi — seçili raf değişir. */
  | { tur: "RAF_DEGISTIR" }
  /** Ne ürün ne raf. Bir SUÇLAMA değil, BİLGİ. */
  | { tur: "BULUNAMADI" };

export function yerlestirmeKarari(g: YerlestirmeGirdisi): YerlestirmeKarari {
  /**
   * ⭐ ÜRÜN ÖNCE — sıranın gerekçesi başlıkta ölçüldü.
   * ⚠ Raf seçilmemişken ürün okunması SESSİZ GEÇMEZ: yazacak yer yok ve
   * bunu ekran söyler. Sessizce yutulsaydı operatör okutur, hiçbir şey
   * olmaz ve "sistem bozuk" derdi.
   */
  if (g.varyantVar) {
    if (g.seciliRafId === null) return { tur: "RAF_SECILMEDI" };
    return { tur: "URUN_YERLESTIR", ayniRaf: g.varyantKonumId === g.seciliRafId };
  }
  /**
   * ⭐ RAF ETİKETİ OKUNDU → SEÇİLİ RAF DEĞİŞİR (İlke #9, az tıkla).
   * Depoda operatör rafın önüne gider, etiketi okutur, ürünleri okutur.
   * "Rafı değiştir" düğmesine gitmek zorunda kalmak fazladan iki tıktır.
   */
  if (g.rafVar) return { tur: "RAF_DEGISTIR" };
  return { tur: "BULUNAMADI" };
}
