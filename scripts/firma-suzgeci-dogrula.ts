import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { kaynakOku } from "./kaynak-oku";
import { haritaUret, dosyaMetni, HARITA_DOSYASI } from "./firma-modelleri-uret";
import { argumanlariSuz, firmaModeliMi, veriEkle, whereEkle } from "../src/lib/firma-suzgeci";

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

/* ③ İSTEMCİ BAĞI — kullanım bloğu */
{
  const p = yorumsuz(kaynakOku("src/lib/prisma.ts"));
  const b = p.indexOf("async $allOperations({ model, operation, args, query })");
  const blok = b >= 0 ? p.slice(b, b + 600) : "";
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

console.log("\n" + (hata === 0 ? "TÜM KONTROLLER GEÇTİ" : "BAŞARISIZ") + ` (${gecen}/${gecen + hata})\n`);
process.exit(hata === 0 ? 0 : 1);
