import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  SATIŞ LİSTESİNDE İPTAL GÖRÜNÜRLÜĞÜ — MUTASYON HARNESS'I (09.10.2026)
 * ----------------------------------------------------------------------------
 *      npm run iptal-gorunurluk-mutasyon:kontrol
 *  `iptal-gorunurluk:dogrula`nın dişini sınar. ÜÇ YÖN: zararsız · kaldıran ·
 *  fazladan. Çapası tutmayan mutasyon «ölçülemedi» sayılır, yeşil DEĞİL.
 * ============================================================================
 */

const BEKCI = "scripts/iptal-gorunurluk-dogrula.ts";
const BEKCI_BASLIGI = "SATIŞ LİSTESİNDE İPTAL GÖRÜNÜRLÜĞÜ (09.10.2026)";
const GOVDE = "src/lib/liste-suzgeci.ts";
const SAYFA = "src/app/satislar/page.tsx";
const EXCEL = "src/lib/disa-aktarma/listeler.ts";
const KART = "src/components/liste-karti.tsx";
const ALIM = "src/app/alimlar/page.tsx";

type Mutasyon = { ad: string; yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN"; dosya: string; bul: string; koy: string; bozdugu: string };

const MUTASYONLAR: Mutasyon[] = [
  { ad: "ZARARSIZ - govde yorumu", yon: "ZARARSIZ", dosya: GOVDE,
    bul: " *  SATIŞ LİSTESİNDE İPTALLERİN VARSAYILANI (kullanıcı kararı 09.10.2026)", koy: " *  SATIŞ LİSTESİNDE İPTALLERİN VARSAYILANI (kullanıcı kararı 09.10.2026) ·", bozdugu: "hicbir sey" },
  { ad: "VARSAYILAN YINE GIZLI (kullanicinin bildirdigi ariza)", yon: "KALDIRAN", dosya: GOVDE,
    bul: "  return { ...p, iptal: yalnizNotr ? \"1\" : \"0\" };", koy: "  return { ...p, iptal: \"0\" };", bozdugu: "aramada iptal edilen siparis 'satis yok' der" },
  { ad: "GOREV LISTESINDE DE GORUNUR (sayi != liste)", yon: "FAZLADAN", dosya: GOVDE,
    bul: "  return { ...p, iptal: yalnizNotr ? \"1\" : \"0\" };", koy: "  return { ...p, iptal: \"1\" };", bozdugu: "panel 5 der, liste 5 + iptaller gosterir" },
  { ad: "ACIK SECIM YOK SAYILIYOR", yon: "KALDIRAN", dosya: GOVDE,
    bul: "  if (secim === \"1\" || secim === \"0\") return { ...p, iptal: secim };\n", koy: "", bozdugu: "kullanici 'gizle' der, liste gostermeye devam eder" },
  { ad: "BILINMEYEN SUZGEC GORUNUR TARAFA DUSUYOR", yon: "FAZLADAN", dosya: GOVDE,
    bul: "    ([ad, deger]) => (deger ?? \"\").trim() === \"\" || IPTAL_GORUNUR_NOTR_SUZGECLER.includes(ad),",
    koy: "    ([ad, deger]) => (deger ?? \"\").trim() === \"\" || ![\"kar\", \"kargo\", \"onay\"].includes(ad),", bozdugu: "yarin eklenen gorev suzgeci iptalleri sayiya karistirir" },
  { ad: "ORTAK KOSULUN VARSAYILANI DEGISTI (panel/rapor kayar)", yon: "FAZLADAN", dosya: GOVDE,
    bul: "    ...(iptal === \"1\" ? {} : { iptalTarihi: null }),", koy: "    ...(iptal === \"0\" ? { iptalTarihi: null } : {}),", bozdugu: "panel ve rapor iptalleri ciroya sayar" },
  { ad: "EKRAN ESKI PARAMETREYLE KOSUL KURUYOR", yon: "KALDIRAN", dosya: SAYFA,
    bul: "= satisKosulu(pListe, an,", koy: "= satisKosulu(p, an,", bozdugu: "ekran degisiklige ragmen iptalleri gizler" },
  { ad: "SECENEK KUTUSU HAM DEGERI YAZIYOR", yon: "KALDIRAN", dosya: SAYFA,
    bul: "mevcut={{ ...p, iptal: pListe.iptal }}", koy: "mevcut={p}", bozdugu: "gorev listesinde kutu 'Tum iptaller' yazar ama gizler" },
  { ad: "EXCEL EKRANDAN FARKLI LISTE", yon: "KALDIRAN", dosya: EXCEL,
    bul: "satisKosulu(satisListesiParametreleri(p))", koy: "satisKosulu(p)", bozdugu: "inen dosya ekrandaki listeyle ayni degil" },
  { ad: "EXCEL IPTALI ISARETLEMIYOR", yon: "KALDIRAN", dosya: EXCEL,
    bul: "      s.iptalTarihi === null ? \"\" : gun(s.iptalTarihi),\n", koy: "", bozdugu: "dosyayi toplayan iptalleri de sayar" },
  { ad: "TELEFON KARTI CIZILMIYOR", yon: "KALDIRAN", dosya: KART,
    bul: "<div className={`flex items-start gap-2.5 ${iptal ? \"line-through opacity-60\" : \"\"}`}>", koy: "<div className=\"flex items-start gap-2.5\">", bozdugu: "telefonda iptal edilen satis gecerli gibi gorunur" },
  { ad: "SATIS KARTI IPTALI GECMIYOR", yon: "KALDIRAN", dosya: SAYFA,
    bul: "                iptal={satis.iptalTarihi !== null}\n", koy: "", bozdugu: "telefonda iptal gorunmez" },
  { ad: "ALIM KARTI IPTALI GECMIYOR", yon: "KALDIRAN", dosya: ALIM,
    bul: "                iptal={iptalliMi(alim)}\n", koy: "", bozdugu: "iki ekran farkli davranir (Ilke #10)" },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, { shell: true, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("\nIPTAL GORUNURLUGU - MUTASYON TURU (09.10.2026)\n");
let yakalanan = 0;
const kacan: string[] = [];
const bozuk: string[] = [];
for (const m of MUTASYONLAR) {
  const asil = readFileSync(m.dosya, "utf8");
  const bul = desenNormalle(asil, m.bul);
  const koy = desenNormalle(asil, m.koy);
  const n = asil.split(bul).length - 1;
  if (n !== 1) { bozuk.push(`${m.ad}\n       desen ${m.dosya} icinde ${n} kez geciyor (1 olmali) - OLCULEMEDI`); continue; }
  const mutant = asil.replace(bul, koy);
  let sonuc: { kod: number; ciktiVar: boolean };
  try {
    dayanikliYaz(m.dosya, mutant);
    if (readFileSync(m.dosya, "utf8") !== mutant || mutant === asil) { bozuk.push(`${m.ad}\n       mutasyon diske UYGULANMADI`); continue; }
    sonuc = bekciyiKostur();
  } finally {
    dayanikliYaz(m.dosya, asil);
    if (readFileSync(m.dosya, "utf8") !== asil) bozuk.push(`${m.ad}\n       GERI ALMA BASARISIZ - dosya mutasyonlu kaldi`);
  }
  const isaret = m.yon === "ZARARSIZ" ? "o" : m.yon === "KALDIRAN" ? "-" : "+";
  if (m.yon === "ZARARSIZ") {
    if (sonuc.kod === 0 && sonuc.ciktiVar) { yakalanan++; console.log(`  OK  ${isaret} ${m.ad}`); }
    else if (!sonuc.ciktiVar) bozuk.push(`${m.ad}\n       bekci COKTU - olcum gecersiz`);
    else kacan.push(`${m.ad}\n       YALANCI KIRMIZI`);
    continue;
  }
  if (sonuc.kod !== 0 && sonuc.ciktiVar) { yakalanan++; console.log(`  OK  ${isaret} ${m.ad}`); }
  else if (sonuc.kod !== 0) bozuk.push(`${m.ad}\n       bekci COKTU (baslik basilmadi) - olcum gecersiz`);
  else kacan.push(`${m.ad}\n       KORUMASIZ: ${m.bozdugu}`);
}
console.log("");
for (const k of kacan) console.log("  X  " + k);
for (const b of bozuk) console.log("  !! " + b);
console.log(`\n  ${yakalanan}/${MUTASYONLAR.length} mutasyon beklendigi gibi davrandi`);
if (kacan.length || bozuk.length) { console.log("\n  Kacan ya da olculemeyen mutasyon var - bekci eksik.\n"); process.exitCode = 1; }
else console.log("\n  OK  Iptal gorunurlugu UC YONDEN sinandi, kirmizi yandigi GORULDU.\n");
