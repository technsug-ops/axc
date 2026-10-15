import { existsSync } from "node:fs";

import { kaynakOku } from "./kaynak-oku";
import { geceTuruSonucuCoz } from "../src/lib/gece-turu-sonuc";

/**
 * ============================================================================
 *  GECE TURU GITHUB'DA — BEKÇİ (kullanıcı kararı 15.10.2026)
 *      npm run gece-turu-sonuc:dogrula
 * ----------------------------------------------------------------------------
 *  ① KAPI (SAF, değerle): gelen rapor denetlenir — çelişkili «yeşil» REDDEDİLİR,
 *     yabancı bağlantı/alan kayda giremez.
 *  ② BAĞ: uç kapıyı çağırmadan yazmaz · betik GitHub kipinde AYNI uca gönderir ·
 *     iş tanımı boş DB + tohum + son yeşil + sır ile koşar · canlı bilgisi işe girmez.
 * ============================================================================
 */

let gecen = 0;
let kalan = 0;
const kosanBolumler: string[] = [];
const BOLUM_SAYISI = 2;
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
const yorumsuz = (m: string) => m.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, "").replace(/^\s*#.*$/gm, "");

console.log("=".repeat(70));
console.log("GECE TURU GITHUB BEKÇİSİ");
console.log("=".repeat(70));

/* ① KAPI */
{
  const sha = "a".repeat(40);
  const yesil = { durum: "YESIL", sha, yesil: 170, toplam: 170, kirmizilar: [], sureSn: 3600, calisma: "https://github.com/technsug-ops/axc/actions/runs/123" };
  const r = geceTuruSonucuCoz(yesil);
  kontrol("tutarlı yeşil rapor KABUL edilir, köken GITHUB yazılır", r.tamam && r.detay.kaynak === "GITHUB" && r.detay.durum === "YESIL", r);
  kontrol("  ...yabancı alan kayda GİRMEZ (detayda yalnız bilinen alanlar)", (() => {
    const x = geceTuruSonucuCoz({ ...yesil, eklenti: "<script>" });
    return x.tamam && !("eklenti" in x.detay);
  })());
  const kod = (g: unknown) => { const x = geceTuruSonucuCoz(g); return x.tamam ? "TAMAM" : x.kod; };
  kontrol("«yeşil» ama kırmızı listesi dolu → ÇELİŞKİ (reddedilir)", kod({ ...yesil, kirmizilar: [{ ad: "x:dogrula", tur: "BEKCI" }] }) === "CELISKI");
  kontrol("«yeşil» ama yeşil ≠ toplam → ÇELİŞKİ", kod({ ...yesil, yesil: 169 }) === "CELISKI");
  kontrol("«yeşil» ama toplam yok → ÇELİŞKİ (sayısız yeşil kanıt değil)", kod({ durum: "YESIL", kirmizilar: [] }) === "CELISKI");
  kontrol("«kırmızı» ama liste boş → ÇELİŞKİ", kod({ durum: "KIRMIZI", yesil: 3, toplam: 4, kirmizilar: [] }) === "CELISKI");
  kontrol("kırmızı + geriye tarama bilgisi kabul", kod({ durum: "KIRMIZI", yesil: 3, toplam: 4, kirmizilar: [{ ad: "a-mutasyon:kontrol", tur: "MUTASYON", ilkKotu: { sha, tarih: "2026-10-15T10:00:00+02:00", mesaj: "fix: x" } }] }) === "TAMAM");
  kontrol("bilinmeyen durum → reddedilir", kod({ durum: "BELKI" }) === "DURUM");
  kontrol("bozuk sürüm kimliği → reddedilir", kod({ ...yesil, sha: "abc" }) === "SHA");
  kontrol("eksi sayı → reddedilir", kod({ ...yesil, sureSn: -1 }) === "SAYI");
  kontrol("başka sitenin bağlantısı → reddedilir (ekrana keyfî bağlantı basılmaz)", kod({ ...yesil, calisma: "https://kotu.example/actions/runs/1" }) === "CALISMA");
  kontrol("  ...bu deponun çalışma sayfasının ARKASINA eklenmiş yol da reddedilir", kod({ ...yesil, calisma: "https://github.com/technsug-ops/axc/actions/runs/1/../../../x" }) === "CALISMA");
  /* İki kapı aynı şeyi koruyor (önek · sondaki numara): bu örnek YALNIZ önek kapısına takılır —
     önekle AYNI uzunlukta yabancı adres + numara (mutasyon kapı başına izole, anayasa). */
  const yabanci = "https://kotu.example/" + "a".repeat("https://github.com/technsug-ops/axc/actions/runs/".length - "https://kotu.example/".length) + "123";
  kontrol("  ...önekle aynı uzunlukta, sonu numara olan YABANCI adres reddedilir (önek kapısı)", kod({ ...yesil, calisma: yabanci }) === "CALISMA");
  kontrol("aşırı uzun sebep → reddedilir", kod({ durum: "HATA", sebep: "x".repeat(2001) }) === "METIN");
  kontrol("bozuk kırmızı türü → reddedilir", kod({ durum: "KIRMIZI", kirmizilar: [{ ad: "x", tur: "BAZEN" }] }) === "KIRMIZILAR");
  kontrol("nesne olmayan gövde → reddedilir", kod([1, 2]) === "JSON_DEGIL" && kod(null) === "JSON_DEGIL");
  kontrol("hazırlık düştü raporu (sebepli) kabul — kaçan gece de kayda girer", kod({ durum: "HAZIRLIK_DUSTU", sebep: "HAZIRLIK_DUSTU: npm ci", sha: null }) === "TAMAM");
  kosanBolumler.push("kapi");
}

/* ② BAĞ */
{
  const UC = "src/app/api/cron/gece-turu-sonuc/route.ts";
  kontrol("uç dosyası var", existsSync(UC));
  const uc = yorumsuz(kaynakOku(UC));
  const kapiYeri = uc.indexOf("const sonuc = geceTuruSonucuCoz(govde);");
  const yazimYeri = uc.indexOf("await prisma.auditLog.create(");
  kontrol("uç kayda yazmadan ÖNCE gövdeyi kapıdan geçirir ve reddi döndürür",
    kapiYeri >= 0 && yazimYeri > kapiYeri && /if \(!sonuc\.tamam\) return NextResponse\.json\(\{ hata: sonuc\.kod \}, \{ status: 400 \}\);/.test(uc));
  kontrol("  ...kayda KAPININ çıktısı yazılır (ham gövde değil)", /detail: JSON\.stringify\(sonuc\.detay\)/.test(uc) && !/detail: metin/.test(uc));
  kontrol("  ...gövde tavanı ayrıştırmadan ÖNCE", uc.indexOf("GECE_SONUC_GOVDE_TAVANI") >= 0 && uc.indexOf("GECE_SONUC_GOVDE_TAVANI") < uc.indexOf("JSON.parse(metin)"));

  const betik = yorumsuz(kaynakOku("scripts/gece-turu.ts"));
  kontrol("betik GitHub kipinde AYNI uca gönderir (uç yolu = uç klasörü)",
    /await fetch\(`\$\{adres\}\/api\/cron\/gece-turu-sonuc`, \{/.test(betik) && /headers: \{ authorization: `Bearer \$\{sir\}`/.test(betik));
  kontrol("  ...gönderilemezse sessiz geçmez (hata fırlatır)", /throw new Error\(`sonuç canlıya gönderilemedi: \$\{son\}`\);/.test(betik));
  kontrol("  ...GitHub'da örnek veri kurulur (veri isteyen bekçi ATLAMASIN)", /if \(GITHUB\) hazirlik\("tohum \(örnek veri\)", kos\("npx tsx scripts\/gece-turu-tohum\.ts", GECE\)\);/.test(betik) && existsSync("scripts/gece-turu-tohum.ts"));
  kontrol("  ...GitHub'da canlı bağlantı dosyası kopyalanmaz", /if \(!GITHUB\) for \(const f of \[".env", ".env.canli"\]\)/.test(betik));

  const is = kaynakOku(".github/workflows/gece-turu.yml");
  const isK = yorumsuz(is);
  kontrol("iş tanımı her gece 00:30 İstanbul (21:30 UTC) + elle tetik", /- cron: "30 21 \* \* \*"/.test(isK) && /workflow_dispatch:/.test(isK));
  kontrol("  ...boş MySQL 8.4 servisi ve ona bağlı DATABASE_URL (canlı değil)", /image: mysql:8\.4/.test(isK) && /DATABASE_URL: mysql:\/\/root:gece@127\.0\.0\.1:3306\/axcali_gece/.test(isK));
  kontrol("  ...sır depo Secrets'tan, son yeşil GitHub kaydından", /CRON_SECRET: \$\{\{ secrets\.CRON_SECRET \}\}/.test(isK) && /actions\/workflows\/gece-turu\.yml\/runs\?status=success&per_page=1/.test(isK));
  kontrol("  ...turu çalıştırır ve günlüğü her durumda saklar", /run: npx tsx scripts\/gece-turu\.ts/.test(isK) && /if: always\(\)[\s\S]{0,80}upload-artifact/.test(isK));
  kontrol("  ...canlı veritabanı bilgisi işe GİRMEZ", !/env\.canli|CANLI_DATABASE_URL|kasserver/i.test(is));
  kosanBolumler.push("bag");
}

if (kosanBolumler.length !== BOLUM_SAYISI) {
  console.log(`\nKOŞUM YARIM KALDI (${kosanBolumler.length}/${BOLUM_SAYISI}) — sonuç GEÇERSİZ`);
  process.exitCode = 1;
} else if (kalan === 0) console.log(`\nTÜM KONTROLLER GEÇTİ (${gecen})`);
else {
  console.log(`\n${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrolden)`);
  process.exitCode = 1;
}
