import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  BÖLÜNMÜŞ BİRİM FİYAT — ONARIM
 * ----------------------------------------------------------------------------
 *      npm run canli:birim-fiyat-onar            → KURU KOŞUM
 *      npm run canli:birim-fiyat-onar -- --yaz   → yazar
 *      npm run canli:birim-fiyat-onar -- --geri  → geri alır
 *
 *  ⛔ ARIZA (Halil bildirdi 29.08.2026): TY API içe aktarması `price` alanını
 *  SATIR TOPLAMI sanıp adete BÖLÜYORDU. Çok adetli her satış cironun
 *  yarısıyla girdi ve ZARARDA göründü.
 *
 *  ⭐ KANIT — KANALIN KENDİ ÖDEME KAYDI: `11373352181` · adet 2 ·
 *  `price` 2074 · komisyon %8,5 → hakedişte İKİ satır, her biri
 *  **1897,71 = 2074 − 176,29**. TY birim başına ödemiş; birim 2074.
 *
 *  ── ONARIM: `unitPriceAmount` × `quantity` ──────────────────────────────
 *  Bölme geri alınıyor. Komisyon ORAN olarak saklandığı için kendiliğinden
 *  düzelir (motor `oran × satisTutari` hesaplıyor).
 *
 *  ── GERİ ALMA (anayasa 28.08.2026) ──────────────────────────────────────
 *  KÜME deterministik ölçütten: `enumerasyon` kaynaklı, adet>1, iptalsiz
 *  kalemler. ESKİ DEĞERLER satır bazında ize yazılır.
 * ============================================================================
 */

const YAZ = process.argv.includes("--yaz");
const GERI = process.argv.includes("--geri");
const t2 = (x: number) => x.toFixed(2).padStart(12);

async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) {
    console.log("\n⛔ CANLI ADRES OKUNAMADI\n");
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(c.veri.ham);
  const { prisma: p } = await import("../src/lib/prisma");

  console.log("\n" + "=".repeat(104));
  console.log("BÖLÜNMÜŞ BİRİM FİYAT — " +
    (GERI ? "⚠ GERİ ALMA" : YAZ ? "⚠ YAZIM" : "KURU KOŞUM (yazmaz)"));
  console.log("=".repeat(104));

  /**
   * ⭐ KÜME DETERMİNİSTİK: `enumerasyon` kaynaklı, adet>1, iptalsiz.
   * Elle girilen çok adetli satışlara DOKUNULMAZ — onların birim fiyatını
   * kullanıcı kendi girdi, bölme oraya hiç uğramadı.
   */
  const kalemler = await p.saleItem.findMany({
    where: {
      quantity: { gt: 1 },
      sale: { iptalTarihi: null, importKaynak: "enumerasyon" },
    },
    select: {
      id: true, quantity: true, unitPriceAmount: true,
      sale: { select: { id: true, code: true, net1Amount: true,
        net2Amount: true, profitStatus: true } },
      variant: { select: { sku: true, product: { select: { name: true } } } },
    },
  });

  if (GERI) {
    const izler = await p.auditLog.findMany({
      where: { action: "BIRIM_FIYAT_BOLUNMESI_ONARILDI" },
      orderBy: { createdAt: "desc" }, take: 1,
      select: { detail: true },
    });
    if (izler.length === 0) {
      console.log("\n⛔ GERİ ALINACAK İZ YOK.\n");
      await p.$disconnect();
      return;
    }
    const d = JSON.parse(izler[0].detail ?? "{}") as {
      oncekiDegerler?: { kalemId: string; eski: string }[];
    };
    let geri = 0;
    for (const r of d.oncekiDegerler ?? []) {
      await p.saleItem.update({
        where: { id: r.kalemId },
        data: { unitPriceAmount: r.eski },
      });
      geri++;
    }
    console.log("\n   ⭐ eski değerine döndürülen kalem: " + geri);
    console.log("   ⚠ Kâr TAZELENMEDİ — ayrıca koşulmalı.\n");
    await p.$disconnect();
    return;
  }

  console.log("\n① KÜME — `enumerasyon` kaynaklı, adet>1, iptalsiz");
  console.log("   kalem " + kalemler.length);
  let eskiCiro = 0, yeniCiro = 0;
  for (const k of kalemler) {
    const eski = Number(k.unitPriceAmount.toString());
    const yeni = eski * k.quantity;
    eskiCiro += eski * k.quantity;
    yeniCiro += yeni * k.quantity;
    console.log("\n   " + (k.sale.code ?? "—").padEnd(14) +
      (k.variant.sku ?? "—").padEnd(14) + "adet " + k.quantity);
    console.log("     birim " + t2(eski) + " → " + t2(yeni) +
      "   ·   satır " + t2(eski * k.quantity) + " → " + t2(yeni * k.quantity));
    console.log("     bugünkü NET-1 " +
      (k.sale.net1Amount === null ? "—" : t2(Number(k.sale.net1Amount.toString()))) +
      " · NET-2 " +
      (k.sale.net2Amount === null ? "—" : t2(Number(k.sale.net2Amount.toString()))) +
      "   " + (k.sale.net1Amount !== null &&
        Number(k.sale.net1Amount.toString()) < 0 ? "⛔ ZARARDA" : ""));
    console.log("     " + (k.variant.product.name ?? "").slice(0, 62));
  }
  console.log("\n② CİRO ETKİSİ");
  console.log("   bugünkü ciro   : " + t2(eskiCiro));
  console.log("   ⭐ doğru ciro   : " + t2(yeniCiro));
  console.log("   ⭐ EKSİK CİRO   : " + t2(yeniCiro - eskiCiro));
  console.log("   ⚠ Komisyon ORAN olarak saklı; motor `oran × satış` hesaplıyor,");
  console.log("     yani komisyon da kendiliğinden düzelir — elle dokunulmaz.");

  if (!YAZ) {
    console.log("\n" + "=".repeat(104));
    console.log("KURU KOŞUM — HİÇBİR ŞEY YAZILMADI.");
    console.log("Yazmak için:  npm run canli:birim-fiyat-onar -- --yaz");
    console.log("=".repeat(104) + "\n");
    await p.$disconnect();
    return;
  }

  /** ⭐ ÖNCEKİ DEĞER SATIR BAZINDA (anayasa 28.08.2026). */
  const oncekiDegerler = kalemler.map((k) => ({
    kalemId: k.id,
    kod: k.sale.code,
    eski: k.unitPriceAmount.toString(),
    eskiNet1: k.sale.net1Amount === null ? null : k.sale.net1Amount.toString(),
    eskiNet2: k.sale.net2Amount === null ? null : k.sale.net2Amount.toString(),
    eskiDurum: k.sale.profitStatus,
  }));

  console.log("\n⚠ YAZILIYOR — " + kalemler.length + " kalem");
  let ok = 0;
  for (const k of kalemler) {
    await p.saleItem.update({
      where: { id: k.id },
      data: { unitPriceAmount: String(Number(k.unitPriceAmount.toString()) * k.quantity) },
    });
    ok++;
  }
  console.log("   ⭐ düzeltilen kalem: " + ok);

  console.log("\n③ KÂR TAZELENİYOR — uygulamanın kendi gövdesiyle");
  const { satisKarTazele } = await import("../src/lib/kar-yeniden");
  const satisIdleri = [...new Set(kalemler.map((k) => k.sale.id))];
  for (const sid of satisIdleri) await satisKarTazele(sid);
  const sonra = await p.sale.findMany({
    where: { id: { in: satisIdleri } },
    select: { code: true, profitStatus: true, net1Amount: true, net2Amount: true },
  });
  console.log("");
  for (const s of sonra) {
    const o = oncekiDegerler.find((x) => x.kod === s.code);
    console.log("   " + (s.code ?? "—").padEnd(14) +
      "NET-1 " + (o?.eskiNet1 === null || o?.eskiNet1 === undefined ? "—" :
        Number(o.eskiNet1).toFixed(2).padStart(10)) + " → " +
      (s.net1Amount === null ? "—" : Number(s.net1Amount.toString()).toFixed(2).padStart(10)) +
      "  ·  NET-2 " + (o?.eskiNet2 === null || o?.eskiNet2 === undefined ? "—" :
        Number(o.eskiNet2).toFixed(2).padStart(10)) + " → " +
      (s.net2Amount === null ? "—" : Number(s.net2Amount.toString()).toFixed(2).padStart(10)));
  }
  const zararKalan = sonra.filter((s) =>
    s.net1Amount !== null && Number(s.net1Amount.toString()) < 0).length;
  console.log("\n   ⭐ hâlâ NET-1 negatif olan: " + zararKalan + " / " + sonra.length);

  await p.auditLog.create({
    data: {
      action: "BIRIM_FIYAT_BOLUNMESI_ONARILDI",
      targetType: "SaleItem",
      detail: JSON.stringify({
        gerekce: "TY API içe aktarması `price`i satır toplamı sanıp adete bölüyordu. Kanıt: hakedişte İKİ SIPARIS_TUTARI satırı, her biri birim fiyat eksi komisyon (11373352181 → 1897,71 = 2074 − 176,29).",
        kalem: ok,
        eskiCiro: eskiCiro.toFixed(2),
        yeniCiro: yeniCiro.toFixed(2),
        kodDuzeltmesi: "scripts/canli-ty-ice-aktar.ts → birimFiyatCoz artık bölmüyor; ice-aktarma:dogrula ölçütü tersine çevrildi ve üç mutasyonla sınandı.",
        geriAlmaOlcutu: "Kimlik listesi DEĞİL: küme `enumerasyon` kaynaklı + adet>1 + iptalsiz kalemler. Eski değerler aşağıda satır bazında. Komut: npm run canli:birim-fiyat-onar -- --geri",
        oncekiDegerler,
      }),
    },
  });
  console.log("   ✓ AuditLog: BIRIM_FIYAT_BOLUNMESI_ONARILDI");

  console.log("\n" + "=".repeat(104));
  console.log("YAZILDI. Geri alma: npm run canli:birim-fiyat-onar -- --geri");
  console.log("=".repeat(104) + "\n");
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
