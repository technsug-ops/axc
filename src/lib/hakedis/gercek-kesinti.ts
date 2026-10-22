/**
 * ============================================================================
 *  HAKEDİŞTEN GERÇEK KESİNTİ — HEPSİBURADA (K325-⑦, kullanıcı «evet» 22.10.2026)
 * ----------------------------------------------------------------------------
 *  Kullanıcı kararı 07.10: «Esas olan hakedişte kesilen.» Kargo için uygulanmıştı;
 *  hizmet bedeli · stopaj · ödeme gideri tahminden hesaplanmaya devam ediyordu ve
 *  ölçüm (13.10, 611 sipariş) NET-2'yi ≈ ₺12.800 DÜŞÜK gösteriyordu: hizmet bedeli
 *  576 siparişte fazladan düşülüyor (HB kesmiyor), kampanyalı siparişte stopaj ve
 *  ödeme gideri İNDİRİMSİZ tutardan hesaplanıyordu (HB indirimliden kesiyor).
 *
 *  GERÇEK TUTAR ZATEN DEFTERDE (`SettlementItem`) — yeni sütun yok; kâr hesabı
 *  her seferinde buradan TÜRETİR (anayasa: şema değişikliği en pahalı çözüm).
 *
 *  ÖLÇÜLDÜ 22.10.2026 (canlı, salt okuma — hangi satır ne zaman geliyor):
 *   · STOPAJ          sipariş satırıyla AYNI AN, AYNI fatura (719/719)
 *   · TAHSILAT_BEDELI ayrı fatura; 528/728 aynı an, en geç 30,6 gün sonra
 *   · HIZMET_BEDELI   ayrı fatura; YALNIZ 46 satışta; 34/43 aynı an, en geç 30,6 gün
 *     sonra · sipariş satırı 30 günden eski olup hizmet bedeli HİÇ gelmeyen 519 satış
 *   ⇒ Sipariş satırı yoksa HİÇBİRİ verilmez (tahmin kalır). Hizmet bedeli: satır
 *     varsa gerçek; yoksa sipariş satırı ≥ 31 gün (ölçülen en geç 30,6) → 0 (kesilmedi);
 *     arada tahmin kalır. Ödeme gideri: satır varsa gerçek, yoksa tahmin.
 *  ⚠ İADELİ SATIŞA DOKUNULMAZ (`*_IADE` / `IADE_TUTARI` satırı varsa): iade kesintileri
 *    `ReturnFee`te ayrı işleniyor; karıştırmak çift sayım riski — tahmin kalır, beyanlı.
 *  ⚠ «.» GEÇİCİ FATURA: aynı kod + tutarla gerçek numaralı eşi varsa İKİNCİ KEZ sayılmaz
 *    (K325-④; cron artık terfi ettiriyor ama eski satır kalmış olabilir).
 * ============================================================================
 */

export const HIZMET_BEDELI_GECIKME_TAVANI_GUN = 31;
const GUN_MS = 24 * 60 * 60 * 1000;

export type HakedisSatiri = { code: string; amount: number; externalId: string; createdAt: Date };

/** Motorun anladığı adlarla (SaleFee kodu); hepsi POZİTİF, KDV DAHİL tutarlar. */
export type GercekKesintiler = { STOPAJ?: number; ODEME_GIDERI?: number; HIZMET_BEDELI?: number };

const IADE_KODU = /(^IADE_TUTARI$|_IADE$)/;

/** Saf: bir satışın hakediş satırları + an → gerçek kesintiler (yoksa boş nesne). */
export function hakedisGercekKesintileri(satirlar: readonly HakedisSatiri[], simdi: Date): GercekKesintiler {
  if (satirlar.some((s) => IADE_KODU.test(s.code))) return {};
  const siparis = satirlar.filter((s) => s.code === "SIPARIS_TUTARI");
  if (siparis.length === 0) return {};

  /* «.» satırı, aynı kod + tutarla gerçek numaralı eşi varsa sayılmaz. */
  const gecerli = satirlar.filter(
    (s) => !(s.externalId === "." && satirlar.some((t) => t !== s && t.externalId !== "." && t.code === s.code && Math.round(t.amount * 100) === Math.round(s.amount * 100))),
  );
  const topla = (kod: string) => {
    const k = gecerli.filter((s) => s.code === kod);
    return k.length === 0 ? null : Math.round(k.reduce((t, s) => t + Math.abs(s.amount), 0) * 100) / 100;
  };

  const sonuc: GercekKesintiler = {};
  const stopaj = topla("STOPAJ");
  if (stopaj !== null) sonuc.STOPAJ = stopaj;
  const odeme = topla("TAHSILAT_BEDELI");
  if (odeme !== null) sonuc.ODEME_GIDERI = odeme;
  const hizmet = topla("HIZMET_BEDELI");
  if (hizmet !== null) sonuc.HIZMET_BEDELI = hizmet;
  else {
    const ilk = Math.min(...siparis.map((s) => s.createdAt.getTime()));
    if (simdi.getTime() - ilk >= HIZMET_BEDELI_GECIKME_TAVANI_GUN * GUN_MS) sonuc.HIZMET_BEDELI = 0;
  }
  return sonuc;
}

/**
 * Saf: kayıtlı kesinti dökümü (SaleFee) gerçek tutarlarla KURUŞUNA uyuşmayan kodlar.
 * Tazeleme kümesi bu HÂLDEN türetilir (saklanan liste değil): yeni satır geldi mi,
 * 31 gün geçti mi — ikisi de burada «uyuşmuyor» olarak görünür; tazelenince susar.
 * `STOPAJ` kalem satırlarının TOPLAMIYLA kıyaslanır (motor gerçeği kalemlere paylaştırır).
 */
export function kesintiFarki(
  kayitli: readonly { code: string; amount: number }[],
  gercek: GercekKesintiler,
): (keyof GercekKesintiler)[] {
  const kurus = (n: number) => Math.round(n * 100);
  const farkli: (keyof GercekKesintiler)[] = [];
  for (const kod of ["STOPAJ", "ODEME_GIDERI", "HIZMET_BEDELI"] as const) {
    const g = gercek[kod];
    if (g === undefined) continue;
    const satirlar = kayitli.filter((k) => k.code === kod);
    /* Kural hiç yazmamışsa (satır yok) ve gerçek 0 ise uyuşur; satır yok ama gerçek > 0 ise motor
       zaten o kodu üretmiyor — tazelemek bir şey değiştirmez, aday sayılmaz. */
    if (satirlar.length === 0) continue;
    if (kurus(satirlar.reduce((t, k) => t + k.amount, 0)) !== kurus(g)) farkli.push(kod);
  }
  return farkli;
}
