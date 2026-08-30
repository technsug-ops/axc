/**
 * ============================================================================
 *  DÖNEM KORUMASI — SAF KURAL (K108, 31.08.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ NİYE: kapanmış bir muhasebe dönemine geriye dönük yazım, BEYAN EDİLMİŞ
 *  bir vergiyi tutmaz hâle getirir. Bu bir yazılım kolaylığı değil, MALİ
 *  RİSKTİR — ve muhasebede tutarlılık ilkesi (TMS 2, VUK) zaten bunu şart
 *  koşar.
 *
 *  ── ⭐ YASAK DEĞİL, DURAKSAMA — VE BU ÖLÇÜMLE KARARLAŞTI ────────────────
 *  Halil: _"Bu ciddi bir uyarı olsun, kesin aşılmaz bir kural değil."_
 *  Ölçüm bunu doğruladı (31.08.2026, canlı, salt okuma):
 *
 *      ham rakam            10.061/10.774 hareket önceki aya  (%93,4)
 *      ⚠ ama çerçevesiz kullanılamaz — bütün geçmiş 26–28 ağustosta
 *        BİR KEREDE içe aktarıldı (yığın günleri: 10.232 hareket, %95,0)
 *
 *      GÜNLÜK OPERASYON      542 hareket
 *        önceki aya yazılan  212   (%39,1)
 *          PURCHASE_IN       204   ← %96,2
 *          SALE_OUT            8
 *
 *  Yani tam yasak günlük işin **%39'unu kilitlerdi** ve kilitlenenlerin
 *  neredeyse tamamı **gerçekten olmuş, geç girilen mal kabulü** olurdu.
 *  _(29.08 sayım korumasında aynı sonuç çıkmıştı: geriye dönük 15 hareketin
 *  15'i de `PURCHASE_IN`.)_
 *
 *  ⛔ KARAR FİRMANIN, SORUMLULUK FİRMANIN, KAYIT SİSTEMİN.
 *
 *  ── ⚠ İKİNCİ BİR DURAKSAMA MANTIĞI YAZILMIYOR ──────────────────────────
 *  Israr kapısı `lib/sayim-korumasi.ts`ten AYNEN geliyor: `israrGecerliMi`
 *  orada yaşıyor ve buradan çağrılıyor. İki yerde iki ölçüt olsaydı biri
 *  gün gelip ötekinden ayrışır ve hangisinin geçerli olduğu belirsizleşirdi.
 *  Burada YALNIZ "hangi dönem kapalı" sorusu cevaplanıyor.
 *
 *  ── ⚠ AÇIK DÖNEM YOKSA HER ŞEY SERBEST ─────────────────────────────────
 *  İlk kurulumda hiçbir dönem kapatılmamıştır ve **satırı olmayan dönem
 *  AÇIKTIR**. Sistem "dönem tanımlı değil" diye kilitlenmez; kilitlenseydi
 *  yeni kurulan her firma ilk günden çalışamazdı.
 * ============================================================================
 */

import type { SayimIsrarSebebi } from "@/lib/sayim-korumasi";

/** Kapalı dönemlerin kimliği — `yil-ay`, iş saat dilimine göre. */
export type DonemAnahtari = string;

/**
 * ⚠ ANAHTAR TEK GÖVDEDEN ÜRETİLİR. İki yerde iki biçim (`2026-8` ve
 * `2026-08`) olsaydı küme karşılaştırması sessizce boş dönerdi ve kapı
 * hiç yanmazdı — en pahalı yalancı yeşil.
 */
export function donemAnahtari(yil: number, ay: number): DonemAnahtari {
  return `${yil}-${String(ay).padStart(2, "0")}`;
}

export type DonemKorumaKarari =
  /** Dönem açık (ya da hiç kapatılmamış) — serbest. */
  | { sonuc: "SERBEST" }
  /** Kapalı döneme yazılıyor — kullanıcıya sorulmadan yazılamaz. */
  | {
      sonuc: "DURAKSA";
      donem: DonemAnahtari;
      /** Kullanıcıya gösterilecek sebep anahtarı (metin sözlükten gelir). */
      sebep: "kapaliDoneme";
    };

export type DonemKorumaGirdisi = {
  /** Yazılacak kaydın İŞ TARİHİ (satış günü, mal kabul günü…). */
  isTarihi: { yil: number; ay: number };
  /** KAPALI dönemlerin anahtar kümesi. Boş küme = hiçbir dönem kapalı değil. */
  kapaliDonemler: ReadonlySet<DonemAnahtari>;
};

/**
 * ⭐ SAF: veritabanına gitmez, saat okumaz, `new Date()` çağırmaz. Değerle
 * sınanır — bekçi bu gövdeyi ÇAĞIRARAK ölçüyor, kaynak taramadan.
 *
 * ⚠ İŞ TARİHİ ÇAĞIRANDAN GELİR, BURADA ÜRETİLMEZ. Anayasa: iş saat dilimi
 * `Europe/Istanbul` sabittir ve çalışma ortamının saat dilimi ASLA
 * kullanılmaz; gövdenin içinde `new Date()` olsaydı sunucunun saat dilimi
 * kararı sessizce kaydırırdı.
 */
export function donemKorumasi(g: DonemKorumaGirdisi): DonemKorumaKarari {
  /**
   * ⚠ BOŞ KÜME = HER ŞEY SERBEST. İlk kurulumda hiçbir dönem kapatılmamış
   * olur; burada kilitlemek yeni firmayı ilk günden çalışamaz yapardı.
   */
  if (g.kapaliDonemler.size === 0) return { sonuc: "SERBEST" };

  const anahtar = donemAnahtari(g.isTarihi.yil, g.isTarihi.ay);
  if (!g.kapaliDonemler.has(anahtar)) return { sonuc: "SERBEST" };

  return { sonuc: "DURAKSA", donem: anahtar, sebep: "kapaliDoneme" };
}

/**
 * ============================================================================
 *  ISRAR — SAYIM KORUMASININ GÖVDESİ YENİDEN KULLANILIYOR
 * ----------------------------------------------------------------------------
 *  ⚠ BURADA YENİ BİR `israrGecerliMi` YAZILMAZ. Şartlar aynı: onay HER
 *  SEFERİNDE istenir · sebep KAPALI KÜMEDEN · `DIGER` seçilirse açıklama
 *  zorunlu. Aynı ekran, aynı iz yapısı.
 *
 *  ⚠ SEBEP LİSTESİ AYRI — VE BU BİLİNÇLİ. Sayımın sebepleri fiziksel
 *  ("geç girilen alım", "sayım hatalıydı"); dönemin sebepleri MALİ. Aynı
 *  listeyi paylaşsalardı kullanıcı, kapanmış bir döneme yazarken "sayım
 *  hatalıydı" gibi ilgisiz bir sebep seçebilirdi ve üç ay sonra o kayıt
 *  hiçbir şey anlatmazdı.
 * ============================================================================
 */
export const DONEM_ISRAR_SEBEPLERI = [
  /** Gerçekten olmuş bir kayıt, deftere geç giriliyor. */
  "GEC_GIRILEN_KAYIT",
  /** Muhasebeci onayladı — beyan düzeltmesi yapılacak. */
  "MUHASEBECI_ONAYLADI",
  /** Dönem sehven kapatılmıştı. */
  "DONEM_YANLIS_KAPATILDI",
  /** ⚠ AÇIKLAMA ZORUNLU — sebepsiz istisna, istisna değil kusurdur. */
  "DIGER",
] as const;
export type DonemIsrarSebebi = (typeof DONEM_ISRAR_SEBEPLERI)[number];

/**
 * ⚠ TİP UYUMU BİLEREK KURULDU: `israrGecerliMi` sayımın sebep tipini
 * bekliyor ama gövde sebebin İÇERİĞİNE bakmıyor — yalnız `null` mı ve
 * `DIGER` mi diye soruyor. İkinci bir doğrulama gövdesi yazmamak için
 * çağrı burada uyarlanıyor; kural tek yerde kalıyor.
 */
export type DonemIsrari = {
  onaylandi: boolean;
  sebep: DonemIsrarSebebi | null;
  aciklama: string;
};

/** Sayım gövdesinin beklediği şekle çevirir — kural KOPYALANMAZ. */
export function donemIsrariniCevir(i: DonemIsrari): {
  onaylandi: boolean;
  sebep: SayimIsrarSebebi | null;
  aciklama: string;
} {
  return {
    onaylandi: i.onaylandi,
    /**
     * ⚠ `DIGER` AYNI ADI TAŞIYOR ve taşımak ZORUNDA: `israrGecerliMi`
     * açıklama zorunluluğunu tam o değere bakarak uyguluyor. Öteki sebepler
     * gövdeyi ilgilendirmiyor, o yüzden tek bir yer tutucuya çevriliyor.
     */
    sebep:
      i.sebep === null
        ? null
        : i.sebep === "DIGER"
          ? "DIGER"
          : "GEC_GIRILEN_ALIM",
    aciklama: i.aciklama,
  };
}
