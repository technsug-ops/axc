"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { DURUM_YAZISI } from "@/lib/renkler";

/**
 * ============================================================================
 *  TIK-KOPYALA (Kullanıcı Kolaylığı İlkeleri #4)
 * ----------------------------------------------------------------------------
 *  Kod/kimlik niteliğindeki HER değer bu bileşenle gösterilir:
 *  SKU, Firma SKU, barkod, sipariş no, raf kodu...
 *
 *  Panoya yazma iki yolla denenir:
 *   1) navigator.clipboard — modern yol, ama SADECE güvenli bağlantıda
 *      (https veya localhost) çalışır.
 *   2) Gizli textarea + execCommand — telefondan http://192.168.x.x ile
 *      girildiğinde 1. yol yok olduğu için gereken yedek.
 *
 *  İkisi de başarısızsa SESSİZ KALMAZ, "kopyalanamadı" gösterir (#5).
 * ============================================================================
 */

async function panoyaYaz(metin: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(metin);
      return true;
    } catch {
      // Yedek yönteme düş.
    }
  }

  try {
    const alan = document.createElement("textarea");
    alan.value = metin;
    alan.setAttribute("readonly", "");
    alan.style.position = "fixed";
    alan.style.top = "-1000px";
    alan.style.opacity = "0";
    document.body.appendChild(alan);
    alan.select();
    const oldu = document.execCommand("copy");
    document.body.removeChild(alan);
    return oldu;
  } catch {
    return false;
  }
}

type Durum = "bos" | "kopyalandi" | "hata";

export function KopyalanabilirKod({
  deger,
  etiket,
  className,
  sadeceIkon = false,
}: {
  deger: string | null | undefined;
  /** Ekran okuyucu için: "SKU", "Barkod" gibi. */
  etiket: string;
  className?: string;
  /**
   * Değer zaten yanında yazıyorsa (ör. link olarak) metni tekrarlama,
   * sadece kopyala ikonunu göster.
   */
  sadeceIkon?: boolean;
}) {
  const t = useTranslations("Ortak");

  const [durum, setDurum] = useState<Durum>("bos");
  const zamanlayiciRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!deger) {
    return <span className="text-muted-foreground">—</span>;
  }

  async function kopyala() {
    if (zamanlayiciRef.current) clearTimeout(zamanlayiciRef.current);
    const oldu = await panoyaYaz(deger!);
    setDurum(oldu ? "kopyalandi" : "hata");
    zamanlayiciRef.current = setTimeout(() => setDurum("bos"), 2000);
  }

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      {sadeceIkon ? null : (
        <span className="font-mono text-xs break-all">{deger}</span>
      )}

      <button
        type="button"
        onClick={kopyala}
        title={t("kodKopyala", { etiket })}
        aria-label={t("kodKopyala", { etiket })}
        className="text-muted-foreground hover:text-foreground hover:bg-accent inline-flex size-6 shrink-0 items-center justify-center rounded transition-colors"
      >
        {durum === "kopyalandi" ? (
          <Check className={`size-3.5 ${DURUM_YAZISI.olumlu}`} />
        ) : durum === "hata" ? (
          <X className="text-destructive size-3.5" />
        ) : (
          <Copy className="size-3.5" />
        )}
      </button>

      {/* Yerinde onay — sessiz başarı/başarısızlık yasak (#5). */}
      {durum === "kopyalandi" ? (
        <span className={`text-xs font-medium ${DURUM_YAZISI.olumlu}`} role="status">
          {t("kopyalandi")}
        </span>
      ) : null}
      {durum === "hata" ? (
        <span className="text-destructive text-xs font-medium" role="status">
          {t("kopyalanamadi")}
        </span>
      ) : null}
    </span>
  );
}
