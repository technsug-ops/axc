"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check, RotateCcw, TriangleAlert, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";
import { useBicim } from "@/lib/bicim-istemci";
import {
  GERI_ALMA_ACIKLAMA_ZORUNLU,
  GERI_ALMA_NEDENLERI,
  type GeriAlmaNedeni,
} from "@/lib/iptal-geri-alma";

import {
  geriAlmayiOnizle,
  geriAlmayiUygula,
  type GeriAlmaOnizlemeSonucu,
} from "./geri-al-actions";

/**
 * ============================================================================
 *  İPTALİ GERİ AL — FORM
 * ----------------------------------------------------------------------------
 *  Ölçü: bugünkü senaryo (yanlış iptal → geri al) uçtan uca EKRANDAN,
 *  terminalsiz yapılabilmeli.
 *
 *  ── ÜÇÜNCÜ KİLİT KONUŞUR ────────────────────────────────────────────────
 *  İptalden sonra o üründen çıkış yapılmışsa geri alma stoğu eksiye
 *  düşürürdü. Düğme sessizce pasifleşmez: hangi hareketin engellediği
 *  yazılır ve o satışa bağlantı verilir.
 * ============================================================================
 */
export function GeriAlFormu({ saleId }: { saleId: string }) {
  const t = useTranslations("IptalGeriAl");
  const ortak = useTranslations("Ortak");
  const bicim = useBicim();
  const router = useRouter();
  const [bekliyor, basla] = useTransition();

  const [acik, setAcik] = useState(false);
  const [neden, setNeden] = useState<GeriAlmaNedeni | "">("");
  const [aciklama, setAciklama] = useState("");
  const [onizleme, setOnizleme] = useState<GeriAlmaOnizlemeSonucu | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  function sifirla() {
    setOnizleme(null);
    setHata(null);
  }

  const aciklamaZorunlu =
    neden !== "" && (GERI_ALMA_ACIKLAMA_ZORUNLU as readonly string[]).includes(neden);

  if (!acik) {
    return (
      <Button variant="outline" size="sm" onClick={() => setAcik(true)}>
        <RotateCcw />
        {t("geriAl")}
      </Button>
    );
  }

  return (
    <div className="bg-background mt-2 space-y-3 rounded-md border p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{t("baslik")}</span>
        <Button variant="ghost" size="sm" onClick={() => setAcik(false)}>
          <X />
          {ortak("kapat")}
        </Button>
      </div>

      <p className="text-muted-foreground text-xs">{t("aciklamaMetni")}</p>

      <div className="space-y-2">
        <Select
          value={neden}
          onValueChange={(d) => {
            sifirla();
            setNeden(d as GeriAlmaNedeni);
          }}
        >
          <SelectTrigger className="h-11 w-full">
            <SelectValue placeholder={t("nedenSecin")} />
          </SelectTrigger>
          <SelectContent>
            {GERI_ALMA_NEDENLERI.map((n) => (
              <SelectItem key={n} value={n}>
                {t(`neden_${n}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <label className="block text-sm">
          <span className="text-muted-foreground block text-xs">
            {aciklamaZorunlu ? t("aciklamaZorunlu") : t("aciklamaIstege")}
          </span>
          <Input
            value={aciklama}
            placeholder={t("aciklamaIpucu")}
            onChange={(e) => {
              sifirla();
              setAciklama(e.target.value);
            }}
            className="h-11"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          className="h-11"
          disabled={bekliyor}
          onClick={() =>
            basla(async () => {
              sifirla();
              const c = await geriAlmayiOnizle(
                saleId,
                neden === "" ? null : neden,
                aciklama.trim() === "" ? null : aciklama,
              );
              setOnizleme(c);
              if (!c.tamam) setHata(c.hata);
            })
          }
        >
          {bekliyor ? t("hesaplaniyor") : t("onizle")}
        </Button>

        {/* Onay yalnız GEÇERLİ önizleme varken aktif. */}
        <Button
          className="h-11"
          disabled={bekliyor || onizleme === null || onizleme.tamam !== true}
          onClick={() =>
            basla(async () => {
              if (onizleme === null || !onizleme.tamam || neden === "") return;
              const c = await geriAlmayiUygula(
                saleId,
                neden,
                aciklama.trim() === "" ? null : aciklama,
                onizleme.imza,
              );
              if (c.tamam) {
                setAcik(false);
                router.refresh();
              } else {
                setHata(c.hata);
                setOnizleme(null);
              }
            })
          }
        >
          <Check />
          {t("onayla")}
        </Button>
      </div>

      {/* ------------------------- ÖNİZLEME -------------------------- */}
      {onizleme?.tamam === true ? (
        <div className="bg-muted/40 space-y-1 rounded-md border p-3 text-sm">
          <div className="font-medium">{t("onizlemeBaslik")}</div>
          <div>{t("stoktanCikacak", { adet: onizleme.stoktanCikacakAdet })}</div>
          <div className="text-muted-foreground text-xs">{t("netNotu")}</div>
        </div>
      ) : null}

      {/* ------------- ENGEL: KONUŞAN ÜÇÜNCÜ KİLİT ------------------- */}
      {hata ? (
        <div className={`space-y-2 rounded-md p-2 text-sm ${DURUM_KUTUSU.olumsuz} ${DURUM_YAZISI.olumsuz}`}>
          <p className="flex items-start gap-2">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            {hata}
          </p>

          {/* Engelleyen hareketler: hangi kayıt, ne zaman, hangi satış. */}
          {onizleme?.tamam === false && onizleme.engelleyenler?.length ? (
            <ul className="space-y-1">
              {onizleme.engelleyenler.map((e, i) => (
                <li key={i} className="text-xs">
                  {bicim.tarih(new Date(e.tarih))} · {e.tip}
                  {e.satisId ? (
                    <>
                      {" · "}
                      <Link
                        href={`/satislar/${e.satisId}`}
                        className="underline underline-offset-2"
                      >
                        {e.satisKodu ?? t("satisiAc")}
                      </Link>
                    </>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
