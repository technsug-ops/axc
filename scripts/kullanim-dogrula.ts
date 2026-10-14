import { kaynakOku } from "./kaynak-oku";
import { baglantiHedefi, cihazSec, DIS_BAGLANTI, hedefTemizle, KULLANIM_PAKET_SINIRI, paketiSuz, sayfaKalibi } from "../src/lib/kullanim/olay";
import {
  isSaatDilimiFarki,
  KULLANIM_LISTE_SINIRI,
  KULLANIM_SEKMELERI,
  kullanimListele,
  kullanimSekmesi,
  payYuzde,
  saatEkseni,
  sayfaMenuAnahtari,
  sutunYuzdesi,
  zamanEkseni,
  GUNLUK_SUTUN_TAVANI,
} from "../src/lib/kullanim/firma-raporu";
import { gunEkle, gunMetni, gunMetninden } from "../src/lib/donem";
import { hedefGorunumu } from "../src/lib/kullanim/olay";
import { MENU_ADRESLERI, MENU_KATALOGU } from "../src/lib/menu/katalog";

/**
 * ============================================================================
 *  KULLANIM İZİ BEKÇİSİ (kullanıcı kararı 13.10.2026)
 * ----------------------------------------------------------------------------
 *  İz iş verisi TAŞIMAZ ve kimlik tarayıcıdan ALINMAZ. Değer testleri saf
 *  gövdeyi çağırır (`lib/kullanim/olay.ts`); kaynak ölçütleri yorumsuz metinde,
 *  KULLANIMA bağlı (anayasa: desen değil çağrı aranır).
 * ============================================================================
 */

let basarisiz = 0;
let calisan = 0;
function kontrol(ad: string, kosul: boolean, ayrinti?: unknown) {
  calisan++;
  if (kosul) console.log(`  OK    ${ad}`);
  else {
    basarisiz++;
    console.log(`  HATA  ${ad}`);
    if (ayrinti !== undefined) console.log("        ", JSON.stringify(ayrinti));
  }
}
const yorumsuz = (yol: string) =>
  kaynakOku(yol).replace(/\r\n/g, "\n").replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1 ");

console.log("\nKULLANIM İZİ BEKÇİSİ\n");

console.log("1) SAYFA KALIBI — kayıt kimliği ve sorgu dizesi iz'e girmez");
kontrol("satış detayı kalıba iner, sorgu ve # atılır", sayfaKalibi("/satislar/cmsrg9jek000104ladtrhgfd8?q=11600993042#ust") === "/satislar/:id", sayfaKalibi("/satislar/cmsrg9jek000104ladtrhgfd8?q=11600993042#ust"));
kontrol("  ...sipariş no parçası da kimlik sayılır", sayfaKalibi("/okut/11600993042") === "/okut/:id");
kontrol("  ...ortadaki kimlik kalıba iner, sondaki sayfa adı kalır", sayfaKalibi("/alimlar/cmv0vqt0r000006jsaeldp5j0/mal-kabul") === "/alimlar/:id/mal-kabul");
kontrol("  ...rakamsız yol olduğu gibi kalır (küçük harfle)", sayfaKalibi("/Hakedis") === "/hakedis");
kontrol("  ...mutlak adreste yalnız yol", sayfaKalibi("https://bezirga.com/hakedis?sekme=detay") === "/hakedis");
kontrol("  ...kök «/»", sayfaKalibi("/") === "/" && sayfaKalibi("/?pencere=BU_AY") === "/");

console.log("\n2) DÜĞME YAZISI — rakam sızmaz");
kontrol("sipariş no «#» olur", hedefTemizle("İptal et 11600993042") === "İptal et #");
kontrol("  ...tutar da «#»", hedefTemizle("Öde ₺1.234,56") === "Öde ₺#.#,#");
kontrol("  ...boşluk sadeleşir", hedefTemizle("  Satış\n   ekle ") === "Satış ekle");
kontrol("  ...boş yazı → hedef yok", hedefTemizle("   ") === null && hedefTemizle(null) === null);
kontrol("  ...uzun yazı 60'ta kesilir", (hedefTemizle("a".repeat(200)) ?? "").length === 60);

console.log("\n3) BAĞLANTI HEDEFİ");
kontrol("site içi bağlantı → kalıp", baglantiHedefi("/satislar/abc123?x=1", "https://bezirga.com") === "→ /satislar/:id");
kontrol("  ...site dışı → kod (metin değil)", baglantiHedefi("https://www.trendyol.com/x/123", "https://bezirga.com") === DIS_BAGLANTI);

console.log("\n4) CİHAZ — arayüzün kırılımlarıyla aynı (md 768 · lg 1024)");
kontrol("767 telefon · 768 tablet · 1023 tablet · 1024 masaüstü",
  cihazSec(767) === "TELEFON" && cihazSec(768) === "TABLET" && cihazSec(1023) === "TABLET" && cihazSec(1024) === "MASAUSTU");

console.log("\n5) SUNUCU PAKETİ YENİDEN SÜZER — tarayıcının söylediği olduğu gibi yazılmaz");
const s = paketiSuz([
  { tur: "SAYFA", sayfa: "/satislar/999888?q=gizli", oncekiSayfa: "/kart/cm123abc", cihaz: "TELEFON" },
  { tur: "TIKLAMA", sayfa: "/hakedis", hedef: "→ /satislar/11600993042", cihaz: "MASAUSTU" },
  { tur: "TIKLAMA", sayfa: "/hakedis", hedef: "Sipariş 4168771298 iptal", cihaz: "MASAUSTU" },
  { tur: "TIKLAMA", sayfa: "/hakedis", hedef: "   ", cihaz: "MASAUSTU" },
  { tur: "HACK", sayfa: "/", cihaz: "MASAUSTU" },
  { tur: "SAYFA", sayfa: "/", cihaz: "UZAY" },
  { tur: "TIKLAMA", sayfa: "/x", hedef: "Kaydet", oncekiSayfa: "/y", cihaz: "TABLET" },
]);
kontrol("sayfa ve önceki sayfa sunucuda kalıba iner", s[0]?.sayfa === "/satislar/:id" && s[0]?.oncekiSayfa === "/kart/:id", s[0]);
kontrol("  ...tarayıcıdan gelen bağlantı hedefi YENİDEN kalıba iner", s[1]?.hedef === "→ /satislar/:id", s[1]);
kontrol("  ...düğme yazısındaki rakam sunucuda da gizlenir", s[2]?.hedef === "Sipariş # iptal", s[2]);
kontrol("  ...hedefsiz tıklama · bilinmeyen tür · bilinmeyen cihaz ATILIR (4 olay kalır)", s.length === 4, s.length);
kontrol("  ...tıklamada önceki sayfa yazılmaz", s[3]?.oncekiSayfa === null && s[3]?.hedef === "Kaydet", s[3]);
kontrol("  ...dizi değilse boş", paketiSuz({ olaylar: [] }).length === 0 && paketiSuz(null).length === 0);
const cok = Array.from({ length: KULLANIM_PAKET_SINIRI + 20 }, () => ({ tur: "SAYFA", sayfa: "/", cihaz: "MASAUSTU" }));
kontrol(`  ...paket sınırı (${KULLANIM_PAKET_SINIRI}) aşılmaz`, paketiSuz(cok).length === KULLANIM_PAKET_SINIRI);

console.log("\n6) UÇ — kimlik OTURUMDAN, paket süzülür");
const uc = yorumsuz("src/app/api/kullanim/route.ts");
kontrol("oturum yoksa hiçbir şey yazılmaz", /const baglam = await yetkiBaglami\(\);\s*if \(!baglam\) return new Response\(null, \{ status: 204 \}\);/.test(uc));
kontrol("  ...firma ve kullanıcı oturumdan (tarayıcıdan değil)", /companyId: baglam\.companyId,\s*userId: baglam\.kullaniciId,/.test(uc) && !/companyId: o\./.test(uc) && !/userId: o\./.test(uc));
kontrol("  ...yazılan küme süzülmüş paket", /const olaylar = paketiSuz\(/.test(uc) && /data: olaylar\.map\(/.test(uc));
kontrol("  ...hata YUTULMAZ, sunucu kaydına tam yazılır", /catch \(hata\) \{\s*console\.error\("\[kullanim\] iz yazılamadı:", hata\);/.test(uc));

console.log("\n7) TARAYICI — yalnız tıklama, yazma alanı dinlenmez");
const bilesen = yorumsuz("src/components/kullanim-izi.tsx");
kontrol("tıklama dinleniyor", /document\.addEventListener\("click", tikla/.test(bilesen));
kontrol("  ...tuş/yazma olayı DİNLENMİYOR", !/addEventListener\("(input|keydown|keyup|keypress|change|paste)"/.test(bilesen));
kontrol("  ...input/textarea değeri OKUNMUYOR", !/\.value\b/.test(bilesen));
const yerlesim = yorumsuz("src/app/layout.tsx");
kontrol("yerleşimde bir kez bağlı", (yerlesim.match(/<KullanimIzi \/>/g) ?? []).length === 1);

console.log("\n8) FİRMA RAPORU — saf kurallar (K334-③; hedef ayrımı ORTAK gövdeden, olay.ts)");
kontrol("bilinmeyen/eksik sekme ilk sekmeye düşer", kullanimSekmesi(undefined) === "sayfalar" && kullanimSekmesi("hack") === "sayfalar" && kullanimSekmesi("dugmeler") === "dugmeler");
kontrol("menü adı TAM kalıpla eşleşir", sayfaMenuAnahtari("/satislar") === "satislar" && sayfaMenuAnahtari("/ayarlar/kullanim") === "kullanimIzi");
kontrol("  ...kayıt detayı menü adı ALMAZ (liste ile detay aynı satıra yazılmaz)", sayfaMenuAnahtari("/satislar/:id") === null);
kontrol("hedef: site dışı kod · bağlantı kalıbı · düğme yazısı ayrılır",
  hedefGorunumu(DIS_BAGLANTI).tur === "DIS" &&
  JSON.stringify(hedefGorunumu("→ /satislar/:id")) === JSON.stringify({ tur: "BAGLANTI", kalip: "/satislar/:id" }) &&
  JSON.stringify(hedefGorunumu("Onayla")) === JSON.stringify({ tur: "DUGME", metin: "Onayla" }));
kontrol("  ...okla başlayıp «/» ile sürmeyen yazı DÜĞMEDİR", hedefGorunumu("→ ileri").tur === "DUGME");
kontrol("pay: bir ondalık", payYuzde(1, 3) === 33.3 && payYuzde(3, 3) === 100);
kontrol("  ...toplam sıfırsa null (%0 değil)", payYuzde(0, 0) === null && payYuzde(5, 0) === null);
kontrol("saat dilimi farkı İstanbul'dan ölçülür (yaz ve kış aynı +03:00)",
  isSaatDilimiFarki(new Date("2026-10-14T12:00:00Z")) === "+03:00" && isSaatDilimiFarki(new Date("2027-01-15T23:30:00Z")) === "+03:00",
  [isSaatDilimiFarki(new Date("2026-10-14T12:00:00Z")), isSaatDilimiFarki(new Date("2027-01-15T23:30:00Z"))]);
const yuzElli = Array.from({ length: KULLANIM_LISTE_SINIRI + 50 }, (_, i) => ({ ad: `s${i}`, adet: (i % 7) + 1 }));
const liste = kullanimListele(yuzElli);
const beklenenToplam = yuzElli.reduce((t, s) => t + s.adet, 0);
kontrol(`liste: çizim ${KULLANIM_LISTE_SINIRI} satırda kesilir`, liste.satirlar.length === KULLANIM_LISTE_SINIRI, liste.satirlar.length);
kontrol("  ...farklı sayısı ve TOPLAM kesilmeden önce, kümenin tamamından (İlke #15)",
  liste.farkli === yuzElli.length && liste.toplam === beklenenToplam, { farkli: liste.farkli, toplam: liste.toplam, beklenenToplam });
kontrol("  ...büyükten küçüğe, eşitlikte ada göre",
  liste.satirlar[0].adet === 7 && liste.satirlar.every((s, i, a) => i === 0 || a[i - 1].adet > s.adet || (a[i - 1].adet === s.adet && a[i - 1].ad.localeCompare(s.ad, "tr") <= 0)));

console.log("\n9) RAPOR — sözlük (dinamik anahtarlar i18n taramasına girmiyor)");
const tr = JSON.parse(kaynakOku("messages/tr.json")) as Record<string, Record<string, unknown>>;
const en = JSON.parse(kaynakOku("messages/en.json")) as Record<string, Record<string, unknown>>;
const trK = tr.Kullanim as Record<string, Record<string, string>> | undefined;
kontrol("her sekmenin etiketi ve notu Türkçe sözlükte dolu",
  KULLANIM_SEKMELERI.length === 4 && KULLANIM_SEKMELERI.every((s) => !!trK?.sekme?.[s] && !!trK?.sekmeNotu?.[s]));
const anahtarlar = (o: unknown, on = ""): string[] =>
  o && typeof o === "object" ? Object.entries(o).flatMap(([k, v]) => (typeof v === "object" ? anahtarlar(v, `${on}${k}.`) : [`${on}${k}`])) : [];
const trA = anahtarlar(tr.Kullanim).sort().join(",");
kontrol("  ...İngilizce iskelet aynı anahtarları taşır", trA.length > 0 && trA === anahtarlar(en.Kullanim).sort().join(","));
kontrol("  ...menü etiketi iki sözlükte de var", typeof tr.Menu?.kullanimIzi === "string" && (tr.Menu.kullanimIzi as string) !== "" && typeof en.Menu?.kullanimIzi === "string");

console.log("\n10) RAPOR — veri katmanı: her sorgu FİRMAYA bağlı");
const veri = yorumsuz("src/lib/kullanim/rapor-veri.ts");
const sorgular = [...veri.matchAll(/prisma\.kullanimOlayi\.(groupBy|findFirst|findMany|count)\(/g)];
kontrol("taban dolu: en az 6 sorgu bulundu", sorgular.length >= 6, sorgular.length);
/** `where: kosul` ancak `kosul` ortak gövdeden kurulduysa geçerli — tanım ayrıca aranır. */
const kosulTanimli = /const kosul = kullanimKosulu\(companyId, aralik\);/.test(veri);
for (const s of sorgular) {
  const bas = s.index!;
  const sonlar = [veri.indexOf("});", bas), veri.indexOf("}),\n", bas)].filter((i) => i > bas);
  const blok = veri.slice(bas, Math.min(...sonlar));
  const tamam =
    /where: kullanimKosulu\(companyId, aralik\)|AND: \[kullanimKosulu\(companyId, aralik\)|where: \{ companyId \}/.test(blok) ||
    (kosulTanimli && /where: kosul,/.test(blok));
  kontrol(`  ...${s[1]} @${bas} firma koşulu taşıyor`, tamam, blok.slice(0, 160));
}
const ham = [...veri.matchAll(/FROM KullanimOlayi\s+WHERE ([^`]*)`/g)];
kontrol("ham sayımların DÖRDÜ de firmaya bağlı (aktif gün ×2 · grafik gün · grafik saat)", ham.length === 4 && ham.every((h) => h[1].trimStart().startsWith("companyId = ${companyId}")), ham.map((h) => h[1]));
kontrol("ortak koşul firma + dönem", /return \{ companyId, \.\.\.\(aralik \? \{ createdAt: aralik \} : \{\}\) \};/.test(veri));
kontrol("liste tek gövdeden (tavan + toplam kuralı)", /const listele = kullanimListele;/.test(veri));
kontrol("kişi adı FİRMA ÜYELİĞİNDEN (çok-firma: başka firmanın kişisi okunmaz)",
  /prisma\.userCompanyRole\.findMany\(\{\s*where: \{ companyId, userId: \{ in: idler \} \}/.test(veri) && !/prisma\.user\.(findMany|findFirst|findUnique)\(/.test(veri));
kontrol("  ...üyeliği kalkmış kişinin satırı adsız kalmaz (İlke #14)", /\{s\.kullaniciId === null \|\| s\.ad === "" \? <span[^>]*>\{t\("silinmisKullanici"\)\}/.test(yorumsuz("src/app/ayarlar/kullanim/page.tsx")));

console.log("\n11) RAPOR — ekran");
const ekran = yorumsuz("src/app/ayarlar/kullanim/page.tsx");
kontrol("izin: ayar.yaz (kullanıcı kararı 14.10.2026)", /const baglam = await sayfaIzni\("ayar\.yaz"\);/.test(ekran));
kontrol("  ...firma OTURUMDAN (adresten değil)",
  /kullanimOzeti\(baglam\.companyId, pencere\.aralik\)/.test(ekran) && /sekmeVerisi\(sekme, baglam\.companyId, pencere\.aralik, q, ekKaliplar\)/.test(ekran) && /ilkIzAni\(baglam\.companyId\)/.test(ekran));
kontrol("  ...kutucuklar ARAMADAN bağımsız (özete q gitmiyor)", !/kullanimOzeti\([^)]*\bq\b/.test(ekran));
const temel = ekran.match(/const TEMEL = "([^"]+)";/)?.[1];
kontrol("  ...ekran adresi menüdeki adresle aynı", temel === MENU_ADRESLERI.kullanimIzi && temel === "/ayarlar/kullanim", temel);
kontrol("  ...arama kutusu ortak bileşen, adrese yazıyor", /<KodAramaKutusu\s+temelAdres=\{TEMEL\}\s+baslangic=\{p\.q \?\? ""\}/.test(ekran));
/**
 * Sekme başına AYRI blok (anayasa: aynı desen birden çok yerde geçiyorsa her yer
 * ayrı sınanır). Blok: o sekmenin dalı → bir sonraki dal ya da `const tasinan`.
 */
const dallar: [string, RegExp][] = [
  ["sayfalar", /\} else if \(veri\.sekme === "sayfalar"\) \{/],
  ["dugmeler", /\} else if \(veri\.sekme === "dugmeler"\) \{/],
  ["gecisler", /\} else if \(veri\.sekme === "gecisler"\) \{/],
  ["kullanicilar", /\} else \{\s*icerik = \(/],
];
const dalBaslari = dallar.map(([, d]) => ekran.search(d));
const dalSonu = ekran.indexOf("const tasinan");
kontrol("  ...dört sekme dalı bulundu", dalBaslari.every((b) => b >= 0) && dalSonu > Math.max(...dalBaslari), dalBaslari);
dallar.forEach(([ad], i) => {
  const blok = ekran.slice(dalBaslari[i], i + 1 < dallar.length ? dalBaslari[i + 1] : dalSonu);
  kontrol(`  ...«${ad}» sekmesinde TOPLAM satırı (İlke #15)`, /<TableCell>\{t\("toplam"\)\}<\/TableCell>|\{toplamSatiri\(\d, veri\.liste\.toplam\)\}/.test(blok));
});
kontrol("  ...ortak toplam satırı toplamı yazıyor", /const toplamSatiri = \(sutun: number, toplam: number\) => \(\s*<TableRow[^>]*>\s*<TableCell colSpan=\{sutun\}>\{t\("toplam"\)\}<\/TableCell>\s*<TableCell className="text-right tabular-nums">\{bicim\.sayi\(toplam\)\}<\/TableCell>/.test(ekran));
kontrol("  ...kullanıcı toplamı kümeden (çizilen satırlardan değil)",
  /\{bicim\.sayi\(veri\.liste\.toplamSayfa\)\}/.test(ekran) && /\{bicim\.sayi\(veri\.liste\.toplamTiklama\)\}/.test(ekran) && !/veri\.liste\.satirlar\.reduce/.test(ekran));
kontrol("  ...izin doğum tarihi yazıyor", /\{ilk \? t\("izDogumu", \{ tarih: bicim\.tarihSaat\(ilk\) \}\) : t\("izYok"\)\}/.test(ekran));
kontrol("menüde Ayarlar grubunda", MENU_KATALOGU.some((o) => o.anahtar === "kullanimIzi" && o.varsayilanGrup === "grupAyarlar"));

console.log("\n12) GRAFİKLER — saf kurallar (K334-③ görsel turu)");
const G = (m: string) => gunMetninden(m)!;
const ham3 = [
  { gun: "2026-10-13", tur: "SAYFA" as const, adet: 5 },
  { gun: "2026-10-13", tur: "TIKLAMA" as const, adet: 7 },
  { gun: "2026-10-15", tur: "SAYFA" as const, adet: 2 },
  { gun: "2026-10-20", tur: "SAYFA" as const, adet: 99 }, // bugünden SONRA — eksene girmez
];
const e3 = zamanEkseni(ham3, G("2026-10-10"), G("2026-10-31"), G("2026-10-13"), G("2026-10-15"));
kontrol("iz olmayan gün 0 olarak YER TUTAR (13 · 14 · 15 → 3 sütun, ortadaki 0)",
  e3.kova === "GUN" && e3.sutunlar.map((s) => `${s.anahtar}:${s.sayfa}+${s.tiklama}`).join(" ") === "2026-10-13:5+7 2026-10-14:0+0 2026-10-15:2+0",
  e3.sutunlar.map((s) => `${s.anahtar}:${s.sayfa}+${s.tiklama}`));
kontrol("  ...izin DOĞUMUNDAN önce ve BUGÜNDEN sonra eksen yok (orada 0 bir sonuç değil)", e3.sutunlar[0]?.anahtar === "2026-10-13" && e3.sutunlar.at(-1)?.anahtar === "2026-10-15");
kontrol("  ...pencere tamamen doğumdan önceyse sütun yok", zamanEkseni(ham3, G("2026-10-01"), G("2026-10-05"), G("2026-10-13"), G("2026-10-15")).sutunlar.length === 0);
const uzunHam = Array.from({ length: 90 }, (_, i) => ({ gun: gunMetni(gunEkle(G("2026-08-01"), i)), tur: "SAYFA" as const, adet: 1 }));
const e90 = zamanEkseni(uzunHam, G("2026-08-01"), G("2026-10-29"), G("2026-08-01"), G("2026-10-29"));
kontrol(`${GUNLUK_SUTUN_TAVANI} günü aşan dönem AY kovasına toplanır (ağu · eyl · eki)`,
  e90.kova === "AY" && e90.sutunlar.map((s) => `${s.anahtar}:${s.sayfa}`).join(" ") === "2026-08:31 2026-09:30 2026-10:29",
  e90.sutunlar.map((s) => `${s.anahtar}:${s.sayfa}`));
kontrol("  ...toplama SAYI KAYBETMEZ (90 gün = 90 olay) ve ay kovası ilk/son günü taşır",
  e90.sutunlar.reduce((t, s) => t + s.sayfa, 0) === 90 && gunMetni(e90.sutunlar[1]!.ilk) === "2026-09-01" && gunMetni(e90.sutunlar[1]!.son) === "2026-09-30");
const tam62 = zamanEkseni([], G("2026-08-01"), gunEkle(G("2026-08-01"), GUNLUK_SUTUN_TAVANI - 1), G("2026-08-01"), G("2026-12-31"));
kontrol(`  ...tam ${GUNLUK_SUTUN_TAVANI} gün hâlâ GÜN kovası (sınırın iki yakası)`, tam62.kova === "GUN" && tam62.sutunlar.length === GUNLUK_SUTUN_TAVANI);
const sa = saatEkseni([{ saat: 0, adet: 4 }, { saat: 23, adet: 1 }, { saat: 9, adet: 3 }, { saat: 9, adet: 2 }, { saat: 24, adet: 50 }, { saat: -1, adet: 50 }]);
kontrol("saat: 24 kova, aynı saat toplanır, aralık dışı atılır", sa.length === 24 && sa[0] === 4 && sa[9] === 5 && sa[23] === 1 && sa.reduce((t, x) => t + x, 0) === 10, sa);
kontrol("sütun boyu: en büyük %100 · sıfır 0 · küçük değer en az %3 · en büyük 0 → 0",
  sutunYuzdesi(828, 828) === 100 && sutunYuzdesi(0, 828) === 0 && sutunYuzdesi(1, 828) === 3 && sutunYuzdesi(414, 828) === 50 && sutunYuzdesi(5, 0) === 0);

console.log("\n13) GRAFİKLER — ekran bağları");
kontrol("grafik sayımı FİRMAYA ve DÖNEME bağlı, aramadan BAĞIMSIZ", /grafikSayimlari\(baglam\.companyId, pencere\.aralik\),/.test(ekran) && !/grafikSayimlari\([^)]*\bq\b/.test(ekran));
kontrol("  ...eksen izin doğumu ile bugüne sıkıştırılıyor",
  /zamanEkseni\(grafik\.gunler, pencere\.pencere\?\.ilkGun \?\? dogumGun, pencere\.pencere\?\.sonGun \?\? bugunGun, dogumGun, bugunGun\)/.test(ekran));
kontrol("  ...gün sütunu ekranı O GÜNE süzer (özel aralık, iki uç kovanın kendi günleri)",
  /pencere: "OZEL", baslangic: gunMetni\(s\.ilk\), bitis: gunMetni\(s\.son\)/.test(ekran));
kontrol("  ...grafikler ve halka çiziliyor (dal ölü değil)",
  /<GunGrafigi\s+sutunlar=\{gunSutunlari\}/.test(ekran) && /<SaatGrafigi\s+saatler=\{saatler\}/.test(ekran) && /<HalkaGrafik\s+dilimler=\{cihazDilimleri\}/.test(ekran) && !/\{false \?/.test(ekran));
kontrol("  ...halka payının paydası BÜTÜN olaylar (kutucuklarla aynı toplam)", /toplam=\{toplamOlay\}/.test(ekran) && /const toplamOlay = ozet\.sayfa \+ ozet\.tiklama;/.test(ekran));
kontrol("  ...halka rengi tek kaynaktan, cihaz başına SABİT (renk varlığı izler)", /renk: KULLANIM_CIHAZ_RENKLERI\[c\]/.test(ekran));
const grafikDosyasi = yorumsuz("src/app/ayarlar/kullanim/grafikler.tsx");
kontrol("  ...grafik dosyasında ham renk yok (renkler.ts tek kaynak)", !/#[0-9a-fA-F]{6}\b/.test(grafikDosyasi) && /KULLANIM_RENKLERI\.sayfa/.test(grafikDosyasi) && /KULLANIM_RENKLERI\.tiklama/.test(grafikDosyasi));
kontrol("  ...iki serili grafikte lejant İKİ seriyi de yazıyor (renk tek başına konuşmaz)", /\{lejantSayfa\}/.test(grafikDosyasi) && /\{lejantTiklama\}/.test(grafikDosyasi));
kontrol("  ...her sütunun üzerine gelince tam cümle (title + erişilebilir ad)", (grafikDosyasi.match(/title=\{s\.ipucu\}\s+aria-label=\{s\.ipucu\}/g) ?? []).length === 1 && /title=\{ipuclari\[i\]\} aria-label=\{ipuclari\[i\]\}/.test(grafikDosyasi));
/** Pay çubuğu dört listenin DÖRDÜNDE de — sekme başına ayrı blok (dal sınırları bölüm 11'den). */
dallar.forEach(([ad], i) => {
  const blok = ekran.slice(dalBaslari[i], i + 1 < dallar.length ? dalBaslari[i + 1] : dalSonu);
  kontrol(`  ...«${ad}» listesinde pay çubuğu (paydası o listenin toplamı)`, /\{payHucresi\(s\.adet, veri\.liste\.toplam\)\}/.test(blok));
});

console.log("\n" + "=".repeat(70));
if (basarisiz === 0) console.log(`TÜM KONTROLLER GEÇTİ (${calisan})`);
else {
  console.log(`${basarisiz} KONTROL BAŞARISIZ (${calisan} içinde)`);
  process.exitCode = 1;
}
