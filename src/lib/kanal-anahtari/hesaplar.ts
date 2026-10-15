import { prisma } from "@/lib/prisma";

import { kimligiOku, type OkumaSonucu } from "./depo";
import type { HbKimlik, KanalKodu, N11Kimlik, TyKimlik } from "./kimlik";

/**
 * ============================================================================
 *  HESABIN KENDİ ANAHTARIYLA KOŞ — K337 3. adım (K303, 15.10.2026)
 * ----------------------------------------------------------------------------
 *  Pazaryerine giden her ÇAĞRI anahtarı buradan alır: önce HESAP bulunur
 *  (firma süzgeçli `prisma` — çağıran firma bağlamında koşar), sonra O
 *  HESABIN anahtarı okunur. Bugüne kadar yön tersti: tek takım ortam anahtarı
 *  okunuyor, hesap anahtardaki satıcı no'dan aranıyordu — iki firmada bir
 *  firmanın anahtarı ötekinin adına çekim yapabilirdi.
 *
 *  ⛔ ORTAM DEĞİŞKENİNE DÜŞME YOK: anahtarı olmayan hesap ATLANIR ve nedeni
 *  yazılır (kullanıcı kararı 15.10.2026 «tek seferlik taşıma» — Axcali'nin
 *  bugünkü anahtarları geçiş günü betikle hesaplarına yazılır; kodda geri
 *  dönüş yolu bırakılmaz, tek kaynak).
 *
 *  ⚠ DENEME ORTAMI: `kimligiOku` kimlik vermez → her hesap «DENEME_ORTAMI»
 *  sebebiyle atlanır, gerçek pazaryerine çağrı gitmez.
 * ============================================================================
 */

export type KanalHesabi = { id: string; name: string; externalId: string | null; apiHesapKimligi: string | null };

type KimlikTuru<K extends KanalKodu> = K extends "TRENDYOL" ? TyKimlik : K extends "HEPSIBURADA" ? HbKimlik : N11Kimlik;

export type AtlamaSebebi = Exclude<OkumaSonucu["durum"], "TAMAM">;

export type HesapSonucu<T> =
  | { hesap: string; durum: "KOSTU"; sonuc: T }
  | { hesap: string; durum: "ATLANDI"; sebep: AtlamaSebebi }
  | { hesap: string; durum: "HATA"; hata: string };

/**
 * SAF ÇEKİRDEK — hesaplar ve okuyucu verilir. Bir hesabın hatası ötekini
 * durdurmaz; hata TAM mesajla yazılır (anahtarın kendisi hiçbir metne girmez —
 * okuyucu yalnız kodu döner, iş kendi hata metnini üretir).
 */
export async function hesaplarlaKos<K extends KanalKodu, T>(
  kanal: K,
  hesaplar: KanalHesabi[],
  oku: (channelAccountId: string) => Promise<OkumaSonucu>,
  is: (hesap: KanalHesabi, kimlik: KimlikTuru<K>) => Promise<T>,
): Promise<HesapSonucu<T>[]> {
  const sonuclar: HesapSonucu<T>[] = [];
  for (const h of hesaplar) {
    const o = await oku(h.id);
    if (o.durum !== "TAMAM") {
      sonuclar.push({ hesap: h.name, durum: "ATLANDI", sebep: o.durum });
      continue;
    }
    // Anahtar BAŞKA bir kanala aitse koşmaz (bozuk kayıt ya da kanal değişmiş hesap).
    if (o.kimlik.kanal !== kanal) {
      sonuclar.push({ hesap: h.name, durum: "ATLANDI", sebep: "KANAL_DESTEKLENMIYOR" });
      continue;
    }
    try {
      sonuclar.push({ hesap: h.name, durum: "KOSTU", sonuc: await is(h, o.kimlik.kimlik as KimlikTuru<K>) });
    } catch (e) {
      const hata = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
      console.error(`[kanal-hesaplari] ${kanal} · ${h.name} HATA:`, hata);
      sonuclar.push({ hesap: h.name, durum: "HATA", hata });
    }
  }
  return sonuclar;
}

/** Bağlamdaki firmanın o kanaldaki AKTİF SATIŞ hesapları (anahtarı olsun olmasın — olmayan atlanır ve görünür). */
export async function satisHesaplari(kanal: KanalKodu): Promise<KanalHesabi[]> {
  return prisma.channelAccount.findMany({
    where: { satisIcin: true, isActive: true, channel: { code: kanal } },
    select: { id: true, name: true, externalId: true, apiHesapKimligi: true },
    orderBy: { name: "asc" },
  });
}

/**
 * EKRAN EYLEMİ İÇİN TEK HESAP (ürün kartındaki stok/fiyat gönder düğmeleri).
 * ⚠ «En eski/ilk hesap» SEÇİLMEZ (anayasa: seçici ölçüt, evren genişlediğinde ne
 * yapacağıyla tasarlanır): kanalda iki aktif satış hesabı varsa gönderim DURUR ve
 * «hangi hesap» belirsiz diye söylenir — yanlış mağazaya stok yazmaktansa durmak.
 */
export async function tekSatisHesabi(kanal: KanalKodu): Promise<{ tamam: true; hesap: KanalHesabi } | { tamam: false; kod: "HESAP_YOK" | "HESAP_BELIRSIZ" }> {
  const h = await satisHesaplari(kanal);
  if (h.length === 0) return { tamam: false, kod: "HESAP_YOK" };
  if (h.length > 1) return { tamam: false, kod: "HESAP_BELIRSIZ" };
  return { tamam: true, hesap: h[0]! };
}

/** Bir hesabın KENDİ anahtarı — yoksa/açılamıyorsa (deneme ortamı dahil) `null`. Ortama düşmez. */
export async function hesabinKimligi<K extends KanalKodu>(kanal: K, channelAccountId: string): Promise<KimlikTuru<K> | null> {
  const o = await kimligiOku(channelAccountId);
  if (o.durum !== "TAMAM" || o.kimlik.kanal !== kanal) return null;
  return o.kimlik.kimlik as KimlikTuru<K>;
}

/** Zamanlanmış işin kullandığı tam yol: bağlamdaki firmanın satış hesapları, her biri KENDİ anahtarıyla. */
export async function kanalHesaplariylaKos<K extends KanalKodu, T>(
  kanal: K,
  is: (hesap: KanalHesabi, kimlik: KimlikTuru<K>) => Promise<T>,
): Promise<HesapSonucu<T>[]> {
  return hesaplarlaKos(kanal, await satisHesaplari(kanal), kimligiOku, is);
}

/**
 * Bir firmanın hesap sonuçları zamanlayıcıya ne söyler (K264 sözleşmesi:
 * yeşil = «çekim koştu»). Anahtarı OLMAYAN hesap beklenen durumdur (firma
 * o kanalı bağlamamış) — kırmızı yapmaz. Anahtar VAR ama açılamıyorsa
 * (sır yok/bozuk) ya da iş hata verdiyse ya da işin kendisi atladıysa kırmızı.
 */
export function hesapSonuclariKirmiziMi<T>(sonuclar: HesapSonucu<T>[], isAtlandiMi: (s: T) => boolean): boolean {
  return sonuclar.some(
    (s) =>
      s.durum === "HATA" ||
      (s.durum === "KOSTU" && isAtlandiMi(s.sonuc)) ||
      (s.durum === "ATLANDI" && s.sebep !== "ANAHTAR_YOK" && s.sebep !== "DENEME_ORTAMI"),
  );
}
