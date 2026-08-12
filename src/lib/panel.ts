import { ayKaydir, pencerede, type Pencere } from "@/lib/donem";

import type { KarDurumu } from "@/lib/kar";
import type { Currency } from "@/generated/prisma/enums";

/**
 * ============================================================================
 *  ANA SAYFA PANELİ — SAF HESAP
 * ----------------------------------------------------------------------------
 *  Veritabanına GİTMEZ, "şu an"ı kendi okumaz. Girdisi verilirse her zaman
 *  aynı çıktıyı üretir; bu yüzden gerçek veri beklemeden sınanabilir.
 *
 *  RAPOR EKRANIYLA AYNI İLKELER:
 *   - Kâr rakamları SNAPSHOT'tan okunur, burada hiçbir şey yeniden hesaplanmaz.
 *   - Hesaplanamayan kâr SIFIR SAYILMAZ; ayrıca sayılır ve ekranda yazılır.
 *   - PARA BİRİMLERİ ÇEVRİLMEZ. Her para birimi ayrı blok; TRY ile EUR
 *     tek toplamda buluşmaz.
 *
 *  KÂR ÇİZGİSİ NET-2'DİR (kullanıcı kararı 12.08.2026): stopaj da ödenecek
 *  KDV de düşülmüş, yani cebe giren rakam.
 * ============================================================================
 */

/** Panelin bir satıştan ihtiyaç duyduğu her şey. */
export type PanelSatisi = {
  /** Kanalın kendi kodu — hesap değil KANAL seviyesinde gruplanır. */
  kanalKodu: string;
  kanalAdi: string;
  /** İş tarihi (UTC gece yarısı). */
  tarih: Date;
  paraBirimi: Currency;
  /** KDV dahil satış tutarı toplamı. */
  gelir: number;
  net2: number | null;
  durum: KarDurumu | null;
};

export type KanalBlogu = {
  kanalKodu: string;
  kanalAdi: string;
  adet: number;
  gelir: number;
  /** Yalnızca kârı HESAPLANABİLMİŞ satışların NET-2 toplamı. */
  net2: number;
  hesaplanamayanAdet: number;
};

export type ParaBirimiPaneli = {
  paraBirimi: Currency;
  /** Cirosu yüksek kanal başta. */
  kanallar: KanalBlogu[];
  toplamAdet: number;
  toplamGelir: number;
  toplamNet2: number;
  hesaplanamayanAdet: number;
};

/** Kâr toplamına girer mi? Durum CALCULATED değilse NET'e güvenilmez. */
function hesaplandi(durum: KarDurumu | null, net: number | null): net is number {
  return durum === "CALCULATED" && net !== null;
}

/**
 * Pencere içindeki satışları önce PARA BİRİMİNE, sonra KANALA böler.
 *
 * Neden kanal hesabına değil KANALA: kullanıcı aynı pazaryerinde birden
 * fazla hesap açıyor (hesap başına alım limiti yüzünden). "Trendyol bu ay
 * ne yaptı" sorusunun cevabı hesaplara bölünmüş hâlde okunmaz.
 */
export function panelHesapla(
  pencere: Pencere,
  satislar: PanelSatisi[],
): ParaBirimiPaneli[] {
  const bloklar = new Map<Currency, Map<string, KanalBlogu>>();

  for (const satis of satislar) {
    if (!pencerede(pencere, satis.tarih)) continue;

    let kanallar = bloklar.get(satis.paraBirimi);
    if (!kanallar) {
      kanallar = new Map();
      bloklar.set(satis.paraBirimi, kanallar);
    }

    let kanal = kanallar.get(satis.kanalKodu);
    if (!kanal) {
      kanal = {
        kanalKodu: satis.kanalKodu,
        kanalAdi: satis.kanalAdi,
        adet: 0,
        gelir: 0,
        net2: 0,
        hesaplanamayanAdet: 0,
      };
      kanallar.set(satis.kanalKodu, kanal);
    }

    kanal.adet++;
    kanal.gelir += satis.gelir;
    if (hesaplandi(satis.durum, satis.net2)) kanal.net2 += satis.net2;
    else kanal.hesaplanamayanAdet++;
  }

  return [...bloklar.entries()]
    .map(([paraBirimi, kanallar]) => {
      const liste = [...kanallar.values()].sort((a, b) => b.gelir - a.gelir);
      return {
        paraBirimi,
        kanallar: liste,
        toplamAdet: liste.reduce((t, k) => t + k.adet, 0),
        toplamGelir: liste.reduce((t, k) => t + k.gelir, 0),
        toplamNet2: liste.reduce((t, k) => t + k.net2, 0),
        hesaplanamayanAdet: liste.reduce((t, k) => t + k.hesaplanamayanAdet, 0),
      };
    })
    .sort((a, b) => b.toplamAdet - a.toplamAdet);
}

// ---------------------------------------------------------------------------
//  AYLIK SERİ — GRAFİĞİN VERİSİ
// ---------------------------------------------------------------------------

export type AyNoktasi = {
  yil: number;
  /** 1-12 (JavaScript'in 0-11'i DEĞİL). */
  ay: number;
  adet: number;
  gelir: number;
  net2: number;
  hesaplanamayanAdet: number;
};

/**
 * Son N ayın serisi — KAYIT OLMAYAN AY DA DİZİDE DURUR (sıfır değerle).
 *
 * Boş ayı atlamak grafikte iki ayı yan yana getirir ve zaman ekseni yalan
 * söyler: Mayıs'ta hiç satış yoksa çizgi Nisan'dan Haziran'a düz gider,
 * "duraksama yaşanmadı" gibi görünür.
 *
 * @param sonAy    Serinin BİTTİĞİ ay (dahil) — genelde iş takvimindeki bugün.
 * @param ayAdedi  Kaç ay geriye gidileceği (sonAy dahil).
 * @param kanalKodu Süzgeç; null ise bütün kanallar.
 */
export function aylikSeri(
  satislar: PanelSatisi[],
  sonAy: { yil: number; ay: number },
  ayAdedi: number,
  kanalKodu: string | null,
  paraBirimi: Currency,
): AyNoktasi[] {
  const noktalar: AyNoktasi[] = [];
  const dizin = new Map<string, AyNoktasi>();

  for (let i = ayAdedi - 1; i >= 0; i--) {
    const { yil, ay } = ayKaydir(sonAy.yil, sonAy.ay, -i);
    const nokta: AyNoktasi = {
      yil,
      ay,
      adet: 0,
      gelir: 0,
      net2: 0,
      hesaplanamayanAdet: 0,
    };
    noktalar.push(nokta);
    dizin.set(`${yil}-${ay}`, nokta);
  }

  for (const satis of satislar) {
    if (satis.paraBirimi !== paraBirimi) continue;
    if (kanalKodu !== null && satis.kanalKodu !== kanalKodu) continue;

    // İş tarihleri UTC gece yarısı saklanır; ay bilgisi UTC'den okunur.
    const anahtar = `${satis.tarih.getUTCFullYear()}-${satis.tarih.getUTCMonth() + 1}`;
    const nokta = dizin.get(anahtar);
    if (!nokta) continue;

    nokta.adet++;
    nokta.gelir += satis.gelir;
    if (hesaplandi(satis.durum, satis.net2)) nokta.net2 += satis.net2;
    else nokta.hesaplanamayanAdet++;
  }

  return noktalar;
}
