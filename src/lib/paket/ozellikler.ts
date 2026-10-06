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
 * geceTuru: sistemin teknik bakımı, ticari özellik değil ·
 * paketim: kilitli ekranın açıklama sayfası; kapansaydı kilit açıklanamazdı.
 */
export const HEP_ACIK = ["menuDuzeni", "maliyetYontemi", "donemler", "ozellikler", "geceTuru", "paketim"] as const;

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

/* ═══ UYGULAMA TARAFI — saf parçalar (2. adım, 06.10.2026) ════════════════ */

/**
 * Proxy'nin HER istekte kendisi yazdığı adres başlığı. Dışarıdan gelen değer
 * EZİLİR (taklit edilemez); sayfa kapısı paketi bu başlıktan okur.
 */
export const PAKET_YOL_BASLIGI = "x-paket-yol";

const EKRAN_OZELLIGI: Record<string, Ozellik> = Object.fromEntries(
  OZELLIKLER.flatMap((o) => OZELLIK_EKRANLARI[o].map((e) => [e, o] as const)),
);

/** Saf — menü ekranının özelliği (HEP_ACIK ya da bilinmeyen → null). */
export function ekraninOzelligi(ekran: string): Ozellik | null {
  return EKRAN_OZELLIGI[ekran] ?? null;
}

/**
 * MENÜDE OLMAYAN ama bir özelliğe ait sayfalar (ölçüldü 06.10.2026, 98 sayfa
 * rotası tarandı). `/kanallar`: panelin kanal dökümü (panel gövdesini çağırır).
 * `/ayarlar/hb-kargo-tarife`: eski kargo tarifesi ekranı, adresi duruyor.
 */
export const EK_ADRESLER: Partial<Record<Ozellik, readonly string[]>> = {
  panel: ["/kanallar"],
  kargoTarifesi: ["/ayarlar/hb-kargo-tarife"],
};

/**
 * Saf — adres hangi özelliğe ait. EN UZUN eşleşen menü adresi kazanır
 * (`/rapor/urunler` Premium, `/rapor` Basic). Panel (`/`) yalnız TAM eşleşir;
 * yoksa her adres panelin altına düşerdi. Eşleşmeyen adres → null (pakete
 * bağlı değil; `paket:dogrula` her sayfa rotasının ya eşleştiğini ya da
 * gerekçeli olarak paket dışı olduğunu ölçer).
 */
export function adresinOzelligi(yol: string, adresler: Record<string, string>): Ozellik | null {
  let enIyi: { ozellik: Ozellik | null; uzunluk: number } | null = null;
  const dene = (adres: string, ozellik: Ozellik | null) => {
    const tutar = adres === "/" ? yol === "/" : yol === adres || yol.startsWith(`${adres}/`);
    if (tutar && (!enIyi || adres.length > enIyi.uzunluk)) enIyi = { ozellik, uzunluk: adres.length };
  };
  for (const [ekran, adres] of Object.entries(adresler)) dene(adres, ekraninOzelligi(ekran));
  for (const o of OZELLIKLER) for (const adres of EK_ADRESLER[o] ?? []) dene(adres, o);
  return (enIyi as { ozellik: Ozellik | null } | null)?.ozellik ?? null;
}

/**
 * PAKETE BAĞLI OLMAYAN sayfa rotaları — gerekçeli (bekçi her `page.tsx`in ya
 * bir özelliğe ya HEP_ACIK ekranına ya da buraya düştüğünü ölçer; beyansız
 * yeni sayfa KIRMIZI). Önek eşleşir. Yönetim katmanı (`YONETIM_YOLU`) burada
 * DEĞİL: yolu tek sabitten gelir, uygulama adı elle yazılmaz; bekçi ayrıca ayırır.
 */
export const PAKET_DISI_ROTALAR: readonly { onek: string; gerekce: string }[] = [
  { onek: "/giris", gerekce: "giriş ekranı" },
  { onek: "/parola-degistir", gerekce: "zorunlu parola değişimi; kapansaydı kullanıcı kilitlenirdi" },
  { onek: "/cevrimdisi", gerekce: "ağ yokken gösterilen sayfa (PWA)" },
  { onek: "/el-kitabi", gerekce: "yardım — her pakette" },
  { onek: "/talepler", gerekce: "destek talebi — paket değişikliği de buradan istenir" },
  { onek: "/menu", gerekce: "telefon menüsü; kilitli öğeleri kendisi işaretler" },
  { onek: "/paket", gerekce: "Paketim / kilit açıklaması (HEP_ACIK paketim)" },
  { onek: "/ayarlar/tarife", gerekce: "yalnız yönlendirme; hedefleri (/ayarlar/komisyon · /tarife) kapılı" },
  { onek: "/sistem/hata-denemesi", gerekce: "bakım tetiği (K98), tam yetkili kapısı ayrı" },
];

/** Saf — açık kümeye göre KİLİTLİ menü ekranları (ekran → özelliği). */
export function kilitliEkranlar(acik: ReadonlySet<string>): Record<string, Ozellik> {
  return Object.fromEntries(Object.entries(EKRAN_OZELLIGI).filter(([, o]) => !acik.has(o)));
}

/** Kilitli ekranın gideceği açıklama sayfası. */
export function kilitAdresi(ozellik: string): string {
  return `/paket?ozellik=${encodeURIComponent(ozellik)}`;
}
