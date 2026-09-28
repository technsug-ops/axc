/**
 * RAF ARAMASI (K289-③, 27.09.2026) — saf; ekran ve bekçi aynı gövdeyi çağırır.
 *
 * Kullanıcı bulgusu: «A1 yazdığımda A1, A11, A12 geliyor». Raf kodu bir KİMLİKTİR;
 * okutulan ya da yazılan kod bir rafla BİREBİR tutuyorsa aranan o raftır. İçinde
 * geçenler (A11, A12) gizlenmez ama liste olarak da dökülmez — SAYI olarak söylenir
 * (İlke #5: gösterilmeyen kümenin varlığı ekranda yazar).
 * Tam tutan yoksa eski davranış: kodda ya da adda geçenlerin hepsi («A» → A ile
 * başlayan bütün raflar). Büyük-küçük/Türkçe harf farksız.
 */
import { okuyucuDuzeltmesi } from "@/lib/varyant-arama-kurali";

export type RafAramaSonucu<T> = { gorunen: T[]; tamEslesme: boolean; benzerSayisi: number };

const kucuk = (x: string) => x.toLocaleLowerCase("tr");

export function rafAramasi<T extends { code: string; name: string | null }>(liste: T[], arama: string): RafAramaSonucu<T> {
  /** K300: okutulan raf etiketi `A1*01` gelirse `A1-01` aranır (okuyucu klavye düzeni). */
  const q = kucuk(okuyucuDuzeltmesi(arama.trim()));
  if (!q) return { gorunen: liste, tamEslesme: false, benzerSayisi: 0 };
  const icerenler = liste.filter((k) => [k.code, k.name ?? ""].some((a) => kucuk(a).includes(q)));
  const tam = icerenler.filter((k) => kucuk(k.code) === q);
  if (tam.length > 0) return { gorunen: tam, tamEslesme: true, benzerSayisi: icerenler.length - tam.length };
  return { gorunen: icerenler, tamEslesme: false, benzerSayisi: 0 };
}
