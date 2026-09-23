"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Calculator, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBicim } from "@/lib/bicim-istemci";
import { enIyiSatir, netRengi, oneriKur } from "@/lib/komisyon/net-onerisi";
import { DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";

import { dilimNetleri, type DilimNetSonucu } from "./eylemler";

/**
 * ============================================================================
 *  TARİFE AYNASI — SATIRLAR (K230)
 * ----------------------------------------------------------------------------
 *  Bir satır = bir ürün. Dilimler pazaryeri panelinin dilinde yazılır:
 *  aralık + komisyon. Satır açılınca o ürünün NET'i hesaplanır.
 *
 *  ⚠ KARGO SORULUYOR, UYDURULMUYOR. Sistem ürünün kargo ücretini bilmiyor
 *  (`urunZemini` maliyet ve KDV veriyor, kargo VERMİYOR — ölçüldü). Kargo
 *  sıfır varsayılsaydı her dilim olduğundan kârlı görünürdü; bu ekranın tam
 *  olarak engellemek için var olduğu yanılgı.
 * ============================================================================
 */

export type AynaDilimi = {
  sira: number;
  alt: number | null;
  ust: number | null;
  oran: number;
};

export type AynaSatiri = {
  kod: string;
  urunAdi: string | null;
  /** Kataloğumuzda karşılığı var mı — yoksa NET hesaplanamaz. */
  katalogda: boolean;
  dilimler: AynaDilimi[];
};

export function Ayna({
  satirlar,
  kanalKodu,
}: {
  satirlar: AynaSatiri[];
  /** Kanal KODU — motor fiyatı kodla arıyor, adla değil. */
  kanalKodu: string;
}) {
  const t = useTranslations("TarifeAynasi");
  const bicim = useBicim();
  const [acik, setAcik] = useState<string | null>(null);
  const [kargo, setKargo] = useState("");
  /** K234-②: şu anki satış fiyatı — boşsa sunucu son satışı kullanır. */
  const [guncelFiyat, setGuncelFiyat] = useState("");
  const [sonuc, setSonuc] = useState<DilimNetSonucu | null>(null);
  const [bekliyor, basla] = useTransition();

  const bagsiz = satirlar.filter((s) => !s.katalogda).length;

  function hesapla(satir: AynaSatiri) {
    const ucret = Number(kargo.replace(",", "."));
    if (!Number.isFinite(ucret)) return;
    const fiyatMetni = guncelFiyat.trim().replace(/\./g, "").replace(",", ".");
    const fiyat = fiyatMetni === "" ? null : Number(fiyatMetni);
    basla(async () => {
      setSonuc(
        await dilimNetleri({
          kod: satir.kod,
          kanalKodu,
          kargoUcreti: ucret,
          guncelFiyat: fiyat !== null && Number.isFinite(fiyat) ? fiyat : null,
          dilimler: satir.dilimler.map((d) => ({
            sira: d.sira,
            ust: d.ust,
            oran: d.oran,
          })),
        }),
      );
    });
  }

  /** Aralığı panelin diliyle yazar: "1.711,01 – 1.801,00" · "1.621,00 ve altı". */
  function aralik(d: AynaDilimi): string {
    if (d.ust === null) return t("veUstu", { tutar: bicim.para(d.alt ?? 0, "TRY") });
    if (d.alt === null) return t("veAlti", { tutar: bicim.para(d.ust, "TRY") });
    return `${bicim.para(d.alt, "TRY")} – ${bicim.para(d.ust, "TRY")}`;
  }

  return (
    <div className="space-y-4">
      {/* Bağsız ürün sayısı sıfır olsa da yazılır — sıfır satır gizlenmez. */}
      <div
        className={`flex gap-3 rounded-lg p-4 ${
          bagsiz > 0 ? DURUM_KUTUSU.uyari : DURUM_KUTUSU.bilgi
        }`}
      >
        <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
        <p
          className={`text-sm ${bagsiz > 0 ? DURUM_YAZISI.uyari : DURUM_YAZISI.bilgi}`}
        >
          {t("bagsizOzet", { adet: bagsiz })}
        </p>
      </div>

      {satirlar.map((satir) => {
        const acikMi = acik === satir.kod;
        return (
          <Card key={satir.kod}>
            <CardHeader>
              <CardTitle className="text-base">
                {satir.urunAdi ?? satir.kod}
              </CardTitle>
              <p className="text-muted-foreground text-sm">{satir.kod}</p>
            </CardHeader>

            <CardContent className="space-y-3">
              {/* PANELİN AYNASI — aralık + komisyon, dilim sırasıyla. */}
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {satir.dilimler.map((d) => (
                  <div
                    key={d.sira}
                    className="border-border rounded-lg border p-3"
                  >
                    <p className="text-sm tabular-nums">{aralik(d)}</p>
                    <p className="text-muted-foreground text-sm">
                      {t("komisyon", { oran: bicim.yuzde(d.oran, 2) })}
                    </p>
                  </div>
                ))}
              </div>

              {!satir.katalogda ? (
                <p className={`text-sm ${DURUM_YAZISI.uyari}`}>
                  {t("katalogdaYok")}
                </p>
              ) : (
                <>
                  <Button
                    type="button"
                    variant={acikMi ? "outline" : "default"}
                    className="min-h-11"
                    onClick={() => {
                      /*
                        ⛔ GİRDİLER DE TEMİZLENİR (K242, 23.09.2026 — kullanıcı
                        bildirimi). Kargo ücreti ve satış fiyatı LİSTE
                        seviyesinde tek bir durumda tutuluyor; eskiden yalnız
                        `sonuc` sıfırlanıyordu ve iki girdi ÖNCEKİ ÜRÜNÜN
                        değerleriyle duruyordu.
                        ⚠ BU KOZMETİK DEĞİL: A ürününün fiyatıyla B ürününün
                        NET'i hesaplanır ve ekranda MAKUL görünür — yanlış
                        rakam, yanlış olduğunu söylemez.
                        _(Anayasa: "bir okuma, okunan değeri doğrudan taşır" —
                        burada taşınan şey önceki bağlamın artığıydı.)_
                      */
                      setAcik(acikMi ? null : satir.kod);
                      setKargo("");
                      setGuncelFiyat("");
                      setSonuc(null);
                    }}
                  >
                    <Calculator />
                    {acikMi ? t("kapat") : t("netHesapla")}
                  </Button>

                  {acikMi ? (
                    <div className="border-border space-y-3 rounded-lg border p-3">
                      <div className="space-y-1.5">
                        <Label htmlFor={`kargo-${satir.kod}`}>
                          {t("kargoUcreti")}
                        </Label>
                        {/* ⚠ YER TUTUCU "örn." — girilmiş değer sanılmasın (İlke #11). */}
                        <Input
                          id={`kargo-${satir.kod}`}
                          inputMode="decimal"
                          className="h-11 max-w-40"
                          placeholder={t("kargoOrnek")}
                          value={kargo}
                          onChange={(e) => {
                            setKargo(e.target.value);
                            setSonuc(null);
                          }}
                        />
                        <p className="text-muted-foreground text-xs">
                          {t("kargoNotu")}
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor={`fiyat-${satir.kod}`}>{t("guncelFiyat")}</Label>
                        {/* ⚠ YER TUTUCU "örn." — girilmiş değer sanılmasın (İlke #11). */}
                        <Input
                          id={`fiyat-${satir.kod}`}
                          inputMode="decimal"
                          className="h-11 max-w-40"
                          placeholder={t("guncelFiyatOrnek")}
                          value={guncelFiyat}
                          onChange={(e) => {
                            setGuncelFiyat(e.target.value);
                            setSonuc(null);
                          }}
                        />
                        <p className="text-muted-foreground text-xs">{t("guncelFiyatNotu")}</p>
                      </div>

                      <Button
                        type="button"
                        className="min-h-11"
                        disabled={kargo.trim() === "" || bekliyor}
                        onClick={() => hesapla(satir)}
                      >
                        {bekliyor ? t("hesaplaniyor") : t("goster")}
                      </Button>

                      {sonuc ? <Sonuclar sonuc={sonuc} satir={satir} /> : null}
                    </div>
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function Sonuclar({
  sonuc,
  satir,
}: {
  sonuc: DilimNetSonucu;
  satir: AynaSatiri;
}) {
  const t = useTranslations("TarifeAynasi");
  const bicim = useBicim();

  if (sonuc.durum === "URUN_YOK") {
    return <p className={`text-sm ${DURUM_YAZISI.uyari}`}>{t("urunYok")}</p>;
  }
  if (sonuc.durum === "MALIYET_YOK") {
    return (
      <p className={`text-sm ${DURUM_YAZISI.uyari}`}>{t("maliyetYok")}</p>
    );
  }

  /**
   * ⚠ ESKİ KARAR (21.09.2026): "en kârlı dilim işaretlenir ama ÖNERİ
   * yazılmaz — ekran ayna + NET olsun, hüküm vermesin." ÇEVRİLDİ (22.09,
   * aynı kullanıcı): "Selliora bana desin ki fiyatı 1095 yap daha fazla
   * kazan; fark ufak ama sistem önemli." Öneri ŞU ANKİ fiyata göre ve
   * rakamıyla yazılır; gövde saf (`oneriKur`), değer testiyle kilitli.
   */
  const enIyi = enIyiSatir(sonuc.satirlar)?.net2 ?? null;
  const oneri = oneriKur(sonuc.guncel, sonuc.satirlar);
  const renk = (n: number | null) => {
    const r = netRengi(n);
    return r ? DURUM_YAZISI[r] : "";
  };

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-sm">
        {t("zemin", {
          maliyet: bicim.para(sonuc.maliyet, "TRY"),
          kdv: bicim.yuzde(sonuc.kdvOrani, 0),
        })}
      </p>
      <div className="space-y-1">
        {sonuc.satirlar.map((r) => {
          const dilim = satir.dilimler.find((d) => d.sira === r.sira);
          return (
            <div
              key={r.sira}
              className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm tabular-nums"
            >
              <span className="text-muted-foreground">
                {r.fiyat === null ? "—" : bicim.para(r.fiyat, "TRY")}
              </span>
              <span className="text-muted-foreground">
                {t("komisyon", {
                  oran: bicim.yuzde(r.oran ?? dilim?.oran ?? 0, 2),
                })}
              </span>
              {/* EKSİ KIRMIZI, ARTI YEŞİL (kullanıcı 22.09) — renk sınıfı tokenden. */}
              <span className={`font-medium ${renk(r.net2)}`}>
                {r.net2 === null
                  ? t("netYok")
                  : t("net2", { tutar: bicim.para(r.net2, "TRY") })}
              </span>
              {r.fiyatKaynagi === "SON_SATIS" ? (
                <span className="text-muted-foreground text-xs">
                  {t("sonSatistan")}
                </span>
              ) : null}
              {enIyi !== null && r.net2 === enIyi ? (
                <span className="text-xs font-medium">{t("enKarli")}</span>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* ŞU ANKİ FİYAT — ayrı ve vurgulu: "şu an satarsam ne kalır?" */}
      <div className="border-border space-y-1 rounded-lg border p-3 text-sm tabular-nums">
        {sonuc.guncel ? (
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-medium">{t("guncelSatir")}</span>
            <span>{sonuc.guncel.fiyat === null ? "—" : bicim.para(sonuc.guncel.fiyat, "TRY")}</span>
            <span className="text-muted-foreground">
              {t("komisyon", { oran: bicim.yuzde(sonuc.guncel.oran ?? 0, 2) })}
            </span>
            <span className={`font-semibold ${renk(sonuc.guncel.net2)}`}>
              {sonuc.guncel.net2 === null
                ? t("netYok")
                : t("net2", { tutar: bicim.para(sonuc.guncel.net2, "TRY") })}
            </span>
            <span className="text-muted-foreground text-xs">
              {sonuc.guncel.fiyatKaynagi === "GIRILEN"
                ? t("girdiginizFiyat")
                : sonuc.sonSatisTarihi
                  ? t("sonSatisTarihli", { tarih: bicim.tarih(sonuc.sonSatisTarihi) })
                  : t("sonSatistan")}
            </span>
          </div>
        ) : (
          <p className={DURUM_YAZISI.uyari}>{t("guncelYok")}</p>
        )}
        {oneri.tur === "ARTIR" ? (
          <p className={`font-medium ${DURUM_YAZISI.olumlu}`}>
            {t("oneri", {
              fiyat: bicim.para(oneri.hedefFiyat, "TRY"),
              fark: bicim.para(oneri.fark, "TRY"),
            })}
          </p>
        ) : oneri.tur === "EN_IYI" ? (
          <p className="text-muted-foreground">{t("oneriEnIyi")}</p>
        ) : null}
      </div>
    </div>
  );
}
