import {
  KOD_ROLLERI,
  aramaKosulu,
  kapsananRoller,
  kodKosulu,
} from "../src/lib/varyant-arama-kurali";
import { kodDizisi } from "../src/lib/varyant-ozet";

/**
 * ============================================================================
 *  ARAMA DOĞRULAMA — DÖRT KOD ROLÜNÜN HEPSİ ARANIYOR MU
 * ----------------------------------------------------------------------------
 *  NEDEN VAR: 15.08.2026'da kullanıcı Hepsiburada siparişi girerken
 *  pazaryerinin kodunu (HBCV…) yapıştırdı ve ürün çıkmadı. Kanal kodu
 *  sistemde EŞLEŞTİRİLMİŞTİ — bilgi vardı, arama sormuyordu.
 *
 *  TESTLER BUNU NEDEN GÖRMEDİ: arama kuralı Prisma sorgusunun İÇİNE gömülüydü.
 *  Gömülü bir `where` bloğu ne çağrılabilir ne sınanabilir; hiçbir test
 *  "hangi alanlar aranıyor" diye soramazdı. Eksik bir OR dalı, var olmayan
 *  bir özellik gibi sessizce duruyordu — hata vermiyor, sadece BULMUYORDU.
 *
 *  Kural artık saf: `varyant-arama-kurali.ts`. Buradaki kontroller kuralın
 *  BİÇİMİNİ değil KAPSAMINI sınıyor — yarın koşul yapısı değişse bile
 *  "dört rol de aranıyor mu" sorusu ayakta kalır.
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

console.log("=".repeat(70));
console.log("ARAMA KURALI");
console.log("=".repeat(70));

/**
 * ANAYASADAKİ ÜÇ KOD ROLÜ + KANAL SKU. Biri unutulursa kullanıcı elindeki
 * kodla ürünü bulamaz ve "sistem çalışmıyor" der — haklı olarak.
 */
const serbest = kapsananRoller(aramaKosulu("ABC"));
for (const rol of KOD_ROLLERI) {
  kontrol(`serbest arama ${rol} alanını kapsıyor`, serbest.includes(rol));
}
kontrol(
  "  ...ürün adı da aranıyor (kodu bilmeyen adıyla bulur)",
  JSON.stringify(aramaKosulu("ABC")).includes('"product"'),
);

const okutma = kapsananRoller(kodKosulu("ABC"));
for (const rol of KOD_ROLLERI) {
  kontrol(`okutulan kod ${rol} alanını kapsıyor`, okutma.includes(rol));
}

/**
 * OKUTMADA KISMİ EŞLEŞME YASAK. Okutulan koda BENZEYEN başka bir ürün
 * eklenirse yanlış satış kaydedilir ve stok yanlış düşer — sessiz, pahalı
 * bir hata. Serbest aramada ise kısmi eşleşme ŞART.
 */
kontrol(
  "okutmada KISMİ eşleşme yok (yanlış ürün eklenmesin)",
  !JSON.stringify(kodKosulu("ABC")).includes("contains"),
);
kontrol(
  "  ...serbest aramada kısmi eşleşme VAR (insan tam kod yazmaz)",
  JSON.stringify(aramaKosulu("ABC")).includes("contains"),
);
kontrol(
  "  ...okutmada ürün adı aranmıyor (okuyucu ad okumaz)",
  !JSON.stringify(kodKosulu("ABC")).includes('"product"'),
);

/**
 * PASİF EŞLEŞME ÜRÜN GETİRMEZ. Kapatılmış bir listing'in kodu hâlâ ürün
 * getirseydi, artık satılmayan bir eşleşme satışa girerdi.
 */
kontrol(
  "kanal kodu araması yalnız AKTİF eşleşmeye bakıyor",
  JSON.stringify(aramaKosulu("ABC")).includes('"isActive":true') &&
    JSON.stringify(kodKosulu("ABC")).includes('"isActive":true'),
);

console.log("");
console.log("=".repeat(70));
console.log("SONUÇ SATIRINDA GÖRÜNEN KODLAR");
console.log("=".repeat(70));

/**
 * Kullanıcı pazaryeri koduyla ürünü bulduğunda o kodu SATIRDA görmeli;
 * görmezse doğru ürüne baktığından emin olamaz (İlke #3).
 */
const ornek = {
  id: "v1",
  urunAdi: "Ürün",
  marka: null,
  varyantAdi: null,
  sku: "axcali1752",
  companySku: "FRM-1",
  barcode: "8690000000001",
  kanalKodlari: [
    { kanal: "Hepsiburada", kod: "HBCV00009C3LML" },
    { kanal: "Trendyol", kod: "TY-42" },
  ],
};
const dizi = kodDizisi(ornek);
kontrol("sonuç satırı kanal kodunu yazıyor", dizi.includes("HBCV00009C3LML"));
kontrol("  ...kanal ADI da yazıyor (hangi pazaryeri belli)", dizi.includes("Hepsiburada"));
kontrol("  ...birden fazla kanal kodu KIRPILMIYOR", dizi.includes("TY-42"));
kontrol(
  "  ...sistem kodları da duruyor (SKU · Firma SKU · barkod)",
  dizi.includes("axcali1752") &&
    dizi.includes("FRM-1") &&
    dizi.includes("8690000000001"),
);
kontrol(
  "barkodu olmayan varyantta boş ayraç kalmıyor",
  !kodDizisi({ ...ornek, barcode: null, kanalKodlari: [] }).includes("· ·"),
);

console.log("");
console.log("=".repeat(70));
if (kalan === 0) {
  console.log(`TÜM KONTROLLER GEÇTİ (${gecen})`);
} else {
  console.log(`${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrolden)`);
  process.exit(1);
}
