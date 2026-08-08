import Link from "next/link";

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
