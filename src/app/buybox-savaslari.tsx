import type { ReactNode } from "react";
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
/**
 * ⛔ TABLO ÇEVRİLDİ — GEREKÇESİ YUKARIDA DURUYOR (kullanıcı 28.10.2026, canlı ekran:
 * «bu ikisine biraz daha çalışabilirsin»). Üç eşit kutuda tablo kutunun üst üçte birini
 * dolduruyor, altı BOŞ kalıyordu; rakamlar sıkışık, sütun gizleme hileleri (kısa kanal adı,
 * gizli «Görünmüyor») gerekiyordu. Yeni hâl Huni ile AYNI dil (İlke #10): kanal başına bir
 * kart, kartta üç tıklanır kutucuk (Bizde · Kaybedilen · Görünmüyor), «Bugün» ve
 * «Otomatik» kartın başlık satırında düz rakam. İki kanal yine ALT ALTA, aynı sütunlarda —
 * karşılaştırma korunur. Kartlar kutunun boyunu doldurur (`flex-1`).
 */
const SAYI = "tabular-nums font-bold text-foreground";
/** Kutucuk: etiket üstte küçük, rakam altta büyük. Telefonda 44 px+ (İlke #8). */
const KUTUCUK = "flex min-h-14 min-w-0 flex-col justify-between gap-1 rounded-lg border p-2 leading-tight";
const KUTUCUK_BAGI = `${KUTUCUK} bg-background text-foreground no-underline transition-colors hover:bg-muted/50`;

export async function BuyboxSavaslari() {
  const t = await getTranslations("Panel");
  const bicim = await bicimlendirici();
  const simdi = new Date();
  const bugunBasi = gunBasiAni(isTakvimGunu(simdi));
  const [kanallar, otomatik] = await Promise.all([panelBuyboxOzeti(bugunBasi), otomatikGonderimSayilari(bugunBasi)]);
  const sonOlcum = kanallar.reduce<Date | null>((en, k) => (k.son && (en === null || k.son.olculduAt > en) ? k.son.olculduAt : en), null);

  /** Sıfırsa düz kutucuk, değilse ilgili sekmeye giden kutucuk. */
  const rakam = (kanal: BuyboxKanali, etiket: string, deger: ReactNode, sayi: number, liste: BuyboxListesi) => {
    const icerik = (
      <>
        <span className="text-muted-foreground truncate text-[11px]">{etiket}</span>
        <span className={`${SAYI} text-base`}>{deger}</span>
      </>
    );
    return sayi > 0 ? (
      <Link href={buyboxAdresi(kanal, liste)} className={KUTUCUK_BAGI}>
        {icerik}
      </Link>
    ) : (
      <span className={`${KUTUCUK} bg-muted/40`}>{icerik}</span>
    );
  };

  return (
    <section aria-labelledby="buybox-savaslari-baslik" className="bg-card flex min-w-0 flex-col rounded-xl border p-3 text-xs">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3">
        <h3 id="buybox-savaslari-baslik" className="flex items-center gap-1.5 text-sm font-semibold">
          <Swords className="size-4" aria-hidden />
          <Baglanti href={BUYBOX_YOLU}>{t("buyboxBaslik")}</Baglanti>
        </h3>
        {sonOlcum ? <span className="text-muted-foreground">{t("buyboxSonOlcum", { an: bicim.tarihSaat(sonOlcum) })}</span> : null}
      </div>
      <div className="mb-2 flex flex-1 flex-col gap-2">
        {kanallar.map((k) => (
          <div key={k.kanal} className="flex flex-1 flex-col gap-1.5 rounded-lg border p-2">
            <div className="flex flex-wrap items-baseline justify-between gap-x-2">
              <span className="text-foreground text-[13px] font-semibold">{t(`buyboxKanal_${k.kanal}`)}</span>
              <span className="text-muted-foreground tabular-nums whitespace-nowrap">
                <span title={t("buyboxBugunIpucu")}>
                  {t("buyboxBugun")}{" "}
                  <span className={`font-semibold ${DURUM_YAZISI.olumlu}`}>+{k.alinan}</span>
                  {" / "}
                  <span className={`font-semibold ${DURUM_YAZISI.olumsuz}`}>−{k.kaybedilen}</span>
                </span>
                {" · "}
                <span title={t("buyboxOtomatikIpucu")}>
                  {t("buyboxOtomatik")} <span className="text-foreground font-semibold">{otomatik[k.kanal]}</span>
                </span>
              </span>
            </div>
            {k.son === null ? (
              <p className="text-muted-foreground">{t("buyboxOlculmedi")}</p>
            ) : (
              <div className="grid flex-1 auto-rows-fr grid-cols-3 gap-1.5">
                {rakam(
                  k.kanal,
                  t("buyboxBizde"),
                  <>
                    {k.son.birinci}{" "}
                    <span className="text-muted-foreground text-xs font-normal">{t("buyboxBizdeAlt", { incelenen: k.son.incelenen })}</span>
                  </>,
                  k.son.birinci,
                  "birinci",
                )}
                {rakam(k.kanal, t("buyboxKaybedilen"), k.son.kaybedilen, k.son.kaybedilen, "kaybedilen")}
                {rakam(k.kanal, t("buyboxGorunmuyor"), k.son.gorunmuyor, k.son.gorunmuyor, "gorunmuyor")}
              </div>
            )}
          </div>
        ))}
      </div>
      {/* Not kutunun DİBİNDE (`mt-auto`): üç kutu eşit boy, notlar aynı hizada. */}
      <p className="text-muted-foreground mt-auto border-t pt-2 text-[11px] leading-snug">{t("buyboxDonemNotu")}</p>
    </section>
  );
}
