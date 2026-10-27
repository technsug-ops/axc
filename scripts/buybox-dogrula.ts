/**
 * ============================================================================
 *  BUYBOX DURUMU BEKÇİSİ (K363 Faz 3-a)
 * ----------------------------------------------------------------------------
 *  Saf gövde ÇAĞRILIR, değeri sınanır; kaynak taraması yalnız bağlar için
 *  (yorumsuz kodda, kullanım bloğuna daraltılmış). Her kuralın İKİ yakası
 *  örnekte. Ağ yok: TY cevap çözücüsü örnek gövdeyle sınanır.
 *  ⚠ TY Buybox POST istisnasının kapısı `api:dogrula`dadır (OKUMA_POST_BEYANLI);
 *  burada ekranın ve verinin sözü ölçülür.
 * ============================================================================
 */
import { existsSync } from "node:fs";

import { kaynakOku } from "./kaynak-oku";
import {
  buyboxAra,
  buyboxFarki,
  buyboxListesi,
  buyboxOzeti,
  hbSatiri,
  partilere,
  PIYASA_TAVAN,
  saticiAnahtari,
  sorgulanamadi,
  tySatiri,
  type BuyboxUrunu,
  type HbRakip,
} from "../src/lib/buybox";
import { tyBuyboxCoz, TY_BUYBOX_PARTI } from "./ty/buybox";
import { HB_BUYBOX_PARTI } from "./hb/istemci";
import { MENU_ADRESLERI, MENU_KATALOGU } from "../src/lib/menu/katalog";

let basarisiz = 0;
let calisan = 0;
const BOLUM_SAYISI = 6;
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
const urun = (id: string, o: Partial<BuyboxUrunu> = {}): BuyboxUrunu => ({
  variantId: id, urunId: null, urunAdi: `Ürün ${id}`, sku: `SKU-${id}`, barkod: `869${id}`, firmaSku: null, kanalKodu: `869${id}`, stok: 2, ...o,
});
const r = (sira: number, satici: string, fiyat: number, listeFiyati: number | null = null): HbRakip => ({ sira, satici, fiyat, listeFiyati });

// ── ① TRENDYOL ─────────────────────────────────────────────────────────
console.log("\n① Trendyol — kayıt → durum");
{
  const yok = tySatiri(urun("A"), null, 1200);
  kontrol("kayıt dönmedi → GÖRÜNMÜYOR (temiz değil), bizim fiyat yine yazar", yok.durum === "GORUNMUYOR" && yok.bizimFiyat === 1200 && yok.siramiz === null);
  const bir = tySatiri(urun("B"), { buyboxFiyati: 999, siramiz: 1, ikinciFiyat: 1050, cokSatici: true }, 999);
  kontrol("sıra 1 → BUYBOX BİZDE · 2. fiyat öndeki pay", bir.durum === "BIRINCI" && bir.ikinciFiyat === 1050 && bir.saticiSayisi === null);
  const uc = tySatiri(urun("C"), { buyboxFiyati: 659, siramiz: 10, ikinciFiyat: 709, cokSatici: true }, 700);
  kontrol("sıra 10 → KAYBEDİLDİ · Buybox 659", uc.durum === "KAYBEDILDI" && uc.siramiz === 10 && uc.buyboxFiyati === 659);
  const tek = tySatiri(urun("D"), { buyboxFiyati: 500, siramiz: 1, ikinciFiyat: null, cokSatici: false }, 500);
  kontrol("tek satıcı → satıcı sayısı 1", tek.saticiSayisi === 1);
  const sirasiz = tySatiri(urun("E"), { buyboxFiyati: 500, siramiz: null, ikinciFiyat: null, cokSatici: true }, 500);
  kontrol("kayıt var ama sıra yok → GÖRÜNMÜYOR (uydurma sıra yok)", sirasiz.durum === "GORUNMUYOR");
  const coz = tyBuyboxCoz({ buyboxInfo: [{ barcode: "5702018055700", buyboxPrice: 659, buyboxOrder: 10, hasMultipleSeller: true, secondBuyboxPrice: 709, thirdBuyboxPrice: 719 }] });
  kontrol("TY cevabı çözülür (25.10 canlı örneğiyle)", coz?.[0]?.siramiz === 10 && coz[0].buyboxFiyati === 659 && coz[0].ikinciFiyat === 709 && coz[0].ucuncuFiyat === 719 && coz[0].cokSatici === true);
  kontrol("tanınmayan zarf → null (boş liste SAYILMAZ)", tyBuyboxCoz({ content: [] }) === null && tyBuyboxCoz(null) === null);
  kontrol("sayı olmayan alan → null (uydurma 0 yok)", tyBuyboxCoz({ buyboxInfo: [{ barcode: "x", buyboxPrice: "659" }] })?.[0]?.buyboxFiyati === null);
}
kosanBolumler.push("ty");

// ── ② HEPSİBURADA ──────────────────────────────────────────────────────
console.log("\n② Hepsiburada — satıcı listesi → durum");
{
  const liste = [r(2, "Ayz Elektronik", 1099), r(1, "AlGo", 1043.13, 1199), r(5, "AXCALI", 1391.13, 1599), r(6, "Miatek", 2349)];
  const s = hbSatiri(urun("A"), liste, "axcali");
  kontrol("biz mağaza ADIYLA bulunuruz (büyük/küçük harf duyarsız) · sıra 5", s.durum === "KAYBEDILDI" && s.siramiz === 5 && s.bizimFiyat === 1391.13);
  kontrol("Buybox: 1. sıradaki satıcı ve fiyatı (liste sırasız gelse de)", s.buyboxFiyati === 1043.13 && s.buyboxSaticisi === "AlGo");
  /* ⚠ ÖLÇÜT ÇEVRİLDİ 26.10.2026: eskiden «bizden SONRAKİ satıcı (Miatek 2.349)»
     sabitleniyordu — o, kodun o anki DAVRANIŞIYDI ve TY'deki «2. fiyat»tan
     (secondBuyboxPrice = sıralamada 2.) farklıydı; kullanıcı «bu fiyat ne»
     diye sordu. Kural artık iki kanalda aynı: sıralamada 2. satıcı. */
  kontrol("2. fiyat = sıralamada 2. satıcı (Ayz 1.099), biz 5. olsak da", s.ikinciFiyat === 1099);
  kontrol("satıcı sayısı ve sıralı tam liste", s.saticiSayisi === 4 && s.rakipler.map((x) => x.sira).join(",") === "1,2,5,6");
  const bir = hbSatiri(urun("B"), [r(1, "AXCALI", 999), r(2, "X", 1010)], "AXCALI");
  kontrol("biz 1. → BUYBOX BİZDE · 2. fiyat 1.010", bir.durum === "BIRINCI" && bir.ikinciFiyat === 1010);
  const yokuz = hbSatiri(urun("C"), [r(1, "X", 100)], "AXCALI");
  kontrol("listede yokuz → GÖRÜNMÜYOR ama Buybox bilgisi yazar", yokuz.durum === "GORUNMUYOR" && yokuz.buyboxFiyati === 100 && yokuz.bizimFiyat === null);
  kontrol("SKU için kayıt yok → GÖRÜNMÜYOR", hbSatiri(urun("D"), null, "AXCALI").durum === "GORUNMUYOR");
  kontrol("satıcı anahtarı: AXCALI = Axcali = axcalı = AXCALİ (i/ı/İ farkı yok)", ["AXCALI", "Axcali", "axcalı", "AXCALİ", " axcali "].every((x) => saticiAnahtari(x) === "axcali"));
  kontrol("farklı ad eşleşmez (AXCALI ≠ AXCAL)", saticiAnahtari("AXCALI") !== saticiAnahtari("AXCAL"));
  const adsiz = hbSatiri(urun("E"), [r(1, "", 100), r(2, "X", 120)], "  ");
  kontrol("mağaza adı boşsa adı boş satıcı «biz» SAYILMAZ", adsiz.durum === "GORUNMUYOR" && adsiz.siramiz === null);
}
kosanBolumler.push("hb");

// ── ③ LİSTE · FARK · ÖZET ──────────────────────────────────────────────
console.log("\n③ liste · fark · özet · arama · parti");
{
  kontrol("fark: bizim − Buybox (1.391,13 − 1.043,13 = 348 · %33,4)", (() => { const f = buyboxFarki({ bizimFiyat: 1391.13, buyboxFiyati: 1043.13 }); return f !== null && Math.abs(f.tl - 348) < 1e-6 && Math.abs(f.yuzde - 33.3614) < 0.001; })());
  kontrol("fark: biri bilinmiyorsa null", buyboxFarki({ bizimFiyat: null, buyboxFiyati: 10 }) === null && buyboxFarki({ bizimFiyat: 10, buyboxFiyati: null }) === null);
  const satirlar = [
    tySatiri(urun("K1", { urunAdi: "Zeta" }), { buyboxFiyati: 100, siramiz: 3, ikinciFiyat: null, cokSatici: true }, 120), // %20
    tySatiri(urun("K2", { urunAdi: "Alfa" }), { buyboxFiyati: 100, siramiz: 2, ikinciFiyat: null, cokSatici: true }, 101), // %1 → önce
    tySatiri(urun("K3", { urunAdi: "Beta" }), { buyboxFiyati: 100, siramiz: 2, ikinciFiyat: null, cokSatici: true }, null), // fark bilinmiyor → sona
    tySatiri(urun("B1", { urunAdi: "Gama" }), { buyboxFiyati: 100, siramiz: 1, ikinciFiyat: 110, cokSatici: true }, 100),
    tySatiri(urun("G1", { urunAdi: "Delta" }), null, 50),
    sorgulanamadi(urun("S1", { urunAdi: "Epsilon" }), "TY"),
  ];
  const k = buyboxListesi(satirlar, "kaybedilen").map((x) => x.variantId).join(",");
  kontrol("kaybedilen: Buybox'a en yakın önce, farkı bilinmeyen sona (K2 %1 · K1 %20 · K3)", k === "K2,K1,K3", k);
  kontrol("Buybox bizde listesi yalnız 1. sıradakiler", buyboxListesi(satirlar, "birinci").map((x) => x.variantId).join(",") === "B1");
  kontrol("görünmüyor listesi sorgulanamayanları da taşır (gizlenmez)", buyboxListesi(satirlar, "gorunmuyor").map((x) => x.variantId).sort().join(",") === "G1,S1");
  kontrol("hepsi: bütün satırlar", buyboxListesi(satirlar, "hepsi").length === 6);
  const oz = buyboxOzeti(satirlar);
  kontrol("özet: incelenen 6 · bizde 1 · kaybedilen 3 · görünmüyor 1 · sorgulanamadı 1 (ayrı sayılır)", oz.incelenen === 6 && oz.birinci === 1 && oz.kaybedilen === 3 && oz.gorunmuyor === 1 && oz.sorgulanamadi === 1, oz);
  kontrol("arama: kanal koduyla da bulur · boş arama hepsi", buyboxAra(satirlar, "869K2").length === 1 && buyboxAra(satirlar, " ").length === 6);
  kontrol("parti: 21 kod → 10+10+1", partilere(Array.from({ length: 21 }, (_, i) => i), 10).map((p) => p.length).join(",") === "10,10,1");
  kontrol("parti boyu iki kanalda da 10 (ölçüldü 25.10)", TY_BUYBOX_PARTI === 10 && HB_BUYBOX_PARTI === 10);
}
kosanBolumler.push("liste");

// ── ④ VERİ ─────────────────────────────────────────────────────────────
console.log("\n④ veri — satış hesabı · kod · parti · hata");
{
  const v = yorumsuz(kaynakOku("src/lib/buybox-verisi.ts"));
  kontrol("satış hesabı (satisIcin + aktif) okunur", /where: \{ channel: \{ name: KANAL_ADI\[kanal\] \}, satisIcin: true, isActive: true \}/.test(v));
  kontrol("TY kodu varyant BARKODU (K201-3), HB kodu channelSku", /const kanalKodu = kanal === "TY" \? k\.variant\.barcode : k\.channelSku;/.test(v));
  kontrol("Buybox ekranı yalnız rafta olanlar (yalnizStoklu)", /if \(p\.yalnizStoklu && adet <= 0\) continue;/.test(v));
  kontrol("partiler kanal tavanıyla (TY_BUYBOX_PARTI · HB_BUYBOX_PARTI)", /partilere\(k\.urunler, TY_BUYBOX_PARTI\)/.test(v) && /partilere\(k\.urunler, hb\.HB_BUYBOX_PARTI\)/.test(v));
  const tyHata = blok(v, 'if (sonuc.tur !== "VERI") {', 400);
  kontrol("TY: düşen parti «sorgulanamadı» + sebep (sessiz boş yok)", /sebepler\.add\(`TY Buybox: /.test(tyHata) && /satirlar\.push\(\.\.\.parti\.map\(\(u\) => sorgulanamadi\(u, "TY"\)\)\);/.test(tyHata));
  const hbHata = blok(v, "if (!Array.isArray(dizi)) {", 500);
  kontrol("HB: düşen parti «sorgulanamadı» + sebep", /sebepler\.add\(`HB Buybox: /.test(hbHata) && /satirlar\.push\(\.\.\.parti\.map\(\(u\) => sorgulanamadi\(u, "HB"\)\)\);/.test(hbHata));
  kontrol("kimlik yoksa her ürün sorgulanamadı (TY + HB)", (v.match(/sebepler: \["KIMLIK_YOK"\], kimlikVar: false/g) ?? []).length === 2);
  kontrol("TY bizim fiyat: müşterinin gördüğü fiyat önce", /typeof p\?\.priceSeenByCustomer === "number" \? p\.priceSeenByCustomer : typeof p\?\.salePrice === "number" \? p\.salePrice : null/.test(v));
  kontrol("HB: biz mağaza adıyla, adı yoksa sebep yazılır", /if \(!k\.magazaAdi\) sebepler\.add\("HB_MAGAZA_ADI_YOK"\);/.test(v) && /hbSatiri\(u, harita\.get\(u\.kanalKodu\.toUpperCase\(\)\) \?\? null, k\.magazaAdi \?\? "", /.test(v));
}
kosanBolumler.push("veri");

// ── ⑤ EKRAN ────────────────────────────────────────────────────────────
console.log("\n⑤ ekran — izin · sayılar · arama · yönlendirme · menü");
{
  const s = yorumsuz(kaynakOku("src/app/rapor/buybox/page.tsx"));
  kontrol("izin rapor.gor · canlı sorgu için süre payı", /await sayfaIzni\("rapor\.gor"\)/.test(s) && /export const maxDuration = 60;/.test(s) && /export const dynamic = "force-dynamic";/.test(s));
  kontrol("sekme sayısı aramadan BAĞIMSIZ (tam liste)", /const sekmeSayisi = \(l: BuyboxListesi\) => buyboxListesi\(sonuc\.satirlar, l\)\.length;/.test(s));
  kontrol("toplam ekrandaki (aramadan sonraki) listeden", /const gorunen = buyboxAra\(tamListe, arama\);\s*const rafta = gorunen\.reduce/.test(s) && /cocuk=\{gorunen\.length\}/.test(s));
  kontrol("denetim sayılarının beşi de ayrı çizilir", ["ozet.incelenen", "ozet.birinci", "ozet.kaybedilen", "ozet.gorunmuyor", "ozet.sorgulanamadi"].every((x) => s.includes(`cocuk={${x}}`)));
  kontrol("sorun sebepleri ekrana yazılır", /sonuc\.sebepler\.length > 0 \? \(/.test(s) && /sonuc\.sebepler\.map\(/.test(s));
  /**
   * ⚠ ÖLÇÜT ESKİDİ VE GÜNCELLENDİ (25.10.2026, Faz 3-c): burada «fiyat buradan
   * DEĞİŞMEZ» ölçülüyordu; kullanıcı satırdan Trendyol'a fiyat gönderimini
   * istedi. Gönderim artık YALNIZ fiyat penceresinde (`fiyat-penceresi.tsx`, kendi
   * bekçisi `buybox-fiyat:dogrula`); sayfanın kendisi doğrudan göndermez.
   */
  /**
   * ⚠ ÖLÇÜT İKİNCİ KEZ GÜNCELLENDİ (26.10.2026, Satışlar düzeni): kart bağlantısı
   * iki görünümde AYRI yazılıyordu ve sayısı (2) ölçülüyordu; artık tek
   * `eylemler()` fonksiyonunda, iki görünüm onu çağırır.
   */
  kontrol("satır ürün kartına götürür (tek eylem fonksiyonu, iki görünüm); sayfa doğrudan GÖNDERMEZ (gönderim yalnız fiyat penceresinde)",
    (s.match(/href=\{`\/kart\/\$\{s\.variantId\}`\}/g) ?? []).length === 1 && /<SatirEylemleri>\{eylemler\(s\)\}<\/SatirEylemleri>/.test(s) && /eylemler=\{eylemler\(s\)\}/.test(s) && !/StokFiyatGonder|Gonder\(/.test(s));
  kontrol("arama ortak bileşenle (kamera dahil, İlke #17)", /<KodAramaKutusu temelAdres=\{YOL\}/.test(s));
  kontrol("menü: «Buybox durumu» Fiyatlandırma grubunda ve sayfası var",
    MENU_ADRESLERI.buybox === "/rapor/buybox" && MENU_KATALOGU.some((m) => m.anahtar === "buybox" && m.varsayilanGrup === "grupFiyatAnaliz") && existsSync("src/app/rapor/buybox/page.tsx"));
  const tr = JSON.parse(kaynakOku("messages/tr.json")) as Record<string, Record<string, string>>;
  const gerekli = ["durum_BIRINCI", "durum_KAYBEDILDI", "durum_GORUNMUYOR", "durum_SORGULANAMADI", "liste_kaybedilen", "liste_birinci", "liste_gorunmuyor", "liste_hepsi", "aciklama_kaybedilen", "aciklama_birinci", "aciklama_gorunmuyor", "aciklama_hepsi", "kanal_TY", "kanal_HB", "kanalKodu_TY", "kanalKodu_HB"];
  const eksik = gerekli.filter((k) => !(tr.Buybox?.[k] ?? "").length);
  kontrol("sözlük: durum · liste · açıklama · kanal metinleri dolu", eksik.length === 0 && (tr.Menu?.buybox ?? "").length > 0, eksik);
}
kosanBolumler.push("ekran");

// ── ⑥ ALIM REHBERİ — PİYASA FİYATI (istek üzerine) ──────────────────────
console.log("\n⑥ alım rehberi — piyasa fiyatı istek üzerine");
{
  const s = yorumsuz(kaynakOku("src/app/rapor/alim-rehberi/page.tsx"));
  kontrol("yalnız istenince ve özel gün sekmesi dışında sorulur", /const piyasaIstendi = p\.piyasa === "1" && !oz;/.test(s) && /const piyasa = piyasaIstendi \? await piyasaFiyatlari\(piyasaKumesi\.slice\(0, PIYASA_TAVAN\)\) : null;/.test(s));
  kontrol("sorulan küme EKRANDAKİ liste (arama dahil; iyi alımda kendi listesi)", /const piyasaKumesi = ia \? iyiAlimAra\(iyiAlim, arama\)\.map\(\(x\) => x\.satir\.variantId\) : gorunen\.map\(\(s\) => s\.variantId\);/.test(s));
  const tasinan = blok(s, "const tasinan = {", 200);
  kontrol("piyasa TAŞINAN parametrelere girmez (sekme/dönem/arama değişince kapanır)", tasinan.length > 0 && !/piyasa/.test(tasinan.split("\n")[0]));
  kontrol("tavan aşılırsa ekranda yazar (sessiz kesilme yok)", /piyasaKumesi\.length > PIYASA_TAVAN \? \(/.test(s) && PIYASA_TAVAN === 100);
  kontrol("sorun sebepleri yazılır", /piyasa && piyasa\.sebepler\.length > 0 \?/.test(s));
  kontrol("sütun yalnız sorulunca çizilir (tablo + telefon)", /\{piyasaMetni \? <TableHead className="text-right">\{t\("sutunPiyasa"\)\}<\/TableHead> : null\}/.test(s) && /\.\.\.\(piyasaMetni \? \[\{ etiket: t\("sutunPiyasa"\), deger: piyasaYaz\(s\.variantId\) \}\] : \[\]\)/.test(s));
  kontrol("canlı sorgu için süre payı", /export const maxDuration = 60;/.test(s));
  const iyi = yorumsuz(kaynakOku("src/app/rapor/alim-rehberi/iyi-alim-sekmesi.tsx"));
  kontrol("iyi alım sekmesi de sütunu sorulunca çizer", /\{piyasa \? <TableHead className="text-right">\{t\("sutunPiyasa"\)\}<\/TableHead> : null\}/.test(iyi));
  const v = yorumsuz(kaynakOku("src/lib/buybox-verisi.ts"));
  const pf = blok(v, "export async function piyasaFiyatlari(", 900);
  kontrol("piyasa: stok şartı YOK (tükenen ürünün de piyasası sorulur) · kendi fiyat listesi taranmaz",
    /buyboxUrunleri\(kanal, \{ variantIds, yalnizStoklu: false \}\)/.test(pf) && /buyboxDurumlari\(kanal, urunler, \{ fiyatlarimiz: false \}\)/.test(pf));
  kontrol("piyasa: sorgulanamayan ürün null (uydurma fiyat yok)", /if \(p\) p\[kanal\] = s\.durum === "SORGULANAMADI" \? null : s\.buyboxFiyati;/.test(pf));
}
kosanBolumler.push("piyasa");

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
