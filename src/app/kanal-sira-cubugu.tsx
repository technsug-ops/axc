import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { cn } from "@/lib/utils";
import {
  KANAL_SIRA_KIPLERI,
  type KanalSiraKipi,
} from "@/lib/kanal-sirasi";

/**
 * ============================================================================
 *  KANAL SIRASI ÇUBUĞU (K106-②, 31.08.2026)
 * ----------------------------------------------------------------------------
 *  Kullanıcı önce sabit düzen istedi, sonra ekledi: _"aslında ciroya göre de
 *  iyiymiş."_ Haklıydı — ikisi FARKLI SORUYA cevap veriyor:
 *
 *      SABİT DÜZEN → "Trendyol'u nerede bulacağım?"  (yer sabit)
 *      CİRO        → "Bu dönem hangisi kazandırdı?"  (hüküm sırayla)
 *
 *  ⚠ ÇİP DESENİ `/stok`TAKİYLE AYNI — bilerek. Aynı iş (sıralama) iki
 *  ekranda iki farklı görünseydi kullanıcı her ekranda yeniden öğrenirdi
 *  (İlke #10). Yükseklik de aynı: 44 px (İlke #8).
 *
 *  ⚠ DURUM ADRESTE. Böylece sıralı panel paylaşılabiliyor, geri tuşu
 *  çalışıyor ve — panel süzgeçli bir rota olduğu için — liste hafızası
 *  (K104) seçimi KENDİLİĞİNDEN hatırlıyor. `Company` üstünde bir sütuna
 *  bu yüzden hiç gerek kalmadı.
 * ============================================================================
 */
export async function KanalSiraCubugu({
  kip,
  tasinanlar,
}: {
  kip: KanalSiraKipi;
  /** Korunacak öteki adres parametreleri (dönem, kanal, para birimi…). */
  tasinanlar: Record<string, string | undefined>;
}) {
  const t = await getTranslations("Panel");

  function adres(yeni: KanalSiraKipi): string {
    const p = new URLSearchParams();
    for (const [ad, deger] of Object.entries(tasinanlar)) {
      if (deger !== undefined && deger !== "") p.set(ad, deger);
    }
    /**
     * ⚠ VARSAYILAN ADRESTEN DÜŞÜRÜLÜR. `kanalSira=duzen` yazmak, hiçbir şey
     * söylemeyen bir parametreyi adreste taşımak olurdu; paylaşılan bağlantı
     * da gereksiz uzardı.
     */
    if (yeni === "duzen") p.delete("kanalSira");
    else p.set("kanalSira", yeni);
    const qs = p.toString();
    return qs ? `/?${qs}` : "/";
  }

  const etiketler: Record<KanalSiraKipi, string> = {
    duzen: t("kanalSiraDuzen"),
    ciro: t("kanalSiraCiro"),
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-muted-foreground text-sm">
        {t("kanalSiraEtiket")}
      </span>
      {KANAL_SIRA_KIPLERI.map((secenek) => (
        <Link
          key={secenek}
          href={adres(secenek)}
          /** ⚠ 44 px dokunma hedefi — depoda birincil cihaz telefon. */
          className={cn(
            "inline-flex h-11 items-center rounded-md border px-3 text-sm font-medium transition-colors",
            secenek === kip
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background hover:bg-muted",
          )}
          /** ⚠ Renk tek başına konuşmaz: seçim ekran okuyucuya da söylenir. */
          aria-current={secenek === kip ? "true" : undefined}
        >
          {etiketler[secenek]}
        </Link>
      ))}
    </div>
  );
}
