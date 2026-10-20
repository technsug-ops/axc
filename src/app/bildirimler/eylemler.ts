"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { yetkiIste } from "@/lib/yetki";
import { izYaz } from "@/lib/iz";
import { abonelikOku } from "@/lib/bildirim/push-karar";
import { denemeBildirimiGonder, pushAyari } from "@/lib/bildirim/push-gonder";

export type BildirimSonucu = { tamam: boolean; mesaj?: string; hata?: string };

/**
 * Bu cihazı kaydeder. Uç tekil: aynı cihaz yeniden açarsa satır GÜNCELLENİR
 * (başka kullanıcıyla aynı tarayıcıda giriş yapıldıysa sahibi de değişir —
 * cihaz son giriş yapanın bildirimini almalı, öncekinin değil).
 */
export async function aboneOl(ham: unknown, cihaz: string): Promise<BildirimSonucu> {
  const baglam = await yetkiIste("satis.gor");
  const t = await getTranslations("AnlikBildirim");
  if (!pushAyari()) return { tamam: false, hata: t("kurulmadi") };
  const abonelik = abonelikOku(ham);
  if (!abonelik) return { tamam: false, hata: t("abonelikGecersiz") };
  const etiket = cihaz.trim().slice(0, 191) || null;
  try {
    const satir = await prisma.pushAboneligi.upsert({
      where: { endpoint: abonelik.endpoint },
      create: { ...abonelik, userId: baglam.kullaniciId, cihaz: etiket },
      update: { p256dh: abonelik.p256dh, auth: abonelik.auth, userId: baglam.kullaniciId, cihaz: etiket },
    });
    await izYaz({ action: "ANLIK_BILDIRIM_ABONE", companyId: baglam.companyId, targetType: "PushAboneligi", targetId: satir.id, detail: JSON.stringify({ cihaz: etiket }) });
  } catch (hata) {
    console.error("[anlik-bildirim] abonelik yazılamadı:", hata);
    return { tamam: false, hata: t("kaydedilemedi") };
  }
  revalidatePath("/bildirimler");
  return { tamam: true, mesaj: t("acildi") };
}

/** Bir cihazın aboneliğini kaldırır — yalnız KENDİ cihazı (uç ya da kimlikle). */
export async function abonelikKaldir(girdi: { endpoint?: string; id?: string }): Promise<BildirimSonucu> {
  const baglam = await yetkiIste("satis.gor");
  const t = await getTranslations("AnlikBildirim");
  if (!girdi.endpoint && !girdi.id) return { tamam: false, hata: t("kaydedilemedi") };
  try {
    const silinen = await prisma.pushAboneligi.deleteMany({
      where: { userId: baglam.kullaniciId, ...(girdi.id ? { id: girdi.id } : { endpoint: girdi.endpoint }) },
    });
    if (silinen.count > 0) {
      await izYaz({ action: "ANLIK_BILDIRIM_KALDIR", companyId: baglam.companyId, targetType: "PushAboneligi", targetId: girdi.id ?? null, detail: JSON.stringify({ silinen: silinen.count }) });
    }
  } catch (hata) {
    console.error("[anlik-bildirim] abonelik silinemedi:", hata);
    return { tamam: false, hata: t("kaydedilemedi") };
  }
  revalidatePath("/bildirimler");
  return { tamam: true, mesaj: t("kapatildi") };
}

/** Bu kullanıcının bütün cihazlarına deneme bildirimi — sonucu SAYIYLA söyler. */
export async function denemeGonder(): Promise<BildirimSonucu> {
  const baglam = await yetkiIste("satis.gor");
  const t = await getTranslations("AnlikBildirim");
  try {
    const sonuc = await denemeBildirimiGonder(baglam.kullaniciId);
    if (!sonuc) return { tamam: false, hata: t("kurulmadi") };
    if (sonuc.hedef === 0) return { tamam: false, hata: t("cihazYok") };
    revalidatePath("/bildirimler");
    return sonuc.gonderilen > 0
      ? { tamam: true, mesaj: t("denemeSonucu", { gonderilen: sonuc.gonderilen, hedef: sonuc.hedef, silinen: sonuc.silinen }) }
      : { tamam: false, hata: t("denemeOlmadi", { hedef: sonuc.hedef, silinen: sonuc.silinen }) };
  } catch (hata) {
    console.error("[anlik-bildirim] deneme düştü:", hata);
    return { tamam: false, hata: t("kaydedilemedi") };
  }
}
