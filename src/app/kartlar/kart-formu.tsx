"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";

import { HataOzeti } from "@/components/hata-ozeti";
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

  const t = useTranslations("Kart");
  const ortak = useTranslations("Ortak");

  const ilk = baslangic ?? BOS;
  const [paraBirimi, setParaBirimi] = useState<"TRY" | "EUR">(ilk.currency);
  const [limitParaBirimi, setLimitParaBirimi] = useState<"TRY" | "EUR">(
    ilk.creditLimitCurrency,
  );

  return (
    <form action={formAction} className="space-y-6">
      {kartId ? <input type="hidden" name="id" value={kartId} /> : null}
      <input type="hidden" name="currency" value={paraBirimi} />
      <input type="hidden" name="creditLimitCurrency" value={limitParaBirimi} />

      <Card>
        <CardHeader>
          <CardTitle>{t("kartBilgileri")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="kart-label">{t("kartEtiketi")} *</Label>
              <Input
                id="kart-label"
                name="label"
                defaultValue={ilk.label}
                placeholder="Garanti Bonus ***4321"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kart-banka">{ortak("banka")}</Label>
              <Input
                id="kart-banka"
                name="bankName"
                defaultValue={ilk.bankName}
                placeholder="Garanti BBVA"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kart-last4">{t("son4Hane")} *</Label>
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
              <Label htmlFor="kart-sahip">{t("kartSahibi")}</Label>
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
            {t("guvenlikNotu")}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("ekstreVeLimit")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="kart-para">{t("kartParaBirimi")} *</Label>
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
              <Label htmlFor="kart-limit">{ortak("limit")}</Label>
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
                  onValueChange={(d) => setLimitParaBirimi(d as "TRY" | "EUR")}
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
              <Label htmlFor="kart-kesim">{t("kesimGunu")}</Label>
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
              <Label htmlFor="kart-odeme">{t("odemeGunu")}</Label>
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
          <p className="text-muted-foreground text-xs">{t("gunNotu")}</p>
        </CardContent>
      </Card>

      <HataOzeti hatalar={durum.hatalar} />

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={bekliyor}>
          {bekliyor ? ortak("kaydediliyor") : gonderEtiketi}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href={kartId ? `/kartlar/${kartId}` : "/kartlar"}>
            {ortak("vazgec")}
          </Link>
        </Button>
      </div>
    </form>
  );
}
