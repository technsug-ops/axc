import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import {
  jetonUret,
  jetonuCoz,
  YONETIM_CEREZI,
  YONETIM_ISARETI,
  YONETIM_SURESI_MS,
  YONETIM_YOLU,
} from "@/lib/oturum-imza";
import { sistemPrisma } from "@/lib/prisma";

/**
 * ============================================================================
 *  SELLİORA YÖNETİM OTURUMU — SUNUCU (K303 4c-2, 04.10.2026)
 * ----------------------------------------------------------------------------
 *  Proxy jetonun imzasını ve işaretini sınar; burası VERİTABANINA bakar:
 *  kullanıcı hâlâ aktif mi, oturum sürümü tutuyor mu, SÜPER ADMİN mi. İşaret
 *  kaldırılırsa açık oturum o anda düşer.
 *
 *  SISTEM: kullanıcı ve süper admin işareti firmalar-üstüdür; yönetim
 *  katmanında firma bağlamı YOKTUR.
 * ============================================================================
 */

export type YonetimKullanicisi = { id: string; email: string; ad: string | null };

function sirriAl(): string {
  const sir = process.env.OTURUM_SIRRI;
  if (!sir) throw new Error("OTURUM_SIRRI tanımlı değil.");
  return sir;
}

export async function yonetimOturumuAc(kullaniciId: string): Promise<void> {
  // SISTEM: oturum sürümü kişiye aittir.
  const k = await sistemPrisma.user.findUnique({ where: { id: kullaniciId }, select: { sessionVersion: true } });
  if (!k) throw new Error("Kullanıcı bulunamadı");
  const sonGecerlilik = Date.now() + YONETIM_SURESI_MS;
  const jeton = await jetonUret(
    { kullaniciId, oturumSurumu: k.sessionVersion, sonGecerlilik, firmaId: YONETIM_ISARETI },
    sirriAl(),
  );
  (await cookies()).set(YONETIM_CEREZI, jeton, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    // YALNIZ yönetim yolunda gönderilir — firma ekranlarına hiç ulaşmaz.
    path: YONETIM_YOLU,
    expires: new Date(sonGecerlilik),
  });
}

export async function yonetimOturumuKapat(): Promise<void> {
  (await cookies()).delete({ name: YONETIM_CEREZI, path: YONETIM_YOLU });
}

/** Oturumdaki süper admin — yoksa null. */
export async function yonetimOturumu(): Promise<YonetimKullanicisi | null> {
  const jeton = (await cookies()).get(YONETIM_CEREZI)?.value;
  if (!jeton) return null;
  let govde;
  try {
    govde = await jetonuCoz(jeton, sirriAl(), Date.now());
  } catch {
    return null;
  }
  if (!govde || govde.firmaId !== YONETIM_ISARETI) return null;
  // SISTEM: süper admin işareti kişiye aittir.
  const k = await sistemPrisma.user.findUnique({
    where: { id: govde.kullaniciId },
    select: { id: true, email: true, name: true, isActive: true, sessionVersion: true, isSuperAdmin: true },
  });
  if (!k || !k.isActive || !k.isSuperAdmin) return null;
  if (k.sessionVersion !== govde.oturumSurumu) return null;
  return { id: k.id, email: k.email, ad: k.name };
}

/**
 * Yönetim sayfasının ilk satırı. Süper admin değilse **404** — «yetkiniz
 * yok» demek, orada bir ekran OLDUĞUNU söylerdi.
 */
export async function yonetimSayfasi(): Promise<YonetimKullanicisi> {
  const k = await yonetimOturumu();
  if (!k) notFound();
  return k;
}

/**
 * Yönetim SUNUCU EYLEMİNİN ilk satırı — süper admin değilse null döner ve
 * eylem `{ hata: "YETKISIZ" }` ile çıkar (eylem `notFound` atamaz; ekran bunu
 * sabit eşlemeyle metne çevirir). Yetki bekçisi bu adı modülden okur.
 */
export async function yonetimEylemi(): Promise<YonetimKullanicisi | null> {
  return yonetimOturumu();
}
