/**
 * ============================================================================
 *  EKSİK SİPARİŞ ÖLÇÜMÜ — pazaryeri dökümü ↔ kendi defterimiz
 * ----------------------------------------------------------------------------
 *  Çalıştırma:
 *      npm run canli:eksik-siparis -- "dosya1.xlsx" "dosya2.csv" ...
 *
 *  SALT OKUMA. Hiçbir kayıt oluşturmaz, hiçbir alan değiştirmez.
 *
 *  ── NE ÖLÇER ────────────────────────────────────────────────────────────
 *  Pazaryerinin sipariş dökümündeki sipariş numaralarını `Sale.code` ile
 *  karşılaştırır ve DÖRT SAYIYI AYRI verir:
 *      · dosyada kaç sipariş var
 *      · kaçı sistemde VAR
 *      · kaçı sistemde YOK
 *      · kaç satır OKUNAMADI (sipariş no boş/bozuk)
 *
 *  ⚠ DÖRDÜNCÜSÜ ŞART. "Bulunamadı" ile "okunamadı" tek kefeye konursa
 *  en güçlü kanıt en zayıfla aynı ağırlığa iner: okunamayan satır bir
 *  eksiklik KANITI değil, bir SORUdur.
 *
 *  ── İKİ DAMGA BİRDEN ────────────────────────────────────────────────────
 *  Dosya ÜRETİLDİĞİ anda donar, defterimiz akmaya devam eder. Her kıyasta
 *  hem dosyanın kapsadığı pencere hem sistemin okunma anı basılır — yoksa
 *  çıkan rakam "sabit bir gerçek" sanılır, oysa fotoğraftır.
 *
 *  ⚠ İKİ DOSYA BİRBİRİYLE KIYASLANMAZ. Pencereleri farklıysa (TY 20 gün,
 *  HB 15 gün) rakamları yan yana koyup "şu kanal daha kötü" DENMEZ; her
 *  dosya kendi penceresinde okunur ve pencere ekranda yazar.
 * ============================================================================
 */

import { readFileSync } from "node:fs";
import { basename } from "node:path";

import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

type Okuma = {
  dosya: string;
  kanal: string;
  /** Dosyadan okunan benzersiz sipariş numaraları. */
  siparisler: Set<string>;
  /** Sipariş numarası çözülemeyen satır sayısı. */
  okunamayan: number;
  /** Dosyanın kapsadığı tarih aralığı — okunabildiyse. */
  pencere: string;
  satirSayisi: number;
};

/** Başlık adını gevşek karşılaştırma için normalleştirir. */
const nrm = (h: unknown) =>
  String(h ?? "")
    .trim()
    .toLocaleLowerCase("tr")
    .replace(/\s+/g, " ");

/** Sipariş numarası kolonunun adı pazaryerine göre değişir. */
const SIPARIS_BASLIKLARI = ["sipariş numarası", "siparis numarasi", "sipariş no"];
const TARIH_BASLIKLARI = ["sipariş tarihi", "siparis tarihi"];

/**
 * ⚠ SİPARİŞ NUMARASI DİZE OLARAK TUTULUR. Sayıya çevrilirse 12 haneli
 * numaralar kayan noktaya düşer ve son hane bozulur; ayrıca baştaki sıfır
 * kaybolur. `Sale.code` de dize.
 */
const temizNo = (v: unknown): string | null => {
  const s = String(v ?? "").trim();
  if (s === "" || s.toLowerCase() === "null") return null;
  /** Excel bazen "2.18277E+11" gibi bilimsel gösterim veriyor — bu OKUNAMAZ. */
  if (/e\+/i.test(s)) return null;
  const sade = s.replace(/[^0-9]/g, "");
  return sade.length >= 8 ? sade : null;
};

/**
 * CSV'yi TIRNAKLARA SAYGI DUYARAK satırlara böler.
 *
 * ⚠ NAİF `split("\n")` YETMEZ VE BU ÖLÇÜLDÜ (22.08.2026). Hepsiburada
 * dökümünde teslimat adresleri tırnak içinde SATIR SONU taşıyor: dosyanın
 * ham satır sayısı 62, gerçek kayıt sayısı 52. Naif bölme 10 parçayı ayrı
 * satır sanıp "9 satır okunamadı" diye rapor etti ve tarih penceresini
 * "Standart Teslimat" diye bastı — yani ölçüm, olmayan bir eksiklik
 * uydurdu. Ayrıştırıcı yanlışsa çıkan sayı da yanlıştır.
 */
function csvSatirlari(ham: string): string[][] {
  const satirlar: string[][] = [];
  let alanlar: string[] = [];
  let alan = "";
  let tirnakta = false;
  for (let i = 0; i < ham.length; i++) {
    const c = ham[i]!;
    if (tirnakta) {
      if (c === '"') {
        if (ham[i + 1] === '"') {
          alan += '"';
          i++;
        } else tirnakta = false;
      } else alan += c;
      continue;
    }
    if (c === '"') tirnakta = true;
    else if (c === ";") {
      alanlar.push(alan);
      alan = "";
    } else if (c === "\n") {
      alanlar.push(alan);
      alan = "";
      if (alanlar.some((a) => a.trim() !== "")) satirlar.push(alanlar);
      alanlar = [];
    } else if (c !== "\r") alan += c;
  }
  alanlar.push(alan);
  if (alanlar.some((a) => a.trim() !== "")) satirlar.push(alanlar);
  return satirlar;
}

function csvOku(yol: string, kanal: string): Okuma {
  const ham = readFileSync(yol, "utf8").replace(/^\ufeff/, "");
  const satirlar = csvSatirlari(ham);

  /** Başlık satırı: sipariş numarası kolonunu taşıyan İLK satır. */
  let basIdx = -1;
  let kolon = -1;
  let tarihKolon = -1;
  for (let i = 0; i < Math.min(5, satirlar.length); i++) {
    const alanlar = satirlar[i]!.map(nrm);
    const k = alanlar.findIndex((a) => SIPARIS_BASLIKLARI.includes(a));
    if (k >= 0) {
      basIdx = i;
      kolon = k;
      tarihKolon = alanlar.findIndex((a) => TARIH_BASLIKLARI.includes(a));
      break;
    }
  }
  if (basIdx < 0) {
    throw new Error(
      `${basename(yol)}: "Sipariş Numarası" kolonu bulunamadı — dosya biçimi değişmiş olabilir. Ölçüm YAPILMADI (boş sonuç "temiz" sayılmasın).`,
    );
  }

  const siparisler = new Set<string>();
  const tarihler: string[] = [];
  let okunamayan = 0;
  const veri = satirlar.slice(basIdx + 1);
  for (const alanlar of veri) {
    const no = temizNo(alanlar[kolon]);
    if (no === null) okunamayan++;
    else siparisler.add(no);
    if (tarihKolon >= 0) {
      const t = String(alanlar[tarihKolon] ?? "").trim();
      /** ⚠ Tarih gibi görünmeyen değer pencereye KARIŞMAZ. */
      if (/^\d{2}[-.]\d{2}[-.]\d{4}/.test(t)) tarihler.push(t);
    }
  }
  /** Gün-ay-yıl metnini sıralanabilir hâle getirip pencereyi kurar. */
  const sirali = [...tarihler].sort((a, b) => {
    const d = (x: string) => x.slice(6, 10) + x.slice(3, 5) + x.slice(0, 2) + x.slice(10);
    return d(a).localeCompare(d(b));
  });
  return {
    dosya: basename(yol),
    kanal,
    siparisler,
    okunamayan,
    pencere:
      sirali.length > 0
        ? `${sirali[0]} → ${sirali[sirali.length - 1]}`
        : "(tarih kolonu okunamadı)",
    satirSayisi: veri.length,
  };
}

async function xlsxOku(yol: string, kanal: string): Promise<Okuma> {
  const { paketiNormalle } = await import("../src/lib/tablo/paket");
  const readXlsxFile = (await import("read-excel-file/node")).default;
  const { bayt } = paketiNormalle(readFileSync(yol));
  const sayfalar = (await readXlsxFile(bayt)) as unknown as {
    sheet: string;
    data: unknown[][];
  }[];

  for (const s of sayfalar) {
    const d = s.data ?? [];
    /** Başlık satırı ilk satır OLMAYABİLİR — TY dosyası yasal uyarıyla başlıyor. */
    for (let i = 0; i < Math.min(10, d.length); i++) {
      const baslik = (d[i] ?? []).map(nrm);
      const kolon = baslik.findIndex((a) => SIPARIS_BASLIKLARI.includes(a));
      if (kolon < 0) continue;
      const tarihKolon = baslik.findIndex((a) => TARIH_BASLIKLARI.includes(a));

      const siparisler = new Set<string>();
      const tarihler: string[] = [];
      let okunamayan = 0;
      const veri = d.slice(i + 1).filter((r) => r.some((c) => c !== null && c !== ""));
      for (const r of veri) {
        const no = temizNo(r[kolon]);
        if (no === null) okunamayan++;
        else siparisler.add(no);
        if (tarihKolon >= 0) {
          const t = r[tarihKolon];
          if (t instanceof Date) tarihler.push(t.toISOString().slice(0, 10));
          else if (t !== null && String(t).trim() !== "") tarihler.push(String(t));
        }
      }
      tarihler.sort();
      return {
        dosya: basename(yol),
        kanal,
        siparisler,
        okunamayan,
        pencere:
          tarihler.length > 0
            ? `${tarihler[0]} → ${tarihler[tarihler.length - 1]}`
            : "(tarih kolonu okunamadı)",
        satirSayisi: veri.length,
      };
    }
  }
  throw new Error(
    `${basename(yol)}: "Sipariş Numarası" kolonu hiçbir sayfada bulunamadı. Ölçüm YAPILMADI.`,
  );
}

/** Dosya adından kanalı tahmin eder — bulamazsa "?" der, uydurmaz. */
function kanalTahmini(yol: string): string {
  const ad = basename(yol).toLocaleLowerCase("tr");
  if (ad.includes("trendyol")) return "Trendyol";
  if (ad.includes("hepsiburada")) return "Hepsiburada";
  if (ad.includes("n11")) return "N11";
  return "?";
}

async function main() {
  const dosyalar = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  if (dosyalar.length === 0) {
    console.log("Kullanım: npm run canli:eksik-siparis -- \"dosya.xlsx\" ...");
    process.exitCode = 1;
    return;
  }

  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");

  const okumaAni = new Date();
  console.log("");
  console.log("EKSİK SİPARİŞ ÖLÇÜMÜ — salt okuma");
  console.log("  hedef        " + y.veri.adres.hostname);
  console.log("  sistem okuma " + okumaAni.toISOString().slice(0, 19).replace("T", " "));

  /** Sistemdeki BÜTÜN sipariş numaraları — iptalliler DAHİL. */
  const satislar = await prisma.sale.findMany({
    select: {
      code: true,
      iptalTarihi: true,
      channelAccount: { select: { channel: { select: { name: true } } } },
    },
  });
  const sistemdekiler = new Set(
    satislar.map((s) => s.code).filter((c): c is string => c !== null),
  );
  const iptalliler = new Set(
    satislar
      .filter((s) => s.iptalTarihi !== null)
      .map((s) => s.code)
      .filter((c): c is string => c !== null),
  );
  console.log(
    `  sistemde     ${satislar.length} satış (${iptalliler.size} iptalli), ${sistemdekiler.size} sipariş numarası`,
  );

  for (const yol of dosyalar) {
    const kanal = kanalTahmini(yol);
    let o: Okuma;
    try {
      o = yol.toLowerCase().endsWith(".csv")
        ? csvOku(yol, kanal)
        : await xlsxOku(yol, kanal);
    } catch (e) {
      console.log("");
      console.log(`  ⚠ ${basename(yol)} — ${(e as Error).message}`);
      process.exitCode = 1;
      continue;
    }

    const varOlan: string[] = [];
    const eksik: string[] = [];
    for (const no of o.siparisler) {
      (sistemdekiler.has(no) ? varOlan : eksik).push(no);
    }

    console.log("");
    console.log("  " + "─".repeat(66));
    console.log(`  ${o.kanal.toUpperCase()} · ${o.dosya}`);
    console.log(`     dosya penceresi   ${o.pencere}`);
    console.log(`     okunan satır      ${o.satirSayisi}`);
    console.log(`     benzersiz sipariş ${o.siparisler.size}`);
    console.log(`     ├─ sistemde VAR   ${varOlan.length}`);
    console.log(`     ├─ sistemde YOK   ${eksik.length}`);
    console.log(
      `     └─ OKUNAMADI      ${o.okunamayan}` +
        (o.okunamayan > 0 ? "  ⚠ bunlar eksiklik KANITI değil, ayrı bakılmalı" : ""),
    );
    if (o.siparisler.size > 0) {
      const oran = (eksik.length / o.siparisler.size) * 100;
      console.log(`     eksik oranı       %${oran.toFixed(1)}`);
    }
    if (eksik.length > 0) {
      console.log(`     ilk 15 eksik sipariş:`);
      for (const no of eksik.slice(0, 15)) console.log(`        ${no}`);
      if (eksik.length > 15) console.log(`        ... ve ${eksik.length - 15} tane daha`);
    }
  }

  console.log("");
  console.log("  ⚠ İKİ DOSYA BİRBİRİYLE KIYASLANMAZ: pencereleri farklıysa");
  console.log("    rakamları yan yana koyup 'şu kanal daha kötü' denmez.");
  console.log("  ⚠ Dosya ÜRETİLDİĞİ anda dondu, defter AKMAYA devam ediyor.");
  console.log("");

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("Hata:", String(e).split("\n")[0]);
  process.exitCode = 1;
});
