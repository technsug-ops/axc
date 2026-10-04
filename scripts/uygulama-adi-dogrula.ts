import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { kaynakOku } from "./kaynak-oku";
import { UYGULAMA } from "../src/lib/uygulama";

/**
 * ============================================================================
 *  UYGULAMA ADI KODA GÖMÜLMEZ — DESEN YASAĞI (04.10.2026)
 * ----------------------------------------------------------------------------
 *  Anayasa: "Uygulama adı TEK sabitten okunur — ad değişikliği tek satırlık
 *  iş olmalıdır." Kural yazılıydı ama koşan bir ölçütü yoktu: «Selliora» →
 *  «Bezirga» değişikliğinde ad 30'dan fazla yerde ELLE yazılmış çıktı —
 *  sözlükte 9 metin, el kitabında 8 cümle, çerez, yedek adı ve biçimi,
 *  tarayıcı anahtarları, CSS dosya adları. Yani "tek satır" bir niyetti.
 *
 *  ÖLÇÜT (dosya listesi TUTULMAZ — anayasa "düzeltmenin çaresi desen
 *  yasağıdır"): `src/` (üretilmiş Prisma hariç), `messages/*.json` ve
 *  `public/*.js` içinde, YORUMSUZ kodda, güncel ya da eski adın hiçbiri
 *  geçemez (harf büyüklüğü fark etmez). Adlar `UYGULAMA`dan okunur; bu
 *  bekçi adı kendisi de yazmaz.
 *
 *  İSTİSNALAR — beyanlı ve gerekçeli:
 *  · `src/lib/uygulama.ts` — adın TANIMLANDIĞI yer.
 *  · `public/sw.js` → `const SURUM = "<teknik ad>-sw-N"` satırı: statik dosya
 *    sabiti içe alamaz. O satır yasaktan muaf ama ön ekin GÜNCEL teknik ad
 *    olduğu ayrıca ölçülür (eski adla kalırsa önbellek adı yalan söyler).
 *
 *  ⚠ YORUMLAR SERBEST: geçmişi anlatan yorum ("04.10.2026 öncesi adı
 *  Selliora") bir yasağı çiğnemez. Kullanıcı alıntıları da yorumda yaşar.
 *  ⚠ TABAN DOLULUĞU ayrıca ölçülür: tarama sıfır dosya bulursa döngü hiç
 *  dönmez ve "geçti" denirdi (anayasa: `every` kapısının tarama tarafı).
 * ============================================================================
 */

let calisan = 0;
let basarisiz = 0;
function kontrol(ad: string, kosul: boolean, ayrinti?: unknown) {
  calisan++;
  if (kosul) console.log(`  OK    ${ad}`);
  else {
    basarisiz++;
    console.log(`  HATA  ${ad}`);
    if (ayrinti !== undefined) console.log("        ", ayrinti);
  }
}

/**
 * Yorumları ayıklar — blok, satır başı ve boşluktan sonra gelen `// `.
 * ⚠ SATIR SAYISI KORUNUR (05.10.2026): blok yorumun yerine aynı sayıda satır
 * sonu bırakılır. Önceki hâl yorumu tümden siliyordu ve bildirilen satır
 * numaraları kayıyordu (`oturum-imza.ts:100` dedi, sabit 152. satırdaydı).
 */
function yorumsuzla(metin: string): string {
  return metin
    .replace(/\/\*[\s\S]*?\*\//g, (blok) => blok.replace(/[^\n]/g, ""))
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/\s\/\/\s.*$/gm, "");
}

function tara(kok: string, uzantilar: string[], haric: (yol: string) => boolean): string[] {
  const cikti: string[] = [];
  let girdiler: string[];
  try {
    girdiler = readdirSync(kok);
  } catch {
    return cikti;
  }
  for (const ad of girdiler) {
    const yol = join(kok, ad).replace(/\\/g, "/");
    if (haric(yol)) continue;
    if (statSync(yol).isDirectory()) cikti.push(...tara(yol, uzantilar, haric));
    else if (uzantilar.some((u) => yol.endsWith(u))) cikti.push(yol);
  }
  return cikti;
}

const ADLAR = [UYGULAMA.ad, UYGULAMA.teknikAd, ...UYGULAMA.eskiTeknikAdlar];
const AD_DESENI = new RegExp(
  Array.from(new Set(ADLAR.map((a) => a.toLowerCase()))).join("|"),
  "i",
);
const TANIM = "src/lib/uygulama.ts";

/**
 * BEYANLI İSTİSNALAR — dosya + satır deseni + GEREKÇE. Gerekçesiz istisna
 * yazılamaz; istisnanın dosyası VARSA satırı da bulunmak zorundadır (bayat
 * istisna sessizce yaşamasın). Dosya yoksa (ör. `main`de çok-firma kodu
 * yok) istisna uygulanmaz.
 */
const ISTISNALAR: { dosya: string; satir: RegExp; gerekce: string }[] = [
  {
    dosya: "src/lib/firma-baglari.uretilmis.ts",
    satir: /^export const BAG_KAPISI_DEGISKENI = "[a-z_]+";$/,
    gerekce:
      "veritabanı oturum değişkeni (@..._bag_kapisi_kapali) — tetikleyicilerin " +
      "içinde, migration'la kurulu; kullanıcıya görünmez. Adı değiştirmek " +
      "tetikleyicileri yeniden kuran bir migration ister; K318'de bilerek " +
      "yapılmadı (kullanıcı onayı 05.10.2026, seçenek b).",
  },
];
const SW = "public/sw.js";
const SURUM_SATIRI = /^const SURUM = "([a-z]+)-sw-\d+";$/m;

console.log("\nUYGULAMA ADI KODA GÖMÜLMEZ — desen yasağı\n");

const kodDosyalari = tara("src", [".ts", ".tsx", ".css", ".js"], (y) =>
  y.startsWith("src/generated"),
);
const sozlukler = tara("messages", [".json"], () => false);
const statikler = tara("public", [".js"], () => false);

console.log("1) TABAN DOLULUĞU");
kontrol(`src taraması dolu (${kodDosyalari.length} dosya, en az 300)`, kodDosyalari.length >= 300);
kontrol(`sözlük taraması dolu (${sozlukler.length} dosya, en az 2)`, sozlukler.length >= 2);
kontrol(`statik taraması service worker'ı içeriyor`, statikler.includes(SW));
kontrol(
  `ad listesi dolu ve güncel ad başta (${ADLAR.join(", ")})`,
  ADLAR.length >= 3 && ADLAR[1] === UYGULAMA.teknikAd,
);

console.log("\n2) YASAK — yorumsuz kodda ad geçmez");
const ihlaller: string[] = [];
for (const yol of [...kodDosyalari, ...sozlukler, ...statikler]) {
  if (yol === TANIM) continue;
  let metin = kaynakOku(yol);
  if (!yol.endsWith(".json")) metin = yorumsuzla(metin);
  if (yol === SW) metin = metin.replace(SURUM_SATIRI, "");
  for (const ist of ISTISNALAR) {
    if (ist.dosya !== yol) continue;
    metin = metin
      .split("\n")
      .map((satir) => (ist.satir.test(satir.trim()) ? "" : satir))
      .join("\n");
  }
  metin.split("\n").forEach((satir, i) => {
    if (AD_DESENI.test(satir)) ihlaller.push(`${yol}:${i + 1}  ${satir.trim().slice(0, 120)}`);
  });
}
kontrol(
  `ad hiçbir dosyada elle yazılmamış (${kodDosyalari.length + sozlukler.length + statikler.length} dosya tarandı)`,
  ihlaller.length === 0,
  ihlaller.length ? `\n         ${ihlaller.join("\n         ")}\n         → metin: sözlükte {uygulama} yer tutucusu + UYGULAMA.ad · kimlik: UYGULAMA.teknikAd` : undefined,
);

console.log("\n2b) İSTİSNALAR — gerekçeli ve bayat değil");
for (const ist of ISTISNALAR) {
  kontrol(`istisnanın gerekçesi yazılı (${ist.dosya})`, ist.gerekce.trim().length >= 40);
  if (!existsSync(ist.dosya)) {
    console.log(`  --    ${ist.dosya} bu dalda yok — istisna uygulanmıyor`);
    continue;
  }
  const satirlar = kaynakOku(ist.dosya).split("\n").map((x) => x.trim());
  kontrol("  ...istisna satırı dosyada duruyor (bayat değil)", satirlar.some((x) => ist.satir.test(x)));
}

/**
 * Next.js adresi KLASÖR adından alır; klasör bir sabitten türetilemez. Bu
 * yüzden ad değişince klasörün de taşındığı burada ölçülür.
 */
console.log("\n2c) ADRES KLASÖRÜ — eski adla klasör yok, yönetim klasörü teknik adla");
const eskiKlasorler = UYGULAMA.eskiTeknikAdlar.filter((ad) => existsSync(`src/app/${ad}`));
kontrol("eski adla adres klasörü yok (src/app/<eski ad>)", eskiKlasorler.length === 0, eskiKlasorler);
const YONETIM_SABITI = "export const YONETIM_YOLU = `/${UYGULAMA.teknikAd}`;";
if (kodDosyalari.some((y) => kaynakOku(y).includes(YONETIM_SABITI))) {
  kontrol(`yönetim klasörü teknik adla (src/app/${UYGULAMA.teknikAd})`, existsSync(`src/app/${UYGULAMA.teknikAd}`));
} else {
  console.log("  --    yönetim katmanı bu dalda yok — klasör ölçütü koşmuyor");
}

console.log("\n3) SERVICE WORKER — önbellek adı güncel teknik adla");
const sw = SURUM_SATIRI.exec(kaynakOku(SW));
kontrol("SURUM satırı bulundu", sw !== null);
kontrol(
  `SURUM ön eki güncel teknik ad ("${sw?.[1] ?? "?"}" = "${UYGULAMA.teknikAd}")`,
  sw?.[1] === UYGULAMA.teknikAd,
);

console.log("");
if (basarisiz === 0) console.log(`TÜM KONTROLLER GEÇTİ (${calisan})`);
else {
  console.log(`KONTROL BAŞARISIZ: ${basarisiz}/${calisan}`);
  process.exitCode = 1;
}
