"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";

import { BarkodGirisi } from "@/components/barkod-okuyucu";
import { HataOzeti } from "@/components/hata-ozeti";
import { Badge } from "@/components/ui/badge";
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
import {
  kalemBilgisiGetir,
  kargoSecenekleriGetir,
  type KargoSecenegi,
} from "./kalem-bilgisi";
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
  /** Ürün desisi — toplam desi bundan hesaplanır. */
  desi: number | null;
  /** Çözülen KDV oranı (%) ve varsayılana düşülüp düşülmediği. */
  kdvOrani: number;
  kdvVarsayilan: boolean;
  /** Kanal SKU'sundan önerilen oran; kullanıcı değiştirebilir. */
  komisyonOrani: string;
  /** Panel gerçeği — doluysa oran yok sayılır. */
  komisyonTutari: string;
};

/** Radix Select bos deger kabul etmiyor; "kargo secilmedi" icin nobetci. */
const KARGO_YOK = "__kargo_yok__";

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

  // --- Kalem ekleme: TEK KUTU ---
  // `sorgu` hem okutulan kodu hem elle yazılan aramayı taşır. Okuyucu
  // Enter gönderince koddanEkle çalışır (tam eşleşme), elle yazınca
  // aşağıda eşleşen ürünler listelenir.
  const [sorgu, setSorgu] = useState("");
  const [barkodAdedi, setBarkodAdedi] = useState("1");
  const [barkodMesaji, setBarkodMesaji] = useState<string | null>(null);
  const barkodRef = useRef<HTMLInputElement>(null);
  const [sonuclar, setSonuclar] = useState<VaryantSonucu[]>([]);
  const [araniyor, setAraniyor] = useState(false);

  // --- kargo ---
  // Desi kalemlerden hesaplanır ama elle değiştirilebilir; kullanıcı
  // dokunduğu andan itibaren otomatik hesap devreye girmez.
  const [desiElle, setDesiElle] = useState<string | null>(null);
  const [cargoCarrierId, setCargoCarrierId] = useState("");
  const [kargoSecenekleri, setKargoSecenekleri] = useState<KargoSecenegi[]>([]);

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
    // Stok, desi, KDV oranı ve komisyon oranı tek çağrıda gelir.
    // Hepsi ÖNERİDİR; kullanıcı formda değiştirebilir.
    let bilgi = null;
    try {
      bilgi = await kalemBilgisiGetir(varyant.id, channelAccountId);
    } catch {
      bilgi = null;
    }
    const stok = bilgi?.stok ?? null;

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
          desi: bilgi?.desi ?? null,
          kdvOrani: bilgi?.kdvOrani ?? 20,
          kdvVarsayilan: bilgi?.kdvKaynagi === "VARSAYILAN",
          komisyonOrani:
            bilgi?.komisyonOrani !== null && bilgi?.komisyonOrani !== undefined
              ? String(bilgi.komisyonOrani)
              : "",
          komisyonTutari: "",
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

      await kalemEkle(varyant, adet);
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
      const fiyat = Number(kalem.unitPriceAmount.replace(",", "."));
      if (!Number.isFinite(fiyat)) continue;
      harita.set(
        kalem.unitPriceCurrency,
        (harita.get(kalem.unitPriceCurrency) ?? 0) + fiyat * kalem.quantity,
      );
    }
    return [...harita.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [kalemler]);

  /** Kalemlerden hesaplanan toplam desi. */
  const hesaplananDesi = useMemo(
    () => kalemler.reduce((t, k) => t + (k.desi ?? 0) * k.quantity, 0),
    [kalemler],
  );

  /** Formdaki geçerli desi: kullanıcı dokunduysa onun değeri. */
  const desiMetni =
    desiElle ?? (hesaplananDesi > 0 ? String(hesaplananDesi) : "");
  const desiSayi = Number(desiMetni.replace(",", ".")) || 0;

  // Desi veya kanal hesabı değişince kargo fiyatları yeniden okunur.
  useEffect(() => {
    let iptal = false;

    // setState doğrudan efekt gövdesinde çağrılmaz (React Compiler kuralı);
    // erken çıkış da zamanlayıcının içinde yapılır — arama efektiyle aynı kalıp.
    const zamanlayici = setTimeout(async () => {
      if (!channelAccountId || desiSayi <= 0) {
        if (!iptal) setKargoSecenekleri([]);
        return;
      }
      try {
        const liste = await kargoSecenekleriGetir(channelAccountId, desiSayi);
        if (!iptal) setKargoSecenekleri(liste);
      } catch {
        if (!iptal) setKargoSecenekleri([]);
      }
    }, 250);
    return () => {
      iptal = true;
      clearTimeout(zamanlayici);
    };
  }, [channelAccountId, desiSayi]);

  const gonderilecek = {
    code,
    soldAt,
    channelAccountId,
    note,
    cargoCarrierId: cargoCarrierId || null,
    cargoDesi: desiSayi > 0 ? desiSayi : null,
    kalemler: kalemler.map((k) => {
      const sayi = Number(k.unitPriceAmount.replace(",", "."));
      const oran = Number(k.komisyonOrani.replace(",", "."));
      const tutar = Number(k.komisyonTutari.replace(",", "."));
      return {
        variantId: k.variantId,
        quantity: k.quantity,
        unitPriceAmount:
          k.unitPriceAmount.trim() !== "" && Number.isFinite(sayi)
            ? sayi
            : null,
        unitPriceCurrency: k.unitPriceCurrency,
        vatRate: k.kdvOrani,
        commissionRate:
          k.komisyonOrani.trim() !== "" && Number.isFinite(oran) ? oran : null,
        commissionAmount:
          k.komisyonTutari.trim() !== "" && Number.isFinite(tutar)
            ? tutar
            : null,
      };
    }),
  };

  return (
    <form onSubmit={formGonderimi(formAction)} className="space-y-6">
      <input type="hidden" name="veri" value={JSON.stringify(gonderilecek)} />

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

          {/* ------------------------------ KARGO ------------------------------ */}
          <div className="space-y-3 rounded-lg border p-4">
            <div className="text-sm font-medium">{t("kargoBasligi")}</div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="satis-desi">{t("desiEtiketi")}</Label>
                <Input
                  id="satis-desi"
                  value={desiMetni}
                  onChange={(e) => setDesiElle(e.target.value)}
                  inputMode="decimal"
                  placeholder="0"
                />
                <p className="text-muted-foreground text-xs">{t("desiNotu")}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="satis-kargo">{t("kargoFirmasi")}</Label>
                <Select
                  value={cargoCarrierId || KARGO_YOK}
                  onValueChange={(d) =>
                    setCargoCarrierId(d === KARGO_YOK ? "" : d)
                  }
                >
                  <SelectTrigger id="satis-kargo" className="w-full">
                    <SelectValue placeholder={t("kargoSecin")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={KARGO_YOK}>
                      {t("kargoSecilmedi")}
                    </SelectItem>
                    {kargoSecenekleri.map((k, sira) => (
                      <SelectItem
                        key={k.carrierId}
                        value={k.carrierId}
                        disabled={!k.tasiyorMu}
                      >
                        {k.tasiyorMu ? (
                          <span className="flex w-full items-center gap-2">
                            <span>{k.ad}</span>
                            <span className="font-medium">
                              {bicim.para(k.kdvDahil ?? 0, "TRY")}
                            </span>
                            {/* En ucuz = ilk sıradaki; öneri dayatma değil. */}
                            {sira === 0 ? (
                              <Badge variant="secondary">
                                {t("kargoOnerilen")}
                              </Badge>
                            ) : null}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            {k.ad} — {t("kargoTasimiyor")}
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground text-xs">
                  {!channelAccountId
                    ? t("kargoHesapYok")
                    : desiSayi <= 0
                      ? t("kargoDesiYok")
                      : t("kargoNotu")}
                </p>
              </div>
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

      {/* ---------------- KALEM EKLEME + KALEMLER (TEK KART) ---------------- */}
      <Card>
        <CardHeader>
          <CardTitle>
            {ortak("kalemlerBasligi", { sayi: kalemler.length })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* TEK KUTU: okutma ve arama aynı alanda. Okutucu Enter gönderir →
              tam eşleşme doğrudan eklenir; elle yazınca aşağıda sonuçlar
              çıkar. İki ayrı kutu, eklenen kalemleri ekrandan uzaklaştırıyordu. */}
          <div className="space-y-2">
            <Label htmlFor="satis-ekle">{ortak("urunEkle")}</Label>
            <div className="flex flex-wrap items-start gap-2">
              <BarkodGirisi
                id="satis-ekle"
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
                      {/* KDV oranı ürünün kategorisinden geldi; sadece bilgi. */}
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

                  {/* --- komisyon: oran ÖNERİLİR, tutar EZER --- */}
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor={`komisyon-oran-${sira}`}>
                        {t("komisyonOrani")}
                      </Label>
                      <Input
                        id={`komisyon-oran-${sira}`}
                        value={kalem.komisyonOrani}
                        inputMode="decimal"
                        placeholder="0"
                        onChange={(e) =>
                          kalemGuncelle(sira, { komisyonOrani: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`komisyon-tutar-${sira}`}>
                        {t("komisyonTutari")}
                      </Label>
                      <Input
                        id={`komisyon-tutar-${sira}`}
                        value={kalem.komisyonTutari}
                        inputMode="decimal"
                        placeholder={ortak("istegeBagli")}
                        onChange={(e) =>
                          kalemGuncelle(sira, {
                            komisyonTutari: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="flex items-end">
                      <Badge variant="outline">
                        {t("kdvOraniKisa", { oran: kalem.kdvOrani })}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {t("komisyonNotu")}
                  </p>

                  {/* Sessiz varsayım olmasın: kategorisiz ürün %20'ye düşer. */}
                  {kalem.kdvVarsayilan ? (
                    <p className="text-amber-700 text-xs dark:text-amber-500">
                      {t("varsayilanKdvNotu")}
                    </p>
                  ) : null}

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

      <HataOzeti hatalar={durum.hatalar} />

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
