/**
 * ============================================================================
 *  YAYIN BOŞLUĞU — CANLI SÜRÜM, ANA DALIN GERİSİNDE Mİ (K329, 10.10.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ NİYE DOĞDU: K326 düzeltmesi (`1de1cceb`) 09.10 09:28'de GitHub'a gitti,
 *  Vercel üretimi `f520dbb`de KALDI ve ~28 saat siparişleri ESKİ kod işledi
 *  (19 satışa yanlış desi yazıldı). Hiçbir şey kırmızı yanmadı; kullanıcının
 *  Halil testi buldu. «Push yeşil geçti» ile «kod canlıda» AYRI olgulardır.
 *
 *  ÖLÇÜM — iki kaynak, ikisi de kendi beyanı:
 *   · canlı sürüm   Vercel'in sistem değişkeni `VERCEL_GIT_COMMIT_SHA`
 *                   (bu derlemenin commit'i; depo/dal da Vercel'den —
 *                   hiçbir depo adı koda GÖMÜLMEZ)
 *   · ana dal ucu   GitHub etkinlik ucu: son push'un commit'i VE push anı
 *                   (commit tarihi DEĞİL — push turu commit'ten saatler
 *                   sonra gidebilir; commit tarihine bakan bir eşik her
 *                   push'ta birkaç dakika yalancı kırmızı yakardı)
 *
 *  ⚠ ÖLÇÜLEMEDİ ≠ TEMİZ: kaynaklardan biri okunamazsa durum `OLCULEMEDI`
 *  ve NEDENİ ekranda yazar. Çana sayılmaz (GitHub'ın saatlik sınırı ya da
 *  yerel çalışma her gün yalancı uyarı üretirdi) ama gece turu ekranında
 *  görünür kalır.
 * ============================================================================
 */

/**
 * Push'tan sonra yayının bitmesi için tanınan süre.
 * ÖLÇÜLDÜ 10.10.2026 (Vercel dağıtım listesi, n=7): derleme 45 sn – 84 sn.
 * Push → derleme başlangıcı arasındaki kuyruk ölçülemedi (Vercel API'sine
 * erişimimiz yok); bu yüzden pay geniş tutuldu: en uzun ölçülen derlemenin
 * ~10 katı. Gerçek boşluk (09.10) 28 SAATTİ — eşik onunla yayın süresinin
 * arasındaki geniş gedikte duruyor.
 */
export const YAYIN_PAYI_DAKIKA = 15;

export type YayinDurumu =
  | { durum: "GUNCEL"; canliSha: string; anaSha: string }
  | { durum: "YAYIMLANIYOR"; canliSha: string; anaSha: string; itildiAt: Date }
  | { durum: "GERIDE"; canliSha: string; anaSha: string; itildiAt: Date; dakika: number }
  | { durum: "OLCULEMEDI"; neden: "SURUM_BILGISI_YOK" | "GITHUB_OKUNAMADI"; canliSha: string | null };

export type AnaDalUcu = { sha: string; itildiAt: Date };

/** Saf: iki ölçüm + an → durum. */
export function yayinDurumu(canliSha: string | null, ana: AnaDalUcu | null, simdi: Date): YayinDurumu {
  if (!canliSha) return { durum: "OLCULEMEDI", neden: "SURUM_BILGISI_YOK", canliSha: null };
  if (!ana) return { durum: "OLCULEMEDI", neden: "GITHUB_OKUNAMADI", canliSha };
  if (ana.sha === canliSha) return { durum: "GUNCEL", canliSha, anaSha: ana.sha };
  const dakika = Math.floor((simdi.getTime() - ana.itildiAt.getTime()) / 60_000);
  if (dakika <= YAYIN_PAYI_DAKIKA) return { durum: "YAYIMLANIYOR", canliSha, anaSha: ana.sha, itildiAt: ana.itildiAt };
  return { durum: "GERIDE", canliSha, anaSha: ana.sha, itildiAt: ana.itildiAt, dakika };
}

/** Çan sayısı: yalnız GERİDE 1 — ölçülemeyen çana girmez (yukarıdaki gerekçe). */
export function yayinBosluguSayisi(d: YayinDurumu): number {
  return d.durum === "GERIDE" ? 1 : 0;
}

/**
 * Dalın UCUNU değiştiren etkinlikler (GitHub belgesi: activity_type). Dal
 * oluşturma/silme ucu yayına götürmez. ⚠ Yalnız `push` alınsaydı zorla push ya
 * da PR birleştirmesinden sonra ESKİ uç «son» sayılırdı — canlı gerçek uca
 * yetişmiş olsa bile kalıcı yalancı «geride».
 */
const UCU_DEGISTIREN = ["push", "force_push", "pr_merge", "merge_queue_merge"];

/** GitHub etkinlik cevabından dalın son ucu — biçim tutmazsa `null` (uydurulmaz). */
export function anaDalUcunuCoz(cevap: unknown): AnaDalUcu | null {
  if (!Array.isArray(cevap)) return null;
  const push = cevap.find(
    (x): x is { after: string; timestamp: string } =>
      typeof x === "object" && x !== null &&
      UCU_DEGISTIREN.includes(String((x as Record<string, unknown>).activity_type)) &&
      typeof (x as Record<string, unknown>).after === "string" &&
      typeof (x as Record<string, unknown>).timestamp === "string",
  );
  if (!push) return null;
  const an = new Date(push.timestamp);
  if (Number.isNaN(an.getTime()) || !/^[0-9a-f]{40}$/.test(push.after)) return null;
  return { sha: push.after, itildiAt: an };
}

/**
 * Canlı ölçüm. Vercel dışında (yerel, deneme) sürüm bilgisi yoktur → ölçülemedi.
 * ⚠ 5 dk önbellek: GitHub kimliksiz sorguya saatte 60 hak veriyor (ölçüldü
 * 10.10: `X-RateLimit-Limit: 60`); her panel açılışında sorgu o hakkı yerdi.
 * ⚠ 4 sn zaman aşımı: GitHub yavaşsa panel beklemez, ölçülemedi der.
 */
export async function yayinDurumunuOlc(simdi = new Date()): Promise<YayinDurumu> {
  const canliSha = process.env.VERCEL_GIT_COMMIT_SHA?.trim() || null;
  const sahip = process.env.VERCEL_GIT_REPO_OWNER?.trim();
  const depo = process.env.VERCEL_GIT_REPO_SLUG?.trim();
  const dal = process.env.VERCEL_GIT_COMMIT_REF?.trim();
  if (!canliSha || !sahip || !depo || !dal) return yayinDurumu(null, null, simdi);
  let ana: AnaDalUcu | null = null;
  try {
    const adres =
      `https://api.github.com/repos/${encodeURIComponent(sahip)}/${encodeURIComponent(depo)}` +
      `/activity?ref=${encodeURIComponent(`refs/heads/${dal}`)}&per_page=5`;
    const yanit = await fetch(adres, {
      method: "GET",
      headers: { Accept: "application/vnd.github+json" },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(4000),
    });
    if (yanit.ok) ana = anaDalUcunuCoz(await yanit.json());
    else console.error(`[yayin-boslugu] GitHub ${yanit.status}`);
  } catch (e) {
    console.error("[yayin-boslugu] GitHub okunamadı:", e);
  }
  return yayinDurumu(canliSha, ana, simdi);
}

export async function yayinBosluguSayisiOlc(): Promise<number> {
  return yayinBosluguSayisi(await yayinDurumunuOlc());
}
