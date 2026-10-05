import { sistemPrisma } from "@/lib/prisma";
import { UYGULAMA } from "@/lib/uygulama";

/**
 * ============================================================================
 *  OTURUMUN FİRMASI — K303 4c-1 (04.10.2026)
 * ----------------------------------------------------------------------------
 *  Kullanıcı kararı 04.10.2026: «Selliora üst yapı; firma içinden başka firmaya
 *  geçilmez. Firma kodu + kullanıcı + şifre girer ve kendi firmasına geçer.»
 *
 *  Firma GİRİŞTE belirlenir ve oturum jetonuna yazılır (`oturum-imza.ts`).
 *  Eskiden yetki bağlamı «kullanıcının İLK üyeliği»ni seçiyordu — tek firmada
 *  zararsız, iki firmada sessiz bir tahmin (anayasa: «seçici ölçüt, evren
 *  genişlediğinde ne yapacağıyla tasarlanır»). O seçim KALDIRILDI.
 *
 *  TEK ÖLÇÜT, İKİ KULLANICI: giriş (`girisYap`) ve her istekteki oturum okuması
 *  (`oturumdakiKullanici`) aynı `uyeMi` gövdesine bakar — üyelik kaldırılırsa,
 *  firma ya da rol pasife alınırsa açık oturum da o anda geçersizleşir.
 *
 *  SISTEM: bu sorgular firmalar-üstüdür — firma bağlamı tam olarak BURADAN
 *  doğar; süzgeçli istemci kendi bağlamını bu sorgudan öğrenirdi (döngü).
 * ============================================================================
 */

/** Saf — kullanıcının yazdığı kodu karşılaştırılabilir biçime getirir. */
export function firmaKoduNormalle(ham: string): string {
  return ham.trim().toUpperCase();
}

/** Aktif bir firmanın kimliği — kod yoksa ya da firma pasifse null. */
export async function firmaKodundanKimlik(kod: string): Promise<string | null> {
  const temiz = firmaKoduNormalle(kod);
  if (!temiz) return null;
  // SISTEM: girişte firma henüz yok; kod → firma çözümü firmalar-üstüdür.
  const firma = await sistemPrisma.company.findFirst({
    where: { code: temiz, isActive: true },
    select: { id: true },
  });
  return firma?.id ?? null;
}

/** Kullanıcı bu firmaya, aktif bir rolle, aktif firmada üye mi. */
export async function uyeMi(kullaniciId: string, firmaId: string): Promise<boolean> {
  if (!kullaniciId || !firmaId) return false;
  // SISTEM: üyelik çözümü firma bağlamının kaynağıdır; süzgeçten geçemez.
  const uyelik = await sistemPrisma.userCompanyRole.findFirst({
    // Üyelik de AKTİF olmalı (K303, 05.10.2026: pasife alma firma bazında).
    where: { userId: kullaniciId, companyId: firmaId, isActive: true, company: { isActive: true }, role: { isActive: true } },
    select: { id: true },
  });
  return uyelik !== null;
}

/** Bu cihazda en son girilen firma kodu — giriş ekranı alanı doldurur. Yalnız KOD. */
export const FIRMA_KODU_CEREZI = `${UYGULAMA.teknikAd}_firma_kodu`;
