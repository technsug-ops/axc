import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

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

export type YonetimKullanicisi = { id: string; email: string; ad: string | null; parolaDegismeli: boolean };

/**
 * KAPI KARARI — saf (05.10.2026, kullanıcı kararı «süper admin ilk girişte
 * parolasını değiştirsin»). Firma tarafındaki kural yönetime de işler:
 * parolası değişmeli olan kişi yönetim sayfalarını AÇAMAZ, yönetim eylemi
 * ÇALIŞTIRAMAZ; yalnız parola ekranına gider.
 */
export type YonetimKapiKarari = "GIRIS_YOK" | "PAROLA" | "TAMAM";
export function yonetimKapiKarari(k: YonetimKullanicisi | null): YonetimKapiKarari {
  if (!k) return "GIRIS_YOK";
  return k.parolaDegismeli ? "PAROLA" : "TAMAM";
}

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

/* ═══ İKİ ADIMLI GİRİŞ — ARA ADIM (K303 ⑤, 06.10.2026) ════════════════════
 * Parola doğruysa OTURUM AÇILMAZ; 5 dakikalık, imzalı «ara adım» çerezi verilir
 * ve giriş sayfası (`/bezirga` — proxy'nin açık bıraktığı TEK yönetim adresi)
 * kod adımını gösterir. Jeton işareti yönetim işaretinden FARKLI: proxy ve
 * `yonetimOturumu` onu içerideki hiçbir sayfa için kabul etmez. Ayrı çerez adı.
 * Oturum sürümü taşır: parola değişirse bekleyen ara adım da düşer. */
export const ARA_ADIM_CEREZI = `${YONETIM_CEREZI}_adim`;
export const ARA_ADIM_ISARETI = `${YONETIM_ISARETI}_ADIM`;
export const ARA_ADIM_SURESI_MS = 5 * 60 * 1000;

export async function araAdimAc(kullaniciId: string): Promise<void> {
  // SISTEM: oturum sürümü kişiye aittir.
  const k = await sistemPrisma.user.findUnique({ where: { id: kullaniciId }, select: { sessionVersion: true } });
  if (!k) throw new Error("Kullanıcı bulunamadı");
  const sonGecerlilik = Date.now() + ARA_ADIM_SURESI_MS;
  const jeton = await jetonUret({ kullaniciId, oturumSurumu: k.sessionVersion, sonGecerlilik, firmaId: ARA_ADIM_ISARETI }, sirriAl());
  (await cookies()).set(ARA_ADIM_CEREZI, jeton, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: YONETIM_YOLU, expires: new Date(sonGecerlilik) });
}

export async function araAdimKapat(): Promise<void> {
  (await cookies()).delete({ name: ARA_ADIM_CEREZI, path: YONETIM_YOLU });
}

/** Ara adımdaki süper admin — jeton geçersiz/süresi dolmuş/işaret farklıysa null. */
export async function araAdimKullanicisi(): Promise<{ id: string; email: string } | null> {
  const jeton = (await cookies()).get(ARA_ADIM_CEREZI)?.value;
  if (!jeton) return null;
  let govde;
  try {
    govde = await jetonuCoz(jeton, sirriAl(), Date.now());
  } catch {
    return null;
  }
  if (!govde || govde.firmaId !== ARA_ADIM_ISARETI) return null;
  // SISTEM: kişi kaydı.
  const k = await sistemPrisma.user.findUnique({ where: { id: govde.kullaniciId }, select: { id: true, email: true, isActive: true, isSuperAdmin: true, sessionVersion: true, hesapFirmasiId: true } });
  if (!k || !k.isActive || !k.isSuperAdmin || k.hesapFirmasiId !== null || k.sessionVersion !== govde.oturumSurumu) return null;
  return { id: k.id, email: k.email };
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
    select: { id: true, email: true, name: true, isActive: true, sessionVersion: true, isSuperAdmin: true, mustChangePassword: true, totpAcildiAt: true },
  });
  if (!k || !k.isActive || !k.isSuperAdmin) return null;
  if (k.sessionVersion !== govde.oturumSurumu) return null;
  /* K303 ⑤ — iki adımlı giriş ZORUNLU (kullanıcı kararı 06.10.2026): iki adımı
     açık olmayan hesabın oturumu GEÇERSİZ. Bu değişiklikten ÖNCE açılmış eski
     çerezler de böylece düşer; bütün yönetim kapıları buradan geçer. */
  if (!k.totpAcildiAt) return null;
  return { id: k.id, email: k.email, ad: k.name, parolaDegismeli: k.mustChangePassword };
}

/**
 * Yönetim sayfasının ilk satırı. Süper admin değilse **404** — «yetkiniz
 * yok» demek, orada bir ekran OLDUĞUNU söylerdi.
 */
export async function yonetimSayfasi(): Promise<YonetimKullanicisi> {
  const k = await yonetimOturumu();
  const karar = yonetimKapiKarari(k);
  if (karar === "GIRIS_YOK" || !k) notFound();
  if (karar === "PAROLA") redirect(`${YONETIM_YOLU}/parola`);
  return k;
}

/**
 * Yalnız yönetim PAROLA ekranının kapısı: oturum ister, parola zorunluluğuna
 * bakmaz (bakarsa ekran kendine yönlendirirdi). Başka hiçbir sayfa kullanmaz.
 */
export async function yonetimSayfasiParolaEkrani(): Promise<YonetimKullanicisi> {
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
  const k = await yonetimOturumu();
  // Parolası değişmeli olan kişi hiçbir yönetim eylemini çalıştıramaz.
  return yonetimKapiKarari(k) === "TAMAM" ? k : null;
}

/**
 * Yalnız yönetim PAROLA EYLEMİNİN kapısı: oturum ister, parola zorunluluğuna
 * bakmaz (bakarsa geçici parolalı kişi parolasını hiç değiştiremezdi).
 * `yonetim-kapisi:dogrula` bunun başka bir eylemde kullanılmadığını ölçer.
 */
export async function yonetimEylemiParolaEkrani(): Promise<YonetimKullanicisi | null> {
  return yonetimOturumu();
}
