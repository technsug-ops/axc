import { tumSayfalar, kesilmeMetni, GECICI_HATA_DENEME, type OkumaSonucu } from "./ty/istemci";
import { kaynakOku } from "./kaynak-oku";

/**
 * ============================================================================
 *  TY SAYFA GEZİCİ BEKÇİSİ (K112b) — `npm run ty-sayfa-gezici:dogrula`
 * ----------------------------------------------------------------------------
 *  ⛔ VAKA 30.09.2026: TY onaylı ürün ucu arada bir geçici `HTTP 500` dönüyor.
 *  Gezici ilk hatada duruyor, yarım listeyi «tavana çarpıldı» diye
 *  raporluyordu; tam tarama bu yüzden üç kez yarım kaldı ve sebep hiç
 *  görünmedi.
 *
 *  ① DEĞER — gerçek uca gidilmez; sahte cevap dizisi verilir:
 *     geçici hata yeniden denenir · kalıcı hata denenmez · kalıcı geçici
 *     hata «HATA» sebebiyle kesilir · tavan «TAVAN» diye kesilir.
 *  ② ÇAĞIRANLAR — kesilmeyi okuyan betik sebebi YAZAR (`kesilmeMetni`).
 * ============================================================================
 */

let gecen = 0;
let kalan = 0;
const kosanBolumler: string[] = [];
const BOLUM_SAYISI = 2;
function kontrol(ad: string, sonuc: boolean, gorulen?: unknown) {
  if (sonuc) {
    gecen++;
    console.log(`  OK    ${ad}`);
  } else {
    kalan++;
    console.log(`  HATA  ${ad}`);
    if (gorulen !== undefined) console.log("        ", JSON.stringify(gorulen));
  }
}
const yorumsuz = (m: string) => m.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1");

console.log("=".repeat(70));
console.log("TY SAYFA GEZİCİ BEKÇİSİ (K112b)");
console.log("=".repeat(70));

/** Sayfa başına sıralı cevap kuyruğu; her `getir` çağrısı o sayfanın sıradakini alır. */
function sahte(plan: Record<number, OkumaSonucu[]>) {
  const cagri: number[] = [];
  const getir = async (yol: string) => {
    const sayfa = Number(yol);
    cagri.push(sayfa);
    const kuyruk = plan[sayfa] ?? [];
    return kuyruk.length > 1 ? kuyruk.shift()! : kuyruk[0];
  };
  return { getir, cagri };
}
const veri = (adet: number, toplamSayfa: number): OkumaSonucu => ({
  tur: "VERI",
  govde: { content: Array.from({ length: adet }, (_, i) => i), totalPages: toplamSayfa },
});
const e500: OkumaSonucu = { tur: "ULASILAMADI", sebep: "HTTP 500" };
const yolKur = (s: number) => String(s);
const bosBekle = async () => {};

async function main() {
  console.log("\n1) değer — sahte cevaplarla");
  {
    const { getir, cagri } = sahte({ 0: [veri(2, 3)], 1: [e500, e500, veri(2, 3)], 2: [veri(1, 3)] });
    const r = await tumSayfalar(yolKur, {}, 60, { getir, bekle: bosBekle });
    kontrol(
      "ortadaki sayfada GEÇİCİ 500 yeniden denenir, liste TAM gelir",
      r.tur === "TAMAM" && r.kayitlar.length === 5 && !r.kesildiMi && r.kesilme === null && r.tekrar === 2,
      r,
    );
    kontrol("  ...yalnız düşen sayfa yeniden sorulur", JSON.stringify(cagri) === "[0,1,1,1,2]", cagri);
  }
  {
    const { getir } = sahte({ 0: [e500, veri(3, 1)] });
    const r = await tumSayfalar(yolKur, {}, 60, { getir, bekle: bosBekle });
    kontrol("İLK sayfadaki geçici 500 de yeniden denenir", r.tur === "TAMAM" && r.kayitlar.length === 3 && !r.kesildiMi, r);
  }
  {
    const { getir, cagri } = sahte({ 0: [veri(2, 3)], 1: [e500] });
    const r = await tumSayfalar(yolKur, {}, 60, { getir, bekle: bosBekle });
    kontrol(
      "sürekli geçici hata → kesilme sebebi HATA (tavan DEĞİL), sayfası ile",
      r.tur === "TAMAM" && r.kesildiMi && r.kesilme?.tur === "HATA" && r.kesilme.sayfa === 1 && r.kayitlar.length === 2,
      r,
    );
    kontrol(`  ...deneme sayısı sınırlı (${GECICI_HATA_DENEME})`, cagri.filter((x) => x === 1).length === GECICI_HATA_DENEME, cagri);
    const metin = r.tur === "TAMAM" ? kesilmeMetni(r.kesilme) : "";
    kontrol("  ...metin sebebi taşır, «tavan» demez", metin.includes("HTTP 500") && !metin.includes("tavan"), metin);
  }
  {
    const yetkisiz: OkumaSonucu = { tur: "YETKISIZ", durum: 401 };
    const { getir, cagri } = sahte({ 0: [yetkisiz, veri(1, 1)] });
    const r = await tumSayfalar(yolKur, {}, 60, { getir, bekle: bosBekle });
    kontrol("KALICI hata (401) yeniden DENENMEZ", r.tur === "HATA" && cagri.length === 1, { r, cagri });
  }
  {
    const { getir } = sahte({ 0: [veri(1, 9)], 1: [veri(1, 9)], 2: [veri(1, 9)] });
    const r = await tumSayfalar(yolKur, {}, 2, { getir, bekle: bosBekle });
    kontrol(
      "tavana çarpan liste → kesilme sebebi TAVAN",
      r.tur === "TAMAM" && r.kesildiMi && r.kesilme?.tur === "TAVAN" && kesilmeMetni(r.kesilme).includes("tavan"),
      r,
    );
  }
  {
    const { getir } = sahte({ 0: [veri(2, 2)], 1: [veri(2, 2)] });
    const r = await tumSayfalar(yolKur, {}, 60, { getir, bekle: bosBekle });
    kontrol("temiz liste → kesilme YOK, tekrar 0", r.tur === "TAMAM" && !r.kesildiMi && r.kesilme === null && r.tekrar === 0, r);
  }
  kosanBolumler.push("değer");

  console.log("\n2) çağıranlar — kesilme SEBEBİYLE yazılır");
  {
    const liste = yorumsuz(kaynakOku("scripts/canli-kanal-listeleme-yaz.ts"));
    kontrol(
      "listeleme senkronu eksik listede yazmaz ve sebebi yazar",
      /if \(s2\.kesildiMi\) \{[\s\S]{0,200}return \{[\s\S]{0,120}kesilmeMetni\(s2\.kesilme\)/.test(liste),
    );
    const tarama = yorumsuz(kaynakOku("scripts/canli-ty-urun-taramasi.ts"));
    kontrol("tam tarama sebebi yazar", /if \(s2\.kesildiMi\) console\.log\([^\n]*kesilmeMetni\(s2\.kesilme\)/.test(tarama));
    const ice = yorumsuz(kaynakOku("scripts/canli-ty-ice-aktar.ts"));
    kontrol("sipariş içe aktarma yarım dilimi SAYAR", /if \(d\.kesildiMi\) dilimHata\+\+;/.test(ice));
  }
  kosanBolumler.push("çağıranlar");

  console.log("\n" + "=".repeat(70));
  if (kosanBolumler.length !== BOLUM_SAYISI) {
    console.log(`KOŞUM YARIM KALDI (${kosanBolumler.length}/${BOLUM_SAYISI}) — sonuç GEÇERSİZ`);
    process.exit(1);
  }
  if (kalan === 0) console.log(`TÜM KONTROLLER GEÇTİ (${gecen})`);
  else {
    console.log(`${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrolden)`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.log("BEKÇİ ÇÖKTÜ:", e instanceof Error ? (e.stack ?? e.message) : String(e));
  process.exit(1);
});
