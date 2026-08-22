import { markaIkonu } from "@/lib/marka/ikon";

/**
 * iOS ana ekran simgesi.
 *
 * ⚠ iOS MANİFEST SİMGELERİNİ KULLANMAZ; `apple-touch-icon` bağlantısına
 * bakar. Bu dosya olmasaydı iPhone'a eklenen kısayol, sayfanın ekran
 * görüntüsünü küçültüp simge diye gösterirdi.
 *
 * ⚠ KÖŞE YUVARLATMASINI iOS KENDİ YAPAR ve şeffaflığı SİYAHA çevirir —
 * bu yüzden zemin dolu, `maskeli` değil.
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return markaIkonu({ boyut: 180 });
}
