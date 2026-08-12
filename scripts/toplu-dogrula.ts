/**
 * ============================================================================
 *  TOPLU GÜNCELLEME DOĞRULAMA
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run toplu:dogrula
 *
 *  Bu dosya SQL üretiyor; en tehlikeli hata "hızlı ama yanlış" olmasıdır —
 *  satırlar birbirinin değerini alırsa kimse fark etmez. Bu yüzden testler
 *  hızı değil ÖNCE DOĞRULUĞU sınıyor:
 *    - her satır KENDİ değerini aldı mı
 *    - listede olmayan satır DEĞİŞMEDEN kaldı mı
 *    - null yazılabiliyor mu
 *    - bir kolonu verilmeyen satır o kolonu KORUDU mu
 *    - paket sınırını aşan liste doğru bölünüyor mu
 *
 *  YEREL VERİTABANINDA çalışır ve yazdığı her şeyi GERİ ALIR (transaction
 *  bilerek hata ile kapatılır).
 * ============================================================================
 */

import "dotenv/config";

import { prisma } from "../src/lib/prisma";
import { topluGuncelle } from "../src/lib/toplu-guncelle";

let basarisiz = 0;
let calisan = 0;

function kontrol(ad: string, kosul: boolean, ayrinti?: unknown) {
  calisan++;
  if (kosul) console.log(`  OK    ${ad}`);
  else {
    basarisiz++;
    console.log(`  HATA  ${ad}`);
    if (ayrinti !== undefined) console.log("        ", ayrinti);
  }
}

const GERI_AL = "TEST_GERI_AL";

async function main() {
  const adres = process.env.DATABASE_URL ?? "";
  if (!/@(localhost|127\.0\.0\.1|::1)[:/]/.test(adres)) {
    console.log("\nATLANDI — DATABASE_URL yerel değil. Bu betik veritabanına YAZAR.\n");
    return;
  }

  const varyantlar = await prisma.productVariant.findMany({
    select: { id: true, name: true, companySku: true, barcode: true },
    take: 5,
  });

  if (varyantlar.length < 3) {
    console.log("\nATLANDI — en az 3 varyant gerekiyor (yerelde yok).\n");
    return;
  }

  // =========================================================================
  console.log("\n1) DOĞRULUK — her satır KENDİ değerini alıyor mu");
  // =========================================================================
  try {
    await prisma.$transaction(async (tx) => {
      const hedefler = varyantlar.slice(0, 3);
      const dokunulmayan = varyantlar[3] ?? null;

      const yazilan = await topluGuncelle(
        tx as never,
        "ProductVariant",
        hedefler.map((v, i) => ({
          id: v.id,
          degerler: { name: `TOPLU-TEST-${i}` },
        })),
      );
      kontrol("3 satır yazıldı", yazilan === 3, yazilan);

      const sonra = await tx.productVariant.findMany({
        where: { id: { in: hedefler.map((v) => v.id) } },
        select: { id: true, name: true },
      });
      const harita = new Map(sonra.map((s) => [s.id, s.name]));

      let hepsiDogru = true;
      for (const [i, v] of hedefler.entries()) {
        if (harita.get(v.id) !== `TOPLU-TEST-${i}`) hepsiDogru = false;
      }
      kontrol(
        "her satır kendi değerini aldı (karışmadı)",
        hepsiDogru,
        [...harita.values()].join(" · "),
      );

      if (dokunulmayan) {
        const d = await tx.productVariant.findUnique({
          where: { id: dokunulmayan.id },
          select: { name: true },
        });
        kontrol(
          "listede olmayan satır DEĞİŞMEDİ",
          d?.name === dokunulmayan.name,
          `${dokunulmayan.name} -> ${d?.name}`,
        );
      }

      // --- NULL yazılabiliyor mu ---
      await topluGuncelle(tx as never, "ProductVariant", [
        { id: hedefler[0].id, degerler: { name: null } },
      ]);
      const nullSonuc = await tx.productVariant.findUnique({
        where: { id: hedefler[0].id },
        select: { name: true },
      });
      kontrol("null yazılabiliyor", nullSonuc?.name === null, nullSonuc?.name);

      // --- KOLONU VERİLMEYEN SATIR O KOLONU KORUR ---
      // Bir satır name, öteki barcode güncelliyor. ELSE dalı olmasaydı
      // ötekinin name'i NULL'a düşerdi — sessiz veri kaybı.
      await topluGuncelle(tx as never, "ProductVariant", [
        { id: hedefler[1].id, degerler: { name: "SADECE-AD" } },
        { id: hedefler[2].id, degerler: { companySku: "SADECE-KOD" } },
      ]);
      const karma = await tx.productVariant.findMany({
        where: { id: { in: [hedefler[1].id, hedefler[2].id] } },
        select: { id: true, name: true, companySku: true },
      });
      const ikinci = karma.find((k) => k.id === hedefler[1].id)!;
      const ucuncu = karma.find((k) => k.id === hedefler[2].id)!;
      kontrol("adı güncellenen satırın adı doğru", ikinci.name === "SADECE-AD");
      kontrol(
        "kodu güncellenen satırın ADI KORUNDU (ELSE dalı)",
        ucuncu.name === `TOPLU-TEST-2`,
        `beklenen TOPLU-TEST-2, gelen ${ucuncu.name}`,
      );
      kontrol("kodu güncellenen satırın kodu doğru", ucuncu.companySku === "SADECE-KOD");

      throw new Error(GERI_AL);
    });
  } catch (e) {
    if (!String(e).includes(GERI_AL)) throw e;
  }

  // =========================================================================
  console.log("\n2) GERİ ALMA — test yazımları kalmadı mı");
  // =========================================================================
  const kalanlar = await prisma.productVariant.count({
    where: {
      OR: [
        { name: { startsWith: "TOPLU-TEST" } },
        { name: "SADECE-AD" },
        { companySku: "SADECE-KOD" },
      ],
    },
  });
  kontrol("test kaydı kalmadı (işlem geri alındı)", kalanlar === 0, kalanlar);

  // =========================================================================
  console.log("\n3) PAKETLEME — sınırı aşan liste doğru bölünüyor mu");
  // =========================================================================
  try {
    await prisma.$transaction(async (tx) => {
      const hepsi = await tx.productVariant.findMany({ select: { id: true } });
      if (hepsi.length < 3) return;

      // Paket boyutu 2 verilerek 2'şerli bölünme zorlanıyor.
      const yazilan = await topluGuncelle(
        tx as never,
        "ProductVariant",
        hepsi.map((v, i) => ({ id: v.id, degerler: { name: `PAKET-${i}` } })),
        2,
      );
      kontrol(
        `${hepsi.length} satır, 2'şerli paketle yazıldı`,
        yazilan === hepsi.length,
        `yazılan ${yazilan}`,
      );

      const ornek = await tx.productVariant.findMany({ select: { name: true } });
      const benzersiz = new Set(ornek.map((o) => o.name));
      kontrol(
        "paket sınırında değerler karışmadı",
        benzersiz.size === hepsi.length,
        `${benzersiz.size} benzersiz / ${hepsi.length}`,
      );

      throw new Error(GERI_AL);
    });
  } catch (e) {
    if (!String(e).includes(GERI_AL)) throw e;
  }

  // =========================================================================
  console.log("\n4) KORUMA — kod içinden gelmeyen ad reddediliyor mu");
  // =========================================================================
  {
    let atti = false;
    try {
      await topluGuncelle({ $executeRawUnsafe: async () => 0 }, "Urun; DROP TABLE x", [
        { id: "a", degerler: { name: "x" } },
      ]);
    } catch {
      atti = true;
    }
    kontrol("bozuk tablo adı reddedildi", atti);

    let attiKolon = false;
    try {
      await topluGuncelle({ $executeRawUnsafe: async () => 0 }, "ProductVariant", [
        { id: "a", degerler: { "name = 1, x": "y" } },
      ]);
    } catch {
      attiKolon = true;
    }
    kontrol("bozuk kolon adı reddedildi", attiKolon);

    const bos = await topluGuncelle(
      { $executeRawUnsafe: async () => 99 },
      "ProductVariant",
      [],
    );
    kontrol("boş liste hiç sorgu atmaz", bos === 0, bos);
  }

  await prisma.$disconnect();

  console.log("\n" + "=".repeat(70));
  if (basarisiz === 0) console.log(`TÜM KONTROLLER GEÇTİ (${calisan})`);
  else {
    console.log(`${basarisiz} KONTROL BAŞARISIZ (${calisan} kontrolden)`);
    process.exitCode = 1;
  }
  console.log("");
}

main().catch(async (e) => {
  console.error("BEKLENMEYEN HATA:", e);
  await prisma.$disconnect();
  process.exitCode = 1;
});
