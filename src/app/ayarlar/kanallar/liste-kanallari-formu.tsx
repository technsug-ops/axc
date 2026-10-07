"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { formGonderimi } from "@/lib/form-gonderimi";
import { DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";

import { listeKanallariniKaydet, type ListeKanallariDurumu } from "./actions";

/**
 * ÜRÜN LİSTESİNDE GÖSTERİLECEK PAZARYERLERİ (kullanıcı isteği 07.10.2026).
 * Üç sıralı seçim: 1. satır, 2. satır, 3. satır. «—» = o satır boş. Hepsi boş
 * bırakılırsa sütun listeden kalkar (bilerek seçim — sessiz değil, kaydedince
 * söylenir). Seçenekler sistemdeki aktif kanalların TAMAMI: yeni pazaryeri
 * eklendiğinde burada kendiliğinden çıkar.
 */
export function ListeKanallariFormu({
  kanallar,
  secili,
}: {
  kanallar: { code: string; name: string; linkVar: boolean }[];
  secili: string[];
}) {
  const t = useTranslations("ListeKanallari");
  const [durum, formAction, bekliyor] = useActionState<ListeKanallariDurumu, FormData>(listeKanallariniKaydet, {});

  return (
    <form onSubmit={formGonderimi(formAction)} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-1.5">
            <Label htmlFor={`kanal${i + 1}`}>{t("sira", { sira: i + 1 })}</Label>
            <select
              id={`kanal${i + 1}`}
              name={`kanal${i + 1}`}
              defaultValue={secili[i] ?? ""}
              className="border-input bg-background h-11 w-full rounded-lg border px-3 text-sm md:h-9"
            >
              <option value="">{t("bos")}</option>
              {kanallar.map((k) => (
                <option key={k.code} value={k.code}>
                  {k.linkVar ? k.name : t("linkYokEki", { kanal: k.name })}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <p className="text-muted-foreground text-xs">{t("aciklama")}</p>
      {durum.hata ? (
        <p role="alert" className={`rounded-lg p-3 text-sm ${DURUM_KUTUSU.olumsuz} ${DURUM_YAZISI.olumsuz}`}>{durum.hata}</p>
      ) : null}
      {durum.basari ? (
        <p role="status" className={`rounded-lg p-3 text-sm ${DURUM_KUTUSU.olumlu} ${DURUM_YAZISI.olumlu}`}>{durum.basari}</p>
      ) : null}
      <Button type="submit" disabled={bekliyor} className="h-11 md:h-9">
        {t("kaydet")}
      </Button>
    </form>
  );
}
