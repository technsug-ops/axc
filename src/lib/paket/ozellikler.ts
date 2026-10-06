/**
 * ============================================================================
 *  PAKET ÖZELLİK KATALOĞU (K303 ②, kullanıcı kararı 30.09 + 06.10.2026)
 * ----------------------------------------------------------------------------
 *  ⚠ ANAHTARLAR KODDA, İÇERİK VERİDE (docs/saas-paketleri.md §1). Hangi
 *  özelliğin hangi pakette olduğunu süper admin ekrandan değiştirir; burada
 *  yalnız ÖZELLİĞİN NE OLDUĞU (hangi menü ekranlarını kapsadığı) ve İLK
 *  dağılım durur. İlk dağılım yalnız `paket:baslangic` betiği okur.
 *
 *  ⚠ HER MENÜ EKRANI YA BİR ÖZELLİĞE AİTTİR YA `HEP_ACIK`TADIR — bekçi
 *  (`paket:dogrula`) menü kataloğundan TERSTEN sayar: yarın eklenen bir ekran
 *  ikisine de yazılmazsa kırmızı yanar (anayasa: liste değil, tersten kurulur).
 *
 *  ⚠ KÂR MOTORU ANAHTAR DEĞİL: ekranı yok, satışın parçası. Kapatılabilen bir
 *  anahtar olsaydı hiçbir şeyi kapatmayan bir söz verirdi.
 *
 *  SAF modül — bekçi içeri alıp değer testi yapar.
 * ============================================================================
 */

export const OZELLIKLER = [
  // Basic
  "satis", "alim", "stok", "iade", "gider", "panel", "donemRaporu", "tanimlar", "veriAktarimi", "hesaplamaMotoru",
  // Silver
  "depo", "cokKullanici", "kartlar", "nakitTakvimi",
  // Gold
  "pazaryeri", "listelemeSagligi", "komisyonTarifesi", "kargoTarifesi", "tazminat",
  // Premium
  "karlilikKarti", "urunAnalizi", "envanterDegeri", "aiOzeti",
  // Yalnız Individuel (kullanıcı kararı 06.10.2026)
  "finansman",
] as const;

export type Ozellik = (typeof OZELLIKLER)[number];

/** Özellik → kapsadığı menü ekranları (`MENU_ADRESLERI` anahtarları). */
export const OZELLIK_EKRANLARI: Record<Ozellik, readonly string[]> = {
  satis: ["satislar"],
  alim: ["alimlar", "malKabul"],
  stok: ["urunler", "stok"],
  iade: ["iadeler"],
  gider: ["giderler"],
  panel: ["panel"],
  donemRaporu: ["rapor"],
  tanimlar: ["kategoriler", "markalar", "tedarikciler", "duzeltmeNedenleri"],
  veriAktarimi: ["veriAktarimi", "veriDisari", "geriYukleme"],
  hesaplamaMotoru: ["simulasyon", "tarifeHesaplama"],
  depo: ["paketle", "okut", "yerlestir", "depoKurulumu", "rafKonumlari"],
  cokKullanici: ["kullanicilar", "roller"],
  kartlar: ["kartlar", "kartBorcu"],
  nakitTakvimi: ["nakitTakvimi"],
  pazaryeri: ["hakedis", "kanalSkulari", "kanalHesaplari", "gecmisEkstre"],
  listelemeSagligi: ["kanalListeleme"],
  komisyonTarifesi: ["komisyonKapisi"],
  kargoTarifesi: ["kargoTarifesi"],
  tazminat: ["tazminat"],
  karlilikKarti: ["urunKarti"],
  urunAnalizi: ["urunAnalizi"],
  envanterDegeri: ["envanterDegeri"],
  aiOzeti: ["gunlukOzet"],
  finansman: ["finansman"],
};

/**
 * Hiçbir pakete bağlanmayan, her firmada açık ekranlar — gerekçesiyle.
 * menuDuzeni: kullanıcı kendi menüsünü kilitleyemez (MENUDEN_DUSURULEMEZ) ·
 * maliyetYontemi / donemler / ozellikler: firmanın kendi defter ayarı ·
 * geceTuru: sistemin teknik bakımı, ticari özellik değil.
 */
export const HEP_ACIK = ["menuDuzeni", "maliyetYontemi", "donemler", "ozellikler", "geceTuru"] as const;

/**
 * Bağımlılık UYARISI (engel değil; docs §3): A açıkken B kapalıysa ekranda
 * söylenir. Örn. hesaplama motoru tarifesiz pakette elle oranla çalışır.
 */
export const BAGIMLILIKLAR: readonly { ozellik: Ozellik; ister: Ozellik; anahtar: string }[] = [
  { ozellik: "hesaplamaMotoru", ister: "komisyonTarifesi", anahtar: "bagMotorTarife" },
  { ozellik: "hesaplamaMotoru", ister: "kargoTarifesi", anahtar: "bagMotorKargo" },
  { ozellik: "nakitTakvimi", ister: "pazaryeri", anahtar: "bagNakitPazaryeri" },
  { ozellik: "listelemeSagligi", ister: "pazaryeri", anahtar: "bagListelemePazaryeri" },
];

/** Saf — açık kümeye göre ekranda söylenecek bağımlılık uyarıları. */
export function eksikBagimliliklar(acik: ReadonlySet<string>) {
  return BAGIMLILIKLAR.filter((b) => acik.has(b.ozellik) && !acik.has(b.ister));
}

/** İlk dağılım (docs/saas-paketleri.md §2). YALNIZ `paket:baslangic` okur. */
export const BASLANGIC_PAKETLERI: readonly { ad: string; sira: number; firmayaOzel: boolean; ozellikler: readonly Ozellik[] }[] = [
  { ad: "Basic", sira: 1, firmayaOzel: false, ozellikler: ["satis", "alim", "stok", "iade", "gider", "panel", "donemRaporu", "tanimlar", "veriAktarimi", "hesaplamaMotoru"] },
  { ad: "Silver", sira: 2, firmayaOzel: false, ozellikler: ["satis", "alim", "stok", "iade", "gider", "panel", "donemRaporu", "tanimlar", "veriAktarimi", "hesaplamaMotoru", "depo", "cokKullanici", "kartlar", "nakitTakvimi"] },
  { ad: "Gold", sira: 3, firmayaOzel: false, ozellikler: ["satis", "alim", "stok", "iade", "gider", "panel", "donemRaporu", "tanimlar", "veriAktarimi", "hesaplamaMotoru", "depo", "cokKullanici", "kartlar", "nakitTakvimi", "pazaryeri", "listelemeSagligi", "komisyonTarifesi", "kargoTarifesi", "tazminat"] },
  { ad: "Premium", sira: 4, firmayaOzel: false, ozellikler: ["satis", "alim", "stok", "iade", "gider", "panel", "donemRaporu", "tanimlar", "veriAktarimi", "hesaplamaMotoru", "depo", "cokKullanici", "kartlar", "nakitTakvimi", "pazaryeri", "listelemeSagligi", "komisyonTarifesi", "kargoTarifesi", "tazminat", "karlilikKarti", "urunAnalizi", "envanterDegeri", "aiOzeti"] },
  { ad: "Individuel", sira: 5, firmayaOzel: true, ozellikler: [] },
];

/** Saf — firmanın AÇIK özellikleri: firmaya özel pakette firma seçimi, değilse paketin içeriği. */
export function acikOzellikler(paket: { firmayaOzel: boolean; ozellikler: readonly string[] } | null, firmaSecimi: readonly string[]): Set<string> {
  if (!paket) return new Set();
  return new Set(paket.firmayaOzel ? firmaSecimi : paket.ozellikler);
}
