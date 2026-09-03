/**
 * ============================================================================
 *  KALAN 19 SATIŞIN KARGOSU — HALİL'İN ELLE DOLDURDUĞU DOSYADAN
 * ----------------------------------------------------------------------------
 *  Kuru koşum:  npm run canli:kargo-eksik-yaz
 *  Yazım:       npm run canli:kargo-eksik-yaz -- --uygula
 *
 *  BETIK SINIFI: TEK_SEFERLIK — K75'in kalıntısı olan 19 satır.
 *
 *  BEKCI SINIFI: BAGIMSIZ — canlı veritabanı VE kullanıcının yerel Excel
 *  dosyası gerekiyor; `npm run bekci` çevrimdışı koşmak zorunda.
 *
 *  ── ⛔ NİYE ELLE ─────────────────────────────────────────────────────────
 *  28.08 toplu yazımı 5595 siparişin kargosunu satış dosyasının R
 *  sütunundan yazdı. Geriye 19 AÇIK satış kaldı: dosyada kargo satırları
 *  YOKTU, yani sistemin bilmediği bir değeri toplu yazmak yasaktı
 *  (_"sistemin bilmediği bir değeri toplu yazamaz"_).
 *  ⭐ Ama tek tek giriş yasak DEĞİL — orada değeri OPERATÖR biliyor.
 *  Halil listeyi indirdi, 19/19'unu doldurdu ve geri verdi.
 *
 *  ── ⭐ TABAN ÖLÇÜLDÜ: DOSYA KDV **DAHİL** ───────────────────────────────
 *  `Sale.cargoAmount` şemada KDV HARİÇ saklanıyor. Yanlış tabanda yazmak
 *  doğrudan %20 hata demekti. Ayırt edici kanıt:
 *
 *      dosyada ₺101 → ALTI kez geçiyor
 *      101 ÷ 1,20 = 84,17
 *      defterde `4120311526`ın kargosu: **84,17**  ← BİREBİR
 *
 *  Yani Halil kasadan çıkan (KDV dahil) tutarı yazmış; yazarken 1,20'ye
 *  bölünür. Kontrol koşumda ayrıca yapılır ve tutmazsa yazım DURUR.
 *
 *  ── ⭐ VE BU SEFER KARGO FİRMASI DA VAR ─────────────────────────────────
 *  28.08 yazımında `cargoCarrierId` BOŞ bırakılmıştı ve bu bir BEYANDI:
 *  dosya firmayı taşımıyordu, vekil firma seçmek uydurma olurdu. Halil'in
 *  dosyasında **firma sütunu var** (15 Aras · 4 hepsijet), o yüzden bu 19
 *  satırda firma da yazılır.
 *  ⚠ Firma adı `CargoCarrier` tablosuyla NORMALLEŞTİRİLEREK eşleştirilir
 *  (boşluk/büyük-küçük); eşleşmeyen satırın firması BOŞ kalır ve ekranda
 *  sayılır — uydurma kimlik yazılmaz.
 *
 *  ── TOPLU YAZIM ÜÇ ŞARTI ────────────────────────────────────────────────
 *  (a) YEREL ANLIK GÖRÜNTÜ: yazımdan önce 19 satırın mevcut hâli
 *      `veri/ozel/`e yazılır; geri alma onunla bit-bit karşılaştırılır.
 *      ⛔ "İz sayısı" kısmi yazım kanıtı DEĞİLDİR (01.09 dersi).
 *  (b) SATIR SATIR TEKRAR-KOŞULABİLİR: her satır bağımsız; kargosu ZATEN
 *      olan satır atlanır, ikinci koşum zararsızdır.
 *  (c) KAPASİTE: FIFO kapasitesi yok — `cargoAmount` MUTLAK alan
 *      (üzerine yazar, artırmaz), dolayısıyla çift düşüm imkânsız.
 * ============================================================================
 */

import { readFileSync, writeFileSync } from "node:fs";

import readXlsxFile from "read-excel-file/node";

import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";
import { paketiNormalle } from "../src/lib/tablo/paket";

const DOSYA = "C:/Users/yapra/Downloads/kargo eksik.xlsx";
const PARTI = "kargo-elle-20260903";
/** ⭐ Ölçüldü: dosya KDV DAHİL. Yazılan değer bu bölene göre çıkar. */
const KDV_BOLEN = 1.2;

function para(x: number): string {
  return x.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
/** Yazım betiğiyle AYNI yuvarlama — kuruşa. */
function kurus(x: number): number {
  return Math.round(x * 100) / 100;
}
/** Firma adı eşleştirmesi: kimlik yolu yok, ad NORMALLEŞTİRİLİR. */
function sadelestir(x: string): string {
  return x.toLocaleLowerCase("tr").replace(/[\s._-]/g, "");
}

async function main() {
  const uygula = process.argv.includes("--uygula");
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");

  console.log("=".repeat(92));
  console.log(
    `  KALAN 19 SATIŞIN KARGOSU — ${uygula ? "⚠ YAZIM" : "KURU KOŞUM"}`,
  );
  console.log("=".repeat(92));

  /* ── DOSYA ─────────────────────────────────────────────────────────── */
  /**
   * ⚠ `getSheets` tip tanımında yok ama çalışma zamanında var — depodaki
   * öteki okuyucular da aynı yolu kullanıyor (`canli-kargo-degeri-dogrula`).
   * Tip zorlaması BURADA, tek yerde.
   */
  const sayfalar = (await (
    readXlsxFile as unknown as (
      b: Buffer,
      o: { getSheets: true },
    ) => Promise<{ sheet: string; data: unknown[][] }[]>
  )(paketiNormalle(readFileSync(DOSYA)).bayt, { getSheets: true }));
  const sayfa = sayfalar[0];
  if (sayfa === undefined) {
    console.log("⛔ Sayfa okunamadı — ÖLÇÜM YOK ('kargo yok' DEĞİL).");
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }
  const bas = sayfa.data[0].map((c) => String(c ?? "").trim());
  const iNo = bas.indexOf("siparisNo");
  const iTut = bas.indexOf("Kargo Tutar");
  const iFir = bas.indexOf("Kargo firma");
  if (iNo < 0 || iTut < 0) {
    console.log("⛔ SÜTUN YOK — ÖLÇÜM YOK. Bulunan başlıklar:", bas.join(" | "));
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }

  type Satir = { no: string; kdvDahil: number; firmaAdi: string };
  const satirlar: Satir[] = [];
  let bosTutar = 0;
  for (const r of sayfa.data.slice(1)) {
    const no = String(r[iNo] ?? "").trim();
    if (no === "") continue;
    const ham = String(r[iTut] ?? "").replace(",", ".").trim();
    const t = Number(ham);
    if (ham === "" || !Number.isFinite(t) || t <= 0) {
      bosTutar += 1;
      continue;
    }
    satirlar.push({
      no,
      kdvDahil: t,
      firmaAdi: iFir < 0 ? "" : String(r[iFir] ?? "").trim(),
    });
  }
  console.log(`\n  dosyada tutarı DOLU satır : ${satirlar.length}`);
  console.log(`  tutarı boş satır          : ${bosTutar}`);
  if (satirlar.length === 0) {
    console.log("⛔ Yazılacak satır yok.");
    await prisma.$disconnect();
    return;
  }

  /* ── FİRMALAR ──────────────────────────────────────────────────────── */
  const firmalar = await prisma.cargoCarrier.findMany({
    select: { id: true, name: true },
  });
  const firmaBul = (ad: string) => {
    if (ad === "") return null;
    const s = sadelestir(ad);
    return (
      firmalar.find(
        (f) => sadelestir(f.name) === s || sadelestir(f.name).includes(s) || s.includes(sadelestir(f.name)),
      ) ?? null
    );
  };

  /* ── DEFTER ────────────────────────────────────────────────────────── */
  /**
   * ⛔ EXCEL BAŞTAKİ SIFIRI SİLİYOR — VE BU SESSİZ BİR KİMLİK KAYBI.
   * Listeyi CSV olarak verdim, sipariş no `0681327845` idi; Excel onu SAYI
   * yapıp `681327845`e çevirdi. İlk koşumda "defterde YOK" diye düştü —
   * oysa satış duruyordu, kimlik bozulmuştu.
   * ⭐ Çare: kod bulunamazsa SIFIRLA DOLDURULMUŞ hâli de denenir ve
   * denendiği EKRANDA YAZAR. _(Anayasa: "benzer ad aynı kimlik değildir" —
   * burada tersi: aynı kimlik farklı yazılmış.)_
   */
  const aday = (no: string) => [no, no.padStart(10, "0"), no.padStart(11, "0")];
  const tumKodlar = [...new Set(satirlar.flatMap((s) => aday(s.no)))];
  const satislar = await prisma.sale.findMany({
    where: { code: { in: tumKodlar } },
    select: {
      id: true,
      code: true,
      soldAt: true,
      iptalTarihi: true,
      cargoAmount: true,
      cargoCarrierId: true,
      profitStatus: true,
      net1Amount: true,
      net2Amount: true,
      channelAccount: { select: { channel: { select: { name: true } } } },
    },
  });
  const kodaHam = new Map(satislar.map((s) => [s.code ?? "", s]));
  /** Dosyadaki no → defterdeki gerçek kod (sıfır dolgusu denenerek). */
  const gercekKod = new Map<string, string>();
  const koda = new Map<string, (typeof satislar)[number]>();
  for (const s of satirlar) {
    for (const a of aday(s.no)) {
      const d = kodaHam.get(a);
      if (d !== undefined) {
        koda.set(s.no, d);
        gercekKod.set(s.no, a);
        break;
      }
    }
  }
  const dolgulu = [...gercekKod.entries()].filter(([dosya, defter]) => dosya !== defter);
  if (dolgulu.length > 0) {
    console.log(
      `
  ⚠ SIFIR DOLGUSUYLA BULUNAN ${dolgulu.length} sipariş` +
        " (Excel baştaki sıfırı silmiş):",
    );
    for (const [dosya, defter] of dolgulu) {
      console.log(`     dosya "${dosya}"  →  defter "${defter}"`);
    }
  }

  /**
   * ⭐ TABAN KANITI — YAZIMDAN ÖNCE, VE TUTMAZSA DURUR.
   * Kargosu ZATEN olan satışlarda `dosya ÷ defter` oranı 1,20'ye oturmalı.
   * Bu 19 satırda kargo YOK, o yüzden kanıt DEFTERİN GENELİNDEN alınır:
   * daha önce yazılmış kayıtlarda oran ölçülür.
   */
  const ornek = await prisma.sale.findMany({
    where: { cargoAmount: { not: null } },
    select: { cargoAmount: true },
    take: 400,
  });
  const kdvHaricOrnek = ornek
    .map((s) => Number((s.cargoAmount ?? 0).toString()))
    .filter((x) => x > 0);
  /** Dosyadaki değerlerin 1,20'ye bölünmüşü defterdeki kümede geçiyor mu? */
  const kume = new Set(kdvHaricOrnek.map((x) => x.toFixed(2)));
  const tutan = satirlar.filter((s) =>
    kume.has(kurus(s.kdvDahil / KDV_BOLEN).toFixed(2)),
  ).length;
  console.log("\n① TABAN KANITI — dosya KDV DAHİL mi");
  console.log(
    `   dosyanın ÷1,20 hâli, defterdeki mevcut kargo değerleriyle` +
      ` eşleşen satır: ${tutan}/${satirlar.length}`,
  );
  if (tutan === 0) {
    console.log("   ⛔ HİÇBİRİ EŞLEŞMEDİ — taban kanıtı YOK. YAZIM DURDU.");
    console.log("      (Bu 'dosya yanlış' demek değil; taban ÖLÇÜLEMEDİ.)");
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }
  console.log("   ⭐ taban DOĞRULANDI: yazılan değer = dosya ÷ 1,20");

  /* ── KOVALAR ───────────────────────────────────────────────────────── */
  type Plan = {
    no: string;
    saleId: string;
    eski: number | null;
    yeni: number;
    firmaId: string | null;
    firmaAdi: string;
    kanal: string;
  };
  const plan: Plan[] = [];
  const yok: string[] = [];
  const iptalli: string[] = [];
  const zaten: string[] = [];
  const firmaEslesmedi: string[] = [];

  for (const s of satirlar) {
    const d = koda.get(s.no);
    if (d === undefined) {
      yok.push(s.no);
      continue;
    }
    if (d.iptalTarihi !== null) {
      iptalli.push(s.no);
      continue;
    }
    /** ⭐ TEKRAR-KOŞULABİLİRLİK: kargosu olan atlanır. */
    if (d.cargoAmount !== null) {
      zaten.push(s.no);
      continue;
    }
    const f = firmaBul(s.firmaAdi);
    if (s.firmaAdi !== "" && f === null) firmaEslesmedi.push(`${s.no}=${s.firmaAdi}`);
    plan.push({
      no: s.no,
      saleId: d.id,
      eski: null,
      yeni: kurus(s.kdvDahil / KDV_BOLEN),
      firmaId: f?.id ?? null,
      firmaAdi: f?.name ?? "",
      kanal: d.channelAccount.channel.name,
    });
  }

  console.log("\n② KOVALAR");
  console.log(`   ⭐ YAZILACAK              : ${plan.length}`);
  console.log(`   ⛔ kargosu ZATEN olan     : ${zaten.length}${zaten.length > 0 ? "  " + zaten.join(" ") : ""}`);
  console.log(`   ⛔ iptalli                : ${iptalli.length}${iptalli.length > 0 ? "  " + iptalli.join(" ") : ""}`);
  console.log(`   ⛔ defterde YOK           : ${yok.length}${yok.length > 0 ? "  " + yok.join(" ") : ""}`);
  console.log(
    `   ⚠ firması eşleşmeyen     : ${firmaEslesmedi.length}` +
      (firmaEslesmedi.length > 0 ? "  " + firmaEslesmedi.join(" ") : ""),
  );
  if (firmaEslesmedi.length > 0) {
    console.log("      MEVCUT FİRMALAR:", firmalar.map((f) => f.name).join(" · "));
  }
  const kapsam = plan.length + zaten.length + iptalli.length + yok.length;
  if (kapsam !== satirlar.length) {
    console.log(`   ⛔ KOVA TOPLAMI ${kapsam} ≠ ${satirlar.length}`);
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }

  console.log("\n③ SATIR SATIR");
  let toplamHaric = 0;
  for (const p of plan) {
    toplamHaric += p.yeni;
    console.log(
      `   ${p.no.padEnd(13)} ${p.kanal.padEnd(12)}` +
        ` dosya ${para(satirlar.find((s) => s.no === p.no)!.kdvDahil).padStart(9)} (dahil)` +
        ` → ${para(p.yeni).padStart(9)} (hariç)  ${p.firmaAdi || "⚠ firma YOK"}`,
    );
  }
  console.log(
    `\n   ⭐ YAZILACAK TOPLAM (KDV HARİÇ): ₺${para(toplamHaric)}` +
      `   ·  KDV: ₺${para(kurus(toplamHaric * 0.2))}`,
  );
  console.log(
    "   ⚠ NET-2 bu tutar kadar AŞAĞI iner (kargo KDV'si indiriliyor," +
      " NET-1 ×1,20 iner). Kayıp değil, eksik düşülmüş giderin deftere girişi.",
  );

  if (!uygula) {
    console.log("\n" + "=".repeat(92));
    console.log("  ⛔ KURU KOŞUM — HİÇBİR ŞEY YAZILMADI.");
    console.log("     Yazmak için: npm run canli:kargo-eksik-yaz -- --uygula");
    console.log("=".repeat(92) + "\n");
    await prisma.$disconnect();
    return;
  }

  /* ══════════════════════════════════════════════════════════════════════
   *  YAZIM — (a) ANLIK GÖRÜNTÜ · (b) SATIR SATIR · her satır bağımsız
   * ══════════════════════════════════════════════════════════════════════ */
  const goruntu = {
    parti: PARTI,
    an: new Date().toISOString(),
    satirlar: plan.map((p) => {
      const d = koda.get(p.no)!;
      return {
        no: p.no,
        saleId: p.saleId,
        oncekiCargoAmount: d.cargoAmount === null ? null : Number(d.cargoAmount.toString()),
        oncekiCargoCarrierId: d.cargoCarrierId,
        oncekiProfitStatus: d.profitStatus,
        oncekiNet1: d.net1Amount === null ? null : Number(d.net1Amount.toString()),
        oncekiNet2: d.net2Amount === null ? null : Number(d.net2Amount.toString()),
        yeniCargoAmount: p.yeni,
        yeniCargoCarrierId: p.firmaId,
      };
    }),
  };
  const gYol = `veri/ozel/${PARTI}-anlik-goruntu.json`;
  writeFileSync(gYol, JSON.stringify(goruntu, null, 2), "utf8");
  console.log(`\n   ⭐ ANLIK GÖRÜNTÜ: ${gYol} (${goruntu.satirlar.length} satır)`);

  const kullanici = await prisma.user.findFirst({ select: { id: true } });
  if (kullanici === null) {
    console.log("⛔ Kullanıcı bulunamadı — iz yazılamaz. YAZIM DURDU.");
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }

  let yazilan = 0;
  const hatalar: string[] = [];
  for (const p of plan) {
    try {
      /** ⚠ HER SATIR BAĞIMSIZ — ikinci koşum kargosu olanı zaten atlar. */
      await prisma.sale.update({
        where: { id: p.saleId },
        data: {
          cargoAmount: p.yeni.toFixed(4),
          ...(p.firmaId === null ? {} : { cargoCarrierId: p.firmaId }),
        },
      });
      await prisma.auditLog.create({
        data: {
          userId: kullanici.id,
          action: "KARGO_ELLE_YAZILDI",
          targetType: "Sale",
          targetId: p.saleId,
          /** ⭐ ÖNCEKİ DEĞER SATIR BAZINDA — teşhis için (28.08 dersi). */
          detail: JSON.stringify({
            parti: PARTI,
            siparis: p.no,
            onceki: goruntu.satirlar.find((x) => x.no === p.no)?.oncekiCargoAmount ?? null,
            yeni: p.yeni,
            taban: "dosya KDV DAHİL ÷ 1,20",
            firma: p.firmaAdi || null,
            kaynak: "Halil elle doldurdu — kargo eksik.xlsx, 03.09.2026",
          }),
        },
      });
      yazilan += 1;
    } catch (e) {
      /** ⛔ MESAJ TAM TAŞINIR — kırpma teşhisi kırpar (26.08 dersi). */
      hatalar.push(
        `${p.no} — ${(e instanceof Error ? e.stack ?? e.message : String(e))
          .replace(/[\r\n]+/g, " ")
          .slice(-260)}`,
      );
    }
  }

  console.log(`\n   ⭐ YAZILAN: ${yazilan}/${plan.length}`);
  if (hatalar.length > 0) {
    console.log(`   ⛔ HATA: ${hatalar.length}`);
    for (const h of hatalar) console.log(`      ${h}`);
    process.exitCode = 1;
  }

  /* ── DOĞRULAMA: defter anlık görüntüyle uyuyor mu ────────────────────── */
  const sonrasi = await prisma.sale.findMany({
    where: { id: { in: plan.map((p) => p.saleId) } },
    select: { id: true, code: true, cargoAmount: true, cargoCarrierId: true },
  });
  let uyan = 0;
  const ayrisan: string[] = [];
  for (const s of sonrasi) {
    const p = plan.find((x) => x.saleId === s.id)!;
    const d = s.cargoAmount === null ? null : Number(s.cargoAmount.toString());
    if (d !== null && Math.abs(d - p.yeni) < 0.005) uyan += 1;
    else ayrisan.push(`${s.code} defter ${d ?? "—"} ≠ plan ${p.yeni}`);
  }
  console.log(`\n④ DOĞRULAMA — defter ↔ plan: ${uyan}/${plan.length} uyuyor`);
  if (ayrisan.length > 0) {
    console.log("   ⛔ AYRIŞAN:");
    for (const a of ayrisan) console.log(`      ${a}`);
    process.exitCode = 1;
  }

  console.log("\n" + "=".repeat(92));
  console.log("  ⚠ KÂR TAZELEMESİ AYRI ADIM: npm run canli:kar-tazele");
  console.log("     Kargo yazıldı ama NET damgaları henüz eski değeri taşıyor.");
  console.log("=".repeat(92) + "\n");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("HATA:", e instanceof Error ? e.stack : e);
  process.exitCode = 1;
});
