/**
 * ============================================================================
 *  FİNANSMAN — SAF KURAL (K304, 28.09.2026)
 * ----------------------------------------------------------------------------
 *  Kullanıcı kararı: sermaye artırımı · ortaktan borç · üçüncü kişiden borç ·
 *  banka kredisi (faizli). Bu dosya HİÇBİR ŞEY YAZMAZ ve veritabanına gitmez;
 *  ekran, eylem ve nakit takvimi aynı gövdeyi çağırır. Bekçi
 *  (`finansman:dogrula`) gövdeyi ÇAĞIRIP değerini sınar.
 *
 *  ⛔ KÂRA DOKUNMAZ. Sermaye, borç girişi ve anapara geri ödemesi gelir/gider
 *  DEĞİLDİR. Kâra düşen tek kalem, gerçekleşmiş geri ödemedeki `faiz + vergi`
 *  (eylem onu Giderler'e yazar — kart faizi deseni).
 *
 *  PLAN ↔ GERÇEKLEŞME: `gerceklestiAt === null` hareket PLANLIDIR — nakit
 *  takvimi onu gösterir, bakiyelere (kalan borç, sermaye) GİRMEZ. Olmamış bir
 *  borç ödenmiş sayılmaz, gelmemiş sermaye kasada sayılmaz.
 *
 *  TERS KAYIT: gerçekleşmiş hareket değiştirilmez; düzeltme işareti ters
 *  (negatif tutarlı) yeni bir satırdır. Toplamlar ikisini birlikte toplar —
 *  ters kaydı SÜZMEK düzeltmeyi görünmez kılardı (kart ödemesi deseni).
 * ============================================================================
 */

export type FinansmanTuru = "SERMAYE" | "ORTAK_BORCU" | "UCUNCU_KISI_BORCU" | "BANKA_KREDISI";
export type HareketTuru = "GIRIS" | "GERI_ODEME" | "SERMAYEYE_MAHSUP";

export const FINANSMAN_TURLERI: readonly FinansmanTuru[] = ["SERMAYE", "ORTAK_BORCU", "UCUNCU_KISI_BORCU", "BANKA_KREDISI"];
export const HAREKET_TURLERI: readonly HareketTuru[] = ["GIRIS", "GERI_ODEME", "SERMAYEYE_MAHSUP"];

/**
 * Hangi kaynak türünde hangi hareket olabilir.
 * · Sermaye geri ödenmez ve mahsup edilmez — yalnız GİRİŞ.
 * · Sermayeye mahsup YALNIZ ortak borcunda: üçüncü kişi ya da banka borcu
 *   ortak payına çevrilmez (kullanıcı beyanı: «ortaktan borç, sonra sermayeye
 *   çevrilecek»).
 */
export const IZINLI_HAREKETLER: Readonly<Record<FinansmanTuru, readonly HareketTuru[]>> = {
  SERMAYE: ["GIRIS"],
  ORTAK_BORCU: ["GIRIS", "GERI_ODEME", "SERMAYEYE_MAHSUP"],
  UCUNCU_KISI_BORCU: ["GIRIS", "GERI_ODEME"],
  BANKA_KREDISI: ["GIRIS", "GERI_ODEME"],
};

/**
 * ============================================================================
 *  BORÇ BİRİMİ (K304-②, kullanıcı kararı 28.09.2026)
 * ----------------------------------------------------------------------------
 *  Borç KENDİ biriminde tutulur, TL'ye sabitlenmez. USD ve gram altın bir
 *  ÖZELLİKTİR (`Company.finansmanCokBirim`) — kapalıyken yalnız TRY/EUR
 *  seçilir. ⚠ Kapalıyken önceden girilmiş USD/altın kaydı GİZLENMEZ.
 * ============================================================================
 */
export type FinansmanBirimi = "TRY" | "EUR" | "USD" | "ALTIN_GRAM_24" | "ALTIN_GRAM_22";
export const TEMEL_BIRIMLER: readonly FinansmanBirimi[] = ["TRY", "EUR"];
export const EK_BIRIMLER: readonly FinansmanBirimi[] = ["USD", "ALTIN_GRAM_24", "ALTIN_GRAM_22"];
export const TUM_BIRIMLER: readonly FinansmanBirimi[] = [...TEMEL_BIRIMLER, ...EK_BIRIMLER];

export function secilebilirBirimler(cokBirimAcik: boolean): readonly FinansmanBirimi[] {
  return cokBirimAcik ? TUM_BIRIMLER : TEMEL_BIRIMLER;
}

/** Para birimi mi (₺ · € · $ ile yazılır) — altın gram değildir. */
export function paraBirimiMi(b: FinansmanBirimi): boolean {
  return b === "TRY" || b === "EUR" || b === "USD";
}

/**
 * Faiz gideri DOĞRUDAN yazılabilir mi. Gider defteri TRY/EUR konuşur
 * (Currency). USD ve altın taksitin faizinde kullanıcı o gün FİİLEN ödediği TL
 * karşılığını girer — sistem çevirmez, tahmin etmez.
 */
export function giderDogrudanMi(b: FinansmanBirimi): boolean {
  return b === "TRY" || b === "EUR";
}

/**
 * GÜNCEL TL KARŞILIĞI — kullanıcının girdiği birim fiyatıyla. TRY'de kendisi;
 * fiyatı girilmemiş birimde `null` (UYDURULMAZ — ekran «fiyat girilmedi» der).
 */
export function tlKarsiligi(miktar: number, birim: FinansmanBirimi, tlFiyati: number | null): number | null {
  if (birim === "TRY") return miktar;
  if (tlFiyati === null || !Number.isFinite(tlFiyati) || tlFiyati <= 0) return null;
  return Math.round(miktar * tlFiyati * 100) / 100;
}

/**
 * GİDER KAYDI — gerçekleşmiş taksitin faiz+vergisi Giderler'e NE olarak yazılır.
 * · TRY/EUR borç → kendi biriminde, olduğu gibi.
 * · USD/altın borç → kullanıcının o gün FİİLEN ödediği TL karşılığı (girdisi);
 *   yoksa `GIDER_TL_GEREKLI` — sistem çevirmez, tahmin etmez.
 * · faiz+vergi sıfırsa `null` (gider doğmaz).
 */
export function giderKaydi(
  birim: FinansmanBirimi,
  giderBiriminde: number,
  giderTl: number | null,
): { tutar: number; paraBirimi: "TRY" | "EUR" } | "GIDER_TL_GEREKLI" | null {
  if (!(giderBiriminde > 0)) return null;
  if (birim === "TRY" || birim === "EUR") return { tutar: giderBiriminde, paraBirimi: birim };
  if (giderTl === null || !Number.isFinite(giderTl) || giderTl <= 0) return "GIDER_TL_GEREKLI";
  return { tutar: giderTl, paraBirimi: "TRY" };
}

/** Borç mu — kalan borç yalnız bunlarda anlamlıdır. */
export function borcMu(tur: FinansmanTuru): boolean {
  return tur !== "SERMAYE";
}

export type HareketGirdisi = {
  tur: HareketTuru;
  anapara: number;
  faiz: number;
  vergi: number;
};

export type HareketHatasi =
  | "TUR_IZINSIZ"
  | "ANAPARA_GECERSIZ"
  | "FAIZ_GECERSIZ"
  | "FAIZ_YALNIZ_GERI_ODEMEDE";

/**
 * Yeni (ters kayıt olmayan) hareketin geçerliliği. `null` = geçerli.
 * Tutarlar POZİTİF girilir; yönü `tur` belirler. Ters kayıt bu kapıdan
 * geçmez — eylem onu gerçekleşmiş bir hareketten türetir.
 */
export function hareketHatasi(kaynakTuru: FinansmanTuru, h: HareketGirdisi): HareketHatasi | null {
  if (!IZINLI_HAREKETLER[kaynakTuru].includes(h.tur)) return "TUR_IZINSIZ";
  if (!Number.isFinite(h.anapara) || h.anapara <= 0) return "ANAPARA_GECERSIZ";
  if (!Number.isFinite(h.faiz) || !Number.isFinite(h.vergi) || h.faiz < 0 || h.vergi < 0) return "FAIZ_GECERSIZ";
  if (h.tur !== "GERI_ODEME" && (h.faiz !== 0 || h.vergi !== 0)) return "FAIZ_YALNIZ_GERI_ODEMEDE";
  return null;
}

/**
 * NAKİT ETKİSİ — kasaya giren (+) / çıkan (−).
 * Geri ödemenin nakdi anapara + faiz + vergi; mahsubun nakdi YOK.
 */
export function nakitEtkisi(h: HareketGirdisi): number {
  if (h.tur === "GIRIS") return h.anapara;
  if (h.tur === "GERI_ODEME") return -(h.anapara + h.faiz + h.vergi);
  return 0;
}

/** Gerçekleşmiş taksitte GİDERE yazılacak tutar (faiz + vergi). */
export function giderTutari(h: HareketGirdisi): number {
  return h.tur === "GERI_ODEME" ? h.faiz + h.vergi : 0;
}

/**
 * Taksit faizi için ÖNERİLEN gider kategorisi adı — yalnız ön seçim. Yoksa
 * kullanıcı listeden seçer (kart faizi deseni: tek ada bağlamak, o kategori
 * yokken kullanıcıyı çıkmaza sokuyordu).
 */
export const FINANSMAN_FAIZ_KATEGORI_ONERISI = "Kredi faizi";

/**
 * ============================================================================
 *  ÖDEME PLANI YAPIŞTIRMA — banka tablosundan kopyalanan satırlar
 * ----------------------------------------------------------------------------
 *  Her satır: `GG.AA.YYYY  anapara  faiz  [vergi]` — ayraç sekme, `;` ya da
 *  boşluk. Sayılar Türkçe biçimde (`1.234,56`). Bankanın planı taksit
 *  başına bu üç rakamı zaten veriyor; sistem HESAPLAMAZ, olduğu gibi okur.
 *
 *  ⚠ BELİRSİZ SAYI REDDEDİLİR, TAHMİN EDİLMEZ: virgülsüz ve binlik deseni
 *  tutmayan noktalı bir sayı (`12.5`) hem «12,5» hem «125» okunabilir —
 *  o satır hata olarak döner, satır numarasıyla.
 *  Tutmayan satır sessizce atlanmaz: `hatalar` listesinde durur (İlke #5).
 * ============================================================================
 */
export type PlanSatiri = { vade: string; anapara: number; faiz: number; vergi: number };

export function turkceSayi(ham: string): number | null {
  const s = ham.trim().replace(/\s/g, "").replace(/^₺|TL$/gi, "");
  if (s === "") return null;
  let n: string;
  if (s.includes(",")) {
    if (!/^-?\d{1,3}(\.\d{3})*,\d+$|^-?\d+,\d+$/.test(s)) return null;
    n = s.replace(/\./g, "").replace(",", ".");
  } else if (s.includes(".")) {
    if (!/^-?\d{1,3}(\.\d{3})+$/.test(s)) return null;
    n = s.replace(/\./g, "");
  } else {
    if (!/^-?\d+$/.test(s)) return null;
    n = s;
  }
  const deger = Number(n);
  return Number.isFinite(deger) ? deger : null;
}

function gunCoz(ham: string): string | null {
  const m = /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/.exec(ham.trim());
  if (!m) return null;
  const gun = Number(m[1]);
  const ay = Number(m[2]);
  const yil = Number(m[3]);
  if (ay < 1 || ay > 12 || gun < 1 || gun > 31) return null;
  const t = new Date(Date.UTC(yil, ay - 1, gun));
  if (t.getUTCMonth() + 1 !== ay || t.getUTCDate() !== gun) return null;
  return `${yil}-${String(ay).padStart(2, "0")}-${String(gun).padStart(2, "0")}`;
}

export function odemePlaniCoz(metin: string): { satirlar: PlanSatiri[]; hatalar: number[] } {
  const satirlar: PlanSatiri[] = [];
  const hatalar: number[] = [];
  metin.split(/\r?\n/).forEach((ham, i) => {
    if (ham.trim() === "") return;
    const parca = ham.trim().split(/[\t;\s]+/).filter((p) => p !== "");
    const vade = parca[0] ? gunCoz(parca[0]) : null;
    const anapara = parca[1] !== undefined ? turkceSayi(parca[1]) : null;
    const faiz = parca[2] !== undefined ? turkceSayi(parca[2]) : null;
    const vergi = parca[3] !== undefined ? turkceSayi(parca[3]) : 0;
    if (vade === null || anapara === null || faiz === null || vergi === null || parca.length > 4) {
      hatalar.push(i + 1);
      return;
    }
    const h = { tur: "GERI_ODEME" as const, anapara, faiz, vergi };
    if (hareketHatasi("BANKA_KREDISI", h) !== null) {
      hatalar.push(i + 1);
      return;
    }
    satirlar.push({ vade, anapara, faiz, vergi });
  });
  return { satirlar, hatalar };
}

export type OzetHareketi = HareketGirdisi & { gerceklesti: boolean };

export type KaynakOzeti = {
  /** Gerçekleşmiş girişler (anapara). */
  giren: number;
  /** Gerçekleşmiş geri ödemelerin ANAPARA kısmı. */
  geriOdenen: number;
  /** Gerçekleşmiş sermayeye mahsup. */
  mahsup: number;
  /** Gerçekleşmiş geri ödemelerdeki faiz + vergi (gidere düşen). */
  odenenFaizVergi: number;
  /** Borç türlerinde giren − geri ödenen − mahsup; sermayede `null`. */
  kalanBorc: number | null;
  /** Bu kaynağın sermayeye katkısı: sermayede giren, ortak borcunda mahsup. */
  sermayeKatkisi: number;
  /** Henüz gerçekleşmemiş plan — bakiyelere GİRMEZ. */
  planliGiris: number;
  /** Henüz ödenmemiş taksitlerin toplam nakdi (anapara + faiz + vergi). */
  planliCikis: number;
};

const kurus = (n: number) => Math.round(n * 100) / 100;

export function kaynakOzeti(tur: FinansmanTuru, hareketler: readonly OzetHareketi[]): KaynakOzeti {
  let giren = 0;
  let geriOdenen = 0;
  let mahsup = 0;
  let odenenFaizVergi = 0;
  let planliGiris = 0;
  let planliCikis = 0;
  for (const h of hareketler) {
    if (!h.gerceklesti) {
      if (h.tur === "GIRIS") planliGiris += h.anapara;
      else if (h.tur === "GERI_ODEME") planliCikis += h.anapara + h.faiz + h.vergi;
      continue;
    }
    if (h.tur === "GIRIS") giren += h.anapara;
    else if (h.tur === "GERI_ODEME") {
      geriOdenen += h.anapara;
      odenenFaizVergi += h.faiz + h.vergi;
    } else mahsup += h.anapara;
  }
  return {
    giren: kurus(giren),
    geriOdenen: kurus(geriOdenen),
    mahsup: kurus(mahsup),
    odenenFaizVergi: kurus(odenenFaizVergi),
    kalanBorc: borcMu(tur) ? kurus(giren - geriOdenen - mahsup) : null,
    sermayeKatkisi: kurus(tur === "SERMAYE" ? giren : tur === "ORTAK_BORCU" ? mahsup : 0),
    planliGiris: kurus(planliGiris),
    planliCikis: kurus(planliCikis),
  };
}
