import { ChevronRight } from "lucide-react";

/**
 * ============================================================================
 *  KATLANIR BÖLÜM
 * ----------------------------------------------------------------------------
 *  Alanı verimli kullanmanın ikinci aracı (birincisi sekme). Farkı:
 *  SEKME aynı anda gerekmeyen şeyleri AYIRIR, KATLAMA ise "lazım olunca
 *  bakılacak" şeyi görüş alanından çıkarır ama YERİNDE bırakır.
 *
 *  NE ZAMAN KATLANIR: bir bloğun özeti zaten ekranda varsa ve altındaki
 *  ayrıntı yalnız doğrulama için gerekiyorsa. 12 aylık grafiğin altındaki
 *  aylık tablo böyleydi — eğri hikâyeyi anlatıyor, tablo rakamı teyit
 *  ediyor. İkisini birden açık tutmak bloğu iki katına çıkarıyordu.
 *
 *  NE ZAMAN KATLANMAZ: kullanıcının GÖRMESİ gereken uyarı, sıfır ya da
 *  sınır. Katlama, bilgiyi saklamanın kibar yolu değildir.
 *
 *  NEDEN `<details>`: tarayıcının kendi öğesi. Ek JavaScript yok, durum
 *  yönetimi yok, klavyeyle açılıp kapanıyor ve ekran okuyucu "genişlet"
 *  diye tanıyor — erişilebilirlik kaybı olmadan yer kazanılıyor.
 * ============================================================================
 */
export function KatlanirBolum({
  baslik,
  notu,
  /** Açılışta açık mı? Panelde varsayılan KAPALI — özet bozulmasın. */
  acik = false,
  children,
}: {
  baslik: string;
  notu?: string;
  acik?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details open={acik} className="group min-w-0 rounded-lg border">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm">
        {/* Ok yönü açık/kapalı durumu SÖYLER — tıklanabilirlik görünür
            olmalı (İlke #2). */}
        <ChevronRight className="size-4 shrink-0 transition-transform group-open:rotate-90" />
        <span className="font-medium">{baslik}</span>
        {notu ? (
          <span className="text-muted-foreground truncate text-xs">{notu}</span>
        ) : null}
      </summary>
      <div className="min-w-0 border-t p-3">{children}</div>
    </details>
  );
}
