import { ACIK_BILDIRIM_DURUMLARI } from "@/lib/iade/bildirim";
import { acilMi, isleyenSayac } from "@/lib/iade/sayac";
import { prisma } from "@/lib/prisma";

/**
 * ============================================================================
 *  İADE SAYACI DOLMAK ÜZERE — PANEL ÇANI ÖLÇÜMÜ (K31 ①)
 * ----------------------------------------------------------------------------
 *  Süresi dolan bir iade bildirimi pazaryeri tarafından OTOMATİK ONAYLANIR:
 *  tutar ciromuzdan düşer ve itiraz hakkı biter. Gecikmiş bir iş değil,
 *  doğrudan para kaybı — Faz 1'in "kırmızı uyarı" ölçütüne birebir uyar.
 *
 *  ⚠ ÖLÇÜT EKRANLA TEK GÖVDEDEN GEÇER. Sayı `isleyenSayac` + `acilMi`
 *  fonksiyonlarından çıkıyor; ekran da aynı ikisini çağırıyor. Bu depoda
 *  daha önce tam tersi yaşandı: sonda `new Date()`, ekran iş takvimi günü
 *  kullanıyordu ve iki DOĞRU sayı (83 ↔ 67) çelişiyormuş gibi göründü.
 *  Aynı gövdeden geçtikleri sürece o fark doğamaz.
 *
 *  ⚠ BİLİNMEYEN ACİL SAYILMAZ. Süresi ölçülmemiş (geri gönderim) ya da
 *  çıpası girilmemiş (kargoya veriliş) sayaçlar `acilMi` ölçütünden geçmez.
 *  Kalan süresi BİLİNMEYEN bir kaydı çana düşürmek, kullanıcıya
 *  cevaplayamayacağı bir uyarı vermek olurdu — ve okunmayan uyarı, rozetin
 *  tamamına olan güveni götürür.
 * ============================================================================
 */
export async function iadeSayaciOlcumu(bugun: Date): Promise<{ sayi: number }> {
  const bildirimler = await prisma.returnNotice.findMany({
    /* Kapanmış dosyada saat işlemez; ölçüt açık durum listesinden gelir. */
    where: { status: { in: ACIK_BILDIRIM_DURUMLARI } },
    select: {
      status: true,
      noticedAt: true,
      otomatikOnayTarihi: true,
      islemSonTarihi: true,
    },
  });

  const sayi = bildirimler.filter((b) => {
    const durum = isleyenSayac(b, bugun);
    return durum !== null && acilMi(durum);
  }).length;

  return { sayi };
}
