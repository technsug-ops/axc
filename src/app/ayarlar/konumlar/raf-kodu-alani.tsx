"use client";

import { useTranslations } from "next-intl";

import { BarkodGirisi } from "@/components/barkod-okuyucu";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { rafKoduDuzelt, rafKoduGecerliMi } from "@/lib/kimlik";

/**
 * ============================================================================
 *  RAF KODU + GÖZ
 * ----------------------------------------------------------------------------
 *  GÖZ AYRI AÇILIR LİSTEDEN SEÇİLİR — kullanıcı kararı 11.08.2026.
 *  Elle yazdırılsaydı "A5 3", "A5/3", "A5-03" diye üç ayrı yazım doğardı.
 *  Sistem birleştiriyor: taban `A5` + göz `3` → kaydedilen `A5-3`.
 *  Düzenlemede geri ayrılır; kullanıcı hiç tire yazmaz.
 *
 *  BİÇİM DENETİMİ CANLI: yazarken hata görünür, kaydete basıp beklemez.
 *  Çevrilebiliyorsa "şunu mu demek istediniz?" önerisi çıkar — ama
 *  KENDİLİĞİNDEN DEĞİŞTİRMEZ, onay kullanıcınındır.
 * ============================================================================
 */

/** Depoda bir rafta en fazla 9 göz — daha fazlası ayrı raf demektir. */
const GOZLER = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
const GOZ_YOK = "__goz_yok__";

/** "A5-3" → { taban: "A5", goz: "3" } · "A5" → { taban: "A5", goz: "" } */
export function koduAyir(kod: string): { taban: string; goz: string } {
  const eslesme = /^(.*)-(\d)$/.exec(kod.trim());
  if (!eslesme) return { taban: kod.trim(), goz: "" };
  return { taban: eslesme[1], goz: eslesme[2] };
}

/** Taban ve gözü tek koda birleştirir. */
export function koduBirlestir(taban: string, goz: string): string {
  const t = taban.trim();
  return goz ? `${t}-${goz}` : t;
}

export function RafKoduAlani({
  taban,
  goz,
  onTaban,
  onGoz,
}: {
  taban: string;
  goz: string;
  onTaban: (deger: string) => void;
  onGoz: (deger: string) => void;
}) {
  const t = useTranslations("Raf");

  const tamKod = koduBirlestir(taban, goz);
  const yazildi = taban.trim() !== "";
  const gecerli = rafKoduGecerliMi(tamKod);
  const oneri = yazildi && !gecerli ? rafKoduDuzelt(taban) : null;

  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-[1fr_9rem]">
        <div className="space-y-2">
          <Label htmlFor="konum-code">{t("rafKodu")} *</Label>
          {/* Mevcut bir raf QR'ını okutup kodu doldurabilirsiniz. */}
          <BarkodGirisi
            id="konum-code"
            value={taban}
            onChange={onTaban}
            placeholder={t("kodIpucu")}
            kameraBasligi={t("kameraBasligi")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="konum-goz">{t("goz")}</Label>
          <Select
            value={goz || GOZ_YOK}
            onValueChange={(d) => onGoz(d === GOZ_YOK ? "" : d)}
          >
            <SelectTrigger id="konum-goz" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={GOZ_YOK}>{t("gozYok")}</SelectItem>
              {GOZLER.map((g) => (
                <SelectItem key={g} value={g}>
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Kaydedilecek kod HER ZAMAN görünür — kullanıcı tireyi kendi
          yazmadığı için ne kaydedildiğini görmeli. */}
      {yazildi ? (
        gecerli ? (
          <p className="text-muted-foreground text-xs">
            {t("kaydedilecekKod")}: <span className="font-mono">{tamKod}</span>
          </p>
        ) : (
          <p className="text-xs text-amber-700 dark:text-amber-400">
            {t("kodBicimHatasi")}
            {oneri ? ` ${t("kodOnerisi", { kod: oneri })}` : ""}
          </p>
        )
      ) : (
        <p className="text-muted-foreground text-xs">{t("kodBicimNotu")}</p>
      )}
    </div>
  );
}
