import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { hatirlananListe, listeyiHatirla } from "../src/lib/liste-hafizasi";

/**
 * ============================================================================
 *  LİSTE HAFIZASI BEKÇİSİ (K104-②, 30.08.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ KULLANICI BULGUSU: süzgeçli bir listeden bir kayda girip dönünce
 *  süzgeç kayboluyor. `/stok`ta bulundu; **ölçüldü ve orada bitmiyordu** —
 *  11 bağlantı daha süzgeçli bir listeye sabit `href` ile dönüyordu, en
 *  pahalısı `/satislar` (13 süzgeç parametresi).
 *
 *  ── ⛔ ÖLÇÜT ELLE TUTULAN LİSTE DEĞİL, TERSTEN KURULUR ──────────────────
 *  "Şu 12 dosyayı düzelttim" demek, **on üçüncü ekran eklendiğinde sessizce
 *  yeşil kalmak** demekti. Bu yüzden bekçi hiçbir dosya/rota listesi
 *  TUTMUYOR; ikisini de KAYNAKTAN türetiyor:
 *
 *    ① SÜZGEÇLİ LİSTE = `searchParams` tipinde `sayfa` DIŞINDA en az bir
 *      parametre okuyan üst düzey sayfa. (Bugün 17 rota.)
 *    ② Bu rotalardan birine dönen her `<GeriBaglanti href="...">` YASAK —
 *      `<ListeyeDon>` kullanılmak ZORUNDA.
 *    ③ Hedef listenin kendisi `<ListeyiHatirla>` çizmek ZORUNDA; yoksa
 *      dönülecek bir adres hiç kaydedilmez ve bağlantı sessizce düz
 *      listeye düşer — yani özellik VARMIŞ GİBİ görünür, çalışmaz.
 *
 *  Yarın bir listeye süzgeç eklendiğinde ①  onu kendiliğinden kapsar ve
 *  ②/③ o listenin bağlantılarını kırmızı yakar. Kimsenin listeye ekleme
 *  yapmayı hatırlaması gerekmez.
 *  _(Anayasa: "bekçi ölçütü elle tutulan liste değil, tersten kurulur".)_
 * ============================================================================
 */

let gecen = 0;
let kalan = 0;

function kontrol(ad: string, sonuc: boolean) {
  if (sonuc) {
    gecen += 1;
    console.log(`  OK    ${ad}`);
  } else {
    kalan += 1;
    console.log(`  HATA  ${ad}`);
  }
}

const BOLUM_SAYISI = 3;
const kosanBolumler: string[] = [];

/** Yol ayırıcısını düzleştirir; ters bölü KARAKTER KODUYLA yazılıyor. */
function duzYol(yol: string): string {
  return yol.split(String.fromCharCode(92)).join("/");
}

/** Yorumları siler — bir yasağı ANLATAN yorum, onu ÇİĞNEMİŞ sayılmaz. */
function yorumsuz(kod: string): string {
  const blok = new RegExp("/" + String.fromCharCode(92) + "*[^]*?" + String.fromCharCode(92) + "*/", "g");
  const satir = new RegExp("//[^" + String.fromCharCode(92) + "n]*", "g");
  return kod.replace(blok, "").replace(satir, "");
}

function dosyalar(kok: string): string[] {
  const cikti: string[] = [];
  for (const girdi of readdirSync(kok, { withFileTypes: true })) {
    const yol = join(kok, girdi.name);
    if (girdi.isDirectory()) cikti.push(...dosyalar(yol));
    else if (girdi.name.endsWith(".tsx")) cikti.push(yol);
  }
  return cikti;
}

console.log("");
console.log("LİSTE HAFIZASI BEKÇİSİ (K104)");

// ═══════════════════════════════════════════════════════════════════════
console.log("");
console.log("§1 SAF GÖVDE — hatırlanan adres güvenli mi");
// ═══════════════════════════════════════════════════════════════════════
{
  /**
   * ⚠ SAF GÖVDE ÇAĞRILARAK SINANIYOR, kaynak taranmıyor. Depolama
   * tarayıcıda; burada yalnız ADRES ÖLÇÜTÜ sınanabiliyor — o da en riskli
   * kısım, çünkü depodan gelen değer bir GEZİNME HEDEFİNE dönüşüyor.
   */
  /**
   * ORNEK VERI ILK YAZIMDA KORDU — VE MUTASYON BUNU SOYLEDI.
   * `startsWith(temel)` kapisini kaldiran mutasyon YESIL gecti: listedeki
   * degerlerin HEPSI temelden UZUNDU ve `kalan` olcutu onlari zaten
   * eliyordu. Ayirt edici deger temelden KISA bir adres — orada `kalan`
   * bos cikar ve tek kapi `startsWith` olur. Olculdu: `/satisla` · `/sat`
   * · `/x` ucu de mutantta GECIYORDU.
   * (Anayasa: "ornek veri ayrimin IKI YAKASINI gostermeli".)
   */
  const yokOlmali = [
    ["//kotu-site.com", "protokolsüz mutlak adres"],
    ["https://kotu-site.com", "tam mutlak adres"],
    ["/satislar-baska", "önek benzer ama BAŞKA rota"],
    ["/satislarx?a=1", "önek benzer ama BAŞKA rota (sorgulu)"],
    ["/satisla", "temelden KISA adres (kalan boş çıkar — ayırt edici)"],
    ["/x", "bambaşka ve kısa rota"],
    ["", "boş değer"],
  ] as const;
  for (const [deger, aciklama] of yokOlmali) {
    /**
     * Depoya elle kötü bir değer yazılmış gibi davranıyoruz: `hatirlananListe`
     * onu ELEMEK zorunda. Tarayıcı yok, o yüzden gövdeyi doğrudan sınamak
     * için `globalThis.window` taklit ediliyor.
     */
    const sahte: Record<string, string> = { ["selliora:liste:/satislar"]: deger };
    (globalThis as unknown as { window: unknown }).window = {
      sessionStorage: {
        getItem: (k: string) => sahte[k] ?? null,
        setItem: (k: string, v: string) => {
          sahte[k] = v;
        },
      },
    };
    kontrol(`reddediliyor: ${aciklama}`, hatirlananListe("/satislar") === null);
  }

  const sahte: Record<string, string> = {};
  (globalThis as unknown as { window: unknown }).window = {
    sessionStorage: {
      getItem: (k: string) => sahte[k] ?? null,
      setItem: (k: string, v: string) => {
        sahte[k] = v;
      },
    },
  };
  listeyiHatirla("/satislar", "/satislar?kanal=TY&sayfa=2");
  kontrol(
    "geçerli süzgeçli adres hatırlanıyor",
    hatirlananListe("/satislar") === "/satislar?kanal=TY&sayfa=2",
  );
  listeyiHatirla("/satislar", "/baska-yer?x=1");
  kontrol(
    "  ...ve BAŞKA rotanın adresi hiç yazılmıyor",
    hatirlananListe("/satislar") === "/satislar?kanal=TY&sayfa=2",
  );

  /**
   * ⛔ DEPOLAMA ÇÖKERSE ÖZELLİK DÜŞER, EKRAN DÜŞMEZ. Gizli sekmede ya da
   * site verisi engelliyken `sessionStorage` erişimi HATA FIRLATIR; gövde
   * bunu yutup `null` dönmeli, yoksa detay sayfası komple çizilemez.
   */
  (globalThis as unknown as { window: unknown }).window = {
    get sessionStorage(): never {
      throw new Error("depolama engelli");
    },
  };
  let coktu = false;
  try {
    listeyiHatirla("/satislar", "/satislar?a=1");
    coktu = hatirlananListe("/satislar") !== null;
  } catch {
    coktu = true;
  }
  kontrol("depolama engelliyken ÇÖKMÜYOR (düz listeye düşer)", !coktu);
  /**
   * SUNUCU GORUNTUSU DUZ `href` OLMAK ZORUNDA.
   * `useSyncExternalStore`un ucuncu parametresi sunucuda kullaniliyor ve
   * orada `sessionStorage` YOKTUR. Hatirlanan adresi dondurmeye kalkarsa
   * ya coker ya da sunucu/istemci ayrisir (hidrasyon uyusmazligi).
   * Bu davranis saf govdeye tasinamiyor — kaynak taraniyor, ama YORUMSUZ
   * kodda ve cagri blogunda.
   */
  const bilesen = yorumsuz(
    readFileSync("src/components/liste-hafizasi-bilesenleri.tsx", "utf8"),
  );
  const cagri = /useSyncExternalStore\(([^;]*?)\);/s.exec(bilesen)?.[1] ?? "";
  kontrol("useSyncExternalStore çağrısı bulundu", cagri.length > 0);
  kontrol(
    "sunucu görüntüsü DÜZ href (hidrasyon uyuşmazlığı yok)",
    /\(\)\s*=>\s*href,?\s*$/.test(cagri.trim()),
  );
  /**
   * VE EFEKT ICINDE setState YOK: lint kurali bunu zaten yakaliyor ama
   * kural bir gun gevsetilirse basamakli render sessizce geri gelir.
   */
  kontrol(
    "hedef efekt içinde setState ile atanmıyor",
    !/setHedef/.test(bilesen),
  );
  kosanBolumler.push("saf gövde");
}

// ═══════════════════════════════════════════════════════════════════════
console.log("");
console.log("§2 SÜZGEÇLİ ROTALAR — kaynaktan TÜRETİLİYOR, liste tutulmuyor");
// ═══════════════════════════════════════════════════════════════════════

/** Rota → süzgeç parametreleri (yalnız üst düzey, `[param]` içermeyen). */
const suzgecliRotalar = new Map<string, string[]>();
{
  const kok = "src/app";
  for (const yol of dosyalar(kok)) {
    const duz = duzYol(yol);
    if (!duz.endsWith("/page.tsx")) continue;
    const rota =
      duz === `${kok}/page.tsx`
        ? "/"
        : "/" + duz.slice(kok.length + 1, -"/page.tsx".length);
    if (rota.includes("[")) continue;
    const kaynak = readFileSync(yol, "utf8");
    const m = /searchParams:\s*Promise<\{([^}]*)\}>/s.exec(kaynak);
    if (!m) continue;
    const adlar = [...m[1].matchAll(/(\w+)\?:/g)].map((x) => x[1]);
    const suzgecler = adlar.filter((a) => a !== "sayfa");
    if (suzgecler.length > 0) suzgecliRotalar.set(rota, suzgecler);
  }

  console.log(`  ${suzgecliRotalar.size} süzgeçli rota türetildi`);
  /**
   * ⚠ TÜRETMENİN KENDİSİ DE ÖLÇÜLÜR: hiç rota bulunamazsa bekçi "temiz"
   * değil BOZUK demektir ve aşağıdaki iki bölüm boş kümede yeşil yanardı.
   * _(Anayasa: "boş sonuç ile temiz sonucu ayırt edemeyen denetim, denetim
   * değildir".)_
   */
  kontrol("türetme çalıştı (rota bulundu)", suzgecliRotalar.size >= 10);
  kontrol(
    "  ...ve bilinen ağır listeler kapsamda",
    ["/satislar", "/stok", "/urunler", "/alimlar"].every((r) =>
      suzgecliRotalar.has(r),
    ),
  );
  kosanBolumler.push("türetme");
}

// ═══════════════════════════════════════════════════════════════════════
console.log("");
console.log("§3 DESEN YASAĞI — süzgeçli listeye sabit href ile dönülemez");
// ═══════════════════════════════════════════════════════════════════════
{
  const ihlaller: string[] = [];
  const donenRotalar = new Set<string>();
  let taranan = 0;

  for (const yol of dosyalar("src")) {
    const kaynak = yorumsuz(readFileSync(yol, "utf8"));
    taranan += 1;
    /** ⛔ YASAK: süzgeçli bir rotaya SABİT `GeriBaglanti`. */
    for (const m of kaynak.matchAll(/<GeriBaglanti\s+href="([^"]+)"/g)) {
      if (suzgecliRotalar.has(m[1])) {
        ihlaller.push(`${duzYol(yol)} → <GeriBaglanti href="${m[1]}">`);
      }
    }
    /** İzin verilen biçim — hedef rotalar toplanıyor. */
    for (const m of kaynak.matchAll(/<ListeyeDon\s+href="([^"]+)"/g)) {
      donenRotalar.add(m[1]);
    }
  }

  kontrol(`tarama gerçekten dosya buldu (${taranan})`, taranan > 100);
  kontrol(
    `süzgeçli listeye SABİT dönüş YOK (${ihlaller.length} ihlal)`,
    ihlaller.length === 0,
  );
  for (const i of ihlaller) console.log("        ⛔ " + i);

  /**
   * ⛔ VE DÖNÜLEN HER LİSTE KAYDEDİCİYİ ÇİZMEK ZORUNDA. Yoksa hatırlanacak
   * bir adres hiç yazılmaz: bağlantı sessizce düz listeye düşer ve özellik
   * VARMIŞ GİBİ görünüp çalışmaz — en pahalı başarısızlık biçimi.
   */
  const kaydedicisiz: string[] = [];
  for (const rota of donenRotalar) {
    const sayfa =
      rota === "/" ? "src/app/page.tsx" : `src/app${rota}/page.tsx`;
    let kaynak = "";
    try {
      kaynak = yorumsuz(readFileSync(sayfa, "utf8"));
    } catch {
      kaydedicisiz.push(`${rota} → sayfa okunamadı (${sayfa})`);
      continue;
    }
    const desen = new RegExp('<ListeyiHatirla\\s+temel="' + rota + '"');
    if (!desen.test(kaynak)) kaydedicisiz.push(`${rota} → ${sayfa}`);
  }
  kontrol(
    `dönülen her liste kaydediciyi çiziyor (${donenRotalar.size} rota)`,
    kaydedicisiz.length === 0,
  );
  for (const k of kaydedicisiz) console.log("        ⛔ " + k);
  /** ⚠ Hiç dönüş bulunamazsa yukarıdaki ölçüt boş kümede yeşil yanardı. */
  kontrol("en az bir ListeyeDon kullanımı var", donenRotalar.size >= 5);
  kosanBolumler.push("desen yasağı");
}

// ═══════════════════════════════════════════════════════════════════════
console.log("");
console.log("=".repeat(70));
if (kosanBolumler.length !== BOLUM_SAYISI) {
  console.log(
    `KOŞUM YARIM KALDI — ${kosanBolumler.length}/${BOLUM_SAYISI} bölüm. SONUÇ GEÇERSİZ.`,
  );
  process.exit(1);
}
if (kalan === 0) {
  console.log(`TÜM KONTROLLER GEÇTİ (${gecen} ölçüt · ${BOLUM_SAYISI} bölüm)`);
} else {
  console.log(`${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrolden)`);
  process.exit(1);
}
console.log("");
