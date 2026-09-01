import { prisma } from "@/lib/prisma";

import { tamYetkiliMi } from "./izinler";

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

/**
 * SAHİP sayılmanın ölçütü — TEK GÖVDEDEN (K99, 01.09.2026).
 *
 * ⛔ BURADA İKİNCİ BİR ÖLÇÜT VARDI VE AYRIŞIYORDU. Anayasa açıkça
 * _"iki yerde iki farklı ölçüt olmaz"_ diyor; buna rağmen bu dosya
 * `TUM_IZINLER.every(...)` kullanıyordu, bekçi ve seed ise
 * `FIRMA_IZINLERI`. Aradaki fark **sağlayıcı izinleri** — bugün tek eleman,
 * `destek.yonet`.
 *
 * 📏 AYRIŞMA ÖLÇÜLDÜ (01.09.2026): 28 iznin 27'si firma izni. Ekrandan
 * açılan, BÜTÜN firma izinlerine sahip bir rol için:
 *     tamYetkiliMi(27 izin)          → true   (doğru)
 *     TUM_IZINLER.every(27 izin)     → FALSE  ⛔ (eski ölçüt)
 * Yani öyle bir rol "sahip" SAYILMAZDI: `baskaSahipVarMi()` haksız yere
 * `false` döner ve koruma MEŞRU bir rol değişikliğini engellerdi.
 *
 * ⭐ VE GEVŞEME DEĞİL DÜZELTMEDİR: 27 iznin içinde `kullanici.yonet` ve
 * `rol.yonet` VAR — yani o rol sistemi kilitten çıkarabilir. Korumanın
 * sorduğu soru "sağlayıcı mı" değil, **"sistemi açabilecek biri kaldı mı"**.
 * `destek.yonet` (destek talebi yönetimi) o soruya cevap vermiyor.
 *
 * ⚠ BUGÜN ISIRMIYORDU VE SEBEBİ TESADÜFTÜ: canlıdaki iki tam yetkili rol
 * (CEO · Sahip) sağlayıcı iznini de taşıyor. Ekrandan açılacak YENİ bir rol
 * onu otomatik ALMAZ (`otomatikDagitilacak` eliyor) — hata o gün doğardı.
 */
export async function tamYetkiliRolIdleri(): Promise<string[]> {
  const roller = await prisma.role.findMany({
    where: { isActive: true },
    select: { id: true, izinler: { select: { permissionKey: true } } },
  });

  return roller
    .filter((r) => tamYetkiliMi(new Set(r.izinler.map((i) => i.permissionKey))))
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
