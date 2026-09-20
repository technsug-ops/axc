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

/**
 * Bir çağrıda (bir gün / "Gecikmiş" / "Vadesiz") en fazla kaç ADLI kalem
 * TEK TEK gösterilir. Kalanı, büyüklüğüne bakılmaksızın adsızlarla AYNI
 * "N kalem" kovasına düşer.
 *
 * ⛔ CANLI BULGU 20.09.2026: "adı var mı" ölçütü TEK BAŞINA yetmiyordu.
 * Buradaki "ad" bir ürün adı değil, ÇIPLAK SİPARİŞ KODU (`k.sale?.code`,
 * bkz. `takvim-verisi.ts`) — ve gerçek bir sipariş hiçbir zaman "adsız"
 * olmaz. Sonuç: 33-90 kalemlik bir gün HİÇ toplanmadan, kod başına bir
 * satır olarak ekrana dökülüyordu. "İsimsiz satır yazılmaz" kuralı,
 * ismi TEKNİK OLARAK dolu ama İNSANA HİÇBİR ŞEY SÖYLEMEYEN satırları
 * yakalayamıyordu.
 */
const TEKIL_TAVANI = 8;

export function gunuDokumle(satirlar: TakvimSatiri[]): GunDokumu {
  const adli: TakvimSatiri[] = [];
  const adsiz: TakvimSatiri[] = [];
  for (const s of satirlar) {
    (adVarMi(s.baslik) ? adli : adsiz).push(s);
  }

  /**
   * ⚠ MUTLAK TUTARA GÖRE BÜYÜKTEN KÜÇÜĞE: tek tek kalacak `TEKIL_TAVANI`
   * kadar kalem, cash-flow riskini gösteren, göze çarpması GEREKEN büyük
   * tutarlardır. Onlarca ufak kalem (₺13-90) tek satırda toplanır — "S.ahmet
   * İşbank −₺48.697" gibi bir kalem 40 küçük kalemin arasında kaybolmasın.
   */
  const buyuktenKucuge = [...adli].sort(
    (a, b) => Math.abs(b.tutar) - Math.abs(a.tutar),
  );
  const tekil = buyuktenKucuge.slice(0, TEKIL_TAVANI);
  const tasanlar = buyuktenKucuge.slice(TEKIL_TAVANI);

  const harita = new Map<string, TakvimObegi>();
  for (const s of [...adsiz, ...tasanlar]) {
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
