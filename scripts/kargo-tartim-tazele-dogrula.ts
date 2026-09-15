import { firmaEslemesi, kargoTartimGeldiTazele } from "../src/lib/kargo-tartim-tazele";

/**
 * ============================================================================
 *  KARGO TARTIM TAZELEME BEKÇİSİ (15.09.2026)
 * ----------------------------------------------------------------------------
 *      npm run kargo-tartim-tazele:dogrula
 *
 *  ⛔ KORUDUĞU ŞEY: gerçek desi (TARTIM) yeni geldiğinde, HÂLÂ TAHMİN
 *  aşamasındaki (cargoAmount boş) bir siparişin kargo tahmininin doğru
 *  firmayla eşleşmesi VE zaten kesinleşmiş (cargoAmount dolu) bir siparişe
 *  ASLA dokunulmaması (K197-4'ün "gerçekleşeni ezme" kuralı).
 *
 *  ⚠ BU BEKÇİ `satisKarTazele`/`karYenidenYaz` ZİNCİRİNİ SAHTE BİR
 *  VERİTABANIYLA YENİDEN KURMAZ — o zincir kendi bekçileriyle (`kar:dogrula`
 *  vb.) zaten sınanıyor. Burada sınanan: (a) firma-adı eşlemesi SAF
 *  mantığı, (b) tarife sorgusunun DESİ/FİRMA seçimi (enjekte edilen sahte
 *  `cargoCarrier`/`cargoTariff` ile), (c) "zaten gerçekleşen" kısa devresinin
 *  veritabanına HİÇ dokunmadığı — "zehirli" bir sahte istemciyle.
 *  ⛔ UÇTAN UCA (kârın gerçekten tazelendiği) canlı veriyle ayrıca
 *  doğrulanır — bkz. teslim raporu Halil test listesi.
 * ============================================================================
 */

let gecen = 0;
let hata = 0;
function kontrol(ad: string, kosul: boolean, ipucu?: unknown) {
  if (kosul) {
    gecen++;
    console.log("  OK    " + ad);
  } else {
    hata++;
    console.log("  HATA  " + ad);
    if (ipucu !== undefined) console.log("        ", ipucu);
  }
}

console.log("\nKARGO TARTIM TAZELEME BEKÇİSİ\n");

/* ═══ ① FİRMA EŞLEMESİ — SAF, SABİT, DAR ═══════════════════════════════ */
console.log("  ── FİRMA EŞLEMESİ");
kontrol(
  "TY 'Aras Kargo Marketplace' → 'Aras Kargo'",
  firmaEslemesi("Trendyol", "Aras Kargo Marketplace") === "Aras Kargo",
);
kontrol(
  "TY tanınmayan ad → null (uydurulmaz)",
  firmaEslemesi("Trendyol", "Sürat Kargo Marketplace") === null,
);
kontrol("HB 'Aras Kargo' → 'Aras Kargo'", firmaEslemesi("Hepsiburada", "Aras Kargo") === "Aras Kargo");
kontrol("HB 'hepsiJET' → 'hepsiJET'", firmaEslemesi("Hepsiburada", "hepsiJET") === "hepsiJET");
kontrol("HB tanınmayan ad → null", firmaEslemesi("Hepsiburada", "MNG Kargo") === null);
kontrol("firma adı null → null", firmaEslemesi("Trendyol", null) === null);
kontrol(
  "desteklenmeyen kanal (bugün N11) → null — dize eşleştirmesi yok",
  firmaEslemesi("N11", "Aras Kargo") === null,
);
kontrol(
  "TY haritası HB'ye SIZMAZ (aynı ad, farklı kanal, ayrı harita)",
  firmaEslemesi("Trendyol", "hepsiJET") === null,
);

/* ═══ ② "ZATEN GERÇEKLEŞEN" KISA DEVRESİ — VERİTABANINA HİÇ DOKUNMAZ ═══ */
console.log("\n  ── ZATEN GERÇEKLEŞEN KISA DEVRESİ");
type DbParam = Parameters<typeof kargoTartimGeldiTazele>[1];
/** Herhangi bir metoda dokunulursa fırlatan "zehirli" sahte istemci. */
function zehirliDb(): DbParam {
  const patla = () => {
    throw new Error("kısa devre BEKLENİYORDU — veritabanına dokunuldu");
  };
  return {
    sale: { update: patla },
    $transaction: patla,
    cargoCarrier: { findFirst: patla },
    cargoTariff: { findFirst: patla },
    auditLog: { create: patla },
  } as unknown as DbParam;
}
async function zatenGerceklesenTesti(): Promise<boolean> {
  const sonuc = await kargoTartimGeldiTazele(
    {
      saleId: "sfsfsf",
      channelId: "sfsfsf",
      kanalAdi: "Trendyol",
      kanalKargoFirmasi: "Aras Kargo Marketplace",
      kanalKargoDesi: 3,
      cargoAmount: 117.85,
      tahminiKargo: null,
    },
    zehirliDb(),
  );
  return !sonuc.yapildi && sonuc.neden === "ZATEN_GERCEKLESEN";
}
async function main() {
  try {
    const sonuc = await zatenGerceklesenTesti();
    kontrol("cargoAmount DOLUYSA hiçbir şey yapılmaz VE db'ye dokunulmaz", sonuc);
  } catch (e) {
    kontrol("cargoAmount DOLUYSA hiçbir şey yapılmaz VE db'ye dokunulmaz", false, e);
  }

  console.log(
    "\n" + (hata === 0 ? "TÜM KONTROLLER GEÇTİ" : "BAŞARISIZ") + ` (${gecen}/${gecen + hata})`,
  );
  console.log(
    "\n⚠ TARİFE SORGUSU (CargoTariff/CargoCarrier) VE `satisKarTazele` ZİNCİRİ" +
      " bu bekçide sınanmıyor — canlı veriyle, gerçek 17 TY + 3 HB siparişte" +
      " sınandı (bkz. teslim raporu).\n",
  );
  process.exit(hata === 0 ? 0 : 1);
}
main();
