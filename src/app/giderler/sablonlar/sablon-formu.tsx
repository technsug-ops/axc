"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, TriangleAlert } from "lucide-react";

import { HataOzeti } from "@/components/hata-ozeti";
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
import { formGonderimi } from "@/lib/form-gonderimi";

import { sablonEkle, type GiderDurumu } from "../actions";
import type { KategoriSecenegi } from "../gider-formu";
import { DURUM_KUTUSU } from "@/lib/renkler";

/**
 * Tekrarlayan gider şablonu formu.
 *
 * Şablon bir GİDER DEĞİLDİR — hiçbir toplama girmez, ayrı tabloda durur.
 * "Ayın kaçında ödenir" alanı yalnızca kopyalama tarihini önerir; boş
 * bırakılırsa kopyalama gününüz kullanılır.
 */
export function SablonFormu({
  kategoriler,
}: {
  kategoriler: KategoriSecenegi[];
}) {
  const t = useTranslations("Gider");
  const ortak = useTranslations("Ortak");
  const tUyari = useTranslations("Gider.uyarilar");

  const [durum, formAction, bekliyor] = useActionState<GiderDurumu, FormData>(
    sablonEkle,
    {},
  );

  const BOS = {
    name: "",
    categoryId: "",
    amount: "",
    vatRate: "",
    dayOfMonth: "",
    description: "",
  };
  const [alanlar, setAlanlar] = useState(BOS);
  const [paraBirimi, setParaBirimi] = useState("TRY");

  const [sonDurum, setSonDurum] = useState(durum);
  if (sonDurum !== durum) {
    setSonDurum(durum);
    if (durum.basari) {
      setAlanlar(BOS);
      setParaBirimi("TRY");
    }
  }

  const secili = kategoriler.find((k) => k.id === alanlar.categoryId);
  const uyari =
    secili?.uyariAnahtari && tUyari.has(secili.uyariAnahtari)
      ? tUyari(secili.uyariAnahtari)
      : null;

  function kategoriSec(id: string) {
    const kategori = kategoriler.find((k) => k.id === id);
    setAlanlar((o) => ({
      ...o,
      categoryId: id,
      vatRate: kategori ? kategori.kdvOrani : o.vatRate,
    }));
  }

  return (
    <form onSubmit={formGonderimi(formAction)} className="space-y-5">
      <input type="hidden" name="currency" value={paraBirimi} />
      <input type="hidden" name="categoryId" value={alanlar.categoryId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="sablon-ad">{t("sablonAdEtiketi")} *</Label>
          <Input
            id="sablon-ad"
            name="name"
            value={alanlar.name}
            onChange={(e) =>
              setAlanlar((o) => ({ ...o, name: e.target.value }))
            }
            placeholder={t("sablonAdIpucu")}
            autoComplete="off"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sablon-kategori">{t("kategoriEtiketi")} *</Label>
          <Select value={alanlar.categoryId} onValueChange={kategoriSec}>
            <SelectTrigger id="sablon-kategori" className="w-full">
              <SelectValue placeholder={t("kategoriSecin")} />
            </SelectTrigger>
            <SelectContent>
              {kategoriler.map((k) => (
                <SelectItem key={k.id} value={k.id}>
                  {k.ad}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {uyari ? (
        <p className={`flex gap-2 rounded-md p-3 text-sm ${DURUM_KUTUSU.uyari}`}>
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <span>{uyari}</span>
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="sablon-tutar">{t("tutarEtiketi")} *</Label>
          <Input
            id="sablon-tutar"
            name="amount"
            inputMode="decimal"
            value={alanlar.amount}
            onChange={(e) =>
              setAlanlar((o) => ({ ...o, amount: e.target.value }))
            }
            placeholder={t("tutarIpucu")}
            autoComplete="off"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sablon-para">{ortak("paraBirimi")}</Label>
          <Select value={paraBirimi} onValueChange={setParaBirimi}>
            <SelectTrigger id="sablon-para" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TRY">TRY</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="sablon-kdv">{t("kdvOraniEtiketi")} *</Label>
          <Input
            id="sablon-kdv"
            name="vatRate"
            inputMode="decimal"
            value={alanlar.vatRate}
            onChange={(e) =>
              setAlanlar((o) => ({ ...o, vatRate: e.target.value }))
            }
            placeholder={t("kdvOraniIpucu")}
            autoComplete="off"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sablon-gun">
            {t("sablonGunEtiketi")}{" "}
            <span className="text-muted-foreground text-xs font-normal">
              ({ortak("istegeBagli")})
            </span>
          </Label>
          <Input
            id="sablon-gun"
            name="dayOfMonth"
            inputMode="numeric"
            value={alanlar.dayOfMonth}
            onChange={(e) =>
              setAlanlar((o) => ({ ...o, dayOfMonth: e.target.value }))
            }
            placeholder={t("sablonGunIpucu")}
            autoComplete="off"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="sablon-aciklama">
          {ortak("aciklama")}{" "}
          <span className="text-muted-foreground text-xs font-normal">
            ({ortak("istegeBagli")})
          </span>
        </Label>
        <Input
          id="sablon-aciklama"
          name="description"
          value={alanlar.description}
          onChange={(e) =>
            setAlanlar((o) => ({ ...o, description: e.target.value }))
          }
          placeholder={t("aciklamaIpucu")}
          autoComplete="off"
        />
      </div>

      <HataOzeti hatalar={durum.hatalar} />

      {durum.basari ? (
        <p
          className={`rounded-md p-3 text-sm ${DURUM_KUTUSU.olumlu}`}
          role="status"
        >
          {durum.basari}
        </p>
      ) : null}

      <Button type="submit" disabled={bekliyor}>
        <Plus />
        {bekliyor ? ortak("ekleniyor") : t("sablonEkle")}
      </Button>
    </form>
  );
}
