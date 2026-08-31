import { readFileSync, existsSync } from "node:fs";

import { readBarcodes } from "zxing-wasm/reader";

import { DESTEKLENEN_FORMATLAR } from "../src/lib/barkod-formatlari";

/**
 * ============================================================================
 *  KARE ÇÖZÜM TESTİ — TEKRARLANABİLİR TEŞHİS ARACI (K113, 31.08.2026)
 * ----------------------------------------------------------------------------
 *      npx tsx scripts/kare-cozum-testi.ts <kare.png>
 *
 *  ⛔ NİYE VAR: bir kargo barkodu okunmuyordu ve üç hipotez ölçümle elendi
 *  (biçim listesi · çözüm bütçesi · döngü kilidi). Geriye yakalama yolu
 *  kaldı ama TEŞHİS TAVANA DAYANDI — kameranın ne verdiğini göremiyorduk.
 *
 *  ⭐ SENTETİK TESTİN YERİNİ ALIYOR — VE SEBEBİ ÖLÇÜLDÜ. Önce barkodu
 *  KENDİMİZ üretip çözmüştük ve `1 px/modül`de bile çözülüyordu. O ölçüm
 *  ÇÖZÜCÜNÜN çalıştığını kanıtlıyordu, YAKALAMA YOLU hakkında hiçbir şey
 *  söylemiyordu: sentetik görüntüde bulanıklık, gürültü, açı ve kontrast
 *  kaybı YOK. Gerçek kamera karesi hiçbirine benzemiyor.
 *  _(Anayasa: "kendi kendini doğrulayan ölçüm ölçüm değildir".)_
 *
 *  ⚠ BU ARAÇ GERÇEK KAREYİ ÇÖZER: kamera diyaloğundaki "Kareyi kaydet"
 *  düğmesi çözücüye giden karenin BİREBİR PNG'sini indiriyor; bu betik onu
 *  UYGULAMANIN TAM AYARLARIYLA çözmeyi deniyor. Böylece soru kesin ayrılır:
 *
 *      çözülüyorsa  → kare iyiydi, sorun tarama DÖNGÜSÜNDE/zamanlamada
 *      çözülmüyorsa → kare yetersiz, sorun YAKALAMADA (çözünürlük/odak/kadraj)
 *
 *  ⛔ HİÇBİR ŞEYE DOKUNMAZ: veritabanı yok, ağ yok, yazma yok.
 * ============================================================================
 */

/** Uygulamanın çözüm ayarları — TEK YERDEN, yoksa test başka şeyi ölçer. */
const AYARLAR = {
  /** ⚠ Kopya alınıyor: `as const` dizisi salt okunur, kütüphane değiştirilebilir bekliyor. */
  formats: [...DESTEKLENEN_FORMATLAR],
  tryHarder: true,
  maxNumberOfSymbols: 4,
};

async function main() {
  const yol = process.argv[2];
  if (!yol) {
    console.log("Kullanım: npx tsx scripts/kare-cozum-testi.ts <kare.png>");
    console.log("");
    console.log("Kareyi kamera diyaloğundaki 'Kareyi kaydet' düğmesi üretir.");
    process.exit(1);
  }
  if (!existsSync(yol)) {
    /** ⚠ "Bulunamadı" ile "çözülemedi" AYRI şeyler — karıştırılmaz. */
    console.log("⛔ DOSYA YOK:", yol);
    console.log("   Bu bir 'çözülemedi' sonucu DEĞİLDİR — dosya okunamadı.");
    process.exit(1);
  }

  const bayt = readFileSync(yol);
  const blob = new Blob([new Uint8Array(bayt)], { type: "image/png" });

  console.log("KARE ÇÖZÜM TESTİ");
  console.log("=".repeat(60));
  console.log("dosya   :", yol);
  console.log("boyut   :", (bayt.length / 1024).toFixed(0), "KB");
  console.log("biçimler:", AYARLAR.formats.join(" "));
  console.log("tryHarder:", AYARLAR.tryHarder, "· maxSymbols:", AYARLAR.maxNumberOfSymbols);
  console.log("");

  /**
   * ⚠ ÜÇ KEZ ÖLÇÜLÜYOR: ilk çağrı wasm'ı ısıtır ve gerçekçi olmayan bir
   * süre verir. Tek ölçüme bakan biri "çözüm 900 ms sürüyor" diye yanlış
   * bir hüküm kurardı.
   */
  const sureler: number[] = [];
  let sonuc: Awaited<ReturnType<typeof readBarcodes>> = [];
  for (let i = 0; i < 3; i++) {
    const t0 = performance.now();
    sonuc = await readBarcodes(blob, AYARLAR);
    sureler.push(performance.now() - t0);
  }

  console.log(
    "süre    : ilk " + sureler[0].toFixed(0) + " ms · sonraki " +
      sureler.slice(1).map((s) => s.toFixed(0)).join("/") + " ms",
  );
  console.log("");

  if (sonuc.length === 0) {
    console.log("⛔ HİÇBİR KOD BULUNAMADI");
    console.log("");
    console.log("   Sorun YAKALAMADA: bu kare çözücüye yetmiyor.");
    console.log("   Bakılacaklar: çözünürlük · odak (bulanıklık) · kadraj");
    console.log("   (barkod kareyi yeterince doldurmuyorsa modül başına");
    console.log("    düşen piksel güvenilir çözümün altında kalır)");
    process.exit(2);
  }

  /**
   * ⚠ GEÇERSİZ SONUÇ DA YAZILIR. Çözücü bir şey bulup sağlama takıldıysa
   * bu "bulunamadı"dan FARKLI bir bilgidir: kod görülüyor ama okunamıyor,
   * yani kare sınırda. Ayırt edilmezse iki apayrı durum aynı görünürdü.
   */
  console.log("bulunan sembol:", sonuc.length);
  for (const s of sonuc) {
    console.log(
      "  " + (s.isValid ? "OK " : "GEÇERSİZ ") +
        String(s.format).padEnd(11) +
        " metin=" + JSON.stringify(s.text),
    );
  }

  const gecerli = sonuc.filter((s) => s.isValid && s.text);
  console.log("");
  if (gecerli.length === 0) {
    console.log("⚠ Sembol GÖRÜLDÜ ama hiçbiri geçerli değil — kare SINIRDA.");
    console.log("  Yakalama biraz daha iyi olsaydı çözülecekti.");
    process.exit(2);
  }

  /** Uygulamadaki tercih: çizgili (1B) kod öncelikli — aynı kural. */
  const kareKodlar = new Set(["QRCode", "DataMatrix", "PDF417", "Aztec"]);
  const cizgili = gecerli.find((s) => !kareKodlar.has(String(s.format)));
  const secilen = cizgili ?? gecerli[0];
  console.log("⭐ UYGULAMANIN DÖNDÜRECEĞİ DEĞER:", JSON.stringify(secilen.text));
  console.log("");
  console.log("   Kare İYİ — çözücü bu görüntüyü okuyabiliyor.");
  console.log("   Ekranda okumuyorsa sorun kareyi YAKALAMA anında:");
  console.log("   tarama 250 ms'de bir çalışıyor ve o anki kare bu kadar");
  console.log("   net olmayabilir (el titremesi, odak arayışı).");
}

main().catch((e) => {
  /** ⚠ MESAJ TAM TAŞINIR — kısaltmak teşhisi kısaltır. */
  console.error("HATA:", e instanceof Error ? e.message : String(e));
  process.exit(1);
});
