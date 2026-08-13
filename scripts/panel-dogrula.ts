/**
 * ============================================================================
 *  PANEL VE ENVANTER DEĞERİ DOĞRULAMA
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run panel:dogrula
 *
 *  İki saf modülü sınar — ikisi de veritabanına gitmez, "şu an"ı kendi
 *  okumaz, aynı girdiyle her zaman aynı çıktıyı üretir:
 *    1) panel.ts    — ana sayfanın kanal blokları ve aylık serisi
 *    2) envanter.ts — depoda duran malın parası
 *
 *  ODAK: SESSİZ YANLIŞ RAKAM ÜRETMEME. Bu iki modülün en tehlikeli hatası
 *  patlamak değil, makul görünen ama yanlış bir toplam göstermektir —
 *  hesaplanamayan kârı sıfır saymak, değeri bilinmeyen stoğu bedava saymak,
 *  iki para birimini tek toplamda buluşturmak.
 * ============================================================================
 */

import { gunDegeri, pencereOlustur } from "../src/lib/donem";
import { envanterHesapla, type EnvanterVaryantGirdisi } from "../src/lib/envanter";
import {
  aylikSeri,
  panelHesapla,
  type PanelIadesi,
  type PanelSatisi,
} from "../src/lib/panel";
import { raporHesapla } from "../src/lib/rapor";

let basarisiz = 0;
let calisan = 0;

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

function yakin(ad: string, gelen: number, beklenen: number, tolerans = 0.005) {
  const fark = Math.abs(gelen - beklenen);
  calisan++;
  if (fark <= tolerans) {
    console.log(
      `  OK    ${ad.padEnd(40)} ${gelen.toFixed(2).padStart(10)}  (beklenen ${beklenen.toFixed(2)})`,
    );
  } else {
    basarisiz++;
    console.log(
      `  HATA  ${ad.padEnd(40)} ${gelen.toFixed(2).padStart(10)}  (beklenen ${beklenen.toFixed(2)}, FARK ${fark.toFixed(2)})`,
    );
  }
}

const gun = (yil: number, ay: number, g: number) => gunDegeri({ yil, ay, gun: g });

/** Sabit "şu an": 12 Ağustos 2026, İstanbul'da öğle. Testler takvimden bağımsız. */
const AN = new Date("2026-08-12T09:00:00Z");

function satis(ek: Partial<PanelSatisi> = {}): PanelSatisi {
  return {
    kanalKodu: "TRENDYOL",
    kanalAdi: "Trendyol",
    hesapAdi: "AXCALI",
    tarih: gun(2026, 8, 5),
    paraBirimi: "TRY",
    gelir: 1000,
    net2: 200,
    durum: "CALCULATED",
    kargoyaVerildiMi: false,
    ...ek,
  };
}

// ===========================================================================
console.log("\n1) PANEL — KANAL BLOKLARI");
// ===========================================================================
{
  const buAy = pencereOlustur("BU_AY", AN);

  // --- AYNI KANALIN FARKLI HESAPLARI TEK SATIRDA BİRLEŞİR ---
  // Kullanıcı aynı pazaryerinde birden fazla hesap açıyor (alım limiti).
  // "Trendyol bu ay ne yaptı" sorusu hesaplara bölünmüş hâlde okunmaz.
  const bloklar = panelHesapla(buAy, [
    satis({ gelir: 1000, net2: 200 }),
    satis({ gelir: 500, net2: 90 }),
    satis({ kanalKodu: "HEPSIBURADA", kanalAdi: "Hepsiburada", gelir: 300, net2: 40 }),
  ]);

  kontrol("tek para birimi bloğu", bloklar.length === 1, bloklar.length);
  const try_ = bloklar[0];
  kontrol("iki kanal", try_.kanallar.length === 2, try_.kanallar.length);
  kontrol(
    "ciroya göre sıralı (Trendyol başta)",
    try_.kanallar[0].kanalKodu === "TRENDYOL",
    try_.kanallar[0].kanalKodu,
  );
  yakin("Trendyol cirosu", try_.kanallar[0].gelir, 1500);
  yakin("Trendyol NET-2", try_.kanallar[0].net2, 290);
  kontrol("Trendyol adedi 2", try_.kanallar[0].adet === 2, try_.kanallar[0].adet);
  yakin("toplam ciro", try_.toplamGelir, 1800);
  yakin("toplam NET-2", try_.toplamNet2, 330);

  // --- PARA BİRİMLERİ ÇEVRİLMEZ: AYRI BLOK ---
  const ikiPara = panelHesapla(buAy, [
    satis({ gelir: 1000, net2: 200 }),
    satis({ paraBirimi: "EUR", gelir: 100, net2: 30 }),
  ]);
  kontrol("TRY ve EUR ayrı blok", ikiPara.length === 2, ikiPara.length);
  const eur = ikiPara.find((b) => b.paraBirimi === "EUR")!;
  yakin("EUR bloğu kendi cirosu", eur.toplamGelir, 100);
  kontrol(
    "  ...TRY tutarı EUR bloğuna KARIŞMADI",
    Math.abs(eur.toplamGelir - 1100) > 1,
    eur.toplamGelir,
  );

  // --- HESAPLANAMAYAN KÂR SIFIR SAYILMAZ ---
  // En sinsi hata burada olurdu: null NET'i 0 sayıp toplama katmak,
  // kârı olduğundan DÜŞÜK gösterir ve hiçbir uyarı çıkmaz.
  const eksik = panelHesapla(buAy, [
    satis({ gelir: 1000, net2: 200 }),
    satis({ gelir: 900, net2: null, durum: "NO_COST" }),
    satis({ gelir: 800, net2: 150, durum: "CURRENCY_MISMATCH" }),
  ]);
  const b = eksik[0];
  yakin("NET-2 yalnız hesaplanabilenden", b.toplamNet2, 200);
  kontrol("hesaplanamayan sayıldı (2)", b.hesaplanamayanAdet === 2, b.hesaplanamayanAdet);
  kontrol("satış adedi yine de 3", b.toplamAdet === 3, b.toplamAdet);
  yakin("ciro hepsinden (2700)", b.toplamGelir, 2700);
  kontrol(
    "  ...durumu CALCULATED olmayan NET toplama GİRMEDİ",
    Math.abs(b.toplamNet2 - 350) > 1,
    b.toplamNet2,
  );

  // --- PENCERE DIŞI KAYIT SAYILMAZ ---
  const disarda = panelHesapla(buAy, [
    satis({ tarih: gun(2026, 7, 31), gelir: 5000, net2: 900 }),
    satis({ tarih: gun(2026, 8, 1), gelir: 100, net2: 10 }),
  ]);
  yakin("geçen ayın satışı girmedi", disarda[0].toplamGelir, 100);
  kontrol("ayın 1'i DAHİL", disarda[0].toplamAdet === 1, disarda[0].toplamAdet);

  // Hiç kayıt yoksa blok da yok — boş ekran "0 TL kâr" demez.
  kontrol("kayıt yoksa blok yok", panelHesapla(buAy, []).length === 0);
}

// ===========================================================================
console.log("\n2) PANEL — AYLIK SERİ");
// ===========================================================================
{
  const veri = [
    satis({ tarih: gun(2026, 8, 5), gelir: 1000, net2: 200 }),
    satis({ tarih: gun(2026, 8, 20), gelir: 500, net2: 80 }),
    // Temmuz BOŞ bırakılıyor — bilerek.
    satis({ tarih: gun(2026, 6, 10), gelir: 300, net2: 50 }),
  ];

  const seri = aylikSeri(veri, { yil: 2026, ay: 8 }, 3, null, "TRY");

  kontrol("3 ay istendi, 3 nokta döndü", seri.length === 3, seri.length);
  kontrol("sıra eskiden yeniye", seri[0].ay === 6 && seri[2].ay === 8, seri.map((s) => s.ay));

  // KAYIT OLMAYAN AY DİZİDE KALIR. Atlansaydı çizgi Haziran'dan Ağustos'a
  // düz giderdi ve Temmuz'daki duruş görünmezdi.
  yakin("Haziran cirosu", seri[0].gelir, 300);
  yakin("Temmuz cirosu SIFIR (ay atlanmadı)", seri[1].gelir, 0);
  kontrol("Temmuz adedi 0", seri[1].adet === 0, seri[1].adet);
  yakin("Ağustos cirosu", seri[2].gelir, 1500);
  yakin("Ağustos NET-2", seri[2].net2, 280);

  // --- YIL SINIRI ---
  const yilAsan = aylikSeri(
    [satis({ tarih: gun(2025, 12, 15), gelir: 700, net2: 100 })],
    { yil: 2026, ay: 2 },
    4,
    null,
    "TRY",
  );
  kontrol(
    "yıl sınırını geçti (2025-11 ile başlar)",
    yilAsan[0].yil === 2025 && yilAsan[0].ay === 11,
    `${yilAsan[0].yil}-${yilAsan[0].ay}`,
  );
  yakin("Aralık 2025 cirosu", yilAsan[1].gelir, 700);

  // --- SÜZGEÇLER ---
  const suzulu = aylikSeri(
    [
      satis({ tarih: gun(2026, 8, 5), gelir: 1000, net2: 200 }),
      satis({
        tarih: gun(2026, 8, 6),
        kanalKodu: "HEPSIBURADA",
        kanalAdi: "Hepsiburada",
        gelir: 400,
        net2: 60,
      }),
      satis({ tarih: gun(2026, 8, 7), paraBirimi: "EUR", gelir: 90, net2: 20 }),
    ],
    { yil: 2026, ay: 8 },
    1,
    "TRENDYOL",
    "TRY",
  );
  yakin("kanal süzgeci: yalnız Trendyol", suzulu[0].gelir, 1000);

  const euroSeri = aylikSeri(
    [
      satis({ tarih: gun(2026, 8, 5), gelir: 1000, net2: 200 }),
      satis({ tarih: gun(2026, 8, 7), paraBirimi: "EUR", gelir: 90, net2: 20 }),
    ],
    { yil: 2026, ay: 8 },
    1,
    null,
    "EUR",
  );
  yakin("para birimi süzgeci: yalnız EUR", euroSeri[0].gelir, 90);

  // Seride de hesaplanamayan kâr sıfır sayılmaz.
  const seriEksik = aylikSeri(
    [
      satis({ tarih: gun(2026, 8, 5), gelir: 1000, net2: 200 }),
      satis({ tarih: gun(2026, 8, 9), gelir: 900, net2: null, durum: "NO_COST" }),
    ],
    { yil: 2026, ay: 8 },
    1,
    null,
    "TRY",
  );
  yakin("seri NET-2 yalnız hesaplanabilenden", seriEksik[0].net2, 200);
  kontrol(
    "seri hesaplanamayanı sayıyor",
    seriEksik[0].hesaplanamayanAdet === 1,
    seriEksik[0].hesaplanamayanAdet,
  );
}

// ===========================================================================
console.log("\n2c) İADE ETKİSİ — PANEL NET-2 = RAPOR Σ NET-2");
// ===========================================================================
/**
 * PANEL VE RAPOR AYNI TANIMI KULLANIR (kullanıcı kararı 12.08.2026).
 *
 * İki ekran aynı ay için farklı NET-2 gösterseydi "hangisi doğru" sorusu
 * doğardı. Bu bölüm eşitliği İKİ AYRI MOTORU AYNI VERİYLE koşturarak
 * kilitler — panel tarafına elle yazılmış bir beklenen değer yok, karşılık
 * rapor motorunun kendi çıktısıdır. Biri değişip diğeri unutulursa kırılır.
 */
{
  const buAy = pencereOlustur("BU_AY", AN);

  function iade(ek: Partial<PanelIadesi> = {}): PanelIadesi {
    return {
      kanalKodu: "TRENDYOL",
      kanalAdi: "Trendyol",
      hesapAdi: "AXCALI",
      tarih: gun(2026, 8, 10),
      paraBirimi: "TRY",
      net2: -340.43,
      durum: "CALCULATED",
      iadeTutari: 0,
      ...ek,
    };
  }

  const satislar = [
    satis({ gelir: 2504, net2: 308.48 }),
    satis({
      kanalKodu: "HEPSIBURADA",
      kanalAdi: "Hepsiburada",
      gelir: 2157,
      net2: 277.43,
    }),
  ];
  const iadeler = [iade({ net2: -340.43 })];

  // --- Panel motoru ---
  const panel = panelHesapla(buAy, satislar, iadeler)[0];

  // --- Rapor motoru: AYNI veri, kendi tipleriyle ---
  const rapor = raporHesapla(buAy, {
    satislar: satislar.map((s, i) => ({
      id: `s${i}`,
      kod: null,
      tarih: s.tarih,
      gelir: s.gelir,
      net1: 0,
      net2: s.net2,
      paraBirimi: s.paraBirimi,
      durum: s.durum,
    })),
    iadeler: iadeler.map((x, i) => ({
      id: `i${i}`,
      satisId: "s0",
      kod: null,
      tarih: x.tarih,
      net1: 0,
      net2: x.net2,
      paraBirimi: x.paraBirimi,
      durum: x.durum,
    })),
    giderler: [],
  }).paraBirimleri[0];

  yakin("panel NET-2 (iade dahil)", panel.toplamNet2, 245.48);
  yakin("rapor Σ NET-2 (brüt)", rapor.brutNet2, 245.48);
  kontrol(
    "İKİ MOTOR BİREBİR EŞİT",
    Math.abs(panel.toplamNet2 - rapor.brutNet2) < 0.0001,
    `panel ${panel.toplamNet2} · rapor ${rapor.brutNet2}`,
  );
  kontrol(
    "  ...iade sayılmasaydı 585,91 olurdu (eski davranış)",
    Math.abs(panel.toplamNet2 - 585.91) > 1,
    panel.toplamNet2,
  );
  yakin("ciro iadeden ETKİLENMEZ", panel.toplamGelir, 4661);
  kontrol("satış adedi 2 kalır", panel.toplamAdet === 2, panel.toplamAdet);
  kontrol("iade adedi ayrıca sayılır", panel.toplamIadeAdedi === 1, panel.toplamIadeAdedi);

  // --- İADE SATIŞIN KANALINA YAZILIR ---
  const ty = panel.kanallar.find((k) => k.kanalKodu === "TRENDYOL")!;
  const hb = panel.kanallar.find((k) => k.kanalKodu === "HEPSIBURADA")!;
  yakin("Trendyol NET-2 iade düşülmüş", ty.net2, 308.48 - 340.43);
  yakin("Hepsiburada NET-2 dokunulmamış", hb.net2, 277.43);
  kontrol("iade Trendyol satırında sayılı", ty.iadeAdedi === 1, ty.iadeAdedi);
  kontrol("Hepsiburada'da iade yok", hb.iadeAdedi === 0, hb.iadeAdedi);

  // --- İADE KENDİ AYINA DÜŞER, SATIŞIN AYINA DEĞİL ---
  // Temmuz satışının Ağustos iadesi Ağustos'a yazılır; kapanmış ay oynamaz.
  const gecmisSatis = panelHesapla(
    buAy,
    [satis({ tarih: gun(2026, 7, 20), gelir: 1000, net2: 200 })],
    [iade({ tarih: gun(2026, 8, 3), net2: -150 })],
  )[0];
  kontrol("geçen ayın satışı bu aya girmedi", gecmisSatis.toplamAdet === 0);
  yakin("ama iadesi bu aya yazıldı", gecmisSatis.toplamNet2, -150);
  kontrol(
    "  ...satışsız kanal bloğu yine de açıldı",
    gecmisSatis.kanallar.length === 1,
    gecmisSatis.kanallar.length,
  );

  // --- HESAPLANAMAYAN İADE SIFIR SAYILMAZ ---
  const eksikIade = panelHesapla(buAy, [satis({ net2: 200 })], [
    iade({ net2: null, durum: "NO_COST" }),
  ])[0];
  yakin("hesaplanamayan iade NET-2'ye girmedi", eksikIade.toplamNet2, 200);
  kontrol(
    "hesaplanamayan iade sayıldı",
    eksikIade.hesaplanamayanIadeAdedi === 1,
    eksikIade.hesaplanamayanIadeAdedi,
  );

  // --- GRAFİK ÇİZGİSİ DE AYNI TANIMI KULLANIR ---
  const seriIadeli = aylikSeri(
    satislar,
    { yil: 2026, ay: 8 },
    1,
    null,
    "TRY",
    iadeler,
  );
  yakin("grafik NET-2 = panel NET-2", seriIadeli[0].net2, panel.toplamNet2);
  kontrol("grafikte iade sayılı", seriIadeli[0].iadeAdedi === 1, seriIadeli[0].iadeAdedi);

  // Kanal süzgeci iadeyi de süzer: Hepsiburada seçiliyken TY iadesi girmez.
  const hbSeri = aylikSeri(satislar, { yil: 2026, ay: 8 }, 1, "HEPSIBURADA", "TRY", iadeler);
  yakin("kanal süzgeci iadeyi de süzer", hbSeri[0].net2, 277.43);

  // İade EUR, satış TRY: para birimleri karışmaz.
  const paraAyri = panelHesapla(buAy, [satis({ net2: 200 })], [
    iade({ paraBirimi: "EUR", net2: -50 }),
  ]);
  const tryBlok = paraAyri.find((x) => x.paraBirimi === "TRY")!;
  yakin("EUR iadesi TRY NET-2'sine karışmadı", tryBlok.toplamNet2, 200);
}

// ===========================================================================
console.log("\n3) ENVANTER DEĞERİ");
// ===========================================================================
{
  function varyant(
    variantId: string,
    kdvOrani: number | null,
    partiler: { kalanAdet: number; birimMaliyet: string | null; para?: "TRY" | "EUR" }[],
  ): EnvanterVaryantGirdisi {
    return {
      variantId,
      kdvOrani,
      partiler: partiler.map((p) => ({
        kalanAdet: p.kalanAdet,
        birimMaliyet: p.birimMaliyet,
        birimMaliyetParaBirimi: p.birimMaliyet === null ? null : (p.para ?? "TRY"),
      })),
    };
  }

  // --- TEMEL: ödenen KDV DAHİL, mal bedeli KDV HARİÇ ---
  const temel = envanterHesapla([
    varyant("v1", 20, [{ kalanAdet: 5, birimMaliyet: "120" }]),
  ]);
  const blok = temel.bloklar[0];
  yakin("ödenen 5 × 120", blok.toplamOdenen, 600);
  yakin("mal bedeli (%20 KDV hariç)", blok.toplamMalBedeli, 500);
  kontrol("adet 5", blok.toplamAdet === 5, blok.toplamAdet);

  // %10 kategoride oran ürüne göre değişmeli — sabit %20 varsayımı yok.
  const onKdv = envanterHesapla([
    varyant("v1", 10, [{ kalanAdet: 2, birimMaliyet: "110" }]),
  ]);
  yakin("%10 üründe mal bedeli", onKdv.bloklar[0].toplamMalBedeli, 200);

  // --- KDV ORANI ÇÖZÜLEMEDİ: HESAPLANAMADI, VARSAYILAN YOK ---
  const oransiz = envanterHesapla([
    varyant("v1", 20, [{ kalanAdet: 1, birimMaliyet: "120" }]),
    varyant("v2", null, [{ kalanAdet: 1, birimMaliyet: "240" }]),
  ]);
  const ob = oransiz.bloklar[0];
  yakin("ödenen ikisinden de (360)", ob.toplamOdenen, 360);
  yakin("mal bedeli YALNIZ çözülebilenden", ob.toplamMalBedeli, 100);
  kontrol(
    "  ...%20 varsayılıp 300 YAZILMADI",
    Math.abs(ob.toplamMalBedeli - 300) > 1,
    ob.toplamMalBedeli,
  );
  kontrol("çözülemeyen satır sayısı 1", ob.kdvCozulemeyenSatir === 1, ob.kdvCozulemeyenSatir);
  const cozulemeyen = ob.satirlar.find((s) => s.variantId === "v2")!;
  kontrol("çözülemeyen satırın mal bedeli null", cozulemeyen.malBedeli === null);
  kontrol("  ...ödeneni yine de biliniyor", Math.abs(cozulemeyen.odenen - 240) < 0.01);

  // --- MALİYETSİZ PARTİ: AYRI KOVA, TOPLAMA GİRMEZ ---
  // Sıfır sayılsaydı envanter olduğundan UCUZ görünürdü.
  const maliyetsiz = envanterHesapla([
    varyant("v1", 20, [
      { kalanAdet: 2, birimMaliyet: "120" },
      { kalanAdet: 7, birimMaliyet: null },
    ]),
  ]);
  const mb = maliyetsiz.bloklar[0];
  yakin("değerlenen ödenen (2 × 120)", mb.toplamOdenen, 240);
  kontrol("değerlenen adet 2", mb.toplamAdet === 2, mb.toplamAdet);
  kontrol(
    "bilinmeyen adet 7 ayrı durur",
    maliyetsiz.bilinmeyenToplamAdet === 7,
    maliyetsiz.bilinmeyenToplamAdet,
  );
  kontrol("  ...adet toplamına karışmadı", mb.toplamAdet !== 9, mb.toplamAdet);

  // --- BOZUK SAYI SESSİZCE 0 OLMAZ ---
  const bozuk = envanterHesapla([
    varyant("v1", 20, [{ kalanAdet: 3, birimMaliyet: "abc" }]),
  ]);
  kontrol("bozuk maliyet -> bilinmeyen kovası", bozuk.bilinmeyenToplamAdet === 3);
  kontrol("  ...değer bloğu oluşmadı", bozuk.bloklar.length === 0, bozuk.bloklar.length);

  // --- İKİ PARA BİRİMİ: AYRI SATIR, ÇEVRİM YOK ---
  const ikiPara = envanterHesapla([
    varyant("v1", 20, [
      { kalanAdet: 1, birimMaliyet: "120", para: "TRY" },
      { kalanAdet: 1, birimMaliyet: "50", para: "EUR" },
    ]),
  ]);
  kontrol("iki para birimi = iki blok", ikiPara.bloklar.length === 2, ikiPara.bloklar.length);
  const eurBlok = ikiPara.bloklar.find((x) => x.paraBirimi === "EUR")!;
  yakin("EUR bloğu 50", eurBlok.toplamOdenen, 50);
  kontrol(
    "  ...TRY ile toplanmadı (170 değil)",
    Math.abs(eurBlok.toplamOdenen - 170) > 1,
    eurBlok.toplamOdenen,
  );

  // --- TÜKENMİŞ PARTİ DEĞERLENMEZ ---
  const tukenmis = envanterHesapla([
    varyant("v1", 20, [
      { kalanAdet: 0, birimMaliyet: "120" },
      { kalanAdet: 3, birimMaliyet: "100" },
    ]),
  ]);
  yakin("yalnız kalanı olan parti", tukenmis.bloklar[0].toplamOdenen, 300);

  // --- FARKLI MALİYETLİ PARTİLER TOPLANIR (ortalama uydurulmaz) ---
  const cokParti = envanterHesapla([
    varyant("v1", 20, [
      { kalanAdet: 2, birimMaliyet: "100" },
      { kalanAdet: 3, birimMaliyet: "150" },
    ]),
  ]);
  yakin("2×100 + 3×150", cokParti.bloklar[0].toplamOdenen, 650);

  kontrol("hiç parti yoksa boş sonuç", envanterHesapla([]).bloklar.length === 0);
}

// ===========================================================================
console.log("\n5) CİRO SUNUMU — brüt · iade düşümü · net");
// ===========================================================================
/**
 * Mimar kararı 13.08.2026: panelin ciro gösterdiği HER yerde brüt, gri iade
 * düşümü ve net ciro. Bu bölüm sayının doğru TÜRETİLDİĞİNİ kilitliyor:
 * ekranın biçimi değişse de hesap değişmemeli.
 *
 * KRİTİK AYRIM: iade CİRODAN düşer ama NET-2 zaten kendi içinde düşülmüştür.
 * İkisini karıştırmak (iade tutarını NET-2'den bir kez daha düşmek) kârı
 * iki kez cezalandırırdı.
 */
{
  const buAy = pencereOlustur("BU_AY", AN);

  const iade = (ek: Partial<PanelIadesi> = {}): PanelIadesi => ({
    kanalKodu: "TRENDYOL",
    kanalAdi: "Trendyol",
    hesapAdi: "AXCALI",
    tarih: gun(2026, 8, 10),
    paraBirimi: "TRY",
    net2: -100,
    durum: "CALCULATED",
    iadeTutari: 0,
    ...ek,
  });

  // --- GERÇEK CANLI VAKA (13.08.2026, Ağustos): Trendyol 10.111 ciro,
  //     2.980 iade düşümü → net 7.131. Hepsiburada 4.898, iade YOK.
  const bloklar = panelHesapla(
    buAy,
    [
      satis({ gelir: 10111, hesapAdi: "AXCALI" }),
      satis({
        kanalKodu: "HEPSIBURADA",
        kanalAdi: "Hepsiburada",
        hesapAdi: "AXCALI",
        gelir: 4898,
      }),
    ],
    [iade({ iadeTutari: 2980 })],
  );

  const blok = bloklar[0];
  const ty = blok.kanallar.find((k) => k.kanalKodu === "TRENDYOL")!;
  const hb = blok.kanallar.find((k) => k.kanalKodu === "HEPSIBURADA")!;

  yakin("TY brüt ciro", ty.gelir, 10111);
  yakin("TY iade düşümü", ty.iadeTutari, 2980);
  yakin("TY net ciro (brüt − iade)", ty.gelir - ty.iadeTutari, 7131);
  yakin("HB iadesi yok -> düşüm 0", hb.iadeTutari, 0);
  yakin("blok brüt toplamı", blok.toplamGelir, 15009);
  yakin("blok iade toplamı", blok.toplamIadeTutari, 2980);
  yakin("blok net cirosu", blok.toplamGelir - blok.toplamIadeTutari, 12029);

  /**
   * SIFIR İLE "YOK" AYRIMI EKRANIN İŞİ, MOTORUN DEĞİL: motor her zaman sayı
   * üretir (0), ekran 0'ı "iade yok" / "— iade" diye yazar. Motor null
   * döndürseydi her çağıran ayrı bir null kuralı yorumlardı.
   */
  kontrol("iadesi olmayan kanalda tutar 0'dır (null değil)", hb.iadeTutari === 0);


  /**
   * KARGO SAYAÇLARI (14.08.2026). "Bekleyen" AYRI SAYAÇ DEĞİL: toplam −
   * verilen. Ayrı tutulsaydı iki sayaç birbirinden sapabilir ve panel
   * "8 sipariş, 5 verildi, 4 bekliyor" gibi imkânsız bir şey yazabilirdi.
   */
  const kargo = panelHesapla(buAy, [
    satis({ kargoyaVerildiMi: true }),
    satis({ kargoyaVerildiMi: true }),
    satis({ kargoyaVerildiMi: false }),
    satis({ kanalKodu: "HEPSIBURADA", kanalAdi: "Hepsiburada", kargoyaVerildiMi: false }),
  ]);
  const kb = kargo[0];
  kontrol("kargoya verilen 2", kb.kargoyaVerilenAdet === 2, kb.kargoyaVerilenAdet);
  kontrol("bekleyen 2 (toplam − verilen)", kb.kargoBekleyenAdet === 2, kb.kargoBekleyenAdet);
  kontrol(
    "verilen + bekleyen = toplam adet",
    kb.kargoyaVerilenAdet + kb.kargoBekleyenAdet === kb.toplamAdet,
    [kb.kargoyaVerilenAdet, kb.kargoBekleyenAdet, kb.toplamAdet],
  );
  kontrol(
    "kanal bazında da sayılıyor",
    kb.kanallar.find((k) => k.kanalKodu === "TRENDYOL")!.kargoyaVerilenAdet === 2,
    kb.kanallar.map((k) => [k.kanalKodu, k.kargoyaVerilenAdet]),
  );
  kontrol(
    "hiç işaretlenmemişse verilen 0, bekleyen = toplam",
    (() => { const x = panelHesapla(buAy, [satis(), satis()])[0]; return x.kargoyaVerilenAdet === 0 && x.kargoBekleyenAdet === 2; })(),
  );
  // --- HESAP KIRILIMI: aynı pazaryerinde iki mağaza ---
  const cokHesap = panelHesapla(
    buAy,
    [
      satis({ hesapAdi: "AXCALI", gelir: 6000 }),
      satis({ hesapAdi: "SEDA", gelir: 4000 }),
    ],
    [iade({ hesapAdi: "SEDA", iadeTutari: 1000 })],
  );
  const kanal = cokHesap[0].kanallar[0];
  kontrol("kanal iki hesaba bölündü", kanal.hesaplar.length === 2, kanal.hesaplar);
  kontrol(
    "hesaplar ciroya göre sıralı (büyük başta)",
    kanal.hesaplar[0].hesapAdi === "AXCALI",
    kanal.hesaplar.map((h) => h.hesapAdi),
  );
  yakin("hesap cirosu ayrı tutuluyor", kanal.hesaplar[0].gelir, 6000);
  yakin("iade DOĞRU hesaba yazıldı", kanal.hesaplar[1].iadeTutari, 1000);
  yakin("diğer hesabın iadesi 0", kanal.hesaplar[0].iadeTutari, 0);
  yakin(
    "hesap ciroları kanal cirosunu verir",
    kanal.hesaplar.reduce((t, h) => t + h.gelir, 0),
    kanal.gelir,
  );
  yakin(
    "hesap iadeleri kanal iadesini verir",
    kanal.hesaplar.reduce((t, h) => t + h.iadeTutari, 0),
    kanal.iadeTutari,
  );

  // Tek hesaplı kanalda kırılım YİNE ÜRETİLİR; gizleme kararı ekranın işi.
  const tekHesap = panelHesapla(buAy, [satis({ hesapAdi: "AXCALI" })], []);
  kontrol("tek hesapta da kırılım verisi var", tekHesap[0].kanallar[0].hesaplar.length === 1);

  // --- AYLIK SERİ: iade KENDİ ayına düşer ---
  const seri = aylikSeri(
    [satis({ tarih: gun(2026, 7, 20), gelir: 5000 })],
    { yil: 2026, ay: 8 },
    2,
    null,
    "TRY",
    [iade({ tarih: gun(2026, 8, 10), iadeTutari: 1500 })],
  );
  const temmuz = seri.find((n) => n.ay === 7)!;
  const agustos = seri.find((n) => n.ay === 8)!;
  yakin("Temmuz cirosu 5000", temmuz.gelir, 5000);
  yakin("Temmuz iade düşümü 0 (iade Ağustos'ta)", temmuz.iadeTutari, 0);
  yakin("Ağustos iade düşümü 1500", agustos.iadeTutari, 1500);
  /**
   * SATIŞSIZ AYDA İADE: brüt 0, düşüm 1500 → net −1500. Rakam eksiye
   * düşebilir ve bu DOĞRU: o ay kasadan para çıkmıştır. Ekran bunu
   * gizlemez.
   */
  yakin("satışsız ayda net ciro eksiye düşer", agustos.gelir - agustos.iadeTutari, -1500);
}

// ===========================================================================
console.log("\n" + "=".repeat(70));
if (basarisiz === 0) {
  console.log(`TÜM KONTROLLER GEÇTİ (${calisan})`);
} else {
  console.log(`${basarisiz} KONTROL BAŞARISIZ (${calisan} kontrolden)`);
  process.exitCode = 1;
}
console.log("");
