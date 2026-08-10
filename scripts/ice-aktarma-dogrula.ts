/**
 * ============================================================================
 *  İÇE AKTARMA DOĞRULAYICI — SINAMA
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run ice-aktarma:dogrula
 *
 *  Veritabanına GİTMEZ. Bu modülün tek vaadi şu: "hata varsa HİÇBİR ŞEY
 *  yazılmaz". Aşağıdaki 6. bölüm bunu doğrudan kanıtlar — 3 kusursuz satırın
 *  yanına 1 hatalı satır konur ve planın TAMAMEN boşaldığı gösterilir.
 * ============================================================================
 */

import {
  enYakin,
  iceAktarmaDogrula,
  sayiCoz,
  tarihCoz,
  type HamSatir,
  type HamVeri,
  type Kip,
  type Referans,
} from "../src/lib/ice-aktarma/dogrula";

let basarisiz = 0;
let calisan = 0;
const BOLUM_SAYISI = 7;
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

/** Tekrarlanabilir kimlik — testte rastgelelik olmaz. */
function kimlikUreticiKur() {
  let sayac = 0;
  return () => `id-${++sayac}`;
}

function satir(satirNo: number, hucreler: Record<string, string>): HamSatir {
  return { satirNo, hucreler };
}

function veriKur(parcalar: Partial<HamVeri>): HamVeri {
  return {
    urunler: parcalar.urunler ?? [],
    acilisStogu: parcalar.acilisStogu ?? [],
    kanalSku: parcalar.kanalSku ?? [],
  };
}

const BUGUN = new Date(Date.UTC(2026, 7, 10));

function referansKur(ek?: Partial<Referans>): Referans {
  return {
    kategoriler: [
      { id: "kat-genel", ad: "Genel" },
      { id: "kat-elektronik", ad: "Elektronik" },
    ],
    raflar: [
      { id: "raf-a01", kod: "A-01" },
      { id: "raf-a02", kod: "A-02" },
    ],
    kanalHesaplari: [
      { id: "hes-ty", etiket: "Trendyol — TR Ana Mağaza" },
      { id: "hes-hb", etiket: "Hepsiburada — TR Mağaza" },
    ],
    mevcutVaryantlar: [],
    mevcutKanalSkulari: [],
    bugun: BUGUN,
    ...ek,
  };
}

function calistir(veri: HamVeri, kip: Kip = "YALNIZ_YENI", ek?: Partial<Referans>) {
  return iceAktarmaDogrula(veri, referansKur(ek), kip, kimlikUreticiKur());
}

/** Belirli kodda hata var mı? */
function hataVar(
  sonuc: ReturnType<typeof calistir>,
  kod: string,
  alan?: string,
) {
  return sonuc.hatalar.some((h) => h.kod === kod && (!alan || h.alan === alan));
}

const URUN_TAM = satir(2, {
  urunAdi: "Bluetooth Hoparlör",
  marka: "JBL",
  varyantAdi: "",
  sku: "HOP-001",
  firmaSku: "FRM-1001",
  barkod: "8690000000011",
  kategori: "Genel",
  desi: "3,5",
  raf: "A-01",
});

// ===========================================================================
console.log("\n1) BİÇİM ÇÖZÜCÜLERİ");
// ===========================================================================
{
  kontrol('"12.500,75" -> 12500.75', sayiCoz("12.500,75") === 12500.75);
  kontrol('"12500.75" -> 12500.75', sayiCoz("12500.75") === 12500.75);
  kontrol('"1200" -> 1200', sayiCoz("1200") === 1200);
  kontrol('"" -> null', sayiCoz("") === null);
  kontrol('"abc" -> NaN', Number.isNaN(sayiCoz("abc")));

  const noktali = tarihCoz("01.03.2026");
  kontrol(
    "01.03.2026 -> 2026-03-01 UTC",
    noktali instanceof Date && noktali.toISOString().startsWith("2026-03-01"),
    noktali,
  );
  const tireli = tarihCoz("2026-03-01");
  kontrol(
    "2026-03-01 -> aynı gün",
    tireli instanceof Date && tireli.toISOString().startsWith("2026-03-01"),
  );
  kontrol('"" -> null (bugüne düşer)', tarihCoz("") === null);
  kontrol("31.02.2026 reddedilir", tarihCoz("31.02.2026") === undefined);
  kontrol("bozuk biçim reddedilir", tarihCoz("mart 2026") === undefined);

  kontrol(
    '"Elektonik" -> "Elektronik" önerisi',
    enYakin("Elektonik", ["Genel", "Elektronik"]) === "Elektronik",
  );
  kontrol(
    "çok uzak ad için öneri verilmez",
    enYakin("zzzzzzzz", ["Genel", "Elektronik"]) === null,
  );
  kosanBolumler.push("bicim");
}

// ===========================================================================
console.log("\n2) TEMİZ DOSYA");
// ===========================================================================
{
  const sonuc = calistir(
    veriKur({
      urunler: [URUN_TAM],
      acilisStogu: [
        satir(2, { sku: "HOP-001", adet: "10", birimMaliyet: "1200", paraBirimi: "TRY", tarih: "01.03.2026", raf: "A-01", not: "devir" }),
      ],
      kanalSku: [
        satir(2, { sku: "HOP-001", kanalHesabi: "Trendyol — TR Ana Mağaza", kanalKodu: "TY-HOP-001", komisyonOrani: "18,5" }),
      ],
    }),
  );

  kontrol("hata yok", sonuc.hatalar.length === 0, sonuc.hatalar);
  kontrol("1 ürün", sonuc.ozet.yeniUrun === 1);
  kontrol("1 varyant", sonuc.ozet.yeniVaryant === 1);
  kontrol("1 açılış partisi", sonuc.ozet.acilisPartisi === 1);
  kontrol("10 adet", sonuc.ozet.acilisAdet === 10);
  kontrol("1 kanal SKU", sonuc.ozet.yeniKanalSku === 1);

  const varyant = sonuc.plan.yeniVaryantlar[0];
  kontrol("tek varyant VARSAYILAN işaretlenir", varyant?.varsayilan === true);
  kontrol("raf çözüldü", varyant?.rafId === "raf-a01");
  kontrol("kategori çözüldü", sonuc.plan.yeniUrunler[0]?.kategoriId === "kat-genel");
  kontrol("desi 3,5 okundu", sonuc.plan.yeniUrunler[0]?.desi === 3.5);
  kontrol("komisyon oranı 18,5", sonuc.plan.yeniKanalSkulari[0]?.komisyonOrani === 18.5);
  kosanBolumler.push("temiz");
}

// ===========================================================================
console.log("\n3) ÜRÜN KURALLARI");
// ===========================================================================
{
  // Zorunlu alan
  const eksik = calistir(
    veriKur({ urunler: [satir(2, { urunAdi: "X", sku: "", firmaSku: "F-1" })] }),
  );
  kontrol("SKU boşsa ZORUNLU", hataVar(eksik, "ZORUNLU", "sku"));

  // Dosya içi tekrar — hangi satırla çakıştığı yazar
  const tekrar = calistir(
    veriKur({
      urunler: [
        URUN_TAM,
        satir(3, { ...URUN_TAM.hucreler, firmaSku: "FRM-9", barkod: "" }),
      ],
    }),
  );
  const tekrarHatasi = tekrar.hatalar.find((h) => h.kod === "TEKRAR_DOSYADA");
  kontrol("dosyada tekrar eden SKU yakalanır", tekrarHatasi !== undefined);
  kontrol("çakışılan satır numarası bildirilir", tekrarHatasi?.ek === "2", tekrarHatasi);

  // Kategori bulunamadı + öneri
  const kategoriYok = calistir(
    veriKur({ urunler: [satir(2, { ...URUN_TAM.hucreler, kategori: "Elektonik" })] }),
  );
  const katHata = kategoriYok.hatalar.find((h) => h.alan === "kategori");
  kontrol("olmayan kategori HATA verir", katHata?.kod === "BULUNAMADI");
  kontrol('"Elektronik" önerilir', katHata?.ek === "Elektronik", katHata);

  // Raf da aynı kural
  const rafYok = calistir(
    veriKur({ urunler: [satir(2, { ...URUN_TAM.hucreler, raf: "Z-99" })] }),
  );
  kontrol("olmayan raf HATA verir", hataVar(rafYok, "BULUNAMADI", "raf"));

  // Kategori boş bırakılabilir (uygulamanın kendi kuralıyla tutarlı)
  const kategorisiz = calistir(
    veriKur({ urunler: [satir(2, { ...URUN_TAM.hucreler, kategori: "" })] }),
  );
  kontrol("kategori boş bırakılabilir", kategorisiz.hatalar.length === 0);
  kontrol("kategorisiz ürün null kategoriyle planlanır", kategorisiz.plan.yeniUrunler[0]?.kategoriId === null);

  // Çok varyantlı ürün — aynı ad+marka tek üründe toplanır
  const cokVaryant = calistir(
    veriKur({
      urunler: [
        satir(2, { urunAdi: "Tişört", marka: "Koton", varyantAdi: "M", sku: "T-M", firmaSku: "F-M", kategori: "Genel" }),
        satir(3, { urunAdi: "Tişört", marka: "Koton", varyantAdi: "L", sku: "T-L", firmaSku: "F-L", kategori: "Genel" }),
      ],
    }),
  );
  kontrol("aynı ad+marka TEK ürün olur", cokVaryant.ozet.yeniUrun === 1);
  kontrol("iki varyant oluşur", cokVaryant.ozet.yeniVaryant === 2);
  kontrol(
    "TAM OLARAK BİR varsayılan varyant",
    cokVaryant.plan.yeniVaryantlar.filter((v) => v.varsayilan).length === 1,
  );
  kontrol("ürün çok varyantlı işaretlenir", cokVaryant.plan.yeniUrunler[0]?.cokVaryantli === true);
  kosanBolumler.push("urun");
}

// ===========================================================================
console.log("\n4) İKİ KİP — yalnız yeni ekle / var olanları güncelle");
// ===========================================================================
{
  const mevcut = {
    mevcutVaryantlar: [
      { id: "var-1", urunId: "urun-1", sku: "HOP-001", firmaSku: "FRM-1001", barkod: "8690000000011" },
    ],
  };

  const yalnizYeni = calistir(veriKur({ urunler: [URUN_TAM] }), "YALNIZ_YENI", mevcut);
  kontrol("YALNIZ_YENI: var olan SKU reddedilir", hataVar(yalnizYeni, "ZATEN_KAYITLI", "sku"));

  const guncelle = calistir(veriKur({ urunler: [URUN_TAM] }), "GUNCELLE", mevcut);
  kontrol("GUNCELLE: hata vermez", guncelle.hatalar.length === 0, guncelle.hatalar);
  kontrol("GUNCELLE: güncelleme sayılır", guncelle.ozet.guncellenenVaryant === 1);
  kontrol("GUNCELLE: yeni varyant üretilmez", guncelle.ozet.yeniVaryant === 0);
  kontrol("GUNCELLE: mevcut kimlik korunur", guncelle.plan.guncellenenVaryantlar[0]?.id === "var-1");

  // Firma SKU BAŞKA varyanta aitse her kipte hata
  const calinmisFirmaSku = calistir(
    veriKur({ urunler: [satir(2, { ...URUN_TAM.hucreler, sku: "YENI-1", barkod: "" })] }),
    "GUNCELLE",
    mevcut,
  );
  kontrol(
    "başkasının Firma SKU'su GUNCELLE kipinde de reddedilir",
    hataVar(calinmisFirmaSku, "ZATEN_KAYITLI", "firmaSku"),
  );
  kosanBolumler.push("kip");
}

// ===========================================================================
console.log("\n5) AÇILIŞ STOĞU — her satır AYRI parti");
// ===========================================================================
{
  const partiler = calistir(
    veriKur({
      urunler: [URUN_TAM],
      acilisStogu: [
        satir(2, { sku: "HOP-001", adet: "10", birimMaliyet: "1200", paraBirimi: "TRY", tarih: "01.03.2026" }),
        satir(3, { sku: "HOP-001", adet: "5", birimMaliyet: "1450", paraBirimi: "TRY", tarih: "20.06.2026" }),
      ],
    }),
  );
  kontrol("aynı SKU iki satır -> İKİ parti", partiler.ozet.acilisPartisi === 2);
  kontrol("toplam adet 15", partiler.ozet.acilisAdet === 15);
  kontrol(
    "maliyetler ayrı korunur (FIFO'nun anlamı)",
    partiler.plan.acilisHareketleri[0]?.birimMaliyet === 1200 &&
      partiler.plan.acilisHareketleri[1]?.birimMaliyet === 1450,
  );
  kontrol(
    "eski parti önce (tarih sırası korunur)",
    partiler.plan.acilisHareketleri[0]!.tarih.getTime() <
      partiler.plan.acilisHareketleri[1]!.tarih.getTime(),
  );

  // Tarih boşsa yükleme günü
  const tarihsiz = calistir(
    veriKur({
      urunler: [URUN_TAM],
      acilisStogu: [satir(2, { sku: "HOP-001", adet: "3", tarih: "" })],
    }),
  );
  kontrol(
    "tarih boşsa yükleme günü kullanılır",
    tarihsiz.plan.acilisHareketleri[0]?.tarih.getTime() === BUGUN.getTime(),
  );

  // Maliyetsiz parti serbest (NO_COST kuralları zaten çalışıyor)
  kontrol("maliyetsiz parti kabul edilir", tarihsiz.hatalar.length === 0);
  kontrol("maliyetsiz partide maliyet null", tarihsiz.plan.acilisHareketleri[0]?.birimMaliyet === null);

  // Maliyet var, para birimi yok
  const parasiz = calistir(
    veriKur({
      urunler: [URUN_TAM],
      acilisStogu: [satir(2, { sku: "HOP-001", adet: "3", birimMaliyet: "500", paraBirimi: "" })],
    }),
  );
  kontrol("maliyet varsa para birimi ZORUNLU", hataVar(parasiz, "PARA_BIRIMI_EKSIK"));

  // Tanımsız SKU
  const skusuz = calistir(
    veriKur({ acilisStogu: [satir(2, { sku: "YOK-1", adet: "3" })] }),
  );
  kontrol("ne dosyada ne sistemde olan SKU reddedilir", hataVar(skusuz, "SKU_TANIMSIZ"));

  // Adet kuralları
  const sifirAdet = calistir(
    veriKur({ urunler: [URUN_TAM], acilisStogu: [satir(2, { sku: "HOP-001", adet: "0" })] }),
  );
  kontrol("adet 0 reddedilir", hataVar(sifirAdet, "POZITIF_OLMALI", "adet"));

  const ondalikAdet = calistir(
    veriKur({ urunler: [URUN_TAM], acilisStogu: [satir(2, { sku: "HOP-001", adet: "2,5" })] }),
  );
  kontrol("ondalık adet reddedilir", hataVar(ondalikAdet, "TAM_SAYI_OLMALI", "adet"));
  kosanBolumler.push("acilis");
}

// ===========================================================================
console.log("\n6) KANAL SKU — haftalık komisyon güncelleme akışı");
// ===========================================================================
{
  const mevcut = {
    mevcutVaryantlar: [
      { id: "var-1", urunId: "urun-1", sku: "HOP-001", firmaSku: "FRM-1001", barkod: null },
    ],
    mevcutKanalSkulari: [{ kanalHesabiId: "hes-ty", varyantId: "var-1" }],
  };

  // TY Salı / HB Çarşamba gerçeği: yalnız bu sayfa doldurulup yüklenebilmeli.
  const yalnizKomisyon = calistir(
    veriKur({
      kanalSku: [satir(2, { sku: "HOP-001", kanalHesabi: "Trendyol — TR Ana Mağaza", kanalKodu: "", komisyonOrani: "19,25" })],
    }),
    "GUNCELLE",
    mevcut,
  );
  kontrol("ürün sayfası BOŞ olsa da dosya geçerli", yalnizKomisyon.hatalar.length === 0, yalnizKomisyon.hatalar);
  kontrol("mevcut eşleşme GÜNCELLEME sayılır", yalnizKomisyon.ozet.guncellenenKanalSku === 1);
  kontrol("yeni oran plana girdi", yalnizKomisyon.plan.guncellenenKanalSkulari[0]?.komisyonOrani === 19.25);
  kontrol(
    "kanal kodu boşsa sistem SKU'su kullanılır",
    yalnizKomisyon.plan.guncellenenKanalSkulari[0]?.kanalKodu === "HOP-001",
  );

  const yalnizYeniKip = calistir(
    veriKur({ kanalSku: [satir(2, { sku: "HOP-001", kanalHesabi: "Trendyol — TR Ana Mağaza" })] }),
    "YALNIZ_YENI",
    mevcut,
  );
  kontrol("YALNIZ_YENI kipinde mevcut eşleşme reddedilir", hataVar(yalnizYeniKip, "ZATEN_KAYITLI"));

  // Aynı hesap+varyant iki kez
  const ciftEsleme = calistir(
    veriKur({
      kanalSku: [
        satir(2, { sku: "HOP-001", kanalHesabi: "Trendyol — TR Ana Mağaza" }),
        satir(3, { sku: "HOP-001", kanalHesabi: "Trendyol — TR Ana Mağaza" }),
      ],
    }),
    "GUNCELLE",
    { mevcutVaryantlar: mevcut.mevcutVaryantlar },
  );
  kontrol("aynı hesap+varyant iki kez yazılamaz", hataVar(ciftEsleme, "TEKRAR_DOSYADA"));

  // Oran aralığı
  const oranBuyuk = calistir(
    veriKur({ kanalSku: [satir(2, { sku: "HOP-001", kanalHesabi: "Trendyol — TR Ana Mağaza", komisyonOrani: "150" })] }),
    "GUNCELLE",
    { mevcutVaryantlar: mevcut.mevcutVaryantlar },
  );
  kontrol("%150 komisyon reddedilir", hataVar(oranBuyuk, "ARALIK_DISI"));

  // Olmayan kanal hesabı
  const hesapYok = calistir(
    veriKur({ kanalSku: [satir(2, { sku: "HOP-001", kanalHesabi: "Trendyol — Yok Mağaza" })] }),
    "GUNCELLE",
    { mevcutVaryantlar: mevcut.mevcutVaryantlar },
  );
  kontrol("olmayan kanal hesabı reddedilir", hataVar(hesapYok, "BULUNAMADI", "kanalHesabi"));
  kosanBolumler.push("kanalSku");
}

// ===========================================================================
console.log("\n7) YA HEPSİ YA HİÇİ — tek hata planı tamamen boşaltır");
// ===========================================================================
{
  const karisik = calistir(
    veriKur({
      urunler: [
        satir(2, { urunAdi: "A", sku: "A-1", firmaSku: "FA-1", kategori: "Genel" }),
        satir(3, { urunAdi: "B", sku: "B-1", firmaSku: "FB-1", kategori: "Genel" }),
        satir(4, { urunAdi: "C", sku: "C-1", firmaSku: "FC-1", kategori: "Genel" }),
        // TEK BOZUK SATIR — olmayan kategori
        satir(5, { urunAdi: "D", sku: "D-1", firmaSku: "FD-1", kategori: "Yok Böyle" }),
      ],
      acilisStogu: [satir(2, { sku: "A-1", adet: "5" })],
      kanalSku: [satir(2, { sku: "A-1", kanalHesabi: "Trendyol — TR Ana Mağaza" })],
    }),
  );

  kontrol("hata bildirildi", karisik.hatalar.length === 1, karisik.hatalar);
  kontrol("plan: ürün YOK", karisik.plan.yeniUrunler.length === 0);
  kontrol("plan: varyant YOK", karisik.plan.yeniVaryantlar.length === 0);
  kontrol("plan: açılış hareketi YOK", karisik.plan.acilisHareketleri.length === 0);
  kontrol("plan: kanal SKU YOK", karisik.plan.yeniKanalSkulari.length === 0);
  kontrol(
    "özet tamamen sıfır — 3 sağlam satır bile yazılmaz",
    karisik.ozet.yeniUrun === 0 &&
      karisik.ozet.yeniVaryant === 0 &&
      karisik.ozet.acilisPartisi === 0,
    karisik.ozet,
  );

  const bos = calistir(veriKur({}));
  kontrol("bomboş dosya reddedilir", hataVar(bos, "HIC_SATIR_YOK"));

  // --- ARTÇI HATA OLMAZ ---
  // Ürün satırındaki kategori hatası, o ürünün stok satırlarını da
  // "SKU tanımsız" diye işaretlememeli: 1 kök neden, 1 hata.
  const artci = calistir(
    veriKur({
      urunler: [satir(2, { urunAdi: "A", sku: "A-1", firmaSku: "FA-1", kategori: "Yok Böyle" })],
      acilisStogu: [
        satir(2, { sku: "A-1", adet: "10" }),
        satir(3, { sku: "A-1", adet: "5" }),
      ],
      kanalSku: [satir(2, { sku: "A-1", kanalHesabi: "Trendyol — TR Ana Mağaza" })],
    }),
  );
  kontrol(
    "kategori hatası stok satırlarına ARTÇI hata üretmez",
    artci.hatalar.length === 1 && artci.hatalar[0]?.alan === "kategori",
    artci.hatalar,
  );
  kontrol("artçı SKU_TANIMSIZ üretilmedi", !hataVar(artci, "SKU_TANIMSIZ"));

  // Gerçekten hiç bildirilmemiş SKU ise hata YİNE verilir.
  const gercektenYok = calistir(
    veriKur({
      urunler: [satir(2, { urunAdi: "A", sku: "A-1", firmaSku: "FA-1", kategori: "Genel" })],
      acilisStogu: [satir(2, { sku: "BASKA-SKU", adet: "10" })],
    }),
  );
  kontrol("hiç bildirilmemiş SKU hâlâ yakalanır", hataVar(gercektenYok, "SKU_TANIMSIZ"));

  kosanBolumler.push("hepsi-ya-hici");
}

// ===========================================================================
console.log("");
if (kosanBolumler.length !== BOLUM_SAYISI) {
  console.log(
    `KOŞUM YARIM KALDI — sonuç GEÇERSİZ (${kosanBolumler.length}/${BOLUM_SAYISI}: ${kosanBolumler.join(", ")})`,
  );
  process.exit(1);
} else if (basarisiz === 0) {
  console.log(`TÜM KONTROLLER GEÇTİ (${calisan})`);
  process.exit(0);
} else {
  console.log(`${basarisiz} KONTROL BAŞARISIZ (${calisan} kontrol içinde)`);
  process.exit(1);
}
