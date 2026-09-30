import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { acikCikislar } from "../src/lib/kalem-maliyeti";
import {
  IADE_GECERLI,
  iadeGecerliMi,
  iadeGeriAlmaImzasi,
  iadeGeriAlmaPlani,
  type IadeHareketi,
} from "../src/lib/iade-geri-alma";
import { kaynakOku } from "./kaynak-oku";

/**
 * ============================================================================
 *  GERİ ALINMIŞ İADE HİÇBİR RAKAMA KARIŞMAZ (K44 · 2. adım)
 *      npm run iade-gecerli:dogrula
 * ----------------------------------------------------------------------------
 *  ① KURAL — saf planlayıcı çağrılır: ters hareketlerin yönü/partisi/bağı,
 *     üç kilit, neden şartı; ve tasarımın dayandığı iddia DEĞERLE sınanır:
 *     değişim çıkışı ile ters girişi birbirini kapatır, satışın asıl çıkışı
 *     AÇIK kalır (`acikCikislar`) — sonraki iade doğru hesaplansın.
 *  ② DESEN — iade/iade kalemi okuyan HER sorgu `IADE_GECERLI` taşır ya da
 *     `IADE_SUZGECI MUAF: <gerekçe>` beyan eder. Dosya listesi TUTULMAZ, `src/`
 *     taranır; ölçüt DOSYAYA değil SORGU BLOĞUNA bağlı (kalem süzgeci dersi:
 *     aynı dosyada iki sorgu varken birinin süzgecini silen mutasyon kaçmıştı).
 *  ③ YAZIM — şartlı geri alma, imza, bildirim, satış kârı, dönem kapısı.
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
/** Yorumu BOŞLUĞA çevirir, satır sonlarını KORUR — konum ve satır numarası kaymaz. */
const bosalt = (x: string) => x.replace(/[^\n]/g, " ");
const yorumsuz = (m: string) =>
  m.replace(/\{\/\*[\s\S]*?\*\/\}/g, bosalt).replace(/\/\*[\s\S]*?\*\//g, bosalt).replace(/(^|[^:"'`])\/\/[^\n]*/g, (x, a) => a + " ".repeat(x.length - a.length));

console.log("=".repeat(70));
console.log("GEÇERLİ İADE BEKÇİSİ (K44 ②)");
console.log("=".repeat(70));

console.log("\n1) kural — değerle");
{
  kontrol("süzgeç tek alana bakar: geriAlindiAt = null", JSON.stringify(IADE_GECERLI) === '{"geriAlindiAt":null}');
  kontrol("geçerli iade sayılır, geri alınmış sayılmaz", iadeGecerliMi({ geriAlindiAt: null }) && !iadeGecerliMi({ geriAlindiAt: new Date() }));

  const h = (o: Partial<IadeHareketi>): IadeHareketi => ({
    hareketId: "h1", variantId: "A", returnItemId: "r1", quantityDelta: 1, kalanAdet: 1,
    birimMaliyet: "100", birimMaliyetParaBirimi: "TRY", locationId: "L1", saleItemId: null, ...o,
  });
  const temel = { geriAlindiMi: false, tazminatSayisi: 0, neden: "YANLIS_GIRIS" as const, not: null };

  const p1 = iadeGeriAlmaPlani({ ...temel, hareketler: [h({ quantityDelta: 2, kalanAdet: 2 })] });
  kontrol(
    "stoğa GİREN mal aynı partiden aynı maliyetle ters çıkar",
    p1.olur && p1.hareketler.length === 1 && p1.hareketler[0].quantityDelta === -2 && p1.hareketler[0].sourceMovementId === "h1" && p1.hareketler[0].birimMaliyet === "100",
    p1,
  );
  const p2 = iadeGeriAlmaPlani({ ...temel, hareketler: [h({ quantityDelta: 2, kalanAdet: 1 })] });
  kontrol("giriş partisi kısmen tükenmişse GERİ ALINMAZ (hayalet adet olmaz)", !p2.olur && p2.engel === "PARTI_TUKENMIS" && p2.tukenenVaryantlar?.[0] === "A", p2);
  const p3 = iadeGeriAlmaPlani({ ...temel, hareketler: [h({ hareketId: "x", variantId: "B", quantityDelta: -1, kalanAdet: 0, saleItemId: "s1" })] });
  kontrol(
    "stoktan ÇIKAN değişim ürünü yeni parti olarak geri girer (kaynak bağı YOK, satış bağı KORUNUR)",
    p3.olur && p3.hareketler[0].quantityDelta === 1 && p3.hareketler[0].sourceMovementId === null && p3.hareketler[0].saleItemId === "s1" && p3.satisKariTazelenir,
    p3,
  );
  kontrol("  ...ÇIKIŞIN kalan adedi kilidi TETİKLEMEZ (kilit yalnız girişe)", p3.olur);
  const p4 = iadeGeriAlmaPlani({ ...temel, hareketler: [h({})] });
  kontrol("satış bağı yoksa satış kârı tazelenmez", p4.olur && !p4.satisKariTazelenir, p4);
  kontrol("zaten geri alınmış → ZATEN", (() => { const p = iadeGeriAlmaPlani({ ...temel, geriAlindiMi: true, hareketler: [] }); return !p.olur && p.engel === "ZATEN_GERI_ALINDI"; })());
  kontrol("tazminat açılmışsa → TAZMINAT_VAR", (() => { const p = iadeGeriAlmaPlani({ ...temel, tazminatSayisi: 1, hareketler: [] }); return !p.olur && p.engel === "TAZMINAT_VAR"; })());
  kontrol("neden yoksa → NEDEN_YOK", (() => { const p = iadeGeriAlmaPlani({ ...temel, neden: null, hareketler: [] }); return !p.olur && p.engel === "NEDEN_YOK"; })());
  kontrol("«diğer» açıklamasızsa → ACIKLAMA_YOK", (() => { const p = iadeGeriAlmaPlani({ ...temel, neden: "DIGER", not: "  ", hareketler: [] }); return !p.olur && p.engel === "ACIKLAMA_YOK"; })());
  kontrol("«diğer» açıklamalı → olur", iadeGeriAlmaPlani({ ...temel, neden: "DIGER", not: "müşteri başka ürün yolladı", hareketler: [] }).olur);
  kontrol("stok yazmamış (tarihsel) iade → olur, ters hareket YOK", (() => { const p = iadeGeriAlmaPlani({ ...temel, hareketler: [] }); return p.olur && p.hareketler.length === 0; })());
  kontrol(
    "imza plan değişince DEĞİŞİR (onay gösterilene verilir)",
    iadeGeriAlmaImzasi(p1) !== iadeGeriAlmaImzasi(iadeGeriAlmaPlani({ ...temel, hareketler: [h({ quantityDelta: 2, kalanAdet: 2, birimMaliyet: "90" })] })),
  );

  /** Tasarım iddiası: değişim çıkışı + ters giriş kapanır, satışın asıl çıkışı AÇIK kalır. */
  const kalemHareketleri = [
    { quantityDelta: -1, birimMaliyet: "100", birimMaliyetParaBirimi: null },
    { quantityDelta: -1, birimMaliyet: "90", birimMaliyetParaBirimi: null },
    { quantityDelta: 1, birimMaliyet: "90", birimMaliyetParaBirimi: null },
  ];
  const acik = acikCikislar(kalemHareketleri);
  kontrol("değişim geri alınınca satışın ASIL çıkışı açık kalır (sonraki iade doğru)", acik.length === 1 && acik[0].adet === 1 && acik[0] === acik.find((x) => x.quantityDelta === -1), acik);
}
kosanBolumler.push("kural");

console.log("\n2) desen — iade okuyan her sorgu süzgeçli ya da beyanlı");
{
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
  const blokSonu = (s: string, acilis: number) => {
    let d = 0;
    for (let i = acilis; i < s.length; i++) {
      if (s[i] === "{") d++;
      else if (s[i] === "}" && --d === 0) return i + 1;
    }
    return s.length;
  };
  type Bulgu = { yer: string; tamam: boolean };
  const bulgular: Bulgu[] = [];
  const KUME = "findMany|findFirst|findFirstOrThrow|count|aggregate|groupBy|updateMany|deleteMany";
  for (const yol of tum) {
    if (yol === "src/lib/iade-geri-alma.ts") continue;
    const ham = kaynakOku(yol);
    const kod = yorumsuz(ham);
    const satir = (i: number) => kod.slice(0, i).split("\n").length;
    /** Beyan sorgunun İÇİNDE ya da hemen ÜSTÜNDEKİ yorumda (400 karakter). */
    /** Gerekçe en az ~10 karakter — «MUAF: x» gibi boş beyan muafiyet sayılmaz. */
    const beyanli = (bas: number, son: number) => /IADE_SUZGECI MUAF:\s*\S.{9,}/.test(ham.slice(Math.max(0, bas - 400), son));
    // ① doğrudan sorgu: prisma.return.* / returnItem.*
    for (const m of kod.matchAll(new RegExp(`\\b(return|returnItem)\\.(${KUME})\\(`, "g"))) {
      const ac = kod.indexOf("(", m.index);
      const kapaParantez = kod.indexOf(")", ac);
      const suslu = kod.indexOf("{", ac);
      const blokVar = suslu !== -1 && suslu < kapaParantez;
      const son = blokVar ? blokSonu(kod, suslu) : kapaParantez;
      const blok = kod.slice(ac, son);
      /** Tekil hedef (kimlikle updateMany) küme seçmez — «geri alınmışı ele» sorusu yok. */
      const tekil = /updateMany|deleteMany/.test(m[2]) && /where:\s*\{\s*id:/.test(blok);
      bulgular.push({ yer: `${yol}:${satir(m.index)} ${m[1]}.${m[2]}`, tamam: tekil || /IADE_GECERLI/.test(blok) || beyanli(m.index, son) });
    }
    // ② ilişki: returns: {…} · returnItems: {…}
    for (const m of kod.matchAll(/\b(returns|returnItems)\s*:\s*\{/g)) {
      const suslu = kod.indexOf("{", m.index);
      const son = blokSonu(kod, suslu);
      const blok = kod.slice(suslu, son);
      /** `_count: { select: { returns: true } }` gibi sayaçlar da ilişki okur — aynı kural. */
      bulgular.push({ yer: `${yol}:${satir(m.index)} ${m[1]}`, tamam: /IADE_GECERLI/.test(blok) || beyanli(m.index, son) });
    }
  }
  kontrol(`iade okuyan sorgu tabanı DOLU (${bulgular.length})`, bulgular.length >= 20, bulgular.length);
  const eksik = bulgular.filter((b) => !b.tamam).map((b) => b.yer);
  kontrol("HER iade sorgusu süzgeçli ya da gerekçesiyle beyanlı", eksik.length === 0, eksik);
}
kosanBolumler.push("desen");

console.log("\n3) yazım — lib/iade-geri-alma-veri.ts");
{
  const v = yorumsuz(kaynakOku("src/lib/iade-geri-alma-veri.ts"));
  kontrol("imza tutmazsa YAZILMAZ", /if \(iadeGeriAlmaImzasi\(plan\) !== girdi\.onaylananImza\) return \{ durum: "PLAN_DEGISTI" as const \};/.test(v));
  kontrol("şartlı: ancak hâlâ geri alınmamışsa işaretler", /tx\.return\.updateMany\(\{\s*where: \{ id: o\.id, geriAlindiAt: null \}/.test(v) && /if \(r\.count !== 1\) return \{ durum: "YARISTI" as const \};/.test(v));
  kontrol("ters hareket ADJUSTMENT ve iadeye bağlı (fire raporu dışlar)", /type: "ADJUSTMENT",\s*quantityDelta: h\.quantityDelta,[\s\S]{0,80}returnItemId: h\.returnItemId,\s*saleItemId: h\.saleItemId,\s*sourceMovementId: h\.sourceMovementId,/.test(v));
  kontrol("dönem kapısı iade GÜNÜNE sorulur", /donemKapisi\(tx, o\.occurredAt, girdi\.donemIsrari\)/.test(v));
  kontrol("bildirim yeniden açılır (iade yeniden girilebilsin)", /tx\.returnNotice\.updateMany\(\{\s*where: \{ returnId: o\.id \},\s*data: \{ returnId: null,/.test(v));
  kontrol("değişim döndüyse satış kârı işlemden SONRA tazelenir", /sonuc\.satisKariTazelenir \? await satisKarTazele\(sonuc\.saleId\) : null/.test(v));
  const b = yorumsuz(kaynakOku("src/components/iade-blogu.tsx"));
  kontrol("iade kartında «geri al» izinle görünür", /\{duzenlenebilir \? <IadeGeriAl returnId=\{iade\.id\} \/> : null\}/.test(b));
  kontrol("geri alınanlar kartta İZ olarak kalır", /geriAlinanlar\.length > 0 \? \(/.test(b));
}
kosanBolumler.push("yazım");

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
