/**
 * ============================================================================
 *  EL KİTABI — EKRAN GÖRÜNTÜLERİNİ ÇEK (K350-③, 21.10.2026)
 *      EKRAN_PAROLA=… npm run ekran:cek          (sunucu: ÖRNEK veritabanıyla açık olmalı)
 * ----------------------------------------------------------------------------
 *  Kullanıcı kararı 21.10.2026: el kitabı ekran görüntüleriyle desteklensin —
 *  «örnek veri» + «otomatik betik» + «önce ana ekranlar».
 *  · Görüntüler `scripts/ekran-ornek-veri.ts`in kurduğu UYDURMA veriden çekilir;
 *    gerçek defter fotoğraflanmaz. Betik, panelde örnek firmanın adını görmeden
 *    ÇEKMEZ (yanlış veritabanına bağlı sunucu = gerçek veri sızıntısı).
 *  · Çıktı `public/kitap-ekran/<ad>.jpg`; liste `src/lib/el-kitabi/ekranlar.ts`.
 *    Liste TEK yerde durur: hem bu betik hem kitap aynı diziden okur.
 *  ⚠ Tarayıcı otomasyonu yalnız BU iş için açıldı (08.08 kararı «projede tarayıcı
 *  otomasyonu yok» — kullanıcı 21.10'da «otomatik betik» seçti). Mobil doğrulamanın
 *  yerine GEÇMEZ; o yine kullanıcıda.
 * ============================================================================
 */
import { mkdirSync, statSync } from "node:fs";
import { chromium } from "playwright";
import { EKRANLAR } from "../src/lib/el-kitabi/ekranlar";

const ADRES = process.env.EKRAN_ADRES ?? "http://localhost:3100";
const EPOSTA = process.env.EKRAN_EPOSTA ?? "ornek@ornek.local";
const PAROLA = process.env.EKRAN_PAROLA ?? "";
const CIKTI = "public/kitap-ekran";

const BOYUT = {
  MASAUSTU: { width: 1366, height: 820, deviceScaleFactor: 1, isMobile: false },
  TELEFON: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true },
} as const;

async function main() {
  if (!PAROLA) {
    console.error("⛔ EKRAN_PAROLA verilmedi.");
    process.exitCode = 1;
    return;
  }
  mkdirSync(CIKTI, { recursive: true });
  const tarayici = await chromium.launch();
  let hata = 0;
  try {
    for (const tur of ["MASAUSTU", "TELEFON"] as const) {
      const liste = EKRANLAR.filter((e) => e.boyut === tur);
      if (!liste.length) continue;
      const b = BOYUT[tur];
      const baglam = await tarayici.newContext({
        viewport: { width: b.width, height: b.height },
        deviceScaleFactor: b.deviceScaleFactor,
        isMobile: b.isMobile,
        hasTouch: b.isMobile,
        locale: "tr-TR",
        timezoneId: "Europe/Istanbul",
        colorScheme: "light",
      });
      const sayfa = await baglam.newPage();
      await sayfa.goto(`${ADRES}/giris`, { waitUntil: "networkidle", timeout: 180_000 });
      await sayfa.fill('input[name="email"]', EPOSTA);
      await sayfa.fill('input[name="password"]', PAROLA);
      await Promise.all([sayfa.waitForURL((u) => !u.pathname.startsWith("/giris"), { timeout: 180_000 }), sayfa.press('input[name="password"]', "Enter")]);

      /* ⛔ SIZINTI KAPISI: örnek veritabanı değilse hiçbir görüntü çekilmez. */
      await sayfa.goto(`${ADRES}/urunler`, { waitUntil: "networkidle", timeout: 180_000 });
      const govde = await sayfa.textContent("body");
      if (!govde?.includes("ORN-001") && !govde?.includes("Çelik Tencere Seti")) {
        throw new Error("örnek veri görünmüyor — sunucu ÖRNEK veritabanına bağlı değil, çekim DURDU");
      }

      for (const e of liste) {
        try {
          await sayfa.goto(`${ADRES}${e.yol}`, { waitUntil: "networkidle", timeout: 180_000 });
          await sayfa.addStyleTag({ content: "nextjs-portal,[data-nextjs-toast]{display:none!important} *{caret-color:transparent!important}" });
          /* Geliştirme sunucusunda istemci bileşenleri ağ sustuktan SONRA canlanır (süzgeç kutuları boş görünüyordu). */
          await sayfa.waitForLoadState("load");
          await sayfa.waitForTimeout(3000);
          const dosya = `${CIKTI}/${e.ad}.jpg`;
          await sayfa.screenshot({ path: dosya, type: "jpeg", quality: 72, fullPage: false });
          console.log(`  ✓ ${e.ad.padEnd(22)} ${e.yol.padEnd(18)} ${Math.round(statSync(dosya).size / 1024)} KB`);
        } catch (h) {
          hata++;
          console.log(`  ⛔ ${e.ad} ${e.yol} — ${String(h).replace(/\s+/g, " ")}`);
        }
      }
      await baglam.close();
    }
  } finally {
    await tarayici.close();
  }
  if (hata) {
    console.error(`⛔ ${hata} görüntü çekilemedi`);
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error("⛔", e);
  process.exitCode = 1;
});
