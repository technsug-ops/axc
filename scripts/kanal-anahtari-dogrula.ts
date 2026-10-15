import "dotenv/config";

import { kaynakOku } from "./kaynak-oku";

/**
 * ============================================================================
 *  KANAL ANAHTARI BEKÇİSİ — firma başına pazaryeri API anahtarı (K303, 06.10.2026)
 * ----------------------------------------------------------------------------
 *      npm run kanal-anahtari:dogrula
 *
 *  ① şifreleme (saf): şifrele→çöz aynı · her çağrı yeni iv · tek bayt bozuk
 *     paket / yanlış sır → «çözülemedi» · sır yok/bozuk → kod, düz metne düşmez
 *  ② kimlik kuralları (saf): biçimler istemcilerle BİREBİR · eksik/geçersiz
 *     alan hatası yalnız alan ADI taşır (değer sızmaz)
 *  ③ gövde (gerçek DB, iki geçici firma): kaydet→aç aynı kimlik · veritabanında
 *     düz anahtar YOK · A firması B'nin hesabına yazamaz/okuyamaz · alış hesabı
 *     anahtar alamaz · iz son 4 haneden başka şey taşımaz · kaldır
 *  ④ desen: düz anahtar hiçbir log/iz satırına yazılmaz · uygulama kapısı deneme
 *     ortamında kimlik vermez
 * ============================================================================
 */

console.log("\nKANAL ANAHTARI BEKÇİSİ\n");

const BOLUM_SAYISI = 6;
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
  const { randomBytes } = await import("node:crypto");
  const S = await import("../src/lib/kanal-anahtari/sifre");
  const K = await import("../src/lib/kanal-anahtari/kimlik");

  /* ① ŞİFRELEME */
  console.log("① şifreleme");
  const sir = randomBytes(32);
  const baska = randomBytes(32);
  const metin = '{"saticiId":"870249","key":"ANAHTAR-ornek-123","secret":"GIZLI-ornek-9876"}';
  const p1 = S.sifrele(metin, sir);
  const p2 = S.sifrele(metin, sir);
  const c1 = S.coz(p1, sir);
  kontrol("şifrele → çöz aynı metni verir", c1.durum === "TAMAM" && c1.duz === metin);
  kontrol("paket düz metni İÇERMEZ", !p1.includes("GIZLI-ornek") && !p1.includes("ANAHTAR-ornek"));
  kontrol("aynı metin iki kez AYNI paketi vermez (her çağrı yeni iv)", p1 !== p2);
  kontrol("paket biçimi v1:iv:etiket:veri", /^v1:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/.test(p1));
  kontrol("yanlış sırla ÇÖZÜLEMEZ (kod döner)", S.coz(p1, baska).durum === "COZULEMEDI");
  const parca = p1.split(":");
  const bozuk = [parca[0], parca[1], parca[2], Buffer.from(Buffer.from(parca[3]!, "base64").map((b, i) => (i === 0 ? b ^ 1 : b))).toString("base64")].join(":");
  kontrol("tek bit bozulmuş paket ÇÖZÜLEMEZ (GCM bütünlüğü)", S.coz(bozuk, sir).durum === "COZULEMEDI");
  kontrol("biçimsiz paket ÇÖZÜLEMEZ", S.coz("duz-metin", sir).durum === "COZULEMEDI" && S.coz("v2:a:b:c", sir).durum === "COZULEMEDI");
  /* ⚠ `sirOku(undefined)` VARSAYILAN olarak ortam değişkenini okur — ortamda sır tanımlıyken
     (deneme kurulumu, 14.10.2026) «sır yok» dalını SINAMAZ. Ölçüt açık boş girdiyle kurulur. */
  kontrol("sır yok → SIR_YOK (boş · yalnız boşluk)", S.sirOku("").durum === "SIR_YOK" && S.sirOku("   ").durum === "SIR_YOK");
  /* ⭐ 14.10.2026 (birleşmede eklendi): yukarıdaki not doğruydu — o yüzden `sirOku` artık
     VARSAYILAN almıyor (iki adımlı giriş kendi sırrı yokken pazaryeri sırrına düşüyordu).
     Bu ölçüt o gerilemeyi ORTAMDAN BAĞIMSIZ yakalar: sır ortamda TANIMLIYKEN `undefined`
     yine SIR_YOK olmalı. Ortam değeri sınamadan sonra eski hâline döner. */
  {
    const onceki = process.env[S.SIR_DEGISKENI];
    process.env[S.SIR_DEGISKENI] = randomBytes(32).toString("base64");
    try {
      kontrol("  ...verilmeyen sır ORTAMDAN okunmaz (ortamda geçerli sır VARKEN undefined → SIR_YOK)", S.sirOku(undefined).durum === "SIR_YOK");
    } finally {
      if (onceki === undefined) delete process.env[S.SIR_DEGISKENI];
      else process.env[S.SIR_DEGISKENI] = onceki;
    }
  }
  kontrol("sır 32 bayt değil → SIR_GECERSIZ", S.sirOku(randomBytes(16).toString("base64")).durum === "SIR_GECERSIZ" && S.sirOku("%%%").durum === "SIR_GECERSIZ");
  kontrol("geçerli sır okunur", S.sirOku(sir.toString("base64")).durum === "TAMAM");
  kontrol("son 4 hane", S.sonDort("abcdefgh1234") === "1234" && S.sonDort("kisa") === "****");
  kosanBolumler.push("sifre");

  /* ② KİMLİK KURALLARI */
  console.log("\n② kimlik kuralları");
  const ty = K.kimlikKur("TRENDYOL", { saticiId: " 870249 ", key: "k1", secret: "s1" });
  kontrol("TY → { saticiId, key, secret } (istemcinin Kimlik biçimi)", ty.durum === "TAMAM" && JSON.stringify(Object.keys(ty.kimlik.kimlik)) === JSON.stringify(["saticiId", "key", "secret"]) && (ty.kimlik.kimlik as { saticiId: string }).saticiId === "870249");
  const hb = K.kimlikKur("HEPSIBURADA", { merchantId: "m-1", key: "k", developer: "dev ad", ortam: "test" });
  kontrol("HB → { merchantId, key, ortam, developer } · ortam büyük harf", hb.durum === "TAMAM" && JSON.stringify(Object.keys(hb.kimlik.kimlik).sort()) === JSON.stringify(["developer", "key", "merchantId", "ortam"]) && (hb.kimlik.kimlik as { ortam: string }).ortam === "TEST");
  const n11 = K.kimlikKur("N11", { appKey: "a", appSecret: "b" });
  kontrol("N11 → { appKey, appSecret }", n11.durum === "TAMAM" && JSON.stringify(Object.keys(n11.kimlik.kimlik)) === JSON.stringify(["appKey", "appSecret"]));
  const eksik = K.kimlikKur("TRENDYOL", { saticiId: "1", key: "", secret: "COK-GIZLI-DEGER" });
  kontrol("eksik alan → ALAN_EKSIK, yalnız alan ADI (değer sızmaz)", eksik.durum === "HATA" && eksik.hata === "ALAN_EKSIK" && JSON.stringify(eksik).indexOf("COK-GIZLI-DEGER") === -1 && JSON.stringify(eksik).includes("key"));
  const gecersiz = K.kimlikKur("TRENDYOL", { saticiId: "abc", key: "k k", secret: "s" });
  kontrol("TY satıcı ID rakam değil / anahtarda boşluk → ALAN_GECERSIZ", gecersiz.durum === "HATA" && gecersiz.hata === "ALAN_GECERSIZ" && "alanlar" in gecersiz && gecersiz.alanlar.includes("saticiId") && gecersiz.alanlar.includes("key"));
  kontrol("HB ortam yalnız CANLI/TEST", K.kimlikKur("HEPSIBURADA", { merchantId: "m", key: "k", developer: "d", ortam: "PROD" }).durum === "HATA");
  kontrol("desteklenmeyen kanal reddedilir", K.kimlikKur("AMAZON", {}).durum === "HATA");
  kontrol("bozuk JSON kimlik vermez", K.kimligiAc("TRENDYOL", "{bozuk") === null && K.kimligiAc("TRENDYOL", '{"saticiId":"x"}') === null);
  const istemciler = [["scripts/ty/istemci.ts", "export type Kimlik = { saticiId: string; key: string; secret: string };"], ["scripts/n11/istemci.ts", "export type Kimlik = { appKey: string; appSecret: string };"]] as const;
  for (const [d, desen] of istemciler) kontrol(`${d}: istemci Kimlik biçimi kimlik modülüyle aynı`, kaynakOku(d).includes(desen));
  const hbIstemci = kaynakOku("scripts/hb/istemci.ts").replace(/\r/g, "");
  kontrol("scripts/hb/istemci.ts: Kimlik { merchantId, key, ortam, developer }", /export type Kimlik = \{\s*merchantId: string;\s*key: string;\s*ortam: string;\s*developer: string;\s*\};/.test(hbIstemci));
  kosanBolumler.push("kimlik");

  /* ③ GÖVDE — gerçek DB, iki geçici firma */
  console.log("\n③ gövde (gerçek veritabanı, iki geçici firma)");
  process.env.PAZARYERI_ANAHTAR_SIRRI = sir.toString("base64");
  const { sistemPrisma } = await import("../src/lib/prisma");
  const { firmaBaglamindaCalistir } = await import("../src/lib/firma-baglami");
  const D = await import("../src/lib/kanal-anahtari/depo");
  const ek = Date.now().toString(36).toUpperCase().slice(-5);
  // SISTEM: geçici paket (sınırsız) + iki firma — sonunda silinir.
  const P = await sistemPrisma.paket.create({ data: { ad: `ZZKAP${ek}` }, select: { id: true } });
  // SISTEM: geçici firma A.
  const A = await sistemPrisma.company.create({ data: { name: `ZZKAA${ek}`, code: `ZKA${ek}`, paketId: P.id }, select: { id: true } });
  // SISTEM: geçici firma B.
  const B = await sistemPrisma.company.create({ data: { name: `ZZKAB${ek}`, code: `ZKB${ek}`, paketId: P.id }, select: { id: true } });
  // SISTEM: TY kanalı (salt okuma).
  const tyKanal = await sistemPrisma.channel.findFirst({ where: { code: "TRENDYOL" }, select: { id: true } });
  // SISTEM: yazan — firmasız süper admin (salt okuma).
  const yazan = await sistemPrisma.user.findFirst({ where: { isSuperAdmin: true, hesapFirmasiId: null }, select: { id: true } });
  try {
    kontrol("taban: TY kanalı ve yazan var", Boolean(tyKanal && yazan));
    const hesapAc = (firma: string, kod: string, satis: boolean) =>
      // SISTEM: geçici hesap (firmaya açıkça bağlı).
      sistemPrisma.channelAccount.create({ data: { companyId: firma, channelId: tyKanal!.id, code: `${kod}${ek}`, name: kod, defaultCurrency: "TRY", satisIcin: satis, alisIcin: !satis }, select: { id: true } });
    const aSatis = await hesapAc(A.id, "AS", true);
    const aAlis = await hesapAc(A.id, "AA", false);
    const bSatis = await hesapAc(B.id, "BS", true);
    const ham = { saticiId: "870249", key: "ANAHTAR-gercekmis-gibi-1", secret: "GIZLI-gercekmis-gibi-9876" };

    const kayit = await firmaBaglamindaCalistir(A.id, () => D.anahtarKaydet(aSatis.id, ham, yazan!.id));
    kontrol("A kendi satış hesabına anahtar kaydeder (son 4: 9876)", kayit.durum === "TAMAM" && kayit.sonDort === "9876", kayit);
    // SISTEM: ham kayıt (salt okuma) — düz anahtar veritabanında var mı?
    const satir = await sistemPrisma.kanalAnahtari.findUnique({ where: { channelAccountId: aSatis.id }, select: { sifreli: true, sonDort: true, companyId: true } });
    kontrol("veritabanında DÜZ anahtar YOK (yalnız şifreli paket)", Boolean(satir) && !satir!.sifreli.includes("GIZLI") && !satir!.sifreli.includes("ANAHTAR") && satir!.sifreli.startsWith("v1:"));
    kontrol("kayıt A firmasına bağlı", satir?.companyId === A.id);
    const ac = await firmaBaglamindaCalistir(A.id, () => D.kayitliKimligiAc(aSatis.id));
    kontrol("A açar → aynı kimlik", ac.durum === "TAMAM" && JSON.stringify(ac.kimlik.kimlik) === JSON.stringify(ham), ac.durum);

    const bOkur = await firmaBaglamindaCalistir(B.id, () => D.kayitliKimligiAc(aSatis.id));
    kontrol("B, A'nın anahtarını OKUYAMAZ (firma süzgeci → ANAHTAR_YOK)", bOkur.durum === "ANAHTAR_YOK", bOkur.durum);
    const bYazar = await firmaBaglamindaCalistir(B.id, () => D.anahtarKaydet(aSatis.id, ham, yazan!.id));
    kontrol("B, A'nın hesabına YAZAMAZ (HESAP_YOK)", bYazar.durum === "HATA" && bYazar.hata === "HESAP_YOK", bYazar);
    const bDurum = await firmaBaglamindaCalistir(B.id, () => D.anahtarDurumlari());
    kontrol("B'nin durum listesinde A'nın anahtarı GÖRÜNMEZ", !bDurum.has(aSatis.id));
    // VERİTABANI KAPISI: süzgeci BİLEREK atlayan ham yazım (sistemPrisma) — A adına B'nin hesabı.
    let tetikleyiciReddi = "";
    try {
      // SISTEM: bilerek süzgeçsiz — yalnız tetikleyiciyi sınar; başarırsa temizlikte silinir.
      await sistemPrisma.kanalAnahtari.create({ data: { companyId: A.id, channelAccountId: bSatis.id, sifreli: "v1:x:y:z", sonDort: "0000" } });
    } catch (e) {
      tetikleyiciReddi = String((e as Error)?.message ?? e);
    }
    kontrol("veritabanı tetikleyicisi A adına B'nin hesabına anahtarı REDDEDER (süzgeç atlansa bile)", tetikleyiciReddi.includes("FIRMA_BAG_IHLALI: KanalAnahtari.channelAccountId -> ChannelAccount"), tetikleyiciReddi.slice(0, 160));
    const alis = await firmaBaglamindaCalistir(A.id, () => D.anahtarKaydet(aAlis.id, ham, yazan!.id));
    kontrol("alış hesabı anahtar ALAMAZ", alis.durum === "HATA" && alis.hata === "SATIS_HESABI_DEGIL", alis);
    const bKendi = await firmaBaglamindaCalistir(B.id, () => D.anahtarKaydet(bSatis.id, { ...ham, secret: "B-firmasinin-sirri-5555" }, yazan!.id));
    const bAc = await firmaBaglamindaCalistir(B.id, () => D.kayitliKimligiAc(bSatis.id));
    kontrol("B kendi anahtarını yazar ve açar (A'nınkinden ayrı)", bKendi.durum === "TAMAM" && bAc.durum === "TAMAM" && (bAc.kimlik.kimlik as { secret: string }).secret === "B-firmasinin-sirri-5555");

    /* ⭐ K337 3. adım — ZAMANLANMIŞ İŞİN YÖNLENDİRMESİ, GERÇEK VERİTABANINDA. Okuyucu olarak
       `kayitliKimligiAc` verilir (deneme ortamında `kimligiOku` bilerek kimlik VERMEZ). */
    const H = await import("../src/lib/kanal-anahtari/hesaplar");
    const goren = (dizi: string[]) => async (h: { id: string }, k: { secret: string }) => { dizi.push(`${h.id}:${k.secret}`); return { atlandi: false }; };
    const aGoren: string[] = [];
    const aDongu = await firmaBaglamindaCalistir(A.id, async () => H.hesaplarlaKos("TRENDYOL", await H.satisHesaplari("TRENDYOL"), D.kayitliKimligiAc, goren(aGoren)));
    kontrol("A'nın döngüsü YALNIZ A'nın satış hesabını, A'NIN anahtarıyla koşar (alış hesabı ve B görünmez)",
      aGoren.length === 1 && aGoren[0] === `${aSatis.id}:${ham.secret}` && aDongu.length === 1, { aGoren, aDongu });
    const bGoren: string[] = [];
    await firmaBaglamindaCalistir(B.id, async () => H.hesaplarlaKos("TRENDYOL", await H.satisHesaplari("TRENDYOL"), D.kayitliKimligiAc, goren(bGoren)));
    kontrol("B'nin döngüsü YALNIZ B'nin hesabını, B'NİN anahtarıyla koşar", bGoren.length === 1 && bGoren[0] === `${bSatis.id}:B-firmasinin-sirri-5555`, bGoren);
    const tekA = await firmaBaglamindaCalistir(A.id, () => H.tekSatisHesabi("TRENDYOL"));
    kontrol("ekran eylemi: tek satış hesabı → o hesap", tekA.tamam && tekA.hesap.id === aSatis.id, tekA);
    const aSatis2 = await hesapAc(A.id, "AS2", true);
    const aGoren2: string[] = [];
    const aDongu2 = await firmaBaglamindaCalistir(A.id, async () => H.hesaplarlaKos("TRENDYOL", await H.satisHesaplari("TRENDYOL"), D.kayitliKimligiAc, goren(aGoren2)));
    kontrol("  ...anahtarı olmayan ikinci hesap ATLANIR (ANAHTAR_YOK), ortama düşmez; ilki yine kendi anahtarıyla koşar",
      aGoren2.length === 1 && aDongu2.some((x) => x.durum === "ATLANDI" && x.sebep === "ANAHTAR_YOK") && aDongu2.some((x) => x.durum === "KOSTU"), aDongu2);
    const tekA2 = await firmaBaglamindaCalistir(A.id, () => H.tekSatisHesabi("TRENDYOL"));
    kontrol("  ...iki aktif satış hesabında ekran eylemi DURUR (HESAP_BELIRSIZ — «ilkini seç» yok)", !tekA2.tamam && tekA2.kod === "HESAP_BELIRSIZ", tekA2);
    void aSatis2;

    const yanlisSir = randomBytes(32).toString("base64");
    process.env.PAZARYERI_ANAHTAR_SIRRI = yanlisSir;
    const yanlis = await firmaBaglamindaCalistir(A.id, () => D.kayitliKimligiAc(aSatis.id));
    kontrol("ana sır değişirse ÇÖZÜLEMEZ (düz metne düşmez)", yanlis.durum === "COZULEMEDI", yanlis.durum);
    delete process.env.PAZARYERI_ANAHTAR_SIRRI;
    const sirsiz = await firmaBaglamindaCalistir(A.id, () => D.anahtarKaydet(aSatis.id, ham, yazan!.id));
    kontrol("ana sır yokken KAYDEDİLMEZ (SIR_YOK)", sirsiz.durum === "HATA" && sirsiz.hata === "SIR_YOK", sirsiz);
    process.env.PAZARYERI_ANAHTAR_SIRRI = sir.toString("base64");

    // SISTEM: iz kayıtları (salt okuma) — anahtar içermemeli.
    const izler = await sistemPrisma.auditLog.findMany({ where: { targetId: { in: [aSatis.id, bSatis.id] } }, select: { action: true, detail: true, companyId: true } });
    kontrol(`iz yazıldı (${izler.length} ≥ 2) ve firmasına bağlı`, izler.length >= 2 && izler.every((i) => i.companyId === A.id || i.companyId === B.id));
    kontrol("hiçbir iz anahtar ya da secret İÇERMEZ (yalnız son 4)", izler.every((i) => !(i.detail ?? "").includes("GIZLI") && !(i.detail ?? "").includes("ANAHTAR-") && !(i.detail ?? "").includes("sirri")));
    const kaldir = await firmaBaglamindaCalistir(A.id, () => D.anahtarKaldir(aSatis.id, yazan!.id));
    const sonra = await firmaBaglamindaCalistir(A.id, () => D.kayitliKimligiAc(aSatis.id));
    kontrol("kaldırılan anahtar artık açılmaz (ANAHTAR_YOK)", kaldir.durum === "TAMAM" && sonra.durum === "ANAHTAR_YOK");
  } finally {
    // SISTEM: temizlik — anahtarlar, izler, hesaplar, firmalar, paket.
    const hesaplar = (await sistemPrisma.channelAccount.findMany({ where: { companyId: { in: [A.id, B.id] } }, select: { id: true } })).map((h) => h.id);
    // SISTEM: temizlik.
    await sistemPrisma.kanalAnahtari.deleteMany({ where: { companyId: { in: [A.id, B.id] } } });
    // SISTEM: temizlik.
    await sistemPrisma.auditLog.deleteMany({ where: { OR: [{ targetId: { in: hesaplar } }, { companyId: { in: [A.id, B.id] } }] } });
    // SISTEM: temizlik.
    await sistemPrisma.channelAccount.deleteMany({ where: { id: { in: hesaplar } } });
    // SISTEM: temizlik.
    await sistemPrisma.company.deleteMany({ where: { id: { in: [A.id, B.id] } } });
    // SISTEM: temizlik.
    await sistemPrisma.paket.delete({ where: { id: P.id } });
    // SISTEM: ölçüm.
    kontrol("geçici firmalar, hesaplar ve anahtarlar silindi", (await sistemPrisma.company.count({ where: { id: { in: [A.id, B.id] } } })) === 0 && (await sistemPrisma.kanalAnahtari.count({ where: { companyId: { in: [A.id, B.id] } } })) === 0);
  }
  kosanBolumler.push("govde");

  /* ④ DESEN */
  console.log("\n④ desen");
  const depo = yorumsuz(kaynakOku("src/lib/kanal-anahtari/depo.ts"));
  const kapi = depo.slice(depo.indexOf("export async function kimligiOku("));
  kontrol("uygulama kapısı ÖNCE deneme ortamını sorar (dış çağrı yok)", /^export async function kimligiOku\([^)]*\)[^{]*\{\s*if \(denemeOrtamiMi\(\)\) return \{ durum: "DENEME_ORTAMI" \};/.test(kapi));
  kontrol("depo FİRMA SÜZGEÇLİ prisma kullanır (sistemPrisma YOK)", !/sistemPrisma/.test(depo) && /import \{ prisma \} from "@\/lib\/prisma";/.test(depo));
  const modul = ["src/lib/kanal-anahtari/depo.ts", "src/lib/kanal-anahtari/sifre.ts", "src/lib/kanal-anahtari/kimlik.ts"].map((d) => yorumsuz(kaynakOku(d))).join("\n");
  kontrol("modülde console.* YOK (anahtar log'a düşemez)", !/console\.(log|error|warn|info)\(/.test(modul));
  const izDetay = [...depo.matchAll(/detail: JSON\.stringify\(\{([^}]*)\}\)/g)].map((m) => m[1]!);
  kontrol(`iz detayları yalnız tanıma alanı taşır (${izDetay.length} iz)`, izDetay.length >= 2 && izDetay.every((d) => !/kimlik|ham|duz|paket|secret|key\b/.test(d)), izDetay);
  kosanBolumler.push("desen");

  /* ═══ ⑤ EKRAN — «API bağlantısı» (K303 2. adım, 14.10.2026) ═══ */
  console.log("\n⑤ ekran");
  const sayfa = yorumsuz(kaynakOku("src/app/ayarlar/kanallar/page.tsx"));
  kontrol("kart yalnız `kanal.anahtar` izniyle çizilir", /const anahtarYetkisi = baglam\.izinler\.has\("kanal\.anahtar"\);/.test(sayfa) && /\{anahtarYetkisi \? \(/.test(sayfa));
  kontrol("  ...yalnız AKTİF SATIŞ hesabı + desteklenen kanal", /hesaplar\.filter\(\(h\) => h\.satisIcin && h\.isActive && desteklenenKanalMi\(h\.channel\.code\)\)/.test(sayfa));
  const eylem = yorumsuz(kaynakOku("src/app/ayarlar/kanallar/anahtar-actions.ts"));
  const kaydetGovde = eylem.slice(eylem.indexOf("export async function kanalAnahtariKaydet("), eylem.indexOf("export async function kanalAnahtariKaldir("));
  const kaldirGovde = eylem.slice(eylem.indexOf("export async function kanalAnahtariKaldir("));
  kontrol("kaydet: İLK iş izin kapısı", /^export async function kanalAnahtariKaydet\([^)]*\)[^{]*\{\s*const baglam = await yetkiIste\("kanal\.anahtar"\);/.test(kaydetGovde));
  kontrol("kaldır: İLK iş izin kapısı", /^export async function kanalAnahtariKaldir\([^)]*\)[^{]*\{\s*const baglam = await yetkiIste\("kanal\.anahtar"\);/.test(kaldirGovde));
  kontrol("formdan YALNIZ o kanalın alanları okunur", /for \(const a of KIMLIK_ALANLARI\[kanal\]\) ham\[a\.ad\] = String\(form\.get\(a\.ad\) \?\? ""\);/.test(kaydetGovde));
  /* Dönüş SATIRIN SONUNA kadar okunur — iç içe süslü parantez (`{ son: … }`) ilk `}`te kesseydi
     ardından eklenen bir sızıntıyı göremezdi (mutasyonla bulundu). */
  const donusler = [...eylem.matchAll(/return (\{[^\n]*\});/g)].map((m) => m[1]!);
  kontrol(`eylem dönüşü anahtarı TAŞIMAZ (${donusler.length} dönüş)`, donusler.length >= 6 && donusler.every((d) => !/\bham\b|form\.get|kimlik/.test(d)), donusler);
  kontrol("  ...beklenmeyen hata yutulmaz, TAM loglanır", (eylem.match(/catch \(e\) \{\s*console\.error\("\[kanal-anahtari\] (kaydetme|kaldırma) düştü:", e\);/g) ?? []).length === 2);
  const form = yorumsuz(kaynakOku("src/app/ayarlar/kanallar/api-baglantisi.tsx"));
  kontrol("gizli alan parola kutusu, tarayıcı hatırlamaz", /type=\{a\.gizli \? "password" : "text"\}/.test(form) && /autoComplete=\{a\.gizli \? "new-password" : "off"\}/.test(form));
  kontrol("  ...form alanlarına kayıtlı değer YAZILMAZ (defaultValue yok, ortam hariç)", !/defaultValue=\{(?!.*CANLI)/.test(form) && (form.match(/defaultValue=/g) ?? []).length === 1);
  kontrol("  ...ekranda YALNIZ son işlemin sonucu (iki eylem de aynı duruma yazar)", (form.match(/const s = await kanalAnahtari(Kaydet|Kaldir)\(onceki, form\);\s*setSon\(s\);/g) ?? []).length === 2 && /const mesaj = son\.basari;\s*const hata = son\.hata;/.test(form));
  kontrol("  ...kaldır ONAY diyaloğundan geçer (İlke #6)", /<AlertDialogTrigger asChild>[\s\S]{0,400}t\("kaldir"\)[\s\S]{0,1200}<form action=\{kaldirAction\}>/.test(form));
  const tr = (JSON.parse(kaynakOku("messages/tr.json")) as Record<string, Record<string, string>>).KanalAnahtari ?? {};
  const alanAdlari = [...new Set(Object.values(K.KIMLIK_ALANLARI).flat().map((a) => a.ad))];
  const alanEksik = alanAdlari.filter((a) => !tr[`alan_${a}`]?.trim());
  kontrol(`her kimlik alanının adı sözlükte (${alanAdlari.length} alan)`, alanAdlari.length >= 8 && alanEksik.length === 0, alanEksik);
  const hataKodlari = ["HESAP_YOK", "SATIS_HESABI_DEGIL", "KANAL_DESTEKLENMIYOR", "ALAN_EKSIK", "ALAN_GECERSIZ", "SIR_YOK", "SIR_GECERSIZ", "ANAHTAR_YOK", "BEKLENMEDIK"];
  const hataEksik = hataKodlari.filter((h) => !tr[`hata_${h}`]?.trim());
  kontrol("her hata kodunun cümlesi sözlükte", hataEksik.length === 0, hataEksik);
  const seed = yorumsuz(kaynakOku("prisma/seed-yetki.ts"));
  kontrol("izin sonradan doğanlarda (tam yetkili rol kendiliğinden alır)", /const SONRADAN_DOGAN: string\[\] = \[[\s\S]*?"kanal\.anahtar",[\s\S]*?\];/.test(seed));
  const senkron = yorumsuz(kaynakOku("scripts/yetki-senkron.ts"));
  kontrol("izin senkronu BÜTÜN firmalarda döner", /for \(const firma of firmalar\) \{[\s\S]{0,200}await yetkiSeed\(fp, firma\);/.test(senkron));
  kontrol("  ...sabit firma YALNIZ hiç firma yokken oluşturulur", /if \(firmalar\.length === 0\) firmalar = \[await firmaSeed\(prisma\)\];/.test(senkron) && (senkron.match(/firmaSeed\(/g) ?? []).length === 1);
  kontrol("  ...canlı senkron ortak gövdeyi çağırır", /await butunFirmalardaYetki\(prisma, betikAdresi\(y\.veri\.ham\)\);/.test(yorumsuz(kaynakOku("scripts/canli-yetki-seed.ts"))) && !/firmaSeed\(/.test(yorumsuz(kaynakOku("scripts/canli-yetki-seed.ts"))));
  kosanBolumler.push("ekran");

  /* ═══ ⑥ HESABIN KENDİ ANAHTARI — K337 3. adım (15.10.2026) ═══ */
  console.log("\n⑥ hesabın kendi anahtarı (çekim · gönderim)");
  {
    const H = await import("../src/lib/kanal-anahtari/hesaplar");
    const kA = { saticiId: "1", key: "kA", secret: "sA" };
    const kB = { saticiId: "2", key: "kB", secret: "sB" };
    const okuyucu = async (id: string) =>
      id === "a" ? { durum: "TAMAM" as const, kimlik: { kanal: "TRENDYOL" as const, kimlik: kA } }
      : id === "b" ? { durum: "TAMAM" as const, kimlik: { kanal: "TRENDYOL" as const, kimlik: kB } }
      : id === "hb" ? { durum: "TAMAM" as const, kimlik: { kanal: "HEPSIBURADA" as const, kimlik: { merchantId: "m", key: "k", ortam: "CANLI", developer: "d" } } }
      : { durum: "ANAHTAR_YOK" as const };
    const hesap = (id: string) => ({ id, name: id.toUpperCase(), externalId: null, apiHesapKimligi: null });
    const giden: string[] = [];
    const s1 = await H.hesaplarlaKos("TRENDYOL", [hesap("a"), hesap("yok"), hesap("b"), hesap("hb"), hesap("patlar")],
      async (id) => (id === "patlar" ? { durum: "TAMAM" as const, kimlik: { kanal: "TRENDYOL" as const, kimlik: kA } } : okuyucu(id)),
      async (h, k) => { if (h.id === "patlar") throw new Error("kanal 500"); giden.push(`${h.id}=${k.key}`); return { atlandi: false }; });
    kontrol("her hesap KENDİ anahtarıyla çağrılır (a→kA · b→kB; çapraz yok)", JSON.stringify(giden) === JSON.stringify(["a=kA", "b=kB"]), giden);
    kontrol("  ...anahtarı olmayan hesap ATLANDI · ANAHTAR_YOK (iş ÇAĞRILMAZ)", s1[1]?.durum === "ATLANDI" && s1[1].sebep === "ANAHTAR_YOK");
    kontrol("  ...başka kanalın anahtarı bu kanalda KULLANILMAZ (iş çağrılmaz)", s1[3]?.durum === "ATLANDI" && s1[3].sebep === "KANAL_DESTEKLENMIYOR" && !giden.some((g) => g.startsWith("hb=")));
    kontrol("  ...bir hesabın hatası ötekini durdurmaz, hesap adıyla yazılır", s1[4]?.durum === "HATA" && s1[4].hesap === "PATLAR" && s1[2]?.durum === "KOSTU");
    const atla = (sebep: string) => ({ hesap: "x", durum: "ATLANDI" as const, sebep: sebep as never });
    kontrol("durum: anahtarı OLMAYAN hesap ve deneme ortamı kırmızı YAPMAZ", !H.hesapSonuclariKirmiziMi([atla("ANAHTAR_YOK"), atla("DENEME_ORTAMI")], () => false));
    kontrol("  ...anahtar VAR ama açılamıyorsa (sır yok/bozuk) KIRMIZI", H.hesapSonuclariKirmiziMi([atla("SIR_YOK")], () => false) && H.hesapSonuclariKirmiziMi([atla("COZULEMEDI")], () => false));
    kontrol("  ...hesap HATA ya da işin kendi «atlandı»sı KIRMIZI",
      H.hesapSonuclariKirmiziMi([{ hesap: "x", durum: "HATA", hata: "e" }], () => false) && H.hesapSonuclariKirmiziMi([{ hesap: "x", durum: "KOSTU", sonuc: 1 }], () => true));
    kontrol("  ...boş hesap listesi (firma o kanalı bağlamamış) kırmızı YAPMAZ", !H.hesapSonuclariKirmiziMi([], () => true));
  }
  {
    /* DESEN YASAĞI — ortam anahtarına geri dönüş yolu YOK (kullanıcı kararı 15.10 «tek kaynak»). */
    const { readdirSync, statSync } = await import("node:fs");
    const { join } = await import("node:path");
    const tara = (kok: string): string[] => readdirSync(kok).flatMap((a) => { const y = join(kok, a).replace(/\\/g, "/"); return statSync(y).isDirectory() ? tara(y) : /\.tsx?$/.test(y) ? [y] : []; });
    const src = tara("src").filter((y) => !y.startsWith("src/generated"));
    kontrol(`taban: src taraması dolu (${src.length} ≥ 300)`, src.length >= 300);
    const ortamOkuyan = src.filter((y) => /from\s+["'][^"']*scripts\/(?:ty|hb|n11)\/istemci["']/.test(yorumsuz(kaynakOku(y))) && /\bkimlikOku\b|\bkimlikEksikleri\b/.test(yorumsuz(kaynakOku(y))));
    kontrol("src/ altında ortam anahtar okuyucusu (kimlikOku) İÇERİ ALINMAZ", ortamOkuyan.length === 0, ortamOkuyan);
    const ortamYazan = src.filter((y) => /anahtar:\s*"ORTAM"/.test(yorumsuz(kaynakOku(y))));
    kontrol("src/ altında «ORTAM» anahtar kaynağı YAZILMAZ (yalnız komut satırı betikleri)", ortamYazan.length === 0, ortamYazan);
    /* Küme TÜRETİLİR: pazaryeri gövdesini (scripts/canli-{ty,hb,n11,kanal}-…) içeri alan her uç — sıcak tutma ve özet gibi pazaryerine gitmeyen uçlar kendiliğinden dışarıda. */
    const kanalUclari = tara("src/app/api/cron").filter((y) => /route\.ts$/.test(y) && /from\s+"(?:\.\.\/)+scripts\/canli-(?:ty|hb|n11|kanal)-[\w-]+"/.test(yorumsuz(kaynakOku(y))));
    kontrol(`taban: kanal uçları (${kanalUclari.length} ≥ 6)`, kanalUclari.length >= 6);
    for (const u of kanalUclari) {
      const k = yorumsuz(kaynakOku(u));
      const cagrilar = [...k.matchAll(/\b(\w+Kos(?:Guvenli)?)\(\{/g)].map((m) => m[1]!);
      const hesapli = [...k.matchAll(/kanalHesaplariylaKos\("(?:TRENDYOL|HEPSIBURADA|N11)", (?:async )?\(_hesap, kimlik\) =>[\s\S]*?anahtar: \{ kimlik \}/g)].length;
      kontrol(`  ${u.replace("src/app/api/cron/", "")}: her kanal gövdesi hesabın KENDİ anahtarıyla (${cagrilar.length} çağrı · ${hesapli} hesaplı)`,
        cagrilar.length > 0 && cagrilar.length === (k.match(/anahtar: \{ kimlik \}/g) ?? []).length && hesapli >= 1, cagrilar);
    }
    const kart = yorumsuz(kaynakOku("src/app/kart/[variantId]/actions.ts"));
    const kartOkuma = (kart.match(/await hesabinKimligi\("(?:TRENDYOL|HEPSIBURADA|N11)", (?:b\.hesapId|th\.hesap\.id)\)/g) ?? []).length;
    kontrol(`kart düğmeleri anahtarı HESAPTAN okur (${kartOkuma} okuma ≥ 5: TY gönder · TY sonuç · N11 · HB önizle · HB gönder)`, kartOkuma >= 5);
    kontrol("  ...kart bağlamları hesabı TEK-HESAP kuralıyla bulur (üç kanal)", (kart.match(/const t = await tekSatisHesabi\("(?:TRENDYOL|N11|HEPSIBURADA)"\);/g) ?? []).length === 3);
  }
  {
    /* «BAĞLANTIYI DENE» — K337 3. adım ② (15.10.2026). */
    const Y = await import("../src/lib/kanal-anahtari/dene");
    const tablo: [string, string][] = [["VERI", "BAGLANDI"], ["BOS", "BAGLANDI"], ["YETKISIZ", "REDDEDILDI"], ["ISTEK_HATALI", "ISTEK_HATALI"], ["BULUNAMADI", "ULASILAMADI"], ["ULASILAMADI", "ULASILAMADI"], ["TANIMSIZ", "ULASILAMADI"]];
    const yanlis = tablo.filter(([g, b]) => Y.okumayiYorumla(g) !== b);
    kontrol("deneme yorumu: kabul → bağlandı · 401/403 → reddedildi · 400 → istek hatalı · gerisi ulaşılamadı (hüküm yok)", yanlis.length === 0, yanlis);
    const eylem = yorumsuz(kaynakOku("src/app/ayarlar/kanallar/anahtar-actions.ts"));
    const dene = eylem.slice(eylem.indexOf("export async function kanalAnahtariDene("));
    kontrol("dene eylemi kanal.anahtar izni ister", /^export async function kanalAnahtariDene\([^)]*\)[^{]*\{\s*const baglam = await yetkiIste\("kanal\.anahtar"\);/.test(dene));
    kontrol("  ...anahtarı UYGULAMA kapısından okur (deneme ortamında pazaryerine GİDİLMEZ)",
      /const o = await kimligiOku\(hesapId\);\s*if \(o\.durum === "DENEME_ORTAMI" \|\| o\.durum === "COZULEMEDI"\) return \{ hata: t\(`dene_\$\{o\.durum\}`\) \};\s*if \(o\.durum !== "TAMAM"\) return/.test(dene) && !/kayitliKimligiAc/.test(eylem));
    kontrol("  ...pazaryeri çağrısı kapılardan SONRA, sonuç depoya yazılır",
      /if \(o\.durum !== "TAMAM"\) return \{ hata: t\(`hata_\$\{o\.durum\}`\) \};\s*const sonuc = await baglantiyiDene\(o\.kimlik\);\s*await denemeSonucuYaz\(hesapId, sonuc, baglam\.kullaniciId\);/.test(dene));
    const denemeDosyasi = yorumsuz(kaynakOku("src/lib/kanal-anahtari/dene.ts"));
    kontrol("  ...deneme gövdesi veritabanına DOKUNMAZ (prisma yok) ve yalnız okuma uçlarını çağırır",
      !/prisma/.test(denemeDosyasi) && /TY\.onayliUrunler\(/.test(denemeDosyasi) && /HB\.listingler\(/.test(denemeDosyasi) && /N11\.paketler\(/.test(denemeDosyasi));
    const depo2 = yorumsuz(kaynakOku("src/lib/kanal-anahtari/depo.ts"));
    kontrol("  ...kayda yalnız KOD yazılır (ham pazaryeri metni değil)", /data: \{ sonDenemeAt: new Date\(\), sonDenemeBasarili: basarili, sonHata: basarili \? null : sonuc \}/.test(depo2));
    const trK = (JSON.parse(kaynakOku("messages/tr.json")) as Record<string, Record<string, string>>).KanalAnahtari ?? {};
    const sonuclar = ["BAGLANDI", "REDDEDILDI", "ISTEK_HATALI", "ULASILAMADI"];
    const eksikMetin = [...sonuclar.flatMap((x) => [`dene_${x}`, `deneKisa_${x}`]), "dene_DENEME_ORTAMI", "dene_COZULEMEDI", "baglantiyiDene", "sonDeneme", "hicDenenmedi"].filter((a) => !trK[a]?.trim());
    kontrol("  ...her deneme sonucunun cümlesi ve kısa adı sözlükte", eksikMetin.length === 0, eksikMetin);
    const ekranB = yorumsuz(kaynakOku("src/app/ayarlar/kanallar/api-baglantisi.tsx"));
    kontrol("  ...düğme YALNIZ bağlı hesapta, sonuç «son işlem» durumuna yazılır",
      /\{hesap\.bagli \? \(\s*<form action=\{deneAction\}>/.test(ekranB) && /const s = await kanalAnahtariDene\(onceki, form\);\s*setSon\(s\);/.test(ekranB));
  }
  {
    /* ANAHTAR TAŞIMA PLANI — K337 3. adım ③ (15.10.2026; geçiş günü BİR KEZ). */
    const T = await import("../src/lib/kanal-anahtari/tasima");
    const ty = { saticiId: "870249", key: "TYKEY-gercek", secret: "TYSECRET-abcd" };
    const hb = { merchantId: "11111111-2222-3333-4444-555555555555", key: "HBKEY-wxyz", ortam: "CANLI", developer: "dev" };
    const n11 = { appKey: "N11APP", appSecret: "N11SECRET-9999" };
    const ortam = { TRENDYOL: ty, HEPSIBURADA: hb, N11: n11 };
    type M = Parameters<typeof T.tasimaPlani>[1][number]["mevcut"];
    const yok: M = { tur: "YOK" };
    const h = (id: string, kanal: "TRENDYOL" | "HEPSIBURADA" | "N11", ext: string | null, api: string | null, mevcut: M = yok) => ({ id, name: id, kanal, externalId: ext, apiHesapKimligi: api, mevcut });
    const temel = [h("ty", "TRENDYOL", "870249", null), h("ty-baska", "TRENDYOL", "999", null), h("hb", "HEPSIBURADA", "7000222505", hb.merchantId), h("n11", "N11", "n", null)];
    const p1 = T.tasimaPlani(ortam, temel, { uzerine: false });
    const d = (p: typeof p1) => p.map((k) => `${k.kanal}:${k.durum}:${k.hesap?.id ?? "-"}`).join(" ");
    kontrol("taşıma: hesap KİMLİKLE bulunur (TY satıcı no · HB Mağaza ID · N11 tek hesap), boş hesaba YAZILACAK",
      d(p1) === "TRENDYOL:YAZILACAK:ty HEPSIBURADA:YAZILACAK:hb N11:YAZILACAK:n11", d(p1));
    kontrol("  ...yazılacak alanlar ortamdaki kimliğin AYNISI, son 4 gizli alandan (TY secret · HB key · N11 appSecret)",
      T.ayniKimlik(p1[0]!.ham!, ty) && T.ayniKimlik(p1[1]!.ham!, hb) && p1.map((k) => k.sonDort).join(",") === "abcd,wxyz,9999", p1.map((k) => k.sonDort));
    kontrol("  ...plan yazılabilir", T.tasimaYazilabilirMi(p1).yazilabilir);
    const ayni = T.tasimaPlani(ortam, [h("ty", "TRENDYOL", "870249", null, { tur: "VAR", kimlik: { kanal: "TRENDYOL", kimlik: ty } }), ...temel.slice(2)], { uzerine: false });
    kontrol("  ...hesapta AYNI anahtar → AYNI (atlanır; ikinci koşum zararsız)", ayni[0]!.durum === "AYNI" && ayni[0]!.ham === null);
    const farkliM: M = { tur: "VAR", kimlik: { kanal: "TRENDYOL", kimlik: { ...ty, secret: "ekrandan-girilmis" } } };
    const farkli = T.tasimaPlani(ortam, [h("ty", "TRENDYOL", "870249", null, farkliM), ...temel.slice(2)], { uzerine: false });
    kontrol("  ...hesapta FARKLI anahtar → DURDU (üstüne YAZMAZ) ve plan BÜTÜNÜYLE yazılamaz (yarım taşıma yok)",
      farkli[0]!.durum === "FARKLI_DURDU" && farkli[0]!.ham === null && !T.tasimaYazilabilirMi(farkli).yazilabilir && farkli[1]!.durum === "YAZILACAK");
    const uzerine = T.tasimaPlani(ortam, [h("ty", "TRENDYOL", "870249", null, farkliM), ...temel.slice(2)], { uzerine: true });
    kontrol("  ...--uzerine AÇIKÇA istenirse FARKLI'nın üstüne yazılır", uzerine[0]!.durum === "USTUNE_YAZILACAK" && T.tasimaYazilabilirMi(uzerine).yazilabilir);
    const acilamadi = T.tasimaPlani(ortam, [h("ty", "TRENDYOL", "870249", null, { tur: "ACILAMADI" }), ...temel.slice(2)], { uzerine: false });
    kontrol("  ...açılamayan mevcut anahtar → DURDU (sır değişmiş olabilir; körlemesine ezilmez)", acilamadi[0]!.durum === "MEVCUT_ACILAMADI_DURDU" && !T.tasimaYazilabilirMi(acilamadi).yazilabilir);
    const ikiN11 = T.tasimaPlani(ortam, [...temel, h("n11-2", "N11", null, null)], { uzerine: false });
    kontrol("  ...iki N11 satış hesabı → HESAP_BELIRSIZ («ilkini seç» yok)", ikiN11[2]!.durum === "HESAP_BELIRSIZ" && !T.tasimaYazilabilirMi(ikiN11).yazilabilir);
    const tyYok = T.tasimaPlani(ortam, temel.filter((x) => x.id !== "ty"), { uzerine: false });
    kontrol("  ...satıcı no'su tutan TY hesabı yok → HESAP_YOK (başka TY hesabına YAZILMAZ)", tyYok[0]!.durum === "HESAP_YOK" && tyYok[0]!.hesap === null);
    const bosOrtam = T.tasimaPlani({ TRENDYOL: null, HEPSIBURADA: null, N11: null }, temel, { uzerine: false });
    kontrol("  ...ortamda anahtar yok → ORTAMDA_YOK, yazılacak bir şey yok", bosOrtam.every((k) => k.durum === "ORTAMDA_YOK") && !T.tasimaYazilabilirMi(bosOrtam).yazilabilir && T.tasimaYazilabilirMi(bosOrtam).durduran.length === 0);
    const bozukOrtam = T.tasimaPlani({ ...ortam, TRENDYOL: { ...ty, key: "bosluk var" } }, temel, { uzerine: false });
    kontrol("  ...ortamdaki değer biçimce bozuk → ORTAM_GECERSIZ (depo kapısıyla aynı ölçüt)", bozukOrtam[0]!.durum === "ORTAM_GECERSIZ" && !T.tasimaYazilabilirMi(bozukOrtam).yazilabilir);
    const geri = T.geriAlmaKumesi(ortam, [h("ty", "TRENDYOL", "870249", null, { tur: "VAR", kimlik: { kanal: "TRENDYOL", kimlik: ty } }), h("ty-baska", "TRENDYOL", "999", null, farkliM), h("hb", "HEPSIBURADA", null, hb.merchantId)]);
    kontrol("geri alma kümesi YENİDEN HESAPLANIR: yalnız anahtarı ortamdakiyle BİREBİR aynı hesap", geri.map((x) => x.id).join(",") === "ty", geri);
    const betik = yorumsuz(kaynakOku("scripts/canli-anahtar-tasi.ts"));
    const isaret = betik.indexOf('if (DENEME) process.env.DENEME_ORTAMI = "1";');
    // Çapa istemci YOLUNU yazmaz: `api:dogrula` o dizeyi «API'ye ulaşan dosya» sayar (bekçinin arama dizesi davranış sanılır).
    const istemci = betik.indexOf("const { kimlikOku: tyOku } = await import(");
    kontrol("taşıma betiği: deneme kipinde deneme İŞARETİ istemcilerden ÖNCE konur (gerçek anahtar deneme veritabanına gidemez)", isaret >= 0 && istemci >= 0 && isaret < istemci);
    const kapi = betik.indexOf("if (!karar.yazilabilir) {");
    const goruntu = betik.indexOf("writeFileSync(goruntu,");
    const yazim = betik.indexOf("await D.anahtarKaydet(");
    kontrol("  ...sıra: plan kapısı → anlık görüntü → yazım (hepsi var)", kapi >= 0 && goruntu >= 0 && yazim >= 0 && kapi < goruntu && goruntu < yazim);
    kontrol("  ...yazılan her anahtar geri açılıp ortamdakiyle BİREBİR karşılaştırılır", /const geri = await D\.kayitliKimligiAc\(k\.hesap\.id\);\s*const tutuyor = s\.durum === "TAMAM" && geri\.durum === "TAMAM" && T\.ayniKimlik\(geri\.kimlik\.kimlik, k\.ham\);/.test(betik));
    kontrol("  ...varsayılan KURU; yazım --yaz ve firmanın üyesi --yapan ister", /const YAZ = process\.argv\.includes\("--yaz"\);/.test(betik) && /if \(!YAZ\) return console\.log\("\\n  KURU/.test(betik) && /prisma\.userCompanyRole\.findFirst\(\{ where: \{ companyId, user: \{ email: eposta \} \}/.test(betik));
    kontrol("  ...betik sınıfı beyanlı (TEK_SEFERLIK + gerekçe)", /BETIK SINIFI: TEK_SEFERLIK — .{20,}/.test(kaynakOku("scripts/canli-anahtar-tasi.ts")));
  }
  kosanBolumler.push("hesap");

  await sistemPrisma.$disconnect();
  if (kosanBolumler.length !== BOLUM_SAYISI) {
    console.log(`\n  KOŞUM YARIM KALDI (${kosanBolumler.length}/${BOLUM_SAYISI}) — sonuç GEÇERSİZ\n`);
    process.exit(1);
  }
  if (hata === 0) console.log(`\nTÜM KONTROLLER GEÇTİ (${gecen}/${gecen})\n`);
  else { console.log(`\n${hata} KONTROL BAŞARISIZ (${gecen}/${gecen + hata})\n`); process.exitCode = 1; }
}

main().catch((e) => { console.error("\nBEKÇİ ÇÖKTÜ:", e); process.exit(1); });
