import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { kaynakOku } from "./kaynak-oku";
import { ARKA_PLAN_HAVUZU, SAYFA_HAVUZU_BOYUTU, SICAK_TUTULAN_BAGLANTI, uygulamaHavuzu } from "../src/lib/veritabani-adresi";
import { BOSLUK_ESIGI_MS, erisimBoslugu, erisimBosluguCoz } from "../src/lib/veritabani-erisim";
import { havuzTakildiMi, ONARIM_ARALIGI_MS, onarimYapilsinMi } from "../src/lib/havuz-onarimi";

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
for (const dosya of cekimRotalari) {
  const metin = kaynakOku(dosya);
  const sonCevap = metin.slice(metin.lastIndexOf("NextResponse.json("));
  kontrol(
    `${urlYolu(dosya)} → atlandı ise 503/500, koştuysa 200 (son cevapta status var)`,
    /status: [^}]*\? 50[03] : 200/.test(sonCevap),
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
  const kod = yol ? kaynakOku(yol).replace(/\/\*[\s\S]*?\*\//g, " ") : "";
  kontrol("  ...sayfalarla aynı parçada: çalışma ayarı YOK (maxDuration · runtime · preferredRegion)",
    kod.length > 0 && !/export const (maxDuration|runtime|preferredRegion|regions)\b/.test(kod));
  /* 12.10.2026: tek yoklama → AYNI ANDA üç (havuzun üç bağlantısı da canlı kalsın). */
  /* ⚠ ÖLÇÜT TAŞINDI (13.10.2026): sayı elle «üç» yazılıydı; havuz 3 → 5 olunca iki yerde iki
     sayı doğardı. Artık yoklama sayısı havuzun TEK kaynağından (`SAYFA_HAVUZU_BOYUTU`). */
  /* ⛔ ÖLÇÜT ÇEVRİLDİ (K355, 22.10.2026): «havuzun BÜTÜN bağlantıları» sabit havuzu dakikada
     bir dolduruyor ve 25'lik kotayı tüketiyordu (Vercel kaydı: pool timeout active=0). Artık
     yalnız BOŞTA tutulan sayı yoklanır; sayı yine tek kaynaktan. */
  /* ⛔ ÖLÇÜT DARALTILDI (K358, 22.10.2026): «yazma YOK» → «YALNIZ son erişim anı + boşluk izi».
     Uç artık erişim boşluğunu kaydediyor (kesinti kanıtı uygulamanın kendi kaydına girsin).
     Başka bir modele yazma hâlâ YASAK — yeni bir yazım bu ölçütü kırmızı yakar. */
  const yazimlar = [...kod.matchAll(/prisma\.(\w+)\.(create|createMany|update|updateMany|upsert|delete|deleteMany)\(/g)].map((m) => `${m[1]}.${m[2]}`);
  kontrol("  ...yalnız SELECT 1 (boşta tutulan bağlantılara, sayı tek kaynaktan); ham yazım yok",
    /Array\.from\(\{ length: SICAK_TUTULAN_BAGLANTI \}, async \(\) => \{[\s\S]{0,120}?await prisma\.\$queryRawUnsafe\("SELECT 1"\);/.test(kod) && !/\$executeRaw/.test(kod));
  kontrol("  ...yazdığı TEK model son erişim deposu (bildirimImleci)", yazimlar.length >= 1 && yazimlar.every((y) => y.startsWith("bildirimImleci.")), yazimlar);
  kontrol("  ...son erişim KOŞULLU ilerler (iki kopya aynı boşluğu iki kez yazmaz)",
    /prisma\.bildirimImleci\.updateMany\(\{ where: \{ anahtar: SON_ERISIM_ANAHTARI, an: onceki\.an \}, data: \{ an: simdi \} \}\);\s*if \(ilerledi\.count === 1 && bosluk\) \{\s*await izYaz\(\{ action: ERISIM_BOSLUGU_EYLEMI/.test(kod));
  kontrol("  ...düşen yoklama sayılır, başarılı yoklamada sıfırlanır",
    /\} catch \(hata\) \{[\s\S]{0,200}basarisizYoklama \+= 1;/.test(kod) && /basarisizYoklama = 0;\s*return NextResponse\.json\(\{ durum: "SICAK"/.test(kod));

  /* Boşluk kararı DEĞERLE (saf gövde). */
  const t0 = new Date("2026-10-22T06:21:00Z");
  kontrol("  boşluk: önceki erişim yoksa kayıt YOK", erisimBoslugu(null, t0, 5) === null);
  kontrol("  boşluk: eşiğin altı (2 dk 59 sn) kayıt YOK", erisimBoslugu(t0, new Date(t0.getTime() + BOSLUK_ESIGI_MS - 1000), 2) === null);
  const yirmi = erisimBoslugu(t0, new Date("2026-10-22T06:42:30Z"), 21);
  kontrol("  boşluk: 22.10 vakası → 22 dk · 21 başarısız · uçlar doğru",
    yirmi?.dakika === 22 && yirmi.basarisizYoklama === 21 && yirmi.baslangic === "2026-10-22T06:21:00.000Z" && yirmi.bitis === "2026-10-22T06:42:30.000Z", yirmi);
  kontrol("  boşluk: tam eşik (3 dk) kayıt VAR", erisimBoslugu(t0, new Date(t0.getTime() + BOSLUK_ESIGI_MS), 0)?.dakika === 3);
  kontrol("  çözüm: bozuk iz null, sağlam iz geri gelir", erisimBosluguCoz("{x") === null && erisimBosluguCoz(JSON.stringify(yirmi))?.basarisizYoklama === 21);
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
  /* ⛔ K355 (22.10.2026): sayfa havuzu boşta 5 → 1 (kota tükenmesi; gerekçe `veritabani-adresi.ts`). */
  /* ⛔ K359 (22.10.2026): sayfa havuzu 5 → 3, boşta fazlası 60 → 15 sn (8 saatlik prob: kota 25'e dayandı). */
  kontrol("  ...değer: işaret yokken sayfa havuzu (3 · boşta 1 · 15 sn), varken arka plan havuzu (3 · boşta 1)",
    once.connectionLimit === "3" && once.minimumIdle === "1" && once.idleTimeout === "15" && SAYFA_HAVUZU_BOYUTU === 3 && SICAK_TUTULAN_BAGLANTI === 1 && sonra === ARKA_PLAN_HAVUZU && sonra.connectionLimit === "3" && sonra.minimumIdle === "1", { once, sonra });
  /* K359 — TAKILAN HAVUZ KENDİNİ YENİLER: karar DEĞERLE, bağ kaynakla. */
  const takili = new Error("pool timeout: failed to retrieve a connection from pool after 10000ms\n    (pool connections: active=0 idle=0 limit=5)");
  kontrol("  havuz onarımı: 22.10 mesajı «takıldı» sayılır", havuzTakildiMi(takili));
  kontrol("  ...dolu havuzda bekleme (active=3) takılma DEĞİL", !havuzTakildiMi(new Error("pool timeout: failed to retrieve a connection from pool after 10000ms (pool connections: active=3 idle=0 limit=3)")));
  kontrol("  ...başka veritabanı hatası takılma DEĞİL", !havuzTakildiMi(new Error("Unique constraint failed")) && !havuzTakildiMi("active=0 idle=0"));
  kontrol("  ...ilk yenileme serbest, 30 sn içinde ikincisi YOK (fırtına yok), sonra serbest",
    onarimYapilsinMi(null, 1000) && !onarimYapilsinMi(1000, 1000 + ONARIM_ARALIGI_MS - 1) && onarimYapilsinMi(1000, 1000 + ONARIM_ARALIGI_MS));
  const pz = yorumsuz("src/lib/prisma.ts");
  kontrol("  ...istemci her sorguyu sarıyor: takılırsa yeniler, hatayı YİNE fırlatır",
    /async \$allOperations\(\{ args, query \}\) \{\s*try \{\s*return await query\(args\);\s*\} catch \(hata\) \{\s*if \(havuzTakildiMi\(hata\)\) istemciyiYenile\(sarili as unknown as PrismaClient\);\s*throw hata;/.test(pz));
  kontrol("  ...yenileme aralık kapısından geçiyor ve eski istemciyi GECİKMELİ kapatıyor",
    /if \(istemci !== bozuk \|\| !onarimYapilsinMi\(sonOnarim, simdi\)\) return;\s*sonOnarim = simdi;\s*istemci = undefined;/.test(pz) &&
      /setTimeout\(\(\) => void bozuk\.\$disconnect\(\)\.catch\(\(\) => \{\}\), ESKI_ISTEMCI_KAPATMA_MS\);/.test(pz));
  /* KOTA BÜTÇESİ — boştaki her kopya `minimumIdle` kadar bağlantı tutar; 25'lik kotaya kaç
     boş kopya sığar? 20'nin altına düşerse (ör. biri yine 5 yaparsa) kırmızı. */
  const KOTA = 25;
  kontrol(`  ...boştaki kopya bütçesi: ${KOTA} ÷ ${once.minimumIdle} ≥ 20 kopya`, KOTA / Number(once.minimumIdle) >= 20);
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
  const kurulumlu = cekirdekler.filter((d) => /new PrismaMariaDb\(/.test(yorumsuz(d)));
  kontrol("  ...çekirdekte istemci YALNIZ arka plan havuzuyla kurulur (çıplak adres yok)",
    kurulumlu.length >= 6 && ciplak.length === 0, { kurulumlu: kurulumlu.length, ciplak });
  kontrol("  ...⛔ minimumIdle=0 yasağı arka plan havuzunda da", Number(ARKA_PLAN_HAVUZU.minimumIdle) >= 1);
}

console.log("\n" + "=".repeat(70));
if (basarisiz === 0) console.log(`TÜM KONTROLLER GEÇTİ (${calisan})`);
else {
  console.log(`${basarisiz} KONTROL BAŞARISIZ (${calisan} kontrolden)`);
  process.exitCode = 1;
}
console.log("");
