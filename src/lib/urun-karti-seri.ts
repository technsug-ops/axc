import { gunDegeri, gunMetni, isTakvimGunu } from "@/lib/donem";

/**
 * ============================================================================
 *  ÜRÜN KÂRLILIK KARTI — DÖNEM ANALİZİNİN SAF HESAPLARI (K330, 10.10.2026)
 * ----------------------------------------------------------------------------
 *  Algoritmo ürün sayfasının bizim verimizdeki karşılığı. Bu dosya veritabanı
 *  okumaz; `urun-karti-analiz.ts` okur ve buraya verir. Bekçi gövdeleri
 *  ÇAĞIRIP değerini ölçer (kaynak taramaz).
 *
 *  ⚠ GÜN İŞ SAAT DİLİMİNDE (Europe/Istanbul) — çalışma ortamının saat dilimi
 *  kullanılmaz; anahtar `gunMetni(gunDegeri(isTakvimGunu(an)))`.
 *  ⚠ BİLİNMEYEN SIFIR DEĞİLDİR: ölçülemeyen her rakam `null` döner; ekran
 *  «?» ya da nedenini yazar.
 * ============================================================================
 */

const GUN_MS = 86_400_000;

/** Bir anın iş günü anahtarı ("2026-10-10"). */
export function gunAnahtari(an: Date): string {
  return gunMetni(gunDegeri(isTakvimGunu(an)));
}

/** İlk günden son güne (ikisi DAHİL) gün anahtarları — UTC gece yarısı çapalarından. */
export function gunListesi(ilkGun: Date, sonGun: Date): string[] {
  const sonuc: string[] = [];
  for (let t = ilkGun.getTime(); t <= sonGun.getTime() && sonuc.length < 800; t += GUN_MS) {
    sonuc.push(gunMetni(new Date(t)));
  }
  return sonuc;
}

/**
 * Önceki döneme göre değişim yüzdesi. Önceki dönem SIFIRSA yüzde YOKTUR
 * (`null`) — «sonsuz artış» ya da uydurma %100 yazılmaz.
 */
export function degisimYuzdesi(simdi: number, once: number): number | null {
  if (!Number.isFinite(simdi) || !Number.isFinite(once) || once === 0) return null;
  return ((simdi - once) / Math.abs(once)) * 100;
}

/**
 * STOK KAÇ GÜN YETER — eldeki ÷ (dönemde satılan ÷ dönemin gün sayısı).
 * Dönemde hiç satış yoksa hız ölçülemez → `null` (ekran «satış yok» der);
 * stok yoksa 0.
 */
export function stokYeterGun(eldeki: number, satilanAdet: number, gunSayisi: number): number | null {
  if (eldeki <= 0) return 0;
  if (satilanAdet <= 0 || gunSayisi <= 0) return null;
  return Math.round(eldeki / (satilanAdet / gunSayisi));
}

/**
 * GÜN SONU STOK SERİSİ — dönem başındaki stok + günün hareketleri.
 * Hareketin günü listede yoksa (dönem dışı) sayılmaz.
 */
export function gunlukStok(
  baslangicStok: number,
  hareketler: readonly { gun: string; delta: number }[],
  gunler: readonly string[],
): { gun: string; stok: number }[] {
  const gunDelta = new Map<string, number>();
  for (const h of hareketler) gunDelta.set(h.gun, (gunDelta.get(h.gun) ?? 0) + h.delta);
  let stok = baslangicStok;
  return gunler.map((gun) => {
    stok += gunDelta.get(gun) ?? 0;
    return { gun, stok };
  });
}

export type KartKalemi = {
  gun: string;
  /** Satır cirosu, KDV DAHİL (birim × adet). */
  ciro: number;
  adet: number;
  /** FIFO'dan düşülen maliyet; bilinmiyorsa null. */
  maliyet: number | null;
  net1: number | null;
  net2: number | null;
  kanal: string;
  hesap: string;
};

/**
 * KÂR MERDİVENİ — ciro → ürün maliyeti → komisyon+stopaj → NET-1 → KDV → NET-2.
 * ⚠ YALNIZ HESAPLANABİLEN KALEMLER: maliyeti ya da NET'i bilinmeyen kalem
 * merdivene GİRMEZ ve sayısı ayrıca döner; sessizce eksik bir merdiven tam
 * görünmesin. Ara basamaklar KAYITLI rakamlardan türetilir (ciro − maliyet −
 * NET-1 = kalem kesintileri) — merdiven kayıtla kuruşuna tutar.
 */
export function karMerdiveni(kalemler: readonly KartKalemi[]): {
  ciro: number;
  maliyet: number;
  kesinti: number;
  net1: number;
  kdv: number;
  net2: number;
  dahilKalem: number;
  haricKalem: number;
} {
  let ciro = 0, maliyet = 0, net1 = 0, net2 = 0, dahil = 0, haric = 0;
  for (const k of kalemler) {
    if (k.maliyet === null || k.net1 === null || k.net2 === null) {
      haric++;
      continue;
    }
    dahil++;
    ciro += k.ciro;
    maliyet += k.maliyet;
    net1 += k.net1;
    net2 += k.net2;
  }
  return { ciro, maliyet, kesinti: ciro - maliyet - net1, net1, kdv: net1 - net2, net2, dahilKalem: dahil, haricKalem: haric };
}

export type GunlukNokta = { gun: string; ciro: number; net2: number | null; adet: number; iade: number };

/**
 * GÜNLÜK SERİ — her gün bir nokta (satış olmayan gün 0). NET-2 o gün
 * hesaplanamayan kalem varsa `null` (kısmi toplam tam gibi çizilmez).
 */
export function gunlukSeri(
  kalemler: readonly KartKalemi[],
  iadeler: readonly { gun: string; adet: number }[],
  gunler: readonly string[],
): GunlukNokta[] {
  const harita = new Map<string, GunlukNokta>(gunler.map((g) => [g, { gun: g, ciro: 0, net2: 0, adet: 0, iade: 0 }]));
  for (const k of kalemler) {
    const n = harita.get(k.gun);
    if (!n) continue;
    n.ciro += k.ciro;
    n.adet += k.adet;
    n.net2 = n.net2 === null || k.net2 === null ? null : n.net2 + k.net2;
  }
  for (const i of iadeler) {
    const n = harita.get(i.gun);
    if (n) n.iade += i.adet;
  }
  return gunler.map((g) => harita.get(g)!);
}

/** Dağılım — ada göre ciro, büyükten küçüğe; pay toplam ciroya göre. */
export function dagilim(kalemler: readonly KartKalemi[], anahtar: "kanal" | "hesap"): { ad: string; ciro: number; adet: number; pay: number }[] {
  const toplam = kalemler.reduce((s, k) => s + k.ciro, 0);
  const h = new Map<string, { ciro: number; adet: number }>();
  for (const k of kalemler) {
    const v = h.get(k[anahtar]) ?? { ciro: 0, adet: 0 };
    v.ciro += k.ciro;
    v.adet += k.adet;
    h.set(k[anahtar], v);
  }
  return [...h.entries()]
    .map(([ad, v]) => ({ ad, ciro: v.ciro, adet: v.adet, pay: toplam > 0 ? v.ciro / toplam : 0 }))
    .sort((a, b) => b.ciro - a.ciro || a.ad.localeCompare(b.ad));
}

/**
 * KANAL BAŞINA FİYAT GELİŞİMİ — gerçekleşen birim satış fiyatı (adet ağırlıklı
 * günlük ortalama). Satış olmayan gün `null` (çizgi orada boşluk bırakır,
 * uydurma fiyat çizmez). Son ve dönem ortalaması ayrıca döner.
 */
export function kanalFiyatSerileri(
  kalemler: readonly KartKalemi[],
  gunler: readonly string[],
): { kanal: string; noktalar: (number | null)[]; son: number; ortalama: number }[] {
  const kanallar = new Map<string, Map<string, { ciro: number; adet: number }>>();
  for (const k of kalemler) {
    if (k.adet <= 0) continue;
    const g = kanallar.get(k.kanal) ?? new Map();
    const v = g.get(k.gun) ?? { ciro: 0, adet: 0 };
    v.ciro += k.ciro;
    v.adet += k.adet;
    g.set(k.gun, v);
    kanallar.set(k.kanal, g);
  }
  return [...kanallar.entries()]
    .map(([kanal, g]) => {
      const noktalar = gunler.map((gun) => {
        const v = g.get(gun);
        return v ? v.ciro / v.adet : null;
      });
      const dolu = gunler.filter((gun) => g.has(gun));
      const sonGun = dolu[dolu.length - 1]!;
      const son = g.get(sonGun)!;
      let c = 0, a = 0;
      for (const v of g.values()) { c += v.ciro; a += v.adet; }
      return { kanal, noktalar, son: son.ciro / son.adet, ortalama: c / a };
    })
    .sort((x, y) => x.kanal.localeCompare(y.kanal));
}

/** Oran (0–1) — payda sıfırsa `null`. */
export function oran(pay: number, payda: number): number | null {
  return payda > 0 ? pay / payda : null;
}
