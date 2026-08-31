import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

/**
 * ============================================================================
 *  PARTİ BAĞI TANISI — MUTASYON HARNESS'İ (K91)
 * ----------------------------------------------------------------------------
 *      npm run parti-bagi-tanisi-mutasyon:kontrol
 *
 *  ⛔ NİYE: bu gövde ekranda bir UYARI çiziyor ve yanlış tanı İKİ YÖNDE de
 *  pahalı — susarsa kullanıcı şüpheli rakama güvenir, fazla konuşursa uyarı
 *  gürültüye döner ve rozetin tamamına olan güven gider.
 * ============================================================================
 */

const BEKCI = "scripts/parti-bagi-tanisi-dogrula.ts";
const BEKCI_BASLIGI = "PARTİ BAĞI TANISI BEKÇİSİ";
const GOVDE = "src/lib/parti-bagi-tanisi.ts";

type Mutasyon = {
  ad: string;
  yon: "KALDIRAN" | "FAZLADAN";
  bul: string;
  koy: string;
  bozdugu: string;
};

const MUTASYONLAR: Mutasyon[] = [
  {
    ad: "HER DEFTERE TEMİZ DİYOR — uyarı hiç çıkmaz",
    yon: "KALDIRAN",
    bul: '      if (aday === 0) return "SUPHELI";\n      if (aday > 1) kaymis = true;',
    koy: "",
    bozdugu:
      "supheli defter TEMIZ gorunur; kullanici bozuk kalan adede guvenir",
  },
  {
    ad: "HER DEFTERE ŞÜPHELİ DİYOR — uyarı gürültüye döner",
    yon: "FAZLADAN",
    bul: '      if (aday === 0) return "SUPHELI";',
    koy: '      if (aday >= 0) return "SUPHELI";',
    bozdugu:
      "temiz urunlerde de uyari cikar; her zaman yanan uyari okunmaz olur",
  },
  {
    ad: "TÜKENMİŞ PARTİ ADAY SAYILIYOR",
    yon: "FAZLADAN",
    bul: "        if (k > 0 && maliyet.get(pid) === damga) aday += 1;",
    koy: "        if (maliyet.get(pid) === damga) aday += 1;",
    bozdugu:
      "'tarihi once' ile 'o an acikti' karisir; tukenmis partiye baglanan cikis TEMIZ gorunur",
  },
  {
    ad: "MALİYET EŞLEŞMESİ KALKTI — her parti aday",
    yon: "FAZLADAN",
    bul: "        if (k > 0 && maliyet.get(pid) === damga) aday += 1;",
    koy: "        if (k > 0) aday += 1;",
    bozdugu:
      "damga olcutu duser; cok partili her urun KAYMIS saniir ve uyari anlamsizlasir",
  },
  {
    ad: "KAYMIŞ BAYRAĞI SÖNÜK",
    yon: "KALDIRAN",
    bul: "      if (aday > 1) kaymis = true;",
    koy: "",
    bozdugu:
      "belirsiz baglar TEMIZ raporlanir; 56 varyantta uyari hic cikmaz",
  },
  {
    ad: "KURUŞA YUVARLAMA KALKTI",
    yon: "KALDIRAN",
    bul: "  return Number.isFinite(n) ? n.toFixed(2) : null;",
    koy: "  return Number.isFinite(n) ? String(n) : null;",
    bozdugu:
      "Decimal→float kuyrugu sahte fark uretir; ayni maliyetli partiler eslesmez ve her sey SUPHELI olur",
  },
  {
    ad: "İMZA AYNI GÜNÜ DE SAYIYOR",
    yon: "FAZLADAN",
    bul: "    if (p !== undefined && p > h.occurredAt) return true;",
    koy: "    if (p !== undefined && p >= h.occurredAt) return true;",
    bozdugu:
      "cikislarin %48,72'si partisiyle AYNI ani tasiyor; hepsi kusurlu isaretlenir",
  },
  {
    ad: "SIRALAMA İŞ TARİHİNİ BIRAKTI",
    yon: "FAZLADAN",
    bul: "      a.occurredAt.getTime() - b.occurredAt.getTime() ||\n      a.createdAt.getTime() - b.createdAt.getTime(),",
    koy: "      a.createdAt.getTime() - b.createdAt.getTime(),",
    bozdugu:
      "gecmise donuk girilen alim yanlis sirada oynatilir; 'o an acikti' gorusu bozulur",
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
console.log("PARTİ BAĞI TANISI — MUTASYON TURU");
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
  console.log("  OK  tanı gövdesi İKİ YÖNDEN de sınandı ve kırmızı yandığı GÖRÜLDÜ\n");
}
