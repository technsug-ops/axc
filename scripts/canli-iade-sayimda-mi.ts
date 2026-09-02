/**
 * ============================================================================
 *  K136a — İADE MALI 27.08 SAYIMINDA ZATEN VAR MIYDI · SALT OKUMA
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run canli:iade-sayimda-mi
 *
 *  BETIK SINIFI: TEK_SEFERLIK — 8 siparişin yazım kapısı. HİÇBİR ŞEY YAZMAZ.
 *
 *  ── SORDUĞU SORU ─────────────────────────────────────────────────────────
 *  Halil 02.09.2026'da sebepleri verdi ve sekizi de MÜŞTERİ İADESİ çıktı
 *  ("Yanlış sipariş verdim" · "Küçük geldi" · "Beğenmedim"). Yani mal
 *  müşteriye ULAŞTI ve GERİ DÖNDÜ — hasar iddiası hiçbirinde yok.
 *
 *  ⛔ BURADAN "soundQuantity = adet" SONUCU DOĞRUDAN ÇIKMAZ. Çünkü mal
 *  27.08 sayımından ÖNCE rafa döndüyse Halil onu ZATEN SAYDI; şimdi
 *  `RETURN_IN` yazmak aynı malı İKİNCİ KEZ stoğa sokar.
 *
 *  ⭐ VE BUNUN AYIRT EDİCİ KANITI SAYIMIN KENDİ SATIRINDA:
 *  `kapsamdaydi = false` demek, sistemin BOŞ sandığı yerde MAL BULUNDU
 *  demektir (şema: "doğrudan FAZLA'dır ... sistemin boş sandığı yerde mal
 *  bulunması bulgunun kendisidir"). Kayıtsız bir iadenin rafa dönmüş hâli
 *  TAM OLARAK böyle görünür.
 *
 *  ⚠ AMA "BÖYLE GÖRÜNÜR" KANIT DEĞİLDİR — RAKİP OKUMA DA VAR: fazla mal
 *  eksik girilmiş bir alımdan da gelebilir. Bu yüzden betik hüküm vermez;
 *  üç kovayı AYRI sayar ve rakip okumayı eleyip elemediğini söyler.
 *  _(Anayasa: "iki okumayla da uyumlu bir gözlem, hiçbirini kanıtlamaz".)_
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

/** Halil'in beyanı 02.09.2026 — kendi kelimeleriyle. */
const SEBEP: Record<string, string> = {
  "4068972350": "Yanlış sipariş verdim",
  "4287210000": "Yanlış sipariş verdim",
  "4446089356": "Yanlış sipariş verdim",
  "4586626981": "Yanlış sipariş verdim",
  "4903455009": "Küçük geldi",
  "11385159467": "Yanlış sipariş verdim",
  "11409234590": "Beğenmedim",
  "11438301199": "Yanlış sipariş verdim",
};

function gun(d: Date | null | undefined): string {
  return d === null || d === undefined ? "—" : d.toISOString().slice(0, 10);
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
  console.log("  İADE MALI SAYIMDA ZATEN VAR MIYDI (salt okuma)");
  console.log("=".repeat(78));

  /**
   * ① EKSTRE TARİHİ — iadenin kanalda İŞLENDİĞİ an.
   *
   * ⚠ Bu "malın rafa döndüğü an" DEĞİLDİR; ona en yakın ÖLÇÜLEBİLİR
   * damgadır. Kanal iadeyi işlediğinde mal ya yoldadır ya gelmiştir.
   * _(Anayasa: "kolon başlığı bir iddiadır" — damgayı olduğundan fazla
   * kesin göstermemek için ne olduğu burada yazılı.)_
   */
  const kalemler = await prisma.settlementItem.findMany({
    where: { orderNo: { in: SIPARISLER }, code: { contains: "IADE" } },
    select: {
      orderNo: true,
      code: true,
      settlement: {
        select: { code: true, paidAt: true, periodStart: true, periodEnd: true },
      },
    },
  });

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
              product: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  let sayilmis = 0;
  let sayilmamis = 0;
  let olculemez = 0;

  for (const kod of SIPARISLER) {
    const s = satislar.find((x) => x.code === kod);
    console.log("\n" + "-".repeat(78));
    if (!s) {
      console.log(`  ${kod}  ⛔ DEFTERDE SATIŞ YOK`);
      olculemez += 1;
      continue;
    }

    const ek = kalemler.filter((k) => k.orderNo === kod);
    /** Ekstrenin en erken damgası — iade en geç o gün kanalda işlenmiş. */
    const damgalar = ek
      .map((k) => k.settlement.periodEnd ?? k.settlement.paidAt)
      .filter((d): d is Date => d !== null && d !== undefined)
      .sort((a, b) => a.getTime() - b.getTime());
    const ekstreAni = damgalar[0] ?? null;

    console.log(
      `  ${kod}  ·  satış ${gun(s.soldAt)}  ·  ekstre damgası ${gun(
        ekstreAni,
      )}  ·  "${SEBEP[kod] ?? "—"}"`,
    );

    for (const it of s.items) {
      const satirlar = await prisma.stokSayimSatiri.findMany({
        where: { variantId: it.variant.id },
        select: {
          sayilanAdet: true,
          kapsamdaydi: true,
          damgaSistemAdedi: true,
          /**
           * ⭐ BELİRLEYİCİ ALAN: düzeltme YAZILDIYSA sayımın bulduğu fazla
           * ledger'a girmiş demektir — mal stokta ZATEN VAR. O hâlde
           * `soundQuantity` yazmak kesin çift sayımdır, "risk" değil.
           */
          duzeltmeYazildiAt: true,
          hareketler: { select: { quantityDelta: true, type: true } },
          sayim: { select: { kod: true, sayimGunu: true } },
        },
        orderBy: { sayim: { sayimGunu: "asc" } },
      });

      console.log(
        `     ${it.variant.sku.padEnd(15)} iade ${it.quantity} adet  ` +
          it.variant.product.name.slice(0, 30),
      );

      /** Sayılmış satırlar — `null` (SAYILMADI) hüküm vermez. */
      const gecerli = satirlar.filter((r) => r.sayilanAdet !== null);
      if (gecerli.length === 0) {
        console.log(
          "        ⚠ BU VARYANT SAYILMAMIŞ → mal sayımda var mıydı," +
            " ÖLÇÜLEMEZ. 'Yoktu' DEMEK DEĞİL.",
        );
        olculemez += 1;
        continue;
      }

      for (const r of gecerli) {
        const sayimSonra =
          ekstreAni !== null &&
          r.sayim.sayimGunu.getTime() >= ekstreAni.getTime();
        console.log(
          `        ${r.sayim.kod.padEnd(20)} ${gun(r.sayim.sayimGunu)}` +
            `  sayılan ${String(r.sayilanAdet).padStart(3)}` +
            `  damga ${String(r.damgaSistemAdedi ?? "—").padStart(3)}` +
            (r.kapsamdaydi ? "" : "  ⭐ KAPSAM DIŞI = doğrudan FAZLA"),
        );
        console.log(
          `           düzeltme ${
            r.duzeltmeYazildiAt === null
              ? "YAZILMADI — fazla ledger'a GİRMEDİ"
              : `YAZILDI ${gun(r.duzeltmeYazildiAt)} — fazla ledger'a GİRDİ`
          }` +
            (r.hareketler.length > 0
              ? `  ·  hareket: ${r.hareketler
                  .map((h) => `${h.type} ${h.quantityDelta > 0 ? "+" : ""}${h.quantityDelta}`)
                  .join(" · ")}`
              : "  ·  hareket YOK"),
        );

        if (!r.kapsamdaydi) {
          /**
           * ⭐ EN GÜÇLÜ İŞARET: sistem burada mal OLMADIĞINI sanıyordu ve
           * mal bulundu. Kayıtsız iadenin rafa dönmüş hâli tam budur.
           */
          console.log(
            "           ⛔ SİSTEM BOŞ SANIYORDU, MAL BULUNDU. İade malı" +
              " zaten SAYILMIŞ olabilir → RETURN_IN çift sayar.",
          );
        }
        if (sayimSonra) {
          console.log(
            `           ⚠ sayım (${gun(r.sayim.sayimGunu)}) ekstre` +
              ` damgasından (${gun(ekstreAni)}) SONRA — mal dönmüş olabilir`,
          );
        } else if (ekstreAni !== null) {
          console.log(
            `           ✓ sayım ekstre damgasından ÖNCE — iade o an henüz` +
              " kanalda işlenmemişti",
          );
        }
      }

      /**
       * ⛔ HÜKÜM KOVASI — iki şart BİRDEN gerekli:
       *   · sayım, iadenin kanalda işlendiği andan SONRA
       *   · ve o sayımda mal fiilen SAYILDI (adet > 0)
       * Biri eksikse "sayıldı" denemez.
       */
      /**
       * ⭐ HÜKMÜ BELİRLEYEN ŞEY SAYIM DEĞİL, DÜZELTMENİN YAZILIP YAZILMADIĞI.
       *
       * İlk yazımda ölçüt "sayım satıştan sonra mı" idi ve üç siparişe
       * "çift sayım riski" dedi. `duzeltmeYazildiAt` ölçülünce hüküm
       * ÇEVRİLDİ: düzeltme HİÇBİRİNDE yazılmamış, yani sayımın bulduğu
       * fazla ledger'a GİRMEMİŞ. Mal fiziksel olarak rafta ama defterde
       * YOK — `soundQuantity` yazmak defteri fizikle BULUŞTURUR, çift
       * saymaz.
       * _(Anayasa: "alanın dolu olması, olayın gerçekleştiğini göstermez" —
       * sayım satırının VARLIĞI, düzeltmenin YAZILDIĞINI söylemiyordu.)_
       */
      const yazilmisDuzeltme = gecerli.filter(
        (r) => r.duzeltmeYazildiAt !== null,
      );
      const acikFazla = gecerli.filter(
        (r) => r.duzeltmeYazildiAt === null && (r.sayilanAdet ?? 0) > 0,
      );

      if (yazilmisDuzeltme.length > 0) {
        console.log(
          "        ⛔ HÜKÜM: sayım düzeltmesi YAZILMIŞ — fazla ledger'da." +
            " `soundQuantity` yazmak ÇİFT SAYAR.",
        );
        sayilmis += 1;
      } else if (acikFazla.length > 0) {
        console.log(
          "        ✓ HÜKÜM: sayım fazlası ledger'a GİRMEMİŞ →" +
            " `soundQuantity` yazmak çift saymaz; defteri fizikle buluşturur.",
        );
        console.log(
          "           ⚠ AMA SAYIM SATIRI AÇIK KALIYOR: aynı adedi ikinci" +
            " bir yol da eklemek isteyecek. İade yazıldıktan sonra o satır" +
            " YENİDEN DEĞERLENDİRİLMELİ (fazla artık AÇIKLANMIŞ olur).",
        );
        sayilmamis += 1;
      } else {
        console.log(
          "        ⚠ ÖLÇÜLEMEZ: sayılmış satır var ama adet 0 ya da damga yok.",
        );
        olculemez += 1;
      }
      if (ekstreAni === null) {
        console.log(
          "        ⚠ EKSTRE DAMGASI YOK → `occurredAt` için kaynak eksik.",
        );
      }
    }
  }

  console.log("\n" + "=".repeat(78));
  console.log("  ÖZET — ÜÇ KOVA AYRI");
  console.log("=".repeat(78));
  console.log(`   ⛔ düzeltme YAZILMIŞ → çift sayar            : ${sayilmis}`);
  console.log(`   ✓  fazla ledger'a girmemiş → çift saymaz     : ${sayilmamis}`);
  console.log(`   ⚠  ÖLÇÜLEMEZ (varyant hiç sayılmamış)        : ${olculemez}`);

  console.log("\n" + "-".repeat(78));
  console.log("  ⛔ HÜKÜM SINIRI. Ekstre damgası 'malın rafa döndüğü an'");
  console.log("     DEĞİL, kanalın iadeyi işlediği andır. Malın fiilen ne");
  console.log("     zaman geldiğini yalnız Halil bilir; bu rapor hangi");
  console.log("     siparişte SORULMASI gerektiğini söyler.");
  console.log("=".repeat(78) + "\n");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("HATA:", e instanceof Error ? e.stack : e);
  process.exitCode = 1;
});
