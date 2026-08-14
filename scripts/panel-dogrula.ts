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

import { readFileSync } from "node:fs";

import { gunDegeri, pencereOlustur } from "../src/lib/donem";
import { envanterHesapla, type EnvanterVaryantGirdisi } from "../src/lib/envanter";
import {
  bekleyenToplam,
  gorevleriKur,
  hepsiTemizMi,
} from "../src/lib/panel/bugun-ne-yapmaliyim";
import {
  nakitTakvimiKur,
  type TakvimSatiri,
} from "../src/lib/panel/nakit-takvimi";
import {
  DURUM_ISARETI,
  DURUM_YAZISI,
  DURUM_ZEMINI,
  tutarDurumu,
} from "../src/lib/panel/renkler";
import {
  adVarMi,
  gunSatirSayisi,
  gunuDokumle,
} from "../src/lib/panel/takvim-gruplama";
import {
  aylikSeri,
  panelHesapla,
  type PanelIadesi,
  type PanelSatisi,
} from "../src/lib/panel";
import {
  birimKar,
  enCokSatilan,
  karSiralamasi,
  karsizUrunSayisi,
  marjSiralamasi,
  marjYuzdesi,
  urunlereTopla,
  type KalemGirdisi,
} from "../src/lib/panel-listeler";
import { raporHesapla } from "../src/lib/rapor";
import {
  sermayeToplami,
  siralamaGecerliMi,
  yasBandi,
  YAS_BANTLARI,
  yaslanmaListesi,
  type YaslanmaGirdisi,
} from "../src/lib/yaslanma";

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
    // NET-1 > NET-2 olmalı: aradaki fark ödenecek KDV'dir. Testlerde de
    // gerçek hayattaki sıra korunuyor ki ikisi karışırsa gözle görülsün.
    net1: 260,
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
      net1: -300,
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
    net1: -80,
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
console.log("\n6) NET-1 — STOPAJ DÜŞÜLMÜŞ, ÖDENECEK KDV DÜŞÜLMEMİŞ");
// ===========================================================================
/**
 * Kullanıcı isteği 14.08.2026: panelde "net kâr 1, 2" birlikte görünsün.
 *
 * NET-1'in kendi bayrağı YOK, NET-2 ile aynı `durum`a bağlı — çünkü ikisi tek
 * hesaptan doğar. Bu bölüm iki şeyi kilitliyor: (a) NET-1 NET-2'den ayrı
 * toplanıyor, (b) hesaplanamayan kâr NET-1'de de sıfır sayılmıyor.
 */
{
  const buAy = pencereOlustur("BU_AY", AN);

  const bloklar = panelHesapla(buAy, [
    satis({ net1: 260, net2: 200 }),
    satis({ net1: 140, net2: 90 }),
  ]);
  const blok = bloklar[0];
  yakin("toplam NET-1", blok.toplamNet1, 400);
  yakin("toplam NET-2 ayrı durdu", blok.toplamNet2, 290);
  kontrol(
    "NET-1 > NET-2 (fark ödenecek KDV)",
    blok.toplamNet1 > blok.toplamNet2,
    [blok.toplamNet1, blok.toplamNet2],
  );
  yakin("kanal satırında da NET-1", blok.kanallar[0].net1, 400);
  yakin("hesap kırılımında da NET-1", blok.kanallar[0].hesaplar[0].net1, 400);

  // HESAPLANAMAYAN: NET-1 dolu olsa BİLE durum CALCULATED değilse sayılmaz.
  // En sinsi hata burada olurdu — NET-2 doğru, NET-1 şişkin çıkardı.
  const eksik = panelHesapla(buAy, [
    satis({ net1: 260, net2: 200 }),
    satis({ net1: 999, net2: null, durum: "NO_COST" }),
  ])[0];
  yakin("NET-1 yalnız hesaplanabilenden", eksik.toplamNet1, 260);
  kontrol(
    "  ...NO_COST satışın NET-1'i toplama GİRMEDİ",
    Math.abs(eksik.toplamNet1 - 1259) > 1,
    eksik.toplamNet1,
  );

  // İADE NET-1'İ DE DÜŞÜRÜR — satışla aynı kural.
  const iadeli = panelHesapla(
    buAy,
    [satis({ net1: 260, net2: 200 })],
    [
      {
        kanalKodu: "TRENDYOL",
        kanalAdi: "Trendyol",
        hesapAdi: "AXCALI",
        tarih: gun(2026, 8, 10),
        paraBirimi: "TRY",
        net1: -100,
        net2: -120,
        durum: "CALCULATED",
        iadeTutari: 500,
      },
    ],
  )[0];
  yakin("iade NET-1'den düştü", iadeli.toplamNet1, 160);
  yakin("iade NET-2'den de düştü", iadeli.toplamNet2, 80);

  // AYLIK SERİDE DE VAR: tablo NET-1 sütununu buradan okuyor.
  const seri = aylikSeri(
    [satis({ tarih: gun(2026, 8, 5), net1: 260, net2: 200 })],
    { yil: 2026, ay: 8 },
    1,
    null,
    "TRY",
  );
  yakin("seri NET-1", seri[0].net1, 260);
}

// ===========================================================================
console.log("\n7) ÜRÜN LİSTELERİ — EN ÇOK SATILAN / EN ÇOK KÂR / EN AZ KÂR");
// ===========================================================================
/**
 * Kullanıcı isteği 14.08.2026. Bu listelerin en tehlikeli hatası patlamak
 * değil, YANLIŞ ÜRÜNÜ ÖNE ÇIKARMAK: kârı hesaplanamamış bir ürünü "en az kâr
 * bırakan"ın başına oturtmak, olmayan bir bulguyu gerçek gibi gösterir.
 */
{
  const kalem = (ek: Partial<KalemGirdisi> = {}): KalemGirdisi => ({
    variantId: "v1",
    urunAdi: "Ürün 1",
    sku: "AX-1",
    adet: 1,
    ciro: 1000,
    net1: 260,
    net2: 200,
    durum: "CALCULATED",
    ...ek,
  });

  // --- AYNI VARYANTIN İKİ SATIŞI TEK SATIRDA TOPLANIR ---
  const toplu = urunlereTopla([
    kalem({ adet: 2, ciro: 2000, net2: 400 }),
    kalem({ adet: 3, ciro: 3000, net2: 600 }),
    kalem({ variantId: "v2", urunAdi: "Ürün 2", sku: "AX-2", adet: 1, ciro: 500, net2: 50 }),
  ]);
  kontrol("iki varyant iki satır", toplu.length === 2, toplu.length);
  const v1 = toplu.find((s) => s.variantId === "v1")!;
  kontrol("adetler toplandı (5)", v1.adet === 5, v1.adet);
  yakin("cirolar toplandı", v1.ciro, 5000);
  yakin("NET-2 toplandı", v1.net2, 1000);
  kontrol("kalem sayısı 2", v1.kalemSayisi === 2, v1.kalemSayisi);

  // --- HESAPLANAMAYAN KÂR SIFIR SAYILMAZ, AYRICA SAYILIR ---
  const eksikli = urunlereTopla([
    kalem({ adet: 1, net2: 200 }),
    kalem({ adet: 1, net2: null, durum: "NO_COST" }),
  ]);
  yakin("NET-2 yalnız hesaplanabilenden", eksikli[0].net2, 200);
  kontrol(
    "hesaplanamayan kalem sayıldı",
    eksikli[0].hesaplanamayanKalem === 1,
    eksikli[0].hesaplanamayanKalem,
  );
  kontrol("adet yine de 2", eksikli[0].adet === 2, eksikli[0].adet);

  // --- EN ÇOK SATILAN: ADETE GÖRE ---
  const satirlar = urunlereTopla([
    kalem({ variantId: "a", urunAdi: "A", sku: "A", adet: 10, ciro: 1000, net2: 50 }),
    kalem({ variantId: "b", urunAdi: "B", sku: "B", adet: 3, ciro: 9000, net2: 900 }),
    kalem({ variantId: "c", urunAdi: "C", sku: "C", adet: 5, ciro: 500, net2: -200 }),
  ]);
  const cokSatan = enCokSatilan(satirlar, 3);
  kontrol(
    "adet sırası A(10) > C(5) > B(3)",
    cokSatan.map((s) => s.variantId).join("") === "acb",
    cokSatan.map((s) => [s.variantId, s.adet]),
  );
  kontrol(
    "  ...ciroya göre sıralanmadı (B başta olurdu)",
    cokSatan[0].variantId !== "b",
    cokSatan[0].variantId,
  );
  kontrol("kaç satır istendiyse o kadar döner", enCokSatilan(satirlar, 2).length === 2);

  // --- EN ÇOK / EN AZ KÂR: NET-2'YE GÖRE, EKSİ KÂR EN ÜSTTE ---
  const cokKar = karSiralamasi(satirlar, "en-cok", 3);
  kontrol("en çok kâr B", cokKar[0].variantId === "b", cokKar[0].variantId);
  const azKar = karSiralamasi(satirlar, "en-az", 3);
  kontrol("en az kâr C (eksi kâr)", azKar[0].variantId === "c", azKar[0].variantId);
  yakin("  ...eksi kâr korunuyor", azKar[0].net2, -200);

  // --- KÂRI HİÇ HESAPLANAMAMIŞ ÜRÜN İKİ LİSTEYE DE GİRMEZ ---
  // Sıfır sayılsaydı "en az kâr bırakan"ın başına oturur ve kullanıcı
  // olmayan bir soruna bakardı.
  const karsizli = urunlereTopla([
    kalem({ variantId: "a", urunAdi: "A", sku: "A", net2: 300 }),
    kalem({ variantId: "z", urunAdi: "Z", sku: "Z", net2: null, durum: "RULE_MISSING" }),
  ]);
  const azKar2 = karSiralamasi(karsizli, "en-az", 5);
  kontrol("kârsız ürün listeye girmedi", azKar2.every((s) => s.variantId !== "z"), azKar2.map((s) => s.variantId));
  kontrol("kârsız ürün ayrıca sayıldı", karsizUrunSayisi(karsizli) === 1, karsizUrunSayisi(karsizli));
  kontrol(
    "  ...kısmen hesaplanan ürün listede KALIR",
    karSiralamasi(
      urunlereTopla([
        kalem({ variantId: "k", urunAdi: "K", sku: "K", net2: 100 }),
        kalem({ variantId: "k", urunAdi: "K", sku: "K", net2: null, durum: "NO_COST" }),
      ]),
      "en-az",
      5,
    ).length === 1,
  );
  kontrol("boş girdi boş liste", urunlereTopla([]).length === 0);

  // =========================================================================
  console.log("\n7b) KÂR MARJI — HACİMDEN BAĞIMSIZ SIRALAMA");
  // =========================================================================
  /**
   * Kullanıcı kararı 14.08.2026: "3 tane satmış, o yüzden en yüksek kârı
   * ondan etmiş" ile "ürünün kâr marjı üstün" AYRI iki listedir.
   *
   * Bu bölüm iki şeyi kilitliyor:
   *   1) İki sıralama GERÇEKTEN ayrışıyor (hacim marja karışmıyor).
   *   2) Marjın paydası, payı ile AYNI kalem kümesinden geliyor.
   */
  {
    // --- TEMEL: 1000 satıp 200 kâr = %20 ---
    const yirmi = urunlereTopla([kalem({ ciro: 1000, net2: 200 })])[0];
    yakin("marj %20", marjYuzdesi(yirmi)!, 20);
    yakin("birim kâr (1 adet)", birimKar(yirmi)!, 200);

    const cokAdet = urunlereTopla([kalem({ adet: 4, ciro: 4000, net2: 800 })])[0];
    yakin("adet artınca marj DEĞİŞMEZ", marjYuzdesi(cokAdet)!, 20);
    yakin("  ...birim kâr adede bölünür", birimKar(cokAdet)!, 200);

    // --- İKİ SIRALAMA AYRIŞIYOR ---
    // "cok": 3 adet × 1000, toplam kâr 900 (marj %30 değil %30... hacim yüksek)
    // "verimli": 1 adet × 500, kâr 250 → marj %50, toplam kâr 250.
    const satirlar2 = urunlereTopla([
      kalem({ variantId: "cok", urunAdi: "Hacim", sku: "H", adet: 3, ciro: 3000, net2: 900 }),
      kalem({ variantId: "verimli", urunAdi: "Verim", sku: "V", adet: 1, ciro: 500, net2: 250 }),
    ]);
    const toplamSirasi = karSiralamasi(satirlar2, "en-cok", 5);
    const marjSirasi = marjSiralamasi(satirlar2, "en-cok", 5);
    kontrol("toplam kârda hacimli başta", toplamSirasi[0].variantId === "cok", toplamSirasi[0].variantId);
    kontrol("marjda verimli başta", marjSirasi[0].variantId === "verimli", marjSirasi[0].variantId);
    kontrol(
      "  ...İKİ LİSTE FARKLI ÜRÜNÜ İŞARET EDİYOR",
      toplamSirasi[0].variantId !== marjSirasi[0].variantId,
    );
    yakin("hacimlinin marjı %30", marjYuzdesi(satirlar2.find((s) => s.variantId === "cok")!)!, 30);
    yakin("verimlinin marjı %50", marjYuzdesi(satirlar2.find((s) => s.variantId === "verimli")!)!, 50);

    // --- PAY VE PAYDA AYNI KALEM KÜMESİNDEN ---
    // Ürünün iki kalemi var: biri hesaplanmış (1000 ciro / 300 kâr = %30),
    // biri hesaplanamamış (9000 ciro). Payda 10.000 alınsaydı marj %3
    // çıkardı — sağlam ürün "zayıf marjlı" görünürdü.
    const yarim = urunlereTopla([
      kalem({ variantId: "y", urunAdi: "Y", sku: "Y", ciro: 1000, net2: 300 }),
      kalem({ variantId: "y", urunAdi: "Y", sku: "Y", ciro: 9000, net2: null, durum: "NO_COST" }),
    ])[0];
    yakin("marj hesaplanan kalemden (%30)", marjYuzdesi(yarim)!, 30);
    kontrol(
      "  ...tüm ciroya bölünmedi (%3 DEĞİL)",
      Math.abs(marjYuzdesi(yarim)! - 3) > 1,
      marjYuzdesi(yarim),
    );
    yakin("  ...toplam ciro yine 10.000 gösteriliyor", yarim.ciro, 10000);
    yakin("birim kâr da hesaplanan adetten", birimKar(yarim)!, 300);

    // --- HESAPLANAMAYAN VE SIFIR CİRO: MARJ NULL, LİSTEYE GİRMEZ ---
    const karsiz = urunlereTopla([
      kalem({ variantId: "z", urunAdi: "Z", sku: "Z", net2: null, durum: "RULE_MISSING" }),
    ])[0];
    kontrol("kârı hesaplanamayan -> marj null", marjYuzdesi(karsiz) === null, marjYuzdesi(karsiz));
    const bedava = urunlereTopla([kalem({ variantId: "b", ciro: 0, net2: 0 })])[0];
    kontrol("sıfır ciro -> marj null (sıfıra bölme yok)", marjYuzdesi(bedava) === null);
    kontrol(
      "marjsız ürünler listeye girmedi",
      marjSiralamasi(urunlereTopla([
        kalem({ variantId: "z", urunAdi: "Z", sku: "Z", net2: null, durum: "NO_COST" }),
        kalem({ variantId: "iyi", urunAdi: "İyi", sku: "I", ciro: 100, net2: 40 }),
      ]), "en-cok", 5).map((s) => s.variantId).join("") === "iyi",
    );

    // --- EKSİ MARJ EN AZ LİSTESİNİN BAŞINDA ---
    const eksili = urunlereTopla([
      kalem({ variantId: "zarar", urunAdi: "Zarar", sku: "Z2", ciro: 1000, net2: -150 }),
      kalem({ variantId: "kar", urunAdi: "Kâr", sku: "K2", ciro: 1000, net2: 150 }),
    ]);
    const enAzMarj = marjSiralamasi(eksili, "en-az", 5);
    kontrol("en az marjda zarar başta", enAzMarj[0].variantId === "zarar", enAzMarj[0].variantId);
    yakin("  ...eksi marj korunuyor (-%15)", marjYuzdesi(enAzMarj[0])!, -15);

    // Eşit marjda parası büyük olan üstte.
    const esit = urunlereTopla([
      kalem({ variantId: "kucuk", urunAdi: "K", sku: "K3", ciro: 100, net2: 20 }),
      kalem({ variantId: "buyuk", urunAdi: "B", sku: "B3", ciro: 10000, net2: 2000 }),
    ]);
    kontrol(
      "eşit marjda toplam kâr belirliyor",
      marjSiralamasi(esit, "en-cok", 2)[0].variantId === "buyuk",
      marjSiralamasi(esit, "en-cok", 2).map((s) => s.variantId),
    );
  }
}

// ===========================================================================
console.log("\n8) STOKTA BEKLEYEN — YAŞLANMA");
// ===========================================================================
/**
 * MİMAR KARARI 14.08.2026: ölçüt ADET DEĞİL YAŞLANMA; bantlar satır rozeti;
 * bağlı sermaye KDV HARİÇ; ikinci sıralama sermayeye göre.
 *
 * Bu bölüm eşikleri ve iki sıralamayı kilitliyor. Eşik kod içinde tek yerde
 * (`YAS_BANTLARI`) durduğu için buradaki sayılar değişirse test kırılır —
 * eşik sessizce kaymaz.
 */
{
  const BUGUN = gun(2026, 8, 14);

  const parti = (
    gunSayisi: number,
    kalanAdet: number,
    birimMaliyet: string | null,
    para: "TRY" | "EUR" = "TRY",
  ) => ({
    hareketId: `h${gunSayisi}-${kalanAdet}`,
    occurredAt: gun(2026, 8, 14 - gunSayisi),
    girenAdet: kalanAdet,
    kalanAdet,
    birimMaliyet,
    birimMaliyetParaBirimi: birimMaliyet === null ? null : (para as "TRY" | "EUR"),
    locationId: null,
  });

  // --- EŞİKLER: 0-30 nötr · 31-60 amber · 61+ kırmızı ---
  kontrol("30 gün NÖTR", yasBandi(30) === "NOTR", yasBandi(30));
  kontrol("31 gün AMBER (eşik)", yasBandi(31) === "AMBER", yasBandi(31));
  kontrol("60 gün AMBER", yasBandi(60) === "AMBER", yasBandi(60));
  kontrol("61 gün KIRMIZI (eşik)", yasBandi(61) === "KIRMIZI", yasBandi(61));
  kontrol("bugün girmiş mal NÖTR", yasBandi(0) === "NOTR", yasBandi(0));
  kontrol("eşikler tek kaynaktan", YAS_BANTLARI.amberGun === 31 && YAS_BANTLARI.kirmiziGun === 61, YAS_BANTLARI);

  // --- YAŞ EN ESKİ AÇIK PARTİDEN GELİR, SON GİRİŞTEN DEĞİL ---
  // Üstüne mal ekleyerek yaşı sıfırlamak mümkün olmamalı.
  const cokParti = yaslanmaListesi(
    [{ variantId: "v1", kdvOrani: 20, partiler: [parti(95, 4, "120"), parti(2, 10, "120")] }],
    BUGUN,
  );
  kontrol("yaş en eski partiden (95)", cokParti[0].yasGun === 95, cokParti[0].yasGun);
  kontrol("  ...son girişten olsaydı 2 olurdu", cokParti[0].yasGun !== 2);
  kontrol("adet iki partiden (14)", cokParti[0].adet === 14, cokParti[0].adet);
  kontrol("bant kırmızı", cokParti[0].bant === "KIRMIZI", cokParti[0].bant);

  // --- BAĞLI SERMAYE KDV HARİÇ ---
  // 5 × 120 = 600 ödenmiş; %20 KDV ayrışınca mal bedeli 500.
  const sermayeli = yaslanmaListesi(
    [{ variantId: "v1", kdvOrani: 20, partiler: [parti(10, 5, "120")] }],
    BUGUN,
  );
  yakin("sermaye KDV hariç", sermayeli[0].sermayeKdvHaric!, 500);
  kontrol("para birimi taşınıyor", sermayeli[0].sermayeParaBirimi === "TRY", sermayeli[0].sermayeParaBirimi);
  const onKdv = yaslanmaListesi(
    [{ variantId: "v1", kdvOrani: 10, partiler: [parti(10, 2, "110")] }],
    BUGUN,
  );
  yakin("%10 kategoride oran ürüne göre", onKdv[0].sermayeKdvHaric!, 200);

  // --- MALİYETİ BİLİNMEYEN PARTİ: SERMAYE NULL, SIFIR DEĞİL ---
  const maliyetsiz = yaslanmaListesi(
    [{ variantId: "v1", kdvOrani: 20, partiler: [parti(10, 5, "120"), parti(3, 2, null)] }],
    BUGUN,
  );
  kontrol("maliyetsiz parti varsa sermaye null", maliyetsiz[0].sermayeKdvHaric === null, maliyetsiz[0].sermayeKdvHaric);
  kontrol("  ...adet yine biliniyor (7)", maliyetsiz[0].adet === 7, maliyetsiz[0].adet);
  kontrol("  ...sıfır YAZILMADI", maliyetsiz[0].sermayeKdvHaric !== 0);

  // --- İKİ PARA BİRİMİ: TOPLAM KURULMAZ (çevirim yasak) ---
  const ikiPara = yaslanmaListesi(
    [{ variantId: "v1", kdvOrani: 20, partiler: [parti(10, 1, "120", "TRY"), parti(5, 1, "50", "EUR")] }],
    BUGUN,
  );
  kontrol("iki para birimi -> sermaye null", ikiPara[0].sermayeKdvHaric === null, ikiPara[0].sermayeKdvHaric);
  kontrol("  ...para birimi de null", ikiPara[0].sermayeParaBirimi === null);

  // --- TÜKENMİŞ PARTİ LİSTEYE GİRMEZ ---
  const tukenmis = yaslanmaListesi(
    [
      { variantId: "bos", kdvOrani: 20, partiler: [parti(80, 0, "120")] },
      { variantId: "dolu", kdvOrani: 20, partiler: [parti(5, 1, "120")] },
    ],
    BUGUN,
  );
  kontrol("stoğu bitmiş varyant listede yok", tukenmis.length === 1, tukenmis.map((s) => s.variantId));
  kontrol("  ...eski ama tükenmiş parti yaşlandırmıyor", tukenmis[0].variantId === "dolu");

  // --- İKİ SIRALAMA AYRIŞIYOR (canlı ölçüm 14.08.2026) ---
  // 95 günlük kalem 4.796,63 ₺ tutuyor; 14 günlük LEGO 37.789,50 ₺.
  // Tek sıralama dayatılsaydı diğer soru cevapsız kalırdı.
  const girdiler: YaslanmaGirdisi[] = [
    { variantId: "moka", kdvOrani: 20, partiler: [parti(95, 4, "1438.99")] },
    { variantId: "lego", kdvOrani: 20, partiler: [parti(14, 5, "9069.48")] },
  ];
  const yasSirali = yaslanmaListesi(girdiler, BUGUN, "yas");
  kontrol("yaş sırasında moka başta", yasSirali[0].variantId === "moka", yasSirali.map((s) => s.variantId));
  const sermayeSirali = yaslanmaListesi(girdiler, BUGUN, "sermaye");
  kontrol("sermaye sırasında lego başta", sermayeSirali[0].variantId === "lego", sermayeSirali.map((s) => s.variantId));
  kontrol(
    "  ...iki sıralama GERÇEKTEN ayrışıyor",
    yasSirali[0].variantId !== sermayeSirali[0].variantId,
  );
  kontrol("varsayılan sıralama yaş", yaslanmaListesi(girdiler, BUGUN)[0].variantId === "moka");

  // Sermaye sırasında "hesaplanamadı" satırları SONA gider — bilinmeyen
  // değer "en pahalı" gibi görünmemeli.
  const karisik = yaslanmaListesi(
    [
      { variantId: "bilinmeyen", kdvOrani: 20, partiler: [parti(90, 3, null)] },
      { variantId: "bilinen", kdvOrani: 20, partiler: [parti(5, 1, "1200")] },
    ],
    BUGUN,
    "sermaye",
  );
  kontrol(
    "hesaplanamayan sermaye sona düştü",
    karisik[karisik.length - 1].variantId === "bilinmeyen",
    karisik.map((s) => s.variantId),
  );

  // --- SIRALAMA PARAMETRESİ DOĞRULAMASI (adres elle kurcalanabilir) ---
  kontrol("geçerli ölçüt: yas", siralamaGecerliMi("yas"));
  kontrol("geçerli ölçüt: sermaye", siralamaGecerliMi("sermaye"));
  kontrol("uydurma ölçüt reddedilir", !siralamaGecerliMi("adet"));

  // --- TOPLAM SERMAYE TEK PARA BİRİMİ İÇİN ---
  const toplam = sermayeToplami(
    yaslanmaListesi(
      [
        { variantId: "a", kdvOrani: 20, partiler: [parti(10, 5, "120", "TRY")] },
        { variantId: "b", kdvOrani: 20, partiler: [parti(10, 1, "60", "EUR")] },
        { variantId: "c", kdvOrani: 20, partiler: [parti(10, 2, null)] },
      ],
      BUGUN,
    ),
    "TRY",
  );
  yakin("TRY toplamı yalnız TRY'den", toplam.toplam, 500);
  kontrol("  ...EUR karışmadı", Math.abs(toplam.toplam - 550) > 1, toplam.toplam);
  kontrol("hesaplanamayan ayrıca sayıldı", toplam.hesaplanamayan === 1, toplam.hesaplanamayan);
  kontrol("sayılan kalem 1", toplam.kalem === 1, toplam.kalem);

  kontrol("boş girdi boş liste", yaslanmaListesi([], BUGUN).length === 0);
}

// ===========================================================================
console.log("\n9) NAKİT TAKVİMİ VE GÖREV KUTUSU — AŞAMA 3 PAKET 1");
// ===========================================================================
/**
 * Takvim iki motoru BİRLEŞTİRİR; hiçbir hesap kuralı orada doğmaz. Bu
 * yüzden sınanan şey birleştirmenin kendisi: hangi satır takvime girer,
 * hangisi toplama katılır, hangisi hiç sayılmaz.
 *
 * Kural saf fonksiyonda ve burada DEĞER olarak sınanıyor — "ekranda var mı"
 * değil, "hangi rakamı üretiyor". Kalıcı derse uygun: koda gömülü karar
 * testin göremediği karardır.
 */
{
  const BUG = gunDegeri({ yil: 2026, ay: 8, gun: 14 });
  const gun = (g: number) => gunDegeri({ yil: 2026, ay: 8, gun: g });

  const s = (
    ek: Partial<TakvimSatiri> & Pick<TakvimSatiri, "yon" | "tutar">,
  ): TakvimSatiri => ({
    kaynak: "KART",
    tarih: gun(20),
    paraBirimi: "TRY",
    baslik: "x",
    adres: "/",
    ...ek,
  });

  const t1 = nakitTakvimiKur({
    satirlar: [
      s({ yon: "CIKACAK", tutar: 1000, tarih: gun(20) }),
      s({ yon: "GIRECEK", tutar: 400, tarih: gun(18), kaynak: "HAKEDIS_RAPOR" }),
      // GECİKMİŞ — toplama GİRER (mimar kararı 14.08.2026).
      s({ yon: "GIRECEK", tutar: 250, tarih: gun(10), kaynak: "HAKEDIS_RAPOR" }),
      // Pencere DIŞI (14 gün = 14–27 Ağustos) — sayılmaz.
      s({ yon: "CIKACAK", tutar: 9999, tarih: gun(30) }),
      // Vadesi bilinmiyor — sayılmaz, "?" listesinde durur.
      s({ yon: "GIRECEK", tutar: 777, tarih: null, kaynak: "HAKEDIS_TAHMIN" }),
      // TRY değil — kur çevrilmez, toplama karışmaz.
      s({ yon: "GIRECEK", tutar: 555, tarih: gun(19), paraBirimi: "EUR" }),
    ],
    bugun: BUG,
    pencereGun: 14,
  });

  yakin("çıkacak toplamı", t1.cikacakToplam, 1000);
  yakin("girecek toplamı (gecikmiş DAHİL)", t1.girecekToplam, 650);
  yakin("net pozisyon = girecek − çıkacak", t1.netPozisyon, -350);
  kontrol("açık varsa net EKSİ", t1.netPozisyon < 0, t1.netPozisyon);

  kontrol("gecikmiş ayrı listede", t1.gecikmis.length === 1, t1.gecikmis.length);
  yakin("gecikmiş girecek ayrıca dönüyor", t1.gecikmisGirecek, 250);

  /** SIFIR VARSAYILMAZ: vadesi bilinmeyen satır toplama KATILMAZ. */
  kontrol("vadesiz satır ayrı", t1.vadesizler.length === 1, t1.vadesizler.length);
  kontrol(
    "  ...ve toplama KATILMADI (777 eklenmedi)",
    Math.abs(t1.girecekToplam - 777) > 1,
  );

  /** Pencere dışı ve EUR satır SESSİZCE YUTULMAZ, sayılır. */
  kontrol(
    "pencere dışı + EUR satırlar dışarıda SAYILDI",
    t1.disaridaKalanlar.length === 2,
    t1.disaridaKalanlar.length,
  );
  kontrol(
    "  ...EUR toplama KARIŞMADI (kur çevrilmedi)",
    Math.abs(t1.girecekToplam - 1205) > 1,
  );

  kontrol("boş günler de üretiliyor (14 gün)", t1.gunler.length === 14, t1.gunler.length);
  kontrol(
    "gün toplamı satırla tutuyor",
    t1.gunler.find((g) => g.gun === "2026-08-20")?.cikacak === 1000,
  );

  /** 30 günlük pencerede dışarıda kalan satır İÇERİ girer. */
  const t2 = nakitTakvimiKur({
    satirlar: [s({ yon: "CIKACAK", tutar: 9999, tarih: gun(30) })],
    bugun: BUG,
    pencereGun: 30,
  });
  yakin("30 gün penceresinde satır içeri giriyor", t2.cikacakToplam, 9999);
  kontrol("  ...14 günde girmiyordu", t1.cikacakToplam !== 9999);

  kontrol(
    "hiç satır yoksa toplamlar sıfır ama gün listesi DOLU",
    (() => {
      const b = nakitTakvimiKur({ satirlar: [], bugun: BUG, pencereGun: 14 });
      return (
        b.cikacakToplam === 0 && b.girecekToplam === 0 && b.gunler.length === 14
      );
    })(),
  );

  // ------------------------------- GÖREV KUTUSU -------------------------------
  const gorevler = gorevleriKur({
    kargoBekleyen: 3,
    iadeBildirimi: 0,
    malKabulBekleyen: 2,
    karHesaplanamayan: 0,
    oransizKanalSku: 1,
  });
  kontrol("beş görev de üretiliyor", gorevler.length === 5, gorevler.length);
  /** AÇIK SIFIR: sıfır olan satır GİZLENMEZ, temiz işaretlenir. */
  kontrol(
    "sıfır olan satır listeden DÜŞMÜYOR",
    gorevler.filter((g) => g.temizMi).length === 2,
  );
  kontrol(
    "her görevin süzülü adresi var",
    gorevler.every((g) => g.adres.startsWith("/")),
  );
  yakin("bekleyen toplamı", bekleyenToplam(gorevler), 6);
  kontrol("hepsi sıfır değilse hepsiTemiz FALSE", !hepsiTemizMi(gorevler));
  kontrol(
    "hepsi sıfırsa hepsiTemiz TRUE",
    hepsiTemizMi(
      gorevleriKur({
        kargoBekleyen: 0,
        iadeBildirimi: 0,
        malKabulBekleyen: 0,
        karHesaplanamayan: 0,
        oransizKanalSku: 0,
      }),
    ),
  );

  // --------------------------- ÇİFT SAYIM KAPISI ---------------------------
  const veriKaynagi = readFileSync("src/lib/panel/takvim-verisi.ts", "utf8");
  kontrol(
    "rapordan kalemi olan satış tahmine GİRMİYOR (çift sayım kapısı)",
    veriKaynagi.includes("id: { notIn: [...raporluSatisIdleri] }"),
  );
  kontrol(
    "geçmiş kart ekstresi gecikmiş SAYILMIYOR (ödeme kaydı yok)",
    veriKaynagi.includes("if (ekstre.gecmisMi) continue;"),
  );
  kontrol(
    "ikinci motor açılmamış — kart ve hakediş mevcut motorlardan",
    veriKaynagi.includes("kartBorcuHesapla(") &&
      veriKaynagi.includes("beklenenHakedis(") &&
      veriKaynagi.includes("beklenenVade("),
  );

  // ------------------- İSİMSİZ SATIR YAZILMAZ (14.08.2026 kusuru) -------------
  /**
   * CANLIDA GÖRÜLEN: bir günde 20+ satır ve çoğunun başlığı "—". Hakediş
   * kalemleri sipariş SATIRI başına geliyor; kalem bir satışa bağlı
   * değilse gösterilecek ad yok. Panel isimsiz rakam duvarına döndü.
   *
   * KURAL: adını söyleyemeyen satır tek başına durmaz, kardeşleriyle
   * toplanır. Rakam kaybolmaz — okunabilir olur.
   */
  const adsiz = (tutar: number): TakvimSatiri => ({
    yon: "GIRECEK",
    kaynak: "HAKEDIS_RAPOR",
    tarih: gun(20),
    tutar,
    paraBirimi: "TRY",
    baslik: "—",
    adres: "/hakedis",
  });

  const dokum = gunuDokumle([
    adsiz(959.15),
    adsiz(959.15),
    adsiz(2471.4),
    s({ yon: "CIKACAK", tutar: 1500, baslik: "Garanti ••4321" }),
    s({ yon: "GIRECEK", tutar: 300, baslik: "11504122276", kaynak: "HAKEDIS_TAHMIN" }),
  ]);

  kontrol("adı olan satır TEK TEK duruyor", dokum.tekil.length === 2, dokum.tekil.length);
  kontrol("adsız üç satır TEK öbeğe indi", dokum.obekler.length === 1, dokum.obekler.length);
  yakin("öbek tutarı korunuyor (rakam kaybolmuyor)", dokum.obekler[0].tutar, 4389.7);
  kontrol("öbek adedi doğru", dokum.obekler[0].adet === 3, dokum.obekler[0].adet);
  /** ASIL KİLİT: ekranda çizilecek satır sayısı 5 değil 3. */
  kontrol(
    "20 kalemlik gün 3 satıra iniyor (rakam duvarı imkânsız)",
    gunSatirSayisi(dokum) === 3,
    gunSatirSayisi(dokum),
  );
  kontrol(
    "boş ve '-' başlıklar da adsız sayılıyor",
    !adVarMi("") && !adVarMi("—") && !adVarMi("-") && !adVarMi("?"),
  );
  kontrol("gerçek ad adsız SAYILMIYOR", adVarMi("11504122276"));

  // ------------------- EKRAN: SINIR VE BAĞIMSIZLIK YAZILI MI -------------------
  const takvimSayfasi = readFileSync("src/app/nakit-takvimi/page.tsx", "utf8");
  const nakitOzeti = readFileSync("src/app/nakit-ozeti.tsx", "utf8");
  const panelSayfasi = readFileSync("src/app/page.tsx", "utf8");
  const sozlukP = JSON.parse(readFileSync("messages/tr.json", "utf8"));

  kontrol(
    "dönem süzgecinden bağımsızlık EKRANDA yazıyor",
    takvimSayfasi.includes("donemBagimsiz") &&
      typeof sozlukP.NakitTakvimi?.donemBagimsiz === "string" &&
      sozlukP.NakitTakvimi.donemBagimsiz.includes("ETKİLENMEZ"),
  );
  kontrol(
    "kart sınırı EKRANDA yazıyor (sessiz yokluk yok)",
    takvimSayfasi.includes("kartSiniriNotu") &&
      typeof sozlukP.NakitTakvimi?.kartSiniriNotu === "string" &&
      sozlukP.NakitTakvimi.kartSiniriNotu.includes("hakediş"),
  );
  /**
   * PANEL YÖNETİCİ ÖZETİDİR. Kullanıcı 14.08.2026'da haklı olarak
   * "panel özet olmaktan çıkmış" dedi. Panelde GÜN LİSTESİ olamaz;
   * satır sayısı veriyle büyüyen hiçbir şey oraya konmaz.
   */
  kontrol(
    "panelde nakit ÖZETİ var, gün listesi YOK",
    panelSayfasi.includes("<NakitOzeti") &&
      !panelSayfasi.includes("<NakitTakvimiBlogu"),
  );
  kontrol(
    "  ...özet bloğu gün döngüsü ÇİZMİYOR",
    !nakitOzeti.includes(".gunler.map") && !nakitOzeti.includes("doluGunler"),
  );
  kontrol(
    "  ...ve ayrıntıya bağlantı veriyor",
    nakitOzeti.includes('href="/nakit-takvimi"'),
  );
  kontrol(
    "döküm ayrıntı sayfasında yaşıyor",
    takvimSayfasi.includes("gunuDokumle"),
  );
  kontrol(
    "panel yerleşimi: görev kutusu nakit özetinden ÖNCE",
    panelSayfasi.indexOf("<GorevKutusu") < panelSayfasi.indexOf("<NakitOzeti"),
  );
  /**
   * YETKİ: nakit takvimi bir PARA bloğudur. Operasyon görmemeli; izin
   * yoksa sorgu bile atılmamalı (veri sızıntısı da maliyet de olmasın).
   */
  kontrol(
    "nakit takvimi `satis.kar.gor`a bağlı",
    panelSayfasi.includes("karGorunur ? (") &&
      panelSayfasi.includes("<NakitOzeti"),
  );
  kontrol(
    "  ...izin yoksa takvim sorgusu ATILMIYOR",
    panelSayfasi.includes(
      "karGorunur ? takvimSatirlariniTopla(takvimBugun) : Promise.resolve([])",
    ),
  );
  /** Görev kutusu OPERASYONEL: izne bağlanmamalı. */
  kontrol(
    "görev kutusu izinsiz de görünüyor (operasyonel sayılar)",
    panelSayfasi.includes("<GorevKutusu sayilar={gorevSayilari} />"),
  );

  // ------------------------- RENK SİSTEMİ (15.08.2026) -------------------------
  /**
   * Mimar kararı: renk ANLAM taşır, süs değildir. Dört anlamsal ton, pastel
   * zemin + koyu yazı, ve en önemlisi: RENK TEK BAŞINA ANLAM TAŞIMAZ.
   * Renk körlüğünde (erkeklerin ~%8'i) ve siyah-beyaz çıktıda kırmızı ile
   * yeşil ayırt edilemez; işaret olmazsa bilgi tamamen kaybolur.
   */
  kontrol(
    "dört anlamsal ton da tanımlı",
    (["olumlu", "olumsuz", "uyari", "bilgi"] as const).every(
      (d) => DURUM_ZEMINI[d].length > 0 && DURUM_YAZISI[d].length > 0,
    ),
  );
  kontrol(
    "her tonun İŞARETİ var (renk tek başına konuşmaz)",
    (["olumlu", "olumsuz", "uyari", "bilgi"] as const).every(
      (d) => DURUM_ISARETI[d].length > 0,
    ),
    DURUM_ISARETI,
  );
  kontrol(
    "  ...ve tonlar birbirinden FARKLI işaret taşıyor",
    new Set(
      (["olumlu", "olumsuz", "uyari", "bilgi"] as const).map(
        (d) => DURUM_ISARETI[d],
      ),
    ).size === 4,
  );
  /**
   * SIFIR NÖTRDÜR. "Sıfır kâr" ne iyi ne kötüdür; yeşile boyamak yanlış bir
   * müjde, kırmızıya boyamak yersiz bir alarm olurdu.
   */
  kontrol("pozitif tutar olumlu", tutarDurumu(1) === "olumlu");
  kontrol("negatif tutar olumsuz", tutarDurumu(-1) === "olumsuz");
  kontrol("SIFIR nötr (ne müjde ne alarm)", tutarDurumu(0) === "notr");

  /** Karanlık tema: her ton iki temada da tanımlı olmalı. */
  kontrol(
    "her ton karanlık temada da tanımlı",
    (["olumlu", "olumsuz", "uyari", "bilgi"] as const).every((d) =>
      DURUM_ZEMINI[d].includes("dark:"),
    ),
  );

  /**
   * PALET TEK KAPIDAN GEÇER. Ekranlar ham renk kodu yazmamalı; yazarsa
   * palet değiştiğinde bir yer geride kalır ve renkler ayrışır.
   */
  const gorevEkrani = readFileSync("src/app/gorev-kutusu.tsx", "utf8");
  const nakitEkrani = readFileSync("src/app/nakit-ozeti.tsx", "utf8");
  for (const [ad, kaynak] of [
    ["görev kutusu", gorevEkrani],
    ["nakit özeti", nakitEkrani],
    ["panel", panelSayfasi],
  ] as const) {
    kontrol(
      `  ${ad} ham renk kodu YAZMIYOR (palet tek kapıdan)`,
      !/#[0-9A-Fa-f]{6}/.test(kaynak),
    );
  }
  kontrol(
    "marj rozeti paletten geliyor",
    panelSayfasi.includes("<DurumRozeti durum={renkDurumu}>"),
  );
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
