import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Standart bağlantı (Kullanıcı Kolaylığı İlkeleri #2, #10).
 *
 * Tıklanabilir olan tıklanabilir GÖRÜNÜR: altı her zaman çizili ve vurgu
 * renginde. Eskiden yalnızca hover'da altı çiziliyordu — telefonda hover
 * olmadığı için link düz metin gibi duruyordu.
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
        "text-primary decoration-primary/40 hover:decoration-primary font-medium underline underline-offset-4 transition-colors",
        className,
      )}
      {...props}
    />
  );
}

/**
 * "← Geri" bağlantısı. Tüm detay/form sayfalarında aynı görünür (#2, #10):
 * ok ikonu + her zaman çizili alt çizgi.
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
      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm underline decoration-current/40 underline-offset-4 transition-colors"
    >
      <ChevronLeft className="size-3.5 shrink-0" />
      {children}
    </Link>
  );
}
