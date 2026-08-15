"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";

import { BarkodGirisi } from "@/components/barkod-okuyucu";
import { AramaSonucuSatiri } from "@/components/arama-sonucu-satiri";
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
} from "../varyant-arama";
import { kodDizisi, type VaryantSonucu } from "@/lib/varyant-ozet";
import { type AlimDurumu } from "./actions";
import {
  TedarikciSecimi,
  type TedarikciSecenegi,
} from "./tedarikci-secimi";

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
  /** SİSTEM ÜRETTİ, değiştirilemez. Düzenlemede salt okunur gösterilir. */
  code: string;
  purchasedAt: string;
  channelAccountId: string;
  creditCardId: string;
  installmentCount: string;
  supplierId: string;
  /** Tedarikçideki sipariş numarası — dış dünyanın kimliği, elle girilir. */
  supplierOrderNo: string;
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
  tedarikciler,
  action,
  bugun,
  baslangic,
  alimId,
  hazirVaryant,
}: {
  hesaplar: HesapSecenegi[];
  kartlar: KartSecenegi[];
  tedarikciler: TedarikciSecenegi[];
  action: (durum: AlimDurumu, formData: FormData) => Promise<AlimDurumu>;
  bugun: string;
  /** Doluysa DÜZENLEME kipi. */
  baslangic?: AlimBaslangici;
  /** Düzenlenen alımın kimliği. */
  alimId?: string;
  /**
   * ÜRÜNDEN GELİNDİYSE HAZIR KALEM (`/alimlar/yeni?varyant=<id>`).
   *
   * Ürün ekranında "Alım gir" düğmesine basan kullanıcı hangi ürünü
   * istediğini SÖYLEMİŞTİR; formu boş açıp aynı ürünü bir daha aratmak
   * gereksiz adımdır (İlke #9). `baslangic`ten AYRI tutuluyor: o düzenleme
   * kipini açar, bu YENİ alımdır.
   */
  hazirVaryant?: VaryantSonucu | null;
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

  const [purchasedAt, setPurchasedAt] = useState(baslangic?.purchasedAt ?? bugun);
  const [channelAccountId, setChannelAccountId] = useState(baslangic?.channelAccountId ?? "");
  const [creditCardId, setCreditCardId] = useState(baslangic?.creditCardId ?? "");
  const [installmentCount, setInstallmentCount] = useState(baslangic?.installmentCount ?? "1");
  const [supplierId, setSupplierId] = useState(baslangic?.supplierId ?? "");
  const [supplierOrderNo, setSupplierOrderNo] = useState(
    baslangic?.supplierOrderNo ?? "",
  );
  // Akış içi eklenen tedarikçi listeye burada katılır; sayfa yenilenmez.
  const [tedarikciListesi, setTedarikciListesi] = useState(tedarikciler);
  const [note, setNote] = useState(baslangic?.note ?? "");

  // --- Kalemler ---
  const [kalemler, setKalemler] = useState<Kalem[]>(() => {
    if (baslangic?.kalemler) return baslangic.kalemler;
    if (!hazirVaryant) return [];
    // Adet 1, maliyet BOŞ: adedi tahmin etmek makul, parayı tahmin etmek
    // değil — kullanıcı gerçek maliyeti kendisi yazar.
    return [
      {
        variantId: hazirVaryant.id,
        etiket: varyantEtiketi(hazirVaryant),
        sku: hazirVaryant.sku,
        quantity: 1,
        unitCostAmount: "",
        unitCostCurrency: "TRY",
      },
    ];
  });

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
    purchasedAt,
    channelAccountId,
    creditCardId,
    installmentCount: Number(installmentCount),
    supplierId,
    supplierOrderNo,
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
            {/* ALIM NUMARASI ELLE GİRİLMEZ — sistem üretir (ALM-HE-260811-01).
                Salt kayıt kimliğidir; "ewe", "25-23" gibi kodlar bu yüzden
                oluşuyordu. Düzenlemede DEĞİŞMEZ: kod bir kere doğar. */}
            <div className="space-y-2">
              <Label>{t("alimNo")}</Label>
              {duzenleme ? (
                <div className="flex h-9 items-center rounded-md border bg-muted/40 px-3">
                  <span className="font-mono text-sm">{baslangic?.code}</span>
                </div>
              ) : (
                <p className="text-muted-foreground flex h-9 items-center text-sm">
                  {t("alimNoUretilecek")}
                </p>
              )}
            </div>

            {/* Tedarikçinin KENDİ sipariş numarası — dış dünyanın kimliği.
                Sipariş fişindeki barkod okutulabilir (#7). */}
            <div className="space-y-2">
              <Label htmlFor="alim-siparis-no">{t("tedarikciSiparisNo")}</Label>
              <BarkodGirisi
                id="alim-siparis-no"
                value={supplierOrderNo}
                onChange={setSupplierOrderNo}
                placeholder={t("tedarikciSiparisNoIpucu")}
                kameraBasligi={t("kodKamera")}
              />
              <p className="text-muted-foreground text-xs">
                {t("tedarikciSiparisNoNotu")}
              </p>
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

            <TedarikciSecimi
              secenekler={tedarikciListesi}
              secili={supplierId}
              onSecim={setSupplierId}
              onYeni={(yeni) =>
                setTedarikciListesi((o) =>
                  [...o, yeni].sort((a, b) => a.ad.localeCompare(b.ad, "tr")),
                )
              }
            />
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
                  <AramaSonucuSatiri
                    key={varyant.id}
                    baslik={varyantEtiketi(varyant)}
                    kodlar={kodDizisi(varyant)}
                    ekleEtiketi={ortak("ekle")}
                    onEkle={() => {
                      kalemEkle(varyant, 1);
                      setSorgu("");
                    }}
                  />
                ))}
              </ul>
            ) : null}

            {/* ÖNCE ARA, SONRA YARAT — arama sonuç vermeyince "yeni ürün"
                İKİNCİL eylem olarak öne çıkar. Böyle olmazsa kullanıcı
                mevcut ürünü bulamayıp aynı üründen ikinci kayıt açıyor.

                YENİ SEKMEDE açılır: yarım doldurulmuş bu form aynı sekmede
                gidilirse kaybolur. Dönünce aramayı tekrarlamak yeterli. */}
            {!araniyor && sorgu.trim().length >= 2 && sonuclar.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-center">
                <p className="text-sm font-medium">
                  {t("aramaSonucsuz", { sorgu: sorgu.trim() })}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {t("aramaSonucsuzIpucu")}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3"
                  asChild
                >
                  <a href="/urunler/yeni" target="_blank" rel="noopener">
                    <Plus />
                    {t("yeniUrunOlustur")}
                  </a>
                </Button>
              </div>
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
