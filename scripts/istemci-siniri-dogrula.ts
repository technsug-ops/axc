import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

/**
 * ============================================================================
 *  İSTEMCİ SINIRI BEKÇİSİ — `"use client"` SUNUCUYA UZANAMAZ (K48 · 2+3+4)
 * ----------------------------------------------------------------------------
 *  ⛔ ÜÇ SINIF, TEK SINIR. 30.08.2026'da `tsc`nin görmediği sınıflar ölçüldü;
 *  üçü de istemci/sunucu sınırının aynı tarafında duruyor:
 *
 *    ② istemci → sunucu modülü (`@/lib/prisma` → `fs`·`net`·`tls`)
 *       `tsc` ✗ · `next build` ✓  (`Module not found: Can't resolve 'fs'`)
 *    ③ istemci → `next/headers`
 *       `tsc` ✗ · `next build` ✓
 *    ④ `"use client"` içinde `export const metadata`
 *       `tsc` ✗ · `next build` ✗  ⛔ İKİSİ DE GÖRMÜYOR — SESSİZ SINIF
 *
 *  ⚠ 4. SINIF NİYE BURADA: build bile yakalamıyor. Next istemci bileşenindeki
 *  `metadata`yı SESSİZCE yok sayıyor — sekme başlığı yanlış kalır, hiçbir yerde
 *  hata çıkmaz ve kimse anlamaz. Bu bekçi onun TEK kapısı.
 *
 *  ── NİYE BUILD VARKEN BU DA VAR ─────────────────────────────────────────
 *  İkisi birbirinin YEDEĞİ: bu bekçi saniyeler sürer ve sebebi tek satırda
 *  söyler; `derleme:dogrula` dakikalar sürer ama BİLİNMEYEN sınıfları da
 *  yakalar. Biri hızlı, biri kesin. _(Kullanıcı kararı 30.08.2026.)_
 *
 *  ── ÖLÇÜT GEÇİŞLİ ───────────────────────────────────────────────────────
 *  ⚠ DOĞRUDAN İÇE AKTARMAYA BAKMAK YETMEZ: `"use client"` bir dosya, sunucu
 *  modülünü ARADAKİ bir modül üzerinden de çekebilir. Bu yüzden içe aktarma
 *  grafı YÜRÜTÜLÜYOR ve yol RAPOR EDİLİYOR — "şu dosya kirli" demek, hangi
 *  zincirden kirlendiğini söylemeden işe yaramaz.
 *
 *  ⚠ VE LİSTE TUTULMUYOR: `src/` altındaki her dosya taranır.
 * ============================================================================
 */

let gecen = 0;
let kalan = 0;

function kontrol(ad: string, sonuc: boolean, gorulen?: unknown) {
  if (sonuc) {
    gecen++;
    console.log(`  OK    ${ad}`);
  } else {
    kalan++;
    console.log(
      `  HATA  ${ad}${gorulen === undefined ? "" : ` — ${JSON.stringify(gorulen)}`}`,
    );
  }
}

function dosyalar(dizin: string): string[] {
  const cikti: string[] = [];
  for (const ad of readdirSync(dizin)) {
    const yol = join(dizin, ad);
    if (statSync(yol).isDirectory()) cikti.push(...dosyalar(yol));
    else if (/\.tsx?$/.test(yol)) cikti.push(yol);
  }
  return cikti;
}

/** ⚠ Yorum soyulur: bir yasağı ANLATAN yorum onu ÇİĞNEMİŞ sayılmaz. */
function yorumsuz(metin: string): string {
  return metin
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

function istemciMi(kaynak: string): boolean {
  const ilk = yorumsuz(kaynak).trim().split("\n")[0]?.trim() ?? "";
  return ilk === '"use client";' || ilk === "'use client';";
}

/**
 * Dosya `"use server"` SINIRI mı?
 *
 * ⚠ İşaret dosyanın BAŞINDA olmak zorunda — ortada geçen bir dize dosyayı
 * sunucu eylemi yapmaz. (Aynı ölçüt `sunucu-eylemi:dogrula`da da var; orada
 * dışa aktarım kuralı, burada graf sınırı için kullanılıyor.)
 */
function sunucuEylemiMi(yol: string): boolean {
  let kaynak: string;
  try {
    kaynak = readFileSync(yol, "utf8");
  } catch {
    return false;
  }
  const ilk = yorumsuz(kaynak).trim().split("\n")[0]?.trim() ?? "";
  return ilk === '"use server";' || ilk === "'use server';";
}

/**
 * SUNUCU MODÜLLERİ — istemci tarafında ÇÖZÜLEMEYENLER.
 *
 * ⚠ LİSTE DEĞİL DESEN: Node çekirdek modülleri (`fs` · `net` · `tls` …) ve
 * Next'in sunucu uçları. `@/lib/prisma` buraya YAZILMIYOR — o zaten `fs`e
 * uzanan bir zincirin başı ve graf onu KENDİLİĞİNDEN buluyor. Elle yazsaydık,
 * yarın açılan ikinci bir sunucu modülü listede olmadığı için kaçardı.
 */
const SUNUCU_MODULLERI =
  /^(node:)?(fs|net|tls|dns|child_process|worker_threads|perf_hooks)(\/|$)|^next\/(headers|server)$|^server-only$|^@prisma\//;

/**
 * ⛔ İLK YAZIMDA BU LİSTE YANLIŞTI VE MUTASYON YAKALADI. Şöyle yazmıştım:
 * `^@prisma\/client$` — TAM eşleşme. Bu depoda gerçek zincir şu:
 *
 *     istemci → `@/lib/prisma` → `@/generated/prisma/client`
 *             → `@prisma/client/runtime/client`
 *
 * yani alt yollu. Desen eşleşmedi ve prisma'yı DOĞRUDAN içeri alan mutasyon
 * YEŞİL geçti — bekçi, kapatmak için yazıldığı sınıfı kaçırdı.
 *
 * ⚠ SEBEP: listeyi ÖLÇMEDEN, genel Next dünyasından yazdım. Bu deponun
 * gerçekte neyi içeri aldığına bakılmamıştı. `next build`in 30.08'de
 * bastığı hatalar (`Can't resolve 'fs'` · `'net'` · `'tls'`) zaten doğru
 * yeri gösteriyordu.
 * _(Anayasa: "bekçi ölçütü elle tutulan liste değil, tersten kurulur".)_
 */

/**
 * ÇALIŞMA ZAMANINDA GERÇEKTEN ÇEKİLEN içe aktarmalar.
 *
 * ⛔ `import type` HARİÇ — VE BU ÖLÇÜMLE BULUNDU. Desen genişletilince bekçi
 * dört gerçek dosyada kırmızı yandı ve dördü de şuydu:
 *
 *     import type { SimulasyonZemini } from "@/lib/fiyatlama/kart-verisi";
 *     import type { YasBandi }        from "@/lib/yaslanma";
 *     import type { UrunZemini }      from "@/lib/simulasyon/urun-zemini";
 *
 * Tip içe aktarması derlemede SİLİNİR; modül istemci paketine HİÇ girmez.
 * `next build`in bunlardan şikâyet etmemesinin sebebi de bu — bekçinin
 * ölçütü buildinkiyle aynı olmalı, ondan SIKI değil. Sıkı olsaydı dört
 * meşru dosya sonsuza kadar kırmızı yanardı ve bekçi okunmaz olurdu.
 *
 * ⚠ KARIŞIK İÇE AKTARMA HARİÇ DEĞİL: `import { a, type B } from "x"` modülü
 * GERÇEKTEN çeker. Yalnız satırın `import type` ile BAŞLADIĞI hâl silinir.
 */
function icaktarmalar(kaynak: string): string[] {
  const temiz = yorumsuz(kaynak);
  const cikti: string[] = [];
  /**
   * ⛔ ARALIK NOKTALI VİRGÜLÜ AŞAMAZ — VE BU KURAL MUTASYONLA BULUNDU.
   *
   * İlk yazımda span `[\s\S]*?` idi. Dosyanın başındaki bir `export type X = {`
   * eşleşmeyi başlatıyor, tembel aralık **dosyada ilk `from "` bulunana kadar
   * her şeyi yutuyor** ve aradaki gerçek `import` satırları o aralığın içinde
   * kalıyordu. Üstelik m[3] `type` ile başladığı için eşleşme "tip" sayılıp
   * ATLANIYORDU — yani o içe aktarmalar hiç görülmüyordu.
   *
   * Ölçüldü: `tasima.ts`e enjekte edilen `import { prisma }` çıkarıcıya
   * HİÇ düşmedi (`içe aktarmalar: []`) ve geçişli mutasyon YEŞİL kaçtı.
   * Bekçi yeşildi çünkü BAKMIYORDU.
   *
   * `(?!;)` aralığı bir bildirimin içinde tutuyor: çok satırlı bir içe
   * aktarmada `from`dan önce `;` bulunmaz, ama iki ayrı bildirimin arasında
   * MUTLAKA bulunur.
   */
  for (const m of temiz.matchAll(
    /(^|\n)\s*(import|export)((?:(?!;)[\s\S])*?)from\s+["']([^"']+)["']/g,
  )) {
    /** ⚠ `import type` / `export type` — derlemede silinir. */
    if (/^\s+type\b/.test(m[3])) continue;
    cikti.push(m[4]);
  }
  /** Yan etkili içe aktarma: `import "x";` — tip olamaz, her zaman çeker. */
  for (const m of temiz.matchAll(/(^|\n)\s*import\s+["']([^"']+)["']/g)) cikti.push(m[2]);
  return cikti;
}

/** `@/...` ve göreli yolları gerçek dosyaya çözer. */
function cozumle(kaynakYol: string, hedef: string): string | null {
  let taban: string;
  if (hedef.startsWith("@/")) taban = resolve("src", hedef.slice(2));
  else if (hedef.startsWith(".")) taban = resolve(dirname(kaynakYol), hedef);
  else return null;
  for (const ek of [".ts", ".tsx", "/index.ts", "/index.tsx", ""]) {
    const y = taban + ek;
    if (existsSync(y) && statSync(y).isFile()) return y;
  }
  return null;
}

console.log("");
console.log('İSTEMCİ SINIRI BEKÇİSİ — `"use client"` sunucuya uzanamaz');
console.log("=".repeat(70));

const hepsi = dosyalar("src");
const istemciler = hepsi.filter((y) => istemciMi(readFileSync(y, "utf8")));

/** ⛔ Sıfır dosya bulmak "temiz" değil "okuyamadım"dır. */
kontrol(`istemci bileşeni BULUNDU (${istemciler.length})`, istemciler.length > 0);
kontrol(`  ...ve tarama gerçekten koştu (${hepsi.length} dosya)`, hepsi.length > 200);

/* ═══ ② + ③ — GEÇİŞLİ SUNUCU MODÜLÜ ═════════════════════════════════════ */
/**
 * Bir istemci dosyasından başlayıp içe aktarma grafını yürütür; sunucu
 * modülüne varan İLK yolu döndürür.
 */
function kirliYol(baslangic: string): string[] | null {
  const gorulen = new Set<string>();
  const kuyruk: { yol: string; iz: string[] }[] = [{ yol: baslangic, iz: [baslangic] }];
  while (kuyruk.length > 0) {
    const { yol, iz } = kuyruk.shift()!;
    if (gorulen.has(yol)) continue;
    gorulen.add(yol);
    let kaynak: string;
    try {
      kaynak = readFileSync(yol, "utf8");
    } catch {
      continue;
    }
    for (const hedef of icaktarmalar(kaynak)) {
      if (SUNUCU_MODULLERI.test(hedef)) return [...iz, hedef];
      const cozulen = cozumle(yol, hedef);
      if (cozulen === null) continue;
      /**
       * ⛔ `"use server"` BİR SINIRDIR, SIZINTI DEĞİL — GRAF ORADA DURUR.
       *
       * ⚠ İLK YAZIMDA DURMUYORDU VE BEKÇİ 76 YANLIŞ POZİTİF ÜRETTİ: her
       * istemci bileşeni bir sunucu eylemi çağırıyor, o eylem `yetki`yi,
       * o da `oturum`u, o da `next/headers`i içeri alıyor. Zincir gerçek
       * ama İSTEMCİ PAKETİNE GİRMİYOR — Next o içe aktarmayı derlemede bir
       * RPC saplamasına çeviriyor.
       *
       * ⭐ VE ÖLÇÜM BUNU DOĞRULUYOR: `next build` 30.08'de bu 76 zincirin
       * hiçbirinden şikâyet etmedi; yalnız prisma'yı DOĞRUDAN içeri alan
       * sentetik dosyaya kırmızı yandı. Bekçinin ölçütü buildinkiyle aynı
       * olmalı, ondan sıkı değil.
       *
       * ⚠ YANLIŞ UYARI, UYARISIZLIKTAN KÖTÜDÜR: 76 satır kırmızı yanan bir
       * bekçi okunmaz olur ve yanındaki gerçek uyarıyı da götürür.
       */
      if (sunucuEylemiMi(cozulen)) continue;
      kuyruk.push({ yol: cozulen, iz: [...iz, cozulen] });
    }
  }
  return null;
}

let kirli = 0;
for (const y of istemciler) {
  const yol = kirliYol(y);
  if (yol !== null) {
    kirli++;
    kontrol(`${y}`, false, yol.join("  →  "));
  }
}
kontrol("hiçbir istemci bileşeni sunucu modülüne UZANMIYOR", kirli === 0, kirli);

/* ═══ ④ — İSTEMCİDE metadata ════════════════════════════════════════════ */
/**
 * ⛔ SESSİZ SINIF. Next istemci bileşenindeki `metadata`yı yok sayar; ne
 * `tsc` ne `next build` şikâyet eder (30.08.2026'da ikisi de ölçüldü).
 * Sekme başlığı sessizce yanlış kalır.
 */
const METADATA_YASAGI = /^\s*export\s+(const\s+metadata\b|async\s+function\s+generateMetadata\b)/m;
let metadatali = 0;
for (const y of istemciler) {
  if (METADATA_YASAGI.test(yorumsuz(readFileSync(y, "utf8")))) {
    metadatali++;
    kontrol(`${y}`, false, "istemci bileşeninde metadata — SESSİZCE yok sayılır");
  }
}
kontrol("hiçbir istemci bileşeni metadata DIŞA AKTARMIYOR", metadatali === 0, metadatali);

/* ═══ ÖLÇÜTÜN KENDİSİ ÖLÇÜLÜR ═══════════════════════════════════════════ */
/**
 * ⚠ Desen aradığını GERÇEKTEN buluyor mu? Sentetik vaka enjekte edilip
 * ısırdığı GÖRÜLMEDEN tarama doğru sayılmaz.
 */
{
  kontrol("ölçüt `next/headers`i tanıyor", SUNUCU_MODULLERI.test("next/headers"));
  kontrol("  ...`fs` ve `node:fs`", SUNUCU_MODULLERI.test("fs") && SUNUCU_MODULLERI.test("node:fs"));
  kontrol("  ...`@prisma/client`", SUNUCU_MODULLERI.test("@prisma/client"));
  /** ⚠ YANLIŞ YANMA: masum modüller kapsama girmemeli. */
  kontrol(
    "  ...ve masum modülleri kirli SAYMIYOR",
    !SUNUCU_MODULLERI.test("react") &&
      !SUNUCU_MODULLERI.test("next/link") &&
      !SUNUCU_MODULLERI.test("@/lib/renkler") &&
      !SUNUCU_MODULLERI.test("fsevents"),
  );
  kontrol(
    "metadata deseni sentetik ihlali YAKALIYOR",
    METADATA_YASAGI.test('export const metadata = { title: "x" };'),
  );
  kontrol(
    "  ...`generateMetadata` da",
    METADATA_YASAGI.test("export async function generateMetadata() {}"),
  );
  /** ⚠ Yorumdaki söz ihlal değildir. */
  kontrol(
    "  ...ve YORUMDAKİ sözü ihlal saymıyor",
    !METADATA_YASAGI.test(yorumsuz("// export const metadata = 1;\nconst a = 1;")),
  );
  kontrol(
    "işaret ortada geçerse istemci SAYILMIYOR",
    !istemciMi('const d = "use client";\nexport const metadata = 1;'),
  );
  /** ⚠ Yol çözücü gerçekten çözüyor mu — çözemezse graf sessizce boş kalır. */
  kontrol(
    "yol çözücü `@/` takma adını çözüyor",
    cozumle("src/app/x.tsx", "@/lib/renkler") !== null,
  );
}

console.log("");
console.log("=".repeat(70));
if (kalan === 0) console.log(`TÜM KONTROLLER GEÇTİ (${gecen})`);
else {
  console.log(`${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrolden)`);
  process.exitCode = 1;
}
console.log("");
