import { getTranslations } from "next-intl/server";
import { Swords } from "lucide-react";
import Link from "@/components/niyetli-baglanti";

import { Baglanti } from "@/components/baglanti";
import { bicimlendirici } from "@/lib/bicim";
import { BUYBOX_YOLU, buyboxAdresi, type BuyboxKanali, type BuyboxListesi } from "@/lib/buybox";
import { panelBuyboxOzeti } from "@/lib/buybox-istatistik-verisi";
import { otomatikGonderimSayilari } from "@/lib/buybox-otomatik-verisi";
import { gunBasiAni, isTakvimGunu } from "@/lib/donem";
import { DURUM_YAZISI } from "@/lib/renkler";

/**
 * ============================================================================
 *  PANEL — «BUYBOX SAVAŞLARI» (kullanıcı isteği 28.10.2026: «buybox
 *  savaşlarını buraya koy», huni satırının sağındaki boşluk)
 * ----------------------------------------------------------------------------
 *  KOMPAKT TABLO (kullanıcı 28.10.2026: ilk çip düzeni «sınıfta kaldı» —
 *  çipler satır satır kırılıyor, iki kanal karşılaştırılamıyordu): satırda
 *  kanal, sütunda ölçü. İki kanal ALT ALTA, aynı sütunda — İlke #12.
 *  Rakam, döküm yok (İlke #13). Her rakam Buybox ekranının ilgili sekmesine
 *  gider (İlke #16 — adres `buyboxAdresi`ten). «Bugün» ve «Otomatik» rakamlarının
 *  açılacak süzülmüş listesi YOK; onlar bağlantı değil, düz rakamdır.
 *  ⚠ Kaynak SAATLİK ölçüm, kanala soru sorulmaz (panel yavaşlamasın). Ölçüm
 *  saati başlıkta yazar; açılan liste canlıdır ve en çok bir saat farklı olabilir.
 *  ⚠ Panelin tarih süzgecinden bağımsızdır ve bunu kutu kendisi söyler.
 *  ⚠ 28.10.2026: panelde ÜÇ EŞİT KUTUDAN biri — lg..2xl aralığında kutu telefon kadar dar
 *  (ölçüldü: 1200 px ekranda «Bugün» kesiliyor, «Otomatik» kutu dışına taşıyordu). O aralıkta da
 *  kısa kanal adı (TY/HB) ve «Görünmüyor» gizli; 2xl ve üstünde ve sm–lg arasında (tam genişlik) tam hâl.
 *  ⚠ «Görünmüyor» sütunu TELEFONDA gizli: 360 px'e altı sütun sığmıyor (ölçüldü,
 *  338 px tablo / 302 px kutu); en az karar taşıyan sütun o. Masaüstünde ve
 *  Buybox ekranında durur.
 *  ⚠ Sıfır gizlenmez, `0` yazar; sıfır bağlantı olmaz (açılacak liste yok).
 * ============================================================================
 */

const SAYI = "tabular-nums font-semibold text-foreground";
/**
 * Telefonda 44 px dokunma alanı (İlke #8), masaüstünde ince.
 * 28.10.2026 (kullanıcı: «daha kaliteli bir buton sistemi»): altı çizili yazı yerine
 * küçük DÜĞME — çerçeveli, üstüne gelince zemin değişir; panelin öteki iki kutusundaki
 * tıklanır kutucuklarla aynı dil (İlke #10). Sıfır düğme olmaz (İlke #2).
 */
const SAYI_BAGI = `${SAYI} inline-flex min-h-11 items-center justify-end rounded-md border bg-background px-1.5 no-underline transition-colors hover:bg-muted md:min-h-7`;

export async function BuyboxSavaslari() {
  const t = await getTranslations("Panel");
  const bicim = await bicimlendirici();
  const simdi = new Date();
  const bugunBasi = gunBasiAni(isTakvimGunu(simdi));
  const [kanallar, otomatik] = await Promise.all([panelBuyboxOzeti(bugunBasi), otomatikGonderimSayilari(bugunBasi)]);
  const sonOlcum = kanallar.reduce<Date | null>((en, k) => (k.son && (en === null || k.son.olculduAt > en) ? k.son.olculduAt : en), null);

  /** Sıfırsa düz rakam, değilse ilgili sekmeye bağlantı. */
  const rakam = (kanal: BuyboxKanali, metin: string, sayi: number, liste: BuyboxListesi) => {
    return sayi > 0 ? (
      <Link href={buyboxAdresi(kanal, liste)} className={SAYI_BAGI}>
        {metin}
      </Link>
    ) : (
      <span className={SAYI}>{metin}</span>
    );
  };
  /** Telefonda dar dolgu; 360 px'e sığmazsa tablo kutunun İÇİNDE kayar, sayfa kaymaz. */
  const hucre = "whitespace-nowrap px-1 py-1.5 text-right align-middle sm:px-2 lg:max-2xl:px-1";

  return (
    <section aria-labelledby="buybox-savaslari-baslik" className="bg-card flex min-w-0 flex-col rounded-xl border p-3 text-xs">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3">
        <h3 id="buybox-savaslari-baslik" className="flex items-center gap-1.5 text-sm font-semibold">
          <Swords className="size-4" aria-hidden />
          <Baglanti href={BUYBOX_YOLU}>{t("buyboxBaslik")}</Baglanti>
        </h3>
        {sonOlcum ? <span className="text-muted-foreground">{t("buyboxSonOlcum", { an: bicim.tarihSaat(sonOlcum) })}</span> : null}
      </div>
      <div className="mb-2 overflow-x-auto">
      <table className="w-full border-collapse">
        <thead className="text-muted-foreground">
          <tr className="border-b">
            <th scope="col" className="py-1 pr-2 text-left font-normal">
              <span className="sr-only">{t("buyboxKanalBasligi")}</span>
            </th>
            <th scope="col" className={`${hucre} font-normal`}>{t("buyboxBizde")}</th>
            <th scope="col" className={`${hucre} font-normal`}>{t("buyboxKaybedilen")}</th>
            <th scope="col" className={`${hucre} font-normal max-sm:hidden lg:max-2xl:hidden`}>{t("buyboxGorunmuyor")}</th>
            <th scope="col" className={`${hucre} font-normal`} title={t("buyboxBugunIpucu")}>{t("buyboxBugun")}</th>
            <th scope="col" className={`${hucre} font-normal`} title={t("buyboxOtomatikIpucu")}>{t("buyboxOtomatik")}</th>
          </tr>
        </thead>
        <tbody>
          {kanallar.map((k) => (
            <tr key={k.kanal} className="border-b last:border-b-0">
              <th scope="row" className="py-1 pr-2 text-left font-medium">
                <span className="max-sm:hidden lg:max-2xl:hidden">{t(`buyboxKanal_${k.kanal}`)}</span>
                <span className="hidden max-sm:inline lg:max-2xl:inline">{t(`buyboxKanalKisa_${k.kanal}`)}</span>
              </th>
              {k.son === null ? (
                <td colSpan={3} className="text-muted-foreground px-2 py-1">{t("buyboxOlculmedi")}</td>
              ) : (
                <>
                  <td className={hucre}>{rakam(k.kanal, t("buyboxBizdeDeger", { birinci: k.son.birinci, incelenen: k.son.incelenen }), k.son.birinci, "birinci")}</td>
                  <td className={hucre}>{rakam(k.kanal, String(k.son.kaybedilen), k.son.kaybedilen, "kaybedilen")}</td>
                  <td className={`${hucre} max-sm:hidden lg:max-2xl:hidden`}>{rakam(k.kanal, String(k.son.gorunmuyor), k.son.gorunmuyor, "gorunmuyor")}</td>
                </>
              )}
              <td className={`${hucre} tabular-nums whitespace-nowrap`}>
                <span className={DURUM_YAZISI.olumlu}>+{k.alinan}</span>
                <span className="text-muted-foreground"> / </span>
                <span className={DURUM_YAZISI.olumsuz}>−{k.kaybedilen}</span>
              </td>
              <td className={`${hucre} ${SAYI}`}>{otomatik[k.kanal]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      {/* `w-0 min-w-full`: not kutunun genişliğini BELİRLEMEZ, tablonun genişliğinde kırılır. */}
      {/* Not kutunun DİBİNDE (`mt-auto`): üç kutu eşit boy, notlar aynı hizada. */}
      <p className="text-muted-foreground mt-auto w-0 min-w-full border-t pt-2 text-[11px] leading-snug">{t("buyboxDonemNotu")}</p>
    </section>
  );
}
