"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Wand2 } from "lucide-react";

import { Button } from "@/components/ui/button";

import { skuOner, type SkuOnerisi } from "./sku-oner";
import { DURUM_YAZISI } from "@/lib/renkler";

/**
 * ============================================================================
 *  SKU "ÖNER" DÜĞMESİ
 * ----------------------------------------------------------------------------
 *  ⚠ K287 (27.09.2026): öneri KAT-MRK-NNNN ve FİRMA SKU'ya yazılır; SKU
 *  yalnız BOŞSA doldurulur (pazaryeri kodu ezilmez). Marka tabloda yoksa
 *  sebebi yazar ve Markalar ekranına bağlar.
 *  Eski hâl (11.08.2026): «İKİ ALANI BİRDEN aynı değerle doldurur, `F-`
 *  öneki yok» — 26.09 kararıyla Firma SKU pazaryeri kodundan ayrıldı.
 *
 *  Hesap SUNUCUDA yapılır (kategori kodu ve o günkü sıra veritabanından
 *  okunur), o yüzden düğme beklerken kilitlenir.
 *
 *  ÜRETİLEMEZSE SESSİZ KALMAZ (#5): sebebini yazar ve düzeltme yerini
 *  gösterir — kategoriye kod verilmemişse kategori, marka tabloda yoksa
 *  Markalar ekranına bağlar.
 * ============================================================================
 */
export function SkuOnerButonu({
  kategoriId,
  ad,
  marka,
  mevcutSku,
  kullanilan,
  onOneri,
}: {
  kategoriId: string;
  ad: string;
  marka: string;
  /** Formdaki SKU alanının o anki değeri. Doluysa özdeşlik dalı çalışır. */
  mevcutSku: string;
  /** Aynı formdaki diğer varyantların kodları — sıra onları atlasın. */
  kullanilan: string[];
  onOneri: (kod: string) => void;
}) {
  const t = useTranslations("Urunler");
  const ortak = useTranslations("Ortak");

  const [bekliyor, gecis] = useTransition();
  const [sonuc, setSonuc] = useState<SkuOnerisi | null>(null);

  function iste() {
    gecis(async () => {
      const cevap = await skuOner({ kategoriId, ad, marka, mevcutSku, kullanilan });
      setSonuc(cevap);
      if ("kod" in cevap) onOneri(cevap.kod);
    });
  }

  const hata = sonuc && "hata" in sonuc ? sonuc : null;

  return (
    <div className="space-y-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={bekliyor}
        onClick={iste}
      >
        <Wand2 />
        {bekliyor ? ortak("bekleyin") : ortak("oner")}
      </Button>

      {hata ? (
        <p className={`text-xs ${DURUM_YAZISI.uyari}`}>
          {hata.hata === "KATEGORI_SECILMEDI" ? t("skuOneriKategoriYok") : null}
          {hata.hata === "KISALTMA_YOK" ? t("skuOneriAdYok") : null}
          {hata.hata === "MARKA_TABLODA_YOK" ? (
            <>
              {hata.ad ? t("skuOneriMarkaTablodaYok", { ad: hata.ad }) : t("skuOneriMarkaYok")}{" "}
              <Link href="/ayarlar/markalar" target="_blank" rel="noopener" className="underline underline-offset-4">
                {t("skuOneriMarkaDuzelt")}
              </Link>
            </>
          ) : null}
          {hata.hata === "KATEGORI_KODSUZ" ? (
            <>
              {t("skuOneriKategoriKodsuz", { ad: hata.ad ?? "" })}{" "}
              <Link
                href="/ayarlar/kategoriler"
                target="_blank"
                rel="noopener"
                className="underline underline-offset-4"
              >
                {t("skuOneriKategoriDuzelt")}
              </Link>
            </>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
