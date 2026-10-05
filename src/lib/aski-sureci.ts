import type { FirmaAskiSebebi } from "@/generated/prisma/client";
import { gunDegeri, gunEkle, isTakvimGunu } from "@/lib/donem";
import { firmaDurumunuDegistir, kurulumDurumlari } from "@/lib/firma-acilisi";
import { sistemPrisma } from "@/lib/prisma";
import { sistemiAcabilirMi } from "@/lib/yetki/izinler";

/**
 * ============================================================================
 *  ASKI SÜRECİ — uyarı → süre → askı (K303, kullanıcı kararı 05.10.2026)
 * ----------------------------------------------------------------------------
 *  «Askı sürecini bir prosese bağlamamız lazım; hesap sahibine mail gitsin,
 *  uyarı yapılsın.» Akış: süper admin sebep seçip UYARI başlatır (firma
 *  ekranlarında şerit + e-posta) → süre dolar → askı süper admin ONAYIYLA
 *  (kendiliğinden DEĞİL) → askı kalkar. Her adım iz bırakır; geçmiş izden.
 *
 *  ⚠ Gün İSTANBUL gününe göre (anayasa: iş saat dilimi sabit) — `donem.ts`
 *  yardımcıları; çalışma ortamının saat dilimi kullanılmaz.
 *  ⚠ Ödeme bu süreçte YOK (kullanıcı kararı: önce askı, ödeme sonra);
 *  «ödeme gecikmesi» yalnız bir sebeptir.
 *
 *  SISTEM: yönetim katmanı — sorgular firma kimliğiyle açıkça süzülür.
 * ============================================================================
 */

export const ASKI_SEBEPLERI = ["ODEME_GECIKMESI", "SOZLESME_IHLALI", "FIRMA_ISTEGI", "GUVENLIK", "DIGER"] as const satisfies readonly FirmaAskiSebebi[];

/** Uyarı süresi sınırı (gün). Kaynağı: kullanıcı kararı yok → makul bir üst sınır, ekranda yazar. */
export const UYARI_EN_AZ_GUN = 1;
export const UYARI_EN_COK_GUN = 60;
export const ACIKLAMA_EN_UZUN = 500;

export type AskiDurumu =
  | { tur: "NORMAL" }
  | { tur: "UYARIDA"; kalanGun: number; sonGun: Date; sebep: FirmaAskiSebebi | null }
  | { tur: "SURESI_DOLDU"; gecenGun: number; sonGun: Date; sebep: FirmaAskiSebebi | null }
  | { tur: "ASKIDA"; sebep: FirmaAskiSebebi | null };

const GUN_MS = 24 * 60 * 60 * 1000;

/** İstanbul günü «bugün» — UTC gece yarısı biçiminde (iş tarihlerinin saklandığı biçim). */
export function bugunIs(an: Date = new Date()): Date {
  return gunDegeri(isTakvimGunu(an));
}

/**
 * Saf — firmanın bugünkü süreç durumu. Son gün DAHİL uyarı sürer (kalan 0 =
 * «bugün son gün»); ertesi gün «süresi doldu». Askı uyarıdan önce gelir.
 */
export function askiDurumu(f: {
  aktif: boolean;
  uyariSonGun: Date | null;
  uyariSebebi: FirmaAskiSebebi | null;
  askiSebebi: FirmaAskiSebebi | null;
}, bugun: Date): AskiDurumu {
  if (!f.aktif) return { tur: "ASKIDA", sebep: f.askiSebebi };
  if (!f.uyariSonGun) return { tur: "NORMAL" };
  const fark = Math.round((f.uyariSonGun.getTime() - bugun.getTime()) / GUN_MS);
  return fark >= 0
    ? { tur: "UYARIDA", kalanGun: fark, sonGun: f.uyariSonGun, sebep: f.uyariSebebi }
    : { tur: "SURESI_DOLDU", gecenGun: -fark, sonGun: f.uyariSonGun, sebep: f.uyariSebebi };
}

export type SebepHatasi = "SEBEP_GECERSIZ" | "ACIKLAMA_ZORUNLU" | "ACIKLAMA_UZUN";

/** Saf — sebep + açıklama. «DIGER» açıklama ister (anayasa: sebepsiz işlem «neden» sorusunu cevapsız bırakır). */
export function sebebiSina(
  hamSebep: string,
  hamAciklama: string,
): { durum: "TAMAM"; sebep: FirmaAskiSebebi; aciklama: string | null } | { durum: "HATA"; hata: SebepHatasi } {
  const sebep = ASKI_SEBEPLERI.find((s) => s === hamSebep);
  if (!sebep) return { durum: "HATA", hata: "SEBEP_GECERSIZ" };
  const aciklama = hamAciklama.trim();
  if (aciklama.length > ACIKLAMA_EN_UZUN) return { durum: "HATA", hata: "ACIKLAMA_UZUN" };
  if (sebep === "DIGER" && aciklama.length === 0) return { durum: "HATA", hata: "ACIKLAMA_ZORUNLU" };
  return { durum: "TAMAM", sebep, aciklama: aciklama || null };
}

export type UyariHatasi = SebepHatasi | "GUN_GECERSIZ" | "FIRMA_YOK" | "FIRMA_AKTIF_DEGIL";

/** Uyarı başlat — firma AKTİF ve kurulumu TAM olmalı. Var olan uyarının yerine geçer (iz eskiyi de taşır). */
export async function uyariBaslat(
  firmaId: string,
  g: { sebep: string; aciklama: string; gun: number },
  yapanId: string,
  an: Date = new Date(),
): Promise<{ durum: "TAMAM"; sonGun: Date; sebep: FirmaAskiSebebi } | { durum: "HATA"; hata: UyariHatasi }> {
  const s = sebebiSina(g.sebep, g.aciklama);
  if (s.durum === "HATA") return s;
  if (!Number.isInteger(g.gun) || g.gun < UYARI_EN_AZ_GUN || g.gun > UYARI_EN_COK_GUN) return { durum: "HATA", hata: "GUN_GECERSIZ" };
  const kurulum = (await kurulumDurumlari([firmaId])).get(firmaId);
  if (kurulum === undefined) return { durum: "HATA", hata: "FIRMA_YOK" };
  if (kurulum !== "TAM") return { durum: "HATA", hata: "FIRMA_AKTIF_DEGIL" };
  // SISTEM: önceki uyarı (izde «yerine geçti» olarak kalsın).
  const once = await sistemPrisma.company.findUnique({ where: { id: firmaId }, select: { uyariSonGun: true, uyariSebebi: true } });
  const sonGun = gunEkle(bugunIs(an), g.gun);
  // SISTEM: uyarı ve izi aynı işlemde.
  await sistemPrisma.$transaction([
    // SISTEM: firmanın süreç alanları.
    sistemPrisma.company.update({ where: { id: firmaId }, data: { uyariSonGun: sonGun, uyariSebebi: s.sebep, askiAciklama: s.aciklama } }),
    // SISTEM: iz firmalar-üstü, hedef firma targetId'de.
    sistemPrisma.auditLog.create({
      data: {
        action: "FIRMA_UYARI_BASLADI",
        targetType: "Company",
        targetId: firmaId,
        userId: yapanId,
        companyId: null,
        detail: JSON.stringify({ sebep: s.sebep, aciklama: s.aciklama, gun: g.gun, sonGun: sonGun.toISOString().slice(0, 10), onceki: once?.uyariSonGun ? { sonGun: once.uyariSonGun.toISOString().slice(0, 10), sebep: once.uyariSebebi } : null }),
      },
    }),
  ]);
  return { durum: "TAMAM", sonGun, sebep: s.sebep };
}

/** Uyarıyı kaldır — uyarı yoksa UYARI_YOK (hiçbir şey yazılmaz). */
export async function uyariKaldir(firmaId: string, yapanId: string): Promise<{ durum: "TAMAM" } | { durum: "HATA"; hata: "FIRMA_YOK" | "UYARI_YOK" }> {
  // SISTEM: yönetim katmanı.
  const f = await sistemPrisma.company.findUnique({ where: { id: firmaId }, select: { uyariSonGun: true, uyariSebebi: true } });
  if (!f) return { durum: "HATA", hata: "FIRMA_YOK" };
  if (!f.uyariSonGun) return { durum: "HATA", hata: "UYARI_YOK" };
  // SISTEM: uyarının kalkışı ve izi aynı işlemde.
  await sistemPrisma.$transaction([
    // SISTEM: süreç alanları temizlenir.
    sistemPrisma.company.update({ where: { id: firmaId }, data: { uyariSonGun: null, uyariSebebi: null, askiAciklama: null } }),
    // SISTEM: iz.
    sistemPrisma.auditLog.create({
      data: { action: "FIRMA_UYARI_KALDIRILDI", targetType: "Company", targetId: firmaId, userId: yapanId, companyId: null, detail: JSON.stringify({ sonGun: f.uyariSonGun.toISOString().slice(0, 10), sebep: f.uyariSebebi }) },
    }),
  ]);
  return { durum: "TAMAM" };
}

/** Askıya al — sebep zorunlu; tek yazıcı `firmaDurumunuDegistir`. */
export async function askiyaAl(
  firmaId: string,
  g: { sebep: string; aciklama: string },
  yapanId: string,
): Promise<{ durum: "TAMAM"; sebep: FirmaAskiSebebi } | { durum: "HATA"; hata: SebepHatasi | "FIRMA_YOK" | "YARIM_KURULUM" | "SEBEP_YOK" }> {
  const s = sebebiSina(g.sebep, g.aciklama);
  if (s.durum === "HATA") return s;
  const r = await firmaDurumunuDegistir(firmaId, false, yapanId, { sebep: s.sebep, aciklama: s.aciklama });
  return r.durum === "TAMAM" ? { durum: "TAMAM", sebep: s.sebep } : r;
}

/** Askıyı kaldır — firma yeniden aktif; sebep/uyarı temizlenir. */
export async function askiyiKaldir(firmaId: string, yapanId: string) {
  return firmaDurumunuDegistir(firmaId, true, yapanId);
}

export const SUREC_IZLERI = ["FIRMA_UYARI_BASLADI", "FIRMA_UYARI_KALDIRILDI", "FIRMA_PASIFE_ALINDI", "FIRMA_AKTIFLESTI"] as const;

/** Süreç geçmişi — izden, en yeni önce. */
export async function surecGecmisi(firmaId: string, adet = 30) {
  // SISTEM: iz firmalar-üstü; hedef firma kimliğiyle.
  const izler = await sistemPrisma.auditLog.findMany({
    where: { targetType: "Company", targetId: firmaId, action: { in: [...SUREC_IZLERI] } },
    orderBy: { createdAt: "desc" },
    take: adet,
    select: { action: true, createdAt: true, detail: true, user: { select: { email: true } } },
  });
  return izler.map((i) => {
    let d: { sebep?: string; aciklama?: string | null; sonGun?: string } = {};
    try { d = i.detail ? JSON.parse(i.detail) : {}; } catch { d = {}; }
    return { tur: i.action as (typeof SUREC_IZLERI)[number], an: i.createdAt, yapan: i.user?.email ?? null, sebep: d.sebep ?? null, aciklama: d.aciklama ?? null, sonGun: d.sonGun ?? null };
  });
}

/** E-posta alıcıları: firmanın AKTİF üyeliği olan, kişi kaydı aktif, TAM YETKİLİ rollü kişiler. */
export async function firmaYoneticiEpostalari(firmaId: string): Promise<string[]> {
  // SISTEM: roller firmaya aittir; firma açıkça süzülür.
  const roller = await sistemPrisma.role.findMany({ where: { companyId: firmaId, isActive: true }, select: { id: true, izinler: { select: { permissionKey: true } } } });
  const tam = roller.filter((r) => sistemiAcabilirMi(new Set(r.izinler.map((i) => i.permissionKey)))).map((r) => r.id);
  if (tam.length === 0) return [];
  // SISTEM: üyelikler firma kimliğiyle.
  const u = await sistemPrisma.userCompanyRole.findMany({
    where: { companyId: firmaId, isActive: true, roleId: { in: tam }, user: { isActive: true, isSuperAdmin: false } },
    select: { user: { select: { email: true } } },
  });
  return [...new Set(u.map((x) => x.user.email))];
}
