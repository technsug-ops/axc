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

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

import { gunDegeri, pencereOlustur } from "../src/lib/donem";
import { kdvHaric } from "../src/lib/kar";
import { karOrani, kutuOranlari } from "../src/lib/panel/kar-orani";
import { serileriKur } from "../src/lib/panel/operasyon-serisi";
import {
  envanterAra,
  envanterHesapla,
  envanterSirala,
  siralamaCoz,
  type EnvanterVaryantGirdisi,
} from "../src/lib/envanter";
import {
  bekleyenToplam,
  GOREV_ADRESLERI,
  GOREV_ANAHTARLARI,
  GOREV_GRUBU,
  gorevleriKur,
  grubunGorevleri,
  hepsiTemizMi,
} from "../src/lib/panel/bugun-ne-yapmaliyim";
import {
  tarifeKapsami,
  tarifeUyarisiVarMi,
  UYARI_GUNU,
} from "../src/lib/panel/tarife-penceresi";
import {
  nakitTakvimiKur,
  type TakvimSatiri,
} from "../src/lib/panel/nakit-takvimi";
import {
  ALIM_DURUM_RENGI,
  BILDIRIM_DURUM_RENGI,
  KAR_DURUM_RENGI,
  YAS_BANDI_RENGI,
} from "../src/lib/durum-renkleri";
import {
  ANLAMLI_RENKLER,
  DURUM_CIPI,
  DURUM_ISARETI,
  DURUM_KUTUSU,
  DURUM_RENKLERI,
  DURUM_SERIDI,
  DURUM_YAZISI,
  DURUM_ZEMINI,
  karDurumu,
  tutarDurumu,
} from "../src/lib/renkler";
import {
  adVarMi,
  gunSatirSayisi,
  gunuDokumle,
} from "../src/lib/panel/takvim-gruplama";
import {
  aylikSeri,
  panelHesapla,
  type PanelKargosu,
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
import { LISTE_PENCERELERI } from "../src/lib/donem";

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
    /** Satışın içindeki KDV — %20 dahil tutardan çıkarılmış hâli. */
    kdv: 0,
    net1: 260,
    net2: 200,
    durum: "CALCULATED",
    ...ek,
  };
}

/** Kargo kaydı — satıştan AYRI eksende yaşar (ölçüt shippedAt). */
function kargo(ek: Partial<PanelKargosu> = {}): PanelKargosu {
  return {
    kanalKodu: "TRENDYOL",
    kanalAdi: "Trendyol",
    paraBirimi: "TRY",
    kargoTarihi: gun(2026, 8, 5),
    /** Sevk edilen siparişin cirosu — kargo ÜCRETİ değil. */
    gelir: 1000,
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
    partiler: {
      kalanAdet: number;
      birimMaliyet: string | null;
      para?: "TRY" | "EUR";
      /** Partinin envantere giriş günü — sıralama testleri için. */
      gun?: number;
    }[],
  ): EnvanterVaryantGirdisi {
    return {
      variantId,
      kdvOrani,
      partiler: partiler.map((p) => ({
        kalanAdet: p.kalanAdet,
        birimMaliyet: p.birimMaliyet,
        birimMaliyetParaBirimi: p.birimMaliyet === null ? null : (p.para ?? "TRY"),
        girisTarihi: gun(2026, 8, p.gun ?? 1),
      })),
    };
  }

  /**
   * ── GİRİŞ TARİHİ · SIRALAMA · ARAMA (kullanıcı isteği 21.08.2026) ───────
   */
  {
    /**
     * ⚠ EN ESKİ PARTİ KAZANIR. Örnekte aynı varyantın iki partisi var:
     * 5 ve 20 Ağustos. En yeniyi yazan bir kod da "bir tarih" üretirdi ve
     * yalnız "tarih dolu mu" diye baksaydım yeşil kalırdı.
     */
    const iki = envanterHesapla([
      varyant("v-eski", 20, [
        { kalanAdet: 1, birimMaliyet: "100", gun: 20 },
        { kalanAdet: 1, birimMaliyet: "100", gun: 5 },
      ]),
    ]);
    const satir = iki.bloklar[0]!.satirlar[0]!;
    kontrol(
      "giriş tarihi EN ESKİ partiden",
      satir.girisTarihi?.getTime() === gun(2026, 8, 5).getTime(),
      satir.girisTarihi?.toISOString().slice(0, 10),
    );

    /** Maliyeti bilinmeyen parti satıra girmiyor, tarihi de girmemeli. */
    const bilinmeyenli = envanterHesapla([
      varyant("v-x", 20, [
        { kalanAdet: 1, birimMaliyet: null, gun: 1 },
        { kalanAdet: 1, birimMaliyet: "50", gun: 15 },
      ]),
    ]);
    kontrol(
      "değeri bilinmeyen partinin tarihi satıra GİRMİYOR",
      bilinmeyenli.bloklar[0]!.satirlar[0]!.girisTarihi?.getTime() ===
        gun(2026, 8, 15).getTime(),
    );

    // --- SIRALAMA ---
    const cok = envanterHesapla([
      varyant("ucuz-eski", 20, [{ kalanAdet: 1, birimMaliyet: "10", gun: 2 }]),
      varyant("pahali-yeni", 20, [{ kalanAdet: 1, birimMaliyet: "900", gun: 25 }]),
      varyant("orta", 20, [{ kalanAdet: 1, birimMaliyet: "500", gun: 10 }]),
    ]).bloklar[0]!.satirlar;

    /**
     * ⚠ ÖRNEK VERİ AYRIMIN İKİ YAKASINI GÖSTERİYOR: en pahalı olan en YENİ,
     * en ucuz olan en ESKİ. Değere göre sıra ile tarihe göre sıra böylece
     * BİRBİRİNİN TERSİ çıkıyor; ikisi aynı olsaydı "hep değere göre sırala"
     * mutasyonu yeşil kalırdı.
     */
    const degere = envanterSirala(cok, "deger").map((x) => x.variantId);
    kontrol(
      "değere göre: pahalı başta",
      degere.join(",") === "pahali-yeni,orta,ucuz-eski",
      degere,
    );
    const eskiye = envanterSirala(cok, "eski").map((x) => x.variantId);
    kontrol(
      "girişe göre (eski): en eski başta",
      eskiye.join(",") === "ucuz-eski,orta,pahali-yeni",
      eskiye,
    );
    const yeniye = envanterSirala(cok, "yeni").map((x) => x.variantId);
    kontrol(
      "girişe göre (yeni): en yeni başta",
      yeniye.join(",") === "pahali-yeni,orta,ucuz-eski",
      yeniye,
    );
    kontrol(
      "değer sırası ile tarih sırası AYNI DEĞİL",
      degere.join(",") !== eskiye.join(","),
    );
    /**
     * ⚠ DOĞRU ÖLÇÜT: girdi dizisi SIRALAMADAN ÖNCEKİ hâlini korumalı.
     * İlk yazdığım kontrol "girdi sırası çıktıdan farklı olmalı" diyordu ve
     * YANLIŞTI — ikisi tesadüfen aynı olabilir. Ölçülen şey mutasyon değil,
     * tesadüftü.
     */
    const oncekiSira = cok.map((x) => x.variantId).join(",");
    envanterSirala(cok, "eski");
    kontrol(
      "sıralama girdiyi BOZMUYOR (kopya üzerinde çalışır)",
      cok.map((x) => x.variantId).join(",") === oncekiSira,
      cok.map((x) => x.variantId),
    );
    kontrol("geçersiz sıra değere düşer", siralamaCoz("uydurma") === "deger");
    kontrol("boş sıra değere düşer", siralamaCoz(undefined) === "deger");
    kontrol("eski tanınır", siralamaCoz("eski") === "eski");

    // --- ARAMA ---
    const adlar = new Map([
      ["ucuz-eski", "Anker Kablo"],
      ["pahali-yeni", "LEGO Şato"],
      /** ⚠ "Işık" — Türkçe I/ı tuzağının test verisi (aşağıda). */
      ["orta", "Işıklı Tabela"],
    ]);
    const metin = (id: string) => adlar.get(id) ?? "";
    kontrol(
      "arama ada göre süzüyor",
      envanterAra(cok, "lego", metin).map((x) => x.variantId).join(",") ===
        "pahali-yeni",
    );
    /**
     * ⚠ TÜRKÇE I/ı TUZAĞI — VE İLK TESTİM BUNU YAKALAMIYORDU.
     *
     * Önce "ŞATO" ile sınamıştım; mutasyon (yerelsiz `toLowerCase`) YEŞİL
     * kaldı çünkü "Ş" iki yolda da aynı küçülüyor. Gerçek tuzak I/ı:
     *   "IŞIK".toLowerCase()              → "işık"   ✗ eşleşmez
     *   "IŞIK".toLocaleLowerCase("tr")    → "ışık"   ✓ eşleşir
     * Kullanıcı büyük harfle arattığında ürününü BULAMAZDI.
     */
    kontrol(
      "arama Türkçe I/ı harfinde eşleşiyor",
      envanterAra(cok, "IŞIK", metin).map((x) => x.variantId).join(",") === "orta",
      envanterAra(cok, "IŞIK", metin).map((x) => x.variantId),
    );
    kontrol("boş arama hepsini döndürür", envanterAra(cok, "  ", metin).length === 3);
    kontrol(
      "eşleşme yoksa BOŞ döner (hepsi değil)",
      envanterAra(cok, "yokboyleurun", metin).length === 0,
    );
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
   * ════════════════════════════════════════════════════════════════════
   *  KARGO — SEVKİYAT TARİHİ EKSENİ (15.08.2026 düzeltmesi)
   * --------------------------------------------------------------------
   *  ESKİ TESTLER HATAYI NEDEN YAKALAMADI: hatayı KURAL olarak yazmışlardı.
   *  Buradaki eski kontrol "verilen + bekleyen = toplam adet" diyordu —
   *  bu eşitlik ancak kargo SATIŞ tarihine göre sayılırsa doğrudur. Yani
   *  test, yanlış ekseni doğrulamıyor, ONAYLIYORDU. Bir test kendi
   *  varsayımını sınayamaz.
   *
   *  Eski kontroller ayrıca kargoyu hep satışla AYNI güne koyuyordu
   *  (`kargoyaVerildiMi: true`, tarih yok). İki eksenin ayrıştığı tek
   *  senaryo — dün satılıp bugün kargolanan sipariş — hiç kurulmamıştı.
   *  Ayrışmayan veriyle eksen hatası görünmez.
   *
   *  Yeni kontroller o senaryoyu ADIYLA kuruyor.
   * ════════════════════════════════════════════════════════════════════
   */
  const bugun = pencereOlustur("BUGUN", AN);
  // DÜN penceresi: "bugün" penceresini bir gün geriye kurmak için sabit an kaydırılır.
  const dun = pencereOlustur("BUGUN", new Date("2026-08-11T09:00:00Z"));

  /** DÜN satılan, BUGÜN kargolanan sipariş — hatanın tam senaryosu. */
  const dunSatBugunKargola = [
    kargo({ kargoTarihi: gun(2026, 8, 12) }),
    kargo({ kargoTarihi: gun(2026, 8, 12) }),
    kargo({ kargoTarihi: gun(2026, 8, 12) }),
    kargo({ kargoTarihi: gun(2026, 8, 12) }),
  ];
  /** BUGÜN satılan ve BUGÜN kargolanan iki sipariş. */
  const bugunkuler = [
    kargo({ kargoTarihi: gun(2026, 8, 12) }),
    kargo({ kargoTarihi: gun(2026, 8, 12) }),
  ];

  const bugunBlok = panelHesapla(
    bugun,
    [satis({ tarih: gun(2026, 8, 12) }), satis({ tarih: gun(2026, 8, 12) })],
    [],
    [...dunSatBugunKargola, ...bugunkuler],
  )[0];
  kontrol(
    "BUGÜN kargolanan 6 (2 bugünkü + 4 dünkü sipariş)",
    bugunBlok.kargoyaVerilenAdet === 6,
    bugunBlok.kargoyaVerilenAdet,
  );
  kontrol(
    "  ...aynı ekranda satış adedi 2 (satış ekseni ayrı, doğru)",
    bugunBlok.toplamAdet === 2,
    bugunBlok.toplamAdet,
  );
  kontrol(
    "  ...yani verilen + bekleyen = toplam adet ARTIK GEÇERLİ DEĞİL",
    bugunBlok.kargoyaVerilenAdet !== bugunBlok.toplamAdet,
  );

  /** Aynı sevkiyatlar DÜNÜN penceresinde GÖRÜNMEMELİ. */
  const dunBlok = panelHesapla(
    dun,
    [satis({ tarih: gun(2026, 8, 11) })],
    [],
    [...dunSatBugunKargola, ...bugunkuler],
  )[0];
  kontrol(
    "DÜN kargolanan 0 (bugün kargolananlar dünün hanesine yazılmıyor)",
    dunBlok.kargoyaVerilenAdet === 0,
    dunBlok.kargoyaVerilenAdet,
  );

  /** Kargo, o dönemde satışı olmayan bir kanal için de satır açar. */
  const yalnizKargo = panelHesapla(
    bugun,
    [satis({ tarih: gun(2026, 8, 12) })],
    [],
    [
      kargo({
        kanalKodu: "HEPSIBURADA",
        kanalAdi: "Hepsiburada",
        kargoTarihi: gun(2026, 8, 12),
      }),
    ],
  )[0];
  kontrol(
    "dönemde satışı olmayan kanaldan sevkiyat çıkarsa satır açılır",
    yalnizKargo.kanallar.find((k) => k.kanalKodu === "HEPSIBURADA")
      ?.kargoyaVerilenAdet === 1,
    yalnizKargo.kanallar.map((k) => [k.kanalKodu, k.kargoyaVerilenAdet]),
  );

  /**
   * BEKLEYEN DÖNEMDEN BAĞIMSIZ. Aynı bekleyen küme, hangi pencere
   * seçilirse seçilsin aynı sayıyı vermeli — "bugünün bekleyeni" yoktur.
   */
  const bekleyenler = [
    kargo({ kargoTarihi: null }),
    kargo({ kargoTarihi: null }),
    kargo({ kargoTarihi: null, kanalKodu: "HEPSIBURADA", kanalAdi: "Hepsiburada" }),
  ];
  const bugunBek = panelHesapla(bugun, [satis({ tarih: gun(2026, 8, 12) })], [], bekleyenler)[0];
  const ayBek = panelHesapla(buAy, [satis()], [], bekleyenler)[0];
  kontrol("bekleyen 3 — BUGÜN penceresinde", bugunBek.kargoBekleyenAdet === 3, bugunBek.kargoBekleyenAdet);
  kontrol(
    "  ...BU AY penceresinde de 3 (dönem bekleyeni değiştirmiyor)",
    ayBek.kargoBekleyenAdet === 3,
    ayBek.kargoBekleyenAdet,
  );
  kontrol(
    "  ...bekleyen kanal satırı AÇMIYOR (boş 0 satış satırı çıkmasın)",
    bugunBek.kanallar.every((k) => k.kanalKodu !== "HEPSIBURADA"),
    bugunBek.kanallar.map((k) => k.kanalKodu),
  );
  /**
   * ════════════════════════════════════════════════════════════════════
   *  KÂR ORANLARI — İKİ PAYDA, İKİ AYRI SORU
   * --------------------------------------------------------------------
   *  Tanımlar ARSIV.md'de mühürlü. Sözleşmenin kendisi bir tuzağı
   *  ADIYLA işaretlemişti: "payda KDV hariç OLACAK ama bu kendiliğinden
   *  gelmiyor — FIFO maliyeti KDV DÂHİL saklanıyor; bu adım atlanırsa
   *  oran sessizce düşük çıkar ve kimse fark etmez."
   *
   *  O yüzden burada KDV ayrıştırmasının YAPILDIĞI, sayıyla sınanıyor.
   * ════════════════════════════════════════════════════════════════════
   */
  {
    // Maliyet 1.200 (KDV dâhil, %20) → KDV hariç 1.000. Kâr 200.
    const maliyetKdvHaric = kdvHaric(1200, 20);
    kontrol(
      "KDV ayrıştırması: 1.200 (%20 dâhil) → 1.000",
      Math.abs(maliyetKdvHaric - 1000) < 0.01,
      maliyetKdvHaric,
    );
    const o = kutuOranlari({ kar: 200, maliyetKdvHaric, brutCiro: 2000 });
    kontrol(
      "maliyete göre oran %20 (200 / 1.000)",
      o.maliyete !== null && Math.abs(o.maliyete - 20) < 0.01,
      o.maliyete,
    );
    kontrol(
      "  ...KDV dâhil payda kullanılsaydı %16,7 çıkardı (sessiz hata)",
      Math.abs(karOrani(200, 1200)! - 16.6667) < 0.01,
    );
    kontrol(
      "satış fiyatına göre oran %10 (200 / 2.000 brüt ciro)",
      o.satisa !== null && Math.abs(o.satisa - 10) < 0.01,
      o.satisa,
    );

    /** Sözleşmedeki canlı örnek: ciro 6.200,00 · NET-2 272,85 → %4,40. */
    const canli = karOrani(272.85, 6200);
    kontrol(
      "sözleşmedeki canlı örnek doğrulanıyor (%4,40)",
      canli !== null && Math.abs(canli - 4.4008) < 0.01,
      canli,
    );

    /** SIFIRA BÖLME SESSİZ GEÇMEZ. */
    kontrol("payda 0 ise oran null (%0 DEĞİL)", karOrani(200, 0) === null);
    kontrol("  ...eksi payda da null", karOrani(200, -5) === null);
    kontrol(
      "  ...maliyet yoksa maliyet oranı null, ciro oranı yaşar",
      (() => {
        const x = kutuOranlari({ kar: 200, maliyetKdvHaric: 0, brutCiro: 2000 });
        return x.maliyete === null && x.satisa !== null;
      })(),
    );
    /** ZARAR EKSİ ORAN VERİR — mutlak değere çevrilmez. */
    kontrol(
      "zararda oran EKSİ çıkar (işaret saklanmaz)",
      karOrani(-100, 1000) === -10,
      karOrani(-100, 1000),
    );
  }

  kontrol(
    "kargo listesi boşsa verilen ve bekleyen 0",
    (() => {
      const x = panelHesapla(buAy, [satis(), satis()])[0];
      return x.kargoyaVerilenAdet === 0 && x.kargoBekleyenAdet === 0;
    })(),
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
      /**
       * ⚠ KARAR ÇEVRİLDİ 24.08.2026 — ESKİ GEREKÇE SİLİNMEDİ.
       *
       * ESKİ (14.08.2026): _"gecikmiş toplama GİRER"_ — vadesi geçmiş bir
       * hakediş kalemi hâlâ alacaktır, toplamdan düşmek onu yok saymaktır.
       *
       * NİYE ÇEVRİLDİ: sistem o kalem hakkında ödendi mi BİLMİYOR.
       * `paidAt` boş olması "hâlâ bekliyor" demek değil — kanal ödemiş ve
       * dosyaya düşmemiş olabilir. Ölçüldü (24.08): vadesi geçmiş NET
       * ₺779.244,05 ve bu tutar beklenen girişe sayıldığı için ekran
       * `+₺54.949 · açık yok` diyordu; ölçülen dip ise −₺161.383'tü.
       *
       * Yani eski kural bir şeyi yok saymamak için konmuştu ama sonucu
       * **ölçülmemiş bir parayı ölçülmüş gibi göstermek** oldu. Yeni kural
       * onu silmiyor, PİRİNÇ KOVAYA taşıyor: görünür kalıyor, toplama
       * girmiyor.
       */
      s({ yon: "GIRECEK", tutar: 250, tarih: gun(10), kaynak: "HAKEDIS_RAPOR" }),
      // Pencere DIŞI (14 gün = 14–27 Ağustos) — sayılmaz.
      s({ yon: "CIKACAK", tutar: 9999, tarih: gun(30) }),
      // Vadesi bilinmiyor — sayılmaz, "?" listesinde durur.
      s({ yon: "GIRECEK", tutar: 777, tarih: null, kaynak: "HAKEDIS_RAPOR" }),
      // TRY değil — kur çevrilmez, toplama karışmaz.
      s({ yon: "GIRECEK", tutar: 555, tarih: gun(19), paraBirimi: "EUR" }),
    ],
    bugun: BUG,
    pencereGun: 14,
  });

  yakin("çıkacak toplamı", t1.cikacakToplam, 1000);
  yakin("girecek toplamı (gecikmiş HARİÇ — 24.08 kararı)", t1.girecekToplam, 400);
  yakin("net pozisyon = girecek − çıkacak", t1.netPozisyon, -600);
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
  /**
   * ── YÜRÜYEN BAKİYE VE EN DİP NOKTA (24.08.2026) ─────────────────────
   *
   * Kullanıcı: nakit takviminin front end'i yetersiz. Eksik olan tek şey
   * biçim değildi: takvim gün gün "ne çıkacak / ne girecek" diyordu ama
   * **"o güne kadar nereye geldim"** sorusuna cevap vermiyordu.
   *
   * ⚠ ASIL SORU DÖNEM SONU DEĞİL, ÇUKUR. Net pozitif olsa bile arada
   * çukura düşülebilir: para 20'sinde giriyor, kart borcu 12'sinde
   * ödeniyorsa 12'sinde para YOKTUR. Yalnız toplam gösteren bir takvim o
   * günü hiç söylemez.
   */
  {
    /**
     * ⚠ ÖRNEK VERİ AYRIMI GÖSTERİYOR: dönem sonu ARTI (+400) ama arada
     * EKSİYE düşüyor. Yalnız net pozisyona bakan bir kontrol bu senaryoyu
     * ayırt edemezdi — çukurlu ve çukursuz takvim aynı görünürdü.
     */
    const cukur = nakitTakvimiKur({
      satirlar: [
        s({ yon: "CIKACAK", tutar: 1000, tarih: gun(16) }),
        s({ yon: "GIRECEK", tutar: 1400, tarih: gun(20), kaynak: "HAKEDIS_RAPOR" }),
      ],
      bugun: BUG,
      pencereGun: 14,
    });

    kontrol("çukur senaryosunda dönem sonu ARTI", cukur.netPozisyon === 400);
    kontrol(
      "  ...ama en dip EKSİ (çukur görünüyor)",
      cukur.enDip !== null && cukur.enDip.bakiye === -1000,
      cukur.enDip,
    );
    kontrol(
      "  ...ve dip GÜNÜ doğru (çıkışın olduğu gün)",
      cukur.enDip?.gun === gun(16).toISOString().slice(0, 10),
      cukur.enDip?.gun,
    );

    /**
     * ⚠ SON GÜNÜN YÜRÜYEN BAKİYESİ `netPozisyon`A EŞİT OLMAK ZORUNDA.
     * İkisi aynı ekranda yan yana duruyor; ayrışırlarsa kullanıcı hangisine
     * güveneceğini bilemez. Bu eşitlik kuruşuna sabitleniyor.
     */
    const sonGun = cukur.gunler[cukur.gunler.length - 1];
    kontrol(
      "son günün yürüyen bakiyesi = netPozisyon",
      sonGun.yuruyenBakiye === cukur.netPozisyon,
      { yuruyen: sonGun.yuruyenBakiye, net: cukur.netPozisyon },
    );

    /**
     * ⚠ GECİKMİŞLERDEN BAŞLAR. `netPozisyon` onları içeriyor; yürüyen bakiye
     * sıfırdan başlasaydı yukarıdaki eşitlik BOZULURDU ve aynı ekranda iki
     * farklı rakam olurdu.
     */
    const gecikmisli = nakitTakvimiKur({
      satirlar: [
        // Vadesi GEÇMİŞ çıkış — pencereden önce.
        s({ yon: "CIKACAK", tutar: 500, tarih: gun(10) }),
        s({ yon: "GIRECEK", tutar: 900, tarih: gun(18), kaynak: "HAKEDIS_RAPOR" }),
      ],
      bugun: BUG,
      pencereGun: 14,
    });
    kontrol(
      "gecikmiş, yürüyen bakiyenin BAŞLANGICINDA",
      gecikmisli.gunler[0].yuruyenBakiye === -500,
      gecikmisli.gunler[0].yuruyenBakiye,
    );
    kontrol(
      "  ...ve son gün yine netPozisyon'u tutuyor",
      gecikmisli.gunler[gecikmisli.gunler.length - 1].yuruyenBakiye ===
        gecikmisli.netPozisyon,
    );

    /**
     * ⚠ AYNI DİP İKİ GÜN SÜRERSE ERKEN OLANI UYARIR. Geç olanı seçmek,
     * kullanıcıya hazırlanmak için daha az zaman bırakırdı.
     */
    const duz = nakitTakvimiKur({
      satirlar: [s({ yon: "CIKACAK", tutar: 300, tarih: gun(15) })],
      bugun: BUG,
      pencereGun: 14,
    });
    kontrol(
      "aynı dip sürüyorsa ERKEN gün bildiriliyor",
      duz.enDip?.gun === gun(15).toISOString().slice(0, 10),
      duz.enDip?.gun,
    );

    /** Boş pencerede dip YOK — uydurulmuş bir sıfır günü gösterilmez. */
    const bos = nakitTakvimiKur({ satirlar: [], bugun: BUG, pencereGun: 14 });
    kontrol(
      "hareketsiz pencerede dip 0 ve ilk gün (uydurma yok)",
      bos.enDip !== null && bos.enDip.bakiye === 0,
    );

    // ── EKRAN ──────────────────────────────────────────────────────────
    const takvimEkrani = readFileSync("src/app/nakit-takvimi/page.tsx", "utf8");
    const ekranKodu = takvimEkrani
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
      .replace(/\/\*[\s\S]*?\*\//g, " ");
    kontrol(
      "gün kartında yürüyen bakiye YAZIYOR",
      /t\("yuruyenBakiye"\)[\s\S]{0,60}g\.yuruyenBakiye/.test(ekranKodu),
    );
    kontrol(
      "  ...eksi bakiye vurgulanıyor, artı nötr",
      /g\.yuruyenBakiye < 0 \? DURUM_YAZISI\.olumsuz/.test(ekranKodu),
    );
    kontrol("en dip kutusu VAR", /enDipEtiketi/.test(ekranKodu));
    /**
     * ⚠ YALNIZ DİP EKSİYSE UYARI RENGİ. Pozitif bir dip "en az şu kadar
     * rahatsınız" demektir; kırmızı göstermek her ekranda yanan bir uyarı
     * olurdu ve rozetin tamamına olan güveni götürürdü.
     */
    kontrol(
      "  ...uyarı rengi YALNIZ dip eksiyken",
      /takvim\.enDip\.bakiye < 0 \? DURUM_KUTUSU\.olumsuz/.test(ekranKodu),
    );
    /**
     * ⚠ SAYININ GÖRELİ OLDUĞU EKRANDA YAZIYOR. Sistem banka bakiyesi
     * tutmuyor; rakam "kasanızda şu kadar olacak" değil "bugüne göre şu
     * kadar aşağıda olacaksınız" demek. Mutlak sanılırsa parası olmayan
     * kendini borçlu, borçlu olan kendini rahat sanar.
     */
    kontrol("  ...göreli olduğu açıklamada yazıyor", /enDipAciklama/.test(ekranKodu));
  }

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
    tarifePenceresi: 0,
  });
  kontrol(
    "altı görev de üretiliyor",
    gorevler.length === 6,
    gorevler.length,
  );
  /** AÇIK SIFIR: sıfır olan satır GİZLENMEZ, temiz işaretlenir. */
  kontrol(
    "sıfır olan satır listeden DÜŞMÜYOR",
    /**
     * ⚠ SAYI SABİT DEĞİL, ÖRNEKTEN TÜRETİLİYOR. Önce `=== 2` yazılıydı
     * ve altıncı görev eklenince kırmızı yandı — kod doğruydu, ÖLÇÜT
     * bayatlamıştı. Elle tutulan sayı, her yeni görevde aynı bakımı ister.
     */
    gorevler.filter((g) => g.temizMi).length ===
      gorevler.filter((g) => g.sayi === 0).length,
    gorevler.filter((g) => g.temizMi).length,
  );
  kontrol(
    "her görevin süzülü adresi var",
    gorevler.every((g) => g.adres.startsWith("/")),
  );

  yakin("bekleyen toplamı", bekleyenToplam(gorevler), 6);

  // ── İKİ KART: her görev BİR gruba ait, hiçbiri boşta kalmıyor ──────────
  const sevkiyat = grubunGorevleri(gorevler, "SEVKIYAT");
  const tedarik = grubunGorevleri(gorevler, "TEDARIK");
  kontrol(
    "her görev tam olarak BİR kartta",
    /**
     * ⚠ ÖLÇÜT BÖLÜNME, SAYI DEĞİL. `2 + 3` yazılıydı; altıncı görev
     * eklenince kırmızı yandı. Asıl sınanmak istenen şey "her görev bir
     * ve yalnız bir kartta" idi — o da toplamla ve kesişimin boşluğuyla
     * ölçülür, elle sayılan iki rakamla değil.
     */
    sevkiyat.length + tedarik.length === gorevler.length &&
      sevkiyat.every((g) => !tedarik.includes(g)),
    { sevkiyat: sevkiyat.length, tedarik: tedarik.length },
  );
  kontrol(
    "kargo ve iade SEVKİYAT kartında",
    sevkiyat.map((g) => g.anahtar).join(",") === "kargoBekleyen,iadeBildirimi",
    sevkiyat.map((g) => g.anahtar),
  );
  kontrol(
    "TEDARİK kartı: sevkiyat DIŞINDA kalan her görev",
    /**
     * ⚠ TÜMLEYEN İLE ÖLÇÜLÜYOR, LİSTEYLE DEĞİL ("tip listesi değil, BAĞ").
     * Elle yazılan üç ad, dördüncü TEDARİK görevi eklendiğinde sessizce
     * bayatlıyordu. Ölçüt artık şu: SEVKIYAT olmayan her görev burada.
     */
    tedarik.map((g) => g.anahtar).join(",") ===
      GOREV_ANAHTARLARI.filter((a) => GOREV_GRUBU[a] === "TEDARIK").join(","),
    tedarik.map((g) => g.anahtar),
  );
  /** Kart rozeti kendi kartının bekleyenini sayar — ötekininkini değil. */
  yakin("SEVKİYAT kartının rozeti", bekleyenToplam(sevkiyat), 3);
  yakin("TEDARİK kartının rozeti", bekleyenToplam(tedarik), 3);

  /**
   * ── ADRES İDDİASI SINANIYOR ────────────────────────────────────────────
   * ⚠ VAKA 20.08.2026: yeni bir görev için `/alimlar?tarih=bugun` yazılmıştı.
   * ÖYLE BİR SÜZGEÇ YOKTU — listeler `pencere` parametresi okuyor ve kabul
   * ettikleri değerler `LISTE_PENCERELERI`de sabit. Sayı var olmayan bir
   * adrese götürseydi tıklayan boş liste görür ve panele güvenmezdi.
   *
   * Burada her adresin `pencere` parametresi (varsa) listenin GERÇEKTEN
   * kabul ettiği kümeyle karşılaştırılıyor — dize eşitliğiyle değil.
   */
  for (const [anahtar, adres] of Object.entries(GOREV_ADRESLERI)) {
    const pencere = new URLSearchParams(adres.split("?")[1] ?? "").get("pencere");
    kontrol(
      `${anahtar} adresinin pencere değeri geçerli`,
      pencere === null ||
        (LISTE_PENCERELERI as readonly string[]).includes(pencere),
      { adres, pencere },
    );
  }
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
        tarifePenceresi: 0,
      }),
    ),
  );

  // --------------------------- TARİFE PENCERESİ (K47) ---------------------------
  /**
   * ⚠ ÖRNEK VERİ AYRIMIN İKİ YAKASINI GÖSTERİYOR. Tek pencereyle
   * sınasaydık "bitiş günü DAHİL" kuralını hiçbir mutasyon kıramazdı:
   * bugünü kapsayan ve kapsamayan iki pencere birlikte lazım.
   */
  {
    const bugun = new Date("2026-08-25T09:00:00.000Z");
    const g = (m: string) => new Date(`${m}T00:00:00.000Z`);

    /** ① BİTİŞ GÜNÜ DAHİL — bugün biten pencere HÂLÂ kapsıyor. */
    const bugunBiten = tarifeKapsami(
      [{ kanalAdi: "Trendyol", sonBitis: g("2026-08-25") }],
      bugun,
    );
    kontrol(
      "bitiş günü DAHİL — bugün biten pencere kapsamsız SAYILMAZ",
      bugunBiten.kapsamsizKanal === 0 && bugunBiten.kalanGun === 0,
      bugunBiten,
    );

    /** ② DÜN BİTEN pencere kapsamsız. Ayrımın öteki yakası. */
    const dunBiten = tarifeKapsami(
      [{ kanalAdi: "Trendyol", sonBitis: g("2026-08-24") }],
      bugun,
    );
    kontrol(
      "dün biten pencere KAPSAMSIZ sayılır",
      dunBiten.kapsamsizKanal === 1 &&
        dunBiten.kalanGun === null &&
        dunBiten.kapsamsizAdlar[0] === "Trendyol",
      dunBiten,
    );

    /**
     * ③ KALAN GÜN = EN YAKIN BİTİŞ, en uzak değil.
     * ⚠ İki kanal FARKLI günde bitiyor; eşit olsalardı `Math.min` yerine
     * `Math.max` yazan bir mutasyon yeşil kalırdı.
     */
    const ikiKanal = tarifeKapsami(
      [
        { kanalAdi: "Trendyol", sonBitis: g("2026-08-27") },
        { kanalAdi: "Hepsiburada", sonBitis: g("2026-09-10") },
      ],
      bugun,
    );
    kontrol(
      "kalan gün EN YAKIN bitişten (2 ≠ 16)",
      ikiKanal.kapsamsizKanal === 0 && ikiKanal.kalanGun === 2,
      ikiKanal,
    );

    /** ④ HİÇ TARİFE YOKSA hüküm verilmez — uyarı da yanmaz. */
    const bos = tarifeKapsami([], bugun);
    kontrol(
      "tarifesi olmayan kanal kümeye GİRMEZ — sonsuz uyarı doğmaz",
      bos.kapsamsizKanal === 0 &&
        bos.kalanGun === null &&
        !tarifeUyarisiVarMi(bos),
      bos,
    );

    /**
     * ⑤ EŞİK — ölçülen değere göre: TY penceresi 5 günlük, dosya
     * bitmeden 3 gün önce yayımlanıyor. Eşiğin İKİ yakası da sınanıyor.
     */
    kontrol(
      `eşik ${UYARI_GUNU} gün — ${UYARI_GUNU} gün kala uyarı YANAR`,
      tarifeUyarisiVarMi({
        kapsamsizKanal: 0,
        kalanGun: UYARI_GUNU,
        kapsamsizAdlar: [],
      }),
    );
    kontrol(
      `eşik ${UYARI_GUNU} gün — ${UYARI_GUNU + 1} gün kala uyarı YANMAZ`,
      !tarifeUyarisiVarMi({
        kapsamsizKanal: 0,
        kalanGun: UYARI_GUNU + 1,
        kapsamsizAdlar: [],
      }),
    );

    /**
     * ⑥ SAYI 0 AMA ACELE → SATIR TEMİZ SAYILMAZ.
     * ⚠ BU MADDE OLMADAN uyarı, tam kaçırılmaması gereken gün "temiz ✓"
     * yazardı — anayasa: "yanlış cevap veren ekran".
     */
    const aceleGorev = gorevleriKur(
      {
        kargoBekleyen: 0,
        iadeBildirimi: 0,
        malKabulBekleyen: 0,
        karHesaplanamayan: 0,
        oransizKanalSku: 0,
        tarifePenceresi: 0,
      },
      undefined,
      { tarifePenceresi: { kalanGun: 0, aceleMi: true } },
    ).find((x) => x.anahtar === "tarifePenceresi")!;
    kontrol(
      "sayı 0 + acele → satır TEMİZ SAYILMAZ",
      aceleGorev.temizMi === false && aceleGorev.kalanGun === 0,
      aceleGorev,
    );
    /** Ayrımın öteki yakası: acele değilse 0 gerçekten temizdir. */
    const sakinGorev = gorevleriKur(
      {
        kargoBekleyen: 0,
        iadeBildirimi: 0,
        malKabulBekleyen: 0,
        karHesaplanamayan: 0,
        oransizKanalSku: 0,
        tarifePenceresi: 0,
      },
      undefined,
      { tarifePenceresi: { kalanGun: 9, aceleMi: false } },
    ).find((x) => x.anahtar === "tarifePenceresi")!;
    kontrol(
      "acele değilse sayı 0 TEMİZ sayılır",
      sakinGorev.temizMi === true,
      sakinGorev,
    );

    /**
     * ⑦ EKRAN-VERİ BAĞI — K47'nin ASIL dersi. Görev satırının adresi
     * VAR OLAN bir ekrana gitmeli; gitmezse uyarı kullanıcıyı çıkmaza
     * götürür.
     *
     * ⚠ DOSYANIN VARLIĞI ARANIYOR, KAYNAKTA DESEN DEĞİL: adres bir
     * rotadır ve rotanın karşılığı bir `page.tsx` dosyasıdır.
     */
    const tarifeAdresi = GOREV_ADRESLERI.tarifePenceresi;
    const sayfaYolu = `src/app${tarifeAdresi.split("?")[0]}/page.tsx`;
    kontrol(
      `görev adresi VAR OLAN ekrana gidiyor (${sayfaYolu})`,
      existsSync(sayfaYolu),
      sayfaYolu,
    );

    /**
     * ⑧ PANEL SATIRI GERÇEKTEN BAĞLI MI — "acele" kararı ekrana ULAŞIYOR mu.
     *
     * ⚠ DESEN KULLANIM BLOĞUNDA ARANIYOR, DOSYANIN TAMAMINDA DEĞİL.
     * `tarifePenceresi` kelimesi `page.tsx`te import satırında da geçebilir;
     * ölçüt `sureler={{` bloğunun İÇİNDE `tarifeUyarisiVarMi` çağrısıdır.
     */
    const panelKaynagi = readFileSync("src/app/page.tsx", "utf8");
    const sureBasi = panelKaynagi.indexOf("sureler={{");
    const sureBloku =
      sureBasi < 0 ? "" : panelKaynagi.slice(sureBasi, sureBasi + 400);
    kontrol(
      "panel satırı acele kararını SAF KURALDAN alıyor",
      sureBasi >= 0 &&
        sureBloku.includes("tarifeUyarisiVarMi(") &&
        sureBloku.includes("tarifePenceresi:"),
      { sureBasi, uzunluk: sureBloku.length },
    );

    /**
     * ⑨ KUTUCUK SÜRE METNİNİ ÇİZİYOR MU. Kural doğru çalışıp ekrana
     * bağlanmazsa "doğru davranışın GÖRÜNMEZLİĞİ" doğar — o da yalancı
     * yeşildir.
     */
    const kutuKaynagi = readFileSync("src/app/gorev-kutusu.tsx", "utf8");
    const dalBasi = kutuKaynagi.indexOf("sureMetni !== undefined ? (");
    kontrol(
      "görev kutucuğu süre metnini ÇİZİYOR",
      dalBasi >= 0 &&
        kutuKaynagi.slice(dalBasi, dalBasi + 700).includes("{sureMetni}"),
      { dalBasi },
    );
  }

  // --------------------------- ÇİFT SAYIM KAPISI ---------------------------
  const veriKaynagi = readFileSync("src/lib/panel/takvim-verisi.ts", "utf8");
  /**
   * ÇİFT SAYIM KAPISI İKİ ANAHTARLI OLMALI. Canlı denetim 15.08.2026:
   * 110 rapor kaleminin hiçbiri bir satışa bağlı değildi (saleId boş),
   * yani yalnız kimliğe bakan kapı HİÇ devreye girmiyordu; çakışma
   * olmaması tesadüftü. Sipariş numarası ikinci anahtar olarak eklendi.
   */
  /**
   * ⚠ ÇİFT SAYIM KAPISI KALDIRILDI — ÇÜNKÜ İKİNCİ KAYNAK KALMADI
   * (24.08.2026).
   *
   * ESKİ GEREKÇE (15.08.2026, silinmiyor): takvim hem RAPORDAN hem
   * TAHMİNDEN giriş üretiyordu; aynı sipariş iki yoldan girerse para iki
   * kez "girecek" sayılırdı. Kapı iki anahtarlıydı (satış kimliği +
   * sipariş numarası) ve canlıda ölçülmüştü: 110 kalemin hiçbiri bağlı
   * değildi, yani tek anahtar hiç devreye girmiyordu.
   *
   * NİYE GEREKSİZLEŞTİ: `HAKEDIS_TAHMIN` kaynağı tamamen kaldırıldı.
   * Girişin TEK kaynağı hakediş kalemleri; aynı paranın iki yoldan
   * girmesi artık İMKÂNSIZ. Kapıyı korumak, olmayan bir riske karşı
   * kod tutmak olurdu.
   *
   * ⚠ RİSK GERİ GELİRSE: ikinci bir giriş kaynağı açıldığı gün bu kapı
   * da geri gelir. Açılış şartı budur.
   */
  /**
   * ⚠ ÖLÇÜT ADA DEĞİL KULLANIMA BAĞLI. İlk yazım adı dosyanın tamamında
   * arıyordu ve KIRMIZI yandı — kalan tek geçiş, kaldırma gerekçesini
   * anlatan YORUMDU. Ad bir dosyada geçiyor olabilir; önemli olan
   * ÜRETİLİYOR mu. (Aynı tuzak `"use server"` bekçisinde de yaşandı.)
   */
  kontrol(
    "giriş kaynağı TEK (çift sayım yapısal olarak imkânsız)",
    !/kaynak:\s*"HAKEDIS_TAHMIN"/.test(
      readFileSync("src/lib/panel/takvim-verisi.ts", "utf8"),
    ),
  );
  const panelKartlari = readFileSync("src/app/panel-kartlari.tsx", "utf8");
  kontrol(
    "panel listesi satırı daralabiliyor (grid öğesinde min-w-0)",
    panelKartlari.includes(
      'className="flex min-w-0 items-start justify-between gap-3 py-2',
    ),
  );
  kontrol(
    "  ...rozet ezilmiyor (ad kısalır, rozet tam kalır)",
    panelKartlari.includes('<span className="shrink-0">{s.rozet}</span>'),
  );

  kontrol(
    "takvim kart ödemelerini GERÇEK kayıttan okuyor",
    veriKaynagi.includes("prisma.kartOdeme.findMany"),
  );
  kontrol(
    "  ...ekstre KALANI takvime giriyor, tamamı değil",
    veriKaynagi.includes("if (ekstre.kalan <= 0) continue;") &&
      veriKaynagi.includes("tutar: ekstre.kalan,"),
  );
  kontrol(
    "  ...'geçmişi görmezden gel' varsayımı geri gelmemiş",
    !veriKaynagi.includes("if (ekstre.gecmisMi) continue;"),
  );
  kontrol(
    "  ...ters kayıtlar süzülmüyor (düzeltme görünür kalır)",
    !veriKaynagi.includes("isReversal: false"),
  );
  /**
   * ⚠ ÖLÇÜT DARALDI, NİYET AYNI (24.08.2026).
   *
   * ESKİ HÂLİ üç motoru birden arıyordu: `kartBorcuHesapla` ·
   * `beklenenHakedis` · `beklenenVade`. Son ikisi TAHMİN bloğunun
   * yardımcılarıydı; blok kaldırıldığı için artık çağrılmıyorlar ve
   * kontrol kırmızı yandı.
   *
   * NİYET DEĞİŞMEDİ: "takvim kendi motorunu icat etmesin, mevcut
   * motorlardan beslensin". Kart tarafı hâlâ öyle. Hakediş tarafında
   * motor GEREKMİYOR artık — vade ve tutar kanal belgesinden GELİYOR,
   * hesaplanmıyor. Hesaplanmayan bir şey için motor aramak, olmayan
   * bir bağımlılığı zorunlu tutmak olurdu.
   */
  kontrol(
    "kart tarafı mevcut motordan besleniyor (ikinci motor yok)",
    veriKaynagi.includes("kartBorcuHesapla("),
  );
  /**
   * ⚠ VE HAKEDİŞ TARAFI HESAPLAMIYOR — OKUYOR. Vade `dueDate`ten, tutar
   * `amount`tan geliyor. Buraya bir hesap girerse "kanal belgesinden
   * okunuyor" iddiası çürür.
   */
  kontrol(
    "  ...hakediş tarafı vadeyi HESAPLAMIYOR, okuyor",
    !veriKaynagi.includes("beklenenVade(") &&
      veriKaynagi.includes("tarih: k.dueDate"),
  );


  /**
   * ── "AÇIK YOK" ÜÇ ŞARTA BAĞLI (mimar kararı 24.08.2026) ──────────────
   *
   * Ekran `+₺54.949 · açık yok` diyordu; ölçülen dip −₺161.383'tü. Rakam
   * gösteren ve rakamı yanlış olan ekran, SUSAN ekrandan tehlikelidir —
   * kullanıcı ona bakıp karar verir.
   */
  const takvimEkran = readFileSync("src/app/nakit-takvimi/page.tsx", "utf8");
  const acikBasi = takvimEkran.indexOf("const acikMi =");
  const acikBloku = takvimEkran.slice(acikBasi, acikBasi + 220);
  kontrol("açık ölçütü kesilebildi", acikBasi > 0);
  kontrol(
    "  ...① dönem sonu eksiyse AÇIK",
    /netPozisyon < 0/.test(acikBloku),
  );
  /**
   * ⚠ İKİNCİ ŞART OLMADAN ÇUKUR GÖRÜNMEZ: "20'sinde para giriyor,
   * 12'sinde kart ödeniyor" durumunda dönem sonu artı olsa bile 12'sinde
   * para YOKTUR.
   */
  kontrol(
    "  ...② ARADA çukura düşülüyorsa AÇIK (dip < 0)",
    /enDip\?\.bakiye \?\? 0\) < 0/.test(acikBloku),
  );
  /**
   * ⚠ ÜÇÜNCÜ ŞART: pirinç kova doluysa "açık yok" denemez — o para
   * gelmemiş de olabilir, sistem bilmiyor.
   */
  kontrol(
    "  ...③ pirinç kova doluysa AÇIK",
    /pirincVar/.test(acikBloku),
  );

  /**
   * ⚠ PİRİNÇ KOVA BEKLENEN GİRİŞE KATILMAZ. Katılsaydı takvim ₺801 bin
   * fazla iyimser çıkardı (ölçüldü 24.08).
   */
  const takvimGovde = readFileSync("src/lib/panel/nakit-takvimi.ts", "utf8");
  /**
   * ⚠ NEGATİF KALEM ATILMAZ — İYİMSER TAKVİM ÜRETİR.
   *
   * Eski kod `tutar <= 0` olanı atıyordu. `IADE_TUTARI −7.025,75`
   * atılınca aynı siparişin `SIPARIS_TUTARI +7.025,75`'i tek başına
   * kalıyor ve kanal o parayı ödeyecekmiş gibi duruyordu — oysa iade
   * onu geri almış. Ölçüldü (24.08): bekleyen kalemlerde IADE −11.434 ·
   * KUPON −3.660 · PROMOSYON −222 · İNDİRİM −28.
   *
   * ⚠ SIFIR ATILIR, NEGATİF ATILMAZ — ayrım tam burada.
   */
  /**
   * ⚠ YORUMLAR SOYULUR. İlk yazım ham dosyada `tutar <= 0` arıyordu ve
   * KIRMIZI yandı — desen, o kodun NİYE kaldırıldığını anlatan KENDİ
   * yorumumda geçiyordu. Bu tuzağa bugün üçüncü kez düşüldü
   * (`"use server"` · `HAKEDIS_TAHMIN` · burası).
   */
  /**
   * ⚠ ÖNCE DESENİ SAY — anayasanın 0. maddesi, bugün atlandı.
   *
   * `if (tutar <= 0) continue;` bu dosyada İKİ kez geçiyor: biri KART
   * BORCU bloğunda ve MEŞRU (sıfır tutarlı alım borç değildir), öteki
   * hakediş bloğundaydı ve kaldırıldı. Dosyanın tamamında arayan ölçüt,
   * meşru olanı bulup kırmızı yandı.
   *
   * ⚠ Yorumlar da soyuluyor: aynı desen, kaldırma gerekçesini anlatan
   * yorumda da geçiyor. Bu tuzağa bugün ÜÇ kez düşüldü.
   */
  const takvimVeriHam = readFileSync(
    "src/lib/panel/takvim-verisi.ts",
    "utf8",
  );
  const hakedisBasi = takvimVeriHam.indexOf("const raporKalemleri");
  const hakedisBloku = takvimVeriHam
    .slice(
      hakedisBasi,
      takvimVeriHam.indexOf("TAHMİN BLOĞU KALDIRILDI", hakedisBasi),
    )
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\/\/[^\n]*/g, " ");
  kontrol(
    "hakediş bloğu kesilebildi",
    hakedisBasi > 0 && hakedisBloku.length > 100,
  );
  kontrol(
    "negatif hakediş kalemi ATILMIYOR (iade/kupon girişten düşer)",
    /if \(tutar === 0\) continue;/.test(hakedisBloku) &&
      !/if \(tutar <= 0\) continue;/.test(hakedisBloku),
  );

  kontrol(
    "girecekToplam gecikmişi İÇERMİYOR",
    /const girecekToplam = pencereGirecek;/.test(takvimGovde),
  );
  /**
   * ⚠ ASİMETRİ BİLİNÇLİ: gecikmiş ÇIKIŞ hâlâ borçtur, yürüyen bakiyeye
   * girer; gecikmiş GİRİŞ girmez.
   */
  kontrol(
    "  ...ama gecikmiş ÇIKIŞ yürüyen bakiyeye giriyor",
    /let yuruyen = -gecikmisCikacak;/.test(takvimGovde),
  );

  /** Kalıcı kaynak bandı — donmuş kaynağın ufku ekranda yazar. */
  /**
   * ⚠ DESEN ÇAĞRIYA DEĞİL ÇİZİME BAĞLI. İlk yazım `t("kaynakBandi"`
   * arıyordu ve `{false && t("kaynakBandi"...` yazan mutasyon YEŞİL
   * KALDI — bant çizilmiyordu ama anahtar dosyada duruyordu.
   * (Anayasa: koşul öldürülür, desen kalır.)
   */
  const bantBasi = takvimEkran.indexOf('{t("kaynakBandi"');
  kontrol(
    "kalıcı kaynak bandı ÇİZİLİYOR (donmuş kaynak beyanı)",
    bantBasi > 0,
  );
  kontrol(
    "  ...ve bir kutunun İÇİNDE (metin havada değil)",
    bantBasi > 0 &&
      /DURUM_KUTUSU\.bilgi[\s\S]{0,80}\{t\("kaynakBandi"/.test(takvimEkran),
  );
  kontrol(
    "  ...ve takvimin UFKU yazıyor",
    /ufukSatiri|ufukYok/.test(takvimEkran),
  );
  /**
   * ⚠ BANT KOŞULSUZ: "bugün sorun yok" diye gizlenirse kaynağın sınırı da
   * gizlenmiş olur.
   */
  kontrol(
    "  ...bant KOŞULSUZ çiziliyor",
    !/\{[^}]*\?\s*\(\s*<div[^>]*>\s*\{t\("kaynakBandi"/.test(takvimEkran),
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
    s({ yon: "GIRECEK", tutar: 300, baslik: "11504122276", kaynak: "HAKEDIS_RAPOR" }),
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
  const raporSayfasi = readFileSync("src/app/rapor/page.tsx", "utf8");
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
    "RAPORDA nakit ÖZETİ var, gün listesi YOK",
    raporSayfasi.includes("<NakitOzeti") &&
      !raporSayfasi.includes("<NakitTakvimiBlogu"),
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
    "panel yerleşimi: görev kutusu PAZARYERİ kartından ÖNCE",
    /**
     * ⚠ İŞARET ÇAĞRI YERİNE BAĞLANIR, ADA DEĞİL: `Store` ikonu import
     * satırında da geçiyor. Ölçüt kartın kendisi (`<Store className=`).
     */
    panelSayfasi.indexOf("<GorevKutusu") <
      panelSayfasi.indexOf('<Store className="size-5" />'),
  );
  /**
   * YETKİ: nakit takvimi bir PARA bloğudur. Operasyon görmemeli; izin
   * yoksa sorgu bile atılmamalı (veri sızıntısı da maliyet de olmasın).
   */
  /**
   * ⚠ TAŞINDI AMA KURAL TAŞINMADI — VE TEST BUNU YAKALADI (21.08.2026).
   *
   * Nakit özeti panelden RAPOR sayfasına alınırken `satis.kar.gor` koruması
   * düştü. Rapor sayfasının kendi izni `rapor.gor` ve o AYNI ŞEY DEĞİL:
   * rapor görüp kâr göremeyen bir rol tanımlanabilir.
   *
   * ⚠ KONTROL DOSYA DEĞİŞTİRDİ, KAPSAM DEĞİŞTİRMEDİ: aynı iki soru artık
   * rapor kaynağına soruluyor. Kural taşınmasaydı test de taşınmamalıydı.
   */
  kontrol(
    "nakit takvimi `satis.kar.gor`a bağlı (RAPOR sayfasında)",
    raporSayfasi.includes('izinVarMi("satis.kar.gor")') &&
      raporSayfasi.includes("{karGorunur ? (") &&
      raporSayfasi.includes("<NakitOzeti"),
  );
  kontrol(
    "  ...izin yoksa takvim sorgusu ATILMIYOR",
    raporSayfasi.includes(
      "karGorunur ? await takvimSatirlariniTopla(takvimBugun) : []",
    ),
  );
  /**
   * ⚠ PAZARYERİ KARTI DA PARA BLOĞUDUR — NET-2 gösteriyor.
   *
   * Nakit özetinin yerine geçtiği için aynı korumayı taşımak zorunda:
   * `satis.kar.gor` yoksa çizilmemeli, yoksa depocuya kâr sızar. Bu kontrol
   * bir MUTASYONDAN doğdu (21.08.2026): koruma kaldırıldığında hiçbir test
   * kırmıyordu.
   *
   * ⚠ Ölçüt koşul VE sonuç birlikte: yalnız "karGorunur" aransaydı dosyada
   * onlarca yerde geçtiği için her zaman bulunurdu.
   */
  kontrol(
    "pazaryeri kartı `satis.kar.gor`a bağlı",
    panelSayfasi.includes("{karGorunur && ustBlok && ustPaylar ? ("),
  );

  /** Panelde artık nakit özeti OLMAMALI — taşındı, kopyalanmadı. */
  kontrol(
    "panelde nakit özeti KALMADI (taşındı, kopyalanmadı)",
    !panelSayfasi.includes("<NakitOzeti"),
  );
  /**
   * Görev kutusu OPERASYONEL: izne bağlanmamalı — depocu da görür.
   *
   * ⚠ ÖLÇÜT TEK SATIRLIK JSX METNİNDEN ÇEVRİLDİ (24.08.2026). Eski hâli
   * `"<GorevKutusu sayilar={gorevSayilari} />"` dizesini arıyordu ve bileşene
   * ikinci bir prop eklenip satır çok satıra bölününce KIRMIZI yandı — oysa
   * izinle hiçbir ilgisi olmayan bir biçim değişikliğiydi. Ölçüt artık
   * BİÇİMİ değil DAVRANIŞI sınıyor: kutu çiziliyor mu ve önünde bir izin
   * kapısı var mı.
   */
  const gorevKutusuYeri = panelSayfasi.indexOf("<GorevKutusu");
  kontrol("görev kutusu panelde ÇİZİLİYOR", gorevKutusuYeri > 0);
  kontrol(
    "görev kutusu izinsiz de görünüyor (operasyonel sayılar)",
    gorevKutusuYeri > 0 &&
      !/karGorunur/.test(panelSayfasi.slice(gorevKutusuYeri - 600, gorevKutusuYeri)),
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
   * ════════════════════════════════════════════════════════════════════
   *  RENK GERÇEKTEN GÖRÜNÜYOR MU — ÖLÇÜLÜR, GÖZE BIRAKILMAZ
   * --------------------------------------------------------------------
   *  İlk palet "tanımlı" olduğu için bütün testleri geçmişti ama ekranda
   *  kayboluyordu: zeminler beyazdan yalnız birkaç birim ayrılıyordu, göz
   *  onları renk değil kirli beyaz olarak okuyordu. Testler bunu göremezdi
   *  çünkü hepsi "bu ton tanımlı mı" diye soruyordu — "AYIRT EDİLİYOR MU"
   *  diye değil. O yüzden burada mesafe SAYIYLA sınanıyor.
   * ════════════════════════════════════════════════════════════════════
   */
  const hexOku = (sinif: string) => {
    const m = /bg-\[#([0-9A-Fa-f]{6})\]/.exec(sinif);
    if (!m) return null;
    const s = m[1];
    return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
  };
  /** Beyazdan toplam kanal uzaklığı — 255'lik ölçekte. */
  const beyazdanUzaklik = (rgb: number[]) =>
    rgb.reduce((t, k) => t + (255 - k), 0);

  kontrol(
    "her pastel zemin BEYAZDAN belirgin ayrışıyor (soluk değil)",
    (["olumlu", "olumsuz", "uyari", "bilgi"] as const).every((d) => {
      const rgb = hexOku(DURUM_ZEMINI[d]);
      // 60 eşiği: eski palet 42-52 arasındaydı ve ekranda görünmüyordu.
      return rgb !== null && beyazdanUzaklik(rgb) >= 60;
    }),
  );
  kontrol(
    "  ...ama hâlâ PASTEL (doygun blok değil — kontrast rakamda kalır)",
    (["olumlu", "olumsuz", "uyari", "bilgi"] as const).every((d) => {
      const rgb = hexOku(DURUM_ZEMINI[d]);
      return rgb !== null && beyazdanUzaklik(rgb) <= 260;
    }),
  );
  kontrol(
    "  ...rozetin kendi tonunda kenarlığı var (hücre içinde nesne olur)",
    (["olumlu", "olumsuz", "uyari", "bilgi"] as const).every((d) =>
      DURUM_ZEMINI[d].includes("ring-1"),
    ),
  );

  /**
   * ════════════════════════════════════════════════════════════════════
   *  AKSAN RENGİ VAR MI — "ayırt edici bir renk yok" (15.08.2026)
   * --------------------------------------------------------------------
   *  Sistemin bütün gri tonları chroma 0'dı ve `--primary` siyahtı; ekranda
   *  tutunacak tek bir ton yoktu. Bu kontrol `--primary`in RENKLİ olmasını
   *  şart koşuyor — biri yarın siyaha döndürürse sessizce geri gitmesin.
   * ════════════════════════════════════════════════════════════════════
   */
  const tema = readFileSync("src/app/globals.css", "utf8");
  // Dilim ":root {" ile ONDAN SONRAKİ ".dark {" arasından alınır. Düz bir
  // indexOf(".dark") dosyanın başındaki @custom-variant satırına takılıp
  // dilimi boş bırakıyordu; iki değer de NaN çıkıyor ve kontrol kendi
  // hatasından kırmızı yanıyordu.
  const kokBas = tema.indexOf(":root {");
  const acikTema = tema.slice(kokBas, tema.indexOf(".dark {", kokBas));
  /**
   * ⚠ TOKEN ARTIK PALETTEN OKUNUYOR — VE BU KONTROL BİR KEZ KÖR KALDI.
   *
   * 22.08.2026'da renk değerleri `globals.css`ten `styles/selliora-*.css`
   * paletlerine taşındı ve `:root` bir KÖPRÜYE döndü (`--primary:
   * var(--se-vurgu)`). Eski oklch satırları bir süre dosyada kaldı; köprü
   * SONRA geldiği için ezilmişlerdi, yani ÖLÜ koddu — ama bu kontrol tam
   * onları okuyup YEŞİL yanıyordu. Ekranda görünmeyen bir rakam
   * doğrulanıyordu.
   *
   * Ölü satırlar silinince kontrol kırmızı yandı; doğrusu buydu. Şimdi
   * zincir sonuna kadar izleniyor: token → `var(--se-*)` → palet dosyası
   * → hex. Zincir kopuyorsa NaN döner ve kontrol kırmızı yanar — "bulamadım"
   * sessizce "temiz" sayılmaz.
   */
  const KOBALT = readFileSync("src/styles/selliora-kobalt.css", "utf8");
  const GECE = readFileSync("src/styles/selliora-gece.css", "utf8");

  /** `#RRGGBB` → 0–1 aralığında üç kanal. */
  const hexKanal = (hex: string): [number, number, number] => [
    parseInt(hex.slice(1, 3), 16) / 255,
    parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255,
  ];

  /** Token'ı köprüden palete kadar izler; bulamazsa null. */
  const paletHex = (blok: string, ad: string, palet: string): string | null => {
    const kopru = new RegExp(`--${ad}:\\s*var\\((--se-[a-z0-9-]+)\\)`).exec(blok);
    if (!kopru) return null;
    const deger = new RegExp(`${kopru[1]}:\\s*(#[0-9A-Fa-f]{6})`).exec(palet);
    return deger ? deger[1]! : null;
  };

  /**
   * RENKLİ Mİ — kanallar arası en büyük fark. Gri tonda üç kanal eşittir
   * (fark 0); renkli bir tonda ayrışırlar. oklch kroma'sının hex
   * karşılığı olarak yeterli: sorulan şey "gri mi değil mi".
   */
  const kroma = (blok: string, ad: string, palet = KOBALT) => {
    const hex = paletHex(blok, ad, palet);
    if (hex === null) return NaN;
    const [r, g, b] = hexKanal(hex);
    return Math.max(r, g, b) - Math.min(r, g, b);
  };
  /**
   * AKTİF SEÇİM HER YERDE AKSAN RENGİNDE. 16.08.2026: sekme bileşeni renk
   * sistemi turunda atlanmış, siyah dolgu kalmıştı. Aynı anlamın iki farklı
   * renkle söylenmesi tutarlılığı bozar (İlke #10).
   */
  kontrol(
    "aktif sekme aksan renginde (siyah dolgu kalmadı)",
    !readFileSync("src/components/sekmeli-bolum.tsx", "utf8").includes(
      "bg-foreground text-background",
    ),
  );

  kontrol(
    "aksan rengi RENKLİ (--primary gri değil)",
    kroma(acikTema, "primary") > 0.05,
  );
  kontrol(
    "  ...koyu temada da renkli",
    kroma(acikTema, "primary", GECE) > 0.05,
  );
  kontrol(
    "  ...aktif menü satırı da aksan tonunda (gri vurgu 'seçili' demiyor)",
    kroma(acikTema, "sidebar-accent") > 0.01,
  );

  /**
   * ════════════════════════════════════════════════════════════════════
   *  İKİ TEMA — KOBALT / GECE (22.08.2026)
   * --------------------------------------------------------------------
   *  Kullanıcı: _"sayfalar çok beyaz, okumakta ve ayırt etmekte
   *  zorlanılıyor"_ ve _"panel kullanıcısı ikisinden birini istediği zaman
   *  seçebilsin."_
   * ════════════════════════════════════════════════════════════════════
   */
  {
    /** İki palet AYNI token adlarını tanımlamalı — biri eksikse o token
     *  öteki temada TANIMSIZ kalır ve tarayıcı miras alır: yüzey kararır
     *  ama yazı açık kalır gibi sessiz kırıklar doğar. */
    const adlar = (metin: string) =>
      new Set([...metin.matchAll(/^\s*(--se-[a-z0-9-]+):/gm)].map((m) => m[1]!));
    const kobaltAdlari = adlar(KOBALT);
    const geceAdlari = adlar(GECE);
    kontrol("Kobalt paleti okundu", kobaltAdlari.size > 40, kobaltAdlari.size);
    const eksikGece = [...kobaltAdlari].filter((a) => !geceAdlari.has(a));
    const eksikKobalt = [...geceAdlari].filter((a) => !kobaltAdlari.has(a));
    kontrol("iki palet AYNI token adlarını tanımlıyor", eksikGece.length === 0, eksikGece);
    kontrol("  ...ters yönde de", eksikKobalt.length === 0, eksikKobalt);

    /**
     * ⚠ YÜZEY MERDİVENİ ŞİKÂYETİN TA KENDİSİYDİ. Eski palette zemin ve
     * kart neredeyse aynı beyazdı; zebra satır, tablo başlığı, hover ve
     * seçili için ayrı ton YOKTU. Bu kontrol merdivenin BASAMAKLI
     * kaldığını sabitler — biri yarın hepsini beyaza çekerse yakalanır.
     */
    const kobaltDeger = (ad: string) => {
      const m = new RegExp(`${ad}:\\s*(#[0-9A-Fa-f]{6})`).exec(KOBALT);
      return m ? m[1]! : null;
    };
    const merdiven = ["--se-zemin", "--se-kart", "--se-satir", "--se-baslik", "--se-hover", "--se-secili"];
    const tonlar = merdiven.map(kobaltDeger);
    kontrol("yüzey merdiveninin her basamağı tanımlı", tonlar.every((t) => t !== null), tonlar);
    kontrol(
      "  ...basamaklar BİRBİRİNDEN farklı (hepsi beyaz değil)",
      new Set(tonlar).size >= 5,
      { tekil: new Set(tonlar).size, tonlar },
    );

    /**
     * ⚠ KABUK KOYU. "Sayfalar çok beyaz" şikâyetinin en büyük tek kalemi
     * soldaki 250px'lik beyaz kenar çubuğuydu. Kabuk zeminden belirgin
     * KOYU olmalı, yoksa ayrım yine kaybolur.
     */
    const luma = (hex: string | null) => {
      if (hex === null) return NaN;
      const [r, g, b] = hexKanal(hex);
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    kontrol(
      "kenar çubuğu zeminden belirgin KOYU (beyaz duvar değil)",
      luma(kobaltDeger("--se-zemin")) - luma(kobaltDeger("--se-kabuk")) > 0.3,
      {
        zemin: luma(kobaltDeger("--se-zemin")).toFixed(2),
        kabuk: luma(kobaltDeger("--se-kabuk")).toFixed(2),
      },
    );

    /** Gece teması gerçekten KOYU olmalı — ad değil, ölçü. */
    const geceDeger = (ad: string) => {
      const m = new RegExp(`${ad}:\\s*(#[0-9A-Fa-f]{6})`).exec(GECE);
      return m ? m[1]! : null;
    };
    kontrol(
      "Gece teması gerçekten koyu (zemin < 0,25 parlaklık)",
      luma(geceDeger("--se-zemin")) < 0.25,
      luma(geceDeger("--se-zemin")).toFixed(2),
    );

    /**
     * ⚠ GECE PALETİ `.dark` SINIFINA DA BAĞLI OLMALI. Durum renkleri
     * (`lib/renkler.ts`) koyu varyantlarını Tailwind'in `dark:` önekiyle
     * taşıyor ve o önek `.dark` atasına bakıyor. Yalnız `data-tema`
     * yazsaydık yüzeyler kararır, yeşil/kırmızı rozetler AÇIK tema
     * tonunda kalırdı — koyu zeminde okunmazlardı.
     */
    kontrol("gece paleti .dark sınıfına da bağlı", GECE.includes('[data-tema="gece"], .dark'));

    /**
     * ⚠ KENARLIK KONTRASTI — ÇÖZÜLMÜŞ BİR SORUN GERİ GELDİĞİ İÇİN VAR.
     *
     * 09.08.2026: kullanıcı "kutuların kenarları görünmüyor" dedi,
     * `--border` bilerek koyulaştırıldı (0.82) ve gerekçe bir YORUM olarak
     * yazıldı. 22.08.2026: tema geçişi o kararı SESSİZCE geri aldı —
     * paletin varsayılan çizgisi daha açıktı ve kullanıcı aynı şikâyeti
     * ikinci kez etti ("her tarafta").
     *
     * Yorum bir sonraki paleti durdurmadı; ÖLÇÜM durdurur. Eşik uydurulmuş
     * bir sayı değil: 09.08'de fiilen seçilen değerin farkı (0,180).
     */
    /**
     * ⚠ KÖPRÜ BLOĞUNA DARALTILIYOR — DOSYANIN TAMAMINA DEĞİL.
     *
     * 23.08.2026: üst çubuğa yerel bir token devri eklendi
     * (`[data-kabuk="ust"]`) ve o blok da `--border` / `--input` yazıyor.
     * Dosyanın tamamında arayan `exec` ARTIK İLK EŞLEŞMEYİ, yani kabuk
     * çizgisini buluyordu; kontrol doğru kodu kırmızı yaktı. Deponun beş
     * kez düştüğü tuzağın aynısı: desen dosyada kaç kez geçiyor, önce o
     * sayılır. Ölçüt ANA KÖPRÜ bloğudur — ekranın geneli oradan boyanıyor.
     */
    const kopruBasi = tema.indexOf("--background: var(--se-zemin)");
    const kopru =
      kopruBasi === -1 ? "" : tema.slice(kopruBasi, tema.indexOf("}", kopruBasi));
    kontrol("token köprüsü bulunabildi (kontroller boşa bakmıyor)", kopru !== "");

    const kartLuma = luma(kobaltDeger("--se-kart"));
    const cizgiLuma = luma(kobaltDeger(
      /--border:\s*var\((--se-[a-z0-9-]+)\)/.exec(kopru)?.[1] ?? "--se-cizgi",
    ));
    kontrol(
      "kenarlık karttan yeterince ayrışıyor (09.08.2026 kararı korunuyor)",
      kartLuma - cizgiLuma >= 0.18,
      { kart: kartLuma.toFixed(3), cizgi: cizgiLuma.toFixed(3), fark: (kartLuma - cizgiLuma).toFixed(3) },
    );
    /** Girdi çerçevesi kart kenarlığından DAHA koyu — tıklanabilir alan ayrışsın. */
    const girdiLuma = luma(kobaltDeger(
      /--input:\s*var\((--se-[a-z0-9-]+)\)/.exec(kopru)?.[1] ?? "--se-cizgi",
    ));
    kontrol(
      "  ...girdi çerçevesi kart kenarlığından koyu",
      girdiLuma < cizgiLuma,
      { cizgi: cizgiLuma.toFixed(3), girdi: girdiLuma.toFixed(3) },
    );

    /**
     * ════════════════════════════════════════════════════════════════════
     *  SAYFA ZEMİNİ KARTI GERÇEKTEN AYIRIYOR MU
     * --------------------------------------------------------------------
     *  Kullanıcı 23.08.2026: _"ilk ekran açıldığında salt beyaz çıkıyor."_
     *
     *  Ölçüm haklı çıkardı: zemin ile kart arasındaki fark 0,0246'ydı ve bu,
     *  aynı paletin KENDİ zebra satırı farkından (0,0367) bile ZAYIFTI —
     *  yani kartı sayfadan ayıran sınır, tablodaki iki komşu satırı ayıran
     *  sınırdan azdı. Kart, kart gibi durmuyordu.
     *
     *  ⚠ EŞİK UYDURULMADI, PALETTEN TÜRETİLDİ. Sabit bir sayı yazsaydık
     *  ölçüldüğü ana kilitlenirdi; bu sınır paletle birlikte yürüyor:
     *  "sayfa/kart ayrımı, o paletin kendi zebra ayrımından zayıf olamaz."
     *  Tema değişirse eşik de kendiliğinden değişir.
     * ════════════════════════════════════════════════════════════════════
     */
    for (const [ad, deger] of [
      ["Kobalt", kobaltDeger],
      ["Gece", geceDeger],
    ] as const) {
      const kart = luma(deger("--se-kart"));
      const zemin = luma(deger("--se-zemin"));
      const zebra = luma(deger("--se-satir"));
      /* Gece temasında kart zeminden AÇIK, Kobalt'ta KOYU — yön değil
         BÜYÜKLÜK karşılaştırılıyor. */
      const sayfaFarki = Math.abs(kart - zemin);
      const zebraFarki = Math.abs(kart - zebra);
      kontrol(
        `${ad}: sayfa/kart ayrımı zebra ayrımından zayıf değil`,
        Number.isFinite(sayfaFarki) &&
          Number.isFinite(zebraFarki) &&
          zebraFarki > 0 &&
          sayfaFarki >= zebraFarki,
        { sayfa: sayfaFarki.toFixed(4), zebra: zebraFarki.toFixed(4) },
      );
    }

    /**
     * ════════════════════════════════════════════════════════════════════
     *  ÜST ÇUBUK KABUK RENGİNDE Mİ — TELEFONDA TEMANIN GÖRÜNDÜĞÜ TEK YER
     * --------------------------------------------------------------------
     *  Kullanıcı 23.08.2026, telefon ekran görüntüsüyle: _"mobilde mavi tema
     *  çok belirgin değil, sadece tıkladığında menü bar mavi oluyor."_
     *
     *  Teşhis tema değil YERLEŞİMDİ: paletteki tek güçlü yüzey `--se-kabuk`
     *  ve o yalnız sol menüde kullanılıyor — telefonda çekmecede, yani ekran
     *  DIŞINDA. Üst çubuk kabuk rengine alındı; hem kimlik geri geldi hem de
     *  `theme-color` ile kesintisiz tek bant oldu.
     * ════════════════════════════════════════════════════════════════════
     */
    {
      const yerlesim = readFileSync("src/app/layout.tsx", "utf8");
      kontrol(
        "üst çubuk kabuk kapsamıyla işaretli",
        /<header\s+data-kabuk="ust"/.test(yerlesim),
      );

      const kabukBasi = tema.indexOf('[data-kabuk="ust"] {');
      const kabukBloku =
        kabukBasi === -1 ? "" : tema.slice(kabukBasi, tema.indexOf("}", kabukBasi));
      kontrol("  ...kapsamın CSS karşılığı var", kabukBloku !== "");
      kontrol(
        "  ...zemini kabuk renginden alıyor",
        /--background:\s*var\(--se-kabuk\)/.test(kabukBloku),
      );
      /**
       * ⚠ YARIM BOYAMA, HİÇ BOYAMAMAKTAN KÖTÜ. Yalnız zemin çevrilseydi
       * çubuğun içindeki `outline` düğmeler, kenarlıklar ve ikincil metin
       * AÇIK tema değerlerinde kalırdı: mavi bandın üstünde beyaz kutular.
       * Devrin bu dört tokeni de kapsaması ŞART.
       */
      for (const jeton of [
        "--foreground",
        "--border",
        "--input",
        "--muted",
        "--muted-foreground",
      ]) {
        kontrol(
          `  ...${jeton} de kabuk paletine devredilmiş`,
          new RegExp(`${jeton}:\\s*var\\(--se-kabuk`).test(kabukBloku),
        );
      }
      /**
       * Kabuk mürekkebi kabuk zemininde okunmalı — devir yapıldı ama yanlış
       * tona bağlansaydı çubuk mavi olur, yazısı kaybolurdu.
       */
      const kabukLuma = luma(kobaltDeger("--se-kabuk"));
      const inkLuma = luma(kobaltDeger("--se-kabuk-ink"));
      kontrol(
        "  ...kabuk yazısı kabuk zemininden yeterince ayrışıyor",
        Math.abs(inkLuma - kabukLuma) >= 0.5,
        { kabuk: kabukLuma.toFixed(3), ink: inkLuma.toFixed(3) },
      );

      /**
       * ⚠ ÇUBUKTAKİ DÜĞME KENARI DA BULUNABİLİR OLMALI — VE EŞİK
       * UYDURULMADI.
       *
       * İlk yazımda düğme kenarı `--se-kabuk-cizgi`ye bağlanmıştı; ölçüm
       * düşürdü: bardan yalnız 0,0768 ayrışıyordu (gecede 0,0449). Oysa
       * kullanıcı 22.08.2026'da kart kenarlıklarını tam bu yüzden
       * belirginleştirmişti. Eşik o kararın KENDİSİ: çubuktaki tıklanabilir
       * kenar, kartın kenarı kadar bulunabilir olmalı. Palet değişirse eşik
       * de kendiliğinden değişir.
       */
      for (const [ad, deger] of [
        ["Kobalt", kobaltDeger],
        ["Gece", geceDeger],
      ] as const) {
        const kabuk = luma(deger("--se-kabuk"));
        const kenar = luma(deger("--se-kabuk-ink2"));
        const kartEsigi = Math.abs(
          luma(deger("--se-kart")) - luma(deger("--se-cizgi-2")),
        );
        kontrol(
          `  ...${ad}: çubuktaki düğme kenarı kart kenarı kadar bulunabilir`,
          Number.isFinite(kenar) &&
            Number.isFinite(kartEsigi) &&
            Math.abs(kenar - kabuk) >= kartEsigi,
          { ayrim: Math.abs(kenar - kabuk).toFixed(4), esik: kartEsigi.toFixed(4) },
        );
      }
      /* Kenar TOKENİ doğru olanı göstermeli — ölçüm doğru, bağlantı yanlış
         olabilirdi. */
      kontrol(
        "  ...düğme kenarı kabuk ÇİZGİSİNE değil MÜREKKEBİNE bağlı",
        /--border:\s*var\(--se-kabuk-ink2\)/.test(kabukBloku) &&
          /--input:\s*var\(--se-kabuk-ink2\)/.test(kabukBloku),
      );
    }

    /**
     * ⚠ ÇERÇEVE KALINLIĞI TEK ÖLÇÜDEN. Kutuların çoğu `border`, kart ise
     * `ring` kullanıyor (halka kartın köşe yarıçapını taşırmıyor). İki
     * mekanizma ayrı sayı yazsaydı kart ile yanındaki kutu farklı
     * kalınlıkta görünürdü — kullanıcının şikâyeti tam olarak "ayırt
     * etmekte zorlanılıyor" idi, tutarsız kalınlık onu artırırdı.
     */
    kontrol(
      "kutu çerçevesi tek ölçüden (--se-kutu-cizgi)",
      /\.border\s*\{[^}]*var\(--se-kutu-cizgi\)/.test(tema),
    );
    kontrol(
      "  ...kart halkası da AYNI ölçüden",
      readFileSync("src/components/ui/card.tsx", "utf8").includes(
        "ring-(length:--se-kutu-cizgi)",
      ),
    );

    /**
     * ── MENÜ DÜZENİ — SIKLIĞA GÖRE (22.08.2026) ──────────────────────
     * Kullanıcı: "menü bardakilerin bir kısmı devamlı görünür, bir kısmı
     * dropdown ile bir kategorinin altına alınabilir."
     */
    const kenar = readFileSync("src/components/app-sidebar.tsx", "utf8");
    const gunlukBlok = kenar.slice(
      kenar.indexOf("const GUNLUK"),
      kenar.indexOf("type MenuGrubu"),
    );
    const gunlukSayisi = [...gunlukBlok.matchAll(/anahtar: "/g)].length;
    /**
     * ⚠ HEP AÇIK LİSTE KISA KALMALI. Amaç 30 satırı kısaltmaktı; "günlük"
     * kutusu şişerse eski hâle geri dönülmüş olur ve gruplama anlamını
     * yitirir. Üst sınır kullanıcının onayladığı liste: 7.
     */
    kontrol(
      "hep açık liste kısa (en fazla 7 öğe)",
      gunlukSayisi > 0 && gunlukSayisi <= 7,
      gunlukSayisi,
    );
    /**
     * ⚠ AÇIK SAYFANIN GRUBU KENDİLİĞİNDEN AÇILIR. Kapalı kalsaydı kullanıcı
     * bulunduğu yeri menüde göremezdi — "kayboldum" duygusu.
     */
    kontrol(
      "açık sayfanın grubu kendiliğinden açılıyor",
      /const acik = icindeSecili \|\| acikKayit\.has/.test(kenar),
    );
    /**
     * ⚠ GRUP DURUMU HATIRLANIR. Her geçişte kapanan menü, açılır menü
     * olmaktan çıkıp ENGELE döner.
     */
    kontrol(
      "  ...grup durumu tarayıcıda hatırlanıyor",
      kenar.includes("localStorage.setItem(MENU_ANAHTARI"),
    );
    /** Başlık tıklanabilir GÖRÜNÜR (İlke #2): düğme + ok + aria-expanded. */
    kontrol(
      "  ...başlık düğme ve aria-expanded taşıyor",
      /aria-expanded=\{acik\}/.test(kenar) && kenar.includes("ChevronDown"),
    );

    /**
     * ⚠ MENÜ SATIRI TELEFONDA 44 PX (Ilke #8). Masaustunde 36 px yeterli;
     * dokunmatikte degil. Satir ve grup basligi ikisi de dokunma hedefi.
     */
    kontrol(
      "menü satırı telefonda 44 px",
      /max-width:\s*767px\)\s*\{[\s\S]{0,300}height:\s*2\.75rem/.test(tema),
    );
    /** İlkel bileşen ELLE DÜZENLENMEDİ — ölçü tek yerde, globals'ta. */
    kontrol(
      "  ...shadcn ilkeline dokunulmadı",
      !readFileSync("src/components/ui/sidebar.tsx", "utf8").includes("0.9375rem"),
    );

    const duzen = readFileSync("src/app/layout.tsx", "utf8");
    kontrol("tema seçici üst çubukta", duzen.includes("<TemaSecici />"));
    /**
     * ⚠ TEMA REACT'TEN ÖNCE UYGULANMALI (FOUC). Betik `<head>`te koşmazsa
     * sayfa bir kare açık temada çizilir, sonra karanlığa atlar.
     */
    kontrol("FOUC betiği var", duzen.includes("TEMA_BETIGI"));
    kontrol("  ...betik .dark sınıfını da ekliyor", /classList\.add\("dark"\)/.test(duzen));
    /**
     * ⚠ `try/catch` ŞART: gizli sekmede `localStorage` erişimi HATA
     * FIRLATIR (boş dönmez). Yakalanmazsa betik ölür ve tema hiç uygulanmaz.
     */
    /**
     * ⚠ ÖLÇÜT DİLİME ÇEVRİLDİ (24.08.2026). Eski desen `/try\{[^}]*localStorage/`
     * idi — yani `try{` ile `localStorage` arasında HİÇ `}` olmadığını
     * varsayıyordu. Üçüncü tema gelince betiğe bir nesne sabiti girdi ve
     * kontrol kırmızı yandı; oysa `localStorage` HÂLÂ try içindeydi.
     * Ölçüt artık try gövdesini kesip içinde arıyor — biçim değişse de
     * davranışı ölçer.
     */
    const tryBasi = duzen.indexOf("try{");
    const tryGovdesi = duzen.slice(tryBasi, duzen.indexOf("catch", tryBasi));
    kontrol("  ...try gövdesi kesilebildi", tryBasi > 0 && tryGovdesi.length > 20);
    kontrol(
      "  ...localStorage erişimi try/catch içinde",
      tryGovdesi.includes("localStorage"),
    );
    kontrol(
      "  ...cihaz tercihi yedek olarak okunuyor",
      duzen.includes("prefers-color-scheme"),
    );

    const secici = readFileSync("src/components/tema-secici.tsx", "utf8");
    kontrol("seçici .dark sınıfını da çeviriyor", secici.includes('classList.toggle("dark"'));
    kontrol("  ...seçim localStorage'a yazılıyor", secici.includes("localStorage.setItem"));
    kontrol("  ...ekran okuyucu etiketi sözlükten", /aria-label=\{etiket\}/.test(secici));
  }

  /**
   * DOYGUN ÇİP YALNIZ KÜÇÜK ALANDA. Çip sınıfları zemin olarak kullanılırsa
   * kısıt #2 çöker ("asla doygun koca blok"). Bu yüzden `DURUM_CIPI` yalnız
   * `size-7` ikon kutusunda geçmeli.
   */
  const kutuKaynak = readFileSync(
    "src/components/istatistik-kutusu.tsx",
    "utf8",
  );
  kontrol(
    "doygun çip KÜÇÜK alanda (size-7 ikon kutusu)",
    kutuKaynak.includes("size-7") && kutuKaynak.includes("DURUM_CIPI[durum]"),
  );
  kontrol(
    "  ...her doygun ton beyaz ikon taşıyor (grafik öğede 3:1 kontrast)",
    DURUM_RENKLERI.every((d) => DURUM_CIPI[d].includes("text-white")),
  );

  /**
   * ÜÇ KATMANIN YERİ — TASARIM REFERANSINDAN.
   *
   * `Site Sayfaları.dc.html`: K1 şerit ve K3 doygun çip UYARI KARTINDA;
   * stat kartında çip YOK, durumu rakamın altındaki pastel rozet taşıyor.
   * İlk uygulamada çipi her stat kutusuna koymuştum — doygunluk her kutuda
   * tekrarlanınca dikkat çağrısı olmaktan çıkıyor.
   */
  kontrol(
    "uyarı kartı ÜÇ KATMANI birlikte taşıyor (şerit + çip + metin)",
    kutuKaynak.includes("DURUM_SERIDI[durum]") &&
      kutuKaynak.includes("DURUM_CIPI[durum]"),
  );
  kontrol(
    "  ...uyarı kartında ikon yoksa işaret yazılır (kısıt #1)",
    kutuKaynak.includes("DURUM_ISARETI[durum]"),
  );
  /**
   * Dilim bir sonraki `export function`a kadar alınır. İlk yazımda sınır
   * `[\s\S]*?\n}` idi; tembel eşleşme props tipinin kapanış parantezinde
   * duruyor, gövdeyi hiç kapsamıyordu — kontrol HER ZAMAN yeşil yanıyordu.
   * Mutasyon denemesinde yakalandı: çipi stat kartına geri koydum, test
   * kırmızı yanmadı. Sınır artık gerçek fonksiyon sınırı.
   */
  const statGovdesi = kutuKaynak.slice(
    kutuKaynak.indexOf("export function IstatistikKutusu"),
    kutuKaynak.indexOf("export function UyariKarti"),
  );
  kontrol(
    "  ...stat kartında doygun çip YOK (durum pastel rozetten konuşur)",
    statGovdesi.length > 200 && !statGovdesi.includes("DURUM_CIPI"),
  );
  /**
   * Kontrol SÖZCÜĞE değil SINIF SÖZDİZİMİNE bakıyor. Düz `includes("amber")`
   * kullandığımda kendi açıklama yorumumdaki örnek metne takılıp kırmızı
   * yandı — bu tuzağa bu dosyada dördüncü kez düşüldü. Ham renk sınıfı
   * `bg-/text-/border-` önekiyle yazılır; aranan da odur.
   */
  /**
   * ════════════════════════════════════════════════════════════════════
   *  HAM RENK SINIFI TÜM UYGULAMADA YASAK — 15.08.2026
   * --------------------------------------------------------------------
   *  Kontrol önce yalnız panele bakıyordu ve panel temizdi; oysa geri
   *  kalan uygulamada 58 dosyada 177 ham sınıf duruyordu. Ağırlıklı iki
   *  kalıp: `border-amber-500/50 bg-amber-500/10` uyarı kutusu ve emerald
   *  eşdeğeri. Yani aynı "uyarı" kavramı panelde bir tonda, formda başka
   *  bir tonda görünüyordu — renk sisteminin tek vaadi buydu ve tam
   *  burada deliniyordu.
   *
   *  Tek dosyaya bakan bir kontrol, "temiz" derken yalnız baktığı yer için
   *  konuşur. Kapsam artık bütün `src`.
   * ════════════════════════════════════════════════════════════════════
   */
  const HAM_RENK =
    /\b(?:dark:)?(?:bg|text|border|ring)-(?:amber|yellow|orange|emerald|green|teal|red|rose|blue|sky)-\d/;
  const kaynakDosyalari = execSync("git ls-files", { encoding: "utf8" })
    .split("\n")
    .filter((y) => y.startsWith("src/") && /\.tsx?$/.test(y));
  /**
   * YORUMLAR AYIKLANIR. Bu dosyada beş kez aynı tuzağa düşüldü: kontrol
   * bir sınıf adını AÇIKLAYAN yoruma takılıp kırmızı yandı — en son
   * paletin kendi belgesinde, `DURUM_KUTUSU`nun neyi değiştirdiğini
   * anlatan satırda. Kural koda bakar; kodda ne yazdığı önemlidir,
   * yorumda neyin anlatıldığı değil.
   */
  const yorumsuz = (kaynak: string) =>
    kaynak.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const kirliler = kaynakDosyalari.filter((y) =>
    HAM_RENK.test(yorumsuz(readFileSync(y, "utf8"))),
  );
  kontrol(
    `ham Tailwind renk sınıfı YOK (${kaynakDosyalari.length} kaynak dosyası tarandı)`,
    kirliler.length === 0,
  );
  if (kirliler.length) {
    for (const y of kirliler.slice(0, 10)) console.log(`          ${y}`);
    if (kirliler.length > 10) {
      console.log(`          ...ve ${kirliler.length - 10} dosya daha`);
    }
  }
  kontrol(
    "  ...kutu kabuğu K1+K2 bileşimi (yeni ton uydurulmadı)",
    DURUM_RENKLERI.every(
      (d) =>
        DURUM_KUTUSU[d].includes(DURUM_SERIDI[d]) &&
        DURUM_KUTUSU[d].includes(DURUM_ZEMINI[d]),
    ),
  );
  kontrol(
    "  ...pay çubuğu oranı kırpıyor (bozuk veri ekranı taşırmaz)",
    kutuKaynak.includes("Math.max(0, Math.min(1,"),
  );
  kontrol(
    "  ...pay çubuğunun yanında YAZILI yüzde var (kısıt #1)",
    kutuKaynak.includes("etiket") && kutuKaynak.includes("tabular-nums"),
  );

  /**
   * PANELDE TEK KUTU ANATOMİSİ. Elle yazılmış `rounded-lg border p-3` +
   * `text-2xl font-semibold` kalıbı geri sızarsa sayfa yine "bir renkli bir
   * renksiz" hâle döner — kullanıcının 15.08.2026'daki tam şikâyeti buydu.
   */
  const panelKaynak = readFileSync("src/app/page.tsx", "utf8");
  kontrol(
    "panel rakam kutuları ORTAK bileşenden",
    panelKaynak.includes("<IstatistikKutusu"),
  );
  kontrol(
    "  ...elle yazılmış eski kutu kalıbı geri sızmadı",
    !panelKaynak.includes('"space-y-0.5 rounded-lg border p-3"'),
  );
  kontrol(
    "  ...NET-2 başrol (tek 'bas' kutusu)",
    (panelKaynak.match(/^\s*bas$/gm) ?? []).length === 1,
  );
  /**
   * ════════════════════════════════════════════════════════════════════
   *  DAĞILIM SEKMESİ (2c) — EKRAN KURALLARI
   * --------------------------------------------------------------------
   *  Kontroller REGEX DEĞİL dilim + `includes` ile yazıldı. 15.08.2026'da
   *  bir kontrolde kabuk kaçışı `[\s\S]`'i `[sS]`'e çevirmiş, regex hiç
   *  eşleşmemiş ve test YALANCI YEŞİL yanmıştı. Dilim yönteminde böyle bir
   *  sessiz kırılma yok.
   * ════════════════════════════════════════════════════════════════════
   */
  const dagilimBolumu = panelKaynak.slice(
    panelKaynak.indexOf('anahtar: "dagilim"'),
    panelKaynak.indexOf('anahtar: "hacim"'),
  );
  kontrol(
    "dağılım sekmesi var ve iki AYRI kutu taşıyor",
    dagilimBolumu.length > 500 &&
      dagilimBolumu.includes('t("karEdenler")') &&
      dagilimBolumu.includes('t("zararEdenler")'),
  );
  kontrol(
    "  ...kâr kutusu YEŞİL, zarar kutusu KIRMIZI aksanlı",
    dagilimBolumu.includes("DURUM_SERIDI.olumlu") &&
      dagilimBolumu.includes("DURUM_SERIDI.olumsuz"),
  );
  kontrol(
    "  ...zarar kutusunda TOPLAM özeti var (N ürün toplam −₺X)",
    dagilimBolumu.includes('t("zararOzeti"'),
  );
  kontrol(
    "  ...sıfır kârlı ürün sessizce kaybolmuyor",
    dagilimBolumu.includes('t("notrUrunNotu"'),
  );
  /**
   * Sekmenin ÖNÜNDEKİ 300 karakterde `karGorunur` koşulu olmalı: sekmenin
   * tamamı NET-2 üzerine kurulu, izinsiz kullanıcıya boş kabuk gösterilmez.
   */
  kontrol(
    "  ...kâr izni yoksa sekme HİÇ çizilmiyor",
    panelKaynak
      .slice(
        Math.max(0, panelKaynak.indexOf('anahtar: "dagilim"') - 300),
        panelKaynak.indexOf('anahtar: "dagilim"'),
      )
      .includes("karGorunur"),
  );
  /**
   * ════════════════════════════════════════════════════════════════════
   *  KARŞILAŞTIRMA PANELE İNDİ (2a) — TEK KAYNAK ŞARTI
   * --------------------------------------------------------------------
   *  Mimar kuralı: kural TEK saf fonksiyonda, iki kopya YASAK. Bu oturumda
   *  `PARTIAL`/`PARTIALLY_RECEIVED` hatası tam bu yüzden çıkmıştı — iki
   *  yerde iki sabit. Panel de rapor da `lib/karsilastirma.ts` çağırmalı.
   * ════════════════════════════════════════════════════════════════════
   */
  const raporKaynak = readFileSync("src/app/rapor/page.tsx", "utf8");
  kontrol(
    "panel karşılaştırmayı ORTAK kaynaktan alıyor",
    panelKaynak.includes('from "@/lib/karsilastirma"') &&
      panelKaynak.includes("kiyasPenceresi(donem, kiyasTuru)"),
  );
  kontrol(
    "  ...rapor da AYNI kaynağı kullanıyor (iki kopya yok)",
    raporKaynak.includes('from "@/lib/karsilastirma"'),
  );
  kontrol(
    "  ...panelde ikinci bir pencere-kaydırma hesabı YOK",
    !panelKaynak.includes("ayGeriKaydir("),
  );
  kontrol(
    "karşılaştırma KAPALI geliyor (kiyasCoz boşta null döner)",
    panelKaynak.includes("kiyasCoz(parametreler.kiyas)"),
  );
  kontrol(
    "  ...kıyaslanan aralık ekranda yazılı",
    panelKaynak.includes("kiyasPencere.baslangic") &&
      panelKaynak.includes("kiyasPencere.sonGun"),
  );
  /**
   * SORGU ARALIĞI KIYAS PENCERESİNİ DE KAPSAMALI. "Geçen yıl aynı dönem"
   * 12 ay geriye düşer ve grafik penceresinin (11 ay) DIŞINDA kalır;
   * kapsanmasaydı panel "geçen yıl 0 satış" derdi — veri yokluğu değil,
   * SORGU yokluğu yüzünden. Sessiz sıfırın en sinsi hâli.
   */
  const aralikBolumu = panelKaynak.slice(
    panelKaynak.indexOf("const veriBaslangic"),
    panelKaynak.indexOf("const veriBaslangic") + 700,
  );
  kontrol(
    "sorgu aralığı KIYAS penceresini de kapsıyor",
    aralikBolumu.includes("kiyasPencere?.baslangic") &&
      aralikBolumu.includes("kiyasPencere?.bitisHaric"),
  );
  kontrol(
    "  ...kargo sorgusu da kıyas dönemini kapsıyor",
    panelKaynak.includes("gte: kiyasPencere.baslangic"),
  );

  /**
   * "NEYİ KESMELİYİM" — İKİ YARIM YAN YANA (Panel Aşama 3, madde 4).
   * Zarara giden satışlar (para KAYBI) ve ölü sermaye (para TUTSAK) aynı
   * yerde durmalı; ayrı ekranlarda dururlarsa kullanıcı ikisini birlikte
   * tartmaz.
   */
  kontrol(
    "zarar ve ölü sermaye AYNI yerde (neyi kesmeliyim)",
    dagilimBolumu.includes('t("zararliSatis"') &&
      dagilimBolumu.includes('t("oluSermaye"'),
  );
  kontrol(
    "  ...ikisi de sıfırken GİZLENMİYOR (açık sıfır)",
    dagilimBolumu.includes('t("zararliSatisYok")') &&
      dagilimBolumu.includes('t("oluSermayeYok"'),
  );
  kontrol(
    "  ...ölü sermaye eşiği YAS_BANTLARI'ndan (ikinci eşik uydurulmamış)",
    panelKaynak.includes("YAS_BANTLARI.kirmiziGun") &&
      panelKaynak.includes('y.bant === "KIRMIZI"'),
  );

  /**
   * MELONTİK EŞLEME ETİKETİ (seçenek C). Ölçüldü 15.08.2026: Melontik'in
   * "Kâr/Ürün Maliyet" oranı bizim NAKİT oranımızla (KDV dâhil payda)
   * birebir aynı; "Kâr/Satış Fiyat" ise marjımızla aynı. Etiket YALNIZ
   * NET-2 kutusunda — Melontik'in oranı NET-2 üzerinden, NET-1'e koymak
   * yanlış eşleme olurdu.
   */
  kontrol(
    "Melontik eşleme etiketi YALNIZ NET-2 kutusunda",
    panelKaynak.includes("oranSatirlari(blok.toplamNet2, blok, true)") &&
      panelKaynak.includes("oranSatirlari(blok.toplamNet1, blok)") &&
      !panelKaynak.includes("oranSatirlari(blok.toplamNet1, blok, true)"),
  );

  kontrol(
    "kanal kartında İKİ çubuk var (ciro payı + NET-2 payı)",
    panelKaynak.includes("pay.ciroPayi / 100") &&
      panelKaynak.includes("pay.net2Payi / 100"),
  );
  kontrol(
    "  ...NET-2 payı null ise çubuk çizilmiyor (eksi toplamda pay anlamsız)",
    panelKaynak.includes("pay.net2Payi !== null"),
  );

  kontrol(
    "  ...grafiğin ana serisi aksan renginde (sayfayla aynı dil)",
    readFileSync("src/components/cizgi-grafik.tsx", "utf8").includes(
      'className="text-primary"',
    ),
  );

  /**
   * SAYFA GRİ, KART BEYAZ. Ters kurulursa (kart sayfadan koyu) kartlar
   * gömülür ve pastel rozetler gri üstünde sönerdi — 15.08.2026'da tam
   * olarak bu yaşandı.
   */
  /**
   * ⚠ LUMA DA PALETTEN. Aynı taşınma; kontrolün sorusu değişmedi ("kart
   * sayfadan AÇIK mı"), yalnız rakamın yeri değişti.
   */
  const acikLuma = (ad: string) => {
    const hex = paletHex(acikTema, ad, KOBALT);
    if (hex === null) return NaN;
    const [r, g, b] = hexKanal(hex);
    /** Göz yeşile daha duyarlı — basit ağırlıklı parlaklık yeterli. */
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  kontrol(
    "açık temada KART sayfadan açık (kart yükselir, gömülmez)",
    acikLuma("card") > acikLuma("background"),
  );

  /**
   * ÖLÇÜ SİSTEMİ — tasarım referansındaki köşe yarıçapları.
   *
   * Referans (Site Sayfaları.dc.html): kart 9px, buton ve menü satırı 7px,
   * rozet 5-6px. Bunlar TEK değerden türüyor; `--radius` kayarsa üçü birden
   * kayar ve ekran referanstan sessizce uzaklaşır.
   */
  const yaricap = /--radius:\s*([0-9.]+)rem/.exec(acikTema);
  const yaricapPx = yaricap ? Number(yaricap[1]) * 16 : NaN;
  kontrol(
    "kart yarıçapı referanstaki 9px (tek kaynaktan türüyor)",
    Math.abs(yaricapPx - 9) < 0.5,
  );
  kontrol(
    "  ...kart bileşeni lg yarıçapı kullanıyor (xl referanstan yuvarlaktı)",
    !readFileSync("src/components/ui/card.tsx", "utf8").includes("rounded-xl"),
  );
  kontrol(
    "  ...rozet referans ölçüsünde (11px yazı, küçük yarıçap)",
    (() => {
      const rozet = readFileSync("src/components/durum-rozeti.tsx", "utf8");
      return rozet.includes("text-[11px]") && rozet.includes("rounded-sm");
    })(),
  );

  /**
   * PALET TEK KAPIDAN GEÇER. Ekranlar ham renk kodu yazmamalı; yazarsa
   * palet değiştiğinde bir yer geride kalır ve renkler ayrışır.
   */
  /**
   * TEK KAYNAK KAPISI — TÜM EKRANLAR. Renk sistemi sayfa bazlı değil DURUM
   * bazlı: aynı renk her sayfada aynı şeyi söyler. Bir ekran ham renk kodu
   * yazarsa palet değiştiğinde orası geride kalır ve sistem sessizce
   * ayrışır — "başka bir yeşil" doğar.
   *
   * Tarama ekran dosyalarında #RRGGBB arıyor; palet ve grafik bileşeni
   * bilinçli istisna (renk orada TANIMLANIYOR / SVG çiziyor).
   */
  const renkTaranacak: [string, string][] = [
    ["görev kutusu", "src/app/gorev-kutusu.tsx"],
    ["nakit özeti", "src/app/nakit-ozeti.tsx"],
    ["panel", "src/app/page.tsx"],
    ["nakit takvimi sayfası", "src/app/nakit-takvimi/page.tsx"],
    ["net kâr bileşeni", "src/components/net-kar.tsx"],
    ["satışlar", "src/app/satislar/page.tsx"],
    ["panel kartları", "src/app/panel-kartlari.tsx"],
  ];
  for (const [ad, yol] of renkTaranacak) {
    const kaynak = readFileSync(yol, "utf8");
    kontrol(
      `  ${ad} ham renk kodu YAZMIYOR (palet tek kapıdan)`,
      !/#[0-9A-Fa-f]{6}/.test(kaynak),
    );
  }

  /** Palet ve sunum bileşeni AYNI ton kümesini tanımalı. */
  const rozetBileseni = readFileSync("src/components/durum-rozeti.tsx", "utf8");
  kontrol(
    "sunum bileşeni üç katmanı da sunuyor (şerit · zemin · rakam)",
    rozetBileseni.includes("DURUM_SERIDI") &&
      rozetBileseni.includes("DURUM_ZEMINI") &&
      rozetBileseni.includes("DURUM_YAZISI"),
  );
  kontrol(
    "her tonun ŞERİDİ tanımlı (üç katmanın birincisi)",
    ANLAMLI_RENKLER.every((d) => DURUM_SERIDI[d].includes("border-l")),
  );
  /**
   * KÂR RENGİ HER YERDE AYNI KAYNAKTAN. `karDurumu` null'ı NÖTR sayar:
   * hesaplanamamış kâr "sıfır kâr" değildir, yeşil de kırmızı da yalan olur.
   */
  kontrol("hesaplanamayan kâr NÖTR (yeşil/kırmızı yalan olurdu)", karDurumu(null) === "notr");
  kontrol("kârda olumlu", karDurumu(10) === "olumlu");
  kontrol("zararda olumsuz", karDurumu(-10) === "olumsuz");
  kontrol("sıfır kâr NÖTR", karDurumu(0) === "notr");
  /** NET-2 sunumu paletten geliyor ve yanında KELİME var (kısıt #1). */
  const netKar = readFileSync("src/components/net-kar.tsx", "utf8");
  kontrol(
    "NET-2 rengi paletten, yanında kelime var",
    netKar.includes("karDurumu(sayi)") &&
      netKar.includes('t("karda")') &&
      netKar.includes('t("zararda")'),
  );
  kontrol(
    "  ...sıfırda kelime YOK (nötr, ne müjde ne alarm)",
    netKar.includes('if (renk === "notr")'),
  );

  /**
   * ÜÇ KATMANIN ÜÇÜNCÜSÜ — satır şeridi gerçekten UYGULANMIŞ mı.
   * İlk turda `DURUM_SERIDI` tanımlıydı ama hiçbir ekran kullanmıyordu;
   * "tanımlandı" ile "uygulandı" arasındaki farkı test görmemişti.
   */
  const satisSayfasi = readFileSync("src/app/satislar/page.tsx", "utf8");
  kontrol(
    "satış satırı: zarar edende sol şerit var",
    satisSayfasi.includes("DURUM_SERIDI.olumsuz") &&
      satisSayfasi.includes("satirDurumu(satis)"),
  );
  kontrol(
    "  ...şerit yalnız ZARARDA (her satır boyanmaz, nötr taban korunur)",
    !satisSayfasi.includes("DURUM_SERIDI.olumlu"),
  );
  kontrol(
    "  ...kâr izni yoksa şerit de yok (NET kenarlıktan sızmaz)",
    satisSayfasi.includes("karGorunur && satirDurumu(satis)"),
  );

  /**
   * DURUM → RENK EŞLEMESİ. `Record<Enum, DurumRengi>` tipi sayesinde
   * şemaya yeni bir durum eklenip burada unutulursa proje DERLENMEZ —
   * yani "eksik eşleme" hatası hiç canlıya çıkamaz. Aşağıdakiler ise
   * eşlemenin DOĞRU olduğunu sınıyor; tip yalnız TAM olduğunu garanti eder.
   */
  kontrol(
    "alım: teslim alındı OLUMLU, bekleyenler UYARI",
    ALIM_DURUM_RENGI.RECEIVED === "olumlu" &&
      ALIM_DURUM_RENGI.ORDERED === "uyari" &&
      ALIM_DURUM_RENGI.PARTIALLY_RECEIVED === "uyari",
  );
  /** İPTAL KIRMIZI DEĞİL: bilinçli bir karardır, hata değil. */
  kontrol(
    "  ...iptal ve taslak NÖTR (hata değil, karar)",
    ALIM_DURUM_RENGI.CANCELLED === "notr" && ALIM_DURUM_RENGI.DRAFT === "notr",
  );
  kontrol(
    "iade: kapandı/kabul OLUMLU, red OLUMSUZ, mal geldi BİLGİ",
    BILDIRIM_DURUM_RENGI.KAPANDI === "olumlu" &&
      BILDIRIM_DURUM_RENGI.ITIRAZ_KABUL === "olumlu" &&
      BILDIRIM_DURUM_RENGI.ITIRAZ_RED === "olumsuz" &&
      BILDIRIM_DURUM_RENGI.MAL_GELDI === "bilgi",
  );
  kontrol(
    "  ...bekleyen ve itiraz dalı UYARI, iptal NÖTR",
    BILDIRIM_DURUM_RENGI.BEKLENIYOR === "uyari" &&
      BILDIRIM_DURUM_RENGI.ITIRAZ_ACILDI === "uyari" &&
      BILDIRIM_DURUM_RENGI.IPTAL === "notr",
  );
  /**
   * HESAPLANMIŞ KÂR NÖTRDÜR: rakamın kendisi zaten kâr/zarar rengini
   * taşıyor; kutuyu bir de yeşile boyamak aynı şeyi iki kez söylerdi.
   */
  kontrol(
    "kâr durumu: hesaplandı NÖTR, eksik hâller UYARI",
    KAR_DURUM_RENGI.CALCULATED === "notr" &&
      KAR_DURUM_RENGI.NO_COST === "uyari" &&
      KAR_DURUM_RENGI.RULE_MISSING === "uyari" &&
      KAR_DURUM_RENGI.CURRENCY_MISMATCH === "uyari",
  );
  kontrol(
    "yaşlanma: taze NÖTR, 31-60 UYARI, 60+ OLUMSUZ",
    YAS_BANDI_RENGI.NOTR === "notr" &&
      YAS_BANDI_RENGI.AMBER === "uyari" &&
      YAS_BANDI_RENGI.KIRMIZI === "olumsuz",
  );

  /** Eşlemeyi kullanan ekranlar gerçekten ORTAK sözlükten okuyor mu? */
  for (const [ad, yol, sembol] of [
    ["alımlar", "src/app/alimlar/page.tsx", "ALIM_DURUM_RENGI"],
    ["iadeler", "src/app/iadeler/page.tsx", "BILDIRIM_DURUM_RENGI"],
    ["yaşlanma rozeti", "src/app/panel-kartlari.tsx", "YAS_BANDI_RENGI"],
  ] as const) {
    kontrol(
      `  ${ad} ORTAK eşlemeden okuyor`,
      readFileSync(yol, "utf8").includes(sembol),
    );
  }
  kontrol(
    "marj rozeti paletten geliyor",
    panelSayfasi.includes("<DurumRozeti durum={renkDurumu}>"),
  );
}

// ===========================================================================
console.log("\nKANAL SÜZGECİ — HER KART AYNI EVRENDE");
// ===========================================================================
{
  /**
   * ⚠ CANLI BULGU 17.08.2026: kullanıcı Hepsiburada seçti; ciro ve adet o
   * kanala düştü ama KARGO kartı GENEL sayıyı gösterdi (11 / 2 bekleyen).
   * Aynı ekranda iki evren — kart hangi soruya cevap verdiği belli olmadan
   * rakam gösteriyordu.
   *
   * Sebep: `panelHesapla` üç liste alır; ekranda satış ve iade süzülüyordu,
   * KARGO ham geçiyordu. Tarama ikinci bir yer daha buldu: kıyas bloğu da
   * ham listeyle çağrılıyordu, yani rozet başka evrenin değişimini
   * gösterecekti.
   *
   * Bu kontrol EKRAN KODUNU tarar. Saf fonksiyon zaten doğru çalışıyordu;
   * hata ona NE VERİLDİĞİNDEYDİ ve değer testiyle yakalanamazdı.
   */
  const ekran = readFileSync("src/app/page.tsx", "utf8");

  const cagrilar = [...ekran.matchAll(/panelHesapla\(([\s\S]*?)\n\s*\)/g)].map(
    (m) => m[1],
  );
  kontrol("panelHesapla çağrıları bulundu", cagrilar.length >= 2, cagrilar.length);

  const hamKullanan = cagrilar.filter(
    (c) => /\bkargolar\b/.test(c) && !/donemKargolari/.test(c),
  );
  kontrol(
    "HİÇBİR panelHesapla çağrısı ham kargolar kullanmıyor",
    hamKullanan.length === 0,
    hamKullanan,
  );

  kontrol(
    "kargo listesi kanala göre süzülüyor",
    /donemKargolari\s*=\s*seciliKanal/.test(ekran),
  );

  /**
   * SÜZGEÇ AÇIKKEN GENEL RESİM KAYBOLMAZ: alt satırda tüm kanal toplamı
   * durur. Süzgeç yokken satır gereksiz tekrar olurdu.
   */
  kontrol(
    "süzgeç açıkken tüm kanal toplamı hesaplanıyor",
    /tumKanalKargo\s*=\s*seciliKanal/.test(ekran),
  );
  kontrol(
    "kart başlığı süzgeç açıkken KANAL ADINI yazıyor",
    /kargoDurumuKanal/.test(ekran),
  );
}

// ===========================================================================
console.log("\nKIYAS BOŞKEN SESSİZLİK YOK");
// ===========================================================================
{
  /**
   * ⚠ CANLI BULGU 18.08.2026 (Halil): kıyas dönemi bomboşken kutulardaki
   * değişim rozeti hiç çizilmiyordu; "veri mi yok, değişim mi yok" ayrımı
   * yapılamıyordu.
   *
   * Sessizlik BİLİNÇLİYDİ (15.08.2026: beş kutuda aynı cümleyi tekrarlama).
   * O karar DURUYOR — kontrol onun korunduğunu da sınıyor. Eksik olan YERDİ:
   * ibare dönem seçicisinin altındaydı, telefonda rakamlardan ekranlar ötede.
   *
   * DEĞER TESTİ BUNU GÖREMEZ: `kiyasRozeti` doğru davranıyordu (null dönmesi
   * kasıtlıydı) ve metin de vardı. Hata hesapta değil YERLEŞİMDEYDİ.
   */
  const ekran = readFileSync("src/app/page.tsx", "utf8");

  kontrol(
    "kıyas boşken rakam kartında ibare VAR",
    /kiyasBos \?[\s\S]{0,400}?kiyasVeriYok/.test(ekran),
  );

  const ibareYeri = ekran.indexOf("kiyasVeriYok");
  /**
   * ÇAPA: ızgara başlığı. 18.08.2026'da kutu sırası değişince eski çapa
   * ("--- büyük rakamlar ---") yeniden yazıldı ve bu kontrol kırmızı yandı
   * — doğru davranış: yerleşim kuralı yerleşim değişince yeniden sorulmalı.
   */
  const izgaraYeri = ekran.indexOf("BÜYÜK RAKAMLAR");
  kontrol(
    "  ...ve rakam ızgarasının ÜSTÜNDE",
    ibareYeri > 0 && izgaraYeri > 0 && ibareYeri < izgaraYeri,
  );

  /** ESKİ KARAR KORUNUYOR MU — kutu başına tekrar YOK. */
  kontrol(
    "kutu başına TEKRAR yok (eski karar duruyor)",
    /if \(!kiyasPencere \|\| kiyasBos\) return null;/.test(ekran),
  );

  kontrol(
    "seçici altındaki ibare de duruyor",
    /kiyasBos \?[\s\S]{0,200}?kiyaslanamaz/.test(ekran),
  );
}

// ===========================================================================
console.log("\nKART SIRASI VE YAPIŞKAN ÇUBUK");
// ===========================================================================
{
  /**
   * ⚠ Halil kararı 18.08.2026. İkisi de YERLEŞİM kuralı: değer testi
   * göremez, ekran kodu taranır.
   */
  const ekran = readFileSync("src/app/page.tsx", "utf8");

  /**
   * SIRA: ADET → KARGO → CİRO → NET-1 → NET-2 (operasyon hunisi).
   * Kutuların kaynak metindeki sırası ekrandaki sırasıdır (ızgara).
   */
  const yerler = {
    adet: ekran.indexOf('etiket={t("satisAdedi")}'),
    kargo: ekran.indexOf("{/* KARGO DURUMU — elle işaretlenen"),
    ciro: ekran.indexOf("{/* CİRO — kutu düzenine girmiyor"),
    net: ekran.indexOf("{/* NET-1 VE NET-2 YAN YANA"),
  };
  kontrol(
    "beş kutunun hepsi bulundu",
    Object.values(yerler).every((d) => d > 0),
    yerler,
  );
  kontrol("1. ADET", yerler.adet < yerler.kargo);
  kontrol("2. KARGOYA VERİLEN — ciroDAN ÖNCE", yerler.kargo < yerler.ciro);
  kontrol("3. CİRO", yerler.ciro < yerler.net);
  kontrol("4-5. NET-1 ve NET-2 sonda", yerler.net > yerler.ciro);

  /** YAPIŞKAN ÇUBUK — panelde açık. */
  kontrol(
    "panel süzgeç çubuğu YAPIŞKAN",
    /<SuzgecCubugu[\s\S]{0,400}?\byapiskan\b/.test(ekran),
  );

  const cubuk = readFileSync("src/components/suzgec-cubugu.tsx", "utf8");
  kontrol("çubuk sticky sınıfını taşıyor", /sticky top-0/.test(cubuk));
  /**
   * MASAÜSTÜNDE YAPIŞMAZ — orada çubuk zaten açık duruyor ve yapışkan
   * olsaydı üst şeridi kalıcı olarak yerdi (Kural #12).
   */
  kontrol("  ...ama masaüstünde STATİK", /md:static/.test(cubuk));
  /**
   * TELEFONDA ÖZET DÜĞMEDE: yapışkan çubuk neye bakıldığını söylemezse
   * kullanıcı her seferinde açmak zorunda kalır — yapışkanlığın amacı
   * tam da bunu kaldırmaktı.
   */
  /**
   * ÖZET DÜĞMENİN İÇİNDE OLMALI — sadece TANIMLI olması yetmez.
   * İlk yazdığım kontrol `/ozetMetni/` idi ve mutasyonda YEŞİL kaldı:
   * değişken duruyordu ama düğme onu kullanmıyordu. Kontrol artık
   * telefon düğmesinin gövdesinde arıyor.
   */
  kontrol(
    "telefonda aktif seçim DÜĞMEDE yazıyor",
    /md:hidden[\s\S]{0,700}?ozetMetni/.test(cubuk),
  );
  kontrol("  ...tek satır (truncate)", /truncate/.test(cubuk));
  /** Dokunma hedefi 44 px — İlke #8, yapışkan olması bunu düşürmez. */
  kontrol("dokunma hedefi h-11 kaldı", /h-11 w-full justify-between md:hidden/.test(cubuk));
}


// ===========================================================================
console.log("\nGÜNLÜK OPERASYON — TOPLAM İŞ ÇİZGİSİ");
// ===========================================================================
/**
 * Kullanıcı 23.08.2026: _"adet kısmında yapılan işleri hangi iş olduğuna
 * BAKMAKSIZIN toplasın; gün sonunda kaç kalem iş yapmışım görmek
 * istiyorum. Grafikte de kesikli çizgilerle toplam görünsün."_
 */
{
  const nokta = (alim: number, satis: number, kargo: number) => ({
    anahtar: "x",
    baslangic: new Date(2026, 7, 17),
    sonGun: new Date(2026, 7, 17),
    alimAdet: alim,
    alimTutar: 100,
    satisAdet: satis,
    satisCiro: 250,
    kargoAdet: kargo,
    kargoCiro: 0,
    alimKdv: 20,
    satisKdv: 50,
  });
  /* Kullanıcının ekran görüntüsündeki ilk üç gün — rakamlar oradan. */
  const noktalar = [nokta(11, 13, 12), nokta(6, 6, 9), nokta(14, 5, 4)];

  const adet = serileriKur(noktalar, "adet");
  kontrol("adet kipinde toplam serisi DOLU", adet.toplam !== null);
  kontrol(
    "  ...toplam = alım + satış + kargo",
    JSON.stringify(adet.toplam) === JSON.stringify([36, 21, 23]),
    adet.toplam,
  );

  /**
   * ⚠ ASIL KONTROL BU. Ciroda alım ile satış ZIT YÖNLERDİR: 100 TL alıp
   * 250 TL satmak "350 TL iş" değildir. KDV'de de indirilecek ile
   * hesaplanan toplanmaz, ÇIKARILIR (üçüncü seri zaten o farkı çiziyor).
   * Toplanabilen tek kip adet — üçü de aynı birimde: KAÇ KAYIT.
   */
  for (const kip of ["ciro", "kdv"] as const) {
    kontrol(
      `${kip} kipinde toplam çizilmiyor (zıt yönler toplanmaz)`,
      serileriKur(noktalar, kip).toplam === null,
    );
  }

  const grafik = readFileSync("src/components/uc-serili-grafik.tsx", "utf8");
  const toplamBloku = grafik.slice(
    grafik.indexOf("TOPLAM ÇİZGİSİ"),
    grafik.indexOf("TIKLANABİLİR NOKTALAR"),
  );
  kontrol("toplam çizgisi bloğu kesilebildi", toplamBloku.length > 0);
  /**
   * ⚠ KESİKLİ OLMASI SÜS DEĞİL: bu çizgi ÖLÇÜLEN bir şey değil, ötekilerin
   * TOPLAMI. Düz çizilseydi dördüncü bir ölçüm sanılır ve "toplam neden
   * satıştan büyük" diye sorulurdu.
   */
  kontrol(
    "  ...KESİKLİ çiziliyor (türetilmiş olduğu görünsün)",
    /strokeDasharray/.test(toplamBloku),
  );
  /**
   * ⚠ TIKLANAMAZ VE BU BİLEREK: tek bir toplamın süzülmüş karşılığı yok —
   * tıklanınca alıma mı satışa mı kargoya mı gidileceği belirsiz.
   * Tıklanabilir görünüp hiçbir yere gitmemek İlke #2'nin tersidir.
   */
  kontrol("  ...tıklanabilir DEĞİL (gidilecek tek liste yok)", !/<a\s/.test(toplamBloku));
  /**
   * ⚠ EKSENE DAHİL OLMALI. Değilse toplam çizgisi tavanı aşar ve grafiğin
   * ÜSTÜNDEN taşar — okunmaz olur.
   */
  kontrol(
    "toplam Y eksenine dahil (grafikten taşmasın)",
    /toplamVar[\s\S]{0,80}toplamDeger\(n\)\]/.test(grafik),
  );
  /**
   * ⚠ İKİ ŞART BİRLİKTE: ad verilmiş VE her noktada sayı var. Biri eksikse
   * çizgi `NaN`a düşer ve grafik boş değil BOZUK çizilir.
   */
  kontrol(
    "ad ve veri BİRLİKTE aranıyor (yarım seri çizilmez)",
    /toplamAdi !== undefined &&[\s\S]{0,60}noktalar\.every/.test(grafik),
  );
  /** Tabloda da sütun — grafik okunamayan için asıl okunabilir hâl. */
  kontrol("tabloda da toplam sütunu var", /toplamVar \? \([\s\S]{0,40}<th/.test(grafik));

  /**
   * ── PAKETLEME İLERLEME SAYACI (24.08.2026) ───────────────────────────
   *
   * Kullanıcı: _"kargoya verilecek 15 · paketlenen 0 → 1 sipariş
   * paketlenince kargoya verilecek 15 · paketlenen 1; bu sayılar eşit
   * olana kadar devam."_
   *
   * ⚠ ASIL RİSK SAYIM DEĞİL KAPSAM. İki sayı FARKLI kümeden gelirse
   * hiç eşitlenmezler ve sayaç paydayı aşabilir — "15/17" gibi. Aşağıdaki
   * ilk kontrol tam da bunu sabitliyor.
   */
  {
    const veri = readFileSync("src/lib/panel/gorev-verisi.ts", "utf8");
    const bas = veri.indexOf("export async function paketlenenSiparisSayisi");
    const govde = veri.slice(bas, veri.indexOf("\nexport ", bas + 10));
    kontrol("paketlenen sayacının gövdesi kesilebildi", bas > 0 && govde.length > 100);

    /**
     * ⚠ DESEN DOSYADA ÜÇ KEZ GEÇİYOR (`shippedAt: null`) — bu yüzden
     * dosyada değil, YALNIZ bu fonksiyonun gövdesinde aranıyor. Dosya
     * genelinde arayan bir kontrol, sayaçtan silinse bile öteki iki
     * kullanımı bulup yeşil kalırdı.
     */
    kontrol(
      "pay, paydayla AYNI kümeden sayılıyor (kargoya verilmemiş)",
      /shippedAt: null/.test(govde),
    );
    kontrol(
      "  ...iptaller ikisinden de dışarıda",
      /iptalTarihi: null/.test(govde),
    );
    /**
     * Kural okuma ekranıyla AYNI gövdeden geçiyor — iki ayrı "en yeni iz"
     * yorumu doğmasın.
     *
     * ⚠ ZİNCİR İKİ ADIMA ÇIKTI (24.08.2026): sayaç ile satış listesinin
     * paketleme süzgeci AYNI kümeyi istediği için kimlik çözümü
     * `hazirlananSiparisKimlikleri()`e ayrıldı. Bu yüzden İKİ HALKA da
     * ayrı sınanıyor — sayaç doğru fonksiyonu çağırıyor mu, VE o fonksiyon
     * ortak kuralı kullanıyor mu. Yalnız birini sınamak, ötekini
     * kopyalanmış bir yoruma çevirebilirdi.
     */
    kontrol(
      "  ...sayaç ortak kimlik çözümünü çağırıyor",
      /hazirlananSiparisKimlikleri\(\)/.test(govde),
    );
    const cozumBasi = veri.indexOf(
      "export async function hazirlananSiparisKimlikleri",
    );
    const cozumGovdesi = veri.slice(
      cozumBasi,
      veri.indexOf("\nexport ", cozumBasi + 10),
    );
    kontrol("kimlik çözümünün gövdesi kesilebildi", cozumBasi > 0);
    kontrol(
      "  ...ve o da ortak kuraldan geçiyor (elle 'en yeni iz' yorumu yok)",
      /hazirlananSiparisler\(/.test(cozumGovdesi),
    );
    /**
     * ⚠ KİMLİK ÇÖZÜMÜ KÜME DARALTMAZ. Daraltsaydı satış listesindeki
     * `paket=bekleyen` (kümenin DIŞI) yanlış çalışırdı: kargoya verilmiş
     * ama paketlenmiş eski siparişler "paketlenmemiş" sayılırdı. Daraltma
     * çağıranın işi — sayaç `shippedAt`i kendi ekliyor.
     */
    kontrol(
      "  ...ve kimlik çözümü küme DARALTMIYOR (daraltma çağıranın işi)",
      !/shippedAt/.test(cozumGovdesi),
    );

    const kutu = readFileSync("src/app/gorev-kutusu.tsx", "utf8");
    const kutuKodu = kutu.replace(/\{\/\*[\s\S]*?\*\/\}/g, " ");
    /**
     * ⚠ İLERLEMESİ OLMAYAN GÖREVDE HİÇ ÇİZİLMEZ. `?? 0` ile çizilseydi
     * beş görevin dördünde "0 paketlendi" yazardı — paketlenecek bir şeyi
     * olmayan görevlerde uydurulmuş bir sıfır.
     */
    kontrol(
      "ilerleme YALNIZ tanımlıysa çiziliyor (uydurma 0 yok)",
      /gorev\.ilerleme !== null \?/.test(kutuKodu),
    );
    /**
     * ⚠ BİTİŞ, BAŞLANGIÇTAN SONRA ARANIYOR. `ilerlemeMetni` dosyada İKİ kez
     * geçiyor: önce prop imzasında, sonra çizimde. Argümansız `indexOf`
     * imzadakini bulup dilimi TERS çeviriyor ve blok boş kalıyordu —
     * doğru davranışta kırmızı yanan bir kontrol.
     */
    const ilerlemeBasi = kutuKodu.indexOf("gorev.ilerleme !== null ?");
    const ilerlemeBloku = kutuKodu.slice(
      ilerlemeBasi,
      kutuKodu.indexOf("ilerlemeMetni", ilerlemeBasi) + 40,
    );
    kontrol("ilerleme bloku kesilebildi", ilerlemeBasi > 0 && ilerlemeBloku.length > 60);
    kontrol("  ...ve sayı ekrana BASILIYOR", /\{ilerlemeMetni\}/.test(ilerlemeBloku));
    /**
     * ⚠ EŞİTLENİNCE YEŞİL. "15 / 15" ile "15 / 3" aynı renkte dursaydı
     * bitmiş iş bitmemiş gibi okunurdu; kullanıcının istediği tam olarak
     * "bu sayılar eşit olana kadar devam" sinyaliydi.
     */
    kontrol(
      "  ...hepsi paketlenince YEŞİL, değilse nötr",
      /gorev\.ilerleme >= gorev\.sayi[\s\S]{0,80}DURUM_YAZISI\.olumlu/.test(
        ilerlemeBloku,
      ),
    );
  }

  const panel = readFileSync("src/app/page.tsx", "utf8");
  kontrol(
    "panel toplam adını YALNIZ seri varken veriyor",
    /operasyonSeri\.toplam \? t\("operasyonToplamSeri"\) : undefined/.test(panel),
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
