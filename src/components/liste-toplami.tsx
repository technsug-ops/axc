import { bicimlendirici } from "@/lib/bicim";
import type { ParaToplami } from "@/lib/tutar";

/**
 * ============================================================================
 *  LİSTE TOPLAMI — "TEK TEK GÖSTERİLEN YERDE TOPLAM DA OLUR"
 * ----------------------------------------------------------------------------
 *  Kullanıcı Kolaylığı #15 (kural 17.08.2026).
 *
 *  ⚠ NEDEN YAZILDI: kullanıcı KDV dengesi için aylık alım tutarını takip
 *  ediyor ve rakamı ekrandaki satırlardan KAFADAN topluyordu. Sistem toplamı
 *  zaten biliyordu, söylemiyordu.
 *
 *  ── TOPLAM SÜZGECİN TOPLAMIDIR ──────────────────────────────────────────
 *  "Bugün" seçiliyse bugünün toplamı yazar. Ekranda ne varsa onun toplamı
 *  olmalı; sabit bir "genel toplam" göstermek, süzgeci değiştiren kullanıcıya
 *  değişmeyen bir rakam göstermek olurdu — en kötü hâli, yanlış rakama
 *  güvenilmesi.
 *
 *  ── PARA BİRİMLERİ ÇEVRİLMEZ ────────────────────────────────────────────
 *  TRY ve EUR ayrı ayrı yazılır (anayasa kuralı: kur çevirisi yok).
 *
 *  ── HARİÇ TUTULAN GÖRÜNÜR ───────────────────────────────────────────────
 *  İptal edilmiş kayıtlar toplama girmez — iptal edilmiş bir alım gerçek bir
 *  alış değildir ve KDV matrahına yazılamaz. Ama SESSİZCE düşülmez: ne kadarı
 *  neden dışarıda kaldığı ikinci kutuda yazar. Kullanıcı listede 4 satır
 *  görüp 3 satırlık toplam okursa, farkı kendi bulmak zorunda kalmamalı.
 *
 *  Yerleşim kompakt kutucuk ızgarasıdır — tam genişlikte "etiket solda,
 *  rakam en sağda" satır YASAK (İlke #12).
 * ============================================================================
 */

export type HaricTutulan = {
  /** "İptal hariç" gibi — çağıran sözlükten verir. */
  etiket: string;
  toplamlar: ParaToplami[];
  sayi: number;
};

export async function ListeToplami({
  baslik,
  toplamlar,
  altMetin,
  haric,
}: {
  baslik: string;
  toplamlar: ParaToplami[];
  /** "3 kayıt · Bugün" gibi — hangi kümenin toplamı olduğunu söyler. */
  altMetin?: string;
  haric?: HaricTutulan;
}) {
  const bicim = await bicimlendirici();

  /**
   * Hiç kayıt yoksa bileşen HİÇ ÇİZİLMEZ. "Toplam ₺0,00" boş listede bilgi
   * taşımaz, yalnız yer kaplar (İlke #12).
   */
  if (toplamlar.length === 0 && !haric) return null;

  return (
    <div className="flex flex-wrap gap-2">
      <div className="bg-muted/40 rounded-lg border px-3 py-2">
        <div className="text-muted-foreground text-xs">{baslik}</div>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          {toplamlar.length === 0 ? (
            <span className="text-lg font-semibold tabular-nums">
              {bicim.para(0, "TRY")}
            </span>
          ) : (
            toplamlar.map((t) => (
              <span
                key={t.paraBirimi}
                className="text-lg font-semibold tabular-nums"
              >
                {bicim.para(t.tutar, t.paraBirimi)}
              </span>
            ))
          )}
        </div>
        {altMetin ? (
          <div className="text-muted-foreground mt-0.5 text-xs">{altMetin}</div>
        ) : null}
      </div>

      {/* Hariç tutulan küme — sessiz düşme yok. */}
      {haric && haric.sayi > 0 ? (
        <div className="text-muted-foreground rounded-lg border border-dashed px-3 py-2">
          <div className="text-xs">{haric.etiket}</div>
          <div className="flex flex-wrap items-baseline gap-x-3">
            {haric.toplamlar.map((t) => (
              <span key={t.paraBirimi} className="text-sm font-medium tabular-nums">
                {bicim.para(t.tutar, t.paraBirimi)}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
