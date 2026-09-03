import { readFileSync } from "node:fs";

import { birimFiyatCoz, iptalAniCoz } from "./canli-ty-ice-aktar";
import { iceAktarmaTarihi } from "../src/lib/ice-aktarma-tarih-kapisi";

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
console.log("① birimFiyatCoz — `price` BİRİM fiyattır (hakedişle kanıtlandı)");
/**
 * ⛔ BU BLOK 29.08.2026'DA TERSİNE ÇEVRİLDİ VE SEBEBİ YAZILI.
 * Önce şunu sabitliyordu: _"adet 2 → satır toplamı ikiye bölünür"_.
 *
 * ⚠ O ÖLÇÜT BİR KURALI DEĞİL, KODUN O ANDAKİ DAVRANIŞINI sabitliyordu —
 * ve davranış hatanın kendisiydi. Anayasa: _"bekçi ölçütü kuralı
 * sabitler, davranışı değil; gerekçe yazılamayan ölçüt yazılmamalıdır."_
 * Gerekçe olarak _"price === amount ölçüldü"_ yazılıydı, ama o eşitlik
 * iki okumayla da uyumluydu; ayırt edici kanıt hiç aranmamıştı.
 *
 * ⭐ AYIRT EDİCİ KANIT — KANALIN KENDİ ÖDEME KAYDI:
 * `11373352181` · adet 2 · `price` 2074 · komisyon %8,5 →
 * hakedişte İKİ satır, her biri 1897,71 = 2074 − 176,29.
 * Yani TY birim başına ödemiş; birim fiyat 2074, sipariş toplamı 4148.
 *
 * ⚠ VE ÖRNEK VERİ AYRIMIN İKİ YAKASINI GÖSTERİR: adet 1 seçilseydi
 * bölünse de bölünmese de aynı sonuç çıkardı ve mutasyon YEŞİL kalırdı.
 * Adet 2 ve 3, bölmeyi GERİ GETİREN her mutasyonu kırmızıya çevirir.
 */
kontrol("adet 2 → BÖLÜNMEZ, birim aynen kalır", birimFiyatCoz(1623, 2) === 1623);
kontrol("adet 3 → BÖLÜNMEZ", birimFiyatCoz(2400, 3) === 2400);
kontrol("adet 1 → değişmez", birimFiyatCoz(1885, 1) === 1885);
kontrol("gerçek canlı satır 2074 (adet 2)", birimFiyatCoz(2074, 2) === 2074);
/** ⭐ ADETLE ÇARPMA DA YOK — motor zaten `× quantity` yapıyor. */
kontrol("adet 2 → ÇARPILMAZ da (çift sayım olurdu)", birimFiyatCoz(1623, 2) !== 3246);
kontrol("adet 0 → null (kalem yazılmaz)", birimFiyatCoz(1000, 0) === null);
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
    /* ⭐ ÖLÇÜT GÜNCELLENDİ 29.08.2026 — KOD DEĞİL, ÖLÇÜT ESKİDİ.
       Şerh artık ekranın süzgecini alıyor (`varyantSuzgeci={suzgec}`);
       desen özelliksiz self-closing etikete kilitliydi ve kırmızı yandı.
       Ölçülen davranış "şerh ÇİZİLİYOR" — özellik alıp almadığı ayrı bir
       ölçütün (`uyari:dogrula`) işi. */
    /<IceAktarmaSerhi(\s[^>]*)?\/>/.test(e) && /components\/ice-aktarma-serhi/.test(e),
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
const KACIS_NOKTA = "\\.";
const BS_U = "\\";
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
/**
 * ⚠ PENCERE ÖLÇÜLDÜ: gövde üçüncü sebeple büyüyünce 2600 karakter
 * yetmedi ve DÖRT kontrol birden kırmızı yandı — kod doğruydu, pencere
 * kısaydı. Dar pencere sessiz bir kör nokta üretir.
 */
/**
 * ⚠ PENCERE İKİNCİ KEZ ÖLÇÜLDÜ: gövde varyant haritasıyla yine büyüdü
 * ve DÖRT kontrol kırmızı yandı — kod doğruydu. Dar pencere sessiz bir
 * kör nokta üretir; genişletmek onu kapatır.
 */
const marjGovde = blok(serhLib, "export async function marjSerhi(", 6500);
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
/**
 * ⚠ ÖLÇÜT İKİDEN ÜÇE ÇIKTI — ve bu bir GÜÇLENDİRME. Üçüncü sebep
 * (dönem dışı) eklendi; iki sebebe bakan eski ölçüt, üçüncüsü tek
 * başına kaldığında şerhi sönmüş sanırdı.
 */
kontrol(
  "YANLIŞ YANMA yok — ÜÇ sebep de 0 ise çizilmiyor",
  /if \(s\.bekleyen === 0 && s\.alimYok === 0 && s\.donemDisi === 0\) return null;/.test(marjKaynak),
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
  "ÜÇ kova AYRI sayılıyor",
  /donemDisilar\.add\(k\.sale\.id\)/.test(marjGovde) &&
    /alimsizlar\.add\(k\.sale\.id\)/.test(marjGovde) &&
    /else bekleyenler\.add\(k\.sale\.id\)/.test(marjGovde),
);
const marjMetin = blok(marjKaynak, "return (", 2400);
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
  /**
   * ⚠ PENCERE 30.08.2026'DA ÖLÇÜLEREK BÜYÜTÜLDÜ (380 -> 900).
   *
   * K100 (UPC-A <-> EAN-13) iki gövdeye de `kodEsdegerleri(...)` çağrısı ve
   * gerekçesini ekledi; 380 karakterlik pencere `channelSkus` ile
   * `isActive: true` satırlarına ARTIK ULAŞMIYORDU ve beş ölçüt kırmızı
   * yandı. **Kod doğruydu — pencere kısaydı.**
   *
   * Ölçüldü: gereken en uzun mesafe `kodKosuluToplu` içinde 639 karakter.
   * Pay bırakılarak 900 seçildi; gövdeler yine büyürse bu satır YENİDEN
   * ölçülür — tahmin edilmez.
   * _(Anayasa: "kapsam daraltılır — VE pencere ÖLÇÜLÜR"; aynı tuzak bugün
   * `stok-siralama:dogrula`da da yaşandı.)_
   */
  const g = blok(kuralKaynak, fn, 900);
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


console.log("\n⑨ ALIŞ İÇE AKTARMA — kuru koşum ile yazım AYNI gövdeden mi");

const alisKaynak = oku("scripts/canli-alis-ice-aktar.ts");
const alisKuru = oku("scripts/canli-alis-kuru-kosum.ts");

/**
 * ⚠ KURU KOŞUM İLE YAZIM AYNI SINIFLANDIRMAYI YAPMALI. İki ayrı gövde
 * yarın ayrışır ve "kuru koşumda 1615 çıkmıştı, yazım 1608 yazdı" gibi
 * açıklanamayan bir fark doğar. Ölçüt: her iki dosya da AYNI kovaları
 * ve AYNI ölçütleri taşıyor mu.
 */
const KOVALAR = [
  "adetSifir", "iadeli", "tarihYok", "copBarkod",
  "eslesmeyenBarkod", "belirsizBarkod", "barkodsuz", "zatenVar",
];
/**
 * ⚠ ÖLÇÜT KOVANIN ADI DEĞİL, KOVAYA ATMA ÇAĞRISI — ve bu mutasyonla
 * bulundu. Kova adı her dosyada BİRDEN ÇOK yerde geçiyor (tip birleşimi ·
 * açıklama tablosu · çağrı); birini değiştiren mutasyon ötekini bulup
 * YEŞİL kalıyordu. İşaret artık ATMA çağrısına bağlı.
 */
for (const k of KOVALAR) {
  kontrol(
    `kova "${k}" — yazımda ATMA çağrısı var`,
    new RegExp('say\\("' + k + '"\\)').test(alisKaynak),
  );
  kontrol(
    `kova "${k}" — kuru koşumda ATMA çağrısı var`,
    new RegExp('koy\\("' + k + '", s\\)').test(alisKuru),
  );
}
kontrol(
  "kimlik araması ORTAK kod kuralından (yazım)",
  /where: \{ OR: kodKosuluToplu\(tekilBarkod\) \}/.test(alisKaynak),
);
kontrol(
  "kimlik araması ORTAK kod kuralından (kuru koşum)",
  /where: \{ OR: kodKosuluToplu\(tekilBarkod\) \}/.test(alisKuru),
);
kontrol(
  "tedarikçi eşleştirmesi ORTAK Türkçe anahtarından",
  /tedarikciAnahtari\(/.test(alisKaynak) && /tedarikciAnahtari\(/.test(alisKuru),
);

/**
 * ⚠ TEDARİKÇİ OTOMATİK AÇILMAZ — Halil'in açık şartı ve bu bir
 * "DOKUNMUYOR" iddiası: eşleşmeyen mağaza adı için `supplier.create`
 * çağrısı BULUNMAMALI.
 */
kontrol(
  "tedarikçi OTOMATİK AÇILMIYOR",
  !new RegExp("\bsupplier\s*[.:]", "i").test(yorumsuz(alisKaynak)) ||
    !/supplier\.create|supplier: \{ create/.test(yorumsuz(alisKaynak)),
);
kontrol(
  "eşleşmeyen mağaza AYRI kovaya düşüyor",
  /say\(s\.magaza === "" \? "tedarikciBos" : "tedarikciYeniAday"\)/.test(alisKaynak),
);

/** ⚠ AD EŞLEŞMESİ KAYITTA İŞARETLİ — raporda değil. */
kontrol(
  "ürün adıyla eşleşen kalem KAYITTA işaretleniyor",
  /kalemler\.some\(\(c\) => c\.guven === "ad"\)/.test(alisKaynak) &&
    /ÜRÜN ADIYLA eşleştirildi/.test(alisKaynak),
);

/** ⚠ occurredAt = Satın Alma Tarihi, İstanbul günü. */
/**
 * ⚠ DESEN SAYILDI VE İLK HÂLİ YANLIŞ YERE DEMİRLEDİ.
 * `type: "PURCHASE_IN"` bu dosyada İKİ kez geçiyor: önce/sonra SAYIM
 * sorgusunda ve yazma çağrısında. `blok()` ilkini bulunca üç kontrol
 * birden kırmızı yandı — kod doğruydu, işaret yanlış konumdaydı.
 * İşaret artık yazma DÖNGÜSÜNÜN başına bağlı — üç alan da o pencerede.
 */
/**
 * ⚠ PENCERE ÖLÇÜLDÜ, TAHMİN EDİLMEDİ — 700 → 2200 (29.08.2026).
 * Döngüye SAYIM KAPISI eklendi (gerekçe yorumu + karar + iki dal) ve
 * `stockMovement.create` alanları 700 karakterin dışına taştı; üç kontrol
 * birden kırmızı yandı. Ölçülen gerçek mesafe **1497** karakter; pencere
 * büyüme payıyla 2200'e çekildi.
 * _(Anayasa: "pencere ÖLÇÜLÜR — gövde büyüyünce dar pencere sessizce kör
 * kalır". Burada kör kalmadı, kırmızı yandı: doğru yön.)_
 */
const hareketBloku = blok(alisKaynak, "for (const kalem of alim.items) {", 2200);
kontrol("PURCHASE_IN yazma bloğu bulundu", hareketBloku.length > 0);
kontrol(
  "occurredAt Satın Alma Tarihinden, İstanbul gününe indirgenmiş",
  /occurredAt: isGunuUtc\(ilk\.alis!\)/.test(hareketBloku),
);
kontrol(
  "giriş POZİTİF (çıkış değil)",
  /quantityDelta: kalem\.quantity,/.test(hareketBloku),
);
kontrol(
  "maliyet harekete kopyalanıyor (FIFO partisi)",
  /unitCostAmount: kalem\.unitCostAmount/.test(hareketBloku),
);

/** ⚠ GERİ ALMA TERS KAYIT, SİLME DEĞİL — ve tüketilmiş parti ELLENMEZ. */
kontrol(
  "geri alma TERS KAYIT yazıyor",
  /type: "ADJUSTMENT",[\s\S]{0,260}quantityDelta: -h\.quantityDelta,/.test(alisKaynak),
);
kontrol(
  "geri alma hiçbir şey SİLMİYOR",
  !/purchase\.delete|stockMovement\.delete|purchaseItem\.delete/.test(yorumsuz(alisKaynak)),
);
kontrol(
  "TÜKETİLMİŞ parti geri alınmıyor — ayrı sayılıyor",
  /const temiz = hareketler\.filter\(\(h\) => !tuketilen\.has\(h\.id\)\)/.test(alisKaynak),
);
kontrol(
  "geri alınacak küme importBatch'ten TÜRETİLİYOR",
  /where: \{ importBatch: GERI \}/.test(alisKaynak),
);

/** ⚠ YAZIM `--yaz` BAYRAĞINA KİLİTLİ. */
/**
 * ⚠ İKİ AYRI YAZMA YOLU, İKİ AYRI KAPI — ve sayı ölçülüyor.
 * Dosyada `if (!YAZ) {` İKİ kez geçiyor: geri alma dalında ve ana
 * akışta. Yalnız "geçiyor mu" diye sorulunca birini kaldıran mutasyon
 * ötekini buluyor ve YEŞİL kalıyordu. Ölçüt SAYIYA bağlandı.
 */
const yazKapilari = (alisKaynak.match(/if \(!YAZ\) \{/g) ?? []).length;
kontrol(
  "yazım --yaz bayrağına kilitli — HER İKİ yazma yolunda kapı var",
  /const YAZ = process\.argv\.includes\("--yaz"\)/.test(alisKaynak) &&
    yazKapilari === 2,
);
kontrol(
  "her alım importBatch VE importKaynak taşıyor",
  /importBatch: parti,/.test(alisKaynak) && /importKaynak: "alis-excel",/.test(alisKaynak),
);
kontrol("toplu yazım AuditLog bırakıyor", /auditLog\.create/.test(alisKaynak));

/** ⚠ TUTMAYAN SAYIM YORUMLANMAZ — Halil'in şartı, beyanı da sınanır. */
kontrol(
  "tutmayan sayım YORUMLANMADAN yazılıyor",
  /TUTMADI/.test(alisKaynak) && /YORUMLANMADI/.test(alisKaynak),
);

/** ⚠ KURU KOŞUM YAZMAZ — onay kapısı olduğunu iddia ediyor, sınanır. */
kontrol(
  "kuru koşum HİÇBİR yazma çağrısı taşımıyor",
  !new RegExp("[A-Za-z0-9_$]+" + KACIS_NOKTA + "[A-Za-z0-9_$]+" + KACIS_NOKTA + "(create|update|upsert|delete)" + KACIS_AC, "i").test(yorumsuz(alisKuru)),
);
kontrol(
  "kuru koşum dosya KİMLİĞİNİ basıyor (ad + md5)",
  /createHash\("md5"\)/.test(alisKuru) && /DOSYA KİMLİĞİ/.test(alisKuru),
);


console.log("\n⑩ DEFTER DERİNLİĞİ ŞERHİ — canlı sayı, türetilmiş ölçüt");

const derinlikKaynak = oku("src/components/defter-derinligi-serhi.tsx");
const derinlikGovde = blok(serhLib, "export async function defterDerinligi(", 2600);

kontrol("defterDerinligi gövdesi bulundu", derinlikGovde.length > 0);
/**
 * ⚠ SAYILAR CANLI — SABİT METİN DEĞİL. Şerhin gövdesinde gömülü rakam
 * bulunursa (1955 · 556 · 748 gibi) o sayı yarın yanlış olur ve
 * kimsenin güncellemesi gerektiğini hatırlaması beklenemez.
 */
kontrol(
  "iki defterin sayısı SORGUDAN geliyor",
  /purchase\.aggregate/.test(derinlikGovde) && /sale\.aggregate/.test(derinlikGovde),
);
kontrol(
  "en eski tarihler SORGUDAN geliyor",
  /_min: \{ purchasedAt: true \}/.test(derinlikGovde) &&
    /_min: \{ soldAt: true \}/.test(derinlikGovde),
);
kontrol(
  "şerhte GÖMÜLÜ SAYI yok",
  !/1955|556|748|8[.,]5M|3595/.test(yorumsuz(derinlikKaynak)),
);
/**
 * ⚠ ÖLÇÜT GÜN FARKINA BAĞLI DEĞİL — bu kasıtlı ve sınanıyor.
 * Gün farkına bağlansaydı satış aktarımından sonra da ~18 günlük bir
 * fark kalır ve şerh SÖNMEZDİ. Ölçüt, farkın ÜRETTİĞİ çarpıklık:
 * kapsanmayan pencerede HÂLÂ AÇIK parti adedi.
 */
kontrol(
  "sönme ölçütü AÇIK PARTİ adedine bağlı (gün farkına DEĞİL)",
  /if \(d\.kapsamsizAdet === 0\) return null;/.test(derinlikKaynak),
);
kontrol(
  "gün farkı yalnız GÖSTERİM — ölçüt değil",
  /farkGun: Math\.round/.test(derinlikGovde) &&
    !/if \(d\.farkGun/.test(derinlikKaynak),
);
kontrol(
  "açık parti TÜKETİM düşülerek hesaplanıyor",
  /sourceMovementId/.test(derinlikGovde) && /const kalan = g\.quantityDelta \+/.test(derinlikGovde),
);
/** ⚠ BİR DEFTER BOŞSA HÜKÜM VERİLMEZ. */
kontrol(
  "defterlerden biri boşsa kıyas kurulmuyor",
  /if \(alimEnEski === null \|\| satisEnEski === null\) return bos;/.test(derinlikGovde),
);
kontrol(
  "alım defteri daha SIĞSA şerh çıkmıyor",
  /if \(alimEnEski >= satisEnEski\) return bos;/.test(derinlikGovde),
);
/** ⚠ İKİ DEFTER YAN YANA BASILIYOR — asimetri görünsün. */
const derinlikMetin = blok(derinlikKaynak, "return (", 1500);
kontrol(
  "iki defterin sayısı ve tarihi YAN YANA basılıyor",
  /alim: d\.alimSayisi/.test(derinlikMetin) &&
    /satis: d\.satisSayisi/.test(derinlikMetin) &&
    /alimTarih:/.test(derinlikMetin) &&
    /satisTarih:/.test(derinlikMetin),
);
kontrol(
  "çarpıklık ADEDİ ekrana basılıyor",
  /t\("defterDerinligiSonuc",\s*\{\s*adet: d\.kapsamsizAdet\s*\}\)/.test(derinlikMetin),
);
/** ⚠ İKİ ŞERH DE ÇİZİLİYOR — biri ötekinin yerine geçmiyor. */
for (const [ad, yol] of [
  ["envanter değeri", "src/app/envanter-degeri/page.tsx"],
  ["stok", "src/app/stok/page.tsx"],
] as const) {
  const e = oku(yol);
  kontrol(
    `${ad} — İKİ şerh de çiziliyor (biri ötekinin yerine geçmiyor)`,
    /* ⚠ İÇE AKTARMA ŞERHİ ÖZELLİK ALABİLİR (süzgeç), DEFTER DERİNLİĞİ
       ALMAZ — ve bu ayrım BİLİNÇLİ: ikincisi iki DEFTERİN başlangıcını
       karşılaştırıyor, tek ürün için anlamı yok. Desen bu farkı KORUYOR. */
    /<IceAktarmaSerhi(\s[^>]*)?\/>/.test(e) && /<DefterDerinligiSerhi\s*\/>/.test(e),
  );
}


console.log("\n⑪ TARİH KAPISI — alt sınır SABİT, üst sınır KAYAR");

const kapiKaynak = oku("src/lib/ice-aktarma-tarih-kapisi.ts");

/**
 * ⚠ SAF KURAL — ÜST SINIR KAYAR. Örnek veri AYRIMIN İKİ YAKASINI
 * gösteriyor: aynı tarih, iki farklı "şimdi" ile iki farklı sonuç.
 * Tek "şimdi" ile sınansaydı sabit sınıra çeviren mutasyon YEŞİL kalırdı.
 */
const SIMDI_2026 = new Date("2026-08-26T00:00:00.000Z");
const SIMDI_2030 = new Date("2030-01-01T00:00:00.000Z");
kontrol(
  "2029 tarihi BUGÜN 2026 iken GELECEKTE",
  iceAktarmaTarihi("2029-03-30", SIMDI_2026).tur === "GELECEKTE",
);
kontrol(
  "AYNI tarih BUGÜN 2030 iken GEÇERLİ — sınır KAYIYOR",
  iceAktarmaTarihi("2029-03-30", SIMDI_2030).tur === "GECERLI",
);
kontrol(
  "alt sınırdan eski COK_ESKI (0202 vakası)",
  iceAktarmaTarihi("0202-11-02", SIMDI_2026).tur === "COK_ESKI",
);
kontrol(
  "alt sınırın kendisi GEÇERLİ",
  iceAktarmaTarihi("2024-01-01T00:00:00.000Z", SIMDI_2026).tur === "GECERLI",
);
kontrol(
  "alt sınırdan bir gün öncesi COK_ESKI",
  iceAktarmaTarihi("2023-12-31T00:00:00.000Z", SIMDI_2026).tur === "COK_ESKI",
);
/** TR METIN TARIHI (eklendi 03.09.2026 — Satislar_V2'nin 8 metin-tarih satiri). */
{
  const t = iceAktarmaTarihi("13.08.2025", SIMDI_2026);
  kontrol(
    "TR metin tarihi GECERLI ve DOGRU GUNE cozulur",
    t.tur === "GECERLI" && t.tarih.toISOString().slice(0, 10) === "2025-08-13",
  );
}
kontrol(
  "ay tasan TR metin OKUNAMADI (32.13.2025)",
  iceAktarmaTarihi("32.13.2025", SIMDI_2026).tur === "OKUNAMADI",
);
kontrol(
  "gun tasan TR metin OKUNAMADI (31.02.2026 — 3 Mart'a KAYMAMALI)",
  iceAktarmaTarihi("31.02.2026", SIMDI_2026).tur === "OKUNAMADI",
);
kontrol(
  "TR metin yil kapisindan MUAF DEGIL (11.02.0202 → COK_ESKI)",
  iceAktarmaTarihi("11.02.0202", SIMDI_2026).tur === "COK_ESKI",
);
kontrol("okunamayan OKUNAMADI", iceAktarmaTarihi("abc", SIMDI_2026).tur === "OKUNAMADI");
kontrol("boş OKUNAMADI", iceAktarmaTarihi(null, SIMDI_2026).tur === "OKUNAMADI");
/**
 * ⚠ HER DAL AYRI SINANIR — geçersiz `Date` NESNESİ `instanceof Date`
 * doğrudur ve ilk daldan sınanmadan geçerse 8 alım düşer (canlı vaka).
 */
kontrol(
  "geçersiz Date NESNESİ OKUNAMADI",
  iceAktarmaTarihi(new Date("gecersiz"), SIMDI_2026).tur === "OKUNAMADI",
);
/**
 * ⚠ SERİ NUMARASI DEĞERİ ÖLÇÜLDÜ, TAHMİN EDİLMEDİ. İlk yazımda 45000
 * "geçerli bir tarih" sanıldı ve kontrol KIRMIZI yandı — 45000 aslında
 * `2023-03-15`, yani ALT SINIRIN ALTINDA. Kod doğruydu, testin verisi
 * yanlıştı. Değerler hesaplanarak seçildi:
 *     45000 → 2023-03-15    45800 → 2025-05-23    46000 → 2025-12-09
 */
kontrol(
  "Excel seri numarası dalı çalışıyor (45800 = 2025-05-23)",
  iceAktarmaTarihi(45800, SIMDI_2026).tur === "GECERLI",
);
kontrol(
  "Excel seri numarası ALT SINIRIN altındaysa elenir (45000 = 2023)",
  iceAktarmaTarihi(45000, SIMDI_2026).tur === "COK_ESKI",
);
kontrol(
  "Excel sıfır serisi de elenir",
  iceAktarmaTarihi(1000, SIMDI_2026).tur === "COK_ESKI",
);

/**
 * ⛔ ÜST SINIR SABİT TARİHE/YILA BAĞLANAMAZ — "2027 Ocak'ta sessizce
 * kırılır" tuzağı. Kaynakta sabit yıl karşılaştırması ARANMIYOR olmalı.
 */
kontrol(
  "üst sınır SABİT YILA bağlı değil",
  !/getUTCFullYear\(\)\s*[<>]/.test(yorumsuz(kapiKaynak)) &&
    !/20\d\d-12-31|new Date\("20[3-9]\d/.test(yorumsuz(kapiKaynak)),
);
kontrol(
  "üst sınır çağırandan gelen `simdi`",
  /aday\.getTime\(\) > simdi\.getTime\(\)/.test(kapiKaynak),
);
kontrol(
  "fonksiyon KENDİ saatini okumuyor (test edilebilir)",
  !/new Date\(\)/.test(yorumsuz(kapiKaynak)),
);

/** ⚠ HER İKİ AKTARIM DA ORTAK KAPIDAN GEÇİYOR — yerel kopya yok. */
for (const [ad, yol] of [
  ["alış yazım", "scripts/canli-alis-ice-aktar.ts"],
  ["alış kuru koşum", "scripts/canli-alis-kuru-kosum.ts"],
  ["satış kuru koşum", "scripts/canli-satis-kuru-kosum.ts"],
] as const) {
  const g = yorumsuz(oku(yol));
  kontrol(`${ad} — ORTAK kapıyı çağırıyor`, /iceAktarmaTarihi\(/.test(g));
  kontrol(
    `${ad} — kendi makul-yıl kapısını TANIMLAMIYOR`,
    !/yil < 2000 \|\| yil > 2100/.test(g),
  );
}
/** ⚠ İKİ SINIR AYRI KOVADA — tek "tarihDışı" rakamı iki sorunu gizlerdi. */
const satisKuru = oku("scripts/canli-satis-kuru-kosum.ts");
kontrol(
  "alt ve üst sınır AYRI kovalarda",
  /koy\("tarihCokEski", s\)/.test(satisKuru) && /koy\("gelecekTarihli", s\)/.test(satisKuru),
);


console.log("\n⑫ SATIŞ İÇE AKTARMA — kovalar, hesap alanları, kanal kapısı");

const satisAktar = oku("scripts/canli-satis-ice-aktar.ts");

/**
 * ⚠ KURU KOŞUM İLE YAZIM AYNI KOVALARI TAŞIMALI — ölçüt kova ADI değil
 * ATMA çağrısı, çünkü ad her dosyada birden çok yerde geçiyor.
 */
const SATIS_KOVALARI = [
  "turFarkli", "adetSifir", "tarihOkunamayan", "tarihCokEski",
  "gelecekTarihli", "numarasiz", "zatenVar", "copSku",
  "eslesmeyenListing", "belirsizSku",
];
for (const k of SATIS_KOVALARI) {
  kontrol(
    `satış kovası "${k}" — yazımda ATMA çağrısı var`,
    new RegExp('say\\("' + k + '"\\)').test(satisAktar),
  );
}
/**
 * ⚠ ÖLÇÜT "ÇAĞRI VAR MI" DEĞİL, "SATIR GERÇEKTEN DÜŞÜYOR MU" — ve bu
 * MUTASYONLA bulundu. `say("kanalCeliskisi")` yerinde duruyor ama
 * ardındaki `continue;` silinirse satır hem kovaya SAYILIR hem YİNE
 * YAZILIR: iki yanlış birden. Kova adını aramak bunu geçiriyordu.
 */
for (const k of ["kanalCozulemedi", "kanalCeliskisi"]) {
  const dusurme = blok(satisAktar, 'say("' + k + '")', 40);
  kontrol(
    `satış kovası "${k}" — ATMA çağrısı VE düşürme birlikte`,
    dusurme.length > 0 && /continue;/.test(dusurme),
  );
}

/**
 * ⛔ HESAP SÜTUNLARI YAZILMAZ — motor kendi hesaplar. Dosyanınkini
 * yazmak iki farklı gerçek üretirdi. "Dokunmuyor" iddiası, ihlal eden
 * mutasyonla sınanır.
 */
const satisYazma = blok(satisAktar, "const satis = await prisma.sale.create({", 1400);
kontrol("satış yazma bloğu bulundu", satisYazma.length > 0);
for (const alan of ["net1Amount", "net2Amount", "profitStatus", "calculatedAt", "commissionRate", "vatRate"]) {
  kontrol(`hesap alanı \`${alan}\` YAZILMIYOR`, !new RegExp(alan).test(satisYazma));
}
kontrol(
  "her satış importBatch VE importKaynak taşıyor",
  /importBatch: parti,/.test(satisYazma) && /importKaynak: "satis-excel",/.test(satisYazma),
);
kontrol(
  "soldAt İstanbul gününe indirgeniyor",
  /soldAt: isGunuUtc\(kalemler\[0\]\.tarih\)/.test(satisYazma),
);

/**
 * ⚠ PARTİ YOKSA HAREKET YAZILMAZ — negatif stok üretilmez. Satış
 * tarafındaki kararın aynısı ve ihlali sessizce hayalet adet üretir.
 */
kontrol(
  "parti yetmezse SALE_OUT yazılmıyor",
  /if \(!sonuc\.yeterliMi\) \{ hareketAtlanan\+\+; continue; \}/.test(satisAktar),
);
/**
 * ⭐ ÖLÇÜT GÜNCELLENDİ 29.08.2026 — KOD DEĞİL, ÖLÇÜT ESKİDİ.
 *
 * Eskisi çağrının BİREBİR metnine bağlıydı
 * (`kalanPartiler.set(kalem.variantId, sonuc.kalanPartiler)` ·
 * `fifoDagit(mevcut, kalem.quantity)`). Betiğe FIFO SINIRI eklendi:
 * partiler artık dağıtımdan önce `partileriSinirla` ile ikiye ayrılıyor
 * (satışın gün sonundan önce açılanlar / sonrakiler) ve dağıtımdan sonra
 * `partileriBirlestir` ile geri konuyor.
 *
 * Davranış BOZULMADI, güçlendi: tüketilen parti hâlâ sonraki kaleme
 * taşınıyor — üstelik artık dışarıda bırakılanlar da taşınıyor, yoksa daha
 * yeni bir satış onları bulamazdı.
 * _(Anayasa: "bekçinin kırmızısı her zaman 'kod yanlış' demez" — ve
 * eskiyen ölçüt güncellenirken NİYE eskidiği yazılır.)_
 */
kontrol(
  "tüketilen parti SONRAKİ kaleme taşınıyor",
  /kalanPartiler\.set\(\s*kalem\.variantId,\s*\n?\s*partileriBirlestir\(sonuc\.kalanPartiler, disarida\)/
    .test(satisAktar),
);
kontrol("ORTAK fifoDagit kullanılıyor", /fifoDagit\(uygun, kalem\.quantity\)/.test(satisAktar));
/** ⭐ YENİ DAVRANIŞ DONDURULUYOR — sınır satışın GÜN SONU'ndan kuruluyor. */
kontrol(
  "FIFO sınırı satışın GÜN SONU'ndan kuruluyor",
  /const sinir = gunSonu\(isGunuUtc\(kalemler\[0\]\.tarih\)\)/.test(satisAktar),
);
kontrol(
  "sınır DAĞITIMDAN ÖNCE uygulanıyor (ileri parti aday değil)",
  /partileriSinirla\(mevcut, sinir\)/.test(satisAktar),
);

/**
 * ⚠ KANAL BELİRSİZSE YAZILMAZ. Amazon'da üç hesap var ve üçü de sıfır
 * satışlı — hangisine yazılacağı VERİDEN çıkmıyor.
 * ⚠ VE KANAL ÇELİŞKİSİ YAZILMAZ: yanlış kanal KESİNTİ KURALLARINI
 * değiştirir (HB komisyona %20 KDV + ₺12,60; TY ₺13,19), NET sessizce
 * yanlış çıkar.
 */
/**
 * ⛔ ÖLÇÜT ESKİDİ VE GÜNCELLENDİ 28.08.2026 — SUSTURULMADI.
 *
 * ESKİSİ: `adaylar.filter((h) => h._count.sales > 0)` — "satışı OLAN hesap".
 * O ölçüt YENİ AÇILAN bir kanalı **yapısal olarak** dışlıyordu: kanal
 * doğduğu gün sıfır satışlıdır, dolayısıyla sonsuza kadar "belirsiz" kalır
 * ve kendi satırları hiç yazılamaz. Yani ön şartı asla sağlanamazdı.
 *
 * YENİSİ: `satisIcin` — bir ROL BEYANI, geçmişin yan etkisi değil.
 * ⚠ Ölçüldü, davranış DEĞİŞMEDİ: TY · HB · N11'in her birinde `satisIcin`
 * taşıyan tek hesap var (AXCALI) ve o zaten satışı olan hesabın kendisi.
 * Amazon'un üç hesabı da `satisIcin=false` — eskiden de belirsizdi, şimdi de.
 */
kontrol(
  "kanal hesabı SATIŞ ROLÜ BEYAN EDİLMİŞ hesaptan çözülüyor",
  /adaylar\.filter\(\(h\) => h\.satisIcin\)/.test(satisAktar) &&
    /satisIcin: true,/.test(satisAktar),
);
kontrol(
  "birden çok aday varsa BELİRSİZ — yazılmıyor",
  /if \(satisRolu\.length === 1\) kanalHesap\.set/.test(satisAktar) &&
    /else belirsizKanal\.add/.test(satisAktar),
);

/**
 * ⛔ ÖLÇÜT TERSİNE ÇEVRİLDİ 28.08.2026 — ESKİ HÂLİ VE GEREKÇESİ:
 *
 *     kontrol("DEPO kanal eşlemesinde YOK", !/DEPO:/.test(...))
 *     gerekçe: "DEPO bir kanal değil, depo hareketi; satış olarak yazmak
 *               ciroyu şişirirdi."
 *
 * Kullanıcı düzeltti: **DEPO elden yapılan satışların yazıldığı yerdir.**
 * Ölçüldü — 12 satırın 11'inde komisyon ve kargo SIFIR. Eski ölçüt doğru
 * bir satışı dışarıda tutuyordu.
 *
 * ⚠ AMA KANAL EŞLEMESİNE GİRMEK, YAZILABİLİR OLMAK DEĞİLDİR. İki sebeple
 * bugün yazılamaz: `Sipariş Numarası` kolonu DEPO satırlarında BARKOD
 * taşıyor (`Sale.code`a barkod girerdi — yanlış + `@unique` çakışması), ve
 * KDV/stopajın işleyip işlemediği cevaplanmadı. Yeni ölçüt tam olarak bu
 * kapıyı koruyor: eşleme VAR ama kapı KAPALI.
 */
kontrol(
  "DEPO kanal eşlemesinde VAR",
  /DEPO: "Elden Satış"/.test(yorumsuz(satisAktar)),
);
/**
 * ═══ KOMİSYON ORANI — GİRDİ, SONUÇ DEĞİL (28.08.2026) ═══════════════════
 *
 * ⛔ İçe aktarma `commissionRate`i HİÇ yazmıyordu ve gerekçesi şuydu:
 * "hesap sütunları yazılmaz, motor kendi hesaplar". Gerekçe SONUÇLAR için
 * doğru (kâr · ROI · KDV · stopaj) ama ORAN bir GİRDİDİR — kanalın beyanı,
 * motor onu hesaplayamaz. Yazılmayınca komisyon HİÇ düşülmedi: 5333 kalem
 * `RULE_MISSING` kaldı ve o kümenin marjı %21,32 görünürken komisyonu
 * düşülmüş kümenin marjı %11,10'du. Ekrandaki rakam olduğundan YÜKSEKTİ.
 *
 * ⛔ İKİ ÖLÇÜT, İKİ AYRI TEHLİKE:
 *  ① `TUTAR`DAN TÜREMEK — o kolon 3705 satırda KDV DAHİL (`×1,20`). Ondan
 *    oran türetilseydi motor üstüne bir kez daha %20 eklerdi
 *    (`HEPSIBURADA · KOMISYON_KDV`), yani KDV İKİ KEZ uygulanırdı.
 *  ② ORANSIZ KALEM YAZMAK — sessizce `null` yazmak açığı her koşumda
 *    yeniden doğurur. Kalem görünür bir kovaya düşmeli.
 */
kontrol(
  "komisyon oranı `KOMİSYON ORANI` kolonundan okunuyor",
  /komisyonOrani: K\("KOMİSYON ORANI"\)/.test(satisAktar),
);
kontrol(
  "oran `KOMİSYON TUTARI`ndan TÜRETİLMİYOR",
  !/KOMİSYON TUTARI/.test(yorumsuz(satisAktar)),
);
kontrol(
  "yazılan kalem commissionRate taşıyor",
  /commissionRate: c\.s\.komisyonOrani,/.test(satisAktar),
);
kontrol(
  "oransız kalem YAZILMIYOR — görünür kovaya düşüyor",
  /if \(s\.komisyonOrani === null\) \{ say\("oranYok"\); continue; \}/.test(yorumsuz(satisAktar)),
);
/**
 * ⚠ KOMİSYONSUZ KANALDA `0` — `null` DEĞİL. `null` "bilinmiyor" der ve
 * `RULE_MISSING` üretir; `0` "komisyon yok" der ve NET hesaplanır.
 */
kontrol(
  "komisyonsuz kanalda oran 0 yazılıyor",
  /KOMISYONSUZ_KANALLAR\.has\(kanal\.toUpperCase\(\)\)\) return 0;/.test(yorumsuz(satisAktar)),
);
/** ⚠ Makul aralık iş kuralıdır — dış ayrıştırıcının kabulü yeterli değil. */
kontrol(
  "oran makul aralıkta değilse null (0 < oran ≤ 100)",
  /n <= 0 \|\| n > 100\) return null;/.test(yorumsuz(satisAktar)),
);

/**
 * ⛔ KANAL DÖKÜMÜ AYNI GÖVDEDEN — 28.08.2026'da ayrı bir sonda yazıldı ve
 * `76` saydı; bu gövde `23` diyordu. Sonda tarih kapısını, belirsiz SKU
 * elemesini ve kanal çelişkisi süzgecini taşımıyordu. Rapora giden sayı
 * `yazilacaklar` dizisinden ÜRETİLMEK ZORUNDA; ham dosyadan yeniden
 * sayılırsa iki rakam sessizce ayrışır ve ikisi de "doğru" görünür.
 */
kontrol(
  "kanal dökümü yazilacaklar'dan üretiliyor",
  /for \(const c of yazilacaklar\) \{[\s\S]{0,400}kanalDokumu\.set/.test(satisAktar),
);
kontrol(
  "DEPO satırları ADIM2 kapısında yazılmıyor",
  /const ADIM2_BEKLEYEN = new Set\(\["DEPO"\]\)/.test(yorumsuz(satisAktar)) &&
    /if \(ADIM2_BEKLEYEN\.has\(s\.kanal\.toUpperCase\(\)\)\) \{ say\("adim2Bekliyor"\); continue; \}/
      .test(yorumsuz(satisAktar)),
);

/** ⚠ GERİ ALMA: satış SİLİNMEZ, işaretlenir + stok ters kayıtla döner. */
kontrol(
  "geri alma satışı SİLMİYOR, işaretliyor",
  !/sale\.delete|saleItem\.delete/.test(yorumsuz(satisAktar)) &&
    /data: \{ iptalTarihi: okumaAni \}/.test(satisAktar),
);
kontrol(
  "geri alma stok hareketini TERS KAYITLA geri veriyor",
  /type: "ADJUSTMENT",[\s\S]{0,200}quantityDelta: -h\.quantityDelta,/.test(satisAktar),
);
kontrol(
  "geri alınacak küme importBatch'ten TÜRETİLİYOR",
  /where: \{ importBatch: GERI \}/.test(satisAktar),
);
/**
 * ⚠ SAYI İKİDEN ÜÇE ÇIKTI — ve bu bir GÜÇLENDİRME, gevşetme değil.
 * Kâr tazeleme ÜÇÜNCÜ bir yazma yolu; kendi `--yaz` kapısı olmasaydı
 * `--kar-tazele` tek başına yazardı. Sayı sabitlendi ki dördüncü bir
 * yol kapısız eklenemesin.
 */
kontrol(
  "yazım --yaz bayrağına kilitli (ÜÇ yazma yolu: yazım · geri alma · kâr)",
  (satisAktar.match(/if \(!YAZ\) \{/g) ?? []).length === 3,
);
kontrol("toplu yazım AuditLog bırakıyor", /action: "SATIS_ICE_AKTARMA"/.test(satisAktar));
kontrol(
  "tutmayan sayım YORUMLANMADAN yazılıyor",
  /TUTMADI/.test(satisAktar) && /YORUMLANMADI/.test(satisAktar),
);
/** ⚠ HATA MESAJI TAM TAŞINIR — `split()[0]` tuzağı tekrarlanmaz. */
kontrol(
  "hata mesajı split()[0] ile KESİLMİYOR",
  !/message\.split\(/.test(satisAktar),
);


console.log("\n⑬ MARJ — üç sebep + rakam basma eşiği");

const panelKaynak = oku("src/app/page.tsx");

/**
 * ⭐ ÜÇÜNCÜ SEBEP — VE SIRA ÖNEMLİ. Alım defteri o dönemi hiç
 * kapsamıyorsa varyantın hareketi olup olmaması ANLAMSIZ. Sıra yanlış
 * olsaydı bu kalemler "alım kaydı yok" diye sayılır ve KAPATILABİLİR
 * sanılırdı — oysa kapatılamaz.
 */
/**
 * ⛔ KAPSAM ÖLÇÜTÜ VARYANT BAZLI — GENEL `min(purchasedAt)` DEĞİL.
 * Genel ölçüt defterin SEYREK KUYRUĞUNA takılıyordu: 2024-05'te tek bir
 * kayıt yüzünden sınır oraya düşüyor ve (c) yalnız **1** sayıyordu;
 * varyant bazlı ölçüt gerçek boşluğu gösteriyor.
 */
kontrol(
  "kapsam ölçütü VARYANT BAZLI ilk alım tarihinden",
  /varyantIlkAlim\.get\(k\.variantId\)/.test(marjGovde) &&
    /k\.sale\.soldAt\.getTime\(\) < ilkAlim\.getTime\(\)/.test(marjGovde),
);
/**
 * ⚠ GENEL AGGREGATE ARTIK KULLANILMIYOR — mutasyon onu geri getirirse
 * kırmızı yanmalı.
 */
/**
 * ⚠ KAPSAM `marjSerhi` GÖVDESİ — dosyanın tamamı DEĞİL.
 * `defterDerinligi` aynı dosyada ve `purchase.aggregate` KULLANIYOR;
 * dosya çapında aransaydı bu kontrol her zaman kırmızı yanardı ve
 * ölçtüğü şey de yanlış olurdu. _(Anayasa: desen kullanım bloğunda
 * aranır, dosyada değil.)_
 */
kontrol(
  "genel min(purchasedAt) ölçütü marjSerhi'de KULLANILMIYOR",
  !/purchase\.aggregate/.test(yorumsuz(marjGovde)),
);
kontrol(
  "ölçüt SABİT TARİHE bağlı değil",
  !/new Date\("202\d-/.test(yorumsuz(marjGovde)),
);
/**
 * ⛔ "YOĞUN AY" GİBİ BİR EŞİK DE YOK — dağılımdan türetilmemiş her sayı
 * uydurmadır ve üstüne kurulan akıl yürütmeyi de dayanaksız yapar.
 */
kontrol(
  "yoğunluk eşiği YOK",
  !/adet >= \d+|>= 20|yogun/i.test(yorumsuz(marjGovde)),
);
kontrol(
  "kapsam dışı EN BAŞTA ayrılıyor (kova sırası)",
  /donemDisilar\.add\(k\.sale\.id\);\s*continue;/.test(marjGovde),
);
kontrol(
  "üçüncü satır ekrana BASILIYOR",
  /t\("marjDonemDisi",\s*\{\s*adet: s\.donemDisi\s*\}\)/.test(marjMetin),
);
kontrol(
  "ÜÇ sebep de sıfırsa şerh sönüyor",
  /if \(s\.bekleyen === 0 && s\.alimYok === 0 && s\.donemDisi === 0\) return null;/.test(marjKaynak),
);

/**
 * ⛔ MARJ RAKAMI KAPSANMAYAN PAY EŞİĞİ AŞINCA BASILMAZ.
 * Ölçüldü: pay %90 iken ekran %1,11, gerçek %11,12 — on kat.
 */
kontrol(
  "eşik gösterim hassasiyetinden türetilmiş",
  /export const MARJ_BASAMAK = 1;/.test(serhLib) &&
    /export const MARJ_KAPSAM_ESIGI = 0\.5 \/ 100;/.test(serhLib),
);
kontrol(
  "eşik saf kuralda, ekrana GÖMÜLÜ değil",
  /export function marjBasilabilirMi/.test(serhLib) &&
    !/0\.5 \/ 100|kapsanmayanPay >/.test(yorumsuz(panelKaynak)),
);
const oranBloku = blok(panelKaynak, "{oranlar.satisa === null ? null : (", 1600);
kontrol("panel oran bloğu bulundu", oranBloku.length > 0);
kontrol(
  "rakam ANCAK eşik sağlanınca basılıyor",
  /marjBasilabilirMi\(marjDurumuOzeti\) \? \(/.test(oranBloku),
);
kontrol(
  "aşılınca 'hesaplanamıyor' + SAYILAR basılıyor",
  /t\("marjHesaplanamiyor", \{/.test(oranBloku) &&
    /kapsanmayan: marjDurumuOzeti\.kapsanmayanSatis/.test(oranBloku) &&
    /toplam: marjDurumuOzeti\.toplamSatis/.test(oranBloku),
);
/**
 * ⚠ ŞERH İLE KUTU AYNI GÖVDEDEN — ayrı hesaplansaydı şerh "%90
 * kapsanmıyor" derken kutu rakam basabilir ve iki ekran birbirini
 * çürütürdü.
 */
kontrol(
  "kutu ile şerh AYNI gövdeden besleniyor",
  /const marjDurumuOzeti = await marjSerhi\(prisma\)/.test(panelKaynak),
);


console.log("\n⑭ SATIŞ AKTARIMI — kâr tazeleme yolu");

/**
 * ⛔ CANLI KUSUR 27.08.2026 — YAZIM KÂR MOTORUNU ÇAĞIRMIYORDU.
 * Satış içe aktarma `SALE_OUT` yazıyor ama kâr hesabı yapmıyordu:
 * **2757 satışın maliyet bağı VARDI, `profitStatus` NULL'du.** Ekran
 * onları "bağ bekliyor" diye sayıyordu ve VERİ eksiği sanıldı — oysa
 * HESAP eksiğiydi. Alım tarafındaki `canli:stok-bagi` bunu zaten
 * yapıyordu; iki yol sessizce ayrışmıştı.
 */
kontrol(
  "satış aktarımı kâr tazeleme yolu TAŞIYOR",
  /const KAR_TAZELE = process\.argv\.includes\("--kar-tazele"\)/.test(satisAktar) &&
    /await satisKarTazele\(a\.id\)/.test(satisAktar),
);
/**
 * ⚠ KAPSAM: maliyet bağı OLANLAR. Bağı olmayana hesap çalıştırmak
 * `NO_COST` damgası basıp GERÇEK eksiği gizlerdi — sayı düşer, sorun
 * kalır.
 */
const tazelemeBloku = blok(satisAktar, "if (KAR_TAZELE) {", 900);
kontrol("kâr tazeleme bloğu bulundu", tazelemeBloku.length > 0);
kontrol(
  "yalnız maliyet bağı OLAN satışlar tazeleniyor",
  /items: \{ some: \{ stockMovements: \{ some: \{\} \} \} \}/.test(tazelemeBloku),
);
kontrol(
  "yalnız kârı HESAPLANMAMIŞ olanlar",
  /profitStatus: null,/.test(tazelemeBloku),
);
kontrol(
  "iptalli satış tazelenmiyor",
  /iptalTarihi: null,/.test(tazelemeBloku),
);
kontrol(
  "tazeleme de --yaz bayrağına kilitli",
  /if \(!YAZ\) \{/.test(tazelemeBloku),
);
kontrol("tazeleme iz bırakıyor", /action: "SATIS_ICE_AKTARMA_KAR"/.test(satisAktar));
/**
 * ⚠ KALAN SAYISI EKRANDA — "hepsi tazelendi" sanılmasın. Maliyet bağı
 * olmayanlar tazelenemez ve o sayı GÖRÜNMELİ.
 */
kontrol(
  "tazelenemeyen KALAN ekrana basılıyor",
  /kârı HÂLÂ hesaplanmamış/.test(satisAktar),
);




/**
 * ============================================================================
 *  AYNI SONUCU ÜRETEN İKİ YOL, AYNI ADIMLARI TAŞIR
 * ----------------------------------------------------------------------------
 *  ⛔ CANLI KUSUR 27.08.2026 — VE BU KOVA ÖLÇÜMÜ OLMASA GÖRÜNMEZDİ.
 *
 *  İki betik de aynı sonucu üretiyor: satışa maliyet bağlamak.
 *    · `canli-stok-bagi`      → `SALE_OUT` yazıyor **VE kârı tazeliyor**
 *    · `canli-satis-ice-aktar` → `SALE_OUT` yazıyor, **kârı TAZELEMİYORDU**
 *
 *  Sonuç: 2757 satışın maliyet bağı VARDI, `profitStatus` NULL'du. Ekran
 *  onları "bağ bekliyor" diye sayıyordu — sayı doğruydu, ANLAMI yanlıştı.
 *  Bir VERİ eksiği sanıldı, oysa HESAP eksiğiydi ve tek komut uzaktaydı.
 *
 *  ⚠ ÖLÇÜT: `SALE_OUT` YAZAN HER BETİK KÂR TAZELEME YOLUNU TAŞIR.
 *  Kova ADI ya da dosya listesi değil — DAVRANIŞ. Yarın üçüncü bir yol
 *  eklendiğinde de yakalanır.
 * ============================================================================
 */
console.log("\n⑮ İKİ YOL AYRIŞMASI — SALE_OUT yazan her betik kârı tazeler");
const SALE_OUT_YAZANLAR = [
  "scripts/canli-ice-aktarma-stok-bagi.ts",
  "scripts/canli-satis-ice-aktar.ts",
];
for (const yol of SALE_OUT_YAZANLAR) {
  const g = yorumsuz(oku(yol));
  /** ⚠ Önce KAPSAMA girdiğini doğrula — girmiyorsa kontrol boş yeşil olurdu. */
  const yaziyor = /type: "SALE_OUT"/.test(g);
  kontrol(`${yol.split("/").pop()} — SALE_OUT yazıyor (kapsamda)`, yaziyor);
  if (!yaziyor) continue;
  kontrol(
    `${yol.split("/").pop()} — kâr tazeleme yolu TAŞIYOR`,
    /satisKarTazele\(/.test(g),
  );
}


console.log("\n⑯ BELGE EKSİK LİSTESİ — yalnız KAPANABİLİR açık");

const belgeKaynak = oku("scripts/canli-belge-eksik-liste.ts");

/**
 * ⛔ BU LİSTE YALNIZ KAPANABİLİR AÇIĞI TAŞIR.
 * Yanlış varyant girerse Halil BULUNAMAYACAK bir belgenin peşine gider —
 * ve aramayı bırakmadığı sürece liste hiç bitmez. Üç eleme AYRI AYRI
 * sınanıyor; biri düşerse liste sessizce kirlenir.
 */
kontrol(
  "alımı HİÇ olmayan varyant listeye girmiyor ((b) kovası)",
  /if \(ilk === undefined\) continue;/.test(belgeKaynak),
);
kontrol(
  "KAPSAM DIŞI varyant listeye girmiyor ((c) kovası)",
  /if \(k\.sale\.soldAt\.getTime\(\) < ilk\.getTime\(\)\) continue;/.test(belgeKaynak),
);
kontrol(
  "ADET YETERLİ varyant listeye girmiyor (belge eksik DEĞİL)",
  /if \(al >= sa\) continue;/.test(belgeKaynak),
);
/**
 * ⚠ AÇIK FARK TÜRETİLİYOR, elle yazılmıyor — Halil kaç adetlik belge
 * arayacağını bu sayıdan okuyacak.
 */
kontrol(
  "açık fark satış − alım olarak türetiliyor",
  /acikFark: sa - al,/.test(belgeKaynak),
);
/**
 * ⚠ YOĞUNLAŞMA YAZILIYOR: "188 varyant" tek başına iş büyüklüğü
 * söylemez; %80'in kaç üründe toplandığı söyler.
 */
/**
 * ⚠ İŞARET ÇIKTI SATIRINA BAĞLI — "YOĞUNLAŞMA" kelimesi YORUMDA da
 * geçiyor. Kelimeyi arayan ölçüt, `console.log` silinse bile yeşil
 * kalırdı. _(Anayasa: önce deseni SAY.)_
 */
kontrol(
  "yoğunlaşma EKRANA basılıyor",
  belgeKaynak.includes("   YOĞUNLAŞMA:"),
);
/**
 * ⚠ CSV BOM + NOKTALI VİRGÜL TAŞIR. İkisi de olmadan Türkçe Excel
 * dosyayı bozuk açar ("ÜRÜN" → "ÃœRÃœN") ve sütunlar tek hücreye düşer.
 */
kontrol(
  "CSV BOM ile yazılıyor (Türkçe Excel)",
  belgeKaynak.includes("\\uFEFF"),
);
/**
 * ⚠ SAYIYA BAĞLI: ayraç İKİ yerde kullanılıyor — başlık satırı ve veri
 * satırları. Yalnız "geçiyor mu" diye sorulunca birini virgüle çeviren
 * mutasyon ötekini buluyor ve YEŞİL kalıyordu; o hâlde başlıklar tek
 * hücreye düşer, veriler ayrılır — ya da tersi.
 */
kontrol(
  "CSV ayracı noktalı virgül — HER İKİ kullanımda",
  (belgeKaynak.match(/\.join\(";"\)/g) ?? []).length === 2,
);
/** ⚠ SALT OKUMA — bu betik deftere yazmaz. */
kontrol(
  "liste betiği deftere YAZMIYOR",
  !new RegExp("[A-Za-z0-9_$]+" + KACIS_NOKTA + "[A-Za-z0-9_$]+" + KACIS_NOKTA + "(create|update|upsert|delete)" + KACIS_AC, "i").test(yorumsuz(belgeKaynak)),
);



// ---------------------------------------------------------------------------
//  `sinir` PARAMETRESİ — İKİ KULLANIM KARIŞTIRILMAZ (28.08.2026)
// ---------------------------------------------------------------------------
/**
 * ⛔ `acikPartilerToplu(db, ids, sinir)` İKİ FARKLI SORUYA HİZMET EDER:
 *
 *   K55 stok bağı  → `sinir` VERİLMEZ. Soru: "bu satışın maliyeti ne?"
 *     Sonradan girilen alım, kaydedilmemiş bir alımın yerine geçer.
 *     `sinir` verilseydi koşum 0 kalem bağlardı (ölçüldü: 12/12 ters).
 *
 *   K53 tarihli envanter → `sinir` ZORUNLU. Soru: "o TARİHTE elimde ne
 *     vardı?" Sonradan girilen parti o günün stoğuna karışamaz.
 *
 * ⚠ İkisi karıştırılırsa iki farklı soruya tek cevap verilmiş olur:
 * envanter geçmişi şişer ya da maliyet bağı hiç kurulamaz.
 */
{
  console.log("`sinir` parametresi — iki kullanım ayrı");
  const bagi = readFileSync("scripts/canli-ice-aktarma-stok-bagi.ts", "utf8");
  const env = readFileSync("src/lib/envanter-veri.ts", "utf8");

  kontrol(
    "K55 stok bağı `sinir` VERMİYOR",
    /acikPartilerToplu\(prisma, varyantIds\)/.test(bagi),
  );
  /**
   * ⭐ ÖLÇÜT GÜNCELLENDİ 29.08.2026: beyan artık `fifo-sinir:dogrula`nın
   * KENDİ sözcüğüyle yazılıyor (`SINIR YOK:`). İki ayrı beyan biçimi
   * tutmak, birini güncelleyip ötekini unutmanın yoluydu — tek dağarcık.
   */
  kontrol(
    "  ...ve NİYE vermediği kodda YAZILI",
    /SINIR YOK: `sinir` BURADA BİLEREK VERİLMİYOR/.test(bagi),
  );
  kontrol(
    "K53 tarihli envanter `sinir` VERİYOR",
    /acikPartilerToplu\(prisma, null, sinir\)/.test(env),
  );
  /** ⚠ GERİYE DÖNÜK BAĞ İZSİZ KALMAZ — karar kabul edildi ama kayda geçer. */
  kontrol(
    "geriye dönük bağ AuditLog'a yazılıyor",
    /geriyeDonukBag: \{/.test(bagi) && /gecikmeGun/.test(bagi),
  );
  kontrol(
    "  ...ve EKRANDA da yazıyor (kaydedilen = görünen)",
    /GERİYE DÖNÜK BAĞ — parti satıştan SONRA damgalı/.test(bagi),
  );

  /**
   * ⛔ ATLANANLARIN SEBEBİ İKİYE AYRILIR (28.08.2026, kullanıcı düzeltmesi).
   * Eski mesaj hepsine "alımı sisteme hiç girilmemiş" diyordu; ölçüldü,
   * 200 varyantta alım VAR ama YETMİYOR. Tek cümle iki farklı işe yanlış
   * tarif veriyordu: "alımı gir" ≠ "eksik adedi gir".
   */
  kontrol(
    "atlananlar İKİ SEBEBE ayrılıyor (hiç yok / yetmiyor)",
    /ALIM HİÇ GİRİLMEMİŞ/.test(bagi) && /ALIM VAR AMA YETMİYOR/.test(bagi),
  );
  kontrol(
    "  ...ayrım ÖLÇÜLÜYOR (PURCHASE_IN toplamına bakılıyor)",
    /type: "PURCHASE_IN"/.test(bagi) && /alimGirisi\.get\(v\)/.test(bagi),
  );
  /** ⚠ VE ESKİ YANLIŞ CÜMLE GERİ GELMEZ. */
  kontrol(
    "  ...eski 'hiç girilmemiş' toplu iddiası KALKTI",
    !/O ürünlerin alımı[\s\S]{0,60}sisteme hiç girilmemiş/.test(yorumsuz(bagi)),
  );
}

console.log(`\n${hata === 0 ? "TÜM KONTROLLER GEÇTİ" : "BAŞARISIZ"} (${gecen}/${gecen + hata})\n`);
process.exit(hata === 0 ? 0 : 1);
