import { gunDegeri, isTakvimGunu } from "@/lib/donem";

/**
 * ============================================================================
 *  TARİFE PENCERESİ KAPSAMI — SAF KURAL (K47, 25.08.2026)
 * ----------------------------------------------------------------------------
 *  Trendyol her Salı, Hepsiburada her Çarşamba komisyon tarifesi yayımlıyor.
 *  Tam dilimli ileri tarife **arşivden inmiyor**: o hafta indirilmezse bir
 *  daha elde edilemez ve o dönemin satışlarında `Fiyat dene` hüküm veremez.
 *
 *  ⚠ HATIRLATMA TELEFONA DEĞİL SİSTEME KONDU. Pano `kalıcı telefon
 *  hatırlatıcısı` diyordu; anayasa bunu reddediyor — _"bir insanın
 *  dikkatine bel bağlayan doğrulama, doğrulama değildir."_ Pencerelerin
 *  bitiş tarihi zaten veritabanında; sistem bunu KENDİSİ bilebiliyor.
 *
 *  ⚠ KAPSAM DAR TUTULDU — YALNIZ TARİFESİ OLAN KANALLAR. Ölçüt _"aktif
 *  kanal"_ olsaydı Hepsiburada **sonsuza kadar kırmızı** yanardı: HB'nin
 *  hiç tarifesi yok ve indirme rutini de kurulmadı. Anayasa: _"sonsuza
 *  kadar yanan uyarı olmaz"_ — sönmeyen uyarı okunmaz olur ve rozetin
 *  tamamına olan güveni götürür.
 *
 *  Ve bu bir yokluk iddiası değil: mekanizma o kanalda hiç çalışmadıysa
 *  _"kaydı yok"_ hüküm sayılmaz (_"yeni izin doğum tarihi beyan edilir"_).
 *  HB tarifesi bir kez yüklendiği gün kanal kendiliğinden bu kümeye girer.
 * ============================================================================
 */

/** Bir kanalın EN GEÇ biten tarife penceresi. */
export type KanalPenceresi = {
  kanalAdi: string;
  /** O kanalda yüklü pencerelerin en geç bitişi. */
  sonBitis: Date;
};

/**
 * EŞİK — kaç gün kala uyarılsın.
 *
 * ⚠ SAYI VERİDEN GELİYOR, "makul görünen" bir yuvarlaktan değil: Trendyol
 * penceresi **5 günlük** (`14–18.08` · `21–25.08`, ikisi de Pzt–Cum) ve
 * yayım günü Salı. Yani dosya, yürürlükteki pencere bitmeden **3 gün önce**
 * yayımlanıyor. Eşik 3'ten küçük olsaydı uyarı, dosya çoktan indirilebilir
 * hâldeyken susardı; büyük olsaydı dosya HENÜZ YOKKEN yanar ve kullanıcı
 * yapamayacağı bir iş için uyarılırdı.
 */
export const UYARI_GUNU = 3;

export type TarifeKapsami = {
  /** Bugünü kapsayan penceresi OLMAYAN kanal sayısı — görev satırının sayısı. */
  kapsamsizKanal: number;
  /** Kapsamı olanlar arasında en yakın bitişe kaç gün kaldı. `null` = hiç kapsam yok. */
  kalanGun: number | null;
  /** Kapsamsız kanalların adları — ekran hangisi olduğunu söyleyebilsin. */
  kapsamsizAdlar: string[];
};

/**
 * KAPSAM HESABI.
 *
 * ⚠ GÜN FARKI TAKVİM GÜNÜNDEN, MİLİSANİYEDEN DEĞİL. `sonBitis` veritabanında
 * UTC gece yarısı damgalı; `bugun` ise İstanbul iş günü. İkisini ham
 * `getTime()` farkıyla bölseydik 3 saatlik kayma bir günü yanlış kovaya
 * düşürürdü — anayasadaki komisyon denetimi vakasının aynısı (rapor `28-07`
 * diyordu, çıktı `2026-07-27` yazdı).
 */
export function tarifeKapsami(
  pencereler: readonly KanalPenceresi[],
  an: Date,
): TarifeKapsami {
  const bugun = gunDegeri(isTakvimGunu(an));
  const gun = 86_400_000;

  const kapsamsizAdlar: string[] = [];
  const kalanlar: number[] = [];

  for (const p of pencereler) {
    const bitis = gunDegeri(isTakvimGunu(p.sonBitis));
    /**
     * ⚠ BİTİŞ GÜNÜ DAHİL. Pencere `21–25.08` ise 25.08 hâlâ kapsanıyor;
     * `<` yazsaydık son gün kapsamsız sayılır ve uyarı bir gün erken
     * kırmızıya dönerdi.
     */
    const kalan = Math.round((bitis.getTime() - bugun.getTime()) / gun);
    if (kalan < 0) kapsamsizAdlar.push(p.kanalAdi);
    else kalanlar.push(kalan);
  }

  return {
    kapsamsizKanal: kapsamsizAdlar.length,
    kalanGun: kalanlar.length > 0 ? Math.min(...kalanlar) : null,
    kapsamsizAdlar,
  };
}

/**
 * SATIR UYARI RENGİ HAK EDİYOR MU?
 *
 * ⚠ SIFIR SAYI + YAKIN BİTİŞ = YİNE DE UYARI. Görev kutusunun genel kuralı
 * _"sayı 0 ise temiz ✓"_; burada o kural tek başına yanlış cevap verirdi:
 * pencere bugün bitiyorsa sayı hâlâ 0'dır (bugün kapsanıyor) ama iş
 * BEKLİYOR. Anayasa: _"yanlış cevap veren ekran"_.
 */
export function tarifeUyarisiVarMi(kapsam: TarifeKapsami): boolean {
  if (kapsam.kapsamsizKanal > 0) return true;
  return kapsam.kalanGun !== null && kapsam.kalanGun <= UYARI_GUNU;
}
