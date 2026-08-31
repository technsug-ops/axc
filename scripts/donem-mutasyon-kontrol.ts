import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

/**
 * ============================================================================
 *  PANEL — MUTASYON HARNESS'İ (K106 kanal sırası)
 * ----------------------------------------------------------------------------
 *      npm run panel-mutasyon:kontrol
 *
 *  ⚠ KAPSAM BEYAN EDİLİYOR: bu harness `panel:dogrula`nın 604 ölçütünün
 *  TAMAMINI değil, **K106 kanal sırasını** sınıyor. Gerisi ayrı bir iştir ve
 *  bugün açılmadı — "her şey sınandı" diye bir iddia YOK.
 *
 *  ⛔ NİYE BU: sıralama bir GÖRÜNÜM kuralı ve sessizce eski hâline dönerse
 *  kimse fark etmez — ekran çalışmaya devam eder, yalnız kartlar oynar.
 *  Tam da mutasyonsuz bir bekçinin körleşeceği yer.
 *
 *  Üç kapı (öteki harness'lerle aynı gövde):
 *    ① desen kaynakta TAM BİR KEZ geçmeli
 *    ② mutasyon diskten okunarak UYGULANDIĞI doğrulanır
 *    ③ hüküm ÇIKIŞ KODUNDAN — bekçinin başlığı yoksa "ÇÖKTÜ"
 * ============================================================================
 */

const BEKCI = "scripts/donem-dogrula.ts";
/**
 * ⚠ ÇAPA BEKÇİNİN AÇILIŞ SATIRI — K106 bölümününki DEĞİL. Kapının işi
 * "bekçi gerçekten KOŞTU mu" sorusunu cevaplamak; koşum ortasında mutasyon
 * yüzünden çıkan bir çökme ZATEN kırmızıdır ve geçerli bir yakalamadır.
 * _(Aynı düzeltme `simulasyon-mutasyon-kontrol.ts`te de yapıldı.)_
 */
const BEKCI_BASLIGI = "DÖNEM KORUMASI BEKÇİSİ";

const KURAL = "src/lib/donem-korumasi.ts";
const KAPI = "src/lib/donem-kapisi.ts";
const SATIS = "src/lib/satis.ts";
const AKTARMA = "src/lib/ice-aktarma/yaz.ts";
const EYLEM = "src/app/ayarlar/donemler/eylemler.ts";
const RAPOR = "src/lib/donem-raporu.ts";

type Mutasyon = {
  ad: string;
  yon: "KALDIRAN" | "FAZLADAN";
  dosya: string;
  bul: string;
  koy: string;
  bozdugu: string;
};

const MUTASYONLAR: Mutasyon[] = [
  {
    ad: "KAPIYI ATLAYAN — kapali donem de SERBEST sayiliyor",
    yon: "KALDIRAN",
    dosya: KURAL,
    bul: '  if (!g.kapaliDonemler.has(anahtar)) return { sonuc: "SERBEST" };',
    koy: '  return { sonuc: "SERBEST" };',
    bozdugu:
      "kapali doneme yazim SESSIZCE gecer — beyan edilmis vergi tutmaz hale gelir ve kimse gormez",
  },
  {
    /**
     * ⚠ ONCE BASKA BIR MUTASYON YAZILMISTI ve KACTI: `size === 0` erken
     * donusunu SILEN senaryo. Olculdu ve o satirin DAVRANIS icin gereksiz
     * oldugu gorildu — `has()` bos kumede zaten `false` doner, yani hicbir
     * girdi ayrismiyor. Satir bir KAPI degil KISA DEVRE; kaldirmak davranisi
     * degistirmiyor. Anlamsiz mutasyon, GERCEK riskle degistirildi:
     * kosulu TERS cevirmek. O hâlde bos kume DURAKSAR ve ilk kurulum kilitlenir.
     */
    ad: "ACIK DONEM YOKKEN KILITLENIYOR (kosul ters cevrildi)",
    yon: "FAZLADAN",
    dosya: KURAL,
    bul: "  if (!g.kapaliDonemler.has(anahtar)) return { sonuc: \"SERBEST\" };",
    koy: "  if (g.kapaliDonemler.has(anahtar)) return { sonuc: \"SERBEST\" };",
    bozdugu:
      "hicbir donem kapatilmamisken de duraksar; yeni kurulan firma ILK GUNDEN calisamaz",
  },
  {
    ad: "anahtar bicimi bozuldu (sifir dolgusu kalkti)",
    yon: "FAZLADAN",
    dosya: KURAL,
    bul: "  return `${yil}-${String(ay).padStart(2, \"0\")}`;",
    koy: "  return `${yil}-${ay}`;",
    bozdugu:
      "kume karsilastirmasi sessizce bos doner ve kapi HIC yanmaz — en pahali yalanci yesil",
  },
  {
    ad: "ISRAR IZI SILINDI — uyariya ragmen bayragi yok",
    yon: "KALDIRAN",
    dosya: KAPI,
    bul: "    uyariyaRagmen: true,",
    koy: "",
    bozdugu:
      "rapor 'uyariya ragmen yazilan' satirini SIFIR gosterir; muhasebeci hic istisna yok sanir",
  },
  {
    ad: "iz DONEMI tasimiyor (rapor hangi doneme ait bilemez)",
    yon: "KALDIRAN",
    dosya: KAPI,
    bul: "    donem: girdi.donem,",
    koy: "",
    bozdugu: "rapor izleri donemle eslestiremez ve sayim her donemde 0 cikar",
  },
  {
    ad: "SATIS kapiyi ICERI ALIYOR ama CAGIRMIYOR",
    yon: "KALDIRAN",
    dosya: SATIS,
    bul: "    const donemSonucu = await donemKapisi(tx, girdi.soldAt, girdi.donemIsrari);",
    koy: "    const donemSonucu = { durum: \"SERBEST\" } as const;",
    bozdugu:
      "satis yolu korunuyor GORUNUR (import duruyor) ama kapi hic kosmaz — sayim korumasindaki ders",
  },
  {
    /**
     * ⚠ ILK YAZIMDA FILTRENIN PARAMETRESI SILINIYORDU ve KACTI: bekci
     * `betikDonemKarari(` desenini buluyordu, cunku cagri yerinde duruyordu.
     * GERCEK regresyon bu degil — filtre HESAPLANIP KULLANILMAMASI. Mutasyon
     * artik onu hedefliyor: suzulmus liste yerine ham plan yaziliyor.
     */
    ad: "ICE AKTARMA suzgeci hesapliyor ama HAM plani yaziyor",
    yon: "FAZLADAN",
    dosya: AKTARMA,
    bul: "          data: yazilacakHareketler.map((h) => ({",
    koy: "          data: plan.acilisHareketleri.map((h) => ({",
    bozdugu:
      "kapali doneme toplu yazim SESSIZCE gecer; atlanan satir raporlanmaz",
  },
  {
    ad: "GELECEK/BUGUNKU donem kapatilabiliyor",
    yon: "FAZLADAN",
    dosya: EYLEM,
    bul: "  if (yil * 12 + ay >= bu.yil * 12 + bu.ay) {",
    koy: "  if (false) {",
    bozdugu:
      "bitmemis ay kapatilir; o ay boyunca HER kayit israr ister ve kutu anlamini yitirir",
  },
  {
    ad: "RAPOR kendi envanter hesabini yaziyor",
    yon: "FAZLADAN",
    dosya: RAPOR,
    bul: "  const envanter = await envanterVerisi(bit);",
    koy: "  const envanter = await envanterVerisi();",
    bozdugu:
      "donem SONU yerine BUGUNKU envanter yazilir — kapanmis ayin raporu her gun degisir",
  },
  {
    ad: "RAPOR sayfalanmis kumeden topluyor (K61 dersi)",
    yon: "FAZLADAN",
    dosya: RAPOR,
    bul: "      where: { soldAt: { gte: bas, lt: bit }, iptalTarihi: null },",
    koy:
      "      where: { soldAt: { gte: bas, lt: bit }, iptalTarihi: null }," +
      String.fromCharCode(10) +
      "      take: 50,",
    bozdugu:
      "toplam SAYFANIN toplamina duser; ekran yalan soyler ve hicbir sey hata vermez",
  },
  {
    ad: "RAPOR iptalleri sayiyor",
    yon: "KALDIRAN",
    dosya: RAPOR,
    bul: "      where: { soldAt: { gte: bas, lt: bit }, iptalTarihi: null },",
    koy: "      where: { soldAt: { gte: bas, lt: bit } },",
    bozdugu: "iptal edilmis satis ciroya ve NET'e girer — rakam abartilir",
  },
  {
    ad: "RAPOR Settlement.period* okuyor (baska bir seyin donemi)",
    yon: "FAZLADAN",
    dosya: RAPOR,
    bul: "  const { bas, bit } = donemSiniri(yil, ay);",
    koy:
      "  const { bas, bit } = donemSiniri(yil, ay);" +
      String.fromCharCode(10) +
      "  const _p = { periodStart: bas, periodEnd: bit };",
    bozdugu:
      "pazaryerinin ODEME donemi ile muhasebe donemi karisir — kanalin takvimine gore beyan uretilir",
  },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, {
    shell: true,
    encoding: "utf8",
    maxBuffer: 40 * 1024 * 1024,
  });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

/** Satır sonlarını hedef dosyanın biçimine uydurur (depoda CRLF de var). */
function desenNormalle(kaynak: string, desen: string): string {
  return kaynak.includes("\r\n") ? desen.split("\n").join("\r\n") : desen;
}

console.log("");
console.log("DÖNEM KORUMASI — K108 MUTASYON TURU");
console.log("");

let yakalanan = 0;
const kacan: string[] = [];
const bozuk: string[] = [];

for (const m of MUTASYONLAR) {
  const asil = readFileSync(m.dosya, "utf8");
  const bul = desenNormalle(asil, m.bul);
  const koy = desenNormalle(asil, m.koy);

  const adet = asil.split(bul).length - 1;
  if (adet !== 1) {
    bozuk.push(
      m.ad + "\n       desen " + m.dosya + " içinde " + adet + " kez geçiyor (1 olmalı)",
    );
    continue;
  }

  const mutant = asil.replace(bul, koy);
  let sonuc: { kod: number; ciktiVar: boolean };
  try {
    writeFileSync(m.dosya, mutant, "utf8");
    const diskten = readFileSync(m.dosya, "utf8");
    if (diskten !== mutant || mutant === asil) {
      bozuk.push(m.ad + "\n       mutasyon diske UYGULANMADI");
      continue;
    }
    sonuc = bekciyiKostur();
  } finally {
    writeFileSync(m.dosya, asil, "utf8");
  }

  const isaret = m.yon === "KALDIRAN" ? "−" : "+";
  if (sonuc.kod !== 0 && sonuc.ciktiVar) {
    yakalanan++;
    console.log("  ✓  " + isaret + " " + m.ad);
  } else if (sonuc.kod !== 0) {
    bozuk.push(m.ad + "\n       bekçi ÇÖKTÜ (başlık basılmadı) — ölçüm geçersiz");
  } else {
    kacan.push(m.ad + "\n       KORUMASIZ: " + m.bozdugu);
  }
}

console.log("");
if (kacan.length) {
  console.log("  KAÇAN MUTASYONLAR — bekçi bunları GÖRMEDİ:\n");
  for (const k of kacan) console.log("  ✗  " + k);
  console.log("");
}
if (bozuk.length) {
  console.log("  HARNESS HATASI — mutasyon ölçülemedi:\n");
  for (const b of bozuk) console.log("  ⛔ " + b);
  console.log("");
}

const toplam = MUTASYONLAR.length;
const kaldiran = MUTASYONLAR.filter((m) => m.yon === "KALDIRAN").length;
console.log(
  "  " + yakalanan + "/" + toplam + " mutasyon yakalandı" +
    "   (− kaldıran " + kaldiran + " · + fazladan " + (toplam - kaldiran) + ")",
);
if (kacan.length || bozuk.length) {
  console.log("\n  ⛔ Kaçan ya da ölçülemeyen mutasyon var — bekçi eksik.\n");
  process.exitCode = 1;
} else {
  console.log("  ✓  K108 kapısı İKİ YÖNDEN de sınandı ve kırmızı yandığı GÖRÜLDÜ\n");
}
