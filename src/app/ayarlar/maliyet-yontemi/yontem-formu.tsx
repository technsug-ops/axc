"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { TriangleAlert } from "lucide-react";

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
import { DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";
import { LOT_KIPLERI, type LotKipi } from "@/lib/lot-kipi";
import { YONTEM_ISRAR_SEBEPLERI } from "@/lib/maliyet-yontemi-kapisi";
import type { MaliyetYontemi } from "@/lib/maliyet-yontemi";

import { yontemiDegistir, type YontemSonucu } from "./eylemler";

/**
 * ============================================================================
 *  MALİYET YÖNTEMİ / LOT KİPİ FORMU (K115)
 * ----------------------------------------------------------------------------
 *  ⚠ ISRAR BLOĞU YALNIZ YÖNTEM DEĞİŞİMİNDE — lot kipi bir GÖRÜNÜM
 *  politikasıdır, maliyeti değiştirmez, geçmişi bölmez. Onu da ısrara
 *  bağlamak uyarıyı ucuzlatır ve okunmaz hâle getirir.
 *
 *  ⚠ KİLİTLİ DÜĞME SESSİZ KALMAZ (İlke #5): niye ilerlemediği ve nasıl
 *  ilerleyeceği ekranda yazılı.
 * ============================================================================
 */
export function YontemFormu({
  mevcutYontem,
  mevcutKip,
  acikYontemler,
  duraksama,
}: {
  mevcutYontem: MaliyetYontemi;
  mevcutKip: LotKipi;
  /** ⛔ Bugün yalnız `FIFO` — kapı GÖVDEDE, bu liste onun yansıması. */
  acikYontemler: MaliyetYontemi[];
  /**
   * Yöntem değişirse ne olacağı — sunucuda ÖLÇÜLDÜ, formda tahmin edilmiyor.
   * `null` ise defter boş (ilk kurulum) ve ısrar hiç istenmez.
   */
  duraksama: { agirlik: "SINIRDA" | "DONEM_ORTASI"; etkilenen: number } | null;
}) {
  const t = useTranslations("MaliyetYontemi");
  const ortak = useTranslations("Ortak");

  const [sonuc, eylem, bekliyor] = useActionState<YontemSonucu, FormData>(
    yontemiDegistir,
    {},
  );

  const [yontem, setYontem] = useState<MaliyetYontemi>(mevcutYontem);
  const [kip, setKip] = useState<LotKipi>(mevcutKip);
  const [onay, setOnay] = useState(false);
  const [sebep, setSebep] = useState("");
  const [aciklama, setAciklama] = useState("");

  const yontemDegisti = yontem !== mevcutYontem;
  const israrGerek = yontemDegisti && duraksama !== null;
  /** `DIGER` seçildiyse açıklama zorunlu — sebepsiz istisna kusurdur. */
  const israrTamam =
    !israrGerek ||
    (onay && sebep !== "" && (sebep !== "DIGER" || aciklama.trim() !== ""));

  const degisiklikVar = yontemDegisti || kip !== mevcutKip;

  /**
   * ⚠ ORTALAMA SEÇİLİNCE LOT KİPİ ANLAMSIZLAŞIR — ve gri bırakılıp
   * susulmaz. Sessiz bir gri kutu "bozuk" sanılır (İlke #5).
   */
  const kipAnlamli = yontem === "FIFO";

  return (
    <form action={eylem} className="max-w-2xl space-y-6">
      {/* ─── MALİYET YÖNTEMİ ─────────────────────────────────────────── */}
      <div className="space-y-2">
        <Label htmlFor="maliyetYontemi">{t("yontemEtiketi")}</Label>
        <Select
          value={yontem}
          onValueChange={(d) => setYontem(d as MaliyetYontemi)}
        >
          <SelectTrigger id="maliyetYontemi" className="h-11 w-full md:h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {acikYontemler.map((y) => (
              <SelectItem key={y} value={y}>
                {t(`yontem${y}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input type="hidden" name="maliyetYontemi" value={yontem} />
        <p className="text-muted-foreground text-xs">{t(`yontemAciklama${yontem}`)}</p>
        {/*
          ⚠ EKSİK SEÇENEK SESSİZ BIRAKILMAZ. Listede olmayan bir yöntemi hiç
          anmamak, okuyanı "sistem sadece FIFO biliyor" sanmaya bırakırdı.
          Niye kapalı olduğu YAZILI.
        */}
        <p className="text-muted-foreground text-xs">{t("ortalamaHenuzKapali")}</p>
      </div>

      {/* ─── LOT KİPİ ────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <Label htmlFor="lotKipi">{t("kipEtiketi")}</Label>
        <Select
          value={kip}
          onValueChange={(d) => setKip(d as LotKipi)}
          disabled={!kipAnlamli}
        >
          <SelectTrigger id="lotKipi" className="h-11 w-full md:h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LOT_KIPLERI.map((k) => (
              <SelectItem key={k} value={k}>
                {t(`kip${k}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input type="hidden" name="lotKipi" value={kip} />
        <p className="text-muted-foreground text-xs">{t(`kipAciklama${kip}`)}</p>
        {!kipAnlamli ? (
          <p className={`text-xs ${DURUM_YAZISI.uyari}`}>{t("kipOrtalamada")}</p>
        ) : null}
      </div>

      {/* ─── ISRAR — CİDDİ UYARI, KİLİT DEĞİL ────────────────────────── */}
      {israrGerek && duraksama !== null ? (
        <div className={`space-y-3 rounded-md border p-4 ${DURUM_KUTUSU.uyari}`}>
          <p className="flex items-start gap-2 text-sm font-medium">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            {duraksama.agirlik === "DONEM_ORTASI"
              ? t("uyariDonemOrtasi", { sayi: duraksama.etkilenen })
              : t("uyariSinirda", { sayi: duraksama.etkilenen })}
          </p>
          {/* ⛔ GEÇMİŞ YENİDEN HESAPLANMAZ — her iki ağırlıkta da söylenir. */}
          <p className="text-xs">{t("gecmisDegismez")}</p>

          <div className="space-y-1">
            <Label htmlFor="yontemSebep">{t("sebepEtiketi")}</Label>
            <Select value={sebep} onValueChange={setSebep}>
              <SelectTrigger id="yontemSebep" className="h-11 w-full md:h-10">
                <SelectValue placeholder={t("sebepSec")} />
              </SelectTrigger>
              <SelectContent>
                {YONTEM_ISRAR_SEBEPLERI.map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(`sebep${s}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" name="yontemSebep" value={sebep} />
          </div>

          {sebep === "DIGER" ? (
            <div className="space-y-1">
              <Label htmlFor="yontemAciklama">{t("aciklamaEtiketi")}</Label>
              <Input
                id="yontemAciklama"
                name="yontemAciklama"
                value={aciklama}
                onChange={(e) => setAciklama(e.target.value)}
                className="h-11 md:h-10"
              />
            </div>
          ) : (
            <input type="hidden" name="yontemAciklama" value="" />
          )}

          {/*
            ⚠ DÜZ `<input type="checkbox">` — dönem ısrar bloğuyla AYNI
            (İlke #10). Depoda shadcn `Checkbox` bileşeni YOK; kendi
            kutumu çizseydim aynı onay iki ekranda iki farklı görünürdü.
          */}
          <label className="flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="checkbox"
              name="yontemOnay"
              value="1"
              className="mt-0.5 size-4 shrink-0"
              checked={onay}
              onChange={(e) => setOnay(e.target.checked)}
            />
            <span>{t("onayMetni")}</span>
          </label>
        </div>
      ) : null}

      {/* ⚠ KİLİTLİ DÜĞME SESSİZ KALMAZ: sebebi hemen altında yazar. */}
      <div className="space-y-1">
        <Button
          type="submit"
          className="h-11 md:h-10"
          disabled={bekliyor || !degisiklikVar || !israrTamam}
        >
          {bekliyor ? ortak("kaydediliyor") : ortak("degisiklikleriKaydet")}
        </Button>
        {!degisiklikVar ? (
          <p className="text-muted-foreground text-xs">{t("degisiklikYokIpucu")}</p>
        ) : !israrTamam ? (
          <p className={`text-xs ${DURUM_YAZISI.uyari}`}>{t("israrEksik")}</p>
        ) : null}
      </div>

      {sonuc.hata ? (
        <p className={`text-sm ${DURUM_YAZISI.olumsuz}`}>{sonuc.hata}</p>
      ) : null}
      {sonuc.basari ? (
        <p className={`text-sm ${DURUM_YAZISI.olumlu}`}>{sonuc.basari}</p>
      ) : null}
    </form>
  );
}
