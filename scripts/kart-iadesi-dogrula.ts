import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { kaynakOku } from "./kaynak-oku";
import { kartBorcuHesapla } from "../src/lib/kart-borcu";
import { kartAlimTutari } from "../src/lib/kart-alim-tutari";
import { alimIadeleriniBorcaCevir, type KartIadesi } from "../src/lib/kart-iadesi";

/**
 * ============================================================================
 *  KARTA DÖNEN ALIM İADESİ BEKÇİSİ (K305) — `npm run kart-iadesi:dogrula`
 * ----------------------------------------------------------------------------
 *  ① KURAL — saf gövde çağrılır: iade EKSİ tutarlı kalem, doğru kart ve para
 *     birimi, borcu azaltır, ekstreyi sıfırın altına indirmez.
 *  ② DESEN — kart borcunu kuran HER gövde (giderleri ekleyen her dosya)
 *     iadeyi de ekler. Dosya listesi TUTULMAZ, taranır.
 *  ③ VERİ — tahsil günü rapor ile AYNI kuraldan, İstanbul gününe çevrilir.
 * ============================================================================
 */

let gecen = 0;
let kalan = 0;
const kosanBolumler: string[] = [];
const BOLUM_SAYISI = 4;
function kontrol(ad: string, sonuc: boolean, gorulen?: unknown) {
  if (sonuc) {
    gecen++;
    console.log(`  OK    ${ad}`);
  } else {
    kalan++;
    console.log(`  HATA  ${ad}`);
    if (gorulen !== undefined) console.log("        ", JSON.stringify(gorulen));
  }
}
const yorumsuz = (m: string) => m.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1");

console.log("=".repeat(70));
console.log("KARTA DÖNEN ALIM İADESİ (K305)");
console.log("=".repeat(70));

// ── 1) KURAL ─────────────────────────────────────────────────────────────
console.log("\n1) kural — değerle");
{
  const gun = (y: number, a: number, g: number) => new Date(Date.UTC(y, a - 1, g));
  const iade = (o: Partial<KartIadesi> = {}): KartIadesi => ({ id: "t1", kartId: "K1", alimKodu: "ALM-1", tutar: 799.91, paraBirimi: "TRY", tarih: gun(2026, 9, 14), ...o });
  const c = alimIadeleriniBorcaCevir([iade(), iade({ id: "t2", kartId: "K2" }), iade({ id: "t3", paraBirimi: "EUR" }), iade({ id: "t4", tutar: 0 })], "K1", "TRY");
  kontrol("iade EKSİ tutarlı tek çekim kalem", c.length === 1 && c[0].tutar === -799.91 && c[0].taksitSayisi === 1, c);
  kontrol("başka kartın iadesi GİRMEZ", !c.some((x) => x.id === "iade-t2"));
  kontrol("başka para biriminin iadesi GİRMEZ (kur çevrilmez)", !c.some((x) => x.id === "iade-t3"));
  kontrol("sıfır iade kalem üretmez", !c.some((x) => x.id === "iade-t4"));
  kontrol("kalem alım kodunu taşır (ekstrede okunur)", c[0].kod === "ALM-1 · iade");

  const kart = { kesimGunu: 20, sonOdemeGunu: 5, limit: null };
  const alim = { id: "a", kod: "ALM-1", tarih: gun(2026, 9, 11), tutar: 1599.82, taksitSayisi: 1 };
  const ayni = kartBorcuHesapla([alim, ...c], kart, gun(2026, 9, 1), []);
  kontrol("aynı ekstrede iade borcu düşürür (1.599,82 − 799,91)", Math.abs(ayni.acikToplam - 799.91) < 0.005, ayni.acikToplam);
  const yalniz = kartBorcuHesapla(alimIadeleriniBorcaCevir([iade({ tarih: gun(2026, 10, 25) })], "K1", "TRY"), kart, gun(2026, 9, 1), []);
  kontrol("yalnız iade olan ekstre borcu EKSİYE indirmez", yalniz.acikToplam >= 0, yalniz.acikToplam);
}
kosanBolumler.push("kural");

// ── 2) DESEN ─────────────────────────────────────────────────────────────
console.log("\n2) desen — kart borcunu kuran her gövde iadeyi ekler");
{
  const tum: string[] = [];
  const gez = (d: string) => {
    for (const a of readdirSync(d)) {
      const y = join(d, a);
      if (statSync(y).isDirectory()) {
        if (a !== "generated") gez(y);
      } else if (/\.(ts|tsx)$/.test(a)) tum.push(y.split(String.fromCharCode(92)).join("/"));
    }
  };
  gez("src");
  const govdeler = tum.filter((y) => y !== "src/lib/kart-gideri.ts" && /giderleriBorcaCevir\(/.test(yorumsuz(kaynakOku(y))));
  kontrol(`kart borcu kuran gövde tabanı DOLU (${govdeler.length} dosya)`, govdeler.length >= 3, govdeler);
  const eksik = govdeler.filter((y) => {
    const m = yorumsuz(kaynakOku(y));
    return (m.match(/giderleriBorcaCevir\(/g) ?? []).length !== (m.match(/alimIadeleriniBorcaCevir\(/g) ?? []).length;
  });
  kontrol("gider ekleyen HER çağrının yanında iade de ekleniyor (sayı eşit)", eksik.length === 0, eksik);
}
kosanBolumler.push("desen");

// ── 3) VERİ ──────────────────────────────────────────────────────────────
console.log("\n3) veri — tahsil günü rapor ile aynı kuraldan");
{
  const v = yorumsuz(kaynakOku("src/lib/kart-iadesi-veri.ts"));
  kontrol("yalnız alım kalemine bağlı + kartla ödenmiş talep", v.includes("where: { purchaseItem: { purchase: { creditCardId: { not: null } } } }"));
  kontrol("tahsil günü ORTAK kuraldan (en yeni iz; geri alınan düşer)", v.includes("const tarihler = tazminatTahsilTarihleri(izler);") && v.includes("if (!tarih || !kartId) continue;"));
  kontrol("tarih İSTANBUL gününe çevrilir", v.includes("tarih: gunDegeri(isTakvimGunu(tarih)),"));
  const rapor = yorumsuz(kaynakOku("src/app/rapor/page.tsx"));
  kontrol("rapor aynı ölçütle alım iadesini ayırıyor (alım kalemine bağlı)", rapor.includes("alimIadesi: k.purchaseItem !== null,"));
}
kosanBolumler.push("veri");

// ── 4) ALIM TUTARI (K308) ────────────────────────────────────────────────
/**
 * ⛔ VAKA (29.09.2026): dört kurucunun ikisi alım tutarına kargo+vergi
 * alanlarını EKLİYOR, ikisi eklemiyordu. Kullanıcı beyanı: alım tutarı kargo
 * ve vergiyi İÇERİR. Kurucu kümesi TARANIR (`kartBorcuHesapla(` çağıran her
 * dosya); liste tutulmaz.
 */
console.log("\n4) alım tutarı — tek gövde; kargo/vergi yalnız AYRIYSA eklenir");
{
  /**
   * ⛔ K308 (29.09) «kargo/vergi ASLA eklenmez» → K309 (30.09) «AYRI yazılmışsa
   * ekle». Ölçütler ÇEVRİLDİ, gevşemedi: dahil alımda (bütün eski alımlar)
   * tutar hâlâ Σ birim × adet — K308'in koruduğu çift sayım imkânsız kalır.
   */
  const k = (quantity: number, tutar: number, unitCostCurrency = "TRY") => ({ quantity, unitCostAmount: tutar, unitCostCurrency });
  const dahil = { fiyatKdvDahil: true, kargoDahil: true, taxAmount: 200, shippingAmount: 60, customsAmount: 30 };
  const a = kartAlimTutari(dahil, [k(2, 1069.49), k(1, 100)], "TRY");
  kontrol("DAHİL alımda yalnız kalemler (alanlar dolu olsa bile EKLENMEZ — çift sayım yok)", Math.abs(a.tutar - 2238.98) < 0.005 && !a.farkliVar, a);
  const b = kartAlimTutari(dahil, [k(1, 100), k(1, 50, "EUR")], "TRY");
  kontrol("kartın para biriminde olmayan kalem GİRMEZ ve söylenir", b.tutar === 100 && b.farkliVar, b);
  const h = kartAlimTutari({ ...dahil, fiyatKdvDahil: false }, [k(1, 1000)], "TRY");
  kontrol("KDV hariç alımda faturadaki KDV karta eklenir", h.tutar === 1200, h);
  const kg = kartAlimTutari({ ...dahil, kargoDahil: false }, [k(1, 1000)], "TRY");
  kontrol("kargo AYRI alımda kargo karta eklenir", kg.tutar === 1060, kg);
  const gm = kartAlimTutari({ ...dahil, fiyatKdvDahil: false, kargoDahil: false }, [k(1, 1000)], "TRY");
  kontrol("gümrük karta YAZILMAZ (gümrükte ayrıca ödenir)", gm.tutar === 1260, gm);

  const tum: string[] = [];
  const gez = (d: string) => {
    for (const ad of readdirSync(d)) {
      const y = join(d, ad);
      if (statSync(y).isDirectory()) {
        if (ad !== "generated") gez(y);
      } else if (/\.(ts|tsx)$/.test(ad)) tum.push(y.split(String.fromCharCode(92)).join("/"));
    }
  };
  gez("src");
  const kurucular = tum.filter((y) => y !== "src/lib/kart-borcu.ts" && /kartBorcuHesapla\(/.test(yorumsuz(kaynakOku(y))));
  kontrol(`kart borcu kurucu tabanı DOLU (${kurucular.length} dosya)`, kurucular.length >= 4, kurucular);
  const ortaksiz = kurucular.filter((y) => !/kartAlimTutari\(/.test(yorumsuz(kaynakOku(y))));
  kontrol("HER kurucu tutarı ORTAK gövdeden alıyor", ortaksiz.length === 0, ortaksiz);
  const elle = kurucular.filter((y) => /unitCostAmount\.toString\(\)\)\s*\*/.test(yorumsuz(kaynakOku(y))));
  kontrol("hiçbir kurucu kalem tutarını ELLE çarpmıyor", elle.length === 0, elle);
  /* K309: eski ölçüt «alanı OKUMUYOR» idi; artık alan gövdeye GİDİYOR ama
     kurucu onunla ELLE hesap yapmıyor — ekleme kuralı yalnız gövdede. */
  const ekleyen = kurucular.filter((y) => /\b(shippingAmount|taxAmount|customsAmount)\b[\s\S]{0,30}\.toString\(\)/.test(yorumsuz(kaynakOku(y))));
  kontrol("hiçbir kurucu kargo/vergi/gümrükle ELLE hesap yapmıyor", ekleyen.length === 0, ekleyen);
  const secimsiz = kurucular.filter((y) => {
    const m = yorumsuz(kaynakOku(y));
    /* Yalnız ÜST seviye `select` — `include` bütün alanları getirir; içteki
       `items: { select }` ölçüte takılmamalı (ilk yazım takılıyordu). */
    return /purchase\.findMany\(\{\s*where: \{[^\n]*\},\s*select:/.test(m) && !/\.\.\.ALIM_FATURA_SECIMI/.test(m);
  });
  kontrol("select kullanan kurucu fatura alanlarını seçiyor (yoksa ek sessizce 0 olurdu)", secimsiz.length === 0, secimsiz);
}
kosanBolumler.push("alım tutarı");

console.log("\n" + "=".repeat(70));
if (kosanBolumler.length !== BOLUM_SAYISI) {
  console.log(`KOŞUM YARIM KALDI (${kosanBolumler.length}/${BOLUM_SAYISI}) — sonuç GEÇERSİZ`);
  process.exit(1);
}
if (kalan === 0) console.log(`TÜM KONTROLLER GEÇTİ (${gecen})`);
else {
  console.log(`${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrolden)`);
  process.exit(1);
}
