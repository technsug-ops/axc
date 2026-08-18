"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowDown, Calculator } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBicim } from "@/lib/bicim-istemci";
import { DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";
import {
  birAltDilim,
  simulasyonKur,
  type Beyan,
  type SimulasyonGirdisi,
} from "@/lib/fiyatlama/simulasyon";
import type { TarifeDilimi } from "@/lib/komisyon/tarife-okuyucu";

/**
 * ============================================================================
 *  FİYAT DENE — KÂRLILIK KARTI BÖLÜMÜ
 * ----------------------------------------------------------------------------
 *  Aşama 1'in kullanıcıya değen yüzü. Soru tek cümle: _bir dilim aşağı
 *  inmenin komisyon kazancı, fiyat kaybını telafi ediyor mu?_
 *
 *  ── ARAÇ İKİ YÖNÜ DE DÜRÜST GÖSTERİR ────────────────────────────────────
 *  ⚠ Mimar şartı 19.08.2026. Manuel Rondo kazandıran bir örnek ama HER
 *  ÜRÜN ÖYLE DEĞİL. Yalnız kazancı gösteren bir araç "her zaman in"
 *  aracı sanılır ve kullanıcı zarar eden bir indirimi güvenle yapar.
 *  Fark negatifse o da AYNI belirginlikte yazılır.
 *
 *  ── BEYANLAR EKRANDA YAŞAR ──────────────────────────────────────────────
 *  Motor "dilim verisi yok", "pencere bitti", "maliyet yok" diyor; bunlar
 *  ekranda görünmezse motorun dürüstlüğü kullanıcıya ulaşmaz.
 *  _"Kaydedilen ≠ görünen" dersinin hesap tarafındaki karşılığı._
 *
 *  ── HESAP İSTEMCİDE ─────────────────────────────────────────────────────
 *  Simülasyon saf ve veritabanına gitmiyor; zemin sunucudan bir kez
 *  geliyor, kullanıcı fiyatı değiştirdikçe hesap anında yeniden koşuyor.
 *  Her tuşta sunucuya gitmek, denemeyi ağır ve isteksiz kılardı.
 * ============================================================================
 */

export type ZeminGorunumu = {
  kanalAdi: string;
  dilimler: TarifeDilimi[] | null;
  pencereBitis: string | null;
  tekOran: number | null;
  komisyonKdvOrani: number | null;
  siparisKesintileri: SimulasyonGirdisi["siparisKesintileri"];
};

export function FiyatDene({
  zeminler,
  birimMaliyet,
  kdvOrani,
  paraBirimi,
  baslangicFiyati,
}: {
  zeminler: ZeminGorunumu[];
  birimMaliyet: number | null;
  kdvOrani: number;
  paraBirimi: "TRY" | "EUR";
  /** Son satışın birim fiyatı — kutuya önceden yazılır, yoksa boş. */
  baslangicFiyati: number | null;
}) {
  const t = useTranslations("UrunKarti");
  const bicim = useBicim();
  const [fiyat, setFiyat] = useState(
    baslangicFiyati === null ? "" : String(baslangicFiyati),
  );

  if (zeminler.length === 0) return null;

  const sayi = Number(fiyat.replace(",", "."));
  const gecerli = fiyat.trim() !== "" && Number.isFinite(sayi) && sayi > 0;

  /**
   * ⚠ TÜKETİCİ EŞLEME — her beyan türü ADIYLA karşılanır.
   *
   * İlk yazılışta son dal "geri kalan her şey" idi: `PENCERE_BITTI` adı
   * hiç geçmiyordu. Yeni bir beyan türü eklendiğinde ekran onu SESSİZCE
   * "tarifenin geçerliliği bitti" diye yazardı — yanlış cümle, doğru
   * görünümle.
   *
   * Artık `switch` tüketici: yeni tür eklenince `asla` satırı TypeScript
   * hatası verir ve derleme durur. Ekran, motorun beyanlarıyla eşit
   * adımda kalmak ZORUNDA.
   */
  const beyanMetni = (b: Beyan): string => {
    switch (b.tur) {
      case "DILIM_YOK":
        return t("beyanDilimYok");
      case "ORAN_YOK":
        return t("beyanOranYok");
      case "MALIYET_YOK":
        return t("beyanMaliyetYok");
      case "PENCERE_BITTI":
        return t("beyanPencereBitti", { tarih: bicim.tarih(b.bitis) });
      default: {
        const asla: never = b;
        return String(asla);
      }
    }
  };

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Calculator className="size-4 shrink-0" />
        {t("fiyatDeneBaslik")}
      </div>
      <p className="text-muted-foreground text-sm">{t("fiyatDeneNot")}</p>

      <label className="block max-w-xs">
        <Label htmlFor="dene-fiyat">{t("fiyatDeneAlan")}</Label>
        <Input
          id="dene-fiyat"
          value={fiyat}
          /* MOBİL: sayısal klavye ve KURUŞ kabulü. Dilim sınırları kuruşla
             oynanıyor (769,98) — tam sayıya yuvarlayan bir alan aracın
             bütün anlamını yok ederdi. */
          inputMode="decimal"
          placeholder={t("fiyatDeneIpucu")}
          onChange={(e) => setFiyat(e.target.value)}
          className="h-11"
        />
      </label>

      {zeminler.map((z) => {
        const girdi: SimulasyonGirdisi = {
          hedefFiyat: gecerli ? sayi : 0,
          adet: 1,
          birimMaliyet,
          kdvOrani,
          paraBirimi,
          dilimler: z.dilimler,
          pencereBitis: z.pencereBitis === null ? null : new Date(z.pencereBitis),
          tekOran: z.tekOran,
          komisyonKdvOrani: z.komisyonKdvOrani,
          siparisKesintileri: z.siparisKesintileri,
          kargoTarifesi: null,
          bugun: new Date(),
        };

        const s = gecerli ? simulasyonKur(girdi) : null;

        /**
         * BİR ALT DİLİM — girilen fiyata göre. Kutu boşken hesaplanmaz:
         * hangi dilimde olduğumuz bilinmeden "bir alt" denemez.
         */
        const oneri =
          gecerli && z.dilimler !== null ? birAltDilim(z.dilimler, sayi) : null;
        const oneriSonuc =
          oneri === null
            ? null
            : simulasyonKur({ ...girdi, hedefFiyat: oneri.hedefFiyat });

        const fark =
          s?.net2 != null && oneriSonuc?.net2 != null
            ? oneriSonuc.net2 - s.net2
            : null;

        return (
          <div key={z.kanalAdi} className="space-y-2 rounded-md border p-3">
            <div className="text-sm font-medium">{z.kanalAdi}</div>

            {s === null ? (
              <p className="text-muted-foreground text-sm">{t("fiyatDeneBekliyor")}</p>
            ) : (
              <>
                <div className="grid gap-2 text-sm sm:grid-cols-3">
                  <div>
                    <span className="text-muted-foreground block text-xs">
                      {t("deneKomisyon")}
                    </span>
                    <span className="font-medium tabular-nums">
                      {s.komisyonOrani === null
                        ? "—"
                        : `%${s.komisyonOrani}`}
                      {s.dilim !== null ? (
                        <span className="text-muted-foreground ml-1 text-xs">
                          {t("deneDilim", { sira: s.dilim.sira })}
                        </span>
                      ) : null}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs">NET-1</span>
                    <span className="font-medium tabular-nums">
                      {s.net1 === null ? "—" : bicim.para(s.net1, paraBirimi)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs">NET-2</span>
                    <span className="font-medium tabular-nums">
                      {s.net2 === null ? "—" : bicim.para(s.net2, paraBirimi)}
                    </span>
                  </div>
                </div>

                {/* ---------- BİR ALT DİLİM — YÖN DE SÖYLER ----------
                    ⚠ Araç iki yönü de dürüst gösterir. Yalnız kazancı
                    gösterseydi "her zaman in" aracı sanılırdı; oysa her
                    üründe inmek kazandırmıyor. */}
                {oneri !== null && oneriSonuc !== null ? (
                  <div
                    className={`rounded-md p-2 text-sm ${
                      fark === null
                        ? ""
                        : fark > 0
                          ? DURUM_KUTUSU.olumlu
                          : DURUM_KUTUSU.olumsuz
                    }`}
                  >
                    <p
                      className={`flex flex-wrap items-center gap-1 ${
                        fark === null
                          ? ""
                          : fark > 0
                            ? DURUM_YAZISI.olumlu
                            : DURUM_YAZISI.olumsuz
                      }`}
                    >
                      <ArrowDown className="size-3.5 shrink-0" />
                      {t("deneAltDilim", {
                        fiyat: bicim.para(oneri.hedefFiyat, paraBirimi),
                        oran: oneri.dilim.oran,
                      })}
                    </p>
                    {fark !== null ? (
                      <p
                        className={`text-xs ${
                          fark > 0 ? DURUM_YAZISI.olumlu : DURUM_YAZISI.olumsuz
                        }`}
                      >
                        {fark > 0
                          ? t("deneKazanc", { tutar: bicim.para(fark, paraBirimi) })
                          : t("deneKayip", {
                              tutar: bicim.para(Math.abs(fark), paraBirimi),
                            })}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {/* BEYANLAR EKRANDA YAŞAR — motorun dürüstlüğü buraya
                    ulaşmazsa yok hükmündedir. */}
                {s.beyanlar.length > 0 ? (
                  <ul className={`space-y-0.5 text-xs ${DURUM_YAZISI.uyari}`}>
                    {s.beyanlar.map((b, i) => (
                      <li key={i}>{beyanMetni(b)}</li>
                    ))}
                  </ul>
                ) : null}
              </>
            )}
          </div>
        );
      })}

      {fiyat.trim() !== "" ? (
        <Button variant="ghost" size="sm" onClick={() => setFiyat("")}>
          {t("deneTemizle")}
        </Button>
      ) : null}
    </div>
  );
}
