import { prisma } from "@/lib/prisma";
import { acikPartilerToplu } from "@/lib/stok";
import { ayKaydir, gunDegeri } from "@/lib/donem";

/**
 * ============================================================================
 *  ENVANTER GELİŞİMİ — AY SONU FOTOĞRAFLARI (K117, 31.08.2026)
 * ----------------------------------------------------------------------------
 *  Kullanıcı isteği: "envanterin gelişimini gösteren bir grafik."
 *
 *  ── ⛔ BU GÖVDE PAHALI VE ÖLÇÜLDÜ ──────────────────────────────────────
 *  Canlı ölçüm (31.08.2026): 12 fotoğraf **2950 ms**, fotoğraf başına
 *  ~246 ms. Panelin her açılışına 3 saniye eklenemez — bu yüzden gövde
 *  YALNIZ envanter sekmesi açıkken çağrılır. Sekme seçimi adreste durduğu
 *  için bu, sunucuda kendiliğinden olur: öteki sekmelerde hiç çalışmaz.
 *
 *  ── ⛔ İKİNCİ BİR FIFO YAZILMADI ───────────────────────────────────────
 *  "Hareketleri bir kez çekip 12 fotoğrafı bellekte üret" daha hızlı olurdu
 *  ama FIFO kuralının İKİNCİ bir gövdesini doğururdu; biri düzeltilip öteki
 *  unutulunca envanter grafiği ile stok ekranı sessizce ayrışırdı.
 *  Hız için doğruluk bırakılmaz. _(Anayasa: aynı kural iki gövdede yaşamaz.)_
 *
 *  ── ⚠ SINIR AYIN İLK ANI, SON ANI DEĞİL ───────────────────────────────
 *  `acikPartilerToplu(sınır)` `lt` kullanıyor: "o günün BAŞLANGICI itibarıyla".
 *  Ağustos fotoğrafı için 1 EYLÜL veriyoruz — 31 Ağustos verseydik ayın son
 *  gününün hareketleri fotoğrafın DIŞINDA kalırdı.
 *  _(29.08'de FIFO sınırında tam bu hata yaşandı: `lt` yerinde kaldı, sınırın
 *  DEĞERİ gün sonuna taşındı.)_
 * ============================================================================
 */

export type EnvanterAyi = {
  yil: number;
  /** 1-12. */
  ay: number;
  /** Ay sonundaki mal bedeli (KDV HARİÇ DEĞİL — ödenen tutar). */
  deger: number;
  /** Ay sonunda elde duran toplam adet. */
  adet: number;
  /**
   * Maliyeti BİLİNMEYEN parti adedi — değere GİRMEZ ve ekranda ayrı yazar.
   *
   * ⛔ K116③ ŞARTI: bilinmeyen sıfır sayılıp toplama karışmaz. Karışsaydı
   * envanter olduğundan düşük görünür ve düşüşün sebebi görünmezdi.
   */
  bilinmeyenAdet: number;
};

export async function envanterSerisi(
  sonAy: { yil: number; ay: number },
  ayAdedi: number,
): Promise<EnvanterAyi[]> {
  const sonuc: EnvanterAyi[] = [];

  for (let i = ayAdedi - 1; i >= 0; i--) {
    const { yil, ay } = ayKaydir(sonAy.yil, sonAy.ay, -i);
    /** ⚠ BİR SONRAKİ ayın 1'i — `lt` sınırı ayın tamamını içeri alsın diye. */
    const sonrakiAy = ayKaydir(yil, ay, 1);
    const sinir = gunDegeri({
      yil: sonrakiAy.yil,
      ay: sonrakiAy.ay,
      gun: 1,
    });

    const harita = await acikPartilerToplu(prisma, null, sinir);

    let deger = 0;
    let adet = 0;
    let bilinmeyenAdet = 0;
    for (const partiler of harita.values()) {
      for (const p of partiler) {
        adet += p.kalanAdet;
        if (p.birimMaliyet === null) {
          bilinmeyenAdet += p.kalanAdet;
          continue;
        }
        deger += p.kalanAdet * Number(p.birimMaliyet);
      }
    }

    sonuc.push({ yil, ay, deger, adet, bilinmeyenAdet });
  }

  return sonuc;
}
