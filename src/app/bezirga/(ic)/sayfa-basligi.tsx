/**
 * YÖNETİM SAYFA BAŞLIĞI — referans iskeletin `header.phead`i: başlık + bir
 * satır «ne işe yarar» + sağda sayfanın eylemleri. Her yönetim sayfası bunu
 * kullanır (İlke #10).
 */
export function SayfaBasligi({ baslik, aciklama, eylemler, ust }: { baslik: string; aciklama?: string; eylemler?: React.ReactNode; ust?: React.ReactNode }) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {ust}
        <h1 className="text-2xl font-semibold">{baslik}</h1>
        {aciklama ? <p className="text-muted-foreground mt-1 text-sm">{aciklama}</p> : null}
      </div>
      {eylemler ? <div className="flex flex-wrap items-center gap-2">{eylemler}</div> : null}
    </header>
  );
}
