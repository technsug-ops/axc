import "dotenv/config";

import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { kaynakOku } from "./kaynak-oku";

/**
 * ============================================================================
 *  OTURUMUN FİRMASI — BEKÇİ (K303 4c-1, 04.10.2026)
 * ----------------------------------------------------------------------------
 *      npm run oturum-firmasi:dogrula
 *
 *  Kullanıcı kararı 04.10.2026: «Firma kodu + kullanıcı + şifre girer ve kendi
 *  firmasına geçer»; firma içinden başka firmaya geçiş YOK.
 *
 *  GÖVDEYİ GERÇEK VERİTABANINDA ÇAĞIRIR (`firmaKodundanKimlik` · `uyeMi`).
 *  İKİ YÖN:
 *   · yanlış susma — başka firmanın kodu/üyeliği KABUL EDİLMEZ; pasif rol ya
 *     da pasif firma üyeliği DÜŞÜRÜR
 *   · yanlış yanma — doğru kod (harf/boşluk farkıyla) ve gerçek üyelik GEÇER
 *  Pasiflik ölçümü için GEÇİCİ firma + rol + üyelik yazar, sonunda siler ve
 *  silindiğini ölçer.
 *
 *  BAĞ + DESEN YASAĞI: giriş, oturum okuması ve yetki aynı gövdeye bağlı; ve
 *  firmalar-üstü (`sistemPrisma`) bir üyelik okuması FİRMA KOŞULU OLMADAN
 *  yazılamaz — «ilk üyelik» tahmini hiçbir yerde geri dönemez (dosya listesi
 *  tutulmaz, `src/` taranır).
 * ============================================================================
 */

console.log("\nOTURUM FİRMASI BEKÇİSİ\n");

const BOLUM_SAYISI = 5;
const kosanBolumler: string[] = [];
let gecen = 0;
let hata = 0;
function kontrol(ad: string, kosul: boolean, gorulen?: unknown) {
  if (kosul) { gecen++; console.log("  OK    " + ad); }
  else { hata++; console.log("  HATA  " + ad + (gorulen !== undefined ? `  (görülen: ${JSON.stringify(gorulen)})` : "")); }
}

/** Yalnız tam yorum satırları ve blok yorumlar atılır — dize içi `//` korunur. */
function yorumsuz(kod: string): string {
  return kod
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .split("\n")
    .filter((s) => !s.trim().startsWith("//"))
    .join("\n");
}

/** `metin` içinde `bas`tan başlayan çağrının kapanan parantezine kadar. */
function cagriBlogu(metin: string, bas: number): string {
  let derinlik = 0;
  for (let i = metin.indexOf("(", bas); i >= 0 && i < metin.length; i++) {
    if (metin[i] === "(") derinlik++;
    else if (metin[i] === ")" && --derinlik === 0) return metin.slice(bas, i + 1);
  }
  return metin.slice(bas);
}

function kaynaklar(kok: string): string[] {
  const sonuc: string[] = [];
  for (const ad of readdirSync(kok)) {
    const yol = join(kok, ad);
    if (statSync(yol).isDirectory()) { if (ad !== "generated") sonuc.push(...kaynaklar(yol)); }
    else if (/\.(ts|tsx)$/.test(ad)) sonuc.push(yol);
  }
  return sonuc;
}

async function main() {
  const { sistemPrisma } = await import("../src/lib/prisma");
  const { firmaKodundanKimlik, firmaKoduNormalle, uyeMi } = await import("../src/lib/oturum-firmasi");

  /* ① TABAN — iki farklı firmada, YALNIZ o firmaya üye birer kullanıcı */
  // SISTEM: bekçi firmalar-üstü bakar; hangi kullanıcının hangi firmaya üye olduğu.
  const uyelikler = await sistemPrisma.userCompanyRole.findMany({
    where: { company: { isActive: true }, role: { isActive: true } },
    select: { userId: true, companyId: true, company: { select: { code: true } } },
  });
  const firmaSayisi = new Map<string, number>();
  for (const u of uyelikler) firmaSayisi.set(u.userId, (firmaSayisi.get(u.userId) ?? 0) + 1);
  const tekFirmali = uyelikler.filter((u) => firmaSayisi.get(u.userId) === 1);
  const A = tekFirmali[0];
  const B = tekFirmali.find((u) => u.companyId !== A?.companyId);
  kontrol("taban: iki ayrı firmada yalnız o firmaya üye kullanıcı var", Boolean(A && B), { tekFirmali: tekFirmali.length });
  if (!A || !B) { console.log("\n  ÖLÇÜLEMEDİ — iki firmalı veri yok (deneme kurulumunda Damisell kurulmalı)\n"); process.exit(1); }
  kosanBolumler.push("taban");

  /* ② FİRMA KODU */
  kontrol("firma kodu kendi firmasını bulur", (await firmaKodundanKimlik(A.company.code)) === A.companyId);
  kontrol("küçük harf + boşlukla yazılan kod da bulur", (await firmaKodundanKimlik(`  ${A.company.code.toLowerCase()} `)) === A.companyId);
  kontrol("öteki firmanın kodu ÖTEKİ firmayı verir (karışmaz)", (await firmaKodundanKimlik(B.company.code)) === B.companyId);
  kontrol("olmayan kod → null", (await firmaKodundanKimlik(`YOK-${Date.now()}`)) === null);
  kontrol("boş kod → null", (await firmaKodundanKimlik("   ")) === null);
  kontrol("normalleştirme saf: ' abc ' → 'ABC'", firmaKoduNormalle(" abc ") === "ABC");
  kosanBolumler.push("firma-kodu");

  /* ③ ÜYELİK — iki yön */
  kontrol("A kendi firmasına üye (geçer)", await uyeMi(A.userId, A.companyId));
  kontrol("B kendi firmasına üye (geçer)", await uyeMi(B.userId, B.companyId));
  kontrol("A, B'nin firmasına GİREMEZ", !(await uyeMi(A.userId, B.companyId)));
  kontrol("B, A'nın firmasına GİREMEZ", !(await uyeMi(B.userId, A.companyId)));
  kontrol("boş kullanıcı/firma → false", !(await uyeMi("", A.companyId)) && !(await uyeMi(A.userId, "")));
  kosanBolumler.push("uyelik");

  /* ④ PASİFLİK — geçici firma + rol + üyelik; pasif rol/firma oturumu düşürür */
  const ek = `ZZOTF-${Date.now().toString(36)}`;
  // SISTEM: bekçinin geçici firması; sonunda silinir.
  const Z = await sistemPrisma.company.create({ data: { name: ek, code: ek }, select: { id: true } });
  try {
    // SISTEM: geçici firmanın rolü ve üyeliği, firma açıkça verilir.
    const rol = await sistemPrisma.role.create({ data: { name: ek, companyId: Z.id }, select: { id: true } });
    await sistemPrisma.userCompanyRole.create({ data: { userId: A.userId, companyId: Z.id, roleId: rol.id } });
    kontrol("geçici firmada üyelik geçer", await uyeMi(A.userId, Z.id));
    kontrol("  ...ve kodu çözülür", (await firmaKodundanKimlik(ek)) === Z.id);
    await sistemPrisma.role.update({ where: { id: rol.id }, data: { isActive: false } });
    kontrol("rol PASİF → üyelik geçmez (açık oturum düşer)", !(await uyeMi(A.userId, Z.id)));
    await sistemPrisma.role.update({ where: { id: rol.id }, data: { isActive: true } });
    await sistemPrisma.company.update({ where: { id: Z.id }, data: { isActive: false } });
    kontrol("firma PASİF → üyelik geçmez", !(await uyeMi(A.userId, Z.id)));
    kontrol("firma PASİF → kodu da çözülmez", (await firmaKodundanKimlik(ek)) === null);
  } finally {
    // SISTEM: bekçinin geçici kayıtları kimlikleriyle silinir.
    await sistemPrisma.userCompanyRole.deleteMany({ where: { companyId: Z.id } });
    await sistemPrisma.role.deleteMany({ where: { companyId: Z.id } });
    await sistemPrisma.company.delete({ where: { id: Z.id } });
    const kalan = await sistemPrisma.company.count({ where: { code: ek } });
    kontrol("bekçinin geçici firması silindi (kalan 0)", kalan === 0, kalan);
  }
  kosanBolumler.push("pasiflik");

  /* ⑤ BAĞ + DESEN YASAĞI */
  const giris = yorumsuz(kaynakOku("src/app/giris/actions.ts"));
  const gBas = giris.indexOf("export async function girisYap(");
  const gGovde = gBas >= 0 ? giris.slice(gBas, giris.indexOf("export async function cikisYap(")) : "";
  const iUye = gGovde.indexOf("const uye = await uyeMi(kullanici?.id ?? \"-\", firmaId ?? \"-\");");
  const iKapi = gGovde.indexOf("if (!kullanici || !kullanici.isActive || !gecti || !firmaId || !uye) {");
  const iAc = gGovde.indexOf("await oturumAc(kullanici.id, firmaId);");
  kontrol("giriş: firma kodu çözülür ve üyelik sorulur", gGovde.includes("const firmaId = await firmaKodundanKimlik(firmaKodu);") && iUye >= 0);
  kontrol("giriş: üyelik/firma yoksa giriş REDDEDİLİR (aynı tek kapı)", iKapi >= 0);
  kontrol("giriş: oturum seçilen firmayla açılır, kapıdan SONRA", iAc >= 0 && iKapi >= 0 && iUye >= 0 && iUye < iKapi && iKapi < iAc);

  const oturum = yorumsuz(kaynakOku("src/lib/oturum.ts"));
  const oBas = oturum.indexOf("export async function oturumdakiKullanici(");
  const oGovde = oBas >= 0 ? oturum.slice(oBas, oturum.indexOf("export async function", oBas + 10)) : "";
  const iOUye = oGovde.indexOf("if (!(await uyeMi(kullanici.id, govde.firmaId))) return null;");
  const iODon = oGovde.indexOf("return { id: kullanici.id, email: kullanici.email, ad: kullanici.name, firmaId: govde.firmaId };");
  kontrol("oturum okuması HER istekte üyeliği sorar, firmayı jetondan döner", iOUye >= 0 && iODon > iOUye);

  const yetki = yorumsuz(kaynakOku("src/lib/yetki/index.ts"));
  const yBas = yetki.indexOf("export const yetkiBaglami = cache(");
  const yGovde = yBas >= 0 ? cagriBlogu(yetki, yBas) : "";
  kontrol("yetki: üyelik OTURUMUN firmasından okunur", yGovde.includes("companyId: kullanici.firmaId"));
  kontrol("yetki: «ilk üyelik» sıralaması YOK", yGovde.length > 0 && !/orderBy/.test(yGovde));

  /* Desen yasağı: firmalar-üstü üyelik okuması firma koşulsuz yazılamaz */
  const ihlal: string[] = [];
  let okumaSayisi = 0;
  for (const yol of kaynaklar("src")) {
    const metin = yorumsuz(kaynakOku(yol));
    const desen = /sistemPrisma\.userCompanyRole\.(findFirst|findUnique|findMany|findFirstOrThrow|findUniqueOrThrow)\(/g;
    for (let m = desen.exec(metin); m; m = desen.exec(metin)) {
      okumaSayisi++;
      const blok = cagriBlogu(metin, m.index);
      if (!/\bcompanyId\s*:/.test(blok)) ihlal.push(`${yol.replace(/\\/g, "/")} → ${m[0]}`);
    }
  }
  kontrol(`taban: src/ altında firmalar-üstü üyelik okuması bulundu (${okumaSayisi} ≥ 2)`, okumaSayisi >= 2, okumaSayisi);
  kontrol("firmalar-üstü üyelik okumalarının HEPSİ firma koşullu (ilk-üyelik tahmini yok)", ihlal.length === 0, ihlal);
  kosanBolumler.push("bag");

  await sistemPrisma.$disconnect();

  if (kosanBolumler.length !== BOLUM_SAYISI) {
    console.log(`\n  KOŞUM YARIM KALDI (${kosanBolumler.length}/${BOLUM_SAYISI}) — sonuç GEÇERSİZ\n`);
    process.exit(1);
  }
  if (hata === 0) console.log(`\nTÜM KONTROLLER GEÇTİ (${gecen}/${gecen})\n`);
  else { console.log(`\n${hata} KONTROL BAŞARISIZ (${gecen}/${gecen + hata})\n`); process.exitCode = 1; }
}

main().catch((e) => { console.error("\nBEKÇİ ÇÖKTÜ:", e); process.exit(1); });
