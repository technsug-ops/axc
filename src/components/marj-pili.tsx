import {
  MARJ_DOLULUGU,
  PIL_BOLME_SAYISI,
  type MarjBandi,
} from "@/lib/marj-bantlari";
import { MARJ_RAMPASI } from "@/lib/renkler";

/**
 * ============================================================================
 *  MARJ PİLİ — YATAY, BEŞ BÖLME
 * ----------------------------------------------------------------------------
 *  Kullanıcı 21.08.2026: _"kâr marjını renklendirebilir miyiz, gönderdiğim
 *  pil renklendirmesi gibi ama yatay şekilde olabilir"_.
 *
 *  ── ÜÇ KANAL, TEK BİLGİ ─────────────────────────────────────────────────
 *  Aynı hüküm üç ayrı yoldan okunuyor ve bu KASITLI (renk sistemi kısıt #1:
 *  "renk tek başına konuşmaz"):
 *
 *    1. RENK    — kırmızıdan parlak yeşile rampa
 *    2. UZUNLUK — kaç bölme yanıyor (0–5); renk körü için tek başına yeter
 *    3. KELİME  — ekran okuyucuya ve fare üstüne ("Zayıf", "İyi"…)
 *
 *  ⚠ ZARAR SIFIR BÖLME YAKAR. "Çok riskli" ile ikisi de kırmızı; ayrımı
 *  taşıyan şey renk değil UZUNLUK. Zarar ayrıca eksi işaretiyle zaten
 *  rakamda görünüyor.
 *
 *  ── NİYE ROZET DEĞİL ────────────────────────────────────────────────────
 *  Rozet (pastel zemin + rakam) tek bir hüküm taşır: kâr mı zarar mı. Beş
 *  bandı pastel zeminle ayırmak, zemini doygunlaştırmayı gerektirirdi —
 *  kısıt #2 ("asla doygun koca blok") ihlali. Pil, doygunluğu ~4×8 px'lik
 *  bölmelere hapsediyor: ekran renkli ama sakin (kısıt #3, nötr taban).
 *
 *  ── DOKUNULMAZ ──────────────────────────────────────────────────────────
 *  Bu bir gösterge, düğme değil; 44×44 px kuralı (İlke #8) tıklanabilir
 *  öğeler içindir. Tıklanabilir görünmesin diye imleç de değişmiyor.
 * ============================================================================
 */
export function MarjPili({
  bant,
  metin,
  durumMetni,
}: {
  bant: MarjBandi;
  /** Rakamın kendisi — "%9". Biçim `marj-gosterge`den gelir. */
  metin: string;
  /** Bandın Türkçe adı — sözlükten gelir, burada üretilmez. */
  durumMetni: string;
}) {
  const ton = MARJ_RAMPASI[bant];
  const dolu = MARJ_DOLULUGU[bant];

  return (
    /**
     * ⚠ `title` HEM fare üstü HEM de ekstra bir okuma yolu; asıl erişilebilir
     * metin `sr-only` içinde tam cümle olarak duruyor. Yalnız `title`e
     * güvenmek dokunmatikte bilgiyi yok ederdi.
     */
    <span
      className="inline-flex items-center gap-2 whitespace-nowrap"
      title={`${metin} — ${durumMetni}`}
    >
      <span className="flex items-center gap-[2px]" aria-hidden="true">
        {Array.from({ length: PIL_BOLME_SAYISI }, (_, i) => (
          <span
            key={i}
            className={`h-3 w-[5px] rounded-[1px] ${
              /**
               * SÖNÜK BÖLME NÖTR ZEMİN: soluk bir renk tonu kullansaydım
               * (ör. yeşilin %20'si) yanan bölmeyle karışırdı ve pil hep
               * doluymuş gibi görünürdü.
               */
              i < dolu ? ton.dolgu : "bg-muted-foreground/20"
            }`}
          />
        ))}
      </span>
      {/* SABİT TABAN GENİŞLİK: "%5" ile "%61" farklı yer kaplıyor ve sütun
          aşağı tarandığında piller kayardı. Rakam sağa yaslı — basamak
          sayısı değişse de virgül hizası korunur. */}
      <span
        className={`inline-block min-w-[2.25rem] text-right text-xs font-semibold tabular-nums ${ton.yazi}`}
      >
        {metin}
      </span>
      <span className="sr-only">{durumMetni}</span>
    </span>
  );
}
