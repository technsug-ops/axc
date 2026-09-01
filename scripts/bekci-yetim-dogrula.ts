/**
 * ============================================================================
 *  YETİM BEKÇİ YASAĞI (K26, 01.09.2026)
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run bekci-yetim:dogrula
 *
 *  ⛔ NİYE VAR: `scripts/kart-dogrula.ts` 16.08.2026'da yazıldı, 48 ölçüt
 *  taşıyordu ve **iki hafta boyunca hiç koşmadı.** Sebep bir hata değil bir
 *  AD ÇAKIŞMASIYDI: `kart:dogrula` komutunu ÜRÜN kartı bekçisi aldı, kredi
 *  kartı bekçisi `package.json`da referanssız kaldı. Tur komut listesini
 *  package.json'dan okuduğu için dosya sessizce görünmez oldu.
 *
 *  ⚠ VE SESSİZLİK EN PAHALI BİÇİMİYDİ: dosya duruyordu, `tsc` onu
 *  derliyordu, kaynak okuyan biri "bu alan korunuyor" diye okuyordu.
 *  Yeşil bir tur, koşmayan bir bekçi hakkında hiçbir şey söylemez.
 *
 *  ── ⭐ ÖLÇÜT DOSYA LİSTESİ DEĞİL, TERSTEN KURULU ────────────────────────
 *  "Şu bekçiler bağlı mı" diye saymak, yarın yazılan bekçiyi kaçırırdı —
 *  tam da bu hatanın bir kat yukarıda tekrarı olurdu. Ölçüt şudur:
 *
 *      `scripts/` altındaki HER `*-dogrula.ts` / `*-bekci.ts` /
 *      `*-kontrol.ts` dosyasına package.json'dan bir komut İŞARET ETMELİ.
 *
 *  Böylece yarın eklenen dosya da yakalanır ve kimsenin listeye ekleme
 *  hatırlaması gerekmez.
 *
 *  ── ⚠ MUAFİYET BEYANLA VE GEREKÇEYLE ───────────────────────────────────
 *  Bağlanmayacak bir dosya varsa kendi başlığında ADIYLA beyan eder:
 *
 *      BEKCI SINIFI: BAGIMSIZ — <gerekçe>
 *
 *  Gerekçesiz muafiyet KIRMIZI olur; muafiyet bedava değildir.
 *  _(Anayasa: "sınıf, kendisinden türetilemiyorsa beyan edilir".)_
 * ============================================================================
 */

import { readFileSync, readdirSync } from "node:fs";

let basarisiz = 0;
let calisan = 0;
const BOLUM_SAYISI = 2;
const kosanBolumler: string[] = [];

function kontrol(ad: string, kosul: boolean, ayrinti?: unknown) {
  calisan++;
  if (kosul) {
    console.log(`  OK    ${ad}`);
    return;
  }
  basarisiz++;
  console.log(`  HATA  ${ad}`);
  if (ayrinti !== undefined) console.log(`        ${JSON.stringify(ayrinti)}`);
}

console.log("=".repeat(70));
console.log("  YETİM BEKÇİ YASAĞI");
console.log("=".repeat(70));

const paket = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
const komutlar = Object.entries(paket.scripts);

/** Bir komutun işaret ettiği betik dosyası (varsa). */
function komutunDosyasi(deger: string): string | null {
  const m = /scripts\/([A-Za-z0-9_-]+\.ts)/.exec(deger);
  return m ? (m[1] ?? null) : null;
}

const isaretEdilen = new Set(
  komutlar.map(([, d]) => komutunDosyasi(d)).filter((x): x is string => x !== null),
);

/**
 * ⛔ ULAŞILABİLİRLİK KOMUTLA SINIRLI DEĞİL — İÇE AKTARIM DA ULAŞTIRIR.
 *
 * İlk yazımda ölçüt yalnız package.json'a bakıyordu ve `yetki-bekci.ts`yi
 * "yetim" ilan etti. Ölçüldü: o dosya bir KÜTÜPHANE — tur içindeki
 * `yetki-dogrula.ts` onu `import` ediyor, yani her turda ÇALIŞIYOR.
 * Kendi komutu olmaması yetim olduğunu göstermez.
 *
 * _(Anayasa: "sınıf, kendisinden türetilemiyorsa beyan edilir" — ama
 * türetilebilen sınıf TAHMİNLE değil ÖLÇÜMLE ayrılır; buradaki ölçü içe
 * aktarım grafiğidir.)_
 */
const tumKaynaklar = readdirSync("scripts")
  .filter((d) => d.endsWith(".ts"))
  .map((d) => [d, readFileSync(`scripts/${d}`, "utf8")] as const);

function iceAktaran(dosya: string): string[] {
  const modul = dosya.replace(/[.]ts$/, "");
  return tumKaynaklar
    .filter(
      ([ad, kaynak]) =>
        ad !== dosya && new RegExp(`from ["'][.]/${modul}["']`).test(kaynak),
    )
    .map(([ad]) => ad);
}

// ===========================================================================
// 1) HER BEKÇİ DOSYASINA BİR KOMUT İŞARET EDİYOR MU
// ===========================================================================
{
  console.log("\n── 1) BAĞLANTI ─────────────────────────────────────────");

  const bekciDosyalari = readdirSync("scripts").filter((d) =>
    /-(dogrula|bekci|kontrol)\.ts$/.test(d),
  );

  /**
   * ⛔ TABAN DOLULUĞU AYRICA KANITLANIR: boş listede `every`/`filter`
   * sessizce yeşil verir ve bu bekçi kendi hatasına düşerdi.
   * _(Anayasa: "every/all kapıları taban doluluğunu ayrıca kanıtlar".)_
   */
  kontrol(
    `bekçi dosyası bulundu (${bekciDosyalari.length})`,
    bekciDosyalari.length >= 40,
  );

  const yetimler: string[] = [];
  const beyanliMuaf: string[] = [];
  const gerekcesizMuaf: string[] = [];

  const kutuphaneler: string[] = [];
  for (const dosya of bekciDosyalari) {
    if (isaretEdilen.has(dosya)) continue;
    /** Komutu yok ama tur içindeki bir bekçi onu içe alıyorsa ULAŞILIYOR. */
    const alanlar = iceAktaran(dosya).filter((a) => isaretEdilen.has(a));
    if (alanlar.length > 0) {
      kutuphaneler.push(`${dosya} ← ${alanlar.join(", ")}`);
      continue;
    }
    const kaynak = readFileSync(`scripts/${dosya}`, "utf8");
    const m = /BEKCI SINIFI: BAGIMSIZ(.*)/.exec(kaynak);
    if (m === null) {
      yetimler.push(dosya);
      continue;
    }
    /** Beyan tek başına yetmez — gerekçe ARANIR. */
    const gerekce = (m[1] ?? "").replace(/^[\s—-]+/, "").trim();
    if (gerekce.length < 15) gerekcesizMuaf.push(dosya);
    else beyanliMuaf.push(dosya);
  }

  kontrol(
    `package.json'a bağlanmamış bekçi YOK (yetim: ${yetimler.length})`,
    yetimler.length === 0,
    yetimler,
  );
  kontrol(
    `gerekçesiz muafiyet YOK (${gerekcesizMuaf.length})`,
    gerekcesizMuaf.length === 0,
    gerekcesizMuaf,
  );
  if (beyanliMuaf.length > 0) {
    console.log(`        beyanlı muaf: ${beyanliMuaf.join(", ")}`);
  }
  if (kutuphaneler.length > 0) {
    console.log(`        içe aktarımla ulaşılan: ${kutuphaneler.join(" · ")}`);
  }

  kosanBolumler.push("bağlantı");
}

// ===========================================================================
// 2) BAĞLI KOMUT TURA GİRİYOR MU
// ===========================================================================
//
// ⚠ BAĞLANMAK YETMEZ: tur yalnız `:dogrula` · `:bekci` · `:kontrol` ile
// biten ve `canli:` ile başlamayan komutları koşar (`scripts/bekci.ts`).
// `kart-borcu:kontrolet` gibi bir ad bağlı olur ama TURA GİRMEZ — yani
// yine hiç koşmaz, üstelik bu sefer "bağlı" göründüğü için daha da sinsi.
{
  console.log("\n── 2) TURA GİRİŞ ───────────────────────────────────────");

  const turaGiren = (ad: string) =>
    (ad.endsWith(":dogrula") || ad.endsWith(":bekci") || ad.endsWith(":kontrol")) &&
    !ad.startsWith("canli:") &&
    !ad.endsWith(":prova");

  const turdaki = komutlar.filter(([ad]) => turaGiren(ad));
  kontrol(`tura giren komut sayısı (${turdaki.length})`, turdaki.length >= 40);

  /**
   * ⛔ ÖLÇÜ KOMUT DEĞİL, DOSYA KAPSAMASI.
   *
   * İlk yazımda ölçüt "bekçiye işaret edip tura girmeyen komut" arıyordu
   * ve ÜÇ meşru komutu suçladı: `prebuild` (deploy bekçisini build'den
   * ÖNCE koşturur — dosya zaten `deploy:bekci` ile turda) ve iki `canli:`
   * komutu (canlı veritabanı istedikleri için tur DIŞINDA olmaları
   * TASARIM). Yanlış soruydu: bir dosyanın ikinci bir komuttan da
   * çağrılması kusur değil.
   *
   * Doğru soru: **bu bekçi DOSYASI tur içinden koşuyor mu?**
   */
  const turdakiDosyalar = new Set(
    turdaki
      .map(([, d]) => komutunDosyasi(d))
      .filter((x): x is string => x !== null),
  );
  const turDisi = komutlar
    .filter(([ad]) => !turaGiren(ad))
    .map(([ad, d]) => [ad, komutunDosyasi(d)] as const)
    .filter(
      ([, dosya]) =>
        dosya !== null &&
        /-(dogrula|bekci|kontrol)\.ts$/.test(dosya) &&
        !turdakiDosyalar.has(dosya) &&
        !/BEKCI SINIFI: BAGIMSIZ/.test(readFileSync(`scripts/${dosya}`, "utf8")),
    );
  kontrol(
    `tur dışında kalan ve BEYANI OLMAYAN bekçi dosyası YOK (${turDisi.length})`,
    turDisi.length === 0,
    turDisi.map(([ad, dosya]) => `${ad} → ${dosya}`),
  );

  /** K26'nın kendisi: kredi kartı bekçisi artık turda. */
  kontrol(
    "kart-borcu:dogrula turda",
    turdaki.some(([ad]) => ad === "kart-borcu:dogrula"),
  );

  kosanBolumler.push("tura giriş");
}

// ===========================================================================
console.log("");
if (kosanBolumler.length !== BOLUM_SAYISI) {
  console.log(
    `KOŞUM YARIM KALDI — sonuç GEÇERSİZ (${kosanBolumler.length}/${BOLUM_SAYISI})`,
  );
  process.exit(1);
} else if (basarisiz === 0) {
  console.log(`TÜM KONTROLLER GEÇTİ (${calisan})`);
  process.exit(0);
} else {
  console.log(`${basarisiz} KONTROL BAŞARISIZ (${calisan} kontrol içinde)`);
  process.exit(1);
}
