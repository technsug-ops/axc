/**
 * ============================================================================
 *  OKUNAN BARKOD BİÇİMLERİ — SAF LİSTE (K111, 31.08.2026)
 * ----------------------------------------------------------------------------
 *  ⭐ NİYE AYRI DOSYA: bu listeyi sınayan bekçi onu ÇAĞIRARAK ölçsün, kaynak
 *  TARAYARAK değil. `barkod-okuyucu.tsx` modül düzeyinde `prepareZXingModule`
 *  çalıştırıyor ve wasm yolu ayarlıyor; bekçi onu içeri alsaydı tarayıcıya
 *  ait bir kurulum node içinde koşardı. Anayasa: _"saf hesap katmanı, desen
 *  tarayan bekçiye muhtaç olmaz"_.
 *
 *  ── ⛔ AYNI YARA İKİ KEZ AÇILDI ────────────────────────────────────────
 *  ① 25.08.2026 — kargo etiketi akışa girdi, liste `EAN13 · EAN8 · Code128 ·
 *    QRCode` idi ve `ITF` yoktu. hepsiJET etiketi okunmadı.
 *  ② 31.08.2026 — kullanıcı bir Mattel kutusu gösterdi: `1 94735 16205 5`,
 *    12 hane, **UPC-A**. `EAN13` açık olması yetmiyor — zxing kataloğunda
 *    `UPCA` ile `EAN13` KARDEŞ biçimler (ortak ata `EANUPC`), biri ötekini
 *    kapsamaz.
 *
 *  Ölçüldü (canlı, 1104 varyant): 12 haneli barkod **104** (101'i geçerli
 *  kontrol hanesiyle) — kataloğun **%9,2'si** kamerayla okunamıyordu.
 *
 *  ⚠ İKİSİNDE DE HATA "LİSTE KISAYDI" DEĞİL, **LİSTENİN ELLE TUTULMASIYDI.**
 *  Bu yüzden ölçüt tersine çevrildi: `perakendeBoslugu` kütüphanenin KENDİ
 *  perakende kataloğunu alır ve beyansız eksik bırakmayı yasaklar.
 * ============================================================================
 */

/** Ürün etiketlerinde görülen biçimler. */
export const URUN_FORMATLARI = [
  "EAN13",
  "EAN8",
  "UPCA",
  "UPCE",
  "Code128",
  "QRCode",
] as const;

/** Kargo/lojistik etiketlerinde yaygın olanlar. */
export const KARGO_FORMATLARI = [
  "ITF",
  "Code39",
  "Code93",
  "DataMatrix",
  "PDF417",
] as const;

/**
 * ⚠ OKUYUCU HER ZAMAN BİRLEŞİK LİSTEYLE TARAR. Ürün/kargo ayrımı BELGELEME
 * amaçlıdır, davranış değil — `readBarcodes` çağrısı tek liste alıyor.
 * Ayrımın davranışa dönüştüğü sanılırsa "ürün ekranında kargo biçimi kapalı"
 * gibi olmayan bir güvence varsayılır.
 */
export const DESTEKLENEN_FORMATLAR = [
  ...URUN_FORMATLARI,
  ...KARGO_FORMATLARI,
] as const;

/**
 * PERAKENDE AİLESİNDEN BİLEREK DIŞARIDA BIRAKILANLAR — GEREKÇESİYLE.
 *
 * ⚠ BU BİR SÜS DEĞİL, BEKÇİNİN ÖLÇÜTÜ. Beyansız eksik KIRMIZI yanar; yani
 * kütüphane yarın yeni bir perakende biçimi eklerse bekçi onu kendiliğinden
 * sorar ve kimsenin listeyi hatırlaması gerekmez.
 *
 * ⛔ GEREKÇESİZ İSTİSNA VERİLMEZ — muafiyet bedava olmaz.
 */
export const URUN_DISI_PERAKENDE: Record<string, string> = {
  EANUPC: "meta-biçim; EAN2/EAN5'i de içeri alır (aşağıdaki gerekçe)",
  EAN2: "iki haneli EK KOD — tek başına okunursa '12' gibi çöp değer döner",
  EAN5: "beş haneli EK KOD (fiyat eki) — aynı sebep",
  ISBN: "EAN-13 olarak zaten çözülüyor (978/979 öneki); ayrı biçim gereksiz",
  DataBar: "GS1 DataBar — kataloğumuzda ölçüldü, örneği yok",
  DataBarOmni: "DataBar varyantı — aynı gerekçe",
  DataBarStk: "DataBar varyantı — aynı gerekçe",
  DataBarStkOmni: "DataBar varyantı — aynı gerekçe",
  DataBarLtd: "DataBar varyantı — aynı gerekçe",
  DataBarExp: "DataBar varyantı — aynı gerekçe",
  DataBarExpStk: "DataBar varyantı — aynı gerekçe",
};

/**
 * Kütüphanenin perakende kataloğunda olup bizde NE AÇIK NE DE BEYAN EDİLMİŞ
 * biçimler. Boş dönmesi gerekir; dönmüyorsa ya biçim açılacak ya gerekçesi
 * yazılacak.
 *
 * ⭐ SAF: katalog DIŞARIDAN verilir. Gövde `zxing-wasm`i içeri almaz —
 * bekçi kütüphaneden okur, buraya parametre olarak geçer. Böylece bu dosya
 * hem tarayıcıda hem node'da bedelsiz kalır.
 *
 * ⚠ VE GEREKÇESİ BOŞ OLAN BEYAN, BEYAN SAYILMAZ: `"  "` yazarak muafiyet
 * alınamaz.
 */
export function perakendeBoslugu(katalog: readonly string[]): string[] {
  const acik = new Set<string>(URUN_FORMATLARI);
  return katalog.filter((biçim) => {
    if (acik.has(biçim)) return false;
    const gerekce = URUN_DISI_PERAKENDE[biçim];
    return gerekce === undefined || gerekce.trim() === "";
  });
}

/**
 * ============================================================================
 *  TARAMA MALİYETİ — HIZLI KARE / ZOR KARE (K123, 01.09.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ NİYE DOĞDU: kullanıcı bir Trendyol kargo etiketi gösterip _"bu
 *  barkodları okumakta hâlâ zorluk çekiyor"_ dedi. İlk şüpheli BİÇİM
 *  LİSTESİYDİ (iki kez oradan yandık: 25.08 `ITF`, 31.08 `UPCA`) — ama bu
 *  sefer liste suçsuz çıktı: `7260036664117470` 16 haneli ve `Code128`/`ITF`
 *  ikisi de listede.
 *
 *  ── 📏 ÖLÇÜLDÜ: SORUN BİÇİM DEĞİL, HIZ ──────────────────────────────
 *  Çözücü maliyeti (1920×1080, koyu dokulu zemin — kullanıcının fotoğrafı
 *  gibi), masaüstü CPU:
 *
 *      KOD BULUNMAYAN kare (nişan alırken her kare böyle)
 *        bugünkü ayar (tryHarder açık)     668 ms
 *        tryHarder kapalı                  146 ms      4,6×
 *
 *  Döngü 250 ms'de bir tetikleniyor ama önceki kare bitmeden yenisi
 *  başlamıyor. Yani sistem barkoda **saniyede ~1,5 kez** bakıyordu — ve
 *  telefon CPU'su masaüstünden kat kat yavaş.
 *
 *  ── ⛔ VE `tryHarder` HİÇBİR ŞEY KAZANDIRMADI — YÖN ÖLÇÜLDÜ ─────────
 *  Gerçek barkod üretilip (zxing writer) koyu dokulu zemine çizildi ve
 *  **20 senaryoda** iki ayar karşılaştırıldı: net · hafif bulanık · ağır
 *  bulanık · DÖNÜK (dikey) · dönük+bulanık · TERS · küçük (2 px/modül) ·
 *  çok küçük (1,2 px/modül) · Code128 · ITF.
 *
 *      20 senaryonun 20'sinde SONUÇ AYNI (okudu/okumadı)
 *      süre farkı 3×–14×  (en kötü: 1848 ms → 118 ms)
 *
 *  ⭐ SEBEBİ ŞU: `tryRotate` · `tryInvert` · `tryDownscale` zxing'de AYRI
 *  bayraklar ve varsayılanları ZATEN AÇIK. `tryHarder` yalnız 1B satır
 *  taramasını daha saldırgan yapıyor; dönük/ters/küçük kareleri kurtaran o
 *  değil, öteki üçü.
 *
 *  ── ⚠ AMA ÖLÇÜM SENTETİK — O YÜZDEN ZOR KARE KALDI ──────────────────
 *  20 senaryo gerçek kamera değil. `tryHarder` bugünkü davranışın parçası;
 *  tamamen kaldırmak, ölçmediğim bir durumda sessizce yetenek kaybettirir.
 *  Bu yüzden **ard arda 8 kare okuyamazsa BİR kare zor ayarla** taranıyor:
 *  emniyet duruyor, bedeli ~2 saniyede bir yavaş kare.
 *  _(Anayasa: "bir sınırın yönü ölçülmeden çevrilmez".)_
 *
 *  ⛔ ÇÖZÜNÜRLÜK DÜŞÜRÜLMEDİ — ölçüldü ve REDDEDİLDİ: 960×540 kareler 3,4×
 *  hızlı ama modül başına piksel yarıya iner ve ölçümde **1,2 px/modül
 *  okunmuyor**. Hızı oradan almak, okunabilirliği harcamak olurdu.
 * ============================================================================
 */

/** Ard arda kaç başarısız kareden sonra bir kere zor tarama yapılır. */
export const ZOR_TARAMA_ARALIGI = 8;

/**
 * Bu kare zor ayarla mı taranmalı?
 *
 * ⚠ SAF: sayaçtan başka girdisi yok, bekçi ÇAĞIRARAK ölçüyor.
 * ⛔ İLK KARE ZOR OLMAZ (`> 0` şartı): kamera açılır açılmaz en pahalı
 * taramayı koşmak, tam kullanıcının nişan aldığı anı yavaşlatırdı.
 */
export function zorKareMi(ardArdaBasarisiz: number): boolean {
  return ardArdaBasarisiz > 0 && ardArdaBasarisiz % ZOR_TARAMA_ARALIGI === 0;
}

/**
 * Çözücü seçenekleri.
 *
 * ⛔ `tryRotate` · `tryInvert` · `tryDownscale` HER İKİ KİPTE DE AÇIK ve
 * AÇIKÇA yazılıyor. Varsayılanları bugün açık ama bir sürüm onları
 * kapatırsa dönük etiket sessizce okunmaz olurdu — ve bunu kimse fark
 * etmezdi. _(Anayasa: kütüphanenin varsayılanı bizim güvencemiz değildir.)_
 *
 * ⛔ BİÇİM LİSTESİ DARALTILMADI. Ölçümde matris biçimleri (DataMatrix ·
 * PDF417) pahalı çıktı ama pahalı olan `tryHarder` ile birlikteydi:
 * 11 biçim + tryHarder 668 ms, 11 biçim + hızlı 146 ms. Liste kısaltmak
 * hiçbir şey kazandırmaz, kapsam kaybettirirdi.
 */
export function tarayiciSecenekleri(zor: boolean) {
  return {
    formats: [...DESTEKLENEN_FORMATLAR],
    tryHarder: zor,
    tryRotate: true,
    tryInvert: true,
    tryDownscale: true,
    /**
     * ⚠ TEK SEMBOL ARAMA KALDIRILDI (25.08). Kargo etiketinde birden çok kod
     * var; `1` ile okuyucu hangisini bulursa onu döndürüyordu ve QR çoğu
     * etiketde takip numarası DEĞİL.
     * ⚠ Ölçüldü: `4` ile `1` arasında süre farkı yok (668 ↔ 610 ms) — yani
     * bu ayar hızın sebebi değil, dokunulmadı.
     */
    maxNumberOfSymbols: 4,
  };
}
