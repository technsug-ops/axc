import { getTranslations } from "next-intl/server";

import { UYGULAMA } from "@/lib/uygulama";
import { etiketSayilari, firmaOzetleri, gonderilemeyenEpostaSayisi, YAPILACAK_ETIKETLERI } from "@/lib/yonetim/durumlar";
import { yonetimSayfasi } from "@/lib/yonetim-oturumu";

import { YonetimMenusu, type Rozetler } from "./yonetim-menusu";

/**
 * YÖNETİM KABUĞU — referans iskelet BİREBİR (HA-Kompass admin; kullanıcı
 * 05.10.2026 verdi, 06–07.10.2026 uygulandı): `.yn-shell` = 232px menü +
 * içerik (`.yn-main`, en çok 1240px). Görsel dil `../yonetim.css`.
 * Firma menüsü YOK — yönetim katmanı firmaya bağlı değil. Kapı: proxy (jeton +
 * işaret) + burada süper admin işareti veritabanından; sayfalar da kendi
 * kapısını ayrıca çağırır.
 *
 * ROZETLER tek kaynaktan (`lib/yonetim/durumlar`): «Bugün»deki yapılacak
 * satırı sayısı · firma sayısı · ödemesi gecikmiş firma · son 30 gün
 * gönderilemeyen e-posta. Sayı = liste (İlke #16).
 */
export default async function YonetimKabugu({ children }: { children: React.ReactNode }) {
  const k = await yonetimSayfasi();
  const t = await getTranslations("Yonetim");
  const [ozetler, gonderilemeyen] = await Promise.all([firmaOzetleri(), gonderilemeyenEpostaSayisi()]);
  const sayilar = etiketSayilari(ozetler);
  const yapilacak = YAPILACAK_ETIKETLERI.filter((e) => (sayilar.get(e) ?? 0) > 0).length + (gonderilemeyen > 0 ? 1 : 0);
  const rozetler: Rozetler = {
    bugun: { sayi: yapilacak, sicak: true },
    firmalar: { sayi: ozetler.length, sicak: false },
    odemeler: { sayi: sayilar.get("ODEME_GECIKTI") ?? 0, sicak: true },
    eposta: { sayi: gonderilemeyen, sicak: true },
  };
  return (
    <div className="yn-shell">
      <YonetimMenusu rozetler={rozetler} eposta={k.email} marka={t("kabukBasligi", { uygulama: UYGULAMA.ad })} />
      <main className="yn-main">{children}</main>
    </div>
  );
}
