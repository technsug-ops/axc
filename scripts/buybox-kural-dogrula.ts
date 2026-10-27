/**
 * ============================================================================
 *  BUYBOX FİYAT KURALI BEKÇİSİ (K366)
 * ----------------------------------------------------------------------------
 *  Saf gövdeler ÇAĞRILIR, kaynak taranmaz: maliyet tercihi · genel/ürün ayarı
 *  · öneri (öndeyken yükselt · kaybedince Buybox'ı al · taban · tek satıcı ·
 *  fiyat dışı kayıp · dilim atlaması) · HB liste fiyatı · tek başına kargo ·
 *  otomatik gönderim kapısı ve tekrar kapısı (⑨, K366 adım 3).
 *  Eşikler motorun KENDİ ürettiği marjdan kurulur (min = marj ± 1): ölçüt,
 *  ayrımın iki yakasını da çalıştırır, elle hesaplanmış bir sayıya bağlı değil.
 * ============================================================================
 */
import { kaynakOku } from "./kaynak-oku";
import { fiyatSonucu, MALIYET_TERCIHLERI, type FiyatZemini } from "../src/lib/buybox-fiyat";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { acikMaliyet, etkinKural, fiyatOnerisi, otomatikKarar, tekBasinaKargo, TEKRAR_PENCERESI_DK, VARSAYILAN_KURAL, yakindaGonderildiMi, type Oneri, type OneriGirdisi } from "../src/lib/buybox-kural";

let basarisiz = 0;
const BOLUM_SAYISI = 9;
const kosanBolumler: string[] = [];
function kontrol(ad: string, kosul: boolean, ayrinti?: unknown) {
  if (kosul) console.log(`  OK    ${ad}`);
  else {
    basarisiz++;
    console.log(`  HATA  ${ad}`);
    if (ayrinti !== undefined) console.log("        ", JSON.stringify(ayrinti));
  }
}

const bugun = new Date("2026-10-27T10:00:00Z");
const zemin = (ek: Partial<FiyatZemini> = {}, dilimler: FiyatZemini["zemin"]["dilimler"] = []): FiyatZemini => ({
  zemin: {
    kanalAdi: "Trendyol — AXCALI",
    channelAccountId: "h1",
    dilimler,
    pencereBitis: null,
    tekOran: 10,
    komisyonKdvOrani: null,
    siparisKesintileri: [],
  },
  kdvOrani: 20,
  paraBirimi: "TRY",
  maliyet: 500,
  kargoTarifesi: 50,
  ...ek,
});
const satir = (ek: Partial<OneriGirdisi>): OneriGirdisi => ({
  durum: "BIRINCI",
  bizimFiyat: 900,
  bizimListeFiyati: null,
  buyboxFiyati: 900,
  ikinciFiyat: 1000,
  kanalIndirimi: 0,
  ...ek,
});
const marjAt = (z: FiyatZemini, fiyat: number) => fiyatSonucu(z, fiyat, bugun).marj as number;

// ── ① MALİYET TERCİHİ ───────────────────────────────────────────────────
console.log("\n① maliyet — elde kalan stoktan, ürün ürün seçilir");
{
  const p = (kalanAdet: number, birimMaliyet: string | null, para = "TRY") => ({ kalanAdet, birimMaliyet, birimMaliyetParaBirimi: para });
  const partiler = [p(0, "100.00"), p(1, "600.00"), p(3, "400.00"), p(2, null), p(5, "50.00", "EUR")];
  kontrol("EN_DUSUK: stoku bitmiş 100 girmez → 400", acikMaliyet(partiler, "TRY", "EN_DUSUK").maliyet === 400);
  kontrol("EN_YUKSEK → 600", acikMaliyet(partiler, "TRY", "EN_YUKSEK").maliyet === 600);
  kontrol("ORTALAMA adetle ağırlıklı: (600×1 + 400×3) / 4 = 450", acikMaliyet(partiler, "TRY", "ORTALAMA").maliyet === 450, acikMaliyet(partiler, "TRY", "ORTALAMA"));
  kontrol("maliyeti boş / başka para birimli parti sayılmaz (2 parti)", acikMaliyet(partiler, "TRY", "ORTALAMA").partiSayisi === 2);
  kontrol("rafta maliyeti bilinen parti yoksa null — üç tercihte de", (["EN_DUSUK", "ORTALAMA", "EN_YUKSEK"] as const).every((t) => acikMaliyet([p(0, "1.00"), p(2, null)], "TRY", t).maliyet === null));
}
kosanBolumler.push("maliyet");

// ── ② GENEL / ÜRÜN AYARI ────────────────────────────────────────────────
console.log("\n② ayar — ürüne ayrı değer kalır, olmayan genel ayarı izler");
{
  kontrol("varsayılan: %6 · ₺50 · en düşük · onaylı", VARSAYILAN_KURAL.minMarj === 6 && VARSAYILAN_KURAL.adim === 50 && VARSAYILAN_KURAL.maliyet === "EN_DUSUK" && VARSAYILAN_KURAL.mod === "ONAYLI");
  const urun = { minMarj: 4, adim: null, maliyet: null, mod: "OTOMATIK" as const };
  const once = etkinKural(VARSAYILAN_KURAL, urun);
  const sonra = etkinKural({ ...VARSAYILAN_KURAL, minMarj: 8, adim: 30 }, urun);
  kontrol("ürüne ayrı marj (%4) genel %8'e çekilince DE kalır", once.minMarj === 4 && sonra.minMarj === 4);
  kontrol("ayrı adımı olmayan ürün genel adımı izler (50 → 30)", once.adim === 50 && sonra.adim === 30);
  kontrol("ayrı değer işaretli, olmayan işaretsiz", sonra.ayri.minMarj && sonra.ayri.mod && !sonra.ayri.adim && !sonra.ayri.maliyet);
  const yok = etkinKural({ ...VARSAYILAN_KURAL, minMarj: 8 }, null);
  kontrol("kuralı hiç olmayan ürün genel ayarı izler (%8 · onaylı)", yok.minMarj === 8 && yok.mod === "ONAYLI" && !yok.ayri.minMarj);
  /** `0` meşru bir ayrı değerdir («bu üründe marj sıfır olsun»), «genel ayarı izle» değil. */
  kontrol("ayrı marj 0 genel ayara düşmez", etkinKural(VARSAYILAN_KURAL, { minMarj: 0, adim: null, maliyet: null, mod: null }).minMarj === 0);
}
kosanBolumler.push("ayar");

// ── ③ BUYBOX BİZDE ──────────────────────────────────────────────────────
console.log("\n③ Buybox bizde — 2. satıcının bir adım altına YÜKSELT, düşürme");
{
  const z = zemin();
  const o = fiyatOnerisi(satir({ bizimFiyat: 900, ikinciFiyat: 1000 }), z, { minMarj: 6, adim: 50 }, bugun);
  kontrol("2. ₺1.000, adım 50 → ₺950'ye yükselt", o.tur === "GONDER" && o.neden === "IKINCI_ALTI" && o.hedef === 950 && o.listeFiyati === 950, o);
  const yakin = fiyatOnerisi(satir({ bizimFiyat: 960, ikinciFiyat: 1000 }), z, { minMarj: 6, adim: 50 }, bugun);
  kontrol("fark adımdan küçük (960 ↔ 1000) → dokunma, DÜŞÜRME", yakin.tur === "DOKUNMA" && yakin.neden === "YAKIN", yakin);
  const tam = fiyatOnerisi(satir({ bizimFiyat: 950, ikinciFiyat: 1000 }), z, { minMarj: 6, adim: 50 }, bugun);
  kontrol("fark tam adım (950 ↔ 1000) → dokunma", tam.tur === "DOKUNMA" && tam.neden === "YAKIN", tam);
  const tek = fiyatOnerisi(satir({ ikinciFiyat: null }), zemin({ maliyet: null }), { minMarj: 6, adim: 50 }, bugun);
  kontrol("tek satıcı → dokunma (maliyet bilinmese bile)", tek.tur === "DOKUNMA" && tek.neden === "RAKIP_YOK", tek);
  /** Yükseltme kârı artırır — marjı minimumun altında olsa da yapılır (kural düşürmeyi yasaklar). */
  const dusukMarj = fiyatOnerisi(satir({ bizimFiyat: 900, ikinciFiyat: 1000 }), z, { minMarj: marjAt(z, 950) + 50, adim: 50 }, bugun);
  kontrol("yükseltme minimum marja takılmaz", dusukMarj.tur === "GONDER", dusukMarj);
  /** Dilim atlaması: 990'da %5, 1050'de %40 → yükseltmek NET-2'yi düşürür. */
  const dilimli = zemin({}, [
    { sira: 1, altLimit: null, ustLimit: 1000, oran: 5 },
    { sira: 2, altLimit: 1000, ustLimit: null, oran: 40 },
  ]);
  const atlama = fiyatOnerisi(satir({ bizimFiyat: 990, ikinciFiyat: 1100 }), dilimli, { minMarj: 6, adim: 50 }, bugun);
  kontrol("yükseltme NET-2'yi artırmıyorsa (dilim %5 → %40) → dokunma", atlama.tur === "DOKUNMA" && atlama.neden === "KAZANC_YOK", atlama);
}
kosanBolumler.push("bizde");

// ── ④ BUYBOX KAYBEDİLDİ ─────────────────────────────────────────────────
console.log("\n④ Buybox başkasında — bir adım altı, marj minimumun altındaysa düşürme");
{
  const z = zemin();
  const g = satir({ durum: "KAYBEDILDI", bizimFiyat: 1100, buyboxFiyati: 1000, ikinciFiyat: 1100 });
  const m = marjAt(z, 950);
  const al = fiyatOnerisi(g, z, { minMarj: m - 1, adim: 50 }, bugun);
  kontrol(`Buybox ₺1.000 → ₺950 (marj %${m.toFixed(2)} ≥ min) → gönder`, al.tur === "GONDER" && al.neden === "BUYBOX_AL" && al.hedef === 950, al);
  const taban = fiyatOnerisi(g, z, { minMarj: m + 1, adim: 50 }, bugun);
  kontrol("aynı fiyatta marj minimumun ALTINDA → dokunma (taban)", taban.tur === "DOKUNMA" && taban.neden === "TABAN" && taban.sonuc !== null, taban);
  const adim = fiyatOnerisi(g, z, { minMarj: 0, adim: 10 }, bugun);
  kontrol("adım ayardan gelir (10 → ₺990)", adim.tur === "GONDER" && adim.hedef === 990, adim);
  const fiyatDisi = fiyatOnerisi({ ...g, bizimFiyat: 1000 }, z, { minMarj: 0, adim: 50 }, bugun);
  kontrol("fiyatımız Buybox'a eşit ama kayıp → dokunma (fiyat dışı)", fiyatDisi.tur === "DOKUNMA" && fiyatDisi.neden === "FIYAT_DISI", fiyatDisi);
  const sifir = fiyatOnerisi({ ...g, buyboxFiyati: 40 }, z, { minMarj: 0, adim: 50 }, bugun);
  kontrol("hedef sıfır/eksi → dokunma (taban)", sifir.tur === "DOKUNMA" && sifir.neden === "TABAN", sifir);
}
kosanBolumler.push("kaybedildi");

// ── ⑤ HB KENDİ İNDİRİMİ ─────────────────────────────────────────────────
console.log("\n⑤ HB — hedef MÜŞTERİ fiyatı, gönderilen ve kârı hesaplanan LİSTE fiyatı");
{
  const z = zemin({ zemin: { ...zemin().zemin, kanalAdi: "Hepsiburada — AXCALI" } });
  const g = satir({ durum: "KAYBEDILDI", bizimFiyat: 1100, bizimListeFiyati: 1250, buyboxFiyati: 1000, kanalIndirimi: 0.12 });
  const o = fiyatOnerisi(g, z, { minMarj: 0, adim: 50 }, bugun);
  kontrol("müşteri fiyatı hedefi (950) aşmaz, liste fiyatı ondan büyük", o.tur === "GONDER" && o.musteri <= 950 && o.listeFiyati > 950, o);
  kontrol("kâr LİSTE fiyatından hesaplanır", o.tur === "GONDER" && o.sonuc.fiyat === o.listeFiyati, o);
}
kosanBolumler.push("hb");

// ── ⑥ HESAPLANAMAZ ──────────────────────────────────────────────────────
console.log("\n⑥ bilinmeyen — öneri yok, sebep ayrı");
{
  const g = satir({ durum: "KAYBEDILDI", bizimFiyat: 1100, buyboxFiyati: 1000 });
  const sebep = (o: ReturnType<typeof fiyatOnerisi>) => (o.tur === "HESAPLANAMAZ" ? o.sebep : o.tur);
  kontrol("maliyet yok → MALIYET_YOK", sebep(fiyatOnerisi(g, zemin({ maliyet: null }), { minMarj: 0, adim: 50 }, bugun)) === "MALIYET_YOK");
  kontrol("kargo yok → KARGO_YOK (desi bekliyor)", sebep(fiyatOnerisi(g, zemin({ kargoTarifesi: null }), { minMarj: 0, adim: 50 }, bugun)) === "KARGO_YOK");
  kontrol("öndeyken de kargo yoksa yükseltme önerilmez", sebep(fiyatOnerisi(satir({}), zemin({ kargoTarifesi: null }), { minMarj: 0, adim: 50 }, bugun)) === "KARGO_YOK");
  kontrol("görünmüyor / sorgulanamadı → DURUM_YOK", (["GORUNMUYOR", "SORGULANAMADI"] as const).every((d) => sebep(fiyatOnerisi({ ...g, durum: d }, zemin(), { minMarj: 0, adim: 50 }, bugun)) === "DURUM_YOK"));
  kontrol("bizim fiyat okunamadı → FIYAT_YOK", sebep(fiyatOnerisi({ ...g, bizimFiyat: null }, zemin(), { minMarj: 0, adim: 50 }, bugun)) === "FIYAT_YOK");
  kontrol("Buybox fiyatı okunamadı → FIYAT_YOK", sebep(fiyatOnerisi({ ...g, buyboxFiyati: null }, zemin(), { minMarj: 0, adim: 50 }, bugun)) === "FIYAT_YOK");
}
kosanBolumler.push("hesaplanamaz");

// ── ⑦ TEK BAŞINA KARGO ──────────────────────────────────────────────────
console.log("\n⑦ kargo — ürünün tek başına satıldığı en son siparişten");
{
  const s = (kalemSayisi: number, adet: number, paketSayisi: number, tutar: number | null, desi: number | null = 3) => ({ kalemSayisi, adet, paketSayisi, tutar, desi });
  kontrol("çok kalemli · 2 adetli · 2 paketli · kargosu bilinmeyen atlanır → 4. kayıt", tekBasinaKargo([s(2, 1, 1, 90), s(1, 2, 1, 80), s(1, 1, 2, 70), s(1, 1, 1, null), s(1, 1, 1, 61.5, 4), s(1, 1, 1, 55)])?.tutar === 61.5);
  kontrol("en YENİ uygun satış seçilir (liste yeniden eskiye)", tekBasinaKargo([s(1, 1, 1, 40), s(1, 1, 1, 99)])?.tutar === 40);
  kontrol("0 meşru bir tutardır (bedava kargo), atlanmaz", tekBasinaKargo([s(1, 1, 1, 0)])?.tutar === 0);
  kontrol("uygun satış yoksa null", tekBasinaKargo([s(2, 1, 1, 90)]) === null && tekBasinaKargo([]) === null);
}
kosanBolumler.push("kargo");

// ── ⑧ BAĞLAR (kaynak — yorumsuz, kullanım bloğuna daraltılmış) ──────────
console.log("\n⑧ bağlar — pencere kuralı okur, öneri göndermez, satır ve pencere aynı ölçüt");
{
  const yorumsuz = (x: string) => x.replace(/\{\/\*[\s\S]*?\*\/\}/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
  const blok = (metin: string, capa: string, uzunluk: number) => {
    const i = metin.indexOf(capa);
    return i < 0 ? "" : metin.slice(i, i + uzunluk);
  };
  const v = yorumsuz(kaynakOku("src/lib/buybox-fiyat-verisi.ts"));
  const iTek = v.indexOf("if (tekSatis !== null) {");
  const iDesi = v.indexOf("const desiHam = varyant?.product?.desi;");
  kontrol("kargo: önce tek başına satışın ödenen kargosu, yoksa desi + tarife", iTek >= 0 && iDesi >= 0 && iTek < iDesi && /kargoTarifesi: tekSatis\.tutar \}/.test(blok(v, "if (tekSatis !== null) {", 900)), { iTek, iDesi });
  const kv = yorumsuz(kaynakOku("src/lib/buybox-kural-verisi.ts"));
  kontrol("satır uyarısı ve pencere AYNI son-satış penceresini okur", /take: SON_SATIS_SAYISI,/.test(v) && /\.slice\(0, SON_SATIS_SAYISI\)/.test(blok(kv, "export async function desiBekleyenler(", 2500)));
  kontrol("satır uyarısı pencerenin AYNI saf kapısıyla (tekBasinaKargo)", /const uygun = tekBasinaKargo\(/.test(blok(kv, "export async function desiBekleyenler(", 2500)));
  const p = yorumsuz(kaynakOku("src/app/rapor/buybox/fiyat-penceresi.tsx"));
  kontrol("pencere öneriyi ürünün ETKİN kuralıyla kurar",
    /fiyatOnerisi\(\{ durum, bizimFiyat, bizimListeFiyati, buyboxFiyati, ikinciFiyat, kanalIndirimi: indirim \}, zemin\.zemin, zemin\.kural\.etkin, bugun\)/.test(p));
  const kutu = blok(p, "<OneriKutusu", 700);
  kontrol("«kutuya yaz» yalnız kutuyu doldurur — GÖNDERMEZ", kutu.length > 0 && /kutuyaYaz=\{\(f\) => \{\s*setFiyatMetni\(bicim\.sayi\(f, 2\)\);/.test(kutu) && !/buyboxFiyatGonder|gonder\(/.test(kutu));
  kontrol("ürün kuralı formu yalnız kanala yazma izniyle", /\{gonderebilir \? <UrunKuraliFormu /.test(p));
  const e = yorumsuz(kaynakOku("src/app/rapor/buybox/kural-eylemleri.ts"));
  const g = blok(e, "export async function buyboxGenelKuralKaydet(", 1800);
  const u = blok(e, "export async function buyboxUrunKuraliKaydet(", 2600);
  kontrol("genel kural: ilk iş ayar.yaz izni · iz bırakır", /^export async function buyboxGenelKuralKaydet\([^)]*\): Promise<KuralSonucu> \{\s*if \(!\(await izinVarMi\("ayar\.yaz"\)\)\) return/.test(g) && /action: "BUYBOX_KURALI"/.test(g));
  kontrol("ürün kuralı: ilk iş kanal.yaz izni · iz bırakır", /\): Promise<KuralSonucu> \{\s*if \(!\(await izinVarMi\("kanal\.yaz"\)\)\) return/.test(u) && /action: "BUYBOX_KURALI"/.test(u));
  /**
   * ESKİ ÖLÇÜT VE NİYE ÇEVRİLDİ: adım 1'de «mod bu turda yazılmaz (otomatik
   * gönderim yok — tutulamayacak söz)» ölçülüyordu. Adım 3'te gönderim yazıldı
   * (`lib/buybox-otomatik.ts`); söz artık tutulabiliyor, ölçüt «mod yazılır VE
   * kapalı kümeden doğrulanır»a döndü.
   */
  kontrol("genel kural: mod doğrulanır ve yazılır", /if \(!modGecerli\(veri\.mod\)\) return \{ tamam: false, kod: "MOD_GECERSIZ" \};/.test(g) && /buyboxMod: veri\.mod/.test(g));
  kontrol("ürün kuralı: mod doğrulanır ve yazılır (boş = genel ayarı izle)", /if \(veri\.mod !== null && !modGecerli\(veri\.mod\)\) return \{ tamam: false, kod: "MOD_GECERSIZ" \};/.test(u) && /\n\s*mod,\n/.test(u));
  const tr = JSON.parse(kaynakOku("messages/tr.json")) as Record<string, Record<string, string>>;
  const b = tr.Buybox ?? {};
  const gerekli = [
    ...["IKINCI_ALTI", "BUYBOX_AL"].map((x) => `oneri_${x}`),
    ...["RAKIP_YOK", "YAKIN", "TABAN", "TABAN_SIFIR", "FIYAT_DISI", "KAZANC_YOK"].map((x) => `dokunma_${x}`),
    ...["DURUM_YOK", "FIYAT_YOK", "MALIYET_YOK", "KARGO_YOK", "NET_YOK"].map((x) => `hesaplanamaz_${x}`),
    ...MALIYET_TERCIHLERI.map((x) => `maliyetTercihi_${x}`),
    ...["YETKI_YOK", "MARJ_GECERSIZ", "ADIM_GECERSIZ", "MALIYET_GECERSIZ", "MOD_GECERSIZ", "VARYANT_YOK", "OKUNAMADI", "SAYI"].map((x) => `kuralHata_${x}`),
    ...["ONAYLI", "OTOMATIK"].map((x) => `mod_${x}`),
    "alanMod", "genelModOtomatikNotu", "urunModOtomatikNotu", "otomatikRozet", "otomatikBaslik", "otomatikHicKosmadi", "otomatikKacti",
    "otomatikSonKontrol", "otomatikKayitYok", "otomatikGonderildi", "otomatikReddedildi", "otomatikFiyat", "otomatikNeden_IKINCI_ALTI", "otomatikNeden_BUYBOX_AL", "otomatikKar",
    "desiBekliyor", "desiBekliyorUzun", "kargoDahilSatis", "kuralOzeti", "genelKuralDugme",
  ];
  const eksik = gerekli.filter((x) => !(b[x] ?? "").length);
  kontrol("sözlük: öneri / sebep / hata metinlerinin hepsi dolu", eksik.length === 0, eksik);
  kontrol("maliyet notu seçilen tercihi söyler (sabit «en düşük» değil)", /\{tercih\}/.test(b.maliyetNotu ?? "") && !/en düşük/.test(b.maliyetNotu ?? ""));
}
kosanBolumler.push("baglar");

// ── ⑨ OTOMATİK GÖNDERİM (K366 adım 3) ───────────────────────────────────
console.log("\n⑨ otomatik — kapı, tekrar kapısı, uç, gönderim çekirdeği");
{
  /** Öneriyi motordan üret (elle kurulmuş nesne değil) — kapı gerçek öneriyle sınanır. */
  const z = zemin();
  const yukselt = fiyatOnerisi(satir({ ikinciFiyat: 1000, bizimFiyat: 900 }), z, { minMarj: 6, adim: 50 }, bugun);
  kontrol("öndeyken yükseltme önerisi kapıdan GEÇER ve LİSTE fiyatı gider", yukselt.tur === "GONDER" && otomatikKarar(yukselt, { minMarj: 6 }).gonder === true && (otomatikKarar(yukselt, { minMarj: 6 }) as { fiyat: number }).fiyat === yukselt.listeFiyati, yukselt);
  const mYuk = yukselt.tur === "GONDER" ? (yukselt.sonuc.marj as number) : 0;
  kontrol("YÜKSELTME en az marja takılmaz (kârı artırır) — min marjın üstünde bile gider", otomatikKarar(yukselt, { minMarj: mYuk + 1 }).gonder === true);
  const al = fiyatOnerisi(satir({ durum: "KAYBEDILDI", bizimFiyat: 1100, buyboxFiyati: 1000 }), z, { minMarj: 6, adim: 50 }, bugun);
  const mAl = al.tur === "GONDER" ? (al.sonuc.marj as number) : Number.NaN;
  kontrol("Buybox'ı alma önerisi (marj ≥ min) GEÇER", al.tur === "GONDER" && otomatikKarar(al, { minMarj: mAl - 1 }).gonder === true, al);
  const kd = (o: Oneri, m: number) => {
    const k = otomatikKarar(o, { minMarj: m });
    return k.gonder ? "GONDER" : k.sebep;
  };
  kontrol("Buybox'ı alma: marj min'in altına düşerse ikinci savunma TABAN der", al.tur === "GONDER" && kd(al, mAl + 1) === "TABAN");
  kontrol("«dokunma» önerisi gönderilmez (ONERI_YOK)", kd(fiyatOnerisi(satir({ ikinciFiyat: null }), z, { minMarj: 6, adim: 50 }, bugun), 6) === "ONERI_YOK");
  kontrol("hesaplanamayan öneri gönderilmez (ONERI_YOK)", kd(fiyatOnerisi(satir({}), zemin({ maliyet: null }), { minMarj: 6, adim: 50 }, bugun), 6) === "ONERI_YOK");
  if (yukselt.tur === "GONDER") {
    const zarar: Oneri = { ...yukselt, sonuc: { ...yukselt.sonuc, net2: -0.01 } };
    const sifir: Oneri = { ...yukselt, sonuc: { ...yukselt.sonuc, net2: 0 } };
    const bilinmez: Oneri = { ...yukselt, sonuc: { ...yukselt.sonuc, net2: null } };
    kontrol("NET-2 eksi / sıfır / bilinmiyor → ASLA gönderilmez (ZARAR)", kd(zarar, -50) === "ZARAR" && kd(sifir, -50) === "ZARAR" && kd(bilinmez, -50) === "ZARAR");
    kontrol("NET-2 bir kuruş artıda → gönderilir (sınırın iki yakası)", kd({ ...yukselt, sonuc: { ...yukselt.sonuc, net2: 0.01 } }, -50) === "GONDER");
    kontrol("fiyat 0 / sayı değil → gönderilmez", kd({ ...yukselt, listeFiyati: 0 }, -50) === "FIYAT_GECERSIZ" && kd({ ...yukselt, listeFiyati: Number.NaN }, -50) === "FIYAT_GECERSIZ");
  }

  const simdi = new Date("2026-10-27T10:00:00Z");
  const once = (dk: number) => new Date(simdi.getTime() - dk * 60_000);
  kontrol("tekrar penceresi TY'nin kendi kuralı: 15 dk", TEKRAR_PENCERESI_DK === 15);
  kontrol("aynı kanal + aynı fiyat 14 dk önce → tekrar gönderilmez", yakindaGonderildiMi([{ kanal: "TY", fiyat: 950, an: once(14) }], "TY", 950, simdi));
  kontrol("16 dk önce → yeniden gönderilebilir", !yakindaGonderildiMi([{ kanal: "TY", fiyat: 950, an: once(16) }], "TY", 950, simdi));
  kontrol("başka kanal ya da başka fiyat tekrar sayılmaz", !yakindaGonderildiMi([{ kanal: "HB", fiyat: 950, an: once(1) }, { kanal: "TY", fiyat: 940, an: once(1) }], "TY", 950, simdi));
  kontrol("boş geçmiş tekrar sayılmaz", !yakindaGonderildiMi([], "TY", 950, simdi));

  const yorumsuz = (x: string) => x.replace(/\{\/\*[\s\S]*?\*\/\}/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
  const o = yorumsuz(kaynakOku("src/lib/buybox-otomatik.ts"));
  const bu = (() => {
    const i = o.indexOf("async function birUrun(");
    return i < 0 ? "" : o.slice(i);
  })();
  kontrol("motor: ürün gövdesi bulundu", bu.length > 0);
  const iKarar = bu.indexOf("const karar = otomatikKarar(oneri, z.kural.etkin);");
  const iRet = bu.indexOf("if (!karar.gonder) {");
  const iTekrar = bu.indexOf("if (yakindaGonderildiMi(gecmis, kanal, karar.fiyat, simdi)) return atla(\"YAKINDA_GONDERILDI\");");
  const iTy = bu.indexOf("await tyStokFiyatYaz(");
  const iHb = bu.indexOf("await hbStokFiyatYaz(");
  kontrol("motor: kapı → tekrar kapısı → gönderim SIRASI", iKarar >= 0 && iRet > iKarar && iTekrar > iRet && iTy > iTekrar && iHb > iTekrar, { iKarar, iRet, iTekrar, iTy, iHb });
  kontrol("motor: öneri pencereyle AYNI gövdeden (fiyatOnerisi + etkin kural)", /const oneri = fiyatOnerisi\(\s*\{ durum: s\.durum, bizimFiyat: s\.bizimFiyat, bizimListeFiyati: s\.bizimListeFiyati, buyboxFiyati: s\.buyboxFiyati, ikinciFiyat: s\.ikinciFiyat, kanalIndirimi: s\.kanalIndirimi \},\s*z\.zemin,\s*z\.kural\.etkin,/.test(bu));
  kontrol("motor: mod gönderimden hemen önce TAZE kuraldan yeniden sorulur", /if \(z\.kural\.etkin\.mod !== "OTOMATIK"\) return atla\("MOD_ONAYLI"\);/.test(bu) && bu.indexOf('return atla("MOD_ONAYLI")') < iKarar);
  kontrol("motor: YALNIZ fiyat — stok gönderilmez, giden fiyat kapının fiyatı (iki kanal)",
    bu.includes("tyStokFiyatYaz(s.variantId, { stokGonder: false, fiyat: karar.fiyat })") && bu.includes("hbStokFiyatYaz(s.variantId, { stokGonder: false, fiyat: karar.fiyat })") && (bu.match(/StokFiyatYaz\(/g) ?? []).length === 2);
  kontrol("motor: her gönderim (kabul/red) iz bırakır, kullanıcısız", /await izYaz\(\{\s*action: OTOMATIK_FIYAT_IZI,[\s\S]{0,120}userId: null,/.test(bu) && bu.indexOf("action: OTOMATIK_FIYAT_IZI") > iHb);
  kontrol("motor: çözülemeyen eski iz tekrar kapısını AÇMAZ (ürün atlanır)", /if \(gecmis\.some\(\(g\) => g\.kanal === "\*"\)\) return atla\("IZ_OKUNAMADI"\);/.test(bu));
  kontrol("motor: zaman dolunca kalan ürünler SAYILIR (sessiz kalmaz)", /if \(Date\.now\(\) >= sonAn\) \{\s*atla\(s\.variantId, "ZAMAN_YETMEDI"\);/.test(o));
  const v = kaynakOku("src/lib/buybox-otomatik-verisi.ts");
  kontrol("ekran ile motor AYNI iz adlarını kullanır", /OTOMATIK_FIYAT_IZI = "BUYBOX_OTOMATIK_FIYAT"/.test(o) && /OTOMATIK_KOSUM_IZI = "BUYBOX_OTOMATIK_KOSUM"/.test(o) && /const FIYAT_IZI = "BUYBOX_OTOMATIK_FIYAT";/.test(v) && /const KOSUM_IZI = "BUYBOX_OTOMATIK_KOSUM";/.test(v));
  kontrol("ekran motoru (gönderim çekirdeğini) içe ALMAZ", !/from "\.\/buybox-otomatik"|kanal-fiyat-yaz/.test(v));

  const r = yorumsuz(kaynakOku("src/app/api/cron/buybox-otomatik/route.ts"));
  kontrol("uç: sır kapısı — tutmayan istek 404", /if \(sir === "" \|\| gelen !== `Bearer \$\{sir\}`\) \{\s*return new NextResponse\(null, \{ status: 404 \}\);/.test(r));
  kontrol("uç: kapı motordan ÖNCE", r.indexOf("status: 404") >= 0 && r.indexOf("status: 404") < r.indexOf("await buyboxOtomatikTur("));
  kontrol("uç: düşen kanal ya da reddedilen gönderim 500", /k\.coktu \|\| k\.reddedilen > 0/.test(r) && /status: sorunlu > 0 \? 500 : 200/.test(r));
  kontrol("uç: oturum kapısının açık yollarında", yorumsuz(kaynakOku("src/proxy.ts")).includes('"/api/cron/buybox-otomatik",'));
  const w = kaynakOku(".github/workflows/buybox-otomatik.yml");
  kontrol("yedek zamanlayıcı 15 dk, birincilden kaydırılmış (:07)", /- cron: "7,22,37,52 \* \* \* \*"/.test(w) && /\/api\/cron\/buybox-otomatik"/.test(w) && /test "\$KOD" = "200"/.test(w));

  /**
   * GÖNDERİM ÇEKİRDEĞİNİN İZİN KAPISI ÇAĞIRANDADIR — kim içe alıyor, DESENDEN
   * türetilir (elle liste değil); beyansız içe alan KIRMIZI. Çekirdek
   * `"use server"` taşırsa her dışa aktarımı tarayıcıdan izinsiz çağrılır.
   */
  const lib = kaynakOku("src/lib/kanal-fiyat-yaz.ts");
  kontrol("çekirdek \"use server\" TAŞIMAZ", !/^\s*["']use server["']/m.test(lib));
  const BEYANLI = new Map<string, string>([
    ["src/app/kart/[variantId]/actions.ts", "kart eylemleri — her gönderim ilk satırda yetkiIste(\"kanal.yaz\")"],
    ["src/lib/buybox-otomatik.ts", "Buybox otomatik işi — yalnız CRON_SECRET kapılı uçtan"],
  ]);
  const dosyalar: string[] = [];
  const gez = (d: string) => {
    for (const ad of readdirSync(d)) {
      const y = join(d, ad);
      if (statSync(y).isDirectory()) gez(y);
      else if (/\.(ts|tsx)$/.test(ad)) dosyalar.push(y.split("\\").join("/"));
    }
  };
  gez("src");
  const iceAlanlar = dosyalar.filter((y) => y !== "src/lib/kanal-fiyat-yaz.ts" && /from ["'](@\/lib\/|\.\/|\.\.\/)+(lib\/)?kanal-fiyat-yaz["']/.test(kaynakOku(y)));
  kontrol("çekirdeği içe alan dosya bulundu (taban DOLU)", iceAlanlar.length >= 2, iceAlanlar);
  const beyansiz = iceAlanlar.filter((y) => !BEYANLI.has(y));
  kontrol("çekirdeği yalnız BEYANLI dosyalar içe alır", beyansiz.length === 0, beyansiz);
  const sarmal = yorumsuz(kaynakOku("src/lib/buybox-otomatik.ts"));
  kontrol("otomatik iş YALNIZ kapılı uçtan çağrılır (motoru içe alan tek dosya uç)", dosyalar.filter((y) => y !== "src/lib/buybox-otomatik.ts" && /from ["']@\/lib\/buybox-otomatik["']/.test(kaynakOku(y))).join() === "src/app/api/cron/buybox-otomatik/route.ts" && sarmal.length > 0);
}
kosanBolumler.push("otomatik");

console.log("");
if (kosanBolumler.length !== BOLUM_SAYISI) {
  console.log(`KOŞUM YARIM KALDI — ${kosanBolumler.length}/${BOLUM_SAYISI} bölüm; sonuç GEÇERSİZ`);
  process.exit(1);
}
if (basarisiz > 0) {
  console.log(`${basarisiz} KONTROL BAŞARISIZ`);
  process.exit(1);
}
console.log("TÜM KONTROLLER GEÇTİ");
