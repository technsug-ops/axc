import { readFileSync } from "node:fs";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import readXlsxFile from "read-excel-file/node";

import { PrismaClient } from "../src/generated/prisma/client";
import { paketiNormalle } from "../src/lib/tablo/paket";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  İADE İÇE AKTARMA — B SEÇENEĞİ KURU KOŞUMU + K71 ÖLÇÜMÜ (SALT OKUMA)
 * ----------------------------------------------------------------------------
 *      npm run canli:iade-b-kuru
 *
 *  ⚠ ÖNCEKİ RAPORUM YİNE EKSİKTİ VE DÜZELTİLİYOR. "Eksik alan bir:
 *  `returnType`" demiştim. Yazma gövdesi (`lib/iade.ts` → `iadeKaydet`)
 *  okundu: ÜÇ bilinmeyen var ve üçüncüsü EN AĞIRI.
 *
 *  ⛔ HÜKÜM YOK, YAZMA YOK.
 * ============================================================================
 */

const LISTE = "C:/Users/yapra/Desktop/excel/Unbenannte Tabelle.xlsx";
const SATIS = "C:/Users/yapra/Desktop/excel/satis.xlsx";
const n = (h: unknown) => (Number.isFinite(Number(h)) ? Number(h) : 0);
const t2 = (x: number) => x.toFixed(2).padStart(14);

async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) {
    console.log("\n⛔ CANLI ADRES OKUNAMADI\n");
    process.exitCode = 1;
    return;
  }
  const p = new PrismaClient({ adapter: new PrismaMariaDb(c.veri.ham) });

  const s = (await readXlsxFile(paketiNormalle(readFileSync(LISTE)).bayt))[0];
  const b = s.data[0].map((h) => String(h ?? "").trim());
  const i = (a: string) => b.indexOf(a);
  const iadeSatir = s.data.slice(1).filter((r) =>
    String(r[i("TÜR")] ?? "").trim() === "iade" &&
    String(r[i("Sipariş Numarası")] ?? "").trim() !== "");

  const nolar = [...new Set(iadeSatir.map((r) => String(r[i("Sipariş Numarası")]).trim()))];
  const satislar = await p.sale.findMany({
    where: { code: { in: nolar } },
    select: { id: true, code: true, iptalTarihi: true,
      items: { select: { id: true, quantity: true, variantId: true, unitPriceAmount: true,
        variant: { select: { sku: true, barcode: true } } } } },
  });
  const harita = new Map(satislar.map((x) => [x.code!, x]));
  const zatenIade = new Set((await p.return.findMany({
    where: { sale: { code: { in: nolar } } }, select: { sale: { select: { code: true } } },
  })).map((x) => x.sale.code!));

  console.log("\n" + "=".repeat(104));
  console.log("İADE B SEÇENEĞİ — KURU KOŞUM (yazmaz)");
  console.log("=".repeat(104));

  let yazilabilir = 0, kalem = 0, tutar = 0, adet = 0;
  let satisYok = 0, iptalli = 0, zaten = 0, kalemBulunamadi = 0;
  const ornek: string[] = [];
  for (const r of iadeSatir) {
    const no = String(r[i("Sipariş Numarası")]).trim();
    const x = harita.get(no);
    if (!x) { satisYok++; continue; }
    if (x.iptalTarihi) { iptalli++; continue; }
    if (zatenIade.has(no)) { zaten++; continue; }
    /** ⚠ KALEM EŞLEŞMESİ KİMLİKLE: SKU ya da barkod. */
    const kod = String(r[i("SKU")] ?? "").trim();
    const bar = String(r[i("AXCALI BARKOD")] ?? "").trim();
    const k = x.items.find((y) => y.variant.sku === kod || y.variant.barcode === kod ||
      y.variant.sku === bar || y.variant.barcode === bar) ?? (x.items.length === 1 ? x.items[0] : null);
    if (!k) { kalemBulunamadi++; continue; }
    yazilabilir++;
    kalem++;
    adet += Math.abs(n(r[i("Satış Miktarı")])) || 1;
    tutar += Math.abs(n(r[i("ÜRÜN LİSTE FİYATI")]));
    if (ornek.length < 5) ornek.push(no + "  " + k.variant.sku + "  " + Math.abs(n(r[i("ÜRÜN LİSTE FİYATI")])).toFixed(2));
  }

  console.log("\n① YAZILABİLİR KÜME");
  console.log("   dosyadaki iade satırı  : " + iadeSatir.length);
  console.log("   ⭐ YAZILABİLİR          : " + yazilabilir + " Return + " + kalem + " ReturnItem");
  console.log("      adet " + adet + " · ciro etkisi " + t2(tutar));
  console.log("   dışarıda:");
  console.log("     satış sistemde yok   : " + satisYok);
  console.log("     satış iptal edilmiş  : " + iptalli);
  console.log("     zaten iade kaydı var : " + zaten);
  console.log("     kalem eşleşmedi      : " + kalemBulunamadi);

  console.log("\n② ⛔ ÜÇ BİLİNMEYEN — ÖNCEKİ RAPORUM 'BİR' DEMİŞTİ, YANLIŞTI");
  console.log("\n   ⚠ Yazma gövdesi `lib/iade.ts → iadeKaydet` okundu. İstedikleri:");
  console.log("\n   1) `returnType` — NÖTR DEĞER YOK");
  console.log("      UNDELIVERED  = 'teslim edilemeden döndü'   ← iddia");
  console.log("      NORMAL       = 'müşteri aldı, iade etti'   ← iddia (kullanıcı YASAKLADI)");
  console.log("      DISPUTED     = 'geç itiraz'                ← iddia");
  console.log("      ⛔ ÜÇÜ DE BİR ŞEY İDDİA EDİYOR. Şemada nötr değer YOK.");
  console.log("      → KULLANICI KARARI GEREKİYOR (şartı buydu).");
  console.log("\n   2) `saglamAdet` / `hasarliAdet` — dosyada YOK");
  console.log("      ⭐ VE BU EN AĞIRI: `RETURN_IN` yalnız SAĞLAM adet için");
  console.log("        yazılıyor, yani mal STOĞA GERİ DÖNER.");
  console.log("        'hepsi sağlam' dersek stok +" + adet + " adet artar.");
  console.log("        Mal hurdaya gittiyse stok ŞİŞER ve envanter değeri yanlış olur.");
  console.log("        'hepsi hasarlı' dersek stok değişmez ama sağlam dönen mal kaybolur.");
  console.log("\n   3) `iadeKargosu` — dosyada KARGO sütunu var (193/366 dolu) ama");
  console.log("      o sütun SATIŞIN kargosu mu İADENİN kargosu mu belirsiz.");
  console.log("      Ölçülmeden yazılmaz.");

  console.log("\n③ ⚠ CİRO NASIL DÜZELİR — ÖLÇÜLDÜ");
  console.log("   `Return` yazmak `Sale.items`i DEĞİŞTİRMEZ; ciro düşmez.");
  console.log("   İade etkisi kâr motorunda AYRI taşınır (iade NET'i) ve panel");
  console.log("   'X iade dahil' diye ayrı satırda gösterir.");
  console.log("   ⛔ YANİ 'ciro ₺694.432 düzelir' cümlesi FAZLA İYİMSERDİ:");
  console.log("     ciro rakamı aynı kalır, İADE ETKİSİ yanına yazılır.");
  console.log("     Bu yine de bugünkü hâlden iyi — ama beklenti düzeltilmeli.");

  // ═══ K71 ═══════════════════════════════════════════════════════════════
  console.log("\n\n" + "=".repeat(104));
  console.log("K71 — TANINMAYAN TÜRLER (ölçüm, eşleştirme YOK)");
  console.log("=".repeat(104));
  const ss = (await readXlsxFile(paketiNormalle(readFileSync(SATIS)).bayt))
    .find((x) => String(x.sheet).includes("SATIŞ"))!;
  const sb = ss.data[5].map((h) => String(h ?? "").trim());
  const sj = (a: string) => sb.indexOf(a);
  for (const tur of ["tazmin", "aktarma", "Zarar", "TATİL"]) {
    const satir = ss.data.slice(6).filter((r) => String(r[sj("TÜR")] ?? "").trim() === tur);
    if (satir.length === 0) continue;
    console.log("\n   ● " + tur + " — " + satir.length + " satır");
    const py = new Map<string, number>();
    for (const r of satir) {
      const k = String(r[sj("PAZAR YERI")] ?? "—").trim();
      py.set(k, (py.get(k) ?? 0) + 1);
    }
    console.log("     pazaryeri: " + [...py].map(([k, v]) => k + "=" + v).join(" · "));
    console.log("     örnekler:");
    for (const r of satir.slice(0, 4)) {
      console.log("       " + String(r[sj("Sipariş Numarası")] ?? "—").padEnd(16) +
        "adet " + String(r[sj("Satış Miktarı")]).padStart(4) +
        " · liste " + n(r[sj("ÜRÜN LİSTE FİYATI")]).toFixed(2).padStart(10) +
        " · alış " + n(r[sj("ÜRÜN ALIŞ FİYATI")]).toFixed(2).padStart(10) +
        "  " + String(r[sj("Ürün")]).slice(0, 32));
    }
  }
  const comp = await p.compensation.findMany({
    select: { quantity: true, status: true, occurredAt: true,
      supplierId: true, carrierId: true, returnItemId: true, returnNoticeId: true },
    take: 6,
  });
  console.log("\n   SİSTEMDEKİ `Compensation` (" + (await p.compensation.count()) + " kayıt):");
  for (const x of comp) {
    console.log("     adet " + String(x.quantity).padStart(3) + " · durum " +
      String(x.status).padEnd(12) + x.occurredAt.toISOString().slice(0, 10) +
      "  karşı taraf: " +
      (x.supplierId ? "TEDARİKÇİ" : x.carrierId ? "KARGO" : "—") +
      (x.returnItemId ? " · iade kalemine bağlı" : "") +
      (x.returnNoticeId ? " · bildirime bağlı" : ""));
  }
  console.log("\n   ⛔ EŞLEŞTİRME YAPILMADI. `tazmin`in karşı tarafı (kanal mı kargo mu)");
  console.log("     dosyada yazmıyor; `Compensation` ya `supplierId` ya `carrierId`");
  console.log("     istiyor — hangisi olduğu ölçülmeden yazılamaz.");

  console.log("\n" + "=".repeat(104));
  console.log("SALT OKUMA — HİÇBİR ŞEY YAZILMADI. HÜKÜM YOK.");
  console.log("=".repeat(104) + "\n");
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
