"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CalendarClock, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * ============================================================================
 *  TARİHLİ ENVANTER — TARİH SEÇİCİ (K53, 25–26.08.2026)
 * ----------------------------------------------------------------------------
 *  ⚠ SEÇİM ADRESE YAZILIR (`?tarih=` / `?bas=&bit=`). Böylece sonuç
 *  paylaşılabilir, yer imine eklenebilir ve sayfa SUNUCUDA çizilmeye devam
 *  eder — arama ve sıralama zaten aynı deseni kullanıyor (İlke #10).
 *
 *  ⚠ DİĞER SÜZGEÇLER SİLİNMEZ. Arama ve sıra `tasinanlar` ile taşınıyor.
 *
 *  ⚠ `max` BUGÜN: gelecek tarih seçilemez.
 *
 *  ── KONTROLLÜ GİRDİ, DURUMU OLMADAN YAZILAMAZ (canlı arıza 26.08.2026) ──
 *  Kullanıcı: _"TARİHLER GİRİLİYOR FAKAT PROGRAM TARİHLERİ KAYDETMİYOR VE
 *  ENVANTER RAKAMI DEĞİŞMİYOR."_ Haklıydı ve kusur ağırdı: **aralık alanına
 *  yazmak İMKÂNSIZDI.**
 *
 *  İlk yazımda alanların değeri doğrudan ADRESTEN geliyordu
 *  (`value={aralikBas}`) ve `onChange` yalnız İKİ UÇ DA DOLUYKEN adrese
 *  gidiyordu. Ama ilk tarihi girerken ikinci uç zorunlu olarak BOŞ:
 *    · dallardan hiçbiri çalışmıyor → adres değişmiyor
 *    · adres değişmediği için `value` hâlâ `""`
 *    · React kontrollü girdiyi her tuşta `""`e geri yazıyor
 *  Yani kullanıcı yazıyor, ekran siliyor. Sonsuz döngü.
 *
 *  ⚠ ÇARE: gerçeğin kaynağı YEREL DURUM, adres yalnız SONUCU taşır. Alan
 *  serbestçe doldurulur; iki uç da TAM olunca adrese gidilir.
 *  _(Anayasa: "kalıcılık katmanı, çalışma katmanının önkoşulu yapılmaz" —
 *  orada depolama, burada adres.)_
 * ============================================================================
 */

/** `type="date"` tam bir tarihi 10 karakterle verir: `2026-06-01`. */
const TAM_TARIH = 10;

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
   * ⚠ YEREL DURUM — ADRES DEĞİL. Adres yalnız TAMAMLANMIŞ bir seçimi
   * taşır; yazma sırasındaki ara hâller burada yaşar. Adres tek kaynak
   * olsaydı alan doldurulamazdı (yukarıdaki arıza).
   *
   * ⚠ Başlangıç değeri adresten geliyor: paylaşılan bir bağlantı açıldığında
   * alanlar dolu gelir.
   */
  const [tek, setTek] = useState(baslangic);
  const [bas, setBas] = useState(aralikBas);
  const [bit, setBit] = useState(aralikBit);

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

  /** Tek fotoğraf: tarih TAM olunca git; silinince bugüne dön. */
  function tekDegisti(v: string) {
    setTek(v);
    /**
     * ⚠ KİPLER BİRBİRİNİ SİLER: tek tarih seçilince aralık temizlenir.
     * İkisi aynı anda dursaydı ekran hangi soruyu cevapladığını
     * söyleyemezdi.
     */
    if (v.length === TAM_TARIH) {
      setBas("");
      setBit("");
      git({ tarih: v });
    } else if (v === "") git({});
  }

  /**
   * Aralık: yalnız İKİ UÇ DA TAM olunca gidilir (Halil şartı — baz tarih
   * varsayılmaz). Ama alan bu arada serbestçe doldurulabilir.
   */
  function aralikDegisti(yeniBas: string, yeniBit: string) {
    setBas(yeniBas);
    setBit(yeniBit);
    if (yeniBas.length === TAM_TARIH && yeniBit.length === TAM_TARIH) {
      setTek("");
      git({ bas: yeniBas, bit: yeniBit });
    } else if (yeniBas === "" && yeniBit === "") {
      git({});
    }
  }

  /** ⚠ Tek uç doluyken kullanıcı BEKLETİLİYOR — sebebi ekranda yazar (#5). */
  const yarim =
    (bas !== "" && bit === "") || (bas === "" && bit !== "");

  return (
    <div className="space-y-2">
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
            value={tek}
            onChange={(e) => tekDegisti(e.target.value)}
            className="w-44"
          />
        </div>

        {/*
          ═══ ARALIK — İKİ UÇ DA AÇIKÇA SEÇİLİR (Halil şartı) ═══════════════
          ⚠ TEK UÇ SEÇİLİNCE HESAP KOŞMAZ, ÖTEKİ VARSAYILMAZ. "Başlangıçtan
          bugüne" diye tamamlamak, kullanıcının seçmediği bir sınırdan rakam
          üretmek olurdu.
          ⚠ AMA ALAN DOLDURULABİLİR: değer yerel durumda yaşıyor. İlk yazımda
          yaşamıyordu ve alana yazmak imkânsızdı (canlı arıza 26.08.2026).
        */}
        <div className="space-y-2">
          <Label htmlFor="envanter-bas">{t("aralikBas")}</Label>
          <Input
            id="envanter-bas"
            type="date"
            max={enGec}
            value={bas}
            onChange={(e) => aralikDegisti(e.target.value, bit)}
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
            min={bas || undefined}
            value={bit}
            onChange={(e) => aralikDegisti(bas, e.target.value)}
            className="w-44"
          />
        </div>

        {/*
          ⚠ "BUGÜNE DÖN" YALNIZ BİR SEÇİM VARKEN GÖRÜNÜR. Boşken
          gösterilseydi hiçbir şeyi geri almayan bir düğme olurdu —
          tıklanınca iş yapmayan düğme sessiz başarısızlıktır (İlke #5).
        */}
        {tek || bas || bit ? (
          <Button
            type="button"
            variant="outline"
            className="h-11 md:h-9"
            onClick={() => {
              setTek("");
              setBas("");
              setBit("");
              git({});
            }}
          >
            <X />
            {t("buguneDon")}
          </Button>
        ) : null}
      </div>

      {/*
        ⚠ YARIM SEÇİM SESSİZ BEKLEMEZ. Kullanıcı ilk tarihi girip hiçbir şey
        olmadığını görünce "kaydetmiyor" der — nitekim dedi. Ekran artık ne
        beklendiğini SÖYLÜYOR (İlke #5).
      */}
      {yarim ? (
        <p className="text-muted-foreground text-xs">{t("aralikYarim")}</p>
      ) : null}
    </div>
  );
}
