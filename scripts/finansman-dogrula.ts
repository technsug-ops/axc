import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { kaynakOku } from "./kaynak-oku";
import {
  giderKaydi,
  giderTutari,
  hareketHatasi,
  paraBirimiMi,
  secilebilirBirimler,
  tlKarsiligi,
  kaynakOzeti,
  nakitEtkisi,
  odemePlaniCoz,
  turkceSayi,
  type OzetHareketi,
} from "../src/lib/finansman/kural";

/**
 * ============================================================================
 *  FİNANSMAN BEKÇİSİ (K304) — `npm run finansman:dogrula`
 * ----------------------------------------------------------------------------
 *  ① KURAL — saf gövde ÇAĞRILIR, değeri sınanır (kaynak taranmaz).
 *  ② ZİNCİR — kaynak taraması yalnız BAĞ için: kâr motoru finansman
 *     tablolarını OKUMAZ (desen yasağı, dosya listesi tutmaz) · takvim yalnız
 *     planlıyı alır · faiz gideri hareketle AYNI işlemde · yetki kapıları.
 *  Bölüm sayacı: bir blok koşmazsa bekçi «geçti» DEMEZ, GEÇERSİZ der.
 * ============================================================================
 */

let gecen = 0;
let kalan = 0;
const kosanBolumler: string[] = [];
const BOLUM_SAYISI = 2;
function kontrol(ad: string, sonuc: boolean, gorulen?: unknown) {
  if (sonuc) {
    gecen++;
    console.log(`  OK    ${ad}`);
  } else {
    kalan++;
    console.log(`  HATA  ${ad}`);
    if (gorulen !== undefined) console.log("        ", JSON.stringify(gorulen));
  }
}
const yorumsuz = (m: string) => m.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1");
const oku = (y: string) => yorumsuz(kaynakOku(y));
/** `export async function ad(` bloğu — bir sonraki üst düzey `export`a kadar. */
function govde(metin: string, ad: string): string {
  const bas = metin.indexOf(`export async function ${ad}(`);
  if (bas < 0) return "";
  const son = metin.indexOf("\nexport ", bas + 10);
  return metin.slice(bas, son < 0 ? metin.length : son);
}

console.log("=".repeat(70));
console.log("FİNANSMAN (K304)");
console.log("=".repeat(70));

// ── 1) KURAL ─────────────────────────────────────────────────────────────
console.log("\n1) kural — değerle");
{
  const g = (tur: "GIRIS" | "GERI_ODEME" | "SERMAYEYE_MAHSUP", anapara: number, faiz = 0, vergi = 0) => ({ tur, anapara, faiz, vergi });
  kontrol("sermaye geri ÖDENMEZ", hareketHatasi("SERMAYE", g("GERI_ODEME", 100)) === "TUR_IZINSIZ");
  kontrol("sermaye mahsup EDİLMEZ", hareketHatasi("SERMAYE", g("SERMAYEYE_MAHSUP", 100)) === "TUR_IZINSIZ");
  kontrol("üçüncü kişi borcu sermayeye mahsup EDİLMEZ", hareketHatasi("UCUNCU_KISI_BORCU", g("SERMAYEYE_MAHSUP", 100)) === "TUR_IZINSIZ");
  kontrol("banka kredisi sermayeye mahsup EDİLMEZ", hareketHatasi("BANKA_KREDISI", g("SERMAYEYE_MAHSUP", 100)) === "TUR_IZINSIZ");
  kontrol("ortak borcu sermayeye mahsup EDİLİR", hareketHatasi("ORTAK_BORCU", g("SERMAYEYE_MAHSUP", 100)) === null);
  kontrol("sıfır tutar reddedilir", hareketHatasi("SERMAYE", g("GIRIS", 0)) === "ANAPARA_GECERSIZ");
  kontrol("NaN tutar reddedilir (belirsiz sayı)", hareketHatasi("SERMAYE", g("GIRIS", Number.NaN)) === "ANAPARA_GECERSIZ");
  kontrol("girişte faiz reddedilir", hareketHatasi("BANKA_KREDISI", g("GIRIS", 100, 5)) === "FAIZ_YALNIZ_GERI_ODEMEDE");
  kontrol("eksi faiz reddedilir", hareketHatasi("BANKA_KREDISI", g("GERI_ODEME", 100, -5)) === "FAIZ_GECERSIZ");
  kontrol("taksit faizli geçerli", hareketHatasi("BANKA_KREDISI", g("GERI_ODEME", 100, 5, 1)) === null);

  kontrol("nakit: giriş +anapara", nakitEtkisi(g("GIRIS", 100)) === 100);
  kontrol("nakit: taksit −(anapara+faiz+vergi)", nakitEtkisi(g("GERI_ODEME", 100, 10, 2)) === -112);
  kontrol("nakit: mahsup SIFIR (para hareketi yok)", nakitEtkisi(g("SERMAYEYE_MAHSUP", 100)) === 0);
  kontrol("gider: taksitte faiz+vergi", giderTutari(g("GERI_ODEME", 100, 10, 2)) === 12);
  kontrol("gider: girişte SIFIR (sermaye/borç kâra dokunmaz)", giderTutari(g("GIRIS", 100)) === 0 && giderTutari(g("SERMAYEYE_MAHSUP", 100)) === 0);

  const o = (h: ReturnType<typeof g>, gerceklesti = true): OzetHareketi => ({ ...h, gerceklesti });
  const banka = kaynakOzeti("BANKA_KREDISI", [o(g("GIRIS", 1000)), o(g("GERI_ODEME", 300, 40, 10)), o(g("GERI_ODEME", 200, 30, 5), false)]);
  kontrol("banka: kalan = giren − ödenen anapara (planlı HARİÇ)", banka.kalanBorc === 700, banka);
  kontrol("banka: ödenen faiz+vergi yalnız gerçekleşmiş", banka.odenenFaizVergi === 50, banka);
  kontrol("banka: planlı çıkış anapara+faiz+vergi", banka.planliCikis === 235, banka);
  kontrol("banka: sermayeye katkı YOK", banka.sermayeKatkisi === 0);
  const sermaye = kaynakOzeti("SERMAYE", [o(g("GIRIS", 500)), o(g("GIRIS", 250), false)]);
  kontrol("sermaye: kalan borç YOK (null)", sermaye.kalanBorc === null);
  kontrol("sermaye: katkı = gerçekleşmiş giriş", sermaye.sermayeKatkisi === 500 && sermaye.planliGiris === 250, sermaye);
  const ortak = kaynakOzeti("ORTAK_BORCU", [o(g("GIRIS", 1000)), o(g("SERMAYEYE_MAHSUP", 400)), o(g("GERI_ODEME", 100))]);
  kontrol("ortak: mahsup borcu düşer, sermayeye geçer", ortak.kalanBorc === 500 && ortak.sermayeKatkisi === 400, ortak);
  const ters = kaynakOzeti("UCUNCU_KISI_BORCU", [o(g("GIRIS", 1000)), o(g("GERI_ODEME", 300)), o({ tur: "GERI_ODEME", anapara: -300, faiz: 0, vergi: 0 })]);
  kontrol("ters kayıt yanlış ödemeyi geri alır (süzülmez)", ters.kalanBorc === 1000, ters);

  kontrol("sayı: 1.234,56", turkceSayi("1.234,56") === 1234.56);
  kontrol("sayı: 1234,5", turkceSayi("1234,5") === 1234.5);
  kontrol("sayı: 1.234 (binlik)", turkceSayi("1.234") === 1234);
  kontrol("sayı: 12.5 BELİRSİZ → reddedilir", turkceSayi("12.5") === null);
  kontrol("sayı: harf → reddedilir", turkceSayi("abc") === null);
  /* K304-② — birim, özellik anahtarı, TL karşılığı, gider kaydı. */
  kontrol("özellik KAPALI: yalnız TL/EUR", JSON.stringify(secilebilirBirimler(false)) === '["TRY","EUR"]');
  kontrol("özellik AÇIK: USD ve iki altın da", ["USD", "ALTIN_GRAM_24", "ALTIN_GRAM_22"].every((b) => secilebilirBirimler(true).includes(b as never)));
  kontrol("altın para birimi DEĞİL (Intl'e para kodu gitmez)", !paraBirimiMi("ALTIN_GRAM_24") && paraBirimiMi("USD"));
  kontrol("TL karşılığı: TRY kendisi", tlKarsiligi(1500, "TRY", null) === 1500);
  kontrol("TL karşılığı: fiyat yoksa UYDURULMAZ (null)", tlKarsiligi(10, "ALTIN_GRAM_24", null) === null && tlKarsiligi(10, "USD", 0) === null);
  kontrol("TL karşılığı: 80 gr × 5.150", tlKarsiligi(80, "ALTIN_GRAM_24", 5150) === 412000);
  kontrol("gider: TL borçta kendi tutarı, TRY", JSON.stringify(giderKaydi("TRY", 120, null)) === '{"tutar":120,"paraBirimi":"TRY"}');
  kontrol("gider: EUR borçta EUR (çevrilmez)", JSON.stringify(giderKaydi("EUR", 40, 999)) === '{"tutar":40,"paraBirimi":"EUR"}');
  kontrol("gider: altın borçta TL karşılığı ZORUNLU", giderKaydi("ALTIN_GRAM_24", 2, null) === "GIDER_TL_GEREKLI");
  kontrol("gider: altın borçta girilen TL yazılır", JSON.stringify(giderKaydi("ALTIN_GRAM_24", 2, 10300)) === '{"tutar":10300,"paraBirimi":"TRY"}');
  kontrol("gider: faiz sıfırsa gider DOĞMAZ", giderKaydi("USD", 0, 500) === null);
  /* K304-③ — adetli altın (kullanıcı listesi 29.09.2026). */
  const adetli = ["CEYREK_ALTIN", "YARIM_ALTIN", "TAM_ALTIN", "CUMHURIYET_ALTINI", "ATA_LIRA_ALTINI"] as const;
  kontrol("özellik AÇIK: beş adetli altın da seçilebilir", adetli.every((b) => secilebilirBirimler(true).includes(b)));
  kontrol("özellik KAPALI: adetli altın SEÇİLEMEZ", adetli.every((b) => !secilebilirBirimler(false).includes(b)));
  kontrol("adetli altın para birimi DEĞİL", adetli.every((b) => !paraBirimiMi(b)));
  kontrol("TL karşılığı: 5 çeyrek × 8.700 (adet başına fiyat)", tlKarsiligi(5, "CEYREK_ALTIN", 8700) === 43500);
  kontrol("gider: çeyrek borçta TL karşılığı ZORUNLU", giderKaydi("CEYREK_ALTIN", 1, null) === "GIDER_TL_GEREKLI");

  const plan = odemePlaniCoz("15.10.2026\t8.333,33\t2.450,00\t122,50\n\n15.11.2026;8.333,33;2.310,00\n31.02.2026 1,00 1,00\n15.12.2026 12.5 1,00");
  kontrol("plan: iki geçerli satır okunur (vergisiz satır vergi 0)", plan.satirlar.length === 2 && plan.satirlar[1].vergi === 0 && plan.satirlar[0].vade === "2026-10-15", plan);
  kontrol("plan: 31 Şubat ve belirsiz sayı satır numarasıyla hata", JSON.stringify(plan.hatalar) === "[4,5]", plan.hatalar);
  kontrol("plan: fazla sütun hata", odemePlaniCoz("15.10.2026 1,00 1,00 1,00 1,00").hatalar.length === 1);
}
kosanBolumler.push("kural");

// ── 2) ZİNCİR ────────────────────────────────────────────────────────────
console.log("\n2) zincir — bağlar");
{
  /* KÂRA DOKUNMAZ — desen yasağı: finansman tablolarına sorgu YALNIZ finansman
     modülünde. Kâr motoru, rapor, panel ya da özet onu okursa kırmızı. */
  const tum: string[] = [];
  const gez = (d: string) => {
    for (const a of readdirSync(d)) {
      const y = join(d, a);
      if (statSync(y).isDirectory()) {
        if (a !== "generated") gez(y);
      } else if (/\.(ts|tsx)$/.test(a)) tum.push(y.split(String.fromCharCode(92)).join("/"));
    }
  };
  gez("src");
  const izinli = (y: string) => y.startsWith("src/lib/finansman/") || y.startsWith("src/app/finansman/");
  const ihlal = tum.filter((y) => !izinli(y) && /\b(prisma|tx)\.finansman(Hareketi)?\./.test(oku(y)));
  kontrol(`finansman tablolarına yalnız finansman modülü sorgu atar (${tum.length} dosya tarandı)`, tum.length > 200 && ihlal.length === 0, ihlal);

  const veri = oku("src/lib/finansman/veri.ts");
  const takvimGovde = govde(veri, "finansmanTakvimHareketleri");
  kontrol("takvim yalnız PLANLI, ters olmayan, nakitli hareketi alır", /where:\s*\{\s*gerceklestiAt:\s*null,\s*isReversal:\s*false,\s*tur:\s*\{\s*in:\s*\["GIRIS",\s*"GERI_ODEME"\]\s*\}\s*\}/.test(takvimGovde));
  kontrol("takvim: taksit tutarı anapara+faiz+vergi", /sayi\(h\.anapara\)\s*\+\s*sayi\(h\.faiz\)\s*\+\s*sayi\(h\.vergi\)/.test(takvimGovde));
  const takvim = oku("src/lib/panel/takvim-verisi.ts");
  kontrol("nakit takvimi finansman satırlarını ekliyor", /for \(const f of await finansmanTakvimHareketleri\(\)\) \{\s*satirlar\.push\(\{ \.\.\.f, kaynak: "FINANSMAN" \}\);/.test(takvim));

  const eylem = oku("src/app/finansman/eylemler.ts");
  const disaAcik = [...eylem.matchAll(/export async function (\w+)\(/g)].map((m) => m[1]);
  const kapisiz = disaAcik.filter((ad) => !govde(eylem, ad).includes('await yetkiIste("finansman.yonet")'));
  kontrol(`her eylem finansman.yonet ister (${disaAcik.length} eylem)`, disaAcik.length >= 6 && kapisiz.length === 0, kapisiz);
  for (const ad of ["hareketEkle", "gerceklestir", "tersKayit"]) {
    const b = govde(eylem, ad);
    const tIslem = b.indexOf("await prisma.$transaction(");
    const tGider = b.indexOf("tx.expense.create(");
    kontrol(`${ad}: faiz gideri hareketle AYNI işlemde`, tIslem >= 0 && tGider >= 0 && tIslem < tGider && !/prisma\.expense\.create\(/.test(b));
  }
  kontrol("gerçekleştir: koşullu yazım (iki sekme)", /updateMany\(\{\s*where:\s*\{\s*id:\s*h\.id,\s*gerceklestiAt:\s*null\s*\}/.test(govde(eylem, "gerceklestir")));
  kontrol("ters kayıt faizi de tersler (eksi gider)", /amount:\s*-Number\(h\.faizGider\.amount\.toString\(\)\)/.test(govde(eylem, "tersKayit")));
  kontrol("plan sil yalnız gerçekleşmemişi siler (koşullu)", /deleteMany\(\{\s*where:\s*\{\s*id:\s*h\.id,\s*gerceklestiAt:\s*null,\s*isReversal:\s*false\s*\}/.test(govde(eylem, "planSil")));
  const silme = govde(eylem, "kaynakSil");
  kontrol("kaynak sil: gerçekleşmiş ya da ters hareket varsa DURUR", /count\(\{\s*where:\s*\{\s*finansmanId:\s*k\.id,\s*OR:\s*\[\{\s*gerceklestiAt:\s*\{\s*not:\s*null\s*\}\s*\},\s*\{\s*isReversal:\s*true\s*\}\]\s*\}\s*\}\);\s*if \(olmus > 0\) throw new Error\("GERCEKLESMIS_VAR"\);/.test(silme));
  kontrol("kaynak sil: yalnız planlı satırları siler", /deleteMany\(\{\s*where:\s*\{\s*finansmanId:\s*k\.id,\s*gerceklestiAt:\s*null,\s*isReversal:\s*false\s*\}/.test(silme));
  kontrol("gerçekleşmiş hareket GÜNCELLENMEZ (tek update: gerçekleştir)", (eylem.match(/finansmanHareketi\.update(Many)?\(/g) ?? []).length === 1);

  /* K304-② zincir. */
  kontrol("özellik kapısı SUNUCUDA: kapalıyken USD/altın kaynak reddedilir", /if \(EK_BIRIMLER\.includes\(birim\) && !\(await cokBirimAcikMi\(baglam\.companyId\)\)\) return \{ tamam: false, hata: t\("hata\.BIRIM_KAPALI"\) \};/.test(govde(eylem, "kaynakEkle")));
  for (const ad of ["hareketEkle", "gerceklestir"]) {
    kontrol(`${ad}: gider giderKaydi'dan, TL eksikse DURUR`, /giderKaydi\(/.test(govde(eylem, ad)) && /if \(gider === "GIDER_TL_GEREKLI"\) return/.test(govde(eylem, ad)) && /amount: gider\.tutar, currency: gider\.paraBirimi/.test(govde(eylem, ad)));
  }
  kontrol("ters kayıt: gider kendi para biriminde terslenir", /currency: h\.faizGider\.currency/.test(govde(eylem, "tersKayit")));
  const listeGovde = govde(veri, "finansmanListesi");
  kontrol("liste: fiyatı olmayan birim adıyla söylenir (sessiz değil)", /if \(tl === null\) fiyatsizBirimler\.push\(birim\);/.test(listeGovde));
  const eskiSutun = ["src/lib/finansman/veri.ts", "src/lib/finansman/kural.ts", "src/app/finansman/eylemler.ts", "src/app/finansman/page.tsx", "src/app/finansman/[id]/page.tsx"]
    .filter((y) => /\b(kaynak|k|s)\.currency\b|finansman:\s*\{\s*select:\s*\{[^}]*currency/.test(oku(y)));
  kontrol("ESKİ `Finansman.currency` sütununu hiçbir yer okumaz (genişlet→daralt)", eskiSutun.length === 0, eskiSutun);
  kontrol("Özellikler sayfası ayar.yaz ister", oku("src/app/ayarlar/ozellikler/page.tsx").includes('await sayfaIzni("ayar.yaz");'));
  kontrol("özellik eylemi ayar.yaz ister ve firmayı OTURUMDAN alır", /await yetkiIste\("ayar\.yaz"\)[\s\S]*where: \{ id: baglam\.companyId \}/.test(oku("src/app/ayarlar/ozellikler/eylemler.ts")));

  for (const y of ["src/app/finansman/page.tsx", "src/app/finansman/[id]/page.tsx"]) {
    kontrol(`${y} sayfaIzni("finansman.yonet")`, oku(y).includes('await sayfaIzni("finansman.yonet");'));
  }
  kontrol("izin tanımlı", oku("src/lib/yetki/izinler.ts").includes('{ anahtar: "finansman.yonet", grup: "para" }'));
  const seed = oku("prisma/seed-yetki.ts");
  const sd = seed.slice(seed.indexOf("const SONRADAN_DOGAN"), seed.indexOf("];", seed.indexOf("const SONRADAN_DOGAN")));
  kontrol("izin SONRADAN_DOGAN'da (tam yetkili roller kendiliğinden alır)", sd.includes('"finansman.yonet"'));
}
kosanBolumler.push("zincir");

console.log("\n" + "=".repeat(70));
if (kosanBolumler.length !== BOLUM_SAYISI) {
  console.log(`KOŞUM YARIM KALDI (${kosanBolumler.length}/${BOLUM_SAYISI}) — sonuç GEÇERSİZ`);
  process.exit(1);
}
if (kalan === 0) console.log(`TÜM KONTROLLER GEÇTİ (${gecen})`);
else {
  console.log(`${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrolden)`);
  process.exit(1);
}
