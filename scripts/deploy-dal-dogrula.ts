import { kaynakOku } from "./kaynak-oku";
import { dalDeployKapaliMi } from "./deploy-bekci";

/**
 * ============================================================================
 *  DEPLOY EDİLMEYEN DAL MUAFİYETİ BEKÇİSİ (09.10.2026)
 * ----------------------------------------------------------------------------
 *      npm run deploy-dal:dogrula
 *
 *  `deploy:bekci` B katmanını («migration canlıda koşmamış») YALNIZ Vercel'de
 *  deploy edilmeyen dalda bilgiye çevirir. Bu muafiyet bir güvenlik kapısını
 *  gevşetiyor — bu yüzden DAR olduğu değerle ölçülür: tam dal adı, `false`,
 *  bilinmeyen dal = engel, desen = engel; A/H her zaman engel.
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
    if (gorulen !== undefined) console.log("        ", gorulen);
  }
}
const yorumsuz = (m: string) => m.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1");

console.log("=".repeat(70));
console.log("DEPLOY EDİLMEYEN DAL MUAFİYETİ (09.10.2026)");
console.log("=".repeat(70));

console.log("\n1) kural — değerle");
const kapali = { git: { deploymentEnabled: { "k303-cok-firma": false } } };
kontrol("beyanlı dal (tam ad, false) → muaf", dalDeployKapaliMi(kapali, "k303-cok-firma") === true);
kontrol("main beyanlı değil → ENGEL", dalDeployKapaliMi(kapali, "main") === false);
kontrol("dal bilinmiyorsa (ayrık HEAD) → ENGEL", dalDeployKapaliMi(kapali, null) === false);
kontrol("vercel.json yok/okunamadı → ENGEL", dalDeployKapaliMi(null, "k303-cok-firma") === false);
kontrol("git ayarı yok → ENGEL", dalDeployKapaliMi({ regions: ["fra1"] }, "k303-cok-firma") === false);
kontrol("dal true beyanlı → ENGEL", dalDeployKapaliMi({ git: { deploymentEnabled: { "k303-cok-firma": true } } }, "k303-cok-firma") === false);
kontrol("desen (glob) KABUL EDİLMEZ → ENGEL", dalDeployKapaliMi({ git: { deploymentEnabled: { "k303-*": false } } }, "k303-cok-firma") === false);
kontrol("öneki tutan başka dal → ENGEL", dalDeployKapaliMi(kapali, "k303-cok") === false);
kontrol("genel deploymentEnabled:false (hiç deploy yok) → muaf", dalDeployKapaliMi({ git: { deploymentEnabled: false } }, "main") === true);
kontrol("genel deploymentEnabled:true → ENGEL", dalDeployKapaliMi({ git: { deploymentEnabled: true } }, "main") === false);

console.log("\n2) bağ — yalnız B bilgiye döner, A ve H engel");
{
  const b = yorumsuz(kaynakOku("scripts/deploy-bekci.ts"));
  kontrol("muafiyet B'yi yalnız bulgu VARKEN ve dal kapalıysa düşürür",
    /const bBilgi = b\.length > 0 && dalDeployKapaliMi\(vercelYapilandirmasi\(\), dal\);/.test(b));
  kontrol("  ...engel listesinde A ve H HER ZAMAN var",
    /const bulgular = \[\.\.\.a, \.\.\.h, \.\.\.\(bBilgi \? \[\] : b\)\];/.test(b));
  kontrol("  ...muaf olunca ekranda NEDEN yazar", /if \(bBilgi\) \{\s*console\.log\(`  ⓘ  bu dal/.test(b));
  kontrol("derlenen dal Vercel'in kendi değişkeninden, yoksa git'ten; ayrık HEAD → null",
    /process\.env\.VERCEL_GIT_COMMIT_REF/.test(b) && /return dal === "" \|\| dal === "HEAD" \? null : dal;/.test(b));
}

console.log("\n" + "=".repeat(70));
if (kalan === 0) console.log(`TÜM KONTROLLER GEÇTİ (${gecen})`);
else {
  console.log(`${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrolden)`);
  process.exit(1);
}
