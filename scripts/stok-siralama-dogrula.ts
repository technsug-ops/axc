import { readFileSync } from "node:fs";

import {
  SIRALAMA_ALANLARI,
  VARSAYILAN_SIRA,
  idleriSirala,
  sayfaDilimi,
  siralamaCoz,
  stoguOlanIdler,
  stoguVarMi,
  veritabanindaSiralanir,
  type VaryantOlcumu,
} from "../src/lib/stok-siralama";
import {
  birimKar,
  birimSatisFiyati,
  marjYuzdesi,
  type UrunSatiri,
} from "../src/lib/panel-listeler";

/**
 * ============================================================================
 *  STOK SIRALAMASI VE KÂR CÜMLESİ BEKÇİSİ (K101 + K102, 30.08.2026)
 * ----------------------------------------------------------------------------
 *  ⭐ ÖLÇÜTLERİN ÇOĞU SAF GÖVDEYİ ÇAĞIRIYOR — desen aranmıyor. Anayasa:
 *  "saf hesap katmanı, desen tarayan bekçiye muhtaç olmaz". Kaynak taraması
 *  yalnız EKRAN ÇİZİMİ için var (saf gövdeye taşınamayan tek şey) ve orada
 *  da kullanım bloğuna daraltılıyor.
 *
 *  ⚠ ÖZET VE ÇIKIŞ KODU EN SONDA. 30.08'de `uyari:dogrula`da tam tersi
 *  yaşandı: yeni ölçütler dosyanın SONUNA eklendi, özet ONLARDAN ÖNCE
 *  koşuyordu ve sayaç okunmadan "TÜM KONTROLLER GEÇTİ" yazıldı — üç mutasyon
 *  yeşil geçti. Buradaki bölüm sayacı o tuzağı MEKANİK olarak kapatıyor.
 * ============================================================================
 */

const BOLUM_SAYISI = 6;
const kosanBolumler: string[] = [];

let gecen = 0;
let kalan = 0;

function kontrol(ad: string, sonuc: boolean) {
  if (sonuc) {
    gecen += 1;
    console.log(`  OK    ${ad}`);
  } else {
    kalan += 1;
    console.log(`  HATA  ${ad}`);
  }
}

/** Kaynak metninden bir davranışın geçtiği bloğu keser (kapsam daraltma). */
function blok(metin: string, capa: string, uzunluk: number): string {
  const bas = metin.indexOf(capa);
  return bas < 0 ? "" : metin.slice(bas, bas + uzunluk);
}

function olcum(adet: number, sonHareket: Date | null): VaryantOlcumu {
  return { adet, sonHareket };
}

console.log("");
console.log("STOK SIRALAMASI VE KÂR CÜMLESİ (K101 + K102)");

// ═══════════════════════════════════════════════════════════════════════
console.log("\n§1 SIRA ÇÖZÜMÜ — adres ne derse desin geçerli bir sıra çıkar");
// ═══════════════════════════════════════════════════════════════════════
{
  kontrol(
    "boş adres varsayılana düşüyor (ad · artan)",
    siralamaCoz(undefined, undefined).alan === VARSAYILAN_SIRA.alan &&
      siralamaCoz(undefined, undefined).yon === VARSAYILAN_SIRA.yon,
  );
  /**
   * ⚠ TANINMAYAN ALAN YÖNÜ DE DÜŞÜRÜR. Yalnız alanı varsayılana çekip yönü
   * korumak, adres elle kurcalandığında "ada göre AZALAN" gibi kullanıcının
   * hiç istemediği bir liste üretirdi.
   */
  kontrol(
    "tanınmayan alan -> yön de varsayılana düşüyor",
    siralamaCoz("uydurma", "azalan").yon === "artan",
  );
  kontrol(
    "tanınmayan yön -> alanın doğal yönü (sayısalda azalan)",
    siralamaCoz("adet", "uydurma").yon === "azalan",
  );
  kontrol(
    "geçerli değerler olduğu gibi geçiyor",
    siralamaCoz("hareket", "artan").alan === "hareket" &&
      siralamaCoz("hareket", "artan").yon === "artan",
  );
  /** Üç alanın üçü de çözülebiliyor — dördüncüsü eklenirse burası ısırır. */
  for (const alan of SIRALAMA_ALANLARI) {
    kontrol(`  ...${alan} alanı çözülüyor`, siralamaCoz(alan).alan === alan);
  }
  /**
   * ⚠ VARSAYILAN UCUZ YOL OLMAK ZORUNDA: yalnız "ad" veritabanında
   * çözülüyor. Bu ölçüt bozulursa her stok açılışına ~600 ms'lik bir
   * `groupBy` eklenir ve kimse fark etmez.
   */
  kontrol(
    "yalnız ad veritabanında sıralanıyor (öteki ikisi defterden)",
    veritabanindaSiralanir({ alan: "ad", yon: "artan" }) &&
      !veritabanindaSiralanir({ alan: "adet", yon: "azalan" }) &&
      !veritabanindaSiralanir({ alan: "hareket", yon: "azalan" }),
  );
  kosanBolumler.push("sıra çözümü");
}

// ═══════════════════════════════════════════════════════════════════════
console.log("\n§2 SIFIR SÜZGECİ — negatif stok GİZLENMEZ");
// ═══════════════════════════════════════════════════════════════════════
{
  kontrol("sıfır stok gizleniyor", !stoguVarMi(0));
  kontrol("pozitif stok kalıyor", stoguVarMi(5));
  /**
   * ⛔ EN KRİTİK ÖLÇÜT. `> 0` yazılsaydı bugün AYNI sonucu verirdi (canlıda
   * negatif stok 0) ve yarın doğacak bir negatif stoğu SESSİZCE gizlerdi.
   * Negatif stok bir ANOMALİDİR — tam da görülmesi gereken şey.
   * _(Anayasa: "bir sınırın yönü ölçülmeden çevrilmez".)_
   */
  kontrol("NEGATİF stok GİZLENMİYOR (anomali görünür kalır)", stoguVarMi(-3));

  const olcumler = new Map<string, VaryantOlcumu>([
    ["a", olcum(5, null)],
    ["b", olcum(0, null)],
    ["c", olcum(-2, null)],
  ]);
  const kalanlar = stoguOlanIdler(olcumler);
  kontrol(
    "süzgeç: sıfır düşer, pozitif ve negatif kalır",
    kalanlar.includes("a") && kalanlar.includes("c") && !kalanlar.includes("b"),
  );
  kosanBolumler.push("sıfır süzgeci");
}

// ═══════════════════════════════════════════════════════════════════════
console.log("\n§3 SIRALAMA — hareketsiz kayıt kaybolmuyor, sona gidiyor");
// ═══════════════════════════════════════════════════════════════════════
{
  const adlar = new Map([
    ["a", "Alfa"],
    ["b", "Beta"],
    ["c", "Ceta"],
    ["yok", "Zeta"],
  ]);
  const g1 = new Date("2026-01-10T00:00:00Z");
  const g2 = new Date("2026-05-20T00:00:00Z");
  /** ⚠ "yok" ÖLÇÜM HARİTASINDA HİÇ YOK — hareketi olmayan 51 varyantın hâli. */
  const olcumler = new Map<string, VaryantOlcumu>([
    ["a", olcum(3, g1)],
    ["b", olcum(10, g2)],
    ["c", olcum(0, g1)],
  ]);
  const hepsi = ["a", "b", "c", "yok"];

  const adetAzalan = idleriSirala(hepsi, adlar, olcumler, {
    alan: "adet",
    yon: "azalan",
  });
  kontrol("adet azalan: en çok stoklu başta", adetAzalan[0] === "b");
  /**
   * ⛔ ÖLÇÜM HARİTASINDA OLMAYAN VARYANT DÜŞMEZ — 0 sayılır. Düşseydi
   * sıralamaya basan kullanıcı 51 ürünü sessizce kaybederdi ve toplam
   * satır sayısı ekranın yazdığından az olurdu.
   */
  kontrol(
    "  ...hareketsiz varyant listeden DÜŞMÜYOR",
    adetAzalan.length === hepsi.length && adetAzalan.includes("yok"),
  );
  kontrol(
    "  ...ve 0 sayılıyor (sıfır stoklularla birlikte sonda)",
    adetAzalan.indexOf("yok") > adetAzalan.indexOf("a"),
  );

  const adetArtan = idleriSirala(hepsi, adlar, olcumler, {
    alan: "adet",
    yon: "artan",
  });
  kontrol("adet artan: yön gerçekten çevriliyor", adetArtan[adetArtan.length - 1] === "b");

  /**
   * ⚠ HAREKETSİZ KAYIT HER İKİ YÖNDE DE SONDA. "Hiç hareket görmemiş" bir
   * tarih değil, tarihin YOKLUĞUDUR; en eski sayıp başa almak olmayan bir
   * bilgiyi hüküm gibi göstermek olurdu.
   */
  for (const yon of ["artan", "azalan"] as const) {
    const s = idleriSirala(hepsi, adlar, olcumler, { alan: "hareket", yon });
    kontrol(
      `hareket ${yon}: tarihsiz kayıt SONDA`,
      s[s.length - 1] === "yok",
    );
  }
  kontrol(
    "hareket azalan: en yeni başta",
    idleriSirala(hepsi, adlar, olcumler, { alan: "hareket", yon: "azalan" })[0] ===
      "b",
  );

  /**
   * ⚠ EŞİTLİK BOZUCU ADA BAĞLI — yoksa eşit adetli satırların sırası
   * koşumdan koşuma değişir ve sayfa 2'ye geçen kullanıcı aynı ürünü iki
   * kez görebilir.
   */
  const esitler = new Map<string, VaryantOlcumu>([
    ["x", olcum(4, null)],
    ["y", olcum(4, null)],
  ]);
  const esitAdlar = new Map([
    ["x", "Zebra"],
    ["y", "Ankara"],
  ]);
  const esitSira = idleriSirala(["x", "y"], esitAdlar, esitler, {
    alan: "adet",
    yon: "azalan",
  });
  kontrol("eşit adette sıra ADA göre kararlı", esitSira[0] === "y");

  kontrol(
    "ada göre sıralama yönü çalışıyor",
    idleriSirala(hepsi, adlar, olcumler, { alan: "ad", yon: "azalan" })[0] ===
      "yok",
  );

  kontrol(
    "sayfa dilimi doğru pencereyi alıyor",
    sayfaDilimi(["1", "2", "3", "4", "5"], 2, 2).join(",") === "3,4",
  );
  kosanBolumler.push("sıralama");
}

// ═══════════════════════════════════════════════════════════════════════
console.log("\n§4 EKRAN — sıra SÜZGECİN TAMAMI üzerinde kuruluyor");
// ═══════════════════════════════════════════════════════════════════════
{
  const sayfa = readFileSync("src/app/stok/page.tsx", "utf8");

  /**
   * ⛔ EN PAHALI HATA: sayfayı çekip ELDEKİ 50 satırı sıralamak. Ekran
   * "adede göre sıralı" der, gerçekte 2. sayfada 1. sayfadan büyük adet
   * çıkar ve hiçbir şey hata vermez.
   *
   * ⚠ ÖLÇÜT BLOĞA DARALTILDI: `findMany` bu dosyada birçok yerde geçiyor;
   * aranan şey SIRALAMA DALININ içindeki çağrı.
   */
  /**
   * ⚠ ÇAPA ÖLÇÜLDÜ: `veritabanindaSiralanir(sira)` bu dosyada İKİ KEZ
   * geçiyor — biri `olcumGerek` satırında (daha ÖNCE), öteki sıralama
   * dalında. İlk yazımda ilkine bağlanmıştı ve pencere yanlış yere bakıyordu:
   * üç ölçüt kırmızı yandı, kod ise doğruydu. Çapa ATAMA satırına bağlandı.
   * _(Anayasa: "önce deseni SAY — birden çoksa çağrı yerine bağlan".)_
   */
  const siraliDal = blok(sayfa, "const varyantlar = veritabanindaSiralanir(sira)", 2400);
  kontrol("sıralama dalı bulundu", siraliDal.length > 0);
  kontrol(
    "sıralanan küme SÜZGECİN TAMAMI (skip/take ile kesilmiyor)",
    /where: suzgec,\s*select: \{ id: true/.test(siraliDal),
  );
  kontrol(
    "  ...ve sayfa SIRALAMADAN SONRA dilimleniyor",
    siraliDal.indexOf("idleriSirala(") < siraliDal.indexOf("sayfaDilimi(") ||
      /sayfaDilimi\(\s*idleriSirala\(/.test(siraliDal),
  );
  /**
   * ⛔ `where: { id: { in: [...] } }` DİZİ SIRASINI KORUMAZ. Bu satır
   * silinirse sıralama sessizce kaybolur — ekran "sıralı" derken liste
   * rastgele gelir.
   */
  kontrol(
    "sayfa satırları sıralanmış kimlik dizisine göre GERİ SIRALANIYOR",
    /sayfaIdleri\s*\n?\s*\.map\(\(id\) => harita\.get\(id\)\)/.test(siraliDal),
  );

  /**
   * ⚠ TOPLAM SÜZGECİN TAMAMINDAN OKUNUR (İlke #15 / K61). Sayfaya
   * düşseydi ekran "toplam 865 adet" yerine sayfanın toplamını yazardı.
   */
  const toplamBloku = blok(sayfa, "stokToplami", 400);
  kontrol(
    "toplam adet SÜZGECİN TAMAMINDAN (sayfadan değil)",
    /where: suzgec \? \{ variant: suzgec \}/.test(toplamBloku) &&
      !/skip:/.test(toplamBloku),
  );

  /**
   * ⚠ ÖLÇÜM YALNIZ GEREKTİĞİNDE KOŞUYOR. Koşul kaldırılırsa varsayılan
   * stok açılışına ~600 ms ekleniyor ve hiçbir test bunu görmez.
   */
  const olcumBloku = blok(sayfa, "const olcumGerek", 700);
  kontrol(
    "ölçüm koşullu (varsayılan sırada groupBy koşmuyor)",
    /olcumGerek =\s*stokSuzgeciAcik \|\| !veritabanindaSiralanir\(sira\)/.test(
      olcumBloku,
    ) && /if \(olcumGerek\)/.test(olcumBloku),
  );

  /**
   * ⚠ EKRANIN SÜZGECİ EXCEL'E DE GİDER. Gitmeseydi ekran 230 satır
   * gösterirken indirilen dosyada 1104 satır olurdu — muhasebeye giden
   * belge ekranı yalanlardı (İlke #10, "sayı = liste").
   */
  const excelBloku = blok(sayfa, "<ExcelIndir", 260);
  kontrol(
    "Excel indirmesi sıfır süzgecini taşıyor",
    /stok: stokSuzgeciAcik \? "var" : undefined/.test(excelBloku),
  );
  const disaAktarma = readFileSync("src/lib/disa-aktarma/listeler.ts", "utf8");
  /**
   * ⛔ VE ÖLÇÜT PAYLAŞILAN GÖVDEDEN. Excel kendi `!== 0`unu yazsaydı biri
   * gün gelip `> 0` olur, ikisi sessizce ayrışırdı.
   */
  kontrol(
    "  ...ve ölçütü PAYLAŞILAN gövdeden alıyor (kendi eşiğini yazmıyor)",
    /stoguVarMi\(adet\)/.test(disaAktarma),
  );

  /** Süzgeç ve sıra ekranda GÖRÜNÜR — sessiz süzgeç yasak. */
  const cubuk = readFileSync("src/app/stok/sirala-suzgec.tsx", "utf8");
  kontrol(
    "sıralama çubuğu ekranda çiziliyor",
    /<SiralaSuzgec/.test(sayfa) && /export async function SiralaSuzgec/.test(cubuk),
  );
  /**
   * ⚠ SAYFA HER DEĞİŞİKLİKTE 1'E DÖNER. `sayfa` taşınsaydı sıra değiştiren
   * kullanıcı bambaşka bir listenin 5. sayfasına düşer ve aradığı ürünü
   * "kayboldu" sanardı.
   */
  const adresBloku = blok(cubuk, "function adres(", 500);
  kontrol(
    "sıra/süzgeç değişince sayfa 1'e dönüyor (sayfa taşınmıyor)",
    adresBloku.length > 0 && !/"sayfa"|sayfa:/.test(adresBloku),
  );
  /** ⚠ 44 px DOKUNMA HEDEFİ — İlke #8, depoda birincil cihaz telefon. */
  kontrol(
    "çipler mobilde dokunulabilir (h-11 = 44px)",
    /h-11/.test(blok(cubuk, "function Cip(", 900)),
  );
  kosanBolumler.push("ekran");
}

// ═══════════════════════════════════════════════════════════════════════
console.log("\n§5 KÂR CÜMLESİ — satış fiyatı, maliyet ve adet bir arada");
// ═══════════════════════════════════════════════════════════════════════
{
  /**
   * ⛔ KULLANICI BULGUSU (K102): kartta maliyet, NET-2 ve marj vardı,
   * SATIŞ FİYATI hiçbir yerde yoktu — "%6,0 marj" yazıyordu ama neyin
   * %6'sı olduğu okunamıyordu.
   */
  const satir: UrunSatiri = {
    variantId: "v1",
    urunAdi: "Ürün",
    sku: "axcali1",
    adet: 5,
    ciro: 5000,
    net1: 0,
    net2: 400,
    /**
     * ⛔ ÖRNEK VERİ İLK YAZIMDA KÖRDÜ — VE MUTASYON BUNU YAKALADI.
     * Önce `5 adet / ₺5000` ↔ `4 adet / ₺4000` yazılmıştı: ikisinin de
     * ORANI 1000 çıkıyor, yani yanlış paydayı kullanan mutasyon YEŞİL
     * geçiyordu. Kümelerin farklı olması yetmez — ORANLARI da ayrışmalı.
     *   TÜM küme        5000 / 5 = 1000
     *   HESAPLANAN küme 4400 / 4 = 1100   ← ekranın göstermesi gereken
     * _(Anayasa: "örnek veri ayrımın İKİ YAKASINI göstermeli" ve "mutasyon
     * kaçıyorsa önce TEST VERİSİ sorgulanır".)_
     */
    hesaplananCiro: 4400,
    hesaplananAdet: 4,
    hesaplanamayanKalem: 1,
    kalemSayisi: 5,
  };

  kontrol(
    "birim satış fiyatı = hesaplananCiro / hesaplananAdet",
    birimSatisFiyati(satir) === 1100,
  );
  /** ⚠ VE YANLIŞ PAYDANIN ÜRETECEĞİ DEĞER AÇIKÇA DIŞLANIYOR. */
  kontrol(
    "  ...TÜM kümeden (ciro/adet) okunmuyor",
    birimSatisFiyati(satir) !== satir.ciro / satir.adet,
  );
  /**
   * ⛔ EN ÖNEMLİ ÖLÇÜT — ÜÇ KUTU AYNI PAYDADAN OKUNUYOR MU. Payda ayrışırsa
   * ekrandaki aritmetik tutmaz ve kullanıcı hangi kutunun bozuk olduğunu
   * arar: marj = birimNet2 / birimSatisFiyati eşitliği ekranda görünür.
   */
  const fiyat = birimSatisFiyati(satir);
  const kar = birimKar(satir);
  const marj = marjYuzdesi(satir);
  kontrol(
    "aritmetik ekranda kapanıyor: marj = birimNet2 / birimSatisFiyati",
    fiyat !== null &&
      kar !== null &&
      marj !== null &&
      Math.abs((kar / fiyat) * 100 - marj) < 0.000001,
  );
  kontrol(
    "hesaplanan adet yoksa fiyat null (sıfıra bölünmüyor)",
    birimSatisFiyati({ ...satir, hesaplananAdet: 0 }) === null,
  );

  const kart = readFileSync("src/app/kart/[variantId]/page.tsx", "utf8");
  /**
   * ⚠ PENCERE ÖLÇÜLDÜ, TAHMİN EDİLMEDİ: `karBaslik` ile son ölçütün aradığı
   * `tekSatisMi` arasındaki mesafe **3951 karakter**. İlk yazımda 3600
   * denmişti ve ölçüt kırmızı yandı — kod doğruydu, PENCERE kısaydı.
   * Pay bırakılarak 5200 seçildi; gövde büyürse bu satır yeniden ölçülür.
   * _(Anayasa: "kapsam daraltılır — VE pencere ÖLÇÜLÜR".)_
   */
  const karBloku = blok(kart, 't("karBaslik")', 5200);
  kontrol("kâr bloğu bulundu", karBloku.length > 0);
  /**
   * ⛔ ÖLÜ DAL YASAĞI — DEPONUN EN SIK YALANCI YEŞİLİ.
   * `{false ? (…)` ya da `{false && (…)` yapılan bir dal HİÇ ÇİZİLMEZ ama
   * içindeki sözlük anahtarı dosyada DURUR; aşağıdaki üç ölçüt onu bulur ve
   * yeşil yanar. Bu satır o kaçışı kapatıyor: render koşulu öldürülemez.
   * _(Anayasa: "koşul öldürülür, desen kalır" — dört ayrı vakada yaşandı.)_
   */
  kontrol(
    "kâr bloğunda ÖLÜ DAL yok (koşul öldürülüp desen bırakılmamış)",
    !/\{\s*false\s*[?&]/.test(karBloku),
  );
  /**
   * ⚠ ÜÇÜ DE KÂR BLOĞUNUN İÇİNDE ARANIYOR — dosyanın tamamında değil.
   * "Satılan adet" başka bir bölümde de geçiyor (satış geçmişi); dosya
   * genelinde arasaydık kâr bloğundan silen mutasyon YEŞİL geçerdi.
   */
  kontrol(
    "satış fiyatı kâr bloğunda çiziliyor",
    /t\("birimSatisFiyati"\)/.test(karBloku),
  );
  /**
   * ⛔ ÖLÇÜT İLK YAZIMDA GEVŞEKTİ — MUTASYON YAKALADI. `ozet.satilanBirimMaliyeti`
   * bu blokta İKİ KEZ geçiyor: `deger=` ve hemen altındaki `not=` koşulunda.
   * Kutuyu `ortalamaMaliyet`e çeviren mutasyon `not=` satırındaki ikinci
   * geçişi buluyor ve ölçüt YEŞİL kalıyordu. İşaret artık DEĞER BAĞINA
   * bağlı — etiketle birlikte, tek desende.
   * _(Anayasa: "önce deseni SAY; birden çoksa ada değil KULLANIMA bağlan".)_
   */
  kontrol(
    "maliyet kâr bloğunda çiziliyor (satılan malın maliyeti)",
    /etiket=\{t\("satilanMaliyet"\)\}\s*deger=\{p\(ozet\.satilanBirimMaliyeti\)\}/.test(
      karBloku,
    ),
  );
  kontrol(
    "satılan adet kâr bloğunda çiziliyor",
    /t\("satilanAdet"\)/.test(karBloku),
  );
  /**
   * ⚠ TEK SATIŞTA "son satışın NET-2'si" GİZLENİYOR — `birimNet2` ile
   * MATEMATİK OLARAK aynı sayı olduğu için. Koşul kaldırılırsa aynı rakam
   * iki kutuda görünür ve okur ikincisini yeni bir bilgi sanar (İlke #12).
   */
  kontrol(
    "tek satışta ikinci NET kutusu gizleniyor",
    /ozet\.tekSatisMi \? null : \(/.test(karBloku),
  );
  kosanBolumler.push("kâr cümlesi");
}

// ═══════════════════════════════════════════════════════════════════════
console.log("");
console.log("§6 KART DÜZENİ — geniş ekranda iki sütun, mobilde tek");
// ═══════════════════════════════════════════════════════════════════════
{
  const kart = readFileSync("src/app/kart/[variantId]/page.tsx", "utf8");
  /**
   * ⚠ ÖLÇÜT 30.08.2026'DA PENCEREDEN KURTARILDI — VE NİYE, BURADA YAZAR.
   * Önce `blok(kart, "mx-auto max-w-3xl", 400)` penceresi kullanılıyordu.
   * K103-② künyeyi ızgaranın ÜSTÜNE taşıyınca ızgara o pencerenin DIŞINA
   * çıktı ve ölçüt kırmızı yandı — **kod doğruydu, pencere yanlış yerdeydi.**
   *
   * ⭐ ÇARE PENCEREYİ BÜYÜTMEK DEĞİL, KALDIRMAKTI: iki desen de bu dosyada
   * ÖLÇÜLDÜ ve **TAM BİR KEZ** geçiyor (`grid-cols-[minmax` 1 ·
   * `max-w-3xl` 1). Tek geçişli bir desende pencere hiçbir şey kazandırmaz,
   * yalnız yapı değişince kırılacak bir bağ ekler.
   * _(Anayasa: "önce deseni SAY".)_
   */
  const izgaraSayisi = (kart.match(/grid-cols-\[minmax/g) ?? []).length;
  const tabanSayisi = (kart.match(/max-w-3xl/g) ?? []).length;
  kontrol("ızgara sınıfı TAM BİR KEZ geçiyor (ölçüt tekil)", izgaraSayisi === 1);
  kontrol("taban genişlik TAM BİR KEZ geçiyor", tabanSayisi === 1);

  /**
   * ⛔ KULLANICI BULGUSU (K103): masaüstünde kartın sağı TAMAMEN boştu ve
   * fiyat denemesi için aşağı kaydırmak gerekiyordu (İlke #12).
   */
  kontrol(
    "geniş ekranda iki sütun kuruluyor",
    /xl:grid xl:grid-cols-\[/.test(kart),
  );
  /**
   * ⛔ EN KRİTİK ÖLÇÜT — MOBİL BOZULMASIN. Izgara `xl:` ile SINIRLI olmak
   * ZORUNDA; öneki düşerse telefonda da iki sütun açılır ve iki blok birden
   * okunmaz hâle gelir. Depoda birincil cihaz telefon (İlke #8).
   */
  kontrol(
    "ızgara YALNIZ xl: kırılımında (mobilde tek sütun)",
    !/(?<!xl:)grid-cols-\[minmax/.test(kart),
  );
  /**
   * ⚠ TABAN GENİŞLİK MOBİLDE KORUNUYOR: `max-w-3xl` okunabilir sütun
   * genişliği. Kaldırılırsa telefonda satırlar kenardan kenara yayılır.
   */
  kontrol("mobil taban genişliği duruyor (max-w-3xl)", /max-w-3xl/.test(kart));

  /**
   * ⛔ YAPIŞKAN YAPILMADI — VE BU ÖLÇÜLMÜŞ BİR KARARDIR. `FiyatDene` KANAL
   * BAŞINA kart çiziyor; yüksekliği ekranı aşabilir ve ekranı aşan yapışkan
   * blok kendi içinde ikinci bir kaydırma ister. Biri "iyileştirme" diye
   * `sticky` eklerse bu ölçüt kırmızı yanar ve gerekçeyi okur.
   */
  const sagSutun = blok(kart, 'className="mt-6 space-y-6 xl:mt-0"', 900);
  kontrol("sağ sütun bulundu", sagSutun.length > 0);
  kontrol("sağ sütun YAPIŞKAN değil (ölçülmüş karar)", !/sticky/.test(sagSutun));
  kontrol(
    "fiyat denemesi sağ sütunda çiziliyor",
    /<FiyatDene/.test(sagSutun),
  );

  /**
   * ⛔ KÜNYE IZGARANIN DIŞINDA — İKİ SÜTUN AYNI ÇİZGİDEN BAŞLASIN.
   * Künye sol sütunun içindeyken sağdaki kart sayfanın EN TEPESİNDEN
   * başlıyordu ve iki sütun hizasız duruyordu (kullanıcı bulgusu 30.08).
   * Ölçüt: `<h1` ızgara açılışından ÖNCE gelmeli.
   */
  const izgaraKonumu = kart.indexOf("xl:grid xl:grid-cols-[");
  const basligKonumu = kart.indexOf("<h1");
  kontrol(
    "künye ızgaranın ÜSTÜNDE (iki sütun aynı çizgiden başlıyor)",
    basligKonumu > 0 && izgaraKonumu > 0 && basligKonumu < izgaraKonumu,
  );

  /**
   * ⚠ ÖNE ÇIKARMA YÜZEYLE, RENKLE DEĞİL. Bu depoda renk ANLAM taşır
   * (olumlu/olumsuz/uyarı); fiyat denemesine renk koymak olmayan bir hüküm
   * iddia ederdi. Vurgu `shadow` ile — biri renge çevirirse burası yanar.
   */
  const deneKaynak = readFileSync(
    "src/app/kart/[variantId]/fiyat-dene.tsx",
    "utf8",
  );
  /**
   * ⛔ PENCERE DEĞİL, NİTELİĞİN TAMAMI — VE BUNU MUTASYON ÖĞRETTİ.
   * Önce `blok(deneKaynak, "space-y-4 rounded-xl border p-4", 120)` vardı:
   * pencere çapadan İLERİ doğru açılıyor, oysa sınıf listesine eklenen bir
   * renk çapadan ÖNCE duruyor (`bg-amber-100 space-y-4 …`). Renk mutasyonu
   * tam bu yüzden KAÇTI — ölçüt baktığı yerde değildi.
   * Şimdi `className` niteliğinin TAMAMI yakalanıyor; sınıfların sırası
   * değişse de ölçüt yerinde kalır.
   */
  const deneKabi =
    /<div className="([^"]*space-y-4 rounded-xl border p-4[^"]*)"/.exec(
      deneKaynak,
    )?.[1] ?? "";
  kontrol("fiyat denemesi kabının sınıfı okundu", deneKabi.length > 0);
  kontrol(
    "fiyat denemesi kartı ÖNE ÇIKIYOR (yükselti var)",
    /shadow-/.test(deneKabi),
  );
  kontrol(
    "  ...vurgu ANLAM RENGİYLE yapılmamış (renk hüküm taşır)",
    !/(?:bg|text|border|ring)-(?:red|green|blue|amber|yellow|emerald|rose|orange)-\d{2,3}/.test(
      deneKabi,
    ),
  );
  kosanBolumler.push("kart düzeni");
}

// ═══════════════════════════════════════════════════════════════════════
//  ÖZET — BÜTÜN BÖLÜMLERDEN SONRA (30.08.2026 dersi)
// ═══════════════════════════════════════════════════════════════════════
console.log("");
console.log("=".repeat(70));
/**
 * ⛔ SAYAÇ MEKANİZMADIR, SIRA DİSİPLİNİ DEĞİL. Bir bölüm koşmazsa (sıra
 * bozulsa, `return` düşse, hata yutulsa) bekçi "geçti" DEMEZ, GEÇERSİZ der.
 */
if (kosanBolumler.length !== BOLUM_SAYISI) {
  console.log(
    `KOŞUM YARIM KALDI — ${kosanBolumler.length}/${BOLUM_SAYISI} bölüm koştu. SONUÇ GEÇERSİZ.`,
  );
  console.log(`  koşanlar: ${kosanBolumler.join(" · ")}`);
  process.exit(1);
}
if (kalan === 0) {
  console.log(`TÜM KONTROLLER GEÇTİ (${gecen} ölçüt · ${BOLUM_SAYISI} bölüm)`);
} else {
  console.log(`${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrolden)`);
  process.exit(1);
}
console.log("");
