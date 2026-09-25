import { readFileSync } from "node:fs";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";
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
/** K256: ok cizgili halka. */
const HALKA = "src/components/halka-grafik.tsx";
/** K257: son 14 gun serisi. */
const SERI = "src/lib/panel/son-gun-serisi.ts";
/** K258: sutun kipi. */
const GRAFIK = "src/components/uc-serili-grafik.tsx";
const PANEL = "src/lib/panel.ts";
/** K245: oran değişimi PUAN cinsinden — yüzdenin yüzdesi yanlış rakam üretir. */
const KIYAS = "src/lib/karsilastirma.ts";
const SAYFA = "src/app/page.tsx";
/** K248: görev kutucuğu şerit biçimine geçti (etiket önde, rakam yanında). */
const KUTU = "src/app/gorev-kutusu.tsx";
const PASTA = "src/components/pasta-grafik.tsx";
/** K252: tek satir suzgec — cubuk ve donem listesi. */
const CUBUK = "src/components/suzgec-cubugu.tsx";
/** K270: telefon duzeni. */
const YERLESIM = "src/app/layout.tsx";
const ALT = "src/components/alt-cubuk.tsx";
const MENU = "src/app/menu/page.tsx";
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
    /* K256: HalkaGrafik'e tasindi. */
    bul: "                    <HalkaGrafik",
    koy: "                    <HalkaGrafikYok",
    bozdugu:
      "kanal payi panelde hic gorunmez; kullanicinin acikca istedigi gorsel yok olur",
  },
  {
    ad: "HALKA BOS DIZIYLE BESLENIYOR",
    yon: "KALDIRAN",
    dosya: SAYFA,
    bul: "                    ustBlok.kanallar.map((k) => ({",
    koy: "                    ([] as typeof ustBlok.kanallar).map((k) => ({",
    bozdugu:
      "halka her zaman bos cizilir; nitelik yerinde durdugu icin kimse fark etmez",
  },
  {
    ad: "TANINMAYAN KANALIN VARSAYILAN RENGI KALKTI",
    yon: "KALDIRAN",
    dosya: SAYFA,
    bul: "                      renk: KANAL_RENKLERI[k.kanalAdi] ?? KANAL_RENGI_VARSAYILAN,",
    koy: "                      renk: KANAL_RENKLERI[k.kanalAdi],",
    bozdugu:
      "palet disi kanalin dilimi undefined renk alir ve SESSIZCE cizilmez - ciro toplamdan dusmez ama dilim kaybolur",
  },
  {
    /* K255: YON CEVRILDI. K247'de kanal rengi kartlara girmesin diye FAZLADAN
       mutasyondu; kullanici demoyu onayladi, cubuklar kanal renginde.
       Simdi rengin DUSMESI hatadir (KALDIRAN). Eski gerekce panel-dogrula'da. */
    ad: "NET CUBUGU YINE NOTR (kanal rengi dustu)",
    yon: "KALDIRAN",
    dosya: SAYFA,
    bul:
      "                    etiket={bicim.yuzde(pay.net2Payi)}\n                    renk={kanalRengi}\n",
    koy:
      "                    etiket={bicim.yuzde(pay.net2Payi)}\n",
    bozdugu:
      "halka ile kart ayni kanali farkli renkte gosterir; goz ikisini eslestiremez",
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
      /* K270: etiket telefonda gizli sinifi aldi - capa tasindi. */
      "                    <span className=\"font-medium max-sm:hidden\">{t(\"huniEtiketi\")}</span>\n",
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
    /* K259-②: baslik gitti, ayrac geri geldi (gruplar ARASINDA) — capa ayraca. */
    ad: "GRUP AYRACI KALKTI (iki emek karisti)",
    yon: "KALDIRAN",
    dosya: KUTU,
    bul:
      "          {i > 0 ? <span className=\"bg-border hidden h-5 w-px md:block\" aria-hidden /> : null}\n",
    koy:
      "",
    bozdugu:
      "sevkiyat ile tedarik tek yigin olur - 20.08 gerekcesi (farkli saat, farkli kisi) sessizce dusmus olur",
  },
  {
    /* K266: sure dali kalkti (tarife cana tasindi). Capa «dal GERI GELDI»ye cevrildi. */
    ad: "SURE DALI GERI GELDI (seritte sureli gorev yok)",
    yon: "FAZLADAN",
    dosya: KUTU,
    bul:
      "      ) : (\n        <span className=\"font-semibold tabular-nums\">{gorev.sayi}</span>",
    koy:
      "      ) : sureMetni !== undefined ? (\n        <span className=\"font-semibold\">{sureMetni}</span>\n      ) : (\n        <span className=\"font-semibold tabular-nums\">{gorev.sayi}</span>",
    bozdugu:
      "tarife cipinde «0 · Bugun son gun» yazar - ekran kendiyle celisir",
  },
  {
    ad: "MARJ CIPI CIRO SIFIRKEN DE HESAPLANIYOR (sifira bolme)",
    yon: "FAZLADAN",
    dosya: SAYFA,
    bul:
      "karGorunur && kanal.gelir > 0 ? (kanal.net2 / kanal.gelir) * 100 : null",
    koy:
      "karGorunur ? (kanal.net2 / kanal.gelir) * 100 : null",
    bozdugu:
      "satissiz kanalda cip «NaN marj» ya da «Infinity marj» yazar",
  },
  {
    ad: "MARJ CIPI RENGI SABIT YESIL (durumdan degil)",
    yon: "KALDIRAN",
    dosya: SAYFA,
    bul:
      "          const marjD = marjDurumu(marj, ortalamaMarj);",
    koy:
      "          const marjD = \"guclu\" as ReturnType<typeof marjDurumu>;",
    bozdugu:
      "zarardaki kanal da yesil cip tasir - hukum rengi yalan soyler",
  },
  {
    ad: "NET-2 KIPI ASLINDA CIROYA GORE SIRALIYOR",
    yon: "KALDIRAN",
    dosya: SIRA,
    bul:
      "      const netFarki = (b.net2 ?? 0) - (a.net2 ?? 0);",
    koy:
      "      const netFarki = b.gelir - a.gelir;",
    bozdugu:
      "«NET-2'ye gore» dugmesi ciro sirasini verir - secim ise yaramaz, kullanici fark etmez",
  },
  {
    ad: "ALT SATIRDA SATISI OLMAYAN KANAL ADLARI YOK",
    yon: "KALDIRAN",
    dosya: SAYFA,
    bul:
      "              <span>{bosKanallar.map(([, ad]) => ad).join(\" · \")}</span>\n",
    koy:
      "",
    bozdugu:
      "«2 kanal» yazar ama hangileri oldugu gorunmez - 'N11 neden yok' sorusu doner",
  },
  {
    ad: "GRI SATIR CIRO SUNUMUNU BIRAKTI (13.08 kurali)",
    yon: "KALDIRAN",
    dosya: SAYFA,
    bul:
      "              <CiroSunumu\n                brut={bicim.para(kanal.gelir, blok.paraBirimi)}",
    koy:
      "              <CiroSunumuYok\n                brut={bicim.para(kanal.gelir, blok.paraBirimi)}",
    bozdugu:
      "kanal kartinda ciro baska bicimde yazar - panelde iki farkli ciro sunumu, 'hangisi dogru' sorusu",
  },
  {
    ad: "DIGER TOPLAMASI KALKTI (11 ok birbirine girer)",
    yon: "KALDIRAN",
    dosya: HALKA,
    bul:
      "export const HALKA_DILIM_TAVANI = 4;",
    koy:
      "export const HALKA_DILIM_TAVANI = 99;",
    bozdugu:
      "11 kanal 11 ok - kucuk dilimlerin oklari ust uste biner, okunmaz",
  },
  {
    ad: "DIPNOT KALKTI (toplanan sey sessizce kayboldu)",
    yon: "KALDIRAN",
    dosya: SAYFA,
    bul:
      "                        toplananSayi > 0 ? t(\"halkaDipnot\", { sayi: toplananSayi }) : undefined",
    koy:
      "                        undefined",
    bozdugu:
      "«Diger» dilimi vardir ama kac kanalin toplandigi hicbir yerde yazmaz",
  },
  {
    ad: "HALKA ISTEMCIDE CIZILIYOR (gereksiz use client)",
    yon: "FAZLADAN",
    dosya: HALKA,
    bul:
      "export type HalkaDilimi = {",
    koy:
      "\"use client\";\nexport type HalkaDilimi = {",
    bozdugu:
      "fonksiyon prop'lar RSC sinirinda kirilir - ekran uretimde COKER (K247'de yasandi)",
  },
  {
    /* K265: 14 gun sabiti kalkti; seri secili pencereden. Mutasyon: KART YINE BUGUNE KILITLI. */
    ad: "KART YINE BUGUNE KILITLI (donem yerine sabit pencere)",
    yon: "KALDIRAN",
    dosya: SAYFA,
    bul:
      "    donem,\n    operasyonKirilimi,\n  );\n  const ciroNetNoktalari",
    koy:
      "    { ...donem, ilkGun: gunEkle(donem.sonGun, -13) },\n    operasyonKirilimi,\n  );\n  const ciroNetNoktalari",
    bozdugu:
      "«Son 30 gun» secilince kart yine 14 gun cizer - baslik pencereyi soyler, grafik baska sey",
  },
  {
    ad: "NULL NET-2 SIFIR SAYILIYOR",
    yon: "KALDIRAN",
    dosya: SERI,
    bul:
      "    if (s.net2 !== null) {\n      n.net2 += s.net2;",
    koy:
      "    {\n      n.net2 += s.net2 ?? 0;",
    bozdugu:
      "kari hesaplanamayan gun «sifir kar» gibi cizilir - bilinmeyen sifir sanilir",
  },
  {
    ad: "14 GUN KARTI KALKTI",
    yon: "KALDIRAN",
    dosya: SAYFA,
    bul:
      "              <CizgiGrafik\n                noktalar={ciroNetNoktalari}",
    koy:
      "              <CizgiGrafikYok\n                noktalar={ciroNetNoktalari}",
    bozdugu:
      "demonun para egilimi grafigi panelden duser",
  },
  {
    /* K265: kanal suzgeci artik `donemSatislari` ile geliyor; mutasyon ham kumeye doner. */
    ad: "SERI KANAL SUZGECINI UYGULAMIYOR (ham satislar)",
    yon: "KALDIRAN",
    dosya: SAYFA,
    bul:
      "  const ciroNet = donemCiroNetSerisi(\n    donemSatislari",
    koy:
      "  const ciroNet = donemCiroNetSerisi(\n    satislar",
    bozdugu:
      "Trendyol suzgeci acikken 14 gun grafigi tum kanallari cizer - hukum kartlariyla ayrisir",
  },
  {
    ad: "OPERASYON YINE CIZGI (sekil dustu)",
    yon: "KALDIRAN",
    dosya: SAYFA,
    bul:
      "              <UcSeriliGrafik\n                sekil=\"sutun\"\n",
    koy:
      "              <UcSeriliGrafik\n",
    bozdugu:
      "2/5 sutunda 1240'lik cizgi grafigi ~2,6x kucuk cizilir - yazilar okunmaz",
  },
  {
    ad: "SUTUNLAR TIKLANMIYOR (<a> kalkti)",
    yon: "KALDIRAN",
    dosya: GRAFIK,
    bul:
      "                  <a key={`${s.anahtar}-${i}`} href={adres} aria-label={baslik}>\n                    <title>{baslik}</title>\n                    {dikd}\n                  </a>",
    koy:
      "                  <g key={`${s.anahtar}-${i}`}>\n                    <title>{baslik}</title>\n                    {dikd}\n                  </g>",
    bozdugu:
      "cizgideki noktaya tiklaninca liste aciliyordu; sutunda hicbir sey olmaz (Ilke #2)",
  },
  {
    ad: "SUTUN KIPI YALNIZ IKI SERI CIZIYOR (demonun iki serisi)",
    yon: "KALDIRAN",
    dosya: GRAFIK,
    bul:
      "              return seriler.map((s, k) => {",
    koy:
      "              return seriler.slice(0, 2).map((s, k) => {",
    bozdugu:
      "siparis ve mal kabul sutundan duser - 21.08 «ayni grafikte» istegi yariya iner",
  },
  {
    ad: "14 GUN KARTI YINE TAM GENISLIK",
    yon: "KALDIRAN",
    dosya: SAYFA,
    bul:
      "          <Card className=\"flex min-w-0 flex-col xl:col-span-3\">",
    koy:
      "          <Card className=\"flex min-w-0 flex-col xl:col-span-5\">",
    bozdugu:
      "operasyon karti alt satira duser; iki grafik yine alt alta",
  },
  {
    ad: "YIGIN KALKTI (adet kipinde de gruplu)",
    yon: "KALDIRAN",
    dosya: GRAFIK,
    bul:
      "  const yigilmis = sutunMu && toplamVar;",
    koy:
      "  const yigilmis = false;",
    bozdugu:
      "gunun toplami yine gorunmez - kullanicinin sordugu sey cevapsiz kalir",
  },
  {
    ad: "GUN TOPLAMI ETIKETI KALKTI",
    yon: "KALDIRAN",
    dosya: GRAFIK,
    bul:
      "                    {yigilmis && k === seriler.length - 1 && yuva >= 28 ? (",
    koy:
      "                    {false ? (",
    bozdugu:
      "yigin var ama rakam yok - toplam gozle tahmin edilir",
  },
  {
    ad: "KESIKLI TOPLAM YIGILMISKEN GERI GELDI",
    yon: "FAZLADAN",
    dosya: GRAFIK,
    bul:
      "        {toplamVar && !yigilmis ? (\n          <path",
    koy:
      "        {toplamVar ? (\n          <path",
    bozdugu:
      "cubugun boyu zaten toplam; ustune bir de kesikli cizgi - ayni sey iki kez",
  },
  {
    ad: "OK ETIKETLERI AYRILMIYOR (ust uste biner)",
    yon: "KALDIRAN",
    dosya: HALKA,
    bul:
      "  const uclar = okEtiketleriniAyir(yerlesim.map((y) => ({ sagda: y.sagda, ...y.uc })));",
    koy:
      "  const uclar = yerlesim.map((y) => ({ sagda: y.sagda, ...y.uc }));",
    bozdugu:
      "iki kucuk dilimin yazilari ayni noktaya duser - okunmaz",
  },
  {
    ad: "AYIRMA GOVDESI ARALIGI UYGULAMIYOR",
    yon: "KALDIRAN",
    dosya: HALKA,
    bul:
      "        sonuc[indeksler[k]!] = { ...bu, y: onceki.y + OK_ETIKET_ARALIGI };",
    koy:
      "        sonuc[indeksler[k]!] = { ...bu };",
    bozdugu:
      "govde cagriliyor ama hicbir seyi itmiyor - deger testi yakalar",
  },
  {
    ad: "MERKEZ YAZI YINE SABIT 20 (delige sigmaz)",
    yon: "KALDIRAN",
    dosya: HALKA,
    bul:
      "        fontSize={merkezYaziBoyu(toplamMetni)}",
    koy:
      "        fontSize=\"20\"",
    bozdugu:
      "₺622.904,97 halkaya tasar, %42 bandinin ustune biner - kullanicinin gosterdigi sey",
  },
  {
    ad: "BOY UZUNLUGA BAKMIYOR (her metin ayni boy)",
    yon: "KALDIRAN",
    dosya: HALKA,
    bul:
      "  const sigan = alan / (KARAKTER_EM * Math.max(1, metin.length));",
    koy:
      "  const sigan = alan / KARAKTER_EM;",
    bozdugu:
      "govde cagriliyor ama uzun toplam yine tavana cikar - deger testi yakalar",
  },
  {
    ad: "TOPLAM ROZETI GERI GELDI (elma+armut)",
    yon: "FAZLADAN",
    dosya: KUTU,
    bul:
      "      {toplam === 0 ? (\n        <DurumRozeti durum=\"olumlu\">{t(\"hepsiTemiz\")}</DurumRozeti>\n      ) : null}",
    koy:
      "      {toplam === 0 ? (\n        <DurumRozeti durum=\"olumlu\">{t(\"hepsiTemiz\")}</DurumRozeti>\n      ) : (\n        <DurumRozeti durum=\"uyari\">{t(\"bekleyen\", { sayi: toplam })}</DurumRozeti>\n      )}",
    bozdugu:
      "31 mal kabul + 38 oransiz SKU = 69 'bekleyen' — farkli turlerin toplami, kullanici kaldirdi",
  },
  {
    ad: "CIP ETIKETI YINE UZUN CUMLE",
    yon: "KALDIRAN",
    dosya: KUTU,
    bul:
      "              etiket={t(`kisa.${g.anahtar}`)}",
    koy:
      "              etiket={t(g.anahtar)}",
    bozdugu:
      "'Onay bekleyen siparis (API)' geri gelir — seridin karisikliginin ana sebebi",
  },
  {
    ad: "ILERLEME 0 IKEN DE CIZILIYOR (0 paketlendi gurultusu)",
    yon: "FAZLADAN",
    dosya: KUTU,
    bul:
      "        gorev.temizMi || gorev.ilerleme === 0 ? null : (",
    koy:
      "        gorev.temizMi ? null : (",
    bozdugu:
      "'3 · 0 paketlendi' — cipin dedigini tekrar eden ikinci parca",
  },
  {
    ad: "EKRAN OKUYUCU GRUP ADI KALKTI",
    yon: "KALDIRAN",
    dosya: KUTU,
    bul:
      "          <span className=\"sr-only\">\n            {t(grup === \"SEVKIYAT\" ? \"baslikSevkiyat\" : \"baslikTedarik\")}\n          </span>\n",
    koy:
      "",
    bozdugu:
      "gorme engelli kullanici icin iki grup tek yigin olur — ayrac aria-hidden",
  },
  {
    ad: "UC Y KIRPMASI KALKTI (tepe etiketi kadraj disina tasar)",
    yon: "KALDIRAN",
    dosya: HALKA,
    bul:
      "    y: Math.min(Math.max(u.y, OK_UC_Y_UST), OK_UC_Y_ALT),",
    koy:
      "    y: u.y,",
    bozdugu:
      "12 saat yonundeki dilimin yazisi kadrajin ustunden kesilir - K267 buyutmesinin bedeli",
  },
  {
    ad: "HER GUN ETIKETI KALKTI (eski 12 tavani)",
    yon: "KALDIRAN",
    dosya: SAYFA,
    bul:
      "                noktalar={ciroNetNoktalari}\n                etiketTavani={31}\n",
    koy:
      "                noktalar={ciroNetNoktalari}\n",
    bozdugu:
      "30 gunluk pencerede eksen yine 3 gunde bir yazar - «gunler belirlensin» istegi duser",
  },
  {
    ad: "ALT BAR KALKTI",
    yon: "KALDIRAN",
    dosya: YERLESIM,
    bul:
      "                <AltCubuk />",
    koy:
      "                {null}",
    bozdugu:
      "telefonda gezinme yok - demo onayinin omurgasi duser",
  },
  {
    ad: "ALT BAR MASAUSTUNDE DE (sol menuyle iki gezinme)",
    yon: "FAZLADAN",
    dosya: ALT,
    bul:
      "safe-area-inset-bottom))] md:hidden print:hidden",
    koy:
      "safe-area-inset-bottom))] print:hidden",
    bozdugu:
      "masaustunde sol menu + alt bar ayni anda",
  },
  {
    ad: "ICERIK BARIN ARKASINA KAYAR (pb-24 yok)",
    yon: "KALDIRAN",
    dosya: YERLESIM,
    bul:
      "p-4 pb-24 md:p-6 md:pb-6",
    koy:
      "p-4 md:p-6",
    bozdugu:
      "sayfanin son satiri sabit barin altinda kalir, tiklanamaz",
  },
  {
    ad: "KOK SEKMESI HER YERDE ETKIN",
    yon: "FAZLADAN",
    dosya: ALT,
    bul:
      "  return yol === adres || yol.startsWith(adres + \"/\");",
    koy:
      "  return yol === adres || yol.startsWith(adres);",
    bozdugu:
      "Panel sekmesi her ekranda secili gorunur; /satislarx Satislar sanilir",
  },
  {
    ad: "HIZLI ISLEMLER KALKTI",
    yon: "KALDIRAN",
    dosya: SAYFA,
    bul:
      "        <HizliIslemler />",
    koy:
      "        {null}",
    bozdugu:
      "kullanicinin «cok efektif» dedigi hizli tuslar yok",
  },
  {
    ad: "KPI TELEFONDA TEK SUTUN",
    yon: "KALDIRAN",
    dosya: SAYFA,
    bul:
      "grid grid-cols-6 gap-2 sm:grid-cols-2",
    koy:
      "grid gap-2 sm:grid-cols-2",
    bozdugu:
      "alti kutu alt alta, tam genislik - «kartlar cok buyuk» sikayeti geri gelir",
  },
  {
    ad: "NET-1 KUTUSU ESIT DEGIL (satir 5 hucre)",
    yon: "KALDIRAN",
    dosya: SAYFA,
    bul:
      "                          etiket={t(\"net1\")}\n                          className=\"max-sm:col-span-3\"",
    koy:
      "                          etiket={t(\"net1\")}\n                          className=\"max-sm:col-span-2\"",
    bozdugu:
      "ikinci satirda bos hucre kalir - kart boyutlari yine duzensiz",
  },
  {
    ad: "HALKA TELEFONDA KOMPAKT DEGIL",
    yon: "KALDIRAN",
    dosya: SAYFA,
    bul:
      "<div className=\"md:hidden\">\n                      <HalkaKompakt",
    koy:
      "<div className=\"hidden\">\n                      <HalkaKompakt",
    bozdugu:
      "telefonda halka hic cizilmez (ok cizgili masaustunde gizli)",
  },
  {
    ad: "URUN ANALIZI TELEFONA GERI GELDI",
    yon: "FAZLADAN",
    dosya: SAYFA,
    bul:
      "      <div className=\"max-md:hidden\">\n      <SekmeliBolum\n        baslik={t(\"urunAnaliziBaslik\")}",
    koy:
      "      <div>\n      <SekmeliBolum\n        baslik={t(\"urunAnaliziBaslik\")}",
    bozdugu:
      "dort iri sekme dugmesi telefonda alt alta - kullanicinin isaretledigi blok",
  },
  {
    ad: "GOREV SERIDI TELEFONDA DA (cift cizim)",
    yon: "FAZLADAN",
    dosya: KUTU,
    bul:
      "rounded-lg border px-3 py-2 max-md:hidden\"",
    koy:
      "rounded-lg border px-3 py-2\"",
    bozdugu:
      "telefonda hem 3x2 izgara hem serit - ayni is iki kez",
  },
  {
    ad: "GOREV IZGARASI CIZDIRILMIYOR",
    yon: "KALDIRAN",
    dosya: KUTU,
    bul:
      "    {mobilIzgara}",
    koy:
      "    {null}",
    bozdugu:
      "izgara tanimli ama ekranda yok - telefonda gorev hic gorunmez",
  },
  {
    ad: "TELEFON DONEM CIPLERI 36 PX",
    yon: "KALDIRAN",
    dosya: CUBUK,
    bul:
      "              key={`mobil-${p}`}\n              size=\"sm\"\n              className=\"h-11 shrink-0 rounded-full\"",
    koy:
      "              key={`mobil-${p}`}\n              size=\"sm\"\n              className=\"h-9 shrink-0 rounded-full\"",
    bozdugu:
      "44 px kurali (Ilke #8) delinir - demo boyu kurali ezer",
  },
  {
    ad: "KATLANIR PANELDE CIPLER TELEFONDA DA",
    yon: "FAZLADAN",
    dosya: CUBUK,
    bul:
      "                  key={p}\n                  size=\"sm\"\n                  className=\"h-11 md:h-8 max-md:hidden\"",
    koy:
      "                  key={p}\n                  size=\"sm\"\n                  className=\"h-11 md:h-8\"",
    bozdugu:
      "suzgec acilinca ayni donemler iki kez cizilir",
  },
  {
    ad: "MENU ELLE LISTE (firma duzeni okunmuyor)",
    yon: "KALDIRAN",
    dosya: MENU,
    bul:
      "    menuDuzeni(baglam.companyId),",
    koy:
      "    Promise.resolve({ gunluk: [\"panel\"], gruplar: [], yeniGelenler: [], taninmayanlar: [] }),",
    bozdugu:
      "kullanici /ayarlar/menu'den sirayi degistirir, telefon menusu eski kalir",
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
    /* K251-②: Windows geçici kilidi (UNKNOWN/EBUSY) — dayanıklı yazım. */
    dayanikliYaz(m.dosya, mutant);
    const diskten = readFileSync(m.dosya, "utf8");
    if (diskten !== mutant || mutant === asil) {
      bozuk.push(m.ad + "\n       mutasyon diske UYGULANMADI");
      continue;
    }
    sonuc = bekciyiKostur();
  } finally {
    /* GERİ ALMA da dayanıklı: burada düşerse mutant diskte kalır — en kötü hâl. */
    dayanikliYaz(m.dosya, asil);
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
