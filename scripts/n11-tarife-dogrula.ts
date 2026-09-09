import {
  n11KargoMaliyeti,
  N11_FIRMALARI,
  N11_TARIFESI,
  N11_TARIFE_TAVANI,
  n11OrtalamaTarife,
} from "../src/lib/n11-kargo-tarifesi";

/**
 * ============================================================================
 *  N11 TARİFE BEKÇİSİ (K200)
 * ----------------------------------------------------------------------------
 *      npm run n11-tarife:dogrula
 *
 *  ⛔ KORUDUĞU ŞEY: AKTARIM. 45 satır × 6 sütun = 270 rakam ekran
 *  görüntüsünden elle aktarıldı. Yanlış aktarılmış bir rakam MAKUL görünür,
 *  hiçbir şey hata vermez ve sessizce NET'e girer — bu, bu depodaki en
 *  sinsi hata sınıfının ta kendisi.
 *
 *  ⭐ ÖLÇÜT YAPISAL: tek tek "doğru mu" diye soramam (kaynak ekran
 *  görüntüsü), ama tablonun KENDİ İÇİNDE tutarlı olması gerektiğini
 *  biliyorum. Bir hane hatası (90,50 → 9,50 ya da 905,0) artan sırayı
 *  bozar ve yakalanır.
 *
 *  ⚠ VE BU "DOĞRU AKTARILDI" DEMEK DEĞİL — "yapısal olarak bozulmamış"
 *  demektir. İkisi ayrı iddiadır ve ikincisi zayıftır; raporda öyle yazar.
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

console.log("\nN11 TARİFE BEKÇİSİ (K200)\n");

const desiler = Object.keys(N11_TARIFESI)
  .map(Number)
  .sort((a, b) => a - b);

/* ═══ ① YAPI ══════════════════════════════════════════════════════════ */
console.log("  ── YAPI");
kontrol("altı firma tanımlı", N11_FIRMALARI.length === 6, N11_FIRMALARI.length);
kontrol(
  "desi 1..45 KESİNTİSİZ (boşluk yok)",
  desiler.length === 45 &&
    desiler[0] === 1 &&
    desiler[44] === 45 &&
    desiler.every((d, i) => d === i + 1),
  { adet: desiler.length, ilk: desiler[0], son: desiler[desiler.length - 1] },
);
kontrol(
  "her satırda TAM 6 değer",
  desiler.every((d) => N11_TARIFESI[d].length === 6),
  desiler.filter((d) => N11_TARIFESI[d].length !== 6),
);
kontrol(
  "hiçbir değer sıfır ya da negatif değil",
  desiler.every((d) => N11_TARIFESI[d].every((x) => x > 0)),
);
kontrol("tavan sabiti tabloyla tutuyor", N11_TARIFE_TAVANI === desiler[desiler.length - 1]);

/* ═══ ② ARTAN SIRA — HANE HATASINI YAKALAYAN ÖLÇÜT ════════════════════ */
/**
 * ⛔ BİR HANE KAYMASI BURADA YAKALANIR: 90,50 yerine 9,50 ya da 905,0
 * yazılsaydı sıra bozulurdu. Tarife desiyle birlikte ARTAR (ya da yatay
 * kalır); ASLA düşmez — sayfadaki 45 satırın tamamında böyle.
 */
console.log("\n  ── ARTAN SIRA (aktarım hatası ölçütü)");
for (let s = 0; s < N11_FIRMALARI.length; s++) {
  const dusenler: string[] = [];
  for (let i = 1; i < desiler.length; i++) {
    const onceki = N11_TARIFESI[desiler[i - 1]][s];
    const simdi = N11_TARIFESI[desiler[i]][s];
    if (simdi < onceki) {
      dusenler.push("desi " + desiler[i] + ": " + onceki + " → " + simdi);
    }
  }
  kontrol(N11_FIRMALARI[s] + " — desi arttıkça ücret DÜŞMÜYOR", dusenler.length === 0, dusenler);
}

/* ═══ ③ NOKTA ÇAPRAZI — EKRAN GÖRÜNTÜSÜNDEN ═══════════════════════════ */
/**
 * ⚠ ÜÇ NOKTA, ÜÇ FARKLI YERDEN (baş · orta · son). Tablonun tamamını
 * doğrulamaz — ama kaymış/kaydırılmış bir sütunu yakalar.
 * ⭐ 40-43 satırları İKİ AYRI ekran görüntüsünde göründü ve ikisi tuttu;
 * aktarım orada kaynağın kendisiyle çaprazlandı.
 */
console.log("\n  ── NOKTA ÇAPRAZI (kaynağın kendi yazdığı)");
kontrol("desi 1 · Aras = 90,50", N11_TARIFESI[1][0] === 90.5, N11_TARIFESI[1][0]);
kontrol("desi 20 · PTT = 232,18", N11_TARIFESI[20][2] === 232.18, N11_TARIFESI[20][2]);
kontrol("desi 45 · DHL = 1.120,45", N11_TARIFESI[45][5] === 1120.45, N11_TARIFESI[45][5]);
kontrol("desi 40 · Yurtiçi = 617,34", N11_TARIFESI[40][3] === 617.34, N11_TARIFESI[40][3]);

/* ═══ ④ ORTALAMA GÖVDESİ ══════════════════════════════════════════════ */
console.log("\n  ── ORTALAMA GÖVDESİ");
kontrol(
  "ortalama satırın MİN ve MAX'ı ARASINDA",
  desiler.every((d) => {
    const o = n11OrtalamaTarife(d)!;
    return o >= Math.min(...N11_TARIFESI[d]) && o <= Math.max(...N11_TARIFESI[d]);
  }),
);
kontrol(
  "desi 1 ortalaması elle hesapla tutuyor",
  n11OrtalamaTarife(1) ===
    Math.round(((90.5 + 95.32 + 81.82 + 117.84 + 98.39 + 99.16) / 6) * 100) / 100,
  n11OrtalamaTarife(1),
);
/**
 * ⛔ TAVANIN ÜSTÜ İÇİN HÜKÜM VERİLMEZ. Son satırı uzatmak (45'in fiyatını
 * 60 desiye uygulamak) sessizce yanlış bir maliyet üretirdi.
 */
kontrol("tavanın ÜSTÜ null döner (uydurma yok)", n11OrtalamaTarife(46) === null);
kontrol("tavanın KENDİSİ hesaplanır", n11OrtalamaTarife(45) !== null);
kontrol("sıfır ve negatif desi null döner", n11OrtalamaTarife(0) === null && n11OrtalamaTarife(-1) === null);

/* ═══ ⑤ KANALIN KENDİ KESİNTİSİ — UÇTAN UCA DEĞER TESTİ ═══════════════ */
/**
 * ⭐ EN GÜÇLÜ ÖLÇÜT BU: n11 satıcı panelindeki GERÇEK kesintiler (Halil,
 * 09.09.2026). Tarife + posta hizmet bedeli + KDV zinciri, kanalın fiilen
 * kestiği KURUŞU üretmek zorunda. Üretmiyorsa ya aktarım yanlış ya formül —
 * ve ikisi de sessizce NET'e girerdi.
 *
 * ⚠ TABAN AÇIK YAZILIR: gövde KDV HARİÇ döndürür (`cargoAmount` tabanı),
 * panel KDV DAHİL gösteriyor; karşılaştırma ×1,2 ile yapılıyor.
 */
console.log("\n  ── KANALIN KENDİ KESİNTİSİ (uçtan uca)");
const PANEL: [number, number][] = [
  [1, 111.16],
  [2, 113.17],
  [3, 126.28],
  [9, 195.37],
  [11, 220.18],
];
for (const [desi, kesilen] of PANEL) {
  const s = n11KargoMaliyeti({ desi, kanalFirmasi: "Aras Kargo" });
  const kdvDahil = s.tamam ? Math.round(s.tutar * 1.2 * 100) / 100 : null;
  kontrol(
    "desi " + desi + " · Aras → kanalın kestiği ₺" + kesilen.toFixed(2),
    kdvDahil === kesilen,
    { hesaplanan: kdvDahil, kesilen },
  );
}
/**
 * ⛔ FİRMA BASAMAĞI SINANIR: kanal firmayı söylemediğinde ORTALAMAYA
 * düşülür ve sonuç FARKLI olur. İkisi aynı çıksaydı basamak hiçbir şey
 * yapmıyor demekti — ve bunu hiçbir değer testi söylemezdi.
 */
kontrol(
  "firma BİLİNMİYORSA ortalamaya düşer (ve sonuç FARKLI)",
  (() => {
    const a = n11KargoMaliyeti({ desi: 1, kanalFirmasi: "Aras Kargo" });
    const b = n11KargoMaliyeti({ desi: 1, kanalFirmasi: null });
    return (
      a.tamam && b.tamam && a.firma === "Aras Kargo" && b.firma === null && a.tutar !== b.tutar
    );
  })(),
);
kontrol(
  "TANINMAYAN firma adı da ortalamaya düşer (uydurma sütun YOK)",
  (() => {
    const s = n11KargoMaliyeti({ desi: 1, kanalFirmasi: "Sendeo" });
    return s.tamam && s.firma === null;
  })(),
);
kontrol(
  "desi yoksa / tavan dışıysa HÜKÜM VERİLMEZ",
  n11KargoMaliyeti({ desi: null, kanalFirmasi: "Aras Kargo" }).tamam === false &&
    n11KargoMaliyeti({ desi: 60, kanalFirmasi: "Aras Kargo" }).tamam === false,
);
/** ⚠ Kesirli desi YUKARI yuvarlanır — tarife tam basamakta. */
kontrol(
  "kesirli desi YUKARI yuvarlanır (2,3 → 3. basamak)",
  (() => {
    const a = n11KargoMaliyeti({ desi: 2.3, kanalFirmasi: "Aras Kargo" });
    const b = n11KargoMaliyeti({ desi: 3, kanalFirmasi: "Aras Kargo" });
    return a.tamam && b.tamam && a.tutar === b.tutar;
  })(),
);

console.log(
  "\n" +
    (hata === 0 ? "TÜM KONTROLLER GEÇTİ" : "BAŞARISIZ") +
    ` (${gecen}/${gecen + hata})`,
);
console.log(
  "\n⭐ AKTARIM KAYNAĞIN KENDİSİYLE DOĞRULANDI — beş desi basamağında" +
    " (1·2·3·9·11) kanalın FİİLEN kestiği kuruş üretildi." +
    "\n⚠ Kalan 40 basamak YAPISAL sınandı (artan sıra · nokta çaprazı);" +
    " onlar için 'bozulmamış' denir, 'doğrulandı' DENMEZ." +
    "\n⚠ Tarifenin SÜRÜMÜ var: temmuz kesintileri farklı oran veriyor —" +
    " bu tablo BUGÜNKÜ tarifedir, geçmişe uygulanmaz.\n",
);
process.exit(hata === 0 ? 0 : 1);
