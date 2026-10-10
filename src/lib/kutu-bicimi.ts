/**
 * ============================================================================
 *  KUTU BİÇİMİ — SAYI KUTULARININ TEK YAZI KAYNAĞI (K330-③ Paket B, 10.10.2026)
 * ----------------------------------------------------------------------------
 *  Kullanıcı kararı 10.10.2026: «sistemdeki bütün kutular» Kârlılık kartının
 *  (Algoritmo) diline. Ekranların kendi kutu bileşenleri (nakit özeti, nakit
 *  takvimi, hakediş, iadeler, kanal listeleme, kârlılık kartı) etiket ve rakam
 *  yazısını BURADAN okur — tasarım tek yerden değişir. Ölçü `IstatistikKutusu`
 *  ile aynı: etiket 13 px orta kalınlık, rakam kalın + sabit genişlikli rakam.
 * ============================================================================
 */
export const KUTU_ETIKETI = "text-muted-foreground text-[13px] font-medium";
export const KUTU_RAKAMI = "font-bold tabular-nums";

/**
 * ALT ÇİZGİLİ SEKME (Algoritmo) — K330-④ (kullanıcı 10.10.2026: «bunlar da yeni
 * stile çevir»). Ortak sekme bileşeni, ürün analizi ve kârlılık kartı BURADAN
 * okur. Aktif sekme vurgu renginde alt çizgi + yazı (eski: dolu aksan hapı).
 */
export const SEKME_SERIDI = "flex gap-1 overflow-x-auto overflow-y-hidden border-b [scrollbar-width:none]";
export function sekmeSinifi(aktif: boolean): string {
  return `inline-flex h-11 shrink-0 items-center border-b-2 px-3 text-[13px] font-medium ${
    aktif ? "border-[var(--se-vurgu)] text-[var(--se-vurgu)]" : "text-muted-foreground border-transparent hover:text-foreground"
  }`;
}
