import { readFileSync, writeFileSync } from "node:fs";

import { desenNormalle } from "./mutasyon-deseni";
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

const BEKCI = "scripts/panel-dogrula.ts";
/**
 * ⚠ ÇAPA BEKÇİNİN AÇILIŞ SATIRI — K106 bölümününki DEĞİL. Kapının işi
 * "bekçi gerçekten KOŞTU mu" sorusunu cevaplamak; koşum ortasında mutasyon
 * yüzünden çıkan bir çökme ZATEN kırmızıdır ve geçerli bir yakalamadır.
 * _(Aynı düzeltme `simulasyon-mutasyon-kontrol.ts`te de yapıldı.)_
 */
const BEKCI_BASLIGI = "PANEL";

const SIRA = "src/lib/kanal-sirasi.ts";
const PANEL = "src/lib/panel.ts";
/** K245: oran değişimi PUAN cinsinden — yüzdenin yüzdesi yanlış rakam üretir. */
const KIYAS = "src/lib/karsilastirma.ts";
const SAYFA = "src/app/page.tsx";
/** K248: görev kutucuğu şerit biçimine geçti (etiket önde, rakam yanında). */
const KUTU = "src/app/gorev-kutusu.tsx";
const PASTA = "src/components/pasta-grafik.tsx";
/** K246: iki pay çubuğunun farkı cümleye çevriliyor. */
const PAY = "src/lib/panel/pay-farki.ts";

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
    ad: "panel yine CIRO sirasina dondu",
    yon: "KALDIRAN",
    dosya: PANEL,
    bul: "      const liste = kanallariSirala([...kanallar.values()], kanalKipi);",
    koy: "      const liste = [...kanallar.values()].sort((a, b) => b.gelir - a.gelir);",
    bozdugu:
      "kart yerleri veriyle birlikte oynar; kullanici her acilista aradigi kanali yeniden arar",
  },
  {
    ad: "sabit sira listesi bosaltildi",
    yon: "KALDIRAN",
    dosya: SIRA,
    bul: '  "TRENDYOL",\n  "HEPSIBURADA",\n  "N11",\n  "AMAZON",',
    koy: "",
    bozdugu: "butun kanallar ayni basamaga duser, sira tamamen ADA kalir",
  },
  {
    ad: "sira karisti (HB ile N11 yer degistirdi)",
    yon: "FAZLADAN",
    dosya: SIRA,
    bul: '  "HEPSIBURADA",\n  "N11",',
    koy: '  "N11",\n  "HEPSIBURADA",',
    bozdugu: "kullanicinin saydigi sira degil, baska bir sira cizilir",
  },
  {
    ad: "sayilmayan kanal listeden DUSURULUYOR",
    yon: "FAZLADAN",
    dosya: SIRA,
    bul: "  return [...kanallar].sort((a, b) => {",
    koy: "  return [...kanallar]\n    .filter((k) => kanalSirasi(k.kanalKodu) < KANAL_SIRASI.length)\n    .sort((a, b) => {",
    bozdugu:
      "sayilmayan 7 kanal panelden SESSIZCE kaybolur — yarin acilan kanal da hic gorunmez",
  },
  {
    ad: "esitlik bozucu AD kaldirildi",
    yon: "KALDIRAN",
    dosya: SIRA,
    bul: '    return a.kanalAdi.localeCompare(b.kanalAdi, "tr");',
    koy: "    return 0;",
    bozdugu:
      "sayilmayan kanallarin arasindaki duzen kosumdan kosuma degisebilir (sort kararliligi motora kalir)",
  },
  {
    ad: "girdi dizisi YERINDE siralaniyor (cagiranin dizisi bozulur)",
    yon: "FAZLADAN",
    dosya: SIRA,
    bul: "  return [...kanallar].sort((a, b) => {",
    koy: "  return (kanallar as T[]).sort((a, b) => {",
    bozdugu:
      "cagiran ayni diziyi baska yerde kullaniyorsa onun sirasi da sessizce degisir",
  },
  // === K106-2 IKI KIP =================================================
  {
    ad: "ciro kipi aslinda sabit duzen ciziyor (secim ise yaramiyor)",
    yon: "KALDIRAN",
    dosya: SIRA,
    bul: "      const ciroFarki = b.gelir - a.gelir;",
    koy: "      const ciroFarki = 0;",
    bozdugu:
      "kullanici cipe basar, ekranda HICBIR SEY degismez — ozellik VARMIS GIBI gorunur",
  },
  {
    ad: "ciro kipinde esitlik bozucu SABIT DUZEN kaldirildi",
    yon: "KALDIRAN",
    dosya: SIRA,
    bul:
      "      const duzenFarki = kanalSirasi(a.kanalKodu) - kanalSirasi(b.kanalKodu);" +
      String.fromCharCode(10) +
      "      if (duzenFarki !== 0) return duzenFarki;",
    koy: "",
    bozdugu:
      "sifirli donemde butun kanallar esit ciroludur ve ekran her acilista BASKA bir sirada gorunur",
  },
  {
    ad: "varsayilan CIRO yapildi (panel her acilista oynayan bir liste)",
    yon: "FAZLADAN",
    dosya: SIRA,
    bul: 'export const VARSAYILAN_KANAL_SIRASI: KanalSiraKipi = "duzen";',
    koy: 'export const VARSAYILAN_KANAL_SIRASI: KanalSiraKipi = "ciro";',
    bozdugu:
      "kullanici kararina aykiri: panel once 'nerede ne var' sorusuna cevap vermeli",
  },
  {
    ad: "kip KIYAS blogua gitmiyor (ayni ekranda iki farkli sira)",
    yon: "KALDIRAN",
    dosya: "src/app/page.tsx",
    bul:
      "        kanalKipi," +
      String.fromCharCode(10) +
      "      )" +
      String.fromCharCode(10) +
      "    : null;",
    koy:
      "      )" + String.fromCharCode(10) + "    : null;",
    bozdugu:
      "ust blok sabit duzende, kiyas blogu ciroda cizilir — kartlar goz goze karsilastirilamaz",
  },
  {
    /* K245: marj %17,1 -> %16,5 hareketi 0,6 PUAN'dir. Yuzde olarak
       anlatilirsa ekranda %3,5 yazar ve kullanici marjin 3,5 puan
       dustugunu sanir. Rakam dogru, cumle yanlis. */
    ad: "ORAN DEGISIMI YUZDEYE DONDU (puan yerine)",
    yon: "KALDIRAN",
    dosya: KIYAS,
    bul: "  return { simdi, onceki, puan: simdi - onceki, karsilastirilabilir: true };",
    koy: "  return { simdi, onceki, puan: ((simdi - onceki) / onceki) * 100, karsilastirilabilir: true };",
    bozdugu:
      "ekranda yuzdenin yuzdesi yazar; rakam MAKUL gorunur ve yanlis oldugunu soylemez",
  },
  {
    ad: "CIRO YOKKEN MARJ SIFIR SAYILIYOR",
    yon: "FAZLADAN",
    dosya: KIYAS,
    bul: "  if (ciro <= 0) return null;",
    koy: "  if (ciro <= 0) return 0;",
    bozdugu:
      "ciro yokken ekran '%0 marj' yazar; oysa dogru cevap 'hesaplanamiyor'",
  },
  {
    ad: "MARJ KUTUSU YUZDE ROZETINE BAGLANDI",
    yon: "KALDIRAN",
    dosya: SAYFA,
    bul: "                        kiyas={oranKiyasRozeti(marjD)}",
    koy: "                        kiyas={null}",
    bozdugu:
      "marjin degisimi ekrandan kalkar; ciro artarken marjin gerilemesi gorunmez olur",
  },
  {
    ad: "MARJ KUTUSU EKRANDAN KALKTI",
    yon: "KALDIRAN",
    dosya: SAYFA,
    bul: "                        etiket={t(\"net2Marji\")}",
    koy: "                        etiket={t(\"net2\")}",
    bozdugu:
      "govde dogru calisir, ekranda karsiligi olmaz (K121 dersi)",
  },
  {
    ad: "KUCUK KIPIRTI DA ROZET YAKIYOR",
    yon: "FAZLADAN",
    dosya: SAYFA,
    bul: "    if (Math.abs(d.puan) < 0.05) {",
    koy: "    if (false) {",
    bozdugu:
      "0,02 puanlik kipirti 'degisim' diye yazilir; rozet her gun yanar ve okunmaz olur",
  },
  {
    /* K246: NET payi null iken 'ayni hizada' demek, kar hesaplanamamis
       bir kanal hakkinda olmayan bir bilgi uydurmaktir. */
    ad: "KAR HESAPLANAMAYAN KANALA DA HUKUM YAZILIYOR",
    yon: "FAZLADAN",
    dosya: PAY,
    bul: "  if (net2Payi === null) return null;",
    koy: "  if (net2Payi === null) return { puan: 0, yon: \"AYNI\" };",
    bozdugu:
      "defterin bilmedigi bir kanal icin 'ayni hizada' yazilir - sistem takip etmedigi sey hakkinda iddia kurar",
  },
  {
    ad: "YUVARLAMA ARTIGI DA HUKUM SAYILIYOR",
    yon: "FAZLADAN",
    dosya: PAY,
    bul: "  if (Math.abs(fark) < PAY_FARKI_ESIGI) return { puan: 0, yon: \"AYNI\" };",
    koy: "  if (false) return { puan: 0, yon: \"AYNI\" };",
    bozdugu:
      "her kartta '0,01 puan ustunde' yazar; cumle gurultuye doner ve okunmaz olur",
  },
  {
    ad: "HUKUM CUMLESI EKRANDAN KALKTI",
    yon: "KALDIRAN",
    dosya: SAYFA,
    bul: "                  const pf = payFarki(pay.ciroPayi, pay.net2Payi);",
    koy: "                  const pf = null as ReturnType<typeof payFarki>;",
    bozdugu:
      "govde dogru calisir, kart yine iki cubuk gosterir ve farki okuyucu cikarir - K246'nin varlik sebebi yok olur",
  },
  {
    /* K247: kullanici "pazaryeri performansi ile ciroya gore kanal ayni
       duzlemde olamaz mi" dedi; halka panele kondu. */
    ad: "CIRO HALKASI PANELDEN KALKTI",
    yon: "KALDIRAN",
    dosya: SAYFA,
    bul: "                      <KanalDagilimiGrafigi",
    koy: "                      <NoktaliGrafik",
    bozdugu:
      "kanal payi panelde hic gorunmez; kullanicinin acikca istedigi gorsel yok olur",
  },
  {
    ad: "HALKA BOS DIZIYLE BESLENIYOR",
    yon: "KALDIRAN",
    dosya: SAYFA,
    bul: "                        dilimler={ustBlok.kanallar.map((k) => ({",
    koy: "                        dilimler={[].map((k: { kanalAdi: string; gelir: number }) => ({",
    bozdugu:
      "halka her zaman bos cizilir; nitelik yerinde durdugu icin kimse fark etmez",
  },
  {
    ad: "TANINMAYAN KANALIN VARSAYILAN RENGI KALKTI",
    yon: "KALDIRAN",
    dosya: SAYFA,
    bul: "                            KANAL_RENKLERI[k.kanalAdi] ?? KANAL_RENGI_VARSAYILAN,",
    koy: "                            KANAL_RENKLERI[k.kanalAdi],",
    bozdugu:
      "palet disi kanalin dilimi undefined renk alir ve SESSIZCE cizilmez - ciro toplamdan dusmez ama dilim kaybolur",
  },
  {
    ad: "KART CUBUKLARINA KANAL RENGI GELDI",
    yon: "FAZLADAN",
    dosya: SAYFA,
    bul: "            const pay = kanalPaylari.get(kanal.kanalKodu);",
    koy:
      "            const pay = kanalPaylari.get(kanal.kanalKodu);\n            const kanalTonu = KANAL_RENKLERI[kanal.kanalAdi];",
    bozdugu:
      "11 ton dort durum rengiyle karisir ve 'yesil = iyi' anlami coker - kodun kendi karari cignenir",
  },
  {
    ad: "GORUNUR ETIKET SERITTEN DUSTU",
    yon: "KALDIRAN",
    dosya: KUTU,
    bul:
      "      <span className=\"text-muted-foreground min-w-0 text-xs leading-tight break-words hyphens-auto\">",
    koy:
      "      <span className=\"sr-only\">",
    bozdugu:
      "ekranda yalniz rakam kalir; '11' tek basina neyin 11'i oldugunu soylemez",
  },
  {
    /* Gorunur etiket eklenince sr-only 'gereksiz' sanilabilir; degil.
       Yayilan baglanti kutunun tamamini kapliyor ve gorunur etiket
       onun ICINDE degil - erisilebilir ad ondan gelmez. */
    ad: "EKRAN OKUYUCU ETIKETI KALDIRILDI",
    yon: "KALDIRAN",
    dosya: KUTU,
    bul:
      "        <span className=\"sr-only\">{etiket}</span>",
    koy:
      "        ",
    bozdugu:
      "yayilan baglantinin erisilebilir adi kalmaz; ekran okuyucu 'baglanti' der, NEREYE gittigini soylemez",
  },
  {
    ad: "ILERLEME BAGLANTISININ 44 PX ALANI KALKTI",
    yon: "KALDIRAN",
    dosya: KUTU,
    bul:
      "relative z-10 inline-flex min-h-11 items-center",
    koy:
      "relative z-10 inline-flex items-center",
    bozdugu:
      "serit kuculunce ikincil hedef 44 px altina duser; ana baglanti ile arasi daralir ve telefonda YANLIS liste acilir",
  },
  {
    ad: "KUTUCUGUN 44 PX DOKUNMA ALANI KALKTI",
    yon: "KALDIRAN",
    dosya: KUTU,
    bul:
      "      className=\"hover:bg-muted/60 relative flex min-h-11 min-w-0 flex-wrap",
    koy:
      "      className=\"hover:bg-muted/60 relative flex min-w-0 flex-wrap",
    bozdugu:
      "serit kuculunce kutucuk telefonda 44 px altina duser - Ilke #8 ihlali, masaustunde HIC gorunmez",
  },
  {
    ad: "EFSANENIN TABAN GENISLIGI KALKTI",
    yon: "KALDIRAN",
    dosya: PASTA,
    bul:
      "    <ul className=\"min-w-[11rem] flex-1 space-y-0.5 text-xs\">",
    koy:
      "    <ul className=\"min-w-0 flex-1 space-y-0.5 text-xs\">",
    bozdugu:
      "dar sutunda efsane kalemleri shrink-0 oldugu icin TASAR ve kart kenari keser - kanal adi yok olur, yuzde yarim kalir",
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


console.log("");
console.log("PANEL — K106 KANAL SIRASI MUTASYON TURU");
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
  console.log("  ✓  K106 sırası İKİ YÖNDEN de sınandı ve kırmızı yandığı GÖRÜLDÜ\n");
}
