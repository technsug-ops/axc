import { kaynakOku } from "./kaynak-oku";
import { KASA_IMLEC_TAVANI_MS, kasaImleciKarari } from "../src/lib/kasa-imleci";

/**
 * ============================================================================
 *  OKUMA SİNYALİ + KASA SESİ — BEKÇİ (kullanıcı isteği 15.10.2026)
 *      npm run okuma-sinyali:dogrula
 * ----------------------------------------------------------------------------
 *  ① KASA İMLECİ (SAF, değerle): ilk soru/bozuk/eski/gelecek imleç TABAN (ses
 *     çalmaz); geçerli imleç (imleç, şimdi] aralığını sayar.
 *  ② BAĞ: sayaç izinsize cevap vermez · iptali saymaz · hata imleci ilerletmez ·
 *     bileşen üst çubukta · ses tercihe bağlı · bildirim satışlara götürür.
 *  ③ PAKETLE: etiket ve ürün okutması sinyal verir; fazladan okutma HATA;
 *     sinyal ses + ekran parlaması + titreşim.
 * ============================================================================
 */

let gecen = 0;
let kalan = 0;
const kosanBolumler: string[] = [];
const BOLUM_SAYISI = 3;
function kontrol(ad: string, sonuc: boolean, gorulen?: unknown) {
  if (sonuc) {
    gecen++;
    console.log(`  OK    ${ad}`);
  } else {
    kalan++;
    console.log(`  HATA  ${ad}`);
    if (gorulen !== undefined) console.log("        ", gorulen);
  }
}
const yorumsuz = (m: string) => m.replace(/\{\/\*[\s\S]*?\*\/\}/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, "");

console.log("=".repeat(70));
console.log("OKUMA SİNYALİ + KASA SESİ BEKÇİSİ");
console.log("=".repeat(70));

/* ① KASA İMLECİ */
{
  const simdi = new Date("2026-10-15T12:00:00Z");
  const iso = (ms: number) => new Date(simdi.getTime() + ms).toISOString();
  kontrol("ilk soru (imleç yok) TABAN — geçmiş siparişler için ses çalmaz", kasaImleciKarari(null, simdi).tur === "TABAN");
  kontrol("bozuk imleç TABAN", kasaImleciKarari("dün", simdi).tur === "TABAN");
  kontrol("gelecekteki imleç TABAN (saat kayması sayım uydurmasın)", kasaImleciKarari(iso(60_000), simdi).tur === "TABAN");
  kontrol("24 saatten eski imleç TABAN (kapalı kalan sekme yüz siparişlik ses çalmasın)", kasaImleciKarari(iso(-KASA_IMLEC_TAVANI_MS - 1), simdi).tur === "TABAN");
  const k = kasaImleciKarari(iso(-60_000), simdi);
  kontrol("geçerli imleç SAYAR, imleci aynen döndürür", k.tur === "SAY" && k.imlec.toISOString() === iso(-60_000));
  kontrol("  ...24 saat sınırının içi sayar (sınır ölçüsü tek kaynaktan)", kasaImleciKarari(iso(-KASA_IMLEC_TAVANI_MS + 1000), simdi).tur === "SAY");
  kosanBolumler.push("imlec");
}

/* ② BAĞ */
{
  const eylem = yorumsuz(kaynakOku("src/app/kasa-sesi-eylem.ts"));
  const izin = eylem.indexOf('if (!(await izinVarMi("satis.gor"))) return null;');
  const sayim = eylem.indexOf("await prisma.sale.count(");
  kontrol("sayaç izinsize cevap VERMEZ (izin sayımdan önce)", izin >= 0 && sayim > izin);
  kontrol("  ...aralık (imleç, şimdi] ve iptal SAYILMAZ",
    /where: \{ createdAt: \{ gt: karar\.imlec, lte: simdi \}, iptalTarihi: null \}/.test(eylem));
  kontrol("  ...sayım düşerse imleç İLERLEMEZ (sipariş kaçmaz)", /return \{ sayi: 0, imlec: karar\.imlec\.toISOString\(\) \};/.test(eylem));
  kontrol("  ...«use server» dosyası sabit dışa AKTARMAZ (30.08 vakası)", !/^export const /m.test(eylem));
  const bilesen = yorumsuz(kaynakOku("src/components/kasa-sesi.tsx"));
  kontrol("bileşen: yeni sipariş + tercih AÇIK iken kasa sesi çalar ve bildirim gösterir",
    /if \(cevap\.sayi > 0 && tercihOku\(\)\) \{\s*sesCal\("kasa"\);\s*setBildirim\(cevap\.sayi\);/.test(bilesen));
  kontrol("  ...bildirim SATIŞLARA götürür (İlke #16)", /<Link href="\/satislar"/.test(bilesen));
  kontrol("  ...dakikada bir sorar, imleci sunucudan alır", /const ARALIK_MS = 60_000;/.test(bilesen) && /imlec\.current = cevap\.imlec;/.test(bilesen));
  kontrol("  ...tercih bellekte, depolama yalnız kalıcılık (depolama yoksa da düğme çalışır)",
    /tercih = yeni;\s*try \{\s*window\.localStorage\.setItem\(ANAHTAR/.test(bilesen));
  const yerlesim = yorumsuz(kaynakOku("src/app/layout.tsx"));
  kontrol("üst çubukta her sayfada çizilir", /<BildirButonu \/>\s*<KasaSesi \/>\s*<UyariCani \/>/.test(yerlesim));
  kosanBolumler.push("bag");
}

/* ③ PAKETLE */
{
  const p = yorumsuz(kaynakOku("src/app/paketle/paketleyici.tsx"));
  kontrol("eski kısık ton yerine ORTAK sinyal (ses + parlama + titreşim)", /function tonCal\(eslesti: boolean\) \{\s*okumaSinyali\(eslesti\);\s*\}/.test(p));
  kontrol("sipariş ETİKETİ okutulunca da sinyal (bulundu yeşil, bulunamadı kırmızı)", /tonCal\(cevap\.durum === "BULUNDU"\);/.test(p));
  kontrol("fazladan okutma HATA sinyali (doğru sesi çalmaz)",
    /const fazladan = bulunan !== null && bulunan\.kalem\.teyitliAdet >= bulunan\.kalem\.adet;\s*tonCal\(bulunan !== null && !fazladan\);/.test(p));
  kontrol("ilk tuş/dokunuşta ses hazırlanır (USB okuyucu da tuş gönderir)", /useEffect\(\(\) => sesiHazirla\(\), \[\]\);/.test(p));
  const s = yorumsuz(kaynakOku("src/lib/okuma-sinyali.ts"));
  const sinyalGovdesi = s.slice(s.indexOf("export function okumaSinyali("));
  kontrol("sinyal: ses + ekranın tamamı parlar + titreşim (üçü birden)",
    /sesCal\(sinyal\);/.test(sinyalGovdesi) && /parla\(sinyal\);/.test(sinyalGovdesi) && /navigator\.vibrate\?\.\(eslesti \? 60 : \[120, 60, 120, 60, 120\]\)/.test(sinyalGovdesi));
  kontrol("  ...parlama renkleri temadan (yeşil = kâr, kırmızı = zarar), tıklamayı engellemez",
    /background: sinyal === "onay" \? "var\(--se-kar\)" : "var\(--se-zarar\)"/.test(s) && /pointerEvents: "none"/.test(s));
  kontrol("  ...onay ve hata sesi AYIRT EDİCİ (iki tiz ton ↔ üç alçak bıp)",
    /ton\(ctx, 1046, 0, 0\.12, "sine", 0\.35\);/.test(s) && /for \(const bas of \[0, 0\.2, 0\.4\]\) ton\(ctx, 196, bas, 0\.15, "square", 0\.22\);/.test(s));
  kosanBolumler.push("paketle");
}

if (kosanBolumler.length !== BOLUM_SAYISI) {
  console.log(`\nKOŞUM YARIM KALDI (${kosanBolumler.length}/${BOLUM_SAYISI}) — sonuç GEÇERSİZ`);
  process.exitCode = 1;
} else if (kalan === 0) console.log(`\nTÜM KONTROLLER GEÇTİ (${gecen})`);
else {
  console.log(`\n${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrolden)`);
  process.exitCode = 1;
}
