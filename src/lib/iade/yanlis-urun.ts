import type { Currency, StockMovementType } from "@/generated/prisma/enums";

/**
 * ============================================================================
 *  6. SENARYO — YANLIŞ ÜRÜN GÖNDERİLDİ (SAF DEFTER PLANI)
 * ----------------------------------------------------------------------------
 *  VAKA: A satıldı, depoda B gönderildi. Müşteri B'yi geri yolluyor, biz A'yı
 *  gönderiyoruz. Defterde iki varyant birlikte düzeltilir; TEK İŞLEMDE.
 *
 *  BEŞ HAREKET, İKİ TARAF (onaylı tasarım):
 *
 *    SATILAN A :  SALE_OUT −1   (satışta zaten yazılmıştı)
 *                 DÜZELTME +1   ← "A aslında hiç gitmemişti, deftere geri koy"
 *                 EXCHANGE_OUT −1  ← "A şimdi gerçekten gidiyor"
 *                 ─────────────────────────────────────────────
 *                 NET −1        (A bir adet çıktı; doğru sonuç)
 *
 *    YANLIŞ GİDEN B :  DÜZELTME −1  ← "B fiilen gitti ama defterde çıkmadı"
 *                      RETURN_IN +1 ← "B sağlam döndü, stoğa girdi"
 *                      ─────────────────────────────────────────
 *                      NET 0        (B hiç kalıcı olarak çıkmadı)
 *
 *  DÜZELTMELER NEDENE ADIYLA DEĞİL `systemKey` İLE BAĞLANIR
 *  (`SEVKIYAT_HATASI`): neden adı kullanıcıya aittir ve "Neden yönetimi"
 *  ekranından değiştirilebilir. Koda ad gömülse, kullanıcı adı düzelttiği an
 *  sevkiyat hatası düzeltmesi sessizce çalışmaz olurdu.
 *
 *  ⚠ ASIL TUZAK — MALİYET. `DÜZELTME +1` FIFO'da YENİ BİR PARTİ doğurur.
 *  O partinin maliyeti kullanıcıya SORULMAZ; ters çevirdiği `SALE_OUT`
 *  hareketinin maliyet damgasıyla BİREBİR aynı olmak zorundadır. Aksi hâlde
 *  parti `NO_COST` doğar, o mal bir sonraki satışta "kâr hesaplanamadı" der
 *  ve depo hatasını düzeltmek kâr motorunu bozar.
 *  _Mimar kilidi 14.08.2026: test bunu kesin rakamla doğrular._
 *
 *  ÇOK PARTİLİ SATIŞ: bir SALE_OUT birden fazla partiden düşmüş olabilir
 *  (FIFO). O zaman parti başına AYRI bir `DÜZELTME +` yazılır ve her biri
 *  kendi partisinin maliyetini taşır. Tek satırda ortalama maliyet yazmak,
 *  iki farklı maliyetli malı tek fiyata eşitlemek olurdu.
 *
 *  Bu dosya veritabanına GİTMEZ: FIFO kırılımlarını çağıran hesaplar, biz
 *  yalnız planı kurar ve tutarlılığını doğrularız (`rma:dogrula`).
 * ============================================================================
 */

/** Bir hareketin parti kırılımı — hangi partiden kaç adet, hangi maliyetle. */
export type PartiDusumu = {
  /** Partiyi doğuran hareketin kimliği (PURCHASE_IN / INITIAL / ADJUSTMENT+). */
  partiHareketId: string;
  adet: number;
  /** Decimal METİN olarak taşınır — float'a çevrilmez (anayasa). */
  birimMaliyet: string | null;
  paraBirimi: Currency | null;
};

export type YanlisUrunGirdisi = {
  /** A — satılan (fatura edilen) varyant. */
  satilanVaryantId: string;
  /** B — yanlışlıkla gönderilen ve geri dönen varyant. */
  donenVaryantId: string;
  /**
   * A'nın SALE_OUT parti kırılımı — TERS ÇEVRİLECEK olan.
   * Maliyetler buradan kopyalanır; kilit budur.
   */
  satisDusumleri: PartiDusumu[];
  /** A şimdi gönderiliyor: EXCHANGE_OUT'un FIFO kırılımı. */
  degisimDusumleri: PartiDusumu[];
  /** B'nin defterden çıkışı: DÜZELTME −'nin FIFO kırılımı. */
  yanlisGidenDusumleri: PartiDusumu[];
  /**
   * B'nin SAĞLAM gelen adedi. Hasarlı kısım stoğa GİRMEZ (maliyeti
   * satıcıda kalır, tazminat süreci ayrı işler) — o yüzden RETURN_IN
   * yalnız bu adet kadar yazılır.
   */
  saglamAdet: number;
};

export type PlanliHareket = {
  tip: StockMovementType;
  variantId: string;
  /** İşaret ANLAMLIDIR: giriş +, çıkış −. */
  quantityDelta: number;
  birimMaliyet: string | null;
  paraBirimi: Currency | null;
  /** Hangi hareketten türedi — parti izi / ters çevirme izi. */
  kaynakHareketId: string | null;
  /** ADJUSTMENT'ların bağlanacağı neden; diğer tiplerde null. */
  sistemNedeni: "SEVKIYAT_HATASI" | null;
};

export type YanlisUrunPlani = {
  hareketler: PlanliHareket[];
  /**
   * DEFTER NETİ — satıştaki SALE_OUT DAHİL.
   * Beklenen: satılan varyant −adet, dönen varyant 0 (sağlam döndüyse).
   */
  defterNeti: { satilan: number; donen: number };
  hatalar: YanlisUrunHatasi[];
};

export type YanlisUrunHatasi =
  | "AYNI_VARYANT"
  | "SATIS_DUSUMU_YOK"
  | "ADET_UYUSMUYOR"
  | "MALIYETSIZ_SATIS_DUSUMU"
  | "SAGLAM_ADET_FAZLA";

const toplamAdet = (dusumler: PartiDusumu[]) =>
  dusumler.reduce((t, d) => t + d.adet, 0);

/**
 * Planı kurar ve tutarlılığını doğrular. HİÇBİR ŞEY YAZMAZ.
 *
 * Hata varsa `hareketler` BOŞ döner: yarım plan yazıma gitmesin.
 */
export function yanlisUrunPlani(girdi: YanlisUrunGirdisi): YanlisUrunPlani {
  const hatalar: YanlisUrunHatasi[] = [];

  /**
   * AYNI VARYANT = 6. SENARYO DEĞİL. Dönen ürün satılanla aynıysa bu
   * sıradan bir iade/değişimdir ve mevcut akış onu zaten doğru işliyor.
   * Burada işlenirse gereksiz iki düzeltme hareketi yazılır.
   */
  if (girdi.satilanVaryantId === girdi.donenVaryantId) {
    hatalar.push("AYNI_VARYANT");
  }

  const satisAdedi = toplamAdet(girdi.satisDusumleri);
  if (girdi.satisDusumleri.length === 0 || satisAdedi <= 0) {
    hatalar.push("SATIS_DUSUMU_YOK");
  }

  /**
   * MALİYETSİZ SATIŞ DÜŞÜMÜ PLANI DURDURUR. Maliyeti bilinmeyen bir
   * SALE_OUT'u ters çevirmek, maliyetsiz bir parti doğurmak demektir;
   * o parti sonraki satışta `NO_COST` üretir. Sebep ekranda söylenir,
   * sessizce sıfır maliyet YAZILMAZ.
   */
  if (girdi.satisDusumleri.some((d) => d.birimMaliyet === null)) {
    hatalar.push("MALIYETSIZ_SATIS_DUSUMU");
  }

  // Üç kırılım da aynı adedi anlatmalı: A geri kondu, A gitti, B çıktı.
  if (
    toplamAdet(girdi.degisimDusumleri) !== satisAdedi ||
    toplamAdet(girdi.yanlisGidenDusumleri) !== satisAdedi
  ) {
    hatalar.push("ADET_UYUSMUYOR");
  }

  if (girdi.saglamAdet < 0 || girdi.saglamAdet > satisAdedi) {
    hatalar.push("SAGLAM_ADET_FAZLA");
  }

  if (hatalar.length > 0) {
    return {
      hareketler: [],
      defterNeti: { satilan: 0, donen: 0 },
      hatalar,
    };
  }

  const hareketler: PlanliHareket[] = [];

  // --- 1) A: DÜZELTME + — parti başına, MALİYET BİREBİR KOPYALANIR ---
  for (const d of girdi.satisDusumleri) {
    hareketler.push({
      tip: "ADJUSTMENT",
      variantId: girdi.satilanVaryantId,
      quantityDelta: d.adet,
      // KİLİT: ters çevrilen SALE_OUT'un maliyeti, olduğu gibi.
      birimMaliyet: d.birimMaliyet,
      paraBirimi: d.paraBirimi,
      kaynakHareketId: d.partiHareketId,
      sistemNedeni: "SEVKIYAT_HATASI",
    });
  }

  // --- 2) A: EXCHANGE_OUT − (gelir yok, maliyet var) ---
  for (const d of girdi.degisimDusumleri) {
    hareketler.push({
      tip: "EXCHANGE_OUT",
      variantId: girdi.satilanVaryantId,
      quantityDelta: -d.adet,
      birimMaliyet: d.birimMaliyet,
      paraBirimi: d.paraBirimi,
      kaynakHareketId: d.partiHareketId,
      sistemNedeni: null,
    });
  }

  // --- 3) B: DÜZELTME − (fiilen gitmişti, defterde duruyordu) ---
  for (const d of girdi.yanlisGidenDusumleri) {
    hareketler.push({
      tip: "ADJUSTMENT",
      variantId: girdi.donenVaryantId,
      quantityDelta: -d.adet,
      birimMaliyet: d.birimMaliyet,
      paraBirimi: d.paraBirimi,
      kaynakHareketId: d.partiHareketId,
      sistemNedeni: "SEVKIYAT_HATASI",
    });
  }

  /**
   * --- 4) B: RETURN_IN + (yalnız SAĞLAM adet) ---
   *
   * MALİYET, B'NİN ÇIKIŞ MALİYETİNİN AYNASI: aynı partilerden çıktı, aynı
   * maliyetle geri giriyor. Yeni bir maliyet uydurulsaydı aynı mal defterde
   * iki farklı değerle durur ve envanter değeri sessizce kayardı.
   *
   * Sağlam adet çıkıştan azsa (kısmen hasarlı) kırılım SIRAYLA doldurulur;
   * hasarlı kısım hiç girmez.
   */
  let kalanSaglam = girdi.saglamAdet;
  for (const d of girdi.yanlisGidenDusumleri) {
    if (kalanSaglam <= 0) break;
    const adet = Math.min(d.adet, kalanSaglam);
    kalanSaglam -= adet;
    hareketler.push({
      tip: "RETURN_IN",
      variantId: girdi.donenVaryantId,
      quantityDelta: adet,
      birimMaliyet: d.birimMaliyet,
      paraBirimi: d.paraBirimi,
      kaynakHareketId: d.partiHareketId,
      sistemNedeni: null,
    });
  }

  // --- DEFTER NETİ: satıştaki SALE_OUT da sayılır ---
  const net = (variantId: string) =>
    hareketler
      .filter((h) => h.variantId === variantId)
      .reduce((t, h) => t + h.quantityDelta, 0);

  return {
    hareketler,
    defterNeti: {
      // Plan A'ya +adet ve −adet yazıyor; satıştaki −adet buna eklenir.
      satilan: net(girdi.satilanVaryantId) - satisAdedi,
      donen: net(girdi.donenVaryantId),
    },
    hatalar: [],
  };
}

/**
 * MALİYET KİLİDİ — plan yazıma gitmeden önce sınanır.
 *
 * Her `DÜZELTME +` hareketinin maliyeti, ters çevirdiği `SALE_OUT` parti
 * düşümünün maliyetiyle BİREBİR aynı mı? Bu kontrol testte de, yazım
 * yolunda da çağrılır: mimar kilidi (14.08.2026) burada somutlaşıyor.
 */
export function maliyetKilidiTutuyorMu(
  girdi: YanlisUrunGirdisi,
  plan: YanlisUrunPlani,
): boolean {
  const duzeltmeler = plan.hareketler.filter(
    (h) =>
      h.tip === "ADJUSTMENT" &&
      h.variantId === girdi.satilanVaryantId &&
      h.quantityDelta > 0,
  );
  if (duzeltmeler.length !== girdi.satisDusumleri.length) return false;

  return girdi.satisDusumleri.every((d, i) => {
    const h = duzeltmeler[i];
    return (
      h.quantityDelta === d.adet &&
      h.birimMaliyet === d.birimMaliyet &&
      h.paraBirimi === d.paraBirimi &&
      h.kaynakHareketId === d.partiHareketId
    );
  });
}
