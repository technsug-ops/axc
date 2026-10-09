import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  PAZARYERİ İLAN ADRESİ — MUTASYON HARNESS'I (07.10.2026)
 * ----------------------------------------------------------------------------
 *      npm run ilan-adresi-mutasyon:kontrol
 *  `ilan-adresi:dogrula`nın dişini sınar. ÜÇ YÖN: zararsız · kaldıran ·
 *  fazladan. Çapası tutmayan mutasyon «ölçülemedi» sayılır, yeşil DEĞİL.
 * ============================================================================
 */

const BEKCI = "scripts/ilan-adresi-dogrula.ts";
const BEKCI_BASLIGI = "PAZARYERİ İLAN ADRESİ (07.10.2026)";
const GOVDE = "src/lib/kanal-ilan-adresi.ts";
const TY_YAZ = "src/lib/kanal-listeleme-yaz.ts";
const ORTAK_YAZ = "src/lib/kanal-listeleme-hb-yaz.ts";
const N11 = "scripts/canli-n11-listeleme-yaz.ts";
const LISTE = "src/app/urunler/page.tsx";
const EYLEM = "src/app/ayarlar/kanallar/actions.ts";

type Mutasyon = { ad: string; yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN"; dosya: string; bul: string; koy: string; bozdugu: string };

const MUTASYONLAR: Mutasyon[] = [
  { ad: "ZARARSIZ - govde yorumu", yon: "ZARARSIZ", dosya: GOVDE,
    bul: "/** Firma hiç seçmediyse — kullanıcının verdiği sıra. */", koy: "/** Varsayılan sıra. */", bozdugu: "hicbir sey" },
  { ad: "TY ADRESI BARKODDAN UYDURULUYOR", yon: "FAZLADAN", dosya: GOVDE,
    bul: "    k.externalListingId && /^\\d+$/.test(k.externalListingId.trim())\n      ? `https://www.trendyol.com/", koy: "    true\n      ? `https://www.trendyol.com/", bozdugu: "kimliksiz urunde bos/yanlis link" },
  { ad: "SECIM TAVANI KALKTI", yon: "FAZLADAN", dosya: GOVDE,
    bul: "    if (sonuc.length === LISTE_KANALI_TAVANI) break;\n", koy: "", bozdugu: "liste hucresi tasar" },
  { ad: "TY YAZICI KIMLIGI YAZMIYOR", yon: "KALDIRAN", dosya: TY_YAZ,
    bul: "          externalListingId: k.ilan,\n", koy: "", bozdugu: "TY linkleri hic dolmaz" },
  { ad: "TY ILAN KALKINCA KIMLIK KALIYOR", yon: "KALDIRAN", dosya: TY_YAZ,
    bul: "kanalKdvOrani: null, externalListingId: null, kanalOlcumAt: an }", koy: "kanalKdvOrani: null, kanalOlcumAt: an }", bozdugu: "olu ilana link kalir" },
  { ad: "ORTAK YAZICI HB KIMLIGINI EZIYOR", yon: "FAZLADAN", dosya: ORTAK_YAZ,
    bul: "...(g.ilanKimligi === undefined ? {} : { externalListingId: g.ilanKimligi }),", koy: "externalListingId: g.ilanKimligi ?? null,", bozdugu: "HB satirlarinin kimligi her turda silinir" },
  { ad: "N11 KIMLIK FARKINI GORMUYOR", yon: "KALDIRAN", dosya: N11,
    bul: " || s.externalListingId !== bulunan.ilan) {", koy: ") {", bozdugu: "durum degismeyen N11 urununun linki hic dolmaz" },
  { ad: "TELEFON KARTINDA SUTUN YOK", yon: "KALDIRAN", dosya: LISTE,
    bul: "? [{ etiket: tPazaryeri(\"sutun\"), deger: <PazaryeriLinkleri satirlar={pazaryeriSatirlari(ana?.id)} metin={pazaryeriMetni} /> }]", koy: "? []", bozdugu: "telefonda link gorunmez" },
  { ad: "AYAR KODU DOGRULAMIYOR", yon: "FAZLADAN", dosya: EYLEM,
    bul: "    if (!gecerli.has(kod)) return { hata: tListe(\"gecersizKanal\") };\n", koy: "", bozdugu: "formdan gelen bilinmeyen kod firmaya yazilir" },
  /* ═══ K320 (09.10.2026) — mağaza adı + N11 groupId ═══ */
  { ad: "ZARARSIZ - magaza adi eylemi yorumu", yon: "ZARARSIZ", dosya: EYLEM,
    bul: "export type MagazaAdiDurumu = { hata?: string; basari?: string };", koy: "export type MagazaAdiDurumu = { hata?: string; basari?: string }; // K320", bozdugu: "hicbir sey" },
  { ad: "HB LINKI MAGAZA BELIRTMIYOR (buybox'a gider)", yon: "KALDIRAN", dosya: GOVDE,
    bul: "x-p-${kodla(k.channelSku)}${magazaEki(k)}`", koy: "x-p-${kodla(k.channelSku)}`", bozdugu: "HB ilani bizim degil one cikan magazayla acilir - Halil'in bildirdigi ariza" },
  { ad: "N11 LINKI MAGAZA BELIRTMIYOR", yon: "KALDIRAN", dosya: GOVDE,
    bul: "/urun/x-${kodla(k.externalListingId)}${magazaEki(k)}`", koy: "/urun/x-${kodla(k.externalListingId)}`", bozdugu: "N11 ilani bizim magazamizla acilmaz" },
  { ad: "BOS MAGAZA ADI DA EK URETIYOR", yon: "FAZLADAN", dosya: GOVDE,
    bul: "(k.magazaAdi && k.magazaAdi.trim() !== \"\" ? `?magaza=", koy: "(true ? `?magaza=", bozdugu: "ad yokken ?magaza=null gibi uydurma link" },
  { ad: "MAGAZA ADI KODLANMIYOR", yon: "FAZLADAN", dosya: GOVDE,
    bul: "`?magaza=${kodla(k.magazaAdi)}`", koy: "`?magaza=${k.magazaAdi}`", bozdugu: "ozel karakterli ad adresi bozar" },
  { ad: "TY DE MAGAZA KUTUSU KUMESINE GIRDI (kalip kullanmiyor)", yon: "FAZLADAN", dosya: GOVDE,
    bul: "= [\"HEPSIBURADA\", \"N11\"];", koy: "= [\"HEPSIBURADA\", \"N11\", \"TRENDYOL\"];", bozdugu: "ekranda ise yaramayan kutu cikar; kullanici yazar ama link degismez" },
  { ad: "N11 YINE n11ProductId OKUYOR (ana sayfa)", yon: "FAZLADAN", dosya: N11,
    bul: "    const ilan = l.groupId === null || l.groupId === undefined || String(l.groupId).trim() === \"\" ? null : String(l.groupId).trim();",
    koy: "    const ilan = l.n11ProductId === null || l.n11ProductId === undefined || String(l.n11ProductId).trim() === \"\" ? null : String(l.n11ProductId).trim();",
    bozdugu: "N11 linki ana sayfaya duser - Halil'in bildirdigi ariza" },
  { ad: "N11 MAGAZA ADINI YAZMIYOR (betik)", yon: "KALDIRAN", dosya: N11,
    bul: "  } else if ((await kanalMagazaAdiniYaz(prisma, hesap, magaza)) !== null) {", koy: "  } else if (false) {", bozdugu: "N11 linki magaza belirtmez; kanal adi verdigi halde bos kalir" },
  { ad: "N11 MAGAZA ADINI YAZMIYOR (govde)", yon: "KALDIRAN", dosya: "src/lib/kanal-magaza-adi.ts",
    bul: "  await db.channelAccount.update({ where: { id: hesap.id }, data: { magazaAdi: ad } });\n", koy: "", bozdugu: "govde 'yazildi' der ama yazmaz" },
  { ad: "N11 BIRDEN COK AD GELINCE BIRINI SECIYOR", yon: "FAZLADAN", dosya: "src/lib/kanal-magaza-adi.ts",
    bul: "  return kume.size === 1 ? [...kume][0]! : null;", koy: "  return kume.size >= 1 ? [...kume][0]! : null;", bozdugu: "iki magaza karisinca biri sessizce secilir" },
  { ad: "N11 BOS AD DA SAYILIYOR", yon: "FAZLADAN", dosya: "src/lib/kanal-magaza-adi.ts",
    bul: ".filter((a) => a !== \"\"));", koy: ");", bozdugu: "bos ad tek gercek adi 'cok ad' yapar ya da bos yazilir" },
  { ad: "EYLEM LINKI BOZAN KARAKTERI KABUL EDIYOR", yon: "KALDIRAN", dosya: EYLEM,
    bul: "  if (/[\\s?&/#]/.test(ham)) return { hata: tMagaza(\"gecersiz\") };\n", koy: "", bozdugu: "bosluklu/&'li ad linki sessizce bozar" },
  { ad: "EYLEM ALIS HESABINA DA YAZIYOR", yon: "FAZLADAN", dosya: EYLEM,
    bul: "  if (!hesap.satisIcin) return { hata: tMagaza(\"yalnizSatis\") };\n", koy: "", bozdugu: "alis hesabina anlamsiz magaza adi yazilir" },
  { ad: "EYLEM FORMU OKUMUYOR", yon: "KALDIRAN", dosya: EYLEM,
    bul: "  const ham = String(formData.get(\"magazaAdi\") ?? \"\").trim();", koy: "  const ham = \"\";", bozdugu: "kullanici yazar, kaydet der, ad silinir" },
  { ad: "FORM KAYITLI ADI GERI VERMIYOR", yon: "KALDIRAN", dosya: "src/app/ayarlar/kanallar/magaza-adi-formu.tsx",
    bul: "defaultValue={hesap.magazaAdi ?? \"\"}", koy: "defaultValue=\"\"", bozdugu: "kutu bos gorunur, kaydedince ad silinir" },
  { ad: "URUNLER LINKE MAGAZA ADINI GECMIYOR", yon: "KALDIRAN", dosya: LISTE,
    bul: ", magazaAdi: k.channelAccount.magazaAdi });", koy: ", magazaAdi: null });", bozdugu: "ad kayitli oldugu halde link magaza belirtmez" },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, { shell: true, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("\nILAN ADRESI - MUTASYON TURU (07.10.2026)\n");
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
else console.log("\n  OK  Ilan adresi UC YONDEN sinandi, kirmizi yandigi GORULDU.\n");
