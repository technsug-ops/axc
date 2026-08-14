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
] as const;

export type GorevAnahtari = (typeof GOREV_ANAHTARLARI)[number];

/** Her görevin süzülü hedefi — sayı tıklanınca buraya gider. */
export const GOREV_ADRESLERI: Record<GorevAnahtari, string> = {
  kargoBekleyen: "/satislar?kargo=bekleyen",
  iadeBildirimi: "/iadeler",
  malKabulBekleyen: "/alimlar?durum=ORDERED",
  karHesaplanamayan: "/satislar?kar=eksik",
  oransizKanalSku: "/kanal-sku?eksik=1",
};

export type Gorev = {
  anahtar: GorevAnahtari;
  sayi: number;
  adres: string;
  /** 0 ise ekran "temiz ✓" yazar; satır yine de ÇİZİLİR. */
  temizMi: boolean;
};

export function gorevleriKur(sayilar: Record<GorevAnahtari, number>): Gorev[] {
  return GOREV_ANAHTARLARI.map((anahtar) => {
    const sayi = sayilar[anahtar] ?? 0;
    return {
      anahtar,
      sayi,
      adres: GOREV_ADRESLERI[anahtar],
      temizMi: sayi === 0,
    };
  });
}

/** Hepsi sıfırsa kutu tek satırda "yapılacak iş yok" diyebilir. */
export function hepsiTemizMi(gorevler: Gorev[]): boolean {
  return gorevler.every((g) => g.temizMi);
}

/** Toplam bekleyen iş — kutu başlığındaki rozet. */
export function bekleyenToplam(gorevler: Gorev[]): number {
  return gorevler.reduce((t, g) => t + g.sayi, 0);
}
