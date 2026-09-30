"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { RotateCcw, TriangleAlert, X } from "lucide-react";

import { DonemIsrarBloku } from "@/components/donem-israr-bloku";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IADE_GERI_ALMA_ACIKLAMA_ZORUNLU, IADE_GERI_ALMA_NEDENLERI } from "@/lib/iade-geri-alma";
import { DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";

import { iadeGeriAlmayiOnizle, iadeGeriAlmayiUygula, type IadeGeriAlOnizleme } from "@/app/satislar/[id]/iade-geri-al-actions";

/**
 * İADEYİ GERİ AL (K44 · 2. adım) — satış detayında, iade kartının içinde.
 * ÖNİZLE → ONAYLA: onay düğmesi geçerli bir önizleme olmadan AÇILMAZ
 * (yıkıcı eylem; kullanıcı stoğun ne kadar oynayacağını görmeden onaylamaz —
 * İlke #6, satış iptalini geri alma ile aynı desen).
 */
export function IadeGeriAl({ returnId }: { returnId: string }) {
  const t = useTranslations("IadeGeriAl");
  const ortak = useTranslations("Ortak");
  const router = useRouter();
  const [bekliyor, basla] = useTransition();
  const [acik, setAcik] = useState(false);
  const [neden, setNeden] = useState("");
  const [not, setNot] = useState("");
  const [onizleme, setOnizleme] = useState<IadeGeriAlOnizleme | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [donem, setDonem] = useState<{ donem: string; sayi: number } | null>(null);
  const [israrGecerli, setIsrarGecerli] = useState(false);

  const aciklamaZorunlu = neden !== "" && (IADE_GERI_ALMA_ACIKLAMA_ZORUNLU as readonly string[]).includes(neden);
  function sifirla() {
    setOnizleme(null);
    setHata(null);
  }

  if (!acik) {
    return (
      <Button variant="outline" size="sm" className="h-11 md:h-8" onClick={() => setAcik(true)}>
        <RotateCcw />
        {t("geriAl")}
      </Button>
    );
  }

  return (
    <div className="bg-background w-full space-y-3 rounded-md border p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{t("baslik")}</span>
        <Button variant="ghost" size="sm" className="h-11 md:h-8" onClick={() => setAcik(false)}>
          <X />
          {ortak("kapat")}
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">{t("aciklamaMetni")}</p>

      <form
        action={(fd) =>
          basla(async () => {
            const s = await iadeGeriAlmayiUygula(fd);
            if (s.tamam) {
              setAcik(false);
              router.refresh();
              return;
            }
            setHata(s.hata);
            if (s.donem) setDonem({ donem: s.donem, sayi: s.donemSatisSayisi ?? 0 });
            else setOnizleme(null);
          })
        }
        className="space-y-2"
      >
        <input type="hidden" name="returnId" value={returnId} />
        <input type="hidden" name="neden" value={neden} />
        <input type="hidden" name="imza" value={onizleme?.tamam ? onizleme.imza : ""} />
        <Select
          value={neden}
          onValueChange={(d) => {
            sifirla();
            setNeden(d);
          }}
        >
          <SelectTrigger className="h-11 w-full">
            <SelectValue placeholder={t("nedenSecin")} />
          </SelectTrigger>
          <SelectContent>
            {IADE_GERI_ALMA_NEDENLERI.map((n) => (
              <SelectItem key={n} value={n}>
                {t(`neden_${n}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className="block text-sm">
          <span className="text-muted-foreground block text-xs">
            {aciklamaZorunlu ? t("aciklamaZorunlu") : t("aciklamaIstege")}
          </span>
          <Input
            name="not"
            value={not}
            placeholder={t("aciklamaIpucu")}
            onChange={(e) => {
              sifirla();
              setNot(e.target.value);
            }}
            className="h-11"
          />
        </label>

        {onizleme?.tamam ? (
          <div className={`space-y-1 rounded-md p-3 text-sm ${DURUM_KUTUSU.uyari}`} role="status">
            <p className={`font-medium ${DURUM_YAZISI.uyari}`}>
              <TriangleAlert className="mr-1 inline size-4" />
              {t("onizlemeBaslik")}
            </p>
            {onizleme.satirlar.length === 0 ? (
              <p>{t("stokDegismez")}</p>
            ) : (
              <ul className="space-y-0.5">
                {onizleme.satirlar.map((s) => (
                  <li key={s.sku}>
                    {t("stokSatiri", { urun: s.urun, sku: s.sku, adet: s.adet > 0 ? `+${s.adet}` : String(s.adet) })}
                  </li>
                ))}
              </ul>
            )}
            <p>{t("raporNotu")}</p>
            {onizleme.satisKariTazelenir ? <p>{t("satisKariNotu")}</p> : null}
          </div>
        ) : null}

        {donem ? <DonemIsrarBloku donem={donem.donem} satisSayisi={donem.sayi} onGecerlilik={setIsrarGecerli} /> : null}

        {hata ? (
          <p role="alert" className={`rounded-md p-3 text-sm ${DURUM_KUTUSU.olumsuz}`}>
            {hata}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            className="h-11"
            disabled={bekliyor}
            onClick={() =>
              basla(async () => {
                sifirla();
                const c = await iadeGeriAlmayiOnizle(returnId, neden, not);
                setOnizleme(c);
                if (!c.tamam) setHata(c.hata);
              })
            }
          >
            {bekliyor ? t("hesaplaniyor") : t("onizle")}
          </Button>
          <Button
            type="submit"
            variant="destructive"
            className="h-11"
            disabled={bekliyor || !onizleme?.tamam || (donem !== null && !israrGecerli)}
          >
            {t("onayla")}
          </Button>
        </div>
      </form>
    </div>
  );
}
