import { llmMetniDogrula as ozetMetniDogrula } from "../src/lib/llm/dogrulama";
import { ozetPaketiKur, type OzetSayisi } from "../src/lib/ozet/veri-toplama";
import { kartlarinAcikToplami } from "../src/lib/kart-borcu";
import { desiFarkliMi } from "../src/lib/desi-karsilastirma";
import { ozetTazeligi, OZET_ESIK_SAAT } from "../src/lib/ozet/tazelik";

/**
 * ============================================================================
 *  GÜNLÜK ÖZET BEKÇİSİ (K-OZET)
 * ----------------------------------------------------------------------------
 *      npm run gunluk-ozet:dogrula
 *
 *  ⛔ EN KRİTİK BÖLÜM `ozetMetniDogrula` — anayasa "kaynağı yazılmayan sayı
 *  kullanılamaz" burada koda dökülüyor. LLM'in ÜRETTİĞİ metin hiçbir zaman
 *  doğrudan gösterilmez; yalnız bu kapıdan geçen metin ekrana çıkar.
 *
 *  ⭐ SAF GÖVDELER DOĞRUDAN ÇAĞRILIYOR (desen taraması YOK) — "saf hesap
 *  katmanı desen tarayan bekçiye muhtaç olmaz" ilkesi.
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

console.log("\nGÜNLÜK ÖZET BEKÇİSİ (K-OZET)\n");

/* ═══ ① ozetMetniDogrula — ANTİ-HALÜSİNASYON KAPISI ═══════════════════ */
console.log("  ── ozetMetniDogrula");

const SAYILAR: OzetSayisi[] = [
  { anahtar: "uyari_nakitAcigi_tutar", goruntu: "₺12.450,75", ham: 12450.75 },
  { anahtar: "uyari_nakitAcigi_sayi", goruntu: "3", ham: 3 },
  { anahtar: "gorev_kargoBekleyen_sayi", goruntu: "1.284", ham: 1284 },
];

kontrol(
  "yalnız yer tutucu içeren meşru metin GEÇER ve gerçek değerle değişir",
  (() => {
    const s = ozetMetniDogrula(
      "Yakın dönemde {{uyari_nakitAcigi_tutar}} tutarında nakit açığı riski var.",
      SAYILAR,
    );
    return (
      s.tamam &&
      s.metin === "Yakın dönemde ₺12.450,75 tutarında nakit açığı riski var."
    );
  })(),
);
/**
 * ⚠ BULGU: "14 gün" gibi bağlamsal ama SAYILARa GİRMEMİŞ bir rakam bile
 * serbest sayı sayılır — bu KASITLI ve doğru: pencere uzunluğu gibi sabit
 * bir değer bile kaynaksız yazılırsa reddedilir. Sistem promptu bu yüzden
 * modele "hiçbir rakam yazma" der, "önemli olmayanları yazabilirsin" demez.
 */
kontrol(
  "bağlamsal ama kaynaksız bir sayı (ör. sabit pencere uzunluğu '14 gün') de REDDEDİLİR",
  (() => {
    const s = ozetMetniDogrula(
      "Önümüzdeki 14 günde {{uyari_nakitAcigi_tutar}} risk var.",
      SAYILAR,
    );
    return !s.tamam && s.sebep === "SERBEST_SAYI" && s.detay.includes("14");
  })(),
);

kontrol(
  "birden çok yer tutucu, doğru sırayla değişir",
  (() => {
    const s = ozetMetniDogrula(
      "{{gorev_kargoBekleyen_sayi}} sipariş kargoya verilmeyi bekliyor.",
      SAYILAR,
    );
    return s.tamam && s.metin === "1.284 sipariş kargoya verilmeyi bekliyor.";
  })(),
);

kontrol(
  "ÇÖZÜLEMEYEN anahtar (model uydurdu) → RED",
  (() => {
    const s = ozetMetniDogrula(
      "Bugün {{uyari_uydurulmusAnahtar_tutar}} risk var.",
      SAYILAR,
    );
    return (
      !s.tamam &&
      s.sebep === "COZULMEYEN_ANAHTAR" &&
      s.detay.includes("uyari_uydurulmusAnahtar_tutar")
    );
  })(),
);

/**
 * ⛔ BRİFİNGİN İSTEDİĞİ ADVERSARYAL VAKA — model talimatı YOK SAYIP
 * doğrudan rakam yazdı. Anahtar sözlükte OLMASA BİLE serbest yazılan rakam
 * kendi başına yeterli sebep; bu yüzden anahtarı olmayan bir sayı bile
 * yakalanmalı (aşağıdaki iki test ikisini de dener).
 */
kontrol(
  "SERBEST, tamamen UYDURMA rakam (sözlükte yok) → RED",
  (() => {
    const s = ozetMetniDogrula(
      "Bu ay zarar ₺99.999 oldu, dikkat edin.",
      SAYILAR,
    );
    return (
      !s.tamam && s.sebep === "SERBEST_SAYI" && s.detay.includes("₺99.999")
    );
  })(),
);

kontrol(
  "SERBEST rakam — SÖZLÜKTEKİ gerçek bir değer olsa bile yer tutucu DIŞINDA yazılmışsa RED",
  (() => {
    const s = ozetMetniDogrula(
      "Nakit açığı yaklaşık 12.450,75 civarında.",
      SAYILAR,
    );
    return !s.tamam && s.sebep === "SERBEST_SAYI";
  })(),
);

kontrol(
  "küçük, biçimsiz bir tamsayı bile (madde numarası değil, düz rakam) yakalanır",
  (() => {
    const s = ozetMetniDogrula("Bugün 3 önemli konu var.", SAYILAR);
    return !s.tamam && s.sebep === "SERBEST_SAYI" && s.detay.includes("3");
  })(),
);

/**
 * ⛔ PARÇA ≠ TAM EŞLEŞME. Model gerçek bir anahtarın adını KIRPARAK ya da
 * UZATARAK yazarsa (yazım hatası), bu sözlükte YOKTUR — tam token eşleşmesi
 * kanıtı. `.has()` map araması zaten TAM dize eşitliği ister.
 */
kontrol(
  "anahtar adının PARÇASI (yazım hatası) → ÇÖZÜLEMEYEN, geçmez",
  (() => {
    const s = ozetMetniDogrula("Risk {{uyari_nakitAcigi_tuta}} kadar.", SAYILAR);
    return !s.tamam && s.sebep === "COZULMEYEN_ANAHTAR";
  })(),
);

kontrol(
  "yer tutucusuz, tamamen düz metin sorunsuz geçer",
  (() => {
    const s = ozetMetniDogrula("Bugün her şey sakin görünüyor.", SAYILAR);
    return s.tamam && s.metin === "Bugün her şey sakin görünüyor.";
  })(),
);

kontrol(
  "boş sayı listesiyle bile yer-tutucusuz metin geçer (taban boşluğu çökertmez)",
  (() => {
    const s = ozetMetniDogrula("Sakin bir gün.", []);
    return s.tamam;
  })(),
);
/**
 * ⛔ MASKELEMENİN KENDİSİNİ KANITLAYAN VAKA. Anahtar adının İÇİNDE rakam
 * varsa (yarının bir geliştiricisi `hedef_2026_tutar` gibi bir anahtar
 * açabilir), maskeleme OLMADAN serbest-sayı taraması `{{hedef_2026_tutar}}`
 * içindeki "2026"yı SERBEST SAYI sanıp GEÇERLİ bir mesajı YANLIŞLIKLA
 * reddeder. Maskeleme çalışıyorsa bu mesaj sorunsuz GEÇER.
 */
kontrol(
  "anahtar adı rakam TAŞISA BİLE (maskeleme sayesinde) yanlışlıkla reddedilmez",
  (() => {
    const s = ozetMetniDogrula("{{hedef_2026_tutar}} hedeflendi.", [
      { anahtar: "hedef_2026_tutar", goruntu: "₺500.000,00", ham: 500000 },
    ]);
    return s.tamam && s.metin === "₺500.000,00 hedeflendi.";
  })(),
);

/* ═══ ② kartlarinAcikToplami ═══════════════════════════════════════════ */
console.log("\n  ── kartlarinAcikToplami");
kontrol(
  "aynı para biriminden birden çok kart TOPLANIR",
  (() => {
    const r = kartlarinAcikToplami([
      { paraBirimi: "TRY", acikToplam: 1000 },
      { paraBirimi: "TRY", acikToplam: 500 },
    ]);
    return r.length === 1 && r[0]!.paraBirimi === "TRY" && r[0]!.tutar === 1500;
  })(),
);
kontrol(
  "PARA BİRİMLERİ AYRI KALIR — çevrilmez, toplanmaz",
  (() => {
    const r = kartlarinAcikToplami([
      { paraBirimi: "TRY", acikToplam: 1000 },
      { paraBirimi: "EUR", acikToplam: 50 },
    ]);
    return (
      r.length === 2 &&
      r.find((x) => x.paraBirimi === "TRY")?.tutar === 1000 &&
      r.find((x) => x.paraBirimi === "EUR")?.tutar === 50
    );
  })(),
);
kontrol(
  "boş liste → boş sonuç",
  kartlarinAcikToplami([]).length === 0,
);

/* ═══ ③ desiFarkliMi ═══════════════════════════════════════════════════ */
console.log("\n  ── desiFarkliMi");
kontrol("bizim desi null ise HER ZAMAN farklı sayılır", desiFarkliMi(null, 5));
kontrol("aynı desi (tam eşit) → farklı DEĞİL", !desiFarkliMi(5, 5));
kontrol(
  "kuruşun altındaki (santigramın altı) fark GÖRMEZDEN gelinir",
  !desiFarkliMi(5.001, 5.002),
);
kontrol("santigram farkı bile FARKLI sayılır", desiFarkliMi(5, 5.02));

/* ═══ ④ ozetPaketiKur — saf toplayıcı ═════════════════════════════════ */
console.log("\n  ── ozetPaketiKur");
const SAHTE_BICIM = {
  para: (t: number, p: string) => `${p}${t}`,
  sayi: (d: number) => String(d),
};
kontrol(
  "sıfır sayılı uyarı/görev PAKETE GİRMEZ (gürültü süzülür)",
  (() => {
    const paket = ozetPaketiKur(
      {
        isGunu: "11 Eylül 2026",
        uyarilar: [
          { anahtar: "nakitAcigi", seviye: "kirmizi", sayi: 0, tutar: null, paraBirimi: null, adres: "/x" },
        ],
        gorevler: {
          onayBekleyen: 0,
          kargoBekleyen: 0,
          iadeBildirimi: 0,
          malKabulBekleyen: 0,
          karHesaplanamayan: 0,
          oransizKanalSku: 0,
          tarifePenceresi: 0,
        },
        tazminat: [],
        kartBorcu: [],
        desiFarkliSayisi: 0,
      },
      SAHTE_BICIM,
    );
    return paket.sayilar.length === 0 && paket.baglamlar.length === 0;
  })(),
);
kontrol(
  "dolu bir uyarı hem SAYI hem BAĞLAM üretir, goruntu bicim'den geçer",
  (() => {
    const paket = ozetPaketiKur(
      {
        isGunu: "11 Eylül 2026",
        uyarilar: [
          {
            anahtar: "hakedisGecikti",
            seviye: "kirmizi",
            sayi: 3,
            tutar: 1000,
            paraBirimi: "TRY",
            adres: "/hakedis",
          },
        ],
        gorevler: {
          onayBekleyen: 0,
          kargoBekleyen: 0,
          iadeBildirimi: 0,
          malKabulBekleyen: 0,
          karHesaplanamayan: 0,
          oransizKanalSku: 0,
          tarifePenceresi: 0,
        },
        tazminat: [],
        kartBorcu: [],
        desiFarkliSayisi: 0,
      },
      SAHTE_BICIM,
    );
    const tutarKaydi = paket.sayilar.find((s) => s.anahtar === "uyari_hakedisGecikti_tutar");
    return (
      paket.sayilar.length === 2 &&
      paket.baglamlar.length === 1 &&
      tutarKaydi?.goruntu === "TRY1000" &&
      paket.baglamlar[0]!.adres === "/hakedis" &&
      paket.baglamlar[0]!.onem === "kirmizi"
    );
  })(),
);
/**
 * ⛔ GERÇEK BİR GEMINI DENEMESİ BUNU YAKALADI (11.09.2026): `nakitAcigi.sayi`
 * her zaman 1 — model onu "önümüzdeki 1 günde" diye anlattı. Rakam
 * KAYNAKLIYDI (doğrulamadan geçti) ama YANILTICIYDI. Bu üç uyarının sayısı
 * artık hiç anahtar olarak verilmiyor.
 */
kontrol(
  "nakitAcigi/yedekYok/yedekIzden — 'sayi' anahtarı ÜRETİLMEZ (varoluş bayrağı, gerçek adet değil)",
  (() => {
    const ortak = {
      gorevler: {
        onayBekleyen: 0,
        kargoBekleyen: 0,
        iadeBildirimi: 0,
        malKabulBekleyen: 0,
        karHesaplanamayan: 0,
        oransizKanalSku: 0,
        tarifePenceresi: 0,
      },
      tazminat: [],
      kartBorcu: [],
      desiFarkliSayisi: 0,
    };
    const nakit = ozetPaketiKur(
      {
        isGunu: "x",
        uyarilar: [
          { anahtar: "nakitAcigi" as const, seviye: "kirmizi" as const, sayi: 1, tutar: 500, paraBirimi: "TRY", adres: "/x" },
        ],
        ...ortak,
      },
      SAHTE_BICIM,
    );
    const yedekYok = ozetPaketiKur(
      {
        isGunu: "x",
        uyarilar: [
          { anahtar: "yedekYok" as const, seviye: "kirmizi" as const, sayi: 1, tutar: null, paraBirimi: null, adres: "/x" },
        ],
        ...ortak,
      },
      SAHTE_BICIM,
    );
    return (
      nakit.sayilar.every((s) => !s.anahtar.endsWith("_sayi")) &&
      nakit.sayilar.some((s) => s.anahtar === "uyari_nakitAcigi_tutar") &&
      nakit.baglamlar.length === 1 &&
      yedekYok.sayilar.length === 0 &&
      yedekYok.baglamlar.length === 1
    );
  })(),
);

/* ═══ ⑤ ozetTazeligi ═══════════════════════════════════════════════════ */
console.log("\n  ── ozetTazeligi");
kontrol(
  "hiç üretim yoksa YOK — 0 saat önce diye okunmaz",
  ozetTazeligi(null, new Date()).durum === "YOK",
);
kontrol(
  "eşiğin İÇİNDE (tam eşikte değil, altında) → TAZE",
  (() => {
    const an = new Date("2026-09-11T12:00:00.000Z");
    const sonUretim = new Date(
      an.getTime() - (OZET_ESIK_SAAT - 1) * 3_600_000,
    );
    return ozetTazeligi(sonUretim, an).durum === "TAZE";
  })(),
);
kontrol(
  "eşiği AŞAN → ESKI",
  (() => {
    const an = new Date("2026-09-11T12:00:00.000Z");
    const sonUretim = new Date(
      an.getTime() - (OZET_ESIK_SAAT + 1) * 3_600_000,
    );
    return ozetTazeligi(sonUretim, an).durum === "ESKI";
  })(),
);

console.log(
  "\n" +
    (hata === 0 ? "TÜM KONTROLLER GEÇTİ" : "BAŞARISIZ") +
    ` (${gecen}/${gecen + hata})\n`,
);
process.exit(hata === 0 ? 0 : 1);
