import { readFileSync } from "node:fs";

import { kalemGecerliMi } from "./n11/yazici";

/**
 * ============================================================================
 *  KANAL-YAZMA BEKÇİSİ (K169 · K194) — KANALA-YAZAN HER AKIŞIN TAAHHÜTLERİ
 * ----------------------------------------------------------------------------
 *      npm run kanal-yazma:dogrula
 *
 *  `api:dogrula`daki KANALA_YAZMASI_BEYANLI beyanının bekçisi. Beyan bir
 *  muafiyet değil TAAHHÜTTÜR; burada ölçülen taahhütler:
 *    ① yazıcı dosyada TEK fiil, TEK uç — ikinci POST/başka fiil yazılamaz
 *    ② eylem RAKAM GÖRÜLMEDEN GÖNDERMEZ (önizleme + pasif düğme)
 *    ③ İZSİZ GÖNDERİM YOK — kabul de red de deftere yazılır
 *    ④ stok İSTEMCİDEN ALINMAZ — sunucu yeniden çözer
 *    ⑤ izin kapısı (`kanal.yaz`) her iki eylemde
 *
 *  ⛔ LİSTE ELLE TUTULMUYOR — BEYANDAN TÜRÜYOR (K194 düzeltmesi).
 *  Bu bekçi K169'da TY yollarına ÇAKILIYDI. İkinci kanal (N11) eklenince
 *  ortaya çıktı ki çakılı bir bekçi **yeni yazıcıyı hiç görmez**: N11
 *  yazıcısı önizlemesiz olsaydı bu dosya yeşil kalırdı. Artık yazıcı listesi
 *  `api-dogrula.ts`teki beyandan okunuyor; üçüncü kanal (HB) eklendiğinde
 *  kimsenin buraya bir satır yazması gerekmeyecek.
 *  _(Anayasa: "bekçi ölçütü elle tutulan liste değil, tersten kurulur".)_
 *
 *  ⚠ EKRAN YOLLARI DA TÜRETİLİYOR: `scripts/<kod>/yazici.ts` →
 *  `src/app/kart/[variantId]/<kod>-gonderim.tsx` ve `<kod>GonderimOnizle` /
 *  `<kod>StokFiyatGonder`. Bir kanal bu adlandırmadan saparsa bekçi onu
 *  BULAMAZ ve kırmızı yanar — sessizce atlamaz.
 *
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

console.log("\nKANAL-YAZMA BEKÇİSİ (K169 · K194)\n");

/* ═══ BEYANDAN TÜRETME ═══════════════════════════════════════════════ */
const apiBekci = readFileSync("scripts/api-dogrula.ts", "utf8");
const beyanBasi = apiBekci.indexOf("KANALA_YAZMASI_BEYANLI = new Map");
const beyanSonu = apiBekci.indexOf("]);", beyanBasi);
const beyanBloku =
  beyanBasi >= 0 && beyanSonu > beyanBasi
    ? apiBekci.slice(beyanBasi, beyanSonu)
    : "";
const yazicilar = [
  ...new Set(
    (beyanBloku.match(/"scripts\/[a-z0-9]+\/yazici\.ts"/g) ?? []).map((x) =>
      x.slice(1, -1),
    ),
  ),
];

/**
 * ⛔ TABAN DOLULUĞU AYRICA KANITLANIR: beyan bloğu okunamazsa liste boşalır
 * ve aşağıdaki döngü HİÇ koşmaz — bekçi "geçti" der, hiçbir şey ölçmeden.
 * _(Anayasa: "`every` kapısı taban doluluğunu ayrıca kanıtlar".)_
 */
kontrol(
  "beyan bloğu okundu ve yazıcı bulundu (taban DOLU)",
  yazicilar.length >= 2,
  yazicilar,
);

for (const yol of yazicilar) {
  const kod = yol.split("/")[1];
  console.log("\n  ── " + kod.toUpperCase() + " (" + yol + ")");

  /* ① TEK FİİL, TEK UÇ */
  const yazici = yorumsuz(readFileSync(yol, "utf8"));
  const postSayisi = yazici.split('method: "POST"').length - 1;
  kontrol("① yazıcıda TAM BİR adet POST var", postSayisi === 1, postSayisi);
  kontrol(
    "①   ...başka fiil yok (PUT/DELETE/PATCH)",
    !yazici.includes('method: "PUT"') &&
      !yazici.includes('method: "DELETE"') &&
      !yazici.includes('method: "PATCH"'),
  );
  /**
   * ⚠ UÇ SABİT: `fetch` çağrısındaki adres bir DEĞİŞKENDEN gelemez. Uç
   * parametreleşirse "tek uç" taahhüdü sözde kalır.
   */
  kontrol(
    "①   ...uç sabit dizeyle yazılı (parametre değil)",
    /fetch\(\s*`\$\{TABAN\}\//.test(yazici),
  );

  /* ② ÖNİZLEME — SALT OKUMA VE AYRI EYLEM */
  const eylem = yorumsuz(
    readFileSync("src/app/kart/[variantId]/actions.ts", "utf8"),
  );
  const onizleAd = kod + "GonderimOnizle";
  const gonderAd = kod + "StokFiyatGonder";
  const basi = eylem.indexOf("export async function " + onizleAd);
  kontrol("② önizleme eylemi VAR (" + onizleAd + ")", basi >= 0);
  if (basi >= 0) {
    const sonu = eylem.indexOf("export async function", basi + 10);
    const blok = eylem.slice(basi, sonu < 0 ? undefined : sonu);
    /**
     * ⛔ ÖNİZLEME YAZMAZ. Yazsaydı "önce göster, sonra sor" protokolü
     * çökerdi: kullanıcı daha onaylamadan kanala gitmiş olurdu.
     */
    /**
     * ⚠ DESEN ÖNCE SAYILDI — VE İLK YAZIMDA SAYILMAMIŞTI. Buraya önce
     * `!blok.includes("Iste(")` yazdım; `yetkiIste(` de o alt dizeyle
     * bitiyor ve ölçüt İKİ KANALDA DA yanlış kırmızı yandı. Aranan adlar
     * artık tam: yazıcı çağrısının kendisi.
     * _(Anayasa: "ÖNCE DESENİ SAY" — bugün üçüncü kez aynı tuzak.)_
     */
    kontrol(
      "②   ...ve SALT OKUMA (yazıcıyı çağırmıyor)",
      !blok.includes("stokFiyatGonder(") && !blok.includes("StokFiyatIste("),
    );
  }
  kontrol("② gönderim eylemi VAR (" + gonderAd + ")", eylem.includes("export async function " + gonderAd));

  /* ③ İZ — KABUL VE RED */
  const gBasi = eylem.indexOf("export async function " + gonderAd);
  const gBlok =
    gBasi >= 0
      ? eylem.slice(gBasi, (() => {
          const s = eylem.indexOf("export async function", gBasi + 10);
          return s < 0 ? eylem.length : s;
        })())
      : "";
  kontrol(
    "③ KABUL izi yazılıyor",
    gBlok.includes('sonuc: "KABUL"') && gBlok.includes('action: "KANAL_GONDERIMI"'),
  );
  kontrol(
    "③ RED de iz bırakıyor (gönderdim-sanıyordum sorusuna cevap)",
    gBlok.includes('sonuc: "RED"'),
  );

  /* ④ STOK SUNUCUDA ÇÖZÜLÜR */
  kontrol(
    "④ stok SUNUCUDA yeniden çözülüyor (istemciden sayı alınmaz)",
    gBlok.includes("await varyantStogu(variantId)"),
  );

  /* ⑤ İZİN KAPISI — İKİ EYLEMDE DE */
  const onizBlok =
    basi >= 0
      ? eylem.slice(basi, (() => {
          const s = eylem.indexOf("export async function", basi + 10);
          return s < 0 ? eylem.length : s;
        })())
      : "";
  kontrol(
    "⑤ izin kapısı ÖNİZLEMEDE",
    onizBlok.includes('yetkiIste("kanal.yaz")'),
  );
  kontrol(
    "⑤ izin kapısı GÖNDERİMDE",
    gBlok.includes('yetkiIste("kanal.yaz")'),
  );

  /* ② DİYALOG — RAKAM GELMEDEN GÖNDER PASİF */
  const dyalogYolu = "src/app/kart/[variantId]/" + kod + "-gonderim.tsx";
  let dyalog = "";
  try {
    dyalog = yorumsuz(readFileSync(dyalogYolu, "utf8"));
  } catch {
    dyalog = "";
  }
  kontrol("② diyalog dosyası VAR (" + dyalogYolu + ")", dyalog.length > 0);
  if (dyalog.length > 0) {
    kontrol(
      "② diyalog önizlemeyi SUNUCUDAN çekiyor",
      dyalog.includes("await " + onizleAd + "(variantId)"),
    );
    /**
     * ⛔ KÖRLEMESİNE GÖNDERİM YASAĞININ KENDİSİ: düğme, önizleme BAŞARIYLA
     * gelmeden basılamaz. Halil kuralı 09.09.2026 — "yazım okumadan
     * kategorik tehlikeli".
     */
    kontrol(
      "② rakam gelmeden GÖNDER pasif (önizlemesiz çağrı YASAK)",
      dyalog.includes("disabled={bekliyor || !gonderilebilir}") &&
        dyalog.includes("onizleme?.tamam === true"),
    );
  }
}

/* ═══ N11 — KANALIN KURALI İSTEK GİTMEDEN SINANIR ════════════════════ */
/**
 * ⭐ DEĞER TESTİ, DESEN TARAMA DEĞİL: `kalemGecerliMi` saf bir gövde ve ağa
 * çıkmıyor, dolayısıyla ÇAĞRILARAK ölçülebiliyor.
 * _(Anayasa: "saf hesap katmanı, desen tarayan bekçiye muhtaç olmaz".)_
 *
 * ⛔ NİYE ÖNEMLİ: N11 dokümanı bu üç şartı ihlal eden isteği `FAIL` yapıyor.
 * Kanala sordurmak, önlenebilir bir gürültüyü canlıya taşımaktır.
 */
console.log("\n  ── N11 KURALLARI (istek gitmeden)");
/** ⚠ Gövde SAF — `kimlikOku` çağrılmadığı için ithal yan etki üretmiyor. */
const SK = { stockCode: "X" };
const kod = (k: Parameters<typeof kalemGecerliMi>[0]): string | undefined => {
  const r = kalemGecerliMi(k);
  return r.gecerli ? undefined : r.kod;
};
kontrol(
  "stok tek başına GEÇERLİ (fiyata dokunmadan gönderim)",
  kalemGecerliMi({ ...SK, quantity: 3 }).gecerli === true,
);
kontrol(
  "fiyat TEK BAŞINA reddedilir (ikisi birlikte şartı)",
  kod({ ...SK, salePrice: 100 }) === "FIYAT_TEK_BASINA",
);
kontrol(
  "liste = satış reddedilir (eşitlik de FAIL)",
  kod({ ...SK, listPrice: 100, salePrice: 100 }) ===
    "LISTE_FIYATI_DUSUK",
);
kontrol(
  "liste < satış reddedilir",
  kod({ ...SK, listPrice: 90, salePrice: 100 }) ===
    "LISTE_FIYATI_DUSUK",
);
kontrol(
  "liste > satış KABUL",
  kalemGecerliMi({ ...SK, listPrice: 120, salePrice: 100 }).gecerli === true,
);
/**
 * ⚠ ÖRNEK AYRIMIN İKİ YAKASINI GÖSTERİYOR: 100,999 üç haneli ve REDDEDİLMELİ;
 * 100,99 iki haneli ve GEÇMELİ. Yalnız biri sınansaydı kural değil tesadüf
 * ölçülmüş olurdu.
 */
kontrol(
  "üç haneli küsurat reddedilir",
  kod({ ...SK, listPrice: 120, salePrice: 100.999 }) ===
    "KURUSAT_HATALI",
);
kontrol(
  "iki haneli küsurat KABUL",
  kalemGecerliMi({ ...SK, listPrice: 120.5, salePrice: 100.99 }).gecerli === true,
);
kontrol(
  "boş kalem reddedilir (ne stok ne fiyat)",
  kod({ ...SK }) === "GONDERILECEK_YOK",
);

console.log(
  "\n" +
    (hata === 0 ? "TÜM KONTROLLER GEÇTİ" : "BAŞARISIZ") +
    ` (${gecen}/${gecen + hata})\n`,
);
process.exit(hata === 0 ? 0 : 1);
