import { acikCikislar } from "@/lib/kalem-maliyeti";

/**
 * ============================================================================
 *  PROJE SATIŞ SONUCU (K347 · Aşama 3a) — SAF GÖVDE
 * ----------------------------------------------------------------------------
 *  Projenin payı TAHMİNLE değil FIFO İZİNDEN bulunur: satış kaleminin hâlâ açık
 *  çıkışlarından kaynağı projeye işaretli alım partisi olanlar projenindir
 *  (`acikCikislar` — adet azalışı aynası son çıkışı kapatır; kâr motoruyla aynı kural).
 *
 *  ⛔ KÂR KALEMİN DEĞİL SİPARİŞİN NET-2'SİNDEN — ÖLÇÜLDÜ (18.10.2026, canlı,
 *  17.07'den beri 1.133 hesaplanmış satış): kalem NET-2'lerinin toplamı satış
 *  NET-2'sine yalnız 2 satışta eşit; fark ortanca −₺120,89. Sebep sipariş düzeyi
 *  kesintiler (kargo 1.117 · sabit gider 795 · ödeme gideri 328 · hizmet bedeli
 *  328 satırda) kaleme dağıtılmıyor. Kalem NET-2'si alınsaydı proje her satışta
 *  ~₺120 fazla kârlı görünürdü.
 *  ÇÖZÜM: sipariş farkı (satış NET − Σ kalem NET) kalemlere CİRO oranında bölünür,
 *  her kalemin proje payı kadarı alınır. Bütün kalemler projeye aitken sonuç
 *  satışın kendi NET-2'sine KURUŞUNA eşittir (bekçi bunu sabitler) — /satislar
 *  ile aynı rakam. Karma sipariş (proje + proje dışı ürün) ölçümde 1.133'te 2.
 *
 *  ⚠ BU SÜRÜMÜN SINIRI (beyan): iade ya da iptalle stoğa geri gelip YENİDEN
 *  satılan mal projeye bağlanmaz (kaynağı RETURN_IN/SALE_CANCEL_IN partisidir,
 *  köken zinciri kurulmadı). Ölçüm 17.10 (tasarım §1): son 30 günde 426 satış
 *  adedinin 20'si (%4,7 — iptal girişi 15 · iade girişi 4 · değişim 1) bu tür
 *  partilerden. Sayım fazlası partisi ise sınır değil KARARDIR: kökeni bilinmez,
 *  proje dışıdır (§4.3). Ekran sınırı yazar.
 * ============================================================================
 */

export type SonucHareketi = {
  /** NEGATİF çıkış, POZİTİF ayna (adet azalışı). */
  quantityDelta: number;
  birimMaliyet: string | null;
  /** Hareketin tükettiği partinin bağlı olduğu alım kaleminin projesi; yoksa null. */
  kaynakProjeId: string | null;
};

export type SonucKalemi = {
  adet: number;
  birimFiyat: number;
  net1: number | null;
  net2: number | null;
  hareketler: SonucHareketi[];
};

export type SonucSatisi = {
  id: string;
  kod: string | null;
  tarih: Date;
  kanal: string;
  /** `Sale.profitCurrency` — kâr hangi birimde hesaplandı. */
  paraBirimi: string | null;
  karHesaplandi: boolean;
  net1: number | null;
  net2: number | null;
  kalemler: SonucKalemi[];
  /** Geçerli (geri alınmamış) iadelerin kâr etkisi — negatif. */
  iadeler: { net1: number | null; net2: number | null; hesaplandi: boolean }[];
};

export type SonucSatiri = {
  satisId: string;
  kod: string | null;
  tarih: Date;
  kanal: string;
  projeAdedi: number;
  toplamAdet: number;
  ciro: number;
  maliyet: number | null;
  net1: number | null;
  net2: number | null;
  iadeNet2: number;
  /** HESAPLANDI · KAR_YOK (satışın kârı hesaplanmamış) · BIRIM (kâr başka para biriminde). */
  durum: "HESAPLANDI" | "KAR_YOK" | "BIRIM";
};

export type ProjeSonucu = {
  satirlar: SonucSatiri[];
  toplam: { adet: number; ciro: number; maliyet: number; net1: number; net2: number; iadeNet1: number; iadeNet2: number };
  /** Toplama GİRMEYEN satırlar — sessizce düşmez, ekranda sayılır. */
  karYok: number;
  birimFarkli: number;
  iadeHesaplanamayan: number;
};

const kurus = (n: number) => Math.round(n * 100) / 100;

export function projeSonucu(projeId: string, projeParaBirimi: string, satislar: SonucSatisi[]): ProjeSonucu {
  const sonuc: ProjeSonucu = {
    satirlar: [],
    toplam: { adet: 0, ciro: 0, maliyet: 0, net1: 0, net2: 0, iadeNet1: 0, iadeNet2: 0 },
    karYok: 0,
    birimFarkli: 0,
    iadeHesaplanamayan: 0,
  };

  for (const s of satislar) {
    const kalemler = s.kalemler.map((k) => {
      const acik = acikCikislar(k.hareketler);
      const toplamAdet = acik.reduce((t, h) => t + h.adet, 0);
      const projeCikislari = acik.filter((h) => h.kaynakProjeId === projeId);
      const projeAdedi = projeCikislari.reduce((t, h) => t + h.adet, 0);
      const maliyetBilinmiyor = projeCikislari.some((h) => h.birimMaliyet === null);
      return {
        k,
        toplamAdet,
        projeAdedi,
        pay: toplamAdet > 0 ? projeAdedi / toplamAdet : 0,
        ciro: k.birimFiyat * k.adet,
        maliyet: maliyetBilinmiyor ? null : projeCikislari.reduce((t, h) => t + h.adet * Number(h.birimMaliyet), 0),
      };
    });
    const projeAdedi = kalemler.reduce((t, k) => t + k.projeAdedi, 0);
    if (projeAdedi === 0) continue;

    const toplamCiro = kalemler.reduce((t, k) => t + k.ciro, 0);
    const ciroPayi = (c: number) => (toplamCiro > 0 ? c / toplamCiro : 1 / kalemler.length);
    const projeCirosu = kalemler.reduce((t, k) => t + k.pay * k.ciro, 0);
    const maliyet = kalemler.some((k) => k.projeAdedi > 0 && k.maliyet === null)
      ? null
      : kalemler.reduce((t, k) => t + (k.maliyet ?? 0), 0);
    /** Satışın projeye düşen payı (ciro ağırlıklı) — iade etkisi bununla bölünür. */
    const satisPayi = kalemler.reduce((t, k) => t + k.pay * ciroPayi(k.ciro), 0);

    const kalemNetiTam = kalemler.every((k) => k.k.net1 !== null && k.k.net2 !== null);
    let durum: SonucSatiri["durum"] = "HESAPLANDI";
    if (!s.karHesaplandi || s.net1 === null || s.net2 === null || !kalemNetiTam) durum = "KAR_YOK";
    else if (s.paraBirimi !== projeParaBirimi) durum = "BIRIM";

    let net1: number | null = null;
    let net2: number | null = null;
    let iadeNet1 = 0;
    let iadeNet2 = 0;
    if (durum === "HESAPLANDI") {
      const siparisFarki1 = s.net1! - kalemler.reduce((t, k) => t + k.k.net1!, 0);
      const siparisFarki2 = s.net2! - kalemler.reduce((t, k) => t + k.k.net2!, 0);
      net1 = kalemler.reduce((t, k) => t + k.pay * (k.k.net1! + siparisFarki1 * ciroPayi(k.ciro)), 0);
      net2 = kalemler.reduce((t, k) => t + k.pay * (k.k.net2! + siparisFarki2 * ciroPayi(k.ciro)), 0);
      for (const i of s.iadeler) {
        if (!i.hesaplandi || i.net1 === null || i.net2 === null) { sonuc.iadeHesaplanamayan++; continue; }
        iadeNet1 += i.net1 * satisPayi;
        iadeNet2 += i.net2 * satisPayi;
      }
    }

    sonuc.satirlar.push({
      satisId: s.id, kod: s.kod, tarih: s.tarih, kanal: s.kanal,
      projeAdedi, toplamAdet: kalemler.reduce((t, k) => t + k.toplamAdet, 0),
      ciro: kurus(projeCirosu), maliyet: maliyet === null ? null : kurus(maliyet),
      net1: net1 === null ? null : kurus(net1), net2: net2 === null ? null : kurus(net2),
      iadeNet2: kurus(iadeNet2), durum,
    });

    if (durum === "KAR_YOK") { sonuc.karYok++; continue; }
    if (durum === "BIRIM") { sonuc.birimFarkli++; continue; }
    sonuc.toplam.adet += projeAdedi;
    sonuc.toplam.ciro += projeCirosu;
    sonuc.toplam.maliyet += maliyet ?? 0;
    sonuc.toplam.net1 += net1!;
    sonuc.toplam.net2 += net2!;
    sonuc.toplam.iadeNet1 += iadeNet1;
    sonuc.toplam.iadeNet2 += iadeNet2;
  }

  for (const a of Object.keys(sonuc.toplam) as (keyof ProjeSonucu["toplam"])[]) sonuc.toplam[a] = kurus(sonuc.toplam[a]);
  sonuc.satirlar.sort((a, b) => b.tarih.getTime() - a.tarih.getTime());
  return sonuc;
}
