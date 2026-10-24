import { marjYuzdesi } from "@/lib/panel-listeler";

import type { AnalizSatiri } from "./urun-analizi";

/**
 * ============================================================================
 *  ALIM REHBERİ — SAF HESAP (K363 Faz 1, kullanıcı kararı 23.10.2026)
 * ----------------------------------------------------------------------------
 *  Kullanıcı: «Stok devir hızı yüksek, kâr marjı iyi ürünleri çıkar; birkaç
 *  liste alıp alışlarımıza yön verelim.» Faz 1 YALNIZ kendi verimiz.
 *
 *  ⛔ YENİ HESAP YOK — Ürün analizinin İKİ gövdesi BİRLEŞTİRİLİR:
 *  `satisEkseniVerisi` (dönemde satılan · ciro · NET-2) + `stokEkseniVerisi`
 *  (bugün rafta · bağlı sermaye). Marj `marjYuzdesi` ile (aynı fonksiyon) —
 *  iki ekran aynı ürüne iki farklı marj yazamaz.
 *  Ürün analizinde iki eksen AYRI duruyordu; «hızlı + kârlı + tükendi» sorusu
 *  tek ekranda sorulamıyordu (ihtiyacın kökü).
 *
 *  ── EŞİKLER VERİDEN (anayasa: «eşiği soruyu soran koyamaz») ──────────────
 *  · «hızlı» = günlük satış ≥ adayların ORTANCASI
 *  · «kârlı» = NET-2 marjı ≥ adayların ORTANCASI
 *  · aday = dönemde ≥ `EN_AZ_ADET` satan VE marjı hesaplanabilen ürün
 *    (tek satışlık ürünün hızı güvenilmez)
 *  · «fazla stok» = rafta var ve ya HİÇ satmıyor ya da stoğu en yavaş eriyen
 *    DÖRTTE BİR (kaç günlük stok, rafı olan ve satan ürünlerin üst çeyreği)
 *  · «az stok» günü — kullanıcı AYARI (başlangıç 30): alım döngüsüne bağlı,
 *    veriden çıkarılamıyor. ⚠ VARSAYIMDIR, ekranda öyle yazar.
 *  Ölçüldü 23.10.2026 (canlı, 90 gün): 154 aday · marj ortancası %16,5 ·
 *  günlük satış ortancası 0,044 · ikisini geçen 58 ürün (40'ı tükenmiş).
 * ============================================================================
 */

/**
 * DÖNEM = ÜRÜN ANALİZİNİN DÖNEM TÜRLERİ (`lib/donem`) — iki ekranda aynı dönem
 * seçilince aynı adet görünsün (İlke #10). Kendi «son 90 gün»ümü kursaydım
 * «Son 3 ay» ile birkaç gün kayar ve sayılar sessizce ayrışırdı.
 */
export const REHBER_DONEMLERI = ["SON_30_GUN", "SON_3_AY", "SON_6_AY"] as const;
export type RehberDonemi = (typeof REHBER_DONEMLERI)[number];
export const VARSAYILAN_DONEM: RehberDonemi = "SON_3_AY";

/** Dönemin GÜN sayısı — başından BUGÜNE (pencere ay sonuna uzansa da gelecek sayılmaz). */
export function donemGunu(baslangic: Date, bitisHaric: Date, an: Date): number {
  const son = Math.min(bitisHaric.getTime(), an.getTime());
  return Math.max(1, Math.round((son - baslangic.getTime()) / 86_400_000));
}
export const EN_AZ_ADET = 3;
export const VARSAYILAN_AZ_STOK_GUN = 30;

export const REHBER_LISTELERI = ["tukenen", "azalan", "fazla", "karsiz"] as const;
export type RehberListesi = (typeof REHBER_LISTELERI)[number];

/**
 * SEKMELER = dört liste + «Geçen yıl bu dönem» (K363 Faz 2-a, kullanıcı onayı
 * 23.10.2026). Beşinci sekme AYRI bir kümeye bakar (geçen yılın satışı, bugünün
 * rafı); dört liste dönem eşiklerine bağlı, bu değil — bu yüzden `rehberListesi`
 * switch'ine girmedi, kendi gövdesi var (`gecenYilListesi`).
 * Altıncı sekme «Özel günler» (Faz 2-b, 24.10.2026): yaklaşan özel günün GEÇEN
 * YILKI KARŞILIĞINA bakar (`lib/ozel-gun`); sekme sayısı ürün değil GÜN sayısıdır.
 * Yedinci sekme «Kampanyada iyi aldıkların» (Faz 2-d, 24.10.2026): dönemde
 * satılan ve son alışı en ucuz alışından pahalı ürünler (`lib/alim-fiyat-hafizasi`).
 */
export const REHBER_SEKMELERI = [...REHBER_LISTELERI, "gecenYil", "ozelGun", "iyiAlim"] as const;
export type RehberSekmesi = (typeof REHBER_SEKMELERI)[number];

/** «Önümüzdeki N gün» — geçen yılın aynı tarihlerine bakılır. */
export const ILERI_GUNLER = [30, 60, 90] as const;
export type IleriGun = (typeof ILERI_GUNLER)[number];
export const VARSAYILAN_ILERI: IleriGun = 30;

export type RehberSatiri = {
  variantId: string;
  urunId: string | null;
  urunAdi: string;
  sku: string;
  barkod: string | null;
  firmaSku: string | null;
  marka: string | null;
  kategori: string | null;
  /** Dönemde satılan adet (iptal ve kaldırılan kalem hariç — satış gövdesinin kuralı). */
  adet: number;
  ciro: number;
  net2: number;
  /** NET-2 ÷ hesaplanmış ciro × 100. `null` = hesaplanamadı (SIFIR DEĞİL). */
  marj: number | null;
  gunlukSatis: number;
  gunlukNet2: number;
  /** Bugün rafta (açık partiler). */
  raf: number;
  /** raf ÷ günlük satış. `null` = hiç satmıyor (sonsuz). */
  stokGunu: number | null;
  /** KDV hariç, TRY. `null` = maliyeti bilinmiyor (sıfır sayılmaz). */
  bagliSermaye: number | null;
};

export type RehberEsikleri = {
  adaySayisi: number;
  /** `null` = aday yok, eşik kurulamadı — listeler BOŞ döner, uydurulmaz. */
  marjOrtancasi: number | null;
  hizOrtancasi: number | null;
  /** Fazla stok sınırı (gün). `null` = ölçülecek ürün yok. */
  fazlaStokGunu: number | null;
};

export function donemCoz(ham: string | undefined): RehberDonemi {
  return (REHBER_DONEMLERI as readonly string[]).includes(ham ?? "") ? (ham as RehberDonemi) : VARSAYILAN_DONEM;
}

export function listeCoz(ham: string | undefined): RehberSekmesi {
  return (REHBER_SEKMELERI as readonly string[]).includes(ham ?? "") ? (ham as RehberSekmesi) : "tukenen";
}

export function ileriCoz(ham: string | undefined): IleriGun {
  const n = Number(ham);
  return (ILERI_GUNLER as readonly number[]).includes(n) ? (n as IleriGun) : VARSAYILAN_ILERI;
}

/**
 * GEÇEN YILIN PENCERESİ — yarından başlayıp `ileri` gün, TAKVİM tarihleriyle
 * bir yıl geri («geçen yıl aynı tarihler»; özel günler tarihe bağlı).
 * 52 hafta (364 gün) geri gitmek haftanın gününü korurdu ama tarihi bir gün
 * kaydırır — kampanya ve özel gün tarihe bağlı olduğu için TAKVİM seçildi.
 * ⚠ 29 Şubat geçen yılda yoksa 28 Şubat'a düşer (sessiz mart değil).
 * `bugun` = İstanbul takvim günü (çağıran `isTakvimGunu` ile verir).
 */
export function gecenYilPenceresi(
  bugun: { yil: number; ay: number; gun: number },
  ileri: number,
): { baslangic: string; bitis: string } {
  const kaydir = (g: Date) => {
    const yil = g.getUTCFullYear() - 1;
    const ay = g.getUTCMonth();
    const ayinSonGunu = new Date(Date.UTC(yil, ay + 1, 0)).getUTCDate();
    return new Date(Date.UTC(yil, ay, Math.min(g.getUTCDate(), ayinSonGunu)));
  };
  const metin = (d: Date) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  const yarin = new Date(Date.UTC(bugun.yil, bugun.ay - 1, bugun.gun + 1));
  const son = new Date(Date.UTC(bugun.yil, bugun.ay - 1, bugun.gun + ileri));
  return { baslangic: metin(kaydir(yarin)), bitis: metin(kaydir(son)) };
}

/**
 * KAPSAM — geçen yılın penceresine defter BAKABİLİYOR MU? (anayasa: «boş sonuç
 * ile temiz sonuç ayırt edilir»; «yeni izin doğum tarihi beyan edilir»).
 * · YOK   — pencerenin tamamı defterin ilk satışından önce: liste BOŞ, ama
 *           temiz olduğu için değil, bakılamadığı için.
 * · KISMI — pencere ilk satıştan önce başlıyor: liste yalnız sonrasını görür.
 * · TAM   — pencerenin tamamı defterin içinde.
 */
export type GecenYilKapsami = "TAM" | "KISMI" | "YOK";
export function gecenYilKapsami(ilkSatis: Date | null, baslangic: Date, bitisHaric: Date): GecenYilKapsami {
  if (ilkSatis === null || ilkSatis.getTime() >= bitisHaric.getTime()) return "YOK";
  return ilkSatis.getTime() > baslangic.getTime() ? "KISMI" : "TAM";
}

/** Eksik = geçen yıl o pencerede satılan − bugün raf (en az 0). */
export function eksikAdet(s: RehberSatiri): number {
  return Math.max(0, s.adet - s.raf);
}

/**
 * «GEÇEN YIL BU DÖNEM» — `satirlar` GEÇEN YILIN penceresinden kurulmuş olmalı
 * (`rehberKur(gecenYilSatis, bugunkuStok, ileri)`). Girer: geçen yıl en az
 * `EN_AZ_ADET` satmış · kârı hesaplanabilmiş VE pozitif · bugün rafı geçen
 * yılki satıştan AZ. Sıra: eksik adet, eşitse NET-2.
 * ⚠ Bir TAHMİN değil HATIRLATMA: geçen yılın satışı o kampanyaya ve o günkü
 * alıma da bağlı (iş sabiti: «alım kampanya döngüsüne bağlıdır») — ekran yazar.
 */
export function gecenYilListesi(satirlar: RehberSatiri[]): RehberSatiri[] {
  return satirlar
    .filter((s) => s.adet >= EN_AZ_ADET && s.marj !== null && s.net2 > 0 && eksikAdet(s) > 0)
    .sort((a, b) => eksikAdet(b) - eksikAdet(a) || b.net2 - a.net2);
}

/** 1–365 arası tam gün; değilse varsayılan (sessiz uydurma değil: ekran hangi değeri kullandığını yazar). */
export function azStokCoz(ham: string | undefined): number {
  const n = Number(ham);
  return Number.isInteger(n) && n >= 1 && n <= 365 ? n : VARSAYILAN_AZ_STOK_GUN;
}

/** Ortanca (çift sayıda alt-orta değil, iki ortanın ortalaması). Boş → null. */
export function ortanca(degerler: number[]): number | null {
  if (degerler.length === 0) return null;
  const s = [...degerler].sort((a, b) => a - b);
  const o = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[o] : (s[o - 1] + s[o]) / 2;
}

/** Yüzdelik (en yakın sıra). Boş → null. */
function yuzdelik(degerler: number[], p: number): number | null {
  if (degerler.length === 0) return null;
  const s = [...degerler].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1))];
}

/**
 * Satış + stok tek satır. Dönemde satan HER ürün ve bugün rafta duran HER ürün
 * girer (satmayan ama rafta duran «fazla stok» için gerekli).
 */
export function rehberKur(satis: AnalizSatiri[], stok: AnalizSatiri[], gun: number): RehberSatiri[] {
  const stokHarita = new Map(stok.map((s) => [s.variantId, s]));
  const satisHarita = new Map(satis.map((s) => [s.variantId, s]));
  const kimlikler = new Set([...satisHarita.keys(), ...stok.filter((s) => (s.rafAdedi ?? 0) > 0).map((s) => s.variantId)]);
  const sonuc: RehberSatiri[] = [];
  for (const id of kimlikler) {
    const sa = satisHarita.get(id);
    const st = stokHarita.get(id);
    const k = sa ?? st!;
    const adet = sa?.adet ?? 0;
    const raf = st?.rafAdedi ?? 0;
    const gunlukSatis = adet / gun;
    sonuc.push({
      variantId: id,
      urunId: k.urunId,
      urunAdi: k.urunAdi,
      sku: k.sku,
      barkod: k.barkod,
      firmaSku: k.firmaSku,
      marka: k.marka,
      kategori: k.kategori,
      adet,
      ciro: sa?.ciro ?? 0,
      net2: sa?.net2 ?? 0,
      marj: sa ? marjYuzdesi(sa) : null,
      gunlukSatis,
      gunlukNet2: (sa?.net2 ?? 0) / gun,
      raf,
      stokGunu: gunlukSatis > 0 ? raf / gunlukSatis : null,
      bagliSermaye: st?.bagliSermaye ?? null,
    });
  }
  return sonuc;
}

function adayMi(s: RehberSatiri): boolean {
  return s.adet >= EN_AZ_ADET && s.marj !== null;
}

export function esikleriKur(satirlar: RehberSatiri[]): RehberEsikleri {
  const adaylar = satirlar.filter(adayMi);
  return {
    adaySayisi: adaylar.length,
    marjOrtancasi: ortanca(adaylar.map((a) => a.marj as number)),
    hizOrtancasi: ortanca(adaylar.map((a) => a.gunlukSatis)),
    fazlaStokGunu: yuzdelik(
      satirlar.filter((s) => s.raf > 0 && s.stokGunu !== null).map((s) => s.stokGunu as number),
      75,
    ),
  };
}

function yildizMi(s: RehberSatiri, e: RehberEsikleri): boolean {
  return (
    adayMi(s) && e.marjOrtancasi !== null && e.hizOrtancasi !== null &&
    (s.marj as number) >= e.marjOrtancasi && s.gunlukSatis >= e.hizOrtancasi
  );
}

/** Dört liste — her biri kendi kuralı ve kendi sırası. Saf; sayı = liste. */
export function rehberListesi(
  tur: RehberListesi,
  satirlar: RehberSatiri[],
  e: RehberEsikleri,
  azStokGun: number,
): RehberSatiri[] {
  switch (tur) {
    case "tukenen":
      return satirlar.filter((s) => yildizMi(s, e) && s.raf <= 0).sort((a, b) => b.gunlukNet2 - a.gunlukNet2);
    case "azalan":
      return satirlar
        .filter((s) => yildizMi(s, e) && s.raf > 0 && s.stokGunu !== null && s.stokGunu < azStokGun)
        .sort((a, b) => (a.stokGunu as number) - (b.stokGunu as number));
    case "fazla":
      return satirlar
        .filter((s) => s.raf > 0 && (s.stokGunu === null || (e.fazlaStokGunu !== null && s.stokGunu > e.fazlaStokGunu)))
        .sort((a, b) => (b.bagliSermaye ?? -1) - (a.bagliSermaye ?? -1));
    case "karsiz":
      return satirlar
        .filter((s) => adayMi(s) && e.marjOrtancasi !== null && e.hizOrtancasi !== null &&
          s.gunlukSatis >= e.hizOrtancasi && (s.marj as number) < e.marjOrtancasi)
        .sort((a, b) => b.adet - a.adet);
  }
}

/** Arama — ad · SKU · Firma SKU · barkod içinde (büyük/küçük harf duyarsız, Türkçe). */
export function rehberAra(satirlar: RehberSatiri[], arama: string | null): RehberSatiri[] {
  const q = (arama ?? "").trim().toLocaleLowerCase("tr");
  if (q === "") return satirlar;
  return satirlar.filter((s) =>
    [s.urunAdi, s.sku, s.firmaSku, s.barkod].some((x) => x !== null && x.toLocaleLowerCase("tr").includes(q)),
  );
}

export type RehberToplami = { urun: number; adet: number; net2: number; raf: number; eksik: number; bagliSermaye: number; sermayesiBilinmeyen: number };

/** Liste toplamı (İlke #15) — ekranda ne varsa onun toplamı. */
export function rehberToplami(satirlar: RehberSatiri[]): RehberToplami {
  return satirlar.reduce(
    (t, s) => ({
      urun: t.urun + 1,
      adet: t.adet + s.adet,
      net2: t.net2 + s.net2,
      raf: t.raf + s.raf,
      eksik: t.eksik + eksikAdet(s),
      bagliSermaye: t.bagliSermaye + (s.raf > 0 ? (s.bagliSermaye ?? 0) : 0),
      sermayesiBilinmeyen: t.sermayesiBilinmeyen + (s.raf > 0 && s.bagliSermaye === null ? 1 : 0),
    }),
    { urun: 0, adet: 0, net2: 0, raf: 0, eksik: 0, bagliSermaye: 0, sermayesiBilinmeyen: 0 },
  );
}

export const REHBER_YOLU = "/rapor/alim-rehberi";
