import { simulasyonKur, type Beyan } from "@/lib/fiyatlama/simulasyon";
import { kdvHaricKargo } from "@/lib/kargo-kdv";
import {
  SIMULASYON_KANALLARI,
  type KuralKaynagi,
  type SimulasyonKanali,
} from "./kanal-kurallari";

/**
 * ============================================================================
 *  FİYAT DENEMESİ — "HANGİ PAZARYERİNDE SATSAM NE KALIR"
 * ----------------------------------------------------------------------------
 *  Kullanıcı isteği 21.08.2026. Girilen alış/satış/komisyon ile bütün
 *  kanalları yan yana koyar ve NET-2'ye göre sıralar.
 *
 *  ── PARALEL MOTOR YAZILMADI — VE İLK HÂLİNDE YAZILMIŞTI ─────────────────
 *  ⚠ Bu dosya ilk yazıldığında doğrudan `karHesapla`yı çağırıyordu ve tam
 *  o sırada `lib/fiyatlama/simulasyon.ts` ZATEN VARDI (464 satır: beyanlar,
 *  başabaş, yön hükmü, alt dilim önerisi). Yani "aynı soruya iki motor"
 *  tuzağına, o tuzağa karşı yorum yazarken düşülmüştü.
 *
 *  Düzeltildi: her kanal için `simulasyonKur` çağrılıyor. Kazanç yalnız
 *  tekrarın kalkması değil — BEYANLAR da geliyor: "dilim verisi yok",
 *  "tarife penceresi bitmiş", "maliyet yok". Kendi motorumda bunlar hiç
 *  yoktu ve ekran, olmayan bir kesinlik gösteriyordu.
 *
 *  ── HİÇBİR ŞEY YAZMAZ ───────────────────────────────────────────────────
 *  Simülasyon bir denemedir: ne satış, ne stok, ne kesinti kaydı doğar.
 *
 *  ── KDV DAHİL / HARİÇ (kullanıcı kararı 21.08.2026) ─────────────────────
 *  nesatilir KDV DAHİL ister; operasyonda iki dil de kullanılıyor. Girdi
 *  hangi dilde olursa olsun motora HEP aynı birimde giriyor:
 *    · satış ve alış → KDV DAHİL
 *    · kargo tarifesi → KDV HARİÇ (motor üstüne KDV ekler)
 *  Çevirim TEK YERDE, burada. Ekranın çevirmesine izin verilseydi iki ekran
 *  iki farklı birimi motora yollardı.
 * ============================================================================
 */

export type SimulasyonGirdisi = {
  /** Girilen tutarlar KDV DAHİL mi? `false` ise hepsi KDV hariçtir. */
  kdvDahilMi: boolean;
  /** Ürünün satış fiyatı (tek adet). */
  satisFiyati: number;
  /** Ürünün alış fiyatı — bize maliyeti. */
  alisFiyati: number;
  /** Komisyon oranı (%). Kanal başına farklı olabilir; şimdilik ortak. */
  komisyonOrani: number;
  /** Ürünün KDV oranı (%). */
  kdvOrani: number;
  /** Kargo ücreti. Sıfır ya da null ise kargo hesaba girmez. */
  kargoUcreti: number | null;
};

export type KanalSonucu = {
  kod: string;
  ad: string;
  kaynak: KuralKaynagi;
  kaynakNotu: string;
  belirsizlik: string | null;
  /** Kullanılan komisyon oranı (%) — çözülemezse null. */
  komisyonOrani: number | null;
  net1: number | null;
  net2: number | null;
  /**
   * ZEMİN BEYANLARI — "dilim yok", "pencere bitti", "maliyet yok".
   * ⚠ Ekranda görünmezlerse motorun dürüstlüğü kullanıcıya ulaşmaz.
   */
  beyanlar: Beyan[];
  /** NET-2 / satış (KDV dahil), yüzde. Satış sıfırsa null. */
  ciroMarji: number | null;
  /** NET-2 / alış (KDV dahil) — "sermaye verimi", yüzde. Alış sıfırsa null. */
  sermayeVerimi: number | null;
};

/**
 * GİRDİ GEÇERLİ Mİ — sessiz sıfır üretmemek için.
 *
 * ⚠ SIFIR SATIŞ "0 KÂR" DEĞİLDİR, CEVAPSIZ SORUDUR. Boş formda tablo
 * çizmek, kullanıcıya hesaplanmış gibi görünen bir sıfır duvarı gösterirdi.
 */
export function girdiEksikMi(girdi: SimulasyonGirdisi): boolean {
  return (
    !Number.isFinite(girdi.satisFiyati) ||
    girdi.satisFiyati <= 0 ||
    !Number.isFinite(girdi.alisFiyati) ||
    girdi.alisFiyati <= 0 ||
    !Number.isFinite(girdi.komisyonOrani) ||
    girdi.komisyonOrani < 0 ||
    !Number.isFinite(girdi.kdvOrani) ||
    girdi.kdvOrani < 0
  );
}

/** KDV hariç girilen bir tutarı dahile çevirir. */
function dahileCevir(tutar: number, kdvOrani: number): number {
  return tutar * (1 + kdvOrani / 100);
}

function kanalSonucu(
  kanal: SimulasyonKanali,
  girdi: SimulasyonGirdisi,
  bugun: Date,
): KanalSonucu {
  const satis = girdi.kdvDahilMi
    ? girdi.satisFiyati
    : dahileCevir(girdi.satisFiyati, girdi.kdvOrani);
  const alis = girdi.kdvDahilMi
    ? girdi.alisFiyati
    : dahileCevir(girdi.alisFiyati, girdi.kdvOrani);

  /**
   * ⚠ KARGO KDV'Sİ HEP %20 — ürünün KDV oranı değil. Kargo bir hizmettir ve
   * kendi oranı vardır; ürün %1 KDV'liyse bile kargo %20'dir. `kdvHaricKargo`
   * bu çevrimin tek kaynağı.
   */
  const kargoTarifesi =
    girdi.kargoUcreti === null || girdi.kargoUcreti <= 0
      ? null
      : girdi.kdvDahilMi
        ? kdvHaricKargo(girdi.kargoUcreti)
        : girdi.kargoUcreti;

  const s = simulasyonKur({
    hedefFiyat: satis,
    adet: 1,
    birimMaliyet: alis,
    kdvOrani: girdi.kdvOrani,
    paraBirimi: "TRY",
    /**
     * ⚠ DİLİM YOK, TEK ORAN VAR. Bu ekranda komisyonu KULLANICI giriyor —
     * elindeki ürün henüz sistemde olmayabilir. Ürün seçilerek yapılan
     * deneme kârlılık kartındaki `FiyatDene`nin işi ve orada gerçek dilim
     * tarifesi kullanılıyor. İkisi aynı motoru çağırıyor, girdisi farklı.
     */
    dilimler: null,
    pencereBitis: null,
    tekOran: girdi.komisyonOrani,
    komisyonKdvOrani: kanal.komisyonKdvOrani,
    siparisKesintileri: kanal.kesintiler,
    kargoTarifesi,
    bugun,
  });

  return {
    kod: kanal.kod,
    ad: kanal.ad,
    kaynak: kanal.kaynak,
    kaynakNotu: kanal.kaynakNotu,
    belirsizlik: kanal.belirsizlik,
    komisyonOrani: s.komisyonOrani,
    net1: s.net1,
    net2: s.net2,
    beyanlar: s.beyanlar,
    ciroMarji: s.net2 === null || satis <= 0 ? null : (s.net2 / satis) * 100,
    sermayeVerimi: s.net2 === null || alis <= 0 ? null : (s.net2 / alis) * 100,
  };
}

/**
 * Bütün kanalları karşılaştırır — EN KÂRLIDAN AZA doğru.
 *
 * ⚠ SIRALAMA EKRANIN İŞİ DEĞİL, BURANIN. İki ekran aynı listeyi farklı
 * sıralarsa "hangisi doğru" sorusu doğar; sıra da bir hükümdür.
 */
export function simulasyonKarsilastir(
  girdi: SimulasyonGirdisi,
  /** "Bugün" DIŞARIDAN — saf kalsın, iş takvimi çağırandan gelsin. */
  bugun: Date,
): KanalSonucu[] {
  if (girdiEksikMi(girdi)) return [];
  return SIMULASYON_KANALLARI.map((k) => kanalSonucu(k, girdi, bugun)).sort(
    /** NET hesaplanamayan kanal SONA — "0 kâr" sayılıp öne çıkamaz. */
    (a, b) => (b.net2 ?? -Infinity) - (a.net2 ?? -Infinity),
  );
}
