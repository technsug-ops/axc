import type { Currency } from "@/generated/prisma/enums";

/**
 * ============================================================================
 *  PARTİ MALİYETİ DÜZELTME — SAF KURAL (K127, 01.09.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ NİYE DOĞDU: kullanıcı bir satış detayında ₺340'lık bir birim maliyet
 *  gördü ve _"fiyat yanlış girilmiş ama düzeltemiyorum"_ dedi. Ölçüldü ve
 *  haklıydı — üç kapı da kapalıydı:
 *
 *    · `/alimlar` düzenleme  → partinin ARKASINDA alım kaydı yok
 *      (`purchaseItemId` boş; onarım betiğinin açtığı bir parti)
 *    · "Veri şüpheli"        → işaretler ve doğrular, DÜZELTMEZ
 *    · `/stok` düzeltme formu → stok ekler/çıkarır, var olan bir partinin
 *      MALİYETİNİ değiştiremez
 *
 *  Kullanıcının cümlesi kayda geçti: _"yanlış verilen verinin kullanıcı
 *  tarafından düzeltilememesi anlamsız."_ Haklı.
 *
 *  ── ⛔ BU, LEDGER DOKUNULMAZLIĞININ İSTİSNASI DEĞİL — KAPSAMI DIŞI ────
 *  Anayasa: _"ilke, kendi kapsamının dışına uygulanırsa koruduğu şey
 *  doğruluk değil HATA olur."_ Snapshot dokunulmazlığı **doğru koşullarla
 *  hesaplanmış** bir damgayı sonraki değişikliklerden korumak içindir.
 *  Bir onarım betiğinin UYDURDUĞU maliyet o kapsama girmez: orada korunan
 *  geçmiş değil, hatanın kendisidir.
 *
 *  ⚠ VE ADET/PARA AYRIMI KORUNUYOR: bu gövde **adede dokunmaz**. Stok
 *  miktarı değişmez, yalnız birim maliyet damgası düzelir. Adet düzeltmesi
 *  hâlâ ters işaretli `ADJUSTMENT` işidir.
 *
 *  ── ⛔ DÜZELTME TÜM OKUYUCULARA ULAŞMAK ZORUNDA ──────────────────────
 *  19.08.2026 dersi: alım düzenleme ekranı `PurchaseItem` ve
 *  `purchaseItemId` ile bağlı hareketleri güncelliyordu ama çıkışlar partiye
 *  `sourceMovementId` ile bağlı — ve canlıda 49 negatif hareketin **0'ında**
 *  `purchaseItemId` doluydu. Yani düzeltme çıkışlara HİÇ ulaşmıyordu; alım
 *  ekranı doğru görünüyor, NET eski maliyetle kalıyordu.
 *
 *  Bu gövde o dersin yarım kalan yarısıdır: partiyle birlikte **ondan
 *  çekilmiş çıkışlar da** yeniden damgalanır ve etkilenen satışların kârı
 *  yeniden hesaplanır.
 * ============================================================================
 */

/** Düzeltilecek parti — okunmuş hâli. */
export type DuzeltilecekParti = {
  hareketId: string;
  /** Decimal string; float'a çevrilmez. */
  birimMaliyet: string | null;
  birimMaliyetParaBirimi: Currency | null;
  girenAdet: number;
};

/** Bu partiden çekilmiş bir çıkış hareketi. */
export type PartiCikisi = {
  hareketId: string;
  /** Çıkışın kaç adet olduğu — pozitif sayı olarak. */
  adet: number;
  birimMaliyet: string | null;
  /** Bağlı satış kalemi; `null` ise iade/düzeltme çıkışı olabilir. */
  saleItemId: string | null;
  saleId: string | null;
};

export type DuzeltmeRedSebebi =
  | "MALIYET_GECERSIZ"
  | "MALIYET_AYNI"
  | "PARA_BIRIMI_YOK"
  | "SEBEP_BOS";

export type MaliyetDuzeltmePlani = {
  /** Yazılabilir mi — `false` ise `redler` doludur ve hiçbir şey yazılmaz. */
  yazilabilir: boolean;
  redler: DuzeltmeRedSebebi[];
  /** Partinin kendisi — eski ve yeni değer birlikte. */
  eskiMaliyet: string | null;
  yeniMaliyet: string;
  /** Yeniden damgalanacak çıkış hareketleri. */
  damgalanacakCikislar: string[];
  /** Kârı tazelenecek satışlar — TEKİL. */
  tazelenecekSatislar: string[];
  /** Etkilenen toplam adet — kullanıcıya "ne kadar mal" demek için. */
  etkilenenAdet: number;
  /**
   * Maliyet farkının çıkışlara toplam etkisi. Pozitifse maliyet ARTIYOR,
   * yani kâr O KADAR DÜŞECEK. Önizlemede yazılır.
   */
  maliyetFarkiToplam: number;
};

/** Kuruşa yuvarlar — `Decimal` ↔ float kuyruğu karşılaştırmayı bozmasın. */
function kurus(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * PLANI KUR — YAZMADAN ÖNCE NE OLACAĞINI SÖYLER.
 *
 * ⛔ SAF: veritabanına gitmez. Bekçi gövdeyi ÇAĞIRIP değerini ölçüyor,
 * kaynak taramıyor.
 *
 * ⚠ ÇIKIŞLARIN HEPSİ DAMGALANIR — YALNIZ SATIŞA BAĞLI OLANLAR DEĞİL.
 * İade ve düzeltme çıkışları da o partinin maliyetini taşıyor; biri
 * güncellenip öteki bırakılsaydı aynı parti iki farklı maliyetle okunurdu.
 */
export function maliyetDuzeltmePlani(g: {
  parti: DuzeltilecekParti;
  yeniMaliyetMetni: string;
  paraBirimi: Currency | null;
  sebep: string;
  cikislar: readonly PartiCikisi[];
}): MaliyetDuzeltmePlani {
  const redler: DuzeltmeRedSebebi[] = [];

  const temiz = g.yeniMaliyetMetni.trim().replace(",", ".");
  const yeni = temiz === "" ? Number.NaN : Number(temiz);
  /**
   * ⛔ SIFIR DA GEÇERSİZ. "Maliyeti bilmiyorum" demek `0` değil `null`dır ve
   * bu ekranın işi maliyeti DÜZELTMEK; bilinmezliğe çevirmek başka bir karar.
   * _(Anayasa: varsayılan değer alanın anlamından türetilir.)_
   */
  if (!Number.isFinite(yeni) || yeni <= 0) redler.push("MALIYET_GECERSIZ");

  /**
   * ⛔ SEBEP ZORUNLU. Üç ay sonra "bu maliyet niye değişmiş" sorusunun
   * cevabı olmalı — sebepsiz düzeltme, izin kendisini anlamsız kılar.
   */
  if (g.sebep.trim() === "") redler.push("SEBEP_BOS");

  /**
   * ⛔ PARA BİRİMİ OLMADAN YAZILMAZ. Maliyeti olan bir parti para birimini
   * de taşır; taşımıyorsa hangi paradan bahsettiğimiz belirsizdir ve
   * "kuruşuna eşit" karşılaştırması anlamını yitirir.
   */
  const para = g.paraBirimi ?? g.parti.birimMaliyetParaBirimi;
  if (para === null) redler.push("PARA_BIRIMI_YOK");

  const eski =
    g.parti.birimMaliyet === null ? null : Number(g.parti.birimMaliyet);
  /**
   * ⚠ KURUŞUNA KARŞILAŞTIRILIR — tolerans DEĞİL, BİRİM SEÇİMİ.
   * `Decimal` → float kuyruğu aynı sayıyı "farklı" gösterip boş bir yazım
   * turu başlatırdı. _(K6'nın susturma karşılaştırmasıyla aynı gerekçe.)_
   */
  if (eski !== null && Number.isFinite(yeni) && kurus(eski) === kurus(yeni)) {
    redler.push("MALIYET_AYNI");
  }

  const damgalanacak = g.cikislar.map((c) => c.hareketId);
  /** ⚠ TEKİLLEŞTİRİLİR: bir satışın birden çok kalemi aynı partiden çekebilir. */
  const satislar: string[] = [];
  for (const c of g.cikislar) {
    if (c.saleId !== null && !satislar.includes(c.saleId)) satislar.push(c.saleId);
  }
  const etkilenenAdet = g.cikislar.reduce((t, c) => t + c.adet, 0);

  return {
    yazilabilir: redler.length === 0,
    redler,
    eskiMaliyet: g.parti.birimMaliyet,
    yeniMaliyet: Number.isFinite(yeni) ? String(kurus(yeni)) : "",
    damgalanacakCikislar: damgalanacak,
    tazelenecekSatislar: satislar,
    etkilenenAdet,
    /**
     * ⚠ İŞARET ANLAMLI: pozitif = maliyet arttı = kâr DÜŞECEK. Önizleme bunu
     * kullanıcıya AÇIKÇA söylemek zorunda; "düzelttim" deyip NET'in sessizce
     * düşmesi sürpriz olurdu.
     */
    maliyetFarkiToplam:
      eski === null || !Number.isFinite(yeni)
        ? 0
        : kurus((yeni - eski) * etkilenenAdet),
  };
}

/**
 * ⛔ İZ EYLEMİ VE DURUM TİPİ BURADA — `"use server"` DOSYASINDA DEĞİL.
 *
 * 30.08.2026 vakası: bir `"use server"` dosyasındaki TEK bir sabit, o
 * dosyanın BÜTÜN dışa aktarımlarını düşürdü ve üç ekran canlıda hiç
 * çizilmedi — tur 63/63 yeşilken. Kural o günden beri bekçide:
 * sunucu eylemi dosyası YALNIZ async fonksiyon dışa aktarır.
 */
export const MALIYET_DUZELTME_EYLEMI = "PARTI_MALIYETI_DUZELTILDI";

export type PartiMaliyetDurumu = {
  hatalar?: string[];
  basari?: string;
  /** Önizleme sonrası kullanıcıya gösterilen özet — yazım YAPILMADI. */
  onizleme?: {
    eski: string | null;
    yeni: string;
    cikis: number;
    satis: number;
    adet: number;
    fark: number;
  };
};
