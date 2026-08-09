/**
 * ============================================================================
 *  KARGO TARİFESİ DOĞRULAMA — salt okunur
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run tarife:dogrula
 *
 *  Veritabanına yazılan tarifeyi KAYNAK EXCEL'le karşılaştırır. Her kanal ×
 *  firma için birkaç desi noktası örneklenir; bir kuruş fark bile hata sayılır.
 *
 *  Seed'den sonra bunu çalıştırmak zorunludur: yanlış kargo tarifesi doğrudan
 *  yanlış kâr demektir ve hata sessizce ilerler.
 * ============================================================================
 */

import "dotenv/config";

import { prisma } from "../src/lib/prisma";
import { tutarCoz, xlsxOku } from "../prisma/seed-xlsx";

const TARIFE_DOSYASI = "veri/kargo-tarifeleri.xlsx";

const SAYFALAR = [
  {
    kanal: "TRENDYOL",
    sayfaAdi: "trendyol güncel kargo",
    baslikSatiri: 3,
    ilkVeriSatiri: 4,
  },
  {
    kanal: "HEPSIBURADA",
    sayfaAdi: "hepsiburada güncel kargo ücretl",
    baslikSatiri: 2,
    ilkVeriSatiri: 3,
  },
];

const FIRMA_KODU: { desen: RegExp; code: string }[] = [
  { desen: /^aras/i, code: "ARAS" },
  { desen: /^dhl/i, code: "DHL" },
  { desen: /^hepsijet xl/i, code: "HEPSIJET_XL" },
  { desen: /^hepsijet/i, code: "HEPSIJET" },
  { desen: /^kolay gelsin/i, code: "KOLAY_GELSIN" },
  { desen: /^ptt/i, code: "PTT" },
  { desen: /^sürat|^surat/i, code: "SURAT" },
  { desen: /^tex/i, code: "TEX" },
  { desen: /^yurtiçi|^yurtici/i, code: "YURTICI" },
  { desen: /^ceva tedarik/i, code: "CEVA_TEDARIK" },
  { desen: /^ceva/i, code: "CEVA" },
  { desen: /^horoz/i, code: "HOROZ" },
];

/** Örneklenecek desi noktaları — düşük, orta, yüksek. */
const ORNEK_DESILER = [0, 1, 5, 30, 60, 100, 101, 250, 500, 1500, 4500];

let kontrol = 0;
let hata = 0;

async function main() {
  const kitap = xlsxOku(TARIFE_DOSYASI);

  const kanallar = new Map(
    (await prisma.channel.findMany({ select: { id: true, code: true } })).map(
      (c) => [c.code, c.id],
    ),
  );
  const firmalar = new Map(
    (await prisma.cargoCarrier.findMany({ select: { id: true, code: true } })).map(
      (c) => [c.code, c.id],
    ),
  );

  for (const tanim of SAYFALAR) {
    const sayfa = kitap.get(tanim.sayfaAdi)!;
    const baslik = sayfa[tanim.baslikSatiri]!;
    const channelId = kanallar.get(tanim.kanal)!;

    console.log(`\n${"=".repeat(78)}\n${tanim.kanal}\n${"=".repeat(78)}`);
    console.log(
      "firma".padEnd(15) +
        "desi".padEnd(7) +
        "Excel".padEnd(15) +
        "Veritabanı".padEnd(15) +
        "sonuç",
    );

    for (let j = 0; j < baslik.length - 1; j++) {
      const ham = baslik[j + 1];
      if (!ham) continue;
      const firma = FIRMA_KODU.find((f) => f.desen.test(ham.replace(/\s+/g, " ").trim()));
      if (!firma) continue;
      const carrierId = firmalar.get(firma.code);
      if (!carrierId) continue;

      for (const desi of ORNEK_DESILER) {
        const satir = sayfa.find(
          (r) => r && r[0] !== undefined && Number(r[0]) === desi,
        );
        if (!satir) continue;

        const excel = tutarCoz(satir[j + 1]);
        const kayit = await prisma.cargoTariff.findFirst({
          where: { channelId, carrierId, desi },
          select: { amount: true },
        });
        const veritabani = kayit ? Number(kayit.amount.toString()) : null;

        kontrol++;

        // Excel'de geçerli değer yoksa veritabanında da OLMAMALI.
        if (excel === null) {
          const dogru = veritabani === null;
          if (!dogru) hata++;
          console.log(
            firma.code.padEnd(15) +
              String(desi).padEnd(7) +
              "(yok)".padEnd(15) +
              String(veritabani ?? "(yok)").padEnd(15) +
              (dogru ? "OK" : "HATA — Excel'de yok ama yazılmış"),
          );
          continue;
        }

        // Bozuk hücre kuralı: HB hepsiJET desi>60 ve Kolay Gelsin desi>60,
        // TY Sürat/Yurtiçi desi>100 bilerek yazılmadı.
        const bilerekAtlandi =
          veritabani === null &&
          ((tanim.kanal === "HEPSIBURADA" &&
            (firma.code === "HEPSIJET" || firma.code === "KOLAY_GELSIN") &&
            desi > 60) ||
            (tanim.kanal === "TRENDYOL" &&
              (firma.code === "SURAT" || firma.code === "YURTICI") &&
              desi > 100));

        if (bilerekAtlandi) {
          console.log(
            firma.code.padEnd(15) +
              String(desi).padEnd(7) +
              String(excel).padEnd(15) +
              "(yok)".padEnd(15) +
              "OK — geçerli aralık dışı, bilerek yazılmadı",
          );
          continue;
        }

        const esit = veritabani !== null && Math.abs(veritabani - excel) < 0.005;
        if (!esit) hata++;
        console.log(
          firma.code.padEnd(15) +
            String(desi).padEnd(7) +
            excel.toFixed(2).padEnd(15) +
            String(veritabani?.toFixed(2) ?? "(yok)").padEnd(15) +
            (esit ? "OK" : "HATA"),
        );
      }
    }
  }

  console.log(`\n${"=".repeat(78)}`);
  console.log(`kontrol: ${kontrol}   hata: ${hata}`);
  console.log(
    hata === 0
      ? "TARİFE VERİTABANI KAYNAK EXCEL İLE BİREBİR"
      : `${hata} FARK VAR — İNCELE`,
  );
  process.exit(hata === 0 ? 0 : 1);
}

void main();
