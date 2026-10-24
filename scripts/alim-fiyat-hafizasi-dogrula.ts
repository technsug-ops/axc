/**
 * ============================================================================
 *  ALIM FİYATI HAFIZASI BEKÇİSİ (K363 Faz 2-d)
 * ----------------------------------------------------------------------------
 *  Saf gövde ÇAĞRILIR, değeri sınanır; kaynak taraması yalnız bağlar için
 *  (yorumsuz kodda, kullanım bloğuna daraltılmış). Her kuralın İKİ yakası örnekte.
 *  ⛔ ANAYASA AÇILIŞ ŞARTI: «aynı varyantın iki tarihli maliyetini kıyaslayan
 *  ilk kod yazıldığı gün bekçisi yazılır» — bu dosya o bekçidir: fark bir
 *  HATIRLATMADIR, şüphe/uyarı rengi ÜRETMEZ, kaydı ENGELLEMEZ, fiyatı DOLDURMAZ.
 * ============================================================================
 */
import { kaynakOku } from "./kaynak-oku";
import {
  cariFiyatGonderimi,
  enUcuzaGoreFark,
  fiyatHafizasi,
  kiyasFiyati,
  iyiAlimAra,
  iyiAlimListesi,
  iyiAlimToplami,
  kiyasDisiSayisi,
  kiyaslanabilirMi,
  ortanca,
  type AlisKaydi,
  type FiyatHafizasi,
} from "../src/lib/alim-fiyat-hafizasi";
import { REHBER_SEKMELERI, type RehberSatiri } from "../src/lib/rapor/alim-rehberi";

let basarisiz = 0;
let calisan = 0;
const BOLUM_SAYISI = 7;
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
const a = (tarih: string, birim: number, o: Partial<AlisKaydi> = {}): AlisKaydi => ({
  tarih: g(tarih), birim, cari: null, paraBirimi: "TRY", kdvDahil: true, kargoDahil: true, gumrukVar: false, promosyon: false, ...o,
});
const yorumsuz = (s: string) => s.replace(/\{\/\*[\s\S]*?\*\/\}/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
const blok = (metin: string, capa: string, uzunluk: number) => {
  const i = metin.indexOf(capa);
  return i < 0 ? "" : metin.slice(i, i + uzunluk);
};

// ── ① KIYAS KAPISI ──────────────────────────────────────────────────────
console.log("\n① kıyas kapısı — aynı taban, aynı para birimi");
{
  kontrol("normal TL alış kıyasa girer", kiyaslanabilirMi(a("2026-01-01", 100), "TRY"));
  kontrol("KDV hariç alış girmez", !kiyaslanabilirMi(a("2026-01-01", 100, { kdvDahil: false }), "TRY"));
  kontrol("kargo ayrı alış girmez", !kiyaslanabilirMi(a("2026-01-01", 100, { kargoDahil: false }), "TRY"));
  kontrol("gümrüklü alış girmez", !kiyaslanabilirMi(a("2026-01-01", 100, { gumrukVar: true }), "TRY"));
  kontrol("bedava (promosyon) girmez — yoksa ₺0 hep «en ucuz» olurdu", !kiyaslanabilirMi(a("2026-01-01", 0, { promosyon: true }), "TRY"));
  /* Örnek YALNIZ promosyon kapısına takılmalı: fiyatı 0 olan bedava kalem «fiyat > 0» kapısına da takılır ve
     promosyon kapısını hiç çalıştırmaz (mutasyonla görüldü 24.10). Fiyatı dolu bir bedava işareti de dışarıda kalır. */
  kontrol("bedava işaretli kalem, fiyatı dolu olsa da girmez", !kiyaslanabilirMi(a("2026-01-01", 100, { promosyon: true }), "TRY"));
  kontrol("fiyat 0 girmez", !kiyaslanabilirMi(a("2026-01-01", 0), "TRY"));
  kontrol("başka para birimi girmez (EUR ≠ TRY)", !kiyaslanabilirMi(a("2026-01-01", 100, { paraBirimi: "EUR" }), "TRY") && kiyaslanabilirMi(a("2026-01-01", 100, { paraBirimi: "EUR" }), "EUR"));
  const karisik = [a("2026-01-01", 100), a("2026-02-01", 80, { kdvDahil: false }), a("2026-03-01", 0, { promosyon: true }), a("2026-04-01", 50, { paraBirimi: "EUR" })];
  const h = fiyatHafizasi(karisik, "TRY");
  kontrol("kıyas dışı TL kalemleri sayılır (2) · EUR ayrı birimde sayılmaz", h?.kiyasDisi === 2 && kiyasDisiSayisi(karisik, "TRY") === 2 && kiyasDisiSayisi(karisik, "EUR") === 0, h);
  kontrol("KDV hariç ₺80 «en ucuz» SEÇİLMEZ (taban farklı)", h?.enUcuz.fiyat === 100);
  kontrol("kıyaslanabilir kalem yoksa null (geçmiş yok ≠ ₺0)", fiyatHafizasi([a("2026-01-01", 0, { promosyon: true })], "TRY") === null && fiyatHafizasi([], "TRY") === null);
}
kosanBolumler.push("kapi");

// ── ② HAFIZA ───────────────────────────────────────────────────────────
console.log("\n② hafıza — en ucuz · normal · son · gün sayısı");
{
  const k = [a("2025-11-11", 1069), a("2025-12-24", 1250), a("2026-03-20", 1300), a("2026-10-02", 1380)];
  const h = fiyatHafizasi(k, "TRY") as FiyatHafizasi;
  kontrol("en ucuz 1.069 · 11.11.2025", h.enUcuz.fiyat === 1069 && h.enUcuz.tarih.getTime() === g("2025-11-11").getTime());
  kontrol("son 1.380 · 02.10.2026", h.son.fiyat === 1380 && h.son.tarih.getTime() === g("2026-10-02").getTime());
  kontrol("normal = ortanca (çift: (1250+1300)/2 = 1275)", h.normal === 1275, h.normal);
  kontrol("alış 4 · gün 4", h.alisSayisi === 4 && h.gunSayisi === 4);
  kontrol("ortanca tek sayıda ortadaki (3,1,2 → 2) · boş → null", ortanca([3, 1, 2]) === 2 && ortanca([]) === null);
  const sirasiz = fiyatHafizasi([a("2026-10-02", 1380), a("2025-11-11", 1069)], "TRY") as FiyatHafizasi;
  kontrol("son, geliş sırasından değil TARİHTEN (ters sırada verilse de 02.10.2026)", sirasiz.son.fiyat === 1380 && sirasiz.enUcuz.fiyat === 1069);
  const esit = fiyatHafizasi([a("2025-11-11", 900), a("2026-05-01", 900), a("2026-06-01", 1000)], "TRY") as FiyatHafizasi;
  kontrol("en ucuz eşitse en YENİ tarihlisi (01.05.2026)", esit.enUcuz.tarih.getTime() === g("2026-05-01").getTime());
  const ayniGun = fiyatHafizasi([a("2026-01-01", 500), a("2026-02-01", 700), a("2026-02-01", 650)], "TRY") as FiyatHafizasi;
  kontrol("aynı gün iki kalem: son = sıradaki SONUNCU (650) · gün sayısı 2", ayniGun.son.fiyat === 650 && ayniGun.gunSayisi === 2 && ayniGun.alisSayisi === 3);
  const kupon = fiyatHafizasi([a("2025-08-01", 27), a("2025-11-01", 1000), a("2026-01-01", 1050), a("2026-06-01", 1049)], "TRY") as FiyatHafizasi;
  kontrol("uç değer (kupon ₺27, cari girilmemiş): en ucuz 27 yazar AMA normal onu dengeler (1.024,5)", kupon.enUcuz.fiyat === 27 && kupon.normal === 1024.5, kupon.normal);
}
kosanBolumler.push("hafiza");

// ── ②b CARİ FİYAT (kullanıcı kararı 24.10.2026: «kupon fiyatlar değil cari fiyatlar olsun») ──
console.log("\n②b cari fiyat — kuponlu alışta kıyas kuponsuz fiyatla");
{
  const k = [a("2025-08-01", 27, { cari: 1299 }), a("2025-11-01", 1000), a("2026-01-01", 1050), a("2026-06-01", 1049)];
  const h = fiyatHafizasi(k, "TRY") as FiyatHafizasi;
  kontrol("kupon ₺27 cari ₺1.299 ile kıyaslanır → en ucuz artık 1.000 (01.11.2025)", h.enUcuz.fiyat === 1000 && h.enUcuz.tarih.getTime() === g("2025-11-01").getTime(), h.enUcuz);
  kontrol("normal de cari fiyatla (1.049,5)", h.normal === 1049.5, h.normal);
  kontrol("cari kullanılan kalem sayılır (1) — ekranda yazar", h.cariKullanilan === 1);
  /* Ayrım örneği: en ucuz alışın KENDİSİ kuponlu — ödenenle (900) ve cariyle (950) iki farklı sonuç verir (mutasyonla görüldü 24.10). */
  const enUcuzKuponlu = fiyatHafizasi([a("2025-11-01", 900, { cari: 950 }), a("2026-06-01", 1000)], "TRY") as FiyatHafizasi;
  kontrol("en ucuz alış kuponluysa en ucuz fiyat CARİ (950, 900 değil)", enUcuzKuponlu.enUcuz.fiyat === 950, enUcuzKuponlu.enUcuz);
  const sonCari = fiyatHafizasi([a("2025-11-01", 1000), a("2026-06-01", 800, { cari: 1200 })], "TRY") as FiyatHafizasi;
  kontrol("son alış kuponluysa son fiyat da cari (1.200)", sonCari.son.fiyat === 1200);
  kontrol("cari boşsa ödenen kullanılır (kiyasFiyati)", kiyasFiyati(a("2026-01-01", 500)) === 500 && kiyasFiyati(a("2026-01-01", 500, { cari: 700 })) === 700);
  kontrol("cari girilmiş BEDAVA kalem yine kıyasa girmez", !kiyaslanabilirMi(a("2026-01-01", 0, { promosyon: true, cari: 999 }), "TRY"));
  kontrol("formdan gönderim: boş → null · «1.299» değil «1299,5» → 1299,5 · okunamayan metin olduğu gibi (sessiz null değil)",
    cariFiyatGonderimi("  ") === null && cariFiyatGonderimi(undefined) === null && cariFiyatGonderimi("1299,5") === 1299.5 && cariFiyatGonderimi("12a") === "12a");
}
kosanBolumler.push("cari");

// ── ③ FARK ─────────────────────────────────────────────────────────────
console.log("\n③ fark — ölçü, yargı değil");
{
  kontrol("1.380 / 1.069 → +%29,09", Math.abs((enUcuzaGoreFark(1380, 1069) ?? 0) - 29.0926) < 0.001);
  kontrol("aşağı fark eksi (900 / 1.000 → −%10)", enUcuzaGoreFark(900, 1000) === -10);
  kontrol("en ucuz 0 ya da fiyat sayı değil → null (bölünmez)", enUcuzaGoreFark(10, 0) === null && enUcuzaGoreFark(Number.NaN, 10) === null);
}
kosanBolumler.push("fark");

// ── ④ «KAMPANYADA İYİ ALDIKLARIN» LİSTESİ ─────────────────────────────
console.log("\n④ iyi alım listesi — satılan + iki farklı gün + son > en ucuz");
{
  const satir = (id: string, adet: number, raf = 0): RehberSatiri => ({
    variantId: id, urunId: null, urunAdi: `Ürün ${id}`, sku: `SKU-${id}`, barkod: id === "B" ? "8690000000002" : null, firmaSku: null,
    marka: null, kategori: null, adet, ciro: 0, net2: 0, marj: null, gunlukSatis: 0, gunlukNet2: 0, raf, stokGunu: null, bagliSermaye: null,
  });
  const h = (k: AlisKaydi[]) => fiyatHafizasi(k, "TRY") as FiyatHafizasi;
  const hafizalar = new Map<string, FiyatHafizasi>([
    ["A", h([a("2025-11-11", 100), a("2026-09-01", 120)])], // +%20
    ["B", h([a("2025-11-11", 100), a("2026-09-01", 150)])], // +%50 → en başta
    ["C", h([a("2025-11-11", 100), a("2026-09-01", 120)])], // +%20, A ile eşit; C daha çok sattı → A'dan önce
    ["D", h([a("2026-09-01", 100), a("2026-09-01", 150)])], // TEK gün → GİRMEZ
    ["E", h([a("2025-11-11", 150), a("2026-09-01", 100)])], // son en ucuz → fark < 0 → GİRMEZ
    ["F", h([a("2025-11-11", 100), a("2026-09-01", 100)])], // fark 0 → GİRMEZ
    ["G", h([a("2025-11-11", 100), a("2026-09-01", 200)])], // satılmadı → GİRMEZ
  ]);
  const l = iyiAlimListesi([satir("A", 2, 1), satir("B", 1, 3), satir("C", 5), satir("D", 4), satir("E", 4), satir("F", 4), satir("G", 0), satir("H", 9)], hafizalar);
  const sira = l.map((x) => x.satir.variantId).join(",");
  kontrol("sıra: fark büyükten (B %50), eşitse çok satan (C 5 · A 2)", sira === "B,C,A", sira);
  kontrol("tek günlük · son en ucuz · fark 0 · satılmamış · hafızasız ürün GİRMEZ", !/D|E|F|G|H/.test(sira), sira);
  kontrol("fark değeri taşınır (B %50)", l[0]?.fark === 50);
  const tp = iyiAlimToplami(l);
  kontrol("toplam: ürün 3 · satılan 8 · raf 4", tp.urun === 3 && tp.adet === 8 && tp.raf === 4, tp);
  kontrol("arama barkodla bulur, boş arama hepsini döndürür", iyiAlimAra(l, "8690000000002").length === 1 && iyiAlimAra(l, " ").length === 3);
}
kosanBolumler.push("liste");

// ── ⑤ «ŞÜPHE ÜRETMEZ» — İŞ SABİTİ ──────────────────────────────────────
console.log("\n⑤ şüphe üretmez · engellemez · doldurmaz (iş sabiti «fiyatın yönü yoktur»)");
{
  const satiri = yorumsuz(kaynakOku("src/app/alimlar/fiyat-hafizasi-satiri.tsx"));
  const farkDali = blok(satiri, "!yazildi ? null", 400);
  kontrol("form satırı: fark satırı NÖTR (uyarı/olumsuz rengi yok)", farkDali.includes('t("hafizaYazilan"') && !/DURUM_YAZISI\.(uyari|olumsuz)/.test(farkDali) && !/text-(red|amber|orange)/.test(satiri));
  kontrol("form satırı: kalemi DEĞİŞTİRMEZ (fiyat doldurulmaz — yalnız okur)", !/kalemGuncelle|setKalemler|onChange/.test(satiri));
  const form = yorumsuz(kaynakOku("src/app/alimlar/alim-formu.tsx"));
  kontrol("form: yeni kalem maliyeti yine BOŞ başlar (iki giriş yolu)", (form.match(/unitCostAmount: "",/g) ?? []).length === 2);
  kontrol("form: satıra yalnız okunan değer verilir (yazilan = cari girildiyse cari, yoksa ödenen metni)",
    /<FiyatHafizasiSatiri[\s\S]{0,400}yazilan=\{\(kalem\.cariFiyat \?\? ""\)\.trim\(\) !== "" \? \(kalem\.cariFiyat \?\? ""\) : kalem\.unitCostAmount\}/.test(form) && !/<FiyatHafizasiSatiri[\s\S]{0,500}(onChange|kalemGuncelle)/.test(form));
  const sekme = yorumsuz(kaynakOku("src/app/rapor/alim-rehberi/iyi-alim-sekmesi.tsx"));
  kontrol("rehber sekmesi: uyarı/olumsuz rengi yok", !/DURUM_YAZISI|text-(red|amber|orange)/.test(sekme));
  const govde = yorumsuz(kaynakOku("src/lib/alim-fiyat-hafizasi.ts"));
  kontrol("saf gövde: şüphe/onay kavramı taşımaz (supheli · engel · hata yok)", !/supheli|engelle|hata/i.test(govde));
}
kosanBolumler.push("supheyok");

// ── ⑥ BAĞLAR ───────────────────────────────────────────────────────────
console.log("\n⑥ bağlar — veri · eylem · form · rehber · Excel · sözlük");
{
  const veri = yorumsuz(kaynakOku("src/lib/alim-fiyat-hafizasi-verisi.ts"));
  kontrol("veri: taslak ve iptal alım SAYILMAZ", /status: \{ notIn: \["DRAFT", "CANCELLED"\] \}/.test(veri));
  kontrol("veri: düzenlenen alım kendi geçmişine karışmaz", /\.\.\.\(p\.haricAlimId \? \{ id: \{ not: p\.haricAlimId \} \} : \{\}\)/.test(veri));
  kontrol("veri: taban alanları faturadan (KDV dahil · kargo dahil · gümrük · bedava)",
    /kdvDahil: k\.purchase\.fiyatKdvDahil,/.test(veri) && /kargoDahil: k\.purchase\.kargoDahil,/.test(veri) && /gumrukVar: k\.purchase\.customsAmount !== null && Number\(k\.purchase\.customsAmount\.toString\(\)\) > 0,/.test(veri) && /promosyon: k\.promosyon,/.test(veri));
  const eylem = yorumsuz(kaynakOku("src/app/alimlar/fiyat-hafizasi-eylemi.ts"));
  kontrol("eylem: izin alim.yaz KENDİ gövdesinin ilk satırında", /export async function fiyatHafizasiEylemi\([^)]*\): Promise<HafizaSonucu> \{\s*if \(!\(await izinVarMi\("alim\.yaz"\)\)\) return \{ tamam: false, hata: "YETKISIZ" \};/.test(eylem));
  kontrol("eylem: beklenmeyen hata TAM günlüğe, kod döner", /console\.error\("\[fiyatHafizasiEylemi\] beklenmeyen hata:", e\);\s*return \{ tamam: false, hata: "HATA" \};/.test(eylem));
  const form = yorumsuz(kaynakOku("src/app/alimlar/alim-formu.tsx"));
  kontrol("form: düzenlemede kendi alımı hariç · kıyas yalnız aynı tabanda (KDV dahil · kargo dahil · gümrüksüz)",
    /haricAlimId=\{alimId \?\? null\}/.test(form) && /kiyasGecerli=\{fatura\.fiyatKdvDahil && fatura\.kargoDahil && \(gumrukSayi === null \|\| gumrukSayi === 0\)\}/.test(form));
  kontrol("form: bedava kalemde satır çizilmez", /\{kalem\.promosyon \? null : \(\s*<FiyatHafizasiSatiri/.test(form));
  const satiri = yorumsuz(kaynakOku("src/app/alimlar/fiyat-hafizasi-satiri.tsx"));
  kontrol("satır: okuma hatası SÖYLENİR (sessiz boş satır yok)", /\.catch\(\(\) => \{\s*if \(!iptal\) setKayit\(\{ anahtar, sonuc: \{ tamam: false, hata: "HATA" \} \}\);/.test(satiri) && /t\(sonuc\.hata === "YETKISIZ" \? "hafizaYetkisiz" : "hafizaOkunamadi"\)/.test(satiri));
  kontrol("satır: sonuç SORULAN ürüne bağlı (ürün değişince eski geçmiş gösterilmez)", /const sonuc = kayit !== null && kayit\.anahtar === anahtar \? kayit\.sonuc : null;/.test(satiri));
  kontrol("satır: farklı tabanda fatura kıyaslanmaz, nedeni yazılır", /!kiyasGecerli \? \(\s*<p>\{t\("hafizaFarkliTaban"\)\}<\/p>/.test(satiri));

  kontrol("rehber: sekme listede", (REHBER_SEKMELERI as readonly string[]).includes("iyiAlim"));
  const sayfa = yorumsuz(kaynakOku("src/app/rapor/alim-rehberi/page.tsx"));
  kontrol("rehber: liste dönemin satırlarından ve TRY hafızalarından", /const iyiAlim = iyiAlimListesi\(veri\.satirlar, hafizalar\);/.test(sayfa) && /tryHafizalari\(\),/.test(sayfa));
  /* K363 Faz 3-a (25.10): sekmeye istek üzerine piyasa metni de geçer — liste yine TAM, arama yine bileşende. */
  kontrol("rehber: sekme bileşeni TAM listeyi alır, aramayı kendisi uygular", /ia \? \(\s*<IyiAlimSekmesi liste=\{iyiAlim\} arama=\{arama\} piyasa=\{piyasaMetni\} \/>/.test(sayfa));
  const excelDali = blok(sayfa, "{oz || ia ? null : (\n        <a", 200) || blok(sayfa, "{oz || ia ? null : (\r\n        <a", 200);
  kontrol("rehber: bu sekmede Excel düğmesi ÇİZİLMEZ", /href=\{excelAdresi\}/.test(excelDali));
  const excel = yorumsuz(kaynakOku("src/app/rapor/alim-rehberi/excel/route.ts"));
  kontrol("Excel: adres elle yazılırsa başka liste inmez, nedeni söylenir (400)", /if \(liste === "iyiAlim"\) return new Response\(t\("excelIyiAlimYok"\), \{ status: 400/.test(excel));

  // ── cari fiyat zinciri: sorar · okur · doğrular · yazar · geri verir · gösterir ──
  const eylemler = yorumsuz(kaynakOku("src/app/alimlar/actions.ts"));
  kontrol("kayıt: cari fiyat isteğe bağlı, pozitif sayı (boş → null)", /cariFiyatAmount: z\s*\.number\(\{ message: t\("cariFiyatSayiOlmali"\) \}\)\s*\.positive\(t\("cariFiyatPozitif"\)\)\s*\.nullable\(\)\s*\.optional\(\)\s*\.default\(null\),/.test(eylemler));
  kontrol("kayıt: cari ödenen fiyattan düşük olamaz", /if \(k\.cariFiyatAmount !== null && k\.cariFiyatAmount < k\.unitCostAmount\) \{\s*ctx\.addIssue\(\{[\s\S]{0,120}t\("cariFiyatOdenendenDusuk"\)/.test(eylemler));
  const cariYazimi = eylemler.match(/cariFiyatAmount: (k|yeni)\.cariFiyatAmount === null \? null : String\((k|yeni)\.cariFiyatAmount\),/g) ?? [];
  kontrol("kayıt: üç yazım yolunun üçü de cari fiyatı yazar (yeni alım · düzenlemede yeni kalem · düzenlemede var olan kalem)", cariYazimi.length === 3, cariYazimi.length);
  const defterBlogu = blok(eylemler, "const guncellenen = await tx.stockMovement.updateMany({", 500);
  kontrol("⛔ cari fiyat MALİYETE GİRMEZ: defter damgası ve maliyet değişti ölçütü cariye bakmaz",
    defterBlogu.length > 0 && !/cari/i.test(defterBlogu) && !/cari/i.test(blok(eylemler, "const maliyetDegisti =", 400)) && !/cari/i.test(blok(eylemler, "const yeniMaliyet =", 120)));
  kontrol("form: gönderimde cari fiyat okunur (okunamayan sessizce düşmez)", /cariFiyatAmount: cariFiyatGonderimi\(k\.cariFiyat\),/.test(form));
  kontrol("form: cari kutusu çizilir ve kaleme yazar, bedava kalemde çizilmez", /\{kalem\.promosyon \? null : \(\s*<div className="space-y-1">[\s\S]{0,300}id=\{`cari-\$\{sira\}`\}[\s\S]{0,200}onChange=\{\(e\) => kalemGuncelle\(sira, \{ cariFiyat: e\.target\.value \}\)\}/.test(form));
  const duzenle = yorumsuz(kaynakOku("src/app/alimlar/[id]/duzenle/page.tsx"));
  kontrol("düzenleme: kayıtlı cari forma GERİ verilir (yoksa düzenleyip kaydetmek siler)", /cariFiyat: k\.cariFiyatAmount === null \? "" : String\(Number\(k\.cariFiyatAmount\.toString\(\)\)\),/.test(duzenle));
  const detay = yorumsuz(kaynakOku("src/app/alimlar/[id]/page.tsx"));
  kontrol("detay: girilen cari fiyat masaüstü ve telefonda görünür", (detay.match(/t\("cariFiyatDetay", \{ fiyat: bicim\.para\(kalem\.cariFiyatAmount, kalem\.unitCostCurrency\) \}\)/g) ?? []).length === 2);
  kontrol("veri: cari fiyat okunur", /cariFiyatAmount: true,/.test(veri) && /cari: k\.cariFiyatAmount === null \? null : Number\(k\.cariFiyatAmount\.toString\(\)\),/.test(veri));
  kontrol("satır: cari kullanıldığı ekranda yazar", /h\.cariKullanilan > 0 \? ` \$\{t\("hafizaCariKullanildi", \{ sayi: h\.cariKullanilan \}\)\}` : ""/.test(satiri));

  const tr = JSON.parse(kaynakOku("messages/tr.json")) as Record<string, Record<string, string>>;
  const yazilan = tr.Alim?.hafizaYazilan ?? "";
  kontrol("sözlük: yön metni bileşenin üç yönünü karşılar (ayni · asagi · diğer)", /\{yon, select, ayni \{/.test(yazilan) && /asagi \{/.test(yazilan) && /other \{/.test(yazilan));
  const gerekli = { Alim: ["cariFiyatEtiketi", "cariFiyatIpucu", "cariFiyatNotu", "cariFiyatSayiOlmali", "cariFiyatPozitif", "cariFiyatOdenendenDusuk", "cariFiyatDetay", "hafizaCariKullanildi", "hafizaYukleniyor", "hafizaYetkisiz", "hafizaOkunamadi", "hafizaYok", "hafizaHepsiKiyasDisi", "hafizaOzet", "hafizaKiyasDisi", "hafizaFarkliTaban", "hafizaYazilan"], AlimRehberi: ["liste_iyiAlim", "aciklama_iyiAlim", "iyiNotu", "iyiBos", "iyiFiyatTarih", "iyiAlisSayisi", "toplamIyiUrun", "sutunIyiEnUcuz", "sutunIyiNormal", "sutunIyiSon", "sutunIyiFark", "excelIyiAlimYok"] };
  const eksik = Object.entries(gerekli).flatMap(([ns, anahtarlar]) => anahtarlar.filter((k) => !(tr[ns]?.[k] ?? "").length).map((k) => `${ns}.${k}`));
  kontrol("sözlük: bütün metinler DOLU", eksik.length === 0, eksik);
}
kosanBolumler.push("baglar");

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
