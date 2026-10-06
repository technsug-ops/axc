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
  kontrol("sır yok → SIR_YOK", S.sirOku("").durum === "SIR_YOK" && S.sirOku(undefined).durum === "SIR_YOK");
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

  await sistemPrisma.$disconnect();
  if (kosanBolumler.length !== BOLUM_SAYISI) {
    console.log(`\n  KOŞUM YARIM KALDI (${kosanBolumler.length}/${BOLUM_SAYISI}) — sonuç GEÇERSİZ\n`);
    process.exit(1);
  }
  if (hata === 0) console.log(`\nTÜM KONTROLLER GEÇTİ (${gecen}/${gecen})\n`);
  else { console.log(`\n${hata} KONTROL BAŞARISIZ (${gecen}/${gecen + hata})\n`); process.exitCode = 1; }
}

main().catch((e) => { console.error("\nBEKÇİ ÇÖKTÜ:", e); process.exit(1); });
