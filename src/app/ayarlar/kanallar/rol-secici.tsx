"use client";

import Link from "next/link";
import { startTransition, useActionState } from "react";
import { useTranslations } from "next-intl";
import { ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";
import { formGonderimi } from "@/lib/form-gonderimi";

import {
  kanalHesabiRolDegistir,
  kanalHesabiVadeGuncelle,
  type KanalHesabiDurumu,
} from "./actions";

/**
 * ============================================================================
 *  HESAP ROLÜ — SATIR İÇİ DEĞİŞTİRME + ÇİFT ROL UYARISI
 * ----------------------------------------------------------------------------
 *  Üç durum var ve üçü de FARKLI görünür:
 *   ALIŞ / SATIŞ   — normal, tek rozet
 *   rol seçilmedi  — amber; bu hesap hiçbir formda listelenmez
 *   çift rol       — amber; geçmişte hem alım hem satış yapılmış.
 *                    "Normal bir durum değildir" (kullanıcı kararı
 *                    12.08.2026) ama kayıt silinmez: hangi kayıtların
 *                    olduğu gösterilir ve oraya bağlantı verilir.
 * ============================================================================
 */
export function RolSecici({
  hesap,
}: {
  hesap: {
    id: string;
    ad: string;
    alisIcin: boolean;
    satisIcin: boolean;
    alimSayisi: number;
    satisSayisi: number;
    payoutDays: number | null;
    isGunuMu: boolean;
  };
}) {
  const t = useTranslations("KanalHesabi");
  const ortak = useTranslations("Ortak");

  const [durum, formAction, bekliyor] = useActionState<
    KanalHesabiDurumu,
    FormData
  >(kanalHesabiRolDegistir, {});

  const [vadeDurum, vadeAction, vadeBekliyor] = useActionState<
    KanalHesabiDurumu,
    FormData
  >(kanalHesabiVadeGuncelle, {});

  function degistir(rol: "ALIS" | "SATIS") {
    const veri = new FormData();
    veri.set("id", hesap.id);
    veri.set("rol", rol);
    // startTransition şart: geçiş dışında çağrılırsa React hata basar.
    startTransition(() => formAction(veri));
  }

  const ciftRol = hesap.alisIcin && hesap.satisIcin;
  const rolsuz = !hesap.alisIcin && !hesap.satisIcin;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {ciftRol ? (
          <Badge
            variant="outline"
            className="border-amber-500/50 text-amber-700 dark:text-amber-400"
          >
            {t("ciftRol")}
          </Badge>
        ) : rolsuz ? (
          <Badge
            variant="outline"
            className="border-amber-500/50 text-amber-700 dark:text-amber-400"
          >
            {t("rolSecilmedi")}
          </Badge>
        ) : (
          <Badge variant="secondary">
            {hesap.alisIcin ? t("rolAlis") : t("rolSatis")}
          </Badge>
        )}

        {/* Rol değiştirme: yalnız değiştirilebilir olan taraf düğme olur. */}
        {!hesap.alisIcin || ciftRol ? (
          <Button
            variant="outline"
            size="sm"
            disabled={bekliyor}
            onClick={() => degistir("ALIS")}
          >
            {t("rolAlis")}
          </Button>
        ) : null}
        {!hesap.satisIcin || ciftRol ? (
          <Button
            variant="outline"
            size="sm"
            disabled={bekliyor}
            onClick={() => degistir("SATIS")}
          >
            {t("rolSatis")}
          </Button>
        ) : null}
      </div>

      {/* ÇİFT ROL — eyleme dönük: kayıtlara götürür. */}
      {ciftRol ? (
        <div className="space-y-2 rounded-md border border-amber-500/50 bg-amber-500/10 p-3">
          <p className="text-sm text-amber-900 dark:text-amber-200">
            {t("ciftRolMetin")}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/alimlar" target="_blank" rel="noopener">
                <ExternalLink />
                {t("ciftRolAlimlar", { sayi: hesap.alimSayisi })}
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/satislar" target="_blank" rel="noopener">
                <ExternalLink />
                {t("ciftRolSatislar", { sayi: hesap.satisSayisi })}
              </Link>
            </Button>
          </div>
        </div>
      ) : null}

      {/* VADE — YALNIZ SATIŞ HESABINDA. Alış hesabında "vade" diye bir şey
          yok; alanı göstermek olmayan bir kavramı varmış gibi sunardı. */}
      {hesap.satisIcin ? (
        <form
          onSubmit={formGonderimi(vadeAction)}
          className="space-y-1 border-t pt-2"
        >
          <input type="hidden" name="id" value={hesap.id} />
          <div className="text-muted-foreground text-xs">{t("vadeBaslik")}</div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              name="payoutDays"
              defaultValue={hesap.payoutDays === null ? "" : String(hesap.payoutDays)}
              placeholder={t("vadeIpucu")}
              inputMode="numeric"
              className="h-9 w-24"
              aria-label={t("vadeGun")}
            />
            <label className="flex items-center gap-1.5 text-xs">
              <input
                type="checkbox"
                name="isGunu"
                value="1"
                defaultChecked={hesap.isGunuMu}
                className="size-4"
              />
              {t("vadeIsGunu")}
            </label>
            <Button type="submit" variant="outline" size="sm" disabled={vadeBekliyor}>
              {vadeBekliyor ? ortak("kaydediliyor") : t("vadeKaydet")}
            </Button>
          </div>
          <p className="text-muted-foreground text-xs">{t("vadeNotu")}</p>
          {vadeDurum.basari ? (
            <p className="text-xs font-medium text-emerald-600" role="status">
              {vadeDurum.basari}
            </p>
          ) : null}
          {vadeDurum.hatalar?.length ? (
            <p className="text-destructive text-xs font-medium" role="alert">
              {vadeDurum.hatalar.join(" ")}
            </p>
          ) : null}
        </form>
      ) : null}

      {durum.basari ? (
        <p className="text-xs font-medium text-emerald-600" role="status">
          {durum.basari}
        </p>
      ) : null}
      {durum.hatalar?.length ? (
        <p className="text-destructive text-xs font-medium" role="alert">
          {durum.hatalar.join(" ")}
        </p>
      ) : null}
    </div>
  );
}
