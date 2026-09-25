import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  TABLO OKUMA KAPISI — MUTASYON HARNESS'İ (K226, 21.09.2026)
 * ----------------------------------------------------------------------------
 *      npm run tablo-oku-mutasyon:kontrol
 *
 *  ⛔ NİYE ZORUNLU: bu kapının bozulması SESSİZDİR. Yanlış çözülen bir tarih
 *  hücresi hata vermez, kırpılmamış bir ürün adı "bulunamadı" kovasına düşer,
 *  `""` ile `null` farkı her `=== null` kontrolünü çevirir. Üçü de ekranda
 *  MAKUL görünür — tam da mutasyonsuz bir bekçinin körleşeceği yer.
 *
 *  ⚠ ÜÇ YÖN AYRI SINANIR:
 *    ○ ZARARSIZ : yorum değişikliği → YEŞİL vermeli. Yoksa hiçbir şey
 *                 koşmayan bir harness "mükemmel" görünür (21.09 dersi:
 *                 yalancı kırmızı, yalancı yeşil kadar tehlikelidir).
 *    − KALDIRAN : davranış düşer → bekçi kırmızı yanmalı
 *    + FAZLADAN : davranış fazladan yapılır → bekçi kırmızı yanmalı
 * ============================================================================
 */

const BEKCI = "scripts/tablo-oku-dogrula.ts";
/** Bekçi GERÇEKTEN koştu mu — açılış satırı. */
const BEKCI_BASLIGI = "TABLO OKUMA KAPISI";

const KAPI = "src/lib/tablo/tablo-oku.ts";

type Mutasyon = {
  ad: string;
  yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN";
  dosya: string;
  bul: string;
  koy: string;
  bozdugu: string;
};

const MUTASYONLAR: Mutasyon[] = [
  {
    ad: "ZARARSIZ — yalnız yorum değişti (harness sağlaması)",
    yon: "ZARARSIZ",
    dosya: KAPI,
    bul: "/** Bir sayfa: adı ve ham satırları. */",
    koy: "/** Bir sayfa: adi ve ham satirlari. */",
    bozdugu: "hiçbir şey — bu mutasyon YEŞİL kalmalı",
  },
  {
    ad: "SAAT DİLİMİ KAPISI KALKTI — `UTC: true` silindi",
    yon: "KALDIRAN",
    dosya: KAPI,
    bul: "          UTC: true,\n",
    koy: "",
    bozdugu:
      "tarih hucreleri ORTAMIN saat diliminde cozulur; ayni dosya Berlin'de ve UTC sunucuda IKI FARKLI an verir (olculdu: 2 saat, 93 hucre)",
  },
  {
    ad: "TARİH BİÇİMİ GÖRÜNMEZ OLDU — `cellStyles` kapatıldı",
    yon: "KALDIRAN",
    dosya: KAPI,
    bul: 'const kitap = XLSX.read(bayt, { type: "buffer", cellStyles: true });',
    koy: 'const kitap = XLSX.read(bayt, { type: "buffer" });',
    bozdugu:
      "hucrenin sayi bicimi (z) gelmez; tarih hucresi ile duz sayi ayirt EDILEMEZ ve tarihler ham seri sayi olarak akar",
  },
  {
    ad: "YUVARLAMAYA DÖNÜLDÜ — kesme kuralı bozuldu",
    yon: "KALDIRAN",
    dosya: KAPI,
    bul: "return new Date((seri - (tabani1904 ? 24107 : 25569)) * 86400000);",
    koy: "return new Date(Math.round((seri - (tabani1904 ? 24107 : 25569)) * 86400000));",
    bozdugu:
      "ayni duvar saati iki kapidan 1 ms farkla cikar; sinir karsilastirmalarinda (lt/lte) bir kayit sessizce disarida kalabilir",
  },
  {
    ad: "KIRPMA KALKTI — metin sonundaki boşluk kaldı",
    yon: "KALDIRAN",
    dosya: KAPI,
    bul: "  const kirpik = ham.trim();",
    koy: "  const kirpik = ham;",
    bozdugu:
      "kirpilmamis urun adi katalogdaki adla eslesmez; satir sessizce 'bulunamadi' kovasina duser",
  },
  {
    ad: "BOŞ METİN null'A ÇEVRİLMİYOR",
    yon: "KALDIRAN",
    dosya: KAPI,
    bul: '  return kirpik === "" ? null : kirpik;',
    koy: "  return kirpik;",
    bozdugu:
      "bos hucre '' olarak akar; `=== null` ile kurulmus her kontrol bos bir hucreyi DOLU sayar",
  },
  {
    ad: "SONDAKİ BOŞ SATIR KIRPMASI KALKTI",
    yon: "KALDIRAN",
    dosya: KAPI,
    bul: "  }).map((sayfa) => ({ ...sayfa, data: sondakiBosSatirlariAt(sayfa.data) }));",
    koy: "  });",
    bozdugu:
      "ayni dosya iki kapidan farkli satir sayisi verir; 'N satir okundu' raporu kapiya gore degisir",
  },
  {
    ad: "ESKİ BİÇİM TANINMIYOR — OLE2 dalı düştü",
    yon: "KALDIRAN",
    dosya: KAPI,
    bul: '  if (OLE2.every((b, i) => bayt[i] === b)) return "XLS";',
    koy: "  // dal kaldirildi",
    bozdugu:
      "N11 dosyasi yine acilamaz ve kullaniciyi suclayan hata geri gelir — arizanin kendisi",
  },
  {
    ad: "TANINMAYAN BİÇİM SESSİZCE GEÇİYOR",
    yon: "KALDIRAN",
    dosya: KAPI,
    bul: "  if (bicim === null) throw new BicimTaninmadiHatasi();",
    koy: "  if (bicim === null) return { sayfalar: [], bicim: \"XLSX\", normallestirildi: false };",
    bozdugu:
      "excel olmayan bir dosya BOS sayfa listesi olarak akar; ekran '0 satir okundu' der ve sebebi hic soylenmez",
  },
  {
    ad: "YALNIZ İLK SAYFA DÖNÜYOR",
    yon: "KALDIRAN",
    dosya: KAPI,
    bul: "    return { sayfalar: eskiBicimiOku(bayt), bicim, normallestirildi: false };",
    koy: "    return { sayfalar: eskiBicimiOku(bayt).slice(0, 1), bicim, normallestirildi: false };",
    bozdugu:
      "verisi IKINCI sayfada olan dosyalar (HB teklif dosyasi tam boyle) hic gorulmez",
  },
  {
    ad: "ARADAKİ BOŞ SATIRLAR DA ATILIYOR",
    yon: "FAZLADAN",
    dosya: KAPI,
    bul: "          blankrows: true,",
    koy: "          blankrows: false,",
    bozdugu:
      "satir indisleri KAYAR; N11 dosyasinda basliklar 11. satirda ve baslik aramasi yanlis satira bakar",
  },
  {
    ad: "ÇIPLAK OKUMA GERİ GELDİ — kapı atlandı",
    yon: "FAZLADAN",
    dosya: "src/lib/komisyon/yukle.ts",
    bul: "    sayfalar = (await tabloOku(dosya)).sayfalar;",
    koy: "    sayfalar = (await readXlsxFile(dosya)) as unknown as SayfaGirdisi[];",
    bozdugu:
      "bir yukleme yolu kapiyi atlar ve eski bicimi yine acamaz; arizanin aynisi ALTINCI bir kapida sessizce dogar",
  },
  {
    ad: "TABAN BOŞALDI — tarama hiçbir dosya bulmuyor",
    yon: "KALDIRAN",
    dosya: "scripts/tablo-oku-dogrula.ts",
    bul: '    const dosyalar = tsDosyalari("src");',
    koy: "    const dosyalar: string[] = [];",
    bozdugu:
      "bos kume her kosulu saglar: 'ihlal yok' sonsuza kadar DOGRU olur ve desen yasagi kendi kendini kandirir",
  },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, {
    shell: true,
    encoding: "utf8",
    maxBuffer: 40 * 1024 * 1024,
  });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("");
console.log("TABLO OKUMA KAPISI — K226 MUTASYON TURU");
console.log("");

let yakalanan = 0;
const kacan: string[] = [];
const bozuk: string[] = [];

for (const m of MUTASYONLAR) {
  const asil = readFileSync(m.dosya, "utf8");
  const bul = desenNormalle(asil, m.bul);
  const koy = desenNormalle(asil, m.koy);

  const adet = asil.split(bul).length - 1;
  if (adet !== 1) {
    bozuk.push(
      `${m.ad}\n       desen ${m.dosya} içinde ${adet} kez geçiyor (1 olmalı)`,
    );
    continue;
  }

  const mutant = asil.replace(bul, koy);
  let sonuc: { kod: number; ciktiVar: boolean };
  try {
    dayanikliYaz(m.dosya, mutant);
    /**
     * ⚠ MUTASYONUN UYGULANDIĞI DOĞRULANIYOR. Desen tutmadan koşan bir
     * harness, hiçbir şeyi ölçmeden "yeşil" raporlar.
     */
    const diskten = readFileSync(m.dosya, "utf8");
    if (diskten !== mutant || mutant === asil) {
      bozuk.push(`${m.ad}\n       mutasyon diske UYGULANMADI`);
      continue;
    }
    sonuc = bekciyiKostur();
  } finally {
    /**
     * ⛔ GERİ ALMA `git checkout` İLE YAPILMAZ: bu dosya commit edilmemiş
     * olabilir ve checkout bütün çalışmayı silerdi (anayasa, 02.09 vakası).
     * Asıl içerik bellekte tutulup geri YAZILIYOR.
     */
    dayanikliYaz(m.dosya, asil);
    if (readFileSync(m.dosya, "utf8") !== asil) {
      bozuk.push(`${m.ad}\n       ⛔ GERİ ALMA BAŞARISIZ — dosya mutasyonlu kaldı`);
    }
  }

  const isaret =
    m.yon === "ZARARSIZ" ? "○" : m.yon === "KALDIRAN" ? "-" : "+";

  if (m.yon === "ZARARSIZ") {
    /** Zararsız mutasyon YEŞİL kalmalı; kırmızı yanarsa bekçi gürültü üretiyor. */
    if (sonuc.kod === 0 && sonuc.ciktiVar) {
      yakalanan++;
      console.log(`  OK  ${isaret} ${m.ad}`);
    } else if (!sonuc.ciktiVar) {
      bozuk.push(`${m.ad}\n       bekçi ÇÖKTÜ (başlık basılmadı) — ölçüm geçersiz`);
    } else {
      kacan.push(
        `${m.ad}\n       YALANCI KIRMIZI: zararsız değişiklik bekçiyi kırmızı yaktı`,
      );
    }
    continue;
  }

  if (sonuc.kod !== 0 && sonuc.ciktiVar) {
    yakalanan++;
    console.log(`  OK  ${isaret} ${m.ad}`);
  } else if (sonuc.kod !== 0) {
    bozuk.push(`${m.ad}\n       bekçi ÇÖKTÜ (başlık basılmadı) — ölçüm geçersiz`);
  } else {
    kacan.push(`${m.ad}\n       KORUMASIZ: ${m.bozdugu}`);
  }
}

console.log("");
if (kacan.length) {
  console.log("  KAÇAN MUTASYONLAR — bekçi bunları GÖRMEDİ:\n");
  for (const k of kacan) console.log("  X  " + k);
  console.log("");
}
if (bozuk.length) {
  console.log("  HARNESS HATASI — mutasyon ölçülemedi:\n");
  for (const b of bozuk) console.log("  !! " + b);
  console.log("");
}

const toplam = MUTASYONLAR.length;
const zararsiz = MUTASYONLAR.filter((m) => m.yon === "ZARARSIZ").length;
const kaldiran = MUTASYONLAR.filter((m) => m.yon === "KALDIRAN").length;
console.log(
  `  ${yakalanan}/${toplam} mutasyon beklendiği gibi davrandı` +
    `   (○ zararsız ${zararsiz} · - kaldıran ${kaldiran} · + fazladan ${toplam - zararsiz - kaldiran})`,
);
if (kacan.length || bozuk.length) {
  console.log("\n  Kaçan ya da ölçülemeyen mutasyon var — bekçi eksik.\n");
  process.exitCode = 1;
} else {
  console.log(
    "\n  OK  Okuma kapısı ÜÇ YÖNDEN sınandı; kırmızı yandığı GÖRÜLDÜ.\n",
  );
}
