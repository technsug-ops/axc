import { readFileSync } from "node:fs";

/**
 * ============================================================================
 *  KANAL-YAZMA BEKÇİSİ (K169) — İLK KANALA-YAZAN AKIŞIN TAAHHÜTLERİ
 * ----------------------------------------------------------------------------
 *      npm run kanal-yazma:dogrula
 *
 *  `api:dogrula`daki KANALA_YAZMASI_BEYANLI beyanının bekçisi. Beyan bir
 *  muafiyet değil taahhüttür; burada ölçülen taahhütler:
 *    ① yazıcı dosyada TEK fiil, TEK uç — ikinci POST/başka uç yazılamaz
 *    ② eylem RAKAM GÖRÜLMEDEN GÖNDERMEZ (önizleme + pasif düğme)
 *    ③ İZSİZ GÖNDERİM YOK — kabul de red de deftere yazılır
 *    ④ stok İSTEMCİDEN ALINMAZ — sunucu yeniden çözer
 *    ⑤ izin kapısı (`kanal.yaz`) her iki eylemde
 *  Desenler ters bölüsüz, kullanım bloğuna daraltılmış (kaçış dersleri).
 * ============================================================================
 */

let gecen = 0;
let hata = 0;
function kontrol(ad: string, kosul: boolean, ipucu?: unknown) {
  if (kosul) {
    gecen++;
    console.log("  OK    " + ad);
  } else {
    hata++;
    console.log("  HATA  " + ad);
    if (ipucu !== undefined) console.log("        ", ipucu);
  }
}
function yorumsuz(metin: string): string {
  return metin
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
}

console.log("\nKANAL-YAZMA BEKÇİSİ (K169)\n");

const yazici = yorumsuz(readFileSync("scripts/ty/yazici.ts", "utf8"));
const postSayisi = yazici.split('method: "POST"').length - 1;
kontrol("① yazıcıda TAM BİR adet POST var", postSayisi === 1, postSayisi);
kontrol(
  "①   ...ve uç SABİT: price-and-inventory",
  yazici.includes("/products/price-and-inventory"),
);
kontrol(
  "①   ...başka fiil yok (PUT/DELETE/PATCH)",
  !yazici.includes('method: "PUT"') &&
    !yazici.includes('method: "DELETE"') &&
    !yazici.includes('method: "PATCH"'),
);

const eylem = yorumsuz(
  readFileSync("src/app/kart/[variantId]/actions.ts", "utf8"),
);
kontrol(
  "② önizleme eylemi VAR ve salt okuma (yazıcıyı çağırmıyor)",
  (() => {
    const basi = eylem.indexOf("export async function tyGonderimOnizle");
    if (basi < 0) return false;
    const sonu = eylem.indexOf("export async function", basi + 10);
    const blok = eylem.slice(basi, sonu < 0 ? undefined : sonu);
    return !blok.includes("stokFiyatGonder(");
  })(),
);
kontrol(
  "④ stok SUNUCUDA yeniden çözülüyor (istemciden sayı alınmaz)",
  eylem.includes("const stok = niyet.stokGonder ? await varyantStogu(variantId) : null"),
);
kontrol(
  "③ KABUL izi yazılıyor",
  eylem.includes('sonuc: "KABUL"') && eylem.includes('action: "KANAL_GONDERIMI"'),
);
kontrol(
  "③ RED de iz bırakıyor (gönderdim-sanıyordum sorusuna cevap)",
  eylem.includes('sonuc: "RED"'),
);
const izinSayisi = eylem.split('yetkiIste("kanal.yaz")').length - 1;
kontrol("⑤ izin kapısı İKİ eylemde de", izinSayisi === 2, izinSayisi);

const dyalog = yorumsuz(
  readFileSync("src/app/kart/[variantId]/ty-gonderim.tsx", "utf8"),
);
kontrol(
  "② diyalog önizlemeyi SUNUCUDAN çekiyor",
  dyalog.includes("await tyGonderimOnizle(variantId)"),
);
kontrol(
  "② rakam gelmeden GÖNDER pasif",
  dyalog.includes("disabled={bekliyor || !gonderilebilir}") &&
    dyalog.includes("onizleme?.tamam === true"),
);

console.log(
  "\n" + (hata === 0 ? "TÜM KONTROLLER GEÇTİ" : "BAŞARISIZ") + ` (${gecen}/${gecen + hata})\n`,
);
process.exit(hata === 0 ? 0 : 1);
