"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
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

/** Gecikmeli denemenin bekleme süresi — SABİT (istemciden gelmez). */
const GECIKME_MS = 10_000;

/**
 * Bu kullanıcının bütün cihazlarına deneme bildirimi — sonucu SAYIYLA söyler.
 * `gecikmeli`: kullanıcı 20.10 «sipariş geldi, bildirim sesi gelmedi» → telefon
 * KİLİTLİYKEN sınansın diye bildirim 10 sn sonra gider. Cevap HEMEN döner, gönderim
 * `after` ile cevaptan sonra koşar — telefon kilitlenip bağlantı kopsa da düşmez.
 * Sonuç ize yazılır (gecikmelide ekrana dönemediği için tanı oradan okunur).
 */
export async function denemeGonder(gecikmeli = false): Promise<BildirimSonucu> {
  const baglam = await yetkiIste("satis.gor");
  const t = await getTranslations("AnlikBildirim");
  if (gecikmeli) {
    if (!pushAyari()) return { tamam: false, hata: t("kurulmadi") };
    const cihazSayisi = await prisma.pushAboneligi.count({ where: { userId: baglam.kullaniciId } });
    if (cihazSayisi === 0) return { tamam: false, hata: t("cihazYok") };
    after(async () => {
      await new Promise((bitti) => setTimeout(bitti, GECIKME_MS));
      try {
        const sonuc = await denemeBildirimiGonder(baglam.kullaniciId);
        await izYaz({ action: "ANLIK_BILDIRIM_DENEME", userId: baglam.kullaniciId, companyId: baglam.companyId, detail: JSON.stringify({ gecikmeli: true, ...sonuc }) });
      } catch (hata) {
        console.error("[anlik-bildirim] gecikmeli deneme düştü:", hata);
      }
    });
    return { tamam: true, mesaj: t("gecikmeliKuruldu") };
  }
  try {
    const sonuc = await denemeBildirimiGonder(baglam.kullaniciId);
    if (sonuc) await izYaz({ action: "ANLIK_BILDIRIM_DENEME", companyId: baglam.companyId, detail: JSON.stringify({ gecikmeli: false, ...sonuc }) });
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
