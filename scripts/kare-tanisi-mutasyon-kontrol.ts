import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

/**
 * ============================================================================
 *  KARE TEŞHİSİ — MUTASYON HARNESS'İ (K113)
 * ----------------------------------------------------------------------------
 *      npm run kare-tanisi-mutasyon:kontrol
 *
 *  ⛔ NİYE: bu paket bir ÖZELLİK değil bir ÖLÇÜM YOLU. Sessizce bozulursa
 *  kimse fark etmez — kamera yine çalışır, yalnız "niye okumuyor" sorusu
 *  yine cevapsız kalır ve tahminle geçen 40 dakika tekrarlanır.
 *
 *  ⭐ EN KRİTİK SENARYO: `getSettings()`in çözüm döngüsüne KAYMASI. Teşhis
 *  aracı 250 ms'de bir ölçüm yaparsa, ölçtüğü şeyi etkiler.
 * ============================================================================
 */

const BEKCI = "scripts/kare-tanisi-dogrula.ts";
const BEKCI_BASLIGI = "KARE TEŞHİSİ BEKÇİSİ";

const OKUYUCU = "src/components/barkod-okuyucu.tsx";
const ARAC = "scripts/kare-cozum-testi.ts";
const SOZLUK = "messages/tr.json";

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
    ad: "getSettings() ÇÖZÜM DÖNGÜSÜNE KAYDI — 250 ms'de bir ölçüm",
    yon: "FAZLADAN",
    dosya: OKUYUCU,
    bul: "        okumaSuruyor = true;",
    koy: "        okumaSuruyor = true;\n        stream?.getVideoTracks()[0]?.getSettings();",
    bozdugu:
      "teshis araci teshis ettigi seyi ETKILER; olcum kendi gurultusunu olcmeye baslar",
  },
  {
    ad: "TEŞHİS SATIRI HİÇ ÇİZİLMİYOR",
    yon: "KALDIRAN",
    dosya: OKUYUCU,
    bul: "        {tani ? (\n          <p className=\"text-muted-foreground font-mono text-[11px]\">{tani}</p>\n        ) : null}",
    koy: "",
    bozdugu:
      "cozunurluk ve odak yine gorunmez olur; 'ideal 1920 istendi ama 640 verildi' hali sessiz kalir",
  },
  {
    ad: "OKUNAMAYAN TEŞHİS SESSİZ DÜŞÜYOR",
    yon: "KALDIRAN",
    dosya: OKUYUCU,
    bul: '        setTani(t("taniOkunamadi"));',
    koy: "",
    bozdugu:
      "olcum basarisiz olunca satir hic cizilmez ve 'olcemedim' ile 'sorun yok' ayni gorunur",
  },
  {
    ad: "ODAK DESTEKLENMİYORKEN BOŞ BIRAKIYOR",
    yon: "KALDIRAN",
    dosya: OKUYUCU,
    bul: '            odak: a?.focusMode ?? t("odakYok"),',
    koy: "            odak: a?.focusMode ?? \"\",",
    bozdugu:
      "odak kisiti sessizce dustuyse satir bos gorunur; okuyan 'odak var' saniir",
  },
  {
    ad: "KARE KAYDETME PAYLAŞILAN CANVAS'A ÇİZİYOR",
    yon: "FAZLADAN",
    dosya: OKUYUCU,
    bul: '    const tuval = document.createElement("canvas");',
    koy: "    const tuval = canvasRef.current!;",
    bozdugu:
      "tarama dongusu ayni canvas'i 250 ms'de bir kullaniyor; araya girmek OKUMAYI bozar",
  },
  {
    ad: "KARE JPEG OLARAK VERİLİYOR (yeniden sıkıştırma)",
    yon: "FAZLADAN",
    dosya: OKUYUCU,
    bul: '    }, "image/png");',
    koy: '    }, "image/jpeg");',
    bozdugu:
      "sikistirma barkodu bozar; masaustunde cozulemeyince sebep karisir — kamera mi kotu, kayit mi bozdu",
  },
  {
    ad: "MASAÜSTÜ ARACI KENDİ BİÇİM LİSTESİNİ YAZIYOR",
    yon: "FAZLADAN",
    dosya: ARAC,
    bul: "  formats: [...DESTEKLENEN_FORMATLAR],",
    koy: '  formats: ["EAN13", "Code128"] as never,',
    bozdugu:
      "arac uygulamadan BASKA bir cozucuyu olcer; 'masaustunde cozuluyor' sonucu anlamsizlasir",
  },
  {
    ad: "DOSYA YOK İLE ÇÖZÜLEMEDİ KARIŞTIRILIYOR",
    yon: "KALDIRAN",
    dosya: ARAC,
    bul: '    console.log("⛔ DOSYA YOK:", yol);',
    koy: '    console.log("HİÇBİR KOD BULUNAMADI");',
    bozdugu:
      "okunamayan dosya 'kare yetersiz' saniir ve yanlis yone gonderir",
  },
  {
    ad: "TEŞHİS METNİ ÇİZİLEN KAREYİ TAŞIMIYOR",
    yon: "KALDIRAN",
    dosya: SOZLUK,
    bul: '"tani": "kamera {genislik}×{yukseklik} @{kare_hizi} · odak: {odak} · kare {kare}"',
    koy: '"tani": "kamera {genislik}×{yukseklik} @{kare_hizi} · odak: {odak}"',
    bozdugu:
      "track'in BEYANI ile cizilen KARE ayrisirsa gorunmez; en cok bilgi tasiyan fark kaybolur",
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

function desenNormalle(kaynak: string, desen: string): string {
  return kaynak.includes("\r\n") ? desen.split("\n").join("\r\n") : desen;
}

console.log("");
console.log("KARE TEŞHİSİ — K113 MUTASYON TURU");
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
      m.ad + "\n       desen " + m.dosya + " içinde " + adet + " kez geçiyor (1 olmalı)",
    );
    continue;
  }

  const mutant = asil.replace(bul, koy);
  let sonuc: { kod: number; ciktiVar: boolean };
  try {
    writeFileSync(m.dosya, mutant, "utf8");
    if (readFileSync(m.dosya, "utf8") !== mutant || mutant === asil) {
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
  console.log("  HARNESS HATASI:\n");
  for (const b of bozuk) console.log("  !! " + b);
  console.log("");
}

const toplam = MUTASYONLAR.length;
const kaldiran = MUTASYONLAR.filter((m) => m.yon === "KALDIRAN").length;
console.log(
  "  " + yakalanan + "/" + toplam + " mutasyon yakalandı" +
    "   (- kaldıran " + kaldiran + " · + fazladan " + (toplam - kaldiran) + ")",
);
if (kacan.length || bozuk.length) {
  console.log("\n  Kaçan ya da ölçülemeyen mutasyon var — bekçi eksik.\n");
  process.exitCode = 1;
} else {
  console.log("  OK  K113 İKİ YÖNDEN de sınandı ve kırmızı yandığı GÖRÜLDÜ\n");
}
