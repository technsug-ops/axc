"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { DURUM_YAZISI } from "@/lib/renkler";

import { eslesmeKaydet } from "./eylemler";

/**
 * Bir TY kategorisinin bizdeki karşılığını seçer (K283). Seçim değişince
 * hemen kaydedilir ve sonucu satırın altında YAZAR (İlke #5): kaç ürün
 * güncellendi, kaçı KDV yüzünden beklemede kaldı, kaçı elle seçilmiş.
 */
export function EslesmeSecici({
  tyKategori,
  seciliId,
  kategoriler,
}: {
  tyKategori: string;
  seciliId: string | null;
  kategoriler: { id: string; ad: string; kdv: string }[];
}) {
  const t = useTranslations("KategoriEslesme");
  const router = useRouter();
  const [deger, setDeger] = useState(seciliId ?? "");
  const [mesajlar, setMesajlar] = useState<{ tur: "olumlu" | "uyari" | "olumsuz"; metin: string }[]>([]);
  const [bekliyor, basla] = useTransition();

  const degistir = (yeni: string) => {
    const onceki = deger;
    setDeger(yeni);
    setMesajlar([]);
    basla(async () => {
      const s = await eslesmeKaydet(tyKategori, yeni === "" ? null : yeni);
      if ("hata" in s) {
        setDeger(onceki);
        setMesajlar([{ tur: "olumsuz", metin: t(`hata.${s.hata}`) }]);
        return;
      }
      const m: { tur: "olumlu" | "uyari" | "olumsuz"; metin: string }[] = [
        { tur: "olumlu", metin: t("kaydedildi", { sayi: s.kategoriYazilan }) },
      ];
      if (s.kdvBekleyen > 0) m.push({ tur: "uyari", metin: t("kaydedildiKdv", { sayi: s.kdvBekleyen }) });
      if (s.elle > 0) m.push({ tur: "uyari", metin: t("kaydedildiElle", { sayi: s.elle }) });
      if (s.tavandaKalan > 0) m.push({ tur: "uyari", metin: t("kaydedildiTavan", { sayi: s.tavandaKalan }) });
      setMesajlar(m);
      router.refresh();
    });
  };

  return (
    <div className="space-y-1">
      <select
        value={deger}
        disabled={bekliyor}
        aria-label={`${t("bizimKategori")}: ${tyKategori}`}
        onChange={(e) => degistir(e.target.value)}
        className="border-input bg-background h-11 w-full rounded-md border px-2 text-sm md:h-9"
      >
        <option value="">{t("secilmedi")}</option>
        {kategoriler.map((k) => (
          <option key={k.id} value={k.id}>
            {k.ad} (%{k.kdv})
          </option>
        ))}
      </select>
      {bekliyor ? <p className="text-muted-foreground text-xs">{t("kaydediliyor")}</p> : null}
      {mesajlar.map((m, i) => (
        <p key={i} className={`text-xs ${DURUM_YAZISI[m.tur]}`}>
          {m.metin}
        </p>
      ))}
    </div>
  );
}
