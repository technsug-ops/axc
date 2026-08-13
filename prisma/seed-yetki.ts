import {
  OPERASYON_IZINLERI,
  OPERASYON_ROLU,
  SAHIP_ROLU,
  TUM_IZINLER,
} from "../src/lib/yetki/izinler";

import { PrismaClient } from "../src/generated/prisma/client";

/**
 * ============================================================================
 *  YETKİ SEED — FİRMA, ROLLER, MEVCUT KULLANICININ ÜYELİĞİ
 * ----------------------------------------------------------------------------
 *  İKİ ROL, DAHA FAZLASI DEĞİL (kullanıcı kararı 13.08.2026):
 *  Küçük firma ilkesi. Ayrı MUHASEBE/depo/kargo rolü AÇILMAZ; o görevlerin
 *  yetkileri SAHİP'te toplu kalır. Ekip büyüyünce yeni rol EKRANDAN türetilir.
 *  "Boş rol" seed'lenmez — kullanılmayan bir rol, bir gün yanlışlıkla
 *  atanacak bir roldür.
 *
 *  MEVCUT KULLANICI SAHİP OLUR: tek kullanıcıda hiçbir davranış değişmez.
 *
 *  TEKRAR ÇALIŞTIRILABİLİR: ada göre upsert. SAHİP'in izinleri HER KOŞUDA
 *  tazelenir — yeni bir izin anahtarı eklendiğinde sahibin onu kendiliğinden
 *  alması gerekir, yoksa kendi sistemine giremez hâle gelir.
 *  OPERASYON'un izinlerine DOKUNULMAZ: kullanıcı ekrandan değiştirmiş
 *  olabilir, seed onun kararını geri almaz.
 * ============================================================================
 */

/** Firma bilgisi — kullanıcı kararı. Ekrandan değiştirilebilir olacak. */
const FIRMA = { name: "Axcalı", code: "AXC" };

export async function yetkiSeed(prisma: PrismaClient) {
  console.log("\n=== YETKİ SEED ===\n");

  // --- 1) FİRMA: tek kayıt ---
  const firma = await prisma.company.upsert({
    where: { code: FIRMA.code },
    update: {},
    create: FIRMA,
  });
  console.log(`Firma          : ${firma.name} (${firma.code})`);

  // --- 2) SAHİP: sistem rolü, tüm izinler ---
  const sahip = await prisma.role.upsert({
    where: { name: SAHIP_ROLU },
    update: { isSystem: true },
    create: { name: SAHIP_ROLU, isSystem: true, sortOrder: 10 },
  });

  // İzinler HER KOŞUDA tazelenir (yukarıdaki gerekçe).
  await prisma.rolePermission.deleteMany({ where: { roleId: sahip.id } });
  await prisma.rolePermission.createMany({
    data: TUM_IZINLER.map((permissionKey) => ({
      roleId: sahip.id,
      permissionKey,
    })),
  });
  console.log(`${SAHIP_ROLU.padEnd(15)}: ${TUM_IZINLER.length} izin (sistem rolü)`);

  // --- 3) OPERASYON: yalnız YOKSA kurulur ---
  const mevcutOperasyon = await prisma.role.findUnique({
    where: { name: OPERASYON_ROLU },
    select: { id: true },
  });

  if (mevcutOperasyon) {
    const sayi = await prisma.rolePermission.count({
      where: { roleId: mevcutOperasyon.id },
    });
    console.log(
      `${OPERASYON_ROLU.padEnd(15)}: ${sayi} izin (mevcut — dokunulmadı)`,
    );
  } else {
    const operasyon = await prisma.role.create({
      data: { name: OPERASYON_ROLU, sortOrder: 20 },
    });
    await prisma.rolePermission.createMany({
      data: OPERASYON_IZINLERI.map((permissionKey) => ({
        roleId: operasyon.id,
        permissionKey,
      })),
    });
    console.log(`${OPERASYON_ROLU.padEnd(15)}: ${OPERASYON_IZINLERI.length} izin`);
  }

  // --- 4) MEVCUT KULLANICILAR: üyeliği olmayan AKTİF herkes SAHİP olur ---
  // Üyeliği zaten olan kullanıcıya DOKUNULMAZ: rolü ekrandan düşürülmüş
  // olabilir, seed onu geri yükseltmemeli.
  //
  // PASİF KULLANICI ATLANIR: 13.08.2026'da canlıda yazım hatasıyla açılmış
  // pasif bir hesap vardı ve seed ona SAHİP üyeliği verdi. Zararsızdı
  // (pasif kullanıcı giriş yapamıyor) ama hayalet üyelik bırakmanın anlamı
  // yok — kullanılmayan bir yetki, bir gün fark edilmeden kullanılan
  // yetkidir.
  const kullanicilar = await prisma.user.findMany({
    where: { isActive: true, userCompanyRoles: { none: {} } },
    select: { id: true, email: true },
  });

  for (const k of kullanicilar) {
    await prisma.userCompanyRole.create({
      data: { userId: k.id, companyId: firma.id, roleId: sahip.id },
    });
    console.log(`Üyelik         : ${k.email} -> ${SAHIP_ROLU}`);
  }

  if (kullanicilar.length === 0) {
    console.log("Üyelik         : yeni üyelik gerekmedi");
  }
}
