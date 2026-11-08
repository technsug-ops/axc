import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  K375 — DEPO KURULUMU "HİÇBİR ŞEY OLMUYOR" TEŞHİSİ (08.11.2026)
 * ----------------------------------------------------------------------------
 *      npx tsx scripts/k375-depo-kurulum-olcum.ts
 *
 *  ⛔ SALT OKUMA — hiçbir şey yazmaz. Bu dosya bir BEKÇİ DEĞİL: bir
 *  regresyonda kırmızı yanmaz, geçmiş bir olguyu ÖLÇER. Adı bu yüzden
 *  `-olcum` (anayasa: "dosya adı da bir sınıf beyanıdır").
 *
 *  SORU: kullanıcı formu doldurup "Önce göster" → "Kur" yaptığında hiçbir
 *  şey olmuyor. YAZMA GERÇEKLEŞTİ Mİ? İz varsa sorun GÖSTERİMDE, iz yoksa
 *  sorun EYLEMDE (yetki · doğrulama · çöküş).
 * ============================================================================
 */
async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) {
    console.log("\n⛔ CANLI ADRES OKUNAMADI — ölçüm KOŞMADI (hüküm yok)\n");
    process.exitCode = 1;
    return;
  }
  const p = new PrismaClient({ adapter: new PrismaMariaDb(c.veri.ham) });

  const bolumler = await p.depoBolumu.findMany({
    select: { ad: true, kisaltma: true, sira: true, createdAt: true },
    orderBy: { sira: "asc" },
  });
  console.log("\n=== DepoBolumu satırı: " + bolumler.length + " ===");
  for (const b of bolumler) {
    console.log(
      "   #" + b.sira + "  " + b.kisaltma + "  ad=" + b.ad + "  " + b.createdAt.toISOString(),
    );
  }

  const izler = await p.auditLog.findMany({
    where: { action: "DEPO_BOLUMU_KURULDU" },
    select: { createdAt: true, detail: true, userId: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  console.log("\n=== DEPO_BOLUMU_KURULDU izi: " + izler.length + " ===");
  for (const i of izler) {
    console.log("   " + i.createdAt.toISOString() + "  " + String(i.detail).slice(0, 150));
  }

  const toplam = await p.location.count();
  const bolumlu = await p.location.count({ where: { NOT: { bolumId: null } } });
  const kodlar = await p.location.findMany({ select: { code: true }, orderBy: { code: "asc" } });
  const sablon = /^RAF-[A-Z0-9]{1,6}\d+-\d+$/;
  console.log("\n=== Location ===");
  console.log("   toplam=" + toplam + "  bölüme bağlı=" + bolumlu);
  console.log("   şablona uyan=" + kodlar.filter((k) => sablon.test(k.code)).length);
  console.log("   ilk 10 kod: " + kodlar.slice(0, 10).map((k) => k.code).join(" | "));

  const roller = await p.role.findMany({
    select: {
      name: true,
      izinler: { select: { permissionKey: true } },
      uyelikler: { select: { user: { select: { email: true } } } },
    },
  });
  console.log("\n=== ROLLER · ayar.yaz ===");
  for (const r of roller) {
    const izinler = r.izinler.map((x) => x.permissionKey);
    console.log(
      "   " + r.name +
        "  izin=" + izinler.length +
        "  ayar.yaz=" + (izinler.includes("ayar.yaz") ? "VAR" : "YOK") +
        "  kullanıcı=" + r.uyelikler.map((u) => u.user.email).join(","),
    );
  }

  await p.$disconnect();
}

main();
