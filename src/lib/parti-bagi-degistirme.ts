import type { Currency } from "@/generated/prisma/enums";

/**
 * ============================================================================
 *  SATIŞIN BAĞLI OLDUĞU PARTİYİ DEĞİŞTİRME — SAF KURAL (K376, 10.11.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ NİYE DOĞDU: kullanıcı `4677180498` numaralı satışın detayında duran
 *  `ALM-HB-260201-02` partisini gösterip _«Bunun maliyeti yanlış seçtim
 *  değiştiremiyorum»_ dedi. Hangi şeyin yanlış olduğu soruldu ve cevap
 *  **«yanlış PARTİ seçildi»** çıktı — yani partinin maliyeti doğru, satış
 *  yanlış partiye bağlanmış.
 *
 *  ⚠ VE BU AYRIM İŞİN TAMAMINI DEĞİŞTİRİR. Ekranda duran tek düğme
 *  «Maliyeti düzelt»ti (K127) ve o düğme **partinin KENDİ maliyetini**
 *  değiştirir — yani o partiden çeken BÜTÜN satışları birden etkiler.
 *  Yanlış parti seçilmiş bir satışı onunla «düzeltmek», doğru olan öteki
 *  satışları bozardı. _(Anayasa: "ilke, kendi kapsamının dışına uygulanırsa
 *  koruduğu şey doğruluk değil hatanın kendisi olur".)_
 *
 *  ── NEYE DOKUNUR, NEYE DOKUNMAZ ────────────────────────────────────────
 *  DOKUNUR  : çıkış hareketinin `sourceMovementId`si (hangi partiden) ve
 *             o çıkışın maliyet DAMGASI (yeni partinin birim maliyeti).
 *  DOKUNMAZ : adet · satış tarihi · partilerin kendisi · ledger toplamı.
 *             Stok miktarı DEĞİŞMEZ; değişen yalnız malın hangi partiden
 *             düştüğü. Adet düzeltmesi hâlâ ters işaretli `ADJUSTMENT` işi.
 *
 *  ── ⛔ KAPASİTE SATIR BAZINDA DEĞİL, KÜME BAZINDA SORULUR (K91 DERSİ) ──
 *  01.09.2026: bir bağ onarımında 64 satırın her biri tek başına geçerli
 *  bir hedef buluyordu; yazıldığında **32 parti aşırı tüketildi** (toplam
 *  64 adet aşım). Bu yüzden hedefin KALAN adedi okunur ve çıkışın adedini
 *  karşılamıyorsa yazım reddedilir — hedef listesi de aynı ölçütle süzülür,
 *  yani kullanıcı zaten taşıyamayacak bir partiyi seçemez.
 *  ⚠ Ölçüt İKİ yerde aynı: liste süzgeci ile yazma kapısı aynı gövdeden
 *  geçer; iki ayrı ölçüt olsa biri ötekinin yazdığını göremezdi.
 *
 *  ── ⛔ FIFO TARİH SINIRI GEVŞETİLMEZ ───────────────────────────────────
 *  29.08.2026: geçmiş satışlar GELECEĞİN partisini yiyordu (809 bağ) ve
 *  çare `occurredAt < gunSonu(soldAt)` oldu — aynı gün alıp aynı gün satmak
 *  defterin %48,72'si olduğu için sınır gün SONUNA kondu, operatör `lt`
 *  yerinde kaldı. Elle parti değiştirmek o sınırın arka kapısı OLAMAZ:
 *  sınır çağırandan `sinir` olarak gelir (aktarılan siparişte çekim günü —
 *  K314) ve hedef onu aşıyorsa reddedilir.
 *
 *  ⛔ SAF: veritabanına gitmez, tarih üretmez, `Date.now()` çağırmaz.
 *  Bekçi bu gövdeyi ÇAĞIRIP değerini ölçer; kaynak taramaz.
 * ============================================================================
 */

/** Partisi değiştirilecek çıkış hareketi — okunmuş hâli. */
export type DegistirilecekCikis = {
  hareketId: string;
  /** Çıkışın adedi — POZİTİF sayı olarak (ledger'da negatif durur). */
  adet: number;
  variantId: string;
  /** Şu an bağlı olduğu parti; `null` ise hiçbir partiye bağlı değil. */
  mevcutPartiId: string | null;
  mevcutMaliyet: string | null;
  saleId: string | null;
};

/** Hedef parti — `tuketilecekPartiler`in döndürdüğü hâlin gereken kısmı. */
export type HedefParti = {
  hareketId: string;
  variantId: string;
  occurredAt: Date;
  /** Partiden geriye kalan adet — bu çıkış HARİÇ hesaplanmış olmalı. */
  kalanAdet: number;
  birimMaliyet: string | null;
  birimMaliyetParaBirimi: Currency | null;
};

/**
 * ⛔ KAPALI KÜME — serbest metin hata YOK. Ekran bu kodları sözlükten
 * cümleye çevirir; ham hata metni basmak hem kullanıcıya bir şey anlatmaz
 * hem iç ayrıntı sızdırır. _(Anayasa: hata koda çevrilir, mesaja değil.)_
 */
export type PartiDegisimReddi =
  /** Hareket bir ÇIKIŞ değil (adet ≤ 0) — partinin kendisi taşınmaz. */
  | "CIKIS_DEGIL"
  /** Hedef parti bulunamadı ya da seçilmedi. */
  | "HEDEF_YOK"
  /** Hedef, çıkışın HÂLİHAZIRDA bağlı olduğu parti. */
  | "AYNI_PARTI"
  /** Hedef parti başka bir varyanta ait. */
  | "FARKLI_VARYANT"
  /** Hedef, satışın FIFO tarih sınırını aşıyor (satıştan sonra giren mal). */
  | "TARIH_SINIRI"
  /** Hedefin kalan adedi bu çıkışı karşılamıyor (K91). */
  | "KAPASITE_YETERSIZ"
  /** Sebep yazılmadı. */
  | "SEBEP_BOS";

export type PartiDegisimPlani = {
  /** `false` ise `redler` doludur ve HİÇBİR ŞEY yazılmaz. */
  yazilabilir: boolean;
  redler: PartiDegisimReddi[];
  eskiPartiId: string | null;
  yeniPartiId: string | null;
  adet: number;
  eskiMaliyet: string | null;
  yeniMaliyet: string | null;
  /** Hedefin kalan adedi — reddin SEBEBİ rakamla yazılabilsin diye. */
  hedefKalanAdet: number | null;
  /**
   * Maliyet farkının bu çıkışa toplam etkisi. Pozitifse maliyet ARTIYOR,
   * yani kâr O KADAR DÜŞECEK.
   *
   * ⛔ `null` ile `0` AYRI ŞEY: `0` "ölçtüm, fark yok" der; `null` "iki
   * taraftan biri bilinmiyor, hesaplanamaz" der. Sıfıra düşürmek,
   * hesaplanamayan bir farkı «fark yok» diye göstermek olurdu.
   * _(Anayasa: varsayılan değer alanın anlamından türetilir.)_
   */
  maliyetFarkiToplam: number | null;
  /**
   * Yeni partinin maliyeti YOK — satışın kârı `NO_COST`a düşecek. Engel
   * DEĞİL (parti gerçekten maliyetsiz olabilir: bedava gelen mal) ama
   * önizleme bunu AÇIKÇA söyler; sessizce NET'i düşürmek sürpriz olurdu.
   */
  maliyetBilinmezOlacak: boolean;
  /** Kârı tazelenecek satış — tek çıkış taşındığı için en çok bir tane. */
  tazelenecekSatislar: string[];
};

/** Kuruşa yuvarlar — `Decimal` ↔ float kuyruğu karşılaştırmayı bozmasın. */
function kurus(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * HEDEF OLABİLECEK PARTİLERİ SÜZ — ekranın listesi buradan gelir.
 *
 * ⚠ YAZMA KAPISIYLA AYNI ÖLÇÜT: `partiDegisimPlani` her hedefi yine tek tek
 * sınar. Liste burada süzülüyor ki kullanıcı yazılamayacak bir seçenek
 * görmesin — ama tek doğruluk kaynağı plan gövdesidir.
 */
export function degistirilebilirHedefler(g: {
  cikis: DegistirilecekCikis;
  partiler: readonly HedefParti[];
  sinir: Date;
}): HedefParti[] {
  return g.partiler.filter(
    (p) =>
      p.variantId === g.cikis.variantId &&
      p.hareketId !== g.cikis.mevcutPartiId &&
      p.occurredAt < g.sinir &&
      p.kalanAdet >= g.cikis.adet,
  );
}

/**
 * PLANI KUR — YAZMADAN ÖNCE NE OLACAĞINI SÖYLER.
 *
 * `hedef` `null` olabilir: kullanıcı henüz seçmediyse `HEDEF_YOK` döner ve
 * ekran bunu yazar (İlke #5 — kilitli düğme sessiz kalmaz).
 */
export function partiDegisimPlani(g: {
  cikis: DegistirilecekCikis;
  hedef: HedefParti | null;
  /** FIFO üst sınırı — `satisStokZamani(...).sinir`. */
  sinir: Date;
  sebep: string;
}): PartiDegisimPlani {
  const redler: PartiDegisimReddi[] = [];
  const { cikis, hedef } = g;

  /**
   * ⛔ YALNIZ ÇIKIŞ TAŞINIR. Partinin kendisini (pozitif hareketi) başka bir
   * partiye bağlamak anlamsızdır ve `sourceMovementId` zincirini bozardı.
   * K127'nin aynası: orada `quantityDelta <= 0` reddediliyor, burada > 0.
   */
  if (cikis.adet <= 0) redler.push("CIKIS_DEGIL");

  /** ⛔ SEBEP ZORUNLU — üç ay sonra "bu bağ niye değişmiş" sorusunun cevabı. */
  if (g.sebep.trim() === "") redler.push("SEBEP_BOS");

  if (hedef === null) {
    redler.push("HEDEF_YOK");
  } else {
    if (hedef.hareketId === cikis.mevcutPartiId) redler.push("AYNI_PARTI");
    if (hedef.variantId !== cikis.variantId) redler.push("FARKLI_VARYANT");
    /** ⚠ `<` KORUNUR, SINIRIN DEĞERİ GÜN SONUDUR (29.08.2026 ölçümü). */
    if (!(hedef.occurredAt < g.sinir)) redler.push("TARIH_SINIRI");
    /** ⛔ K91 — küme bazında kapasite. */
    if (hedef.kalanAdet < cikis.adet) redler.push("KAPASITE_YETERSIZ");
  }

  const eski = cikis.mevcutMaliyet === null ? null : Number(cikis.mevcutMaliyet);
  const yeni =
    hedef === null || hedef.birimMaliyet === null
      ? null
      : Number(hedef.birimMaliyet);

  return {
    yazilabilir: redler.length === 0,
    redler,
    eskiPartiId: cikis.mevcutPartiId,
    yeniPartiId: hedef?.hareketId ?? null,
    adet: cikis.adet,
    eskiMaliyet: cikis.mevcutMaliyet,
    yeniMaliyet: hedef?.birimMaliyet ?? null,
    hedefKalanAdet: hedef?.kalanAdet ?? null,
    maliyetFarkiToplam:
      eski === null ||
      yeni === null ||
      !Number.isFinite(eski) ||
      !Number.isFinite(yeni)
        ? null
        : kurus((yeni - eski) * cikis.adet),
    maliyetBilinmezOlacak: hedef !== null && hedef.birimMaliyet === null,
    tazelenecekSatislar: cikis.saleId === null ? [] : [cikis.saleId],
  };
}

/**
 * EKRANA GİDEN HEDEF SATIRI.
 *
 * ⚠ TARİH `string` (ISO) — sunucu eylemi istemciye `Date` taşıyamaz; biçim
 * istemcide `useBicim()` ile kurulur (anayasa: `Intl.*` doğrudan YASAK).
 * ⚠ VE `alimKodu` ZORUNLU ALAN DEĞİL ama LİSTEDE: parti kimliği kullanıcıya
 * hiçbir şey anlatmaz; o partiyi `ALM-HB-260201-02` diye tanıyor (İlke #3).
 */
export type PartiHedefi = {
  hareketId: string;
  girisTarihi: string;
  kalanAdet: number;
  birimMaliyet: string | null;
  paraBirimi: string | null;
  alimKodu: string | null;
};

export type PartiHedefCevabi =
  | { durum: "TAMAM"; hedefler: PartiHedefi[]; mevcutPartiId: string | null }
  | { durum: "HATA"; mesaj: string };

/**
 * ⛔ İZ EYLEMİ VE DURUM TİPİ BURADA — `"use server"` DOSYASINDA DEĞİL.
 * 30.08.2026 vakası: bir `"use server"` dosyasındaki TEK sabit o dosyanın
 * BÜTÜN dışa aktarımlarını düşürdü ve üç ekran canlıda hiç çizilmedi.
 */
export const PARTI_BAGI_DEGISIM_EYLEMI = "SATIS_PARTI_BAGI_DEGISTIRILDI";

export type PartiBagiDurumu = {
  hatalar?: string[];
  basari?: string;
  /** Önizleme sonrası gösterilen özet — yazım YAPILMADI. */
  onizleme?: {
    eskiParti: string | null;
    yeniParti: string;
    eskiMaliyet: string | null;
    yeniMaliyet: string | null;
    adet: number;
    /** `null` = hesaplanamadı (bir taraf bilinmiyor). */
    fark: number | null;
    maliyetBilinmezOlacak: boolean;
  };
};
