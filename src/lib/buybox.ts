/**
 * ============================================================================
 *  BUYBOX DURUMU — SAF HESAP (K363 Faz 3-a, kullanıcı kararı 25.10.2026)
 * ----------------------------------------------------------------------------
 *  Kaynak resmî satıcı API'leri (kendi tarayıcımız YOK): TY Buybox Kontrol ·
 *  HB buybox sıralaması. Burası veritabanına ve ağa gitmez; iki kanalın
 *  cevabını tek satır biçimine indirir ve «Buybox'ı kaybettiklerim» listesini
 *  kurar.
 *  ⛔ FİYAT ÖNERMEZ: gösterir. Fiyat gönderimi (Faz 3-c) satırdaki fiyat
 *  kutusundan, kartın izli eylemiyle yapılır (`buybox-fiyat.ts`); bu dosya
 *  gönderime dokunmaz.
 *  Ekran her açılışta o anın fotoğrafını çeker. Geçmiş (saatlik sayılar +
 *  durum değişimleri) Faz 3-b'de tüketicisiyle (grafik) birlikte doğdu:
 *  `buybox-istatistik.ts`.
 * ============================================================================
 */

import type { GorselKaynagi } from "./urun-gorseli";

export const BUYBOX_KANALLARI = ["TY", "HB"] as const;
export type BuyboxKanali = (typeof BUYBOX_KANALLARI)[number];

export type BuyboxUrunu = {
  variantId: string;
  urunId: string | null;
  urunAdi: string;
  sku: string;
  barkod: string | null;
  firmaSku: string | null;
  /** Kanaldaki kod: TY'de barkod, HB'de hepsiburadaSku. */
  kanalKodu: string;
  stok: number;
  /** Küçük resim (Satışlar'la aynı `UrunGorseli`); yoksa baş harf kutusu. */
  gorselUrl?: string | null;
  gorselKaynak?: GorselKaynagi | null;
};

export type HbRakip = { sira: number; satici: string; fiyat: number; listeFiyati: number | null };

export type BuyboxDurumu =
  /** Buybox bizde. */
  | "BIRINCI"
  /** Başka satıcı önde. */
  | "KAYBEDILDI"
  /** Kanal cevap verdi ama bu ürünü listede bizi göstermedi (HB) ya da ürün için kayıt dönmedi (TY). */
  | "GORUNMUYOR"
  /** Sorgu başarısız — hüküm YOK (sebep ayrı yazılır). */
  | "SORGULANAMADI";

export type BuyboxSatiri = BuyboxUrunu & {
  kanal: BuyboxKanali;
  durum: BuyboxDurumu;
  /** Müşterinin gördüğü bizim fiyatımız. `null` = bilinmiyor. */
  bizimFiyat: number | null;
  buyboxFiyati: number | null;
  /** Buybox'taki satıcı — yalnız HB verir. */
  buyboxSaticisi: string | null;
  siramiz: number | null;
  /** Ürünü satan kaç satıcı (HB tam liste; TY yalnız «tek/çok»). */
  saticiSayisi: number | null;
  /**
   * Sıralamada 2. satıcının fiyatı (iki kanalda AYNI anlam). Buybox bizdeyse
   * bizden sonraki = öndeliğimizin payı. ⚠ ESKİ HÂL (26.10.2026'ya dek): HB'de
   * Buybox kaybedilmişken «bizden HEMEN SONRAKİ» satıcıydı (biz 5. isek 6.) —
   * başlık «2. fiyat» derken TY'den farklı şey gösteriyordu (kullanıcı «bu fiyat ne»).
   */
  ikinciFiyat: number | null;
  /**
   * HB «KENDİ İNDİRİMİ» (ölçüldü 26.10.2026, `scripts/hb-indirim-olcum.ts`):
   * sıralamadaki `originalPrice` = İLANA GÖNDERDİĞİMİZ fiyat (12/12), `price` =
   * HB'nin ÜRÜN BAŞINA YÜZDE indirimi düşülmüş müşteri fiyatı (bizim 195
   * satırın 154'ünde; %15 · %13 · %10 · %20). Aynı üründe liste fiyatı 11.649 ile
   * 20.000 arasında değişen satıcıların hepsinde %13,00 → sabit TUTAR değil
   * YÜZDE. Ödeme ve komisyon LİSTE fiyatından (kullanıcı beyanı). `bizimFiyat`
   * müşteri fiyatıdır; `bizimListeFiyati` ilandaki fiyat — kâr ve gönderim onunla.
   * TY: `null` (girilen fiyat = müşteri fiyatı sayılır; indirim 0).
   * ⚠ 27.10.2026: `originalPrice` KAMPANYALI ilanda ilan fiyatını DEĞİL kampanya
   * fiyatını gösteriyor (Tefal 5.622,32 ↔ ilan 6.389) — liste artık İLAN
   * kaydından (`hbIlan`); sıralama yalnız ilan okunamadığında yedek.
   */
  bizimListeFiyati: number | null;
  /** 0 ≤ oran < 1 — müşteri = liste × (1 − oran). Bilinmiyorsa/yoksa 0. */
  kanalIndirimi: number;
  /** HB: o üründeki bütün satıcılar (sırasıyla). TY: boş. */
  rakipler: HbRakip[];
  /**
   * HB İLAN KAYDI (K366, kullanıcı bulgusu 27.10.2026 — Tefal: ilan 6.389,
   * müşteri 5.622,32). `null` = TY ya da ilan OKUNAMADI (otomatik gönderim
   * HB'de ilan bilinmeden yapılmaz).
   */
  hbIlan: HbIlan | null;
  /**
   * HB KAMPANYASI: müşteri fiyatı ilandaki fiyatımızdan Hepsiburada'nın
   * kampanya/özel fiyatıyla ayrılmış ve liste fiyatı değişince ne olacağı
   * BİLİNMİYOR → öneri yok, otomatik fiyat GÖNDERİLMEZ. TY: her zaman false.
   */
  kampanya: boolean;
};

/**
 * HB ilanı (ilan ucu `listings` — buybox sıralaması DEĞİL). Ölçüm 27.10.2026
 * (235 stoklu ilan, `hb-capraz` ölçümü): sıralamadaki `originalPrice` 155
 * ilanda ilan fiyatımızı gösteriyor, ama **kampanyalı 78 ilanda** (`pricings`
 * dolu, indirimi «Hepsiburada %100» ödüyor) kampanya fiyatını gösteriyor —
 * liste fiyatımız yalnız ilan kaydında doğru. 1 ilanda kampanya kaydı yokken
 * de sıralama ilandan ayrı (2.999 ↔ 1.999; kaynağı bilinmiyor).
 */
export type HbIlan = {
  /** İlandaki fiyatımız — ödeme ve komisyon tabanı (komisyon tutarı 6.389 × %12 = 766,68 ile ölçüldü). */
  liste: number;
  /** `pricings[0].finalPrice` — kampanya yoksa `null`. */
  kampanyaFiyati: number | null;
  kampanyaBitis: string | null;
  /** Kampanya indirimini Hepsiburada mı tam ödüyor (`debtors`: Hepsiburada %100). Kampanya yoksa `false`. */
  hbOduyor: boolean;
  /** HB fiyat ARTIŞINI kilitlemiş (`priceIncreaseDisabled`) — yükseltme denenmez. */
  artisKapali: boolean;
};

const ayri = (a: number, b: number) => Math.abs(a - b) >= 0.005;

/**
 * İlan ucunun bir kaydını `HbIlan`a çevirir. Fiyatı okunamayan kayıt `null`
 * (uydurulmaz). Birden çok `pricings` varsa `simdi` anında GEÇERLİ olan alınır;
 * tarihsizse ilki. Hepsiburada ödüyor = tek borçlu «Hepsiburada» %100.
 */
export function hbIlanOku(x: unknown, simdi: Date): { sku: string; ilan: HbIlan } | null {
  const k = x as Record<string, unknown> | null;
  const sku = typeof k?.hepsiburadaSku === "string" ? k.hepsiburadaSku.trim().toUpperCase() : "";
  const liste = typeof k?.price === "number" && Number.isFinite(k.price) && k.price > 0 ? k.price : null;
  if (k === null || sku === "" || liste === null) return null;
  const fiyatli = (Array.isArray(k.pricings) ? (k.pricings as Record<string, unknown>[]) : []).filter(
    (q) => typeof q?.finalPrice === "number" && Number.isFinite(q.finalPrice) && q.finalPrice > 0,
  );
  const gecerli = (q: Record<string, unknown>) => {
    const bas = typeof q.startDate === "string" ? Date.parse(q.startDate) : Number.NaN;
    const son = typeof q.endDate === "string" ? Date.parse(q.endDate) : Number.NaN;
    return (Number.isNaN(bas) || bas <= simdi.getTime()) && (Number.isNaN(son) || simdi.getTime() <= son);
  };
  const f = fiyatli.find(gecerli) ?? null;
  const borclular = f !== null && Array.isArray(f.debtors) ? (f.debtors as Record<string, unknown>[]) : [];
  return {
    sku,
    ilan: {
      liste,
      kampanyaFiyati: f === null ? null : (f.finalPrice as number),
      kampanyaBitis: f !== null && typeof f.endDate === "string" ? f.endDate : null,
      hbOduyor: borclular.length === 1 && borclular[0]?.debtor === "Hepsiburada" && borclular[0]?.amount === 100,
      artisKapali: k.priceIncreaseDisabled === true,
    },
  };
}

const bos = (u: BuyboxUrunu, kanal: BuyboxKanali, durum: BuyboxDurumu): BuyboxSatiri => ({
  ...u, kanal, durum, bizimFiyat: null, buyboxFiyati: null, buyboxSaticisi: null, siramiz: null, saticiSayisi: null, ikinciFiyat: null, rakipler: [],
  bizimListeFiyati: null, kanalIndirimi: 0, hbIlan: null, kampanya: false,
});

/** HB müşteri fiyatı ile liste fiyatından indirim oranı; tutarsız değerde 0 (uydurulmaz). */
export function indirimOrani(musteri: number, liste: number | null): number {
  if (liste === null || !(liste > 0) || !(musteri > 0) || musteri >= liste) return 0;
  return 1 - musteri / liste;
}

/** Sorgu başarısız — her ürün «sorgulanamadı» (boş sonuç TEMİZ sayılmaz). */
export function sorgulanamadi(u: BuyboxUrunu, kanal: BuyboxKanali): BuyboxSatiri {
  return bos(u, kanal, "SORGULANAMADI");
}

/**
 * TY satırı. `kayit` yoksa ürün için kanal kayıt döndürmedi → GÖRÜNMÜYOR.
 * `bizimFiyat` TY onaylı ürün listesinden (`priceSeenByCustomer` — müşterinin
 * gördüğü; 25.10 ölçümü: 100 varyantın 15'inde satış fiyatından farklı).
 */
export function tySatiri(
  u: BuyboxUrunu,
  kayit: { buyboxFiyati: number | null; siramiz: number | null; ikinciFiyat: number | null; cokSatici: boolean } | null,
  bizimFiyat: number | null,
): BuyboxSatiri {
  if (kayit === null || kayit.siramiz === null) return { ...bos(u, "TY", "GORUNMUYOR"), bizimFiyat };
  return {
    ...bos(u, "TY", kayit.siramiz === 1 ? "BIRINCI" : "KAYBEDILDI"),
    bizimFiyat,
    buyboxFiyati: kayit.buyboxFiyati,
    siramiz: kayit.siramiz,
    saticiSayisi: kayit.cokSatici ? null : 1,
    ikinciFiyat: kayit.ikinciFiyat,
  };
}

/**
 * Satıcı adı karşılaştırma anahtarı — büyük/küçük ve i/ı/İ farkından BAĞIMSIZ.
 * ⚠ `toLocaleLowerCase("tr")` «AXCALI»yı «axcalı» (noktasız) yapar; ayardaki
 * «Axcali» ile kanalın «AXCALI»si eşleşmezdi (bekçi yakaladı 25.10.2026).
 */
export function saticiAnahtari(ad: string): string {
  return ad.trim().toLowerCase().normalize("NFD").replace(/̇/g, "").replace(/ı/g, "i").replace(/\s+/g, " ");
}

/**
 * HB satırı — o üründeki satıcı listesinden. Biz mağaza ADIYLA bulunuruz
 * (`ChannelAccount.magazaAdi`; HB kimlik vermiyor). Ad eşleşmezse
 * GÖRÜNMÜYOR — tahminle «sanırım biziz» denmez.
 */
export function hbSatiri(u: BuyboxUrunu, rakipler: readonly HbRakip[] | null, magazaAdi: string, ilan: HbIlan | null = null): BuyboxSatiri {
  if (rakipler === null) return { ...bos(u, "HB", "GORUNMUYOR"), hbIlan: ilan };
  const sirali = [...rakipler].sort((a, b) => a.sira - b.sira);
  const ad = saticiAnahtari(magazaAdi);
  /* Mağaza adı boşsa kimse «biz» sayılmaz — adı boş bir satıcıyla eşleşmek tahmin olurdu. */
  const biz = ad === "" ? null : (sirali.find((r) => saticiAnahtari(r.satici) === ad) ?? null);
  const ilk = sirali[0] ?? null;
  const ortak = {
    buyboxFiyati: ilk?.fiyat ?? null,
    buyboxSaticisi: ilk?.satici ?? null,
    saticiSayisi: sirali.length,
    rakipler: sirali,
  };
  if (biz === null) return { ...bos(u, "HB", "GORUNMUYOR"), ...ortak, hbIlan: ilan };
  /**
   * KAMPANYA: ilanda Hepsiburada'nın kampanya fiyatı var ya da sıralamanın
   * «liste» dediği fiyat ilandakinden ayrı (kaynağı bilinmeyen özel fiyat).
   * İkisinde de liste fiyatı değişince müşteri fiyatına ne olacağı bilinmiyor.
   */
  const kampanyaFiyatli = ilan !== null && ilan.kampanyaFiyati !== null && ayri(ilan.kampanyaFiyati, ilan.liste);
  const siralamaAyri = ilan !== null && biz.listeFiyati !== null && ayri(biz.listeFiyati, ilan.liste);
  /**
   * LİSTE (kâr ve ödeme tabanı): ilan okunduysa İLANDAN. Kampanya indirimini
   * Hepsiburada tam ödemiyorsa eline geçen ilan fiyatı değildir — taban
   * kampanya fiyatı (fazla kâr göstermektense eksik). İlan okunamadıysa
   * sıralamanın `originalPrice`ı (26.10 yolu; kampanyalı üründe YANLIŞ — ekran
   * ilanın okunamadığını sebeplerde yazar, otomatik gönderim yapılmaz).
   */
  const liste =
    ilan === null
      ? (biz.listeFiyati ?? biz.fiyat)
      : kampanyaFiyatli && !ilan.hbOduyor && ilan.kampanyaFiyati !== null
        ? ilan.kampanyaFiyati
        : ilan.liste;
  return {
    ...bos(u, "HB", biz.sira === 1 ? "BIRINCI" : "KAYBEDILDI"),
    ...ortak,
    bizimFiyat: biz.fiyat,
    siramiz: biz.sira,
    ikinciFiyat: sirali[1]?.fiyat ?? null,
    bizimListeFiyati: liste,
    kanalIndirimi: indirimOrani(biz.fiyat, liste),
    hbIlan: ilan,
    kampanya: kampanyaFiyatli || siralamaAyri,
  };
}

/** Buybox'a uzaklık: bizim − Buybox (TL) ve yüzde. Biri bilinmiyorsa `null`. */
export function buyboxFarki(s: Pick<BuyboxSatiri, "bizimFiyat" | "buyboxFiyati">): { tl: number; yuzde: number } | null {
  if (s.bizimFiyat === null || s.buyboxFiyati === null || s.buyboxFiyati <= 0) return null;
  return { tl: s.bizimFiyat - s.buyboxFiyati, yuzde: ((s.bizimFiyat - s.buyboxFiyati) / s.buyboxFiyati) * 100 };
}

/** Durum rozetinin tonu: bizde yeşil · kaybedildi kırmızı · görünmüyor sarı · sorgulanamadı nötr (hüküm yok). */
export function durumTonu(d: BuyboxDurumu): "olumlu" | "olumsuz" | "uyari" | "notr" {
  return d === "BIRINCI" ? "olumlu" : d === "KAYBEDILDI" ? "olumsuz" : d === "GORUNMUYOR" ? "uyari" : "notr";
}

/**
 * Fark rozetinin tonu. Kaybedilmiş üründe fiyatımız Buybox'tan PAHALI DEĞİLSE
 * (fark ≤ 0) sarı: kaybı fiyat açıklamıyor, fiyatı eşitlemek yetmez — ekran bunu
 * ayrıca yazar (`esitAmaKayip`). Fark bilinmiyorsa nötr (uydurulmaz).
 */
export function farkTonu(s: Pick<BuyboxSatiri, "durum" | "bizimFiyat" | "buyboxFiyati">): "olumlu" | "olumsuz" | "uyari" | "notr" {
  if (s.durum === "BIRINCI") return "olumlu";
  const f = buyboxFarki(s);
  if (s.durum !== "KAYBEDILDI" || f === null) return "notr";
  return f.tl <= 0 ? "uyari" : "olumsuz";
}

/** Kaybedilmiş ama fiyatımız Buybox'tan pahalı değil — fiyat dışı bir ölçüt belirliyor. */
export function esitAmaKayip(s: Pick<BuyboxSatiri, "durum" | "bizimFiyat" | "buyboxFiyati">): boolean {
  return farkTonu(s) === "uyari";
}

export const BUYBOX_LISTELERI = ["kaybedilen", "birinci", "gorunmuyor", "hepsi"] as const;
export type BuyboxListesi = (typeof BUYBOX_LISTELERI)[number];

/** Buybox ekranının adresi — dışarıdan (panel) bağlanan her rakam buradan (İlke #16). */
export const BUYBOX_YOLU = "/rapor/buybox";
export function buyboxAdresi(kanal: BuyboxKanali, liste: BuyboxListesi): string {
  return `${BUYBOX_YOLU}?kanal=${kanal}&liste=${liste}`;
}

/**
 * Liste süzgeci. «Kaybedilen» sırası: Buybox'a EN YAKIN olan önce (küçük fark
 * yüzdesi — en az fiyat hareketiyle geri alınabilecek); farkı bilinmeyen sona.
 * Ötekiler ürün adına göre.
 */
export function buyboxListesi(satirlar: readonly BuyboxSatiri[], liste: BuyboxListesi): BuyboxSatiri[] {
  const ada = (a: BuyboxSatiri, b: BuyboxSatiri) => a.urunAdi.localeCompare(b.urunAdi, "tr");
  if (liste === "hepsi") return [...satirlar].sort(ada);
  if (liste === "birinci") return satirlar.filter((s) => s.durum === "BIRINCI").sort(ada);
  if (liste === "gorunmuyor") return satirlar.filter((s) => s.durum === "GORUNMUYOR" || s.durum === "SORGULANAMADI").sort(ada);
  return satirlar
    .filter((s) => s.durum === "KAYBEDILDI")
    .sort((a, b) => {
      const fa = buyboxFarki(a)?.yuzde ?? Number.POSITIVE_INFINITY;
      const fb = buyboxFarki(b)?.yuzde ?? Number.POSITIVE_INFINITY;
      return fa - fb || ada(a, b);
    });
}

/** Denetim özeti (anayasa: incelenen · temiz · sapan · incelenemeyen AYRI sayılır). */
export function buyboxOzeti(satirlar: readonly BuyboxSatiri[]): { incelenen: number; birinci: number; kaybedilen: number; gorunmuyor: number; sorgulanamadi: number } {
  const say = (d: BuyboxDurumu) => satirlar.filter((s) => s.durum === d).length;
  return { incelenen: satirlar.length, birinci: say("BIRINCI"), kaybedilen: say("KAYBEDILDI"), gorunmuyor: say("GORUNMUYOR"), sorgulanamadi: say("SORGULANAMADI") };
}

/** Arama — ad · SKU · Firma SKU · barkod · kanal kodu (Türkçe, büyük/küçük duyarsız). */
export function buyboxAra(satirlar: readonly BuyboxSatiri[], arama: string | null): BuyboxSatiri[] {
  const q = (arama ?? "").trim().toLocaleLowerCase("tr");
  if (q === "") return [...satirlar];
  return satirlar.filter((s) => [s.urunAdi, s.sku, s.firmaSku, s.barkod, s.kanalKodu].some((x) => x !== null && x.toLocaleLowerCase("tr").includes(q)));
}

/** Alım rehberinin piyasa sütunu: kanal başına Buybox fiyatı. `null` = bilinmiyor (ilan yok, kanal dönmedi ya da sorgu düştü). */
export type PiyasaFiyati = Record<BuyboxKanali, number | null>;

/**
 * Rehberde piyasa sorgusunun ürün TAVANI. Kanal başına 10'luk partilerle ~10
 * istek; ekran canlı sorgulandığı için bekleme sınırlı tutulur. Liste daha
 * uzunsa ilk N ürüne sorulur ve ekran bunu YAZAR (sessiz kesilme yok).
 */
export const PIYASA_TAVAN = 100;

/** Diziyi `boyut`luk partilere böler (kanal başına tek istekte en çok 10 kod). */
export function partilere<T>(dizi: readonly T[], boyut: number): T[][] {
  const sonuc: T[][] = [];
  for (let i = 0; i < dizi.length; i += boyut) sonuc.push(dizi.slice(i, i + boyut));
  return sonuc;
}
