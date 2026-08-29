import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { sayimKorumasi } from "../src/lib/sayim-korumasi";

/**
 * ============================================================================
 *  SAYIM KORUMASI — DEĞER TESTİ + DESEN YASAĞI (bekçi)
 * ----------------------------------------------------------------------------
 *      npm run sayim-korumasi:dogrula
 *
 *  ⭐ İKİ KATMAN, İKİSİ AYRI:
 *   ① SAF GÖVDE **ÇAĞRILIR** ve değeri sınanır — desen taranmaz
 *     (anayasa: "saf hesap katmanı, desen tarayan bekçiye muhtaç olmaz").
 *   ② Gövdeyi ÇAĞIRMASI gereken yollar DESENLE sınanır: `stockMovement.create`
 *     çağıran ve `occurredAt`i sabit OLMAYAN her dosya `sayimKorumasi(`
 *     kapısından geçmeli; geçmiyorsa yanında `SAYIM KORUMASI YOK: <gerekçe>`
 *     beyanı olmalı. **Liste değil, desen.**
 * ============================================================================
 */

let hata = 0;
let kontrol = 0;
const bulgu: string[] = [];
function yakin(ad: string, olan: unknown, beklenen: unknown) {
  kontrol++;
  if (JSON.stringify(olan) === JSON.stringify(beklenen)) return;
  hata++;
  bulgu.push("  ⛔ " + ad + "\n     olan " + JSON.stringify(olan) +
    "\n     beklenen " + JSON.stringify(beklenen));
}
function dogru(ad: string, kosul: boolean) {
  kontrol++;
  if (kosul) return;
  hata++;
  bulgu.push("  ⛔ " + ad);
}

const S = (g: string) => new Date(g + "T00:00:00.000Z");

// ═══ ① SAF GÖVDE — DEĞERLE ════════════════════════════════════════════════
dogru("sayım damgası YOKSA serbest",
  sayimKorumasi({ sonSayimIsTarihi: null, hareketIsTarihi: S("2020-01-01"), adet: -5 })
    .sonuc === "SERBEST");
dogru("hareket sayımdan SONRA ise serbest",
  sayimKorumasi({ sonSayimIsTarihi: S("2026-08-29"), hareketIsTarihi: S("2026-08-30"), adet: -5 })
    .sonuc === "SERBEST");
/**
 * ⚠ AYNI GÜN SERBEST — VE BU BİLEREK. Sayım günü yapılan bir satış sayımdan
 * önce de sonra da olabilir; bilemeyiz. Kilitlersek sayım gününün TAMAMI
 * kapanırdı. (FIFO `sinir` kararının TERSİ yönde kardeşi.)
 */
dogru("AYNI GÜN serbest (sayım gününün tamamı kilitlenmez)",
  sayimKorumasi({ sonSayimIsTarihi: S("2026-08-29"), hareketIsTarihi: S("2026-08-29"), adet: -5 })
    .sonuc === "SERBEST");
dogru("adet 0 ise serbest (stok değişmiyor)",
  sayimKorumasi({ sonSayimIsTarihi: S("2026-08-29"), hareketIsTarihi: S("2026-01-01"), adet: 0 })
    .sonuc === "SERBEST");

const dus = sayimKorumasi({
  sonSayimIsTarihi: S("2026-08-29"), hareketIsTarihi: S("2026-07-01"), adet: -2 });
const art = sayimKorumasi({
  sonSayimIsTarihi: S("2026-08-29"), hareketIsTarihi: S("2026-07-01"), adet: +2 });

dogru("geriye dönük DÜŞÜREN → DURAKSA", dus.sonuc === "DURAKSA");
dogru("geriye dönük ARTIRAN → DURAKSA", art.sonuc === "DURAKSA");
/**
 * ⭐ YÖN AYRIMI SERTLİKTE DEĞİL, SEBEPTE. "Artıran hafif olsun mu?" diye
 * soruldu; cevap HAYIR ve gerekçe fizikseldir: mal sayım sırasında raftaysa
 * SAYAN KİŞİ ONU ZATEN SAYDI, geriye dönük alım aynı malı ikinci kez ekler.
 * ⚠ Bu ölçüt, "artıran serbest" mutasyonunu kırmızıya çevirir.
 */
yakin("DÜŞÜREN'in yönü ve sebebi",
  [dus.sonuc === "DURAKSA" ? dus.yon : null, dus.sonuc === "DURAKSA" ? dus.sebep : null],
  ["DUSUREN", "sayimSonrasiDusuren"]);
yakin("ARTIRAN'ın yönü ve sebebi",
  [art.sonuc === "DURAKSA" ? art.yon : null, art.sonuc === "DURAKSA" ? art.sebep : null],
  ["ARTIRAN", "sayimSonrasiArtiran"]);
dogru("iki yön de AYNI sertlikte (ikisi de DURAKSA)",
  dus.sonuc === art.sonuc);
dogru("ama sebepleri FARKLI (kullanıcıya farklı iş düşüyor)",
  (dus.sonuc === "DURAKSA" ? dus.sebep : "") !==
    (art.sonuc === "DURAKSA" ? art.sebep : ""));
/** ⚠ Bir gün öncesi bile duraksatır — eşik uydurulmadı. */
dogru("sayımdan BİR GÜN öncesi de duraksatır (tolerans yok)",
  sayimKorumasi({ sonSayimIsTarihi: S("2026-08-29"), hareketIsTarihi: S("2026-08-28"), adet: -1 })
    .sonuc === "DURAKSA");

// ═══ ② DESEN YASAĞI ═══════════════════════════════════════════════════════
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

const acik: string[] = [];
for (const yol of dosyalar("src")) {
  const d = yol.replace(/\\/g, "/");
  if (d.includes("/generated/")) continue;
  const ham = readFileSync(yol, "utf8");
  const kod = yorumsuz(ham);
  if (!/\bstockMovement\.create(Many)?\s*\(/.test(kod)) continue;
  /** ⚠ `occurredAt` SABİT Mİ — yalnız `new Date()` yazan yol geriye dönemez. */
  const tarihler = kod.match(/occurredAt:\s*[^,\n}]+/g) ?? [];
  const hepsiSimdi = tarihler.length > 0 &&
    tarihler.every((t) => /new Date\(\)/.test(t));
  kontrol++;
  if (hepsiSimdi) continue;
  if (/\bsayimKorumasi\s*\(/.test(kod)) continue;
  if (/SAYIM KORUMASI YOK:\s*\S/.test(ham)) continue;
  hata++;
  acik.push("  ⛔ " + d + "  →  `occurredAt` sabit değil, `sayimKorumasi(` yok, beyan yok");
}


/**
 * ═══ ② `scripts/` KAPSAMI — SINIF BEYANLA BELİRLENİR ═════════════════════
 *
 * ⛔ 29.08.2026: arızayı yapan aktarım `src/` içinde DEĞİL, `scripts/`
 * altındaydı ve bekçi orayı hiç taramıyordu — koruma, arızanın geldiği
 * yeri kapsamıyordu.
 *
 * ⚠ VE SINIFI DESENLE TAHMİN ETME DENEMESİ ÇÖKTÜ. `PARTI =` · `KODLAR =`
 * · `--geri` işaretleriyle "tek seferlik onarım" ayrılmaya çalışıldı;
 * `canli-alis-ice-aktar` ve `canli-satis-ice-aktar` **muaf sayıldı** —
 * oysa arızayı yapanlar tam onlardı. İşaretler iki sınıfta da geçiyor.
 *
 * ⭐ O YÜZDEN SINIF BEYAN EDİLİR, TAHMİN EDİLMEZ:
 *     BETIK SINIFI: SUREKLI                     → kapıdan geçmeli
 *     BETIK SINIFI: TEK_SEFERLIK — <gerekçe>    → muaf
 * Beyanı OLMAYAN betik KIRMIZI.
 *
 * ⚠ MUTASYON AYRIMI (kullanıcı kararı 29.08):
 *  · beyanı `SUREKLI` → `TEK_SEFERLIK` çeviren senaryo YEŞİL kalır —
 *    o bir İNSAN KARARIDIR ve gerekçesiyle birlikte koda yazılır;
 *    bekçinin işi kararı denetlemek değil, KARARSIZLIĞI yakalamak.
 *  · beyanı SİLEN senaryo KIRMIZI — sınıf yeniden tahmine düşer.
 */
const SINIF_DESENI = /BETIK SINIFI:\s*(SUREKLI|TEK_SEFERLIK)/;
for (const yol of dosyalar("scripts")) {
  const ham = readFileSync(yol, "utf8");
  const kod = yorumsuz(ham);
  if (!/\bstockMovement\.create(Many)?\s*\(/.test(kod)) continue;
  const tarihler = kod.match(/occurredAt:\s*[^,\n}]+/g) ?? [];
  if (tarihler.length > 0 && tarihler.every((t) => /new Date\(\)/.test(t))) continue;
  kontrol++;
  const m = SINIF_DESENI.exec(ham);
  if (m === null) {
    hata++;
    acik.push("  ⛔ " + yol.replace(/\\/g, "/") +
      "  →  BETIK SINIFI beyanı YOK (SUREKLI mi TEK_SEFERLIK mi?)");
    continue;
  }
  if (m[1] === "TEK_SEFERLIK") {
    /** ⚠ Muafiyet GEREKÇESİZ verilemez — beyan tek başına yetmez. */
    if (!/BETIK SINIFI:\s*TEK_SEFERLIK\s*—\s*\S/.test(ham)) {
      hata++;
      acik.push("  ⛔ " + yol.replace(/\\/g, "/") +
        "  →  TEK_SEFERLIK beyanı GEREKÇESİZ");
    }
    continue;
  }
  /** SUREKLI ise kapıdan geçmeli ya da beyanlı istisna taşımalı. */
  if (/\bsayimKorumasi\s*\(/.test(kod)) continue;
  if (/SAYIM KORUMASI YOK:\s*\S/.test(ham)) continue;
  hata++;
  acik.push("  ⛔ " + yol.replace(/\\/g, "/") +
    "  →  SUREKLI ama `sayimKorumasi(` yok, beyan yok");
}

console.log("");
console.log("SAYIM KORUMASI — DEĞER TESTİ + DESEN YASAĞI");
console.log("  ölçüt ①: saf gövde ÇAĞRILIR, değeri sınanır");
console.log("  ölçüt ②: geriye dönük yazabilen her yol `sayimKorumasi(`");
console.log("           kapısından geçer ya da beyan taşır");
if (hata === 0) {
  console.log("  TÜM KONTROLLER GEÇTİ (" + kontrol + ")");
  process.exit(0);
}
console.log("  ⛔ BAŞARISIZ: " + hata + " / " + kontrol);
for (const b of bulgu) console.log(b);
for (const a of acik) console.log(a);
process.exit(1);
