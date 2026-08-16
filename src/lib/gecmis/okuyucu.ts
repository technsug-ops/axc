import { ayiCoz, donemTarihi, harfleriSadelestir } from "./ay";

/**
 * ============================================================================
 *  GEÇMİŞ KART EKSTRESİ — ÇAPRAZ TABLO OKUYUCU
 * ----------------------------------------------------------------------------
 *  Dosya SATIR-BAŞINA-KAYIT değil, ÇAPRAZ TABLO (ölçüldü 16.08.2026):
 *
 *      satır 1 : kart etiketleri      → sütun 1, 5, 10, 15, ... 50
 *      satır 2 : blok başlıkları      → Dönem · Borç · Ödenen miktar · Tarih
 *      satır 3+: veri                 → sütun 0 = YIL, her blok kendi ayını taşır
 *
 *  Her kart 4 sütunluk bir BLOK; ilk blok ("Toplam") kartlara ait değil ve
 *  atlanır — sayılsaydı bütün kartların toplamı 11. bir kart gibi girerdi.
 *
 *  ── SESSİZ ATLAMA YOK ───────────────────────────────────────────────────
 *  Atlanan her satırın SEBEBİ döner. "Yıllık Toplam" satırı, gelecek ayın
 *  sıfırı, çözülemeyen ay adı — hepsi ayrı sebeple raporlanır. Sayı ile
 *  dosya arasındaki fark kullanıcıya açıklanabilir olmalı; "160 bekliyordum
 *  148 geldi" sorusunun cevabı ekranda durmalı.
 * ============================================================================
 */

/** Bir kartın tablodaki bloğu. */
export type KartBloku = {
  /** Excel'deki ham etiket: "Akbank ( Hasan Akçalı Ayın 7 )". */
  etiket: string;
  /** Blok başlangıç sütunu (Dönem sütunu). */
  sutun: number;
};

export type OkunanEkstre = {
  kartEtiketi: string;
  yil: number;
  ay: number;
  donem: Date;
  /** Excel'de ay ne yazıyordu — izlenebilirlik için saklanır. */
  hamDonemMetni: string;
  borc: number;
  odenenTutar: number | null;
  odemeTarihi: Date | null;
};

export type AtlananSebep =
  | "YILLIK_TOPLAM"
  | "GELECEK_YA_DA_SIFIR"
  | "AY_COZULEMEDI"
  | "YIL_YOK"
  | "BORC_SAYI_DEGIL";

export type Atlanan = {
  sebep: AtlananSebep;
  satir: number;
  kartEtiketi: string | null;
  ayrinti: string | null;
};

export type OkumaSonucu = {
  ekstreler: OkunanEkstre[];
  atlananlar: Atlanan[];
  kartlar: KartBloku[];
};

/** "Toplam" bloğu kartlara ait değil — bütün kartların toplamı. */
function toplamBlogumu(etiket: string): boolean {
  return harfleriSadelestir(etiket).trim().startsWith("toplam");
}

/**
 * Kart bloklarını bulur. Etiket satırında boş olmayan her hücre bir bloktur;
 * "Toplam" bloğu elenir.
 */
export function kartBloklariniBul(etiketSatiri: unknown[]): KartBloku[] {
  const bloklar: KartBloku[] = [];
  for (let i = 0; i < etiketSatiri.length; i++) {
    const deger = etiketSatiri[i];
    if (typeof deger !== "string" || deger.trim() === "") continue;
    if (toplamBlogumu(deger)) continue;
    bloklar.push({ etiket: deger.trim(), sutun: i });
  }
  return bloklar;
}

/** Hücreyi sayıya çevirir; çevrilemezse null. Boş hücre de null. */
function sayi(deger: unknown): number | null {
  if (typeof deger === "number") return Number.isFinite(deger) ? deger : null;
  if (typeof deger === "string") {
    const temiz = deger.trim().replace(/\./g, "").replace(",", ".");
    if (temiz === "") return null;
    const n = Number(temiz);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Hücreyi tarihe çevirir; çevrilemezse null. */
function tarih(deger: unknown): Date | null {
  if (deger instanceof Date) return deger;
  if (typeof deger === "string" && deger.trim() !== "") {
    const d = new Date(deger);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/**
 * "Yıllık Toplam 2025" gibi bir özet satırı mı.
 *
 * ⚠ ATLANMAZSA İKİ YIL ÇİFT SAYILIR — dosyada 2025 ve 2026 için birer tane
 * var ve her biri o yılın bütün aylarının toplamını taşıyor.
 */
export function yillikToplamSatirimi(ilkHucre: unknown): boolean {
  if (typeof ilkHucre !== "string") return false;
  const sade = harfleriSadelestir(ilkHucre);
  return sade.includes("yillik") && sade.includes("toplam");
}

/**
 * Tabloyu okur.
 *
 * @param satirlar Sayfanın ham satırları (0'dan başlayarak).
 * @param etiketSatiriNo Kart etiketlerinin bulunduğu satır.
 * @param veriBaslangici İlk veri satırı.
 */
export function ekstreleriOku(girdi: {
  satirlar: unknown[][];
  etiketSatiriNo: number;
  veriBaslangici: number;
}): OkumaSonucu {
  const { satirlar, etiketSatiriNo, veriBaslangici } = girdi;
  const kartlar = kartBloklariniBul(satirlar[etiketSatiriNo] ?? []);
  const ekstreler: OkunanEkstre[] = [];
  const atlananlar: Atlanan[] = [];

  for (let r = veriBaslangici; r < satirlar.length; r++) {
    const satir = satirlar[r] ?? [];

    if (yillikToplamSatirimi(satir[0])) {
      atlananlar.push({
        sebep: "YILLIK_TOPLAM",
        satir: r,
        kartEtiketi: null,
        ayrinti: String(satir[0]),
      });
      continue;
    }

    const yil = sayi(satir[0]);
    if (yil === null || yil < 2000 || yil > 2100) {
      // Yılsız satır: boş ayırıcı ya da bozuk kayıt. Sessiz geçilmez.
      const doluMu = satir.some((h) => h !== null && h !== undefined && h !== "");
      if (doluMu) {
        atlananlar.push({
          sebep: "YIL_YOK",
          satir: r,
          kartEtiketi: null,
          ayrinti: JSON.stringify(satir.slice(0, 4)),
        });
      }
      continue;
    }

    for (const kart of kartlar) {
      const hamAy = satir[kart.sutun];
      const borc = sayi(satir[kart.sutun + 1]);

      // Bloğun tamamı boşsa o kartın o ay kaydı yok — bu bir hata değil,
      // rapora da girmez; her ay her kartın satırı olmak zorunda değil.
      if (
        (hamAy === null || hamAy === undefined || hamAy === "") &&
        borc === null
      ) {
        continue;
      }

      const ay = ayiCoz(hamAy);
      if (ay === null) {
        atlananlar.push({
          sebep: "AY_COZULEMEDI",
          satir: r,
          kartEtiketi: kart.etiket,
          ayrinti: hamAy === null ? null : String(hamAy),
        });
        continue;
      }

      if (borc === null) {
        atlananlar.push({
          sebep: "BORC_SAYI_DEGIL",
          satir: r,
          kartEtiketi: kart.etiket,
          ayrinti: String(satir[kart.sutun + 1]),
        });
        continue;
      }

      /**
       * SIFIR BORÇ İÇE ALINMAZ. Dosyada Eylül–Aralık 2026 satırları sıfır:
       * bunlar gelecek ayların yer tutucusu, GELECEĞİN BEYANI OLMAZ.
       * Geçmişte gerçekten sıfır olan bir ay da bilgi taşımaz — nakit akışına
       * hiçbir şey eklemez. Atlandığı raporlanır.
       */
      if (borc === 0) {
        atlananlar.push({
          sebep: "GELECEK_YA_DA_SIFIR",
          satir: r,
          kartEtiketi: kart.etiket,
          ayrinti: `${yil}-${String(ay).padStart(2, "0")}`,
        });
        continue;
      }

      ekstreler.push({
        kartEtiketi: kart.etiket,
        yil,
        ay,
        donem: donemTarihi(yil, ay),
        hamDonemMetni: String(hamAy),
        borc,
        odenenTutar: sayi(satir[kart.sutun + 2]),
        odemeTarihi: tarih(satir[kart.sutun + 3]),
      });
    }
  }

  return { ekstreler, atlananlar, kartlar };
}
