/**
 * ============================================================================
 *  MUTASYON HARNESS'LERİNİN HEDEF DOSYALARI (K202 SORUN B)
 * ----------------------------------------------------------------------------
 *  ⛔ NİYE VAR: 23 mutasyon bekçisi turun %57,8'i (K202, 09.09.2026) —
 *  paralelleştirme performans için gerekliydi. Ama İKİ harness AYNI hedef
 *  dosyayı mutasyona uğratıp `finally`de geri yazıyorsa, paralel koşum
 *  YARIŞ DURUMU üretir: biri ötekinin mutantını "asıl" sanıp geri yazar —
 *  tam bugün onardığımız sıfır-bayt bozulmasının (kanal-kargo-damgasi.ts)
 *  BAŞKA bir türü, kesinti yerine eşzamanlılıkla.
 *
 *  Bu modül İKİ şeyi tek yerden sağlar:
 *  1) `gercekHedefler(harnessDosyasi)` — bir harness'in GERÇEKTE hangi
 *     dosyaları okuyup yazdığını, kaynağı TARAYARAK bulur (`readFileSync`/
 *     `writeFileSync` çağrılarının ilk argümanını takip eder — değişken adı
 *     ne olursa olsun, çünkü hedef isimlendirme harness'ten harness'e
 *     değişiyor: `GOVDE`, `KURAL`, `m.dosya` vb.)
 *  2) `SIRALI_MUTASYON_GRUP` — GERÇEK çakışmalardan BEYAN EDİLMİŞ, elle
 *     gözden geçirilmiş küme: bu npm-script adları birbirine göre SIRALI
 *     koşar, aynı dosyayı hedefliyor olabilirler.
 *
 *  ⚠ BEYAN TEK BAŞINA YETMEZ — `mutasyon-cakisma:dogrula` her koşumda GERÇEK
 *  çakışmaları yeniden tarar ve BEYANLA karşılaştırır: yarın eklenen bir
 *  harness'in undeclared bir çakışma açması SESSİZCE geçemez.
 *  _(Anayasa: "bekçi ölçütü elle tutulan liste değil, tersten kurulur" —
 *  ama BURADA liste GÜVENLİK için var, ÖLÇÜM ayrıca ona bekçilik ediyor.)_
 * ============================================================================
 */
import { readFileSync } from "node:fs";

/** npm-script adından (`xxx-mutasyon:kontrol`) harness dosya yoluna çevirir. */
export function harnessDosyaYolu(npmAdi: string): string {
  return "scripts/" + npmAdi.replace(":", "-") + ".ts";
}

export function mutasyonAdiMi(npmAdi: string): boolean {
  return /-mutasyon:kontrol$/.test(npmAdi);
}

/**
 * Bir harness dosyasının GERÇEKTE dokunduğu dosya yollarını kaynağı
 * tarayarak çıkarır. İki biçimi de yakalar:
 *   - `const GOVDE = "src/lib/x.ts"` + `readFileSync(GOVDE, ...)`
 *   - `dosya: "literal"` / `dosya: SABIT` (mutasyon nesneleri dizisinde) +
 *     `readFileSync(m.dosya, ...)` (alan erişimi — tek tek çözülemez, o
 *     yüzden TÜM `dosya:` değerleri toplanır)
 */
export function gercekHedefler(harnessYolu: string): string[] {
  const metin = readFileSync(harnessYolu, "utf8");

  const sabitler = new Map<string, string>();
  for (const m of metin.matchAll(/^const\s+([A-Za-z_]+)\s*=\s*"([^"]+)"\s*;/gm)) {
    sabitler.set(m[1]!, m[2]!);
  }

  const hedefler = new Set<string>();
  for (const m of metin.matchAll(
    /(?:readFileSync|writeFileSync)\(\s*([A-Za-z_.]+|"[^"]+")\s*,/g,
  )) {
    const arg = m[1]!;
    if (arg.startsWith('"')) {
      hedefler.add(JSON.parse(arg));
      continue;
    }
    if (arg.includes(".")) {
      // per-mutasyon alan erişimi (örn. `m.dosya`) — dizideki TÜM dosya:
      // değerlerini topla (hangi mutasyonun hangisine denk geldiğini ayırt
      // etmiyoruz; güvenlik amaçlı taramada bu FAZLA-KAPSAMA sorun değil).
      for (const mm of metin.matchAll(/\bdosya:\s*(?:([A-Za-z_]+)|"([^"]+)")/g)) {
        if (mm[2]) hedefler.add(mm[2]);
        else if (mm[1] && sabitler.has(mm[1])) hedefler.add(sabitler.get(mm[1])!);
      }
      continue;
    }
    if (sabitler.has(arg)) hedefler.add(sabitler.get(arg)!);
  }
  return [...hedefler];
}

/**
 * Verilen npm-script adları arasında GERÇEK (kaynaktan taranmış) dosya
 * çakışmalarını bulur. Birbirine bağlı harness'leri BİRLİKTE gruplar
 * (A↔B ve B↔C çakışıyorsa, A/B/C aynı grupta — transitiflik).
 */
export function gercekCakismaGruplari(npmAdlari: string[]): string[][] {
  const hedeflerHarita = new Map<string, string[]>();
  for (const ad of npmAdlari) {
    hedeflerHarita.set(ad, gercekHedefler(harnessDosyaYolu(ad)));
  }

  // union-find
  const ebeveyn = new Map<string, string>(npmAdlari.map((a) => [a, a]));
  function bul(x: string): string {
    while (ebeveyn.get(x) !== x) x = ebeveyn.get(x)!;
    return x;
  }
  function birlestir(a: string, b: string) {
    const ka = bul(a);
    const kb = bul(b);
    if (ka !== kb) ebeveyn.set(ka, kb);
  }

  const dosyaSahipleri = new Map<string, string[]>();
  for (const ad of npmAdlari) {
    for (const dosya of hedeflerHarita.get(ad)!) {
      if (!dosyaSahipleri.has(dosya)) dosyaSahipleri.set(dosya, []);
      dosyaSahipleri.get(dosya)!.push(ad);
    }
  }
  for (const sahipler of dosyaSahipleri.values()) {
    for (let i = 1; i < sahipler.length; i++) birlestir(sahipler[0]!, sahipler[i]!);
  }

  const gruplar = new Map<string, string[]>();
  for (const ad of npmAdlari) {
    const kok = bul(ad);
    if (!gruplar.has(kok)) gruplar.set(kok, []);
    gruplar.get(kok)!.push(ad);
  }
  return [...gruplar.values()].filter((g) => g.length > 1).map((g) => g.sort());
}

/**
 * ⭐ BEYAN (K202 SORUN B, 09.09.2026 ölçümü) — GERÇEK ÇAKIŞMA GRUBU.
 *
 * Bu 7 harness aşağıdaki 4 dosyayı paylaşıyor ve bu yüzden birbirlerine
 * göre SIRALI koşar (paralel havuza girmezler):
 *   messages/tr.json           ← kare-tanisi · mal-kabul · toplu-kargo
 *   src/app/page.tsx           ← mal-kabul · panel · urun-analizi
 *   src/app/satislar/page.tsx  ← liste-hafizasi · toplu-kargo
 *   src/lib/panel.ts           ← aylik-marj · panel
 *
 * `mal-kabul` ve `panel` köprü görevi görüyor, bu yüzden tek bir bağlı
 * küme oluşuyor (transitif olarak hepsi birbirine bağlı).
 *
 * ⚠ BU LİSTE ELLE TUTULUYOR AMA KENDİ BAŞINA GÜVENİLMEZ — her koşumda
 * `mutasyon-cakisma:dogrula` gerçek taramayla karşılaştırır. Liste yanlış
 * çıkarsa (ör. yeni bir harness undeclared bir çakışma açtıysa) o bekçi
 * KIRMIZI yanar.
 */
export const SIRALI_MUTASYON_GRUP: readonly string[] = [
  "aylik-marj-mutasyon:kontrol",
  "kare-tanisi-mutasyon:kontrol",
  "liste-hafizasi-mutasyon:kontrol",
  "mal-kabul-mutasyon:kontrol",
  "panel-mutasyon:kontrol",
  "toplu-kargo-mutasyon:kontrol",
  "urun-analizi-mutasyon:kontrol",
];
