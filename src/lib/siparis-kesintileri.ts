/**
 * ============================================================================
 *  SİPARİŞ BAŞINA KESİNTİ KURALLARI — TEK GÖVDE (K116①, 31.08.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ NİYE AYRILDI: bu seçim AYNI ANDA İKİ YERDE yazılıydı —
 *  `satis.ts` (yeni satış) ve `kar-yeniden.ts` (yeniden hesap). İkisi de
 *  koda göre tekilleştirip `PER_SALE | PER_PACKAGE` süzüyordu. Biri kaysaydı
 *  BİR YOL çift sabit gider yazar, öteki yazmazdı — ve fark ancak aynı
 *  satışı iki yoldan geçirip karşılaştıran biri tarafından görülürdü.
 *  _(Anayasa: "düzeltmenin çaresi dosya listesi değil, tek gövdedir".)_
 *
 *  ── ⛔ KORUNAN DEĞİŞMEZ: SİPARİŞ BAŞINA KESİNTİ BİR KEZ ────────────────
 *  Anayasa: "Trendyol: 13,19 TL sabit gider, SİPARİŞ BAŞINA BİR KEZ (kalem
 *  sayısından bağımsız)"; Hepsiburada'nın ₺12,60 hizmet bedeli de öyle.
 *
 *  ⚠ VE BU BUGÜN GERÇEK BİR RİSK: ölçüldü (31.08.2026, canlı) — aynı satışta
 *  aynı varyanttan BİRDEN ÇOK SATIR olan **86 satış** var (TY içe aktarması
 *  çok adedi çok satıra çeviriyor). Kesinti kalem başına uygulansaydı o 86
 *  satışta sabit gider İKİ KEZ kesilir ve NET olduğundan DÜŞÜK çıkardı.
 *  Bugün doğru çalışıyor (ölçüldü: SABIT_GIDER 33 · HIZMET_BEDELI 4 ·
 *  ODEME_GIDERI 4 satışın HİÇBİRİNDE ikinci satır yok) — ama korumasızdı.
 *
 *  ── ⚠ İKİ KAPSAM DA ALINIR — `PER_SALE` ve `PER_PACKAGE` ──────────────
 *  Süzgeç yalnız `PER_SALE` yazsaydı, paket başına kural sessizce DÜŞERDİ
 *  ve kesinti hiç uygulanmazdı: kâr daha da şişerdi.
 *  _("Tip listesi değil, bağ" dersinin kapsam hâli.)_
 *
 *  ⭐ SAF: veritabanına gitmez. Bekçi kaynağı taramak yerine gövdeyi ÇAĞIRIP
 *  değerini ölçüyor.
 * ============================================================================
 */

/** Decimal alanları dize/sayı olabilir; gövde ikisini de kabul eder. */
type HamOran = { toString(): string } | number | null | undefined;

export type KesintiKurali = {
  code: string;
  scope: string;
  basis: string;
  rate?: HamOran;
  amount?: HamOran;
};

export type SiparisKesintiKurali = {
  code: string;
  basis: "FIXED" | "SALE_AMOUNT";
  rate: number | null;
  amount: number | null;
  paketBasina: boolean;
};

function sayi(ham: HamOran): number | null {
  if (ham === null || ham === undefined) return null;
  const d = Number(ham.toString());
  return Number.isFinite(d) ? d : null;
}

/**
 * Aynı koddan birden fazla sürüm varsa EN YENİSİ geçerlidir.
 *
 * ⚠ SIRA ÇAĞIRANDAN GELİR: kurallar `validFrom desc` sıralı gelmeli. Gövde
 * kendi sıralamasını YAPMAZ — iki yerde iki sıralama ölçütü doğmasın diye
 * (sorgu zaten `orderBy` ile geliyor ve indeksi var).
 */
export function gecerliKurallar<T extends KesintiKurali>(
  kurallar: readonly T[],
): Map<string, T> {
  const gecerli = new Map<string, T>();
  for (const k of kurallar) if (!gecerli.has(k.code)) gecerli.set(k.code, k);
  return gecerli;
}

/**
 * Sipariş başına uygulanacak kesintiler — KOD BAŞINA EN FAZLA BİR KURAL.
 */
export function siparisKesintiKurallari(
  kurallar: readonly KesintiKurali[],
): SiparisKesintiKurali[] {
  return [...gecerliKurallar(kurallar).values()]
    .filter((k) => k.scope === "PER_SALE" || k.scope === "PER_PACKAGE")
    .map((k) => ({
      code: k.code,
      basis: k.basis === "FIXED" ? ("FIXED" as const) : ("SALE_AMOUNT" as const),
      rate: sayi(k.rate),
      amount: sayi(k.amount),
      paketBasina: k.scope === "PER_PACKAGE",
    }));
}

/**
 * Komisyon KDV oranı — aynı tekilleştirmeden okunur.
 *
 * ⚠ AYRI BİR `Map` KURULMUYOR: iki tekilleştirme olsaydı biri "en yeni",
 * öteki "ilk gelen" olabilir ve komisyon KDV'si başka bir sürümden okunurdu.
 */
export function komisyonKdvOrani(
  kurallar: readonly KesintiKurali[],
): number | null {
  const kural = gecerliKurallar(kurallar).get("KOMISYON_KDV");
  const oran = sayi(kural?.rate);
  /** ⚠ SIFIR ORAN "KDV YOK" DEMEKTİR ve `null`dan farklıdır — ama eski
   *  davranış `rate` yoksa `null` döndürüyordu; korunuyor. */
  return oran === null || oran === 0 ? null : oran;
}
