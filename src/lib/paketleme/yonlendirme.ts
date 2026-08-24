import type { KodRolu } from "@/lib/varyant-arama-kurali";

/**
 * ============================================================================
 *  YÖNLENDİRMELİ PAKETLEME — SAF KURAL (K46, 25.08.2026)
 * ----------------------------------------------------------------------------
 *  Halil tarifi: _"pazaryeri etiketindeki kargo kodu okutulur → sistem ürün
 *  adı + adet + RAF söyler → raftan alınan ürünün barkodu okutulur →
 *  eşleşirse onay → paketlendi. İki okutma, sıfır ezber — yeni eleman
 *  tarifle çalışabilir."_
 *
 *  ⚠ KURAL BURADA SAF DURUYOR, EKRANDA DEĞİL. Ekran çizer, kural karar
 *  verir; böylece `paketleme:dogrula` veritabanı olmadan sınayabiliyor.
 *
 *  ⚠ EŞLEŞMEME BİR UYARI DEĞİL, BİR BİLGİDİR — VE BU KARARIN GEREKÇESİ
 *  ÖLÇÜLMÜŞ. K34 (sevkiyat doğrulaması) tam da bu yüzden kilitli: defterin
 *  %52'si eksikken kırmızı uyarı çoğunlukla HAKLI OLARAK çalar, kullanıcı
 *  iki haftada okumadan geçmeyi öğrenir ve mekanizma yanar.
 *
 *  K46 o tuzağa düşmez çünkü **ARAMA yapar, UYARI vermez**: kod bulunmazsa
 *  hiçbir şey engellenmez, kullanıcı bugünkü akışına döner. Renk nötr,
 *  cümle nötr.
 * ============================================================================
 */

/** Akışın hangi adımında olduğumuz — ekran buna göre çizilir. */
export const PAKETLEME_ADIMLARI = [
  /** Kargo kodu bekleniyor. */
  "KARGO_KODU",
  /** Sipariş bulundu; raftan alınan ürünün barkodu bekleniyor. */
  "URUN_TEYIDI",
  /** Ürün eşleşti; paketlendi işareti atılabilir. */
  "ESLESTI",
  /** Okutulan ürün bu siparişte yok — NÖTR bilgi, engel değil. */
  "ESLESMEDI",
] as const;

export type PaketlemeAdimi = (typeof PAKETLEME_ADIMLARI)[number];

export type PaketKalemi = {
  saleItemId: string;
  variantId: string;
  urunAdi: string;
  varyantAdi: string | null;
  sku: string;
  companySku: string;
  barcode: string | null;
  adet: number;
  /** Raf kodu — akışın ASIL çıktısı. `null` ise raf girilmemiş. */
  rafKodu: string | null;
  /** Bu kalem okutularak teyit edildi mi? */
  teyitli: boolean;
};

export type PaketSiparisi = {
  saleId: string;
  siparisKodu: string | null;
  gonderiKodu: string | null;
  kanal: string;
  kalemler: PaketKalemi[];
  /** Daha önce paketlendi işareti atılmış mı? */
  hazirlaniyor: boolean;
  /** Kod hangi alandan bulundu — ekran bunu söyler. */
  bulunanAlan: KodRolu | null;
};

/**
 * OKUTULAN KOD BU SİPARİŞİN HANGİ KALEMİNE AİT?
 *
 * ⚠ DÖRT KOD ROLÜNDE DE ARANIR ve hangisinde bulunduğu DÖNER. Tek alana
 * bakmak, Soundcore vakasındaki gibi hayalet kayıt üretir
 * (`194645027819` ↔ `194644037819`): elindeki ürünün barkodu kayıttakiyle
 * bir hane farklıysa "yok" denir, oysa Firma SKU tutuyordur.
 *
 * ⚠ SIRA SABİT: barkod → Firma SKU → SKU. Aynı kod iki kaleme uyarsa
 * ilkini seçmek yerine `null` dönülür — belirsizken tahmin, yanlış kutuyu
 * paketletir.
 */
export function kalemBul(
  kalemler: readonly PaketKalemi[],
  kod: string,
): { kalem: PaketKalemi; alan: KodRolu } | null {
  const temiz = kod.trim();
  if (!temiz) return null;

  const sirali: { alan: KodRolu; sec: (k: PaketKalemi) => string | null }[] = [
    { alan: "barcode", sec: (k) => k.barcode },
    { alan: "companySku", sec: (k) => k.companySku },
    { alan: "sku", sec: (k) => k.sku },
  ];

  for (const { alan, sec } of sirali) {
    const uyanlar = kalemler.filter((k) => sec(k) === temiz);
    /** ⚠ İKİ KALEME BİRDEN UYUYORSA SEÇİM YAPILMAZ. */
    if (uyanlar.length === 1) return { kalem: uyanlar[0], alan };
    if (uyanlar.length > 1) return null;
  }
  return null;
}

/**
 * SIRADAKİ ADIM — ekranın tek karar noktası.
 *
 * ⚠ `ESLESMEDI` BİR SON DEĞİL, BİR ARA DURUM: kullanıcı başka bir ürün
 * okutabilir. Akışı kilitlemek, yanlış okumada operasyoncuyu çıkmaza
 * sokardı.
 */
export function siradakiAdim(girdi: {
  siparis: PaketSiparisi | null;
  sonOkumaEslestiMi: boolean | null;
}): PaketlemeAdimi {
  if (girdi.siparis === null) return "KARGO_KODU";
  if (girdi.sonOkumaEslestiMi === true) return "ESLESTI";
  if (girdi.sonOkumaEslestiMi === false) return "ESLESMEDI";
  return "URUN_TEYIDI";
}

/**
 * PAKETLENDİ İŞARETİ ATILABİLİR Mİ?
 *
 * ⚠ TEYİT ŞART. Kargo kodunu okutup ürünü okutmadan "paketlendi" demek,
 * akışın tek işini atlamak olurdu: doğru ürünün alındığını KİMSE
 * doğrulamamış olur.
 *
 * ⚠ AMA TEK KALEM YETER, HEPSİ DEĞİL — bugün. Çok kalemli siparişte her
 * kalemi ayrı okutmak doğru olurdu; ölçüldü (25.08.2026): canlıda
 * 131 satışın hepsi TEK kalemli, çok kalemli sipariş YOK. Çok kalemli
 * ilk sipariş girdiğinde kural "hepsi teyitli" olarak sıkılaştırılır —
 * bugün sıkılaştırmak, olmayan bir durum için ekran karmaşıklığı üretmek.
 */
export function paketlenebilirMi(siparis: PaketSiparisi | null): boolean {
  if (siparis === null) return false;
  return siparis.kalemler.some((k) => k.teyitli);
}

/**
 * RAF EKSİKSE AKIŞ DURMAZ — SÖYLER.
 *
 * ⚠ Ölçüldü (25.08.2026): 1091 aktif varyantın 1090'ı raflı (%99,9) ve
 * STOKTA OLAN 118 varyantın rafsızı SIFIR. Yani bu hâl bugün pratikte
 * doğmuyor; yine de sessiz geçilmiyor — rafsız bir kalem çıkarsa ekran
 * "raf girilmemiş" der ve kullanıcı ürünü kendi bulur.
 */
export function rafiEksikOlanlar(siparis: PaketSiparisi): PaketKalemi[] {
  return siparis.kalemler.filter((k) => k.rafKodu === null);
}
