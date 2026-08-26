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
const kaymaBloku = blok(kaynak, "const ham = Number(p.orderDate)", 260);
kontrol("orderDate okuma bloğu bulundu", kaymaBloku.length > 0);
kontrol(
  "orderDate'ten kayma ÇIKARILIYOR",
  /const\s+duzeltilmis\s*=\s*ham\s*-\s*ORDERDATE_KAYMA_MS/.test(kaymaBloku),
);
kontrol(
  "pencere süzgeci DÜZELTİLMİŞ değeri kullanıyor",
  /duzeltilmis\s*<\s*bas\s*\|\|\s*duzeltilmis\s*>\s*son/.test(kaymaBloku),
);
kontrol(
  "kayma tam 3 saat",
  /const ORDERDATE_KAYMA_MS = 3 \* 3600_000;/.test(kaynak),
);
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
 * (``) bağlanınca dördü de kırmızı yandı.
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

console.log(`\n${hata === 0 ? "TÜM KONTROLLER GEÇTİ" : "BAŞARISIZ"} (${gecen}/${gecen + hata})\n`);
process.exit(hata === 0 ? 0 : 1);
