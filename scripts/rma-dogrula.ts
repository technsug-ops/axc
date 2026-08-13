/**
 * ============================================================================
 *  RMA DOĞRULAMA — BİLDİRİM DURUM MAKİNESİ + 6. SENARYO DEFTERİ
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run rma:dogrula
 *
 *  Veritabanına GİTMEZ. İki bölüm:
 *  1) BİLDİRİM — izinli geçişler, "iadeyi işle" kapısı, ayrılmış stok.
 *  2) 6. SENARYO — beş hareketlik defter planı ve MALİYET KİLİDİ.
 *
 *  ODAK: SESSİZ YANLIŞ DEFTER. Bu modülün en tehlikeli hatası patlamak
 *  değil, makul görünen ama yanlış bir stok/maliyet yazmaktır — mal gelmeden
 *  iade işlemek, kazanılmış itirazdan sonra ciroyu düşürmek, ya da düzeltme
 *  partisini maliyetsiz doğurup kâr motorunu NO_COST'a düşürmek.
 * ============================================================================
 */

import {
  ayrilmisAdetler,
  degisimAyrilirMi,
  gecisGecerliMi,
  iadeIslenebilirMi,
  itirazAcilabilirMi,
  kapaliMi,
  kapanistaIadeDogarMi,
} from "../src/lib/iade/bildirim";
import {
  maliyetKilidiTutuyorMu,
  yanlisUrunPlani,
  type PartiDusumu,
  type YanlisUrunGirdisi,
} from "../src/lib/iade/yanlis-urun";

let basarisiz = 0;
let calisan = 0;
const BOLUM_SAYISI = 2;
const kosanBolumler: string[] = [];

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

// ===========================================================================
console.log("\n1) BİLDİRİM — DURUM MAKİNESİ");
// ===========================================================================
{
  kontrol("BEKLENIYOR -> MAL_GELDI", gecisGecerliMi("BEKLENIYOR", "MAL_GELDI"));
  kontrol("BEKLENIYOR -> IPTAL (müşteri vazgeçti)", gecisGecerliMi("BEKLENIYOR", "IPTAL"));
  /**
   * MAL GELDİKTEN SONRA İPTAL YOK: mal elimizde, "hiç olmadı" sayılamaz.
   * İzin verilse depoya girmiş bir ürün defterde hiç görünmezdi.
   */
  kontrol("MAL_GELDI -> IPTAL REDDEDİLİR", !gecisGecerliMi("MAL_GELDI", "IPTAL"));
  kontrol("MAL_GELDI -> ITIRAZ_ACILDI", gecisGecerliMi("MAL_GELDI", "ITIRAZ_ACILDI"));
  kontrol("MAL_GELDI -> KAPANDI", gecisGecerliMi("MAL_GELDI", "KAPANDI"));
  kontrol(
    "BEKLENIYOR -> KAPANDI REDDEDİLİR (mal gelmeden kapanmaz)",
    !gecisGecerliMi("BEKLENIYOR", "KAPANDI"),
  );
  kontrol("ITIRAZ_ACILDI -> ITIRAZ_INCELEMEDE", gecisGecerliMi("ITIRAZ_ACILDI", "ITIRAZ_INCELEMEDE"));
  kontrol("ITIRAZ_INCELEMEDE -> ITIRAZ_KABUL", gecisGecerliMi("ITIRAZ_INCELEMEDE", "ITIRAZ_KABUL"));
  kontrol("ITIRAZ_INCELEMEDE -> ITIRAZ_RED", gecisGecerliMi("ITIRAZ_INCELEMEDE", "ITIRAZ_RED"));
  kontrol("KAPANDI kapalı (geri açılamaz)", kapaliMi("KAPANDI"));
  kontrol("IPTAL kapalı", kapaliMi("IPTAL"));
  kontrol("KAPANDI -> MAL_GELDI REDDEDİLİR", !gecisGecerliMi("KAPANDI", "MAL_GELDI"));

  // --- "İADEYİ İŞLE" KAPISI ---
  kontrol("MAL_GELDI'de iade işlenebilir", iadeIslenebilirMi("MAL_GELDI"));
  kontrol("ITIRAZ_RED'de iade işlenebilir (itiraz kaybedildi)", iadeIslenebilirMi("ITIRAZ_RED"));
  /**
   * EN KRİTİK İKİ KAPALILIK:
   *  - BEKLENIYOR: mal gelmeden iade işlemek, gelmemiş malı stoğa sokar.
   *  - ITIRAZ_KABUL: itiraz KAZANILDI, ürün müşteride kaldı, para bizde.
   *    Burada iade işlenirse ciro haksız yere düşer ve kâr yanlış olur.
   */
  kontrol("BEKLENIYOR'da iade İŞLENEMEZ", !iadeIslenebilirMi("BEKLENIYOR"));
  kontrol("ITIRAZ_KABUL'de iade İŞLENEMEZ", !iadeIslenebilirMi("ITIRAZ_KABUL"));
  kontrol("KAPANDI'da iade İŞLENEMEZ", !iadeIslenebilirMi("KAPANDI"));
  kontrol(
    "lehe kapanışta Return DOĞMAZ",
    !kapanistaIadeDogarMi("ITIRAZ_KABUL"),
  );
  kontrol("aleyhe kapanışta Return DOĞAR", kapanistaIadeDogarMi("ITIRAZ_RED"));

  // --- İTİRAZ ANCAK MAL ELDEYKEN ---
  kontrol("itiraz MAL_GELDI'de açılır", itirazAcilabilirMi("MAL_GELDI"));
  kontrol(
    "itiraz BEKLENIYOR'da AÇILAMAZ (görmediğimiz malı kullanılmış ilan etmek)",
    !itirazAcilabilirMi("BEKLENIYOR"),
  );

  // --- AYRILMIŞ STOK: AÇIK BİLDİRİMLERDEN ANLIK ---
  const ayrilmis = ayrilmisAdetler([
    { durum: "BEKLENIYOR", reservedVariantId: "v1", reservedQuantity: 1 },
    { durum: "MAL_GELDI", reservedVariantId: "v1", reservedQuantity: 2 },
    { durum: "ITIRAZ_INCELEMEDE", reservedVariantId: "v2", reservedQuantity: 1 },
    // Kapanmışlar sayılmaz — rozet kendiliğinden düşer.
    { durum: "KAPANDI", reservedVariantId: "v1", reservedQuantity: 5 },
    { durum: "IPTAL", reservedVariantId: "v1", reservedQuantity: 3 },
    // Lehe kapanan itirazda değişim gönderilmiyor.
    { durum: "ITIRAZ_KABUL", reservedVariantId: "v2", reservedQuantity: 4 },
    // Varyant seçilmemiş bildirim sayılmaz.
    { durum: "BEKLENIYOR", reservedVariantId: null, reservedQuantity: 2 },
  ]);
  kontrol("v1 için ayrılmış 3 (1+2)", ayrilmis.get("v1") === 3, ayrilmis.get("v1"));
  kontrol("v2 için ayrılmış 1 (ITIRAZ_KABUL sayılmadı)", ayrilmis.get("v2") === 1, ayrilmis.get("v2"));
  kontrol("kapanmış bildirimler toplamda YOK", (ayrilmis.get("v1") ?? 0) < 5);

  // --- DEĞİŞİM GEREKÇELERİ ---
  kontrol("DEGISIM ayırma ister", degisimAyrilirMi("DEGISIM"));
  kontrol("YANLIS_URUN ayırma ister (6. senaryo)", degisimAyrilirMi("YANLIS_URUN"));
  kontrol("CAYMA ayırma İSTEMEZ (hüküm mal gelince)", !degisimAyrilirMi("CAYMA"));
  kosanBolumler.push("bildirim");
}

// ===========================================================================
console.log("\n2) 6. SENARYO — YANLIŞ ÜRÜN DEFTERİ");
// ===========================================================================
{
  /**
   * GERÇEKÇİ RAKAMLAR: A (satılan) 1.799,00 maliyetli partiden düşmüş;
   * B (yanlış giden) 1.250,50 maliyetli partiden çıkacak.
   */
  const aSatis: PartiDusumu = {
    partiHareketId: "parti-A1",
    adet: 1,
    birimMaliyet: "1799.0000",
    paraBirimi: "TRY",
  };
  const aDegisim: PartiDusumu = {
    partiHareketId: "parti-A2",
    adet: 1,
    birimMaliyet: "1750.0000",
    paraBirimi: "TRY",
  };
  const bCikis: PartiDusumu = {
    partiHareketId: "parti-B1",
    adet: 1,
    birimMaliyet: "1250.5000",
    paraBirimi: "TRY",
  };

  const girdi: YanlisUrunGirdisi = {
    satilanVaryantId: "A",
    donenVaryantId: "B",
    satisDusumleri: [aSatis],
    degisimDusumleri: [aDegisim],
    yanlisGidenDusumleri: [bCikis],
    saglamAdet: 1,
  };

  const plan = yanlisUrunPlani(girdi);
  kontrol("plan hatasız kuruldu", plan.hatalar.length === 0, plan.hatalar);
  kontrol("dört yeni hareket yazılır", plan.hareketler.length === 4, plan.hareketler.length);

  /**
   * MİMAR KİLİDİ 1 — DEFTER NETİ.
   * Satılan varyant −1 (bir adet gerçekten çıktı), yanlış giden 0 (hiç
   * kalıcı çıkmadı). SALE_OUT satıştan geliyor, plana dahil değil ama
   * nete SAYILIYOR.
   */
  kontrol("satılan varyant net −1", plan.defterNeti.satilan === -1, plan.defterNeti.satilan);
  kontrol("yanlış giden varyant net 0", plan.defterNeti.donen === 0, plan.defterNeti.donen);

  /**
   * MİMAR KİLİDİ 2 — MALİYET BİREBİR.
   * DÜZELTME +1'in birim maliyeti, ters çevirdiği SALE_OUT düşümünün
   * maliyetiyle KESİN AYNI olmalı. Kuruş farkı bile kabul edilmez:
   * karşılaştırma metin üzerinden yapılıyor, float yuvarlaması giremiyor.
   */
  const duzeltmeArti = plan.hareketler.find(
    (h) => h.tip === "ADJUSTMENT" && h.variantId === "A" && h.quantityDelta > 0,
  )!;
  kontrol(
    'DÜZELTME +1 maliyeti "1799.0000" (SALE_OUT ile birebir)',
    duzeltmeArti.birimMaliyet === "1799.0000",
    duzeltmeArti.birimMaliyet,
  );
  kontrol(
    "  ...ve para birimi de kopyalandı",
    duzeltmeArti.paraBirimi === "TRY",
  );
  kontrol(
    "  ...ve parti izi korunuyor (kaynak: parti-A1)",
    duzeltmeArti.kaynakHareketId === "parti-A1",
    duzeltmeArti.kaynakHareketId,
  );
  kontrol("maliyet kilidi tutuyor", maliyetKilidiTutuyorMu(girdi, plan));
  /**
   * MALİYETSİZ PARTİ DOĞMUYOR: kâr motorunun NO_COST/RULE_MISSING rozetine
   * düşmemesinin ön şartı budur — beş hareketin HİÇBİRİ maliyetsiz değil.
   */
  kontrol(
    "hiçbir hareket maliyetsiz değil (NO_COST önlendi)",
    plan.hareketler.every((h) => h.birimMaliyet !== null),
    plan.hareketler.map((h) => [h.tip, h.birimMaliyet]),
  );

  // DÜZELTMELER NEDENE systemKey İLE BAĞLI (ada değil).
  kontrol(
    "iki DÜZELTME de SEVKIYAT_HATASI nedenine bağlı",
    plan.hareketler.filter((h) => h.tip === "ADJUSTMENT").every((h) => h.sistemNedeni === "SEVKIYAT_HATASI"),
  );
  kontrol(
    "EXCHANGE_OUT ve RETURN_IN nedene bağlanmaz",
    plan.hareketler
      .filter((h) => h.tip !== "ADJUSTMENT")
      .every((h) => h.sistemNedeni === null),
  );

  // --- B HASARLI DÖNDÜ: RETURN_IN YAZILMAZ ---
  const hasarli = yanlisUrunPlani({ ...girdi, saglamAdet: 0 });
  kontrol("hasarlı dönüşte üç hareket", hasarli.hareketler.length === 3, hasarli.hareketler.length);
  kontrol(
    "hasarlı dönüşte RETURN_IN YOK",
    !hasarli.hareketler.some((h) => h.tip === "RETURN_IN"),
  );
  /**
   * Hasarlı mal stoğa girmez: B net −1 kalır ve maliyeti satıcıda kalır.
   * Bu bir kusur değil, kural — tazminat süreci ayrı işler.
   */
  kontrol("hasarlıda B net −1", hasarli.defterNeti.donen === -1, hasarli.defterNeti.donen);
  kontrol("hasarlıda A yine net −1", hasarli.defterNeti.satilan === -1);

  // --- ÇOK PARTİLİ SATIŞ: PARTİ BAŞINA AYRI DÜZELTME, KENDİ MALİYETİYLE ---
  const cokParti = yanlisUrunPlani({
    satilanVaryantId: "A",
    donenVaryantId: "B",
    satisDusumleri: [
      { partiHareketId: "p1", adet: 1, birimMaliyet: "100.0000", paraBirimi: "TRY" },
      { partiHareketId: "p2", adet: 2, birimMaliyet: "150.0000", paraBirimi: "TRY" },
    ],
    degisimDusumleri: [
      { partiHareketId: "p3", adet: 3, birimMaliyet: "160.0000", paraBirimi: "TRY" },
    ],
    yanlisGidenDusumleri: [
      { partiHareketId: "pB", adet: 3, birimMaliyet: "90.0000", paraBirimi: "TRY" },
    ],
    saglamAdet: 3,
  });
  const cokDuzeltme = cokParti.hareketler.filter(
    (h) => h.tip === "ADJUSTMENT" && h.quantityDelta > 0,
  );
  kontrol("iki partiye iki AYRI düzeltme", cokDuzeltme.length === 2, cokDuzeltme.length);
  kontrol(
    "her düzeltme KENDİ partisinin maliyetini taşır (100 ve 150)",
    cokDuzeltme[0].birimMaliyet === "100.0000" &&
      cokDuzeltme[1].birimMaliyet === "150.0000",
    cokDuzeltme.map((h) => h.birimMaliyet),
  );
  kontrol(
    "  ...ortalama maliyet YAZILMADI (125 yok)",
    !cokDuzeltme.some((h) => h.birimMaliyet === "125.0000"),
  );
  kontrol("çok partili net: A −3", cokParti.defterNeti.satilan === -3, cokParti.defterNeti.satilan);
  kontrol("çok partili net: B 0", cokParti.defterNeti.donen === 0, cokParti.defterNeti.donen);

  // --- KISMİ HASAR: 3 çıktı, 2 sağlam döndü ---
  const kismi = yanlisUrunPlani({
    satilanVaryantId: "A",
    donenVaryantId: "B",
    satisDusumleri: [
      { partiHareketId: "p1", adet: 3, birimMaliyet: "100.0000", paraBirimi: "TRY" },
    ],
    degisimDusumleri: [
      { partiHareketId: "p3", adet: 3, birimMaliyet: "100.0000", paraBirimi: "TRY" },
    ],
    yanlisGidenDusumleri: [
      { partiHareketId: "pB", adet: 3, birimMaliyet: "90.0000", paraBirimi: "TRY" },
    ],
    saglamAdet: 2,
  });
  kontrol(
    "kısmi hasarda RETURN_IN yalnız 2 adet",
    kismi.hareketler.find((h) => h.tip === "RETURN_IN")?.quantityDelta === 2,
    kismi.hareketler.find((h) => h.tip === "RETURN_IN")?.quantityDelta,
  );
  kontrol("kısmi hasarda B net −1", kismi.defterNeti.donen === -1, kismi.defterNeti.donen);

  // --- HATA YOLLARI: yarım plan yazıma gitmez ---
  const ayni = yanlisUrunPlani({ ...girdi, donenVaryantId: "A" });
  kontrol(
    "aynı varyant reddedilir (bu 6. senaryo değil)",
    ayni.hatalar.includes("AYNI_VARYANT") && ayni.hareketler.length === 0,
    ayni.hatalar,
  );

  const maliyetsiz = yanlisUrunPlani({
    ...girdi,
    satisDusumleri: [{ ...aSatis, birimMaliyet: null }],
  });
  kontrol(
    "maliyetsiz SALE_OUT planı DURDURUR (NO_COST doğmasın)",
    maliyetsiz.hatalar.includes("MALIYETSIZ_SATIS_DUSUMU") &&
      maliyetsiz.hareketler.length === 0,
    maliyetsiz.hatalar,
  );

  const uyumsuz = yanlisUrunPlani({
    ...girdi,
    degisimDusumleri: [{ ...aDegisim, adet: 2 }],
  });
  kontrol(
    "adet uyuşmazlığı reddedilir",
    uyumsuz.hatalar.includes("ADET_UYUSMUYOR"),
    uyumsuz.hatalar,
  );

  const fazlaSaglam = yanlisUrunPlani({ ...girdi, saglamAdet: 2 });
  kontrol(
    "çıkandan fazla sağlam dönüş reddedilir",
    fazlaSaglam.hatalar.includes("SAGLAM_ADET_FAZLA"),
    fazlaSaglam.hatalar,
  );
  kosanBolumler.push("6. senaryo");
}

// ===========================================================================
console.log("");
if (kosanBolumler.length !== BOLUM_SAYISI) {
  console.log(
    `KOŞUM YARIM KALDI — sonuç GEÇERSİZ (${kosanBolumler.length}/${BOLUM_SAYISI})`,
  );
  process.exit(1);
} else if (basarisiz === 0) {
  console.log(`TÜM KONTROLLER GEÇTİ (${calisan})`);
  process.exit(0);
} else {
  console.log(`${basarisiz} KONTROL BAŞARISIZ (${calisan} kontrol içinde)`);
  process.exit(1);
}
