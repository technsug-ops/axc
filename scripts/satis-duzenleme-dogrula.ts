import {
  ACIKLAMA_ZORUNLU_NEDENLER,
  DUZENLEME_NEDENLERI,
  nedenGecerliMi,
  duzenlemeImzasi,
  duzenlemePlani,
  type DuzenlemeGirdisi,
  type KalemDegisikligi,
} from "../src/lib/satis-duzenleme";
import { kdvDahilKargo } from "../src/lib/satis-duzenleme-veri";

/**
 * ============================================================================
 *  SATIŞ DÜZENLEME — DOĞRULAMA
 * ----------------------------------------------------------------------------
 *  Merkezinde GERÇEK VAKA var: satış 11511906855, fiyat ₺2.085 yazılmış,
 *  doğrusu ₺2.805. Maliyet ₺2.022,05 olduğu için sistem bu satışı ZARAR
 *  gösteriyor; düzeltince fark ₺63 → ₺783 olmalı.
 *
 *  Kontroller DEĞERE bakar, kaynak metnine değil.
 * ============================================================================
 */

let gecen = 0;
let kalan = 0;

function kontrol(ad: string, sonuc: boolean, gorulen?: unknown) {
  if (sonuc) {
    gecen++;
    console.log(`  OK    ${ad}`);
  } else {
    kalan++;
    console.log(
      `  HATA  ${ad}${gorulen === undefined ? "" : ` — ${JSON.stringify(gorulen)}`}`,
    );
  }
}

const kalem = (
  yeniFiyat: number,
  eskiFiyat = 2085,
  yeniAdet = 1,
  eskiAdet = 1,
  iadeEdilen = 0,
): KalemDegisikligi => ({
  saleItemId: "k1",
  eskiAdet,
  yeniAdet,
  eskiFiyat,
  yeniFiyat,
  iadeEdilenAdet: iadeEdilen,
  urunAdi: "Soundcore Q21i NC Kulak Üstü Bluetooth Kulaklık",
});

const kargoDegismez = {
  eskiDesi: 2,
  yeniDesi: 2,
  eskiTutar: 100,
  yeniTutar: 100,
  eskiFirmaId: "aras",
  yeniFirmaId: "aras",
};

const temel: DuzenlemeGirdisi = {
  iptalliMi: false,
  neden: "FIYAT_YANLIS",
  aciklama: null,
  kalemler: [kalem(2805)],
  kargo: kargoDegismez,
  paraBirimi: "TRY",
};

console.log("\nSATIŞ DÜZENLEME — DOĞRULAMA\n");

// --- 1) GERÇEK VAKA: 2085 → 2805 --------------------------------------------
{
  console.log("1) GERÇEK VAKA (11511906855)");
  const p = duzenlemePlani(temel);
  kontrol("düzenleme kabul edilir", p.olur === true);
  kontrol("tek fark: FİYAT", p.olur && p.farklar.length === 1 && p.farklar[0].alan === "FIYAT");
  kontrol("  ...eski 2085", p.olur && p.farklar[0].eski === 2085);
  kontrol("  ...yeni 2805", p.olur && p.farklar[0].yeni === 2805);
  kontrol("eski ciro 2085", p.olur && p.eskiCiro === 2085);
  kontrol("yeni ciro 2805", p.olur && p.yeniCiro === 2805);
  kontrol("ciro farkı +720", p.olur && p.ciroFarki === 720, p.olur ? p.ciroFarki : p);

  /**
   * MALİYET ₺2.022,05 ile karşılaştırma: eski fiyatta brüt fark ₺62,95
   * (komisyon+kargo sonrası zarar), yeni fiyatta ₺782,95. Kullanıcının
   * beklediği sonuç bu — testte ayrıca yazılı ki rakam kayarsa görülsün.
   */
  const maliyet = 2022.05;
  kontrol(
    "eski brüt fark ≈ 63 (zarar bölgesi)",
    p.olur && Math.round((p.eskiCiro - maliyet) * 100) / 100 === 62.95,
  );
  kontrol(
    "yeni brüt fark ≈ 783 (zarardan çıkar)",
    p.olur && Math.round((p.yeniCiro - maliyet) * 100) / 100 === 782.95,
  );

  /**
   * NET-2 PLANDA TAHMİN EDİLMEZ. Kâr motoru komisyon, KDV, stopaj ve kargoyu
   * birlikte çözer; burada tahmini bir NET üretmek kopya hesap olurdu.
   */
  kontrol("NET yeniden hesaplanacak diye işaretli", p.olur && p.netYenidenHesaplanacak === true);
}

// --- 2) GEREKÇE ZORUNLU — iz olmadan düzenleme yok --------------------------
{
  console.log("\n2) GEREKÇE ZORUNLU");
  kontrol(
    "nedensiz düzenleme OLMAZ",
    (() => {
      const p = duzenlemePlani({ ...temel, neden: null });
      return !p.olur && p.engel === "NEDEN_YOK";
    })(),
  );

  /**
   * KAPALI LİSTE (kullanıcı isteği 17.08.2026): serbest metin yerine
   * taksonomi. "DİĞER" kendini anlatmak zorunda.
   */
  kontrol(
    "DIGER açıklamasız OLMAZ",
    (() => {
      const p = duzenlemePlani({ ...temel, neden: "DIGER", aciklama: null });
      return !p.olur && p.engel === "ACIKLAMA_YOK";
    })(),
  );
  kontrol(
    "  ...yalnız boşluk açıklama SAYILMAZ",
    (() => {
      const p = duzenlemePlani({ ...temel, neden: "DIGER", aciklama: "   " });
      return !p.olur && p.engel === "ACIKLAMA_YOK";
    })(),
  );
  kontrol(
    "  ...açıklama varsa GEÇER",
    duzenlemePlani({ ...temel, neden: "DIGER", aciklama: "Kanal raporu farklı" }).olur === true,
  );

  // Diğer nedenler açıklama İSTEMEZ — gereksiz zorunluluk işi yavaşlatır.
  for (const n of ["FIYAT_YANLIS", "KARGO_YANLIS", "KANAL_FARKI", "KAMPANYA_INDIRIM"] as const) {
    kontrol(
      `${n} açıklamasız geçer`,
      duzenlemePlani({ ...temel, neden: n, aciklama: null }).olur === true,
    );
  }
  kontrol(
    "açıklama zorunlu liste YALNIZ DIGER",
    ACIKLAMA_ZORUNLU_NEDENLER.length === 1 && ACIKLAMA_ZORUNLU_NEDENLER[0] === "DIGER",
  );
  kontrol("neden listesi BEŞ kalem", DUZENLEME_NEDENLERI.length === 5);
  kontrol("geçersiz neden reddedilir", nedenGecerliMi("UYDURMA") === false);
  kontrol("geçerli neden tanınır", nedenGecerliMi("FIYAT_YANLIS") === true);
}

// --- 3) İPTALLİ SATIŞ DÜZENLENEMEZ ------------------------------------------
{
  console.log("\n3) İPTALLİ SATIŞ");
  const p = duzenlemePlani({ ...temel, iptalliMi: true });
  kontrol("iptalli satış düzenlenemez", !p.olur && p.engel === "IPTALLI");
}

// --- 4) ADET, İADE EDİLEN ADEDİN ALTINA İNEMEZ ------------------------------
{
  console.log("\n4) İADE SINIRI");
  /**
   * 3 adet satılmış, 2'si iade edilmiş. Adet 1'e düşürülemez: iade kaydı
   * satılmamış bir maldan dönmüş görünür, defter kendi içinde çelişirdi.
   */
  const p = duzenlemePlani({
    ...temel,
    kalemler: [kalem(2085, 2085, 1, 3, 2)],
  });
  kontrol("adet iade edilenin ALTINA inemez", !p.olur && p.engel === "ADET_IADE_ALTINDA", p);

  // Tam iade adedine EŞİT olması serbest.
  const esit = duzenlemePlani({ ...temel, kalemler: [kalem(2085, 2085, 2, 3, 2)] });
  kontrol("  ...iade adedine EŞİT düşürme serbest", esit.olur === true);

  // Üstüne çıkmak zaten serbest.
  const ustu = duzenlemePlani({ ...temel, kalemler: [kalem(2085, 2085, 5, 3, 2)] });
  kontrol("  ...artırmak serbest", ustu.olur === true);
}

// --- 5) GEÇERSİZ DEĞERLER ---------------------------------------------------
{
  console.log("\n5) GEÇERSİZ DEĞER");
  kontrol(
    "eksi fiyat reddedilir",
    (() => {
      const p = duzenlemePlani({ ...temel, kalemler: [kalem(-5)] });
      return !p.olur && p.engel === "FIYAT_GECERSIZ";
    })(),
  );
  kontrol(
    "sıfır adet reddedilir",
    (() => {
      const p = duzenlemePlani({ ...temel, kalemler: [kalem(2805, 2085, 0, 1)] });
      return !p.olur && p.engel === "ADET_GECERSIZ";
    })(),
  );
  kontrol(
    "ondalık adet reddedilir",
    (() => {
      const p = duzenlemePlani({ ...temel, kalemler: [kalem(2805, 2085, 1.5, 1)] });
      return !p.olur && p.engel === "ADET_GECERSIZ";
    })(),
  );
  kontrol(
    "eksi kargo tutarı reddedilir",
    (() => {
      const p = duzenlemePlani({
        ...temel,
        kargo: { ...kargoDegismez, yeniTutar: -1 },
      });
      return !p.olur && p.engel === "KARGO_GECERSIZ";
    })(),
  );
}

// --- 6) DEĞİŞİKLİK YOKSA YAZMA YOK ------------------------------------------
{
  console.log("\n6) DEĞİŞİKLİK YOK");
  const p = duzenlemePlani({ ...temel, kalemler: [kalem(2085)] });
  kontrol("hiçbir şey değişmediyse plan OLMAZ", !p.olur && p.engel === "DEGISIKLIK_YOK");
}

// --- 7) KARGO DÜZENLEME -----------------------------------------------------
{
  console.log("\n7) KARGO");
  const p = duzenlemePlani({
    ...temel,
    kalemler: [kalem(2085)],
    kargo: { ...kargoDegismez, yeniDesi: 3, yeniTutar: 145 },
  });
  kontrol("kargo değişikliği plana girer", p.olur === true);
  kontrol("  ...desi ve tutar ayrı fark", p.olur && p.farklar.length === 2);
  kontrol(
    "  ...ciro DEĞİŞMEZ (kargo ciro değil)",
    p.olur && p.ciroFarki === 0,
    p.olur ? p.ciroFarki : p,
  );
}

// --- 8) PLAN İMZASI — EK 1: onay gösterilene verilir ------------------------
{
  console.log("\n8) PLAN İMZASI (durum değişti kontrolü)");
  const a = duzenlemePlani(temel);
  const b = duzenlemePlani(temel);
  kontrol("aynı plan AYNI imzayı verir", duzenlemeImzasi(a) === duzenlemeImzasi(b));

  /**
   * TEK KURUŞ FARKI İMZAYI DEĞİŞTİRİR. Kullanıcı 2805'i onayladıysa
   * 2805,01 yazılamaz.
   */
  const kurus = duzenlemePlani({ ...temel, kalemler: [kalem(2805.01)] });
  kontrol("tek kuruş farkı imzayı DEĞİŞTİRİR", duzenlemeImzasi(a) !== duzenlemeImzasi(kurus));

  /**
   * ARAYA İADE GİRERSE: önizleme alındıktan sonra o satışa iade işlenir ve
   * adet artık iade sınırının altında kalırsa plan ENGELE döner — imza
   * değişir, yazma durur.
   */
  const araya = duzenlemePlani({
    ...temel,
    kalemler: [kalem(2805, 2085, 1, 1, 2)],
  });
  kontrol("araya iade girince plan ENGELE döner", araya.olur === false);
  kontrol(
    "  ...imza DEĞİŞİR (yazma durur)",
    duzenlemeImzasi(a) !== duzenlemeImzasi(araya),
    { once: duzenlemeImzasi(a), sonra: duzenlemeImzasi(araya) },
  );

  /**
   * ARAYA İPTAL GİRERSE: aynı şekilde imza değişir.
   */
  const iptalGirdi = duzenlemePlani({ ...temel, iptalliMi: true });
  kontrol("araya iptal girince imza DEĞİŞİR", duzenlemeImzasi(a) !== duzenlemeImzasi(iptalGirdi));

  // Engel imzaları da birbirinden ayrışır — hangi engel olduğu imzada.
  kontrol(
    "farklı engeller farklı imza",
    duzenlemeImzasi(araya) !== duzenlemeImzasi(iptalGirdi),
  );
}

// --- 9) KARGO KDV ÇEVİRİSİ — canlı hata 17.08.2026 --------------------------
{
  console.log("\n9) KARGO KDV ÇEVİRİSİ");

  /**
   * ⚠ CANLI HATA: `Sale.cargoAmount` KDV HARİÇ saklanır (ölçüldü: 32/32
   * satışta KARGO kesintisi = cargoAmount × 1,20). Düzenleme formu onu
   * "KDV dahil" etiketiyle gösterdi; kullanıcı DOKUNMADAN kaydetti ve motor
   * bir kez daha 1,2'ye böldü.
   *
   * Gerçek vaka (satış 11512722550): kargo kesintisi 88,96 → 74,13 düştü,
   * NET-2 881,22 yerine 908,40 çıktı. HER DÜZENLEMEDE %20 küçülüyordu:
   * üçüncüsünde 61,78, dördüncüsünde 51,48 olurdu.
   */
  kontrol("74,13 (KDV hariç) → 88,96 (KDV dahil)", kdvDahilKargo(74.13) === 88.96, kdvDahilKargo(74.13));
  kontrol("61,78 → 74,14", kdvDahilKargo(61.78) === 74.14, kdvDahilKargo(61.78));
  kontrol("null null kalır", kdvDahilKargo(null) === null);
  kontrol("sıfır sıfır kalır", kdvDahilKargo(0) === 0);

  /**
   * KURUŞA YUVARLAMA: 61,78 × 1,2 = 74,136 — kayan nokta artığı ekrana
   * "74,136000000001" olarak düşmemeli.
   */
  const y = kdvDahilKargo(61.78)!;
  kontrol("kuruş çözünürlüğünde", Math.round(y * 100) === y * 100, y);

  /**
   * ÇİFT ÇEVİRİ KAYBI: çeviri yapılmazsa değer her turda 1,2'ye bölünür.
   * Bu kontrol kaybın BÜYÜKLÜĞÜNÜ sabitliyor — 88,96'lık kargo üç
   * düzenlemede 51,48'e inerdi.
   */
  const bolerek = (n: number, kez: number) =>
    Math.round((kez === 0 ? n : bolerek(n / 1.2, kez - 1)) * 100) / 100;
  kontrol("çevirisiz üç turda 88,96 → 51,48 olurdu", bolerek(88.96, 3) === 51.48, bolerek(88.96, 3));
}

console.log("");
console.log("=".repeat(70));
if (kalan === 0) console.log(`TÜM KONTROLLER GEÇTİ (${gecen})`);
else {
  console.log(`${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrolden)`);
  process.exitCode = 1;
}
console.log("");
