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
  aralikBas,
  aralikBit,
  enGec,
  tasinanlar,
}: {
  /** Tek fotoğraf tarihi (`YYYY-MM-DD`) ya da boş. */
  baslangic: string;
  /** Aralık başlangıcı — boş = aralık kipi kapalı. */
  aralikBas: string;
  /** Aralık bitişi. */
  aralikBit: string;
  /** Seçilebilecek en geç gün — bugün. */
  enGec: string;
  /** Adreste korunacak öteki süzgeçler. */
  tasinanlar: Record<string, string>;
}) {
  const t = useTranslations("Envanter");
  const router = useRouter();

  /**
   * ⚠ ÜÇ KİP TEK ADRESTE: bugün (parametresiz) · tek tarih (`tarih=`) ·
   * aralık (`bas=` + `bit=`). Kipler birbirini SİLER — aynı anda hem tek
   * tarih hem aralık göstermek, iki farklı soruyu tek ekrana sıkıştırmak
   * olurdu.
   */
  function git(yeni: { tarih?: string; bas?: string; bit?: string }) {
    const p = new URLSearchParams();
    for (const [ad, deger] of Object.entries(tasinanlar)) {
      if (deger) p.set(ad, deger);
    }
    if (yeni.tarih) p.set("tarih", yeni.tarih);
    if (yeni.bas) p.set("bas", yeni.bas);
    if (yeni.bit) p.set("bit", yeni.bit);
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
          onChange={(e) => git({ tarih: e.target.value })}
          className="w-44"
        />
      </div>

      {/*
        ═══ ARALIK — İKİ UÇ DA AÇIKÇA SEÇİLİR (Halil şartı) ═══════════════
        ⚠ TEK UÇ SEÇİLİNCE EKRAN HATA VERİR, ÖTEKİNİ VARSAYMAZ. "Başlangıçtan
        bugüne" diye tamamlamak, kullanıcının seçmediği bir sınırdan rakam
        üretmek olurdu — ve o rakam "seçtiğim dönem" diye okunurdu.
        ⚠ Bu yüzden seçiciler kaydetmeden değil, İKİSİ DE DOLUNCA gidiyor:
        yarım bir istekle sunucuya gidip hata almak gereksiz bir tur.
      */}
      <div className="space-y-2">
        <Label htmlFor="envanter-bas">{t("aralikBas")}</Label>
        <Input
          id="envanter-bas"
          type="date"
          max={enGec}
          value={aralikBas}
          onChange={(e) => {
            const v = e.target.value;
            if (v && aralikBit) git({ bas: v, bit: aralikBit });
            else if (!v) git({});
          }}
          className="w-44"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="envanter-bit">{t("aralikBit")}</Label>
        <Input
          id="envanter-bit"
          type="date"
          max={enGec}
          /** ⚠ Bitiş, başlangıçtan önce SEÇİLEMEZ — sunucu da reddediyor. */
          min={aralikBas || undefined}
          value={aralikBit}
          onChange={(e) => {
            const v = e.target.value;
            if (v && aralikBas) git({ bas: aralikBas, bit: v });
            else if (!v) git({});
          }}
          className="w-44"
        />
      </div>

      {/*
        ⚠ "BUGÜNE DÖN" YALNIZ BİR TARİH SEÇİLİYKEN GÖRÜNÜR. Boşken
        gösterilseydi hiçbir şeyi geri almayan bir düğme olurdu — tıklanınca
        iş yapmayan düğme sessiz başarısızlıktır (İlke #5).
      */}
      {baslangic || aralikBas || aralikBit ? (
        <Button
          type="button"
          variant="outline"
          className="h-11 md:h-9"
          onClick={() => git({})}
        >
          <X />
          {t("buguneDon")}
        </Button>
      ) : null}
    </div>
  );
}
