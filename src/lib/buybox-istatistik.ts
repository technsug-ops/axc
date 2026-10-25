import type { BuyboxDurumu } from "./buybox";

/**
 * ============================================================================
 *  BUYBOX İSTATİSTİĞİ — SAF HESAP (K363 Faz 3-b, kullanıcı kararı 25.10.2026)
 * ----------------------------------------------------------------------------
 *  «Gün içindeki Buybox aldığım sayıları grafik hâline getir ve istatistik
 *  olarak tut.» Kararlar: saatte bir ölçüm · toplam sayılar her ölçümde ·
 *  ürün bazında yalnız durumu DEĞİŞEN ürün.
 *  Burası veritabanına/ağa gitmez: hangi ürün yazılacak, ölçüm alınacak mı,
 *  grafik serisi nasıl kurulur. Okuma/yazma `buybox-istatistik-verisi.ts`te.
 *  ⛔ ÖLÇÜLMEYEN SAAT UYDURULMAZ: önceki değerle doldurulmaz, `null` kalır
 *  (grafikte nokta yok + «ölçülmedi» listesi).
 * ============================================================================
 */

export type KayitDurumu = "BIRINCI" | "KAYBEDILDI" | "GORUNMUYOR";

export const SAAT_MS = 3_600_000;

/**
 * Çift tetik kapısı: aynı hesap için AYNI SAAT DİLİMİNDE ölçüm varsa yeni
 * ölçüm alınmaz. İki tetik var: birincil (cron-job.org) :00'da, yedek
 * (GitHub) :35'te. Yedek yalnız birincil o saati kaçırdıysa yazar.
 * ⛔ ESKİ KURAL VE NİYE ÇEVRİLDİ (25.10.2026, ilk canlı ölçümden sonra):
 * «son ölçüm 45 dk'dan yeniyse atla» yazılıydı. Yedek :35'te bir kez yazınca
 * sonraki :00 (25 dk) hep atlanıyor, ölçüm fiilen güvenilmeyen yedeğe
 * kalıyordu; yedek bir saati kaçırınca o saat BOŞ kalırdı — birincil o saat
 * çalışmış olsa bile. Dilim ölçütü bu kilitlenmeyi kurmaz.
 * İstanbul ofseti tam saat (UTC+3) olduğu için UTC saat dilimi = İstanbul saat
 * dilimi; ölçüt saat dilimi okumaz.
 */
export function saatDilimi(an: Date): number {
  return Math.floor(an.getTime() / SAAT_MS);
}

export function olcumAlinsinMi(sonOlcum: Date | null, simdi: Date): boolean {
  if (sonOlcum === null) return true;
  return saatDilimi(simdi) > saatDilimi(sonOlcum);
}

/**
 * Yazılacak durum değişimleri. Kural:
 * · «Sorgulanamadı» YAZILMAZ — durum bilinmiyor; son bilinen durum geçerli kalır.
 * · Ürün ilk kez görülüyorsa başlangıç kaydı yazılır (`onceki: null`).
 * · Önceki durumla AYNIYSA yazılmaz.
 */
export function degisimler<T extends { variantId: string; durum: BuyboxDurumu }>(
  satirlar: readonly T[],
  oncekiler: ReadonlyMap<string, KayitDurumu>,
): { satir: T; onceki: KayitDurumu | null; yeni: KayitDurumu }[] {
  const sonuc: { satir: T; onceki: KayitDurumu | null; yeni: KayitDurumu }[] = [];
  for (const s of satirlar) {
    if (s.durum === "SORGULANAMADI") continue;
    const onceki = oncekiler.get(s.variantId) ?? null;
    if (onceki === s.durum) continue;
    sonuc.push({ satir: s, onceki, yeni: s.durum });
  }
  return sonuc;
}

/**
 * RAKİPLİ ÜRÜN — Buybox'ı rekabetle kazandığımız küme (kazanma oranının
 * paydası; Melontik örneği «9 / 120»). Tek satıcılı üründe Buybox zaten
 * bizdedir; onu saymak oranı şişirir.
 * · KAYBEDİLDİ → tanımı gereği rakipli.
 * · BİRİNCİ → satıcı sayısı 1 DEĞİLSE (TY yalnız «tek/çok» verir: çok = `null`).
 * · GÖRÜNMÜYOR / SORGULANAMADI → hüküm yok, sayılmaz.
 */
export function rakipliOzet(satirlar: readonly { durum: BuyboxDurumu; saticiSayisi: number | null }[]): { rakipli: number; rakipliBirinci: number } {
  let rakipli = 0;
  let rakipliBirinci = 0;
  for (const s of satirlar) {
    if (s.durum === "KAYBEDILDI") rakipli += 1;
    else if (s.durum === "BIRINCI" && s.saticiSayisi !== 1) {
      rakipli += 1;
      rakipliBirinci += 1;
    }
  }
  return { rakipli, rakipliBirinci };
}

/** Kazanma oranı (%). Rakipli ürün yoksa `null` — 0/0 «%0» değildir. */
export function kazanmaOrani(rakipliBirinci: number, rakipli: number): number | null {
  return rakipli > 0 ? (rakipliBirinci / rakipli) * 100 : null;
}

export type OlcumNoktasi = { olculduAt: Date; birinci: number; incelenen: number; rakipli: number; rakipliBirinci: number };

export type SeriNoktasi = {
  /** Saatlik görünümde saat (0–23), günlük görünümde günün başladığı an. */
  anahtar: string;
  an: Date;
  /** `null` = o dilimde ölçüm YOK. */
  birinci: number | null;
  incelenen: number | null;
  /** Kazanma oranı (%) — `null` = ölçüm yok ya da rakipli ürün yok. */
  oran: number | null;
  olcumSayisi: number;
};


/**
 * BUGÜN — saatlik seri. `gunBasi` İstanbul gece yarısı (mutlak an), `simdi`
 * dahil saate kadar dilim üretilir (gelecek saat çizilmez). Bir saatte birden
 * çok ölçüm varsa EN SONUNCUSU alınır (o saatin son fotoğrafı).
 */
export function saatlikSeri(olcumler: readonly OlcumNoktasi[], gunBasi: Date, simdi: Date): SeriNoktasi[] {
  const saatSayisi = Math.min(24, Math.max(0, Math.floor((simdi.getTime() - gunBasi.getTime()) / SAAT_MS) + 1));
  const dilimler: SeriNoktasi[] = Array.from({ length: saatSayisi }, (_, h) => ({
    anahtar: String(h),
    an: new Date(gunBasi.getTime() + h * SAAT_MS),
    birinci: null,
    incelenen: null,
    oran: null,
    olcumSayisi: 0,
  }));
  const sonAn = new Array<number>(saatSayisi).fill(-Infinity);
  for (const o of olcumler) {
    const h = Math.floor((o.olculduAt.getTime() - gunBasi.getTime()) / SAAT_MS);
    if (h < 0 || h >= saatSayisi) continue;
    const d = dilimler[h];
    d.olcumSayisi += 1;
    if (o.olculduAt.getTime() >= sonAn[h]) {
      sonAn[h] = o.olculduAt.getTime();
      d.birinci = o.birinci;
      d.incelenen = o.incelenen;
      d.oran = kazanmaOrani(o.rakipliBirinci, o.rakipli);
    }
  }
  return dilimler;
}

/**
 * 7 / 30 GÜN — günlük seri. `gunBaslari` sıralı İstanbul gece yarıları; bir
 * gün `[gunBasi, sonrakiGunBasi)` aralığıdır. Değer günün ölçümlerinin
 * ORTALAMASI (bir ondalık) — tek fotoğraf o günü temsil etmez.
 * Kazanma oranı ise TOPLAMLARIN oranıdır (Σ rakipli birinci ÷ Σ rakipli) —
 * oranların ortalaması küçük paydalı bir saati büyüklerle eşitlerdi.
 */
export function gunlukSeri(olcumler: readonly OlcumNoktasi[], gunBaslari: readonly Date[], bitis: Date): SeriNoktasi[] {
  return gunBaslari.map((bas, i) => {
    const son = i + 1 < gunBaslari.length ? gunBaslari[i + 1] : bitis;
    const icinde = olcumler.filter((o) => o.olculduAt >= bas && o.olculduAt < son);
    const ort = (sec: (o: OlcumNoktasi) => number) =>
      icinde.length === 0 ? null : Math.round((icinde.reduce((t, o) => t + sec(o), 0) / icinde.length) * 10) / 10;
    const oran = kazanmaOrani(
      icinde.reduce((t, o) => t + o.rakipliBirinci, 0),
      icinde.reduce((t, o) => t + o.rakipli, 0),
    );
    return { anahtar: bas.toISOString(), an: bas, birinci: ort((o) => o.birinci), incelenen: ort((o) => o.incelenen), oran, olcumSayisi: icinde.length };
  });
}

/** Ölçülmeyen dilimler — ekranda AYRICA yazılır (görünmeyen boşluk sorulamaz). */
export function olculmeyenler(seri: readonly SeriNoktasi[]): SeriNoktasi[] {
  return seri.filter((n) => n.olcumSayisi === 0);
}

export const ISTATISTIK_ARALIKLARI = ["bugun", "hafta", "ay"] as const;
export type IstatistikAraligi = (typeof ISTATISTIK_ARALIKLARI)[number];
/** Günlük görünümde kaç gün (bugün DAHİL). */
export const ARALIK_GUN: Record<Exclude<IstatistikAraligi, "bugun">, number> = { hafta: 7, ay: 30 };
