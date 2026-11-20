/**
 * ============================================================================
 *  TEK BAĞLANTI TEŞHİSİ — HAVUZ PES ETTİĞİNDE «NİYE» SORUSU SUNUCUYA SORULUR
 *  (K381, kullanıcı «yaz» 20.11.2026)
 * ----------------------------------------------------------------------------
 *  ÖLÇÜLDÜ 20.11.2026 — yerel deney, AYNI sürücü (mariadb 3.5.3) + AYNI bağdaştırıcı
 *  (`scripts/tmp/havuz-deneyi.ts`): kapalı porta (anında RET) ve cevapsız adrese (KARA
 *  DELİK) atılan sorgu BİREBİR AYNI metinle düştü —
 *      «pool timeout: failed to retrieve a connection from pool after 20050ms
 *       (pool connections: active=0 idle=0 limit=3)»
 *  ve sebep zinciri 45028'de bitiyor; altında ne ECONNREFUSED ne zaman aşımı kodu var.
 *  Yani 18–20.11 kesintilerinin günlüğü KOTA REDDİNİ (1226) ile EL SIKIŞMA TAKILMASINI
 *  (zaman aşımı) AYIRAMAZ. K380'in «10,2 sn = sunucunun connect_timeout'u» okuması da
 *  düzeltildi: o süre havuzun kendi `acquireTimeout`uydu (o gün 10 sn, bugün 20 sn) —
 *  eski gerekçe panoda duruyor, SİLİNMEDİ.
 *
 *  ÇARE: havuz pes ettiği anda (K359 onarım kapısı), havuzdan BAĞIMSIZ tek bir bağlantı
 *  denenir ve sürücünün HAM cevabı günlüğe yazılır:
 *      1226 → KOTA_DOLU        (hesap başına 25)
 *      1040 → SUNUCU_DOLU      (sunucu geneli 500)
 *      1129/1130 → SUNUCU_ENGELI (host blocked / not privileged)
 *      1045 → KIMLIK_REDDI
 *      ECONNREFUSED… → RET     · ETIMEDOUT/45012 → ZAMAN_ASIMI · ENOTFOUND → DNS
 *      BAĞLANDI → yol açık; bozuk olan havuz/kopya (K359 ailesi). O hâlde bizim açık
 *                 bağlantı sayımız ve bu kopyanın KAS'ın gördüğü kaynak IP'si de yazılır.
 *      ASILI    → sürücü dış yarış süresinde hiç cevap vermedi — bu da bir sonuçtur.
 *
 *  ⚠ ÖLÇÜLEN KAYNAĞI TÜKETİR: tek bağlantı, tek sorgu, kapatılır. Bu yüzden yalnız K359
 *  kapısından geçince koşar (kopya başına en çok 30 sn'de bir). Bedeli: zaten düşmüş isteğe
 *  en çok ~5,5 sn eklenir (`TESHIS_ZAMAN_ASIMI_MS` + `ASILI_PAYI_MS` < havuz sabrı 20 sn).
 *  ⛔ PAROLA YAZILMAZ: adres parçalanır, mesajdaki adres ve parola maskelenir.
 *  ⛔ HİÇBİR ŞEY YAZMAZ: `information_schema` okuması yalnız.
 * ============================================================================
 */
import { createConnection, type Connection } from "mariadb";

export type TeshisSinifi =
  | "BAGLANDI"
  | "KOTA_DOLU"
  | "SUNUCU_DOLU"
  | "SUNUCU_ENGELI"
  | "KIMLIK_REDDI"
  | "RET"
  | "ZAMAN_ASIMI"
  | "DNS"
  | "ASILI"
  | "ATLANDI"
  | "DIGER";

export type TeshisSonucu = {
  sinif: TeshisSinifi;
  sureMs: number;
  kod: string | null;
  errno: number | null;
  mesaj: string | null;
  /** BAĞLANDI ise: bizim kullanıcımızın o andaki açık bağlantı sayısı (kota sorusunun cevabı). */
  bizimBaglanti: number | null;
  /** BAĞLANDI ise: KAS'ın bu kopya için gördüğü kaynak IP. */
  kaynak: string | null;
};

/** Sürücüye verilen deneme süresi; havuz sabrının (20 sn) çok altında. */
export const TESHIS_ZAMAN_ASIMI_MS = 5000;
/** Dış yarış payı: sürücü kendi süresinde susarsa «ASILI». */
export const ASILI_PAYI_MS = 500;

/**
 * Tek sorgu, iki cevap: bizim açık bağlantı sayımız (PROCESSLIST yalnız kendi kullanıcımızı
 * gösterir) ve bu bağlantının sunucuda görünen kaynağı. Sıcak tutma ucu da AYNI sorguyu kullanır.
 */
export const BAGLANTI_SAYIM_SORGUSU =
  "SELECT COUNT(*) AS n, (SELECT HOST FROM information_schema.PROCESSLIST WHERE ID = CONNECTION_ID()) AS kaynak FROM information_schema.PROCESSLIST";

/** Saf: «1.2.3.4:56789» → «1.2.3.4»; boş/garip → null. */
export function kaynakIp(host: unknown): string | null {
  if (typeof host !== "string" || host.trim() === "") return null;
  return host.split(":")[0] || null;
}

/** Saf: sürücü hata kodu → sınıf. Bilinmeyen kod UYDURULMAZ, «DIGER» kalır. */
export function teshisSinifi(kod: string | null, errno: number | null): TeshisSinifi {
  if (errno === 1226) return "KOTA_DOLU";
  if (errno === 1040) return "SUNUCU_DOLU";
  if (errno === 1129 || errno === 1130) return "SUNUCU_ENGELI";
  if (errno === 1045) return "KIMLIK_REDDI";
  if (errno === 45012 || kod === "ETIMEDOUT" || kod === "ER_CONNECTION_TIMEOUT") return "ZAMAN_ASIMI";
  if (kod === "ECONNREFUSED" || kod === "ECONNRESET" || kod === "EHOSTUNREACH" || kod === "ENETUNREACH" || kod === "EPIPE") return "RET";
  if (kod === "ENOTFOUND" || kod === "EAI_AGAIN") return "DNS";
  return "DIGER";
}

/** Saf: hata metninden bağlantı adresini ve parolayı siler. */
export function parolasiz(metin: string, parola: string): string {
  let temiz = metin.replace(/mysql:\/\/[^\s@]*@/g, "mysql://***@");
  if (parola.length > 0) temiz = temiz.split(parola).join("***");
  return temiz;
}

export async function tekBaglantiTeshisi(
  adres: string | undefined,
  zamanAsimiMs: number = TESHIS_ZAMAN_ASIMI_MS,
): Promise<TeshisSonucu> {
  const t0 = Date.now();
  const bos = { kod: null, errno: null, mesaj: null, bizimBaglanti: null, kaynak: null } as const;
  if (!adres) return { sinif: "ATLANDI", sureMs: 0, ...bos, mesaj: "DATABASE_URL yok" };
  let u: URL;
  try {
    u = new URL(adres);
  } catch {
    return { sinif: "ATLANDI", sureMs: 0, ...bos, mesaj: "adres çözülemedi" };
  }
  const parola = decodeURIComponent(u.password);

  const deneme = (async (): Promise<TeshisSonucu> => {
    let c: Connection | null = null;
    try {
      c = await createConnection({
        host: u.hostname,
        port: Number(u.port || 3306),
        user: decodeURIComponent(u.username),
        password: parola,
        database: u.pathname.replace(/^\//, ""),
        connectTimeout: zamanAsimiMs,
      });
      const satirlar = (await c.query(BAGLANTI_SAYIM_SORGUSU)) as Array<{ n: bigint | number; kaynak: string | null }>;
      const n = Number(satirlar[0]?.n);
      return {
        sinif: "BAGLANDI",
        sureMs: Date.now() - t0,
        ...bos,
        bizimBaglanti: Number.isFinite(n) ? n : null,
        kaynak: kaynakIp(satirlar[0]?.kaynak),
      };
    } catch (e) {
      const h = e as { code?: unknown; errno?: unknown; message?: unknown };
      const kod = typeof h.code === "string" ? h.code : null;
      const errno = typeof h.errno === "number" ? h.errno : null;
      return {
        sinif: teshisSinifi(kod, errno),
        sureMs: Date.now() - t0,
        kod,
        errno,
        mesaj: parolasiz(String(h.message ?? e), parola).slice(0, 200),
        bizimBaglanti: null,
        kaynak: null,
      };
    } finally {
      if (c) void c.end().catch(() => {});
    }
  })();

  let zaman: ReturnType<typeof setTimeout> | undefined;
  const yaris = new Promise<TeshisSonucu>((coz) => {
    zaman = setTimeout(
      () => coz({ sinif: "ASILI", sureMs: Date.now() - t0, ...bos, mesaj: `sürücü ${zamanAsimiMs + ASILI_PAYI_MS} ms içinde cevap vermedi` }),
      zamanAsimiMs + ASILI_PAYI_MS,
    );
  });
  try {
    return await Promise.race([deneme, yaris]);
  } finally {
    if (zaman) clearTimeout(zaman);
  }
}
