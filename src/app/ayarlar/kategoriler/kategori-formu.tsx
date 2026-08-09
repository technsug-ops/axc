"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";

import { HataOzeti } from "@/components/hata-ozeti";
import { Button } from "@/components/ui/button";
import { formGonderimi } from "@/lib/form-gonderimi";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { kategoriEkle, type KategoriDurumu } from "./actions";

const BOS = { name: "", vatRate: "" };

export function KategoriFormu() {
  const [durum, formAction, bekliyor] = useActionState<
    KategoriDurumu,
    FormData
  >(kategoriEkle, {});

  const t = useTranslations("Kategori");
  const ortak = useTranslations("Ortak");

  const [alanlar, setAlanlar] = useState(BOS);

  // Başarılı kayıttan sonra alanları temizle — arka arkaya kategori girmek
  // kolay olsun. Render sırasında ayarlanıyor; useEffect zincirleme render
  // üretirdi.
  const [sonDurum, setSonDurum] = useState(durum);
  if (sonDurum !== durum) {
    setSonDurum(durum);
    if (durum.basari) setAlanlar(BOS);
  }

  return (
    <form onSubmit={formGonderimi(formAction)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="kategori-ad">{ortak("ad")} *</Label>
          <Input
            id="kategori-ad"
            name="name"
            value={alanlar.name}
            onChange={(e) =>
              setAlanlar((o) => ({ ...o, name: e.target.value }))
            }
            placeholder={t("adIpucu")}
            autoComplete="off"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="kategori-oran">{t("kdvOrani")} *</Label>
          <Input
            id="kategori-oran"
            name="vatRate"
            value={alanlar.vatRate}
            onChange={(e) =>
              setAlanlar((o) => ({ ...o, vatRate: e.target.value }))
            }
            inputMode="decimal"
            placeholder={t("oranIpucu")}
            autoComplete="off"
          />
        </div>
      </div>

      <HataOzeti hatalar={durum.hatalar} />

      {durum.basari ? (
        <p className="rounded-md border border-emerald-500/50 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400">
          {durum.basari}
        </p>
      ) : null}

      <Button type="submit" disabled={bekliyor}>
        <Plus />
        {bekliyor ? ortak("ekleniyor") : t("kategoriEkle")}
      </Button>
    </form>
  );
}
