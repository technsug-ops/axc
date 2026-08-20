/**
 * ============================================================================
 *  "BUGÜN NE YAPMALIYIM" — SAF TANIM
 * ----------------------------------------------------------------------------
 *  Beş sayı, beşi de mevcut veriden. Her biri TIKLANABİLİR ve kendi süzülü
 *  listesine gider — sayıyı görüp "nerede bunlar?" diye aramak zorunda
 *  kalmak, sayının işe yaramaması demektir (İlke #9).
 *
 *  AÇIK SIFIR (13.08.2026 dersi, burada da geçerli): sayı 0 ise satır
 *  GİZLENMEZ, "temiz ✓" yazar. Satırın yokluğundan "temiz" sonucunu
 *  çıkarmak imkânsızdır — kullanıcı onu "ekran bozuk" diye okur.
 *
 *  YETKİ AYRIMI (mimar kuralı 14.08.2026): buradaki sayıların hepsi
 *  OPERASYONELDİR ve `satis.kar.gor` İSTEMEZ. Kâr/oran sayıları bu kutuya
 *  girmez; onlar panelin para bloklarında ve o bloklar izne bağlı.
 *  Karıştırılırsa depocuya kâr sızar.
 *
 *  Sayılar burada HESAPLANMAZ — sorgu sayfada, tanım burada. Bu dosya
 *  "hangi satır hangi adrese gider ve ne zaman temiz sayılır" sorusunun
 *  tek kaynağı; `panel:dogrula` bunu sınıyor.
 * ============================================================================
 */

export const GOREV_ANAHTARLARI = [
  /** `shippedAt` boş satışlar — bugün kargoya verilecekler. */
  "kargoBekleyen",
  /** Mal yolda ya da karar bekleyen iade bildirimleri. */
  "iadeBildirimi",
  /** `ORDERED` / `PARTIAL` alımlar — mal kabul bekliyor. */
  "malKabulBekleyen",
  /** `NO_COST` / `RULE_MISSING` satışlar — kârı hesaplanamadı. */
  "karHesaplanamayan",
  /** Komisyon oranı boş kanal SKU'lar. */
  "oransizKanalSku",
  /**
   * BUGÜN GİRİLEN ALIM SAYISI — kullanıcı isteği 20.08.2026:
   * _"burası da günlük bir emek"_.
   *
   * ⚠ BU BİR SAYAÇ, BEKLEYEN İŞ DEĞİL. Yapılmış işi sayar; bekleyen
   * rozetine GİRMEZ ve sıfırı "temiz" DEĞİLDİR (bkz. `GOREV_TURU`).
   */
  "bugunAlim",
] as const;

export type GorevAnahtari = (typeof GOREV_ANAHTARLARI)[number];

/**
 * ── İKİ KART, İKİ FARKLI EMEK ────────────────────────────────────────────
 * Kullanıcı isteği 20.08.2026: tek kutu iki ayrı işi karıştırıyordu.
 *   · `SEVKIYAT` — müşteriye giden taraf: paket çıkacak, iade gelecek.
 *   · `TEDARIK`  — mal ve kayıt tarafı: mal kabul, kâr/oran eksikleri,
 *                  bugün girilen alım.
 * Ayrım keyfi değil: ikisi günün farklı saatlerinde ve çoğu zaman farklı
 * kişilerce yapılıyor. Tek kutuda toplanınca "hangisi benim işim" sorusu
 * her bakışta yeniden soruluyordu.
 */
export const GOREV_GRUPLARI = ["SEVKIYAT", "TEDARIK"] as const;
export type GorevGrubu = (typeof GOREV_GRUPLARI)[number];

export const GOREV_GRUBU: Record<GorevAnahtari, GorevGrubu> = {
  kargoBekleyen: "SEVKIYAT",
  iadeBildirimi: "SEVKIYAT",
  malKabulBekleyen: "TEDARIK",
  karHesaplanamayan: "TEDARIK",
  oransizKanalSku: "TEDARIK",
  bugunAlim: "TEDARIK",
};

/**
 * ⚠ BEKLEYEN İŞ İLE SAYAÇ AYRI ŞEYDİR.
 *
 * `BEKLEYEN` — yapılmamış iş. Sıfırı **iyi haberdir** ("temiz ✓") ve
 * rozetteki toplama girer.
 * `SAYAC` — yapılmış işin adedi. Sıfırı iyi haber DEĞİL, sadece "bugün
 * henüz yok" demektir; rozete girerse "26 bekleyen" yalan olur.
 *
 * Bu ayrım olmadan tek bir sayı eklemek, kutunun başlığındaki sözü bozardı.
 */
export const GOREV_TURU: Record<GorevAnahtari, "BEKLEYEN" | "SAYAC"> = {
  kargoBekleyen: "BEKLEYEN",
  iadeBildirimi: "BEKLEYEN",
  malKabulBekleyen: "BEKLEYEN",
  karHesaplanamayan: "BEKLEYEN",
  oransizKanalSku: "BEKLEYEN",
  bugunAlim: "SAYAC",
};

/**
 * Her görevin süzülü hedefi — sayı tıklanınca buraya gider.
 *
 * ADRES, SAYIYI ÜRETEN KOŞULUN AYNISINI TAŞIMALI (15.08.2026 düzeltmesi).
 * Önce `malKabulBekleyen` ORDERED **ve** PARTIALLY_RECEIVED sayıyor ama
 * bağlantı `?durum=ORDERED`e gidiyordu: panel 5 diyor, liste 4 gösteriyordu.
 * Panelin en temel sözü "sayı = liste"dir; tutmayan sayı, panele olan
 * güveni tek seferde bitirir.
 * `iadeBildirimi` de süzgeçsiz `/iadeler`e gidiyordu — orada KAPANMIŞ
 * bildirimler de listeleniyor, sayı ile liste ayrışıyordu.
 */
export const GOREV_ADRESLERI: Record<GorevAnahtari, string> = {
  kargoBekleyen: "/satislar?kargo=bekleyen",
  iadeBildirimi: "/iadeler?bekleyen=1",
  malKabulBekleyen: "/alimlar?durum=BEKLEYEN",
  karHesaplanamayan: "/satislar?kar=eksik",
  oransizKanalSku: "/kanal-sku?eksik=1",
  /**
   * ⚠ ADRES ÖLÇÜLDÜ, UYDURULMADI. İlk yazdığım `?tarih=bugun` diye bir
   * süzgeç YOK — alım listesi `pencere` parametresi okuyor ve kabul ettiği
   * değerler `LISTE_PENCERELERI`de sabit (`BUGUN` dahil). Var olmayan bir
   * adrese götüren sayı, sayının kendisini işe yaramaz yapar.
   */
  bugunAlim: "/alimlar?pencere=BUGUN",
};

export type Gorev = {
  anahtar: GorevAnahtari;
  sayi: number;
  adres: string;
  grup: GorevGrubu;
  tur: "BEKLEYEN" | "SAYAC";
  /**
   * 0 ise ekran "temiz ✓" yazar; satır yine de ÇİZİLİR.
   * ⚠ YALNIZ `BEKLEYEN` için anlamlı — sayacın sıfırı temizlik değildir.
   */
  temizMi: boolean;
};

export function gorevleriKur(sayilar: Record<GorevAnahtari, number>): Gorev[] {
  return GOREV_ANAHTARLARI.map((anahtar) => {
    const sayi = sayilar[anahtar] ?? 0;
    const tur = GOREV_TURU[anahtar];
    return {
      anahtar,
      sayi,
      adres: GOREV_ADRESLERI[anahtar],
      grup: GOREV_GRUBU[anahtar],
      tur,
      temizMi: tur === "BEKLEYEN" && sayi === 0,
    };
  });
}

/** Bir gruba düşen görevler — kart başına bir çağrı. */
export function grubunGorevleri(gorevler: Gorev[], grup: GorevGrubu): Gorev[] {
  return gorevler.filter((g) => g.grup === grup);
}

/**
 * Hepsi sıfırsa kutu tek satırda "yapılacak iş yok" diyebilir.
 * ⚠ SAYAÇLAR HÜKME GİRMEZ: bugün 0 alım girilmiş olması kutuyu kirli
 * yapmaz.
 */
export function hepsiTemizMi(gorevler: Gorev[]): boolean {
  return gorevler.filter((g) => g.tur === "BEKLEYEN").every((g) => g.temizMi);
}

/**
 * Toplam bekleyen iş — kart başlığındaki rozet.
 *
 * ⚠ YALNIZ `BEKLEYEN` SAYILIR. Sayaçlar eklenseydi rozet "26 bekleyen"
 * derken içine bugün YAPILMIŞ alımları da katardı; rozetin sözü bozulurdu.
 */
export function bekleyenToplam(gorevler: Gorev[]): number {
  return gorevler
    .filter((g) => g.tur === "BEKLEYEN")
    .reduce((t, g) => t + g.sayi, 0);
}
