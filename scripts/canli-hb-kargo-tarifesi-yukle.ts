/**
 * ============================================================================
 *  HEPSİBURADA KARGO TARİFESİ YÜKLEME — 10 EYLÜL 2026
 * ----------------------------------------------------------------------------
 *  BETİK SINIFI: TEK_SEFERLIK — Hepsiburada'nın 10 Eylül 2026'dan itibaren
 *  geçerli yeni kargo tarifesi PDF'i (resmi rate card) bir kez yüklenir.
 *  Kaynak PDF `pdftotext -table` ile sayfa sayfa çıkarılıp
 *  (scripts/gecici-hb-* değil, tek seferlik veri dosyası) CSV'ye dönüştürüldü;
 *  ayrıştırma ölçüldü: 4501 desi satırı (0-4500), 0 eksik, 0 hata.
 *  hepsiJET canlı veride de yalnız desi 0-60 arası fiyatlı (61 kayıt) —
 *  PDF'te de aynı desende boş; bu bir ayrıştırma hatası değil, gerçek bir
 *  iş kuralı (kaynak: canlı CargoTariff, ölçüldü 16.09.2026).
 *
 *  Varsayılan: KURU KOŞUM (yazmaz, yalnız mevcut tarifeyle farkı raporlar).
 *      npm run canli:hb-kargo-tarifesi-yukle
 *      npm run canli:hb-kargo-tarifesi-yukle -- --yaz
 *
 *  effectiveFrom = 2026-09-10 (PDF'in kendi beyanı: "10 Eylül 2026 itibariyle
 *  geçerli olacaktır"). Eski tarife (effectiveFrom 2026-08-01) SİLİNMEZ —
 *  geçmiş satışlar kendi soldAt'ına en yakın effectiveFrom'u okur
 *  (kar-yeniden.ts), bu yüzden yeni parti eklemek geçmişi bozmaz.
 * ============================================================================
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

const CSV_YOLU = join(
  "C:\\Users\\yapra\\AppData\\Local\\Temp\\claude\\c--Users-yapra-Desktop-axcali\\9d329eab-7892-420d-9808-438b319464aa\\scratchpad\\hb-kargo",
  "hb-tarife-20260910.csv",
);
const EFFECTIVE_FROM = new Date("2026-09-10T00:00:00.000Z");

/** CSV başlık kodu -> canlı CargoCarrier.name (isim eşleştirmesi için ad parçası). */
const KOD_ISIM: Record<string, string> = {
  ARAS: "Aras Kargo",
  DHL: "DHL",
  HEPSIJET: "hepsiJET",
  KOLAY_GELSIN: "Kolay Gelsin",
  PTT: "PTT Kargo",
  SURAT: "Sürat Kargo",
  YURTICI: "Yurtiçi Kargo",
  CEVA_TEDARIK: "CEVA Tedarik",
  CEVA_LOJISTIK: "CEVA Lojistik",
  HEPSIJET_XL: "hepsiJET XL",
  HOROZ: "Horoz Lojistik",
};

function csvOku(): { desi: number; kod: string; tutar: number }[] {
  const metin = readFileSync(CSV_YOLU, "utf8");
  const satirlar = metin.split(/\r?\n/).filter((s) => s.trim().length > 0);
  const baslik = satirlar[0]!.split(",");
  const kodlar = baslik.slice(1);
  const kayitlar: { desi: number; kod: string; tutar: number }[] = [];
  for (const satir of satirlar.slice(1)) {
    const parcalar = satir.split(",");
    const desi = Number(parcalar[0]);
    for (let i = 0; i < kodlar.length; i++) {
      const deger = parcalar[i + 1];
      if (deger === undefined || deger === "") continue;
      kayitlar.push({ desi, kod: kodlar[i]!, tutar: Number(deger) });
    }
  }
  return kayitlar;
}

async function main() {
  const UYGULA = process.argv.includes("--yaz");

  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { PrismaClient } = await import("../src/generated/prisma/client");
  const { PrismaMariaDb } = await import("@prisma/adapter-mariadb");
  const prisma = new PrismaClient({ adapter: new PrismaMariaDb(y.veri.ham) });

  console.log("");
  console.log("HEPSİBURADA KARGO TARİFESİ — 10 EYLÜL 2026");
  console.log(`  hedef   ${y.veri.adres.hostname}`);
  console.log(`  kip     ${UYGULA ? "UYGULA (yazar)" : "RAPOR (yazmaz)"}`);
  console.log("");

  const kanal = await prisma.channel.findFirst({ where: { name: { contains: "Hepsiburada" } } });
  if (!kanal) {
    console.log("  ✗ Hepsiburada kanalı bulunamadı");
    await prisma.$disconnect();
    process.exitCode = 1;
    return;
  }

  const kayitlar = csvOku();
  console.log(`  CSV     ${kayitlar.length} satır okundu (${CSV_YOLU})`);

  // Taşıyıcı eşleştirme — her kod tam olarak bir carrierId'ye bağlanmalı.
  const tumTasiyicilar = await prisma.cargoCarrier.findMany();
  const carrierId = new Map<string, string>();
  for (const [kod, isim] of Object.entries(KOD_ISIM)) {
    const eslesen = tumTasiyicilar.filter((t) => t.name === isim);
    if (eslesen.length !== 1) {
      console.log(`  ✗ "${kod}" (${isim}) için ${eslesen.length} eşleşme bulundu — beklenen 1.`);
      console.log(`     mevcut taşıyıcılar: ${tumTasiyicilar.map((t) => t.name).join(" · ")}`);
      await prisma.$disconnect();
      process.exitCode = 1;
      return;
    }
    carrierId.set(kod, eslesen[0]!.id);
  }
  console.log(`  eşleşme ${carrierId.size}/${Object.keys(KOD_ISIM).length} taşıyıcı çözüldü`);
  console.log("");

  // Mevcut EN GÜNCEL tarife (her taşıyıcı için en son effectiveFrom) — karşılaştırma tabanı.
  const mevcutTumu = await prisma.cargoTariff.findMany({
    where: { channelId: kanal.id },
    select: { carrierId: true, desi: true, amount: true, effectiveFrom: true },
  });
  const enSonEffectiveFrom = new Map<string, Date>();
  for (const r of mevcutTumu) {
    const mevcut = enSonEffectiveFrom.get(r.carrierId);
    if (!mevcut || r.effectiveFrom > mevcut) enSonEffectiveFrom.set(r.carrierId, r.effectiveFrom);
  }
  const mevcutHarita = new Map<string, number>(); // `${carrierId}:${desi}` -> amount (yalnız en güncel parti)
  for (const r of mevcutTumu) {
    if (r.effectiveFrom.getTime() !== enSonEffectiveFrom.get(r.carrierId)?.getTime()) continue;
    mevcutHarita.set(`${r.carrierId}:${r.desi}`, Number(r.amount));
  }

  // Fark ölçümü — satır bazında (K198 kuralı: toplam değil, satır).
  let ayni = 0;
  let degisen = 0;
  let yeni = 0;
  const ornekDegisenler: string[] = [];
  const kodBazindaDegisim = new Map<string, number>();

  const yazilacak: { channelId: string; carrierId: string; desi: number; amount: string; effectiveFrom: Date; currency: "TRY" }[] = [];

  for (const k of kayitlar) {
    const cid = carrierId.get(k.kod)!;
    const anahtar = `${cid}:${k.desi}`;
    const eskiTutar = mevcutHarita.get(anahtar);
    if (eskiTutar === undefined) {
      yeni++;
      kodBazindaDegisim.set(k.kod, (kodBazindaDegisim.get(k.kod) ?? 0) + 1);
    } else if (Math.abs(eskiTutar - k.tutar) > 0.005) {
      degisen++;
      kodBazindaDegisim.set(k.kod, (kodBazindaDegisim.get(k.kod) ?? 0) + 1);
      if (ornekDegisenler.length < 15) {
        ornekDegisenler.push(
          `     ${k.kod.padEnd(14)} desi=${String(k.desi).padStart(4)}  ${eskiTutar.toFixed(2)} → ${k.tutar.toFixed(2)}`,
        );
      }
    } else {
      ayni++;
    }

    yazilacak.push({
      channelId: kanal.id,
      carrierId: cid,
      desi: k.desi,
      amount: k.tutar.toFixed(4),
      effectiveFrom: EFFECTIVE_FROM,
      currency: "TRY",
    });
  }

  console.log("  ── FARK ÖLÇÜMÜ (yeni tarife vs. mevcut en güncel parti) ──");
  console.log(`     aynı kalan     ${ayni}`);
  console.log(`     değişen        ${degisen}`);
  console.log(`     yeni (mevcutta yok — örn. Kolay Gelsin desi>60 artık fiyatlı) ${yeni}`);
  console.log("");
  if (kodBazindaDegisim.size > 0) {
    console.log("     taşıyıcı bazında değişen/yeni satır sayısı:");
    for (const [kod, n] of kodBazindaDegisim) console.log(`       ${kod.padEnd(14)} ${n}`);
    console.log("");
  }
  if (ornekDegisenler.length > 0) {
    console.log("     örnek değişimler (ilk 15):");
    for (const s of ornekDegisenler) console.log(s);
    console.log("");
  }

  console.log(`  YAZILACAK TOPLAM SATIR: ${yazilacak.length}`);
  console.log(`  effectiveFrom: ${EFFECTIVE_FROM.toISOString()}`);
  console.log("");

  if (!UYGULA) {
    console.log("  RAPOR KİPİ — hiçbir şey yazılmadı.");
    console.log("  Rakamlar doğruysa: npm run canli:hb-kargo-tarifesi-yukle -- --yaz");
    console.log("");
    await prisma.$disconnect();
    return;
  }

  let yazilan = 0;
  for (let i = 0; i < yazilacak.length; i += 2000) {
    const parca = yazilacak.slice(i, i + 2000);
    const sonuc = await prisma.cargoTariff.createMany({ data: parca, skipDuplicates: true });
    yazilan += sonuc.count;
  }
  console.log(`  ── YAZILDI ── ${yazilan}/${yazilacak.length} satır (skipDuplicates=true)`);
  console.log("");

  await prisma.$disconnect();
}

main();
