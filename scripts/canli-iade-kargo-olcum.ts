import { readFileSync } from "node:fs";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import readXlsxFile from "read-excel-file/node";

import { PrismaClient } from "../src/generated/prisma/client";
import { paketiNormalle } from "../src/lib/tablo/paket";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  İADE TÜRÜ ÖLÇÜLEBİLİR Mİ — HAKEDİŞ KARGO SATIRLARI (SALT OKUMA)
 * ----------------------------------------------------------------------------
 *      npm run canli:iade-kargo-olcum
 *
 *  ⭐ KULLANICI BİR ÖLÇÜT VERDİ (28.08.2026):
 *     "Müşteri kargoda iptal ederse TEK kargo bize yansıyor."
 *  Bu, `returnType`i TAHMİN etmeden ÖLÇMENİN yolu olabilir: kanalın kendi
 *  ekstresinde o siparişin kaç kargo bacağı kesilmiş?
 *
 *  ⛔ AMA ÖNCE KAPSAM: ekstremiz o siparişleri görüyor mu? Görmüyorsa
 *  ölçüt teslim edilemez ve bunu SÖYLEMEK gerekir.
 *
 *  ⛔ HÜKÜM YOK, YAZMA YOK.
 * ============================================================================
 */

const LISTE = "C:/Users/yapra/Desktop/excel/Unbenannte Tabelle.xlsx";

async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) { console.log("\n⛔ CANLI ADRES OKUNAMADI\n"); process.exitCode = 1; return; }
  const p = new PrismaClient({ adapter: new PrismaMariaDb(c.veri.ham) });

  const s = (await readXlsxFile(paketiNormalle(readFileSync(LISTE)).bayt))[0];
  const b = s.data[0].map((h) => String(h ?? "").trim());
  const i = (a: string) => b.indexOf(a);
  const iadeNo = [...new Set(s.data.slice(1)
    .filter((r) => String(r[i("TÜR")] ?? "").trim() === "iade")
    .map((r) => String(r[i("Sipariş Numarası")] ?? "").trim())
    .filter((x) => x !== ""))];

  console.log("\n" + "=".repeat(100));
  console.log("İADE TÜRÜ ÖLÇÜLEBİLİR Mİ — EKSTRE KAPSAMI");
  console.log("=".repeat(100));
  console.log("\n   dosyadaki iade siparişi : " + iadeNo.length);

  const kod = new Map<string, number>();
  const say = new Map<string, { satir: number; kargo: number }>();
  for (let k = 0; k < iadeNo.length; k += 400) {
    for (const x of await p.settlementItem.findMany({
      where: { orderNo: { in: iadeNo.slice(k, k + 400) } },
      select: { orderNo: true, code: true, amount: true, rawType: true },
    })) {
      kod.set(x.code, (kod.get(x.code) ?? 0) + 1);
      const v = say.get(x.orderNo!) ?? { satir: 0, kargo: 0 };
      v.satir++;
      if (x.code.includes("KARGO")) v.kargo++;
      say.set(x.orderNo!, v);
    }
  }
  console.log("   ⭐ EKSTREDE GÖRÜLEN     : " + say.size + " sipariş" +
    "   (" + (say.size / iadeNo.length * 100).toFixed(1) + "%)");
  console.log("   ⛔ EKSTREDE HİÇ YOK     : " + (iadeNo.length - say.size));
  console.log("\n   ekstre satır kodları: " +
    ([...kod].sort((a, x) => x[1] - a[1]).map(([k, v]) => k + "=" + v).join(" · ") || "—"));

  const kargoliOlan = [...say.values()].filter((v) => v.kargo > 0).length;
  console.log("\n   kargo satırı OLAN sipariş : " + kargoliOlan);
  if (kargoliOlan > 0) {
    const dagilim = new Map<number, number>();
    for (const v of say.values()) if (v.kargo > 0) dagilim.set(v.kargo, (dagilim.get(v.kargo) ?? 0) + 1);
    console.log("   kargo BACAK SAYISI dağılımı: " +
      [...dagilim].sort().map(([k, v]) => k + " bacak=" + v).join(" · "));
  }

  console.log("\n   ⚠ HÜKÜM:");
  if (say.size === 0) {
    console.log("     ⛔ ÖLÇÜT TESLİM EDİLEMİYOR. Kullanıcının ölçütü DOĞRU ama");
    console.log("       ekstremiz bu siparişlerin HİÇBİRİNİ görmüyor — kargo");
    console.log("       bacağını sayacak veri elimizde YOK.");
    console.log("     → `returnType` bugün ÖLÇÜLEMEZ; kanal ekstresi yüklenmeden");
    console.log("       tahmin etmek yasak.");
  } else if (kargoliOlan === 0) {
    console.log("     ⚠ Siparişler ekstrede VAR ama KARGO satırı yok — bu kanalın");
    console.log("       ekstresi kargoyu ayrı satır olarak taşımıyor olabilir.");
  } else {
    console.log("     ⭐ ÖLÇÜT TESLİM EDİLEBİLİR görünüyor — " + kargoliOlan + " siparişte");
    console.log("       kargo bacağı SAYILABİLİYOR. Kapsam yukarıda yazıyor.");
  }

  console.log("\n" + "=".repeat(100));
  console.log("SALT OKUMA — HİÇBİR ŞEY YAZILMADI.");
  console.log("=".repeat(100) + "\n");
  await p.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
