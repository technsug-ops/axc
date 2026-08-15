import type { Currency } from "@/generated/prisma/enums";
import type { Parti } from "@/lib/stok";

/**
 * ============================================================================
 *  STOKTA BEKLEYEN — YAŞLANMA (SAF HESAP)
 * ----------------------------------------------------------------------------
 *  MİMAR KARARI 14.08.2026: ölçüt ADET DEĞİL YAŞLANMA.
 *  Gerekçe: arbitrajda asıl risk yaşlanan paradır — faizsiz kart süresi
 *  işlerken satılmayan mal ölü sermayedir. "50 adet var" eyleme dönüşmez;
 *  "bu kalem 95 gündür rafta ve 4.796 TL bağlı" doğrudan işe götürür.
 *
 *  YAŞ = EN ESKİ AÇIK FIFO PARTİSİNİN GİRİŞ TARİHİ. Ortalama yaş ya da son
 *  giriş DEĞİL: FIFO'da satılacak ilk mal en eski partidir, dolayısıyla
 *  "rafta en uzun bekleyen para" o partinin parasıdır. Son girişe bakmak,
 *  üstüne mal ekleyerek yaşı sıfırlamak demek olurdu.
 *
 *  BANTLAR SATIR ROZETİ, BÖLÜM BAŞLIĞI DEĞİL (kullanıcı kararı 14.08.2026).
 *  Ölçüldü: 19 kalemin 17'si 0-30 bandında; üç bölüm başlığı açmak listeyi
 *  bilgi yerine süsle bölerdi. Eşikler aynen duruyor, renge dönüştü.
 *  Hacim büyüyünce (150 paket/gün) aynı eşiklerle bölümlemeye dönmek
 *  tek satırlık iştir.
 *
 *  Veritabanına GİTMEZ; `panel:dogrula` bunu veri olmadan sınıyor.
 * ============================================================================
 */

/** Eşikler GÜN cinsinden — mimar kararı, ölçümle doğrulandı. */
export const YAS_BANTLARI = {
  /** Bu günden itibaren amber. */
  amberGun: 31,
  /** Bu günden itibaren kırmızı. */
  kirmiziGun: 61,
} as const;

export type YasBandi = "NOTR" | "AMBER" | "KIRMIZI";

export function yasBandi(gun: number): YasBandi {
  if (gun >= YAS_BANTLARI.kirmiziGun) return "KIRMIZI";
  if (gun >= YAS_BANTLARI.amberGun) return "AMBER";
  return "NOTR";
}

export type YaslanmaGirdisi = {
  variantId: string;
  /** O varyantın AÇIK partileri (FIFO sırası; `acikPartilerToplu`). */
  partiler: Parti[];
  /**
   * Kategoriden çözülen KDV oranı (%). Null ise varsayılan %20 kullanılır —
   * kategorisiz ürün bugün mümkün ve bu bir hata değil.
   */
  kdvOrani: number | null;
};

export type YaslanmaSatiri = {
  variantId: string;
  /** En eski açık partinin giriş tarihi. */
  enEskiGiris: Date;
  /** Bugüne kadar geçen TAM gün. */
  yasGun: number;
  bant: YasBandi;
  /** Açık partilerin kalan adet toplamı. */
  adet: number;
  /**
   * BAĞLI SERMAYE — KDV HARİÇ (mimar kararı).
   * Alış maliyeti KDV dahil tutulduğu için kategori oranıyla ayrıştırılır.
   *
   * NULL OLABİLİR, İKİ SEBEPTEN — ikisi de "sıfır" DEĞİLDİR:
   *   1. Maliyeti bilinmeyen parti var → sıfır saymak "bedava mal" demek
   *      olurdu (envanter değeri ekranıyla aynı ilke).
   *   2. Partiler İKİ FARKLI PARA BİRİMİNDE → toplamak kur çevirisi
   *      yapmak olurdu, o da yasak (CLAUDE.md). Bugün böyle bir kalem yok
   *      (14.08.2026 ölçümü: 39 partinin hepsi TRY) ama kural bekçisiz
   *      kalmasın.
   */
  sermayeKdvHaric: number | null;
  /** Sermayenin para birimi; hesaplanamadıysa null. */
  sermayeParaBirimi: Currency | null;
};

export type SiralamaOlcutu = "yas" | "sermaye";

export function siralamaGecerliMi(deger: string): deger is SiralamaOlcutu {
  return deger === "yas" || deger === "sermaye";
}

const GUN_MS = 86_400_000;

/** Gün farkı — saat taşımayan iş tarihleri için tam gün. */
export function gunFarki(gecmis: Date, an: Date): number {
  return Math.max(0, Math.floor((an.getTime() - gecmis.getTime()) / GUN_MS));
}

/**
 * Satırları kurar ve sıralar. Stoğu olmayan varyant listeye GİRMEZ.
 *
 * @param an "Bugün" — çağıran verir, böylece sınanabilir kalır.
 */
export function yaslanmaListesi(
  girdiler: YaslanmaGirdisi[],
  an: Date,
  olcut: SiralamaOlcutu = "yas",
): YaslanmaSatiri[] {
  const satirlar: YaslanmaSatiri[] = [];

  for (const g of girdiler) {
    const acik = g.partiler.filter((p) => p.kalanAdet > 0);
    if (acik.length === 0) continue;

    const adet = acik.reduce((t, p) => t + p.kalanAdet, 0);
    const enEskiGiris = acik.reduce(
      (en, p) => (p.occurredAt < en ? p.occurredAt : en),
      acik[0].occurredAt,
    );

    /**
     * MALİYETİ BİLİNMEYEN PARTİ TOPLAMI GEÇERSİZ KILAR. Diğer partileri
     * toplayıp "kısmi sermaye" göstermek, eksik rakamı tam sanmaya yol
     * açardı; ekran bunun yerine "hesaplanamadı" der.
     */
    const maliyetsizVar = acik.some(
      (p) => p.birimMaliyet === null || Number.isNaN(Number(p.birimMaliyet)),
    );

    // TEK PARA BİRİMİ ŞARTI — birden fazlaysa toplam kurulmaz (çevirim yasak).
    const paralar = new Set(
      acik.map((p) => p.birimMaliyetParaBirimi).filter((x) => x !== null),
    );
    const tekPara = paralar.size === 1 ? [...paralar][0]! : null;

    const kdv = g.kdvOrani ?? 20;
    const hesaplanir = !maliyetsizVar && tekPara !== null;
    const sermayeKdvHaric = hesaplanir
      ? acik.reduce(
          (t, p) => t + (Number(p.birimMaliyet) * p.kalanAdet) / (1 + kdv / 100),
          0,
        )
      : null;

    const yasGun = gunFarki(enEskiGiris, an);
    satirlar.push({
      variantId: g.variantId,
      enEskiGiris,
      yasGun,
      bant: yasBandi(yasGun),
      adet,
      sermayeKdvHaric,
      sermayeParaBirimi: hesaplanir ? tekPara : null,
    });
  }

  return siralaListeyi(satirlar, olcut);
}

/**
 * İKİ SIRALAMA, İKİ AYRI SORU (kullanıcı kararı 14.08.2026):
 *   yas     → "en uzun bekleyen hangisi?"
 *   sermaye → "en çok parayı hangisi tutuyor?"
 * İkisi aynı listeyi farklı sırada gösterir; ölçüldü ve ayrıştı: 95 günlük
 * kalem 4.797 TL, 14 günlük kalem 37.790 TL tutuyor. Tek sıralama
 * dayatılsaydı diğer soru cevapsız kalırdı.
 *
 * SERMAYE SIRASINDA "hesaplanamadı" SATIRLARI SONA atılır: bilinmeyen bir
 * değeri sıfır sayıp listenin dibine gömmek doğru, ama en tepeye koyup
 * "en pahalı" göstermek yanlış olurdu.
 */
export function siralaListeyi(
  satirlar: YaslanmaSatiri[],
  olcut: SiralamaOlcutu,
): YaslanmaSatiri[] {
  const kopya = [...satirlar];

  if (olcut === "sermaye") {
    return kopya.sort((a, b) => {
      if (a.sermayeKdvHaric === null && b.sermayeKdvHaric === null) {
        return b.yasGun - a.yasGun;
      }
      if (a.sermayeKdvHaric === null) return 1;
      if (b.sermayeKdvHaric === null) return -1;
      if (b.sermayeKdvHaric !== a.sermayeKdvHaric) {
        return b.sermayeKdvHaric - a.sermayeKdvHaric;
      }
      // Eşit sermayede yaşlı olan üstte: ikinci ölçüt hep yaş.
      return b.yasGun - a.yasGun;
    });
  }

  return kopya.sort((a, b) => {
    if (b.yasGun !== a.yasGun) return b.yasGun - a.yasGun;
    // Eşit yaşta parası büyük olan üstte; bilinmeyen sona.
    return (b.sermayeKdvHaric ?? -1) - (a.sermayeKdvHaric ?? -1);
  });
}

/**
 * Toplam bağlı sermaye — TEK PARA BİRİMİ İÇİN.
 *
 * Para birimi zorunlu parametre: imza gereği çağıran hangi birimin toplamını
 * istediğini söylemek zorunda. "Hepsini topla" demek mümkün olsaydı bir gün
 * TRY ile EUR aynı rakamda buluşurdu.
 *
 * `hesaplanamayan` sıfırdan ayrı durur — ekran "N kalemin sermayesi
 * hesaplanamadı" diye yazar, sessizce eksik toplam göstermez.
 */
export function sermayeToplami(
  satirlar: YaslanmaSatiri[],
  paraBirimi: Currency,
): { toplam: number; kalem: number; hesaplanamayan: number } {
  let toplam = 0;
  let kalem = 0;
  let hesaplanamayan = 0;

  for (const s of satirlar) {
    if (s.sermayeKdvHaric === null) {
      hesaplanamayan++;
      continue;
    }
    if (s.sermayeParaBirimi !== paraBirimi) continue;
    toplam += s.sermayeKdvHaric;
    kalem++;
  }
  return { toplam, kalem, hesaplanamayan };
}

/**
 * ============================================================================
 *  YAŞ SÜZGECİ — PANEL ROZETİ İLE /stok LİSTESİNİN TEK KAYNAĞI
 * ----------------------------------------------------------------------------
 *  15.08.2026, O2 testi düştü: panel "4 kalem 61+ gündür rafta" diyordu ama
 *  rozet panelin kendi sekmesine (`/?analiz=stok`) gidiyordu — ayrı bir
 *  ekrana değil. Rozet EYLEME götürmeli.
 *
 *  Rozetin saydığı küme ile açılan listenin kümesi AYNI OLMAK ZORUNDA
 *  (Halil testi maddesi c). Bu yüzden ölçüt burada, tek yerde: iki taraf da
 *  bu fonksiyonu çağırır. İki yerde iki koşul yazılsaydı biri gün eşiğini,
 *  diğeri para birimini süzer ve sayılar sessizce ayrışırdı.
 * ============================================================================
 */

/** Adres parametresi → yaş bandı. Tanımadığını sessizce varsayılana düşürmez. */
export function yasSuzgeciCoz(deger: string | undefined): YasBandi | null {
  if (deger === "kirmizi") return "KIRMIZI";
  if (deger === "amber") return "AMBER";
  return null;
}

/** Yaş bandı → adres parametresi. Tek yerde, iki yönlü. */
export const YAS_SUZGEC_KODU: Record<"AMBER" | "KIRMIZI", string> = {
  AMBER: "amber",
  KIRMIZI: "kirmizi",
};

/**
 * O banttaki varyantların kimlikleri — liste süzgecinin girdisi.
 *
 * KÜME TANIMI SADE: bandı tutan HER varyant. Sermayesi hesaplanamayanlar da
 * DAHİL — onlar da rafta bekliyor. Sermaye toplamı ayrı bir sorudur ve
 * `sermayeToplami` onu ayrıca söylüyor; ikisini karıştırmak "maliyeti
 * bilinmeyen kalem raftaki listede yok" gibi sessiz bir kayba yol açardı.
 */
export function bandinVaryantlari(
  satirlar: YaslanmaSatiri[],
  bant: YasBandi,
): string[] {
  return satirlar.filter((s) => s.bant === bant).map((s) => s.variantId);
}
