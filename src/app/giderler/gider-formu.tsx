"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Save, TriangleAlert } from "lucide-react";

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

import { giderEkle, giderGuncelle, type GiderDurumu } from "./actions";
import { DURUM_KUTUSU } from "@/lib/renkler";

/**
 * ============================================================================
 *  GİDER FORMU — hem yeni kayıt hem düzenleme
 * ----------------------------------------------------------------------------
 *  KDV ORANI KATEGORİDEN GELİR: kategori seçilince oran otomatik dolar.
 *  Maaş seçilince 0, kira seçilince 20. Kullanıcı yine de değiştirebilir —
 *  öneridir, kilit değil.
 *
 *  YER TUTUCULAR "örn. X" BİÇİMİNDE (İlke #11): gri "20" yazsaydı girilmiş
 *  bir değer sanılırdı; bu tuzağa 09.08.2026'da iki kez düşüldü.
 * ============================================================================
 */

export type KategoriSecenegi = {
  id: string;
  ad: string;
  kdvOrani: string;
  /** Sözlükteki uyarı anahtarı (ör. Vergi kategorisi). Yoksa null. */
  uyariAnahtari: string | null;
};

export type GiderBaslangici = {
  id: string;
  spentAt: string;
  categoryId: string;
  amount: string;
  currency: string;
  vatRate: string;
  description: string;
};

export function GiderFormu({
  kategoriler,
  bugun,
  baslangic,
}: {
  kategoriler: KategoriSecenegi[];
  /** Yeni kayıtta varsayılan tarih — İŞ saat diliminde bugün. */
  bugun: string;
  /** Doluysa düzenleme kipi. */
  baslangic?: GiderBaslangici;
}) {
  const t = useTranslations("Gider");
  const tUyari = useTranslations("Gider.uyarilar");
  const ortak = useTranslations("Ortak");

  const duzenleme = Boolean(baslangic);

  const [durum, formAction, bekliyor] = useActionState<GiderDurumu, FormData>(
    duzenleme ? giderGuncelle : giderEkle,
    {},
  );

  const BOS = {
    spentAt: bugun,
    categoryId: "",
    amount: "",
    vatRate: "",
    description: "",
  };

  const [alanlar, setAlanlar] = useState(
    baslangic
      ? {
          spentAt: baslangic.spentAt,
          categoryId: baslangic.categoryId,
          amount: baslangic.amount,
          vatRate: baslangic.vatRate,
          description: baslangic.description,
        }
      : BOS,
  );
  const [paraBirimi, setParaBirimi] = useState(baslangic?.currency ?? "TRY");

  // Başarılı kayıttan sonra alanları temizle — bir ayın giderleri arka arkaya
  // girilir (İlke #9). Düzenlemede temizlenmez, kayıt yerinde kalır.
  const [sonDurum, setSonDurum] = useState(durum);
  if (sonDurum !== durum) {
    setSonDurum(durum);
    if (durum.basari && !duzenleme) {
      setAlanlar(BOS);
      setParaBirimi("TRY");
    }
  }

  const secili = kategoriler.find((k) => k.id === alanlar.categoryId);
  const uyari =
    secili?.uyariAnahtari && tUyari.has(secili.uyariAnahtari)
      ? tUyari(secili.uyariAnahtari)
      : null;

  /** Kategori değişince KDV oranı önerisi tazelenir. */
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
      {baslangic ? (
        <input type="hidden" name="id" value={baslangic.id} />
      ) : null}
      <input type="hidden" name="currency" value={paraBirimi} />
      <input type="hidden" name="categoryId" value={alanlar.categoryId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="gider-tarih">{t("tarihEtiketi")} *</Label>
          <Input
            id="gider-tarih"
            name="spentAt"
            type="date"
            value={alanlar.spentAt}
            onChange={(e) =>
              setAlanlar((o) => ({ ...o, spentAt: e.target.value }))
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="gider-kategori">{t("kategoriEtiketi")} *</Label>
          <Select value={alanlar.categoryId} onValueChange={kategoriSec}>
            <SelectTrigger id="gider-kategori" className="w-full">
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

      {/* Kategoriye özel uyarı — çift sayımı önler (İlke #5). */}
      {uyari ? (
        <p className={`flex gap-2 rounded-md p-3 text-sm ${DURUM_KUTUSU.uyari}`}>
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <span>{uyari}</span>
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="gider-tutar">{t("tutarEtiketi")} *</Label>
          <Input
            id="gider-tutar"
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
          <Label htmlFor="gider-para">{ortak("paraBirimi")}</Label>
          <Select value={paraBirimi} onValueChange={setParaBirimi}>
            <SelectTrigger id="gider-para" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TRY">TRY</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="gider-kdv">{t("kdvOraniEtiketi")} *</Label>
          <Input
            id="gider-kdv"
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
      </div>

      <p className="text-muted-foreground text-xs">{t("kdvOraniNotu")}</p>

      <div className="space-y-2">
        <Label htmlFor="gider-aciklama">
          {ortak("aciklama")}{" "}
          <span className="text-muted-foreground text-xs font-normal">
            ({ortak("istegeBagli")})
          </span>
        </Label>
        <Input
          id="gider-aciklama"
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
        {duzenleme ? <Save /> : <Plus />}
        {bekliyor
          ? ortak("kaydediliyor")
          : duzenleme
            ? ortak("degisiklikleriKaydet")
            : t("kaydet")}
      </Button>
    </form>
  );
}
