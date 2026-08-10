"use client";

import { useTranslations } from "next-intl";
import { Wand2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { kategoriKoduOner } from "@/lib/kimlik";

/**
 * Kategori kodu alanı + "Öner" düğmesi.
 *
 * Öneri VARSAYILAN değil, TEKLİFTİR: düğmeye basılmadan alan doldurulmaz,
 * doldurduktan sonra da elle değiştirilebilir. Sistem kullanıcının yerine
 * karar vermez — anayasadaki "yer tutucu değer gibi görünmez" ilkesinin
 * kardeşi: üretilmiş değer de girilmiş değer gibi görünmemeli, girilmiş
 * OLMALI.
 *
 * Hesap tarayıcıda yapılır (`kimlik.ts` saf modül) — sunucuya gidip gelmeden
 * anında cevap verir.
 */
export function KodAlani({
  inputId,
  ad,
  deger,
  onDegisim,
}: {
  inputId: string;
  /** Kodun türetileceği kategori adı — canlı form değeri. */
  ad: string;
  deger: string;
  onDegisim: (yeni: string) => void;
}) {
  const t = useTranslations("Kategori");
  const ortak = useTranslations("Ortak");

  const oneri = kategoriKoduOner(ad);

  return (
    <div className="flex items-end gap-2">
      <div className="min-w-0 flex-1 space-y-1">
        <label className="text-muted-foreground text-xs" htmlFor={inputId}>
          {ortak("kod")}
        </label>
        <Input
          id={inputId}
          name="code"
          value={deger}
          onChange={(e) => onDegisim(e.target.value)}
          placeholder={t("kodIpucu")}
          autoComplete="off"
          className="uppercase"
        />
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        // Ad boşsa öneri üretilemez; düğme kapalı ve NEDENİ başlıkta yazar.
        disabled={oneri === null}
        title={oneri === null ? t("kodOnerilemedi") : undefined}
        onClick={() => oneri && onDegisim(oneri)}
      >
        <Wand2 />
        {ortak("oner")}
      </Button>
    </div>
  );
}
