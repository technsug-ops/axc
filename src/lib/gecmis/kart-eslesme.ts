import { harfleriSadelestir } from "./ay";

/**
 * ============================================================================
 *  EXCEL KARTI → SİSTEM KARTI EŞLEŞTİRME ÖNERİSİ
 * ----------------------------------------------------------------------------
 *  ⚠ BU BİR ÖNERİDİR, KARAR DEĞİL. Kullanıcı her kartı GÖREREK onaylar.
 *
 *  ── GÜN EŞLEŞTİRMESİ NEDEN KULLANILMIYOR (ölçüldü 16.08.2026) ───────────
 *  Excel etiketi kesim gününü taşıyor: "Akbank ( Hasan Akçalı Ayın 7 )".
 *  Cazip bir anahtar gibi duruyor ama ÖLÇÜLDÜ: 10 karttan 4'ünde tutmuyor
 *  ve biri SESSİZCE YANLIŞ eşleşiyor —
 *
 *      Excel "Akbank ( Hasan Akçalı Ayın 7 )"  →  sistemde ayın 7'si
 *      "S.ahmet Garanti" kartı. Doğrusu "Hasan Akbank" (sistemde ayın 9'u).
 *
 *  Hata vermeden, bir kartın 16 aylık geçmişini başka karta yazardı.
 *  Excel'deki günler eskimiş; sistemdeki değerler güncel. BANKA + SAHİP
 *  eşleşmesi 10/10 tutuyor, o yüzden öneri buradan üretiliyor.
 *
 *  ── YİNE DE OTOMATİK DEĞİL ──────────────────────────────────────────────
 *  10/10 tutması "her zaman tutar" demek değildir. Yanlış eşleşme sessiz ve
 *  büyük bir hatadır (bütün bir kartın geçmişi); 10 onay bir defalık iştir.
 *  "Ön-dolu ama düzeltilebilir" deseni (İlke #11 ailesi).
 * ============================================================================
 */

export type SistemKarti = {
  id: string;
  label: string;
  bankName: string | null;
  holderName: string | null;
};

export type EslesmeOnerisi = {
  excelEtiketi: string;
  /** En iyi aday — yoksa null, kullanıcı elle seçer. */
  onerilenKartId: string | null;
  /** 0-100 arası güven. Ekranda gösterilir; düşükse kullanıcı dikkat eder. */
  guven: number;
  /** Öneri neye dayandı — kullanıcı KARARI GEREKÇESİYLE görsün. */
  gerekce: string;
};

/** "Akbank ( Hasan Akçalı Ayın 7 )" → { banka, sahip } */
export function etiketiAyristir(etiket: string): {
  banka: string;
  sahip: string;
} {
  const parantez = /^([^(]*)\(([^)]*)\)/.exec(etiket);
  if (!parantez) return { banka: etiket.trim(), sahip: "" };
  const banka = parantez[1].trim();
  // Sahip kısmından "Ayın 7" gibi gün ifadesi ATILIR: eşleştirmede
  // kullanılmıyor ve isim benzerliğini bozardı.
  const sahip = parantez[2].replace(/Ay[ıi]n\s*\d+/i, "").trim();
  return { banka, sahip };
}

/**
 * AYIRT ETMEYEN KELİMELER — eşleştirmeye girmez.
 *
 * "İş Bankası" ile "Ziraat Bankası"nın ortak yanı "bankası"dır ve bu ortaklık
 * hiçbir şey söylemez. Elenmezse jenerik kelime eşleşmeyi taşır ve yanlış
 * kart önerilir (16.08.2026'da tam bu oldu: "İş Bankası" → "İbrahim Ziraat").
 */
const AYIRT_ETMEYEN = new Set(["bank", "banka", "bankasi", "kart", "karti"]);

/**
 * Karşılaştırma için sadeleştirilmiş kelimeler.
 *
 * ⚠ EN AZ 2 HARF, 3 DEĞİL. Üç harf sınırı "İş Bankası"ndaki AYIRT EDİCİ
 * "iş" kelimesini atıyor ve geriye yalnız jenerik "bankası" kalıyordu.
 * Kısa ama ayırt edici kelimeler Türkçe'de yaygın (iş, en, ak).
 */
function kelimeler(metin: string): string[] {
  return harfleriSadelestir(metin)
    .split(/[^a-z0-9]+/)
    .filter((k) => k.length >= 2 && !AYIRT_ETMEYEN.has(k));
}

/** İki metnin kelime örtüşmesi — 0 ile 1 arası. */
function ortusme(a: string, b: string): number {
  const ka = kelimeler(a);
  const kb = kelimeler(b);
  if (ka.length === 0 || kb.length === 0) return 0;
  let eslesen = 0;
  for (const k of ka) {
    // Tam eşleşme ya da biri diğerini içeriyor ("isbank" ⊂ "is bankasi").
    if (kb.some((x) => x === k || x.includes(k) || k.includes(x))) eslesen++;
  }
  return eslesen / ka.length;
}

/**
 * Bir Excel etiketi için en iyi sistem kartını önerir.
 *
 * BANKA daha ağır basar (%60) çünkü aynı sahibin birden çok kartı olabilir
 * (Seyit Ahmet'in 5 kartı var); SAHİP tek başına ayırt edemez. Banka da tek
 * başına yetmez: iki "Garanti Bankası" kartı farklı sahiplerde.
 */
export function kartOnerisi(
  excelEtiketi: string,
  kartlar: SistemKarti[],
): EslesmeOnerisi {
  const { banka, sahip } = etiketiAyristir(excelEtiketi);

  let enIyi: { kart: SistemKarti; puan: number } | null = null;
  for (const kart of kartlar) {
    const bankaPuani = ortusme(banka, `${kart.bankName ?? ""} ${kart.label}`);
    const sahipPuani = ortusme(sahip, kart.holderName ?? "");
    const puan = bankaPuani * 0.6 + sahipPuani * 0.4;
    if (!enIyi || puan > enIyi.puan) enIyi = { kart, puan };
  }

  /**
   * EŞİK ALTINDA ÖNERİ YOK. Zayıf bir öneri, onay ekranında "herhalde
   * doğrudur" diye geçirilir; boş bırakmak kullanıcıyı DÜŞÜNMEYE zorlar.
   */
  if (!enIyi || enIyi.puan < 0.5) {
    return {
      excelEtiketi,
      onerilenKartId: null,
      guven: Math.round((enIyi?.puan ?? 0) * 100),
      gerekce: "eslesmeYok",
    };
  }

  return {
    excelEtiketi,
    onerilenKartId: enIyi.kart.id,
    guven: Math.round(enIyi.puan * 100),
    gerekce: "bankaVeSahip",
  };
}

/** Bütün etiketler için öneri üretir. */
export function eslesmeOnerileri(
  etiketler: string[],
  kartlar: SistemKarti[],
): EslesmeOnerisi[] {
  return etiketler.map((e) => kartOnerisi(e, kartlar));
}

/**
 * Aynı sistem kartına birden çok Excel kartı önerildi mi.
 *
 * İki Excel kartı aynı sisteme bağlanırsa ikisinden biri MUTLAKA yanlıştır
 * ve `@@unique([cardId, donem])` yüzünden aktarım yarıda patlar. Kullanıcı
 * bunu ONAY EKRANINDA görmeli, hata mesajında değil.
 */
export function cakisanOneriler(oneriler: EslesmeOnerisi[]): string[] {
  const sayac = new Map<string, number>();
  for (const o of oneriler) {
    if (!o.onerilenKartId) continue;
    sayac.set(o.onerilenKartId, (sayac.get(o.onerilenKartId) ?? 0) + 1);
  }
  return [...sayac.entries()].filter(([, n]) => n > 1).map(([id]) => id);
}
