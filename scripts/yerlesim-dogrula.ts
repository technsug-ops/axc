/**
 * ============================================================================
 *  YERLEŞİM BEKÇİSİ — "SAYFA YANA KAYIYOR MU?"
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run yerlesim:dogrula
 *
 *  NEDEN VAR (kullanıcı yakaladı 14.08.2026): /alimlar, /satislar ve
 *  /urunler ekranlarında pencerenin altında YATAY KAYDIRMA çubuğu çıkıyordu.
 *  Kayan şey tablo değil SAYFAYDI — menü ve üst çubuk dahil her şey yana
 *  gidiyordu.
 *
 *  SEBEP: `SidebarInset` bir flex öğesi ve flex öğelerinin varsayılan
 *  `min-width` değeri `auto`'dur, yani içeriğinden küçülemez. Geniş bir
 *  tablo öğeyi viewport dışına itiyor; tablonun kendi `overflow-x-auto`
 *  kabı hiç devreye girmiyor.
 *
 *  ÇÖZÜM: zincirdeki flex öğelerine `min-w-0`. Bu bekçi o sınıfların
 *  yerinde durduğunu doğruluyor — hiçbir test bu hatayı yakalamamıştı,
 *  çünkü sunucu 200 dönüyor, tipler geçiyor, derleme temiz. Kırılırsa
 *  ancak gerçek cihazda görülüyor; bu yüzden sınıfın kendisi kilitlendi.
 *
 *  Kaynak ağacını okur; tarayıcı ÇALIŞTIRMAZ (projede otomasyon yok).
 *  Bu yüzden gerçek genişlik ölçümü değil, BİLİNEN TUZAĞIN nöbetçisidir.
 * ============================================================================
 */

import { readFileSync } from "node:fs";

let basarisiz = 0;
let calisan = 0;

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

const layout = readFileSync("src/app/layout.tsx", "utf8");
const table = readFileSync("src/components/ui/table.tsx", "utf8");

console.log("\n1) KABUK — flex zinciri küçülebiliyor mu?");
{
  kontrol(
    "SidebarInset min-w-0 taşıyor",
    /<SidebarInset[^>]*className="[^"]*min-w-0/.test(layout),
    "layout.tsx içindeki <SidebarInset> className'inde min-w-0 yok",
  );

  // İçerik sarmalayıcısı: `flex-1 p-4 ...` olan div.
  const sarmalayici = /<div className="([^"]*flex-1[^"]*p-4[^"]*)"/.exec(layout);
  kontrol("içerik sarmalayıcısı bulundu", sarmalayici !== null);
  if (sarmalayici) {
    kontrol(
      "içerik sarmalayıcısı min-w-0 taşıyor",
      sarmalayici[1].includes("min-w-0"),
      sarmalayici[1],
    );
    /**
     * EMNİYET KEMERİ: yarın bir ekran kendi kabına almadığı geniş bir öğe
     * koyarsa sayfa yine kaymasın, o öğe kırpılsın.
     * `clip` olmalı, `hidden` OLMAMALI: `hidden` yeni bir kaydırma bağlamı
     * açar ve üst çubuktaki `sticky` davranışını bozar.
     */
    kontrol(
      "içerik sarmalayıcısı overflow-x-clip taşıyor",
      sarmalayici[1].includes("overflow-x-clip"),
      sarmalayici[1],
    );
    kontrol(
      "overflow-x-hidden KULLANILMIYOR (sticky başlığı bozar)",
      !sarmalayici[1].includes("overflow-x-hidden"),
      sarmalayici[1],
    );
  }
}

console.log("\n2) TABLO — kendi kaydırma kabı yerinde mi?");
{
  /**
   * `Table` bileşeni tabloyu bir `overflow-x-auto` kabına sarıyor. Bu kap
   * kaldırılırsa HER liste ekranı sayfayı yana kaydırır; tek satırlık bir
   * düzenlemenin bütün uygulamayı bozduğu yer burası.
   */
  kontrol(
    "Table bileşeni overflow-x-auto kabı içinde",
    /data-slot="table-container"[\s\S]{0,200}overflow-x-auto/.test(table),
  );
  kontrol(
    "tablo hücreleri whitespace-nowrap (para/tarih bölünmesin)",
    /data-slot="table-cell"[\s\S]{0,300}whitespace-nowrap/.test(table),
  );
}

console.log("\n3) SÜTUN BÜTÇESİ — liste tabloları tek ekrana sığıyor mu?");
{
  /**
   * ÖLÇÜLDÜ 14.08.2026 (canlı veriyle, gerçek metin uzunluklarından):
   *   1365px pencere − 256px menü − dolgu ≈ 1045px kullanılabilir.
   *   ESKİ HÂL: alımlar 1232px · ürünler 1189px · satışlar 1122px → taşıyor.
   *   YENİ HÂL: alımlar  859px · satışlar  874px · ürünler  802px → sığıyor.
   *
   * Sütun sayısı kaba ama işe yarayan bir vekil: 13px yazıda 7 sütun
   * ~1045px'e sığıyor, 8. sütun taşırıyor. Gerçek piksel ölçümü tarayıcı
   * ister (projede otomasyon yok), bu yüzden bekçi SAYIYI tutuyor.
   *
   * Yeni bir sütun gerekiyorsa çare sütun eklemek değil, ilişkili iki
   * bilgiyi tek hücrede üst üste koymaktır (components/iki-satir.tsx).
   */
  const TAVAN = 7;
  /**
   * ⚠ ELLE TUTULAN LİSTE — VE BUNUN BİLİNEN BİR BEDELİ VAR.
   *
   * Anayasa elle tutulan bekçi listelerini yasaklıyor ("ölçüt tersten
   * kurulur"), ve haklı: `/kanal-sku` 23.08.2026'da yedi sütuna çıktı, bu
   * liste onu HİÇ görmüyordu. Eklendi.
   *
   * ⚠ AMA ÖLÇÜT KÖRLEMESİNE TERSİNE ÇEVRİLMEDİ — ÖLÇÜLDÜ VE ÇEVİRME ELENDİ.
   * `src/app` altında `<TableHeader>` taşıyan 20 sayfa var ve YEDİSİ zaten
   * tavanın üstünde (8–9 sütun): `iadeler` 9 · `stok` · `kartlar` ·
   * `giderler` · `envanter-degeri` · `ayarlar/kanallar` · `alimlar/[id]` 8.
   * Ölçütü hepsine uygulamak yedi ekranı birden kırmızı yakardı.
   *
   * ⚠ VE BU BİR HÜKÜM DEĞİL: tavan (7) BU ÜÇ EKRANIN içerik genişliğine
   * göre ölçüldü ("~1045px'e sığıyor"). Sütunları dar olan bir ekran (rozet,
   * ikon, kısa sayı) sekiz sütunla da sığabilir. Gerçek ölçüt piksel
   * genişliği ve o tarayıcı ister — projede otomasyon yok. Yani sayı bir
   * VEKİLDİR ve vekil, ölçüldüğü kümenin dışına uygulanamaz.
   *
   * ⛔ Yedi ekranın durumu panoda AÇIK kalem (gerçek cihazda bakılacak);
   * burada sessizce "sorun yok" da denmiyor, uydurma kırmızı da yakılmıyor.
   */
  const LISTELER = [
    "src/app/alimlar/page.tsx",
    "src/app/satislar/page.tsx",
    "src/app/urunler/page.tsx",
    "src/app/kanal-sku/page.tsx",
  ];

  for (const yol of LISTELER) {
    const kaynak = readFileSync(yol, "utf8");
    // İlk <TableHeader> bloğu = masaüstü liste tablosunun başlık satırı.
    const blok = /<TableHeader>([\s\S]*?)<\/TableHeader>/.exec(kaynak);
    if (!blok) {
      kontrol(`${yol}: başlık satırı bulundu`, false);
      continue;
    }
    const sayi = (blok[1].match(/<TableHead[\s>]/g) ?? []).length;
    kontrol(
      `${yol.replace("src/app/", "").replace("/page.tsx", "")}: ${sayi} sütun (tavan ${TAVAN})`,
      sayi <= TAVAN,
      sayi > TAVAN
        ? `${sayi - TAVAN} sütun fazla — iki satırlı hücreye taşı (iki-satir.tsx)`
        : undefined,
    );
  }
}

console.log("");
if (basarisiz === 0) {
  console.log(`TÜM KONTROLLER GEÇTİ (${calisan})`);
  process.exit(0);
} else {
  console.log(`${basarisiz} KONTROL BAŞARISIZ (${calisan} kontrol içinde)`);
  process.exit(1);
}
