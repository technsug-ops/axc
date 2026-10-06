import "dotenv/config";

import { kaynakOku } from "./kaynak-oku";

/**
 * ============================================================================
 *  ÖDEME TAKİBİ BEKÇİSİ — ELLE ÖDEME (K303, kullanıcı kararı 06.10.2026)
 * ----------------------------------------------------------------------------
 *      npm run odeme-takibi:dogrula
 *
 *  ① saf: durum (vade günü dahil zamanında) · vadenin ay sonu KISILARAK ileri
 *     kayması · kuruş tam sayısı
 *  ② gövde (gerçek DB, geçici firma): abonelik · ödeme vadeyi bir dönem kaydırır
 *     · gelecek tarihli ödeme reddedilir · ters kayıt eksi tutar + vadeyi YALNIZ
 *     kendi bıraktığı değerdeyse geri alır · bir kez düzeltilir · ters kayıt
 *     düzeltilemez · toplam kuruşla (0,10 + 0,20 = 0,30 TAM)
 *  ③ dinamik sözlük anahtarları (i18n bekçisinin SINAMADIĞI `t(\`…${x}\`)`)
 *  ④ bağ + desen yasağı: eylemler gövdeleri çağırır; `firmaOdemesi` hiçbir
 *     yerde GÜNCELLENMEZ/SİLİNMEZ (defter kuralı)
 * ============================================================================
 */

console.log("\nÖDEME TAKİBİ BEKÇİSİ\n");

const BOLUM_SAYISI = 4;
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
const gun = (y: number, a: number, g: number) => new Date(Date.UTC(y, a - 1, g));
const iso = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : null);

async function main() {
  const { sistemPrisma } = await import("../src/lib/prisma");
  const o = await import("../src/lib/odeme-takibi");
  const { bugunIs } = await import("../src/lib/aski-sureci");

  /* ① SAF */
  console.log("① saf hesaplar");
  const b = gun(2026, 10, 6);
  kontrol("vade yoksa TANIMSIZ", o.odemeDurumu(null, b).tur === "TANIMSIZ");
  const d0 = o.odemeDurumu(b, b);
  kontrol("vade günü GECİKMİŞ DEĞİL (kalan 0)", d0.tur === "YAKLASIYOR" && d0.kalanGun === 0, d0);
  const d1 = o.odemeDurumu(gun(2026, 10, 5), b);
  kontrol("vadenin ertesi günü 1 gün GECİKTİ", d1.tur === "GECIKTI" && d1.gecenGun === 1, d1);
  kontrol(`${o.YAKLASIYOR_GUN} gün kala YAKLAŞIYOR`, o.odemeDurumu(gun(2026, 10, 13), b).tur === "YAKLASIYOR");
  kontrol(`${o.YAKLASIYOR_GUN + 1} gün kala ZAMANINDA`, o.odemeDurumu(gun(2026, 10, 14), b).tur === "ZAMANINDA");
  kontrol("aylık: 15 Mart → 15 Nisan", iso(o.vadeyiIlerlet(gun(2027, 3, 15), "AYLIK")) === "2027-04-15");
  kontrol("aylık: 31 Ocak → 28 Şubat (taşmaz, kısılır)", iso(o.vadeyiIlerlet(gun(2027, 1, 31), "AYLIK")) === "2027-02-28", iso(o.vadeyiIlerlet(gun(2027, 1, 31), "AYLIK")));
  kontrol("aylık: 31 Ocak 2028 → 29 Şubat (artık yıl)", iso(o.vadeyiIlerlet(gun(2028, 1, 31), "AYLIK")) === "2028-02-29");
  kontrol("aylık: Aralık → ertesi yıl Ocak", iso(o.vadeyiIlerlet(gun(2026, 12, 10), "AYLIK")) === "2027-01-10");
  kontrol("yıllık: 29 Şubat 2028 → 28 Şubat 2029", iso(o.vadeyiIlerlet(gun(2028, 2, 29), "YILLIK")) === "2029-02-28");
  kontrol("yıllık: 6 Ekim 2026 → 6 Ekim 2027", iso(o.vadeyiIlerlet(gun(2026, 10, 6), "YILLIK")) === "2027-10-06");
  kontrol("kuruş: '1500.01' → 150001", o.kurus("1500.01") === 150001);
  kontrol("kuruş: 0,1 + 0,2 kayan nokta kuyruğu → 30", o.kurus(0.1 + 0.2) === 30);
  kosanBolumler.push("saf");

  /* ② GÖVDE */
  console.log("\n② gövde (gerçek veritabanı, geçici firma)");
  // SISTEM: kayıtları yazan — var olan bir süper admin (salt okuma).
  const yazan = await sistemPrisma.user.findFirst({ where: { isSuperAdmin: true, hesapFirmasiId: null }, select: { id: true } });
  kontrol("taban: yazan süper admin var", Boolean(yazan));
  const ek = Date.now().toString(36).toUpperCase().slice(-5);
  // SISTEM: geçici firma — sonunda silinir.
  const F = await sistemPrisma.company.create({ data: { name: `ZZOD${ek}`, code: `ZOD${ek}` }, select: { id: true } });
  const bugun = bugunIs();
  const bugunMetni = iso(bugun)!;
  try {
    const yid = yazan!.id;
    const f = async () => {
      // SISTEM: geçici firmanın abonelik alanları.
      return (await sistemPrisma.company.findUnique({ where: { id: F.id }, select: { aboneTutari: true, aboneParaBirimi: true, aboneDonemi: true, sonrakiOdemeGunu: true } }))!;
    };

    const bos = await o.odemeKaydet(F.id, { gun: bugunMetni, tutar: "100", paraBirimi: "TRY", yontem: "HAVALE", aciklama: "" }, yid);
    kontrol("abonelik yokken ödeme deftere yazılır, vade KAYMAZ (null kalır)", bos.durum === "TAMAM" && bos.vadeSonra === null && (await f()).sonrakiOdemeGunu === null, bos);

    const hataliAb = [
      [{ tutar: "abc", paraBirimi: "TRY", donem: "AYLIK", vade: "2026-11-01" }, "TUTAR_GECERSIZ"],
      [{ tutar: "0", paraBirimi: "TRY", donem: "AYLIK", vade: "2026-11-01" }, "TUTAR_GECERSIZ"],
      [{ tutar: "100", paraBirimi: "USD", donem: "AYLIK", vade: "2026-11-01" }, "PARA_BIRIMI_GECERSIZ"],
      [{ tutar: "100", paraBirimi: "TRY", donem: "HAFTALIK", vade: "2026-11-01" }, "DONEM_GECERSIZ"],
      [{ tutar: "100", paraBirimi: "TRY", donem: "AYLIK", vade: "2026-02-31" }, "VADE_GECERSIZ"],
    ] as const;
    for (const [g, beklenen] of hataliAb) {
      const r = await o.aboneligiKaydet(F.id, g, yid);
      kontrol(`abonelik reddi: ${JSON.stringify(g).slice(0, 60)} → ${beklenen}`, r.durum === "HATA" && r.hata === beklenen, r);
    }
    const vade0 = gun(2027, 1, 31);
    const ab = await o.aboneligiKaydet(F.id, { tutar: "1.500,00", paraBirimi: "EUR", donem: "AYLIK", vade: "2027-01-31" }, yid);
    const fa = await f();
    kontrol("abonelik yazıldı (1.500,00 EUR · aylık · 31.01.2027)", ab.durum === "TAMAM" && fa.aboneTutari?.toString() === "1500" && fa.aboneParaBirimi === "EUR" && fa.aboneDonemi === "AYLIK" && iso(fa.sonrakiOdemeGunu) === "2027-01-31", { ...fa, aboneTutari: fa.aboneTutari?.toString() });
    // SISTEM: geçici firmanın abonelik izi.
    const abIz = await sistemPrisma.auditLog.count({ where: { action: "FIRMA_ABONELIK_KAYDEDILDI", targetId: F.id } });
    kontrol("abonelik değişikliği ize yazıldı", abIz === 1, abIz);

    const yarin = iso(new Date(bugun.getTime() + 86_400_000))!;
    const gelecek = await o.odemeKaydet(F.id, { gun: yarin, tutar: "1500", paraBirimi: "EUR", yontem: "HAVALE", aciklama: "" }, yid);
    kontrol("yarın tarihli ödeme REDDEDİLİR (GUN_GELECEKTE)", gelecek.durum === "HATA" && gelecek.hata === "GUN_GELECEKTE", gelecek);
    const yontemsiz = await o.odemeKaydet(F.id, { gun: bugunMetni, tutar: "1500", paraBirimi: "EUR", yontem: "CEK", aciklama: "" }, yid);
    kontrol("tanımsız yöntem reddedilir", yontemsiz.durum === "HATA" && yontemsiz.hata === "YONTEM_GECERSIZ", yontemsiz);
    kontrol("  ...reddedilen ödemeler vadeyi KAYDIRMADI", iso((await f()).sonrakiOdemeGunu) === "2027-01-31");

    const A = await o.odemeKaydet(F.id, { gun: bugunMetni, tutar: "0,10", paraBirimi: "EUR", yontem: "HAVALE", aciklama: "A" }, yid);
    kontrol("ödeme A: vade 31.01 → 28.02 (bir dönem, ay sonu kısıldı)", A.durum === "TAMAM" && iso(A.vadeSonra) === "2027-02-28" && iso((await f()).sonrakiOdemeGunu) === "2027-02-28", A);
    const B = await o.odemeKaydet(F.id, { gun: bugunMetni, tutar: "0,20", paraBirimi: "EUR", yontem: "KART", aciklama: "B" }, yid);
    kontrol("ödeme B: vade 28.02 → 28.03", B.durum === "TAMAM" && iso((await f()).sonrakiOdemeGunu) === "2027-03-28", B);
    if (A.durum !== "TAMAM" || B.durum !== "TAMAM") throw new Error("ödeme kaydı yazılamadı — gövde ölçümü sürdürülemez");
    // SISTEM: geçici firmanın ödeme kaydı.
    const kA = await sistemPrisma.firmaOdemesi.findUnique({ where: { id: A.id }, select: { vadeOnce: true, vadeSonra: true } });
    kontrol("ödeme A önceki/sonraki vadeyi taşır", iso(kA?.vadeOnce) === iso(vade0) && iso(kA?.vadeSonra) === "2027-02-28", kA);

    const nedensiz = await o.odemeyiDuzelt(A.id, "  ", yid);
    kontrol("nedensiz ters kayıt REDDEDİLİR", nedensiz.durum === "HATA" && nedensiz.hata === "ACIKLAMA_ZORUNLU", nedensiz);
    const tA = await o.odemeyiDuzelt(A.id, "yanlış tutar", yid);
    kontrol("A ters kaydı: arada B girildiği için vade GERİ ALINMAZ (28.03 kalır)", tA.durum === "TAMAM" && !tA.vadeGeriAlindi && iso((await f()).sonrakiOdemeGunu) === "2027-03-28", tA);
    const tA2 = await o.odemeyiDuzelt(A.id, "ikinci kez", yid);
    kontrol("A ikinci kez düzeltilemez (ZATEN_DUZELTILDI)", tA2.durum === "HATA" && tA2.hata === "ZATEN_DUZELTILDI", tA2);
    const tB = await o.odemeyiDuzelt(B.id, "yanlış kart", yid);
    kontrol("B ters kaydı: vade B'nin bıraktığı değerde → 28.02'ye GERİ döner", tB.durum === "TAMAM" && tB.vadeGeriAlindi && iso((await f()).sonrakiOdemeGunu) === "2027-02-28", tB);
    // SISTEM: geçici firmanın ters kayıtları.
    const tersler = await sistemPrisma.firmaOdemesi.findMany({ where: { firmaId: F.id, duzeltilenId: { not: null } }, select: { id: true, tutar: true, duzeltilenId: true } });
    kontrol("iki ters kayıt, tutarları EKSİ (−0,10 · −0,20)", tersler.length === 2 && tersler.map((x) => x.tutar.toString()).sort().join("|") === "-0.1|-0.2", tersler.map((x) => x.tutar.toString()));
    const ters = tersler[0]!;
    const tT = await o.odemeyiDuzelt(ters.id, "tersin tersi", yid);
    kontrol("ters kayıt düzeltilemez", tT.durum === "HATA" && tT.hata === "TERS_KAYIT_DUZELTILEMEZ", tT);

    const C = await o.odemeKaydet(F.id, { gun: bugunMetni, tutar: "0,10", paraBirimi: "EUR", yontem: "NAKIT", aciklama: "" }, yid);
    const D = await o.odemeKaydet(F.id, { gun: bugunMetni, tutar: "0,20", paraBirimi: "EUR", yontem: "NAKIT", aciklama: "" }, yid);
    kontrol("C ve D yazıldı", C.durum === "TAMAM" && D.durum === "TAMAM");
    const liste = await o.firmaOdemeleri(F.id);
    const eur = liste.toplamlar.find((x) => x.paraBirimi === "EUR")?.tutar;
    const tr = liste.toplamlar.find((x) => x.paraBirimi === "TRY")?.tutar;
    kontrol("EUR toplamı TAM 0,30 (0,1−0,1+0,2−0,2+0,1+0,2; kuruşla toplandı)", eur === 0.3, eur);
    kontrol("TRY toplamı ayrı: 100 (para birimleri karışmaz)", tr === 100, tr);
    kontrol("liste: 7 satır, düzeltilenler ve ters kayıtlar işaretli", liste.satirlar.length === 7 && liste.satirlar.filter((s) => s.tersKayit).length === 2 && liste.satirlar.filter((s) => s.duzeltildi).length === 2, liste.satirlar.length);
  } finally {
    // SISTEM: temizlik — önce ters kayıtlar (öz bağ), sonra kalanlar.
    await sistemPrisma.firmaOdemesi.deleteMany({ where: { firmaId: F.id, duzeltilenId: { not: null } } });
    // SISTEM: temizlik.
    await sistemPrisma.firmaOdemesi.deleteMany({ where: { firmaId: F.id } });
    // SISTEM: temizlik — geçici firmanın abonelik izi.
    await sistemPrisma.auditLog.deleteMany({ where: { action: "FIRMA_ABONELIK_KAYDEDILDI", targetId: F.id } });
    // SISTEM: temizlik.
    await sistemPrisma.company.delete({ where: { id: F.id } });
    // SISTEM: ölçüm.
    kontrol("geçici firma ve ödemeleri silindi", (await sistemPrisma.company.count({ where: { id: F.id } })) === 0 && (await sistemPrisma.firmaOdemesi.count({ where: { firmaId: F.id } })) === 0);
  }
  kosanBolumler.push("govde");

  /* ③ DİNAMİK SÖZLÜK ANAHTARLARI */
  console.log("\n③ dinamik sözlük anahtarları");
  for (const dil of ["tr", "en"] as const) {
    const s = JSON.parse(kaynakOku(`messages/${dil}.json`)) as Record<string, Record<string, unknown>>;
    const y = s.Yonetim ?? {};
    const eksik = [...o.ODEME_YONTEMLERI.map((m) => `odemeYontemi${m}`), "donemAYLIK", "donemYILLIK"].filter((a) => !(a in y));
    kontrol(`${dil}: yöntem ve dönem anahtarları var`, eksik.length === 0, eksik);
    const ep = (s.EpostaAski ?? {}) as Record<string, { konu?: unknown; metin?: unknown }>;
    kontrol(`${dil}: ODEME_HATIRLATMA e-postası konu+metin var`, typeof ep.ODEME_HATIRLATMA?.konu === "string" && typeof ep.ODEME_HATIRLATMA?.metin === "string");
  }
  const tr = JSON.parse(kaynakOku("messages/tr.json")) as { EpostaAski: Record<string, { metin: string }> };
  kontrol("tr: hatırlatma metni tutarı ve vadeyi yazar ({tutar} · {tarih})", tr.EpostaAski.ODEME_HATIRLATMA!.metin.includes("{tutar}") && tr.EpostaAski.ODEME_HATIRLATMA!.metin.includes("{tarih}"));
  kosanBolumler.push("sozluk");

  /* ④ BAĞ + DESEN YASAĞI */
  console.log("\n④ bağ ve defter kuralı");
  const eylem = yorumsuz(kaynakOku("src/app/bezirga/(ic)/firmalar/actions.ts"));
  const blok = (ad: string) => {
    const i = eylem.indexOf(`export async function ${ad}(`);
    if (i < 0) return "";
    const j = eylem.indexOf("\nexport ", i + 10);
    return eylem.slice(i, j < 0 ? undefined : j);
  };
  for (const [ad, govde] of [["abonelikKaydetEylemi", "await aboneligiKaydet("], ["odemeKaydetEylemi", "await odemeKaydet("], ["odemeDuzeltEylemi", "await odemeyiDuzelt("], ["odemeHatirlatEylemi", 'yoneticilereBildir(firmaId, "ODEME_HATIRLATMA"']] as const) {
    const g = blok(ad);
    const kapi = g.indexOf("await yonetimEylemi()");
    const cagri = g.indexOf(govde);
    kontrol(`${ad}: yönetim kapısı ÖNCE, sonra ${govde.split("(")[0]}`, g.length > 0 && kapi >= 0 && cagri >= 0 && kapi < cagri, { var: g.length > 0, kapi, cagri });
  }
  const kart = yorumsuz(kaynakOku("src/app/bezirga/(ic)/firmalar/[id]/page.tsx"));
  kontrol("firma kartı ödemeleri firmaOdemeleri(kart.id) ile okur", kart.includes("await firmaOdemeleri(kart.id)"));
  kontrol("firma kartı durumu kartın vadesinden hesaplar", kart.includes("odemeDurumu(kart.abonelik.vade, bugun)"));
  const liste = yorumsuz(kaynakOku("src/app/bezirga/(ic)/firmalar/page.tsx"));
  kontrol("firmalar listesi rozeti firmanın vadesinden hesaplar", liste.includes("odemeDurumu(f.sonrakiOdemeGunu, bugun)"));

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
  const yasak = /\.firmaOdemesi\.(update|updateMany|upsert|delete|deleteMany)\(/;
  const ihlal = tumu.filter((y) => yasak.test(yorumsuz(kaynakOku(y))));
  kontrol("src'de ödeme kaydı GÜNCELLENMEZ/SİLİNMEZ (düzeltme = ters kayıt)", ihlal.length === 0, ihlal);
  const yazanlar = tumu.filter((y) => /\.firmaOdemesi\.create\(/.test(yorumsuz(kaynakOku(y))));
  kontrol("ödeme kaydı YALNIZ odeme-takibi gövdesinde yazılır", yazanlar.length === 1 && yazanlar[0] === "src/lib/odeme-takibi.ts", yazanlar);
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
