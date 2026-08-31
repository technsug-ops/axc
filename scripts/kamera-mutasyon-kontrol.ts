import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

/**
 * ============================================================================
 *  BARKOD BİÇİM KAPSAMI — MUTASYON HARNESS'İ (K111, 31.08.2026)
 * ----------------------------------------------------------------------------
 *      npm run kamera-mutasyon:kontrol
 *
 *  ⚠ KAPSAM BEYAN EDİLİYOR: bu harness `kamera:dogrula`nın 47 ölçütünün
 *  TAMAMINI değil, **K111 biçim kapsamını** sınıyor. Gerisi ayrı bir iştir.
 *
 *  ⛔ NİYE ZORUNLU — BU YARA İKİ KEZ AÇILDI VE İKİSİNDE DE SESSİZ KALDI:
 *    ① 25.08 `ITF` eksikti  → hepsiJET kargo etiketi okunmadı
 *    ② 31.08 `UPCA` eksikti → kataloğun %9,2'si (104 varyant) okunamadı
 *  Okuyucu tanımadığı sembolojiyi HATA VERMEDEN geçiyor; kullanıcı kamerayı
 *  açıyor, bekliyor, hiçbir şey olmuyor ve sistemin bozuk olduğunu sanıyor.
 *  Tam da mutasyonsuz bir bekçinin körleşeceği yer.
 *
 *  ⚠ İKİ YÖN AYRI SINANIR:
 *    − KALDIRAN : biçim listeden düşer → okunmaz olur, kimse fark etmez
 *    + FAZLADAN : ek kod biçimi açılır → "12" gibi çöp okuma asıl barkodun
 *                 önüne geçer (`maxNumberOfSymbols: 4` ile taranıyor)
 * ============================================================================
 */

const BEKCI = "scripts/kamera-dogrula.ts";
/** Bekçi GERÇEKTEN koştu mu — açılış satırı. */
const BEKCI_BASLIGI = "KAMERA HER KOD ALANINDA";

const LISTE = "src/lib/barkod-formatlari.ts";

type Mutasyon = {
  ad: string;
  yon: "KALDIRAN" | "FAZLADAN";
  dosya: string;
  bul: string;
  koy: string;
  bozdugu: string;
};

const MUTASYONLAR: Mutasyon[] = [
  {
    ad: "UPC-A LİSTEDEN DÜŞTÜ — 31.08 vakasının kendisi",
    yon: "KALDIRAN",
    dosya: LISTE,
    bul: '  "UPCA",\n',
    koy: "",
    bozdugu:
      "12 haneli barkodlar (104 varyant, kataloğun %9,2'si) kamerayla OKUNMAZ olur ve hata da vermez",
  },
  {
    ad: "UPC-E LİSTEDEN DÜŞTÜ",
    yon: "KALDIRAN",
    dosya: LISTE,
    bul: '  "UPCE",\n',
    koy: "",
    bozdugu:
      "sikistirilmis UPC etiketleri sessizce okunmaz; ekranda 'bulunamadi' bile cikmaz",
  },
  {
    ad: "EAN-13 LİSTEDEN DÜŞTÜ (925 varyant)",
    yon: "KALDIRAN",
    dosya: LISTE,
    bul: '  "EAN13",\n',
    koy: "",
    bozdugu: "kataloğun buyuk cogunlugu okunmaz olur",
  },
  {
    ad: "KARGO AİLESİ BİRLEŞİK LİSTEYE KATILMIYOR — 25.08 vakası",
    yon: "KALDIRAN",
    dosya: LISTE,
    bul: "  ...KARGO_FORMATLARI,\n",
    koy: "",
    bozdugu:
      "ITF/Code39 taranmaz; hepsiJET etiketi yine okunmaz — zincir kopar ama iki liste de dosyada DURUR",
  },
  {
    ad: "MUAFİYET BEYANI SİLİNDİ (EAN2 artık beyansız)",
    yon: "KALDIRAN",
    dosya: LISTE,
    bul: '  EAN2: "iki haneli EK KOD — tek başına okunursa \'12\' gibi çöp değer döner",\n',
    koy: "",
    bozdugu:
      "perakende kataloğunda beyansiz bir bicim kalir; liste yeniden 'elle tutulan' hale doner",
  },
  {
    ad: "MUAFİYET GEREKÇESİZ BIRAKILDI",
    yon: "KALDIRAN",
    dosya: LISTE,
    bul: '  ISBN: "EAN-13 olarak zaten çözülüyor (978/979 öneki); ayrı biçim gereksiz",',
    koy: '  ISBN: "",',
    bozdugu:
      "gerekcesiz muafiyet gecerli sayilir; alti ay sonra 'bu niye disarida' sorusunun cevabi kalmaz",
  },
  {
    ad: "EK KOD BİÇİMİ AÇILDI (EAN5 ürün listesine girdi)",
    yon: "FAZLADAN",
    dosya: LISTE,
    bul: '  "Code128",\n  "QRCode",\n] as const;\n\n/** Kargo',
    koy: '  "Code128",\n  "QRCode",\n  "EAN5",\n] as const;\n\n/** Kargo',
    bozdugu:
      "bes haneli fiyat eki tek basina okunur ve 'cizgili kod oncelikli' secimde ASIL barkodun onune gecebilir",
  },
  {
    ad: "ÖLÇÜT KÖRLEŞTİRİLDİ — boşluk her zaman BOŞ dönüyor",
    yon: "FAZLADAN",
    dosya: LISTE,
    bul: "  const acik = new Set<string>(URUN_FORMATLARI);",
    koy: "  const acik = new Set<string>(katalog);",
    bozdugu:
      "govde her bicimi 'acik' sayar; beyansiz eksik HIC bulunamaz ve olcut sonsuza kadar yesil yanar",
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

/** Satır sonlarını hedef dosyanın biçimine uydurur (depoda CRLF de var). */
function desenNormalle(kaynak: string, desen: string): string {
  return kaynak.includes("\r\n") ? desen.split("\n").join("\r\n") : desen;
}

console.log("");
console.log("BARKOD BİÇİM KAPSAMI — K111 MUTASYON TURU");
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
      m.ad +
        "\n       desen " +
        m.dosya +
        " içinde " +
        adet +
        " kez geçiyor (1 olmalı)",
    );
    continue;
  }

  const mutant = asil.replace(bul, koy);
  let sonuc: { kod: number; ciktiVar: boolean };
  try {
    writeFileSync(m.dosya, mutant, "utf8");
    const diskten = readFileSync(m.dosya, "utf8");
    if (diskten !== mutant || mutant === asil) {
      bozuk.push(m.ad + "\n       mutasyon diske UYGULANMADI");
      continue;
    }
    sonuc = bekciyiKostur();
  } finally {
    writeFileSync(m.dosya, asil, "utf8");
  }

  const isaret = m.yon === "KALDIRAN" ? "-" : "+";
  if (sonuc.kod !== 0 && sonuc.ciktiVar) {
    yakalanan++;
    console.log("  OK  " + isaret + " " + m.ad);
  } else if (sonuc.kod !== 0) {
    bozuk.push(
      m.ad + "\n       bekçi ÇÖKTÜ (başlık basılmadı) — ölçüm geçersiz",
    );
  } else {
    kacan.push(m.ad + "\n       KORUMASIZ: " + m.bozdugu);
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
const kaldiran = MUTASYONLAR.filter((m) => m.yon === "KALDIRAN").length;
console.log(
  "  " +
    yakalanan +
    "/" +
    toplam +
    " mutasyon yakalandı" +
    "   (- kaldıran " +
    kaldiran +
    " · + fazladan " +
    (toplam - kaldiran) +
    ")",
);
if (kacan.length || bozuk.length) {
  console.log("\n  Kaçan ya da ölçülemeyen mutasyon var — bekçi eksik.\n");
  process.exitCode = 1;
} else {
  console.log(
    "  OK  K111 biçim kapsamı İKİ YÖNDEN de sınandı ve kırmızı yandığı GÖRÜLDÜ\n",
  );
}
