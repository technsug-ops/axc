import { readFileSync } from "node:fs";

import readXlsxFile from "read-excel-file/node";

import { paketiNormalle } from "../src/lib/tablo/paket";
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  KARGO ÜCRETLERİ — SATIŞ DOSYASI R SÜTUNUNDAN
 * ----------------------------------------------------------------------------
 *      npm run canli:kargo-yaz            → KURU KOŞUM
 *      npm run canli:kargo-yaz -- --yaz   → yazar
 *      npm run canli:kargo-yaz -- --geri  → geri alır
 *
 *  ⭐ TABAN — İŞİN EN KRİTİK KARARI, ÖLÇÜLDÜ:
 *  `Sale.cargoAmount` **KDV HARİÇ** saklanıyor (`lib/kargo-kdv.ts`:
 *  _"ölçüldü 32/32 satışta KARGO kesintisi = cargoAmount × 1,20"_).
 *  Dosyanın R sütunu ise **KDV DAHİL** — kargosu zaten olan 147 satışta
 *  ölçüldü: oran ortanca **1,2028**, tam 1,20 olan **74**, 1,00 olan **2**.
 *  Bu yüzden yazılan değer **R ÷ 1,20**'dir.
 *
 *  ⛔ FİRMA VE DESİ YAZILMAZ — dosyada YOK (ölçüldü). Boş kalmaları bir
 *  BEYANDIR: sistem hangi firmayla gittiğini bilmiyor. Vekil bir firma
 *  seçmek olmayan bilgiyi uydurmak olurdu.
 *
 *  ⛔ KARGOSU ZATEN OLAN SATIŞA DOKUNULMAZ. FIFO kararının aynısı:
 *  ölçülmüş gerçek, beyanla değiştirilmez. Sapma RAPORLANIR, şerhli kalır.
 * ============================================================================
 */

const SATIS = "C:/Users/yapra/Desktop/excel/satis.xlsx";
const PARTI = "kargo-dosya-20260828";
const YAZ = process.argv.includes("--yaz");
const GERI = process.argv.includes("--geri");

const n = (h: unknown) => (Number.isFinite(Number(h)) ? Number(h) : 0);
const t2 = (x: number) => x.toFixed(2).padStart(15);
/** ⚠ Kuruşa yuvarlama: `Decimal` alanına yazılan değer kuruş taşır. */
const kurus = (x: number) => Math.round(x * 100) / 100;

async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) {
    console.log("\n⛔ CANLI ADRES OKUNAMADI\n");
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(c.veri.ham);
  const { prisma: p } = await import("../src/lib/prisma");
  const { karHesapla } = await import("../src/lib/kar");

  console.log("\n" + "=".repeat(100));
  console.log("KARGO ÜCRETLERİ — " +
    (GERI ? "⚠ GERİ ALMA" : YAZ ? "⚠ YAZIM" : "KURU KOŞUM (yazmaz)"));
  console.log("=".repeat(100));

  // ═══ GERİ ALMA ═══════════════════════════════════════════════════════
  if (GERI) {
    const iz = await p.auditLog.findFirst({
      where: { action: "KARGO_DOSYADAN_YAZILDI" },
      orderBy: { createdAt: "desc" },
      select: { detail: true, createdAt: true },
    });
    if (!iz?.detail) {
      console.log("\n⛔ GERİ ALINACAK İZ YOK.\n");
      await p.$disconnect();
      return;
    }
    const d = JSON.parse(iz.detail) as { saleIds?: string[] };
    const idler = d.saleIds ?? [];
    console.log("\n   iz " + iz.createdAt.toISOString().slice(0, 19) +
      " · " + idler.length + " satış");
    let geri = 0;
    for (let k = 0; k < idler.length; k += 200) {
      const r = await p.sale.updateMany({
        where: { id: { in: idler.slice(k, k + 200) } },
        data: { cargoAmount: null, cargoCurrency: null },
      });
      geri += r.count;
    }
    console.log("   ⭐ kargosu boşaltılan: " + geri);
    console.log("   ⚠ Kâr TAZELENMEDİ — `npm run canli:kar-tazele` ayrı koşar.\n");
    await p.$disconnect();
    return;
  }

  // ── DOSYA ──────────────────────────────────────────────────────────────
  const ss = (await readXlsxFile(paketiNormalle(readFileSync(SATIS)).bayt))
    .find((x) => String(x.sheet).includes("SATIŞ"))!;
  const bas = ss.data[5].map((h) => String(h ?? "").trim());
  const j = (a: string) => {
    const k = bas.indexOf(a);
    if (k < 0) throw new Error("KOLON YOK: " + a);
    return k;
  };
  /** ⚠ Kolon ADIYLA bulunur, harfle değil: sütun eklenirse R kayar. */
  const kargoIdx = j("KARGO");
  const noIdx = j("Sipariş Numarası");
  const satirlar = ss.data.slice(6)
    .filter((r) => String(r[j("TÜR")] ?? "").trim() === "satış")
    .filter((r) => n(r[kargoIdx]) !== 0 && String(r[noIdx] ?? "").trim() !== "");

  /** ⚠ Aynı sipariş birden çok satır taşıyabilir (çok kalemli). Kargo
   *  SİPARİŞ başınadır — satır başına toplanmaz, ilk değer alınır ve
   *  satırlar ÇELİŞİYORSA o sipariş ayrı kovaya düşer. */
  const dosya = new Map<string, { deger: number; celiski: boolean }>();
  for (const r of satirlar) {
    const kod = String(r[noIdx]).trim();
    const d = n(r[kargoIdx]);
    const v = dosya.get(kod);
    if (!v) dosya.set(kod, { deger: d, celiski: false });
    else if (Math.abs(v.deger - d) > 0.005) v.celiski = true;
  }

  const nolar = [...dosya.keys()];
  const satislar = new Map<string, {
    id: string; kargo: number | null; durum: string | null;
    net1: number | null; net2: number | null; soldAt: Date;
  }>();
  for (let k = 0; k < nolar.length; k += 400) {
    for (const x of await p.sale.findMany({
      where: { code: { in: nolar.slice(k, k + 400) }, iptalTarihi: null },
      select: {
        id: true, code: true, cargoAmount: true, profitStatus: true,
        net1Amount: true, net2Amount: true, soldAt: true,
      },
    })) {
      satislar.set(x.code!, {
        id: x.id,
        kargo: x.cargoAmount === null ? null : Number(x.cargoAmount.toString()),
        durum: x.profitStatus,
        net1: x.net1Amount === null ? null : Number(x.net1Amount.toString()),
        net2: x.net2Amount === null ? null : Number(x.net2Amount.toString()),
        soldAt: x.soldAt,
      });
    }
  }

  // ── KOVALAR ────────────────────────────────────────────────────────────
  const yazilacak: { id: string; kod: string; dahil: number; haric: number;
    durum: string | null; soldAt: Date }[] = [];
  const negatif: { kod: string; deger: number }[] = [];
  const celiskili: string[] = [];
  const zaten: { kod: string; defter: number; dosya: number }[] = [];
  let sistemdeYok = 0;

  for (const [kod, v] of dosya) {
    if (v.deger < 0) { negatif.push({ kod, deger: v.deger }); continue; }
    if (v.celiski) { celiskili.push(kod); continue; }
    const s = satislar.get(kod);
    if (!s) { sistemdeYok++; continue; }
    if (s.kargo !== null) { zaten.push({ kod, defter: s.kargo, dosya: v.deger }); continue; }
    yazilacak.push({
      id: s.id, kod, dahil: v.deger, haric: kurus(v.deger / 1.2),
      durum: s.durum, soldAt: s.soldAt,
    });
  }

  console.log("\n① KOVALAR");
  console.log("   dosyada kargolu sipariş     : " + dosya.size);
  console.log("   ⭐ YAZILACAK                 : " + yazilacak.length);
  console.log("   ⛔ NEGATİF (ayrı kova)       : " + negatif.length);
  console.log("   ⛔ satırları ÇELİŞEN         : " + celiskili.length);
  console.log("   ⛔ kargosu ZATEN olan        : " + zaten.length + "   ← DOKUNULMUYOR");
  console.log("   ⛔ sistemde yok / iptalli    : " + sistemdeYok);

  const topDahil = yazilacak.reduce((t, x) => t + x.dahil, 0);
  const topHaric = yazilacak.reduce((t, x) => t + x.haric, 0);
  console.log("\n② TUTAR — İKİ TABAN AYRI YAZILIR");
  console.log("   dosyadaki tutar (KDV DAHİL) : " + t2(topDahil));
  console.log("   ⭐ YAZILACAK    (KDV HARİÇ)  : " + t2(topHaric) + "   ← `cargoAmount`");
  console.log("   aradaki KDV                 : " + t2(topDahil - topHaric));

  console.log("\n③ DÖNEM DAĞILIMI (satış ayına göre)");
  const ay = new Map<string, { n: number; dahil: number }>();
  for (const x of yazilacak) {
    const k = x.soldAt.toISOString().slice(0, 7);
    const v = ay.get(k) ?? { n: 0, dahil: 0 };
    v.n++; v.dahil += x.dahil;
    ay.set(k, v);
  }
  for (const [k, v] of [...ay].sort()) {
    console.log("   " + k + String(v.n).padStart(7) + t2(v.dahil));
  }

  // ── ④ NEGATİF — Halil bakacak ─────────────────────────────────────────
  console.log("\n④ ⛔ NEGATİF DEĞER — YAZILMIYOR, HALİL BAKACAK");
  for (const x of negatif) {
    const s = satislar.get(x.kod);
    console.log("   " + x.kod.padEnd(16) + t2(x.deger) +
      (s ? "   · sistemde VAR · " + s.soldAt.toISOString().slice(0, 10) +
        " · kâr " + s.durum : "   · ⛔ sistemde YOK"));
  }
  if (celiskili.length > 0) {
    console.log("\n   ⛔ SATIRLARI ÇELİŞEN sipariş (aynı siparişe farklı kargo):");
    for (const k of celiskili.slice(0, 10)) console.log("     " + k);
    if (celiskili.length > 10) console.log("     … +" + (celiskili.length - 10));
  }

  // ── ⑤ ZATEN OLANLAR — sapma raporlanır, dokunulmaz ────────────────────
  console.log("\n⑤ KARGOSU ZATEN OLAN " + zaten.length + " SATIŞ — ŞERH");
  console.log("   ⛔ DOKUNULMUYOR. FIFO kararının aynısı: ölçülmüş gerçek,");
  console.log("     beyanla değiştirilmez. Sapma burada duruyor.");
  let tam120 = 0, tam100 = 0, baska = 0;
  const oranlar: number[] = [];
  for (const z of zaten) {
    if (z.defter === 0) continue;
    const o = z.dosya / z.defter;
    oranlar.push(o);
    if (Math.abs(o - 1.2) < 0.005) tam120++;
    else if (Math.abs(o - 1.0) < 0.005) tam100++;
    else baska++;
  }
  oranlar.sort((a, b) => a - b);
  const yy = (q: number) => oranlar.length === 0 ? 0 :
    oranlar[Math.min(oranlar.length - 1, Math.floor(oranlar.length * q))];
  console.log("   oran (dosya ÷ defter): p25 " + yy(0.25).toFixed(4) +
    " · ortanca " + yy(0.5).toFixed(4) + " · p75 " + yy(0.75).toFixed(4));
  console.log("   ⭐ oranı tam 1,20 : " + tam120 + "   ← taban kanıtı");
  console.log("   oranı tam 1,00 : " + tam100 + " · ikisi de değil: " + baska);
  const sapmaTutar = zaten.reduce((t, z) => t + Math.abs(z.dosya - z.defter * 1.2), 0);
  console.log("   |dosya − defter×1,20| toplamı: " + t2(sapmaTutar));

  // ── ⑥ NET ETKİSİ — MOTORDAN ÖLÇÜLÜR, TAHMİN EDİLMEZ ───────────────────
  console.log("\n⑥ NET ETKİSİ — kâr motoruna SORULDU (tahmin değil)");
  /**
   * ⚠ Motor ÇAĞRILIYOR, kaynağı okunmuyor. Aynı girdi iki kez geçirilir:
   * biri kargosuz, biri kargolu. Fark, kargonun NET'e etkisidir.
   */
  const temel = {
    kalemler: [{
      satisTutari: 1000, satisParaBirimi: "TRY" as const,
      maliyet: 600, maliyetParaBirimi: "TRY" as const,
      komisyonOrani: 10, kdvOrani: 20,
    }],
    siparisKesintileri: [],
    komisyonKdvOrani: null,
    paketSayisi: 1,
    kargoTarifesiBulunamadi: false,
  };
  const kargosuz = karHesapla({ ...temel, kargoTarifesi: null });
  const kargolu = karHesapla({ ...temel, kargoTarifesi: 100 });
  const dNet1 = kargolu.net1 - kargosuz.net1;
  const dNet2 = kargolu.net2 - kargosuz.net2;
  console.log("   ölçüm: KDV hariç ₺100 kargo eklenince");
  console.log("     ΔNET-1 " + dNet1.toFixed(2) + "   (= −kargo KDV DAHİL)");
  console.log("     ΔNET-2 " + dNet2.toFixed(2) + "   (= −kargo KDV HARİÇ — KDV indiriliyor)");
  const carpan1 = dNet1 / -100;
  const carpan2 = dNet2 / -100;
  console.log("   ölçülen çarpanlar: NET-1 ×" + carpan1.toFixed(4) +
    " · NET-2 ×" + carpan2.toFixed(4));
  const hesaplanan = yazilacak.filter((x) => x.durum === "CALCULATED");
  const hHaric = hesaplanan.reduce((t, x) => t + x.haric, 0);
  console.log("\n   yazılacak " + yazilacak.length + " satışın " + hesaplanan.length +
    " tanesi CALCULATED (yalnız onlarda NET var)");
  console.log("   o satışların kargosu (KDV hariç): " + t2(hHaric));
  console.log("   ⭐ BEKLENEN NET-1 DÜŞÜŞÜ : " + t2(hHaric * carpan1));
  console.log("   ⭐ BEKLENEN NET-2 DÜŞÜŞÜ : " + t2(hHaric * carpan2));
  console.log("   ⚠ Gerçek düşüş kâr TAZELENDİKTEN sonra ölçülecek —");
  console.log("     yukarıdaki rakam motorun kuralından türetildi, iddiadır.");

  if (!YAZ) {
    console.log("\n" + "=".repeat(100));
    console.log("KURU KOŞUM — HİÇBİR ŞEY YAZILMADI.");
    console.log("Yazmak için:  npm run canli:kargo-yaz -- --yaz");
    console.log("=".repeat(100) + "\n");
    await p.$disconnect();
    return;
  }

  // ═══ YAZIM ═══════════════════════════════════════════════════════════
  console.log("\n⚠ YAZILIYOR — " + yazilacak.length + " satış");
  let ok = 0;
  for (let k = 0; k < yazilacak.length; k += 100) {
    const dilim = yazilacak.slice(k, k + 100);
    await p.$transaction(dilim.map((x) => p.sale.update({
      where: { id: x.id },
      data: { cargoAmount: String(x.haric), cargoCurrency: "TRY" },
    })));
    ok += dilim.length;
    if (k % 1000 === 0) console.log("   … " + ok + "/" + yazilacak.length);
  }
  console.log("   ⭐ yazıldı " + ok);

  const dogrula = await p.sale.aggregate({
    where: { id: { in: yazilacak.map((x) => x.id) } },
    _sum: { cargoAmount: true }, _count: { _all: true },
  });
  const yazilan = Number((dogrula._sum.cargoAmount ?? 0).toString());
  console.log("\n   DOĞRULAMA (defterden okundu):");
  console.log("     kayıt " + dogrula._count._all + " / beklenen " + yazilacak.length +
    (dogrula._count._all === yazilacak.length ? "   ✓" : "   ⛔"));
  console.log("     toplam " + t2(yazilan) + " / beklenen " + t2(topHaric) +
    (Math.abs(yazilan - topHaric) < 0.05 ? "   ✓" : "   ⛔ fark " + (yazilan - topHaric).toFixed(2)));

  await p.auditLog.create({
    data: {
      action: "KARGO_DOSYADAN_YAZILDI",
      targetType: "Sale",
      detail: JSON.stringify({
        parti: PARTI,
        gerekce: "Satış dosyası R sütunu (KARGO). Halil onayı 28.08.2026.",
        taban: "Dosya KDV DAHİL (ölçüldü: kargosu olan 147 satışta oran ortanca 1,2028, tam 1,20 olan 74). cargoAmount KDV HARİÇ saklandığı için 1,20'ye bölündü.",
        yazilmayan: {
          negatif: negatif.map((x) => x.kod),
          celiskili,
          kargosuZatenOlan: zaten.length,
          sistemdeYok,
        },
        firmaVeDesi: "YAZILMADI — dosyada yok, uydurulmadı.",
        adet: ok,
        toplamHaric: topHaric.toFixed(2),
        toplamDahil: topDahil.toFixed(2),
        saleIds: yazilacak.map((x) => x.id),
      }),
    },
  });
  console.log("   ✓ AuditLog: KARGO_DOSYADAN_YAZILDI");

  console.log("\n" + "=".repeat(100));
  console.log("YAZILDI. Geri alma: npm run canli:kargo-yaz -- --geri");
  console.log("⚠ SIRADAKİ: kâr tazeleme — kargo NET'e ancak o zaman girer.");
  console.log("=".repeat(100) + "\n");
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
