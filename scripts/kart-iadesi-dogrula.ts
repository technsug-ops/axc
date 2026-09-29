import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { kaynakOku } from "./kaynak-oku";
import { kartBorcuHesapla } from "../src/lib/kart-borcu";
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
const BOLUM_SAYISI = 3;
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
