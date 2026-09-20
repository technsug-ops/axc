import { readFileSync } from "node:fs";

import { YAZMASI_BEYANLI } from "./yazici-beyani";

/**
 * ============================================================================
 *  HAKEDİŞ/KARGO YAZICI BEKÇİSİ — K220 + K221 (19.09.2026)
 * ----------------------------------------------------------------------------
 *  `api:dogrula` bu dosyaları YAZICI olarak beyan ediyor (`YAZMASI_BEYANLI`,
 *  bkz. `scripts/api-dogrula.ts`) — beyan tek başına yetmez, kendi bekçisi
 *  burada. Önce TY (K220) için yazıldı, HB (K221) eklenince dosya adı da
 *  `ty-hakedis-yazici-dogrula.ts`'ten buraya taşındı — "dosya adı da bir
 *  sınıf beyanıdır", tek kanal iddiası artık doğru değildi.
 *
 *  ÖLÇÜTLER, HER BİRİ KULLANIMA BAĞLI (ADA DEĞİL):
 *   ① `--yaz` KAPISI yazma çağrılarından ÖNCE gelir — kapı silinirse ya da
 *      yazmadan SONRAYA taşınırsa varsayılan koşum (bayraksız) yazardı.
 *      (TY + KARGO + HB, üçü de.)
 *   ② HER YAZAN DOSYADA en az bir `izYaz(` çağrısı var — sessiz yazım yok.
 *      (TY + KARGO + HB, üçü de.)
 *   ③ KARGO betiğinde `cargoAmount === null` denetimi, yazma satırından
 *      ÖNCE gelir — "gerçekleşen değerin üzerine asla yazılmaz" kuralı.
 * ============================================================================
 */

let hata = 0;
let gecen = 0;
function kontrol(ad: string, sonuc: boolean) {
  if (sonuc) {
    gecen++;
    console.log(`  ✓ ${ad}`);
  } else {
    hata++;
    console.log(`  ✗ ${ad}`);
  }
}

function yorumsuz(metin: string): string {
  return metin
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(new RegExp("(^|[^:])//[^" + String.fromCharCode(10) + "]*", "g"), "$1 ");
}

const YAZ_KAPISI = /if\s*\(\s*!YAZ\s*\)\s*\{/;
const YAZ_CAGRILARI = /\.(create|createMany|update)\(/g;

/** `--yaz` kapısı, İLK yazma çağrısından ÖNCE mi geliyor. */
function yazKapisiOncedeMi(metin: string): boolean {
  const kapiIndex = metin.search(YAZ_KAPISI);
  if (kapiIndex < 0) return false;
  const ilkYazma = [...metin.matchAll(YAZ_CAGRILARI)][0];
  if (!ilkYazma || ilkYazma.index === undefined) return false;
  return kapiIndex < ilkYazma.index;
}

function izYazVarMi(metin: string): boolean {
  return /izYaz\(/.test(metin);
}

/** KARGO'ya özel: `cargoAmount === null` denetimi, doldurulacaklar.push'tan ÖNCE mi. */
function cargoBosGuvenceliMi(metin: string): boolean {
  const kosul = metin.indexOf("cargoAmount === null");
  const yazim = metin.indexOf("doldurulacaklar.push(");
  if (kosul < 0 || yazim < 0) return false;
  return kosul < yazim;
}

const TY_KARGO = "scripts/canli-ty-kargo-gercek-olcum.ts";

/**
 * ⛔ KÜME BEYANDAN TÜRETİLİR — ELLE TUTULMAZ (K223-③, 21.09.2026).
 *
 * Burada `const DOSYALAR = [üç dosya]` yazıyordu. 21.09'da dördüncü bir
 * yazıcı doğdu (`canli-ty-odeme-gunu-onar.ts`) ve elle tutulan liste onu
 * GÖRMEZDİ: bekçi yeşil yanar, korunması gereken betik kapsam dışında
 * kalırdı — ve ekranda bir eksiklik değil bir ONAY görünürdü.
 *
 * Artık küme `YAZMASI_BEYANLI`dan süzülüyor: `bekcisi` alanına bu bekçiyi
 * yazan her betik kendiliğinden kapsama girer.
 * _(Anayasa: "bekçi ölçütü elle tutulan liste değil, tersten kurulur" ·
 * "düzeltmenin çaresi dosya listesi değil, desen yasağıdır".)_
 */
const BU_BEKCI = "hakedis-yazici:dogrula";
const DOSYALAR = YAZMASI_BEYANLI.filter((b) => b.bekcisi === BU_BEKCI).map(
  (b) => `scripts/${b.dosya}`,
);

console.log("\nHAKEDİŞ/KARGO YAZICI BEKÇİSİ — K220 + K221 + K223\n");

/**
 * ⛔ TABAN DOLULUĞU AYRICA KANITLANIR. Türetilen küme boşalırsa aşağıdaki
 * döngüler HİÇ dönmez ve bekçi "hepsi geçti" der — boş küme her koşulu
 * sağlar. Beyan dosyası bozulsa ya da `bekcisi` adı değişse tam bu olurdu.
 */
kontrol(
  `beyandan türetilen küme DOLU (${DOSYALAR.length} dosya)`,
  DOSYALAR.length >= 4,
);
for (const d of DOSYALAR) console.log(`     · ${d}`);

const metinler = new Map(DOSYALAR.map((d) => [d, yorumsuz(readFileSync(d, "utf8"))]));

console.log("① --yaz KAPISI, YAZMA ÇAĞRILARINDAN ÖNCE GELİYOR MU");
for (const d of DOSYALAR) kontrol(`  ${d}`, yazKapisiOncedeMi(metinler.get(d)!));

console.log("\n② HER YAZAN DOSYADA izYaz( ÇAĞRISI VAR MI");
for (const d of DOSYALAR) kontrol(`  ${d}`, izYazVarMi(metinler.get(d)!));

console.log("\n③ KARGO — cargoAmount BOŞ DENETİMİ, YAZIMDAN ÖNCE GELİYOR MU");
kontrol(`  ${TY_KARGO}`, cargoBosGuvenceliMi(metinler.get(TY_KARGO)!));

console.log("\n④ MUTASYON — KENDİ KÖRLÜĞÜNÜ SINAR (yalnız bellekte, dosyaya dokunmaz)");

// (a) --yaz kapısını SİL → ① kırmızı yanmalı.
for (const d of DOSYALAR) {
  const mutasyonlu = metinler.get(d)!.replace(YAZ_KAPISI, "if (false) {");
  kontrol(`  ① kapı silinince KIRMIZI yanıyor (${d})`, !yazKapisiOncedeMi(mutasyonlu));
}

// (b) izYaz çağrısını sil → ② kırmızı yanmalı.
// ⚠ Yerine konan ad "izYaz(" alt dizesini İÇERMEMELİ — ilk denemede
// "sessizYaz(" kullanıldı ve "…sessizYaz(" kendi içinde "izYaz(" taşıdığı
// için mutasyon YAKALANMADI (yalancı yeşil, bu betiğin kendi turunda
// bulundu). Ayrık bir ad kullanılır.
for (const d of DOSYALAR) {
  const mutasyonlu = metinler.get(d)!.replace(/izYaz\(/g, "noOpAudit(");
  kontrol(`  ② izYaz kaldırılınca KIRMIZI yanıyor (${d})`, !izYazVarMi(mutasyonlu));
}

// (c) cargoAmount boş denetimini yazımdan SONRAYA taşı → ③ kırmızı yanmalı.
{
  const mutasyonlu = metinler.get(TY_KARGO)!.replace(
    "cargoAmount === null",
    "cargoAmountSAHTE === null",
  );
  kontrol("  ③ denetim adı değişince KIRMIZI yanıyor (kargo)", !cargoBosGuvenceliMi(mutasyonlu));
}

console.log(`\n${gecen} geçti · ${hata} kaldı\n`);
process.exitCode = hata > 0 ? 1 : 0;
