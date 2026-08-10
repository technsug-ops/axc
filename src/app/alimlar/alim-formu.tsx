"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";

import { BarkodGirisi } from "@/components/barkod-okuyucu";
import { HataOzeti } from "@/components/hata-ozeti";
import { Button } from "@/components/ui/button";
import { formGonderimi } from "@/lib/form-gonderimi";
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
import { type AlimDurumu } from "./actions";

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
  /** Bu kalemden KABUL EDİLMİŞ adet. Düzenlemede adet bunun altına inemez. */
  gelen?: number;
};

/** Düzenleme kipinde formu dolduran başlangıç değerleri. */
export type AlimBaslangici = {
  code: string;
  purchasedAt: string;
  channelAccountId: string;
  creditCardId: string;
  installmentCount: string;
  supplierName: string;
  note: string;
  kalemler: Kalem[];
  /** Herhangi bir kalemde mal kabul yapılmış mı? */
  malKabulVar: boolean;
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
  baslangic,
  alimId,
}: {
  hesaplar: HesapSecenegi[];
  kartlar: KartSecenegi[];
  action: (durum: AlimDurumu, formData: FormData) => Promise<AlimDurumu>;
  bugun: string;
  /** Doluysa DÜZENLEME kipi. */
  baslangic?: AlimBaslangici;
  /** Düzenlenen alımın kimliği. */
  alimId?: string;
}) {
  const duzenleme = Boolean(baslangic);
  const [durum, formAction, bekliyor] = useActionState<AlimDurumu, FormData>(
    action,
    {},
  );

  // Biçimlendirme dil altyapısından gelir (sunucudaki bicimlendirici() ile
  // aynı yüzey).
  const bicim = useBicim();

  // --- Başlık alanları ---
  const [code, setCode] = useState(baslangic?.code ?? "");
  const [purchasedAt, setPurchasedAt] = useState(baslangic?.purchasedAt ?? bugun);
  const [channelAccountId, setChannelAccountId] = useState(baslangic?.channelAccountId ?? "");
  const [creditCardId, setCreditCardId] = useState(baslangic?.creditCardId ?? "");
  const [installmentCount, setInstallmentCount] = useState(baslangic?.installmentCount ?? "1");
  const [supplierName, setSupplierName] = useState(baslangic?.supplierName ?? "");
  const [note, setNote] = useState(baslangic?.note ?? "");

  // --- Kalemler ---
  const [kalemler, setKalemler] = useState<Kalem[]>(baslangic?.kalemler ?? []);

  const t = useTranslations("Alim");
  const ortak = useTranslations("Ortak");

  // --- Kalem ekleme: TEK KUTU ---
  // `sorgu` hem okutulan kodu hem elle yazılan aramayı taşır.
  const [sorgu, setSorgu] = useState("");
  const [barkodAdedi, setBarkodAdedi] = useState("1");
  const [barkodMesaji, setBarkodMesaji] = useState<string | null>(null);
  const barkodRef = useRef<HTMLInputElement>(null);
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

  /** Enter (USB okuyucu) veya kamera: TAM eşleşen kodu doğrudan ekler. */
  async function koddanEkle(kod: string) {
    const adet = Math.max(1, Math.trunc(Number(barkodAdedi) || 1));
    setBarkodMesaji(null);

    try {
      const varyant = await varyantKodlaBul(kod);
      if (!varyant) {
        // Bulunamadıysa kutuyu TEMİZLEMİYORUZ: yazılan metin arama olarak
        // kalsın, kullanıcı aşağıdaki sonuçlardan seçebilsin.
        setBarkodMesaji(ortak("kodBulunamadi", { kod }));
        return;
      }

      kalemEkle(varyant, adet);
      setBarkodMesaji(
        ortak("kalemEklendi", { urun: varyantEtiketi(varyant), adet }),
      );
      setSorgu("");
    } catch {
      setBarkodMesaji(ortak("aramaHatasi"));
    } finally {
      // Peş peşe okutma için kutuya geri dön.
      barkodRef.current?.focus();
    }
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
    <form onSubmit={formGonderimi(formAction)} className="space-y-6">
      {/* Düzenleme kipinde hangi alım güncelleniyor. */}
      {baslangic ? <input type="hidden" name="id" value={alimId ?? ""} /> : null}
      <input type="hidden" name="veri" value={JSON.stringify(gonderilecek)} />

      {/* ----------------------------- BAŞLIK ----------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>{t("alimBilgileri")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="alim-kod">{ortak("siparisNo")} *</Label>
              {/* Sipariş fişindeki barkod okutulabilir (#7). */}
              <BarkodGirisi
                id="alim-kod"
                value={code}
                onChange={setCode}
                placeholder={t("kodIpucu")}
                kameraBasligi={t("kodKamera")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="alim-tarih">{t("alimTarihi")} *</Label>
              <Input
                id="alim-tarih"
                type="date"
                value={purchasedAt}
                onChange={(e) => setPurchasedAt(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="alim-hesap">{ortak("kanalHesabi")}</Label>
              <Select
                value={channelAccountId || SECIM_YOK}
                onValueChange={(d) =>
                  setChannelAccountId(d === SECIM_YOK ? "" : d)
                }
              >
                <SelectTrigger id="alim-hesap" className="w-full">
                  <SelectValue placeholder={t("hesapSecin")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SECIM_YOK}>
                    {ortak("secilmedi")}
                  </SelectItem>
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

            <div className="space-y-2">
              <Label htmlFor="alim-kart">{t("odenenKart")}</Label>
              <Select
                value={creditCardId || SECIM_YOK}
                onValueChange={(d) => setCreditCardId(d === SECIM_YOK ? "" : d)}
              >
                <SelectTrigger id="alim-kart" className="w-full">
                  <SelectValue placeholder={t("kartSecin")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SECIM_YOK}>
                    {ortak("secilmedi")}
                  </SelectItem>
                  {kartlar.map((kart) => (
                    <SelectItem key={kart.id} value={kart.id}>
                      {kart.etiket}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {kartlar.length === 0 ? (
                <p className="text-muted-foreground text-xs">
                  {t.rich("kartYokNotu", {
                    baglanti: (parca) => (
                      <Link
                        href="/kartlar/yeni"
                        className="underline underline-offset-4"
                      >
                        {parca}
                      </Link>
                    ),
                  })}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="alim-taksit">{t("taksitSayisiEtiketi")}</Label>
              <Input
                id="alim-taksit"
                value={installmentCount}
                onChange={(e) => setInstallmentCount(e.target.value)}
                inputMode="numeric"
                placeholder="1"
              />
              <p className="text-muted-foreground text-xs">{t("taksitNotu")}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="alim-tedarikci">{t("tedarikci")}</Label>
              <Input
                id="alim-tedarikci"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder={ortak("istegeBagli")}
                autoComplete="off"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="alim-not">{t("not")}</Label>
            <Textarea
              id="alim-not"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder={ortak("istegeBagli")}
            />
          </div>
        </CardContent>
      </Card>

      {/* ---------------- KALEM EKLEME + KALEMLER (TEK KART) ---------------- */}
      <Card>
        <CardHeader>
          <CardTitle>
            {ortak("kalemlerBasligi", { sayi: kalemler.length })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* TEK KUTU: okutma ve arama aynı alanda — satış formuyla aynı
              düzen (#10). Okuyucu Enter gönderir → tam eşleşme doğrudan
              eklenir; elle yazınca aşağıda sonuçlar çıkar. */}
          <div className="space-y-2">
            <Label htmlFor="alim-ekle">{ortak("urunEkle")}</Label>
            <div className="flex flex-wrap items-start gap-2">
              <BarkodGirisi
                id="alim-ekle"
                className="min-w-56 flex-1"
                value={sorgu}
                onChange={setSorgu}
                onOkundu={koddanEkle}
                inputRef={barkodRef}
                placeholder={ortak("ekleIpucu")}
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
            <p className="text-muted-foreground text-xs">{ortak("ekleNotu")}</p>
            {barkodMesaji ? (
              <p className="text-sm" role="status">
                {barkodMesaji}
              </p>
            ) : null}
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
                        {varyant.sku} · {varyant.companySku}
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
                      {ortak("ekle")}
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {kalemler.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium">{ortak("bosKalemBaslik")}</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {ortak("bosKalemIpucu")}
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
                    // Kabul edilmiş kalem çıkarılamaz: malı stok defterine
                    // yazdık, kalemi silmek defteri sahipsiz bırakırdı.
                    disabled={(kalem.gelen ?? 0) > 0}
                    title={(kalem.gelen ?? 0) > 0 ? t("kalemKilitli") : undefined}
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
                          // Sipariş adedi, KABUL EDİLMİŞ adedin altına
                          // inemez: gelen mal zaten stok defterine yazıldı.
                          quantity: Math.max(
                            Math.max(1, kalem.gelen ?? 0),
                            Math.trunc(Number(e.target.value) || 1),
                          ),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`fiyat-${sira}`}>
                      {ortak("sutunBirimFiyat")}
                    </Label>
                    <Input
                      id={`fiyat-${sira}`}
                      value={kalem.unitCostAmount}
                      inputMode="decimal"
                      placeholder={ortak("fiyatIpucu")}
                      onChange={(e) =>
                        kalemGuncelle(sira, { unitCostAmount: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`para-${sira}`}>
                      {ortak("paraBirimi")}
                    </Label>
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
              <div className="text-sm font-medium">{t("alimToplami")}</div>
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

      <HataOzeti hatalar={durum.hatalar} />

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={bekliyor || kalemler.length === 0}>
          {bekliyor
            ? ortak("kaydediliyor")
            : duzenleme
              ? ortak("degisiklikleriKaydet")
              : t("alimiKaydet")}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/alimlar">{ortak("vazgec")}</Link>
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">{t("formNotu")}</p>
    </form>
  );
}
