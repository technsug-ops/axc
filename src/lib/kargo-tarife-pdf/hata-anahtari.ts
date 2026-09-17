import type { KargoTarifeYuklemeSonucu } from "./yaz";

/**
 * ============================================================================
 *  KARGO TARİFESİ ENGELİ → SÖZLÜK ANAHTARI (TEK KAPI, K202)
 * ----------------------------------------------------------------------------
 *  ⚠ NİYE AYRI DOSYADA: eşleme `eylemler.ts`te dursaydı bekçi onu HİÇ
 *  göremezdi — `"use server"` dosyaları yalnız async fonksiyon dışa
 *  aktarabilir. _(Aynı gerekçe: `komisyon/tarife-engeli.ts`.)_
 *
 *  ⚠ EXHAUSTIVE `Record`: `kod` birliğine yeni bir değer eklenirse burası
 *  DERLENMEZ — elle sayılan bir liste yarınki kodu sessizce ham bırakırdı.
 * ============================================================================
 */

export type KargoTarifeEngelKodu = Extract<
  KargoTarifeYuklemeSonucu,
  { durum: "HATA" }
>["kod"];

export const KARGO_TARIFE_ENGEL_ANAHTARI: Record<KargoTarifeEngelKodu, string> = {
  PDF_OKUNAMADI: "hataPdfOkunamadi",
  SATIR_YOK: "hataSatirYok",
  TARIH_BULUNAMADI: "hataTarihBulunamadi",
  BASLIK_BULUNAMADI: "hataBaslikBulunamadi",
  GECERSIZ_DEGER: "hataGecersizDeger",
  SUTUN_YETERSIZ: "hataSutunYetersiz",
  MUKERRER_DESI: "hataMukerrerDesi",
  SIRA_BOZUK: "hataSiraBozuk",
  DESI_BOSLUGU: "hataDesiBoslugu",
  KANAL_YOK: "hataKanalYok",
  TASIYICI_ESLESEMEDI: "hataTasiyiciEslesemedi",
  TASIYICI_DB_YOK: "hataTasiyiciDbYok",
};
