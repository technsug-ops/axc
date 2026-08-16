"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { prisma } from "@/lib/prisma";
import {
  bagalamiKirp,
  gecisGecerliMi,
  kapanisZamani,
  sonrakiSira,
  talebiDogrula,
  talepKodu,
  type TalepDurumu,
} from "@/lib/talep/turler";
import { yetkiBaglami, yetkiIste } from "@/lib/yetki";

/**
 * ============================================================================
 *  DESTEK TALEBİ — SUNUCU EYLEMLERİ
 * ----------------------------------------------------------------------------
 *  Hesap `lib/talep/turler.ts`te; burada yalnız izin, doğrulama ve YAZMA var.
 *
 *  ── YETKİ İKİ AYRI SEVİYE ───────────────────────────────────────────────
 *  TALEP AÇMAK İZİN İSTEMEZ: sistemi kullanan herkes "burada olmuyor"
 *  diyebilmeli. İzne bağlansaydı bildirim yine Telegram'a kaçardı ve modül
 *  varlık sebebini kaybederdi. Yalnız GİRİŞ gerekir (bildiren kim, bilinmeli).
 *
 *  DURUMU DEĞİŞTİRMEK `destek.yonet` ister. Kullanıcı kendi talebinin nerede
 *  olduğunu GÖRÜR ama ilerletemez — "aldık / yapılıyor / çözüldü" bilgisi
 *  geliştiriciden gelir, yoksa durum bir anlam taşımaz.
 * ============================================================================
 */

export type TalepSonucu = { tamam: true; kod: string } | { tamam: false; hata: string };

export async function talepOlustur(
  _oncekiDurum: TalepSonucu | null,
  formData: FormData,
): Promise<TalepSonucu> {
  const t = await getTranslations("Talep");

  /**
   * İZİN DEĞİL, KİMLİK. `yetkiIste` çağrılmıyor — bilerek. Ama oturum şart:
   * bildireni bilinmeyen talep, cevaplanamayan taleptir.
   */
  const baglam = await yetkiBaglami();
  if (!baglam) return { tamam: false, hata: t("girisGerekli") };

  const baslik = String(formData.get("baslik") ?? "");
  const aciklama = String(formData.get("aciklama") ?? "");
  const tur = String(formData.get("tur") ?? "");

  const hatalar = talebiDogrula({ baslik, aciklama, tur });
  if (hatalar.length > 0) {
    // Kod → metin SABİT eşleme; i18n denetimi anahtarları görebilsin.
    const metin: Record<string, string> = {
      BASLIK_BOS: t("hataBaslikBos"),
      BASLIK_COK_UZUN: t("hataBaslikUzun"),
      ACIKLAMA_BOS: t("hataAciklamaBos"),
      TUR_GECERSIZ: t("hataTurGecersiz"),
    };
    return { tamam: false, hata: metin[hatalar[0]] ?? t("hataBilinmeyen") };
  }

  try {
    /**
     * KOD ÜRETİMİ İŞLEM İÇİNDE. İki bildirim aynı anda gelirse ikisi de
     * aynı sırayı okuyup aynı kodu üretebilir; `kod` UNIQUE olduğu için
     * ikincisi patlar. İşlem içinde okuyup yazmak yarışı daraltıyor,
     * unique kısıt da son emniyet kemeri olarak duruyor.
     */
    const talep = await prisma.$transaction(async (tx) => {
      const kodlar = await tx.talep.findMany({ select: { kod: true } });
      return tx.talep.create({
        data: {
          kod: talepKodu(sonrakiSira(kodlar.map((k) => k.kod))),
          tur: tur as "HATA" | "ISTEK",
          baslik: baslik.trim(),
          aciklama: aciklama.trim(),
          rota: bagalamiKirp(String(formData.get("rota") ?? "")),
          tarayici: bagalamiKirp(String(formData.get("tarayici") ?? "")),
          bildirenId: baglam.kullaniciId,
        },
        select: { kod: true },
      });
    });

    revalidatePath("/talepler");
    return { tamam: true, kod: talep.kod };
  } catch (e) {
    console.error("[talep olustur] beklenmeyen hata:", e);
    return { tamam: false, hata: t("hataBilinmeyen") };
  }
}

export type DurumSonucu = { tamam: boolean; hata?: string };

export async function talepDurumDegistir(
  talepId: string,
  yeniDurum: TalepDurumu,
  cozumNotu: string | null,
): Promise<DurumSonucu> {
  await yetkiIste("destek.yonet");
  const t = await getTranslations("Talep");

  const mevcut = await prisma.talep.findUnique({
    where: { id: talepId },
    select: { durum: true, kapatilmaZamani: true },
  });
  if (!mevcut) return { tamam: false, hata: t("talepYok") };

  /**
   * GEÇİŞ SUNUCUDA DA DOĞRULANIR. Ekran yalnız geçerli seçenekleri
   * gösteriyor, ama süzgeç GÖRÜNÜRLÜKTÜR: eski sekme açık kalabilir,
   * istek elle kurulabilir. (Bugün stok düzeltmede aynı boşluk çıktı.)
   */
  if (!gecisGecerliMi(mevcut.durum, yeniDurum)) {
    return { tamam: false, hata: t("gecisGecersiz") };
  }

  await prisma.talep.update({
    where: { id: talepId },
    data: {
      durum: yeniDurum,
      kapatilmaZamani: kapanisZamani(
        mevcut.kapatilmaZamani,
        yeniDurum,
        new Date(),
      ),
      // Boş not mevcut notu SİLMEZ: geliştirici durumu ilerletirken not
      // yazmak zorunda değil, ama yazdığı not kaybolmamalı.
      ...(cozumNotu !== null && cozumNotu.trim() !== ""
        ? { cozumNotu: cozumNotu.trim() }
        : {}),
    },
  });

  revalidatePath("/talepler");
  return { tamam: true };
}
