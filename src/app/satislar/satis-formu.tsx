"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Search, Trash2 } from "lucide-react";

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
import { useBicim } from "@/lib/bicim-istemci";

import {
  varyantAra,
  varyantKodlaBul,
  type VaryantSonucu,
} from "../varyant-arama";
import { varyantStoguGetir } from "./stok-sorgu";
import { type SatisDurumu } from "./actions";

export type HesapSecenegi = {
  id: string;
  etiket: string;
  paraBirimi: "TRY" | "EUR";
};

type Kalem = {
  variantId: string;
  etiket: string;
  sku: string;
  quantity: number;
  unitPriceAmount: string;
  unitPriceCurrency: "TRY" | "EUR";
  /** Kalem eklenirken okunan stok — uyarı için, doğrulama sunucuda. */
  stok: number | null;
};

function varyantEtiketi(v: VaryantSonucu): string {
  const parcalar = [v.urunAdi];
  if (v.varyantAdi) parcalar.push(v.varyantAdi);
  return parcalar.join(" — ");
}

export function SatisFormu({
  hesaplar,
  action,
  bugun,
}: {
  hesaplar: HesapSecenegi[];
  action: (durum: SatisDurumu, formData: FormData) => Promise<SatisDurumu>;
  bugun: string;
}) {
  const [durum, formAction, bekliyor] = useActionState<SatisDurumu, FormData>(
    action,
    {},
  );

  const bicim = useBicim();
  const t = useTranslations("Satis");
  const ortak = useTranslations("Ortak");

  // --- Başlık alanları ---
  const [code, setCode] = useState("");
  const [soldAt, setSoldAt] = useState(bugun);
  const [channelAccountId, setChannelAccountId] = useState("");
  const [note, setNote] = useState("");

  // --- Kalemler ---
  const [kalemler, setKalemler] = useState<Kalem[]>([]);

  // --- Barkodla hızlı ekleme ---
  const [barkod, setBarkod] = useState("");
  const [barkodAdedi, setBarkodAdedi] = useState("1");
  const [barkodMesaji, setBarkodMesaji] = useState<string | null>(null);
  const barkodRef = useRef<HTMLInputElement>(null);

  // --- Arama ile ekleme ---
  const [sorgu, setSorgu] = useState("");
  const [sonuclar, setSonuclar] = useState<VaryantSonucu[]>([]);
  const [araniyor, setAraniyor] = useState(false);

  /** Seçili kanal hesabının para birimi, yeni kalemler için varsayılan olur. */
  const varsayilanParaBirimi: "TRY" | "EUR" =
    hesaplar.find((h) => h.id === channelAccountId)?.paraBirimi ?? "TRY";

  useEffect(() => {
    const q = sorgu.trim();
    let iptal = false;

    const zamanlayici = setTimeout(async () => {
      if (q.length < 2) {
        if (!iptal) setSonuclar([]);
        return;
      }
      setAraniyor(true);
      try {
        const bulunan = await varyantAra(q);
        if (!iptal) setSonuclar(bulunan);
      } catch {
        if (!iptal) setSonuclar([]);
      } finally {
        if (!iptal) setAraniyor(false);
      }
    }, 300);

    return () => {
      iptal = true;
      clearTimeout(zamanlayici);
    };
  }, [sorgu]);

  async function kalemEkle(varyant: VaryantSonucu, adet: number) {
    // Stok bilgisi kalemin yanında görünsün ki kullanıcı formu doldururken
    // yetersizliği fark etsin. ASIL engel sunucuda, transaction içinde (#5).
    let stok: number | null = null;
    try {
      stok = await varyantStoguGetir(varyant.id);
    } catch {
      stok = null;
    }

    setKalemler((onceki) => {
      const sira = onceki.findIndex((k) => k.variantId === varyant.id);
      if (sira >= 0) {
        // Aynı ürün tekrar okutulursa adet artar (peş peşe okutma akışı).
        return onceki.map((k, i) =>
          i === sira ? { ...k, quantity: k.quantity + adet, stok } : k,
        );
      }
      return [
        ...onceki,
        {
          variantId: varyant.id,
          etiket: varyantEtiketi(varyant),
          sku: varyant.sku,
          quantity: adet,
          unitPriceAmount: "",
          unitPriceCurrency: varsayilanParaBirimi,
          stok,
        },
      ];
    });
  }

  async function barkoddanEkle(kod: string) {
    const adet = Math.max(1, Math.trunc(Number(barkodAdedi) || 1));
    setBarkodMesaji(null);

    try {
      const varyant = await varyantKodlaBul(kod);
      if (!varyant) {
        setBarkodMesaji(ortak("kodBulunamadi", { kod }));
      } else {
        await kalemEkle(varyant, adet);
        setBarkodMesaji(
          ortak("kalemEklendi", { urun: varyantEtiketi(varyant), adet }),
        );
      }
    } catch {
      setBarkodMesaji(ortak("aramaHatasi"));
    }

    setBarkod("");
    // Peş peşe okutma için kutuya geri dön.
    barkodRef.current?.focus();
  }

  function kalemGuncelle(sira: number, degisim: Partial<Kalem>) {
    setKalemler((onceki) =>
      onceki.map((k, i) => (i === sira ? { ...k, ...degisim } : k)),
    );
  }

  const toplamlar = useMemo(() => {
    const harita = new Map<string, number>();
    for (const kalem of kalemler) {
      const fiyat = Number(kalem.unitPriceAmount.replace(",", "."));
      if (!Number.isFinite(fiyat)) continue;
      harita.set(
        kalem.unitPriceCurrency,
        (harita.get(kalem.unitPriceCurrency) ?? 0) + fiyat * kalem.quantity,
      );
    }
    return [...harita.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [kalemler]);

  const gonderilecek = {
    code,
    soldAt,
    channelAccountId,
    note,
    kalemler: kalemler.map((k) => {
      const sayi = Number(k.unitPriceAmount.replace(",", "."));
      return {
        variantId: k.variantId,
        quantity: k.quantity,
        unitPriceAmount:
          k.unitPriceAmount.trim() !== "" && Number.isFinite(sayi)
            ? sayi
            : null,
        unitPriceCurrency: k.unitPriceCurrency,
      };
    }),
  };

  return (
    <form action={formAction} className="space-y-6">
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

      {/* ----------------------------- BAŞLIK ----------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>{t("satisBilgileri")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="satis-kod">{ortak("siparisNo")}</Label>
              {/* Pazaryeri fişindeki barkod okutulabilir (#7). */}
              <BarkodGirisi
                id="satis-kod"
                value={code}
                onChange={setCode}
                placeholder={t("siparisNoIpucu")}
                kameraBasligi={t("siparisNoKamera")}
              />
              <p className="text-muted-foreground text-xs">
                {t("siparisNoNotu")}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="satis-tarih">{t("satisTarihi")} *</Label>
              <Input
                id="satis-tarih"
                type="date"
                value={soldAt}
                onChange={(e) => setSoldAt(e.target.value)}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="satis-hesap">{ortak("kanalHesabi")} *</Label>
              <Select
                value={channelAccountId}
                onValueChange={setChannelAccountId}
              >
                <SelectTrigger id="satis-hesap" className="w-full">
                  <SelectValue placeholder={t("hesapSecin")} />
                </SelectTrigger>
                <SelectContent>
                  {hesaplar.map((hesap) => (
                    <SelectItem key={hesap.id} value={hesap.id}>
                      {hesap.etiket}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hesaplar.length === 0 ? (
                <p className="text-muted-foreground text-xs">
                  {t.rich("hesapYokNotu", {
                    baglanti: (parca) => (
                      <Link
                        href="/ayarlar/kanallar"
                        className="underline underline-offset-4"
                      >
                        {parca}
                      </Link>
                    ),
                  })}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="satis-not">{ortak("aciklama")}</Label>
            <Textarea
              id="satis-not"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder={ortak("istegeBagli")}
            />
          </div>
        </CardContent>
      </Card>

      {/* ------------------------- KALEM EKLEME --------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>{ortak("kalemEkle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="satis-barkod">{ortak("barkodlaEkle")}</Label>
            <div className="flex flex-wrap items-start gap-2">
              <BarkodGirisi
                id="satis-barkod"
                className="min-w-56 flex-1"
                value={barkod}
                onChange={setBarkod}
                onOkundu={barkoddanEkle}
                inputRef={barkodRef}
                placeholder={ortak("barkodIpucu")}
                kameraBasligi={ortak("barkodKamera")}
              />
              <div className="w-24">
                <Input
                  value={barkodAdedi}
                  onChange={(e) => setBarkodAdedi(e.target.value)}
                  inputMode="numeric"
                  aria-label={ortak("adetEtiketi")}
                  placeholder={ortak("adetIpucu")}
                />
              </div>
            </div>
            <p className="text-muted-foreground text-xs">
              {ortak("barkodNotu")}
            </p>
            {barkodMesaji ? (
              <p className="text-sm" role="status">
                {barkodMesaji}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="satis-arama">{ortak("aramaEtiketi")}</Label>
            <div className="relative">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                id="satis-arama"
                className="pl-9"
                value={sorgu}
                onChange={(e) => setSorgu(e.target.value)}
                placeholder={ortak("aramaIpucuKalem")}
                autoComplete="off"
              />
            </div>
            {araniyor ? (
              <p className="text-muted-foreground text-xs">
                {ortak("araniyor")}
              </p>
            ) : null}
            {sonuclar.length ? (
              <ul className="divide-y rounded-md border">
                {sonuclar.map((varyant) => (
                  <li
                    key={varyant.id}
                    className="flex flex-wrap items-center justify-between gap-2 p-3"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">
                        {varyantEtiketi(varyant)}
                      </div>
                      <div className="text-muted-foreground truncate font-mono text-xs">
                        {varyant.sku} · {varyant.axcaliSku}
                        {varyant.barcode ? ` · ${varyant.barcode}` : ""}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        await kalemEkle(varyant, 1);
                        setSorgu("");
                      }}
                    >
                      <Plus />
                      {ortak("ekle")}
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* --------------------------- KALEMLER ----------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>
            {ortak("kalemlerBasligi", { sayi: kalemler.length })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {kalemler.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium">{ortak("bosKalemBaslik")}</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {ortak("bosKalemIpucu")}
              </p>
            </div>
          ) : (
            kalemler.map((kalem, sira) => {
              const stokYetersiz =
                kalem.stok !== null && kalem.quantity > kalem.stok;

              return (
                <div
                  key={kalem.variantId}
                  className="space-y-3 rounded-lg border p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{kalem.etiket}</div>
                      <div className="text-muted-foreground font-mono text-xs">
                        {kalem.sku}
                      </div>
                      {kalem.stok !== null ? (
                        <div className="text-muted-foreground mt-1 text-xs">
                          {kalem.stok > 0
                            ? t("mevcutStok", { adet: kalem.stok })
                            : t("stokYok")}
                        </div>
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setKalemler((onceki) =>
                          onceki.filter((_, i) => i !== sira),
                        )
                      }
                    >
                      <Trash2 />
                      {ortak("kaldir")}
                    </Button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor={`adet-${sira}`}>{ortak("adet")}</Label>
                      <Input
                        id={`adet-${sira}`}
                        value={String(kalem.quantity)}
                        inputMode="numeric"
                        onChange={(e) =>
                          kalemGuncelle(sira, {
                            quantity: Math.max(
                              1,
                              Math.trunc(Number(e.target.value) || 1),
                            ),
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`fiyat-${sira}`}>
                        {t("birimSatisFiyati")}
                      </Label>
                      <Input
                        id={`fiyat-${sira}`}
                        value={kalem.unitPriceAmount}
                        inputMode="decimal"
                        placeholder={ortak("fiyatIpucu")}
                        onChange={(e) =>
                          kalemGuncelle(sira, {
                            unitPriceAmount: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`para-${sira}`}>
                        {ortak("paraBirimi")}
                      </Label>
                      <Select
                        value={kalem.unitPriceCurrency}
                        onValueChange={(d) =>
                          kalemGuncelle(sira, {
                            unitPriceCurrency: d as "TRY" | "EUR",
                          })
                        }
                      >
                        <SelectTrigger id={`para-${sira}`} className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="TRY">TRY</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Erken uyarı; asıl engel sunucuda (#5). */}
                  {stokYetersiz ? (
                    <p className="text-destructive text-sm" role="alert">
                      {t("stokUyarisi", {
                        urun: kalem.etiket,
                        mevcut: kalem.stok ?? 0,
                        istenen: kalem.quantity,
                      })}
                    </p>
                  ) : null}
                </div>
              );
            })
          )}

          {toplamlar.length ? (
            <div className="space-y-2 rounded-lg border p-4">
              <div className="text-sm font-medium">{t("satisToplami")}</div>
              <div className="flex flex-wrap gap-3">
                {toplamlar.map(([paraBirimi, tutar]) => (
                  <div key={paraBirimi} className="rounded-md border px-3 py-2">
                    <div className="text-muted-foreground text-xs">
                      {paraBirimi}
                    </div>
                    <div className="text-lg font-semibold">
                      {bicim.para(tutar, paraBirimi)}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-muted-foreground text-xs">{t("toplamNotu")}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={bekliyor || kalemler.length === 0}>
          {bekliyor ? ortak("kaydediliyor") : t("satisiKaydet")}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/satislar">{ortak("vazgec")}</Link>
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">{t("formNotu")}</p>
    </form>
  );
}
