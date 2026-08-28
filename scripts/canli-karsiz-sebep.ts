import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  K67 — "KÂRI HESAPLANAMAYAN SATIŞ" KUTUSUNUN SEBEP DÖKÜMÜ — SALT OKUMA
 * ----------------------------------------------------------------------------
 *      npm run canli:karsiz-sebep
 *
 *  ⛔ Panel kutusu TEK SAYI gösteriyor ve üç ayrı sebebi gizliyor. Okuyan
 *  ne yapacağını bilemiyor: "alım gir" ile "komisyon oranı gir" farklı
 *  işlerdir ve farklı ekranlara gider.
 *
 *  ⚠ ÖLÇÜT KUTUNUN KENDİ ÖLÇÜTÜDÜR — `gorev-verisi.ts` ne sayıyorsa o:
 *      iptalTarihi: null  AND  (profitStatus null OR profitStatus != CALCULATED)
 *  Başka bir küme sayılsaydı "toplam kutuyla tutmuyor" derdik ve olmayan
 *  bir hata aranırdı. _(Anayasa: "sonda parametresi ekranın parametresi
 *  değildir".)_
 *
 *  ⛔ HÜKÜM YOK — sebepler sayılır, çözüm önerilmez.
 * ============================================================================
 */

async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) {
    console.log("\n⛔ CANLI ADRES OKUNAMADI\n");
    process.exitCode = 1;
    return;
  }
  const p = new PrismaClient({ adapter: new PrismaMariaDb(c.veri.ham) });

  /** ⚠ KUTUNUN KENDİ KOŞULU — birebir kopya. */
  const kutuKosulu = {
    iptalTarihi: null,
    OR: [{ profitStatus: null }, { NOT: { profitStatus: "CALCULATED" as const } }],
  };
  const kutuSayisi = await p.sale.count({ where: kutuKosulu });

  const satislar = await p.sale.findMany({
    where: kutuKosulu,
    select: {
      id: true, profitStatus: true,
      channelAccount: { select: { channel: { select: { code: true } } } },
      items: { select: { id: true, commissionRate: true } },
    },
  });

  /** Maliyet bağı ölçütü — şerhle AYNI: kalemin GİRİŞ hareketi var mı. */
  const girisli = new Set(
    (await p.stockMovement.findMany({
      where: { saleItemId: { not: null } },
      select: { saleItemId: true },
    })).map((h) => h.saleItemId!),
  );

  console.log("\n" + "=".repeat(100));
  console.log("K67 — KÂRI HESAPLANAMAYAN SATIŞ · SEBEP DÖKÜMÜ (salt okuma)");
  console.log("=".repeat(100));
  console.log("\n   kutudaki sayı (gorev-verisi.ts ölçütü): " + kutuSayisi);

  let yalnizMaliyet = 0;
  let yalnizKomisyon = 0;
  let ikisiDe = 0;
  let dorduncuSebep = 0;
  const dorduncuOrnek: string[] = [];
  const kanalKova = new Map<string, { m: number; k: number; i: number; d: number }>();

  for (const s of satislar) {
    const maliyetEksik = s.items.some((i) => !girisli.has(i.id));
    const oranEksik = s.items.some((i) => i.commissionRate === null);
    const kod = s.channelAccount.channel.code;
    const v = kanalKova.get(kod) ?? { m: 0, k: 0, i: 0, d: 0 };

    if (maliyetEksik && oranEksik) { ikisiDe++; v.i++; }
    else if (maliyetEksik) { yalnizMaliyet++; v.m++; }
    else if (oranEksik) { yalnizKomisyon++; v.k++; }
    else {
      /**
       * ⛔ DÖRDÜNCÜ SEBEP — maliyet de oran da tamam ama kâr yine
       * hesaplanmamış. Sıfır değilse SAYILIR ve ÖRNEĞİ yazılır; "üç sebep
       * var" demek kolaydı ama ölçüm onu doğrulamadan yazılmaz.
       */
      dorduncuSebep++; v.d++;
      if (dorduncuOrnek.length < 8) {
        dorduncuOrnek.push(s.id.slice(0, 10) + " · " + kod + " · durum=" + (s.profitStatus ?? "null"));
      }
    }
    kanalKova.set(kod, v);
  }

  const toplam = yalnizMaliyet + yalnizKomisyon + ikisiDe + dorduncuSebep;
  console.log("\n   SEBEP".padEnd(44) + "satış");
  console.log("   " + "─".repeat(54));
  console.log("   ① yalnız MALİYET BAĞI eksik".padEnd(44) + String(yalnizMaliyet).padStart(8));
  console.log("   ② yalnız KOMİSYON ORANI eksik".padEnd(44) + String(yalnizKomisyon).padStart(8));
  console.log("   ③ İKİSİ DE eksik".padEnd(44) + String(ikisiDe).padStart(8));
  console.log("   ④ ikisi de TAM ama kâr yok".padEnd(44) + String(dorduncuSebep).padStart(8));
  console.log("   " + "─".repeat(54));
  console.log("   TOPLAM".padEnd(44) + String(toplam).padStart(8) +
    (toplam === kutuSayisi ? "   ✓ kutuyla TUTUYOR" : "   ⛔ KUTUYLA TUTMUYOR (" + kutuSayisi + ")"));

  if (dorduncuSebep > 0) {
    console.log("\n   ⚠ DÖRDÜNCÜ SEBEP VAR — " + dorduncuSebep + " satış. Örnekler:");
    for (const o of dorduncuOrnek) console.log("     · " + o);
    console.log("     Bu satırlar için sebep BİLİNMİYOR; kutuya 'üç sebep' diye");
    console.log("     yazmak eksik bir tasnif olurdu.");
  }

  console.log("\n   KANAL BAZINDA");
  console.log("   kanal".padEnd(16) + "①".padStart(8) + "②".padStart(8) + "③".padStart(8) + "④".padStart(8));
  console.log("   " + "─".repeat(48));
  for (const [k, v] of [...kanalKova].sort((a, b) =>
    (b[1].m + b[1].k + b[1].i + b[1].d) - (a[1].m + a[1].k + a[1].i + a[1].d))) {
    console.log("   " + k.padEnd(16) + String(v.m).padStart(8) + String(v.k).padStart(8) +
      String(v.i).padStart(8) + String(v.d).padStart(8));
  }

  console.log("\n   ⭐ ② KOVASININ KALANI — ÇÖZÜM YOLU SORUSU");
  const kalanOransiz = await p.saleItem.findMany({
    where: { commissionRate: null, sale: { iptalTarihi: null } },
    select: {
      sale: { select: { code: true, importKaynak: true,
        channelAccount: { select: { channel: { select: { code: true } } } } } },
    },
  });
  const kalanKova = new Map<string, number>();
  for (const k of kalanOransiz) {
    const anahtar = k.sale.channelAccount.channel.code + " · " + (k.sale.importKaynak ?? "elle");
    kalanKova.set(anahtar, (kalanKova.get(anahtar) ?? 0) + 1);
  }
  console.log("     oranı hâlâ boş kalem: " + kalanOransiz.length);
  for (const [k, n] of [...kalanKova].sort((a, b) => b[1] - a[1])) {
    console.log("       " + k.padEnd(34) + String(n).padStart(6) + " kalem");
  }

  console.log("\n" + "=".repeat(100));
  console.log("SALT OKUMA — HİÇBİR ŞEY YAZILMADI. HÜKÜM YOK.");
  console.log("=".repeat(100) + "\n");
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
