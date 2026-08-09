"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

/**
 * ============================================================================
 *  FORM HATA ÖZETİ
 * ----------------------------------------------------------------------------
 *  Uzun formlarda hata kutusu en üstte durur; kullanıcı ise en alttaki
 *  "Kaydet" düğmesindedir. Kutu ekran dışında kalınca kayıt reddedildiği
 *  hâlde HİÇBİR ŞEY OLMAMIŞ gibi görünüyordu — Kullanıcı Kolaylığı #5'in
 *  ("sessiz başarısızlık yasaktır") tam olarak yasakladığı durum.
 *  09.08.2026'da satış formunda gerçek kullanımda ortaya çıktı.
 *
 *  Bu bileşen hata geldiğinde kutuyu görünür alana kaydırır ve odağı ona
 *  verir; ekran okuyucu da role="alert" ile duyurur. Tüm uzun formlar aynı
 *  bileşeni kullanır (Kullanıcı Kolaylığı #10: aynı işlem her ekranda aynı
 *  çalışır).
 * ============================================================================
 */
export function HataOzeti({ hatalar }: { hatalar?: string[] }) {
  const ortak = useTranslations("Ortak");
  const kutuRef = useRef<HTMLDivElement>(null);

  const varMi = Boolean(hatalar?.length);

  useEffect(() => {
    if (!varMi) return;
    const kutu = kutuRef.current;
    if (!kutu) return;

    kutu.scrollIntoView({ behavior: "smooth", block: "center" });
    // Odak da taşınır: klavye ve ekran okuyucu kullanıcısı da hatayı bulur.
    kutu.focus({ preventScroll: true });
    // `hatalar` her gönderimde YENİ dizi olarak döner; aynı hata tekrar
    // gelse bile kutu yeniden gösterilir.
  }, [hatalar, varMi]);

  if (!hatalar?.length) return null;

  return (
    <div
      ref={kutuRef}
      role="alert"
      tabIndex={-1}
      className="border-destructive/50 bg-destructive/10 text-destructive scroll-mt-20 rounded-md border p-4 text-sm outline-none"
    >
      <p className="mb-2 font-medium">{ortak("kaydedilemedi")}</p>
      <ul className="list-inside list-disc space-y-1">
        {hatalar.map((hata, i) => (
          <li key={i}>{hata}</li>
        ))}
      </ul>
    </div>
  );
}
