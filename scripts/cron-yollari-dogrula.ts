import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

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
    readFileSync(yol, "utf8"),
  ),
);
kontrol(
  "CRON_SECRET kullanan rota bulundu (taban DOLU)",
  cronSecretKullananlar.length >= 3,
  cronSecretKullananlar.map(urlYolu),
);

console.log("\n2) HER BİRİ ACIK_YOLLAR'DA MI");
const proxyMetni = readFileSync("src/proxy.ts", "utf8");
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

console.log("\n" + "=".repeat(70));
if (basarisiz === 0) console.log(`TÜM KONTROLLER GEÇTİ (${calisan})`);
else {
  console.log(`${basarisiz} KONTROL BAŞARISIZ (${calisan} kontrolden)`);
  process.exitCode = 1;
}
console.log("");
