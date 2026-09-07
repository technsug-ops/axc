import type { SatisKalemKaldirmaSebebi } from "@/generated/prisma/enums";

/**
 * ============================================================================
 *  SATIŞ KALEMİ KALDIRMA — SAF MEKANİK (K78, 07.09.2026)
 * ----------------------------------------------------------------------------
 *  Halil: _"müşteri satışlarında birini iptal etmek isteyebilir; 3 örnek 3
 *  ürün alır, bir tanesini beğenmez geri gönderir, diğerlerini tutar."_
 *
 *  ⛔ AMA O CÜMLENİN İKİ AYRI KARŞILIĞI VAR VE BU GÖVDE YALNIZ BİRİNİ YAPAR.
 *
 *  ── KALDIRMA, İADE DEĞİLDİR ─────────────────────────────────────────────
 *  · Müşteri aldı, beğenmedi, GERİ GÖNDERDİ  → **İADE**. Mal gerçekten
 *    satıldı: para girdi, KDV matrahına girdi, komisyon kesildi, kargo yandı
 *    ve sonra düzeltildi. Defter bunların hepsini yazmak zorunda.
 *  · O satır **HİÇ SATILMADI** — içe aktarma aynı satırı iki kez yazdı, ya da
 *    elle girişte yanlış kalem eklendi → **KALDIRMA**. Ortada ne para var,
 *    ne komisyon, ne kargo; olmamış bir olayın kaydı var.
 *
 *  Halil'in tarif ettiği vaka BİRİNCİSİDİR ve **zaten çalışıyor** (ölçüldü
 *  07.09.2026: `11399165160` satılan 2 · iade 1; ayrıca 3 kalemli satışta tek
 *  kalemin iadesi 5 vakada var). İadeyi bu yoldan geçirmek, olmamış bir
 *  alışverişi deftere yazıp sonra geri almak olurdu: ciro şişer, KDV matrahı
 *  şişer, hakediş beklentisi doğar ve hepsi geri alınır — TOPLAM TUTAR ama
 *  defter YALAN SÖYLER. Ayrımı `SatisKalemKaldirmaSebebi` enumu YAPISAL
 *  olarak koruyor: listede müşteri iadesi seçeneği YOKTUR.
 *
 *  ── LEDGER SİLİNMEZ (anayasa) ───────────────────────────────────────────
 *  `SALE_OUT` hareketi DURUR; kaldırma ters işaretli `SALE_CANCEL_IN` ile
 *  yapılır. Kalemi gerçekten silmek `StockMovement.saleItemId`i **SetNull**
 *  yapar ve hareket sahipsiz kalır: _"stok düşük kalır, DÜŞÜREN KAYBOLUR"_.
 *
 *  ⛔ VE `sourceMovementId` YAZILMAZ — ÖLÇÜLDÜ 30.08.2026 (K96, satış iptali):
 *  pozitif hareket `acikPartiler` tarafından YENİ PARTİ sayılır; üstüne kaynak
 *  bağı da taşırsa eski partinin tüketimini geri alır ve aynı adet FIFO'ya
 *  **iki kez** girer (ledger 1, FIFO 2). Defterdeki 14 `SALE_CANCEL_IN`in
 *  ayrışan tam 2'si bu alanı dolu olanlardı. Kaldırma aynı deseni izler.
 *
 *  ── NİYE İPTALİN AYNISI DEĞİL DE AYRI GÖVDE ─────────────────────────────
 *  İptal SATIŞIN tamamını "hiç doğmamış" sayar; kaldırma TEK SATIRI sayar ve
 *  satışın geri kalanı ayakta kalır — ciro, NET, komisyon ve hakediş beklentisi
 *  kalan kalemler üstünden yeniden hesaplanır. İki soru ayrı, iki ölçüt ayrı.
 * ============================================================================
 */

/**
 * TAKSONOMİ — ekranın çizeceği sıra; en sık olan başa.
 *
 * ⛔ BU LİSTE MÜŞTERİ İADESİ TAŞIMAZ ve taşımaması bir KORUMA'dır: sebep
 * kutusunda "müşteri iade etti" seçeneği olsaydı operatör en yakın kelimeyi
 * seçer ve gerçek bir satış deftere hiç olmamış gibi geçerdi.
 */
export const KALDIRMA_SEBEPLERI: readonly SatisKalemKaldirmaSebebi[] = [
  "MUKERRER_SATIR",
  "HATALI_GIRIS",
];

export type KaldirmaEngeli =
  /** Kalem zaten kaldırılmış — ikinci kez kaldırılırsa stok iki kez girer. */
  | "ZATEN_KALDIRILDI"
  /** Satış iptal edilmiş: stok zaten geri döndü, üstüne yazmak çift giriş olur. */
  | "SATIS_IPTAL"
  /** Bu kalemin iadesi var — iade "gerçekten satıldı" der, kaldırma tersini. */
  | "IADE_VAR"
  /** Son geçerli kalem: kaldırılırsa cirosuz bir satış kalır. Doğrusu İPTAL. */
  | "SON_KALEM"
  | "SEBEP_YOK";

/** Kaldırılacak kalemin açık çıkışı — stoğa geri dönecek mal. */
export type KalemCikisi = {
  variantId: string;
  /** Açık kalan adet (ledger'da negatif; burada POZİTİF beklenir). */
  adet: number;
  birimMaliyet: string | null;
  birimMaliyetParaBirimi: string | null;
  locationId: string | null;
};

/** Kaldırmanın para tarafındaki etkisi — onaydan ÖNCE ekranda durur. */
export type KaldirmaEtkisi = {
  /** Bu kalemin KDV dahil cirosu — satış cirosundan düşecek tutar. */
  ciro: number;
  /** Kalemin NET-2 damgası; hesaplanamamışsa null ("?" gösterilir). */
  net2: number | null;
  paraBirimi: string;
  /** Kaldırma sonrası satışta kalacak geçerli kalem sayısı. */
  kalanKalemSayisi: number;
};

export type KaldirmaGirdisi = {
  kaldirilmisMi: boolean;
  satisIptalliMi: boolean;
  /** Bu KALEME bağlı iade adedi (satışın tamamına değil). */
  kalemIadeAdedi: number;
  /** Satıştaki geçerli (kaldırılmamış) kalem sayısı — bu kalem DAHİL. */
  gecerliKalemSayisi: number;
  sebep: SatisKalemKaldirmaSebebi | null;
  not: string | null;
  cikislar: KalemCikisi[];
  etki: KaldirmaEtkisi;
};

export type YazilacakHareket = {
  variantId: string;
  /** POZİTİF — stoğa geri giriyor. */
  quantityDelta: number;
  birimMaliyet: string | null;
  birimMaliyetParaBirimi: string | null;
  locationId: string | null;
};

export type KaldirmaPlani =
  | { olur: false; engel: KaldirmaEngeli }
  | {
      olur: true;
      hareketler: YazilacakHareket[];
      geriDonenAdet: number;
      /**
       * ONAYDAN ÖNCE GÖSTERİLİR: kullanıcı neyin düşeceğini görmeden
       * onaylamaz (satış iptalinde kurulan desenin aynısı).
       */
      etki: KaldirmaEtkisi;
    };

/**
 * Kaldırılabilir mi, kaldırılırsa hangi hareketler yazılır.
 *
 * HİÇBİR ŞEY YAZMAZ — çağıran önce gösterir, kullanıcı onaylar, sonra yazılır.
 */
export function kaldirmaPlani(girdi: KaldirmaGirdisi): KaldirmaPlani {
  // İkinci kaldırma stoğu İKİ KEZ geri sokar.
  if (girdi.kaldirilmisMi) return { olur: false, engel: "ZATEN_KALDIRILDI" };

  /**
   * ⛔ İPTAL EDİLMİŞ SATIŞTA KALDIRMA YAPILMAZ. İptal zaten bütün açık
   * çıkışların aynasını yazdı; kalem üstüne ikinci bir ayna yazmak aynı malı
   * iki kez stoğa sokardı. Ve gereksiz: iptalli satış zaten hiçbir rakama
   * girmiyor, içindeki bir satırı ayrıca kaldırmanın karşılığı yok.
   */
  if (girdi.satisIptalliMi) return { olur: false, engel: "SATIS_IPTAL" };

  /**
   * ⛔ İADESİ OLAN KALEM KALDIRILAMAZ — İKİ KAYIT BİRBİRİYLE ÇELİŞİR.
   * İade "bu mal gerçekten satıldı ve döndü" der; kaldırma "hiç satılmadı"
   * der. Teknik sonucu daha da sert: iade `RETURN_IN` ile stoğu çoktan geri
   * getirdi, üstüne kaldırma aynası yazmak envanteri sessizce şişirirdi.
   */
  if (girdi.kalemIadeAdedi > 0) return { olur: false, engel: "IADE_VAR" };

  /**
   * ⛔ SON KALEM KALDIRILAMAZ — DOĞRU YOL İPTALDİR.
   *
   * Kaldırılsaydı geriye kalemsiz bir satış kalırdı: ciro 0, NET 0, ama
   * `iptalTarihi` boş olduğu için hâlâ "açık satış" sayılır; kargo bekleyen
   * kovasında durur, hakediş eşleştirmesine girer ve listede sıfır liralık bir
   * satır olarak yaşar. _(Anayasa: "adsız satır yazılmaz" ve "seçenek
   * sunulurken geri alınabilir olan öne konur" — iptalin geri alma yolu VAR.)_
   */
  if (girdi.gecerliKalemSayisi <= 1) return { olur: false, engel: "SON_KALEM" };

  if (girdi.sebep === null) return { olur: false, engel: "SEBEP_YOK" };

  const hareketler: YazilacakHareket[] = girdi.cikislar
    // Sıfır adetli hareket yazılmaz — boş satır defteri kirletir.
    .filter((c) => c.adet > 0)
    .map((c) => ({
      variantId: c.variantId,
      quantityDelta: c.adet,
      // AYNA: çıkışın maliyeti aynen geri girer, yeni maliyet UYDURULMAZ.
      birimMaliyet: c.birimMaliyet,
      birimMaliyetParaBirimi: c.birimMaliyetParaBirimi,
      locationId: c.locationId,
    }));

  return {
    olur: true,
    hareketler,
    geriDonenAdet: hareketler.reduce((t, h) => t + h.quantityDelta, 0),
    etki: girdi.etki,
  };
}

/**
 * ============================================================================
 *  PLAN İMZASI — "ONAY GÖSTERİLENE VERİLMİŞTİR"
 * ----------------------------------------------------------------------------
 *  Yazma anında plan YENİDEN kurulur ve imzası ekranın onayladığı imzayla
 *  karşılaştırılır. Farklıysa yazma DURUR: önizleme açıldıktan sonra o kaleme
 *  iade girilmiş, satış iptal edilmiş ya da adedi değiştirilmiş olabilir.
 *  Sessizce YENİ plana göre stok yazmak, kullanıcının onaylamadığı bir işlemi
 *  onaylamış saymaktır. _(Satış iptalinde kurulup denenen desenin aynısı.)_
 * ============================================================================
 */
export function kaldirmaImzasi(plan: KaldirmaPlani): string {
  if (!plan.olur) return `ENGEL:${plan.engel}`;
  const parcalar = plan.hareketler
    .map(
      (h) =>
        `${h.variantId}|${h.quantityDelta}|${h.birimMaliyet ?? ""}|${h.locationId ?? ""}`,
    )
    .sort();
  return [
    ...parcalar,
    `ADET:${plan.geriDonenAdet}`,
    `CIRO:${plan.etki.ciro}`,
    `NET:${plan.etki.net2 ?? "yok"}`,
    `KALAN:${plan.etki.kalanKalemSayisi}`,
  ].join("§");
}

/**
 * ============================================================================
 *  GERİ ALMA — YIKICI EYLEMİN DÖNÜŞ YOLU
 * ----------------------------------------------------------------------------
 *  ⚠ GERİ ALMA DA BİR YAZIMDIR ve kendi kapısı vardır: kaldırma anında stoğa
 *  dönen mal ARADA SATILMIŞ olabilir. Stoğu tekrar düşürmek eksi stok üretir —
 *  o yüzden geri alma, kaldırma aynasının HÂLÂ AÇIK olmasını şart koşar.
 *
 *  ⭐ ÖLÇÜT YENİDEN HESAPLANABİLİR: "hangi hareketi yazmıştım" listesi hiçbir
 *  yerde SAKLANMAZ; ayna, kalemin kendi hareketlerinden `acikCikislar` ile
 *  bugün yeniden bulunur. _(Anayasa: "geri alma yolu saklanan listeye değil
 *  yeniden hesaplanabilir ölçüte dayanır" — 5595 satırlık `AuditLog.detail`
 *  yazıldığı anda kırpılmıştı ve geri alma yolu doğduğu anda bozuktu.)_
 * ============================================================================
 */
export type GeriAlmaEngeli =
  | "KALDIRILMAMIS"
  /** Kaldırma aynasıyla dönen mal bu arada satılmış/harcanmış. */
  | "AYNA_KAPANDI";

export type GeriAlmaPlani =
  | { olur: false; engel: GeriAlmaEngeli }
  | { olur: true; dusulecekAdet: number };

export function geriAlmaPlani(girdi: {
  kaldirilmisMi: boolean;
  /** Kaldırma aynasının HÂLÂ açık (tüketilmemiş) adedi. */
  acikAynaAdedi: number;
  /** Kaldırma anında yazılan aynanın toplam adedi. */
  aynaAdedi: number;
}): GeriAlmaPlani {
  if (!girdi.kaldirilmisMi) return { olur: false, engel: "KALDIRILMAMIS" };
  if (girdi.acikAynaAdedi < girdi.aynaAdedi) {
    return { olur: false, engel: "AYNA_KAPANDI" };
  }
  return { olur: true, dusulecekAdet: girdi.aynaAdedi };
}
