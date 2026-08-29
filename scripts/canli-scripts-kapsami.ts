import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * ============================================================================
 *  `scripts/` KAPSAMI — SAYIM KORUMASI BEKÇİSİ ORAYA UZATILIRSA (ÖLÇÜM)
 * ----------------------------------------------------------------------------
 *      npm run scripts-kapsami:olc
 *
 *  ⛔ HALİL'İN TESPİTİ: 29.08 arızasını yapan aktarım `src/` içinde DEĞİL,
 *  `scripts/` altında — ve bekçi orayı taramıyor. Yani koruma bugün
 *  **ARIZANIN GELDİĞİ YERİ kapsamıyor.**
 *
 *  ⭐ AMA KAPSAMI UZATMADAN ÖNCE ÖLÇÜLÜR: kaç dosya, kaç ihlal, ve
 *  bunların kaçı MEŞRU? Ölçmeden uzatmak, çalışan bir aracı kilitler
 *  (29.08 `sinir` dersi).
 *
 *  ⛔ HÜKÜM YOK, KOD DEĞİŞMEDİ.
 * ============================================================================
 */

function dosyalar(dizin: string): string[] {
  const c: string[] = [];
  for (const ad of readdirSync(dizin)) {
    const yol = join(dizin, ad);
    if (statSync(yol).isDirectory()) c.push(...dosyalar(yol));
    else if (/\.tsx?$/.test(ad)) c.push(yol);
  }
  return c;
}
function yorumsuz(m: string): string {
  return m
    .replace(/\/\*[\s\S]*?\*\//g, (x) => x.replace(/[^\n]/g, " "))
    .replace(/\/\/[^\n]*/g, (x) => x.replace(/[^\n]/g, " "));
}

console.log("\n" + "=".repeat(100));
console.log("`scripts/` KAPSAMI — ÖLÇÜM (kod değişmedi)");
console.log("=".repeat(100));

type Kayit = {
  yol: string; yazar: boolean; sabitTarih: boolean; kapi: boolean;
  beyan: boolean; salt: boolean; tekSeferlik: boolean; npm: boolean;
};
const paket = readFileSync("package.json", "utf8");
const kayitlar: Kayit[] = [];

for (const yol of dosyalar("scripts")) {
  const ham = readFileSync(yol, "utf8");
  const kod = yorumsuz(ham);
  const yazar = /\bstockMovement\.create(Many)?\s*\(/.test(kod);
  if (!yazar) continue;
  const tarihler = kod.match(/occurredAt:\s*[^,\n}]+/g) ?? [];
  const sabitTarih = tarihler.length > 0 && tarihler.every((t) => /new Date\(\)/.test(t));
  kayitlar.push({
    yol: yol.replace(/\\/g, "/"),
    yazar, sabitTarih,
    kapi: /\bsayimKorumasi\s*\(/.test(kod),
    beyan: /SAYIM KORUMASI YOK:\s*\S/.test(ham),
    /** ⚠ Salt okuma betiği yazmaz — ama `--yaz` kapısı olan yazar. */
    salt: !/--yaz|--uygula|UYGULA|YAZ\b/.test(kod),
    /** ⚠ Tek seferlik onarım betiği: kimliğe/partiye kilitli, tekrar koşulmaz. */
    tekSeferlik: /PARTI\s*=|SAYIM_KODU\s*=|KODLAR\s*=|--geri/.test(kod),
    /** ⚠ `package.json`da komutu var mi — elle kosulabilir demek. */
    npm: paket.includes(yol.replace(/\\/g, "/")),
  });
}

console.log("\n① KAPSAM");
console.log("   `scripts/` altında toplam .ts dosyası : " + dosyalar("scripts").length);
console.log("   ⭐ `stockMovement.create` ÇAĞIRAN      : " + kayitlar.length);

const ihlal = kayitlar.filter((k) => !k.sabitTarih && !k.kapi && !k.beyan);
console.log("\n② BEKÇİ KAPSAMI ORAYA UZATILIRSA");
console.log("   `occurredAt` SABİT (new Date) → zaten temiz : " +
  kayitlar.filter((k) => k.sabitTarih).length);
console.log("   kapıdan geçen                              : " +
  kayitlar.filter((k) => k.kapi).length);
console.log("   beyanı olan                                : " +
  kayitlar.filter((k) => k.beyan).length);
console.log("   ⛔ YENİ İHLAL DOĞACAK                       : " + ihlal.length);

console.log("\n③ ⛔ SINIFLANDIRMA DENEMESİ — VE BAŞARISIZ OLDU");
console.log("   Desenle \"tek seferlik onarım\" ile \"sürekli koşan aktarım\"");
console.log("   ayrılmaya çalışıldı (`PARTI =` · `KODLAR =` · `--geri` işaretleri).");
console.log("   ⛔ ÖLÇÜT ÇÖKTÜ: `canli-alis-ice-aktar` ve `canli-satis-ice-aktar`");
console.log("     \"tek seferlik\" sayıldı — oysa ARIZAYI YAPAN AKTARIMLAR TAM");
console.log("     BUNLAR. İşaretler iki sınıfta da geçiyor.");
console.log("   ⚠ Anayasa: \"iki okumayla da uyumlu bir gözlem hiçbirini");
console.log("     kanıtlamaz\" — desen NİYETİ ayırt edemiyor.");
console.log("");
console.log("   ⭐ SONUÇ: sınıf TAHMİN EDİLMEZ, BEYAN EDİLİR.");
console.log("     Öneri: stok yazan her betik başında");
console.log("       /** BETİK SINIFI: SUREKLI */              → kapıdan geçmeli");
console.log("       /** BETİK SINIFI: TEK_SEFERLIK — <gerekçe> */ → muaf");
console.log("     Beyanı OLMAYAN betik KIRMIZI. Böylece yarın eklenen aktarım");
console.log("     'tek seferlik sanılıp' sessizce geçemez.");
console.log("");
console.log("   ON İHLALİN TAMAMI (sınıfı İNSAN belirler):");
for (const k of ihlal) {
  console.log("     " + k.yol.replace("scripts/", "").padEnd(42) +
    (k.npm ? "npm komutu VAR" : "npm komutu yok"));
}

console.log("\n④ ⚠ OKUMA");
console.log("   Bekçiyi `scripts/`e olduğu gibi uzatmak 10 ihlal doğurur ve");
console.log("   bunların bir kısmı gerçekten muaf olmalı. Ama MUAFİYET");
console.log("   TAHMİNLE verilemez — yukarıdaki deneme bunu gösterdi.");
console.log("   ⭐ Doğru sıra: önce BEYAN kuralı, sonra kapsam genişletme.");

console.log("\n" + "=".repeat(100));
console.log("SALT OKUMA — KOD DEĞİŞMEDİ. HÜKÜM YOK.");
console.log("=".repeat(100) + "\n");
