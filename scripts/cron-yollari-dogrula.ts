import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { kaynakOku } from "./kaynak-oku";
import { ARKA_PLAN_HAVUZU, SAYFA_HAVUZU_BOYUTU, uygulamaHavuzu } from "../src/lib/veritabani-adresi";

/**
 * ============================================================================
 *  CRON_SECRET YOLLARI BEKÇİSİ (K-HB-CRON PROXY, 10.09.2026)
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run cron-yollari:dogrula
 *
 *  ⛔ NİYE VAR: `src/proxy.ts`'teki `ACIK_YOLLAR` listesi giriş korumasının
 *  bypass ettiği yolları elle tutuyor. `/api/cron/hb-cekim` eklenirken
 *  (08.09.2026) bu listeye yazılmayı UNUTTU — ve `/api/olcum` da hiç
 *  eklenmemişti. İkisi de dış çağıran biri için AYNI SESSİZ SONUCU üretti:
 *  kendi `CRON_SECRET` kapısına hiç ulaşmadan oturum duvarında 401
 *  `{"durum":"YETKISIZ"}` ile düştüler.
 *
 *  ⭐ VE BU, K166'NIN KENDİ DERSİNİN TEKRARIYDI. `ty-cekim` eklenirken
 *  (05.09.2026) BİREBİR AYNI hata yaşanmış ve elle düzeltilmişti — ama
 *  ders bir BEKÇİYE çevrilmemişti. Bu dosya o boşluğu kapatıyor.
 *
 *  ⚠ ÖLÇÜT KLASÖR ADINA (`/api/cron/*`) DEĞİL, DAVRANIŞA BAĞLI: her
 *  `route.ts` dosyası `process.env.CRON_SECRET` KULLANIYOR MU diye
 *  taranır. `/api/olcum` "cron" klasöründe değil ama aynı deseni
 *  kullanıyor — klasör-adı ölçütü onu KAÇIRIRDI, davranış ölçütü
 *  kaçırmadı. _(Anayasa: "bekçi ölçütü elle tutulan liste değil,
 *  tersten kurulur".)_
 * ============================================================================
 */

let basarisiz = 0;
let calisan = 0;

function kontrol(ad: string, kosul: boolean, ayrinti?: unknown) {
  calisan++;
  if (kosul) console.log(`  OK    ${ad}`);
  else {
    basarisiz++;
    console.log(`  HATA  ${ad}`);
    if (ayrinti !== undefined) console.log("        ", ayrinti);
  }
}

/** `src/app` altındaki her `route.ts` dosyasını bulur (klasör derinliği önemsiz). */
function tumRouteDosyalari(kok: string): string[] {
  const sonuc: string[] = [];
  for (const isim of readdirSync(kok)) {
    const tamYol = join(kok, isim);
    const st = statSync(tamYol);
    if (st.isDirectory()) sonuc.push(...tumRouteDosyalari(tamYol));
    else if (isim === "route.ts") sonuc.push(tamYol.replace(/\\/g, "/"));
  }
  return sonuc;
}

/** `src/app/api/cron/hb-cekim/route.ts` → `/api/cron/hb-cekim` */
function urlYolu(dosyaYolu: string): string {
  return dosyaYolu.replace(/^src\/app/, "").replace(/\/route\.ts$/, "");
}

console.log("\nCRON_SECRET YOLLARI BEKÇİSİ\n");

console.log("1) TABAN DOLULUĞU");
const routeDosyalari = tumRouteDosyalari("src/app");
kontrol("route.ts dosyası bulundu (taban DOLU)", routeDosyalari.length >= 10, routeDosyalari.length);

/**
 * ⚠ DESEN YORUM İÇİNDE DE GEÇEBİLİR — ama burada zararsız: bir dosya
 * `CRON_SECRET`den YORUMDA bahsedip gerçek kodda kullanmasa bile, onu
 * ACIK_YOLLAR'a EKLEMEK bir güvenlik açığı DOĞURMAZ (fazladan açık bir
 * yol, dar bir yoldan daha güvenli yönde bir hata). Asıl tehlikeli yön
 * (kullanan ama LİSTEDE OLMAYAN) burada sınanıyor.
 */
const cronSecretKullananlar = routeDosyalari.filter((yol) =>
  /process\.env\.CRON_SECRET|process\.env\[["']CRON_SECRET["']\]/.test(
    kaynakOku(yol),
  ),
);
kontrol(
  "CRON_SECRET kullanan rota bulundu (taban DOLU)",
  cronSecretKullananlar.length >= 3,
  cronSecretKullananlar.map(urlYolu),
);

console.log("\n2) HER BİRİ ACIK_YOLLAR'DA MI");
const proxyMetni = kaynakOku("src/proxy.ts");
/** ⚠ DESEN KULLANIM BLOĞUNA DARALTILDI — dizinin TANIMI, dosyanın tamamı değil. */
const dizinBasi = proxyMetni.indexOf("const ACIK_YOLLAR");
const dizinSonu = proxyMetni.indexOf("\n];", dizinBasi);
kontrol("ACIK_YOLLAR tanımı bulundu", dizinBasi >= 0 && dizinSonu > dizinBasi);
const acikYollarBlok =
  dizinBasi >= 0 && dizinSonu > dizinBasi ? proxyMetni.slice(dizinBasi, dizinSonu) : "";

for (const dosya of cronSecretKullananlar) {
  const yol = urlYolu(dosya);
  kontrol(`${yol} → ACIK_YOLLAR'da`, acikYollarBlok.includes(`"${yol}"`));
}

/**
 * K264 (24.09.2026): «atlandı» dönen çekim 200 DEĞİL 503. cron-job.org'un
 * yeşili «çekim koştu» demek olsun; N11 11 saat atlandı ve zamanlayıcı yeşildi.
 * Küme DESENDEN: çekirdek çağıran (`CekimKos(`) her rota — liste tutulmaz.
 */
console.log("\n3) «ATLANDI» 503 DÖNER (K264)");
const cekimRotalari = routeDosyalari.filter((yol) => /CekimKos\(/.test(kaynakOku(yol)));
kontrol("çekim çekirdeği çağıran rota bulundu (taban DOLU, >= 3)", cekimRotalari.length >= 3, cekimRotalari.map(urlYolu));
/**
 * ⚠ ÖLÇÜT SON CEVABA BAĞLI, tek kalıba değil: tek çekirdekli rota `ozet`,
 * iki işli rota `dusen > 0` ile karar verir; listeleme rotası 500 kullanıyor
 * (K-liste kararı, çevrilmedi). Ortak olan şey: SON `NextResponse.json`
 * çağrısı `status:` taşır ve atlandı dalı 200 DEĞİLDİR.
 */
/**
 * ⚠ ÖLÇÜT GÜNCELLENDİ (K303 Aşama 3b, 03.10.2026) — eski ölçüt yukarıda
 * anlatılıyor; NİYE ESKİDİĞİ: rotalar artık firma firma dönüyor ve 503 kararı
 * ORTAK gövdede (`donguDurumKodu`, `firma-suzgeci:dogrula` ⑥'da DEĞERLE
 * sınanıyor). Rotaya düşen tek iş «atlandı»yı tanıyan yüklemi vermek: yüklem
 * `atlandi` ya da `dusen`e bakmalı — `() => false` atlanan çekimi 200 ile örter.
 */
for (const dosya of cekimRotalari) {
  const metin = kaynakOku(dosya);
  const sonCevap = metin.slice(metin.lastIndexOf("NextResponse.json("));
  kontrol(
    `${urlYolu(dosya)} → atlandı ise 503, koştuysa 200 (son cevap donguDurumKodu + atlandı yüklemi)`,
    /* K337 3. adım: kanal uçlarında yüklem HESAP düzeyinde sarılı — `hesapSonuclariKirmiziMi(h, (o) => …atlandı…)`.
       Örtme (`() => false` ya da yüklemsiz sarma) yine kırmızı. */
    /status: donguDurumKodu\(sonuc, (?:\(o\) => [^)]*?|\(h\) => hesapSonuclariKirmiziMi\(h, \(o\) => [^)]*?)(?:"atlandi" in o|o\.dusen > 0)/.test(sonCevap),
  );
}

/* 4) SICAK TUTMA UCU SAYFALARLA AYNI PARÇADA (K332, 12.10.2026).
   Vercel farklı ayarlı yolları AYRI sunucu parçasında toplar; çekim uçları
   `maxDuration = 60` taşıdığı için dakikalık çağrıları paneli uyandırmıyor.
   Sıcak tutma ucu bu yüzden HİÇBİR çalışma ayarı taşımaz — taşırsa ayrı
   parçaya düşer ve sessizce işe yaramaz. Ve işi SALT OKUMA, tek SELECT 1. */
console.log("\n4) SICAK TUTMA UCU (K332)");
{
  const yol = routeDosyalari.find((d) => urlYolu(d) === "/api/cron/sicak");
  kontrol("sıcak tutma ucu var", yol !== undefined);
  /* Satır yorumu da ayıklanır (13.10.2026): `// SISTEM:` gerekçesi (firma süzgeci şartı)
     ölçütü kırmızı yakıyordu — yorum davranış değildir. */
  const kod = yol ? kaynakOku(yol).replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ") : "";
  kontrol("  ...sayfalarla aynı parçada: çalışma ayarı YOK (maxDuration · runtime · preferredRegion)",
    kod.length > 0 && !/export const (maxDuration|runtime|preferredRegion|regions)\b/.test(kod));
  /* 12.10.2026: tek yoklama → AYNI ANDA üç (havuzun üç bağlantısı da canlı kalsın). */
  /* ⚠ ÖLÇÜT TAŞINDI (13.10.2026): sayı elle «üç» yazılıydı; havuz 3 → 5 olunca iki yerde iki
     sayı doğardı. Artık yoklama sayısı havuzun TEK kaynağından (`SAYFA_HAVUZU_BOYUTU`). */
  kontrol("  ...yalnız SELECT 1 (havuzun BÜTÜN bağlantılarına aynı anda, sayı tek kaynaktan), yazma yok",
    /Array\.from\(\{ length: SAYFA_HAVUZU_BOYUTU \}, async \(\) => \{[\s\S]{0,120}?await prisma\.\$queryRawUnsafe\("SELECT 1"\);/.test(kod) && !/prisma\.\w+\.(create|update|upsert|delete)/.test(kod) && !/\$executeRaw/.test(kod));
}

/* ═══ 5) ARKA PLAN HAVUZU (K332, 13.10.2026) ═══
   Canlıda bağlantı tepe değeri 25 = `max_user_connections`; kaynak, aynı
   saniyede başlayan çekim kopyalarıydı (her biri 3 park). Çekimler işareti
   içe alır ve küçük havuz kurdurur. ⛔ İşaret YALNIZ `maxDuration` taşıyan
   uçlarda olabilir: taşımayan uç sayfalarla aynı kopyada koşar ve işaret
   orada sayfaların havuzunu da küçültürdü. Küme elle tutulmaz, dosyalardan
   türetilir (iki yön: çekimde EKSİK işaret · sayfa kopyasında FAZLA işaret). */
console.log("\n5) ARKA PLAN HAVUZU (K332)");
{
  const yorumsuz = (yol: string) => kaynakOku(yol).replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
  const ISARET = /^\s*import "@\/lib\/arka-plan-havuzu";/m;
  const maxDurationlu = (yol: string) => /export const maxDuration\s*=/.test(yorumsuz(yol));
  const cekimUclari = routeDosyalari.filter((d) => urlYolu(d).startsWith("/api/cron/") && maxDurationlu(d));
  kontrol("maxDuration taşıyan çekim ucu bulundu (taban DOLU)", cekimUclari.length >= 7, cekimUclari.map(urlYolu));
  const eksik = cekimUclari.filter((d) => !ISARET.test(yorumsuz(d))).map(urlYolu);
  kontrol("  ...her çekim ucu arka plan işaretini içe alıyor", eksik.length === 0, eksik);
  const tumKaynaklar = (kok: string): string[] =>
    readdirSync(kok).flatMap((isim) => {
      const tam = join(kok, isim);
      if (statSync(tam).isDirectory()) return tumKaynaklar(tam);
      return /\.(ts|tsx)$/.test(isim) ? [tam.replace(/\\/g, "/")] : [];
    });
  const isaretliler = tumKaynaklar("src").filter((d) => /["']@\/lib\/arka-plan-havuzu["']/.test(yorumsuz(d)));
  const yanlisYer = isaretliler.filter((d) => !(d.endsWith("/route.ts") && maxDurationlu(d)));
  kontrol("  ...işaret YALNIZ maxDuration taşıyan uçlarda (sayfa kopyasına sızmaz)", isaretliler.length >= 7 && yanlisYer.length === 0, yanlisYer);
  const prismaK = yorumsuz("src/lib/prisma.ts");
  kontrol("  ...istemci havuzu işarete göre seçiyor; prisma.ts işareti KURMUYOR",
    /havuzluAdres\(url, uygulamaHavuzu\(\)\)/.test(prismaK) && !/arka-plan-havuzu/.test(prismaK));
  const once = uygulamaHavuzu();
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- ölçüm sırası: işaret TAM burada kurulmalı
  require("../src/lib/arka-plan-havuzu");
  const sonra = uygulamaHavuzu();
  /* ⚠ 13.10.2026: arka plan sınırı 2 → 3 (çekirdekler 10'la yazılmıştı; 2 iç içe işlemde
     kuyruk kilidi riski). İki havuzu artık AYIRAN değer `minimumIdle` (3 ↔ 1). */
  /* ⚠ 13.10.2026 «5 yap»: sayfa havuzu 3 → 5 (gerekçe ve bütçe `veritabani-adresi.ts`te). */
  kontrol("  ...değer: işaret yokken sayfa havuzu (5 · boşta 5), varken arka plan havuzu (3 · boşta 1)",
    once.connectionLimit === "5" && once.minimumIdle === "5" && SAYFA_HAVUZU_BOYUTU === 5 && sonra === ARKA_PLAN_HAVUZU && sonra.connectionLimit === "3" && sonra.minimumIdle === "1", { once, sonra });
  /* ⛔ ÇEKİRDEKLER UYGULAMANIN İSTEMCİSİNİ KULLANMIYOR (bulgu 13.10.2026): çekim uçları
     `scripts/` altındaki çekirdekleri çağırıyor ve onlar kendi istemcisini HAM adresle
     kuruyordu — sürücü varsayılanı 10 bağlantı; canlıdaki «10»lar buydu, işaret oraya
     ULAŞMIYORDU. Küme uçların içe alma satırlarından türetilir (elle liste yok). */
  const cekirdekler = [...new Set(cekimUclari.flatMap((d) =>
    [...yorumsuz(d).matchAll(/from "(?:\.\.\/)+(scripts\/[\w-]+)"/g)].map((m) => `${m[1]}.ts`)))];
  kontrol("  ...uçların çağırdığı betik çekirdeği bulundu (taban DOLU)", cekirdekler.length >= 8, cekirdekler);
  const ciplak = cekirdekler.flatMap((d) =>
    [...yorumsuz(d).matchAll(/new PrismaMariaDb\(([^)]*\)?)\)/g)]
      .filter((m) => !/^havuzluAdres\(\w+, ARKA_PLAN_HAVUZU\)$/.test(m[1]))
      .map((m) => `${d}: new PrismaMariaDb(${m[1]})`));
  /* K303 dalı: çekirdekler istemciyi `firmaIstemcisi(` ile kurar (firma süzgeci). O
     yol da sayılır — ama YALNIZ ortak gövde istemciyi arka plan havuzuyla kuruyorsa;
     gövdedeki her `new PrismaMariaDb(` aynı ölçütten geçer (çıplak adres yok). */
  const firmaGovdesi = "src/lib/firma-istemcisi.ts";
  const govdeKurulumlari = [...yorumsuz(firmaGovdesi).matchAll(/new PrismaMariaDb\(([^)]*\)?)\)/g)].map((m) => m[1]);
  const govdeHavuzlu = govdeKurulumlari.length >= 1 && govdeKurulumlari.every((a) => /^havuzluAdres\(\w+, ARKA_PLAN_HAVUZU\)$/.test(a));
  const kurulumlu = cekirdekler.filter((d) =>
    /new PrismaMariaDb\(/.test(yorumsuz(d)) || (govdeHavuzlu && /\bfirmaIstemcisi\(/.test(yorumsuz(d))));
  kontrol("  ...çekirdekte istemci YALNIZ arka plan havuzuyla kurulur (çıplak adres yok)",
    kurulumlu.length >= 6 && ciplak.length === 0 && govdeHavuzlu, { kurulumlu: kurulumlu.length, ciplak, govdeKurulumlari });
  kontrol("  ...⛔ minimumIdle=0 yasağı arka plan havuzunda da", Number(ARKA_PLAN_HAVUZU.minimumIdle) >= 1);
}

console.log("\n" + "=".repeat(70));
if (basarisiz === 0) console.log(`TÜM KONTROLLER GEÇTİ (${calisan})`);
else {
  console.log(`${basarisiz} KONTROL BAŞARISIZ (${calisan} kontrolden)`);
  process.exitCode = 1;
}
console.log("");
