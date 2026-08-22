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
     * ⚠ GERÇEK EKSTREYLE ÖLÇÜLDÜ 22.08.2026 — nesatilir kaynağı BIRAKILDI.
     *
     * Kullanıcı N11 "Para Transferi Listesi"nden bir hakediş detayı gönderdi
     * ve denklem KURUŞUNA kapandı (fark 0,0000):
     *
     *     Satış Tutarı        9.599,00
     *     Komisyon Tutarı     1.535,84   → %16,0000  (üstüne KDV YOK)
     *     Pazarlama Bedeli      115,19   → %1,2000
     *     Pazaryeri Bedeli       76,79   → %0,8000
     *     Vergi Kesintisi        79,99   → 9.599/1,2 × %1 = STOPAJ
     *     ─────────────────────────────
     *     Net Transfer        7.791,19   ✓
     *
     * ── ÜÇ ŞEY BİRDEN DÜZELDİ ────────────────────────────────────────────
     * 1. TEK KALEM DEĞİL, İKİ KALEM. `PAZARLAMA_HIZMET` tek başınaydı;
     *    ekstre iki ayrı satır gösteriyor ve toplamları **%2,00**.
     * 2. ORAN YANLIŞTI. nesatilir'den türetilen %1,258 gerçekte %1,20 +
     *    %0,80. Tek kalemde bile oran tutmuyordu.
     * 3. MATRAH BELİRSİZLİĞİ KAPANDI. Önce "KDV dahil mi hariç mi ayırt
     *    edilemedi" diye beyan edilmişti; stopaj satırı bunu BAĞIMSIZ
     *    olarak çözdü — 79,99 ancak KDV HARİÇ tutarın %1'i olarak çıkıyor,
     *    dolayısıyla 9.599 KDV DAHİL demektir ve oranlar o tabana oturuyor.
     *    Yalnız o tabanda üç oran da tam yuvarlak sayı veriyor.
     *
     * ⚠ ÖNCEKİ GEREKÇE SİLİNMİYOR. 21.08'de kural `FIXED ₺12,58`di ve
     * "sabit varsayıldı, BEYAN EDİLİYOR" deniyordu; 22.08'de nesatilir'in
     * ikinci senaryosuyla yüzdeye (%1,258) çevrildi. İkisi de artık geçersiz
     * — ama ikisi de doğru yöntemle yapılmıştı ve kaynağı yazılıydı. Yanlış
     * olan sayılar değil, KAYNAĞIN KENDİSİYDİ: nesatilir HB ödeme giderini
     * de `9,60` diyordu, gerçeği `8,00` çıkmıştı (113 sipariş).
     *
     * ⚠ ÖRNEKLEM n=1. Bir hakediş kaydı. Üç oranın da tam yuvarlak çıkması
     * ve denklemin kuruşuna kapanması güçlü bir işaret, ama tek kayıt sabit
     * bir terimi (F + oran×satış) ayırt edemez. İkinci kayıt istendi.
     */
    kesintiler: [
      { code: "PAZARLAMA_HIZMET", basis: "SALE_AMOUNT", rate: 1.2 },
      { code: "PAZARYERI_BEDELI", basis: "SALE_AMOUNT", rate: 0.8 },
    ],
    kaynak: "OLCULDU",
    kaynakNotu:
      "N11 hakediş ekstresi (22.08.2026, n=1: satış ₺9.599 · transfer 13.08.2026). Denklem kuruşuna kapandı: komisyon %16 · Pazarlama Bedeli %1,20 · Pazaryeri Bedeli %0,80 · stopaj KDV hariç %1. Matrah KDV DAHİL — stopaj satırıyla bağımsız doğrulandı.",
    /**
     * ⚠ ÖLÇÜLDÜ AMA TEK KAYITTAN. Rozet artık dış iddia değil gerçek ekstre
     * gösteriyor; yine de örneklem beyan ediliyor — "ölçüldü" demek "yeterince
     * ölçüldü" demek değildir.
     */
    belirsizlik:
      "Tek hakediş kaydından ölçüldü (n=1). Oranlar tam yuvarlak çıkıyor ve denklem kuruşuna kapanıyor, ama tek kayıt sabit bir terimi orandan ayırt edemez. İkinci kayıtla doğrulanacak.",
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
