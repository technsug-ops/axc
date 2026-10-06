import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  PAKET — MUTASYON HARNESS'İ (K303 ②, 06.10.2026)
 * ----------------------------------------------------------------------------
 *      npm run paket-mutasyon:kontrol
 *
 *  `paket:dogrula`nın dişini sınar. ZARARSIZ yeşil kalmalı; öteki her
 *  mutasyon KIRMIZI yanmalı. Harness mutasyonun UYGULANDIĞINI doğrular.
 * ============================================================================
 */

const BEKCI = "scripts/paket-dogrula.ts";
const BEKCI_BASLIGI = "PAKET BEKÇİSİ";
const KATALOG = "src/lib/paket/ozellikler.ts";
const YONETIM = "src/lib/paket/yonetim.ts";
const ACILIS = "src/lib/firma-acilisi.ts";
const EYLEM = "src/app/bezirga/(ic)/paketler/actions.ts";
const PROXY = "src/proxy.ts";
const YETKI = "src/lib/yetki/index.ts";
const ERISIM = "src/lib/paket/erisim.ts";
const KOK = "src/app/layout.tsx";
const SINIR = "src/lib/paket/sinirlar.ts";
const UYELIK = "src/lib/kullanici-uyeligi.ts";
const KANAL = "src/app/ayarlar/kanallar/actions.ts";
const ODEME = "src/lib/odeme-takibi.ts";
const ALT = "src/components/alt-cubuk.tsx";
const HIZLI = "src/app/hizli-islemler.tsx";

type Mutasyon = { ad: string; yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN"; dosya: string; bul: string; koy: string; bozdugu: string };

const MUTASYONLAR: Mutasyon[] = [
  { ad: "ZARARSIZ - yorum", yon: "ZARARSIZ", dosya: KATALOG,
    bul: "/** Özellik → kapsadığı menü ekranları (`MENU_ADRESLERI` anahtarları). */", koy: "/** Özellik → kapsadığı menü ekranları (MENU_ADRESLERI anahtarları). */",
    bozdugu: "hicbir sey - YESIL kalmali" },
  { ad: "EKRAN SAHIPSIZ KALDI", yon: "KALDIRAN", dosya: KATALOG,
    bul: '  finansman: ["finansman"],', koy: "  finansman: [],",
    bozdugu: "finansman ekrani hicbir pakette yonetilemez" },
  { ad: "EKRAN IKI OZELLIGE AIT", yon: "FAZLADAN", dosya: KATALOG,
    bul: '  nakitTakvimi: ["nakitTakvimi"],', koy: '  nakitTakvimi: ["nakitTakvimi", "kartBorcu"],',
    bozdugu: "bir paketten cikan ekran ötekinden acik kalir" },
  { ad: "HEP ACIK OZELLIGI YUTUYOR", yon: "FAZLADAN", dosya: KATALOG,
    bul: '"geceTuru", "paketim"] as const;', koy: '"geceTuru", "paketim", "finansman"] as const;',
    bozdugu: "paket disi birakilan ekran paketle kapatilamaz" },
  { ad: "FIRMAYA OZEL SECIM OKUNMUYOR", yon: "KALDIRAN", dosya: KATALOG,
    bul: "return new Set(paket.firmayaOzel ? firmaSecimi : paket.ozellikler);", koy: "return new Set(paket.ozellikler);",
    bozdugu: "Individuel firma hicbir ekran goremez" },
  { ad: "PAKETSIZ FIRMA HER SEYI GORUR", yon: "FAZLADAN", dosya: KATALOG,
    bul: "  if (!paket) return new Set();", koy: "  if (!paket) return new Set(OZELLIKLER);",
    bozdugu: "paketsiz firma bedava Premium olur" },
  { ad: "FINANSMAN HAZIR PAKETE GIRDI", yon: "FAZLADAN", dosya: KATALOG,
    bul: '"karlilikKarti", "urunAnalizi", "envanterDegeri", "aiOzeti"] },', koy: '"karlilikKarti", "urunAnalizi", "envanterDegeri", "aiOzeti", "finansman"] },',
    bozdugu: "06.10 karari (yalniz Individuel) delinir" },
  { ad: "INDIVIDUEL GECISI BAYAT SECIMI DONDURUYOR", yon: "KALDIRAN", dosya: YONETIM,
    bul: "const yenidenKur = p.firmayaOzel && !once.paket?.firmayaOzel;", koy: "const yenidenKur = false;",
    bozdugu: "paket degisimi sessizce ekran kapatir ya da eski ekrani acar" },
  { ad: "HAZIR PAKETTE FIRMA SECIMI YAZILIYOR", yon: "KALDIRAN", dosya: YONETIM,
    bul: '  if (!fp.paket?.firmayaOzel) return { durum: "HATA", hata: "OZEL_DEGIL" };\n', koy: "",
    bozdugu: "etkisiz secim yazilir; ekran ne gosterdigini bilemez" },
  { ad: "FIRMAYA OZEL PAKETE ICERIK YAZILIYOR", yon: "KALDIRAN", dosya: YONETIM,
    bul: '  if (p.firmayaOzel) return { durum: "HATA", hata: "FIRMAYA_OZEL" };\n  const once = new Set(p.ozellikler.map((o) => o.ozellik));', koy: "  const once = new Set(p.ozellikler.map((o) => o.ozellik));",
    bozdugu: "Individuel paketinde etkisiz icerik birikir" },
  { ad: "FIRMA SECIMINDE TANIMSIZ ANAHTAR", yon: "KALDIRAN", dosya: YONETIM,
    bul: '  if (secim.some((o) => !GECERLI.has(o))) return { durum: "HATA", hata: "OZELLIK_GECERSIZ" };\n  const fp = await firmaPaketi(firmaId);',
    koy: "  const fp = await firmaPaketi(firmaId);",
    bozdugu: "uydurma anahtar veritabanina girer" },
  { ad: "FIRMA PAKETSIZ ACILIYOR", yon: "KALDIRAN", dosya: ACILIS,
    bul: "isActive: false, paketId }", koy: "isActive: false }",
    bozdugu: "yeni firma paketsiz dogar" },
  { ad: "PAKET SINANMADAN ACILIYOR", yon: "KALDIRAN", dosya: ACILIS,
    bul: '  if (!(await sistemPrisma.paket.findUnique({ where: { id: paketId }, select: { id: true } }))) {\n    return { durum: "HATA", hata: "PAKET_YOK" };\n  }\n',
    koy: "",
    bozdugu: "olmayan paketle firma acilmaya calisilir (FK hatasi, yarim kurulum)" },
  { ad: "PAKET ICERIGI KAPISIZ", yon: "KALDIRAN", dosya: EYLEM,
    bul: 'export async function paketIcerigiEylemi(paketId: string, secim: string[]): Promise<{ hata?: string; tamam?: string }> {\n  const t = await getTranslations("Yonetim");\n  const k = await yonetimEylemi();',
    koy: 'export async function paketIcerigiEylemi(paketId: string, secim: string[]): Promise<{ hata?: string; tamam?: string }> {\n  const t = await getTranslations("Yonetim");\n  const k = { id: "x" };',
    bozdugu: "super admin olmayan biri paket icerigini degistirir" },
  // ── 2. adım: uygulama tarafı ──
  { ad: "PROXY ADRES BASLIGINI YAZMIYOR", yon: "KALDIRAN", dosya: PROXY,
    bul: "  basliklar.set(PAKET_YOL_BASLIGI, yol);\n", koy: "",
    bozdugu: "sayfa kapisi adresi bilemez, her kilitli ekran acilir" },
  { ad: "SAYFA GIRISI PAKETE BAKMIYOR", yon: "KALDIRAN", dosya: YETKI,
    bul: "  // K303 ② — paket halkası (sayfaIzni ile AYNI kapı; iki ölçüt olmaz).\n  await paketKapisi(baglam.companyId);\n", koy: "",
    bozdugu: "izin istemeyen sayfalar paketten bagimsiz acilir" },
  { ad: "KAPALI OZELLIK YONLENDIRILMIYOR", yon: "KALDIRAN", dosya: ERISIM,
    bul: "if (!(await firmaAcikOzellikleri(firmaId)).has(ozellik)) redirect(kilitAdresi(ozellik));", koy: "if (!(await firmaAcikOzellikleri(firmaId)).has(ozellik)) return;",
    bozdugu: "adresi elle yazan kilitli ekrana girer" },
  { ad: "EN UZUN ESLESME DEGIL ILK ESLESME", yon: "FAZLADAN", dosya: KATALOG,
    bul: "if (tutar && (!enIyi || adres.length > enIyi.uzunluk))", koy: "if (tutar && !enIyi)",
    bozdugu: "/rapor/urunler Basic'in rapor ozelligine duser, Premium kilidi delinir" },
  { ad: "PANEL HER ADRESI YUTUYOR", yon: "FAZLADAN", dosya: KATALOG,
    bul: 'const tutar = adres === "/" ? yol === "/" : yol === adres', koy: 'const tutar = adres === "/" ? true : yol === adres',
    bozdugu: "paket disi sayfalar panel ozelligine baglanir, kilitlenir" },
  { ad: "ESKI KARGO ADRESI KAPSAM DISI", yon: "KALDIRAN", dosya: KATALOG,
    bul: '  kargoTarifesi: ["/ayarlar/hb-kargo-tarife"],\n', koy: "",
    bozdugu: "eski adresten kargo tarifesi paketsiz acilir" },
  { ad: "KOMISYON YUKLEME KANAL TANIMINA KAYDI", yon: "KALDIRAN", dosya: KATALOG,
    bul: '  komisyonTarifesi: ["/kanal-sku/komisyon-aktar"],\n', koy: "",
    bozdugu: "Basic firma komisyon dosyasi yukler (kanal kodlarinin alt sayfasi)" },
  { ad: "BASIC'TE BARKOD YOK", yon: "KALDIRAN", dosya: KATALOG,
    bul: '"hesaplamaMotoru", "kartlar", "kanalTanimlari", "barkod"] },\n  { ad: "Silver"', koy: '"hesaplamaMotoru", "kartlar", "kanalTanimlari"] },\n  { ad: "Silver"',
    bozdugu: "06.10 karari delinir: API'siz firma her seyi elle yazar" },
  // ── adet sınırları (06.10.2026) ──
  { ad: "SERT KAPI HIC DURDURMUYOR", yon: "KALDIRAN", dosya: SINIR,
    bul: "  if (sinir === null || k[tur] + artis <= sinir) return { gecer: true };", koy: "  if (sinir !== -1) return { gecer: true };",
    bozdugu: "sinir dolu iken yeni hesap/kisi eklenir" },
  { ad: "SERT KAPI BIR EKSIKTE DURDURUYOR", yon: "FAZLADAN", dosya: SINIR,
    bul: "k[tur] + artis <= sinir) return { gecer: true };", koy: "k[tur] + artis < sinir) return { gecer: true };",
    bozdugu: "sinira bir kala yeni ekleme reddedilir" },
  { ad: "PASIF VE ALIS HESABI SAYILIYOR", yon: "FAZLADAN", dosya: SINIR,
    bul: "where: { companyId: firmaId, isActive: true, satisIcin: true }", koy: "where: { companyId: firmaId }",
    bozdugu: "alis/pasif hesap sinira sayilir, firma haksiz yere durur" },
  { ad: "PAKETSIZ FIRMA SINIRSIZ", yon: "FAZLADAN", dosya: SINIR,
    bul: "if (!f?.paket) return { kanalHesabi: 0, kullanici: 0, aylikSiparis: 0 };", koy: "if (!f?.paket) return { kanalHesabi: null, kullanici: null, aylikSiparis: null };",
    bozdugu: "paketsiz firma sinirsiz kullanir" },
  { ad: "INDIVIDUEL SINIRI PAKETTEN OKUNUYOR", yon: "KALDIRAN", dosya: SINIR,
    bul: "  if (f.paket.firmayaOzel) return { kanalHesabi: f.sinirKanalHesabi, kullanici: f.sinirKullanici, aylikSiparis: f.sinirAylikSiparis };\n", koy: "",
    bozdugu: "firmaya ozel sinir yok sayilir" },
  { ad: "YENIDEN ACMA SINIRA BAKMIYOR", yon: "KALDIRAN", dosya: UYELIK,
    bul: '  if (yeni) {\n    const k = await sertSinirKapisi(companyId, "kullanici");', koy: '  if (yeni && companyId === "-") {\n    const k = await sertSinirKapisi(companyId, "kullanici");',
    bozdugu: "pasif kisi yeniden acilarak sinir asilir" },
  { ad: "KANAL HESABI YENIDEN ACMA SINIRA BAKMIYOR", yon: "KALDIRAN", dosya: KANAL,
    bul: "  if (!hesap.isActive && hesap.satisIcin) {", koy: "  if (!hesap.isActive && hesap.satisIcin && id === \"-\") {",
    bozdugu: "pasif satis hesabi yeniden acilarak sinir asilir" },
  { ad: "SERT KAPI ILGISIZ YERE EKLENDI", yon: "FAZLADAN", dosya: ODEME,
    bul: "export const YAKLASIYOR_GUN = 7;", koy: 'export const YAKLASIYOR_GUN = 7;\nexport const _deneme = () => sertSinirKapisi("x", "kullanici");',
    bozdugu: "yumusak kalmasi gereken bir yol sert sinira takilir" },
  { ad: "BEYANSIZ PAKET DISI SAYFA", yon: "KALDIRAN", dosya: KATALOG,
    bul: '  { onek: "/talepler", gerekce: "destek talebi — paket değişikliği de buradan istenir" },\n', koy: "",
    bozdugu: "yeni sayfa kimse karar vermeden paket disi kalir" },
  { ad: "YAN MENU SUZULMEMIS DUZENLE CIZILIYOR", yon: "KALDIRAN", dosya: KOK,
    bul: "  const duzen = duzendenCikar(hamDuzen, kilitli);\n", koy: "  const duzen = hamDuzen;\n",
    bozdugu: "kapali ozellikler menude gorunur (06.10 karari)" },
  { ad: "SUZGEC HICBIR SEY CIKARMIYOR", yon: "KALDIRAN", dosya: KATALOG,
    bul: "  const acik = (a: string) => !(a in kilitli);", koy: "  const acik = (a: string) => Boolean(a);",
    bozdugu: "kapali ozellikler menude gorunur" },
  { ad: "ALT CUBUK KAPALI SEKMEYI GOSTERIYOR", yon: "KALDIRAN", dosya: ALT,
    bul: "  const sekmeler = ALT_CUBUK_SEKMELERI.filter((s) => !(s in kilitli));", koy: "  const sekmeler = ALT_CUBUK_SEKMELERI.filter((s) => Boolean(s) || kilitli);",
    bozdugu: "telefonda kapali Okut sekmesi gorunur" },
  { ad: "HIZLI ISLEM KAPALI ISI GOSTERIYOR", yon: "KALDIRAN", dosya: HIZLI,
    bul: "if (!href || !Ikon || anahtar in kilitli) return null;", koy: "if (!href || !Ikon) return null;",
    bozdugu: "panelde kapali isin tusu gorunur" },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, { shell: true, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("\nPAKET — MUTASYON TURU\n");

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
  console.log("  OK  Paketler İKİ YÖNDEN sınandı, zararsız yeşil kaldı\n");
}
