import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  K68b ② — MALİYET BAĞI OLMAYAN SATIŞLARIN KÂRINI TAZELE
 * ----------------------------------------------------------------------------
 *      npm run canli:maliyet-tazele          → kuru koşum
 *      npm run canli:maliyet-tazele -- --yaz → yazar
 *
 *  ⛔ NİYE GEREKLİ: `kalemMaliyeti` düzeltildi (boş liste artık `null`
 *  dönüyor, `0` değil) ama `profitStatus` ve `net2Amount` SAKLANIYOR.
 *  Kod düzeldi, defterdeki damgalar eski — tazeleme koşmadan panel hâlâ
 *  maliyeti düşülmemiş ₺4,5M'yi kâr olarak gösterir.
 *
 *  ⛔ `satisKarTazele` KULLANILIYOR, `karYenidenYaz` DEĞİL: o sarmalayıcı
 *  kalemin MEVCUT `commissionRate`ini okuyup geri veriyor. Doğrudan
 *  `karYenidenYaz` çağırsaydık bugün yazdığımız 5319 oranı silerdik.
 *
 *  ⚠ KÜME: en az bir kalemi STOK HAREKETİ OLMAYAN iptalsiz satışlar.
 *  Bağı olan satışlar bu değişiklikten etkilenmiyor; onlara dokunmak
 *  gereksiz yazma olurdu.
 *
 *  ⚠ ORAN KARŞILAŞTIRILMAZ: tazeleme sonrası küme değişiyor (2493 satışın
 *  `net2`si `null` oluyor). Önce/sonra TOPLAMLARI yan yana yazılır, oran
 *  BÖLÜNMEZ. _(Anayasa: "kıyasın iki tarafı aynı kümeden gelmeli".)_
 * ============================================================================
 */

const YAZ = process.argv.includes("--yaz");
const t2 = (n: number) => n.toFixed(2).padStart(15);

async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) {
    console.log("\n⛔ CANLI ADRES OKUNAMADI\n");
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(c.veri.ham);
  const { prisma: p } = await import("../src/lib/prisma");
  const { satisKarTazele } = await import("../src/lib/kar-yeniden");
  const { urunlereTopla, donemOrtalamaMarji } = await import("../src/lib/panel-listeler");

  /** ⚠ PANEL MARJI PANELİN KENDİ GÖVDESİNDEN — kopya formül YAZILMAZ. */
  const panelMarji = async () => {
    const kalemler = await p.saleItem.findMany({
      where: { sale: { iptalTarihi: null } },
      select: {
        quantity: true, unitPriceAmount: true, net1Amount: true, net2Amount: true,
        profitStatus: true, variantId: true,
        variant: { select: { sku: true, product: { select: { name: true } } } },
      },
    });
    const satirlar = urunlereTopla(
      kalemler.map((k) => ({
        variantId: k.variantId,
        urunAdi: k.variant.product.name,
        sku: k.variant.sku,
        adet: k.quantity,
        ciro: Number(k.unitPriceAmount.toString()) * k.quantity,
        net1: k.net1Amount === null ? null : Number(k.net1Amount.toString()),
        net2: k.net2Amount === null ? null : Number(k.net2Amount.toString()),
        durum: k.profitStatus,
      })),
    );
    return donemOrtalamaMarji(satirlar);
  };

  const durumDagilimi = async () => {
    const s = await p.sale.findMany({
      where: { iptalTarihi: null },
      select: { profitStatus: true, net2Amount: true },
    });
    const m = new Map<string, { n: number; net2: number }>();
    for (const x of s) {
      const d = x.profitStatus ?? "(boş)";
      const v = m.get(d) ?? { n: 0, net2: 0 };
      v.n++;
      if (x.net2Amount !== null) v.net2 += Number(x.net2Amount.toString());
      m.set(d, v);
    }
    return m;
  };

  const yaz = (baslik: string, m: Map<string, { n: number; net2: number }>, marj: number | null) => {
    console.log("\n   " + baslik);
    console.log("     durum".padEnd(22) + "satış".padStart(7) + "Σ net2".padStart(18));
    for (const [d, v] of [...m].sort((a, b) => b[1].n - a[1].n)) {
      console.log("     " + d.padEnd(20) + String(v.n).padStart(7) + t2(v.net2));
    }
    console.log("     PANEL MARJI (donemOrtalamaMarji): " +
      (marj === null ? "hesaplanamıyor" : marj.toFixed(2) + "%"));
  };

  /** Hedef: en az bir kalemi hareketsiz olan iptalsiz satışlar. */
  const hareketli = new Set(
    (await p.stockMovement.findMany({
      where: { saleItemId: { not: null } }, select: { saleItemId: true },
    })).map((h) => h.saleItemId!),
  );
  const kalemler = await p.saleItem.findMany({
    where: { sale: { iptalTarihi: null } },
    select: { id: true, saleId: true },
  });
  const hedef = new Set<string>();
  for (const k of kalemler) if (!hareketli.has(k.id)) hedef.add(k.saleId);

  console.log("\n" + "=".repeat(96));
  console.log("K68b ② — MALİYET TAZELEME · " + (YAZ ? "⚠ YAZIM" : "KURU KOŞUM (yazmaz)"));
  console.log("=".repeat(96));
  console.log("\n   hedef satış (en az bir kalemi bağsız): " + hedef.size);

  const oncekiDurum = await durumDagilimi();
  const oncekiMarj = await panelMarji();
  yaz("ÖNCE", oncekiDurum, oncekiMarj);

  if (!YAZ) {
    console.log("\n" + "=".repeat(96));
    console.log("KURU KOŞUM — HİÇBİR ŞEY YAZILMADI.");
    console.log("Yazmak için:  npm run canli:maliyet-tazele -- --yaz");
    console.log("=".repeat(96) + "\n");
    await p.$disconnect();
    return;
  }

  console.log("\n⚠ TAZELENİYOR — " + hedef.size + " satış…");
  let basarili = 0, basarisiz = 0, sayac = 0;
  const hatalar: string[] = [];
  for (const saleId of hedef) {
    try {
      /** ⚠ Mevcut komisyon oranını KORUR — bugün yazdığımız 5319 oran silinmez. */
      const ok = await satisKarTazele(saleId);
      if (ok) basarili++;
      else { basarisiz++; if (hatalar.length < 8) hatalar.push(saleId + " — önizleme null"); }
    } catch (e) {
      basarisiz++;
      /** ⛔ Mesaj TAM taşınır. */
      if (hatalar.length < 8) {
        hatalar.push(saleId + " — " + (e instanceof Error ? e.message : String(e)).replace(/\s+/g, " "));
      }
    }
    if (++sayac % 500 === 0) console.log("   … " + sayac + " / " + hedef.size);
  }
  console.log("\n   başarılı " + basarili + " · başarısız " + basarisiz);
  for (const h of hatalar) console.log("     ⚠ " + h);

  await p.auditLog.create({
    data: {
      action: "MALIYET_BAGSIZ_KAR_TAZELENDI",
      targetType: "Sale",
      detail: JSON.stringify({
        gerekce: "`kalemMaliyeti` boş hareket listesinde 0 döndürüyordu; bağsız kalemler CALCULATED sayılıp net2 maliyet düşülmeden yazılmıştı. Kod düzeltildi (null), saklanan damgalar tazelendi.",
        hedefSatis: hedef.size,
        basarili, basarisiz,
        olcum: "bağsız kalem 2573 · ciro 6.585.533,44 · yazılmış net2 4.573.976,43 · bunun CALCULATED'ı 2493. MALIYET=0 olup hareketi OLAN kalem sayısı 0.",
        komisyonKorundu: "satisKarTazele kullanıldı; kalemin mevcut commissionRate'i okunup geri verildi.",
      }),
    },
  });
  console.log("   ✓ AuditLog: MALIYET_BAGSIZ_KAR_TAZELENDI");

  const sonrakiDurum = await durumDagilimi();
  const sonrakiMarj = await panelMarji();
  yaz("SONRA — ölçüldü (tahmin değil)", sonrakiDurum, sonrakiMarj);

  console.log("\n   FARK (satış sayısı) — YAZILDI, YORUMLANMADI:");
  for (const d of new Set([...oncekiDurum.keys(), ...sonrakiDurum.keys()])) {
    const a = oncekiDurum.get(d)?.n ?? 0;
    const b = sonrakiDurum.get(d)?.n ?? 0;
    console.log("     " + d.padEnd(20) + (b - a >= 0 ? "+" : "") + (b - a));
  }
  console.log("\n   ⛔ Σ net2 ÖNCE ve SONRA yan yana yazıldı, ORANLARI BÖLÜNMEDİ:");
  console.log("     küme değişiyor (bağsız satışların net2'si null oluyor), bölüm");
  console.log("     iki farklı kümeyi karşılaştırmak olurdu.");

  console.log("\n" + "=".repeat(96));
  console.log("YAZILDI. Geri alma: kodu geri al + bu betiği yeniden koş.");
  console.log("=".repeat(96) + "\n");
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
