import type { BuyboxDurumu } from "./buybox";
import { fiyatSonucu, listeFiyatiIcin, musteriFiyati, type FiyatSonucu, type FiyatZemini, type MaliyetTercihi } from "./buybox-fiyat";

export { acikMaliyet, MALIYET_TERCIHLERI, type MaliyetTercihi } from "./buybox-fiyat";

/**
 * ============================================================================
 *  BUYBOX FİYAT KURALI — SAF HESAP (K366, kullanıcı kararları 27.10.2026)
 * ----------------------------------------------------------------------------
 *  Buybox satırı için ÖNERİLEN fiyatı üretir. Veritabanına ve ağa gitmez;
 *  gönderim ayrı (onaylı modda kullanıcı basar, otomatikte zamanlanmış iş).
 *  Tasarım: `docs/buybox-fiyat-kurali-tasarimi.md`.
 *
 *  KURAL (kullanıcı, 27.10.2026):
 *  · Buybox bizdeyse fiyat 2. satıcının bir ADIM altına YÜKSELTİLİR. Aradaki
 *    fark zaten adımdan küçükse dokunulmaz — hâlâ öndeyiz, düşürmek boşuna
 *    kâr kaybıdır («aradaki fiyatı minimumda tut»: adım bir ÜST sınırdır).
 *  · Buybox başkasındaysa Buybox fiyatının bir adım altı denenir; o fiyatta
 *    marj (NET-2 / satış fiyatı) minimumun ALTINDAYSA fiyat düşürülmez.
 *  · Tek satıcıysak (2. fiyat yok) dokunulmaz.
 *  · Maliyet, kargo ya da fiyat bilinmiyorsa öneri YOK — sebep yazar
 *    (bilinmeyen kâr «kârlı» sayılmaz; uydurulmaz).
 *
 *  Hedefler MÜŞTERİ fiyatıdır (Buybox müşteri fiyatıyla yarışır); kanala giden
 *  ve kârın hesaplandığı fiyat LİSTE fiyatıdır (HB kendi indirimi — K363 ④).
 * ============================================================================
 */

export const KURAL_MODLARI = ["ONAYLI", "OTOMATIK"] as const;
export type KuralModu = (typeof KURAL_MODLARI)[number];

export type GenelKural = { minMarj: number; adim: number; maliyet: MaliyetTercihi; mod: KuralModu };
/** Ürüne ayrı değerler; `null` = genel ayarı izle. */
export type UrunKurali = { minMarj: number | null; adim: number | null; maliyet: MaliyetTercihi | null; mod: KuralModu | null };

/**
 * Kullanıcı kararları 27.10.2026: marj %6 (satış fiyatına göre) · adım ₺50 ·
 * maliyet stoktaki EN DÜŞÜK alış (seçilebilir) · yeni ürün ONAYLI.
 * Genel ayar firma ayarından gelir; bu sabit yalnız ayar hiç kaydedilmemişken.
 */
export const VARSAYILAN_KURAL: GenelKural = { minMarj: 6, adim: 50, maliyet: "EN_DUSUK", mod: "ONAYLI" };

export type EtkinKural = GenelKural & { ayri: Record<keyof GenelKural, boolean> };

/**
 * Ürünün geçerli kuralı: ayrı değeri olan alan onu, olmayan GENEL ayarı izler.
 * Genel ayar değişince ayrı değeri olmayan ürün kendiliğinden yeniye geçer.
 */
export function etkinKural(genel: GenelKural, urun: UrunKurali | null): EtkinKural {
  const sec = <K extends keyof GenelKural>(k: K): GenelKural[K] => (urun?.[k] ?? genel[k]) as GenelKural[K];
  return {
    minMarj: sec("minMarj"),
    adim: sec("adim"),
    maliyet: sec("maliyet"),
    mod: sec("mod"),
    ayri: {
      minMarj: urun?.minMarj != null,
      adim: urun?.adim != null,
      maliyet: urun?.maliyet != null,
      mod: urun?.mod != null,
    },
  };
}

export type OneriGirdisi = {
  durum: BuyboxDurumu;
  /** Müşterinin gördüğü bizim fiyat. */
  bizimFiyat: number | null;
  /** İlandaki (liste) fiyat — HB; TY'de `null` (= bizimFiyat). */
  bizimListeFiyati: number | null;
  buyboxFiyati: number | null;
  ikinciFiyat: number | null;
  /** 0 ≤ oran < 1 — HB kendi indirimi; TY 0. */
  kanalIndirimi: number;
  /**
   * HB kampanyası (27.10.2026): liste fiyatı değişince müşteri fiyatına ne
   * olacağı bilinmiyor → öneri YOK (`DOKUNMA` · `KAMPANYA`). TY: false.
   */
  kampanya: boolean;
  /** HB fiyat artışını kilitlemiş — yükseltme önerilmez (`ARTIS_KAPALI`). TY: false. */
  artisKapali: boolean;
};

export type OneriSebebi =
  /** Buybox / sıralama okunamadı ya da ürün kanalda görünmüyor. */
  | "DURUM_YOK"
  /** Bizim ya da Buybox fiyatı okunamadı. */
  | "FIYAT_YOK"
  /** Rafta maliyeti bilinen parti yok. */
  | "MALIYET_YOK"
  /** Kargo bilinmiyor (desi, firma ya da tarife). */
  | "KARGO_YOK"
  /** Motor NET-2 üretemedi (komisyon oranı vb.). */
  | "NET_YOK";

export type Oneri =
  | {
      tur: "GONDER";
      neden: "IKINCI_ALTI" | "BUYBOX_AL";
      /** Müşteri fiyatı hedefi. */
      hedef: number;
      /** Kanala gidecek liste fiyatı. */
      listeFiyati: number;
      musteri: number;
      sonuc: FiyatSonucu;
    }
  | {
      tur: "DOKUNMA";
      /**
       * RAKIP_YOK: tek satıcıyız · YAKIN: öndeyiz ve 2. ile fark zaten adım kadar
       * ya da daha az · TABAN: Buybox'ı alacak fiyatta marj minimumun altında ·
       * FIYAT_DISI: fiyatımız Buybox'tan pahalı değil, kaybı fiyat açıklamıyor ·
       * KAZANC_YOK: yükseltme NET-2'yi artırmıyor (komisyon dilimi atlaması) ·
       * KAMPANYA: HB kampanyasında, liste fiyatı değişince ne olacağı bilinmiyor ·
       * ARTIS_KAPALI: HB fiyat artışını kilitlemiş (yükseltme kanala gidemez).
       */
      neden: "RAKIP_YOK" | "YAKIN" | "TABAN" | "FIYAT_DISI" | "KAZANC_YOK" | "KAMPANYA" | "ARTIS_KAPALI";
      hedef: number | null;
      sonuc: FiyatSonucu | null;
    }
  | { tur: "HESAPLANAMAZ"; sebep: OneriSebebi };

const kurus = (x: number) => Math.round(x * 100) / 100;

/**
 * ÖNERİ. `zemin` ürünün bu kanaldaki kâr zemini (maliyet kural tercihine göre,
 * kargo dahil). Marj = NET-2 / LİSTE fiyatı (kâr liste fiyatından — K363 ④).
 */
export function fiyatOnerisi(g: OneriGirdisi, zemin: FiyatZemini, kural: Pick<GenelKural, "minMarj" | "adim">, bugun: Date): Oneri {
  if (g.durum !== "BIRINCI" && g.durum !== "KAYBEDILDI") return { tur: "HESAPLANAMAZ", sebep: "DURUM_YOK" };
  if (g.bizimFiyat === null) return { tur: "HESAPLANAMAZ", sebep: "FIYAT_YOK" };
  /**
   * HB KAMPANYASI (kullanıcı kararı 27.10.2026): liste fiyatını değiştirmenin
   * Hepsiburada'nın kampanya fiyatına etkisi ölçülmedi — tahminle öneri yok.
   */
  if (g.kampanya) return { tur: "DOKUNMA", neden: "KAMPANYA", hedef: null, sonuc: null };

  if (g.durum === "BIRINCI") {
    /** Rakip yoksa fiyata dokunulmaz — maliyet/kargo bilinmese bile hüküm bu. */
    if (g.ikinciFiyat === null) return { tur: "DOKUNMA", neden: "RAKIP_YOK", hedef: null, sonuc: null };
    const hedef = kurus(g.ikinciFiyat - kural.adim);
    if (hedef <= g.bizimFiyat + 0.005) return { tur: "DOKUNMA", neden: "YAKIN", hedef, sonuc: null };
    /** Yükseltme: HB artışı kilitlediyse kanal reddeder — önerilmez. */
    if (g.artisKapali) return { tur: "DOKUNMA", neden: "ARTIS_KAPALI", hedef, sonuc: null };
    const eksik = eksikZemin(zemin);
    if (eksik) return { tur: "HESAPLANAMAZ", sebep: eksik };
    const listeFiyati = listeFiyatiIcin(hedef, g.kanalIndirimi);
    const sonuc = fiyatSonucu(zemin, listeFiyati, bugun);
    const simdiki = fiyatSonucu(zemin, g.bizimListeFiyati ?? g.bizimFiyat, bugun);
    if (sonuc.net2 === null || simdiki.net2 === null) return { tur: "HESAPLANAMAZ", sebep: "NET_YOK" };
    /**
     * YÜKSELTME minimum marja bakmaz: kârı artırır. Yalnız NET-2'yi artırmıyorsa
     * (fiyat bir üst komisyon dilimine geçip kesinti büyüyor) yapılmaz.
     */
    if (sonuc.net2 <= simdiki.net2) return { tur: "DOKUNMA", neden: "KAZANC_YOK", hedef, sonuc };
    return { tur: "GONDER", neden: "IKINCI_ALTI", hedef, listeFiyati, musteri: musteriFiyati(listeFiyati, g.kanalIndirimi), sonuc };
  }

  if (g.buyboxFiyati === null) return { tur: "HESAPLANAMAZ", sebep: "FIYAT_YOK" };
  /** Fiyatımız Buybox'tan pahalı değilse kaybı fiyat açıklamıyor — düşürmek işe yaramaz. */
  if (g.bizimFiyat <= g.buyboxFiyati + 0.005) return { tur: "DOKUNMA", neden: "FIYAT_DISI", hedef: null, sonuc: null };
  const hedef = kurus(g.buyboxFiyati - kural.adim);
  if (!(hedef > 0)) return { tur: "DOKUNMA", neden: "TABAN", hedef, sonuc: null };
  const eksik = eksikZemin(zemin);
  if (eksik) return { tur: "HESAPLANAMAZ", sebep: eksik };
  const listeFiyati = listeFiyatiIcin(hedef, g.kanalIndirimi);
  const sonuc = fiyatSonucu(zemin, listeFiyati, bugun);
  if (sonuc.net2 === null || sonuc.marj === null) return { tur: "HESAPLANAMAZ", sebep: "NET_YOK" };
  if (sonuc.marj < kural.minMarj) return { tur: "DOKUNMA", neden: "TABAN", hedef, sonuc };
  return { tur: "GONDER", neden: "BUYBOX_AL", hedef, listeFiyati, musteri: musteriFiyati(listeFiyati, g.kanalIndirimi), sonuc };
}

function eksikZemin(z: FiyatZemini): OneriSebebi | null {
  if (z.maliyet === null) return "MALIYET_YOK";
  if (z.kargoTarifesi === null) return "KARGO_YOK";
  return null;
}

/**
 * KARGO — ürünün bu hesapta TEK BAŞINA satıldığı en son siparişin kargosu
 * (kullanıcı kararı 27.10.2026: «daha önce satılmışsa desisi ve ödenen ücret
 * hafızada, onu baz al»). Tek başına = tek kalem, 1 adet, tek paket: çok
 * ürünlü paketin kargosu ürüne bölünemez. Satışlar YENİDEN ESKİYE sıralı
 * gelir; kargosu bilinmeyen (`tutar` null) atlanır. KDV HARİÇ (motorun
 * beklediği taban — `cargoAmount` / `tahminiKargo` ile aynı).
 */
export function tekBasinaKargo(
  satislar: readonly { kalemSayisi: number; adet: number; paketSayisi: number; tutar: number | null; desi: number | null }[],
): { tutar: number; desi: number | null; sira: number } | null {
  for (const [sira, s] of satislar.entries()) {
    if (s.kalemSayisi !== 1 || s.adet !== 1 || s.paketSayisi !== 1) continue;
    if (s.tutar === null) continue;
    return { tutar: s.tutar, desi: s.desi, sira };
  }
  return null;
}

/**
 * ============================================================================
 *  OTOMATİK GÖNDERİM KAPISI (K366 adım 3, kullanıcı onayı 27.10.2026 «tamamla»)
 * ----------------------------------------------------------------------------
 *  Öneri «gönder» dese bile zamanlanmış iş fiyatı ancak bu kapıdan geçerse
 *  kanala yollar. Tasarımdaki emniyet: «otomatik gönderim tabanın altına ASLA
 *  inmez; maliyet, kargo ya da rakip fiyatı okunamayan üründe hiçbir şey
 *  göndermez». Öneri gövdesi bunları zaten sağlıyor — kapı İKİNCİ savunmadır
 *  ve onaylı moddaki «zararına fiyat onayı»nın otomatik karşılığıdır: onay
 *  verecek kimse olmadığı için NET-2'si sıfır ya da eksi fiyat HİÇ gitmez.
 * ============================================================================
 */
export type OtomatikKarar =
  | { gonder: true; fiyat: number }
  | {
      gonder: false;
      /**
       * ONERI_YOK: öneri «dokunma» ya da hesaplanamadı · ZARAR: NET-2 sıfır,
       * eksi ya da bilinmiyor · TABAN: Buybox'ı alma fiyatında marj minimumun
       * altında · FIYAT_GECERSIZ: gönderilecek fiyat 0 ya da sayı değil ·
       * ILAN_YOK: HB ilan kaydı okunamadı (liste fiyatı bilinmiyor) ·
       * KAMPANYA: HB kampanyasında · ARTIS_KAPALI: HB artışı kilitli ve fiyat
       * ilandakinden yüksek.
       */
      sebep: "ONERI_YOK" | "ZARAR" | "TABAN" | "FIYAT_GECERSIZ" | "ILAN_YOK" | "KAMPANYA" | "ARTIS_KAPALI";
    };

/**
 * Satırın kanal durumu — kapının İKİNCİ savunması (öneri de bakar). HB'de
 * ilan kaydı okunmadan (`ilanOkundu: false`) liste fiyatı yalnız sıralamadan
 * gelir ve kampanyalı üründe yanlıştır (Tefal vakası) → gönderim yok.
 */
export type OtomatikSatir = { kanal: "TY" | "HB"; ilanOkundu: boolean; kampanya: boolean; artisKapali: boolean; listeFiyati: number | null };

export function otomatikKarar(o: Oneri, kural: Pick<GenelKural, "minMarj">, s: OtomatikSatir): OtomatikKarar {
  if (o.tur !== "GONDER") return { gonder: false, sebep: "ONERI_YOK" };
  if (s.kanal === "HB" && !s.ilanOkundu) return { gonder: false, sebep: "ILAN_YOK" };
  if (s.kampanya) return { gonder: false, sebep: "KAMPANYA" };
  if (s.artisKapali && (s.listeFiyati === null || o.listeFiyati > s.listeFiyati + 0.005)) return { gonder: false, sebep: "ARTIS_KAPALI" };
  if (!(Number.isFinite(o.listeFiyati) && o.listeFiyati > 0)) return { gonder: false, sebep: "FIYAT_GECERSIZ" };
  if (o.sonuc.net2 === null || o.sonuc.net2 <= 0) return { gonder: false, sebep: "ZARAR" };
  if (o.neden === "BUYBOX_AL" && (o.sonuc.marj === null || o.sonuc.marj < kural.minMarj)) return { gonder: false, sebep: "TABAN" };
  return { gonder: true, fiyat: o.listeFiyati };
}

/**
 * TEKRAR KAPISI — aynı ürüne aynı kanalda aynı fiyat kısa süre önce otomatik
 * gönderildiyse yeniden gönderilmez. Süre Trendyol'un KENDİ kuralı: aynı istek
 * 15 dakika içinde tekrarlanırsa reddediliyor (kanalın mesajı «15 minutes»,
 * kart eylemi bunu `TEKRAR_15DK` diye ayırıyor). Kanal fiyatı yansıtmadan bir
 * sonraki tur aynı öneriyi üretirse istek kanala gitmeden durur.
 */
export const TEKRAR_PENCERESI_DK = 15;

export function yakindaGonderildiMi(
  izler: readonly { kanal: string; fiyat: number; an: Date }[],
  kanal: string,
  fiyat: number,
  simdi: Date,
): boolean {
  const sinir = simdi.getTime() - TEKRAR_PENCERESI_DK * 60_000;
  return izler.some((i) => i.kanal === kanal && Math.abs(i.fiyat - fiyat) < 0.005 && i.an.getTime() >= sinir);
}
