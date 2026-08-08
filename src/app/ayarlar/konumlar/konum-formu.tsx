"use client";

import { useActionState, useEffect, useRef } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { konumEkle, type KonumDurumu } from "./actions";

export function KonumFormu() {
  const [durum, formAction, bekliyor] = useActionState<KonumDurumu, FormData>(
    konumEkle,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);

  // Kayıt başarılıysa alanları temizle ki arka arkaya raf girmek kolay olsun.
  useEffect(() => {
    if (durum.basari) formRef.current?.reset();
  }, [durum]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="konum-code">Raf kodu *</Label>
          <Input
            id="konum-code"
            name="code"
            placeholder="A-01"
            autoComplete="off"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="konum-name">Ad</Label>
          <Input
            id="konum-name"
            name="name"
            placeholder="Salon dolabı üst raf"
            autoComplete="off"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="konum-description">Açıklama</Label>
        <Input
          id="konum-description"
          name="description"
          placeholder="İsteğe bağlı"
          autoComplete="off"
        />
      </div>

      {durum.hatalar?.length ? (
        <div
          role="alert"
          className="border-destructive/50 bg-destructive/10 text-destructive rounded-md border p-3 text-sm"
        >
          <ul className="list-inside list-disc space-y-1">
            {durum.hatalar.map((hata, i) => (
              <li key={i}>{hata}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {durum.basari ? (
        <p className="rounded-md border border-emerald-500/50 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400">
          {durum.basari}
        </p>
      ) : null}

      <Button type="submit" disabled={bekliyor}>
        <Plus />
        {bekliyor ? "Ekleniyor..." : "Raf Ekle"}
      </Button>
    </form>
  );
}
