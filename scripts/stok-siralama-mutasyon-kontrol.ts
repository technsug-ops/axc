import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

/**
 * ============================================================================
 *  K100 · K101 · K102 — MUTASYON HARNESS'İ
 * ----------------------------------------------------------------------------
 *      npm run stok-siralama-mutasyon:kontrol
 *
 *  ⛔ YENİ BEKÇİ, KENDİ KÖRLÜĞÜNÜ SINAYAN MUTASYONLA GELİR. Bu tur iki bekçiyi
 *  birden sınıyor (`arama:dogrula` → K100, `stok-siralama:dogrula` → K101+K102)
 *  çünkü üçü tek pakette teslim edildi ve tek bir kaçış paketin tamamına olan
 *  güveni götürür.
 *
 *  ⚠ İKİ YÖN AYRI SINANIR: davranışı KALDIRAN mutasyon (yanlış susma) ve
 *  davranışı FAZLADAN yapan mutasyon (yanlış yanma). Yalnız biri yazılırsa
 *  öteki yön korumasız kalır.
 *
 *  Üç kapı (öteki üç harness'le AYNI gövde):
 *    ① desen kaynakta TAM BİR KEZ geçmeli
 *    ② mutasyon diskten yeniden okunarak UYGULANDIĞI doğrulanır
 *    ③ hüküm ÇIKIŞ KODUNDAN — ve bekçinin başlığı çıktıda yoksa "ÇÖKTÜ"
 * ============================================================================
 */

type Bekci = { yol: string; baslik: string };

const ARAMA: Bekci = {
  yol: "scripts/arama-dogrula.ts",
  baslik: "ARAMA KURALI",
};
const SIRALAMA: Bekci = {
  yol: "scripts/stok-siralama-dogrula.ts",
  baslik: "STOK SIRALAMASI VE KÂR CÜMLESİ",
};

type Mutasyon = {
  ad: string;
  yon: "KALDIRAN" | "FAZLADAN";
  bekci: Bekci;
  dosya: string;
  bul: string;
  koy: string;
  bozdugu: string;
};

const KURAL = "src/lib/varyant-arama-kurali.ts";
const SIRA_GOVDESI = "src/lib/stok-siralama.ts";
const STOK_SAYFASI = "src/app/stok/page.tsx";
const CUBUK = "src/app/stok/sirala-suzgec.tsx";
const KART = "src/app/kart/[variantId]/page.tsx";
const PANEL = "src/lib/panel-listeler.ts";
const DENE = "src/app/kart/[variantId]/fiyat-dene.tsx";

const MUTASYONLAR: Mutasyon[] = [
  // ═══ K100 — UPC-A ↔ EAN-13 ═════════════════════════════════════════════
  {
    ad: "EAN-13 -> UPC-A dalı silindi (Halil'in vakası yine bulunamaz)",
    yon: "KALDIRAN",
    bekci: ARAMA,
    dosya: KURAL,
    bul: '  if (/^\\d{13}$/.test(k) && k.startsWith("0")) cikti.add(k.slice(1));',
    koy: "",
    bozdugu: "okuyucudan gelen 13 haneli kod, 12 haneli katalog kaydını bulamaz",
  },
  {
    ad: "UPC-A -> EAN-13 dalı silindi",
    yon: "KALDIRAN",
    bekci: ARAMA,
    dosya: KURAL,
    bul: '  if (/^\\d{12}$/.test(k)) cikti.add("0" + k);',
    koy: "",
    bozdugu: "12 haneli aramada 13 haneli kayıt bulunamaz (ters yön)",
  },
  {
    ad: "kural BÜTÜN baştaki sıfırları kırpıyor",
    yon: "FAZLADAN",
    bekci: ARAMA,
    dosya: KURAL,
    bul: '  if (/^\\d{13}$/.test(k) && k.startsWith("0")) cikti.add(k.slice(1));',
    koy: '  if (/^0+/.test(k)) cikti.add(k.replace(/^0+/, ""));',
    bozdugu:
      "`011120272536` gibi gerçekten sıfırla başlayan bir kod başka kümeye taşınır",
  },
  {
    ad: "13 hane sıfırsızken de hane atılıyor",
    yon: "FAZLADAN",
    bekci: ARAMA,
    dosya: KURAL,
    bul: '  if (/^\\d{13}$/.test(k) && k.startsWith("0")) cikti.add(k.slice(1));',
    koy: '  if (/^\\d{13}$/.test(k)) cikti.add(k.slice(1));',
    bozdugu:
      "gerçek bir EAN-13'ten hane atılır ve BAŞKA bir ürünün koduna dönüşebilir",
  },
  {
    ad: "/stok araması çıplak koşula geri döndü (desen yasağı)",
    yon: "KALDIRAN",
    bekci: ARAMA,
    dosya: STOK_SAYFASI,
    bul: "          { barcode: { contains: e } },",
    koy: "          { barcode: { contains: arama } },",
    bozdugu:
      "yedinci ekran kuralı atlar ve düzeltme sessizce o ekrana ulaşmaz",
  },

  // ═══ K101 — SIRALAMA VE SIFIR SÜZGECİ ══════════════════════════════════
  {
    ad: "sıfır ölçütü `> 0` yapıldı (negatif stok gizlenir)",
    yon: "FAZLADAN",
    bekci: SIRALAMA,
    dosya: SIRA_GOVDESI,
    bul: "  return adet !== 0;",
    koy: "  return adet > 0;",
    bozdugu:
      "negatif stok — bir ANOMALİ — süzgeç açıkken sessizce ekrandan kaybolur",
  },
  {
    ad: "hareketsiz varyant sıralamada 0 değil, listeden düşürülüyor",
    yon: "KALDIRAN",
    bekci: SIRALAMA,
    dosya: SIRA_GOVDESI,
    bul: "  const sirali = [...idler];",
    koy: "  const sirali = [...idler].filter((i) => olcumler.has(i));",
    bozdugu: "hiç hareket görmemiş 51 varyant sıralamaya basılınca kaybolur",
  },
  {
    ad: "sıralanmış kimlik dizisine göre geri sıralama silindi",
    yon: "KALDIRAN",
    bekci: SIRALAMA,
    dosya: STOK_SAYFASI,
    bul: "        return sayfaIdleri\n          .map((id) => harita.get(id))",
    koy: "        return satirlar\n          .map((v) => harita.get(v.id))",
    bozdugu:
      "`in` dizi sırasını korumaz — ekran 'sıralı' derken liste rastgele gelir",
  },
  {
    ad: "sıralama SAYFANIN İÇİNİ sıralıyor (süzgecin tamamını değil)",
    yon: "KALDIRAN",
    bekci: SIRALAMA,
    dosya: STOK_SAYFASI,
    bul: "          where: suzgec,\n          select: { id: true, product: { select: { name: true } } },",
    koy: "          where: suzgec,\n          skip: sayfalama.atla,\n          take: sayfalama.boyut,\n          select: { id: true, product: { select: { name: true } } },",
    bozdugu:
      "2. sayfada 1. sayfadan büyük adet çıkar; ekran yalan söyler ve hiçbir şey hata vermez",
  },
  {
    ad: "sıra değişince sayfa numarası korunuyor",
    yon: "FAZLADAN",
    bekci: SIRALAMA,
    dosya: CUBUK,
    bul: "    for (const [k, v] of Object.entries({ ...tasinanlar, ...ek })) {",
    koy: '    for (const [k, v] of Object.entries({ ...tasinanlar, sayfa: "5", ...ek })) {',
    bozdugu:
      "sıra değiştiren kullanıcı bambaşka bir listenin ortasına düşer ve ürünü 'kayboldu' sanır",
  },
  {
    ad: "Excel indirmesi ekranın sıfır süzgecini taşımıyor",
    yon: "KALDIRAN",
    bekci: SIRALAMA,
    dosya: STOK_SAYFASI,
    bul: '          parametreler={{ q: arama, stok: stokSuzgeciAcik ? "var" : undefined }}',
    koy: "          parametreler={{ q: arama }}",
    bozdugu:
      "ekran 230 satır gösterirken indirilen dosyada 1104 satır olur — belge ekranı yalanlar",
  },
  {
    ad: "ölçüm koşulsuz koşuyor (varsayılan açılışa ~600 ms ekler)",
    yon: "FAZLADAN",
    bekci: SIRALAMA,
    dosya: STOK_SAYFASI,
    bul: "  const olcumGerek = stokSuzgeciAcik || !veritabanindaSiralanir(sira);",
    koy: "  const olcumGerek = true;",
    bozdugu: "her stok açılışı gereksiz bir groupBy koşar ve kimse fark etmez",
  },

  // ═══ K102 — KÂR CÜMLESİ ════════════════════════════════════════════════
  {
    ad: "birim satış fiyatı YANLIŞ paydadan (adet, hesaplananAdet değil)",
    yon: "FAZLADAN",
    bekci: SIRALAMA,
    dosya: PANEL,
    bul: "  return satir.hesaplananCiro / satir.hesaplananAdet;",
    koy: "  return satir.ciro / satir.adet;",
    bozdugu:
      "marj = NET-2 / satış fiyatı eşitliği ekranda TUTMAZ; kullanıcı hangi kutunun bozuk olduğunu arar",
  },
  {
    ad: "satış fiyatı kutusu ÖLÜ DALA alındı (desen dosyada kalır)",
    yon: "KALDIRAN",
    bekci: SIRALAMA,
    dosya: KART,
    bul: '                <Kutu\n                  etiket={t("birimSatisFiyati")}',
    koy: '                {false ? (\n                <Kutu\n                  etiket={t("birimSatisFiyati")}',
    bozdugu:
      "kutu HİÇ ÇİZİLMEZ ama sözlük anahtarı dosyada durur — deponun en sık yalancı yeşili",
  },
  {
    ad: "tek satışta ikinci NET kutusu yine gösteriliyor",
    yon: "FAZLADAN",
    bekci: SIRALAMA,
    dosya: KART,
    bul: "                {ozet.tekSatisMi ? null : (",
    koy: "                {false ? null : (",
    bozdugu:
      "aynı rakam iki kutuda görünür; okur ikincisini yeni bir bilgi sanar (İlke #12)",
  },
  {
    ad: "maliyet kutusu ELDE KALAN partilerin ortalamasını gösteriyor",
    yon: "FAZLADAN",
    bekci: SIRALAMA,
    dosya: KART,
    bul: "                  deger={p(ozet.satilanBirimMaliyeti)}",
    koy: "                  deger={p(ozet.ortalamaMaliyet)}",
    bozdugu:
      "satılan malın maliyeti yerine eldeki stoğun maliyeti yazılır — iki farklı soru, tek kutu",
  },

  // === K103 - KART DUZENI ===============================================
  {
    ad: "izgara kirilimi kaldirildi (MOBILDE de iki sutun acilir)",
    yon: "FAZLADAN",
    bekci: SIRALAMA,
    dosya: KART,
    bul: 'className="xl:grid xl:grid-cols-[minmax(0,2fr)_minmax(340px,1fr)] xl:items-start xl:gap-6"',
    koy: 'className="grid grid-cols-[minmax(0,2fr)_minmax(340px,1fr)] items-start gap-6"',
    bozdugu:
      "telefonda kart iki sutuna bolunur; depoda birincil cihaz telefon ve iki blok da okunmaz olur",
  },
  {
    ad: "iki sutun duzeni tamamen silindi",
    yon: "KALDIRAN",
    bekci: SIRALAMA,
    dosya: KART,
    bul: 'className="xl:grid xl:grid-cols-[minmax(0,2fr)_minmax(340px,1fr)] xl:items-start xl:gap-6"',
    koy: 'className="space-y-6"',
    bozdugu: "masaustunde sag taraf yine bos kalir, fiyat denemesi asagida",
  },
  {
    ad: "sag sutun YAPISKAN yapildi (olculmus karara aykiri)",
    yon: "FAZLADAN",
    bekci: SIRALAMA,
    dosya: KART,
    bul: 'className="mt-6 space-y-6 xl:mt-0"',
    koy: 'className="mt-6 space-y-6 xl:mt-0 xl:sticky xl:top-4"',
    bozdugu:
      "FiyatDene kanal basina kart ciziyor; ekrani asan yapiskan blok ikinci bir kaydirma ister",
  },
  {
    ad: "mobil taban genisligi kaldirildi",
    yon: "KALDIRAN",
    bekci: SIRALAMA,
    dosya: KART,
    bul: 'className="mx-auto max-w-3xl xl:max-w-6xl"',
    koy: 'className="mx-auto xl:max-w-6xl"',
    bozdugu: "telefonda satirlar kenardan kenara yayilir, okunabilir sutun genisligi gider",
  },

  // === K103-② HIZALAMA VE ONE CIKARMA ==================================
  {
    ad: "kunye yine izgaranin ICINE alindi (iki sutun hizasiz baslar)",
    yon: "KALDIRAN",
    bekci: SIRALAMA,
    dosya: KART,
    bul: '      <div className="mb-6">',
    koy: '      <div className="mb-6 xl:grid xl:grid-cols-[minmax(0,2fr)_minmax(340px,1fr)]">',
    bozdugu:
      "sag kart sayfanin en tepesinden baslar, soldaki ilk kart kunyenin altindan — goz kayar",
  },
  {
    ad: "fiyat denemesi kartinin yukseltisi silindi",
    yon: "KALDIRAN",
    bekci: SIRALAMA,
    dosya: "src/app/kart/[variantId]/fiyat-dene.tsx",
    bul: 'className="bg-card space-y-4 rounded-xl border p-4 shadow-md"',
    koy: 'className="bg-card space-y-4 rounded-xl border p-4"',
    bozdugu: "kartin tek EYLEM yuzeyi duz bir bilgi kutusu gibi gorunur",
  },
  {
    ad: "vurgu ANLAM RENGIYLE yapildi",
    yon: "FAZLADAN",
    bekci: SIRALAMA,
    dosya: "src/app/kart/[variantId]/fiyat-dene.tsx",
    bul: 'className="bg-card space-y-4 rounded-xl border p-4 shadow-md"',
    koy: 'className="bg-amber-100 space-y-4 rounded-xl border p-4 shadow-md"',
    bozdugu:
      "renk bu depoda HUKUM tasir (olumlu/olumsuz/uyari); fiyat denemesi ne iyi ne kotu haber",
  },

  {
    ad: "baslik yine KARTIN ICINE alindi (kartlar hizasiz kalir)",
    yon: "FAZLADAN",
    bekci: SIRALAMA,
    dosya: DENE,
    bul: '      <p className="text-muted-foreground text-sm">{t("fiyatDeneNot")}</p>',
    koy:
      '      <div>{t("fiyatDeneBaslik")}</div>' +
      String.fromCharCode(10) +
      '      <p className="text-muted-foreground text-sm">{t("fiyatDeneNot")}</p>',
    bozdugu: "baslik iki yerde birden gorunur; kart yine soldaki BASLIK hizasina duser",
  },
  {
    ad: "hizalama sihirli ust boslukla yapildi",
    yon: "FAZLADAN",
    bekci: SIRALAMA,
    dosya: KART,
    bul: 'className="mt-6 space-y-6 xl:mt-0"',
    koy: 'className="mt-6 space-y-6 xl:mt-0 xl:pt-7"',
    bozdugu:
      "sayi basligin satir yuksekligine kilitlenir; yazi tipi degisince hizalama sessizce kayar",
  },
  {
    ad: "bolum sarmali kaldirildi (baslik hic cizilmez)",
    yon: "KALDIRAN",
    bekci: SIRALAMA,
    dosya: KART,
    bul: '        <Bolum baslik={t("fiyatDeneBaslik")} ikon={Calculator}>',
    koy: "        <>",
    bozdugu: "sag sutun baslıksiz kalir ve kart yine soldaki basligin hizasina duser",
  },
];

function bekciyiKostur(b: Bekci): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + b.yol, {
    shell: true,
    encoding: "utf8",
    maxBuffer: 40 * 1024 * 1024,
  });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(b.baslik) };
}

/** Satır sonlarını hedef dosyanın biçimine uydurur (depoda CRLF de var). */
function desenNormalle(kaynak: string, desen: string): string {
  return kaynak.includes("\r\n") ? desen.split("\n").join("\r\n") : desen;
}

console.log("");
console.log("K100 · K101 · K102 — MUTASYON TURU");
console.log("");

let yakalanan = 0;
const kacan: string[] = [];
const bozuk: string[] = [];

for (const m of MUTASYONLAR) {
  const asil = readFileSync(m.dosya, "utf8");
  const bul = desenNormalle(asil, m.bul);
  const koy = desenNormalle(asil, m.koy);

  /** ⚠ ① DESEN TAM BİR KEZ — birden çoksa hangi yeri bozduğu belirsizdir. */
  const adet = asil.split(bul).length - 1;
  if (adet !== 1) {
    bozuk.push(
      m.ad + "\n       desen " + m.dosya + " içinde " + adet + " kez geçiyor (1 olmalı)",
    );
    continue;
  }

  const mutant = asil.replace(bul, koy);
  let sonuc: { kod: number; ciktiVar: boolean };
  try {
    writeFileSync(m.dosya, mutant, "utf8");
    /**
     * ⚠ ② TAM EŞİTLİK — "farklı" DEĞİL. Kısmi/bozuk bir yazımı "uygulandı"
     * saymamak için; K98'de devralınan kapı EKLEYEN mutasyonlarda yanlış
     * alarm veriyordu ve üç harness'te birden düzeltildi.
     */
    const diskten = readFileSync(m.dosya, "utf8");
    if (diskten !== mutant || mutant === asil) {
      bozuk.push(m.ad + "\n       mutasyon diske UYGULANMADI");
      continue;
    }
    sonuc = bekciyiKostur(m.bekci);
  } finally {
    writeFileSync(m.dosya, asil, "utf8");
  }

  const isaret = m.yon === "KALDIRAN" ? "−" : "+";
  /** ⚠ ③ HÜKÜM ÇIKIŞ KODUNDAN — ve bekçi çökmüşse ölçüm GEÇERSİZ. */
  if (sonuc.kod !== 0 && sonuc.ciktiVar) {
    yakalanan++;
    console.log("  ✓  " + isaret + " " + m.ad);
  } else if (sonuc.kod !== 0) {
    bozuk.push(m.ad + "\n       bekçi ÇÖKTÜ (başlık basılmadı) — ölçüm geçersiz");
  } else {
    kacan.push(m.ad + "\n       KORUMASIZ: " + m.bozdugu);
  }
}

console.log("");
if (kacan.length) {
  console.log("  KAÇAN MUTASYONLAR — bekçi bunları GÖRMEDİ:\n");
  for (const k of kacan) console.log("  ✗  " + k);
  console.log("");
}
if (bozuk.length) {
  console.log("  HARNESS HATASI — mutasyon ölçülemedi:\n");
  for (const b of bozuk) console.log("  ⛔ " + b);
  console.log("");
}

const toplam = MUTASYONLAR.length;
const kaldiran = MUTASYONLAR.filter((m) => m.yon === "KALDIRAN").length;
console.log(
  "  " + yakalanan + "/" + toplam + " mutasyon yakalandı" +
    "   (− kaldıran " + kaldiran + " · + fazladan " + (toplam - kaldiran) + ")",
);
if (kacan.length || bozuk.length) {
  console.log("\n  ⛔ Kaçan ya da ölçülemeyen mutasyon var — bekçi eksik.\n");
  process.exitCode = 1;
} else {
  console.log("  ✓  her ölçüt İKİ YÖNDEN de sınandı ve kırmızı yandığı GÖRÜLDÜ\n");
}
