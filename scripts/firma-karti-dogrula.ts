import "dotenv/config";

/**
 * ============================================================================
 *  FİRMA KARTI BEKÇİSİ — süper admin ① (K303, 05.10.2026)
 * ----------------------------------------------------------------------------
 *      npm run firma-karti:dogrula
 *
 *  Gövdeyi (`lib/firma-karti.ts`) GERÇEK veritabanında ÇAĞIRIR — desen aramaz
 *  (anayasa: «saf hesap katmanı desen tarayan bekçiye muhtaç olmaz»). İki
 *  geçici firma (Z, Y) ve üç geçici kişi kurar, sonunda hepsini siler.
 *
 *  ÖLÇÜLENLER:
 *  ① saf ad kuralı — firma açılışıyla aynı (kırp, boş reddet)
 *  ② kart: yalnız O firmanın üyeleri · sayılar yalnız ADET (ticari alan yok)
 *     · çok firmalı kişide üyelik sayısı doğru
 *  ③ parola: kendi üyesinde TAMAM (zorunlu değişim + oturum düşer + iz) ·
 *     BAŞKA firmanın kişisi UYE_DEGIL ve kişi DEĞİŞMEDİ · süper admin
 *     SUPER_ADMIN ve kişi DEĞİŞMEDİ
 *  ④ ad: değişir + iz eski/yeni · aynı ad iz YAZMAZ · boş ad AD_BOS ve ad
 *     DEĞİŞMEDİ
 * ============================================================================
 */

console.log("\nFİRMA KARTI BEKÇİSİ\n");

const BOLUM_SAYISI = 4;
const kosanBolumler: string[] = [];
let gecen = 0;
let hata = 0;
function kontrol(ad: string, kosul: boolean, gorulen?: unknown) {
  if (kosul) { gecen++; console.log("  OK    " + ad); }
  else { hata++; console.log("  HATA  " + ad + (gorulen !== undefined ? `  (görülen: ${JSON.stringify(gorulen)})` : "")); }
}

async function main() {
  const { sistemPrisma } = await import("../src/lib/prisma");
  const g = await import("../src/lib/firma-karti");
  const { parolaOzetle } = await import("../src/lib/parola");

  /* ① SAF */
  const s = (x: string) => g.firmaAdiniSina(x);
  kontrol("kenar boşlukları kırpılır", (() => { const r = s("  Örnek Marka "); return r.durum === "TAMAM" && r.ad === "Örnek Marka"; })());
  kontrol("boş ad → AD_BOS", (() => { const r = s("   "); return r.durum === "HATA" && r.hata === "AD_BOS"; })());
  kontrol("iç boşluklara dokunulmaz (açılışla aynı kural)", (() => { const r = s("A  B"); return r.durum === "TAMAM" && r.ad === "A  B"; })());
  kosanBolumler.push("saf");

  /* GEÇİCİ KURULUM */
  // SISTEM: işlemi «yapan» gerçek bir kişi (iz tablosu kullanıcıya bağlı).
  const yapan = (await sistemPrisma.user.findFirst({ where: { isSuperAdmin: true }, select: { id: true } }))?.id;
  kontrol("taban: süper admin var (işlemi yapan)", Boolean(yapan));
  if (!yapan) { console.log("  ÖLÇÜLEMEDİ — süper admin yok (npm run super-admin:ata)"); process.exit(1); }

  const ek = Date.now().toString(36).toUpperCase().slice(-5);
  const ozet = await parolaOzetle("bekci-gecici-parola");
  // SISTEM: bekçinin geçici firmaları, rolleri ve kişileri — sonunda silinir.
  const Z = await sistemPrisma.company.create({ data: { name: `ZZKRT${ek}`, code: `ZZK${ek}`, isActive: true }, select: { id: true } });
  // SISTEM: ikinci geçici firma (izolasyon için).
  const Y = await sistemPrisma.company.create({ data: { name: `ZZKRY${ek}`, code: `ZZY${ek}`, isActive: true }, select: { id: true } });
  const kisiler: string[] = [];
  const roller: string[] = [];
  try {
    // SISTEM: geçici roller (rol firmaya aittir).
    const rZ = await sistemPrisma.role.create({ data: { name: "Bekci", companyId: Z.id }, select: { id: true } });
    // SISTEM: geçici rol, ikinci firma.
    const rY = await sistemPrisma.role.create({ data: { name: "Bekci", companyId: Y.id }, select: { id: true } });
    roller.push(rZ.id, rY.id);
    const kisi = async (ad: string, ust = false) => {
      // SISTEM: geçici kişi (kişi küreseldir).
      const u = await sistemPrisma.user.create({
        data: { email: `${ad.toLowerCase()}-${ek.toLowerCase()}@bekci.test`, name: ad, passwordHash: ozet, isSuperAdmin: ust },
        select: { id: true },
      });
      kisiler.push(u.id);
      return u.id;
    };
    const uye = async (userId: string, companyId: string, roleId: string) =>
      // SISTEM: geçici üyelik.
      sistemPrisma.userCompanyRole.create({ data: { userId, companyId, roleId } });

    const ali = await kisi("Ali"); // yalnız Z
    const ayse = await kisi("Ayse"); // Z + Y
    const veli = await kisi("Veli"); // yalnız Y
    const ust = await kisi("Ust", true); // Z üyesi süper admin
    await uye(ali, Z.id, rZ.id);
    await uye(ayse, Z.id, rZ.id);
    await uye(ayse, Y.id, rY.id);
    await uye(veli, Y.id, rY.id);
    await uye(ust, Z.id, rZ.id);

    /* ② KART */
    const kart = await g.firmaKarti(Z.id);
    kontrol("kart bulundu", kart !== null);
    const idler = new Set(kart?.kullanicilar.map((k) => k.id));
    kontrol("yalnız Z'nin üyeleri listede (Ali, Ayşe, Üst)", idler.size === 3 && idler.has(ali) && idler.has(ayse) && idler.has(ust), [...idler].length);
    kontrol("  ...Y'nin kişisi (Veli) listede YOK", !idler.has(veli));
    kontrol("çok firmalı kişide üyelik sayısı 2", kart?.kullanicilar.find((k) => k.id === ayse)?.uyelikSayisi === 2);
    kontrol("tek firmalı kişide üyelik sayısı 1", kart?.kullanicilar.find((k) => k.id === ali)?.uyelikSayisi === 1);
    kontrol("kullanıcı sayısı üyelik sayısına eşit (3)", kart?.sayilar.kullanici === 3);
    kontrol("boş firmada ürün/satış/alım sayısı 0", kart?.sayilar.urun === 0 && kart?.sayilar.satis === 0 && kart?.sayilar.alim === 0);
    const SAYI_ALANLARI = ["urun", "varyant", "satis", "alim", "iade", "kanalHesabi", "kullanici"].sort().join(",");
    kontrol("sayılar YALNIZ adet alanları (tutar/kâr alanı yok)", Object.keys(kart?.sayilar ?? {}).sort().join(",") === SAYI_ALANLARI, Object.keys(kart?.sayilar ?? {}));
    kontrol("  ...ve hepsi tam sayı", Object.values(kart?.sayilar ?? {}).every((v) => Number.isInteger(v)));
    kontrol("olmayan firma → null", (await g.firmaKarti("yok-boyle-firma")) === null);
    kosanBolumler.push("kart");

    /* ③ PAROLA */
    const durum = async (id: string) =>
      // SISTEM: ölçüm.
      sistemPrisma.user.findUniqueOrThrow({ where: { id }, select: { passwordHash: true, mustChangePassword: true, sessionVersion: true } });
    const izSay = async (id: string) =>
      // SISTEM: ölçüm.
      sistemPrisma.auditLog.count({ where: { action: "YONETIM_PAROLA_SIFIRLADI", targetId: id } });

    const once = await durum(ali);
    const r1 = await g.firmaKullanicisininParolasiniSifirla(Z.id, ali, yapan);
    const sonra = await durum(ali);
    kontrol("kendi üyesinde → TAMAM", r1.durum === "TAMAM", r1);
    kontrol("  ...geçici parola en az 10 karakter", r1.durum === "TAMAM" && r1.geciciParola.length >= 10);
    kontrol("  ...parola özeti değişti", sonra.passwordHash !== once.passwordHash);
    kontrol("  ...ilk girişte değiştirmek ZORUNLU", sonra.mustChangePassword === true);
    kontrol("  ...açık oturumlar düşer (sürüm +1)", sonra.sessionVersion === once.sessionVersion + 1);
    kontrol("  ...iz yazıldı (1)", (await izSay(ali)) === 1);

    const vOnce = await durum(veli);
    const r2 = await g.firmaKullanicisininParolasiniSifirla(Z.id, veli, yapan);
    kontrol("BAŞKA firmanın kişisi Z kartından → UYE_DEGIL", r2.durum === "HATA" && r2.hata === "UYE_DEGIL", r2);
    kontrol("  ...ve kişi DEĞİŞMEDİ, iz yok", JSON.stringify(await durum(veli)) === JSON.stringify(vOnce) && (await izSay(veli)) === 0);

    const sOnce = await durum(ust);
    const r3 = await g.firmaKullanicisininParolasiniSifirla(Z.id, ust, yapan);
    kontrol("süper admin → SUPER_ADMIN", r3.durum === "HATA" && r3.hata === "SUPER_ADMIN", r3);
    kontrol("  ...ve kişi DEĞİŞMEDİ, iz yok", JSON.stringify(await durum(ust)) === JSON.stringify(sOnce) && (await izSay(ust)) === 0);
    kosanBolumler.push("parola");

    /* ④ AD */
    const ad = async () =>
      // SISTEM: ölçüm.
      (await sistemPrisma.company.findUniqueOrThrow({ where: { id: Z.id }, select: { name: true } })).name;
    const adIzleri = async () =>
      // SISTEM: ölçüm.
      sistemPrisma.auditLog.findMany({ where: { action: "FIRMA_ADI_DEGISTI", targetId: Z.id }, select: { detail: true } });
    const eski = await ad();
    const a1 = await g.firmaAdiniDegistir(Z.id, `  Yeni ${ek} `, yapan);
    kontrol("ad değişir (kırpılmış)", a1.durum === "TAMAM" && a1.degisti && (await ad()) === `Yeni ${ek}`, a1);
    const izler1 = await adIzleri();
    kontrol("  ...iz eski ve yeni adı taşır", izler1.length === 1 && JSON.parse(izler1[0]!.detail ?? "{}").eski === eski && JSON.parse(izler1[0]!.detail ?? "{}").yeni === `Yeni ${ek}`, izler1);
    const a2 = await g.firmaAdiniDegistir(Z.id, `Yeni ${ek}`, yapan);
    kontrol("aynı ad → değişmedi ve iz YAZMAZ", a2.durum === "TAMAM" && !a2.degisti && (await adIzleri()).length === 1, a2);
    const a3 = await g.firmaAdiniDegistir(Z.id, "   ", yapan);
    kontrol("boş ad → AD_BOS ve ad DEĞİŞMEDİ", a3.durum === "HATA" && a3.hata === "AD_BOS" && (await ad()) === `Yeni ${ek}`, a3);
    kontrol("olmayan firma → FIRMA_YOK", (await g.firmaAdiniDegistir("yok-boyle-firma", "X", yapan)).durum === "HATA");
    kosanBolumler.push("ad");
  } finally {
    // SISTEM: bekçinin geçici kayıtları — sıra: iz · üyelik · kişi · rol · firma.
    await sistemPrisma.auditLog.deleteMany({ where: { targetId: { in: [Z.id, Y.id, ...kisiler] } } });
    // SISTEM: geçici üyelikler.
    await sistemPrisma.userCompanyRole.deleteMany({ where: { companyId: { in: [Z.id, Y.id] } } });
    // SISTEM: geçici kişiler.
    await sistemPrisma.user.deleteMany({ where: { id: { in: kisiler } } });
    // SISTEM: geçici roller.
    await sistemPrisma.role.deleteMany({ where: { id: { in: roller } } });
    // SISTEM: geçici firmalar.
    await sistemPrisma.company.deleteMany({ where: { id: { in: [Z.id, Y.id] } } });
    // SISTEM: ölçüm.
    const kalan = await sistemPrisma.company.count({ where: { id: { in: [Z.id, Y.id] } } });
    // SISTEM: ölçüm.
    const kalanKisi = await sistemPrisma.user.count({ where: { id: { in: kisiler } } });
    kontrol("geçici firmalar, kişiler ve izler silindi", kalan === 0 && kalanKisi === 0);
  }

  await sistemPrisma.$disconnect();
  if (kosanBolumler.length !== BOLUM_SAYISI) {
    console.log(`\n  KOŞUM YARIM KALDI (${kosanBolumler.length}/${BOLUM_SAYISI}) — sonuç GEÇERSİZ\n`);
    process.exit(1);
  }
  if (hata === 0) console.log(`\nTÜM KONTROLLER GEÇTİ (${gecen}/${gecen})\n`);
  else { console.log(`\n${hata} KONTROL BAŞARISIZ (${gecen}/${gecen + hata})\n`); process.exitCode = 1; }
}

main().catch((e) => { console.error("\nBEKÇİ ÇÖKTÜ:", e); process.exit(1); });
