import { gunDegeri, gunEkle, isTakvimGunu } from "@/lib/donem";

/**
 * ============================================================================
 *  SON N GÜN SERİSİ — CİRO VE NET-2, GÜN GÜN (K257, 23.09.2026)
 * ----------------------------------------------------------------------------
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
 * ============================================================================
 */

export type SonGunNoktasi = {
  /** Günün başı (İstanbul), `gunDegeri` ile normalize. */
  tarih: Date;
  gelir: number;
  net2: number;
  /** O gün NET-2'si hesaplı en az bir satış var mı. */
  net2Var: boolean;
  adet: number;
};

export const SON_GUN_SAYISI = 14;

export function sonGunSerisi(
  satislar: readonly { tarih: Date; gelir: number; net2: number | null }[],
  simdi: Date,
  gunSayisi: number = SON_GUN_SAYISI,
): SonGunNoktasi[] {
  const bugun = gunDegeri(isTakvimGunu(simdi));
  const gunler: SonGunNoktasi[] = [];
  for (let i = gunSayisi - 1; i >= 0; i--) {
    gunler.push({ tarih: gunEkle(bugun, -i), gelir: 0, net2: 0, net2Var: false, adet: 0 });
  }
  const indeks = new Map(gunler.map((g, k) => [g.tarih.getTime(), k] as const));
  for (const s of satislar) {
    const k = indeks.get(gunDegeri(isTakvimGunu(s.tarih)).getTime());
    if (k === undefined) continue;
    const g = gunler[k]!;
    g.gelir += s.gelir;
    g.adet += 1;
    if (s.net2 !== null) {
      g.net2 += s.net2;
      g.net2Var = true;
    }
  }
  return gunler;
}
