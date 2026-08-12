/**
 * ============================================================================
 *  SAYFALAMA — TEK KAYNAK
 * ----------------------------------------------------------------------------
 *  NEDEN VAR (12.08.2026): Gerçek katalog içe aktarıldı — 1054 ürün. Liste
 *  ekranları sayfalamasız yazılmıştı ve 16 ürünle sorunsuz görünüyordu.
 *  1054'te `/urunler` sorgusu 992 ms sürüyor, 511 KB veri çekiyor ve 1054
 *  satırı çiziyor; üst üste birkaç kayıttan sonra sunucu çöküyordu.
 *
 *  "Gerçek veri gelmeden yazılan ekran, gerçek hacimde sınanmamıştır."
 *
 *  SAYFA BAŞI 50 (kullanıcı kararı 12.08.2026, mobil öncelikli): telefonda
 *  50 kart zaten uzun bir kaydırma. Asıl bulma aracı sayfa gezinmesi değil
 *  ARAMA ve SÜZGEÇLERdir; sayfalama onların yedeğidir.
 *
 *  SAF HESAP: veritabanına gitmez. Toplam sayıyı çağıran verir.
 *
 *  ÇİFT ÇİZİM MESELESİ KAPANDI (karar 12.08.2026): Liste ekranları aynı
 *  veriyi iki kez çiziyor — masaüstü tablosu (`hidden md:block`) ve telefon
 *  kartları (`md:hidden`). 1054 kayıtta bu 2108 satır demekti ve çökmenin
 *  ortağıydı. Sayfalamadan SONRA sayfa başı 100 satır ediyor; sorun değil.
 *  Altı ekranın responsive yapısını yeniden kurmanın regresyon riski,
 *  ölçülemeyecek kadar küçük bir kazanç için alınmayacak.
 * ============================================================================
 */

export const SAYFA_BOYUTU = 50;

export type Sayfalama = {
  /** 1'den başlar. */
  sayfa: number;
  boyut: number;
  /** Prisma `skip` değeri. */
  atla: number;
  toplam: number;
  sonSayfa: number;
  oncekiVar: boolean;
  sonrakiVar: boolean;
  /** Bu sayfadaki ilk kaydın sırası (1 tabanlı). Kayıt yoksa 0. */
  ilkSira: number;
  sonSira: number;
};

/**
 * Adresten gelen sayfa numarasını güvenli aralığa oturtur.
 *
 * SINIRIN DIŞINA DÜŞMEZ: elle `?sayfa=999` yazılırsa son sayfaya çekilir,
 * boş ekran gösterilmez. `?sayfa=abc` da 1'e düşer — hata vermek yerine
 * makul olanı yapar, çünkü bu kullanıcının yazdığı bir değer değil.
 */
export function sayfaCoz(
  ham: string | undefined,
  toplam: number,
  boyut = SAYFA_BOYUTU,
): Sayfalama {
  const sonSayfa = Math.max(1, Math.ceil(toplam / boyut));

  const istenen = Number.parseInt((ham ?? "").trim(), 10);
  const sayfa = Number.isFinite(istenen)
    ? Math.min(Math.max(1, istenen), sonSayfa)
    : 1;

  const atla = (sayfa - 1) * boyut;

  return {
    sayfa,
    boyut,
    atla,
    toplam,
    sonSayfa,
    oncekiVar: sayfa > 1,
    sonrakiVar: sayfa < sonSayfa,
    ilkSira: toplam === 0 ? 0 : atla + 1,
    sonSira: Math.min(atla + boyut, toplam),
  };
}

/**
 * Sayfa bağlantısı — MEVCUT SÜZGEÇLERİ KORUR.
 *
 * Arama yaparken sayfa değiştirmek aramayı düşürseydi kullanıcı süzdüğü
 * listeyi kaybederdi; en can sıkıcı sayfalama hatası budur.
 */
export function sayfaAdresi(
  yol: string,
  mevcut: Record<string, string | undefined>,
  sayfa: number,
): string {
  const sorgu = new URLSearchParams();
  for (const [anahtar, deger] of Object.entries(mevcut)) {
    if (deger !== undefined && deger !== "" && anahtar !== "sayfa") {
      sorgu.set(anahtar, deger);
    }
  }
  // 1. sayfa adrese YAZILMAZ: paylaşılan adres sade kalsın.
  if (sayfa > 1) sorgu.set("sayfa", String(sayfa));

  const ek = sorgu.toString();
  return ek ? `${yol}?${ek}` : yol;
}
