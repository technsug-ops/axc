"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check, TriangleAlert, Trash2, Undo2, X } from "lucide-react";

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
import { KALDIRMA_SEBEPLERI } from "@/lib/kalem-kaldirma";
import type { SatisKalemKaldirmaSebebi } from "@/generated/prisma/enums";

import {
  kalemKaldirmaOnizle,
  kalemKaldirmayiGeriAl,
  kalemKaldirmayiUygula,
  type KaldirmaOnizlemeSonucu,
} from "./kalem-kaldir-actions";

/**
 * ============================================================================
 *  KALEM KALDIRMA — SATIR EYLEMİ (K78)
 * ----------------------------------------------------------------------------
 *  İptal formundaki desen: taksonomi → ÖNİZLEME → onay. Onay düğmesi plan
 *  çizilmeden aktif OLMAZ ve imza önizlemeden gelir.
 *
 *  ⚠ EYLEM KALEMİN KENDİ KARTINDA DURUR (İlke #1): "bir kayıtta yapılabilecek
 *  işlem O KAYDIN SATIRINDA görünür durur." Sayfanın altındaki toplu bir
 *  düğme, hangi kalemin kaldırıldığını kullanıcıya saydırırdı.
 *
 *  ⛔ VE EKRAN FARKI YAZAR: bu düğme İADE DEĞİLDİR. Müşteri malı geri
 *  gönderdiyse yol "İade Al"dır; buradaki yol, HİÇ SATILMAMIŞ bir satır
 *  içindir (mükerrer içe aktarma satırı, hatalı giriş).
 * ============================================================================
 */
export function KalemKaldir({
  saleItemId,
  sonKalem,
}: {
  saleItemId: string;
  /** Satışta tek geçerli kalem kaldıysa düğme PASİF olur ve nedeni yazar. */
  sonKalem: boolean;
}) {
  const t = useTranslations("KalemKaldirma");
  const ortak = useTranslations("Ortak");
  const bicim = useBicim();
  const router = useRouter();
  const [bekliyor, basla] = useTransition();

  const [acik, setAcik] = useState(false);
  const [sebep, setSebep] = useState<SatisKalemKaldirmaSebebi | "">("");
  const [not, setNot] = useState("");
  const [onizleme, setOnizleme] = useState<KaldirmaOnizlemeSonucu | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  /** Alan değişince önizleme GEÇERSİZ olur — eski plana onay verilemesin. */
  function sifirla() {
    setOnizleme(null);
    setHata(null);
  }

  if (!acik) {
    /**
     * ⛔ PASİF DÜĞME SESSİZ KALMAZ (İlke #5): niye basılamadığı ve ne
     * yapılacağı yazılı. "Son kalem" hâlinde doğru yol satışı iptal etmek.
     */
    if (sonKalem) {
      return (
        <Button variant="ghost" size="sm" disabled title={t("engel_SON_KALEM")}>
          <Trash2 />
          {t("kaldir")}
        </Button>
      );
    }
    return (
      <Button variant="ghost" size="sm" onClick={() => setAcik(true)}>
        <Trash2 />
        {t("kaldir")}
      </Button>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">{t("baslik")}</h3>
        <Button variant="ghost" size="sm" onClick={() => setAcik(false)}>
          <X />
          {ortak("kapat")}
        </Button>
      </div>

      {/* KALDIRMA İADE DEĞİLDİR — fark ekranda yazılı, sözlükten. */}
      <p className="text-muted-foreground text-xs">{t("kaldirmaIadeDegil")}</p>

      <div className="space-y-2">
        <span className="text-muted-foreground block text-xs">{t("sebep")}</span>
        <Select
          value={sebep}
          onValueChange={(d) => {
            sifirla();
            setSebep(d as SatisKalemKaldirmaSebebi);
          }}
        >
          <SelectTrigger className="h-11 w-full">
            <SelectValue placeholder={t("sebepSecin")} />
          </SelectTrigger>
          <SelectContent>
            {KALDIRMA_SEBEPLERI.map((s) => (
              <SelectItem key={s} value={s}>
                {t(`sebep_${s}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <label className="block text-sm">
          <span className="text-muted-foreground block text-xs">
            {t("aciklamaIstege")}
          </span>
          <Input
            value={not}
            placeholder={t("aciklamaIpucu")}
            onChange={(e) => {
              sifirla();
              setNot(e.target.value);
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
              const c = await kalemKaldirmaOnizle(
                saleItemId,
                sebep === "" ? null : sebep,
                not.trim() === "" ? null : not,
              );
              setOnizleme(c);
              if (!c.tamam) setHata(c.hata);
            })
          }
        >
          {bekliyor ? t("hesaplaniyor") : t("onizle")}
        </Button>

        {/* ONAY: yalnız GEÇERLİ önizleme varken aktif. */}
        <Button
          variant="destructive"
          className="h-11"
          disabled={bekliyor || onizleme === null || onizleme.tamam !== true}
          onClick={() =>
            basla(async () => {
              if (onizleme === null || !onizleme.tamam || sebep === "") return;
              const c = await kalemKaldirmayiUygula(
                saleItemId,
                sebep,
                not.trim() === "" ? null : not,
                onizleme.imza,
              );
              if (c.tamam) {
                setAcik(false);
                router.refresh();
              } else {
                setHata(c.hata);
                // Durum değiştiyse önizleme geçersiz; yeniden alınmalı.
                setOnizleme(null);
              }
            })
          }
        >
          <Check />
          {t("onayla")}
        </Button>
      </div>

      {onizleme?.tamam === true ? (
        <div className="bg-muted/40 space-y-2 rounded-md border p-3 text-sm">
          <div className="font-medium">{t("onizlemeBaslik")}</div>
          <div>{t("stokDonecek", { adet: onizleme.geriDonenAdet })}</div>
          <ul className="space-y-0.5">
            {onizleme.hareketler.map((h, i) => (
              <li key={i} className="text-muted-foreground text-xs">
                {t("hareketSatiri", {
                  adet: h.adet,
                  maliyet:
                    h.birimMaliyet === null
                      ? "?"
                      : bicim.para(
                          Number(h.birimMaliyet),
                          h.paraBirimi ?? "TRY",
                        ),
                })}
              </li>
            ))}
          </ul>

          {/* Null "?" ve "hesaplanamadı" olarak görünür, BOŞ değil. */}
          <div className="border-t pt-2">
            {t("ciroEtkisi", {
              tutar: bicim.para(onizleme.etki.ciro, onizleme.etki.paraBirimi),
            })}
          </div>
          <div>
            {onizleme.etki.net2 === null
              ? t("netHesaplanamadi")
              : t("netEtkisi", {
                  tutar: bicim.para(
                    onizleme.etki.net2,
                    onizleme.etki.paraBirimi,
                  ),
                })}
          </div>
          <div className="text-muted-foreground text-xs">
            {t("kalanKalem", { sayi: onizleme.etki.kalanKalemSayisi })}
          </div>
        </div>
      ) : null}

      {hata ? (
        <p
          className={`flex items-center gap-2 rounded-md p-2 text-sm ${DURUM_KUTUSU.olumsuz} ${DURUM_YAZISI.olumsuz}`}
        >
          <TriangleAlert className="size-4 shrink-0" />
          {hata}
        </p>
      ) : null}
    </div>
  );
}

/**
 * ============================================================================
 *  GERİ ALMA — YANLIŞ TIKLAMA KALICI OLMAZ
 * ----------------------------------------------------------------------------
 *  ⚠ ENGEL SESSİZ DUVAR OLMAZ: kaldırma aynasıyla dönen mal bu arada
 *  satıldıysa geri alma stoğu eksiye düşürürdü. O durumda düğme çalışmaz ve
 *  SEBEBİ ekranda yazar — "bir şey olmadı" ile "olamaz" aynı görünmez.
 * ============================================================================
 */
export function KalemKaldirmaGeriAl({ saleItemId }: { saleItemId: string }) {
  const t = useTranslations("KalemKaldirma");
  const router = useRouter();
  const [bekliyor, basla] = useTransition();
  const [hata, setHata] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        size="sm"
        disabled={bekliyor}
        onClick={() =>
          basla(async () => {
            setHata(null);
            const c = await kalemKaldirmayiGeriAl(saleItemId);
            if (c.tamam) router.refresh();
            else setHata(c.hata);
          })
        }
      >
        <Undo2 />
        {bekliyor ? t("hesaplaniyor") : t("geriAl")}
      </Button>
      {hata ? (
        <p
          className={`flex items-center gap-2 rounded-md p-2 text-sm ${DURUM_KUTUSU.olumsuz} ${DURUM_YAZISI.olumsuz}`}
        >
          <TriangleAlert className="size-4 shrink-0" />
          {hata}
        </p>
      ) : null}
    </div>
  );
}
