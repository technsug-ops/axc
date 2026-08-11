"use client";

import { startTransition, useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, Merge } from "lucide-react";

import { HataOzeti } from "@/components/hata-ozeti";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  birlestirmeOnizle,
  birlestirmeyiUygula,
  type BirlestirDurumu,
} from "./actions";

export type RafSecenegi = { id: string; kod: string; ad: string | null };

/**
 * İki adımlı: ÖNİZLE → ONAYLA. Yazma işlemi ancak kullanıcı ne olacağını
 * gördükten sonra çalışır (anayasa: önizle-önce-yaz + yıkıcı eylemde onay).
 *
 * Önizleme "kaç geçmiş kaydın DEĞİŞMEYECEĞİNİ" de yazar — asıl merak edilen
 * budur ve cevabı "hiçbiri değişmeyecek"tir.
 */
export function BirlestirFormu({ raflar }: { raflar: RafSecenegi[] }) {
  const t = useTranslations("RafBirlestir");
  const ortak = useTranslations("Ortak");

  const [kaynakId, setKaynakId] = useState("");
  const [hedefId, setHedefId] = useState("");

  const [onizleme, onizleAction, onizleniyor] = useActionState<
    BirlestirDurumu,
    FormData
  >(birlestirmeOnizle, {});
  const [uygulama, uygulaAction, uygulaniyor] = useActionState<
    BirlestirDurumu,
    FormData
  >(birlestirmeyiUygula, {});

  function alanlar() {
    const veri = new FormData();
    veri.set("kaynakId", kaynakId);
    veri.set("hedefId", hedefId);
    return veri;
  }

  const gosterilecek = onizleme.onizleme;

  return (
    <div className="space-y-4">
      <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
        <div className="space-y-2">
          <Label htmlFor="birlestir-kaynak">{t("kaynakRaf")}</Label>
          <Select value={kaynakId} onValueChange={setKaynakId}>
            <SelectTrigger id="birlestir-kaynak" className="w-full">
              <SelectValue placeholder={t("rafSecin")} />
            </SelectTrigger>
            <SelectContent>
              {raflar.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.kod}
                  {r.ad ? ` — ${r.ad}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-xs">{t("kaynakNotu")}</p>
        </div>

        <div className="text-muted-foreground hidden pb-9 sm:block">
          <ArrowRight className="size-5" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="birlestir-hedef">{t("hedefRaf")}</Label>
          <Select value={hedefId} onValueChange={setHedefId}>
            <SelectTrigger id="birlestir-hedef" className="w-full">
              <SelectValue placeholder={t("rafSecin")} />
            </SelectTrigger>
            <SelectContent>
              {raflar.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.kod}
                  {r.ad ? ` — ${r.ad}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-xs">{t("hedefNotu")}</p>
        </div>
      </div>

      <Button
        type="button"
        variant="secondary"
        disabled={onizleniyor || !kaynakId || !hedefId}
        onClick={() => startTransition(() => onizleAction(alanlar()))}
      >
        {onizleniyor ? ortak("bekleyin") : t("onizle")}
      </Button>

      <HataOzeti hatalar={onizleme.hatalar} />
      <HataOzeti hatalar={uygulama.hatalar} />

      {gosterilecek && !uygulama.basari ? (
        <div className="space-y-3 rounded-md border border-amber-500/50 bg-amber-500/10 p-4">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
            {t("onizlemeBasligi", {
              kaynak: gosterilecek.kaynakKod,
              hedef: gosterilecek.hedefKod,
            })}
          </p>
          <ul className="list-inside list-disc space-y-1 text-sm text-amber-900/90 dark:text-amber-200/90">
            <li>
              {t("tasinacak", { sayi: gosterilecek.tasinacakVaryant })}
            </li>
            <li>
              {t("kalacak", {
                hareket: gosterilecek.kalanHareket,
                iade: gosterilecek.kalanIade,
              })}
            </li>
            <li>{t("kaynakPasif", { kod: gosterilecek.kaynakKod })}</li>
          </ul>
          <Button
            type="button"
            disabled={uygulaniyor}
            onClick={() => startTransition(() => uygulaAction(alanlar()))}
          >
            <Merge />
            {uygulaniyor ? ortak("bekleyin") : t("onaylaVeBirlestir")}
          </Button>
        </div>
      ) : null}

      {uygulama.basari ? (
        <p className="rounded-md border border-emerald-500/50 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400">
          {uygulama.basari}
        </p>
      ) : null}
    </div>
  );
}
