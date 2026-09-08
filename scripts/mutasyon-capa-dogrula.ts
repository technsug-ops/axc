import { readFileSync, readdirSync } from "node:fs";
import ts from "typescript";

import { desenAdedi } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  ÇAPA BEKÇİSİ — HER MUTASYONUN ÇAPASI HEDEFİNDE TAM BİR KEZ GEÇER
 * ----------------------------------------------------------------------------
 *      npm run mutasyon-capa:dogrula
 *
 *  BETIK SINIFI: SUREKLI — kapıdan geçmeli. Hiçbir şey YAZMAZ.
 *
 *  ⛔ NİYE VAR (mimar kararı 08.09.2026, K190): bir refaktör bir mutasyon
 *  harness'inin ÇAPASINI sildi ve bu ancak ~15 dakikalık tam tur sonunda
 *  görüldü — push reddedilerek. Vaka: `/stok` arama koşulu ortak gövdeye
 *  bağlanınca `stok-siralama-mutasyon`daki "çıplak koşula geri döndü"
 *  mutasyonunun çapası yok oldu.
 *
 *  ⭐ HARNESS DOĞRU DAVRANMIŞTI ("geçti" değil "ÖLÇÜLEMEDİ" dedi); eksik olan
 *  şey HIZDI. Bu bekçi aynı ölçütü saniyeler içinde koşar: mutasyonları
 *  UYGULAMAZ, yalnız çapaların yerinde olduğunu sınar.
 *  _(Anayasa: "refaktör, çapalı harness'i de taşır" — o kuralın MEKANİZMASI.)_
 *
 *  ── İKİ BOZULMA BİÇİMİ, İKİSİ DE "ÖLÇÜLEMEDİ" ─────────────────────────
 *  · 0 kez  — çapa KOPMUŞ (refaktör sildi ya da taşıdı)
 *  · >1 kez — çapa BELİRSİZ: hangi yeri bozduğu bilinmiyor, mutasyon başka
 *    bir davranışı sınıyor olabilir
 *  İkisi de "geçti" DEĞİLDİR ve ikisi de bu bekçiyi kırmızı yakar.
 *
 *  ── ⚠ KAYNAK METİN TARANMIYOR, AST OKUNUYOR ───────────────────────────
 *  `bul` değerleri kaçış dizisi, tırnak karışımı ve dize BİRLEŞTİRME
 *  içeriyor. Metin taramak bunları yanlış okur ve bekçi yanlış şeyi ölçer.
 *  TypeScript'in kendi ayrıştırıcısı dizenin PİŞMİŞ değerini veriyor;
 *  `dosya` alanındaki sabit adları da aynı dosyadaki bildirimlerinden
 *  çözülüyor.
 *
 *  ⛔ HARNESS'LER İÇE AKTARILAMAZ: modül yüklenince turu KOŞARLAR (üst düzey
 *  çağrı, `main()` sarmalı yok). Bu yüzden değer okuma yolu AST'dir.
 *
 *  ── SAYIM ORTAK GÖVDEDEN ──────────────────────────────────────────────
 *  `desenAdedi` harness'lerin kullandığı sayımın ta kendisi
 *  (`scripts/mutasyon-deseni.ts`). Ayrı yazılsaydı bu bekçi ile harness
 *  farklı sayar ve biri ötekinin görmediğini görürdü.
 *  _(Anayasa: "iki yerde iki ölçüt olmaz".)_
 * ============================================================================
 */

type Capa = {
  harness: string;
  ad: string;
  dosya: string;
  bul: string;
};

/** Aynı dosyadaki sabit dize bildirimlerini çözer. */
function sabitler(kaynak: ts.SourceFile): Map<string, string> {
  const harita = new Map<string, string>();
  for (const bildirim of kaynak.statements) {
    if (!ts.isVariableStatement(bildirim)) continue;
    for (const d of bildirim.declarationList.declarations) {
      if (!ts.isIdentifier(d.name) || !d.initializer) continue;
      if (ts.isStringLiteral(d.initializer)) {
        harita.set(d.name.text, d.initializer.text);
      }
    }
  }
  return harita;
}

/** Dize · birleştirme · sabit adı → pişmiş metin. Çözülemezse null. */
function metinCoz(
  ifade: ts.Expression,
  sabit: Map<string, string>,
): string | null {
  if (ts.isStringLiteral(ifade) || ts.isNoSubstitutionTemplateLiteral(ifade)) {
    return ifade.text;
  }
  if (ts.isIdentifier(ifade)) return sabit.get(ifade.text) ?? null;
  /**
   * ⚠ `String.fromCharCode(10)` — BU DEPONUN KENDİ DEYİMİ, tesadüf değil.
   * Ters bölülü kaçışlar burada İKİ KEZ bozuldu (görünmez karakter · yutulan
   * kaçış), bu yüzden bazı çapalar satır sonunu kod noktasıyla kuruyor.
   * Çözücü bunu bilmezse o çapalar "incelenemeyen" kalır — ölçülmemiş bir
   * koruma, ölçülmüş sanılan bir korumadan iyidir ama yine de eksiktir.
   * _(Anayasa: "kod üreten araç, kaçış dizilerini bozuk yazabilir".)_
   */
  if (
    ts.isCallExpression(ifade) &&
    ts.isPropertyAccessExpression(ifade.expression) &&
    ts.isIdentifier(ifade.expression.expression) &&
    ifade.expression.expression.text === "String" &&
    ifade.expression.name.text === "fromCharCode"
  ) {
    const kodlar: number[] = [];
    for (const arg of ifade.arguments) {
      if (!ts.isNumericLiteral(arg)) return null;
      kodlar.push(Number(arg.text));
    }
    return String.fromCharCode(...kodlar);
  }
  if (
    ts.isBinaryExpression(ifade) &&
    ifade.operatorToken.kind === ts.SyntaxKind.PlusToken
  ) {
    const sol = metinCoz(ifade.left, sabit);
    const sag = metinCoz(ifade.right, sabit);
    return sol === null || sag === null ? null : sol + sag;
  }
  return null;
}

function capalariTopla(harnessYolu: string): {
  capalar: Capa[];
  capasiz: number;
  cozulemeyen: string[];
} {
  const metin = readFileSync(harnessYolu, "utf8");
  const kaynak = ts.createSourceFile(
    harnessYolu,
    metin,
    ts.ScriptTarget.Latest,
    true,
  );
  const sabit = sabitler(kaynak);
  const capalar: Capa[] = [];
  const cozulemeyen: string[] = [];
  let capasiz = 0;

  for (const bildirim of kaynak.statements) {
    if (!ts.isVariableStatement(bildirim)) continue;
    for (const d of bildirim.declarationList.declarations) {
      if (!ts.isIdentifier(d.name) || d.name.text !== "MUTASYONLAR") continue;
      if (!d.initializer || !ts.isArrayLiteralExpression(d.initializer)) {
        continue;
      }
      for (const oge of d.initializer.elements) {
        if (!ts.isObjectLiteralExpression(oge)) continue;
        let ad = "(adsız)";
        let dosya: string | null = null;
        let bul: string | null = null;
        let bulNullMu = false;
        for (const alan of oge.properties) {
          if (!ts.isPropertyAssignment(alan)) continue;
          if (!ts.isIdentifier(alan.name)) continue;
          const anahtar = alan.name.text;
          if (anahtar === "ad") ad = metinCoz(alan.initializer, sabit) ?? ad;
          if (anahtar === "dosya") dosya = metinCoz(alan.initializer, sabit);
          /**
           * ⚠ İKİ SÖZLÜK VAR VE BU ÖLÇÜLDÜ (08.09.2026): 18 harness `bul`
           * diyor, `urun-analizi` `eski` diyor. Yalnız `bul` aransaydı o
           * harness'in 18 çapası SESSİZCE incelenmemiş kalırdı — ve ekranda
           * "temiz" görünürdü.
           * _(Anayasa: "boş sonuç ile temiz sonucu ayırt edemeyen denetim,
           * denetim değildir".)_
           */
          if (anahtar === "bul" || anahtar === "eski") {
            if (alan.initializer.kind === ts.SyntaxKind.NullKeyword) {
              bulNullMu = true;
            } else {
              bul = metinCoz(alan.initializer, sabit);
            }
          }
        }
        /**
         * ⚠ HEDEF HER ZAMAN ÖĞENİN İÇİNDE DEĞİL — ÖLÇÜLDÜ: beş harness
         * (`aylik-marj` · `baglanti-tanisi` · `kart-partileri` · `lot-kipi` ·
         * `parti-bagi-tanisi`) tek bir gövdeyi sınıyor ve hedefi modül
         * düzeyindeki `GOVDE` sabitinden okuyor; mutasyon nesnelerinde
         * `dosya` alanı HİÇ YOK.
         */
        if (dosya === null) dosya = sabit.get("GOVDE") ?? null;
        if (dosya === null) {
          cozulemeyen.push(ad + " — hedef dosya adı ÇÖZÜLEMEDİ");
          continue;
        }
        /**
         * ⚠ Çapası olmayan mutasyon MEŞRU BİR SINIF: hiç var olmayan YENİ
         * bir dosya yaratanlar (ör. bekçinin adını bile bilmediği yeni bir
         * ekran). Çapaları YOKTUR ve aranmaz — ama AYRI SAYILIR, yoksa
         * "çapa bulunamadı" ile "zaten çapasızmış" ayırt edilemez.
         */
        if (bulNullMu) {
          capasiz += 1;
          continue;
        }
        if (bul === null) {
          cozulemeyen.push(ad + " — çapa deseni ÇÖZÜLEMEDİ");
          continue;
        }
        capalar.push({ harness: harnessYolu, ad, dosya, bul });
      }
    }
  }
  return { capalar, capasiz, cozulemeyen };
}

const harnessler = readdirSync("scripts")
  .filter((a) => a.endsWith("-mutasyon-kontrol.ts"))
  .map((a) => "scripts/" + a)
  .sort();

console.log("");
console.log("=".repeat(70));
console.log("  ÇAPA BEKÇİSİ — mutasyon çapaları yerinde mi");
console.log("=".repeat(70));
console.log("");

let incelenen = 0;
let temiz = 0;
let capasizToplam = 0;
const sapan: string[] = [];
const incelenemeyen: string[] = [];

for (const h of harnessler) {
  const sonuc = capalariTopla(h);
  capasizToplam += sonuc.capasiz;
  for (const c of sonuc.cozulemeyen) {
    incelenemeyen.push(h.replace("scripts/", "") + " · " + c);
  }
  for (const c of sonuc.capalar) {
    incelenen += 1;
    let hedef: string;
    try {
      hedef = readFileSync(c.dosya, "utf8");
    } catch {
      incelenemeyen.push(
        h.replace("scripts/", "") +
          " · " +
          c.ad +
          " — hedef dosya OKUNAMADI: " +
          c.dosya,
      );
      continue;
    }
    const adet = desenAdedi(hedef, c.bul);
    if (adet === 1) {
      temiz += 1;
    } else {
      sapan.push(
        h.replace("scripts/", "") +
          "\n       " +
          c.ad +
          "\n       çapa " +
          c.dosya +
          " içinde " +
          adet +
          " kez geçiyor (1 olmalı) — " +
          (adet === 0 ? "ÇAPA KOPMUŞ" : "ÇAPA BELİRSİZ"),
      );
    }
  }
}

console.log("  harness            " + harnessler.length);
console.log("  incelenen çapa     " + incelenen);
console.log("  temiz              " + temiz);
console.log("  sapan              " + sapan.length);
console.log("  incelenemeyen      " + incelenemeyen.length);
console.log(
  "  çapasız            " +
    capasizToplam +
    "   (yeni dosya yaratan mutasyonlar — çapaları YOK)",
);
console.log("");

/**
 * ⛔ TABAN DOLULUĞU AYRICA KANITLANIR: hiç çapa bulunamazsa bu bekçi "temiz"
 * DEĞİL, BOZUK demektir — ve o hâl sessizce yeşil yanardı.
 * _(Anayasa: "boş sonuç ile temiz sonucu ayırt edemeyen denetim, denetim
 * değildir" ve "`every` kapısı taban doluluğunu ayrıca kanıtlar".)_
 */
const TABAN_HARNESS = 15;
const TABAN_CAPA = 100;
if (harnessler.length < TABAN_HARNESS || incelenen < TABAN_CAPA) {
  console.log("  ⛔ TABAN BOŞ ya da BEKLENENDEN KÜÇÜK — sonuç GEÇERSİZ.");
  console.log(
    "     harness " +
      harnessler.length +
      " (>=" +
      TABAN_HARNESS +
      " bekleniyor) · çapa " +
      incelenen +
      " (>=" +
      TABAN_CAPA +
      " bekleniyor)",
  );
  console.log("");
  process.exit(1);
}

if (incelenemeyen.length > 0) {
  console.log("  ⛔ İNCELENEMEYEN — ve bu 'temiz' SAYILMAZ:");
  for (const i of incelenemeyen) console.log("     " + i);
  console.log("");
}

if (sapan.length > 0) {
  console.log("  ⛔ ÇAPASI YERİNDE OLMAYAN MUTASYON:");
  for (const s of sapan) console.log("     " + s);
  console.log("");
  console.log("  ⛔ Bu mutasyonlar ÖLÇÜLEMEZ — koruma kör, harness yeşil sanılır.");
  console.log("     Çare mutasyonu SİLMEK DEĞİL: niyetini koruyup şeklini");
  console.log("     yeni koda taşı.");
  console.log("");
}

if (sapan.length === 0 && incelenemeyen.length === 0) {
  console.log(
    "  ✓  " + incelenen + " çapanın hepsi hedefinde TAM BİR KEZ geçiyor",
  );
  console.log("");
} else {
  process.exit(1);
}
