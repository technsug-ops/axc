import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  OTURUMUN FİRMASI — MUTASYON HARNESS'İ (K303 4c-1, 04.10.2026)
 * ----------------------------------------------------------------------------
 *      npm run oturum-firmasi-mutasyon:kontrol
 * ============================================================================
 */

const BEKCI = "scripts/oturum-firmasi-dogrula.ts";
const BEKCI_BASLIGI = "OTURUM FİRMASI BEKÇİSİ";
const JETON_BEKCISI = "scripts/oturum-dogrula.ts";
const GOVDE = "src/lib/oturum-firmasi.ts";
const GIRIS = "src/app/giris/actions.ts";
const OTURUM = "src/lib/oturum.ts";
const YETKI = "src/lib/yetki/index.ts";
const IMZA = "src/lib/oturum-imza.ts";

type Mutasyon = {
  ad: string; yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN"; dosya: string; bul: string; koy: string; bozdugu: string;
  /** Varsayılan bu bekçi; jeton biçimi `oturum:dogrula`nın alanı. */
  bekci?: string;
};

/* K303 (05.10.2026): koşula ÜYELİK aktifliği eklendi (`isActive: true`) — çapa taşındı, mutasyonların niyeti aynı. */
const UYELIK_KOSULU = "where: { userId: kullaniciId, companyId: firmaId, isActive: true, company: { isActive: true }, role: { isActive: true } },";

const MUTASYONLAR: Mutasyon[] = [
  { ad: "ZARARSIZ - yorum", yon: "ZARARSIZ", dosya: GOVDE,
    bul: "OTURUMUN FİRMASI — K303 4c-1", koy: "OTURUM FİRMASI — K303 4c-1", bozdugu: "hicbir sey - YESIL kalmali" },
  { ad: "UYELIK FIRMA SORMUYOR (herhangi bir uyelik yeter)", yon: "FAZLADAN", dosya: GOVDE,
    bul: UYELIK_KOSULU, koy: "where: { userId: kullaniciId, isActive: true, company: { isActive: true }, role: { isActive: true } },",
    bozdugu: "Axcali kullanicisi DMS koduyla Damisell'e girer" },
  { ad: "PASIF ROL GECIYOR", yon: "FAZLADAN", dosya: GOVDE,
    bul: UYELIK_KOSULU, koy: "where: { userId: kullaniciId, companyId: firmaId, isActive: true, company: { isActive: true } },",
    bozdugu: "rolu kapatilan kisinin acik oturumu surer" },
  { ad: "PASIF FIRMA UYELIGI GECIYOR", yon: "FAZLADAN", dosya: GOVDE,
    bul: UYELIK_KOSULU, koy: "where: { userId: kullaniciId, companyId: firmaId, isActive: true, role: { isActive: true } },",
    bozdugu: "kapatilan firmaya giris surer" },
  /* 05.10.2026: pasif firmanın kodu artık BULUNUR (askı sebebi söylensin); eski
     «PASIF FIRMANIN KODU COZULUYOR» mutasyonunun niyeti — askıdaki firmaya giriş
     YOK — artık red kararında ve uyeMi'de korunuyor; mutasyon oraya taşındı. */
  { ad: "ASKIDAKI FIRMA RED KARARINDAN DUSTU", yon: "FAZLADAN", dosya: GOVDE,
    bul: '  if (!g.firma.aktif) return "FIRMA_ASKIDA";', koy: "", bozdugu: "askidaki firmanin kullanicisi sebep yerine genel mesaj/ya da giris gorur" },
  { ad: "ASKI SEBEBI PAROLASIZ SIZIYOR", yon: "FAZLADAN", dosya: GOVDE,
    bul: '  if (!g.kullaniciVar || !g.parolaDogru) return "HATALI";', koy: '  if (!g.kullaniciVar) return "HATALI";', bozdugu: "parolayi bilmeyen biri firmanin askida oldugunu ogrenir" },
  { ad: "ASKI SEBEBI UYE OLMAYANA SIZIYOR", yon: "FAZLADAN", dosya: GOVDE,
    bul: '  if (!g.firma || !g.uyelik) return "HATALI";', koy: '  if (!g.firma) return "HATALI";', bozdugu: "baska firmanin durumu, uye olmayan birine soylenir" },
  { ad: "KOD NORMALLESMIYOR", yon: "KALDIRAN", dosya: GOVDE,
    bul: "return ham.trim().toUpperCase();", koy: "return ham;", bozdugu: "' axc ' yazan giremez" },
  { ad: "GIRIS UYELIGI SORMUYOR", yon: "FAZLADAN", dosya: GIRIS,
    bul: "if (red !== null || !kullanici || !firmaId || !uye) {",
    koy: "if (red !== null || !kullanici || !firmaId) {",
    bozdugu: "uye olmadigin firmanin koduyla oturum acilir" },
  { ad: "OTURUM OKUMASI UYELIGI SORMUYOR", yon: "FAZLADAN", dosya: OTURUM,
    bul: "  if (!(await uyeMi(kullanici.id, govde.firmaId))) return null;\n", koy: "",
    bozdugu: "uyeligi kaldirilan kisinin acik oturumu surer" },
  { ad: "YETKI ILK UYELIGE DONDU", yon: "FAZLADAN", dosya: YETKI,
    bul: "where: { userId: kullanici.id, companyId: kullanici.firmaId, isActive: true, company: { isActive: true } },",
    koy: "where: { userId: kullanici.id, isActive: true, company: { isActive: true } },",
    bozdugu: "iki firmali kullanici sectigi firmayi degil ilk uyeligini gorur" },
  { ad: "YENI FIRMASIZ UYELIK OKUMASI (desen yasagi)", yon: "FAZLADAN", dosya: GOVDE,
    bul: "/** Bu cihazda en son girilen firma kodu",
    koy: "export async function ilkUyelik(k: string) {\n  return sistemPrisma.userCompanyRole.findFirst({ where: { userId: k } });\n}\n\n/** Bu cihazda en son girilen firma kodu",
    bozdugu: "yarin eklenen bir yer ilk-uyelik tahminine doner" },
  { ad: "ESKI FIRMASIZ JETON KABUL", yon: "FAZLADAN", dosya: IMZA, bekci: JETON_BEKCISI,
    bul: "  if (parcalarGovde.length !== 4) return null;\n", koy: "",
    bozdugu: "eski oturuma firma uydurulur" },
];

function bekciyiKostur(yol: string): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + yol, { shell: true, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  const baslik = yol === BEKCI ? BEKCI_BASLIGI : "TÜM KONTROLLER GEÇTİ|KONTROL BAŞARISIZ|HATA";
  return { kod: r.status ?? 1, ciktiVar: new RegExp(baslik).test(cikti) };
}

console.log("\nOTURUM FİRMASI — MUTASYON TURU\n");
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
    sonuc = bekciyiKostur(m.bekci ?? BEKCI);
  } finally {
    dayanikliYaz(m.dosya, asil);
  }
  const isaret = m.yon === "KALDIRAN" ? "-" : m.yon === "FAZLADAN" ? "+" : "o";
  if (!sonuc.ciktiVar) bozuk.push(`${m.ad}\n       bekçi ÇÖKTÜ (sonuç satırı basılmadı) — ölçüm geçersiz`);
  else if ((m.yon === "ZARARSIZ") === (sonuc.kod === 0)) { dogru++; console.log(`  OK  ${isaret} ${m.ad}`); }
  else yanlis.push(m.yon === "ZARARSIZ" ? `${m.ad}\n       zararsız mutasyon KIRMIZI yandı` : `${m.ad}\n       KORUMASIZ: ${m.bozdugu}`);
}
console.log("");
for (const k of yanlis) console.log("  X  " + k);
for (const b of bozuk) console.log("  !! " + b);
console.log(`\n  ${dogru}/${MUTASYONLAR.length} mutasyon beklendiği gibi davrandı`);
if (yanlis.length || bozuk.length) { console.log("\n  Beklenmeyen ya da ölçülemeyen mutasyon var — bekçi eksik.\n"); process.exitCode = 1; }
else console.log("  OK  Oturumun firması İKİ YÖNDEN sınandı, zararsız yeşil kaldı\n");
