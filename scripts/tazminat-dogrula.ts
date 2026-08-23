import { readFileSync } from "node:fs";
/**
 * ============================================================================
 *  TAZMİNAT DOĞRULAMA
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run tazminat:dogrula
 *
 *  Veritabanına GİTMEZ. Üç bölüm:
 *  1) AÇIK/KAPALI — hangi durum alacak sayılır.
 *  2) TOPLAM — para birimleri toplanmaz, ayrı durur.
 *  3) KALAN ADET — aynı hasar iki kez talep edilemez.
 * ============================================================================
 */

import {
  acikAlacakToplami,
  acikMi,
  kalanTalepEdilebilirAdet,
  karsiTarafAdi,
  karsiTarafGecerliMi,
  varsayilanTalepTutari,
  type TazminatKaydi,
} from "../src/lib/tazminat";

let basarisiz = 0;
let calisan = 0;
const BOLUM_SAYISI = 4;
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

// ===========================================================================
console.log("\n1) AÇIK / KAPALI");
// ===========================================================================
{
  kontrol("OPEN açık", acikMi("OPEN"));
  kontrol("CLAIMED açık", acikMi("CLAIMED"));
  // Tedarikçi kabul etti ama parayı göndermedi — HÂLÂ ALACAK.
  kontrol("ACCEPTED açık (para henüz gelmedi)", acikMi("ACCEPTED"));
  kontrol("REJECTED kapalı", !acikMi("REJECTED"));
  kontrol("SETTLED kapalı", !acikMi("SETTLED"));
  kosanBolumler.push("durum");
}

// ===========================================================================
console.log("\n2) TOPLAM — para birimleri toplanmaz");
// ===========================================================================
{
  const kayitlar: TazminatKaydi[] = [
    { durum: "OPEN", tutar: 100, paraBirimi: "TRY" },
    { durum: "CLAIMED", tutar: 250, paraBirimi: "TRY" },
    { durum: "ACCEPTED", tutar: 50, paraBirimi: "EUR" },
    { durum: "REJECTED", tutar: 999, paraBirimi: "TRY" },
    { durum: "SETTLED", tutar: 888, paraBirimi: "EUR" },
  ];
  const toplam = acikAlacakToplami(kayitlar);

  kontrol("iki para birimi ayrı satır", toplam.length === 2, toplam);
  kontrol(
    "TRY = 350 (reddedilen girmez)",
    toplam.find((t) => t.paraBirimi === "TRY")?.tutar === 350,
    toplam,
  );
  kontrol(
    "EUR = 50 (kapanan girmez)",
    toplam.find((t) => t.paraBirimi === "EUR")?.tutar === 50,
    toplam,
  );
  kontrol("kayıt yoksa boş liste", acikAlacakToplami([]).length === 0);
  // Hepsi kapalıysa toplam satırı hiç üretilmez — sıfır göstermek yanlış
  // olurdu, "alacak yok" ile "hesaplanamadı" ayrı şeyler.
  kontrol(
    "hepsi kapalıysa satır yok",
    acikAlacakToplami([
      { durum: "SETTLED", tutar: 10, paraBirimi: "TRY" },
      { durum: "REJECTED", tutar: 20, paraBirimi: "TRY" },
    ]).length === 0,
  );
  kosanBolumler.push("toplam");
}

// ===========================================================================
console.log("\n3) KALAN ADET — aynı hasar iki kez talep edilemez");
// ===========================================================================
{
  kontrol("3 hasar, talep yok -> 3", kalanTalepEdilebilirAdet(3, []) === 3);
  kontrol("3 hasar, 1 talep -> 2", kalanTalepEdilebilirAdet(3, [1]) === 2);
  kontrol("3 hasar, 1+2 talep -> 0", kalanTalepEdilebilirAdet(3, [1, 2]) === 0);
  // Reddedilen talep de düşülür: yeniden görüşülecekse o kayıt açılır,
  // ikinci bir kayıt değil.
  kontrol("fazla talep negatife düşmez", kalanTalepEdilebilirAdet(2, [5]) === 0);
  kontrol("hasar yoksa 0", kalanTalepEdilebilirAdet(0, []) === 0);

  // KAYAN NOKTA TUZAĞI: 3 * 149.9 === 449.70000000000005
  // Decimal alanına o hâliyle yazılmasın diye tutar METİN olarak,
  // alanın kesinliğine yuvarlanmış döner.
  kontrol(
    "3 × 149,90 -> 449.7000 (kayan nokta artığı yok)",
    varsayilanTalepTutari(3, 149.9) === "449.7000",
    varsayilanTalepTutari(3, 149.9),
  );
  kontrol("adet 0 -> 0.0000", varsayilanTalepTutari(0, 149.9) === "0.0000");
  kontrol(
    "kuruşlu maliyet korunur",
    varsayilanTalepTutari(7, 12.3456) === "86.4192",
    varsayilanTalepTutari(7, 12.3456),
  );
  kosanBolumler.push("adet");
}


// ===========================================================================
console.log("\n4) KARŞI TARAF — ÜÇ TÜRDEN BİRİ, AMA EN AZ BİRİ");
// ===========================================================================
/**
 * 23.08.2026: `supplierId` ZORUNLULUKTAN ÇIKTI çünkü karşı taraf kargo
 * şirketi de olabiliyor (docs/iade-sureci.md §12.1 — iade 10 günde
 * ulaşmazsa pazaryeri onaylıyor, tazmin kargodan istenir).
 *
 * ⚠ ZORUNLULUK KALKINCA BİR KAPI AÇILDI: üç alanın da boş olduğu bir kayıt
 * artık YAZILABİLİR ve öyle bir kayıt ANLAMSIZDIR — kimden alacaklı
 * olduğumuzu söylemeyen bir alacak, alacak değildir. Prisma "en az biri
 * dolu" kısıtını ifade edemiyor; kural uygulama katmanında ve burada
 * sınanıyor.
 */
{
  kontrol(
    "tedarikçi dolu → geçerli",
    karsiTarafGecerliMi({ supplierId: "s1", carrierId: null }),
  );
  kontrol(
    "kargo dolu → geçerli",
    karsiTarafGecerliMi({ supplierId: null, carrierId: "c1" }),
  );
  kontrol(
    "ikisi de dolu → geçerli (çelişki değil, kural en AZ biri)",
    karsiTarafGecerliMi({ supplierId: "s1", carrierId: "c1" }),
  );
  /** ⚠ ASIL KONTROL BU — kapı burada kapanıyor. */
  kontrol(
    "İKİSİ DE BOŞ → GEÇERSİZ",
    !karsiTarafGecerliMi({ supplierId: null, carrierId: null }),
  );
  /**
   * ⚠ BOŞ DİZE DE BOŞTUR. Form gönderiminde seçilmemiş bir alan `""`
   * gelir, `null` değil; `!= null` ile yazılmış bir kontrol onu DOLU
   * sayardı ve kapı sessizce açık kalırdı.
   */
  kontrol(
    "  ...boş dize de boş sayılıyor (form tuzağı)",
    !karsiTarafGecerliMi({ supplierId: "", carrierId: "" }),
  );
  kontrol(
    "  ...alanlar hiç verilmemişse de geçersiz",
    !karsiTarafGecerliMi({}),
  );

  /** Ekranda görünen ad tek gövdeden çözülüyor — iki yerde iki ölçüt olmasın. */
  kontrol(
    "karşı taraf adı: tedarikçi",
    karsiTarafAdi({ supplier: { name: "Trendyol" }, carrier: null }) === "Trendyol",
  );
  kontrol(
    "  ...kargo",
    karsiTarafAdi({ supplier: null, carrier: { name: "Aras" } }) === "Aras",
  );
  /**
   * ⚠ "—" DÖNMÜYOR, `null` DÖNÜYOR. Çağıran taraf ne yazacağına kendi
   * karar versin: adsız satır yazılmaz (İlke #14) ve sessiz bir tire,
   * bozuk veriyi normal gösterir.
   */
  kontrol(
    "  ...ikisi de yoksa null (çağıran karar verir)",
    karsiTarafAdi({ supplier: null, carrier: null }) === null,
  );

  // ── ŞEMA ↔ KURAL BAĞI ────────────────────────────────────────────────
  const sema = readFileSync("prisma/schema.prisma", "utf8");
  const blok = sema.slice(
    sema.indexOf("model Compensation {"),
    sema.indexOf("\n}", sema.indexOf("model Compensation {")),
  );
  kontrol("Compensation bloğu kesilebildi", blok.length > 0);
  kontrol(
    "supplierId artık NULLABLE",
    /supplierId\s+String\?/.test(blok),
  );
  kontrol("kargo karşı tarafı var", /carrierId\s+String\?/.test(blok));
  kontrol(
    "  ...`CargoCarrier`e bağlı, Supplier'a DEĞİL",
    /carrier\s+CargoCarrier\?/.test(blok),
  );
  kontrol(
    "iade BİLDİRİMİNE bağlanabiliyor",
    /returnNoticeId\s+String\?/.test(blok),
  );
  /**
   * ⚠ `returnItemId` KALDIRILMADI. İkisi ayrı soruya cevap veriyor:
   * biri "iade işlendi, kalemi hasarlı", öteki "iade hiç gelmedi ama
   * alacak doğdu". Birini ötekinin yerine koymak, kargoda kaybolan
   * iadeyi hiç kaydedememek olurdu.
   */
  kontrol(
    "  ...ve `returnItemId` YERİNDE DURUYOR (ikisi ayrı soru)",
    /returnItemId\s+String\?/.test(blok),
  );

  /**
   * ⚠ KARGO FİRMALARI `Supplier` OLARAK AÇILMAMIŞ OLMALI. Aynı varlığın
   * iki kimliği bir gün ayrışır — Soundcore vakası (`194645027819` vs
   * `194644037819`). Tedarikçi seed'inde kargo firması adı geçmemeli.
   */
  const seed = readFileSync("prisma/seed.ts", "utf8");
  const kargoAdlari = ["ARAS", "YURTICI", "HEPSIJET", "SURAT", "HOROZ"];
  const seedTedarikci = seed.slice(
    seed.indexOf("supplier"),
    seed.indexOf("supplier") + 4000,
  );
  kontrol(
    "kargo firmaları tedarikçi olarak AÇILMAMIŞ",
    !kargoAdlari.some((k) => new RegExp(`code:\\s*"${k}"`).test(seedTedarikci)),
  );

  kosanBolumler.push("karsi-taraf");
}

// ===========================================================================
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
