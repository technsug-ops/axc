/**
 * KASA SESİ İMLECİ — SAF (15.10.2026). İmleç SUNUCUNUN saatidir; bu karar
 * yeni sipariş sayımının hangi aralıkta yapılacağını söyler.
 *  · imleç yok / bozuk / gelecekte / 24 saatten eski → TABAN (sayılmaz, ses çalmaz):
 *    bir gün kapalı kalan sekme açılınca yüz siparişlik kasa sesi çalmasın.
 *  · aksi hâlde (imleç, şimdi] aralığı sayılır.
 * Ayrı dosyada: «use server» dosyası sabit/saf fonksiyon dışa aktaramaz (30.08 vakası).
 */
export const KASA_IMLEC_TAVANI_MS = 24 * 3600_000;

export function kasaImleciKarari(imlecIso: string | null, simdi: Date): { tur: "TABAN" } | { tur: "SAY"; imlec: Date } {
  if (!imlecIso) return { tur: "TABAN" };
  const imlec = new Date(imlecIso);
  if (Number.isNaN(imlec.getTime()) || imlec > simdi || simdi.getTime() - imlec.getTime() > KASA_IMLEC_TAVANI_MS) return { tur: "TABAN" };
  return { tur: "SAY", imlec };
}
