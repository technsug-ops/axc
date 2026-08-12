"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Kanal SKU listesi süzgeci — seçim yapılır yapılmaz uygulanır (#9). */

const HEPSI = "__hepsi__";

export function KanalSkuFiltresi({
  hesaplar,
  seciliHesap,
  arama,
  eksikOran,
}: {
  hesaplar: { id: string; etiket: string; satisIcin: boolean }[];
  seciliHesap: string;
  arama: string;
  eksikOran: boolean;
}) {
  const t = useTranslations("KanalSku");
  const ortak = useTranslations("Ortak");
  const router = useRouter();

  function git(degisim: { hesap?: string; q?: string; eksik?: boolean }) {
    const p = new URLSearchParams();
    const hesap = degisim.hesap ?? seciliHesap;
    const q = degisim.q ?? arama;
    const eksik = degisim.eksik ?? eksikOran;
    if (hesap) p.set("hesap", hesap);
    if (q) p.set("q", q);
    if (eksik) p.set("eksik", "1");
    const sorgu = p.toString();
    router.push(sorgu ? `/kanal-sku?${sorgu}` : "/kanal-sku");
  }

  const filtreVar = Boolean(seciliHesap || arama || eksikOran);

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <Label htmlFor="ks-filtre-hesap" className="text-xs">
          {t("filtreHesap")}
        </Label>
        <Select
          value={seciliHesap || HEPSI}
          onValueChange={(d) => git({ hesap: d === HEPSI ? "" : d })}
        >
          <SelectTrigger id="ks-filtre-hesap" className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={HEPSI}>{t("tumHesaplar")}</SelectItem>
            {hesaplar.map((h) => (
              <SelectItem key={h.id} value={h.id}>
                {h.etiket}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const veri = new FormData(e.currentTarget);
          git({ q: String(veri.get("q") ?? "") });
        }}
        className="flex flex-wrap items-end gap-2"
      >
        <div className="space-y-1">
          <Label htmlFor="ks-filtre-q" className="text-xs">
            {ortak("ara")}
          </Label>
          <Input
            id="ks-filtre-q"
            name="q"
            defaultValue={arama}
            placeholder={t("aramaIpucu")}
            className="w-56"
            autoComplete="off"
          />
        </div>
        <Button type="submit" variant="secondary">
          {ortak("ara")}
        </Button>
      </form>

      <Button
        type="button"
        variant={eksikOran ? "default" : "outline"}
        onClick={() => git({ eksik: !eksikOran })}
      >
        {t("filtreEksikOran")}
      </Button>

      {filtreVar ? (
        <Button variant="ghost" asChild>
          <Link href="/kanal-sku">{ortak("temizle")}</Link>
        </Button>
      ) : null}
    </div>
  );
}
