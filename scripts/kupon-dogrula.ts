import { kuponluSimulasyon } from "../src/lib/fiyatlama/kupon";
import { simulasyonKur, type SimulasyonGirdisi } from "../src/lib/fiyatlama/simulasyon";
import { kaynakOku } from "./kaynak-oku";

/**
 * ============================================================================
 *  TAKİPÇİ KUPONU BEKÇİSİ (K19-②) — `npm run kupon:dogrula`
 * ----------------------------------------------------------------------------
 *  ① DEĞER — kuponlu hesap «fiyat − kupon» ile AYNI motordan (ayrı formül
 *     yok); geçersiz kupon hesap yapmaz; dilim değişimi söylenir.
 *  ② EKRAN — fiyat denemesi gövdeyi çağırıyor ve dilim değişimini yazıyor.
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
const yorumsuz = (m: string) =>
  m.replace(/\{\/\*[\s\S]*?\*\/\}/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1");

console.log("=".repeat(70));
console.log("TAKİPÇİ KUPONU BEKÇİSİ (K19-②)");
console.log("=".repeat(70));

console.log("\n1) değer");
{
  const girdi: SimulasyonGirdisi = {
    hedefFiyat: 1000,
    adet: 1,
    birimMaliyet: 600,
    kdvOrani: 20,
    paraBirimi: "TRY",
    dilimler: null,
    pencereBitis: null,
    tekOran: 10,
    komisyonKdvOrani: null,
    siparisKesintileri: [],
    kargoTarifesi: null,
    bugun: new Date("2026-09-30T12:00:00Z"),
  };
  const kuponsuz = simulasyonKur(girdi);
  const k = kuponluSimulasyon(girdi, kuponsuz, 15);
  const beklenen = simulasyonKur({ ...girdi, hedefFiyat: 985 });
  kontrol("kuponlu sonuç = motor(fiyat − kupon) — ayrı formül yok", k !== null && k.sonuc.net2 === beklenen.net2 && k.sonuc.ciro === 985, { k: k?.sonuc.net2, beklenen: beklenen.net2 });
  kontrol("NET-2 farkı kuponsuza göre EKSİ ve doğru", k !== null && k.net2Farki !== null && Math.abs(k.net2Farki - (beklenen.net2! - kuponsuz.net2!)) < 1e-9 && k.net2Farki < 0, k?.net2Farki);
  kontrol("  ...komisyon da kuponlu tutardan (ölçülen davranış)", k !== null && k.sonuc.dokum.some((d) => d.kod === "KOMISYON" && Math.abs(Math.abs(d.tutar) - 98.5) < 1e-6), k?.sonuc.dokum);
  kontrol("boş kupon → hesap YOK", kuponluSimulasyon(girdi, kuponsuz, null) === null);
  kontrol("sıfır/eksi kupon → hesap YOK", kuponluSimulasyon(girdi, kuponsuz, 0) === null && kuponluSimulasyon(girdi, kuponsuz, -5) === null);
  kontrol("fiyattan büyük/eşit kupon → hesap YOK", kuponluSimulasyon(girdi, kuponsuz, 1000) === null);

  const dilimli: SimulasyonGirdisi = {
    ...girdi,
    tekOran: null,
    dilimler: [
      { sira: 1, altLimit: 1000, ustLimit: null, oran: 12 },
      { sira: 2, altLimit: null, ustLimit: 999.99, oran: 8 },
    ],
  };
  const ks = simulasyonKur(dilimli);
  const kd = kuponluSimulasyon(dilimli, ks, 15);
  kontrol("kupon fiyatı dilim sınırının altına indirirse SÖYLENİR", kd !== null && kd.dilimDegisti && kd.sonuc.dilim?.sira === 2, kd);
  const ayni = kuponluSimulasyon({ ...dilimli, hedefFiyat: 2000 }, simulasyonKur({ ...dilimli, hedefFiyat: 2000 }), 15);
  kontrol("aynı dilimde kalırsa dilim değişti DEMEZ", ayni !== null && !ayni.dilimDegisti, ayni);
}
kosanBolumler.push("değer");

console.log("\n2) ekran — fiyat denemesi");
{
  const e = yorumsuz(kaynakOku("src/app/kart/[variantId]/fiyat-dene.tsx"));
  kontrol("her kanal kutusu gövdeyi çağırıyor", /const kuponlu = s === null \? null : kuponluSimulasyon\(girdi, s, kuponSayi\);/.test(e));
  kontrol("kuponlu NET-2 satırı çiziliyor", /\{kuponlu !== null \? \([\s\S]{0,400}t\("deneKuponlu"/.test(e));
  /* Pencere ÖLÇÜLDÜ: koşul ile metin arası ~120 karakter (sınıf dizesi). */
  kontrol("dilim değişimi ekranda yazıyor", /kuponlu\.dilimDegisti \? [\s\S]{0,160}t\("deneKuponDilimDegisti"/.test(e));
  kontrol("kupon alanı yer tutucusu «örn.» biçiminde (İlke #11)", /placeholder=\{t\("deneKuponIpucu"\)\}/.test(e));
  const tr = JSON.parse(kaynakOku("messages/tr.json")) as Record<string, Record<string, string>>;
  const ns = Object.values(tr).find((n) => typeof n === "object" && "deneKuponIpucu" in n) ?? {};
  kontrol("  ...ipucu metni «örn.» ile başlıyor", typeof ns.deneKuponIpucu === "string" && ns.deneKuponIpucu.startsWith("örn."));
}
kosanBolumler.push("ekran");

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
