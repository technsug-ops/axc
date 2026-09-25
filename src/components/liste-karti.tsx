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
  gorsel,
  altBaslik,
  alanlar,
  eylemler,
}: {
  baslik: ReactNode;
  /** K273: başlığın SOLUNDA ürün küçük resmi (`UrunGorseli`). */
  gorsel?: ReactNode;
  altBaslik?: ReactNode;
  /** Etiket-değer çiftleri; değeri boş olanlar gösterilmez. */
  alanlar: { etiket: string; deger: ReactNode }[];
  eylemler?: ReactNode;
}) {
  /* EŞİT KUTU (K272): 3'ün katıysa 3 sütun, değilse 2; tek kalan kutu satırı
     doldurur — boş hücre yok (demo Telefon ⑤). */
  const ucSutun = alanlar.length % 3 === 0;
  return (
    <div className="bg-card min-w-0 space-y-2.5 rounded-xl border p-3">
      <div className="flex items-start gap-2.5">
      {gorsel}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="line-clamp-2 min-w-0 leading-tight font-medium break-words">{baslik}</div>
        {altBaslik ? (
          <div className="text-muted-foreground min-w-0 truncate text-xs">{altBaslik}</div>
        ) : null}
      </div>
      </div>

      <dl className={`grid gap-1.5 text-sm ${ucSutun ? "grid-cols-3" : "grid-cols-2"}`}>
        {alanlar.map((alan, i) => (
          <div
            key={alan.etiket}
            className={`bg-muted/60 min-w-0 rounded-lg px-2.5 py-1.5 ${
              !ucSutun && alanlar.length % 2 === 1 && i === alanlar.length - 1 ? "col-span-2" : ""
            }`}
          >
            <dt className="text-muted-foreground truncate text-[11px]">{alan.etiket}</dt>
            <dd className="truncate font-semibold tabular-nums">{alan.deger}</dd>
          </div>
        ))}
      </dl>

      {eylemler ? (
        /* Eylemler TEK SATIR, eşit sütun (K272) — `SatirEylemleri` ile aynı kural. */
        <div className="grid auto-cols-[minmax(0,1fr)] grid-flow-col gap-1.5 [&>*]:min-w-0">{eylemler}</div>
      ) : null}
    </div>
  );
}
