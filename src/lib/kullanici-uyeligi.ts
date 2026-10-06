import { sistemPrisma } from "@/lib/prisma";
import { sistemiAcabilirMi } from "@/lib/yetki/izinler";
import { sertSinirKapisi } from "@/lib/paket/sinirlar";

/**
 * ============================================================================
 *  FİRMA ÜYELİĞİ — AKTİFLİK VE ÜYELİK DOĞRULAMASI (K303, 05.10.2026)
 * ----------------------------------------------------------------------------
 *  Kullanıcı kararı 05.10.2026: pasife alma FİRMA BAZINDA. Aktiflik
 *  `UserCompanyRole.isActive`te; `User.isActive` kişinin tamamen
 *  kapatılmasıdır ve firma ekranları ona DOKUNMAZ.
 *
 *  ⛔ VAKA (aynı gün ölçüldü): firmanın Kullanıcılar ekranı kişiyi YALNIZ
 *  kimliğiyle buluyordu (`User` firma süzgecinin dışında) — bir firmanın
 *  yöneticisi başka firmanın kişisini pasife alabiliyor, parolasını
 *  sıfırlayabiliyordu. Buradaki her işlem önce ÜYELİĞİ (kişi + firma)
 *  doğrular; firma her çağrıda AÇIKÇA verilir.
 *
 *  SISTEM: bu gövde iki kapıdan çağrılır — firma ekranı (firma = oturumun
 *  bağlamı) ve yönetim katmanı (firma = kartın firması). İkisi de firmayı
 *  açıkça verir; sorgular `companyId` ile süzülür, süzgeçli istemciye gerek yok.
 * ============================================================================
 */

export type UyelikHatasi = "UYE_DEGIL" | "SON_SAHIP" | "SUPER_ADMIN" | "SINIR_DOLU";

/** Kişinin BU firmadaki üyeliği — yoksa null (başka firmanın kişisi bulunmaz). */
export async function firmaUyeligi(companyId: string, userId: string) {
  // SISTEM: kişi + firma çiftiyle — başka firmanın kişisi bulunmaz.
  return sistemPrisma.userCompanyRole.findUnique({
    where: { userId_companyId: { userId, companyId } },
    select: { id: true, isActive: true, roleId: true, user: { select: { email: true, isSuperAdmin: true } } },
  });
}

/** Bu firmanın tam yetkili (sistemi açabilen) rolleri. */
async function tamYetkiliRoller(companyId: string): Promise<string[]> {
  // SISTEM: roller firmaya aittir; firma açıkça süzülür.
  const roller = await sistemPrisma.role.findMany({
    where: { companyId, isActive: true },
    select: { id: true, izinler: { select: { permissionKey: true } } },
  });
  return roller.filter((r) => sistemiAcabilirMi(new Set(r.izinler.map((i) => i.permissionKey)))).map((r) => r.id);
}

/** Bu kişi bu firmada pasife alınırsa, firmada başka AKTİF tam yetkili kalır mı? */
export async function firmadaBaskaSahipVarMi(companyId: string, haricUserId: string): Promise<boolean> {
  const roller = await tamYetkiliRoller(companyId);
  if (roller.length === 0) return false;
  // SISTEM: firma açıkça süzülür.
  const sayi = await sistemPrisma.userCompanyRole.count({
    where: { companyId, userId: { not: haricUserId }, roleId: { in: roller }, isActive: true, user: { isActive: true } },
  });
  return sayi > 0;
}

/**
 * Üyeliği bu firmada pasife alır / yeniden açar. Kişinin öteki firmalarına
 * ve kişi kaydına DOKUNMAZ. Oturum sürümü artırılmaz: giriş ve her istek
 * `uyeMi` ile üyeliğin aktifliğini sorar, pasif üyelik o anda düşer.
 */
export async function uyelikDurumunuDegistir(
  companyId: string,
  userId: string,
  yapanId: string,
): Promise<{ durum: "TAMAM"; aktif: boolean; eposta: string } | { durum: "HATA"; hata: UyelikHatasi; eposta?: string; kullanim?: number; sinir?: number }> {
  const u = await firmaUyeligi(companyId, userId);
  if (!u) return { durum: "HATA", hata: "UYE_DEGIL" };
  if (u.isActive && !(await firmadaBaskaSahipVarMi(companyId, userId))) {
    return { durum: "HATA", hata: "SON_SAHIP", eposta: u.user.email };
  }
  const yeni = !u.isActive;
  /* K303 ② — YENİDEN AÇMA kullanıcı sayısını artırır: paketin kullanıcı sınırı
     doluysa durur (sert sınır; firma ayarları VE süper admin aynı kapıdan —
     süper admin aşmak istiyorsa önce paketi/sınırı değiştirir). Pasife almak
     her zaman serbest. */
  if (yeni) {
    const k = await sertSinirKapisi(companyId, "kullanici");
    if (!k.gecer) return { durum: "HATA", hata: "SINIR_DOLU", eposta: u.user.email, kullanim: k.kullanim, sinir: k.sinir };
  }
  // SISTEM: üyelik ve izi aynı işlemde; iz firmaya bağlı.
  await sistemPrisma.$transaction([
    // SISTEM: yalnız BU üyelik (kimliğiyle).
    sistemPrisma.userCompanyRole.update({ where: { id: u.id }, data: { isActive: yeni } }),
    // SISTEM: iz bu firmaya yazılır.
    sistemPrisma.auditLog.create({
      data: {
        action: yeni ? "UYELIK_AKTIFLESTI" : "UYELIK_PASIFE_ALINDI",
        targetType: "UserCompanyRole",
        targetId: u.id,
        userId: yapanId,
        companyId,
        detail: JSON.stringify({ kullaniciId: userId }),
      },
    }),
  ]);
  return { durum: "TAMAM", aktif: yeni, eposta: u.user.email };
}
