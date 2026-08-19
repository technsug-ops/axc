/**
 * ============================================================================
 *  "DOĞRULANDI" — İSTİSNANIN İŞARETLENMESİ
 * ----------------------------------------------------------------------------
 *  K6, mimar onayı 19.08.2026. Doğuran vaka: Philips OneBlade `₺27,16`.
 *  Sistem "imkânsız" dedi, Halil HB sipariş geçmişinden doğruladı —
 *  ürün **hediye kuponuyla** alınmış, kasadan fiilen 27,16 çıkmış.
 *  Rakam gerçek, `₺981` kâr gerçek.
 *
 *  Böyle bir kayıt işaretlenemezse uyarı HİÇ SÖNMEZ; sönmeyen uyarı
 *  okunmaz olur ve rozetin tamamına olan güveni götürür.
 *
 *  ── SUSTURMA KAYDIN HÂLİNE BAĞLANIR ─────────────────────────────────────
 *  ⚠ TASARIMIN KALBİ BURASI. Doğrulama kaydı KALICI OLARAK muaf tutmaz;
 *  kaydın O GÜNKÜ DEĞERLERİNE (`net2 · maliyet · ciro`) damgalanır.
 *  Değerlendirme sırasında bugünkü değerler damgadakiyle birebir
 *  tutuyorsa doğrulama geçerlidir; **tutmuyorsa düşer ve uyarı yeniden
 *  yanar.**
 *
 *  Kalıcı muafiyet, tam kaçındığımız şeyi üretirdi: susturulmuş bir kayıt
 *  sonradan GERÇEKTEN bozulduğunda hiç konuşmaz. Doğrulanan şey kayıt
 *  değil, **o kaydın o hâlidir.**
 *
 *  ── KURUŞUNA EŞİTLİK ────────────────────────────────────────────────────
 *  Tolerans YOK (mimar kararı). Tolerans, "ne kadar değişirse yeniden
 *  sorulur" diye İKİNCİ bir uydurma eşik açardı. Maliyet kendiliğinden
 *  değişmez; değiştiyse zaten yeniden bakılmalıdır.
 *
 *  ── KAPSAM DAR ──────────────────────────────────────────────────────────
 *  ⚠ YALNIZ `veriSupheli` doğrulanabilir. `supheliOran` (2,70 vakası)
 *  gerçek bir hatadır ve "doğrulandı" diye susturulması ~₺2.300'lük bir
 *  sapmayı gömmek olurdu. Genel bir "her uyarıyı sustur" düğmesi, uyarı
 *  merkezini kendi kendini iptal eden bir sisteme çevirir.
 *
 *  ── YENİ TABLO AÇILMADI ─────────────────────────────────────────────────
 *  `AuditLog` taşıyor: `action` (indeksli) · `targetType`/`targetId` ·
 *  `detail` · `userId` · `createdAt`. Doğrulanmış kayıt sayısı küçük bir
 *  kümedir; tek sorguda çekilip `Set` kuruluyor. _(18.08.2026 dersi:
 *  şema değişikliği en pahalı çözümdür.)_
 * ============================================================================
 */

/** `AuditLog.action` — iz 20.08.2026'da açıldı (bkz. `IZ_DOGUM_TARIHI`). */
export const DOGRULAMA_EYLEMI = "VERI_DOGRULANDI";

/**
 * ⚠ İZİN DOĞUM TARİHİ BEYAN EDİLİR (18.08.2026 kuralı). Bu tarihten
 * öncesi için "doğrulanmamış" bir hüküm DEĞİLDİR — mekanizma yoktu.
 */
export const IZ_DOGUM_TARIHI = "20.08.2026";

/**
 * Doğrulama sebepleri. Serbest metin DEĞİL: sebepsiz doğrulama, üç ay
 * sonra "bunu neden geçmiştik" sorusuna cevap bırakmaz.
 */
export const DOGRULAMA_SEBEPLERI = [
  "KUPON_INDIRIM",
  "HEDIYE_NUMUNE",
  "OZEL_ANLASMA",
  "DIGER",
] as const;
export type DogrulamaSebebi = (typeof DOGRULAMA_SEBEPLERI)[number];

export function sebepGecerliMi(deger: string): deger is DogrulamaSebebi {
  return (DOGRULAMA_SEBEPLERI as readonly string[]).includes(deger);
}

/** `DIGER` seçildiğinde not ZORUNLU — "diğer", açıklamasız bir cevap değildir. */
export function notZorunluMu(sebep: DogrulamaSebebi): boolean {
  return sebep === "DIGER";
}

export type Damga = {
  net2: number;
  maliyet: number;
  ciro: number;
};

/**
 * Kaydın o günkü hâli — kuruşa yuvarlanmış.
 *
 * ⚠ YUVARLAMA ŞART: `Decimal` metinden gelen değerler kayan noktaya
 * çevrilince `981.1666999...` gibi kuyruklar üretebiliyor ve iki okuma
 * arasında son basamak oynayabiliyor. Kuruş, paranın gerçek çözünürlüğü;
 * kuyruk yüzünden doğrulamanın düşmesi "susturma haksız yere kalktı"
 * demek olurdu. (Tolerans DEĞİL — birim seçimi.)
 */
export function damgaKur(d: Damga): Damga {
  const k = (n: number) => Math.round(n * 100) / 100;
  return { net2: k(d.net2), maliyet: k(d.maliyet), ciro: k(d.ciro) };
}

/**
 * Susturma hâlâ geçerli mi?
 *
 * ⚠ ÜÇ ALAN DA TUTMALI. Yalnız maliyete bakmak yetmezdi: satış fiyatı
 * ya da komisyon değişince NET-2 kayar ve kayıt yeni bir şey söyler.
 */
export function susturmaGecerliMi(damga: Damga, bugunku: Damga): boolean {
  const a = damgaKur(damga);
  const b = damgaKur(bugunku);
  return a.net2 === b.net2 && a.maliyet === b.maliyet && a.ciro === b.ciro;
}

/** `AuditLog.detail` içeriği — okunabilir ve yeniden kurulabilir. */
export type DogrulamaKaydi = {
  damga: Damga;
  sebep: DogrulamaSebebi;
  not: string | null;
};

export function kaydiCoz(detail: string | null): DogrulamaKaydi | null {
  if (!detail) return null;
  try {
    const h = JSON.parse(detail) as Partial<DogrulamaKaydi>;
    const d = h.damga;
    if (
      !d ||
      typeof d.net2 !== "number" ||
      typeof d.maliyet !== "number" ||
      typeof d.ciro !== "number"
    ) {
      return null;
    }
    if (!h.sebep || !sebepGecerliMi(h.sebep)) return null;
    return { damga: d, sebep: h.sebep, not: h.not ?? null };
  } catch {
    /**
     * ⚠ BOZUK KAYIT SUSTURMAZ. Çözülemeyen bir iz, "doğrulanmış" sayılsaydı
     * bozuk JSON bir kaydı sonsuza kadar sessizleştirebilirdi.
     */
    return null;
  }
}
