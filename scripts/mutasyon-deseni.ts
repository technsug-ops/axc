import { writeFileSync } from "node:fs";

/**
 * ============================================================================
 *  MUTASYON DESENİ — SATIR SONU NORMALLEŞTİRME · TEK GÖVDE
 * ----------------------------------------------------------------------------
 *  ⛔ NİYE ORTAK GÖVDE (08.09.2026, K190): bu fonksiyon **16 harness'te ayrı
 *  ayrı** yazılıydı. Ölçüldü: 15'i birebir aynı, biri (`toplu-kargo`)
 *  `replaceAll` kullanıyordu — davranış aynı, yazılış farklı. Yani bugün bir
 *  hata YOK; ama çapa bekçisi (`mutasyon-capa:dogrula`) harness'lerle **aynı
 *  ölçüyle** saymak zorunda ve onu 17. kopya olarak yazmak, tam da o
 *  bekçinin önlemek istediği şeyi üretirdi.
 *  _(Anayasa: "kopyası olan seçici ölçüt iki kat tehlikelidir — ölçüt tek
 *  gövdeye taşınır".)_
 *
 *  ⚠ NİYE GEREKLİ: depoda dosyaların bir kısmı CRLF, bir kısmı LF. Kaynakta
 *  `"\n"` ile yazılmış bir desen, CRLF bir dosyada HİÇBİR ŞEYLE eşleşmez ve
 *  mutasyon sessizce "uygulanamadı" olur.
 *  _(Anayasa: "metni okuyan kontrol, metnin geliş biçiminden bağımsız okur —
 *  düzeltme tek tek yamamak değil, OKUMA KAPISINI kurmaktır".)_
 * ============================================================================
 */

/** Satır sonlarını hedef dosyanın biçimine uydurur (depoda CRLF de var). */
export function desenNormalle(kaynak: string, desen: string): string {
  return kaynak.includes("\r\n") ? desen.split("\n").join("\r\n") : desen;
}

/**
 * Desenin kaynakta KAÇ KEZ geçtiği — harness'in kullandığı sayımın ta
 * kendisi. Ayrı yazılsaydı çapa bekçisi ile harness farklı sayabilirdi.
 */
export function desenAdedi(kaynak: string, desen: string): number {
  return kaynak.split(desenNormalle(kaynak, desen)).length - 1;
}

/**
 * ============================================================================
 *  DAYANIKLI YAZMA — WINDOWS GEÇİCİ KİLİDİ (K251-②, 24.09.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ VAKA (İKİNCİ KEZ): `panel-mutasyon:kontrol` 4. mutasyonda çöktü —
 *      Error: UNKNOWN: unknown error, open 'src/app/page.tsx'  (errno -4094)
 *      at writeFileSync  ← mutasyonu UYGULAYAN yazım
 *  Harness aynı dosyayı saniyeler içinde onlarca kez yazıp geri alıyor;
 *  Windows'ta tarayıcı/izleyici dosyayı bir an tutunca `open` düşüyor. İlk
 *  vaka 23.09 turunda «Node.js v24.18.1» kuyruğuyla kalmıştı (K251 bunun
 *  için yazıldı); tam çıktı gelince sebep okundu. Dosya sağlam kaldı
 *  (`finally` geri yazdı, `cmp` HEAD ile bit-bit eşit).
 *  _(Anayasa: «yönetilemeyen bağımlılık — üçüncü şans verilmez»: iki tekrar,
 *  bizim taraf ölçüldü, teşhis var → mekanizma.)_
 *
 *  Yalnız GEÇİCİ kodlarda yeniden dener; başka her hata anında fırlar.
 *  Öteki 36 harness hâlâ çıplak `writeFileSync` → K263 (pano).
 * ============================================================================
 */
export const YAZMA_DENEME = 10;
export const YAZMA_ARALIGI_MS = 200;
const GECICI_KODLAR = new Set(["UNKNOWN", "EBUSY", "EPERM", "EACCES"]);

/** Geçici kilitte bekleyip yeniden dener; kaçıncı denemede yazdığını döner. */
export function dayanikliYaz(yol: string, icerik: string): number {
  for (let deneme = 1; ; deneme++) {
    try {
      writeFileSync(yol, icerik, "utf8");
      return deneme;
    } catch (e) {
      const kod = (e as NodeJS.ErrnoException).code ?? "";
      if (!GECICI_KODLAR.has(kod) || deneme >= YAZMA_DENEME) throw e;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, YAZMA_ARALIGI_MS);
    }
  }
}
