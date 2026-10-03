import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  FİRMA SÜZGECİ — MUTASYON HARNESS'İ (K303 Aşama 3a, 03.10.2026)
 * ----------------------------------------------------------------------------
 *      npm run firma-suzgeci-mutasyon:kontrol
 * ============================================================================
 */

const BEKCI = "scripts/firma-suzgeci-dogrula.ts";
const BEKCI_BASLIGI = "FİRMA SÜZGECİ BEKÇİSİ";
const SUZGEC = "src/lib/firma-suzgeci.ts";
const ISTEMCI = "src/lib/prisma.ts";
const BAGLAM = "src/lib/firma-baglami.ts";
const IZ = "src/lib/iz.ts";
const HARITA = "src/lib/firma-modelleri.uretilmis.ts";

type Mutasyon = { ad: string; yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN"; dosya: string; bul: string; koy: string; bozdugu: string };

const MUTASYONLAR: Mutasyon[] = [
  { ad: "ZARARSIZ - yorum", yon: "ZARARSIZ", dosya: SUZGEC,
    bul: "Bir oluşturma verisine (ve iç içe oluşturmalara) firma yazar.", koy: "Oluşturma verisine firma yazar.",
    bozdugu: "hicbir sey - YESIL kalmali" },
  { ad: "OKUMA SUZULMUYOR", yon: "KALDIRAN", dosya: SUZGEC,
    bul: "  if (WHERE_AND_ISLEMLERI.has(islem) || WHERE_TEKIL_ISLEMLERI.has(islem)) a.where = whereEkle(islem, a.where, companyId);\n", koy: "",
    bozdugu: "A firmasi B'nin satirlarini gorur" },
  { ad: "KULLANICI KOSULU EZILIYOR (spread)", yon: "KALDIRAN", dosya: SUZGEC,
    bul: "    ? { AND: [where, { companyId }] }", koy: "    ? { ...where, companyId }",
    bozdugu: "kullanicinin kendi companyId/AND kosulu sessizce ezilir" },
  { ad: "CREATE FIRMA YAZMIYOR", yon: "KALDIRAN", dosya: SUZGEC,
    bul: "      else sonuc.companyId = companyId;\n", koy: "",
    bozdugu: "yeni kayit firmasiz dogar" },
  { ad: "IC ICE CREATE ATLANIYOR", yon: "KALDIRAN", dosya: SUZGEC,
    bul: '  if ("create" in s) s.create = veriEkle(hedef, s.create, companyId);\n', koy: "",
    bozdugu: "satisla birlikte olusan kalemler firmasiz" },
  { ad: "CAKISMA KABUL EDILIYOR", yon: "KALDIRAN", dosya: SUZGEC,
    bul: "  if (deger !== undefined && deger !== null && deger !== companyId) {", koy: "  if (false) {",
    bozdugu: "B firmasinin kimligiyle yazim kabul edilir" },
  { ad: "NULL CAKISMA SAYILIYOR (izYaz vakasi)", yon: "FAZLADAN", dosya: SUZGEC,
    bul: "  if (deger !== undefined && deger !== null && deger !== companyId) {", koy: "  if (deger !== undefined && deger !== companyId) {",
    bozdugu: "her iz yazimi FIRMA_CAKISMASI ile patlar" },
  { ad: "ORTAK MODEL DE SUZULUYOR", yon: "FAZLADAN", dosya: SUZGEC,
    bul: "  if (!model || !firmaModeliMi(model)) return a;\n", koy: "  if (!model) return a;\n",
    bozdugu: "kanal/kullanici gibi ortak tablolar bozulur" },
  { ad: "ISTEMCI: BAGLAMSIZ SORGU GECIYOR", yon: "KALDIRAN", dosya: ISTEMCI,
    bul: '            throw new FirmaBaglamiHatasi("FIRMA_BAGLAMI_YOK", `${model}.${operation}`);', koy: "            return query(args);",
    bozdugu: "firma bilinmiyorsa HEPSI gorunur" },
  { ad: "ISTEMCI: DISARIYA SUZGECSIZ VEKIL", yon: "KALDIRAN", dosya: ISTEMCI,
    bul: "export const prisma = vekil(suzgecliyiAl);", koy: "export const prisma = vekil(istemciyiAl);",
    bozdugu: "197 dosya suzgecsiz calisir" },
  { ad: "BAGLAM: AWAIT RUN DISINDA (tembel promise)", yon: "KALDIRAN", dosya: BAGLAM,
    bul: "  return depo.run({ companyId }, async () => await fn());", koy: "  return depo.run({ companyId }, fn) as Promise<T>;",
    bozdugu: "betik/cron baglami sessizce kaybolur" },
  { ad: "BAGLAM: HER HATA YUTULUYOR", yon: "KALDIRAN", dosya: BAGLAM,
    bul: "    throw e;\n  }\n}", koy: "    return null;\n  }\n}",
    bozdugu: "veritabani kopuklugu 'firma yok' gibi gorunur" },
  { ad: "IZ: GEREKCESIZ SISTEM KULLANIMI", yon: "KALDIRAN", dosya: IZ,
    bul: "   * SISTEM: girişten önce firma yoktur; bu dal süzgeci atlar, başka yol açmaz.", koy: "   * girişten önce firma yoktur.",
    bozdugu: "suzgecsiz istemci gerekcesiz yayilir" },
  { ad: "HARITA BAYAT", yon: "KALDIRAN", dosya: HARITA,
    bul: '  "AiOzet": {\n    "firma": true,', koy: '  "AiOzet": {\n    "firma": false,',
    bozdugu: "semaya uymayan harita bir tabloyu suzgecsiz birakir" },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, { shell: true, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("\nFİRMA SÜZGECİ — MUTASYON TURU\n");
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
else console.log("  OK  Firma süzgeci İKİ YÖNDEN sınandı, zararsız yeşil kaldı\n");
