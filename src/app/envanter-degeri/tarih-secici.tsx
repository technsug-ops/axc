"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CalendarClock, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * ============================================================================
 *  TARİHLİ ENVANTER — TARİH SEÇİCİ (K53, 25.08.2026)
 * ----------------------------------------------------------------------------
 *  ⚠ SEÇİM ADRESE YAZILIR (`?tarih=`). Böylece sonuç paylaşılabilir, yer
 *  imine eklenebilir ve sayfa SUNUCUDA çizilmeye devam eder — arama ve
 *  sıralama zaten aynı deseni kullanıyor (İlke #10).
 *
 *  ⚠ DİĞER SÜZGEÇLER SİLİNMEZ. Arama ve sıra `tasinanlar` ile taşınıyor;
 *  tarih seçmek aramayı sıfırlasaydı kullanıcı süzdüğü listeyi kaybederdi.
 *
 *  ⚠ `max` BUGÜN: gelecek tarih seçilemez. Seçilebilseydi ekran bugünle
 *  aynı rakamı gösterir ama başlığında YARIN yazardı — doğru sayı, yanlış
 *  etiket.
 * ============================================================================
 */
export function TarihSecici({
  baslangic,
  enGec,
  tasinanlar,
}: {
  /** Seçili tarih (`YYYY-MM-DD`) ya da boş = bugün. */
  baslangic: string;
  /** Seçilebilecek en geç gün — bugün. */
  enGec: string;
  /** Adreste korunacak öteki süzgeçler. */
  tasinanlar: Record<string, string>;
}) {
  const t = useTranslations("Envanter");
  const router = useRouter();

  function git(tarih: string) {
    const p = new URLSearchParams();
    for (const [ad, deger] of Object.entries(tasinanlar)) {
      if (deger) p.set(ad, deger);
    }
    if (tarih) p.set("tarih", tarih);
    const sorgu = p.toString();
    router.push(`/envanter-degeri${sorgu ? `?${sorgu}` : ""}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="space-y-2">
        <Label htmlFor="envanter-tarih" className="flex items-center gap-1.5">
          <CalendarClock className="size-4" />
          {t("tarihEtiketi")}
        </Label>
        <Input
          id="envanter-tarih"
          type="date"
          max={enGec}
          value={baslangic}
          onChange={(e) => git(e.target.value)}
          className="w-44"
        />
      </div>

      {/*
        ⚠ "BUGÜNE DÖN" YALNIZ BİR TARİH SEÇİLİYKEN GÖRÜNÜR. Boşken
        gösterilseydi hiçbir şeyi geri almayan bir düğme olurdu — tıklanınca
        iş yapmayan düğme sessiz başarısızlıktır (İlke #5).
      */}
      {baslangic ? (
        <Button
          type="button"
          variant="outline"
          className="h-11 md:h-9"
          onClick={() => git("")}
        >
          <X />
          {t("buguneDon")}
        </Button>
      ) : null}
    </div>
  );
}
