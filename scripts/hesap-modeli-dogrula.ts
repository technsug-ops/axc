import "dotenv/config";

import { kaynakOku } from "./kaynak-oku";

/**
 * ============================================================================
 *  HESAP MODELİ BEKÇİSİ — MODEL 2: FİRMA BAŞINA HESAP (K303, 05.10.2026)
 * ----------------------------------------------------------------------------
 *      npm run hesap-modeli:dogrula
 *
 *  Kullanıcı kararı: «Her firmanın kendi kodu olduğundan aynı mail ile olmuş
 *  olması fark etmemeli» → aynı e-posta her firmada AYRI hesap, ayrı parola.
 *
 *  ① gövde (gerçek DB, iki geçici firma): aynı e-posta iki firmada iki hesap;
 *     her firma KENDİ hesabını bulur; parolalar bağımsız
 *  ② tekillik: aynı firmada aynı e-posta ikinci kez AÇILAMAZ
 *  ③ yönetim kapısı: süper adminle aynı e-postalı FİRMA hesabı yönetimde bulunmaz
 *  ④ gerçek veride değişmezler: hesap firması = üyeliğin firması (tek üyelik) ·
 *     süper admin firmasız · aynı e-postayla iki süper admin yok
 *  ⑤ desen yasağı: `src/` içinde kişiyi YALNIZ e-postayla arayan sorgu yok
 * ============================================================================
 */

console.log("\nHESAP MODELİ BEKÇİSİ\n");

const BOLUM_SAYISI = 5;
const kosanBolumler: string[] = [];
let gecen = 0;
let hata = 0;
function kontrol(ad: string, kosul: boolean, gorulen?: unknown) {
  if (kosul) { gecen++; console.log("  OK    " + ad); }
  else { hata++; console.log("  HATA  " + ad + (gorulen !== undefined ? `  (görülen: ${JSON.stringify(gorulen)})` : "")); }
}
function yorumsuz(k: string): string {
  return k.replace(/\r/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

async function main() {
  const { sistemPrisma } = await import("../src/lib/prisma");
  const { firmaHesabi, superAdminHesabi } = await import("../src/lib/oturum-firmasi");
  const { parolaDogrula, parolaOzetle } = await import("../src/lib/parola");

  const ek = Date.now().toString(36).toUpperCase().slice(-5);
  const eposta = `ayni-${ek.toLowerCase()}@bekci.test`;
  // SISTEM: iki geçici firma — sonunda silinir.
  const A = await sistemPrisma.company.create({ data: { name: `ZZHMA${ek}`, code: `ZHA${ek}` }, select: { id: true } });
  // SISTEM: ikinci geçici firma.
  const B = await sistemPrisma.company.create({ data: { name: `ZZHMB${ek}`, code: `ZHB${ek}` }, select: { id: true } });
  const kisiler: string[] = [];
  try {
    /* ① GÖVDE */
    console.log("① aynı e-posta, iki firma");
    const hesapAc = async (firmaId: string | null, parola: string, ust = false) => {
      // SISTEM: geçici hesap.
      const u = await sistemPrisma.user.create({ data: { email: eposta, hesapFirmasiId: firmaId, passwordHash: await parolaOzetle(parola), isSuperAdmin: ust }, select: { id: true } });
      kisiler.push(u.id);
      return u.id;
    };
    const hA = await hesapAc(A.id, "parola-A-firmasi-1");
    const hB = await hesapAc(B.id, "parola-B-firmasi-2");
    kontrol("aynı e-posta iki firmada İKİ AYRI hesap açılabildi", hA !== hB);
    const bulA = await firmaHesabi(A.id, eposta);
    const bulB = await firmaHesabi(B.id, eposta);
    kontrol("A firması KENDİ hesabını bulur", bulA?.id === hA);
    kontrol("B firması KENDİ hesabını bulur", bulB?.id === hB);
    kontrol("A'nın parolası A'da geçer", await parolaDogrula("parola-A-firmasi-1", bulA?.passwordHash ?? ""));
    kontrol("  ...A'nın parolası B hesabında GEÇMEZ (parolalar bağımsız)", !(await parolaDogrula("parola-A-firmasi-1", bulB?.passwordHash ?? "")));
    kontrol("firma yoksa (kod geçersiz) hesap bulunmaz", (await firmaHesabi(null, eposta)) === null);
    kosanBolumler.push("govde");

    /* ② TEKİLLİK */
    console.log("\n② firma içinde tekillik");
    let ikinciAcildi = true;
    try { await hesapAc(A.id, "baska-parola-123"); } catch { ikinciAcildi = false; }
    kontrol("aynı firmada aynı e-posta ikinci kez AÇILAMAZ", !ikinciAcildi);
    kosanBolumler.push("tekillik");

    /* ③ YÖNETİM KAPISI */
    console.log("\n③ yönetim girişi yalnız firmasız süper admin");
    kontrol("süper admin yokken aynı e-postalı FİRMA hesabı yönetimde bulunmaz", (await superAdminHesabi(eposta)) === null);
    const ust = await hesapAc(null, "ust-parola-12345", true);
    kontrol("firmasız süper admin bulunur", (await superAdminHesabi(eposta))?.id === ust);
    kontrol("  ...firma hesapları hâlâ kendi firmalarında (süper admin karışmaz)", (await firmaHesabi(A.id, eposta))?.id === hA);
    kosanBolumler.push("yonetim");
  } finally {
    // SISTEM: temizlik.
    await sistemPrisma.user.deleteMany({ where: { id: { in: kisiler } } });
    // SISTEM: temizlik.
    await sistemPrisma.company.deleteMany({ where: { id: { in: [A.id, B.id] } } });
    // SISTEM: ölçüm.
    kontrol("geçici firmalar ve hesaplar silindi", (await sistemPrisma.user.count({ where: { id: { in: kisiler } } })) === 0 && (await sistemPrisma.company.count({ where: { id: { in: [A.id, B.id] } } })) === 0);
  }

  /* ④ GERÇEK VERİDE DEĞİŞMEZLER */
  console.log("\n④ gerçek veride değişmezler");
  // SISTEM: bütün hesaplar (salt okuma).
  const hepsi = await sistemPrisma.user.findMany({ select: { email: true, isSuperAdmin: true, hesapFirmasiId: true, userCompanyRoles: { select: { companyId: true } } } });
  kontrol(`taban: hesap var (${hepsi.length} ≥ 2)`, hepsi.length >= 2);
  const firmaHesaplari = hepsi.filter((u) => !u.isSuperAdmin);
  const uyumsuz = firmaHesaplari.filter((u) => !u.hesapFirmasiId || u.userCompanyRoles.length !== 1 || u.userCompanyRoles[0]!.companyId !== u.hesapFirmasiId).map((u) => u.email);
  kontrol("her firma hesabının firması = TEK üyeliğinin firması", uyumsuz.length === 0, uyumsuz);
  const firmali = hepsi.filter((u) => u.isSuperAdmin && (u.hesapFirmasiId || u.userCompanyRoles.length > 0)).map((u) => u.email);
  kontrol("süper admin firmasız ve üyeliksiz", firmali.length === 0, firmali);
  const ustEpostalar = hepsi.filter((u) => u.isSuperAdmin).map((u) => u.email);
  kontrol("aynı e-postayla iki süper admin YOK (NULL tekilliğe girmediği için ayrıca)", new Set(ustEpostalar).size === ustEpostalar.length, ustEpostalar);
  kosanBolumler.push("veri");

  /* ⑤ DESEN YASAĞI */
  console.log("\n⑤ desen yasağı — kişi yalnız e-postayla aranmaz");
  const { readdirSync, statSync } = await import("node:fs");
  const { join } = await import("node:path");
  const dosyalar = (kok: string): string[] =>
    readdirSync(kok).flatMap((ad) => {
      const y = join(kok, ad).replace(/\\/g, "/");
      if (y.startsWith("src/generated")) return [];
      return statSync(y).isDirectory() ? dosyalar(y) : /\.tsx?$/.test(y) ? [y] : [];
    });
  const tumu = dosyalar("src");
  kontrol(`taban: src taraması dolu (${tumu.length} ≥ 300)`, tumu.length >= 300);
  // Yasak olan: FİRMA KOŞULU TAŞIMAYAN e-posta araması. `where` bloğunda
  // `hesapFirmasiId` geçiyorsa (firma hesabı ya da firmasız süper admin) meşrudur.
  const ihlal = tumu.filter((y) => {
    const kod = yorumsuz(kaynakOku(y));
    const desen = /\.user\.(findUnique|findFirst|findMany)\(\{\s*where:\s*\{\s*email\s*:/g;
    for (let m = desen.exec(kod); m; m = desen.exec(kod)) {
      const blok = kod.slice(m.index, kod.indexOf("}", m.index + m[0].length) + 1);
      if (!blok.includes("hesapFirmasiId")) return true;
    }
    return false;
  });
  kontrol("src'de `user.find*({ where: { email: … } })` YOK (hesap = firma + e-posta; süper admin `superAdminHesabi`)", ihlal.length === 0, ihlal);
  /* Hesap AÇAN her yer firmasını yazar — temiz veriyle sınanamayan yollar
     (firma açılışı, kullanıcı ekle) için kaynak koşulu; aksi hâlde firmasız
     hesap ancak gerçekten açıldıktan sonra ④'te görülürdü. */
  const acilisYerleri: string[] = [];
  const firmasizAcilis: string[] = [];
  for (const y of tumu) {
    const kod = yorumsuz(kaynakOku(y));
    const desen = /\.user\.create\(\{/g;
    for (let m = desen.exec(kod); m; m = desen.exec(kod)) {
      acilisYerleri.push(y);
      const blok = kod.slice(m.index, m.index + 400);
      if (!/hesapFirmasiId\s*:/.test(blok)) firmasizAcilis.push(y);
    }
  }
  /* Bağ: iki giriş eylemi bu gövdeleri ÇAĞIRIR (anayasa: zincir halkalarının
     varlığıyla değil bağlantısıyla sınanır). */
  const firmaGirisi = yorumsuz(kaynakOku("src/app/giris/actions.ts"));
  const yonetimGirisi = yorumsuz(kaynakOku("src/app/bezirga/actions.ts"));
  kontrol("firma girişi hesabı firmaHesabi(firma, e-posta) ile bulur", firmaGirisi.includes("const kullanici = await firmaHesabi(firma?.id ?? null, eposta);"));
  kontrol("yönetim girişi hesabı superAdminHesabi ile bulur", yonetimGirisi.includes("const kullanici = await superAdminHesabi(eposta);"));
  kontrol(`taban: src'de hesap açan yer bulundu (${acilisYerleri.length} ≥ 2)`, acilisYerleri.length >= 2, acilisYerleri);
  kontrol("hesap açan HER yer hesabın firmasını yazar (hesapFirmasiId)", firmasizAcilis.length === 0, firmasizAcilis);
  kosanBolumler.push("desen");

  await sistemPrisma.$disconnect();
  if (kosanBolumler.length !== BOLUM_SAYISI) {
    console.log(`\n  KOŞUM YARIM KALDI (${kosanBolumler.length}/${BOLUM_SAYISI}) — sonuç GEÇERSİZ\n`);
    process.exit(1);
  }
  if (hata === 0) console.log(`\nTÜM KONTROLLER GEÇTİ (${gecen}/${gecen})\n`);
  else { console.log(`\n${hata} KONTROL BAŞARISIZ (${gecen}/${gecen + hata})\n`); process.exitCode = 1; }
}

main().catch((e) => { console.error("\nBEKÇİ ÇÖKTÜ:", e); process.exit(1); });
