"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, FileText, Paperclip, TriangleAlert, X } from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ekiDogrula } from "@/lib/ekler";

import { ekSil } from "./ek-actions";
import { DURUM_YAZISI } from "@/lib/renkler";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

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

function PdfOnizleme({ ekId }: { ekId: string }) {
  const t = useTranslations("Ekler");
  const [acik, setAcik] = useState(false);
  const [sayfa, setSayfa] = useState(1);
  const [sayfaSayisi, setSayfaSayisi] = useState(0);
  const [olcek, setOlcek] = useState(1);

  if (!acik) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-11 shrink-0 md:h-8"
        onClick={() => setAcik(true)}
      >
        <FileText className="size-4" />
        {t("pdfGoruntule")}
      </Button>
    );
  }

  return (
    <div className="basis-full space-y-2 rounded-md border bg-muted/30 p-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-11 md:h-8"
          disabled={sayfa <= 1}
          onClick={() => setSayfa((deger) => deger - 1)}
        >
          <ChevronLeft className="size-4" />
          {t("oncekiSayfa")}
        </Button>
        <span className="text-xs">
          {t("sayfa", { mevcut: sayfa, toplam: sayfaSayisi || "..." })}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-11 md:h-8"
          disabled={!sayfaSayisi || sayfa >= sayfaSayisi}
          onClick={() => setSayfa((deger) => deger + 1)}
        >
          {t("sonrakiSayfa")}
          <ChevronRight className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-11 md:h-8"
          onClick={() => setOlcek((deger) => Math.min(deger + 0.2, 2))}
        >
          {t("yaklastir")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-11 md:h-8"
          onClick={() => setOlcek((deger) => Math.max(deger - 0.2, 0.6))}
        >
          {t("uzaklastir")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-11 md:h-8"
          onClick={() => setAcik(false)}
        >
          {t("pdfKapat")}
        </Button>
      </div>
      <div className="max-h-[70vh] overflow-auto rounded border bg-white p-2">
        <Document
          file={`/api/ekler/${ekId}`}
          loading={<p className="p-4 text-sm">{t("pdfYukleniyor")}</p>}
          error={<p className="p-4 text-sm text-destructive">{t("pdfYuklenemedi")}</p>}
          onLoadSuccess={({ numPages }) => setSayfaSayisi(numPages)}
        >
          <Page pageNumber={sayfa} scale={olcek} renderTextLayer={false} renderAnnotationLayer={false} />
        </Document>
      </div>
    </div>
  );
}

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
  /**
   * SON YÜKLENEN DOSYA — "gönder tuşu yok, ulaştı mı?" (kullanıcı 16.08.2026)
   *
   * Yükleme dosya SEÇİLİR SEÇİLMEZ oluyor; gönder düğmesi yok çünkü
   * gönderilecek bir adım kalmıyor. Ama ekran bunu söylemiyordu: tek işaret
   * listedeki sayacın artmasıydı, kullanıcı onu fark etmeyip "iletildi mi
   * bilmiyorum" dedi. SESSİZ BAŞARI, sessiz başarısızlık kadar kötüdür —
   * işlem sonucu her zaman görünür bildirilir (İlke #5).
   */
  const [sonYuklenen, setSonYuklenen] = useState<string | null>(null);
  const girdiRef = useRef<HTMLInputElement>(null);

  /** Seçim kutusunu boşaltır — aynı dosya tekrar seçilebilsin. */
  const kutuyuBosalt = () => {
    if (girdiRef.current) girdiRef.current.value = "";
  };

  const yukle = (dosya: File) => {
    setHata(null);
    setSonYuklenen(null);

    /**
     * ÖNCE TARAYICIDA ELE — 14.08.2026 canlı çökmesinin (T5) asıl dersi.
     *
     * Büyük dosya ağa çıkarsa taşıma tavanına çarpar ve hata BİZİM
     * kodumuzdan önce oluşur; kibar mesaj yazma şansı kalmaz. Burada aynı
     * SAF kuralla (`ekiDogrula`, sunucudakiyle birebir aynı fonksiyon)
     * eliyoruz: reddedilen dosya için HİÇ İSTEK ATILMAZ, kullanıcı sebebi
     * anında görür.
     *
     * Bu istemci kontrolü GÜVENLİK DEĞİLDİR: uç dışarıdan çağrılabilir,
     * sunucu aynı kontrolü yeniden yapar. Buradaki amaç hız ve çökmeme.
     */
    const hatalar = ekiDogrula({
      dosyaAdi: dosya.name,
      mimeType: dosya.type,
      sizeBytes: dosya.size,
      mevcutEkSayisi: ekler.length,
      hedefTipi,
    });
    if (hatalar.length > 0) {
      setHata(t(`hata${hatalar[0]}`));
      kutuyuBosalt();
      return;
    }

    const govde = new FormData();
    govde.set("hedefTipi", hedefTipi);
    govde.set("hedefId", hedefId);
    govde.set("dosya", dosya);

    basla(async () => {
      /**
       * HER YOL KİBAR BİTER. Ağ kopması, 500, bozuk JSON — hiçbiri istisna
       * olarak dışarı taşmaz; taşsaydı ekran error boundary'ye düşer ve
       * kullanıcı yine "sayfa çöktü" görürdü.
       */
      try {
        const cevap = await fetch("/api/ekler", { method: "POST", body: govde });
        const sonuc = (await cevap.json().catch(() => ({
          hata: "YUKLENEMEDI",
        }))) as { hata?: string };

        if (!cevap.ok || sonuc.hata) {
          const anahtar = `hata${sonuc.hata ?? "YUKLENEMEDI"}`;
          // Tanınmayan kod gelirse sözlük patlamasın: genel mesaja düş.
          setHata(t.has(anahtar) ? t(anahtar) : t("hataYUKLENEMEDI"));
          kutuyuBosalt();
          return;
        }

        kutuyuBosalt();
        setSonYuklenen(dosya.name);
        router.refresh();
      } catch {
        setHata(t("hataYUKLENEMEDI"));
        kutuyuBosalt();
      }
    });
  };

  const sil = (ekId: string) => {
    setHata(null);
    setSonYuklenen(null);
    basla(async () => {
      // Silme de sessizce patlamaz; küçük gövde olduğu için action kalıyor.
      try {
        await ekSil(ekId);
        router.refresh();
      } catch {
        setHata(t("hataYUKLENEMEDI"));
      }
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
            <li key={e.id} className="flex flex-wrap items-center gap-2 text-sm">
              <FileText className="text-muted-foreground size-4 shrink-0" />
              {/* ÖZEL DOSYA — ham Blob adresi verilmez, akış kendi
                  ucumuzdan ve oturum kontrolüyle geçer. */}
              <a
                href={`/api/ekler/${e.id}`}
                target="_blank"
                rel="noreferrer"
                className="truncate underline underline-offset-2"
              >
                {e.fileName}
              </a>
              <span className="text-muted-foreground text-xs whitespace-nowrap">
                {(e.sizeBytes / 1024).toFixed(0)} KB
              </span>
              {e.fileName.toLowerCase().endsWith(".pdf") ? <PdfOnizleme ekId={e.id} /> : null}
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
      <p className={`flex items-start gap-2 text-xs ${DURUM_YAZISI.uyari}`}>
        <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
        {t("yedekUyarisi")}
      </p>

      {/* BAŞARI DA GÖRÜNÜR SÖYLENİR — "gönder tuşu yok" sorusunun cevabı. */}
      {sonYuklenen ? (
        <p role="status" className={`text-xs ${DURUM_YAZISI.olumlu}`}>
          {t("yuklendi", { dosya: sonYuklenen })}
        </p>
      ) : null}

      {hata ? (
        <p role="alert" className="text-destructive text-xs">
          {hata}
        </p>
      ) : null}
    </div>
  );
}
