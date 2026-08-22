/**
 * ============================================================================
 *  BÜTÜN BEKÇİLER — TEK KOMUT
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run bekci
 *
 *  ⚠ NİYE VAR — ÖLÇÜLDÜ 21.08.2026.
 *  Depoda 36 doğrulama betiği var ve hepsi çıkış kodu üretiyor. Ama her
 *  teslimde rutin olarak koşulan YALNIZ YEDİSİYDİ (simulasyon · kar · panel
 *  · i18n · lint · tsc · build); geri kalanı "dokunduğum alana göre"
 *  koşuluyordu. Sonuç: iki bekçi bir süredir KIRMIZI yanıyordu ve kimse
 *  görmüyordu.
 *
 *    · `yerlesim:dogrula` — masaüstü tablolarında sütun tavanı aşılmış
 *    · `yedek:dogrula`    — tarife tabloları yedek listesinde yok
 *
 *  İkincisi en pahalı yerdeydi: Trendyol'un tam dilimli ileri tarifesi
 *  arşivden İNMİYOR, yani kaybolursa yeniden üretilemez.
 *
 *  ── DERS BEKÇİYE DEĞİL RUTİNE YAZILDI ───────────────────────────────────
 *  Kod doğruydu, eksik olan koşma alışkanlığıydı. "Bir dahaki sefere
 *  hepsini koşarım" bir çözüm değil, bir niyettir; niyet unutulur, komut
 *  unutulmaz.
 *
 *  ── LİSTE ELLE TUTULMUYOR ───────────────────────────────────────────────
 *  Bekçiler `package.json`dan OKUNUYOR. Elle liste tutulsaydı yarın eklenen
 *  bir bekçi listeye yazılmadığı için sessizce koşulmazdı — yani bu betiğin
 *  düzeltmeye çalıştığı hatanın aynısı, bir kat yukarıda tekrarlanırdı.
 *
 *  ── NE KOŞULMUYOR VE NİYE ───────────────────────────────────────────────
 *  · `canli:*`  — canlı veritabanı ister; bekçi değil ölçüm/bakım aracı
 *  · `*:prova`  — deneme betiği, hüküm vermez
 *  · `build`    — ayrı ve uzun; push zincirinde kendi başına koşar
 * ============================================================================
 */

import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

type Sonuc = {
  ad: string;
  kod: number;
  saniye: number;
  ozet: string;
};

/** package.json'daki bekçi komutları — elle liste YOK. */
function bekciler(): string[] {
  const paket = JSON.parse(readFileSync("package.json", "utf8")) as {
    scripts: Record<string, string>;
  };
  return Object.keys(paket.scripts)
    .filter(
      (ad) =>
        (ad.endsWith(":dogrula") || ad.endsWith(":bekci") || ad.endsWith(":kontrol")) &&
        !ad.startsWith("canli:") &&
        !ad.endsWith(":prova"),
    )
    .sort();
}

/**
 * Çıktıdan özet satırı çıkarır. Betikler iki biçim kullanıyor:
 *   "TÜM KONTROLLER GEÇTİ (95)"  ·  "2 KONTROL BAŞARISIZ (10 kontrolden)"
 * Tanımadığı biçimde son dolu satırı gösterir — sessiz kalmaz.
 */
function ozetle(cikti: string): string {
  const satirlar = cikti
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s !== "");
  const bilinen = satirlar.find(
    (s) => s.includes("KONTROL") || s.includes("GEÇTİ") || s.includes("TEMIZ"),
  );
  return (bilinen ?? satirlar[satirlar.length - 1] ?? "(çıktı yok)").slice(0, 64);
}

const liste = bekciler();
console.log("");
console.log("BEKÇİ TURU — " + liste.length + " doğrulama");
console.log("=".repeat(70));

const sonuclar: Sonuc[] = [];
for (const ad of liste) {
  const basladi = Date.now();
  process.stdout.write(`  ${ad.padEnd(24)} ... `);
  /**
   * ⚠ `shell: true` ŞART (Windows). `shell: false` ile `npm.cmd` PATH'ten
   * çözülemedi ve HER bekçi "(çıktı yok)" diye kırmızı yandı — yani betik,
   * yeşil bir depoyu kırmızı gösterdi. Yalancı kırmızı, yalancı yeşil kadar
   * zararlıdır: ikisi de bekçiye olan güveni bitirir.
   */
  const r = spawnSync(`npm run ${ad}`, {
    encoding: "utf8",
    shell: true,
  });
  const saniye = (Date.now() - basladi) / 1000;
  const kod = r.status ?? 1;
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  const ozet = ozetle(cikti);
  sonuclar.push({ ad, kod, saniye, ozet });
  console.log(
    `${kod === 0 ? "OK  " : "KIRMIZI"} ${saniye.toFixed(1)}s  ${ozet}`,
  );
}

const kirmizilar = sonuclar.filter((s) => s.kod !== 0);
const toplamSaniye = sonuclar.reduce((t, s) => t + s.saniye, 0);

console.log("");
console.log("=".repeat(70));
console.log(
  `${sonuclar.length - kirmizilar.length}/${sonuclar.length} yeşil · ${toplamSaniye.toFixed(0)} saniye`,
);

if (kirmizilar.length > 0) {
  console.log("");
  console.log("KIRMIZI YANANLAR:");
  for (const k of kirmizilar) {
    console.log(`  ${k.ad.padEnd(24)} ${k.ozet}`);
    console.log(`     ayrıntı: npm run ${k.ad}`);
  }
  /**
   * ⚠ ÇIKIŞ KODU ŞART. Bu betik bir push zincirine bağlanacak; çıkış kodu
   * üretmezse "bekçi var, koşuluyor ama sonucu kimse okumuyor" hâli doğar
   * — düzeltmeye çalıştığı hatanın üçüncü sürümü.
   */
  process.exitCode = 1;
} else {
  console.log("HEPSİ YEŞİL.");
}
console.log("");
