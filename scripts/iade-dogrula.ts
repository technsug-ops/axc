/**
 * ============================================================================
 *  İADE MOTORU DOĞRULAMA
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run iade:dogrula
 *
 *  BÖLÜMLER:
 *  1) ÜÇ SENARYO — UNDELIVERED / NORMAL / DISPUTED
 *  2) KISMİ İADE — her kalemin adet oranında geri gelmesi
 *  3) KESİNTİ KAPSAMI — neyin geri geldiği, neyin GELMEDİĞİ
 *  4) DEĞİŞİM + HASARLI
 *  5) KDV VARSAYIMI — S6, muhasebeci teyidi bekliyor; ayrı tutuldu ki
 *     teyit değişirse tek yerden düzeltilsin
 *  6) CEZA KADEMESİ — sınır değerleri (veritabanına gider)
 * ============================================================================
 */

import "dotenv/config";

import { cezaOnerisi, iadeEtkisiHesapla, type IadeGirdisi } from "../src/lib/iade";
import { prisma } from "../src/lib/prisma";

let basarisiz = 0;
let calisan = 0;
let bolum6Tamamlandi = false;

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

function yakin(ad: string, gelen: number, beklenen: number, tolerans = 0.02) {
  calisan++;
  const fark = Math.abs(gelen - beklenen);
  if (fark <= tolerans) {
    console.log(
      `  OK    ${ad.padEnd(38)} ${gelen.toFixed(2).padStart(10)}  (beklenen ${beklenen.toFixed(2)})`,
    );
  } else {
    basarisiz++;
    console.log(
      `  HATA  ${ad.padEnd(38)} ${gelen.toFixed(2).padStart(10)}  (beklenen ${beklenen.toFixed(2)}, FARK ${fark.toFixed(2)})`,
    );
  }
}

/** Satır kodunu bulur; yoksa 0 döner. */
function satir(satirlar: { code: string; tutar: number }[], kod: string) {
  return satirlar.find((s) => s.code === kod)?.tutar ?? 0;
}

/** Altın senaryo 1'in (HB / LEGO) iade hâli. */
function lego(ek?: Partial<IadeGirdisi>): IadeGirdisi {
  return {
    returnType: "NORMAL",
    kalemler: [
      {
        satilanAdet: 1,
        iadeAdedi: 1,
        saglamAdet: 1,
        satisTutari: 2157,
        maliyet: 1565,
        kdvOrani: 20,
        komisyon: 103.53,
        degisimMaliyeti: null,
      },
    ],
    odemeGideri: 14.38,
    siparisToplami: 2157,
    iadeKargosu: null,
    yenidenGonderimKargosu: null,
    ceza: null,
    ...ek,
  };
}

// ===========================================================================
console.log("\n1) ÜÇ SENARYO");
// ===========================================================================
{
  // --- UNDELIVERED: ek kargo yok, her şey geri gelir ---
  const u = iadeEtkisiHesapla(lego({ returnType: "UNDELIVERED" }));
  const uk = u.kalemSatirlari[0];
  yakin("UNDELIVERED kayıp gelir", satir(uk, "KAYIP_GELIR"), -2157);
  yakin("UNDELIVERED komisyon iadesi", satir(uk, "KOMISYON_IADE"), 103.53);
  yakin("UNDELIVERED ödeme gideri iadesi", satir(uk, "ODEME_GIDERI_IADE"), 14.38);
  yakin("UNDELIVERED stopaj iadesi", satir(uk, "STOPAJ_IADE"), 17.98);
  yakin("UNDELIVERED maliyet geri", satir(uk, "MALIYET_GERI"), 1565);
  kontrol(
    "UNDELIVERED'da iade kargosu YOK",
    u.genelSatirlar.length === 0,
    u.genelSatirlar,
  );

  // --- NORMAL: aynısı + dönüş kargosu ---
  const n = iadeEtkisiHesapla(lego({ iadeKargosu: 89 }));
  yakin("NORMAL iade kargosu gider", satir(n.genelSatirlar, "IADE_KARGO"), -89);
  yakin(
    "NORMAL net1 etkisi",
    n.net1Etkisi,
    -2157 + 103.53 + 14.38 + 17.98 + 1565 - 89,
  );
  kontrol("NORMAL: iade zarardır (net1 < 0)", n.net1Etkisi < 0, n.net1Etkisi);

  // --- DISPUTED: satış ayakta; gelir düşmez, komisyon gelmez, stok girmez ---
  const d = iadeEtkisiHesapla(
    lego({ returnType: "DISPUTED", iadeKargosu: 89, yenidenGonderimKargosu: 95 }),
  );
  const dk = d.kalemSatirlari[0];
  kontrol("DISPUTED: kayıp gelir YOK", satir(dk, "KAYIP_GELIR") === 0);
  kontrol("DISPUTED: komisyon iadesi YOK", satir(dk, "KOMISYON_IADE") === 0);
  kontrol("DISPUTED: maliyet geri YOK", satir(dk, "MALIYET_GERI") === 0);
  kontrol("DISPUTED: stopaj iadesi YOK", satir(dk, "STOPAJ_IADE") === 0);
  yakin(
    "DISPUTED: yalnızca giderler",
    d.net1Etkisi,
    -89 - 95,
  );
}

// ===========================================================================
console.log("\n2) KISMİ İADE — adet oranında");
// ===========================================================================
{
  // 3 adet satıldı, 1'i iade edildi -> her şey 1/3
  const k = iadeEtkisiHesapla({
    returnType: "NORMAL",
    kalemler: [
      {
        satilanAdet: 3,
        iadeAdedi: 1,
        saglamAdet: 1,
        satisTutari: 3600, // 3 x 1200
        maliyet: 2400, // 3 x 800
        kdvOrani: 20,
        komisyon: 300,
        degisimMaliyeti: null,
      },
    ],
    odemeGideri: 30,
    siparisToplami: 3600,
    iadeKargosu: null,
    yenidenGonderimKargosu: null,
    ceza: null,
  });
  const ks = k.kalemSatirlari[0];
  yakin("1/3 kayıp gelir", satir(ks, "KAYIP_GELIR"), -1200);
  yakin("1/3 komisyon iadesi", satir(ks, "KOMISYON_IADE"), 100);
  yakin("1/3 ödeme gideri iadesi", satir(ks, "ODEME_GIDERI_IADE"), 10);
  yakin("1/3 maliyet geri", satir(ks, "MALIYET_GERI"), 800);
  yakin("1/3 stopaj iadesi", satir(ks, "STOPAJ_IADE"), 10); // 1000 x %1
}

// ===========================================================================
console.log("\n3) KESİNTİ KAPSAMI — ne geri gelir, ne GELMEZ");
// ===========================================================================
{
  const s = iadeEtkisiHesapla(lego({ iadeKargosu: 89 }));
  const tumKodlar = [
    ...s.kalemSatirlari.flat().map((x) => x.code),
    ...s.genelSatirlar.map((x) => x.code),
  ];

  kontrol("komisyon geri gelir", tumKodlar.includes("KOMISYON_IADE"));
  kontrol("ödeme gideri geri gelir", tumKodlar.includes("ODEME_GIDERI_IADE"));
  kontrol("stopaj geri gelir", tumKodlar.includes("STOPAJ_IADE"));
  // Hizmet bedeli, sabit gider ve GİDİŞ kargosu satıcıda kalır — satır YOK.
  kontrol(
    "hizmet bedeli GERİ GELMEZ",
    !tumKodlar.some((c) => c.includes("HIZMET")),
    tumKodlar,
  );
  kontrol(
    "sabit gider GERİ GELMEZ",
    !tumKodlar.some((c) => c.includes("SABIT")),
    tumKodlar,
  );
  kontrol(
    "gidiş kargosu GERİ GELMEZ",
    !tumKodlar.includes("KARGO_IADE"),
    tumKodlar,
  );
}

// ===========================================================================
console.log("\n4) DEĞİŞİM VE HASARLI");
// ===========================================================================
{
  // Hasarlı gelen mal stoğa GİRMEZ -> maliyeti geri gelmez.
  const h = iadeEtkisiHesapla({
    returnType: "NORMAL",
    kalemler: [
      {
        satilanAdet: 2,
        iadeAdedi: 2,
        saglamAdet: 1, // biri hasarlı
        satisTutari: 2400,
        maliyet: 1600,
        kdvOrani: 20,
        komisyon: 200,
        degisimMaliyeti: null,
      },
    ],
    odemeGideri: 0,
    siparisToplami: 2400,
    iadeKargosu: null,
    yenidenGonderimKargosu: null,
    ceza: null,
  });
  yakin(
    "hasarlı adet maliyeti geri GELMEZ (yarısı)",
    satir(h.kalemSatirlari[0], "MALIYET_GERI"),
    800,
  );

  // Değişim: yerine giden ürünün maliyeti giderdir.
  const d = iadeEtkisiHesapla(
    lego({ kalemler: [{ ...lego().kalemler[0], degisimMaliyeti: 900 }] }),
  );
  yakin(
    "değişim maliyeti gider",
    satir(d.kalemSatirlari[0], "DEGISIM_MALIYET"),
    -900,
  );

  // Değişim itirazlı iadede de giderdir (satış ayakta ama mal gitti).
  const di = iadeEtkisiHesapla(
    lego({
      returnType: "DISPUTED",
      kalemler: [{ ...lego().kalemler[0], degisimMaliyeti: 900 }],
    }),
  );
  yakin(
    "DISPUTED'da da değişim maliyeti gider",
    satir(di.kalemSatirlari[0], "DEGISIM_MALIYET"),
    -900,
  );

  // Maliyeti bilinmeyen parti -> NO_COST
  const nc = iadeEtkisiHesapla(
    lego({ kalemler: [{ ...lego().kalemler[0], maliyet: null }] }),
  );
  kontrol("maliyeti bilinmeyen iade -> NO_COST", nc.durum === "NO_COST", nc.durum);
}

// ===========================================================================
console.log("\n5) KDV VARSAYIMI (S6 — muhasebeci teyidi bekliyor)");
// ===========================================================================
{
  const s = iadeEtkisiHesapla(lego({ iadeKargosu: 89 }));

  // Satış KDV'si geri gelir -> ödenecek KDV AZALIR
  // 2157 x 20/120 = 359,50
  // Komisyon KDV indirimi iptal -> ARTAR: 103,53 x 20/120 = 17,26
  // Ödeme gideri KDV indirimi iptal -> ARTAR: 14,38 x 20/120 = 2,40
  // İade kargosu KDV'si indirilir -> AZALIR: 89 x 20/120 = 14,83
  const beklenen = -359.5 + 17.26 + 2.4 - 14.83;
  yakin("ödenecek KDV değişimi", s.odenecekKdvDegisimi, beklenen, 0.05);
  kontrol(
    "iade edilince daha AZ KDV ödenir",
    s.odenecekKdvDegisimi < 0,
    s.odenecekKdvDegisimi,
  );
  yakin("net2 etkisi", s.net2Etkisi, s.net1Etkisi - s.odenecekKdvDegisimi, 0.01);
}

// ===========================================================================
//  6) CEZA KADEMESİ — veritabanına gider
// ===========================================================================
async function cezaTesti() {
  console.log("\n6) CEZA KADEMESİ — sınır değerleri");
  try {
    const tarih = new Date("2026-08-09");
    const ty = await prisma.channel.findUnique({ where: { code: "TRENDYOL" } });
    const hb = await prisma.channel.findUnique({
      where: { code: "HEPSIBURADA" },
    });
    if (!ty || !hb) {
      kontrol("kanallar bulundu", false, "TRENDYOL/HEPSIBURADA yok");
      return;
    }

    const bekle = async (
      ad: string,
      kanalId: string,
      tutar: number,
      beklenen: number | null,
    ) => {
      const c = await cezaOnerisi(kanalId, tutar, tarih);
      calisan++;
      if (c === beklenen) {
        console.log(`  OK    ${ad.padEnd(38)} ${c === null ? "(öneri yok)" : c}`);
      } else {
        basarisiz++;
        console.log(`  HATA  ${ad.padEnd(38)} ${c} (beklenen ${beklenen})`);
      }
    };

    // Trendyol sınırları
    await bekle("TY 149 TL -> 50", ty.id, 149, 50);
    await bekle("TY 150 TL -> 100", ty.id, 150, 100);
    await bekle("TY 999 TL -> 150", ty.id, 999, 150);
    await bekle("TY 1000 TL -> 250", ty.id, 1000, 250);
    await bekle("TY 2157 TL -> 250 (test satışı)", ty.id, 2157, 250);
    await bekle("TY 9999 TL -> 500", ty.id, 9999, 500);
    await bekle("TY 10000 TL -> 1000", ty.id, 10000, 1000);

    // Hepsiburada sınırları — 6.000 üstünde ÖNERİ YOK
    await bekle("HB 50 TL -> 10", hb.id, 50, 10);
    await bekle("HB 50,01 TL -> 20", hb.id, 50.01, 20);
    await bekle("HB 1000 TL -> 50", hb.id, 1000, 50);
    await bekle("HB 6000 TL -> 150", hb.id, 6000, 150);
    await bekle("HB 6000,01 TL -> öneri YOK", hb.id, 6000.01, null);
    await bekle("HB 20000 TL -> öneri YOK", hb.id, 20000, null);

    bolum6Tamamlandi = true;
  } catch (e) {
    basarisiz++;
    console.log("  HATA  ceza testi istisnayla kesildi");
    console.log("        ", e);
  } finally {
    if (!bolum6Tamamlandi) {
      basarisiz++;
      console.log("  HATA  ceza bölümü sonuna kadar çalışmadı");
    }
    console.log(`\n${"=".repeat(72)}`);
    console.log(
      basarisiz === 0
        ? `TÜM KONTROLLER GEÇTİ (${calisan})`
        : `${basarisiz}/${calisan} KONTROL BAŞARISIZ`,
    );
    process.exit(basarisiz === 0 ? 0 : 1);
  }
}

void cezaTesti();
