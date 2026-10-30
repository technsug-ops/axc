/**
 * ============================================================================
 *  ÖZEL GÜN TAKVİMİ BEKÇİSİ (K363 Faz 2-b)
 * ----------------------------------------------------------------------------
 *  Saf gövde ÇAĞRILIR, değeri sınanır (anayasa: «saf hesap katmanı desen
 *  tarayan bekçiye muhtaç olmaz»). Her kuralın İKİ yakası örnekte. Kaynak
 *  taraması yalnız bağlar için — yorumsuz kodda ve kullanım bloğuna daraltılmış.
 * ============================================================================
 */
import { existsSync } from "node:fs";

import { kaynakOku } from "./kaynak-oku";
import {
  adDogrula,
  alimAra,
  alimKampanyasiListesi,
  alimToplami,
  aralikGunu,
  canAdaylari,
  carpan,
  EN_UZUN_ARALIK_GUN,
  gunCoz,
  kalanGun,
  oncekiTarih,
  ONCEDEN_HABER_GUN,
  ozelGunRehberAdresi,
  satisGunuListesi,
  tabanPenceresi,
  tarihDogrula,
  turDogrula,
  yaklasanlar,
  yaklasanTarihler,
  YAKLASAN_GUN,
  type AlimSatiri,
  type TarihSatiri,
} from "../src/lib/ozel-gun/ozel-gun";
import { gecenYilListesi, rehberKur } from "../src/lib/rapor/alim-rehberi";
import type { AnalizSatiri } from "../src/lib/rapor/urun-analizi";
import { MENU_ADRESLERI, MENU_KATALOGU } from "../src/lib/menu/katalog";
import { YEDEK_TABLOLARI } from "../src/lib/yedek-bicim";
import { uyarilariKur } from "../src/lib/uyari/kurallar";
import { UYARI_ADRESLERI, UYARI_IZINLERI, UYARI_SEVIYESI } from "../src/lib/uyari/turler";

let basarisiz = 0;
let calisan = 0;
const BOLUM_SAYISI = 8;
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
const g = (s: string) => new Date(`${s}T00:00:00Z`);
const yorumsuz = (s: string) => s.replace(/\{\/\*[\s\S]*?\*\/\}/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
const blok = (metin: string, capa: string, uzunluk: number) => {
  const i = metin.indexOf(capa);
  return i < 0 ? "" : metin.slice(i, i + uzunluk);
};
const tarih = (id: string, ozelGunId: string, bas: string, bit = bas): TarihSatiri => ({ id, ozelGunId, baslangic: g(bas), bitis: g(bit), dogrulandi: true });

// ── ① GİRDİ KAPILARI ────────────────────────────────────────────────────
console.log("\n① girdi kapıları — tarih · ad · tür");
{
  kontrol("gün: geçerli takvim günü kabul (2026-11-27)", gunCoz("2026-11-27")?.toISOString() === "2026-11-27T00:00:00.000Z");
  kontrol("gün: 31 Şubat REDDEDİLİR (sessizce Mart'a kaymaz)", gunCoz("2026-02-31") === null);
  kontrol("gün: 29 Şubat artık yılda kabul, değilse ret", gunCoz("2028-02-29") !== null && gunCoz("2027-02-29") === null);
  kontrol("gün: yıl 2000–2100 dışı ret (0202 yazım hatası)", gunCoz("0202-11-02") === null && gunCoz("2101-01-01") === null && gunCoz("2000-01-01") !== null);
  kontrol("gün: biçim dışı ret («2026-1-5», boş)", gunCoz("2026-1-5") === null && gunCoz("") === null);

  const tek = tarihDogrula("2026-11-27", "");
  kontrol("tarih: bitiş boş → tek günlük (bitiş = başlangıç)", tek.tamam && tek.bitis.getTime() === tek.baslangic.getTime());
  kontrol("tarih: bitiş başlangıçtan önce → BITIS_ONCE", !tarihDogrula("2026-11-27", "2026-11-26").tamam && (tarihDogrula("2026-11-27", "2026-11-26") as { hata: string }).hata === "BITIS_ONCE");
  const sinir = new Date(g("2026-01-01").getTime() + (EN_UZUN_ARALIK_GUN - 1) * 86_400_000).toISOString().slice(0, 10);
  const asan = new Date(g("2026-01-01").getTime() + EN_UZUN_ARALIK_GUN * 86_400_000).toISOString().slice(0, 10);
  kontrol(`tarih: tam ${EN_UZUN_ARALIK_GUN} gün kabul (sınır dahil)`, tarihDogrula("2026-01-01", sinir).tamam, sinir);
  kontrol(`tarih: ${EN_UZUN_ARALIK_GUN + 1} gün → ARALIK_UZUN`, (tarihDogrula("2026-01-01", asan) as { hata?: string }).hata === "ARALIK_UZUN", asan);
  kontrol("tarih: geçersiz gün → TARIH_GECERSIZ", (tarihDogrula("2026-02-31", "") as { hata?: string }).hata === "TARIH_GECERSIZ");
  kontrol("aralık günü iki uç dahil (27.11–27.11 = 1 · 01.11–30.11 = 30)", aralikGunu(g("2026-11-27"), g("2026-11-27")) === 1 && aralikGunu(g("2026-11-01"), g("2026-11-30")) === 30);

  const ad = adDogrula("  Black   Friday ");
  kontrol("ad: boşluk sadeleşir («Black Friday»)", ad.tamam && ad.ad === "Black Friday");
  kontrol("ad: boş → AD_BOS · 101 karakter → AD_UZUN · 100 kabul", (adDogrula("   ") as { hata?: string }).hata === "AD_BOS" && (adDogrula("x".repeat(101)) as { hata?: string }).hata === "AD_UZUN" && adDogrula("x".repeat(100)).tamam);
  kontrol("tür: iki tür kabul, başkası null", turDogrula("SATIS_GUNU") === "SATIS_GUNU" && turDogrula("ALIM_KAMPANYASI") === "ALIM_KAMPANYASI" && turDogrula("BAYRAM") === null);
}
kosanBolumler.push("girdi");

// ── ② GEÇEN YILKI KARŞILIK ───────────────────────────────────────────────
console.log("\n② geçen yılki karşılık — aynı günün bir önceki tarihi");
{
  const tarihler = [
    tarih("bf24", "BF", "2024-11-29"),
    tarih("bf25", "BF", "2025-11-28"),
    tarih("bf26", "BF", "2026-11-27"),
    tarih("kb26", "KB", "2026-05-27", "2026-05-30"), // BAŞKA gün, BF25 ile BF26 ARASINDA — karşılık süzgeci kalkarsa seçilecek olan
  ];
  kontrol("karşılık: aynı günün EN YAKIN önceki tarihi (BF26 → BF25, BF24 değil)", oncekiTarih(tarihler, tarihler[2])?.id === "bf25");
  kontrol("karşılık: başka günün tarihi seçilmez (KB26, BF26'ya BF25'ten yakın olsa da)", oncekiTarih(tarihler, tarihler[2])?.ozelGunId === "BF");
  kontrol("karşılık: ilk tarihin karşılığı yok → null", oncekiTarih(tarihler, tarihler[0]) === null);
  kontrol("karşılık: aynı başlangıç kendi karşılığı sayılmaz", oncekiTarih([tarih("a", "X", "2025-01-01"), tarih("b", "X", "2025-01-01")], tarih("b", "X", "2025-01-01")) === null);
}
kosanBolumler.push("karsilik");

// ── ③ YAKLAŞANLAR ────────────────────────────────────────────────────────
console.log("\n③ yaklaşanlar — sürenler dahil, ufuk sınırı, pasif gün");
{
  const bugun = g("2026-10-24");
  const ufukSon = new Date(bugun.getTime() + YAKLASAN_GUN * 86_400_000).toISOString().slice(0, 10);
  const ufukDis = new Date(bugun.getTime() + (YAKLASAN_GUN + 1) * 86_400_000).toISOString().slice(0, 10);
  const t = [
    tarih("bitti", "A", "2026-10-20", "2026-10-23"), // dün bitti → GİRMEZ
    tarih("suruyor", "B", "2026-10-20", "2026-10-24"), // bugün son günü → GİRER
    tarih("ufuk", "C", ufukSon), // tam ufuk → GİRER
    tarih("dis", "D", ufukDis), // ufuk + 1 → GİRMEZ
    tarih("bf", "E", "2026-11-27"),
  ];
  const ids = yaklasanTarihler(t, bugun, YAKLASAN_GUN).map((x) => x.id).join(",");
  kontrol("dün biten girmez · bugün süren girer · ufuk dahil · ufuk+1 girmez · başlangıca göre sıralı", ids === "suruyor,bf,ufuk", ids);
  kontrol("kalan gün: süren 0 · 27.11 için 34", kalanGun(t[1], bugun) === 0 && kalanGun(t[4], bugun) === 34);

  const kayitlar = [
    { id: "E", aktif: true, tarihler: [tarih("bf25", "E", "2025-11-28"), tarih("bf", "E", "2026-11-27")] },
    { id: "P", aktif: false, tarihler: [tarih("p", "P", "2026-11-01")] },
  ];
  const y = yaklasanlar(kayitlar, bugun);
  kontrol("pasif gün listelenmez, aktif gün karşılığıyla gelir (BF26 → BF25)", y.length === 1 && y[0].tarih.id === "bf" && y[0].onceki?.id === "bf25" && y[0].gun.id === "E", y.map((x) => x.tarih.id));
}
kosanBolumler.push("yaklasan");

// ── ④ ÇARPAN ─────────────────────────────────────────────────────────────
console.log("\n④ mağaza çarpanı — pencere ÷ önceki 28 gün");
{
  const tp = tabanPenceresi(g("2025-11-28"));
  kontrol("taban: başlangıçtan önceki 28 gün (31.10 – 27.11), başlangıç günü HARİÇ", tp.baslangic === "2025-10-31" && tp.bitis === "2025-11-27", tp);
  const c = carpan({ siparis: 48, gun: 1 }, { siparis: 476, gun: 28 });
  kontrol("çarpan: günde 48 ÷ günde 17 ≈ 2,82", c !== null && Math.abs(c - 48 / 17) < 1e-9, c);
  kontrol("çarpan: çok günlük pencere günlüğe çevrilir (60 sipariş / 3 gün ÷ 10/gün = 2)", carpan({ siparis: 60, gun: 3 }, { siparis: 280, gun: 28 }) === 2);
  kontrol("çarpan: taban boş → null (sıfır ya da «normal» DEĞİL)", carpan({ siparis: 10, gun: 1 }, { siparis: 0, gun: 28 }) === null);
  kontrol("çarpan: pencerede sipariş yok ama taban dolu → 0 (gerçek ölçüm)", carpan({ siparis: 0, gun: 1 }, { siparis: 28, gun: 28 }) === 0);
}
kosanBolumler.push("carpan");

// ── ⑤ SATIŞ GÜNÜ LİSTESİ ─────────────────────────────────────────────────
console.log("\n⑤ satış günü listesi — tek günde 1 adet de girer");
{
  const satir = (id: string, o: Partial<AnalizSatiri>): AnalizSatiri =>
    ({
      variantId: id, urunAdi: `Ürün ${id}`, sku: `SKU-${id}`, adet: 0, ciro: 0, net1: 0, net2: 0, hesaplananCiro: 0, hesaplananAdet: 0,
      hesaplanamayanKalem: 0, kalemSayisi: 0, urunId: `u-${id}`, marka: null, kategori: null, yasGun: null, bagliSermaye: null, rafAdedi: null,
      barkod: null, firmaSku: null, kanalKodlari: [], isFavorite: false, needsReview: false, season: null, ...o,
    }) as AnalizSatiri;
  const sat = (id: string, adet: number, ciro: number, net2: number) => satir(id, { adet, ciro, net2, hesaplananCiro: ciro, hesaplananAdet: adet, kalemSayisi: adet });
  const r = rehberKur(
    [
      sat("S1", 1, 1000, 100), // tek adet, raf 0 → GİRER (geçen yıl sekmesinde girmezdi)
      sat("S2", 4, 4000, 300), // raf 1 → eksik 3 → GİRER, en başta
      sat("S3", 2, 2000, -50), // zarar → GİRMEZ
      satir("S4", { adet: 2, ciro: 2000, net2: 0, hesaplananCiro: 0, kalemSayisi: 2, hesaplanamayanKalem: 2 }), // kâr hesaplanamadı → GİRMEZ
      sat("S5", 2, 2000, 200), // raf 2 → eksik 0 → GİRMEZ (tam sınır)
      sat("S6", 1, 900, 150), // eksik 1, NET-2 S1'den büyük → S1'den ÖNCE
    ],
    [{ ...satir("S2", { rafAdedi: 1, bagliSermaye: 100 }) }, { ...satir("S5", { rafAdedi: 2, bagliSermaye: 100 }) }],
    1,
  );
  const ad = satisGunuListesi(r).map((x) => x.variantId).join(",");
  kontrol("liste: eksiğe göre, eşitse NET-2 (S2 3 · S6 1/150 · S1 1/100)", ad === "S2,S6,S1", ad);
  kontrol("liste: zarar, hesaplanamayan ve eksiği 0 olan girmez", !/S3|S4|S5/.test(ad), ad);
  kontrol("ayrım: aynı tek adetli ürün geçen yıl sekmesinde GİRMEZ (en az 3), burada GİRER", !gecenYilListesi(r).some((x) => x.variantId === "S1") && ad.includes("S1"));
}
kosanBolumler.push("satis-listesi");

// ── ⑥ ALIM KAMPANYASI LİSTESİ ────────────────────────────────────────────
console.log("\n⑥ alım kampanyası listesi — bugünkü talebe göre");
{
  const a = (id: string, alinan: number, raf: number, donemSatis: number, ad = `Ürün ${id}`): AlimSatiri => ({ variantId: id, urunId: null, urunAdi: ad, sku: `SKU-${id}`, barkod: id === "A2" ? "8690000000002" : null, firmaSku: null, alinan, raf, donemSatis });
  const l = alimKampanyasiListesi([a("A1", 5, 0, 3), a("A2", 2, 1, 9), a("A3", 0, 4, 20), a("A4", 8, 2, 3)]);
  const ad = l.map((x) => x.variantId).join(",");
  kontrol("sıra: bugünkü talep, eşitse alınan adet (A2 9 · A4 3/8 · A1 3/5)", ad === "A2,A4,A1", ad);
  kontrol("alınmamış (0) ürün girmez (A3)", !ad.includes("A3"));
  const tp = alimToplami(l);
  kontrol("toplam: ürün 3 · alınan 15 · raf 3 · talep 15", tp.urun === 3 && tp.alinan === 15 && tp.raf === 3 && tp.donemSatis === 15, tp);
  kontrol("arama: barkodla bulur, boş arama hepsini döndürür", alimAra(l, "8690000000002").length === 1 && alimAra(l, "  ").length === 3);
}
kosanBolumler.push("alim-listesi");

// ── ⑦ BAĞLAR ─────────────────────────────────────────────────────────────
console.log("\n⑦ bağlar — sayfa · yazma · Excel · yedek · menü");
{
  const sayfa = yorumsuz(kaynakOku("src/app/rapor/alim-rehberi/page.tsx"));
  kontrol("rehber: ayrıntı bugünkü stokla ve seçili dönemle kurulur", /await ozelGunDetayi\(seciliGun, an, veri\.stok, veri\.satirlar\)/.test(sayfa));
  kontrol("rehber: yaklaşanlar İSTANBUL günüyle (çalışma ortamı saati değil)", /const bugun = gunDegeri\(isTakvimGunu\(an\)\);/.test(sayfa) && /yaklasanlar\(ozelKayitlar, bugun\)/.test(sayfa));
  kontrol("rehber: özel gün sekmesinde bileşen çizilir", /\{oz \? \(\s*<OzelGunSekmesi/.test(sayfa));
  /* Faz 2-d (24.10): koşul `oz || ia ? null : (` — iyi alım sekmesinde de Excel yok; özel gün kapısı aynen ölçülür. */
  /* Faz 3-d (30.10): koşul `oz || ia || ft ? null : (` — fiyat takibi sekmesinde de Excel yok. */
  const excelDali = blok(sayfa, "{oz || ia || ft ? null : (\n        <a", 200) || blok(sayfa, "{oz || ia || ft ? null : (\r\n        <a", 200);
  kontrol("rehber: özel gün sekmesinde Excel düğmesi ÇİZİLMEZ", /href=\{excelAdresi\}/.test(excelDali), excelDali.slice(0, 60));

  const excel = yorumsuz(kaynakOku("src/app/rapor/alim-rehberi/excel/route.ts"));
  kontrol("Excel: özel gün sekmesi başka liste indirmez, nedeni söylenir (400)", /if \(liste === "ozelGun"\) return new Response\(t\("excelOzelGunYok"\), \{ status: 400/.test(excel));

  const verisi = yorumsuz(kaynakOku("src/lib/ozel-gun/ozel-gun-verisi.ts"));
  kontrol("veri: alım listesi taslak ve iptal edilmiş alımı saymaz", (verisi.match(/status: \{ notIn: \["DRAFT", "CANCELLED"\] \}/g) ?? []).length === 2);
  kontrol("veri: taban defterin ilk satışından önceye taşarsa çarpan KURULMAZ", /const tabanTam = ilkKayit !== null && ilkKayit\.getTime\(\) <= taban\.baslangic\.getTime\(\);/.test(verisi) && /carpan: tabanTam\s*\?/.test(verisi));
  kontrol("veri: satış günü listesi pencere gününe bölünür (rehberKur(satis, stok, pencereGun))", /satisGunuListesi\(rehberKur\(satis, stok, pencereGun\)\)/.test(verisi));
  kontrol("veri: kanala özgü günde satış ve sipariş sayısı o kanalla süzülür", /satisEkseniVerisi\(p, "TRY", y\.gun\.kanal\?\.kod \?\? null\)/.test(verisi) && /siparisSayisi\(p\.baslangic, p\.bitisHaric, kanalId\)/.test(verisi));

  const yaz = yorumsuz(kaynakOku("src/lib/ozel-gun/ozel-gun-yaz.ts"));
  const silBlogu = blok(yaz, "export async function ozelGunSil", 900);
  kontrol("yazma: geçmişi olan gün SİLİNMEZ (bugünden önce başlayan tarih → GECMISI_VAR, silmeden ÖNCE)",
    /if \(eski\.tarihler\.some\(\(t\) => t\.baslangic\.getTime\(\) < bugun\.getTime\(\)\)\) return \{ tamam: false, hata: "GECMISI_VAR" \}/.test(silBlogu) &&
      silBlogu.indexOf("GECMISI_VAR") >= 0 && silBlogu.indexOf("tx.ozelGun.delete") > silBlogu.indexOf("GECMISI_VAR"));
  const yazicilar = ["ozelGunEkle", "ozelGunGuncelle", "ozelGunAktifDegistir", "ozelGunSil", "tarihEkle", "tarihGuncelle", "tarihSil"];
  for (const ad of yazicilar) {
    const b = blok(yaz, `export async function ${ad}(`, 2400);
    const son = b.indexOf("\nexport async function", 10);
    const govde = son > 0 ? b.slice(0, son) : b;
    kontrol(`yazma: ${ad} iz bırakır (işlem içinde, tx ile)`, /await izYaz\(\s*\{[\s\S]*?action: [^,]*?"OZEL_GUN_[A-Z_]+"[\s\S]*?\},\s*tx,?\s*\)/.test(govde));
  }
  const eylem = yorumsuz(kaynakOku("src/app/ayarlar/ozel-gunler/eylemler.ts"));
  /* Her DIŞA AÇIK eylem izni KENDİ gövdesinin ilk satırında sorar (yetki:dogrula ile aynı kural) — sayım dışa aktarılan eylem sayısına bağlı. */
  const eylemAdlari = [...eylem.matchAll(/export async function (\w+)\(/g)].map((m) => m[1]);
  const izinsiz = eylemAdlari.filter((ad) => !new RegExp(`export async function ${ad}\\([^)]*\\): Promise<EylemSonucu> \\{\\s*if \\(!\\(await izinVarMi\\("ayar\\.yaz"\\)\\)\\) return YETKISIZ;`).test(eylem));
  kontrol("eylem: her eylem izni KENDİ gövdesinde sorar (ayar.yaz)", eylemAdlari.length >= 7 && izinsiz.length === 0, { eylemAdlari, izinsiz });
  kontrol("eylem: beklenmeyen hata günlüğe TAM yazılır", /console\.error\(`\[\$\{ad\}\] beklenmeyen hata:`, e\);/.test(eylem));
  kontrol("eylem: silmede bugün İSTANBUL günüyle verilir", /ozelGunSil\(id, gunDegeri\(isTakvimGunu\(new Date\(\)\)\)\)/.test(eylem));

  const iO = YEDEK_TABLOLARI.indexOf("OzelGun" as never);
  const iT = YEDEK_TABLOLARI.indexOf("OzelGunTarihi" as never);
  const iC = YEDEK_TABLOLARI.indexOf("Channel" as never);
  kontrol("yedek: iki tablo da listede, sıra Channel → OzelGun → OzelGunTarihi", iC >= 0 && iO > iC && iT > iO, { iC, iO, iT });
  const yedek = yorumsuz(kaynakOku("src/lib/yedek.ts"));
  kontrol("yedek: üretici iki tabloyu da okur", /OzelGun: await istemci\.ozelGun\.findMany\(\)/.test(yedek) && /OzelGunTarihi: await istemci\.ozelGunTarihi\.findMany\(\)/.test(yedek));

  kontrol("menü: «Özel günler» Ayarlar grubunda ve adresi var olan sayfaya gider",
    MENU_ADRESLERI.ozelGunler === "/ayarlar/ozel-gunler" && MENU_KATALOGU.some((m) => m.anahtar === "ozelGunler" && m.varsayilanGrup === "grupAyarlar") && existsSync("src/app/ayarlar/ozel-gunler/page.tsx"));
  const ayar = yorumsuz(kaynakOku("src/app/ayarlar/ozel-gunler/page.tsx"));
  kontrol("ayar sayfası: izin ayar.yaz · arama ortak bileşenle (İlke #17)", /await sayfaIzni\("ayar\.yaz"\)/.test(ayar) && /<KodAramaKutusu temelAdres=\{OZEL_GUN_YOLU\}/.test(ayar));
  kontrol("ayar sayfası: «geçmişi var» bugünden önce başlayan tarihle (sunucu kapısıyla AYNI ölçüt)", /gecmisiVar: k\.tarihler\.some\(\(x\) => x\.baslangic\.getTime\(\) < bugun\.getTime\(\)\)/.test(ayar));
}
kosanBolumler.push("baglar");

// ── ⑧ ÇAN — ÖNCEDEN HABER (Faz 2-c) ─────────────────────────────────────
console.log("\n⑧ çan — 30 gün önceden haber · sayı = liste · seçilen gün açılır");
{
  const bugun = g("2026-10-24");
  const gunSonra = (n: number) => new Date(bugun.getTime() + n * 86_400_000).toISOString().slice(0, 10);
  const once = tarih("once", "X", "2025-11-01");
  const y = (id: string, bas: string, onceki: TarihSatiri | null, bit = bas) => ({ tarih: tarih(id, "X", bas, bit), onceki });
  const aday = canAdaylari(
    [
      y("suruyor", "2026-10-20", once, "2026-10-25"), // sürüyor (kalan 0) → GİRER
      y("sinir", gunSonra(ONCEDEN_HABER_GUN), once), // tam 30 → GİRER
      y("karsiliksiz", gunSonra(5), null), // karşılığı yok → GİRMEZ
      y("dis", gunSonra(ONCEDEN_HABER_GUN + 1), once), // 31 → GİRMEZ
    ],
    bugun,
  ).map((a) => a.tarih.id).join(",");
  kontrol(`aday: süren girer · tam ${ONCEDEN_HABER_GUN} gün girer · ${ONCEDEN_HABER_GUN + 1} girmez · karşılıksız girmez`, aday === "suruyor,sinir", aday);
  kontrol("önceden haber 30 gün (kullanıcı kararı 24.10.2026)", ONCEDEN_HABER_GUN === 30);

  kontrol("adres: taban sekme, seçili gün tarihin kimliğiyle", ozelGunRehberAdresi(null) === "/rapor/alim-rehberi?liste=ozelGun" && ozelGunRehberAdresi("t1") === "/rapor/alim-rehberi?liste=ozelGun&gun=t1");
  kontrol("uyarı tanımı: taban adres · nötr · satis.kar.gor", UYARI_ADRESLERI.ozelGunYaklasiyor === ozelGunRehberAdresi(null) && UYARI_SEVIYESI.ozelGunYaklasiyor === "notr" && UYARI_IZINLERI.ozelGunYaklasiyor === "satis.kar.gor");

  const taban = { nakitAcigi: { sayi: 0 }, maliyetsizStok: { sayi: 0 }, karHesaplanamayan: { sayi: 0 }, hakedisGecikti: { sayi: 0 }, cevapsizTalep: { sayi: 0 }, yedekEski: { sayi: 0 }, yedekYok: { sayi: 0 }, yedekIzden: { sayi: 0 }, veriSupheli: { sayi: 0 }, iadeSayaciDoluyor: { sayi: 0 }, kanalKodsuzStok: { sayi: 0 }, hakedisBaglanmamis: { sayi: 0 }, zararinaSatis: { sayi: 0 } };
  const degiskenler = { ad: "11.11", tur: "SATIS_GUNU", kalan: 18, diger: 0 };
  const u = uyarilariKur({ ...taban, ozelGunYaklasiyor: { sayi: 20, adres: ozelGunRehberAdresi("t1"), degiskenler } });
  const oz = u.find((x) => x.anahtar === "ozelGunYaklasiyor");
  kontrol("kural: ölçümün adresi (seçili gün) ve değişkenleri uyarıya geçer", oz?.adres === ozelGunRehberAdresi("t1") && oz?.sayi === 20 && oz?.degiskenler?.ad === "11.11", oz);
  const sifir = uyarilariKur({ ...taban, ozelGunYaklasiyor: { sayi: 0, adres: "/x" } });
  kontrol("kural: sayı 0 → uyarı yok", !sifir.some((x) => x.anahtar === "ozelGunYaklasiyor"));
  const adressiz = uyarilariKur({ ...taban, ozelGunYaklasiyor: { sayi: 3 } }).find((x) => x.anahtar === "ozelGunYaklasiyor");
  kontrol("kural: adres verilmezse taban adres · değişken yoksa alan da yok", adressiz?.adres === ozelGunRehberAdresi(null) && adressiz !== undefined && !("degiskenler" in adressiz));

  const verisi = yorumsuz(kaynakOku("src/lib/ozel-gun/ozel-gun-verisi.ts"));
  const canGovde = blok(verisi, "export async function ozelGunCanOlcumu(", 1600);
  kontrol("veri: çan rehberle AYNI detay gövdesini AYNI stokla çağırır (sayı = liste)", /await ozelGunDetayi\(a, an, stok, \[\]\)/.test(canGovde) && /await rehberStoku\(an\)/.test(canGovde));
  kontrol("veri: listesi boş aday atlanır, öteki adaylar «diger» sayılır", /if \(sayi === 0\) continue;/.test(canGovde) && /diger: adaylar\.length - 1/.test(canGovde) && /adres: ozelGunRehberAdresi\(a\.tarih\.id\)/.test(canGovde));
  kontrol("veri: aday yoksa ağır okuma yapılmaz", canGovde.indexOf("if (adaylar.length === 0) return { sayi: 0 };") >= 0 && canGovde.indexOf("if (adaylar.length === 0) return { sayi: 0 };") < canGovde.indexOf("rehberStoku(an)"));
  const rehberV = yorumsuz(kaynakOku("src/lib/rapor/alim-rehberi-verisi.ts"));
  kontrol("rehber: stok aynı gövdeden (rehberStoku(an))", /rehberStoku\(an\),/.test(blok(rehberV, "export async function rehberVerisi(", 1500)));
  const sayfa = yorumsuz(kaynakOku("src/app/rapor/alim-rehberi/page.tsx"));
  kontrol("rehber: adresteki gün tarih kimliğiyle seçilir", /yaklasan\.find\(\(y\) => y\.tarih\.id === p\.gun\)/.test(sayfa));
  const topla = yorumsuz(kaynakOku("src/lib/uyari/topla.ts"));
  kontrol("toplayıcı: ölçüm çağrılır ve uyarıya verilir", /ozelGunCanOlcumu\(new Date\(\)\),/.test(topla) && /ozelGunYaklasiyor: ozelGunOlcumu,/.test(topla));
  const can = yorumsuz(kaynakOku("src/components/uyari-cani.tsx"));
  kontrol("çan: başlık metni ölçümün değişkenlerini alır", /t\(`baslik_\$\{u\.anahtar\}`, \{ sayi: u\.sayi, \.\.\.u\.degiskenler \}\)/.test(can));
  const tr = JSON.parse(kaynakOku("messages/tr.json")).Uyari as Record<string, string>;
  const baslik = tr.baslik_ozelGunYaklasiyor ?? "";
  /* Başlıktaki her değişken ölçümün verdiği kümeden olmalı — eksik değişken next-intl'de ÇALIŞMA ANINDA hata verir. */
  const verilen = new Set(["sayi", "ad", "tur", "kalan", "diger"]);
  const kullanilan = [...baslik.matchAll(/\{(\w+)[,}]/g)].map((m) => m[1]);
  kontrol("sözlük: başlık yalnız ölçümün verdiği değişkenleri kullanır (gün adı · kalan · tür · +N gün)",
    ["ad", "kalan", "tur", "diger", "sayi"].every((d) => kullanilan.includes(d)) && kullanilan.every((d) => verilen.has(d)) && /ALIM_KAMPANYASI/.test(baslik), kullanilan);
  kontrol("veri: ölçüm başlığın dört değişkenini verir", /degiskenler: \{ ad: a\.gun\.ad, tur: a\.gun\.tur, kalan: kalanGun\(a\.tarih, bugun\), diger: adaylar\.length - 1 \}/.test(canGovde));
  kontrol(`sözlük: eylem önceden haber süresini (${ONCEDEN_HABER_GUN}) ve varsayım olduğunu yazar`, (tr.eylem_ozelGunYaklasiyor ?? "").includes(`${ONCEDEN_HABER_GUN} gün`) && /varsayım/.test(tr.eylem_ozelGunYaklasiyor ?? ""));
}
kosanBolumler.push("can");

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
