/**
 * ============================================================================
 *  KİŞİSEL TEMA — RENK + KART YUVARLAKLIĞI (kullanıcı kararı 07.10.2026)
 * ----------------------------------------------------------------------------
 *  Kullanıcı: «marka mavisi ve kahve dışında kaliteli bir kontrast ile kişiler
 *  istedikleri tema rengini ve istedikleri kart yuvarlaklığını oluşturamazlar
 *  mı?» Gece ve pembe temalar aynı gün kaldırıldı (gece: «röntgen çekilmiş
 *  gibi»; pembe: «uymadı»). Sabit temalar Kobalt (marka) ve Kağıt; üçüncüsü
 *  kullanıcının kendi kurduğu tema.
 *
 *  ── KONTRAST SÖZÜ BURADA TUTULUR, KULLANICIYA BIRAKILMAZ ────────────────
 *  Seçilen renk vurgu olur: düğme dolgusu (üstünde BEYAZ yazı), bağlantı ve
 *  aktif menü yazısı (açık tonlu zemin üstünde). Açık bir renk (sarı, açık
 *  yeşil) seçilirse beyaz yazı okunmaz. Bu yüzden renk, WCAG AA eşiği
 *  (4,5:1) hem BEYAZA hem kendi AÇIK TONUNA karşı sağlanana kadar
 *  koyulaştırılır ve koyulaştırıldığı EKRANDA SÖYLENİR (İlke #5) — sessizce
 *  başka bir renk göstermek, kullanıcıya seçmediği bir şeyi seçtirmek olurdu.
 *
 *  ── TÜRETME ORANLARI KOBALT PALETİNDEN ÖLÇÜLDÜ ──────────────────────────
 *  `tema-kobalt.css`te #12356B'den türeyen tonlar şu karışımlara denk:
 *  vurgu-bg %90 beyaz · vurgu-çizgi %69 beyaz · odak gölgesi %83 beyaz ·
 *  hover %21 siyah · aktif %38 siyah. Aynı oranlar kullanılır; kobalt
 *  girildiğinde kobalt paleti (birkaç birim içinde) geri çıkar — bekçi sınar.
 *
 *  ── NEYE DOKUNMAZ ───────────────────────────────────────────────────────
 *  Logo rengi (`--se-kabuk-marka`) MARKADIR, tema değil: kılavuz «renklerin
 *  yeri değiştirilmez» diyor. Kâr/zarar/uyarı renkleri ANLAM taşır
 *  (kullanıcı kararı 22.08.2026, `lib/renkler.ts`e dokunulmaz). Kişisel tema
 *  yalnız VURGU ailesini ve köşe yarıçapını değiştirir.
 *
 *  Saf gövde: tarayıcı, depolama, saat yok — bekçi doğrudan çağırır.
 * ============================================================================
 */

export const KISISEL_VARSAYILAN = { renk: "#12356B", kose: 12, cizgi: 0 } as const;
export const KOSE_SINIRI = { alt: 0, ust: 20 } as const;
/**
 * Kart çizgisi belirginliği (kullanıcı isteği 08.10.2026: «kart çizgilerinin
 * belirginliğini de düzenleyebilsin kişi»). Seviye 0 = Algoritmo düzeni
 * (çerçevesiz, yalnız gölge). Çizgi metin mürekkebinin (#232B35) saydamlığıdır —
 * renk değil ton: hangi vurgu seçilirse seçilsin nötr kalır, kâr/zarar şeridiyle
 * karışmaz. Saydamlıklar kobalt çizgi basamaklarından: %8 ≈ #EEF0F3 (saç teli),
 * %16 ≈ #DCE0E6 (girdi çerçevesi), %26 ≈ #C3C9D1, %38 belirgin.
 */
export const CIZGI_SEVIYELERI = [0, 0.08, 0.16, 0.26, 0.38] as const;
/** WCAG AA — normal boy metin. */
export const KONTRAST_ESIGI = 4.5;

/**
 * Hazır öneriler — tek tıkla seçilir, renk seçici yedek. Hepsi eşiği
 * kendiliğinden geçer (bekçi sınar), yani öneri hiçbir zaman «koyulaştırıldı»
 * uyarısı doğurmaz.
 */
export const HAZIR_RENKLER = [
  "#12356B", // kobalt (marka)
  "#1F6F8B", // petrol
  "#3B4A9C", // çivit
  "#6B3FA0", // mor
  "#7A4B2A", // kahve
  "#3D4A57", // arduvaz
] as const;

/** Uygulanan değişkenler — başlık betiği yalnız BU adları kabul eder. */
export const KISISEL_DEGISKENLERI = [
  "--se-vurgu",
  "--se-vurgu-hover",
  "--se-vurgu-aktif",
  "--se-vurgu-on",
  "--se-vurgu-bg",
  "--se-vurgu-cizgi",
  "--se-secili",
  "--se-kabuk-secili",
  "--se-odak",
  "--se-odak-golge",
  "--se-kart-cizgi",
  "--radius",
] as const;
export type KisiselDegisken = (typeof KISISEL_DEGISKENLERI)[number];

type Rgb = [number, number, number];

export function gecerliRenk(ham: unknown): ham is string {
  return typeof ham === "string" && /^#[0-9A-Fa-f]{6}$/.test(ham);
}

function hexOku(hex: string): Rgb {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb;
}

function hexYaz([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((k) => Math.round(Math.min(255, Math.max(0, k))).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

/** `oran` kadar hedefe doğru karıştır (0 = renk, 1 = hedef). */
function karistir(renk: Rgb, hedef: Rgb, oran: number): Rgb {
  return renk.map((k, i) => k + (hedef[i]! - k) * oran) as Rgb;
}

const BEYAZ: Rgb = [255, 255, 255];
const SIYAH: Rgb = [0, 0, 0];

/** WCAG göreli parlaklık. */
export function goreliParlaklik(hex: string): number {
  const [r, g, b] = hexOku(hex).map((k) => {
    const c = k / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as Rgb;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function kontrastOrani(a: string, b: string): number {
  const [acik, koyu] = [goreliParlaklik(a), goreliParlaklik(b)].sort((x, y) => y - x) as [number, number];
  return (acik + 0.05) / (koyu + 0.05);
}

/** Vurgunun açık tonu (seçili satır, aktif menü zemini) — kobalttan ölçülen %90. */
function acikTon(renk: Rgb): string {
  return hexYaz(karistir(renk, BEYAZ, 0.9));
}

/**
 * Rengi, beyaza VE kendi açık tonuna karşı eşiği geçene kadar %4 adımlarla
 * koyulaştırır. Siyaha varıldığında eşik her zaman geçilir — döngü sonludur.
 */
export function okunurVurgu(hex: string): { renk: string; koyulasti: boolean } {
  const kaynak = hexOku(hex);
  for (let oran = 0; oran <= 1.0001; oran += 0.04) {
    const aday = karistir(kaynak, SIYAH, Math.min(oran, 1));
    const adayHex = hexYaz(aday);
    if (kontrastOrani(adayHex, "#FFFFFF") >= KONTRAST_ESIGI && kontrastOrani(adayHex, acikTon(aday)) >= KONTRAST_ESIGI) {
      return { renk: adayHex, koyulasti: oran > 0 };
    }
  }
  return { renk: "#000000", koyulasti: true };
}

/**
 * Kâr yeşili ve zarar kırmızısına yakın ton — vurgu bunlara benzerse «yeşil
 * düğme» kâr sanılabilir. Engel değil, UYARI (kullanıcı ısrar edebilir).
 * Ton açısı HSL'den; doygunluğu düşük (grimsi) renk anlam taşımaz.
 */
export function anlamRengineYakin(hex: string): "kar" | "zarar" | null {
  const [r, g, b] = hexOku(hex).map((k) => k / 255) as Rgb;
  const enb = Math.max(r, g, b);
  const enk = Math.min(r, g, b);
  const fark = enb - enk;
  const isik = (enb + enk) / 2;
  const doygunluk = fark === 0 ? 0 : fark / (1 - Math.abs(2 * isik - 1));
  if (doygunluk < 0.3) return null;
  let ton = 0;
  if (enb === r) ton = ((g - b) / fark) % 6;
  else if (enb === g) ton = (b - r) / fark + 2;
  else ton = (r - g) / fark + 4;
  ton = (ton * 60 + 360) % 360;
  if (ton >= 90 && ton <= 165) return "kar";
  if (ton >= 345 || ton <= 15) return "zarar";
  return null;
}

export function koseSinirla(ham: unknown): number {
  const n = typeof ham === "number" ? ham : Number(ham);
  if (!Number.isFinite(n)) return KISISEL_VARSAYILAN.kose;
  return Math.round(Math.min(KOSE_SINIRI.ust, Math.max(KOSE_SINIRI.alt, n)));
}

export function cizgiSinirla(ham: unknown): number {
  const n = typeof ham === "number" ? ham : Number(ham);
  if (!Number.isFinite(n)) return KISISEL_VARSAYILAN.cizgi;
  return Math.round(Math.min(CIZGI_SEVIYELERI.length - 1, Math.max(0, n)));
}

function cizgiDegeri(seviye: number): string {
  const saydamlik = CIZGI_SEVIYELERI[seviye]!;
  return saydamlik === 0 ? "transparent" : `rgba(35, 43, 53, ${saydamlik.toFixed(2)})`;
}

export type KisiselSonuc = {
  /** Kullanıcının seçtiği (geçerliyse) renk. */
  secilen: string;
  /** Uygulanan vurgu — eşik için koyulaşmış olabilir. */
  uygulanan: string;
  koyulasti: boolean;
  anlamUyarisi: "kar" | "zarar" | null;
  kose: number;
  cizgi: number;
  degiskenler: Record<KisiselDegisken, string>;
};

export function kisiselTema(girdi: { renk: unknown; kose: unknown; cizgi?: unknown }): KisiselSonuc {
  const secilen = gecerliRenk(girdi.renk) ? girdi.renk.toUpperCase() : KISISEL_VARSAYILAN.renk;
  const { renk: uygulanan, koyulasti } = okunurVurgu(secilen);
  const v = hexOku(uygulanan);
  const kose = koseSinirla(girdi.kose);
  const cizgi = cizgiSinirla(girdi.cizgi ?? KISISEL_VARSAYILAN.cizgi);
  const bg = acikTon(v);
  return {
    secilen,
    uygulanan,
    koyulasti,
    anlamUyarisi: anlamRengineYakin(uygulanan),
    kose,
    cizgi,
    degiskenler: {
      "--se-vurgu": uygulanan,
      "--se-vurgu-hover": hexYaz(karistir(v, SIYAH, 0.21)),
      "--se-vurgu-aktif": hexYaz(karistir(v, SIYAH, 0.38)),
      "--se-vurgu-on": "#FFFFFF",
      "--se-vurgu-bg": bg,
      "--se-vurgu-cizgi": hexYaz(karistir(v, BEYAZ, 0.69)),
      "--se-secili": bg,
      "--se-kabuk-secili": bg,
      "--se-odak": uygulanan,
      "--se-odak-golge": `0 0 0 3px ${hexYaz(karistir(v, BEYAZ, 0.83))}`,
      "--se-kart-cizgi": cizgiDegeri(cizgi),
      "--radius": `${kose / 16}rem`,
    },
  };
}

/**
 * Depolanan kayıt — TÜRETİLMİŞ değişkenler de saklanır: başlık betiği
 * React'ten önce koşar ve türetmeyi ikinci kez (dize içinde) yazmak, aynı
 * hesabın iki kopyası olurdu. Betik yalnız uygular; hesap tek yerde.
 */
export type KisiselKayit = { renk: string; kose: number; cizgi: number; degiskenler: Record<string, string> };

export function kisiselKayit(sonuc: KisiselSonuc): KisiselKayit {
  return { renk: sonuc.secilen, kose: sonuc.kose, cizgi: sonuc.cizgi, degiskenler: sonuc.degiskenler };
}

/** Başlık betiğinin değer süzgeci — betik dizesine aynen gömülür. */
export const DEGER_DESENI_KAYNAGI = "^(#[0-9A-F]{6}|0 0 0 3px #[0-9A-F]{6}|[0-9.]+rem|transparent|rgba\\(35, 43, 53, 0\\.[0-9]{2}\\))$";
