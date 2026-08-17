"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";

import { BarkodGirisi } from "@/components/barkod-okuyucu";
import { Button } from "@/components/ui/button";
import { varyantKodlaBul } from "@/app/varyant-arama";

/**
 * ============================================================================
 *  KÂRLILIK KARTI ARAMASI — MAĞAZADA, TELEFONLA
 * ----------------------------------------------------------------------------
 *  Kullanım anı: raftaki ürünü elinde tutuyorsun, alıp almayacağına karar
 *  vereceksin. En hızlı yol OKUTMAK.
 *
 *  ── OKUTMA DOĞRUDAN KARTA GİDER ─────────────────────────────────────────
 *  Barkod okunduğunda (USB Enter ya da kamera) önce TAM EŞLEŞME denenir
 *  (`varyantKodlaBul`). Bulunursa arama sonucu listesi hiç gösterilmez, kart
 *  doğrudan açılır — okuttuktan sonra bir de listeden seçtirmek, elinde
 *  ürünle bekleyen birine fazladan dokunuş demektir (İlke #9).
 *
 *  Bulunamazsa yazıyla aramaya düşülür: kod yanlış okunmuş olabilir ya da
 *  ürün gerçekten kayıtlı değildir. İkisi de SESSİZ kalmaz.
 * ============================================================================
 */
export function KartArama({ baslangic }: { baslangic: string }) {
  const router = useRouter();
  const t = useTranslations("UrunKarti");
  const ortak = useTranslations("Ortak");
  const [sorgu, setSorgu] = useState(baslangic);
  const [bekliyor, basla] = useTransition();

  function yaziylaAra(deger: string) {
    const temiz = deger.trim();
    router.push(temiz ? `/kart?q=${encodeURIComponent(temiz)}` : "/kart");
  }

  /** Okutulan kod: önce tam eşleşme, olmazsa arama. */
  function okundu(kod: string) {
    const temiz = kod.trim();
    if (temiz === "") return;
    basla(async () => {
      const varyant = await varyantKodlaBul(temiz);
      if (varyant) router.push(`/kart/${varyant.id}`);
      else yaziylaAra(temiz);
    });
  }

  return (
    <div className="flex flex-wrap items-start gap-2">
      <BarkodGirisi
        // Mobil öncelikli: alan tam genişlikte başlar, kamera düğmesi yanında.
        className="min-w-48 flex-1 sm:max-w-sm"
        value={sorgu}
        onChange={setSorgu}
        onOkundu={okundu}
        placeholder={t("aramaIpucu")}
        kameraBasligi={t("kameraBasligi")}
        disabled={bekliyor}
        autoFocus
      />
      <Button
        type="button"
        variant="secondary"
        onClick={() => yaziylaAra(sorgu)}
        disabled={bekliyor}
        // 44px dokunma hedefi (İlke #8) — mağazada tek elle kullanılır.
        className="h-11"
      >
        <Search />
        {bekliyor ? t("araniyor") : ortak("ara")}
      </Button>
    </div>
  );
}
