import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { kargoBekliyorMu, KARGO_BEKLEYEN } from "../src/lib/kargo-bekleyen";

/**
 * ============================================================================
 *  "KARGO BEKLİYOR" BEKÇİSİ (K60) — DESEN YASAĞI, LİSTE DEĞİL
 * ----------------------------------------------------------------------------
 *      npm run kargo-bekleyen:dogrula
 *
 *  ⚠ VAKA — VE BU DERS AYNI GÜN İKİ KEZ ALINDI. `shippedAt = null`ın iki
 *  anlama geldiği bulundu (K60), koşul düzeltildi… ama YALNIZ `panel.ts`te.
 *  Aynı soruyu ALTI yer soruyordu; beşi eski kuralla kaldı ve **görev kutusu
 *  hâlâ 5599 gösterdi.** Ekran düzeltilmiş görünüyordu.
 *
 *  ⛔ ÖLÇÜT ELLE TUTULAN DOSYA LİSTESİ DEĞİL — **DESEN YASAĞI**:
 *
 *      Bir `Sale` sorgusunda ÇIPLAK `shippedAt: null` YAZILAMAZ.
 *      Kargo bekleyen kümesi `KARGO_BEKLEYEN` gövdesinden gelir.
 *
 *  Böyle kurulunca yarın eklenen yedinci ekran da yakalanır; kimsenin listeye
 *  eklemeyi hatırlaması gerekmez.
 *  _(Anayasa: "bekçi ölçütü elle tutulan liste değil, tersten kurulur".)_
 *
 *  ⚠ BEYAN EDİLEN İSTİSNALAR GEREKÇESİYLE YAZILIR. Beyan edilmemiş bir
 *  istisna hata sayılır.
 * ============================================================================
 */

/** Çıplak `shippedAt: null` yazmasına İZİN VERİLEN yerler — dosya → GEREKÇE. */
const ISTISNALAR = new Map<string, string>([
  [
    "src/lib/kargo-bekleyen.ts",
    "GÖVDENİN KENDİSİ — kuralın tanımlandığı yer.",
  ],
  [
    "src/app/page.tsx",
    "PANEL SORGUSU: `{ shippedAt: null }` bir OR dalıdır ve amacı kargo bekleyeni bulmak DEĞİL — dönem dışı kalanları da çekip `kargoHali` üç kovaya ayırabilsin diye kümeyi GENİŞLETİYOR. Daraltmak, BİLİNMİYOR kovasını hiç göremezdi.",
  ],
  [
    "src/lib/onay-kuyrugu.ts",
    "ONAY KUYRUĞU (K164): `shippedAt: null` burada kargo kümesi DEĞİL, onay adayı tanımı — kargolanmış sipariş onaya giremez. KARGO_BEKLEYEN kullanılamaz: kuyruk tam tersini (bağı OLMAYANI) arıyor.",
  ],
  [
    "src/app/satislar/actions.ts",
    "TOPLU İŞARETLEME: burada `shippedAt: null` bir küme tanımı değil, YAZMA KAPISI — 'zaten işaretliyi yeniden yazma' koşulu. Ayrıca `importKaynak: null` zaten yanında duruyor ve `toplu-kargo:dogrula` onu ayrıca ölçüyor.",
  ],
]);

let gecen = 0;
const dusen: string[] = [];

function kontrol(ad: string, kosul: boolean, ipucu?: string) {
  if (kosul) gecen++;
  else dusen.push(ad + (ipucu ? "\n       " + ipucu : ""));
}

/** ⚠ YORUMSUZ KOD — bir kuralı ANLATAN yorum, kuralı ÇİĞNEMİŞ sayılmaz. */
function yorumsuz(metin: string): string {
  return metin
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
}

function dosyalar(kok: string, biriken: string[] = []): string[] {
  for (const ad of readdirSync(kok)) {
    const yol = join(kok, ad);
    if (statSync(yol).isDirectory()) dosyalar(yol, biriken);
    else if (/\.tsx?$/.test(ad)) biriken.push(yol.replaceAll("\\", "/"));
  }
  return biriken;
}

console.log("\nKARGO BEKLEYEN BEKÇİSİ (K60)\n");

// ═══════════════════════════════════════════════════════════════════════════
//  ① SAF GÖVDE — değer testi
// ═══════════════════════════════════════════════════════════════════════════

/**
 * ⭐ ÖLÇÜT GÜNCELLENDİ (K164, 04.09.2026): eski ölçüt düz `importKaynak:
 * null` arıyordu — BÜTÜN içe aktarılanların dışlanmasını sabitliyordu.
 * Kural bilinçli değişti: onaylanan (SALE_OUT bağı kurulan) içe aktarılan
 * satış kümeye GİRER. Ölçüt iki dalı BİRDEN arar; biri silinirse kırmızı.
 */
const gövdeMetni = JSON.stringify(KARGO_BEKLEYEN);
kontrol(
  "① gövde importKaynak dalını taşıyor (içe aktarılmış, bağsızsa dışarıda)",
  gövdeMetni.includes('"importKaynak":null'),
  "`KARGO_BEKLEYEN` içe aktarılmışı elemiyor — kural gövdede yok",
);
/**
 * ⭐ İZ DEĞİŞTİ (K164-②): SALE_OUT bağı ölçütü YANLIŞTI — o izi üç mekanizma
 * dolduruyor ve canlıda 7533 tarihsel kayıt kümeye sızdı (panel 7540).
 * Yeni iz `onaylandiAt`: tek yazıcılı. Ölçüt İKİ yönlü: yeni iz VAR,
 * eski sızdıran iz YOK.
 */
kontrol(
  "① gövde ONAY İZİ dalını taşıyor (onaylanan içeri girer, K164-②)",
  gövdeMetni.includes('"onaylandiAt"'),
  "onay dalı yok — onaylanan sipariş kargo kümesine giremez",
);
kontrol(
  "① gövde SALE_OUT bağına DÖNMEDİ (üç yazıcılı iz — 7533 kayıt sızdırır)",
  !gövdeMetni.includes('"SALE_OUT"'),
);
kontrol(
  "① gövde shippedAt koşulunu taşıyor",
  "shippedAt" in KARGO_BEKLEYEN && KARGO_BEKLEYEN.shippedAt === null,
);
kontrol(
  "① elle girilmiş + kargolanmamış → BEKLİYOR",
  kargoBekliyorMu({ shippedAt: null, importKaynak: null, onaylandiAt: null }),
);
kontrol(
  "① içe aktarılmış + ONAYSIZ → BEKLEMİYOR (bilinmiyor, çıkmadı değil)",
  !kargoBekliyorMu({ shippedAt: null, importKaynak: "satis-excel", onaylandiAt: null }),
);
kontrol(
  "① içe aktarılmış + ONAY İZLİ → BEKLİYOR (K164-②)",
  kargoBekliyorMu({
    shippedAt: null,
    importKaynak: "enumerasyon",
    onaylandiAt: new Date("2026-09-04T10:00:00Z"),
  }),
);
kontrol(
  "① kargolanmış → BEKLEMİYOR — onaylı olsa bile",
  !kargoBekliyorMu({
    shippedAt: new Date("2026-08-20T00:00:00Z"),
    importKaynak: null,
    onaylandiAt: new Date("2026-08-19T10:00:00Z"),
  }),
);

// ═══════════════════════════════════════════════════════════════════════════
//  ② DESEN YASAĞI — çıplak `shippedAt: null` beyansız yazılamaz
// ═══════════════════════════════════════════════════════════════════════════

const suclular: string[] = [];
for (const yol of dosyalar("src")) {
  const kod = yorumsuz(readFileSync(yol, "utf8"));
  if (!/shippedAt:\s*null/.test(kod)) continue;
  if (ISTISNALAR.has(yol)) continue;
  suclular.push(yol);
}

kontrol(
  "② çıplak `shippedAt: null` yazan BEYANSIZ dosya yok",
  suclular.length === 0,
  suclular.length
    ? "beyansız: " + suclular.join(", ") + "\n       → `KARGO_BEKLEYEN` kullanın ya da `ISTISNALAR`a GEREKÇESİYLE yazın"
    : undefined,
);

// ═══════════════════════════════════════════════════════════════════════════
//  ③ OKUYUCULAR — hepsi gövdeden besleniyor mu
// ═══════════════════════════════════════════════════════════════════════════
//  ⚠ Bu bir dosya listesi ve bakım ister — AMA ölçüt ② değil, bu DEĞİL.
//  ② yeni bir okuyucuyu kendiliğinden yakalar; ③ bilinen okuyucuların
//  bağlantısının KOPMADIĞINI sınar (import silinip koşul elle yazılırsa ②
//  yakalar, ama import silinip koşul HİÇ yazılmazsa yalnız ③ yakalar).

const OKUYUCULAR = [
  ["görev kutusu sayısı", "src/lib/panel/gorev-verisi.ts"],
  ["/satislar kargo süzgeci", "src/lib/liste-suzgeci.ts"],
  ["paketleme ekranı", "src/app/paketle/actions.ts"],
  ["barkod okuma akışı", "src/app/okut/actions.ts"],
] as const;

for (const [ad, yol] of OKUYUCULAR) {
  const kod = yorumsuz(readFileSync(yol, "utf8"));
  kontrol(
    "③ " + ad + " gövdeyi İÇERİ ALIYOR",
    /from "@\/lib\/kargo-bekleyen"/.test(kod),
    yol + " içinde import yok — koşul sessizce eski kurala dönmüş olabilir",
  );
  kontrol(
    "③ " + ad + " gövdeyi KULLANIYOR (import yetmez)",
    /\.\.\.KARGO_BEKLEYEN|\?\s*KARGO_BEKLEYEN\s*:|veKosullari\.push\(KARGO_BEKLEYEN\)/.test(kod),
    yol + " içeri alıyor ama yaymıyor — ölü import",
  );
}

// ═══════════════════════════════════════════════════════════════════════════

if (dusen.length === 0) {
  console.log("  ✓  " + gecen + "/" + gecen + " ölçüt geçti\n");
} else {
  for (const d of dusen) console.log("  ✗  " + d);
  console.log("\n  " + dusen.length + " ölçüt DÜŞTÜ · " + gecen + " geçti\n");
  process.exitCode = 1;
}
