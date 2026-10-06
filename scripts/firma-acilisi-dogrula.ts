import "dotenv/config";

import { kaynakOku } from "./kaynak-oku";

/**
 * ============================================================================
 *  YENİ FİRMA AÇILIŞI — BEKÇİ (K303 4c-2, 04.10.2026)
 * ----------------------------------------------------------------------------
 *      npm run firma-acilisi:dogrula
 *
 *  ① SAF — girdi sınaması gövdeyi ÇAĞIRARAK (ad · kod biçimi · büyük harf ·
 *     e-posta), iki yakalı örnekle.
 *  ② GERÇEK VERİTABANI — kurulum durumu yeniden hesaplanır: geçici firmaya
 *     izler yazılır, YARIM / PASİF / TAM ayrımı ölçülür, sonra silinir.
 *     Var olan kodla açılış HİÇBİR ŞEY yazmadan reddedilir (firma sayısı
 *     değişmez). Yarım kurulum pasife alınamaz / aktifleşmez.
 *  ③ SIRA (kullanım bloğu) — firma PASİF doğar; yönetici + üyelik + AKTİF +
 *     açıldı izi TEK işlemde; geçici parola işlemden SONRA döner; tohumlar
 *     işlemden ÖNCE.
 *  ⚠ ÖLÇÜLMEYEN YOL (açık, beyanlı): tam açılışın (tohumlar dahil) bekçide
 *     koşturulması — temizliği bütün firma tablolarına dokunurdu. Tohumların
 *     rol/üyelik davranışı `saglayici-izni:dogrula`da GERÇEKTEN koşar; tam
 *     açılış 04.10.2026'da deneme sunucusunda uçtan uca ölçüldü (TST1).
 * ============================================================================
 */

console.log("\nFİRMA AÇILIŞI BEKÇİSİ\n");

const BOLUM_SAYISI = 3;
const kosanBolumler: string[] = [];
let gecen = 0;
let hata = 0;
function kontrol(ad: string, kosul: boolean, gorulen?: unknown) {
  if (kosul) { gecen++; console.log("  OK    " + ad); }
  else { hata++; console.log("  HATA  " + ad + (gorulen !== undefined ? `  (görülen: ${JSON.stringify(gorulen)})` : "")); }
}
function yorumsuz(k: string): string {
  return k.replace(/\/\*[\s\S]*?\*\//g, "").split("\n").filter((x) => !x.trim().startsWith("//")).join("\n");
}
function govde(metin: string, bas: string): string {
  const i = metin.indexOf(bas);
  if (i < 0) return "";
  const j = metin.indexOf("\nexport ", i + bas.length);
  const k = metin.indexOf("\nasync function ", i + bas.length);
  const son = [j, k].filter((x) => x > 0).sort((a, b) => a - b)[0];
  return metin.slice(i, son);
}

async function main() {
  const { sistemPrisma } = await import("../src/lib/prisma");
  const g = await import("../src/lib/firma-acilisi");

  /* ① SAF */
  const temel = { ad: "Örnek", kod: "ABC", yoneticiEposta: "a@b.co", yoneticiAd: "" };
  const sin = (o: Partial<typeof temel>) => g.acilisGirdisiniSina({ ...temel, ...o });
  const hataKodu = (r: ReturnType<typeof sin>) => (r.durum === "HATA" ? r.hata : "TAMAM");
  kontrol("geçerli girdi geçer", hataKodu(sin({})) === "TAMAM");
  kontrol("küçük harf + boşluklu kod büyük harfe çevrilir (' abc1 ' → 'ABC1')", (() => { const r = sin({ kod: " abc1 " }); return r.durum === "TAMAM" && r.girdi.kod === "ABC1"; })());
  kontrol("boş ad → AD_BOS", hataKodu(sin({ ad: "  " })) === "AD_BOS");
  kontrol("tek harfli kod → KOD_GECERSIZ (alt sınır 2)", hataKodu(sin({ kod: "A" })) === "KOD_GECERSIZ");
  kontrol("iki harfli kod geçer (alt sınırın içi)", hataKodu(sin({ kod: "AB" })) === "TAMAM");
  kontrol("on harfli kod geçer (üst sınırın içi)", hataKodu(sin({ kod: "ABCDEFGHIJ" })) === "TAMAM");
  kontrol("on bir harfli kod → KOD_GECERSIZ", hataKodu(sin({ kod: "ABCDEFGHIJK" })) === "KOD_GECERSIZ");
  kontrol("Türkçe karakterli kod → KOD_GECERSIZ", hataKodu(sin({ kod: "ŞEK" })) === "KOD_GECERSIZ");
  kontrol("içinde boşluk olan kod → KOD_GECERSIZ", hataKodu(sin({ kod: "A B" })) === "KOD_GECERSIZ");
  kontrol("geçersiz e-posta → EPOSTA_GECERSIZ", hataKodu(sin({ yoneticiEposta: "abc" })) === "EPOSTA_GECERSIZ");
  kontrol("alan adı noktasız e-posta (a@b) → EPOSTA_GECERSIZ", hataKodu(sin({ yoneticiEposta: "a@b" })) === "EPOSTA_GECERSIZ");
  kosanBolumler.push("saf");

  /* ② GERÇEK VERİTABANI */
  // SISTEM: işlemi «yapan» gerçek bir kişi olmalı (iz tablosu kullanıcıya bağlı).
  const yapan = (await sistemPrisma.user.findFirst({ where: { isSuperAdmin: true }, select: { id: true } }))?.id;
  kontrol("taban: süper admin var (işlemi yapan)", Boolean(yapan));
  if (!yapan) { console.log("  ÖLÇÜLEMEDİ — süper admin yok (npm run super-admin:ata)"); process.exit(1); }
  // SISTEM: bekçinin firmalar-üstü ölçümleri.
  const sayi0 = await sistemPrisma.company.count();
  // SISTEM: var olan bir kod (taban dolu mu ayrıca).
  const varolan = await sistemPrisma.company.findFirst({ select: { code: true } });
  kontrol("taban: veritabanında firma var", varolan !== null);
  if (varolan) {
    let r: Awaited<ReturnType<typeof g.firmaAc>> | string;
    try { r = await g.firmaAc({ ...temel, kod: varolan.code }, yapan, "-"); }
    catch (e) { r = "FIRLATTI: " + String(e).replace(/\s+/g, " ").slice(0, 120); }
    kontrol("var olan kodla açılış KOD_VAR döner (fırlatmaz)", typeof r !== "string" && r.durum === "HATA" && r.hata === "KOD_VAR", r);
    // SISTEM: ölçüm.
    kontrol("  ...ve HİÇBİR firma yazılmadı", (await sistemPrisma.company.count()) === sayi0);
  }
  const ek = `ZZACL${Date.now().toString(36).toUpperCase().slice(-5)}`;
  // SISTEM: bekçinin geçici firması (pasif) ve izleri; sonunda silinir.
  const Z = await sistemPrisma.company.create({ data: { name: ek, code: ek, isActive: false }, select: { id: true } });
  try {
    const durum = async () => (await g.kurulumDurumlari([Z.id])).get(Z.id);
    kontrol("izsiz pasif firma → PASIF (bu gövdeden önce açılmış ya da pasife alınmış)", (await durum()) === "PASIF");
    // SISTEM: bekçinin geçici izi.
    await sistemPrisma.auditLog.create({ data: { action: "FIRMA_ACILIS_BASLADI", targetType: "Company", targetId: Z.id, userId: null, companyId: null, detail: "{}" } });
    kontrol("başladı izi var, açıldı izi yok → YARIM", (await durum()) === "YARIM");
    const p = await g.firmaDurumunuDegistir(Z.id, true, yapan);
    kontrol("YARIM firma «aktifleştir» ile AÇILAMAZ", p.durum === "HATA" && p.hata === "YARIM_KURULUM", p);
    // SISTEM: ölçüm.
    kontrol("  ...ve firma PASİF kaldı", (await sistemPrisma.company.findUnique({ where: { id: Z.id }, select: { isActive: true } }))?.isActive === false);
    // SISTEM: bekçinin geçici izi.
    await sistemPrisma.auditLog.create({ data: { action: "FIRMA_ACILDI", targetType: "Company", targetId: Z.id, userId: null, companyId: null, detail: "{}" } });
    kontrol("açıldı izi de var, firma pasif → PASIF (bilerek pasife alınmış)", (await durum()) === "PASIF");
    const a = await g.firmaDurumunuDegistir(Z.id, true, yapan);
    kontrol("PASİF firma aktifleştirilebilir → TAM", a.durum === "TAMAM" && (await durum()) === "TAM", a);
    const t = await g.firmaAcilisiniTamamla(Z.id, yapan);
    kontrol("TAM firmada «kurulumu tamamla» → YARIM_DEGIL (hiçbir şey koşmaz)", t.durum === "HATA" && t.hata === "YARIM_DEGIL", t);
    kontrol("olmayan firma → FIRMA_YOK", (await g.firmaDurumunuDegistir("yok-boyle-firma", false, yapan)).durum === "HATA");
  } finally {
    // SISTEM: bekçinin geçici kayıtları.
    await sistemPrisma.auditLog.deleteMany({ where: { targetId: Z.id } });
    await sistemPrisma.company.delete({ where: { id: Z.id } });
    kontrol("geçici firma ve izleri silindi", (await sistemPrisma.company.count({ where: { id: Z.id } })) === 0 && (await sistemPrisma.auditLog.count({ where: { targetId: Z.id } })) === 0);
  }
  kosanBolumler.push("veritabani");

  /* ③ SIRA */
  const k = yorumsuz(kaynakOku("src/lib/firma-acilisi.ts"));
  const ac = govde(k, "export async function firmaAc(");
  kontrol("firma PASİF doğar", ac.includes("data: { name: g.ad, code: g.kod, isActive: false, paketId }"));
  const iBas = ac.indexOf("action: BASLADI");
  const iYurut = ac.indexOf("return kurulumuYurut(firma.id, g, yapanId);");
  kontrol("başladı izi kurulumdan ÖNCE yazılır", iBas >= 0 && iYurut > iBas);
  const yur = govde(k, "async function kurulumuYurut(");
  const iTohum = yur.indexOf("await yetkiSeed(fp, firma);");
  const iTx = yur.indexOf("await sistemPrisma.$transaction(");
  const iDon = yur.indexOf('return { durum: "ACILDI"');
  kontrol("tohumlar tek işlemden ÖNCE", iTohum >= 0 && iTx > iTohum);
  const tx = iTx >= 0 && iDon > iTx ? yur.slice(iTx, iDon) : "";
  kontrol("tek işlem: yönetici + üyelik + AKTİF + açıldı izi BİRLİKTE",
    tx.includes("await tx.user.create(") && tx.includes("await tx.userCompanyRole.upsert(") &&
    tx.includes("await tx.company.update({ where: { id: firma.id }, data: { isActive: true } });") && tx.includes("action: ACILDI"));
  kontrol("geçici parola işlemden SONRA döner (işlem düşerse parola kaybolmaz)", iDon > iTx && yur.slice(iDon).includes("geciciParola"));
  kontrol("yeni yönetici ilk girişte parola değiştirmek ZORUNDA", tx.includes("mustChangePassword: true"));
  kosanBolumler.push("sira");

  await sistemPrisma.$disconnect();
  if (kosanBolumler.length !== BOLUM_SAYISI) {
    console.log(`\n  KOŞUM YARIM KALDI (${kosanBolumler.length}/${BOLUM_SAYISI}) — sonuç GEÇERSİZ\n`);
    process.exit(1);
  }
  if (hata === 0) console.log(`\nTÜM KONTROLLER GEÇTİ (${gecen}/${gecen})\n`);
  else { console.log(`\n${hata} KONTROL BAŞARISIZ (${gecen}/${gecen + hata})\n`); process.exitCode = 1; }
}

main().catch((e) => { console.error("\nBEKÇİ ÇÖKTÜ:", e); process.exit(1); });
