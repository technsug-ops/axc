import { existsSync, readdirSync } from "node:fs";

import { kaynakOku } from "./kaynak-oku";

/**
 * ============================================================================
 *  TANITIM VİTRİNİ BEKÇİSİ — `/info` (K374, 08.11.2026)
 * ----------------------------------------------------------------------------
 *      npm run tanitim:dogrula
 *
 *  ⛔ KAPSAM DEĞİŞTİ 08.11.2026 — ESKİ GEREKÇE SİLİNMEDİ, BURADA DURUYOR.
 *  Vitrin önce AYRI bir statik site + ayrı Vercel projesiydi (K372,
 *  `tanitim.bezirga.com`) ve bu bekçi `tanitim/gorsel/` ile
 *  `public/kitap-ekran/` arasındaki BAYT BAYT aynayı ölçüyordu: eşitlik,
 *  görüntünün örnek veriden geldiğinin kanıtıydı.
 *
 *  Kullanıcı 08.11.2026'da tek alan adını seçti (_«bunu neden bezirganın ana
 *  sayfasında yapmıyoruz? www.bezirga/info»_); sayfa uygulamanın içine
 *  taşındı ve görüntüleri `public/kitap-ekran/` altından DOĞRUDAN gösteriyor.
 *  Kopya kalmadığı için ayna ölçütü de GEREKSİZLEŞTİ — ama koruduğu SÖZ
 *  aynen duruyor ve burada başka türlü ölçülüyor:
 *
 *      gösterilen her görüntü örnek veri hattının klasöründen gelmeli.
 *
 *  O klasörü dolduran tek şey `npm run ekran:cek`tir ve o betik örnek
 *  veritabanına bağlı değilse çekim yapmayı REDDEDER.
 *
 *  ⛔ VE EN PAHALI ŞEY KAPIDIR: `/info` herkese açık bir sayfa. Kapı
 *  (`src/proxy.ts` → `ACIK_YOLLAR`) varsayılan KAPALI olduğu için satır
 *  silinirse sayfa sessizce giriş ekranına yönlenir — ziyaretçi için vitrin
 *  YOK olur ve hiçbir hata görünmez.
 * ============================================================================
 */

const SAYFA = "src/app/info/page.tsx";
const KAPI = "src/proxy.ts";
const GORSEL_KLASORU = "public/kitap-ekran";
const SOZLUK = "messages/tr.json";

/** Her bölüm koştuğunu KAYDEDER; özet beklenen sayıyla karşılaştırır. */
const BOLUM_SAYISI = 4;
const kosanBolumler: string[] = [];

let basarisiz = 0;
let gecen = 0;
const kontrol = (ad: string, kosul: boolean, ek = "") => {
  if (kosul) {
    gecen++;
    console.log(`  OK  ${ad}`);
  } else {
    basarisiz++;
    console.log(`  ⛔  ${ad}${ek ? "\n        " + ek : ""}`);
  }
};

console.log("\nTANITIM VİTRİNİ BEKÇİSİ — /info\n");

const sayfa = kaynakOku(SAYFA);
const kapi = kaynakOku(KAPI);

/* ── 1) KAPI ────────────────────────────────────────────────────────────── */
console.log("1) KAPI — sayfa gerçekten herkese açık mı");
{
  /**
   * ⚠ ÖLÇÜT YORUMSUZ GÖVDEDE ARANIR. Kapıyı ANLATAN bir yorum, kapının
   * açık OLDUĞUNU göstermez (anayasa: yorumsuz kodda ara).
   */
  const yorumsuz = kapi.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  kontrol(
    "`/info` ACIK_YOLLAR içinde (yoksa ziyaretçi girişe yönlenir)",
    /"\/info"/.test(yorumsuz),
  );
  kontrol(
    "`/kitap-ekran` ACIK_YOLLAR içinde (yoksa görseller girişe yönlenir)",
    /"\/kitap-ekran"/.test(yorumsuz),
  );
  /**
   * ⛔ VARSAYILAN KAPALI KALMALI. Liste bir İZİN listesidir; bir gün
   * "hepsini aç" diye tersine çevrilirse bu bekçi görmeli.
   */
  kontrol(
    "kapı hâlâ varsayılan KAPALI (açık değilse giriş istenir)",
    /if \(acikMi\(yol\)\) return NextResponse\.next\(\);/.test(yorumsuz),
  );
  kosanBolumler.push("kapı");
}

/* ── 2) GÖRÜNTÜ PROVENANSI ──────────────────────────────────────────────── */
console.log("\n2) GÖRÜNTÜ PROVENANSI — örnek veri hattı");
{
  const varOlan = existsSync(GORSEL_KLASORU)
    ? readdirSync(GORSEL_KLASORU).filter((d) => d.endsWith(".jpg"))
    : [];
  /**
   * ⛔ TABAN DOLULUĞU AYRICA BEYAN EDİLİR: boş klasörde aşağıdaki döngü
   * hiç dönmez ve bekçi "hepsi geçti" derdi (`every` kapısının tarama hâli).
   */
  kontrol(
    `örnek veri klasörü dolu (en az 10 görüntü, bulunan ${varOlan.length})`,
    varOlan.length >= 10,
  );

  /** Sayfanın gösterdiği HER yol — çıplak dize değil, gerçek kullanım. */
  const gosterilen = [...sayfa.matchAll(/\/kitap-ekran\/([a-z0-9-]+\.jpg)/g)].map(
    (m) => m[1],
  );
  const sabitler = [...sayfa.matchAll(/dosya: "([a-z0-9-]+\.jpg)"/g)].map(
    (m) => m[1],
  );
  const hepsi = [...new Set([...gosterilen, ...sabitler])];
  kontrol(
    `sayfa görüntü gösteriyor (en az 8 yol, bulunan ${hepsi.length})`,
    hepsi.length >= 8,
  );

  const eksik = hepsi.filter((d) => !varOlan.includes(d));
  kontrol(
    "gösterilen her görüntü örnek veri klasöründe VAR (ölü bağlantı yok)",
    eksik.length === 0,
    eksik.join(", "),
  );

  /**
   * ⛔ BAŞKA KAYNAKTAN GÖRÜNTÜ GÖSTERİLEMEZ. Gerçek defterin fotoğrafı
   * buraya konursa müşteri, tedarikçi, SKU ve kâr rakamı internete çıkar —
   * ve arama motoru önbelleği yüzünden silmek geri getirmez.
   */
  const yabanci = [...sayfa.matchAll(/src=[{"`]+([^"`}]+\.(?:jpg|jpeg|png|webp))/g)]
    .map((m) => m[1])
    .filter((y) => !y.includes("/kitap-ekran/"));
  kontrol(
    "başka klasörden görüntü gösterilmiyor (gerçek defter sızmaz)",
    yabanci.length === 0,
    yabanci.join(", "),
  );
  kosanBolumler.push("provenans");
}

/* ── 3) ÖRNEK VERİ BEYANI ───────────────────────────────────────────────── */
console.log("\n3) BEYAN — ziyaretçi bunun örnek veri olduğunu OKUYOR");
{
  /**
   * ⛔ BEYAN ÇİZİLİYOR MU — dosyada DURUYOR MU değil. Dalı `{false && …}`
   * yapan ya da anahtarı yoruma taşıyan bir değişiklik yakalanmalı; bu
   * yüzden çapa, çizim bloğunun ta kendisidir.
   */
  kontrol(
    "kahraman bölümünde «örnek veri» beyanı ÇİZİLİYOR",
    /<p className=\{stil\["kahraman-not"\]\}>\{t\("kahramanNot"\)\}<\/p>/.test(
      sayfa,
    ),
  );
  kontrol(
    "galeri de «gerçek defteri göstermez» diyor",
    /<p>\{t\("ekranlarMetin"\)\}<\/p>/.test(sayfa),
  );

  const sozluk = JSON.parse(kaynakOku(SOZLUK)) as {
    Tanitim?: Record<string, string>;
  };
  const t = sozluk.Tanitim ?? {};
  kontrol(
    "sözlükteki beyan metni GERÇEKTEN örnek veri diyor",
    (t.kahramanNot ?? "").includes("örnek veri") &&
      (t.ekranlarMetin ?? "").includes("gerçek defteri göstermez"),
  );
  kosanBolumler.push("beyan");
}

/* ── 4) SAYFANIN KENDİSİ ────────────────────────────────────────────────── */
console.log("\n4) SAYFA — herkese açık bir sayfa ne YAPMAMALI");
{
  /**
   * ⛔ HERKESE AÇIK SAYFA VERİTABANINA GİTMEZ. Vitrin statik metindir;
   * bir sorgu eklenirse hem kotayı (KAS 25 bağlantı) yer hem de oturumsuz
   * bir ziyaretçiye defterden veri taşıma yolu açılır.
   */
  kontrol(
    "sayfa veritabanına GİTMİYOR (prisma yok)",
    !/from "@\/lib\/prisma"/.test(sayfa) && !/prisma\./.test(sayfa),
  );
  /**
   * ⚠ METİN SÖZLÜKTEN. Uygulama adı tek sabitten, marka çizimi tek
   * kaynaktan gelir — ad değişikliği tek satırlık iş olmalı.
   */
  kontrol(
    "uygulama adı tek sabitten (UYGULAMA.ad)",
    /UYGULAMA\.ad/.test(sayfa) && !/"Bezirga"/.test(sayfa),
  );
  kontrol(
    "marka çizimi ortak kaynaktan (gömülü SVG yolu yok)",
    /MarkaIkonu/.test(sayfa) && !/viewBox="0 0 256 256"/.test(sayfa),
  );
  kosanBolumler.push("sayfa");
}

/* ── ÖZET ───────────────────────────────────────────────────────────────── */
if (kosanBolumler.length !== BOLUM_SAYISI) {
  console.log(
    "\n⛔ KOŞUM YARIM KALDI — sonuç GEÇERSİZ. Koşan bölüm: " +
      kosanBolumler.length +
      "/" +
      BOLUM_SAYISI +
      " (" +
      kosanBolumler.join(" · ") +
      ")",
  );
  process.exit(1);
}

console.log("");
if (basarisiz === 0) {
  console.log(`TÜM KONTROLLER GEÇTİ (${gecen})`);
} else {
  console.log(`${basarisiz} KONTROL BAŞARISIZ (${gecen + basarisiz} kontrolden)`);
  process.exitCode = 1;
}
