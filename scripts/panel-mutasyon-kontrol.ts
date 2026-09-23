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
/** K252: tek satir suzgec — cubuk ve donem listesi. */
const CUBUK = "src/components/suzgec-cubugu.tsx";
const DONEM = "src/lib/donem.ts";
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
    /* K254: cipe tasindi — etiket artik baglantinin icinde, gorunur span. */
    bul:
      "      <span className=\"min-w-0 truncate\">{etiket}</span>",
    koy:
      "      <span className=\"sr-only\">{etiket}</span>",
    bozdugu:
      "ekranda yalniz rakam kalir; '11' tek basina neyin 11'i oldugunu soylemez",
  },
  {
    /* Gorunur etiket eklenince sr-only 'gereksiz' sanilabilir; degil.
       Yayilan baglanti kutunun tamamini kapliyor ve gorunur etiket
       onun ICINDE degil - erisilebilir ad ondan gelmez. */
    /* K254: YON DEGISTI. Eskiden sr-only kopyanin KALKMASI hataydi (etiket
       baglantinin disindaydi). Cipte etiket baglantinin ICINDE; ikinci bir
       sr-only kopya ekran okuyucuya ayni adi IKI KEZ okutur. */
    ad: "EKRAN OKUYUCUYA AD IKI KEZ OKUNUYOR (sr-only kopya)",
    yon: "FAZLADAN",
    dosya: KUTU,
    bul:
      "      <span className=\"min-w-0 truncate\">{etiket}</span>",
    koy:
      "      <span className=\"min-w-0 truncate\">{etiket}</span><span className=\"sr-only\">{etiket}</span>",
    bozdugu:
      "ekran okuyucu her cipte adi iki kez okur - erisilebilirlik gurultusu",
  },
  {
    ad: "ILERLEME BAGLANTISININ 44 PX ALANI KALKTI",
    yon: "KALDIRAN",
    dosya: KUTU,
    bul:
      "inline-flex min-h-11 items-center rounded-md px-1.5",
    koy:
      "inline-flex items-center rounded-md px-1.5",
    bozdugu:
      "serit kuculunce ikincil hedef 44 px altina duser; ana baglanti ile arasi daralir ve telefonda YANLIS liste acilir",
  },
  {
    ad: "KUTUCUGUN 44 PX DOKUNMA ALANI KALKTI",
    yon: "KALDIRAN",
    dosya: KUTU,
    bul:
      "inline-flex min-h-11 items-center gap-1.5 rounded-md",
    koy:
      "inline-flex items-center gap-1.5 rounded-md",
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
  {
    ad: "HIZLI PENCERE SIRASI LISTEDEN AYRISTI (BUGUN one gecti)",
    yon: "FAZLADAN",
    dosya: DONEM,
    bul:
      "  \"DUN\",\n  \"BUGUN\",\n  \"BU_HAFTA\",\n  \"SON_30_GUN\",",
    koy:
      "  \"BUGUN\",\n  \"DUN\",\n  \"BU_HAFTA\",\n  \"SON_30_GUN\",",
    bozdugu:
      "21.08 karari (DUN onde) sessizce cevrilir; hizli liste kendi sirasini uydurur",
  },
  {
    ad: "KATLANAN PENCERELER ACILIRDA CIZILMIYOR",
    yon: "KALDIRAN",
    dosya: CUBUK,
    bul:
      "            {KATLANAN_PENCERELER.map((p) => (",
    koy:
      "            {([] as readonly PencereTuru[]).map((p) => (",
    bozdugu:
      "SON_15_GUN / 3 ay / 6 ay / 1 yil hicbir dugmede yok - yer imi calisir, ekrandan secilemez",
  },
  {
    ad: "KATLANAN SECIM DUGMEDE ADSIZ (hep «Ozel aralik»)",
    yon: "KALDIRAN",
    dosya: CUBUK,
    bul:
      "                {katlananSecili",
    koy:
      "                {false",
    bozdugu:
      "Son 3 ay seciliyken dugme «Ozel aralik» yazar - secili sey gorunmez olur (Ilke #5)",
  },
  {
    ad: "KIYAS YUVASI CUBUKTAN DUSTU",
    yon: "KALDIRAN",
    dosya: SAYFA,
    bul:
      "          kiyas={kiyasSecici}\n",
    koy:
      "",
    bozdugu:
      "kiyas dugmeleri hicbir yerde cizilmez - karsilastirma ekrandan kaybolur",
  },
  {
    ad: "HIZLIDA OLMAYAN SECILI KIYAS DUGMESIZ",
    yon: "KALDIRAN",
    dosya: SAYFA,
    bul:
      "        ...(kiyasTuru && !(HIZLI_KIYAS as readonly string[]).includes(kiyasTuru)\n          ? [kiyasTuru]\n          : []),",
    koy:
      "        ...([] as string[]),",
    bozdugu:
      "kiyas=ucAy adresle acilinca rozetler ucAy'a gore hesaplanir ama secili dugme yoktur",
  },
  {
    ad: "IADE ROZETI ARTISI IYI SAYIYOR",
    yon: "KALDIRAN",
    dosya: SAYFA,
    bul:
      "                        (n) => String(n),\n                        false,\n",
    koy:
      "                        (n) => String(n),\n",
    bozdugu:
      "iade artinca rozet YESIL yanar - yanlis mujde",
  },
  {
    ad: "HUNI SATIRI KALKTI",
    yon: "KALDIRAN",
    dosya: SAYFA,
    bul:
      "                    <span className=\"font-medium\">{t(\"huniEtiketi\")}</span>\n",
    koy:
      "",
    bozdugu:
      "satin alinan / mal kabul / kargo sayilari panelden sessizce dusmus olur - 01.09 karari cevrilmis olur",
  },
  {
    ad: "HUNIDE IKI TARIH EKSENI NOTU KALKTI",
    yon: "KALDIRAN",
    dosya: SAYFA,
    bul:
      "                      <span className=\"block\">{t(\"kargoEkseniNotu\")}</span>\n",
    koy:
      "",
    bozdugu:
      "satis SATIS tarihine, kargo SEVKIYAT tarihine gore - not olmayinca 'satis 2 kargo 6 neden tutmuyor' sorusu doner",
  },
  {
    ad: "ROZETTEN ONCEKI DEGER DUSTU",
    yon: "KALDIRAN",
    dosya: SAYFA,
    bul:
      "            : ` · ${tRapor(\"kiyasOncekiKisa\")} ${bicimle(onceki)}`}",
    koy:
      "            : \"\"}",
    bozdugu:
      "rozet yalniz «▲ %8» yazar - neye gore oldugu gorunmez, kanit dusmus olur",
  },
  {
    ad: "SATIS KARTINA IADE NOTU GERI GELDI (cift sayim)",
    yon: "FAZLADAN",
    dosya: SAYFA,
    bul:
      "                      /* K253: iade adedi artık KENDİ KARTINDA — buradaki not\n                         kalktı; aynı sayıyı iki kartta yazmak tekrar olurdu. */\n",
    koy:
      "                      altNot={<span>{t(\"iadeAdedi\", { sayi: blok.toplamIadeAdedi })}</span>}\n",
    bozdugu:
      "ayni iade sayisi iki kartta yazar; okuyan iki ayri sey sanir",
  },
  {
    ad: "SIFIR CIP BAGLANTI OLDU (Ilke #2)",
    yon: "FAZLADAN",
    dosya: KUTU,
    bul:
      "        <span className={sinif}>{govde}</span>",
    koy:
      "        <Link href={gorev.adres} className={sinif}>{govde}</Link>",
    bozdugu:
      "temiz cipe tiklaninca BOS liste acilir - tiklanabilir gorunen sey bir sey yapmaz",
  },
  {
    ad: "SERIT BASLIGI KALKTI",
    yon: "KALDIRAN",
    dosya: KUTU,
    bul:
      "        {t(\"baslik\")}\n",
    koy:
      "",
    bozdugu:
      "satirdaki cipler neyin cipi oldugunu soylemez - «Onay bekleyen 3» tek basina bir gorev listesi gibi okunmaz",
  },
  {
    ad: "GRUP AYRACI KALKTI (iki emek karisti)",
    yon: "KALDIRAN",
    dosya: KUTU,
    bul:
      "            <span className=\"bg-border hidden h-5 w-px md:block\" aria-hidden />\n",
    koy:
      "",
    bozdugu:
      "sevkiyat ile tedarik tek yigin olur - 20.08 gerekcesi (farkli saat, farkli kisi) sessizce dusmus olur",
  },
  {
    ad: "SURE METNI RAKAMIN YANINA GECTI",
    yon: "KALDIRAN",
    dosya: KUTU,
    bul:
      "        <span className=\"font-semibold\">{sureMetni}</span>",
    koy:
      "        <span className=\"font-semibold tabular-nums\">{gorev.sayi} {sureMetni}</span>",
    bozdugu:
      "tarife cipinde «0 · Bugun son gun» yazar - ekran kendiyle celisir",
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
