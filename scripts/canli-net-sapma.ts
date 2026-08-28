import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  KARGO YAZIMINDAKİ NET SAPMASI — SEBEP ARAMA (SALT OKUMA)
 * ----------------------------------------------------------------------------
 *      npm run canli:net-sapma
 *
 *  Kargo yazımından sonra ölçülen düşüş beklenenden **₺1.404,50** az çıktı.
 *  Betiğin kendi kuralı: _"sapma varsa SEBEBİ ARANIR — 'yakın' bir sonuç
 *  değildir."_ Bu betik o sebebi arıyor.
 *
 *  ⭐ AYIRT EDİCİ TEST: kargo YAZILMAMIŞ satışlar da tazelenince değişiyor
 *  mu? Değişiyorsa sapmanın kaynağı kargo değil, **bayat NET damgalarıdır**
 *  — ve o zaman kargo hesabı doğru, kıyas noktası yanlıştı.
 *
 *  ⛔ HÜKÜM YOK, YAZMA YOK.
 * ============================================================================
 */

const ORNEK = 120;
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
  const { karOnizle } = await import("../src/lib/kar-yeniden");
  const { kdvDahilKargo } = await import("../src/lib/kargo-kdv");

  console.log("\n" + "=".repeat(100));
  console.log("NET SAPMASI — SEBEP ARAMA (salt okuma)");
  console.log("=".repeat(100));

  /**
   * KONTROL GRUBU: kargosu HİÇ OLMAYAN, CALCULATED, NET-2'si yazılı satışlar.
   * Bunlara bugün dokunulmadı; tazeleme onları da değiştiriyorsa sebep
   * kargo DEĞİLDİR.
   */
  /** ⚠ İki grup AYRI sınanır: kargosu olan (yazdıklarımız) ve olmayan. */
  const HEDEF = process.argv.includes("--kargolu")
    ? { cargoAmount: { not: null } }
    : { cargoAmount: null };
  const kontrol = await p.sale.findMany({
    where: {
      iptalTarihi: null, ...HEDEF,
      profitStatus: "CALCULATED", net2Amount: { not: null },
    },
    select: {
      id: true, code: true, net1Amount: true, net2Amount: true,
      cargoCarrierId: true, cargoDesi: true, cargoAmount: true,
      items: { select: { id: true, commissionRate: true } },
    },
    take: ORNEK,
    orderBy: { soldAt: "desc" },
  });

  console.log("\n① KONTROL GRUBU — kargosu " +
    (process.argv.includes("--kargolu") ? "OLAN" : "OLMAYAN") + " " +
    kontrol.length + " satış");
  console.log("   (bugün bunlara dokunulmadı; motor yine de farklı hesaplıyor mu?)");
  let ayni = 0, farkli = 0, toplamFark = 0;
  const ornekler: string[] = [];
  for (const s of kontrol) {
    const o = await karOnizle({
      saleId: s.id,
      kalemler: s.items.map((k) => ({
        saleItemId: k.id,
        commissionRate: k.commissionRate === null ? null : Number(k.commissionRate.toString()),
        commissionAmount: null,
      })),
      cargoCarrierId: s.cargoCarrierId,
      cargoDesi: s.cargoDesi === null ? null : Number(s.cargoDesi.toString()),
      cargoAmountManual: kdvDahilKargo(
        s.cargoAmount === null ? null : Number(s.cargoAmount.toString()),
      ),
    });
    if (!o) continue;
    const kayitli = Number(s.net2Amount!.toString());
    const hesap = o.yeni.net2;
    const d = hesap - kayitli;
    if (Math.abs(d) < 0.005) ayni++;
    else {
      farkli++;
      toplamFark += d;
      if (ornekler.length < 8) {
        ornekler.push((s.code ?? "—").padEnd(15) + "kayıtlı " + t2(kayitli) +
          " · motor " + t2(hesap) + " · fark " + t2(d));
      }
    }
  }
  console.log("   kayıtlı NET-2 ile motorun hesabı AYNI : " + ayni);
  console.log("   ⭐ FARKLI                              : " + farkli);
  console.log("   örnekteki toplam fark                 : " + t2(toplamFark));
  for (const o of ornekler) console.log("     " + o);

  console.log("\n② HÜKÜM");
  if (farkli === 0) {
    console.log("   ⛔ Kontrol grubunda fark YOK → sapmanın sebebi bayat damga");
    console.log("     DEĞİL. Başka bir yerde aranmalı; bu betik cevap vermedi.");
  } else {
    const oran = farkli / (ayni + farkli);
    console.log("   ⭐ Kargosu HİÇ OLMAYAN satışlarda bile motorun hesabı");
    console.log("     kayıtlı NET'ten sapıyor: " + (oran * 100).toFixed(1) + "%.");
    console.log("     Yani defterdeki NET damgalarının bir kısmı BAYAT ve");
    console.log("     tazeleme onları da düzeltti. Kargo yazımındaki");
    console.log("     ₺1.404,50'lik açık, kargonun değil BU düzeltmenin sonucu.");
    console.log("   ⚠ AMA BÜYÜKLÜK BU ÖRNEKTEN GENELLENMEZ: " + ORNEK + " satışlık");
    console.log("     bir örneklem yön verir, rakam vermez.");
  }

  console.log("\n③ KAPSAM — kaç satış bayat olabilir");
  const toplam = await p.sale.count({
    where: { iptalTarihi: null, profitStatus: "CALCULATED", net2Amount: { not: null } },
  });
  const bayatOlabilir = await p.sale.count({
    where: {
      iptalTarihi: null, profitStatus: "CALCULATED", net2Amount: { not: null },
      cargoAmount: null,
    },
  });
  console.log("   NET-2 yazılı satış " + toplam + " · bunlardan kargosuz " + bayatOlabilir);
  console.log("   ⚠ \"Bayat olabilir\" ≠ \"bayat\". Ölçülen yalnız yukarıdaki örneklem.");

  console.log("\n" + "=".repeat(100));
  console.log("SALT OKUMA — HİÇBİR ŞEY YAZILMADI.");
  console.log("=".repeat(100) + "\n");
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
