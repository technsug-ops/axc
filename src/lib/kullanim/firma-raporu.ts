import { gunBasiAni, gunDegeri, isTakvimGunu } from "@/lib/donem";
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
