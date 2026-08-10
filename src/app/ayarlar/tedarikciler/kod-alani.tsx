"use client";

import { useTranslations } from "next-intl";
import { Wand2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { tedarikciKoduOner } from "@/lib/kimlik";

/**
 * Tedarikçi kodu alanı + "Öner" düğmesi.
 *
 * Kategori kodundaki ile aynı davranış (#10): öneri VARSAYILAN değil
 * TEKLİFTİR — düğmeye basılmadan alan dolmaz, dolduktan sonra elle
 * değiştirilebilir. Hesap tarayıcıda yapılır, sunucuya gidilmez.
 *
 * Kategoriden tek farkı uzunluk: tedarikçi kodu 2 harf (Hepsiburada → HE),
 * çünkü alım numarasında kategori koduyla birlikte değil tek başına durur
 * ve numarayı kısa tutmak okunurluğu artırır.
 */
export function TedarikciKodAlani({
  inputId,
  ad,
  deger,
  onDegisim,
}: {
  inputId: string;
  /** Kodun türetileceği tedarikçi adı — canlı form değeri. */
  ad: string;
  deger: string;
  onDegisim: (yeni: string) => void;
}) {
  const t = useTranslations("Tedarikci");
  const ortak = useTranslations("Ortak");

  const oneri = tedarikciKoduOner(ad);

  return (
    <div className="flex items-end gap-2">
      <div className="min-w-0 flex-1 space-y-1">
        <label className="text-muted-foreground text-xs" htmlFor={inputId}>
          {ortak("kod")} *
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
        disabled={oneri === null}
        onClick={() => oneri && onDegisim(oneri)}
      >
        <Wand2 />
        {ortak("oner")}
      </Button>
    </div>
  );
}
