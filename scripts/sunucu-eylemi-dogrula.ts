import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * ============================================================================
 *  SUNUCU EYLEMİ BEKÇİSİ — `"use server"` DOSYASI YALNIZ ASYNC DIŞA AKTARIR
 * ----------------------------------------------------------------------------
 *  ⛔ CANLI ARIZA 30.08.2026 — HALİL BULDU. `/yerlestir` menüde görünmüyordu,
 *  `/paketle` raf okuması çalışmıyordu, toplu taşıma düğmesi yoktu. Üçünün
 *  de kökü TEK bir satırdı:
 *
 *      // src/app/yerlestir/actions.ts   ("use server")
 *      export const YERLESTIRME_EYLEMI = "URUN_YERLESTIRILDI";
 *
 *  Next kuralı: `"use server"` işaretli bir dosyada **yalnız async fonksiyon**
 *  dışa aktarılabilir. Sabit konunca modülün **BÜTÜN** dışa aktarımları
 *  düştü (`Export rafiSec doesn't exist in target module`), derleme patladı
 *  ve üç paket canlıya HİÇ ÇIKMADI.
 *
 *  ⛔ VE ÜÇ PUSH BOYUNCA KİMSE GÖRMEDİ. `npm run bekci` 63 doğrulama koşuyor,
 *  `tsc --noEmit` dahil — ve `tsc` BU HATAYI GÖRMEZ. Yalnız `next build`
 *  görür. Bekçi turu derlemeyi sınamıyordu (K48, panoda açık kalem).
 *
 *  ── NİYE `next build` BEKÇİYE KONMADI ───────────────────────────────────
 *  Ölçüldü 30.08.2026: derleme ~75 sn sürüyor ve tip kontrolü aşaması bu
 *  makinede **bellekten düşüyor** (12,7 GB RAM, 0,5 GB boş). Her push'a
 *  dakikalar eklemek ve makineye bağımlı bir kapı kurmak, kapının bir gün
 *  atlanmasını garanti ederdi.
 *
 *  ⭐ BUNUN YERİNE DESEN YASAĞI: hata sınıfı dar ve tam tanımlı. Bu bekçi
 *  saniyeler sürüyor ve aynı sınıfı yakalıyor.
 *  _(Anayasa: "düzeltmenin çaresi dosya listesi değil, desen yasağıdır".)_
 *
 *  ⚠ VE LİSTE TUTMUYOR: `src/` altındaki HER dosya taranır. Yarın açılan bir
 *  sunucu eylemi dosyası da yakalanır; kimsenin listeye eklemesi gerekmez.
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

/**
 * ⚠ YORUM SOYULUR. Bir yasağı ANLATAN yorum, o yasağı ÇİĞNEMİŞ sayılmaz —
 * ve bu dosyanın kendi başlığı `export const YERLESTIRME_EYLEMI` metnini
 * ÖRNEK olarak taşıyor. Soyulmasaydı bekçi kendi belgesini ihlal sayardı.
 */
function yorumsuz(metin: string): string {
  return metin
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

/**
 * Dosya `"use server"` ile mi BAŞLIYOR?
 *
 * ⚠ İŞARET DOSYANIN BAŞINDA OLMAK ZORUNDA. Ortada geçen bir dize (örneğin
 * bir bekçinin arama deseni) dosyayı sunucu eylemi YAPMAZ; öyle sayılsaydı
 * bu bekçinin kendisi de kapsama girerdi.
 */
function sunucuEylemiMi(kaynak: string): boolean {
  const ilk = yorumsuz(kaynak).trim().split("\n")[0]?.trim() ?? "";
  return ilk === '"use server";' || ilk === "'use server';";
}

console.log("");
console.log("SUNUCU EYLEMİ BEKÇİSİ — `\"use server\"` yalnız async dışa aktarır");
console.log("=".repeat(70));

const hepsi = dosyalar("src");
const eylemDosyalari = hepsi.filter((y) => sunucuEylemiMi(readFileSync(y, "utf8")));

/**
 * ⛔ SIFIR DOSYA BULMAK "TEMİZ" DEĞİL, "OKUYAMADIM"DIR. Tarama bozulursa
 * (yol değişir, uzantı süzgeci kayar) bu bekçi sessizce yeşil yanardı.
 * _(Anayasa: "boş sonuç ile temiz sonucu ayırt edemeyen denetim, denetim
 * değildir".)_
 */
kontrol(
  `sunucu eylemi dosyası BULUNDU (${eylemDosyalari.length})`,
  eylemDosyalari.length > 0,
);
kontrol(`  ...ve tarama gerçekten koştu (${hepsi.length} dosya)`, hepsi.length > 200);

/**
 * ═══ ÖLÇÜT ═══════════════════════════════════════════════════════════════
 *  İzinli çalışma-zamanı dışa aktarımı:
 *    · `export async function ad(`
 *    · `export const ad = async (`     — aynı şeyin ok gösterimli hâli
 *  Tip dışa aktarımları (`export type` / `export interface`) derlemede
 *  SİLİNİR, dolayısıyla serbest.
 */
/**
 * ⚠ NEGATİF İLERİ-BAKIŞ KALDIRILDI — ÖLÇÜLEMEDİĞİ İÇİN.
 *
 * Önce `(?!async\s+function|type\b|interface\b)` de vardı. Mutasyon denemesi
 * onu SİLDİ ve bekçi YEŞİL kaldı: `export async function` ve `export type`
 * zaten alternasyona (`const|let|var|function|class|default`) uymuyor,
 * dolayısıyla ileri-bakışın engellediği bir şey YOKTU.
 *
 * Ölçülemeyen desen parçası, koruduğunu sandığı şeyi korumaz — ve okuyan
 * kişiye orada bir koruma varmış gibi görünür.
 * _(Anayasa: "mutasyon kaçıyorsa önce test verisi sorgulanır" — burada cevap
 * veri değil, ölçülemez desendi. Bugün üçüncü kez.)_
 */
const YASAK = /^\s*export\s+(const|let|var|function|class|default)\b/gm;

let ihlal = 0;
for (const yol of eylemDosyalari) {
  const kaynak = yorumsuz(readFileSync(yol, "utf8"));
  const bulunanlar: string[] = [];
  for (const m of kaynak.matchAll(YASAK)) {
    const satir = kaynak.slice(m.index).split("\n")[0].trim();
    /** ⭐ `export const x = async (` İZİNLİ — aynı şeyin ok gösterimi. */
    if (/^export\s+const\s+\w+\s*(:[^=]+)?=\s*async\s*\(/.test(satir)) continue;
    bulunanlar.push(satir.slice(0, 72));
  }
  if (bulunanlar.length > 0) {
    ihlal++;
    kontrol(`${yol}`, false, bulunanlar);
  }
}
kontrol(
  "her sunucu eylemi dosyası YALNIZ async dışa aktarıyor",
  ihlal === 0,
  ihlal,
);

/**
 * ═══ ÖLÇÜTÜN KENDİSİ ÖLÇÜLÜR ═════════════════════════════════════════════
 *  ⚠ Desen, aradığı şeyi GERÇEKTEN buluyor mu? Sentetik bir vaka enjekte
 *  edilip ısırdığı GÖRÜLMEDEN tarama doğru sayılmaz — 30.08'de `awk`
 *  taraması `\b` yüzünden hiçbir şey bulamamış ve "62 bekçi temiz" diye
 *  raporlanacaktı. _(Anayasa: "mutasyon harness'inin kendisi de kusurlu
 *  olabilir".)_
 */
{
  const sentetik = '"use server";\n\nexport const SABIT = "x";\n';
  const bulundu = [...yorumsuz(sentetik).matchAll(YASAK)].length;
  kontrol("ölçüt sentetik ihlali YAKALIYOR", bulundu === 1, bulundu);

  const temiz = '"use server";\n\nexport async function f() {}\nexport type T = number;\n';
  const bulundu2 = [...yorumsuz(temiz).matchAll(YASAK)].length;
  kontrol("  ...ve temiz dosyada YANLIŞ YANMIYOR", bulundu2 === 0, bulundu2);

  const okGosterim = '"use server";\n\nexport const f = async (a: string) => a;\n';
  const satir = yorumsuz(okGosterim).split("\n").find((x) => x.startsWith("export const"));
  kontrol(
    "  ...ok gösterimli async İZİNLİ",
    /^export\s+const\s+\w+\s*(:[^=]+)?=\s*async\s*\(/.test(satir ?? ""),
  );

  /** ⚠ İŞARET ORTADA GEÇERSE DOSYA SUNUCU EYLEMİ SAYILMAZ. */
  kontrol(
    "ortada geçen `use server` dizesi dosyayı kapsama ALMIYOR",
    !sunucuEylemiMi('const desen = "use server";\nexport const X = 1;\n'),
  );
  kontrol("  ...başta geçen İŞARET kapsama ALIYOR", sunucuEylemiMi(sentetik));
}

console.log("");
console.log("=".repeat(70));
if (kalan === 0) console.log(`TÜM KONTROLLER GEÇTİ (${gecen})`);
else {
  console.log(`${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrolden)`);
  process.exitCode = 1;
}
console.log("");
