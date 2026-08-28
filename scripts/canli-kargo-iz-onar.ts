import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  KARGO YAZIMININ İZİ — ONARIM
 * ----------------------------------------------------------------------------
 *      npm run canli:kargo-iz-onar
 *
 *  ⛔ NİYE VAR: kargo yazımının `AuditLog` kaydına 5595 satış kimliği kondu
 *  ve `detail` alanı **sessizce kesildi** — MySQL `TEXT` tavanı 65.535 bayt,
 *  yazılan 65.511 karakter ve `JSON.parse` DÜŞÜYOR. Yani geri alma yolu
 *  yazıldığı anda bozuktu; hiçbir şey uyarmadı.
 *
 *  Kesilmiş iz SİLİNMEZ (ledger disiplini izlere de uygulanır): üstüne
 *  ONU AÇIKLAYAN ikinci bir iz yazılır ve geçerli olan o olur.
 *
 *  ⚠ Bu betik VERİYE DOKUNMAZ — yalnız `AuditLog`a bir kayıt ekler.
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

  const eski = await p.auditLog.findFirst({
    where: { action: "KARGO_DOSYADAN_YAZILDI" },
    orderBy: { createdAt: "desc" },
    select: { id: true, detail: true, createdAt: true },
  });
  if (!eski) {
    console.log("\n⛔ ONARILACAK İZ YOK.\n");
    await p.$disconnect();
    return;
  }
  let bozuk = false;
  try { JSON.parse(eski.detail ?? ""); } catch { bozuk = true; }

  console.log("\n" + "=".repeat(100));
  console.log("KARGO İZİ — ONARIM");
  console.log("=".repeat(100));
  console.log("\n   eski iz " + eski.id);
  console.log("   yazıldı " + eski.createdAt.toISOString().slice(0, 19).replace("T", " "));
  console.log("   uzunluk " + (eski.detail ?? "").length + " karakter");
  console.log("   JSON ayrıştırılabiliyor mu: " + (bozuk ? "⛔ HAYIR — KESİLMİŞ" : "evet"));

  if (!bozuk) {
    console.log("\n   ⭐ İz sağlam; onarıma gerek yok.\n");
    await p.$disconnect();
    return;
  }

  const yeni = await p.auditLog.create({
    data: {
      action: "KARGO_DOSYADAN_YAZILDI_IZ_ONARIMI",
      targetType: "AuditLog",
      targetId: eski.id,
      detail: JSON.stringify({
        neden: "Önceki iz (" + eski.id + ") 5595 satış kimliği taşıdığı için AuditLog.detail alanının MySQL TEXT tavanında (65.535 bayt) SESSİZCE KESİLDİ. Ölçüldü: 65.511 karakter, JSON.parse düşüyor. Kesilmiş iz, iz değildir.",
        eskiIzSilinmedi: "Ledger disiplini izlere de uygulanır: yanlış kayıt silinmez, üstüne açıklayıcı ikinci kayıt yazılır.",
        gecerliOlan: "BU KAYIT",
        yazim: {
          parti: "kargo-dosya-20260828",
          kaynak: "satis.xlsx · SATIŞ sayfası · KARGO sütunu (R)",
          taban: "Dosya KDV DAHİL; Sale.cargoAmount KDV HARİÇ saklanır → 1,20'ye bölündü.",
          satis: 5595,
          toplamHaric: "559499.05",
          toplamDahil: "671398.96",
          dokunulmayan: "kargosu zaten olan 131 · satırları çelişen 28 · sistemde yok 3386",
          firmaVeDesi: "YAZILMADI — dosyada yok, uydurulmadı.",
        },
        geriAlmaOlcutu: "KİMLİK LİSTESİ TUTULMAZ. Küme dosyadan deterministik kurulur: cargoAmount == kurus(dosya KARGO / 1,20). Komut: npm run canli:kargo-yaz -- --geri",
        netEtkisi: {
          net1: "2444999.67 → 1776097.22",
          net2: "2015414.97 → 1457996.25",
          aciklanamayan: "1404.50 — sebebi ÖLÇÜLEMEDİ. Yazımdan önceki NET değerleri satış bazında saklanmadığı için artık atfedilemiyor. Yazım sonrası durum motorla BİREBİR tutuyor (120/120 örneklem).",
        },
      }),
    },
  });
  console.log("\n   ⭐ yeni iz yazıldı: " + yeni.id);
  console.log("   action: KARGO_DOSYADAN_YAZILDI_IZ_ONARIMI");
  console.log("   ⚠ Eski iz SİLİNMEDİ — yanında duruyor ve niye geçersiz olduğu yazılı.");

  console.log("\n" + "=".repeat(100));
  console.log("VERİYE DOKUNULMADI — yalnız iz eklendi.");
  console.log("=".repeat(100) + "\n");
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
