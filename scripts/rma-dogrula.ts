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

import { readFileSync } from "node:fs";

import {
  DEGISIM_GEREKCELERI,
  IADE_ISLE_SEBEP_ANAHTARI,
  IZINLI_GECISLER,
  ayirmaMumkunMu,
  ayrilmisAdetler,
  degisimAyrilirMi,
  donenUrunZorunluMu,
  gecisGecerliMi,
  iadeIslenebilirMi,
  itirazAcilabilirMi,
  kapaliMi,
  kapanistaIadeDogarMi,
  onDoluHedefKalem,
  serbestStok,
} from "../src/lib/iade/bildirim";
import {
  EK_SINIRLARI,
  ekiDogrula,
  ekYolu,
  uzanti,
} from "../src/lib/ekler";
import {
  maliyetKilidiTutuyorMu,
  yanlisUrunPlani,
  type PartiDusumu,
  type YanlisUrunGirdisi,
} from "../src/lib/iade/yanlis-urun";

let basarisiz = 0;
let calisan = 0;
const BOLUM_SAYISI = 5;
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


  /**
   * SEBEPSİZ PASİF DÜĞME OLAMAZ (mimar kuralı 14.08.2026). Kapalı her durum
   * için sözlük anahtarı VAR, açık olanlarda YOK. Bu eşleme ekranla aynı
   * kaynaktan geliyor; boş ipuçlu bir düğme çıkarsa burada kırılır.
   */
  const durumlar = Object.keys(IZINLI_GECISLER) as (keyof typeof IZINLI_GECISLER)[];
  for (const d of durumlar) {
    const anahtar = IADE_ISLE_SEBEP_ANAHTARI[d];
    const acik = iadeIslenebilirMi(d);
    kontrol(
      `${d}: ${acik ? "açık, sebep gerekmez" : "kapalı, sebebi VAR"}`,
      acik ? anahtar === null : typeof anahtar === "string" && anahtar.length > 0,
      anahtar,
    );
  }
  const sozluk = JSON.parse(readFileSync("messages/tr.json", "utf8"));
  const eksikMetin = durumlar
    .map((d) => IADE_ISLE_SEBEP_ANAHTARI[d])
    .filter((a): a is string => a !== null)
    .filter((a) => !(a in sozluk.Bildirim2));
  kontrol("her sebep anahtarının sözlükte metni var", eksikMetin.length === 0, eksikMetin);
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
console.log("\n3) DOSYA EKLERİ — SINIRLAR");
// ===========================================================================
/**
 * Mimar kanıt maddesi (14.08.2026): 6 MB reddedilir · 11. ek reddedilir ·
 * yanlış uzantı reddedilir. Doğrulama SAF olduğu için gerçek dosya yüklemeden
 * sınanıyor; sunucu da aynı fonksiyonu çağırıyor (tek doğruluk kaynağı).
 */
{
  const gecerli = {
    dosyaAdi: "itiraz-fotograf.jpg",
    mimeType: "image/jpeg",
    sizeBytes: 2 * 1024 * 1024,
    mevcutEkSayisi: 0,
    hedefTipi: "ReturnNotice",
  };

  kontrol("2 MB JPG kabul edilir", ekiDogrula(gecerli).length === 0, ekiDogrula(gecerli));
  kontrol(
    "5 MB tam sınırda kabul edilir",
    ekiDogrula({ ...gecerli, sizeBytes: EK_SINIRLARI.enFazlaBayt }).length === 0,
  );

  // --- 6 MB REDDEDİLİR ---
  const buyuk = ekiDogrula({ ...gecerli, sizeBytes: 6 * 1024 * 1024 });
  kontrol("6 MB dosya REDDEDİLİR", buyuk.includes("DOSYA_COK_BUYUK"), buyuk);

  // --- 11. EK REDDEDİLİR ---
  kontrol(
    "10. ek kabul (mevcut 9)",
    ekiDogrula({ ...gecerli, mevcutEkSayisi: 9 }).length === 0,
  );
  const onbirinci = ekiDogrula({ ...gecerli, mevcutEkSayisi: 10 });
  kontrol("11. ek REDDEDİLİR", onbirinci.includes("EK_SINIRI_ASILDI"), onbirinci);

  // --- YANLIŞ TÜR / UZANTI ---
  const zip = ekiDogrula({
    ...gecerli,
    dosyaAdi: "belgeler.zip",
    mimeType: "application/zip",
  });
  kontrol("zip REDDEDİLİR", zip.includes("TUR_IZINLI_DEGIL"), zip);
  const exe = ekiDogrula({
    ...gecerli,
    dosyaAdi: "virus.exe",
    mimeType: "application/x-msdownload",
  });
  kontrol("exe REDDEDİLİR", exe.includes("TUR_IZINLI_DEGIL"), exe);

  /**
   * TÜR VE UZANTI BİRLİKTE KONTROL EDİLİR. Tarayıcının bildirdiği MIME
   * güvenilmez: `.exe` dosyası `image/png` diye gönderilebilir. Uzantı da
   * tek başına yetmez; ikisinin BİRBİRİYLE tutması gerekiyor.
   */
  const uyusmaz = ekiDogrula({
    ...gecerli,
    dosyaAdi: "sahte.exe",
    mimeType: "image/png",
  });
  kontrol(
    "tür PNG ama uzantı .exe -> REDDEDİLİR",
    uyusmaz.includes("UZANTI_TURLE_UYUSMUYOR"),
    uyusmaz,
  );
  kontrol(
    "PDF kabul edilir",
    ekiDogrula({ ...gecerli, dosyaAdi: "fatura.pdf", mimeType: "application/pdf" })
      .length === 0,
  );
  kontrol(
    "büyük harfli uzantı da tanınır (.PDF)",
    ekiDogrula({ ...gecerli, dosyaAdi: "FATURA.PDF", mimeType: "application/pdf" })
      .length === 0,
  );
  kontrol("boş dosya REDDEDİLİR", ekiDogrula({ ...gecerli, sizeBytes: 0 }).includes("DOSYA_BOS"));
  kontrol(
    "tanınmayan hedef tipi REDDEDİLİR",
    ekiDogrula({ ...gecerli, hedefTipi: "Kullanici" }).includes("HEDEF_GECERSIZ"),
  );
  kontrol("uzantı küçük harfe iner", uzanti("Foto.JPEG") === ".jpeg", uzanti("Foto.JPEG"));

  /**
   * BLOB YOLU ÖNGÖRÜLEBİLİR: boşluk ve yol ayracı temizlenir, yoksa depoda
   * "ekler/ReturnNotice/id/../../gizli" gibi bir anahtar üretilebilirdi.
   */
  const yol = ekYolu("ReturnNotice", "bld1", "../gizli dosya.pdf", 1755000000000);
  kontrol(
    "yol ayracı ve boşluk temizlenir",
    yol === "ekler/ReturnNotice/bld1/1755000000000-.._gizli_dosya.pdf",
    yol,
  );

  /** YEDEK UYARISI SÖZLÜKTE VAR: ekranda boş metin çıkmasın. */
  const sozluk2 = JSON.parse(readFileSync("messages/tr.json", "utf8"));
  kontrol(
    "yedek uyarısı sözlükte ve DOSYALARIN girmediğini söylüyor",
    typeof sozluk2.Ekler?.yedekUyarisi === "string" &&
      sozluk2.Ekler.yedekUyarisi.includes("yedeğe"),
    sozluk2.Ekler?.yedekUyarisi,
  );

  /** ATTACHMENT YEDEK MANİFESTİNDE: satırlar kaybolmasın. */
  const bicim = readFileSync("src/lib/yedek-bicim.ts", "utf8");
  kontrol(
    "Attachment yedek manifestinde",
    bicim.includes('"Attachment"'),
  );
  kontrol(
    "ReturnNotice yedek manifestinde",
    bicim.includes('"ReturnNotice"'),
  );
  kosanBolumler.push("ekler");
}

// ===========================================================================
console.log("\n4) FORM KURALLARI — 14.08.2026'DA CANLIDA ÇIKAN HATALAR");
// ===========================================================================
/**
 * Kullanıcı testi düşürdü ve dört ayrı hata buldu:
 *   1. YANLIS_URUN seçilince "dönen ürün" alanı EKRANA HİÇ ÇİZİLMEMİŞTİ.
 *   2. Ayrılan ürün listesi BÜTÜN ürünleri gösteriyordu (stok bilgisi yok).
 *   3. Stoğu 0 olan ürün ayrılabiliyordu; "ayrıldı" rozeti çıkıyordu.
 *   4. Geçiş düğmeleri DURUM ADI yazıyordu, eylem adı değil ("devam gelmiyor").
 *
 * Bu bölüm 1, 3 ve 4'ün kuralını kilitliyor; 2 sunum katmanı olduğu için
 * ekran kaynağından doğrulanıyor.
 */
{
  // --- DÖNEN ÜRÜN ZORUNLULUĞU (hata 1) ---
  kontrol("YANLIS_URUN'da dönen ürün ZORUNLU", donenUrunZorunluMu("YANLIS_URUN"));
  for (const g of ["DEGISIM", "DEGISIM_KUSURLU", "CAYMA", "CALISMIYOR", "KULLANILMIS_ITIRAZ", "DIGER"] as const) {
    kontrol(`  ...${g} gerekçesinde sorulmaz`, !donenUrunZorunluMu(g));
  }
  kontrol(
    "değişim gerekçelerinden YALNIZ YANLIS_URUN dönen ürün ister",
    DEGISIM_GEREKCELERI.filter(donenUrunZorunluMu).length === 1,
    DEGISIM_GEREKCELERI.filter(donenUrunZorunluMu),
  );

  /** DÖNEN ÜRÜN ALANI EKRANDA GERÇEKTEN VAR MI (hata 1'in ta kendisi). */
  const form = readFileSync("src/app/iadeler/bildirim-formu.tsx", "utf8");
  kontrol(
    "form dönen ürün alanını ÇİZİYOR (donenSorulur bloğu)",
    form.includes("donenSorulur ?") && form.includes("bildirim-donen"),
  );
  kontrol(
    "dönen ürün seçicisi ARANABİLİR (1055 ürün düz listeye sığmaz)",
    form.includes("AranabilirSecim"),
  );
  kontrol(
    "ayrılan ürün listesi STOKTAKİ varyantlardan besleniyor",
    form.includes("stoktakiVaryantlar"),
  );
  kontrol(
    "dönen ürün listesi TÜM varyantlardan besleniyor (stok 0 olabilir)",
    form.includes("tumVaryantlar"),
  );

  const sayfa = readFileSync("src/app/iadeler/page.tsx", "utf8");
  kontrol(
    "sayfa ayrılan listeyi stoğa göre süzüyor",
    sayfa.includes("formStoklari.get(v.id) ?? 0) > 0"),
  );
  /**
   * VARYANT SORGUSUNDA SINIR YOK. Eskiden `take: 500` vardı: 1055 üründen
   * 500'ü listeleniyor, gerisi SESSİZCE düşüyordu. Aradığı ürünü bulamayan
   * kullanıcı onun sistemde kayıtlı olmadığını sanardı — en sinsi tür.
   * Kontrol metinsel ve dar: sorgunun kendisini okumak yerine o satırın
   * geri gelmediğini kanıtlıyor.
   */
  kontrol(
    "  ...ve varyant sorgusunda `take: 500` SINIRI YOK (ürün sessizce düşmesin)",
    !sayfa.includes("take: 500"),
  );

  // --- AYIRMA STOK KONTROLÜ (hata 3) ---
  kontrol(
    "stok 0 -> ayırma REDDEDİLİR",
    !ayirmaMumkunMu({ mevcutStok: 0, zatenAyrilmis: 0, istenen: 1 }),
  );
  kontrol(
    "stok 1, istenen 1 -> KABUL",
    ayirmaMumkunMu({ mevcutStok: 1, zatenAyrilmis: 0, istenen: 1 }),
  );
  kontrol(
    "stok 1, istenen 2 -> REDDEDİLİR",
    !ayirmaMumkunMu({ mevcutStok: 1, zatenAyrilmis: 0, istenen: 2 }),
  );
  /**
   * AYNI MALI İKİ BİLDİRİME AYIRMAK: 1 adet stok, 1 adet zaten ayrılmış.
   * Yalnız mevcut stoğa bakan bir kontrol bunu KABUL ederdi ve iki bildirim
   * de "hazır" görünürdü — biri gönderilince öteki boşa çıkardı.
   */
  kontrol(
    "stok 1 ama 1 adedi başka bildirime ayrılmış -> REDDEDİLİR",
    !ayirmaMumkunMu({ mevcutStok: 1, zatenAyrilmis: 1, istenen: 1 }),
  );
  kontrol(
    "stok 5, 2 ayrılmış, 3 isteniyor -> KABUL (tam sınır)",
    ayirmaMumkunMu({ mevcutStok: 5, zatenAyrilmis: 2, istenen: 3 }),
  );
  kontrol(
    "stok 5, 2 ayrılmış, 4 isteniyor -> REDDEDİLİR",
    !ayirmaMumkunMu({ mevcutStok: 5, zatenAyrilmis: 2, istenen: 4 }),
  );
  kontrol("serbest stok = mevcut − ayrılmış", serbestStok(5, 2) === 3, serbestStok(5, 2));
  kontrol("adet 0 ile ayırma anlamsız -> REDDEDİLİR", !ayirmaMumkunMu({ mevcutStok: 9, zatenAyrilmis: 0, istenen: 0 }));

  /** SUNUCU DA AYNI FONKSİYONU ÇAĞIRIYOR: ekranda engellemek yetki değildir. */
  const eylem = readFileSync("src/app/iadeler/bildirim-actions.ts", "utf8");
  kontrol("sunucu ayırma kontrolünü yapıyor", eylem.includes("ayirmaMumkunMu"));
  kontrol("sunucu dönen ürün zorunluluğunu yapıyor", eylem.includes("donenUrunZorunluMu"));

  // --- DÜĞME ETİKETLERİ EYLEM DİLİNDE (hata 4) ---
  const sozluk3 = JSON.parse(readFileSync("messages/tr.json", "utf8"));
  const gecis = sozluk3.BildirimGecisi ?? {};
  for (const durum of Object.keys(IZINLI_GECISLER)) {
    kontrol(
      `  geçiş etiketi var: ${durum}`,
      typeof gecis[durum] === "string" && gecis[durum].length > 0,
      gecis[durum],
    );
  }
  kontrol(
    "MAL_GELDI düğmesi EYLEM söylüyor (durum adı değil)",
    typeof gecis.MAL_GELDI === "string" && gecis.MAL_GELDI.includes("işaretle"),
    gecis.MAL_GELDI,
  );
  kontrol(
    "  ...durum rozetiyle AYNI METİN DEĞİL",
    gecis.MAL_GELDI !== sozluk3.BildirimDurumu?.MAL_GELDI,
    [gecis.MAL_GELDI, sozluk3.BildirimDurumu?.MAL_GELDI],
  );
  /** SIRADAKİ ADIM: her durumda yazılı ve BEKLENIYOR'da yönlendirme veriyor. */
  for (const anahtar of [
    "siradakiBekleniyor",
    "siradakiMalGeldi",
    "siradakiItiraz",
    "siradakiItirazKabul",
    "siradakiItirazRed",
    "siradakiYok",
  ]) {
    kontrol(`  sıradaki adım metni var: ${anahtar}`, typeof gecis[anahtar] === "string" && gecis[anahtar].length > 0);
  }
  kontrol(
    "BEKLENIYOR'da sıradaki adım hangi düğmeye basılacağını SÖYLÜYOR",
    typeof gecis.siradakiBekleniyor === "string" &&
      gecis.siradakiBekleniyor.includes("Mal geldi"),
    gecis.siradakiBekleniyor,
  );
  kontrol(
    "sayfa sıradaki adımı gösteriyor",
    sayfa.includes("siradakiAdimlar[b.status]"),
  );
  kosanBolumler.push("form-kurallari");
}

// ===========================================================================
console.log("\n5) İADE FORMU — ÖN-DOLU GEÇİŞ (T4/14 CANLI HATASI)");
// ===========================================================================
/**
 * T4 testinin 14. adımında akış durdu: "Dönen ürün (yanlış giden) alanında B
 * seçili gelmeli — bu sekme çalışmıyor, Değişim ürün alanı yok."
 *
 * Üç ayrı sebep vardı, üçü de aynı ekranda:
 *   1. Raf/Değişim/Dönen alanları YALNIZ `adet > 0` iken çiziliyordu.
 *      Bildirimden gelindiğinde adet boştur — ön-dolu gelen B ekranda HİÇ
 *      görünmedi. Form doluydu, ekran boştu: en sinsi tür.
 *   2. Varyant sorgusunda `take: 200` vardı. 1055 üründen 200'ü listeleniyor,
 *      seçili değerin karşılığı listede bulunamayınca alan boş görünüyordu.
 *      (Bildirim formundaki `take: 500` tuzağının ikizi.)
 *   3. Ön-dolu BÜTÜN kalemlere yazılıyordu — çok kalemli satışta dönen ürün
 *      her kaleme düşerdi. Sessiz yanlış defter riski.
 */
{
  // --- HANGİ KALEME (hata 3) ---
  const K = (id: string, v: string) => ({ saleItemId: id, variantId: v });

  kontrol(
    "tek kalem -> ön-dolu o kaleme",
    onDoluHedefKalem({ kalemler: [K("k1", "A")], ayrilanVaryantId: null }) ===
      "k1",
  );
  kontrol(
    "ayrılan varyantla eşleşen kalem seçilir",
    onDoluHedefKalem({
      kalemler: [K("k1", "A"), K("k2", "C")],
      ayrilanVaryantId: "C",
    }) === "k2",
  );
  kontrol(
    "çok kalem + eşleşme yok -> TAHMİN YOK (null)",
    onDoluHedefKalem({
      kalemler: [K("k1", "A"), K("k2", "C")],
      ayrilanVaryantId: "Z",
    }) === null,
  );
  kontrol(
    "aynı varyant iki kalemde -> belirsiz, null",
    onDoluHedefKalem({
      kalemler: [K("k1", "A"), K("k2", "A")],
      ayrilanVaryantId: "A",
    }) === null,
  );
  kontrol(
    "ayrılan varyant yok ama tek kalem var -> o kalem",
    onDoluHedefKalem({ kalemler: [K("k1", "A")], ayrilanVaryantId: null }) ===
      "k1",
  );
  kontrol(
    "hiç kalem yok -> null",
    onDoluHedefKalem({ kalemler: [], ayrilanVaryantId: "A" }) === null,
  );

  // --- ALANLAR EKRANA ÇİZİLİYOR MU (hata 1) ---
  const iadeForm = readFileSync(
    "src/app/satislar/[id]/iade/iade-formu.tsx",
    "utf8",
  );
  /**
   * Koşul artık yalnız adede bakmıyor: DOLU BİR DEĞER ASLA GİZLENMEZ.
   * Kontrol metinsel ve dar — eski koşulun geri gelmediğini kanıtlıyor.
   */
  kontrol(
    "ürün alanları dolu değerle de çiziliyor (adet 0 olsa bile)",
    iadeForm.includes("const alanlarGorunur") &&
      iadeForm.includes("g.donenVaryantId !== \"\""),
  );
  kontrol(
    "  ...eski `adet > 0` kilidi GERİ GELMEDİ",
    !iadeForm.includes("stogaGirer && adet > 0"),
  );
  kontrol(
    "ön-dolu YALNIZ hedef kaleme yazılıyor",
    iadeForm.includes("onDolu?.hedefKalemId === s.saleItemId"),
  );
  kontrol(
    "hedef bulunamazsa ekran SÖYLÜYOR (sessiz kalmıyor)",
    iadeForm.includes("onDoluHedefYok"),
  );
  kontrol(
    "değişim ve dönen seçicileri ARANABİLİR",
    iadeForm.includes("AranabilirSecim") && !iadeForm.includes("varyantlar.map"),
  );
  kontrol(
    "iki liste AYRI besleniyor (değişim stoklu, dönen hepsi)",
    iadeForm.includes("degisimVaryantlari") &&
      iadeForm.includes("donenVaryantlari"),
  );

  // --- LİSTE SINIRI (hata 2) ---
  const iadeSayfa = readFileSync("src/app/satislar/[id]/iade/page.tsx", "utf8");
  kontrol(
    "varyant sorgusunda `take: 200` SINIRI YOK (ürün sessizce düşmesin)",
    !iadeSayfa.includes("take: 200"),
  );
  kontrol(
    "değişim listesi stoğa göre süzülüyor",
    iadeSayfa.includes("(stoklar.get(v.id) ?? 0) > 0"),
  );
  /**
   * ÖN-DOLU GELEN ÜRÜN STOĞU 0 OLSA DA LİSTEDE KALIR. Yoksa seçili değerin
   * karşılığı listede bulunmaz ve alan yine boş görünürdü — düzeltmeye
   * çalıştığımız hatanın ta kendisi geri gelirdi.
   */
  kontrol(
    "  ...ama ön-dolu gelen ürün stoksuz da olsa listede KALIYOR",
    iadeSayfa.includes("v.id === onDolu?.gonderilecekVaryantId"),
  );
  kontrol(
    "dönen listesi TÜM varyantlardan (stok 0 normaldir)",
    iadeSayfa.includes("varyantKayitlari.map(secenekYap)"),
  );

  // --- SÖZLÜK ---
  const sozluk4 = JSON.parse(readFileSync("messages/tr.json", "utf8"));
  for (const anahtar of [
    "stokMetni",
    "degisimUrunuSecin",
    "donenUrunSecin",
    "onDoluHedefYok",
    "donenUrunBildirimden",
  ]) {
    kontrol(
      `  sözlükte var: Iade.${anahtar}`,
      typeof sozluk4.Iade?.[anahtar] === "string" &&
        sozluk4.Iade[anahtar].length > 0,
    );
  }
  kosanBolumler.push("on-dolu-gecis");
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
