import { karHesapla, type KarDurumu } from "@/lib/kar";
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
 *  ── YENİ KÂR HESABI YOK ─────────────────────────────────────────────────
 *  ⚠ Bu dosya tek bir kuruş hesaplamaz: her kanal için `karHesapla` çağrılır.
 *  Kendi formülünü yazsaydım aynı soruya iki cevap üreten iki motor olurdu
 *  ve biri gün gelip ötekinden ayrışırdı — üstelik ayrışma sessiz olurdu,
 *  çünkü ikisi de "makul" rakamlar basar.
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
  durum: KarDurumu;
  komisyon: number;
  stopaj: number;
  /** Kanala özgü kesintiler (kargo HARİÇ) — kod ve tutar. */
  kesintiler: { code: string; tutar: number }[];
  kargo: number;
  odenecekKdv: number;
  net1: number;
  net2: number;
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

  const sonuc = karHesapla({
    kalemler: [
      {
        satisTutari: satis,
        satisParaBirimi: "TRY",
        maliyet: alis,
        maliyetParaBirimi: "TRY",
        kdvOrani: girdi.kdvOrani,
        komisyonOrani: girdi.komisyonOrani,
      },
    ],
    komisyonKdvOrani: kanal.komisyonKdvOrani,
    siparisKesintileri: kanal.kesintiler,
    kargoTarifesi,
  });

  const kalem = sonuc.kalemler[0]!;
  const kargo =
    sonuc.siparisKesintileri.find((k) => k.code === "KARGO")?.tutar ?? 0;

  return {
    kod: kanal.kod,
    ad: kanal.ad,
    kaynak: kanal.kaynak,
    kaynakNotu: kanal.kaynakNotu,
    belirsizlik: kanal.belirsizlik,
    durum: sonuc.durum,
    komisyon: kalem.komisyon,
    stopaj: kalem.stopaj,
    kesintiler: sonuc.siparisKesintileri.filter((k) => k.code !== "KARGO"),
    kargo,
    odenecekKdv: sonuc.kdv.odenecekKdv,
    net1: sonuc.net1,
    net2: sonuc.net2,
    ciroMarji: satis > 0 ? (sonuc.net2 / satis) * 100 : null,
    sermayeVerimi: alis > 0 ? (sonuc.net2 / alis) * 100 : null,
  };
}

/**
 * Bütün kanalları karşılaştırır — EN KÂRLIDAN AZA doğru.
 *
 * ⚠ SIRALAMA EKRANIN İŞİ DEĞİL, BURANIN. İki ekran aynı listeyi farklı
 * sıralarsa "hangisi doğru" sorusu doğar; sıra da bir hükümdür.
 */
export function simulasyonKarsilastir(girdi: SimulasyonGirdisi): KanalSonucu[] {
  if (girdiEksikMi(girdi)) return [];
  return SIMULASYON_KANALLARI.map((k) => kanalSonucu(k, girdi)).sort(
    (a, b) => b.net2 - a.net2,
  );
}
