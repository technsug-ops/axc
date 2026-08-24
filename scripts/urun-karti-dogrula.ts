import {
  kartOzeti,
  paraBirimiKarisikMi,
  type KartGirdisi,
  type KartSatisi,
} from "../src/lib/urun-karti";
import type { KalemGirdisi } from "../src/lib/panel-listeler";
import { tedarikciAdi } from "../src/lib/tedarikci-adi";
import { aramaKarari } from "../src/lib/kart-arama-karari";
import { aramaKosulu } from "../src/lib/varyant-arama-kurali";
import { readFileSync } from "node:fs";

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
  kontrol(
    "7 günlük dönüş doğru",
    o.ortalamaSatisSuresi === 7,
    o.ortalamaSatisSuresi,
  );
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
  kontrol(
    "  ...ortalama 5,5 gün",
    cok.ortalamaSatisSuresi === 5.5,
    cok.ortalamaSatisSuresi,
  );

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
  kontrol(
    "negatif gün elenir",
    negatif.ortalamaSatisSuresi === null,
    negatif.ortalamaSatisSuresi,
  );
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
  kontrol(
    "ağırlıklı ortalama maliyet 125",
    o.ortalamaMaliyet === 125,
    o.ortalamaMaliyet,
  );
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
  kontrol(
    "maliyetsiz parti ortalamaya GİRMEZ",
    eksik.ortalamaMaliyet === 100,
    eksik.ortalamaMaliyet,
  );

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
  kontrol(
    "hesaplanamayan kalem marjı BOZMAZ",
    karisik.marj === 25,
    karisik.marj,
  );
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
    paraBirimiKarisikMi([{ paraBirimi: "TRY" }, { paraBirimi: "TRY" }]) ===
      false,
  );
  kontrol(
    "TRY + EUR KARIŞIK",
    paraBirimiKarisikMi([{ paraBirimi: "TRY" }, { paraBirimi: "EUR" }]) ===
      true,
  );
}

// --- 9) TEDARİKÇİ ADI — CANLI HATANIN KENDİSİ ------------------------------
{
  console.log("\n9) TEDARİKÇİ ADI (canlı hata 17.08.2026)");

  /**
   * VAKA: ALM-TR-260814-01 alımında tedarikçi "Trendyol" alım ekranında
   * görünüyordu, kârlılık kartında GÖRÜNMÜYORDU. Sebep zincirin kopması
   * değildi — kart `supplierName` alanını HİÇ SORMUYORDU.
   *
   * `Purchase` tedarikçiyi iki alanda taşır: ilişki (10.08.2026'da bağlandı)
   * ve serbest metin (o tarihten önceki kayıtlar + içe aktarma izi).
   */
  kontrol(
    "ilişki doluysa ondan okur",
    tedarikciAdi({ supplier: { name: "Trendyol" }, supplierName: null }) ===
      "Trendyol",
  );
  kontrol(
    "ilişki YOKSA serbest metne düşer (kaçan vaka)",
    tedarikciAdi({ supplier: null, supplierName: "Trendyol" }) === "Trendyol",
  );
  kontrol(
    "ikisi de doluysa İLİŞKİ kazanır (güncel olan)",
    tedarikciAdi({ supplier: { name: "Yeni Ad" }, supplierName: "Eski Ad" }) ===
      "Yeni Ad",
  );
  kontrol(
    "ikisi de boşsa null — ekran 'kayıtsız' yazar",
    tedarikciAdi({ supplier: null, supplierName: null }) === null,
  );
  kontrol(
    "yalnız boşluk taşıyan eski kayıt DOLU sayılmaz",
    tedarikciAdi({ supplier: null, supplierName: "   " }) === null,
  );
}

// --- 10) ARAMA KARARI — canlı hata 17.08.2026 ------------------------------
{
  console.log("\n10) ARAMA KARARI (fazladan tıklama)");

  /**
   * VAKA: /kart?q=OYU-LG-LD-01 tam SKU eşleşmesiydi, TEK sonuç vardı, ama
   * ekran tek elemanlı liste gösterip tıklama bekliyordu. Kural yalnız
   * kamera yolunda uygulanıyordu; klavye yolu onu tanımıyordu.
   *
   * Elinde ürünle bekleyen birine tek satırlık liste gösterip "şuna tıkla"
   * demek, cevabı bilip söylememektir.
   */
  const v = (id: string) => ({ id });

  const tam = aramaKarari({ tamEslesmeId: "v1", sonuclar: [v("v1")] });
  kontrol("1) tam eşleşme → DOĞRUDAN yönlendirir", tam.tur === "YONLEN");
  kontrol(
    "  ...doğru varyanta",
    tam.tur === "YONLEN" && tam.variantId === "v1",
  );

  /**
   * TAM EŞLEŞME KISMİ SONUÇLARI EZER. Kod yazan kullanıcı ne aradığını
   * biliyor; kısmi arama 5 sonuç döndürse bile liste gösterilmez.
   */
  const ezme = aramaKarari({
    tamEslesmeId: "v9",
    sonuclar: [v("v1"), v("v2"), v("v3")],
  });
  kontrol(
    "  ...çok sonuç olsa BİLE tam eşleşme kazanır",
    ezme.tur === "YONLEN" && ezme.variantId === "v9",
    ezme,
  );

  const tek = aramaKarari({ tamEslesmeId: null, sonuclar: [v("v7")] });
  kontrol(
    "2) tam eşleşme yok + TEK kısmi sonuç → yine doğrudan",
    tek.tur === "YONLEN" && tek.variantId === "v7",
    tek,
  );

  kontrol(
    "3) birden çok sonuç → ANCAK o zaman liste",
    aramaKarari({ tamEslesmeId: null, sonuclar: [v("a"), v("b")] }).tur ===
      "LISTE",
  );

  kontrol(
    "hiç sonuç yok → BOŞ (kayıtlı değil ekranı)",
    aramaKarari({ tamEslesmeId: null, sonuclar: [] }).tur === "BOS",
  );
}

// --- 11) ARAMA KAPSAMI — en geniş perspektif (17.08.2026) -------------------
{
  console.log("\n11) ARAMA KAPSAMI");

  /**
   * Kullanıcı isteği: "kârlılık kartı aramaları en geniş perspektiften
   * yapılabilsin — ürün sipariş kodu, pazaryeri SKU, firma SKU, ürün
   * barkod, EAN vs."
   *
   * Ortak varyant araması beş alanı zaten kapsıyordu; SİPARİŞ KODU eksikti.
   * Kaynak metnine değil, ÜRETİLEN KOŞULA bakılıyor.
   */
  const kosul = JSON.stringify(aramaKosulu("ab"));
  const alanlar: [string, string][] = [
    ["SKU", '{"sku":{"contains":"ab"}}'],
    ["Firma SKU", '{"companySku":{"contains":"ab"}}'],
    ["barkod (EAN)", '{"barcode":{"contains":"ab"}}'],
    ["pazaryeri SKU", '"channelSku":{"contains":"ab"}'],
    ["ürün adı", '{"product":{"name":{"contains":"ab"}}}'],
  ];
  for (const [ad, parca] of alanlar) {
    kontrol(`ortak arama ${ad} alanına bakıyor`, kosul.includes(parca), parca);
  }

  /**
   * SİPARİŞ KODU KARTA ÖZGÜ: veri katmanında, satış sipariş no + alım kodu +
   * tedarikçi sipariş no üzerinden. Ortak aramaya EKLENMEDİ çünkü satış/alım
   * formlarında ürün seçerken sipariş numarası aramak yanıltıcı olurdu.
   */
  const kaynak = readFileSync("src/lib/kart-arama-verisi.ts", "utf8");
  kontrol(
    "kart araması SATIŞ sipariş no'ya bakıyor",
    /prisma\.sale\.findMany/.test(kaynak),
  );
  kontrol("kart araması ALIM koduna bakıyor", /code: esle/.test(kaynak));
  kontrol("  ...tedarikçi sipariş no da", /supplierOrderNo: esle/.test(kaynak));
  kontrol(
    "iptal edilen satış sipariş aramasına GİRMEZ",
    /iptalTarihi: null/.test(kaynak),
  );
  kontrol("iptal edilen alım da girmez", /status: "CANCELLED"/.test(kaynak));
  /**
   * ÇOK KALEMLİ SİPARİŞTE TAM EŞLEŞME DÖNMEZ: hangi ürünün kartı açılacağı
   * belli değildir, kullanıcı listeden seçer.
   */
  kontrol(
    "çok kalemli siparişte doğrudan açma YOK",
    /varyantlar\.length === 1/.test(kaynak),
  );
}

// ===========================================================================
console.log("\nSON ALIM — geçmiş sorusu, stok sorusu DEĞİL");
// ===========================================================================
{
  /**
   * ⚠ BU BÖLÜM BİR CANLI HATADAN DOĞDU (21.08.2026). Kullanıcı: _"stok
   * bitince geçmişe dönük alım verileri gelmiyor"_.
   *
   * Sebep: "son alım" EN YENİ AÇIK PARTİDEN okunuyordu. Stok bitince açık
   * parti kalmaz → kart "alım yok" derdi; oysa alım vardı, STOK yoktu.
   * Ölçüldü: alım geçmişi olan 93 varyantın 26'sı (%28) etkileniyordu.
   *
   * ⚠ TESTLER BUNU NEDEN YAKALAMADI: kart doğrulaması `sonAlim*` alanlarına
   * HİÇ bakmıyordu. Sözleşmenin dört taahhüdü sınanıyordu, beşincisi
   * ("son alım doğru kaynaktan gelir") hiç yazılmamıştı.
   *
   * ⚠ VE BU KONTROL KAYNAK TARAR — desen ÖNCE SAYILDI. `partiler` bu dosyada
   * çok yerde geçiyor (yaş · ortalama maliyet · açık parti listesi); dosyanın
   * tamamında arasaydım hiçbir şey ayırt edemezdim. Bu yüzden desen
   * `sonAlimHareketi` BLOĞUNA daraltılarak aranıyor.
   */
  const kaynak = readFileSync("src/lib/urun-karti-verisi.ts", "utf8");

  const bas = kaynak.indexOf("const sonAlimHareketi =");
  const son = kaynak.indexOf("const sonAlimAcikMi");
  kontrol("son alım bloğu bulunabiliyor", bas > 0 && son > bas);
  const blok = kaynak.slice(bas, son);

  kontrol(
    "son alım LEDGER'dan okunuyor (stockMovement)",
    /stockMovement\.findFirst/.test(blok),
  );
  /**
   * ⚠ VE AÇIK PARTİDEN OKUNMUYOR. Asıl hata buydu; "stockMovement var" demek
   * yetmez — eski kaynak yanında durursa hata geri gelir.
   */
  kontrol(
    "  ...açık partiden DEĞİL (partiler bloğa girmiyor)",
    !/partiler/.test(blok),
  );
  /**
   * ⚠ ALIMA BAĞLI GİRİŞ: düzeltme (ADJUSTMENT) ya da iade girişi "alım"
   * değildir. İkisi de pozitif hareket üretir; süzgeç olmasaydı kart bir
   * iadeyi "son alım" diye gösterirdi.
   */
  kontrol(
    "yalnız ALIMA BAĞLI giriş sayılıyor",
    /purchaseItemId:\s*\{\s*not:\s*null\s*\}/.test(blok),
  );
  kontrol(
    "yalnız GİRİŞ hareketi (quantityDelta > 0)",
    /quantityDelta:\s*\{\s*gt:\s*0\s*\}/.test(blok),
  );
  kontrol(
    "en YENİsi seçiliyor",
    /orderBy:\s*\{\s*occurredAt:\s*"desc"\s*\}/.test(blok),
  );
  /**
   * ⚠ MALİYET HAREKETİN DAMGASINDAN, alım kaleminden DEĞİL. Kasadan fiilen
   * çıkan tutarı taşıyan yer orası (kupon vakası 19.08.2026: ürünün piyasa
   * değeri ile bize maliyeti farklı şeylerdir, defter ikincisini yazar).
   */
  kontrol("maliyet hareketin damgasından", /unitCostAmount:\s*true/.test(blok));

  /**
   * ── TÜKENMİŞ PARTİ SESSİZ KALMIYOR ─────────────────────────────────────
   * Şikâyet veriyi göstermemekti; çaresi veriyi ÇERÇEVESİZ göstermek değil.
   * "Son alım ₺3.899" yazıp stoğun bittiğini söylememek bu sefer TERS yönde
   * yanlış olurdu — mal elde sanılırdı.
   */
  kontrol(
    "son alımın partisi açık mı hesaplanıyor",
    kaynak.includes("sonAlimAcikMi"),
  );
  kontrol(
    "  ...ve karta taşınıyor",
    /sonAlimAcikMi,/.test(kaynak.slice(kaynak.lastIndexOf("return {"))),
  );

  const kart = readFileSync("src/app/kart/[variantId]/page.tsx", "utf8");
  /**
   * ⚠ VE KOŞULUYLA BİRLİKTE ARANIYOR: yalnız `partiTukendi` anahtarını
   * arasaydım, koşulu `true`ya çeviren bir mutasyon (her zaman "tükendi"
   * yaz) testi geçerdi.
   */
  kontrol(
    "kart tükenmiş partiyi YAZIYOR (koşulla birlikte)",
    /veri\.sonAlimAcikMi\s*\?\s*null\s*:\s*t\("partiTukendi"\)/.test(kart),
  );

  const sozluk = JSON.parse(readFileSync("messages/tr.json", "utf8"));
  kontrol(
    "metin sözlükten",
    typeof sozluk.UrunKarti?.partiTukendi === "string" &&
      sozluk.UrunKarti.partiTukendi.length > 0,
  );

  /**
   * ⚠ YAŞ VE ORTALAMA MALİYET DEĞİŞMEDİ — ve değişmemeli. Onlar gerçekten
   * ELDEKİ stoğun soruları; stok yokken null olmaları DOĞRU. Yalnız "son
   * alım" yanlış kapıya soruluyordu. Biri "madem geçmişe bakıyoruz, yaşı da
   * geçmişten alalım" derse burası kırmızı yanar.
   */
  kontrol(
    "yaş HÂLÂ en eski AÇIK partiden (elde ne var sorusu)",
    /const enEski = partiler\[0\]/.test(kaynak),
  );
}

// ===========================================================================
//  KART KÜNYESİ — KDV · KATEGORİ · DESİ (24.08.2026)
// ===========================================================================
{
  const kartEkrani = readFileSync(
    "src/app/kart/[variantId]/page.tsx",
    "utf8",
  );
  const kartKodu = kartEkrani.replace(/\{?\/\*[\s\S]*?\*\/\}?/g, " ");

  kontrol("kartta KDV oranı yazıyor", /t\("kdvSatiri"/.test(kartKodu));
  /**
   * ⚠ ÇIPLAK ORAN YETMEZ — KAYNAĞI DA YAZAR. "%20" hangi halkadan geldiğini
   * söylemez; kullanıcı ürüne istisna mı girilmiş, kategoriden mi geliyor,
   * varsayılana mı düşmüş bilmeden oranı düzeltemez.
   */
  kontrol(
    "  ...ve oranın KAYNAĞI da söyleniyor",
    /kdvKaynak\$\{veri\.kdvKaynagi\}|kdvKaynak\$\{/.test(kartKodu),
  );
  /**
   * ⚠ `OR` DEĞİL `AND` — iki dal da ARANIR (mutasyon bulgusu 24.08.2026).
   * İlk yazım `/kategoriSatiri|kategoriYok/` idi; DOLU dalı silen mutasyon
   * BOŞ dalıyla ayakta kaldı ve kontrol yeşil yandı. Değer dalı ile boş
   * dalı ayrı ayrı sınanmadıkça, ikisinden biri sessizce kaybolabilir.
   */
  kontrol(
    "kartta kategori DEĞERİ yazıyor",
    /t\("kategoriSatiri", \{ ad: veri\.kategoriAdi \}\)/.test(kartKodu),
  );
  kontrol(
    "  ...ve boş kategori dalı da var",
    /t\("kategoriYok"\)/.test(kartKodu),
  );
  kontrol(
    "kartta desi DEĞERİ yazıyor",
    /t\("desiSatiri", \{ desi: bicim\.sayi\(veri\.desi\) \}\)/.test(kartKodu),
  );
  kontrol("  ...ve boş desi dalı da var", /t\("desiYok"\)/.test(kartKodu));
  /**
   * ⚠ BOŞ DEĞER "GİRİLMEMİŞ" DER, SIFIRA DÜŞMEZ. Desi yoksa "0" yazmak,
   * ölçülmüş bir sıfır gibi okunurdu.
   */
  /** ⚠ BOŞ DEĞER "girilmemiş" der, SIFIRA DÜŞMEZ — 0 ölçülmüş gibi okunurdu. */
  kontrol(
    "  ...boş dal 'girilmemiş' diyor, sıfır YAZMIYOR",
    !/desi 0|kategori: 0/.test(kartKodu),
  );

  /**
   * ⚠ KART OKUMA YÜZEYİ — EYLEM DÜĞMESİ GİRMEZ. "Alım gir / Düzenle / Sil"
   * ürün sayfasında kalır; karta girerse kart bir eylem paneline döner ve
   * okunurluğu kaybolur. Bu kontrol koşulur hâlde tutuyor.
   */
  for (const yasak of [
    "AlertDialog",
    "urunSil",
    "silAction",
    "/duzenle",
    "/alimlar/yeni",
  ]) {
    kontrol(
      `kartta EYLEM yok: ${yasak}`,
      !kartKodu.includes(yasak),
    );
  }
  /** Tek sessiz bağlantı: sayfaya geçiş. Düğme değil, link. */
  kontrol(
    "karttan ürün sayfasına SESSİZ bağlantı var",
    /urunSayfasi/.test(kartKodu) && /<Baglanti/.test(kartKodu),
  );

  /**
   * ⚠ GÖMÜLÜ RENK KALMAZ. Kartta bugün sıfır; bu kontrol onu KALICI yapıyor
   * — yarın eklenen bir `#RRGGBB` ya da ham Tailwind rengi kırmızı yanar.
   * Renk tek kaynaktan (`lib/renkler`) gelir, ekranda elle yazılmaz.
   */
  const kartHam = readFileSync("src/app/kart/[variantId]/page.tsx", "utf8");
  const hexler = kartHam.match(/#[0-9a-fA-F]{6}\b/g) ?? [];
  kontrol(`kartta gömülü hex YOK (${hexler.length})`, hexler.length === 0, hexler);
  const hamRenkler =
    kartHam.match(
      /\b(?:text|bg|border|ring)-(?:red|green|blue|amber|yellow|emerald|rose|orange|slate|gray|zinc|neutral)-\d{2,3}\b/g,
    ) ?? [];
  kontrol(
    `kartta ham Tailwind rengi YOK (${hamRenkler.length})`,
    hamRenkler.length === 0,
    hamRenkler,
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
