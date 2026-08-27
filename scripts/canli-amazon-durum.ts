import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import { canliYapilandirma } from "./canli-ortak";

/**
 * AMAZON — SİSTEMDEKİ DURUM. SALT OKUMA.
 * ⛔ "93 satış girelim mi" sorusunun cevabı üç ölçüme bağlı:
 *    ① kanal hesabı SATIŞ için açık mı
 *    ② kesinti kuralları hangi ROZETLE duruyor (OLCULDU / REFERANS / yok)
 *    ③ girilirse hangi rakamlar değişir (ciro · KDV · stopaj · NET)
 */
async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) { console.log("⛔ CANLI ADRES OKUNAMADI"); process.exitCode = 1; return; }
  const p = new PrismaClient({ adapter: new PrismaMariaDb(c.veri.ham) });

  console.log("\n" + "=".repeat(96));
  console.log("AMAZON — SİSTEMDEKİ DURUM (salt okuma)");
  console.log("=".repeat(96));

  const kanal = await p.channel.findFirst({
    where: { code: "AMAZON" },
    select: { id: true, code: true, name: true,
      accounts: { select: { id: true, name: true, satisIcin: true, isActive: true, externalId: true } } },
  });
  console.log("\n① KANAL");
  if (!kanal) { console.log("   ⛔ AMAZON kanalı YOK"); }
  else {
    console.log("   " + kanal.code + " — " + kanal.name);
    for (const h of kanal.accounts) {
      const sat = await p.sale.count({ where: { channelAccountId: h.id } });
      const iptalsiz = await p.sale.count({ where: { channelAccountId: h.id, iptalTarihi: null } });
      console.log("     hesap " + h.name.padEnd(20) +
        " satışIçin=" + (h.satisIcin ? "EVET" : "hayır") +
        " aktif=" + (h.isActive ? "evet" : "hayır") +
        " dışKimlik=" + (h.externalId ?? "—") +
        "   → sistemdeki satış: " + sat + " (iptalsiz " + iptalsiz + ")");
    }
  }

  console.log("\n② KESİNTİ KURALLARI");
  const kurallar = await p.channelFee.findMany({
    where: { channel: { code: "AMAZON" } },
    select: { code: true, name: true, scope: true, basis: true, rate: true,
      amount: true, currency: true, validFrom: true, isActive: true },
    orderBy: { validFrom: "asc" },
  });
  if (kurallar.length === 0) console.log("   ⛔ HİÇ KURAL YOK — Amazon satışında kesinti hesaplanamaz.");
  for (const k of kurallar) {
    const deger = k.rate !== null
      ? "%" + k.rate.toString()
      : (k.amount?.toString() ?? "—") + " " + (k.currency ?? "");
    console.log("   " + k.code.padEnd(24) + String(k.scope).padEnd(14) +
      String(k.basis).padEnd(14) + deger.padStart(12) +
      "   geçerli " + k.validFrom.toISOString().slice(0, 10) + (k.isActive ? "" : "  (pasif)"));
  }

  console.log("\n③ KARŞILAŞTIRMA — kanal başına sistemdeki satış");
  const hepsi = await p.channelAccount.findMany({
    select: { id: true, name: true, channel: { select: { code: true } } },
  });
  const say = new Map<string, number>();
  for (const h of hepsi) {
    const n = await p.sale.count({ where: { channelAccountId: h.id, iptalTarihi: null } });
    if (n > 0) say.set(h.channel.code, (say.get(h.channel.code) ?? 0) + n);
  }
  for (const [k, n] of [...say].sort((a, b) => b[1] - a[1])) {
    console.log("   " + k.padEnd(16) + String(n).padStart(6) + " satış");
  }

  console.log("\n④ AMAZON'DAN YAPILAN ALIMLAR (ALM-AMZ-)");
  const amzAlim = await p.purchase.count({ where: { code: { startsWith: "ALM-AMZ-" } } });
  const tumAlim = await p.purchase.count();
  console.log("   " + amzAlim + " / " + tumAlim + " alım belgesi Amazon'dan");
  console.log("   ⚠ ALIM ile SATIŞ ayrı sorulardır: Amazon'dan mal ALIYORUZ, soru orada SATMAK.");

  console.log("\nSALT OKUMA — HİÇBİR ŞEY YAZILMADI.\n");
  await p.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
