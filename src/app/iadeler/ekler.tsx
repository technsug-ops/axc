"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { FileText, Paperclip, TriangleAlert, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { ekSil, ekYukle } from "./ek-actions";

/**
 * ============================================================================
 *  DOSYA EKLERİ — İTİRAZ KANITI
 * ----------------------------------------------------------------------------
 *  İtiraz dalında kanıt dosyası şart: "ürün kullanılmış geldi" iddiası
 *  fotoğrafsız pazaryerine geçmiyor.
 *
 *  YEDEK UYARISI EKRANDA DURUR (mimar kuralı 14.08.2026): yedek dosyası ek
 *  SATIRLARINI taşır, DOSYALARI taşımaz. Sessiz bırakılsa kullanıcı
 *  "yedeğim var" diye güvenir ve felaket anında kanıtlarını kaybettiğini o
 *  gün öğrenirdi.
 * ============================================================================
 */

export type EkSatiri = {
  id: string;
  fileName: string;
  sizeBytes: number;
  blobPath: string;
};

export function Ekler({
  hedefTipi,
  hedefId,
  ekler,
  sinirMetni,
}: {
  hedefTipi: string;
  hedefId: string;
  ekler: EkSatiri[];
  /** Sınır metni sunucudan gelir — sayılar tek kaynaktan (lib/ekler.ts). */
  sinirMetni: string;
}) {
  const t = useTranslations("Ekler");
  const router = useRouter();
  const [bekliyor, basla] = useTransition();
  const [hata, setHata] = useState<string | null>(null);
  const girdiRef = useRef<HTMLInputElement>(null);

  const yukle = (dosya: File) => {
    setHata(null);
    const govde = new FormData();
    govde.set("hedefTipi", hedefTipi);
    govde.set("hedefId", hedefId);
    govde.set("dosya", dosya);

    basla(async () => {
      const sonuc = await ekYukle(govde);
      if (sonuc.hata) {
        // Hata KODU sözlükten metne çevrilir; ham kod ekranda görünmez.
        setHata(t(`hata${sonuc.hata}`));
      } else {
        if (girdiRef.current) girdiRef.current.value = "";
        router.refresh();
      }
    });
  };

  const sil = (ekId: string) => {
    setHata(null);
    basla(async () => {
      await ekSil(ekId);
      router.refresh();
    });
  };

  return (
    <div className="space-y-2 rounded-md border p-3">
      <p className="flex items-center gap-2 text-sm font-medium">
        <Paperclip className="size-4" />
        {t("baslik", { sayi: ekler.length })}
      </p>

      {/* SINIRLAR PEŞİN YAZILI: reddedilen dosyadan sonra öğrenilmesin (#5). */}
      <p className="text-muted-foreground text-xs">{sinirMetni}</p>

      {ekler.length > 0 ? (
        <ul className="space-y-1">
          {ekler.map((e) => (
            <li key={e.id} className="flex items-center gap-2 text-sm">
              <FileText className="text-muted-foreground size-4 shrink-0" />
              <a
                href={e.blobPath}
                target="_blank"
                rel="noreferrer"
                className="truncate underline underline-offset-2"
              >
                {e.fileName}
              </a>
              <span className="text-muted-foreground text-xs whitespace-nowrap">
                {(e.sizeBytes / 1024).toFixed(0)} KB
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="size-11 md:size-8"
                aria-label={t("sil")}
                title={t("sil")}
                disabled={bekliyor}
                onClick={() => sil(e.id)}
              >
                <X className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      <Input
        ref={girdiRef}
        type="file"
        className="h-11 md:h-9"
        accept=".jpg,.jpeg,.png,.webp,.pdf"
        disabled={bekliyor}
        onChange={(e) => {
          const dosya = e.target.files?.[0];
          if (dosya) yukle(dosya);
        }}
      />

      {/* YEDEK UYARISI — kalıcı, koşula bağlı değil. */}
      <p className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
        <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
        {t("yedekUyarisi")}
      </p>

      {hata ? (
        <p role="alert" className="text-destructive text-xs">
          {hata}
        </p>
      ) : null}
    </div>
  );
}
