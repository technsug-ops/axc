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
 * SEKME — bütün sekme şeritleri BURADAN okur (ortak sekme bileşeni, ürün analizi,
 * kârlılık kartı, alım rehberi, buybox).
 *
 * K330-④ (10.10.2026, «bunlar da yeni stile çevir»): Algoritmo'nun ALT ÇİZGİLİ
 * sekmesi — aktif sekme vurgu renginde alt çizgi + yazı (eski: dolu aksan hapı).
 * ⏩ ÇEVRİLDİ — kullanıcı 30.10.2026 (alım rehberi ekran görüntüsü): «buradaki
 * butonlar çok ilkel; daha kaliteli, görünür ve modern olsun». Alt çizgi düz metin
 * gibi okunuyordu (İlke #2: tıklanabilir görünür). Yeni biçim: hafif gri RAY
 * içinde hap sekmeler; aktif sekme beyaz + gölge + vurgu renginde yazı. 16.08
 * kararı korunur: aktif hâlde siyah/aksan DOLGU yok. Sayı ayrı rozette
 * (`sekmeSayaciSinifi`) — «(42)» parantezi metne karışıyordu.
 */
export const SEKME_SERIDI =
  "flex w-full max-w-full gap-1 overflow-x-auto overflow-y-hidden rounded-xl border bg-muted/60 p-1 [scrollbar-width:none] md:w-fit";
export function sekmeSinifi(aktif: boolean): string {
  return `inline-flex h-11 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[13px] whitespace-nowrap transition-all md:h-9 ${
    aktif
      ? "bg-background font-semibold text-[var(--se-vurgu)] shadow-sm ring-1 ring-black/5 dark:ring-white/10"
      : "text-muted-foreground font-medium hover:bg-background/70 hover:text-foreground"
  }`;
}
/** Sekmedeki sayı rozeti — aktifte vurgu tonunda, pasifte nötr. */
export function sekmeSayaciSinifi(aktif: boolean): string {
  return `inline-flex min-w-6 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] leading-none font-semibold tabular-nums ${
    aktif ? "bg-[var(--se-vurgu-bg)] text-[var(--se-vurgu)]" : "bg-background/80 text-muted-foreground"
  }`;
}
