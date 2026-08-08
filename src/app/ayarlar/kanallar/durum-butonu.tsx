"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";

import { kanalHesabiDurumDegistir, type KanalHesabiDurumu } from "./actions";

/** Hesabı aktif/pasif yapar. Silme yok — alımlarla ilişkili olabilir. */
export function DurumButonu({
  hesapId,
  aktifMi,
}: {
  hesapId: string;
  aktifMi: boolean;
}) {
  const [, formAction, bekliyor] = useActionState<KanalHesabiDurumu, FormData>(
    kanalHesabiDurumDegistir,
    {},
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={hesapId} />
      <Button type="submit" variant="ghost" size="sm" disabled={bekliyor}>
        {aktifMi ? "Pasife al" : "Aktifleştir"}
      </Button>
    </form>
  );
}
