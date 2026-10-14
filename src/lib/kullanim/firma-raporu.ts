import { gunBasiAni, gunDegeri, gunEkle, gunMetni, isTakvimGunu } from "@/lib/donem";
import { MENU_ADRESLERI } from "@/lib/menu/katalog";

/**
 * ============================================================================
 *  FİRMA KULLANIM RAPORU — SAF KURALLAR (K334-③, kullanıcı kararı 14.10.2026)
 * ----------------------------------------------------------------------------
 *  «Ayarlar → Kullanım» (firmanın KENDİ izi) ekranının hesap kuralları.
 *  Veritabanına giden kısım `rapor-veri.ts`te; burada yalnız çağrılıp
 *  DEĞERİYLE sınanabilen gövdeler var.
 *
 *  ⚠ NİYE `firma-raporu.ts`, `rapor.ts` DEĞİL: deneme dalında `rapor.ts` süper
 *  admin ekranının (`bezirga/kullanim`, K334-②) gövdesi. Aynı ad iki farklı
 *  ekranı taşısaydı dal birleşmesinde çakışır, sonra da yanlış dosya okunurdu
 *  (anayasa: yazmadan önce hedefe bak). Ortak kural (`hedefGorunumu`) `olay.ts`te.
 * ============================================================================
 */

export const KULLANIM_SEKMELERI = ["sayfalar", "dugmeler", "gecisler", "kullanicilar"] as const;
export type KullanimSekmesi = (typeof KULLANIM_SEKMELERI)[number];

/** Bilinmeyen/eksik sekme ilk sekmeye düşer — boş ekran gösterilmez. */
export function kullanimSekmesi(ham: string | undefined): KullanimSekmesi {
  return (KULLANIM_SEKMELERI as readonly string[]).includes(ham ?? "") ? (ham as KullanimSekmesi) : "sayfalar";
}

/**
 * Bir listede en çok kaç satır çizilir. Fazlası ÇİZİLMEZ ama sayılır: ekran
 * «N farklı, ilk 100'ü gösteriliyor» der ve toplam yine süzgecin tamamıdır
 * (İlke #15). Sayfa kalıpları ve düğme yazıları sınırlı bir küme — bu tavan
 * bugün hiç dolmuyor (ölçüldü 14.10.2026: 49 farklı düğme, 20+ sayfa).
 */
export const KULLANIM_LISTE_SINIRI = 100;

/**
 * Sayfa kalıbı → menüdeki adı (anahtar). Eşleşme TAM kalıpla: `/satislar/:id`
 * menüde yok, adı yoktur ve kalıbıyla görünür — «Satışlar» demek, detay ile
 * listeyi aynı satıra yazmak olurdu.
 */
export function sayfaMenuAnahtari(kalip: string): string | null {
  for (const [anahtar, adres] of Object.entries(MENU_ADRESLERI)) {
    if (adres === kalip) return anahtar;
  }
  return null;
}

/**
 * Pay yüzdesi (0–100, bir ondalık). Toplam sıfırsa `null` — «ölçtüm, %0
 * çıktı» değil «bölünecek bir şey yok» (anayasa: varsayılan alanın
 * anlamından türetilir).
 */
export function payYuzde(parca: number, toplam: number): number | null {
  if (!(toplam > 0)) return null;
  return Math.round((parca / toplam) * 1000) / 10;
}

/**
 * İş saat diliminin bu andaki UTC farkı, MySQL `CONVERT_TZ` biçiminde
 * («+03:00»). ⚠ SABİT YAZILMADI: `IS_SAAT_DILIMI`den ÖLÇÜLÜR (`donem.ts`in
 * kendi gövdeleriyle) — çalışma ortamının saat dilimi hiçbir yerde okunmaz.
 * Sınır: tek an için ölçülür; Türkiye 2016'dan beri sabit UTC+3 olduğu için
 * pencere içinde fark değişmez. Kural değişirse eski günler o günün farkıyla
 * değil bugünkü farkla kovaya girer — «aktif gün» sayısı ancak o zaman kayar.
 */
export function isSaatDilimiFarki(an: Date): string {
  const g = isTakvimGunu(an);
  const dakika = Math.round((gunDegeri(g).getTime() - gunBasiAni(g).getTime()) / 60_000);
  const isaret = dakika < 0 ? "-" : "+";
  const mutlak = Math.abs(dakika);
  return `${isaret}${String(Math.floor(mutlak / 60)).padStart(2, "0")}:${String(mutlak % 60).padStart(2, "0")}`;
}

/** Sayım satırı — grup + adet; büyükten küçüğe, eşitlikte ada göre (sıra kararlı olsun). */
export function sayimaGoreSirala<T extends { adet: number; ad: string }>(satirlar: T[]): T[] {
  return [...satirlar].sort((a, b) => b.adet - a.adet || a.ad.localeCompare(b.ad, "tr"));
}

export type KullanimListesi<T> = {
  satirlar: T[];
  /** Süzgeç + aramadaki FARKLI satır sayısı — çizilenden büyük olabilir. */
  farkli: number;
  /** Süzgeç + aramadaki olayların toplamı (İlke #15: çizilenin değil kümenin toplamı). */
  toplam: number;
};

/** Sıralar, çizimi tavanla sınırlar; `farkli` ve `toplam` TAVANDAN ÖNCE, kümenin tamamından. */
export function kullanimListele<T extends { adet: number; ad: string }>(satirlar: T[]): KullanimListesi<T> {
  const sirali = sayimaGoreSirala(satirlar);
  return {
    satirlar: sirali.slice(0, KULLANIM_LISTE_SINIRI),
    farkli: sirali.length,
    toplam: sirali.reduce((t, s) => t + s.adet, 0),
  };
}

/* ═══ GRAFİKLER (K334-③ görsel turu, kullanıcı/mimar isteği 14.10.2026) ════════
 * Sayım veritabanında (gün × tür, saat); burada yalnız toplanmış sayıların
 * EKSENE yerleşmesi var. ⚠ İz olmayan gün/saat 0 olarak YAZILIR — «o gün
 * kullanılmadı» bilinen bir sonuçtur (iz her açılışta yazılıyor); eksenden
 * düşürmek boş günü gizler ve sütunlar arasındaki zaman aralığını yalanlar.
 * Tek istisna: izin doğumundan ÖNCESİ ve bugünden SONRASI eksene hiç girmez
 * (orada «0» bir sonuç değildir — anayasa: yeni izin doğum tarihi beyan edilir).
 */

/** Gün sayısı bunu aşarsa sütunlar AYLIK kovaya toplanır — telefonda 365 ince çubuk okunmaz. */
export const GUNLUK_SUTUN_TAVANI = 62;

export type GunSayimi = { gun: string; tur: "SAYFA" | "TIKLAMA"; adet: number };
export type ZamanSutunu = {
  /** «2026-10-14» ya da «2026-10» */
  anahtar: string;
  /** Kovanın ilk ve son günü (UTC çapa — etiket ve süzgeç adresi bunlardan). */
  ilk: Date;
  son: Date;
  sayfa: number;
  tiklama: number;
};
export type ZamanEkseni = { kova: "GUN" | "AY"; sutunlar: ZamanSutunu[] };

/**
 * Pencere [ilk, son] (UTC çapa, ikisi de dahil) → her güne bir sütun, iz yoksa 0.
 * `ilk`, izin doğumundan önceyse doğum gününe; `son`, bugünden sonraysa bugüne çekilir.
 */
export function zamanEkseni(ham: readonly GunSayimi[], ilk: Date, son: Date, izDogumu: Date, bugun: Date): ZamanEkseni {
  const bas = ilk.getTime() < izDogumu.getTime() ? izDogumu : ilk;
  const bit = son.getTime() > bugun.getTime() ? bugun : son;
  if (bas.getTime() > bit.getTime()) return { kova: "GUN", sutunlar: [] };

  const sayim = new Map<string, { sayfa: number; tiklama: number }>();
  for (const s of ham) {
    const g = sayim.get(s.gun) ?? { sayfa: 0, tiklama: 0 };
    if (s.tur === "SAYFA") g.sayfa += s.adet;
    else g.tiklama += s.adet;
    sayim.set(s.gun, g);
  }
  const gunler: ZamanSutunu[] = [];
  for (let d = bas; d.getTime() <= bit.getTime(); d = gunEkle(d, 1)) {
    const anahtar = gunMetni(d);
    const g = sayim.get(anahtar) ?? { sayfa: 0, tiklama: 0 };
    gunler.push({ anahtar, ilk: d, son: d, ...g });
  }
  if (gunler.length <= GUNLUK_SUTUN_TAVANI) return { kova: "GUN", sutunlar: gunler };

  const aylar: ZamanSutunu[] = [];
  for (const g of gunler) {
    const anahtar = g.anahtar.slice(0, 7);
    const onceki = aylar[aylar.length - 1];
    if (onceki && onceki.anahtar === anahtar) {
      onceki.son = g.son;
      onceki.sayfa += g.sayfa;
      onceki.tiklama += g.tiklama;
    } else aylar.push({ ...g, anahtar });
  }
  return { kova: "AY", sutunlar: aylar };
}

/** Saat sayımı (İstanbul saati 0–23) → 24 kova; iz olmayan saat 0. Aralık dışı saat atılır. */
export function saatEkseni(ham: readonly { saat: number; adet: number }[]): number[] {
  const kovalar = Array.from({ length: 24 }, () => 0);
  for (const s of ham) if (Number.isInteger(s.saat) && s.saat >= 0 && s.saat < 24) kovalar[s.saat] += s.adet;
  return kovalar;
}

/**
 * Sütun boyu (% — en büyüğe göre). Sıfır olmayan değer en az %3 (görünsün:
 * 1 tıklamalı gün «hiç yok» gibi okunmasın); 0 → 0; en büyük 0 → 0.
 */
export function sutunYuzdesi(deger: number, enBuyuk: number): number {
  if (enBuyuk <= 0 || deger <= 0) return 0;
  return Math.max(3, Math.round((deger / enBuyuk) * 1000) / 10);
}
