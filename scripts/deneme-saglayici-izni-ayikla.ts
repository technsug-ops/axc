import "dotenv/config";

/**
 * ============================================================================
 *  MÜŞTERİ ROLLERİNDEN SAĞLAYICI İZNİNİ AYIKLA — K303 4c-2 (04.10.2026)
 * ----------------------------------------------------------------------------
 *      npm run deneme:saglayici-ayikla            (kuru koşum — yazmaz)
 *      npm run deneme:saglayici-ayikla -- --yaz   (kaldırır)
 *
 *  Kullanıcı kararı 04.10.2026: Selliora firmaların üstündeki yönetim
 *  katmanıdır; sağlayıcı izinleri (`saglayici: true`, bugün `destek.yonet`)
 *  HİÇBİR firma rolünde bulunmaz — yetki kişide (`User.isSuperAdmin`).
 *  Deneme kurulumunda Axcali «CEO»/«Sahip» ve Damisell «Sahip» bu izni
 *  taşıyordu (eski tohum `TUM_IZINLER` veriyordu).
 *
 *  · Kaldırılan HER satır `AuditLog`a: firma kodu, rol, izin (önceki değer
 *    satır bazında — anayasa «toplu yazımda önceki değer satır bazında saklanır»).
 *  · Tek işlem (tamamı-ya-hiçbiri), zaman aşımı açık.
 *  · İkinci koşum zararsız: kaldıracak satır yoksa «0» der.
 *  · ⛔ Yalnız DENEME kurulumunda — canlıda CEO bu izni geçiş gününe kadar
 *    BİLEREK taşır (destek çözmenin başka yeri henüz yok).
 * ============================================================================
 */

async function main() {
  const { denemeOrtamiMi } = await import("../src/lib/deneme-ortami");
  if (!denemeOrtamiMi()) {
    console.log("\n  DURDU: yalnız deneme kurulumunda (DENEME_ORTAMI=1) koşar — hiçbir şey yazılmadı.\n");
    process.exitCode = 1;
    return;
  }
  const yaz = process.argv.includes("--yaz");
  const { sistemPrisma } = await import("../src/lib/prisma");
  const { SAGLAYICI_IZINLERI } = await import("../src/lib/yetki/izinler");

  // SISTEM: bütün firmaların rolleri taranır — temizlik firmalar-üstüdür.
  const satirlar = await sistemPrisma.rolePermission.findMany({
    where: { permissionKey: { in: [...SAGLAYICI_IZINLERI] } },
    select: { id: true, permissionKey: true, role: { select: { id: true, name: true, company: { select: { code: true } } } } },
  });
  console.log(`\n  Sağlayıcı izinleri: ${SAGLAYICI_IZINLERI.join(", ")}`);
  console.log(`  Bu izinleri taşıyan firma rolü satırı: ${satirlar.length}`);
  for (const s of satirlar) console.log(`    ${(s.role.company?.code ?? "firmasız")} · ${s.role.name} · ${s.permissionKey}`);
  if (!yaz) {
    console.log("\n  KURU KOŞUM — hiçbir şey yazılmadı. Kaldırmak için: -- --yaz\n");
    await sistemPrisma.$disconnect();
    return;
  }
  if (satirlar.length === 0) {
    console.log("\n  Kaldırılacak satır yok.\n");
    await sistemPrisma.$disconnect();
    return;
  }
  // SISTEM: tek işlem — firmalar-üstü temizlik + satır bazında iz.
  await sistemPrisma.$transaction(
    async (tx) => {
      await tx.rolePermission.deleteMany({ where: { id: { in: satirlar.map((s) => s.id) } } });
      await tx.auditLog.createMany({
        data: satirlar.map((s) => ({
          action: "SAGLAYICI_IZNI_AYIKLANDI",
          targetType: "Role",
          targetId: s.role.id,
          userId: null,
          companyId: null,
          detail: JSON.stringify({ firma: (s.role.company?.code ?? "firmasız"), rol: s.role.name, izin: s.permissionKey, gerekce: "K303 4c-2 — sağlayıcı izni firma rolünde bulunmaz" }),
        })),
      });
    },
    { timeout: 30_000 },
  );
  // SISTEM: yazımdan sonra ölçüm.
  const kalan = await sistemPrisma.rolePermission.count({ where: { permissionKey: { in: [...SAGLAYICI_IZINLERI] } } });
  console.log(`\n  Kaldırıldı: ${satirlar.length} · kalan: ${kalan}\n`);
  if (kalan !== 0) process.exitCode = 1;
  await sistemPrisma.$disconnect();
}

main().catch((e) => {
  console.error("\n  HATA:", String(e).replace(/\s+/g, " "), "\n");
  process.exitCode = 1;
});
