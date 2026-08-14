import {
  DURUM_ISARETI,
  DURUM_YAZISI,
  DURUM_ZEMINI,
  type DurumRengi,
} from "@/lib/panel/renkler";

/**
 * ============================================================================
 *  DURUM ROZETİ VE DURUM RAKAMI
 * ----------------------------------------------------------------------------
 *  Renk sisteminin TEK giriş kapısı. Ekranlar `bg-[#E1F5EE]` gibi ham renk
 *  yazmaz; buradan geçer. Böylece palet tek yerde değişir ve
 *  `panel:dogrula` "renk yalnız buradan geliyor mu" diye sorabilir.
 *
 *  İŞARET ZORUNLU (kısıt #1): renk tek başına anlam taşımaz. Rozet ve
 *  rakam, rengin yanında bir işaret (✓ − • →) taşır; renk körlüğünde ve
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
   * İşareti gizler — YALNIZ metnin kendisi zaten durumu söylüyorsa
   * ("kârda", "zararda"). Renk + kelime birlikte yeterli.
   */
  isaretsiz?: boolean;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium ${DURUM_ZEMINI[durum]}`}
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
 * pastel zemin koca bir blokta bunaltıcı olur (kısıt #2).
 */
export function DurumRakami({
  durum,
  children,
  className = "",
  /** Kritik eşikte doygun tona çıkan "istisna vurgu". */
  vurgulu = false,
}: {
  durum: DurumRengi;
  children: React.ReactNode;
  className?: string;
  vurgulu?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-baseline gap-1 tabular-nums ${
        vurgulu && durum === "olumsuz"
          ? "text-destructive font-semibold"
          : DURUM_YAZISI[durum]
      } ${className}`}
    >
      {children}
    </span>
  );
}
