import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

/**
 * ============================================================================
 *  LOT KİPİ — MUTASYON HARNESS'İ (K115)
 * ----------------------------------------------------------------------------
 *      npm run lot-kipi-mutasyon:kontrol
 *
 *  ⛔ NİYE: bu gövde satış formundaki bir kutunun çıkıp çıkmayacağına karar
 *  veriyor ve iki yönde de sessizce bozulabilir:
 *    − çıkmazsa   → operatör bilerek parti seçemez, kimse fark etmez
 *    + fazla çıkarsa → her satışta anlamsız karar, kutu görmezden gelinir
 * ============================================================================
 */

const BEKCI = "scripts/lot-kipi-dogrula.ts";
const BEKCI_BASLIGI = "LOT KİPİ BEKÇİSİ";
const GOVDE = "src/lib/lot-kipi.ts";

type Mutasyon = {
  ad: string;
  yon: "KALDIRAN" | "FAZLADAN";
  bul: string;
  koy: string;
  bozdugu: string;
};

const MUTASYONLAR: Mutasyon[] = [
  {
    ad: "VARSAYILAN FIFO OLDU — K110 seçicisi sessizce kaybolur",
    yon: "KALDIRAN",
    bul: 'export const VARSAYILAN_LOT_KIPI: LotKipi = "HIBRIT";',
    koy: 'export const VARSAYILAN_LOT_KIPI: LotKipi = "FIFO";',
    bozdugu:
      "sutun eklendigi anda secici HIC cikmaz; bugunku davranis sessizce degisir",
  },
  {
    ad: "FIFO KİPİNDE DE SEÇİCİ ÇIKIYOR",
    yon: "FAZLADAN",
    bul: '  if (g.kip === "FIFO") return false;',
    koy: "",
    bozdugu:
      "'sistem secsin' diyen firmada da kutu cikar; ayar hicbir sey yapmiyor gibi gorunur",
  },
  {
    ad: "ÖLÇÜT MALİYETE DEĞİL PARTİ SAYISINA DÖNDÜ",
    yon: "FAZLADAN",
    bul: "  if (g.maliyetler.some((m) => m === null)) return true;",
    koy: "  return true;",
    bozdugu:
      "ayni fiyatli partilerde de kutu cikar — 102 varyantin 61'inde anlamsiz karar (gurultunun %60'i)",
  },
  {
    ad: "BİLİNMEYEN MALİYET 'AYNI' SAYILIYOR",
    yon: "KALDIRAN",
    bul: "  if (g.maliyetler.some((m) => m === null)) return true;",
    koy: "",
    bozdugu:
      "maliyeti bilinmeyen parti gizlenir; operator gercek bir secimi goremez",
  },
  {
    ad: "KURUŞ TOLERANSI KALKTI — kuyruk sahte fark üretiyor",
    yon: "FAZLADAN",
    bul: "  return max - min > 0.005;",
    koy: "  return max - min > 0;",
    bozdugu:
      "Decimal→float kuyrugu yuzunden ayni maliyetli partilerde de kutu cikar",
  },
  {
    ad: "TEK PARTİDE DE SEÇİCİ ÇIKIYOR",
    yon: "FAZLADAN",
    bul: "  if (g.maliyetler.length < 2) return false;",
    koy: "",
    bozdugu:
      "secilecek tek parti varken kutu cizilir; her satisa anlamsiz bir adim eklenir",
  },
  {
    ad: "LOT KİPİ TEK PARTİDE DE ZORLUYOR",
    yon: "FAZLADAN",
    bul: '  return g.kip === "LOT" && g.partiSayisi > 1;',
    koy: '  return g.kip === "LOT";',
    bozdugu:
      "secilecek sey yokken onay istenir; zorunluluk ucuzlar ve operator kutuya bakmadan tiklar",
  },
  {
    ad: "ZORUNLULUK HİÇ ÇALIŞMIYOR",
    yon: "KALDIRAN",
    bul: '  return g.kip === "LOT" && g.partiSayisi > 1;',
    koy: "  return false;",
    bozdugu:
      "LOT kipi HIBRIT gibi davranir; 'her satista ben secerim' ayari hicbir sey yapmaz",
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
console.log("LOT KİPİ — MUTASYON TURU");
console.log("");

let yakalanan = 0;
const kacan: string[] = [];
const bozuk: string[] = [];

for (const m of MUTASYONLAR) {
  const asil = readFileSync(GOVDE, "utf8");
  const bul = desenNormalle(asil, m.bul);
  const koy = desenNormalle(asil, m.koy);

  const adet = asil.split(bul).length - 1;
  if (adet !== 1) {
    bozuk.push(m.ad + "\n       desen " + adet + " kez geçiyor (1 olmalı)");
    continue;
  }

  const mutant = asil.replace(bul, koy);
  let sonuc: { kod: number; ciktiVar: boolean };
  try {
    writeFileSync(GOVDE, mutant, "utf8");
    if (readFileSync(GOVDE, "utf8") !== mutant || mutant === asil) {
      bozuk.push(m.ad + "\n       mutasyon diske UYGULANMADI");
      continue;
    }
    sonuc = bekciyiKostur();
  } finally {
    writeFileSync(GOVDE, asil, "utf8");
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
  console.log("  OK  lot kipi İKİ YÖNDEN de sınandı ve kırmızı yandığı GÖRÜLDÜ\n");
}
