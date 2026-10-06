import { getTranslations } from "next-intl/server";

import { CikisButonu } from "@/components/cikis-butonu";
import { UYGULAMA } from "@/lib/uygulama";
import { etiketSayilari, firmaOzetleri, gonderilemeyenEpostaSayisi, YAPILACAK_ETIKETLERI } from "@/lib/yonetim/durumlar";
import { yonetimSayfasi } from "@/lib/yonetim-oturumu";

import { yonetimCikisYap } from "../actions";
import { YonetimMenusu, type Rozetler } from "./yonetim-menusu";

/**
 * YÖNETİM KABUĞU — referans iskelet (HA-Kompass admin; kullanıcı 05.10.2026
 * verdi, 06.10.2026 uygulandı). Solda gruplu + rozetli menü, sağda sayfa.
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
    <div className="min-h-svh md:grid md:grid-cols-[232px_minmax(0,1fr)]">
      <YonetimMenusu
        rozetler={rozetler}
        eposta={k.email}
        marka={t("kabukBasligi", { uygulama: UYGULAMA.ad })}
        cikis={<CikisButonu eposta={k.email} eylem={yonetimCikisYap} />}
      />
      <main className="w-full max-w-[1240px] min-w-0 px-4 pt-5 pb-16 md:px-8 md:pt-7">{children}</main>
    </div>
  );
}
