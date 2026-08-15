"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { CheckCircle2, X } from "lucide-react";

import {
  BASARI_PARAMETRESI,
  basariKoduMu,
  type BasariKodu,
} from "@/lib/bildirim";
import { DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";

/**
 * ============================================================================
 *  YEŞİL BAŞARI BİLDİRİMİ
 * ----------------------------------------------------------------------------
 *  `HataOzeti`nin ikizi (Kullanıcı Kolaylığı #5 ve #10). Tek bir yerde,
 *  ana yerleşimde duruyor — her ekranda AYNI yerde, AYNI görünümde çıksın
 *  diye. Sayfa sayfa eklenseydi biri unutulur ve o ekranda kayıt sessizce
 *  yapılmış olurdu.
 *
 *  DAVRANIŞ:
 *   - Kod adresten okunur, metin sözlükten çözülür.
 *   - Gösterildikten sonra parametre adresten SİLİNİR (`replace`, geçmişe
 *     yeni kayıt eklemez). Yenilemede mesaj tekrar çıkmaz.
 *   - Kendiliğinden kapanır, elle de kapatılabilir.
 *   - `role="status"`: ekran okuyucu işi bölmeden, sırası gelince duyurur.
 *     Hata `role="alert"` ile hemen kesiyordu; başarı acil değildir.
 * ============================================================================
 */

/** Kaç milisaniye sonra kendiliğinden kapanır. */
const KAPANMA_MS = 6000;

export function BasariBildirimi() {
  const t = useTranslations("Bildirim");
  const ortak = useTranslations("Ortak");
  const parametreler = useSearchParams();
  const router = useRouter();
  const yol = usePathname();

  /**
   * `kaynak` en son GÖSTERİLEN kodu tutar. Kapanınca null'a döner ki aynı
   * işlem art arda yapıldığında (iki ürün üst üste eklemek) mesaj yeniden
   * çıksın — yoksa ikinci kayıt sessizce yapılmış görünürdü.
   */
  const [durum, setDurum] = useState<{
    kaynak: string | null;
    kod: BasariKodu | null;
  }>({ kaynak: null, kod: null });

  const gelen = parametreler.get(BASARI_PARAMETRESI);

  // Adres değiştiğinde state'i render sırasında düzeltiyoruz (React'in
  // "prop değişince state'i ayarla" deseni). Effect içinde yapılsaydı bir
  // kare boyunca eski mesaj görünürdü.
  if (basariKoduMu(gelen) && gelen !== durum.kaynak) {
    setDurum({ kaynak: gelen, kod: gelen });
  }

  const kapat = () => setDurum({ kaynak: null, kod: null });

  useEffect(() => {
    if (!basariKoduMu(gelen)) return;

    // Adresi temizle: mesaj bir kez gösterilir, yenilemede tekrarlamaz.
    // `replace` kullanılıyor — geri tuşuna basınca mesajlı adrese dönülmesin.
    const kalan = new URLSearchParams(parametreler.toString());
    kalan.delete(BASARI_PARAMETRESI);
    const sorgu = kalan.toString();
    router.replace(sorgu ? `${yol}?${sorgu}` : yol, { scroll: false });
  }, [gelen, parametreler, router, yol]);

  useEffect(() => {
    if (durum.kod === null) return;
    const zamanlayici = setTimeout(
      () => setDurum({ kaynak: null, kod: null }),
      KAPANMA_MS,
    );
    return () => clearTimeout(zamanlayici);
  }, [durum.kod]);

  const kod = durum.kod;
  if (kod === null) return null;

  /**
   * Koddan metne SABİT eşleme.
   * Anahtar değişkenle birleştirilseydi i18n denetimi bu çağrıları göremez,
   * eksik anahtar sessizce canlıya giderdi.
   */
  const metin =
    kod === "eklendi"
      ? t("eklendi")
      : kod === "guncellendi"
        ? t("guncellendi")
        : kod === "silindi"
          ? t("silindi")
          : kod === "malKabul"
            ? t("malKabul")
            : t("iadeAlindi");

  return (
    <div
      role="status"
      className={`mb-4 flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium ${DURUM_KUTUSU.olumlu}`}
    >
      <CheckCircle2 className="size-5 shrink-0" />
      <span className="flex-1">{metin}</span>
      <button
        type="button"
        onClick={kapat}
        aria-label={ortak("kapat")}
        className={`grid size-11 shrink-0 place-items-center rounded-md transition-colors hover: md:size-8 ${DURUM_YAZISI.olumlu}`}
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
