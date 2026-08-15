import { getTranslations } from "next-intl/server";

import { KarSorunuCozumu } from "@/components/kar-sorunu";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { bicimlendirici } from "@/lib/bicim";

import type { Currency, ProfitStatus } from "@/generated/prisma/enums";
import { DURUM_KUTUSU } from "@/lib/renkler";

/**
 * ============================================================================
 *  KÂR BLOĞU — SATIŞ DETAYI
 * ----------------------------------------------------------------------------
 *  İKİ SEVİYE AYRI GÖSTERİLİR (kullanıcı kararı 09.08.2026):
 *    · Kalem kârları      — komisyon, maliyet, stopaj kalem başına
 *    · Sipariş kesintileri — hizmet bedeli, sabit gider, kargo; BÖLÜNMEZ
 *    · Satış kârı         — ikisinin sonucu
 *
 *  Hesaplanamayan kâr SIFIR GÖSTERİLMEZ; nedeni yazılır.
 * ============================================================================
 */

export type KarKalemi = {
  id: string;
  baslik: string;
  net1: number | null;
  net2: number | null;
  durum: ProfitStatus | null;
  vatRate: number | null;
  kesintiler: { code: string; tutar: number }[];
};

export type KarBloguVerisi = {
  durum: ProfitStatus | null;
  paraBirimi: Currency;
  net1: number | null;
  net2: number | null;
  kalemler: KarKalemi[];
  siparisKesintileri: { code: string; tutar: number }[];
  /** Kalemlerden biri varsayılan %20'ye düştüyse uyarı gösterilir. */
  varsayilanKdvKullanildi: boolean;
  /** Kargo hiç girilmemişse kâr, kargo gideri düşülmeden hesaplanmıştır. */
  kargoGirilmedi: boolean;
};

export async function KarBlogu({ veri }: { veri: KarBloguVerisi }) {
  const t = await getTranslations("Satis");
  const tKesinti = await getTranslations("Kesinti");
  const bicim = await bicimlendirici();

  const para = (n: number) => bicim.para(n, veri.paraBirimi);

  /** Kesinti kodu -> Türkçe ad. Bilinmeyen kod ham haliyle gösterilir. */
  function kesintiAdi(code: string): string {
    const bilinen = [
      "MALIYET",
      "KOMISYON",
      "KOMISYON_KDV",
      "ODEME_GIDERI",
      "HIZMET_BEDELI",
      "SABIT_GIDER",
      "KARGO",
      "STOPAJ",
    ];
    return bilinen.includes(code) ? tKesinti(code) : code;
  }

  const hesaplanamadi = veri.durum !== null && veri.durum !== "CALCULATED";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("karBasligi")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {hesaplanamadi ? (
          <div
            role="status"
            className={`rounded-md p-4 text-sm ${DURUM_KUTUSU.uyari}`}
          >
            <p className="font-medium">{t("karHesaplanamadi")}</p>
            <p className="mt-1">
              {veri.durum === "NO_COST"
                ? t("durumNoCost")
                : veri.durum === "CURRENCY_MISMATCH"
                  ? t("durumCurrencyMismatch")
                  : t("durumRuleMissing")}
            </p>

            {/* Raporla AYNI yol haritası — tıklayıp gelinen yer burası. */}
            <div className="mt-3">
              <KarSorunuCozumu durum={veri.durum!} />
            </div>
          </div>
        ) : null}

        {/* Kargo eksikse kâr olduğundan YÜKSEK görünür — sessiz kalmaz. */}
        {veri.kargoGirilmedi ? (
          <div
            role="status"
            className={`rounded-md p-3 text-sm ${DURUM_KUTUSU.uyari}`}
          >
            <p className="font-medium">{t("kargoGirilmedi")}</p>
            <p className="mt-1">{t("kargoGirilmediNotu")}</p>
          </div>
        ) : null}

        {veri.varsayilanKdvKullanildi ? (
          <p
            role="status"
            className={`rounded-md p-3 text-sm ${DURUM_KUTUSU.uyari}`}
          >
            {t("varsayilanKdvNotu")}
          </p>
        ) : null}

        {/* ---------------------- KALEM KÂRLARI ---------------------- */}
        <div className="space-y-3">
          <div className="text-sm font-medium">{t("kalemKarBasligi")}</div>
          {veri.kalemler.map((kalem) => (
            <div key={kalem.id} className="rounded-lg border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium">{kalem.baslik}</span>
                {kalem.vatRate !== null ? (
                  <Badge variant="outline">
                    {t("kdvOraniKisa", { oran: kalem.vatRate })}
                  </Badge>
                ) : null}
              </div>

              <dl className="mt-2 space-y-1 text-sm">
                {kalem.kesintiler.map((k, i) => (
                  <div key={i} className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">
                      {kesintiAdi(k.code)}
                    </dt>
                    <dd className="text-destructive whitespace-nowrap">
                      −{para(k.tutar)}
                    </dd>
                  </div>
                ))}
                <div className="flex justify-between gap-4 border-t pt-1 font-medium">
                  <dt>{t("net1Etiketi")}</dt>
                  <dd className="whitespace-nowrap">
                    {kalem.net1 === null ? "—" : para(kalem.net1)}
                  </dd>
                </div>
              </dl>
            </div>
          ))}
        </div>

        {/* ------------------ SİPARİŞ KESİNTİLERİ ------------------- */}
        {veri.siparisKesintileri.length ? (
          <div className="space-y-2">
            <div className="text-sm font-medium">
              {t("siparisKesintileriBasligi")}
            </div>
            <dl className="rounded-lg border p-3 text-sm">
              {veri.siparisKesintileri.map((k, i) => (
                <div key={i} className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">
                    {kesintiAdi(k.code)}
                  </dt>
                  <dd className="text-destructive whitespace-nowrap">
                    −{para(k.tutar)}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="text-muted-foreground text-xs">
              {t("siparisKesintileriNotu")}
            </p>
          </div>
        ) : null}

        {/* ---------------------- SATIŞ KÂRI ------------------------ */}
        <div className="space-y-2 rounded-lg border p-4">
          <div className="text-sm font-medium">{t("satisKariBasligi")}</div>
          <div className="flex flex-wrap gap-6">
            <div>
              <div className="text-muted-foreground text-xs">
                {t("net1Etiketi")}
              </div>
              <div className="text-xl font-semibold">
                {veri.net1 === null ? "—" : para(veri.net1)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">
                {t("net2Etiketi")}
              </div>
              <div className="text-2xl font-semibold">
                {veri.net2 === null ? "—" : para(veri.net2)}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
