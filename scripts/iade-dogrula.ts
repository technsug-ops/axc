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

import { readFileSync } from "node:fs";

import {
  cezaOnerisi,
  fifoMaliyeti,
  iadeEtkisiHesapla,
  komisyonToplami,
  satisCikisMaliyeti,
  type IadeGirdisi,
  tarihselKipKontrol,
} from "../src/lib/iade";
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
console.log("\n1b) ALTIN SENARYO — JBL Partybox (kullanıcının Excel İade sayfası)");
// ===========================================================================
{
  // Trendyol satışı: 7.835 · maliyet 5.749 · komisyon 822,68 · sabit 13,19
  // Gidiş kargosu (107) satışta zaten kesildi — iadede GERİ GELMEZ.
  // Trendyol'da ödeme gideri YOK (o bir Hepsiburada kalemi).
  const IADE_KARGOSU = 120; // kullanıcı elle girer; dönüş bacağı
  const jbl = iadeEtkisiHesapla({
    returnType: "NORMAL",
    kalemler: [
      {
        satilanAdet: 1,
        iadeAdedi: 1,
        saglamAdet: 1,
        satisTutari: 7835,
        maliyet: 5749,
        kdvOrani: 20,
        komisyon: 822.68,
        degisimMaliyeti: null,
      },
    ],
    odemeGideri: 0, // Trendyol
    siparisToplami: 7835,
    iadeKargosu: IADE_KARGOSU,
    yenidenGonderimKargosu: null,
    ceza: null,
  });
  const jk = jbl.kalemSatirlari[0];

  yakin("JBL kayıp gelir", satir(jk, "KAYIP_GELIR"), -7835);
  yakin("JBL komisyon iadesi (tam)", satir(jk, "KOMISYON_IADE"), 822.68);
  yakin("JBL stopaj iadesi", satir(jk, "STOPAJ_IADE"), 65.29);
  yakin("JBL maliyet geri", satir(jk, "MALIYET_GERI"), 5749);
  yakin("JBL iade kargosu", satir(jbl.genelSatirlar, "IADE_KARGO"), -IADE_KARGOSU);

  kontrol(
    "JBL: Trendyol'da ödeme gideri satırı ÜRETİLMEZ",
    satir(jk, "ODEME_GIDERI_IADE") === 0 &&
      !jk.some((s) => s.code === "ODEME_GIDERI_IADE"),
    jk.map((s) => s.code),
  );
  kontrol(
    "JBL: 13,19 sabit gider GERİ GELMEZ",
    ![...jk, ...jbl.genelSatirlar].some((s) => s.code.includes("SABIT")),
  );
  kontrol(
    "JBL: gidiş kargosu (107) GERİ GELMEZ",
    ![...jk, ...jbl.genelSatirlar].some(
      (s) => s.tutar === 107 || s.tutar === -107,
    ),
  );

  yakin(
    "JBL net1 etkisi",
    jbl.net1Etkisi,
    -7835 + 822.68 + 65.29 + 5749 - IADE_KARGOSU,
  );
  kontrol("JBL: iade zarardır", jbl.net1Etkisi < 0, jbl.net1Etkisi);
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
  /**
   * MALİYET ARTIK İKİ SATIR — 14.08.2026 kullanıcı bulgusu.
   *
   * Eskiden tek satır vardı ve SAĞLAM adede göreydi (800). Hasarlıya düşen
   * maliyet hiçbir yere yazılmıyordu; "stoğa dönmeyen maliyet" kutusu onu
   * dönen maliyetten türetmeye çalışıyor, sağlam adet 0'ken ₺0,00
   * gösteriyordu. Artık kırılım açık: tamamı +1600, hasarlı payı −800.
   *
   * KİLİT: İKİSİNİN TOPLAMI ESKİ TEK SATIRA EŞİT. Bu eşitlik bozulursa
   * zarar çifte sayılır ya da eksik kalır — NET sessizce kayar.
   */
  const hGeri = satir(h.kalemSatirlari[0], "MALIYET_GERI");
  const hDonmeyen = satir(h.kalemSatirlari[0], "MALIYET_DONMEYEN");
  yakin("iade edilen adedin TAMAMININ maliyeti yazılır", hGeri, 1600);
  yakin("hasarlıya düşen pay AYRI satırda ve NEGATİF", hDonmeyen, -800);
  yakin("  ...ikisinin toplamı eski tek satıra EŞİT (net kaymaz)", hGeri + hDonmeyen, 800);

  /**
   * AÇIK SIFIR — 13.08.2026 dersi, kilitleniyor.
   *
   * Tamamı hasarlı iadede MALIYET_GERI satırı eskiden HİÇ OLUŞMUYORDU.
   * Kullanıcı "maliyet geri gelmedi"yi satırın yokluğundan anlamak
   * zorundaydı; anlamadı ve kanal NET-2'si eksiye düşünce "hesaplamada
   * hata var" dedi. Hesap doğruydu, eksik olan AÇIKLAMAYDI.
   *
   * Bu kontrol iki şeyi birden korur: satır VAR olmalı ve tutarı SIFIR
   * olmalı. Biri bozulursa ekrandaki açıklama sessizce kaybolur.
   */
  const th = iadeEtkisiHesapla({
    returnType: "NORMAL",
    kalemler: [
      {
        satilanAdet: 1,
        iadeAdedi: 1,
        saglamAdet: 0, // tamamı hasarlı
        satisTutari: 2980,
        maliyet: 1799,
        kdvOrani: 20,
        komisyon: 439.55,
        degisimMaliyeti: null,
      },
    ],
    odemeGideri: 0,
    siparisToplami: 2980,
    iadeKargosu: 163,
    yenidenGonderimKargosu: null,
    ceza: null,
  });
  kontrol(
    "tamamı hasarlı: MALIYET_GERI satırı GÖRÜNÜR (sessiz yokluk değil)",
    th.kalemSatirlari[0].some((s) => s.code === "MALIYET_GERI"),
  );
  /**
   * TAMAMEN HASARLI — KULLANICININ EKRANDA GÖRDÜĞÜ VAKA (14.08.2026).
   *
   * Dönem özetinde "Stoğa dönmeyen maliyet ₺0,00" yazıyordu, altında da
   * "Hasarlı mal — maliyeti üstünüzde kaldı". Kutu kendi açıklamasını
   * yalanlıyordu: 1.799 TL gerçekten üstte kalmıştı.
   *
   * ÜÇ KİLİT BİRDEN: dönmeyen satırı VAR, tutarı TAM maliyet, ve stoğa
   * FİİLEN dönen (ikisinin toplamı) SIFIR.
   */
  const thGeri = satir(th.kalemSatirlari[0], "MALIYET_GERI");
  const thDonmeyen = satir(th.kalemSatirlari[0], "MALIYET_DONMEYEN");
  kontrol(
    "tamamı hasarlı: MALIYET_DONMEYEN satırı GÖRÜNÜR",
    th.kalemSatirlari[0].some((s) => s.code === "MALIYET_DONMEYEN"),
  );
  yakin("tamamı hasarlı: dönmeyen maliyet TAM tutar (0 değil!)", thDonmeyen, -1799);
  yakin("tamamı hasarlı: stoğa FİİLEN dönen maliyet sıfır", thGeri + thDonmeyen, 0);

  /** Hasar YOKKEN satır yine durur, tutarı 0 — "hesaplanmadı" ile ayrışsın. */
  const hasarsiz = iadeEtkisiHesapla({
    returnType: "NORMAL",
    kalemler: [
      {
        satilanAdet: 1,
        iadeAdedi: 1,
        saglamAdet: 1,
        satisTutari: 2980,
        maliyet: 1799,
        kdvOrani: 20,
        komisyon: 439.55,
        degisimMaliyeti: null,
      },
    ],
    odemeGideri: 0,
    siparisToplami: 2980,
    iadeKargosu: null,
    yenidenGonderimKargosu: null,
    ceza: null,
  });
  kontrol(
    "hasar yokken de MALIYET_DONMEYEN satırı VAR (açık sıfır)",
    hasarsiz.kalemSatirlari[0].some((s) => s.code === "MALIYET_DONMEYEN"),
  );

  /**
   * ══════════════════════════════════════════════════════════════════════
   *  ÖNİZLEME = KAYIT (kullanıcı isteği 14.08.2026)
   * ----------------------------------------------------------------------
   *  Önizleme ile kayıt aynı `iadeEtkisiHesapla`yı çağırıyor AMA ona
   *  verilen girdiyi eskiden iki ayrı yerde, iki ayrı kod parçasıyla
   *  kuruyorlardı. Kopyanın biri düzeltilip diğeri unutulduğunda ekran
   *  kaydettiğinden başka bir rakam gösterir — kullanıcı yanlış rakama
   *  bakarak karar verir. Girdiyi üreten parçalar artık paylaşılıyor;
   *  aşağıda hem parçaları hem de iki yolun AYNI parçaları çağırdığını
   *  sınıyoruz.
   */
  const hareketler = [
    { quantityDelta: -1, unitCostAmount: "1799.0000" },
    { quantityDelta: -1, unitCostAmount: "1750.0000" },
  ];
  yakin("satış çıkış maliyeti toplanıyor", satisCikisMaliyeti(hareketler) ?? -1, 3549);
  kontrol(
    "bir hareket maliyetsizse TOPLAM null (uydurulmaz)",
    satisCikisMaliyeti([...hareketler, { quantityDelta: -1, unitCostAmount: null }]) === null,
  );
  /**
   * ⛔ ÖLÇÜT TERSİNE ÇEVRİLDİ 28.08.2026 — ESKİ HÂLİ VE NİYE:
   *
   *     yakin("hareket yoksa maliyet sıfır", satisCikisMaliyeti([]) ?? -1, 0);
   *
   * Bu ölçüt gerekçesizdi: kodun O ANDAKİ davranışını sabitliyordu, bir
   * kuralı değil. Ve sabitlediği şey bir HATAYDI — boş hareket listesi
   * "bedava mal" demek değil, "FIFO bağı yok, maliyet BİLİNMİYOR" demek.
   *
   * ⚠ Canlıda ölçüldü: bağı olmayan 2573 kalem `CALCULATED` sayılıyor,
   * ciroları ₺6.585.533 ve maliyet düşülmeden ₺4.573.976 "net2" yazılmış.
   * Ayrım tertemiz: `MALIYET = 0` olup hareketi OLAN kalem sayısı **0**.
   *
   * ⚠ Sarmalayıcının kendi belgesi zaten "uydurulmaz" diyordu; ölçüt o
   * sözün tersini koruyordu.
   */
  kontrol(
    "hareket yoksa maliyet BİLİNMİYOR (null) — sıfır DEĞİL",
    satisCikisMaliyeti([]) === null,
    satisCikisMaliyeti([]),
  );
  yakin(
    "komisyon yalnız KOMISYON satırlarından",
    komisyonToplami([
      { code: "KOMISYON", amount: "100" },
      { code: "KARGO", amount: "50" },
      { code: "KOMISYON", amount: "39.55" },
    ]),
    139.55,
  );
  yakin(
    "değişim maliyeti FIFO paylarından",
    fifoMaliyeti([
      { parti: { birimMaliyet: "100.0000" }, adet: 2 },
      { parti: { birimMaliyet: "150.0000" }, adet: 1 },
    ]),
    350,
  );
  kontrol(
    "  ...maliyetsiz parti sıfır sayılır, patlamaz",
    fifoMaliyeti([{ parti: { birimMaliyet: null }, adet: 3 }]) === 0,
  );

  /** İKİ YOL DA AYNI PARÇALARI ÇAĞIRIYOR MU (kopya kalmadı mı). */
  const onizlemeKaynagi = readFileSync(
    "src/app/satislar/[id]/iade/actions.ts",
    "utf8",
  );
  kontrol(
    "önizleme paylaşılan parçaları çağırıyor",
    onizlemeKaynagi.includes("satisCikisMaliyeti(") &&
      onizlemeKaynagi.includes("komisyonToplami(") &&
      onizlemeKaynagi.includes("fifoMaliyeti("),
  );
  /**
   * ESKİ YAKLAŞIKLIK GERİ GELMEDİ: değişim maliyeti "en eski hareketin
   * birim maliyeti × adet" ile tahmin ediliyordu; kapanmış partileri de
   * sayıyor ve çok partili çıkışta tutmuyordu.
   */
  kontrol(
    "  ...değişim maliyeti GERÇEK FIFO'dan (yaklaşık hesap kalkmış)",
    /**
     * ⚠ ÖLÇÜT 29.08.2026'DA GÜNCELLENDİ — KOD DEĞİL, ÖLÇÜT ESKİMİŞTİ.
     * Eskiden çağrının BİREBİR METNİ aranıyordu:
     *     "acikPartiler(prisma, g.exchangeVariantId)"
     * FIFO'ya tarih sınırı eklenince çağrı üçüncü argüman aldı ve satıra
     * sığmadı; metin değişti, DAVRANIŞ değişmedi. Ölçüt kırmızı yandı ve
     * HAKLIYDI: sessiz kalmaktansa yanlış şeyi göstermek iyidir. Ama
     * susturulmadı — davranışa bağlandı: çağrı VAR mı, eski yaklaşıklık
     * geri geldi mi.
     */
    /\bacikPartiler\(\s*prisma,\s*g\.exchangeVariantId\b/.test(onizlemeKaynagi) &&
      !onizlemeKaynagi.includes("quantityDelta: { gt: 0 }"),
  );
  const kayitKaynagi = readFileSync("src/lib/iade.ts", "utf8");
  kontrol(
    "kayıt da aynı parçaları çağırıyor",
    kayitKaynagi.includes("satisCikisMaliyeti(kalem.stockMovements)") &&
      kayitKaynagi.includes("komisyonToplami(kalem.fees)") &&
      kayitKaynagi.includes("fifoMaliyeti(dagitim.dagitim)"),
  );

  /** Kısmi hasarlı önizleme satırı — kullanıcının istediği kilit. */
  const kismi = iadeEtkisiHesapla({
    returnType: "NORMAL",
    kalemler: [
      {
        satilanAdet: 2,
        iadeAdedi: 2,
        saglamAdet: 1,
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
  kontrol(
    "kısmi hasarlıda DÖNMEYEN satırı önizlemede GÖRÜNÜR",
    kismi.kalemSatirlari[0].some(
      (s) => s.code === "MALIYET_DONMEYEN" && s.tutar !== 0,
    ),
  );
  yakin(
    "  ...tutarı hasarlı adede düşen pay (2 adetin 1'i)",
    satir(kismi.kalemSatirlari[0], "MALIYET_DONMEYEN"),
    -800,
  );
  yakin(
    "  ...tutarı sıfır",
    satir(hasarsiz.kalemSatirlari[0], "MALIYET_DONMEYEN"),
    0,
  );
  // Canlı vakanın kendisi: açık sıfır eklemek TOPLAMI değiştirmemeli.
  yakin("canlı TY vakası NET-1 etkisi", th.net1Etkisi, -2678.62);
  yakin("canlı TY vakası NET-2 etkisi", th.net2Etkisi, -2228.04);

  /**
   * ══════════════════════════════════════════════════════════════════════
   *  ALTIN SENARYO — DEĞİŞİMDE CİRO DURUR
   *  _Kullanıcı teyidi 13.08.2026._
   * ----------------------------------------------------------------------
   *  Pazaryeri değişimde siparişi AÇIK tutar ve para SATICIDA KALIR.
   *  Dolayısıyla değişim ile iade AYNI ŞEY DEĞİLDİR:
   *
   *      İADE   → ciro DÜŞER, komisyon geri gelir
   *      DEĞİŞİM→ ciro DURUR, komisyon durur; tek gider git-gel kargo
   *
   *  ESKİ DAVRANIŞ YANLIŞTI: değişim "NORMAL iade" sayılıyordu ve
   *  2.980 TL'lik bir değişimde satış ayakta olmasına rağmen 2.980 TL
   *  gelir kaybı yazılıyordu. Aynı senaryoda NET-1 −2.828,62 çıkıyordu;
   *  doğrusu −313,00. Kanal marjını olduğundan 2.515 TL kötü gösteren
   *  SESSİZ bir hataydı — mevcut değişim testleri yalnız DEGISIM_MALIYET
   *  satırına baktığı için yakalanmamıştı.
   *
   *  Bu blok o hatanın geri gelmesini engeller: yokluğu OLMASI gereken
   *  satırlar kadar önemlidir, o yüzden ayrı ayrı kontrol edilir.
   * ══════════════════════════════════════════════════════════════════════
   */
  {
    const dg = iadeEtkisiHesapla({
      returnType: "NORMAL",
      kalemler: [
        {
          satilanAdet: 1,
          iadeAdedi: 1,
          saglamAdet: 1, // eski mal sağlam döndü, stoğa girdi
          satisTutari: 2980,
          maliyet: 1799,
          kdvOrani: 20,
          komisyon: 439.55,
          degisimMaliyeti: 1799, // yerine giden ürün, FIFO'dan
        },
      ],
      odemeGideri: 0,
      siparisToplami: 2980,
      iadeKargosu: 163,
      yenidenGonderimKargosu: 150,
      ceza: null,
    });

    const satirlari = dg.kalemSatirlari[0];
    const varMi = (kod: string) => satirlari.some((s) => s.code === kod);

    // --- CİRO TARAFI HİÇ DOKUNULMAMALI ---
    kontrol("değişim: KAYIP_GELIR YAZILMAZ", !varMi("KAYIP_GELIR"));
    kontrol("değişim: KOMISYON_IADE YAZILMAZ", !varMi("KOMISYON_IADE"));
    kontrol("değişim: STOPAJ_IADE YAZILMAZ", !varMi("STOPAJ_IADE"));
    kontrol("değişim: ODEME_GIDERI_IADE YAZILMAZ", !varMi("ODEME_GIDERI_IADE"));

    // --- MAL TARAFI İŞLER: eski mal döner ---
    yakin("değişim: eski malın maliyeti geri", satir(satirlari, "MALIYET_GERI"), 1799);
    /**
     * ⚠ BEKLENTİ ÇEVRİLDİ — K36a, 23.08.2026. ESKİ İDDİA SİLİNMEDİ:
     *     yakin("değişim: yeni malın maliyeti gider", …"DEGISIM_MALIYET", -1799)
     * Yeni malın maliyetinin GİDER olduğu doğruydu; YERİ yanlıştı.
     *
     * MİMAR KARARI: değişim maliyeti SATIŞIN NET'ine yazılır, iadenin değil.
     * _Gerekçe: değişim o satışı kurtarmanın bedelidir; ayrı cebe konursa
     * satış kârlı görünür, değildir._ Hurdadan farkı: hurdada satış ÖLDÜ
     * (dönem kalemi), değişimde satış YAŞIYOR (satışın maliyeti).
     *
     * ⚠ ÇİFT SAYIM KONTROLÜ — MİMARIN İSTEDİĞİ SENARYO. `EXCHANGE_OUT`
     * hareketi artık `saleItemId` taşıyor ve `kalemMaliyeti` tip bakmadan
     * topluyor; maliyet satışın NET'ine oradan giriyor. Bu satır geri
     * gelirse AYNI LİRA İKİ KEZ sayılır — bir kez harekette, bir kez burada.
     */
    kontrol(
      "değişim maliyeti İADEDE YAZILMAZ (satışın NET'ine gider — çift sayım kapısı)",
      !varMi("DEGISIM_MALIYET"),
    );

    // --- TEK GERÇEK GİDER: GİT-GEL KARGO ---
    yakin("değişim: iade kargosu", satir(dg.genelSatirlar, "IADE_KARGO"), -163);
    yakin(
      "değişim: yeniden gönderim kargosu",
      satir(dg.genelSatirlar, "YENIDEN_GONDERIM_KARGO"),
      -150,
    );

    /**
     * ⚠ NET BEKLENTİLERİ K36a İLE DEĞİŞTİ — eski değerler yorumda duruyor ki
     * fark okunabilsin:
     *     net1Etkisi −313      → +1486   (fark tam +1799 = malın maliyeti)
     *     net2Etkisi −260,83   → +1538,17
     *
     * İadenin NET'i ARTTI çünkü malın maliyeti artık burada yazılmıyor;
     * aynı 1799 satışın NET'inde eksiliyor. Toplam etki değişmedi, YERİ
     * değişti. İki rakamın toplamı korunuyor: −313 + 1799 = 1486.
     */
    yakin("değişim NET-1 (maliyet satışa taşındı)", dg.net1Etkisi, 1486);
    yakin("değişim NET-2 (maliyet satışa taşındı)", dg.net2Etkisi, 1538.17);

    // Aynı senaryo İADE olsaydı (değişim ürünü yok) ciro düşerdi —
    // iki davranışın FARKLI olduğu burada kilitlenir.
    const iadeHali = iadeEtkisiHesapla({
      returnType: "NORMAL",
      kalemler: [
        {
          satilanAdet: 1,
          iadeAdedi: 1,
          saglamAdet: 1,
          satisTutari: 2980,
          maliyet: 1799,
          kdvOrani: 20,
          komisyon: 439.55,
          degisimMaliyeti: null, // DEĞİŞİM YOK — gerçek iade
        },
      ],
      odemeGideri: 0,
      siparisToplami: 2980,
      iadeKargosu: 163,
      yenidenGonderimKargosu: null,
      ceza: null,
    });
    kontrol(
      "iade: KAYIP_GELIR YAZILIR (değişimle aynı olmadığının kanıtı)",
      iadeHali.kalemSatirlari[0].some((s) => s.code === "KAYIP_GELIR"),
    );
    // Bulanık eşik yerine KESİN rakam: ikisinin ne olduğu da yazılı kalsın.
    //   iade   : -2980 gelir +439,55 komisyon +24,83 stopaj +1799 maliyet
    //            -163 kargo  =  -879,62
    //   değişim: yalnız git-gel kargo         =  -313,00
    yakin("aynı olayın İADE hâli", iadeHali.net1Etkisi, -879.62);
    kontrol(
      "iade ile değişim aynı sonucu VERMEZ (fark 566,62 TL)",
      Math.abs(iadeHali.net1Etkisi - dg.net1Etkisi) > 500,
    );
  }

  /**
   * ⚠ ÇİFT SAYIM KAPISI — HER İKİ SENARYODA DA. Eski iddia şuydu:
   *     "değişim maliyeti gider"           → DEGISIM_MALIYET = −900
   *     "DISPUTED'da da değişim maliyeti gider" → DEGISIM_MALIYET = −900
   *
   * K36a ile maliyet SATIŞIN NET'ine taşındı (`EXCHANGE_OUT` + `saleItemId`).
   * İki senaryo AYRI AYRI sınanıyor: yalnız birine bakan bir kontrol,
   * ötekine satırı geri koyan bir mutasyonu kaçırırdı.
   */
  for (const [ad, tip] of [
    ["NORMAL", "NORMAL"],
    ["DISPUTED", "DISPUTED"],
  ] as [string, "NORMAL" | "DISPUTED"][]) {
    const cift = iadeEtkisiHesapla(
      lego({
        returnType: tip,
        kalemler: [{ ...lego().kalemler[0], degisimMaliyeti: 900 }],
      }),
    );
    kontrol(
      `${ad}: değişim maliyeti iadede YAZILMAZ (çift sayım kapısı)`,
      !cift.kalemSatirlari[0].some((x) => x.code === "DEGISIM_MALIYET"),
    );
  }

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
//  5b) İADE SEBEBİ EKRANDA ÇİZİLİYOR MU — ZİNCİR HALKA HALKA
// ---------------------------------------------------------------------------
//  ⛔ BU BÖLÜM BİR CANLI KUSURDAN DOĞDU (02.09.2026). `Return.note`
//  aylardır YAZILIYORDU (iade formu, sonra K136a'nın 8 kaydı) ama
//  **hiçbir ekran OKUMUYORDU**: `IadeGorunumu` tipinde alan yoktu,
//  dolayısıyla sayfa onu eşlemiyor ve bileşen çizmiyordu. Halil satış
//  detayına baktı ve sebebi bulamadı.
//
//  ⚠ VE ÜÇ HALKA DA AYRI SINANIYOR. Sadece "bileşen `note` çiziyor mu"
//  diye sorsaydım, sayfa eşlemesi koptuğunda ölçüt YEŞİL kalırdı —
//  bileşen doğru, girdisi boş. Tam da gider formunda yaşanan şey.
//  _(Anayasa: "zincir, halkalarının varlığıyla değil BAĞLANTISIYLA
//  sınanır"; "şemadaki alan da bir iddiadır — yazıcısı olup okuyucusu
//  olmayan alan boş vaattir".)_
// ===========================================================================
function iadeNotuEkranda() {
  console.log("\n5b) İADE SEBEBİ EKRANDA ÇİZİLİYOR MU");

  /**
   * ⚠ YORUM SATIRLARI SİLİNİYOR. Bir davranışı ANLATAN yorum, o davranış
   * kaldırılsa bile deseni ayakta tutar — ve bu dosyada davranışı anlatan
   * uzun yorumlar VAR (yukarıdaki blok dâhil).
   */
  const yorumsuz = (m: string) =>
    m.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  const bilesen = yorumsuz(
    readFileSync("src/components/iade-blogu.tsx", "utf8"),
  );
  const sayfa = yorumsuz(
    readFileSync("src/app/satislar/[id]/page.tsx", "utf8"),
  );

  /** ① TİP HALKASI — görünüm tipi alanı taşıyor mu. */
  kontrol(
    "① IadeGorunumu `note` alanını taşıyor",
    /export type IadeGorunumu = \{[\s\S]{0,600}?\bnote: string \| null;/.test(
      bilesen,
    ),
  );

  /**
   * ② EŞLEME HALKASI — sayfa alanı DOLDURUYOR mu.
   *
   * ⚠ DESEN `note:` DEĞİL `note: i.note` — çünkü `note:` bu dosyada
   * BAŞKA yerde de geçiyor (satışın kendi notu). Ada değil KULLANIMA
   * bağlanıyor, ve `iadeler` eşleme bloğuna daraltılıyor.
   */
  const esleme = bilesenBloku(
    sayfa,
    "const iadeler: IadeGorunumu[] = satis.returns.map",
    700,
  );
  kontrol(
    "② sayfa `note: i.note` ile eşlemeyi DOLDURUYOR",
    /\bnote: i\.note\b/.test(esleme),
  );

  /**
   * ③ ÇİZİM HALKASI — KOŞUL, SÖZLÜK ANAHTARI VE DEĞER TEK DESENDE.
   *
   * ⚠ Üçü ayrı ayrı aransaydı, render koşulunu `{false ? (` yapan bir
   * mutasyon dalı hiç çizmezdi ama üç desen de dosyada KALIRDI ve ölçüt
   * yeşil yanardı — bu deponun en sık tekrarlayan yalancı yeşili.
   * `iade.note` zaten İKİ yerde geçiyor (koşul + gövde); tek başına
   * aranması yetmez.
   */
  kontrol(
    "③ çizim: koşul → sözlük anahtarı → değer TEK zincirde",
    /\{iade\.note \? \([\s\S]{0,400}?t\("kayitNotu"\)[\s\S]{0,200}?\{iade\.note\}/.test(
      bilesen,
    ),
  );

  /** ④ SÖZLÜK HALKASI — anahtar İKİ dilde de var mı (biri boş iskelet). */
  for (const dosya of ["messages/tr.json", "messages/en.json"]) {
    const sozluk = JSON.parse(readFileSync(dosya, "utf8")) as {
      Iade?: Record<string, string>;
    };
    kontrol(
      `④ ${dosya} → Iade.kayitNotu tanımlı`,
      sozluk.Iade !== undefined && "kayitNotu" in sozluk.Iade,
    );
  }
}

/**
 * Bir çapadan başlayıp `uzunluk` karakterlik pencere keser.
 *
 * ⚠ PENCERE ÖLÇÜLDÜ, TAHMİN EDİLMEDİ: `iadeler` eşleme bloğu bugün 430
 * karakter; 700 seçildi ki blok büyüyünce ölçüt sessizce körelmesin.
 * Çapa bulunamazsa BOŞ döner ve ölçüt kırmızı yanar — "bulamadım" ile
 * "yok" ayrışsın diye.
 */
function bilesenBloku(metin: string, capa: string, uzunluk: number): string {
  const i = metin.indexOf(capa);
  return i < 0 ? "" : metin.slice(i, i + uzunluk);
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

    /** ═══ TAZMİNAT TAHSİLATI (04.09.2026 — Halil: faturalı, KDV'li) ═══ */
    {
      const tazTemel = {
        returnType: "NORMAL" as const,
        odemeGideri: 0,
        siparisToplami: 1000,
        iadeKargosu: null,
        yenidenGonderimKargosu: null,
        ceza: null,
        kalemler: [{
          satilanAdet: 1, iadeAdedi: 1, saglamAdet: 0,
          satisTutari: 1000, maliyet: 600, kdvOrani: 20,
          komisyon: 0, degisimMaliyeti: null,
        }],
      };
      const tazsiz = iadeEtkisiHesapla(tazTemel);
      const tazli = iadeEtkisiHesapla({
        ...tazTemel,
        tazminatTahsilati: { tutar: 1200, kdvOrani: 20 },
      });
      kontrol(
        "tazminat: TAZMINAT_TAHSILATI satırı doğar (+tutar)",
        tazli.genelSatirlar.some(
          (x) => x.code === "TAZMINAT_TAHSILATI" && Math.abs(x.tutar - 1200) < 0.005,
        ),
      );
      kontrol(
        "tazminatsız girdide satır DOĞMAZ (eski davranış birebir)",
        !tazsiz.genelSatirlar.some((x) => x.code === "TAZMINAT_TAHSILATI"),
      );
      kontrol(
        "tazminat NET-1'e TAM girer",
        Math.abs(tazli.net1Etkisi - tazsiz.net1Etkisi - 1200) < 0.005,
      );
      kontrol(
        "tazminat KDV'si ÖDENECEK KDV'yi ARTIRIR (fatura kesildi: 1200@%20 → 200)",
        Math.abs(tazli.odenecekKdvDegisimi - tazsiz.odenecekKdvDegisimi - 200) < 0.005,
      );
      kontrol(
        "tazminat NET-2 etkisi = tutar − KDV (1000)",
        Math.abs(tazli.net2Etkisi - tazsiz.net2Etkisi - 1000) < 0.005,
      );
    }

    /** ═══ TARİHSEL İADE KİPİ (03.09.2026) — V2 baz iadeleri için ═══
     *  Saf kontrol DEĞER testiyle; stok bloğu kapıları KULLANIM YERİNE
     *  bağlı kaynak ölçütüyle (ada değil, satırın kendisine). */
    kontrol(
      "tarihsel kip: kip yokken kontrol susar",
      tarihselKipKontrol({ kalemler: [{ exchangeVariantId: null }] }) === null,
    );
    kontrol(
      "tarihsel kip: gerekçeli + değişimsiz GEÇERLİ",
      tarihselKipKontrol({
        stokYazilmaz: { gerekce: "V2 baz — stok sayımca kapatıldı" },
        kalemler: [{ exchangeVariantId: null }],
      }) === null,
    );
    kontrol(
      "tarihsel kip: GEREKÇESİZ reddedilir",
      tarihselKipKontrol({
        stokYazilmaz: { gerekce: "  " },
        kalemler: [{ exchangeVariantId: null }],
      }) !== null,
    );
    kontrol(
      "tarihsel kip: DEĞİŞİM reddedilir (stok ister)",
      tarihselKipKontrol({
        stokYazilmaz: { gerekce: "x" },
        kalemler: [{ exchangeVariantId: "v1" }],
      }) !== null,
    );
    kontrol(
      "tarihsel kip: YANLIŞ ÜRÜN reddedilir (düzeltme stok ister)",
      tarihselKipKontrol({
        stokYazilmaz: { gerekce: "x" },
        kalemler: [{ exchangeVariantId: null, donenVaryantId: "v2" }],
      }) !== null,
    );
    {
      const motor = readFileSync("src/lib/iade.ts", "utf8");
      /** RETURN_IN kapısı — desen SATIRIN KENDİSİ, ad değil. */
      kontrol(
        "tarihsel kip: RETURN_IN bloğu stokYazilmaz kapılı",
        motor.includes(
          '} else if (!girdi.stokYazilmaz && girdi.returnType !== "DISPUTED" && g.saglamAdet > 0) {',
        ),
      );
      /** Sayım kapısı yön haritası — SAYIM KAPISI bloğuna daraltılmış. */
      const sayimBasi = motor.indexOf("═══ SAYIM KAPISI ═══");
      const sayimSonu = motor.indexOf("═══ DÖNEM KAPISI");
      kontrol(
        "tarihsel kip: sayım yön haritası stokYazilmaz kapılı (blok içinde)",
        sayimBasi > 0 &&
          sayimSonu > sayimBasi &&
          motor.slice(sayimBasi, sayimSonu).includes("if (!girdi.stokYazilmaz) {"),
      );
      /** Giriş kontrolü — çağrı + fırlatma birlikte, iadeKaydet gövdesinde. */
      const kaydetBasi = motor.indexOf("export async function iadeKaydet");
      kontrol(
        "tarihsel kip: iadeKaydet girişte tarihselKipKontrol çağırıp fırlatıyor",
        kaydetBasi > 0 &&
          motor
            .slice(kaydetBasi, kaydetBasi + 1200)
            .includes("const kipHatasi = tarihselKipKontrol(girdi);") &&
          motor
            .slice(kaydetBasi, kaydetBasi + 1200)
            .includes("if (kipHatasi) throw new Error(kipHatasi);"),
      );
    }

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

/**
 * ⚠ ÖZET VE ÇIKIŞ KODUNDAN **ÖNCE** KOŞUYOR. Özet `cezaTesti()`in
 * `finally` bloğunda; buraya sonradan eklenen bir ölçüt oraya YETİŞMEZSE
 * sayacı artırır ama kimse okumaz — 30.08.2026'da `uyari:dogrula`da tam
 * bu oldu ve üç mutasyon yeşil geçti.
 * _(Anayasa: "ölçüt bloğu, özet ve çıkış kodundan önce koşar".)_
 */
iadeNotuEkranda();

void cezaTesti();
