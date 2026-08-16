import type { FaizGirdisi } from "./hesap";

/**
 * ============================================================================
 *  KART ÖDEMESİ — SABİTLER VE TİPLER
 * ----------------------------------------------------------------------------
 *  Sunucu eylemleri dosyası `"use server"` olduğu için YALNIZ async fonksiyon
 *  dışa verebiliyor; sabit ve tipler burada durur. Aksi hâlde derleme
 *  "Only async functions are allowed to be exported" diye patlıyor.
 * ============================================================================
 */

/**
 * Faiz giderinin yazılacağı gider kategorisinin ADI.
 *
 * SEED'E EKLENMEZ, OTOMATİK OLUŞTURULMAZ (mimar kararı 15.08.2026). Yoksa
 * form eyleme dönük uyarı gösterir ve ayarlara link verir; kullanıcı bir kez
 * tanımlar. Sessizce kategori yaratmak, kullanıcının görmediği veri üretmek
 * olurdu.
 */
export const FAIZ_KATEGORI_ADI = "Kart gecikme faizi";

export type OdemeGirdisi = {
  cardId: string;
  /** Ekstre dönemi — ayın 1'i (ISO tarih metni). */
  donem: string;
  ekstreBorcu: number;
  odenenAnaBorc: number;
  odemeTarihi: string;
  faiz: FaizGirdisi;
};

export type OdemeSonucu = { tamam: true } | { tamam: false; hata: string };
