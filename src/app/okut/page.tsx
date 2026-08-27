import { getTranslations } from "next-intl/server";
import { ScanBarcode } from "lucide-react";

import { Okuyucu } from "@/app/okut/okuyucu";
import { SayimBolumu } from "@/app/okut/sayim-bolumu";
import { bicimlendirici } from "@/lib/bicim";
import {
  OKUMA_KOVALARI,
  kovaYuzdesi,
  toplamOkuma,
  type OkumaKovasi,
} from "@/lib/okuma/kova";
import { okumaRaporu } from "@/lib/okuma/rapor";
import { sayfaIzni } from "@/lib/yetki";

/**
 * ============================================================================
 *  DEPO OKUMASI (K34a) — ÖLÇÜM EKRANI
 * ----------------------------------------------------------------------------
 *  Bu ekranın ürünü bir KONTROL değil, bir KAPSAM ÖLÇÜMÜDÜR: kanaldan da
 *  sistemden de bağımsız üçüncü bir kayıt. (Aras'ın Trendyol sayacını
 *  doğrulaması gibi — bağımsızlık kaynağın ayrılığıyla ölçülür, yolun
 *  ayrılığıyla değil.)
 *
 *  ⚠ İZİN `stok.gor` — YENİ İZİN AÇILMADI. Ekran depo işidir ve mevcut izin
 *  onu birebir karşılıyor. Yeni bir anahtar açmak `izinler.ts` + seed
 *  `SONRADAN_DOGAN` + canlı senkron zinciri demekti; hiçbiri gerekmiyordu.
 * ============================================================================
 */
export default async function OkutSayfasi() {
  await sayfaIzni("stok.gor");

  const t = await getTranslations("Okuma");
  const bicim = await bicimlendirici();
  /**
   * ⚠ "ŞU AN" DIŞARIDAN VERİLİR. `okumaRaporu` içinde `new Date()` çağırmak,
   * raporu test edilemez yapardı; ayrıca ölçümün hangi ana ait olduğu
   * çağıran tarafta görünür kalır.
   */
  const rapor = await okumaRaporu(new Date());

  const kovaAdi: Record<OkumaKovasi, string> = {
    ACIK_SIPARISTE_VAR: t("kovaACIK_SIPARISTE_VAR"),
    ACIK_SIPARISTE_YOK: t("kovaACIK_SIPARISTE_YOK"),
    ESLESTIRILDI: t("kovaESLESTIRILDI"),
    BILINMEYEN: t("kovaBILINMEYEN"),
  };

  const genelToplam = toplamOkuma(rapor.toplam);

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-2">
        <ScanBarcode className="size-5 text-muted-foreground" aria-hidden />
        <h1 className="text-xl font-semibold">{t("baslik")}</h1>
      </header>

      <p className="max-w-3xl text-sm text-muted-foreground">
        {t("aciklama")}
      </p>

      <Okuyucu />

      {/* SAYIM KİPİ (K57) — aynı ekranın ikinci kipi, yeni adres YOK. */}
      <SayimBolumu />

      <section className="space-y-2">
        <h2 className="text-sm font-medium">{t("raporBaslik")}</h2>

        {genelToplam === 0 ? (
          <p className="text-sm text-muted-foreground">{t("raporBos")}</p>
        ) : (
          <>
            {/* ⚠ Geniş tablo KENDİ kabında yatay kayar; sayfa gövdesi kaymaz. */}
            <div className="max-w-3xl overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-1 pr-3 font-medium">{t("raporHafta")}</th>
                    {OKUMA_KOVALARI.map((kova) => (
                      <th key={kova} className="py-1 pr-3 text-right font-medium">
                        {kovaAdi[kova]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rapor.haftalar.map((hafta) => (
                    <tr key={hafta.anahtar} className="border-b last:border-0">
                      <td className="py-1 pr-3 whitespace-nowrap">
                        {bicim.tarih(hafta.baslangic)} –{" "}
                        {bicim.tarih(hafta.sonGun)}
                      </td>
                      {OKUMA_KOVALARI.map((kova) => {
                        const yuzde = kovaYuzdesi(hafta.sayim, kova);
                        return (
                          <td
                            key={kova}
                            className="py-1 pr-3 text-right tabular-nums"
                          >
                            {hafta.sayim[kova]}
                            {yuzde === null ? null : (
                              <span className="ml-1 text-xs text-muted-foreground">
                                %{yuzde.toFixed(0)}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
                {/*
                  İlke #15 — tek tek gösterilen yerde toplam da olur. Toplam
                  GÖSTERİLEN pencerenin toplamıdır (yukarıdaki haftalar),
                  "hepsinin toplamı" değil.
                */}
                <tfoot>
                  <tr className="border-t font-medium">
                    <td className="py-1 pr-3">{t("raporToplam")}</td>
                    {OKUMA_KOVALARI.map((kova) => (
                      <td
                        key={kova}
                        className="py-1 pr-3 text-right tabular-nums"
                      >
                        {rapor.toplam[kova]}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>

            {/*
              ⚠ PAYDA VE KAPSAM EKRANDA YAZAR. Bir oran, paydası yazılmadan
              kullanılamaz; ve "hüküm verilemedi" kovasının bir BULGU
              olmadığı burada söylenmezse, üç ay sonra bakan biri onu
              "katalogda olmayan ürünler" diye okur.
            */}
            <p className="max-w-3xl text-xs text-muted-foreground">
              {t("raporNot")}
            </p>

            {rapor.cozulemeyen > 0 ? (
              <p className="max-w-3xl text-xs text-muted-foreground">
                {t("raporCozulemeyen", { adet: rapor.cozulemeyen })}
              </p>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
