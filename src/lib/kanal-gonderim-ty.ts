/**
 * ============================================================================
 *  TRENDYOL TOPLU İŞLEM SONUCU — SAF OKUYUCU (01.10.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ VAKA: kullanıcı «TY'ye gönder çalışmıyor» dedi. Gönderim ÇALIŞIYORDU
 *  (01.10 14:48, TY'nin kendi kaydı: `items[0].status: "SUCCESS"`,
 *  `failedItemCount: 0`) — ama eylem durumu ÜST SEVİYEDE (`govde.status`)
 *  arıyordu; TY o alanı HİÇ göndermiyor. Sonuç: her gönderim «ISLEMDE»
 *  yazdı (iz kayıtlarındaki 7 gönderimin 7'si) ve ekran başarıyı hiç
 *  gösteremedi. Durum KALEM satırında (`items[].status`) okunur.
 *
 *  ⚠ BOŞ `items` = henüz işlenmedi (gönderimden hemen sonra). Ölçüldü: eski
 *  toplu işlemlerin sonucu da bir süre sonra boş dönüyor — bu yüzden sonuç
 *  gönderim ANINDA okunur ve ize yazılır; sonradan sorgulanamaz.
 * ============================================================================
 */

export type TyBatchDurumu = "BASARILI" | "BASARISIZ" | "ISLEMDE" | "SORGULANAMADI";

export function tyBatchCoz(govde: unknown): { durum: TyBatchDurumu; sebepler: string[] } {
  const g = govde as { items?: unknown } | null;
  if (!g || !Array.isArray(g.items)) return { durum: "SORGULANAMADI", sebepler: [] };
  if (g.items.length === 0) return { durum: "ISLEMDE", sebepler: [] };
  const kalemler = g.items as { status?: unknown; failureReasons?: unknown }[];
  const sebepler = kalemler.flatMap((k) => (Array.isArray(k.failureReasons) ? k.failureReasons.map(String) : []));
  if (kalemler.some((k) => k.status === "FAILED")) return { durum: "BASARISIZ", sebepler };
  if (kalemler.every((k) => k.status === "SUCCESS")) return { durum: "BASARILI", sebepler };
  return { durum: "ISLEMDE", sebepler };
}
