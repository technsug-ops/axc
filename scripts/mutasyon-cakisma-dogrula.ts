/**
 * ============================================================================
 *  MUTASYON ÇAKIŞMA BEKÇİSİ (K202 SORUN B)
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run mutasyon-cakisma:dogrula
 *
 *  ⛔ NİYE VAR: `bekci.ts` artık bağımsız mutasyon harness'lerini PARALEL
 *  koşturuyor ve çakışanları `SIRALI_MUTASYON_GRUP` beyanına göre sıraya
 *  alıyor. Bu beyan ELLE yazıldı — ve elle yazılan hiçbir güvenlik listesi
 *  kendi başına güvenilmez (Anayasa: "sınıf kendisinden türetilemiyorsa
 *  beyan edilir" — ama beyan tek başına yetmez, OTOMATİK doğrulanır).
 *
 *  Bu bekçi GERÇEK çakışmayı (kaynağı tarayarak) yeniden hesaplar ve
 *  BEYANLA karşılaştırır. Yarın eklenen bir harness'in undeclared bir
 *  dosya çakışması açması — ki bu paralel havuzda SESSİZ bir yarış
 *  durumuna yol açardı — burada KIRMIZI yanar.
 * ============================================================================
 */
import { readFileSync } from "node:fs";

import {
  gercekCakismaGruplari,
  mutasyonAdiMi,
  SIRALI_MUTASYON_GRUP,
} from "./mutasyon-hedefleri";

let basarisiz = 0;
let calisan = 0;

function kontrol(ad: string, kosul: boolean, ayrinti?: unknown) {
  calisan++;
  if (kosul) console.log(`  OK    ${ad}`);
  else {
    basarisiz++;
    console.log(`  HATA  ${ad}`);
    if (ayrinti !== undefined) console.log("        ", ayrinti);
  }
}

function main() {
  const paket = JSON.parse(readFileSync("package.json", "utf8")) as {
    scripts: Record<string, string>;
  };
  const mutasyonAdlari = Object.keys(paket.scripts).filter(mutasyonAdiMi).sort();

  console.log("\n1) TABAN DOLULUĞU");
  kontrol(
    "mutasyon bekçisi bulundu (taban DOLU)",
    mutasyonAdlari.length >= 15,
    mutasyonAdlari.length,
  );

  console.log("\n2) GERÇEK ÇAKIŞMA TARAMASI vs BEYAN");
  const gercekGruplar = gercekCakismaGruplari(mutasyonAdlari);
  const beyanKumesi = new Set(SIRALI_MUTASYON_GRUP);

  /**
   * ⚠ ASIL SORULAN ŞEY: gerçek çakışan HER ÇİFT, beyan kümesinin İÇİNDE mi?
   * Beyan kümesinin dışında kalan bir çakışan çift, paralel havuzda
   * BİRBİRİYLE yarışır — bu KIRMIZI yanmalı.
   */
  const kapsanmayanCakisma: string[] = [];
  for (const grup of gercekGruplar) {
    for (const ad of grup) {
      if (!beyanKumesi.has(ad)) {
        kapsanmayanCakisma.push(`${ad}  (çakıştığı küme: ${grup.join(", ")})`);
      }
    }
  }
  kontrol(
    "gerçek çakışan HER harness beyan kümesinde (SIRALI_MUTASYON_GRUP)",
    kapsanmayanCakisma.length === 0,
    kapsanmayanCakisma,
  );

  /**
   * Ters yön (güvenlik için zararsız ama bilgi taşır): beyan kümesinde
   * duran ama artık GERÇEKTE çakışmayan bir isim — over-conservative,
   * kırmızı yakmaz ama görünür kılınır (temizlik fırsatı).
   */
  const gercekCakisanlar = new Set(gercekGruplar.flat());
  const fazlaBeyan = SIRALI_MUTASYON_GRUP.filter((ad) => !gercekCakisanlar.has(ad));
  if (fazlaBeyan.length > 0) {
    console.log(
      `  ⚠ BİLGİ: beyanda olup artık gerçekte çakışmayan: ${fazlaBeyan.join(", ")} (kırmızı yakmaz, temizlik fırsatı)`,
    );
  }

  console.log("\n3) BAĞIMSIZ HAVUZ TABAN DOLULUĞU");
  const bagimsizAdlar = mutasyonAdlari.filter((ad) => !beyanKumesi.has(ad));
  kontrol(
    "paralel havuzda koşacak harness var (taban DOLU)",
    bagimsizAdlar.length >= 5,
    bagimsizAdlar.length,
  );

  console.log("\n" + "=".repeat(70));
  if (basarisiz === 0) console.log(`TÜM KONTROLLER GEÇTİ (${calisan})`);
  else {
    console.log(`${basarisiz} KONTROL BAŞARISIZ (${calisan} kontrolden)`);
    process.exitCode = 1;
  }
  console.log("");
}

main();
