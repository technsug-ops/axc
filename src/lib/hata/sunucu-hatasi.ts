/**
 * ============================================================================
 *  SUNUCU HATASI İZİ (K353, 22.10.2026)
 * ----------------------------------------------------------------------------
 *  Kullanıcı 22.10 gece telefonda «Bu ekran çizilemedi» gördü. Ekran bir hata
 *  KODU (digest) gösteriyordu ama kodun arkasındaki asıl hata yalnız Vercel'in
 *  günlüğündeydi — ve o günlüğe erişimimiz yok (bağlayıcı 403, K329). Sebep
 *  hiç öğrenilemedi. Artık her sunucu hatası uygulamanın KENDİ iz tablosuna
 *  (`AuditLog`, action `SUNUCU_HATASI`) yazılır; ekrandaki kod ile eşleşir.
 *
 *  · Next'in AKIŞ sinyalleri (yönlendirme · bulunamadı) hata DEĞİLDİR, yazılmaz.
 *  · Çerez / başlık YAZILMAZ; adresin sorgu kısmı yazılmaz (arama metni taşıyabilir).
 *  · Bağlantı adresindeki parola silinir (Prisma mesajı adres taşıyabilir).
 *  · Alan `TEXT` (64 KB). Mesaj sınırın altında TAM yazılır; aşarsa kesilir
 *    ve kesildiği kayıtta YAZAR (`mesajKirpildi`). Kesik JSON yazılmaz —
 *    28.08 vakası: tavanda kırpılan iz `JSON.parse`ta düşüyordu.
 *  · Kayıt kendisi düşerse sessizce geçmez: sunucu günlüğüne TAM yazılır.
 * ============================================================================
 */

export const SUNUCU_HATASI_EYLEMI = "SUNUCU_HATASI";

/** Mesaj ve yığın tavanı (karakter). Türkçe karakter 2 bayt → JSON 64 KB'nin altında kalır. */
export const MESAJ_TAVANI = 12_000;
export const YIGIN_TAVANI = 6_000;
/** `targetId` / `targetType` sütunları varchar(191). */
const ALAN_TAVANI = 191;

/** Next'in hata gibi fırlatılan akış sinyalleri — iz değil. */
const AKIS_SINYALLERI = ["NEXT_REDIRECT", "NEXT_NOT_FOUND", "NEXT_HTTP_ERROR_FALLBACK"];

export type HataIstegi = { path: string; method: string };
export type HataBaglami = { routePath?: string; routeType?: string; renderSource?: string };

export type SunucuHatasiIzi = {
  action: typeof SUNUCU_HATASI_EYLEMI;
  targetType: string;
  targetId: string;
  detail: string;
};

export function parolayiSil(metin: string): string {
  return metin.replace(/((?:mysql|mariadb|postgres(?:ql)?):\/\/[^:\s/@]+:)[^@\s]+@/gi, "$1***@");
}

function kes(metin: string, tavan: number): { metin: string; kirpildi: boolean } {
  return metin.length > tavan ? { metin: metin.slice(0, tavan), kirpildi: true } : { metin, kirpildi: false };
}

/** Saf: hatadan iz satırı kurar; akış sinyaliyse `null` (yazılmaz). */
export function sunucuHatasiIzi(hata: unknown, istek: HataIstegi, baglam: HataBaglami): SunucuHatasiIzi | null {
  const nesne = typeof hata === "object" && hata !== null ? (hata as Record<string, unknown>) : null;
  const digest = nesne && typeof nesne.digest === "string" ? nesne.digest : null;
  const ad = hata instanceof Error ? hata.name : null;
  const hamMesaj = hata instanceof Error ? hata.message : String(hata);
  if (AKIS_SINYALLERI.some((s) => digest?.startsWith(s) || hamMesaj.startsWith(s))) return null;

  const mesaj = kes(parolayiSil(hamMesaj), MESAJ_TAVANI);
  const yigin = hata instanceof Error && hata.stack ? kes(parolayiSil(hata.stack), YIGIN_TAVANI) : null;
  const yol = istek.path.split("?")[0] ?? istek.path;

  const detay = {
    digest,
    ad,
    yol,
    yontem: istek.method,
    tur: baglam.routeType ?? null,
    kaynak: baglam.renderSource ?? null,
    mesaj: mesaj.metin,
    mesajKirpildi: mesaj.kirpildi,
    yigin: yigin?.metin ?? null,
    yiginKirpildi: yigin?.kirpildi ?? false,
  };
  return {
    action: SUNUCU_HATASI_EYLEMI,
    targetType: (baglam.routeType ?? "bilinmiyor").slice(0, ALAN_TAVANI),
    targetId: (baglam.routePath ?? yol).slice(0, ALAN_TAVANI),
    detail: JSON.stringify(detay),
  };
}

export type SunucuHatasiSatiri = {
  zaman: Date;
  digest: string | null;
  yol: string;
  tur: string | null;
  mesaj: string;
  mesajKirpildi: boolean;
};

/** Saf: iz satırını ekran için çözer. Çözülemeyen iz de görünür (mesaj = ham metin). */
export function sunucuHatasiCoz(zaman: Date, targetId: string | null, detail: string | null): SunucuHatasiSatiri {
  try {
    const d = JSON.parse(detail ?? "") as Record<string, unknown>;
    return {
      zaman,
      digest: typeof d.digest === "string" ? d.digest : null,
      yol: typeof d.yol === "string" ? d.yol : (targetId ?? "—"),
      tur: typeof d.tur === "string" ? d.tur : null,
      mesaj: typeof d.mesaj === "string" ? d.mesaj : "",
      mesajKirpildi: d.mesajKirpildi === true,
    };
  } catch {
    return { zaman, digest: null, yol: targetId ?? "—", tur: null, mesaj: detail ?? "", mesajKirpildi: false };
  }
}
