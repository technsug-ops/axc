import "dotenv/config";

import { kaynakOku } from "./kaynak-oku";

/**
 * ============================================================================
 *  İKİ ADIMLI GİRİŞ BEKÇİSİ — süper admin TOTP (K303 ⑤, 06.10.2026)
 * ----------------------------------------------------------------------------
 *      npm run iki-adim:dogrula
 *
 *  ① çekirdek (saf): RFC 6238 Ek B test değerleri · ±1 adım tolerans, ±2
 *     REDDEDİLİR · son adım ve öncesi TEKRAR · base32 gidiş-dönüş
 *  ② gövde (gerçek DB, geçici süper admin): kurulum anahtarı şifreli ve sayfa
 *     yenilense de AYNI · ilk kodla açılış + 10 yedek kod (yalnız özet) · aynı
 *     kod iki kez GEÇMEZ · sonraki adım geçer · yedek kod BİR kez geçer ·
 *     yanlış kod/biçim reddedilir · açık iki adımda yeni anahtar üretilmez ·
 *     sıfırlama her şeyi siler
 *  ③ sır: ana sır yokken kurulum açılmaz (düz metne düşmez)
 * ============================================================================
 */

console.log("\nİKİ ADIMLI GİRİŞ BEKÇİSİ\n");

const BOLUM_SAYISI = 3;
const kosanBolumler: string[] = [];
let gecen = 0;
let hata = 0;
function kontrol(ad: string, kosul: boolean, gorulen?: unknown) {
  if (kosul) { gecen++; console.log("  OK    " + ad); }
  else { hata++; console.log("  HATA  " + ad + (gorulen !== undefined ? `  (görülen: ${JSON.stringify(gorulen)})` : "")); }
}

async function main() {
  const T = await import("../src/lib/iki-adim/totp");
  const { randomBytes } = await import("node:crypto");

  /* ① ÇEKİRDEK */
  console.log("① TOTP çekirdeği (RFC 6238)");
  const rfc = Buffer.from("12345678901234567890");
  const vakalar: [number, string][] = [[59, "94287082"], [1111111109, "07081804"], [1111111111, "14050471"], [1234567890, "89005924"], [2000000000, "69279037"], [20000000000, "65353130"]];
  const tutmayan = vakalar.filter(([t, b]) => T.hotp(rfc, Math.floor(t / 30), 8) !== b);
  kontrol(`RFC 6238 Ek B — 6 test değerinin hepsi tutar (SHA1)`, tutmayan.length === 0, tutmayan);
  const k = randomBytes(20);
  const an = new Date(Date.UTC(2026, 9, 6, 12, 0, 15));
  const a0 = T.adim(an);
  const kod = (d: number) => T.hotp(k, a0 + d);
  kontrol("şimdiki adım geçer", T.dogrula(k, kod(0), an, null).gecer);
  kontrol("±1 adım (saat kayması) geçer", T.dogrula(k, kod(-1), an, null).gecer && T.dogrula(k, kod(1), an, null).gecer);
  const iki = T.dogrula(k, kod(2), an, null);
  kontrol("±2 adım REDDEDİLİR (pencere dar)", !iki.gecer && !T.dogrula(k, kod(-2), an, null).gecer);
  const tekrar = T.dogrula(k, kod(0), an, a0);
  kontrol("son kabul edilen adım TEKRAR olarak reddedilir", !tekrar.gecer && tekrar.sebep === "TEKRAR", tekrar);
  kontrol("son adımdan SONRAKİ adım geçer", T.dogrula(k, kod(1), an, a0).gecer);
  kontrol("biçimsiz kod → BICIM", (() => { const r = T.dogrula(k, "12ab56", an, null); return !r.gecer && r.sebep === "BICIM"; })());
  const b32 = T.yeniAnahtar();
  kontrol("anahtar 160 bit, base32 gidiş-dönüş", b32.length === 32 && T.base32Kodla(T.base32Coz(b32)!) === b32);
  kontrol("otpauth adresi uygulamanın okuduğu biçimde", /^otpauth:\/\/totp\/[^?]+\?secret=[A-Z2-7]+&issuer=.+&algorithm=SHA1&digits=6&period=30$/.test(T.otpauthAdresi("Bezirga", "a@b.c", b32)));
  kontrol("yedek kod XXXXX-XXXXX, karışan harf yok", /^[A-HJ-NP-Z2-9]{5}-[A-HJ-NP-Z2-9]{5}$/.test(T.yeniYedekKod()));
  kosanBolumler.push("cekirdek");

  /* ② GÖVDE */
  console.log("\n② gövde (gerçek veritabanı, geçici süper admin)");
  process.env.IKI_ADIM_SIRRI = randomBytes(32).toString("base64");
  const { sistemPrisma } = await import("../src/lib/prisma");
  const D = await import("../src/lib/iki-adim/depo");
  const ek = Date.now().toString(36).toLowerCase().slice(-6);
  // SISTEM: geçici süper admin — sonunda silinir.
  const u = await sistemPrisma.user.create({ data: { email: `iki-adim-${ek}@bekci.test`, passwordHash: "x", isSuperAdmin: true, hesapFirmasiId: null }, select: { id: true } });
  try {
    kontrol("başlangıç: iki adım YOK", (await D.ikiAdimDurumu(u.id)) === "YOK");
    const k1 = await D.kurulumAnahtari(u.id, "bekci");
    const k2 = await D.kurulumAnahtari(u.id, "bekci");
    kontrol("kurulum anahtarı üretildi ve sayfa yenilense de AYNI", k1.durum === "TAMAM" && k2.durum === "TAMAM" && k1.anahtar === k2.anahtar);
    kontrol("durum KURULUMDA (açılmamış anahtarla giriş yok)", (await D.ikiAdimDurumu(u.id)) === "KURULUMDA");
    // SISTEM: ham kayıt (salt okuma) — düz anahtar var mı?
    const ham = await sistemPrisma.user.findUnique({ where: { id: u.id }, select: { totpSifreli: true } });
    kontrol("veritabanında DÜZ anahtar YOK (şifreli paket)", Boolean(ham?.totpSifreli) && k1.durum === "TAMAM" && !ham!.totpSifreli!.includes(k1.anahtar) && ham!.totpSifreli!.startsWith("v1:"));
    const kurulumda = await D.girisDogrula(u.id, "123456");
    kontrol("açılmamış iki adımla giriş YAPILAMAZ (ACIK_DEGIL)", kurulumda.durum === "HATA" && kurulumda.hata === "ACIK_DEGIL", kurulumda);

    const anahtar = T.base32Coz(k1.durum === "TAMAM" ? k1.anahtar : "")!;
    const simdi = new Date();
    const yanlisKurulum = await D.kurulumuTamamla(u.id, "000000", simdi);
    kontrol("kurulumda yanlış kod reddedilir", yanlisKurulum.durum === "HATA" && (yanlisKurulum.hata === "YANLIS" || yanlisKurulum.hata === "TEKRAR"));
    const ac = await D.kurulumuTamamla(u.id, T.hotp(anahtar, T.adim(simdi)), simdi);
    kontrol("ilk kodla AÇILIR ve 10 yedek kod döner", ac.durum === "TAMAM" && ac.yedekKodlar.length === 10, ac.durum);
    kontrol("durum ACIK", (await D.ikiAdimDurumu(u.id)) === "ACIK");
    // SISTEM: yedek kod özetleri (salt okuma).
    const ozetler = await sistemPrisma.ikiAdimYedekKodu.findMany({ where: { userId: u.id }, select: { ozet: true } });
    kontrol("yedek kodlar YALNIZ özet olarak saklanır", ac.durum === "TAMAM" && ozetler.length === 10 && ozetler.every((o) => o.ozet.startsWith("scrypt$") && !ac.yedekKodlar.some((y) => o.ozet.includes(T.yedekKodNormal(y)))));
    const yeniden = await D.kurulumAnahtari(u.id, "bekci");
    kontrol("açık iki adımda yeni anahtar ÜRETİLMEZ (ZATEN_ACIK)", yeniden.durum === "HATA" && yeniden.hata === "ZATEN_ACIK");

    const ayniKod = await D.girisDogrula(u.id, T.hotp(anahtar, T.adim(simdi)), simdi);
    kontrol("kurulumda kullanılan kod girişte TEKRAR kullanılamaz", ayniKod.durum === "HATA" && ayniKod.hata === "TEKRAR", ayniKod);
    const sonra = new Date(simdi.getTime() + 30_000);
    const g1 = await D.girisDogrula(u.id, T.hotp(anahtar, T.adim(sonra)), sonra);
    kontrol("sonraki adımın kodu GEÇER (yol TOTP)", g1.durum === "TAMAM" && g1.yol === "TOTP", g1);
    const g2 = await D.girisDogrula(u.id, T.hotp(anahtar, T.adim(sonra)), sonra);
    kontrol("aynı kod ikinci kez GEÇMEZ (atomik tekrar koruması)", g2.durum === "HATA" && g2.hata === "TEKRAR", g2);
    const yanlis = await D.girisDogrula(u.id, "000000", new Date(sonra.getTime() + 30_000));
    kontrol("yanlış kod reddedilir", yanlis.durum === "HATA" && (yanlis.hata === "YANLIS" || yanlis.hata === "TEKRAR"));
    if (ac.durum === "TAMAM") {
      const y = ac.yedekKodlar[0]!;
      const y1 = await D.girisDogrula(u.id, y.toLowerCase());
      kontrol("yedek kod (küçük harfle bile) BİR kez geçer, 9 kalır", y1.durum === "TAMAM" && y1.yol === "YEDEK" && y1.kalanYedek === 9, y1);
      const y2 = await D.girisDogrula(u.id, y);
      kontrol("aynı yedek kod ikinci kez GEÇMEZ", y2.durum === "HATA", y2);
    }
    await D.ikiAdimiSifirla(u.id);
    // SISTEM: ölçüm (salt okuma).
    const kalan = await sistemPrisma.ikiAdimYedekKodu.count({ where: { userId: u.id } });
    kontrol("sıfırlama: durum YOK, yedek kodlar silindi", (await D.ikiAdimDurumu(u.id)) === "YOK" && kalan === 0);
  } finally {
    // SISTEM: temizlik.
    await sistemPrisma.user.delete({ where: { id: u.id } });
  }
  kosanBolumler.push("govde");

  /* ③ SIR */
  console.log("\n③ ana sır");
  delete process.env.IKI_ADIM_SIRRI;
  // SISTEM: geçici süper admin (sırsız deneme).
  const v = await sistemPrisma.user.create({ data: { email: `iki-adim-sirsiz-${ek}@bekci.test`, passwordHash: "x", isSuperAdmin: true, hesapFirmasiId: null }, select: { id: true } });
  try {
    const r = await D.kurulumAnahtari(v.id, "bekci");
    kontrol("ana sır yokken kurulum AÇILMAZ (SIR_YOK) ve hiçbir şey yazılmaz", r.durum === "HATA" && r.hata === "SIR_YOK" && (await D.ikiAdimDurumu(v.id)) === "YOK", r);
  } finally {
    // SISTEM: temizlik.
    await sistemPrisma.user.delete({ where: { id: v.id } });
  }
  const depo = kaynakOku("src/lib/iki-adim/depo.ts").replace(/\r/g, "");
  kontrol("tekrar koruması VERİTABANINDA koşullu (updateMany … totpSonAdim lt)", depo.includes("{ totpSonAdim: { lt: d.adim } }") && depo.includes("if (r.count !== 1) return { durum: \"HATA\", hata: \"TEKRAR\" };"));
  kosanBolumler.push("sir");

  await sistemPrisma.$disconnect();
  if (kosanBolumler.length !== BOLUM_SAYISI) {
    console.log(`\n  KOŞUM YARIM KALDI (${kosanBolumler.length}/${BOLUM_SAYISI}) — sonuç GEÇERSİZ\n`);
    process.exit(1);
  }
  if (hata === 0) console.log(`\nTÜM KONTROLLER GEÇTİ (${gecen}/${gecen})\n`);
  else { console.log(`\n${hata} KONTROL BAŞARISIZ (${gecen}/${gecen + hata})\n`); process.exitCode = 1; }
}

main().catch((e) => { console.error("\nBEKÇİ ÇÖKTÜ:", e); process.exit(1); });
