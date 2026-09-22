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
const HB_CEKIM = "scripts/canli-hb-hakedis-cekim.ts";

/**
 * HB'ye özel (K232-②, 22.09.2026): `WillBePaid` görülüp yazılan satır sonra
 * `Paid` olunca `paidAt` BOŞTAN dolmalı — eski hâl bunu hiç yazmıyordu ve HB
 * paneli "22 Eylül · Ödendi" derken 138 satır "Gelecek"te kalıyordu.
 * ÜÇ HALKA BİRDEN, KULLANIMA BAĞLI: koşul (yalnız boşsa) + kümeye alma +
 * update + iz. Biri kopuksa kırmızı.
 */
const HB_DOLDURMA_KOSULU = "var_.paidAt === null && h.satir.odemeTarihi !== null";
/**
 * ①b (K232-②): kayıt-tarihi penceresi geçişi kaçırabilir; vadesi geçmiş
 * ödenmemiş satırlar VADE penceresiyle yeniden sorulmalı. Ölçüt kullanıma
 * bağlı: defter sorgusu (paidAt boş ∧ vade ≤ bugün) VE uca vade süzgeci.
 */
const HB_VADE_SORGUSU = "paidAt: null, dueDate: { lte: new Date(simdi) }";
function hbVadePenceresiSoruyorMu(metin: string): boolean {
  return metin.includes(HB_VADE_SORGUSU) && /dueDateStart: gunStr\(bas\),\s*dueDateEnd: gunStr\(son\),/.test(metin);
}
function hbOdendiGecisiGuvenceliMi(metin: string): boolean {
  const kosul =
    /const paidAtDolduracak = var_\.paidAt === null && h\.satir\.odemeTarihi !== null;\s*if \(paidAtDolduracak\) \{\s*tazelenecekler\.push\(/.test(
      metin,
    );
  const yazim =
    /settlementItem\.update\(\{\s*where: \{ id: t\.itemId \},\s*data: \{ paidAt: t\.yeniPaidAt \}/.test(metin);
  const iz = /action: "HB_HAKEDIS_ODENDI_TAZELE"/.test(metin);
  return kosul && yazim && iz;
}

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

console.log("\n③b HB — WillBePaid→Paid GEÇİŞİ YAZILIYOR MU (paidAt yalnız BOŞSA dolar)");
kontrol(`  ${HB_CEKIM}`, hbOdendiGecisiGuvenceliMi(metinler.get(HB_CEKIM)!));
kontrol(`  ${HB_CEKIM} — vadesi geçmiş ödenmemişler VADE penceresiyle yeniden soruluyor (①b)`, hbVadePenceresiSoruyorMu(metinler.get(HB_CEKIM)!));

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

// (d) HB ödendi geçişi — İKİ YÖN: koşulu öldür (yanlış susma) · "boşsa"
//     kapısını kaldır (yanlış yanma: dolu paidAt'in üstüne yazar) · izi sil.
{
  const asil = metinler.get(HB_CEKIM)!;
  /** Çapa dosyada VAR mı — bulunamayan çapa "yeşil" değil "ölçülemedi"dir. */
  kontrol("  ③b mutasyon çapası dosyada VAR", asil.includes(HB_DOLDURMA_KOSULU));
  kontrol(
    "  ③b koşul öldürülünce KIRMIZI (ödendi geçişi hiç yazılmaz)",
    !hbOdendiGecisiGuvenceliMi(asil.replace(HB_DOLDURMA_KOSULU, "false")),
  );
  kontrol(
    "  ③b 'boşsa' kapısı kaldırılınca KIRMIZI (dolu paidAt'in üstüne yazar)",
    !hbOdendiGecisiGuvenceliMi(asil.replace(HB_DOLDURMA_KOSULU, "h.satir.odemeTarihi !== null")),
  );
  kontrol(
    "  ③b iz kaldırılınca KIRMIZI",
    !hbOdendiGecisiGuvenceliMi(asil.replace('action: "HB_HAKEDIS_ODENDI_TAZELE"', 'action: "HB_SESSIZ"')),
  );
  kontrol("  ①b mutasyon çapası dosyada VAR", asil.includes(HB_VADE_SORGUSU));
  kontrol(
    "  ①b vade sorgusu yalnız ödenmişlere daraltılınca KIRMIZI (ödenmemişler bir daha sorulmaz)",
    !hbVadePenceresiSoruyorMu(asil.replace(HB_VADE_SORGUSU, "paidAt: { not: null }, dueDate: { lte: new Date(simdi) }")),
  );
  kontrol(
    "  ①b uca vade süzgeci gönderilmeyince KIRMIZI (pencere kayıt tarihine düşer)",
    !hbVadePenceresiSoruyorMu(asil.replace("dueDateStart: gunStr(bas),", "recordDateStart: gunStr(bas),")),
  );
}

console.log(`\n${gecen} geçti · ${hata} kaldı\n`);
process.exitCode = hata > 0 ? 1 : 0;
