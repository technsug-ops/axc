/**
 * ============================================================================
 *  BUYBOX İSTATİSTİĞİ BEKÇİSİ (K363 Faz 3-b)
 * ----------------------------------------------------------------------------
 *  Saf gövde ÇAĞRILIR, değeri sınanır (çift tetik · değişim · kazanma oranı ·
 *  saatlik/günlük seri). Kaynak taraması yalnız bağlar için (yorumsuz kodda,
 *  kullanım bloğuna daraltılmış): yazma kapıları, uç kapısı, zamanlayıcı,
 *  ekran. Her kuralın İKİ yakası örnekte.
 * ============================================================================
 */
import { existsSync } from "node:fs";

import { kaynakOku } from "./kaynak-oku";
import type { BuyboxDurumu } from "../src/lib/buybox";
import {
  degisimler,
  gunlukSeri,
  kazanmaOrani,
  olcumAlinsinMi,
  olculmeyenler,
  FIYAT_YARISI_ESIGI,
  otomatikGrupla,
  rakipliOzet,
  savasSayilari,
  saatlikSeri,
  type KayitDurumu,
  type OlcumNoktasi,
} from "../src/lib/buybox-istatistik";

let basarisiz = 0;
let calisan = 0;
const BOLUM_SAYISI = 9;
const kosanBolumler: string[] = [];
function kontrol(ad: string, kosul: boolean, ayrinti?: unknown) {
  calisan++;
  if (kosul) console.log(`  OK    ${ad}`);
  else {
    basarisiz++;
    console.log(`  HATA  ${ad}`);
    if (ayrinti !== undefined) console.log("        ", ayrinti);
  }
}
const yorumsuz = (s: string) => s.replace(/\{\/\*[\s\S]*?\*\/\}/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
const blok = (metin: string, capa: string, uzunluk: number) => {
  const i = metin.indexOf(capa);
  return i < 0 ? "" : metin.slice(i, i + uzunluk);
};
const an = (iso: string) => new Date(iso);

// ── ① ÇİFT TETİK ─────────────────────────────────────────────────────────
console.log("\n① çift tetik kapısı");
{
  kontrol("hiç ölçüm yoksa alınır", olcumAlinsinMi(null, an("2026-10-25T10:00:00Z")));
  kontrol("aynı saatte :00 yazdıysa :35 (yedek) ATLANIR", !olcumAlinsinMi(an("2026-10-25T10:00:20Z"), an("2026-10-25T10:35:00Z")));
  kontrol("yedek :35'te yazdıysa SONRAKİ :00 (25 dk sonra) YİNE yazar — birincil kilitlenmez", olcumAlinsinMi(an("2026-10-25T10:35:00Z"), an("2026-10-25T11:00:05Z")));
  kontrol("saatin son saniyesi ile sonraki saatin ilk saniyesi ayrı dilim", olcumAlinsinMi(an("2026-10-25T10:59:59Z"), an("2026-10-25T11:00:00Z")));
  kontrol("aynı saatin içinde 59 dk sonra bile atlanır", !olcumAlinsinMi(an("2026-10-25T10:00:00Z"), an("2026-10-25T10:59:59Z")));
}
kosanBolumler.push("tetik");

// ── ② DEĞİŞİM ────────────────────────────────────────────────────────────
console.log("\n② durum değişimi — yalnız değişen yazılır");
{
  const s = (variantId: string, durum: BuyboxDurumu) => ({ variantId, durum });
  const onceki = new Map<string, KayitDurumu>([
    ["A", "BIRINCI"],
    ["B", "BIRINCI"],
    ["C", "KAYBEDILDI"],
  ]);
  const d = degisimler([s("A", "BIRINCI"), s("B", "KAYBEDILDI"), s("C", "SORGULANAMADI"), s("D", "GORUNMUYOR")], onceki);
  const ids = d.map((x) => x.satir.variantId).sort();
  kontrol("aynı kalan (A) yazılmaz", !ids.includes("A"));
  kontrol("değişen (B) yazılır, önceki/yeni doğru", d.some((x) => x.satir.variantId === "B" && x.onceki === "BIRINCI" && x.yeni === "KAYBEDILDI"));
  kontrol("sorgulanamayan (C) yazılmaz — son bilinen durum geçerli kalır", !ids.includes("C"));
  kontrol("ilk kez görülen (D) başlangıç kaydı: önceki null", d.some((x) => x.satir.variantId === "D" && x.onceki === null && x.yeni === "GORUNMUYOR"));
  kontrol("toplam 2 satır", d.length === 2, ids);
}
kosanBolumler.push("degisim");

// ── ③ RAKİPLİ / KAZANMA ORANI ────────────────────────────────────────────
console.log("\n③ rakipli ürün ve kazanma oranı");
{
  const r = rakipliOzet([
    { durum: "BIRINCI", saticiSayisi: 1 }, // tek satıcı — sayılmaz
    { durum: "BIRINCI", saticiSayisi: null }, // TY çok satıcı
    { durum: "BIRINCI", saticiSayisi: 3 }, // HB 3 satıcı
    { durum: "KAYBEDILDI", saticiSayisi: null },
    { durum: "KAYBEDILDI", saticiSayisi: 4 },
    { durum: "GORUNMUYOR", saticiSayisi: null }, // hüküm yok
    { durum: "SORGULANAMADI", saticiSayisi: null }, // hüküm yok
  ]);
  kontrol("rakipli = kaybedilen + tek satıcılı olmayan birinci (4)", r.rakipli === 4, r);
  kontrol("rakipli birinci = 2 (tek satıcılı birinci SAYILMAZ)", r.rakipliBirinci === 2, r);
  kontrol("oran %50", kazanmaOrani(2, 4) === 50);
  kontrol("rakipli yoksa oran null (0/0 «%0» değildir)", kazanmaOrani(0, 0) === null);
}
kosanBolumler.push("oran");

// ── ④ SERİLER ────────────────────────────────────────────────────────────
console.log("\n④ saatlik / günlük seri — ölçülmeyen dilim uydurulmaz");
{
  const gunBasi = an("2026-10-24T21:00:00Z"); // İstanbul 25.10 00:00
  const o = (iso: string, birinci: number, rakipli = 10, rakipliBirinci = 1): OlcumNoktasi => ({ olculduAt: an(iso), birinci, incelenen: 200, rakipli, rakipliBirinci });
  const olcumler = [
    o("2026-10-24T21:05:00Z", 10), // 00 saati
    o("2026-10-24T22:02:00Z", 11), // 01 saati — ilk
    o("2026-10-24T22:40:00Z", 13, 20, 5), // 01 saati — SON (alınmalı)
    // 02 saati YOK
    o("2026-10-25T00:01:00Z", 12), // 03 saati
    o("2026-10-25T03:30:00Z", 99), // 06 saati — simdi'den SONRA, seriye girmez
  ];
  const simdi = an("2026-10-25T00:30:00Z"); // İstanbul 03:30
  const seri = saatlikSeri(olcumler, gunBasi, simdi);
  kontrol("dilim sayısı şimdiki saate kadar (00–03 = 4)", seri.length === 4, seri.length);
  kontrol("saatin SON ölçümü alınır (01 → 13, ilk 11 değil)", seri[1]?.birinci === 13 && seri[1]?.olcumSayisi === 2);
  kontrol("o saatin oranı son ölçümden (5/20 = %25)", seri[1]?.oran === 25);
  kontrol("ölçülmeyen saat (02) null — önceki değerle DOLDURULMAZ", seri[2]?.birinci === null && seri[2]?.oran === null && seri[2]?.olcumSayisi === 0);
  kontrol("ölçülmeyenler listesi yalnız 02 (ölçüm 00'da başladı)", olculmeyenler(seri, gunBasi).map((n) => n.anahtar).join(",") === "2");
  kontrol("ilk ölçümden ÖNCEKİ dilim kaçırma sayılmaz (başlangıç 01 → 00 listede yok)",
    olculmeyenler(saatlikSeri(olcumler.slice(1), gunBasi, simdi), new Date(gunBasi.getTime() + 3_600_000)).map((n) => n.anahtar).join(",") === "2");
  kontrol("hiç ölçüm yoksa kaçırma da yok (boş liste)", olculmeyenler(seri, null).length === 0);
  kontrol("günün öncesindeki ölçüm sayılmaz", saatlikSeri([o("2026-10-24T20:59:00Z", 50)], gunBasi, simdi).every((n) => n.birinci === null));

  const g1 = an("2026-10-23T21:00:00Z");
  const g2 = an("2026-10-24T21:00:00Z");
  const g3 = an("2026-10-25T21:00:00Z");
  const gunluk = gunlukSeri(
    [o("2026-10-24T05:00:00Z", 10, 10, 2), o("2026-10-24T06:00:00Z", 13, 30, 3), o("2026-10-25T05:00:00Z", 7)],
    [g1, g2, g3],
    an("2026-10-25T22:00:00Z"),
  );
  kontrol("günlük değer ORTALAMA (10 ve 13 → 11,5)", gunluk[0]?.birinci === 11.5, gunluk[0]);
  kontrol("günlük oran TOPLAMLARIN oranı (5/40 = %12,5; oranların ortalaması %15 olurdu)", gunluk[0]?.oran === 12.5, gunluk[0]?.oran);
  kontrol("ikinci gün kendi ölçümü (7)", gunluk[1]?.birinci === 7);
  kontrol("ölçümsüz gün null", gunluk[2]?.birinci === null && gunluk[2]?.olcumSayisi === 0);
}
kosanBolumler.push("seri");

// ── ⑤ VERİ (yazma) ───────────────────────────────────────────────────────
console.log("\n⑤ veri — yazma kapıları");
{
  const v = yorumsuz(kaynakOku("src/lib/buybox-istatistik-verisi.ts"));
  const yaz = blok(v, "export async function buyboxOlcumuYaz(", 4200);
  const iCift = yaz.indexOf('return { kanal, durum: "ATLANDI", sebep: "CIFT_TETIK" }');
  const iHepsi = yaz.indexOf('if (ozet.sorgulanamadi === ozet.incelenen) return { kanal, durum: "ATLANDI", sebep: "HEPSI_SORGULANAMADI"');
  const iYaz = yaz.indexOf("await prisma.$transaction(");
  kontrol("çift tetik kapısı yazımdan ÖNCE", iCift >= 0 && iYaz >= 0 && iCift < iYaz);
  kontrol("hepsi sorgulanamadıysa ölçüm YAZILMAZ (sahte çukur yok) — yazımdan ÖNCE", iHepsi >= 0 && iYaz >= 0 && iHepsi < iYaz);
  kontrol("çift tetik ortak gövdeden (olcumAlinsinMi)", /if \(!olcumAlinsinMi\(son\?\.olculduAt \?\? null, simdi\)\)/.test(yaz));
  kontrol("ekranla AYNI küme: rafta olan (yalnizStoklu: true)", /buyboxUrunleri\(kanal, \{ yalnizStoklu: true \}\)/.test(yaz));
  kontrol("değişimler saf gövdeden, önceki = en yeni satır (artan sırada üstüne yazılır)", /const yazilacak = degisimler\(sonuc\.satirlar, oncekiler\);/.test(yaz) && /orderBy: \{ olculduAt: "asc" \}/.test(yaz));
  kontrol("kazanma oranı sayıları ölçüme yazılır", /\.\.\.rakipliOzet\(sonuc\.satirlar\),/.test(yaz));
  kontrol("tek işlem + açık tavan (yarım ölçüm yok)", /\{ timeout: 60_000 \}/.test(yaz));
  kontrol("kanala YAZAN hiçbir çağrı yok", !/StokFiyatGonder|stokFiyatGonder|method: "POST"/.test(v));
  const hepsi = blok(v, "export async function buyboxOlcumleriniYaz(", 900);
  kontrol("bir kanal düşerse öteki yine koşar (catch kanal başına)", /await buyboxOlcumuYaz\(kanal, simdi\)\.catch\(/.test(hepsi) && /for \(const kanal of BUYBOX_KANALLARI\)/.test(hepsi));
}
kosanBolumler.push("veri");

// ── ⑥ UÇ + ZAMANLAYICI ───────────────────────────────────────────────────
console.log("\n⑥ uç + zamanlayıcı");
{
  const u = yorumsuz(kaynakOku("src/app/api/cron/buybox-olcum/route.ts"));
  kontrol("sır kapısı: tutmayan istek 404", /if \(sir === "" \|\| gelen !== `Bearer \$\{sir\}`\) \{\s*return new NextResponse\(null, \{ status: 404 \}\);/.test(u));
  kontrol("düşen kanal 500 (yarım ölçüm yeşil görünmez); hepsi sorgulanamadı da düşmüş sayılır",
    /k\.durum === "COKTU" \|\| \(k\.durum === "ATLANDI" && k\.sebep === "HEPSI_SORGULANAMADI"\)/.test(u) && /status: dusen > 0 \? 500 : 200/.test(u));
  const p = yorumsuz(kaynakOku("src/proxy.ts"));
  kontrol("uç oturum kapısının açık yollarında", p.includes('"/api/cron/buybox-olcum",'));
  const y = existsSync(".github/workflows/buybox-olcum.yml") ? kaynakOku(".github/workflows/buybox-olcum.yml") : "";
  kontrol("yedek zamanlayıcı saatte bir, :35 (birincil :00 ile çakışmaz)", /- cron: "35 \* \* \* \*"/.test(y));
  kontrol("yedek doğru ucu çağırır ve 200 dışını kırmızı sayar", /\/api\/cron\/buybox-olcum"/.test(y) && /test "\$KOD" = "200"/.test(y));
}
kosanBolumler.push("uc");

// ── ⑦ EKRAN ──────────────────────────────────────────────────────────────
console.log("\n⑦ ekran — grafik · aralık · ölçülmedi");
{
  const s = yorumsuz(kaynakOku("src/app/rapor/buybox/page.tsx"));
  kontrol("sayfa geçmişi çizer, kazanma oranı CANLI sorgudan", /<BuyboxGecmisi[\s\S]{0,200}canli=\{rakipliOzet\(sonuc\.satirlar\)\}/.test(s));
  kontrol("geçmiş YALNIZ istenince (grafik=1) çizilir — varsayılan kapalı", /const grafikAcik = p\.grafik === "1";/.test(s) && /\{grafikAcik \? \(\s*<BuyboxGecmisi/.test(s));
  kontrol("düğme sayı kutularının yanında, adresi aç/kapa", /href=\{adres\(\{ grafik: grafikAcik \? undefined : "1" \}\)\}/.test(s) && /\{grafikAcik \? t\("grafikGizle"\) : t\("grafikGoster"\)\}/.test(s));
  kontrol("aralık adreste taşınır (arama kutusu dahil)", /aralik: aralik === "bugun" \? undefined : aralik/.test(s) && /tasinanlar=\{\{ kanal, liste, \.\.\.\(tasinan\.aralik/.test(s));
  const g = yorumsuz(kaynakOku("src/app/rapor/buybox/buybox-gecmisi.tsx"));
  kontrol("bugün → saatlik seri; 7/30 gün → günlük seri", /if \(aralik === "bugun"\) \{\s*seri = saatlikSeri\(/.test(g) && /seri = gunlukSeri\(/.test(g));
  kontrol("iki grafik: Buybox bizde + kazanma oranı", /noktalar=\{birinciNoktalari\}/.test(g) && /noktalar=\{oranNoktalari\}/.test(g));
  kontrol("ölçülmeyen dilim adıyla yazılır", /\{eksik\.length > 0 \? \(/.test(g) && /t\("olculmedi", \{ sayi: eksik\.length/.test(g));
  kontrol("kaçırma sayımı İLK ölçümden başlar, başlangıç ayrıca yazılır",
    /const eksik = olculmeyenler\(seri, baslangic\);/.test(g) && /const ilk = await ilkOlcumAni\(kanal\);/.test(g) && /\{baslangicGorunuyor && ilk \? \(/.test(g));
  kontrol("oran yoksa «—» (0/0 %0 yazılmaz)", /oran === null \? "—" : bicim\.yuzde\(oran\)/.test(g));
  const tr = JSON.parse(kaynakOku("messages/tr.json")) as Record<string, Record<string, string>>;
  const gerekli = ["gecmisBaslik", "gecmisNotu_bugun", "gecmisNotu_hafta", "gecmisNotu_ay", "aralik_bugun", "aralik_hafta", "aralik_ay", "kazanmaOrani", "grafikBirinci", "grafikOran", "gecmisBos", "olculmedi"];
  const eksik = gerekli.filter((k) => !(tr.Buybox?.[k] ?? "").length);
  kontrol("sözlük: geçmiş metinleri dolu", eksik.length === 0, eksik);
  kontrol("ekran notu artık «hiçbir şey kaydedilmez» DEMİYOR", !/hiçbir şey kaydedilmez/.test(tr.Buybox?.notu ?? ""));
}
kosanBolumler.push("ekran");

// ── ⑧ PANEL «BUYBOX SAVAŞLARI» (28.10.2026) ─────────────────────────────
console.log("\n⑧ panel — Buybox savaşları kutusu");
{
  const k = (onceki: KayitDurumu | null, yeni: KayitDurumu) => ({ onceki, yeni });
  const sv = savasSayilari([
    k(null, "BIRINCI"), // başlangıç kaydı — savaş DEĞİL
    k("KAYBEDILDI", "BIRINCI"), // alındı
    k("GORUNMUYOR", "BIRINCI"), // alındı
    k("BIRINCI", "KAYBEDILDI"), // kaybedildi
    k("BIRINCI", "GORUNMUYOR"), // görünmez olmak da kayıp
    k("KAYBEDILDI", "GORUNMUYOR"), // bizde değildi, hâlâ değil — hiçbiri
  ]);
  kontrol("alınan 2 (başlangıç kaydı sayılmaz)", sv.alinan === 2, sv);
  kontrol("kaybedilen 2 (görünmez olmak dahil; bizde olmayanın değişimi sayılmaz)", sv.kaybedilen === 2, sv);
  kontrol("boş liste 0 / 0", JSON.stringify(savasSayilari([])) === JSON.stringify({ alinan: 0, kaybedilen: 0 }));

  const v = yorumsuz(kaynakOku("src/lib/buybox-istatistik-verisi.ts"));
  const oz = blok(v, "export async function panelBuyboxOzeti(", 1500);
  kontrol("panel özeti kanala soru sormaz (canlı sorgu yok)", oz.length > 0 && !/buyboxDurumlari\(|buyboxUrunleri\(/.test(oz));
  kontrol("bugün sayıları saf gövdeden (savasSayilari)", /const savas = savasSayilari\(kayitlar\.map\(/.test(oz));
  kontrol("son ölçüm EN YENİ satır", /orderBy: \{ olculduAt: "desc" \}/.test(oz));
  const o = yorumsuz(kaynakOku("src/lib/buybox-otomatik-verisi.ts"));
  const og = blok(o, "export async function otomatikGonderimSayilari(", 900);
  kontrol("otomatik sayı yalnız kanalın KABUL ettiği gönderim", /d\.sonuc === "GONDERILDI"\) sayac\[d\.kanal\] \+= 1;/.test(og));
  const kutu = yorumsuz(kaynakOku("src/app/buybox-savaslari.tsx"));
  kontrol("rakamın adresi sahibinden (buyboxAdresi)", /href=\{buyboxAdresi\(kanal, liste\)\}/.test(kutu));
  kontrol("sıfır rakam bağlantı olmaz", /return sayi > 0 \? \(\s*<Link href=\{buyboxAdresi\(kanal, liste\)\}/.test(kutu));
  kontrol("hiç ölçülmemiş kanal rakam uydurmaz, söyler", /\{k\.son === null \? \(\s*<td[^>]*>\{t\("buyboxOlculmedi"\)\}/.test(kutu));
  kontrol("son ölçüm anı ve tarih süzgecinden bağımsızlık yazılır", /t\("buyboxSonOlcum", \{ an: bicim\.tarihSaat\(sonOlcum\) \}\)/.test(kutu) && /t\("buyboxDonemNotu"\)/.test(kutu));
  const p = yorumsuz(kaynakOku("src/app/page.tsx"));
  kontrol("panelde kutu, açtığı ekranın izniyle", /const buyboxGorunur = await izinVarMi\("rapor\.gor"\);/.test(p) && /\{blokSirasi === 0 && buyboxGorunur \? \(\s*<Suspense fallback=\{<Skeleton[^}]*\}>\s*<BuyboxSavaslari \/>/.test(p));
  const sayfa = yorumsuz(kaynakOku("src/app/rapor/buybox/page.tsx"));
  kontrol("Buybox ekranının yolu AYNI sabitten", /const YOL = BUYBOX_YOLU;/.test(sayfa));
}
kosanBolumler.push("panel");

// ── ⑨ OTOMATİK DEĞİŞİKLİKLER ÜRÜN BAŞINA (28.10.2026) ──────────────────────
console.log("\n⑨ otomatik değişiklikler — ürün başına tek satır");
{
  const k = (variantId: string, saat: string, eski: number | null, yeni: number, gonderildi = true) => ({ variantId, an: an(`2026-10-28T${saat}:00Z`), eski, yeni, gonderildi });
  const g = otomatikGrupla([
    k("ANKER", "10:00", 2174, 2147), // SIRASIZ verildi — gruplama sıralar
    k("YUI", "05:00", 2130, 2110),
    k("ANKER", "06:18", 2195, 2198),
    k("ANKER", "08:41", 2198, 2174),
    k("ANKER", "11:00", 2147, 2140, false), // reddedildi — son fiyat SAYILMAZ
    k("RED", "09:00", 500, 490, false),
    k("XIA", "12:00", 21300, 21239),
    k("XIA", "12:30", 21239, 21212),
    k("BIR", "13:00", 100, 99), // YUI ile EŞİT (1 kabul), daha yeni
  ]);
  const a = g.find((x) => x.variantId === "ANKER");
  kontrol("ürün başına TEK grup (5 ürün)", g.length === 5, g.map((x) => x.variantId));
  kontrol("en çok kabul edilen üstte (ANKER 3)", g[0]?.variantId === "ANKER", g.map((x) => x.variantId));
  kontrol("2 kabullü XIA, 1 kabullülerden önce", g[1]?.variantId === "XIA");
  kontrol("eşit kabulde EN YENİ önce (BIR 13:00 > YUI 05:00)", g[2]?.variantId === "BIR" && g[3]?.variantId === "YUI", g.map((x) => x.variantId));
  kontrol("ilk fiyat günün EN ERKEN kaydının eskisi (2195)", a?.ilkFiyat === 2195, a?.ilkFiyat);
  kontrol("son fiyat KABUL edilen son gönderim (2147; reddedilen 2140 değil)", a?.sonFiyat === 2147, a?.sonFiyat);
  kontrol("kabul 3, red 1", a?.gonderilen === 3 && a?.reddedilen === 1);
  kontrol("kayıtlar eskiden yeniye", a?.kayitlar.map((x) => x.yeni).join(",") === "2198,2174,2147,2140");
  kontrol(`fiyat yarışı ${FIYAT_YARISI_ESIGI} kabulde yanar, 2'de yanmaz`, a?.yaris === true && g.find((x) => x.variantId === "XIA")?.yaris === false);
  const r = g.find((x) => x.variantId === "RED");
  kontrol("hiç kabul yoksa son fiyat null (uydurulmaz), red sayılır", r?.sonFiyat === null && r?.reddedilen === 1 && r?.gonderilen === 0);
  kontrol("boş liste boş grup", otomatikGrupla([]).length === 0);

  const v = yorumsuz(kaynakOku("src/lib/buybox-otomatik-verisi.ts"));
  const og = blok(v, "export async function otomatikGecmisi(", 2600);
  kontrol("okuma penceresi BUGÜN (İstanbul günü)", /const gunBasi = gunBasiAni\(isTakvimGunu\(simdi\)\);/.test(og) && /where: \{ \.\.\.kanalIzi, createdAt: \{ gte: gunBasi \} \}/.test(og));
  kontrol("tavan aşılırsa «kesik» işaretlenir, sessiz kırpılmaz", /take: GUN_TAVANI \+ 1,/.test(og) && /const kesik = izler\.length > GUN_TAVANI;/.test(og));
  const e = yorumsuz(kaynakOku("src/app/rapor/buybox/otomatik-gecmisi.tsx"));
  kontrol("ekran saf gruplamayı kullanır", /const gruplar = otomatikGrupla\(gecmis\.kayitlar\);/.test(e) && /\{gruplar\.map\(\(g\) => \{/.test(e));
  kontrol("ayrıntı varsayılan KAPALI", /<details className="group">/.test(e) && !/<details[^>]*\bopen\b/.test(e));
  kontrol("günün toplamı yazılır (İlke #15)", /t\("otomatikBugunOzet", \{ urun: gruplar\.length, degisiklik: kabulToplam \}\)/.test(e));
  kontrol("kesik liste ekranda söylenir", /\{gecmis\.kesik \? <p[^>]*>\{t\("otomatikKesik"\)\}/.test(e));
  kontrol("yarış rozeti gruptan", /\{g\.yaris \? <DurumRozeti durum="uyari">\{t\("otomatikYaris"\)\}/.test(e));
}
kosanBolumler.push("otomatik-grup");

console.log("");
if (kosanBolumler.length !== BOLUM_SAYISI) {
  console.log(`KOŞUM YARIM KALDI — sonuç GEÇERSİZ (${kosanBolumler.length}/${BOLUM_SAYISI})`);
  process.exit(1);
} else if (basarisiz === 0) {
  console.log(`TÜM KONTROLLER GEÇTİ (${calisan})`);
  process.exit(0);
} else {
  console.log(`${basarisiz} KONTROL BAŞARISIZ (${calisan} kontrol içinde)`);
  process.exit(1);
}
