import { siparisBildiriminiDene } from "./push-gonder";
import { hedefTebrikleriniDene } from "@/lib/hedef/hedef-tebrik";

/**
 * SİPARİŞ ÇEKİMİNDEN SONRA (K348 + K349, 20.10.2026) — üç çekim ucunun tek çağrısı.
 * Önce «N yeni sipariş» bildirimi; YENİ sipariş gerçekten bildirildiyse (bu tetik
 * imleci ilerletti) hedefler hesaplanır ve geçilen hedefe tebrik gider. Yeni sipariş
 * yoksa yıllık hesap boşuna koşmaz. İkisi de hata yutmaz ama çekimin sonucunu bozmaz.
 */
export async function siparisSonrasiBildirimleri() {
  const siparis = await siparisBildiriminiDene();
  const hedef = siparis.durum === "GONDERILDI" ? await hedefTebrikleriniDene() : null;
  return { ...siparis, hedef };
}
