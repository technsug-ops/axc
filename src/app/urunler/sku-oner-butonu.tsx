"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Wand2 } from "lucide-react";

import { Button } from "@/components/ui/button";

import { skuOner, type SkuOnerisi } from "./sku-oner";

/**
 * ============================================================================
 *  SKU "ÖNER" DÜĞMESİ
 * ----------------------------------------------------------------------------
 *  Basınca İKİ ALANI BİRDEN aynı değerle doldurur: SKU ve Firma SKU.
 *  `F-` öneki YOK — kullanıcı kararı 11.08.2026. Alanlar şemada ayrı kalır,
 *  varsayılan davranış özdeştir; isteyen elle ayırabilir.
 *
 *  Hesap SUNUCUDA yapılır (kategori kodu ve o günkü sıra veritabanından
 *  okunur), o yüzden düğme beklerken kilitlenir.
 *
 *  ÜRETİLEMEZSE SESSİZ KALMAZ (#5): sebebini yazar ve düzeltme yerini
 *  gösterir — kategoriye kod verilmemişse doğrudan kategori ekranına bağlar.
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
        <p className="text-xs text-amber-700 dark:text-amber-400">
          {hata.hata === "KATEGORI_SECILMEDI" ? t("skuOneriKategoriYok") : null}
          {hata.hata === "KISALTMA_YOK" ? t("skuOneriAdYok") : null}
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
