/**
 * ============================================================================
 *  EKSİK SİPARİŞ DÖKÜMÜ — ELLE GİRİŞ İÇİN
 * ----------------------------------------------------------------------------
 *  Çalıştırma:
 *      npm run canli:eksik-liste -- "dosya1.xlsx" "dosya2.csv" ...
 *
 *  SALT OKUMA. Hiçbir kayıt oluşturmaz.
 *
 *  ── NİYE VAR ────────────────────────────────────────────────────────────
 *  Kullanıcı kararı 22.08.2026: _"elle gireceğim, bana eksikleri ver."_
 *  Yani KOD VERİYİ GİRMEZ — neyin eksik olduğunu ve o kaydı doldurmak için
 *  gereken her alanı gösterir. Giriş kullanıcının elinden çıkar.
 *
 *  `canli:eksik-siparis` KAÇ tane eksik olduğunu sayar; bu betik HANGİLERİ
 *  olduğunu ve NE YAZILACAĞINI döker.
 *
 *  ── MÜŞTERİ VERİSİ DIŞARIDA KALIR ───────────────────────────────────────
 *  ⚠ Dökümlerde alıcı adı, adres, e-posta, telefon, TCKN VAR. Listeye
 *  GİRMİYORLAR: satış kaydı için gerekli değiller ve gereksiz yere
 *  kopyalanan kişisel veri, sızdığında hiçbir işe yaramadan zarar verir.
 *  Yalnız satış formunun sorduğu alanlar taşınır.
 *
 *  ── DURUM SESSİZCE GEÇİLMEZ ─────────────────────────────────────────────
 *  ⚠ Trendyol dökümünde "Teslim Edilemedi", Hepsiburada'da "İade edildi mi?"
 *  sütunu var. Bunlar satış olarak girilir AMA ardından iade işlenmelidir;
 *  körü körüne girilirse stok yanlış düşer ve kâr şişer. Liste bunları AYRI
 *  bir sütunda işaretler ve özet satırında sayar.
 *
 *  ── ÇIKTI ───────────────────────────────────────────────────────────────
 *  `veri/ozel/eksik-siparisler-<kanal>.csv` (gitignore'da) — Excel'de açılır.
 *  Noktalı virgülle ayrılır ve BOM taşır; Türkçe Excel doğrudan açar.
 * ============================================================================
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";
import { csvSatirlari, nrm, temizNo } from "./canli-eksik-siparis";

const CIKTI_KLASORU = "veri/ozel";

/**
 * KANAL BAŞINA KOLON EŞLEMESİ.
 *
 * ⚠ KOLON ADIYLA ARANIR, İNDEKSLE DEĞİL. Pazaryeri kolon eklediğinde indeks
 * kayar ve sessizce yanlış alan okunur; ad değişirse betik DURUR ve söyler.
 * "Kolon başlığı bir iddiadır" dersi: aranan ad bulunamazsa ölçüm yapılmaz.
 */
type Alan = { baslik: string[]; zorunlu: boolean };

const ORTAK_ALANLAR: Record<string, Alan> = {
  siparisNo: { baslik: ["sipariş numarası"], zorunlu: true },
  tarih: { baslik: ["sipariş tarihi"], zorunlu: true },
  barkod: { baslik: ["barkod"], zorunlu: false },
  stokKodu: { baslik: ["stok kodu", "satıcı stok kodu"], zorunlu: false },
  urunAdi: { baslik: ["ürün adı"], zorunlu: false },
  adet: { baslik: ["adet"], zorunlu: false },
  kargoFirmasi: { baslik: ["kargo firması"], zorunlu: false },
};

const TY_ALANLAR: Record<string, Alan> = {
  ...ORTAK_ALANLAR,
  birimFiyat: { baslik: ["birim fiyatı"], zorunlu: false },
  tutar: { baslik: ["faturalanacak tutar"], zorunlu: false },
  komisyonOrani: { baslik: ["komisyon oranı"], zorunlu: false },
  desi: { baslik: ["hesapladığım desi", "kargodan alınan desi"], zorunlu: false },
  durum: { baslik: ["sipariş statüsü"], zorunlu: false },
};

const HB_ALANLAR: Record<string, Alan> = {
  ...ORTAK_ALANLAR,
  birimFiyat: { baslik: ["faturalandırılacak birim satış fiyatı"], zorunlu: false },
  tutar: { baslik: ["faturalandırılacak satış fiyatı"], zorunlu: false },
  /** ⚠ HB oran değil TUTAR veriyor ve KDV DAHİL. Satış formu tutar da kabul eder. */
  komisyonTutari: { baslik: ["komisyon tutarı (kdv dahil)"], zorunlu: false },
  desi: { baslik: ["desi"], zorunlu: false },
  durum: { baslik: ["paket durumu"], zorunlu: false },
  iade: { baslik: ["i̇ade edildi mi?", "iade edildi mi?"], zorunlu: false },
};

/** Çıktı sütunları — sırası ekranda göreceğin sıra. */
const CIKTI_SUTUNLARI = [
  "siparisNo",
  "tarih",
  "durum",
  "iade",
  "barkod",
  "stokKodu",
  "urunAdi",
  "adet",
  "birimFiyat",
  "tutar",
  "komisyonOrani",
  "komisyonTutari",
  "kargoFirmasi",
  "desi",
];

type Satir = Record<string, string>;

function alanlariCoz(
  basliklar: string[],
  tanim: Record<string, Alan>,
  dosya: string,
): Map<string, number> {
  const dizin = new Map<string, number>();
  const eksik: string[] = [];
  for (const [ad, alan] of Object.entries(tanim)) {
    const i = basliklar.findIndex((b) => alan.baslik.includes(b));
    if (i >= 0) dizin.set(ad, i);
    else if (alan.zorunlu) eksik.push(alan.baslik[0]!);
  }
  if (eksik.length > 0) {
    throw new Error(
      `${dosya}: zorunlu kolon(lar) bulunamadı — ${eksik.join(", ")}. ` +
        `Dosya biçimi değişmiş olabilir; DÖKÜM YAPILMADI (eksik liste "temiz" sanılmasın).`,
    );
  }
  return dizin;
}

function satirlariKur(
  veri: string[][],
  dizin: Map<string, number>,
): Map<string, Satir[]> {
  const gruplar = new Map<string, Satir[]>();
  for (const r of veri) {
    const no = temizNo(r[dizin.get("siparisNo")!]);
    if (no === null) continue;
    const satir: Satir = {};
    for (const sutun of CIKTI_SUTUNLARI) {
      const i = dizin.get(sutun);
      satir[sutun] = i === undefined ? "" : String(r[i] ?? "").trim();
    }
    satir.siparisNo = no;
    const liste = gruplar.get(no) ?? [];
    liste.push(satir);
    gruplar.set(no, liste);
  }
  return gruplar;
}

function kanalTahmini(yol: string): "Trendyol" | "Hepsiburada" | "?" {
  const ad = basename(yol).toLocaleLowerCase("tr");
  if (ad.includes("trendyol")) return "Trendyol";
  if (ad.includes("hepsiburada")) return "Hepsiburada";
  return "?";
}

async function dosyaOku(yol: string): Promise<{
  kanal: string;
  gruplar: Map<string, Satir[]>;
}> {
  const kanal = kanalTahmini(yol);
  if (kanal === "?") {
    throw new Error(
      `${basename(yol)}: kanal dosya adından anlaşılamadı (trendyol/hepsiburada). DÖKÜM YAPILMADI.`,
    );
  }
  const tanim = kanal === "Trendyol" ? TY_ALANLAR : HB_ALANLAR;

  if (yol.toLowerCase().endsWith(".csv")) {
    const satirlar = csvSatirlari(readFileSync(yol, "utf8").replace(/^﻿/, ""));
    for (let i = 0; i < Math.min(5, satirlar.length); i++) {
      const basliklar = satirlar[i]!.map(nrm);
      if (!basliklar.includes("sipariş numarası")) continue;
      const dizin = alanlariCoz(basliklar, tanim, basename(yol));
      return { kanal, gruplar: satirlariKur(satirlar.slice(i + 1), dizin) };
    }
    throw new Error(`${basename(yol)}: başlık satırı bulunamadı. DÖKÜM YAPILMADI.`);
  }

  const { paketiNormalle } = await import("../src/lib/tablo/paket");
  const readXlsxFile = (await import("read-excel-file/node")).default;
  const { bayt } = paketiNormalle(readFileSync(yol));
  const sayfalar = (await readXlsxFile(bayt)) as unknown as {
    sheet: string;
    data: unknown[][];
  }[];
  for (const s of sayfalar) {
    const d = s.data ?? [];
    for (let i = 0; i < Math.min(10, d.length); i++) {
      const basliklar = (d[i] ?? []).map(nrm);
      if (!basliklar.includes("sipariş numarası")) continue;
      const dizin = alanlariCoz(basliklar, tanim, basename(yol));
      const veri = d
        .slice(i + 1)
        .filter((r) => r.some((c) => c !== null && c !== ""))
        .map((r) =>
          r.map((c) =>
            c instanceof Date ? c.toISOString().slice(0, 10) : String(c ?? ""),
          ),
        );
      return { kanal, gruplar: satirlariKur(veri, dizin) };
    }
  }
  throw new Error(`${basename(yol)}: başlık satırı bulunamadı. DÖKÜM YAPILMADI.`);
}

/** CSV alanı — noktalı virgül ve tırnak kaçışıyla. */
const alan = (v: string) =>
  /[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;

async function main() {
  const dosyalar = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  if (dosyalar.length === 0) {
    console.log('Kullanım: npm run canli:eksik-liste -- "dosya.xlsx" ...');
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
  console.log("EKSİK SİPARİŞ DÖKÜMÜ — elle giriş için");
  console.log("  hedef        " + y.veri.adres.hostname);
  console.log("  sistem okuma " + okumaAni.toISOString().slice(0, 19).replace("T", " "));

  const satislar = await prisma.sale.findMany({ select: { code: true } });
  const sistemdekiler = new Set(
    satislar.map((s) => s.code).filter((c): c is string => c !== null),
  );

  mkdirSync(CIKTI_KLASORU, { recursive: true });

  for (const yol of dosyalar) {
    let okuma: { kanal: string; gruplar: Map<string, Satir[]> };
    try {
      okuma = await dosyaOku(yol);
    } catch (e) {
      console.log("");
      console.log(`  ⚠ ${(e as Error).message}`);
      process.exitCode = 1;
      continue;
    }

    const eksikler = [...okuma.gruplar.entries()].filter(
      ([no]) => !sistemdekiler.has(no),
    );
    /** Tarihe göre sırala — elle girerken kronolojik gitmek doğal. */
    eksikler.sort((a, b) => (a[1][0]!.tarih ?? "").localeCompare(b[1][0]!.tarih ?? ""));

    const satirlar = eksikler.flatMap(([, s]) => s);
    const sorunlular = satirlar.filter(
      (s) =>
        /teslim edilemedi|iptal/i.test(s.durum ?? "") ||
        /evet|true|1/i.test(s.iade ?? ""),
    );

    console.log("");
    console.log("  " + "─".repeat(66));
    console.log(`  ${okuma.kanal.toUpperCase()} · ${basename(yol)}`);
    console.log(`     dosyadaki sipariş   ${okuma.gruplar.size}`);
    console.log(`     sistemde YOK        ${eksikler.length}`);
    console.log(`     kalem satırı        ${satirlar.length}`);
    console.log(
      `     ⚠ DİKKAT gereken   ${sorunlular.length}` +
        (sorunlular.length > 0
          ? "  (teslim edilemedi / iade — satış girilip İADE de işlenmeli)"
          : ""),
    );

    const cikti = join(
      CIKTI_KLASORU,
      `eksik-siparisler-${okuma.kanal.toLocaleLowerCase("tr")}.csv`,
    );
    const govde = [
      CIKTI_SUTUNLARI.join(";"),
      ...satirlar.map((s) => CIKTI_SUTUNLARI.map((k) => alan(s[k] ?? "")).join(";")),
    ].join("\n");
    writeFileSync(cikti, "﻿" + govde, "utf8");
    console.log(`     → ${cikti}`);
  }

  console.log("");
  console.log("  ⚠ MÜŞTERİ VERİSİ DÖKÜME GİRMEDİ (ad, adres, e-posta, telefon).");
  console.log("  ⚠ Dosya ÜRETİLDİĞİ anda dondu, defter AKMAYA devam ediyor:");
  console.log("    aynı dökümü yarın koşarsan sayı DEĞİŞİR ve bu bozulma değildir.");
  console.log("");

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("Hata:", String(e).split("\n")[0]);
  process.exitCode = 1;
});
