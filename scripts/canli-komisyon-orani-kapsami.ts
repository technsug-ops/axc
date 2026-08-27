import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  commissionRate KAPSAMI — SALT OKUMA, HİÇBİR ŞEY YAZILMAZ
 * ----------------------------------------------------------------------------
 *      npm run canli:komisyon-kapsami
 *
 *  ⚠ NİYE: içe aktarma `commissionRate` alanını HİÇ yazmıyor (ölçüldü —
 *  `canli-satis-ice-aktar.ts` içinde o alan geçmiyor). `null` "bilinmiyor"
 *  demek olduğu için kâr motoru `RULE_MISSING` üretiyor ve NET hesaplanmıyor.
 *
 *  ⛔ SORU: bu, marj rakamının basılamamasının sebeplerinden biri mi?
 *  Marj şerhi MALİYET BAĞINI ölçüyor, komisyon oranını değil. İkisi ekranda
 *  aynı görünüyor olabilir ama ÇÖZÜMÜN YERİ FARKLI:
 *    · maliyet bağı eksikse → iş alım defterinde
 *    · komisyon oranı eksikse → iş kanal beyanında / hakedişte
 *
 *  ⛔ HÜKÜM YOK — ölçüm, öneri ayrı.
 * ============================================================================
 */

const yuzde = (a: number, b: number) => (b === 0 ? "—" : ((a / b) * 100).toFixed(1) + "%");

async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) {
    console.log("\n⛔ CANLI ADRES OKUNAMADI\n");
    process.exitCode = 1;
    return;
  }
  const p = new PrismaClient({ adapter: new PrismaMariaDb(c.veri.ham) });

  console.log("\n" + "=".repeat(104));
  console.log("commissionRate KAPSAMI — SALT OKUMA");
  console.log("=".repeat(104));

  /** ⛔ İPTAL SÜZGECİ HER SORGUDA — iptal satış hiçbir hesaba girmez. */
  const kalemler = await p.saleItem.findMany({
    where: { sale: { iptalTarihi: null } },
    select: {
      commissionRate: true, quantity: true, unitPriceAmount: true, variantId: true,
      sale: {
        select: {
          id: true, soldAt: true, profitStatus: true,
          importKaynak: true, channelAccountId: true,
          channelAccount: { select: { name: true, channel: { select: { code: true } } } },
        },
      },
    },
  });

  console.log("\n① KAPSAM — iptalsiz satış kalemi: " + kalemler.length);

  // ── Kanal × kaynak kırılımı ────────────────────────────────────────────
  type Kova = { toplam: number; bos: number; tutar: number };
  const kanalKova = new Map<string, Kova>();
  const kaynakKova = new Map<string, Kova>();
  const ekle = (m: Map<string, Kova>, k: string, bos: boolean, tutar: number) => {
    const v = m.get(k) ?? { toplam: 0, bos: 0, tutar: 0 };
    v.toplam++;
    if (bos) { v.bos++; v.tutar += tutar; }
    m.set(k, v);
  };

  for (const k of kalemler) {
    const bos = k.commissionRate === null;
    const tutar = Number(k.unitPriceAmount.toString()) * k.quantity;
    ekle(kanalKova, k.sale.channelAccount.channel.code, bos, tutar);
    /** ⚠ `null` kaynak = ELLE girilmiş; içe aktarma her zaman damga bırakır. */
    ekle(kaynakKova, k.sale.importKaynak ?? "(elle girilmiş)", bos, tutar);
  }

  const yaz = (baslik: string, m: Map<string, Kova>) => {
    console.log("\n" + baslik);
    console.log("   " + "kırılım".padEnd(24) + "kalem".padStart(7) + "  oranı BOŞ".padStart(11) +
      "     pay" + "        boş kalemin cirosu".padStart(22));
    console.log("   " + "─".repeat(78));
    for (const [k, v] of [...m].sort((a, b) => b[1].bos - a[1].bos)) {
      console.log("   " + k.slice(0, 23).padEnd(24) + String(v.toplam).padStart(7) +
        String(v.bos).padStart(11) + yuzde(v.bos, v.toplam).padStart(9) +
        v.tutar.toFixed(2).padStart(20));
    }
  };
  yaz("② KANAL BAZINDA", kanalKova);
  yaz("③ KAYNAK BAZINDA", kaynakKova);

  const bosKalem = kalemler.filter((k) => k.commissionRate === null);
  console.log("\n   TOPLAM BOŞ: " + bosKalem.length + " / " + kalemler.length +
    "  (" + yuzde(bosKalem.length, kalemler.length) + ")");

  // ── NET durumu ─────────────────────────────────────────────────────────
  console.log("\n④ KÂR DURUMU — satış bazında (iptalsiz)");
  const satislar = new Map<string, { durum: string | null; bosKalem: number; kalem: number }>();
  for (const k of kalemler) {
    const s = satislar.get(k.sale.id) ?? { durum: k.sale.profitStatus, bosKalem: 0, kalem: 0 };
    s.kalem++;
    if (k.commissionRate === null) s.bosKalem++;
    satislar.set(k.sale.id, s);
  }
  const durumSayac = new Map<string, { n: number; oraniBos: number }>();
  for (const [, s] of satislar) {
    const d = s.durum ?? "(boş)";
    const v = durumSayac.get(d) ?? { n: 0, oraniBos: 0 };
    v.n++;
    if (s.bosKalem > 0) v.oraniBos++;
    durumSayac.set(d, v);
  }
  console.log("   durum".padEnd(24) + "satış".padStart(7) + "   oranı boş olan".padStart(18));
  console.log("   " + "─".repeat(48));
  for (const [d, v] of [...durumSayac].sort((a, b) => b[1].n - a[1].n)) {
    console.log("   " + d.padEnd(22) + String(v.n).padStart(7) + String(v.oraniBos).padStart(16));
  }

  // ── Marj şerhi kovalarıyla KESİŞİM ─────────────────────────────────────
  console.log("\n⑤ MARJ ŞERHİ KOVALARIYLA KESİŞİM");
  console.log("   ⚠ Şerh MALİYET BAĞINI ölçer, komisyon oranını DEĞİL. Aşağıdaki");
  console.log("     tablo ikisinin AYNI satışa mı düştüğünü söyler.");

  /** Maliyet bağı: kalemin GİRİŞ hareketi var mı (şerhle aynı ölçüt). */
  const girisli = new Set(
    (await p.stockMovement.findMany({
      where: { saleItemId: { not: null } },
      select: { saleItemId: true },
    })).map((h) => h.saleItemId!),
  );
  const kalemIdli = await p.saleItem.findMany({
    where: { sale: { iptalTarihi: null } },
    select: { id: true, commissionRate: true },
  });

  let ikisiDe = 0, yalnizMaliyet = 0, yalnizKomisyon = 0, temiz = 0;
  for (const k of kalemIdli) {
    const maliyetVar = girisli.has(k.id);
    const oranVar = k.commissionRate !== null;
    if (!maliyetVar && !oranVar) ikisiDe++;
    else if (!maliyetVar && oranVar) yalnizMaliyet++;
    else if (maliyetVar && !oranVar) yalnizKomisyon++;
    else temiz++;
  }
  console.log("\n   " + "durum".padEnd(46) + "kalem");
  console.log("   " + "─".repeat(56));
  console.log("   ✓ ikisi de TAM (maliyet bağı + komisyon oranı)".padEnd(46) + String(temiz).padStart(8));
  console.log("   ⚠ YALNIZ maliyet bağı eksik (oran var)".padEnd(46) + String(yalnizMaliyet).padStart(8));
  console.log("   ⭐ YALNIZ komisyon oranı eksik (maliyet var)".padEnd(46) + String(yalnizKomisyon).padStart(8));
  console.log("   ⛔ İKİSİ DE eksik".padEnd(46) + String(ikisiDe).padStart(8));
  console.log("\n   → ⭐ satırı, YALNIZ komisyon oranı doldurulursa NET'i hesaplanabilecek");
  console.log("     kalemleri gösterir. Marj şerhi bunları HİÇ saymıyor.");

  // ── Geriye doldurma yapılabilir mi ─────────────────────────────────────
  console.log("\n⑥ GERİYE DOLDURMA — KAYNAK SORUSU");
  const tarifeler = await p.komisyonTarifesi.findMany({
    select: { channelAccountId: true, pencereBaslangic: true, pencereBitis: true },
  });
  console.log("   yüklü tarife penceresi: " + tarifeler.length);
  let kapsanan = 0;
  for (const k of bosKalem) {
    const v = tarifeler.some((t) =>
      t.channelAccountId === k.sale.channelAccountId &&
      t.pencereBaslangic <= k.sale.soldAt && t.pencereBitis >= k.sale.soldAt);
    if (v) kapsanan++;
  }
  console.log("   oranı boş " + bosKalem.length + " kalemin " + kapsanan +
    " tanesi bir tarife penceresine düşüyor  (" + yuzde(kapsanan, bosKalem.length) + ")");

  /** Hakediş: kanalın FİİLEN kestiği komisyon — kaynak önceliğinde 1. basamak. */
  const hakedisli = await p.settlementItem.count({ where: { saleId: { not: null } } });
  const hakedisToplam = await p.settlementItem.count();
  console.log("   hakediş kalemi: " + hakedisToplam + "   ·   satışa BAĞLI olan: " + hakedisli);

  console.log("\n" + "=".repeat(104));
  console.log("SALT OKUMA — HİÇBİR ŞEY YAZILMADI. HÜKÜM YOK.");
  console.log("=".repeat(104) + "\n");
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
