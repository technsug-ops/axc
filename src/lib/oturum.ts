import { cookies } from "next/headers";

import {
  jetonUret,
  jetonuCoz,
  OTURUM_CEREZI,
  OTURUM_SURESI_MS,
} from "@/lib/oturum-imza";
import { prisma } from "@/lib/prisma";

/**
 * ============================================================================
 *  OTURUM — SUNUCU TARAFI
 * ----------------------------------------------------------------------------
 *  `proxy.ts` kapıyı tutuyor (jeton imzası + süre). Burası ise VERİTABANINA
 *  bakan katman: kullanıcı hâlâ var mı, aktif mi, oturum sürümü tutuyor mu?
 *
 *  Neden iki katman: proxy her istekte çalışır, orada sorgu yapmak pahalıdır.
 *  Sayfa çizilirken bir kez bakmak yeterli — ve "her yerden çıkış"ın etkili
 *  olması için gereken tek yer burasıdır.
 * ============================================================================
 */

export type OturumKullanicisi = {
  id: string;
  email: string;
  ad: string | null;
};

function sirriAl(): string {
  const sir = process.env.OTURUM_SIRRI;
  if (!sir) {
    throw new Error(
      "OTURUM_SIRRI tanımlı değil. Giriş bu değer olmadan çalışmaz.",
    );
  }
  return sir;
}

/** Oturumu açar: çerezi yazar ve son giriş zamanını damgalar. */
export async function oturumAc(kullaniciId: string) {
  const kullanici = await prisma.user.findUnique({
    where: { id: kullaniciId },
    select: { sessionVersion: true },
  });
  if (!kullanici) throw new Error("Kullanıcı bulunamadı");

  const sonGecerlilik = Date.now() + OTURUM_SURESI_MS;
  const jeton = await jetonUret(
    {
      kullaniciId,
      oturumSurumu: kullanici.sessionVersion,
      sonGecerlilik,
    },
    sirriAl(),
  );

  const cerezler = await cookies();
  cerezler.set(OTURUM_CEREZI, jeton, {
    httpOnly: true, // JavaScript okuyamaz
    sameSite: "lax", // siteler arası istekte gönderilmez
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(sonGecerlilik),
  });

  await prisma.user.update({
    where: { id: kullaniciId },
    data: { lastLoginAt: new Date() },
  });
}

export async function oturumKapat() {
  const cerezler = await cookies();
  cerezler.delete(OTURUM_CEREZI);
}

/**
 * Oturumdaki kullanıcı — yoksa null.
 * Kullanıcı pasife alındıysa veya `sessionVersion` artırıldıysa (parola
 * değişikliği / her yerden çıkış) jeton geçerli olsa bile null döner.
 */
export async function oturumdakiKullanici(): Promise<OturumKullanicisi | null> {
  const cerezler = await cookies();
  const jeton = cerezler.get(OTURUM_CEREZI)?.value;
  if (!jeton) return null;

  let govde;
  try {
    govde = await jetonuCoz(jeton, sirriAl(), Date.now());
  } catch {
    return null;
  }
  if (!govde) return null;

  const kullanici = await prisma.user.findUnique({
    where: { id: govde.kullaniciId },
    select: {
      id: true,
      email: true,
      name: true,
      isActive: true,
      sessionVersion: true,
    },
  });

  if (!kullanici || !kullanici.isActive) return null;
  if (kullanici.sessionVersion !== govde.oturumSurumu) return null;

  return { id: kullanici.id, email: kullanici.email, ad: kullanici.name };
}

/** Sistemde hiç kullanıcı var mı? Giriş ekranı buna göre yol gösterir. */
export async function kullaniciVarMi(): Promise<boolean> {
  return (await prisma.user.count()) > 0;
}
