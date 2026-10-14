import Link from "@/components/niyetli-baglanti";

import { KULLANIM_RENKLERI } from "@/lib/renkler";
import { sutunYuzdesi } from "@/lib/kullanim/firma-raporu";

/**
 * ============================================================================
 *  KULLANIM GRAFİKLERİ — GÜN GÜN · GÜNÜN SAATLERİ (K334-③ görsel turu, 14.10.2026)
 * ----------------------------------------------------------------------------
 *  Elle, kütüphanesiz (12.08.2026 kararı); SUNUCUDA çizilir — `"use client"` yok,
 *  metinler HAZIR gelir (biçimleme dil altyapısından, çağıran sayfada).
 *
 *  · TEK EKSEN: gün grafiğinde sayfa açılışı ile tıklama AYNI birim (olay) —
 *    üst üste yığılır, çift eksen yok.
 *  · Renk tek başına konuşmaz: iki seride lejant her zaman çizilir; her sütunun
 *    `title`ı ve erişilebilir adı tarih + iki sayıyı TAM cümleyle söyler.
 *  · İz olmayan gün/saat 0 olarak YER TUTAR (boş sütun) — eksenden düşmez.
 *  · Gün sütunu bir BAĞLANTIDIR: ekranı o güne süzer (İlke #16 — rakam kaynağına
 *    götürür). Telefonda sütunlar dar olabilir; aynı süzgeç dönem çubuğundan da
 *    seçilir (İlke #8'in yedeği), dokunma tek yol değildir.
 * ============================================================================
 */

export type GunSutunuCizimi = {
  anahtar: string;
  sayfa: number;
  tiklama: number;
  /** «14.10.2026: 284 sayfa açılışı · 544 tıklama» — `title` + `aria-label`. */
  ipucu: string;
  adres: string;
};

export function GunGrafigi({
  sutunlar,
  lejantSayfa,
  lejantTiklama,
  ilkEtiket,
  sonEtiket,
  enYuksekMetni,
  aciklama,
}: {
  sutunlar: GunSutunuCizimi[];
  lejantSayfa: string;
  lejantTiklama: string;
  ilkEtiket: string;
  sonEtiket: string;
  /** «en yüksek 828» — sütun boylarının neye göre olduğunu söyler. */
  enYuksekMetni: string;
  aciklama: string;
}) {
  const enBuyuk = Math.max(0, ...sutunlar.map((s) => s.sayfa + s.tiklama));
  return (
    <figure className="min-w-0 space-y-2" aria-label={aciklama}>
      <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <span className="flex items-center gap-1.5">
          <span className={`inline-block size-2.5 rounded-sm ${KULLANIM_RENKLERI.sayfa}`} aria-hidden />
          {lejantSayfa}
        </span>
        <span className="flex items-center gap-1.5">
          <span className={`inline-block size-2.5 rounded-sm ${KULLANIM_RENKLERI.tiklama}`} aria-hidden />
          {lejantTiklama}
        </span>
        <span className="ml-auto">{enYuksekMetni}</span>
      </div>
      <div className="flex h-40 items-end gap-[2px] border-b">
        {sutunlar.map((s) => {
          const toplam = s.sayfa + s.tiklama;
          return (
            <Link
              key={s.anahtar}
              href={s.adres}
              scroll={false}
              title={s.ipucu}
              aria-label={s.ipucu}
              className="group flex h-full min-w-0 flex-1 flex-col justify-end rounded-t-[4px] hover:bg-muted/60"
            >
              {/* Yığın: tıklama ÜSTTE, sayfa açılışı ALTTA; aralarında 2 px zemin boşluğu. */}
              <span className="flex w-full flex-col justify-end gap-[2px]" style={{ height: `${sutunYuzdesi(toplam, enBuyuk)}%` }}>
                {s.tiklama > 0 ? (
                  <span className={`block w-full rounded-t-[4px] ${KULLANIM_RENKLERI.tiklama}`} style={{ flexGrow: s.tiklama }} />
                ) : null}
                {s.sayfa > 0 ? (
                  <span className={`block w-full ${s.tiklama > 0 ? "" : "rounded-t-[4px]"} ${KULLANIM_RENKLERI.sayfa}`} style={{ flexGrow: s.sayfa }} />
                ) : null}
              </span>
            </Link>
          );
        })}
      </div>
      <figcaption className="text-muted-foreground flex justify-between gap-2 text-xs tabular-nums">
        <span>{ilkEtiket}</span>
        {sonEtiket !== ilkEtiket ? <span>{sonEtiket}</span> : null}
      </figcaption>
    </figure>
  );
}

export function SaatGrafigi({
  saatler,
  ipuclari,
  eksenEtiketleri,
  enYuksekMetni,
  aciklama,
}: {
  /** 24 kova (İstanbul saati 0–23). */
  saatler: number[];
  /** Kova başına tam cümle — «09:00–10:00: 122 olay». */
  ipuclari: string[];
  /** Eksen altı: 00 · 06 · 12 · 18 konumlarında yazı (diğerleri boş). */
  eksenEtiketleri: string[];
  enYuksekMetni: string;
  aciklama: string;
}) {
  const enBuyuk = Math.max(0, ...saatler);
  return (
    <figure className="min-w-0 space-y-2" aria-label={aciklama}>
      <div className="text-muted-foreground text-right text-xs">{enYuksekMetni}</div>
      <div className="flex h-32 items-end gap-[2px] border-b">
        {saatler.map((adet, i) => (
          <span key={i} title={ipuclari[i]} aria-label={ipuclari[i]} role="img" className="flex h-full min-w-0 flex-1 items-end hover:bg-muted/60">
            <span className={`block w-full rounded-t-[4px] ${KULLANIM_RENKLERI.saat}`} style={{ height: `${sutunYuzdesi(adet, enBuyuk)}%` }} />
          </span>
        ))}
      </div>
      <figcaption className="text-muted-foreground flex gap-[2px] text-xs tabular-nums">
        {eksenEtiketleri.map((e, i) => (
          <span key={i} className="min-w-0 flex-1 overflow-visible whitespace-nowrap">
            {e}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
