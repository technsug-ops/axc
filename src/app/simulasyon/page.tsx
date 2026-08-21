import { getTranslations } from "next-intl/server";

import { Card, CardContent } from "@/components/ui/card";
import { gunDegeri, isTakvimGunu } from "@/lib/donem";
import { sayfaIzni } from "@/lib/yetki";
import { Deneme } from "./deneme";

export async function generateMetadata() {
  /**
   * ⚠ ADI `tBaslik` — `t` OLAMAZ. Gövdedeki `t` başka bir sözlüğe bağlanınca
   * `i18n:kontrol` anahtarı yanlış sözlükte arıyor ve "eksik" diyor.
   * Depodaki öteki sayfalar da `tBaslik` kullanıyor.
   */
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("simulasyon") };
}

/**
 * ============================================================================
 *  FİYAT DENEMESİ — "HANGİ PAZARYERİNDE SATSAM NE KALIR"
 * ----------------------------------------------------------------------------
 *  Kullanıcı isteği 21.08.2026: _"bulduğum 1 ürünü alım fiyatı, satış fiyatı,
 *  komisyon oranı girdiğimde hangi pazar yerinde satsam ne kadar kâr ederim"_.
 *
 *  ── YENİ İZİN AÇILMADI ──────────────────────────────────────────────────
 *  Ekran kâr gösteriyor; doğal kapısı `satis.kar.gor`. Yeni bir izin anahtarı
 *  iki bacaklı bir iştir (kod + canlı rol satırı) ve unutulan bacak ekranı
 *  SESSİZCE kaybeder. Var olan izin bu soruyu zaten cevaplıyor.
 *
 *  ── SUNUCUNUN TEK İŞİ: İZİN VE "BUGÜN" ──────────────────────────────────
 *  Hesap istemcide canlı koşuyor (bkz. `deneme.tsx`). Sunucudan yalnız iki
 *  şey iniyor: izin kapısı ve İŞ TAKVİMİ günü.
 *
 *  ⚠ "BUGÜN" TARAYICIDAN ALINMAZ. Anayasa: iş saat dilimi `Europe/Istanbul`
 *  ve `Intl...resolvedOptions().timeZone` YASAK. Kullanıcı Almanya'da,
 *  operasyon Türkiye'de; tarayıcının günü bir tarife penceresini yanlış
 *  tarafa düşürebilir.
 * ============================================================================
 */
export default async function SimulasyonSayfasi() {
  await sayfaIzni("satis.kar.gor");

  const t = await getTranslations("Simulasyon");

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("baslik")}</h1>
        <p className="text-muted-foreground text-sm">{t("aciklama")}</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Deneme bugun={gunDegeri(isTakvimGunu(new Date())).toISOString()} />
        </CardContent>
      </Card>

      <div className="text-muted-foreground space-y-1 text-xs">
        <p>{t("notSimulasyon")}</p>
        <p>{t("notTekAdet")}</p>
      </div>
    </div>
  );
}
