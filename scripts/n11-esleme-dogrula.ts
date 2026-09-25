import { kaynakOku } from "./kaynak-oku";

/**
 * ============================================================================
 *  N11 EŞLEŞTİRME BETİĞİ — BEKÇİ (22.09.2026)
 * ----------------------------------------------------------------------------
 *  BETIK SINIFI: SUREKLI — BEKCI. Hiçbir şey yazmaz.
 *
 *  `scripts/canli-n11-esle.ts` bir YAZICIDIR: N11 API'sini okur ve `ChannelSku`
 *  yaratır. `api:dogrula` böyle bir betiğin YAZMASI_BEYANLI'da bir bekçiyle
 *  kayıtlı olmasını ister — bu o bekçi. Ölçtüğü şey betiğin ne yaptığı değil,
 *  NE YAPMADIĞI: kapısız yazmıyor, ikinci kaynak yazmıyor, geri alma yolu
 *  saklanan listeye dayanmıyor.
 *
 *  ⚠ Kaynak taranır (sunucu eylemi/betik; saf gövde değil) — desenler
 *  KULLANIM yerine bağlı, yorumsuz metinde aranır.
 * ============================================================================
 */

let gecen = 0;
let kalan = 0;
function kontrol(ad: string, sonuc: boolean, gorulen?: unknown) {
  if (sonuc) {
    gecen++;
    console.log(`  OK    ${ad}`);
  } else {
    kalan++;
    console.log(`  HATA  ${ad}`);
    if (gorulen !== undefined) console.log(`         ${JSON.stringify(gorulen)}`);
  }
}
const yorumsuz = (yol: string) =>
  kaynakOku(yol)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");

console.log("\nN11 EŞLEŞTİRME — BEKÇİ");
console.log("=".repeat(70));
const t = yorumsuz("scripts/canli-n11-esle.ts");

console.log("\n1) KAPI — K231 yazma kapısından geçiyor");
/** Kapı çağrısı ve REDDİ aynı desende: çağrı silinirse ya da sonucu okunmazsa kırmızı. */
kontrol(
  "her stockCode kodBaskaVaryantaAitMi'den geçiyor ve sahibi varsa AÇILMIYOR",
  /const baskasi = await kodBaskaVaryantaAitMi\(l\.stockCode, \{ variantId: adayBilgi\.id \}\);\s*if \(baskasi\) \{[\s\S]{0,200}?continue;/.test(t),
);
kontrol(
  "hedef TEK varyant: çok eşleşme de katalog-yok da AÇILMIYOR",
  /if \(adaylar\.size === 0\) \{ katalogdaYok\.push\(l\); continue; \}/.test(t) &&
    /if \(adaylar\.size > 1 \|\| !adayBilgi\) \{ cokEslesme\.push\(l\); continue; \}/.test(t),
);
kontrol(
  "hedef çözümü ORTAK gövdeden (kodlaVaryantCoz), kendi sorgusu yok",
  /await kodlaVaryantCoz\(kod\)/.test(t) && !/productVariant\.findFirst/.test(t),
);

console.log("\n2) KAPSAM — ne yazıyor, ne yazmıyor");
{
  const i = t.indexOf("prisma.channelSku.create(");
  const blok = i < 0 ? "" : t.slice(i, i + 220);
  kontrol("TABAN DOLU — yaratma bloğu bulundu", blok !== "");
  kontrol("yalnız üç alan: hesap · varyant · kanal kodu", /channelAccountId: hesap\.id, variantId: a\.variantId, channelSku: a\.stockCode/.test(blok));
  for (const yasak of ["commissionRate", "externalListingId", "listelemeDurumu", "kanalAdet"]) {
    kontrol(`  ...${yasak} YAZILMIYOR (kendi kaynağı var)`, !blok.includes(yasak));
  }
}
kontrol("hesap externalId İLE (adla değil)", /externalId: N11_SATICI_ID/.test(t) && !/name: \{ contains/.test(t));
kontrol("N11'e yalnız GET (apiGet dışında istek yok)", !/fetch\(|method:\s*"(POST|PUT|PATCH|DELETE)"/.test(t) && /apiGet\(/.test(t));

console.log("\n3) KURU KOŞUM — yazım kapısı ve iz");
kontrol("varsayılan kuru koşum; --uygula olmadan dönüyor", /if \(!uygula\) \{[\s\S]{0,300}?return;/.test(t));
kontrol("yazımdan ÖNCE yerel anlık görüntü", t.indexOf("writeFileSync(goruntu") >= 0 && t.indexOf("writeFileSync(goruntu") < t.indexOf("prisma.channelSku.create("));
kontrol("yazım iz bırakıyor (N11_ESLEME)", /action: "N11_ESLEME"/.test(t));

console.log("\n4) GERİ ALMA — saklanan listeye değil ÖLÇÜTE dayanıyor");
{
  const i = t.indexOf("if (geri) {");
  const blok = i < 0 ? "" : t.slice(i, i + 1400);
  kontrol("TABAN DOLU — geri alma bloğu bulundu", blok !== "");
  kontrol("ölçüt yeniden hesaplanabilir: API kodları ∩ hesap ∩ parti damgası", /channelSku: \{ in: apiKodlari \}/.test(blok) && /createdAt: \{ gte: new Date\(parti\) \}/.test(blok));
  kontrol("  ...ve ÖLÇÜLMÜŞ satır silinmez (BILINMIYOR + kanalOlcumAt null)", /listelemeDurumu: "BILINMIYOR"/.test(blok) && /kanalOlcumAt: null/.test(blok));
  kontrol("  ...parti damgası zorunlu, yoksa durur", /--parti=/.test(blok) && /process\.exitCode = 1/.test(blok));
  kontrol("  ...geri alma da iz bırakıyor", /action: "N11_ESLEME_GERI"/.test(blok));
}

console.log("\n" + "=".repeat(70));
if (kalan === 0) {
  console.log(`TÜM KONTROLLER GEÇTİ (${gecen})`);
} else {
  console.log(`${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrolden)`);
  process.exit(1);
}
