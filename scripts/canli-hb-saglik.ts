/** BETIK SINIFI: SUREKLI. ⛔ HICBIR SEY YAZMAZ — GET disinda yontem YOK (A3 siniri). */
import { readFileSync } from "node:fs";

/**
 * ============================================================================
 *  HEPSİBURADA API SAĞLIK ÖLÇÜMÜ — TEST ORTAMI (SALT OKUMA)
 * ----------------------------------------------------------------------------
 *  Halil 04.09.2026: "Hepsiburada test API'si var" → anahtarlar
 *  `.env.canli`ye eklendi (HEPSIBURADA_MERCHANT_ID / _API_KEY / _ORTAM).
 *
 *  ⚠ YALNIZ OKUR. TY istemcisiyle AYNI kural: yazma ucu fonksiyon olarak
 *  bile tanımlanmaz; `api-dogrula` bekçisi bu dosyayı da tarar (dizinden,
 *  elle listeden değil).
 *
 *  ⚠ ANAHTAR SADECE BELLEĞE OKUNUR — basılmaz, loglanmaz.
 *
 *  ⚠ BEŞ SONUÇ AYRI SAYILIR (boş ≠ temiz · yol hatası ≠ yetki hatası):
 *    AÇIK        — 200, veri geldi
 *    AÇIK/BOŞ    — 200, kayıt yok (uç çalışıyor; test ortamı boş olabilir)
 *    YETKİSİZ    — 401/403 (anahtar/kapsam)
 *    YOL_YOK     — 404 (uç yolu yanlış — dokümana bakılır, anahtar suçlanmaz)
 *    ULAŞILAMADI — ağ/zaman aşımı; hüküm verilmez
 *
 *  ⚠ ORTAM `.env.canli`den: TEST → `-sit` alan adları. Canlı onay gelince
 *  HEPSIBURADA_ORTAM=CANLI yapılır, kod değişmez.
 *
 *  KOŞUM: npm run canli:hb-saglik
 * ============================================================================
 */

/** ⚠ ANAHTAR SADECE BELLEĞE — hiçbir çıktı yoluna girmez. */
function anahtarlar(): { merchantId: string; key: string; ortam: string } | null {
  let ham: string;
  try {
    ham = readFileSync(".env.canli", "utf8");
  } catch {
    return null;
  }
  const al = (ad: string) =>
    ham.match(new RegExp("^" + ad + "=(.*)$", "m"))?.[1]?.trim() ?? "";
  const merchantId = al("HEPSIBURADA_MERCHANT_ID");
  const key = al("HEPSIBURADA_API_KEY");
  const ortam = al("HEPSIBURADA_ORTAM") || "TEST";
  if (merchantId === "" || key === "") return null;
  return { merchantId, key, ortam };
}

type Sonuc = "ACIK" | "ACIK_BOS" | "YETKISIZ" | "YOL_YOK" | "ULASILAMADI" | "BASKA";

async function olc(
  ad: string,
  url: string,
  basliklar: Record<string, string>,
): Promise<Sonuc> {
  try {
    const y = await fetch(url, {
      method: "GET",
      headers: basliklar,
      signal: AbortSignal.timeout(20_000),
    });
    const govde = await y.text();
    if (y.status === 401 || y.status === 403) {
      console.log(`  YETKİSİZ     ${ad}  (HTTP ${y.status})`);
      return "YETKISIZ";
    }
    if (y.status === 404) {
      console.log(`  YOL_YOK      ${ad}  (HTTP 404 — uç yolu dokümanla karşılaştırılmalı)`);
      return "YOL_YOK";
    }
    if (!y.ok) {
      /** Gövde GÖSTERİMDE kırpılır (500), hükümde kullanılmaz. */
      console.log(`  BAŞKA        ${ad}  (HTTP ${y.status}) ${govde.slice(0, 500).replace(/\s+/g, " ")}`);
      return "BASKA";
    }
    let adet: number | null = null;
    try {
      const j = JSON.parse(govde);
      adet = Array.isArray(j)
        ? j.length
        : Array.isArray(j?.items)
          ? j.items.length
          : Array.isArray(j?.content)
            ? j.content.length
            : j?.totalCount ?? j?.totalElements ?? null;
    } catch {
      /* JSON değilse adet bilinmez — AÇIK sayılır, gövde tipi yazılır. */
    }
    if (adet === 0) {
      console.log(`  AÇIK/BOŞ     ${ad}  (200, kayıt yok — test ortamı boş olabilir)`);
      return "ACIK_BOS";
    }
    console.log(`  AÇIK         ${ad}  (200${adet === null ? "" : `, ~${adet} kayıt/sayaç`})`);
    return "ACIK";
  } catch {
    console.log(`  ULAŞILAMADI  ${ad}  (ağ/zaman aşımı — hüküm yok)`);
    return "ULASILAMADI";
  }
}

async function main() {
  const a = anahtarlar();
  console.log("=".repeat(78));
  console.log("  HEPSİBURADA API SAĞLIK — SALT OKUMA");
  console.log("=".repeat(78));
  if (!a) {
    console.log("\n⛔ HEPSIBURADA_MERCHANT_ID / _API_KEY .env.canli'de yok.\n");
    process.exitCode = 1;
    return;
  }
  const sit = a.ortam.toUpperCase() === "TEST" ? "-sit" : "";
  console.log(`  ortam: ${a.ortam}  ·  merchantId uzunluğu: ${a.merchantId.length} karakter`);
  const yetki =
    "Basic " + Buffer.from(a.merchantId + ":" + a.key).toString("base64");
  /** HB, User-Agent ister; kimlik olarak merchantId yeterli. */
  const basliklar = {
    Authorization: yetki,
    "User-Agent": a.merchantId,
    Accept: "application/json",
  };

  console.log("\n① SİPARİŞ/OMS UÇLARI");
  const oms = `https://oms-external${sit}.hepsiburada.com`;
  await olc("OMS siparişler", `${oms}/orders/merchantid/${a.merchantId}?offset=0&limit=1`, basliklar);
  await olc("OMS paketler", `${oms}/packages/merchantid/${a.merchantId}?offset=0&limit=1`, basliklar);

  console.log("\n② LİSTİNG UÇLARI");
  const listing = `https://listing-external${sit}.hepsiburada.com`;
  await olc("Listing listesi", `${listing}/listings/merchantid/${a.merchantId}?offset=0&limit=1`, basliklar);

  console.log("\n" + "=".repeat(78));
  console.log("  ⛔ Bu betik hiçbir şey YAZMAZ; sonuçlar yalnız erişimi ölçer.");
  console.log("=".repeat(78) + "\n");
}

main().catch((e) => {
  console.error("HATA:", e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
