import "dotenv/config";
import { readFileSync } from "node:fs";

import { betikFirmasiylaKos } from "./betik-firmasi";

/**
 * ============================================================================
 *  DENEME KURULUMU — ÜRÜN GALERİSİNİ DOSYADAN DOLDUR (K330, 10.10.2026)
 * ----------------------------------------------------------------------------
 *  BETIK SINIFI: TEK_SEFERLIK — deneme kurulumunda pazaryeri anahtarı YOK
 *  (K303 şartı); resim listesi ana kurulumda YALNIZ OKUNARAK dosyaya
 *  çıkarıldı (`[{barkod, url, galeri}]`), burada barkodla eşlenip AYNI
 *  yazıcıdan (`gorselleriYaz`) geçer — kural ve tavan senkronla aynı.
 *
 *      npx tsx scripts/deneme-galeri-doldur.ts <dosya.json> --firma=DEMO [--yaz]
 *
 *  `--yaz` yoksa KURU koşar (hesaplar, yazmaz). Tavan dolarsa yeniden koşulur
 *  (satır satır tekrar koşulabilir; aynı liste ikinci koşumda yazılmaz).
 *  Geri alma: `DELETE FROM VaryantGorseli WHERE kaynak='TRENDYOL'` — ölçüt
 *  yeniden hesaplanabilir (bu tablo deneme kurulumunda başka yazıcıdan dolmuyor).
 * ============================================================================
 */
const dosya = process.argv[2];
const YAZ = process.argv.includes("--yaz");
if (!dosya || dosya.startsWith("--")) throw new Error("dosya yolu gerekli");

type Satir = { barkod: string; url: string; galeri: unknown[] };
const satirlar = JSON.parse(readFileSync(dosya, "utf8")) as Satir[];
if (!Array.isArray(satirlar) || satirlar.length === 0) throw new Error("dosya boş ya da bozuk — hiçbir şey yazılmadı");

void betikFirmasiylaKos(process.env.DATABASE_URL, async () => {
  const { gorselleriYaz } = await import("../src/lib/urun-gorseli-yaz");
  const { galeriAdresleri } = await import("../src/lib/urun-gorseli");
  const { prisma } = await import("../src/lib/prisma");
  let tur = 0;
  for (;;) {
    tur++;
    const o = await gorselleriYaz(
      satirlar.map((s) => ({ barkod: s.barkod, url: s.url, kaynak: "TRENDYOL" as const, galeri: galeriAdresleri(s.galeri, "TRENDYOL") })),
      !YAZ,
    );
    console.log(
      `tur ${tur} · aday ${o.aday} · eşleşen ${o.eslesen} · ana resim yazılan ${o.yazilan}/${o.degisecek} · galeri yazılan ${o.galeriYazilan}/${o.galeriDegisecek} · sırada ${o.galeriTavandaKalan}`,
    );
    if (!YAZ || (o.tavandaKalan === 0 && o.galeriTavandaKalan === 0)) break;
    if (tur >= 30) throw new Error("30 tur doldu — durdu");
  }
  console.log(YAZ ? "YAZILDI" : "KURU KOŞUM — hiçbir şey yazılmadı");
  await prisma.$disconnect();
}).catch((e) => {
  console.error("HATA", e);
  process.exit(1);
});
