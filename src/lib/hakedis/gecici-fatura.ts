/**
 * ============================================================================
 *  GEÇİCİ FATURA NUMARASI — «.» SATIRININ TERFİSİ (K325-④, 13.10.2026)
 * ----------------------------------------------------------------------------
 *  Hepsiburada aynı kesintiyi (komisyon · kargo · tahsilat · kampanya) önce
 *  fatura numarası YERİNE «.» ile, birkaç gün sonra gerçek fatura numarasıyla
 *  (`HD4…`) yeniden veriyor. Satır anahtarı `fatura no | sipariş no | ham tip`
 *  olduğu için (`satirAnahtari`) ikinci geliş YENİ satır sayılıyor ve kesinti
 *  İKİ KEZ yazılıyordu.
 *
 *  ÖLÇÜLDÜ (canlı, salt okuma, 13.10.2026): 349 «.» satırı, hepsi ödenmemiş,
 *  21.09–08.10 arasında yazılmış; 348'inin aynı sipariş · ham tip · tutarda
 *  gerçek numaralı EŞİ var. 20.10 HB ödemesi ekranda ₺70.282,67 (235 kalem);
 *  kopyalar ayıklanınca ₺75.970,90 (197 kalem) = HB paneli, kuruşuna.
 *
 *  KARAR KURALI — eşleşme ölçütü sipariş no + HAM tip + tutar (kuruşuna):
 *  · gelen satır GERÇEK numaralı, ödenmemiş bir «.» eşi var → «.» satırı
 *    gerçek numaraya TERFİ eder (yeni satır yazılmaz);
 *  · gelen satır «.» ve gerçek numaralı eşi zaten var → ATLANIR;
 *  · aksi hâlde YENİ satır.
 *  ⚠ Tutar FARKLIYSA eş sayılmaz: aynı siparişte aynı tipte iki farklı kesinti
 *  olabilir (ölçüldü: 5 «.» satırının aynı tipte farklı tutarlı gerçek eşi var).
 *  ⚠ Ödenmiş «.» satırı terfi etmez: ödendi bilgisi o satırın kendi kaydıdır.
 *  Ölçümde «.» satırlarının HİÇBİRİ ödenmiş değildi.
 * ============================================================================
 */

/** Hepsiburada'nın fatura numarası henüz atanmamış kesintide yazdığı yer tutucu. */
export const GECICI_FATURA_NO = ".";

export type MevcutHakedisSatiri = {
  id: string;
  externalId: string;
  orderNo: string | null;
  rawType: string | null;
  amount: number;
  paidAt: Date | null;
};

export type GelenHakedisSatiri = {
  externalId: string;
  siparisNo: string | null;
  hamTip: string;
  tutar: number;
};

export type GeciciFaturaKarari =
  | { tur: "YENI" }
  | { tur: "TERFI"; hedefId: string }
  | { tur: "ATLA"; esId: string };

const esMi = (m: MevcutHakedisSatiri, g: GelenHakedisSatiri) =>
  g.siparisNo !== null &&
  m.orderNo === g.siparisNo &&
  m.rawType === g.hamTip &&
  Math.round(m.amount * 100) === Math.round(g.tutar * 100);

/**
 * Gelen satır için karar. `kullanilanlar`: aynı koşumda terfi hedefi olarak
 * zaten seçilmiş satırlar — bir «.» satırı iki gelen satıra birden terfi edemez.
 */
export function geciciFaturaKarari(
  gelen: GelenHakedisSatiri,
  mevcutlar: readonly MevcutHakedisSatiri[],
  kullanilanlar: ReadonlySet<string> = new Set(),
): GeciciFaturaKarari {
  if (gelen.siparisNo === null) return { tur: "YENI" };
  if (gelen.externalId === GECICI_FATURA_NO) {
    const es = mevcutlar.find((m) => m.externalId !== GECICI_FATURA_NO && esMi(m, gelen));
    return es ? { tur: "ATLA", esId: es.id } : { tur: "YENI" };
  }
  const hedef = mevcutlar.find(
    (m) => m.externalId === GECICI_FATURA_NO && m.paidAt === null && !kullanilanlar.has(m.id) && esMi(m, gelen),
  );
  return hedef ? { tur: "TERFI", hedefId: hedef.id } : { tur: "YENI" };
}

/**
 * TEMİZLİK ÖLÇÜTÜ — yeniden hesaplanabilir (anayasa: geri alma yolu saklanan
 * listeye değil ölçüte dayanır). Bir «.» satırı KOPYADIR ⇔ ödenmemiş ve aynı
 * sipariş · ham tip · tutarda gerçek numaralı eşi var. Çekimin «ATLA» kararıyla
 * AYNI eşleşme (`esMi`) — iki yerde iki ölçüt olmaz.
 */
export function geciciKopyaMi(
  satir: MevcutHakedisSatiri,
  ayniSiparistekiler: readonly MevcutHakedisSatiri[],
): boolean {
  if (satir.externalId !== GECICI_FATURA_NO || satir.paidAt !== null || satir.orderNo === null) return false;
  const gelenGibi: GelenHakedisSatiri = {
    externalId: satir.externalId,
    siparisNo: satir.orderNo,
    hamTip: satir.rawType ?? "",
    tutar: satir.amount,
  };
  return ayniSiparistekiler.some((m) => m.id !== satir.id && m.externalId !== GECICI_FATURA_NO && esMi(m, gelenGibi));
}
