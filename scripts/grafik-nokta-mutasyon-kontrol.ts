import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  GRAFİK NOKTA PENCERESİ — MUTASYON HARNESS'İ (K109)
 * ----------------------------------------------------------------------------
 *      npm run grafik-nokta-mutasyon:kontrol
 *
 *  ZARARSIZ yeşil kalmalı; öteki her mutasyon KIRMIZI yanmalı. Harness
 *  mutasyonun diske UYGULANDIĞINI doğrular, bekçinin başlığını görmeden
 *  «kırmızı» saymaz (çöken bekçi ölçüm değildir).
 * ============================================================================
 */

const BEKCI = "scripts/grafik-nokta-dogrula.ts";
const BEKCI_BASLIGI = "GRAFİK NOKTA PENCERESİ BEKÇİSİ";
const SERIT = "src/components/grafik-nokta-seritleri.tsx";
const CIZGI = "src/components/cizgi-grafik.tsx";
const TEK = "src/components/tek-serili-grafik.tsx";
const PENCERE = "src/components/grafik-nokta-penceresi.tsx";
const OLCEK = "src/components/grafik-olcek.ts";

type Mutasyon = { ad: string; yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN"; dosya: string; bul: string; koy: string; bozdugu: string };

const MUTASYONLAR: Mutasyon[] = [
  { ad: "ZARARSIZ - yorum", yon: "ZARARSIZ", dosya: SERIT,
    bul: " * DOKUNMA ŞERİTLERİ (K109) — sunucuda çizilir, SVG'nin EN ÜSTÜNE konur.", koy: " * DOKUNMA ŞERİTLERİ (K109) — sunucuda çizilir, SVG'nin EN ÜSTÜNE konur. zararsiz",
    bozdugu: "" },
  { ad: "SERITLER ARASINDA BOSLUK", yon: "KALDIRAN", dosya: SERIT,
    bul: ": (x + dolu[k + 1].x) / 2;", koy: ": (x + dolu[k + 1].x) / 2 - 4;",
    bozdugu: "iki nokta arasina dokununca hicbir sey olmaz (olu bolge)" },
  { ad: "BOS NOKTA DA SERIT ALIYOR", yon: "FAZLADAN", dosya: SERIT,
    bul: "xler.flatMap((x, i) => (x === null ? [] : [{ x, i }]));", koy: "xler.flatMap((x, i) => [{ x: x ?? G.sol, i }]);",
    bozdugu: "hukum olmayan aya dokununca bos ya da yanlis pencere acilir" },
  { ad: "CIZGI GRAFIKTE SERIT YOK", yon: "KALDIRAN", dosya: CIZGI,
    bul: "        <NoktaSeritleri noktalar={noktalar.map((n, i) => ({ x: x(i), y: yKonum(anaSeri(n)) }))} />", koy: "",
    bozdugu: "ciro/NET-2 grafiginde dokunma hic calismaz" },
  { ad: "NET-2 YETKISIZE DE GORUNUYOR", yon: "FAZLADAN", dosya: CIZGI,
    bul: "    satirlar: net2Goster\n      ?", koy: "    satirlar: true\n      ?",
    bozdugu: "kar gorme izni olmayan kullaniciya pencere NET-2 gosterir" },
  { ad: "BOS AY PENCERE ACIYOR", yon: "FAZLADAN", dosya: TEK,
    bul: "n.deger === null ? null : { baslik: n.tamEtiket,", koy: "false ? null : { baslik: n.tamEtiket,",
    bozdugu: "hesaplanamayan ay icin uydurma rakam gosterilir" },
  { ad: "ESC KAPATMIYOR", yon: "KALDIRAN", dosya: PENCERE,
    bul: '      if (e.key === "Escape") setSecili(null);', koy: "      void e;",
    bozdugu: "klavyeyle pencere kapatilamaz" },
  /* ── rakam konumu (03.10.2026 «ciro ile net karışmış» vakası) ── */
  { ad: "NET-2 RAKAMI AY SATIRINA INIYOR", yon: "KALDIRAN", dosya: OLCEK,
    bul: "  if (alttaNet <= ETIKET_ALT_SINIRI) {", koy: "  if (true) {",
    bozdugu: "ay basinda NET-2 rakami ay adinin ustune biner (Ekim vakasi)" },
  { ad: "CIRO RAKAMI NET-2 USTUNE ITILMIYOR", yon: "KALDIRAN", dosya: OLCEK,
    bul: "  return { ciroY: Math.min(yCiro - 10, netY - ETIKET_SATIR_ARALIGI), netY };", koy: "  return { ciroY: yCiro - 10, netY };",
    bozdugu: "iki rakam ayni satira biner" },
  { ad: "NORMAL AYDA DA RAKAM USTE ALINIYOR", yon: "FAZLADAN", dosya: OLCEK,
    bul: "  if (alttaNet <= ETIKET_ALT_SINIRI) {", koy: "  if (false) {",
    bozdugu: "her ayda NET-2 rakami ciro tarafina gecer, konumla okuma bozulur" },
  { ad: "UC NOKTA ORTALANIYOR", yon: "KALDIRAN", dosya: OLCEK,
    bul: '  if (i === 0) return "start";\n', koy: "",
    bozdugu: "ilk ayin rakami eksen yazisina biner (Kasim vakasi)" },
  { ad: "GRAFIK GOVDEYI KULLANMIYOR", yon: "KALDIRAN", dosya: CIZGI,
    bul: "                      y={ciroY}", koy: "                      y={yKonum(n.gelir) - 10}",
    bozdugu: "duzeltme ekrana ulasmaz" },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, { shell: true, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("\nGRAFİK NOKTA PENCERESİ — MUTASYON TURU\n");

let dogru = 0;
const yanlis: string[] = [];
const bozuk: string[] = [];

for (const m of MUTASYONLAR) {
  const asil = readFileSync(m.dosya, "utf8");
  const bul = desenNormalle(asil, m.bul);
  const koy = desenNormalle(asil, m.koy);
  const adet = asil.split(bul).length - 1;
  if (adet !== 1) {
    bozuk.push(`${m.ad}\n       desen ${adet} kez geçiyor (1 olmalı) — ${m.dosya}`);
    continue;
  }
  const mutant = asil.replace(bul, koy);
  let sonuc: { kod: number; ciktiVar: boolean };
  try {
    dayanikliYaz(m.dosya, mutant);
    if (readFileSync(m.dosya, "utf8") !== mutant || mutant === asil) {
      bozuk.push(`${m.ad}\n       mutasyon diske UYGULANMADI`);
      continue;
    }
    sonuc = bekciyiKostur();
  } finally {
    dayanikliYaz(m.dosya, asil);
  }
  const isaret = m.yon === "KALDIRAN" ? "-" : m.yon === "FAZLADAN" ? "+" : "o";
  if (!sonuc.ciktiVar) {
    bozuk.push(`${m.ad}\n       bekçi ÇÖKTÜ (başlık basılmadı) — ölçüm geçersiz`);
  } else if ((m.yon === "ZARARSIZ") === (sonuc.kod === 0)) {
    dogru++;
    console.log(`  OK  ${isaret} ${m.ad}`);
  } else {
    yanlis.push(m.yon === "ZARARSIZ" ? `${m.ad}\n       zararsız mutasyon KIRMIZI yandı — bekçi yalancı kırmızı üretiyor` : `${m.ad}\n       KORUMASIZ: ${m.bozdugu}`);
  }
}

console.log("");
for (const k of yanlis) console.log("  X  " + k);
for (const b of bozuk) console.log("  !! " + b);
console.log(`\n  ${dogru}/${MUTASYONLAR.length} mutasyon beklendiği gibi davrandı`);
if (yanlis.length || bozuk.length) {
  console.log("\n  Beklenmeyen ya da ölçülemeyen mutasyon var — bekçi eksik.\n");
  process.exitCode = 1;
} else {
  console.log("  OK  grafik penceresi İKİ YÖNDEN sınandı, zararsız yeşil kaldı\n");
}
