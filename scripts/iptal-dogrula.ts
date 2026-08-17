import {
  ACIKLAMA_ZORUNLU,
  iptalPlani,
  iptalliSayilirMi,
  type CikisHareketi,
  type IptalGirdisi,
} from "../src/lib/satis-iptali";

/**
 * ============================================================================
 *  SATIŞ İPTALİ — DOĞRULAMA
 * ----------------------------------------------------------------------------
 *  Mimar kararları 17.08.2026:
 *    · iadeli satış iptal EDİLEMEZ (kısmi iptal REDDEDİLDİ)
 *    · engel sessiz duvar değil, yol gösterir (iade kaydına bağlantı)
 *    · MAGAZA_DIGER açıklama zorunlu
 *    · maliyet çıkışın AYNASI, ledger silinmez
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

const cikis = (
  adet: number,
  maliyet: string | null = "100.00",
  varyant = "v1",
  kaynak: string | null = "parti-1",
): CikisHareketi => ({
  hareketId: `h-${varyant}-${adet}`,
  variantId: varyant,
  adet,
  birimMaliyet: maliyet,
  birimMaliyetParaBirimi: maliyet === null ? null : "TRY",
  locationId: "raf-A",
  kaynakHareketId: kaynak,
});

const temel: IptalGirdisi = {
  iptalEdilmisMi: false,
  iadeler: [],
  sebep: "MUSTERI_VAZGECTI",
  not: null,
  cikislar: [cikis(2)],
  etki: { ciro: 3000, net2: 450, paraBirimi: "TRY", hakedisEslesmisMi: false },
};

console.log("\nSATIŞ İPTALİ — DOĞRULAMA\n");

// --- 1) NORMAL İPTAL — stok geri döner --------------------------------------
{
  console.log("1) NORMAL İPTAL");
  const p = iptalPlani(temel);
  kontrol("iptal edilebilir", p.olur === true);
  kontrol("tek hareket yazılır", p.olur && p.hareketler.length === 1);
  kontrol("2 adet geri döner", p.olur && p.geriDonenAdet === 2, p);
  kontrol(
    "hareket POZİTİF (stoğa giriş)",
    p.olur && p.hareketler[0].quantityDelta === 2,
  );
}

// --- 2) MALİYET AYNASI — yeni maliyet uydurulmaz ----------------------------
{
  console.log("\n2) MALİYET AYNASI");
  const p = iptalPlani({ ...temel, cikislar: [cikis(1, "1882.08")] });
  kontrol(
    "çıkış maliyeti AYNEN geri girer",
    p.olur && p.hareketler[0].birimMaliyet === "1882.08",
    p.olur ? p.hareketler[0].birimMaliyet : p,
  );
  kontrol(
    "para birimi taşınır",
    p.olur && p.hareketler[0].birimMaliyetParaBirimi === "TRY",
  );
  /**
   * ⚠ KAYNAK BAĞI YAZILMAZ — ÖLÇÜLMÜŞ CANLI HATA 17.08.2026.
   *
   * Test önce "kaynak partiye BAĞLANIR" diyordu ve kod öyle yazılmıştı.
   * Canlıda ölçüldü: ayna hareket HEM pozitif olduğu için yeni parti
   * sayılıyor HEM de kaynak bağıyla eski partinin tüketimini sıfırlıyordu.
   * Satış 11512722550'de ledger stoğu 1 iken FIFO 2 parti gösterdi —
   * bir adet HAYALET stok.
   *
   * İade tarafı (`RETURN_IN`) kaynak bağı yazmaz; iptal de yazmaz.
   * Maliyet aynası envanter değerini korumaya yeter.
   */
  kontrol(
    "kaynak bağı YAZILMAZ (hayalet parti önlenir)",
    p.olur && p.hareketler[0].sourceMovementId === null,
    p.olur ? p.hareketler[0].sourceMovementId : p,
  );
  kontrol(
    "  ...ama MALİYET aynen taşınır (envanter değeri korunur)",
    p.olur && p.hareketler[0].birimMaliyet === "1882.08",
  );
  kontrol("raf konumu korunur", p.olur && p.hareketler[0].locationId === "raf-A");

  // Maliyeti bilinmeyen çıkış: null AYNEN taşınır, sıfır UYDURULMAZ.
  const maliyetsiz = iptalPlani({ ...temel, cikislar: [cikis(1, null)] });
  kontrol(
    "maliyetsiz çıkış null döner (sıfır değil)",
    maliyetsiz.olur && maliyetsiz.hareketler[0].birimMaliyet === null,
  );
}

// --- 3) İADELİ SATIŞ — ENGEL + YOL GÖSTERME ---------------------------------
{
  console.log("\n3) İADELİ SATIŞ (mimar kararı: ENGEL)");
  const p = iptalPlani({
    ...temel,
    iadeler: [{ id: "iade-9", kod: "IAD-2026-0004" }],
  });
  kontrol("iadeli satış İPTAL EDİLEMEZ", p.olur === false);
  kontrol("engel sebebi IADE_VAR", !p.olur && p.engel === "IADE_VAR");
  /**
   * ENGEL SESSİZ DUVAR DEĞİL: kullanıcı hangi iadeye bakacağını bilmeli.
   * "Yapamazsın" demek yetmez, "şunu kullan" demek gerekir.
   */
  kontrol(
    "iade kaydı GERİ DÖNER (ekran bağlantı verebilsin)",
    !p.olur && p.iade?.id === "iade-9",
    !p.olur ? p.iade : p,
  );
  kontrol("iade KODU da döner", !p.olur && p.iade?.kod === "IAD-2026-0004");
}

// --- 4) EK ŞART 2: ÇOK KALEMLİ SATIŞ, TEK KALEM İADE ------------------------
{
  console.log("\n4) ÇOK KALEMLİ SATIŞ — TEK KALEM İADE (sınır durumu)");
  /**
   * MİMAR ŞARTI 17.08.2026 — AÇIK SENARYO.
   *
   * Üç kalemli bir satışta YALNIZ BİR kalem iade edildi. Satışın tamamı
   * iptal EDİLEMEZ: geri kalan iki kalem için iptal doğru olsa da, iade
   * edilmiş kalem zaten stoğa döndü ve iptal onu İKİNCİ KEZ sokardı.
   *
   * Kısmi iptal seçeneği bilinçli REDDEDİLDİ: "hem iadeli hem iptal" diye
   * melez bir satış türü doğar ve her raporda ayrı istisna olarak yaşar.
   */
  const p = iptalPlani({
    ...temel,
    cikislar: [cikis(1, "100.00", "v1"), cikis(1, "200.00", "v2"), cikis(1, "300.00", "v3")],
    iadeler: [{ id: "iade-1", kod: "IAD-0001" }],
  });
  kontrol(
    "3 kalemli satış, 1 kalem iadeli → TAMAMI iptal edilemez",
    p.olur === false && p.engel === "IADE_VAR",
    p,
  );
  kontrol(
    "  ...kısmi iptal ÜRETİLMEZ (melez tür yok)",
    !p.olur && !("hareketler" in p),
  );

  // İade YOKSA aynı üç kalemli satış sorunsuz iptal edilir.
  const iadesiz = iptalPlani({
    ...temel,
    cikislar: [cikis(1, "100.00", "v1"), cikis(1, "200.00", "v2"), cikis(1, "300.00", "v3")],
  });
  kontrol(
    "iadesi olmayan 3 kalemli satış iptal EDİLİR",
    iadesiz.olur && iadesiz.hareketler.length === 3,
  );
  kontrol("  ...üç varyant da geri döner", iadesiz.olur && iadesiz.geriDonenAdet === 3);
}

// --- 5) ZATEN İPTAL — ikinci kez iptal stoğu iki kez sokardı ----------------
{
  console.log("\n5) ZATEN İPTAL");
  const p = iptalPlani({ ...temel, iptalEdilmisMi: true });
  kontrol("ikinci iptal ENGELLENİR", !p.olur && p.engel === "ZATEN_IPTAL");
}

// --- 6) SEBEP ve AÇIKLAMA ---------------------------------------------------
{
  console.log("\n6) SEBEP / AÇIKLAMA");
  kontrol(
    "sebepsiz iptal olmaz",
    (() => {
      const p = iptalPlani({ ...temel, sebep: null });
      return !p.olur && p.engel === "SEBEP_YOK";
    })(),
  );

  /**
   * "DİĞER" KENDİNİ ANLATMAK ZORUNDA — altı ay sonra o satıra bakan kişi
   * neden iptal edildiğini bilmeli.
   */
  const bosNot = iptalPlani({ ...temel, sebep: "MAGAZA_DIGER", not: null });
  kontrol("MAGAZA_DIGER açıklamasız OLMAZ", !bosNot.olur && bosNot.engel === "ACIKLAMA_YOK");

  const bosluk = iptalPlani({ ...temel, sebep: "MAGAZA_DIGER", not: "   " });
  kontrol("  ...yalnız boşluk da açıklama SAYILMAZ", !bosluk.olur);

  const dolu = iptalPlani({
    ...temel,
    sebep: "MAGAZA_DIGER",
    not: "Tedarikçi fiyatı yanlış girmiş",
  });
  kontrol("  ...açıklama varsa GEÇER", dolu.olur === true);

  // Diğer sebepler açıklama İSTEMEZ — gereksiz zorunluluk iş yavaşlatır.
  for (const sebep of ["MUSTERI_FIYAT", "MUSTERI_VAZGECTI", "MAGAZA_STOK_YOK", "MAGAZA_KOTU_NIYET"] as const) {
    kontrol(
      `${sebep} açıklamasız geçer`,
      iptalPlani({ ...temel, sebep, not: null }).olur === true,
    );
  }
  kontrol(
    "açıklama zorunlu listesi YALNIZ MAGAZA_DIGER",
    ACIKLAMA_ZORUNLU.length === 1 && ACIKLAMA_ZORUNLU[0] === "MAGAZA_DIGER",
  );
}

// --- 7) SÜZGEÇ TEK KAYNAK ---------------------------------------------------
{
  console.log("\n7) SÜZGEÇ (tek kaynak)");
  kontrol("iptalsiz satış sayılmaz", iptalliSayilirMi({ iptalTarihi: null }) === false);
  kontrol(
    "iptalli satış işaretlenir",
    iptalliSayilirMi({ iptalTarihi: new Date("2026-08-17") }) === true,
  );
}

// --- 8) SIFIR ADETLİ ÇIKIŞ defteri kirletmez --------------------------------
{
  console.log("\n8) SIFIR ADET");
  const p = iptalPlani({ ...temel, cikislar: [cikis(2), cikis(0, "50.00", "v2")] });
  kontrol("sıfır adetli hareket YAZILMAZ", p.olur && p.hareketler.length === 1);
  kontrol("  ...toplam etkilenmez", p.olur && p.geriDonenAdet === 2);
}

// --- 9) ETKİ ÖZETİ — onaydan ÖNCE görünmeli ---------------------------------
{
  console.log("\n9) ETKİ ÖZETİ (önizleme-önce)");
  const p = iptalPlani(temel);
  kontrol("plan etki özeti TAŞIR", p.olur && p.etki !== undefined);
  kontrol("  ...ciro doğru", p.olur && p.etki.ciro === 3000);
  kontrol("  ...NET-2 doğru", p.olur && p.etki.net2 === 450);

  /**
   * HESAPLANAMAYAN NET "0" DEĞİL, BİLİNMİYOR. Sıfır gösterilseydi kullanıcı
   * "kâr kaybım yok" sanıp iptal ederdi.
   */
  const netsiz = iptalPlani({
    ...temel,
    etki: { ciro: 3000, net2: null, paraBirimi: "TRY", hakedisEslesmisMi: false },
  });
  kontrol("hesaplanamayan NET null kalır", netsiz.olur && netsiz.etki.net2 === null);

  /**
   * HAKEDİŞ EŞLEŞMESİ ONAYDAN ÖNCE BİLİNMELİ: eşleşmişse iptal beklenen
   * tahsilatı da düşürür.
   */
  const hakedisli = iptalPlani({
    ...temel,
    etki: { ciro: 3000, net2: 450, paraBirimi: "TRY", hakedisEslesmisMi: true },
  });
  kontrol("hakediş eşleşmesi plana taşınır", hakedisli.olur && hakedisli.etki.hakedisEslesmisMi === true);

  // Engel varsa etki HİÇ dönmez — gösterilecek plan yoktur.
  const engelli = iptalPlani({ ...temel, iptalEdilmisMi: true });
  kontrol("engelde etki dönmez", !engelli.olur && !("etki" in engelli));
}

console.log("");
console.log("=".repeat(70));
if (kalan === 0) console.log(`TÜM KONTROLLER GEÇTİ (${gecen})`);
else {
  console.log(`${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrolden)`);
  process.exitCode = 1;
}
console.log("");
