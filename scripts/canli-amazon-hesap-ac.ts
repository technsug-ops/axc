import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  AMAZON SATIŞ HESABINI AÇ — VARSAYILAN KURU KOŞUM
 * ----------------------------------------------------------------------------
 *      npm run canli:amazon-hesap-ac            → KURU KOŞUM
 *      npm run canli:amazon-hesap-ac -- --yaz   → yazar
 *
 *  Kullanıcı cevabı 28.08.2026: **"Amazon mağazam kapandı. Satıcı hesabım
 *  Excel'de `AMZN` bu isimle anılıyor."**
 *
 *  ⛔ SORUM YANLIŞTI, ÖLÇÜM DÜZELTTİ. "Hangi hesap — S.ahmet, SEDA, EKREM?"
 *  diye sormuştum; varsayımım satış hesabının bu üçünün içinde olduğuydu.
 *  Üçü de ALIŞ hesabı çıktı (19 + 44 + 25 alım · 0 satış). Amazon satış
 *  mağazası sistemde hiç tanımlı değildi.
 *
 *  ⚠ MAĞAZA KAPALI — AMA HESAP YİNE DE AÇILIR. Kapanmış bir mağazanın
 *  geçmiş satışları da defterin parçasıdır; onları bağlayacak bir hesap
 *  olmazsa 64 satış (₺255.555) hiçbir yere yazılamaz ve ciro eksik kalır.
 *  Kapanmışlık `isActive` ile ifade edilir, hesabın YOKLUĞUYLA değil.
 *
 *  ⚠ `isActive = true` AÇILIYOR VE SEBEBİ YAZILI: `isActive: false` olsaydı
 *  hesap satış listesinin SÜZGEÇ menüsünde de görünmezdi
 *  (`satislar/page.tsx:166`) ve kullanıcı kendi 64 Amazon satışını
 *  süzemezdi. İçe aktarma bittikten sonra Ayarlar → Kanallar ekranından
 *  TEK TIKLA kapatılır; kapatma o ekranda zaten var.
 *
 *  ⛔ `payoutDays` BOŞ: mağaza kapalı, bu hesap için beklenen bir hakediş
 *  YOK. Tahmini bir vade yazmak asla eşleşmeyecek bir beklenti doğururdu.
 *
 *  ⛔ ChannelFee YAZILMAZ: Amazon'un kesinti kuralları için kanalın kendi
 *  belgesi (hakediş raporu) gerekli. Dış hesaplayıcıdan yazılan bir oran
 *  NET-2'yi sessizce bozar — kaynak önceliği kuralı.
 * ============================================================================
 */

const YAZ = process.argv.includes("--yaz");

const HESAP = { code: "AMZN", name: "AMZN" } as const;

async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) {
    console.log("\n⛔ CANLI ADRES OKUNAMADI\n");
    process.exitCode = 1;
    return;
  }
  const p = new PrismaClient({ adapter: new PrismaMariaDb(c.veri.ham) });

  const kanal = await p.channel.findUnique({
    where: { code: "AMAZON" },
    select: {
      id: true, code: true, name: true,
      accounts: {
        select: { code: true, name: true, alisIcin: true, satisIcin: true, isActive: true,
          _count: { select: { sales: true, purchases: true } } },
        orderBy: { name: "asc" },
      },
    },
  });
  if (!kanal) {
    console.log("\n⛔ AMAZON KANALI YOK — beklenmedik, DURULDU.\n");
    await p.$disconnect();
    process.exitCode = 1;
    return;
  }

  console.log("\n" + "=".repeat(98));
  console.log("AMAZON SATIŞ HESABI — " + (YAZ ? "⚠ YAZIM KİPİ" : "KURU KOŞUM (salt okuma)"));
  console.log("=".repeat(98));

  console.log("\n① MEVCUT HESAPLAR");
  for (const h of kanal.accounts) {
    console.log("   " + h.code.padEnd(8) + h.name.padEnd(12) +
      " alışIçin=" + (h.alisIcin ? "EVET" : "hayır") +
      " satışIçin=" + (h.satisIcin ? "EVET" : "hayır") +
      "  alım=" + String(h._count.purchases).padStart(3) +
      " satış=" + String(h._count.sales).padStart(3) +
      (h.isActive ? "" : "  (pasif)"));
  }
  const zatenVar = kanal.accounts.find((h) => h.code === HESAP.code);
  console.log("\n   satış rolü beyan edilmiş hesap: " +
    (kanal.accounts.filter((h) => h.satisIcin).length || "YOK"));

  console.log("\n② PLAN");
  if (zatenVar) {
    console.log("   ⚠ '" + HESAP.code + "' ZATEN VAR — değiştirilmeyecek (upsert update:{}).");
  } else {
    console.log("   ChannelAccount  code=" + HESAP.code + "  name=\"" + HESAP.name + "\"");
    console.log("                   satisIcin=true · alisIcin=false · defaultCurrency=TRY");
    console.log("                   isActive=true  (süzgeçte görünsün; içe aktarma sonrası kapatılır)");
    console.log("                   payoutDays=NULL · externalId=NULL");
    console.log("   ChannelFee      ⛔ HİÇBİRİ — Amazon'un kendi hakediş raporu bekleniyor");
  }

  if (!YAZ) {
    console.log("\n" + "=".repeat(98));
    console.log("KURU KOŞUM — HİÇBİR ŞEY YAZILMADI.");
    console.log("Yazmak için:  npm run canli:amazon-hesap-ac -- --yaz");
    console.log("=".repeat(98) + "\n");
    await p.$disconnect();
    return;
  }

  console.log("\n⚠ YAZILIYOR…");
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
      isActive: true,
    },
    select: { id: true, code: true, name: true, satisIcin: true, isActive: true, payoutDays: true },
  });
  console.log("   ✓ ChannelAccount " + hesap.code + " — " + hesap.name +
    "  satışIçin=" + hesap.satisIcin + "  aktif=" + hesap.isActive +
    "  payoutDays=" + (hesap.payoutDays ?? "NULL"));

  await p.auditLog.create({
    data: {
      action: "KANAL_HESABI_ACILDI",
      targetType: "ChannelAccount",
      targetId: hesap.id,
      detail: JSON.stringify({
        gerekce: "Amazon satış mağazası sistemde hiç tanımlı değildi; kanalın üç hesabı da ALIŞ hesabıydı (19+44+25 alım, 0 satış). Kullanıcı 28.08.2026: 'Amazon mağazam kapandı, satıcı hesabım Excel'de AMZN bu isimle anılıyor.'",
        hesap: { code: hesap.code, name: hesap.name, satisIcin: true, isActive: true },
        magazaDurumu: "KAPALI — geçmiş satışları bağlamak için açıldı. isActive=true seçildi ki satış listesinin süzgecinde görünsün; içe aktarma bitince Ayarlar → Kanallar ekranından kapatılır.",
        channelFee: "YAZILMADI — Amazon'un kendi hakediş raporu gelmeden kesinti kuralı yazılmaz (kaynak önceliği: kanalın kendi belgesi).",
        payoutDaysNiye: "NULL — kapalı mağazada beklenen hakediş yok.",
        kapsam: "Dosyada 65 Amazon satış satırı var; 54'ü SKU kolonunda ASIN taşıyor ve hiçbir varyanta bağlı değil. Bugün kimliği çözülen 11 satır.",
      }),
    },
  });
  console.log("   ✓ AuditLog: KANAL_HESABI_ACILDI");

  console.log("\n" + "=".repeat(98));
  console.log("YAZILDI. ⛔ İÇE AKTARMA KOŞULMADI — 54 ASIN hâlâ eşleşmiyor.");
  console.log("=".repeat(98) + "\n");
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
