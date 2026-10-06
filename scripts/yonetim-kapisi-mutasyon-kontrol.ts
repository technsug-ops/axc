import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  SELLİORA YÖNETİM KAPISI — MUTASYON HARNESS'İ (K303 4c-2, 04.10.2026)
 * ----------------------------------------------------------------------------
 *      npm run yonetim-kapisi-mutasyon:kontrol
 * ============================================================================
 */

const BEKCI = "scripts/yonetim-kapisi-dogrula.ts";
const BEKCI_BASLIGI = "YÖNETİM KAPISI BEKÇİSİ";
const PROXY = "src/proxy.ts";
const OTURUM = "src/lib/yonetim-oturumu.ts";
const EYLEM = "src/app/bezirga/actions.ts";
const FIRMALAR = "src/app/bezirga/(ic)/firmalar/page.tsx";
const KOK = "src/app/layout.tsx";
const IMZA = "src/lib/oturum-imza.ts";
const GOVDE = "src/app/bezirga/layout.tsx";

type Mutasyon = { ad: string; yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN"; dosya: string; bul: string; koy: string; bozdugu: string };

const ISARET_KAPISI = "  if (!govde || govde.firmaId !== YONETIM_ISARETI) return new NextResponse(null, { status: 404 });";

const MUTASYONLAR: Mutasyon[] = [
  { ad: "ZARARSIZ - yorum", yon: "ZARARSIZ", dosya: OTURUM,
    bul: "SELLİORA YÖNETİM OTURUMU — SUNUCU", koy: "SELLİORA YÖNETİM OTURUMU (SUNUCU)", bozdugu: "hicbir sey - YESIL kalmali" },
  /* K303 ⑤ (06.10.2026) — iki adımlı giriş ZORUNLU */
  { ad: "PAROLA TEK BASINA OTURUM ACIYOR", yon: "FAZLADAN", dosya: EYLEM,
    bul: "  await araAdimAc(kullanici.id);\n", koy: "  await araAdimAc(kullanici.id);\n  await yonetimOturumuAc(kullanici.id);\n",
    bozdugu: "parolayi bilen kisi kod sormadan panele girer" },
  { ad: "IKI ADIMSIZ OTURUM GECERLI", yon: "KALDIRAN", dosya: OTURUM,
    bul: "  if (!k.totpAcildiAt) return null;\n", koy: "",
    bozdugu: "iki adimi hic kurmamis hesabin eski cerezi panele girer" },
  /* Tehdit: ara adım işareti yönetim işaretiyle AYNI olursa parolayla alınan
     5 dk'lık jeton içerideki sayfaları açar. (İlk yazımda yönetim işareti
     değiştirildi; ara adım ondan TÜRETİLDİĞİ için ikisi yine farklı kaldı —
     mutasyon tehdidi temsil etmiyordu, bekçi haklı olarak yeşil kaldı.) */
  { ad: "ARA ADIM JETONU ICERIDE GECIYOR", yon: "FAZLADAN", dosya: OTURUM,
    bul: "export const ARA_ADIM_ISARETI = `${YONETIM_ISARETI}_ADIM`;", koy: "export const ARA_ADIM_ISARETI = YONETIM_ISARETI;",
    bozdugu: "parolayla alinan ara adim jetonu icerideki sayfalari acar" },
  { ad: "KOD SONUCUNDAN ONCE OTURUM", yon: "FAZLADAN", dosya: EYLEM,
    bul: '  const r = await girisDogrula(k.u.id, String(formData.get("kod") ?? ""));\n', koy: '  await yonetimOturumuAc(k.u.id);\n  const r = await girisDogrula(k.u.id, String(formData.get("kod") ?? ""));\n',
    bozdugu: "yanlis kod girilse de oturum acilmis olur" },
  { ad: "PROXY ICERIYI JETONSUZ ACIYOR", yon: "FAZLADAN", dosya: PROXY,
    bul: ISARET_KAPISI + "\n", koy: "", bozdugu: "herkes /selliora/firmalar'a ulasir (sayfa kapisi tek savunma kalir)" },
  { ad: "PROXY ISARETI SORMUYOR (firma jetonu gecer)", yon: "FAZLADAN", dosya: PROXY,
    bul: ISARET_KAPISI, koy: "  if (!govde) return new NextResponse(null, { status: 404 });", bozdugu: "firma jetonu yonetim kapisindan gecer" },
  { ad: "SAHTE KATMAN BASLIGI SILINMIYOR", yon: "FAZLADAN", dosya: PROXY,
    bul: "  basliklar.delete(YONETIM_BASLIGI);\n", koy: "", bozdugu: "disaridan baslik gonderen firma kabugunu atlatir" },
  { ad: "GIRIS EKRANI KATMAN BASLIGI ALMIYOR", yon: "KALDIRAN", dosya: PROXY,
    bul: '  basliklar.set(YONETIM_BASLIGI, "1");\n', koy: "", bozdugu: "yonetim ekrani firma menusuyle cizilir" },
  { ad: "OTURUM SUPER ADMIN SORMUYOR", yon: "FAZLADAN", dosya: OTURUM,
    bul: "  if (!k || !k.isActive || !k.isSuperAdmin) return null;", koy: "  if (!k || !k.isActive) return null;",
    bozdugu: "isareti kaldirilan kisinin acik yonetim oturumu surer" },
  { ad: "OTURUM SURUMU SORULMUYOR", yon: "FAZLADAN", dosya: OTURUM,
    bul: "  if (k.sessionVersion !== govde.oturumSurumu) return null;\n", koy: "", bozdugu: "parola degisince eski yonetim oturumu acik kalir" },
  { ad: "YONETIM CEREZI HER YOLA GIDIYOR", yon: "FAZLADAN", dosya: OTURUM,
    bul: "    path: YONETIM_YOLU,", koy: '    path: "/",', bozdugu: "yonetim jetonu firma ekranlarina tasinir" },
  { ad: "GIRIS SUPER ADMIN SORMUYOR", yon: "FAZLADAN", dosya: EYLEM,
    bul: "if (!kullanici || !kullanici.isActive || !kullanici.isSuperAdmin || !gecti) {",
    koy: "if (!kullanici || !kullanici.isActive || !gecti) {", bozdugu: "her firma kullanicisi yonetime girer" },
  { ad: "FIRMALAR SAYFASI KAPISIZ", yon: "FAZLADAN", dosya: FIRMALAR,
    bul: "  await yonetimSayfasi();\n", koy: "", bozdugu: "duzen kapisi tek savunma kalir" },
  { ad: "KOK DUZEN YONETIMDE FIRMA OTURUMUNA BAKIYOR", yon: "FAZLADAN", dosya: KOK,
    bul: "const kullanici = yonetimKatmani ? null : await oturumdakiKullanici().catch(() => null);",
    koy: "const kullanici = await oturumdakiKullanici().catch(() => null);",
    bozdugu: "ayni tarayicida firma oturumu varsa yonetim ekrani firma menusuyle acilir" },
  { ad: "YOL OLCUTU GEVSEK (onek)", yon: "FAZLADAN", dosya: IMZA,
    bul: "  return yol === YONETIM_YOLU || yol.startsWith(`${YONETIM_YOLU}/`);", koy: "  return yol.startsWith(YONETIM_YOLU);",
    bozdugu: "YONETIM_YOLU + X gibi bir firma yolu yonetim sayilir" },
  /* ── 05.10.2026: süper admin ilk girişte parolasını değiştirir (kullanıcı kararı) ── */
  { ad: "SAYFA KAPISI PAROLAYA YONLENDIRMIYOR", yon: "KALDIRAN", dosya: OTURUM,
    bul: '  if (karar === "PAROLA") redirect(`${YONETIM_YOLU}/parola`);\n', koy: "",
    bozdugu: "gecici parolali super admin parolasini degistirmeden panele girer" },
  { ad: "EYLEM KAPISI PAROLALI KISIYE ACIK", yon: "KALDIRAN", dosya: OTURUM,
    bul: '  return yonetimKapiKarari(k) === "TAMAM" ? k : null;', koy: "  return k;",
    bozdugu: "parolasi degismeli kisi firma acar / parola sifirlar" },
  { ad: "KAPI KARARI HEP TAMAM", yon: "KALDIRAN", dosya: OTURUM,
    bul: '  return k.parolaDegismeli ? "PAROLA" : "TAMAM";', koy: '  return "TAMAM";',
    bozdugu: "parola zorunlulugu karar govdesinde sessizce duser" },
  { ad: "BASKA SAYFA GEVSEK KAPIYI KULLANIYOR", yon: "FAZLADAN", dosya: FIRMALAR,
    bul: "  await yonetimSayfasi();", koy: "  await yonetimSayfasiParolaEkrani();",
    bozdugu: "Firmalar sayfasi parola zorunluluguna bakmayan kapidan acilir" },
  { ad: "BASKA EYLEM GEVSEK KAPIYI KULLANIYOR", yon: "FAZLADAN", dosya: EYLEM,
    bul: "export async function yonetimCikisYap() {\n", koy: "export async function yonetimCikisYap() {\n  await yonetimEylemiParolaEkrani();\n",
    bozdugu: "parolaya bakmayan eylem kapisi parola eylemi disina yayilir" },
  { ad: "PAROLA EYLEMI CEREZI SILMIYOR", yon: "KALDIRAN", dosya: EYLEM,
    bul: "  await yonetimOturumuKapat();\n  redirect(`${YONETIM_YOLU}?parola=degisti`);", koy: "  redirect(`${YONETIM_YOLU}?parola=degisti`);",
    bozdugu: "parola degisince giris formu eski yonetim kabugunun icinde acilir (K319-2 dersi)" },
  /* Kapısız gövde düzeni (07.10.2026) — istisna yalnız yazı tipi + stil içindir */
  { ad: "KAPISIZ GOVDE DUZENI VERI OKUYOR", yon: "FAZLADAN", dosya: GOVDE,
    bul: 'import "./yonetim.css";\n', koy: 'import "./yonetim.css";\nimport { sistemPrisma } from "@/lib/prisma";\n',
    bozdugu: "giris sayfasini da saran kapisiz duzen veri okur; oturumsuz ziyaretci gorur" },
  { ad: "KAPISIZ GOVDE DUZENI CEREZ OKUYOR", yon: "FAZLADAN", dosya: GOVDE,
    bul: "export default function YonetimGovdesi(", koy: "export default async function YonetimGovdesi(",
    bozdugu: "kapisiz duzen beklemeli is yapar (cerez/veri) - istisnanin siniri asilir" },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, { shell: true, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("\nYÖNETİM KAPISI — MUTASYON TURU\n");
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
else console.log("  OK  Yönetim kapısı İKİ YÖNDEN sınandı, zararsız yeşil kaldı\n");
