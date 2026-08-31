/**
 * ============================================================================
 *  BAĞLANTI TANISI — HÜKÜM GÖVDESİ (SAF)
 * ----------------------------------------------------------------------------
 *  ⛔ NİYE AYRI DOSYA: bu mantık YALNIZ KESİNTİ ANINDA çalışır — yani tam da
 *  kimsenin hata ayıklamaya vakti olmadığı anda. Ölçüm aracının içinde
 *  kalsaydı sağlıklı yol her koşumda sınanır, KESİNTİ YOLU hiç sınanmazdı.
 *  _(Anayasa: "sınanmayan dal, sınanmamış koddur".)_
 *
 *  ⭐ SAF: ağ yok, veritabanı yok, saat yok. Girdi verilir, hüküm döner —
 *  bekçi çağırıp DEĞERİNİ ölçüyor.
 *
 *  ⚠ YANLIŞ HÜKÜM, HÜKÜMSÜZLÜKTEN KÖTÜDÜR: kesintide yanlış yöne gönderir.
 *  Bu yüzden tanınmayan tablo "bilinmiyor" der, bir sebep UYDURMAZ.
 * ============================================================================
 */

/** 31.08.2026 kesintisinde ÖLÇÜLEN değerler — kıyas tabanı, uydurma değil. */
export const TABAN = {
  /** Sunucunun `connect_timeout` değeri; çöküşler tam bu sürede oldu. */
  cokusSuresiSn: 10.15,
  /** Sıcak lambda yanıtı — var olan bağlantı çalışıyordu. */
  sicakLambdaSn: 0.45,
} as const;

export type TaniOlcumu = { durum: number | "hata"; sure: number };

export type TaniGirdisi = {
  olcumler: readonly TaniOlcumu[];
  /** Bizim kullanıcımızın açık bağlantısı; ölçülemediyse `null`. */
  acikBaglanti: number | null;
  /** `max_user_connections`; ölçülemediyse `null`. */
  kota: number | null;
  /** Ölçüm sırasında düşen bağlantı artışı; ölçülemediyse `null`. */
  abortFarki: number | null;
};

export type TaniHukmu =
  /** Hiç HTTP ölçümü koşmadı — hüküm YOK (temiz DEĞİL). */
  | { sinif: "OLCUM_YOK" }
  | { sinif: "SAGLIKLI"; enYavasSn: number; kotaYakin: boolean }
  /** 31.08 imzası: sıcak bağlantı çalışıyor, YENİ bağlantı zaman aşımında. */
  | { sinif: "EL_SIKISMASI"; sicak: number; zamanAsimi: number }
  /** Her istek zaman aşımında — veritabanı tamamen erişilemez. */
  | { sinif: "TAM_KESINTI"; zamanAsimi: number }
  /** Kota dolu — yeni bağlantıya yer yok. */
  | { sinif: "KOTA_DOLU"; acik: number; kota: number }
  /** Düşen var ama bilinen imzaların hiçbirine uymuyor. */
  | { sinif: "TANINMADI"; dusen: number; temiz: number };

/**
 * ⚠ SIRA ÖNEMLİ: en AYIRT EDİCİ imza önce sınanır. "Kota dolu" en kesin
 * olanıdır (sayı ya doludur ya değildir); ondan sonra el sıkışması imzası;
 * en son "tanınmadı". Ters sırada, kota dolu bir tablo "tanınmadı"ya
 * düşebilirdi.
 */
export function baglantiHukmu(g: TaniGirdisi): TaniHukmu {
  if (g.olcumler.length === 0) return { sinif: "OLCUM_YOK" };

  const temiz = g.olcumler.filter((o) => o.durum === 200);
  const dusen = g.olcumler.filter((o) => o.durum !== 200);

  if (dusen.length === 0) {
    const enYavas = Math.max(...g.olcumler.map((o) => o.sure));
    /**
     * ⚠ SAĞLIKLIYKEN DE KOTA YAKINLIĞI SÖYLENİR. "Şu an çalışıyor" ile
     * "yük altında da çalışır" ayrı şeyler; sessiz kalmak yanlış güven verir.
     */
    const kotaYakin =
      g.acikBaglanti !== null && g.kota !== null && g.kota > 0
        ? g.acikBaglanti > g.kota * 0.6
        : false;
    return { sinif: "SAGLIKLI", enYavasSn: enYavas, kotaYakin };
  }

  /** ⛔ KOTA ÖNCE — sayıyla kanıtlanır, yoruma açık değil. */
  if (g.acikBaglanti !== null && g.kota !== null && g.kota > 0 && g.acikBaglanti >= g.kota) {
    return { sinif: "KOTA_DOLU", acik: g.acikBaglanti, kota: g.kota };
  }

  /**
   * ⚠ ZAMAN AŞIMI PENCERESİ ±1,5 sn. Dar tutulursa (±0,1) gerçek kesinti
   * "tanınmadı"ya düşer; geniş tutulursa (±5) yavaş ama başarılı yanıtlar
   * zaman aşımı sanılır. 10,15'in etrafında 1,5 sn, ölçülen dağılımın
   * (10,15–10,45) tamamını kapsıyor ve sıcak yanıttan (0,45) uzak duruyor.
   */
  const zamanAsimi = dusen.filter(
    (o) => Math.abs(o.sure - TABAN.cokusSuresiSn) < 1.5,
  );
  const sicak = temiz.filter((o) => o.sure < TABAN.sicakLambdaSn * 3);

  if (zamanAsimi.length > 0 && sicak.length > 0) {
    return { sinif: "EL_SIKISMASI", sicak: sicak.length, zamanAsimi: zamanAsimi.length };
  }
  if (zamanAsimi.length === g.olcumler.length) {
    return { sinif: "TAM_KESINTI", zamanAsimi: zamanAsimi.length };
  }
  /** ⛔ SEBEP UYDURULMAZ — tanınmayan tablo öyle raporlanır. */
  return { sinif: "TANINMADI", dusen: dusen.length, temiz: temiz.length };
}
