"use client";

import { useTranslations } from "next-intl";
import { izinMetinAnahtari } from "@/lib/yetki/izinler";

export type IzinSecenegi = { anahtar: string; grup: string };

/**
 * ============================================================================
 *  İZİN SEÇİCİ — onay kutuları
 * ----------------------------------------------------------------------------
 *  Seçenekler KODDAN gelir; ekran bunları gruplayıp çizer.
 *
 *  Her iznin ADI ve NE İŞE YARADIĞI sözlükten çözülür. Ham anahtar
 *  ("alim.yaz") göstermek, rol kuran kişiyi tahmine zorlardı — o kişi
 *  yazılımcı değil, operasyoncu.
 *
 *  Anahtar -> sözlük eşlemesi SABİTTİR (i18n denetimi görebilsin);
 *  bilinmeyen anahtar ham hâliyle gösterilir ve o zaten `yetki:dogrula`
 *  tarafından ayrıca yakalanır.
 *
 *  ⛔ Sözlük anahtarı `izinMetinAnahtari`ndan gelir (noktasız) — noktalı
 *  anahtarı next-intl iç içe yol sayar ve hiç bulamaz (04.10.2026 vakası).
 * ============================================================================
 */
export function IzinSecici({
  izinler,
  secili,
  onDegisti,
  devreDisi,
}: {
  izinler: IzinSecenegi[];
  secili: Set<string>;
  onDegisti: (anahtar: string, secildi: boolean) => void;
  devreDisi?: boolean;
}) {
  const t = useTranslations("Izin");
  const tGrup = useTranslations("IzinGrubu");

  const gruplar = new Map<string, IzinSecenegi[]>();
  for (const i of izinler) {
    const liste = gruplar.get(i.grup) ?? [];
    liste.push(i);
    gruplar.set(i.grup, liste);
  }

  /** Grup adı — SABİT eşleme. */
  const grupAdi = (g: string) =>
    g === "operasyon"
      ? tGrup("operasyon")
      : g === "para"
        ? tGrup("para")
        : g === "ayar"
          ? tGrup("ayar")
          : tGrup("yonetim");

  return (
    <div className="space-y-4">
      {[...gruplar.entries()].map(([grup, liste]) => (
        <div key={grup} className="space-y-2">
          <div className="text-sm font-medium">{grupAdi(grup)}</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {liste.map((izin) => (
              <label
                key={izin.anahtar}
                className="flex items-start gap-2 rounded-md border p-2 text-sm"
              >
                <input
                  type="checkbox"
                  name="izinler"
                  value={izin.anahtar}
                  checked={secili.has(izin.anahtar)}
                  disabled={devreDisi}
                  onChange={(e) => onDegisti(izin.anahtar, e.target.checked)}
                  className="mt-0.5 size-4 shrink-0"
                />
                <span className="min-w-0">
                  <span className="block font-medium">
                    {t.has(izinMetinAnahtari(izin.anahtar))
                      ? t(izinMetinAnahtari(izin.anahtar))
                      : izin.anahtar}
                  </span>
                  <span className="text-muted-foreground block text-xs">
                    {t.has(izinMetinAnahtari(izin.anahtar, true))
                      ? t(izinMetinAnahtari(izin.anahtar, true))
                      : izin.anahtar}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
