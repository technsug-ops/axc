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
  kanalNormaldeOderMi,
  yenidenGonderimSorulurMu,
} from "../src/lib/iade/yeniden-gonderim";
import { readFileSync } from "node:fs";

import { BILDIRIM_DURUM_RENGI } from "../src/lib/durum-renkleri";

/**
 * ⚠ ŞEMA SATIR SONUNDAN BAĞIMSIZ OKUNUR (24.08.2026).
 *
 * `npx prisma format` dosyayı CRLF'e çevirdi ve enum ayrıştıran kontrol
 * SESSİZCE 0 değer buldu: `split("
")` sonrası satırlar `` ile
 * bitiyor, `/\/\/.*$/` deseni `$`i bulamadığı için yorum SİLİNMİYOR ve
 * `^[A-Z_]+$` testi düşüyor.
 *
 * Kontrol yanlış değildi — okuduğu METİN değişmişti. Windows'ta çalışan
 * her checkout'ta aynı tuzak var; bu yüzden düzeltme tek satırda değil,
 * OKUMA KAPISINDA yapılıyor.
 */
function semaMetni(): string {
  return readFileSync("prisma/schema.prisma", "utf8")
    .split("\r\n")
    .join("\n");
}
import {
  DURUM_SAYACI,
  SAYAC_KURALLARI,
  SAYAC_TURLERI,
  acilEsigi,
  acilMi,
  isleyenSayac,
  sayacRengi,
} from "../src/lib/iade/sayac";

import {
  ANALIZ_SONUCLARI,
  BILDIRIM_DURUMLARI,
  IADE_GEREKCELERI,
  ITIRAZ_GEREKCELERI,
  gecerliAnalizSonucu,
  gecerliIadeGerekcesi,
  gecerliItirazGerekcesi,
} from "../src/lib/etiketler";
import {
  BILDIRIM_TAVANI,
  analizSonucuIstenirMi,
  ayrilmisDusmeyiBekliyor,
  bildirimTavaniDoldu,
  itirazDegisimUrunuIster,
  itirazGerekcesiGerekliMi,
} from "../src/lib/iade/bildirim";
import {
  askidaMi,
  kargolamaDogurur,
  kargolamaDurumu,
} from "../src/lib/iade/kargolama";

import {
  DEGISIM_GEREKCELERI,
  IADE_ISLE_SEBEP_ANAHTARI,
  IZINLI_GECISLER,
  BILDIRIM_ARAMA_ALANLARI,
  ACIK_BILDIRIM_DURUMLARI,
  AYRILMIS_SAYILAN_DURUMLAR,
  IADE_ISLENEBILIR,
  ayirmaMumkunMu,
  ayrilmisAdetler,
  bildirimAramaKosulu,
  degisimAyrilirMi,
  donenUrunZorunluMu,
  gecisGecerliMi,
  gecisOnayIster,
  iadeIslenebilirMi,
  itirazAcilabilirMi,
  bildirimIptalEdilebilirMi,
  iptalGerekcesiGecerliMi,
  kapaliMi,
  kapanistaIadeDogarMi,
  onDoluHedefKalem,
  serbestStok,
} from "../src/lib/iade/bildirim";
import {
  EK_SINIRLARI,
  TASIMA_SINIRI,
  ekiDogrula,
  ekYolu,
  uzanti,
} from "../src/lib/ekler";
import {
  iadeFormuOnDolu,
  urunAlanlariCizilirMi,
} from "../src/lib/iade/on-dolu";
import {
  donenMalDagilimi,
  maliyetKilidiTutuyorMu,
  yanlisUrunPlani,
  type PartiDusumu,
  type YanlisUrunGirdisi,
} from "../src/lib/iade/yanlis-urun";

let basarisiz = 0;
let calisan = 0;
const BOLUM_SAYISI = 18;
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
    "beyan edilen sınır tam noktasında kabul edilir",
    ekiDogrula({ ...gecerli, sizeBytes: EK_SINIRLARI.enFazlaBayt }).length === 0,
  );

  /**
   * SINIRIN BİR BAYT ÜSTÜ REDDEDİLİR. Sabit rakam yazmıyoruz: sınır
   * 14.08.2026'da 5 MB→ 4 MB'a indi (taşıma tavanı), etiket sabit kalsaydı
   * test doğru kalır ama METİN yalan söylerdi.
   */
  const buyuk = ekiDogrula({
    ...gecerli,
    sizeBytes: EK_SINIRLARI.enFazlaBayt + 1,
  });
  kontrol("sınırın bir bayt üstü REDDEDİLİR", buyuk.includes("DOSYA_COK_BUYUK"), buyuk);

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

  /**
   * -------------------------------------------------------------------------
   *  ALANLARA GİDEN DEĞER — TESTİN ESKİ KÖR NOKTASI
   * -------------------------------------------------------------------------
   *  T4/14 İKİNCİ KEZ düştüğünde 142 kontrolün hepsi yeşildi. Sebep: bu
   *  bölümdeki kontroller kaynak dosyada metin arıyordu ("AranabilirSecim
   *  geçiyor mu", "hedefKalemId yazılmış mı"). Metin araması bir alanın
   *  ÇİZİLDİĞİNİ kanıtlayamaz; olsa olsa satırın silinmediğini kanıtlar.
   *  "Alan var mı" sorusuna cevap veriyorduk, "hangi DEĞERLE geliyor"
   *  sorusuna değil — kör nokta tam oradaydı.
   *
   *  Artık ekranın verdiği iki karar da saf fonksiyonda ve BURADA GERÇEK T4
   *  ŞEKLİYLE ÇAĞRILIYOR. Aşağıdaki kimlikler canlıdan okundu (bildirim
   *  nbkhuj, satış 11502693455).
   */
  const T4_DONEN = "f6b75942-8860-4462-8ded-540ffda4205c"; // axcali1603 — B
  const T4_AYRILAN = "d6b84620-88c0-4a7f-ad85-89cb1322e56a"; // axcali1752 — A
  const T4_KALEM = "cmsroq01j000504l66ym0w3kv";

  const t4 = iadeFormuOnDolu({
    bildirim: {
      reason: "YANLIS_URUN",
      returnedVariantId: T4_DONEN,
      reservedVariantId: T4_AYRILAN,
    },
    kalemler: [{ saleItemId: T4_KALEM, variantId: T4_AYRILAN }],
  });

  kontrol("T4: ön-dolu hedef kalemi buldu", t4.hedefKalemId === T4_KALEM, t4);
  kontrol(
    "T4: DÖNEN alanının değeri = bildirimin returnedVariantId'si (B)",
    t4.donenVaryantId === T4_DONEN,
    t4.donenVaryantId,
  );
  kontrol(
    "T4: DEĞİŞİM alanının değeri = bildirimin reservedVariantId'si (A)",
    t4.gonderilecekVaryantId === T4_AYRILAN,
    t4.gonderilecekVaryantId,
  );
  kontrol(
    "T4: iki alan BİRBİRİNE karışmadı",
    t4.donenVaryantId !== t4.gonderilecekVaryantId,
  );
  kontrol("T4: hedef kalemde adet 1 ön-dolu", t4.adet === "1", t4.adet);

  /**
   * ASIL KİLİT: adet SIFIRKEN bile alanlar çizilmeli. Eski kural yalnız
   * `adet > 0`a bakıyordu ve ön-dolu gelen ürünü EKRANDA GÖRÜNMEZ yapıyordu.
   * Bu satır o kuralın geri gelmesini imkânsız kılar.
   */
  kontrol(
    "T4: adet 0 olsa BİLE ürün alanları ÇİZİLİR (asıl kilit)",
    urunAlanlariCizilirMi({
      stogaGirer: true,
      adet: 0,
      gonderilecekVaryantId: t4.gonderilecekVaryantId,
      donenVaryantId: t4.donenVaryantId,
    }),
  );
  kontrol(
    "  ...yalnız dönen dolu olsa da çizilir",
    urunAlanlariCizilirMi({
      stogaGirer: true,
      adet: 0,
      gonderilecekVaryantId: "",
      donenVaryantId: T4_DONEN,
    }),
  );
  kontrol(
    "  ...yalnız değişim dolu olsa da çizilir",
    urunAlanlariCizilirMi({
      stogaGirer: true,
      adet: 0,
      gonderilecekVaryantId: T4_AYRILAN,
      donenVaryantId: "",
    }),
  );
  kontrol(
    "boş form + adet 0 -> çizilmez (ekran gereksiz dolmasın)",
    !urunAlanlariCizilirMi({
      stogaGirer: true,
      adet: 0,
      gonderilecekVaryantId: "",
      donenVaryantId: "",
    }),
  );
  kontrol(
    "itirazlı iadede çizilmez (mal müşteride kalır)",
    !urunAlanlariCizilirMi({
      stogaGirer: false,
      adet: 2,
      gonderilecekVaryantId: T4_AYRILAN,
      donenVaryantId: T4_DONEN,
    }),
  );

  /**
   * --- ÖN-DOLU ÖLÇÜTÜ: GEREKÇE DEĞİL, VERİ (düzeltildi 23.08.2026) ---
   *
   * ⚠ BURADA ESKİDEN TERS BİR İDDİA VARDI: _"DEGISIM/DEGISIM_KUSURLU/CAYMA/
   * CALISMIYOR gerekçesinde ön-dolu ÜRÜN yazılmaz."_ Yazıldığı gün doğruydu —
   * ayırma yalnız `YANLIS_URUN`da doğuyordu. Ama bu bir GÜVENLİK kuralı değil
   * bir KAPSAM BEYANIYDI ve kapsam iki kez genişledi: müşterinin `DEGISIM` /
   * `DEGISIM_KUSURLU` sebepleri ve satıcının `DEGISIM` itirazı da ürün
   * ayırıyor.
   *
   * Sonuç canlıda görüldü: ayrılan ürün forma hiç taşınmadı, kullanıcı
   * doldurmadı, `EXCHANGE_OUT` yazılmadı — ürün depodan çıktı, defter
   * öğrenmedi.
   *
   * ⚠ ESKİ İDDİA SİLİNMEDİ, ÇEVRİLDİ VE NİYE ÇEVRİLDİĞİ YAZILDI (anayasa:
   * _"eski gerekçe silinmez"_) — yoksa aynı daraltma altı ay sonra yeniden
   * keşfedilip yeniden uygulanır.
   */
  for (const g of ["DEGISIM", "DEGISIM_KUSURLU", "CAYMA", "CALISMIYOR"] as const) {
    const s = iadeFormuOnDolu({
      bildirim: {
        reason: g,
        returnedVariantId: T4_DONEN,
        reservedVariantId: T4_AYRILAN,
      },
      kalemler: [{ saleItemId: T4_KALEM, variantId: T4_AYRILAN }],
    });
    /** AYRILAN ürün her gerekçede taşınır — `EXCHANGE_OUT`un tek girdisi bu. */
    kontrol(
      `  ${g}: ayrılan ürün forma TAŞINIR`,
      s.gonderilecekVaryantId === T4_AYRILAN && s.urunVar,
      s,
    );
    /**
     * ⚠ DÖNEN ürün YALNIZ `YANLIS_URUN`da anlamlı: öteki gerekçelerde geri
     * gelen mal satılan malın KENDİSİDİR. Taşısaydık form "başka bir ürün
     * döndü" derdi ve defter düzeltmesi yanlış varyanta yazılırdı.
     */
    kontrol(
      `  ${g}: DÖNEN ürün taşınmaz (satılan malın kendisi döner)`,
      s.donenVaryantId === "",
    );
    /**
     * ⚠ ADET ÖN-DOLU DEĞİL. Form bu değeri "SAĞLAM adet"e de yazıyor;
     * `HASARLI` bir iadede "1 sağlam" varsayımı hasarlı malı STOĞA SOKARDI
     * (`RETURN_IN` yalnız sağlam adetten yazılır).
     */
    kontrol(
      `  ${g}: adet UYDURULMAZ (sağlam/hasarlı ayrımı kullanıcının)`,
      s.adet === "",
    );
  }

  /** `YANLIS_URUN` eski davranışını AYNEN korur — orada mal kesin sağlam döner. */
  {
    const y = iadeFormuOnDolu({
      bildirim: {
        reason: "YANLIS_URUN",
        returnedVariantId: T4_DONEN,
        reservedVariantId: T4_AYRILAN,
      },
      kalemler: [{ saleItemId: T4_KALEM, variantId: T4_AYRILAN }],
    });
    kontrol(
      "  YANLIS_URUN: dönen ürün DE taşınır ve adet 1 kalır",
      y.donenVaryantId === T4_DONEN && y.adet === "1",
      y,
    );
  }

  /** Ayrılan ürün YOKSA taşınacak bir şey de yok. */
  kontrol(
    "  ayırma yoksa ön-dolu yok",
    iadeFormuOnDolu({
      bildirim: {
        reason: "CAYMA",
        returnedVariantId: null,
        reservedVariantId: null,
      },
      kalemler: [{ saleItemId: T4_KALEM, variantId: T4_AYRILAN }],
    }).urunVar === false,
  );
  kontrol(
    "bildirim yoksa ön-dolu yok",
    iadeFormuOnDolu({ bildirim: null, kalemler: [] }).urunVar === false,
  );

  /**
   * HEDEF BELİRSİZSE DEĞER YAZILMAZ. Yanlış kaleme yazılan bir dönen ürün
   * sessiz yanlış defter demektir; boş bırakıp kullanıcıya söylemek daha
   * güvenli.
   */
  const belirsiz = iadeFormuOnDolu({
    bildirim: {
      reason: "YANLIS_URUN",
      returnedVariantId: T4_DONEN,
      reservedVariantId: null,
    },
    kalemler: [
      { saleItemId: "k1", variantId: "X" },
      { saleItemId: "k2", variantId: "Y" },
    ],
  });
  kontrol("hedef belirsiz -> değer YAZILMAZ", belirsiz.donenVaryantId === "");
  kontrol(
    "  ...ama urunVar TRUE kalır (ekran uyarıyı gösterebilsin)",
    belirsiz.urunVar,
  );

  // --- EKRAN BU FONKSİYONLARI GERÇEKTEN ÇAĞIRIYOR MU (bağlantı kontrolü) ---
  const iadeForm = readFileSync(
    "src/app/satislar/[id]/iade/iade-formu.tsx",
    "utf8",
  );
  kontrol(
    "form çizim kararını saf fonksiyondan alıyor (kopya mantık yok)",
    iadeForm.includes("urunAlanlariCizilirMi({") &&
      !iadeForm.includes("stogaGirer && adet > 0"),
  );
  const iadeSayfa = readFileSync("src/app/satislar/[id]/iade/page.tsx", "utf8");
  kontrol(
    "sayfa ön-dolu kararını saf fonksiyondan alıyor",
    iadeSayfa.includes("iadeFormuOnDolu({"),
  );
  kontrol(
    "ön-dolu YALNIZ hedef kaleme yazılıyor",
    iadeForm.includes("onDolu?.hedefKalemId === s.saleItemId"),
  );
  kontrol(
    "bildirimden ne geldiği ÜSTTE özetleniyor (teşhis + İlke #5)",
    iadeForm.includes("onDoluOzetiBaslik") &&
      iadeForm.includes("onDoluDonen") &&
      iadeForm.includes("onDoluGonderilecek"),
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
    "onDoluOzetiBaslik",
    "onDoluDonen",
    "onDoluGonderilecek",
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
console.log("\n6) BİLDİRİM LİSTESİ — BULUNABİLİRLİK");
// ===========================================================================
/**
 * Kullanıcı bildirimi TALEP NO'sundan aramak istedi (nbkhuj); arama kutusu
 * yoktu. Satış açılır listesinde aradı — orada hiçbir zaman olmayacaktı,
 * o bir satış kodu değil. Bulunabilirlik iki bacaklıdır:
 *   ARAMA  — hangi kâğıtla gelirse gelsin sorguda karşılığı olmalı
 *   GÖRÜNÜRLÜK — talep no listede kimlik kodu gibi durmalı, gri ek gibi değil
 */
{
  kontrol(
    "boş arama SÜZMEZ (listeyi sessizce boşaltmaz)",
    Object.keys(bildirimAramaKosulu("")).length === 0,
  );
  kontrol(
    "  ...yalnız boşluk da süzmez",
    Object.keys(bildirimAramaKosulu("   ")).length === 0,
  );

  const kosul = bildirimAramaKosulu("  nbkhuj ");
  const dallar = (kosul.OR ?? []) as Record<string, unknown>[];
  kontrol("arama OR dalları üretiyor", dallar.length > 0, dallar.length);
  kontrol(
    "  ...arama metni kırpılıyor",
    JSON.stringify(kosul).includes('"nbkhuj"') &&
      !JSON.stringify(kosul).includes('" nbkhuj'),
  );

  /** HER ALAN TEK TEK: biri sessizce düşerse o kâğıtla gelen bulamaz. */
  const metin = JSON.stringify(kosul);
  const beklenen: [string, string][] = [
    ["talep no", '{"code":{"contains":"nbkhuj"}}'],
    ["not", '{"note":{"contains":"nbkhuj"}}'],
    ["sipariş no", '{"sale":{"code":{"contains":"nbkhuj"}}}'],
    ["ayrılan SKU", '{"reservedVariant":{"sku":{"contains":"nbkhuj"}}}'],
    ["dönen SKU", '{"returnedVariant":{"sku":{"contains":"nbkhuj"}}}'],
    [
      "ayrılan ürün adı",
      '{"reservedVariant":{"product":{"name":{"contains":"nbkhuj"}}}}',
    ],
    [
      "dönen ürün adı",
      '{"returnedVariant":{"product":{"name":{"contains":"nbkhuj"}}}}',
    ],
  ];
  for (const [ad, parca] of beklenen) {
    kontrol(`  ${ad} aranıyor`, metin.includes(parca), parca);
  }
  kontrol(
    "aranan alan sayısı listeyle tutuyor",
    dallar.length === BILDIRIM_ARAMA_ALANLARI.length,
    [dallar.length, BILDIRIM_ARAMA_ALANLARI.length],
  );

  // --- EKRAN BAĞLANTISI ---
  const sayfa2 = readFileSync("src/app/iadeler/page.tsx", "utf8");
  kontrol(
    "arama SUNUCUDA yapılıyor (sorgunun içinde)",
    sayfa2.includes("bildirimAramaKosulu(bildirimArama)") &&
      sayfa2.includes("where: bildirimKosulu"),
  );
  /**
   * ⚠ KONTROL 23.08.2026'DA TAŞINDI. Arama kutusu ortak bileşene geçti
   * (`KodAramaKutusu`) — kamera her kod alanında olsun diye (İlke #7).
   * `name="bq"` artık ekranda değil, bileşenin parametresinde. Davranış
   * aynı; desen yer değiştirdi.
   */
  kontrol(
    "arama kutusu ekranda ve `bq` parametresini yazıyor",
    /parametre="bq"/.test(sayfa2) && sayfa2.includes("p.bq"),
  );
  kontrol(
    "  ...ve kamera taşıyan ortak kutuyu kullanıyor (İlke #7)",
    /<KodAramaKutusu/.test(sayfa2),
  );
  /**
   * BEKLEYEN ROZETİ ARAMADAN BAĞIMSIZ: eskiden ekrandaki 50 kaydın içinden
   * sayılıyordu, arama açıkken rozet aramanın sonucunu gösterip yalan söylerdi.
   *
   * ⚠ BU KONTROL 22.08.2026'DA YANLIŞ ÖLÇÜTÜ KİLİTLİYORDU. Metni doğruydu
   * ("tüm açık bildirimlerden") ama aradığı desen
   * `AYRILMIS_SAYILAN_DURUMLAR`dı — o liste DEĞİŞİM STOĞU için yazılmış ve
   * `ITIRAZ_RED`i dışarıda bırakıyor. Yani bekçi, gerçek bekleyen işi
   * saymayan bir kodu "doğru" diye onaylıyordu. Kontrolün metniyle deseni
   * ayrışmıştı ve ayrışma metnin lehineydi: kimse şüphelenmedi.
   */
  kontrol(
    "bekleyen rozeti arama sonucundan DEĞİL, tüm açık bildirimlerden sayılıyor",
    sayfa2.includes("status: { in: ACIK_BILDIRIM_DURUMLARI }"),
  );
  kontrol(
    "talep no listede KOPYALANABİLİR kimlik kodu (İlke #3/#4)",
    sayfa2.includes("talepNoKisa") && sayfa2.includes("<KopyalanabilirKod"),
  );

  const bForm = readFileSync("src/app/iadeler/bildirim-formu.tsx", "utf8");
  kontrol(
    "satış seçici ARANABİLİR (düz açılır liste değil)",
    bForm.includes('id="bildirim-satis"') &&
      !bForm.includes('<SelectTrigger id="bildirim-satis"'),
  );
  kontrol(
    "satış listesi sınıra dayanırsa ekran SÖYLÜYOR (sessiz kesme yok)",
    bForm.includes("satisSiniriDoldu") &&
      bForm.includes("satisListesiSinirli"),
  );

  const sozluk5 = JSON.parse(readFileSync("messages/tr.json", "utf8"));
  for (const anahtar of [
    "aramaIpucu",
    "aramaSonucYok",
    "satisListesiSinirli",
    "talepNoKisa",
  ]) {
    kontrol(
      `  sözlükte var: Bildirim2.${anahtar}`,
      typeof sozluk5.Bildirim2?.[anahtar] === "string" &&
        sozluk5.Bildirim2[anahtar].length > 0,
    );
  }
  kosanBolumler.push("bulunabilirlik");
}

// ===========================================================================
console.log("\n7) GERİ GELEN MAL — STOK ŞARTI YOK, MALİYET ŞARTI VAR");
// ===========================================================================
/**
 * T4 canlıda DURDU: "Zolo Powerbank (axcali1603) için değişim ürününde stok
 * yok: 1 istendi, 0 var." axcali1603 geri GELEN maldı. Stok yeterliliği
 * yanlış mala uygulanıyordu ve hata yanlış rolü suçluyordu.
 *
 * MEVCUT TESTLER NEDEN YAKALAMADI: 2. bölüm 6. senaryonun DEFTER PLANINI
 * (`yanlisUrunPlani`) sınıyor — o saf fonksiyon zaten kendisine verilen
 * parti düşümleriyle çalışır, stok yeterliliğine hiç bakmaz. Yeterlilik
 * kararı `iadeKaydet` içinde, transaction'ın ortasında, veritabanı
 * sorgusuyla iç içe duruyordu; hiçbir saf fonksiyonda karşılığı yoktu, bu
 * yüzden hiçbir test onu göremedi. Kural artık `donenMalDagilimi`'nde.
 */
{
  // --- ASIL KİLİT: GERİ GELENİN STOĞU 0 OLSA BİLE KAYIT GEÇER ---
  const stoksuz = donenMalDagilimi({
    iadeAdedi: 1,
    girecekSaglamAdet: 1,
    defterdekiStok: 0,
    sonBilinenMaliyetVarMi: true,
  });
  kontrol("geri gelenin stoğu 0 -> kayıt DURMAZ", stoksuz.hata === null, stoksuz);
  kontrol("  ...defterde yoksa DÜZELTME − yazılmaz", stoksuz.duzeltmeAdedi === 0);
  kontrol("  ...ama sağlam mal stoğa GİRER", stoksuz.girisAdedi === 1);
  kontrol(
    "  ...girişin maliyeti son bilinen maliyetten alınır",
    stoksuz.sonMaliyeteDusenAdet === 1,
  );

  // --- DEFTERDE DURUYORSA DÜZELTME YAZILIR (net 0 kuralı) ---
  const defterde = donenMalDagilimi({
    iadeAdedi: 1,
    girecekSaglamAdet: 1,
    defterdekiStok: 3,
    sonBilinenMaliyetVarMi: true,
  });
  kontrol("defterde duruyorsa DÜZELTME − yazılır", defterde.duzeltmeAdedi === 1);
  kontrol(
    "  ...giriş kendi partisinden karşılanır (son maliyete düşmez)",
    defterde.sonMaliyeteDusenAdet === 0,
  );
  kontrol(
    "  ...net 0: bir çıkar bir girer",
    defterde.girisAdedi - defterde.duzeltmeAdedi === 0,
  );

  // --- KISMİ: defter 1 gösteriyor ama 2 dönüyor ---
  const kismi = donenMalDagilimi({
    iadeAdedi: 2,
    girecekSaglamAdet: 2,
    defterdekiStok: 1,
    sonBilinenMaliyetVarMi: true,
  });
  kontrol("defterde 1 var, 2 dönüyor -> DÜZELTME yalnız 1", kismi.duzeltmeAdedi === 1);
  kontrol("  ...kalan 1 son maliyete düşer", kismi.sonMaliyeteDusenAdet === 1);
  kontrol("  ...ikisi de stoğa girer", kismi.girisAdedi === 2);

  // --- HASARLI: stoğa girmez, maliyeti üstümüzde kalır ---
  const hasarli = donenMalDagilimi({
    iadeAdedi: 2,
    girecekSaglamAdet: 1,
    defterdekiStok: 2,
    sonBilinenMaliyetVarMi: true,
  });
  kontrol("hasarlı kısım stoğa GİRMEZ", hasarli.girisAdedi === 1);
  kontrol("  ...ama defter düzeltmesi TAM adet üzerinden", hasarli.duzeltmeAdedi === 2);

  // --- İTİRAZLI: mal müşteride kalır, giriş yok ---
  const itirazli = donenMalDagilimi({
    iadeAdedi: 1,
    girecekSaglamAdet: 0,
    defterdekiStok: 0,
    sonBilinenMaliyetVarMi: false,
  });
  kontrol("itirazlıda giriş yok -> maliyet de sorulmaz", itirazli.hata === null);
  kontrol("  ...stoğa hiç girmez", itirazli.girisAdedi === 0);

  /**
   * TEK GERÇEK DURDURUCU: maliyet bilinmiyor. Stok yetersizliği DEĞİL.
   * Sıfır maliyetle yazmak envanteri sessizce eksiltirdi.
   */
  const maliyetsiz = donenMalDagilimi({
    iadeAdedi: 1,
    girecekSaglamAdet: 1,
    defterdekiStok: 0,
    sonBilinenMaliyetVarMi: false,
  });
  kontrol(
    "hiç maliyet geçmişi yoksa DURUR (maliyet uydurulmaz)",
    maliyetsiz.hata === "MALIYET_BILINMIYOR",
  );
  kontrol(
    "  ...ve bu bir STOK hatası olarak adlandırılmaz",
    maliyetsiz.hata !== null && !String(maliyetsiz.hata).includes("STOK"),
  );

  // --- DEĞİŞİMDE GİDECEK ÜRÜN: STOK ŞARTI DEVAM EDİYOR ---
  const kaynak = readFileSync("src/lib/iade.ts", "utf8");
  kontrol(
    "değişimde gidecek ürüne stok kontrolü UYGULANIYOR (kural kalktı sanılmasın)",
    kaynak.includes("const partiler = await acikPartiler(tx, g.exchangeVariantId)") &&
      kaynak.includes("throw new DegisimStokYokHatasi("),
  );
  kontrol(
    "geri gelen mal artık DegisimStokYokHatasi FIRLATMIYOR",
    !kaynak.includes("throw new DegisimStokYokHatasi(\n            donenVaryantId"),
  );
  kontrol(
    "geri gelen için AYRI hata tipi var (doğru rolü söyler)",
    kaynak.includes("DonenMaliyetYokHatasi") &&
      kaynak.includes("donenMalDagilimi({"),
  );

  const eylem2 = readFileSync(
    "src/app/satislar/[id]/iade/actions.ts",
    "utf8",
  );
  kontrol(
    "ekran bu hatayı AYRI mesajla gösteriyor",
    eylem2.includes("DonenMaliyetYokHatasi") &&
      eylem2.includes("donenMaliyetYok"),
  );
  const sozluk6 = JSON.parse(readFileSync("messages/tr.json", "utf8"));
  kontrol(
    "mesaj stok yetersizliği DEMİYOR, maliyeti işaret ediyor",
    typeof sozluk6.Iade?.donenMaliyetYok === "string" &&
      sozluk6.Iade.donenMaliyetYok.includes("maliyet"),
  );
  kosanBolumler.push("donen-mal");
}

// ===========================================================================
console.log("\n8) GERİ ALINAMAZ GEÇİŞ — ONAY ZORUNLU");
// ===========================================================================
/**
 * Kullanıcı T4'ün ortasında yanlışlıkla "İtiraz açıldı"ya bastı. Bildirim
 * itiraz dalına düştü, "İadeyi işle" kapandı ve MAL_GELDI'ye dönüş olmadığı
 * için akış kilitlendi — tek tık, geri dönüş yok, onay da sorulmamıştı.
 */
{
  const durumlar = Object.keys(IZINLI_GECISLER) as (keyof typeof IZINLI_GECISLER)[];

  /**
   * ÖNCE İDDİANIN KENDİSİ: bu makinede hiçbir kenar geriye gitmiyor mu?
   * Onay kuralının gerekçesi bu; gerekçe çürürse kural da gözden geçirilmeli.
   *
   * ⚠ TEK BEYAN EDİLMİŞ İSTİSNA: `ASKIDA` (23.08.2026).
   *
   * "Askıda İadeler" bizim SEÇTİĞİMİZ bir durum değil, iadenin BAŞINA GELEN
   * bir durum (kargo problemi, statü uyumsuzluğu, pazaryerinin ek
   * incelemesi — docs/iade-sureci.md §2). Arıza çözülünce iade kaldığı
   * yerden devam eder; ileri bir kapıya zorlamak, çözülmüş bir iadeyi
   * YANLIŞ duruma sokardı.
   *
   * ⚠ İSTİSNA ADIYLA BEYAN EDİLİYOR, ölçüt gevşetilmiyor: `ASKIDA` dışında
   * geri dönüş çıkarsa kontrol yine kırmızı yanar. Beyan edilmeyen bir
   * istisna, kuralın sessizce kalkması olurdu.
   */
  const geriDonenler: string[] = [];
  for (const kaynak of durumlar) {
    for (const hedef of IZINLI_GECISLER[kaynak]) {
      if (kaynak === "ASKIDA" || hedef === "ASKIDA") continue;
      if (IZINLI_GECISLER[hedef].includes(kaynak)) {
        geriDonenler.push(`${kaynak}<->${hedef}`);
      }
    }
  }
  kontrol(
    "ASKIDA dışında hiçbir geçiş geri alınamıyor (onay kuralının gerekçesi)",
    geriDonenler.length === 0,
    geriDonenler,
  );
  /**
   * İSTİSNANIN KENDİSİ DE ÖLÇÜLÜR: `ASKIDA` gerçekten geri dönüşlü olmalı.
   * Biri onu tek yönlü yapıp beyanı unutursa, yukarıdaki muafiyet sessizce
   * bir hiçbir şeyi korumayan satıra döner.
   */
  kontrol(
    "  ...ve ASKIDA gerçekten geri dönüşlü (istisna boşa yazılmamış)",
    IZINLI_GECISLER.ASKIDA.some((h) => IZINLI_GECISLER[h].includes("ASKIDA")),
  );

  for (const hedef of durumlar) {
    kontrol(`  ${hedef} geçişi onay istiyor`, gecisOnayIster(hedef));
  }

  const durumBileseni = readFileSync(
    "src/app/iadeler/bildirim-durumu.tsx",
    "utf8",
  );
  kontrol(
    "düğme onay diyaloğuna sarılı (tek tıkla geçiş yok)",
    durumBileseni.includes("gecisOnayIster(s.hedef)") &&
      durumBileseni.includes("AlertDialog"),
  );
  const sozluk7 = JSON.parse(readFileSync("messages/tr.json", "utf8"));
  kontrol(
    "onay metni GERİ ALINAMAZ diyor",
    typeof sozluk7.Bildirim2?.gecisOnayAciklama === "string" &&
      sozluk7.Bildirim2.gecisOnayAciklama.includes("GERİ ALINAMAZ"),
  );

  /** Satış kutusu ne beklediğini söylüyor mu (aynı tuzağa iki kez düşüldü). */
  const bForm2 = readFileSync("src/app/iadeler/bildirim-formu.tsx", "utf8");
  kontrol(
    "satış seçme kutusu ne aranacağını SÖYLÜYOR",
    bForm2.includes("satisIpucu") &&
      typeof sozluk7.Bildirim2?.satisIpucu === "string" &&
      sozluk7.Bildirim2.satisIpucu.includes("talep no"),
  );
  /**
   * İPUCU PENCERENİN İÇİNDE DE OLMALI. Alanın altına yazılan metin pencere
   * açıkken görünmüyor — kullanıcı tam da ararken göremiyordu ve iki kez
   * talep no'yu satış penceresine yazdı.
   */
  kontrol(
    "  ...ve ipucu ARAMA PENCERESİNİN İÇİNDE de duruyor",
    bForm2.includes('ipucu={t("satisPencereIpucu")}') &&
      typeof sozluk7.Bildirim2?.satisPencereIpucu === "string" &&
      sozluk7.Bildirim2.satisPencereIpucu.includes("Sipariş numarasıyla"),
  );
  const secimBileseni = readFileSync(
    "src/components/aranabilir-secim.tsx",
    "utf8",
  );
  kontrol(
    "  ...bileşen ipucunu arama kutusunun ALTINA çiziyor",
    secimBileseni.includes("{ipucu ? <p"),
  );
  kosanBolumler.push("gecis-onayi");
}

// ===========================================================================
console.log("\n9) DOSYA YÜKLEME — BEYAN EDİLEN SINIR TAŞINABİLİR OLMALI");
// ===========================================================================
/**
 * T5 CANLI ÇÖKMESİ: itiraz kanıtı yüklenirken sayfa "This page couldn't
 * load" ile düştü.
 *
 * MEVCUT TESTLER NEDEN YAKALAMADI — kör nokta tam olarak burasıydı:
 * 3. bölüm `ekiDogrula`yı sınıyordu ve "5 MB tam sınırda KABUL EDİLİR"
 * diyordu. Kural doğru uygulanıyordu; sorun KURALIN KENDİSİNDEYDİ. Sistem
 * taşıyamayacağı bir boyutu kabul edeceğini beyan ediyordu: Server Action
 * gövdesi varsayılan 1 MB ve bu sınır ÇERÇEVE KATMANINDA uygulanıyor, yani
 * istek bizim koda hiç ulaşmadan 500 dönüyor. Saf doğrulayıcı testi bunu
 * göremezdi çünkü hiçbir şey TAŞIMIYORDU — dosya hiç gönderilmiyordu.
 *
 * Eksik olan kontrol "sınır doğru mu uygulanıyor" değil,
 * "SINIR TESLİM EDİLEBİLİR Mİ" idi. Aşağıdaki ilk kontrol o.
 */
{
  /** ASIL KİLİT: beyan edilen sınır taşıma tavanının ALTINDA kalmalı. */
  kontrol(
    "beyan edilen dosya sınırı taşıma tavanının ALTINDA",
    EK_SINIRLARI.enFazlaBayt < TASIMA_SINIRI,
    [EK_SINIRLARI.enFazlaBayt, TASIMA_SINIRI],
  );
  kontrol(
    "  ...ve multipart başlıkları için pay kalıyor (en az 256 KB)",
    TASIMA_SINIRI - EK_SINIRLARI.enFazlaBayt >= 256 * 1024,
    TASIMA_SINIRI - EK_SINIRLARI.enFazlaBayt,
  );

  const dosya = (mb: number, tur = "image/jpeg", ad = "kanit.jpg") => ({
    dosyaAdi: ad,
    mimeType: tur,
    sizeBytes: Math.round(mb * 1024 * 1024),
    mevcutEkSayisi: 0,
    hedefTipi: "ReturnNotice",
  });

  kontrol("4 MB tam sınırda kabul", ekiDogrula(dosya(4)).length === 0);
  kontrol(
    "5 MB REDDEDİLİR (eskiden kabul ediliyordu — çökmenin kaynağı)",
    ekiDogrula(dosya(5)).includes("DOSYA_COK_BUYUK"),
  );

  /**
   * RED BİR HATA DEĞERİDİR, İSTİSNA DEĞİL. `ekiDogrula` hiçbir girdide
   * throw etmemeli: istemci onu doğrudan çağırıyor ve fırlatırsa ekran
   * error boundary'ye düşer — düzeltmeye çalıştığımız çökmenin ta kendisi.
   */
  const zorGirdiler = [
    dosya(99),
    dosya(0),
    dosya(1, "application/zip", "a.zip"),
    dosya(1, "image/png", "a.exe"),
    { ...dosya(1), dosyaAdi: "" },
    { ...dosya(1), mimeType: "" },
    { ...dosya(1), hedefTipi: "Yok" },
    { ...dosya(1), mevcutEkSayisi: 999 },
  ];
  let firlatti = false;
  for (const g of zorGirdiler) {
    try {
      ekiDogrula(g);
    } catch {
      firlatti = true;
    }
  }
  kontrol("hiçbir girdide İSTİSNA fırlatmıyor (hata DEĞER olarak döner)", !firlatti);

  // --- YÜKLEME YOLU ---
  const ekBileseni = readFileSync("src/app/iadeler/ekler.tsx", "utf8");
  kontrol(
    "istemci dosyayı GÖNDERMEDEN ÖNCE eliyor (aynı saf kural)",
    ekBileseni.includes("ekiDogrula({"),
  );
  kontrol(
    "yükleme Route Handler'a gidiyor (Server Action gövde sınırına takılmaz)",
    ekBileseni.includes('fetch("/api/ekler"'),
  );
  kontrol(
    "  ...ve istek try/catch içinde (ağ hatası ekranı çökertmez)",
    ekBileseni.includes("} catch {") && ekBileseni.includes("hataYUKLENEMEDI"),
  );
  kontrol(
    "tanınmayan hata kodu sözlüğü patlatmıyor (t.has ile korunuyor)",
    ekBileseni.includes("t.has(anahtar)"),
  );

  const ekAction = readFileSync("src/app/iadeler/ek-actions.ts", "utf8");
  kontrol(
    "çöken Server Action KALDIRILDI (tek yol kaldı)",
    !ekAction.includes("export async function ekYukle"),
  );

  const ekRota = readFileSync("src/app/api/ekler/route.ts", "utf8");
  kontrol(
    "rota her hatayı KOD olarak döndürüyor (istisna dışarı taşmıyor)",
    ekRota.includes("} catch (e) {") && ekRota.includes('hataDon("YUKLENEMEDI")'),
  );
  kontrol(
    "  ...depo yapılandırılmamışsa da kibar cevap",
    ekRota.includes('hataDon("DEPO_YOK")'),
  );
  /**
   * JETON SUNUCUDA KALIR. İstemci bileşeninde jeton adı geçmemeli; geçseydi
   * derleyici onu istemci paketine koymaya çalışırdı.
   */
  /**
   * DEPO ÖZEL — YÜKLEME DE ÖZEL OLMALI. T5'in ikinci hatası buydu: kod
   * `access: "public"` gönderiyordu, depo private'tı ve SDK her yüklemede
   * "Cannot use public access on a private store" ile patlıyordu. Kodun
   * kendi yorumu "ÖZEL erişim" diyordu — yorum doğru, parametre yanlıştı.
   */
  kontrol(
    'yükleme ÖZEL erişimle yapılıyor (depo private — "public" patlatıyor)',
    ekRota.includes('access: "private"') && !ekRota.includes('access: "public"'),
  );
  kontrol(
    "  ...ve kalıcı olan YOL saklanıyor (özel depoda ham URL açılmaz)",
    ekRota.includes("blobPath: yuklenen.pathname"),
  );

  const indirmeRotasi = readFileSync(
    "src/app/api/ekler/[id]/route.ts",
    "utf8",
  );
  kontrol(
    "indirme kendi ucumuzdan ve YETKİ KONTROLÜYLE geçiyor",
    indirmeRotasi.includes('yetkiIste("iade.gor")') &&
      indirmeRotasi.includes('access: "private"'),
  );
  kontrol(
    "  ...özel dosya önbelleğe alınmıyor",
    indirmeRotasi.includes("no-store"),
  );
  kontrol(
    "ekran ham Blob adresine bağlantı VERMİYOR",
    ekBileseni.includes("`/api/ekler/${e.id}`") &&
      !ekBileseni.includes("href={e.blobPath}"),
  );

  kontrol(
    "blob jetonu istemci bileşeninde GEÇMİYOR",
    !ekBileseni.includes("BLOB_READ_WRITE_TOKEN"),
  );
  kontrol(
    "  ...yalnız sunucu tarafında okunuyor",
    ekRota.includes("process.env.BLOB_READ_WRITE_TOKEN"),
  );

  const sozluk8 = JSON.parse(readFileSync("messages/tr.json", "utf8"));
  kontrol(
    "sınır metni 4 MB diyor (beyan ile kural tutuyor)",
    typeof sozluk8.Ekler?.hataDOSYA_COK_BUYUK === "string" &&
      sozluk8.Ekler.hataDOSYA_COK_BUYUK.includes(
        String(EK_SINIRLARI.enFazlaBayt / (1024 * 1024)),
      ),
    sozluk8.Ekler?.hataDOSYA_COK_BUYUK,
  );
  kosanBolumler.push("dosya-yukleme");
}

// ===========================================================================
console.log("");
// ===========================================================================
console.log("\n10) AÇIK BİLDİRİM ÖLÇÜTÜ VE İADE EKRANI DÜZENİ");
// ===========================================================================
/**
 * ⚠ ÖLÇÜT ÖDÜNÇ ALINMIŞTI (22.08.2026, ölçümle bulundu).
 *
 * Panelin görev kutusu ve iade ekranındaki "bekleyen" rozeti
 * `AYRILMIS_SAYILAN_DURUMLAR` sayıyordu. O liste DEĞİŞİM İÇİN AYRILAN
 * STOĞU ölçmek için yazılmış ve `ITIRAZ_KABUL` ile `ITIRAZ_RED`i bilerek
 * dışarıda bırakıyor.
 *
 * Sonuç: `ITIRAZ_RED` — yani "itirazı kaybettik, iadeyi İŞLEMEMİZ gerek" —
 * hiçbir yerde bekleyen sayılmıyordu. Sistem bir yandan "İadeyi işle"
 * düğmesini açık çiziyor, öbür yandan o kaydı bekleyen işlerden saymıyordu.
 *
 * Panelin kendi YORUMU zaten doğruyu yazıyordu ("kapanmış/iptal olan
 * sayılmaz"); uygulaması ondan dardı ve bu bekçi de yanlış deseni
 * kilitliyordu. Aşağıdaki kontroller ölçütü DEĞERDEN sınıyor.
 */
{
  const durumlar = Object.keys(
    IZINLI_GECISLER,
  ) as (keyof typeof IZINLI_GECISLER)[];

  /* Açık küme durum makinesinden TÜRÜYOR: çıkışı olan açık, olmayan kapalı. */
  kontrol(
    "açık küme durum makinesiyle birebir (çıkışı olan = açık)",
    durumlar.every((d) => ACIK_BILDIRIM_DURUMLARI.includes(d) === !kapaliMi(d)),
    ACIK_BILDIRIM_DURUMLARI,
  );
  kontrol(
    "  ...KAPANDI açık sayılmıyor",
    !ACIK_BILDIRIM_DURUMLARI.includes("KAPANDI"),
  );
  kontrol(
    "  ...IPTAL açık sayılmıyor",
    !ACIK_BILDIRIM_DURUMLARI.includes("IPTAL"),
  );

  /**
   * ⚠ ASIL DEĞİŞMEZ BU. "İadeyi işle" düğmesinin açık olduğu her durum
   * bekleyen sayılmak ZORUNDA; olmazsa sistem yapılacak bir işi hem
   * gösterir hem saymaz. Eski ölçüt tam burada düşüyordu (ITIRAZ_RED).
   */
  const sayilmayan = IADE_ISLENEBILIR.filter(
    (d) => !ACIK_BILDIRIM_DURUMLARI.includes(d),
  );
  kontrol(
    "işlenebilir her durum BEKLEYEN sayılıyor (ITIRAZ_RED vakası)",
    sayilmayan.length === 0,
    sayilmayan,
  );
  kontrol(
    "  ...eski ölçüt bu vakayı GERÇEKTEN kaçırıyordu (gerekçe hâlâ geçerli)",
    IADE_ISLENEBILIR.some((d) => !AYRILMIS_SAYILAN_DURUMLAR.includes(d)),
  );

  /**
   * ⚠ STOK DAVRANIŞI DEĞİŞMEDİ. Ayrılan stok listesi kendi işinde kaldı;
   * genişletilseydi kapanmış bildirimler stok ayırmaya devam ederdi.
   */
  kontrol(
    "ayrılan stok listesi DAR kaldı (açık kümenin alt kümesi)",
    AYRILMIS_SAYILAN_DURUMLAR.every((d) =>
      ACIK_BILDIRIM_DURUMLARI.includes(d),
    ) && AYRILMIS_SAYILAN_DURUMLAR.length < ACIK_BILDIRIM_DURUMLARI.length,
  );

  /* Panel ile ekran AYNI ölçütü kullanmalı — yoksa "sayı = liste" bozulur. */
  const gorev = readFileSync("src/lib/panel/gorev-verisi.ts", "utf8");
  kontrol(
    "panel görev kutusu da açık kümeyi sayıyor",
    /returnNotice\.count\(\{\s*where: \{ status: \{ in: ACIK_BILDIRIM_DURUMLARI \} \}/.test(
      gorev,
    ),
  );

  // ── EKRAN DÜZENİ ──────────────────────────────────────────────────────
  const sayfa10 = readFileSync("src/app/iadeler/page.tsx", "utf8");

  kontrol(
    "ekran üç sekmeye ayrıldı",
    ["SEKME_BILDIRIM", "SEKME_ISLENMIS", "SEKME_KIRILIM"].every((k) =>
      sayfa10.includes(`anahtar: ${k},`),
    ),
  );
  kontrol(
    "  ...seçim ADRESTE yaşıyor (geri tuşu çalışsın)",
    sayfa10.includes('suzgecAdresi("/iadeler", p, { sekme:'),
  );
  kontrol(
    "  ...sekme değişince sayfa numarası sıfırlanıyor",
    /\{ sekme: anahtar, sayfa: "" \}/.test(sayfa10),
  );

  /**
   * ⚠ DESEN KULLANIM BLOĞUNDA ARANIR. `SuzgecCubugu` sayfada iki kez
   * geçiyor; dosyanın tamamında arasaydık "bildirim sekmesinde süzgeç yok"
   * kontrolü hiçbir zaman kırmızı yanmazdı.
   */
  const kes = (bas: string, son: string) => {
    const a = sayfa10.indexOf(bas);
    const b = sayfa10.indexOf(son);
    return a !== -1 && b > a ? sayfa10.slice(a, b) : "";
  };
  const bildirimBloku = kes(
    "const bildirimIcerigi = (",
    "const islenmisIcerigi = (",
  );
  const islenmisBloku = kes(
    "const islenmisIcerigi = (",
    "const kirilimIcerigi = (",
  );
  /**
   * ⚠ BİTİŞ İŞARETİ TEKİL OLMALI. İlk yazımda `"  return ("` kullanıldı ve
   * kontrol KIRMIZI yandı: o desen dosyada İKİ kez geçiyor ve ilki
   * (`turGecerliMi` içindeki) kırılım bloğundan ÖNCE. `indexOf` onu buluyor,
   * dilim negatif çıkıyor ve blok hiç kesilemiyordu. Deponun beş kez
   * düştüğü tuzağın aynısı — desen ada değil, KULLANIM YERİNE bağlanır.
   */
  const kirilimBloku = kes("const kirilimIcerigi = (", "<SekmeliBolum");
  for (const [ad, blok] of [
    ["bildirim", bildirimBloku],
    ["islenmis", islenmisBloku],
    ["kirilim", kirilimBloku],
  ] as const) {
    kontrol(`  ...${ad} bloğu kesilebildi`, blok.length > 0);
  }

  /**
   * ⚠ SÜZGEÇ YALNIZ ETKİLEDİĞİ SEKMEDE. Eskiden dönem süzgeci bildirimlerin
   * ALTINDAydı ama onları süzmüyordu: dönem değiştirilince üstteki liste
   * kıpırdamıyordu ve kullanıcı sistemin kendisini dinlemediğini sanıyordu.
   */
  kontrol(
    "dönem süzgeci bildirim sekmesinde YOK",
    !bildirimBloku.includes("<SuzgecCubugu"),
  );
  kontrol(
    "  ...işlenmiş sekmesinde VAR",
    islenmisBloku.includes("<SuzgecCubugu"),
  );
  kontrol("  ...kırılım sekmesinde VAR", kirilimBloku.includes("<SuzgecCubugu"));

  /**
   * ⚠ BAŞLIK İLE İÇERİK ARTIK ÇELİŞMİYOR. Canlıda ölçüldü (22.08.2026):
   * rozet `0` derken altında 9 KAPANMIŞ kayıt listeleniyordu.
   */
  kontrol(
    "bildirim listesi varsayılan olarak AÇIK olanları gösteriyor",
    /\? \(istenenDurum as BildirimSuzgeci\)\s*:\s*"acik"/.test(sayfa10),
  );
  kontrol(
    "  ...kapalı küme açık kümeden TÜRETİLİYOR (ikinci liste yok)",
    sayfa10.includes("status: { notIn: ACIK_BILDIRIM_DURUMLARI }"),
  );
  kontrol(
    "  ...üç durum seçeneği de ekranda",
    bildirimBloku.includes("BILDIRIM_SUZGECLERI.map("),
  );
  /**
   * BOŞ LİSTE NEDEN BOŞ — süzgece göre değişir (İlke #5). Tek cümle
   * kullanılsaydı "kapanmış" süzgecindeyken yalan söylerdi.
   */
  for (const anahtar of [
    "bildirimYok",
    "kapanmisBildirimYok",
    "hicBildirimYok",
  ]) {
    kontrol(
      `  ...boş mesaj süzgece bağlı: ${anahtar}`,
      sayfa10.includes(`t("${anahtar}")`),
    );
  }
  kontrol(
    "yeni bildirim formu KATLANIR (liste yer kaybetmesin)",
    bildirimBloku.includes("<KatlanirBolum") &&
      bildirimBloku.includes("<BildirimFormu"),
  );
  /**
   * ⚠ ARAMA SEKMEDEN DÜŞÜRMÜYOR. Gizli alanlar olmadan arama yapan
   * kullanıcı bildirim sekmesinden çıkar ve süzgeci sıfırlanır.
   */
  /**
   * ⚠ GİZLİ ALANLAR KALKTI, `tasinanlar` GELDİ. Arama artık ortak bileşenden
   * geçiyor ve süzgeçleri gizli `<input>`larla değil adres üreterek taşıyor.
   * Korunan şey aynı: arama yapan kullanıcı sekmeden düşmemeli ve "açık"
   * süzgeci sıfırlanmamalı.
   */
  kontrol(
    "arama sekmeyi ve durum süzgecini koruyor",
    /sekme: SEKME_BILDIRIM/.test(bildirimBloku) &&
      /bdurum: bDurum/.test(bildirimBloku),
  );

  const sozluk10 = JSON.parse(readFileSync("messages/tr.json", "utf8"));
  for (const anahtar of [
    "sekmeBildirimler",
    "sekmeIslenmis",
    "sekmeKirilim",
    "durumAcik",
    "durumKapanmis",
    "durumHepsi",
    "yeniBildirim",
  ]) {
    kontrol(
      `  sözlük: ${anahtar}`,
      typeof sozluk10.Iadeler?.[anahtar] === "string" &&
        sozluk10.Iadeler[anahtar].length > 0,
    );
  }
  /**
   * ⚠ "EN ÇOK" BİR SIRALAMA İDDİASIDIR. Canlıda 5 ürünün beşi de 1 adet:
   * sıralanacak bir şey yokken "en çok iade edilen" demek, sahip olunmayan
   * bir anlamı iddia etmektir. Başlık her hacimde doğru olanla değişti.
   */
  kontrol(
    "ürün tablosu sıralama iddiası taşımıyor",
    sayfa10.includes('t("iadeEdilenUrunler")') &&
      !sayfa10.includes('t("enCokIade")'),
  );


  // ── PAZARYERİ AKIŞIYLA HİZALAMA (23.08.2026) ──────────────────────────
  /**
   * Kaynak: docs/iade-sureci.md. Modelimiz akışın yarısını tutuyordu;
   * eksik aşamalar eklendi. Kontroller DEĞERDEN sınıyor — enum'un kendisi
   * ve geçiş haritası, kaynak metni değil.
   */
  for (const yeni of ["KARGOYA_VERILDI", "ANALIZ", "ASKIDA"] as const) {
    kontrol(
      `akış aşaması modelde var: ${yeni}`,
      (Object.keys(IZINLI_GECISLER) as string[]).includes(yeni),
    );
  }

  /**
   * ⚠ "KARGOYA VERİLDİ" ATLANABİLİR OLMALI. Bildirim geç girilmiş olabilir;
   * operasyoncuyu var olmayan bir ara adıma zorlamak sırf model güzel
   * görünsün diye fazladan tık demektir (İlke #9).
   */
  kontrol(
    "  ...ama ara adım ZORUNLU değil (BEKLENIYOR'dan doğrudan MAL_GELDI)",
    IZINLI_GECISLER.BEKLENIYOR.includes("MAL_GELDI"),
  );

  /**
   * ⚠ ANALİZ DOĞRUDAN KAPANAMAZ. Sonuç ne olursa olsun yapılacak bir iş
   * kalıyor — ürün geri gönderilecek ya da iade işlenecek — ve o iş kendi
   * durumunda görünmeli. `KAPANDI` kısayolu, serviste 28 gün bekleyen bir
   * ürünü tek tıkla "bitti" yapardı.
   */
  kontrol(
    "analiz doğrudan KAPANDI'ya gidemiyor",
    !IZINLI_GECISLER.ANALIZ.includes("KAPANDI"),
  );
  kontrol(
    "  ...iki kapıdan birine gidiyor (geri gönder / iade onayla)",
    IZINLI_GECISLER.ANALIZ.includes("ITIRAZ_KABUL") &&
      IZINLI_GECISLER.ANALIZ.includes("ITIRAZ_RED"),
  );

  /**
   * ⚠ ASKIDA HER AŞAMADAN ERİŞİLEBİLİR OLMALI. İadenin BAŞINA GELEN bir
   * durum; yalnız bir aşamadan girilebilseydi, öteki aşamalarda takılan
   * iade hiçbir yerde görünmezdi.
   */
  /**
   * ⚠ ÖLÇÜT "BİRDEN ÇOK" DEĞİL, "HEPSİ" — mutasyon ilkini geçirdi.
   * İlk yazımda `>= 4` denmişti; bir aşamadan ASKIDA kaldırıldığında sayı
   * 4'te kaldı ve kontrol yeşil yandı. Uydurma bir alt sınır, kuralı
   * korumaz. Doğru ölçüt ilkeseldir: askıya düşmek iadenin BAŞINA GELİR,
   * yani AÇIK olan her aşamadan mümkün olmalı.
   */
  const acikAsamalar = ACIK_BILDIRIM_DURUMLARI.filter((d) => d !== "ASKIDA");
  const askiyaGidemeyen = acikAsamalar.filter(
    (d) => !IZINLI_GECISLER[d].includes("ASKIDA"),
  );
  kontrol(
    "askıya AÇIK olan her aşamadan girilebiliyor",
    askiyaGidemeyen.length === 0,
    askiyaGidemeyen,
  );

  /**
   * ⚠ YENİ AŞAMALAR "AÇIK" SAYILMALI. `ACIK_BILDIRIM_DURUMLARI` durum
   * makinesinden türüyor, yani bu kendiliğinden doğru olmalı — ama tam da
   * bu yüzden sınanır: türetme bozulursa üç yeni aşama sessizce bekleyen
   * işlerden düşerdi ve panel rozeti eksik sayardı.
   */
  for (const yeni of ["KARGOYA_VERILDI", "ANALIZ", "ASKIDA"] as const) {
    kontrol(
      `  ...${yeni} bekleyen iş sayılıyor`,
      ACIK_BILDIRIM_DURUMLARI.includes(yeni),
    );
  }

  /**
   * ════════════════════════════════════════════════════════════════════
   *  OLGUSAL DÜZELTME KİLİDİ — "ürün müşteride kalır" GERİ GELMESİN
   * --------------------------------------------------------------------
   *  Şema ve sözlük `ITIRAZ_KABUL` için _"ürün müşteride kalır"_ diyordu.
   *  ÖLÇÜLDÜ ve YANLIŞ çıktı: ürün "Aksiyon Bekleyen" aşamasında bize
   *  gelmişti; itirazı kazanınca kargo kodu alınıp 2 iş günü içinde geri
   *  gönderiliyor (docs/iade-sureci.md §5).
   *
   *  Para tarafı zaten doğruydu (`Return` doğmuyor); yanlış olan GEREKÇEYDİ
   *  ve o yüzden fiziksel iş görünmüyordu. Bu kontrol yanlış cümlenin geri
   *  dönmesini engelliyor — bir yorum kendini savunamaz.
   * ════════════════════════════════════════════════════════════════════
   */
  const sema = semaMetni();
  /**
   * ⚠ CÜMLEYİ ARAMAK YETMEZ — "ESKİ GEREKÇE SİLİNMEZ" KURALI VAR.
   *
   * Yanlış cümle, DÜZELTİLDİĞİ BEYAN EDİLEREK dosyada kalabilir (CLAUDE.md:
   * _"Karar çevrildiğinde önceki savunma, NİYE çevrildiğiyle birlikte
   * dosyada bırakılır"_). İlk yazımda düz arama yapıldı ve kontrol kendi
   * düzeltme notumu suçladı.
   *
   * Doğru ölçüt: cümle geçiyorsa YAKININDA "YANLIŞ" beyanı olmalı. Yani
   * yasak olan cümlenin VARLIĞI değil, HÜKÜM OLARAK kurulması.
   */
  /**
   * ⚠ YAKINLIK PENCERESİ YETMEDİ — mutasyon geçti. İlk yazımda "±400
   * karakterde YANLIŞ geçiyorsa muaf" denmişti; yanlış cümleyi düzeltme
   * notunun HEMEN ÜSTÜNE koyan mutasyon o pencereye düştü ve kontrol
   * yeşil kaldı. Yakınlık bir ölçüt değil, tesadüftür.
   *
   * Doğru ölçüt BİÇİMSEL: eski sürüm ALINTIDIR ve alıntı olarak yazılır
   * (`_"..."_`). Önce bütün alıntılar metinden düşürülür; kalan yerde
   * cümle geçiyorsa o bir HÜKÜMDÜR ve yasaktır.
   */
  const bayatCumle = (metin: string) => {
    const alintisiz = metin.replace(/_"[\s\S]*?"_/g, " ");
    return [...alintisiz.matchAll(/ürün müşteride kal[a-zı]*/gi)];
  };
  for (const [ad, yol] of [
    ["şema", "prisma/schema.prisma"],
    ["durum makinesi", "src/lib/iade/bildirim.ts"],
  ] as const) {
    const kacak = bayatCumle(readFileSync(yol, "utf8"));
    kontrol(
      `${ad}: 'ürün müşteride kalır' artık HÜKÜM olarak kurulmuyor`,
      kacak.length === 0,
      kacak.map((m) => m[0]),
    );
  }
  const sozluk10b = JSON.parse(readFileSync("messages/tr.json", "utf8")) as {
    Bildirim2?: Record<string, string>;
    BildirimGecisi?: Record<string, string>;
    BildirimDurumu?: Record<string, string>;
  };
  kontrol(
    "  ...sözlük de demiyor",
    !/müşteride kald/i.test(
      JSON.stringify([
        sozluk10b.Bildirim2,
        sozluk10b.BildirimGecisi,
        sozluk10b.BildirimDurumu,
      ]),
    ),
  );
  /**
   * VE DOĞRUSU YAZIYOR: kazanılan itirazdan sonra YAPILACAK İŞ var.
   * "Yanlış cümle yok" tek başına yetmez — doğru cümlenin varlığı ayrı
   * sınanır, yoksa metin sessizce boşalabilir.
   */
  kontrol(
    "  ...ve yerine YAPILACAK İŞ yazıyor (kargo kodu + geri gönderim)",
    /kargo kodu/i.test(sozluk10b.BildirimGecisi?.siradakiItirazKabul ?? "") &&
      /geri gönder/i.test(
        sozluk10b.BildirimGecisi?.siradakiItirazKabul ?? "",
      ),
  );

  /**
   * ⚠ İKİ SAAT, İKİ SÜTUN. `otomatikOnayTarihi` ONLARIN ne zaman otomatik
   * onaylayacağı (olgu); `islemSonTarihi` BİZİM ne zamana kadar yapmamız
   * gerektiği (yükümlülük). Tek sütuna sıkıştırılsaydı biri ötekini ezerdi.
   */
  for (const alan of ["otomatikOnayTarihi", "islemSonTarihi"]) {
    kontrol(`şemada ayrı sütun: ${alan}`, sema.includes(`${alan} DateTime?`));
  }
  /**
   * ⚠ OTOMATİK ONAY TARİHİ HESAPLANMAZ, KAYDEDİLİR. Kuralı ölçemedik
   * (docs/iade-sureci.md §8.1: iki kayıt ~34,6 ve ~15,8 gün verdi).
   * Bilmediğimiz bir kuraldan tarih türetmek, sistemin takip etmediği şey
   * hakkında iddia kurmaktır. Kodda böyle bir türetme OLMAMALI.
   */
  const bildirimEylem = readFileSync(
    "src/app/iadeler/bildirim-actions.ts",
    "utf8",
  );
  kontrol(
    "otomatik onay tarihi TÜRETİLMİYOR (gün ekleyerek hesaplanmıyor)",
    !/otomatikOnayTarihi[^;]{0,120}gunEkle/.test(bildirimEylem),
  );

  /**
   * ⚠ "GELİŞ YOLU" AYRI SÜTUN AÇMADAN TÜRETİLEBİLMELİ. "Reddedilen"e üç
   * yoldan gelinir ve üçünde kargoyu ödeyen taraf farklıdır; ayrı bir
   * sütun yerine `analizSonucu` + `itirazGerekcesi` yetiyor (şema
   * merdiveninde bir basamak tasarruf).
   */
  for (const alan of ["itirazGerekcesi", "analizSonucu"]) {
    kontrol(`  şemada var: ${alan}`, sema.includes(alan));
  }
  kontrol(
    "  ...ayrı bir 'geliş yolu' sütunu AÇILMAMIŞ (türetiliyor)",
    !/gelisYolu|reddedilmeYolu/i.test(sema),
  );

  /** Askıda KIRMIZI: sıradan bir ara durum değil, arıza. */
  kontrol(
    "askıda durumu OLUMSUZ renkte (sıradan bekleme değil)",
    BILDIRIM_DURUM_RENGI.ASKIDA === "olumsuz",
  );

  kosanBolumler.push("acik-olcut-ve-duzen");
}

// ===========================================================================
console.log("\n11) FORMUN SUNDUĞU GEREKÇE = SUNUCUNUN KABUL ETTİĞİ GEREKÇE");
// ===========================================================================
/**
 * CANLI HATA 23.08.2026 — kullanıcı bildirdi: _"ürün hasarlı gerekçesini
 * seçiyorum ama kaydetmiyor, gerekçe ekranı siliniyor bu uyarı çıkıyor"_
 * (_"Gerekçe seçilmeli."_).
 *
 * SEBEP: sunucu doğrulaması elle yazılmış YEDİ değerlik bir `z.enum`
 * dizisiydi. Şemaya yedi yeni gerekçe eklendi (`HASARLI`, `BOS_PAKET`,
 * `PARCA_EKSIK`…); açılır liste onları GÖSTERDİ — o taraf
 * `Record<ReturnReason, string>` ile derleyici kilidi altında — ama sunucu
 * TANIMADI ve kaydı reddetti.
 *
 * ⚠ NİYE HİÇBİR TEST YAKALAMADI: iki liste iki ayrı yerdeydi ve ikisi de
 * KENDİ İÇİNDE doğruydu. Kilit yalnız BİR tarafta vardı; öteki taraf
 * derleyicinin görmediği bir dize dizisiydi. Anayasa: _"tip listesi değil,
 * BAĞ"_ — elle sayılan her liste, yarın eklenecek değeri sessizce dışarıda
 * bırakır.
 *
 * ⚠ VE ÖLÇÜT METİN DEĞİL DAVRANIŞ. "Dosyada `IADE_GEREKCELERI` geçiyor mu"
 * diye baksaydık, biri yüklemin içine yeniden elle liste yazdığında desen
 * ayakta kalır ve kontrol yeşil yanardı. Yüklem ÇAĞRILIYOR ve formun
 * sunduğu her değer tek tek sınanıyor.
 */
{
  const reddedilenler = IADE_GEREKCELERI.filter((g) => !gecerliIadeGerekcesi(g));
  kontrol(
    `sunucu, formun sunduğu ${IADE_GEREKCELERI.length} gerekçenin HEPSİNİ kabul ediyor`,
    reddedilenler.length === 0,
    reddedilenler,
  );

  /** Kapı gerçekten kapı mı — her şeyi kabul eden yüklem yüklem değildir. */
  kontrol(
    "  ...tanımsız değer REDDEDİLİYOR (yüklem hep true dönmüyor)",
    !gecerliIadeGerekcesi("BOYLE_BIR_GEREKCE_YOK"),
  );

  /**
   * ŞEMA BÜYÜRSE FORM DA BÜYÜMELİ. Derleyici bunu zaten zorluyor
   * (`Record<ReturnReason, …>` exhaustive), ama kilit sessizce gevşetilirse
   * — biri `Partial<>` yazarsa — burada görünür.
   */
  const iadeSema = semaMetni();
  const gerekceGovdesi = iadeSema.slice(
    iadeSema.indexOf("enum ReturnReason {"),
    iadeSema.indexOf("}", iadeSema.indexOf("enum ReturnReason {")),
  );
  const semaGerekceleri = gerekceGovdesi
    .split("\n")
    .map((satir) => satir.replace(/\/\/.*$/, "").trim())
    .filter((satir) => /^[A-Z][A-Z0-9_]*$/.test(satir));
  const formsuzlar = semaGerekceleri.filter(
    (d) => !(IADE_GEREKCELERI as string[]).includes(d),
  );
  kontrol(
    `şemadaki ${semaGerekceleri.length} gerekçenin hepsi formda`,
    semaGerekceleri.length > 0 && formsuzlar.length === 0,
    formsuzlar,
  );

  /**
   * İKİ HATA AYRI SÖYLENİR. Boş bırakmak ile tanınmayan değer aynı mesajı
   * verirse ikinci durum birinci gibi görünür — kullanıcı seçtiği hâlde
   * "seçmedin" cevabı alır ve sistemin sustuğu yer hiç açılmaz. Bu hatanın
   * KEŞFEDİLMESİNİ geciktiren şey tam olarak buydu.
   */
  const gerekceEylemi = readFileSync(
    "src/app/iadeler/bildirim-actions.ts",
    "utf8",
  );
  const gerekceBloku = gerekceEylemi.slice(
    gerekceEylemi.indexOf("reason: z"),
    gerekceEylemi.indexOf("/** Değişim için ayrılan ürün"),
  );
  kontrol("gerekçe bloğu kesilebildi", gerekceBloku.length > 0);
  kontrol(
    "  ...BOŞ gerekçe ayrı mesaj veriyor",
    /\.min\(1, t\("gerekceZorunlu"\)\)/.test(gerekceBloku),
  );
  kontrol(
    "  ...TANIMSIZ gerekçe ayrı mesaj veriyor",
    /gerekceTanimsiz/.test(gerekceBloku),
  );
  /**
   * ⚠ İKİNCİ ŞART ELLE LİSTEYE DÖNÜŞÜ ENGELLER: blokta büyük harfli bir
   * enum dizesi geçiyorsa birileri kümeyi yeniden oraya yazmış demektir.
   */
  kontrol(
    "  ...kabul kümesi ORTAK yüklemden geliyor (elle liste değil)",
    /\.refine\(gecerliIadeGerekcesi/.test(gerekceBloku) &&
      !/"[A-Z][A-Z0-9_]{3,}"/.test(gerekceBloku),
  );

  kosanBolumler.push("gerekce-kapisi");
}

// ===========================================================================
console.log("\n12) SON TARİH SAYAÇLARI (K31 ①)");
// ===========================================================================
/**
 * Süresi dolan bir iade bildirimi pazaryeri tarafından OTOMATİK ONAYLANIR:
 * tutar ciromuzdan düşer ve itiraz hakkı biter. Yani bu sayaçlar bir
 * "hatırlatma" değil, PARA KORUMASIDIR.
 *
 * ⚠ YAZILAN HER TARİH TÜRETMEDİR, ÇIPA DEĞİL (mimar kararı 23.08.2026).
 * Sistemin kaydettiği bir olay anı yok; geçiş anından kural uygulanıyor ve
 * K31 migration'ında açılıp ÖLÜ DURAN iki sütuna yazılıyor (ölçüldü:
 * değişiklikten önce sıfır okuyucu, sıfır yazıcı).
 */
{
  const gun = (yil: number, ay: number, g: number) => new Date(Date.UTC(yil, ay - 1, g));
  const temel = {
    noticedAt: gun(2026, 8, 1),
    otomatikOnayTarihi: null,
    islemSonTarihi: null,
  };

  /**
   * ⚠ EXHAUSTIVE EŞLEME. Şemaya on ikinci bir durum eklenip sayacı
   * yazılmazsa TypeScript zaten derlemez; burada gevşetilmediği görülüyor
   * (biri `Partial<>` yazarsa kilit sessizce düşerdi).
   */
  const eslenmeyen = BILDIRIM_DURUMLARI.filter((d) => !(d in DURUM_SAYACI));
  kontrol(
    `${BILDIRIM_DURUMLARI.length} durumun hepsi sayaç eşlemesinde`,
    eslenmeyen.length === 0,
    eslenmeyen,
  );

  /** Beş sayaç: dördü ölçüldü, biri ÖLÇÜLMEDİ. */
  const olculen = SAYAC_TURLERI.filter((t) => SAYAC_KURALLARI[t].gun !== null);
  kontrol("dört sayaç ölçüldü", olculen.length === 4, olculen);
  kontrol(
    "geri gönderim ÖLÇÜLMEDİ (gün yok)",
    SAYAC_KURALLARI.GERI_GONDERIM.gun === null,
  );
  /**
   * ⚠ VE ÖLÇÜLMEMİŞ SAYAÇ TARİH SAKLAYAMAZ. Sütunu olsaydı biri oraya bir
   * tarih yazabilir ve ekranda ölçülmüş gibi görünürdü — mimar şartı: yanlış
   * çıpadan hesaplanan son tarih, hiç göstermemekten KÖTÜDÜR.
   */
  kontrol(
    "  ...ve sütunu YOK (yanlışlıkla tarih yazılamaz)",
    SAYAC_KURALLARI.GERI_GONDERIM.sutun === null,
  );

  /** Ölçülmüş gün sayıları — kaynak: docs/iade-sureci.md. */
  kontrol("müşteri kargoya versin = 7 gün", SAYAC_KURALLARI.MUSTERI_KARGOYA_VERSIN.gun === 7);
  kontrol("kargo bize ulaşsın = 10 gün", SAYAC_KURALLARI.KARGO_ULASSIN.gun === 10);
  kontrol("onay/red kararı = 2 gün", SAYAC_KURALLARI.ONAY_RED_KARARI.gun === 2);
  kontrol("analiz = 28 gün", SAYAC_KURALLARI.ANALIZ.gun === 28);

  /**
   * ⚠ SONUÇ YAZILI OLMALI. "3 gün kaldı" tek başına bir uyarı değildir:
   * süre dolunca İADE İPTAL OLMASI (lehimize) ile OTOMATİK ONAYLANMASI
   * (para kaybı) bambaşka iki şeydir ve aynı tepkiyi gerektirmez.
   */
  kontrol(
    "müşteri sayacı dolunca iade İPTAL olur (lehimize)",
    SAYAC_KURALLARI.MUSTERI_KARGOYA_VERSIN.sonuc === "IPTAL",
  );
  kontrol(
    "ötekiler dolunca OTOMATİK ONAY (para kaybı)",
    (["KARGO_ULASSIN", "ONAY_RED_KARARI", "ANALIZ"] as const).every(
      (t) => SAYAC_KURALLARI[t].sonuc === "OTOMATIK_ONAY",
    ),
  );

  /**
   * ⚠ ÇIPASI KAYITTA OLAN SAYAÇ SAKLANMAZ, HESAPLANIR. `noticedAt` zaten
   * kayıtta; son tarihi ayrıca yazmak aynı gerçeği iki yere koymak olurdu ve
   * biri gün gelip ötekinden ayrışırdı.
   */
  kontrol(
    "bildirim tarihinden gelen sayaç SAKLANMIYOR",
    SAYAC_KURALLARI.MUSTERI_KARGOYA_VERSIN.sutun === null &&
      SAYAC_KURALLARI.MUSTERI_KARGOYA_VERSIN.cipa === "BILDIRIM_TARIHI",
  );
  /**
   * ⚠ ÇIPASI BİZDE DOĞMAYAN SAYAÇ ELLE GİRİLİR. Kargoya veren MÜŞTERİDİR;
   * "geçiş anı" o olayın anı değildir ve geçiş anından hesaplamak sessizce
   * yanlış bir son tarih üretirdi.
   */
  kontrol(
    "kargo sayacının çıpası ELLE giriliyor (bizde doğmuyor)",
    SAYAC_KURALLARI.KARGO_ULASSIN.cipa === "ELLE_GIRILIR",
  );

  // ── İŞLEYEN SAYAÇ ────────────────────────────────────────────────────
  const bekleyen = isleyenSayac({ ...temel, status: "BEKLENIYOR" }, gun(2026, 8, 1));
  kontrol(
    "BEKLENIYOR → müşteri sayacı, 01.08 + 7 = 08.08",
    bekleyen?.sonTarih?.toISOString().slice(0, 10) === "2026-08-08",
    bekleyen?.sonTarih?.toISOString(),
  );
  kontrol("  ...kalan 7 gün", bekleyen?.kalanGun === 7);

  /**
   * ⚠ ÇIPA GİRİLMEMİŞSE TARİH UYDURULMAZ — ve boşluğun SEBEBİ yazılır.
   * "Tarih yok" iki apayrı şey olabilir: kural ÖLÇÜLMEDİ ya da veri EKSİK.
   * Tek kefeye konsaydı ikisi de düzeltilmezdi.
   */
  const cipasiz = isleyenSayac({ ...temel, status: "KARGOYA_VERILDI" }, gun(2026, 8, 1));
  kontrol(
    "KARGOYA_VERILDI + çıpa yok → tarih YOK, sebep CIPA_GIRILMEDI",
    cipasiz?.sonTarih === null && cipasiz?.bosluk === "CIPA_GIRILMEDI",
    cipasiz,
  );
  const cipali = isleyenSayac(
    { ...temel, status: "KARGOYA_VERILDI", otomatikOnayTarihi: gun(2026, 8, 20) },
    gun(2026, 8, 1),
  );
  kontrol(
    "  ...çıpa girilince sütundan okunuyor",
    cipali?.sonTarih?.toISOString().slice(0, 10) === "2026-08-20" &&
      cipali?.bosluk === null,
  );

  const geri = isleyenSayac({ ...temel, status: "ITIRAZ_KABUL" }, gun(2026, 8, 1));
  kontrol(
    "ITIRAZ_KABUL → satır VAR, tarih YOK, sebep OLCULMEDI",
    geri !== null && geri.sonTarih === null && geri.bosluk === "OLCULMEDI",
    geri,
  );

  /**
   * ⚠ AYRIMIN ÖTEKİ YAKASI: sayacı olmayan durumda `null` döner. "Saat
   * işlemiyor" ile "süre bitti" aynı şey değildir; boş bir sayaç satırı
   * ikincisi gibi okunurdu.
   */
  kontrol(
    "KAPANDI → sayaç YOK (null)",
    isleyenSayac({ ...temel, status: "KAPANDI" }, gun(2026, 8, 1)) === null,
  );
  kontrol(
    "ASKIDA → sayaç YOK (süreç durdu, saat işletmek yanlış bilgi olur)",
    isleyenSayac({ ...temel, status: "ASKIDA" }, gun(2026, 8, 1)) === null,
  );

  // ── EŞİK VE RENK ─────────────────────────────────────────────────────
  /**
   * ⚠ EŞİK SAYACIN KENDİ UZUNLUĞUNA BAĞLI ve bu bir SÖZLEŞME (ölçüm değil,
   * öyle beyan ediliyor). Sabit gün seçilseydi: "3 gün kala uyar" kuralı
   * 2 GÜNLÜK sayaçta HİÇ yanmaz, 28 günlükte ayın çeyreğinde yanardı.
   */
  kontrol("eşik 7 günlükte 2", acilEsigi(7) === 2);
  kontrol("eşik 10 günlükte 3", acilEsigi(10) === 3);
  kontrol("eşik 28 günlükte 7", acilEsigi(28) === 7);
  kontrol("eşik 2 günlükte EN AZ 1 (çeyrek yarım gün ederdi)", acilEsigi(2) === 1);

  const rahat = isleyenSayac({ ...temel, status: "BEKLENIYOR" }, gun(2026, 8, 1));
  const yakin = isleyenSayac({ ...temel, status: "BEKLENIYOR" }, gun(2026, 8, 7));
  const gecmis = isleyenSayac({ ...temel, status: "BEKLENIYOR" }, gun(2026, 8, 12));
  kontrol("süre rahatken nötr", rahat !== null && sayacRengi(rahat) === "notr");
  kontrol(
    "  ...eşiğe girince ZARAR rengi",
    yakin !== null && sayacRengi(yakin) === "olumsuz",
  );
  kontrol(
    "  ...süre geçmişse de ZARAR",
    gecmis !== null && sayacRengi(gecmis) === "olumsuz",
  );

  /**
   * ⚠ BİLİNMEYEN ACİL SAYILMAZ — BU BÖLÜMÜN EN ÖNEMLİ SATIRI.
   * Kalan süresi BİLİNMEYEN bir kaydı çana düşürmek, kullanıcıya
   * cevaplayamayacağı bir uyarı vermektir; okunmayan uyarı rozetin
   * tamamına olan güveni götürür.
   */
  kontrol("ölçülmemiş sayaç ACİL DEĞİL", geri !== null && !acilMi(geri));
  kontrol("  ...çıpasız sayaç da ACİL DEĞİL", cipasiz !== null && !acilMi(cipasiz));
  kontrol("  ...ama ölçülmüş ve yakın olan ACİL", yakin !== null && acilMi(yakin));

  /**
   * ⚠ SAAT DİLİMİ. `noticedAt` bir ANDIR; İstanbul'da 2 Ağustos 00:30 olan
   * bir an UTC'de 1 Ağustos 21:30'dur. Gün UTC'ye göre kesilseydi son tarih
   * BİR GÜN ERKEN çıkar ve rakam makul göründüğü için fark edilmezdi.
   */
  const geceYarisi = isleyenSayac(
    { ...temel, noticedAt: new Date("2026-08-01T21:30:00Z"), status: "BEKLENIYOR" },
    gun(2026, 8, 1),
  );
  kontrol(
    "gece yarısını geçen an İSTANBUL gününe göre çözülüyor",
    geceYarisi?.sonTarih?.toISOString().slice(0, 10) === "2026-08-09",
    geceYarisi?.sonTarih?.toISOString(),
  );

  // ── EKRAN VE ÇAN ─────────────────────────────────────────────────────
  const rozet = readFileSync("src/app/iadeler/sayac-rozeti.tsx", "utf8");
  const rozetKod = rozet
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ");
  kontrol(
    "ekran SONUCU da yazıyor (gün sayısı tek başına uyarı değil)",
    /t\(`sonuc\$\{sayac\.sonuc\}`\)/.test(rozetKod),
  );
  kontrol(
    "boş sayaç SEBEBİNİ yazıyor",
    /t\(`bos\$\{sayac\.bosluk/.test(rozetKod),
  );
  kontrol(
    "türetilmiş tarih türetme olduğunu SÖYLÜYOR",
    /turetilmisNot/.test(rozetKod),
  );
  /** Panel beyanı türetmeyi ezebilmeli — yoksa "kazanan panel" kuralı sözde kalır. */
  kontrol(
    "pazaryeri tarihi elle yazılabiliyor (panel türetmeyi ezer)",
    /bildirimSonTarihiYaz\(/.test(rozetKod),
  );
  kontrol(
    "çıpa da elle girilebiliyor (kargoya veriliş)",
    /bildirimCipasiYaz\(/.test(rozetKod),
  );

  /**
   * ⚠ ÇAN VE EKRAN AYNI GÖVDEDEN GEÇER. Bu depoda tersi yaşandı: sonda
   * `new Date()`, ekran iş takvimi günü kullanıyordu ve iki DOĞRU sayı
   * (83 ↔ 67) çelişiyormuş gibi göründü.
   */
  const can = readFileSync("src/lib/uyari/iade-sayaci.ts", "utf8");
  kontrol(
    "panel çanı ekranla AYNI ölçütü çağırıyor",
    /isleyenSayac\(/.test(can) && /acilMi\(/.test(can),
  );
  kontrol(
    "  ...ve yalnız AÇIK bildirimlere bakıyor",
    /ACIK_BILDIRIM_DURUMLARI/.test(can),
  );

  /**
   * ⚠ ŞEMA DEĞİŞMEDİ. Karar: ölü duran iki sütun kullanılacak, yeni sütun
   * açılmayacak (mimar şartı ①). Biri yarın çıpa sütunu eklerse burası
   * kırmızı yanar ve karar yeniden konuşulur.
   */
  const semaGovdesi = semaMetni();
  const bildirimModeli = semaGovdesi.slice(
    semaGovdesi.indexOf("model ReturnNotice {"),
    semaGovdesi.indexOf("model ReturnItem {"),
  );
  kontrol("bildirim modeli kesilebildi", bildirimModeli.length > 0);
  kontrol(
    "  ...sayaç için YENİ SÜTUN açılmadı",
    !/kargoyaVerisTarihi|teslimTarihi|analizBaslangic/.test(bildirimModeli),
  );

  /** Türetmenin izi bırakılıyor mu — tarih bir OLGU değil bir HESAP. */
  const eylemMetni = readFileSync("src/app/iadeler/bildirim-actions.ts", "utf8");
  kontrol(
    "türetme AuditLog'a iz bırakıyor",
    /SON_TARIH_EYLEMI/.test(eylemMetni) && /kural: `geçiş anı \+ \$\{kural\.gun\} gün`/.test(eylemMetni),
  );
  kontrol(
    "  ...izde kaynak TÜRETME mi PANEL mi ayırt ediliyor",
    /kaynak: "TURETME"/.test(eylemMetni) && /kaynak: "PANEL"/.test(eylemMetni),
  );

  kosanBolumler.push("son-tarih-sayaclari");
}

// ===========================================================================
console.log("\n13) RET GEREKÇESİ (8) VE ANALİZ SONUCU (3) — K31 ④");
// ===========================================================================
/**
 * KULLANICI BİLDİRDİ 23.08.2026: _"iadeye itiraz edince açılan ekranda
 * normalde red sebepleri olması lazım — ürün kullanılmış, hijyen ürün falan
 * — sonra onlardan birini seçince iade ihtilaflıya düşecek."_
 *
 * ÖLÇÜLDÜ: `itirazGerekcesi` ve `analizSonucu` sütunları K31 migration'ında
 * açılmış ve ÖLÜ DURUYORDU — sıfır okuyucu, sıfır yazıcı. Aynı gün
 * `otomatikOnayTarihi`/`islemSonTarihi` için de aynısı çıkmıştı: şemaya alan
 * eklemek, o alanın teslim edildiği anlamına gelmiyor.
 *
 * ⚠ VE GEREKÇE PARA TARAFINI BELİRLİYOR (docs §5): `DEGISIM` seçilirse geri
 * giden YENİ üründür ve kargo HER KANALDA satıcıya aittir; satıcı haklı
 * bulunduğunda Trendyol kargoyu yansıtmaz. Aynı durumun iki farklı parası
 * var ve ayıran şey bu alan.
 */
{
  kontrol("sekiz ret gerekçesi tanımlı", ITIRAZ_GEREKCELERI.length === 8, ITIRAZ_GEREKCELERI);
  kontrol("üç analiz sonucu tanımlı", ANALIZ_SONUCLARI.length === 3, ANALIZ_SONUCLARI);

  /**
   * ⚠ SUNUCU, FORMUN SUNDUĞU HER DEĞERİ KABUL ETMELİ — VE BU ÖLÇÜT
   * DAVRANIŞSALDIR: yüklem tek tek ÇAĞRILIYOR. Metin araması yapsaydık,
   * biri yüklemin içine elle liste yazdığında desen ayakta kalır ve kontrol
   * yeşil yanardı. (23.08.2026'da iade gerekçelerinde tam bu ayrışma
   * yaşandı: form 14 sunuyor, sunucu 7 kabul ediyordu.)
   */
  const redItiraz = ITIRAZ_GEREKCELERI.filter((g) => !gecerliItirazGerekcesi(g));
  kontrol(
    "sunucu, formun sunduğu 8 ret gerekçesinin HEPSİNİ kabul ediyor",
    redItiraz.length === 0,
    redItiraz,
  );
  const redAnaliz = ANALIZ_SONUCLARI.filter((a) => !gecerliAnalizSonucu(a));
  kontrol(
    "sunucu, formun sunduğu 3 analiz sonucunun HEPSİNİ kabul ediyor",
    redAnaliz.length === 0,
    redAnaliz,
  );
  kontrol(
    "  ...tanımsız değerler REDDEDİLİYOR (yüklemler hep true dönmüyor)",
    !gecerliItirazGerekcesi("BOYLE_BIR_GEREKCE_YOK") &&
      !gecerliAnalizSonucu("BOYLE_BIR_SONUC_YOK"),
  );

  /** Şema büyürse form da büyümeli — kilit gevşetilirse burada görünür. */
  for (const [ad, kod, liste] of [
    ["NoticeObjectionReason", "enum NoticeObjectionReason {", ITIRAZ_GEREKCELERI],
    ["AnalysisResult", "enum AnalysisResult {", ANALIZ_SONUCLARI],
  ] as [string, string, readonly string[]][]) {
    const semaK4 = semaMetni();
    const govde = semaK4.slice(
      semaK4.indexOf(kod),
      semaK4.indexOf("}", semaK4.indexOf(kod)),
    );
    const degerler = govde
      .split("\n")
      .map((satir) => satir.replace(/\/\/.*$/, "").trim())
      .filter((satir) => /^[A-Z][A-Z0-9_]*$/.test(satir));
    const formsuz = degerler.filter((d) => !liste.includes(d));
    kontrol(
      `${ad}: şemadaki ${degerler.length} değerin hepsi formda`,
      degerler.length > 0 && formsuz.length === 0,
      formsuz,
    );
  }

  /**
   * ⚠ RET GEREKÇESİ ZORUNLU, ANALİZ SONUCU DEĞİL — ve ikisi AYRI sınanıyor.
   * Tek bir "sorulur mu" ölçütü olsaydı, analiz sonucunu da zorunlu yapan
   * bir mutasyon yakalanmazdı; o mutasyon süresi dolmak üzere olan bir kaydı
   * kapatamayan kullanıcıyı sistemden kaçırırdı.
   */
  kontrol(
    "ret gerekçesi YALNIZ ITIRAZ_ACILDI'ya geçerken zorunlu",
    itirazGerekcesiGerekliMi("ITIRAZ_ACILDI") &&
      BILDIRIM_DURUMLARI.filter((d) => d !== "ITIRAZ_ACILDI").every(
        (d) => !itirazGerekcesiGerekliMi(d),
      ),
  );
  kontrol(
    "analiz sonucu YALNIZ ANALIZ'den çıkarken soruluyor",
    analizSonucuIstenirMi("ANALIZ") &&
      BILDIRIM_DURUMLARI.filter((d) => d !== "ANALIZ").every(
        (d) => !analizSonucuIstenirMi(d),
      ),
  );

  const eylemK4 = readFileSync("src/app/iadeler/bildirim-actions.ts", "utf8");
  const gerekceBlok = eylemK4.slice(
    eylemK4.indexOf("if (itirazGerekcesiGerekliMi(hedef))"),
    eylemK4.indexOf("── SON TARİH TÜRETMESİ"),
  );
  kontrol("gerekçe doğrulama bloğu kesilebildi", gerekceBlok.length > 0);
  /**
   * ⚠ İKİ HATA AYRI SÖYLENİR. Boş bırakmak ile TANINMAYAN değer aynı mesajı
   * verirse, ikinci durum birinci gibi görünür: kullanıcı seçtiği hâlde
   * "seçmedin" cevabı alır ve sistemin sustuğu yer hiç açılmaz.
   */
  kontrol(
    "  ...BOŞ gerekçe ayrı mesaj veriyor",
    /itirazGerekcesiZorunlu/.test(gerekceBlok),
  );
  kontrol(
    "  ...TANIMSIZ gerekçe ayrı mesaj veriyor",
    /itirazGerekcesiTanimsiz/.test(gerekceBlok),
  );
  kontrol(
    "  ...kabul kümesi ORTAK yüklemden (elle liste değil)",
    /gecerliItirazGerekcesi\(secim\)/.test(gerekceBlok) &&
      !/"[A-Z][A-Z0-9_]{4,}"/.test(gerekceBlok),
  );
  /**
   * ⚠ VARLIK DEĞİL, YOKLUK ARANIR — MUTASYONLA ÖĞRENİLDİ.
   *
   * İlk hâli yalnız `if (secim) {` bloğunun VARLIĞINA bakıyordu. Analiz
   * sonucunu ZORUNLU yapan bir mutasyon o bloğu koruyup ÖNÜNE bir erken
   * dönüş ekledi ve kontrol YEŞİL KALDI. Zorunlu tutulsaydı, süresi dolmak
   * üzere olan bir kaydı kapatamayan kullanıcı sistemi bırakıp pazaryeri
   * panelinden işini görürdü — ve biz onu hiç öğrenemezdik.
   */
  const analizBlok = eylemK4.slice(
    eylemK4.indexOf("if (analizSonucuIstenirMi(bildirim.status))"),
    eylemK4.indexOf("── SON TARİH TÜRETMESİ"),
  );
  kontrol("analiz bloğu kesilebildi", analizBlok.length > 0);
  kontrol(
    "  ...boş seçim SESSİZCE geçiliyor (blok var)",
    /if \(secim\) \{/.test(analizBlok),
  );
  kontrol(
    "  ...ve boş seçimi REDDEDEN bir dal YOK (zorunlu değil)",
    !/!secim/.test(analizBlok),
  );

  /** Seçilen değer gerçekten YAZILIYOR mu — kural doğru ama yazılmıyorsa boş. */
  kontrol(
    "seçim kayda yazılıyor",
    /\.\.\.yazilacakEk,/.test(eylemK4) &&
      /yazilacakEk\.itirazGerekcesi = secim/.test(eylemK4),
  );

  // ── EKRAN ────────────────────────────────────────────────────────────
  const durumEkrani = readFileSync("src/app/iadeler/bildirim-durumu.tsx", "utf8");
  const ekranKod = durumEkrani
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ");
  kontrol(
    "diyalogda ret gerekçesi seçimi VAR",
    /itirazGerekcesiGerekliMi\(s\.hedef\) \? \(/.test(ekranKod),
  );
  kontrol(
    "  ...ve gerekçe seçilmeden onay düğmesi basılamıyor",
    /itirazGerekcesiGerekliMi\(s\.hedef\) && gerekce === ""/.test(ekranKod),
  );
  kontrol(
    "diyalogda analiz sonucu seçimi VAR",
    /\{analizSorulur \? \(/.test(ekranKod),
  );
  /**
   * ⚠ EKRAN VE SUNUCU AYNI KURALI ÇAĞIRIYOR. İki yerde iki ölçüt olsaydı
   * ekran sormadan gönderir, sunucu sessizce reddederdi — kullanıcı
   * "kaydetmiyor" der ve sebebi hiçbir yerde görünmezdi.
   */
  kontrol(
    "ekran kuralı SAF MODÜLDEN çağırıyor (kopya kural yok)",
    /from "@\/lib\/iade\/bildirim"/.test(ekranKod) &&
      !/hedef === "ITIRAZ_ACILDI"/.test(ekranKod),
  );

  /**
   * ⚠ YAZILIP GÖRÜNMEYEN ALAN, YAZILMAMIŞ GİBİDİR. Bu iki sütun tam da
   * "kaydediliyor ama hiçbir yerde okunmuyor" durumundaydı.
   */
  const listeEkrani = readFileSync("src/app/iadeler/page.tsx", "utf8");
  kontrol(
    "seçilen gerekçe LİSTEDE görünüyor",
    /itirazGerekcesiRozet/.test(listeEkrani) &&
      /itirazGerekcesi: true/.test(listeEkrani),
  );
  kontrol(
    "  ...analiz sonucu da görünüyor",
    /analizSonucuRozet/.test(listeEkrani) && /analizSonucu: true/.test(listeEkrani),
  );

  kosanBolumler.push("ret-gerekcesi-ve-analiz");
}

// ===========================================================================
console.log("\n14) KARGOLANACAK KUTUSU (K31 ②) VE ASKIDA (③)");
// ===========================================================================
/**
 * İtirazımız kabul edildiğinde ürün BİZDE kalır ve müşteriye geri gönderilir
 * (`docs/iade-sureci.md` §5): pazaryeri bir KARGO KODU atar, ürün 2 iş günü
 * içinde o kodla gider.
 *
 * ⚠ BU FİZİKSEL İŞ HİÇBİR YERDE GÖRÜNMÜYORDU. Rozette "İtiraz kabul"
 * yazması bir SONUÇ gibi okunuyordu; oysa orada elimizde duran bir ürün ve
 * işleyen bir süre var.
 *
 * ⚠ YENİ DURUM/ALAN AÇILMADI — kural TÜRETİLDİ. `iadeKargoKodu` da o güne
 * kadar ölü bir sütundu (sıfır okuyucu, sıfır yazıcı).
 */
{
  /**
   * ⚠ KURAL DAR VE BU BİLEREK. `ITIRAZ_RED`de de dosya kapanışa gider ama
   * ürün MÜŞTERİYE GİTMEZ: itirazımız reddedilmiştir, iade onaylanır, mal
   * bizde kalır. Kutuya onu da koysaydık yapılmayacak bir iş her gün listede
   * durur ve kutu okunmaz olurdu.
   */
  kontrol("kargolama işi YALNIZ ITIRAZ_KABUL'de doğuyor", kargolamaDogurur("ITIRAZ_KABUL"));
  const yanlisDogural = BILDIRIM_DURUMLARI.filter(
    (d) => d !== "ITIRAZ_KABUL" && kargolamaDogurur(d),
  );
  kontrol(
    "  ...başka hiçbir durumda doğmuyor (ITIRAZ_RED dahil)",
    yanlisDogural.length === 0,
    yanlisDogural,
  );

  /**
   * ⚠ ÖLÇÜT KARGO KODUNUN VARLIĞI, AYRI BİR BAYRAK DEĞİL. İkinci bir
   * "gönderildi" alanı iki gerçek demekti: kodu olan ama bayrağı boş bir
   * kayıt hangisidir? Kodun kendisi olayın kanıtı.
   */
  kontrol(
    "kod yoksa GÖNDERIME HAZIR",
    kargolamaDurumu({ status: "ITIRAZ_KABUL", iadeKargoKodu: null }) ===
      "GONDERIME_HAZIR",
  );
  kontrol(
    "  ...kod varsa KARGODA",
    kargolamaDurumu({ status: "ITIRAZ_KABUL", iadeKargoKodu: "TY-123" }) ===
      "KARGODA",
  );
  /**
   * ⚠ AYRIMI GÖSTEREN ÖRNEK: boşluklardan ibaret bir kod, kod DEĞİLDİR.
   * `iadeKargoKodu` serbest metin; `!== null` diye bakan bir uygulama
   * boşluğu "gönderildi" sayar ve iş sessizce kutudan düşerdi.
   */
  kontrol(
    "  ...yalnız boşluk kod SAYILMIYOR",
    kargolamaDurumu({ status: "ITIRAZ_KABUL", iadeKargoKodu: "   " }) ===
      "GONDERIME_HAZIR",
  );
  kontrol(
    "kargolama doğurmayan durum kutuya GİRMİYOR",
    kargolamaDurumu({ status: "ITIRAZ_RED", iadeKargoKodu: "TY-9" }) === null,
  );

  /** Askı ayrı bir şey: süreç durdu, saat işlemiyor. */
  kontrol("askı yalnız ASKIDA durumunda", askidaMi("ASKIDA"));
  kontrol(
    "  ...başka durumda değil",
    BILDIRIM_DURUMLARI.filter((d) => d !== "ASKIDA").every((d) => !askidaMi(d)),
  );
  /**
   * ⚠ ASKIDA SAYAÇ İŞLEMEZ — iki modül aynı şeyi söylemeli. Askıdaki bir
   * kayda saat işletmek, durmuş bir sürece son tarih uydurmak olurdu.
   */
  kontrol(
    "askıdaki kayıtta sayaç da işlemiyor (iki modül tutarlı)",
    DURUM_SAYACI.ASKIDA === null,
  );

  // ── EKRAN ────────────────────────────────────────────────────────────
  const kutu = readFileSync("src/app/iadeler/kargolanacak-kutusu.tsx", "utf8");
  const kutuKod = kutu
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ");

  /**
   * ⚠ AÇIK SIFIR (13.08.2026 dersi). Kutu boşken GİZLENMEZ, "yok" yazar.
   * Bir şeyin YOKLUĞUNDAN "sorun yok" sonucu çıkarmak imkânsızdır —
   * kullanıcı boş bir bölümü "ekran bozuk" diye okur. İKİ kutu için de
   * ayrı ayrı sınanıyor: birini gizleyen mutasyon ötekiyle ayakta kalmasın.
   */
  for (const [ad, bos] of [
    ["kargolanacak", "kargolanacakYok"],
    ["askıda", "askidaYok"],
  ] as [string, string][]) {
    kontrol(
      `${ad} kutusu BOŞKEN de yazıyor (açık sıfır)`,
      new RegExp(`length === 0 \\?[\\s\\S]{0,200}t\\("${bos}"\\)`).test(kutuKod),
    );
  }

  kontrol(
    "kargo kodu ekrandan yazılabiliyor",
    /bildirimKargoKoduYaz\(satir\.bildirimId, kod\)/.test(kutuKod),
  );
  /**
   * ⚠ İKİ HÂL DE NÖTR. "Gönderime hazır" bir gecikme değil SIRADAKİ ADIM:
   * pazaryeri kodu henüz atamamış olabilir. Kırmızı göstermek, bizim
   * yapmadığımız bir işi suçlamak olurdu.
   */
  /**
   * ⚠ DİLİM İŞARETİN ÖNÜNDEN BAŞLAR — MUTASYONLA ÖĞRENİLDİ.
   *
   * İlk hâli `satir.durum === "KARGODA"` ifadesinden İLERİ kesiyordu; oysa
   * aranan şey (`className`) o ifadenin ÖNÜNDE duruyor. Sınıfı
   * `text-destructive` yapan mutasyon dilimin dışında kaldı ve kontrol
   * YEŞİL KALDI. Doğru sınır: ifadeyi saran etiketin AÇILIŞI.
   */
  const halIndeks = kutuKod.indexOf('satir.durum === "KARGODA"');
  const halBloku = kutuKod.slice(
    kutuKod.lastIndexOf("<span", halIndeks),
    kutuKod.indexOf("</span>", halIndeks),
  );
  kontrol("iki hâl bloğu kesilebildi", halBloku.length > 0);
  kontrol(
    "  ...ikisi de NÖTR (gönderime hazır bir suçlama değil)",
    !/destructive|text-red/.test(halBloku),
  );
  /**
   * ⚠ İKİNCİ KAT — DOSYA GENELİ. Dilim ne kadar doğru kesilse de tek bir
   * konuma bağlı kalır; kırmızı sınıf başka bir satıra taşınırsa yine
   * kaçardı. Kutuda ham kırmızı sınıf HİÇ olmamalı: askı sayısı bile
   * jetondan (`DURUM_YAZISI.olumsuz`) geliyor, elle yazılmış sınıftan değil.
   */
  kontrol(
    "  ...kutuda ham kırmızı sınıf hiç yok (renk jetondan gelir)",
    !/text-destructive|text-red-|bg-red-/.test(kutuKod),
  );

  /**
   * ⚠ KUTU LİSTEDEN TÜRETİLMİYOR — AYRI SORGU. Ekrandaki liste en yeni 50
   * ile sınırlı ve süzgeç uygulanmış; kutuyu ondan süzseydik 51. sıradaki
   * bir "kargolanması gereken" iade SESSİZCE görünmezdi. (Bekleyen
   * sayacında aynı tuzak 15.08'de yaşanmıştı.)
   */
  const listeK2 = readFileSync("src/app/iadeler/page.tsx", "utf8");
  kontrol(
    "kutu AYRI sorgudan besleniyor (50'lik listeden değil)",
    /where: \{ status: \{ in: \["ITIRAZ_KABUL", "ASKIDA"\] \} \}/.test(listeK2),
  );
  kontrol(
    "  ...ve bildirimler sekmesinde çiziliyor",
    /<KargolanacakKutusu/.test(listeK2),
  );

  /**
   * ⚠ KARGOYA_VERILDI ATLANABİLİR ARA ADIM (③). Hepsiburada'da bu aşama YOK
   * (§11.2); zorunlu olsaydı her HB iadesinde fazladan bir tık doğardı.
   * Ölçüt: BEKLENIYOR'dan doğrudan MAL_GELDI'ye geçilebiliyor mu.
   */
  kontrol(
    "KARGOYA_VERILDI aşaması var",
    IZINLI_GECISLER.BEKLENIYOR.includes("KARGOYA_VERILDI"),
  );
  kontrol(
    "  ...ama ATLANABİLİR (BEKLENIYOR → MAL_GELDI açık)",
    IZINLI_GECISLER.BEKLENIYOR.includes("MAL_GELDI"),
  );

  /**
   * ⚠ YENİ SÜTUN AÇILMADI. Kargolama durumu `iadeKargoKodu`dan türetiliyor;
   * biri yarın bir bayrak eklerse burası kırmızı yanar ve karar yeniden
   * konuşulur.
   */
  const semaK2 = semaMetni();
  const modelK2 = semaK2.slice(
    semaK2.indexOf("model ReturnNotice {"),
    semaK2.indexOf("model ReturnItem {"),
  );
  kontrol(
    "kargolama için bayrak sütunu AÇILMADI (koddan türetiliyor)",
    !/gonderildi\s+Boolean|kargolandi\s+Boolean/.test(modelK2),
  );

  kosanBolumler.push("kargolanacak-ve-aski");
}

// ===========================================================================
console.log("\n15) BİLDİRİM TAVANI VE İTİRAZDA DEĞİŞİM ÜRÜNÜ");
// ===========================================================================
/**
 * Kullanıcı 23.08.2026, iki bildirim:
 *  ① _"itiraz seçeneklerinden değişimi seçiyorum, sonra değişim ürünü seçin
 *     demesi lazım"_
 *  ② _"Aynı ürünü müşteri 3 defa iade edebiliyor, ben şimdi aynı iadeyi
 *     seçip seçip duruyorum, 3'ten sonra seçtirmemeli"_
 */
{
  /**
   * ⚠ TAVAN "SATILAN ADET" DEĞİL — VE BU BİR ÖLÇÜM SONUCUDUR, TERCİH DEĞİL.
   * En doğal türetme "satılandan fazlası iade edilemez" idi; canlı ölçüm
   * onu ÇÜRÜTTÜ: bildirimi olan 8 satışın hepsi 1 adetlik ve dördü birden
   * fazla bildirim taşıyor (2, 2, 3, 3). Adet sınırı koysaydık BUGÜN VAR
   * OLAN gerçek kayıtları engellerdik.
   *
   * Tavanın kaynağı kullanıcı beyanı `(K)` — rozet BEYAN, pazaryeri
   * belgesiyle doğrulanmadı. Ölçülen en yüksek değer 3 ve hiçbir kayıt
   * tavanı AŞMIYOR: kural geçmişi bozmuyor.
   */
  kontrol("tavan 3", BILDIRIM_TAVANI === 3);
  kontrol("2 bildirimde tavan DOLMADI", !bildirimTavaniDoldu(2));
  kontrol("3 bildirimde tavan DOLDU", bildirimTavaniDoldu(3));
  /**
   * ⚠ AYRIMIN ÖTEKİ YAKASI: tavanı AŞMIŞ bir kayıt da dolu sayılmalı.
   * `=== BILDIRIM_TAVANI` diye yazılsaydı, istisnayla 4'e çıkmış bir satışta
   * kural SESSİZCE düşer ve beşinci bildirim hiç sorulmadan geçerdi.
   */
  kontrol("  ...4 bildirimde de DOLU (eşitlik değil, en az)", bildirimTavaniDoldu(4));

  /**
   * ⚠ İTİRAZDA DEĞİŞİM YALNIZ `DEGISIM` GEREKÇESİNDE SORULUR. Sekiz
   * gerekçenin ötekilerinde geri giden mal AYNI üründür; ürün seçtirmek
   * cevaplanacak yanlış bir soru olurdu.
   */
  kontrol("değişim ürünü YALNIZ DEGISIM gerekçesinde soruluyor", itirazDegisimUrunuIster("DEGISIM"));
  const yanlisSoran = ITIRAZ_GEREKCELERI.filter(
    (g) => g !== "DEGISIM" && itirazDegisimUrunuIster(g),
  );
  kontrol("  ...başka gerekçede sorulmuyor", yanlisSoran.length === 0, yanlisSoran);

  const eylemK5 = readFileSync("src/app/iadeler/bildirim-actions.ts", "utf8");

  /** Tavan SUNUCUDA da uygulanıyor — ekranda pasif düğme yetki değildir. */
  const tavanBlok = eylemK5.slice(
    eylemK5.indexOf("const mevcutBildirimSayisi"),
    eylemK5.indexOf("YANLIS_URUN'DA DÖNEN ÜRÜN ZORUNLU"),
  );
  kontrol("tavan bloğu kesilebildi", tavanBlok.length > 0);
  kontrol(
    "  ...sunucu tavanı sayıyor ve engelliyor",
    /bildirimTavaniDoldu\(mevcutBildirimSayisi\)/.test(tavanBlok) &&
      /bildirimTavaniDoldu/.test(tavanBlok),
  );
  /**
   * ⚠ MUTLAK KİLİT DEĞİL. Tavan bir BEYAN; kuralın yanıldığı gün mutlak
   * kilit operasyoncuyu kilitler ve gerçek bir olay hiç kaydedilemez.
   * Anayasa (20.08.2026): uyarı sorar, kullanıcı ısrar ederse istisna
   * KAYDA GEÇER.
   */
  kontrol(
    "  ...istisna yolu var (mutlak kilit değil)",
    /!veri\.tavanIstisnasi/.test(tavanBlok),
  );
  /**
   * ⚠ İŞARET ÇAĞRI YERİNE BAĞLANIR, ADA DEĞİL — MUTASYONLA ÖĞRENİLDİ.
   *
   * İlk hâli dosyanın tamamında `TAVAN_ISTISNASI_EYLEMI` arıyordu. Eylem
   * adını başka bir dizeye çeviren mutasyon YEŞİL KALDI: sabit hâlâ IMPORT
   * satırında geçiyordu. Aynı tuzak bu depoda `revalidatePath` ile de
   * yaşanmıştı — desen adı değil KULLANIMI aranır.
   */
  const istisnaBloku = eylemK5.slice(
    eylemK5.indexOf("if (veri.tavanIstisnasi &&"),
    eylemK5.indexOf('revalidatePath("/iadeler")', eylemK5.indexOf("if (veri.tavanIstisnasi &&")),
  );
  kontrol("istisna izi bloğu kesilebildi", istisnaBloku.length > 0);
  kontrol(
    "  ...istisna İZ BIRAKIYOR (eylem adı çağrı yerinde)",
    /action: TAVAN_ISTISNASI_EYLEMI,/.test(istisnaBloku),
  );
  /** İz satışa bağlı ve kaç bildirim olduğunu taşıyor — üç ay sonra okunabilsin. */
  kontrol(
    "  ...ve iz satışa bağlı, sayıyı taşıyor",
    /targetType: "Sale"/.test(istisnaBloku) &&
      /mevcutBildirim: mevcutBildirimSayisi/.test(istisnaBloku),
  );

  /**
   * ⚠ İPTAL EDİLMİŞ BİLDİRİM DE SAYILIR. Saymasaydık, iptal edip yeniden
   * açarak tavan sınırsız aşılabilirdi. Sayımda durum süzgeci OLMAMALI.
   */
  /**
   * ⚠ İPTAL EDİLMİŞ BİLDİRİM DE SAYILIR. Saymasaydık, iptal edip yeniden
   * açarak tavan sınırsız aşılabilirdi.
   *
   * ⚠ DİLİM SAYIM ÇAĞRISINA DARALTILDI. İlk hâli tavan bloğunun tamamına
   * bakıyordu ve o blok, AYRILAN ÜRÜN doğrulamasındaki
   * `status: { in: AYRILMIS_SAYILAN_DURUMLAR }` süzgecini de içine alıyordu:
   * kontrol doğru davranışta KIRMIZI yandı. Aranan şey sayımın kendisi,
   * onu çevreleyen kod değil.
   */
  const sayimBasi = eylemK5.indexOf("prisma.returnNotice.count(");
  const sayimCagrisi = eylemK5.slice(
    sayimBasi,
    eylemK5.indexOf("});", sayimBasi),
  );
  kontrol("sayım çağrısı kesilebildi", sayimCagrisi.length > 0);
  kontrol(
    "  ...aynı satışın TÜM bildirimleri sayılıyor",
    /where: \{ saleId: veri\.saleId \}/.test(sayimCagrisi),
  );
  kontrol(
    "  ...ve durum SÜZÜLMÜYOR (iptal edilmiş de sayılır)",
    !/status/.test(sayimCagrisi),
  );

  /** Değişim ürünü sunucuda ZORUNLU ve stok kuralı uygulanıyor. */
  const degisimBlok = eylemK5.slice(
    eylemK5.indexOf("if (itirazDegisimUrunuIster(secim))"),
    eylemK5.indexOf("if (analizSonucuIstenirMi(bildirim.status))"),
  );
  kontrol("değişim bloğu kesilebildi", degisimBlok.length > 0);
  kontrol(
    "  ...ürün seçilmeden geçilemiyor",
    /degisimUrunuZorunlu/.test(degisimBlok),
  );
  /**
   * ⚠ OLMAYAN MAL TAAHHÜT EDİLEMEZ — ve ölçüt SERBEST STOK. Yalnız mevcuda
   * bakılsaydı 1 adetlik mal iki bildirime ayrı ayrı taahhüt edilebilirdi
   * ve ikisi de "hazır" görünürdü (14.08.2026 vakası).
   */
  kontrol(
    "  ...serbest stok kuralı uygulanıyor (ortak fonksiyondan)",
    /ayirmaMumkunMu\(\{ mevcutStok, zatenAyrilmis, istenen: adet \}\)/.test(
      degisimBlok,
    ),
  );
  kontrol(
    "  ...ve seçim kayda YAZILIYOR",
    /yazilacakEk\.reservedVariantId = varyantId/.test(degisimBlok),
  );

  // ── EKRAN ────────────────────────────────────────────────────────────
  const durumEkraniK5 = readFileSync(
    "src/app/iadeler/bildirim-durumu.tsx",
    "utf8",
  );
  const ekranKodK5 = durumEkraniK5
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ");
  kontrol(
    "diyalogda değişim ürünü seçimi VAR",
    /itirazDegisimUrunuIster\(gerekce as NoticeObjectionReason\)/.test(ekranKodK5),
  );
  kontrol(
    "  ...ürün seçilmeden onay düğmesi basılamıyor",
    /degisimVaryant === ""/.test(ekranKodK5),
  );

  const formK5 = readFileSync("src/app/iadeler/bildirim-formu.tsx", "utf8");
  const formKod = formK5
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ");
  /**
   * ⚠ SAYI SEÇİMDEN ÖNCE GÖRÜNÜR. Seçimden sonra söylemek, yanlış seçimi
   * düzeltmeye zorlar; alt satır bedava.
   */
  kontrol(
    "satış listesinde mevcut bildirim sayısı görünüyor",
    /altEtiket:[\s\S]{0,120}tavanUyarisi/.test(formKod),
  );
  kontrol(
    "  ...tavan dolduğunda onay kutusu çıkıyor",
    /\{tavanDoldu \?/.test(formKod) && /tavanIstisnasiOnay/.test(formKod),
  );
  /**
   * ⚠ SEBEP EKRANDA YAZILI (İlke #5). Kilitli düğme sessiz kalmaz: neden
   * ilerlemediği eksikler listesinde duruyor.
   */
  kontrol(
    "  ...onaysızken sebep eksikler listesinde yazıyor",
    /eksikler\.push\(t\("eksikTavanOnayi"\)\)/.test(formKod),
  );
  /**
   * ⚠ ONAY BİR SONRAKİ KAYDA TAŞINMAZ. Kayıt başarılıysa kutu sıfırlanır;
   * "bir kez onayladım, artık sorma" yoktur.
   */
  kontrol(
    "  ...onay bir sonraki kayda TAŞINMIYOR",
    /setTavanOnayi\(false\)/.test(formKod),
  );

  kosanBolumler.push("tavan-ve-degisim");
}

// ===========================================================================
console.log("\n16) AYRILAN DEĞİŞİM ÜRÜNÜ STOKTAN DÜŞMELİ");
// ===========================================================================
/**
 * KULLANICI BİLDİRDİ 23.08.2026: _"değişim için bir ürün seçtim, onu
 * kargolayıp yolladım, bildirimi de kapattım ama değişim için seçtiğim
 * ürünün stoğu aynı kaldı."_
 *
 * SEBEP: `EXCHANGE_OUT` hareketini YALNIZ AŞAMA B (`iadeKaydet`) yazıyor ve
 * AŞAMA B o durumlardan ERİŞİLEMİYORDU. Ayırma bir NİYET beyanıdır —
 * fiziksel stoğa dokunmaz — ama niyetin GERÇEKLEŞTİĞİ an hiçbir yerde
 * kaydedilmiyordu: ürün depodan çıkıyor, defter hiç öğrenmiyordu.
 *
 * ÖLÇÜLDÜ (canlı): ayrılan ürünü olan 6 bildirimin İKİSİ kapanmış ve iadesi
 * hiç işlenmemiş; toplam `EXCHANGE_OUT` hareketi 1.
 */
{
  const temelB = {
    reservedVariantId: "v1",
    reservedQuantity: 1,
    returnId: null as string | null,
  };

  /**
   * ⚠ İKİ ŞART BİRDEN. Yalnız birine bakmak yanlış olurdu: ayrılmamış bir
   * kayıtta beklenecek şey yok, işlenmiş bir kayıtta hareket zaten yazıldı.
   */
  kontrol("ayrılmış + işlenmemiş → BEKLİYOR", ayrilmisDusmeyiBekliyor(temelB));
  kontrol(
    "  ...iade işlenmişse beklemiyor",
    !ayrilmisDusmeyiBekliyor({ ...temelB, returnId: "r1" }),
  );
  kontrol(
    "  ...ayrılan ürün yoksa beklemiyor",
    !ayrilmisDusmeyiBekliyor({ ...temelB, reservedVariantId: null }),
  );
  /**
   * ⚠ AYRIMI GÖSTEREN ÖRNEK: varyant DOLU ama adet 0. Yalnız
   * `reservedVariantId !== null` diye bakan bir uygulama bunu "bekliyor"
   * sayar ve düşülecek bir şey olmadığı hâlde kırmızı yanardı.
   */
  kontrol(
    "  ...adet 0 ise beklemiyor (yarım kayıt)",
    !ayrilmisDusmeyiBekliyor({ ...temelB, reservedQuantity: 0 }),
  );

  /**
   * ⚠ İSTİSNA 1 — `ITIRAZ_KABUL` + `DEGISIM`: müşteriye YENİ ürün gidiyor,
   * `EXCHANGE_OUT` yazılmak zorunda.
   */
  kontrol(
    "ITIRAZ_KABUL + DEGISIM → iade işlenebilir",
    iadeIslenebilirMi("ITIRAZ_KABUL", { itirazGerekcesi: "DEGISIM" }),
  );
  /**
   * ⚠ VE ÖTEKİ İTİRAZ YOLLARI KAPALI KALMALI. Satıcı haklı bulunduğunda ya
   * da analiz bittiğinde geri giden AYNI üründür; stoğumuza hiç girmemiştir
   * ve çıkışı da yoktur. Düğmeyi hepsine açmak, kazanılmış bir itirazdan
   * sonra ciroyu yanlışlıkla düşürmenin en kolay yolu olurdu.
   */
  const yanlisAcilan = ITIRAZ_GEREKCELERI.filter(
    (g) => g !== "DEGISIM" && iadeIslenebilirMi("ITIRAZ_KABUL", { itirazGerekcesi: g }),
  );
  kontrol(
    "  ...öteki itiraz gerekçelerinde KAPALI",
    yanlisAcilan.length === 0,
    yanlisAcilan,
  );
  kontrol(
    "  ...gerekçe yoksa da KAPALI",
    !iadeIslenebilirMi("ITIRAZ_KABUL"),
  );

  /**
   * ⚠ İSTİSNA 2 — `KAPANDI` ama ayrılan ürün hiç düşmemiş: dosya kapanmış
   * GÖRÜNÜYOR ama bitmemiştir. Eksik hareketi yazmak defteri bozmaz, düzeltir.
   */
  kontrol(
    "KAPANDI + ayrılmış bekliyor → iade işlenebilir",
    iadeIslenebilirMi("KAPANDI", { ayrilmisBekliyor: true }),
  );
  /**
   * ⚠ KAPSAM DAR: "kapanmış her bildirim işlenebilir" deseydik, hiçbir şeyin
   * kıpırdamaması gereken kapanışlarda ciro sessizce bozulabilirdi.
   */
  kontrol(
    "  ...bekleyen yoksa KAPANDI hâlâ kapalı",
    !iadeIslenebilirMi("KAPANDI", { ayrilmisBekliyor: false }) &&
      !iadeIslenebilirMi("KAPANDI"),
  );
  kontrol(
    "  ...IPTAL hiçbir koşulda açılmıyor",
    !iadeIslenebilirMi("IPTAL", { ayrilmisBekliyor: true, itirazGerekcesi: "DEGISIM" }),
  );

  /** Eski davranış korunuyor — iki temel durum hâlâ açık. */
  kontrol(
    "MAL_GELDI ve ITIRAZ_RED hâlâ açık",
    iadeIslenebilirMi("MAL_GELDI") && iadeIslenebilirMi("ITIRAZ_RED"),
  );

  // ── EKRAN ────────────────────────────────────────────────────────────
  const listeK6 = readFileSync("src/app/iadeler/page.tsx", "utf8");
  /**
   * ⚠ SESSİZ KAYIP GÖRÜNÜR OLMALI. Ürün depodan çıktı, defter bilmiyor —
   * bu gerçek bir eksik ve kırmızı olması doğru. ("Siparişte yok" gibi
   * yorumlanabilir bir bilgi değil.)
   */
  /**
   * ⚠ DAVRANIŞ DURUYOR, DESEN YER DEĞİŞTİRDİ (23.08.2026). Uyarı metni
   * `page.tsx`ten `degisim-gonder.tsx`e taşındı çünkü artık yanında bir
   * DÜĞME var (K37). Kontrol eski yerine bakmaya devam etseydi doğru
   * davranışta kırmızı yanardı; yeni yerine bağlandı.
   */
  kontrol(
    "düşmemiş ayırma satırda GÖSTERİLİYOR (koşul yerinde)",
    /ayrilmisDusmeyiBekliyor\(b\) &&/.test(listeK6) &&
      /<DegisimGonder/.test(listeK6),
  );
  const degisimEkrani = readFileSync(
    "src/app/iadeler/degisim-gonder.tsx",
    "utf8",
  );
  kontrol(
    "  ...uyarı metni yazılıyor",
    /ayrilmisDusmedi/.test(degisimEkrani),
  );
  kontrol(
    "  ...ve kırmızı (ölçülmüş bir eksik)",
    /DURUM_YAZISI\.olumsuz[\s\S]{0,80}ayrilmisDusmedi/.test(degisimEkrani),
  );
  /**
   * ⚠ ZATEN YAZILMIŞ ÇIKIŞ İÇİN DÜĞME GÖSTERİLMEZ — aynı mal iki kez
   * düşülemez. İz `AuditLog`ta ve ekran onu okuyor.
   */
  kontrol(
    "  ...çıkışı yazılmış bildirimde düğme YOK",
    /!degisimYazilanlar\.has\(b\.id\)/.test(listeK6),
  );
  /**
   * ⚠ GEÇİCİ TUTARSIZLIK SESSİZ BIRAKILMAZ (mimar şartı). K36a malın
   * maliyetini satışa taşıdı, kargo hâlâ iadede — ekran neyi taşımadığını
   * KENDİSİ söylüyor.
   */
  /**
   * ⚠ İKİ PARÇA, İKİ DOSYA — VE İKİSİ AYRI SINANIYOR. Metin `page.tsx`ten
   * prop olarak geçiyor, kesikli şerit bileşende çiziliyor. Tek dosyaya
   * bakan bir kontrol, ötekini kaldıran mutasyonu kaçırırdı.
   */
  kontrol(
    "  ...kargo uyarısı ekrana GEÇİRİLİYOR",
    /kargoUyarisi=\{tBildirim\("degisimKargoBeklemede"\)\}/.test(listeK6),
  );
  kontrol(
    "  ...ve pirinç kesikli şeritte ÇİZİLİYOR",
    /border-dashed[\s\S]{0,120}\{kargoUyarisi\}/.test(degisimEkrani),
  );
  /**
   * ⚠ DÜĞME BAĞLAM ALMALI. Bağlamsız çağrılsaydı kural doğru olur ama
   * ekrana hiç ulaşmazdı — "kural çalışıyor" ile "kuralın sonucu kullanıcıya
   * ulaşıyor" ayrı iki testtir (19.08.2026 dersi).
   */
  kontrol(
    "işle düğmesi BAĞLAMLA çağrılıyor",
    /iadeIslenebilirMi\(b\.status, \{[\s\S]{0,200}ayrilmisBekliyor: ayrilmisDusmeyiBekliyor\(b\)/.test(
      listeK6,
    ),
  );

  /**
   * ⚠ K36a'NIN ÇEKİRDEĞİ — VE MUTASYONLA BULUNDU.
   *
   * Değişim maliyeti artık iadenin kâr dökümüne YAZILMIYOR; satışın NET'ine
   * yalnızca `EXCHANGE_OUT` hareketinin `saleItemId` bağı üzerinden giriyor
   * (`kalemMaliyeti` tip bakmaz, bağ varsa sayar).
   *
   * Bu bağı kaldıran mutasyon önce YEŞİL KALDI — ve o hâlde maliyet ne
   * iadede ne satışta yazılırdı, yani KAYBOLURDU. İki değişiklik (bağ ekleme
   * + satır kaldırma) birbirine bağımlı; kontrol ikisini birden tutuyor.
   */
  const iadeMotoru = readFileSync("src/lib/iade.ts", "utf8");
  const exBasi = iadeMotoru.indexOf('type: "EXCHANGE_OUT"');
  const exBloku = iadeMotoru.slice(exBasi, iadeMotoru.indexOf("});", exBasi));
  kontrol("EXCHANGE_OUT bloğu kesilebildi", exBasi > -1 && exBloku.length > 0);
  kontrol(
    "  ...hareket SATIŞ KALEMİNE bağlı (maliyet satışın NET'ine girsin)",
    /saleItemId: kalem\.id,/.test(exBloku),
  );
  kontrol(
    "  ...iade bağı da korunuyor (hangi iadeden doğduğu kaybolmasın)",
    /returnItemId: iadeKalemi\.id,/.test(exBloku),
  );
  /** Yeni düğme yolu da AYNI bağı kurar — iki yol tek yere yazar. */
  const dugmeEylemi = readFileSync(
    "src/app/iadeler/bildirim-actions.ts",
    "utf8",
  );
  const dugmeBloku = dugmeEylemi.slice(
    dugmeEylemi.indexOf('type: "EXCHANGE_OUT"'),
    dugmeEylemi.indexOf("});", dugmeEylemi.indexOf('type: "EXCHANGE_OUT"')),
  );
  kontrol(
    "düğme yolu da satış kalemine bağlıyor (iki yol tek yere)",
    /saleItemId: hedefKalemId,/.test(dugmeBloku),
  );
  kontrol(
    "  ...ve FIFO partisinden maliyet alıyor (liste fiyatı değil)",
    /unitCostAmount: pay\.parti\.birimMaliyet,/.test(dugmeBloku) &&
      /sourceMovementId: pay\.parti\.hareketId,/.test(dugmeBloku),
  );
  /** Çıkıştan sonra kâr damgası tazelenmezse ekran eski rakamı gösterir. */
  kontrol(
    "  ...çıkıştan sonra kâr TAZELENİYOR",
    /await satisKarTazele\(bildirim\.saleId\);/.test(dugmeEylemi),
  );

  /**
   * ── K38: HURDA DÜŞÜŞÜ — ÇİFT GİDER KAPISI ────────────────────────────
   *
   * Halil hükmü 23.08.2026: `11473322212`'den dönen kırık `axcali1672` çöp.
   *
   * ⚠ ZARAR HAREKETİN KENDİSİNDEN DOĞAR. Rapor "fire zararı"nı stok
   * defterinden türetiyor (`ADJUSTMENT`/`COUNT_CORRECTION`, FIFO maliyeti).
   * Betik ayrıca bir `Expense` satırı yazsaydı AYNI ZARAR İKİ KEZ görünürdü —
   * ve Halil eskiden elle iade giderine yazıyordu, bu alışkanlığın yerine
   * geçen mekanizma tam da bu.
   */
  const hurdaBetigi = readFileSync(
    "scripts/canli-hurda-axcali1672.ts",
    "utf8",
  );
  kontrol(
    "hurda betiği ELLE GİDER YAZMIYOR (çift sayım kapısı)",
    !/expense\.create/i.test(hurdaBetigi),
  );
  /**
   * ⚠ `returnItemId` YOK VE BU ZORUNLU. Rapor, iade bağı olan düzeltmeleri
   * fire toplamından bilerek dışlıyor (o para iadenin NET-2'sinde zaten
   * var). Hurdayı iadeye bağlasaydık HİÇBİR YERE yazılmazdı.
   */
  const hurdaYazma = hurdaBetigi.slice(
    hurdaBetigi.indexOf("tx.stockMovement.create"),
    hurdaBetigi.indexOf("tx.auditLog.create"),
  );
  kontrol("hurda yazma bloğu kesilebildi", hurdaYazma.length > 0);
  kontrol(
    "  ...hareket iade bağı TAŞIMIYOR (fire zararına girsin)",
    !/returnItemId:/.test(hurdaYazma),
  );
  kontrol(
    "  ...FIFO partisinden maliyet alıyor",
    /unitCostAmount: pay\.parti\.birimMaliyet/.test(hurdaYazma) &&
      /sourceMovementId: pay\.parti\.hareketId/.test(hurdaYazma),
  );
  /**
   * ⚠ BAĞ `AuditLog`TA VE YAPILANDIRILMIŞ. Serbest metin `note` tek başına
   * yetmez — üç ay sonra "hangi hurdalar hangi siparişten" aranabilmeli.
   */
  const hurdaIzi = hurdaBetigi.slice(
    hurdaBetigi.indexOf("tx.auditLog.create"),
    hurdaBetigi.indexOf("const sonrakiStok"),
  );
  for (const alan of ["siparisNo", "bildirimId", "hukum", "birimMaliyet"]) {
    kontrol(`  ...izde ${alan} var`, new RegExp(`${alan}:`).test(hurdaIzi));
  }
  /** ⚠ İKİNCİ KEZ KOŞUM ENGELLİ — aynı mal iki kez hurdaya düşmez. */
  /**
   * ⚠ KOŞULUN KENDİSİ ARANIR — MUTASYONLA ÖĞRENİLDİ. İlk hâli
   * `oncekiIz … "betik durdu"` diye GENİŞ bir aralığa bakıyordu; `if (false)`
   * yapan mutasyon yeşil kaldı çünkü iki kelime dosyanın AYRI yerlerinde
   * duruyordu ve desen ikisini birleştirip eşleşti.
   */
  kontrol(
    "  ...ikinci koşum engelli (önceki iz varsa durur)",
    /if \(oncekiIz\) \{/.test(hurdaBetigi),
  );
  /** ⚠ KİMLİĞE KİLİTLİ — genel araç değil (istisnayı kurala çevirmez). */
  kontrol(
    "  ...kimliğe kilitli (SKU ve sipariş sabit)",
    /const SKU = "axcali1672"/.test(hurdaBetigi) &&
      /const SIPARIS_NO = "11473322212"/.test(hurdaBetigi),
  );

  kosanBolumler.push("ayrilmis-dusmedi");
}

console.log("\n17) K39 — KAPANMIŞ BİLDİRİMİ İPTAL ET (24.08.2026)");
{
  /**
   * ⚠ EN ÖNEMLİ KONTROL BU: `kapaliMi` ARTIK TÜRETİLMİYOR.
   *
   * Eskiden `kapaliMi` = "ileri geçişi kalmamış" demekti ve bu ikisi
   * TESADÜFEN aynı şeydi. `KAPANDI`ya düzeltme çıkışı eklenince tesadüf
   * bozuldu; türetilmiş hâlde `kapaliMi("KAPANDI")` **false** dönerdi ve
   * İKİ SESSİZ SONUÇ doğardı:
   *   ① panel çanı kapanmış her bildirimi "bekleyen iş" sayardı,
   *   ② `durumDegistir`in kapalı-bildirim kapısı açılırdı.
   * İkisi de ekranda hata vermeden yanlış çalışırdı.
   */
  kontrol(
    "KAPANDI'nın ÇIKIŞI VAR ama hâlâ KAPALI sayılıyor",
    IZINLI_GECISLER.KAPANDI.length > 0 && kapaliMi("KAPANDI"),
    { cikislar: IZINLI_GECISLER.KAPANDI, kapali: kapaliMi("KAPANDI") },
  );
  kontrol(
    "  ...ve panel çanı KAPANDI'yı bekleyen iş SAYMIYOR",
    !ACIK_BILDIRIM_DURUMLARI.includes("KAPANDI"),
  );
  /**
   * ⚠ TEK ÇIKIŞ: `IPTAL`. Başka bir hedef eklenirse kapanmış bildirim
   * yeniden akışa sokulabilir olurdu — "geri dönüş yok" değişmezinin ihlali.
   */
  kontrol(
    "KAPANDI'nın TEK çıkışı IPTAL (yeniden akışa sokulamaz)",
    IZINLI_GECISLER.KAPANDI.length === 1 &&
      IZINLI_GECISLER.KAPANDI[0] === "IPTAL",
    IZINLI_GECISLER.KAPANDI,
  );
  kontrol("IPTAL uç durum kalıyor", IZINLI_GECISLER.IPTAL.length === 0);

  /**
   * ⚠ ÖLÇÜT "HANGİ VERİYİ BOZAR": `returnId` doluysa arkasında işlenmiş bir
   * iade var. Bildirimi iptal etmek onu SAHİPSİZ bırakır.
   */
  kontrol(
    "işlenmiş iadesi OLMAYAN kapanmış bildirim iptal EDİLEBİLİR",
    bildirimIptalEdilebilirMi({ status: "KAPANDI", returnId: null }),
  );
  kontrol(
    "işlenmiş iadesi OLAN kapanmış bildirim iptal EDİLEMEZ",
    !bildirimIptalEdilebilirMi({ status: "KAPANDI", returnId: "r1" }),
  );
  /**
   * ⚠ ÖRNEK VERİ AYRIMI GÖSTERİYOR: `BEKLENIYOR` da IPTAL'e gidebiliyor —
   * yani bu kontrol "geçiş var mı"yı değil "bu KAPI ondan geçirir mi"yi
   * sınıyor. Ayrım olmasaydı `status !== "KAPANDI"` satırını silen mutasyon
   * yeşil kalırdı.
   */
  kontrol(
    "BEKLENIYOR bu kapıdan geçmez (normal akış, düzeltme değil)",
    gecisGecerliMi("BEKLENIYOR", "IPTAL") &&
      !bildirimIptalEdilebilirMi({ status: "BEKLENIYOR", returnId: null }),
  );
  kontrol(
    "MAL_GELDI bu kapıdan geçmez",
    !bildirimIptalEdilebilirMi({ status: "MAL_GELDI", returnId: null }),
  );
  kontrol(
    "zaten IPTAL olan tekrar geçmez",
    !bildirimIptalEdilebilirMi({ status: "IPTAL", returnId: null }),
  );

  kontrol("boş gerekçe REDDEDİLİR", !iptalGerekcesiGecerliMi(""));
  kontrol("boşluk dolu gerekçe REDDEDİLİR", !iptalGerekcesiGecerliMi("     "));
  kontrol("kısa gerekçe REDDEDİLİR", !iptalGerekcesiGecerliMi("test"));
  kontrol(
    "yeterli gerekçe kabul edilir",
    iptalGerekcesiGecerliMi("Test denemesi, gerçek vaka 11473322212"),
  );

  // ── EYLEM ──────────────────────────────────────────────────────────────
  const iptalEylemi = readFileSync(
    "src/app/iadeler/bildirim-actions.ts",
    "utf8",
  );
  const iptalBasi = iptalEylemi.indexOf(
    "export async function kapanmisBildirimiIptalEt",
  );
  const iptalGovdesi = iptalEylemi.slice(iptalBasi, iptalBasi + 3200);
  kontrol("iptal eyleminin gövdesi kesilebildi", iptalBasi > 0);
  kontrol("  ...izin İSTİYOR", /yetkiIste\("iade\.yaz"\)/.test(iptalGovdesi));
  kontrol(
    "  ...ortak kuralı çağırıyor (elle kopya koşul yok)",
    /bildirimIptalEdilebilirMi\(bildirim\)/.test(iptalGovdesi),
  );
  kontrol(
    "  ...gerekçeyi ortak kuralla sınıyor",
    /iptalGerekcesiGecerliMi\(gerekce\)/.test(iptalGovdesi),
  );
  /** ⚠ İZ BIRAKMADAN DURUM DEĞİŞTİRİLMEZ. */
  kontrol(
    "  ...AuditLog'a ÖNCEKİ durumu da yazıyor",
    /oncekiDurum: bildirim\.status/.test(iptalGovdesi),
  );
  kontrol(
    "  ...gerekçeyi de yazıyor",
    /gerekce: gerekce\.trim\(\)/.test(iptalGovdesi),
  );
  kontrol(
    "  ...kim yaptığı yazılıyor",
    /userId: kullanici\?\.id/.test(iptalGovdesi),
  );
  /** ⚠ DURUM VE İZ AYNI İŞLEMDE — ayrışırsa izsiz iptal doğar. */
  kontrol("  ...durum ve iz TEK işlemde", /\$transaction/.test(iptalGovdesi));
  /** ⚠ İKİ RET SEBEBİ AYRI MESAJ VERİR (İlke #5). */
  kontrol(
    "  ...iki ret sebebi AYRI mesaj",
    /iptalYalnizKapanmista/.test(iptalGovdesi) &&
      /iptalIslenmisIade/.test(iptalGovdesi),
  );
  /** ⚠ PARA VE STOK DOKUNULMAZ: yalnız bildirimin DURUMU düzeltilir. */
  kontrol("  ...stok hareketi YAZMIYOR", !/stockMovement/.test(iptalGovdesi));
  kontrol(
    "  ...kâr damgasına DOKUNMUYOR",
    !/satisKarTazele/.test(iptalGovdesi),
  );

  // ── EKRAN ──────────────────────────────────────────────────────────────
  const iptalListe = readFileSync("src/app/iadeler/page.tsx", "utf8");
  const iptalListeKodu = iptalListe.replace(/\{\/\*[\s\S]*?\*\/\}/g, " ");
  const iptalDugmeBasi = iptalListeKodu.indexOf('b.status === "KAPANDI"');
  const iptalDugmeBloku = iptalListeKodu.slice(
    iptalDugmeBasi,
    iptalDugmeBasi + 220,
  );
  kontrol("iptal düğmesi ekranda ÇİZİLİYOR", iptalDugmeBasi > 0);

  /**
   * ⚠ CANLIDA ÇIKAN HATA — 24.08.2026, TESTİN 3. ADIMI DÜŞTÜ.
   *
   * `KAPANDI: ["IPTAL"]` geçişi açılınca, durum makinesinden düğme ÜRETEN
   * genel liste onu "anlamlı hedef" sanıp HER kapanmış bildirime bir
   * "İptal" düğmesi koydu — korunması gereken `11471381662` dahil. Ama
   * `durumDegistir` kapalı bildirimin hiçbir geçişini kabul etmiyor:
   * basılan ama çalışmayan bir düğme, yani SESSİZ BAŞARISIZLIK (İlke #5).
   *
   * ⚠ BU KONTROLÜ İLK TUR KAÇIRDI ve sebebi öğretici: kuralı, eylemi ve
   * KENDİ diyaloğumu sınadım; **var olan ekranla ETKİLEŞİMİNİ** sınamadım.
   * Yeni bir geçiş açmak, o geçişi listeleyen her ekranı da değiştirir.
   */
  kontrol(
    "kapalı bildirimde GENEL geçiş düğmesi önerilmiyor",
    /kapaliMi\(b\.status\)\s*\?\s*\[\]/.test(iptalListeKodu),
  );
  /** ⚠ Ölçüt sunucununkiyle AYNI gövdeden — elle "KAPANDI" istisnası değil. */
  kontrol(
    "  ...ölçüt kapaliMi (elle durum adı istisnası DEĞİL)",
    !/hedef !== "IPTAL"/.test(iptalListeKodu),
  );
  kontrol(
    "  ...koşulu SONUCUYLA birlikte (işlenmiş iadede gizli)",
    /b\.returnId === null[\s\S]{0,160}<BildirimIptal/.test(iptalDugmeBloku),
  );

  // ── DİYALOG ────────────────────────────────────────────────────────────
  const diyalog = readFileSync("src/app/iadeler/bildirim-iptal.tsx", "utf8");
  /**
   * ⚠ DESEN DOSYADA ÜÇ KEZ GEÇİYOR — import satırı, eşik hesabı ve uyarı
   * metninin parametresi. Dosyanın tamamında arayan ilk yazım, eşiği elle
   * `10` yazan mutasyonu KAÇIRDI: öteki iki geçiş deseni ayakta tutuyordu.
   * Ölçüt `yeterli` HESABINA daraltıldı — ikinci bir gerçek orada doğar.
   */
  const esikSatiri = diyalog.slice(
    diyalog.indexOf("const yeterli"),
    diyalog.indexOf("const yeterli") + 120,
  );
  kontrol("eşik hesabı kesilebildi", esikSatiri.length > 20);
  kontrol(
    "diyalog eşiği SUNUCUDAN okuyor (ikinci gerçek yok)",
    /IPTAL_GEREKCESI_ENAZ/.test(esikSatiri) &&
      /from "@\/lib\/iade\/bildirim"/.test(diyalog),
  );
  /** ⚠ Ve elle yazılmış bir sayı OLMAMALI — mutasyonun tam yaptığı şey. */
  kontrol(
    "  ...eşikte elle yazılmış sayı YOK",
    !/length >= \d/.test(esikSatiri),
    esikSatiri.trim(),
  );
  /**
   * ⚠ ÖLÇÜT İLKELİN ADINA DEĞİL, ONAY DÜĞMESİNE BAĞLI. İlk yazım
   * `<DialogFooter>` arıyordu; bileşen `AlertDialog`a çevrilince (canlıda
   * `Dialog` açılmıyordu) kontrol KIRMIZI yandı — oysa davranış aynıydı.
   * Kontrol artık `iptalOnayla` düğmesini kesiyor: hangi ilkel kullanılırsa
   * kullanılsın, kilit kuralı aynı yerde yaşıyor.
   */
  const onaylaYeri = diyalog.indexOf('t("iptalOnayla")');
  const diyalogDugme = diyalog.slice(onaylaYeri - 400, onaylaYeri + 40);
  kontrol("onay düğmesi kesilebildi", onaylaYeri > 0);
  kontrol(
    "  ...gerekçe yetersizken düğme KİLİTLİ",
    /disabled=\{!yeterli \|\| bekliyor\}/.test(diyalogDugme),
  );
  /** ⚠ KİLİTLİ DÜĞME SESSİZ KALMAZ — niye basılmadığı ekranda yazar. */
  kontrol(
    "  ...ve NİYE kilitli olduğu yazıyor",
    /!yeterli \?[\s\S]{0,200}iptalGerekcesiKisa/.test(diyalog),
  );

  kosanBolumler.push("k39-iptal");
}

console.log("\n18) YENİDEN GÖNDERİM KARGOSU — ALAN NE ZAMAN SORULUR (24.08.2026)");
{
  /**
   * ⚠ VAKA: `11473322212` üç kargo ödedi (gönderme · iade · yeniden
   * gönderme) ama üçüncüsü hiçbir yere yazılamıyordu. Alan ŞEMADA VARDI;
   * iki kapı birden kapalıydı — blok yalnız DISPUTED'da çiziliyordu (o
   * iade NORMAL'di) ve input kanal politikası false ise DISABLED'dı.
   */
  kontrol(
    "DEĞİŞİM varsa sorulur — iade tipi NORMAL olsa bile",
    yenidenGonderimSorulurMu({ returnType: "NORMAL", degisimVar: true }),
  );
  kontrol(
    "  ...DISPUTED'da değişim olmasa da sorulur (aynı ürün geri gidiyor)",
    yenidenGonderimSorulurMu({ returnType: "DISPUTED", degisimVar: false }),
  );
  /**
   * ⚠ ÖRNEK VERİ AYRIMI GÖSTERİYOR: bu satır olmasaydı `return true`
   * yazan mutasyon yeşil kalırdı. Para iadesinde müşteriye giden bir şey
   * yok; boş kutu "doldurulacak bir şey var" sanılırdı.
   */
  kontrol(
    "para iadesinde SORULMAZ (müşteriye mal çıkmıyor)",
    !yenidenGonderimSorulurMu({ returnType: "NORMAL", degisimVar: false }),
  );

  /**
   * ⚠ POLİTİKA KİLİT DEĞİL İPUCU. Kanal ne yapılmasını BEKLEDİĞİNİ söyler;
   * defter ne OLDUĞUNU yazar. Beklentiyle gerçeği kayıt dışı bırakmak
   * defteri bozuyordu — vaka tam buydu.
   */
  kontrol(
    "kanal ödemiyorsa 'normalde satıcı öder' notu",
    kanalNormaldeOderMi(false),
  );
  kontrol("kanal ödüyorsa not tersine döner", !kanalNormaldeOderMi(true));

  const form = readFileSync(
    "src/app/satislar/[id]/iade/iade-formu.tsx",
    "utf8",
  );
  const formKodu = form.replace(/\{\/\*[\s\S]*?\*\/\}/g, " ");
  const blokBasi = formKodu.indexOf("yenidenGonderimSorulurMu({");
  const yenidenBloku = formKodu.slice(blokBasi, blokBasi + 900);
  kontrol("form ortak kuralı çağırıyor (elle kopya koşul yok)", blokBasi > 0);
  kontrol(
    "  ...ve değişim durumunu geçiriyor",
    /degisimVar/.test(yenidenBloku),
  );
  /**
   * ⚠ EN ÖNEMLİSİ: INPUT ARTIK DISABLED DEĞİL. Kilit geri gelirse
   * gerçekten ödenmiş bir gider yine yazılamaz olur.
   */
  kontrol(
    "  ...input KİLİTLİ DEĞİL (ödenmiş gider yazılabilir)",
    !/disabled=\{!yenidenGonderimGorunur\}/.test(yenidenBloku),
  );
  kontrol(
    "  ...değişimde kendi notu çıkıyor",
    /yenidenGonderimDegisimNotu/.test(yenidenBloku),
  );

  kosanBolumler.push("yeniden-gonderim");
}

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
