"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";

import { kartDurumDegistir, type KartDurumu } from "./actions";

/**
 * Kartı aktif/pasif yapar.
 * Silme YOK: kart alımlara bağlı, silinirse geçmiş alımın hangi kartla
 * ödendiği bilgisi kaybolur.
 */
export function KartDurumButonu({
  kartId,
  aktifMi,
}: {
  kartId: string;
  aktifMi: boolean;
}) {
  const [, formAction, bekliyor] = useActionState<KartDurumu, FormData>(
    kartDurumDegistir,
    {},
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={kartId} />
      <Button
        type="submit"
        variant={aktifMi ? "outline" : "default"}
        disabled={bekliyor}
      >
        {aktifMi ? "Pasife al" : "Aktifleştir"}
      </Button>
    </form>
  );
}
