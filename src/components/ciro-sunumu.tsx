import { getTranslations } from "next-intl/server";

/**
 * ============================================================================
 *  CİRO SUNUMU — BRÜT · İADE DÜŞÜMÜ · NET
 * ----------------------------------------------------------------------------
 *  Mimar kararı 13.08.2026: panelin ciro gösterdiği HER yerde aynı sunum.
 *  Bu yüzden tek bileşen: dört yüzey (büyük ciro kutusu, kanal tablosu,
 *  telefon kartı, aylık seri tablosu) aynı kodu çağırır. Dört yerde dört
 *  kopya olsaydı biri düzeltilip diğeri unutulurdu — panelde iki farklı
 *  ciro biçimi, "hangisi doğru" sorusunu doğurur.
 *
 *  İADE SIFIRKEN SATIR GİZLENMEZ (mimar kuralı). Ne yazacağı ölçüldü ve
 *  seçildi:
 *
 *    "−0,00 iade" ELENDİ — anayasanın 11. ilkesinin aynı tuzağı: yuvarlanmış
 *    küçük bir tutar sanılıyor. Kullanıcı 09.08.2026'da gri "1,5"i girilmiş
 *    değer sanmıştı; kuruş yuvarlamasının gerçekten mümkün olduğu bir alanda
 *    aynı hatayı ciro satırına taşımak istemiyoruz.
 *
 *    KUTUDA "iade yok" — tek satır var, tekrar sorunu yok, en açık okunanı.
 *    SATIRDA "— iade" — tire bu sistemde ZATEN "değer yok" demek
 *    (`bicim.para(null)` → "—"). 11 kanal açıldığında "iade yok" on bir kez
 *    yazılmıyor, hizalama da bozulmuyor.
 *
 *  BİÇİMLENMİŞ METİN ALIR, sayı almaz: para biçimi dil altyapısından geçmek
 *  zorunda (anayasa) ve çağıran taraf sunucuda `bicimlendirici()` ile onu
 *  zaten çözüyor. Bileşen para birimi kuralını yeniden yorumlamaz.
 * ============================================================================
 */

export type CiroSunumuOzellikleri = {
  /** Biçimlenmiş brüt ciro — "10.111,00 ₺". */
  brut: string;
  /**
   * Biçimlenmiş iade düşümü. **null = o dönemde iade YOK** (sıfır tutarlı
   * iade ile aynı şey değildir; sıfır tutar da null verilir, çünkü ekranda
   * söylenecek şey aynı: düşen bir kuruş yok).
   */
  iade: string | null;
  /** Biçimlenmiş net ciro — brüt − iade. */
  net: string;
  /**
   * `kutu`  : panelin büyük ciro kutusu (tek satır, kelimeyle söylenir)
   * `satir` : tablo hücresi / telefon kartı / aylık satır (tireyle)
   */
  boyut?: "kutu" | "satir";
};

export async function CiroSunumu({
  brut,
  iade,
  net,
  boyut = "satir",
}: CiroSunumuOzellikleri) {
  const t = await getTranslations("Panel");

  const kutuMu = boyut === "kutu";

  return (
    <span className={kutuMu ? "block space-y-0.5" : "block"}>
      <span
        className={
          kutuMu ? "block text-2xl font-semibold" : "block whitespace-nowrap"
        }
      >
        {brut}
      </span>
      <span className="text-muted-foreground block text-xs whitespace-nowrap">
        {iade === null
          ? kutuMu
            ? t("ciroIadeYok")
            : t("ciroIadeYokTire")
          : t("ciroIade", { tutar: iade })}
      </span>
      <span
        className={
          kutuMu
            ? "block text-sm font-semibold"
            : "block text-xs font-medium whitespace-nowrap"
        }
      >
        {t("ciroNet", { tutar: net })}
      </span>
    </span>
  );
}
