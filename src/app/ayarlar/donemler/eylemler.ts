"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { prisma } from "@/lib/prisma";
import { yetkiIste } from "@/lib/yetki";
import { tarihinDonemi } from "@/lib/muhasebe-donemi";
import { izYaz } from "@/lib/iz";

/**
 * ============================================================================
 *  DÖNEM KAPATMA / AÇMA (K108, 31.08.2026)
 * ----------------------------------------------------------------------------
 *  ⚠ YENİ İZİN AÇILMADI — `ayar.yaz` mevcut ve bu ekran tam olarak onun işi.
 *  Yeni izin açsaydık `izinler.ts` + `seed-yetki.ts → SONRADAN_DOGAN` + canlı
 *  senkron gerekirdi ve unutulan tek satır ekranı GÖRÜNMEZ yapardı
 *  (bkz. `/iadeler`, 13.08.2026). _(K51'de aynı karar verilmişti.)_
 *
 *  ⛔ BU EKRAN KAPIDAN SONRA AÇILDI — VE SIRA TERSİNE ÇEVRİLEMEZ.
 *  Kullanıcı kararı 31.08: _"kapatılan dönem korunmaz, yanlış güvence verir."_
 *  Ekran kapıdan önce açılsaydı Halil dönemi kapatır ve korunduğunu sanırdı;
 *  kapalı döneme yazım sessizce geçerdi.
 *
 *  ── ⚠ KAPANIŞ SİLİNMEZ, DURUMU DEĞİŞİR ─────────────────────────────────
 *  Yeniden açma satırı SİLMEZ — `durum` alanını çevirir ve `AuditLog`a iz
 *  bırakır. Silinseydi "bu dönem bir ara kapalıydı" bilgisi kaybolurdu ve
 *  altı ay sonra "niye o dönemde uyarıya rağmen kayıt var" sorusu cevapsız
 *  kalırdı. _(Ledger disiplininin karar tarafı.)_
 * ============================================================================
 */

export type DonemDurumuSonucu = { hata?: string; basari?: string };

const IZIN = "ayar.yaz" as const;

export async function donemiKapat(
  _onceki: DonemDurumuSonucu,
  formData: FormData,
): Promise<DonemDurumuSonucu> {
  const baglam = await yetkiIste(IZIN);
  const t = await getTranslations("Donem");

  const yil = Number(formData.get("yil"));
  const ay = Number(formData.get("ay"));
  const not = String(formData.get("not") ?? "").trim();

  if (!Number.isInteger(yil) || !Number.isInteger(ay) || ay < 1 || ay > 12) {
    return { hata: t("gecersizDonem") };
  }

  /**
   * ⛔ GELECEK DÖNEM KAPATILAMAZ — VE BUGÜNKÜ DE.
   * Henüz bitmemiş bir ayı kapatmak, o ay boyunca yapılacak HER kaydı
   * duraksatmak demektir: operatör her satışta ısrar kutusu görür ve kutu
   * anlamını yitirir. Kapanış ancak dönem BİTTİKTEN sonra bir karardır.
   */
  const bu = tarihinDonemi(new Date());
  if (yil * 12 + ay >= bu.yil * 12 + bu.ay) {
    return { hata: t("gelecekDonemKapatilamaz") };
  }

  await prisma.muhasebeDonemi.upsert({
    where: { yil_ay: { yil, ay } },
    create: {
      yil,
      ay,
      durum: "KAPALI",
      kapatanId: baglam.kullaniciId,
      kapatildiAt: new Date(),
      not: not || null,
    },
    /**
     * ⚠ `upsert` — İKİNCİ KEZ KAPATMA İKİNCİ SATIR AÇMAZ. `@@unique([yil,ay])`
     * zaten engelliyor ama hata fırlatmak yerine güncellemek doğru: kullanıcı
     * yeniden açıp yeniden kapatabilir ve o meşru bir iştir.
     */
    update: {
      durum: "KAPALI",
      kapatanId: baglam.kullaniciId,
      kapatildiAt: new Date(),
      not: not || null,
    },
  });

  /** ⛔ İZ ORTAK GÖVDEDEN — `userId` kendiliğinden damgalanır (K90). */
  await izYaz({
    action: "DONEM_KAPATILDI",
    targetType: "MuhasebeDonemi",
    targetId: `${yil}-${String(ay).padStart(2, "0")}`,
    userId: baglam.kullaniciId,
    detail: JSON.stringify({ yil, ay, not: not || null }),
  });

  revalidatePath("/ayarlar/donemler");
  return { basari: t("kapatildi") };
}

export async function donemiAc(
  _onceki: DonemDurumuSonucu,
  formData: FormData,
): Promise<DonemDurumuSonucu> {
  const baglam = await yetkiIste(IZIN);
  const t = await getTranslations("Donem");

  const yil = Number(formData.get("yil"));
  const ay = Number(formData.get("ay"));
  if (!Number.isInteger(yil) || !Number.isInteger(ay)) {
    return { hata: t("gecersizDonem") };
  }

  /**
   * ⚠ SATIR SİLİNMEZ, DURUMU ÇEVRİLİR. Silmek "bu dönem bir ara kapalıydı"
   * bilgisini yok ederdi; o bilgi, dönem içinde uyarıya rağmen yazılmış
   * kayıtları açıklayan tek şey.
   */
  await prisma.muhasebeDonemi.update({
    where: { yil_ay: { yil, ay } },
    data: { durum: "ACIK" },
  });

  /** ⛔ İZ ORTAK GÖVDEDEN — `userId` kendiliğinden damgalanır (K90). */
  await izYaz({
    action: "DONEM_ACILDI",
    targetType: "MuhasebeDonemi",
    targetId: `${yil}-${String(ay).padStart(2, "0")}`,
    userId: baglam.kullaniciId,
    detail: JSON.stringify({ yil, ay }),
  });

  revalidatePath("/ayarlar/donemler");
  return { basari: t("acildi") };
}
