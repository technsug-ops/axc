import type { TakvimSatiri, TakvimYonu } from "./nakit-takvimi";

/**
 * ============================================================================
 *  TAKVİM GÜNÜNÜ OKUNABİLİR HÂLE GETİRME
 * ----------------------------------------------------------------------------
 *  14.08.2026 CANLI KUSURU: bir günde 20+ satır çıkıyordu ve çoğunun başlığı
 *  "—" idi. Sebep: hakediş kalemleri sipariş SATIRI başına geliyor ve kalem
 *  bir satışa bağlanmamışsa gösterilecek bir ad yok.
 *
 *  İSİMSİZ SATIR YAZILMAZ. Bir satır kendini tanıtamıyorsa tek başına
 *  durmayı hak etmiyor demektir; kardeşleriyle TOPLANIR ve "N kalem" olarak
 *  görünür. Rakam kaybolmaz — okunabilir hâle gelir.
 *
 *  ÖLÇÜT ADIN VARLIĞI, KAYNAK DEĞİL:
 *    - Adı olan satır (kart etiketi, sipariş no) TEK TEK durur; azdır ve
 *      tıklanınca kaynağına gider.
 *    - Adı olmayanlar yön+kaynak bazında toplanır.
 *  Kural kaynağa göre yazılsaydı, adı olan bir hakediş kalemi de gereksiz
 *  yere yığına girerdi.
 * ============================================================================
 */

/** Adı olmayan satırların yerine geçen toplu satır. */
export type TakvimObegi = {
  yon: TakvimYonu;
  kaynak: TakvimSatiri["kaynak"];
  adet: number;
  tutar: number;
  adres: string;
};

export type GunDokumu = {
  /** Adı olan, tek tek gösterilecek satırlar. */
  tekil: TakvimSatiri[];
  /** Adsızların yön+kaynak bazında toplanmış hâli. */
  obekler: TakvimObegi[];
};

/** Ad sayılmayan değerler — bunlar "kendini tanıtamıyor". */
const ADSIZ = new Set(["", "—", "-", "?"]);

export function adVarMi(baslik: string): boolean {
  return !ADSIZ.has(baslik.trim());
}

export function gunuDokumle(satirlar: TakvimSatiri[]): GunDokumu {
  const tekil: TakvimSatiri[] = [];
  const harita = new Map<string, TakvimObegi>();

  for (const s of satirlar) {
    if (adVarMi(s.baslik)) {
      tekil.push(s);
      continue;
    }
    const anahtar = `${s.yon}|${s.kaynak}`;
    const mevcut = harita.get(anahtar);
    if (mevcut) {
      mevcut.adet += 1;
      mevcut.tutar += s.tutar;
    } else {
      harita.set(anahtar, {
        yon: s.yon,
        kaynak: s.kaynak,
        adet: 1,
        tutar: s.tutar,
        adres: s.adres,
      });
    }
  }

  return { tekil, obekler: [...harita.values()] };
}

/**
 * Bir günde gösterilecek TOPLAM satır sayısı. Ekranın ne kadar
 * uzayacağını önceden bilmek için — panel bir daha rakam duvarına
 * dönmesin diye `panel:dogrula` bunu sınıyor.
 */
export function gunSatirSayisi(dokum: GunDokumu): number {
  return dokum.tekil.length + dokum.obekler.length;
}
