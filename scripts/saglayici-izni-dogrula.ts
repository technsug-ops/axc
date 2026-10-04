import "dotenv/config";

/**
 * ============================================================================
 *  SAĞLAYICI İZNİ FİRMA ROLÜNDE BULUNMAZ — BEKÇİ (K303 4c-2, 04.10.2026)
 * ----------------------------------------------------------------------------
 *      npm run saglayici-izni:dogrula
 *
 *  Kullanıcı kararı 04.10.2026: Selliora firmaların ÜSTÜNDEKİ yönetim
 *  katmanıdır; sağlayıcı izinleri (`saglayici: true`) hiçbir firma rolüne
 *  girmez — yetki kişide (`User.isSuperAdmin`). Tasarım §9-1 «rol kopyası
 *  deliği»: tohum `TUM_IZINLER` verdiği için her yeni firmanın Sahibi bütün
 *  firmaların destek taleplerini çözebiliyordu.
 *
 *  ① TOHUM ÇAĞRILIR (desen aranmaz): geçici bir firmada `yetkiSeed` gerçekten
 *     koşar → Sahip bütün FİRMA izinlerini alır (yanlış susma) ve hiçbir rol
 *     sağlayıcı izni almaz (yanlış yanma). Geçici firma sonunda silinir.
 *     Tohum yeni firmaya KİMSEYİ kendiliğinden üye yapmaz (süper admin dahil).
 *  ② VERİTABANI: hiçbir firmanın hiçbir rolü sağlayıcı izni taşımaz.
 *  Taban dolu mu ayrıca ölçülür (boş küme her koşulu sağlar).
 *
 *  ⚠ ÖLÇÜLEMEYEN YOL (açık, beyanlı): tohumun İLK KURULUM dalındaki «süper
 *  admin otomatik Sahip yapılmaz» süzgeci (`isSuperAdmin: false`) burada
 *  koşmaz — o dal firmasız tohumda çalışır ve gerçek firmaya yazar. Bu dal
 *  çok firmada yalnız boş veritabanında koşar.
 * ============================================================================
 */

console.log("\nSAĞLAYICI İZNİ BEKÇİSİ\n");

const BOLUM_SAYISI = 2;
const kosanBolumler: string[] = [];
let gecen = 0;
let hata = 0;
function kontrol(ad: string, kosul: boolean, gorulen?: unknown) {
  if (kosul) { gecen++; console.log("  OK    " + ad); }
  else { hata++; console.log("  HATA  " + ad + (gorulen !== undefined ? `  (görülen: ${JSON.stringify(gorulen)})` : "")); }
}

async function main() {
  const { sistemPrisma } = await import("../src/lib/prisma");
  const { firmaIstemcisi } = await import("../src/lib/firma-istemcisi");
  const { yetkiSeed } = await import("../prisma/seed-yetki");
  const { FIRMA_IZINLERI, SAGLAYICI_IZINLERI, SAHIP_ROLU } = await import("../src/lib/yetki/izinler");
  const saglayici = new Set<string>(SAGLAYICI_IZINLERI);

  kontrol(`taban: sağlayıcı izni tanımlı (${SAGLAYICI_IZINLERI.length} ≥ 1)`, SAGLAYICI_IZINLERI.length >= 1);
  kontrol("taban: firma izinleri ile sağlayıcı izinleri ayrık", FIRMA_IZINLERI.every((i) => !saglayici.has(i)));

  /* ① TOHUM — geçici firmada gerçekten koşar */
  const ek = `ZZSAG-${Date.now().toString(36)}`;
  // SISTEM: bekçinin geçici firması; sonunda silinir.
  const Z = await sistemPrisma.company.create({ data: { name: ek, code: ek }, select: { id: true, name: true, code: true } });
  /* Üyeliği OLMAYAN geçici SIRADAN kullanıcı: «verilen firmada kimse üye
     yapılmaz» kapısını «süper admin hariç» kapısından BAĞIMSIZ sınar — yoksa
     birini silen mutasyon ötekinin arkasında görünmez kalırdı (anayasa: iki
     kapı aynı şeyi koruyorsa mutasyon kapı başına izole edilir). */
  // SISTEM: bekçinin geçici kullanıcısı; sonunda silinir.
  const yetim = await sistemPrisma.user.create({ data: { email: `${ek.toLowerCase()}@bekci.local`, passwordHash: "-", isActive: true }, select: { id: true } });
  const adres = process.env.DATABASE_URL ?? "";
  const fp = firmaIstemcisi(adres, Z.id);
  const asilLog = console.log;
  try {
    console.log = () => {}; // tohumun kendi çıktısı bekçi raporunu boğmasın
    try { await yetkiSeed(fp, Z); } finally { console.log = asilLog; }
    // SISTEM: geçici firmanın rolleri okunur.
    const roller = await sistemPrisma.role.findMany({ where: { companyId: Z.id }, select: { name: true, izinler: { select: { permissionKey: true } } } });
    const sahip = roller.find((r) => r.name === SAHIP_ROLU);
    const sahipIzinleri = new Set(sahip?.izinler.map((i) => i.permissionKey) ?? []);
    kontrol(`yeni firmada roller kuruldu (${roller.length} ≥ 2)`, roller.length >= 2, roller.map((r) => r.name));
    kontrol(`Sahip bütün FİRMA izinlerini aldı (${sahipIzinleri.size}/${FIRMA_IZINLERI.length})`, FIRMA_IZINLERI.every((i) => sahipIzinleri.has(i)));
    const sizan = roller.flatMap((r) => r.izinler.filter((i) => saglayici.has(i.permissionKey)).map((i) => `${r.name}:${i.permissionKey}`));
    kontrol("yeni firmanın HİÇBİR rolü sağlayıcı izni almadı", sizan.length === 0, sizan);
    // SISTEM: tohumun kimseyi bu firmaya kendiliğinden üye yapmadığı ölçülür.
    const uyelikler = await sistemPrisma.userCompanyRole.findMany({ where: { companyId: Z.id }, select: { user: { select: { email: true } } } });
    kontrol("tohum yeni firmaya KİMSEYİ kendiliğinden üye yapmadı (üyeliksiz sıradan kullanıcı + süper admin)", uyelikler.length === 0, uyelikler.map((u) => u.user.email));
  } finally {
    await fp.$disconnect();
    // SISTEM: bekçinin geçici kayıtları firmasıyla silinir (üyelik önce — yukarıdaki
    // ölçüt kırmızıysa bile artık bırakılmaz).
    await sistemPrisma.userCompanyRole.deleteMany({ where: { companyId: Z.id } });
    await sistemPrisma.rolePermission.deleteMany({ where: { role: { companyId: Z.id } } });
    await sistemPrisma.role.deleteMany({ where: { companyId: Z.id } });
    await sistemPrisma.company.delete({ where: { id: Z.id } });
    await sistemPrisma.user.delete({ where: { id: yetim.id } });
    kontrol("geçici firma ve kullanıcı silindi", (await sistemPrisma.company.count({ where: { code: ek } })) === 0 && (await sistemPrisma.user.count({ where: { id: yetim.id } })) === 0);
  }
  kosanBolumler.push("tohum");

  /* ② VERİTABANI — bütün firmalar */
  // SISTEM: denetim firmalar-üstüdür.
  const rolSayisi = await sistemPrisma.role.count();
  kontrol(`taban: veritabanında firma rolü var (${rolSayisi} ≥ 1)`, rolSayisi >= 1);
  // SISTEM: denetim firmalar-üstüdür.
  const ihlal = await sistemPrisma.rolePermission.findMany({
    where: { permissionKey: { in: [...SAGLAYICI_IZINLERI] } },
    select: { permissionKey: true, role: { select: { name: true, company: { select: { code: true } } } } },
  });
  kontrol("hiçbir firmanın hiçbir rolü sağlayıcı izni taşımıyor", ihlal.length === 0,
    ihlal.map((i) => `${(i.role.company?.code ?? "firmasız")}·${i.role.name}·${i.permissionKey}`));
  kosanBolumler.push("veritabani");

  await sistemPrisma.$disconnect();
  if (kosanBolumler.length !== BOLUM_SAYISI) {
    console.log(`\n  KOŞUM YARIM KALDI (${kosanBolumler.length}/${BOLUM_SAYISI}) — sonuç GEÇERSİZ\n`);
    process.exit(1);
  }
  if (hata === 0) console.log(`\nTÜM KONTROLLER GEÇTİ (${gecen}/${gecen})\n`);
  else { console.log(`\n${hata} KONTROL BAŞARISIZ (${gecen}/${gecen + hata})\n`); process.exitCode = 1; }
}

main().catch((e) => { console.error("\nBEKÇİ ÇÖKTÜ:", e); process.exit(1); });
