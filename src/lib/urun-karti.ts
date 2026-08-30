import type { Currency } from "@/generated/prisma/enums";

import { sermayeVerimi } from "@/lib/marj-gosterge";
import {
  birimKar,
  birimSatisFiyati,
  marjYuzdesi,
  urunlereTopla,
  type KalemGirdisi,
  type UrunSatiri,
} from "@/lib/panel-listeler";

/**
 * ============================================================================
 *  ÜRÜN KÂRLILIK KARTI — SAF HESAP
 * ----------------------------------------------------------------------------
 *  Kullanıcı sözleşmesi 17.08.2026. Mağazada, alım öncesi, telefonla barkod
 *  okutulur → "bu ürünü alayım mı" kararının verisi tek bakışta çıkar.
 *
 *  ── KOPYA HESAP YASAK ───────────────────────────────────────────────────
 *  Marj ve birim kâr BURADA HESAPLANMAZ: `panel-listeler.ts`in
 *  `marjYuzdesi` / `birimKar` fonksiyonları çağrılır — panelin ürün analizi
 *  hangi rakamı gösteriyorsa kart da aynısını gösterir. İkinci bir formül
 *  yazsaydık, biri düzeltilip öteki unutulduğu gün aynı ürün iki ekranda
 *  iki farklı marjla görünürdü.
 *
 *  Bu dosya yalnız kartın KENDİ sorularını hesaplar: hız, sermaye verimi,
 *  risk sayıları, satış geçmişi özeti.
 *
 *  ── NET-2 KALEM SEVİYESİNDEDİR (mimar kararı 17.08.2026) ────────────────
 *  ⚠ `Sale.net2Amount` kargoyu, hizmet bedelini ve sabit gideri içerir ve bu
 *  kesintiler bilinçli olarak KALEMLERE BÖLÜNMEZ (bir siparişin kargosu tek
 *  bir varyantın değildir). Bu yüzden kart `SaleItem.net2Amount` üzerinden
 *  kurulur ve ürünün KENDİ marjını gösterir.
 *
 *  Rakam `/satislar`daki sipariş NET-2'sinden FARKLIDIR ve bu fark ekranda
 *  YAZILIR. Yazılmasaydı iki ekran birbirini sessizce yalanlardı — kullanıcı
 *  hangisinin bozuk olduğunu aramakla uğraşırdı.
 *
 *  ── SESSİZ VARSAYIM YOK ─────────────────────────────────────────────────
 *  Hesaplanamayan her şey `null` döner ve ekranda "?" olarak çıkar; sıfır
 *  DEĞİL. Maliyeti bilinmeyen bir ürünün sermaye verimi "0" değildir,
 *  bilinmiyordur — ikisi karıştırılırsa kullanıcı kârlı bir ürünü zararlı
 *  sanır.
 * ============================================================================
 */

/** Tek satışa dayanan marj yanıltır — ekran bunu ayrıca söyler. */
export const TEK_SATIS_ESIGI = 1;

export type KartSatisi = {
  satisId: string;
  soldAt: Date;
  kanalAdi: string;
  adet: number;
  net2: number | null;
  /**
   * Bu kalemin çıktığı FIFO partilerinin GİRİŞ tarihleri. `SALE_OUT`
   * hareketi `sourceMovement` ile giriş partisine bağlı olduğu için gerçek
   * veriden gelir; bağ kurulamamış hareketler listede YER ALMAZ (tahmin
   * üretmemek için).
   */
  girisTarihleri: Date[];
};

export type KartGirdisi = {
  /** Panel motoruna verilecek kalemler — marj ve birim kâr oradan gelir. */
  kalemler: KalemGirdisi[];
  /** Satış geçmişi, hız ve risk için kalem başına ayrıntı. */
  satislar: KartSatisi[];
  /** Açık FIFO partilerinden: birim maliyetler (adet ağırlıklı). */
  acikPartiler: { kalanAdet: number; birimMaliyet: number | null }[];
  /**
   * SATILAN adetlerin FIFO maliyet damgaları — `SALE_OUT` hareketlerinden.
   *
   * ⛔ AÇIK PARTİLERLE KARIŞTIRILMAZ: ikisi FARKLI SORUYA cevap verir.
   *   `acikPartiler`      → "elimdeki malın maliyeti ne"   (envanter)
   *   `satilanDusumleri`  → "sattığım mala ne ödemiştim"   (sermaye)
   * Sermaye verimi ikincisini ister; birincisi bu satışın sermayesi
   * DEĞİLDİR. _(Karar 28.08.2026 — ayrıntı `sermayeVerimi` alanında.)_
   */
  satilanDusumleri: { adet: number; birimMaliyet: number | null }[];
  iadeAdedi: number;
  iadeSayisi: number;
};

export type KartOzeti = {
  /** Panel motorunun ürettiği satır — marj/birim kâr onun üzerinden okunur. */
  satir: UrunSatiri | null;

  // --- SATIŞ GEÇMİŞİ ---
  satisSayisi: number;
  toplamAdet: number;
  sonSatis: Date | null;
  kanallar: string[];

  // --- KÂRLILIK ---
  /**
   * Adet başına SATIŞ FİYATI — kâr cümlesinin ilk terimi (K102).
   * ⚠ `birimNet2` ve `marj` ile AYNI paydadan (`hesaplananAdet`) okunur;
   * üçü aynı kümeyi anlatmazsa ekrandaki aritmetik tutmaz.
   */
  birimSatisFiyati: number | null;
  /** Adet başına NET-2 (kalem seviyesi). Hesaplanamayan varsa null. */
  birimNet2: number | null;
  marj: number | null;
  /**
   * Kâr / maliyet — yatırılan paranın kaç katı döndü.
   *
   * ⛔ PAYDA = SATILAN ADEDİN MALİYETİ (karar 28.08.2026).
   *
   * ESKİ KOD `agirlikliOrtalama(acikPartiler)` kullanıyordu — yani ELDE
   * KALAN partileri. Yorum ise "satılan adedin maliyeti" diyordu; ikisi
   * ayrışmıştı ve ÖLÇÜM yorumu doğruladı:
   *   · satışı olan 955 varyantın **832'sinde (%87,1)** payda `null`
   *     çıkıyordu — çünkü iyi satan ürün TÜKENİYOR, açık parti kalmıyor.
   *     Metrik tam da en çok işe yarayacağı yerde susuyordu (satış
   *     hacminin %88,5'i bu kovadaydı).
   *   · Karşılaştırılabilen 123 varyantın **67'sinde (%54,5)** iki payda
   *     ayrışıyordu: |sapma| ortanca %6,68 · p90 %34,72 · **max %155,69**
   *     (`axcali2045`: 10.325,97 ↔ 4.038,40). Sapma İKİ YÖNLÜ — rakam
   *     karamsar değil, RASTGELE yanlıştı.
   *   · Veri tam: `SALE_OUT` damgalı 3330 adedin hepsinde maliyet dolu.
   *
   * ⚠ BU BİR DÜZELTME DEĞİL, İLK KEZ ÇALIŞMA: 832 üründe bugüne kadar boş
   * duran kutu ilk kez rakam üretecek.
   */
  sermayeVerimi: number | null;
  /**
   * Sermaye veriminin PAYDASI — satılan adedin ağırlıklı birim maliyeti.
   * ⚠ Ekranda `ortalamaMaliyet` ile YAN YANA DURMAZ; ayrı sorulardır.
   */
  satilanBirimMaliyeti: number | null;
  sonSatisNet2: number | null;

  // --- MALİYET ---
  /** Elde kalan partilerin adet ağırlıklı ortalama maliyeti. */
  ortalamaMaliyet: number | null;

  // --- HIZ ---
  /** Alımdan satışa ortalama gün. Bağ kurulamadıysa null. */
  ortalamaSatisSuresi: number | null;
  /** Hız hesabına giren satış adedi — kaç veriden çıktığı görünür olsun. */
  hizOrnekSayisi: number;

  // --- RİSK ---
  iadeAdedi: number;
  iadeSayisi: number;
  /** Kârı hesaplanamamış kalem sayısı (NO_COST vb.). */
  hesaplanamayanKalem: number;
  /** NET-2'si eksi çıkan satış sayısı. */
  zararliSatis: number;

  // --- UYARILAR ---
  /** Tek satıştan çıkan marj yanıltır; ekran bunu yazar. */
  tekSatisMi: boolean;
  /** Hiç satılmamış — kâr bölümü rakam yerine "henüz satılmadı" der. */
  hicSatilmamisMi: boolean;
};

/** Adet ağırlıklı ortalama — maliyeti bilinmeyen partiler HESABA GİRMEZ. */
export function agirlikliOrtalama(
  partiler: { kalanAdet: number; birimMaliyet: number | null }[],
): number | null {
  let adet = 0;
  let tutar = 0;
  for (const p of partiler) {
    if (p.birimMaliyet === null || p.kalanAdet <= 0) continue;
    adet += p.kalanAdet;
    tutar += p.birimMaliyet * p.kalanAdet;
  }
  return adet === 0 ? null : tutar / adet;
}

/**
 * SATILAN ADEDİN AĞIRLIKLI BİRİM MALİYETİ — sermaye veriminin paydası.
 *
 * ⚠ AYNI FORMÜL, AYRI SORU. Hesap `agirlikliOrtalama`ya devrediliyor ki
 * ağırlıklı ortalama bu dosyada TEK yerde yaşasın; ayrı bir kopya yazmak
 * iki formülün bir gün ayrışması demekti. Ayrı olan şey GİRDİ: burada
 * satılan adetler, orada elde kalanlar.
 *
 * ⛔ Maliyet damgası olmayan düşüm HESABA GİRMEZ — `agirlikliOrtalama`nın
 * kendi kuralı. Damgasızı sıfır saymak, bedava mal almış gibi göstererek
 * sermaye verimini şişirirdi.
 */
export function satilanBirimMaliyeti(
  dusumler: { adet: number; birimMaliyet: number | null }[],
): number | null {
  return agirlikliOrtalama(
    dusumler.map((d) => ({ kalanAdet: d.adet, birimMaliyet: d.birimMaliyet })),
  );
}

/**
 * ALIMDAN SATIŞA ORTALAMA GÜN — sermaye dönüş hızı.
 *
 * Her satış kalemi birden çok partiden düşmüş olabilir (FIFO); her düşümün
 * kendi giriş tarihi vardır ve hepsi ayrı örnek sayılır. Bağı kurulamamış
 * satışlar hesaba GİRMEZ ve `hizOrnekSayisi` ile kaç veriden çıktığı
 * söylenir — "3 satıştan ortalama" ile "30 satıştan ortalama" aynı güveni
 * taşımaz.
 */
function satisSuresi(satislar: KartSatisi[]): {
  ortalama: number | null;
  ornek: number;
} {
  let toplamGun = 0;
  let ornek = 0;

  for (const s of satislar) {
    for (const giris of s.girisTarihleri) {
      const gun = Math.floor(
        (s.soldAt.getTime() - giris.getTime()) / (24 * 60 * 60 * 1000),
      );
      /**
       * NEGATİF GÜN SAYILMAZ. Geriye dönük girilen bir alım, satıştan sonra
       * kaydedilmiş görünebilir; böyle bir satır ortalamayı aşağı çeker ve
       * "eksi gün" diye bir şey yoktur.
       */
      if (gun < 0) continue;
      toplamGun += gun;
      ornek++;
    }
  }

  return {
    ortalama: ornek === 0 ? null : toplamGun / ornek,
    ornek,
  };
}

export function kartOzeti(girdi: KartGirdisi): KartOzeti {
  const { kalemler, satislar, acikPartiler, satilanDusumleri, iadeAdedi, iadeSayisi } =
    girdi;

  // Panel motoru: tek varyant verildiği için tek satır döner.
  const satirlar = urunlereTopla(kalemler);
  const satir = satirlar[0] ?? null;

  const hiz = satisSuresi(satislar);
  /** ⛔ ENVANTER SORUSU — ekranda kendi kutusu var, paydayla KARIŞTIRILMAZ. */
  const ortalamaMaliyet = agirlikliOrtalama(acikPartiler);
  /** ⛔ SERMAYE SORUSU — sermaye veriminin paydası. Ayrı girdi, ayrı anlam. */
  const satilanBirim = satilanBirimMaliyeti(satilanDusumleri);

  /**
   * SERMAYE VERİMİ = NET-2 / MALİYET. "Yatırdığım paranın kaç katı döndü"
   * sorusunun cevabı; alım kararında marjdan daha doğrudan bir ölçüdür.
   *
   * Maliyet bilinmiyorsa null — sıfıra bölme yerine "bilinmiyor" demek
   * doğru cevaptır. Payda olarak SATILAN adedin maliyeti kullanılır:
   * elde kalan stok bu satışın sermayesi değildir.
   */
  const birim = satir === null ? null : birimKar(satir);
  /**
   * ⚠ HESAP ORTAK DOSYADAN (17.08.2026): satış listesi de aynı ölçüyü
   * gösteriyor. İki ekranın kendi formülünü yazması, aynı sayının iki dilde
   * konuşması demekti — bugünün kargo dersi. Biçim de oradan gelir.
   */
  /**
   * ⛔ PAYDA `satilanBirim` — `ortalamaMaliyet` DEĞİL (karar 28.08.2026).
   * Elde kalan stok bu satışın sermayesi değildir; tükenmiş üründe hiç
   * payda kalmaz ve metrik tam da orada susardı.
   */
  const sermayeOrani = sermayeVerimi(birim, satilanBirim);

  const siraliSatislar = [...satislar].sort(
    (a, b) => b.soldAt.getTime() - a.soldAt.getTime(),
  );
  const sonSatis = siraliSatislar[0] ?? null;

  return {
    satir,

    satisSayisi: satislar.length,
    toplamAdet: satislar.reduce((t, s) => t + s.adet, 0),
    sonSatis: sonSatis === null ? null : sonSatis.soldAt,
    // Kanal adları tekilleştirilir; aynı kanaldan 10 satış tek etiket olsun.
    kanallar: [...new Set(satislar.map((s) => s.kanalAdi))].sort(),

    birimSatisFiyati: satir === null ? null : birimSatisFiyati(satir),
    birimNet2: birim,
    marj: satir === null ? null : marjYuzdesi(satir),
    sermayeVerimi: sermayeOrani,
    sonSatisNet2: sonSatis?.net2 ?? null,

    ortalamaMaliyet,
    satilanBirimMaliyeti: satilanBirim,

    ortalamaSatisSuresi: hiz.ortalama,
    hizOrnekSayisi: hiz.ornek,

    iadeAdedi,
    iadeSayisi,
    hesaplanamayanKalem: satir?.hesaplanamayanKalem ?? 0,
    zararliSatis: satislar.filter((s) => s.net2 !== null && s.net2 < 0).length,

    tekSatisMi: satislar.length === TEK_SATIS_ESIGI,
    hicSatilmamisMi: satislar.length === 0,
  };
}

/** Para birimi karışmışsa kart tek rakam veremez — ekran bunu söyler. */
export function paraBirimiKarisikMi(
  kalemler: { paraBirimi: Currency }[],
): boolean {
  return new Set(kalemler.map((k) => k.paraBirimi)).size > 1;
}
