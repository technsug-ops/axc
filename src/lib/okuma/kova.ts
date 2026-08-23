/**
 * ============================================================================
 *  DEPO OKUMASI — KOVA KURALLARI (K34a)
 * ----------------------------------------------------------------------------
 *  Kullanıcı 23.08.2026: _"Depoda paketlerken barkod okutulur, sistem o
 *  barkod hakkında NE BİLDİĞİNİ gösterir. UYARI YOK · ONAY KAPISI YOK ·
 *  İSTİSNA KAYDI YOK · HİÇBİR ŞEY ENGELLENMEZ."_
 *
 *  ⚠ UYARISIZLIK BİR EKSİKLİK DEĞİL, TASARIM KARARI. Kontrol katmanı (K34)
 *  EKSİK DEFTERİN üstünde çalışırdı: ağustosta kümenin %72'si sistemde yok.
 *  Uyarı çoğunlukla HAKLI OLARAK çalar, kullanıcı her seferinde geçer ve iki
 *  haftada uyarıyı OKUMADAN tıklamayı öğrenir. Burada geçilecek kapı
 *  olmadığı için o alışkanlık doğamaz.
 *
 *  ASIL DEĞERİ ÖLÇÜM: kanaldan da sistemden de bağımsız ÜÇÜNCÜ bir kapsam
 *  kaydı — Aras'ın TY sayacını doğrulaması gibi.
 * ============================================================================
 */

/**
 * DÖRT KOVA — VE BU BİR DENETİM ÇERÇEVESİDİR.
 *
 * Anayasa: _"Boş sonuç ile temiz sonucu ayırt edemeyen denetim, denetim
 * değildir"_ — her denetim aracı incelenen · temiz · sapan · İNCELENEMEYEN
 * sayılarını AYRI yazar. Kovalar birebir o çerçeve:
 *
 *  - `ACIK_SIPARISTE_VAR` → temiz : kod tanındı, kargoya verilmemiş siparişte var
 *  - `ACIK_SIPARISTE_YOK` → sapan : kod tanındı, açık siparişte YOK
 *                                   (satış girilmemiş olabilir — defter/A3)
 *  - `ESLESTIRILDI`       → sapan : kod tanınmadı, kullanıcı ürünü GÖSTERDİ
 *  - `BILINMEYEN`   → İNCELENEMEDİ : kod tanınmadı, ürün de gösterilmedi
 *
 * ⚠ ÜÇÜNCÜ KOVANIN ADI BİR EYLEMDİR, BİR HÜKÜM DEĞİL — mimar düzeltmesi
 * 23.08.2026. Adı bir ara `BASKA_BARKOD` idi; o ad "EAN tutmuyor" hükmünü
 * kovanın İÇİNE gömüyordu. Oysa kullanıcının yaptığı tek şey EŞLEŞTİRMEDİR
 * ("okuttuğum kod bu ürüne ait"). Eşleşmeyen okumanın sebebi en az üç ayrı
 * şey olabilir:
 *   · ürün gerçekten kayıtlı EAN'dan farklı barkod taşıyor  → K35
 *   · kayıtta EAN yanlış girilmiş                           → veri düzeltmesi
 *   · farklı parti/tedarikçi farklı EAN'la gelmiş           → tedarik tarafı
 * Kovaya "EAN tutmuyor" deseydik rapor üç ay sonra _"K35 gerekçesi: N vaka"_
 * derdi ve kimse kaçının veri hatası olduğunu SORMAZDI. Sebep alanı ayrıca
 * açıldı ve BOŞ bırakılıyor (bkz. `kayit.ts`): vaka biriktiğinde desen
 * kendisi çıkar, hüküm o zaman verilir.
 *
 * ⚠ `BILINMEYEN` BİR BULGU DEĞİLDİR. "Bu ürün katalogda yok" demek için
 * elimizde kanıt yoktur: okunan kod tanınmadıysa, ELDEKİ MALIN katalogda
 * başka bir barkodla durup durmadığını kod tek başına söyleyemez. Bu yüzden
 * hüküm kümesinin DIŞINDA sayılır ve ekranda öyle yazar.
 */
export const OKUMA_KOVALARI = [
  "ACIK_SIPARISTE_VAR",
  "ACIK_SIPARISTE_YOK",
  "ESLESTIRILDI",
  "BILINMEYEN",
] as const;

export type OkumaKovasi = (typeof OKUMA_KOVALARI)[number];

/**
 * KOVA `AuditLog.action`DA YAŞAR — YENİ TABLO AÇILMADI.
 *
 * Anayasa merdiveni (_"şema değişikliği en pahalı çözümdür"_) birinci
 * basamakta durdu: `action` indeksli (kova sayımı), `createdAt` indeksli
 * (hafta penceresi), `targetType/targetId` varyantı taşıyor, `detail`
 * yapılandırılmış kaydı, `userId` kimin okuttuğunu. Haftalık özet bunların
 * üstünde bir gruplamadır; migration · canlı koşum · damga · onay bedeli
 * tamamen gereksizdi. (K2'nin `KomisyonYuklemesi` vakasıyla aynı karar.)
 */
export const OKUMA_EYLEM_ONEKI = "OKUMA_";

export function kovaEylemi(kova: OkumaKovasi): string {
  return `${OKUMA_EYLEM_ONEKI}${kova}`;
}

export function eylemKovasi(eylem: string): OkumaKovasi | null {
  return OKUMA_KOVALARI.find((k) => kovaEylemi(k) === eylem) ?? null;
}

/**
 * İLK OKUMANIN KOVASI — üç sonuçtan biri.
 *
 * ⚠ `ESLESTIRILDI` BURADAN ÇIKAMAZ ve bu bilerek. Okunan kod tanınmadığında
 * elimizdeki tek bilgi kodun kendisidir; malın katalogda başka bir barkodla
 * durup durmadığını yalnız KUTUYU ELİNDE TUTAN kişi söyleyebilir. Bu yüzden
 * o kova ancak kullanıcı ürünü elle gösterirse doğar.
 */
export function ilkKova(girdi: {
  bulunduMu: boolean;
  acikSiparisVar: boolean;
}): OkumaKovasi {
  if (!girdi.bulunduMu) return "BILINMEYEN";
  return girdi.acikSiparisVar ? "ACIK_SIPARISTE_VAR" : "ACIK_SIPARISTE_YOK";
}

/**
 * Kullanıcı, tanınmayan bir okumadan sonra ürünü gösterirse kova yükselir:
 * `BILINMEYEN` → `ESLESTIRILDI`. Yani "bilmiyoruz" cevabı "biliyoruz"a döner.
 *
 * ⚠ SADECE BU YÖN. Tanınmış bir okuma elle bozulamaz; eşleştirme yalnız
 * hüküm verilemeyeni hükme çevirir.
 */
export function eslestirilebilirMi(kova: OkumaKovasi): boolean {
  return kova === "BILINMEYEN";
}

export type KovaSayimi = Record<OkumaKovasi, number>;

export function bosSayim(): KovaSayimi {
  return {
    ACIK_SIPARISTE_VAR: 0,
    ACIK_SIPARISTE_YOK: 0,
    ESLESTIRILDI: 0,
    BILINMEYEN: 0,
  };
}

export function kovalariSay(eylemler: string[]): KovaSayimi {
  const sayim = bosSayim();
  for (const eylem of eylemler) {
    const kova = eylemKovasi(eylem);
    if (kova) sayim[kova] += 1;
  }
  return sayim;
}

export function toplamOkuma(sayim: KovaSayimi): number {
  return OKUMA_KOVALARI.reduce((t, k) => t + sayim[k], 0);
}

/**
 * HÜKÜM VERİLEBİLEN OKUMA SAYISI — `BILINMEYEN` hariç.
 *
 * ⚠ TEK "BULUNAMADI" RAKAMI BASILMAZ (kullanıcı talimatı ⑤). `BILINMEYEN`
 * ile `ESLESTIRILDI` tek kefeye konsaydı katalog boşluğu ile etiket
 * uyuşmazlığı aynı sayıya karışır ve o sayı ÜÇ ayrı işe birden gerekçe
 * sayılırdı.
 */
export function hukumluOkuma(sayim: KovaSayimi): number {
  return toplamOkuma(sayim) - sayim.BILINMEYEN;
}

/**
 * PAYDA TOPLAM OKUMADIR VE BU EKRANDA YAZAR.
 *
 * Anayasa: _"payda, ölçmesi kolay olandan değil BOZULAN KARARDAN seçilir"_.
 * Burada bozulan karar şu: _"depoda paketlediğim malların ne kadarını sistem
 * tanıyor"_ — paydası paketlenen mal, yani her okuma. `BILINMEYEN`i paydadan
 * düşmek oranları yapay olarak güzelleştirirdi; onun payı da bilginin ne
 * kadarının belirsiz kaldığını ölçen bir rakamdır.
 */
export function kovaYuzdesi(
  sayim: KovaSayimi,
  kova: OkumaKovasi,
): number | null {
  const toplam = toplamOkuma(sayim);
  if (toplam === 0) return null;
  return (sayim[kova] * 100) / toplam;
}
