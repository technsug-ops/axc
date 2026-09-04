/** BETIK SINIFI: SUREKLI. ⛔ HICBIR SEY YAZMAZ — GET disinda yontem YOK (A3 siniri). */
import {
  UCLAR,
  apiGet,
  baslikKur,
  kayitDizisi,
  kimlikOku,
} from "./hb/istemci";

/**
 * ============================================================================
 *  HEPSİBURADA API SAĞLIK ÖLÇÜMÜ — SALT OKUMA
 * ----------------------------------------------------------------------------
 *  Halil 04.09.2026: "Hepsiburada test API'si var" → anahtarlar
 *  `.env.canli`ye eklendi (HEPSIBURADA_MERCHANT_ID / _API_KEY / _ORTAM /
 *  _DEVELOPER). Kimlik kurgusu ve uçlar ORTAK istemciden gelir
 *  (`scripts/hb/istemci.ts`) — tek gövde, iki okuyucu.
 *
 *  ⚠ İLK ÖLÇÜM ÜÇ UÇTA DA 401 VERDİ; sebep User-Agent'a merchantId
 *  konmasıydı. HB'nin e-postası DEVELOPER USERNAME şart koştu; düzeltince
 *  üçü de 200 döndü. Ayrıntı istemci başlığında.
 *
 *  ⚠ BEŞ SONUÇ AYRI SAYILIR (boş ≠ temiz · yol hatası ≠ yetki hatası):
 *    AÇIK · AÇIK/BOŞ · YETKİSİZ (401/403) · YOL_YOK (404) · ULAŞILAMADI
 *  Ve altıncısı: ZARF_TANINMADI — 200 döndü ama gövdede dizi bulunamadı;
 *  bu "boş" DEĞİLDİR, alan adlarıyla raporlanır.
 *
 *  KOŞUM: npm run canli:hb-saglik
 * ============================================================================
 */

async function olc(
  ad: string,
  adres: string,
  baslik: Record<string, string>,
): Promise<void> {
  const s = await apiGet(adres, baslik);
  if (s.tur === "YETKISIZ") {
    console.log(`  YETKİSİZ     ${ad}  (HTTP ${s.durum})`);
    return;
  }
  if (s.tur === "BULUNAMADI") {
    console.log(`  YOL_YOK      ${ad}  (HTTP 404 — uç yolu dokümanla karşılaştırılmalı)`);
    return;
  }
  if (s.tur === "ISTEK_HATALI") {
    console.log(`  İSTEK_HATALI ${ad}  (HTTP 400) ${s.mesaj}`);
    return;
  }
  if (s.tur === "ULASILAMADI") {
    console.log(`  ULAŞILAMADI  ${ad}  (${s.sebep} — hüküm yok)`);
    return;
  }
  const z = kayitDizisi(s.govde);
  if (z.tur === "ZARF_TANINMADI") {
    console.log(`  ZARF?        ${ad}  (200 ama dizi yok — alanlar: ${z.alanlar.join(", ") || "(boş gövde)"})`);
    return;
  }
  if (z.kayitlar.length === 0) {
    console.log(`  AÇIK/BOŞ     ${ad}  (200, kayıt yok — test ortamı boş olabilir)`);
    return;
  }
  console.log(`  AÇIK         ${ad}  (200, sayfada ${z.kayitlar.length} kayıt)`);
}

async function main() {
  const k = kimlikOku();
  console.log("=".repeat(78));
  console.log("  HEPSİBURADA API SAĞLIK — SALT OKUMA");
  console.log("=".repeat(78));
  if (!k) {
    console.log("\n⛔ HEPSIBURADA_MERCHANT_ID / _API_KEY / _DEVELOPER .env.canli'de eksik.\n");
    process.exitCode = 1;
    return;
  }
  console.log(`  ortam: ${k.ortam}  ·  merchantId uzunluğu: ${k.merchantId.length} karakter`);
  const baslik = baslikKur(k);

  console.log("\n① SİPARİŞ/OMS UÇLARI");
  await olc("OMS siparişler", UCLAR.siparisler(k, 0, 1), baslik);
  await olc("OMS paketler", UCLAR.paketler(k, 0, 1), baslik);

  console.log("\n② LİSTİNG UÇLARI");
  await olc("Listing listesi", UCLAR.listingler(k, 0, 1), baslik);

  console.log("\n" + "=".repeat(78));
  console.log("  ⛔ Bu betik hiçbir şey YAZMAZ; sonuçlar yalnız erişimi ölçer.");
  console.log("=".repeat(78) + "\n");
}

main().catch((e) => {
  console.error("HATA:", e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
