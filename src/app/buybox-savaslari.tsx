import { getTranslations } from "next-intl/server";
import { Swords } from "lucide-react";

import { Baglanti } from "@/components/baglanti";
import { bicimlendirici } from "@/lib/bicim";
import { BUYBOX_YOLU, buyboxAdresi, type BuyboxKanali, type BuyboxListesi } from "@/lib/buybox";
import { panelBuyboxOzeti } from "@/lib/buybox-istatistik-verisi";
import { otomatikGonderimSayilari } from "@/lib/buybox-otomatik-verisi";
import { gunBasiAni, isTakvimGunu } from "@/lib/donem";

/**
 * ============================================================================
 *  PANEL — «BUYBOX SAVAŞLARI» (kullanıcı isteği 28.10.2026: «buybox
 *  savaşlarını buraya koy», huni satırının sağındaki boşluk)
 * ----------------------------------------------------------------------------
 *  Kanal başına RAKAM, döküm yok (İlke #13): Buybox bizde / incelenen ·
 *  kaybedilen · görünmüyor · bugün alınan / kaybedilen · bugün kanala giden
 *  otomatik fiyat. Döküm Buybox ekranında kalır; her rakam oraya, ilgili
 *  sekmeye götürür (İlke #16 — adres `buyboxAdresi`ten). Bugün sayılarının
 *  açılacak süzülmüş bir listesi YOK; onlar bağlantı değil, düz rakamdır.
 *  ⚠ Kaynak SAATLİK ölçüm, kanala soru sorulmaz (panel yavaşlamasın). Ölçüm
 *  saati kutuda yazar; açılan liste canlıdır ve en çok bir saat farklı olabilir.
 *  ⚠ Panelin tarih süzgecinden bağımsızdır ve bunu kutu kendisi söyler.
 *  ⚠ Sıfır satır gizlenmez, `0` yazar; sıfır bağlantı olmaz (açılacak liste yok).
 * ============================================================================
 */

const CIP =
  "inline-flex min-h-11 items-center gap-1 rounded-md border px-2 no-underline md:min-h-7 max-sm:bg-card max-sm:min-h-[58px] max-sm:flex-col max-sm:items-start max-sm:justify-between max-sm:rounded-xl max-sm:p-2 max-sm:leading-tight";
const DUZ_CIP = CIP.replace("no-underline ", "");

export async function BuyboxSavaslari() {
  const t = await getTranslations("Panel");
  const bicim = await bicimlendirici();
  const simdi = new Date();
  const bugunBasi = gunBasiAni(isTakvimGunu(simdi));
  const [kanallar, otomatik] = await Promise.all([panelBuyboxOzeti(bugunBasi), otomatikGonderimSayilari(bugunBasi)]);
  const sonOlcum = kanallar.reduce<Date | null>((en, k) => (k.son && (en === null || k.son.olculduAt > en) ? k.son.olculduAt : en), null);

  /** Sıfırsa düz rakam, değilse ilgili sekmeye bağlantı. */
  const cip = (kanal: BuyboxKanali, etiket: string, deger: string, sayi: number, liste: BuyboxListesi | null) => {
    const ic = (
      <>
        {etiket}
        <span className="text-foreground font-semibold tabular-nums max-sm:text-base">{deger}</span>
      </>
    );
    return liste !== null && sayi > 0 ? (
      <Baglanti key={etiket} href={buyboxAdresi(kanal, liste)} className={CIP}>
        {ic}
      </Baglanti>
    ) : (
      <span key={etiket} className={DUZ_CIP}>
        {ic}
      </span>
    );
  };

  return (
    <section aria-labelledby="buybox-savaslari-baslik" className="bg-card min-w-0 rounded-xl border p-3 text-xs md:max-w-md">
      <h3 id="buybox-savaslari-baslik" className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
        <Swords className="size-4" aria-hidden />
        <Baglanti href={BUYBOX_YOLU}>{t("buyboxBaslik")}</Baglanti>
      </h3>
      <div className="flex flex-col gap-2">
        {kanallar.map((k) => (
          <div key={k.kanal} className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 max-sm:grid max-sm:grid-cols-3 max-sm:items-stretch max-sm:gap-2">
            <span className="text-foreground w-24 font-medium max-sm:col-span-3 max-sm:w-auto">{t(`buyboxKanal_${k.kanal}`)}</span>
            {k.son === null ? (
              <span className="max-sm:col-span-3">{t("buyboxOlculmedi")}</span>
            ) : (
              <>
                {cip(k.kanal, t("buyboxBizde"), t("buyboxBizdeDeger", { birinci: k.son.birinci, incelenen: k.son.incelenen }), k.son.birinci, "birinci")}
                {cip(k.kanal, t("buyboxKaybedilen"), String(k.son.kaybedilen), k.son.kaybedilen, "kaybedilen")}
                {cip(k.kanal, t("buyboxGorunmuyor"), String(k.son.gorunmuyor), k.son.gorunmuyor, "gorunmuyor")}
              </>
            )}
            {cip(k.kanal, t("buyboxBugunAlinan"), `+${k.alinan}`, k.alinan, null)}
            {cip(k.kanal, t("buyboxBugunKaybedilen"), `−${k.kaybedilen}`, k.kaybedilen, null)}
            {cip(k.kanal, t("buyboxOtomatik"), String(otomatik[k.kanal]), otomatik[k.kanal], null)}
          </div>
        ))}
      </div>
      <p className="text-muted-foreground mt-2">
        {sonOlcum ? <span className="block">{t("buyboxSonOlcum", { an: bicim.tarihSaat(sonOlcum) })}</span> : null}
        <span className="block">{t("buyboxDonemNotu")}</span>
      </p>
    </section>
  );
}
