"use server";

import { revalidatePath } from "next/cache";

import type { KodHatasi } from "@/lib/marka-kodu";
import { markaDurumu } from "@/lib/marka-kodu-veri";
import { markaEkleVeBagla, markaKoduDegistir } from "@/lib/marka-kodu-yaz";
import { izinVarMi } from "@/lib/yetki";

/**
 * ============================================================================
 *  MARKA KOD TABLOSU EYLEMLERİ (K285)
 * ----------------------------------------------------------------------------
 *  Üç eylem, tek çekirdek (`lib/marka-kodu-yaz.ts`): tek marka ekle/bağla ·
 *  önerisi olan HEPSİNİ ekle · kod değiştir. İzin `ayar.yaz`, eylemin KENDİ
 *  gövdesinde sorulur. Hata KOD döner, metne ekran çevirir; beklenmeyen hata
 *  TAM günlüğe.
 *  ⚠ "use server": YALNIZ async fonksiyon dışa aktarılır.
 * ============================================================================
 */

export type EylemSonucu =
  | { tamam: true; kod?: string; baglanan?: number }
  | { tamam: false; hata: "YETKISIZ" | "KODSUZ" | "URUN_YOK" | "YOK" | "DEGISMIS" | "HATA" | KodHatasi };

function yenile() {
  revalidatePath("/ayarlar/markalar");
  revalidatePath("/urunler");
}

export async function markaEkle(anahtar: string, kod: string | null): Promise<EylemSonucu> {
  try {
    if (!(await izinVarMi("ayar.yaz"))) return { tamam: false, hata: "YETKISIZ" };
    const s = await markaEkleVeBagla(anahtar, kod ?? undefined);
    if (s.durum === "KOD_HATASI") return { tamam: false, hata: s.hata };
    if (s.durum !== "EKLENDI" && s.durum !== "BAGLANDI") return { tamam: false, hata: s.durum };
    yenile();
    return { tamam: true, kod: s.kod, baglanan: s.baglanan };
  } catch (e) {
    console.error("[markaEkle] beklenmeyen hata:", anahtar, e);
    return { tamam: false, hata: "HATA" };
  }
}

export type TopluSonuc =
  | { tamam: true; eklenen: number; baglanan: number; atlanan: number; kodsuz: number }
  | { tamam: false; hata: "YETKISIZ" | "HATA" };

/**
 * Önerisi olan bütün bağsız markaları ekler, tablodakilere bağ kurar.
 * Kodu olmayan (kural bulamadı) atlanır ve SAYILIR — elle girilir.
 */
export async function hepsiniEkle(): Promise<TopluSonuc> {
  try {
    if (!(await izinVarMi("ayar.yaz"))) return { tamam: false, hata: "YETKISIZ" };
    const { bagsiz } = await markaDurumu();
    let eklenen = 0;
    let baglanan = 0;
    let atlanan = 0;
    let kodsuz = 0;
    for (const m of bagsiz) {
      if (m.tabloId === null && m.oneri === null) {
        kodsuz++;
        continue;
      }
      /* Öneri anlık listeden; çekirdek yine KENDİ denetler (arada kod dolmuşsa atlar). */
      const s = await markaEkleVeBagla(m.anahtar, m.oneri ?? undefined);
      if (s.durum === "EKLENDI") eklenen++;
      if (s.durum === "EKLENDI" || s.durum === "BAGLANDI") baglanan += s.baglanan;
      else atlanan++;
    }
    yenile();
    return { tamam: true, eklenen, baglanan, atlanan, kodsuz };
  } catch (e) {
    console.error("[hepsiniEkle] beklenmeyen hata:", e);
    return { tamam: false, hata: "HATA" };
  }
}

export async function markaKoduKaydet(id: string, kod: string): Promise<EylemSonucu> {
  try {
    if (!(await izinVarMi("ayar.yaz"))) return { tamam: false, hata: "YETKISIZ" };
    const s = await markaKoduDegistir(id, kod);
    if (s.durum === "YOK" || s.durum === "DEGISMIS") return { tamam: false, hata: s.durum };
    if (s.durum === "KOD_HATASI") return { tamam: false, hata: s.hata };
    yenile();
    return { tamam: true, kod: s.durum === "DEGISTI" ? s.yeni : undefined };
  } catch (e) {
    console.error("[markaKoduKaydet] beklenmeyen hata:", id, e);
    return { tamam: false, hata: "HATA" };
  }
}
