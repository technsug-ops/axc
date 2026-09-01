import { kodSablonaUyuyorMu } from "@/lib/depo/sablon";
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
 * ============================================================================
 *  MODEL AYIRT EDİCİ — ürün adından
 * ----------------------------------------------------------------------------
 *  NEDEN VAR (kullanıcı 1054 ürünlük gerçek katalogda yakaladı, 12.08.2026):
 *  Kod biçimi {kategori}-{marka}-{gün}-{sıra} idi ve MODELİ AYIRT ETMİYORDU.
 *  Aynı markanın onlarca ürünü aynı gün girilince hepsi aynı ön eki
 *  paylaşıyordu; kod yalnızca sıra numarasıyla ayrılıyordu ve kullanıcı
 *  koda bakıp hangi ürün olduğunu anlayamıyordu.
 *
 *  KURAL: adın İLK RAKAM İÇEREN belirteci model numarasıdır.
 *    "MG5942/15 13 ü 1 Arada Erkek Bakım Seti"  -> MG594
 *    "S5588/38 Islak Kuru Tıraş Makinesi"       -> S5588
 *    "OneBlade Pro QP6650"                      -> QP665
 *
 *  Rakamlı belirteç yoksa ilk iki anlamlı kelimenin baş harfleri:
 *    "OneBlade Pro" -> OB
 *
 *  Türkçe harfler `harfleriKatla` ile katlanır ama RAKAMLAR KORUNUR —
 *  model numarasının değeri zaten rakamlarındadır.
 * ============================================================================
 */

/** Model parçasının en fazla uzunluğu. */
const MODEL_UZUNLUGU = 5;

/**
 * Belirteci koda uygun hâle getirir: Türkçe harf katlaması + yalnız A-Z0-9.
 * `harfleriKatla` rakamları atıyor, bu yüzden ayrı bir katlama gerekiyor.
 */
function belirteciKatla(metin: string): string {
  let sonuc = "";
  for (const harf of metin) sonuc += TURKCE_HARFLER[harf] ?? harf;
  return sonuc
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // birleşen aksan işaretleri
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

/**
 * Ürün adından model ayırt edicisi. Üretilemezse null.
 *
 * @param uzunluk En fazla kaç karakter (varsayılan 5).
 */
export function modelAyirtEdici(
  ad: string,
  uzunluk = MODEL_UZUNLUGU,
): string | null {
  const belirtecler = ad.trim().split(/\s+/).filter((b) => b.length > 0);
  if (belirtecler.length === 0) return null;

  // 1) İlk RAKAM İÇEREN belirteç — model numarası budur.
  for (const ham of belirtecler) {
    if (!/\d/.test(ham)) continue;
    const katlanmis = belirteciKatla(ham);
    // Yalnız rakamdan oluşan belirteç model değildir: "13 ü 1 Arada"daki
    // "13" gibi sayılar ada aittir, ürünü tanımlamaz.
    if (katlanmis.length === 0 || !/[A-Z]/.test(katlanmis)) continue;
    return katlanmis.slice(0, uzunluk);
  }

  // 2) Rakamlı belirteç yok → ilk iki anlamlı kelimenin baş harfleri.
  const harfliler = belirtecler
    .map((b) => belirteciKatla(b))
    .filter((b) => b.length > 0);
  if (harfliler.length === 0) return null;
  if (harfliler.length === 1) return harfliler[0].slice(0, uzunluk);

  return harfliler
    .slice(0, 2)
    .map((k) => k[0])
    .join("");
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

/**
 * SKU'nun sıra hariç kısmı — "sonrakiSira" bu ön ekle sorgulanır.
 *
 * ÜÇÜNCÜ PARÇA ARTIK GÜN DEĞİL MODEL (karar 12.08.2026):
 *     eski  KOZ-PH-260812-01   gün · aynı markanın her ürünü aynı
 *     yeni  KOZ-PH-MG594-01    model · ürünü koddan tanıyabilirsiniz
 *
 * Daha önce üretilmiş gün biçimli kodlar DEĞİŞMEZ (kural 3: doğduktan
 * sonra kod değişmez). İki biçim yan yana yaşar; kod zaten yalnız ipucudur.
 */
export function skuOnEki(parcalar: {
  kategoriKodu: string;
  kisaltma: string;
  /** Model ayırt edicisi (bkz. modelAyirtEdici). */
  ayirt: string;
}): string {
  return [parcalar.kategoriKodu, parcalar.kisaltma, parcalar.ayirt].join(AYRAC) + AYRAC;
}

/** KOZ-PH-MG594-01 */
export function skuUret(parcalar: {
  kategoriKodu: string;
  kisaltma: string;
  ayirt: string;
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
 * DEPONUN KENDİ DÜZENİ ESAS ALINIR — bölge harfi + numara: A1, A27, B3, R1.
 * Ayrıca isimlendirilmiş alan: DEPO. İsteğe bağlı göz eki: A5-3.
 *
 * NEDEN BÖYLE, "A-01-3" DEĞİL:
 * 11.08.2026'da canlı veriye bakıldı — depoda 40 raf var ve hepsi zaten
 * tutarlı: A1-A27 (ofis), B3-B6, R1-R8 (depo), DEPO. "A-01" biçimini
 * dayatmak 40 etiketin FİZİKSEL olarak yeniden basılması demekti; hiçbir
 * karşılığı yokken.
 *
 * Önce "a-01 ve a02 aynı rafın iki kaydı" diye örnek verilmişti; o kayıtlar
 * YEREL DEMO veritabanındaydı, gerçek depoda öyle bir karışıklık yok.
 * Kural gerçek veriye bakılarak düzeltildi.
 *
 * Desenin işi standardı değiştirmek değil, SERBEST METNİ engellemek:
 * "kapi yani" gibi bir kod hâlâ reddedilir.
 */
export const RAF_DESENI = /^[A-Z]{1,4}\d{0,3}(-\d{1,2})?$/;

/**
 * ⛔ İKİ BİÇİM DE GEÇERLİ — VE BU BOŞLUK ÖLÇÜLEREK BULUNDU (01.09.2026).
 *
 * `RAF_DESENI` deponun ELDE kurulmuş eski kodlarını tanıyor (`A5` · `DEPO` ·
 * `R9-2`). Raf motoru (K50) ise şablondan üretiyor: `RAF-SLN1-2`. İki desen
 * birbirini TANIMIYORDU ve sonuç ölçüldü:
 *
 *     kodSablonaUyuyorMu("RAF-SLN1-2")  true
 *     rafKoduGecerliMi("RAF-SLN1-2")    false   ⛔
 *
 * Yani `/ayarlar/depo` bir raf üretir üretmez `/ayarlar/konumlar` onu
 * **"biçimsiz"** diye işaretliyor ve düzenleme formu kaydetmeyi REDDEDIYORDU
 * — sadece adını değiştirmek isteyen biri duvara çarpardı. Depo düzeni
 * çizilmeden bulundu; çizilseydi 43 rafın hepsi bir gecede "bozuk" görünürdü.
 *
 * ⚠ ESKİ DESEN KALDIRILMADI: 43 mevcut rafın hepsi ona uyuyor ve göç
 * onaylanana kadar yaşamaya devam edecek. İkisi BİRLİKTE geçerli; serbest
 * metin ("kapi yani") ikisine de uymuyor ve hâlâ reddediliyor.
 * _(Anayasa: "düzeltme yolu, tüm okuyuculara ulaştığı ölçülmeden var
 * sayılmaz" — burada okuyucu başka bir EKRANDI.)_
 */
export function rafKoduGecerliMi(kod: string): boolean {
  const temiz = kod.trim();
  return RAF_DESENI.test(temiz) || kodSablonaUyuyorMu(temiz);
}

/**
 * Yazımı standarda çeker: büyük harfe alır, boşlukları siler — "a5" → "A5".
 *
 * SADECE YAZIM DÜZELTİR, YAPI DEĞİŞTİRMEZ. "A-01"i "A1"e çevirmez: sıfırın
 * anlamlı olup olmadığını bilemez ve yanlış rafa yönlendirmek, hiç
 * düzeltmemekten kötüdür. Çeviremezse null döner, uydurmaz.
 *
 * Dönen değer ekranda "şunu mu demek istediniz?" önerisidir; onay
 * kullanıcınındır.
 */
export function rafKoduDuzelt(ham: string): string | null {
  const temiz = ham
    .trim()
    .replace(/\s+/g, "")
    .toLocaleUpperCase("tr")
    // Türkçe harfler raf kodunda kullanılmaz; katlama ASCII'ye indirir.
    .split("")
    .map((h) => TURKCE_HARFLER[h] ?? h)
    .join("");

  return rafKoduGecerliMi(temiz) ? temiz : null;
}
