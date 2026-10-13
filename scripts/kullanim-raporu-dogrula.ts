import { kaynakOku } from "./kaynak-oku";
import { gunMetni } from "../src/lib/donem";
import { DIS_BAGLANTI } from "../src/lib/kullanim/olay";
import { cubukYuzdesi, donemBasiAni, donemIlkGunu, donemSec, hedefGorunumu, saatKovalariniDagit, VARSAYILAN_DONEM } from "../src/lib/kullanim/rapor";

/**
 * ============================================================================
 *  KULLANIM RAPORU BEKÇİSİ (K334 ② · süper admin «Kullanım» ekranı)
 * ----------------------------------------------------------------------------
 *  Değer testleri saf gövdeyi ÇAĞIRIR (`lib/kullanim/rapor.ts`); ekran ölçütleri
 *  yorumsuz kaynakta, KULLANIM yerine bağlı. Örnek veri ayrımın iki yakasını
 *  gösterir: İstanbul gece yarısını UTC'den ayıran saatler bilerek seçildi.
 *  Bölüm sayacı: bir bölüm koşmazsa sonuç GEÇERSİZ (anayasa: özet + çıkış kodu
 *  ölçütlerden SONRA, sayaçla).
 * ============================================================================
 */

let basarisiz = 0;
let calisan = 0;
const BOLUM_SAYISI = 5;
const kosanBolumler: string[] = [];
function kontrol(ad: string, kosul: boolean, ayrinti?: unknown) {
  calisan++;
  if (kosul) console.log(`  OK    ${ad}`);
  else {
    basarisiz++;
    console.log(`  HATA  ${ad}`);
    if (ayrinti !== undefined) console.log("        ", JSON.stringify(ayrinti));
  }
}
const yorumsuz = (yol: string) =>
  kaynakOku(yol).replace(/\r\n/g, "\n").replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1 ");
const U = (iso: string) => new Date(iso);

console.log("\nKULLANIM RAPORU BEKÇİSİ\n");

console.log("1) DÖNEM — adresten gün sayısı, İŞ GÜNÜNE göre");
{
  kontrol("bilinen dönem olduğu gibi (7 · 90)", donemSec("7") === 7 && donemSec("90") === 90);
  kontrol("  ...bilinmeyen/boş değer VARSAYILANA düşer (uydurulmaz)", donemSec("15") === VARSAYILAN_DONEM && donemSec("abc") === VARSAYILAN_DONEM && donemSec(undefined) === VARSAYILAN_DONEM);
  /* İstanbul 14.10 01:30 = UTC 13.10 22:30 — UTC günü kullanan kod bir gün geride kalır. */
  kontrol("ilk gün İSTANBUL gününden sayılır (UTC'de hâlâ dün olan an)", gunMetni(donemIlkGunu(U("2026-10-13T22:30:00Z"), 1)) === "2026-10-14", gunMetni(donemIlkGunu(U("2026-10-13T22:30:00Z"), 1)));
  kontrol("  ...7 gün = bugün dahil 7 iş günü geri", gunMetni(donemIlkGunu(U("2026-10-14T09:00:00Z"), 7)) === "2026-10-08");
  kontrol("sorgu sınırı İstanbul gece yarısının mutlak anı", donemBasiAni(U("2026-10-14T00:00:00Z")).toISOString() === "2026-10-13T21:00:00.000Z", donemBasiAni(U("2026-10-14T00:00:00Z")).toISOString());
  kosanBolumler.push("donem");
}

console.log("\n2) SAAT KOVALARI → İŞ GÜNÜ + İŞ SAATİ");
{
  const ilk = U("2026-10-12T00:00:00Z");
  const { gunler, saatler } = saatKovalariniDagit(
    [
      { an: U("2026-10-13T20:00:00Z"), adet: 5 }, // İstanbul 13.10 23:00
      { an: U("2026-10-13T21:00:00Z"), adet: 2 }, // İstanbul 14.10 00:00 (UTC'de hâlâ 13'ü)
      { an: U("2026-10-11T20:00:00Z"), adet: 9 }, // İstanbul 11.10 — dönem DIŞI
      { an: U("2026-10-14T20:59:00Z"), adet: 4 }, // İstanbul 14.10 23:59 — dönem içi son an
    ],
    ilk,
    3,
  );
  kontrol("gün listesi dönemin TAMAMI (olay olmayan gün 0, gizlenmez)", gunler.length === 3 && gunler[0]!.gun === "2026-10-12" && gunler[0]!.adet === 0, gunler);
  kontrol("  ...UTC gece yarısını geçen kova İSTANBUL gününe yazılır", gunler[1]!.adet === 5 && gunler[2]!.adet === 6, gunler);
  kontrol("  ...dönem dışı kova sayılmaz", gunler.reduce((a, g) => a + g.adet, 0) === 11);
  kontrol("saat İSTANBUL saati (23 · 00)", saatler[23] === 9 && saatler[0] === 2 && saatler[20] === 0, saatler);
  kontrol("  ...gün toplamı = saat toplamı (aynı kümenin iki görünümü)", saatler.reduce((a, b) => a + b, 0) === gunler.reduce((a, g) => a + g.adet, 0));
  kosanBolumler.push("kova");
}

console.log("\n3) HEDEF GÖRÜNÜMÜ + ÇUBUK");
{
  kontrol("site dışı → kod (metin sözlükten)", hedefGorunumu(DIS_BAGLANTI).tur === "DIS");
  const b = hedefGorunumu("→ /satislar/:id");
  kontrol("  ...site içi bağlantı → kalıp", b.tur === "BAGLANTI" && b.kalip === "/satislar/:id", b);
  const d = hedefGorunumu("→ geri");
  kontrol("  ...ok işaretiyle başlayan DÜĞME yazısı bağlantı sanılmaz", d.tur === "DUGME" && d.metin === "→ geri", d);
  kontrol("çubuk: en büyük %100, yarısı %50", cubukYuzdesi(10, 10) === 100 && cubukYuzdesi(5, 10) === 50);
  kontrol("  ...sıfır olmayan küçük değer görünür (en az %2), sıfır 0", cubukYuzdesi(1, 1000) === 2 && cubukYuzdesi(0, 10) === 0 && cubukYuzdesi(3, 0) === 0);
  kosanBolumler.push("gorunum");
}

console.log("\n4) EKRAN — kapı · tek süzgeç · salt okuma");
{
  const k = yorumsuz("src/app/bezirga/(ic)/kullanim/page.tsx");
  kontrol("yönetim kapısı sayfanın İLK işi", /export default async function KullanimSayfasi\([^)]*\)[^{]*\{\s*await yonetimSayfasi\(\);/.test(k));
  const cagrilar = [...k.matchAll(/sistemPrisma\.kullanimOlayi\.(groupBy|aggregate|findMany|count)\(\{([\s\S]*?)\}\),?\n/g)];
  const groupBy = cagrilar.filter((c) => c[1] === "groupBy");
  kontrol(`taban: groupBy çağrısı ≥ 9 (bulunan ${groupBy.length})`, groupBy.length >= 9);
  const suzgecsiz = groupBy.filter((c) => !/where: (kosul|\{ \.\.\.kosul,)/.test(c[2]!)).map((c) => c[2]!.slice(0, 60));
  kontrol("  ...her toplam AYNI süzgeçten (kosul) — KPI ile liste ayrışamaz", suzgecsiz.length === 0, suzgecsiz);
  kontrol("  ...süzgeçsiz tek okuma beyanlı: izin doğum tarihi", (k.match(/sistemPrisma\.kullanimOlayi\.aggregate\(\{ _min: \{ createdAt: true \} \}\)/g) ?? []).length === 1 && cagrilar.length === groupBy.length + 1);
  const ham = [...k.matchAll(/sistemPrisma\.\$queryRaw<[^>]*>`([^`]*)`/g)].map((m) => m[1]!);
  kontrol("ham saat kovası iki dalda da dönem sınırını taşır", ham.length === 2 && ham.every((s) => s.includes("createdAt >= ${bas}")), ham);
  kontrol("  ...firma dalı firmayı taşır, öteki taşımaz", ham.filter((s) => s.includes("companyId = ${firmaId}")).length === 1);
  kontrol("  ...kovalar saf gövdeden İŞ GÜNÜNE dağıtılır", /const \{ gunler, saatler \} = saatKovalariniDagit\(kovalar, ilkGun, gunSayisi\);/.test(k));
  kontrol("hiçbir şey yazmaz", !/\.(create|createMany|update|updateMany|upsert|delete|deleteMany)\(|\$executeRaw/.test(k));
  kontrol("dönem adresten ve SAF gövdeden", /const gunSayisi = donemSec\(sp\.d\);/.test(k));
  kontrol("  ...sorgu sınırı İstanbul gece yarısı (saf gövde) — ilk gün ve sınır aynı zincirden",
    /const ilkGun = donemIlkGunu\(new Date\(\), gunSayisi\);\s*const bas = donemBasiAni\(ilkGun\);/.test(k) && /const kosul = \{ createdAt: \{ gte: bas \},/.test(k));
  kontrol("bilinmeyen firma kimliği süzgece girmez (listede olmalı)", /const firmaId = firmalar\.some\(\(f\) => f\.id === sp\.f\) \? sp\.f! : null;/.test(k));
  kosanBolumler.push("ekran");
}

console.log("\n5) SÖZLÜK + MENÜ");
{
  const k = yorumsuz("src/app/bezirga/(ic)/kullanim/page.tsx");
  const tr = (JSON.parse(kaynakOku("messages/tr.json")) as Record<string, Record<string, string>>).YonetimKullanim ?? {};
  const en = (JSON.parse(kaynakOku("messages/en.json")) as Record<string, Record<string, string>>).YonetimKullanim ?? {};
  const anahtarlar = [...new Set([...k.matchAll(/\bt\("(\w+)"/g)].map((m) => m[1]!))];
  kontrol(`taban: ekranın sözlük anahtarı ≥ 25 (bulunan ${anahtarlar.length})`, anahtarlar.length >= 25);
  const eksik = anahtarlar.filter((a) => !tr[a]?.trim());
  kontrol("  ...her anahtar tr'de DOLU", eksik.length === 0, eksik);
  kontrol("  ...en iskeletinde de var", anahtarlar.every((a) => typeof en[a] === "string"));
  const cihazEksik = ["TELEFON", "TABLET", "MASAUSTU"].filter((c) => !tr[`cihaz_${c}`]?.trim());
  kontrol("cihaz adları sözlükte (anahtar şablonla kurulur)", cihazEksik.length === 0, cihazEksik);
  const menu = kaynakOku("src/lib/yonetim/menu.ts");
  kontrol("menüde «kullanim» öğesi ve adresi", /ogeler: \["kullanim"\]/.test(menu) && /kullanim: `\$\{YONETIM_YOLU\}\/kullanim`/.test(menu));
  kosanBolumler.push("sozluk");
}

console.log("\n" + "=".repeat(70));
if (kosanBolumler.length !== BOLUM_SAYISI) {
  console.log(`KOŞUM YARIM KALDI — sonuç GEÇERSİZ (${kosanBolumler.length}/${BOLUM_SAYISI} bölüm)`);
  process.exit(1);
}
if (basarisiz === 0) console.log(`TÜM KONTROLLER GEÇTİ (${calisan})`);
else {
  console.log(`${basarisiz} KONTROL BAŞARISIZ (${calisan} içinde)`);
  process.exitCode = 1;
}
