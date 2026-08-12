import type { Currency } from "@/generated/prisma/enums";

/**
 * ============================================================================
 *  STOK DÜZELTME — SAF HESAP
 * ----------------------------------------------------------------------------
 *  Satış, alım ve iade DIŞINDA kalan stok hareketleri: kırılma, kayıp, fire,
 *  sayım farkı. Bugüne kadar sisteme girmenin yolu yoktu — depoda kırılan mal
 *  defterde duruyordu.
 *
 *  İKİ YÖN, İKİ AYRI SORU:
 *
 *  EKSİ (mal gitti) — FIFO'dan maliyetiyle düşer. Kaybedilen para, o malın
 *  ALIŞ maliyetidir; satış fiyatı değil. Satılmadığı için gelir de yok.
 *
 *  ARTI (mal fazla çıktı) — yeni bir FIFO partisi doğar. Maliyeti kullanıcı
 *  girmezse parti NO_COST olur ve o mal satıldığında kâr "hesaplanamadı" der.
 *  Sıfır maliyet VARSAYILMAZ: bedava mal saymak kârı olduğundan yüksek
 *  gösterirdi.
 *
 *  KÂR TABLOSUNA GİRMEZ (kullanıcı kararı 12.08.2026): düzeltme bir satış
 *  değildir, NET-1/NET-2 hesabına karışmaz. Dönem raporunda AYRI bir kalem
 *  olarak GERÇEK NET'ten düşer — gider gibi davranır ama GİDER TABLOSUNA
 *  YAZILMAZ. Tek kaynak stok defteridir; çift kayıt olmaz.
 *
 *  LEDGER KURALI: hareket silinmez. Yanlış düzeltme, ters işaretli ikinci
 *  düzeltmeyle kapatılır.
 * ============================================================================
 */

export type DuzeltmeYonu = "EKSI" | "ARTI";

export type DuzeltmeGirdisi = {
  /** Her zaman POZİTİF adet; yön ayrı alanda. */
  adet: number;
  yon: DuzeltmeYonu;
  /** ARTI yönünde kullanıcının girdiği birim maliyet. Girilmezse null. */
  birimMaliyet: number | null;
  paraBirimi: Currency | null;
  /** Nedenin açıklama zorunluluğu var mı. */
  aciklamaZorunlu: boolean;
  aciklama: string;
};

export type DuzeltmeHatasi =
  | "ADET_SIFIR"
  | "ADET_TAM_SAYI_DEGIL"
  | "ACIKLAMA_ZORUNLU"
  | "MALIYET_NEGATIF"
  | "MALIYET_PARA_BIRIMSIZ";

/**
 * Girdiyi doğrular. Veritabanına gitmez — stok yeterliliği ayrı kontrol
 * edilir (o, ledger'ı okumayı gerektirir).
 */
export function duzeltmeyiDogrula(girdi: DuzeltmeGirdisi): DuzeltmeHatasi[] {
  const hatalar: DuzeltmeHatasi[] = [];

  if (!Number.isFinite(girdi.adet) || girdi.adet === 0) {
    hatalar.push("ADET_SIFIR");
  } else if (!Number.isInteger(girdi.adet) || girdi.adet < 0) {
    // Adet her zaman pozitif tam sayıdır; yönü kullanıcı ayrı seçer.
    // Eksi adet + EKSİ yön "iki kere eksi" tuzağı doğururdu.
    hatalar.push("ADET_TAM_SAYI_DEGIL");
  }

  if (girdi.aciklamaZorunlu && girdi.aciklama.trim() === "") {
    hatalar.push("ACIKLAMA_ZORUNLU");
  }

  if (girdi.birimMaliyet !== null) {
    if (girdi.birimMaliyet < 0) hatalar.push("MALIYET_NEGATIF");
    // Para birimsiz tutar anlamsızdır (anayasa: tutar + para birimi birlikte).
    if (girdi.paraBirimi === null) hatalar.push("MALIYET_PARA_BIRIMSIZ");
  }

  return hatalar;
}

/** Ledger'a yazılacak işaretli miktar. */
export function hareketMiktari(girdi: {
  adet: number;
  yon: DuzeltmeYonu;
}): number {
  return girdi.yon === "EKSI" ? -girdi.adet : girdi.adet;
}

// ---------------------------------------------------------------------------
//  DÖNEM ETKİSİ
// ---------------------------------------------------------------------------

/** Rapora giren tek bir düzeltme hareketi. */
export type DuzeltmeHareketi = {
  tarih: Date;
  /** Negatif = mal gitti, pozitif = mal fazla çıktı. */
  miktar: number;
  /** Birim maliyet — bilinmiyorsa null. */
  birimMaliyet: number | null;
  paraBirimi: Currency | null;
  /** ADJUSTMENT (fire) mi COUNT_CORRECTION (sayım farkı) mı. */
  tip: "ADJUSTMENT" | "COUNT_CORRECTION";
};

export type DuzeltmeOzeti = {
  paraBirimi: Currency;
  /** Fire/hasar/kayıp kaynaklı kayıp (POZİTİF sayı = kaybedilen para). */
  fireZarari: number;
  fireAdedi: number;
  /** Sayım farkı kaynaklı net etki (eksi çıktıysa pozitif = kayıp). */
  sayimZarari: number;
  sayimAdedi: number;
  /** Toplam — GERÇEK NET'ten düşülecek rakam. */
  toplamZarar: number;
  /**
   * Maliyeti bilinmediği için PARAYA ÇEVRİLEMEYEN adet.
   * Sıfır sayılmaz; ekranda ayrıca yazılır.
   */
  degeriBilinmeyenAdet: number;
};

/**
 * Dönem içindeki düzeltmelerin para etkisi.
 *
 * ZARAR POZİTİF SAYIDIR: "1.240,00 ₺ fire zararı" okunur ve GERÇEK NET'ten
 * düşülür. Eksi işaretli tutmak, rapordaki toplama işaretini iki kez
 * düşünmeyi gerektirirdi.
 *
 * ARTI YÖNLÜ düzeltme (sayım fazlası) zararı AZALTIR — o mal bedava
 * gelmedi, daha önce fazladan düşülmüş bir kaydın geri dönüşüdür.
 */
export function duzeltmeOzeti(
  hareketler: DuzeltmeHareketi[],
): DuzeltmeOzeti[] {
  const bloklar = new Map<Currency, DuzeltmeOzeti>();
  let bilinmeyenToplam = 0;

  for (const h of hareketler) {
    if (h.birimMaliyet === null || h.paraBirimi === null) {
      // Maliyeti bilinmeyen hareket paraya çevrilemez. Sıfır saymak,
      // kaybı hiç yaşanmamış gibi göstermek olurdu.
      bilinmeyenToplam += Math.abs(h.miktar);
      continue;
    }

    let blok = bloklar.get(h.paraBirimi);
    if (!blok) {
      blok = {
        paraBirimi: h.paraBirimi,
        fireZarari: 0,
        fireAdedi: 0,
        sayimZarari: 0,
        sayimAdedi: 0,
        toplamZarar: 0,
        degeriBilinmeyenAdet: 0,
      };
      bloklar.set(h.paraBirimi, blok);
    }

    // miktar negatifse zarar pozitif olsun diye ters çevriliyor.
    const zarar = -h.miktar * h.birimMaliyet;

    if (h.tip === "ADJUSTMENT") {
      blok.fireZarari += zarar;
      blok.fireAdedi += Math.abs(h.miktar);
    } else {
      blok.sayimZarari += zarar;
      blok.sayimAdedi += Math.abs(h.miktar);
    }
  }

  const sonuc = [...bloklar.values()];
  for (const blok of sonuc) {
    blok.toplamZarar = blok.fireZarari + blok.sayimZarari;
  }

  // Bilinmeyen adet tek blokta gösterilir; para birimi olmadığı için
  // bloklara dağıtılamaz. Blok yoksa da bilgi kaybolmasın diye blok açılır.
  if (bilinmeyenToplam > 0) {
    if (sonuc.length === 0) {
      sonuc.push({
        paraBirimi: "TRY",
        fireZarari: 0,
        fireAdedi: 0,
        sayimZarari: 0,
        sayimAdedi: 0,
        toplamZarar: 0,
        degeriBilinmeyenAdet: bilinmeyenToplam,
      });
    } else {
      sonuc[0].degeriBilinmeyenAdet = bilinmeyenToplam;
    }
  }

  return sonuc;
}
