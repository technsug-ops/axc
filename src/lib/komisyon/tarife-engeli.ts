import type { TarifeYuklemeSonucu } from "./tarife-yaz";

/**
 * ============================================================================
 *  TARİFE ENGELİ → SÖZLÜK ANAHTARI (TEK KAPI)
 * ----------------------------------------------------------------------------
 *  ⚠ NİYE AYRI DOSYADA: eşleme \`eylemler.ts\`te dursaydı bekçi onu HİÇ
 *  göremezdi — \`"use server"\` dosyaları yalnız async fonksiyon dışa
 *  aktarabilir, sabit oradan okunamaz. Kontrol edilemeyen bir eşleme,
 *  kontrol edilmemiş demektir.
 *
 *  ⚠ CANLI HATA 25.08.2026: ekran engeli OLDUĞU GİBİ basıyordu. Kullanıcı
 *  Hepsiburada "Avantajlı Teklifler" dosyasını yükleyince kırmızı kutuda
 *  yalnız \`SUTUN_EKSIK\` yazdı — doğru teşhis, okunamaz mesaj. Operasyoncu
 *  ne olduğunu da ne yapacağını da anlayamaz (İlke #5), üstelik metin
 *  sözlükten değil koddan geliyordu (i18n kuralı).
 *
 *  ⚠ EXHAUSTIVE \`Record\`: \`kod\` birliğine beşinci bir değer eklenirse burası
 *  DERLENMEZ. Elle sayılan bir liste yarınki kodu sessizce ham bırakırdı —
 *  "tip listesi değil, BAĞ".
 * ============================================================================
 */

export type TarifeEngelKodu = Extract<
  TarifeYuklemeSonucu,
  { durum: "HATA" }
>["kod"];

export const ENGEL_ANAHTARI: Record<TarifeEngelKodu, string> = {
  DOSYA_OKUNAMADI: "hataDosyaOkunamadi",
  SUTUN_EKSIK: "hataSutunEksik",
  PENCERE_YOK: "hataPencereYok",
  SATIR_YOK: "hataSatirYok",
};
