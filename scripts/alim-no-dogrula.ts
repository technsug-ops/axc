/**
 * ============================================================================
 *  ALIM NUMARASI DOĞRULAMA
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run alim-no:dogrula
 *
 *  Veritabanına GİTMEZ — sahte bir okuyucu verilir. Üç bölüm:
 *  1) SIRA — aynı gün ikinci alım çakışmıyor mu, boşluk doldurulmuyor mu.
 *  2) AYRIM — farklı tedarikçi/gün ayrı sayaç kullanıyor mu.
 *  3) CANLI KODLAR — bugünkü serbest metin kodlar sayaca KARIŞMAMALI.
 * ============================================================================
 */

import { alimNoOlustur } from "../src/lib/alim-no";

let basarisiz = 0;
let calisan = 0;
const BOLUM_SAYISI = 3;
const kosanBolumler: string[] = [];

function kontrol(ad: string, kosul: boolean, ayrinti?: unknown) {
  calisan++;
  if (kosul) {
    console.log(`  OK    ${ad}`);
  } else {
    basarisiz++;
    console.log(`  HATA  ${ad}`);
    if (ayrinti !== undefined) console.log("        ", ayrinti);
  }
}

/** Sahte okuyucu: verilen kod listesini ön eke göre süzer. */
function okuyucu(kodlar: string[]) {
  return {
    purchase: {
      async findMany(args: { where: { code: { startsWith: string } } }) {
        const onEk = args.where.code.startsWith;
        return kodlar.filter((k) => k.startsWith(onEk)).map((code) => ({ code }));
      },
    },
  };
}

// İş saat diliminde 11.08.2026 öğle vakti.
const AN = new Date("2026-08-11T09:00:00Z");

/**
 * Kontroller `main()` içinde: tsx betikleri CJS'e derliyor ve üst seviye
 * await desteklenmiyor. Numara üretimi asenkron olduğu için sarmalanıyor.
 */
async function main() {

// ===========================================================================
console.log("\n1) SIRA");
// ===========================================================================
{
  kontrol(
    "hiç kayıt yoksa 01",
    (await alimNoOlustur(okuyucu([]), "HE", AN)) === "ALM-HE-260811-01",
  );
  kontrol(
    "aynı gün ikinci alım 02",
    (await alimNoOlustur(okuyucu(["ALM-HE-260811-01"]), "HE", AN)) ===
      "ALM-HE-260811-02",
  );
  // Silinen numara YENİDEN KULLANILMAZ: kod yazışmaya girmiş olabilir.
  kontrol(
    "boşluk doldurulmaz (01, 03 -> 04)",
    (await alimNoOlustur(
      okuyucu(["ALM-HE-260811-01", "ALM-HE-260811-03"]),
      "HE",
      AN,
    )) === "ALM-HE-260811-04",
  );
  kosanBolumler.push("sira");
}

// ===========================================================================
console.log("\n2) AYRIM — tedarikçi ve gün ayrı sayar");
// ===========================================================================
{
  const doluGun = ["ALM-HE-260811-01", "ALM-HE-260811-02"];
  kontrol(
    "başka tedarikçi kendi sayacından başlar",
    (await alimNoOlustur(okuyucu(doluGun), "AM", AN)) === "ALM-AM-260811-01",
  );
  kontrol(
    "ertesi gün sayaç sıfırlanır",
    (await alimNoOlustur(okuyucu(doluGun), "HE", new Date("2026-08-12T09:00:00Z"))) ===
      "ALM-HE-260812-01",
  );
  // Almanya'da 11 Ağustos 23:30 -> Türkiye'de 12 Ağustos.
  kontrol(
    "gece yarısı iş saat diliminden çözülür",
    (await alimNoOlustur(okuyucu([]), "HE", new Date("2026-08-11T21:30:00Z"))) ===
      "ALM-HE-260812-01",
  );
  kosanBolumler.push("ayrim");
}

// ===========================================================================
console.log("\n3) CANLI KODLAR SAYACA KARIŞMAZ");
// ===========================================================================
{
  /**
   * Canlıda bugün duran gerçek kodlar. Hepsi tedarikçinin sipariş numarası;
   * hiçbiri ALM- ön ekiyle başlamıyor, dolayısıyla sayacı bozmamalı.
   */
  const CANLI = [
    "405-8780105-5340330",
    "482 929 661 2",
    "471 573 891 0",
    "8720689047586",
    "ewe",
    "25-23",
  ];
  kontrol(
    "eski serbest kodlar sayacı etkilemez",
    (await alimNoOlustur(okuyucu(CANLI), "HE", AN)) === "ALM-HE-260811-01",
  );
  // Başka tedarikçinin kodu da karışmamalı.
  kontrol(
    "başka tedarikçinin numarası sayaca girmez",
    (await alimNoOlustur(
      okuyucu([...CANLI, "ALM-AM-260811-07"]),
      "HE",
      AN,
    )) === "ALM-HE-260811-01",
  );
  kosanBolumler.push("canli");
}
}

// ===========================================================================
async function calistir() {
  await main();

  console.log("");
  if (kosanBolumler.length !== BOLUM_SAYISI) {
    console.log(
      `KOŞUM YARIM KALDI — sonuç GEÇERSİZ (${kosanBolumler.length}/${BOLUM_SAYISI})`,
    );
    process.exit(1);
  } else if (basarisiz === 0) {
    console.log(`TÜM KONTROLLER GEÇTİ (${calisan})`);
    process.exit(0);
  } else {
    console.log(`${basarisiz} KONTROL BAŞARISIZ (${calisan} kontrol içinde)`);
    process.exit(1);
  }
}

calistir();
