import { readFileSync, readdirSync } from "node:fs";

/**
 * ============================================================================
 *  İSTEMCİ BİLEŞENİ PROP BEKÇİSİ (07.09.2026)
 * ----------------------------------------------------------------------------
 *      npm run istemci-prop:dogrula
 *
 *  ⚠ KARDEŞİ VAR, AYNISI DEĞİL: `istemci-siniri:dogrula` sınırın ÖTEKİ
 *  yönünü ölçüyor — istemcinin SUNUCUYA uzanması (sunucu modülü importu ·
 *  `next/headers` · istemcide `metadata`). Bu bekçi ters yönü ölçer:
 *  **sunucunun istemciye ne GEÇİRDİĞİNİ.** Aynı sınır, farklı soru; bu
 *  yüzden iki gövde — "aynı soruya iki cevap" yasağı buraya işlemez.
 *
 *  ⛔ NİYE DOĞDU — CANLI ARIZA. Panelin karşılaştırma sekmesi 500 verdi
 *  ("Bu ekran çizilemedi"). Sebep: `karsilastirma-grafigi.tsx` `"use client"`
 *  ve sunucu ona seri başına İKİ FONKSİYON geçiyordu (`bicimle`,
 *  `bicimleKisa`). **Sunucudan istemciye fonksiyon serileştirilemez.**
 *
 *  ⚠ VE BÜTÜN TUR YEŞİLDİ. 42 bekçinin hiçbiri yakalamadı, çünkü hepsi
 *  kaynağı ölçüyor; ekranın ÇİZİLDİĞİNİ ölçen yok. _(Anayasa: "sınanmamış
 *  ekran, ekran değildir" — ve "bekçinin yeşili, ölçtüğü doğrulanmadan
 *  güvence değildir".)_
 *
 *  ⭐ AMA BU SINIF KAYNAKTAN GÖRÜLEBİLİR: `"use client"` taşıyan bir dosyanın
 *  DIŞA AKTARILAN prop tipinde fonksiyon alanı varsa, o alan sunucudan
 *  geçirildiği anda ekran patlar. Ölçüt dosya listesi değil **DESEN** —
 *  yarın eklenen bileşen de yakalanır, kimsenin listeye eklemesi gerekmez.
 *  _(Anayasa: "düzeltmenin çaresi dosya listesi değil, desen yasağıdır".)_
 *
 *  ── ⚠ OLAY İŞLEYİCİLERİ İSTİSNA DEĞİL, KAPSAM DIŞI ──────────────────
 *  `onClick` gibi alanlar istemci→istemci geçer ve meşrudur; ölçüt yalnız
 *  **dışa aktarılan prop TİPLERİNİ** tarar (sunucunun doldurduğu sözleşme).
 *  Bileşenin kendi iç yardımcıları ve `useState` çağrıları kapsam dışıdır.
 *
 *  ── ⛔ İSTİSNA BEYANLA GEÇER ─────────────────────────────────────────
 *  Gerçekten gereken bir fonksiyon prop'u (ör. `"use server"` ile işaretli
 *  bir eylem) satırın üstüne şu beyanla geçer:
 *      // SUNUCUDAN GECMEZ: <gerekçe>
 *  Beyansız her fonksiyon alanı KIRMIZIDIR — muafiyet bedava olmaz.
 * ============================================================================
 */

const BOLUM_SAYISI = 2;
const kosanBolumler: string[] = [];
let gecen = 0;
let kalan = 0;

function dogru(ad: string, kosul: boolean) {
  if (kosul) {
    gecen++;
    console.log(`  ✓ ${ad}`);
  } else {
    kalan++;
    console.log(`  ⛔ ${ad}`);
  }
}

/** Yorumları maskeler — satır sayısı ve konumlar korunur. */
function yorumsuz(m: string): string {
  return m
    .replace(/\/\*[\s\S]*?\*\//g, (e) => e.replace(/[^\r\n]/g, " "))
    .replace(/(^|[^:])\/\/.*$/gm, (e) => e.replace(/[^\r\n]/g, " "));
}

function kaynaklar(kok: string): string[] {
  const cikti: string[] = [];
  for (const g of readdirSync(kok, { withFileTypes: true })) {
    const yol = `${kok}/${g.name}`;
    if (g.isDirectory()) cikti.push(...kaynaklar(yol));
    else if (/\.tsx?$/.test(g.name)) cikti.push(yol);
  }
  return cikti;
}

console.log("\nİSTEMCİ BİLEŞENİ PROP BEKÇİSİ");
console.log("=".repeat(60));

/* ═══ ① DESEN YASAĞI ══════════════════════════════════════════════════ */
console.log("\n1) `use client` dosyalarında fonksiyon prop'u YASAK");
{
  /**
   * ⚠ ÖLÇÜT DIŞA AKTARILAN TİPE BAĞLI: `export type X = { ... }` ve
   * `export interface X { ... }` gövdeleri taranır. Bileşenin gövdesindeki
   * yerel oklar (`const f = () => …`) kapsam dışı — onlar prop değil.
   */
  const ihlaller: string[] = [];
  let taranan = 0;
  let istemciDosyasi = 0;

  for (const yol of kaynaklar("src")) {
    const ham = readFileSync(yol, "utf8");
    taranan++;
    /** ⚠ İlk 400 karakterde aranır: direktif dosyanın BAŞINDA olmak zorunda. */
    if (!/^\s*["']use client["']/m.test(ham.slice(0, 400))) continue;
    istemciDosyasi++;
    const m = yorumsuz(ham);

    /** Dışa aktarılan tip/arayüz gövdelerini kes. */
    const bloklar: { ad: string; govde: string; konum: number }[] = [];
    const desen = /export\s+(?:type\s+(\w+)\s*=\s*\{|interface\s+(\w+)\s*\{)/g;
    let e: RegExpExecArray | null;
    while ((e = desen.exec(m)) !== null) {
      const bas = m.indexOf("{", e.index);
      let derinlik = 0;
      let son = bas;
      for (let i = bas; i < m.length; i++) {
        if (m[i] === "{") derinlik++;
        else if (m[i] === "}") {
          derinlik--;
          if (derinlik === 0) {
            son = i;
            break;
          }
        }
      }
      bloklar.push({ ad: e[1] ?? e[2] ?? "?", govde: m.slice(bas, son + 1), konum: bas });
    }

    for (const b of bloklar) {
      /** `alan: (…) => …` — fonksiyon tipi alan. */
      const alanDeseni = /(\w+)\??\s*:\s*\([^)]*\)\s*=>/g;
      let a: RegExpExecArray | null;
      while ((a = alanDeseni.exec(b.govde)) !== null) {
        /**
         * ⛔ BEYAN VARSA GEÇER — AMA HAM METİNDEN OKUNUR.
         *
         * İlk yazımda beyan `b.govde` (yorumları MASKELENMİŞ metin) içinde
         * aranıyordu ve beyan bir YORUMDUR — yani hiçbir zaman bulunamıyordu:
         * beyanlı istisna da kırmızı yanıyordu. Mutasyon ⑤ bunu yakaladı.
         *
         * ⭐ `yorumsuz` KONUMLARI KORUYOR (yorum karakterlerini boşlukla
         * değiştiriyor, silmiyor) — bu yüzden aynı ofsetten HAM metne
         * bakılabiliyor. Desen maskeli metinde, BEYAN ham metinde aranır.
         * _(Anayasa: "ölçüt yorumsuz kodda arar" — ama beyanın kendisi
         * yorumdur; ikisi ayrı kaynaktan okunmak zorunda.)_
         */
        const mutlak = b.konum + a.index;
        const oncesi = ham.slice(Math.max(0, mutlak - 240), mutlak);
        if (/SUNUCUDAN GECMEZ:\s*\S/.test(oncesi)) continue;
        ihlaller.push(`${yol} · ${b.ad}.${a[1]}`);
      }
    }
  }

  console.log(`   taranan dosya ${taranan} · "use client" olan ${istemciDosyasi}`);
  /**
   * ⛔ TABAN DOLULUĞU AYRICA KANITLANIR: hiç istemci dosyası bulunmazsa
   * ölçüt boş kümeye bakar ve HER ZAMAN yeşil yanar.
   * _(Anayasa: "`every` kapısı taban doluluğunu ayrıca kanıtlar".)_
   */
  dogru(`taban DOLU — en az 5 "use client" dosyası (${istemciDosyasi})`, istemciDosyasi >= 5);
  dogru(
    `beyansız fonksiyon prop'u YOK (ihlal: ${ihlaller.join(", ") || "yok"})`,
    ihlaller.length === 0,
  );
}
kosanBolumler.push("desen yasağı");

/* ═══ ② VAKANIN KENDİSİ ═══════════════════════════════════════════════ */
console.log("\n2) 07.09 vakası — karşılaştırma grafiği birim TANIMI taşır");
{
  const g = readFileSync("src/components/karsilastirma-grafigi.tsx", "utf8");
  const p = readFileSync("src/app/page.tsx", "utf8");
  dogru("seri BİRİM TÜRÜ taşıyor", /birimTuru:\s*"PARA"\s*\|\s*"SAYI"/.test(g));
  dogru("biçim İSTEMCİDE çözülüyor (useBicim)", g.includes("const bicim = useBicim();"));
  /** ⛔ Fonksiyon alanları GERİ GELEMEZ. */
  dogru("seri tipinde `bicimle` YOK", !/bicimle:\s*\(/.test(g));
  dogru("panel seriye birimTuru veriyor", p.includes("birimTuru: (k.birim === seciliPara"));
  dogru("panel seriye fonksiyon VERMİYOR", !/bicimleKisa:\s*\(d: number\)/.test(p));
}
kosanBolumler.push("vaka");

console.log("\n" + "=".repeat(60));
if (kosanBolumler.length !== BOLUM_SAYISI) {
  console.log(`KOŞUM YARIM KALDI — ${kosanBolumler.length}/${BOLUM_SAYISI}. GEÇERSİZ.`);
  process.exit(1);
}
if (kalan === 0) {
  console.log(`OK  ${gecen}/${gecen} ölçüt geçti (${BOLUM_SAYISI} bölüm)`);
  process.exit(0);
}
console.log(`${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrolden)`);
process.exit(1);
