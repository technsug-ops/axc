import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

/**
 * ============================================================================
 *  PANEL — MUTASYON HARNESS'İ (K106 kanal sırası)
 * ----------------------------------------------------------------------------
 *      npm run panel-mutasyon:kontrol
 *
 *  ⚠ KAPSAM BEYAN EDİLİYOR: bu harness `panel:dogrula`nın 604 ölçütünün
 *  TAMAMINI değil, **K106 kanal sırasını** sınıyor. Gerisi ayrı bir iştir ve
 *  bugün açılmadı — "her şey sınandı" diye bir iddia YOK.
 *
 *  ⛔ NİYE BU: sıralama bir GÖRÜNÜM kuralı ve sessizce eski hâline dönerse
 *  kimse fark etmez — ekran çalışmaya devam eder, yalnız kartlar oynar.
 *  Tam da mutasyonsuz bir bekçinin körleşeceği yer.
 *
 *  Üç kapı (öteki harness'lerle aynı gövde):
 *    ① desen kaynakta TAM BİR KEZ geçmeli
 *    ② mutasyon diskten okunarak UYGULANDIĞI doğrulanır
 *    ③ hüküm ÇIKIŞ KODUNDAN — bekçinin başlığı yoksa "ÇÖKTÜ"
 * ============================================================================
 */

const BEKCI = "scripts/panel-dogrula.ts";
/**
 * ⚠ ÇAPA BEKÇİNİN AÇILIŞ SATIRI — K106 bölümününki DEĞİL. Kapının işi
 * "bekçi gerçekten KOŞTU mu" sorusunu cevaplamak; koşum ortasında mutasyon
 * yüzünden çıkan bir çökme ZATEN kırmızıdır ve geçerli bir yakalamadır.
 * _(Aynı düzeltme `simulasyon-mutasyon-kontrol.ts`te de yapıldı.)_
 */
const BEKCI_BASLIGI = "PANEL";

const SIRA = "src/lib/kanal-sirasi.ts";
const PANEL = "src/lib/panel.ts";

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
    ad: "panel yine CIRO sirasina dondu",
    yon: "KALDIRAN",
    dosya: PANEL,
    bul: "      const liste = kanallariSirala([...kanallar.values()]);",
    koy: "      const liste = [...kanallar.values()].sort((a, b) => b.gelir - a.gelir);",
    bozdugu:
      "kart yerleri veriyle birlikte oynar; kullanici her acilista aradigi kanali yeniden arar",
  },
  {
    ad: "sabit sira listesi bosaltildi",
    yon: "KALDIRAN",
    dosya: SIRA,
    bul: '  "TRENDYOL",\n  "HEPSIBURADA",\n  "N11",\n  "AMAZON",',
    koy: "",
    bozdugu: "butun kanallar ayni basamaga duser, sira tamamen ADA kalir",
  },
  {
    ad: "sira karisti (HB ile N11 yer degistirdi)",
    yon: "FAZLADAN",
    dosya: SIRA,
    bul: '  "HEPSIBURADA",\n  "N11",',
    koy: '  "N11",\n  "HEPSIBURADA",',
    bozdugu: "kullanicinin saydigi sira degil, baska bir sira cizilir",
  },
  {
    ad: "sayilmayan kanal listeden DUSURULUYOR",
    yon: "FAZLADAN",
    dosya: SIRA,
    bul: "  return [...kanallar].sort((a, b) => {",
    koy: "  return [...kanallar]\n    .filter((k) => kanalSirasi(k.kanalKodu) < KANAL_SIRASI.length)\n    .sort((a, b) => {",
    bozdugu:
      "sayilmayan 7 kanal panelden SESSIZCE kaybolur — yarin acilan kanal da hic gorunmez",
  },
  {
    ad: "esitlik bozucu AD kaldirildi",
    yon: "KALDIRAN",
    dosya: SIRA,
    bul: '    return a.kanalAdi.localeCompare(b.kanalAdi, "tr");',
    koy: "    return 0;",
    bozdugu:
      "sayilmayan kanallarin arasindaki duzen kosumdan kosuma degisebilir (sort kararliligi motora kalir)",
  },
  {
    ad: "girdi dizisi YERINDE siralaniyor (cagiranin dizisi bozulur)",
    yon: "FAZLADAN",
    dosya: SIRA,
    bul: "  return [...kanallar].sort((a, b) => {",
    koy: "  return (kanallar as T[]).sort((a, b) => {",
    bozdugu:
      "cagiran ayni diziyi baska yerde kullaniyorsa onun sirasi da sessizce degisir",
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
console.log("PANEL — K106 KANAL SIRASI MUTASYON TURU");
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
    const diskten = readFileSync(m.dosya, "utf8");
    if (diskten !== mutant || mutant === asil) {
      bozuk.push(m.ad + "\n       mutasyon diske UYGULANMADI");
      continue;
    }
    sonuc = bekciyiKostur();
  } finally {
    writeFileSync(m.dosya, asil, "utf8");
  }

  const isaret = m.yon === "KALDIRAN" ? "−" : "+";
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
  console.log("  ✓  K106 sırası İKİ YÖNDEN de sınandı ve kırmızı yandığı GÖRÜLDÜ\n");
}
