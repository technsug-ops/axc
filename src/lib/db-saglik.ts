/**
 * ============================================================================
 *  VERİTABANI SAĞLIK SONDASI (K202 SORUN A)
 * ----------------------------------------------------------------------------
 *  ⛔ NİYE VAR: `yedek:dogrula`nın GERÇEK TUR bölümü (yedek al → boz → geri
 *  yükle) DB kapalıyken 47 tabloyu tek tek Prisma'nın havuz zaman aşımına
 *  (~10s) çarptırıp 493,8 saniye (8+ dakika) kaybediyordu — ve sonunda
 *  KIRMIZI yanıyordu. Ölçüldü 09.09.2026 (K202): bilgisayar kapanmasından
 *  sonra yerel MySQL bir daha başlatılmamıştı, tur bunu ancak 47. denemenin
 *  sonunda söylüyordu.
 *
 *  Bu sonda TEK bir hızlı TCP bağlantı denemesiyle DB'nin AÇIK olup
 *  olmadığını Prisma'nın havuzuna hiç dokunmadan, saniyeler içinde öğrenir.
 *
 *  ⚠ PRISMA ÜZERİNDEN DEĞİL, DOĞRUDAN TCP: Prisma'nın kendi bağlantı zaman
 *  aşımı ~10s ve global bir ayar; tek bir çağrı için kısaltılamaz. Ham
 *  `net.connect`, bağlanır/reddedilir/zaman aşımına uğrar — üçü de
 *  milisaniyeler-saniyeler içinde kesinleşir.
 * ============================================================================
 */
import { connect } from "node:net";

/**
 * `DATABASE_URL` biçimindeki bir bağlantı dizesinden host:port ayıklar.
 * Ayıklanamazsa `null` döner — çağıran taraf bunu "sağlıksız" saymalıdır,
 * çünkü ölçülemeyen bir adres var sayılamaz.
 */
export function dbAdresiAyikla(
  baglantiDizesi: string,
): { host: string; port: number } | null {
  try {
    const u = new URL(baglantiDizesi);
    if (!u.hostname) return null;
    const port = u.port ? Number(u.port) : 3306;
    if (!Number.isFinite(port) || port <= 0) return null;
    return { host: u.hostname, port };
  } catch {
    return null;
  }
}

/**
 * Tek hızlı TCP bağlantı denemesi. Bağlanırsa `true`; reddedilirse, zaman
 * aşımına uğrarsa ya da adres ayıklanamazsa `false` — ASLA fırlatmaz, çağıran
 * taraf her durumda net bir cevap alır (bir `try/catch` zorunlu kılınmaz).
 */
export function dbSaglikliMi(
  baglantiDizesi: string,
  zamanAsimiMs = 2000,
): Promise<boolean> {
  const adres = dbAdresiAyikla(baglantiDizesi);
  if (!adres) return Promise.resolve(false);

  return new Promise((resolve) => {
    const soket = connect({
      host: adres.host,
      port: adres.port,
      timeout: zamanAsimiMs,
    });
    let bitti = false;
    const bitir = (sonuc: boolean) => {
      if (bitti) return;
      bitti = true;
      soket.removeAllListeners();
      soket.destroy();
      resolve(sonuc);
    };
    soket.once("connect", () => bitir(true));
    soket.once("timeout", () => bitir(false));
    soket.once("error", () => bitir(false));
  });
}
