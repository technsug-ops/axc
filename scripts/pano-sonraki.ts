import { readFileSync } from "node:fs";

import { CEKIRDEK, kalemMi, satirKimligi, sonrakiKodlar } from "./pano-kimlik";

/**
 * ============================================================================
 *  SIRADAKİ BOŞ PANO KODU (K10, 01.09.2026)
 * ----------------------------------------------------------------------------
 *      npm run pano:sonraki
 *
 *  ⛔ NİYE VAR: kod ataması gözle yapılıyordu ve DÖRT KEZ çakıştı. Bekçi
 *  hepsini yakaladı ama YAZIMDAN SONRA — her çakışma bir tur kaybettiriyor.
 *  Bu komut soruyu yazımdan ÖNCE cevaplıyor.
 *
 *  ⚠ HİÇBİR ŞEY YAZMAZ. Yalnız okur ve söyler.
 * ============================================================================
 */

const DOSYALAR = ["BEKLEYENLER.md", "ARSIV.md"];

const kimlikler: string[] = [];
let okunanSatir = 0;

for (const dosya of DOSYALAR) {
  for (const satir of readFileSync(dosya, "utf8").split(/\r?\n/)) {
    /**
     * ⭐ İKİ BİÇİM DE OKUNUYOR (K130). Eskiden yalnız tablo satırı
     * okunuyordu ve araç 16 numara geriden söylüyordu.
     */
    const ham = satirKimligi(satir);
    if (ham === null) continue;
    okunanSatir += 1;
    for (const parca of ham.split("/")) {
      /** ⚠ BEYAN EDİLMİŞ İSTİSNA — bekçiyle AYNI gövdeden eleniyor. */
      if (!kalemMi(dosya, parca)) continue;
      const c = CEKIRDEK.exec(parca.trim());
      if (c !== null) kimlikler.push(c[1] + c[2] + c[3]);
    }
  }
}

console.log("");
/**
 * ⛔ "0 BULDUM" İLE "OKUYAMADIM" AYRI SÖYLENİR. Desen bozulur ya da dosya
 * adı değişirse liste boşalır ve komut kendinden emin bir "K1" basardı —
 * en tehlikeli yalancı cevap. _(Anayasa: boş sonuç ile temiz sonuç ayrılır.)_
 */
if (kimlikler.length === 0) {
  console.log("⛔ HİÇ KİMLİK OKUNAMADI — pano biçimi değişmiş olabilir.");
  console.log(`   taranan başlık satırı: ${okunanSatir}`);
  process.exit(1);
}

console.log(`SIRADAKİ BOŞ KOD  (${kimlikler.length} kimlik okundu)`);
console.log("");
for (const [onek, kod] of sonrakiKodlar(kimlikler)) {
  console.log(`  ${onek.padEnd(3)} →  ${kod}`);
}
console.log("");
/**
 * ⚠ EN SIK HATA "kod bulamamak" DEĞİL, "aynı kalemin ikinci fazına yeni kod
 * açmak". Komut onu da söylüyor — 25/26.08'de iki kez, 01.09'da bir kez
 * daha yaşandı.
 */
console.log(
  "  ⚠ Aynı kalemin ikinci fazı YENİ KOD ALMAZ — mevcut satırın sonuna",
);
console.log('     "─── ② …" diye eklenir. Kimlik kaleme aittir, teslim turuna değil.');
console.log("");
