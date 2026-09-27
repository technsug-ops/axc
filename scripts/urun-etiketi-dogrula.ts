import { createRequire } from "node:module";

import { kaynakOku } from "./kaynak-oku";
import { code128B, code128Genisligi } from "../src/lib/depo/code128";
import { adSatirlari, ETIKET_OLCULERI, KAREKODLU_OLCULER, olcuCoz, urunEtiketiSvg, VARSAYILAN_OLCU, type EtiketOlcusu } from "../src/lib/urun-etiketi";

/**
 * ============================================================================
 *  ÜRÜN ETİKETİ BEKÇİSİ (K291) — `npm run urun-etiketi:dogrula`
 * ----------------------------------------------------------------------------
 *  ① KURAL — ad kısaltma, ölçü çözümü, basılamayan kod DEĞERLE.
 *  ② OKUNUR MU — etiket 203 dpi'de (XP-490B çözünürlüğü) resme çevrilir ve
 *     barkod, kameranın kullandığı kütüphaneyle (zxing-wasm) GERÇEKTEN okunur:
 *     «SVG'de barkod var» değil, «barkod okunuyor ve doğru kodu veriyor».
 *  ③ ZİNCİR — ekran izin, arama, ölçü adreste, her adet ayrı sayfa.
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

async function main() {
  console.log("=".repeat(70));
  console.log("ÜRÜN ETİKETİ (K291)");
  console.log("=".repeat(70));

  console.log("\n1) kural — değerle");
  {
    kontrol("kısa ad olduğu gibi", JSON.stringify(adSatirlari("Tefal Ütü", 20, 2)) === JSON.stringify(["Tefal Ütü"]));
    const uzun = adSatirlari("LEGO NINJAGO Zilvar ve Ejderha Canavarı Kanatlı Savaşçı", 20, 2);
    kontrol("uzun ad satır sayısını AŞMAZ ve «…» ile biter", uzun.length === 2 && uzun[1]!.endsWith("…") && uzun.every((s) => s.length <= 20), uzun);
    /* Sınırı GERÇEKTEN zorlayan örnek: beş parça, iki satır — üçüncü satır DÖNGÜ İÇİNDE doğar. */
    const zorlu = adSatirlari("a1234567 b1234567 c1234567 d1234567 e1234567", 8, 2);
    kontrol("çok parçalı adda da satır sınırı tutar", zorlu.length === 2 && zorlu[1]!.endsWith("…"), zorlu);
    kontrol("tek kelime satırdan uzunsa kırpılır", adSatirlari("Süperkalifragilistik", 8, 1)[0]!.length <= 8);
    /* Ölçüt güncellendi (K291-②, 27.09.2026): ilk hâlde varsayılan 100×100'dü. Kullanıcının
       ürün etiketi rulosu 40×30 (kullanıcı beyanı) → varsayılan o oldu. */
    kontrol("bilinmeyen ölçü → varsayılan (40×30)", olcuCoz("999x1") === VARSAYILAN_OLCU && olcuCoz(undefined) === "40x30");
    kontrol("Code128 B ile basılamayan kod BOŞ etiket değil «BASILAMADI»", (await urunEtiketiSvg("ÇÖK-1", "x", "50x30")).includes("BASILAMADI"));
    kontrol("etiket boyutu ölçüyle aynı (mm)", (await urunEtiketiSvg("A-1", "x", "100x150")).includes('width="100mm" height="150mm"'));
    kontrol("40×30 boyutu ölçüyle aynı (mm)", (await urunEtiketiSvg("A-1", "x", "40x30")).includes('width="40mm" height="30mm"'));
    /* 40×30 karekodlu: kod yazısı sağ sütuna SIĞAR (ilk taslakta «OYU-LEG» kenardan taşıyordu). */
    for (const kod of ["OYU-LEG-0001", "KAME-TPL-0031", "UZUNONEKLIKOD-1"]) {
      const svg = await urunEtiketiSvg(kod, "x", "40x30");
      const kalin = [...svg.matchAll(/<text x="([\d.]+)"[^>]*font-weight="bold" font-size="([\d.]+)"[^>]*>([^<]*)</g)];
      const tasma = kalin.map((m) => Number(m[1]) + Number(m[2]) * 0.62 * m[3]!.length).filter((sag) => sag > 40 - 1.5 + 1e-6);
      kontrol(`40×30 «${kod}» kod yazısı etikete sığıyor`, kalin.length >= 1 && tasma.length === 0, { satir: kalin.length, tasma });
    }
    /* Sessiz bölge: barkodun sol kenarı ≥ 10 modül (çizgi barkodlu ölçüler). */
    for (const o of (Object.keys(ETIKET_OLCULERI) as EtiketOlcusu[]).filter((x) => !KAREKODLU_OLCULER.includes(x))) {
      const svg = await urunEtiketiSvg("KUC-KRC-0112", "x", o);
      const sol = Number(svg.match(/<g transform="translate\(([\d.]+) /)?.[1]);
      const M = code128Genisligi((code128B("KUC-KRC-0112") as { moduller: number[] }).moduller);
      const en = ETIKET_OLCULERI[o].en;
      const modul = (en - 2 * sol) / M;
      kontrol(`${o}: sessiz bölge ≥ 10 modül`, sol >= 10 * modul - 1e-6, { sol, modul });
    }
  }
  kosanBolumler.push("kural");

  console.log("\n2) okunur mu — 203 dpi resim + zxing");
  {
    const req = createRequire(process.cwd() + "/package.json");
    const sharp = req("sharp") as (b: Buffer, o: { density: number }) => { flatten: (o: object) => { png: () => { toBuffer: () => Promise<Buffer> } } };
    const { readBarcodes } = req("zxing-wasm/reader") as { readBarcodes: (b: Blob, o: object) => Promise<{ text: string; isValid: boolean }[]> };
    for (const o of Object.keys(ETIKET_OLCULERI) as EtiketOlcusu[]) {
      for (const kod of ["OYU-LEG-0001", "KAME-TPL-0031"]) {
        const png = await sharp(Buffer.from(await urunEtiketiSvg(kod, "Deneme ürün adı uzun bir ad", o)), { density: 203 }).flatten({ background: "#fff" }).png().toBuffer();
        /* 40×30 KAREKOD — biçim o ölçü için QRCode'a kilitli: çizgi barkoda dönerse kırmızı. */
        const bicim = KAREKODLU_OLCULER.includes(o) ? "QRCode" : "Code128";
        const r = await readBarcodes(new Blob([new Uint8Array(png)]), { formats: [bicim], tryHarder: false });
        kontrol(`${o} (${bicim}) «${kod}» okunuyor ve AYNI kodu veriyor`, r.length === 1 && r[0]!.isValid && r[0]!.text === kod, r.map((x) => x.text));
      }
    }
  }
  kosanBolumler.push("okuma");

  console.log("\n3) zincir — ekran");
  {
    const s = oku("src/app/urunler/etiketler/page.tsx");
    kontrol("izin urun.gor + ortak arama (eski kod da bulur)", s.includes('await sayfaIzni("urun.gor");') && s.includes("OR: aramaKosulu(arama)"));
    kontrol("kod = Firma SKU, gövde ortak", s.includes("urunEtiketiSvg(v.companySku, ad, olcu)"));
    kontrol("ölçü aramada korunuyor", s.includes("tasinanlar={{ olcu }}"));
    const b = oku("src/app/urunler/etiketler/etiket-basici.tsx");
    kontrol("baskı sayfası = etiket ölçüsü", b.includes("@page { size: ${en}mm ${boy}mm; margin: 0; }"));
    kontrol("her adet AYRI sayfa", b.includes('breakAfter: "page"') && b.includes("Array.from({ length: adet[u.id] ?? 0 }"));
    kontrol("adet yokken yazdır kapalı", b.includes("disabled={toplam === 0}"));
  }
  kosanBolumler.push("zincir");

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
}

main().catch((e) => {
  console.error("BEKLENMEYEN HATA:", e);
  process.exitCode = 1;
});
