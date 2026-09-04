/** BETIK SINIFI: SUREKLI. ⛔ HICBIR SEY YAZMAZ — GET disinda yontem YOK (A3 siniri). */
import { UCLAR, apiGet, baslikKur, kimlikOku } from "./n11/istemci";

/**
 * ============================================================================
 *  N11 API SAĞLIK ÖLÇÜMÜ — SALT OKUMA
 * ----------------------------------------------------------------------------
 *  Beş sonuç ayrı (boş ≠ temiz · yol ≠ yetki): AÇIK · AÇIK/BOŞ · YETKİSİZ
 *  · YOL_YOK · ULAŞILAMADI. Zarf tanınmazsa alan adları basılır.
 *  KOŞUM: npm run canli:n11-saglik
 * ============================================================================
 */
async function main() {
  const k = kimlikOku();
  console.log("=".repeat(78));
  console.log("  N11 API SAĞLIK — SALT OKUMA");
  console.log("=".repeat(78));
  if (!k) {
    console.log("\n⛔ N11_APP_KEY / N11_APP_SECRET .env.canli'de eksik.\n");
    process.exitCode = 1;
    return;
  }
  const s = await apiGet(UCLAR.paketler(0, 1), baslikKur(k));
  if (s.tur === "YETKISIZ") console.log(`  YETKİSİZ     paketler (HTTP ${s.durum})`);
  else if (s.tur === "BULUNAMADI") console.log("  YOL_YOK      paketler (404 — uç dokümanla karşılaştırılmalı)");
  else if (s.tur === "ISTEK_HATALI") console.log(`  İSTEK_HATALI paketler (400) ${s.mesaj}`);
  else if (s.tur === "ULASILAMADI") console.log(`  ULAŞILAMADI  paketler (${s.sebep})`);
  else {
    const g = s.govde as Record<string, unknown>;
    const dizi = Array.isArray(g?.content) ? g.content : Array.isArray(g) ? g : null;
    if (dizi === null) {
      console.log("  ZARF?        200 ama dizi yok — alanlar: " + (g ? Object.keys(g).join(", ") : "(boş)"));
    } else if (dizi.length === 0) console.log("  AÇIK/BOŞ     paketler (200, kayıt yok)");
    else console.log(`  AÇIK         paketler (200, sayfada ${dizi.length} kayıt) · üst alanlar: ${Object.keys(g).join(", ")}`);
  }
  console.log("\n" + "=".repeat(78));
  console.log("  ⛔ Bu betik hiçbir şey YAZMAZ; sonuçlar yalnız erişimi ölçer.");
  console.log("=".repeat(78) + "\n");
}
main().catch((e) => {
  console.error("HATA:", e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
