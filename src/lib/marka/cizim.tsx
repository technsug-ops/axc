/**
 * ============================================================================
 *  MARKA ÇİZİMİ — TEK KAYNAK (Bezirga Vektör Paketi 1.0, 04.10.2026)
 * ----------------------------------------------------------------------------
 *  Sol menü, giriş ekranı, sekme simgesi ve PWA simgeleri bu yolları
 *  kullanır. Yollar paketin `01_SVG` dosyalarından BİREBİR alındı; elle
 *  yeniden çizilmez. Renkler paketin `renkler_ve_olculer.json`undan.
 *
 *  ⚠ ÇİZİM ADDAN TÜRETİLEMEZ. Eski simge `UYGULAMA.ad`ın baş harfini
 *  çiziyordu; logo bir harf değil, tasarımdır. Ad değişirse yeni marka
 *  paketiyle bu dosya da değişir — `UYGULAMA.ad` ise metinleri taşır.
 *
 *  KILAVUZ KURALLARI (paket `ONCE_OKU.txt`):
 *  · i üzerindeki elmas noktanın karşılığıdır; kaldırılmaz.
 *  · 16 ve 32 px'de MİKRO çizim kullanılır.
 *  · Renklerin yeri değiştirilmez: gövde kobalt, b beyaz, elmas safran.
 * ============================================================================
 */

export const MARKA_PALETI = {
  kobalt: "#12356B",
  safran: "#E3A13A",
  beyaz: "#FFFFFF",
} as const;

/** 256 birimlik ızgarada «b» işareti (`bezirga_isaret.svg`). */
export const B_YOLU =
  "M64 40H96V103.01C104.34 98.49 113.87 96 124 96V128C108.536 128 96 140.536 96 156C96 171.464 108.536 184 124 184C139.464 184 152 171.464 152 156H184C184 189.137 157.137 216 124 216C113.87 216 104.34 213.51 96 208.99V216H64Z";
/** 256 birimlik ızgarada elmas. */
export const ELMAS_YOLU = "M161 97L183 119L161 141L139 119Z";

/** 16 birimlik ızgarada optik düzeltilmiş mikro çizim (`bezirga_ikon_mikro.svg`). */
export const MIKRO_B_YOLU =
  "M4 2H6V6.536C6.588 6.194 7.271 6 8 6V8C6.895 8 6 8.895 6 10C6 11.105 6.895 12 8 12C9.105 12 10 11.105 10 10H12C12 12.209 10.209 14 8 14C7.271 14 6.588 13.806 6 13.464V14H4Z";
export const MIKRO_ELMAS_YOLU = "M10.4 5.9L11.9 7.4L10.4 8.9L8.9 7.4Z";

/**
 * «bezirga» yazısı (`bezirga_yazi.svg`, 524×151). Her harf kendi kaydırmasıyla.
 * Elmas `i` noktasıdır ve ayrı durur.
 */
const YAZI_HARFLERI: { d: string; x: number }[] = [
  { x: 0, d: "M0 0H26V38C33 30 41 27 52 27C75 27 87 44 87 68C87 93 73 110 51 110C40 110 32 106 26 99V108H0Z M43 47C32 47 27 55 27 69C27 83 32 91 43 91C54 91 60 83 60 69C60 55 54 47 43 47Z" },
  { x: 4, d: "M173 74H117C118 85 125 91 134 91C143 91 149 87 152 81L172 88C166 103 153 110 134 110C107 110 90 94 90 69C90 44 107 27 132 27C159 27 173 44 173 70Z M117 59H147C146 49 141 44 132 44C124 44 119 49 117 59Z" },
  { x: 9, d: "M176 29H242V49L207 87H243V108H172V89L208 50H176Z" },
  { x: 9, d: "M247 29H273V108H247Z" },
  { x: 8, d: "M284 29H310V43C315 31 325 27 337 27V51C319 49 311 58 311 73V108H284Z" },
  { x: 8, d: "M393 29C396 18 404 14 418 14V32H412C407 32 405 33 403 36C409 41 412 47 412 54C412 73 399 83 376 83C370 83 365 82 362 81C359 82 358 84 358 86C358 89 362 91 368 91H390C410 91 420 100 420 114C420 131 405 139 377 139C350 139 334 132 334 117C334 108 339 103 346 100C340 97 337 93 337 87C337 80 342 76 348 73C343 68 340 62 340 54C340 36 354 26 376 26C382 26 388 27 393 29Z M376 43C369 43 365 47 365 54C365 61 369 65 376 65C383 65 387 61 387 54C387 47 383 43 376 43Z M369 112C361 112 358 114 358 118C358 124 365 126 377 126C390 126 397 123 397 119C397 114 391 112 381 112Z" },
  { x: 11, d: "M425 52C429 35 444 27 468 27C497 27 506 39 506 62V86C506 91 508 93 513 93V108C494 111 485 107 481 100C474 107 464 110 453 110C432 110 420 100 420 84C420 65 435 58 480 57V54C480 47 476 44 467 44C457 44 452 48 449 55Z M480 73C456 73 448 77 448 84C448 90 453 93 462 93C473 93 480 87 480 79Z" },
];
const YAZI_ELMAS_YOLU = "M269 -12L285 4L269 20L253 4Z";

/**
 * Kare zeminsiz işaret: «b» + elmas. «b» `currentColor` ile boyanır —
 * koyu kabukta beyaz (pakette `isaret_ters`), açık zeminde kobalt.
 * Süsleme sayılır (`aria-hidden`); adı yanındaki metin ya da etiket taşır.
 */
export function MarkaIsareti({ className }: { className?: string }) {
  return (
    <svg viewBox="40 24 160 208" className={className} aria-hidden="true" focusable="false">
      <path d={B_YOLU} fill="currentColor" />
      <path d={ELMAS_YOLU} fill={MARKA_PALETI.safran} />
    </svg>
  );
}

/** Kobalt yuvarlatılmış kare içinde işaret (`bezirga_ikon.svg`) — her zeminde okunur. */
/**
 * Kare ikon. Kılavuz (04.10.2026, s.4): 16–32 px'de MİKRO çizim — `mikro`
 * verilince 16 birimlik optik düzeltilmiş yollar kullanılır (sekme simgesiyle
 * aynı eşik: `ikon.tsx` → MIKRO_SINIR 32).
 */
export function MarkaIkonu({ className, mikro = false }: { className?: string; mikro?: boolean }) {
  if (mikro) {
    return (
      <svg viewBox="0 0 16 16" className={className} aria-hidden="true" focusable="false">
        <rect width="16" height="16" rx="3.5" fill={MARKA_PALETI.kobalt} />
        <path d={MIKRO_B_YOLU} fill={MARKA_PALETI.beyaz} />
        <path d={MIKRO_ELMAS_YOLU} fill={MARKA_PALETI.safran} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 256 256" className={className} aria-hidden="true" focusable="false">
      <rect width="256" height="256" rx="56" fill={MARKA_PALETI.kobalt} />
      <path d={B_YOLU} fill={MARKA_PALETI.beyaz} />
      <path d={ELMAS_YOLU} fill={MARKA_PALETI.safran} />
    </svg>
  );
}

/**
 * «bezirga» yazısı. Harfler `currentColor`; i'nin noktası safran elmas.
 * ⚠ Erişilebilir ad `UYGULAMA.ad`dan verilir (çağıran `etiket` geçer):
 * çizim okunamaz, ekran okuyucu adı etiketten duyar.
 */
export function MarkaYazisi({ className, etiket }: { className?: string; etiket: string }) {
  return (
    <svg viewBox="0 0 524 151" className={className} role="img" aria-label={etiket} focusable="false">
      <g transform="translate(0 12)">
        {YAZI_HARFLERI.map((h, i) => (
          <path key={i} transform={`translate(${h.x} 0)`} d={h.d} fill="currentColor" fillRule="evenodd" />
        ))}
        <path d={YAZI_ELMAS_YOLU} fill={MARKA_PALETI.safran} />
      </g>
    </svg>
  );
}
