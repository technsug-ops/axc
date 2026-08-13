import { prisma } from "@/lib/prisma";

import { TUM_IZINLER } from "./izinler";

/**
 * ============================================================================
 *  KENDİNİ KİLİTLEME KORUMASI
 * ----------------------------------------------------------------------------
 *  Bu dosyanın tek işi var: sistemde HER ZAMAN en az bir çalışır SAHİP
 *  kalmasını garanti etmek.
 *
 *  Kilitlenme üç yoldan olur ve üçü de kapatılıyor:
 *    1. Son sahibin ROLÜ DÜŞÜRÜLÜR      -> "Operasyon" yapılamaz
 *    2. Son sahip PASİFE ALINIR          -> kapatılamaz
 *    3. SAHİP ROLÜ pasife alınır/silinir -> isSystem koruması
 *
 *  Kilitlenirse çare yok: yetkili bir kullanıcı olmadan kullanıcı ekranına
 *  girilemez, yani düzeltmek için sunucuya komut satırından erişmek gerekir.
 *  Bu yüzden koruma EKRANDA DEĞİL SUNUCUDA: düğmeyi gizlemek yetmez.
 *
 *  HATA EYLEME DÖNÜK OLMALI (İlke #5): "yapılamaz" demek yetmez, NEDEN
 *  yapılamadığı ve ne yapılması gerektiği söylenir.
 * ============================================================================
 */

/** SAHİP sayılmanın ölçütü: TÜM izinlere sahip aktif rol. */
export async function tamYetkiliRolIdleri(): Promise<string[]> {
  const roller = await prisma.role.findMany({
    where: { isActive: true },
    select: { id: true, izinler: { select: { permissionKey: true } } },
  });

  return roller
    .filter((r) => {
      const küme = new Set(r.izinler.map((i) => i.permissionKey));
      return TUM_IZINLER.every((izin) => küme.has(izin));
    })
    .map((r) => r.id);
}

/**
 * Bu üyelik değişse/kalksa sistemde tam yetkili aktif kullanıcı kalır mı?
 *
 * @param haricUyelikId Kaldırılacak/değişecek üyelik — sayıma katılmaz.
 */
export async function baskaSahipVarMi(haricUyelikId: string): Promise<boolean> {
  const rolIdleri = await tamYetkiliRolIdleri();
  if (rolIdleri.length === 0) return false;

  const sayi = await prisma.userCompanyRole.count({
    where: {
      id: { not: haricUyelikId },
      roleId: { in: rolIdleri },
      user: { isActive: true },
    },
  });

  return sayi > 0;
}

/** Bu kullanıcı pasife alınırsa başka tam yetkili aktif kullanıcı kalır mı? */
export async function baskaSahipVarMiKullanici(
  haricKullaniciId: string,
): Promise<boolean> {
  const rolIdleri = await tamYetkiliRolIdleri();
  if (rolIdleri.length === 0) return false;

  const sayi = await prisma.userCompanyRole.count({
    where: {
      userId: { not: haricKullaniciId },
      roleId: { in: rolIdleri },
      user: { isActive: true },
    },
  });

  return sayi > 0;
}
