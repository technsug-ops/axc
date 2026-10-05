import { kaynakOku } from "./kaynak-oku";
import { GIRIS_DENEME_SINIRI, GIRIS_KILIT_DK, girisKilidi } from "../src/lib/giris-kilidi";

/**
 * ============================================================================
 *  ERİŞİM BEKÇİSİ — VERİ KAZINMASINA KARŞI DÖRT KORUMA (02.10.2026)
 * ----------------------------------------------------------------------------
 *      npm run erisim:dogrula
 *
 *  Kullanıcı isteği: «veri madenciliği yapılarak db'nin kazınmasını engelle».
 *  Ölçüm: sayfalar/API'ler zaten girişe kapalı; eksikler şunlardı ve burada
 *  korunur:
 *   ① giriş denemesine sınır YOKTU (kaba kuvvet) — saf kural DEĞERLE sınanır
 *   ② toplu indirmeler (tümü · tek liste · yedek) İZ bırakmıyordu
 *   ③ iki açık uç anahtarsız isteğe 401 diyordu (varlık sızıyordu) → 404
 *   ④ arama motorlarına kapalı değildi
 * ============================================================================
 */

console.log("\nERİŞİM BEKÇİSİ\n");

let gecen = 0;
let hata = 0;
function kontrol(ad: string, kosul: boolean, ayrinti?: unknown) {
  if (kosul) {
    gecen++;
    console.log("  OK  " + ad);
  } else {
    hata++;
    console.log("  X   " + ad + (ayrinti === undefined ? "" : "  → " + JSON.stringify(ayrinti).slice(0, 300)));
  }
}
function yorumsuz(metin: string): string {
  return metin.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
}

/* ═══ ① GİRİŞ KİLİDİ — saf kural ═══ */
console.log("  ── ① GİRİŞ KİLİDİ (değer)");
const T = new Date(Date.UTC(2026, 9, 2, 10, 0, 0));
const dk = (n: number) => new Date(T.getTime() - n * 60_000);
kontrol("sınır 5 deneme · 15 dakika (beyan)", GIRIS_DENEME_SINIRI === 5 && GIRIS_KILIT_DK === 15);
kontrol("4 başarısız deneme → kilit YOK", girisKilidi([dk(1), dk(2), dk(3), dk(4)], T).kilitli === false);
const k5 = girisKilidi([dk(1), dk(2), dk(3), dk(4), dk(5)], T);
kontrol("5 başarısız deneme (15 dk içinde) → KİLİTLİ", k5.kilitli === true, k5);
kontrol(
  "  ...kilit, sınırı dolduran en eski denemenin üstünden 15 dk dolunca açılır (10 dk sonra)",
  k5.kilitli === true && k5.acilis.getTime() === dk(5).getTime() + 15 * 60_000,
  k5,
);
kontrol("15 dakikadan eski denemeler sayılmaz (4 yeni + 3 eski → kilit yok)", girisKilidi([dk(1), dk(2), dk(3), dk(4), dk(16), dk(20), dk(30)], T).kilitli === false);
kontrol("pencere sınırı: tam 15 dk önceki deneme DIŞARIDA", girisKilidi([dk(1), dk(2), dk(3), dk(4), dk(15)], T).kilitli === false);
kontrol("gelecek tarihli kayıt sayılmaz", girisKilidi([dk(1), dk(2), dk(3), dk(4), dk(-5)], T).kilitli === false);
kontrol("boş liste → kilit yok", girisKilidi([], T).kilitli === false);
const k7 = girisKilidi([dk(1), dk(2), dk(3), dk(4), dk(5), dk(6), dk(7)], T);
kontrol("7 deneme: açılış 5. EN YENİ denemeye göre (sıra karışık verilse de)", k7.kilitli === true && k7.acilis.getTime() === dk(5).getTime() + 15 * 60_000, k7);

/* ═══ ① GİRİŞ KİLİDİ — eylem bağı (kaynak, kullanım bloğu) ═══ */
console.log("\n  ── ① GİRİŞ EYLEMİ (bağ)");
const giris = yorumsuz(kaynakOku("src/app/giris/actions.ts"));
const gBas = giris.indexOf("export async function girisYap(");
const gSon = giris.indexOf("export async function", gBas + 10);
const govde = gBas >= 0 ? giris.slice(gBas, gSon >= 0 ? gSon : undefined) : "";
kontrol("giriş gövdesi bulundu", govde.length > 0);
const iKilit = govde.indexOf("if (kilit.kilitli) {");
const iParola = govde.indexOf("const gecti = await parolaDogrula(");
kontrol("kilit kontrolü VAR", iKilit >= 0);
kontrol("parola doğrulaması VAR", iParola >= 0);
kontrol("kilitliyken parola HİÇ denenmez (kilit, doğrulamadan ÖNCE döner)", iKilit >= 0 && iParola >= 0 && iKilit < iParola);
/* K303 (04.10.2026): okuma `lib/giris-kilidi-okuma.ts`e taşındı — girişten önce firma
   yoktur, okuma firmalar-üstü olmalı (süzgeçli okuma giriş ekranını düşürdü). Ölçüt
   iki halkaya bölündü: eylem gövdeyi ÇAĞIRIR + gövde doğru izi okur. Firmasız
   çalıştığını `giris-firmasiz:dogrula` gerçek veritabanında ölçer. */
const okuma = yorumsuz(kaynakOku("src/lib/giris-kilidi-okuma.ts"));
kontrol(
  "kilit kararı saf kuraldan, okuma gövdesinden beslenir",
  govde.includes("const kilit = girisKilidi(await yakinBasarisizDenemeler(eposta, ip, simdi), simdi);"),
);
kontrol(
  "okuma gövdesi son 15 dk'nın GIRIS_BASARISIZ izini okur",
  okuma.includes('action: "GIRIS_BASARISIZ",') &&
    okuma.includes("createdAt: { gte: new Date(simdi.getTime() - GIRIS_KILIT_DK * 60_000), lte: simdi },"),
);
kontrol(
  "sayaç e-posta YA DA IP üzerinden (ikisi de)",
  okuma.includes('{ detail: { contains: `"eposta":${JSON.stringify(eposta)}` } },') &&
    okuma.includes('{ detail: { contains: `"ip":${JSON.stringify(ip)}` } },'),
);
const basarisizBlok = govde.slice(govde.indexOf("if (red !== null || !kullanici || !firmaId || !uye) {"), govde.indexOf('return { hatalar: [t(GIRIS_RED_ANAHTARI[red ?? "HATALI"])] };'));
kontrol(
  "başarısız deneme İZ YAZIYOR (sayacın kaynağı) — parola yazılmıyor",
  basarisizBlok.includes("await izYaz({") && basarisizBlok.includes('detail: JSON.stringify({ eposta, ip, firmaKodu, sebep: red ?? "HATALI" }),') && !/parola/.test(basarisizBlok.replace("Parola YAZILMAZ", "")),
);
const iOturum = govde.indexOf("await oturumAc(kullanici.id, firmaId);");
/* ⚠ 05.10.2026: bu ölçüt eski dönüş satırını arıyordu; satır değişince indexOf
   -1 döndü ve `iOturum > -1` HER ZAMAN doğruydu (yalancı yeşil). Varlık ayrıca
   kapılanır (anayasa: «indexOf · every · ?? — nötr görünen varsayılan»). */
const iRed = govde.indexOf('return { hatalar: [t(GIRIS_RED_ANAHTARI[red ?? "HATALI"])] };');
kontrol("başarılı giriş iz SAYACINA girmez (GIRIS_BASARISIZ yalnız hata dalında)", (govde.match(/action: "GIRIS_BASARISIZ"/g) ?? []).length === 1 && iRed >= 0 && iOturum >= 0 && iOturum > iRed);
kontrol("kilitli mesajı sözlükten, kalan dakikayla", govde.includes('return { hatalar: [t("cokFazlaDeneme", { dakika })] };'));

/* ═══ ② TOPLU İNDİRME İZİ ═══ */
console.log("\n  ── ② TOPLU İNDİRME İZİ");
const disa = yorumsuz(kaynakOku("src/app/api/disa-aktarma/[liste]/route.ts"));
const tumuBlok = disa.slice(disa.indexOf('if (liste === "tumu") {'), disa.indexOf("if (!listeGecerliMi(liste))"));
kontrol("«tümü» indirmesi iz bırakıyor", /await izYaz\(\{ action: "TOPLU_INDIRME", targetType: "DisaAktarma", targetId: "tumu"/.test(tumuBlok));
const tekBlok = disa.slice(disa.indexOf("const cikti = await listeSayfasi(liste, parametreler);"));
kontrol("tek liste indirmesi iz bırakıyor (liste + süzgeç)", /await izYaz\(\{ action: "TOPLU_INDIRME", targetType: "DisaAktarma", targetId: liste, detail: JSON\.stringify\(\{ tur: "liste", liste, parametreler \}\) \}\);/.test(tekBlok));
const yedek = yorumsuz(kaynakOku("src/app/api/yedek/indir/route.ts"));
const akisBlok = yedek.slice(yedek.indexOf("if (!sonuc || sonuc.statusCode !== 200)"), yedek.indexOf("return new Response(sonuc.stream"));
kontrol("yedek indirmesi iz bırakıyor (akış dönmeden önce)", /await izYaz\(\{ action: "TOPLU_INDIRME", targetType: "Yedek"/.test(akisBlok));
kontrol("üç indirme de izin kapısından geçiyor (veri.aktar)", disa.includes('const red = await apiIzni("veri.aktar");') && yedek.includes('const red = await apiIzni("veri.aktar");'));

/* ═══ ③ AÇIK UÇLAR VARLIK SIZDIRMAZ ═══ */
console.log("\n  ── ③ AÇIK UÇLAR 404");
for (const yol of ["src/app/api/olcum/route.ts", "src/app/api/yedek/otomatik/route.ts"]) {
  const k = yorumsuz(kaynakOku(yol));
  kontrol(`${yol}: yanlış anahtar 404 (401 değil)`, !/status:\s*401/.test(k) && /return new Response\(null, \{ status: 404 \}\);/.test(k));
}

/* ═══ ④ ARAMA MOTORLARI ═══ */
console.log("\n  ── ④ ARAMA MOTORLARINA KAPALI");
const robots = yorumsuz(kaynakOku("src/app/robots.ts"));
kontrol("robots.txt bütün yolları kapatıyor", robots.includes('return { rules: { userAgent: "*", disallow: "/" } };'));
const proxy = yorumsuz(kaynakOku("src/proxy.ts"));
kontrol("robots.txt girişsiz okunabiliyor (proxy açık yollarında)", proxy.includes('"/robots.txt",'));
const layout = yorumsuz(kaynakOku("src/app/layout.tsx"));
kontrol("sayfa başlığında noindex/nofollow", layout.includes("robots: { index: false, follow: false },"));

console.log("\n" + (hata === 0 ? "TÜM KONTROLLER GEÇTİ" : "BAŞARISIZ") + ` (${gecen}/${gecen + hata})\n`);
process.exit(hata === 0 ? 0 : 1);
