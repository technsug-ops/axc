/**
 * KULLANIM KUTUCUKLARI — paket adet sınırları (K303 ②, 06.10.2026).
 * Süper admin firma kartı ve firmanın «Paketim» sayfası AYNI bileşeni çizer
 * (İlke #10). Sayılar sunucuda `lib/paket/sinirlar` gövdesinden gelir.
 */
const ALANLAR = ["kanalHesabi", "kullanici", "aylikSiparis"] as const;

/** Kullanım kutucukları — «2 / 3». Dolu sarı, aşılmış kırmızı (sınırsızda «sınırsız»). */
export function KullanimKutulari({
  kullanim,
  sinirlar,
  etiketler,
  sinirsiz,
  durumlar,
}: {
  kullanim: Record<(typeof ALANLAR)[number], number>;
  sinirlar: Record<(typeof ALANLAR)[number], number | null>;
  etiketler: Record<(typeof ALANLAR)[number], string>;
  sinirsiz: string;
  durumlar: Record<(typeof ALANLAR)[number], { sinif: string; metin: string | null }>;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {ALANLAR.map((a) => (
        <div key={a} className={`rounded-lg border p-3 ${durumlar[a].sinif}`}>
          <div className="text-muted-foreground text-xs">{etiketler[a]}</div>
          <div className="text-xl font-semibold tabular-nums">
            {kullanim[a]} <span className="text-muted-foreground text-base font-normal">/ {sinirlar[a] === null ? sinirsiz : sinirlar[a]}</span>
          </div>
          {durumlar[a].metin ? <div className="text-xs font-medium">{durumlar[a].metin}</div> : null}
        </div>
      ))}
    </div>
  );
}
