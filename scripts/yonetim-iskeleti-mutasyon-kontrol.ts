import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  YÖNETİM İSKELETİ — MUTASYON HARNESS'İ (06.10.2026)
 * ----------------------------------------------------------------------------
 *      npm run yonetim-iskeleti-mutasyon:kontrol
 *
 *  `yonetim-iskeleti:dogrula`nın dişini sınar. ZARARSIZ yeşil kalmalı; öteki
 *  her mutasyon KIRMIZI yanmalı. Harness mutasyonun UYGULANDIĞINI doğrular.
 * ============================================================================
 */

const BEKCI = "scripts/yonetim-iskeleti-dogrula.ts";
const BEKCI_BASLIGI = "YÖNETİM İSKELETİ BEKÇİSİ";
const DURUM = "src/lib/yonetim/durumlar.ts";
const MENU = "src/lib/yonetim/menu.ts";
const LISTE = "src/app/bezirga/(ic)/firmalar/page.tsx";
const BUGUN = "src/app/bezirga/(ic)/bugun/page.tsx";
const EPOSTA = "src/app/bezirga/(ic)/eposta/page.tsx";
const GIRIS = "src/app/bezirga/actions.ts";

type Mutasyon = { ad: string; yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN"; dosya: string; bul: string; koy: string; bozdugu: string };

const MUTASYONLAR: Mutasyon[] = [
  { ad: "ZARARSIZ - yorum", yon: "ZARARSIZ", dosya: DURUM,
    bul: "/** Etiketin rengi (referans: bad / warn / acc). */", koy: "/** Etiketin rengi (referans: bad, warn, acc). */",
    bozdugu: "hicbir sey - YESIL kalmali" },
  { ad: "AKTIF UYARIDAKINI DE KAPSIYOR", yon: "FAZLADAN", dosya: DURUM,
    bul: '    if (a.tur === "NORMAL") e.push("AKTIF");', koy: '    if (a.tur !== "ASKIDA") e.push("AKTIF");',
    bozdugu: "uyaridaki firma iki parcada sayilir; Firmalar nerede? toplami tutmaz" },
  { ad: "ASKIDAKI FIRMA YAPILACAK SAYILIYOR", yon: "FAZLADAN", dosya: DURUM,
    bul: 'export const YAPILACAK_ETIKETLERI: readonly FirmaEtiketi[] = ["ODEME_GECIKTI",', koy: 'export const YAPILACAK_ETIKETLERI: readonly FirmaEtiketi[] = ["ASKIDA", "ODEME_GECIKTI",',
    bozdugu: "kapanmis firma her gun is gibi gorunur (kapatilamayan madde)" },
  { ad: "LISTE DURUMLA SUZMUYOR", yon: "KALDIRAN", dosya: LISTE,
    bul: "(!durum || f.etiketler.includes(durum))", koy: "(true)",
    bozdugu: "Bugun'deki sayiya tiklayan susulmemis listeye duser" },
  { ad: "BUGUN SUZGECSIZ LISTEYE GOTURUYOR", yon: "KALDIRAN", dosya: BUGUN,
    bul: "<Link key={e} href={firmalarAdresi(e)} className={SATIR[e]}>", koy: "<Link key={e} href={firmalarAdresi()} className={SATIR[e]}>",
    bozdugu: "yapilacak satiri hangi firmalar oldugunu gostermez" },
  { ad: "EPOSTA SUZGECI KENDI OLCUTU", yon: "KALDIRAN", dosya: EPOSTA,
    bul: "sorunlu ? await sorunluEpostalar()", koy: "sorunlu ? await gidenEpostalar({ adet: 500 })",
    bozdugu: "rozetteki sayi ile listedeki e-postalar ayrisir" },
  { ad: "MENU HEDEFSIZ SAYFAYA GIDIYOR", yon: "FAZLADAN", dosya: MENU,
    bul: "  kayitDefteri: `${YONETIM_YOLU}/kayit-defteri`,", koy: "  kayitDefteri: `${YONETIM_YOLU}/kayit-defterim`,",
    bozdugu: "menu ogesi 404'e gider" },
  { ad: "GIRIS ESKI SAYFAYA GIDIYOR", yon: "KALDIRAN", dosya: GIRIS,
    bul: "`${YONETIM_YOLU}/parola` : YONETIM_ANA);", koy: "`${YONETIM_YOLU}/parola` : `${YONETIM_YOLU}/firmalar`);",
    bozdugu: "giris Bugun yerine eski listeye acilir" },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, { shell: true, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("\nYÖNETİM İSKELETİ — MUTASYON TURU\n");

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
  console.log("  OK  Yönetim iskeleti İKİ YÖNDEN sınandı, zararsız yeşil kaldı\n");
}
