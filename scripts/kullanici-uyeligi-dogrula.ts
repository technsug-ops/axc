import "dotenv/config";

import { kaynakOku } from "./kaynak-oku";

/**
 * ============================================================================
 *  FİRMA ÜYELİĞİ BEKÇİSİ (K303, 05.10.2026)
 * ----------------------------------------------------------------------------
 *      npm run kullanici-uyeligi:dogrula
 *
 *  Kullanıcı kararı 05.10.2026: pasife alma FİRMA BAZINDA. Aynı gün ölçülen
 *  açıklar: firma Kullanıcılar ekranı bütün firmaların kişilerini listeliyor,
 *  pasife alma/parola sıfırlama başka firmanın kişisine dokunabiliyor,
 *  «kullanıcı ekle» ve maliyet yöntemi koşulsuz «ilk firma»yı seçiyordu.
 *
 *  ① GERÇEK VERİTABANI — gövdeyi (`lib/kullanici-uyeligi.ts`) ÇAĞIRIR: iki
 *     geçici firma (Z, Y), tam yetkili roller, dört kişi; sonunda silinir.
 *  ② DESEN YASAĞI — firma kodunda koşulsuz firma/kişi sorgusu (dosya listesi
 *     yok, `src/` taranır; istisna beyanlı ve gerekçeli).
 * ============================================================================
 */

console.log("\nFİRMA ÜYELİĞİ BEKÇİSİ\n");

const BOLUM_SAYISI = 2;
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
  const g = await import("../src/lib/kullanici-uyeligi");
  const { uyeMi } = await import("../src/lib/oturum-firmasi");
  const { KILIT_ACMA_IZINLERI } = await import("../src/lib/yetki/izinler");
  const { parolaOzetle } = await import("../src/lib/parola");

  /* ① GERÇEK VERİTABANI */
  console.log("① gövde gerçek veritabanında");
  kontrol("taban: tam yetki izin listesi dolu", KILIT_ACMA_IZINLERI.length > 0);
  // SISTEM: işlemi «yapan» (iz kullanıcıya bağlı).
  const yapan = (await sistemPrisma.user.findFirst({ where: { isSuperAdmin: true }, select: { id: true } }))?.id;
  kontrol("taban: süper admin var (işlemi yapan)", Boolean(yapan));
  if (!yapan) process.exit(1);

  const ek = Date.now().toString(36).toUpperCase().slice(-5);
  const ozet = await parolaOzetle("bekci-gecici-parola");
  // SISTEM: geçici firmalar — sonunda silinir.
  const Z = await sistemPrisma.company.create({ data: { name: `ZZUYZ${ek}`, code: `ZUZ${ek}`, isActive: true }, select: { id: true } });
  // SISTEM: ikinci geçici firma.
  const Y = await sistemPrisma.company.create({ data: { name: `ZZUYY${ek}`, code: `ZUY${ek}`, isActive: true }, select: { id: true } });
  const kisiler: string[] = [];
  try {
    const sahipRolu = async (companyId: string) => {
      // SISTEM: geçici tam yetkili rol + izinleri.
      const r = await sistemPrisma.role.create({ data: { name: "BekciSahip", companyId }, select: { id: true } });
      // SISTEM: izinler.
      await sistemPrisma.rolePermission.createMany({ data: KILIT_ACMA_IZINLERI.map((p) => ({ roleId: r.id, permissionKey: p, companyId })) });
      return r.id;
    };
    const rZ = await sahipRolu(Z.id);
    const rY = await sahipRolu(Y.id);
    const kisi = async (ad: string) => {
      // SISTEM: geçici kişi.
      const u = await sistemPrisma.user.create({ data: { email: `${ad.toLowerCase()}-${ek.toLowerCase()}@bekci.test`, name: ad, passwordHash: ozet }, select: { id: true } });
      kisiler.push(u.id);
      return u.id;
    };
    // SISTEM: geçici üyelik.
    const uye = (userId: string, companyId: string, roleId: string) => sistemPrisma.userCompanyRole.create({ data: { userId, companyId, roleId } });
    const ali = await kisi("Ali"); // Z sahibi
    const ayse = await kisi("Ayse"); // Z + Y sahibi
    const veli = await kisi("Veli"); // yalnız Y
    await uye(ali, Z.id, rZ);
    await uye(ayse, Z.id, rZ);
    await uye(ayse, Y.id, rY);
    await uye(veli, Y.id, rY);
    const durum = async (userId: string, companyId: string) =>
      // SISTEM: ölçüm.
      (await sistemPrisma.userCompanyRole.findUnique({ where: { userId_companyId: { userId, companyId } }, select: { isActive: true } }))?.isActive;
    const kisiAktif = async (id: string) =>
      // SISTEM: ölçüm.
      (await sistemPrisma.user.findUniqueOrThrow({ where: { id }, select: { isActive: true } })).isActive;

    kontrol("başka firmanın kişisi bu firmada bulunmaz (firmaUyeligi Z, Veli → null)", (await g.firmaUyeligi(Z.id, veli)) === null);
    const r1 = await g.uyelikDurumunuDegistir(Z.id, veli, yapan);
    kontrol("başka firmanın kişisi pasife ALINAMAZ → UYE_DEGIL", r1.durum === "HATA" && r1.hata === "UYE_DEGIL", r1);
    kontrol("  ...ve Veli'nin Y üyeliği DEĞİŞMEDİ", (await durum(veli, Y.id)) === true);

    const r2 = await g.uyelikDurumunuDegistir(Z.id, ayse, yapan);
    kontrol("Ayşe Z'de pasife alınır → TAMAM, aktif false", r2.durum === "TAMAM" && r2.aktif === false, r2);
    kontrol("  ...Z üyeliği pasif", (await durum(ayse, Z.id)) === false);
    kontrol("  ...Y üyeliği HÂLÂ aktif (öteki firmaya dokunulmaz)", (await durum(ayse, Y.id)) === true);
    kontrol("  ...kişi kaydı (User.isActive) DEĞİŞMEDİ", (await kisiAktif(ayse)) === true);
    kontrol("  ...giriş kapısı: Ayşe Z'ye GİREMEZ", (await uyeMi(ayse, Z.id)) === false);
    kontrol("  ...giriş kapısı: Ayşe Y'ye GİREBİLİR", (await uyeMi(ayse, Y.id)) === true);

    const r3 = await g.uyelikDurumunuDegistir(Z.id, ali, yapan);
    kontrol("Z'nin son aktif sahibi (Ali) pasife ALINAMAZ → SON_SAHIP", r3.durum === "HATA" && r3.hata === "SON_SAHIP", r3);
    kontrol("  ...ve Ali'nin üyeliği DEĞİŞMEDİ", (await durum(ali, Z.id)) === true);
    kontrol("son-sahip ölçütü FİRMA bazında: Y'de Ayşe aktif ama Z'yi kurtarmaz", (await g.firmadaBaskaSahipVarMi(Z.id, ali)) === false);

    const r4 = await g.uyelikDurumunuDegistir(Z.id, ayse, yapan);
    kontrol("Ayşe Z'de yeniden aktif → TAMAM, aktif true", r4.durum === "TAMAM" && r4.aktif === true, r4);
    kontrol("  ...giriş kapısı: Ayşe Z'ye yeniden girebilir", (await uyeMi(ayse, Z.id)) === true);
    // SISTEM: ölçüm.
    const izler = await sistemPrisma.auditLog.findMany({ where: { companyId: Z.id, action: { in: ["UYELIK_PASIFE_ALINDI", "UYELIK_AKTIFLESTI"] } }, select: { action: true } });
    kontrol("iz: pasife + aktif = 2, Z'ye bağlı", izler.length === 2 && izler.some((i) => i.action === "UYELIK_PASIFE_ALINDI") && izler.some((i) => i.action === "UYELIK_AKTIFLESTI"), izler);
    kosanBolumler.push("veritabani");
  } finally {
    // SISTEM: geçici kayıtlar — iz · üyelik · kişi · izin · rol · firma.
    await sistemPrisma.auditLog.deleteMany({ where: { companyId: { in: [Z.id, Y.id] } } });
    // SISTEM: temizlik.
    await sistemPrisma.userCompanyRole.deleteMany({ where: { companyId: { in: [Z.id, Y.id] } } });
    // SISTEM: temizlik.
    await sistemPrisma.user.deleteMany({ where: { id: { in: kisiler } } });
    // SISTEM: temizlik.
    await sistemPrisma.rolePermission.deleteMany({ where: { companyId: { in: [Z.id, Y.id] } } });
    // SISTEM: temizlik.
    await sistemPrisma.role.deleteMany({ where: { companyId: { in: [Z.id, Y.id] } } });
    // SISTEM: temizlik.
    await sistemPrisma.company.deleteMany({ where: { id: { in: [Z.id, Y.id] } } });
    // SISTEM: ölçüm.
    kontrol("geçici firmalar ve kişiler silindi", (await sistemPrisma.company.count({ where: { id: { in: [Z.id, Y.id] } } })) === 0 && (await sistemPrisma.user.count({ where: { id: { in: kisiler } } })) === 0);
  }

  /* ② DESEN YASAĞI */
  console.log("\n② desen yasağı — firma kodunda koşulsuz firma/kişi sorgusu");
  /** Beyanlı istisnalar — dosya: gerekçe. */
  const ISTISNA = new Map<string, string>([
    ["src/lib/oturum.ts", "kullaniciVarMi — ilk kurulum ekranı «sistemde hiç kişi var mı» diye BÜTÜN sisteme bakar (firma oturumu henüz yok)"],
  ]);
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
  const DESEN = /\bprisma\.(company\.(findFirst|findMany)|user\.(findMany|findFirst|count|updateMany))\(/;
  const ihlal: string[] = [];
  let istisnaKullanildi = 0;
  for (const y of tumu) {
    if (!DESEN.test(yorumsuz(kaynakOku(y)))) continue;
    if (ISTISNA.has(y)) { istisnaKullanildi++; continue; }
    ihlal.push(y);
  }
  kontrol("firma kodunda koşulsuz firma/kişi sorgusu YOK (firma bağlamdan; kişi üyelikten)", ihlal.length === 0, ihlal);
  kontrol("beyanlı istisnalar bayat değil (her biri hâlâ deseni taşıyor)", istisnaKullanildi === ISTISNA.size, { istisnaKullanildi });
  for (const [d, gerekce] of ISTISNA) kontrol(`  istisna gerekçeli: ${d}`, gerekce.length > 30);
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
