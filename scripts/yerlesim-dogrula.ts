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

import { readFileSync, readdirSync } from "node:fs";

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
  /**
   * ⛔ ELLE TUTULAN DOSYA LİSTESİ KALDIRILDI (K43, 01.09.2026).
   *
   * Ölçüt DÖRT dosyayı sayıyordu; depoda `<TableHeader>` taşıyan **32
   * tablo** var ve YEDİSİ tavanın üstünde. Yani bekçi, koruduğunu sandığı
   * şeyin beşte birini ölçüyordu — ve sekizinci ekran yarın eklendiğinde
   * yine sessizce yeşil kalırdı.
   * _(Anayasa: "bekçi ölçütü elle tutulan liste değil, tersten kurulur".)_
   *
   * ── ⚠ AMA TAVAN KÖRLEMESİNE UYGULANMIYOR ────────────────────────────
   * Tavan (7) ÜÇ ekranın içerik genişliğine göre ölçüldü. Sütunları dar
   * olan bir ekran (rozet · ikon · kısa sayı) sekizle de sığabilir; gerçek
   * ölçüt piksel genişliğidir ve o tarayıcı ister — projede otomasyon yok
   * (karar 08.08.2026). Yedi ekranı birden kırmızı yakmak, ölçülmemiş bir
   * kısıtla çalışan ekranları kilitlemek olurdu.
   * _(Anayasa: "bir sınırın yönü ölçülmeden çevrilmez".)_
   *
   * ⭐ ÇÖZÜM: tavanın üstündeki ekran **kendi dosyasında BEYAN EDER**:
   *
   *     SUTUN TAVANI ISTISNASI: <sütun sayısı> — <gerekçe>
   *
   * · Beyanı olmayan aşım KIRMIZI — yarın eklenen ekran yakalanır.
   * · Beyan **sayıyla birlikte** okunur: 8 beyan edip 9'a çıkan ekran yine
   *   kırmızı yanar; istisna bir sütun için verildi, sonrakine değil.
   * · Beyanlar TUTANAK olarak basılır — sayı sıfırlanmadıkça görünür kalır,
   *   yani muafiyet saklanma yeri olmaz.
   *   _(Anayasa: "sıfır satır gizlenmez" · "tutanak, kusur ile sınırı
   *   ayırt ettirir".)_
   */
  const ekranlar: string[] = [];
  (function tara(dizin: string) {
    for (const giris of readdirSync(dizin, { withFileTypes: true })) {
      const yol = `${dizin}/${giris.name}`;
      if (giris.isDirectory()) tara(yol);
      else if (giris.name.endsWith(".tsx")) ekranlar.push(yol);
    }
  })("src/app");

  const tabloluEkranlar = ekranlar
    .map((yol) => [yol, readFileSync(yol, "utf8")] as const)
    .filter(([, kaynak]) => kaynak.includes("<TableHeader>"));

  /**
   * ⛔ TABAN DOLULUĞU AYRICA KANITLANIR: tarama bozulup boş dönseydi
   * aşağıdaki `filter` hiçbir şey bulamaz ve bekçi yeşil yanardı.
   */
  /** Taban ÖLÇÜLDÜ 01.09.2026: `<TableHeader>` taşıyan 24 dosya. Eşik
   *  tahminle değil o ölçümün altına konuldu — tarama bozulup küçülürse
   *  yakalasın, birkaç ekran silinirse haksız yere yanmasın. */
  kontrol(
    `tablolu ekran bulundu (${tabloluEkranlar.length})`,
    tabloluEkranlar.length >= 20,
  );

  const beyanlilar: string[] = [];
  const beyansizlar: string[] = [];
  const bayatBeyanlar: string[] = [];

  for (const [yol, kaynak] of tabloluEkranlar) {
    const blok = /<TableHeader>([\s\S]*?)<\/TableHeader>/.exec(kaynak);
    if (!blok) continue;
    const sayi = (blok[1]?.match(/<TableHead[\s>]/g) ?? []).length;
    if (sayi <= TAVAN) continue;

    const kisa = yol.replace("src/app/", "").replace("/page.tsx", "");
    const beyan = /SUTUN TAVANI ISTISNASI:\s*(\d+)\s*—\s*(.*)/.exec(kaynak);
    if (beyan === null) {
      beyansizlar.push(`${kisa} (${sayi} sütun)`);
      continue;
    }
    const beyanEdilen = Number(beyan[1]);
    const gerekce = (beyan[2] ?? "").trim();
    if (gerekce.length < 20) {
      beyansizlar.push(`${kisa} — beyan GEREKÇESİZ`);
      continue;
    }
    if (beyanEdilen !== sayi) {
      bayatBeyanlar.push(`${kisa}: beyan ${beyanEdilen}, gerçek ${sayi}`);
      continue;
    }
    beyanlilar.push(`${kisa} (${sayi})`);
  }

  kontrol(
    `tavanı aşıp BEYANI OLMAYAN ekran YOK (${beyansizlar.length})`,
    beyansizlar.length === 0,
    beyansizlar,
  );
  kontrol(
    `beyan sütun sayısıyla GÜNCEL (${bayatBeyanlar.length} bayat)`,
    bayatBeyanlar.length === 0,
    bayatBeyanlar,
  );

  /**
   * ⚠ TUTANAK — GÖREV DEĞİL, KAYIT. Bu satırlar bugün kapatılamaz: piksel
   * ölçümü gerçek cihaz ister. Ama KAYBOLMAZLAR da; her koşumda sayılır.
   */
  console.log(
    `        tavan üstü BEYANLI ekran: ${beyanlilar.length}` +
      (beyanlilar.length > 0 ? ` — ${beyanlilar.join(" · ")}` : ""),
  );
}

console.log("");
if (basarisiz === 0) {
  console.log(`TÜM KONTROLLER GEÇTİ (${calisan})`);
  process.exit(0);
} else {
  console.log(`${basarisiz} KONTROL BAŞARISIZ (${calisan} kontrol içinde)`);
  process.exit(1);
}
