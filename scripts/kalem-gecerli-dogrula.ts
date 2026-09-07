import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { KALEM_GECERLI, kalemGecerliMi, kaldirilmisMi } from "../src/lib/kalem-gecerli";

/**
 * ============================================================================
 *  KALDIRILMIŞ KALEM HİÇBİR PARAYA KARIŞMAZ (K78, 07.09.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ NİYE DESEN YASAĞI, LİSTE DEĞİL: ölçüldü — satış kalemlerinden para/adet
 *  hesaplayan **19 dosya** var. Elle liste tutulsaydı yarın eklenen 20'nci
 *  okuyucu sessizce eski kuralla kalır ve kaldırılmış kalem orada ciroyu
 *  şişirmeye devam ederdi. `KARGO_BEKLEYEN` vakasında tam bu oldu: altı
 *  okuyucudan beşi eski kuralla kalmıştı ve kutu hâlâ yanlış sayıyordu.
 *  _(Anayasa: "düzeltmenin çaresi dosya listesi değil, desen yasağıdır".)_
 *
 *  ⛔⛔ VE ÖLÇÜT **DOSYAYA DEĞİL, SORGUYA** BAĞLIDIR — İLK YAZIMDA DEĞİLDİ VE
 *  MUTASYON KAÇTI (07.09.2026). Ölçüt "bu dosyada `KALEM_GECERLI` geçiyor mu"
 *  diye soruyordu; `page.tsx`te ÜÇ, `kar-yeniden.ts`te ÜÇ ayrı sorgu var ve
 *  BİRİNİN süzgecini silen mutasyon **yeşil geçti** — kelime öteki sorgularda
 *  duruyordu. Aynı körlüğün depodaki adı: _"aynı desen birden çok yerde
 *  geçer; birini bozan mutasyon ötekini bulur."_
 *
 *  Şimdi her SATIŞ KALEMİ SORGUSU tek tek çıkarılıyor (parantez dengesiyle,
 *  sabit pencereyle değil) ve süzgeç O BLOĞUN içinde aranıyor.
 *
 *  ⚠ MUAFİYET GEREKÇESİZ VERİLMEZ ve artık DOSYAYA değil BLOĞA yazılır:
 *  kaldırılmış kalemi GÖRMESİ GEREKEN yer (satış detayının üstü çizili
 *  gösterimi) sorgusunun İÇİNDE beyan eder:  KALEM_SUZGECI MUAF: <gerekçe>
 * ============================================================================
 */

let hata = 0;
let gecen = 0;
const kosanBolumler: string[] = [];

function kontrol(ad: string, sonuc: boolean) {
  if (sonuc) {
    gecen++;
    console.log("  ✓ " + ad);
  } else {
    hata++;
    console.log("  ✗ " + ad);
  }
}

function dosyalar(kok: string, birikim: string[] = []): string[] {
  for (const ad of readdirSync(kok)) {
    const yol = join(kok, ad);
    if (statSync(yol).isDirectory()) {
      if (ad === "generated") continue;
      dosyalar(yol, birikim);
    } else if (/\.tsx?$/.test(ad)) birikim.push(yol);
  }
  return birikim;
}

console.log("\n1) SAF GÖVDE — değer testi");
kontrol("geçerli kalem sayılır", kalemGecerliMi({ kaldirildiAt: null }));
kontrol("kaldırılmış kalem SAYILMAZ", !kalemGecerliMi({ kaldirildiAt: new Date() }));
kontrol("kaldırılmışMı tersini söyler", kaldirilmisMi({ kaldirildiAt: new Date() }));
kontrol("geçerli kalem kaldırılmış DEĞİL", !kaldirilmisMi({ kaldirildiAt: null }));
/** Süzgeç ile gövde AYNI soruyu sormalı — iki ölçüt olsaydı ayrışırlardı. */
kontrol(
  "Prisma süzgeci ile JS gövdesi aynı alana bakıyor",
  Object.keys(KALEM_GECERLI).length === 1 &&
    Object.prototype.hasOwnProperty.call(KALEM_GECERLI, "kaldirildiAt") &&
    KALEM_GECERLI.kaldirildiAt === null,
);
kosanBolumler.push("saf gövde");

/**
 * ============================================================================
 *  BLOK ÇIKARICI — PENCERE SABİT SAYIYLA KESİLMEZ
 * ----------------------------------------------------------------------------
 *  Depoda iki kez yaşandı: sabit pencere (2600 → 4200 → 6500) gövde büyüyünce
 *  sessizce körelir. Burada sınır parantez dengesinden geliyor; blok ne kadar
 *  büyürse büyüsün doğru yerde bitiyor.
 * ============================================================================
 */
function blokSonu(kaynak: string, acilisIndeksi: number): number {
  let derinlik = 0;
  for (let i = acilisIndeksi; i < kaynak.length; i++) {
    const c = kaynak[i];
    if (c === "{") derinlik++;
    else if (c === "}") {
      derinlik--;
      if (derinlik === 0) return i + 1;
    }
  }
  return kaynak.length;
}

/**
 * Bir konumun ANAHTAR YOLU — hangi ilişkinin içindeyiz.
 *
 * ⛔ NİYE GEREKLİ: `items:` adı SATIŞA ait değildir. Satış detayında
 * `returns: { include: { items: … } }` da var ve o `ReturnItem`dır —
 * kaldırma süzgeci orada ANLAMSIZDIR. Ada bakan bir ölçüt iade kalemlerini
 * de suçlar ve düzeltilemeyecek bir kırmızı üretirdi.
 * _(Anayasa: "benzer ad, aynı kimlik değildir".)_
 */
function anahtarYolu(kaynak: string, indeks: number): string[] {
  const yol: string[] = [];
  let derinlik = 0;
  for (let i = indeks - 1; i >= 0; i--) {
    const c = kaynak[i];
    if (c === "}") derinlik++;
    else if (c === "{") {
      if (derinlik === 0) {
        const once = kaynak.slice(Math.max(0, i - 80), i);
        const m = /([A-Za-z_$][\w$]*)\s*:\s*$/.exec(once);
        if (m) yol.unshift(m[1]);
        else {
          const c2 = /\.([A-Za-z_$][\w$]*)\s*\(\s*$/.exec(once);
          if (c2) yol.unshift(c2[1]);
        }
      } else derinlik--;
    }
  }
  return yol;
}

/** Satış kalemi okuyan sorgular — ada değil, YOLA bakarak. */
const SATIS_DISI = /^(returns?|returnItems|compensations|notice|fees)$/;

type Bulgu = { yol: string; etiket: string; blok: string; hamBlok: string };

function satisKalemiSorgulari(
  yol: string,
  kaynak: string,
  ham: string,
): Bulgu[] {
  const bulgular: Bulgu[] = [];

  /**
   * ① `saleItem.findMany/aggregate/count/…` — doğrudan kalem sorgusu.
   *
   * ⛔ YALNIZ KÜME SEÇEN ÇAĞRILAR. `create` bir satır YARATIR; `update` /
   * `delete` TEKİL bir kimliği hedefler — orada "kaldırılmışları eleme" diye
   * bir soru YOKTUR ve süzgeç istemek, kaldırmanın kendi yazımını suçlamak
   * olurdu. Küme YAZANLAR (`updateMany`/`deleteMany`) listede kalır: onlar
   * bir SORGUNUN üstüne yazar.
   */
  const KUME_SECEN =
    /^(findMany|findFirst|findUnique|findUniqueOrThrow|findFirstOrThrow|aggregate|count|groupBy|updateMany|deleteMany)$/;
  for (const m of kaynak.matchAll(/\bsaleItem\.(\w+)\(\s*\{/g)) {
    if (!KUME_SECEN.test(m[1])) continue;
    const acilis = kaynak.indexOf("{", m.index);
    bulgular.push({
      yol,
      etiket: `saleItem.${m[1]}() @${satir(kaynak, m.index)}`,
      blok: kaynak.slice(acilis, blokSonu(kaynak, acilis)),
      hamBlok: ham.slice(acilis, blokSonu(kaynak, acilis)),
    });
  }

  /** ② Satış sorgusundaki `items:` ilişkisi — iade kalemleri hariç. */
  for (const m of kaynak.matchAll(/\bitems\s*:\s*\{/g)) {
    const acilis = kaynak.indexOf("{", m.index);
    const anahtarlar = anahtarYolu(kaynak, m.index);
    if (anahtarlar.some((a) => SATIS_DISI.test(a))) continue;
    bulgular.push({
      yol,
      etiket: `items: @${satir(kaynak, m.index)}`,
      blok: kaynak.slice(acilis, blokSonu(kaynak, acilis)),
      hamBlok: ham.slice(acilis, blokSonu(kaynak, acilis)),
    });
  }

  return bulgular;
}

function satir(kaynak: string, indeks: number): number {
  return kaynak.slice(0, indeks).split("\n").length;
}

/**
 * YORUMLARI MASKELER — SATIR NUMARALARINI BOZMADAN.
 *
 * ⛔ NİYE GEREKLİ: bir yasağı ANLATAN yorum, o yasağı ÇİĞNEMİŞ sayılmaz.
 * `ice-aktarma-serhi.ts`in doküman bloğunda örnek olarak yazılmış
 * `items: { some: … }` satırları vardı ve bekçi onları GERÇEK SORGU sanıp
 * iki uydurma ihlal saydı. _(Anayasa: "her yeni ölçüt yorumsuz kodda arar".)_
 *
 * ⚠ VE MASKE UZUNLUK KORUR: yorumu silmek indeksleri kaydırır ve satır
 * numarası yanlış yeri işaret eder. Boşlukla dolduruluyor, satır sonları
 * korunuyor — hem desen kayboluyor hem konum doğru kalıyor.
 */
function yorumMaskeli(kaynak: string): string {
  return kaynak.replace(
    /\/\*[\s\S]*?\*\/|(^|[^:])\/\/[^\n]*/g,
    (m, onek) =>
      (onek ?? "") + m.slice((onek ?? "").length).replace(/[^\n]/g, " "),
  );
}

console.log("\n2) DESEN YASAĞI — para okuyan her SORGU süzüyor");

/**
 * ⚠ ÖLÇÜT ADA DEĞİL KULLANIMA BAĞLI: bir dosya `unitPriceAmount` kelimesini
 * yorumda da taşıyabilir. Aranan şey SATIŞ kalemi üzerinden PARA/ADET
 * hesabıdır — yani `unitPriceAmount` ile `quantity`nin birlikte geçtiği,
 * satış tarafında çalışan dosya.
 */
const MUAFIYET = /KALEM_SUZGECI MUAF:[^\n]{20,}/;
const hepsi = dosyalar("src");
const satisParaOkuyanlar = hepsi.filter((y) => {
  const kod = readFileSync(y, "utf8");
  if (!kod.includes("unitPriceAmount")) return false;
  if (!/quantity/.test(kod)) return false;
  /** Alım tarafı bu kuralın dışında — `PurchaseItem`in kaldırması yok. */
  return /saleItem|sale\.items|satis\.items|SaleItem/.test(kod);
});

/** ⭐ TABAN DOLU — liste boşalırsa döngü hiçbir şey ölçmez ve bekçi körelir. */
kontrol(
  "TABAN DOLU — satış kaleminden para okuyan dosya (" + satisParaOkuyanlar.length + ")",
  satisParaOkuyanlar.length >= 15,
);

const tumBulgular: Bulgu[] = [];
for (const yol of satisParaOkuyanlar) {
  const ham = readFileSync(yol, "utf8");
  tumBulgular.push(
    ...satisKalemiSorgulari(yol.replace(/\\/g, "/"), yorumMaskeli(ham), ham),
  );
}

/**
 * ⭐ TABAN DOLU — İKİNCİ KEZ, VE BU SEFER SORGU SAYISINDA. Blok çıkarıcı
 * bozulursa (parantez sayımı, anahtar yolu) liste boşalır ve `every` sessizce
 * herkesi geçirirdi. _(Anayasa: "`EVERY` kapısı taban doluluğunu ayrıca
 * kanıtlar".)_
 */
kontrol(
  "TABAN DOLU — çıkarılan satış kalemi sorgusu (" + tumBulgular.length + ")",
  tumBulgular.length >= 25,
);

for (const b of tumBulgular) {
  const suzuyor =
    b.blok.includes("KALEM_GECERLI") ||
    b.blok.includes("kalemGecerliMi") ||
    b.blok.includes("kaldirildiAt");
  kontrol(
    `${b.yol} — ${b.etiket}`,
    /**
     * ⚠ MUAFİYET HAM METİNDEN OKUNUR — beyan bir YORUMDUR ve maskelenmiş
     * metinde yok olur. Süzgeç ise yorumsuz koddan aranır: bir yasağı
     * ANLATAN yorum, o yasağı yerine getirmiş sayılmaz.
     */
    suzuyor || MUAFIYET.test(b.hamBlok),
  );
}
kosanBolumler.push("desen yasağı");

const BOLUM_SAYISI = 2;
if (kosanBolumler.length !== BOLUM_SAYISI) {
  console.log(
    `\nKOŞUM YARIM KALDI — sonuç GEÇERSİZ (${kosanBolumler.length}/${BOLUM_SAYISI})\n`,
  );
  process.exit(1);
}

console.log(
  "\n" + (hata === 0 ? "TÜM KONTROLLER GEÇTİ" : "BAŞARISIZ") +
    " (" + gecen + "/" + (gecen + hata) + ")\n",
);
process.exit(hata === 0 ? 0 : 1);
