import {
  kartOzeti,
  paraBirimiKarisikMi,
  type KartGirdisi,
  type KartSatisi,
} from "../src/lib/urun-karti";
import type { KalemGirdisi } from "../src/lib/panel-listeler";

/**
 * ============================================================================
 *  ÜRÜN KÂRLILIK KARTI — DOĞRULAMA
 * ----------------------------------------------------------------------------
 *  Sözleşmedeki TAAHHÜTLER tek tek sınanır (17.08.2026):
 *    · kopya hesap yok — marj panel motorundan
 *    · sessiz varsayım yok — bilinmeyen "?" (null), sıfır DEĞİL
 *    · tek satışlık marj uyarısı
 *    · hız gerçek FIFO bağından; bağ yoksa null
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

const g = (gun: number) => new Date(Date.UTC(2026, 7, gun));

const kalem = (
  adet: number,
  ciro: number,
  net2: number | null,
): KalemGirdisi => ({
  variantId: "v1",
  urunAdi: "Koltuk Halı Yıkama Makinesi",
  sku: "SKU-1",
  adet,
  ciro,
  net1: net2,
  net2,
  durum: net2 === null ? "NO_COST" : "CALCULATED",
});

const satis = (
  gun: number,
  adet: number,
  net2: number | null,
  girisGunleri: number[],
  kanal = "Trendyol",
): KartSatisi => ({
  satisId: `s${gun}`,
  soldAt: g(gun),
  kanalAdi: kanal,
  adet,
  net2,
  girisTarihleri: girisGunleri.map(g),
});

const bos: KartGirdisi = {
  kalemler: [],
  satislar: [],
  acikPartiler: [],
  iadeAdedi: 0,
  iadeSayisi: 0,
};

console.log("\nÜRÜN KÂRLILIK KARTI — DOĞRULAMA\n");

// --- 1) HİÇ SATILMAMIŞ ÜRÜN — sessiz boş DEĞİL ------------------------------
{
  console.log("1) HİÇ SATILMAMIŞ");
  const o = kartOzeti(bos);
  kontrol("hiç satılmamış işaretlenir", o.hicSatilmamisMi === true);
  kontrol("marj UYDURULMAZ (null)", o.marj === null);
  kontrol("birim NET-2 null", o.birimNet2 === null);
  kontrol("sermaye verimi null", o.sermayeVerimi === null);
  kontrol("son satış null", o.sonSatis === null);
  kontrol("toplam adet 0", o.toplamAdet === 0);
}

// --- 2) HIZ — alımdan satışa gün --------------------------------------------
{
  console.log("\n2) HIZ (sermaye dönüş)");
  const o = kartOzeti({
    ...bos,
    kalemler: [kalem(1, 1000, 200)],
    // 10.08'de girdi, 17.08'de satıldı → 7 gün
    satislar: [satis(17, 1, 200, [10])],
  });
  kontrol("7 günlük dönüş doğru", o.ortalamaSatisSuresi === 7, o.ortalamaSatisSuresi);
  kontrol("örnek sayısı 1", o.hizOrnekSayisi === 1);

  /**
   * ÇOK PARTİLİ SATIŞ: bir kalem iki partiden düşerse HER DÜŞÜM ayrı örnek.
   * 17-10=7 ve 17-13=4 → ortalama 5,5.
   */
  const cok = kartOzeti({
    ...bos,
    kalemler: [kalem(2, 2000, 400)],
    satislar: [satis(17, 2, 400, [10, 13])],
  });
  kontrol("iki partili satış ikisini de sayar", cok.hizOrnekSayisi === 2);
  kontrol("  ...ortalama 5,5 gün", cok.ortalamaSatisSuresi === 5.5, cok.ortalamaSatisSuresi);

  /**
   * BAĞ YOKSA TAHMİN YOK. `sourceMovement` boş kalmış satış hıza girmez ve
   * ortalama null döner — uydurulmuş bir "0 gün" alım kararını yanıltırdı.
   */
  const bagsiz = kartOzeti({
    ...bos,
    kalemler: [kalem(1, 1000, 200)],
    satislar: [satis(17, 1, 200, [])],
  });
  kontrol("FIFO bağı yoksa hız null", bagsiz.ortalamaSatisSuresi === null);
  kontrol("  ...örnek sayısı 0", bagsiz.hizOrnekSayisi === 0);

  // Geriye dönük alım kaydı: eksi gün diye bir şey yok, örnek elenir.
  const negatif = kartOzeti({
    ...bos,
    kalemler: [kalem(1, 1000, 200)],
    satislar: [satis(10, 1, 200, [17])],
  });
  kontrol("negatif gün elenir", negatif.ortalamaSatisSuresi === null, negatif.ortalamaSatisSuresi);
}

// --- 3) MALİYET ve SERMAYE VERİMİ -------------------------------------------
{
  console.log("\n3) MALİYET / SERMAYE VERİMİ");
  const o = kartOzeti({
    ...bos,
    kalemler: [kalem(2, 2000, 400)],
    satislar: [satis(17, 2, 400, [10])],
    // 3 adet × 100 + 1 adet × 200 = 500 / 4 = 125
    acikPartiler: [
      { kalanAdet: 3, birimMaliyet: 100 },
      { kalanAdet: 1, birimMaliyet: 200 },
    ],
  });
  kontrol("ağırlıklı ortalama maliyet 125", o.ortalamaMaliyet === 125, o.ortalamaMaliyet);
  // birim kâr = 400/2 = 200 · sermaye verimi = 200/125 = 1,6
  kontrol("sermaye verimi 1,6", o.sermayeVerimi === 1.6, o.sermayeVerimi);

  /**
   * MALİYETİ BİLİNMEYEN PARTİ ORTALAMAYI BOZMAZ. Sıfır sayılsaydı ortalama
   * düşer, sermaye verimi olduğundan yüksek çıkar ve kullanıcı zararlı bir
   * ürünü kârlı sanardı.
   */
  const eksik = kartOzeti({
    ...bos,
    kalemler: [kalem(1, 1000, 200)],
    satislar: [satis(17, 1, 200, [10])],
    acikPartiler: [
      { kalanAdet: 1, birimMaliyet: 100 },
      { kalanAdet: 5, birimMaliyet: null },
    ],
  });
  kontrol("maliyetsiz parti ortalamaya GİRMEZ", eksik.ortalamaMaliyet === 100, eksik.ortalamaMaliyet);

  // Hiçbir partinin maliyeti yoksa: "?" (null), sıfır değil.
  const hicMaliyet = kartOzeti({
    ...bos,
    kalemler: [kalem(1, 1000, 200)],
    satislar: [satis(17, 1, 200, [10])],
    acikPartiler: [{ kalanAdet: 5, birimMaliyet: null }],
  });
  kontrol("maliyet hiç yoksa null", hicMaliyet.ortalamaMaliyet === null);
  kontrol("  ...sermaye verimi de null", hicMaliyet.sermayeVerimi === null);
}

// --- 4) MARJ PANEL MOTORUNDAN — kopya hesap yok -----------------------------
{
  console.log("\n4) MARJ (panel motoru)");
  const o = kartOzeti({
    ...bos,
    kalemler: [kalem(2, 1000, 250)],
    satislar: [satis(17, 2, 250, [10])],
  });
  // 250 / 1000 = %25
  kontrol("marj %25", o.marj === 25, o.marj);
  kontrol("birim NET-2 125", o.birimNet2 === 125, o.birimNet2);

  /**
   * HESAPLANAMAYAN KALEM MARJIN PAYDASINA GİRMEZ. Panel motorunun kuralı;
   * kart onu çağırdığı için bedavaya doğru davranır. Girseydi marj
   * olduğundan düşük çıkar, sağlam ürün "zayıf marjlı" görünürdü.
   */
  const karisik = kartOzeti({
    ...bos,
    kalemler: [kalem(2, 1000, 250), kalem(1, 500, null)],
    satislar: [satis(17, 2, 250, [10]), satis(16, 1, null, [10])],
  });
  kontrol("hesaplanamayan kalem marjı BOZMAZ", karisik.marj === 25, karisik.marj);
  kontrol("  ...ama SAYILIR ve bildirilir", karisik.hesaplanamayanKalem === 1);
}

// --- 5) TEK SATIŞ UYARISI ---------------------------------------------------
{
  console.log("\n5) TEK SATIŞ UYARISI");
  const tek = kartOzeti({
    ...bos,
    kalemler: [kalem(1, 1000, 300)],
    satislar: [satis(17, 1, 300, [10])],
  });
  kontrol("tek satış işaretlenir", tek.tekSatisMi === true);

  const cok = kartOzeti({
    ...bos,
    kalemler: [kalem(1, 1000, 300), kalem(1, 1000, 200)],
    satislar: [satis(17, 1, 300, [10]), satis(16, 1, 200, [10])],
  });
  kontrol("iki satışta uyarı YOK", cok.tekSatisMi === false);
}

// --- 6) RİSK SİNYALLERİ -----------------------------------------------------
{
  console.log("\n6) RİSK");
  const o = kartOzeti({
    ...bos,
    kalemler: [kalem(1, 1000, 300), kalem(1, 800, -50), kalem(1, 500, null)],
    satislar: [
      satis(17, 1, 300, [10]),
      satis(16, 1, -50, [10]),
      satis(15, 1, null, [10]),
    ],
    iadeAdedi: 2,
    iadeSayisi: 1,
  });
  kontrol("zarar eden satış sayılır", o.zararliSatis === 1, o.zararliSatis);
  kontrol("  ...NET null olan zarar SAYILMAZ", o.zararliSatis === 1);
  kontrol("iade adedi taşınır", o.iadeAdedi === 2);
  kontrol("iade sayısı taşınır", o.iadeSayisi === 1);
  kontrol("hesaplanamayan kalem sayılır", o.hesaplanamayanKalem === 1);
}

// --- 7) SATIŞ GEÇMİŞİ ÖZETİ -------------------------------------------------
{
  console.log("\n7) SATIŞ GEÇMİŞİ");
  const o = kartOzeti({
    ...bos,
    kalemler: [kalem(2, 2000, 400), kalem(3, 3000, 600)],
    satislar: [
      satis(15, 2, 400, [10], "Trendyol"),
      satis(17, 3, 600, [10], "Hepsiburada"),
      satis(12, 1, 100, [10], "Trendyol"),
    ],
  });
  kontrol("satış sayısı 3", o.satisSayisi === 3);
  kontrol("toplam adet 6", o.toplamAdet === 6, o.toplamAdet);
  kontrol("son satış EN YENİ tarih", o.sonSatis?.getTime() === g(17).getTime());
  kontrol("son satışın NET-2'si", o.sonSatisNet2 === 600, o.sonSatisNet2);
  kontrol(
    "kanallar tekilleştirilir",
    JSON.stringify(o.kanallar) === JSON.stringify(["Hepsiburada", "Trendyol"]),
    o.kanallar,
  );
}

// --- 8) PARA BİRİMİ KARIŞIMI ------------------------------------------------
{
  console.log("\n8) PARA BİRİMİ");
  kontrol(
    "tek para birimi karışık DEĞİL",
    paraBirimiKarisikMi([{ paraBirimi: "TRY" }, { paraBirimi: "TRY" }]) === false,
  );
  kontrol(
    "TRY + EUR KARIŞIK",
    paraBirimiKarisikMi([{ paraBirimi: "TRY" }, { paraBirimi: "EUR" }]) === true,
  );
}

console.log("");
console.log("=".repeat(70));
if (kalan === 0) console.log(`TÜM KONTROLLER GEÇTİ (${gecen})`);
else {
  console.log(`${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrolden)`);
  process.exitCode = 1;
}
console.log("");
