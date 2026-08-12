import { pencerede, type Pencere } from "@/lib/donem";
import { kdvAyir, type KarDurumu } from "@/lib/kar";

import type { Currency } from "@/generated/prisma/enums";

/**
 * ============================================================================
 *  DÖNEM RAPORU MOTORU — SAF HESAP
 * ----------------------------------------------------------------------------
 *  Veritabanına gitmez, saati kendi okumaz, kâr YENİDEN HESAPLAMAZ. Girdi
 *  aynıysa çıktı aynıdır; `rapor:dogrula` bunu birebir sınar.
 *
 *  İKİ KATMAN İLKESİ (kullanıcı kararı 10.08.2026)
 *  -----------------------------------------------
 *  Genel gider ÜRÜN kârının içine ASLA girmez. Ürün/satış seviyesi brüt
 *  kâr (NET-1/NET-2) olarak kalır — alım kararı verirken batık maliyet
 *  hesabı bulandırmasın diye. Genel gider YALNIZCA burada, firma/dönem
 *  seviyesinde düşülür:
 *
 *      GERÇEK NET = Σ NET-2 (iadeler dahil) − dönem giderleri
 *
 *  KARARLAR (kullanıcı onayı 10.08.2026)
 *  -------------------------------------
 *  1. GİDERİN KDV'Sİ İNDİRİLİR. Motor alış/komisyon/kargo KDV'sini zaten
 *     ödenecek KDV'den düşüyor (lib/kar.ts); genel gider de aynı kurala
 *     tabi. Bu yüzden GERÇEK NET'ten düşen tutar giderin KDV HARİÇ hâlidir.
 *     KDV'siz gider (maaş, vergi) için oran 0 girilir → tam tutar düşer.
 *     İndirilebilir KDV toplamı ayrıca RAPORLANIR (muhasebeciye veri).
 *  2. İADE KENDİ AYINA YAZILIR. Temmuz satışının Ağustos iadesi Ağustos'a
 *     düşer; kapanan ay bir daha değişmez.
 *  3. PARA BİRİMLERİ AYRI RAPORLANIR. Kur çevirisi YOK — TRY ve EUR asla
 *     tek rakama toplanmaz (mevcut ilke).
 *  4. HESAPLANAMAYAN KÂR SIFIR SAYILMAZ. NET'i olmayan satış kâr
 *     toplamına girmez ama SAYISI görünür; geliri gerçektir, sayılır.
 * ============================================================================
 */

export type RaporSatis = {
  id: string;
  /** Sipariş numarası — yalnızca ekranda etiket olarak kullanılır. */
  kod: string | null;
  /** soldAt — UTC gece yarısı takvim günü. */
  tarih: Date;
  /** KDV DAHİL satış geliri (Σ adet × birim fiyat). */
  gelir: number;
  net1: number | null;
  net2: number | null;
  paraBirimi: Currency;
  durum: KarDurumu | null;
};

export type RaporIade = {
  id: string;
  /** İadenin bağlı olduğu satış — ekranda oraya gidilir. */
  satisId: string;
  kod: string | null;
  /** occurredAt — iade kendi tarihine yazılır. */
  tarih: Date;
  /** İADE ETKİSİ (satışın yeni neti değil). İşaret anlamlıdır. */
  net1: number | null;
  net2: number | null;
  paraBirimi: Currency;
  durum: KarDurumu | null;
};

export type RaporGider = {
  id: string;
  /** spentAt */
  tarih: Date;
  /** KDV DAHİL tutar — kâr motoruyla aynı kural. */
  tutar: number;
  /** Giderin KDV oranı (%). Maaş/vergi gibi kalemlerde 0. */
  kdvOrani: number;
  paraBirimi: Currency;
  kategoriId: string;
  kategoriAd: string;
  /** Sabit gider mi (kira, maaş) yoksa değişken mi (sarf malzeme)? */
  sabitMi: boolean;
};

export type RaporDuzeltmesi = {
  tarih: Date;
  /** Negatif = mal gitti, pozitif = fazla cikti. */
  miktar: number;
  birimMaliyet: number | null;
  paraBirimi: Currency | null;
  tip: "ADJUSTMENT" | "COUNT_CORRECTION";
};

export type RaporGirdisi = {
  satislar: RaporSatis[];
  iadeler: RaporIade[];
  giderler: RaporGider[];
  /** Fire ve sayim farki hareketleri — stok defterinden gelir. */
  duzeltmeler?: RaporDuzeltmesi[];
};

export type GiderKategoriOzeti = {
  kategoriId: string;
  kategoriAd: string;
  sabitMi: boolean;
  adet: number;
  /** Ödenen tam tutar. */
  kdvDahil: number;
  /** İçindeki indirilebilir KDV. */
  kdv: number;
  /** GERÇEK NET'ten düşen kısım (KDV hariç). */
  netDusen: number;
};

export type HesaplanamayanOzet = { durum: KarDurumu; adet: number };

/**
 * Kârı hesaplanamayan kaydın KİMLİĞİ.
 *
 * Sayı yetmez: "1 satışın kârı hesaplanamadı" diyen bir uyarı, hangi satış
 * olduğunu söylemezse kullanıcıyı listeyi tarayarak aramaya bırakır. Motor
 * kimliği de döndürür, ekran doğrudan o kayda bağlantı verir.
 * _Kullanıcı isteği 10.08.2026._
 */
export type HesaplanamayanKayit = {
  /** Gidilecek satışın kimliği (iadelerde iadenin bağlı olduğu satış). */
  satisId: string;
  kod: string | null;
  tarih: Date;
  durum: KarDurumu | null;
};

export type ParaBirimiRaporu = {
  paraBirimi: Currency;

  // --- SATIŞ ---
  satisAdedi: number;
  satisGeliri: number;
  /** Kârı hesaplanabilmiş satışların NET toplamı. */
  satisNet1: number;
  satisNet2: number;
  hesaplananSatisAdedi: number;
  hesaplanamayanSatisAdedi: number;
  hesaplanamayanDurumlar: HesaplanamayanOzet[];
  /** Ekranın bağlantı verebilmesi için — eskiden tarihe göre sıralı. */
  hesaplanamayanSatislar: HesaplanamayanKayit[];

  // --- İADE ---
  iadeAdedi: number;
  iadeNet1: number;
  iadeNet2: number;
  hesaplanamayanIadeAdedi: number;
  hesaplanamayanIadeler: HesaplanamayanKayit[];

  // --- BRÜT (iade etkileri dahil) ---
  brutNet1: number;
  brutNet2: number;

  // --- GİDER ---
  giderAdedi: number;
  giderKdvDahil: number;
  giderIndirilebilirKdv: number;
  giderNetDusen: number;

  // --- FIRE VE DUZELTME (stok defterinden turer, gider tablosunda YOK) ---
  /** Fire/hasar/kayip zarari — POZITIF sayi = kaybedilen para. */
  fireZarari: number;
  fireAdedi: number;
  /** Sayim farki zarari — ayri satir: olcum hatasi ile gercek kayip ayni degil. */
  sayimZarari: number;
  sayimAdedi: number;
  duzeltmeZarari: number;
  /** Maliyeti bilinmedigi icin paraya cevrilemeyen adet. Sifir sayilmaz. */
  duzeltmeBilinmeyenAdet: number;
  sabitGiderNetDusen: number;
  degiskenGiderNetDusen: number;
  kategoriler: GiderKategoriOzeti[];

  // --- SONUÇ ---
  gercekNet: number;

  // --- REFERANS GÖSTERGELER (bilgi köprüsü; ürün kârına GİRMEZ) ---
  /** Dönem gideri / satış adedi. Satış yoksa null. */
  satisBasinaOrtGider: number | null;
  /** Σ NET-2 / kârı HESAPLANABİLMİŞ satış adedi. Yoksa null. */
  satisBasinaOrtBrutKar: number | null;
};

export type RaporSonucu = {
  pencere: Pencere;
  /** Her para birimi AYRI blok — çevrim yok. Hareketi çok olan başta. */
  paraBirimleri: ParaBirimiRaporu[];
  /** Pencerede hiç kayıt yok mu? */
  bos: boolean;
};

function bosRapor(paraBirimi: Currency): ParaBirimiRaporu {
  return {
    paraBirimi,
    satisAdedi: 0,
    satisGeliri: 0,
    satisNet1: 0,
    satisNet2: 0,
    hesaplananSatisAdedi: 0,
    hesaplanamayanSatisAdedi: 0,
    hesaplanamayanDurumlar: [],
    hesaplanamayanSatislar: [],
    iadeAdedi: 0,
    iadeNet1: 0,
    iadeNet2: 0,
    hesaplanamayanIadeAdedi: 0,
    hesaplanamayanIadeler: [],
    brutNet1: 0,
    brutNet2: 0,
    giderAdedi: 0,
    giderKdvDahil: 0,
    giderIndirilebilirKdv: 0,
    giderNetDusen: 0,
    fireZarari: 0,
    fireAdedi: 0,
    sayimZarari: 0,
    sayimAdedi: 0,
    duzeltmeZarari: 0,
    duzeltmeBilinmeyenAdet: 0,
    sabitGiderNetDusen: 0,
    degiskenGiderNetDusen: 0,
    kategoriler: [],
    gercekNet: 0,
    satisBasinaOrtGider: null,
    satisBasinaOrtBrutKar: null,
  };
}

/** Kâr toplamına girer mi? Durum CALCULATED değilse NET'e güvenilmez. */
function hesaplandi(durum: KarDurumu | null, net: number | null): net is number {
  return durum === "CALCULATED" && net !== null;
}

export function raporHesapla(
  pencere: Pencere,
  girdi: RaporGirdisi,
): RaporSonucu {
  const bloklar = new Map<Currency, ParaBirimiRaporu>();
  const durumSayaci = new Map<Currency, Map<KarDurumu, number>>();
  const kategoriler = new Map<Currency, Map<string, GiderKategoriOzeti>>();

  function blok(paraBirimi: Currency): ParaBirimiRaporu {
    let mevcut = bloklar.get(paraBirimi);
    if (!mevcut) {
      mevcut = bosRapor(paraBirimi);
      bloklar.set(paraBirimi, mevcut);
      durumSayaci.set(paraBirimi, new Map());
      kategoriler.set(paraBirimi, new Map());
    }
    return mevcut;
  }

  // ------------------------------- SATIŞLAR --------------------------------
  for (const satis of girdi.satislar) {
    if (!pencerede(pencere, satis.tarih)) continue;

    const b = blok(satis.paraBirimi);
    b.satisAdedi++;
    b.satisGeliri += satis.gelir;

    if (hesaplandi(satis.durum, satis.net2) && satis.net1 !== null) {
      b.hesaplananSatisAdedi++;
      b.satisNet1 += satis.net1;
      b.satisNet2 += satis.net2;
    } else {
      // SIFIR SAYILMAZ — sayılır, nedeni yazılır, KİMLİĞİ tutulur.
      b.hesaplanamayanSatisAdedi++;
      const sayac = durumSayaci.get(satis.paraBirimi)!;
      const kod: KarDurumu = satis.durum ?? "RULE_MISSING";
      sayac.set(kod, (sayac.get(kod) ?? 0) + 1);
      b.hesaplanamayanSatislar.push({
        satisId: satis.id,
        kod: satis.kod,
        tarih: satis.tarih,
        durum: satis.durum,
      });
    }
  }

  // -------------------------------- İADELER --------------------------------
  for (const iade of girdi.iadeler) {
    if (!pencerede(pencere, iade.tarih)) continue;

    const b = blok(iade.paraBirimi);
    b.iadeAdedi++;

    if (hesaplandi(iade.durum, iade.net2) && iade.net1 !== null) {
      b.iadeNet1 += iade.net1;
      b.iadeNet2 += iade.net2;
    } else {
      b.hesaplanamayanIadeAdedi++;
      b.hesaplanamayanIadeler.push({
        satisId: iade.satisId,
        kod: iade.kod,
        tarih: iade.tarih,
        durum: iade.durum,
      });
    }
  }

  // ------------------------------ DÜZELTMELER ------------------------------
  // Fire, hasar, kayip, sayim farki. STOK DEFTERINDEN turer; gider tablosuna
  // YAZILMAZ (kullanici karari 12.08.2026) — tek kaynak ledger, cift kayit yok.
  // Kar hesabina (NET-1/NET-2) KARISMAZ: duzeltme bir satis degildir. Donem
  // kalemi olarak GERCEK NET'ten duser, tipki gider gibi.
  for (const d of girdi.duzeltmeler ?? []) {
    if (!pencerede(pencere, d.tarih)) continue;
    if (d.birimMaliyet === null || d.paraBirimi === null) {
      // Maliyeti bilinmeyen hareket paraya cevrilemez. Sifir saymak, kaybi
      // hic yasanmamis gibi gostermek olurdu — ayrica sayilir, ekranda yazar.
      const hedef = girdi.duzeltmeler?.find((x) => x.paraBirimi !== null);
      blok(hedef?.paraBirimi ?? "TRY").duzeltmeBilinmeyenAdet += Math.abs(d.miktar);
      continue;
    }
    const bd = blok(d.paraBirimi);
    // miktar negatifse zarar POZITIF olsun diye ters cevriliyor.
    const zarar = -d.miktar * d.birimMaliyet;
    if (d.tip === "ADJUSTMENT") {
      bd.fireZarari += zarar;
      bd.fireAdedi += Math.abs(d.miktar);
    } else {
      bd.sayimZarari += zarar;
      bd.sayimAdedi += Math.abs(d.miktar);
    }
  }

  // -------------------------------- GİDERLER -------------------------------
  for (const gider of girdi.giderler) {
    if (!pencerede(pencere, gider.tarih)) continue;

    const b = blok(gider.paraBirimi);
    const kdv = kdvAyir(gider.tutar, gider.kdvOrani);
    const netDusen = gider.tutar - kdv;

    b.giderAdedi++;
    b.giderKdvDahil += gider.tutar;
    b.giderIndirilebilirKdv += kdv;
    b.giderNetDusen += netDusen;
    if (gider.sabitMi) b.sabitGiderNetDusen += netDusen;
    else b.degiskenGiderNetDusen += netDusen;

    const kategoriTablosu = kategoriler.get(gider.paraBirimi)!;
    let ozet = kategoriTablosu.get(gider.kategoriId);
    if (!ozet) {
      ozet = {
        kategoriId: gider.kategoriId,
        kategoriAd: gider.kategoriAd,
        sabitMi: gider.sabitMi,
        adet: 0,
        kdvDahil: 0,
        kdv: 0,
        netDusen: 0,
      };
      kategoriTablosu.set(gider.kategoriId, ozet);
    }
    ozet.adet++;
    ozet.kdvDahil += gider.tutar;
    ozet.kdv += kdv;
    ozet.netDusen += netDusen;
  }

  // -------------------------------- TOPLAMA --------------------------------
  for (const [paraBirimi, b] of bloklar) {
    b.brutNet1 = b.satisNet1 + b.iadeNet1;
    b.brutNet2 = b.satisNet2 + b.iadeNet2;
    b.duzeltmeZarari = b.fireZarari + b.sayimZarari;
    b.gercekNet = b.brutNet2 - b.giderNetDusen - b.duzeltmeZarari;

    b.hesaplanamayanDurumlar = [...durumSayaci.get(paraBirimi)!]
      .map(([durum, adet]) => ({ durum, adet }))
      .sort((a, x) => x.adet - a.adet || a.durum.localeCompare(x.durum));

    // Eskiden yeniye: en uzun süredir bekleyen sorun başta görünsün.
    const tariheGore = (a: HesaplanamayanKayit, x: HesaplanamayanKayit) =>
      a.tarih.getTime() - x.tarih.getTime();
    b.hesaplanamayanSatislar.sort(tariheGore);
    b.hesaplanamayanIadeler.sort(tariheGore);

    b.kategoriler = [...kategoriler.get(paraBirimi)!.values()].sort(
      (a, x) => x.netDusen - a.netDusen || a.kategoriAd.localeCompare(x.kategoriAd),
    );

    b.satisBasinaOrtGider =
      b.satisAdedi > 0 ? b.giderNetDusen / b.satisAdedi : null;

    // Ortalama brüt kâr, kârı BİLİNEN satışlara bölünür — bilinmeyeni
    // sıfır sayıp ortalamayı aşağı çekmek yanlış bilgi olurdu.
    b.satisBasinaOrtBrutKar =
      b.hesaplananSatisAdedi > 0 ? b.brutNet2 / b.hesaplananSatisAdedi : null;
  }

  const paraBirimleri = [...bloklar.values()].sort(
    (a, x) =>
      x.satisAdedi + x.giderAdedi + x.iadeAdedi -
        (a.satisAdedi + a.giderAdedi + a.iadeAdedi) ||
      a.paraBirimi.localeCompare(x.paraBirimi),
  );

  return { pencere, paraBirimleri, bos: paraBirimleri.length === 0 };
}
