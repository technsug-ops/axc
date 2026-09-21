"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { TriangleAlert, Upload } from "lucide-react";

import { Yukleyici as HbPdfYukleyici } from "@/app/ayarlar/hb-kargo-tarife/yukleyici";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";

/**
 * ============================================================================
 *  KARGO TARİFESİ — KANAL KARTLARI (K229)
 * ----------------------------------------------------------------------------
 *  Bir kart = bir kanal. Kart üç şeyi söyler ve üçü de ÖLÇÜLMÜŞ bilgidir:
 *  kaç satır tarife var · en son hangi tarihten geçerli · kaç gün geçmiş.
 *
 *  ⚠ TARİFESİ OLMAYAN KANAL DA KART OLUR, gizlenmez. "Baktım, yok" ile
 *  "böyle bir kanal hiç yok" ekranda aynı görünemez — ve kargo tarifesi
 *  olmayan bir kanalda kâr hesabı kargoyu BİLEMEZ; bu susulacak bir şey
 *  değildir.
 *
 *  ⚠ OKUYUCUSU OLMAYAN KANALDA YÜKLEME KUTUSU ÇİZİLMEZ ve niye çizilmediği
 *  yazar. Kutu konsaydı ekran tutamayacağı bir söz verirdi.
 * ============================================================================
 */

export type KargoKarti = {
  kanalId: string;
  kanalKodu: string;
  kanalAdi: string;
  okuyucuVar: boolean;
  satirSayisi: number;
  tasiyiciSayisi: number;
  sonTarifeYazisi: string | null;
  gecenGun: number | null;
};

export function KanalKartlari({ kartlar }: { kartlar: KargoKarti[] }) {
  const t = useTranslations("KargoTarifesi");
  const [acik, setAcik] = useState<string | null>(null);

  const tarifesiz = kartlar.filter((k) => k.satirSayisi === 0).length;

  return (
    <div className="space-y-4">
      {/*
        ÜSTTE TEK CÜMLELİK HÜKÜM: kaç kanalda kargo tarifesi HİÇ yok.
        Sıfırsa da yazılır — "baktım, hepsinde var" ile "bu satır yok"
        aynı görünmesin (anayasa: sıfır satır gizlenmez).
      */}
      <div
        className={`flex gap-3 rounded-lg p-4 ${
          tarifesiz > 0 ? DURUM_KUTUSU.uyari : DURUM_KUTUSU.bilgi
        }`}
      >
        <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
        <p
          className={`text-sm ${
            tarifesiz > 0 ? DURUM_YAZISI.uyari : DURUM_YAZISI.bilgi
          }`}
        >
          {t("tarifesizOzet", { adet: tarifesiz })}
        </p>
      </div>

      {kartlar.map((kart) => {
        const acikMi = acik === kart.kanalId;
        return (
          <Card key={kart.kanalId}>
            <CardHeader>
              <CardTitle>{kart.kanalAdi}</CardTitle>
              <p className="text-muted-foreground text-sm">
                {kart.satirSayisi === 0
                  ? t("tarifeYok")
                  : t("ozet", {
                      satir: kart.satirSayisi,
                      tasiyici: kart.tasiyiciSayisi,
                      tarih: kart.sonTarifeYazisi ?? "—",
                    })}
              </p>
              {/*
                ⚠ GÜN SAYISI BİR HÜKÜM DEĞİL, BİR ÖLÇÜDÜR. Ekran "bayat"
                demiyor — kaç gün geçtiğini yazıyor. Eşiğin niye konmadığı
                `lib/kargo/kanal-yetenegi.ts`te gerekçesiyle duruyor.
              */}
              {kart.gecenGun !== null ? (
                <p className="text-muted-foreground text-sm">
                  {t("gecenGun", { gun: kart.gecenGun })}
                </p>
              ) : null}
            </CardHeader>

            <CardContent className="space-y-3">
              {kart.okuyucuVar ? (
                <>
                  <p className="text-muted-foreground text-sm">
                    {t("okuyucuVar")}
                  </p>
                  {/* Dokunma hedefi telefonda 44 px — İlke #8. */}
                  <Button
                    type="button"
                    variant={acikMi ? "outline" : "default"}
                    className="min-h-11"
                    onClick={() => setAcik(acikMi ? null : kart.kanalId)}
                  >
                    <Upload />
                    {acikMi ? t("kapat") : t("dosyaYukle")}
                  </Button>
                  {acikMi ? (
                    <div className="pt-2">
                      {/*
                        ⚠ MEVCUT YÜKLEYİCİ İÇERİ ALINDI, KOPYALANMADI. HB'nin
                        PDF akışı (önizleme · fark ölçümü · üzerine yazma
                        onayı) aylardır canlıda; ikinci bir kopya yazılsaydı
                        biri düzeltilip öteki unutulurdu.
                      */}
                      <HbPdfYukleyici />
                    </div>
                  ) : null}
                </>
              ) : (
                <p className={`text-sm ${DURUM_YAZISI.uyari}`}>
                  {t("okuyucuYok")}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
