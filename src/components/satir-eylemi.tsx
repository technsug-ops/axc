import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * ============================================================================
 *  SATIR EYLEMİ — LİSTELERDEKİ DETAY / DÜZENLE / SİL DÜĞMELERİ
 * ----------------------------------------------------------------------------
 *  11.08.2026'da ürün listesinde şu ortaya çıktı: sekiz sütunun hepsi
 *  `whitespace-nowrap` olduğu için uzun ürün adı tabloyu ekranın dışına
 *  itiyordu ve EYLEM DÜĞMELERİ HİÇ GÖRÜNMÜYORDU — yatay kaydırmadan
 *  ulaşılamıyordu. Anayasa #1 "görünür eylemler" doğrudan ihlaldi.
 *
 *  ÇÖZÜM — tek bileşen, iki görünüm, tek kaynak:
 *
 *  - MASAÜSTÜ (tablo, md ve üstü): SADECE İKON. Metin `md:hidden` ile
 *    gizlenir, `title` ve `aria-label` metni taşımaya devam eder.
 *    Üç düğme ~280px yerine ~110px yer kaplar, satır ekrana sığar.
 *
 *  - TELEFON (kart, md altı): İKON + METİN, ve yükseklik 44px.
 *    Anayasa #8: dokunulabilir her öğe telefonda en az 44x44 px.
 *    `size="sm"` (32px) tek başına yeterli değildi.
 *
 *  Aynı `eylemler()` fonksiyonu hem tabloda hem kartta kullanıldığı için
 *  ayrım CSS'te yapılır; iki ayrı liste kodu tutulmaz (#10 tutarlılık).
 * ============================================================================
 */

/**
 * Düğme ölçüsü — telefonda 44px dokunma hedefi, tabloda 32px kare ikon.
 * Kendi düğmesini yazan bileşenler (ör. silme diyaloğu) de bunu kullanır ki
 * aynı satırdaki düğmeler aynı boyda dursun.
 */
export const EYLEM_SINIFI = "h-11 px-3 md:h-8 md:w-8 md:px-0";

/** Metin masaüstünde gizlenir; ikon her iki görünümde de durur. */
export function EylemEtiketi({ children }: { children: React.ReactNode }) {
  return <span className="md:hidden">{children}</span>;
}

/** Satırdaki düğmeleri yan yana ve tek satırda tutar. */
export function SatirEylemleri({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">{children}</div>
  );
}

/** Bir yere götüren satır eylemi (detay, düzenle, mal kabul...). */
export function SatirEylemi({
  href,
  ikon: Ikon,
  etiket,
  birincil = false,
  className,
}: {
  href: string;
  ikon: LucideIcon;
  /** Hem ekranda (telefonda) hem ekran okuyucuda kullanılan metin. */
  etiket: string;
  /** Satırın asıl işi (ör. "Mal kabul") — dolu renkle öne çıkar. */
  birincil?: boolean;
  className?: string;
}) {
  return (
    <Button
      variant={birincil ? "default" : "outline"}
      size="sm"
      asChild
      className={cn(EYLEM_SINIFI, className)}
    >
      <Link href={href} title={etiket} aria-label={etiket}>
        <Ikon />
        <EylemEtiketi>{etiket}</EylemEtiketi>
      </Link>
    </Button>
  );
}
