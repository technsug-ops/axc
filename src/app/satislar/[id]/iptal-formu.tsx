"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Ban, Check, TriangleAlert, Undo2, X } from "lucide-react";

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
import { ACIKLAMA_ZORUNLU, IPTAL_SEBEPLERI } from "@/lib/satis-iptali";
import type { SatisIptalSebebi } from "@/generated/prisma/enums";

import {
  iptaliOnizle,
  iptaliUygula,
  type IptalOnizlemeSonucu,
} from "./iptal-actions";

/**
 * ============================================================================
 *  SATIŞ İPTALİ FORMU
 * ----------------------------------------------------------------------------
 *  Kullanıcı ihtiyacı: "müşteri daha kargoya vermeden iptal etti."
 *
 *  Düzenleme formundaki desen devralındı: taksonomi → ÖNİZLEME → onay.
 *  Onay düğmesi plan çizilmeden aktif olmaz; imza da önizlemeden gelir.
 *
 *  ── İADELİ SATIŞTA DUVAR DEĞİL, YOL ─────────────────────────────────────
 *  İptal engellendiğinde "yapamazsın" demek yetmez. Ekran iade kaydına
 *  bağlantı verir: "bu satışın iadesi var — iptal yerine iade akışı
 *  kullanılır."
 * ============================================================================
 */
export function IptalFormu({ saleId }: { saleId: string }) {
  const t = useTranslations("SatisIptali");
  const ortak = useTranslations("Ortak");
  const bicim = useBicim();
  const router = useRouter();
  const [bekliyor, basla] = useTransition();

  const [acik, setAcik] = useState(false);
  const [sebep, setSebep] = useState<SatisIptalSebebi | "">("");
  const [not, setNot] = useState("");
  const [onizleme, setOnizleme] = useState<IptalOnizlemeSonucu | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [iade, setIade] = useState<{ id: string; kod: string | null } | null>(null);

  /** Alan değişince önizleme GEÇERSİZ olur — eski plana onay verilemesin. */
  function sifirla() {
    setOnizleme(null);
    setHata(null);
    setIade(null);
  }

  const aciklamaZorunlu =
    sebep !== "" && (ACIKLAMA_ZORUNLU as readonly string[]).includes(sebep);

  if (!acik) {
    return (
      <Button
        variant="outline"
        className="h-11"
        onClick={() => setAcik(true)}
      >
        <Ban />
        {t("iptalEt")}
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

      {/* İPTAL İADE DEĞİLDİR — fark ekranda yazılı. */}
      <p className="text-muted-foreground text-xs">{t("iptalIadeDegil")}</p>

      {/* --------------------------- SEBEP --------------------------- */}
      <div className="space-y-2">
        <span className="text-muted-foreground block text-xs">{t("sebep")}</span>
        <Select
          value={sebep}
          onValueChange={(d) => {
            sifirla();
            setSebep(d as SatisIptalSebebi);
          }}
        >
          <SelectTrigger className="h-11 w-full">
            <SelectValue placeholder={t("sebepSecin")} />
          </SelectTrigger>
          <SelectContent>
            {IPTAL_SEBEPLERI.map((s) => (
              <SelectItem key={s} value={s}>
                {t(`sebep_${s}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* MAGAZA_DIGER açıklama ZORUNLU — kural saf katmanda da aynı. */}
        <label className="block text-sm">
          <span className="text-muted-foreground block text-xs">
            {aciklamaZorunlu ? t("aciklamaZorunlu") : t("aciklamaIstege")}
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
              const c = await iptaliOnizle(
                saleId,
                sebep === "" ? null : sebep,
                not.trim() === "" ? null : not,
              );
              setOnizleme(c);
              if (!c.tamam) {
                setHata(c.hata);
                setIade(c.iade ?? null);
              }
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
              const c = await iptaliUygula(
                saleId,
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

      {/* ------------------------- ÖNİZLEME -------------------------- */}
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
                      : bicim.para(Number(h.birimMaliyet), h.paraBirimi ?? "TRY"),
                })}
              </li>
            ))}
          </ul>

          {/* EK 2 — null "?" ve "hesaplanamadı" olarak görünür, boş DEĞİL. */}
          <div className="border-t pt-2">
            {t("ciroEtkisi", {
              tutar: bicim.para(onizleme.etki.ciro, onizleme.etki.paraBirimi),
            })}
          </div>
          <div>
            {onizleme.etki.net2 === null
              ? t("netHesaplanamadi")
              : t("netEtkisi", {
                  tutar: bicim.para(onizleme.etki.net2, onizleme.etki.paraBirimi),
                })}
          </div>
          {onizleme.etki.hakedisEslesmisMi ? (
            <p className={`rounded-md p-2 text-xs ${DURUM_KUTUSU.uyari} ${DURUM_YAZISI.uyari}`}>
              {t("hakedisUyarisi")}
            </p>
          ) : null}
        </div>
      ) : null}

      {/* --------------------- ENGEL: YOL GÖSTER --------------------- */}
      {hata ? (
        <div className={`space-y-2 rounded-md p-2 text-sm ${DURUM_KUTUSU.olumsuz} ${DURUM_YAZISI.olumsuz}`}>
          <p className="flex items-center gap-2">
            <TriangleAlert className="size-4 shrink-0" />
            {hata}
          </p>
          {/* İade engeli: kullanıcı O KAYDA gidebilmeli. */}
          {iade ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/iadeler?bq=${encodeURIComponent(iade.kod ?? "")}`}>
                <Undo2 />
                {t("iadeyeGit", { kod: iade.kod ?? "" })}
              </Link>
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
