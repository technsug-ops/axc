"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Calculator, RefreshCw } from "lucide-react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBicim } from "@/lib/bicim-istemci";

import {
  karOnizleAction,
  karYenidenYazAction,
  type OnizlemeSonucu,
} from "./yeniden-hesapla-actions";

export type KargoFirmasiSecenegi = { id: string; ad: string };

export type YenidenHesaplaKalemi = {
  saleItemId: string;
  baslik: string;
  komisyonOrani: string;
  komisyonTutari: string;
};

const KARGO_YOK = "__kargo_yok__";

/**
 * ============================================================================
 *  KÂR YENİDEN HESAPLAMA — ÖNİZLEMELİ ONAY
 * ----------------------------------------------------------------------------
 *  Snapshot'ın üzerine yazan bir işlem, dolayısıyla ONAY ZORUNLU (#6).
 *  Ama sadece "emin misiniz?" sormak yetmez: kullanıcı NEYİN değişeceğini
 *  görmeli. Bu yüzden önce ÖNİZLE, eski ve yeni NET'ler yan yana çıkar,
 *  sonra yazılır.
 * ============================================================================
 */
export function YenidenHesapla({
  saleId,
  kalemler: ilkKalemler,
  kargoFirmalari,
  cargoCarrierId: ilkFirma,
  cargoDesi: ilkDesi,
  cargoAmount: ilkTutar,
}: {
  saleId: string;
  kalemler: YenidenHesaplaKalemi[];
  kargoFirmalari: KargoFirmasiSecenegi[];
  cargoCarrierId: string | null;
  cargoDesi: string;
  /** KDV DAHİL kargo tutarı — boşsa tarifeden okunur. */
  cargoAmount: string;
}) {
  const t = useTranslations("Satis");
  const ortak = useTranslations("Ortak");
  const tKesinti = useTranslations("Kesinti");
  const bicim = useBicim();
  const router = useRouter();

  const [acik, setAcik] = useState(false);
  const [kalemler, setKalemler] = useState(ilkKalemler);
  const [firmaId, setFirmaId] = useState(ilkFirma ?? "");
  const [desi, setDesi] = useState(ilkDesi);
  const [tutar, setTutar] = useState(ilkTutar);

  const [onizleme, setOnizleme] = useState<OnizlemeSonucu | null>(null);
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [bekliyor, gecis] = useTransition();

  function sayiyaCevir(deger: string): number | null {
    const s = deger.trim().replace(",", ".");
    if (s === "") return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  function girdiTopla() {
    return {
      saleId,
      kalemler: kalemler.map((k) => ({
        saleItemId: k.saleItemId,
        commissionRate: sayiyaCevir(k.komisyonOrani),
        commissionAmount: sayiyaCevir(k.komisyonTutari),
      })),
      cargoCarrierId: firmaId || null,
      cargoDesi: sayiyaCevir(desi),
      cargoAmountManual: sayiyaCevir(tutar),
    };
  }

  function onizle() {
    setMesaj(null);
    gecis(async () => {
      const sonuc = await karOnizleAction(girdiTopla());
      setOnizleme(sonuc);
    });
  }

  function yaz() {
    gecis(async () => {
      const sonuc = await karYenidenYazAction(girdiTopla());
      if (sonuc.hata) {
        setMesaj(sonuc.hata);
        return;
      }
      setAcik(false);
      setOnizleme(null);
      router.refresh();
    });
  }

  const para = (n: number) =>
    bicim.para(n, (onizleme?.paraBirimi as "TRY" | "EUR") ?? "TRY");

  return (
    <AlertDialog open={acik} onOpenChange={setAcik}>
      <AlertDialogTrigger asChild>
        <Button variant="outline">
          <RefreshCw />
          {t("yenidenHesapla")}
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>{t("yenidenHesaplaBaslik")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("yenidenHesaplaAciklama")}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          {/* --------------------- KALEM KOMİSYONLARI --------------------- */}
          {kalemler.map((kalem, sira) => (
            <div
              key={kalem.saleItemId}
              className="space-y-2 rounded-lg border p-3"
            >
              <div className="text-sm font-medium">{kalem.baslik}</div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor={`yh-oran-${sira}`} className="text-xs">
                    {t("komisyonOrani")}
                  </Label>
                  <Input
                    id={`yh-oran-${sira}`}
                    value={kalem.komisyonOrani}
                    inputMode="decimal"
                    placeholder="örn. 12"
                    onChange={(e) =>
                      setKalemler((o) =>
                        o.map((k, i) =>
                          i === sira
                            ? { ...k, komisyonOrani: e.target.value }
                            : k,
                        ),
                      )
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`yh-tutar-${sira}`} className="text-xs">
                    {t("komisyonTutari")}
                  </Label>
                  <Input
                    id={`yh-tutar-${sira}`}
                    value={kalem.komisyonTutari}
                    inputMode="decimal"
                    placeholder="örn. 103,53"
                    onChange={(e) =>
                      setKalemler((o) =>
                        o.map((k, i) =>
                          i === sira
                            ? { ...k, komisyonTutari: e.target.value }
                            : k,
                        ),
                      )
                    }
                  />
                </div>
              </div>
            </div>
          ))}

          {/* ------------------------- KARGO -------------------------- */}
          <div className="space-y-3 rounded-lg border p-3">
            <div className="text-sm font-medium">{t("kargoBasligi")}</div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="yh-firma" className="text-xs">
                  {t("kargoFirmasi")}
                </Label>
                <Select
                  value={firmaId || KARGO_YOK}
                  onValueChange={(d) => setFirmaId(d === KARGO_YOK ? "" : d)}
                >
                  <SelectTrigger id="yh-firma" className="w-full">
                    <SelectValue placeholder={t("kargoSecin")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={KARGO_YOK}>
                      {t("kargoSecilmedi")}
                    </SelectItem>
                    {kargoFirmalari.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.ad}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="yh-desi" className="text-xs">
                  {t("desiEtiketi")}
                </Label>
                <Input
                  id="yh-desi"
                  value={desi}
                  inputMode="decimal"
                  placeholder={t("desiIpucu")}
                  onChange={(e) => setDesi(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="yh-kargo-tutar" className="text-xs">
                  {t("kargoTutariElle")}
                </Label>
                <Input
                  id="yh-kargo-tutar"
                  value={tutar}
                  inputMode="decimal"
                  placeholder={t("kargoTutariIpucu")}
                  onChange={(e) => setTutar(e.target.value)}
                />
              </div>
            </div>
            <p className="text-muted-foreground text-xs">
              {t("kargoTutariNotu")}
            </p>
          </div>

          {/* --------------------- ÖNİZLEME --------------------- */}
          <div className="space-y-2 rounded-lg border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium">
                {t("onizlemeBasligi")}
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onizle}
                disabled={bekliyor}
              >
                <Calculator />
                {t("onizlemeHesapla")}
              </Button>
            </div>

            {onizleme?.hata ? (
              <p className="text-destructive text-sm" role="alert">
                {onizleme.hata}
              </p>
            ) : null}

            {onizleme?.yeni ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground text-xs">
                    <th className="text-left font-normal"> </th>
                    <th className="text-right font-normal">{t("eskiDeger")}</th>
                    <th className="text-right font-normal">{t("yeniDeger")}</th>
                    <th className="text-right font-normal">{t("fark")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(
                    [
                      [
                        "net1Etiketi",
                        onizleme.onceki?.net1,
                        onizleme.yeni.net1,
                      ],
                      [
                        "net2Etiketi",
                        onizleme.onceki?.net2,
                        onizleme.yeni.net2,
                      ],
                    ] as const
                  ).map(([anahtar, eski, yeni]) => {
                    const fark =
                      eski === null || eski === undefined ? null : yeni - eski;
                    return (
                      <tr key={anahtar} className="border-t">
                        <td className="py-1">{t(anahtar)}</td>
                        <td className="py-1 text-right whitespace-nowrap">
                          {eski === null || eski === undefined
                            ? "—"
                            : para(eski)}
                        </td>
                        <td className="py-1 text-right font-medium whitespace-nowrap">
                          {para(yeni)}
                        </td>
                        <td
                          className={
                            fark === null
                              ? "py-1 text-right"
                              : fark < 0
                                ? "text-destructive py-1 text-right whitespace-nowrap"
                                : "py-1 text-right whitespace-nowrap text-emerald-600"
                          }
                        >
                          {fark === null
                            ? "—"
                            : `${fark > 0 ? "+" : ""}${para(fark)}`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : onizleme?.hata ? null : (
              <p className="text-muted-foreground text-xs">
                {t("onizlemeBekleniyor")}
              </p>
            )}

            {/* Kesinti dökümü — NET'in NEDEN değiştiği görünsün.
                Komisyonun sıfırlandığı gibi bir durum burada fark edilir. */}
            {onizleme?.kesintiler?.length ? (
              <dl className="mt-2 space-y-1 border-t pt-2 text-xs">
                {[
                  ...onizleme.kesintiler,
                  ...(onizleme.siparisKesintileri ?? []),
                ].map((k, i) => (
                  <div key={i} className="flex justify-between gap-4">
                    <dt
                      className={
                        k.code === "KOMISYON" && k.tutar === 0
                          ? "text-amber-700 dark:text-amber-500"
                          : "text-muted-foreground"
                      }
                    >
                      {tKesinti.has(k.code) ? tKesinti(k.code) : k.code}
                    </dt>
                    <dd
                      className={
                        k.code === "KOMISYON" && k.tutar === 0
                          ? "text-amber-700 whitespace-nowrap dark:text-amber-500"
                          : "whitespace-nowrap"
                      }
                    >
                      −{para(k.tutar)}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}

            {onizleme?.yeni && onizleme.yeni.durum !== "CALCULATED" ? (
              <Badge
                variant="outline"
                className="border-amber-500/50 text-amber-700 dark:text-amber-400"
              >
                {onizleme.yeni.durum === "NO_COST"
                  ? t("durumKisaNoCost")
                  : onizleme.yeni.durum === "CURRENCY_MISMATCH"
                    ? t("durumKisaCurrency")
                    : t("durumKisaRule")}
              </Badge>
            ) : null}
          </div>

          {mesaj ? (
            <p className="text-destructive text-sm" role="alert">
              {mesaj}
            </p>
          ) : null}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>{ortak("vazgec")}</AlertDialogCancel>
          {/* Önizleme görülmeden yazma yok — kullanıcı farkı görmeli. */}
          <Button
            type="button"
            onClick={yaz}
            disabled={bekliyor || !onizleme?.yeni}
          >
            {bekliyor ? ortak("kaydediliyor") : t("yenidenHesaplaOnayla")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
