import { readFileSync } from "node:fs";

import {
  MARJ_ALT_SINIRLARI,
  MARJ_BANTLARI,
  MARJ_DOLULUGU,
  PIL_BOLME_SAYISI,
  marjBandi,
} from "../src/lib/marj-bantlari";
import { satirGostergesi } from "../src/lib/marj-gosterge";
import { MARJ_RAMPASI } from "../src/lib/renkler";

/**
 * ============================================================================
 *  MARJ BANTLARI — DOĞRULAMA
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run marj:dogrula
 *
 *  Kullanıcı isteği 21.08.2026: marj pil gibi dereceli renklensin.
 *  Burada sınanan üç şey var ve üçü ayrı ayrı bozulabilir:
 *
 *    1. BANT KURALI     — hangi yüzde hangi banda düşüyor (sınır davranışı)
 *    2. BANT ULAŞIYOR MU— gösterge bandı taşıyor mu, ekrana varıyor mu
 *    3. CETVEL DOĞRU MU — ekrandaki legend, kodun eşikleriyle aynı mı
 *
 *  ⚠ ÜÇÜNCÜSÜ EN SİNSİSİ: eşik doğru, renk doğru, ama legend elle yazılmış
 *  olsaydı kullanıcıya YANLIŞ bir cetvel öğretirdi ve hiçbir hesap testi
 *  bunu yakalamazdı.
 * ============================================================================
 */

let hata = 0;
function kontrol(ad: string, gecti: boolean, detay?: unknown) {
  console.log(
    `  ${gecti ? "OK  " : "HATA"}  ${ad}${detay === undefined || gecti ? "" : ` — ${JSON.stringify(detay)}`}`,
  );
  if (!gecti) hata++;
}

// ===========================================================================
console.log("\n1) BANT KURALI — sınırlar nereye düşüyor");
// ===========================================================================
{
  /**
   * ⚠ ÖRNEK VERİ AYRIMIN İKİ YAKASINI GÖSTERMELİ. Her sınır için ALTINDAKİ
   * ve TAM ÜSTÜNDEKİ değer sınanıyor; yalnız "%9 → iyi" yazsaydım eşiği 8'den
   * 7'ye çeken mutasyon yeşil kalırdı.
   */
  const vakalar: Array<[number, string]> = [
    [-50, "zarar"],
    [-0.01, "zarar"],
    [0, "cokRiskli"], // ⚠ SIFIR ZARAR DEĞİL: sıfır kâr zarar etmek değildir
    [2.99, "cokRiskli"],
    [3, "zayif"], // kullanıcı ölçeği "%3–5 Zayıf" der → sınır ÜSTTEKİNE ait
    [4.99, "zayif"],
    [5, "kabul"],
    [7.99, "kabul"],
    [8, "iyi"],
    [11.99, "iyi"],
    [12, "cokIyi"],
    [61.5, "cokIyi"], // canlıdaki en yüksek marj
  ];
  for (const [yuzde, beklenen] of vakalar) {
    const bulunan = marjBandi(yuzde);
    kontrol(`%${yuzde} → ${beklenen}`, bulunan === beklenen, bulunan);
  }

  /**
   * HESAPLANAMAYAN MARJ BANT ALMAZ. `null`u "en kötü bant" saymak sessiz bir
   * varsayım olurdu: bilinmeyen bir marjı kırmızıya boyamak, olmayan bir
   * hüküm vermektir.
   */
  kontrol("null → bant yok", marjBandi(null) === null);
  kontrol("NaN → bant yok", marjBandi(Number.NaN) === null);
  kontrol("Infinity → bant yok", marjBandi(Number.POSITIVE_INFINITY) === null);
}

// ===========================================================================
console.log("\n2) BÜTÜNLÜK — bant, doluluk ve renk aynı kümeyi kapsıyor mu");
// ===========================================================================
{
  for (const bant of MARJ_BANTLARI) {
    kontrol(`${bant} — doluluğu tanımlı`, MARJ_DOLULUGU[bant] !== undefined);
    kontrol(`${bant} — rengi tanımlı`, MARJ_RAMPASI[bant] !== undefined);
    kontrol(
      `${bant} — eşiği tanımlı`,
      MARJ_ALT_SINIRLARI.some(([b]) => b === bant),
    );
  }
  /**
   * ⚠ DOLULUK SIRALI ARTMALI. Bu, "renk körü için uzunluk tek başına yeter"
   * sözünün testi: iki bant aynı sayıda bölme yakarsa o söz düşer.
   */
  const sirali = MARJ_ALT_SINIRLARI.toReversed().map(([b]) => MARJ_DOLULUGU[b]);
  kontrol(
    "kötüden iyiye doluluk ARTIYOR (renk tek kanal değil)",
    sirali.every((d, i) => i === 0 || d > sirali[i - 1]!),
    sirali,
  );
  kontrol(
    "en iyi bant pili tam dolduruyor",
    Math.max(...sirali) === PIL_BOLME_SAYISI,
    Math.max(...sirali),
  );
  kontrol("zarar HİÇ bölme yakmıyor", MARJ_DOLULUGU.zarar === 0);
}

// ===========================================================================
console.log("\n3) GÖSTERGEYE ULAŞIYOR MU — ciro bantlı, sermaye bantsız");
// ===========================================================================
{
  const ciro = satirGostergesi({
    olcu: "ciro",
    net2: 90,
    tutar: 1000,
    maliyet: 500,
    iptalliMi: false,
  });
  kontrol(
    "ciro marjı bant taşıyor",
    ciro.tur === "DEGER" && ciro.bant === "iyi",
    ciro,
  );

  /**
   * ⚠ SERMAYE VERİMİ BANTSIZ. Aynı girdiyle ölçü değişince bant DÜŞMELİ;
   * düşmezse "0,18×" değeri %0,18 sayılıp "zarar" bandına atardı — iki
   * farklı birimi aynı cetvele vurmak.
   */
  const sermaye = satirGostergesi({
    olcu: "sermaye",
    net2: 90,
    tutar: 1000,
    maliyet: 500,
    iptalliMi: false,
  });
  kontrol(
    "sermaye verimi bant TAŞIMIYOR",
    sermaye.tur === "DEGER" && sermaye.bant === null,
    sermaye,
  );

  /**
   * ⚠ BANT HAM YÜZDEDEN ÇÖZÜLÜYOR, YUVARLANMIŞ METİNDEN DEĞİL.
   * %2,6 listede "%3" yazar; bandı yuvarlanmıştan çözseydim ZAYIF olurdu.
   * Örnek veri ayrımın iki yakasını gösteriyor: metin "%3", bant "cokRiskli".
   */
  const kesirli = satirGostergesi({
    olcu: "ciro",
    net2: 26,
    tutar: 1000,
    maliyet: 500,
    iptalliMi: false,
  });
  kontrol(
    '%2,6 → metin "%3" ama bant cokRiskli (yuvarlama hükmü değiştirmiyor)',
    kesirli.tur === "DEGER" &&
      kesirli.metin === "%3" &&
      kesirli.bant === "cokRiskli",
    kesirli,
  );

  /** İptalli satırda gösterge hiç yok — bant sorusu doğmaz. */
  const iptalli = satirGostergesi({
    olcu: "ciro",
    net2: 90,
    tutar: 1000,
    maliyet: 500,
    iptalliMi: true,
  });
  kontrol("iptalli satırda gösterge YOK", iptalli.tur === "YOK");
}

// ===========================================================================
console.log("\n4) EKRANA VARIYOR MU — kaynak taraması");
// ===========================================================================
{
  /**
   * ⚠ DESEN ÖNCE SAYILDI. `MarjPili` adı rozet dosyasında iki kere geçiyor
   * (import + kullanım); import satırı tek başına hiçbir şey çizmez. Bu
   * yüzden işaret ÇAĞRI yerine bağlanıyor: `<MarjPili`.
   */
  const rozet = readFileSync("src/components/marj-rozeti.tsx", "utf8");
  kontrol("rozet pili ÇİZİYOR (<MarjPili)", rozet.includes("<MarjPili"));
  /**
   * ⚠ VE KOŞULUYLA BİRLİKTE: pil yalnız bandı olan göstergede çizilmeli.
   * "Her zaman pil" mutasyonu sermaye veriminde yanlış cetvel gösterirdi ve
   * yalnız `<MarjPili` arayan bir kontrol onu yeşil geçirirdi.
   */
  kontrol(
    "  ...ve YALNIZ bandı olanda (koşul sonucuyla birlikte)",
    /gosterge\.bant\s*!==\s*null\s*\)\s*\{[\s\S]{0,400}?<MarjPili/.test(rozet),
  );

  const pil = readFileSync("src/components/marj-pili.tsx", "utf8");
  /**
   * RENK TEK BAŞINA KONUŞMAZ (renk sistemi kısıt #1). Pilde durumun KELİMESİ
   * ekran okuyucuya ulaşmalı; yalnız `title` bırakmak dokunmatikte bilgiyi
   * yok ederdi.
   */
  kontrol(
    "pil kelimeyi ekran okuyucuya veriyor (sr-only)",
    pil.includes("sr-only"),
  );
  kontrol(
    "pil ham renk yazmıyor — rampadan okuyor",
    !/#[0-9A-Fa-f]{6}/.test(pil),
  );

  const olcek = readFileSync("src/components/marj-olcegi.tsx", "utf8");
  /**
   * ⚠ YORUMLAR ELENİYOR — VE BUNU KENDİ TESTİM ÖĞRETTİ.
   * "Elle yazılmış eşik var mı" kontrolü ilk hâlinde KIRMIZI yandı; suçlu
   * kod değil, ölçek dosyasındaki bir AÇIKLAMA satırıydı (`"%3 – %5" gibi
   * bir kalıp`). Doğru çare yorumu silip testi susturmak değil, testi
   * ÇALIŞAN KODA daraltmaktı: yorum ekrana bir şey çizmez.
   */
  const olcekKodu = olcek
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
  kontrol("ölçek ham renk yazmıyor", !/#[0-9A-Fa-f]{6}/.test(olcek));
  /**
   * ⚠ CETVEL ELLE YAZILMIYOR. Legend'daki sayılar `MARJ_ALT_SINIRLARI`ndan
   * okunmalı; elle yazılsaydı eşik değiştiği gün ekran kendi rengiyle
   * çelişir ve kullanıcıya yanlış cetvel öğretirdi.
   */
  kontrol(
    "ölçek eşikleri KODDAN okuyor (elle yazılmamış)",
    olcek.includes("MARJ_ALT_SINIRLARI") && !/%\s*\d+\s*–/.test(olcekKodu),
  );
  kontrol(
    "ölçek kapalı geliyor (<details, open yok)",
    olcek.includes("<details") && !olcek.includes("<details open"),
  );

  const sayfa = readFileSync("src/app/satislar/page.tsx", "utf8");
  kontrol("satış listesi ölçeği çiziyor", sayfa.includes("<MarjOlcegi />"));
  /**
   * ⚠ VE KOŞULUYLA BİRLİKTE — cetvel, olmayan bir renklendirmeyi
   * açıklamamalı: sermaye ölçüsünde ve kâr gizliyken çizilmez.
   */
  kontrol(
    "  ...yalnız kâr görünürken VE ciro ölçüsünde",
    /karGorunur\s*&&\s*olcu === "ciro"\s*\?\s*<MarjOlcegi \/>/.test(sayfa),
  );
}

// ===========================================================================
console.log("\n5) SÖZLÜK — her bandın adı var mı");
// ===========================================================================
{
  const tr = JSON.parse(readFileSync("messages/tr.json", "utf8"));
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"));
  for (const bant of MARJ_BANTLARI) {
    kontrol(
      `tr → bant_${bant}`,
      typeof tr.MarjGosterge?.[`bant_${bant}`] === "string" &&
        tr.MarjGosterge[`bant_${bant}`].length > 0,
    );
    kontrol(
      `en iskeleti → bant_${bant}`,
      `bant_${bant}` in (en.MarjGosterge ?? {}),
    );
  }
  for (const anahtar of [
    "olcekBaslik",
    "olcekZarar",
    "olcekAralik",
    "olcekUstsuz",
  ]) {
    kontrol(
      `tr → ${anahtar}`,
      typeof tr.MarjGosterge?.[anahtar] === "string" &&
        tr.MarjGosterge[anahtar].length > 0,
    );
  }
}

console.log("\n" + "=".repeat(70));
if (hata > 0) {
  console.log(`${hata} KONTROL BAŞARISIZ`);
  process.exitCode = 1;
} else {
  console.log("TÜM KONTROLLER GEÇTİ");
}
console.log("");
