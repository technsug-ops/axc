import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  GİRİŞ FİRMASIZ — MUTASYON HARNESS'İ (K303, 04.10.2026)
 * ----------------------------------------------------------------------------
 *      npm run giris-firmasiz-mutasyon:kontrol
 * ============================================================================
 */

const BEKCI = "scripts/giris-firmasiz-dogrula.ts";
const BEKCI_BASLIGI = "GİRİŞ FİRMASIZ BEKÇİSİ";
const GOVDE = "src/lib/giris-kilidi-okuma.ts";
const EYLEM = "src/app/giris/actions.ts";

type Mutasyon = { ad: string; yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN"; dosya: string; bul: string; koy: string; bozdugu: string };

const EPOSTA_DALI = "        { detail: { contains: `\"eposta\":${JSON.stringify(eposta)}` } },\n";
const IP_DALI = "        { detail: { contains: `\"ip\":${JSON.stringify(ip)}` } },\n";

const MUTASYONLAR: Mutasyon[] = [
  { ad: "ZARARSIZ - yorum", yon: "ZARARSIZ", dosya: GOVDE,
    bul: "GİRİŞ KİLİDİNİN OKUMASI — FİRMALAR-ÜSTÜ", koy: "GİRİŞ KİLİDİ OKUMASI — FİRMALAR-ÜSTÜ",
    bozdugu: "hicbir sey - YESIL kalmali" },
  { ad: "GOVDE SUZGECLI ISTEMCIYLE OKUR", yon: "KALDIRAN", dosya: GOVDE,
    bul: 'import { sistemPrisma } from "@/lib/prisma";', koy: 'import { prisma as sistemPrisma } from "@/lib/prisma";',
    bozdugu: "giris ekrani FIRMA_BAGLAMI_YOK ile duser (vaka 2371615829)" },
  { ad: "EYLEM KENDI SUZGECLI SORGUSUNA DONER", yon: "KALDIRAN", dosya: EYLEM,
    bul: "girisKilidi(await yakinBasarisizDenemeler(eposta, ip, simdi), simdi)",
    koy: 'girisKilidi((await prisma.auditLog.findMany({ where: { action: "GIRIS_BASARISIZ" }, select: { createdAt: true } })).map((d) => d.createdAt), simdi)',
    bozdugu: "govde dogru ama giris onu cagirmiyor" },
  { ad: "E-POSTA DALI YOK", yon: "KALDIRAN", dosya: GOVDE, bul: EPOSTA_DALI, koy: "",
    bozdugu: "IP degistiren saldirgan ayni hesabi sinirsiz dener" },
  { ad: "IP DALI YOK", yon: "KALDIRAN", dosya: GOVDE, bul: IP_DALI, koy: "",
    bozdugu: "ayni IP'den farkli hesaplar sinirsiz denenir" },
  { ad: "E-POSTA/IP SUZGECI YOK (herkesin izi)", yon: "FAZLADAN", dosya: GOVDE,
    bul: "      OR: [\n" + EPOSTA_DALI + IP_DALI + "      ],\n", koy: "",
    bozdugu: "baskasinin denemesi masum kullaniciyi kilitler" },
  { ad: "PENCERE BASI YOK", yon: "FAZLADAN", dosya: GOVDE,
    bul: "createdAt: { gte: new Date(simdi.getTime() - GIRIS_KILIT_DK * 60_000), lte: simdi },",
    koy: "createdAt: { lte: simdi },",
    bozdugu: "kilit hic acilmaz - eski denemeler sonsuza dek sayilir" },
  { ad: "PENCERE SONU YOK", yon: "FAZLADAN", dosya: GOVDE,
    bul: "createdAt: { gte: new Date(simdi.getTime() - GIRIS_KILIT_DK * 60_000), lte: simdi },",
    koy: "createdAt: { gte: new Date(simdi.getTime() - GIRIS_KILIT_DK * 60_000) },",
    bozdugu: "simdiden sonraki iz sayilir (govde sozu bozulur)" },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, { shell: true, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("\nGİRİŞ FİRMASIZ — MUTASYON TURU\n");
let dogru = 0;
const yanlis: string[] = [];
const bozuk: string[] = [];
for (const m of MUTASYONLAR) {
  const asil = readFileSync(m.dosya, "utf8");
  const bul = desenNormalle(asil, m.bul);
  const koy = desenNormalle(asil, m.koy);
  const adet = asil.split(bul).length - 1;
  if (adet !== 1) { bozuk.push(`${m.ad}\n       desen ${adet} kez geçiyor (1 olmalı) — ${m.dosya}`); continue; }
  const mutant = asil.replace(bul, koy);
  let sonuc: { kod: number; ciktiVar: boolean };
  try {
    dayanikliYaz(m.dosya, mutant);
    if (readFileSync(m.dosya, "utf8") !== mutant || mutant === asil) { bozuk.push(`${m.ad}\n       mutasyon diske UYGULANMADI`); continue; }
    sonuc = bekciyiKostur();
  } finally {
    dayanikliYaz(m.dosya, asil);
  }
  const isaret = m.yon === "KALDIRAN" ? "-" : m.yon === "FAZLADAN" ? "+" : "o";
  if (!sonuc.ciktiVar) bozuk.push(`${m.ad}\n       bekçi ÇÖKTÜ (başlık basılmadı) — ölçüm geçersiz`);
  else if ((m.yon === "ZARARSIZ") === (sonuc.kod === 0)) { dogru++; console.log(`  OK  ${isaret} ${m.ad}`); }
  else yanlis.push(m.yon === "ZARARSIZ" ? `${m.ad}\n       zararsız mutasyon KIRMIZI yandı` : `${m.ad}\n       KORUMASIZ: ${m.bozdugu}`);
}
console.log("");
for (const k of yanlis) console.log("  X  " + k);
for (const b of bozuk) console.log("  !! " + b);
console.log(`\n  ${dogru}/${MUTASYONLAR.length} mutasyon beklendiği gibi davrandı`);
if (yanlis.length || bozuk.length) { console.log("\n  Beklenmeyen ya da ölçülemeyen mutasyon var — bekçi eksik.\n"); process.exitCode = 1; }
else console.log("  OK  Girişin firmasız okuması İKİ YÖNDEN sınandı, zararsız yeşil kaldı\n");
