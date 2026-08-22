import type { SiparisKesintisi } from "@/lib/kar";

/**
 * ============================================================================
 *  SİMÜLASYON KANAL KURALLARI — DEFTERDEN AYRI, BİLEREK
 * ----------------------------------------------------------------------------
 *  Kullanıcı isteği 21.08.2026: _"bulduğum 1 ürünü alım fiyatı, satış fiyatı,
 *  komisyon oranı girdiğimde hangi pazar yerinde satsam ne kadar kâr ederim"_.
 *
 *  ── NİYE `ChannelFee` DEĞİL — KULLANICI KARARI 21.08.2026 ────────────────
 *  N11'in canlıda **2 gerçek satışı var** ama hiç kesinti kuralı yok. Dış
 *  kaynaktan (nesatilir.com) alınan kuralları doğrudan `ChannelFee`'ye
 *  yazsaydık o iki satışın NET-2'si **doğrulanmamış rakamlarla** yeniden
 *  hesaplanırdı.
 *
 *  ⚠ VE BUNUN NE DEMEK OLDUĞUNU AYNI GÜN ÖĞRENDİK: nesatilir, Hepsiburada
 *  ödeme giderini `9,60` diyor; HB'nin kendi ekstresi ölçüldüğünde gerçek
 *  değer `8,00` çıktı (113 sipariş, %0,8000). Yani bu kaynak yanılabiliyor.
 *
 *  Bu yüzden iki küme AYRI:
 *    · `ChannelFee` (DEFTER)      → ölçülmüş kural, gerçek satışın kârını yazar
 *    · bu dosya    (SİMÜLASYON)  → deneme ekranı, hiçbir kaydı değiştirmez
 *
 *  Bir kanalın ekstresi eline geçip ölçüldüğünde kuralı deftere geçer ve
 *  buradaki kaynak etiketi `OLCULDU`ya döner.
 *
 *  ── HER SAYININ KAYNAĞI YAZILI ──────────────────────────────────────────
 *  Anayasa: _"kaynağı yazılmayan sayı, doğru olsa bile kullanılamaz"_.
 *  Her kanal `kaynak` ve `kaynakNotu` taşır; ekran bunu ROZET olarak basar.
 *  Kullanıcı hangi rakamın ölçülmüş, hangisinin dış iddia olduğunu ekranda
 *  görmeden karşılaştırma yapmaz.
 * ============================================================================
 */

/** Kuralın nereden geldiği — ekranda rozet olarak görünür. */
export type KuralKaynagi = "OLCULDU" | "REFERANS";

export type SimulasyonKanali = {
  kod: string;
  ad: string;
  /** Komisyona KDV ekleniyor mu — oran (%), eklenmiyorsa null. */
  komisyonKdvOrani: number | null;
  kesintiler: SiparisKesintisi[];
  kaynak: KuralKaynagi;
  /** Kaynağın kendisi: hangi ölçüm, hangi tarih, hangi örneklem. */
  kaynakNotu: string;
  /** Ekranda ayrıca uyarılması gereken belirsizlik — yoksa null. */
  belirsizlik: string | null;
};

/**
 * ⚠ SIRA ÖNEMLİ DEĞİL — ekran NET-2'ye göre sıralar. Buradaki sıra yalnız
 * okunabilirlik için: önce ölçülmüşler, sonra referanslar.
 */
export const SIMULASYON_KANALLARI: SimulasyonKanali[] = [
  {
    kod: "TRENDYOL",
    ad: "Trendyol",
    /** Trendyol komisyonuna KDV EKLEMEZ (anayasa, teyitli 09.08.2026). */
    komisyonKdvOrani: null,
    kesintiler: [{ code: "SABIT_GIDER", basis: "FIXED", amount: 13.19 }],
    kaynak: "OLCULDU",
    kaynakNotu:
      "Anayasa (teyitli 09.08.2026): ₺13,19 sabit gider, sipariş başına bir kez. Komisyona KDV eklenmez.",
    belirsizlik: null,
  },
  {
    kod: "HEPSIBURADA",
    ad: "Hepsiburada",
    komisyonKdvOrani: 20,
    kesintiler: [
      /**
       * ⚠ MATRAH KDV DAHİL — 21.08.2026'da düzeltildi. HB ekstresi ölçüldü:
       * tahsilat bedeli / sipariş tutarı = %0,8000 (113 sipariş, min 0,7992 ·
       * max 0,8005). Matrahın KDV dahil olduğu aynı dosyadaki stopaj oranıyla
       * teyit edildi (%0,8333, 116 satır).
       */
      { code: "ODEME_GIDERI", basis: "SALE_AMOUNT", rate: 0.8 },
      { code: "HIZMET_BEDELI", basis: "FIXED", amount: 12.6 },
    ],
    kaynak: "OLCULDU",
    kaynakNotu:
      "Anayasa + HB ekstresi (21.08.2026, 113 sipariş): komisyona +%20 KDV, %0,8 tahsilat bedeli, ₺12,60 hizmet bedeli.",
    belirsizlik: null,
  },
  {
    kod: "N11",
    ad: "N11",
    /** Komisyona KDV eklenmiyor — nesatilir çıktısında komisyon 150 (1000×%15). */
    komisyonKdvOrani: null,
    /**
     * ⚠ SABİTTEN YÜZDEYE ÇEVRİLDİ 22.08.2026 — VE ESKİ HÂLİ NİYE YANLIŞTI:
     *
     * Önce `basis: "FIXED", amount: 12.58` yazıyordu ve şöyle savunuluyordu:
     *     _"₺12,58 tek senaryodan geliyor; sabit mi ciro yüzdesi mi ayırt
     *     edilemedi. Sabit varsayıldı ve BEYAN EDİLİYOR. Farklı bir fiyatla
     *     İKİNCİ BİR HESAP gerekiyor."_
     *
     * O ikinci hesap geldi. Kullanıcı nesatilir'e ₺2.175'lik senaryoyu
     * girdi ve çıkan kesinti **₺27,36** oldu:
     *
     *     12,58 / 1.000  = %1,258
     *     %1,258 × 2.175 = 27,3615        fark 0,0015 ₺ (yuvarlama)
     *
     * İki nokta bir doğru kuruyor ve doğru SIFIRDAN geçiyor: sabit terim
     * yok. Yani nesatilir bunu **ciro yüzdesi** olarak uyguluyor; bizim
     * `FIXED` yazmamız referansı yanlış kopyalamaktı ve 1.000 ₺ dışındaki
     * her fiyatta hesabı kaydırıyordu (2.175 ₺'de ₺14,78 eksik kesinti →
     * NET-2 o kadar iyimser).
     *
     * ⚠ NE KANITLANDI, NE KANITLANMADI — ROZET DEĞİŞMİYOR:
     * · KANITLANDI: nesatilir bunu yüzde olarak işletiyor (iki nokta, tam
     *   uyum). Yani bizim modelimiz artık SEÇTİĞİMİZ referansa sadık.
     * · KANITLANMADI: N11'in gerçekten %1,258 kestiği. Kaynak hâlâ tek ve
     *   hâlâ nesatilir; `REFERANS` etiketi ve belirsizlik notu duruyor.
     *   _"Bağımsızlık kaynağın ayrılığıyla ölçülür, yolun ayrılığıyla
     *   değil"_ — aynı siteye ikinci kez sormak teyit değildir.
     */
    kesintiler: [
      { code: "PAZARLAMA_HIZMET", basis: "SALE_AMOUNT", rate: 1.258 },
    ],
    kaynak: "REFERANS",
    kaynakNotu:
      "nesatilir.com (21–22.08.2026, iki senaryo: satış ₺1.000 ve ₺2.175). İki nokta kesintinin SABİT değil ciro yüzdesi olduğunu gösterdi (%1,258). Oranın kendisi hâlâ nesatilir beyanı; N11 ekstresiyle doğrulanmadı.",
    /**
     * ⚠ KALAN BELİRSİZLİK: MATRAH.
     * Her iki senaryo da %20 KDV'liydi. "%1,258 × KDV DAHİL tutar" ile
     * "%1,5096 × KDV HARİÇ tutar" bu iki noktada AYNI sonucu verir ve
     * ayırt edilemez. Ancak KDV oranı farklı bir üründe (%1 ya da %10)
     * ayrışırlar. `SALE_AMOUNT` seçildi çünkü motorun bu tabanı KDV DAHİL
     * sipariş tutarıdır ve HB ödeme gideri de öyle ölçülmüştü.
     */
    belirsizlik:
      "Oran nesatilir beyanı, N11 ekstresiyle doğrulanmadı. Ayrıca matrahın KDV dahil mi hariç mi olduğu ayırt edilemedi: iki senaryo da %20 KDV'liydi, farklı KDV oranlı bir ürün gerekiyor.",
  },
  {
    kod: "AMAZON",
    ad: "Amazon.com.tr",
    komisyonKdvOrani: 20,
    /**
     * ⚠ EK KESİNTİ YOK — UYDURULMADI, HESAPLA DOĞRULANDI.
     * nesatilir çıktısı: 1000 − 599 − 180 − 8,33 − 120 − 16,83 = 75,84 ve
     * ekranda yazan kâr 75,83. Denklem ek bir kalem bırakmıyor.
     */
    kesintiler: [],
    kaynak: "REFERANS",
    kaynakNotu:
      "nesatilir.com (21.08.2026): komisyona +%20 KDV, ek sabit kesinti yok. Bizde Amazon kuralı ve satışı yok.",
    belirsizlik:
      "Hesap kategori seçilmeden yapıldı; kategoriye bağlı bir hizmet bedeli varsa görünmemiş olabilir.",
  },
];
