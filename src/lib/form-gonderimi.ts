"use client";

import { startTransition, type FormEvent } from "react";

/**
 * ============================================================================
 *  FORM GÖNDERİMİ — OTOMATİK RESET'SİZ
 * ----------------------------------------------------------------------------
 *  SORUN: React 19, `<form action={serverAction}>` biçiminde bir form
 *  gönderildiğinde eylem bitince formu otomatik olarak reset() eder.
 *  Radix Select ise bağlı olduğu formun "reset" olayını dinliyor ve değerini
 *  BAŞLANGIÇ değerine döndürüyor:
 *
 *      // node_modules/@radix-ui/react-select/dist/index.mjs
 *      const reset = () => setValue(initialValueRef.current);
 *      associatedForm.addEventListener("reset", reset);
 *
 *  Select kontrollü olduğu için bu, onValueChange("") çağırıyor ve React
 *  state'i de siliniyor. Sonuç: doğrulama hatası dönen her gönderimde
 *  kullanıcının yaptığı SEÇİMLER kayboluyor, düz metin alanları kalıyordu.
 *  09.08.2026'da satış formunda ortaya çıktı: kanal hesabı seçiliyor,
 *  kaydete basılıyor, seçim siliniyor ve sunucuya boş gidiyor —
 *  kullanıcı aynı hatayı tekrar tekrar alıyordu.
 *
 *  ÇÖZÜM: Gönderimi elle yapıyoruz. Eylem bir geçiş (transition) içinde
 *  çağrıldığı için useActionState'in "bekliyor" durumu çalışmaya devam eder,
 *  ama React formu reset etmez; alanlar olduğu gibi kalır.
 *
 *  NOT: Bu formlar zaten JavaScript'siz çalışmıyor (Radix, barkod okuyucu ve
 *  gizli JSON alanı istemci tarafında üretiliyor), dolayısıyla `action`
 *  yerine `onSubmit` kullanmak bir yetenek kaybı değil.
 * ============================================================================
 */
export function formGonderimi(formAction: (formData: FormData) => void) {
  return (olay: FormEvent<HTMLFormElement>) => {
    olay.preventDefault();
    const veri = new FormData(olay.currentTarget);
    startTransition(() => formAction(veri));
  };
}
