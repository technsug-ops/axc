import { kaynakOku } from "./kaynak-oku";
import { anaDalUcunuCoz, YAYIN_PAYI_DAKIKA, yayinBosluguSayisi, yayinDurumu } from "../src/lib/yayin-boslugu";

/**
 * ============================================================================
 *  YAYIN BOŞLUĞU BEKÇİSİ (K329, 10.10.2026) — `npm run yayin-boslugu:dogrula`
 * ----------------------------------------------------------------------------
 *  ① KURAL — durum DEĞERLE: güncel · yayımlanıyor (pay içinde) · geride ·
 *     ölçülemedi (iki neden); eşiğin iki yakası; 09.10 vakası birebir.
 *  ② GITHUB ÇÖZÜMÜ — son PUSH seçilir (başka etkinlik atlanır); bozuk
 *     biçim/tarih/sha uydurulmaz → null.
 *  ③ BAĞ — çan ve ekran AYNI gövdeyi çağırır; ölçüm depo adını VERCEL'den
 *     alır (koda gömülü depo yok); zaman aşımı ve önbellek yerinde.
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
console.log("YAYIN BOŞLUĞU (K329, 10.10.2026)");
console.log("=".repeat(70));

/* ① KURAL */
{
  const A = "a".repeat(40);
  const B = "b".repeat(40);
  const itildi = new Date("2026-10-10T09:00:00Z");
  const sonra = (dk: number) => new Date(itildi.getTime() + dk * 60_000);

  kontrol("aynı sürüm → GÜNCEL", yayinDurumu(A, { sha: A, itildiAt: itildi }, sonra(500)).durum === "GUNCEL");
  kontrol("farklı, pay İÇİNDE (tam sınır) → YAYIMLANIYOR",
    yayinDurumu(A, { sha: B, itildiAt: itildi }, sonra(YAYIN_PAYI_DAKIKA)).durum === "YAYIMLANIYOR");
  const geride = yayinDurumu(A, { sha: B, itildiAt: itildi }, sonra(YAYIN_PAYI_DAKIKA + 1));
  kontrol("farklı, pay DIŞINDA → GERİDE", geride.durum === "GERIDE", geride);
  kontrol("  ...dakika ekrana doğru gider", geride.durum === "GERIDE" && geride.dakika === YAYIN_PAYI_DAKIKA + 1);
  kontrol("sürüm bilgisi yok → ÖLÇÜLEMEDİ (yerel/deneme)",
    (() => { const d = yayinDurumu(null, { sha: B, itildiAt: itildi }, sonra(500)); return d.durum === "OLCULEMEDI" && d.neden === "SURUM_BILGISI_YOK"; })());
  kontrol("GitHub okunamadı → ÖLÇÜLEMEDİ (güncel SAYILMAZ)",
    (() => { const d = yayinDurumu(A, null, sonra(500)); return d.durum === "OLCULEMEDI" && d.neden === "GITHUB_OKUNAMADI"; })());
  kontrol("çan YALNIZ geride 1", yayinBosluguSayisi(geride) === 1 &&
    yayinBosluguSayisi(yayinDurumu(A, { sha: A, itildiAt: itildi }, sonra(500))) === 0 &&
    yayinBosluguSayisi(yayinDurumu(A, { sha: B, itildiAt: itildi }, sonra(1))) === 0 &&
    yayinBosluguSayisi(yayinDurumu(A, null, sonra(500))) === 0 &&
    yayinBosluguSayisi(yayinDurumu(null, null, sonra(500))) === 0);
  /* 09.10 vakası: canlı f520dbb, ana 1de1cceb (push 07:30Z), 28 saat sonra. */
  const vaka = yayinDurumu("f520dbb2" + "0".repeat(32), { sha: "1de1cceb" + "0".repeat(32), itildiAt: new Date("2026-10-09T07:30:00Z") }, new Date("2026-10-10T11:30:00Z"));
  kontrol("09.10 vakası (28 saat) → GERİDE, çan 1", vaka.durum === "GERIDE" && yayinBosluguSayisi(vaka) === 1, vaka);
  kontrol("eşik tabanı makul (1–60 dk)", YAYIN_PAYI_DAKIKA >= 1 && YAYIN_PAYI_DAKIKA <= 60);
  kosanBolumler.push("kural");
}

/* ② GITHUB ÇÖZÜMÜ */
{
  const S1 = "1".repeat(40);
  const S2 = "2".repeat(40);
  const ilk = anaDalUcunuCoz([
    { activity_type: "branch_creation", after: S1, timestamp: "2026-10-10T09:10:00Z" },
    { activity_type: "push", after: S2, timestamp: "2026-10-10T09:06:06Z" },
  ]);
  kontrol("ucu değiştirmeyen etkinlik atlanır, ilk push seçilir", ilk?.sha === S2 && ilk.itildiAt.toISOString() === "2026-10-10T09:06:06.000Z", ilk);
  for (const tur of ["force_push", "pr_merge", "merge_queue_merge"]) {
    const u = anaDalUcunuCoz([{ activity_type: tur, after: S1, timestamp: "2026-10-10T09:10:00Z" }, { activity_type: "push", after: S2, timestamp: "2026-10-10T09:06:06Z" }]);
    kontrol(`${tur} da dalın ucudur (eski push «son» sayılmaz)`, u?.sha === S1, u);
  }
  kontrol("dizi değilse null", anaDalUcunuCoz({ message: "API rate limit exceeded" }) === null);
  kontrol("push yoksa null", anaDalUcunuCoz([{ activity_type: "branch_creation", after: S1, timestamp: "2026-10-10T09:00:00Z" }]) === null);
  kontrol("bozuk tarih uydurulmaz → null", anaDalUcunuCoz([{ activity_type: "push", after: S1, timestamp: "dun" }]) === null);
  kontrol("bozuk sha uydurulmaz → null", anaDalUcunuCoz([{ activity_type: "push", after: "abc", timestamp: "2026-10-10T09:00:00Z" }]) === null);
  kosanBolumler.push("github");
}

/* ③ BAĞ */
{
  const govde = oku("src/lib/yayin-boslugu.ts");
  const olcBasi = govde.indexOf("export async function yayinDurumunuOlc(");
  const olcSonu = govde.indexOf("export async function yayinBosluguSayisiOlc(");
  const olc = olcBasi >= 0 && olcSonu > olcBasi ? govde.slice(olcBasi, olcSonu) : "";
  kontrol("ölçüm gövdesi bulundu", olc.length > 300);
  kontrol("canlı sürüm Vercel'den", /process\.env\.VERCEL_GIT_COMMIT_SHA/.test(olc));
  kontrol("depo sahibi/adı/dal Vercel'den (gömülü değil)",
    /process\.env\.VERCEL_GIT_REPO_OWNER/.test(olc) && /process\.env\.VERCEL_GIT_REPO_SLUG/.test(olc) && /process\.env\.VERCEL_GIT_COMMIT_REF/.test(olc));
  kontrol("hiçbir depo/firma adı gömülü değil", !/technsug|axc[a-z]*\b/i.test(kaynakOku("src/lib/yayin-boslugu.ts").replace(/\/\*[\s\S]*?\*\//g, "")));
  kontrol("zaman aşımı var (panel beklemez)", /signal: AbortSignal\.timeout\(\d+\)/.test(olc));
  kontrol("önbellek var (saatlik GitHub sınırı)", /next: \{ revalidate: \d+ \}/.test(olc));
  kontrol("cevap çözücüden geçer", /ana = anaDalUcunuCoz\(await yanit\.json\(\)\);/.test(olc));
  kontrol("sonuç saf gövdeden", /return yayinDurumu\(canliSha, ana, simdi\);/.test(olc));
  kontrol("çan sayısı saf gövdeden", /return yayinBosluguSayisi\(await yayinDurumunuOlc\(\)\);/.test(govde));

  const topla = oku("src/lib/uyari/topla.ts");
  kontrol("çan aynı gövdeyi çağırır", /yayinBoslugu: \{ sayi: await yayinBosluguSayisiOlc\(\) \},/.test(topla));
  const turler = oku("src/lib/uyari/turler.ts");
  kontrol("uyarı ekrana götürür", /yayinBoslugu: "\/ayarlar\/gece-turu",/.test(turler));
  kontrol("uyarı kırmızı", /yayinBoslugu: "kirmizi",/.test(turler));
  const sayfa = oku("src/app/ayarlar/gece-turu/page.tsx");
  kontrol("ekran aynı gövdeyi çağırır", /const yayin = await yayinDurumunuOlc\(simdi\);/.test(sayfa));
  kontrol("ekran ölçülemediği NEDENİYLE yazar", /t\(`yayinOLCULEMEDI_\$\{yayin\.neden\}`\)/.test(sayfa));
  kontrol("ekran geride dakikayı yazar", /t\("yayinGERIDE", \{ dakika: yayin\.dakika \}\)/.test(sayfa));
  kosanBolumler.push("bag");
}

console.log("=".repeat(70));
if (kosanBolumler.length !== BOLUM_SAYISI) {
  console.log(`KOŞUM YARIM KALDI (${kosanBolumler.length}/${BOLUM_SAYISI}) — sonuç GEÇERSİZ`);
  process.exit(1);
}
if (kalan === 0) console.log(`TÜM KONTROLLER GEÇTİ (${gecen})`);
else {
  console.log(`${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrol içinde)`);
  process.exitCode = 1;
}
