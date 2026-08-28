import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  ④ — `CALCULATED` OLMAYAN SATIRLARDA NET ALANLARINI BOŞALT
 * ----------------------------------------------------------------------------
 *      npm run canli:net-temizle          → kuru koşum
 *      npm run canli:net-temizle -- --yaz → yazar
 *
 *  Kullanıcı kararı 28.08.2026: _"alan bir iddiadır. Dolu `net2Amount`
 *  'kârı budur' der. ₺4,7M'lik iddiayı disipline değil MEKANİZMAYA
 *  bağlarız."_
 *
 *  ⛔ NİYE `karYenidenYaz` DEĞİL: kod düzeltildi (`netYaz`) ama o yalnız
 *  YENİ yazmaları etkiliyor. Var olan 2525 satır için motoru yeniden
 *  koşturmak ~40 dakika sürer ve HİÇBİR HESABI DEĞİŞTİRMEZ — yapılacak
 *  tek şey geçersiz bir değeri SİLMEK. Hesaplama değil, temizlik.
 *
 *  ⚠ NE SİLİNİYOR: yalnız `net1Amount` ve `net2Amount`. `profitStatus`,
 *  `profitCurrency`, `SaleFee` kalemleri ve stok defteri ELLENMİYOR.
 *  Kesinti kalemleri kalıyor çünkü onlar ÖLÇÜLMÜŞ gerçekler (komisyon,
 *  stopaj); geçersiz olan yalnız onlardan türetilen NET.
 *
 *  ⚠ GERİ ALINABİLİR: `satisKarTazele` her satışı yeniden hesaplar ve
 *  `CALCULATED` olanların NET'ini yeniden yazar. Silinen değerler zaten
 *  türetilmiş; kaynak veri (kesintiler, maliyet damgaları) duruyor.
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
  const p = new PrismaClient({ adapter: new PrismaMariaDb(c.veri.ham) });

  /**
   * ⛔ ÖLÇÜT DURUMA GENEL — `NO_COST`a özel DEĞİL. `RULE_MISSING` ve
   * `CURRENCY_MISMATCH` de eksik bir hesabı temsil eder; bugün o durumda
   * satır olmaması yarın olmayacağı anlamına gelmez.
   * ⚠ `profitStatus: null` olan satır HİÇ hesaplanmamıştır — NET'i zaten
   * boş olmalı; koşula dahil.
   */
  const kosul = {
    NOT: { profitStatus: "CALCULATED" as const },
    OR: [{ net1Amount: { not: null } }, { net2Amount: { not: null } }],
  };

  const say = async () => {
    const s = await p.sale.groupBy({
      by: ["profitStatus"], where: { iptalTarihi: null },
      _count: true, _sum: { net1Amount: true, net2Amount: true },
    });
    const k = await p.saleItem.groupBy({
      by: ["profitStatus"], where: { sale: { iptalTarihi: null } },
      _count: true, _sum: { net1Amount: true, net2Amount: true },
    });
    return { s, k };
  };
  const yaz = (baslik: string, d: Awaited<ReturnType<typeof say>>) => {
    console.log("\n   " + baslik);
    for (const [ad, liste] of [["SATIŞ", d.s], ["KALEM", d.k]] as const) {
      console.log("     " + ad);
      for (const x of liste) {
        console.log("       " + String(x.profitStatus ?? "(boş)").padEnd(20) +
          String(x._count).padStart(6) +
          "  net1 " + t2(Number(x._sum.net1Amount?.toString() ?? 0)) +
          "  net2 " + t2(Number(x._sum.net2Amount?.toString() ?? 0)));
      }
    }
  };

  const hedefSatis = await p.sale.count({ where: kosul });
  const hedefKalem = await p.saleItem.count({ where: kosul });

  console.log("\n" + "=".repeat(104));
  console.log("④ NET TEMİZLİĞİ — " + (YAZ ? "⚠ YAZIM" : "KURU KOŞUM (yazmaz)"));
  console.log("=".repeat(104));
  console.log("\n   hedef: CALCULATED OLMAYIP net1 ya da net2 DOLU");
  console.log("     satış " + hedefSatis + " · kalem " + hedefKalem);

  const once = await say();
  yaz("ÖNCE", once);

  if (!YAZ) {
    console.log("\n" + "=".repeat(104));
    console.log("KURU KOŞUM — HİÇBİR ŞEY YAZILMADI.");
    console.log("Yazmak için:  npm run canli:net-temizle -- --yaz");
    console.log("=".repeat(104) + "\n");
    await p.$disconnect();
    return;
  }

  console.log("\n⚠ TEMİZLENİYOR…");
  const sSonuc = await p.sale.updateMany({
    where: kosul, data: { net1Amount: null, net2Amount: null },
  });
  const kSonuc = await p.saleItem.updateMany({
    where: kosul, data: { net1Amount: null, net2Amount: null },
  });
  console.log("   satış " + sSonuc.count + " · kalem " + kSonuc.count + " güncellendi");

  await p.auditLog.create({
    data: {
      action: "NET_ALANLARI_TEMIZLENDI",
      targetType: "Sale",
      detail: JSON.stringify({
        gerekce: "karYenidenYaz durumdan bağımsız net yazıyordu; NO_COST satırlarda net1 ₺5.668.424 · net2 ₺4.714.528 duruyordu — maliyeti düşülmemiş rakamlar. Alan bir iddiadır; süzgeci unutan ilk tüketici onu kâra yazardı. Kullanıcı kararı 28.08.2026.",
        olcut: "profitStatus != CALCULATED olan satır/kalemlerde net1Amount ve net2Amount null",
        satis: sSonuc.count, kalem: kSonuc.count,
        dokunulmayan: "profitStatus · profitCurrency · SaleFee kalemleri · stok defteri. Kesintiler ÖLÇÜLMÜŞ gerçeklerdir; geçersiz olan yalnız onlardan türetilen NET.",
        kodTarafi: "lib/kar-yeniden.ts → netYaz(): NET yalnız CALCULATED iken yazılır. Kural duruma GENEL, NO_COST'a özel değil.",
        ikinciSavunma: "satis-toplami.ts'teki profitStatus CALCULATED süzgeci KALDIRILMADI.",
      }),
    },
  });
  console.log("   ✓ AuditLog: NET_ALANLARI_TEMIZLENDI");

  const sonra = await say();
  yaz("SONRA — ölçüldü", sonra);

  const kalan = await p.sale.count({ where: kosul });
  const kalanK = await p.saleItem.count({ where: kosul });
  console.log("\n   ⭐ KALAN İHLAL: satış " + kalan + " · kalem " + kalanK +
    (kalan + kalanK === 0 ? "   ✓ SIFIR" : "   ⛔ TEMİZLENMEDİ"));
  if (kalan + kalanK > 0) process.exitCode = 1;

  console.log("\n" + "=".repeat(104));
  console.log("YAZILDI.");
  console.log("=".repeat(104) + "\n");
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
