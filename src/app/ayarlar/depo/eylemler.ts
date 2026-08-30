"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import {
  kisaltmaNormalle,
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
    /**
     * ⭐ NORMALLEŞTİRME — `toUpperCase()` YETMİYORDU (düzeltildi 30.08.2026).
     *
     * ⛔ Türkçe `İ` JavaScript'te `i`ye inmez. Eski hâlde kullanıcı `Ofis`
     * yazınca kısaltma `OFİS` oluyor, `KISALTMA_KURALI` (`[A-Z0-9]`) onu
     * REDDEDİYORDU — yani ekran Türkçe bir adı yazana "kuralsız" diyordu ve
     * çıkışı söylemiyordu.
     *
     * `kisaltmaNormalle` harf harf eşliyor (`İ`→`I`, `Ş`→`S`, `Ğ`→`G`,
     * `Ü`→`U`, `Ö`→`O`, `Ç`→`C`) ve boşluk/noktalama düşüyor. Böylece hem
     * kullanıcı reddedilmiyor hem `OFİS` ile `Ofis` AYNI kısaltmaya iniyor —
     * canlıdaki iki-kimlik ayrışması yapısal olarak kapanıyor.
     */
    kisaltma: kisaltmaNormalle(String(form.get("kisaltma") ?? "")),
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
  /** ⚠ İZ İÇİN KULLANICI — `yetkiIste` bağlamı zaten döndürüyor, ikinci
   *  bir oturum sorgusu açılmıyor. */
  const { kullaniciId } = await yetkiIste("ayar.yaz");
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
    /**
     * ═══ BÖLÜM KAYDI — `DepoBolumu` (30.08.2026) ═════════════════════════
     *
     * ⛔ NİYE GEREKLİ: bölüm bugüne kadar `Location.name` METNİYLE
     * taşınıyordu ve canlıda ölçüldü — `OFİS` (13 raf) ile `Ofis` (1 raf)
     * AYRI kayıt olmuş, aynı bölüm İKİ KİMLİK. Metin alanı bunu
     * engelleyemez; `kisaltma @unique` engeller.
     *
     * ⭐ VE KISALTMA NORMALLEŞTİRİLİR: `OFİS` ve `Ofis` ikisi de `OFIS`e
     * iner. Türkçe `İ` JavaScript'te `i`ye inmediği için `toUpperCase()`
     * tek başına yetmezdi.
     *
     * ⚠ `upsert` — aynı bölüme İKİNCİ kez raf eklemek MEŞRU (üniteye kat
     * eklendi). Bölüm varsa yeniden kullanılır, adı GÜNCELLENMEZ: ad
     * değişikliği ayrı bir karardır ve buradan sessizce yapılmamalı.
     */
    /** ⚠ `tarif.kisaltma` ZATEN normalleştirilmiş (`formdanTarif`) — ikinci
     *  kez çağırmak aynı sonucu verir ama iki yerde iki kural izlenimi
     *  yaratırdı. Tek kaynak: giriş kapısı. */
    const kisaltma = tarif.kisaltma;
    const enBuyuk = await prisma.depoBolumu.aggregate({ _max: { sira: true } });
    const bolum = await prisma.depoBolumu.upsert({
      where: { kisaltma },
      update: {},
      create: { ad: tarif.ad, kisaltma, sira: (enBuyuk._max.sira ?? 0) + 1 },
      select: { id: true },
    });

    await prisma.location.createMany({
      data: ozet.yeni.map((kod) => ({
        code: kod,
        /** Görünen ad bölümün adını taşır — kod konumu, ad insanı anlatır. */
        name: tarif.ad,
        /**
         * ⭐ BÖLÜM ARTIK KİMLİKLE BAĞLI — metinle değil.
         * ⚠ Mevcut 41 rafın `bolumId`si BOŞ kalır ve bu BİLİNÇLİ: göç
         * onaylanana kadar onlara dokunulmaz (K50: "onaysız tek ad
         * değişmez"). İki hâl bir arada durur ve ekran bunu SÖYLER.
         */
        bolumId: bolum.id,
        /**
         * ⭐ ÜNİTE/GÖZ SÜTUNA — sıralama ve gruplama için.
         * Kod bunu zaten taşıyor ama SQL metin ayrıştırarak SIRALAYAMAZ ve
         * `/yerlestir` ünite bazında gruplayacak.
         *
         * ⚠ AYRIŞTIRMA GÜVENLİ: kod bu satırda ŞABLONDAN üretildi
         * (`uretimPlani`), elle girilmedi. Yine de eşleşmezse `null`
         * yazılır — uydurma bir sayı DEĞİL.
         */
        ...(() => {
          const m = /(\d+)-(\d+)$/.exec(kod);
          return m
            ? { unite: Number(m[1]), goz: Number(m[2]) }
            : { unite: null, goz: null };
        })(),
      })),
      /** ⚠ Yarış hâlinde de üstüne yazmaz. */
      skipDuplicates: true,
    });

    /**
     * ⭐ İZ — HANGİ BÖLÜM, KAÇ RAF, KİM (K50 ⑦ · madde 30.08.2026).
     *
     * ⚠ ATLANAN DA YAZILIR: "12 raf açıldı" ile "12 açıldı, 8 zaten vardı"
     * farklı hikâyelerdir. Yalnız açılanı yazmak, ikinci kurulumu ilk
     * kurulum gibi gösterirdi.
     */
    await prisma.auditLog.create({
      data: {
        action: "DEPO_BOLUMU_KURULDU",
        targetType: "DepoBolumu",
        targetId: bolum.id,
        userId: kullaniciId,
        detail: JSON.stringify({
          ad: tarif.ad,
          kisaltma,
          uniteSayisi: tarif.uniteSayisi,
          gozSayisi: tarif.gozSayisi,
          acilan: ozet.yeni.length,
          atlanan: ozet.mevcut.length,
          ilkKod: ozet.yeni[0],
          sonKod: ozet.yeni[ozet.yeni.length - 1],
        }),
      },
    });
  }

  revalidatePath("/ayarlar/depo");
  revalidatePath("/ayarlar/konumlar");
  return { durum: "KURULDU", acilan: ozet.yeni.length, atlanan: ozet.mevcut.length };
}
