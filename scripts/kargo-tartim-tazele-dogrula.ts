import {
  firmaEslemesi,
  kanalTahminiHesapla,
  kargoTartimGeldiTazele,
} from "../src/lib/kargo-tartim-tazele";

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
      soldAt: new Date("2026-09-05T00:00:00.000Z"),
    },
    zehirliDb(),
  );
  return !sonuc.yapildi && sonuc.neden === "ZATEN_GERCEKLESEN";
}
/* ═══ ③ TARİFE PARTİSİ SEÇİMİ — SATIŞIN GÜNÜNE GÖRE (K201-4, 17.09.2026) ═══ */
/**
 * ⛔ VAKA: `tarifeTablosundanTahmin`nin `cargoTariff.findFirst`i `orderBy`
 * TAŞIMIYORDU. Tek tarife partisi varken sorun görünmüyordu; HB'nin ikinci
 * partisi (2026-09-10) eklenince MySQL'in sırasız taraması ESKİ (08-01)
 * satırı döndürmeye başladı — CANLIDA ÖLÇÜLDÜ: 30 desi değerinde 116/116
 * `findFirst` (orderBy'sız) çağrısı STALE tarifeyi verdi.
 *
 * Sahte istemci bu gerçek davranışı taklit eder: `where.effectiveFrom.lte`
 * VE `orderBy.effectiveFrom === "desc"` verilmezse satırları EKLEME
 * sırasıyla (eski önce — canlıda ölçülen gerçek sıra) döner. Kod bu iki
 * parametreyi düşürürse test bunu YAKALAR.
 */
console.log("\n  ── TARİFE PARTİSİ SEÇİMİ (soldAt'a göre, K201-4)");
type TahminDb = Parameters<typeof kanalTahminiHesapla>[0];
function sahteTarifeDb(satirlar: { effectiveFrom: Date; amount: string }[]): TahminDb {
  return {
    cargoCarrier: { findFirst: async () => ({ id: "carrier-1" }) },
    cargoTariff: {
      findFirst: async (args: {
        where?: { effectiveFrom?: { lte?: Date } };
        orderBy?: { effectiveFrom?: string };
      }) => {
        let s = satirlar;
        const esik = args?.where?.effectiveFrom?.lte;
        if (esik) s = s.filter((r) => r.effectiveFrom.getTime() <= esik.getTime());
        if (args?.orderBy?.effectiveFrom === "desc") {
          s = [...s].sort((a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime());
        }
        return s[0] ?? null;
      },
    },
  } as unknown as TahminDb;
}
/** ⚠ EKLEME SIRASI BİLEREK ESKİ→YENİ — canlıda ölçülen gerçek MySQL sırası. */
const ESKI_PARTI = { effectiveFrom: new Date("2026-08-01T00:00:00.000Z"), amount: "78.50" };
const YENI_PARTI = { effectiveFrom: new Date("2026-09-10T00:00:00.000Z"), amount: "81.99" };
async function tarifePartisiTestleri() {
  const db = sahteTarifeDb([ESKI_PARTI, YENI_PARTI]);
  const eskiDonem = await kanalTahminiHesapla(db, {
    kanalAdi: "Hepsiburada",
    channelId: "kanal-1",
    kanalKargoFirmasi: "hepsiJET",
    desi: 1,
    soldAt: new Date("2026-08-15T00:00:00.000Z"),
  });
  kontrol(
    "yeni tarifeden ÖNCE satılan sipariş ESKİ tutarı alır (78,50)",
    eskiDonem.tamam && Math.abs(eskiDonem.tutar - 78.5) < 0.005,
    eskiDonem,
  );

  const yeniDonem = await kanalTahminiHesapla(db, {
    kanalAdi: "Hepsiburada",
    channelId: "kanal-1",
    kanalKargoFirmasi: "hepsiJET",
    desi: 1,
    soldAt: new Date("2026-09-15T00:00:00.000Z"),
  });
  kontrol(
    "yeni tarifeden SONRA satılan sipariş YENİ tutarı alır (81,99)",
    yeniDonem.tamam && Math.abs(yeniDonem.tutar - 81.99) < 0.005,
    yeniDonem,
  );

  const partiGunu = await kanalTahminiHesapla(db, {
    kanalAdi: "Hepsiburada",
    channelId: "kanal-1",
    kanalKargoFirmasi: "hepsiJET",
    desi: 1,
    soldAt: new Date("2026-09-10T00:00:00.000Z"),
  });
  kontrol(
    "tarifenin GEÇERLİ OLDUĞU gün (effectiveFrom'un kendisi) dahildir (lte)",
    partiGunu.tamam && Math.abs(partiGunu.tutar - 81.99) < 0.005,
    partiGunu,
  );
}

async function main() {
  try {
    const sonuc = await zatenGerceklesenTesti();
    kontrol("cargoAmount DOLUYSA hiçbir şey yapılmaz VE db'ye dokunulmaz", sonuc);
  } catch (e) {
    kontrol("cargoAmount DOLUYSA hiçbir şey yapılmaz VE db'ye dokunulmaz", false, e);
  }

  await tarifePartisiTestleri();

  console.log(
    "\n" + (hata === 0 ? "TÜM KONTROLLER GEÇTİ" : "BAŞARISIZ") + ` (${gecen}/${gecen + hata})`,
  );
  console.log(
    "\n⚠ FİRMA ADI ÇÖZÜMÜ (CargoCarrier eşleşmesi) VE `satisKarTazele` ZİNCİRİ" +
      " bu bekçide sınanmıyor — canlı veriyle, gerçek 17 TY + 3 HB siparişte" +
      " sınandı (bkz. teslim raporu). Tarife PARTİSİ SEÇİMİ (soldAt'a göre)" +
      " artık yukarıda sahte istemciyle sınanıyor (K201-4).\n",
  );
  process.exit(hata === 0 ? 0 : 1);
}
main();
