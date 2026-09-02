/**
 * ============================================================================
 *  K136a — İADE YAZIMI SAYIMLA ÇAKIŞIYOR MU · SALT OKUMA
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run canli:iade-sayim-cakismasi
 *
 *  BETIK SINIFI: TEK_SEFERLIK — 8 siparişin yazım kapısı. HİÇBİR ŞEY YAZMAZ.
 *
 *  ── NİYE BU ÖLÇÜM ───────────────────────────────────────────────────────
 *  Kuru koşum (`canli:iade-kuru-kosum`) gösterdi ki iki bilinmeyenin toplam
 *  bedeli 22.570,65 ve bunun 21.947,87'si TEK BİR alandan geliyor:
 *  `soundQuantity` (mal stoğa döndü mü). Tür kararı yanında küçük kalıyor.
 *
 *  ⭐ VE BU SORUNUN ÖLÇÜLEBİLİR BİR YANI VAR — ANAYASA ZATEN SÖYLÜYOR:
 *  _"FİZİKSEL SAYIM SON SÖZDÜR ... stok yazan her yol, yazacağı hareketin
 *  İŞ TARİHİ ile o varyantın SON SAYIM DAMGASI arasındaki ilişkiyi bilmek
 *  zorundadır. Sayımdan öncesine yazacaksa SESSİZCE YAZAMAZ."_
 *
 *  ⛔ ÇÜNKÜ ÇİFT SAYIM RİSKİ GERÇEK: iade malı sayımdan ÖNCE rafa döndüyse
 *  Halil onu zaten SAYDI. Şimdi `soundQuantity` yazmak RETURN_IN hareketi
 *  doğurur ve aynı mal İKİ KEZ girer. Tersi de doğru: sayımdan SONRA
 *  döndüyse sayımda yoktu, girmesi gerekir.
 *
 *  ⚠ BU BETİK KARAR VERMEZ. Hangi siparişte çift sayım riski VAR, hangisinde
 *  YOK — onu söyler. Malın fiilen dönüp dönmediğini yalnız Halil bilir.
 * ============================================================================
 */

import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";
import { canliYapilandirma } from "./canli-ortak";

const SIPARISLER = [
  "4068972350",
  "4287210000",
  "4446089356",
  "4586626981",
  "4903455009",
  "11385159467",
  "11409234590",
  "11438301199",
];

function gun(d: Date | null): string {
  return d === null ? "—" : d.toISOString().slice(0, 10);
}

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  const prisma = new PrismaClient({ adapter: new PrismaMariaDb(y.veri.ham) });

  console.log("=".repeat(78));
  console.log("  İADE YAZIMI ↔ FİZİKSEL SAYIM ÇAKIŞMASI (salt okuma)");
  console.log("=".repeat(78));

  /** ① Sayımlar — ne zaman, hangi kapsamda. */
  const sayimlar = await prisma.stokSayimi.findMany({
    select: {
      kod: true,
      sayimGunu: true,
      kapsamTuru: true,
      _count: { select: { satirlar: true } },
    },
    orderBy: { sayimGunu: "asc" },
  });

  console.log("\n① SİSTEMDEKİ FİZİKSEL SAYIMLAR");
  if (sayimlar.length === 0) {
    console.log("   ⛔ HİÇ SAYIM YOK — bu ölçüm hüküm veremez.");
    console.log("      'Sayım yok' ile 'çakışma yok' AYNI ŞEY DEĞİLDİR.");
  }
  for (const s of sayimlar) {
    console.log(
      `   ${s.kod.padEnd(20)} ${gun(s.sayimGunu)}  ${String(
        s.kapsamTuru,
      ).padEnd(10)} ${String(s._count.satirlar).padStart(5)} satır`,
    );
  }

  /** ② Sipariş sipariş — varyantı sayıma girmiş mi, ne zaman. */
  const satislar = await prisma.sale.findMany({
    where: { code: { in: SIPARISLER } },
    select: {
      code: true,
      soldAt: true,
      items: {
        select: {
          quantity: true,
          variant: {
            select: {
              id: true,
              sku: true,
              sayimGecersizAt: true,
              product: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  console.log("\n② SİPARİŞ SİPARİŞ — ÇİFT SAYIM RİSKİ");
  console.log(
    "   Ölçüt: varyant bir sayıma GİRDİYSE ve sayım günü satıştan SONRA ise,",
  );
  console.log(
    "   iade malı o sayımda RAFTA OLMUŞ OLABİLİR → RETURN_IN çift sayar.",
  );

  /**
   * ⚠ BİRİM SİPARİŞTİR, SATIR DEĞİL. İlk yazımda satır sayılıyordu ve özet
   * "toplam sipariş: 8" derken 10 satır sayıyordu — doğru sayı, yanlış
   * etiket. _(Anayasa: "bir sayı etiketiyle taşınır; birim de etikettir".)_
   */
  const riskliler = new Set<string>();
  const temizler = new Set<string>();
  const olculemeyenler = new Set<string>();

  for (const kod of SIPARISLER) {
    const s = satislar.find((x) => x.code === kod);
    console.log("\n   " + "-".repeat(72));
    if (!s) {
      console.log(`   ${kod}  ⛔ DEFTERDE SATIŞ YOK`);
      olculemeyenler.add(kod);
      continue;
    }
    console.log(`   ${kod}  ·  satış ${gun(s.soldAt)}`);

    for (const it of s.items) {
      const satirlar = await prisma.stokSayimSatiri.findMany({
        where: { variantId: it.variant.id },
        select: {
          /** ⛔ null = SAYILMADI · 0 = SAYILDI, RAFTA YOK — şema uyarısı. */
          sayilanAdet: true,
          kapsamdaydi: true,
          damgaSistemAdedi: true,
          sayim: { select: { kod: true, sayimGunu: true } },
        },
        orderBy: { sayim: { sayimGunu: "asc" } },
      });

      console.log(
        `      ${it.variant.sku.padEnd(15)} ${it.quantity} adet  ` +
          it.variant.product.name.slice(0, 30),
      );

      if (satirlar.length === 0) {
        console.log(
          "         ⚠ BU VARYANT HİÇ SAYILMAMIŞ → çakışma ÖLÇÜLEMEZ." +
            " 'Risk yok' DEMEK DEĞİL.",
        );
        olculemeyenler.add(kod);
        continue;
      }

      for (const r of satirlar) {
        const sonra = r.sayim.sayimGunu.getTime() > s.soldAt.getTime();
        /**
         * ⛔ null = SAYILMADI, 0 = SAYILDI/RAFTA YOK. İkisi ekranda da
         * ayrışır; "0" yazıp geçmek şemanın en kritik uyarısını siler.
         */
        const sayilan =
          r.sayilanAdet === null ? "SAYILMADI" : String(r.sayilanAdet);
        console.log(
          `         ${r.sayim.kod.padEnd(20)} ${gun(r.sayim.sayimGunu)}` +
            `  sayılan ${sayilan.padStart(9)}` +
            `  damga ${String(r.damgaSistemAdedi ?? "—").padStart(3)}` +
            (r.kapsamdaydi ? "" : " [kapsam DIŞI]") +
            (sonra
              ? "   ⛔ SATIŞTAN SONRA — iade malı sayılmış OLABİLİR"
              : "   ✓ satıştan önce — iade henüz yoktu"),
        );
        /**
         * ⛔ SIRA ÖNEMLİ: bir siparişin BİR satırı bile riskliyse sipariş
         * risklidir. "Sayılmadı" satırı tek başına ölçülemezdir ama riskli
         * bir kardeşi varsa hükmü DÜŞÜRMEZ.
         */
        if (r.sayilanAdet === null) olculemeyenler.add(kod);
        else if (sonra) riskliler.add(kod);
        else temizler.add(kod);
      }

      if (it.variant.sayimGecersizAt !== null) {
        console.log(
          `         ⚠ SAYIM GEÇERSİZ damgası var: ${gun(
            it.variant.sayimGecersizAt,
          )}`,
        );
      }
    }
  }

  console.log("\n" + "=".repeat(78));
  console.log("  ÖZET — ÜÇ KOVA AYRI SAYILIR");
  console.log("=".repeat(78));
  /** Riskli olan sipariş, ötekilerde de görünse RİSKLİ sayılır. */
  for (const k of riskliler) {
    temizler.delete(k);
    olculemeyenler.delete(k);
  }
  for (const k of temizler) olculemeyenler.delete(k);

  console.log("   BİRİM: SİPARİŞ (satır değil)");
  console.log(
    `   ⛔ sayım satıştan SONRA (çift sayım riski) : ${riskliler.size}` +
      (riskliler.size > 0 ? `   ${[...riskliler].join(" · ")}` : ""),
  );
  console.log(
    `   ✓  sayım satıştan ÖNCE (risk yok)          : ${temizler.size}` +
      (temizler.size > 0 ? `   ${[...temizler].join(" · ")}` : ""),
  );
  console.log(
    `   ⚠  hiç sayılmamış (ÖLÇÜLEMEZ, risk yok DEĞİL) : ${olculemeyenler.size}` +
      (olculemeyenler.size > 0 ? `   ${[...olculemeyenler].join(" · ")}` : ""),
  );
  console.log(
    `   toplam sipariş                              : ${SIPARISLER.length}`,
  );
  const kapsanan = riskliler.size + temizler.size + olculemeyenler.size;
  if (kapsanan !== SIPARISLER.length) {
    console.log(
      `   ⛔ KOVALAR TOPLAMI ${kapsanan} ≠ ${SIPARISLER.length} — sayım hatalı.`,
    );
    process.exitCode = 1;
  }

  console.log("\n" + "-".repeat(78));
  console.log("  ⛔ HÜKÜM YOK. Bu rapor 'mal döndü mü' sorusunu CEVAPLAMAZ —");
  console.log("     onu yalnız Halil bilir. Söylediği şu: hangi siparişte");
  console.log("     'sağlam=hepsi' yazmak çift sayım üretir, hangisinde");
  console.log("     üretmez. Riskli olanlarda karar Halil'e SORULMALIDIR.");
  console.log("=".repeat(78) + "\n");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("HATA:", e instanceof Error ? e.stack : e);
  process.exitCode = 1;
});
