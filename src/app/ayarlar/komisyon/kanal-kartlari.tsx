"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { TriangleAlert, Upload } from "lucide-react";

import { Yukleyici as TarifeYukleyici } from "@/app/ayarlar/tarife/yukleyici";
import {
  Yukleyici as OranYukleyici,
  type HesapSecenegi,
} from "@/app/kanal-sku/komisyon-aktar/yukleyici";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TurDurumu, YuklemeTuru } from "@/lib/komisyon/kanal-yetenegi";
import { DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";

/**
 * ============================================================================
 *  KANAL KARTLARI (K226)
 * ----------------------------------------------------------------------------
 *  Bir kart = bir satış kanalı hesabı. Kart, o kanalın KABUL ETTİĞİ dosyaları
 *  adıyla yazar ve kutusunu kendi içinde açar.
 *
 *  ⚠ DESTEKLENMEYEN TÜR DE SATIR OLARAK DURUR, gizlenmez. "Baktım, bu kanalda
 *  yok" ile "böyle bir şey hiç yok" ekranda aynı görünemez — anayasadaki
 *  _"sıfır satır gizlenmez"_ kuralı. Ve satırın yanında NİYE olmadığı yazar;
 *  gerekçesiz bir "yok", okuyanı çıkmaza götürür.
 *
 *  ⚠ YÜKLEYİCİLER YENİDEN YAZILMADI, İÇERİ ALINDI. Önizleme/sonuç akışları
 *  aylardır canlıda çalışıyor; kart yalnız onlara SABİT HESAP veriyor. Kopya
 *  bir yükleyici yazılsaydı biri düzeltilip öteki unutulurdu.
 * ============================================================================
 */

export type KanalKarti = {
  hesapId: string;
  etiket: string;
  /** Kanal kodu komisyon platformlarından birine çözülebildi mi. */
  platformTanindi: boolean;
  turler: TurDurumu[];
  /** Son tarife penceresinin başlangıcı — biçimlenmiş; yoksa `null`. */
  sonTarifeYazisi: string | null;
};

export function KanalKartlari({
  kartlar,
  hesaplar,
}: {
  kartlar: KanalKarti[];
  hesaplar: HesapSecenegi[];
}) {
  const t = useTranslations("KomisyonKapisi");
  /** Açık olan kutu: `"<hesapId>:<tur>"`. Aynı anda tek kutu açık kalır. */
  const [acik, setAcik] = useState<string | null>(null);

  if (kartlar.length === 0) {
    return (
      <div className={`rounded-lg p-4 ${DURUM_KUTUSU.uyari}`}>
        <p className={`text-sm ${DURUM_YAZISI.uyari}`}>{t("hicSatisHesabi")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/*
        KAMPANYA UYARISI EN ÜSTTE, BİR KEZ. Kart başına tekrarlansaydı üç
        kanalda üç kez okunur ve okunmaz olurdu.
      */}
      <div className={`flex gap-3 rounded-lg p-4 ${DURUM_KUTUSU.uyari}`}>
        <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
        <p className={`text-sm ${DURUM_YAZISI.uyari}`}>{t("kampanyaUyarisi")}</p>
      </div>

      {kartlar.map((kart) => (
        <Card key={kart.hesapId}>
          <CardHeader>
            <CardTitle>{kart.etiket}</CardTitle>
            <p className="text-muted-foreground text-sm">
              {kart.sonTarifeYazisi
                ? t("sonYukleme", { tarih: kart.sonTarifeYazisi })
                : t("hicYuklenmemis")}
            </p>
          </CardHeader>

          <CardContent className="space-y-4">
            {!kart.platformTanindi ? (
              <p className={`text-sm ${DURUM_YAZISI.uyari}`}>
                {t("kanalTaninmadi")}
              </p>
            ) : null}

            {kart.turler.map((tur) => {
              const kimlik = `${kart.hesapId}:${tur.tur}`;
              const acikMi = acik === kimlik;

              return (
                <div
                  key={tur.tur}
                  className="border-border space-y-2 rounded-lg border p-3"
                >
                  <p className="text-sm font-medium">{basligi(tur.tur, t)}</p>
                  <p className="text-muted-foreground text-sm">
                    {aciklamasi(tur.tur, t)}
                  </p>

                  {tur.durum === "YOK" ? (
                    <p className={`text-sm ${DURUM_YAZISI.uyari}`}>
                      {t("yokOkuyucuYok")}
                    </p>
                  ) : (
                    <>
                      <p className="text-muted-foreground text-xs">
                        {t("kabulEdilenBicim")}
                      </p>
                      {/* Dokunma hedefi telefonda 44 px — İlke #8. */}
                      <Button
                        type="button"
                        variant={acikMi ? "outline" : "default"}
                        className="min-h-11"
                        onClick={() => setAcik(acikMi ? null : kimlik)}
                      >
                        <Upload />
                        {acikMi ? t("kapat") : t("dosyaYukle")}
                      </Button>

                      {acikMi ? (
                        <div className="pt-2">
                          {tur.tur === "DILIMLI_TARIFE" ? (
                            <TarifeYukleyici
                              hesaplar={hesaplar}
                              sabitHesap={{
                                id: kart.hesapId,
                                etiket: kart.etiket,
                              }}
                            />
                          ) : (
                            <OranYukleyici
                              hesaplar={hesaplar}
                              sabitHesap={{
                                id: kart.hesapId,
                                etiket: kart.etiket,
                              }}
                            />
                          )}
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * ⚠ `Record` DEĞİL, `switch`: `YuklemeTuru` birliğine üçüncü bir değer
 * eklenirse burası DERLENMEZ. Elle tutulan bir eşleme yarınki türü sessizce
 * etiketsiz bırakırdı.
 */
function basligi(tur: YuklemeTuru, t: (k: string) => string): string {
  switch (tur) {
    case "DILIMLI_TARIFE":
      return t("turDilimliTarife");
    case "GUNCEL_ORAN":
      return t("turGuncelOran");
  }
}

function aciklamasi(tur: YuklemeTuru, t: (k: string) => string): string {
  switch (tur) {
    case "DILIMLI_TARIFE":
      return t("turDilimliTarifeNe");
    case "GUNCEL_ORAN":
      return t("turGuncelOranNe");
  }
}
