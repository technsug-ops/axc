import { isTakvimGunu } from "@/lib/donem";

/**
 * ============================================================================
 *  KİMLİK STANDARDI — KODLAR NASIL DOĞAR
 * ----------------------------------------------------------------------------
 *  Neden var: kimlikler keyfîliğe bırakılınca "ewe", "wew", "25-23" gibi
 *  kayıtlar oluşuyor ve üç ay sonra "ewe neydi?" sorusunun cevabı kalmıyor.
 *
 *  İKİ BİÇİM:
 *    SKU       OYU-LG-260707-01   kategori · ürün/marka · gün · sıra
 *    Alım no   ALM-ER-260810-01   sabit önek · tedarikçi · gün · sıra
 *
 *  ÜÇ DEĞİŞMEZ KURAL:
 *
 *  1. KOD İPUCUDUR, GERÇEK DEĞİLDİR. Koddaki kategori harfleri ürün sonradan
 *     başka kategoriye taşınsa da değişmez. Gerçek her zaman veritabanındadır;
 *     kod yalan söyleyebilir, sistem söyleyemez.
 *
 *  2. TARİH = ÜRÜNÜN SİSTEME İLK GİRİŞ GÜNÜ, alım günü değil. Aynı ürünü
 *     kasımda tekrar aldığınızda SKU değişmez — SKU ürünün kimliğidir,
 *     partinin değil. Partileri zaten FIFO ayrı tutuyor.
 *
 *  3. DOĞDUKTAN SONRA DEĞİŞMEZ. Kod etikete basılıp ürüne yapıştırılıyor;
 *     hareket görmüş kaydın kodunu değiştirmek depodaki etiketi yalancı yapar.
 *     Kilidin kendisi uygulama katmanındadır (bu modül saf hesap yapar).
 *
 *  SAAT DİLİMİ: gün kodu İŞ saat diliminden (Europe/Istanbul) okunur.
 *  Almanya'da 9 Temmuz 23:30 iken Türkiye'de 10 Temmuz'dur ve kod 260710
 *  olmalıdır. Bu modül "şu an"ı kendi okumaz; an DIŞARIDAN verilir, böylece
 *  gece yarısı davranışı gerçek takvimi beklemeden sınanabilir.
 * ============================================================================
 */

/** Kod parçalarının ayracı. Tireli biçim kararı: etikette gözle okunabilirlik. */
const AYRAC = "-";

/** Alım numarasının sabit öneki. */
export const ALIM_ONEKI = "ALM";

const TURKCE_HARFLER: Record<string, string> = {
  ç: "C", Ç: "C",
  ğ: "G", Ğ: "G",
  ı: "I", I: "I", İ: "I", i: "I",
  ö: "O", Ö: "O",
  ş: "S", Ş: "S",
  ü: "U", Ü: "U",
};

const SESLILER = new Set(["A", "E", "I", "O", "U"]);

/**
 * Metni A-Z aralığına indirger: Türkçe harfler karşılıklarına, aksanlar
 * çıkarılır, harf olmayan her şey atılır.
 *
 * Türkçe harfler ELLE eşlenir. Otomatik çözümleme (NFD) çoğunu doğru yapar
 * ama "ı" ve "İ" özeldir: JavaScript'in varsayılan büyütmesi Türkçe kuralı
 * bilmez. Eşlemeyi açıkça yazmak, sonucun neye bağlı olduğunu belli eder.
 */
export function harfleriKatla(metin: string): string {
  let sonuc = "";
  for (const harf of metin) {
    const karsilik = TURKCE_HARFLER[harf];
    sonuc += karsilik ?? harf;
  }
  return sonuc
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // birleşen aksan işaretleri
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
}

/**
 * Baştan N harf. Kategori kodu böyle üretilir: Oyuncak → OYU, Genel → GEN.
 *
 * Kısa adlarda (ör. "TV") elde ne varsa o döner — uydurma harf eklenmez.
 * Hiç harf yoksa null: kod önerilemez, ekran kullanıcıya sorar.
 */
export function bastanKisalt(ad: string, uzunluk: number): string | null {
  const harfler = harfleriKatla(ad);
  if (harfler.length === 0) return null;
  return harfler.slice(0, uzunluk);
}

/** Kategori kodu: 3 harf. Oyuncak → OYU · Elektronik → ELE · Genel → GEN */
export function kategoriKoduOner(ad: string): string | null {
  return bastanKisalt(ad, 3);
}

/** Tedarikçi kodu: 2 harf. Erdem → ER · Trendyol → TR */
export function tedarikciKoduOner(ad: string): string | null {
  return bastanKisalt(ad, 2);
}

/**
 * Ürün/marka kısaltması: ilk harf + sessizler. LEGO → LG · Karaca → KR
 *
 * Neden baştan kesmiyoruz: LEGO baştan kesilse "LE" olurdu; "LG" markayı
 * daha iyi çağrıştırır. Sessiz harfler kelimeyi ayırt eden harflerdir.
 *
 * Marka varsa markadan üretilir (aynı markanın ürünleri yan yana sıralanır).
 * Marka yoksa ve ad çok kelimeliyse kelimelerin baş harfleri kullanılır:
 * "Kablosuz Kulaklık" → KK.
 */
export function urunKisaltmasi(
  ad: string,
  marka: string | null | undefined,
  uzunluk = 2,
): string | null {
  const kaynak = (marka ?? "").trim() !== "" ? marka!.trim() : ad;

  // Marka yok + çok kelimeli ad → baş harfler
  if ((marka ?? "").trim() === "") {
    const kelimeler = ad
      .trim()
      .split(/\s+/)
      .map((k) => harfleriKatla(k))
      .filter((k) => k.length > 0);
    if (kelimeler.length >= 2) {
      return kelimeler
        .slice(0, uzunluk)
        .map((k) => k[0])
        .join("");
    }
  }

  const harfler = harfleriKatla(kaynak);
  if (harfler.length === 0) return null;

  // İlk harf her zaman kalır; kalanlardan önce sessizler seçilir.
  const secilen = [harfler[0]];
  for (const harf of harfler.slice(1)) {
    if (secilen.length >= uzunluk) break;
    if (!SESLILER.has(harf)) secilen.push(harf);
  }
  // Yeterli sessiz yoksa (ör. "AEO") sıradaki harflerle tamamla.
  for (const harf of harfler.slice(1)) {
    if (secilen.length >= uzunluk) break;
    if (!secilen.includes(harf)) secilen.push(harf);
  }

  return secilen.join("");
}

/**
 * Gün kodu: YYAAGG, İŞ saat diliminde. 7 Temmuz 2026 → 260707
 *
 * @param an "Şu an" ya da ürünün sisteme ilk giriş anı. Dışarıdan verilir.
 */
export function gunKodu(an: Date): string {
  const { yil, ay, gun } = isTakvimGunu(an);
  const ik = (sayi: number) => String(sayi).padStart(2, "0");
  return `${ik(yil % 100)}${ik(ay)}${ik(gun)}`;
}

/**
 * Sıra kodu: en az iki basamak. 1 → 01 · 99 → 99 · 100 → 100
 * Aynı gün aynı ön ekten 99'dan fazla kayıt açılırsa kod uzar; kısalmaz.
 */
export function siraKodu(sira: number): string {
  return String(sira).padStart(2, "0");
}

/**
 * Verilen ön ekle başlayan mevcut kodlara bakıp SIRADAKİ sırayı bulur.
 *
 * Saf fonksiyon: sorguyu çağıran yapar, buraya sonucu verir. En büyük
 * sıra + 1 döner — silinen bir numara yeniden kullanılmaz, çünkü kod
 * bir kez basılıp etikete gitmiş olabilir.
 */
export function sonrakiSira(mevcutKodlar: string[], onEk: string): number {
  let enBuyuk = 0;
  const desen = new RegExp(`^${onEk.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\d+)$`);

  for (const kod of mevcutKodlar) {
    const eslesme = desen.exec(kod.trim());
    if (!eslesme) continue;
    const sayi = Number(eslesme[1]);
    if (Number.isFinite(sayi) && sayi > enBuyuk) enBuyuk = sayi;
  }

  return enBuyuk + 1;
}

// ---------------------------------------------------------------------------
//  BİRLEŞTİRİCİLER
// ---------------------------------------------------------------------------

/** SKU'nun sıra hariç kısmı — "sonrakiSira" bu ön ekle sorgulanır. */
export function skuOnEki(parcalar: {
  kategoriKodu: string;
  kisaltma: string;
  gun: string;
}): string {
  return [parcalar.kategoriKodu, parcalar.kisaltma, parcalar.gun].join(AYRAC) + AYRAC;
}

/** OYU-LG-260707-01 */
export function skuUret(parcalar: {
  kategoriKodu: string;
  kisaltma: string;
  gun: string;
  sira: number;
}): string {
  return skuOnEki(parcalar) + siraKodu(parcalar.sira);
}

/** Alım numarasının sıra hariç kısmı. */
export function alimNoOnEki(parcalar: {
  tedarikciKodu: string;
  gun: string;
}): string {
  return [ALIM_ONEKI, parcalar.tedarikciKodu, parcalar.gun].join(AYRAC) + AYRAC;
}

/** ALM-ER-260810-01 */
export function alimNoUret(parcalar: {
  tedarikciKodu: string;
  gun: string;
  sira: number;
}): string {
  return alimNoOnEki(parcalar) + siraKodu(parcalar.sira);
}

// ---------------------------------------------------------------------------
//  RAF KODU
// ---------------------------------------------------------------------------

/**
 * Bölge-Raf-Göz: A-01-3 (A bölgesi, 1. raf, 3. göz). Göz isteğe bağlıdır;
 * küçük depoda bölge+raf yeter, göz sonradan eklenebilir.
 *
 * Neden desen zorunlu: bugün "a-01" ve "a02" diye İKİ ayrı raf kaydı var ve
 * ikisinin de adı "kapi yani" — yani aynı raf iki kere yazılmış. Serbest
 * metin bunu engelleyemez.
 */
export const RAF_DESENI = /^[A-Z]-\d{2}(-\d)?$/;

export function rafKoduGecerliMi(kod: string): boolean {
  return RAF_DESENI.test(kod.trim());
}

/**
 * Serbest yazılmış rafı standarda çevirmeye ÇALIŞIR — "a02" → "A-02".
 * Çeviremezse null döner; sessizce uydurmaz.
 *
 * Kullanıcının yazdığını KENDİLİĞİNDEN değiştirmez: dönen değer ekranda
 * "şunu mu demek istediniz?" önerisi olarak gösterilir, onay kullanıcınındır.
 */
export function rafKoduDuzelt(ham: string): string | null {
  const harfler = harfleriKatla(ham);
  const rakamlar = ham.replace(/\D/g, "");

  // Tek bölge harfi + 2 ya da 3 rakam bekleniyor: A + 01 (+ göz)
  if (harfler.length !== 1) return null;
  if (rakamlar.length !== 2 && rakamlar.length !== 3) return null;

  const bolge = harfler;
  const raf = rakamlar.slice(0, 2);
  const goz = rakamlar.slice(2);

  const kod = goz ? `${bolge}${AYRAC}${raf}${AYRAC}${goz}` : `${bolge}${AYRAC}${raf}`;
  return rafKoduGecerliMi(kod) ? kod : null;
}
