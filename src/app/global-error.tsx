"use client";

import { HataEkrani } from "@/components/hata-ekrani";
import { HATA_METINLERI } from "@/lib/hata/metinler";

/**
 * ============================================================================
 *  KÖK HATA SINIRI (K98) — YERLEŞİMİN KENDİSİ DÜŞTÜĞÜNDE
 * ----------------------------------------------------------------------------
 *  ⛔ 30.08.2026 VAKASI TAM BURAYA DÜŞÜYORDU: kök yerleşim oturumu doğrulamak
 *  için veritabanına gidiyor; veritabanı yoksa YERLEŞİM patlıyor ve `error.tsx`
 *  devreye giremiyor. O yüzden korumalı rotalar 307 dönerken çizilen tek sayfa
 *  (`/giris`) 500 veriyordu.
 *
 *  ⚠ KENDİ `html`/`body`SİNİ ÇİZER — kök yerleşimin YERİNE geçtiği için.
 *
 *  ⚠ SÖZLÜK SAĞLAYICISI YOK: `NextIntlClientProvider` kök yerleşimdeydi ve o
 *  düştü. Metin yine de KODA GÖMÜLMÜYOR — `lib/hata/metinler.ts` onu
 *  sözlükten okuyor. Tek fark, çeviri katmanının değil doğrudan okumanın
 *  kullanılması; anahtarlar aynı sözlükte yaşıyor ve `i18n:kontrol` onları
 *  ölçmeye devam ediyor.
 * ============================================================================
 */
export default function KokHatasi({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="tr">
      <body>
        <HataEkrani
          digest={error.digest}
          yenidenDene={reset}
          metin={HATA_METINLERI}
        />
      </body>
    </html>
  );
}
