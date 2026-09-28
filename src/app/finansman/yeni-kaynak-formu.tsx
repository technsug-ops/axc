"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FINANSMAN_TURLERI, type FinansmanBirimi } from "@/lib/finansman/kural";

import { kaynakEkle, type FinansmanSonucu } from "./eylemler";

const SECIM = "border-input bg-background h-11 w-full rounded-md border px-3 text-sm md:h-9";

/**
 * Yeni finansman kaynağı — kapalı başlar, düğmeyle açılır (liste ekranı
 * formla dolmasın). Kayıt sonrası kaynağın detayına gidilir: ilk iş orada
 * GİRİŞ ya da ödeme planı eklemektir.
 */
export function YeniKaynakFormu({ birimler }: { birimler: FinansmanBirimi[] }) {
  const t = useTranslations("Finansman");
  const ortak = useTranslations("Ortak");
  const [acik, setAcik] = useState(false);
  const [durum, eylem, bekliyor] = useActionState<FinansmanSonucu, FormData>(kaynakEkle, { tamam: false });

  if (!acik) {
    return (
      <Button onClick={() => setAcik(true)} className="min-h-11 md:min-h-9">
        <Plus />
        {t("yeniKaynak")}
      </Button>
    );
  }

  return (
    <form action={eylem} className="bg-card max-w-2xl space-y-3 rounded-lg border p-4">
      <h2 className="font-medium">{t("yeniKaynak")}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="fin-tur">{t("alan.tur")}</Label>
          <select id="fin-tur" name="tur" className={SECIM} defaultValue="" required>
            <option value="">{t("alan.turSec")}</option>
            {FINANSMAN_TURLERI.map((x) => (
              <option key={x} value={x}>
                {t(`tur.${x}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="fin-ad">{t("alan.kaynakAdi")}</Label>
          <Input id="fin-ad" name="kaynakAdi" maxLength={191} placeholder={t("alan.kaynakAdiOrnek")} required className="min-h-11 md:min-h-9" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="fin-para">{t("alan.birim")}</Label>
          {/* K304-②: USD ve gram altın yalnız Ayarlar → Özellikler açıkken listede. */}
          <select id="fin-para" name="birim" className={SECIM} defaultValue="TRY">
            {birimler.map((b) => (
              <option key={b} value={b}>
                {t(`birim.${b}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="fin-not">{t("alan.not")}</Label>
          <Textarea id="fin-not" name="note" rows={2} />
        </div>
      </div>
      {durum.hata ? (
        <p className="text-destructive text-sm" role="alert">
          {durum.hata}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={bekliyor} className="min-h-11 md:min-h-9">
          {bekliyor ? ortak("kaydediliyor") : t("kaynakKaydet")}
        </Button>
        <Button type="button" variant="outline" onClick={() => setAcik(false)} className="min-h-11 md:min-h-9">
          {ortak("vazgec")}
        </Button>
      </div>
    </form>
  );
}
