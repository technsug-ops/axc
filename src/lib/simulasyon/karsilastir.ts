import type { SimulasyonZemini } from "@/lib/fiyatlama/kart-verisi";
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

/**
 * ============================================================================
 *  KANAL LİSTESİ — GERÇEK ZEMİN VARSA O KAZANIR
 * ----------------------------------------------------------------------------
 *  Ürün seçilmediğinde bütün kanallar REFERANS kurallarla hesaplanır ve
 *  komisyon oranını kullanıcı girer.
 *
 *  Ürün seçildiğinde (barkod/SKU ile) o ürünün **gerçek** kanal zeminleri
 *  gelir: dilim tarifesi, `ChannelSku` oranı, o kanalın kesinti kuralları.
 *  O kanallarda komisyon artık kullanıcının tahmini DEĞİL, tarifenin
 *  kendisidir — ve hangisi kullanıldığı `oranKaynagi` ile beyan edilir.
 *
 *  ⚠ EŞLEŞTİRME KANAL ADIYLA. `SimulasyonZemini` kanal ADI taşıyor
 *  ("Trendyol"), bizim listemiz KOD ("TRENDYOL"). Kimlikle eşleştirmek
 *  isterdim ama zemin `channelAccountId` taşıyor, referans listemizin öyle
 *  bir alanı yok — burada eşleşen şey KANAL, hesap değil. Ad karşılaştırması
 *  büyük/küçük harf ve Türkçe yerel duyarlı yapılıyor.
 * ============================================================================
 */
function zeminEslesmesi(
  kanalAdi: string,
  zeminler: SimulasyonZemini[],
): SimulasyonZemini | null {
  const hedef = kanalAdi.toLocaleLowerCase("tr");
  return (
    zeminler.find((z) => {
      /**
       * ⚠ ZEMİNİN `kanalAdi`'SI "Trendyol — AXCALI" BİÇİMİNDE OLABİLİR.
       * Bu depoda tam bu tuzağa düşülmüştü (`kanalAdi === "Hepsiburada"`
       * hiç tutmadı, 29 ürün sessizce elendi). Bu yüzden EŞİTLİK değil,
       * başlangıç karşılaştırması yapılıyor.
       */
      const ad = z.kanalAdi.toLocaleLowerCase("tr");
      return ad === hedef || ad.startsWith(`${hedef} `);
    }) ?? null
  );
}

export type KanalSonucu = {
  kod: string;
  ad: string;
  kaynak: KuralKaynagi;
  kaynakNotu: string;
  belirsizlik: string | null;
  /** Kullanılan komisyon oranı (%) — çözülemezse null. */
  komisyonOrani: number | null;
  /** Oran nereden geldi: dilim tarifesi · tek oran · yok. */
  oranKaynagi: "DILIM" | "TEK_ORAN" | "YOK";
  /** Bu kanalda ürünün GERÇEK zemini kullanıldı mı (kanal SKU'su var mı). */
  gercekZemin: boolean;
  net1: number | null;
  net2: number | null;
  /** Satış fiyatının nereye gittiği — grafik ve döküm buradan. */
  dokum: { kod: string; tutar: number }[];
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
  zemin: SimulasyonZemini | null,
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
     * ⚠ GERÇEK ZEMİN VARSA KOMİSYON ORANI ORADAN — kullanıcının girdiği
     * oran yalnız YEDEKTİR. Barkodla ürün seçildiğinde Trendyol'un dilim
     * tarifesi devreye giriyor ve oran fiyata göre değişiyor; kullanıcının
     * tek bir oran tahmin etmesi o mekanizmayı görünmez kılardı.
     */
    dilimler: zemin?.dilimler ?? null,
    pencereBitis: zemin?.pencereBitis ?? null,
    tekOran: zemin?.tekOran ?? girdi.komisyonOrani,
    /** Kanal kuralları da zeminden — hesap bazlı farklılık varsa o kazanır. */
    komisyonKdvOrani: zemin?.komisyonKdvOrani ?? kanal.komisyonKdvOrani,
    siparisKesintileri: zemin?.siparisKesintileri ?? kanal.kesintiler,
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
    /**
     * ORAN NEREDEN GELDİ — ekranda yazar. "Tarifeden" ile "senin girdiğin"
     * arasındaki fark, bu ekranın bütün değeridir.
     */
    oranKaynagi: s.oranKaynagi,
    gercekZemin: zemin !== null,
    net1: s.net1,
    net2: s.net2,
    dokum: s.dokum,
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
  /** Ürün seçildiyse onun gerçek kanal zeminleri; yoksa boş. */
  zeminler: SimulasyonZemini[] = [],
): KanalSonucu[] {
  if (girdiEksikMi(girdi)) return [];
  return SIMULASYON_KANALLARI.map((k) =>
    kanalSonucu(k, girdi, bugun, zeminEslesmesi(k.ad, zeminler)),
  ).sort(
    /** NET hesaplanamayan kanal SONA — "0 kâr" sayılıp öne çıkamaz. */
    (a, b) => (b.net2 ?? -Infinity) - (a.net2 ?? -Infinity),
  );
}
