"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import {
  tarifiDenetle,
  uretimPlani,
  type BolumTarifi,
  type UretimOzeti,
} from "@/lib/depo/sablon";
import { prisma } from "@/lib/prisma";
import { yetkiIste } from "@/lib/yetki";

/**
 * ============================================================================
 *  DEPO KURULUMU — SUNUCU EYLEMLERİ (K50 ①)
 * ----------------------------------------------------------------------------
 *  ⚠ İKİ ADIM, TEK YAZMA. Önce `depoOnizle` (hiçbir şey yazmaz), sonra
 *  kullanıcı planı GÖRDÜKTEN sonra `depoyuKur`. Tarife yükleme ekranında
 *  (K47) sınanmış disiplinin aynısı: onaysız hiçbir raf açılmaz.
 *
 *  ⚠ KURAL BURADA DEĞİL, `lib/depo/sablon.ts`te — orası veritabanısız
 *  sınanıyor (`depo:dogrula`). Buraya kural yazmak, aynı kuralın iki yerde
 *  yaşamasına yol açardı.
 *
 *  ⚠ İZİN `ayar.yaz` — YENİ İZİN AÇILMADI. Raf konumları ekranı zaten bu
 *  izinle çalışıyor ve bu onun kurulum yardımcısı.
 * ============================================================================
 */

function formdanTarif(form: FormData): BolumTarifi {
  return {
    ad: String(form.get("ad") ?? "").trim(),
    /** ⚠ Kısaltma BÜYÜK harfe çevrilir — kullanıcı küçük yazsa da kod bozulmasın. */
    kisaltma: String(form.get("kisaltma") ?? "").trim().toUpperCase(),
    uniteSayisi: Number(form.get("unite") ?? 0),
    gozSayisi: Number(form.get("goz") ?? 0),
  };
}

export type DepoSonucu =
  | { durum: "HATA"; engel: string }
  | { durum: "ONIZLEME"; tarif: BolumTarifi; ozet: UretimOzeti }
  | { durum: "KURULDU"; acilan: number; atlanan: number };

/** Adım 1 — plan. HİÇBİR ŞEY YAZMAZ. */
export async function depoOnizle(form: FormData): Promise<DepoSonucu> {
  await yetkiIste("ayar.yaz");
  const t = await getTranslations("Depo");

  const tarif = formdanTarif(form);
  const hatalar = tarifiDenetle(tarif);
  if (hatalar.length > 0) {
    return { durum: "HATA", engel: t(`hata${hatalar[0]}` as "hataAD_BOS") };
  }

  const mevcut = await prisma.location.findMany({ select: { code: true } });
  const ozet = uretimPlani(tarif, mevcut.map((m) => m.code));

  if (ozet.sinirAsildi) {
    return { durum: "HATA", engel: t("hataSinir", { toplam: ozet.toplam }) };
  }
  return { durum: "ONIZLEME", tarif, ozet };
}

/** Adım 2 — yazma. Kullanıcı planı gördükten SONRA. */
export async function depoyuKur(form: FormData): Promise<DepoSonucu> {
  await yetkiIste("ayar.yaz");
  const t = await getTranslations("Depo");

  const tarif = formdanTarif(form);
  const hatalar = tarifiDenetle(tarif);
  if (hatalar.length > 0) {
    return { durum: "HATA", engel: t(`hata${hatalar[0]}` as "hataAD_BOS") };
  }

  const mevcut = await prisma.location.findMany({ select: { code: true } });
  const ozet = uretimPlani(tarif, mevcut.map((m) => m.code));
  if (ozet.sinirAsildi) {
    return { durum: "HATA", engel: t("hataSinir", { toplam: ozet.toplam }) };
  }

  /**
   * ⚠ YALNIZ YENİLER AÇILIR — MEVCUDA DOKUNULMAZ. Aynı bölüm ikinci kez
   * tarif edilirse (üniteye kat eklendi) var olan raflar atlanır: üstlerinde
   * ÜRÜN var ve basılı etiketleri raflarda duruyor. "Kapasite artırma =
   * EKLEME" kuralı budur; üstüne yazmak kimlik kıyımı olurdu.
   */
  if (ozet.yeni.length > 0) {
    await prisma.location.createMany({
      data: ozet.yeni.map((kod) => ({
        code: kod,
        /** Görünen ad bölümün adını taşır — kod konumu, ad insanı anlatır. */
        name: tarif.ad,
      })),
      /** ⚠ Yarış hâlinde de üstüne yazmaz. */
      skipDuplicates: true,
    });
  }

  revalidatePath("/ayarlar/depo");
  revalidatePath("/ayarlar/konumlar");
  return { durum: "KURULDU", acilan: ozet.yeni.length, atlanan: ozet.mevcut.length };
}
