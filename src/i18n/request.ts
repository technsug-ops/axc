import { getRequestConfig } from "next-intl/server";

import {
  BICIMLER,
  IS_SAAT_DILIMI,
  VARSAYILAN_DIL,
  type Dil,
} from "./ayarlar";

/**
 * ============================================================================
 *  SÖZLÜK YÜKLEME — ÜRETİMDE PAKETLENİR, GELİŞTİRMEDE DİSKTEN OKUNUR
 * ----------------------------------------------------------------------------
 *  SORUN: Turbopack, sözlük JSON'unu bir modül olarak paketleyip önbelleğe
 *  alıyor. Dosyaya yeni anahtar eklendiğinde sıcak yenileme bu modülü
 *  geçersiz kılmıyor; çalışan geliştirme sunucusu ESKİ sözlüğü sunmaya
 *  devam ediyor ve ekran MISSING_MESSAGE ile patlıyor — halbuki anahtar
 *  dosyada var. 09.08.2026'da iki kez yaşandı (Menu.satislar,
 *  Ortak.urunEkle) ve her seferinde sunucuyu yeniden başlatmak gerekti.
 *  Şablon literalli import'u statik import'a çevirmek de çözmedi; ölçüldü.
 *
 *  ÇÖZÜM: Geliştirmede sözlük her istekte DİSKTEN okunuyor — dosya
 *  değişikliği anında görünür, yeniden başlatma gerekmez. Üretimde statik
 *  import kullanılır: sözlük derleme anında pakete girer, disk erişimi ve
 *  ayrıştırma maliyeti olmaz.
 * ============================================================================
 */
const SOZLUKLER: Record<Dil, () => Promise<{ default: object }>> = {
  tr: () => import("../../messages/tr.json"),
  en: () => import("../../messages/en.json"),
};

async function sozlukYukle(dil: Dil): Promise<object> {
  if (process.env.NODE_ENV === "development") {
    const { readFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const ham = await readFile(
      join(process.cwd(), "messages", `${dil}.json`),
      "utf8",
    );
    return JSON.parse(ham) as object;
  }

  return (await SOZLUKLER[dil]()).default;
}

/**
 * next-intl istek yapılandırması.
 *
 * Yönlendirme (URL öneki) kullanılmadığı için dil sabittir; ikinci dil
 * geldiğinde burası çerezden/başlıktan dil okuyacak şekilde genişler,
 * ekranlarda hiçbir değişiklik gerekmez.
 */
export default getRequestConfig(async () => {
  const locale = VARSAYILAN_DIL;

  return {
    locale,
    messages: await sozlukYukle(locale),
    formats: BICIMLER,
    /**
     * SAAT DİLİMİ SABİTTİR — çalışma ortamından ASLA okunmaz.
     * Gerekçesi ve karar tarihi için bkz. i18n/ayarlar.ts → IS_SAAT_DILIMI.
     *
     * Geçiş etkisi ölçüldü (scripts/saat-dilimi-kontrol.ts): iş tarihleri
     * (purchasedAt, soldAt, occurredAt, spentAt) UTC gece yarısı olarak
     * saklandığı için KAYMAZ. Yalnızca gece yarısına yakın yazılmış
     * `createdAt` denetim damgaları bir gün oynayabilir.
     */
    timeZone: IS_SAAT_DILIMI,
  };
});
