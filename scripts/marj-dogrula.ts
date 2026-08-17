import {
  MARJ_OLCULERI,
  VARSAYILAN_OLCU,
  ciroMarji,
  ciroMarjiMetni,
  olcuGecerliMi,
  satirGostergesi,
  sermayeVerimi,
  sermayeVerimiMetni,
} from "../src/lib/marj-gosterge";

/**
 * ============================================================================
 *  MARJ GÖSTERGESİ — DOĞRULAMA
 * ----------------------------------------------------------------------------
 *  Kullanıcı şartları 17.08.2026:
 *    · tek ölçü, "ikisi birden" YOK
 *    · ciro marjı TAM SAYI · sermaye verimi KARTLA BİREBİR aynı biçim
 *    · NET yoksa gösterge yok · iptalli satırda yok · maliyet yoksa "?"
 *    · zarar aynı biçimde eksi ile
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

console.log("\nMARJ GÖSTERGESİ — DOĞRULAMA\n");

// --- 1) GERÇEK VAKA: ₺881,22 · %61 ------------------------------------------
{
  console.log("1) GERÇEK VAKA");
  /**
   * Satış 11512722550: NET-2 881,22 · ciro 1.434,00 → %61,45 → TAM SAYI %61.
   */
  const yuzde = ciroMarji(881.22, 1434);
  kontrol("marj hesabı doğru", yuzde !== null && Math.abs(yuzde - 61.45) < 0.01, yuzde);
  kontrol("liste biçimi TAM SAYI", ciroMarjiMetni(yuzde) === "%61", ciroMarjiMetni(yuzde));

  const g = satirGostergesi({
    olcu: "ciro",
    net2: 881.22,
    tutar: 1434,
    maliyet: 27.16,
    iptalliMi: false,
  });
  kontrol("gösterge değer döner", g.tur === "DEGER");
  kontrol("  ...metin %61", g.tur === "DEGER" && g.metin === "%61");
  kontrol("  ...zarar değil", g.tur === "DEGER" && g.zararMi === false);
}

// --- 2) SERMAYE — KARTLA BİREBİR --------------------------------------------
{
  console.log("\n2) SERMAYE VERİMİ (kartla birebir)");
  /**
   * ⚠ AYNI SAYI İKİ EKRANDA İKİ DİLDE KONUŞAMAZ (bugünün kargo dersi).
   * Kârlılık kartı da `sermayeVerimi` + `sermayeVerimiMetni` çağırıyor;
   * bu kontroller iki ekranın tek kaynaktan beslendiğini sabitliyor.
   */
  kontrol("200 / 125 = 1,60", sermayeVerimi(200, 125) === 1.6);
  kontrol("biçim iki ondalık + ×", sermayeVerimiMetni(1.6) === "1.60×");
  kontrol("kart örneği 0.13×", sermayeVerimiMetni(sermayeVerimi(3.5, 27.16)) === "0.13×", sermayeVerimiMetni(sermayeVerimi(3.5, 27.16)));

  // Maliyet sıfır ya da eksi: oran yok, sıfır UYDURULMAZ.
  kontrol("maliyet sıfırsa null", sermayeVerimi(100, 0) === null);
  kontrol("maliyet null ise null", sermayeVerimi(100, null) === null);
  kontrol("kâr null ise null", sermayeVerimi(null, 100) === null);
}

// --- 3) İPTALLİ SATIRDA GÖSTERGE YOK ----------------------------------------
{
  console.log("\n3) İPTALLİ SATIR");
  /**
   * İptal edilen satış hiç doğmamış sayılır; marjını göstermek olmayan bir
   * kârı tartışmak olurdu.
   */
  const g = satirGostergesi({
    olcu: "ciro",
    net2: 881.22,
    tutar: 1434,
    maliyet: 27.16,
    iptalliMi: true,
  });
  kontrol("iptalli satırda gösterge YOK", g.tur === "YOK", g);
}

// --- 4) NET HESAPLANAMADIYSA GÖSTERGE YOK -----------------------------------
{
  console.log("\n4) NET YOK");
  const g = satirGostergesi({
    olcu: "ciro",
    net2: null,
    tutar: 1434,
    maliyet: 27.16,
    iptalliMi: false,
  });
  kontrol("NET null ise gösterge YOK", g.tur === "YOK");
}

// --- 5) SERMAYE MODUNDA MALİYET YOKSA "?" -----------------------------------
{
  console.log("\n5) MALİYET YOK (NO_COST)");
  const g = satirGostergesi({
    olcu: "sermaye",
    net2: 881.22,
    tutar: 1434,
    maliyet: null,
    iptalliMi: false,
  });
  kontrol("maliyet yoksa BİLİNMİYOR", g.tur === "BILINMIYOR", g);

  /**
   * AYNI SATIR CİRO MODUNDA DEĞER VERİR: ölçü değişince gösterge de değişir,
   * çünkü ciro marjı maliyete ihtiyaç duymaz.
   */
  const ciroModu = satirGostergesi({
    olcu: "ciro",
    net2: 881.22,
    tutar: 1434,
    maliyet: null,
    iptalliMi: false,
  });
  kontrol("  ...ama ciro modunda değer VAR", ciroModu.tur === "DEGER");
}

// --- 6) ZARAR — aynı biçim, eksi ile ----------------------------------------
{
  console.log("\n6) ZARAR");
  const g = satirGostergesi({
    olcu: "ciro",
    net2: -120,
    tutar: 1000,
    maliyet: 900,
    iptalliMi: false,
  });
  kontrol("zarar işaretlenir", g.tur === "DEGER" && g.zararMi === true);
  kontrol("  ...biçim aynı, eksi ile", g.tur === "DEGER" && g.metin === "%-12", g);

  const sermaye = satirGostergesi({
    olcu: "sermaye",
    net2: -120,
    tutar: 1000,
    maliyet: 900,
    iptalliMi: false,
  });
  kontrol("sermaye modunda da eksi", sermaye.tur === "DEGER" && sermaye.metin === "-0.13×", sermaye);
}

// --- 7) SIFIR / EKSİ TUTAR — oran anlamsız ----------------------------------
{
  console.log("\n7) SINIR DEĞERLER");
  kontrol("tutar sıfırsa marj null", ciroMarji(100, 0) === null);
  kontrol("tutar eksiyse marj null", ciroMarji(100, -5) === null);
  const g = satirGostergesi({
    olcu: "ciro",
    net2: 100,
    tutar: 0,
    maliyet: 50,
    iptalliMi: false,
  });
  kontrol("  ...gösterge BİLİNMİYOR olur", g.tur === "BILINMIYOR");
}

// --- 8) ÖLÇÜ ÇÖZÜMÜ ---------------------------------------------------------
{
  console.log("\n8) ÖLÇÜ");
  kontrol("varsayılan ciro", VARSAYILAN_OLCU === "ciro");
  kontrol("iki ölçü var, ÜÇÜNCÜ YOK", MARJ_OLCULERI.length === 2);
  kontrol("geçersiz ölçü reddedilir", olcuGecerliMi("ikisi") === false);
  kontrol("boş ölçü reddedilir", olcuGecerliMi(undefined) === false);
  kontrol("geçerli ölçüler tanınır", olcuGecerliMi("ciro") && olcuGecerliMi("sermaye"));
}

console.log("");
console.log("=".repeat(70));
if (kalan === 0) console.log(`TÜM KONTROLLER GEÇTİ (${gecen})`);
else {
  console.log(`${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrolden)`);
  process.exitCode = 1;
}
console.log("");
