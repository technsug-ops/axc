import { UCLAR, apiGet, baslikKur, type Kimlik, type OkumaSonucu } from "./istemci";

/**
 * ============================================================================
 *  K169 — TRENDYOL YAZMA İSTEMCİSİ (KANALA İLK YAZAN DOSYA)
 * ----------------------------------------------------------------------------
 *  Halil kararı 05.09.2026: _"stok girince TY'ye push edebilir miyim,
 *  fiyat indirimini push edebilir miyim?"_ — 01.09'daki "stok senkronu
 *  kapsam dışı" şartı SAHİBİ tarafından çevrildi (eski gerekçe
 *  `schema.prisma`da kayıtlı duruyor, silinmedi).
 *
 *  ⛔ BU DOSYA DIŞINDA HİÇBİR YERDE KANALA FİİL YOK. `api:dogrula` bunu
 *  KANALA_YAZMASI_BEYANLI listesiyle tanır; beyan bir muafiyet değil
 *  TAAHHÜTTÜR — bekçisi `kanal-yazma:dogrula` (tek uç, tek fiil,
 *  önizlemesiz gönderim yok, izsiz gönderim yok).
 *
 *  UÇ — RESMÎ DOKÜMANDAN (developers.trendyol.com, 05.09.2026):
 *    POST /integration/inventory/sellers/{sellerId}/products/price-and-inventory
 *    gövde: items[{barcode zorunlu; quantity/salePrice/listPrice opsiyonel —
 *    yalnız birini göndermek serbest}] · yanıt: batchRequestId · sonuç
 *    batch-requests ucundan GET ile sorgulanır (o GET, okuma istemcisinde).
 *    ⚠ Aynı gövdeyi 15 dk içinde tekrar göndermek TY tarafında hatadır —
 *    ekrana kodla taşınır, "bozuk" sanılmasın.
 *
 *  ⚠ TEK KALEM: bu sürüm bilerek tek üründür (toplu gönderim ayrı karar).
 *  ⚠ ANAHTAR YALNIZ BELLEĞE; istek gövdesi İZE yazılır (ne gönderdiğimiz
 *  sorulabilir olmalı) ama anahtar/başlık asla.
 * ============================================================================
 */

const TABAN = "https://apigw.trendyol.com";

export type GonderilecekKalem = {
  barcode: string;
  quantity?: number;
  salePrice?: number;
  listPrice?: number;
};

export type YazmaSonucu =
  | { tur: "KABUL"; batchRequestId: string }
  | { tur: "YETKISIZ"; durum: number }
  | { tur: "ISTEK_HATALI"; durum: number; mesaj: string }
  | { tur: "ULASILAMADI"; sebep: string };

/**
 * TEK YAZMA NOKTASI — uç ve fiil SABİT (parametre değil): ikinci bir uca
 * yazmak bu dosyada İMKÂNSIZ olsun diye.
 */
export async function stokFiyatGonder(
  k: Kimlik,
  kalem: GonderilecekKalem,
  zamanAsimiMs = 20_000,
): Promise<YazmaSonucu> {
  try {
    const kontrol = new AbortController();
    const zaman = setTimeout(() => kontrol.abort(), zamanAsimiMs);
    const cevap = await fetch(
      `${TABAN}/integration/inventory/sellers/${k.saticiId}/products/price-and-inventory`,
      {
        method: "POST",
        headers: { ...baslikKur(k), "Content-Type": "application/json" },
        body: JSON.stringify({ items: [kalem] }),
        signal: kontrol.signal,
      },
    );
    clearTimeout(zaman);
    const govde = await cevap.text();
    if (cevap.status === 401 || cevap.status === 403) {
      return { tur: "YETKISIZ", durum: cevap.status };
    }
    if (!cevap.ok) {
      return {
        tur: "ISTEK_HATALI",
        durum: cevap.status,
        mesaj: govde.slice(0, 300).replace(/\s+/g, " "),
      };
    }
    const j = JSON.parse(govde) as { batchRequestId?: string };
    if (!j.batchRequestId) {
      return { tur: "ISTEK_HATALI", durum: cevap.status, mesaj: "batchRequestId dönmedi: " + govde.slice(0, 200) };
    }
    return { tur: "KABUL", batchRequestId: j.batchRequestId };
  } catch (e) {
    return {
      tur: "ULASILAMADI",
      sebep: e instanceof Error ? e.message.slice(0, 120) : String(e),
    };
  }
}

/** Batch sonucu — OKUMA; mevcut GET istemcisiyle. */
export async function gonderimSonucu(
  k: Kimlik,
  batchRequestId: string,
): Promise<OkumaSonucu> {
  return apiGet(UCLAR.topluIslem(k.saticiId, batchRequestId), baslikKur(k));
}
