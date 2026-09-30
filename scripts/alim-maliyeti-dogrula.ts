import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { bayrakOku } from "../src/lib/alim-fatura";
import {
  alimEkleri,
  alimFaturaToplami,
  alimIndirilecekKdv,
  alimKartTutari,
  inisMaliyetleri,
  type AlimFaturasi,
} from "../src/lib/alim-maliyeti";
import { kaynakOku } from "./kaynak-oku";

/**
 * ============================================================================
 *  ALIMIN FATURA YAPISI BEKÇİSİ (K309) — `npm run alim-maliyeti:dogrula`
 * ----------------------------------------------------------------------------
 *  ① DEĞER — varsayılan alımda HİÇBİR rakam değişmez (iniş = fiyat, kart =
 *     kalemler, KDV = içindeki); hariç KDV / ayrı kargo / gümrük kalemlere
 *     tutar oranında dağıtılır; kart gümrüğü almaz; karışık para dağıtılmaz.
 *  ② FORM — işaretsiz kutu «hayır» sayılmaz (üç hâl: 1 · 0 · yok).
 *  ③ DESEN — stoğa alım maliyeti yazan HER yer iniş maliyetini ortak
 *     gövdeden alır; dosya listesi TUTULMAZ, `src/` taranır.
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
    if (gorulen !== undefined) console.log("        ", JSON.stringify(gorulen, (_k, v) => (v instanceof Map ? [...v] : v)));
  }
}
const yorumsuz = (m: string) =>
  m.replace(/\{\/\*[\s\S]*?\*\/\}/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1");
const yakin = (a: number | undefined, b: number) => a !== undefined && Math.abs(a - b) < 1e-6;

console.log("=".repeat(70));
console.log("ALIM FATURA YAPISI BEKÇİSİ (K309)");
console.log("=".repeat(70));

console.log("\n1) değer");
{
  const dahil: AlimFaturasi = { fiyatKdvDahil: true, kargoDahil: true, kdv: 200, kargo: 60, gumruk: null };
  const k = (anahtar: string, birim: number, adet = 1, paraBirimi = "TRY") => ({ anahtar, birim, adet, paraBirimi });

  const d = inisMaliyetleri(dahil, [k("a", 1069.49, 2), k("b", 333.3333, 3)]);
  kontrol("VARSAYILAN alımda iniş = girilen fiyat (alanlar dolu olsa bile, yuvarlamasız)", d.durum === "TAMAM" && d.birim.get("a") === 1069.49 && d.birim.get("b") === 333.3333, d);
  kontrol("  ...kart = kalemler, ek yok", alimKartTutari(dahil, [k("a", 1000)], "TRY").tutar === 1000);
  kontrol("  ...fatura toplamı = mal bedeli", alimFaturaToplami(dahil, 1000) === 1000);

  const hr: AlimFaturasi = { fiyatKdvDahil: false, kargoDahil: false, kdv: 200, kargo: 60, gumruk: null };
  const h = inisMaliyetleri(hr, [k("a", 1000)]);
  kontrol("HARİÇ KDV + ayrı kargo tek kalemde: 1000 + 200 + 60 = 1260", h.durum === "TAMAM" && yakin(h.birim.get("a"), 1260), h);
  const iki = inisMaliyetleri({ ...hr, kdv: null, fiyatKdvDahil: true, kargo: 100 }, [k("a", 600), k("b", 400)]);
  kontrol("ek TUTAR ORANINDA dağılır (600/400 → 60/40)", yakin(iki.birim.get("a"), 660) && yakin(iki.birim.get("b"), 440), iki);
  const adetli = inisMaliyetleri({ ...dahil, gumruk: 30 }, [k("a", 10, 3)]);
  kontrol("gümrük adet başına bölünür (10×3 + 30 → birim 20)", yakin(adetli.birim.get("a"), 20), adetli);
  const karisik = inisMaliyetleri(hr, [k("a", 100), k("b", 50, 1, "EUR")]);
  kontrol("karışık para biriminde DAĞITILMAZ ve söylenir", karisik.durum === "KARISIK_PARA" && karisik.birim.get("a") === 100, karisik);

  const ek = alimEkleri({ fiyatKdvDahil: false, kargoDahil: false, kdv: 200, kargo: 60, gumruk: 30 });
  kontrol("maliyet eki = KDV + kargo + gümrük", ek.maliyetEki === 290, ek);
  kontrol("kart eki = KDV + kargo (gümrük YOK)", ek.kartEki === 260, ek);
  kontrol("kart: hariç + ayrı + gümrük → 1000 + 260", alimKartTutari({ fiyatKdvDahil: false, kargoDahil: false, kdv: 200, kargo: 60, gumruk: 30 }, [k("a", 1000)], "TRY").tutar === 1260);

  const kalemKdv = [{ birim: 1200, adet: 1, oran: 20, paraBirimi: "TRY" }];
  kontrol("indirilecek KDV — DAHİL: fiyatın İÇİNDEKİ (1200 → 200)", yakin(alimIndirilecekKdv(dahil, kalemKdv, "TRY"), 200));
  kontrol("indirilecek KDV — HARİÇ: faturadaki tutar (oran değil)", yakin(alimIndirilecekKdv({ ...dahil, fiyatKdvDahil: false, kdv: 185 }, [{ birim: 1000, adet: 1, oran: 20, paraBirimi: "TRY" }], "TRY"), 185));
  kontrol("indirilecek KDV — ayrı kargonun KDV'si eklenir (120 → 20)", yakin(alimIndirilecekKdv({ ...dahil, kargoDahil: false, kargo: 120 }, kalemKdv, "TRY"), 220));
  kontrol("indirilecek KDV — gümrük KDV değildir", yakin(alimIndirilecekKdv({ ...dahil, gumruk: 500 }, kalemKdv, "TRY"), 200));
}
kosanBolumler.push("değer");

console.log("\n2) form — işaretsiz kutu «hayır» sayılmaz");
{
  const fd = (o: Record<string, string>) => {
    const f = new FormData();
    for (const [a, b] of Object.entries(o)) f.set(a, b);
    return f;
  };
  kontrol("«1» → true", bayrakOku(fd({ x: "1" }), "x") === true);
  kontrol("«0» → false", bayrakOku(fd({ x: "0" }), "x") === false);
  kontrol("alan YOK → undefined (güncellemede dokunulmaz)", bayrakOku(fd({}), "x") === undefined);
  const ted = yorumsuz(kaynakOku("src/app/ayarlar/tedarikciler/actions.ts"));
  kontrol("tedarikçi EKLEMEDE alan yoksa bugünkü davranış (dahil)", /fiyatKdvDahil: bayrak\.fiyatKdvDahil \?\? true,\s*kargoDahil: bayrak\.kargoDahil \?\? true,/.test(ted));
  kontrol("tedarikçi GÜNCELLEMEDE alan yoksa DOKUNULMAZ (undefined geçer)", /fiyatKdvDahil: bayrak\.fiyatKdvDahil,\s*kargoDahil: bayrak\.kargoDahil,/.test(ted));
  const bil = yorumsuz(kaynakOku("src/components/fatura-yapisi.tsx"));
  kontrol("kutu değeri gizli alanla HER ZAMAN gider", /name="fiyatKdvDahil" value=\{fiyatKdvDahil \? "1" : "0"\}/.test(bil) && /name="kargoDahil" value=\{kargoDahil \? "1" : "0"\}/.test(bil));
  const srv = yorumsuz(kaynakOku("src/app/alimlar/actions.ts"));
  kontrol("hariç alımda KDV tutarı ZORUNLU", /if \(!veri\.fiyatKdvDahil && veri\.kdv === null\) h\.push\(t\("kdvTutariZorunlu"\)\);/.test(srv));
  kontrol("ayrı kargoda kargo tutarı ZORUNLU", /if \(!veri\.kargoDahil && veri\.kargo === null\) h\.push\(t\("kargoTutariZorunlu"\)\);/.test(srv));
}
kosanBolumler.push("form");

console.log("\n3) desen — stoğa alım maliyeti yazan her yer iniş maliyetinden");
{
  const tum: string[] = [];
  const gez = (dz: string) => {
    for (const ad of readdirSync(dz)) {
      const y = join(dz, ad);
      if (statSync(y).isDirectory()) {
        if (ad !== "generated") gez(y);
      } else if (/\.(ts|tsx)$/.test(ad)) tum.push(y.split(String.fromCharCode(92)).join("/"));
    }
  };
  gez("src");
  /* Ölçüt YAZMA çağrısına bağlı: `type: "PURCHASE_IN"` okuma süzgeçlerinde de
     geçiyor (ilk yazımda 3 okuyucu yanlış suçlandı). */
  const yazanlar = tum.filter((y) => /\.stockMovement\.(create|createMany)\(\{[\s\S]{0,400}type: "PURCHASE_IN"/.test(yorumsuz(kaynakOku(y))));
  kontrol(`PURCHASE_IN yazan dosya tabanı DOLU (${yazanlar.length})`, yazanlar.length >= 1, yazanlar);
  const govdesiz = yazanlar.filter((y) => !/inisMaliyetleri\(/.test(yorumsuz(kaynakOku(y))));
  kontrol("HER yazan iniş maliyetini ortak gövdeden alıyor", govdesiz.length === 0, govdesiz);
  const mk = yorumsuz(kaynakOku("src/app/alimlar/[id]/mal-kabul/actions.ts"));
  kontrol("mal kabul hareketine İNİŞ maliyeti yazılıyor (fatura fiyatı değil)", /type: "PURCHASE_IN",[\s\S]{0,300}unitCostAmount: hareketMaliyeti\(kalem\),/.test(mk));
  const srv = yorumsuz(kaynakOku("src/app/alimlar/actions.ts"));
  kontrol("alım düzenlemede defter damgası İNİŞ maliyetiyle kıyaslanır ve onunla yazılır", /Number\(defterdeki\.unitCostAmount\.toString\(\)\) !== yeniMaliyet/.test(srv) && /unitCostAmount: String\(yeniMaliyet\),/.test(srv));
}
kosanBolumler.push("desen");

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
