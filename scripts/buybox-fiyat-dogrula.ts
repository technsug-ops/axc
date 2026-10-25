/**
 * ============================================================================
 *  BUYBOX FİYAT KUTUSU BEKÇİSİ (K363 Faz 3-c)
 * ----------------------------------------------------------------------------
 *  Saf gövdeler ÇAĞRILIR (maliyet tabanı · motor eşliği · fiyat çözümü · zarar
 *  kapısı). Kaynak taraması yalnız bağlar için (yorumsuz kodda, kullanım
 *  bloğuna daraltılmış): sunucunun ekrana güvenmemesi, zarar kapısının
 *  gönderimden ÖNCE durması, yalnız Trendyol + yalnız fiyat, izin kapıları.
 * ============================================================================
 */
import { kaynakOku } from "./kaynak-oku";
import { enDusukAcikMaliyet, fiyatMetniCoz, fiyatSonucu, zararOnayiGerekirMi, type FiyatZemini } from "../src/lib/buybox-fiyat";
import { simulasyonKur } from "../src/lib/fiyatlama/simulasyon";

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
  const g = blok(e, "export async function buyboxFiyatGonder(", 2600);
  const i = (d: string) => g.indexOf(d);
  const iYetki = i('await yetkiIste("kanal.yaz");');
  const iKanal = i('if (kanal !== "TY") return { tamam: false, kod: "YALNIZ_TRENDYOL" };');
  const iHesap = i("const s = fiyatSonucu(z.zemin, fiyat, an);");
  const iKapi = i('if (!zararOnayi) return { tamam: false, kod: "ZARAR_ONAYI_GEREKLI" };');
  const iIz = i('action: "ZARARINA_FIYAT_ONAYI"');
  const iGonder = i("return await tyStokFiyatGonder(variantId, { stokGonder: false, fiyat });");
  kontrol("sıra: yetki → yalnız TY → SUNUCUDA kâr → zarar kapısı → iz → gönder",
    [iYetki, iKanal, iHesap, iKapi, iIz, iGonder].every((x) => x >= 0) && iYetki < iKanal && iKanal < iHesap && iHesap < iKapi && iKapi < iIz && iIz < iGonder,
    { iYetki, iKanal, iHesap, iKapi, iIz, iGonder });
  kontrol("zarar kapısı ortak gövdeden, SUNUCU sonucu üstünde", /if \(zararOnayiGerekirMi\(s\)\) \{/.test(g));
  kontrol("YALNIZ fiyat (stok gönderilmez)", !/stokGonder: true/.test(e));
  kontrol("gönderim tek yoldan: kartın eylemi (izli)", (e.match(/tyStokFiyatGonder\(/g) ?? []).length === 1);
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
  kontrol("kutu yalnız kâr görme izniyle; Kaydet kanala yazma izniyle", /izinVarMi\("satis\.kar\.gor"\), izinVarMi\("kanal\.yaz"\)/.test(s) && /karGorunur \? \(\s*<FiyatKutusu/.test(s));
  kontrol("kutu iki görünümde (tablo + telefon)", (s.match(/\{kutu\(s\)\}/g) ?? []).length === 2);
  const k = yorumsuz(kaynakOku("src/app/rapor/buybox/fiyat-kutusu.tsx"));
  kontrol("Kaydet yalnız Trendyol + izin", /\{zemin\?\.tamam && kanal === "TY" && gonderebilir \? \(/.test(k));
  kontrol("onay düğmesi zarar kutusu işaretlenmeden kapalı", /disabled=\{gonderiliyor \|\| !fiyatGecerli \|\| \(onayGerekli && !zararOnayi\)\}/.test(k));
  kontrol("kutu Buybox fiyatıyla dolu açılır", /useState\(buyboxFiyati === null \? "" : bicim\.sayi\(buyboxFiyati, 2\)\)/.test(k));
  kontrol("kargo hariçse ekranda SEBEBİYLE yazar", /t\(`kargoHaric_\$\{zemin\.kargo\.sebep \?\? "TARIFE_YOK"\}`\)/.test(k));
  const tr = JSON.parse(kaynakOku("messages/tr.json")) as Record<string, Record<string, string>>;
  const gerekli = ["hesapla", "kaydet", "rozetKar", "rozetZarar", "maliyetNotu", "maliyetYok", "kargoDahil", "kargoHaric_DESI_YOK", "kargoHaric_FIRMA_YOK", "kargoHaric_TARIFE_YOK", "onayMetni", "onayZararKutu", "onayKarBilinmiyorKutu", "gonderimHata_ZARAR_ONAYI_GEREKLI", "gonderim_BASARILI", "gonderim_ISLEMDE"];
  const eksik = gerekli.filter((x) => !(tr.Buybox?.[x] ?? "").length);
  kontrol("sözlük: kutu metinleri dolu", eksik.length === 0, eksik);
  kontrol("sayfa notu artık «fiyat buradan değişmez» DEMİYOR", !/fiyat buradan değişmez/.test(tr.Buybox?.notu ?? ""));
}
kosanBolumler.push("ekran");

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
