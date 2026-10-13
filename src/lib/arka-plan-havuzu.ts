/**
 * ============================================================================
 *  ARKA PLAN HAVUZU İŞARETİ (K332, 13.10.2026)
 * ----------------------------------------------------------------------------
 *  Bu modülü İÇE ALAN uç, sunucu kopyasının veritabanı havuzunu küçük kurdurur
 *  (`ARKA_PLAN_HAVUZU`: en fazla 2 bağlantı, boşta 1). İstemci tembel kurulur
 *  (`lib/prisma.ts`), bu yüzden işaret ilk sorgudan önce okunur.
 *
 *  NİYE: canlıda 6 dk izleme (13.10.2026) — açık bağlantı normalde 4, ama
 *  dakikanın ~10. saniyesinde 15–25'e sıçrıyor; tepe 25 = hesabın
 *  `max_user_connections` sınırı. Kaynak, aynı saniyede başlayan çekim
 *  uçlarının kopyalarıydı ve her biri 3 bağlantı park ediyordu (12.10'da
 *  sayfalar için `minimumIdle` 1 → 3 yapılınca çekimlere de geçmişti).
 *  Çekimler arka plan işidir: birkaç yüz ms kuyruk onlara zarar vermez,
 *  sayfanın sınıra dayanması ise «çok fazla bağlantı» hatası demektir.
 *
 *  ⛔ YALNIZ `maxDuration` TAŞIYAN UÇLAR İÇE ALIR. Vercel ayarı farklı uçları
 *  ayrı sunucu kopyalarında koşturur; `maxDuration` taşımayan bir uç
 *  SAYFALARLA aynı kopyada koşar ve işaret orada sayfaların havuzunu da
 *  küçültürdü. Kural bekçide: `cron-yollari:dogrula`.
 * ============================================================================
 */
import { ARKA_PLAN_ISARETI } from "@/lib/veritabani-adresi";

/* ⚠ OKUMA BURADA DEĞİL (`arkaPlanHavuzuMu` → `lib/veritabani-adresi.ts`): bu modülü
   içe alan her yer işareti KURAR; `lib/prisma.ts` buradan bir şey içe alsaydı
   işaret sayfalarda da kurulurdu. */
(globalThis as unknown as Record<symbol, boolean>)[ARKA_PLAN_ISARETI] = true;
