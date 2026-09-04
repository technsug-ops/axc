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
 *
 *  ── `tsc` NİYE GİRDİ (K48, kullanıcı kararı 25.08.2026) ─────────────────
 *  Bu tur bir kez **45/45 YEŞİL** dedi ve aynı anda `npm run build`
 *  `Expected ',', got 'ident'` ile düştü: el kitabındaki bir dizgede tırnak
 *  hatası vardı. Bekçilerin hiçbiri derlemeye bakmıyordu — liste
 *  `package.json`dan okunuyor ve orada `tsc` diye bir girdi YOKTU.
 *
 *  ⚠ SINIFIN ÜÇÜNCÜ VAKASIYDI: JSDoc içindeki `"use server"` sabiti ·
 *  `prisma format`ın CRLF'i · bugünkü tırnak. Üçünde de bekçi yeşildi ve
 *  bozukluk başka bir kapıdan çıktı.
 *
 *  ⚠ BEDELİ ÖLÇÜLDÜ: tur **69sn → 81sn**, `tsc` adımı **9–12sn**.
 *  Kullanıcı kararı bu adım "~41sn" TAHMİN edilerek verilmişti
 *  (_"yeşilin güvenilirliği 41 saniyeden pahalı"_); ölçünce gerçek bedel
 *  **+12sn** çıktı — karar aynı yönde, ama rakam sessizce değiştirilmiyor:
 *  tahmini bilen biri için kaynaksız bir sayı doğmasın.
 *
 *  ⚠ TAHMİN NİYE ŞİŞTİ: `tsc --noEmit` soğuk koşumda daha uzun sürüyor
 *  sanılmıştı; ölçüm (25.08, üç ardışık koşum) 9.0 · 8.8 · 12.0sn verdi.
 *  Bekçi bunları SERİ koşuyor (`for` + `spawnSync`), yani örtüşme de yok —
 *  12sn doğrudan tura ekleniyor ve fazlası değil.
 *
 *  Süre gerçekten sorun olursa çözüm `tsc`yi ÇIKARMAK DEĞİL, incremental
 *  derlemeyi ölçmektir — çıkarmak, ölçmeyi bırakmak olur.
 * ============================================================================
 */

import { readFileSync, unlinkSync, writeFileSync } from "node:fs";

import { KILIT, kilitDurumu } from "./bekci-kilit";
import { spawnSync } from "node:child_process";

/**
 * ============================================================================
 *  TEK TUR KİLİDİ — İKİ EŞZAMANLI TUR BİRBİRİNİ KİRLETİR (04.09.2026)
 * ----------------------------------------------------------------------------
 *  VAKA: pre-push hook'unun turu ile elle başlatılan tur AYNI ANDA koştu.
 *  Mutasyon harness'leri aynı dosyaları bozup geri yazıyor; iki tur
 *  yarışınca biri ötekinin MUTANTINI "asıl" diye kopyaladı ve geri yazdı:
 *  `"kodVar": "Satışta"` mutantı sözlükte KALDI, hook turu kırmızı yandı,
 *  push düştü — ve artığı bulan şey tesadüftü (bir sonraki turun kırmızısı).
 *
 *  Turlar TEK TEK seri (`for` + `spawnSync`) ama TURLARIN KENDİSİ seri
 *  değildi. Disiplinle çözülmez ("aynı anda iki tur açmam" bir niyettir);
 *  mekanizma: ikinci tur AÇILMAZ, kırmızı çıkar ve sebebini söyler.
 *
 *  BAYAT KİLİT: kill edilen bir tur kilidini bırakır. PID artık yaşamıyorsa
 *  ya da kilit 90 dakikadan eskiyse (tur ~15 dk) devralınır — ve devralma
 *  SESSİZ DEĞİL, ekrana yazılır (boş ≠ temiz).
 * ============================================================================
 */
/** Ölçüt ORTAK gövdede (`bekci-kilit.ts`) — çekim kapısı da aynısını okur. */
function kilidiAl(): void {
  const durum = kilitDurumu();
  if (durum.pid !== null || durum.yasMs !== null) {
    const pid = durum.pid ?? NaN;
    const yasMs = durum.yasMs ?? 0;
    if (durum.canli) {
      console.log("");
      console.log("⛔ BAŞKA BİR BEKÇİ TURU KOŞUYOR (pid " + pid + ") — İKİNCİ TUR AÇILMAZ.");
      console.log("   İki eşzamanlı tur, mutasyon harness'leri aynı dosyaları bozup geri");
      console.log("   yazdığı için birbirini KİRLETİR (04.09.2026: 'Satışta' mutantı");
      console.log("   sözlükte kaldı, push düştü). Koşan turun bitmesini bekleyin.");
      console.log("");
      process.exit(1);
    }
    console.log("");
    console.log("⚠ BAYAT KİLİT DEVRALINDI (pid " + pid + " ölü ya da kilit " +
      Math.round(yasMs / 60_000) + " dk eski) — önceki tur kill edilmiş olabilir;");
    console.log("  yarım kalan mutasyon artığı için `git status` kontrol edilmeli.");
  }
  writeFileSync(KILIT, String(process.pid), "utf8");
}

/** Kilit yalnız BİZİMSE kaldırılır — halefin kilidini silmemek için. */
process.on("exit", () => {
  try {
    if (readFileSync(KILIT, "utf8").trim() === String(process.pid)) unlinkSync(KILIT);
  } catch (e) {
    console.log("⚠ kilit kaldırılamadı: " + (e as Error).message);
  }
});

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

kilidiAl();
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
