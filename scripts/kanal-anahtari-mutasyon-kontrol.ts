import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  KANAL ANAHTARI — MUTASYON HARNESS'İ (K303, 06.10.2026)
 * ----------------------------------------------------------------------------
 *      npm run kanal-anahtari-mutasyon:kontrol
 *
 *  `kanal-anahtari:dogrula`nın dişini sınar. ZARARSIZ yeşil kalmalı; öteki her
 *  mutasyon — her biri gerçek bir GÜVENLİK gerilemesi — KIRMIZI yanmalı.
 * ============================================================================
 */

const BEKCI = "scripts/kanal-anahtari-dogrula.ts";
const BEKCI_BASLIGI = "KANAL ANAHTARI BEKÇİSİ";
const SIFRE = "src/lib/kanal-anahtari/sifre.ts";
const KIMLIK = "src/lib/kanal-anahtari/kimlik.ts";
const DEPO = "src/lib/kanal-anahtari/depo.ts";
const HESAPLAR = "src/lib/kanal-anahtari/hesaplar.ts";

type Mutasyon = { ad: string; yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN"; dosya: string; bul: string; koy: string; bozdugu: string };

const MUTASYONLAR: Mutasyon[] = [
  { ad: "ZARARSIZ - yorum", yon: "ZARARSIZ", dosya: SIFRE,
    /* Çapa 14.10.2026'da taşındı: yorum «okur ve sınar» → «sınar» oldu (gizli varsayılan kaldırıldı). */
    bul: " * Ana sırrı sınar (base64, tam 32 bayt).", koy: " * Ana sırrı sınar (base64; tam 32 bayt).",
    bozdugu: "hicbir sey - YESIL kalmali" },
  { ad: "GIZLI VARSAYILAN SIR", yon: "FAZLADAN", dosya: SIFRE,
    bul: "export function sirOku(ham: string | undefined): SirSonucu {",
    koy: "export function sirOku(ham: string | undefined = process.env[SIR_DEGISKENI]): SirSonucu {",
    bozdugu: "sir verilmeyen cagri (iki adimli giris, kendi sirri yokken) sessizce PAZARYERI sirrini okur (vaka 14.10.2026)" },
  { ad: "IV SABIT", yon: "KALDIRAN", dosya: SIFRE,
    bul: "  const iv = randomBytes(12);", koy: "  const iv = Buffer.alloc(12);",
    bozdugu: "ayni anahtar ayni paketi verir; GCM'de iv tekrari sifrelemeyi kirar" },
  { ad: "SIR UZUNLUGU SINANMIYOR", yon: "KALDIRAN", dosya: SIFRE,
    bul: '  if (b.length !== 32) return { durum: "SIR_GECERSIZ" };\n', koy: "",
    bozdugu: "kisa/bozuk sir kabul edilir" },
  { ad: "SON DORT HANE TUM ANAHTARI VERIYOR", yon: "FAZLADAN", dosya: SIFRE,
    bul: '  return s.length >= 8 ? s.slice(-4) : "****";', koy: "  return s;",
    bozdugu: "ekranda ve izde anahtarin tamami gorunur" },
  { ad: "TY SATICI ID SINANMIYOR", yon: "KALDIRAN", dosya: KIMLIK,
    bul: '  if (kanal === "TRENDYOL" && !/^\\d{1,20}$/.test(v.saticiId!)) gecersiz.push("saticiId");\n', koy: "",
    bozdugu: "yanlis satici ID kaydedilir, cekim baska hesaba bakar" },
  { ad: "ALIS HESABI ANAHTAR ALIYOR", yon: "KALDIRAN", dosya: DEPO,
    bul: '  if (!hesap.satisIcin) return { durum: "HATA", hata: "SATIS_HESABI_DEGIL" };\n', koy: "",
    bozdugu: "alis hesabina pazaryeri anahtari baglanir" },
  { ad: "IZE ANAHTAR YAZILIYOR", yon: "FAZLADAN", dosya: DEPO,
    bul: "detail: JSON.stringify({ kanal, hesap: hesap.name, sonDort: son }),", koy: "detail: JSON.stringify({ kanal, hesap: hesap.name, sonDort: son, ham }),",
    bozdugu: "duz anahtar AuditLog'a yazilir" },
  { ad: "DENEME KAPISI YOK", yon: "KALDIRAN", dosya: DEPO,
    bul: '  if (denemeOrtamiMi()) return { durum: "DENEME_ORTAMI" };\n  return kayitliKimligiAc(channelAccountId);', koy: "  return kayitliKimligiAc(channelAccountId);",
    bozdugu: "deneme kurulumu gercek pazaryerine cagri yapar" },
  { ad: "FIRMA SUZGECI DELINDI", yon: "FAZLADAN", dosya: DEPO,
    bul: 'import { prisma } from "@/lib/prisma";', koy: 'import { sistemPrisma as prisma } from "@/lib/prisma";',
    bozdugu: "bir firma baska firmanin anahtarini okur/yazar" },
  /* ═══ K337 3. adım (15.10.2026) — hesabın KENDİ anahtarı ═══ */
  { ad: "ZARARSIZ - hesaplar yorumu", yon: "ZARARSIZ", dosya: HESAPLAR,
    bul: " *  HESABIN KENDİ ANAHTARIYLA KOŞ",
    koy: " *  HESABIN KENDI ANAHTARIYLA KOŞ",
    bozdugu: "hicbir sey - YESIL kalmali" },
  { ad: "ANAHTARSIZ HESAP ATLANMAZ", yon: "KALDIRAN", dosya: HESAPLAR,
    bul: "      sonuclar.push({ hesap: h.name, durum: \"ATLANDI\", sebep: o.durum });\n      continue;",
    koy: "      sonuclar.push({ hesap: h.name, durum: \"ATLANDI\", sebep: o.durum });",
    bozdugu: "anahtari olmayan hesap yine de is'e girer (kimliksiz cagri / ortama dusme kapisi)" },
  { ad: "BASKA KANALIN ANAHTARI KULLANILIR", yon: "KALDIRAN", dosya: HESAPLAR,
    bul: "    if (o.kimlik.kanal !== kanal) {",
    koy: "    if (false) {",
    bozdugu: "HB anahtari TY cagrisina gider" },
  { ad: "ALIS HESABI DA DOLASILIR", yon: "FAZLADAN", dosya: HESAPLAR,
    bul: "    where: { satisIcin: true, isActive: true, channel: { code: kanal } },",
    koy: "    where: { isActive: true, channel: { code: kanal } },",
    bozdugu: "alis (kisisel) hesaplar da cekime girer" },
  { ad: "IKI HESAPTA ILKI SECILIR", yon: "KALDIRAN", dosya: HESAPLAR,
    bul: "  if (h.length > 1) return { tamam: false, kod: \"HESAP_BELIRSIZ\" };\n",
    koy: "",
    bozdugu: "iki satis hesabinda stok rastgele magazaya gider" },
  { ad: "ANAHTARSIZ HESAP KIRMIZI YAPAR", yon: "FAZLADAN", dosya: HESAPLAR,
    bul: "(s.durum === \"ATLANDI\" && s.sebep !== \"ANAHTAR_YOK\" && s.sebep !== \"DENEME_ORTAMI\")",
    koy: "(s.durum === \"ATLANDI\" && s.sebep !== \"DENEME_ORTAMI\")",
    bozdugu: "kanali baglamamis her firma zamanlayiciyi kirmizi yakar" },
  { ad: "ACILAMAYAN ANAHTAR YESIL", yon: "KALDIRAN", dosya: HESAPLAR,
    bul: "(s.durum === \"ATLANDI\" && s.sebep !== \"ANAHTAR_YOK\" && s.sebep !== \"DENEME_ORTAMI\")",
    koy: "(s.durum === \"ATLANDI\" && false)",
    bozdugu: "sir bozukken cekim hic kosmaz ve zamanlayici yesil gorur" },
  { ad: "CEKIM UCU ORTAM ANAHTARINA DONER", yon: "FAZLADAN", dosya: "src/app/api/cron/ty-cekim/route.ts",
    bul: "anahtar: { kimlik } })),",
    koy: "anahtar: \"ORTAM\" })),",
    bozdugu: "Trendyol cekimi her firma adina tek takim ortam anahtariyla kosar" },
  { ad: "KART BASKA HESABIN ANAHTARINI OKUR", yon: "KALDIRAN", dosya: "src/app/kart/[variantId]/actions.ts",
    bul: "const k = await hesabinKimligi(\"N11\", b.hesapId);",
    koy: "const k = await hesabinKimligi(\"N11\", \"baska-hesap\");",
    bozdugu: "N11 gonderimi baglamin buldugu hesabin degil baska bir kimligin anahtariyla yapilir" },
  { ad: "KART ORTAM OKUYUCUSUNU ICERI ALIR", yon: "FAZLADAN", dosya: "src/app/kart/[variantId]/actions.ts",
    bul: "import { hesabinKimligi, tekSatisHesabi } from \"@/lib/kanal-anahtari/hesaplar\";\n",
    koy: "import { hesabinKimligi, tekSatisHesabi } from \"@/lib/kanal-anahtari/hesaplar\";\nimport { kimlikOku } from \"../../../../scripts/ty/istemci\";\nvoid kimlikOku;\n",
    bozdugu: "ekran eylemi yeniden tek takim ortam anahtarina erisir" },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, { shell: true, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("\nKANAL ANAHTARI — MUTASYON TURU\n");

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
  console.log("  OK  Kanal anahtarı İKİ YÖNDEN sınandı, zararsız yeşil kaldı\n");
}
