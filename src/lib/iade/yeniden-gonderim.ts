/**
 * ============================================================================
 *  YENİDEN GÖNDERİM KARGOSU — ALAN NE ZAMAN SORULUR? (24.08.2026)
 * ----------------------------------------------------------------------------
 *  Kullanıcı vakası `11473322212`: ürün kargoda hasar aldı, müşteri iade
 *  açtı, itiraz ettik, müşteri mağdur olmasın diye DEĞİŞİM yaptık ve yeni
 *  ürünün kargosunu ÖDEDİK. Üç kargo çıktı — gönderme · iade · yeniden
 *  gönderme — ama defterde yalnız ikisi var.
 *
 *  ⚠ ÖLÇÜLDÜ: `Return.reshipCargoAmount` ALANI VAR ve formda karşılığı VAR.
 *  Şema açmak gerekmiyordu; alan İKİ KAPIYLA birden kapalıydı:
 *    ① blok yalnız `returnType === "DISPUTED"` iken çiziliyordu — o iade
 *       NORMAL'di, blok hiç görünmedi;
 *    ② input `disputedReshipPaidBySeller` false ise DISABLED — Trendyol'da
 *       false, yani yazılamazdı.
 *
 *  ⚠ BAYRAK YANLIŞ DEĞİL, KAPSAMININ DIŞINA UYGULANIYORDU. Şemadaki tanımı:
 *  _"İtirazlı iadede ürün müşteriye GERİ gönderilirken kargoyu satıcı öder
 *  mi? Trendyol: hayır."_ Bu, AYNI ürünün müşteriye dönmesi. Değişimde
 *  giden şey aynı ürün değil, YENİ bir üründür ve parasını biz ödedik.
 *  İki farklı sevkiyat tek bayrağa bağlanınca, gerçekten ödenmiş bir gider
 *  hiçbir yere yazılamıyordu.
 *  (Anayasa: "ilke, kendi kapsamının dışına uygulanırsa hatayı korur".)
 * ============================================================================
 */

/**
 * MÜŞTERİYE MAL ÇIKIYOR MU? Alan bu soruya bağlı — iade tipine değil.
 *
 * · değişim var  → YENİ ürün çıkıyor, kargosunu biz öderiz
 * · DISPUTED     → AYNI ürün geri gidiyor (kanal politikası devrede)
 *
 * ⚠ İkisi de değilse alan HİÇ çizilmez: para iadesinde müşteriye giden
 * bir şey yoktur ve boş bir kutu, doldurulması gereken bir şey varmış
 * izlenimi verirdi (İlke #11'in kardeşi).
 */
export function yenidenGonderimSorulurMu(girdi: {
  returnType: string;
  degisimVar: boolean;
}): boolean {
  if (girdi.degisimVar) return true;
  return girdi.returnType === "DISPUTED";
}

/**
 * ⚠ KANAL POLİTİKASI ARTIK KİLİT DEĞİL, İPUCU.
 *
 * Eskiden `false` olan kanalda input DISABLED'dı. O tasarım şunu varsayıyor:
 * _"kanal ödüyorsa biz ödememişizdir."_ Vaka bunu çürüttü — Trendyol
 * değişimi onayladı, kargo kodunu verdi, parayı BİZ ödedik.
 *
 * Politika ne yapılması BEKLENDİĞİNİ söyler; defter ne OLDUĞUNU yazar.
 * Beklentiyi kullanarak gerçeği kayıt dışı bırakmak, defteri bozar.
 * Bu yüzden alan hep yazılabilir; politika yalnız ALTINDAKİ NOTU seçer.
 */
export function kanalNormaldeOderMi(kanalPolitikasi: boolean): boolean {
  return !kanalPolitikasi;
}
