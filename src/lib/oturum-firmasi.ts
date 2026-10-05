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

/**
 * ⚠ `firmaKodundanKimlik` KALDIRILDI (05.10.2026): pasif firmanın kodunu hiç
 * çözmüyordu, bu yüzden askı sebebi söylenemiyordu. Yerini `firmaKodundanDurum`
 * aldı (pasif firmayı da bulur, `aktif` bayrağıyla); askıdaki firmaya GİRİŞ yine
 * YOK — `girisRedSebebi` (FIRMA_ASKIDA) ve `uyeMi` (company.isActive) korur.
 */

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

/**
 * ============================================================================
 *  GİRİŞ RED SEBEBİ — saf (05.10.2026, kullanıcı bulgusu)
 * ----------------------------------------------------------------------------
 *  «Hesap askıya alındı ama askıya alındığına dair bir uyarı yok» — askıdaki
 *  firmanın kullanıcısı «firma kodu, e-posta veya parola hatalı» görüyordu;
 *  kendi hatası sanıp deniyor, kilide takılıyordu (İlke #5).
 *
 *  ⚠ SIZINTI KURALI: özel sebep YALNIZ parola DOĞRU ve kişi O FİRMANIN üyesi
 *  iken söylenir. Parolayı bilmeyen biri hiçbir şey öğrenmez; başka firmanın
 *  kodunu doğru parolayla deneyen biri o firmanın durumunu öğrenmez.
 * ============================================================================
 */
export type GirisRedSebebi = "HATALI" | "FIRMA_ASKIDA" | "UYELIK_PASIF" | "HESAP_KAPALI";

export function girisRedSebebi(g: {
  kullaniciVar: boolean;
  parolaDogru: boolean;
  kisiAktif: boolean;
  /** Koddan bulunan firma — kod yoksa null. Pasif firma da bulunur. */
  firma: { aktif: boolean } | null;
  /** Kişinin O firmadaki üyeliği — yoksa null. */
  uyelik: { aktif: boolean; rolAktif: boolean } | null;
}): GirisRedSebebi | null {
  if (!g.kullaniciVar || !g.parolaDogru) return "HATALI";
  if (!g.firma || !g.uyelik) return "HATALI";
  if (!g.kisiAktif) return "HESAP_KAPALI";
  if (!g.firma.aktif) return "FIRMA_ASKIDA";
  if (!g.uyelik.aktif) return "UYELIK_PASIF";
  if (!g.uyelik.rolAktif) return "HATALI";
  return null;
}

/** Girişte koddan firma — PASİF firma da bulunur (askı sebebini söylemek için). */
export async function firmaKodundanDurum(kod: string): Promise<{ id: string; aktif: boolean } | null> {
  const temiz = firmaKoduNormalle(kod);
  if (!temiz) return null;
  // SISTEM: girişte firma henüz yok; kod → firma çözümü firmalar-üstüdür.
  const f = await sistemPrisma.company.findFirst({ where: { code: temiz }, select: { id: true, isActive: true } });
  return f ? { id: f.id, aktif: f.isActive } : null;
}

/** Kişinin bu firmadaki üyeliğinin ham durumu — yoksa null. */
export async function uyelikGirisDurumu(kullaniciId: string, firmaId: string): Promise<{ aktif: boolean; rolAktif: boolean } | null> {
  if (!kullaniciId || !firmaId) return null;
  // SISTEM: giriş anı, firma bağlamı henüz yok; kişi + firma çiftiyle.
  const u = await sistemPrisma.userCompanyRole.findUnique({
    where: { userId_companyId: { userId: kullaniciId, companyId: firmaId } },
    select: { isActive: true, role: { select: { isActive: true } } },
  });
  return u ? { aktif: u.isActive, rolAktif: u.role.isActive } : null;
}
