import { readFileSync } from "node:fs";

/**
 * ============================================================================
 *  PWA — DOĞRULAMA
 * ----------------------------------------------------------------------------
 *  Kullanıcı 22.08.2026: _"PWA şeklinde programın mobilde desteklenmesini
 *  istiyorum."_
 *
 *  Bu bekçinin İKİ işi var ve ikincisi asıl olan:
 *
 *  1. KURULUM GERÇEKTEN OLUYOR MU. PWA'nın bütün başarısızlıkları SESSİZDİR:
 *     manifest'te bir simge eksikse ya da tarayıcı manifest'i çekemiyorsa
 *     "kur" teklifi hiç çıkmaz ve ekranda bunu söyleyen bir şey OLMAZ.
 *     Kullanıcı yalnız "olmuyor" der. Bu yüzden şartlar teker teker sınanır.
 *
 *  2. ÖNBELLEK VERİYE DOKUNMUYOR MU. Servis çalışanı bir sayfayı ya da API
 *     cevabını önbelleğe alırsa telefon DÜNKÜ NET-2'yi bugünkü gibi
 *     gösterir — kaynağı görünmeyen, yanlış olduğu anlaşılmayan bir rakam.
 *     Bu, deponun bütün bekçilerle kovaladığı sessiz yanlışlığın ta kendisi
 *     ve bir kere sahaya çıkarsa geri almak günler alır.
 *
 *  ⚠ DESENLER KULLANIM BLOĞUNDA ARANIR, DOSYANIN TAMAMINDA DEĞİL. Bu
 *  deponun beş kez düştüğü tuzak: `put(` kelimesi yorumda da geçer, ve
 *  yorumda bulunduğu için kontrol yeşil yanar. Aşağıda önce YORUMLAR
 *  SÖKÜLÜYOR, sonra ilgili dal kesilip içinde aranıyor.
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

const oku = (yol: string) => readFileSync(yol, "utf8");

/**
 * Yorumları söker.
 *
 * ⚠ BU FONKSİYON OLMADAN BÜTÜN KONTROLLER YALANCI YEŞİL OLUR. Bu dosyalarda
 * yorum satırları koddan uzun; aranan her desen ("put(", "credentials",
 * "/api") yorumların içinde de geçiyor. Yorumlu metinde arayan bir kontrol,
 * kodu tamamen silinse bile geçmeye devam ederdi.
 */
function yorumsuz(metin: string): string {
  return metin
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

// ===========================================================================
console.log("");
console.log("1) MANİFEST — TELEFON BUNU OKUYUP 'KUR' DİYECEK");
// ===========================================================================
const manifest = yorumsuz(oku("src/app/manifest.ts"));

/**
 * ⚠ AD SABİTTEN GELİR, ELLE YAZILMAZ. Anayasa: "Uygulama adı TEK sabitten
 * okunur; ad değişikliği tek satırlık iş olmalıdır." Manifest'e "Selliora"
 * yazılsaydı ad değiştiğinde telefondaki simgenin altı eski adı yazmaya
 * devam ederdi ve kimse oraya bakmayı akıl etmezdi.
 */
kontrol("ad UYGULAMA sabitinden", /name:\s*UYGULAMA\.ad/.test(manifest));
kontrol("  ...kısa ad da sabitten", /short_name:\s*UYGULAMA\.ad/.test(manifest));
kontrol("  ...ada elle marka yazılmamış", !/name:\s*"/.test(manifest));

/** Açıklama kullanıcıya görünür → sözlükten (anayasa: i18n). */
kontrol(
  "açıklama sözlükten (i18n)",
  /description:\s*t\("slogan"\)/.test(manifest),
);
kontrol(
  "  ...sözlük sunucu tarafında çözülüyor",
  /getTranslations\("Uygulama"\)/.test(manifest),
);

kontrol("adres çubuksuz açılıyor", /display:\s*"standalone"/.test(manifest));
kontrol("giriş noktası tanımlı", /start_url:\s*"\/"/.test(manifest));

/**
 * ⚠ 192 VE 512 KURULUM ŞARTI. Biri eksikse Android'de teklif hiç çıkmaz.
 * Ölçüt "icons dizisi var mı" değil, İKİ BOYUTUN DA olması.
 */
const simgeler = [...manifest.matchAll(/\{\s*src:\s*"[^"]+"[\s\S]*?\}/g)].map(
  (e) => e[0],
);
const boyutlar = simgeler
  .map((s) => /sizes:\s*"(\d+)x\1"/.exec(s)?.[1])
  .filter((b): b is string => b !== undefined);
kontrol("192 px simge bildirilmiş", boyutlar.includes("192"), boyutlar);
kontrol("512 px simge bildirilmiş", boyutlar.includes("512"), boyutlar);

const maskeliler = simgeler.filter((s) => /purpose:\s*"maskable"/.test(s));
kontrol("maskeli (Android kırpması) simge var", maskeliler.length === 1);

/**
 * ⚠ MASKELİ AYRI DOSYA OLMALI. Aynı çizim iki amaca verilseydi Android
 * kırparken harfin kenarlarını yerdi. Bu kontrol tam olarak o kısayolu
 * yasaklıyor.
 */
const maskeliKaynak = /src:\s*"([^"]+)"/.exec(maskeliler[0] ?? "")?.[1];
const normalKaynaklar = simgeler
  .filter((s) => !/purpose:/.test(s))
  .map((s) => /src:\s*"([^"]+)"/.exec(s)?.[1]);
kontrol(
  "  ...maskeli çizim normalden AYRI dosya",
  maskeliKaynak !== undefined && !normalKaynaklar.includes(maskeliKaynak),
  { maskeliKaynak, normalKaynaklar },
);

// ===========================================================================
console.log("");
console.log("2) SİMGE ADRESLERİ — GÖSTERİLEN ADRES GERÇEKTEN VAR MI");
// ===========================================================================
/**
 * ⚠ "KURAL DOĞRU MU DEĞİL, TESLİM EDİLEBİLİR Mİ." Manifest'te yazan bir
 * adresin ARKASINDA bir şey olduğu ayrıca sınanır. Bu deponun tekrar tekrar
 * düştüğü tuzak bu: gösterilen linkin hedefi yok, ekran sessizce boş kalır.
 * Simgede sonucu daha kötü — 404 dönen simge kurulumu tamamen iptal eder ve
 * hiçbir yerde hata görünmez.
 */
const rota = yorumsuz(oku("src/app/ikon/[ad]/route.tsx"));
const tanimliAdlar = [...rota.matchAll(/"([\w.-]+\.png)":\s*\{/g)].map(
  (e) => e[1],
);
const istenenAdlar = simgeler
  .map((s) => /src:\s*"\/ikon\/([^"]+)"/.exec(s)?.[1])
  .filter((a): a is string => a !== undefined);
kontrol(
  "manifest'teki her simge rotada tanımlı",
  istenenAdlar.length === simgeler.length &&
    istenenAdlar.every((a) => tanimliAdlar.includes(a)),
  { istenenAdlar, tanimliAdlar },
);
kontrol(
  "  ...üçü de derlemede üretiliyor (generateStaticParams)",
  /generateStaticParams/.test(rota) && /Object\.keys\(OLCULER\)/.test(rota),
);
kontrol(
  "  ...bilinmeyen ad 404 döner (boş simge dönmez)",
  /if\s*\(!olcu\)\s*notFound\(\)/.test(rota),
);

/** Bildirilen boyut ile çizilen boyut aynı mı — manifest yalan söylemesin. */
const cizimOlculeri = [
  ...rota.matchAll(/"([\w.-]+\.png)":\s*\{\s*boyut:\s*(\d+)/g),
];
kontrol("  ...üç ölçü de okunabildi", cizimOlculeri.length === 3);
for (const [, ad, boyut] of cizimOlculeri) {
  const bildirilen = simgeler.find((s) => s.includes(`/ikon/${ad}`));
  kontrol(
    `  ...${ad}: bildirilen boyut çizilenle aynı (${boyut})`,
    bildirilen !== undefined && bildirilen.includes(`"${boyut}x${boyut}"`),
  );
}

const ikon = yorumsuz(oku("src/lib/marka/ikon.tsx"));
kontrol(
  "simge harfi UYGULAMA.ad'dan türetiliyor",
  /UYGULAMA\.ad\.charAt\(0\)/.test(ikon),
);
/**
 * ⚠ SAHİP OLMADIĞI ETKİYİ İDDİA EDEN SATIR OLMASIN. `fontWeight: 700`
 * yazılmıştı ve hiçbir şey yapmıyordu: çizicinin kalın yazı tipi yok.
 * Kaldırıldı; geri gelirse bu kontrol yakalar.
 */
kontrol("  ...çalışmayan kalınlık iddiası yok", !/fontWeight/.test(ikon));

// ===========================================================================
console.log("");
console.log("3) RENKLER PALETLE AYRIŞMIYOR MU");
// ===========================================================================
/**
 * ⚠ YORUMDA DURAN KARAR SESSİZCE ÇÜRÜR. 22.08.2026'da tam bu oldu: çizgi
 * rengi kararı yalnız yorumda yazılıydı, palet değişti, gerekçe olduğu gibi
 * kaldı ve kimse fark etmedi. Simge ve sistem çubuğu rengi CSS'ten
 * okunamadığı için hex KOPYA duruyor; kopyayı bu kontrol bağlıyor.
 */
const renkler = yorumsuz(oku("src/lib/marka/renkler.ts"));
for (const [tema, dosya] of [
  ["kobalt", "src/styles/selliora-kobalt.css"],
  ["gece", "src/styles/selliora-gece.css"],
] as const) {
  const paletten = /--se-kabuk:\s*(#[0-9A-Fa-f]{6})/
    .exec(oku(dosya))?.[1]
    ?.toUpperCase();
  const yazilan = new RegExp(`${tema}:\\s*"(#[0-9A-Fa-f]{6})"`)
    .exec(renkler)?.[1]
    ?.toUpperCase();
  kontrol(
    `${tema}: kabuk rengi paletle aynı`,
    paletten !== undefined && paletten === yazilan,
    { paletten, yazilan },
  );
}

// ===========================================================================
console.log("");
console.log("4) SERVİS ÇALIŞANI — VERİYE DOKUNMUYOR MU (ASIL KONTROL)");
// ===========================================================================
const sw = yorumsuz(oku("public/sw.js"));

const getirBloku = sw.slice(sw.indexOf('addEventListener("fetch"'));
kontrol(
  "yazma istekleri hiç ellenmiyor (GET dışı)",
  /istek\.method\s*!==\s*"GET"\)\s*return/.test(getirBloku),
);
kontrol(
  "başka alan adları ellenmiyor",
  /url\.origin\s*!==\s*self\.location\.origin\)\s*return/.test(getirBloku),
);

/**
 * ⚠ İZİN LİSTESİ, YASAK LİSTESİ DEĞİL. "/api hariç her şeyi önbelleğe al"
 * denseydi yarın eklenen bir yol sessizce önbelleğe girerdi — deponun "tip
 * listesi değil, bağ" dersinin aynısı. Ölçüt tersten kurulu: SADECE içerik
 * özetli derleme çıktıları.
 */
kontrol(
  "önbellek izin listesi /_next/static/ ile sınırlı",
  /GUVENLI_ONEK\s*=\s*"\/_next\/static\/"/.test(sw),
);
kontrol(
  "  ...izin listesi dışındaki her şey ağa bırakılıyor",
  /!url\.pathname\.startsWith\(GUVENLI_ONEK\)\)\s*return/.test(getirBloku),
);

/**
 * ⚠ YAZMALAR BLOK BAŞINA SAYILIR, DOSYA BAŞINA DEĞİL.
 *
 * İlk yazımda "dosyada tek `put(` olsun" denmişti ve kontrol KIRMIZI yandı:
 * meşru İKİ yazma var (kurulumda çevrimdışı sayfası, getirmede statik
 * dosya). Kör sayım, doğru kodu suçladı — bu deponun "eşiği soruyu soran
 * koyamaz" dersinin desen tarafındaki hâli.
 *
 * Doğru ölçüt sayı değil YER: izin listesi kontrolünden ÖNCE hiçbir yazma
 * olmamalı. Böyle kurulunca "API cevabını da önbelleğe alalım" diyen bir
 * satır, nereye konursa konsun yakalanır.
 */
const izinYeri = getirBloku.indexOf("!url.pathname.startsWith(GUVENLI_ONEK)");
kontrol("izin listesi kontrolü bulunabildi", izinYeri !== -1);
kontrol(
  "  ...izin listesinden ÖNCE hiçbir önbellek yazması yok",
  izinYeri !== -1 &&
    [...getirBloku.slice(0, izinYeri).matchAll(/\.put\(/g)].length === 0,
);
kontrol(
  "  ...izin listesinden SONRA tek yazma var",
  izinYeri !== -1 &&
    [...getirBloku.slice(izinYeri).matchAll(/\.put\(/g)].length === 1,
);

/**
 * ⚠ SAYFA GEÇİŞLERİ ASLA SAKLANMAZ. Bu kontrolün olmaması, panelin
 * önbellekten dönmesi demek: dünkü NET-2 bugünkü gibi görünür.
 * Desen SAYFA DALININ İÇİNDE aranıyor — dosyanın tamamında arasaydık
 * aşağıdaki meşru `put(` çağrısını bulup yeşil yanardı.
 */
const sayfaBasi = getirBloku.indexOf('istek.mode === "navigate"');
const sayfaSonu = getirBloku.indexOf("GUVENLI_ONEK)");
const sayfaDali = getirBloku.slice(sayfaBasi, sayfaSonu);
kontrol(
  "sayfa dalı kesilebildi (kontrol gerçekten bir şeye bakıyor)",
  sayfaBasi !== -1 && sayfaSonu > sayfaBasi,
);
kontrol("sayfa geçişi ÖNBELLEĞE YAZILMIYOR", !/\.put\(/.test(sayfaDali));
kontrol("  ...önce ağ deneniyor", /return await fetch\(istek\)/.test(sayfaDali));
kontrol(
  "  ...ağ ölürse çevrimdışı sayfası dönüyor",
  /caches\.match\(CEVRIMDISI\)/.test(sayfaDali),
);

/**
 * ⚠ ÇEVRİMDIŞI SAYFASI ÇEREZSİZ ALINIR. Oturum çereziyle alınsaydı sol
 * menünün tamamı HTML olarak diske yazılırdı ve çıkıştan sonra da orada
 * kalırdı — `layout.tsx`in açıkça yasakladığı yapı sızıntısı.
 */
const kurulumBloku = sw.slice(
  sw.indexOf('addEventListener("install"'),
  sw.indexOf('addEventListener("activate"'),
);
kontrol(
  "çevrimdışı sayfası ÇEREZSİZ önbelleğe alınıyor",
  /credentials:\s*"omit"/.test(kurulumBloku),
);

const etkinBloku = sw.slice(sw.indexOf('addEventListener("activate"'));
kontrol(
  "eski sürümün önbelleği siliniyor",
  /caches\.delete\(ad\)/.test(etkinBloku) &&
    /startsWith\(SURUM\)/.test(etkinBloku),
);
kontrol(
  "yeni sürüm beklemeden devralıyor (sahadan geri çekilebilir)",
  /skipWaiting\(\)/.test(sw) && /clients\.claim\(\)/.test(etkinBloku),
);

// ===========================================================================
console.log("");
console.log("5) KAPI — TARAYICI BUNLARI ÇEREZSİZ İSTİYOR");
// ===========================================================================
/**
 * ⚠ BU KONTROL OLMASA HATA SESSİZ OLURDU. Tarayıcı manifest'i ve simgeleri
 * oturum çerezi GÖNDERMEDEN çeker; kapı onları `/giris`e yönlendirirse
 * tarayıcı JSON yerine HTML alır ve kurulum teklifi hiç çıkmaz. Ekranda
 * hata görünmez, kullanıcı yalnız "olmuyor" der.
 */
const kapi = yorumsuz(oku("src/proxy.ts"));
const listeBasi = kapi.indexOf("ACIK_YOLLAR = [");
const acikListe = kapi.slice(listeBasi, kapi.indexOf("];", listeBasi));
kontrol("açık yollar listesi okunabildi", listeBasi !== -1);
for (const yol of ["/manifest.webmanifest", "/sw.js", "/ikon", "/cevrimdisi"]) {
  kontrol(`kapı açık: ${yol}`, acikListe.includes(`"${yol}"`));
}

// ===========================================================================
console.log("");
console.log("6) KAYIT VE SİSTEM ÇUBUĞU");
// ===========================================================================
const kayit = yorumsuz(oku("src/components/sw-kayit.tsx"));
kontrol("servis çalışanı kaydediliyor", /register\("\/sw\.js"/.test(kayit));
/**
 * ⚠ GELİŞTİRMEDE KAYIT YAPILMAZ. Yapılsaydı sıcak yeniden yükleme parçaları
 * önbelleğe girer ve "kodu değiştirdim, ekran değişmiyor" tuzağı doğardı.
 */
kontrol(
  "  ...yalnız üretimde",
  /NODE_ENV\s*!==\s*"production"\)\s*return/.test(kayit),
);
kontrol("  ...her açılışta yeni sürüm soruluyor", /kayit\.update\(\)/.test(kayit));

const layout = yorumsuz(oku("src/app/layout.tsx"));
/**
 * ⚠ META ETİKETİ BETİKTEN ÖNCE GELMELİ — betik onu bulup içeriğini temaya
 * göre değiştiriyor. Sonra gelseydi `querySelector` null döner, sistem
 * çubuğu gece temasında da parlak mavi kalırdı. Sıra ÖLÇÜLÜYOR.
 *
 * ⚠ İKİ KABUK VAR (girişli / girişsiz) ve etiket İKİSİNDE DE olmalı; giriş
 * ekranı da telefonda PWA olarak açılıyor. Bu yüzden ilk değil SON meta
 * ile SON betik karşılaştırılıyor — biri unutulursa sıra bozulur.
 */
/**
 * ⚠ DESEN ETİKETE BAĞLANIR, ADA DEĞİL. İlk yazımda `name="theme-color"`
 * arandı ve ÜÇ eşleşme çıktı: iki JSX etiketi + betiğin içindeki
 * `querySelector('meta[name="theme-color"]')`. Kontrol doğru kodu kırmızı
 * yaktı. Bu deponun beş kez düştüğü tuzağın aynısı — desen çağrı yerine
 * bağlanır (`<meta name=`), ada değil.
 */
const metaEtiketi = /<meta\s+name="theme-color"/g;
const metaSayisi = [...layout.matchAll(metaEtiketi)].length;
const betikSayisi = [...layout.matchAll(/__html: TEMA_BETIGI/g)].length;
kontrol("sistem çubuğu rengi bildiriliyor", metaSayisi > 0);
kontrol(
  "  ...her kabukta var (girişli + girişsiz)",
  metaSayisi === betikSayisi && betikSayisi === 2,
  { metaSayisi, betikSayisi },
);
const metaYerleri = [...layout.matchAll(metaEtiketi)].map((e) => e.index);
const betikYerleri = [...layout.matchAll(/__html: TEMA_BETIGI/g)].map(
  (e) => e.index,
);
kontrol(
  "  ...her kabukta meta etiketi betikten ÖNCE",
  metaYerleri.length === betikYerleri.length &&
    metaYerleri.every((y, i) => y < betikYerleri[i]),
  { metaYerleri, betikYerleri },
);
kontrol(
  "  ...betik rengi temaya göre yazıyor",
  /theme-color[\s\S]{0,200}KABUK_RENKLERI\.gece/.test(layout),
);
kontrol(
  "  ...tema değişince renk de dönüyor",
  /meta\.setAttribute\("content",\s*KABUK_RENKLERI\[tema\]\)/.test(
    yorumsuz(oku("src/components/tema-secici.tsx")),
  ),
);
/** iOS manifest okumaz; ana ekran davranışı bu etiketten gelir. */
kontrol("iOS ana ekran davranışı bildirilmiş", /appleWebApp:/.test(layout));
kontrol(
  "  ...iOS simgesi var",
  yorumsuz(oku("src/app/apple-icon.tsx")).includes("markaIkonu"),
);

// ===========================================================================
console.log("");
console.log("7) ÇEVRİMDIŞI SAYFASI");
// ===========================================================================
const cevrimdisi = yorumsuz(oku("src/app/cevrimdisi/page.tsx"));
kontrol(
  "metinler sözlükten (i18n)",
  /getTranslations\("Cevrimdisi"\)/.test(cevrimdisi),
);
/**
 * ⚠ NEDEN VERİ GÖSTERMEDİĞİMİZ EKRANDA YAZAR (İlke #5). "Bağlantı yok"
 * deyip susmak, kullanıcıya "program bozuldu" dedirtir.
 */
kontrol("  ...neden rakam gösterilmediği yazıyor", /t\("neden"\)/.test(cevrimdisi));
/**
 * ⚠ JAVASCRIPT GEREKTİRMEZ. Çevrimdışıyken betiklerin yüklenip yüklenmediği
 * belirsiz; "yeniden dene" bir düğme (onClick) değil BAĞLANTI olmalı.
 */
kontrol("  ...yeniden dene JavaScript istemiyor", !/onClick/.test(cevrimdisi));

/**
 * ⚠ İSTİSNANIN GEREKÇESİ BURADA BAĞLANIYOR.
 *
 * Bu sayfa `scripts/yetki-dogrula.ts`te KORUMASIZ olarak beyan edildi ve
 * gerekçesi şuydu: _"veri taşımaz"_. Gerekçe bir İDDİADIR — yarın birisi
 * "hazır sayfa var, son satışları da gösterelim" derse istisna sessizce
 * bir sızıntıya döner ve yetki bekçisi susar (istisna listesinde çünkü).
 *
 * Bu yüzden iddia ölçülüyor: sayfa veritabanına gitmiyor, sunucu eylemi
 * çağırmıyor, oturumu okumuyor. Biri bunu değiştirirse önce BURASI kırmızı
 * yanar ve istisnanın yeniden düşünülmesi gerekir.
 */
for (const yasak of ["prisma", "oturumdakiKullanici", "yetkiIste", "cookies("]) {
  kontrol(
    `  ...veri taşımıyor: ${yasak} yok`,
    !cevrimdisi.includes(yasak),
  );
}

for (const dosya of ["messages/tr.json", "messages/en.json"]) {
  const sozluk = JSON.parse(oku(dosya)) as Record<
    string,
    Record<string, string>
  >;
  kontrol(
    `${dosya}: Cevrimdisi anahtarları tam`,
    ["baslik", "aciklama", "neden", "yenidenDene"].every(
      (a) => a in (sozluk.Cevrimdisi ?? {}),
    ),
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
