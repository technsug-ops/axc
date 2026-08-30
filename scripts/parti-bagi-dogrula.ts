import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * ============================================================================
 *  PARTİ BAĞI — GİRİŞ HAREKETİ PARTİYE BAĞLANAMAZ (bekçi)
 * ----------------------------------------------------------------------------
 *      npm run parti-bagi:dogrula
 *
 *  ⛔ 30.08.2026 CANLI RİSKİ (K96): `SALE_CANCEL_IN` hem POZİTİF yazılıyor
 *  hem `sourceMovementId` taşıyordu. `acikPartiler` pozitif her hareketi bir
 *  PARTİ sayar; aynı hareket bağ da taşıyınca eski partinin tüketimini geri
 *  alır. **Aynı adet iki kez** FIFO'ya girer:
 *
 *      ledger 1  ·  FIFO 2      (axcali1633 · axcali3134)
 *
 *  ⭐ VE HİÇBİR ŞEY HATA VERMEZ. Ekran bir sayı, kâr motoru başka sayı görür.
 *
 *  ⚠ BUGÜNE KADAR PATLAMAMASI TESADÜFTÜ: iptal edilen satışların
 *  `SALE_OUT`larında kaynak zaten boştu. Aynı gün eksik bağlar kapatıldı
 *  (`canli:eksik-bag`), yani artık her çıkışın kaynağı var — **bir sonraki
 *  iptal bu hatayı kesin üretirdi.**
 *
 *  ═══ ÖLÇÜT ═══
 *  Bir `stockMovement.create` bloğu, tipi TARTIŞMASIZ GİRİŞ olan bir hareket
 *  yazıyorsa `sourceMovementId` TAŞIYAMAZ.
 *
 *  ⚠ ÖLÇÜT TİP LİSTESİ DEĞİL, TİPİN YÖNÜ: `ADJUSTMENT` ve
 *  `COUNT_CORRECTION` iki yönde de yazılabilir (işaret değişkenden gelir ve
 *  kaynak taramasıyla bilinemez) — onlar KAPSAM DIŞI ve niye dışında olduğu
 *  burada yazılı. Kapsam yalnız yönü SABİT olan tipler.
 *  _(Anayasa: "tip listesi değil, BAĞ" — burada bağ TİPİN YÖNÜDÜR.)_
 *
 *  ⚠ VE YORUMSUZ KODDA ARANIR: bir yasağı ANLATAN yorum onu çiğnemiş sayılmaz.
 * ============================================================================
 */

/** Yönü SABİT GİRİŞ olan tipler — bunlar asla bir partiyi tüketmez. */
const GIRIS_TIPLERI = ["SALE_CANCEL_IN", "RETURN_IN", "PURCHASE_IN", "EXCHANGE_IN"];

const KOK = ["src", "scripts"];
/** ⚠ Bekçinin KENDİSİ ölçüt metnini taşır; kendini ölçerse yalancı kırmızı yanar. */
const KENDI = "scripts/parti-bagi-dogrula.ts";

function dosyalar(dizin: string): string[] {
  const cikti: string[] = [];
  for (const ad of readdirSync(dizin)) {
    const yol = join(dizin, ad);
    if (statSync(yol).isDirectory()) cikti.push(...dosyalar(yol));
    else if (/\.tsx?$/.test(ad)) cikti.push(yol);
  }
  return cikti;
}

/** ⚠ Yorumlar SİLİNİR — ölçüt koda bakar, anlatıya değil. */
function yorumsuz(metin: string): string {
  return metin
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/\/\/[^\n]*/g, (m) => m.replace(/[^\n]/g, " "));
}

/**
 * `stockMovement.create(` çağrısının TAM gövdesi — parantez dengesiyle.
 * ⚠ Satır sonuyla kesilseydi çok satırlı `data: { … }` bloğu yarım kalır ve
 * ölçüt sessizce hiçbir şey görmezdi.
 */
function cagrilar(kod: string): { blok: string; indeks: number }[] {
  const desen = /stockMovement\.create\s*\(/g;
  const cikti: { blok: string; indeks: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = desen.exec(kod)) !== null) {
    let derinlik = 0;
    let son = m.index + m[0].length - 1;
    for (let i = son; i < kod.length; i++) {
      if (kod[i] === "(") derinlik++;
      else if (kod[i] === ")") {
        derinlik--;
        if (derinlik === 0) {
          son = i;
          break;
        }
      }
    }
    cikti.push({ blok: kod.slice(m.index, son + 1), indeks: m.index });
  }
  return cikti;
}

let hata = 0;
let kontrol = 0;
const bulgular: string[] = [];

for (const kok of KOK) {
  for (const yol of dosyalar(kok)) {
    const duz = yol.replace(/\\/g, "/");
    if (duz.endsWith(KENDI)) continue;
    const kod = yorumsuz(readFileSync(yol, "utf8"));
    for (const c of cagrilar(kod)) {
      const tip = /type:\s*"([A-Z_]+)"/.exec(c.blok)?.[1];
      if (!tip || !GIRIS_TIPLERI.includes(tip)) continue;
      kontrol++;
      /**
       * ⚠ `sourceMovementId: null` YASAK DEĞİL — açıkça boş bırakmak
       * doğru davranışın kendisidir. Yasak olan DOLU bir değer geçirmek.
       */
      const bag = /sourceMovementId:\s*(?!null\b)([^,\n}]+)/.exec(c.blok);
      if (bag) {
        hata++;
        const satir = kod.slice(0, c.indeks).split("\n").length;
        bulgular.push(
          "  ⛔ " + duz + ":" + satir + "  →  `" + tip +
            "` GİRİŞ hareketi partiye bağlanmış: sourceMovementId: " +
            bag[1].trim().slice(0, 40),
        );
      }
    }
  }
}

console.log("");
console.log("PARTİ BAĞI — GİRİŞ HAREKETİ PARTİYE BAĞLANAMAZ");
console.log("  ölçüt: yönü SABİT giriş tipleri (" + GIRIS_TIPLERI.join(" · ") + ")");
console.log("         `sourceMovementId` TAŞIYAMAZ — yoksa aynı adet iki kez");
console.log("         FIFO'ya girer (parti sayılır + tüketimi geri alır).");
console.log("  incelenen giriş yazımı: " + kontrol);
if (hata === 0) {
  console.log("  TÜM KONTROLLER GEÇTİ (" + kontrol + ")");
  process.exit(0);
}
console.log("  ⛔ BAŞARISIZ: " + hata + " / " + kontrol);
for (const b of bulgular) console.log(b);
console.log("");
console.log("  Çare: alanı hiç geçirmeyin. Geri dönen mal YENİ bir parti");
console.log("  oluşturur; maliyeti çıkıştan kopyalanır, bağ gerekmez.");
process.exit(1);
