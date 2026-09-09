import { readdirSync } from "node:fs";

import {
  TESLIM_IZI_DOGDU,
  teslimKovasi,
  teslimKovasiKosulu,
} from "../src/lib/teslim-durumu";

/**
 * ============================================================================
 *  TESLİM DURUMU BEKÇİSİ (K199)
 * ----------------------------------------------------------------------------
 *      npm run teslim-durumu:dogrula
 *
 *  ⭐ ÖLÇÜTLER GÖVDEYİ ÇAĞIRIR, DESEN ARAMAZ: `teslim-durumu.ts` saf.
 *  _(Anayasa: "saf hesap katmanı, desen tarayan bekçiye muhtaç olmaz".)_
 *
 *  ⛔ KORUDUĞU ŞEY: kutunun DÜRÜSTLÜĞÜ. Ölçüldü (09.09.2026) —
 *      ham "yolda" 337 = gerçekten yolda 24 + BİLİNMİYOR 313
 *  Kovalar birleşirse kutu %93 şişer ve operatör var olmayan 313 pakete
 *  bakar. Bu bir görünüm tercihi değil, bir DOĞRULUK meselesi.
 * ============================================================================
 */

let gecen = 0;
let hata = 0;
function kontrol(ad: string, kosul: boolean, ipucu?: unknown) {
  if (kosul) {
    gecen++;
    console.log("  OK    " + ad);
  } else {
    hata++;
    console.log("  HATA  " + ad);
    if (ipucu !== undefined) console.log("        ", ipucu);
  }
}

console.log("\nTESLİM DURUMU BEKÇİSİ (K199)\n");

const ONCE = new Date(Date.UTC(2026, 7, 20));
const SONRA = new Date(Date.UTC(2026, 8, 15));

/* ═══ ① KOVA AYRIMI ═══════════════════════════════════════════════════ */
console.log("  ── KOVALAR");
kontrol(
  "kargoya verilmemiş → KARGOLANMADI",
  teslimKovasi({ shippedAt: null, deliveredAt: null }) === "KARGOLANMADI",
);
kontrol(
  "mekanizmadan SONRA kargolandı, teslim yok → YOLDA",
  teslimKovasi({ shippedAt: SONRA, deliveredAt: null }) === "YOLDA",
);
/**
 * ⛔ EN KRİTİK ÖLÇÜT — KUTUNUN ŞİŞMESİNİ ENGELLEYEN SATIR.
 * Bu ayrım kalkarsa 313 sipariş "yolda" görünür ve hiçbir şey hata vermez.
 */
kontrol(
  "mekanizmadan ÖNCE kargolandı, teslim yok → BİLİNMİYOR (yolda DEĞİL)",
  teslimKovasi({ shippedAt: ONCE, deliveredAt: null }) === "BILINMIYOR",
);
/**
 * ⚠ SIRA SINANIYOR: eski bir sipariş kanaldan teslim damgası ALMIŞ olabilir
 * (HB geçmiş tarihli `DeliveredDate` veriyor). O sipariş "bilinmiyor"
 * DEĞİLDİR — biliyoruz. Eşik önce sorulsaydı yanlış kovaya düşerdi.
 */
kontrol(
  "ESKİ sipariş ama teslim damgası VAR → TESLİM EDİLDİ (eşik sorulmaz)",
  teslimKovasi({ shippedAt: ONCE, deliveredAt: ONCE }) === "TESLIM_EDILDI",
);
/** ⚠ SINIR GÜNÜ: eşiğin TAM üstü içeridedir (`>=`, `>` değil). */
kontrol(
  "eşiğin TAM üstünde kargolanan YOLDA sayılır (sınır içeride)",
  teslimKovasi({ shippedAt: TESLIM_IZI_DOGDU, deliveredAt: null }) === "YOLDA",
);
kontrol(
  "eşiğin 1 ms altı BİLİNMİYOR",
  teslimKovasi({
    shippedAt: new Date(TESLIM_IZI_DOGDU.getTime() - 1),
    deliveredAt: null,
  }) === "BILINMIYOR",
);

/* ═══ ② KOŞUL GÖVDESİ — SAYI ile LİSTE AYNI KÜMEYİ GÖRÜR ══════════════ */
/**
 * ⛔ PANELİN EN TEMEL SÖZÜ "SAYI = LİSTE". Kutu bir koşulla sayıp, tıklanan
 * liste başka bir koşulla süzerse ikisi sessizce ayrışır. Bu yüzden koşul
 * TEK gövdeden gelir ve burada üç kovanın ÜÇ FARKLI koşul ürettiği ölçülür.
 */
console.log("\n  ── KOŞUL GÖVDESİ (sayı = liste)");
const kYolda = JSON.stringify(teslimKovasiKosulu("YOLDA"));
const kBilinmiyor = JSON.stringify(teslimKovasiKosulu("BILINMIYOR"));
const kTeslim = JSON.stringify(teslimKovasiKosulu("TESLIM_EDILDI"));
kontrol("üç kova ÜÇ FARKLI koşul üretir", new Set([kYolda, kBilinmiyor, kTeslim]).size === 3, {
  kYolda,
  kBilinmiyor,
  kTeslim,
});
kontrol(
  "YOLDA koşulu eşiğin ÜSTÜNÜ, BİLİNMİYOR ALTINI alır",
  kYolda.includes("gte") && kBilinmiyor.includes("lt"),
  { kYolda, kBilinmiyor },
);
kontrol(
  "iki kova da teslim damgası BOŞ olanı süzer (kesişmezler)",
  kYolda.includes('"deliveredAt":null') && kBilinmiyor.includes('"deliveredAt":null'),
);

/* ═══ ③ SABİT, MIGRATION DAMGASIYLA TUTUYOR MU ════════════════════════ */
/**
 * ⛔ ELLE TUTULAN TARİH OLMAKTAN ÇIKARIR. Sabit, `deliveredAt` sütununu açan
 * migration'ın damgasıdır. Biri sabiti kaydırırsa (ya da migration yeniden
 * adlandırılırsa) bekçi kırmızı yanar.
 * ⚠ LİSTE ELLE TUTULMUYOR: migration klasörü ADIYLA taranarak bulunuyor.
 */
console.log("\n  ── SABİT ↔ MIGRATION");
const klasorler = readdirSync("prisma/migrations").filter((a) =>
  a.endsWith("_satis_teslim_damgasi"),
);
kontrol("teslim damgası migration'ı bulundu (taban DOLU)", klasorler.length === 1, klasorler);
if (klasorler.length === 1) {
  const d = klasorler[0].slice(0, 8);
  const migrationGunu = Date.UTC(
    Number(d.slice(0, 4)),
    Number(d.slice(4, 6)) - 1,
    Number(d.slice(6, 8)),
  );
  kontrol(
    "TESLIM_IZI_DOGDU migration'ın GÜNÜYLE aynı",
    TESLIM_IZI_DOGDU.getTime() === migrationGunu,
    {
      sabit: TESLIM_IZI_DOGDU.toISOString(),
      migration: new Date(migrationGunu).toISOString(),
    },
  );
}

console.log(
  "\n" +
    (hata === 0 ? "TÜM KONTROLLER GEÇTİ" : "BAŞARISIZ") +
    ` (${gecen}/${gecen + hata})\n`,
);
process.exit(hata === 0 ? 0 : 1);
