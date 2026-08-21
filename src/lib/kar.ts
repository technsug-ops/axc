import type { Currency } from "@/generated/prisma/enums";

/**
 * ============================================================================
 *  KÂR MOTORU — SAF HESAP, EKRANDAN BAĞIMSIZ
 * ----------------------------------------------------------------------------
 *  Veritabanına gitmez, tarih/rastgelelik kullanmaz. Girdisi verilirse her
 *  zaman aynı çıktıyı üretir; bu yüzden `kar:dogrula` ile birebir sınanabilir.
 *
 *  TEMEL KURALLAR
 *  --------------
 *  1. TUTARLAR KDV DAHİLDİR. Satış, maliyet, komisyon, kargo, kesintiler —
 *     hepsi KDV dahil tutulur. KDV bileşenleri `tutar × oran/(100+oran)` ile
 *     AYRIŞTIRILIR, üstüne eklenmez.
 *  2. ORANLAR YÜZDEDİR. %0,8 -> 0.8, %20 -> 20. Motor 100'e böler.
 *     (Şemada da böyle yazıyor; bu belirsizlik 10 kat hata sınıfıdır.)
 *  3. KDV ORANI ÜRÜNDEN GELİR (kategori sistemi). %20 varsayım değildir;
 *     her kalem kendi oranını taşır.
 *  4. PARA BİRİMİ ÇEVRİLMEZ. Maliyet ile satışın para birimi farklıysa kâr
 *     HESAPLANMAZ — sıfır varsaymak yasak.
 *
 *  İKİ SEVİYE
 *  ----------
 *  Kalem NET-1  = satış − maliyet − komisyon − stopaj
 *  Satış NET-1  = Σ kalem NET-1 − sipariş başına kesintiler − kargo
 *  Satış NET-2  = Satış NET-1 − ödenecek KDV
 *
 *  Sipariş başına kesintiler (hizmet bedeli, sabit gider, kargo) kalemlere
 *  BÖLÜNMEZ; satış seviyesinde durur.
 * ============================================================================
 */

export type KarDurumu =
  "CALCULATED" | "NO_COST" | "CURRENCY_MISMATCH" | "RULE_MISSING";

/** Stopaj oranı (%): KDV hariç tutarın yüzde 1'i. */
export const STOPAJ_ORANI = 1;

/** Kargo ve hizmet bedeli gibi kalemlerin KDV oranı (%). */
export const GENEL_KDV_ORANI = 20;

/** Kategorisi olmayan üründe kullanılan KDV oranı (%). */
export const VARSAYILAN_KDV_ORANI = 20;

// ---------------------------------------------------------------------------
//  KDV YARDIMCILARI
// ---------------------------------------------------------------------------

/** KDV DAHİL tutarın içindeki KDV. 120 TL / %20 -> 20 TL */
export function kdvAyir(tutarDahil: number, oran: number): number {
  return (tutarDahil * oran) / (100 + oran);
}

/** KDV DAHİL tutarın KDV hariç hali. 120 TL / %20 -> 100 TL */
export function kdvHaric(tutarDahil: number, oran: number): number {
  return tutarDahil - kdvAyir(tutarDahil, oran);
}

// ---------------------------------------------------------------------------
//  GİRDİ
// ---------------------------------------------------------------------------

export type KarKalemGirdisi = {
  /** KDV DAHİL satış tutarı (adet × birim fiyat). */
  satisTutari: number;
  satisParaBirimi: Currency;

  /** KDV DAHİL toplam maliyet (FIFO partilerinden). Yoksa null. */
  maliyet: number | null;
  maliyetParaBirimi: Currency | null;

  /** Ürünün KDV oranı (%). Kategoriden çözülür. */
  kdvOrani: number;

  /**
   * Komisyon KDV DAHİL tutar olarak verilebilir (panel gerçeği) VEYA
   * orandan hesaplanabilir. İkisi de yoksa kural eksiktir.
   *
   * Oran verilirse: komisyon = satış × oran/100, ve kanalda KOMISYON_KDV
   * kuralı varsa üstüne o oran kadar KDV eklenir (Hepsiburada).
   */
  komisyonTutari?: number | null;
  komisyonOrani?: number | null;
};

export type SiparisKesintisi = {
  /** KOMISYON_KDV hariç, sipariş/paket kapsamlı kurallar. */
  code: string;
  /**
   * ⚠ PAKET BAŞINA MI — ölçüldü 20.08.2026 (TY paneli).
   * Sipariş bölünüp iki kargoyla gidince platform hizmet bedeli İKİ KEZ
   * alınıyor. `true` ise tutar `paketSayisi` ile çarpılır.
   */
  paketBasina?: boolean;
  basis: "SALE_AMOUNT" | "FIXED";
  /** basis SALE_AMOUNT ise yüzde. */
  rate?: number | null;
  /** basis FIXED ise KDV DAHİL tutar. */
  amount?: number | null;
};

export type KarGirdisi = {
  kalemler: KarKalemGirdisi[];

  /** Kanalda komisyona KDV ekleniyor mu (Hepsiburada) — oran (%), yoksa null. */
  komisyonKdvOrani: number | null;

  /** Sipariş başına kesintiler. */
  siparisKesintileri: SiparisKesintisi[];

  /**
   * Kargo: tarifeden okunan KDV HARİÇ tutar. Motor üstüne KDV ekler.
   * Firma seçilmemişse veya tarife bulunamamışsa null.
   */
  kargoTarifesi: number | null;
  /** Kargo seçildi ama tarife bulunamadıysa true — RULE_MISSING sebebi. */
  kargoTarifesiBulunamadi?: boolean;

  /**
   * KAÇ PAKETLE GÖNDERİLDİ. `PER_PACKAGE` kapsamlı kesintiler bununla
   * çarpılır. Verilmezse 1 — bölünmemiş sipariş.
   */
  paketSayisi?: number;
};

// ---------------------------------------------------------------------------
//  ÇIKTI
// ---------------------------------------------------------------------------

export type Kesinti = { code: string; tutar: number };

export type KarKalemSonucu = {
  satisTutari: number;
  maliyet: number;
  komisyon: number;
  stopaj: number;
  /** satış − maliyet − komisyon − stopaj */
  net1: number;
  /** net1 − (satış KDV − alış KDV − komisyon KDV) */
  net2: number;
  kesintiler: Kesinti[];
  durum: KarDurumu;
};

export type KdvDokumu = {
  satisKdv: number;
  alisKdv: number;
  komisyonKdv: number;
  kargoKdv: number;
  kesintiKdv: number;
  /** satış − (alış + komisyon + kargo + kesinti) */
  odenecekKdv: number;
};

export type KarSonucu = {
  durum: KarDurumu;
  kalemler: KarKalemSonucu[];
  /** Sipariş başına kesintiler — kalemlere bölünmez. */
  siparisKesintileri: Kesinti[];
  kdv: KdvDokumu;
  net1: number;
  net2: number;
};

// ---------------------------------------------------------------------------
//  HESAP
// ---------------------------------------------------------------------------

function kalemHesapla(
  kalem: KarKalemGirdisi,
  komisyonKdvOrani: number | null,
): KarKalemSonucu {
  const kesintiler: Kesinti[] = [];

  // --- durum kontrolleri: yanlış rakam üretmektense hesaplama ---
  let durum: KarDurumu = "CALCULATED";
  if (kalem.maliyet === null) durum = "NO_COST";
  else if (
    kalem.maliyetParaBirimi !== null &&
    kalem.maliyetParaBirimi !== kalem.satisParaBirimi
  )
    durum = "CURRENCY_MISMATCH";

  // --- komisyon ---
  // Panel gerçeği tutar olarak girilebilir; girilmişse oran kullanılmaz.
  let komisyon: number | null = null;
  if (kalem.komisyonTutari !== null && kalem.komisyonTutari !== undefined) {
    komisyon = kalem.komisyonTutari;
  } else if (
    kalem.komisyonOrani !== null &&
    kalem.komisyonOrani !== undefined
  ) {
    const brut = (kalem.satisTutari * kalem.komisyonOrani) / 100;
    // Hepsiburada komisyona KDV ekler; Trendyol eklemez.
    komisyon =
      komisyonKdvOrani !== null ? brut * (1 + komisyonKdvOrani / 100) : brut;
  }
  if (komisyon === null && durum === "CALCULATED") durum = "RULE_MISSING";

  const maliyet = kalem.maliyet ?? 0;
  const komisyonTutar = komisyon ?? 0;

  // --- stopaj: KDV HARİÇ tutarın %1'i, ürünün KENDİ oranıyla ---
  const stopaj =
    (kdvHaric(kalem.satisTutari, kalem.kdvOrani) * STOPAJ_ORANI) / 100;

  kesintiler.push({ code: "MALIYET", tutar: maliyet });
  kesintiler.push({ code: "KOMISYON", tutar: komisyonTutar });
  kesintiler.push({ code: "STOPAJ", tutar: stopaj });

  const net1 = kalem.satisTutari - maliyet - komisyonTutar - stopaj;

  // --- kalemin KDV payı ---
  const satisKdv = kdvAyir(kalem.satisTutari, kalem.kdvOrani);
  const alisKdv = kdvAyir(maliyet, kalem.kdvOrani);
  const komisyonKdv = kdvAyir(komisyonTutar, GENEL_KDV_ORANI);
  const net2 = net1 - (satisKdv - alisKdv - komisyonKdv);

  return {
    satisTutari: kalem.satisTutari,
    maliyet,
    komisyon: komisyonTutar,
    stopaj,
    net1,
    net2,
    kesintiler,
    durum,
  };
}

export function karHesapla(girdi: KarGirdisi): KarSonucu {
  const kalemler = girdi.kalemler.map((k) =>
    kalemHesapla(k, girdi.komisyonKdvOrani),
  );

  // --- KDV bileşenleri (kalem tarafı) ---
  let satisKdv = 0;
  let alisKdv = 0;
  let komisyonKdv = 0;
  for (const [i, s] of kalemler.entries()) {
    const oran = girdi.kalemler[i].kdvOrani;
    satisKdv += kdvAyir(s.satisTutari, oran);
    alisKdv += kdvAyir(s.maliyet, oran);
    komisyonKdv += kdvAyir(s.komisyon, GENEL_KDV_ORANI);
  }

  /**
   * ============================================================================
   *  SALE_AMOUNT MATRAHI — KDV DAHİL SİPARİŞ TUTARI
   * ----------------------------------------------------------------------------
   *  ⚠ DÜZELTİLDİ 21.08.2026 — VE ESKİ GEREKÇE KAYITTA KALIYOR.
   *
   *  Burada eskiden **KDV HARİÇ** toplam kullanılıyordu ve şöyle savunuluyordu:
   *      _"Stopajla aynı mantık; altın senaryo 1 bu okumayla tutuyor."_
   *
   *  Gerekçe iki bacaklıydı ve ikisi de çürüdü:
   *
   *  1) "STOPAJLA AYNI MANTIK" BİR BENZETMEDİR, KURAL DEĞİL. Stopajın matrahı
   *     KDV hariçtir çünkü VERGİ öyle tanımlı. Ödeme gideri bir vergi değil,
   *     pazaryerinin tahsilat komisyonudur; matrahını stopajdan türetmek
   *     "ilkeyi kendi kapsamının dışına uygulamak"tır.
   *
   *  2) ANAYASA ZATEN AKSİNİ YAZIYORDU: _"%0,8 ödeme gideri — sipariş
   *     tutarının binde sekizi, **100 TL'de 80 kuruş**"_ (teyitli 09.08.2026).
   *     100 TL'de 80 kuruş, KDV DAHİL tutarın binde sekizidir.
   *
   *  ── VE PAZARYERİNİN KENDİ EKSTRESİ ÖLÇÜLDÜ (21.08.2026, salt okuma) ─────
   *  `SettlementItem` → "Tahsilat Yönetim Bedeli", 113 sipariş:
   *      kesinti / sipariş tutarı = %0,8000  (min 0,7992 · max 0,8005)
   *
   *  ⚠ Ve o "sipariş tutarı"nın KDV DAHİL olduğu, ekstrenin KENDİ içinden
   *  teyit edildi — bizim defterimize hiç bakılmadan: aynı dosyadaki
   *  stopaj/tutar oranı **%0,8333** çıktı (116 satır). Stopaj KDV hariç
   *  tutarın %1'i olduğuna göre payda KDV dahildir. (Aynı ölçüm stopaj
   *  kuralımızı da bağımsız olarak doğruladı.)
   *
   *  ⚠ İLK ÖLÇÜM YANILTICIYDI: kendi `SaleFee` kayıtlarımıza bakınca oran
   *  14 kayıtta da TAM `0.8000` çıkmıştı — sıfır sapma. O satırları zaten
   *  bu motor yazmış; kendi kendini doğrulayan ölçüm ölçüm değildir. Gerçek
   *  kaynağın gürültüsü (0,7992–0,8005) sahiciliğin işaretiydi.
   *
   *  1000 ₺'lik satışta: eski hâl 6,67 ₺ · DOĞRU 8,00 ₺. Yani her HB
   *  satışında bu kesinti %20 eksik düşülüyor, NET-2 iyimser çıkıyordu.
   *
   *  ⚠ KAPSAM ÖLÇÜLDÜ: canlıda `SALE_AMOUNT` tabanlı TEK kural var
   *  (Hepsiburada / ODEME_GIDERI %0,8). Bu değişiklik başka hiçbir kesintiye
   *  dokunmuyor.
   * ============================================================================
   */
  const kdvDahilSatisToplami = girdi.kalemler.reduce(
    (t, k) => t + k.satisTutari,
    0,
  );

  const siparisKesintileri: Kesinti[] = [];
  /**
   * ⚠ PAKET SAYISI EN AZ 1. Sıfır ya da eksi bir sayı gelirse kesintiyi
   * yok etmek yerine tek pakete düşülür: bölünmemiş sipariş zaten bir
   * pakettir ve "0 paket" diye bir gerçeklik yok.
   */
  const paketSayisi = Math.max(1, Math.trunc(girdi.paketSayisi ?? 1));

  for (const kural of girdi.siparisKesintileri) {
    /**
     * ⚠ ÇARPAN YALNIZ PAKET BAŞINA KURALLARDA. Yüzde tabanlı kesinti
     * (ödeme gideri) zaten ciro üzerinden hesaplanıyor; onu paketle
     * çarpmak aynı parayı iki kez kesmek olurdu.
     */
    const kat = kural.paketBasina ? paketSayisi : 1;
    if (kural.basis === "FIXED") {
      siparisKesintileri.push({
        code: kural.code,
        tutar: (kural.amount ?? 0) * kat,
      });
    } else {
      siparisKesintileri.push({
        code: kural.code,
        tutar: (kdvDahilSatisToplami * (kural.rate ?? 0)) / 100,
      });
    }
  }

  // --- kargo: tarife KDV hariç, üstüne KDV eklenir ---
  let kargoDahil = 0;
  if (girdi.kargoTarifesi !== null) {
    kargoDahil = girdi.kargoTarifesi * (1 + GENEL_KDV_ORANI / 100);
    siparisKesintileri.push({ code: "KARGO", tutar: kargoDahil });
  }

  const kargoKdv = kdvAyir(kargoDahil, GENEL_KDV_ORANI);
  const kesintiKdv = siparisKesintileri
    .filter((k) => k.code !== "KARGO")
    .reduce((t, k) => t + kdvAyir(k.tutar, GENEL_KDV_ORANI), 0);

  const odenecekKdv =
    satisKdv - (alisKdv + komisyonKdv + kargoKdv + kesintiKdv);

  const kalemNet1Toplami = kalemler.reduce((t, k) => t + k.net1, 0);
  const siparisKesintiToplami = siparisKesintileri.reduce(
    (t, k) => t + k.tutar,
    0,
  );

  const net1 = kalemNet1Toplami - siparisKesintiToplami;
  const net2 = net1 - odenecekKdv;

  // --- genel durum: en kötü kalem durumu belirler ---
  let durum: KarDurumu = "CALCULATED";
  for (const k of kalemler) {
    if (k.durum !== "CALCULATED") {
      durum = k.durum;
      break;
    }
  }
  if (durum === "CALCULATED" && girdi.kargoTarifesiBulunamadi) {
    durum = "RULE_MISSING";
  }

  return {
    durum,
    kalemler,
    siparisKesintileri,
    kdv: {
      satisKdv,
      alisKdv,
      komisyonKdv,
      kargoKdv,
      kesintiKdv,
      odenecekKdv,
    },
    net1,
    net2,
  };
}
