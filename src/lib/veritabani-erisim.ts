/**
 * ============================================================================
 *  VERİTABANI ERİŞİM BOŞLUĞU (K358, kullanıcı «evet yap önerini» 22.10.2026)
 * ----------------------------------------------------------------------------
 *  22.10 sabahı KAS ~20 dk bağlantı kabul etmedi; kanıt yalnız Vercel günlüğündeydi
 *  (kullanıcı göremez, bizim erişimimiz o gün açıldı). Kesinti uygulamanın KENDİ
 *  kaydına girsin: sıcak tutma ucu (dakikada bir) her başarılı yoklamada son erişim
 *  anını yazar; sonraki başarılı yoklamada arada eşikten uzun boşluk varsa boşluk
 *  izlenir (`AuditLog`, `VERITABANI_ERISIM_BOSLUGU`). Veritabanı YOKKEN hiçbir şey
 *  yazmak gerekmez — boşluk, erişim geri geldiğinde geriye dönük kaydedilir.
 *
 *  ⚠ BOŞLUK ≠ KESİNTİ. İki sebebi var ve ayrı yazılır: veritabanı yanıt vermedi
 *  (bu kopyada sayılan BAŞARISIZ yoklama > 0) · yoklama hiç gelmedi (dış zamanlayıcı
 *  çağırmadı; başarısız 0). Sayaç kopyanın belleğinde: kopya o arada değiştiyse 0
 *  görünebilir — o yüzden «0» «kesinti yoktu» demek DEĞİLDİR, «ölçülmedi» der.
 * ============================================================================
 */

/** `BildirimImleci` deposundaki anahtar (genel anahtar → an deposu; şema yorumunda beyanlı). */
export const SON_ERISIM_ANAHTARI = "veritabani:son-erisim";
export const ERISIM_BOSLUGU_EYLEMI = "VERITABANI_ERISIM_BOSLUGU";
/**
 * Eşik 3 dk: yoklama dakikada bir gelir; tek kaçan yoklama zamanlayıcı sapmasıdır
 * (normal), ≥ 3 dk = en az iki ardışık yoklama yok. Uydurma değil, yoklama aralığından.
 */
export const BOSLUK_ESIGI_MS = 3 * 60_000;

export type ErisimBoslugu = { baslangic: string; bitis: string; dakika: number; basarisizYoklama: number };

/** Saf: önceki başarı + şimdi + bu kopyada sayılan başarısız yoklama → boşluk ya da null. */
export function erisimBoslugu(oncekiBasari: Date | null, simdi: Date, basarisizYoklama: number): ErisimBoslugu | null {
  if (!oncekiBasari) return null;
  const fark = simdi.getTime() - oncekiBasari.getTime();
  if (fark < BOSLUK_ESIGI_MS) return null;
  return {
    baslangic: oncekiBasari.toISOString(),
    bitis: simdi.toISOString(),
    dakika: Math.round(fark / 60_000),
    basarisizYoklama: Math.max(0, Math.trunc(basarisizYoklama)),
  };
}

/** Saf: iz satırını ekran için çözer; bozuk iz de görünür (null alanlarla). */
export function erisimBosluguCoz(detail: string | null): ErisimBoslugu | null {
  try {
    const d = JSON.parse(detail ?? "") as Record<string, unknown>;
    if (typeof d.baslangic !== "string" || typeof d.bitis !== "string" || typeof d.dakika !== "number") return null;
    return { baslangic: d.baslangic, bitis: d.bitis, dakika: d.dakika, basarisizYoklama: typeof d.basarisizYoklama === "number" ? d.basarisizYoklama : 0 };
  } catch {
    return null;
  }
}
