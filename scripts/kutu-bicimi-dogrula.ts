import { kaynakOku } from "./kaynak-oku";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { KUTU_ETIKETI, KUTU_RAKAMI, SECIM_AKTIF, SECIM_PASIF, SEKME_SERIDI, sekmeSayaciSinifi, sekmeSinifi } from "../src/lib/kutu-bicimi";
import { DURUM_KUTUSU, DURUM_SERIDI } from "../src/lib/renkler";

/**
 * ============================================================================
 *  KUTU BİÇİMİ BEKÇİSİ (K330-③, 10.10.2026) — `npm run kutu-bicimi:dogrula`
 * ----------------------------------------------------------------------------
 *  Kullanıcı kararı 10.10.2026: «sistemdeki bütün kutular» tek kart tasarımında.
 *  ① TEMA — kutu kalıplarını yakalayan kurallar yerinde (küçük köşeli kutu ·
 *     gri dolgulu kutu · kart başlığı); gri dolgu kuralı KATMANSIZ (yoksa
 *     `bg-*` aracı kazanır).
 *  ② ORTAK YAZI — ekranların kendi kutuları etiket/rakam yazısını tek
 *     kaynaktan (`kutu-bicimi.ts`) okur; eski `text-xs` etiket / `font-semibold`
 *     rakam geri dönmez.
 * ============================================================================
 */

let gecen = 0;
let kalan = 0;
const kosanBolumler: string[] = [];
const BOLUM_SAYISI = 2;

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
const yorumsuzCss = (m: string) => m.replace(/\/\*[\s\S]*?\*\//g, " ");
const yorumsuz = (m: string) => m.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1");

console.log("=".repeat(70));
console.log("KUTU BICIMI (K330-3, 10.10.2026)");
console.log("=".repeat(70));

/* ① TEMA */
{
  const css = yorumsuzCss(kaynakOku("src/app/globals.css"));
  const katmanBasi = css.indexOf("@layer components {", css.indexOf(".rounded-md.border:is(.p-3, .p-4, .p-5, .p-6)") - 400);
  kontrol(
    "küçük köşeli KUTU (p-3 ve üstü) kart olur",
    /:where\(div, section, article, aside, details, li, dl\)\.rounded-md\.border:is\(\.p-3, \.p-4, \.p-5, \.p-6\):not\(\.border-dashed\) \{\s*border-radius: var\(--radius\);\s*border-color: var\(--se-kart-cizgi, transparent\);\s*box-shadow: var\(--se-golge-1\);\s*background-color: var\(--card\);/.test(css),
  );
  kontrol("  ...çip/etiket boyu (px-2) kapsam DIŞINDA", !/\.rounded-md\.border:is\([^)]*\.px-2/.test(css));
  // 30.10.2026: iç kutu çizgisi kişisel temanın «Kart çizgisi» ayarına bağlandı (`--se-ic-kart-cizgi`, tanımsızsa `--se-cizgi`).
  kontrol("  ...kart içindeki kutu gölge almaz", /\.rounded-md\.border:is\(\.p-3, \.p-4, \.p-5, \.p-6\):not\(\.border-dashed\) \{\s*border-color: var\(--se-ic-kart-cizgi, var\(--se-cizgi\)\);\s*box-shadow: none;/.test(css));
  kontrol("  ...kural components katmanında", katmanBasi >= 0);
  const griBas = css.indexOf(".bg-muted\\/40 {");
  kontrol("gri dolgulu kutu beyaz zemin alır", griBas >= 0 && /\.border:is\(\.rounded-lg, \.rounded-md\)\.bg-muted\\\/40 \{\s*background-color: var\(--card\);/.test(css));
  /* Katmansız mı: kuralın SEÇİCİSİNİN başladığı yerde süslü parantez derinliği 0 olmalı
     (hiçbir @layer/@media bloğunun içinde değil). İlk yazım satır başı «}» sayıyordu ve
     kural katmana alınınca YEŞİL kaldı — mutasyon yakaladı. */
  const seciciBas = css.lastIndexOf(":where(", griBas);
  const once = css.slice(0, seciciBas);
  const derinlik = (once.match(/\{/g) ?? []).length - (once.match(/\}/g) ?? []).length;
  kontrol("  ...gri dolgu kuralı KATMANSIZ (bg-* aracını ezer)", griBas >= 0 && seciciBas >= 0 && derinlik === 0, { derinlik });
  kontrol("bağlantı biçimindeki kutu da kart olur", /a\.rounded-lg\.border:not\(\.border-dashed\) \{\s*border-color: var\(--se-kart-cizgi, transparent\);\s*box-shadow: var\(--se-golge-1\);\s*background-color: var\(--card\);/.test(css));
  kontrol("  ...kart içindeki bağlantı kutusu gölge almaz", /a\.rounded-lg\.border:not\(\.border-dashed\) \{\s*border-color: var\(--se-ic-kart-cizgi, var\(--se-cizgi\)\);\s*box-shadow: none;/.test(css));
  {
    /* Kart başlığı kuralı KATMANDA olmalı: ekranın verdiği boyut (rakam kutusu etiketi) kazansın.
       Katmansız yazıldığında küçük etiketleri 16 px'e çıkarıyordu (Paket C'de görüldü, 10.10.2026). */
    /* ⚠ ÖNCE DESEN SAYILDI: `[data-slot="card-title"] {` dosyada İKİ kez geçiyor (h1/h2 harf
       aralığı kuralı da aynı seçiciyi taşıyor) — çapa boyut satırına bağlandı. */
    const baslikBas = css.search(/\[data-slot="card-title"\] \{\s*font-size: 1rem;/);
    const once2 = baslikBas >= 0 ? css.slice(0, baslikBas) : "";
    const derinlik2 = (once2.match(/\{/g) ?? []).length - (once2.match(/\}/g) ?? []).length;
    kontrol("kart başlığı kuralı KATMANDA (ekranın verdiği boyut kazanır)", baslikBas >= 0 && derinlik2 === 1 && /@layer components \{\s*$/.test(once2), { derinlik2 });
  }
  kontrol("boş-durum kutusu (kesikli, ortalı, geniş) beyaz kart", /:where\(div, section\)\.border-dashed\.text-center:is\(\.p-6, \.p-8, \.p-10\) \{\s*border-style: solid;\s*border-color: var\(--se-kart-cizgi, transparent\);\s*box-shadow: var\(--se-golge-1\);/.test(css));
  kontrol("kart dışındaki tablo beyaz kart", /\[data-slot="table-container"\] \{\s*background-color: var\(--card\);\s*border-radius: var\(--radius\);\s*box-shadow: var\(--se-golge-1\);/.test(css));
  kontrol("kart başlığı 16 px / 600", /\[data-slot="card-title"\] \{\s*font-size: 1rem;\s*line-height: 1\.5rem;\s*font-weight: 600;/.test(css));
  kontrol("liste kartı tema kuralına girer (rounded-lg border)", /className="bg-card min-w-0 space-y-2\.5 rounded-lg border p-3"/.test(kaynakOku("src/components/liste-karti.tsx")));
  kosanBolumler.push("tema");
}

/* ② ORTAK YAZI */
{
  kontrol("ortak etiket 13 px orta kalın", KUTU_ETIKETI === "text-muted-foreground text-[13px] font-medium");
  kontrol("ortak rakam kalın + sabit genişlik", KUTU_RAKAMI === "font-bold tabular-nums");
  const kutular: [string, string, string][] = [
    ["nakit özeti", "src/app/nakit-ozeti.tsx", "function Kutu("],
    ["nakit takvimi", "src/app/nakit-takvimi/page.tsx", "function Kutu("],
    ["hakediş", "src/app/hakedis/page.tsx", "function OzetKutusu("],
    ["iadeler", "src/app/iadeler/page.tsx", "function Ozet("],
    ["kanal listeleme", "src/app/kanal-listeleme/page.tsx", "function Kutu("],
    ["kârlılık kartı", "src/app/kart/[variantId]/page.tsx", "function Kutu("],
  ];
  for (const [ad, yol, capa] of kutular) {
    const m = yorumsuz(kaynakOku(yol));
    const bas = m.indexOf(capa);
    const son = bas >= 0 ? m.indexOf("\nfunction ", bas + capa.length) : -1;
    const blok = bas >= 0 ? m.slice(bas, son > bas ? son : bas + 2500) : "";
    kontrol(`${ad}: kutu bulundu`, blok.length > 100);
    kontrol(`${ad}: etiket ortak biçimden`, /className=\{KUTU_ETIKETI\}/.test(blok));
    kontrol(`${ad}: rakam ortak biçimden`, /\$\{KUTU_RAKAMI\}/.test(blok));
    kontrol(`${ad}: eski küçük etiket geri dönmedi`, !/className="text-muted-foreground text-xs">\{(etiket|baslik)\}/.test(blok));
    kontrol(`${ad}: rakam yarı kalına geri dönmedi`, !/(text-2xl|leading-tight) font-semibold/.test(blok));
  }
  /* K330-③ — durum kutusu (sarı/kırmızı/yeşil kart) beyaz + sol şerit (kullanıcı kararı 10.10.2026). */
  for (const d of ["uyari", "olumsuz", "olumlu", "bilgi"] as const) {
    kontrol(`durum kutusu (${d}) şeritli`, DURUM_KUTUSU[d].includes(DURUM_SERIDI[d]));
    kontrol(`  ...(${d}) beyaz zemin, pastel dolgu YOK`, DURUM_KUTUSU[d].includes("bg-card") && !/(^| )bg-\[#/.test(DURUM_KUTUSU[d]));
  }
  {
    /* 30.10.2026 kullanıcı kararı: alt çizgili sekme «ilkel» bulundu → ray içinde hap sekme. Eski ölçüt
       (border-b-2 + vurgu çizgisi) bu kararla eskidi; korunan öz: aktif VURGU renginde yazı, siyah/aksan DOLGU yok. */
    kontrol("sekme hap biçiminde, aktif beyaz + gölge + vurgu yazı", sekmeSinifi(true).includes("rounded-lg") && sekmeSinifi(true).includes("bg-background") && sekmeSinifi(true).includes("shadow-sm") && sekmeSinifi(true).includes("text-[var(--se-vurgu)]") && !sekmeSinifi(true).includes("bg-primary"));
    kontrol("  ...pasif sekme gölgesiz ve dolgusuz", !sekmeSinifi(false).includes("shadow-sm") && !/(^| )bg-background( |$)/.test(sekmeSinifi(false)));
    kontrol("  ...telefonda 44 px, masaüstünde 36 px", sekmeSinifi(true).includes("h-11") && sekmeSinifi(true).includes("md:h-9"));
    kontrol("sekme sayısı rozette; aktif rozet vurgu tonunda", sekmeSayaciSinifi(true).includes("rounded-full") && sekmeSayaciSinifi(true).includes("text-[var(--se-vurgu)]") && !sekmeSayaciSinifi(false).includes("se-vurgu"));
    kontrol("sekme şeridi gri ray", SEKME_SERIDI.includes("bg-muted") && SEKME_SERIDI.includes("rounded-xl"));
    /* 30.10.2026 kullanıcı kararı: seçim çipleri (dönem · kanal · süzgeç) sekmelerle aynı dilde — aktif koyu DOLGU yok,
       vurgu tonunda açık zemin; pasif beyaz + çerçeve + gölge. DESEN YASAĞI: eski koyu dolgu kalıbı hiçbir ekranda kalamaz
       (dosya listesi tutulmaz — yarın eklenen ekran da taranır). Taban doluluğu ayrıca ölçülür. */
    kontrol("seçim çipi aktif: vurgu zemin + vurgu yazı, koyu dolgu yok", SECIM_AKTIF.includes("bg-[var(--se-vurgu-bg)]") && SECIM_AKTIF.includes("text-[var(--se-vurgu)]") && !SECIM_AKTIF.includes("bg-primary"));
    kontrol("  ...pasif çip beyaz + çerçeve + gölge", SECIM_PASIF.includes("bg-background") && SECIM_PASIF.includes("border-border") && SECIM_PASIF.includes("shadow-xs"));
    const tsxler: string[] = [];
    const gez = (k: string) => {
      for (const ad of readdirSync(k)) {
        const y = join(k, ad);
        if (statSync(y).isDirectory()) gez(y);
        else if (y.endsWith(".tsx")) tsxler.push(y.split("\\").join("/"));
      }
    };
    gez("src");
    const eskiCip = tsxler.filter((y) => yorumsuz(kaynakOku(y)).includes("bg-primary text-primary-foreground border-primary"));
    kontrol("eski koyu dolgulu seçim çipi hiçbir ekranda yok", eskiCip.length === 0, eskiCip);
    const cipKullanan = tsxler.filter((y) => /\?\s*SECIM_AKTIF\s*:\s*SECIM_PASIF/.test(yorumsuz(kaynakOku(y))));
    kontrol("  ...ortak çip biçimini kullanan ekran ≥ 11 (taban dolu)", tsxler.length > 100 && cipKullanan.length >= 11, cipKullanan.length);
    kontrol("sekme şeridi tek satır kayar", SEKME_SERIDI.includes("overflow-x-auto") && !SEKME_SERIDI.includes("flex-wrap"));
    for (const [ad, yol] of [["ortak sekme bileşeni", "src/components/sekmeli-bolum.tsx"], ["ürün analizi", "src/app/rapor/urunler/page.tsx"], ["kârlılık kartı", "src/app/kart/[variantId]/kart-panosu.tsx"]] as const) {
      kontrol(`${ad} ortak sekme biçimini kullanır`, /className=\{sekmeSinifi\(/.test(yorumsuz(kaynakOku(yol))));
    }
  }
  kosanBolumler.push("yazi");
}

console.log("=".repeat(70));
if (kosanBolumler.length !== BOLUM_SAYISI) {
  console.log(`KOŞUM YARIM KALDI (${kosanBolumler.length}/${BOLUM_SAYISI}) — sonuç GEÇERSİZ`);
  process.exit(1);
}
if (kalan === 0) console.log(`TÜM KONTROLLER GEÇTİ (${gecen})`);
else {
  console.log(`${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrol içinde)`);
  process.exitCode = 1;
}
