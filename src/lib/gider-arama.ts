/**
 * GİDER ARAMASI — TEK KOŞUL (K289 · İlke #17). `/giderler` ekranı ve «giderler»
 * Excel'i AYNI koşulu kullanır (sayı = liste): açıklama · kategori adı · şablon
 * adı · kart adında arar. Boş arama → koşul yok.
 * Toplam şeridi bu koşuldan geçen kümeden hesaplanır — İlke #15: toplam
 * süzgeçle (aramayla) birlikte değişir.
 */
export function giderAramaKosulu(q: string | undefined) {
  const e = (q ?? "").trim();
  if (e === "") return {};
  return {
    OR: [
      { description: { contains: e } },
      { category: { name: { contains: e } } },
      { template: { name: { contains: e } } },
      { creditCard: { label: { contains: e } } },
    ],
  };
}
