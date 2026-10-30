import Link from "@/components/niyetli-baglanti";
import { ChevronLeft } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Standart bağlantı (Kullanıcı Kolaylığı İlkeleri #2, #10).
 *
 * Tıklanabilir olan tıklanabilir GÖRÜNÜR: vurgu renginde ve kalın. Eskiden
 * yalnızca hover'da altı çiziliyordu — telefonda hover olmadığı için link düz
 * metin gibi duruyordu; sonra altı HER ZAMAN çizili yapıldı.
 *
 * ⚠ ALT ÇİZGİ KALDIRILDI — kullanıcı kararı 30.10.2026: _"alti cizgili yazi
 * kötü duruyor, programın hiçbir yerinde istemiyorum."_ İlke #2'nin işaretini
 * artık RENK taşıyor (vurgu rengi + kalınlık; üzerine gelince açılır). Bekçisi:
 * `alt-cizgi:dogrula` — `src/` altında hiçbir sınıf dizesinde `underline`
 * geçemez (desen yasağı; dosya listesi yok).
 *
 * Tüm ekranlarda bu bileşen kullanılır ki her yerde aynı görünsün.
 */
export function Baglanti({
  className,
  ...props
}: React.ComponentProps<typeof Link>) {
  return (
    <Link
      className={cn(
        "text-primary hover:text-primary/80 font-medium transition-colors",
        className,
      )}
      {...props}
    />
  );
}

/**
 * "← Geri" bağlantısı. Tüm detay/form sayfalarında aynı görünür (#2, #10):
 * ok ikonu (alt çizgi 30.10.2026'da kaldırıldı — bkz. yukarı).
 */
export function GeriBaglanti({
  href,
  children,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  /**
   * Tiklamayi devralmak isteyen ekranlar icin (K104: "geri" tarayici
   * gecmisine dusmeli ki liste suzgeci korunsun). Verilmezse bilesen
   * duz bir bagLANTI olarak calisir — JS'siz ve dogrudan-link halinde de.
   */
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
    >
      <ChevronLeft className="size-3.5 shrink-0" />
      {children}
    </Link>
  );
}
