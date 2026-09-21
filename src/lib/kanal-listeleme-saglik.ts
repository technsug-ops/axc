import type { KanalListelemeDurumu } from "@/generated/prisma/enums";

/**
 * ============================================================================
 *  KANAL LİSTELEME SAĞLIĞI — SAF HESAP (K224, 21.09.2026)
 * ----------------------------------------------------------------------------
 *  Veritabanına GİTMEZ, ağa çıkmaz. Girdi: defterdeki kanal SKU satırları
 *  (kanalın bildirdiği durum + bizim stoğumuz). Çıktı: kovalar ve toplamlar.
 *
 *  ⛔ NİYE VAR: kanaldaki listeleme durumu 07.09'dan beri deftere yazılıyordu
 *  ama HİÇBİR EKRAN göstermiyordu — ve senkronu çağıran bir şey de yoktu, o
 *  yüzden veri 14 gün bayat kaldı (ölçüldü 21.09.2026). Kaydedilen ≠ görünen.
 *
 *  ⭐ ASIL SORU PARA SORUSU: **bizde stok VAR ama kanalda kapalı** olan
 *  ürünler satılamıyor. Canlıda ölçüldü (21.09.2026, HB): 5 ürün, ₺14.965.
 *  Küçük ama gerçek — ve kendiliğinden tekrar doğar.
 *
 *  ⚠ "ÖLÇÜLMEDİ" İLE "TEMİZ" AYRI SAYILIR. `kanalOlcumAt` boşsa o satır
 *  hakkında HÜKÜM YOKTUR; sıfır kovasına atılmaz, kendi kovasında durur.
 *  _(Anayasa: "boş sonuç ile temiz sonucu ayırt edemeyen denetim, denetim
 *  değildir".)_
 * ============================================================================
 */

/** Ekranın okuduğu tek satır — Prisma satırının sadeleştirilmiş hâli. */
export type ListelemeSatiri = {
  durum: KanalListelemeDurumu;
  /** Kanalın bildirdiği adet. `null` = ölçülmedi (0 DEĞİL). */
  kanalAdet: number | null;
  /** Son karşılaştırma anı. `null` = hiç ölçülmedi. */
  olcumAt: Date | null;
  /** Bizim ledger stoğumuz. */
  stok: number;
  /** Kanaldaki birim fiyat; kapalı duran cironun hesabı için. */
  fiyat: number | null;
};

/**
 * Bir satır "kapalı duran para" mı?
 *
 * ⛔ ÖLÇÜT İKİ ŞARTI BİRDEN İSTER: bizde stok VAR **ve** kanalda satışa
 * kapalı. Yalnız birine bakan bir ölçüt yanlış kova üretir — stoğu olmayan
 * kapalı listing normaldir (satılacak mal yok), stoğu olan AÇIK listing de.
 *
 * ⚠ ÖLÇÜLMEMİŞ SATIR BU KOVAYA GİRMEZ: `BILINMIYOR` bir durum değil, bir
 * bilgisizliktir. Onu "kapalı" saymak, bakmadığımız şey hakkında iddia
 * kurmak olurdu.
 */
export function kapaliDuranMi(s: ListelemeSatiri): boolean {
  if (s.olcumAt === null) return false;
  if (s.durum === "BILINMIYOR") return false;
  return s.stok > 0 && s.durum !== "ACIK";
}

export type SaglikOzeti = {
  toplam: number;
  acik: number;
  stoksuz: number;
  pasif: number;
  listelenmemis: number;
  /** Hakkında hüküm kurulamayan satırlar — "temiz" DEĞİL. */
  olculmemis: number;
  /** Bizde stok var, kanalda kapalı. */
  kapaliDuran: number;
  /** O kovanın parası: Σ (stok × son satış fiyatı). ⚠ ALT SINIRDIR. */
  kapaliDuranTutar: number;
  /**
   * Kapalı duran ama FİYATI BİLİNMEYEN satır sayısı — tutara GİRMEZ.
   *
   * ⛔ EKRANDA YAZAR. Yazmasaydı `kapaliDuranTutar` tam bir rakam sanılırdı;
   * oysa hiç satılmamış bir varyantın fiyatı yok ve o mal da satılamıyor.
   * Toplamın KAPSAMI görünmezse, doğru bir sayı yanlış bir hüküm üretir.
   * _(Anayasa: "boş sonuç ile temiz sonucu ayırt edemeyen denetim, denetim
   * değildir" — burada toplamın eksik kalan parçası.)_
   */
  kapaliDuranFiyatsiz: number;
  /** En eski ve en yeni ölçüm anı — bayatlık ekranda yazar. */
  enEskiOlcum: Date | null;
  enYeniOlcum: Date | null;
};

/**
 * Kovaları ve toplamları tek geçişte üretir.
 *
 * ⚠ TOPLAM VERİLEN LİSTENİN TOPLAMIDIR — süzgeçten geçmiş liste verilirse
 * süzgecin toplamı çıkar (İlke #15). Gövde "hepsi" diye ayrı bir sorgu
 * yapmaz; ne verilirse onu sayar.
 */
export function saglikOzeti(satirlar: readonly ListelemeSatiri[]): SaglikOzeti {
  const o: SaglikOzeti = {
    toplam: satirlar.length,
    acik: 0,
    stoksuz: 0,
    pasif: 0,
    listelenmemis: 0,
    olculmemis: 0,
    kapaliDuran: 0,
    kapaliDuranTutar: 0,
    kapaliDuranFiyatsiz: 0,
    enEskiOlcum: null,
    enYeniOlcum: null,
  };

  for (const s of satirlar) {
    if (s.olcumAt === null) {
      o.olculmemis++;
    } else {
      if (o.enEskiOlcum === null || s.olcumAt < o.enEskiOlcum) o.enEskiOlcum = s.olcumAt;
      if (o.enYeniOlcum === null || s.olcumAt > o.enYeniOlcum) o.enYeniOlcum = s.olcumAt;
    }

    if (s.durum === "ACIK") o.acik++;
    else if (s.durum === "STOKSUZ") o.stoksuz++;
    else if (s.durum === "PASIF" || s.durum === "ONAY_BEKLIYOR") o.pasif++;
    else if (s.durum === "YOK") o.listelenmemis++;

    if (kapaliDuranMi(s)) {
      o.kapaliDuran++;
      /**
       * ⚠ FİYAT YOKSA TUTAR EKLENMEZ, SATIR YİNE SAYILIR. Uydurma bir fiyatla
       * çarpmak, olmayan bir parayı ekrana yazmak olurdu; sayıyı düşürmek de
       * gerçek bir açığı gizlerdi. İkisi AYRI: adet tam, tutar alt sınır.
       */
      if (s.fiyat === null) o.kapaliDuranFiyatsiz++;
      else o.kapaliDuranTutar += s.stok * s.fiyat;
    }
  }

  return o;
}

/**
 * Ölçümün YAŞI gün cinsinden — `null` ise hiç ölçülmemiş.
 *
 * ⛔ EKRANDA YAZAR. Şemanın kendi notu bunu şart koşuyor: _"ölçümün YAŞI
 * yazılmazsa bayat bir rakam taze sanılır."_ 21.09'da tam bu yaşandı: veri
 * 14 gün bayattı ve hiçbir yerde görünmüyordu.
 */
export function olcumYasiGun(olcumAt: Date | null, simdi: Date): number | null {
  if (olcumAt === null) return null;
  const fark = simdi.getTime() - olcumAt.getTime();
  return Math.max(0, Math.floor(fark / 86_400_000));
}

/**
 * Ölçüm bayat mı — eşik GEREKÇELİ.
 *
 * ⚠ EŞİK UYDURULMADI, İŞİN RİTMİNDEN GELİYOR: listeleme durumu stok ve fiyat
 * hareketiyle değişir; operasyon günlük çalışıyor (~30 paket/gün). İki günden
 * eski bir ölçüm, iki günlük satış/alım hareketini görmemiş demektir.
 * Senkron zamanlanınca (bugün zamanlanmış DEĞİL) bu eşik yeniden ölçülür.
 */
export const BAYAT_ESIGI_GUN = 2;

export function bayatMi(olcumAt: Date | null, simdi: Date): boolean {
  const yas = olcumYasiGun(olcumAt, simdi);
  return yas === null || yas >= BAYAT_ESIGI_GUN;
}
