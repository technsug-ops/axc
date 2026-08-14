import { ayKaydir, pencerede, type Pencere } from "@/lib/donem";

import type { KarDurumu } from "@/lib/kar";
import type { Currency } from "@/generated/prisma/enums";

/**
 * ============================================================================
 *  ANA SAYFA PANELİ — SAF HESAP
 * ----------------------------------------------------------------------------
 *  Veritabanına GİTMEZ, "şu an"ı kendi okumaz. Girdisi verilirse her zaman
 *  aynı çıktıyı üretir; bu yüzden gerçek veri beklemeden sınanabilir.
 *
 *  RAPOR EKRANIYLA AYNI İLKELER:
 *   - Kâr rakamları SNAPSHOT'tan okunur, burada hiçbir şey yeniden hesaplanmaz.
 *   - Hesaplanamayan kâr SIFIR SAYILMAZ; ayrıca sayılır ve ekranda yazılır.
 *   - PARA BİRİMLERİ ÇEVRİLMEZ. Her para birimi ayrı blok; TRY ile EUR
 *     tek toplamda buluşmaz.
 *
 *  KÂR ÇİZGİSİ NET-2'DİR (kullanıcı kararı 12.08.2026): stopaj da ödenecek
 *  KDV de düşülmüş, yani cebe giren rakam.
 *
 *  NET-2 TANIMI RAPOR EKRANIYLA ÖZDEŞTİR: satışların NET-2'si + İADE
 *  ETKİLERİ. Panel yalnız satışları saysaydı iki ekran aynı ay için farklı
 *  NET-2 gösterirdi ve "hangisi doğru" sorusu doğardı (anayasa: aynı iş her
 *  ekranda aynı görünür). Üç görünüm — kanal blokları, grafik çizgisi ve
 *  aylık tablo — TEK tanımı kullanır.
 *  _Kullanıcı kararı 12.08.2026._
 *
 *  İADE HANGİ AYA, HANGİ KANALA YAZILIR:
 *    AY    → iadenin KENDİ tarihine (occurredAt). Temmuz satışının Ağustos
 *            iadesi Ağustos'a düşer; kapanmış ay sonradan oynamaz.
 *    KANAL → iadenin bağlı olduğu SATIŞIN kanalına.
 * ============================================================================
 */

/** Panelin bir satıştan ihtiyaç duyduğu her şey. */
export type PanelSatisi = {
  /** Kanalın kendi kodu — hesap değil KANAL seviyesinde gruplanır. */
  kanalKodu: string;
  kanalAdi: string;
  /** Kanal HESABININ adı — kanal altındaki kırılım için ("AXCALI"). */
  hesapAdi: string;
  /** İş tarihi (UTC gece yarısı). */
  tarih: Date;
  paraBirimi: Currency;
  /** KDV dahil satış tutarı toplamı. */
  gelir: number;
  /**
   * NET-1 — yalnız stopaj düşülmüş kâr.
   *
   * NET-2 ile AYNI durum bayrağına bağlıdır (`durum`), çünkü ikisi tek
   * hesaptan doğar: NET-2 = NET-1 − ödenecek KDV. Ayrı bir bayrak tutmak,
   * "NET-1 hesaplandı ama NET-2 hesaplanmadı" gibi olmayan bir hâl
   * uydurmak olurdu.
   */
  net1: number | null;
  net2: number | null;
  durum: KarDurumu | null;
  /**
   * KARGOYA VERİLDİ Mİ? Elle işaretlenen operasyonel durum
   * (`Sale.shippedAt` dolu mu). Panel "kargoya verilen / bekleyen"
   * sayısını buradan üretir; başka hiçbir yerden türetilemiyor.
   */
  kargoyaVerildiMi: boolean;
};

/** Panelin bir iadeden ihtiyaç duyduğu her şey. */
export type PanelIadesi = {
  /** İadenin bağlı olduğu SATIŞIN kanalı. */
  kanalKodu: string;
  kanalAdi: string;
  /** İadenin bağlı olduğu SATIŞIN kanal hesabı. */
  hesapAdi: string;
  /** İadenin KENDİ tarihi (occurredAt) — satışın tarihi değil. */
  tarih: Date;
  paraBirimi: Currency;
  /** İadenin NET-1 etkisi — negatif gelir (satışla aynı bayrağa bağlı). */
  net1: number | null;
  net2: number | null;
  durum: KarDurumu | null;
  /**
   * CİRODAN DÜŞEN TUTAR (pozitif sayı olarak).
   *
   * Kaynağı `ReturnLine.KAYIP_GELIR` satırlarının mutlak toplamıdır —
   * `/iadeler` ekranı da aynı yerden okur, iki ekran aynı rakamı üretir.
   *
   * DEĞİŞİM BU SAYIYA GİRMEZ ve bunun için ayrı bir kural yazmak gerekmedi:
   * değişimde `KAYIP_GELIR` satırı hiç oluşmuyor (kural 13.08.2026 — ciro
   * değişimde DURUR, para satıcıda kalır). Yani kaynağı seçmek, kuralı
   * seçmek oldu.
   */
  iadeTutari: number;
};

/** Kanal altındaki hesap kırılımı — "Trendyol'un hangi mağazası?" */
export type HesapSatiri = {
  hesapAdi: string;
  adet: number;
  gelir: number;
  iadeTutari: number;
  iadeAdedi: number;
  net1: number;
  net2: number;
};

export type KanalBlogu = {
  kanalKodu: string;
  kanalAdi: string;
  adet: number;
  gelir: number;
  /**
   * Kârı HESAPLANABİLMİŞ satışların NET-1'i + iade etkileri.
   * NET-2 ile aynı kural; tek fark ödenecek KDV'nin düşülmemiş olması.
   */
  net1: number;
  /**
   * Kârı HESAPLANABİLMİŞ satışların NET-2'si + iade etkileri.
   * Rapor ekranındaki "Σ NET-2" ile aynı tanım.
   */
  net2: number;
  hesaplanamayanAdet: number;
  iadeAdedi: number;
  hesaplanamayanIadeAdedi: number;
  /** Ciro sunumunun gri satırı: brüt − bu tutar = net ciro. */
  iadeTutari: number;
  /** Kargoya verilmiş sipariş sayısı. Bekleyen = adet − bu. */
  kargoyaVerilenAdet: number;
  /**
   * HESAP KIRILIMI. Kanal seviyesinde gruplama doğru varsayılan (kullanıcı
   * "Trendyol bu ay ne yaptı" diye soruyor) ama aynı pazaryerinde iki
   * mağaza varsa toplamın içinde hangisinin ne yaptığı kayboluyordu.
   * Cirosu yüksek hesap başta.
   */
  hesaplar: HesapSatiri[];
};

export type ParaBirimiPaneli = {
  paraBirimi: Currency;
  /** Cirosu yüksek kanal başta. */
  kanallar: KanalBlogu[];
  toplamAdet: number;
  toplamGelir: number;
  /** NET-1 — stopaj düşülmüş, ödenecek KDV DÜŞÜLMEMİŞ kâr. */
  toplamNet1: number;
  toplamNet2: number;
  hesaplanamayanAdet: number;
  toplamIadeAdedi: number;
  hesaplanamayanIadeAdedi: number;
  /** Blok başlığındaki ciro kutusunun gri satırı. */
  toplamIadeTutari: number;
  /** Dönemde kargoya verilen sipariş sayısı. */
  kargoyaVerilenAdet: number;
  /**
   * Dönemde kargoya VERİLMEMİŞ sipariş sayısı — bugün ne yapılacağını
   * söyleyen rakam. Toplam − verilen; ayrı sayaç tutulmuyor ki ikisi
   * birbirinden sapamasın.
   */
  kargoBekleyenAdet: number;
};

/** Kâr toplamına girer mi? Durum CALCULATED değilse NET'e güvenilmez. */
function hesaplandi(durum: KarDurumu | null, net: number | null): net is number {
  return durum === "CALCULATED" && net !== null;
}

/**
 * Pencere içindeki satışları önce PARA BİRİMİNE, sonra KANALA böler.
 *
 * Neden kanal hesabına değil KANALA: kullanıcı aynı pazaryerinde birden
 * fazla hesap açıyor (hesap başına alım limiti yüzünden). "Trendyol bu ay
 * ne yaptı" sorusunun cevabı hesaplara bölünmüş hâlde okunmaz.
 */
export function panelHesapla(
  pencere: Pencere,
  satislar: PanelSatisi[],
  iadeler: PanelIadesi[] = [],
): ParaBirimiPaneli[] {
  const bloklar = new Map<Currency, Map<string, KanalBlogu>>();

  /** Blok ve kanal satırını gerektiğinde açar. */
  function kanalSatiri(
    paraBirimi: Currency,
    kanalKodu: string,
    kanalAdi: string,
  ): KanalBlogu {
    let kanallar = bloklar.get(paraBirimi);
    if (!kanallar) {
      kanallar = new Map();
      bloklar.set(paraBirimi, kanallar);
    }

    let kanal = kanallar.get(kanalKodu);
    if (!kanal) {
      kanal = {
        kanalKodu,
        kanalAdi,
        adet: 0,
        gelir: 0,
        net1: 0,
        net2: 0,
        hesaplanamayanAdet: 0,
        iadeAdedi: 0,
        hesaplanamayanIadeAdedi: 0,
        iadeTutari: 0,
        kargoyaVerilenAdet: 0,
        hesaplar: [],
      };
      kanallar.set(kanalKodu, kanal);
    }
    return kanal;
  }

  /** Kanal içindeki hesap satırını gerektiğinde açar. */
  function hesapSatiri(kanal: KanalBlogu, hesapAdi: string): HesapSatiri {
    let hesap = kanal.hesaplar.find((h) => h.hesapAdi === hesapAdi);
    if (!hesap) {
      hesap = {
        hesapAdi,
        adet: 0,
        gelir: 0,
        iadeTutari: 0,
        iadeAdedi: 0,
        net1: 0,
        net2: 0,
      };
      kanal.hesaplar.push(hesap);
    }
    return hesap;
  }

  for (const satis of satislar) {
    if (!pencerede(pencere, satis.tarih)) continue;

    const kanal = kanalSatiri(satis.paraBirimi, satis.kanalKodu, satis.kanalAdi);
    kanal.adet++;
    kanal.gelir += satis.gelir;
    if (hesaplandi(satis.durum, satis.net2)) kanal.net2 += satis.net2;
    else kanal.hesaplanamayanAdet++;
    // NET-1 aynı bayrağa bakar; "hesaplanamayan" bir kez sayılır.
    if (hesaplandi(satis.durum, satis.net1)) kanal.net1 += satis.net1;
    if (satis.kargoyaVerildiMi) kanal.kargoyaVerilenAdet++;

    const hesap = hesapSatiri(kanal, satis.hesapAdi);
    hesap.adet++;
    hesap.gelir += satis.gelir;
    if (hesaplandi(satis.durum, satis.net2)) hesap.net2 += satis.net2;
    if (hesaplandi(satis.durum, satis.net1)) hesap.net1 += satis.net1;
  }

  // İADELER — satışın kanalına, İADENİN ayına.
  // Sadece iadesi olan bir kanal da blok açar: o ay hiç satış yapılmamış
  // olabilir ama geçen ayın malı iade edilmiş olabilir; o para gerçektir.
  for (const iade of iadeler) {
    if (!pencerede(pencere, iade.tarih)) continue;

    const kanal = kanalSatiri(iade.paraBirimi, iade.kanalKodu, iade.kanalAdi);
    kanal.iadeAdedi++;
    kanal.iadeTutari += iade.iadeTutari;
    if (hesaplandi(iade.durum, iade.net2)) kanal.net2 += iade.net2;
    else kanal.hesaplanamayanIadeAdedi++;
    if (hesaplandi(iade.durum, iade.net1)) kanal.net1 += iade.net1;

    const hesap = hesapSatiri(kanal, iade.hesapAdi);
    hesap.iadeAdedi++;
    hesap.iadeTutari += iade.iadeTutari;
    if (hesaplandi(iade.durum, iade.net2)) hesap.net2 += iade.net2;
    if (hesaplandi(iade.durum, iade.net1)) hesap.net1 += iade.net1;
  }

  return [...bloklar.entries()]
    .map(([paraBirimi, kanallar]) => {
      const liste = [...kanallar.values()].sort((a, b) => b.gelir - a.gelir);
      // Hesaplar da cirosuna göre sıralanır — kanalla aynı mantık.
      for (const kanal of liste) {
        kanal.hesaplar.sort((a, b) => b.gelir - a.gelir);
      }
      return {
        paraBirimi,
        kanallar: liste,
        toplamAdet: liste.reduce((t, k) => t + k.adet, 0),
        toplamGelir: liste.reduce((t, k) => t + k.gelir, 0),
        toplamNet1: liste.reduce((t, k) => t + k.net1, 0),
        toplamNet2: liste.reduce((t, k) => t + k.net2, 0),
        hesaplanamayanAdet: liste.reduce((t, k) => t + k.hesaplanamayanAdet, 0),
        toplamIadeAdedi: liste.reduce((t, k) => t + k.iadeAdedi, 0),
        hesaplanamayanIadeAdedi: liste.reduce(
          (t, k) => t + k.hesaplanamayanIadeAdedi,
          0,
        ),
        toplamIadeTutari: liste.reduce((t, k) => t + k.iadeTutari, 0),
        kargoyaVerilenAdet: liste.reduce((t, k) => t + k.kargoyaVerilenAdet, 0),
        kargoBekleyenAdet:
          liste.reduce((t, k) => t + k.adet, 0) -
          liste.reduce((t, k) => t + k.kargoyaVerilenAdet, 0),
      };
    })
    .sort((a, b) => b.toplamAdet - a.toplamAdet);
}

// ---------------------------------------------------------------------------
//  AYLIK SERİ — GRAFİĞİN VERİSİ
// ---------------------------------------------------------------------------

export type AyNoktasi = {
  yil: number;
  /** 1-12 (JavaScript'in 0-11'i DEĞİL). */
  ay: number;
  adet: number;
  gelir: number;
  /** Kanal bloklarıyla AYNI tanım: satış NET-1'i + iade etkileri. */
  net1: number;
  /** Kanal bloklarıyla AYNI tanım: satış NET-2'si + iade etkileri. */
  net2: number;
  hesaplanamayanAdet: number;
  iadeAdedi: number;
  hesaplanamayanIadeAdedi: number;
  /** Ciro sunumu aylık tabloda da aynı: brüt − bu tutar = net ciro. */
  iadeTutari: number;
};

/**
 * Son N ayın serisi — KAYIT OLMAYAN AY DA DİZİDE DURUR (sıfır değerle).
 *
 * Boş ayı atlamak grafikte iki ayı yan yana getirir ve zaman ekseni yalan
 * söyler: Mayıs'ta hiç satış yoksa çizgi Nisan'dan Haziran'a düz gider,
 * "duraksama yaşanmadı" gibi görünür.
 *
 * @param sonAy    Serinin BİTTİĞİ ay (dahil) — genelde iş takvimindeki bugün.
 * @param ayAdedi  Kaç ay geriye gidileceği (sonAy dahil).
 * @param kanalKodu Süzgeç; null ise bütün kanallar.
 */
export function aylikSeri(
  satislar: PanelSatisi[],
  sonAy: { yil: number; ay: number },
  ayAdedi: number,
  kanalKodu: string | null,
  paraBirimi: Currency,
  iadeler: PanelIadesi[] = [],
): AyNoktasi[] {
  const noktalar: AyNoktasi[] = [];
  const dizin = new Map<string, AyNoktasi>();

  for (let i = ayAdedi - 1; i >= 0; i--) {
    const { yil, ay } = ayKaydir(sonAy.yil, sonAy.ay, -i);
    const nokta: AyNoktasi = {
      yil,
      ay,
      adet: 0,
      gelir: 0,
      net1: 0,
      net2: 0,
      hesaplanamayanAdet: 0,
      iadeAdedi: 0,
      hesaplanamayanIadeAdedi: 0,
      iadeTutari: 0,
    };
    noktalar.push(nokta);
    dizin.set(`${yil}-${ay}`, nokta);
  }

  /** İş tarihleri UTC gece yarısı saklanır; ay bilgisi UTC'den okunur. */
  const noktaBul = (tarih: Date) =>
    dizin.get(`${tarih.getUTCFullYear()}-${tarih.getUTCMonth() + 1}`);

  for (const satis of satislar) {
    if (satis.paraBirimi !== paraBirimi) continue;
    if (kanalKodu !== null && satis.kanalKodu !== kanalKodu) continue;

    const nokta = noktaBul(satis.tarih);
    if (!nokta) continue;

    nokta.adet++;
    nokta.gelir += satis.gelir;
    if (hesaplandi(satis.durum, satis.net2)) nokta.net2 += satis.net2;
    else nokta.hesaplanamayanAdet++;
    if (hesaplandi(satis.durum, satis.net1)) nokta.net1 += satis.net1;
  }

  // İade, KENDİ ayına düşer — satışın ayına değil. Temmuz satışının
  // Ağustos iadesi Ağustos'un çizgisini aşağı çeker; Temmuz'unkini değil.
  for (const iade of iadeler) {
    if (iade.paraBirimi !== paraBirimi) continue;
    if (kanalKodu !== null && iade.kanalKodu !== kanalKodu) continue;

    const nokta = noktaBul(iade.tarih);
    if (!nokta) continue;

    nokta.iadeAdedi++;
    nokta.iadeTutari += iade.iadeTutari;
    if (hesaplandi(iade.durum, iade.net2)) nokta.net2 += iade.net2;
    else nokta.hesaplanamayanIadeAdedi++;
    if (hesaplandi(iade.durum, iade.net1)) nokta.net1 += iade.net1;
  }

  return noktalar;
}
