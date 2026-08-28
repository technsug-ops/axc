import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  K68 — KESİNTİ KURALLARININ `validFrom` KAPSAMI — SALT OKUMA
 * ----------------------------------------------------------------------------
 *  ⛔ Bulundu 28.08.2026: bütün `ChannelFee` kuralları `2026-01-01`de
 *  başlıyor (N11 `2026-07-01`), ama defterdeki en eski satış `2024-01-14`.
 *  Motor kuralı `validFrom <= soldAt` ile süzüyor — DOĞRU davranış — ama
 *  sonucu şu: o tarihten ÖNCEKİ satışlarda komisyon KDV'si, ödeme gideri,
 *  hizmet bedeli ve TY sabit gideri HİÇ DÜŞÜLMÜYOR.
 *
 *  ⛔ HÜKÜM YOK: `2026-01-01` gerçek bir iş tarihi mi yoksa seed
 *  varsayılanı mı — BU ÖLÇÜMÜN CEVAPLAYACAĞI ŞEY DEĞİL. Ölçüm yalnız
 *  kapsamı sayar. Tarihi değiştirmek, bilmediğimiz bir dönem hakkında
 *  iddia kurmak olurdu.
 * ============================================================================
 */

const t2 = (n: number) => n.toFixed(2).padStart(15);

async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) { console.log("\n⛔ CANLI ADRES OKUNAMADI\n"); process.exitCode = 1; return; }
  const p = new PrismaClient({ adapter: new PrismaMariaDb(c.veri.ham) });

  const kurallar = await p.channelFee.findMany({
    where: { isActive: true },
    select: { code: true, validFrom: true, channel: { select: { code: true } } },
  });
  /** Kanal başına EN ERKEN kural başlangıcı — o tarihten öncesi kuralsız. */
  const enErken = new Map<string, Date>();
  for (const k of kurallar) {
    const o = enErken.get(k.channel.code);
    if (!o || k.validFrom < o) enErken.set(k.channel.code, k.validFrom);
  }

  console.log("\n" + "=".repeat(100));
  console.log("K68 — KESİNTİ KURALLARININ KAPSAM TARİHİ (salt okuma)");
  console.log("=".repeat(100));

  console.log("\n   KANAL          en erken kural   kuralsız satış        kuralsız ciro   pay");
  console.log("   " + "─".repeat(80));
  let toplamKuralsiz = 0;
  let toplamKuralsizCiro = 0;
  for (const [kanalKodu, tarih] of [...enErken].sort()) {
    const oncesi = await p.sale.findMany({
      where: { iptalTarihi: null, soldAt: { lt: tarih },
        channelAccount: { channel: { code: kanalKodu } } },
      select: { items: { select: { quantity: true, unitPriceAmount: true } } },
    });
    const hepsi = await p.sale.count({
      where: { iptalTarihi: null, channelAccount: { channel: { code: kanalKodu } } },
    });
    const ciro = oncesi.reduce((t, s) =>
      t + s.items.reduce((a, i) => a + Number(i.unitPriceAmount.toString()) * i.quantity, 0), 0);
    toplamKuralsiz += oncesi.length;
    toplamKuralsizCiro += ciro;
    console.log("   " + kanalKodu.padEnd(15) + tarih.toISOString().slice(0, 10) +
      String(oncesi.length).padStart(15) + t2(ciro) +
      (hepsi > 0 ? ((oncesi.length / hepsi) * 100).toFixed(1) + "%" : "—").padStart(8));
  }
  console.log("   " + "─".repeat(80));
  console.log("   TOPLAM".padEnd(15) + " ".repeat(10) + String(toplamKuralsiz).padStart(15) +
    t2(toplamKuralsizCiro));

  const ilk = await p.sale.findFirst({
    where: { iptalTarihi: null }, orderBy: { soldAt: "asc" }, select: { soldAt: true, code: true },
  });
  console.log("\n   defterdeki EN ESKİ satış: " + ilk?.soldAt.toISOString().slice(0, 10) +
    "  (" + (ilk?.code ?? "—") + ")");

  console.log("\n   ⚠ BU SATIŞLARDA DÜŞÜLMEYEN KALEMLER:");
  for (const k of kurallar.sort((a, b) => a.channel.code.localeCompare(b.channel.code))) {
    console.log("     " + k.channel.code.padEnd(14) + k.code.padEnd(20) +
      "→ " + k.validFrom.toISOString().slice(0, 10) + " öncesinde uygulanmıyor");
  }

  console.log("\n   ⛔ HÜKÜM YOK. `2026-01-01` gerçek bir iş tarihi mi, seed varsayılanı mı");
  console.log("     — bu ölçüm onu söyleyemez. Tarihi değiştirmek, bilmediğimiz bir dönem");
  console.log("     hakkında iddia kurmak olurdu. Cevap kanalın kendi belgesinden gelir.");

  console.log("\n" + "=".repeat(100));
  console.log("SALT OKUMA — HİÇBİR ŞEY YAZILMADI.");
  console.log("=".repeat(100) + "\n");
  await p.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
