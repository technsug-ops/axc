import { GECE_TURU_EYLEMI } from "@/lib/gece-turu-veri";

/**
 * ============================================================================
 *  GECE TURU SONUCU — DIŞARIDAN GELEN RAPORUN KAPISI (15.10.2026)
 * ----------------------------------------------------------------------------
 *  Kullanıcı kararı 15.10.2026 («bu neden bilgisayarıma bağlı» → «2»): gece
 *  turu GitHub'ın sunucularında koşar (`.github/workflows/gece-turu.yml`).
 *  Oradan canlı veritabanına DOĞRUDAN bağlanılamaz (KAS uzak erişimi IP
 *  listesine bağlı; GitHub'ın adresleri değişken) — sonuç canlıya bu kapıdan
 *  gelir (`/api/cron/gece-turu-sonuc`, `CRON_SECRET`).
 *
 *  SAF: gövdeyi DENETLER ve kayda yazılacak hâline çevirir; yazmaz.
 *  ⛔ KAPI DARDIR: yalnız ekranın okuduğu alanlar (`gece-turu-veri.ts`
 *  `coz`) + iki köken alanı (`kaynak` · `calisma`) geçer; bilinmeyen alan
 *  ATILIR, biçimi bozuk alan isteği REDDEDER. Sırrı ele geçiren biri bile
 *  ekrana keyfî metin/bağlantı basamasın: bağlantı yalnız bu deponun GitHub
 *  çalışma sayfası olabilir, metinler uzunluk sınırlı.
 *  ⛔ «YEŞİL» İDDİASI TUTARLI OLMALI: `durum: "YESIL"` ile kırmızı listesi
 *  dolu ya da yeşil ≠ toplam gelirse istek REDDEDİLİR — çelişkili bir
 *  rapor yeşil diye kayda giremez (bozuk rapor «temiz» görünmesin).
 * ============================================================================
 */

export const GECE_SONUC_EYLEMI = GECE_TURU_EYLEMI;
export const GECE_SONUC_GOVDE_TAVANI = 64 * 1024;
const DURUMLAR = ["YESIL", "KIRMIZI", "HAZIRLIK_DUSTU", "SONUC_OKUNAMADI", "HATA"] as const;
const CALISMA_ONEKI = "https://github.com/technsug-ops/axc/actions/runs/";
const SHA = /^[0-9a-f]{40}$/;

export type GeceSonucHatasi = "JSON_DEGIL" | "DURUM" | "SHA" | "SAYI" | "KIRMIZILAR" | "METIN" | "CALISMA" | "CELISKI";

const metinMi = (x: unknown, tavan: number) => typeof x === "string" && x.length <= tavan;
const sayiMi = (x: unknown) => typeof x === "number" && Number.isInteger(x) && x >= 0 && x <= 10_000_000;

export function geceTuruSonucuCoz(govde: unknown):
  | { tamam: true; detay: Record<string, unknown> }
  | { tamam: false; kod: GeceSonucHatasi } {
  if (typeof govde !== "object" || govde === null || Array.isArray(govde)) return { tamam: false, kod: "JSON_DEGIL" };
  const g = govde as Record<string, unknown>;
  const durum = DURUMLAR.find((d) => d === g.durum);
  if (!durum) return { tamam: false, kod: "DURUM" };
  for (const alan of ["sha", "sonYesilSha"] as const) {
    if (g[alan] !== undefined && g[alan] !== null && !(typeof g[alan] === "string" && SHA.test(g[alan] as string))) return { tamam: false, kod: "SHA" };
  }
  for (const alan of ["yesil", "toplam", "sureSn"] as const) {
    if (g[alan] !== undefined && g[alan] !== null && !sayiMi(g[alan])) return { tamam: false, kod: "SAYI" };
  }
  if (g.sebep !== undefined && g.sebep !== null && !metinMi(g.sebep, 2000)) return { tamam: false, kod: "METIN" };
  if (g.calisma !== undefined && g.calisma !== null) {
    if (!metinMi(g.calisma, 200) || !(g.calisma as string).startsWith(CALISMA_ONEKI) || !/^\d+(\/attempts\/\d+)?$/.test((g.calisma as string).slice(CALISMA_ONEKI.length))) {
      return { tamam: false, kod: "CALISMA" };
    }
  }
  const kirmizilar: Record<string, unknown>[] = [];
  if (g.kirmizilar !== undefined) {
    if (!Array.isArray(g.kirmizilar) || g.kirmizilar.length > 500) return { tamam: false, kod: "KIRMIZILAR" };
    for (const k of g.kirmizilar as unknown[]) {
      if (typeof k !== "object" || k === null) return { tamam: false, kod: "KIRMIZILAR" };
      const r = k as Record<string, unknown>;
      if (!metinMi(r.ad, 120) || (r.tur !== "BEKCI" && r.tur !== "MUTASYON")) return { tamam: false, kod: "KIRMIZILAR" };
      let ilkKotu: Record<string, string> | null | undefined;
      if (r.ilkKotu === null) ilkKotu = null;
      else if (r.ilkKotu !== undefined) {
        const i = r.ilkKotu as Record<string, unknown>;
        if (typeof i !== "object" || !(typeof i.sha === "string" && SHA.test(i.sha)) || !metinMi(i.tarih, 40) || !metinMi(i.mesaj, 300)) return { tamam: false, kod: "KIRMIZILAR" };
        ilkKotu = { sha: i.sha, tarih: i.tarih as string, mesaj: i.mesaj as string };
      }
      kirmizilar.push({ ad: r.ad, tur: r.tur, ...(ilkKotu !== undefined ? { ilkKotu } : {}) });
    }
  }
  if (durum === "YESIL" && (kirmizilar.length > 0 || g.yesil !== g.toplam || typeof g.toplam !== "number")) return { tamam: false, kod: "CELISKI" };
  if (durum === "KIRMIZI" && kirmizilar.length === 0) return { tamam: false, kod: "CELISKI" };

  const detay: Record<string, unknown> = { durum, kirmizilar, kaynak: "GITHUB" };
  for (const alan of ["sha", "sonYesilSha", "yesil", "toplam", "sureSn", "sebep", "calisma"] as const) {
    if (g[alan] !== undefined) detay[alan] = g[alan];
  }
  return { tamam: true, detay };
}
