import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

import { betikAdresi } from "../src/lib/veritabani-adresi";
import { etkinTarihiCoz } from "../src/lib/kargo-tarife-pdf/pdf-oku";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  TRENDYOL KARGO TARİFESİ YÜKLEME (PDF) — CANLI
 * ----------------------------------------------------------------------------
 *      Kuru koşum:  npx tsx scripts/canli-ty-kargo-tarifesi-yukle.ts "C:\...\guncel_kargo_fiyatlari-….pdf"
 *      Yazım:       … aynı komut --uygula
 *
 *  BETIK SINIFI: TEK_SEFERLIK — Trendyol'un satıcı panelinden indirilen
 *  «güncel kargo fiyatları» PDF'ini `CargoTariff`a YENİ BİR SÜRÜM olarak yazar
 *  (geçerlilik tarihi PDF'in kendi «… İTİBARIYLA GEÇERLİ» satırından). Eski
 *  sürümler SİLİNMEZ: kâr motoru satışın gününe göre doğru sürümü seçer
 *  (`effectiveFrom <= soldAt`, K201-4). Kullanıcı isteği 07.10.2026: tablodaki
 *  tek TY sürümü 16.07.2026'dı; TEX 5 desi 107,98 ↔ PDF 114,10.
 *
 *  ⛔ SÜTUN HİZASI KONUMLA: 100 desiden sonra bazı firmaların sütunu BOŞ
 *  (ör. 101 desi satırında PTT ve TEX yok). Sıra numarasıyla okumak rakamı
 *  yanlış firmaya yazardı; her rakam başlıktaki EN YAKIN firma sütununa x
 *  konumuyla bağlanır. Kuru koşum bilinen değerleri (PDF'ten göz göze) sınar.
 *
 *  ⛔ AYNI TARİHLİ SÜRÜM VARSA YAZMAZ — üzerine yazma yok; durur ve söyler.
 *  ⛔ TUTARLAR KDV HARİÇ (PDF başlığı) — eski sürümle aynı taban.
 *  Ham dosya `veri/ozel/arsiv/` altına kopyalanır (kaynakta ne vardı).
 * ============================================================================
 */

const UYGULA = process.argv.includes("--uygula");
const DOSYA = process.argv.find((a) => a.toLowerCase().endsWith(".pdf"));

/** PDF başlığındaki ad → `CargoCarrier.code` (ilk kurulumun eşlemesiyle aynı: seed-kar-motoru). */
const BASLIK_KODU: Record<string, string> = {
  Aras: "ARAS",
  "DHL eCommerce": "DHL",
  "Kolay Gelsin": "KOLAY_GELSIN",
  PTT: "PTT",
  Sürat: "SURAT",
  TEX: "TEX",
  Yurtiçi: "YURTICI",
  /* PDF'teki «CEVA» = sistemdeki «CEVA Lojistik»; «CEVA Tedarik» PDF'te yok, eski sürümü kalır. */
  CEVA: "CEVA",
  Horoz: "HOROZ",
};

type Oge = { str: string; x: number; y: number };

async function pdfOku(bayt: Uint8Array) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({ data: bayt, useWorkerFetch: false, isEvalSupported: false, disableFontFace: true }).promise;
  let etkin: Date | null = null;
  const satirlar = new Map<number, Map<string, number>>(); // desi → (kod → tutar)
  const sorunlar: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const c = await (await doc.getPage(p)).getTextContent();
    const ogeler: Oge[] = (c.items as { str: string; transform: number[] }[])
      .filter((it) => it.str.trim() !== "")
      .map((it) => ({ str: it.str.trim(), x: it.transform[4]!, y: Math.round(it.transform[5]!) }));
    if (!etkin) {
      const birlesik = ogeler.filter((o) => o.y === ogeler[0]!.y).map((o) => o.str).join(" ");
      etkin = etkinTarihiCoz(birlesik) ?? etkinTarihiCoz(ogeler.map((o) => o.str).join(" "));
    }
    const baslikY = ogeler.find((o) => o.str === "Desi/KG")?.y;
    if (baslikY === undefined) continue; // tablo olmayan sayfa
    const basliklar = ogeler.filter((o) => o.y === baslikY && o.str in BASLIK_KODU);
    if (basliklar.length !== Object.keys(BASLIK_KODU).length) {
      sorunlar.push(`sayfa ${p}: başlıkta ${basliklar.length} firma bulundu (${Object.keys(BASLIK_KODU).length} beklenir)`);
      continue;
    }
    const satirY = [...new Set(ogeler.filter((o) => o.y < baslikY).map((o) => o.y))];
    for (const y of satirY) {
      const satir = ogeler.filter((o) => o.y === y).sort((a, b) => a.x - b.x);
      const desiOge = satir[0]!;
      if (!/^\d+$/.test(desiOge.str)) continue; // notlar
      const desi = Number(desiOge.str);
      const harita = satirlar.get(desi) ?? new Map<string, number>();
      for (const o of satir.slice(1)) {
        const tutar = Number(o.str.replace(",", "."));
        if (!Number.isFinite(tutar)) { sorunlar.push(`desi ${desi}: sayı değil «${o.str}»`); continue; }
        /* Hücre metni sağa ya da ortaya hizalı olabilir — başlık merkezine en yakın sütun. */
        const enYakin = basliklar.reduce((a, b) => (Math.abs(b.x - o.x) < Math.abs(a.x - o.x) ? b : a));
        const kod = BASLIK_KODU[enYakin.str]!;
        if (harita.has(kod)) sorunlar.push(`desi ${desi}: ${kod} iki kez (hiza şüpheli)`);
        harita.set(kod, tutar);
      }
      satirlar.set(desi, harita);
    }
  }
  return { etkin, satirlar, sorunlar };
}

async function main() {
  if (!DOSYA || !existsSync(DOSYA)) throw new Error("PDF yolu verilmedi ya da dosya yok");
  const { etkin, satirlar, sorunlar } = await pdfOku(new Uint8Array(readFileSync(DOSYA)));
  if (!etkin) throw new Error("PDF'te geçerlilik tarihi bulunamadı — hiçbir şey yazılmadı");
  console.log(`\nTY KARGO TARİFESİ · ${UYGULA ? "⚠ YAZIM" : "KURU KOŞUM"}`);
  console.log(`  dosya        ${basename(DOSYA)}`);
  console.log(`  geçerlilik   ${etkin.toISOString().slice(0, 10)} (UTC gece yarısı — eski sürümlerle aynı kural)`);
  console.log(`  desi satırı  ${satirlar.size} (${Math.min(...satirlar.keys())}..${Math.max(...satirlar.keys())})`);
  const firmaSay = new Map<string, number[]>();
  for (const [desi, h] of satirlar) for (const kod of h.keys()) firmaSay.set(kod, [...(firmaSay.get(kod) ?? []), desi]);
  for (const [kod, d] of [...firmaSay].sort()) console.log(`  ${kod.padEnd(13)} ${String(d.length).padStart(4)} satır · desi ${Math.min(...d)}..${Math.max(...d)}`);

  /* Göz göze sınama — PDF'ten okunarak yazıldı (07.10.2026). Tutmazsa YAZMAZ. */
  const beklenen: [number, string, number][] = [
    [5, "TEX", 114.1], [1, "TEX", 81.95], [1, "ARAS", 88.96], [100, "PTT", 1918.62],
    [101, "SURAT", 1374.66], [101, "HOROZ", 1507.76], [0, "CEVA", 774.38], [500, "ARAS", NaN],
  ];
  let tutmayan = 0;
  for (const [desi, kod, deger] of beklenen) {
    const okunan = satirlar.get(desi)?.get(kod);
    if (Number.isNaN(deger)) { console.log(`  ○ ${kod} ${desi} desi = ${okunan ?? "YOK"} (bilgi)`); continue; }
    const tamam = okunan === deger;
    if (!tamam) tutmayan++;
    console.log(`  ${tamam ? "✓" : "✗"} ${kod} ${desi} desi = ${okunan ?? "YOK"} (PDF: ${deger})`);
  }
  if (satirlar.get(101)?.has("PTT")) { tutmayan++; console.log("  ✗ PTT 101 desi DOLU — PDF'te boş; hiza bozuk"); }
  for (const s of sorunlar) console.log(`  ⚠ ${s}`);
  if (tutmayan > 0 || sorunlar.length > 0) {
    console.log("\n⛔ SINAMA TUTMADI — hiçbir şey yazılmadı.");
    process.exitCode = 1;
    return;
  }

  const y = canliYapilandirma();
  if (!y.tamam) throw new Error("canlı yapılandırma okunamadı");
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");
  try {
    const kanal = await prisma.channel.findUniqueOrThrow({ where: { code: "TRENDYOL" }, select: { id: true } });
    const tasiyicilar = await prisma.cargoCarrier.findMany({ where: { code: { in: Object.values(BASLIK_KODU) } }, select: { id: true, code: true } });
    const idHaritasi = new Map(tasiyicilar.map((t) => [t.code, t.id]));
    const eksik = Object.values(BASLIK_KODU).filter((k) => !idHaritasi.has(k));
    if (eksik.length > 0) throw new Error(`sistemde olmayan taşıyıcı: ${eksik.join(", ")} — hiçbir şey yazılmadı`);
    const ayniTarih = await prisma.cargoTariff.count({ where: { channelId: kanal.id, effectiveFrom: etkin } });
    if (ayniTarih > 0) {
      console.log(`\n⛔ ${etkin.toISOString().slice(0, 10)} tarihli TY sürümü ZATEN VAR (${ayniTarih} satır) — üzerine yazılmaz.`);
      process.exitCode = 1;
      return;
    }
    const veri = [...satirlar].flatMap(([desi, h]) =>
      [...h].map(([kod, tutar]) => ({ channelId: kanal.id, carrierId: idHaritasi.get(kod)!, desi, amount: tutar.toFixed(4), currency: "TRY" as const, effectiveFrom: etkin })),
    );
    console.log(`\n  yazılacak satır ${veri.length}`);
    if (!UYGULA) { console.log("  KURU KOŞUM — hiçbir şey yazılmadı. Yazmak için --uygula"); return; }
    const arsiv = "veri/ozel/arsiv";
    mkdirSync(arsiv, { recursive: true });
    copyFileSync(DOSYA, join(arsiv, `ty-kargo-${etkin.toISOString().slice(0, 10)}-${basename(DOSYA)}`));
    /* Tek işlem — yarım sürüm kalmaz (tamamı-ya-hiçbiri; zaman aşımı yazım boyutuna göre). */
    const yazilan = await prisma.$transaction(async (tx) => {
      let n = 0;
      for (let i = 0; i < veri.length; i += 2000) n += (await tx.cargoTariff.createMany({ data: veri.slice(i, i + 2000) })).count;
      return n;
    }, { timeout: 120_000 });
    await prisma.auditLog.create({ data: { action: "TY_KARGO_TARIFESI_YUKLEME", targetType: "Channel", targetId: kanal.id,
      detail: JSON.stringify({ dosya: basename(DOSYA), etkinTarih: etkin.toISOString(), satir: yazilan, firmalar: Object.values(BASLIK_KODU) }) } });
    console.log(`  ✓ YAZILDI — ${yazilan} satır · iz TY_KARGO_TARIFESI_YUKLEME`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("HATA:", e instanceof Error ? `${e.name}: ${e.message}`.replace(/\s+/g, " ") : e);
  process.exitCode = 1;
});
