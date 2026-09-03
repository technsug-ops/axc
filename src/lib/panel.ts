import { ayKaydir, pencerede, type Pencere } from "@/lib/donem";

import type { KarDurumu } from "@/lib/kar";
import type { Currency } from "@/generated/prisma/enums";
import {
  kanallariSirala,
  VARSAYILAN_KANAL_SIRASI,
  type KanalSiraKipi,
} from "@/lib/kanal-sirasi";

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
  /**
   * KANAL HESABININ KİMLİĞİ — GRUPLAMA BUNDAN YAPILIR (K14t, 01.09.2026).
   *
   * ⛔ AD İLE GRUPLAMA TUZAKTI: `hesapAdi` bir ETİKETTİR, kimlik değil.
   * MySQL karşılaştırması harf duyarsız; aynı kanalda `S.Ahmet` ile
   * `s.ahmet` açılsaydı panel ikisini TEK satırda birleştirir ve iki ayrı
   * mağazanın cirosu sessizce toplanırdı.
   *
   * ⚠ VE RİSK TEORİK DEĞİL — ÖLÇÜLDÜ (01.09.2026): aynı kişi kanaldan
   * kanala üç farklı yazımla duruyor (`S.Ahmet` · `S.ahmet` · `s.ahmet`).
   * Aynı kanalda çakışma bugün YOK, ama yazım tutarsızlığı zaten kural.
   * _(Anayasa: "kimlik varken dizeyle aranmaz".)_
   */
  hesapId: string;
  /** Kanal HESABININ adı — yalnız EKRAN ETİKETİ. Gruplama `hesapId` ile. */
  hesapAdi: string;
  /** İş tarihi (UTC gece yarısı). */
  tarih: Date;
  paraBirimi: Currency;
  /** KDV dahil satış tutarı toplamı. */
  gelir: number;
  /**
   * SATIŞIN İÇİNDEKİ KDV — hesaplanan vergi.
   *
   * ⚠ ORAN KALEMDEN, SNAPSHOT: `SaleItem.vatRate` satış anında yazılıyor.
   * Kategoriden yeniden çözülseydi kategori oranı değişince eski satışların
   * vergisi geriye dönük kayardı — snapshot tam bunun için var.
   */
  kdv: number;
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
};

/**
 * ============================================================================
 *  KARGO — AYRI TARİH EKSENİ (15.08.2026 düzeltmesi)
 * ----------------------------------------------------------------------------
 *  Kargo bir SATIŞ metriği değil OPERASYON metriğidir: "o gün kaç paket
 *  elimden çıktı". Ölçütü `shippedAt`tir, satış tarihi değil.
 *
 *  ÖNCEDEN YANLIŞTI: kargo sayacı satış döngüsünün İÇİNDE, satış tarihine
 *  göre süzülmüş listede sayılıyordu; `shippedAt` yalnız "dolu mu boş mu"
 *  diye okunuyor, NE ZAMAN diye hiç sorulmuyordu. Sonuç: dün satılıp bugün
 *  kargolanan paket DÜNÜN hanesine yazılıyordu. Kullanıcı bugün 6 paket
 *  kargoladı, panel "2" dedi (canlı, 15.08.2026).
 *
 *  Bu yüzden kargo AYRI BİR LİSTE olarak geliyor: satış listesi dönemin
 *  satışlarını taşır, kargo listesi dönemin SEVKİYATLARINI. İkisi aynı
 *  kaydın iki farklı sorusudur ve aynı döngüde cevaplanamaz.
 * ============================================================================
 */
export type PanelKargosu = {
  kanalKodu: string;
  kanalAdi: string;
  paraBirimi: Currency;
  /**
   * KARGOYA VERİLME TARİHİ. `null` ise sipariş HÂLÂ BEKLİYOR — ve bekleyen
   * DÖNEMDEN BAĞIMSIZDIR: "bugünün bekleyeni" diye bir şey yoktur, ne zaman
   * satılırsa satılsın kargolanmamış her sipariş şu an bekliyordur.
   */
  kargoTarihi: Date | null;
  /**
   * SİPARİŞ İÇE AKTARILDI MI (`Sale.importKaynak`). `null` = elle girildi.
   *
   * ⛔ NİYE PANELE GİRDİ (K60, 27.08.2026): `kargoTarihi === null` artık
   * İKİ AYRI ŞEY anlatıyor ve ayırt edici tek veri bu.
   */
  importKaynak: string | null;
  /**
   * KARGO NUMARASI (`Sale.shipmentCode`). TY içe aktarması bunu YAZIYOR,
   * `shippedAt` yazmıyor — numara varsa paket fiilen çıkmıştır.
   */
  shipmentCode: string | null;
  /**
   * SİPARİŞİN CİROSU — "o gün ne kadar mal elimden çıktı".
   * ⚠ Kargo ÜCRETİ değil: soru "kaç liralık mal sevk ettim", "kargoya ne
   * kadar ödedim" değil. İkisi karışırsa grafik bambaşka bir şey anlatır.
   */
  gelir: number;
};

/** Panelin bir iadeden ihtiyaç duyduğu her şey. */
export type PanelIadesi = {
  /** İadenin bağlı olduğu SATIŞIN kanalı. */
  kanalKodu: string;
  kanalAdi: string;
  /** İadenin bağlı olduğu SATIŞIN kanal hesabı — kimlik (K14t). */
  hesapId: string;
  /** Yalnız ekran etiketi; gruplama `hesapId` ile. */
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
  /** ⛔ KİMLİK — React anahtarı ve gruplama bundan; ad yalnız etiket. */
  hesapId: string;
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
  /** Bu dönemde KARGOYA VERİLEN sipariş sayısı (ölçüt: shippedAt). */
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
  /**
   * Bu dönemde kargoya verilen sipariş sayısı — ölçüt `shippedAt`.
   * Satış tarihi bu dönemin DIŞINDA olabilir; olması da gerekir: dün
   * satılıp bugün kargolanan paket bugünün işidir.
   */
  kargoyaVerilenAdet: number;
  /**
   * ŞU AN kargoya verilmemiş sipariş sayısı — DÖNEMDEN BAĞIMSIZ.
   * "Bugünün bekleyeni" diye bir şey yok; kargolanmamış her sipariş, ne
   * zaman satılmış olursa olsun, bugün bekliyordur. Bu yüzden dönem
   * süzgeci bu rakama uygulanmaz.
   */
  kargoBekleyenAdet: number;
  /**
   * KARGO BİLGİSİ SİSTEMDE OLMAYAN içe aktarılmış sipariş sayısı (K60).
   * ⚠ GÖREV DEĞİL, KAYIT — ama SAYILIR ve ekranda yazar. Sessizce elenseydi
   * gerçekten bekleyen bir içe aktarma siparişi hiçbir yerde görünmezdi.
   */
  kargoBilinmiyorAdet: number;
};

/** Kâr toplamına girer mi? Durum CALCULATED değilse NET'e güvenilmez. */
function hesaplandi(durum: KarDurumu | null, net: number | null): net is number {
  return durum === "CALCULATED" && net !== null;
}

/**
 * ============================================================================
 *  BİR SİPARİŞİN KARGO HÂLİ (K60) — `shippedAt = null` İKİ ŞEY DEMEK
 * ----------------------------------------------------------------------------
 *  ⚠ ESKİ KURAL SİLİNMİYOR, KAPSAMI YAZILIYOR. Burada eskiden şu vardı ve
 *  DOĞRUYDU:
 *
 *      "bekleyen zamansızdır — kargolanmamış her sipariş, ne zaman satılmış
 *       olursa olsun, bugün bekliyordur."
 *
 *  Kapsamı şuydu: **her satış kendi günü elle giriliyordu**, dolayısıyla
 *  `shippedAt = null` yalnız TEK şey anlatıyordu — "henüz kargolanmadı".
 *
 *  26–27.08.2026'da 14 aylık geçmiş defter içe aktarıldı ve null İKİNCİ bir
 *  anlam kazandı: **"sistem hiç bilmiyor"**. Kod değişmedi, ANLAM değişti —
 *  ve panel 5192 kapatılamaz görev gösterdi. Halil aylar önce teslim edilmiş
 *  siparişleri kargolayamaz; kapatılamayan madde kutunun TAMAMINA olan
 *  güveni eritir (K49).
 *
 *  ═══ ÜÇ HÂL — hepsi ELİMİZDEKİ VERİDEN, yeni alan YOK ═══
 *
 *    GOREV      elle girilmiş + kargolanmamış  → gerçek iş, bugünkü davranış
 *    CIKMIS     kargo tarihi VAR — ya da içe aktarılmış ve KARGO NUMARASI var
 *    BILINMIYOR içe aktarılmış, numarası da yok → görev DEĞİL, KAYIT
 *
 *  ⛔ `shippedAt` GERİ DOLDURULMAZ. Ölçüldü: satış dosyasının 31 kolonunda
 *  kargo/teslim tarihi YOK; TY API'si de `shipmentCode` veriyor, tarih
 *  vermiyor. Bir tarih uydurmak ledger'a sahte bir olay yazmak olurdu.
 *  _(Anayasa: "kolon başlığı bir iddiadır — vekil alan gösterilmez".)_
 *
 *  ⚠ VE ÜÇÜNCÜ HÂL KAYBOLMAZ: ayrı sayılır (`kargoBilinmiyorAdet`) ve ekranda
 *  YAZAR. Sessizce elenseydi, gerçekten bekleyen bir içe aktarma siparişi
 *  hiçbir yerde görünmezdi.
 * ============================================================================
 */
export type KargoHali = "GOREV" | "CIKMIS" | "BILINMIYOR";

export function kargoHali(
  k: Pick<PanelKargosu, "kargoTarihi" | "importKaynak" | "shipmentCode">,
): KargoHali {
  if (k.kargoTarihi !== null) return "CIKMIS";
  /** Elle girilmiş: null'ın tek anlamı var — henüz kargolanmadı. */
  if (k.importKaynak === null) return "GOREV";
  /**
   * ⚠ BOŞ DİZE DE YOK SAYILIR. `shipmentCode: ""` bir kargo numarası
   * değildir; `!== null` demek onu "çıkmış" sayar ve gerçek bir bilinmezliği
   * gizlerdi.
   */
  return (k.shipmentCode ?? "").trim() !== "" ? "CIKMIS" : "BILINMIYOR";
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
  kargolar: PanelKargosu[] = [],
  /**
   * ⚠ SON PARAMETRE VE VARSAYILANLI — ÇAĞRANLARIN HEPSİ DEĞİŞMESİN diye.
   * İki kip de doğru; hangisinin sorulduğu ekranın kararı (K106-②).
   */
  kanalKipi: KanalSiraKipi = VARSAYILAN_KANAL_SIRASI,
): ParaBirimiPaneli[] {
  const bloklar = new Map<Currency, Map<string, KanalBlogu>>();
  /**
   * BEKLEYEN AYRI TUTULUYOR, BLOK AÇMIYOR. Dönemden bağımsız olduğu için
   * kanal satırı açsaydı, bu dönemde hiç işlem görmemiş bir kanal
   * "0 satış / 0 ciro" satırıyla ekrana gelirdi — bilgi değil gürültü.
   */
  const bekleyenler = new Map<Currency, number>();
  /** K60 — görev DEĞİL ama kaybolmayan kova. Bekleyenle aynı gerekçeyle blok açmaz. */
  const bilinmeyenler = new Map<Currency, number>();

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

  /**
   * Kanal içindeki hesap satırını gerektiğinde açar.
   *
   * ⛔ EŞLEŞTİRME KİMLİKLE (K14t, 01.09.2026). Önce `hesapAdi` ile
   * eşleşiyordu: aynı kanalda harf farkıyla ikinci bir hesap açıldığında
   * (`S.Ahmet` ↔ `s.ahmet`) iki mağaza TEK satırda birleşir ve ciroları
   * sessizce toplanırdı. Ad ETİKETTİR; ilk gelen yazım kazanır.
   */
  function hesapSatiri(
    kanal: KanalBlogu,
    hesapId: string,
    hesapAdi: string,
  ): HesapSatiri {
    let hesap = kanal.hesaplar.find((h) => h.hesapId === hesapId);
    if (!hesap) {
      hesap = {
        hesapId,
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

    const hesap = hesapSatiri(kanal, satis.hesapId, satis.hesapAdi);
    hesap.adet++;
    hesap.gelir += satis.gelir;
    if (hesaplandi(satis.durum, satis.net2)) hesap.net2 += satis.net2;
    if (hesaplandi(satis.durum, satis.net1)) hesap.net1 += satis.net1;
  }

  /**
   * KARGO — SATIŞTAN AYRI DÖNGÜ, AYRI EKSEN.
   *
   * Satış döngüsü `satis.tarih`e (soldAt) bakar, bu döngü
   * `kargo.kargoTarihi`ne (shippedAt). Aynı panelde iki tarih ekseni
   * bilinçlidir ve ekranda yazılıdır:
   *   ciro / satış adedi = "bu dönemde ne SATTIM"
   *   kargo             = "bu dönemde ne KARGOLADIM"
   * Not düşülmezse kullanıcı "satış 2 ama kargo 6, neden tutmuyor" der.
   *
   * Bu döngü kanal satırı AÇABİLİR: bu dönemde satış yapılmamış bir
   * kanaldan sevkiyat çıkmış olabilir ve o paket gerçekten elden çıkmıştır
   * — iade döngüsündeki ilkenin aynısı.
   */
  for (const kargo of kargolar) {
    if (kargo.kargoTarihi === null) {
      /**
       * DÖNEM KONTROLÜ YOK: bekleyen zamansızdır. ⚠ Ama artık HANGİ null
       * olduğu sorulur — bkz. `kargoHali` başlığı (K60).
       */
      const hal = kargoHali(kargo);
      if (hal === "GOREV") {
        bekleyenler.set(
          kargo.paraBirimi,
          (bekleyenler.get(kargo.paraBirimi) ?? 0) + 1,
        );
      } else if (hal === "BILINMIYOR") {
        bilinmeyenler.set(
          kargo.paraBirimi,
          (bilinmeyenler.get(kargo.paraBirimi) ?? 0) + 1,
        );
      }
      /**
       * ⚠ CIKMIS HİÇBİR SAYACA GİRMEZ — ve niye: kargo numarası var ama
       * kargo TARİHİ yok, yani hangi döneme yazılacağı BİLİNMİYOR.
       * `kargoyaVerilenAdet`e eklemek, bilmediğimiz bir günü bir pencereye
       * uydurmak olurdu.
       */
      continue;
    }
    if (!pencerede(pencere, kargo.kargoTarihi)) continue;
    kanalSatiri(kargo.paraBirimi, kargo.kanalKodu, kargo.kanalAdi)
      .kargoyaVerilenAdet++;
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

    const hesap = hesapSatiri(kanal, iade.hesapId, iade.hesapAdi);
    hesap.iadeAdedi++;
    hesap.iadeTutari += iade.iadeTutari;
    if (hesaplandi(iade.durum, iade.net2)) hesap.net2 += iade.net2;
    if (hesaplandi(iade.durum, iade.net1)) hesap.net1 += iade.net1;
  }

  return [...bloklar.entries()]
    .map(([paraBirimi, kanallar]) => {
      /**
       * ⚠ SIRA CİRODAN DEĞİL, SABİT DÜZENDEN (K106, 30.08.2026).
       * Eskiden `b.gelir - a.gelir` idi; kart yerleri veriyle birlikte
       * oynuyor ve kullanıcı her açılışta aradığı kanalı yeniden arıyordu.
       * Büyüklük bilgisi kartın kendi ciro çubuğunda zaten yazılı —
       * sıralama onu taşımıyordu, yalnız yerleri oynatıyordu (İlke #10).
       */
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
        // Dönemden bağımsız: çıkarma İLE TÜRETİLMİYOR, sayılıyor.
        kargoBekleyenAdet: bekleyenler.get(paraBirimi) ?? 0,
        kargoBilinmiyorAdet: bilinmeyenler.get(paraBirimi) ?? 0,
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
  /**
   * MARJIN PAYDASI — yalnız kârı HESAPLANABİLMİŞ satışların cirosu.
   *
   * ⛔ NİYE `gelir` KULLANILMIYOR (K117, 31.08.2026): `gelir` HER satışta
   * artıyor, `net2` ise yalnız `hesaplandi(...)` olanlarda. `net2 / gelir`
   * yazılsaydı, kârı hesaplanamayan bir satış paydayı büyütür, payı
   * büyütmez ve marj SESSİZCE düşerdi.
   *
   * ⚠ BUGÜN FARK YOK — VE TUZAK TAM BURADA. Ölçüldü (31.08.2026, canlı):
   * 5843 geçerli satışın **%100'ü** `CALCULATED`, yani `hesaplananGelir`
   * bugün `gelir`e eşit. "Bugün aynı" diye `gelir` kullanmak, ilk
   * hesaplanamayan satış girdiği gün sessizce yanlış bir marj üretirdi ve
   * o gün kimse bu satırı okumazdı.
   *
   * ⚠ VE AYNI ÖLÇÜT `donemOrtalamaMarji`DE ZATEN VAR (`hesaplananCiro`):
   * ikinci bir tanım yazmıyoruz, var olanı aylık eksene taşıyoruz.
   */
  hesaplananGelir: number;
  /**
   * Kârı hesaplanabilmiş İADELERİN tutarı — marj paydasından düşülür.
   *
   * ⚠ NİYE `iadeTutari` DEĞİL: `net2` yalnız hesaplanabilen iadelerin
   * etkisini taşıyor. Paydadan TÜM iadeyi düşmek, payında karşılığı olmayan
   * bir düşüş yapar ve marjı bu sefer YUKARI kaydırırdı. Pay ile payda aynı
   * kümeden gelir. _(Anayasa: kıyasın iki tarafı aynı kümeden olmalı.)_
   */
  hesaplananIadeTutari: number;
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
/**
 * ---------------------------------------------------------------------------
 *  AYLIK ORTALAMA KÂR MARJI — NET-2 BAZLI (K117, kullanıcı isteği 31.08.2026)
 * ---------------------------------------------------------------------------
 *  marj = NET-2 ÷ (hesaplanabilmiş ciro − hesaplanabilmiş iade)  × 100
 *
 *  ── ⛔ PAYDA "NET CİRO", BRÜT DEĞİL ────────────────────────────────────
 *  Aylık tablo zaten `brüt − iade = net ciro` diye sunuyor. Payda brüt
 *  olsaydı ekrandaki sütunları bölen kullanıcı BAŞKA bir sayı bulurdu ve
 *  hangisinin doğru olduğunu bilemezdi. _(İlke #16'nın kardeşi: ekrandaki
 *  rakam, ekrandaki rakamlardan türetilebilmeli.)_
 *
 *  ── ⛔ SIFIR DEĞİL `null` ──────────────────────────────────────────────
 *  Satışı olmayan ay "%0 marj" yapmaz — o ayın marjı YOKTUR. Sıfır yazmak
 *  "ölçtüm, sıfır çıktı" demektir ve grafikte tabana yapışan sahte bir
 *  nokta üretirdi. _(Anayasa: varsayılan değer alanın anlamından türetilir.)_
 *
 *  ── ⚠ PAYDA NEGATİFE DÜŞEBİLİR ────────────────────────────────────────
 *  İadesi satışından büyük bir ay (geçmiş ayın malı bu ay iade edilirse)
 *  net ciroyu eksiye indirir. Negatif paydayla bölmek işareti ters çevirir
 *  ve ZARARI KÂR gibi gösterir; o yüzden hüküm verilmez.
 *  _(Anayasa: "sıfıra ve negatife bölünmez".)_
 */
export function aylikMarj(nokta: {
  net2: number;
  hesaplananGelir: number;
  hesaplananIadeTutari: number;
}): number | null {
  const netCiro = nokta.hesaplananGelir - nokta.hesaplananIadeTutari;
  if (netCiro <= 0) return null;
  return (nokta.net2 / netCiro) * 100;
}

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
      hesaplananGelir: 0,
      hesaplananIadeTutari: 0,
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
    /**
     * ⚠ PAY VE PAYDA AYNI DALDA ARTIYOR — ve bu bilinçli. İki ayrı `if`
     * yazılsaydı biri değişip öteki kalabilirdi; marj o an sessizce kayar.
     */
    if (hesaplandi(satis.durum, satis.net2)) {
      nokta.net2 += satis.net2;
      nokta.hesaplananGelir += satis.gelir;
    } else nokta.hesaplanamayanAdet++;
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
    /** Satış tarafıyla AYNI kalıp: pay ve payda tek dalda. */
    if (hesaplandi(iade.durum, iade.net2)) {
      nokta.net2 += iade.net2;
      nokta.hesaplananIadeTutari += iade.iadeTutari;
    } else nokta.hesaplanamayanIadeAdedi++;
    if (hesaplandi(iade.durum, iade.net1)) nokta.net1 += iade.net1;
  }

  return noktalar;
}
