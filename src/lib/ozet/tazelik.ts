/**
 * ============================================================================
 *  GÜNLÜK ÖZET TAZELİĞİ (K-OZET) — `panel/ty-cekim-yasi.ts` İLE AYNI DESEN
 * ----------------------------------------------------------------------------
 *  "Kaçışın kendisi görünür kılınır" — üretim koşmadıysa (ya da başarısız
 *  olduysa) ekran bunu SÖYLER, eski günün özetini yeni gibi göstermez.
 *
 *  ⚠ EŞİK RUTİNE BAĞLI, AMA HENÜZ ÖLÇÜLMEDİ — açıkça beyan edilir.
 *  Rutin GÜNDE BİR (birincil cron-job.org + yedek GitHub Actions, ikisi de
 *  günlük). `TY_CEKIM_ESIK_SAAT` dersinin (K189) aynısı: periyot değişirse
 *  bu satır da değişmeli. Bugün canlı koşum geçmişi YOK, bu yüzden eşik
 *  "1 gün + koşum payı" gerekçesiyle KONULDU, dağılımdan ÖLÇÜLMEDİ — ilk
 *  birkaç haftalık gerçek koşum verisiyle (`AiOzet.createdAt` aralıkları)
 *  yeniden ölçülüp gerekirse değiştirilir.
 * ============================================================================
 */
export const OZET_PERIYODU_SAAT = 24;
/** 1 gün + %50 koşum payı — TY'deki "4× periyot" ölçümünün burada karşılığı henüz yok, bu yüzden daha geniş bir pay seçildi. */
export const OZET_ESIK_SAAT = 36;

export type OzetTazeligi =
  | { durum: "YOK"; saat: null }
  | { durum: "TAZE"; saat: number }
  | { durum: "ESKI"; saat: number };

/** SAF: son üretim anından tazelik durumuna. Saatini kendisi okumaz. */
export function ozetTazeligi(sonUretim: Date | null, an: Date): OzetTazeligi {
  if (sonUretim === null) return { durum: "YOK", saat: null };
  const saat = (an.getTime() - sonUretim.getTime()) / 3_600_000;
  return saat > OZET_ESIK_SAAT ? { durum: "ESKI", saat } : { durum: "TAZE", saat };
}
