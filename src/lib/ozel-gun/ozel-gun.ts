import { eksikAdet, REHBER_YOLU, type RehberSatiri } from "@/lib/rapor/alim-rehberi";

/**
 * ============================================================================
 *  ÖZEL GÜN TAKVİMİ — SAF HESAP (K363 Faz 2-b, kullanıcı onayı 24.10.2026)
 * ----------------------------------------------------------------------------
 *  İki tür gün: SATIŞ GÜNÜ (müşteri talebi artar — stokla girilir) · ALIM
 *  KAMPANYASI (ucuz mal alınır — alım zamanı kaçırılmaz). Kullanıcı kararı:
 *  ikisi de, listeyi sistem hazırlar kullanıcı onaylar.
 *
 *  ⛔ HANGİ GÜNÜN ÖNEMLİ OLDUĞU KODA GÖMÜLMEZ — kendi satışımızla ÖLÇÜLÜR.
 *  Ölçüldü 24.10.2026 (canlı, salt okuma): 28.11.2025 Black Friday 48 sipariş
 *  (geçmişin en yoğun günü; o dönem normal gün ~17) · 11.11.2025 35 · Anneler
 *  Günü 10.05.2026 haftası 102 (belirgin sıçrama YOK). Bu yüzden ekran her gün
 *  için «geçen yılki karşılığında normalin kaç katı» yazar (`carpan`).
 *
 *  «Geçen yılki karşılık» TAKVİM GÜNÜYLE değil, aynı özel günün bir önceki
 *  tarih satırıyla bulunur — bayram ve Black Friday her yıl başka güne düşer.
 * ============================================================================
 */

export const OZEL_GUN_TURLERI = ["SATIS_GUNU", "ALIM_KAMPANYASI"] as const;
export type OzelGunTuru = (typeof OZEL_GUN_TURLERI)[number];

/** Ad alanı sütunu VARCHAR(191); ekranda okunur kalsın diye daha kısa tutulur. */
export const AD_EN_UZUN = 100;

/**
 * Bir tarih satırının en uzun hâli (gün, iki uç dahil). GEREKÇE: Alım rehberi en
 * çok 90 gün ileri bakar (`ILERI_GUNLER`); bundan uzun bir «gün» ne yaklaşan
 * listesine sığar ne de geçen yılla anlamlı kıyaslanır (pencere neredeyse
 * çeyreği kapsar, özel gün olmaktan çıkar). «Efsane Kasım» gibi ay boyu süren
 * kampanya (30–31 gün) rahat sığar. Uydurma eşik değil, rehberin ufkundan türer.
 */
export const EN_UZUN_ARALIK_GUN = 93;

/**
 * Çarpanın «normal hızı»: pencereden ÖNCEKİ 28 gün. 28 = tam dört hafta, yani
 * haftanın her günü eşit sayıda temsil edilir (hafta sonu yoğunluğu tabanı
 * kaydırmaz). Pencereden sonrası alınmaz: kampanya sonrası düşüş tabanı düşürüp
 * çarpanı şişirirdi.
 */
export const TABAN_GUN = 28;

/** Rehberin bakış ufku — yaklaşan özel günler bu kadar ileriye bakar. */
export const YAKLASAN_GUN = 90;

const GUN_MS = 86_400_000;

/** «YYYY-MM-DD» → UTC gece yarısı etiketi. Yıl 2000–2100 ve GERÇEK takvim günü değilse `null`. */
export function gunCoz(ham: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ham.trim());
  if (!m) return null;
  const [yil, ay, gun] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (yil < 2000 || yil > 2100) return null;
  const d = new Date(Date.UTC(yil, ay - 1, gun));
  /* 31 Şubat gibi taşan gün JavaScript'te sessizce Mart'a kayar — kapıda reddedilir. */
  if (d.getUTCFullYear() !== yil || d.getUTCMonth() !== ay - 1 || d.getUTCDate() !== gun) return null;
  return d;
}

/** UTC gece yarısı etiketi → «YYYY-MM-DD». */
export function gunMetni(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** İki uç DAHİL gün sayısı. */
export function aralikGunu(baslangic: Date, bitis: Date): number {
  return Math.round((bitis.getTime() - baslangic.getTime()) / GUN_MS) + 1;
}

export type AdHatasi = "AD_BOS" | "AD_UZUN";
export function adDogrula(ham: string): { tamam: true; ad: string } | { tamam: false; hata: AdHatasi } {
  const ad = ham.trim().replace(/\s+/g, " ");
  if (ad === "") return { tamam: false, hata: "AD_BOS" };
  if (ad.length > AD_EN_UZUN) return { tamam: false, hata: "AD_UZUN" };
  return { tamam: true, ad };
}

export function turDogrula(ham: string): OzelGunTuru | null {
  return (OZEL_GUN_TURLERI as readonly string[]).includes(ham) ? (ham as OzelGunTuru) : null;
}

export type TarihHatasi = "TARIH_GECERSIZ" | "BITIS_ONCE" | "ARALIK_UZUN";
export function tarihDogrula(
  basHam: string,
  bitHam: string,
): { tamam: true; baslangic: Date; bitis: Date } | { tamam: false; hata: TarihHatasi } {
  const baslangic = gunCoz(basHam);
  /* Bitiş boşsa tek günlük özel gün (Black Friday, 11.11) — en sık durum. */
  const bitis = bitHam.trim() === "" ? baslangic : gunCoz(bitHam);
  if (baslangic === null || bitis === null) return { tamam: false, hata: "TARIH_GECERSIZ" };
  if (bitis.getTime() < baslangic.getTime()) return { tamam: false, hata: "BITIS_ONCE" };
  if (aralikGunu(baslangic, bitis) > EN_UZUN_ARALIK_GUN) return { tamam: false, hata: "ARALIK_UZUN" };
  return { tamam: true, baslangic, bitis };
}

export type TarihSatiri = {
  id: string;
  ozelGunId: string;
  baslangic: Date;
  bitis: Date;
  dogrulandi: boolean;
};

/** Aynı özel günün, bu tarihten ÖNCE başlayan EN YAKIN tarihi — «geçen yılki karşılık». Yoksa `null`. */
export function oncekiTarih<T extends TarihSatiri>(tarihler: readonly T[], t: TarihSatiri): T | null {
  let sonuc: T | null = null;
  for (const x of tarihler) {
    if (x.ozelGunId !== t.ozelGunId || x.baslangic.getTime() >= t.baslangic.getTime()) continue;
    if (sonuc === null || x.baslangic.getTime() > sonuc.baslangic.getTime()) sonuc = x;
  }
  return sonuc;
}

/**
 * Yaklaşan tarihler: bitişi bugün ya da sonrası VE başlangıcı en geç bugün+ileri.
 * Sürmekte olan gün de girer (Efsane Kasım ortasında «yaklaşan» listesinden
 * düşmesi, tam o an bakılması gereken bilgiyi saklardı). Sıra: başlangıç.
 * `bugun` = İstanbul takvim günü (UTC gece yarısı etiketi).
 */
export function yaklasanTarihler<T extends TarihSatiri>(tarihler: readonly T[], bugun: Date, ileri: number): T[] {
  const ufuk = bugun.getTime() + ileri * GUN_MS;
  return tarihler
    .filter((t) => t.bitis.getTime() >= bugun.getTime() && t.baslangic.getTime() <= ufuk)
    .sort((a, b) => a.baslangic.getTime() - b.baslangic.getTime());
}

export type YaklasanGun<G> = { tarih: G extends { tarihler: (infer T)[] } ? T : never; gun: G; onceki: (G extends { tarihler: (infer T)[] } ? T : never) | null };

/**
 * Önümüzdeki `YAKLASAN_GUN` gündeki (sürenler dahil) AKTİF günlerin tarihleri,
 * her biri geçen yılki karşılığıyla. Pasif gün LİSTELENMEZ — ama tarihleri
 * karşılık aramasına da girmez (pasif günün tarihi başka bir günün karşılığı
 * olamaz; karşılık aynı günün içinden aranır).
 */
export function yaklasanlar<T extends TarihSatiri, G extends { id: string; aktif: boolean; tarihler: T[] }>(
  kayitlar: readonly G[],
  bugun: Date,
): YaklasanGun<G>[] {
  const aktif = kayitlar.filter((k) => k.aktif);
  const hepsi = aktif.flatMap((k) => k.tarihler);
  const gunHaritasi = new Map(aktif.map((k) => [k.id, k]));
  return yaklasanTarihler(hepsi, bugun, YAKLASAN_GUN).map(
    (t) => ({ tarih: t, gun: gunHaritasi.get(t.ozelGunId)!, onceki: oncekiTarih(hepsi, t) }) as YaklasanGun<G>,
  );
}

/** Bugünden kaç gün sonra başlıyor (sürüyorsa 0). */
export function kalanGun(t: TarihSatiri, bugun: Date): number {
  return Math.max(0, Math.round((t.baslangic.getTime() - bugun.getTime()) / GUN_MS));
}

/**
 * ÖNCEDEN HABER (Faz 2-c, kullanıcı kararı 24.10.2026 «30 gün»): özel gün bu
 * kadar gün içinde başlıyorsa çan haber verir. ⚠ VARSAYIM — alım + kargo + rafa
 * koyma süresi ÖLÇÜLMEDİ; ekran bunu yazar. Ölçüm gelirse buradan değişir.
 */
export const ONCEDEN_HABER_GUN = 30;

/**
 * ÇANA ADAY GÜNLER — yaklaşanlardan `ONCEDEN_HABER_GUN` içinde başlayan (sürenler
 * dahil) VE geçen yılki karşılığı OLAN günler, başlangıç sırasıyla. Karşılığı
 * olmayan gün ADAY DEĞİL: liste kurulamaz, çan söyleyecek ürün bulamaz.
 * Hangisinin çanda yazacağına veri tarafı karar verir (listesi dolu ilk aday);
 * öteki adaylar satırda «+N gün daha» diye SAYILIR — seçilmeyen gün sessizce
 * düşmez (anayasa: seçici ölçüt, kaybedeni görünür kılar).
 */
export function canAdaylari<Y extends { tarih: TarihSatiri; onceki: TarihSatiri | null }>(
  yaklasan: readonly Y[],
  bugun: Date,
): Y[] {
  return yaklasan.filter((y) => y.onceki !== null && kalanGun(y.tarih, bugun) <= ONCEDEN_HABER_GUN);
}

/** Rehberin özel gün sekmesi, o tarih seçili. Adres SAHİBİNDEN — çan da bunu kullanır (İlke #16). */
export function ozelGunRehberAdresi(tarihId: string | null): string {
  const temel = `${REHBER_YOLU}?liste=ozelGun`;
  return tarihId === null ? temel : `${temel}&gun=${encodeURIComponent(tarihId)}`;
}

/** Çarpanın taban penceresi: başlangıçtan önceki `gun` gün (iki uç dahil, metin). */
export function tabanPenceresi(baslangic: Date, gun: number = TABAN_GUN): { baslangic: string; bitis: string } {
  return {
    baslangic: gunMetni(new Date(baslangic.getTime() - gun * GUN_MS)),
    bitis: gunMetni(new Date(baslangic.getTime() - GUN_MS)),
  };
}

/**
 * Mağaza çarpanı: pencerede günlük sipariş ÷ tabanda günlük sipariş.
 * `null` = taban boş (bölünemez) — SIFIR ya da «normal» DEĞİL, hüküm yok.
 */
export function carpan(pencere: { siparis: number; gun: number }, taban: { siparis: number; gun: number }): number | null {
  if (taban.siparis <= 0 || taban.gun <= 0 || pencere.gun <= 0) return null;
  return pencere.siparis / pencere.gun / (taban.siparis / taban.gun);
}

/**
 * SATIŞ GÜNÜ LİSTESİ — `satirlar` geçen yılki karşılığın penceresinden kurulmuş
 * olmalı (`rehberKur(o pencerenin satışı, bugünkü stok, pencere günü)`).
 * Girer: o pencerede satılmış · kârı hesaplanmış VE pozitif · bugün rafta
 * eksik. Sıra: eksik, eşitse NET-2.
 * ⚠ «Geçen yıl bu dönem» sekmesindeki `EN_AZ_ADET` (3) kapısı BURADA YOK —
 * pencere çoğu zaman tek gündür (Black Friday) ve tek günde 3 adet satan ürün
 * neredeyse hiç olmaz; kapı uygulansa liste hep boş kalırdı. Ekran bunu yazar.
 */
export function satisGunuListesi(satirlar: RehberSatiri[]): RehberSatiri[] {
  return satirlar
    .filter((s) => s.adet >= 1 && s.marj !== null && s.net2 > 0 && eksikAdet(s) > 0)
    .sort((a, b) => eksikAdet(b) - eksikAdet(a) || b.net2 - a.net2);
}

export type AlimSatiri = {
  variantId: string;
  urunId: string | null;
  urunAdi: string;
  sku: string;
  barkod: string | null;
  firmaSku: string | null;
  /** Geçen kampanyada alınan adet (taslak ve iptal edilmiş alım hariç). */
  alinan: number;
  /** Bugün rafta. */
  raf: number;
  /** Rehberin seçili döneminde satılan adet (bugünkü talep). */
  donemSatis: number;
};

/**
 * ALIM KAMPANYASI LİSTESİ — geçen kampanyada alınan her ürün, bugünkü raf ve
 * bugünkü satış hızıyla. Para YOK: alım maliyeti kargo/KDV dağıtımına bağlı
 * (`lib/alim-maliyeti.ts`) ve burada yeniden hesaplanırsa iki ekran iki farklı
 * maliyet yazardı. Sıra: bugünkü talep (dönem satışı), eşitse alınan adet.
 */
export function alimKampanyasiListesi(satirlar: AlimSatiri[]): AlimSatiri[] {
  return satirlar.filter((s) => s.alinan > 0).sort((a, b) => b.donemSatis - a.donemSatis || b.alinan - a.alinan);
}

export function alimToplami(satirlar: AlimSatiri[]): { urun: number; alinan: number; raf: number; donemSatis: number } {
  return satirlar.reduce(
    (t, s) => ({ urun: t.urun + 1, alinan: t.alinan + s.alinan, raf: t.raf + s.raf, donemSatis: t.donemSatis + s.donemSatis }),
    { urun: 0, alinan: 0, raf: 0, donemSatis: 0 },
  );
}

/** Arama — ad · SKU · Firma SKU · barkod (Türkçe, büyük/küçük duyarsız); rehberle aynı kural. */
export function alimAra(satirlar: AlimSatiri[], arama: string | null): AlimSatiri[] {
  const q = (arama ?? "").trim().toLocaleLowerCase("tr");
  if (q === "") return satirlar;
  return satirlar.filter((s) =>
    [s.urunAdi, s.sku, s.firmaSku, s.barkod].some((x) => x !== null && x.toLocaleLowerCase("tr").includes(q)),
  );
}

export const OZEL_GUN_YOLU = "/ayarlar/ozel-gunler";
