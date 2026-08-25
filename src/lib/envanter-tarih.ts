import { gunDegeri, gunMetni, gunMetninden, isTakvimGunu } from "@/lib/donem";

/**
 * ============================================================================
 *  TARİHLİ ENVANTER — SINIRIN SAF KURALI (K53, 25.08.2026)
 * ----------------------------------------------------------------------------
 *  Kullanıcı: _"kullanıcı tarih seçer; sistem o tarih itibarıyla kayıtlı
 *  stoku ve FIFO maliyet değerini kurar."_
 *
 *  ⚠ SINIR AÇIKÇA: **seçilen günün BAŞLANGICI itibarıyla.** 1 Haziran
 *  seçilirse 31 Mayıs'ın sonundaki hâl gösterilir; 1 Haziran'da yaşanan
 *  hiçbir hareket girmez. Bu bir tercih değil, muhasebe dilinin kendisi:
 *  "1 Haziran açılış bakiyesi" tam olarak bunu söyler.
 *
 *  ⚠ VE EKRANDA ÖRNEKLE YAZILIR. "Başlangıcı itibarıyla" cümlesi tek
 *  başına yoruma açık; ekran `31 Mayıs sonu = 1 Haziran açılışı` diye
 *  örnekliyor. Bir gün kayması, ay kapanışında bütün rakamı kaydırır.
 *
 *  ⚠ ADI "DEĞER", "SAYIM" DEĞİL — ve bu dil kuralı BEKÇİLİ. Bu ekran
 *  kayıtlardan kurulmuş bir DEFTER FOTOĞRAFIDIR; rafta ne olduğunu
 *  söylemez, deftere ne yazıldığını söyler. "Sayım" demek, yapılmamış bir
 *  işi yapılmış göstermek olurdu.
 * ============================================================================
 */

/** Ekranda yazan dil — "sayım" YASAK, bekçi bunu ölçüyor. */
export const YASAK_KELIME = "sayım";

export type TarihCozumu =
  | { tur: "BUGUN" }
  | { tur: "TARIHLI"; sinir: Date; metin: string }
  /** Geçersiz metin sessizce bugüne düşmez — kullanıcıya söylenir. */
  | { tur: "GECERSIZ"; ham: string };

/**
 * Adres çubuğundaki `?tarih=YYYY-MM-DD` → sınır.
 *
 * ⚠ BOŞ = BUGÜN, ve bu bir varsayım değil varsayılan: tarih seçilmediğinde
 * ekranın bugünü göstermesi zaten mevcut davranış.
 *
 * ⚠ GEÇERSİZ TARİH SESSİZCE BUGÜNE DÜŞMEZ. Düşseydi kullanıcı yanlış
 * yazdığı bir tarihin sonucunu DOĞRU sanırdı — ekranda "1 Hazran" yazar,
 * rakam bugünün rakamı olurdu.
 */
export function tarihCoz(ham: string | undefined): TarihCozumu {
  const metin = (ham ?? "").trim();
  if (metin === "") return { tur: "BUGUN" };

  const gun = gunMetninden(metin);
  if (!gun) return { tur: "GECERSIZ", ham: metin };

  return { tur: "TARIHLI", sinir: gun, metin: gunMetni(gun) };
}

/**
 * SEÇİLEBİLİR EN GEÇ GÜN — bugün.
 *
 * ⚠ GELECEK TARİH SEÇİLEMEZ. Seçilebilseydi ekran bugünle aynı rakamı
 * gösterir ama başlığında YARIN yazardı: doğru sayı, yanlış etiket.
 * _(Anayasa: "metin, sahip olmadığı anlamı iddia etmez.")_
 */
export function enGecGun(an: Date): string {
  return gunMetni(gunDegeri(isTakvimGunu(an)));
}

/**
 * Seçilen gün gelecekte mi?
 *
 * ⚠ BUGÜN GELECEK DEĞİLDİR — `>` kullanılıyor. `>=` olsaydı bugünü seçmek
 * reddedilir ve "bugünün açılışı" sorusu sorulamazdı; oysa o meşru bir
 * soru: bu sabah elimde ne vardı.
 */
export function gelecekMi(sinir: Date, an: Date): boolean {
  return sinir.getTime() > gunDegeri(isTakvimGunu(an)).getTime();
}
