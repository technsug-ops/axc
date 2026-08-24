/**
 * ============================================================================
 *  KARGO FATURASI ↔ DEFTER MUTABAKATI (C-ÖLÇÜM) — SALT OKUMA
 * ----------------------------------------------------------------------------
 *  ⚠ HİÇBİR ŞEY YAZMAZ. İçe aktarma YOK; bu bir ölçümdür.
 *
 *  Kaynak: KANAL BELGESİ (en üst basamak) — Trendyol kargo faturası detayı.
 *  Kolonlar: Sipariş No · Gönderi Ücreti (KDV Dahil) · Desi · Gönderi/İade ·
 *            Kargo Firması · Sipariş Tarihi · Sevk Tarihi
 *
 *  ⚠ KDV TABANI KARŞILAŞTIRMADAN ÖNCE ÖLÇÜLÜR VE RAPORUN BAŞINA YAZILIR.
 *  Taban farklıysa bütün satırlar "tutmuyor" görünür ve ölçüm çöp olur
 *  (K13b'nin KDV dersi). Ölçülen: fatura KDV DAHİL yazıyor; şemada
 *  `returnCargoAmount` ve `reshipCargoAmount` da "KDV DAHİL"; satış
 *  tarafında `Sale.cargoAmount` KDV HARİÇ ama `SaleFee.KARGO` KDV DAHİL —
 *  bu yüzden satış bacağı FEE üzerinden karşılaştırılır.
 *
 *  ⚠ HÜKÜMLER AYRI SAYILIR — tek "tutmuyor" rakamı BASILMAZ:
 *    (a) kuruşuna tutuyor
 *    (b) bizde EKSİK BACAK — hangi tür eksik, adıyla yazılır
 *    (c) bizde HİÇ KAYIT YOK — satış defterde mi, o da ayrı ölçülür
 *    (d) TUTAR FARKLI — ikisi de var, sayı başka
 *
 *  KOŞUM:
 *    npx tsx scripts/canli-kargo-mutabakat.ts "<fatura.xlsx yolu>"
 * ============================================================================
 */
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import readXlsxFile from "read-excel-file/node";

import { paketiNormalle } from "../src/lib/tablo/paket";
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/** Faturadaki tür → bizde hangi alan tutar. */
const TUR_ESLESMESI = {
  "Gönderi": "SATIS_KARGO",
  "İade": "IADE_KARGO",
  "Değişim Gönderisi": "DEGISIM_KARGO",
} as const;

type FaturaTuru = keyof typeof TUR_ESLESMESI;

type Satir = {
  siparisNo: string;
  tutar: number;
  desi: number | null;
  tur: string;
  firma: string;
};

/** Kuruş toleransı DEĞİL, birim seçimi: Decimal→float kuyruğu. */
const KURUS = 0.005;

async function main() {
  const yol = process.argv[2];
  if (!yol) {
    console.log('Kullanim: npx tsx scripts/canli-kargo-mutabakat.ts "<fatura.xlsx>"');
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

  /**
   * ⚠ HAFIZA TUZAĞI: sayfa ADIYLA okumak bu dosyalarda 1 satır döndürüyor.
   * Sayfa dizisinden seçip `.data` alanı kullanılır.
   */
  const { bayt } = paketiNormalle(readFileSync(yol));
  const ham = (await readXlsxFile(bayt)) as unknown;
  const sayfa = Array.isArray(ham) && ham.length > 0 && "data" in (ham[0] as object)
    ? ((ham as { data: unknown[][] }[])[0].data)
    : (ham as unknown[][]);

  const baslik = (sayfa[0] ?? []).map((c) => String(c ?? "").trim());
  const idx = (ad: string) => baslik.findIndex((b) => b === ad);
  const iNo = idx("Sipariş No");
  const iTutar = idx("Gönderi Ücreti (KDV Dahil)");
  const iDesi = idx("Desi");
  const iTur = idx("Gönderi/İade");
  const iFirma = idx("Kargo Firması");

  /**
   * ⚠ KOLON EKSİKSE HATA FIRLATILIR, "0 sapma" DENMEZ. Boş sonuç ile temiz
   * sonucu ayırt edemeyen denetim, denetim değildir.
   */
  const eksik = [
    ["Sipariş No", iNo],
    ["Gönderi Ücreti (KDV Dahil)", iTutar],
    ["Gönderi/İade", iTur],
  ].filter(([, i]) => (i as number) < 0);
  if (eksik.length > 0) {
    throw new Error(
      `Fatura kolonları bulunamadı: ${eksik.map(([a]) => a).join(", ")} — ` +
        `başlıklar değişmiş olabilir. Denetim KOŞMADI.`,
    );
  }

  const satirlar: Satir[] = [];
  for (let i = 1; i < sayfa.length; i += 1) {
    const r = sayfa[i] ?? [];
    const no = String(r[iNo] ?? "").trim();
    if (!no) continue;
    satirlar.push({
      siparisNo: no,
      tutar: Number(String(r[iTutar] ?? "0").replace(",", ".")),
      desi: iDesi >= 0 ? Number(String(r[iDesi] ?? "")) || null : null,
      tur: String(r[iTur] ?? "").trim(),
      firma: iFirma >= 0 ? String(r[iFirma] ?? "").trim() : "",
    });
  }

  const okumaAni = new Date();
  console.log("");
  console.log("=".repeat(96));
  console.log("KARGO FATURASI ↔ DEFTER MUTABAKATI   (SALT OKUMA · içe aktarma YOK)");
  console.log("=".repeat(96));
  console.log(`  belge         ${basename(yol)}`);
  console.log(`  sistem okuma  ${okumaAni.toISOString()}`);
  console.log(`  hedef         ${y.veri.adres.hostname}`);
  console.log("");
  console.log("  KDV TABANI (karşılaştırmadan ÖNCE ölçüldü):");
  console.log('    fatura kolonu      "Gönderi Ücreti (KDV Dahil)"  → KDV DAHİL');
  console.log("    Return.returnCargoAmount / reshipCargoAmount     → KDV DAHİL (şema)");
  console.log("    SaleFee.KARGO                                    → KDV DAHİL");
  console.log("    Sale.cargoAmount                                 → KDV HARİÇ (kullanılmadı)");
  console.log("    → İKİ TARAF AYNI TABANDA. Dönüşüm yapılmadı.");

  let a = 0, b = 0, c = 0, d = 0, bilinmeyenTur = 0;
  const detay: string[] = [];
  /** ⚠ (d) FARKLARI TOPLANIR: hepsi aynıysa bu bir SAPMA değil, YUVARLAMA
      düzenidir. Eşik UYDURULMAZ — dağılım olduğu gibi basılır ve hükmü
      okuyan verir. (Anayasa: "eşiği soruyu soran koyamaz".) */
  const farklar: number[] = [];

  for (const s of satirlar) {
    const satis = await prisma.sale.findFirst({
      where: { code: s.siparisNo },
      select: {
        id: true,
        iptalTarihi: true,
        fees: { where: { code: "KARGO" }, select: { amount: true } },
        returns: {
          select: { returnCargoAmount: true, reshipCargoAmount: true },
        },
      },
    });

    const tur = s.tur as FaturaTuru;
    const alan = TUR_ESLESMESI[tur];
    if (!alan) {
      bilinmeyenTur += 1;
      detay.push(
        `  ${s.siparisNo.padEnd(13)} ${s.tutar.toFixed(2).padStart(9)} ${s.tur.padEnd(19)} ` +
          `— BİLİNMEYEN TÜR — hüküm verilmedi`,
      );
      continue;
    }

    if (!satis) {
      c += 1;
      detay.push(
        `  ${s.siparisNo.padEnd(13)} ${s.tutar.toFixed(2).padStart(9)} ${s.tur.padEnd(19)} ` +
          `(c) SATIŞ DEFTERDE YOK — kapsam boşluğu`,
      );
      continue;
    }

    let bizdeki: number | null = null;
    if (alan === "SATIS_KARGO") {
      bizdeki = satis.fees.length
        ? satis.fees.reduce((t, f) => t + Math.abs(Number(f.amount.toString())), 0)
        : null;
    } else if (alan === "IADE_KARGO") {
      const v = satis.returns
        .map((r) => r.returnCargoAmount)
        .find((x) => x !== null);
      bizdeki = v === undefined || v === null ? null : Number(v.toString());
    } else {
      const v = satis.returns
        .map((r) => r.reshipCargoAmount)
        .find((x) => x !== null);
      bizdeki = v === undefined || v === null ? null : Number(v.toString());
    }

    if (bizdeki === null) {
      b += 1;
      detay.push(
        `  ${s.siparisNo.padEnd(13)} ${s.tutar.toFixed(2).padStart(9)} ${s.tur.padEnd(19)} ` +
          `(b) EKSİK BACAK — "${s.tur}" defterde yok (satış VAR)`,
      );
      continue;
    }

    const fark = bizdeki - s.tutar;
    if (Math.abs(fark) < KURUS) {
      a += 1;
      detay.push(
        `  ${s.siparisNo.padEnd(13)} ${s.tutar.toFixed(2).padStart(9)} ${s.tur.padEnd(19)} ` +
          `(a) kuruşuna tutuyor`,
      );
    } else {
      d += 1;
      farklar.push(Number(fark.toFixed(2)));
      detay.push(
        `  ${s.siparisNo.padEnd(13)} ${s.tutar.toFixed(2).padStart(9)} ${s.tur.padEnd(19)} ` +
          `(d) TUTAR FARKLI — bizde ${bizdeki.toFixed(2)} · fark ${fark >= 0 ? "+" : ""}${fark.toFixed(2)}`,
      );
    }
  }

  console.log("");
  console.log(`  ${"SİPARİŞ".padEnd(13)} ${"FATURA".padStart(9)} ${"TÜR".padEnd(19)} HÜKÜM`);
  console.log("  " + "-".repeat(92));
  for (const satir of detay) console.log(satir);

  console.log("");
  console.log("  " + "-".repeat(92));
  console.log(`  incelenen satır          ${satirlar.length}`);
  console.log(`  (a) kuruşuna tutuyor     ${a}`);
  console.log(`  (b) eksik bacak          ${b}`);
  console.log(`  (c) satış defterde yok   ${c}`);
  console.log(`  (d) tutar farklı         ${d}`);
  console.log(`  bilinmeyen tür           ${bilinmeyenTur}`);
  if (farklar.length > 0) {
    const kume = [...new Set(farklar)].sort((x, z) => x - z);
    console.log("");
    console.log(`  (d) FARK DAĞILIMI: ${kume.map((f) => f.toFixed(2)).join(" · ")}`);
    if (kume.length === 1) {
      console.log(`    ⚠ ${farklar.length} satırın HEPSİ aynı fark (${kume[0].toFixed(2)}).`);
      console.log("      Tek tek sapma değil, SİSTEMATİK bir düzen farkı —");
      console.log("      büyük olasılıkla kuruş yuvarlaması. Ayrı ele alınır.");
    }
  }
  console.log("");
  console.log("  ⚠ TEK 'TUTMUYOR' RAKAMI BASILMADI: (b) (c) (d) farklı işlere yol açar.");
  console.log("    (b) girilecek bacak · (c) girilmemiş satış · (d) incelenecek sayı.");
  console.log("");
  console.log("  RAPOR KİPİ — hiçbir şey yazılmadı.");
  console.log("");
}

main().catch((e) => {
  console.error("HATA:", e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
