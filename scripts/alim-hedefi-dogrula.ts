/**
 * ============================================================================
 *  ALIM FIRSATI TAKİBİ BEKÇİSİ (K363 Faz 3-d) — `npm run alim-hedefi:dogrula`
 * ----------------------------------------------------------------------------
 *  Saf gövde ÇAĞRILIR, değeri sınanır; kaynak taraması yalnız bağlar için
 *  (yorumsuz kodda, kullanım bloğuna daraltılmış). Her kuralın İKİ yakası örnekte.
 *  Korunan sözler:
 *  · fırsat fiyatı BAŞKA satıcının fiyatıdır — kendi fiyatımız fırsat sayılmaz;
 *  · bilinmeyen fiyat fırsat sayılmaz; hedefe EŞİT fiyat fırsattır (kuruşa);
 *  · çan sayısı = «Hedefin altında» listesi (aynı gövde), durdurulan sayılmaz;
 *  · saatlik ölçüm stok şartı koymaz ve düşen kanalın son fiyatını EZMEZ;
 *  · ilanı olmayan ürün takibe alınamaz; yazımlar iz bırakır.
 * ============================================================================
 */
import { kaynakOku } from "./kaynak-oku";
import {
  altindakiler,
  enUcuz,
  firsatFiyati,
  fiyatTakibiAdresi,
  fiyatTakibiListesi,
  fiyatTakibiSuzgeciCoz,
  hedefCoz,
  hedefFarki,
  hedefinAltinda,
  type HedefSatiri,
} from "../src/lib/alim-hedefi";
import type { BuyboxSatiri } from "../src/lib/buybox";
import { hedefGirdiMetni, oneriDurumu, oneriKaynagiCoz, oneriKumesi, onerilenHedef } from "../src/lib/alim-hedefi-oneri";
import type { FiyatHafizasi, IyiAlimSatiri } from "../src/lib/alim-fiyat-hafizasi";
import type { RehberSatiri } from "../src/lib/rapor/alim-rehberi";
import { UYARI_ADRESLERI, UYARI_IZINLERI, UYARI_SEVIYESI } from "../src/lib/uyari/turler";

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

type Satir = Pick<BuyboxSatiri, "kanal" | "durum" | "siramiz" | "buyboxFiyati" | "ikinciFiyat" | "rakipler">;
const ty = (o: Partial<Satir>): Satir => ({ kanal: "TY", durum: "KAYBEDILDI", siramiz: 2, buyboxFiyati: 900, ikinciFiyat: 950, rakipler: [], ...o });
const hb = (o: Partial<Satir>): Satir => ({ kanal: "HB", durum: "KAYBEDILDI", siramiz: 2, buyboxFiyati: 900, ikinciFiyat: 950, rakipler: [], ...o });
const r = (sira: number, satici: string, fiyat: number) => ({ sira, satici, fiyat, listeFiyati: null });
const h = (o: Partial<HedefSatiri>): HedefSatiri => ({ id: "x", variantId: "v", aktif: true, urunAdi: "Ürün", hedef: 1000, ty: null, hb: null, ...o });

// ── ① FIRSAT FİYATI — başka satıcının en ucuzu ──────────────────────────
console.log("\n① fırsat fiyatı — kendi fiyatımız fırsat sayılmaz");
{
  kontrol("TY: Buybox başkasındaysa Buybox fiyatı", firsatFiyati(ty({ siramiz: 3, buyboxFiyati: 900, ikinciFiyat: 950 }), "") === 900);
  kontrol("TY: Buybox BİZDEYSE 2. fiyat (kendi fiyatımız değil)", firsatFiyati(ty({ durum: "BIRINCI", siramiz: 1, buyboxFiyati: 800, ikinciFiyat: 950 }), "") === 950);
  kontrol("TY: ilanımız görünmüyorsa (sıra yok) Buybox başkasınındır", firsatFiyati(ty({ durum: "GORUNMUYOR", siramiz: null, buyboxFiyati: 700, ikinciFiyat: null }), "") === 700);
  kontrol("TY: Buybox bizde ve tek satıcıyız → bilinmiyor", firsatFiyati(ty({ durum: "BIRINCI", siramiz: 1, buyboxFiyati: 800, ikinciFiyat: null }), "") === null);
  kontrol("sorgulanamadı → bilinmiyor (eski/boş fiyat uydurulmaz)", firsatFiyati(ty({ durum: "SORGULANAMADI", buyboxFiyati: 900 }), "") === null);
  const liste = [r(1, "Axcali", 800), r(2, "Rakip A", 950), r(3, "Rakip B", 990)];
  kontrol("HB: listeden BİZ çıkarılır, kalanın en ucuzu", firsatFiyati(hb({ rakipler: liste }), "AXCALI") === 950);
  kontrol("HB: biz yoksak listenin en ucuzu", firsatFiyati(hb({ rakipler: [r(1, "Rakip A", 950), r(2, "Rakip B", 990)] }), "Axcali") === 950);
  kontrol("HB: mağaza adı boşsa kimse «biz» sayılmaz", firsatFiyati(hb({ rakipler: liste }), "") === 800);
  kontrol("HB: yalnız biz varız → bilinmiyor", firsatFiyati(hb({ rakipler: [r(1, "Axcali", 800)] }), "axcali") === null);
}
kosanBolumler.push("firsat");

// ── ② HEDEF KIYASI — eşit fırsattır, bilinmeyen değildir ────────────────
console.log("\n② hedef kıyası — kuruşa, iki kanalın en ucuzu");
{
  kontrol("iki kanalın en ucuzu seçilir (HB)", enUcuz({ ty: 1000, hb: 990 })?.kanal === "HB" && enUcuz({ ty: 1000, hb: 990 })?.fiyat === 990);
  kontrol("eşitlikte TY (sabit sıra)", enUcuz({ ty: 990, hb: 990 })?.kanal === "TY");
  kontrol("tek kanal bilinirse o", enUcuz({ ty: null, hb: 1200 })?.kanal === "HB");
  kontrol("hiçbiri bilinmezse yok", enUcuz({ ty: null, hb: null }) === null);
  kontrol("hedefe EŞİT fiyat → altında sayılır", hedefinAltinda({ hedef: 1000, ty: 1000, hb: null }));
  kontrol("1 kuruş üstü → altında DEĞİL", !hedefinAltinda({ hedef: 1000, ty: 1000.01, hb: null }));
  kontrol("kayan nokta kuyruğu eşitliği bozmaz (999,999999 ≈ 1000)", hedefinAltinda({ hedef: 1000, ty: 1000.000001, hb: null }));
  kontrol("bilinmeyen fiyat fırsat DEĞİL", !hedefinAltinda({ hedef: 1000, ty: null, hb: null }));
  kontrol("bir kanal altında yeter", hedefinAltinda({ hedef: 1000, ty: 1100, hb: 950 }));
  const f = hedefFarki({ hedef: 1000, ty: 900, hb: null });
  kontrol("fark: en ucuz − hedef (eksi = altında) ve yüzde", f !== null && f.tl === -100 && Math.abs(f.yuzde + 10) < 1e-9, f);
  kontrol("fark: fiyat bilinmiyorsa yok", hedefFarki({ hedef: 1000, ty: null, hb: null }) === null);
}
kosanBolumler.push("kiyas");

// ── ③ HEDEF GİRDİSİ — TR yazımı, uydurma yok ────────────────────────────
console.log("\n③ hedef girdisi");
{
  const ornek: [string, number | null][] = [
    ["1.250", 1250], ["1250", 1250], ["1.250,50", 1250.5], ["1250,5", 1250.5], ["1250.5", 1250.5], ["₺ 1.250", 1250], ["1.234.567,89", 1234567.89],
    ["0", null], ["-5", null], ["", null], ["abc", null], ["12,345", null], ["1.2.3", null],
  ];
  for (const [ham, beklenen] of ornek) kontrol(`«${ham}» → ${beklenen}`, hedefCoz(ham) === beklenen, hedefCoz(ham));
}
kosanBolumler.push("girdi");

// ── ④ SAYI = LİSTE — çan, süzgeç ve sıra aynı gövdeden ──────────────────
console.log("\n④ sayı = liste");
{
  const satirlar = [
    h({ id: "a", urunAdi: "A", ty: 1100 }), // üstünde
    h({ id: "b", urunAdi: "B", ty: 900 }), // %10 altında
    h({ id: "c", urunAdi: "C", hb: 800 }), // %20 altında
    h({ id: "d", urunAdi: "D", hb: 700, aktif: false }), // altında AMA durdurulmuş
    h({ id: "e", urunAdi: "E" }), // bilinmiyor
  ];
  const alt = altindakiler(satirlar).map((s) => s.id);
  kontrol("çan kümesi: aktif + altında (durdurulan girmez)", alt.length === 2 && alt.includes("b") && alt.includes("c"), alt);
  kontrol("«altinda» süzgeci = çan kümesi", fiyatTakibiListesi(satirlar, "altinda").length === alt.length);
  kontrol("«hepsi» hiçbirini atmaz", fiyatTakibiListesi(satirlar, "hepsi").length === satirlar.length);
  kontrol("sıra: en çok altında başta, sonra üstünde, bilinmeyen, durdurulan", fiyatTakibiListesi(satirlar, "hepsi").map((s) => s.id).join("") === "cbaed", fiyatTakibiListesi(satirlar, "hepsi").map((s) => s.id).join(""));
  kontrol("bilinmeyen süzgeç «hepsi»ye döner", fiyatTakibiSuzgeciCoz("xx") === "hepsi" && fiyatTakibiSuzgeciCoz("altinda") === "altinda");
  kontrol("çan adresi = sekmenin «altında» süzgeci (adres sahibinden)", UYARI_ADRESLERI.alimHedefiAltinda === fiyatTakibiAdresi("altinda") && fiyatTakibiAdresi("altinda") === "/rapor/alim-rehberi?liste=fiyatTakibi&ft=altinda");
  kontrol("çan: nötr (fırsat — rozeti şişirmez) ve kâr iznine bağlı", UYARI_SEVIYESI.alimHedefiAltinda === "notr" && UYARI_IZINLERI.alimHedefiAltinda === "satis.kar.gor");
}
kosanBolumler.push("sayi-liste");

// ── ⑤ BAĞLAR — ölçüm, çan, yazım ────────────────────────────────────────
console.log("\n⑤ bağlar");
{
  const veri = yorumsuz(kaynakOku("src/lib/alim-hedefi-verisi.ts"));
  const olc = blok(veri, "export async function alimHedefleriniOlc(", 3200);
  kontrol("ölçüm: STOK ŞARTI YOK (tükenen ürün de sorulur)", /buyboxUrunleri\(kanal, \{ variantIds: ids, yalnizStoklu: false \}\)/.test(olc));
  kontrol("ölçüm: yalnız AKTİF hedefler sorulur", /prisma\.alimHedefi\.findMany\(\{ where: \{ aktif: true \}/.test(olc));
  kontrol("ölçüm: fiyat `firsatFiyati`ndan (kendi fiyatımız ayıklanır)", /fiyat\[kanal\]\.set\(s\.variantId, firsatFiyati\(s, urunler\.magazaAdi \?\? ""\)\)/.test(olc));
  kontrol("ölçüm: DÜŞEN kanalın son fiyatı EZİLMEZ (TY)", /if \(!dusen\.has\("TY"\)\) veri\.tyFiyatAmount =/.test(olc));
  kontrol("ölçüm: DÜŞEN kanalın son fiyatı EZİLMEZ (HB)", /if \(!dusen\.has\("HB"\)\) veri\.hbFiyatAmount =/.test(olc));
  kontrol("ölçüm: düşme = BÜTÜN satırlar sorgulanamadı (boş liste düşme sayılmaz)", /const dustu = sonuc\.satirlar\.length > 0 && sonuc\.satirlar\.every\(\(s\) => s\.durum === "SORGULANAMADI"\);/.test(olc));
  kontrol("ölçüm: «son altında» izi `hedefinAltinda` ile", /if \(hedefinAltinda\(f\)\) \{/.test(olc));
  const can = blok(veri, "export async function alimHedefiCanSayisi(", 200);
  kontrol("çan sayısı sekmeyle AYNI gövde (`altindakiler`)", /return altindakiler\(await alimHedefleri\(\)\)\.length;/.test(can));
  const yaz = blok(veri, "export async function alimHedefiYaz(", 2600);
  kontrol("yazım: ilanı olmayan ürün REDDEDİLİR", /if \(varyant\.channelSkus\.length === 0\) return \{ tamam: false, hata: "ILAN_YOK" \};/.test(yaz));
  kontrol("yazım: iz bırakır (eski ve yeni)", /action: eski \? "ALIM_HEDEFI_GUNCELLE" : "ALIM_HEDEFI_EKLE"/.test(yaz) && /eski: eski \?/.test(yaz));
  kontrol("sil: iz bırakır", /action: "ALIM_HEDEFI_SIL"/.test(blok(veri, "export async function alimHedefiSil(", 800)));

  const cron = yorumsuz(kaynakOku("src/app/api/cron/buybox-olcum/route.ts"));
  const iBuybox = cron.indexOf("await buyboxOlcumleriniYaz(");
  const iHedef = cron.indexOf("await alimHedefleriniOlc()");
  kontrol("zamanlayıcı: Buybox ölçümü var", iBuybox >= 0);
  kontrol("zamanlayıcı: hedef ölçümü var", iHedef >= 0);
  kontrol("zamanlayıcı: hedef ölçümü Buybox'tan SONRA", iBuybox >= 0 && iHedef >= 0 && iBuybox < iHedef);
  kontrol("zamanlayıcı: hedef ölçümünün düşmesi durum koduna yansır", /\+ \(hedefDustu \? 1 : 0\)/.test(cron));

  const topla = yorumsuz(kaynakOku("src/lib/uyari/topla.ts"));
  kontrol("çan: toplayıcı aynı gövdeyi çağırır", /alimHedefiAltinda: \{ sayi: await alimHedefiCanSayisi\(\) \}/.test(topla));

  const eylem = yorumsuz(kaynakOku("src/app/rapor/alim-rehberi/fiyat-takibi-eylemleri.ts"));
  const izinler = eylem.match(/if \(!\(await izinVarMi\("alim\.yaz"\)\)\) return YETKISIZ;/g) ?? [];
  /* Faz 3-e (30.10): toplu ekleme dördüncü yazan eylem oldu; ürün bilgisi OKUR ve izinsizde `null` döner (ayrı ölçüt). */
  kontrol("eylemler: yazan dördü de `alim.yaz` sorar", izinler.length === 4, izinler.length);
  kontrol("eylemler: ürün bilgisi de `alim.yaz` sorar (izinsizde null)", /if \(!\(await izinVarMi\("alim\.yaz"\)\)\) return null;/.test(blok(eylem, "export async function urunTakipBilgisiEylemi(", 300)));

  const sayfa = yorumsuz(kaynakOku("src/app/rapor/alim-rehberi/page.tsx"));
  /* Faz 3-e (30.10): çağrı çok satırlı oldu (öneri bölümü `oneri` ile geçiyor). */
  kontrol("sayfa: sekme bileşeni çizilir", /ft \? \(\s*<FiyatTakibiSekmesi\s+liste=\{hedefler\}\s+suzgec=\{ftSuzgec\}\s+arama=\{arama\}\s+yazabilir=\{alimYazabilir\}\s+oneri=\{/.test(sayfa));
  const sekme = yorumsuz(kaynakOku("src/app/rapor/alim-rehberi/fiyat-takibi-sekmesi.tsx"));
  kontrol("sekme: süzgeç sayıları aramadan bağımsız (tam liste + çan kümesi)", /const sayilar: Record<FiyatTakibiSuzgeci, number> = \{ hepsi: liste\.length, altinda: altindakiler\(liste\)\.length \};/.test(sekme));
  kontrol("sekme: arama kutusu ortak bileşen (kamera dahil) sayfada", /<KodAramaKutusu[\s\S]{0,80}temelAdres=\{REHBER_YOLU\}/.test(sayfa));
}
kosanBolumler.push("baglar");

// ── ⑥ ÖNERİLER — kaynak kümeleri, önerilen hedef, toplu yazım ───────────
console.log("\n⑥ takibe ekle önerileri");
{
  const rs = (id: string, o: Partial<RehberSatiri>): RehberSatiri => ({
    variantId: id, urunId: null, urunAdi: id, sku: id, barkod: null, firmaSku: null, marka: null, kategori: null,
    adet: 0, ciro: 0, net2: 0, marj: null, gunlukSatis: 0, gunlukNet2: 0, raf: 0, stokGunu: null, bagliSermaye: null, ...o,
  });
  // a: çok satan ama zararda, rafta 0 · b: az satan çok kâr, rafta 5 · c: orta, rafta 0 · d: hiç satmamış
  const satirlar = [rs("a", { adet: 30, net2: -100 }), rs("b", { adet: 2, net2: 900, raf: 5 }), rs("c", { adet: 10, net2: 300 }), rs("d", {})];
  const k = { tukenen: [satirlar[2]], iyiAlim: [{ satir: satirlar[1] } as IyiAlimSatiri], satirlar };
  const ids = (x: RehberSatiri[]) => x.map((s) => s.variantId).join("");
  kontrol("çok satan: adede göre, satmayan girmez", ids(oneriKumesi("cokSatan", k, false)) === "acb", ids(oneriKumesi("cokSatan", k, false)));
  kontrol("çok kâr: NET-2'ye göre, zarardaki GİRMEZ", ids(oneriKumesi("cokKar", k, false)) === "bc", ids(oneriKumesi("cokKar", k, false)));
  kontrol("tükenen: rehberin kendi listesi (yeni hesap yok)", ids(oneriKumesi("tukenen", k, false)) === "c");
  kontrol("iyi alım: rehberin kendi listesi", ids(oneriKumesi("iyiAlim", k, false)) === "b");
  kontrol("raf süzgeci açık: raftaki düşer (çok kâr)", ids(oneriKumesi("cokKar", k, true)) === "c");
  kontrol("raf süzgeci açık: raftaki düşer (iyi alım)", ids(oneriKumesi("iyiAlim", k, true)) === "");
  kontrol("raf süzgeci kapalı: raftaki kalır", ids(oneriKumesi("iyiAlim", k, false)) === "b");
  kontrol("bilinmeyen kaynak «tükenen»e döner", oneriKaynagiCoz("xx") === "tukenen" && oneriKaynagiCoz("cokKar") === "cokKar");

  const hf = (fiyat: number): FiyatHafizasi => ({ alisSayisi: 2, gunSayisi: 2, enUcuz: { fiyat, tarih: new Date(0) }, normal: fiyat + 100, son: { fiyat: fiyat + 50, tarih: new Date(0) }, kiyasDisi: 0, cariKullanilan: 0 });
  kontrol("önerilen hedef = EN DÜŞÜK alış (normal ya da son değil)", onerilenHedef(hf(1069.49)) === 1069.49);
  kontrol("alış yoksa hedef UYDURULMAZ", onerilenHedef(undefined) === null && onerilenHedef(null) === null);
  kontrol("bedava (0) en düşük → hedef önerilmez", onerilenHedef(hf(0)) === null);
  for (const n of [1069.49, 1250, 0.5, 1234567.8]) kontrol(`kutu metni geri çözülür: ${n}`, hedefCoz(hedefGirdiMetni(n)) === n, hedefGirdiMetni(n));

  const il = (TY: boolean, HB: boolean) => ({ TY, HB });
  kontrol("takipte olan → TAKIPTE (hedefi ezilmez)", oneriDurumu({ takipte: true, ilan: il(true, true), hedef: 100 }) === "TAKIPTE");
  kontrol("ilanı yok → ILAN_YOK", oneriDurumu({ takipte: false, ilan: il(false, false), hedef: 100 }) === "ILAN_YOK");
  kontrol("alışı yok → ALIS_YOK", oneriDurumu({ takipte: false, ilan: il(true, false), hedef: null }) === "ALIS_YOK");
  kontrol("tek kanal ilanı yeter → UYGUN", oneriDurumu({ takipte: false, ilan: il(false, true), hedef: 100 }) === "UYGUN");

  const veri = yorumsuz(kaynakOku("src/lib/alim-hedefi-verisi.ts"));
  const toplu = blok(veri, "export async function alimHedefleriTopluYaz(", 3600);
  kontrol("toplu: hedef SUNUCUDA en düşük alıştan (istemciden fiyat alınmaz)", /const hedef = onerilenHedef\(fiyatHafizasi\(kayit\.get\(v\.id\) \?\? \[\], "TRY"\)\);/.test(toplu) && /alimHedefleriTopluYaz\(variantIds: readonly string\[\]\)/.test(toplu));
  kontrol("toplu: durum `oneriDurumu`ndan (ekranla aynı gövde)", /const d = oneriDurumu\(\{ takipte: v\.alimHedefi !== null,/.test(toplu));
  kontrol("toplu: yalnız UYGUN yazılır, takipte olan EZİLMEZ (upsert yok, skipDuplicates)", /else yazilacak\.push\(/.test(toplu) && /skipDuplicates: true/.test(toplu) && !/upsert/.test(toplu));
  kontrol("toplu: tavan", /if \(ids\.length > TOPLU_TAVAN\) return \{ tamam: false, hata: "COK_FAZLA" \};/.test(toplu));
  kontrol("toplu: iz bırakır", /action: "ALIM_HEDEFI_TOPLU_EKLE"/.test(toplu));
  kontrol("toplu: bulunamayan ürün de sayılır", /bulunamadi: ids\.length - varyantlar\.length/.test(toplu));
  const ilanKosulu = veri.match(/where: TAKIP_ILANI/g) ?? [];
  const ilanYayilimi = veri.match(/\.\.\.TAKIP_ILANI/g) ?? [];
  kontrol("ilan koşulu TEK sabit: yazım + toplu (where) ve kanal bilgisi (yayılım)", ilanKosulu.length === 2 && ilanYayilimi.length === 1, { where: ilanKosulu.length, yayilim: ilanYayilimi.length });
  const kanal = blok(veri, "export async function takipKanallari(", 1600);
  kontrol("link ÜRÜN SAYFASI: satıcı kimliği ve mağaza adı VERİLMEZ", /ilanAdresi\(k\.channelAccount\.channel\.code, \{ channelSku: k\.channelSku, externalListingId: k\.externalListingId, saticiId: null, magazaAdi: null \}\)/.test(kanal));

  const oneri = yorumsuz(kaynakOku("src/app/rapor/alim-rehberi/fiyat-takibi-oneri.tsx"));
  kontrol("öneri: liste = ilanlılar; kaynak sayısı aynı süzgeçten", /const tam = kumeler\[kaynak\]\.filter\(ilanli\);/.test(oneri) && /kumeler\[k\]\.filter\(ilanli\)\.length/.test(oneri));
  kontrol("öneri: ilanı olmayan SAYILIR ve yazar", /const ilanYok = kumeler\[kaynak\]\.length - tam\.length;/.test(oneri) && /\{ilanYok > 0 \? <p[^>]*>\{t\("oneriIlanYok", \{ sayi: ilanYok \}\)\}/.test(oneri));
  kontrol("öneri: toplam çizilen ilk N'nin değil, süzgecin tamamının", /const toplam = gorunen\.reduce\(/.test(oneri) && /const cizilen = gorunen\.slice\(0, ONERI_TAVANI\);/.test(oneri));
  const sayfa = yorumsuz(kaynakOku("src/app/rapor/alim-rehberi/page.tsx"));
  kontrol("sayfa: öneri kümeleri rehberin KENDİ listelerinden", /oneriKumesi\(k, \{ tukenen: listeler\.tukenen, iyiAlim, satirlar: veri\.satirlar \}, !fr\)/.test(sayfa));
  const liste = yorumsuz(kaynakOku("src/app/rapor/alim-rehberi/fiyat-takibi-oneri-listesi.tsx"));
  kontrol("liste: toplu seçim yalnız UYGUN satırlardan", /const secilebilir = satirlar\.filter\(\(s\) => s\.durum === "UYGUN"\)/.test(liste) && /disabled=\{!uygun \|\| kilitli\}/.test(liste));
  kontrol("liste: toplu ekleme ONAY penceresinden geçer", /<AlertDialogAction onClick=\{topluAl\}>/.test(liste) && !/onClick=\{topluAl\}/.test(liste.replace("<AlertDialogAction onClick={topluAl}>", "")));
}
kosanBolumler.push("oneri");

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
