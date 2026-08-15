import {
  DURUM_ISARETI,
  DURUM_SERIDI,
  DURUM_YAZISI,
  DURUM_ZEMINI,
  type DurumRengi,
} from "@/lib/renkler";

/**
 * ============================================================================
 *  DURUM SUNUM BİLEŞENLERİ — RENK SİSTEMİNİN TEK GİRİŞ KAPISI
 * ----------------------------------------------------------------------------
 *  Ekranlar `bg-[#E1F5EE]` gibi ham renk YAZMAZ; hepsi buradan geçer.
 *  Palet tek yerde değişir ve `panel:dogrula` "renk yalnız buradan mı
 *  geliyor" diye sorabilir.
 *
 *  İŞARET ZORUNLU (kısıt #1): renk tek başına anlam taşımaz. Rozet ve rakam,
 *  rengin yanında bir işaret (✓ − • →) taşır; renk körlüğünde ve
 *  siyah-beyaz çıktıda anlam kaybolmasın.
 * ============================================================================
 */

export function DurumRozeti({
  durum,
  children,
  isaretsiz = false,
}: {
  durum: DurumRengi;
  children: React.ReactNode;
  /**
   * İşareti gizler — YALNIZ metnin kendisi durumu söylüyorsa
   * ("kârda", "zararda", "gecikmiş"). Renk + kelime birlikte yeterli.
   */
  isaretsiz?: boolean;
}) {
  return (
    <span
      /**
       * `max-w-full` + `break-words`: rozet kapsayıcısından TAŞMAZ.
       * 15.08.2026'da panelde "karşılaştırılamaz — kıyas döneminde kayıt
       * yok" metni kutunun kenarından kesiliyordu; `shrink-0` daralmayı
       * engelliyor, taşma sınırı da yoktu.
       */
      className={`inline-flex max-w-full shrink-0 items-center gap-1 rounded-sm px-2 py-0.5 text-[11px] leading-5 font-semibold break-words ${DURUM_ZEMINI[durum]}`}
    >
      {!isaretsiz && DURUM_ISARETI[durum] ? (
        <span aria-hidden="true">{DURUM_ISARETI[durum]}</span>
      ) : null}
      {children}
    </span>
  );
}

/**
 * Zemini nötr kalan, yalnız YAZISI renkli rakam. Büyük tutarlar için:
 * pastel zemin koca blokta bunaltır (kısıt #2).
 */
export function DurumRakami({
  durum,
  children,
  className = "",
  /** İşaret metnin başına eklensin mi (tutarın kendi eksi işareti varsa gerekmez). */
  isaretsiz = true,
}: {
  durum: DurumRengi;
  children: React.ReactNode;
  className?: string;
  isaretsiz?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-baseline gap-1 tabular-nums ${DURUM_YAZISI[durum]} ${className}`}
    >
      {!isaretsiz && DURUM_ISARETI[durum] ? (
        <span aria-hidden="true">{DURUM_ISARETI[durum]}</span>
      ) : null}
      {children}
    </span>
  );
}

/**
 * ÜÇ KATMANLI KART: sol şerit + pastel zemin + içerik.
 *
 * Şerit KENARLIK olarak veriliyor, ayrı bir çocuk öğe olarak değil: kartın
 * köşe yarıçapı korunur ve şerit dışarı taşmaz.
 */
export function DurumKarti({
  durum,
  children,
  className = "",
}: {
  durum: DurumRengi;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`min-w-0 rounded-md border p-3 ${DURUM_SERIDI[durum]} ${DURUM_ZEMINI[durum]} ${className}`}
    >
      {children}
    </div>
  );
}
