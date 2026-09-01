import { aylikMarj, aylikSeri } from "../src/lib/panel";

/**
 * ============================================================================
 *  AYLIK ORTALAMA MARJ BEKÇİSİ (K117, 31.08.2026)
 * ----------------------------------------------------------------------------
 *      npm run aylik-marj:dogrula
 *
 *  ⛔ NİYE: bu gövde panelde bir YÜZDE basıyor ve yüzdeler en sinsi
 *  rakamlardır — payda yanlış olsa bile sonuç "makul" görünür ve kimse
 *  sorgulamaz.
 *
 *  ⭐ KAYNAK TARAMASI YOK — saf gövde ÇAĞRILIP değeri ölçülüyor.
 * ============================================================================
 */

const BOLUM_SAYISI = 5;
const kosanBolumler: string[] = [];
let gecen = 0;
let kalan = 0;

function yakin(ad: string, olculen: unknown, beklenen: unknown) {
  const a = JSON.stringify(olculen);
  const b = JSON.stringify(beklenen);
  if (a === b) gecen += 1;
  else {
    kalan += 1;
    console.log(`  HATA  ${ad}`);
    console.log(`      beklenen: ${b}`);
    console.log(`      ölçülen : ${a}`);
  }
}

console.log("\nAYLIK MARJ BEKÇİSİ");
console.log("=".repeat(60));

// --- 1) TEMEL HESAP ------------------------------------------------------
console.log("\n1) temel — NET-2 ÷ net ciro");
{
  yakin(
    "iade yok → NET-2 / ciro",
    aylikMarj({ net2: 250, hesaplananGelir: 1000, hesaplananIadeTutari: 0 }),
    25,
  );
  /**
   * ⚠ ÖRNEK VERİ AYRIMI GÖSTERİYOR: iade SIFIR DEĞİL. Sıfır olsaydı
   * paydadan iadeyi düşmeyi unutan bir mutasyon YEŞİL kalırdı.
   *   250 / (1000 − 200) = %31,25   ← doğru
   *   250 / 1000         = %25,00   ← iade düşülmezse
   */
  yakin(
    "iade PAYDADAN düşülür",
    aylikMarj({ net2: 250, hesaplananGelir: 1000, hesaplananIadeTutari: 200 }),
    31.25,
  );
  yakin(
    "negatif NET-2 → negatif marj",
    aylikMarj({ net2: -100, hesaplananGelir: 1000, hesaplananIadeTutari: 0 }),
    -10,
  );
}
kosanBolumler.push("temel");

// --- 2) PAYDA "gelir" DEĞİL, "hesaplananGelir" --------------------------
console.log("\n2) payda yalnız hesaplanabilmiş ciro");
{
  /**
   * ⛔ ASIL KURAL. `hesaplananGelir` alanı YOKSA gövde derlenmez; burada
   * ölçülen şey, hesaplanamayan satışın paydaya GİRMEDİĞİ.
   *
   * Kurgu: ayın brüt cirosu 2000, ama yarısı kârı hesaplanamayan satış →
   * `hesaplananGelir` 1000. Marj 1000 üstünden hesaplanmalı (%25),
   * 2000 üstünden değil (%12,5).
   */
  yakin(
    "hesaplanamayan satış paydayı BÜYÜTMEZ",
    aylikMarj({ net2: 250, hesaplananGelir: 1000, hesaplananIadeTutari: 0 }),
    25,
  );
  /** ⚠ AYRIMIN ÖTEKİ YAKASI: hepsi hesaplanmışsa payda tam ciro. */
  yakin(
    "hepsi hesaplanmış → payda tam ciro",
    aylikMarj({ net2: 250, hesaplananGelir: 2000, hesaplananIadeTutari: 0 }),
    12.5,
  );
}
kosanBolumler.push("payda");

// --- 3) SIFIR VE NEGATİF PAYDA — HÜKÜM YOK ------------------------------
console.log("\n3) sıfır ve negatif payda");
{
  /**
   * ⛔ SATIŞI OLMAYAN AY "%0 MARJ" YAPMAZ. Sıfır "ölçtüm, sıfır çıktı"
   * demektir ve grafikte tabana yapışan sahte bir nokta üretirdi.
   */
  yakin(
    "hiç satış yok → null (0 DEĞİL)",
    aylikMarj({ net2: 0, hesaplananGelir: 0, hesaplananIadeTutari: 0 }),
    null,
  );
  /**
   * ⛔ NEGATİF PAYDAYLA BÖLÜNMEZ. İadesi satışından büyük bir ayda bölüm
   * işareti TERS çevirir ve ZARARI KÂR gibi gösterirdi.
   *   −100 / (500 − 800) = +%33  ← ZARAR, KÂR GİBİ GÖRÜNÜR
   */
  yakin(
    "iade satıştan büyük → null, ters işaret ÜRETİLMEZ",
    aylikMarj({ net2: -100, hesaplananGelir: 500, hesaplananIadeTutari: 800 }),
    null,
  );
  yakin(
    "iade tam satış kadar → payda 0 → null",
    aylikMarj({ net2: 50, hesaplananGelir: 500, hesaplananIadeTutari: 500 }),
    null,
  );
}
kosanBolumler.push("sıfır ve negatif");

// --- 4) KURUŞ VE ORAN ----------------------------------------------------
console.log("\n4) oran yüzde olarak dönüyor");
{
  /**
   * ⚠ ÇIKTI YÜZDE DEĞERİ (12.5), KESİR DEĞİL (0.125). `bicim.yuzde`
   * girdiyi yüzde bekliyor; kesir dönseydi ekranda %0,1 yazardı.
   */
  yakin(
    "yüzde değeri döner, kesir değil",
    aylikMarj({ net2: 125, hesaplananGelir: 1000, hesaplananIadeTutari: 0 }),
    12.5,
  );
}
kosanBolumler.push("oran");

// --- 5) UÇTAN UCA — aylikSeri → aylikMarj ------------------------------
console.log("\n5) uçtan uca — toplama gövdesiyle birlikte");
{
  /**
   * ⛔ BU BÖLÜM ÜÇ MUTASYON KAÇTIĞI İÇİN EKLENDİ.
   *
   * Üstteki bölümler `aylikMarj`ı ELDEN besliyordu ve gövde doğru
   * davranıyordu — ama marjın PAYDASINI dolduran yer `aylikSeri`. O
   * toplamayı bozan üç mutasyon (paydayı hiç doldurmayan · payı ve paydayı
   * ayrı dallara bölen · iade paydasını hesaplanamayanlarla dolduran)
   * hepsi YEŞİL geçti: iki halka ayrı ayrı doğruydu, aradaki bağ
   * sınanmamıştı.
   * _(Anayasa: "iki halka ayrı ayrı doğru olabilir — aradaki bağ yanlış".)_
   */
  const AY = { yil: 2026, ay: 8 };
  const gun = new Date(Date.UTC(2026, 7, 15));
  const ortak = {
    kanalKodu: "TY",
    kanalAdi: "Trendyol",
    hesapId: "hesap-axcali",
    hesapAdi: "AXCALI",
    tarih: gun,
    paraBirimi: "TRY" as const,
    kdv: 0,
    kargoTarihi: null,
    importKaynak: null,
    shipmentCode: null,
  };

  /**
   * ⚠ ÖRNEK VERİ AYRIMIN İKİ YAKASINI GÖSTERİYOR: biri HESAPLANMIŞ, biri
   * HESAPLANAMAYAN. İkisi de hesaplanmış olsaydı payda ile brüt ciro aynı
   * çıkar ve "hesaplanamayanı paydaya katan" mutasyon yakalanamazdı.
   */
  const satislar = [
    { ...ortak, gelir: 1000, net1: 300, net2: 250, durum: "CALCULATED" as const },
    { ...ortak, gelir: 1000, net1: null, net2: null, durum: "NO_COST" as const },
  ];
  /** ⚠ İADE DE İKİ YAKALI: biri hesaplanmış, biri değil. */
  const iadeler = [
    {
      kanalKodu: "TY",
      kanalAdi: "Trendyol",
      hesapId: "hesap-axcali",
      hesapAdi: "AXCALI",
      tarih: gun,
      paraBirimi: "TRY" as const,
      net1: -60,
      net2: -50,
      durum: "CALCULATED" as const,
      iadeTutari: 200,
    },
    {
      kanalKodu: "TY",
      kanalAdi: "Trendyol",
      hesapId: "hesap-axcali",
      hesapAdi: "AXCALI",
      tarih: gun,
      paraBirimi: "TRY" as const,
      net1: null,
      net2: null,
      durum: "NO_COST" as const,
      iadeTutari: 500,
    },
  ];

  const seri = aylikSeri(satislar, AY, 1, null, "TRY", iadeler);
  const nokta = seri[0];
  if (nokta === undefined) {
    kalan += 1;
    console.log("  HATA  uçtan uca — seri boş döndü");
  } else {
    /** Payda: yalnız hesaplanmış satış (1000) − yalnız hesaplanmış iade (200). */
    yakin("payda hesaplanmış ciro", nokta.hesaplananGelir, 1000);
    yakin("payda hesaplanmış iade", nokta.hesaplananIadeTutari, 200);
    yakin("brüt ciro İKİSİNİ de sayar", nokta.gelir, 2000);
    yakin("brüt iade İKİSİNİ de sayar", nokta.iadeTutari, 700);
    /**
     * marj = (250 − 50) / (1000 − 200) = 200 / 800 = %25
     * ⚠ Brüt ciroya bölünseydi 200/2000 = %10 çıkardı — iki okuma AYRIŞIYOR.
     */
    yakin("uçtan uca marj", aylikMarj(nokta), 25);
  }
}
kosanBolumler.push("uçtan uca");

console.log("\n" + "=".repeat(60));
if (kosanBolumler.length !== BOLUM_SAYISI) {
  console.log(
    `KOŞUM YARIM KALDI — ${kosanBolumler.length}/${BOLUM_SAYISI} bölüm. Sonuç GEÇERSİZ.`,
  );
  process.exit(1);
}
if (kalan === 0) {
  console.log(`OK  ${gecen}/${gecen} ölçüt geçti (${BOLUM_SAYISI} bölüm)`);
  process.exit(0);
}
console.log(`${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrolden)`);
process.exit(1);
