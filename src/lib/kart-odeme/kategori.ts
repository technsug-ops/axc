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
 * Faiz gideri için TERCİH EDİLEN kategori adı — ZORUNLU DEĞİL, yalnız
 * formda ön-seçim ipucu.
 *
 * ⚠ 16.08.2026 DÜZELTMESİ. Önce bu ad ZORUNLUYDU: kategori yoksa faiz
 * yazılamıyor, form "ayarlardan ekle" diyordu. İki sebeple yanlıştı:
 *   1. Gider kategorisi eklemek için EKRAN YOK — kategoriler yalnız
 *      `prisma/seed-gider.ts`ten geliyor. Uyarı çıkmaza götürüyordu.
 *   2. Anayasa: "Kategoriler ve oranları AYARLANABİLİR VERİDİR (sabit kod
 *      değil)." Adı koda gömmek o kuralı deliyordu.
 *
 * Doğrusu: kullanıcı MEVCUT kategorilerden seçer. Bu ad varsa ön-seçili
 * gelir, yoksa kullanıcı kendi kategorisini seçer — çıkmaz yok.
 */
export const FAIZ_KATEGORI_ONERISI = "Kart gecikme faizi";

export type OdemeGirdisi = {
  cardId: string;
  /** Ekstre dönemi — ayın 1'i (ISO tarih metni). */
  donem: string;
  ekstreBorcu: number;
  odenenAnaBorc: number;
  odemeTarihi: string;
  faiz: FaizGirdisi;
  /** Faiz giderinin yazılacağı kategori. Faiz 0 ise null olabilir. */
  faizKategoriId: string | null;
};

export type OdemeSonucu = { tamam: true } | { tamam: false; hata: string };
