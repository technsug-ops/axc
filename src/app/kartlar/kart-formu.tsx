"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { KartDurumu } from "./actions";

export type KartGirdisi = {
  label: string;
  bankName: string;
  last4: string;
  holderName: string;
  currency: "TRY" | "EUR";
  creditLimitAmount: string;
  creditLimitCurrency: "TRY" | "EUR";
  statementDay: string;
  dueDay: string;
};

const BOS: KartGirdisi = {
  label: "",
  bankName: "",
  last4: "",
  holderName: "",
  currency: "TRY",
  creditLimitAmount: "",
  creditLimitCurrency: "TRY",
  statementDay: "",
  dueDay: "",
};

export function KartFormu({
  action,
  baslangic,
  kartId,
  gonderEtiketi,
}: {
  action: (durum: KartDurumu, formData: FormData) => Promise<KartDurumu>;
  baslangic?: KartGirdisi;
  kartId?: string;
  gonderEtiketi: string;
}) {
  const [durum, formAction, bekliyor] = useActionState<KartDurumu, FormData>(
    action,
    {},
  );

  const ilk = baslangic ?? BOS;
  const [paraBirimi, setParaBirimi] = useState<"TRY" | "EUR">(ilk.currency);
  const [limitParaBirimi, setLimitParaBirimi] = useState<"TRY" | "EUR">(
    ilk.creditLimitCurrency,
  );

  return (
    <form action={formAction} className="space-y-6">
      {kartId ? <input type="hidden" name="id" value={kartId} /> : null}
      <input type="hidden" name="currency" value={paraBirimi} />
      <input
        type="hidden"
        name="creditLimitCurrency"
        value={limitParaBirimi}
      />

      {durum.hatalar?.length ? (
        <div
          role="alert"
          className="border-destructive/50 bg-destructive/10 text-destructive rounded-md border p-4 text-sm"
        >
          <p className="mb-2 font-medium">Kaydedilemedi:</p>
          <ul className="list-inside list-disc space-y-1">
            {durum.hatalar.map((hata, i) => (
              <li key={i}>{hata}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Kart bilgileri</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="kart-label">Kart etiketi *</Label>
              <Input
                id="kart-label"
                name="label"
                defaultValue={ilk.label}
                placeholder="Garanti Bonus ***4321"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kart-banka">Banka</Label>
              <Input
                id="kart-banka"
                name="bankName"
                defaultValue={ilk.bankName}
                placeholder="Garanti BBVA"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kart-last4">Son 4 hane *</Label>
              <Input
                id="kart-last4"
                name="last4"
                defaultValue={ilk.last4}
                placeholder="4321"
                inputMode="numeric"
                maxLength={4}
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kart-sahip">Kart sahibi</Label>
              <Input
                id="kart-sahip"
                name="holderName"
                defaultValue={ilk.holderName}
                placeholder="Ad Soyad"
                autoComplete="off"
              />
            </div>
          </div>

          <div
            role="note"
            className="text-muted-foreground rounded-md border border-dashed p-3 text-xs"
          >
            Güvenlik gereği tam kart numarası, CVV ve son kullanma tarihi
            İSTENMEZ ve saklanmaz. Amaç yalnızca &quot;hangi kartla
            ödendi&quot; bilgisini taşımak; bunun için son 4 hane yeterlidir.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ekstre ve limit</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="kart-para">Kartın para birimi *</Label>
              <Select
                value={paraBirimi}
                onValueChange={(d) => setParaBirimi(d as "TRY" | "EUR")}
              >
                <SelectTrigger id="kart-para" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRY">TRY</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="kart-limit">Limit</Label>
              <div className="flex gap-2">
                <Input
                  id="kart-limit"
                  name="creditLimitAmount"
                  defaultValue={ilk.creditLimitAmount}
                  placeholder="50000"
                  inputMode="decimal"
                  autoComplete="off"
                />
                <Select
                  value={limitParaBirimi}
                  onValueChange={(d) =>
                    setLimitParaBirimi(d as "TRY" | "EUR")
                  }
                >
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRY">TRY</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="kart-kesim">Hesap kesim günü</Label>
              <Input
                id="kart-kesim"
                name="statementDay"
                defaultValue={ilk.statementDay}
                placeholder="15"
                inputMode="numeric"
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="kart-odeme">Son ödeme günü</Label>
              <Input
                id="kart-odeme"
                name="dueDay"
                defaultValue={ilk.dueDay}
                placeholder="25"
                inputMode="numeric"
                autoComplete="off"
              />
            </div>
          </div>
          <p className="text-muted-foreground text-xs">
            Kesim ve son ödeme günü, ileride &quot;faizsiz dönemi en uzun
            kart&quot; seçimini hesaplamak için kullanılacak. Ayın günü olarak
            girin (1-31).
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={bekliyor}>
          {bekliyor ? "Kaydediliyor..." : gonderEtiketi}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href={kartId ? `/kartlar/${kartId}` : "/kartlar"}>Vazgeç</Link>
        </Button>
      </div>
    </form>
  );
}
