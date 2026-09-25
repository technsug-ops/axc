import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  KAMPANYA DOSYASI TANIMA + KANAL YETENEĞİ — MUTASYON HARNESS'İ (K226)
 * ----------------------------------------------------------------------------
 *      npm run teklif-tanima-mutasyon:kontrol
 *
 *  ⛔ NİYE ZORUNLU — BU YARA İKİ KEZ AÇILDI:
 *    ① 02.09 HB "Avantajlı Teklifler" tarife sanıldı; tanıma o gün yazıldı.
 *    ② 21.09 N11'in AYNI CİNS dosyası tanımadan KAÇTI — çünkü tanıma yalnız
 *       HB'nin şeklini biliyordu (ölçüldü: `teklifDosyasiMi = false`).
 *
 *  Bu dosya tarife olarak yüklenirse sistem BUGÜNKÜ fiyata indirimli oranı
 *  uygular: komisyon olduğundan düşük, kâr olduğundan YÜKSEK görünür ve rakam
 *  tamamen makul durur. Sessiz bozulma — mutasyonsuz bekçinin körleşeceği yer.
 *
 *  ⚠ İKİ YÖN AYRI SINANIR: yakalamayı KALDIRAN mutasyon (kampanya dosyası
 *  sızar) ve FAZLADAN yakalayan mutasyon (gerçek tarife reddedilir).
 * ============================================================================
 */

const BEKCI = "scripts/tarife-dogrula.ts";
const BEKCI_BASLIGI = "KOMİSYON TARİFESİ — DOĞRULAMA";

const OKUYUCU = "src/lib/komisyon/tarife-okuyucu.ts";
const TARIFE_YAZ = "src/lib/komisyon/tarife-yaz.ts";
const YETENEK = "src/lib/komisyon/kanal-yetenegi.ts";

type Mutasyon = {
  ad: string;
  yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN";
  dosya: string;
  bul: string;
  koy: string;
  bozdugu: string;
  /**
   * Bu mutasyonu YAKALAMASI beklenen bekçi. Varsayılan tarife bekçisi;
   * komisyon yolundaki bağ ayrı bir bekçide ölçülüyor ve o bağı bozan
   * mutasyon tarife bekçisini kırmızı yakmaz — yanlış bekçiye bakan bir
   * harness, korumasız bir bağı "yakalandı" diye raporlardı.
   */
  bekci?: { yol: string; baslik: string };
};

const KOMISYON_BEKCISI = {
  yol: "scripts/komisyon-dogrula.ts",
  baslik: "KOMİSYON",
};

const MUTASYONLAR: Mutasyon[] = [
  {
    ad: "ZARARSIZ — yalnız yorum değişti (harness sağlaması)",
    yon: "ZARARSIZ",
    dosya: OKUYUCU,
    bul: "/** `teklif 1` · `1. teklif üst limit` — numaralı teklif işareti. */",
    koy: "/** teklif 1 - 1. teklif ust limit : numarali teklif isareti. */",
    bozdugu: "hiçbir şey — bu mutasyon YEŞİL kalmalı",
  },
  {
    ad: "TARAMA TAVANI ESKİ HÂLİNE DÖNDÜ (yalnız ilk 2 satır)",
    yon: "KALDIRAN",
    dosya: OKUYUCU,
    bul: "const BASLIK_TARAMA_TAVANI = 20;",
    koy: "const BASLIK_TARAMA_TAVANI = 2;",
    bozdugu:
      "21.09 arizasinin kendisi: N11 dosyasinda basliklar 11. satirda ve tanima onu HIC goremez",
  },
  {
    ad: "TEK SATIRLI ŞEKİL (N11) DALI DÜŞTÜ",
    yon: "KALDIRAN",
    dosya: OKUYUCU,
    bul: '    if (satir.some((b) => NUMARALI_TEKLIF.test(b) && b.includes("komisyon"))) {\n      return true;\n    }',
    koy: "    // dal kaldirildi",
    bozdugu:
      "N11 sekli tanınmaz; kampanya dosyasi 'sutun eksik' diye reddedilir ve KULLANICI nereye gidecegini yine bilemez",
  },
  {
    ad: "İKİ SATIRLI ŞEKİL (HB) DALI DÜŞTÜ",
    yon: "KALDIRAN",
    dosya: OKUYUCU,
    bul: "    if (ustFiyat && komisyon) return true;",
    koy: "    // dal kaldirildi",
    bozdugu:
      "HB 'Avantajli Teklifler' dosyasi tanınmaz; 02.09'da kapatilan yara yeniden acilir",
  },
  {
    ad: "'TEKLİF' ŞARTI GEVŞEDİ — limit+komisyon yeter sayıldı",
    yon: "FAZLADAN",
    dosya: OKUYUCU,
    bul: '    if (!satir.some((b) => NUMARALI_TEKLIF.test(b))) continue;',
    koy: '    if (!satir.some((b) => b.includes("limit") || b.includes("komisyon"))) continue;',
    bozdugu:
      "Trendyol'un GERCEK dilimli tarifesi kampanya sayilir ve gecerli bir yukleme reddedilir — yanlis yanma",
  },
  {
    ad: "TEKLIF BEYANI YETENEGE BAGLANMIYOR (spread dustu)",
    yon: "KALDIRAN",
    dosya: YETENEK,
    bul: '  ...TEKLIF_TARIFESI_OKUYUCUSU_OLAN,\n];',
    koy: '];',
    bozdugu:
      "Trendyol karti da 'dilimli tarife yok' der; calisan tek yol ekrandan kaybolur ve kimse sebebini goremez",
  },
  {
    ad: "TRENDYOL BEYANDAN DUSTU - calisan yol kayboldu",
    yon: "KALDIRAN",
    dosya: YETENEK,
    bul: '  "TRENDYOL",\n',
    koy: '',
    bozdugu:
      "ekran HB icin dilimli tarife kutusu acar; okuyucu YOK, yuklenen her dosya 'sutun eksik' ile duser — ekran tutamayacagi bir soz verir",
  },
  {
    ad: "EKSİK TÜR LİSTEDEN DÜŞÜRÜLDÜ (sıfır satır gizlendi)",
    yon: "KALDIRAN",
    dosya: YETENEK,
    bul: '      : { tur: "DILIMLI_TARIFE", durum: "YOK", sebep: "OKUYUCU_YOK" },',
    koy: '      : ({ tur: "GUNCEL_ORAN", durum: "VAR" } as TurDurumu),',
    bozdugu:
      "desteklenmeyen tur ekranda HIC gorunmez; 'baktim yok' ile 'boyle bir sey hic yok' ayni gorunur",
  },
  {
    ad: "KOMİSYON YOLUNDA TANIMA DÜŞTÜ — bağ koptu",
    yon: "KALDIRAN",
    dosya: "src/lib/komisyon/yukle.ts",
    bul: "    if (teklifDosyasiMi(sayfalar ?? [])) {\n      return { durum: \"HATA\", hatalar: [{ kod: \"TEKLIF_DOSYASI\" }] };\n    }\n",
    koy: "",
    bozdugu:
      "kampanya dosyasi oteki kutuya birakilinca 'urun listesine benzemiyor' denir; operator elindeki dosyanin NE oldugunu ogrenemez",
    bekci: KOMISYON_BEKCISI,
  },
  {
    ad: "SIRA BOZULDU — tanıma genel cevaptan SONRA",
    yon: "FAZLADAN",
    dosya: "src/lib/komisyon/yukle.ts",
    bul: "    if (teklifDosyasiMi(sayfalar ?? [])) {\n      return { durum: \"HATA\", hatalar: [{ kod: \"TEKLIF_DOSYASI\" }] };\n    }\n    return {\n      durum: \"HATA\",\n      hatalar: [{ kod: \"TANINMAYAN_DOSYA\", sayfalar: tanima.sayfalar }],\n    };",
    koy: "    return {\n      durum: \"HATA\",\n      hatalar: [{ kod: \"TANINMAYAN_DOSYA\", sayfalar: tanima.sayfalar }],\n    };\n    if (teklifDosyasiMi(sayfalar ?? [])) {\n      return { durum: \"HATA\", hatalar: [{ kod: \"TEKLIF_DOSYASI\" }] };\n    }",
    bozdugu:
      "tanima ERISILEMEZ olur: genel cevap once donuyor ve kampanya dosyasi hic taninmiyor",
    bekci: KOMISYON_BEKCISI,
  },
  {
    ad: "N11 ETIKETI SOZLUKTEN SILINDI - canli kusurun kendisi",
    yon: "KALDIRAN",
    dosya: "messages/tr.json",
    bul: "    \"platformN11\": \"N11\",\n",
    koy: "",
    bozdugu:
      "onizlemede kanal adi BOS basilir; next-intl patlamaz, sessizce bos yazar - kusur GORUNMEDEN yasar (bir ay boyle kaldi)",
    bekci: KOMISYON_BEKCISI,
  },
  {
    ad: "NEREDEN INDIRILIR yazisindan N11 cikarildi",
    yon: "KALDIRAN",
    dosya: "messages/tr.json",
    bul: " · N11 satıcı panelinde toplu ürün dökümü",
    koy: " · BAŞKA satıcı panelinde toplu ürün dökümü",
    bozdugu:
      "ekranda N11 destekleniyor GORUNUR ama operatorun 'bunu nereden indirecegim' sorusu cevapsiz kalir - teslim edilemeyen bir soz",
    bekci: KOMISYON_BEKCISI,
  },
  {
    ad: "EKRAN TIPI CIPLAK BIRLIGE GERI DONDU",
    yon: "KALDIRAN",
    dosya: "src/app/kanal-sku/komisyon-aktar/yukleyici.tsx",
    bul: "  platform: KomisyonPlatformu;",
    koy: "  platform: \"TRENDYOL\" | \"HEPSIBURADA\";",
    bozdugu:
      "dorduncu platform eklendiginde TypeScript SUSAR ve ayni kusur yeniden dogar; liste elle bakim ister",
    bekci: KOMISYON_BEKCISI,
  },
  {
    ad: "KAMPANYA OKUYUCUSU TEKLIF KOLONUNU OKUYOR - en pahali bozulma",
    yon: "FAZLADAN",
    dosya: "src/lib/komisyon/kampanya-orani.ts",
    bul: "  return bas.findIndex((b) => b.includes(\"mevcut\") && b.includes(\"komisyon\"));",
    koy: "  return bas.findIndex((b) => b.includes(\"teklif\") && b.includes(\"komisyon\"));",
    bozdugu:
      "KOSULLU teklif orani gercek oran diye yazilir; komisyon oldugundan DUSUK, kar oldugundan YUKSEK gorunur - bu paketin en basta engelledigi sey",
    bekci: KOMISYON_BEKCISI,
  },
  {
    ad: "KAMPANYA BEYANI BOSALDI",
    yon: "KALDIRAN",
    dosya: "src/lib/komisyon/kampanya-orani.ts",
    bul: "export const KAMPANYA_ORANI_OKUYUCUSU_OLAN: readonly KomisyonPlatformu[] = [\n  \"HEPSIBURADA\",\n  \"N11\",\n];",
    koy: "export const KAMPANYA_ORANI_OKUYUCUSU_OLAN: readonly KomisyonPlatformu[] = [];",
    bozdugu:
      "HB ve N11 kartlarinda kampanya kutusu HIC gorunmez; calisan yol ekrandan kaybolur",
    bekci: KOMISYON_BEKCISI,
  },
  {
    ad: "BEYANA TRENDYOL EKLENDI - olculmemis soz",
    yon: "FAZLADAN",
    dosya: "src/lib/komisyon/kampanya-orani.ts",
    bul: "  \"HEPSIBURADA\",\n  \"N11\",\n];",
    koy: "  \"HEPSIBURADA\",\n  \"N11\",\n  \"TRENDYOL\",\n];",
    bozdugu:
      "TY kartinda kutu acilir ama o dosyanin Mevcut Komisyon kolonu OLCULMEDI; ekran tutamayacagi bir soz verir",
    bekci: KOMISYON_BEKCISI,
  },
  {
    ad: "KAMPANYA BASLIK TARAMASI 2 SATIRA DUSTU",
    yon: "KALDIRAN",
    dosya: "src/lib/komisyon/kampanya-orani.ts",
    bul: "const BASLIK_TARAMA_TAVANI = 20;",
    koy: "const BASLIK_TARAMA_TAVANI = 2;",
    bozdugu:
      "N11 dosyasinda basliklar 11. satirda; kampanya kutusu N11 dosyasini HIC goremez",
    bekci: KOMISYON_BEKCISI,
  },
  {
    ad: "SUNUCUDA KAMPANYA KIPI DALI OLDURULDU",
    yon: "KALDIRAN",
    dosya: "src/lib/komisyon/yukle.ts",
    bul: "  if (kip === \"KAMPANYA_ORANI\") {",
    koy: "  if (false) {",
    bozdugu:
      "kutu ekranda durur ama dosya LISTE kipinde okunur; kampanya dosyasi 'taninmayan dosya' diye reddedilir",
    bekci: KOMISYON_BEKCISI,
  },
  {
    ad: "TEPE DILIM KURULMUYOR - 02.09'daki korkunun kendisi",
    yon: "KALDIRAN",
    dosya: "src/lib/komisyon/teklif-tarifesi.ts",
    bul: "  if (guncelKomisyon !== null) {",
    koy: "  if (false) {",
    bozdugu:
      "dilimBul bugunku fiyata en yakin INDIRIMLI orani dondurur; komisyon oldugundan dusuk, kar oldugundan YUKSEK cikar ve rakam makul gorunur",
  },
  {
    ad: "DILIM SINIRLARI CAKISIYOR - kurus payi kalkti",
    yon: "KALDIRAN",
    dosya: "src/lib/komisyon/teklif-tarifesi.ts",
    bul: "const KURUS = 0.01;",
    koy: "const KURUS = 0;",
    bozdugu:
      "iki dilim ayni fiyatta cakisir; 1711 hem 7,2 hem 8,8 dilimine girer ve dilimBul siraya gore rastgele birini dondurur",
  },
  {
    ad: "ALT SINIR TURETILMIYOR - HB dilimleri acik kaliyor",
    yon: "KALDIRAN",
    dosya: "src/lib/komisyon/teklif-tarifesi.ts",
    bul: "      t.alt !== null ? t.alt : sonraki ? sonraki.ust + KURUS : null;",
    koy: "      t.alt;",
    bozdugu:
      "HB dosyasi alt siniri vermiyor; turetilmezse her dilimin alti ACIK kalir ve dilimBul hep EN USTTEKI teklifi dondurur",
  },
  {
    ad: "TEKLIF OKUYUCUSU BEYANI BOSALDI",
    yon: "KALDIRAN",
    dosya: "src/lib/komisyon/teklif-tarifesi.ts",
    bul: "export const TEKLIF_TARIFESI_OKUYUCUSU_OLAN: readonly KomisyonPlatformu[] = [\n  \"HEPSIBURADA\",\n  \"N11\",\n];",
    koy: "export const TEKLIF_TARIFESI_OKUYUCUSU_OLAN: readonly KomisyonPlatformu[] = [];",
    bozdugu:
      "HB ve N11 kartlarinda dilimli tarife kutusu yeniden kapanir; calisan yol ekrandan kaybolur",
  },
  {
    ad: "PENCERE SANIYEYE GORE GRUPLANIYOR",
    yon: "KALDIRAN",
    dosya: "src/lib/komisyon/teklif-tarifesi.ts",
    bul: "      const anahtar = `${gunDegeri(isTakvimGunu(b)).toISOString()}|${gunDegeri(",
    koy: "      const anahtar = `${b.toISOString()}|${(",
    bozdugu:
      "ayni haftanin tekliflerini 27 ayri pencere sayar; 44 satirin 41'i 'pencere disi' cikar ve secilen pencere panelinkiyle tutmaz",
  },
  /*
   * ⚠ CAPA K230-③'TE TASINDI, SILINMEDI. Mutasyonun NIYETI ayni: ikinci bir
   * yukleme yolu dogmasin. Sekli yeni koda tasindi - govde artik
   * `durum.tsx`te yasiyor. Silmek, refaktorun yan etkisi olarak bir
   * korumayi sessizce kaldirmak olurdu.
   */
  {
    ad: "TEK KAPI SOZU YENIDEN YARIM - durum govdesine yukleyici geri geldi",
    yon: "FAZLADAN",
    dosya: "src/app/ayarlar/tarife/durum.tsx",
    bul: "          <CardTitle className=\"text-base\">{t(\"kapsamBaslik\")}</CardTitle>",
    koy: "          <Yukleyici hesaplar={[]} />",
    bozdugu:
      "menude yine IKI yukleme yolu olur; kullanici 'bu ikisinin farki ne' diye sormak zorunda kalir - K226'da yasanan sey",
  },
  /*
   * ⛔ BU DEPONUN EN PAHALI YALANCI YESILI: govde kusursuz calisiyor ve
   * onu kimse cagirmiyor ("tur 98/98 yesildi ve panelde kutu YOKTU").
   * K230-③ tam o sinifa girdi - 394 satirlik gorunur bir blok baska dosyaya
   * tasindi. Cagrilmadigini olcen tek sey bu mutasyon.
   */
  {
    ad: "GOVDE TEK KAPIDA CIZILMIYOR - tasindi ama cagrilmadi",
    yon: "KALDIRAN",
    dosya: "src/app/ayarlar/komisyon/page.tsx",
    bul: "      <TarifeDurumu />",
    koy: "      {null}",
    bozdugu:
      "yuklu pencereler ve K49 kapsam bosluğu ekrandan TAMAMEN kaybolur; tsc yesil, bekci yesil, ekran bos - tasima yarim kalir",
  },
  /*
   * ESLESME KAPSAMI (21.09.2026) - dar kapsam sistemde ZATEN VAR olan
   * urunleri bagsiz birakiyordu. Uc yon: daraltma, sessiz secim, capraz.
   */
  {
    ad: "KAPSAM YINE DARALDI - kimlik yalniz barkoda dustu",
    yon: "KALDIRAN",
    dosya: TARIFE_YAZ,
    bul: "    select: { id: true, barcode: true, sku: true, companySku: true },",
    koy: "    select: { id: true, barcode: true },",
    bozdugu:
      "sku/firmaSku ile taninan urunler bagsiz kalir; fiyat denemesi o urunlerde dilim veremez",
  },
  {
    ad: "KANAL KODLARI YINE HESABA DARALDI",
    yon: "KALDIRAN",
    dosya: TARIFE_YAZ,
    bul: "    where: { isActive: true, variant: { isActive: true } },",
    koy: "    where: { channelAccountId, isActive: true },",
    bozdugu:
      "N11 dosyasindaki HB kodlari yine bagsiz kalir - olculdu: 3 urun, yurulukteki pencerede",
  },
  {
    ad: "CAKISAN KOD YINE SESSIZCE SECILIYOR",
    yon: "FAZLADAN",
    dosya: TARIFE_YAZ,
    bul: "      if (mevcut !== undefined && mevcut !== g.variantId) {",
    koy: "      if (false) {",
    bozdugu:
      "bir kod iki varyanta cozulunce son gelen kazanir - 21.09'da kapatilan arizanin kilik degistirmis hali",
  },
  /*
   * CAPA K234'TE TASINDI (22.09.2026), SILINMEDI: ayna `/tarife?pencere=<id>`
   * adresine gecti; mutasyonun NIYETI ayni - satir, KENDI penceresine degil
   * genel adrese giderse rakam kaynagina goturmez.
   */
  {
    ad: "AYNA BAGLANTISI DUSTU - rakam kaynagina goturmuyor",
    yon: "KALDIRAN",
    dosya: "src/app/ayarlar/tarife/durum.tsx",
    bul: "                      href={`/tarife?pencere=${x.id}`}",
    koy: "                      href={`/tarife`}",
    bozdugu:
      "'152 kalem' duz metin olur; okuyan 'hangileri' diye sormak zorunda kalir ve cogu zaman sormaz (Ilke #16)",
  },
  {
    ad: "KARGO BOSKEN DE HESAPLATIYOR",
    yon: "FAZLADAN",
    dosya: "src/app/ayarlar/tarife/[id]/ayna.tsx",
    bul: "                        disabled={kargo.trim() === \"\" || bekliyor}",
    koy: "                        disabled={bekliyor}",
    bozdugu:
      "kargo bos gecince NaN ya da 0 ile hesaplanir; her dilim oldugundan KARLI gorunur - ekranin engellemek icin var oldugu yanilgi",
  },
  {
    ad: "AYNA KANALI YENIDEN ADLA ARIYOR - sessiz NET kaybi",
    yon: "KALDIRAN",
    dosya: "src/app/ayarlar/tarife/[id]/eylemler.ts",
    bul: "        kanalFiyatlari: { [girdi.kanalKodu]: fiyat },",
    koy: "        kanalFiyatlari: { HepsiburadaAdi: fiyat },",
    bozdugu:
      "motor fiyati KODLA ariyor; ad gonderilince Hepsiburada'da eslesme tutmaz ve NET SESSIZCE bos cikar - hata da vermez. N11'de kod=ad oldugu icin orada tesadufen calisir, yani kusur en az gorunur kanalda saklanir",
  },
  {
    ad: "AYNA SONUCU ADLA BULUYOR",
    yon: "KALDIRAN",
    dosya: "src/app/ayarlar/tarife/[id]/eylemler.ts",
    bul: "    const kanal = sonuc.find((k) => k.kod === girdi.kanalKodu);",
    koy: "    const kanal = sonuc.find((k) => k.ad === girdi.kanalKodu);",
    bozdugu:
      "ayni tuzagin ikinci yarisi: sonuc kanal ADIYLA aranirsa Hepsiburada bulunamaz ve NET bos doner",
  },
  {
    /* K242, 23.09.2026 - kullanici: "bir urun icin yazdigimiz kargo ve
       satis fiyati, diger bir urune gectigimizde de kalmaya devam
       ediyor". A urununun fiyatiyla B urununun NET'i cikar ve ekranda
       MAKUL gorunur - yanlis rakam yanlis oldugunu soylemez. */
    ad: "URUN DEGISINCE KARGO GIRDISI KALIYOR",
    yon: "KALDIRAN",
    dosya: "src/app/ayarlar/tarife/[id]/ayna.tsx",
    bul: '                      setKargo("");',
    koy: "                      /* temizleme kaldirildi */",
    bozdugu:
      "onceki urunun kargo ucreti yeni urunun NET hesabina girer",
  },
  {
    ad: "URUN DEGISINCE SATIS FIYATI KALIYOR",
    yon: "KALDIRAN",
    dosya: "src/app/ayarlar/tarife/[id]/ayna.tsx",
    bul: '                      setGuncelFiyat("");',
    koy: "                      /* temizleme kaldirildi */",
    bozdugu:
      "onceki urunun satis fiyatiyla yeni urunun NET'i hesaplanir - en sinsi hali",
  },
];

function bekciyiKostur(m: Mutasyon): { kod: number; ciktiVar: boolean } {
  const yol = m.bekci?.yol ?? BEKCI;
  const baslik = m.bekci?.baslik ?? BEKCI_BASLIGI;
  const r = spawnSync("npx tsx " + yol, {
    shell: true,
    encoding: "utf8",
    maxBuffer: 40 * 1024 * 1024,
  });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(baslik) };
}

console.log("");
console.log("KAMPANYA TANIMA + KANAL YETENEĞİ — K226 MUTASYON TURU");
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
      `${m.ad}\n       desen ${m.dosya} içinde ${adet} kez geçiyor (1 olmalı)`,
    );
    continue;
  }

  const mutant = asil.replace(bul, koy);
  let sonuc: { kod: number; ciktiVar: boolean };
  try {
    dayanikliYaz(m.dosya, mutant);
    const diskten = readFileSync(m.dosya, "utf8");
    if (diskten !== mutant || mutant === asil) {
      bozuk.push(`${m.ad}\n       mutasyon diske UYGULANMADI`);
      continue;
    }
    sonuc = bekciyiKostur(m);
  } finally {
    /** ⛔ `git checkout` DEĞİL: dosya commit edilmemiş olabilir. */
    dayanikliYaz(m.dosya, asil);
    if (readFileSync(m.dosya, "utf8") !== asil) {
      bozuk.push(`${m.ad}\n       ⛔ GERİ ALMA BAŞARISIZ — dosya mutasyonlu kaldı`);
    }
  }

  const isaret = m.yon === "ZARARSIZ" ? "○" : m.yon === "KALDIRAN" ? "-" : "+";

  if (m.yon === "ZARARSIZ") {
    if (sonuc.kod === 0 && sonuc.ciktiVar) {
      yakalanan++;
      console.log(`  OK  ${isaret} ${m.ad}`);
    } else if (!sonuc.ciktiVar) {
      bozuk.push(`${m.ad}\n       bekçi ÇÖKTÜ (başlık basılmadı) — ölçüm geçersiz`);
    } else {
      kacan.push(
        `${m.ad}\n       YALANCI KIRMIZI: zararsız değişiklik bekçiyi kırmızı yaktı`,
      );
    }
    continue;
  }

  if (sonuc.kod !== 0 && sonuc.ciktiVar) {
    yakalanan++;
    console.log(`  OK  ${isaret} ${m.ad}`);
  } else if (sonuc.kod !== 0) {
    bozuk.push(`${m.ad}\n       bekçi ÇÖKTÜ (başlık basılmadı) — ölçüm geçersiz`);
  } else {
    kacan.push(`${m.ad}\n       KORUMASIZ: ${m.bozdugu}`);
  }
}

console.log("");
if (kacan.length) {
  console.log("  KAÇAN MUTASYONLAR — bekçi bunları GÖRMEDİ:\n");
  for (const k of kacan) console.log("  X  " + k);
  console.log("");
}
if (bozuk.length) {
  console.log("  HARNESS HATASI — mutasyon ölçülemedi:\n");
  for (const b of bozuk) console.log("  !! " + b);
  console.log("");
}

const toplam = MUTASYONLAR.length;
console.log(`  ${yakalanan}/${toplam} mutasyon beklendiği gibi davrandı`);
if (kacan.length || bozuk.length) {
  console.log("\n  Kaçan ya da ölçülemeyen mutasyon var — bekçi eksik.\n");
  process.exitCode = 1;
} else {
  console.log("\n  OK  Tanıma ve yetenek İKİ YÖNDEN sınandı, kırmızı yandığı GÖRÜLDÜ.\n");
}
