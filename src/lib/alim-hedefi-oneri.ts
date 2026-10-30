import type { FiyatHafizasi, IyiAlimSatiri } from "./alim-fiyat-hafizasi";
import type { BuyboxKanali } from "./buybox";
import type { RehberSatiri } from "./rapor/alim-rehberi";

/**
 * ============================================================================
 *  FİYAT TAKİBİ — «TAKİBE EKLE» ÖNERİLERİ · SAF HESAP (K363 Faz 3-e, kullanıcı
 *  kararı 30.10.2026)
 * ----------------------------------------------------------------------------
 *  Kullanıcı: «Daha önce kâr ettiklerimi tavsiye olarak listelesin, envanterde
 *  yoksa takip edeyim mi diye çıksın, 2 tıkla takibe başlayayım; topluca da
 *  girilebilsin — tükenen yıldızlar, kampanyada aldıklarım, en çok satılanlar,
 *  en çok kâr ettiklerim.»
 *
 *  ⭐ DÖRT KAYNAK, DÖRT AYRI GÖVDE DEĞİL: «tükenen» ve «kampanyada iyi aldıkların»
 *  rehberin KENDİ listeleridir (aynı sekmedeki sayı = buradaki küme); «çok
 *  satan» ve «çok kâr» rehberin dönem satırlarından sıralanır. Dönem rehberin
 *  dönem seçimidir — iki ekranda iki dönem yok.
 *  ⭐ ÖNERİLEN HEDEF = EN DÜŞÜK ALIŞ (`FiyatHafizasi.enUcuz`, kupon girildiyse
 *  CARİ fiyatla). Yalnız ÖNERİDİR: tek eklemede kutuda değiştirilebilir; toplu
 *  eklemede onay penceresi bunu söyler. Alış kaydı yoksa hedef UYDURULMAZ.
 *  ⚠ İŞ SABİTİ «fiyatın yönü yoktur»: en düşük alış bir hüküm değil, bir hedef
 *  ÖNERİSİDİR — hiçbir şey işaretlenmez.
 *  Bu dosya veritabanına ve ağa gitmez.
 * ============================================================================
 */

export const ONERI_KAYNAKLARI = ["tukenen", "iyiAlim", "cokSatan", "cokKar"] as const;
export type OneriKaynagi = (typeof ONERI_KAYNAKLARI)[number];
export function oneriKaynagiCoz(ham: string | undefined): OneriKaynagi {
  return (ONERI_KAYNAKLARI as readonly string[]).includes(ham ?? "") ? (ham as OneriKaynagi) : "tukenen";
}

/**
 * Ekranda en çok bu kadar satır çizilir (çok satanlar dönemde yüzlerce ürün olur).
 * Sayı ve toplam TAVANDAN BAĞIMSIZ bütün kümeyi söyler; arama bütün kümede arar.
 */
export const ONERI_TAVANI = 50;
/** Tek toplu eklemede en çok — iz tek kayıtta tutulur, boyutu sınırlı kalsın. */
export const TOPLU_TAVAN = 200;

/**
 * Kaynağın kümesi ve sırası. `yalnizRaftaOlmayan` (varsayılan açık): «envanterde
 * yok» — rafta 0 olanlar. Tükenen zaten raf 0'dır; ötekiler süzülür.
 */
export function oneriKumesi(
  kaynak: OneriKaynagi,
  k: { tukenen: readonly RehberSatiri[]; iyiAlim: readonly IyiAlimSatiri[]; satirlar: readonly RehberSatiri[] },
  yalnizRaftaOlmayan: boolean,
): RehberSatiri[] {
  const kume =
    kaynak === "tukenen"
      ? [...k.tukenen]
      : kaynak === "iyiAlim"
        ? k.iyiAlim.map((x) => x.satir)
        : kaynak === "cokSatan"
          ? k.satirlar.filter((s) => s.adet > 0).sort((a, b) => b.adet - a.adet || b.net2 - a.net2)
          : k.satirlar.filter((s) => s.net2 > 0).sort((a, b) => b.net2 - a.net2 || b.adet - a.adet);
  return yalnizRaftaOlmayan ? kume.filter((s) => s.raf <= 0) : kume;
}

/** Önerilen hedef: en düşük alış (kıyas fiyatı). Alış kaydı yoksa `null` — uydurulmaz. */
export function onerilenHedef(h: FiyatHafizasi | null | undefined): number | null {
  if (!h || !(h.enUcuz.fiyat > 0)) return null;
  return Math.round(h.enUcuz.fiyat * 100) / 100;
}

/**
 * Hedef KUTUSUNA yazılacak metin («1069,49») — gösterim değil GİRDİ biçimi:
 * `hedefCoz` bunu aynı sayıya geri çözer (bekçi gidiş-dönüşü sınar).
 */
export function hedefGirdiMetni(n: number): string {
  return n.toFixed(2).replace(".", ",");
}

export type OneriDurumu = "TAKIPTE" | "ILAN_YOK" | "ALIS_YOK" | "UYGUN";

/**
 * Satırın durumu — sıra önemli: takipte olan ürün yeniden eklenmez (hedefi
 * ezilmesin); ilanı olmayanın fiyatı okunamaz; alışı olmayanın hedefi önerilemez
 * (tek eklemede elle yazılabilir, toplu eklemede atlanır). Yalnız UYGUN toplu seçilir.
 */
export function oneriDurumu(p: { takipte: boolean; ilan: Record<BuyboxKanali, boolean>; hedef: number | null }): OneriDurumu {
  if (p.takipte) return "TAKIPTE";
  if (!p.ilan.TY && !p.ilan.HB) return "ILAN_YOK";
  if (p.hedef === null) return "ALIS_YOK";
  return "UYGUN";
}
