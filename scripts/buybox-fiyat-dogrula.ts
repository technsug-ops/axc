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
import { durumTonu, esitAmaKayip, farkTonu, hbSatiri, indirimOrani, type BuyboxDurumu } from "../src/lib/buybox";
import { enDusukAcikMaliyet, fiyatMetniCoz, fiyatSonucu, hizliFiyatlar, listeFiyatiIcin, musteriFiyati, zararOnayiGerekirMi, type FiyatZemini } from "../src/lib/buybox-fiyat";
import { simulasyonKur } from "../src/lib/fiyatlama/simulasyon";

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
  kontrol("kutu Buybox'a eşit müşteri fiyatını veren LİSTE fiyatıyla dolu açılır",
    /const buyboxListe = buyboxFiyati === null \? null : listeFiyatiIcin\(buyboxFiyati, indirim\);/.test(k) && /const ilkMetin = buyboxListe === null \? "" : bicim\.sayi\(buyboxListe, 2\);/.test(k) && /useState\(ilkMetin\)/.test(k));
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
    hizliFiyatlar({ durum, bizimFiyat, buyboxFiyati, ikinciFiyat, indirim: 0 }).map((x) => `${x.anahtar}:${x.fiyat}`).join(",");
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

// ── ⑧ HB KENDİ İNDİRİMİ + 2. FİYAT (26.10.2026) ──────────────────────────
console.log("\n⑧ HB kendi indirimi — kutu LİSTE fiyatı, Buybox MÜŞTERİ fiyatıyla yarışır");
{
  /* Emsan vakası: ilan 2.170, HB %13 → müşteri 1.887,90; Buybox (ShopAVM) 1.882,68. */
  const r = indirimOrani(1887.9, 2170);
  kontrol("indirim oranı müşteri/liste'den (2.170 → 1.887,90 = %13)", Math.abs(r - 0.13) < 1e-9, r);
  kontrol("indirim yoksa / tutarsızsa 0 (uydurulmaz)", indirimOrani(2000, 2000) === 0 && indirimOrani(2000, null) === 0 && indirimOrani(2100, 2000) === 0 && indirimOrani(0, 2000) === 0);
  kontrol("müşteri fiyatı = liste × (1 − oran)", musteriFiyati(2170, r) === 1887.9 && musteriFiyati(2164, r) === 1882.68);
  kontrol("Buybox'a eşit liste fiyatı 2.164 (1.882,68'i değil)", listeFiyatiIcin(1882.68, r) === 2164, listeFiyatiIcin(1882.68, r));
  const alti = listeFiyatiIcin(1881.68, r);
  kontrol("−1 ₺ hedefi: müşteri fiyatı hedefi AŞMAZ, kuruş fazlası aşar", musteriFiyati(alti, r) <= 1881.68 && musteriFiyati(alti + 0.02, r) > 1881.68, { alti, m: musteriFiyati(alti, r) });
  kontrol("indirim 0 → liste = hedef (TY bugünkü gibi)", listeFiyatiIcin(1835, 0) === 1835);
  const hz = hizliFiyatlar({ durum: "KAYBEDILDI", bizimFiyat: 1887.9, buyboxFiyati: 1882.68, ikinciFiyat: 1887.9, indirim: r });
  kontrol("hızlı adaylar LİSTE fiyatı yazar, müşteri karşılığını taşır",
    hz.length === 2 && hz[1].anahtar === "buybox" && hz[1].fiyat === 2164 && hz[1].musteri === 1882.68 && hz[0].musteri <= 1881.68, hz);

  const u = { variantId: "v", urunId: null, urunAdi: "Emsan", sku: "S", barkod: null, firmaSku: null, kanalKodu: "HB1", stok: 1 };
  const rk = (sira: number, satici: string, fiyat: number, listeFiyati: number | null) => ({ sira, satici, fiyat, listeFiyati });
  const kayip = hbSatiri(u, [rk(1, "ShopAVM", 1882.68, 2164), rk(2, "Venax", 1885, 2166.67), rk(3, "AXCALI", 1887.9, 2170), rk(4, "Latte", 2087.13, 2399)], "Axcali");
  kontrol("HB satırı: müşteri fiyatımız + ilandaki fiyatımız + oran", kayip.bizimFiyat === 1887.9 && kayip.bizimListeFiyati === 2170 && Math.abs(kayip.kanalIndirimi - 0.13) < 1e-9, kayip);
  kontrol("HB «2. fiyat» = sıralamada 2. satıcı (biz 3. iken bizden sonraki DEĞİL)", kayip.ikinciFiyat === 1885, kayip.ikinciFiyat);
  const bizde = hbSatiri(u, [rk(2, "Venax", 1885, null), rk(1, "AXCALI", 1880, 1880)], "Axcali");
  kontrol("bizdeyken 2. fiyat bizden sonraki; liste yoksa liste = müşteri, oran 0", bizde.ikinciFiyat === 1885 && bizde.bizimListeFiyati === 1880 && bizde.kanalIndirimi === 0, bizde);

  const k = yorumsuz(kaynakOku("src/app/rapor/buybox/fiyat-penceresi.tsx"));
  kontrol("pencere: şu anki fiyat LİSTE fiyatıyla (kâr kutusu + onay eskisi)",
    /const mevcut = bizimListeFiyati \?\? bizimFiyat;/.test(k) && /karKutusu\(t\("bizimFiyatta"\), mevcut, false\)/.test(k) && /eski: mevcut === null \? "—" : para\(mevcut\),/.test(k));
  kontrol("pencere: Buybox kutusu Buybox'a eşit LİSTE fiyatında", /karKutusu\(t\("buyboxFiyatinda"\), buyboxListe, false\)/.test(k));
  kontrol("pencere: hızlı adaylara indirim verilir", /hizliFiyatlar\(\{ durum, bizimFiyat, buyboxFiyati, ikinciFiyat, indirim \}\)/.test(k));
  kontrol("pencere: girilen fiyatın müşteri karşılığı ekranda (kutu altı + onay)",
    (k.match(/\{indirimli && fiyatGecerli \? <p[^>]*>\{musteriMetni\(fiyat\)\}<\/p> : null\}/g) ?? []).length === 2);
  const s = yorumsuz(kaynakOku("src/app/rapor/buybox/page.tsx"));
  kontrol("sayfa pencereye ilan fiyatını ve oranı verir", /bizimListeFiyati=\{s\.bizimListeFiyati\}\s*indirim=\{s\.kanalIndirimi\}/.test(s));
  /* Kullanıcı 26.10.2026 «bunlar bir düzende olsun»: kodlar satırdan satıra kayıyordu. */
  kontrol("tablo kodları sabit yuvalarda (eksik kod yuvayı boş bırakır, kaymaz); telefon akış düzeninde",
    /<Kodlar s=\{s\} etiket=\{kimlikEtiketi\} hizali \/>/.test(s) && /altBaslik=\{<Kodlar s=\{s\} etiket=\{kimlikEtiketi\} \/>\}/.test(s) &&
    /grid grid-cols-\[7\.75rem_7\.75rem_7\.75rem_8\.25rem\]/.test(blok(s, "if (hizali) {", 1400)) &&
    /* Yuva KOŞULSUZ (satır başında) — koşul yuvanın İÇİNDE; yuvayı koşula sokan kaydırır. */
    (blok(s, "if (hizali) {", 1400).match(/^\s*<span className=\{yuva\}>/gm) ?? []).length === 4);
  /* Kullanıcı 26.10.2026 «hem Buybox hem ürün kartı eşit büyümeli»: satırın İKİ eylemi aynı iri sınıfta. */
  kontrol("iki satır eylemi (Fiyatla + Ürün kartı) aynı iri ölçüde",
    /className=\{cn\(EYLEM_SINIFI, IRI_EYLEM_SINIFI\)\}/.test(k) &&
    /<SatirEylemi href=\{`\/kart\/\$\{s\.variantId\}`\} ikon=\{IdCard\} etiket=\{t\("kartaGit"\)\} className=\{IRI_EYLEM_SINIFI\} \/>/.test(s));
  kontrol("liste iki görünümde liste fiyatını da yazar", /t\("bizimKisa", \{ fiyat: bizimYaz\(s\) \}\)/.test(s) && /etiket: t\("sutunBizim"\), deger: bizimYaz\(s\) \}/.test(s));
  const tr = JSON.parse(kaynakOku("messages/tr.json")) as Record<string, Record<string, string>>;
  const eksik = ["yeniListeFiyati", "musteriGorur", "musteriKisa", "indirimNotu", "bizimListeli"].filter((x) => !(tr.Buybox?.[x] ?? "").length);
  kontrol("sözlük: indirim metinleri dolu", eksik.length === 0, eksik);
}
kosanBolumler.push("indirim");

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
