/**
 * YÖNETİM SAYFA BAŞLIĞI — referans `header.phead` BİREBİR: başlık (Poppins) +
 * bir satır «ne işe yarar» + sağda sayfanın eylemleri. Her yönetim sayfası
 * bunu kullanır (İlke #10).
 */
export function SayfaBasligi({ baslik, aciklama, eylemler, ust }: { baslik: string; aciklama?: string; eylemler?: React.ReactNode; ust?: React.ReactNode }) {
  return (
    <header className="yn-phead">
      <div style={{ minWidth: 0 }}>
        {ust}
        <h1>{baslik}</h1>
        {aciklama ? <p>{aciklama}</p> : null}
      </div>
      {eylemler ? <div className="yn-row">{eylemler}</div> : null}
    </header>
  );
}
