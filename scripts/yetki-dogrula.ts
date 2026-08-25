/**
 * ============================================================================
 *  YETKİ DOĞRULAMA
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run yetki:dogrula
 *
 *  DÖRT BÖLÜM:
 *  1) KORUMASIZ ACTION BEKÇİSİ — her server action'ın ilk işi yetki
 *     sormak mı? Bu bölüm paketin en önemli parçası: 58 action var ve
 *     BİRİ unutulursa o kapı herkese açık kalır. Menü gizlemek yetki
 *     değildir; unutulan bir action sessizce çalışır.
 *  2) KORUMASIZ SAYFA BEKÇİSİ — aynı şey sayfalar için (2b: API uçları,
 *     2c: net kâr sızıntısı).
 *  3) İZİN LİSTESİ TUTARLILIĞI — kodda tanımlı ama hiçbir yerde
 *     kullanılmayan izin var mı; koruma satırında tanınmayan anahtar
 *     kullanılmış mı.
 *  4) YETKİ BEKÇİSİ — tam yetkili rol (adı ne olursa olsun) eksik izinle
 *     kalırsa yakalanıyor mu? Bekçi canlıda veritabanına bakar; burada
 *     SAHTE rol okuyucusuyla sınanır.
 *
 *  Veritabanına GİTMEZ: kaynak ağacını tarar, geri kalanı saf hesaptır.
 * ============================================================================
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import {
  FIRMA_IZINLERI,
  IZINLER,
  OPERASYON_IZINLERI,
  SAGLAYICI_IZINLERI,
  TUM_IZINLER,
  izinTaninirMi,
  otomatikDagitilacak,
} from "../src/lib/yetki/izinler";
import { yetkiBekcisi } from "./yetki-bekci";

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

/** Kaynak ağacındaki tüm .ts/.tsx dosyaları. */
function dosyalar(kok: string): string[] {
  const sonuc: string[] = [];
  for (const ad of readdirSync(kok)) {
    const yol = join(kok, ad);
    if (statSync(yol).isDirectory()) {
      if (ad === "generated" || ad === "node_modules") continue;
      sonuc.push(...dosyalar(yol));
    } else if (/\.tsx?$/.test(ad)) {
      sonuc.push(yol);
    }
  }
  return sonuc;
}

const KAYNAKLAR = dosyalar("src");

/**
 * YETKİ İSTEMEYEN ACTION'LAR — gerekçesi olan istisnalar.
 * Listeye ekleme yapmadan önce iki kez düşün: her istisna bir kapıdır.
 */
const ACTION_ISTISNALARI = new Map<string, string>([
  ["girisYap", "giriş yapmamış kullanıcı çağırır — yetki isteyemez"],
  ["cikisYap", "çıkış her zaman serbest olmalı"],
  [
    "parolamiDegistir",
    "kendi parolasını değiştiriyor; izin şartı koysak ilk girişte parola değiştirmek ZORUNDA olan kullanıcı bunu yapamazdı — hedef oturumdan gelir, formdan değil",
  ],
  [
    "uyarilariGetir",
    "tek bir izne bağlanamaz: çan BEŞ ayrı uyarı taşıyor ve her birinin kendi izni var. Süzme uyarilariTopla içinde, SUNUCUDA, sayımdan ÖNCE yapılıyor (izneGoreSuz) — istemciye göremeyeceği uyarı hiç gönderilmiyor. Buraya yetkiIste koymak, izni OLMAYAN kullanıcının çanı hiç görememesi demek olurdu; oysa operasyonel uyarıyı (maliyetsiz stok) görmeli.",
  ],
]);

// ===========================================================================
console.log("\n1) KORUMASIZ ACTION BEKÇİSİ");
// ===========================================================================
{
  const korumasiz: string[] = [];
  const korumali: string[] = [];
  const istisna: string[] = [];

  for (const yol of KAYNAKLAR) {
    const icerik = readFileSync(yol, "utf8");
    /**
     * ⚠ DİREKTİF YORUMDA DEĞİL, KODDA ARANIR — 23.08.2026'da yakalandı.
     *
     * Kontrol dosyanın TAMAMINDA `"use server"` dizesini arıyordu. Bir
     * dosyanın AÇIKLAMASINDA bu direktiften söz etmek (ör. _"`"use server"`
     * dosyaları yalnız async fonksiyon dışa aktarabilir"_) onu action
     * modülü sanmaya yetiyordu; içindeki bütün `export async function`lar
     * birden "korumasız action" diye kırmızı yandı.
     *
     * ÖLÇÜLDÜ: 38 dosyada direktif dosya başında (gerçek action modülü),
     * 0 dosyada satır içi, 3 dosyada YALNIZ YORUMDA. Üçünden ikisi
     * (`varyant-ozet.ts`, `kart-odeme/kategori.ts`) bu düzeltmeden ÖNCE de
     * yanlış eşleşiyordu — içlerinde `export async function` olmadığı için
     * zararsız kalmıştı. Yani kusur yeni değil, GÖRÜNÜR olduğu an yeni.
     *
     * ⚠ SATIR İÇİ KULLANIM DIŞLANMADI: direktif "dosya başında olsun" diye
     * aranmıyor, yorumsuz KODDA aranıyor. Bugün 0 örnek var ama bir bileşen
     * içine gömülü action yazıldığı gün bu kontrol onu yine görür.
     * (Anayasa: _"kaynak tarayan kontrol, deseni dosyada değil KULLANIM
     * bloğunda arar"_.)
     */
    const kod = icerik
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/(^|[^:])\/\/.*/g, "$1");
    if (!kod.includes('"use server"') && !kod.includes("'use server'")) continue;

    // Her export edilen async fonksiyon bir action'dır.
    const desen = /export async function (\w+)\s*\([\s\S]*?\)\s*:?[\s\S]*?\{/g;
    let eslesme: RegExpExecArray | null;

    while ((eslesme = desen.exec(icerik)) !== null) {
      const ad = eslesme[1];
      // Gövde: fonksiyon açılışından sonraki 900 karakter — koruma satırı
      // ilk işlerden biri olmalı, dibe gizlenmiş bir kontrol koruma değildir.
      const govde = icerik.slice(eslesme.index, eslesme.index + 900);

      if (ACTION_ISTISNALARI.has(ad)) {
        istisna.push(ad);
        continue;
      }
      if (/yetkiIste\(|yetkiBaglami\(|izinVarMi\(/.test(govde)) {
        korumali.push(ad);
      } else {
        korumasiz.push(`${ad}  (${yol.replace(/\\/g, "/")})`);
      }
    }
  }

  console.log(
    `        ${korumali.length} korumalı · ${istisna.length} istisna · ${korumasiz.length} KORUMASIZ`,
  );
  kontrol(
    "her server action yetki istiyor",
    korumasiz.length === 0,
    korumasiz.length ? korumasiz.join("\n         ") : undefined,
  );

  for (const [ad, sebep] of ACTION_ISTISNALARI) {
    kontrol(`  istisna gerekçeli: ${ad}`, sebep.length > 10);
  }
}

// ===========================================================================
console.log("\n2) KORUMASIZ SAYFA BEKÇİSİ");
// ===========================================================================
/** Yetki istemeyen sayfalar — gerekçeli. */
const SAYFA_ISTISNALARI = new Map<string, string>([
  ["src/app/giris/page.tsx", "giriş ekranı"],
  ["src/app/page.tsx", "panel — girişi olan herkes görür"],
  [
    "src/app/parola-degistir/page.tsx",
    "ilk girişte parola değiştirme — yetkisi henüz çözülemeyen kullanıcı da açabilmeli",
  ],
  /**
   * ⚠ ÇEVRİMDIŞI SAYFASI BİLEREK KORUMASIZ — VE HİÇBİR VERİ TAŞIMAZ.
   *
   * Servis çalışanı bunu kuruluşta ÇEREZSİZ olarak önbelleğe alıyor
   * (`public/sw.js`); korumalı olsaydı yedek hiç oluşmaz ve telefon ağ
   * kopunca tarayıcının kendi hata sayfasını gösterirdi.
   *
   * İstisna güvenli çünkü sayfa veritabanına HİÇ gitmiyor: içinde bir
   * başlık, bir açıklama ve ana sayfaya bir bağlantı var. Yetki
   * sorulacak bir şey yok. (Bkz. `scripts/pwa-dogrula.ts` — sayfanın veri
   * taşımadığı ve JavaScript istemediği orada ayrıca sınanıyor.)
   */
  ["src/app/cevrimdisi/page.tsx", "çevrimdışı yedeği — veri taşımaz, çerezsiz önbelleğe alınır"],
]);
{
  const korumasiz: string[] = [];
  let korumali = 0;

  for (const yol of KAYNAKLAR) {
    if (!/[\\/]page\.tsx$/.test(yol)) continue;
    const anahtar = yol.replace(/\\/g, "/");
    if (SAYFA_ISTISNALARI.has(anahtar)) continue;

    const icerik = readFileSync(yol, "utf8");
    if (/yetkiIste\(|yetkiBaglami\(|izinVarMi\(|sayfaIzni\(/.test(icerik)) {
      korumali++;
    } else {
      korumasiz.push(anahtar);
    }
  }

  console.log(`        ${korumali} korumalı · ${korumasiz.length} KORUMASIZ`);
  kontrol(
    "her sayfa yetki istiyor",
    korumasiz.length === 0,
    korumasiz.length ? korumasiz.join("\n         ") : undefined,
  );
}

// ===========================================================================
console.log("\n2b) KORUMASIZ API UCU BEKÇİSİ");
// ===========================================================================
/**
 * 13.08.2026'DA AÇILDI — ve açılır açılmaz 9 korumasız uç buldu.
 *
 * Bekçinin İLK hâli yalnız sayfa ve action tarıyordu; 10 API ucunun
 * hiçbirinde yetki kontrolü YOKTU. Girişi olan herkes `/api/yedek` ile tüm
 * veritabanını indirebiliyor, `/api/geri-yukle/uygula` ile silebiliyordu.
 *
 * DERS: bekçinin kendisi de eksik olabilir. Kapsamı, korunacak yüzeyin
 * TAMAMINI saymalı — sayfa + action + API. Kör noktası olan bir bekçi,
 * olmayan bir bekçiden daha tehlikelidir: yeşil yanar ve güven verir.
 */
const API_ISTISNALARI = new Map<string, string>([
  [
    "src/app/api/yedek/otomatik/route.ts",
    "Vercel Cron çağırır; kendi CRON_SECRET koruması var, tarayıcı oturumu taşıyamaz",
  ],
  [
    "src/app/api/olcum/route.ts",
    "curl ile çağrılır (yerel makineden canlı veritabanına TCP reddi var: ECONNREFUSED); tarayıcı oturumu taşıyamaz. Kendi CRON_SECRET koruması var ve sır tanımsızsa uç KAPALI döner. SALT OKUMA: `api:dogrula` bu dosyada prisma yazma çağrısını KIRMIZI yakar.",
  ],
]);
{
  const korumasiz: string[] = [];
  let korumali = 0;

  for (const yol of KAYNAKLAR) {
    const anahtar = yol.replace(/\\/g, "/");
    if (!/\/api\/.*route\.ts$/.test(anahtar)) continue;
    if (API_ISTISNALARI.has(anahtar)) continue;

    const icerik = readFileSync(yol, "utf8");
    if (/apiIzni\(|yetkiIste\(|izinVarMi\(/.test(icerik)) korumali++;
    else korumasiz.push(anahtar);
  }

  console.log(`        ${korumali} korumalı · ${korumasiz.length} KORUMASIZ`);
  kontrol(
    "her API ucu yetki istiyor",
    korumasiz.length === 0,
    korumasiz.length ? korumasiz.join("\n         ") : undefined,
  );
  for (const [yol, sebep] of API_ISTISNALARI) {
    kontrol(
      `  istisna gerekçeli: ${yol.split("/").slice(-2).join("/")}`,
      sebep.length > 10,
    );
  }
}

// ===========================================================================
console.log("\n2c) NET KÂR SIZINTI BEKÇİSİ");
// ===========================================================================
/**
 * 13.08.2026'DA KULLANICI YAKALADI: "Operasyon kullanıcısı marjları görmüyor
 * ama panelde toplu görüyor."
 *
 * Satış listesinde NET-2 doğru şekilde gizlenmişti. Panel unutuldu — çünkü
 * panel "herkese açık sayfa" istisnasındaydı ve bekçi sayfanın AÇILDIĞINI
 * denetliyordu, İÇİNDE NE YAZDIĞINI değil. Marj tek tek gizlenip toplamı
 * açıkta bırakılırsa gizleme diye bir şey yoktur.
 *
 * KURAL: NET-1/NET-2 gösteren her sayfa ya `satis.kar.gor` sorar, ya da
 * OPERASYON'un elinde OLMAYAN bir izinle tümüyle kapalıdır (/rapor, /hakedis
 * böyle). İkisi de yoksa sızıntıdır.
 */
{
  const sizintili: string[] = [];
  let temiz = 0;

  for (const yol of KAYNAKLAR) {
    if (!/[\\/]page\.tsx$/.test(yol)) continue;
    const icerik = readFileSync(yol, "utf8");
    if (!/\bnet1|\bnet2|Net1|Net2/.test(icerik)) continue;

    const anahtar = yol.replace(/\\/g, "/");

    // 1. yol: alanı doğrudan izne bağlamış.
    if (icerik.includes("satis.kar.gor")) {
      temiz++;
      continue;
    }

    // 2. yol: sayfanın kapısı zaten OPERASYON'a kapalı.
    const kapi = [...icerik.matchAll(/sayfaIzni\("([^"]+)"\)/g)].map((e) => e[1]);
    const operasyonAcabilir =
      kapi.length === 0 ||
      kapi.some((i) => (OPERASYON_IZINLERI as readonly string[]).includes(i));

    if (operasyonAcabilir) sizintili.push(`${anahtar}  (kapı: ${kapi.join(", ") || "YOK"})`);
    else temiz++;
  }

  console.log(`        ${temiz} temiz · ${sizintili.length} SIZINTILI`);
  kontrol(
    "NET kâr gösteren her sayfa ya izin sorar ya tümüyle kapalı",
    sizintili.length === 0,
    sizintili.length ? sizintili.join("\n         ") : undefined,
  );
}

// ===========================================================================
console.log("\n3) İZİN LİSTESİ TUTARLILIĞI");
// ===========================================================================
{
  kontrol(
    "izin anahtarları tekrarsız",
    new Set(TUM_IZINLER).size === TUM_IZINLER.length,
    `${TUM_IZINLER.length} izin, ${new Set(TUM_IZINLER).size} benzersiz`,
  );

  kontrol(
    "OPERASYON izinlerinin hepsi tanınıyor",
    OPERASYON_IZINLERI.every((i) => izinTaninirMi(i)),
    OPERASYON_IZINLERI.filter((i) => !izinTaninirMi(i)).join(", "),
  );

  // OPERASYON marj göremez — kararın kendisi.
  const yasak = ["satis.kar.gor", "rapor.gor", "hakedis.gor", "kart.gor", "envanter.gor"];
  const sizinti = yasak.filter((i) => (OPERASYON_IZINLERI as readonly string[]).includes(i));
  kontrol(
    "OPERASYON'da marj/para izni YOK",
    sizinti.length === 0,
    sizinti.length ? `SIZINTI: ${sizinti.join(", ")}` : undefined,
  );

  // Kodda geçen her yetkiIste("x") anahtarı tanınıyor mu?
  const kullanilan = new Set<string>();
  for (const yol of KAYNAKLAR) {
    const icerik = readFileSync(yol, "utf8");
    for (const e of icerik.matchAll(/yetkiIste\("([^"]+)"\)/g)) kullanilan.add(e[1]);
    for (const e of icerik.matchAll(/izinVarMi\("([^"]+)"\)/g)) kullanilan.add(e[1]);
    for (const e of icerik.matchAll(/sayfaIzni\("([^"]+)"\)/g)) kullanilan.add(e[1]);
  }
  const taninmayan = [...kullanilan].filter((k) => !izinTaninirMi(k));
  kontrol(
    "kodda tanınmayan izin anahtarı kullanılmamış",
    taninmayan.length === 0,
    taninmayan.join(", "),
  );

  // Tanımlı ama hiç kullanılmayan izin: ölü izin, yanlış güven verir.
  // BEKLEYEN İZİNLER ayrı: ekranı henüz yazılmamış izinler burada durur ve
  // listeden düşmek İŞİN BİTTİĞİ anlamına gelir. Gerekçesiz bırakılmaz.
  // 13.08.2026: kullanici.yonet ve rol.yonet ekranları yazıldı, listeden
  // düştüler. Liste boş olması İYİdir — bekleyen izin kalmadı demektir.
  // 13.08.2026: iade.gor listeden DÜŞTÜ — /iadeler ekranı yazıldı.
  const BEKLEYEN = new Map<string, string>([]);
  for (const [izin, sebep] of BEKLEYEN) {
    kontrol(`  bekleyen izin gerekçeli: ${izin}`, sebep.length > 10, sebep);
  }
  const kullanilmayan = TUM_IZINLER.filter(
    (i) => !kullanilan.has(i) && !BEKLEYEN.has(i),
  );
  kontrol(
    "tanımlı her izin en az bir yerde kullanılıyor",
    kullanilmayan.length === 0,
    kullanilmayan.length ? `kullanılmayan: ${kullanilmayan.join(", ")}` : undefined,
  );

  kontrol(
    "her iznin grubu var",
    IZINLER.every((i) => ["operasyon", "para", "ayar", "yonetim"].includes(i.grup)),
  );
}

// ===========================================================================
console.log("\n4) YETKİ BEKÇİSİ — tam yetkili rol eksik izinle kalır mı?");
// ===========================================================================
// Üst düzey `await` tsx'in cjs kipinde desteklenmiyor (ölçüldü); bu yüzden
// bölüm bir async sarmalayıcı içinde koşuyor. Sonuç özeti bu bloktan SONRA
// yazıldığı için `await` ile bekleniyor.
async function bekciBolumu() {
  /**
   * Bekçi canlıda veritabanına bakar; burada SAHTE ROL OKUYUCUSUYLA sınanıyor,
   * yani bu bölüm de veritabanısız kalıyor.
   *
   * Sınanan asıl şey mimar kuralı (13.08.2026): "deploy öncesi tüm izinlere
   * sahip rol, deploy sonrası da tüm izinlere sahip olur — ölçüt izin kümesi,
   * isim etiket." Bekçi bunu ADA BAKMADAN ölçmeli.
   */
  const okuyucu = (roller: { name: string; izinler: string[] }[]) => ({
    role: {
      findMany: async () =>
        roller.map((r) => ({
          name: r.name,
          izinler: r.izinler.map((permissionKey) => ({ permissionKey })),
        })),
    },
  });

  const hepsi = [...TUM_IZINLER];

  // 1) Tam yetkili rol, adı "Sahip" olmasa da temiz geçmeli.
  const temiz = await yetkiBekcisi(
    okuyucu([
      { name: "CEO", izinler: hepsi },
      { name: "Operasyon", izinler: [...OPERASYON_IZINLERI] },
    ]),
  );
  kontrol("tam yetkili 'CEO' + kısıtlı 'Operasyon' -> sorun yok", temiz.sorunSayisi === 0, temiz.satirlar);
  kontrol(
    "kısıtlı rol 'kısıtlı (beklenen)' diye sınıflanır",
    temiz.satirlar.find((s) => s.rol === "Operasyon")?.aciklama === "kısıtlı (beklenen)",
  );

  /**
   * 2) ASIL VAKA — 13.08.2026'da canlıda yaşanan hata.
   * "CEO" tek bir izinden yoksun: bekçi bunu YAKALAMALI. Senkron bu durumu
   * SONRADAN_DOGAN listesi eksikse sessizce atlıyor; bekçinin varlık sebebi
   * tam olarak bu.
   */
  const eksikBir = await yetkiBekcisi(
    okuyucu([{ name: "CEO", izinler: hepsi.filter((i) => i !== "iade.gor") }]),
  );
  kontrol("tam yetkiliye yakın rolde 1 eksik izin YAKALANIR", eksikBir.sorunSayisi === 1, eksikBir.satirlar);
  kontrol(
    "eksik iznin adı raporlanır",
    eksikBir.satirlar[0]?.eksikler.join(",") === "iade.gor",
    eksikBir.satirlar[0]?.eksikler,
  );

  // 3) Gerçekten kısıtlı bir rol (eşiğin altında) alarm ÜRETMEZ.
  const azYetkili = await yetkiBekcisi(
    okuyucu([{ name: "Depocu", izinler: hepsi.slice(0, 5) }]),
  );
  kontrol("az yetkili yeni rol alarm üretmez", azYetkili.sorunSayisi === 0, azYetkili.satirlar);

  // 4) Rol hiç izinsizse de alarm üretmez — yeni açılmış boş rol olabilir.
  const bosRol = await yetkiBekcisi(okuyucu([{ name: "Yeni", izinler: [] }]));
  kontrol("izinsiz rol alarm üretmez", bosRol.sorunSayisi === 0);

  // 5) Hiç rol yoksa bekçi patlamaz.
  const rolsuz = await yetkiBekcisi(okuyucu([]));
  kontrol("rol yokken bekçi çalışır", rolsuz.sorunSayisi === 0 && rolsuz.satirlar.length === 0);
}

/**
 * ÖZET BEKÇİ BÖLÜMÜNDEN SONRA YAZILIR. Sıralama önemli: async bölüm
 * beklenmezse özet "hepsi geçti" der ve o bölümün kontrolleri hiç sayılmaz —
 * yeşil yanan ama bir şeyi ölçmeyen bir doğrulayıcı, olmayandan tehlikelidir.
 */
bekciBolumu().then(() => {

// ===========================================================================
console.log("\n6) SAĞLAYICI İZNİ — OTOMATİK DAĞITILMAZ");
// ===========================================================================
console.log("\nDÜZELTME VE İPTAL — AYRI İZİNLER");
// ===========================================================================
{
  /**
   * ⚠ HAFİF YETKİ DİLİMİ 18.08.2026. `satis.yaz` "yeni satış kaydet"
   * demektir ve depo işidir. Düzeltme ve iptal ise YAZILMIŞ kaydı geriye
   * dönük değiştirir: NET yeniden hesaplanır, adet değişince stok defteri
   * hareket alır, iptalde mal stoğa döner.
   *
   * Ayrımın bütün değeri Operasyon'un bunlara SAHİP OLMAMASINDA. O yüzden
   * "izin var mı" kadar "yanlış role verilmemiş mi" de sınanıyor.
   */
  const anahtarlar = TUM_IZINLER as readonly string[];
  kontrol("satis.duzenle izni TANIMLI", anahtarlar.includes("satis.duzenle"));
  kontrol("satis.iptal izni TANIMLI", anahtarlar.includes("satis.iptal"));

  const operasyon = OPERASYON_IZINLERI as readonly string[];
  kontrol(
    "Operasyon satis.duzenle ALMAZ",
    !operasyon.includes("satis.duzenle"),
  );
  kontrol("Operasyon satis.iptal ALMAZ", !operasyon.includes("satis.iptal"));
  /** Ayrım anlamlı olsun diye: satış GİRMEYE devam ediyor. */
  kontrol("Operasyon satis.yaz'ı KORUR", operasyon.includes("satis.yaz"));

  /**
   * ⚠ YETKİ İKİ BACAKLIDIR. Anahtar koda girip `SONRADAN_DOGAN`a
   * yazılmazsa, tam yetkili rol o izni HİÇ görmez ve ekran canlıda
   * SESSİZCE kaybolur (13.08.2026 `/iadeler` vakası).
   */
  const seed = readFileSync("prisma/seed-yetki.ts", "utf8");
  const dogan = seed.slice(
    seed.indexOf("const SONRADAN_DOGAN"),
    seed.indexOf("const dagitilacak"),
  );
  kontrol('SONRADAN_DOGAN "satis.duzenle" içeriyor', dogan.includes('"satis.duzenle"'));
  kontrol('SONRADAN_DOGAN "satis.iptal" içeriyor', dogan.includes('"satis.iptal"'));

  /**
   * EYLEMLER DOĞRU İZNİ İSTİYOR MU — kaynak taranır.
   * Değer testi göremez: `yetkiIste` her iki anahtarla da çalışır, sadece
   * YANLIŞ olanı sorar. Sorulan anahtarın kendisi sınanmalı.
   */
  const duzenle = readFileSync("src/app/satislar/[id]/duzenle-actions.ts", "utf8");
  kontrol('duzenle-actions "satis.duzenle" ister', duzenle.includes('yetkiIste("satis.duzenle")'));
  kontrol("  ...ve satis.yaz'a DAYANMAZ", !duzenle.includes('yetkiIste("satis.yaz")'));

  const iptal = readFileSync("src/app/satislar/[id]/iptal-actions.ts", "utf8");
  kontrol('iptal-actions "satis.iptal" ister', iptal.includes('yetkiIste("satis.iptal")'));
  kontrol("  ...ve satis.yaz'a DAYANMAZ", !iptal.includes('yetkiIste("satis.yaz")'));

  /**
   * GERİ ALMA AYNI İZNE BAĞLI — ayrı izin AÇILMADI. İptal edebilen geri de
   * alabilmeli; ayrılsaydı kendi hatasını düzeltemeyen bir rol doğardı ve
   * iş yine sahibe düşerdi (17.08.2026'da tam olarak bu yaşandı).
   */
  const gerial = readFileSync("src/app/satislar/[id]/geri-al-actions.ts", "utf8");
  kontrol('geri-al-actions "satis.iptal" ister', gerial.includes('yetkiIste("satis.iptal")'));
  kontrol(
    "  ...geri alma için AYRI izin açılmadı",
    !anahtarlar.some((a) => a.includes("gerial") || a.includes("geri")),
  );

  /**
   * EKRAN DA SÜZÜYOR MU — yapamayacağı eylemi göstermek, kullanıcıyı
   * boşuna deneten tasarımdır (İlke #5: sessiz başarısızlık yasak).
   */
  const ekran = readFileSync("src/app/satislar/[id]/page.tsx", "utf8");
  kontrol('ekran "satis.duzenle" izni okuyor', ekran.includes('izinVarMi("satis.duzenle")'));
  kontrol('ekran "satis.iptal" izni okuyor', ekran.includes('izinVarMi("satis.iptal")'));
  kontrol(
    "düzenleme formu izne bağlı çiziliyor",
    /duzenleyebilir \?[\s\S]{0,80}?<DuzenleFormu|duzenleyebilir\s*\?\s*\(?\s*\n?\s*<DuzenleFormu|&& duzenleyebilir/.test(ekran),
  );
  kontrol(
    "iptal formu izne bağlı çiziliyor",
    /iptalEdebilir \?[\s\S]{0,200}?<IptalFormu/.test(ekran),
  );
  kontrol(
    "geri alma formu izne bağlı çiziliyor",
    /iptalEdebilir \?[\s\S]{0,120}?<GeriAlFormu/.test(ekran),
  );
}

// ===========================================================================
{
  /**
   * ════════════════════════════════════════════════════════════════════
   *  SİGORTA: SAĞLAYICI İZNİ FİRMA ROLLERİNE YAĞDIRILMAZ (karar 16.08.2026)
   * --------------------------------------------------------------------
   *  TEŞHİS: sistemde "sağlayıcı" diye bir kavram YOK. Roller global
   *  (`Role`de `companyId` yok), 40 modelin yalnız 3'ünde `companyId` var.
   *  Yani "bütün firmaları gör" yetkisi bir FİRMA rolünde duruyor.
   *
   *  Tam ayrım BUGÜN KURULMADI — kurulsaydı yalnız taleplerde izolasyon
   *  olurdu, ürün/satış/kâr açık kalırdı; KISMİ İZOLASYON İZOLASYON
   *  DEĞİLDİR. Ayrım çok-firma veri katmanının ilk maddesi.
   *
   *  BUGÜNKÜ SİGORTA: `SONRADAN_DOGAN` mekanizması sağlayıcı izinlerini
   *  hiçbir role otomatik dağıtmaz. Mevcut roller korunur (elle verildi),
   *  ama yarın açılacak tam yetkili bir rol — ikinci firmanın sahibi
   *  dahil — bunları KENDİLİĞİNDEN ALMAZ.
   * ════════════════════════════════════════════════════════════════════
   */
  kontrol(
    "destek.yonet SAĞLAYICI izni olarak işaretli",
    (SAGLAYICI_IZINLERI as readonly string[]).includes("destek.yonet"),
  );
  kontrol(
    "  ...firma izinleri kümesinde YOK",
    !(FIRMA_IZINLERI as readonly string[]).includes("destek.yonet"),
  );
  kontrol(
    "  ...ama TÜM izinler listesinde var (yok sayılmıyor)",
    (TUM_IZINLER as readonly string[]).includes("destek.yonet"),
  );
  kontrol(
    "firma + sağlayıcı = tüm izinler (hiçbiri kaybolmuyor)",
    FIRMA_IZINLERI.length + SAGLAYICI_IZINLERI.length === TUM_IZINLER.length,
    `${FIRMA_IZINLERI.length} + ${SAGLAYICI_IZINLERI.length} = ${TUM_IZINLER.length}`,
  );

  /**
   * ASIL KİLİT: dağıtım listesinden ELENİYOR mu.
   *
   * Girdi bilerek SABİT yazıldı, `SAGLAYICI_IZINLERI`den TÜRETİLMEDİ:
   * türetilseydi işareti kaldıran bir mutasyon test verisini de değiştirir
   * ve test yeşil kalırdı. (İlk denemede tam bu oldu — kusurlu mutasyon.)
   */
  kontrol(
    "sonradan doğan listede olsa BİLE dağıtılmıyor",
    !otomatikDagitilacak(["iade.gor", "destek.yonet"]).includes("destek.yonet"),
  );
  kontrol(
    "  ...firma izni olan diğerleri NORMAL dağıtılıyor",
    otomatikDagitilacak(["iade.gor", "destek.yonet"]).includes("iade.gor"),
  );
  kontrol(
    "  ...yalnız sağlayıcı izni varsa dağıtılacak hiçbir şey kalmıyor",
    otomatikDagitilacak(["destek.yonet"]).length === 0,
  );
  kontrol(
    "boş liste boş döner",
    otomatikDagitilacak([]).length === 0,
  );

  /**
   * BEKÇİ AYNI ÖLÇÜTÜ KULLANMALI. İki yerde iki farklı ölçüt olsaydı seed
   * izni dağıtmaz, bekçi eksik sayar ve her tam yetkili rol kırmızı
   * yanardı — bekçi bir süre sonra görmezden gelinen bir alarma dönerdi.
   */
  const bekci = readFileSync("scripts/yetki-bekci.ts", "utf8");
  kontrol(
    "bekçi ölçütü FİRMA izinleri (sağlayıcıyı eksik saymıyor)",
    bekci.includes("FIRMA_IZINLERI.filter((i) => !sahipOldugu.has(i))"),
  );
  /**
   * SESSİZ HARİÇ TUTMA YOK: bekçi neyi ölçmediğini YAZAR. Bu satır olmasa
   * altı ay sonra "destek.yonet niye hiç kontrol edilmiyor?" sorusunun
   * cevabı kalmazdı.
   */
  kontrol(
    "  ...ölçüt dışı bıraktığını EKRANDA bildiriyor",
    bekci.includes("ölçüt DIŞI (sağlayıcı düzlemi"),
  );

  const seed = readFileSync("prisma/seed-yetki.ts", "utf8");
  kontrol(
    "seed dağıtımı saf fonksiyondan geçiriyor",
    seed.includes("otomatikDagitilacak(SONRADAN_DOGAN)"),
  );
  kontrol(
    "  ...destek.yonet SONRADAN_DOGAN listesinde DEĞİL",
    /**
     * İLK HÂLİ YALANCI YEŞİLDİ:
     *   !/SONRADAN_DOGAN[\s\S]{0,600}?\]\s*;/.exec(seed)?.[0].includes(...)
     *
     * İsteğe bağlı zincir (`?.`) yüzünden desen HİÇ eşleşmediğinde ifade
     * `undefined` oluyor ve `!undefined === true` — yani kontrol, aradığı
     * bloğu bulamadığında da yeşil yanıyordu. Mutasyon denemesi bunu
     * gösterdi: listeye `destek.yonet` geri konduğu hâlde test susuyordu.
     *
     * Bu, bu oturumdaki ÜÇÜNCÜ yalancı yeşil kalıbı (öncekiler: `indexOf`
     * −1 tuzağı ve biçime bağlı metin kontrolü). Ortak kök: KONTROL,
     * ARADIĞINI BULAMADIĞINDA BAŞARILI SAYILMAMALI.
     */
    (() => {
      const bas = seed.indexOf("const SONRADAN_DOGAN");
      if (bas === -1) return false; // blok yoksa kontrol de geçmez
      const son = seed.indexOf("];", bas);
      if (son === -1) return false;
      return !seed.slice(bas, son).includes('"destek.yonet"');
    })(),
  );
}

  console.log("\n" + "=".repeat(70));
  if (basarisiz === 0) console.log(`TÜM KONTROLLER GEÇTİ (${calisan})`);
  else {
    console.log(`${basarisiz} KONTROL BAŞARISIZ (${calisan} kontrolden)`);
    process.exitCode = 1;
  }
  console.log("");
});
