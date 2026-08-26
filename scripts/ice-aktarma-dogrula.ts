import { readFileSync } from "node:fs";

import { birimFiyatCoz, iptalAniCoz } from "./canli-ty-ice-aktar";

/**
 * ============================================================================
 *  İÇE AKTARMA BEKÇİSİ — A3-③
 * ----------------------------------------------------------------------------
 *  Üç ölçülmüş tuzağı koşulur hâlde tutuyor. Üçü de canlı ölçümle
 *  yakalandı, hiçbiri koddan okunarak bulunmadı:
 *
 *    ① `price` SATIR toplamıdır — birim sanılırsa çok adetli kalem iki
 *       katı fiyatla girer (11/11 ölçüldü)
 *    ② komisyon alanı `commission`; `commissionRate` HİÇ YOK (0/564)
 *    ③ `orderDate` 3 saat kaymış — ham hâli 20 siparişi yanlış güne atar
 *       (defterle göz göze: ham 89/109, kaydırılmış 109/109)
 *
 *  ⚠ SAF KURAL + KAYNAK DESENİ BİRLİKTE: saf fonksiyon doğru olabilir ama
 *  çağrılmıyorsa hiçbir şey ifade etmez. Kaynak kontrolleri KULLANIM
 *  BLOĞUNA daraltılmış hâlde arar — dosyanın tamamında değil.
 * ============================================================================
 */

let hata = 0;
let gecen = 0;

function kontrol(ad: string, sonuc: boolean) {
  if (sonuc) {
    gecen++;
    console.log(`  ✓ ${ad}`);
  } else {
    hata++;
    console.log(`  ✗ ${ad}`);
  }
}

/**
 * TEK OKUMA KAPISI — satır sonu normalleştirilir.
 * ⚠ `prisma format` şemayı CRLF'e çevirince bir bekçi sessizce boş bulmuştu;
 * o dersin bu dosyadaki karşılığı.
 */
function oku(yol: string): string {
  return readFileSync(yol, "utf8").replace(/\r\n/g, "\n").replace(/^﻿/, "");
}

/**
 * YORUMLARI SÖK — "dokunmuyor" iddiası YORUMDA da geçiyor.
 *
 * ⚠ BU BİR MUTASYON BULGUSUNUN ÇARESİ. İlk sürüm `StockMovement`
 * üretilmediğini `stockMovement:` + `{ create` deseniyle arıyordu ve
 * mutasyon **ÇOĞUL** yazınca (`stockMovements: { create: [] }`) bekçi
 * YEŞİL kaldı. Deseni genişletmek de yetmezdi: dosyanın başlığı zaten
 * "StockMovement ÜRETİLMEZ" diye YAZIYOR, yani ham metinde kelime her
 * hâlükârda var. Doğru ölçüt, KODDA geçip geçmediği.
 */
function yorumsuz(metin: string): string {
  return metin
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(new RegExp("(^|[^:])//[^" + String.fromCharCode(10) + "]*", "g"), "$1 ");
}


/** Kullanım bloğunu kes — deseni DOSYADA değil o blokta ara. */
function blok(metin: string, baslangic: string, uzunluk: number): string {
  const i = metin.indexOf(baslangic);
  if (i < 0) return "";
  return metin.slice(i, i + uzunluk);
}

console.log("\nİÇE AKTARMA BEKÇİSİ — A3-③\n");

// ═══ ① SAF KURAL: birim fiyat ══════════════════════════════════════════════
console.log("① birimFiyatCoz — `price` satır toplamıdır");
/**
 * ⚠ ÖRNEK VERİ AYRIMIN İKİ YAKASINI GÖSTERİYOR: adet 1 seçilseydi
 * bölme yapılsa da yapılmasa da aynı sonuç çıkardı ve mutasyon YEŞİL
 * kalırdı. Adet 2 ve 3, bölmeyi kaldıran her mutasyonu kırmızıya çevirir.
 */
kontrol("adet 2 → satır toplamı ikiye bölünür", birimFiyatCoz(1623, 2) === 811.5);
kontrol("adet 3 → üçe bölünür", birimFiyatCoz(2400, 3) === 800);
kontrol("adet 1 → değişmez", birimFiyatCoz(1885, 1) === 1885);
kontrol("gerçek canlı satır 7165/2", birimFiyatCoz(7165, 2) === 3582.5);
kontrol("adet 0 → null (sıfıra bölünmez)", birimFiyatCoz(1000, 0) === null);
kontrol("adet negatif → null", birimFiyatCoz(1000, -1) === null);
kontrol("NaN → null", birimFiyatCoz(Number.NaN, 2) === null);

// ═══ ② SAF KURAL: iptal anı ════════════════════════════════════════════════
console.log("\n② iptalAniCoz — iptal anı kaynağın KENDİ geçmişinden");
const gecmis = [
  { createdDate: 1787600277514, status: "Awaiting" },
  { createdDate: 1787600282116, status: "Created" },
  { createdDate: 1787600387870, status: "Invoiced" },
  { createdDate: 1787600392439, status: "Cancelled" },
];
kontrol(
  "Cancelled satırının anı döner",
  iptalAniCoz(gecmis)?.getTime() === 1787600392439,
);
/**
 * ⚠ AYRIM: "Cancelled" satırı sondan bir önceki olsaydı, son satırı alan
 * bir mutasyon yeşil kalırdı. Bu örnek statüyü ORTAYA koyuyor.
 */
kontrol(
  "sondaki satır Cancelled DEĞİLSE de doğru anı bulur",
  iptalAniCoz([
    { createdDate: 100, status: "Created" },
    { createdDate: 200, status: "Cancelled" },
    { createdDate: 300, status: "Delivered" },
  ])?.getTime() === 200,
);
kontrol(
  "iki kez iptal → EN SONUNCUSU",
  iptalAniCoz([
    { createdDate: 100, status: "Cancelled" },
    { createdDate: 500, status: "Cancelled" },
  ])?.getTime() === 500,
);
kontrol("iptal yoksa null", iptalAniCoz(gecmis.slice(0, 3)) === null);
kontrol("geçmiş yoksa null — VEKİL TARİH ÜRETİLMEZ", iptalAniCoz(null) === null);
kontrol("geçmiş dizi değilse null", iptalAniCoz(undefined) === null);

// ═══ ③ KAYNAK: kural gerçekten ÇAĞRILIYOR mu ══════════════════════════════
console.log("\n③ KAYNAK — kurallar yazma yolunda FİİLEN kullanılıyor mu");
const kaynak = oku("scripts/canli-ty-ice-aktar.ts");

/**
 * ⚠ DESEN SAYILDI: `birimFiyatCoz` dosyada ÜÇ yerde geçiyor — tanım
 * (`export function`), bu bekçinin import ettiği ad, ve gerçek çağrı.
 * Bu yüzden işaret ÇAĞRI YERİNE bağlandı: kalem üretim bloğunun içinde,
 * `l.price` ile `l.quantity` birlikte geçen çağrı.
 */
const kalemBloku = blok(kaynak, "const kalemler: Kalem[] = lines.flatMap", 900);
kontrol("kalem üretim bloğu bulundu", kalemBloku.length > 0);
kontrol(
  "birim fiyat, satır toplamı VE adetle birlikte çözülüyor",
  /birimFiyatCoz\(\s*Number\(l\.price[^)]*\)[^,]*,\s*adet\s*\)/.test(kalemBloku),
);
kontrol(
  "ham `l.price` doğrudan birimFiyat'a yazılmıyor",
  !/birimFiyat:\s*(kurus\()?Number\(l\.price/.test(kalemBloku),
);
/**
 * ⚠ ÖLÇÜLMÜŞ ALAN ADI: `commissionRate` API'de 0/564 dolu, `commission`
 * 564/564. İlk sürüm yanlış adı okuyordu ve **sessizce null yazacaktı**.
 */
kontrol(
  "komisyon `l.commission`dan okunuyor",
  /komisyon:\s*l\.commission\s*!=/.test(kalemBloku),
);
kontrol(
  "API'de var olmayan `l.commissionRate` okunmuyor",
  !/l\.commissionRate/.test(kalemBloku),
);
kontrol("KDV `l.vatRate`ten okunuyor", /kdv:\s*l\.vatRate\s*!=/.test(kalemBloku));

/**
 * ⚠ SAAT KAYMASI — VE İŞARET SABİTİN ADINA DEĞİL KULLANIMINA BAĞLI.
 * `ORDERDATE_KAYMA_MS` dosyada tanım + yorum + çağrı olarak geçiyor;
 * yalnız adını aramak, çıkarmayı kaldıran bir mutasyonu yakalamazdı.
 */
/**
 * ⚠ ÖLÇÜT ORTAK GÖVDEYE TAŞINDI — ve bu bir GÜÇLENDİRMEDİR, gevşetme değil.
 * Burada üç kontrol vardı ve üçü de bu dosyadaki YEREL kayma koduna
 * bakıyordu (`const ham = ...` bloğu). Kod ortak gövdeye taşınınca blok
 * kayboldu ve üçü de kırmızı yandı — davranış DOĞRUYDU, ölçüt eskimişti.
 * ⑤ bölümü aynı şeyi daha sert sınıyor: sabit tek yerde tanımlı VE
 * `orderDate` okuyan HER betik onu kullanıyor.
 */
const kaymaBloku = blok(kaynak, "const duzeltilmis = siparisAni(", 200);
kontrol("kayma düzeltmesi çağrı yerinde bulundu", kaymaBloku.length > 0);
kontrol(
  "pencere süzgeci DÜZELTİLMİŞ değeri kullanıyor",
  /duzeltilmis\s*<\s*bas\s*\|\|\s*duzeltilmis\s*>\s*son/.test(kaymaBloku),
);
/**
 * ⚠ ESKİYEN KONTROL KALDIRILDI, GEVŞETİLMEDİ (26.08.2026).
 * Burada `kayma tam 3 saat` kontrolü içe aktarma betiğinde sabiti
 * arıyordu. Sabit ORTAK gövdeye taşındı (iki okuyucu ayrışmasın diye),
 * dolayısıyla ölçüt yanlış dosyaya bakıyordu ve KIRMIZI yandı — kod
 * doğruydu, ölçüt eskimişti.
 * Aynı şeyi ⑤ bölümü artık DAHA GÜÇLÜ sınıyor: sabit ortak gövdede
 * tanımlı VE her okuyucu onu kullanıyor.
 */
/**
 * ⚠ `soldAt` DÜZELTİLMİŞ ANDAN TÜRETİLİYOR — ham `orderDate`ten değil.
 * Süzgeç düzeltilmiş, `soldAt` ham kalsaydı sipariş doğru pencereye
 * girer ama YANLIŞ GÜNE yazılırdı; iki kontrol ayrı ayrı gerekiyor.
 */
const soldAtBloku = blok(kaynak, "adaylar.set(no, {", 260);
kontrol(
  "soldAt DÜZELTİLMİŞ andan türetiliyor",
  /soldAt:\s*isGunuUtc\(duzeltilmis\)/.test(soldAtBloku),
);

/**
 * ⚠ ÇAKIŞMA KÜRESEL ARANIR — `Sale.code` şemada GLOBAL `@unique`.
 * Kanal süzgeci konsaydı başka kanaldaki aynı kod elenmez, `INSERT`
 * benzersizlik kısıtına çarpardı.
 */
const cakismaBloku = blok(kaynak, "const mevcutKodlar = new Set(", 420);
kontrol("çakışma bloğu bulundu", cakismaBloku.length > 0);
kontrol(
  "çakışma sorgusu KANALLA SÜZÜLMÜYOR (kod global unique)",
  !/channelAccountId/.test(cakismaBloku),
);
kontrol(
  "çakışan aday listeden DÜŞÜRÜLÜYOR",
  /for \(const n of cakisanlar\) adaylar\.delete\(n\)/.test(kaynak),
);

/**
 * ⚠ "DOKUNMUYOR" İDDİASI DA BİR DAVRANIŞTIR — ve tersten sınanır.
 * Rapor `StockMovement` üretilmediğini beyan ediyor ve beyan, onu İHLAL
 * eden bir mutasyonla sınanmadıkça korumasızdır.
 *
 * ⚠ ÖLÇÜT KELİME DEĞİL KOD ŞEKLİ — ve bu iki mutasyon turunun sonucu:
 *   1. tur: `stockMovement:` + `{ create` arandı → ÇOĞUL yazan mutasyon
 *      (`stockMovements: {`) YEŞİL geçti.
 *   2. tur: kelimenin kendisi arandı → temiz dosya KIRMIZI yandı, çünkü
 *      kelime iki DİZEDE geçiyor (AuditLog notu + ekran satırı) ve ikisi
 *      de doğru davranışın BEYANI.
 * Doğrusu ikisi de değil: stok defterine yazmanın iki kod şekli var —
 * ilişki anahtarı (`stockMovement(s):`) ve çağrı (`stockMovement(s).`).
 * İkisi de adın hemen ardından `.` ya da `:` getirir; beyan metninde ise
 * ardından BOŞLUK gelir. Ölçüt bu yüzden beyanı silmekle yeşile dönmez.
 *
 * ⚠ 3. TUR: ölçüt önce `.stockMovement.` diye BAŞTA NOKTA istiyordu ve
 * `stockMovement.create(...)` (öneksiz) kaçtı. Sözcük sınırına
 * (`\b`) bağlanınca dördü de kırmızı yandı.
 */
/**
 * ⚠ ÖLÇÜT: KODDA `stockMovement` GEÇMEZ — tekil/çoğul, çağrı/ilişki
 * fark etmez. Bu dosya stok defterine hiç bakmıyor; adının kodda
 * belirmesinin tek sebebi ona yazmak olurdu.
 */
kontrol(
  "StockMovement ÜRETİLMİYOR — kodda adı hiç geçmiyor",
  !new RegExp("\\" + "bstockMovements?"+"\\" + "s*[.:]", "i").test(yorumsuz(kaynak)),
);
kontrol(
  "yazım `--yaz` bayrağına kilitli",
  /const YAZ = process\.argv\.includes\("--yaz"\)/.test(kaynak) &&
    /if \(!YAZ\) \{/.test(kaynak),
);
kontrol(
  "her kayıt importBatch VE importKaynak taşıyor",
  /importBatch: partiKimligi/.test(kaynak) && /importKaynak: a\.kaynak/.test(kaynak),
);
kontrol("toplu yazım AuditLog bırakıyor", /auditLog\.create/.test(kaynak));
/**
 * ⚠ MUAFİYETİN BEYANI DA SINANIR: sayım tutmazsa yorumlanmayacağı
 * kullanıcının açık şartıydı; beyanın ekrana ULAŞTIĞI ayrı bir davranış.
 */
const sayimBloku = blok(kaynak, "const beklenen = onceToplam", 520);
kontrol("sayım karşılaştırması bulundu", sayimBloku.length > 0);
kontrol(
  "tutmayan sayım YORUMLANMADAN ekrana yazılıyor",
  /SAYIM TUTMADI/.test(sayimBloku) && /YORUMLANMIYOR/.test(sayimBloku),
);

// ═══ ④ ŞERH — STOK AYRIŞMASI GÖRÜNÜR MÜ ═══════════════════════════════════
console.log("\n④ ŞERH — içe aktarma stok ayrışması ekranda söyleniyor mu");

const serhKaynak = oku("src/components/ice-aktarma-serhi.tsx");
const sayacKaynak = oku("src/lib/ice-aktarma-serhi.ts");

/**
 * ⚠ ÖLÇÜT BAĞA BAĞLI, `importBatch`E DEĞİL. Stok bağı kurulduğu gün o
 * satırlar hâlâ `importBatch` taşıyacak ama artık ayrışmış olmayacaklar.
 * Yalnız `importBatch`e bakan bir sayaç o gün de 425 derdi ve şerh
 * SÖNMEZDİ — sönmeyen şerh okunmaz olur.
 */
kontrol(
  "sayaç stok HAREKETİNİN yokluğuna bakıyor",
  /items:\s*\{\s*none:\s*\{\s*stockMovements:\s*\{\s*some:\s*\{\}\s*\}/.test(sayacKaynak),
);
kontrol(
  "sayaç yalnız içe aktarma satırlarını sayıyor",
  /importBatch:\s*\{\s*not:\s*null\s*\}/.test(sayacKaynak),
);

/**
 * ⚠ İKİ YÖN AYRI SINANIR — biri yazılıp öteki atlanırsa karşı yön serbest
 * kalır. YANLIŞ SUSMA: şerh hiç çıkmaz, ayrışma görünmez. YANLIŞ YANMA:
 * sayı sıfırken de çıkar, sönmeyen şerh rozete olan güveni harcar.
 */
kontrol(
  "YANLIŞ YANMA yok — sıfırsa hiç çizilmiyor",
  /if \(adet === 0\) return null;/.test(serhKaynak),
);
const metinBloku = blok(serhKaynak, "return (", 900);
kontrol(
  "YANLIŞ SUSMA yok — sayı ekrana BASILIYOR",
  /t\("stokAyrismasi",\s*\{\s*adet\s*\}\)/.test(metinBloku),
);
kontrol(
  "sebep de yazıyor (İlke #5 — sessiz durum yok)",
  /t\("stokAyrismasiNiye"\)/.test(metinBloku),
);

for (const [ad, yol] of [
  ["stok", "src/app/stok/page.tsx"],
  ["envanter değeri", "src/app/envanter-degeri/page.tsx"],
] as const) {
  const e = oku(yol);
  kontrol(
    `${ad} ekranı şerhi ÇİZİYOR`,
    /<IceAktarmaSerhi\s*\/>/.test(e) && /components\/ice-aktarma-serhi/.test(e),
  );
}

/**
 * ⚠ AYRI KOVA — K54'E KARIŞMAZ. Kullanıcının açık şartı. Karıştırılsaydı
 * K54'ün 2 adetlik gerçek ayrışması 425'lik gürültüde kaybolurdu.
 * ⚠ İşaret SAYIM BLOĞUNA daraltıldı: "ayrı kova" ifadesi yorumda da geçiyor.
 */
const ayrismaKaynak = oku("scripts/canli-defter-ayrismasi.ts");
const kovaBloku = blok(ayrismaKaynak, "const iceAktarmaBagsiz = await", 900);
kontrol("defter-ayrışması ayrı kova sayıyor", kovaBloku.length > 0);
kontrol(
  "ayrı kova SAPAN sayısına eklenmiyor",
  !/sapan\.push|sapan\.length \+/.test(kovaBloku),
);
kontrol(
  "ayrı kova sıfırsa hiç basılmıyor",
  /if \(iceAktarmaBagsiz > 0\)/.test(ayrismaKaynak),
);

// ═══ ⑤ SAAT KAYMASI TEK GÖVDEDEN OKUNUYOR MU ══════════════════════════════
const KACIS_AC = "\\(";
const KACIS_KAPA = "\\)";

console.log("\n⑤ SAAT KAYMASI — orderDate okuyan her betik ortak gövdeden geçiyor mu");

/**
 * ⚠ BU KONTROL BİR CANLI KUSURDAN DOĞDU (26.08.2026).
 *
 * `orderDate`in 3 saatlik kayması önce YALNIZ içe aktarma betiğinde
 * düzeltildi. Mutabakat aracı ham değere bakmaya devam etti ve düzeltilmiş
 * tarihlerle karşılaştırınca **44 sipariş "tarih +1 gün" diye SAPAN ilan
 * edildi** — hepsi aynı yönde. Düzeltilince (c) kovası **47 → 5**, tarih
 * kayması **44 → 0**.
 *
 * ⛔ ÖLÇÜT: `orderDate` OKUYAN HER BETİK ORTAK GÖVDEDEN GEÇMELİ. Kendi
 * sabitini tanımlayan dosya, yarın sessizce ayrışır.
 * _(Anayasa: "düzeltme yolu, TÜM okuyuculara ulaştığı ölçülmeden 'var'
 * sayılmaz".)_
 */
const ORTAK = oku("scripts/ty/istemci.ts");
kontrol(
  "kayma sabiti ORTAK gövdede tanımlı",
  /export const ORDERDATE_KAYMA_MS = 3 \* 3600_000;/.test(ORTAK),
);
kontrol(
  "ortak gövde siparisAni() ve isGunuUtc() veriyor",
  /export function siparisAni\(/.test(ORTAK) && /export function isGunuUtc\(/.test(ORTAK),
);

for (const [ad, yol] of [
  ["içe aktarma", "scripts/canli-ty-ice-aktar.ts"],
  ["mutabakat", "scripts/canli-ty-mutabakat.ts"],
  ["kuru koşum", "scripts/canli-ty-kuru-kosum.ts"],
] as const) {
  const g = yorumsuz(oku(yol));
  const okuyor = new RegExp("\\borderDate\\b").test(g);
  if (!okuyor) {
    kontrol(`${ad} — orderDate okumuyor, kapsam dışı`, true);
    continue;
  }
  /**
   * ⚠ İKİ YÖN: kendi sabitini TANIMLAMAMALI **ve** ortak gövdeyi
   * KULLANMALI. Yalnız birincisi sınansaydı, sabiti silip düzeltmeyi hiç
   * uygulamayan bir dosya yeşil kalırdı.
   */
  kontrol(
    `${ad} — kendi kayma sabitini TANIMLAMIYOR`,
    !/const\s+ORDERDATE_KAYMA_MS\s*=/.test(g),
  );
  /**
   * ⚠ ÖLÇÜT "siparisAni GEÇİYOR MU" DEĞİL, "HAM ERİŞİM KALDI MI".
   *
   * İlk hâli `/siparisAni\(/` arıyordu ve MUTASYONLA DÜŞTÜ: desen bu
   * dosyalarda İKİ yerde geçiyor (pencere süzgeci + gün üretimi), birini
   * ham değere çeviren mutasyon ötekini buluyor ve bekçi YEŞİL kalıyordu.
   *
   * Doğrusu tersten: `siparisAni(...)` çağrıları metinden SİLİNİR, geriye
   * `.orderDate` erişimi kalıyorsa o erişim ortak gövdeden GEÇMİYOR
   * demektir. Tip bildirimi (`orderDate: number`) noktasız olduğu için
   * elenmiş olur.
   * _(Anayasa: "önce deseni SAY" — birden çoksa ölçüt yokluğa bağlanır.)_
   */
  const gecirilmis = g.replace(new RegExp("siparisAni" + KACIS_AC + "[^)]*" + KACIS_KAPA, "g"), " ");
  kontrol(
    `${ad} — ham orderDate erişimi KALMADI`,
    !/\.orderDate/.test(gecirilmis),
  );
}


console.log("\n⑥ MARJ ŞERHİ — ciroda var, kârda yok");

const marjKaynak = oku("src/components/marj-serhi.tsx");
const serhLib = oku("src/lib/ice-aktarma-serhi.ts");

/**
 * ⚠ SÖNME ŞARTI `profitStatus`, `importBatch` DEĞİL.
 * Maliyet bağı kurulup kâr hesaplanınca satır hâlâ `importBatch` taşıyacak.
 * Yalnız `importBatch`e bakan bir sayaç o gün de yanmaya devam ederdi ve
 * şerh HİÇ SÖNMEZDİ — sönmeyen uyarı okunmaz olur.
 */
const marjGovde = blok(serhLib, "export async function marjSerhi(", 2600);
kontrol("marjSerhi gövdesi bulundu", marjGovde.length > 0);
kontrol(
  "bekleyen sayımı `profitStatus === null` ölçütüne bağlı",
  /k\.sale\.profitStatus === null/.test(marjGovde),
);
/**
 * ⚠ ÖLÇÜT DARALTILDI, GEVŞETİLMEDİ: önce `if (importBatch) bekleyenler.add`
 * deseni aranıyordu; sebep ayrışınca o satır iki kovalı bir bloğa dönüştü.
 * Kontrol artık KAPININ kendisine bakıyor — içe aktarma olmayan bir satış
 * hiçbir kovaya giremiyor.
 */
kontrol(
  "iki kova da yalnız İÇE AKTARMA satırlarını sayıyor",
  /if \(k\.sale\.importBatch\) \{/.test(marjGovde),
);
kontrol(
  "iptalli satış ciroya KARIŞMIYOR",
  /iptalTarihi: null/.test(marjGovde),
);
/**
 * ⚠ İKİ RAKAM AYRI PAYDADAN — ve ikisi de üretiliyor.
 * `baglıMarj` yalnız maliyet bağı OLAN cirodan, `ekranMarji` hepsinden.
 * Aynı paydayı kullansalardı iki rakam eşit çıkar ve şerh hiçbir şey
 * söylemezdi.
 */
kontrol(
  "bağlı marj yalnız BAĞLI cirodan hesaplanıyor",
  /baglıMarj: ciroBagli > 0 \? \(net \/ ciroBagli\)/.test(marjGovde),
);
kontrol(
  "ekran marjı TÜM cirodan hesaplanıyor",
  /ekranMarji: ciroHepsi > 0 \? \(net \/ ciroHepsi\)/.test(marjGovde),
);

/** ⚠ YANLIŞ YANMA: bekleyen yoksa şerh HİÇ çizilmemeli. */
/**
 * ⚠ ÖLÇÜT GÜNCELLENDİ — İKİ SEBEP AYRIŞTI (26.08.2026).
 * Önce tek sayı vardı; Halil sebebi ayırdı çünkü ÇÖZÜMÜN YERİ farklı.
 * Şerh ancak İKİSİ de sıfırsa sönmeli — biri sıfırlanınca sönseydi öteki
 * sebep sessizce kaybolurdu.
 */
kontrol(
  "YANLIŞ YANMA yok — İKİ sebep de 0 ise çizilmiyor",
  /if \(s\.bekleyen === 0 && s\.alimYok === 0\) return null;/.test(marjKaynak),
);
/**
 * ⚠ AYIRT EDİCİ ÖLÇÜT VARYANTIN ALIM GEÇMİŞİ. Kalemin kendi hareketine
 * bakan bir ölçüt ikisini ayıramazdı — ikisinde de hareket yok.
 */
kontrol(
  "alım yokluğu VARYANTIN hareket geçmişinden ayırt ediliyor",
  /k\.variant\.stockMovements\.length === 0/.test(marjGovde),
);
kontrol(
  "iki kova AYRI sayılıyor",
  /alimsizlar\.add\(k\.sale\.id\)/.test(marjGovde) &&
    /else bekleyenler\.add\(k\.sale\.id\)/.test(marjGovde),
);
const marjMetin = blok(marjKaynak, "return (", 1400);
kontrol(
  "YANLIŞ SUSMA yok — sayı ekrana BASILIYOR",
  /t\("marjOkunamaz",\s*\{\s*adet:\s*s\.bekleyen\s*\}\)/.test(marjMetin),
);
kontrol(
  "okunabilir marj DA yazılıyor (çıkmaz bırakılmıyor)",
  /t\("marjBagliOlan",\s*\{\s*oran:\s*bicim\.yuzde\(s\.baglıMarj\)\s*\}\)/.test(marjMetin),
);
kontrol(
  "ALIM YOK satırı ekrana BASILIYOR",
  /t\("marjAlimYok",\s*\{\s*adet:\s*s\.alimYok\s*\}\)/.test(marjMetin),
);
kontrol(
  "iki sebep AYRI satırda — tek cümleye karışmıyor",
  /\{s\.bekleyen === 0 \? null : \(/.test(marjMetin) &&
    /\{s\.alimYok === 0 \? null : \(/.test(marjMetin),
);

/**
 * ⚠ MARJ GÖSTEREN HER EKRAN — ve liste elle tutulmuyor: ölçüt
 * "kâr ile ciroyu YAN YANA basan ekran". Üçü de kullanıcının saydığı
 * ekranlar (panel · satışlar · rapor).
 */
for (const [ad, yol] of [
  ["panel", "src/app/page.tsx"],
  ["satışlar", "src/app/satislar/page.tsx"],
  ["rapor", "src/app/rapor/page.tsx"],
] as const) {
  const e = oku(yol);
  kontrol(
    `${ad} ekranı marj şerhini ÇİZİYOR`,
    /<MarjSerhi[^>]*\/>/.test(e) && /components\/marj-serhi/.test(e),
  );
}


console.log("\n⑦ KİMLİK ARAMASI — ortak kod kuralına bağlı mı");

const kuralKaynak = oku("src/lib/varyant-arama-kurali.ts");

/**
 * ⚠ TEK ALAN LİSTESİ. `kodKosulu` ve `kodKosuluToplu` AYNI sabitten
 * türemeli; ayrı ayrı yazılsalardı biri yarın ötekinden sessizce ayrışır
 * ve altıncı bir rol eklendiğinde toplu sürüm eski kalırdı (K34a dersi).
 */
kontrol(
  "varyant kod alanları TEK sabitte",
  /const VARYANT_KOD_ALANLARI = \["barcode", "companySku", "sku"\] as const;/.test(kuralKaynak),
);
for (const [ad, fn] of [
  ["kodKosulu", "export function kodKosulu(kod: string) {"],
  ["kodKosuluToplu", "export function kodKosuluToplu(kodlar: string[]) {"],
] as const) {
  const g = blok(kuralKaynak, fn, 380);
  kontrol(`${ad} bulundu`, g.length > 0);
  kontrol(
    `${ad} ortak alan listesinden türüyor`,
    /VARYANT_KOD_ALANLARI\.map/.test(g),
  );
  kontrol(`${ad} KANAL SKU'yu da kapsıyor`, /channelSkus:\s*\{\s*some:/.test(g));
  kontrol(`${ad} pasif kanal kodunu ELİYOR`, /isActive: true/.test(g));
}

/**
 * ⚠ İÇE AKTARMA ORTAK KURALI KULLANIYOR MU — ve ölçüt YOKLUĞA bağlı:
 * doğrudan `barcode: { in:` yazan bir sorgu, ortak kuralı ATLAMIŞ demektir.
 * Yalnız "kodKosuluToplu geçiyor mu" diye sorsaydım, ikisini birden yazan
 * bir mutasyon yeşil kalırdı.
 */
/**
 * ⚠ PENCERE ÖLÇÜLDÜ, TAHMİN EDİLMEDİ: 1200 karakterle yazıldığında
 * belirsizlik kovası pencerenin DIŞINDA kaldı ve kontrol kırmızı yandı —
 * kod doğruydu, pencere kısaydı. Dar pencere sessiz bir kör nokta üretir.
 */
const kapsamBloku = blok(kaynak, "const tumBarkodlar =", 2400);
kontrol("kimlik arama bloğu bulundu", kapsamBloku.length > 0);
kontrol(
  "içe aktarma ORTAK kuralı çağırıyor",
  /where:\s*\{\s*OR:\s*kodKosuluToplu\(tumBarkodlar\)\s*\}/.test(kapsamBloku),
);
kontrol(
  "doğrudan barcode sorgusu KALMADI (ortak kural atlanmıyor)",
  !/where:\s*\{\s*barcode:\s*\{\s*in:/.test(kapsamBloku),
);
/**
 * ⚠ BELİRSİZ KOD YAZILMAZ. `channelSku` yalnız (hesap, kod) çiftinde
 * tekil: aynı kod iki hesapta iki FARKLI varyanta işaret edebilir.
 * Birini seçmek kalemi yanlış ürüne yazmak olurdu.
 */
kontrol(
  "çok eşleşen kod AYRI kovada, yazılmıyor",
  /if \(kume\.size === 1\) barkodVaryant\.set/.test(kapsamBloku) &&
    /belirsizKodlar\.add\(kod\)/.test(kapsamBloku),
);
kontrol(
  "belirsiz sipariş yazılabilir sayılmıyor",
  /if \(a\.kalemler\.some\(\(x\) => belirsizKodlar\.has\(x\.barkod\)\)\) belirsiz\.push/.test(kaynak),
);


console.log("\n⑧ STOK BAĞI — bağlanabilen bağlanır, geri kalanı ATLANIR");

const bagKaynak = oku("scripts/canli-ice-aktarma-stok-bagi.ts");

/**
 * ⚠ İKİNCİ MOTOR AÇILMADI — ölçüt bu. Satış yazma yolu FIFO'yu
 * `fifoDagit` ile tüketiyor; bağ betiği de aynısını kullanmalı. Ayrı bir
 * tüketim mantığı yazılsaydı iki yol yarın ayrışır ve maliyetler
 * birbirini tutmazdı.
 */
kontrol(
  "bağ betiği ORTAK FIFO gövdesini kullanıyor",
  /fifoDagit\(mevcutPartiler, k\.quantity\)/.test(bagKaynak),
);
const yetersizBloku = blok(bagKaynak, "if (!sonuc.yeterliMi) {", 200);
kontrol(
  "yetersizse HAREKET YAZILMIYOR — atlanıyor",
  /atlananlar\.push/.test(yetersizBloku) && /continue;/.test(yetersizBloku),
);
/**
 * ⚠ "DOKUNMUYOR" İDDİASI DA BİR DAVRANIŞTIR. Karar açıkça _"negatif stok
 * YOK, kaynaksız çıkış kovası YOK"_ diyor; iddia, onu ihlal eden bir
 * mutasyonla sınanmadıkça korumasızdır.
 */
kontrol(
  "atlanan kalem için hiçbir hareket üretilmiyor",
  !/atlananlar[\s\S]{0,300}stockMovement\.create/.test(bagKaynak),
);
kontrol(
  "tüketilen parti SONRAKİ kaleme taşınıyor (çift harcama yok)",
  /kalanPartiler\.set\(k\.variantId, sonuc\.kalanPartiler\)/.test(bagKaynak),
);
kontrol(
  "iptalli satış BAĞLANMIYOR",
  /sale: \{ importBatch: \{ not: null \}, iptalTarihi: null \}/.test(bagKaynak),
);
/**
 * ⚠ `occurredAt` ÖLÇÜLDÜ, SEÇİLMEDİ: mevcut `SALE_OUT` hareketlerinin
 * 151/152'si zaten `Sale.soldAt`. Farklı davranmak tutarsızlık olurdu.
 */
kontrol(
  "occurredAt = Sale.soldAt",
  /occurredAt: plan\.kalem\.sale\.soldAt,/.test(bagKaynak),
);
kontrol(
  "maliyet PARTİDEN kopyalanıyor",
  /unitCostAmount: pay\.birimMaliyet as never,/.test(bagKaynak),
);
/**
 * ⚠ KÂR TAZELENMESİ AYRI ADIM AMA AYNI KOŞUMDA. Tazelenmezse
 * `profitStatus` null kalır ve şerh o satışları HÂLÂ "bağ bekliyor" diye
 * sayar — iş yapılmış, ekran değişmemiş olur.
 */
kontrol(
  "kâr aynı koşumda tazeleniyor",
  /await satisKarTazele\(saleId\)/.test(bagKaynak),
);
/** ⚠ ATLANAN SESSİZ GEÇMEZ — sebebi ve büyüklüğü ekranda. */
kontrol(
  "atlananların sebebi ekranda yazıyor",
  /EKSİK ALIM DEFTERİ/.test(bagKaynak),
);
/**
 * ⚠ GERİ ALMA TERS KAYIT — işaretleme değil; ve küme TÜRETİLİYOR,
 * yeni alan açılmadı.
 */
kontrol(
  "geri alma TERS KAYIT yazıyor",
  /type: "ADJUSTMENT",[\s\S]{0,200}quantityDelta: -h\.quantityDelta,/.test(bagKaynak),
);
kontrol(
  "geri alınacak küme importBatch'ten TÜRETİLİYOR",
  /saleItem: \{ sale: \{ importBatch: GERI \} \}/.test(bagKaynak),
);
kontrol(
  "geri alma özgün hareketi SİLMİYOR",
  !/stockMovement\.delete/.test(bagKaynak),
);
kontrol("bağ ve geri alma iz bırakıyor", /auditLog\.create/.test(bagKaynak));


console.log(`\n${hata === 0 ? "TÜM KONTROLLER GEÇTİ" : "BAŞARISIZ"} (${gecen}/${gecen + hata})\n`);
process.exit(hata === 0 ? 0 : 1);
