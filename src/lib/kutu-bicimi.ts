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
 * SEÇİM ÇİPİ — dönem / kanal / süzgeç düğmeleri (Son 30 gün · Son 3 ay …).
 * ⏩ 30.10.2026 (ikinci tur) kullanıcı: «satışlar sayfasındaki butonları referans
 * al». Satışlar'ın dönem düğmeleri standart `Button`: seçili `default` (koyu
 * dolgu), diğerleri `outline` (beyaz + çerçeve + gölge). Renkler o iki varyantın
 * BİREBİR karşılığı — iki ekran aynı görünür (İlke #10).
 * (Aynı günün ilk turunda aktif = vurgu tonunda açık zemin denenmişti; kullanıcı
 * Satışlar'ın koyu dolgulu düğmesini referans gösterdi, o biçim düştü.)
 * Ekranlar yalnız RENK kısmını buradan alır; yükseklik/yerleşim kendi yerinde.
 */
export const SECIM_AKTIF = "border-primary bg-primary text-primary-foreground hover:bg-primary/80";
export const SECIM_PASIF =
  "border-border bg-background text-foreground shadow-xs hover:bg-muted hover:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50";

/**
 * SEKME — bütün sekme şeritleri BURADAN okur (ortak sekme bileşeni, ürün analizi,
 * kârlılık kartı, alım rehberi, buybox).
 *
 * K330-④ (10.10.2026): Algoritmo'nun ALT ÇİZGİLİ sekmesi (eski: dolu aksan hapı).
 * ⏩ 30.10.2026 kullanıcı (alım rehberi ekran görüntüsü): «buradaki butonlar çok
 * ilkel; daha kaliteli, görünür ve modern olsun» — alt çizgi düz metin gibi
 * okunuyordu (İlke #2). İlk tur: gri ray içinde hap sekme.
 * ⏩ Aynı gün ikinci tur: «satışlar sayfasındaki butonları referans al». Sekme
 * artık Satışlar'ın dönem düğmesiyle AYNI: seçili koyu dolgu, diğerleri beyaz
 * çerçeveli; telefonda 44 px (İlke #8), masaüstünde 32 px (`Button size="sm"`
 * + `md:h-8`, Satışlar'daki ölçü). 16.08'deki «aktif hâlde koyu dolgu yok»
 * kararı bu kullanıcı kararıyla ÇEVRİLDİ. Sayı ayrı rozette (`sekmeSayaciSinifi`).
 */
export const SEKME_SERIDI =
  "flex w-full max-w-full gap-2 overflow-x-auto overflow-y-hidden pb-0.5 [scrollbar-width:none]";
export function sekmeSinifi(aktif: boolean): string {
  return `inline-flex h-11 shrink-0 items-center gap-1.5 rounded-[min(var(--radius-md),12px)] border px-2.5 text-[0.8rem] font-medium whitespace-nowrap transition-all md:h-8 ${
    aktif ? SECIM_AKTIF : SECIM_PASIF
  }`;
}
/** Sekmedeki sayı rozeti — koyu dolgulu aktif sekmede açık yazı, pasifte nötr. */
export function sekmeSayaciSinifi(aktif: boolean): string {
  return `inline-flex min-w-6 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] leading-none font-semibold tabular-nums ${
    aktif ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
  }`;
}
