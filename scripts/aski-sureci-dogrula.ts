import "dotenv/config";

/**
 * ============================================================================
 *  ASKI SÜRECİ BEKÇİSİ (K303, kullanıcı kararı 05.10.2026)
 * ----------------------------------------------------------------------------
 *      npm run aski-sureci:dogrula
 *
 *  Gövdeleri (`lib/aski-sureci.ts` · `lib/eposta.ts`) GERÇEK veritabanında
 *  ÇAĞIRIR; e-posta SAHTE göndericiyle (gerçek e-posta GİTMEZ). Geçici firma,
 *  rol, kişiler kurulur ve sonunda silinir.
 *
 *  ① saf: durum (normal/uyarıda/son gün/süresi doldu/askıda) · İstanbul günü ·
 *     sebep doğrulaması
 *  ② süreç: uyarı → kaldır → SEBEPSİZ askı reddi → askı → askı kalkar; her
 *     adımda alanlar + iz + giriş kapısı (`uyeMi`)
 *  ③ e-posta: gitti / gitmedi (sebep TAM) / ayar yok — üçü de iz; parola ize
 *     yazılmaz
 *  ④ alıcılar: yalnız aktif tam yetkili; pasif üye ve süper admin DIŞARIDA
 * ============================================================================
 */

console.log("\nASKI SÜRECİ BEKÇİSİ\n");

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
  const a = await import("../src/lib/aski-sureci");
  const ep = await import("../src/lib/eposta");
  const { firmaDurumunuDegistir } = await import("../src/lib/firma-acilisi");
  const { uyeMi } = await import("../src/lib/oturum-firmasi");
  const { KILIT_ACMA_IZINLERI } = await import("../src/lib/yetki/izinler");
  const { parolaOzetle } = await import("../src/lib/parola");

  /* ① SAF */
  console.log("① saf");
  const G = (s: string) => new Date(`${s}T00:00:00.000Z`);
  const bugun = G("2026-10-05");
  const d = (o: Partial<Parameters<typeof a.askiDurumu>[0]>) =>
    a.askiDurumu({ aktif: true, uyariSonGun: null, uyariSebebi: null, askiSebebi: null, ...o }, bugun);
  kontrol("uyarı yok → NORMAL", d({}).tur === "NORMAL");
  const u7 = d({ uyariSonGun: G("2026-10-12"), uyariSebebi: "ODEME_GECIKMESI" });
  kontrol("son gün 7 gün sonra → UYARIDA, kalan 7", u7.tur === "UYARIDA" && u7.kalanGun === 7, u7);
  const u0 = d({ uyariSonGun: G("2026-10-05") });
  kontrol("son gün BUGÜN → hâlâ UYARIDA, kalan 0 (son gün dahil)", u0.tur === "UYARIDA" && u0.kalanGun === 0, u0);
  const sd = d({ uyariSonGun: G("2026-10-03") });
  kontrol("son gün 2 gün önce → SURESI_DOLDU, geçen 2", sd.tur === "SURESI_DOLDU" && sd.gecenGun === 2, sd);
  kontrol("askıdaki firma → ASKIDA (uyarıdan önce gelir)", d({ aktif: false, uyariSonGun: G("2026-10-12"), askiSebebi: "GUVENLIK" }).tur === "ASKIDA");
  kontrol("İstanbul günü: 05.10 21:30 UTC = İstanbul 06.10 00:30 → 2026-10-06", a.bugunIs(new Date("2026-10-05T21:30:00Z")).toISOString().slice(0, 10) === "2026-10-06");
  kontrol("İstanbul günü: 05.10 20:59 UTC = İstanbul 05.10 23:59 → 2026-10-05", a.bugunIs(new Date("2026-10-05T20:59:00Z")).toISOString().slice(0, 10) === "2026-10-05");
  const s = (x: string, y: string) => a.sebebiSina(x, y);
  kontrol("geçerli sebep, boş açıklama → açıklama null", (() => { const r = s("ODEME_GECIKMESI", "  "); return r.durum === "TAMAM" && r.aciklama === null; })());
  kontrol("DIGER + boş açıklama → ACIKLAMA_ZORUNLU", (() => { const r = s("DIGER", " "); return r.durum === "HATA" && r.hata === "ACIKLAMA_ZORUNLU"; })());
  kontrol("tanımsız sebep → SEBEP_GECERSIZ", (() => { const r = s("BASKA", "x"); return r.durum === "HATA" && r.hata === "SEBEP_GECERSIZ"; })());
  kontrol("501 karakter açıklama → ACIKLAMA_UZUN", (() => { const r = s("GUVENLIK", "x".repeat(501)); return r.durum === "HATA" && r.hata === "ACIKLAMA_UZUN"; })());
  kosanBolumler.push("saf");

  /* GEÇİCİ KURULUM */
  // SISTEM: işlemi yapan (iz kullanıcıya bağlı).
  const yapan = (await sistemPrisma.user.findFirst({ where: { isSuperAdmin: true }, select: { id: true } }))?.id;
  if (!yapan) { console.log("  ÖLÇÜLEMEDİ — süper admin yok"); process.exit(1); }
  const ek = Date.now().toString(36).toUpperCase().slice(-5);
  const ozet = await parolaOzetle("bekci-gecici-parola");
  // SISTEM: geçici firma (aktif) + açıldı izi (kurulum TAM sayılsın).
  const Z = await sistemPrisma.company.create({ data: { name: `ZZASK${ek}`, code: `ZAS${ek}`, isActive: true }, select: { id: true } });
  const kisiler: string[] = [];
  try {
    // SISTEM: tam yetkili rol + izinler.
    const r = await sistemPrisma.role.create({ data: { name: "BekciSahip", companyId: Z.id }, select: { id: true } });
    // SISTEM: izinler.
    await sistemPrisma.rolePermission.createMany({ data: KILIT_ACMA_IZINLERI.map((p) => ({ roleId: r.id, permissionKey: p, companyId: Z.id })) });
    const kisi = async (ad: string, ust = false) => {
      // SISTEM: geçici kişi.
      const u = await sistemPrisma.user.create({ data: { email: `${ad.toLowerCase()}-${ek.toLowerCase()}@bekci.test`, name: ad, passwordHash: ozet, isSuperAdmin: ust }, select: { id: true } });
      kisiler.push(u.id);
      return u.id;
    };
    const sahip = await kisi("Sahip");
    const pasif = await kisi("Pasif");
    const ust = await kisi("Ust", true);
    // SISTEM: üyelikler.
    await sistemPrisma.userCompanyRole.createMany({ data: [
      { userId: sahip, companyId: Z.id, roleId: r.id },
      { userId: pasif, companyId: Z.id, roleId: r.id, isActive: false },
      { userId: ust, companyId: Z.id, roleId: r.id },
    ] });
    const firma = async () =>
      // SISTEM: ölçüm.
      sistemPrisma.company.findUniqueOrThrow({ where: { id: Z.id }, select: { isActive: true, uyariSonGun: true, uyariSebebi: true, askiSebebi: true, askiAciklama: true } });
    const izSay = async (action: string) =>
      // SISTEM: ölçüm.
      sistemPrisma.auditLog.count({ where: { targetId: Z.id, action } });

    /* ④ ALICILAR (önce: sonraki adımlar alıcıyı kullanmıyor) */
    console.log("\n④ alıcılar");
    const alicilar = await a.firmaYoneticiEpostalari(Z.id);
    kontrol("yalnız aktif tam yetkili (Sahip)", alicilar.length === 1 && alicilar[0]!.startsWith("sahip-"), alicilar);
    kontrol("  ...pasif üye ve süper admin DIŞARIDA", !alicilar.some((e) => e.startsWith("pasif-") || e.startsWith("ust-")));
    kosanBolumler.push("alicilar");

    /* ② SÜREÇ */
    console.log("\n② süreç");
    const an = new Date("2026-10-05T09:00:00Z");
    const g0 = await a.uyariBaslat(Z.id, { sebep: "ODEME_GECIKMESI", aciklama: "", gun: 0 }, yapan, an);
    kontrol("0 gün → GUN_GECERSIZ, hiçbir şey yazılmaz", g0.durum === "HATA" && g0.hata === "GUN_GECERSIZ" && (await firma()).uyariSonGun === null);
    kontrol("61 gün → GUN_GECERSIZ", (await a.uyariBaslat(Z.id, { sebep: "ODEME_GECIKMESI", aciklama: "", gun: 61 }, yapan, an)).durum === "HATA");
    const u = await a.uyariBaslat(Z.id, { sebep: "ODEME_GECIKMESI", aciklama: "Eylül", gun: 7 }, yapan, an);
    const f1 = await firma();
    kontrol("uyarı başladı: son gün İstanbul bugün + 7 (2026-10-12)", u.durum === "TAMAM" && f1.uyariSonGun?.toISOString().slice(0, 10) === "2026-10-12", f1.uyariSonGun);
    kontrol("  ...sebep + açıklama yazıldı, firma AKTİF kaldı", f1.uyariSebebi === "ODEME_GECIKMESI" && f1.askiAciklama === "Eylül" && f1.isActive);
    kontrol("  ...iz FIRMA_UYARI_BASLADI (1)", (await izSay("FIRMA_UYARI_BASLADI")) === 1);
    kontrol("  ...uyarıdaki firmaya giriş SÜRER (askı değil)", await uyeMi(sahip, Z.id));
    const k1 = await a.uyariKaldir(Z.id, yapan);
    kontrol("uyarı kaldırıldı → alanlar boş, iz", k1.durum === "TAMAM" && (await firma()).uyariSonGun === null && (await izSay("FIRMA_UYARI_KALDIRILDI")) === 1);
    const k2 = await a.uyariKaldir(Z.id, yapan);
    kontrol("uyarı yokken kaldır → UYARI_YOK, iz YAZILMAZ", k2.durum === "HATA" && k2.hata === "UYARI_YOK" && (await izSay("FIRMA_UYARI_KALDIRILDI")) === 1);
    const sebepsiz = await firmaDurumunuDegistir(Z.id, false, yapan);
    kontrol("SEBEPSİZ pasife alma → SEBEP_YOK, firma AKTİF kaldı", sebepsiz.durum === "HATA" && sebepsiz.hata === "SEBEP_YOK" && (await firma()).isActive);
    const dig = await a.askiyaAl(Z.id, { sebep: "DIGER", aciklama: "" }, yapan);
    kontrol("DIGER + açıklamasız askı → ACIKLAMA_ZORUNLU, firma AKTİF", dig.durum === "HATA" && dig.hata === "ACIKLAMA_ZORUNLU" && (await firma()).isActive);
    await a.uyariBaslat(Z.id, { sebep: "SOZLESME_IHLALI", aciklama: "", gun: 3 }, yapan, an);
    const as = await a.askiyaAl(Z.id, { sebep: "GUVENLIK", aciklama: "şüpheli giriş" }, yapan);
    const f2 = await firma();
    kontrol("askıya alındı: PASİF + sebep + açıklama", as.durum === "TAMAM" && !f2.isActive && f2.askiSebebi === "GUVENLIK" && f2.askiAciklama === "şüpheli giriş", f2);
    kontrol("  ...açık uyarı KAPANDI", f2.uyariSonGun === null && f2.uyariSebebi === null);
    kontrol("  ...giriş kapısı: üye GİREMEZ", !(await uyeMi(sahip, Z.id)));
    // SISTEM: ölçüm.
    const izAski = await sistemPrisma.auditLog.findFirst({ where: { targetId: Z.id, action: "FIRMA_PASIFE_ALINDI" }, select: { detail: true } });
    kontrol("  ...iz sebebi taşır", JSON.parse(izAski?.detail ?? "{}").sebep === "GUVENLIK");
    const kal = await a.askiyiKaldir(Z.id, yapan);
    const f3 = await firma();
    kontrol("askı kalktı: AKTİF, sebep/açıklama BOŞ", kal.durum === "TAMAM" && f3.isActive && f3.askiSebebi === null && f3.askiAciklama === null, f3);
    kontrol("  ...giriş yeniden çalışır", await uyeMi(sahip, Z.id));
    const gec = await a.surecGecmisi(Z.id);
    kontrol("süreç geçmişi: en yeni önce, 5 olay (uyarı · kaldır · uyarı · askı · aktif)", gec.length === 5 && gec[0]!.tur === "FIRMA_AKTIFLESTI" && gec[1]!.tur === "FIRMA_PASIFE_ALINDI", gec.map((x) => x.tur));
    kosanBolumler.push("surec");

    /* ③ E-POSTA — SAHTE gönderici */
    console.log("\n③ e-posta (sahte gönderici, gerçek e-posta GİTMEZ)");
    const giden: string[] = [];
    const iyi = { gonderici: { sendMail: async (m: { to: string }) => { giden.push(m.to); return {}; } }, gonderen: "test <t@t>" };
    const kotu = { gonderici: { sendMail: async () => { throw new Error("535 5.7.8 kimlik doğrulama\n reddedildi (ayrıntı satırı)"); } }, gonderen: "test <t@t>" };
    const ortak = { konu: "K", metin: "M", tur: "ASKI_UYARI" as const, firmaId: Z.id, yapanId: yapan };
    const e1 = await ep.epostaGonder({ ...ortak, kime: "a@bekci.test" }, iyi);
    kontrol("iyi gönderici → GONDERILDI, gönderildi", e1.durum === "GONDERILDI" && giden.length === 1);
    const e2 = await ep.epostaGonder({ ...ortak, kime: "b@bekci.test" }, kotu);
    kontrol("düşen gönderici → GONDERILEMEDI, fırlatmaz, sebep TAM (iki satır da)", e2.durum === "GONDERILEMEDI" && (e2.hata ?? "").includes("535") && (e2.hata ?? "").includes("ayrıntı satırı"), e2);
    const e3 = await ep.epostaGonder({ ...ortak, kime: "c@bekci.test" }, null);
    kontrol("ayar yok → AYAR_YOK", e3.durum === "AYAR_YOK");
    const liste = await ep.gidenEpostalar({ firmaId: Z.id });
    kontrol("üçü de iz bıraktı, firmaya bağlı (gitti · gitmedi · ayar yok)", liste.length === 3 && liste.some((x) => x.durum === "GONDERILDI") && liste.some((x) => x.durum === "GONDERILEMEDI" && x.hata?.includes("535")) && liste.some((x) => x.durum === "AYAR_YOK"), liste.map((x) => x.durum));
    const parola = process.env.SMTP_PAROLA ?? "";
    // SISTEM: ölçüm.
    const izMetni = (await sistemPrisma.auditLog.findMany({ where: { companyId: Z.id }, select: { detail: true } })).map((i) => i.detail ?? "").join("|");
    kontrol("SMTP parolası hiçbir ize yazılmadı", parola.length === 0 || !izMetni.includes(parola));
    kosanBolumler.push("eposta");
  } finally {
    // SISTEM: temizlik — iz · üyelik · kişi · izin · rol · firma.
    await sistemPrisma.auditLog.deleteMany({ where: { OR: [{ targetId: Z.id }, { companyId: Z.id }] } });
    // SISTEM: temizlik.
    await sistemPrisma.userCompanyRole.deleteMany({ where: { companyId: Z.id } });
    // SISTEM: temizlik.
    await sistemPrisma.user.deleteMany({ where: { id: { in: kisiler } } });
    // SISTEM: temizlik.
    await sistemPrisma.rolePermission.deleteMany({ where: { companyId: Z.id } });
    // SISTEM: temizlik.
    await sistemPrisma.role.deleteMany({ where: { companyId: Z.id } });
    // SISTEM: temizlik.
    await sistemPrisma.company.delete({ where: { id: Z.id } });
    // SISTEM: ölçüm.
    kontrol("geçici kayıtlar silindi", (await sistemPrisma.company.count({ where: { id: Z.id } })) === 0 && (await sistemPrisma.user.count({ where: { id: { in: kisiler } } })) === 0);
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
