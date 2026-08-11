"use client";

import { startTransition, useActionState, useState } from "react";
import { useTranslations } from "next-intl";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { tazminatDurumDegistir, type TazminatDurumu } from "./actions";

const DURUMLAR = ["OPEN", "CLAIMED", "ACCEPTED", "REJECTED", "SETTLED"] as const;

/**
 * Satır içi durum değiştirme — talebin hayatı bu beş adımda geçer ve her
 * adım tek tıkla değişir (Kullanıcı Kolaylığı #9: az tıkla).
 *
 * Sonuç EKRANDA yazılır; sessiz başarı yasak (#5).
 */
export function DurumSecici({
  kayitId,
  mevcut,
}: {
  kayitId: string;
  mevcut: string;
}) {
  const tDurum = useTranslations("TazminatDurumu");

  const [durum, formAction, bekliyor] = useActionState<
    TazminatDurumu,
    FormData
  >(tazminatDurumDegistir, {});
  const [secili, setSecili] = useState(mevcut);

  function degistir(yeni: string) {
    setSecili(yeni);
    const veri = new FormData();
    veri.set("id", kayitId);
    veri.set("status", yeni);
    // startTransition şart: useActionState'in action'ı geçiş dışında
    // çağrılırsa React hata basar ve bekleme durumu hiç görünmez.
    startTransition(() => formAction(veri));
  }

  return (
    <div className="space-y-1">
      <Select value={secili} onValueChange={degistir} disabled={bekliyor}>
        <SelectTrigger className="h-9 w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DURUMLAR.map((d) => (
            <SelectItem key={d} value={d}>
              {tDurum(d)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

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
