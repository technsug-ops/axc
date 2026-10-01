import { readdirSync, readFileSync } from "node:fs";

import { satisKosulu, teslimParametreleri } from "../src/lib/liste-suzgeci";

import {
  TESLIM_BILDIREN_KANALLAR,
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
  teslimKovasi({ kanalKodu: "TRENDYOL", shippedAt: null, deliveredAt: null }) === "KARGOLANMADI",
);
kontrol(
  "mekanizmadan SONRA kargolandı, teslim yok → YOLDA",
  teslimKovasi({ kanalKodu: "TRENDYOL", shippedAt: SONRA, deliveredAt: null }) === "YOLDA",
);
/**
 * ⛔ EN KRİTİK ÖLÇÜT — KUTUNUN ŞİŞMESİNİ ENGELLEYEN SATIR.
 * Bu ayrım kalkarsa 313 sipariş "yolda" görünür ve hiçbir şey hata vermez.
 */
kontrol(
  "mekanizmadan ÖNCE kargolandı, teslim yok → BİLİNMİYOR (yolda DEĞİL)",
  teslimKovasi({ kanalKodu: "TRENDYOL", shippedAt: ONCE, deliveredAt: null }) === "BILINMIYOR",
);
/**
 * ⚠ SIRA SINANIYOR: eski bir sipariş kanaldan teslim damgası ALMIŞ olabilir
 * (HB geçmiş tarihli `DeliveredDate` veriyor). O sipariş "bilinmiyor"
 * DEĞİLDİR — biliyoruz. Eşik önce sorulsaydı yanlış kovaya düşerdi.
 */
kontrol(
  "ESKİ sipariş ama teslim damgası VAR → TESLİM EDİLDİ (eşik sorulmaz)",
  teslimKovasi({ kanalKodu: "TRENDYOL", shippedAt: ONCE, deliveredAt: ONCE }) === "TESLIM_EDILDI",
);
/** ⚠ SINIR GÜNÜ: eşiğin TAM üstü içeridedir (`>=`, `>` değil). */
kontrol(
  "eşiğin TAM üstünde kargolanan YOLDA sayılır (sınır içeride)",
  teslimKovasi({ kanalKodu: "TRENDYOL", shippedAt: TESLIM_IZI_DOGDU, deliveredAt: null }) === "YOLDA",
);
kontrol(
  "eşiğin 1 ms altı BİLİNMİYOR",
  teslimKovasi({ kanalKodu: "TRENDYOL",
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

/* ═══ ②b TESLİM BİLDİRMEYEN KANAL (K195-②, 02.10.2026) ════════════════ */
/**
 * ⛔ Amazon / Elden Satış'ta teslim damgası HİÇ doğmaz; «yolda» sayılırsa
 * sonsuza kadar yolda kalır (ölçüm 02.10: Elden Satış 1). BİLİNMİYOR olmalı.
 */
console.log("\n  ── TESLİM BİLDİRMEYEN KANAL");
kontrol(
  "teslim bildirmeyen kanal (Elden Satış), eşikten SONRA kargolandı → BİLİNMİYOR (yolda DEĞİL)",
  teslimKovasi({ kanalKodu: "DEPO", shippedAt: SONRA, deliveredAt: null }) === "BILINMIYOR",
);
kontrol(
  "  ...Amazon da aynı",
  teslimKovasi({ kanalKodu: "AMAZON", shippedAt: SONRA, deliveredAt: null }) === "BILINMIYOR",
);
kontrol(
  "  ...ama teslim damgası VARSA teslim edildi (kanal sorulmaz)",
  teslimKovasi({ kanalKodu: "DEPO", shippedAt: SONRA, deliveredAt: SONRA }) === "TESLIM_EDILDI",
);
kontrol(
  "HB ve N11 eşikten sonra kargolandıysa YOLDA",
  teslimKovasi({ kanalKodu: "HEPSIBURADA", shippedAt: SONRA, deliveredAt: null }) === "YOLDA" &&
    teslimKovasi({ kanalKodu: "N11", shippedAt: SONRA, deliveredAt: null }) === "YOLDA",
);
const kYoldaNesne = teslimKovasiKosulu("YOLDA") as { channelAccount?: { channel?: { code?: { in?: string[] } } } };
const kBilinmiyorNesne = teslimKovasiKosulu("BILINMIYOR") as { OR?: { channelAccount?: { channel?: { code?: { notIn?: string[] } } } }[] };
kontrol(
  "YOLDA koşulu yalnız teslim bildiren kanalları alır (sayı = liste aynı gövdeden)",
  JSON.stringify(kYoldaNesne.channelAccount?.channel?.code?.in) === JSON.stringify([...TESLIM_BILDIREN_KANALLAR]),
  kYoldaNesne,
);
kontrol(
  "BİLİNMİYOR koşulu bildirmeyen kanalları da alır (iki kova tümleyen)",
  (kBilinmiyorNesne.OR ?? []).some((o) => JSON.stringify(o.channelAccount?.channel?.code?.notIn) === JSON.stringify([...TESLIM_BILDIREN_KANALLAR])),
  kBilinmiyorNesne,
);
/**
 * ⛔ BEYAN ↔ GERÇEK YAZICI: `deliveredAt` ATAYAN içe aktarma betikleri
 * taranır (dosya listesi tutulmaz). Yeni bir kanal teslim yazmaya başlarsa
 * beyana eklenmeden bu ölçüt kırmızı yanar — sessizce «bilinmiyor» kalmaz.
 */
const yazanlar = readdirSync("scripts")
  .filter((a) => /^canli-.*-ice-aktar\.ts$/.test(a))
  .filter((a) => /\bdeliveredAt:\s*(?!null\b|true\b)[a-zA-Z(]/.test(readFileSync("scripts/" + a, "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "")));
const KOD_DOSYA: Record<string, string> = { TRENDYOL: "ty", HEPSIBURADA: "hb", N11: "n11" };
kontrol("deliveredAt yazan içe aktarma bulundu (taban DOLU, en az 3)", yazanlar.length >= 3, yazanlar);
kontrol(
  "beyandaki her kanalın deliveredAt YAZAN içe aktarması var ve başka yazan yok",
  yazanlar.length === TESLIM_BILDIREN_KANALLAR.length &&
    TESLIM_BILDIREN_KANALLAR.every((k) => yazanlar.includes(`canli-${KOD_DOSYA[k]}-ice-aktar.ts`)),
  { beyan: TESLIM_BILDIREN_KANALLAR, yazanlar },
);

/* ═══ ②c PANEL KUTUCUKLARI ↔ LİSTE (K195-②) ════════════════════════════ */
console.log("\n  ── PANEL KUTUCUĞU ↔ LİSTE (sayı = liste)");
{
  const temel = { pencere: "BU_AY", kanal: "HEPSIBURADA" };
  const py = teslimParametreleri("yolda", temel);
  const pt = teslimParametreleri("teslim", temel);
  kontrol("«yolda» parametresi DÖNEMSİZ (anlık durum), kanalı taşır", py.pencere === undefined && py.kargo === "yolda" && py.kanal === "HEPSIBURADA", py);
  kontrol("«teslim» parametresi dönemi taşır", pt.pencere === "BU_AY" && pt.kargo === "teslim", pt);
  const an = new Date(Date.UTC(2026, 9, 2, 9));
  const kt = satisKosulu(pt, an).kosul as Record<string, unknown>;
  kontrol("«teslim» listesinde dönem TESLİM tarihine uygulanır (satış tarihine değil)", "deliveredAt" in kt && !("soldAt" in kt), Object.keys(kt));
  const kv = satisKosulu({ kargo: "verildi", pencere: "BU_AY" }, an).kosul as Record<string, unknown>;
  kontrol("«verildi» ekseni değişmedi (kargo tarihi)", "shippedAt" in kv && !("soldAt" in kv), Object.keys(kv));
  const ks = satisKosulu({ pencere: "BU_AY" }, an).kosul as Record<string, unknown>;
  kontrol("kargo süzgeci yokken dönem satış tarihine uygulanır", "soldAt" in ks && !("deliveredAt" in ks), Object.keys(ks));
  const ky = satisKosulu(py, an).kosul as Record<string, unknown>;
  kontrol("«yolda» listesinde tarih süzgeci YOK", !("soldAt" in ky) && !("deliveredAt" in ky), Object.keys(ky));
  /* Sayfa saf değil — kullanım satırına bağlı desen (yorumsuz kodda). */
  const sayfa = readFileSync("src/app/page.tsx", "utf8").replace(/\r\n/g, "\n").replace(/\/\*[\s\S]*?\*\/|\{\/\*[\s\S]*?\*\/\}|\/\/.*$/gm, "");
  kontrol(
    "panel sayıları listenin gövdesinden (satisKosulu + teslimParametreleri) sayılıyor",
    sayfa.includes("prisma.sale.count({ where: satisKosulu(teslimParametreleri(kova, teslimTemel), an).kosul }),") &&
      sayfa.includes('(["yolda", "teslim", "bilinmiyor"] as const).map((kova) =>'),
  );
  kontrol(
    "her kutucuk KENDİ listesine gider (yolda → yolda · teslim → teslim)",
    /href=\{teslimAdresi\("yolda"\)\}\s*className="[^"]*"\s*>\s*\{t\("teslimYolda"\)\}/.test(sayfa) &&
      /href=\{teslimAdresi\("teslim"\)\}\s*className="[^"]*"\s*>\s*\{t\("teslimEdildi"\)\}/.test(sayfa),
  );
  kontrol(
    "dışarıda kalan küme notta yazıyor ve sıfırken bağlantı değil",
    /teslimBilinmiyorSayisi > 0 \?\s*\(\s*<Baglanti href=\{teslimAdresi\("bilinmiyor"\)\}>/.test(sayfa),
  );
}

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
