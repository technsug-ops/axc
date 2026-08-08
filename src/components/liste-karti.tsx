import type { ReactNode } from "react";

/**
 * Mobil liste kartı (Kullanıcı Kolaylığı İlkeleri #8, #10).
 *
 * Telefonda tablolar yatay kaydırma gerektirdiği için her kayıt bir kart
 * olarak gösterilir: tüm bilgi ve düğmeler ekrana sığar, kaydırma gerekmez.
 * Tüm listeler aynı bileşeni kullanır ki kartlar her ekranda aynı görünsün.
 *
 * Kullanım: masaüstünde tablo (`hidden md:block`), telefonda kart (`md:hidden`).
 */
export function ListeKarti({
  baslik,
  altBaslik,
  alanlar,
  eylemler,
}: {
  baslik: ReactNode;
  altBaslik?: ReactNode;
  /** Etiket-değer çiftleri; değeri boş olanlar gösterilmez. */
  alanlar: { etiket: string; deger: ReactNode }[];
  eylemler?: ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="space-y-1">
        <div className="leading-tight font-medium">{baslik}</div>
        {altBaslik ? (
          <div className="text-muted-foreground text-xs">{altBaslik}</div>
        ) : null}
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {alanlar.map((alan) => (
          <div key={alan.etiket} className="min-w-0">
            <dt className="text-muted-foreground text-xs">{alan.etiket}</dt>
            <dd className="truncate">{alan.deger}</dd>
          </div>
        ))}
      </dl>

      {eylemler ? (
        <div className="flex flex-wrap gap-2 pt-1">{eylemler}</div>
      ) : null}
    </div>
  );
}
