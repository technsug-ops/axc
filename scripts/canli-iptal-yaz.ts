import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  DÖRT İPTAL — UYGULAMANIN KENDİ GÖVDESİYLE
 * ----------------------------------------------------------------------------
 *      npm run canli:iptal-yaz            → kuru koşum
 *      npm run canli:iptal-yaz -- --yaz   → yazar
 *
 *  ⛔ İKİNCİ İPTAL MANTIĞI YAZILMADI — kullanıcı şartı. `lib/satis-iptali-veri`
 *  içindeki `iptalOnizle` / `iptalUygula` çağrılıyor; ekranın kullandığı
 *  gövdenin AYNISI. Kendi `update`imizi yazsaydık stok aynası, imza kontrolü
 *  ve iade engeli ikinci kez — ve bir gün farklı — uygulanırdı.
 *
 *  ⚠ HALİL AYIRDI: dosyada "iptal" yazan BEŞ satıştan biri (`4619254455`)
 *  aslında İADE. Ona dokunulmuyor — iptal yazmak satışı HİÇ OLMAMIŞ gibi
 *  gösterirdi. _(Panoya: dosyadaki `TÜR` sütunu tek başına hüküm vermez.)_
 *
 *  ═══ ⚠ SEBEP — ZORUNLU ALAN, VE BU BİR İDDİA ═══
 *  `iptalUygula` `sebep: SatisIptalSebebi` istiyor ve `null` kabul etmiyor.
 *  Dosya yalnız "iptal" diyor; KİMİN iptal ettiğini söylemiyor.
 *
 *  Seçilen: `MAGAZA_DIGER` — çünkü listedeki TEK değer ki kendisi bir sebep
 *  İDDİA ETMİYOR ve açıklama ZORUNLU kılıyor (`ACIKLAMA_ZORUNLU`). Gerçek
 *  bilgi nota yazılıyor. Ötekiler ("müşteri vazgeçti", "stok yok", "kötü
 *  niyet") ölçmediğimiz şeyler söylerdi.
 *
 *  ⚠ AMA `MAGAZA_DIGER` YİNE DE "mağaza kaynaklı" DİYOR ve bunu ölçmedik.
 *  Ölçüldü: `iptalSebebi` hiçbir HESABI sürmüyor — yalnız ekranda
 *  müşteri/mağaza gruplaması yapıyor (`lib/satis-iptali.ts`). Yani bedeli
 *  yanlış bir rakam değil, yanlış bir ETİKET; ve tek tıkla düzeltilebilir.
 *  ⛔ Kullanıcı başka bir sebep derse o yazılır.
 * ============================================================================
 */

const YAZ = process.argv.includes("--yaz");

/** ⭐ Halil doğruladı 28.08.2026 — dördü iptal, beşincisi (4619254455) İADE. */
const KODLAR = ["4234503772", "4597407440", "4852324050", "4002405216"];

const NOT =
  "Satış dosyasından içe aktarıldı (TÜR=iptal, 28.08.2026). Sebep DOSYADA YOK ve uydurulmadı; " +
  "`MAGAZA_DIGER` yalnız zorunlu alanı karşılamak için seçildi. Kullanıcı gerçek sebebi " +
  "biliyorsa ekrandan değiştirebilir.";

const t2 = (x: number) => x.toFixed(2).padStart(14);

async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) {
    console.log("\n⛔ CANLI ADRES OKUNAMADI\n");
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(c.veri.ham);
  const { prisma: p } = await import("../src/lib/prisma");
  const { iptalOnizle, iptalUygula } = await import("../src/lib/satis-iptali-veri");

  const satislar = await p.sale.findMany({
    where: { code: { in: KODLAR } },
    select: { id: true, code: true, soldAt: true, iptalTarihi: true },
  });

  console.log("\n" + "=".repeat(100));
  console.log("DÖRT İPTAL — " + (YAZ ? "⚠ YAZIM" : "KURU KOŞUM (yazmaz)"));
  console.log("=".repeat(100));

  const stokOnce = await p.stockMovement.aggregate({ _sum: { quantityDelta: true } });
  const ciroOnce = await p.saleItem.findMany({
    where: { sale: { iptalTarihi: null } },
    select: { quantity: true, unitPriceAmount: true },
  });
  const ciroTop = (l: { quantity: number; unitPriceAmount: { toString(): string } }[]) =>
    l.reduce((t, k) => t + Number(k.unitPriceAmount.toString()) * k.quantity, 0);
  console.log("\n   ÖNCE: iptalsiz ciro " + t2(ciroTop(ciroOnce)) +
    " · net stok " + (stokOnce._sum.quantityDelta ?? 0));

  console.log("\n① ÖNİZLEME — uygulamanın kendi gövdesinden");
  let toplamCiro = 0, toplamAdet = 0;
  const planlar: { id: string; kod: string; imza: string }[] = [];
  for (const s of satislar) {
    const o = await iptalOnizle(s.id, "MAGAZA_DIGER", NOT);
    if (o === null) { console.log("   " + s.code + "  ⛔ ÖNİZLEME NULL"); continue; }
    const engel = (o as { engel?: string }).engel;
    if (engel) { console.log("   " + s.code + "  ⛔ ENGEL: " + engel); continue; }
    const plan = o as unknown as {
      imza: string;
      plan: { geriDonenAdet: number; etki: { ciro: number; net2: number | null; hakedisEslesmisMi: boolean } };
    };
    const et = plan.plan.etki;
    toplamCiro += et.ciro;
    toplamAdet += plan.plan.geriDonenAdet;
    console.log("   " + s.code + "  ciro " + et.ciro.toFixed(2).padStart(9) +
      " · NET-2 " + (et.net2 === null ? "—" : et.net2.toFixed(2)).padStart(9) +
      " · stoğa dönecek " + plan.plan.geriDonenAdet + " adet" +
      (et.hakedisEslesmisMi ? "   ⚠ HAKEDİŞ EŞLEŞMİŞ" : ""));
    planlar.push({ id: s.id, kod: s.code ?? "—", imza: plan.imza });
  }
  console.log("\n   TOPLAM: ciro −" + toplamCiro.toFixed(2) + " · stoğa dönecek " + toplamAdet + " adet");
  console.log("\n   SEBEP: MAGAZA_DIGER + ZORUNLU AÇIKLAMA");
  console.log("     ⚠ Dosya sebebi söylemiyor; uydurulmadı. `iptalSebebi` hiçbir");
  console.log("       HESABI sürmüyor (ölçüldü) — yalnız ekran gruplaması.");

  if (!YAZ) {
    console.log("\n" + "=".repeat(100));
    console.log("KURU KOŞUM — HİÇBİR ŞEY YAZILMADI.");
    console.log("Yazmak için:  npm run canli:iptal-yaz -- --yaz");
    console.log("=".repeat(100) + "\n");
    await p.$disconnect();
    return;
  }

  const kullanici = await p.user.findFirst({ where: { isActive: true }, select: { id: true, email: true } });
  if (!kullanici) {
    console.log("\n⛔ AKTİF KULLANICI YOK — iptal iz bırakamaz, DURULDU.\n");
    await p.$disconnect();
    process.exitCode = 1;
    return;
  }
  console.log("\n⚠ YAZILIYOR — iz sahibi: " + kullanici.email);
  let ok = 0, engelli = 0;
  for (const x of planlar) {
    const r = await iptalUygula({
      saleId: x.id, sebep: "MAGAZA_DIGER", not: NOT,
      onaylananImza: x.imza, kullaniciId: kullanici.id, an: new Date(),
    });
    if (r.tamam) { ok++; console.log("   ✓ " + x.kod + " — stoğa dönen " + r.geriDonenAdet); }
    else { engelli++; console.log("   ⛔ " + x.kod + " — ENGEL: " + r.engel); }
  }
  console.log("\n   iptal edildi " + ok + " · engellendi " + engelli);

  const stokSonra = await p.stockMovement.aggregate({ _sum: { quantityDelta: true } });
  const ciroSonra = await p.saleItem.findMany({
    where: { sale: { iptalTarihi: null } },
    select: { quantity: true, unitPriceAmount: true },
  });
  console.log("\n   SONRA: iptalsiz ciro " + t2(ciroTop(ciroSonra)) +
    " · net stok " + (stokSonra._sum.quantityDelta ?? 0));
  console.log("   ⭐ ciro farkı  : " + t2(ciroTop(ciroSonra) - ciroTop(ciroOnce)) +
    "   (beklenen −" + toplamCiro.toFixed(2) + ")");
  console.log("   ⭐ stok farkı  : " +
    ((stokSonra._sum.quantityDelta ?? 0) - (stokOnce._sum.quantityDelta ?? 0)) +
    "   (beklenen +" + toplamAdet + " — mal geri döner)");

  await p.auditLog.create({
    data: {
      action: "DOSYADAN_IPTAL_ISARETLENDI",
      targetType: "Sale",
      detail: JSON.stringify({
        gerekce: "Satış dosyasında TÜR=iptal yazan satışlar. Halil doğruladı 28.08.2026.",
        kodlar: KODLAR,
        haricTutulan: "4619254455 — Halil ayırdı: bu bir İADE, iptal değil. Satış gerçekleşti, mal döndü.",
        sebep: "MAGAZA_DIGER — dosya sebebi söylemiyor, uydurulmadı. Zorunlu alanı karşılamak için seçildi; gerçek bilgi notta. iptalSebebi hiçbir hesabı sürmüyor (ölçüldü), yalnız ekran gruplaması.",
        govde: "lib/satis-iptali-veri → iptalOnizle/iptalUygula. İkinci iptal mantığı YAZILMADI.",
      }),
    },
  });
  console.log("   ✓ AuditLog: DOSYADAN_IPTAL_ISARETLENDI");

  console.log("\n" + "=".repeat(100));
  console.log("YAZILDI. Geri alma: satış ekranından iptal geri alınır.");
  console.log("=".repeat(100) + "\n");
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
