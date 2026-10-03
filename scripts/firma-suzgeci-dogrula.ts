import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { kaynakOku } from "./kaynak-oku";
import { haritaUret, dosyaMetni, HARITA_DOSYASI } from "./firma-modelleri-uret";
import { argumanlariSuz, firmaModeliMi, veriEkle, whereEkle } from "../src/lib/firma-suzgeci";
import { donguDurumKodu, firmaFirmaKos, kimlikFirmasiSec } from "../src/lib/firma-dongusu";
import { acikFirmaBaglami, zorunluFirma } from "../src/lib/firma-baglami";

/**
 * ============================================================================
 *  FİRMA SÜZGECİ BEKÇİSİ — K303 Aşama 3a (03.10.2026)
 * ----------------------------------------------------------------------------
 *      npm run firma-suzgeci:dogrula
 *
 *  ① saf gövde DEĞERLE (desen taranmaz) — ayrımın iki yakası
 *  ② harita TAZE — şemadan yeniden üretilip dosyayla kıyaslanır; taban ≥ 49
 *  ③ istemci süzgece BAĞLI (kullanım bloğu): ortak model süzülmez, bağlam
 *     yoksa HATA, `prisma` süzgeçli vekil
 *  ④ bağlam `await`i run İÇİNDE (tembel PrismaPromise — ölçülmüş vaka)
 *  ⑤ DESEN YASAĞI: `sistemPrisma` kullanan her satırın BİTİŞİK yorumunda
 *     `SISTEM:` gerekçesi olmalı (dosya listesi yok; `src/` taranır)
 *  ⑥ (3b) anahtar firması seçimi + firma döngüsü DEĞERLE
 *  ⑦ (3b) her zamanlanmış iş ucu döngüden geçer; ucun çağırdığı betik kendi
 *     süzgeçsiz istemcisini KURAMAZ (küme uçların import'undan türetilir)
 * ============================================================================
 */

console.log("\nFİRMA SÜZGECİ BEKÇİSİ\n");
let gecen = 0;
let hata = 0;
function kontrol(ad: string, kosul: boolean) {
  if (kosul) { gecen++; console.log("  OK  " + ad); } else { hata++; console.log("  X   " + ad); }
}
function firlatirMi(f: () => unknown, kod: string): boolean {
  try { f(); return false; } catch (e) { return e instanceof Error && e.message.startsWith(kod); }
}
function yorumsuz(m: string) {
  return m.replace(/\/\*[\s\S]*?\*\//g, (x) => x.replace(/[^\n]/g, " ")).replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
}
const F = "firma-A";
const J = (x: unknown) => JSON.stringify(x);
/** İç içe değeri güvenli okur (yalnız ölçüm). */
function al(x: unknown, ...yol: (string | number)[]): unknown {
  return yol.reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string | number, unknown>)[k] : undefined), x);
}

/* ① SAF GÖVDE */
kontrol("firma modeli: Sale", firmaModeliMi("Sale"));
kontrol("ortak model değil: Channel · User · CargoTariff", !firmaModeliMi("Channel") && !firmaModeliMi("User") && !firmaModeliMi("CargoTariff"));
kontrol("findMany where yok → { companyId }", J(argumanlariSuz("Sale", "findMany", {}, F).where) === J({ companyId: F }));
kontrol("findMany kullanıcı koşulu AND ile korunur (ezilmez)",
  J(argumanlariSuz("Sale", "findMany", { where: { code: "X" } }, F).where) === J({ AND: [{ code: "X" }, { companyId: F }] }));
kontrol("count / aggregate / groupBy / deleteMany de süzülür",
  ["count", "aggregate", "groupBy", "deleteMany", "updateMany"].every((op) => J(argumanlariSuz("Sale", op, {}, F).where) === J({ companyId: F })));
kontrol("findUnique tekil anahtar + companyId", J(whereEkle("findUnique", { id: "s1" }, F)) === J({ id: "s1", companyId: F }));
kontrol("update / delete tekil where'e companyId", ["update", "delete"].every((op) => J(argumanlariSuz("Sale", op, { where: { id: "s1" }, data: {} }, F).where) === J({ id: "s1", companyId: F })));
kontrol("ortak modelde HİÇBİR şey değişmez", J(argumanlariSuz("Channel", "findMany", { where: { code: "TY" } }, F)) === J({ where: { code: "TY" } }));
kontrol("create (kontrolsüz) → companyId yazılır",
  J(argumanlariSuz("SaleItem", "create", { data: { saleId: "s", variantId: "v" } }, F).data) === J({ saleId: "s", variantId: "v", companyId: F }));
kontrol("create (kontrollü, connect) → company: { connect }",
  J(veriEkle("SaleItem", { sale: { connect: { id: "s" } }, quantity: 1 }, F)) === J({ sale: { connect: { id: "s" } }, quantity: 1, company: { connect: { id: F } } }));
kontrol("companyId: null «verilmemiş» sayılır (izYaz vakası)",
  J(veriEkle("AuditLog", { action: "A", companyId: null }, F)) === J({ action: "A", companyId: F }));
kontrol("farklı companyId → FIRMA_CAKISMASI", firlatirMi(() => veriEkle("Sale", { companyId: "firma-B" }, F), "FIRMA_CAKISMASI"));
kontrol("farklı company.connect → FIRMA_CAKISMASI", firlatirMi(() => veriEkle("Sale", { company: { connect: { id: "firma-B" } } }, F), "FIRMA_CAKISMASI"));
kontrol("where'de farklı companyId → FIRMA_CAKISMASI", firlatirMi(() => whereEkle("findUnique", { id: "s", companyId: "firma-B" }, F), "FIRMA_CAKISMASI"));
kontrol("(3d) bileşik tekil anahtarda farklı firma → FIRMA_CAKISMASI",
  firlatirMi(() => whereEkle("upsert", { companyId_sku: { companyId: "firma-B", sku: "X" } }, F), "FIRMA_CAKISMASI"));
kontrol("(3d) bileşik tekil anahtarda AYNI firma geçer, dış firma da eklenir",
  J(whereEkle("upsert", { companyId_sku: { companyId: F, sku: "X" } }, F)) === J({ companyId_sku: { companyId: F, sku: "X" }, companyId: F }));
{
  const d = veriEkle("Sale", { code: "S1", items: { create: [{ variantId: "v1", quantity: 1 }] } }, F);
  kontrol("İÇ İÇE create: çocuk satıra da companyId", al(d, "items", "create", 0, "companyId") === F);
  const d2 = veriEkle("Sale", { items: { createMany: { data: [{ variantId: "v" }] } } }, F);
  kontrol("İÇ İÇE createMany: çocuk satıra da companyId", al(d2, "items", "createMany", "data", 0, "companyId") === F);
  const d3 = argumanlariSuz("Sale", "update", { where: { id: "s" }, data: { items: { create: { variantId: "v" } } } }, F);
  kontrol("güncelleme içindeki İÇ İÇE create: companyId", al(d3, "data", "items", "create", "companyId") === F);
  const d4 = argumanlariSuz("Sale", "upsert", { where: { id: "s" }, create: { code: "X" }, update: {} }, F);
  kontrol("upsert: where + create'e firma", al(d4, "where", "companyId") === F && al(d4, "create", "companyId") === F);
}

/* ② HARİTA TAZE */
{
  const yeni = dosyaMetni(haritaUret(kaynakOku("prisma/schema.prisma")));
  kontrol("firma modelleri haritası şemayla GÜNCEL (npm run firma-modelleri:uret)", yeni.replace(/\r\n/g, "\n") === kaynakOku(HARITA_DOSYASI).replace(/\r\n/g, "\n"));
  const firmaSayisi = Object.values(haritaUret(kaynakOku("prisma/schema.prisma"))).filter((b) => b.firma).length;
  kontrol(`firmaya ait model tabanı DOLU (≥49, bulunan ${firmaSayisi})`, firmaSayisi >= 49);
}

/* ③ İSTEMCİ BAĞI — kullanım bloğu (gövde `firma-istemcisi.ts`: web + betik ORTAK) */
{
  const u = yorumsuz(kaynakOku("src/lib/firma-istemcisi.ts"));
  const b = u.indexOf("async $allOperations({ model, operation, args, query })");
  const blok = b >= 0 ? u.slice(b, b + 600) : "";
  kontrol("firmaIstemcisi boş firmayla kurulamaz", /if \(!companyId\) \{\s*throw new FirmaBaglamiHatasi\("FIRMA_BAGLAMI_YOK", "firmaIstemcisi/.test(u));
  kontrol("firmaIstemcisi süzgeçten geçer (sabit firma)", u.includes("return suzgecUzat(ham, () => companyId);"));
  const p = yorumsuz(kaynakOku("src/lib/prisma.ts"));
  kontrol("ortak istemci aynı gövdeyi kullanır (bağlam/oturum firması)", p.includes("suzgecli = suzgecUzat(istemciyiAl(), aktifFirmaKimligi);"));
  kontrol("uzantı tüm modellerde kurulu", b >= 0);
  kontrol("ortak model süzülmeden geçer", blok.includes("if (!firmaModeliMi(model)) return query(args);"));
  kontrol("bağlam yoksa FIRMA_BAGLAMI_YOK", /if \(!companyId\) \{\s*throw new FirmaBaglamiHatasi\("FIRMA_BAGLAMI_YOK"/.test(blok));
  kontrol("argümanlar süzgeçten geçer", blok.includes("return query(argumanlariSuz(model, operation, args, companyId)"));
  kontrol("dışa açılan `prisma` SÜZGEÇLİ vekil", p.includes("export const prisma = vekil(suzgecliyiAl);"));
}

/* ④ BAĞLAM — await run içinde */
{
  const b = yorumsuz(kaynakOku("src/lib/firma-baglami.ts"));
  kontrol("firmaBaglamindaCalistir await'i run İÇİNDE", b.includes("return depo.run({ companyId }, async () => await fn());"));
  kontrol("istek dışı hata yalnız «request scope» ise yutulur, gerisi fırlatılır", /if \(e instanceof Error && \/request scope[^/]*\/i\.test\(e\.message\)\) \{\s*return null;\s*\}\s*throw e;/.test(b));
}

/* ⑤ DESEN YASAĞI — sistemPrisma gerekçesiz kullanılamaz */
function dosyalar(d: string): string[] {
  const c: string[] = [];
  for (const ad of readdirSync(d)) {
    const y = join(d, ad);
    if (statSync(y).isDirectory()) { if (ad !== "generated") c.push(...dosyalar(y)); }
    else if (/\.tsx?$/.test(ad)) c.push(y);
  }
  return c;
}
let sistemKullanimi = 0;
for (const yol of dosyalar("src")) {
  const y = yol.replace(/\\/g, "/");
  if (y.endsWith("src/lib/prisma.ts")) continue;
  const ham = kaynakOku(yol);
  const kod = yorumsuz(ham);
  const satirlar = ham.split("\n");
  const re = /\bsistemPrisma\b(?!\s*[,}]\s*from)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(kod)) !== null) {
    const satirNo = kod.slice(0, m.index).split("\n").length;
    if (/^\s*import\b/.test(satirlar[satirNo - 1] ?? "") || /import\s*\{[^}]*$/.test(kod.slice(0, m.index).split("\n").slice(-1)[0] ?? "")) continue;
    sistemKullanimi++;
    let ust = satirNo - 1, blok = satirlar[satirNo - 1] ?? "";
    while (ust > 0) {
      const s = satirlar[ust - 1]!.trim();
      if (!(s.startsWith("*") || s.startsWith("//") || s.startsWith("/*") || s === "")) break;
      blok = satirlar[ust - 1] + "\n" + blok;
      ust--;
    }
    kontrol(`${y}:${satirNo} sistemPrisma gerekçeli (SISTEM:)`, /SISTEM:\s*\S/.test(blok));
  }
}
kontrol(`sistemPrisma kullanımı tarandı (bulunan ${sistemKullanimi})`, sistemKullanimi >= 1);

/* ⑥ ANAHTAR FİRMASI + DÖNGÜ — DEĞERLE (döngü async; özetten ÖNCE beklenir) */
async function donguOlc() {
  const A = { id: "a", code: "AXC", name: "Axcalı" };
  const D = { id: "d", code: "DMS", name: "Damisell" };
  kontrol("tek firma, beyan yok → o firma (canlı davranışı aynen)", J(kimlikFirmasiSec([A], undefined)) === J({ tamam: true, firma: A }));
  kontrol("iki firma, beyan yok → BEYAN_GEREKLI («ilkini seç» yok)", J(kimlikFirmasiSec([A, D], undefined)) === J({ tamam: false, sebep: "BEYAN_GEREKLI" }));
  kontrol("iki firma, beyan DMS → Damisell", J(kimlikFirmasiSec([A, D], "DMS")) === J({ tamam: true, firma: D }));
  kontrol("beyan edilen firma aktif değil → HATA, başkasına düşmez", J(kimlikFirmasiSec([A], "DMS")) === J({ tamam: false, sebep: "BEYAN_EDILEN_FIRMA_YOK" }));
  kontrol("firma yok → AKTIF_FIRMA_YOK", J(kimlikFirmasiSec([], undefined)) === J({ tamam: false, sebep: "AKTIF_FIRMA_YOK" }));
  kontrol("zorunluFirma: firmasız HATA", firlatirMi(() => zorunluFirma(undefined, "x"), "FIRMA_BAGLAMI_YOK"));

  const kosanlar: string[] = [];
  const baglamlar: (string | null)[] = [];
  const is = async (id: string) => {
    kosanlar.push(id);
    baglamlar.push(acikFirmaBaglami());
    if (id === "d") throw new Error("patladi");
    return { atlandi: false };
  };
  const s1 = await firmaFirmaKos([A, D], { kanalAnahtariGerekir: true, beyan: undefined }, is);
  kontrol("anahtar isteyen iş, iki firma + beyansız → HİÇ koşmaz", !s1.tamam && kosanlar.length === 0);
  const s2 = await firmaFirmaKos([A, D], { kanalAnahtariGerekir: true, beyan: "AXC" }, is);
  kontrol("anahtar isteyen iş YALNIZ anahtar firmasında koşar", J(kosanlar) === J(["a"]));
  kontrol("öteki firma ATLANDI · anahtar tanımlı değil", s2.tamam && s2.firmalar[1]?.durum === "ATLANDI");
  kontrol("iş kendi firmasının BAĞLAMINDA koşar", J(baglamlar) === J(["a"]));
  kosanlar.length = 0;
  baglamlar.length = 0;
  const s3 = await firmaFirmaKos([A, D], { kanalAnahtariGerekir: false, beyan: undefined }, is);
  kontrol("anahtar istemeyen iş HER firmada, kendi bağlamında", J(kosanlar) === J(["a", "d"]) && J(baglamlar) === J(["a", "d"]));
  kontrol("bir firmanın hatası ötekini durdurmaz, firma adıyla yazılır",
    s3.tamam && s3.firmalar[0]?.durum === "KOSTU" && s3.firmalar[1]?.durum === "HATA" && s3.firmalar[1]?.firma === "DMS · Damisell");
  const s4 = await firmaFirmaKos([], { kanalAnahtariGerekir: false, beyan: undefined }, is);
  kontrol("boş firma listesi «hepsi koştu» sayılmaz", J(s4) === J({ tamam: false, sebep: "AKTIF_FIRMA_YOK" }));
  kontrol("durum kodu: firma HATA → 503", donguDurumKodu(s3, () => false) === 503);
  kontrol("durum kodu: anahtar firması seçilemedi → 503", donguDurumKodu(s1, () => false) === 503);
  kontrol("durum kodu: anahtarsız firmanın ATLANDI'sı 503 YAPMAZ", donguDurumKodu(s2, () => false) === 200);
  kontrol("durum kodu: işin kendi «atlandı»sı → 503", donguDurumKodu(s2, () => true) === 503);
}

/* ⑦ ZAMANLANMIŞ İŞ UÇLARI — küme uçlardan türetilir */
{
  const uclar = dosyalar("src/app/api/cron").filter((y) => /route\.ts$/.test(y));
  kontrol(`zamanlanmış iş ucu tabanı DOLU (≥7, bulunan ${uclar.length})`, uclar.length >= 7);
  const betikler = new Set<string>();
  for (const u of uclar) {
    const k = yorumsuz(kaynakOku(u));
    kontrol(`${u.replace(/\\/g, "/")} firma döngüsünden geçer`, /await zamanlanmisIsDongusu\(\{ kanalAnahtariGerekir: (true|false) \}/.test(k));
    for (const m of k.matchAll(/from "(?:\.\.\/)+scripts\/([\w-]+)"/g)) betikler.add(m[1]!);
  }
  kontrol(`uçların çağırdığı betik tabanı DOLU (≥8, bulunan ${betikler.size})`, betikler.size >= 8);
  for (const b of betikler) {
    const k = yorumsuz(kaynakOku(`scripts/${b}.ts`));
    kontrol(`scripts/${b}.ts süzgeçsiz istemci kurmuyor`, !/new PrismaClient\(/.test(k));
  }
}

/* ⑧ HAM SQL (3c) — süzgeçten geçmez; her kullanım firmayı AÇIKÇA taşır ya da
   gerekçeyle firmalar-üstü beyan edilir. Küme `src/` taramasından (liste yok). */
{
  const HAM = /\.\$(queryRaw|executeRaw)(Unsafe)?\b/g;
  let hamDosya = 0;
  let hamKullanim = 0;
  for (const yol of dosyalar("src")) {
    const ham = kaynakOku(yol);
    const kod = yorumsuz(ham);
    if (!HAM.test(kod)) continue;
    HAM.lastIndex = 0;
    hamDosya++;
    const y = yol.replace(/\\/g, "/");
    if (/HAM SQL SINIFI: SISTEM — \S/.test(ham)) {
      kontrol(`${y} ham SQL — dosya gerekçeyle firmalar-üstü beyanlı`, true);
      continue;
    }
    const satirlar = ham.split("\n");
    let m: RegExpExecArray | null;
    while ((m = HAM.exec(kod)) !== null) {
      hamKullanim++;
      const satirNo = kod.slice(0, m.index).split("\n").length;
      const blok = kod.slice(m.index, m.index + 700);
      const sonu = blok.search(/\);|`;/);
      const kullanim = sonu >= 0 ? blok.slice(0, sonu + 2) : blok;
      let ust = satirNo - 1;
      let yorum = "";
      while (ust > 0) {
        const s = satirlar[ust - 1]!.trim();
        if (!(s.startsWith("*") || s.startsWith("//") || s.startsWith("/*"))) break;
        yorum = satirlar[ust - 1] + "\n" + yorum;
        ust--;
      }
      /* ⚠ İKİ KEZ: bir kez SQL'de sütun adı, bir kez değer. Tek geçiş yetmez —
         şartı silen mutasyon, parametre satırındaki `companyId` yüzünden yeşil
         kalırdı (ölçütü yazarken bulundu). */
      const firmaGecisi = (kullanim.match(/\bcompanyId\b/g) ?? []).length;
      kontrol(
        `${y}:${satirNo} ham SQL firmayı taşıyor (sütun + değer) ya da gerekçeli (SISTEM: · FIRMA:)`,
        firmaGecisi >= 2 || /(SISTEM|FIRMA):\s*\S/.test(yorum),
      );
    }
  }
  kontrol(`ham SQL tabanı DOLU (≥5 dosya, bulunan ${hamDosya}; ${hamKullanim} beyansız-dosya kullanımı)`, hamDosya >= 5);
}

/* ⑧b topluGuncelle firmayı sorguya YAZIYOR — değerle */
async function topluOlc() {
  const { topluGuncelle } = await import("../src/lib/toplu-guncelle");
  const yakalanan: { sorgu: string; p: unknown[] }[] = [];
  const sahte = { $executeRawUnsafe: async (sorgu: string, ...p: unknown[]) => { yakalanan.push({ sorgu, p }); return 1; } };
  await topluGuncelle(sahte, F, "ProductVariant", [{ id: "v1", degerler: { name: "x" } }]);
  const s = yakalanan[0];
  kontrol("topluGuncelle: WHERE'de `AND companyId = ?`", Boolean(s && /WHERE `id` IN \(\?\) AND `companyId` = \?$/.test(s.sorgu)));
  kontrol("topluGuncelle: son parametre bağlamın firması", s?.p[s.p.length - 1] === F);
  let atti = false;
  try { await topluGuncelle(sahte, "", "ProductVariant", [{ id: "v1", degerler: { name: "x" } }]); } catch (e) { atti = e instanceof Error && e.message.startsWith("FIRMA_BAGLAMI_YOK"); }
  kontrol("topluGuncelle: firmasız çağrı HATA", atti);
  const { zorunluAktifFirma } = await import("../src/lib/firma-baglami");
  let bagsizAtti = false;
  try { await zorunluAktifFirma("x"); } catch (e) { bagsizAtti = e instanceof Error && e.message.startsWith("FIRMA_BAGLAMI_YOK"); }
  kontrol("zorunluAktifFirma: bağlamsız HATA (ham SQL firmasız koşamaz)", bagsizAtti);
}

/* Anayasa: «ölçüt bloğu özet ve çıkış kodundan ÖNCE koşar» — async blok
   bitmeden özet basılmaz; çökerse GEÇERSİZ. */
donguOlc().then(() => topluOlc()).then(
  () => {
    console.log("\n" + (hata === 0 ? "TÜM KONTROLLER GEÇTİ" : "BAŞARISIZ") + ` (${gecen}/${gecen + hata})\n`);
    process.exit(hata === 0 ? 0 : 1);
  },
  (e) => {
    console.log("\nDÖNGÜ ÖLÇÜMÜ ÇÖKTÜ — sonuç GEÇERSİZ:", e instanceof Error ? e.message : e);
    process.exit(1);
  },
);
