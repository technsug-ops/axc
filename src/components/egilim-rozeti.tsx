import { TrendingDown, TrendingUp } from "lucide-react";

/**
 * EĞİLİM ROZETİ — Algoritmo referansı (kullanıcı kararı 07.10.2026;
 * `docs/algoritmo-analizi.md` §4.2 ve §4.6): renkli daire içinde eğik ok,
 * yanında yüzde; ardından açıklama (önceki değer) soluk yazıyla.
 *
 * ⚠ RENK «İYİ Mİ» SORUSUNA BAĞLI, YÖNE DEĞİL: maliyet ya da iade artışı
 * yukarı ok ama KIRMIZI (Algoritmo da «Inbound Costs +24,6 %»ü kırmızı yazar).
 * Ok yönü değişimin yönünü, renk hükmü söyler — ikisi ayrı girdi.
 */
export function EgilimRozeti({
  iyi,
  yukari,
  children,
  ek,
}: {
  iyi: boolean;
  yukari: boolean;
  children: React.ReactNode;
  ek?: React.ReactNode;
}) {
  const Ok = yukari ? TrendingUp : TrendingDown;
  return (
    <span className="inline-flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs">
      <span
        className={`grid size-6 shrink-0 place-items-center rounded-full ${
          iyi ? "bg-[var(--se-kar-bg)] text-[var(--se-kar)]" : "bg-[var(--se-zarar-bg)] text-[var(--se-zarar)]"
        }`}
        aria-hidden
      >
        <Ok className="size-3.5" />
      </span>
      <span className={`font-medium tabular-nums ${iyi ? "text-[var(--se-kar)]" : "text-[var(--se-zarar)]"}`}>
        {/* Ok çizimi `aria-hidden`; yön ekran okuyucuya metinle söylenir. */}
        <span className="sr-only">{yukari ? "▲ " : "▼ "}</span>
        {children}
      </span>
      {ek ? <span className="text-muted-foreground tabular-nums">{ek}</span> : null}
    </span>
  );
}
