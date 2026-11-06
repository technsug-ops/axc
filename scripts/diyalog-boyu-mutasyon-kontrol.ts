import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  DİYALOG BOYU — MUTASYON HARNESS'İ (K371, 06.11.2026)
 * ----------------------------------------------------------------------------
 *      npm run diyalog-boyu-mutasyon:kontrol
 *
 *  ⛔ NİYE ZORUNLU: bu paketin bozulma biçimi SESSİZDİR. Sınır düşerse ekran
 *  aynen çizilir, hiçbir hata çıkmaz, `tsc` ve `lint` yeşil yanar — yalnız
 *  uzun bir diyalogda ONAYLA düğmesi ekranın dışında kalır ve operatör
 *  siparişi onaylayamaz. Canlıda tam bu yaşandı (kullanıcı, 06.11.2026).
 *
 *  ⚠ İKİ YÖN AYRI SINANIR (anayasa):
 *    − KALDIRAN : sınır/kaydırma düşer → düğmeye ulaşılamaz
 *    + FAZLADAN : tüketici kendi sınırını koyar → iki yerde iki ölçüt olur,
 *                 biri ötekini sessizce geçersizleştirir
 *
 *  Üç kapı (öteki harness'lerle aynı gövde):
 *    1) desen kaynakta TAM BİR KEZ geçmeli
 *    2) mutasyon diskten okunarak UYGULANDIĞI doğrulanır
 *    3) hüküm ÇIKIŞ KODUNDAN — bekçinin başlığı yoksa "ÇÖKTÜ"
 * ============================================================================
 */

const BEKCI = "scripts/diyalog-boyu-dogrula.ts";
/** Bekçi GERÇEKTEN koştu mu — açılış satırı. */
const BEKCI_BASLIGI = "DİYALOG BOYU BEKÇİSİ";

const UYARI = "src/components/ui/alert-dialog.tsx";
const DIYALOG = "src/components/ui/dialog.tsx";
const ONAY = "src/app/satislar/siparis-onayi.tsx";
const TUKETICI = "src/app/rapor/buybox/fiyat-penceresi.tsx";
const ISTISNA = "src/components/aranabilir-secim.tsx";

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
    ad: "UYARI DİYALOĞUNUN YÜKSEKLİK SINIRI KALKTI",
    yon: "KALDIRAN",
    dosya: UYARI,
    bul: "z-50 grid max-h-[calc(100%-2rem)] w-full -translate-x-1/2",
    koy: "z-50 grid w-full -translate-x-1/2",
    bozdugu:
      "uzun onay diyalogu ekrani iki uctan asar; ONAYLA ekran disinda kalir ve siparis onaylanamaz",
  },
  {
    ad: "UYARI DİYALOĞUNUN İÇ KAYDIRMASI KALKTI",
    yon: "KALDIRAN",
    dosya: UYARI,
    bul: "-translate-y-1/2 gap-4 overflow-y-auto rounded-xl",
    koy: "-translate-y-1/2 gap-4 rounded-xl",
    bozdugu:
      "sinir var ama tasan icerik kirpilir — alttaki dugmelere KAYDIRARAK da ulasilamaz",
  },
  {
    /**
     * Sınır `vh` ile kurulursa ortalama (`top-1/2`, ilk içeren blok) ile sınır
     * AYRI referanstan okunur ve telefonda tarayıcı çubuğu açılıp kapandıkça
     * ikisi ayrışır. Değer testi bunu göremez; ölçüt kaynağa bağlı.
     */
    ad: "SINIR YÜZDEDEN vh'YE ÇEVRİLDİ (ikinci referans açıldı)",
    yon: "FAZLADAN",
    dosya: UYARI,
    bul: "max-h-[calc(100%-2rem)]",
    koy: "max-h-[85vh]",
    bozdugu:
      "ortalama ile sinir farkli kaplari olcer; telefonda tarayici cubugu degisince kutu kayar",
  },
  {
    ad: "DIALOG BİLEŞENİNİN YÜKSEKLİK SINIRI KALKTI",
    yon: "KALDIRAN",
    dosya: DIYALOG,
    bul: "z-50 grid max-h-[calc(100%-2rem)] w-full max-w-[calc(100%-2rem)]",
    koy: "z-50 grid w-full max-w-[calc(100%-2rem)]",
    bozdugu:
      "ayni kusur 14 Dialog kullaniminda birden acilir — uzun formlarda kaydet dugmesi ekran disinda kalir",
  },
  {
    ad: "PARTİ LİSTESİNİN KENDİ SINIRI KALKTI",
    yon: "KALDIRAN",
    dosya: ONAY,
    bul: 'className="max-h-64 space-y-1 overflow-y-auto"',
    koy: 'className="space-y-1"',
    bozdugu:
      "liste butun diyalogu uzatir; TOPLAM ve ONAYLA acilista gorunmez, operator once kaydirmak zorunda kalir",
  },
  {
    ad: "TÜKETİCİ KENDİ SINIRINI KOYDU (beyansız)",
    yon: "FAZLADAN",
    dosya: TUKETICI,
    bul: '<DialogContent className="sm:max-w-xl">',
    koy: '<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">',
    bozdugu:
      "ayni soruya iki yerde iki olcut; ekran ortak bilesenin sinirini sessizce ezer ve ikisi ayrisir",
  },
  {
    /**
     * Muafiyet bedava olmaz: beyan VAR ama gerekçe YOK. Bekçi bunu da kırmızı
     * yakmalı, yoksa "beyan" bir törene döner ve her ekran kendi sınırını
     * tek satırlık bir etiketle meşrulaştırır.
     */
    ad: "İSTİSNA BEYANI GEREKÇESİZ BIRAKILDI",
    yon: "FAZLADAN",
    dosya: ISTISNA,
    bul: "DIYALOG SINIRI ISTISNA: kaydirma IC LISTEDE (max-h-[50vh]),",
    koy: "DIYALOG SINIRI ISTISNA:",
    bozdugu:
      "gerekcesiz muafiyet gecerse beyan bir torene doner; alti ay sonra bakan biri niye istisna oldugunu bulamaz",
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
console.log("DİYALOG BOYU — K371 MUTASYON TURU");
console.log("");

let yakalanan = 0;
const kacan: string[] = [];
const bozuk: string[] = [];

/**
 * ⭐ ZARARSIZ SAĞLAMA ÖNCE KOŞAR (anayasa: "her harness İKİ YÖNDE sağlama
 * ister"). Hiçbir şey koşturmayan ya da her mutasyonu kırmızı raporlayan bir
 * harness, yalnız gerçek bozmalar denenirse MÜKEMMEL görünür.
 */
{
  const asil = readFileSync(UYARI, "utf8");
  const bul = desenNormalle(asil, "function AlertDialogContent({");
  const mutant = asil.replace(bul, desenNormalle(asil, "/* zararsiz */\nfunction AlertDialogContent({"));
  let s: { kod: number; ciktiVar: boolean };
  try {
    dayanikliYaz(UYARI, mutant);
    s = bekciyiKostur();
  } finally {
    dayanikliYaz(UYARI, asil);
  }
  if (s.kod === 0 && s.ciktiVar) {
    console.log("  OK  = ZARARSIZ mutasyon (yorum) YEŞİL kaldı — harness ölçüyor");
  } else {
    bozuk.push(
      "ZARARSIZ SAĞLAMA DÜŞTÜ — harness her şeyi kırmızı yakıyor, sonuçlar GEÇERSİZ",
    );
  }
}

for (const m of MUTASYONLAR) {
  const asil = readFileSync(m.dosya, "utf8");
  const bul = desenNormalle(asil, m.bul);
  const koy = desenNormalle(asil, m.koy);

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
    dayanikliYaz(m.dosya, mutant);
    const diskten = readFileSync(m.dosya, "utf8");
    if (diskten !== mutant || mutant === asil) {
      bozuk.push(m.ad + "\n       mutasyon diske UYGULANMADI");
      continue;
    }
    sonuc = bekciyiKostur();
  } finally {
    dayanikliYaz(m.dosya, asil);
  }

  const isaret = m.yon === "KALDIRAN" ? "-" : "+";
  if (sonuc.kod !== 0 && sonuc.ciktiVar) {
    yakalanan++;
    console.log("  OK  " + isaret + " " + m.ad);
  } else if (sonuc.kod !== 0) {
    bozuk.push(m.ad + "\n       bekçi ÇÖKTÜ (başlık basılmadı) — ölçüm geçersiz");
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
    "  OK  K371 diyalog boyu İKİ YÖNDEN de sınandı ve kırmızı yandığı GÖRÜLDÜ\n",
  );
}
