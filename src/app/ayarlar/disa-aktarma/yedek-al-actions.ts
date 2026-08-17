"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { gunlukYedekYaz } from "@/lib/yedek-yaz";
import { yetkiIste } from "@/lib/yetki";

/**
 * ============================================================================
 *  ŞİMDİ YEDEK AL — ELLE TETİKLEME
 * ----------------------------------------------------------------------------
 *  ⚠ NEDEN VAR (mimar onayı 17.08.2026)
 *
 *  Yedek uyarısı kırmızı yandığında kullanıcıyı `/ayarlar/disa-aktarma`ya
 *  götürüyordu ama o ekranda yedek ALACAK bir şey yoktu — yalnız "indir"
 *  (tarayıcıya indirir, depoya yazmaz) ve geçmiş listesi. Uyarı ÇIKMAZA
 *  götürüyordu; 17.08'de yedek ancak Vercel paneline girip Run diyerek
 *  alınabildi.
 *
 *  Anayasa notu: "gösterdiğim link var olan bir ekrana mı gidiyor" sorusunun
 *  kardeşi — gidilen ekran SORUNU ÇÖZEBİLİYOR MU.
 *
 *  KOPYA MANTIK YOK: cron route'u ile bu eylem AYNI `gunlukYedekYaz`
 *  fonksiyonunu çağırır. Elle alınan yedek ile gece yedeği birebir aynı işi
 *  yapar; ikisi ayrışamaz.
 * ============================================================================
 */

export type ElleYedekSonucu =
  | { tamam: true; gun: string; satir: number; boyutKb: number }
  | { tamam: false; hata: string };

export async function simdiYedekAl(): Promise<ElleYedekSonucu> {
  await yetkiIste("veri.aktar");
  const t = await getTranslations("DisaAktarma");

  const sonuc = await gunlukYedekYaz();

  if (!sonuc.tamam) {
    /**
     * SESSİZ BAŞARISIZLIK YASAK: depo bağlı değilse kullanıcı bunu görür ve
     * ne yapacağını bilir. Ham hata metni ekrana basılmaz — çeviriden geçen
     * anlaşılır bir cümle döner, ayrıntı sunucu günlüğünde durur.
     */
    return {
      tamam: false,
      hata: sonuc.kod === "DEPO_YOK" ? t("depoYok") : t("yedekAlinamadi"),
    };
  }

  // Liste ve uyarı tazelensin: yeni yedek hemen görünsün, çan sönsün.
  revalidatePath("/ayarlar/disa-aktarma");
  revalidatePath("/");

  return {
    tamam: true,
    gun: sonuc.gun,
    satir: sonuc.satir,
    boyutKb: Math.max(1, Math.round(sonuc.boyutBayt / 1024)),
  };
}
