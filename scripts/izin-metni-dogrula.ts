/**
 * ============================================================================
 *  İZİN METNİ BEKÇİSİ — rol ekranı her izni TÜRKÇE adıyla çizebiliyor mu
 *  Çalıştırmak için: npm run izin-metni:dogrula
 * ----------------------------------------------------------------------------
 *  ⛔ VAKA (04.10.2026): sözlükteki `Izin` anahtarları noktalıydı (`urun.gor`).
 *  next-intl noktayı İÇ İÇE YOL sayar; `t.has("urun.gor")` `Izin.urun.gor`
 *  arar ve hep `false` döner. Rol ekranı c67d120'den beri her izni ham kodla
 *  çiziyordu, hata vermeden — `i18n:kontrol` dinamik çağrıyı göremiyordu.
 *  Aynı taramada 32 iznin 6'sının metni hiç yoktu.
 *
 *  Ölçüt KAYNAK TARAMASI DEĞİL: kütüphanenin kendi çözücüsü (`createTranslator`)
 *  ÇAĞRILIR. Tek kaynak taraması ekranın çağrı satırıdır (gövdeye taşınamıyor).
 *
 *  Bölümler (sayaçlı — biri koşmazsa sonuç GEÇERSİZ):
 *   1) sözlüğün HİÇBİR yerinde noktalı anahtar yok (tr + en)
 *   2) her iznin adı ve notu tr'de çözülüyor ve boş değil; en'de anahtar var
 *   3) rol ekranı sözlüğe `izinMetinAnahtari` ile soruyor (ham anahtarla değil)
 * ============================================================================
 */
import { createTranslator } from "use-intl";
import { IZINLER, izinMetinAnahtari } from "../src/lib/yetki/izinler";
import { kaynakOku as oku } from "./kaynak-oku";

type Agac = { [k: string]: string | Agac };
const tr = JSON.parse(oku("messages/tr.json")) as Agac;
const en = JSON.parse(oku("messages/en.json")) as Agac;

const BOLUM_SAYISI = 3;
const kosanBolumler: string[] = [];
let hata = 0;
function olc(ad: string, kosul: boolean, ayrinti = "") {
  if (kosul) console.log(`  OK  ${ad}`);
  else {
    hata++;
    console.log(`  ⛔  ${ad}${ayrinti ? ` — ${ayrinti}` : ""}`);
  }
}

/* 1) Noktalı anahtar yasağı — bütün sözlük, liste tutulmaz */
console.log("1) sözlükte noktalı anahtar");
for (const [dil, agac] of [["tr", tr], ["en", en]] as const) {
  const noktali: string[] = [];
  let sayilan = 0;
  (function gez(o: Agac, yol: string) {
    for (const [k, v] of Object.entries(o)) {
      sayilan++;
      if (k.includes(".")) noktali.push(`${yol}${k}`);
      if (typeof v === "object") gez(v, `${yol}${k} → `);
    }
  })(agac, "");
  // Taban doluluğu: boş okunan sözlük «noktalı anahtar yok» diye yeşil yanmasın.
  olc(`${dil}: sözlük okundu (${sayilan} anahtar)`, sayilan >= 1000, "sözlük boş/eksik okundu");
  olc(`${dil}: noktalı anahtar 0`, noktali.length === 0, `${noktali.length}: ${noktali.slice(0, 5).join(", ")}`);
}
kosanBolumler.push("noktalı anahtar");

/* 2) Her izin kütüphanenin çözücüsüyle bulunuyor mu */
console.log("2) her iznin metni çözülüyor");
olc(`izin tabanı dolu (${IZINLER.length})`, IZINLER.length >= 30, "izin listesi boş/eksik");
const tTr = createTranslator({ locale: "tr", messages: tr, namespace: "Izin" as never });
const tEn = createTranslator({ locale: "en", messages: en, namespace: "Izin" as never });
const izinSozlugu = (en.Izin ?? {}) as Agac;
const eksikTr: string[] = [];
const eksikEn: string[] = [];
for (const { anahtar } of IZINLER) {
  for (const not of [false, true]) {
    const k = izinMetinAnahtari(anahtar, not);
    const bulundu = tTr.has(k as never) && String(tTr(k as never)).trim() !== "";
    if (!bulundu) eksikTr.push(k);
    // en iskelet: değer boş olabilir, anahtar olmalı ve çözücü onu görmeli.
    if (!(k in izinSozlugu) || !tEn.has(k as never)) eksikEn.push(k);
  }
}
olc(`tr: ${IZINLER.length} iznin adı + notu çözülüyor`, eksikTr.length === 0, eksikTr.join(", "));
olc(`en: ${IZINLER.length} iznin anahtarı var`, eksikEn.length === 0, eksikEn.join(", "));
kosanBolumler.push("izin metni");

/* 3) Rol ekranı sözlüğe doğru anahtarla soruyor mu (çağrı satırına bağlı) */
console.log("3) rol ekranının sözlük çağrısı");
const ekran = oku("src/app/ayarlar/roller/izin-secici.tsx")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");
const sayi = (desen: RegExp) => (ekran.match(desen) ?? []).length;
olc("ad: t.has + t aynı noktasız anahtarla", sayi(/t\.has\(izinMetinAnahtari\(izin\.anahtar\)\)\s*\?\s*t\(izinMetinAnahtari\(izin\.anahtar\)\)/g) === 1);
olc("not: t.has + t aynı noktasız anahtarla", sayi(/t\.has\(izinMetinAnahtari\(izin\.anahtar, true\)\)\s*\?\s*t\(izinMetinAnahtari\(izin\.anahtar, true\)\)/g) === 1);
olc("ham anahtarla sözlük çağrısı YOK", sayi(/\bt(\.has)?\(\s*(izin\.anahtar|`\$\{izin\.anahtar\})/g) === 0);
kosanBolumler.push("ekran çağrısı");

if (kosanBolumler.length !== BOLUM_SAYISI) {
  console.log(`\n⛔ KOŞUM YARIM KALDI (${kosanBolumler.length}/${BOLUM_SAYISI}) — sonuç GEÇERSİZ`);
  process.exit(1);
}
console.log(hata === 0 ? "\nTÜM KONTROLLER GEÇTİ" : `\n⛔ ${hata} KONTROL KIRMIZI`);
process.exit(hata === 0 ? 0 : 1);
