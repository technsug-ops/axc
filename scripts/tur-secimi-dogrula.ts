import { kaynakOku } from "./kaynak-oku";
import { gercekHedefler, harnessDosyaYolu, mutasyonAdiMi } from "./mutasyon-hedefleri";
import { denetimBagi, iceAktarilanlar, mutasyonSecimi, ORTAK_ALTYAPI, type DenetimBagi } from "./tur-secimi";
import { geceTuruSorunu, type GeceTuruKaydi } from "../src/lib/gece-turu-veri";

/**
 * ============================================================================
 *  TUR SEÇİMİ + GECE TURU BEKÇİSİ (K290) — `npm run tur-secimi:dogrula`
 * ----------------------------------------------------------------------------
 *  TEMEL SÖZ: değişen bir dosyaya dokunan mutasyon denetimi ASLA atlanmaz.
 *  ① KURAL — seçim her dalıyla DEĞERLE; GERÇEK VERİYLE: 46 denetimin her biri
 *     için bozduğu HER dosya tek başına değişince o denetim SEÇİLİYOR mu.
 *  ② GECE — sorun sayısı (kırmızı · koşmadı · gecikti) değerle.
 *  ③ ZİNCİR — tur betiği, push kapısı, gece turu, çan ve ekran bağlı mı.
 * ============================================================================
 */

let gecen = 0;
let kalan = 0;
const kosanBolumler: string[] = [];
const BOLUM_SAYISI = 3;
function kontrol(ad: string, sonuc: boolean, gorulen?: unknown) {
  if (sonuc) {
    gecen++;
    console.log(`  OK    ${ad}`);
  } else {
    kalan++;
    console.log(`  HATA  ${ad}`);
    if (gorulen !== undefined) console.log("        ", gorulen);
  }
}
const yorumsuz = (m: string) => m.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1");
const oku = (y: string) => yorumsuz(kaynakOku(y));

console.log("=".repeat(70));
console.log("TUR SEÇİMİ + GECE TURU (K290)");
console.log("=".repeat(70));

// ── 1) SEÇİM KURALI ──────────────────────────────────────────────────────
console.log("\n1) seçim — değerle ve gerçek denetimlerle");
{
  const d: DenetimBagi[] = [
    { ad: "a-mutasyon:kontrol", dosyalar: ["src/lib/a.ts", "scripts/a-dogrula.ts"] },
    { ad: "b-mutasyon:kontrol", dosyalar: ["src/lib/b.ts"] },
    { ad: "c-mutasyon:kontrol", dosyalar: null },
  ];
  const s = mutasyonSecimi(d, ["src/lib/a.ts"]);
  kontrol("değişen dosyaya dokunan SEÇİLİR, dokunmayan atlanır", s.kos.includes("a-mutasyon:kontrol") && s.atla.includes("b-mutasyon:kontrol"));
  kontrol("  ...bağı çözülemeyen denetim HER ZAMAN koşar", s.kos.includes("c-mutasyon:kontrol"));
  kontrol("değişen liste bilinmiyorsa HEPSİ", mutasyonSecimi(d, null).kos.length === 3 && mutasyonSecimi(d, null).hepsiSebebi !== null);
  kontrol("ortak altyapı değişince HEPSİ", ORTAK_ALTYAPI.every((a) => mutasyonSecimi(d, [a]).kos.length === 3));
  kontrol("  ...ortak altyapı listesi dolu ve harness aracı içinde", ORTAK_ALTYAPI.includes("scripts/mutasyon-deseni.ts"));
  kontrol("Windows ters bölü yolu da eşleşir", mutasyonSecimi(d, ["src\\lib\\b.ts"]).kos.includes("b-mutasyon:kontrol"));
  kontrol("içe aktarma çözülür (../src/lib/x → src/lib/x.ts)", iceAktarilanlar("scripts/x-dogrula.ts", 'import { y } from "../src/lib/x";').includes("src/lib/x.ts"));

  /* GERÇEK VERİ: her denetim, bozduğu HER dosya tek başına değişince seçilmeli. */
  const adlar = Object.keys((JSON.parse(kaynakOku("package.json")) as { scripts: Record<string, string> }).scripts).filter(mutasyonAdiMi);
  const baglar = adlar.map(denetimBagi);
  const cozulen = baglar.filter((b) => b.dosyalar !== null).length;
  kontrol(`taban DOLU: ${adlar.length} denetim, ${cozulen} bağı çözüldü`, adlar.length >= 40 && cozulen >= adlar.length - 5, { adlar: adlar.length, cozulen });
  const kacan: string[] = [];
  for (const ad of adlar) {
    const dosyalar = [...gercekHedefler(harnessDosyaYolu(ad)), harnessDosyaYolu(ad)];
    for (const f of dosyalar) if (!mutasyonSecimi(baglar, [f]).kos.includes(ad)) kacan.push(`${ad} ← ${f}`);
  }
  kontrol("SÖZ: 46 denetimin hiçbiri, bozduğu dosya değişince ATLANMIYOR", kacan.length === 0, kacan.slice(0, 5));
  /* Bekçi dosyası ve bekçinin içe aktardığı kaynak da «dokunma»dır. */
  const bekciKacan: string[] = [];
  for (const ad of adlar) {
    const bekci = kaynakOku(harnessDosyaYolu(ad)).match(/^const\s+BEKCI\s*=\s*"([^"]+)"\s*;/m)?.[1];
    if (!bekci) continue;
    const kaynaklar = [bekci, ...iceAktarilanlar(bekci, kaynakOku(bekci)).filter((f) => f.endsWith(".ts") && !f.endsWith("/index.ts"))];
    for (const f of kaynaklar) if (!mutasyonSecimi(baglar, [f]).kos.includes(ad)) bekciKacan.push(`${ad} ← ${f}`);
  }
  kontrol("  ...bekçi dosyası ya da okuduğu kaynak değişince de ATLANMIYOR", bekciKacan.length === 0, bekciKacan.slice(0, 5));
}
kosanBolumler.push("secim");

// ── 2) GECE TURU SORUN SAYISI ────────────────────────────────────────────
console.log("\n2) gece turu sorunu — değerle");
{
  const simdi = new Date("2026-09-28T08:00:00Z");
  const k = (o: Partial<GeceTuruKaydi>): GeceTuruKaydi => ({ zaman: new Date("2026-09-27T23:30:00Z"), durum: "YESIL", sha: "x", yesil: 171, toplam: 171, kirmizilar: [], sebep: null, sureSn: 2700, ...o });
  kontrol("hiç iz yok → 0 (iz henüz doğmadı)", geceTuruSorunu(null, simdi).sayi === 0);
  kontrol("yeşil → 0", geceTuruSorunu(k({}), simdi).sayi === 0);
  kontrol("kırmızı → kırmızı denetim SAYISI", geceTuruSorunu(k({ durum: "KIRMIZI", kirmizilar: [{ ad: "a", tur: "MUTASYON" }, { ad: "b", tur: "BEKCI" }] }), simdi).sayi === 2);
  kontrol("  ...listesiz kırmızı yine en az 1", geceTuruSorunu(k({ durum: "KIRMIZI" }), simdi).sayi === 1);
  kontrol("hazırlık düştü / okunamadı → 1", geceTuruSorunu(k({ durum: "HAZIRLIK_DUSTU" }), simdi).sayi === 1 && geceTuruSorunu(k({ durum: "BILINMIYOR" }), simdi).sayi === 1);
  kontrol("36 saatten eski YEŞİL iz bile → 1 (tur KAÇTI)", geceTuruSorunu(k({ zaman: new Date("2026-09-26T19:00:00Z") }), simdi).gecikti === true);
}
kosanBolumler.push("gece");

// ── 3) ZİNCİR ────────────────────────────────────────────────────────────
console.log("\n3) zincir — tur betiği, push kapısı, gece turu, çan, ekran");
{
  const bekci = oku("scripts/bekci.ts");
  kontrol("tur: TAM_TUR=1 → tam tur", bekci.includes('if (process.env.TAM_TUR === "1") return null;'));
  kontrol("  ...sıfır ya da biçimsiz taban → tam tur", bekci.includes("if (!/^[0-9a-f]{7,40}$/.test(taban) || /^0+$/.test(taban)) return null;"));
  kontrol("  ...seçilen mutasyonlar koşar, bekçilerin HEPSİ koşar", bekci.includes("const mutasyonAdlari = tumMutasyon.filter((ad) => secim.kos.includes(ad));") && bekci.includes("for (const ad of digerAdlari) sonuclar.push(senkronKostur(ad));"));
  const kanca = kaynakOku(".githooks/pre-push");
  kontrol("push kapısı tabanı TEK dal için veriyor, yoksa tam tur", kanca.includes('if [ "$SATIR" -eq 1 ] && [ -n "$TABAN" ]; then') && kanca.includes("npm run bekci -- $BAYRAK"));
  const gece = oku("scripts/gece-turu.ts");
  kontrol("gece: TAM tur koşar", gece.includes('kos("npx tsx scripts/bekci.ts", GECE, { TAM_TUR: "1" })'));
  kontrol("  ...son yeşil yalnız GEÇERLİ ve kırmızısız turda ilerler", gece.includes("if (gecerli && kirmizilar.length === 0) durum.sonYesilSha = sha;"));
  kontrol("  ...yeni denetim geriye taranmaz (yanlış push suçlanmaz)", gece.includes("git cat-file -e ${durum.sonYesilSha}:${dosya}"));
  kontrol("  ...hazırlık düşse de İZ yazılır", gece.includes('durum: "HAZIRLIK_DUSTU"'));
  const topla = oku("src/lib/uyari/topla.ts");
  kontrol("çan ekranla AYNI gövdeden", topla.includes("geceTuruSorunlu: { sayi: await geceTuruSorunSayisi() },"));
  const sayfa = oku("src/app/ayarlar/gece-turu/page.tsx");
  kontrol("ekran aynı gövde + gecikme kutusu", sayfa.includes("await geceTuruKayitlari(14)") && sayfa.includes("geceTuruSorunu(kayitlar[0] ?? null, simdi)"));
}
kosanBolumler.push("zincir");

console.log("\n" + "=".repeat(70));
if (kosanBolumler.length !== BOLUM_SAYISI) {
  console.log(`KOŞUM YARIM KALDI — sonuç GEÇERSİZ (${kosanBolumler.length}/${BOLUM_SAYISI})`);
  process.exit(1);
} else if (kalan === 0) {
  console.log(`TÜM KONTROLLER GEÇTİ (${gecen})`);
} else {
  console.log(`${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrolden)`);
  process.exit(1);
}
