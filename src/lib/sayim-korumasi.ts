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
 * ============================================================================
 *  ISRAR — KAPALI SEBEP LİSTESİ
 * ----------------------------------------------------------------------------
 *  ⭐ ANAYASA: _"uyarı sorar, kullanıcı ısrar ederse istisna kaydedilir."_
 *  Ve şartları oradan geliyor: eşik yerinde kalır · onay HER SEFERİNDE
 *  istenir · sebep KAPALI KÜMEDEN · istisna İZ BIRAKIR.
 *
 *  ⛔ SEBEP NİYE KAPALI LİSTE: serbest metin üç ay sonra "bunu neden
 *  geçmiştik" sorusuna cevap vermiyor — herkes başka şey yazıyor ve
 *  sayılamıyor. Kapalı liste sayılabilir; hangi sebebin kaç kez geldiği
 *  kendi başına bilgidir (bir sebep sürekli geliyorsa kuralın kendisi
 *  yanlıştır).
 * ============================================================================
 */
export const SAYIM_ISRAR_SEBEPLERI = [
  /** Gerçekten olmuş bir mal kabulü, deftere geç giriliyor. */
  "GEC_GIRILEN_ALIM",
  /** Gerçekten olmuş bir satış, deftere geç giriliyor. */
  "GEC_GIRILEN_SATIS",
  /** Sayımın kendisi yanlıştı; kayıt doğru. */
  "SAYIM_HATALI",
  /** ⚠ AÇIKLAMA ZORUNLU — sebepsiz istisna, istisna değil kusurdur. */
  "DIGER",
] as const;
export type SayimIsrarSebebi = (typeof SAYIM_ISRAR_SEBEPLERI)[number];

export type SayimIsrari = {
  /** Kullanıcı kutuyu işaretledi mi — HER SEFERİNDE istenir. */
  onaylandi: boolean;
  sebep: SayimIsrarSebebi | null;
  /** `DIGER` seçildiyse zorunlu. */
  aciklama: string;
};

/**
 * ⭐ SAF: ısrar geçerli mi. Ekran bunu çağırır ve düğmeyi kilitler; sunucu
 * AYNI gövdeyi çağırır ve reddeder — iki yerde iki ölçüt olmaz.
 *
 * ⚠ VE SEBEP EKRANDA YAZAR (İlke #5): niye ilerlemediği ve nasıl
 * ilerleyeceği görünür; kilitli düğme sessiz kalmaz.
 */
export type IsrarKarari =
  | { gecerli: true }
  | { gecerli: false; eksik: "onay" | "sebep" | "aciklama" };

export function israrGecerliMi(i: SayimIsrari): IsrarKarari {
  if (!i.onaylandi) return { gecerli: false, eksik: "onay" };
  if (i.sebep === null) return { gecerli: false, eksik: "sebep" };
  /** ⚠ `DIGER` seçildiyse açıklama ZORUNLU — kapalı listenin kaçak deliği. */
  if (i.sebep === "DIGER" && i.aciklama.trim() === "") {
    return { gecerli: false, eksik: "aciklama" };
  }
  return { gecerli: true };
}

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
