"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";

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

import { kanalHesabiEkle, type KanalHesabiDurumu } from "./actions";

export type KanalSecenegi = { id: string; name: string };

const BOS = {
  channelId: "",
  paraBirimi: "TRY" as "TRY" | "EUR",
  name: "",
  code: "",
  externalId: "",
};

export function KanalHesabiFormu({ kanallar }: { kanallar: KanalSecenegi[] }) {
  const [durum, formAction, bekliyor] = useActionState<
    KanalHesabiDurumu,
    FormData
  >(kanalHesabiEkle, {});

  const [alanlar, setAlanlar] = useState(BOS);

  // Başarılı kayıttan sonra formu sıfırla. Render sırasında ayarlıyoruz;
  // useEffect içinde setState çağırmak zincirleme render üretirdi.
  const [sonDurum, setSonDurum] = useState(durum);
  if (sonDurum !== durum) {
    setSonDurum(durum);
    if (durum.basari) setAlanlar(BOS);
  }

  function guncelle(degisim: Partial<typeof BOS>) {
    setAlanlar((onceki) => ({ ...onceki, ...degisim }));
  }

  return (
    <form action={formAction} className="space-y-4">
      {/* Radix Select kontrollü; değerleri gizli alanlarla gönderiyoruz. */}
      <input type="hidden" name="channelId" value={alanlar.channelId} />
      <input type="hidden" name="defaultCurrency" value={alanlar.paraBirimi} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="hesap-kanal">Kanal *</Label>
          <Select
            value={alanlar.channelId}
            onValueChange={(d) => guncelle({ channelId: d })}
          >
            <SelectTrigger id="hesap-kanal" className="w-full">
              <SelectValue placeholder="Pazaryeri seçin" />
            </SelectTrigger>
            <SelectContent>
              {kanallar.map((kanal) => (
                <SelectItem key={kanal.id} value={kanal.id}>
                  {kanal.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="hesap-para">Para birimi *</Label>
          <Select
            value={alanlar.paraBirimi}
            onValueChange={(d) =>
              guncelle({ paraBirimi: d as "TRY" | "EUR" })
            }
          >
            <SelectTrigger id="hesap-para" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TRY">TRY</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="hesap-ad">Hesap adı *</Label>
          <Input
            id="hesap-ad"
            name="name"
            value={alanlar.name}
            onChange={(e) => guncelle({ name: e.target.value })}
            placeholder="Ana Mağaza"
            autoComplete="off"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="hesap-kod">Hesap kodu *</Label>
          <Input
            id="hesap-kod"
            name="code"
            value={alanlar.code}
            onChange={(e) => guncelle({ code: e.target.value })}
            placeholder="ANA"
            autoComplete="off"
          />
          <p className="text-muted-foreground text-xs">
            Kanal içinde benzersiz kısa kod.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="hesap-dis-id">Pazaryeri satıcı kimliği</Label>
        <Input
          id="hesap-dis-id"
          name="externalId"
          value={alanlar.externalId}
          onChange={(e) => guncelle({ externalId: e.target.value })}
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
        {bekliyor ? "Ekleniyor..." : "Hesap Ekle"}
      </Button>
    </form>
  );
}
