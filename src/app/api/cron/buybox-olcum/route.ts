// Arka plan işi: küçük veritabanı havuzu (K332 — gerekçe lib/arka-plan-havuzu.ts).
import "@/lib/arka-plan-havuzu";
import { NextRequest, NextResponse } from "next/server";

import { buyboxOlcumleriniYaz } from "@/lib/buybox-istatistik-verisi";
import { alimHedefleriniOlc } from "@/lib/alim-hedefi-verisi";

/**
 * ============================================================================
 *  K363 Faz 3-b — SAATLİK BUYBOX ÖLÇÜMÜNÜN SUNUCU UCU (25.10.2026)
 * ----------------------------------------------------------------------------
 *  Tetikleyici: birincil cron-job.org (:00), yedek
 *  `.github/workflows/buybox-olcum.yml` (:35). Buybox
 *  ekranının AYNI sorgusu koşar; sayılar ve durumu değişen ürünler deftere
 *  yazılır (`lib/buybox-istatistik-verisi.ts`).
 *  ⚠ KAPI: `Authorization: Bearer <CRON_SECRET>`; tutmayan istek 404 alır.
 *  ⚠ İDEMPOTENT: aynı saat diliminde ölçüm varsa kanal ATLANIR (çift tetik zararsız).
 *  ⛔ PAZARYERİNE HİÇBİR ŞEY YAZILMAZ — yalnız okuma uçları.
 *  ⛔ DÜŞEN KANAL DURUM KODUNA YANSIR (500): yarısı koşmayan ölçüm «başarılı»
 *  görünmesin. «Atlandı» düşmek değildir (çift tetik, hesap yok).
 *  K363 Faz 3-d (30.10.2026): Buybox ölçümünden SONRA alım hedeflerinin
 *  fiyatı okunur (`alim-hedefi-verisi.ts`; stok şartı yok). Buybox ölçümü
 *  düşse de koşar; kendisi düşerse durum koduna yansır, Buybox sonucunu silmez.
 * ============================================================================
 */

export const dynamic = "force-dynamic";
/** Ekran sorgusu ölçüldü 25.10: TY ~4 sn, HB ~1 sn (sunucuda) + yazım. Pay bırakılır; süre cevapta döner. */
export const maxDuration = 120;

export async function GET(istek: NextRequest) {
  const sir = process.env.CRON_SECRET?.trim() ?? "";
  const gelen = istek.headers.get("authorization") ?? "";
  if (sir === "" || gelen !== `Bearer ${sir}`) {
    return new NextResponse(null, { status: 404 });
  }
  const basladi = Date.now();
  const kanallar = await buyboxOlcumleriniYaz(new Date());
  const hedefler = await alimHedefleriniOlc().catch((e: unknown) => ({
    durum: "COKTU" as const,
    mesaj: (e instanceof Error ? (e.stack ?? e.message) : String(e)).replace(/\r?\n/g, " "),
  }));
  const hedefDustu = hedefler.durum === "COKTU" || (hedefler.durum === "YAZILDI" && hedefler.kanallar.some((k) => k.dustu));
  const dusen = kanallar.filter((k) => k.durum === "COKTU" || (k.durum === "ATLANDI" && k.sebep === "HEPSI_SORGULANAMADI")).length + (hedefDustu ? 1 : 0);
  return NextResponse.json({ kanallar, hedefler, dusen, sureMs: Date.now() - basladi }, { status: dusen > 0 ? 500 : 200 });
}
