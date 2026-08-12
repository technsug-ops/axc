"use client";

import Link from "next/link";

import { useActionState, useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { bantDisiMi, type KomisyonBandi } from "@/lib/komisyon-bandi";
import { Plus, Search, X, ExternalLink } from "lucide-react";

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

import { varyantAra, type VaryantSonucu } from "../varyant-arama";
import { kanalSkuEkle, type KanalSkuDurumu } from "./actions";

/**
 * Yeni kanal eşlemesi.
 *
 * Ürün, alım/satış formlarındaki AYNI arama ile seçilir (İlke #10) — ad,
 * SKU, Firma SKU veya barkodla. Aynı mantığı ikinci kez yazmak yerine
 * ortak `varyantAra` kullanılıyor.
 */
export function YeniEsleme({
  hesaplar,
  bantlar,
}: {
  hesaplar: { id: string; etiket: string; satisIcin: boolean }[];
  /** Hakedişten gelen komisyon bantları — hesap başına en fazla bir tane. */
  bantlar: KomisyonBandi[];
}) {
  const t = useTranslations("KanalSku");
  const ortak = useTranslations("Ortak");

  const [durum, formAction, bekliyor] = useActionState<
    KanalSkuDurumu,
    FormData
  >(kanalSkuEkle, {});

  const [sorgu, setSorgu] = useState("");
  const [sonuclar, setSonuclar] = useState<VaryantSonucu[]>([]);
  const [secili, setSecili] = useState<VaryantSonucu | null>(null);
  const [hesapId, setHesapId] = useState("");
  const [kanalKodu, setKanalKodu] = useState("");
  const [oran, setOran] = useState("");

  /** Secilen hesap SATIS mi — komisyon yalniz o zaman sorulur. */
  const seciliSatisMi =
    hesaplar.find((h) => h.id === hesapId)?.satisIcin ?? true;

  /** Seçilen hesabın bandı ve girilen oranın o bandın dışında olup olmadığı. */
  const bant = bantlar.find((b) => b.channelAccountId === hesapId) ?? null;
  const girilen = Number(oran.replace(",", "."));
  const bantUyarisi =
    bant !== null &&
    oran.trim() !== "" &&
    Number.isFinite(girilen) &&
    bantDisiMi(girilen, bant);
  const [araniyor, aramayaBasla] = useTransition();

  // Başarılı kayıttan sonra formu boşalt — arka arkaya eşleme girilir.
  const [sonDurum, setSonDurum] = useState(durum);
  if (sonDurum !== durum) {
    setSonDurum(durum);
    if (durum.basari) {
      setSecili(null);
      setSorgu("");
      setSonuclar([]);
      setKanalKodu("");
      setOran("");
    }
  }

  function ara() {
    const q = sorgu.trim();
    if (q.length < 2) return;
    aramayaBasla(async () => setSonuclar(await varyantAra(q)));
  }

  function etiket(v: VaryantSonucu) {
    const ad = v.varyantAdi ? `${v.urunAdi} — ${v.varyantAdi}` : v.urunAdi;
    return `${ad} (${v.sku})`;
  }

  return (
    <form onSubmit={formGonderimi(formAction)} className="space-y-4">
      <input type="hidden" name="variantId" value={secili?.id ?? ""} />
      <input type="hidden" name="channelAccountId" value={hesapId} />

      {/* ------------------------- ÜRÜN SEÇİMİ ------------------------- */}
      {secili ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
          <div>
            <div className="text-muted-foreground text-xs">
              {t("varyantSecildi")}
            </div>
            <div className="font-medium">{etiket(secili)}</div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSecili(null)}
          >
            <X />
            {t("varyantDegistir")}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="ks-arama">{t("varyantAra")}</Label>
          <div className="flex flex-wrap gap-2">
            <Input
              id="ks-arama"
              value={sorgu}
              onChange={(e) => setSorgu(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  ara();
                }
              }}
              placeholder={t("varyantAraIpucu")}
              autoComplete="off"
              className="max-w-md min-w-48 flex-1"
            />
            <Button type="button" variant="secondary" onClick={ara}>
              <Search />
              {araniyor ? ortak("araniyor") : ortak("ara")}
            </Button>
          </div>

          {sonuclar.length > 0 ? (
            <div className="divide-y rounded-lg border">
              {sonuclar.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    setSecili(v);
                    setSonuclar([]);
                  }}
                  className="hover:bg-accent block w-full px-3 py-2 text-left text-sm transition-colors"
                >
                  {etiket(v)}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {/* --------------------- HESAP / KOD / ORAN ---------------------- */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="ks-hesap">{t("hesapEtiketi")} *</Label>
          <Select value={hesapId} onValueChange={setHesapId}>
            <SelectTrigger id="ks-hesap" className="w-full">
              <SelectValue placeholder={t("hesapSecin")} />
            </SelectTrigger>
            <SelectContent>
              {hesaplar.map((h) => (
                <SelectItem key={h.id} value={h.id}>
                  {h.etiket}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ks-kod">{t("kanalKoduEtiketi")}</Label>
          <Input
            id="ks-kod"
            name="channelSku"
            value={kanalKodu}
            onChange={(e) => setKanalKodu(e.target.value)}
            placeholder={t("kanalKoduIpucu")}
            autoComplete="off"
          />
        </div>

        {/* Komisyon YALNIZ satis hesabinda sorulur (bkz. satir-duzenle). */}
        {seciliSatisMi ? (
          <div className="space-y-2">
            <Label htmlFor="ks-oran">{t("oranEtiketi")}</Label>
            <Input
              id="ks-oran"
              name="commissionRate"
              value={oran}
              onChange={(e) => setOran(e.target.value)}
              inputMode="decimal"
              placeholder={t("oranIpucu")}
              autoComplete="off"
            />
            {bant ? (
              <p className="text-muted-foreground text-xs">
                {t("bantIpucu", { medyan: bant.medyan.toFixed(2) })}
              </p>
            ) : null}
            {bantUyarisi && bant ? (
              <p className="text-xs text-amber-700 dark:text-amber-400">
                {t("bantDisi", {
                  alt: bant.uyariAlt.toFixed(2),
                  ust: bant.uyariUst.toFixed(2),
                })}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="space-y-2">
            <Label>{t("oranEtiketi")}</Label>
            <p className="text-muted-foreground pt-2 text-sm">
              {t("alisKoduNotu")}
            </p>
          </div>
        )}
      </div>

      <p className="text-muted-foreground text-xs">{t("kanalKoduNotu")}</p>

      <HataOzeti hatalar={durum.hatalar} />

      {/* ÇAKIŞMA EYLEME DÖNÜK: hangi kayıt olduğu yazar ve oraya götürür.
          Bağlantı listeyi o hesaba + o SKU'ya süzer, kullanıcı aramaz. */}
      {durum.cakisma ? (
        <div className="space-y-2 rounded-md border border-amber-500/50 bg-amber-500/10 p-3">
          <p className="text-sm text-amber-900 dark:text-amber-200">
            {t("cakismaMetni", {
              urun: durum.cakisma.urun,
              kod: durum.cakisma.kanalKodu,
            })}
          </p>
          <Button variant="outline" size="sm" asChild>
            <Link
              href={`/kanal-sku?hesap=${durum.cakisma.hesapId}&q=${encodeURIComponent(durum.cakisma.arama)}`}
            >
              <ExternalLink />
              {t("cakismaEslemeyeGit")}
            </Link>
          </Button>
        </div>
      ) : null}

      {durum.basari ? (
        <p
          className="rounded-md border border-emerald-500/50 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400"
          role="status"
        >
          {durum.basari}
        </p>
      ) : null}

      <Button type="submit" disabled={bekliyor || !secili || !hesapId}>
        <Plus />
        {bekliyor ? ortak("ekleniyor") : t("ekle")}
      </Button>
    </form>
  );
}
