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

import { readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";

import { KILIT, kilitDurumu, sonTurPenceresiniYaz } from "./bekci-kilit";
import { mutasyonAdiMi, SIRALI_MUTASYON_GRUP } from "./mutasyon-hedefleri";
import { spawn, spawnSync } from "node:child_process";

/**
 * ============================================================================
 *  MUTASYON BEKÇİLERİ PARALEL (K202 SORUN B, 09.09.2026 ölçümü)
 * ----------------------------------------------------------------------------
 *  ⛔ NİYE VAR: 23 mutasyon bekçisi turun %57,8'i (640s/1107s). Bağımsız
 *  süreçler — durum paylaşmıyorlar — SERİ koşmak için hiçbir sebep yok.
 *
 *  ⚠ AMA "BAĞIMSIZ" ÖLÇÜLDÜ, VARSAYILMADI: iki harness AYNI hedef dosyayı
 *  mutasyona uğratıp `finally`de geri yazıyorsa paralel koşum YARIŞ
 *  DURUMU üretir. `scripts/mutasyon-hedefleri.ts` kaynağı tarayıp GERÇEK
 *  çakışmaları bulmuş (4 dosya, 7 harness, `mal-kabul` ve `panel` köprü) —
 *  bu 7'si `SIRALI_MUTASYON_GRUP`te birbirine göre SIRALI kalıyor, kalan
 *  ~15'i tam paralel.
 *
 *  ⛔ ÇIKARILMADI — sadece HIZLANDI. Push kapısındaki yeri anayasa gereği
 *  aynı: mutasyon bekçileri push anında çapa-kopmasını yakalıyor (bugün
 *  stok-siralama + urun-analizi vakaları); seyrek CI'ye taşınsaydı "push
 *  edildi, koruması kör" penceresi açardı.
 * ============================================================================
 */
const ES_ZAMANLI_SINIR = 4; // ölçülen CPU sayısı (09.09.2026, geliştirme makinesi)

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
    if (readFileSync(KILIT, "utf8").trim() === String(process.pid)) {
      /**
       * ⭐ TURUN PENCERESİ KAYDA GEÇER (K198). Commit kapısı bunu okuyup
       * "indeks bu turun İÇİNDE mi hazırlandı" diye soracak: tur koşarken
       * yapılan bir `git add` zehirlenmiş indeksi geride bırakıyordu ve
       * kapı yalnız o ANKİ commit'i durduruyordu.
       * ⚠ SIRA ÖNEMLİ: başlangıç damgası kilidin KENDİ mtime'ı — kilit
       * silindikten sonra okunamaz, o yüzden ÖNCE okunuyor.
       */
      const basladi = statSync(KILIT).mtimeMs;
      unlinkSync(KILIT);
      sonTurPenceresiniYaz(basladi);
    }
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

/**
 * Bir bekçiyi SENKRON koşturur (mevcut davranış — sıralı bölümler için).
 * ⚠ `shell: true` ŞART (Windows). `shell: false` ile `npm.cmd` PATH'ten
 * çözülemedi ve HER bekçi "(çıktı yok)" diye kırmızı yandı — yani betik,
 * yeşil bir depoyu kırmızı gösterdi. Yalancı kırmızı, yalancı yeşil kadar
 * zararlıdır: ikisi de bekçiye olan güveni bitirir.
 */
function senkronKostur(ad: string): Sonuc {
  const basladi = Date.now();
  process.stdout.write(`  ${ad.padEnd(24)} ... `);
  const r = spawnSync(`npm run ${ad}`, { encoding: "utf8", shell: true });
  const saniye = (Date.now() - basladi) / 1000;
  const kod = r.status ?? 1;
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  const ozet = ozetle(cikti);
  console.log(`${kod === 0 ? "OK  " : "KIRMIZI"} ${saniye.toFixed(1)}s  ${ozet}`);
  return { ad, kod, saniye, ozet };
}

/**
 * Bir bekçiyi ASENKRON koşturur (paralel havuz için) — çıktı biriktirilir,
 * süreç bitince TEK satırda basılır (birden çok sürecin çıktısı satır
 * satır karışmasın).
 */
function asenkronKostur(ad: string): Promise<Sonuc> {
  const basladi = Date.now();
  return new Promise((resolve) => {
    const p = spawn(`npm run ${ad}`, { shell: true });
    let cikti = "";
    p.stdout.on("data", (d: Buffer) => (cikti += d.toString()));
    p.stderr.on("data", (d: Buffer) => (cikti += d.toString()));
    p.on("close", (kodHam) => {
      const saniye = (Date.now() - basladi) / 1000;
      const kod = kodHam ?? 1;
      const ozet = ozetle(cikti);
      console.log(
        `  ${ad.padEnd(24)} ... ${kod === 0 ? "OK  " : "KIRMIZI"} ${saniye.toFixed(1)}s  ${ozet}  [paralel]`,
      );
      resolve({ ad, kod, saniye, ozet });
    });
  });
}

/** Eş zamanlılık sınırlı paralel koşum — sınırsız fork kaynağı tüketmesin. */
async function paralelKostur(adlar: string[], sinir: number): Promise<Sonuc[]> {
  const sonuclar: Sonuc[] = new Array(adlar.length);
  let sonrakiIndeks = 0;
  async function isci() {
    while (sonrakiIndeks < adlar.length) {
      const buIndeks = sonrakiIndeks++;
      sonuclar[buIndeks] = await asenkronKostur(adlar[buIndeks]!);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(sinir, adlar.length) }, () => isci()),
  );
  return sonuclar;
}

async function turuKostur(): Promise<Sonuc[]> {
  kilidiAl();
  const liste = bekciler();

  const mutasyonAdlari = liste.filter(mutasyonAdiMi);
  const digerAdlari = liste.filter((ad) => !mutasyonAdiMi(ad));
  const beyanKumesi = new Set(SIRALI_MUTASYON_GRUP);
  const sirali = mutasyonAdlari.filter((ad) => beyanKumesi.has(ad));
  const bagimsiz = mutasyonAdlari.filter((ad) => !beyanKumesi.has(ad));

  console.log("");
  console.log(
    `BEKÇİ TURU — ${liste.length} doğrulama (${digerAdlari.length} sıralı + ` +
      `${sirali.length} sıralı-mutasyon + ${bagimsiz.length} paralel-mutasyon)`,
  );
  console.log("=".repeat(70));

  const sonuclar: Sonuc[] = [];
  for (const ad of digerAdlari) sonuclar.push(senkronKostur(ad));

  console.log("");
  console.log(
    `-- MUTASYON BEKÇİLERİ: ${sirali.length} çakışan (sıralı) + ${bagimsiz.length} bağımsız (paralel, eş zamanlı sınır ${ES_ZAMANLI_SINIR}) --`,
  );
  /**
   * ⭐ İKİ GRUP BİRBİRİNDEN BAĞIMSIZ (dosya çakışması ölçülmüş, bkz.
   * `mutasyon-hedefleri.ts`), o yüzden AYNI ANDA başlarlar: sıralı grup
   * kendi İÇİNDE sırayla, bağımsız grup TAM paralel.
   */
  const [siraliSonuclar, paralelSonuclar] = await Promise.all([
    (async () => {
      const r: Sonuc[] = [];
      for (const ad of sirali) r.push(senkronKostur(ad));
      return r;
    })(),
    paralelKostur(bagimsiz, ES_ZAMANLI_SINIR),
  ]);
  sonuclar.push(...siraliSonuclar, ...paralelSonuclar);
  return sonuclar;
}

/**
 * ⚠ TOP-LEVEL AWAIT YOK — bu depo `tsx`i CJS çıktısına derliyor ve CJS
 * top-level await'i desteklemiyor (`Top-level await is currently not
 * supported with the "cjs" output format`, ölçüldü 09.09.2026). Diğer
 * betiklerin `main().catch(...)` deseni kullanmasının sebebi bu — burada
 * da AYNI desen.
 */
async function main() {
  const sonuclar = await turuKostur();

  const kirmizilar = sonuclar.filter((s) => s.kod !== 0);
  /**
   * ⚠ İKİ SAYI AYRI: paralel koşumda süre TOPLAMI duvar saatini AŞAR (aynı
   * anda geçen saniyeler birden çok kez sayılır). "toplam bekçi süresi"
   * (CPU/süreç maliyeti) ile GERÇEK duvar saati farklı şeylerdir — biri
   * etiketsiz yazılırsa "1107 saniye sürdü" yanlış okunur.
   * _(Anayasa: "bir sayı etiketiyle taşınır".)_
   */
  const toplamSaniye = sonuclar.reduce((t, s) => t + s.saniye, 0);

  console.log("");
  console.log("=".repeat(70));
  console.log(
    `${sonuclar.length - kirmizilar.length}/${sonuclar.length} yeşil · ${toplamSaniye.toFixed(0)} saniye (bekçi süreleri toplamı — paralel koşumda duvar saatinden BÜYÜKTÜR)`,
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
}

main().catch((e) => {
  console.error("BEKLENMEYEN HATA:", e);
  process.exitCode = 1;
});
