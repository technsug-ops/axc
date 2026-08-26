/**
 * ============================================================================
 *  TEDARİKÇİ ADI — TEK ÇÖZÜM KURALI
 * ----------------------------------------------------------------------------
 *  ⚠ NEDEN YAZILDI (17.08.2026, canlı hata)
 *
 *  `Purchase` tedarikçiyi İKİ ALANDA taşır:
 *    · `supplierId` → `supplier` ilişkisi (10.08.2026'da kayda bağlandı)
 *    · `supplierName` serbest metin (o tarihten ÖNCEKİ kayıtlar ve içe
 *      aktarma izi — bilinçli olarak silinmedi)
 *
 *  Alım detay ekranı ikisini de okuyordu; ürün kârlılık kartı yalnız
 *  ilişkiyi okudu. Sonuç: ALM-TR-260814-01 alımında tedarikçi "Trendyol"
 *  alım ekranında GÖRÜNÜYOR, kartta GÖRÜNMÜYORDU. Aynı veri, iki ekran,
 *  iki farklı cevap — kartın güvenini bitiren şey tam olarak budur.
 *
 *  Kural artık burada. Yeni bir ekran tedarikçi göstereceği zaman bu
 *  fonksiyonu çağırır; iki alanın varlığını bilmesi gerekmez.
 *
 *  ── SIRA ÖNEMLİ: İLİŞKİ ÖNCE, SERBEST METİN YEDEK ───────────────────────
 *  İlişki kayıtlı tedarikçiyi gösterir ve adı düzeltilebilir; serbest metin
 *  yazıldığı gün donmuştur. İkisi çelişirse güncel olan kazanır.
 * ============================================================================
 */

export type TedarikciTasiyan = {
  supplier: { name: string } | null;
  supplierName: string | null;
};

/**
 * Alımın tedarikçi adı. Hiçbiri yoksa `null` — çağıran taraf "kayıtsız"
 * yazar; boş string döndürmek sessiz boşluk üretirdi.
 */
export function tedarikciAdi(alim: TedarikciTasiyan): string | null {
  const ad = alim.supplier?.name ?? alim.supplierName ?? null;
  // Yalnız boşluktan oluşan eski kayıtlar "dolu" sayılmasın.
  return ad === null || ad.trim() === "" ? null : ad;
}

/**
 * ============================================================================
 *  TEDARİKÇİ EŞLEŞTİRME ANAHTARI — TÜRKÇE-GÜVENLİ, HARF DUYARSIZ
 * ----------------------------------------------------------------------------
 *  ⚠ NİYE `toLocaleLowerCase("tr")` TEK BAŞINA YETMEZ — I/ı/İ/i TUZAĞI:
 *
 *      "BIM".toLocaleLowerCase("tr")  →  "bım"      (noktasız ı)
 *      "BİM".toLocaleLowerCase("tr")  →  "bim"      (noktalı i)
 *
 *  İkisi AYRI dize. Türkçe sıralama için bu DOĞRUDUR ve `anahtarla()`
 *  onu bilerek korur. Ama biz burada iki AYRI KAYNAĞI eşleştiriyoruz —
 *  Excel'e "BIM" yazan biriyle deftere "BİM" yazan biri aynı tedarikçiyi
 *  kastediyor. Türkçe küçük harf onları AYIRIR ve eşleşme sessizce
 *  sıfır döner.
 *
 *  ⚠ SEÇİLEN YÖNTEM — KATLAMA (folding), küçük harfe çevirme DEĞİL:
 *  noktalı/noktasız çifti TEK harfe indirgenir, öteki Türkçe harfler de
 *  taban karşılığına düşer, sonra harf-dışı her şey atılır.
 *
 *      "Hepsi Burada" · "HEPSİBURADA" · "hepsiburada"  →  "hepsiburada"
 *      "BIM" · "BİM" · "Bim"                            →  "bim"
 *
 *  ⛔ BU ANAHTAR GÖSTERİM İÇİN KULLANILMAZ — yalnız EŞLEŞTİRME içindir.
 *  Ekrana basılan ad her zaman `tedarikciAdi()`den gelir; katlanmış
 *  hâlini göstermek adı bozmak olurdu.
 * ============================================================================
 */
/**
 * ⚠ LİSTEDE YALNIZ TÜRKÇEYE ÖZGÜ HARFLER VAR — ve bu bir MUTASYON
 * BULGUSUNUN sonucu. İlk yazımda ASCII `I` ve `i` de listedeydi;
 * ikisini de kaldıran mutasyon YEŞİL geçti, çünkü `.toLowerCase()`
 * onları zaten dönüştürüyor. Gereksiz girişi listede tutmak, korunduğu
 * sanılan ama hiçbir şeyin sınamadığı bir satır bırakırdı.
 *
 * ⛔ ASIL TUZAK NOKTASIZ `ı`: katlanmazsa `.toLowerCase()` onu "ı" olarak
 * bırakır, `[^a-z0-9]` süzgeci de SİLER — harf tamamen kaybolur.
 *     "Kırtasiye" → "krtasiye"   ·   "KIRTASIYE" → "kirtasiye"
 * İki kaynak aynı tedarikçiyi yazar, anahtar tutmaz. Bu satır MUTASYONLA
 * sınandı ve kaldırılınca kırmızı yanıyor.
 *
 * ⚠ DÜRÜSTLÜK NOTU — `İ` SATIRI MUTASYONLA SINANMIYOR VE BU YAZILIYOR.
 * Onu kaldıran mutasyon YEŞİL geçiyor, çünkü `"İ".toLowerCase()` iki
 * kod noktası üretiyor (`i` + birleşen nokta U+0307) ve süzgeç noktayı
 * zaten atıyor — sonuç tesadüfen aynı. Satır yine de duruyor: ölçüt
 * `[^a-z0-9]` bir gün gevşetilirse `İ` sessizce bozulurdu ve o gün bunu
 * yakalayacak bir şey olmazdı. Yani KORUMA amaçlı bilinçli bir fazlalık —
 * "sınandı" diye sayılmaz. _(Anayasa: yeşil test, sınanmış kontrol
 * demek değildir; sınanamayanı sınanmış GİBİ göstermek daha kötüdür.)_
 */
const TURKCE_KATLAMA: Record<string, string> = {
  İ: "i", ı: "i",
  Ş: "s", ş: "s",
  Ğ: "g", ğ: "g",
  Ü: "u", ü: "u",
  Ö: "o", ö: "o",
  Ç: "c", ç: "c",
};

export function tedarikciAnahtari(ad: string): string {
  return [...ad]
    .map((h) => TURKCE_KATLAMA[h] ?? h)
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}
