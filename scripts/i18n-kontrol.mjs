// Sözlük bütünlük kontrolü.  Çalıştırmak için: npm run i18n:kontrol
//
// 1) Koddaki her t("anahtar") çağrısının sözlükte karşılığı var mı?
// 2) tr.json ve en.json aynı anahtar yapısına sahip mi?
// 3) Parametreli metinler beklendiği gibi mi üretiliyor?
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createTranslator } from "use-intl";

const tr = JSON.parse(readFileSync("messages/tr.json", "utf8"));
const en = JSON.parse(readFileSync("messages/en.json", "utf8"));

function dosyalar(kok) {
  const cikti = [];
  for (const ad of readdirSync(kok)) {
    const yol = join(kok, ad);
    if (statSync(yol).isDirectory()) {
      if (ad === "generated") continue;
      cikti.push(...dosyalar(yol));
    } else if (/\.tsx?$/.test(ad)) {
      cikti.push(yol);
    }
  }
  return cikti;
}

// --- 1) Eksik anahtar taraması ---------------------------------------------
let eksik = 0;
let kontrolEdilen = 0;

for (const yol of dosyalar("src")) {
  const kaynak = readFileSync(yol, "utf8");

  // Bu dosyadaki değişken -> namespace eşlemesi
  const adAlanlari = new Map();
  const desen = /(?:const\s+(\w+)\s*=\s*(?:await\s+)?(?:getTranslations|useTranslations)\(\s*"([^"]+)"\s*\))/g;
  for (const e of kaynak.matchAll(desen)) adAlanlari.set(e[1], e[2]);
  if (adAlanlari.size === 0) continue;

  for (const [degisken, adAlani] of adAlanlari) {
    const cagri = new RegExp(`\\b${degisken}(?:\\.rich)?\\(\\s*"([^"]+)"`, "g");
    for (const e of kaynak.matchAll(cagri)) {
      const anahtar = e[1];
      kontrolEdilen++;
      if (tr[adAlani]?.[anahtar] === undefined) {
        console.log(`EKSIK  ${adAlani}.${anahtar}   (${yol})`);
        eksik++;
      }
    }
  }
}
console.log(`1) Anahtar taramasi: ${kontrolEdilen} cagri kontrol edildi, ${eksik} eksik`);

// --- 2) tr / en yapi karsilastirmasi ----------------------------------------
function anahtarlar(nesne, onek = "") {
  return Object.entries(nesne).flatMap(([k, v]) =>
    typeof v === "object" && v !== null
      ? anahtarlar(v, `${onek}${k}.`)
      : [`${onek}${k}`],
  );
}
const trAnahtar = anahtarlar(tr).sort();
const enAnahtar = anahtarlar(en).sort();
const trFazla = trAnahtar.filter((k) => !enAnahtar.includes(k));
const enFazla = enAnahtar.filter((k) => !trAnahtar.includes(k));
for (const k of trFazla) console.log(`  en.json'da YOK: ${k}`);
for (const k of enFazla) console.log(`  tr.json'da YOK: ${k}`);
console.log(
  `2) Yapi: tr ${trAnahtar.length} anahtar, en ${enAnahtar.length} anahtar, ${trFazla.length + enFazla.length} fark`,
);

// --- 3) Parametreli metinlerin ciktisi --------------------------------------
const ornekler = [
  ["Raf", "kodZatenKayitli", { kod: "A-01" }, '"A-01" kodlu raf zaten kayıtlı.'],
  ["KanalHesabi", "kodZatenVar", { kanal: "Trendyol", kod: "ANA" }, '"Trendyol" kanalında "ANA" kodlu hesap zaten var.'],
  ["KanalHesabi", "eklendi", { kanal: "Trendyol", ad: "Ana Mağaza" }, '"Trendyol — Ana Mağaza" hesabı eklendi.'],
  ["Kart", "pasifeAlindi", { etiket: "Bonus" }, '"Bonus" pasife alındı, artık alım formunda seçilemez.'],
  ["Urun", "varyantHataKalibi", { sira: 2, mesaj: "SKU zorunlu" }, "2. varyant: SKU zorunlu"],
  ["Urun", "formdaTekrar", { alan: "SKU", deger: "AX1" }, 'SKU "AX1" formda birden fazla varyantta kullanılmış.'],
  ["Urun", "skuBaskaUrunde", { deger: "AX1" }, 'SKU "AX1" başka bir üründe kullanılıyor.'],
  ["Alim", "kalemHataKalibi", { sira: 3, mesaj: "adet en az 1 olmalı" }, "3. kalem: adet en az 1 olmalı"],
  ["Alim", "siparisNoZatenKayitli", { kod: "25-23" }, '"25-23" sipariş numarası zaten kayıtlı.'],
  ["MalKabul", "fazlaGiris", { kalan: 1, girilen: 5 }, "Bir kalemde beklenenden fazla giriş var: kalan 1, girilen 5."],
  // Kesme isareti ICU'da kacis karakteridir; asagidakiler onu dogruluyor.
  ["Kart", "ayinGunu", { gun: 15 }, "Ayın 15'i"],
  ["Kart", "toplamNotu", {}, "Para birimleri ayrı toplanır ve birbirine çevrilmez. Detaylı borç ve ekstre takibi Faz 3'te gelecek."],
  ["Kart", "guvenlikNotu", {}, 'Güvenlik gereği tam kart numarası, CVV ve son kullanma tarihi İSTENMEZ ve saklanmaz. Amaç yalnızca "hangi kartla ödendi" bilgisini taşımak; bunun için son 4 hane yeterlidir.'],
  ["Kart", "gunNotu", {}, 'Kesim ve son ödeme günü, ileride "faizsiz dönemi en uzun kart" seçimini hesaplamak için kullanılacak. Ayın günü olarak girin (1-31).'],
  ["Kart", "kartlaYapilanAlimlar", { sayi: 3 }, "Bu kartla yapılan alımlar (3)"],
  ["Stok", "gecmisNotu", {}, 'Hareketler değiştirilmez ve silinmez. Hatalı bir giriş, ters yönde bir düzeltme kaydıyla giderilir. "Kim" sütunu çok kullanıcılı yapıyla (Faz 4) dolacak.'],
  ["Raf", "kodIpucu", {}, "A-01 (veya raf QR'ını okutun)"],
  ["Raf", "tanimliRaflar", { sayi: 7 }, "Tanımlı raflar (7)"],
  ["Raf", "bagliKayitlar", { varyant: 2, hareket: 9 }, "2 varyant ve 9 stok hareketi bu rafa bağlı."],
  ["Raf", "etiketlerOzeti", { sayi: 5 }, "5 aktif raf. Yazdırıp raflara yapıştırın; QR içeriği raf kodudur."],
  ["KanalHesabi", "tanimliHesaplar", { sayi: 2 }, "Tanımlı hesaplar (2)"],
];

let fark = 0;
for (const [adAlani, anahtar, degerler, beklenen] of ornekler) {
  const t = createTranslator({ locale: "tr", messages: tr, namespace: adAlani });
  const cikan = t(anahtar, degerler);
  if (cikan !== beklenen) {
    fark++;
    console.log(`FARK  ${adAlani}.${anahtar}`);
    console.log(`      beklenen: ${beklenen}`);
    console.log(`      cikan   : ${cikan}`);
  }
}
console.log(`3) Parametreli metin: ${ornekler.length} ornek, ${fark} fark`);

console.log(
  eksik + trFazla.length + enFazla.length + fark === 0
    ? "\nHEPSI TEMIZ"
    : "\nSORUN VAR",
);

