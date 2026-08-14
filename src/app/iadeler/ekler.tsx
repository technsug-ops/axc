"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { FileText, Paperclip, TriangleAlert, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ekiDogrula } from "@/lib/ekler";

import { ekSil } from "./ek-actions";

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

  /** Seçim kutusunu boşaltır — aynı dosya tekrar seçilebilsin. */
  const kutuyuBosalt = () => {
    if (girdiRef.current) girdiRef.current.value = "";
  };

  const yukle = (dosya: File) => {
    setHata(null);

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
        router.refresh();
      } catch {
        setHata(t("hataYUKLENEMEDI"));
        kutuyuBosalt();
      }
    });
  };

  const sil = (ekId: string) => {
    setHata(null);
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
