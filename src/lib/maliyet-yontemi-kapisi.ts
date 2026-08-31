import type { MaliyetYontemi } from "@/lib/maliyet-yontemi";

/**
 * ============================================================================
 *  YÖNTEM DEĞİŞİMİ KAPISI — SAF KURAL (K115, 31.08.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ ISRAR, KİLİT DEĞİL. Kullanıcı kuralı: _"dönem sınırında ciddi uyarı +
 *  bilinçli onayla geçer; sert kilit yok."_ K108'in kapı·ısrar deseni aynen.
 *
 *  ⚠ NİYE KİLİT DEĞİL — VE BU DEPODA İKİ KEZ ÖLÇÜLDÜ: 29.08'de `soldAt`
 *  sınırı defterin %48,72'sini kilitleyecekti; aynı gün sayım korumasında
 *  geriye dönük 15 hareketin 15'i meşru çıktı. Mantıkla doğru görünen kısıt,
 *  veriyle sınanmadan yazılmaz. Karar firmanın, sorumluluk firmanın, kayıt
 *  sistemin.
 *
 *  ── ⭐ İLK KURULUM SERBEST, ISRAR DA YOK ───────────────────────────────
 *  Hiç stok hareketi olmayan firma henüz bir defter kurmamıştır; orada
 *  "geçmişi bölüyorsun" uyarısı yalan olurdu. Bölünecek geçmiş yok.
 *
 *  ── ⚠ İKİ AĞIRLIK AYRI — VE FARK ÖLÇÜLEBİLİR BİR OLAYA BAĞLI ──────────
 *  Uydurma bir eşik yok. Ayrım şu SOMUT olguya bakıyor: cari dönemde
 *  (bu ay) hareket VAR MI?
 *    · yoksa → ay temiz başlıyor, geçiş TEMİZ SINIRDA
 *    · varsa → aynı ay YARISI FIFO YARISI ORTALAMA olur; o defter
 *      muhasebeciye açıklanamaz
 *  _(Anayasa: "eşik fiziksel eylemin kendisine konur — uydurulmaz".)_
 *
 *  ⛔ GEÇMİŞ YENİDEN HESAPLANMAZ — hangi ağırlıkta olursa olsun. Değişim
 *  ileriye dönüktür; kapanmış dönemin NET'i olduğu gibi kalır, yoksa beyan
 *  edilmiş vergi tutmaz. Uyarı metni bunu SÖYLER.
 *
 *  ── ⚠ SAF: veritabanına gitmez, `new Date()` çağırmaz ───────────────────
 *  Sayılar çağırandan gelir; bekçi gövdeyi ÇAĞIRARAK ölçüyor.
 * ============================================================================
 */

export type YontemKapiGirdisi = {
  eski: MaliyetYontemi;
  yeni: MaliyetYontemi;
  /** Firmanın TOPLAM stok hareketi. 0 = defter hiç açılmamış. */
  toplamHareket: number;
  /** CARİ dönemdeki (bu ay) hareket sayısı — ayrımı bu belirliyor. */
  cariDonemHareketi: number;
};

export type YontemKapiKarari =
  /** Değişiklik yok — kapı hiç çalışmaz. */
  | { sonuc: "DEGISIKLIK_YOK" }
  /** İlk kurulum: defter boş, uyarılacak bir şey yok. */
  | { sonuc: "SERBEST"; sebep: "ILK_KURULUM" }
  /** Dönem temiz başlamış — geçiş sınırda, yine de onay istenir. */
  | { sonuc: "DURAKSA"; agirlik: "SINIRDA"; etkilenen: number }
  /** Cari dönemde hareket var — ay ikiye bölünür. */
  | { sonuc: "DURAKSA"; agirlik: "DONEM_ORTASI"; etkilenen: number };

export function yontemDegisimKarari(g: YontemKapiGirdisi): YontemKapiKarari {
  /**
   * ⚠ AYNI DEĞERE "DEĞİŞTİR" DEMEK BİR DEĞİŞİKLİK DEĞİLDİR. Kapıyı burada
   * kapatmazsak kullanıcı hiçbir şey değiştirmeden onay kutusu doldurmak
   * zorunda kalır ve uyarı anlamsızlaşır — her seferinde çıkan uyarı
   * okunmaz olur.
   */
  if (g.eski === g.yeni) return { sonuc: "DEGISIKLIK_YOK" };

  /**
   * ⭐ DEFTER HİÇ AÇILMAMIŞSA SERBEST. "Geçmişini bölüyorsun" demek yalan
   * olurdu; bölünecek geçmiş yok.
   */
  if (g.toplamHareket === 0) return { sonuc: "SERBEST", sebep: "ILK_KURULUM" };

  /**
   * ⚠ AĞIRLIK CARİ DÖNEME BAKIYOR — ve `etkilenen` her iki hâlde de
   * TOPLAM hareket. Uyarıdaki rakam "bundan sonra ne değişecek" değil,
   * "arkanda ne var" sorusunun cevabı: yöntem değişince o defter iki
   * farklı kuralla yazılmış olur.
   */
  if (g.cariDonemHareketi > 0) {
    return {
      sonuc: "DURAKSA",
      agirlik: "DONEM_ORTASI",
      etkilenen: g.cariDonemHareketi,
    };
  }
  return { sonuc: "DURAKSA", agirlik: "SINIRDA", etkilenen: g.toplamHareket };
}

/**
 * Israr sebepleri — KAPALI KÜME.
 *
 * ⚠ K108'in sebepleriyle AYNI DEĞİL ve bu bilinçli: dönem ısrarının
 * sebepleri kayıt yazmayla ilgili ("geç girilen kayıt"), buradakiler
 * YÖNTEM kararıyla ilgili. Aynı listeyi paylaşsalardı kullanıcı yöntem
 * değiştirirken "geç girilen kayıt" gibi ilgisiz bir sebep seçebilirdi ve
 * üç ay sonra o kayıt hiçbir şey anlatmazdı.
 */
export const YONTEM_ISRAR_SEBEPLERI = [
  /** Muhasebeci yöntem değişikliğini istedi/onayladı. */
  "MUHASEBECI_KARARI",
  /** İlk kurulumda yanlış yöntem seçilmişti. */
  "YANLIS_KURULMUSTU",
  /** Mevzuat ya da beyan gereği. */
  "MEVZUAT_GEREGI",
  /** ⚠ AÇIKLAMA ZORUNLU — sebepsiz istisna, istisna değil kusurdur. */
  "DIGER",
] as const;
export type YontemIsrarSebebi = (typeof YONTEM_ISRAR_SEBEPLERI)[number];

/** İz eylemi — `AuditLog.action`. */
export const YONTEM_DEGISTI_EYLEMI = "MALIYET_YONTEMI_DEGISTI";
