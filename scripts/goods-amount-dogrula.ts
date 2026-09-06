import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * ============================================================================
 *  ÖZET ALANI TUTARLILIĞI — `Purchase.goodsAmount` = Σ(birim × adet)
 * ----------------------------------------------------------------------------
 *  ⛔ NİYE VAR — VAKA 06–07.09.2026.
 *  `canli:alim-maliyet-duzelt` bir alım kaleminin birim maliyetini üç yere
 *  birden yazıyordu (kalem · parti damgası · çıkış damgaları) ama DÖRDÜNCÜ
 *  yeri, aynı kaydın özet alanını, atlıyordu. Sonuç: 03.09'daki düzeltme
 *  `ALM-HB-260216-03`te özet 15.283,00 ↔ kalem 1.598,00 bıraktı (eski birim
 *  7.641,50 × 2). Ve bu TEK VAKA DEĞİL, ARACIN DESENİYDİ: 07.09'da üç
 *  düzeltme daha koşulunca sapan sayısı 2'den 5'e çıktı.
 *
 *  ⚠ BAYAT DEĞER BUGÜN RAKAM BOZMUYOR — ve tehlike tam da bu. Ölçüldü:
 *  `goodsAmount`ı bugün hiçbir ekran OKUMUYOR (`alimlar/actions.ts` yazıyor,
 *  `kart-borcu` kalemlerden hesaplıyor). Yani sapma sessizce yaşıyor; onu
 *  gören biri "demek ki alım 15.283 TL'ymiş" diye okur ve üstüne akıl
 *  yürütür. _(Anayasa: "şemadaki alan da bir iddiadır".)_
 *
 *  ── ÖLÇÜT: LİSTE DEĞİL, DESEN YASAĞI ────────────────────────────────────
 *  Elle dosya listesi tutulsaydı, yarın `purchaseItem.update` yazan İKİNCİ
 *  araç sessizce muaf kalırdı — kusurun kendisi zaten buydu. Ölçüt tersten:
 *
 *      `purchaseItem` üzerinde `unitCostAmount` YAZAN her dosya,
 *      `goodsAmount`a da DOKUNMAK ZORUNDA — ya da gerekçeli muafiyet beyan eder.
 *
 *  _(Anayasa: "düzeltmenin çaresi dosya listesi değil, desen yasağıdır".)_
 *
 *  ⚠ CANLI VERİDEKİ SAPMA AYRI ARAÇTA: `npm run canli:goods-hizala`
 *  (rapor kipi sapma bulursa çıkış kodu 1). Bu bekçi KAYNAĞI ölçer, veriyi
 *  değil; ikisi farklı soru ve ikisi de gerekli.
 * ============================================================================
 */

let hata = 0;
let gecen = 0;

function kontrol(ad: string, sonuc: boolean) {
  if (sonuc) {
    gecen++;
    console.log("  ✓ " + ad);
  } else {
    hata++;
    console.log("  ✗ " + ad);
  }
}

/** Yorumlar ölçüme girmez: bir yasağı ANLATAN yorum onu çiğnemiş sayılmaz. */
function yorumsuz(kaynak: string): string {
  return kaynak
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
}

function dosyalar(kok: string, birikim: string[] = []): string[] {
  for (const ad of readdirSync(kok)) {
    const yol = join(kok, ad);
    if (statSync(yol).isDirectory()) {
      if (ad === "generated" || ad === "node_modules") continue;
      dosyalar(yol, birikim);
    } else if (/\.tsx?$/.test(ad)) {
      birikim.push(yol);
    }
  }
  return birikim;
}

/**
 * ⚠ ÇAĞRI ARANIYOR, AD DEĞİL. `purchaseItem` kelimesi bir `select` içinde de
 * geçer; yazma yapan şey `purchaseItem.update(` / `.updateMany(` / `.create(`
 * çağrısıdır. Ada bağlansaydı okuma yapan her dosya da yakalanırdı.
 */
const YAZMA_CAGRISI = /\b(tx|prisma)\.purchaseItem\.(update|updateMany|create|createMany)\s*\(/g;
const BIRIM_YAZIMI = /unitCostAmount\s*:/;

/**
 * ⛔ DESEN ÇAĞRI BLOĞUNDA ARANIR — DOSYADA DEĞİL. Bu bekçi ilk yazımında tam
 * bu tuzağa düştü ve `mal-kabul/actions.ts`i haksız yere kırmızı yaktı: o
 * dosyada `unitCostAmount` VAR (bir `stockMovement.create` damgasına
 * KOPYALANIYOR) ve `purchaseItem.update` de VAR (yalnız `damagedQuantity`
 * yazıyor) — ama İKİSİ AYRI İFADEDE. Dosya genelinde arayan ölçüt onları
 * aynı yazım sanıyordu.
 *
 * ⚠ PENCERE DEĞİL PARANTEZ: sabit uzunluklu pencere (`slice(i, i + 400)`)
 * gövde büyüyünce sessizce körelir. Blok, açılan parantezin EŞİNE kadar
 * sayılarak kesilir; uzunluk varsayımı yoktur.
 * _(Anayasa: "kaynak tarayan kontrol deseni kullanım bloğunda arar" ·
 * "pencere ölçülür".)_
 */
function cagriBloklari(kod: string): string[] {
  const bloklar: string[] = [];
  YAZMA_CAGRISI.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = YAZMA_CAGRISI.exec(kod)) !== null) {
    const i = kod.indexOf("(", m.index + m[0].length - 1);
    if (i < 0) continue;
    let derinlik = 0;
    let son = i;
    for (let j = i; j < kod.length; j++) {
      const c = kod[j];
      if (c === "(") derinlik++;
      else if (c === ")") {
        derinlik--;
        if (derinlik === 0) {
          son = j;
          break;
        }
      }
    }
    bloklar.push(kod.slice(i, son + 1));
  }
  return bloklar;
}
const OZET_YAZMA_CAGRISI = /\b(tx|prisma)\.purchase\.(update|updateMany)\s*\(/g;
/**
 * ⛔ İKİ MUTASYON BURADAN KAÇTI (07.09.2026) — ölçüt gevşekti, kod değil:
 * ① `if (yeniGoodsAmount !== null)` → `if (false)` yapıldı: dal ÖLDÜ ama
 *    `goodsAmount` dizesi dosyada kaldı ve dizeye bakan ölçüt yeşil yandı.
 *    ("koşul öldürülür, desen kalır" — deponun en sık yalancı yeşili.)
 * Çare iki katmanlı: yazım artık ÇAĞRI BLOĞUNDA aranıyor VE yazıcı
 * dosyalarda LİTERAL ÖLÜ DAL yasak. İkincisi kaba ama dürüst: `if (false)`
 * zaten hiçbir üretim dosyasında bulunmamalı.
 */
const OLU_DAL = /\bif\s*\(\s*(false|0)\s*\)/;
const MUAFIYET = /GOODS_AMOUNT MUAFIYETI:[^\n]{20,}/;

console.log("\n1) DESEN YASAĞI — birim maliyeti yazan, özeti de yazar");

const tumu = [...dosyalar("src"), ...dosyalar("scripts")];
const yazanlar: string[] = [];
for (const yol of tumu) {
  const ham = readFileSync(yol, "utf8");
  const kod = yorumsuz(ham);
  const bloklar = cagriBloklari(kod);
  if (bloklar.length === 0) continue;
  /** Ölçüt: AYNI çağrıda hem purchaseItem yazımı hem unitCostAmount olmalı. */
  if (!bloklar.some((b) => BIRIM_YAZIMI.test(b))) continue;
  yazanlar.push(yol);
}

/**
 * ⛔ TABAN DOLULUĞU AYRICA KANITLANIR. Aşağıdaki döngü BOŞ listede hiçbir şey
 * ölçmez ve bekçi yine yeşil yanardı — `every` kapılarındaki tuzağın aynısı.
 * Desen bozulup (ör. Prisma çağrı biçimi değişip) liste boşalırsa bu satır
 * kırmızı yanar ve ölçütün KÖRELDİĞİNİ söyler.
 */
kontrol(
  "TABAN DOLU — purchaseItem'a birim maliyet yazan dosya bulundu (" + yazanlar.length + ")",
  yazanlar.length >= 1,
);

for (const yol of yazanlar) {
  const ham = readFileSync(yol, "utf8");
  const kod = yorumsuz(ham);
  const ad = yol.replace(/\\/g, "/");
  if (MUAFIYET.test(ham)) {
    kontrol(ad + " — gerekçeli GOODS_AMOUNT muafiyeti beyan ediyor", true);
    continue;
  }
  OZET_YAZMA_CAGRISI.lastIndex = 0;
  const ozetBloklari: string[] = [];
  let om: RegExpExecArray | null;
  while ((om = OZET_YAZMA_CAGRISI.exec(kod)) !== null) {
    const i = kod.indexOf("(", om.index + om[0].length - 1);
    if (i < 0) continue;
    let d = 0;
    let son = i;
    for (let j = i; j < kod.length; j++) {
      if (kod[j] === "(") d++;
      else if (kod[j] === ")") {
        d--;
        if (d === 0) {
          son = j;
          break;
        }
      }
    }
    ozetBloklari.push(kod.slice(i, son + 1));
  }
  kontrol(
    ad + " — özet alanını da YAZIYOR (purchase.update bloğunda)",
    ozetBloklari.some((b) => /goodsAmount\s*:/.test(b)),
  );
  kontrol(ad + " — literal ÖLÜ DAL yok (if (false))", !OLU_DAL.test(kod));
}

console.log("\n2) HİZALAMA ARACI — ölçütü ve denetim sayaçları yerinde");
const hizala = readFileSync("scripts/canli-goods-amount-hizala.ts", "utf8");
const hizalaKod = yorumsuz(hizala);
/**
 * Araç ölçütü YENİDEN HESAPLIYOR mu — yoksa bir listeden mi okuyor?
 * Liste bozulur (kırpılma, kodlama); ölçüt bozulmaz.
 */
kontrol(
  "sapma ölçütü kalem toplamından TÜRETİLİYOR",
  /unitCostAmount\.toString\(\)\) \* i\.quantity/.test(hizalaKod),
);
/** "Bakamadım" ile "temiz" ayrı sayılmazsa araç yalancı yeşil üretir. */
kontrol(
  "dört sayaç AYRI: incelenen · temiz · sapan · incelenemeyen",
  /incelenen \$\{incelenen\} · temiz \$\{temiz\} · SAPAN/.test(hizalaKod) &&
    /incelenemeyen \$\{incelenemeyen\}/.test(hizalaKod),
);
kontrol(
  "karışık para birimi TEMİZ sayılmıyor, İNCELENEMEYEN sayılıyor",
  /paralar\.size > 1\)\s*\{\s*incelenemeyen\+\+/.test(hizalaKod),
);
/** Yazım kanıtı iz sayısı değil, VERİNİN KENDİSİDİR. */
kontrol(
  "yazımdan sonra defterden OKUYARAK doğruluyor",
  /dogrulanan\+\+/.test(hizalaKod) && /findUnique/.test(hizalaKod),
);
kontrol(
  "yazımdan önce yerel anlık görüntü alıyor",
  /^\s*writeFileSync\(gYol/m.test(hizalaKod),
);
kontrol(
  "her satırın ESKİ değeri ize yazılıyor",
  /eski: s\.eski/.test(hizalaKod),
);

console.log(
  "\n" + (hata === 0 ? "TÜM KONTROLLER GEÇTİ" : "BAŞARISIZ") +
    " (" + gecen + "/" + (gecen + hata) + ")\n",
);
process.exit(hata === 0 ? 0 : 1);
