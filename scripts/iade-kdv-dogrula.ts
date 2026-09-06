import { readFileSync } from "node:fs";

import { iadeKdvEtkisi } from "../src/lib/iade-kdv";

/**
 * ============================================================================
 *  K172 — İADE KDV ETKİSİ: TÜRETİLİR, SAKLANMAZ
 * ----------------------------------------------------------------------------
 *  Spec: "iade KDV'si ayrı gösterilmeli". Motor formülü net2 = net1 −
 *  odenecekKdvDegisimi olduğu için iade KDV = net1 − net2 (iki mevcut alan).
 *  Şema açmadan türetilir. Bu bekçi hem türetmeyi hem "şema açılmadı"yı sabitler.
 * ============================================================================
 */

let hata = 0;
let gecen = 0;
function kontrol(ad: string, ok: boolean) {
  if (ok) {
    gecen++;
    console.log(`  ✓ ${ad}`);
  } else {
    hata++;
    console.log(`  ✗ ${ad}`);
  }
}

// ── SAF GÖVDE — DEĞER TESTİ ────────────────────────────────────────────────
kontrol("net1−net2 türetir (1000,800 → 200)", iadeKdvEtkisi(1000, 800) === 200);
kontrol(
  "olağan iade NEGATİF etki (satış KDV geri geldi)",
  iadeKdvEtkisi(-549.6, 357.62) === -907.22,
);
kontrol("net1 null → null (uydurma sıfır yok)", iadeKdvEtkisi(null, 200) === null);
kontrol("net2 null → null", iadeKdvEtkisi(200, null) === null);
kontrol("kuruşa yuvarlar", iadeKdvEtkisi(100.005, 0) === 100.01);

// ── GÖSTERİM — iade-blogu çağırıyor (davranışa bağlı) ──────────────────────
const blogu = readFileSync("src/components/iade-blogu.tsx", "utf8");
kontrol(
  "iade-blogu iadeKdvEtkisi'ni ÇAĞIRIYOR (net1,net2 ile)",
  /iadeKdvEtkisi\(iade\.net1, iade\.net2\)/.test(blogu),
);

/**
 * ── K170-① — NET-2 YANINDA NET-1 ETKİSİ DE ÇİZİLİR ───────────────────────
 *
 * Tek başına NET-2 etkisi YANILTIYOR: iade satış KDV'sini geri getirdiği için
 * net2 > net1 oluyor (canlıda 222 iadenin 216'sında) ve büyük iadede net2
 * POZİTİFE geçip YEŞİL basılıyordu — "bu iade kazandırdı" diye okunuyordu.
 * Çare kaynağı kırpmak DEĞİL (kırpma K172'nin KDV satırını 216 kayıtta
 * sıfırlardı); eksik olan BAĞLAM. Üçlü birlikte okunur:
 *     NET-1 etkisi − iade KDV etkisi = NET-2 etkisi
 *
 * ⚠ Ölçüt DEĞERE değil ÇİZİME bağlı (ekran çizimi saf gövdeye taşınamaz);
 * bu yüzden desen kullanım bloğuna daraltılır ve İKİ YÖNDEN sınanır.
 */
const netBlokBas = blogu.indexOf('t("net1Etkisi")');
const netBlokSon = blogu.indexOf("iadeKdvEtkisi(iade.net1, iade.net2)");
kontrol(
  "K170-①: NET-1 ve NET-2 etkisi AYNI blokta, KDV satırından önce",
  netBlokBas >= 0 && netBlokSon > netBlokBas,
);
const netBlok =
  netBlokBas >= 0 && netBlokSon > netBlokBas
    ? blogu.slice(netBlokBas, netBlokSon)
    : "";
kontrol(
  "K170-①: NET-1 etkisi DEĞERİYLE çizilir (iade.net1)",
  /t\("net1Etkisi"\)[\s\S]{0,400}iade\.net1 === null \? "—" : para\(iade\.net1\)/.test(
    netBlok,
  ),
);
kontrol(
  "K170-①: NET-2 etkisi de AYNI blokta duruyor (biri ötekini kovmadı)",
  /t\("net2Etkisi"\)[\s\S]{0,400}iade\.net2 === null \? "—" : para\(iade\.net2\)/.test(
    netBlok,
  ),
);

/**
 * ⛔ KAYNAK KIRPILMADI — K170-① kapanış kararının KOŞAN karşılığı.
 * `iade.ts` net2Etkisi'yi net1Etkisi'ne kırpmaya kalkan bir değişiklik
 * (Math.min / clamp) bu ölçütü kırmızı yakar. Ölçüldü 06.09.2026: kırpma
 * 216 iadede KDV satırını sıfırlar, ₺92.972,02 bilgi silinir.
 */
const iadeMotoru = readFileSync("src/lib/iade.ts", "utf8");
kontrol(
  "K170-①: net2Etkisi KAYNAKTA kırpılmıyor (ham fark yazılır)",
  /net2Etkisi:\s*net1Etkisi\s*-\s*odenecekKdvDegisimi\s*,/.test(iadeMotoru),
);

/**
 * ── K170c — "İADE SONRASI NET" KUTUSU DA KIRPILIR ────────────────────────
 *
 * Halil 06.09.2026 (ekran görüntülü): kutu NET-1 −167,26 (zarar) yanında
 * NET-2 +667,98 (kâr) basıyordu — NET-2 = NET-1 − ödenecek KDV olduğuna göre
 * İMKÂNSIZ. Ölçüldü: iadeli 222 satışın **207'sinde** aynı desen vardı.
 * K170 paneli/raporu/aylık seriyi kırpıyordu, KUTU atlanmıştı.
 *
 * ⚠ ÖLÇÜT DEĞER + ÇİZİM: kırpma gövdesi (`donemNet2`) zaten değerle sınanıyor
 * (panel:dogrula); burada sınanan, KUTUNUN o gövdeyi ÇAĞIRIP kırpılmış değeri
 * BASTIĞI — ham `hamSonNet2`yi değil.
 */
const kirpmaBas = blogu.indexOf("const hamSonNet2");
const kirpmaSon = blogu.indexOf("return (");
kontrol(
  "K170c: kırpma bloğu bulundu (çapa)",
  kirpmaBas >= 0 && kirpmaSon > kirpmaBas,
);
const kirpmaBlok =
  kirpmaBas >= 0 && kirpmaSon > kirpmaBas ? blogu.slice(kirpmaBas, kirpmaSon) : "";
kontrol(
  "K170c: sonNet2 donemNet2(sonNet1, hamSonNet2)'den geçer",
  /donemNet2\(\s*sonNet1,\s*hamSonNet2,?\s*\)/.test(kirpmaBlok) &&
    /const sonNet2 = sonKirpma === null \? null : sonKirpma\.net2;/.test(kirpmaBlok),
);
kontrol(
  "K170c: ham değer kutuya DOĞRUDAN gitmiyor",
  !/const sonNet2 = orijinalNet2/.test(blogu),
);
/** Sebep ekranda yazar (İlke #5) ve yalnız alacak varken (İlke #49). */
kontrol(
  "K170c: KDV alacağı satırı KOŞULLU çizilir",
  /sonKirpma !== null && sonKirpma\.devreden > 0[\s\S]{0,220}satisKdvAlacagi[\s\S]{0,120}sonKirpma\.devreden/.test(
    blogu,
  ),
);

// ── K52 — ŞEMA AÇILMADI (türetilebilen için sütun yok) ─────────────────────
const sema = readFileSync("prisma/schema.prisma", "utf8");
kontrol(
  "Return'e iadeKdvEtkisi SÜTUNU açılmadı (türetme, şema değil)",
  !/^\s*iadeKdvEtkisi\s+Decimal/m.test(sema),
);

console.log(`\n${hata === 0 ? "TÜM KONTROLLER GEÇTİ" : "BAŞARISIZ"} (${gecen}/${gecen + hata})\n`);
process.exit(hata === 0 ? 0 : 1);
