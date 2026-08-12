/**
 * ============================================================================
 *  KOMİSYON BANDI — FİİLEN ÖDENEN ORAN
 * ----------------------------------------------------------------------------
 *  Kanal kodlarına elle oran girilirken tek dayanak kullanıcının hafızasıydı.
 *  Oysa hakediş dosyaları GERÇEKTEN ÖDENMİŞ komisyonu taşıyor: sipariş
 *  tutarı ve komisyon tutarı yan yana duruyor, oran ikisinden çıkıyor.
 *
 *  BU BİR ÖNERİ DEĞİL, BİR BANTTIR. Ürün eşleşmesi gerektirmez ve
 *  gerektirmemesi bilinçlidir: hakediş kalemi hangi ürün olduğunu söylemez,
 *  yalnız hangi SİPARİŞ olduğunu söyler. Çok kalemli bir siparişin oranı
 *  ürünlere bölünemez — %17 ve %23'lük iki ürün %20 gösterir ve ikisine de
 *  yanlış yazılır. Bu yüzden burada ÜRÜN BAZINDA ÖNERİ ÜRETİLMEZ; yalnız
 *  "bu kanalda fiilen şu bantta ödüyorsunuz" denir.
 *  (Ürün bazlı öneri motoru ertelendi — bkz. BEKLEYENLER.)
 *
 *  MEDYAN VAR, ORTALAMA YOK: tek bir kampanyalı sipariş ortalamayı çeker,
 *  medyanı çekmez. Bandın orta değeri "tipik olarak ne ödüyorum" sorusunun
 *  cevabıdır.
 *
 *  SAF HESAP: veritabanına gitmez, kalemler dışarıdan verilir.
 * ============================================================================
 */

/** Bandı besleyen tek hakediş kalemi. */
export type BantKalemi = {
  /** Hangi kanal hesabı. */
  channelAccountId: string;
  /** Sipariş numarası — komisyon ve tutar bununla eşleşir. */
  siparisNo: string | null;
  /** KOMISYON ya da SIPARIS_TUTARI. Diğerleri yok sayılır. */
  kod: string;
  /** İşaretli tutar; mutlak değeri alınır. */
  tutar: number;
};

export type KomisyonBandi = {
  channelAccountId: string;
  /** Bandı kaç sipariş besliyor. */
  siparisSayisi: number;
  /** Yüzde: 17.72 — GÖRÜLEN en düşük/en yüksek, uç değerler dahil. */
  enDusuk: number;
  enYuksek: number;
  medyan: number;
  /**
   * UYARI ARALIĞI — %10 ve %90 dilimleri.
   *
   * Neden min–maks kullanılmıyor: canlı veride bant %2,40–%26,45 çıktı
   * (13.08.2026 ölçümü). Bu kadar geniş bir aralık hiçbir şeyi yakalamaz —
   * "%2 yerine %20 yazdım" hatası bandın İÇİNDE kalır ve uyarı çıkmaz.
   * Uç değerler kampanyalı siparişlerden gelir ve gerçektir; silinmezler,
   * ama uyarının eşiği olmazlar. Ekranda min–maks GÖSTERİLİR, uyarı bu
   * dar aralığa göre verilir.
   */
  uyariAlt: number;
  uyariUst: number;
};

/** Bant için en az kaç sipariş gerekir. */
export const EN_AZ_SIPARIS = 3;

/**
 * Oranın makul olduğu üst sınır (%). Bunun üstü veri hatasıdır:
 * komisyon sipariş tutarını aşamaz. Bandı bozmasın diye dışarıda bırakılır.
 */
const UST_SINIR = 100;

function medyanHesapla(sirali: number[]): number {
  const n = sirali.length;
  if (n === 0) return 0;
  const orta = Math.floor(n / 2);
  // Çift sayıda gözlemde iki ortancanın ortalaması alınır.
  return n % 2 === 1 ? sirali[orta] : (sirali[orta - 1] + sirali[orta]) / 2;
}

/**
 * Sıralı dizinin yüzdelik dilimi. `oran` 0-1 arası (0.1 = %10'luk dilim).
 * En yakın gözleme yuvarlar — az sayıda gözlemde ara değer uydurmaz.
 */
function dilim(sirali: number[], oran: number): number {
  if (sirali.length === 0) return 0;
  const konum = Math.round((sirali.length - 1) * oran);
  return sirali[Math.min(Math.max(konum, 0), sirali.length - 1)];
}

/**
 * Hakediş kalemlerinden kanal hesabı başına komisyon bandı.
 *
 * SİPARİŞ BAŞINA TEK GÖZLEM: aynı siparişte birden fazla komisyon satırı
 * olabilir (kalem başına kesilmişse); hepsi toplanır ve tek oran üretir.
 * Satır başına gözlem alsaydık çok kalemli siparişler bandı domine ederdi.
 */
export function komisyonBandi(kalemler: BantKalemi[]): KomisyonBandi[] {
  // (hesap, sipariş) -> { komisyon, tutar }
  const siparisler = new Map<
    string,
    { hesap: string; komisyon: number; tutar: number }
  >();

  for (const k of kalemler) {
    if (k.siparisNo === null || k.siparisNo === "") continue;
    if (k.kod !== "KOMISYON" && k.kod !== "SIPARIS_TUTARI") continue;

    const anahtar = `${k.channelAccountId}|${k.siparisNo}`;
    const kayit = siparisler.get(anahtar) ?? {
      hesap: k.channelAccountId,
      komisyon: 0,
      tutar: 0,
    };
    // İşaret dosyaya göre değişiyor (kesinti negatif gelir); oran için
    // mutlak değer kullanılır.
    if (k.kod === "KOMISYON") kayit.komisyon += Math.abs(k.tutar);
    else kayit.tutar += Math.abs(k.tutar);
    siparisler.set(anahtar, kayit);
  }

  const oranlar = new Map<string, number[]>();
  for (const kayit of siparisler.values()) {
    // İkisi de olmayan sipariş oran vermez — sıfır SAYILMAZ, atlanır.
    if (kayit.komisyon <= 0 || kayit.tutar <= 0) continue;

    const oran = (kayit.komisyon / kayit.tutar) * 100;
    if (!Number.isFinite(oran) || oran > UST_SINIR) continue;

    const liste = oranlar.get(kayit.hesap) ?? [];
    liste.push(oran);
    oranlar.set(kayit.hesap, liste);
  }

  const sonuc: KomisyonBandi[] = [];
  for (const [hesap, liste] of oranlar) {
    // AZ GÖZLEMDEN BANT ÇIKARILMAZ: iki siparişten "bant" demek, iki
    // noktadan eğri geçirmektir.
    if (liste.length < EN_AZ_SIPARIS) continue;

    const sirali = [...liste].sort((a, b) => a - b);
    sonuc.push({
      channelAccountId: hesap,
      siparisSayisi: sirali.length,
      enDusuk: sirali[0],
      enYuksek: sirali[sirali.length - 1],
      medyan: medyanHesapla(sirali),
      uyariAlt: dilim(sirali, 0.1),
      uyariUst: dilim(sirali, 0.9),
    });
  }

  return sonuc.sort((a, b) => b.siparisSayisi - a.siparisSayisi);
}

/**
 * Girilen oran bandın dışında mı?
 *
 * UYARIDIR, ENGEL DEĞİL (kullanıcı kararı 13.08.2026): kampanyalı ürünün
 * oranı bandın dışında olabilir ve bu meşrudur. Amaç yanlış tuşu yakalamak
 * — %2 yerine %20 yazmak gibi.
 */
export function bantDisiMi(oran: number, bant: KomisyonBandi): boolean {
  if (!Number.isFinite(oran)) return false;
  return oran < bant.uyariAlt || oran > bant.uyariUst;
}
