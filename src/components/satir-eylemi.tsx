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
/**
 * TELEFON: eşit genişlik KUTU — ikon üstte, kısa ad altta, 52 px; hiçbir düğme
 * alt satıra tek başına düşmez (ızgara `SatirEylemleri`de). MASAÜSTÜ AYNEN:
 * 32 px ikon düğme. K272 (kullanıcı 25.09.2026: «iç sayfalar çok dağınık, farklı boylarda, farklı
 * genişlikte, yazılar taşıyor»; onaylanan demo Telefon ④–⑥).
 */
export const EYLEM_SINIFI =
  "h-[52px] w-full min-w-0 flex-col gap-0.5 px-1 text-[11px] md:h-8 md:w-8 md:flex-row md:gap-2 md:px-0 md:text-sm";

/**
 * DURUM DÜĞMESİ (K275) — metni masaüstünde de gösteren eylemler (Kargolanacak ·
 * Paketlendi). Masaüstü kendi sınıfında kalır; TELEFONDA `EYLEM_SINIFI` ile AYNI
 * kutu: 52 px, tam genişlik, ikon üstte, ad altta. Kullanıcı 25.09: _«Kargoya
 * verildi butonu diğer butonun üzerine gelmiş»_ — iki düğme eşit ızgaraya
 * (K272) girmemişti, kendi genişliklerinde kalıp komşu kutuya taşıyordu.
 */
export const DURUM_EYLEMI_SINIFI =
  "max-md:h-[52px] max-md:w-full max-md:min-w-0 max-md:flex-col max-md:gap-0.5 max-md:px-1 max-md:text-[11px]";
/** Izgara hücresinde kutuyu saran öğe — telefonda hücreyi doldurur, taşmaz. */
export const DURUM_EYLEMI_KABI = "max-md:w-full max-md:min-w-0";

/** Metin masaüstünde gizlenir; ikon her iki görünümde de durur. */
export function EylemEtiketi({ children }: { children: React.ReactNode }) {
  return <span className="max-w-full truncate md:hidden">{children}</span>;
}

/**
 * Satırdaki düğmeleri yan yana tutar.
 *
 * ⚠ Masaüstünde SARMA YOK (`md:flex-nowrap`). Sütun sıkışınca üç düğme alt
 * alta diziliyordu: 3 × 32px + boşluklar ≈ 112px. Satır yüksekliği bu yüzden
 * üçe katlanıyordu ve sebebi görünmüyordu — düğmeler zaten ekranın dışında
 * kalıyordu. Telefonda (kart görünümü) sarma açık kalır; orada düğmeler
 * metinli ve 44px, dar ekranda alt satıra inmeleri doğru davranış.
 */
export function SatirEylemleri({ children }: { children: React.ReactNode }) {
  return (
    /* Telefonda EŞİT sütun ızgara — kaç eylem varsa o kadar sütun, tek satır (K272). */
    <div className="grid w-full auto-cols-[minmax(0,1fr)] grid-flow-col gap-1.5 md:flex md:w-auto md:flex-nowrap md:items-center md:gap-2">
      {children}
    </div>
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
