import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  DEPO (ELDEN SATIŞ) KANALINI AÇ — VARSAYILAN KURU KOŞUM
 * ----------------------------------------------------------------------------
 *      npm run canli:depo-ac            → KURU KOŞUM
 *      npm run canli:depo-ac -- --yaz   → yazar
 *
 *  Kullanıcı kararı 28.08.2026: "DEPO elden satışların yazıldığı yer.
 *  Satış kanallarına DEPO'yu da ekle."
 *
 *  ⛔ ŞEMA DEĞİŞİKLİĞİ YOK — merdiven inildi ve ÖLÇÜLDÜ: `Channel.type`
 *  kodun hiçbir yerinde okunmuyor (seed yazıyor, hiçbir karar branch
 *  etmiyor). Bu yüzden yeni enum değeri BUGÜN hak edilmedi; `OWN_STORE`
 *  vekil olarak kullanılıyor ve vekil olduğu HER YERDE yazılı.
 *
 *  ⛔ ChannelFee YAZILMAZ. Elden satışta pazaryeri komisyonu yok (ölçüldü),
 *  ama KDV/stopajın işleyip işlemediği CEVAPLANMADI. Tahmin edilmiş bir
 *  kesinti kuralı NET-2'yi sessizce bozar — kural, cevap gelince yazılır.
 *
 *  ⛔ `payoutDays` BOŞ BIRAKILIYOR — ve bu bir eksik değil, BEYAN.
 *  Elden satışta hakediş süreci YOKTUR: para el değiştirir, pazaryeri
 *  ödemesi beklenmez. `0` yazmak "aynı gün ödendi" der ve her elden satış
 *  için asla eşleşmeyecek bir hakediş beklentisi doğururdu — kapatılamayan
 *  uyarı, kutunun tamamına olan güveni eritir. Şema zaten şunu söylüyor:
 *  "Boşsa beklenen tarih ÜRETİLMEZ."
 * ============================================================================
 */

const YAZ = process.argv.includes("--yaz");

const KANAL = { code: "DEPO", name: "Elden Satış" } as const;
const HESAP = { code: "ELDEN", name: "Elden Satış" } as const;

async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) {
    console.log("\n⛔ CANLI ADRES OKUNAMADI\n");
    process.exitCode = 1;
    return;
  }
  const p = new PrismaClient({ adapter: new PrismaMariaDb(c.veri.ham) });

  console.log("\n" + "=".repeat(96));
  console.log("DEPO (ELDEN SATIŞ) KANALI — " + (YAZ ? "⚠ YAZIM KİPİ" : "KURU KOŞUM (salt okuma)"));
  console.log("=".repeat(96));

  const mevcutKanal = await p.channel.findUnique({
    where: { code: KANAL.code },
    select: { id: true, code: true, name: true, type: true,
      accounts: { select: { code: true, name: true, satisIcin: true } } },
  });

  console.log("\n① MEVCUT DURUM");
  if (mevcutKanal) {
    console.log("   kanal VAR: " + mevcutKanal.code + " — " + mevcutKanal.name +
      " (" + mevcutKanal.type + ")");
    for (const h of mevcutKanal.accounts) {
      console.log("     hesap " + h.code + " — " + h.name + "  satışIçin=" + h.satisIcin);
    }
  } else {
    console.log("   kanal YOK — açılacak");
  }

  console.log("\n② PLAN");
  console.log("   Channel         code=" + KANAL.code + "  name=\"" + KANAL.name + "\"  type=OWN_STORE (VEKİL)");
  console.log("   ChannelAccount  code=" + HESAP.code + "  name=\"" + HESAP.name + "\"");
  console.log("                   satisIcin=true · alisIcin=false · defaultCurrency=TRY");
  console.log("                   payoutDays=NULL  (elden satışta hakediş süreci YOK)");
  console.log("   ChannelFee      ⛔ HİÇBİRİ — KDV/stopaj cevabı bekleniyor");

  if (!YAZ) {
    console.log("\n" + "=".repeat(96));
    console.log("KURU KOŞUM — HİÇBİR ŞEY YAZILMADI.");
    console.log("Yazmak için:  npm run canli:depo-ac -- --yaz");
    console.log("=".repeat(96) + "\n");
    await p.$disconnect();
    return;
  }

  console.log("\n⚠ YAZILIYOR…");

  /** ⚠ `update: {}` — var olan kaydı BİLEREK değiştirmiyoruz (seed deseni). */
  const kanal = await p.channel.upsert({
    where: { code: KANAL.code },
    update: {},
    create: { code: KANAL.code, name: KANAL.name, type: "OWN_STORE" },
    select: { id: true, code: true, name: true, type: true },
  });
  console.log("   ✓ Channel " + kanal.code + " — " + kanal.name + " (" + kanal.type + ")");

  const hesap = await p.channelAccount.upsert({
    where: { channelId_code: { channelId: kanal.id, code: HESAP.code } },
    update: {},
    create: {
      channelId: kanal.id,
      code: HESAP.code,
      name: HESAP.name,
      defaultCurrency: "TRY",
      alisIcin: false,
      satisIcin: true,
      /** ⛔ payoutDays BİLEREK verilmiyor — bkz. dosya başı. */
    },
    select: { id: true, code: true, name: true, satisIcin: true, payoutDays: true },
  });
  console.log("   ✓ ChannelAccount " + hesap.code + " — " + hesap.name +
    "  satışIçin=" + hesap.satisIcin + "  payoutDays=" + (hesap.payoutDays ?? "NULL"));

  await p.auditLog.create({
    data: {
      action: "KANAL_ACILDI",
      targetType: "Channel",
      targetId: kanal.id,
      detail: JSON.stringify({
        gerekce: "Elden yapılan satışların yazılacağı kanal. Kullanıcı kararı 28.08.2026: 'DEPO elden satışların yazıldığı yer, satış kanallarına ekle.'",
        kanal: { code: kanal.code, name: kanal.name, type: kanal.type },
        hesap: { code: hesap.code, name: hesap.name, satisIcin: true, payoutDays: null },
        vekilUyarisi: "type=OWN_STORE VEKİLDİR. Channel.type bugün kodun hiçbir yerinde okunmuyor, o yüzden şema değişikliği hak edilmedi. AÇILIŞ ŞARTI: bir rapor ilk kez Channel.type'a göre dallandığında gerçek enum değeri (DIRECT) eklenir.",
        channelFee: "YAZILMADI — elden satışta KDV/stopajın işleyip işlemediği cevaplanmadı; tahmin NET-2'yi bozar.",
        payoutDaysNiye: "NULL bırakıldı: elden satışta hakediş süreci yok; 0 yazmak asla eşleşmeyecek bir hakediş beklentisi doğururdu.",
      }),
    },
  });
  console.log("   ✓ AuditLog: KANAL_ACILDI");

  console.log("\n" + "=".repeat(96));
  console.log("YAZILDI. ⛔ İÇE AKTARMA KOŞULMADI — DEPO satırları `ADIM2_BEKLEYEN` kapısında.");
  console.log("=".repeat(96) + "\n");
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
