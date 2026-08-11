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
  varsayilanTalepTutari,
  type TazminatKaydi,
} from "../src/lib/tazminat";

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
