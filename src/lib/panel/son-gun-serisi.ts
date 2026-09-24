import { gunDegeri, gunEkle, isTakvimGunu, type Pencere } from "@/lib/donem";
import { kova, sonrakiKova, type Kirilim } from "@/lib/panel/operasyon-serisi";

/**
 * ============================================================================
 *  CİRO ve NET-2 — SEÇİLİ DÖNEM SERİSİ (K265, 24.09.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ K257 ÇEVRİLDİ, GEREKÇESİ AŞAĞIDA DURUYOR. K257 kartı BUGÜNE KİLİTLİ 14
 *  güne bağlamıştı («dönem süzgecinden bağımsız») — demo öyleydi. Kullanıcı
 *  24.09: «bu kart filtrelere bağlansın, operasyon ve diğer kartlar gibi
 *  seçilen tarihe göre güncellensin; grafiğin altında günler belirlensin».
 *  Ayrıca ölçüldü: 14 günlük seri zaten DÖNEM sorgusundan besleniyordu
 *  (`satislar` dönem kapsamlı) — «Bugün» seçilince 14 günlük eksende tek gün
 *  doluydu, kart kendi başlığını tutamıyordu. Şimdi kovalar operasyon
 *  grafiğiyle AYNI gövdeden (`kova` · `sonrakiKova`, aynı kırılım): iki kart
 *  aynı günleri çizer (İlke #10).
 *
 *  SAF: tarih üretmez; pencere ve kırılım çağırandan gelir (test edilebilir).
 *  ⚠ NET-2 `null` SIFIR SAYILMAZ: bilinmeyen, sıfır değildir — `net2Var`.
 *
 *  ── ESKİ BAŞLIK (K257) ─────────────────────────────────────────────────
 *
 *  ============================================================================
 *  SON N GÜN SERİSİ — CİRO VE NET-2, GÜN GÜN (K257, 23.09.2026)
 *  ----------------------------------------------------------------------------
 *  Demo: «Ciro ve NET-2 — son 14 gün». Dönem süzgecinden BAĞIMSIZ, bugüne
 *  kilitli bir pencere: kullanıcı «Bugün»ü seçse de son iki haftanın eğilimi
 *  görünür. Aylık çizgi (12 ay) eğilimi, bu çizgi ise günlük dalgalanmayı
 *  gösterir — ikisi ayrı soru.
 *  
 *  ── GÜN, İSTANBUL GÜNÜDÜR ───────────────────────────────────────────────
 *  `isTakvimGunu` + `gunDegeri`: `operasyonSerisi` ile aynı kovalama. İki seri
 *  aynı satışı farklı güne yazsaydı ekran kendiyle çelişirdi.
 *  
 *  ── NET-2 BİLİNMİYORSA SIFIR SAYILMAZ ───────────────────────────────────
 *  Kârı hesaplanamayan satışın `net2`si `null`; toplama girmez ama `net2Var`
 *  günün en az bir hesaplı satışı olup olmadığını söyler. `null`ı 0 saymak
 *  «o gün kâr yok» diye okunurdu — bilinmeyen, sıfır değildir (anayasa).
 *  
 *  SAF: tarih üretmez, `simdi`yi çağıran verir (test edilebilirlik).
 *  ============================================================================
 *
 * ============================================================================
 */

export type DonemNoktasi = {
  /** Kovanın ilk günü (pencereye kırpılmış; İstanbul günü, `gunDegeri`). */
  baslangic: Date;
  /** Kovanın son günü (DAHİL) — etiket aralığı için. */
  sonGun: Date;
  gelir: number;
  net2: number;
  /** O kovada NET-2'si hesaplı en az bir satış var mı. */
  net2Var: boolean;
  adet: number;
};

export function donemCiroNetSerisi(
  satislar: readonly { tarih: Date; gelir: number; net2: number | null }[],
  pencere: Pencere,
  kirilim: Kirilim,
): DonemNoktasi[] {
  /* Eksen bir GÜN LİSTESİDİR — `operasyonSerisi` ile aynı kırpma (07.09 düzeltmesi). */
  const eksenBas = pencere.ilkGun;
  const eksenBitHaric = gunEkle(pencere.sonGun, 1);
  const noktalar: DonemNoktasi[] = [];
  const dizin = new Map<string, DonemNoktasi>();
  let imlec = kova(eksenBas, kirilim).baslangic;
  while (imlec.getTime() < eksenBitHaric.getTime()) {
    const sonraki = sonrakiKova(imlec, kirilim);
    const { anahtar } = kova(imlec, kirilim);
    const bas = imlec.getTime() < eksenBas.getTime() ? eksenBas : imlec;
    const bitHaric = sonraki.getTime() > eksenBitHaric.getTime() ? eksenBitHaric : sonraki;
    const n: DonemNoktasi = {
      baslangic: bas,
      sonGun: gunEkle(bitHaric, -1),
      gelir: 0,
      net2: 0,
      net2Var: false,
      adet: 0,
    };
    noktalar.push(n);
    dizin.set(anahtar, n);
    imlec = sonraki;
  }
  for (const s of satislar) {
    /* Pencere dışı satış kovaya girmez — kırpılmış ilk/son kova komşu günü çekmesin. */
    const gun = gunDegeri(isTakvimGunu(s.tarih)).getTime();
    if (gun < eksenBas.getTime() || gun >= eksenBitHaric.getTime()) continue;
    const n = dizin.get(kova(s.tarih, kirilim).anahtar);
    if (!n) continue;
    n.gelir += s.gelir;
    n.adet += 1;
    if (s.net2 !== null) {
      n.net2 += s.net2;
      n.net2Var = true;
    }
  }
  return noktalar;
}
