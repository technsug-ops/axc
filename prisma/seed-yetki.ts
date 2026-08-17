import {
  OPERASYON_IZINLERI,
  OPERASYON_ROLU,
  SAHIP_ROLU,
  TUM_IZINLER,
  FIRMA_IZINLERI,
  otomatikDagitilacak,
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

  /**
   * --- 2b) TAM YETKİLİ ROLLER: ADA DEĞİL, İZİN KÜMESİNE BAK ---
   *
   * 13.08.2026'DA CANLIDA YAKALANDI: `/iadeler` menüde göründü ama tıklayınca
   * 404 verdi. Sebep, kullanıcının rolünün "Sahip" DEĞİL "CEO" olmasıydı —
   * kendi rolünü açmıştı. Seed rolü ADIYLA aradığı için yeni izin ona hiç
   * ulaşmadı; sahip, kendi sistemindeki yeni ekranı göremedi.
   *
   * KURAL: bu deploy'dan ÖNCE bütün izinlere sahip olan bir rol, bu deploy'dan
   * SONRA da bütün izinlere sahip olmalıdır. Adı ne olursa olsun.
   *
   * Ölçüt izin KÜMESİDİR, ad değil — `lib/yetki/koruma.ts` kendini kilitleme
   * korumasında da aynı ölçüt kullanılıyor. İsim bir etikettir, yetki değil.
   *
   * Yalnız `SONRADAN_DOGAN` anahtarları eklenir; başka hiçbir izne dokunulmaz.
   * Kısıtlı roller (Operasyon gibi) bu kuraldan ETKİLENMEZ, çünkü onlar zaten
   * "bütün izinlere sahip" değildir.
   */
  const SONRADAN_DOGAN: string[] = [
    // 13.08.2026 — /iadeler ekranı yazıldı.
    "iade.gor",
    /**
     * 18.08.2026 — satış düzeltme ve iptal ekranları izne bağlandı.
     * Tam yetkili roller bunları KENDİLİĞİNDEN almalı: dün bu işleri
     * yapabiliyorlardı, izin doğdu diye yapamaz hâle gelmeleri sessiz bir
     * yetki kaybı olurdu.
     */
    "satis.duzenle",
    "satis.iptal",
    /**
     * ⚠ `destek.yonet` BİLEREK BURADA DEĞİL (karar 16.08.2026).
     *
     * O bir SAĞLAYICI iznidir: talebi AÇAN müşteri firmadır, ÇÖZEN ürünü
     * sağlayandır. Bu listeye yazılsaydı, yarın açılacak HERHANGİ bir tam
     * yetkili rol onu kendiliğinden alırdı — ikinci firmanın sahibi dahil.
     * O gün AXCALI'nin talepleri başka firmaya açılırdı.
     *
     * Aşağıdaki döngü `SAGLAYICI_IZINLERI`ni ayrıca eliyor; bu yorum
     * yalnız "unutuldu mu?" diye bakan gözü durdurmak için.
     */
  ];

  /**
   * SAĞLAYICI İZİNLERİ HİÇBİR ROLE OTOMATİK DAĞITILMAZ.
   *
   * Mekanizma tek izin için değil, KURAL olarak kuruldu: yeni bir sağlayıcı
   * izni doğduğunda yapılacak tek şey tanımına `saglayici: true` yazmak.
   * Burada ayrıca bir liste tutulmuyor — iki yerde iki ölçüt olmasın.
   */
  const dagitilacak = otomatikDagitilacak(SONRADAN_DOGAN);

  {
    /**
     * "ESKİDEN TAM YETKİLİ MİYDİ" ÖLÇÜSÜ SAĞLAYICI İZNİNİ SAYMAZ.
     *
     * Saysaydı, sağlayıcı iznine sahip OLMAYAN bir rol "eskiden de tam
     * yetkili değildi" diye elenir ve normal yeni izinleri de alamazdı.
     * Firma rolü sağlayıcı iznine sahip olmadığı için CEZALANDIRILMAMALI.
     */
    const eskiKume = FIRMA_IZINLERI.filter(
      (i) => !SONRADAN_DOGAN.includes(i),
    );

    const roller = await prisma.role.findMany({
      where: { name: { not: SAHIP_ROLU } },
      select: {
        id: true,
        name: true,
        izinler: { select: { permissionKey: true } },
      },
    });

    for (const rol of roller) {
      const sahipOldugu = new Set(rol.izinler.map((i) => i.permissionKey));
      const eskidenTamYetkili = eskiKume.every((i) => sahipOldugu.has(i));
      if (!eskidenTamYetkili) continue;

      const eksik = dagitilacak.filter((i) => !sahipOldugu.has(i));
      if (eksik.length === 0) continue;

      await prisma.rolePermission.createMany({
        data: eksik.map((permissionKey) => ({
          roleId: rol.id,
          permissionKey,
        })),
      });
      console.log(
        `${rol.name.padEnd(15)}: tam yetkili rol, +${eksik.length} yeni izin (${eksik.join(", ")})`,
      );
    }
  }

  // --- 3) OPERASYON: yalnız YOKSA kurulur ---
  const mevcutOperasyon = await prisma.role.findUnique({
    where: { name: OPERASYON_ROLU },
    select: { id: true },
  });

  if (mevcutOperasyon) {
    /**
     * SONRADAN DOĞAN İZİNLER — dar kapı.
     *
     * Kural hâlâ geçerli: mevcut OPERASYON rolünün izinleri toptan
     * EZİLMEZ, çünkü kullanıcı ekrandan değiştirmiş olabilir. Ama sistem
     * yeni bir izin doğurduğunda (ekran sonradan yazıldı) rol o izni hiç
     * görmemiş olur ve kullanıcı "neden göremiyorum" diye takılır.
     *
     * Bu yüzden yalnız AŞAĞIDA ADI GEÇEN yeni izinler eklenir, o da
     * yoksa. Diğer hiçbir izne dokunulmaz.
     *
     * ⚠ GERİLİM AÇIKÇA YAZILI: kullanıcı bu izni bilerek KALDIRIRSA, bir
     * sonraki seed koşusu geri ekler. Listeden düşürmek, iznin artık
     * "yeni" olmadığı anlamına gelir — kalıcı hâle gelince buradan silin.
     */
    const SONRADAN_DOGAN: string[] = [
      // 13.08.2026 — /iadeler ekranı yazıldı. Kullanıcı kararı: iadeyi
      // Operasyon giriyor, listesini de görmeli. Para sütunları
      // satis.kar.gor'a bağlı olduğu için liste PARASIZ görünür.
      "iade.gor",
    ];

    const varOlanlar = new Set(
      (
        await prisma.rolePermission.findMany({
          where: { roleId: mevcutOperasyon.id },
          select: { permissionKey: true },
        })
      ).map((i) => i.permissionKey),
    );

    const eklenecek = SONRADAN_DOGAN.filter((i) => !varOlanlar.has(i));
    if (eklenecek.length > 0) {
      await prisma.rolePermission.createMany({
        data: eklenecek.map((permissionKey) => ({
          roleId: mevcutOperasyon.id,
          permissionKey,
        })),
      });
    }

    const sayi = varOlanlar.size + eklenecek.length;
    console.log(
      `${OPERASYON_ROLU.padEnd(15)}: ${sayi} izin` +
        (eklenecek.length > 0
          ? ` (+${eklenecek.length} yeni: ${eklenecek.join(", ")})`
          : " (mevcut — dokunulmadı)"),
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
