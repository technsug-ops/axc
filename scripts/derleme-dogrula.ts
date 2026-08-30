import { spawnSync } from "node:child_process";

/**
 * ============================================================================
 *  DERLEME BEKÇİSİ — `next build` (K48, kullanıcı kararı 30.08.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ NİYE VAR — BEDELİ ÖLÇÜLDÜ. 30.08'de üç push boyunca üç ekran canlıda
 *  YOKTU (`/yerlestir`, `/paketle` raf okuması, toplu taşıma) ve hiçbir bekçi
 *  görmedi. Tur 63/63 yeşildi ve kod YAYINLANAMIYORDU: `"use server"`
 *  dosyasındaki tek bir sabit modülün bütün dışa aktarımlarını düşürmüştü.
 *  Halil'in test listesi ayrımı gösterdi — A ✓ B ✓ (önceki deploy) ·
 *  C ✗ D ✗ E ✗ (yayınlanmamış üç paket). **"Yeşil" yanlış güvence verdi.**
 *
 *  ── NİYE DESEN YASAĞI YETMİYOR ──────────────────────────────────────────
 *  Desen yasağı **bilinen sınıfların listesidir**; build **yer gerçeğidir**.
 *  30.08'de dört sınıf ölçüldü ve tamlık iddia EDİLMEDİ — Next sürümü
 *  değiştikçe sınıf doğar. _(Anayasa: "bir kaynağın listesi kendi tamlığını
 *  kanıtlayamaz".)_ Hızlı bekçiler (`sunucu-eylemi:dogrula`,
 *  `istemci-siniri:dogrula`) bunun YEDEĞİ: biri hızlı, biri kesin.
 *
 *  ── TİP KONTROLÜ BURADA KAPALI — VE NİYE ────────────────────────────────
 *  `tsc:dogrula` zaten `tsc --noEmit` koşuyor; build içinde ikinci kez
 *  koşmak hem gereksiz hem PAHALI. Ölçüldü 30.08.2026:
 *
 *      tip kontrolü AÇIK   → BELLEKTEN DÜŞÜYOR (12,7 GB RAM, 0,5 GB boş)
 *      tip kontrolü KAPALI → 122 sn, çıkış 0
 *      derleme HATASI      →  33 sn (hızlı düşer)
 *
 *  ⚠ VE KAPATMA YALNIZ BURADA GEÇERLİ: `next.config.ts` bunu `BEKCI_DERLEME`
 *  ortam değişkenine bağlıyor. Vercel o değişkeni KURMUYOR, dolayısıyla
 *  canlı deploy'da tip kontrolü ve lint TAM koşmaya devam ediyor. Genel
 *  olarak kapatılsaydı son kapı da körelirdi.
 *
 *  ── AYRI ÇIKTI DİZİNİ ───────────────────────────────────────────────────
 *  `.next-bekci`ye yazıyor. `.next`e yazsaydı, açık bir `next dev`
 *  sunucusunun yapısını ezerdi ve geliştirme ortası bozulurdu.
 *
 *  ⚠ SÜRE BÜYÜRSE ÇÖZÜM BUILD'İ ÇIKARMAK DEĞİL (kullanıcı kararı):
 *  paralel koşum ya da önbellek ölçülür. Ayrı kalem.
 * ============================================================================
 */

console.log("");
console.log("DERLEME BEKÇİSİ — next build (tip kontrolü `tsc:dogrula`da)");
console.log("=".repeat(70));

const basladi = Date.now();
const r = spawnSync("npx next build", {
  shell: true,
  encoding: "utf8",
  env: {
    ...process.env,
    /** ⭐ TEK ANAHTAR: `next.config.ts` bunu görünce tip kontrolünü ve
     *  lint'i atlar, çıktıyı `.next-bekci`ye yazar. Vercel kurmaz. */
    BEKCI_DERLEME: "1",
  },
  maxBuffer: 64 * 1024 * 1024,
});

const sure = ((Date.now() - basladi) / 1000).toFixed(0);
const cikti = `${r.stdout ?? ""}\n${r.stderr ?? ""}`;

if (r.status === 0) {
  /**
   * ⚠ "ÇIKIŞ 0" TEK BAŞINA YETMEZ — derlemenin GERÇEKTEN koştuğu da
   * doğrulanır. Yapılandırma bir gün derlemeyi atlarsa çıkış 0 gelir ve
   * bekçi hiçbir şey ölçmemiş olur.
   * _(Anayasa: "boş sonuç ile temiz sonucu ayırt edemeyen denetim, denetim
   * değildir".)_
   */
  if (!/Compiled successfully/.test(cikti)) {
    console.log("  HATA  build çıkış 0 döndü ama DERLEME KOŞMADI");
    console.log(cikti.split("\n").slice(-25).join("\n"));
    console.log("");
    console.log("=".repeat(70));
    console.log("1 KONTROL BAŞARISIZ (1 kontrolden)");
    console.log("");
    process.exitCode = 1;
  } else {
    console.log(`  OK    derleme geçti (${sure} sn)`);
    console.log("");
    console.log("=".repeat(70));
    console.log("TÜM KONTROLLER GEÇTİ (1)");
    console.log("");
  }
} else {
  /**
   * ⛔ HATA MESAJI TAM TAŞINIR. Kırpma yalnız GÖSTERİMDE yapılır ve
   * "ilk satır" alınmaz — Prisma/Turbopack mesajları boş satırla başlayabilir
   * ve sebep mesajın SONUNDA olabilir (26.08 dersi: 44 alım düştü ve niye
   * düştüğü ölçülemedi).
   */
  console.log(`  HATA  derleme DÜŞTÜ (${sure} sn, çıkış ${r.status})`);
  console.log("");
  const satirlar = cikti.split("\n").filter((s) => s.trim() !== "");
  const ilgili = satirlar.filter((s) => /Error|error|\.\/src\//.test(s));
  for (const s of (ilgili.length > 0 ? ilgili : satirlar).slice(0, 40))
    console.log("    " + s);
  console.log("");
  console.log("=".repeat(70));
  console.log("1 KONTROL BAŞARISIZ (1 kontrolden)");
  console.log("");
  process.exitCode = 1;
}
