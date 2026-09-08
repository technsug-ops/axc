import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  YEDEK ÇEKİRDEĞİ UÇTAN UCA — `gunlukYedekYaz` GERÇEKTEN İŞLİYOR MU
 * ----------------------------------------------------------------------------
 *      npx tsx scripts/canli-yedek-cekirdek.ts
 *
 *  BETIK SINIFI: SUREKLI — rutin koşabilir. Veritabanına YAZMAZ (yalnız okur);
 *  yalnızca yerel yedek klasörüne dosya yazar.
 *
 *  ⛔ NİYE AYRI BİR BETİK (K119b, 08.09.2026): `canli-yedek-dosya.ts` HEDEFİN
 *  çalıştığını kanıtlıyordu, ÇEKİRDEĞİN değil — kendi `yedekUret` çağrısını
 *  yapıyor ve `gunlukYedekYaz`a hiç uğramıyor. Oysa kullanıcının bastığı
 *  düğme ile gece cron'unun koştuğu gövde odur. K119a'da tam bu boşluk vardı:
 *  soyutlama kuruldu, ÇEKİRDEK ona bağlanmadı ve **hiçbir şey söylemedi.**
 *  _(Anayasa: "sınanmamış ekran, ekran değildir" — gövdenin ekran hâli.)_
 *
 *  ⚠ HEDEF BEYANLA SEÇİLİR: `YEDEK_HEDEFI=DOSYA` + `YEDEK_KOK` burada
 *  BİLEREK kodda kuruluyor — üretimde (Vercel) bu değişkenler yok ve çekirdek
 *  oraya asla kendiliğinden düşmez.
 * ============================================================================
 */

const KOK = "veri/yedek-yerel";

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);

  /** Hedef BEYAN edilir — seçici sessizce yerele düşmez, açıkça istenir. */
  process.env.YEDEK_HEDEFI = "DOSYA";
  process.env.YEDEK_KOK = KOK;

  const { gunlukYedekYaz } = await import("../src/lib/yedek-yaz");
  const { varsayilanYedekHedefi } = await import("../src/lib/yedek-hedefi");

  console.log("");
  console.log("YEDEK ÇEKİRDEĞİ — UÇTAN UCA");
  console.log("  veritabanı  " + y.veri.adres.hostname);
  console.log("  an          " + new Date().toISOString());
  console.log("=".repeat(70));

  const secim = varsayilanYedekHedefi();
  if (!secim.tamam) {
    console.log("⛔ HEDEF SEÇİLEMEDİ: " + secim.mesaj);
    process.exitCode = 1;
    return;
  }
  console.log("  seçilen hedef  " + secim.hedef.tur + " · " + secim.hedef.aciklama);

  const basi = Date.now();
  const sonuc = await gunlukYedekYaz();
  const sure = Date.now() - basi;

  if (!sonuc.tamam) {
    console.log("");
    console.log("⛔ YEDEK ALINAMADI · kod " + sonuc.kod);
    console.log("   " + sonuc.mesaj);
    console.log("");
    console.log("   ⛔ Bu kırmızı BİR HÜKÜMDÜR: elde doğrulanmış yedek YOK.");
    process.exitCode = 1;
    return;
  }

  console.log("");
  console.log("  ✓ yazıldı ve GERİ OKUNDU — özetler birebir");
  console.log("    gün           " + sonuc.gun);
  console.log("    hedef         " + sonuc.hedefTuru);
  console.log("    adres         " + sonuc.url);
  console.log("    satır         " + sonuc.satir.toLocaleString("tr-TR"));
  console.log("    boyut         " + (sonuc.boyutBayt / 1024 / 1024).toFixed(2) + " MB");
  console.log("    silinen eski  " + sonuc.silinenEskiYedek);
  console.log("");
  /**
   * ⚠ MALİYET BEYAN EDİLİR: gece işi Vercel'de 60 sn tavanına dayanıyor.
   * Geri okuma dosyayı ikinci kez taşır; süresi tahmin edilmez, YAZILIR.
   */
  console.log("    geri okuma    " + sonuc.dogrulamaMs + " ms");
  console.log("    toplam        " + sure + " ms");
}

main();
