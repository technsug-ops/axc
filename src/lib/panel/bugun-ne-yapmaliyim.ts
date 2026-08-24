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
};

export type Gorev = {
  anahtar: GorevAnahtari;
  sayi: number;
  adres: string;
  grup: GorevGrubu;
  /** 0 ise ekran "temiz ✓" yazar; satır yine de ÇİZİLİR. */
  temizMi: boolean;
  /**
   * İLERLEME — kaç tanesi hazır. `null` = o görevde ilerleme kavramı yok.
   *
   * Kullanıcı 24.08.2026: _"kargoya verilecek 15 · paketlenen 1; bu sayılar
   * eşit olana kadar devam."_ Bekleyen sayısı tek başına "ne kadar yol
   * aldım" sorusuna cevap vermiyordu: 15 sipariş paketlenirken sayı 15'te
   * duruyor (kargoya verilene kadar düşmüyor) ve ilerleme görünmüyordu.
   *
   * ⚠ YENİ GÖREV ANAHTARI AÇILMADI. Öyle yapsaydık `GOREV_GRUBU`,
   * `GOREV_ADRESLERI` ve iki sözlük dosyası — dört exhaustive haritaya
   * birden dokunmak gerekirdi; oysa bu bir görev değil, var olan görevin
   * İLERLEMESİ.
   */
  ilerleme: number | null;
};

export function gorevleriKur(
  sayilar: Record<GorevAnahtari, number>,
  /** Görev başına ilerleme — bugün yalnız `kargoBekleyen` için var. */
  ilerlemeler?: Partial<Record<GorevAnahtari, number>>,
): Gorev[] {
  return GOREV_ANAHTARLARI.map((anahtar) => {
    const sayi = sayilar[anahtar] ?? 0;
    return {
      anahtar,
      sayi,
      adres: GOREV_ADRESLERI[anahtar],
      grup: GOREV_GRUBU[anahtar],
      temizMi: sayi === 0,
      ilerleme: ilerlemeler?.[anahtar] ?? null,
    };
  });
}

/** Bir gruba düşen görevler — kart başına bir çağrı. */
export function grubunGorevleri(gorevler: Gorev[], grup: GorevGrubu): Gorev[] {
  return gorevler.filter((g) => g.grup === grup);
}

/** Hepsi sıfırsa kart tek satırda "yapılacak iş yok" diyebilir. */
export function hepsiTemizMi(gorevler: Gorev[]): boolean {
  return gorevler.every((g) => g.temizMi);
}

/**
 * Toplam bekleyen iş — kart başlığındaki rozet.
 *
 * ⚠ BU KUTULARA YALNIZ BEKLEYEN İŞ GİRER. "Bugün girilen alım" bir süre
 * burada durdu ve YANLIŞ YERDEYDİ: yapılmış işin sayacı, bekleyen rozetine
 * karışıyordu. Kullanıcı kararı 21.08.2026 ile dönem kartına taşındı —
 * orada beş kardeşiyle aynı dönemi paylaşıyor ve kıyas rozeti alabiliyor.
 */
export function bekleyenToplam(gorevler: Gorev[]): number {
  return gorevler.reduce((t, g) => t + g.sayi, 0);
}
