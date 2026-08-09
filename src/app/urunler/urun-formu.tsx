"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";

import { BarkodGirisi } from "@/components/barkod-okuyucu";
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
import { Textarea } from "@/components/ui/textarea";

import type { FormDurumu } from "./actions";

export type KonumSecenegi = { id: string; code: string; name: string | null };

export type VaryantGirdisi = {
  id?: string;
  ad: string;
  sku: string;
  axcaliSku: string;
  barcode: string;
  locationId: string;
  secenekler: { ad: string; deger: string }[];
};

export type UrunGirdisi = {
  ad: string;
  marka: string;
  aciklama: string;
  varyantliMi: boolean;
  varyantlar: VaryantGirdisi[];
};

/** Radix Select boş string değeri kabul etmiyor; "raf yok" için nöbetçi değer. */
const KONUM_YOK = "__konum_yok__";

function bosVaryant(secenekliMi: boolean): VaryantGirdisi {
  return {
    ad: "",
    sku: "",
    axcaliSku: "",
    barcode: "",
    locationId: "",
    secenekler: secenekliMi ? [{ ad: "", deger: "" }] : [],
  };
}

/** Seçenek değerlerinden okunur bir varyant adı türetir: "M / Kırmızı" */
function secenekOzeti(varyant: VaryantGirdisi): string {
  return varyant.secenekler
    .map((s) => s.deger.trim())
    .filter(Boolean)
    .join(" / ");
}

export function UrunFormu({
  konumlar,
  action,
  baslangic,
  urunId,
  gonderEtiketi,
}: {
  konumlar: KonumSecenegi[];
  action: (durum: FormDurumu, formData: FormData) => Promise<FormDurumu>;
  baslangic?: UrunGirdisi;
  urunId?: string;
  gonderEtiketi: string;
}) {
  const [durum, formAction, bekliyor] = useActionState<FormDurumu, FormData>(
    action,
    {},
  );

  const t = useTranslations("Urunler");
  const ortak = useTranslations("Ortak");

  const [ad, setAd] = useState(baslangic?.ad ?? "");
  const [marka, setMarka] = useState(baslangic?.marka ?? "");
  const [aciklama, setAciklama] = useState(baslangic?.aciklama ?? "");
  const [varyantliMi, setVaryantliMi] = useState(
    baslangic?.varyantliMi ?? false,
  );
  const [varyantlar, setVaryantlar] = useState<VaryantGirdisi[]>(
    baslangic?.varyantlar ?? [bosVaryant(false)],
  );

  function varyantModunuDegistir(yeniDeger: boolean) {
    if (yeniDeger === varyantliMi) return;
    setVaryantliMi(yeniDeger);

    if (yeniDeger) {
      // Varyantlıya geçiş: mevcut satırlara birer boş seçenek satırı aç.
      setVaryantlar((onceki) =>
        onceki.map((v) => ({
          ...v,
          secenekler: v.secenekler.length
            ? v.secenekler
            : [{ ad: "", deger: "" }],
        })),
      );
    } else {
      // Varyantsıza dönüş: tek satır kalır, seçenekler ve ad temizlenir.
      setVaryantlar((onceki) => [{ ...onceki[0], ad: "", secenekler: [] }]);
    }
  }

  function varyantGuncelle(sira: number, degisim: Partial<VaryantGirdisi>) {
    setVaryantlar((onceki) =>
      onceki.map((v, i) => (i === sira ? { ...v, ...degisim } : v)),
    );
  }

  function secenekGuncelle(
    varyantSirasi: number,
    secenekSirasi: number,
    degisim: Partial<{ ad: string; deger: string }>,
  ) {
    setVaryantlar((onceki) =>
      onceki.map((v, i) =>
        i === varyantSirasi
          ? {
              ...v,
              secenekler: v.secenekler.map((s, j) =>
                j === secenekSirasi ? { ...s, ...degisim } : s,
              ),
            }
          : v,
      ),
    );
  }

  // Sunucuya tek bir gizli alanla gidiyor: FormData'da dizi ayrıştırmak
  // kırılgan olduğu için varyantları JSON olarak gönderiyoruz.
  const gonderilecek = {
    ad,
    marka,
    aciklama,
    varyantliMi,
    varyantlar: varyantlar.map((v) => ({
      id: v.id,
      ad: varyantliMi ? v.ad.trim() || secenekOzeti(v) : "",
      sku: v.sku,
      axcaliSku: v.axcaliSku,
      barcode: v.barcode,
      locationId: v.locationId,
      secenekler: varyantliMi
        ? v.secenekler.filter((s) => s.ad.trim() || s.deger.trim())
        : [],
    })),
  };

  return (
    <form action={formAction} className="space-y-6">
      {urunId ? <input type="hidden" name="id" value={urunId} /> : null}
      <input type="hidden" name="veri" value={JSON.stringify(gonderilecek)} />

      {durum.hatalar?.length ? (
        <div
          role="alert"
          className="border-destructive/50 bg-destructive/10 text-destructive rounded-md border p-4 text-sm"
        >
          <p className="mb-2 font-medium">{ortak("kaydedilemedi")}</p>
          <ul className="list-inside list-disc space-y-1">
            {durum.hatalar.map((hata, i) => (
              <li key={i}>{hata}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* ------------------------------ ÜRÜN ------------------------------ */}
      <Card>
        <CardHeader>
          <CardTitle>{t("urunBilgileri")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="urun-ad">{t("urunAdi")} *</Label>
              <Input
                id="urun-ad"
                value={ad}
                onChange={(e) => setAd(e.target.value)}
                placeholder={t("urunAdiIpucu")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="urun-marka">{ortak("marka")}</Label>
              <Input
                id="urun-marka"
                value={marka}
                onChange={(e) => setMarka(e.target.value)}
                placeholder={t("markaIpucu")}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="urun-aciklama">{ortak("aciklama")}</Label>
            <Textarea
              id="urun-aciklama"
              value={aciklama}
              onChange={(e) => setAciklama(e.target.value)}
              rows={3}
              placeholder={ortak("istegeBagli")}
            />
          </div>
        </CardContent>
      </Card>

      {/* ---------------------------- VARYANTLAR ---------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>{t("varyantlar")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>{t("varyantSorusu")}</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={varyantliMi ? "outline" : "default"}
                onClick={() => varyantModunuDegistir(false)}
              >
                {t("tekCesitDugmesi")}
              </Button>
              <Button
                type="button"
                variant={varyantliMi ? "default" : "outline"}
                onClick={() => varyantModunuDegistir(true)}
              >
                {t("varyantliDugmesi")}
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              {varyantliMi ? t("varyantliNotu") : t("tekCesitNotu")}
            </p>
          </div>

          {varyantlar.map((varyant, sira) => (
            <div
              key={varyant.id ?? sira}
              className="space-y-4 rounded-lg border p-4"
            >
              {varyantliMi ? (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {t("varyantBasligi", { sira: sira + 1 })}
                    {sira === 0 ? t("varsayilanEki") : ""}
                  </span>
                  {varyantlar.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setVaryantlar((onceki) =>
                          onceki.filter((_, i) => i !== sira),
                        )
                      }
                    >
                      <Trash2 />
                      {t("kaldir")}
                    </Button>
                  ) : null}
                </div>
              ) : null}

              {varyantliMi ? (
                <div className="space-y-2">
                  <Label>{t("secenekler")}</Label>
                  {varyant.secenekler.map((secenek, secenekSira) => (
                    <div key={secenekSira} className="flex flex-wrap gap-2">
                      <Input
                        className="min-w-32 flex-1"
                        value={secenek.ad}
                        onChange={(e) =>
                          secenekGuncelle(sira, secenekSira, {
                            ad: e.target.value,
                          })
                        }
                        placeholder={t("secenekAdiIpucu")}
                      />
                      <Input
                        className="min-w-32 flex-1"
                        value={secenek.deger}
                        onChange={(e) =>
                          secenekGuncelle(sira, secenekSira, {
                            deger: e.target.value,
                          })
                        }
                        placeholder={t("secenekDegeriIpucu")}
                      />
                      {varyant.secenekler.length > 1 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            varyantGuncelle(sira, {
                              secenekler: varyant.secenekler.filter(
                                (_, j) => j !== secenekSira,
                              ),
                            })
                          }
                        >
                          <Trash2 />
                        </Button>
                      ) : null}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      varyantGuncelle(sira, {
                        secenekler: [
                          ...varyant.secenekler,
                          { ad: "", deger: "" },
                        ],
                      })
                    }
                  >
                    <Plus />
                    {t("secenekEkle")}
                  </Button>
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`sku-${sira}`}>{ortak("sku")} *</Label>
                  <BarkodGirisi
                    id={`sku-${sira}`}
                    value={varyant.sku}
                    onChange={(deger) => varyantGuncelle(sira, { sku: deger })}
                    placeholder={t("skuIpucu")}
                    kameraBasligi={t("skuKamera")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`axcali-${sira}`}>
                    {ortak("firmaSku")} *
                  </Label>
                  {/* Fiziğe yapıştırılan etiket kodu — okutulabilmeli (#7). */}
                  <BarkodGirisi
                    id={`axcali-${sira}`}
                    value={varyant.axcaliSku}
                    onChange={(deger) =>
                      varyantGuncelle(sira, { axcaliSku: deger })
                    }
                    placeholder={t("firmaSkuIpucu")}
                    kameraBasligi={t("firmaSkuKamera")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`barkod-${sira}`}>{t("barkodEtiketi")}</Label>
                  {/* USB okuyucu (Enter) ve kamera ile okunabilir; elle de yazılabilir. */}
                  <BarkodGirisi
                    id={`barkod-${sira}`}
                    value={varyant.barcode}
                    onChange={(deger) =>
                      varyantGuncelle(sira, { barcode: deger })
                    }
                    placeholder={t("barkodIpucu")}
                    kameraBasligi={t("barkodKamera")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`konum-${sira}`}>{t("rafKonumu")}</Label>
                  <Select
                    value={varyant.locationId || KONUM_YOK}
                    onValueChange={(deger) =>
                      varyantGuncelle(sira, {
                        locationId: deger === KONUM_YOK ? "" : deger,
                      })
                    }
                  >
                    <SelectTrigger id={`konum-${sira}`} className="w-full">
                      <SelectValue placeholder={ortak("rafSecin")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={KONUM_YOK}>
                        {ortak("rafAtanmadi")}
                      </SelectItem>
                      {konumlar.map((konum) => (
                        <SelectItem key={konum.id} value={konum.id}>
                          {konum.code}
                          {konum.name ? ` — ${konum.name}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ))}

          {konumlar.length === 0 ? (
            <p className="text-muted-foreground text-xs">
              {t.rich("rafYokNotu", {
                baglanti: (parca) => (
                  <Link
                    href="/ayarlar/konumlar"
                    className="underline underline-offset-4"
                  >
                    {parca}
                  </Link>
                ),
              })}
            </p>
          ) : null}

          {varyantliMi ? (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setVaryantlar((onceki) => [...onceki, bosVaryant(true)])
              }
            >
              <Plus />
              {t("varyantEkle")}
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={bekliyor}>
          {bekliyor ? ortak("kaydediliyor") : gonderEtiketi}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href={urunId ? `/urunler/${urunId}` : "/urunler"}>
            {ortak("vazgec")}
          </Link>
        </Button>
      </div>
    </form>
  );
}
