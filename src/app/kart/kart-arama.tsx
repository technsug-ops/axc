"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";

import { BarkodGirisi } from "@/components/barkod-okuyucu";
import { Button } from "@/components/ui/button";

/**
 * ============================================================================
 *  KÂRLILIK KARTI ARAMASI — MAĞAZADA, TELEFONLA
 * ----------------------------------------------------------------------------
 *  Kullanım anı: raftaki ürünü elinde tutuyorsun, alıp almayacağına karar
 *  vereceksin. En hızlı yol OKUTMAK.
 *
 *  ── KARAR BURADA DEĞİL, SUNUCUDA ────────────────────────────────────────
 *  ⚠ 17.08.2026 hatası: tam eşleşmede doğrudan karta gitme kuralı YALNIZ bu
 *  bileşende vardı. Kamerayla okutunca kart açılıyor, aynı kodu KLAVYEYLE
 *  yazıp Ara'ya basınca tek elemanlı bir liste çıkıp bir tıklama daha
 *  istiyordu. Aynı sorunun iki giriş yolunda iki cevabı olamaz.
 *
 *  Bu bileşen artık yalnız `/kart?q=...` adresine gidiyor; tam eşleşme ve
 *  tek-sonuç yönlendirmesini `lib/kart-arama-karari.ts` veriyor.
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

  /** Okutulan kod da yazılan metin de aynı yere gider — karar sunucuda. */
  function okundu(kod: string) {
    const temiz = kod.trim();
    if (temiz === "") return;
    basla(() => yaziylaAra(temiz));
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
