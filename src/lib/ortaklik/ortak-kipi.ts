/**
 * ============================================================================
 *  ORTAK KİPİ (K347 · Aşama 5) — dış ortak ne görebilir
 * ----------------------------------------------------------------------------
 *  Kullanıcı kararı 19.10.2026: ortak YALNIZ kendi hesabını (+ parola) açar. Panel,
 *  menü sayfası, destek, yan menü ve uyarı çanı ona çizilmez.
 *
 *  ⛔ NEDEN GEREKLİ: panel `sayfaGirisi` ile korunuyor — izin İSTEMEZ, girişi olan
 *  herkes firmanın cirosunu görür (çalışanlar için bilinçli karar, 13.08.2026).
 *  Dışarıdan bir ortak için kabul edilemez.
 *
 *  ⭐ İZİN LİSTESİ, YASAK LİSTESİ DEĞİL: ortak kipindeki kullanıcıya açık olan
 *  sayfalar sayılır (yarın eklenen izinsiz sayfa kendiliğinden KAPALI kalır).
 *
 *  Ölçüt: kullanıcının izin kümesi YALNIZ `ortaklik.hesabim`dan ibaretse ortak kipidir.
 *  Ortağın çalışan rolü de varsa (depocu gibi) ortak kipine girmez — bugünkü çalışan
 *  kuralları geçerlidir. ⚠ BOŞ KÜME ORTAK KİPİ DEĞİLDİR (`every` boş listede `true`
 *  döner; boş taban kapısı ayrıca yazılı — anayasa: «EVERY kapısı taban doluluğunu
 *  ayrıca kanıtlar»).
 * ============================================================================
 */

import type { Prisma } from "@/generated/prisma/client";

export const ORTAK_KIPI_IZNI = "ortaklik.hesabim";
export const ORTAK_ACILIS_SAYFASI = "/ortaklik/hesabim";

export function ortakKipindeMi(izinler: Iterable<string>): boolean {
  const kume = [...izinler];
  if (kume.length === 0) return false;
  return kume.every((i) => i === ORTAK_KIPI_IZNI);
}

/**
 * Ortak kartı ↔ giriş hesabı bağı (kullanıcı kararı 19.10.2026: «siz açıp karta bağlarsınız»).
 * `userId: null` bağı çözer. Bir kullanıcı en çok BİR karta bağlanır — başka karta bağlıysa
 * sessizce taşınmaz, hata döner (ortağın hesabını yanlış kişiye açmak geri alınamaz bir sızıntı).
 */
export async function ortakGirisiBagla(
  tx: Prisma.TransactionClient,
  girdi: { ortakId: string; userId: string | null },
): Promise<{ once: string | null; sonra: string | null }> {
  const o = await tx.isOrtagi.findUnique({ where: { id: girdi.ortakId }, select: { id: true, userId: true } });
  if (!o) throw new Error("ORTAKLIK_KAYIT_YOK");
  if (girdi.userId) {
    const u = await tx.user.findUnique({ where: { id: girdi.userId }, select: { id: true, ortakKarti: { select: { id: true } } } });
    if (!u) throw new Error("GIRIS_KULLANICI_YOK");
    if (u.ortakKarti && u.ortakKarti.id !== girdi.ortakId) throw new Error("GIRIS_ZATEN_BAGLI");
  }
  await tx.isOrtagi.update({ where: { id: girdi.ortakId }, data: { userId: girdi.userId } });
  return { once: o.userId, sonra: girdi.userId };
}
