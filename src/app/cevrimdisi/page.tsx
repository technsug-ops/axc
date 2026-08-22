import Link from "next/link";
import { WifiOff } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";

/**
 * ============================================================================
 *  ÇEVRİMDIŞI SAYFASI
 * ----------------------------------------------------------------------------
 *  Telefonda ağ koptuğunda gösterilir. Servis çalışanı (`public/sw.js`)
 *  bunu kuruluşta bir kez alıp saklar.
 *
 *  ⚠ BURADA VERİ YOK VE OLMAYACAK. Cazip olan şey "son gördüğün paneli
 *  göstermek"tir; yapılmadı. Ağ yokken gösterilen bir rakamın güncel olup
 *  olmadığı ANLAŞILAMAZ ve bu uygulamada rakamlar para. Yanlış rakam
 *  göstermektense hiç rakam göstermemek doğrudur.
 *
 *  ⚠ JAVASCRIPT GEREKTİRMEZ. "Yeniden dene" bir düğme değil BAĞLANTI:
 *  çevrimdışıyken tarayıcının betikleri yükleyip yükleyemediği belirsiz,
 *  bağlantı ise her hâlükârda çalışır (İlke #5 — sessiz başarısızlık yok).
 * ============================================================================
 */
export default async function CevrimdisiSayfasi() {
  const t = await getTranslations("Cevrimdisi");

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <div className="bg-muted text-muted-foreground grid size-14 place-items-center rounded-full">
        <WifiOff className="size-7" aria-hidden="true" />
      </div>
      <h1 className="text-xl font-semibold">{t("baslik")}</h1>
      <p className="text-muted-foreground text-sm">{t("aciklama")}</p>
      {/* ⚠ NEDEN VERİ GÖSTERMEDİĞİMİZ YAZIYOR. "Bağlantı yok" deyip susmak,
          kullanıcıyı "program bozuldu mu" diye düşündürür. */}
      <p className="text-muted-foreground text-xs">{t("neden")}</p>
      <Button asChild className="mt-2 h-11">
        <Link href="/">{t("yenidenDene")}</Link>
      </Button>
    </div>
  );
}
