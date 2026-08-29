/**
 * ============================================================================
 *  SAYIM KORUMASI — SAF KURAL
 * ----------------------------------------------------------------------------
 *  ⭐ ANAYASA: **FİZİKSEL SAYIM SON SÖZDÜR.** Kayıttan türetilen hiçbir
 *  değer, sayılmış bir stoğu SESSİZCE ezemez.
 *
 *  ⛔ 29.08.2026: Halil 7 saat fiziksel sayım yaptı; sonraki Excel
 *  aktarımları stoğu bozdu. Kimse hata yapmadı — **sistem hangi kaynağın
 *  üstün olduğunu hiç söylememişti.** Bu bir tasarım kusuruydu.
 *
 *  ── YASAK DEĞİL, DURAKSAMA ──────────────────────────────────────────────
 *  Tam yasak ölçümle ELENDİ: sayımdan sonra yazılan 15 geriye dönük
 *  hareketin **hepsi `PURCHASE_IN`** — yani geç girilen, gerçekten olmuş
 *  mal kabulleri. Yasaklasaydık çalışan bir işi kilitlerdik.
 *  _(Aynı gün `sinir` kararında da bu tuzağa düşülüyordu: `soldAt` sınırı
 *  defterin %48,72'sini kilitleyecekti.)_
 *
 *  ── ⭐ YÖN AYRIMI: SERTLİK AYNI, GEREKÇE FARKLI ─────────────────────────
 *  "Artıran geç kayıt hafif olsun mu?" diye soruldu. **HAYIR — ölçüldü ve
 *  gerekçesi fizikseldir:**
 *
 *   · DÜŞÜREN (satış · içe aktarma · eksi düzeltme): sayılmış malı YOK
 *     EDER. Rafta vardı, defterden siliniyor.
 *   · ARTIRAN (geç girilen alım): mal sayım sırasında raftaysa **SAYAN
 *     KİŞİ ONU ZATEN SAYDI**; geriye dönük alım aynı malı **İKİNCİ KEZ**
 *     ekler ve stok ŞİŞER.
 *
 *  İkisi de sayımı geçersiz kılar; ikisi de duraksatır. Değişen tek şey
 *  kullanıcıya SÖYLENEN CÜMLEDİR — çünkü yapması gereken kontrol farklı.
 *
 *  ⚠ VE ÖRNEKLEM DAR: bugünden önce sistemde yalnız birkaç sayım vardı,
 *  o yüzden "yalnız alım geriye dönüyor" gözlemi **zayıf tabanlıdır**.
 *  Kural bu gözleme değil, FİZİKSEL gerekçeye dayanıyor.
 * ============================================================================
 */

export type SayimKorumaKarari =
  /** Sayım damgası yok ya da hareket sayımdan sonra — serbest. */
  | { sonuc: "SERBEST" }
  /** Sayımdan öncesine yazılıyor — kullanıcıya sorulmadan yazılamaz. */
  | {
      sonuc: "DURAKSA";
      yon: "ARTIRAN" | "DUSUREN";
      /** Kullanıcıya gösterilecek sebep anahtarı (metin sözlükten gelir). */
      sebep: "sayimSonrasiDusuren" | "sayimSonrasiArtiran";
      sayimTarihi: Date;
      hareketIsTarihi: Date;
    };

export type SayimKorumaGirdisi = {
  /** Varyantın SON sayımının İŞ TARİHİ. Sayılmamışsa null. */
  sonSayimIsTarihi: Date | null;
  /** Yazılacak hareketin iş tarihi. */
  hareketIsTarihi: Date;
  /** Yazılacak adet — işareti yönü belirler. */
  adet: number;
};

/**
 * ⭐ SAF: veritabanına gitmez, saat okumaz. Değerle sınanır.
 *
 * ⚠ SINIR GÜNÜN KENDİSİDİR, GÜN SONU DEĞİL: sayım günü YAPILAN bir satış
 * sayımdan önce de sonra da olabilir ve bunu bilemeyiz. Aynı güne yazılan
 * hareket SERBEST bırakılır — yoksa sayım gününün tamamı kilitlenirdi.
 * _(FIFO `sinir` kararının kardeşi ama TERS yönde: orada aynı gün İÇERİDE
 * kalmalıydı, burada aynı gün SERBEST kalmalı.)_
 */
export function sayimKorumasi(g: SayimKorumaGirdisi): SayimKorumaKarari {
  if (g.sonSayimIsTarihi === null) return { sonuc: "SERBEST" };
  if (g.adet === 0) return { sonuc: "SERBEST" };
  if (g.hareketIsTarihi >= g.sonSayimIsTarihi) return { sonuc: "SERBEST" };

  const yon = g.adet > 0 ? "ARTIRAN" : "DUSUREN";
  return {
    sonuc: "DURAKSA",
    yon,
    sebep: yon === "ARTIRAN" ? "sayimSonrasiArtiran" : "sayimSonrasiDusuren",
    sayimTarihi: g.sonSayimIsTarihi,
    hareketIsTarihi: g.hareketIsTarihi,
  };
}
