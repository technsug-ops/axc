import { kaynakOku } from "./kaynak-oku";
import { createTranslator } from "next-intl";

import tr from "../messages/tr.json";
import { giderAramaKosulu } from "../src/lib/gider-arama";
import { rafAramasi } from "../src/lib/raf-arama";

/**
 * ============================================================================
 *  LİSTE ARAMASI BEKÇİSİ (K289 · İlke #17) — `npm run liste-aramasi:dogrula`
 * ----------------------------------------------------------------------------
 *  Ölçülmüş büyüyen listeler (27.09.2026): Hakediş partileri 69 · Raflar 43 ·
 *  Giderler 24 · Tazminat 21. Her birinde ortak arama kutusu; giderlerde toplam
 *  ARAMAYLA değişir (İlke #15) ve Excel AYNI koşulu kullanır (sayı = liste);
 *  ay/kategori süzgeci aramayı SİLMEZ; hakediş parti araması SORGUDA (50 tavanı
 *  eski partiyi gizlemesin).
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
    if (gorulen !== undefined) console.log("        ", gorulen);
  }
}
const yorumsuz = (m: string) => m.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1");
const oku = (y: string) => yorumsuz(kaynakOku(y));

console.log("=".repeat(70));
console.log("LİSTE ARAMASI (K289)");
console.log("=".repeat(70));

console.log("\n1) gider arama koşulu — değerle");
{
  kontrol("boş arama → koşul yok", JSON.stringify(giderAramaKosulu("  ")) === "{}" && JSON.stringify(giderAramaKosulu(undefined)) === "{}");
  const k = JSON.stringify(giderAramaKosulu("kira"));
  kontrol("açıklama · kategori · şablon · kart aranıyor", ["description", "category", "template", "creditCard"].every((a) => k.includes(`"${a}"`)));
}
kosanBolumler.push("kural");

console.log("\n2) ekranlar");
{
  const raf = oku("src/app/ayarlar/konumlar/page.tsx");
  kontrol("Raflar: arama kutusu + liste aramadan", raf.includes('<KodAramaKutusu temelAdres="/ayarlar/konumlar"') && raf.includes("{gorunen.map((konum) => ("));
  kontrol("Raflar: liste gövdeden (rafAramasi), çıplak süzgeç yok", raf.includes("= rafAramasi(konumlar, arama);") && !raf.includes(".includes(kucuk(arama))"));
  kontrol("  ...tam eşleşmede «N raf daha» cümlesi çiziliyor", raf.includes('tamEslesme ? t("aramaTamEslesme", { q: arama, sayi: benzerSayisi })'));
  kontrol("  ...başlık sayısı TÜM raflar", raf.includes('t("tanimliRaflar", { sayi: konumlar.length })'));

  const gider = oku("src/app/giderler/page.tsx");
  kontrol("Giderler: arama SORGUDA → toplam şeridi aramaya göre (İlke #15)", gider.includes("...giderAramaKosulu(arama),"));
  kontrol("  ...arama kutusu ay/kategoriyi taşıyor", gider.includes('<KodAramaKutusu') && gider.includes("tasinanlar={{ ay: seciliAy || undefined, kategori: seciliKategori || undefined }}"));
  kontrol("  ...Excel aramayı taşıyor", gider.includes("parametreler={{ ay: seciliAy, kategori: seciliKategori, q: arama }}"));
  const liste = oku("src/lib/disa-aktarma/listeler.ts");
  kontrol("  ...Excel AYNI koşulla (sayı = liste)", liste.includes("...giderAramaKosulu(p.q),"));
  const filtre = oku("src/app/giderler/filtre.tsx");
  kontrol("  ...ay/kategori süzgeci aramayı SİLMİYOR", filtre.includes('if (arama) parametreler.set("q", arama);'));

  const taz = oku("src/app/tazminat/page.tsx");
  kontrol("Tazminat: arama kutusu + iki liste aramadan", taz.includes('<KodAramaKutusu temelAdres="/tazminat"') && taz.includes("{gorunenBekleyen.map((h) => (") && taz.includes("{gorunenTalep.map((k) => ("));
  kontrol("  ...boş arama «hiç kayıt yok» DEMİYOR", taz.includes("arama && gorunenBekleyen.length === 0 ?") && taz.includes("arama && gorunenTalep.length === 0 ?"));

  const hak = oku("src/app/hakedis/page.tsx");
  kontrol("Hakediş: parti araması SORGUDA (50 tavanının dışı da bulunur)", hak.includes("where: { ...kanalKosulu, ...partiAramaKosulu(sp.pq) },"));
  kontrol("  ...ayrı parametre (ödeme araması `q` ile çakışmıyor)", hak.includes('parametre="pq"') && hak.includes("tasinanlar={sp}"));
}
kosanBolumler.push("ekran");

console.log("\n3) raf araması — değerle (K289-③: «A1 yazınca A11, A12 de geliyor»)");
{
  const raflar = [
    { code: "A1", name: null },
    { code: "A11", name: null },
    { code: "A12", name: "a1 yanı" },
    { code: "B2", name: "koridor a1 karşısı" },
    { code: "C3", name: null },
  ];
  const kodlar = (x: { gorunen: { code: string }[] }) => x.gorunen.map((k) => k.code).join(",");
  const a1 = rafAramasi(raflar, "A1");
  kontrol("«A1» → YALNIZ A1 (birebir kod)", kodlar(a1) === "A1" && a1.tamEslesme, kodlar(a1));
  kontrol("  ...içinde geçen öteki 3 raf SAYILIYOR (A11 · A12 · B2)", a1.benzerSayisi === 3, a1.benzerSayisi);
  kontrol("«a1» küçük harfle de birebir", kodlar(rafAramasi(raflar, " a1 ")) === "A1");
  const a = rafAramasi(raflar, "A");
  kontrol("«A» (birebir raf yok) → içinde geçenlerin hepsi, tam eşleşme DEĞİL", !a.tamEslesme && a.gorunen.length === 4 && a.benzerSayisi === 0, kodlar(a));
  const ad = rafAramasi(raflar, "koridor");
  kontrol("adla arama sürüyor", kodlar(ad) === "B2" && !ad.tamEslesme);
  kontrol("boş arama → hepsi", rafAramasi(raflar, "  ").gorunen.length === raflar.length);
  const t = createTranslator({ locale: "tr", messages: tr as never, namespace: "Raf" as never }) as unknown as (k: string, v: object) => string;
  const iki = t("aramaTamEslesme", { q: "A1", sayi: 2 });
  const sifir = t("aramaTamEslesme", { q: "A1", sayi: 0 });
  kontrol("cümle: benzer varsa sayısını söylüyor", iki.includes("2 raf daha"), iki);
  kontrol("cümle: benzer yoksa «0 raf daha» DEMİYOR", sifir.includes("birebir") && !sifir.includes("raf daha"), sifir);
}
kosanBolumler.push("raf");

console.log("\n" + "=".repeat(70));
if (kosanBolumler.length !== BOLUM_SAYISI) {
  console.log(`KOŞUM YARIM KALDI — sonuç GEÇERSİZ (${kosanBolumler.length}/${BOLUM_SAYISI})`);
  process.exit(1);
} else if (kalan === 0) {
  console.log(`TÜM KONTROLLER GEÇTİ (${gecen})`);
} else {
  console.log(`${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrolden)`);
  process.exit(1);
}
