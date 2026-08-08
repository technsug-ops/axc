"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
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
import { paraFormatla } from "@/lib/format";

import {
  varyantAra,
  varyantKodlaBul,
  type AlimDurumu,
  type VaryantSonucu,
} from "./actions";

export type HesapSecenegi = {
  id: string;
  etiket: string;
  paraBirimi: "TRY" | "EUR";
};

export type KartSecenegi = { id: string; etiket: string };

type Kalem = {
  variantId: string;
  etiket: string;
  sku: string;
  quantity: number;
  unitCostAmount: string;
  unitCostCurrency: "TRY" | "EUR";
};

const SECIM_YOK = "__yok__";

function varyantEtiketi(v: VaryantSonucu): string {
  const parcalar = [v.urunAdi];
  if (v.varyantAdi) parcalar.push(v.varyantAdi);
  return parcalar.join(" — ");
}

export function AlimFormu({
  hesaplar,
  kartlar,
  action,
  bugun,
}: {
  hesaplar: HesapSecenegi[];
  kartlar: KartSecenegi[];
  action: (durum: AlimDurumu, formData: FormData) => Promise<AlimDurumu>;
  bugun: string;
}) {
  const [durum, formAction, bekliyor] = useActionState<AlimDurumu, FormData>(
    action,
    {},
  );

  // --- Başlık alanları ---
  const [code, setCode] = useState("");
  const [purchasedAt, setPurchasedAt] = useState(bugun);
  const [channelAccountId, setChannelAccountId] = useState("");
  const [creditCardId, setCreditCardId] = useState("");
  const [installmentCount, setInstallmentCount] = useState("1");
  const [supplierName, setSupplierName] = useState("");
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

  function kalemEkle(varyant: VaryantSonucu, adet: number) {
    setKalemler((onceki) => {
      const sira = onceki.findIndex((k) => k.variantId === varyant.id);
      if (sira >= 0) {
        // Aynı ürün tekrar okutulursa adet artar (peş peşe okutma akışı).
        return onceki.map((k, i) =>
          i === sira ? { ...k, quantity: k.quantity + adet } : k,
        );
      }
      return [
        ...onceki,
        {
          variantId: varyant.id,
          etiket: varyantEtiketi(varyant),
          sku: varyant.sku,
          quantity: adet,
          unitCostAmount: "",
          unitCostCurrency: varsayilanParaBirimi,
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
        setBarkodMesaji(`"${kod}" koduna ait ürün bulunamadı.`);
      } else {
        kalemEkle(varyant, adet);
        setBarkodMesaji(`${varyantEtiketi(varyant)} eklendi (${adet} adet).`);
      }
    } catch {
      setBarkodMesaji("Arama sırasında bir hata oluştu.");
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
      const fiyat = Number(kalem.unitCostAmount.replace(",", "."));
      if (!Number.isFinite(fiyat)) continue;
      harita.set(
        kalem.unitCostCurrency,
        (harita.get(kalem.unitCostCurrency) ?? 0) + fiyat * kalem.quantity,
      );
    }
    return [...harita.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [kalemler]);

  const gonderilecek = {
    code,
    purchasedAt,
    channelAccountId,
    creditCardId,
    installmentCount: Number(installmentCount),
    supplierName,
    note,
    kalemler: kalemler.map((k) => {
      const sayi = Number(k.unitCostAmount.replace(",", "."));
      return {
        variantId: k.variantId,
        quantity: k.quantity,
        unitCostAmount:
          k.unitCostAmount.trim() !== "" && Number.isFinite(sayi) ? sayi : null,
        unitCostCurrency: k.unitCostCurrency,
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
          <p className="mb-2 font-medium">Kaydedilemedi:</p>
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
          <CardTitle>Alım bilgileri</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="alim-kod">Sipariş no *</Label>
              <Input
                id="alim-kod"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="ALM-2026-0001"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="alim-tarih">Alım tarihi *</Label>
              <Input
                id="alim-tarih"
                type="date"
                value={purchasedAt}
                onChange={(e) => setPurchasedAt(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="alim-hesap">Kanal hesabı</Label>
              <Select
                value={channelAccountId || SECIM_YOK}
                onValueChange={(d) =>
                  setChannelAccountId(d === SECIM_YOK ? "" : d)
                }
              >
                <SelectTrigger id="alim-hesap" className="w-full">
                  <SelectValue placeholder="Hesap seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SECIM_YOK}>Seçilmedi</SelectItem>
                  {hesaplar.map((hesap) => (
                    <SelectItem key={hesap.id} value={hesap.id}>
                      {hesap.etiket}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hesaplar.length === 0 ? (
                <p className="text-muted-foreground text-xs">
                  Hiç kanal hesabı yok.{" "}
                  <Link
                    href="/ayarlar/kanallar"
                    className="underline underline-offset-4"
                  >
                    Kanal Hesapları
                  </Link>{" "}
                  sayfasından ekleyin.
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="alim-kart">Ödenen kart</Label>
              <Select
                value={creditCardId || SECIM_YOK}
                onValueChange={(d) => setCreditCardId(d === SECIM_YOK ? "" : d)}
              >
                <SelectTrigger id="alim-kart" className="w-full">
                  <SelectValue placeholder="Kart seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SECIM_YOK}>Seçilmedi</SelectItem>
                  {kartlar.map((kart) => (
                    <SelectItem key={kart.id} value={kart.id}>
                      {kart.etiket}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {kartlar.length === 0 ? (
                <p className="text-muted-foreground text-xs">
                  Aktif kart yok.{" "}
                  <Link
                    href="/kartlar/yeni"
                    className="underline underline-offset-4"
                  >
                    Kart ekleyin
                  </Link>
                  .
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="alim-taksit">Taksit sayısı</Label>
              <Input
                id="alim-taksit"
                value={installmentCount}
                onChange={(e) => setInstallmentCount(e.target.value)}
                inputMode="numeric"
                placeholder="1"
              />
              <p className="text-muted-foreground text-xs">
                1 = tek çekim.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="alim-tedarikci">Tedarikçi</Label>
              <Input
                id="alim-tedarikci"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="İsteğe bağlı"
                autoComplete="off"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="alim-not">Not</Label>
            <Textarea
              id="alim-not"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="İsteğe bağlı"
            />
          </div>
        </CardContent>
      </Card>

      {/* ------------------------- KALEM EKLEME --------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>Kalem ekle</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="alim-barkod">Barkodla ekle</Label>
            <div className="flex flex-wrap items-start gap-2">
              <BarkodGirisi
                id="alim-barkod"
                className="min-w-56 flex-1"
                value={barkod}
                onChange={setBarkod}
                onOkundu={barkoddanEkle}
                inputRef={barkodRef}
                placeholder="Okutun veya kodu yazıp Enter'a basın"
                kameraBasligi="Ürün barkodunu okut"
              />
              <div className="w-24">
                <Input
                  value={barkodAdedi}
                  onChange={(e) => setBarkodAdedi(e.target.value)}
                  inputMode="numeric"
                  aria-label="Okutulan üründen kaç adet eklensin"
                  placeholder="Adet"
                />
              </div>
            </div>
            <p className="text-muted-foreground text-xs">
              USB okuyucu kodun sonuna Enter gönderir; kalem eklenir ve kutu
              yeniden odaklanır, peş peşe okutabilirsiniz. Aynı ürün tekrar
              okutulursa adedi artar.
            </p>
            {barkodMesaji ? (
              <p className="text-sm" role="status">
                {barkodMesaji}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="alim-arama">Ada / SKU&apos;ya göre ara</Label>
            <div className="relative">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                id="alim-arama"
                className="pl-9"
                value={sorgu}
                onChange={(e) => setSorgu(e.target.value)}
                placeholder="En az 2 karakter yazın"
                autoComplete="off"
              />
            </div>
            {araniyor ? (
              <p className="text-muted-foreground text-xs">Aranıyor...</p>
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
                      onClick={() => {
                        kalemEkle(varyant, 1);
                        setSorgu("");
                      }}
                    >
                      <Plus />
                      Ekle
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
          <CardTitle>Kalemler ({kalemler.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {kalemler.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium">Henüz kalem eklenmedi.</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Yukarıdan barkod okutarak veya arayarak ekleyin.
              </p>
            </div>
          ) : (
            kalemler.map((kalem, sira) => (
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
                    Kaldır
                  </Button>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor={`adet-${sira}`}>Adet</Label>
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
                    <Label htmlFor={`fiyat-${sira}`}>Birim fiyat</Label>
                    <Input
                      id={`fiyat-${sira}`}
                      value={kalem.unitCostAmount}
                      inputMode="decimal"
                      placeholder="0,00"
                      onChange={(e) =>
                        kalemGuncelle(sira, { unitCostAmount: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`para-${sira}`}>Para birimi</Label>
                    <Select
                      value={kalem.unitCostCurrency}
                      onValueChange={(d) =>
                        kalemGuncelle(sira, {
                          unitCostCurrency: d as "TRY" | "EUR",
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
              </div>
            ))
          )}

          {toplamlar.length ? (
            <div className="space-y-2 rounded-lg border p-4">
              <div className="text-sm font-medium">Alım toplamı</div>
              <div className="flex flex-wrap gap-3">
                {toplamlar.map(([paraBirimi, tutar]) => (
                  <div key={paraBirimi} className="rounded-md border px-3 py-2">
                    <div className="text-muted-foreground text-xs">
                      {paraBirimi}
                    </div>
                    <div className="text-lg font-semibold">
                      {paraFormatla(tutar, paraBirimi)}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-muted-foreground text-xs">
                Para birimleri ayrı toplanır ve birbirine ÇEVRİLMEZ.
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={bekliyor || kalemler.length === 0}>
          {bekliyor ? "Kaydediliyor..." : "Alımı Kaydet"}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/alimlar">Vazgeç</Link>
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">
        Yeni alım &quot;Sipariş verildi&quot; durumunda kaydedilir. Mal kabul ve
        stok girişi Aşama 3&apos;te gelecek.
      </p>
    </form>
  );
}
