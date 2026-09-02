import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

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
 *
 *  ── ⚠ `tsconfig.json`I İLK KOŞUMDA NEXT KENDİSİ YENİDEN YAZDI ───────────
 *  `next build` `include` listesine `.next-bekci/types` altındaki yolları
 *  EKLEDİ ve dosyayı yeniden biçimledi. İzlenen bir dosyanın bekçi tarafından
 *  değiştirilmesi kabul edilebilir değil, o yüzden ÖLÇÜLDÜ: değişiklik TEK
 *  SEFERLİK. İkinci koşumdan sonra `git status` temiz kalıyor (denendi).
 * ============================================================================
 */

let basarisiz = 0;
let calisan = 0;
const BOLUM_SAYISI = 2;
const kosanBolumler: string[] = [];

function kontrol(ad: string, kosul: boolean, ayrinti?: unknown) {
  calisan++;
  if (kosul) {
    console.log(`  OK    ${ad}`);
  } else {
    basarisiz++;
    console.log(`  HATA  ${ad}`);
    if (ayrinti !== undefined) {
      console.log("        " + JSON.stringify(ayrinti).slice(0, 900));
    }
  }
}

console.log("");
console.log("DERLEME BEKÇİSİ — next build (tip kontrolü `tsc:dogrula`da)");
console.log("=".repeat(70));

/* ══════════════════════════════════════════════════════════════════════════
 *  ① ÜRETİLMİŞ TİP YASAĞI — `tsc` ÜRETİLMİŞ YAPIYA BAĞIMLI OLAMAZ
 * ──────────────────────────────────────────────────────────────────────────
 *  ⛔ NİYE: bu dosya 30.08'de şunu İDDİA ediyordu —
 *  _"`tsc:dogrula`nın üretilmiş yapıya bağımlılığı zaten kaldırıldı"_ —
 *  ve o iddiayı ölçen HİÇBİR ŞEY yoktu. `layout.tsx` elle düzeltilmiş,
 *  yanına _"depoda başka üretilmiş tip kullanımı YOK (tarandı)"_ yazılmıştı.
 *  **Tarama bir kerelik bakıştır; desen yasağı değildir.**
 *  _(Anayasa: "'dokunmuyor' iddiası da bir davranıştır" · "düzeltmenin
 *  çaresi dosya listesi değil, desen yasağıdır".)_
 *
 *  ⚠ VE BOZULMA SESSİZ OLURDU: `LayoutProps<"/">` yazan biri YERELDE hiçbir
 *  şey görmez — `.next/types` orada durduğu için `tsc` geçer. Yalnız TEMİZ
 *  KLONDA düşer, ve düşen şey `tsc:dogrula` olur: sebebi koddaki bir hata
 *  değil, EKSİK BİR ÇIKTI gibi görünür. 30.08'de tam bu ölçüldü — `.next`
 *  silinince tur 63/64'e iniyordu.
 *
 *  ⭐ YASAK ADA DEĞİL, ÇÖZÜLMEMİŞ ATFA BAĞLI. Üretilen adların bir kısmı
 *  tehlikeli derecede genel (`Routes` · `PageProps` · `ParamMap`); adı
 *  yasaklamak kendi tipimize de yanardı. Ölçüt: **dosya o adı KENDİ
 *  tanımlamıyor ya da içe aktarmıyorsa**, atıf global (yani üretilmiş)
 *  tiptedir ve yasaktır.
 * ══════════════════════════════════════════════════════════════════════════ */

/**
 * Next'in `.next/types` altına ürettiği GLOBAL tipler.
 *
 * 📏 ÖLÇÜLDÜ 03.09.2026 — `.next/types/*.d.ts` + `.next-bekci/types/*.d.ts`
 * içindeki üst düzey `type`/`interface` bildirimleri okunarak çıkarıldı.
 *
 * ⚠ LİSTE ELLE TUTULMUYOR — TAZELİĞİ AŞAĞIDA ÖLÇÜLÜYOR. Üretilmiş dizin
 * varsa gerçek çıktıyla karşılaştırılır ve Next yeni bir tip üretmişse bekçi
 * KIRMIZI yanar. Liste yalnız TEMİZ KLONDA (dizin yokken) tek başına çalışır;
 * orada da taban BOŞ kalmasın diye vardır.
 * _(Anayasa: "bekçi ölçütü elle tutulan liste değil, tersten kurulur".)_
 */
const URETILMIS_TIPLER = [
  "AppRouteHandlerRoutes",
  "AppRoutes",
  "LayoutProps",
  "LayoutRoutes",
  "LayoutSlotMap",
  "PageProps",
  "PageRoutes",
  "ParamMap",
  "RedirectRoutes",
  "RewriteRoutes",
  "RouteContext",
  "Routes",
];

/** ⚠ Yorum soyulur: bir yasağı ANLATAN yorum onu ÇİĞNEMİŞ sayılmaz. */
function yorumsuz(metin: string): string {
  return metin
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

/** Dosyanın KENDİ bağladığı adlar: bildirimler + içe aktarımlar. */
function yerelAdlar(kod: string): Set<string> {
  const kume = new Set<string>();
  const bildirim = /\b(?:type|interface|class|enum|const|let|var|function)\s+([A-Za-z_$][\w$]*)/g;
  for (const m of kod.matchAll(bildirim)) kume.add(m[1]);
  const iceAktarim = /\bimport\s+(?:type\s+)?([\s\S]*?)\s+from\s/g;
  for (const m of kod.matchAll(iceAktarim)) {
    for (const ad of m[1].matchAll(/[A-Za-z_$][\w$]*/g)) kume.add(ad[0]);
  }
  return kume;
}

function kaynakDosyalari(dizin: string): string[] {
  const cikti: string[] = [];
  for (const ad of readdirSync(dizin)) {
    const yol = join(dizin, ad);
    if (statSync(yol).isDirectory()) cikti.push(...kaynakDosyalari(yol));
    else if (/\.tsx?$/.test(yol)) cikti.push(yol);
  }
  return cikti;
}

console.log("");
console.log("── ① ÜRETİLMİŞ TİP YASAĞI ──────────────────────────────");

const kaynaklar = kaynakDosyalari("src");

/**
 * ⭐ TABAN DOLULUĞU AYRICA KANITLANIR. Aşağıdaki ihlal kontrolü boş liste
 * üzerinde de `true` verir — tarama hiçbir dosyayı okumasa bekçi "temiz"
 * derdi. _(Anayasa: "`EVERY` kapısı taban doluluğunu ayrıca kanıtlar".)_
 */
kontrol(
  `taranan kaynak dosyası >= 300 (${kaynaklar.length})`,
  kaynaklar.length >= 300,
  kaynaklar.length,
);
kontrol(
  `yasaklı tip tabanı >= 10 (${URETILMIS_TIPLER.length})`,
  URETILMIS_TIPLER.length >= 10,
  URETILMIS_TIPLER.length,
);

/**
 * TABAN TAZELİĞİ — üretilmiş dizin VARSA gerçek çıktıyla karşılaştırılır.
 *
 * ⚠ "0 buldum" ile "okuyamadım" AYRI SÖYLENİR: dizin yoksa bu kontrol
 * ATLANIR ve atlandığı YAZILIR — sessizce yeşil verilmez.
 * _(Anayasa: "boş sonuç ile temiz sonucu ayırt edemeyen denetim, denetim
 * değildir".)_
 */
const tipDizinleri = [".next/types", ".next-bekci/types"].filter((d) =>
  existsSync(d),
);
if (tipDizinleri.length === 0) {
  console.log(
    "  ⏭ ATLANDI  taban tazeliği — üretilmiş tip dizini YOK " +
      "(temiz klon). Liste tek başına geçerli; ölçülmedi.",
  );
} else {
  const gercek = new Set<string>();
  for (const d of tipDizinleri) {
    for (const ad of readdirSync(d)) {
      if (!/\.d\.ts$/.test(ad)) continue;
      const metin = readFileSync(join(d, ad), "utf8");
      for (const m of metin.matchAll(/^\s*(?:type|interface)\s+([A-Z][\w$]*)/gm)) {
        gercek.add(m[1]);
      }
    }
  }
  const eksik = [...gercek].filter((t) => !URETILMIS_TIPLER.includes(t));
  kontrol(
    `taban TAZE — Next'in ürettiği her tip listede (${gercek.size} okundu)`,
    gercek.size > 0 && eksik.length === 0,
    { eksik, okunan: gercek.size, dizin: tipDizinleri },
  );
}

/**
 * ÇÖZÜLMEMİŞ ATIF — SAF GÖVDE.
 *
 * ⛔ İŞARET ADA DEĞİL, ATFA BAĞLI: dosya adı kendisi tanımlıyor ya da içe
 * aktarıyorsa o ad GLOBAL değildir ve yasak işlemez.
 *
 * ⭐ SAF OLMASININ SEBEBİ: aşağıda DEĞER testiyle sınanıyor. Kaynak taraması
 * son çaredir; ayrım saf bir gövdeye taşınabiliyorsa taşınır.
 * _(Anayasa: "saf hesap katmanı, desen tarayan bekçiye muhtaç olmaz".)_
 */
function cozulmemisAtiflar(ham: string): string[] {
  const kod = yorumsuz(ham);
  const yerel = yerelAdlar(kod);
  return URETILMIS_TIPLER.filter(
    (tip) => !yerel.has(tip) && new RegExp(`\\b${tip}\\b`).test(kod),
  );
}

/**
 * ⭐ DEĞER TESTLERİ — AYRIMIN İKİ YAKASI.
 * Kural: "üretilmiş tipe atıf yasak" ile "aynı ADI kendi tanımlamak serbest"
 * ayrı sonuç vermeli. Yalnız ihlal tarafı sınansaydı, her atfı ihlal sayan
 * bir gövde de yeşil kalırdı.
 * _(Anayasa: "örnek veri ayrımın iki yakasını göstermeli".)_
 */
kontrol(
  "İHLAL: global `LayoutProps` atfı yakalanıyor",
  cozulmemisAtiflar('const x: LayoutProps<"/"> = y;').includes("LayoutProps"),
);
kontrol(
  "SERBEST: aynı adı KENDİ tanımlayan dosya yakalanmıyor",
  cozulmemisAtiflar("type Routes = string;\nconst x: Routes = y;").length === 0,
);
kontrol(
  "SERBEST: adı İÇE AKTARAN dosya yakalanmıyor",
  cozulmemisAtiflar('import { PageProps } from "./t";\nlet x: PageProps;')
    .length === 0,
);
kontrol(
  "SERBEST: yalnız YORUMDA geçen ad yakalanmıyor",
  cozulmemisAtiflar("/** LayoutProps KULLANILMIYOR */\nconst a = 1;").length ===
    0,
);

/**
 * GERÇEK TARAMA.
 *
 * ⛔ SAYAÇ ZORUNLU: `ihlaller.length === 0` ölçütü, döngü HİÇ KOŞMASA da
 * `true` verir — tarama silinse bekçi "temiz" derdi. Taranan dosya sayısı
 * ayrıca kanıtlanıyor.
 * _(Anayasa: "`EVERY` kapısı taban doluluğunu ayrıca kanıtlar" — burada
 * kanıtlanan şey tabanın değil, TARAMANIN doluluğu.)_
 */
let tarandi = 0;
const ihlaller: string[] = [];
for (const yol of kaynaklar) {
  tarandi++;
  for (const tip of cozulmemisAtiflar(readFileSync(yol, "utf8"))) {
    ihlaller.push(`${yol.replace(/\\/g, "/")} → ${tip}`);
  }
}
kontrol(
  `tarama GERÇEKTEN koştu — ${tarandi}/${kaynaklar.length} dosya okundu`,
  tarandi === kaynaklar.length && tarandi >= 300,
  { tarandi, beklenen: kaynaklar.length },
);
kontrol(
  "üretilmiş global tipe çözülmemiş atıf YOK",
  ihlaller.length === 0,
  ihlaller.slice(0, 10),
);
kosanBolumler.push("üretilmiş tip yasağı");

/**
 * ⛔ BUILD'DEN ÖNCE DÜŞ. Bu bölüm ~1 sn; build 122 sn. Yasak ihlal edilmişse
 * cevabı iki dakika beklemenin bir faydası yok.
 */
if (basarisiz > 0) {
  console.log("");
  console.log("=".repeat(70));
  console.log(`${basarisiz} KONTROL BAŞARISIZ (${calisan} kontrol içinde)`);
  console.log("⛔ build KOŞULMADI — önce yukarıdaki ihlali düzeltin.");
  console.log("");
  process.exit(1);
}

/* ══════════════════════════════════════════════════════════════════════════
 *  ② `next build` — YER GERÇEĞİ
 * ══════════════════════════════════════════════════════════════════════════ */

console.log("");
console.log("── ② NEXT BUILD ────────────────────────────────────────");

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
  kontrol(
    `derleme geçti ve GERÇEKTEN koştu (${sure} sn)`,
    /Compiled successfully/.test(cikti),
  );
  if (!/Compiled successfully/.test(cikti)) {
    console.log(cikti.split("\n").slice(-25).join("\n"));
  }
} else {
  /**
   * ⛔ HATA MESAJI TAM TAŞINIR. Kırpma yalnız GÖSTERİMDE yapılır ve
   * "ilk satır" alınmaz — Prisma/Turbopack mesajları boş satırla başlayabilir
   * ve sebep mesajın SONUNDA olabilir (26.08 dersi: 44 alım düştü ve niye
   * düştüğü ölçülemedi).
   */
  kontrol(`derleme geçti (${sure} sn, çıkış ${r.status})`, false);
  console.log("");
  const satirlar = cikti.split("\n").filter((s) => s.trim() !== "");
  const ilgili = satirlar.filter((s) => /Error|error|\.\/src\//.test(s));
  for (const s of (ilgili.length > 0 ? ilgili : satirlar).slice(0, 40))
    console.log("    " + s);
}
kosanBolumler.push("next build");

/* ══════════════════════════════════════════════════════════════════════════
 *  ÖZET — ⛔ BÖLÜM SAYACI, SIRA DEĞİL
 * ──────────────────────────────────────────────────────────────────────────
 *  Bir bölüm koşmazsa (erken `return`, yutulan hata, sıra bozulması) bekçi
 *  "geçti" DEMEZ, **GEÇERSİZ** der.
 *  _(Anayasa: "ölçüt bloğu özet ve çıkış kodundan önce koşar" — ve çaresi
 *  sırayı doğru tutmak değil, SAYAÇ.)_
 * ══════════════════════════════════════════════════════════════════════════ */

console.log("");
console.log("=".repeat(70));
if (kosanBolumler.length !== BOLUM_SAYISI) {
  console.log(
    `⛔ KOŞUM YARIM KALDI — ${kosanBolumler.length}/${BOLUM_SAYISI} bölüm. ` +
      "Sonuç GEÇERSİZ.",
  );
  console.log("");
  process.exit(1);
}
if (basarisiz === 0) {
  console.log(`TÜM KONTROLLER GEÇTİ (${calisan})`);
  console.log("");
} else {
  console.log(`${basarisiz} KONTROL BAŞARISIZ (${calisan} kontrol içinde)`);
  console.log("");
  process.exitCode = 1;
}
