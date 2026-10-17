import { isValidElement, type ReactElement } from "react";

import { NoktaSeritleri } from "../src/components/grafik-nokta-seritleri";
import {
  GRAFIK_KUTUSU as G,
  ETIKET_ALT_SINIRI,
  ETIKET_SATIR_ARALIGI,
  noktaEtiketHizasi,
  noktaEtiketleri,
} from "../src/components/grafik-olcek";
import { kaynakOku } from "./kaynak-oku";
import { grafikNoktasiSatisAdresi, pencereCoz, satisKosulu, satisListesiParametreleri } from "../src/lib/liste-suzgeci";

/**
 * ============================================================================
 *  GRAFİK NOKTA PENCERESİ BEKÇİSİ (K109) — `npm run grafik-nokta:dogrula`
 * ----------------------------------------------------------------------------
 *  ① ŞERİT — gövde çağrılır: dokunma şeritleri iç alanı BOŞLUKSUZ ve
 *     ÖRTÜŞMESİZ kaplar, boş (null) nokta şerit almaz, `data-nokta` noktanın
 *     KENDİ sırasını taşır (boş ay atlanınca kaymaz).
 *  ② BAĞ — iki grafik sarmalayıcıyla sarılı, şeritler SVG'nin EN ÜSTÜNDE
 *     (sonra çizilen bir katman dokunmayı yutar), pencere metni sunucuda
 *     biçimleniyor, boş ay pencere açmıyor.
 *  ③ RAKAM KONUMU (03.10.2026) — gövde çağrılır: NET-2 rakamı ay satırına
 *     İNMEZ, ciro rakamı NET-2'nin ÜSTÜNDE kalır, uç noktalar içe yaslanır.
 *  ④ ÜSTÜNE GELME + KAYNAK (K344) — fareyle geçici açılış, tıklamayla sabit;
 *     kart · stok · karşılaştırma grafikleri AYRI AYRI bağlı; adres ve ürün
 *     süzgeci gövde ÇAĞRILARAK sınanır (sayı = liste).
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
const yorumsuz = (m: string) => m.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\{\/\*[\s\S]*?\*\/\}/g, " ").replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1");

type Serit = { i: number; sol: number; sag: number };
/** Gövdenin döndürdüğü ağaçtan şerit dikdörtgenlerini çıkarır. */
function seritler(noktalar: ({ x: number; y: number } | null)[]): Serit[] {
  const kok = NoktaSeritleri({ noktalar }) as ReactElement<{ children: ReactElement<{ children: ReactElement[] }>[] }>;
  const sonuc: Serit[] = [];
  for (const g of kok.props.children) {
    if (!isValidElement(g)) continue;
    for (const c of g.props.children) {
      const p = c.props as Record<string, unknown>;
      if (c.type === "rect") {
        const x = Number(p.x);
        sonuc.push({ i: Number(p["data-nokta"]), sol: x, sag: x + Number(p.width) });
      }
    }
  }
  return sonuc;
}

console.log("=".repeat(70));
console.log("GRAFİK NOKTA PENCERESİ BEKÇİSİ (K109)");
console.log("=".repeat(70));

console.log("\n1) şerit — gövde çağrılır");
{
  const x = (i: number, n: number) => G.sol + (i * (G.genislik - G.sol - G.sag)) / (n - 1);
  const tam = [0, 1, 2, 3].map((i) => ({ x: x(i, 4), y: 100 }));
  const s = seritler(tam);
  kontrol("her nokta bir şerit alır", s.length === 4 && s.every((r, k) => r.i === k), s);
  kontrol("şeritler iç alanın SOLUNDAN başlar, SAĞINDA biter", s[0].sol === G.sol && Math.abs(s[3].sag - (G.genislik - G.sag)) < 1e-9, s);
  kontrol("komşu şeritler arasında boşluk ve örtüşme YOK", s.every((r, k) => k === 0 || Math.abs(r.sol - s[k - 1].sag) < 1e-9), s);
  kontrol("sınır iki noktanın tam ORTASINDA", Math.abs(s[0].sag - (tam[0].x + tam[1].x) / 2) < 1e-9, s);

  const bosluklu = [tam[0], null, tam[2], tam[3]];
  const b = seritler(bosluklu);
  kontrol("boş (null) nokta şerit ALMAZ", b.length === 3 && !b.some((r) => r.i === 1), b);
  kontrol("  ...kalanlar KENDİ sırasını taşır (0,2,3 — kaymaz)", JSON.stringify(b.map((r) => r.i)) === "[0,2,3]", b);
  kontrol("  ...boş ayın alanı komşulara bölünür, ölü bölge yok", b.every((r, k) => k === 0 || Math.abs(r.sol - b[k - 1].sag) < 1e-9), b);
  const tek = seritler([{ x: G.sol + 500, y: 50 }]);
  kontrol("tek nokta bütün iç alanı alır", tek.length === 1 && tek[0].sol === G.sol && tek[0].sag === G.genislik - G.sag, tek);
}
kosanBolumler.push("şerit");

console.log("\n2) bağ — iki grafik");
for (const [ad, yol, noktaIfadesi] of [
  ["çizgi grafik (ciro · NET-2)", "src/components/cizgi-grafik.tsx", /<NoktaSeritleri noktalar=\{noktalar\.map\(\(n, i\) => \(\{ x: x\(i\), y: yKonum\(anaSeri\(n\)\) \}\)\)\} \/>/],
  ["tek serili grafik (envanter · marj)", "src/components/tek-serili-grafik.tsx", /<NoktaSeritleri\s+noktalar=\{noktalar\.map\(\(n, i\) => \(n\.deger === null \? null : \{ x: x\(i\), y: yk\(n\.deger\) \}\)\)\}\s+\/>/],
] as const) {
  const m = yorumsuz(kaynakOku(yol));
  kontrol(`${ad}: sarmalayıcıyla sarılı ve pencereler veriliyor`, /<GrafikNoktaPenceresi pencereler=\{pencereler\}>/.test(m) && /<\/GrafikNoktaPenceresi>/.test(m));
  kontrol(`  ...şeritler doğru noktalarla çiziliyor`, noktaIfadesi.test(m));
  kontrol(`  ...şeritler SVG'nin EN SONUNDA (üstte)`, /<NoktaSeritleri[\s\S]{0,160}\/>\s*<\/svg>/.test(m));
  kontrol(`  ...eski çıplak kap kalmadı`, !/<div className="overflow-x-auto">/.test(m));
}
{
  const c = yorumsuz(kaynakOku("src/components/cizgi-grafik.tsx"));
  kontrol("çizgi grafik penceresi TAM tutar yazar (kısaltma değil)", /\{ ad: gelirAdi, deger: bicimle\(n\.gelir\) \}/.test(c) && /\{ ad: net2Adi, deger: bicimle\(n\.net2\) \}/.test(c));
  kontrol("  ...NET-2 kapalıysa pencerede de YOK (yetki)", /satirlar: net2Goster\s*\?/.test(c));
  const t = yorumsuz(kaynakOku("src/components/tek-serili-grafik.tsx"));
  kontrol("tek serili: boş ay pencere AÇMAZ, satır seri adını taşır", /n\.deger === null \? null : \{ baslik: n\.tamEtiket, satirlar: \[\{ ad: seriAdi, deger: bicimle\(n\.deger\) \}\] \}/.test(t));
  const p = yorumsuz(kaynakOku("src/components/grafik-nokta-penceresi.tsx"));
  kontrol("sarmalayıcı istemci bileşeni ve fonksiyon ALMIYOR (sunucudan yalnız metin)", /^"use client";/.test(p.trimStart()) && !/bicimle/.test(p));
  /*
   * ⚠ ÖLÇÜT GÜNCELLENDİ (K344, 17.10.2026) — eski hâli `secili?.i === i)` ile
   * «aynı noktaya yeniden dokun → kapan» arıyordu. K344'te fareyle ÜSTÜNE GELME
   * pencereyi geçici açar; tıklama onu SABİTLER (içindeki bağlantıya gidilsin
   * diye). Aynı noktaya yeniden tıklamak artık YALNIZ sabit pencereyi kapatır —
   * geçici olanı kapatsaydı fareyle gelip tıklayan kişi pencereyi kaybederdi.
   * Niyet aynı (aynı nokta kapatır), koşul `sabit` ile daraldı; GEVŞETİLMEDİ.
   */
  kontrol("kapatma yolları: aynı nokta (sabitken) · Esc · dışarı dokunma", /secili\?\.i === bulunan\.i && secili\.sabit\)\s*\{\s*setSecili\(null\)/.test(p) && /e\.key === "Escape"/.test(p) && /"pointerdown", disari/.test(p));
}
kosanBolumler.push("bağ");

/* ④ ÜSTÜNE GELME + KAYNAK BAĞLANTISI (K344, kullanıcı 15.10.2026 — İlke #16) */
console.log("\n4) üstüne gelme + kaynak bağlantısı (K344)");
{
  const p = yorumsuz(kaynakOku("src/components/grafik-nokta-penceresi.tsx"));
  kontrol("sarmalayıcı üstüne gelmeyi ve ayrılmayı dinliyor", /onClick=\{tikla\} onPointerMove=\{ustuneGel\} onPointerLeave=\{ayril\}/.test(p));
  kontrol("  ...üstüne gelme YALNIZ fareyle, sabit pencereyi ezmez", /if \(e\.pointerType !== "mouse" \|\| secili\?\.sabit\) return;/.test(p));
  kontrol("  ...geçici açılış sabit DEĞİL, tıklama sabit", /ac\(bulunan\.i, bulunan\.hedef, false\)/.test(p) && /ac\(bulunan\.i, bulunan\.hedef, true\)/.test(p));
  kontrol("  ...ayrılınca YALNIZ geçici pencere kapanır", /if \(e\.pointerType === "mouse" && secili && !secili\.sabit\) setSecili\(null\);/.test(p));
  kontrol("pencere bağlantıyı adres KURMADAN çizer (yalnız verilen adres)", /\{p\.baglanti \? \(\s*<Link\s+href=\{p\.baglanti\.adres\}/.test(p) && !/grafikNoktasiSatisAdresi|\/satislar/.test(p));

  /* Her grafik AYRI sınanır — aynı dosyadaki iki grafik birbirini örtmesin (anayasa: desen sayılır). */
  const kart = yorumsuz(kaynakOku("src/app/kart/[variantId]/kart-grafikleri.tsx"));
  const blok = (bas: string, son: string) => {
    const b = kart.indexOf(bas);
    const s = kart.indexOf(son);
    return b >= 0 && s > b ? kart.slice(b, s) : "";
  };
  const gunluk = blok("export function GunlukGrafik", "export function StokFiyatGrafigi");
  const stok = blok("export function StokFiyatGrafigi", "export function MiniCizgi");
  const kars = yorumsuz(kaynakOku("src/components/karsilastirma-grafigi.tsx"));
  for (const [ad, m, seritIfadesi] of [
    ["kart «Satış ve kâr»", gunluk, /<NoktaSeritleri\s+noktalar=\{noktalar\.map\(\(n, i\) => \(\{ x: xMerkez\(i\), y: yPara\(n\.ciro\) \}\)\)\}\s+alan=\{\{ sol: G\.sol, sag: G\.gen - G\.sag, ust: G\.ust, alt: G\.yuk - G\.alt \}\}\s+\/>/],
    ["kart «Stok ve fiyat»", stok, /<NoktaSeritleri\s+noktalar=\{noktalar\.map\(\(n, i\) => \(\{ x: x\(i\), y: yStok\(n\.stok\) \}\)\)\}\s+alan=\{\{ sol: G\.sol, sag: G\.gen - G\.sag, ust: G\.ust, alt: G\.yuk - G\.alt \}\}\s+\/>/],
    ["karşılaştırma grafiği", kars, /<NoktaSeritleri noktalar=\{seritNoktalari\} \/>/],
  ] as const) {
    kontrol(`${ad}: blok bulundu`, m.length > 0);
    kontrol(`  ...sarmalayıcıyla sarılı`, /<GrafikNoktaPenceresi pencereler=\{pencereler\}>/.test(m) && /<\/GrafikNoktaPenceresi>/.test(m));
    kontrol(`  ...şeritler kendi kutusuyla, doğru noktalarla`, seritIfadesi.test(m));
    kontrol(`  ...şeritler SVG'nin EN SONUNDA (üstte)`, /<NoktaSeritleri[\s\S]{0,300}?\/>\s*<\/svg>/.test(m));
    kontrol(`  ...eski fare ipucu (<title>) kalmadı — pencereyle çift olmasın`, !/<title>/.test(m));
  }
  kontrol("kart günü: DÖRT rakam (ciro · NET-2 · adet · iade)", /\{ ad: adlar\.ciro, deger: bicimleTam\(n\.ciro\) \}/.test(gunluk) && /\{ ad: adlar\.net2, deger: n\.net2 === null \? adlar\.bilinmiyor : bicimleTam\(n\.net2\) \}/.test(gunluk) && /\{ ad: adlar\.adet, deger: String\(n\.adet\) \}/.test(gunluk) && /\{ ad: adlar\.iade, deger: String\(n\.iade\) \}/.test(gunluk));
  kontrol("  ...NET-2 yetkisizde YOK, bilinmeyen NET-2 sıfır yazılmaz", /\.\.\.\(adlar\.net2 \? \[/.test(gunluk));
  kontrol("  ...bağlantı yalnız satış OLAN günde", /\.\.\.\(kaynak && n\.adet > 0 \? \{ baglanti: \{ metin: kaynak\.metin, adres: kaynak\.adres\(n\.gun\) \} \} : \{\}\)/.test(gunluk));
  kontrol("karşılaştırma: değeri olmayan ay pencere ALMAZ", /return satirlar\.length === 0 \? null : \{ baslik: e, satirlar \};/.test(kars));

  const pano = yorumsuz(kaynakOku("src/app/kart/[variantId]/kart-panosu.tsx"));
  kontrol("kart panosu kaynağı ortak adresten, ÜRÜN KİMLİĞİYLE verir", /kaynak=\{\{ metin: t\("grafikGununSatislari"\), adres: \(gun\) => grafikNoktasiSatisAdresi\(\{ varyant: varyantId, baslangic: gun, bitis: gun \}\) \}\}/.test(pano));
  const cizgi = yorumsuz(kaynakOku("src/components/cizgi-grafik.tsx"));
  kontrol("çizgi grafik bağlantıyı noktanın KENDİ sırasından alır", /\.\.\.\(baglantilar\?\.\[i\] \? \{ baglanti: baglantilar\[i\]! \} : \{\}\)/.test(cizgi));
  const panel = yorumsuz(kaynakOku("src/app/page.tsx"));
  const ciroBlok = (() => {
    const b = panel.indexOf("baglantilar={ciroNet.map(");
    return b >= 0 ? panel.slice(b, b + 700) : "";
  })();
  kontrol("panel ciro grafiği: bağlantı ortak adresten, kovanın aralığı + kanal süzgeciyle", /n\.gelir === 0\s*\?\s*null/.test(ciroBlok) && /grafikNoktasiSatisAdresi\(\{\s*baslangic: gunMetni\(n\.baslangic\),\s*bitis: gunMetni\(n\.sonGun\),\s*\.\.\.\(seciliKanal \? \{ kanal: seciliKanal \} : \{\}\),\s*\}\)/.test(ciroBlok));

  /* ADRES + SÜZGEÇ — gövde ÇAĞRILIR (sayı = liste: adres, kartın saydığı kümeyi açmalı) */
  const adres = grafikNoktasiSatisAdresi({ varyant: "v1", baslangic: "2026-10-15", bitis: "2026-10-15" });
  kontrol("adres: ürün kimliği + tek günlük özel dönem", adres === "/satislar?varyant=v1&pencere=OZEL&baslangic=2026-10-15&bitis=2026-10-15", adres);
  const kanalli = grafikNoktasiSatisAdresi({ baslangic: "2026-10-01", bitis: "2026-10-07", kanal: "TY" });
  kontrol("  ...panel kovası: aralık + kanal, ürünsüz", kanalli === "/satislar?pencere=OZEL&baslangic=2026-10-01&bitis=2026-10-07&kanal=TY", kanalli);
  const p1 = Object.fromEntries(new URL("http://x" + adres).searchParams);
  const pen = pencereCoz(p1, new Date("2026-10-17T10:00:00Z"));
  kontrol("  ...açılan dönem TAM BİR İstanbul günü", pen.aralik !== undefined && pen.aralik.lt.getTime() - pen.aralik.gte.getTime() === 24 * 3600 * 1000, pen.aralik);
  const liste = satisListesiParametreleri(p1);
  kontrol("  ...ürün süzgeci NÖTR değil: iptaller gizli (kart da saymıyor)", liste.iptal === "0", liste);
  const ve = satisKosulu(liste).kosul.AND;
  const urunKosulu = (Array.isArray(ve) ? ve : []).find((k) => JSON.stringify(k).includes('"variantId":"v1"'));
  kontrol("  ...süzgeç ürün KİMLİĞİYLE, kaldırılmış kalem bağlamaz", JSON.stringify(urunKosulu) === JSON.stringify({ items: { some: { variantId: "v1", kaldirildiAt: null } } }), urunKosulu);
  const aramali = satisKosulu({ q: "v1" }).kosul;
  kontrol("  ...ürün süzgeci ARAMA DEĞİL (q varyant koşulu üretmez)", !JSON.stringify(aramali).includes('"variantId"'));
  const satis = yorumsuz(kaynakOku("src/app/satislar/page.tsx"));
  kontrol("Satışlar: ürün süzgeci başka süzgece dokununca TAŞINIR", /varyant: p\.varyant,\s*\};/.test(satis));
  kontrol("  ...ekranda YAZAR ve tek tıkla kaldırılır", /t\("urunSuzgeci", \{ sku: urunSuzgeci\.sku, ad: urunSuzgeci\.product\.name \}\)/.test(satis) && /suzgecAdresi\("\/satislar", \{ \.\.\.formTasinanlar, q: arama \}, \{ varyant: undefined \}\)/.test(satis));
}
kosanBolumler.push("kaynak bağlantısı");

/* ③ RAKAM KONUMU — 03.10.2026 «ciro ile net karışmış» vakası */
{
  const AY_SATIRI = G.yukseklik - 12;
  const dip = G.yukseklik - G.alt; // eksenin sıfır çizgisi (alt = 0 iken)
  // Ekim vakası: ay yeni başladı, ciro ₺97 B · NET-2 ₺8,2 B, eksen ₺2 Mn → iki nokta da dipte.
  const ekim = noktaEtiketleri(dip - 11, dip - 1);
  kontrol("NET-2 rakamı dipteyken ay satırına İNMEZ", ekim.netY <= ETIKET_ALT_SINIRI && ekim.netY < AY_SATIRI - 12, ekim);
  kontrol("  ...ve ciro rakamı NET-2 rakamının ÜSTÜNDE, satır boşluğuyla", ekim.ciroY <= ekim.netY - ETIKET_SATIR_ARALIGI, ekim);
  // Normal ay: ciro üstte, NET-2 ortada — eski yerleşim AYNEN (alt etiket noktanın altında).
  const normal = noktaEtiketleri(60, 200);
  kontrol("normal ayda NET-2 rakamı noktasının ALTINDA (eski yerleşim korunur)", normal.netY === 218 && normal.ciroY === 50, normal);
  // Yakın noktalar: zıt yönlere itilir (eski ölçüt).
  const yakin = noktaEtiketleri(150, 160);
  kontrol("yakın noktalarda etiketler zıt yönlere itilir", yakin.ciroY < 140 && yakin.netY > 178, yakin);
  kontrol("ilk nokta içe (start), son nokta içe (end), ortadakiler orta",
    noktaEtiketHizasi(0, 12) === "start" && noktaEtiketHizasi(11, 12) === "end" && noktaEtiketHizasi(5, 12) === "middle" && noktaEtiketHizasi(0, 1) === "middle");
  const c = yorumsuz(kaynakOku("src/components/cizgi-grafik.tsx"));
  kontrol("grafik konumu gövdeden alıyor", /const \{ ciroY, netY \} = noktaEtiketleri\(yKonum\(n\.gelir\), yKonum\(n\.net2\)\);/.test(c));
  kontrol("  ...ciro rakamı ciroY'ye, NET-2 rakamı netY'ye yazılıyor", /y=\{ciroY\}\s*textAnchor=\{hiza\}[\s\S]{0,200}?bicimleKisa\(n\.gelir\)/.test(c) && /y=\{net2Goster \? netY : yKonum\(anaSeri\(n\)\) - 10\}\s*textAnchor=\{hiza\}/.test(c));
}
kosanBolumler.push("rakam konumu");

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
