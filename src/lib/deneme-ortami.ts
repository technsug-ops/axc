/**
 * ============================================================================
 *  DENEME ORTAMI — K303 (kullanıcı kararı 03.10.2026)
 * ----------------------------------------------------------------------------
 *  Çok-firma işi YALNIZ deneme kurulumunda yürür: kullanıcının bilgisayarında,
 *  ayrı klasör (`axcali-deneme`), ayrı yerel veritabanı (`selliora_deneme`),
 *  `k303-cok-firma` dalı. Canlı Axcali kanıtlanana kadar değişmez.
 *
 *  Bu anahtar açıkken (`DENEME_ORTAMI="1"`):
 *  · pazaryeri kimliği VERİLMEZ — `.env.canli` dosyası bulunsa bile
 *    (`scripts/{ty,hb,n11}/istemci.ts` → `kimlikOku`). Gerçek mağazaya stok,
 *    fiyat ya da çekim isteği gitmesi imkânsızdır;
 *  · zamanlanmış işler (sipariş/hakediş/listeleme çekimi, otomatik yedek,
 *    özet, ölçüm) 404 döner (`src/proxy.ts`);
 *  · ekranın üstünde «DENEME ORTAMI» şeridi görünür.
 *
 *  ⛔ GÜVENLİK TEK BİR DİKKATE BAĞLANMAZ: `.env.canli`yi deneme klasörüne
 *  kopyalamamak bir alışkanlıktır; bu modül MEKANİZMADIR. İkisi birlikte durur.
 *
 *  ⚠ YALNIZ "1" AÇAR. Boş, "0", "true" ya da yazım hatası KAPALI sayılır —
 *  canlıda yanlışlıkla açılması istenmez (canlıda değişken hiç yoktur).
 * ============================================================================
 */

export type OrtamDegiskenleri = Record<string, string | undefined>;

/** SAF — deneme ortamı mı. */
export function denemeOrtamiMi(env: OrtamDegiskenleri = process.env): boolean {
  return env.DENEME_ORTAMI?.trim() === "1";
}

/**
 * Deneme kurulumunda pazaryeri ve zamanlanmış iş uçları — proxy bunları 404
 * ile keser. Liste değil ÖNEK: yarın eklenen bir cron rotası da kapsama girer.
 */
export const DENEME_KAPALI_ONEKLER: readonly string[] = [
  "/api/cron/",
  "/api/yedek/otomatik",
  "/api/olcum",
];

/** SAF — bu yol deneme ortamında kapalı mı. */
export function denemedeKapaliMi(yol: string, env: OrtamDegiskenleri = process.env): boolean {
  if (!denemeOrtamiMi(env)) return false;
  return DENEME_KAPALI_ONEKLER.some((o) => yol === o.replace(/\/$/, "") || yol.startsWith(o));
}
