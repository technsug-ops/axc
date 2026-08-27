import { satirHali, damgaHali, type SatirGirdisi } from "../src/lib/sayim/kova";
import { sayimOzeti, sayimTamMi, kovalaraAyir } from "../src/lib/sayim/ozet";
import {
  oturumHali,
  acikOturumVarMi,
  bosSayimKodu,
  sayimKodu,
  okumayaAcikMi,
  acilisUyarisiGerekirMi,
} from "../src/lib/sayim/oturum";
import { readFileSync } from "node:fs";

import { satirKarari } from "../src/lib/sayim/karar";
import {
  BOS_KILIT,
  okumaKarari,
  sepetToplami,
  sepeteEkle,
  type Sepet,
} from "../src/lib/sayim/okuma";

/**
 * ============================================================================
 *  FİZİKSEL SAYIM BEKÇİSİ (K57) — DEĞER TESTİ, KAYNAK TARAMASI DEĞİL
 * ----------------------------------------------------------------------------
 *      npm run sayim:dogrula
 *
 *  ⛔ BU BEKÇİ KAYNAK METNİ TARAMAZ. Anayasadaki _"kaynak tarayan kontrol,
 *  deseni dosyada değil kullanım bloğunda arar"_ dersinin en temiz cevabı,
 *  deseni HİÇ ARAMAMAKTIR: gövde saf olduğu için doğrudan ÇAĞRILIP değeri
 *  sınanıyor. Desen yanlış yerde bulunamaz, çünkü desen aranmıyor.
 *
 *  ⚠ VE HER ÖLÇÜT İKİ YÖNDEN SINANIR (mutasyonlar `sayim:mutasyon`da):
 *    · davranışı KALDIRAN mutasyon  → yanlış susma
 *    · davranışı FAZLADAN yapan     → yanlış yanma
 *  Yalnız biri yazılırsa öteki yön serbest kalır.
 * ============================================================================
 */

let gecen = 0;
const dusen: string[] = [];

function esit(ad: string, bulunan: unknown, beklenen: unknown) {
  const b = JSON.stringify(bulunan);
  const e = JSON.stringify(beklenen);
  if (b === e) gecen++;
  else dusen.push(ad + "\n       beklenen: " + e + "\n       bulunan : " + b);
}

/** Varsayılan girdi — testler yalnız ilgilendikleri alanı değiştirir. */
function g(o: Partial<SatirGirdisi> = {}): SatirGirdisi {
  return {
    sayilanAdet: 0,
    sistemAdedi: 0,
    kapsamdaydi: true,
    ayniGunHareketVar: false,
    duzeltmeYazildiAt: null,
    damgaSistemAdedi: null,
    ...o,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
//  1) null ≠ 0 — SİSTEMİN EN KRİTİK AYRIMI
// ═══════════════════════════════════════════════════════════════════════════
//  ⚠ ÖRNEK VERİ AYRIMIN İKİ YAKASINI GÖSTERİR: iki satırın SİSTEM ADEDİ AYNI
//  (5), yalnız sayılan farklı. Sistem adedi 0 seçilseydi `null` ile `0` aynı
//  kovaya düşerdi (ikisi de "tutuyor" görünürdü) ve mutasyon yeşil kalırdı.

esit(
  "① sayilanAdet=null → SAYILMADI",
  satirHali(g({ sayilanAdet: null, sistemAdedi: 5 })).kova,
  "SAYILMADI",
);
esit(
  "① sayilanAdet=0 (rafta YOK) → EKSIK, sayılmadı DEĞİL",
  satirHali(g({ sayilanAdet: 0, sistemAdedi: 5 })).kova,
  "EKSIK",
);
esit(
  "① SAYILMADI'nın farkı null — 0 DEĞİL ('0' tutuyor demektir)",
  satirHali(g({ sayilanAdet: null, sistemAdedi: 5 })).fark,
  null,
);
esit(
  "① rafta yok (0) farkı −5",
  satirHali(g({ sayilanAdet: 0, sistemAdedi: 5 })).fark,
  -5,
);
esit(
  "① SAYILMADI yazılamaz",
  satirHali(g({ sayilanAdet: null, sistemAdedi: 5 })).yazilabilirMi,
  false,
);
esit(
  "① rafta yok (0) YAZILABİLİR — gerçek eksik kaybolmaz",
  satirHali(g({ sayilanAdet: 0, sistemAdedi: 5 })).yazilabilirMi,
  true,
);

// ═══════════════════════════════════════════════════════════════════════════
//  2) KOVALAR — FAZLA ve EKSİK ASLA BİRLEŞMEZ
// ═══════════════════════════════════════════════════════════════════════════

esit("② sayılan > sistem → FAZLA", satirHali(g({ sayilanAdet: 7, sistemAdedi: 4 })).kova, "FAZLA");
esit("② sayılan < sistem → EKSIK", satirHali(g({ sayilanAdet: 4, sistemAdedi: 7 })).kova, "EKSIK");
esit("② eşit → TUTUYOR", satirHali(g({ sayilanAdet: 4, sistemAdedi: 4 })).kova, "TUTUYOR");
esit("② TUTUYOR yazılamaz", satirHali(g({ sayilanAdet: 4, sistemAdedi: 4 })).yazilabilirMi, false);

/**
 * ⛔ AYRIMIN İKİ YAKASI: 3 eksik + 3 fazla. NET SIFIRDIR ve birleştiren bir
 * uygulama "her şey yolunda" der. Ayrı tutulunca ikisi de görünür.
 */
const netSifir = sayimOzeti([
  g({ sayilanAdet: 0, sistemAdedi: 3 }), // 3 EKSİK
  g({ sayilanAdet: 3, sistemAdedi: 0 }), // 3 FAZLA
]);
esit("② net sıfır ama EKSİK 3 adet", netSifir.eksikAdet, 3);
esit("② net sıfır ama FAZLA 3 adet", netSifir.fazlaAdet, 3);
esit("② net sıfır ama SAPAN 2 satır", netSifir.sapan, 2);
esit(
  "② eksik adedi POZİTİF taşınır (negatif olsaydı toplamda sıfırlanırdı)",
  netSifir.eksikAdet > 0,
  true,
);
esit("② özet tipinde tek bir 'fark' alanı YOK", Object.keys(netSifir).includes("fark"), false);

// ═══════════════════════════════════════════════════════════════════════════
//  3) DAMGA — sayım hükmü kaydın HÂLİNE bağlıdır (K6)
// ═══════════════════════════════════════════════════════════════════════════

const an = new Date("2026-08-27T00:00:00.000Z");

esit("③ yazılmadı → YAZILMADI", damgaHali(null, null, 5), "YAZILMADI");
esit("③ damga sistemle aynı → GECERLI", damgaHali(an, 5, 5), "GECERLI");
esit("③ geriye dönük kayıt geldi (5→7) → YENIDEN_ACILDI", damgaHali(an, 5, 7), "YENIDEN_ACILDI");
esit(
  "③ çözülemeyen iz SUSTURMAZ: yazıldı ama damga yok → YENIDEN_ACILDI",
  damgaHali(an, null, 5),
  "YENIDEN_ACILDI",
);
esit(
  "③ yazılmış satır YENİDEN YAZILAMAZ (çift sayım olurdu)",
  satirHali(g({ sayilanAdet: 4, sistemAdedi: 7, duzeltmeYazildiAt: an, damgaSistemAdedi: 7 }))
    .yazilabilirMi,
  false,
);
esit(
  "③ yeniden açılan satır da yazılamaz — yeniden SAYILMAYI ister",
  satirHali(g({ sayilanAdet: 4, sistemAdedi: 9, duzeltmeYazildiAt: an, damgaSistemAdedi: 7 }))
    .yazilabilirMi,
  false,
);
esit(
  "③ yeniden açılan satır KİLİTLİ, hiçbir yol açık değil",
  satirKarari(
    satirHali(g({ sayilanAdet: 4, sistemAdedi: 9, duzeltmeYazildiAt: an, damgaSistemAdedi: 7 })),
  ).yollar,
  [],
);
esit(
  "③ özet yeniden açılanı SAYAR",
  sayimOzeti([g({ sayilanAdet: 4, sistemAdedi: 9, duzeltmeYazildiAt: an, damgaSistemAdedi: 7 })])
    .yenidenAcilan,
  1,
);
esit(
  "③ geçerli damgada yeniden açılan SAYILMAZ",
  sayimOzeti([g({ sayilanAdet: 4, sistemAdedi: 7, duzeltmeYazildiAt: an, damgaSistemAdedi: 7 })])
    .yenidenAcilan,
  0,
);

// ═══════════════════════════════════════════════════════════════════════════
//  4) KAPSAM — sayılmadı yalnız KAPSAM İÇİ sayılır, kapsam dışı FAZLA'dır
// ═══════════════════════════════════════════════════════════════════════════

const kapsamli = sayimOzeti([
  g({ sayilanAdet: 2, sistemAdedi: 2 }), // kapsam içi, tutuyor
  g({ sayilanAdet: null, sistemAdedi: 3 }), // kapsam içi, SAYILMADI
  g({ sayilanAdet: 1, sistemAdedi: 0, kapsamdaydi: false }), // kapsam DIŞI bulundu
]);
esit("④ kapsam = yalnız kapsam içi satırlar", kapsamli.kapsam, 2);
esit("④ kapsam dışı ayrı sayılır", kapsamli.kapsamDisi, 1);
esit("④ SAYILMADI yalnız kapsam içinden", kapsamli.sayilmadi, 1);
esit("④ kapsam dışı bulunan doğrudan FAZLA'dır", kapsamli.fazlaSatir, 1);
esit(
  "④ kapsam dışı bayrağı satırda görünür",
  satirHali(g({ sayilanAdet: 1, sistemAdedi: 0, kapsamdaydi: false })).kapsamDisi,
  true,
);
esit(
  "④ kapsam içi satırda bayrak yanmaz",
  satirHali(g({ sayilanAdet: 1, sistemAdedi: 0 })).kapsamDisi,
  false,
);
/**
 * ⚠ AYRIMIN İKİ YAKASI: İKİ SATIR DA SAYILMADI, yalnız KAPSAM farklı.
 * Tek yakası yazılsaydı `if (g.kapsamdaydi)` koşulunu silen mutasyon yeşil
 * kalırdı — nitekim ilk yazımda tam olarak bu oldu ve harness yakaladı.
 * Kapsam dışı bir satırın "sayılmadı" sayılması, kapsam raporunu olduğundan
 * KÖTÜ gösterir: sayım tam olduğu hâlde eksik sanılır.
 */
esit(
  "④ kapsam DIŞI sayılmamış satır 'sayılmadı'ya GİRMEZ",
  sayimOzeti([
    g({ sayilanAdet: null, sistemAdedi: 3 }), // kapsam İÇİ  → sayılır
    g({ sayilanAdet: null, sistemAdedi: 0, kapsamdaydi: false }), // kapsam DIŞI → sayılmaz
  ]).sayilmadi,
  1,
);
esit("④ sayılmadı>0 iken sayım TAM DEĞİL", sayimTamMi(kapsamli), false);
esit(
  "④ sapan varken ama sayılmadı yokken sayım TAM (tamlık ≠ hatasızlık)",
  sayimTamMi(sayimOzeti([g({ sayilanAdet: 1, sistemAdedi: 5 })])),
  true,
);

// ═══════════════════════════════════════════════════════════════════════════
//  5) BELİRSİZ — sayım günü hareketi varsa SESSİZCE YAZILMAZ
// ═══════════════════════════════════════════════════════════════════════════

const belirsiz = g({ sayilanAdet: 4, sistemAdedi: 7, ayniGunHareketVar: true });

esit("⑤ belirsiz satır yine EKSİK kovasında (kaybolmaz)", satirHali(belirsiz).kova, "EKSIK");
esit("⑤ belirsiz bayrağı yanar", satirHali(belirsiz).belirsiz, true);
esit("⑤ belirsiz satır YAZILAMAZ", satirHali(belirsiz).yazilabilirMi, false);
esit("⑤ belirsiz satırda hiçbir yol açık değil", satirKarari(satirHali(belirsiz)).yollar, []);
esit("⑤ özet belirsizi sayar", sayimOzeti([belirsiz]).belirsiz, 1);
esit(
  "⑤ aynı satır hareketsizken YAZILABİLİR (ayrımın öteki yakası)",
  satirHali(g({ sayilanAdet: 4, sistemAdedi: 7 })).yazilabilirMi,
  true,
);

// ═══════════════════════════════════════════════════════════════════════════
//  6) KARAR — fazlada BELGE ÜSTTE, maliyet bilinmiyor
// ═══════════════════════════════════════════════════════════════════════════

const fazlaK = satirKarari(satirHali(g({ sayilanAdet: 7, sistemAdedi: 4 })));
const eksikK = satirKarari(satirHali(g({ sayilanAdet: 4, sistemAdedi: 7 })));

esit("⑥ FAZLA → ARTI yön", fazlaK.yon, "ARTI");
esit("⑥ FAZLA adedi pozitif 3", fazlaK.adet, 3);
esit("⑥ FAZLA'da maliyet BİLİNMİYOR", fazlaK.maliyetBiliniyorMu, false);
esit("⑥ FAZLA'da ilk yol BELGE_GIR (çift sayım olmasın)", fazlaK.yollar[0], "BELGE_GIR");
esit("⑥ FAZLA'da maliyetsiz yol EN SONDA", fazlaK.yollar.at(-1), "MALIYETSIZ_YAZ");
esit("⑥ EKSIK → EKSI yön", eksikK.yon, "EKSI");
esit("⑥ EKSIK adedi pozitif 3 (yön ayrı alanda)", eksikK.adet, 3);
esit("⑥ EKSIK'te maliyet BİLİNİYOR (FIFO partisinden)", eksikK.maliyetBiliniyorMu, true);
esit(
  "⑥ TUTUYOR'da yön yok",
  satirKarari(satirHali(g({ sayilanAdet: 4, sistemAdedi: 4 }))).yon,
  null,
);

// ═══════════════════════════════════════════════════════════════════════════
//  7) OTURUM — hâl damgadan TÜRETİLİR, enum yok
// ═══════════════════════════════════════════════════════════════════════════

const bos = { kapanisAt: null, yazimAt: null, iptalAt: null };

esit("⑦ damgasız → ACIK", oturumHali(bos), "ACIK");
esit("⑦ kapanış damgalı → KAPANDI", oturumHali({ ...bos, kapanisAt: an }), "KAPANDI");
esit("⑦ yazım damgalı → YAZILDI", oturumHali({ ...bos, kapanisAt: an, yazimAt: an }), "YAZILDI");
esit("⑦ iptal her şeyi yener", oturumHali({ kapanisAt: an, yazimAt: an, iptalAt: an }), "IPTAL");
esit("⑦ yalnız açık oturumda okuma yapılır", okumayaAcikMi(bos), true);
esit("⑦ kapanmış oturuma okuma girmez", okumayaAcikMi({ ...bos, kapanisAt: an }), false);
esit(
  "⑦ tek açık oturum kapısı — açık varsa true",
  acikOturumVarMi([bos, { ...bos, iptalAt: an }]),
  true,
);
esit(
  "⑦ tek açık oturum kapısı — hepsi kapalıysa false",
  acikOturumVarMi([{ ...bos, kapanisAt: an }, { ...bos, iptalAt: an }]),
  false,
);
esit(
  "⑦ kod sayım GÜNÜNDEN üretilir",
  sayimKodu(new Date("2026-08-27T00:00:00.000Z")),
  "sayim-20260827",
);

// ═══════════════════════════════════════════════════════════════════════════
//  8) AÇILIŞ UYARISI — kapanışta değil AÇILIŞTA
// ═══════════════════════════════════════════════════════════════════════════

esit("⑧ sayım günü hareketi varsa açılışta uyarı", acilisUyarisiGerekirMi(true), true);
esit("⑧ hareket yoksa uyarı yok", acilisUyarisiGerekirMi(false), false);

// ═══════════════════════════════════════════════════════════════════════════
//  9) LİSTELER AYRI DÖNER — ekran fazla/eksik'i tek listede basmaz
// ═══════════════════════════════════════════════════════════════════════════

const ayrilmis = kovalaraAyir([
  { sku: "A", ...g({ sayilanAdet: 0, sistemAdedi: 2 }) },
  { sku: "B", ...g({ sayilanAdet: 5, sistemAdedi: 1 }) },
  { sku: "C", ...g({ sayilanAdet: 3, sistemAdedi: 3 }) },
  { sku: "D", ...g({ sayilanAdet: null, sistemAdedi: 9 }) },
]);
esit("⑨ eksik listesinde yalnız A", ayrilmis.eksik.map((x) => x.sku), ["A"]);
esit("⑨ fazla listesinde yalnız B", ayrilmis.fazla.map((x) => x.sku), ["B"]);
esit(
  "⑨ tutan ve sayılmayan hiçbir listeye girmez",
  ayrilmis.eksik.length + ayrilmis.fazla.length,
  2,
);

// ═══════════════════════════════════════════════════════════════════════════



// ═══════════════════════════════════════════════════════════════════════════
//  ⑩ BOŞ KARE KİLİDİ — sayım kipinde kamera AÇIK kalıyor
// ═══════════════════════════════════════════════════════════════════════════
//  Çözücü 250 ms'de bir kare çözüyor. Koruma olmasa sabit duran bir barkod
//  saniyede DÖRT kez sayılırdı. Kural: aynı kod, arada BOŞ KARE geçmeden
//  ikinci kez sayılmaz — süre eşiği YOK.

{
  /** Bir kare dizisini kurala göre işleyip toplam sayımı döndürür. */
  const kostur = (kareler: (string | null)[], esik?: number) => {
    let kilit = BOS_KILIT;
    let sepet: Sepet = new Map();
    for (const k of kareler) {
      const karar = okumaKarari(kilit, k, esik);
      kilit = karar.kilit;
      if (karar.say && k !== null) sepet = sepeteEkle(sepet, k);
    }
    return sepet;
  };

  esit(
    "⑩ tek ürün sabit duruyor (8 kare aynı kod) → 1 sayılır",
    kostur(["A", "A", "A", "A", "A", "A", "A", "A"]).get("A"),
    1,
  );
  /**
   * ⚠ AYRIMIN ÖTEKİ YAKASI — VE ÖRNEK VERİ BUNU GÖSTERMELİ: dört GERÇEK
   * ürün, her biri kadraja girip çıkıyor. Yalnız üstteki yazılsaydı
   * "hep 1 döndür" mutasyonu yeşil kalırdı.
   */
  esit(
    "⑩ dört ayrı ürün (arada boş kare) → 4 sayılır",
    kostur(["A", null, "A", null, "A", null, "A"]).get("A"),
    4,
  );
  esit(
    "⑩ boş kare GEÇMEDEN ikinci okuma sayılmaz",
    kostur(["A", "A"]).get("A"),
    1,
  );
  esit(
    "⑩ boş kare SONRASI sayılır (kilit açılıyor)",
    kostur(["A", null, "A"]).get("A"),
    2,
  );
  esit(
    "⑩ FARKLI kod kilidi açar — A→B→A üçü de sayılır",
    [kostur(["A", "B", "A"]).get("A"), kostur(["A", "B", "A"]).get("B")],
    [2, 1],
  );
  /**
   * ⛔ BOŞ DİZE `null` DEĞİLDİR. Çözücü `""` dönerse o bir koddur, "kadraj
   * boş" değil — `!kod` yazılsaydı kilit sessizce açılırdı.
   */
  esit(
    "⑩ boş dize kilidi AÇMAZ (null ile karıştırılmıyor)",
    kostur(["A", "", "A"]).get("A"),
    1,
  );
  esit(
    "⑩ araya karışan tek bulanık kare (eşik 2) kilidi AÇMAZ",
    kostur(["A", null, "A", "A"], 2).get("A"),
    1,
  );
  esit(
    "⑩ iki ardışık boş kare (eşik 2) kilidi AÇAR",
    kostur(["A", null, null, "A"], 2).get("A"),
    2,
  );

  /* ── Sepet: −/+ düzeltmesi ── */
  esit("⑩ sepet: + artırır", sepeteEkle(new Map([["A", 3]]), "A").get("A"), 4);
  esit("⑩ sepet: − azaltır", sepeteEkle(new Map([["A", 3]]), "A", -1).get("A"), 2);
  esit(
    "⑩ sepet: sıfırın ALTINA inmez",
    sepeteEkle(new Map([["A", 0]]), "A", -1).get("A"),
    0,
  );
  esit(
    "⑩ sepet: SIFIR SİLİNMEZ — 'sayıldı, rafta yok' bir ölçümdür",
    sepeteEkle(new Map([["A", 1]]), "A", -1).has("A"),
    true,
  );
  esit("⑩ sepet toplamı", sepetToplami(new Map([["A", 3], ["B", 2]])), 5);
}

// ═══════════════════════════════════════════════════════════════════════════
//  ⑪ SÜRE EŞİĞİ YASAĞI — tek kaynak taraması, ve NİYE gerekti
// ═══════════════════════════════════════════════════════════════════════════
//  ⛔ BU DOSYADAKİ TEK KAYNAK TARAMASI. Gerekçesi ölçüldü: mutasyon harness'i
//  `Date.now() % 800 !== 0` ekleyen bir senaryo denedi ve DEĞER TESTLERİ
//  YAKALAYAMADI — çünkü o ifade neredeyse her zaman doğru, davranış kareler
//  düzeyinde değişmiyor. Zamana bağlı bir değer testi yazmak ise kırılgan
//  bir bekçi üretirdi (bazen yeşil, bazen kırmızı).
//
//  ⚠ VE KURAL ZATEN YAPISAL: `okuma.ts` SAF bir gövde. Saf bir gövdede saat
//  okumak, onu sınanamaz yapar. Yasak, kuralın kendisiyle aynı şey.
//  _(Anayasa 28.08.2026: "eşik, dağılımın gediğine ya da FİZİKSEL EYLEMİN
//  kendisine konur — uydurulmaz.")_

{
  const kaynak = readFileSync("src/lib/sayim/okuma.ts", "utf8")
    /* ⚠ YORUMSUZ: yasağı ANLATAN yorum, yasağı ÇİĞNEMİŞ sayılmaz. */
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");

  for (const [ad, desen] of [
    ["Date", /Date/],
    ["performance.now", /performance\s*\.\s*now/],
    ["setTimeout", /setTimeout/],
    ["setInterval", /setInterval/],
  ] as const) {
    esit("⑪ okuma kuralı `" + ad + "` KULLANMIYOR (süre eşiği yasak)", desen.test(kaynak), false);
  }

  /* Ayrımın öteki yakası: eşik KARE cinsinden ve dışarıdan verilebiliyor. */
  esit(
    "⑪ eşik KARE sayısı olarak var (süre değil)",
    /BOS_KARE_ESIGI\s*=\s*\d+/.test(kaynak),
    true,
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  ⑫ GÜNDE İKİNCİ SAYIM — CANLI ÇÖKME 28.08.2026
// ═══════════════════════════════════════════════════════════════════════════
//  `kod` şemada @unique ve `sayimKodu` günde TEK kod üretiyor. İkinci
//  "Sayım başlat" tekillik ihlaliyle düşüyordu; kullanıcı yalnız
//  `This page couldn't load` gördü.
//  ⚠ Çare "günde bir sayım" DEĞİL: aynı gün ikinci sayım meşrudur (ilki
//  yarım kalmış olabilir). Kod okunaklı kalarak tekilleşiyor.

{
  const gun = new Date("2026-08-27T00:00:00.000Z");
  esit("⑫ boş günde taban kod", bosSayimKodu(gun, []), "sayim-20260827");
  esit(
    "⑫ taban doluysa -2 (çökmüyor)",
    bosSayimKodu(gun, ["sayim-20260827"]),
    "sayim-20260827-2",
  );
  esit(
    "⑫ -2 de doluysa -3",
    bosSayimKodu(gun, ["sayim-20260827", "sayim-20260827-2"]),
    "sayim-20260827-3",
  );
  /* ⚠ AYRIMIN ÖTEKİ YAKASI: BAŞKA GÜNÜN kodu tabanı işgal etmez. */
  esit(
    "⑫ başka günün kodu tabanı bloke etmiyor",
    bosSayimKodu(gun, ["sayim-20260826", "sayim-20260828"]),
    "sayim-20260827",
  );
  esit(
    "⑫ sırasız gelen liste de doğru çalışır",
    bosSayimKodu(gun, ["sayim-20260827-2", "sayim-20260827"]),
    "sayim-20260827-3",
  );
}

console.log("\nFİZİKSEL SAYIM BEKÇİSİ (K57)\n");
if (dusen.length === 0) {
  console.log("  ✓  " + gecen + "/" + gecen + " ölçüt geçti — değer testi, kaynak taraması yok\n");
} else {
  for (const d of dusen) console.log("  ✗  " + d);
  console.log("\n  " + dusen.length + " ölçüt DÜŞTÜ · " + gecen + " geçti\n");
  process.exitCode = 1;
}
