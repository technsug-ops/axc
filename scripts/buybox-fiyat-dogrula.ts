/**
 * ============================================================================
 *  BUYBOX FİYAT KUTUSU BEKÇİSİ (K363 Faz 3-c)
 * ----------------------------------------------------------------------------
 *  Saf gövdeler ÇAĞRILIR (maliyet tabanı · motor eşliği · fiyat çözümü · zarar
 *  kapısı). Kaynak taraması yalnız bağlar için (yorumsuz kodda, kullanım
 *  bloğuna daraltılmış): sunucunun ekrana güvenmemesi, zarar kapısının
 *  gönderimden ÖNCE durması, yalnız TY/HB + yalnız fiyat, izin kapıları.
 *  ⑦ (25.10.2026, «frontend zayıf»): hızlı doldurma adayları + rozet tonu.
 * ============================================================================
 */
import { kaynakOku } from "./kaynak-oku";
import { durumTonu, esitAmaKayip, farkTonu, type BuyboxDurumu } from "../src/lib/buybox";
import { enDusukAcikMaliyet, fiyatMetniCoz, fiyatSonucu, hizliFiyatlar, zararOnayiGerekirMi, type FiyatZemini } from "../src/lib/buybox-fiyat";
import { simulasyonKur } from "../src/lib/fiyatlama/simulasyon";

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
const yorumsuz = (s: string) => s.replace(/\{\/\*[\s\S]*?\*\/\}/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
const blok = (metin: string, capa: string, uzunluk: number) => {
  const i = metin.indexOf(capa);
  return i < 0 ? "" : metin.slice(i, i + uzunluk);
};
const yakin = (a: number | null, b: number | null) => a !== null && b !== null && Math.abs(a - b) < 0.005;

// ── ① MALİYET TABANI ─────────────────────────────────────────────────────
console.log("\n① maliyet — rafta duran partilerin EN DÜŞÜĞÜ");
{
  const p = (kalanAdet: number, birimMaliyet: string | null, para = "TRY") => ({ kalanAdet, birimMaliyet, birimMaliyetParaBirimi: para });
  const m = enDusukAcikMaliyet([p(0, "800.00"), p(3, "1200.00"), p(2, "1100.50"), p(1, null), p(4, "900.00", "EUR")], "TRY");
  kontrol("stoku BİTMİŞ ucuz parti (800) maliyete GİRMEZ — rafta en düşük 1100,50", m.maliyet === 1100.5, m);
  kontrol("maliyeti boş ve başka para birimli parti sayılmaz (2 parti)", m.partiSayisi === 2, m);
  kontrol("raf adedi bütün açık partiler (3+2+1+4 = 10)", m.rafAdedi === 10, m);
  kontrol("rafta maliyeti bilinen parti yoksa null (uydurulmaz)", enDusukAcikMaliyet([p(0, "500.00"), p(2, null)], "TRY").maliyet === null);
}
kosanBolumler.push("maliyet");

// ── ② MOTOR EŞLİĞİ ───────────────────────────────────────────────────────
console.log("\n② motor — ürün kartıyla AYNI (simulasyonKur), paket başı kesinti dahil");
{
  const zemin: FiyatZemini = {
    zemin: {
      kanalAdi: "Trendyol — AXCALI",
      channelAccountId: "h1",
      dilimler: [
        { sira: 1, altLimit: null, ustLimit: 1000, oran: 12 },
        { sira: 2, altLimit: 1000, ustLimit: null, oran: 18 },
      ],
      pencereBitis: null,
      tekOran: 20,
      komisyonKdvOrani: null,
      siparisKesintileri: [{ code: "SABIT_GIDER", basis: "FIXED", rate: null, amount: 13.19, paketBasina: true }],
    },
    kdvOrani: 20,
    paraBirimi: "TRY",
    maliyet: 900,
    kargoTarifesi: 80,
  };
  const bugun = new Date("2026-10-25T10:00:00Z");
  const s = fiyatSonucu(zemin, 1500, bugun);
  const k = simulasyonKur({
    hedefFiyat: 1500, adet: 1, birimMaliyet: 900, kdvOrani: 20, paraBirimi: "TRY",
    dilimler: zemin.zemin.dilimler, pencereBitis: null, tekOran: 20, komisyonKdvOrani: null,
    siparisKesintileri: zemin.zemin.siparisKesintileri, kargoTarifesi: 80, bugun,
  });
  kontrol("NET-1 / NET-2 kart motoruyla kuruşuna aynı", yakin(s.net1, k.net1) && yakin(s.net2, k.net2), { s, k });
  kontrol("fiyatın dilimi (1500 → %18)", s.komisyonOrani === 18);
  const kesintisiz = fiyatSonucu({ ...zemin, zemin: { ...zemin.zemin, siparisKesintileri: [] } }, 1500, bugun);
  /** ₺13,19 KDV dahil bir giderdir: NET-1'den tam düşer; KDV'si indirilebildiği için NET-2'den 13,19 ÷ 1,2 = 10,99 düşer. */
  kontrol("TY paket başı ₺13,19 DÜŞÜLÜYOR — NET-1'den tam 13,19", yakin((kesintisiz.net1 ?? 0) - (s.net1 ?? 0), 13.19), { kesintisiz: kesintisiz.net1, s: s.net1 });
  kontrol("  ...NET-2'den KDV'siz kısmı (10,99)", yakin((kesintisiz.net2 ?? 0) - (s.net2 ?? 0), 13.19 / 1.2), { kesintisiz: kesintisiz.net2, s: s.net2 });
  kontrol("marj = NET-2 / fiyat", yakin(s.marj, ((s.net2 ?? 0) / 1500) * 100));
  const kargosuz = fiyatSonucu({ ...zemin, kargoTarifesi: null }, 1500, bugun);
  kontrol("kargo bilinmiyorsa kargoDahil=false (ekran «kargo hariç» der) ve NET daha yüksek", kargosuz.kargoDahil === false && s.kargoDahil === true && (kargosuz.net2 ?? 0) > (s.net2 ?? 0));
  const maliyetsiz = fiyatSonucu({ ...zemin, maliyet: null }, 1500, bugun);
  kontrol("maliyet yoksa NET null (uydurulmaz)", maliyetsiz.net2 === null && maliyetsiz.marj === null);
}
kosanBolumler.push("motor");

// ── ③ FİYAT ÇÖZÜMÜ ───────────────────────────────────────────────────────
console.log("\n③ Türkçe fiyat girişi");
{
  kontrol("«1.555,90» → 1555,9", fiyatMetniCoz("1.555,90") === 1555.9);
  kontrol("«1555» → 1555", fiyatMetniCoz("1555") === 1555);
  kontrol("«₺ 1.730» → 1730", fiyatMetniCoz("₺ 1.730") === 1730);
  kontrol("boş → null (gönderilecek fiyat yok)", fiyatMetniCoz("  ") === null);
  kontrol("«abc» · «0» · «-5» → NaN (gönderilmez)", [fiyatMetniCoz("abc"), fiyatMetniCoz("0"), fiyatMetniCoz("-5")].every((x) => x !== null && Number.isNaN(x)));
}
kosanBolumler.push("cozum");

// ── ④ ZARAR KAPISI ───────────────────────────────────────────────────────
console.log("\n④ zarar kapısı");
{
  kontrol("NET-2 eksi → onay gerekir", zararOnayiGerekirMi({ net2: -0.01 }));
  kontrol("kâr bilinmiyor (null) → onay gerekir", zararOnayiGerekirMi({ net2: null }));
  kontrol("NET-2 sıfır → onay gerekmez", !zararOnayiGerekirMi({ net2: 0 }));
  kontrol("kârlı → onay gerekmez", !zararOnayiGerekirMi({ net2: 50 }));
}
kosanBolumler.push("zarar");

// ── ⑤ SUNUCU EYLEMLERİ ───────────────────────────────────────────────────
console.log("\n⑤ eylemler — sunucu ekrana güvenmez");
{
  const e = yorumsuz(kaynakOku("src/app/rapor/buybox/fiyat-eylemleri.ts"));
  const z = blok(e, "export async function buyboxFiyatZeminiGetir(", 600);
  kontrol("zemin kâr görme izni ister", /if \(!\(await izinVarMi\("satis\.kar\.gor"\)\)\) return \{ tamam: false, kod: "YETKI_YOK" \};/.test(z));
  const g = blok(e, "export async function buyboxFiyatGonder(", 3000);
  const i = (d: string) => g.indexOf(d);
  const iYetki = i('await yetkiIste("kanal.yaz");');
  const iKanal = i('if (kanal !== "TY" && kanal !== "HB") return hata("KANAL_GECERSIZ");');
  const iZemin = i("const z = await buyboxFiyatZemini(variantId, kanal, an);");
  const iHesap = i("const s = fiyatSonucu(z.zemin, fiyat, an);");
  const iKapi = i('if (!zararOnayi) return hata("ZARAR_ONAYI_GEREKLI");');
  const iIz = i('action: "ZARARINA_FIYAT_ONAYI"');
  const iTy = i('if (kanal === "TY") return { kanal: "TY", sonuc: await tyStokFiyatGonder(variantId, { stokGonder: false, fiyat }) };');
  const iHb = i('return { kanal: "HB", sonuc: await hbStokFiyatGonder(variantId, { stokGonder: false, fiyat }) };');
  kontrol("sıra: yetki → yalnız TY/HB → zemin O KANALDAN → SUNUCUDA kâr → zarar kapısı → iz → gönder (TY, sonra HB)",
    [iYetki, iKanal, iZemin, iHesap, iKapi, iIz, iTy, iHb].every((x) => x >= 0) && iYetki < iKanal && iKanal < iZemin && iZemin < iHesap && iHesap < iKapi && iKapi < iIz && iIz < iTy && iTy < iHb,
    { iYetki, iKanal, iZemin, iHesap, iKapi, iIz, iTy, iHb });
  kontrol("zarar kapısı ortak gövdeden, SUNUCU sonucu üstünde", /if \(zararOnayiGerekirMi\(s\)\) \{/.test(g));
  kontrol("izdeki kanal adı gönderilen kanaldan (sabit «Trendyol» değil)", /kanal: KANAL_ADI\[kanal\],/.test(g) && !/kanal: "Trendyol",/.test(g));
  kontrol("YALNIZ fiyat (stok gönderilmez)", !/stokGonder: true/.test(e));
  kontrol("gönderim tek yoldan: kartın iki eylemi, birer kez (izli)", (e.match(/tyStokFiyatGonder\(/g) ?? []).length === 1 && (e.match(/hbStokFiyatGonder\(/g) ?? []).length === 1);
}
kosanBolumler.push("eylem");

// ── ⑥ VERİ + EKRAN ───────────────────────────────────────────────────────
console.log("\n⑥ veri + ekran");
{
  const v = yorumsuz(kaynakOku("src/lib/buybox-fiyat-verisi.ts"));
  kontrol("zemin kartın gövdesinden, hesap KİMLİĞİYLE seçilir (ad etikettir)", /simulasyonZeminleri\(variantId, an\)/.test(v) && /zeminler\.find\(\(z\) => z\.channelAccountId === hesap\.id\)/.test(v));
  kontrol("maliyet açık partilerden ortak gövdeyle", /acikPartiler\(prisma, variantId\)/.test(v) && /const m = enDusukAcikMaliyet\(partiler, paraBirimi\);/.test(v));
  kontrol("kargo firması: ürünün son satışı yoksa kanalın EN SIK firması (kaynağı ekrana gider)",
    /if \(firmaId === null\) \{\s*const sik = await prisma\.sale\.groupBy\(/.test(v) && /orderBy: \{ _count: \{ cargoCarrierId: "desc" \} \}/.test(v) && /firmaKaynagi = "KANAL";/.test(v));
  kontrol("kargo tarifesi: en yeni geçerli (bugün), kâr motoruyla aynı arama", /effectiveFrom: \{ lte: an \} \},\s*orderBy: \{ effectiveFrom: "desc" \}/.test(v));
  const s = yorumsuz(kaynakOku("src/app/rapor/buybox/page.tsx"));
  kontrol("pencere yalnız kâr görme izniyle; Kaydet kanala yazma izniyle", /izinVarMi\("satis\.kar\.gor"\), izinVarMi\("kanal\.yaz"\)/.test(s) && /karGorunur \? \(\s*<FiyatPenceresi/.test(s));
  kontrol("eylemler iki görünümde aynı fonksiyondan (tablo + telefon)", /<SatirEylemleri>\{eylemler\(s\)\}<\/SatirEylemleri>/.test(s) && /eylemler=\{eylemler\(s\)\}/.test(s));
  kontrol("pencere KANAL + ürünle anahtarlı (TY durumu HB satırına taşınmaz)", /<FiyatPenceresi\s*key=\{`\$\{kanal\}:\$\{s\.variantId\}`\}/.test(s));
  const k = yorumsuz(kaynakOku("src/app/rapor/buybox/fiyat-penceresi.tsx"));
  kontrol("pencere açılınca hesap kendiliğinden başlar", /const ac = \(\) => \{\s*setAcik\(true\);\s*hesapla\(\);\s*\};/.test(k) && /onClick=\{ac\}/.test(k));
  kontrol("kapanınca fiyat ve zemin sıfırlanır (bayat değer bir sonraki açılışa kalmaz)", /if \(!a\) \{\s*setFiyatMetni\(ilkMetin\);\s*setZemin\(null\);/.test(blok(k, "const kapat = (a: boolean) => {", 400)));
  kontrol("Kaydet hesap yapılınca + kanala yazma izniyle (iki kanalda da)", /\{zemin\?\.tamam && gonderebilir \? \(/.test(k) && !/kanal === "TY" && gonderebilir/.test(k));
  kontrol("HB sonucu kartın HB hükmüyle yazılır (ilan geri okunur)", /tHb\(`hukum_\$\{p\.hukum\}`/.test(k) && /const p = s\.fiyat;/.test(k));
  kontrol("onay metni kanal adını taşır; açıklama kanala göre", /kanal: kanalAdi,/.test(k) && /t\(`onayYalnizFiyat_\$\{kanal\}`\)/.test(k));
  kontrol("hızlı düğme kutuya yazar VE hesabı açar (gönderMEZ)",
    /setFiyatMetni\(bicim\.sayi\(h\.fiyat, 2\)\);\s*setSonuc\(null\);\s*hesapla\(\);\s*\}\}/.test(k) && !/hizli[\s\S]{0,400}buyboxFiyatGonder/.test(blok(k, "{hizli.map(", 900)));
  kontrol("onay düğmesi zarar kutusu işaretlenmeden kapalı", /disabled=\{gonderiliyor \|\| !fiyatGecerli \|\| \(onayGerekli && !zararOnayi\)\}/.test(k));
  kontrol("kutu Buybox fiyatıyla dolu açılır", /useState\(buyboxFiyati === null \? "" : bicim\.sayi\(buyboxFiyati, 2\)\)/.test(k));
  kontrol("kargo hariçse ekranda SEBEBİYLE yazar", /t\(`kargoHaric_\$\{zemin\.kargo\.sebep \?\? "TARIFE_YOK"\}`\)/.test(k));
  const tr = JSON.parse(kaynakOku("messages/tr.json")) as Record<string, Record<string, string>>;
  const gerekli = ["fiyatla", "pencereBaslik", "esitKisa", "sutunFiyatlar", "sutunEylemler", "kaydet", "rozetKar", "rozetZarar", "maliyetNotu", "maliyetYok", "kargoDahil", "kargoHaric_DESI_YOK", "kargoHaric_FIRMA_YOK", "kargoHaric_TARIFE_YOK", "onayMetni", "onayZararKutu", "onayKarBilinmiyorKutu", "gonderimHata_ZARAR_ONAYI_GEREKLI", "gonderimHata_KANAL_GECERSIZ", "gonderimHata_FIYAT_GECERSIZ", "gonderimHata_ZEMIN_YOK", "gonderimHata_YETKI_YOK", "gonderimHata_OKUNAMADI", "gonderim_BASARILI", "gonderim_ISLEMDE", "onayYalnizFiyat_TY", "onayYalnizFiyat_HB", "gonderimHbSonucYok", "hizli_buyboxAlti", "hizli_buybox", "hizli_ikinciAlti", "esitAmaKayip", "komisyonNotu", "sutunDurum"];
  const eksik = gerekli.filter((x) => !(tr.Buybox?.[x] ?? "").length);
  kontrol("sözlük: kutu metinleri dolu", eksik.length === 0, eksik);
  kontrol("sayfa notu artık «fiyat buradan değişmez» DEMİYOR", !/fiyat buradan değişmez/.test(tr.Buybox?.notu ?? ""));
}
kosanBolumler.push("ekran");

// ── ⑦ HIZLI DOLDURMA + ROZET TONU ────────────────────────────────────────
console.log("\n⑦ hızlı doldurma + rozet tonu");
{
  const h = (durum: string, bizimFiyat: number | null, buyboxFiyati: number | null, ikinciFiyat: number | null) =>
    hizliFiyatlar({ durum, bizimFiyat, buyboxFiyati, ikinciFiyat }).map((x) => `${x.anahtar}:${x.fiyat}`).join(",");
  kontrol("kaybedilmiş: Buybox −1 ₺ ve Buybox", h("KAYBEDILDI", 1840, 1835, 1840) === "buyboxAlti:1834,buybox:1835", h("KAYBEDILDI", 1840, 1835, 1840));
  kontrol("kaybedilmiş, Buybox bilinmiyor: aday yok", h("KAYBEDILDI", 1840, null, null) === "");
  kontrol("kaybedilmiş, Buybox ₺1: −1 ₺ adayı üretilmez (sıfır fiyat yok)", h("KAYBEDILDI", 5, 1, null) === "buybox:1");
  kontrol("bizde: 2. fiyatın 1 ₺ altı, bizim fiyattan yüksekse", h("BIRINCI", 1800, 1800, 1900) === "ikinciAlti:1899");
  kontrol("bizde ama 2. fiyat −1 bizim fiyattan yüksek DEĞİL: aday yok", h("BIRINCI", 1800, 1800, 1801) === "" && h("BIRINCI", 1800, 1800, null) === "");
  kontrol("görünmüyor/sorgulanamadı: aday yok", h("GORUNMUYOR", 1800, 1700, 1900) === "" && h("SORGULANAMADI", null, null, null) === "");
  kontrol("kuruş yuvarlaması (Buybox 1.555,906 → 1554,91 · 1555,91)", h("KAYBEDILDI", 1600, 1555.906, null) === "buyboxAlti:1554.91,buybox:1555.91", h("KAYBEDILDI", 1600, 1555.906, null));

  const r = (durum: BuyboxDurumu, bizimFiyat: number | null, buyboxFiyati: number | null) => ({ durum, bizimFiyat, buyboxFiyati });
  kontrol("durum tonu: bizde yeşil · kaybedildi kırmızı · görünmüyor sarı · sorgulanamadı nötr",
    durumTonu("BIRINCI") === "olumlu" && durumTonu("KAYBEDILDI") === "olumsuz" && durumTonu("GORUNMUYOR") === "uyari" && durumTonu("SORGULANAMADI") === "notr");
  kontrol("fark: kaybedilmiş + pahalıyız → kırmızı", farkTonu(r("KAYBEDILDI", 1840, 1835)) === "olumsuz" && !esitAmaKayip(r("KAYBEDILDI", 1840, 1835)));
  kontrol("fark: kaybedilmiş + EŞİT fiyat → sarı, «fiyat dışı» notu", farkTonu(r("KAYBEDILDI", 2299, 2299)) === "uyari" && esitAmaKayip(r("KAYBEDILDI", 2299, 2299)));
  kontrol("fark: kaybedilmiş + UCUZUZ → sarı", farkTonu(r("KAYBEDILDI", 2200, 2299)) === "uyari");
  kontrol("fark: bizde → yeşil, not yok", farkTonu(r("BIRINCI", 1800, 1800)) === "olumlu" && !esitAmaKayip(r("BIRINCI", 1800, 1800)));
  kontrol("fark bilinmiyor → nötr (uydurulmaz), not yok", farkTonu(r("KAYBEDILDI", null, 1835)) === "notr" && !esitAmaKayip(r("KAYBEDILDI", null, 1835)));
  const s = yorumsuz(kaynakOku("src/app/rapor/buybox/page.tsx"));
  kontrol("rozetler ortak tonla, iki görünümde (tablo `DurumRozeti` · telefon renkli yazı)",
    /<DurumRozeti durum=\{durumTonu\(s\.durum\)\}>/.test(s) && /<DurumRozeti durum=\{farkTonu\(s\)\}>/.test(s) && /DURUM_YAZISI\[durumTonu\(s\.durum\)\]/.test(s) && /DURUM_YAZISI\[farkTonu\(s\)\]/.test(s));
  kontrol("«fiyat dışı» notu iki görünümde + pencerede uzun hâli",
    /\{esitAmaKayip\(s\) \? <span[^>]*>\{t\("esitKisa"\)\}<\/span> : null\}/.test(s) && /not=\{esitAmaKayip\(s\) \? <p[^>]*>\{t\("esitKisa"\)\}<\/p> : undefined\}/.test(s) && /esitNotu=\{esitAmaKayip\(s\) \? t\("esitAmaKayip"\) : null\}/.test(s));
  kontrol("ürün kartı eylemi izinden bağımsız (kâr izni yoksa da kart açılır)", /\) : null\}\s*<SatirEylemi href=\{`\/kart\/\$\{s\.variantId\}`\}/.test(blok(s, "const eylemler = (s: BuyboxSatiri) => (", 1200)));
}
kosanBolumler.push("hizli");

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
