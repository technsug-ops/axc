/**
 * ============================================================================
 *  MARKA KOD TABLOSU — SAF KURAL (K285, 26.09.2026)
 * ----------------------------------------------------------------------------
 *  Marka kodu SKU'nun marka parçasıdır (KAT-MRK-MODEL-NN). Eskiden kod her
 *  seferinde addan hesaplanıyordu (`urunKisaltmasi`, 2 harf) ve çakışıyordu:
 *  Karaca → KR, Karcher → KR. Artık kod TABLODA durur ve benzersizdir.
 *
 *  ANAHTAR: markanın katlanmış yazımı (harf + rakam, Türkçe harfler
 *  karşılığına): «PHILIPS» = «Philips» = «philips». Aynı anahtar = aynı marka.
 *  «Philips Avent» ayrı anahtardır — ayrı marka mı aynı mı, kullanıcı karar
 *  verir (tahmin yok).
 *
 *  KOD ÖNERİSİ bir ÖNERİDİR: ekranda gösterilir, kullanıcı ekler ve dilediği
 *  an değiştirir. Okunaklı sabit kodlar önce denenir, sonra kural.
 * ============================================================================
 */

const TURKCE: Record<string, string> = {
  ç: "C", Ç: "C", ğ: "G", Ğ: "G", ı: "I", I: "I", İ: "I", i: "I",
  ö: "O", Ö: "O", ş: "S", Ş: "S", ü: "U", Ü: "U",
};

/** Yazım anahtarı — yalnız A-Z ve 0-9. Boş yazım → "". */
export function markaAnahtari(yazim: string | null | undefined): string {
  let s = "";
  for (const h of (yazim ?? "").trim()) s += TURKCE[h] ?? h;
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

/** Kod biçimi: tam 3 karakter, büyük harf ya da rakam. */
export const KOD_BICIMI = /^[A-Z0-9]{3}$/;

export function kodNormalle(ham: string): string {
  return markaAnahtari(ham);
}

/**
 * Okunaklı sabit kodlar — kuralın belirsiz kalacağı ya da çakışacağı
 * markalar için (Karaca KRC · Karcher KRH · Korkmaz KRK). Anahtar → kod.
 */
export const OKUNAKLI_KODLAR: Readonly<Record<string, string>> = {
  LEGO: "LEG", LOGITECH: "LOG", KARACA: "KRC", KARCHER: "KRH", KORKMAZ: "KRK", KORBELL: "KRB",
  ARZUM: "ARZ", ARNICA: "ARN", PHILIPS: "PHL", PHILIPSAVENT: "AVN", BABYLISS: "BYL", BABYPLUS: "BBP",
  BABYTOYS: "BBT", FISHERPRICE: "FSP", FISSLER: "FSL", MATTEL: "MTL", MOTOROLA: "MTR", DELONGHI: "DLN",
  DOLUOYUNCAK: "DOL", STANLEY: "STN", ANKER: "ANK", TEFAL: "TFL", BRAUN: "BRN", HOMEND: "HMD",
  NINJA: "NNJ", CLEMENTONI: "CLM", CLAWS: "CLW", YUI: "YUI", TPLINK: "TPL", XIAOMI: "XMI",
  SAMSUNG: "SMS", APPLE: "APL", BOSCH: "BSH", VESTEL: "VST", GRUNDIG: "GRN", ARCELIK: "ARC",
  FAKIR: "FKR", SINBO: "SNB", TCHIBO: "TCB", HASBRO: "HSB", SOUNDCORE: "SCR", EUFY: "EFY",
  SCHAFER: "SCH", EMSAN: "EMS", NESPRESSO: "NSP", DYSON: "DYS", ROWENTA: "RWN",
};

/** Kuralın ürettiği adaylar, sırayla: ilk harf + iki sessiz · ilk üç · ilk harf + her ikili. */
export function kodAdaylari(anahtar: string): string[] {
  const h = anahtar.replace(/[0-9]/g, "");
  if (h.length === 0) return [];
  const adaylar: string[] = [];
  const sessiz = h.slice(1).replace(/[AEIOU]/g, "");
  if (sessiz.length >= 2) adaylar.push(h[0] + sessiz.slice(0, 2));
  if (h.length >= 3) adaylar.push(h.slice(0, 3));
  for (let i = 1; i < h.length; i++) for (let j = i + 1; j < h.length; j++) adaylar.push(h[0] + h[i] + h[j]);
  return [...new Set(adaylar)].filter((k) => KOD_BICIMI.test(k));
}

/**
 * Kullanılmamış ilk öneri. Bulunamazsa `null` — kod UYDURULMAZ (dolgu harfi
 * eklenmez), ekran kullanıcıdan ister.
 */
export function kodOner(anahtar: string, kullanilan: ReadonlySet<string>): string | null {
  const sabit = OKUNAKLI_KODLAR[anahtar];
  if (sabit && !kullanilan.has(sabit)) return sabit;
  return kodAdaylari(anahtar).find((k) => !kullanilan.has(k)) ?? null;
}

/** En sık görülen yazım — markanın görünen adı. Eşitlikte alfabetik ilk. */
export function enSikYazim(yazimlar: ReadonlyMap<string, number>): string {
  return [...yazimlar].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "tr"))[0]?.[0] ?? "";
}

export type KodHatasi = "BICIM" | "KULLANIMDA";

/** Elle girilen kodun kapısı: biçim + başka markada kullanılmıyor. */
export function kodDenetle(kod: string, digerKodlar: ReadonlySet<string>): KodHatasi | null {
  if (!KOD_BICIMI.test(kod)) return "BICIM";
  if (digerKodlar.has(kod)) return "KULLANIMDA";
  return null;
}
