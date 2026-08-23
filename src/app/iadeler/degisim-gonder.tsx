"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { PackagePlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DURUM_YAZISI } from "@/lib/renkler";

import { degisimUrunuGonderildi } from "./bildirim-actions";

/**
 * ============================================================================
 *  DEĞİŞİM ÜRÜNÜ GÖNDERİLDİ (K37)
 * ----------------------------------------------------------------------------
 *  ⚠ NİYE AYRI DÜĞME, NİYE İADE FORMU DEĞİL. Değişimde giden mal bir İADE
 *  DEĞİL, bir ÇIKIŞTIR. İade formu "bu satıştan kaç adet daha iade
 *  edilebilir" diye soruyor ve iade hakkı dolduğunda _"Tamamı iade edildi"_
 *  deyip kapanıyor. Kullanıcı 23.08.2026'da bu duvara İKİ ayrı satışta
 *  çarptı: gönderdiği ürünün stoğunu hiçbir yoldan düşemedi.
 *
 *  ⚠ MALİYET SATIŞIN NET'İNE GİDER (K36a) ve kâr damgası hemen tazelenir —
 *  "kaydettim ama rakam değişmedi" durumu doğmasın.
 * ============================================================================
 */
export function DegisimGonder({
  bildirimId,
  urun,
  adet,
  /** Kargo hâlâ iadenin NET'inde — K36b bekliyor. Ekran bunu SÖYLER. */
  kargoUyarisi,
}: {
  bildirimId: string;
  urun: string;
  adet: number;
  kargoUyarisi: string;
}) {
  const t = useTranslations("Bildirim2");
  const router = useRouter();
  const [bekliyor, basla] = useTransition();
  const [hata, setHata] = useState<string | null>(null);
  const [basari, setBasari] = useState<string | null>(null);

  const gonder = () => {
    setHata(null);
    basla(async () => {
      const sonuc = await degisimUrunuGonderildi(bildirimId);
      if (sonuc.hata) setHata(sonuc.hata);
      else {
        setBasari(t("degisimDusuldu", { adet: sonuc.dusen ?? adet, urun }));
        router.refresh();
      }
    });
  };

  if (basari) return <p className="text-xs">{basari}</p>;

  return (
    <div className="mt-1 space-y-1">
      <p className={`text-xs ${DURUM_YAZISI.olumsuz}`}>
        {t("ayrilmisDusmedi", { adet })}
      </p>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="h-11 md:h-8"
        disabled={bekliyor}
        onClick={gonder}
      >
        <PackagePlus className="size-4" />
        {t("degisimGonderildi", { urun })}
      </Button>
      {/*
        ⚠ GEÇİCİ TUTARSIZLIK SESSİZ BIRAKILMAZ (mimar şartı 23.08.2026).
        K36a malın maliyetini satışın NET'ine taşıdı; kargo HÂLÂ iadenin
        NET'inde çünkü `SaleFee` satırları her yeniden hesapta silinip motor
        tarafından üretiliyor — kargoyu satışa taşımak motorun iadeleri
        okumasını gerektiriyor (K36b).

        Sessiz iki cep bırakılmıyor: ekran neyi TAŞIMADIĞINI kendisi söylüyor.
        Nötr renk bilerek — bu bir hata değil, beyan edilmiş bir eksik.
      */}
      <p className="border-l-2 border-dashed border-muted-foreground/50 pl-2 text-xs text-muted-foreground">
        {kargoUyarisi}
      </p>
      {hata ? <p className={`text-xs ${DURUM_YAZISI.olumsuz}`}>{hata}</p> : null}
    </div>
  );
}
