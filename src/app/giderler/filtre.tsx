"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Gider listesi filtresi (Kullanıcı Kolaylığı İlkeleri #9, #10).
 *
 * Seçim yapılır yapılmaz uygulanır — ayrıca "Filtrele" düğmesine basmak
 * gerekmez. Radix Select'in form içindeki reset davranışına da hiç
 * girilmemiş olur; adres satırı tek gerçek kaynaktır.
 */

export type AySecenegi = { deger: string; etiket: string };

const HEPSI = "__hepsi__";

export function GiderFiltresi({
  aylar,
  kategoriler,
  seciliAy,
  seciliKategori,
}: {
  aylar: AySecenegi[];
  kategoriler: { id: string; ad: string }[];
  seciliAy: string;
  seciliKategori: string;
}) {
  const t = useTranslations("Gider");
  const ortak = useTranslations("Ortak");
  const router = useRouter();

  function git(ay: string, kategori: string) {
    const parametreler = new URLSearchParams();
    if (ay) parametreler.set("ay", ay);
    if (kategori) parametreler.set("kategori", kategori);
    const sorgu = parametreler.toString();
    router.push(sorgu ? `/giderler?${sorgu}` : "/giderler");
  }

  const filtreVar = Boolean(seciliAy || seciliKategori);

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <Label htmlFor="filtre-ay" className="text-xs">
          {t("filtreAy")}
        </Label>
        <Select
          value={seciliAy || HEPSI}
          onValueChange={(d) => git(d === HEPSI ? "" : d, seciliKategori)}
        >
          <SelectTrigger id="filtre-ay" className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={HEPSI}>{t("tumAylar")}</SelectItem>
            {aylar.map((ay) => (
              <SelectItem key={ay.deger} value={ay.deger}>
                {ay.etiket}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="filtre-kategori" className="text-xs">
          {t("filtreKategori")}
        </Label>
        <Select
          value={seciliKategori || HEPSI}
          onValueChange={(d) => git(seciliAy, d === HEPSI ? "" : d)}
        >
          <SelectTrigger id="filtre-kategori" className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={HEPSI}>{t("tumKategoriler")}</SelectItem>
            {kategoriler.map((k) => (
              <SelectItem key={k.id} value={k.id}>
                {k.ad}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtreVar ? (
        <Button variant="ghost" asChild>
          <Link href="/giderler">{ortak("temizle")}</Link>
        </Button>
      ) : null}
    </div>
  );
}
