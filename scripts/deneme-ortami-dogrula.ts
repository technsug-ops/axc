import { readdirSync } from "node:fs";
import { kaynakOku } from "./kaynak-oku";
import { denemeOrtamiMi, denemedeKapaliMi } from "../src/lib/deneme-ortami";

/**
 * ============================================================================
 *  DENEME ORTAMI BEKÇİSİ — K303 (03.10.2026)
 * ----------------------------------------------------------------------------
 *      npm run deneme-ortami:dogrula
 *
 *  Deneme kurulumunda gerçek mağazaya HİÇBİR istek gitmemeli ve zamanlanmış
 *  işler koşmamalı. Güvenlik `.env.canli`yi kopyalamamak gibi bir dikkate
 *  bırakılmaz; bu bekçi mekanizmanın yerinde durduğunu ölçer.
 *
 *  ① saf gövde DEĞERLE (desen taranmaz)
 *  ② kimlik kapısı: istemci kümesi TARANIR (elle liste yok) — `scripts/*` altında
 *     `export function kimlikOku(` taşıyan her dosyada fonksiyonun İLK deyimi
 *     `if (denemeOrtamiMi()) return null;` olmalı. Taban ≥ 3.
 *  ③ proxy: kesme, açık-yol kontrolünden ÖNCE
 *  ④ şerit: iki <body> dalında da çiziliyor
 * ============================================================================
 */

console.log("\nDENEME ORTAMI BEKÇİSİ\n");
let gecen = 0;
let hata = 0;
function kontrol(ad: string, kosul: boolean) {
  if (kosul) { gecen++; console.log("  OK  " + ad); } else { hata++; console.log("  X   " + ad); }
}
function yorumsuz(m: string) {
  return m.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
}

/* ① SAF GÖVDE — ayrımın iki yakası */
kontrol("anahtar yok → KAPALI", denemeOrtamiMi({}) === false);
kontrol("\"1\" → AÇIK", denemeOrtamiMi({ DENEME_ORTAMI: "1" }) === true);
kontrol("\" 1 \" → AÇIK (boşluk kırpılır)", denemeOrtamiMi({ DENEME_ORTAMI: " 1 " }) === true);
kontrol("\"0\" → KAPALI", denemeOrtamiMi({ DENEME_ORTAMI: "0" }) === false);
kontrol("\"true\" → KAPALI (yalnız 1 açar)", denemeOrtamiMi({ DENEME_ORTAMI: "true" }) === false);
const ac = { DENEME_ORTAMI: "1" };
kontrol("denemede /api/cron/ty-cekim KAPALI", denemedeKapaliMi("/api/cron/ty-cekim", ac));
kontrol("denemede YENİ bir cron rotası da KAPALI (önek)", denemedeKapaliMi("/api/cron/yarin-eklenen", ac));
kontrol("denemede /api/yedek/otomatik KAPALI", denemedeKapaliMi("/api/yedek/otomatik", ac));
kontrol("denemede /api/olcum KAPALI", denemedeKapaliMi("/api/olcum", ac));
kontrol("denemede /satislar AÇIK (uygulama çalışır)", !denemedeKapaliMi("/satislar", ac));
kontrol("denemede /api/el-kitabi AÇIK", !denemedeKapaliMi("/api/el-kitabi", ac));
kontrol("canlıda (anahtar yok) /api/cron/ty-cekim KESİLMEZ", !denemedeKapaliMi("/api/cron/ty-cekim", {}));

/* ② KİMLİK KAPISI — istemci kümesi taranır */
const istemciler: string[] = [];
for (const dizin of readdirSync("scripts", { withFileTypes: true })) {
  if (!dizin.isDirectory()) continue;
  for (const ad of readdirSync("scripts/" + dizin.name)) {
    if (!/\.ts$/.test(ad)) continue;
    const yol = `scripts/${dizin.name}/${ad}`;
    if (/export function kimlikOku\(/.test(yorumsuz(kaynakOku(yol)))) istemciler.push(yol);
  }
}
kontrol(`kimlik okuyan istemci kümesi DOLU (≥3, bulunan ${istemciler.length})`, istemciler.length >= 3);
for (const yol of istemciler) {
  const k = yorumsuz(kaynakOku(yol));
  const bas = k.indexOf("export function kimlikOku(");
  const govde = k.slice(k.indexOf("{", bas) + 1).trimStart();
  kontrol(`${yol}: kimlikOku İLK deyimi deneme kapısı`, govde.startsWith("if (denemeOrtamiMi()) return null;"));
}
{
  const hb = yorumsuz(kaynakOku("scripts/hb/istemci.ts"));
  const b = hb.indexOf("export function kimlikEksikleri(");
  const g = b >= 0 ? hb.slice(hb.indexOf("{", b) + 1).trimStart() : "";
  kontrol("HB kimlikEksikleri deneme sebebini söylüyor", g.startsWith("if (denemeOrtamiMi()) return [\"DENEME_ORTAMI"));
}

/* ③ PROXY — kesme açık-yol kontrolünden ÖNCE (indexOf -1 tuzağına karşı varlık ayrı) */
{
  const p = yorumsuz(kaynakOku("src/proxy.ts"));
  const iKes = p.indexOf("if (denemedeKapaliMi(yol)) return new NextResponse(null, { status: 404 });");
  const iAcik = p.indexOf("if (acikMi(yol)) return NextResponse.next();");
  kontrol("proxy deneme kesmesi var", iKes >= 0);
  kontrol("proxy açık-yol kontrolü var", iAcik >= 0);
  kontrol("proxy kesme açık-yol kontrolünden ÖNCE", iKes >= 0 && iAcik >= 0 && iKes < iAcik);
}

/* ④ ŞERİT — iki <body> dalında da */
{
  const l = yorumsuz(kaynakOku("src/app/layout.tsx"));
  const govdeler = l.split("<body>").slice(1);
  kontrol(`layout'ta iki <body> dalı (bulunan ${govdeler.length})`, govdeler.length === 2);
  govdeler.forEach((g, i) => kontrol(`<body> dalı ${i + 1}: şerit İLK öğe`, g.trimStart().startsWith("{denemeSeridi}")));
  kontrol("şerit deneme anahtarına bağlı", /const denemeSeridi = denemeOrtamiMi\(\) \?/.test(l));
  // Aşama 4b (04.10.2026): firma adı OTURUMDAKİ firmadan — sabit ad iki firmada
  // Axcali kullanıcısına da «Damisell» yazdırırdı.
  kontrol(
    "şerit firması oturumdan okunuyor",
    /const seritFirmasi = denemeOrtamiMi\(\) \? await denemeSeridiFirmasi\(\) : null;/.test(l) &&
      /where: \{ id: baglam\.companyId \}/.test(l),
  );
  kontrol("şerit sabit firma adı okumuyor", !/DENEME_FIRMA_ADI/.test(l));
  kontrol(
    "şerit firmasızken firma adı uydurmuyor",
    /seritFirmasi \? ortak\("denemeSeridi", \{ firma: seritFirmasi \}\) : ortak\("denemeSeridiFirmasiz"\)/.test(l),
  );
}

console.log("\n" + (hata === 0 ? "TÜM KONTROLLER GEÇTİ" : "BAŞARISIZ") + ` (${gecen}/${gecen + hata})\n`);
process.exit(hata === 0 ? 0 : 1);
