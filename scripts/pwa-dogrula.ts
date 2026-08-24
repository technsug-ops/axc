import { readFileSync } from "node:fs";
import { TEMALAR } from "../src/components/tema-secici";

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
/**
 * ⚠ LİSTE ELLE TUTULMAZ, `TEMALAR`DAN OKUNUR (24.08.2026). Elle tutulan
 * liste, yarın eklenen dördüncü temayı sessizce dışarıda bırakır ve o
 * temanın kabuk rengi paletten ayrışsa kimse görmez.
 * (Anayasa: "bekçi ölçütü elle tutulan liste değil, tersten kurulur".)
 */
for (const tema of TEMALAR) {
  const dosya = `src/styles/selliora-${tema}.css`;
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

/**
 * ⚠ HER TEMA AYNI TOKEN SETİNİ TANIMLAR. Eksik bir token, o temada
 * çözümlenemeyen bir `var()` demektir — yüzey renksiz kalır ve hata
 * vermez, sessizce bozulur.
 */
{
  const tokenSeti = (yol: string) =>
    new Set(
      [...oku(yol).matchAll(/(--se-[a-z0-9-]+):/g)].map((m) => m[1]),
    );
  const temel = tokenSeti("src/styles/selliora-kobalt.css");
  kontrol(`kobalt token seti dolu (${temel.size})`, temel.size > 40);
  for (const tema of TEMALAR) {
    if (tema === "kobalt") continue;
    const bu = tokenSeti(`src/styles/selliora-${tema}.css`);
    const eksik = [...temel].filter((t) => !bu.has(t));
    kontrol(`${tema}: eksik token YOK (${bu.size})`, eksik.length === 0, eksik);
  }
}

/**
 * ⚠ SEMANTİK ZEMİN, KARTTAN PARLAK OLAMAZ (24.08.2026).
 *
 * Kağıt koyulaştırılırken çıktı: `--se-bil-bg` eski hâlinde (0.8900) yeni
 * karttan (0.8987) neredeyse parlaktı. Bırakılsaydı uyarı kutuları kartın
 * ÜSTÜNDE parlar, göz onları "daha yakın" okurdu — oysa kutu kartın
 * İÇİNDE. Parlaklık merdiveni derinlik bildirir; ters çevrilince yerleşim
 * yalan söyler.
 *
 * ⚠ ÖLÇÜLÜR, GÖZLE BAKILMAZ. Yeni tema eklendiğinde de bedava koşar.
 */
{
  const parlaklik2 = (hex: string) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const d = c.map((x) =>
      x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4,
    );
    return 0.2126 * d[0] + 0.7152 * d[1] + 0.0722 * d[2];
  };
  for (const tema of TEMALAR) {
    const metin = oku(`src/styles/selliora-${tema}.css`);
    const kart = /--se-kart:\s*(#[0-9A-Fa-f]{6})/.exec(metin)?.[1];
    if (!kart) {
      kontrol(`${tema}: kart rengi okunamadı`, false);
      continue;
    }
    /** Koyu temada zemin karttan AÇIK olur — yön tersine döner. */
    const koyuTema = parlaklik2(kart) < 0.2;
    const parlayan: string[] = [];
    for (const m of metin.matchAll(
      /(--se-[a-z0-9-]*-bg):\s*(#[0-9A-Fa-f]{6})/g,
    )) {
      const fark = parlaklik2(m[2]) - parlaklik2(kart);
      if (koyuTema ? fark < 0 : fark > 0) parlayan.push(`${m[1]}=${m[2]}`);
    }
    kontrol(
      `${tema}: hiçbir *-bg karttan parlak değil`,
      parlayan.length === 0,
      parlayan,
    );
  }
}

/**
 * ⚠ KÖPRÜ SEÇİCİSİ HER TEMAYI SAYAR. Palet dosyası eklenip köprüye
 * yazılmazsa `--se-*` yüklenir ama shadcn token'larına HİÇ bağlanmaz:
 * uygulama varsayılan yüzeylerle çizilir ve tema seçilmiş görünür.
 */
{
  const kopru = oku("src/app/globals.css");
  for (const tema of TEMALAR) {
    kontrol(
      `${tema}: köprü seçicisinde var`,
      kopru.includes(`[data-tema="${tema}"]`),
    );
    kontrol(
      `  ...${tema}: paleti import ediliyor`,
      kopru.includes(`selliora-${tema}.css`),
    );
  }
}

/**
 * ⚠ KOYU TEMA LİSTESİ AÇIK OLMALI, ADDAN TÜRETİLMEMELİ. `.dark` sınıfı
 * durum renklerinin `dark:` varyantını açıyor; açık bir tema yanlışlıkla
 * koyu sayılsaydı yeşil/kârmızı rozetler açık zeminde SOLUK kalırdı.
 */
{
  const secici = oku("src/components/tema-secici.tsx");
  kontrol(
    "koyu tema listesi AÇIK yazılı (addan türetilmiyor)",
    /KOYU_TEMALAR: readonly Tema\[\] = \[/.test(secici),
  );
  /**
   * ⚠ LİSTENİN YAZILI OLMASI YETMEZ — İÇERİĞİ PALETTEN DOĞRULANIR.
   * İlk yazım yalnız "liste var mı" diye soruyordu ve `kagit`i listeye
   * ekleyen mutasyon YEŞİL KALDI. Açık bir tema koyu sayılırsa `.dark`
   * devreye girer ve durum renkleri açık zeminde SOLUK kalır — okunmaz.
   *
   * Ölçüt elle liste değil, ÖLÇÜM: temanın kendi zemininin parlaklığı.
   * Dördüncü tema eklendiğinde de bedava doğru çalışır.
   */
  {
    const parlaklik = (hex: string) => {
      const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
      const d = c.map((x) =>
        x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4,
      );
      return 0.2126 * d[0] + 0.7152 * d[1] + 0.0722 * d[2];
    };
    const beyanEdilen = new Set(
      [...(/KOYU_TEMALAR: readonly Tema\[\] = \[([^\]]*)\]/.exec(secici)?.[1] ??
        "").matchAll(/"([a-z]+)"/g)].map((m) => m[1]),
    );
    for (const tema of TEMALAR) {
      const zemin = /--se-zemin:\s*(#[0-9A-Fa-f]{6})/.exec(
        oku(`src/styles/selliora-${tema}.css`),
      )?.[1];
      if (!zemin) {
        kontrol(`${tema}: zemin rengi okunamadı`, false);
        continue;
      }
      const olculenKoyu = parlaklik(zemin) < 0.2;
      kontrol(
        `${tema}: koyu/açık beyanı PALETLE tutuyor (zemin ${zemin})`,
        olculenKoyu === beyanEdilen.has(tema),
        { olculenKoyu, beyanEdilen: beyanEdilen.has(tema) },
      );
    }
  }
  kontrol(
    "  ...`.dark` o listeden karar veriyor",
    /classList\.toggle\("dark", koyuMu\(tema\)\)/.test(secici),
  );
  /** Üç temada "öteki" yoktur — düğme DÖNGÜ olmalı. */
  kontrol(
    "tema düğmesi döngü (ikili anahtar değil)",
    /sonrakiTema\(tema\)/.test(secici) &&
      !/tema === "gece" \? "kobalt" : "gece"/.test(secici),
  );
  /** Etiket ve ikon exhaustive: dördüncü tema derlenmeden eklenemez. */
  kontrol(
    "hedef etiketi exhaustive Record",
    /hedefEtiketi: Record<Tema, string>/.test(secici),
  );
  kontrol(
    "ikon eşlemesi exhaustive",
    /satisfies Record<Tema, React\.ReactNode>/.test(secici),
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
/**
 * ════════════════════════════════════════════════════════════════════════
 *  GEZİNME ÖN YÜKLEMESİ — "SW AÇILIŞ VERGİSİ" ÖDENMESİN
 * ------------------------------------------------------------------------
 *  Kullanıcı 23.08.2026: _"dünden beri sekmeler yavaş açılıyor."_ Ölçüldü
 *  ve suçlu buydu: tarayıcı boşta kalan servis çalışanını ~30 saniyede
 *  kapatıyor; `respondWith` çağıran bir `fetch` dinleyicisi varsa sonraki
 *  gezinmede önce SW ayağa kaldırılıyor ve ağ isteği ANCAK ONDAN SONRA
 *  başlıyor. Her sekme açılışı bu vergiyi ödüyordu.
 *
 *  ⚠ SUÇLU TEMA DEĞİLDİ. Aynı gün tema da değişmişti ve ilk şüphe oraydı;
 *  ölçüm onu eledi (CSS 95 KB, bir kez yükleniyor, önbellekte; arka uç
 *  TTFB 160-466 ms). Yakın zamanlı iki değişiklikten görünür olanı
 *  suçlamak kolaydı — ölçüm görünmeyeni gösterdi.
 * ════════════════════════════════════════════════════════════════════════
 */
kontrol(
  "gezinme ön yüklemesi AÇILIYOR (SW açılış vergisi ödenmesin)",
  /navigationPreload\.enable\(\)/.test(etkinBloku),
);
/**
 * ⚠ ÖZELLİK KONTROLÜ ŞART. Eski tarayıcılarda `navigationPreload` yok ve
 * doğrudan çağırmak `activate`i DÜŞÜRÜR — servis çalışanı hiç etkinleşmez
 * ve kullanıcı sessizce PWA'sız kalır.
 */
kontrol(
  "  ...önce varlığı sınanıyor (eski tarayıcıda activate düşmesin)",
  /if\s*\(self\.registration\.navigationPreload\)/.test(etkinBloku),
);
/**
 * ⚠ AÇMAK YETMEZ, KULLANMAK GEREKİR. `enable()` çağrılıp `preloadResponse`
 * okunmazsa tarayıcı isteği başlatır, biz onu ÇÖPE ATIP ikinci bir istek
 * yaparız — yani hem yavaş kalır hem çift istek atılır.
 */
kontrol(
  "  ...ve ön yüklenen cevap GERÇEKTEN kullanılıyor",
  /await olay\.preloadResponse/.test(sayfaDali) &&
    /if \(onYuklenen\) return onYuklenen/.test(sayfaDali),
);
/**
 * ⚠ SÜRÜM ARTMALI. Sahadaki telefonlarda sürüm 1 kurulu; sürüm artmazsa
 * yeni dosya devralmaz ve düzeltme kimseye ULAŞMAZ.
 */
kontrol(
  "  ...sürüm artırılmış (eski SW sahadan çekilsin)",
  !/SURUM = "selliora-sw-1"/.test(sw),
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
/**
 * ⚠ ÖLÇÜT ESKİDİ, KOD DEĞİL (24.08.2026). Eski desen `KABUK_RENKLERI.gece`
 * arıyordu — yani betiğin İKİLİ bir ternary olduğunu varsayıyordu. Üçüncü
 * tema gelince betik haritadan okumaya çevrildi (`g[t]`) ve kontrol kırmızı
 * yandı; davranış AYNI, üstelik dördüncü tema bedava çalışıyor.
 *
 * Ölçüt artık niyete bakıyor: renk KABUK_RENKLERI'nden geliyor mu ve tek
 * tema adına gömülü değil mi.
 */
kontrol(
  "  ...betik rengi KABUK_RENKLERI'nden okuyor",
  /theme-color[\s\S]{0,300}g\[t\]/.test(layout) &&
    /KABUK_JSON/.test(layout),
);
/**
 * ⚠ DESEN DOSYADA DEĞİL, BETİK GÖVDESİNDE ARANIR. İlk yazım bütün
 * `layout.tsx`te `KABUK_RENKLERI.<tema>` arıyordu ve KIRMIZI yandı — ama
 * bulduğu şey MEŞRUYDU: sunucu tarafı `<meta>` varsayılanı (betik
 * koşmadan önceki hâl, bilinçli olarak kobalt). Ölçüt yalnız açılış
 * betiğine daraltıldı; orada tek tema adına gömülü renk KALMAMALI.
 * (Anayasa: kaynak tarayan kontrol, deseni kullanım bloğunda arar.)
 */
{
  const betikBasi = layout.indexOf("const TEMA_BETIGI");
  const betikGovdesi = layout.slice(betikBasi, layout.indexOf("`;", betikBasi));
  kontrol("açılış betiği kesilebildi", betikBasi > 0 && betikGovdesi.length > 80);
  kontrol(
    "  ...betikte tek tema adına gömülü renk YOK",
    !/KABUK_RENKLERI\.(gece|kobalt|kagit)/.test(betikGovdesi),
  );
}
kontrol(
  "  ...tema değişince renk de dönüyor",
  /meta\.setAttribute\("content",\s*KABUK_RENKLERI\[tema\]\)/.test(
    yorumsuz(oku("src/components/tema-secici.tsx")),
  ),
);
/** iOS manifest okumaz; ana ekran davranışı bu etiketten gelir. */
kontrol("iOS ana ekran davranışı bildirilmiş", /appleWebApp:/.test(layout));
/**
 * ⚠ ESKİ iOS ETİKETİ ELLE BASILIYOR — VE BURADA BAĞLANIYOR.
 *
 * Next `appleWebApp.capable` için yalnız YENİ adı basıyor
 * (`mobile-web-app-capable`); eski Safari sürümleri yalnız eski ada bakar ve
 * bulamazsa kısayolu adres çubuğuyla açar. Etiket `layout.tsx`e elle kondu;
 * elle konan şey elle de silinir, o yüzden kontrol altında.
 *
 * ⚠ İKİ KABUKTA DA OLMALI: giriş ekranı da telefonda kuruluyor.
 */
kontrol(
  "  ...eski iOS etiketi her iki kabukta elle basılıyor",
  [...layout.matchAll(/<meta\s+name="apple-mobile-web-app-capable"/g)].length ===
    betikSayisi,
);
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
