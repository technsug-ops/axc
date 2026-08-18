import { readFileSync } from "node:fs";
import {
  basabasFiyati,
  birAltDilim,
  simulasyonKur,
  yonHukmu,
  yonRengi,
  type SimulasyonGirdisi,
} from "../src/lib/fiyatlama/simulasyon";
import type { TarifeDilimi } from "../src/lib/komisyon/tarife-okuyucu";

/**
 * ============================================================================
 *  FİYAT SİMÜLASYONU — DOĞRULAMA
 * ----------------------------------------------------------------------------
 *  Saf katman; veritabanına gidilmez. Merkezinde GERÇEK VAKA var:
 *  Manuel Rondo 500 ml, canlıdaki tarifeden okunmuş dilimlerle.
 *      769,99+        → %18
 *      701,29–769,98  → %12,8
 *      641,09–701,28  → %11,1
 *      641,08 altı    → %9,3
 *  Güncel fiyat 1.999 TL, yani en pahalı dilimde.
 * ============================================================================
 */

let gecen = 0;
let kalan = 0;
function kontrol(ad: string, sonuc: boolean, gorulen?: unknown) {
  if (sonuc) {
    gecen++;
    console.log(`  OK    ${ad}`);
  } else {
    kalan++;
    console.log(
      `  HATA  ${ad}${gorulen === undefined ? "" : ` — ${JSON.stringify(gorulen)}`}`,
    );
  }
}

/** Canlıdan okunan gerçek tarife. */
const RONDO: TarifeDilimi[] = [
  { sira: 1, altLimit: 769.99, ustLimit: null, oran: 18 },
  { sira: 2, altLimit: 701.29, ustLimit: 769.98, oran: 12.8 },
  { sira: 3, altLimit: 641.09, ustLimit: 701.28, oran: 11.1 },
  { sira: 4, altLimit: null, ustLimit: 641.08, oran: 9.3 },
];

const BUGUN = new Date("2026-08-19T09:00:00Z");

const temel = (ek: Partial<SimulasyonGirdisi> = {}): SimulasyonGirdisi => ({
  hedefFiyat: 1999,
  adet: 1,
  birimMaliyet: 1200,
  kdvOrani: 20,
  paraBirimi: "TRY",
  dilimler: RONDO,
  pencereBitis: new Date("2026-08-25T04:59:00Z"),
  tekOran: 18,
  komisyonKdvOrani: null,
  siparisKesintileri: [],
  kargoTarifesi: null,
  bugun: BUGUN,
  ...ek,
});

console.log("\nFİYAT SİMÜLASYONU — DOĞRULAMA\n");

// --- 1) GERÇEK VAKA ----------------------------------------------------------
{
  console.log("1) MANUEL RONDO — güncel fiyat 1.999");
  const s = simulasyonKur(temel());
  kontrol("1. dilime düşer", s.dilim?.sira === 1);
  kontrol("oran %18", s.komisyonOrani === 18);
  kontrol("oran kaynağı DİLİM", s.oranKaynagi === "DILIM");
  kontrol("NET hesaplandı", s.net1 !== null && s.net2 !== null);
  kontrol("beyan YOK (zemin sağlam)", s.beyanlar.length === 0, s.beyanlar);
}

// --- 2) BİR KURUŞ İNMENİN ETKİSİ — ASIL SORU --------------------------------
{
  console.log("\n2) BİR KURUŞ AŞAĞI (769,99 → 769,98)");
  /**
   * ⚠ AŞAMA 1'İN VARLIK SEBEBİ. Bir kuruş fiyat kaybı, komisyonu 5,2 puan
   * düşürüyor. Kazanç ciroyla ölçekleniyor; kayıp sabit bir kuruş.
   */
  const ust = simulasyonKur(temel({ hedefFiyat: 769.99 }));
  const alt = simulasyonKur(temel({ hedefFiyat: 769.98 }));

  kontrol("769,99 → 1. dilim %18", ust.dilim?.sira === 1 && ust.komisyonOrani === 18);
  kontrol("769,98 → 2. dilim %12,8", alt.dilim?.sira === 2 && alt.komisyonOrani === 12.8);
  kontrol("ciro yalnız 1 kuruş düştü", Math.abs(ust.ciro - alt.ciro - 0.01) < 0.001);
  /**
   * NET-2 ARTMALI: 5,2 puanlık komisyon kazancı bir kuruşluk kaybı
   * kat kat aşıyor. Bu test tersine dönerse ya dilim sırası ya oran
   * bağlanması bozulmuştur.
   */
  kontrol(
    "NET-2 ARTAR (bir kuruş kayıp, 5,2 puan kazanç)",
    alt.net2 !== null && ust.net2 !== null && alt.net2 > ust.net2,
    { ust: ust.net2, alt: alt.net2 },
  );
}

// --- 3) DİLİM SINIRLARI — İKİ YÖNLÜ -----------------------------------------
{
  console.log("\n3) SINIR DEĞERLERİ");
  const dilim = (f: number) => simulasyonKur(temel({ hedefFiyat: f })).dilim?.sira;
  kontrol("769,99 (tam sınır) → 1", dilim(769.99) === 1);
  kontrol("769,98 → 2", dilim(769.98) === 2);
  kontrol("701,29 (tam sınır) → 2", dilim(701.29) === 2);
  kontrol("701,28 → 3", dilim(701.28) === 3);
  kontrol("641,09 (tam sınır) → 3", dilim(641.09) === 3);
  kontrol("641,08 → 4", dilim(641.08) === 4);
  kontrol("1 TL → 4 (alt uç açık)", dilim(1) === 4);
  kontrol("999.999 TL → 1 (üst uç açık)", dilim(999999) === 1);
}

// --- 4) BİR ALT DİLİM ÖNERİSİ -----------------------------------------------
{
  console.log("\n4) BİR ALT DİLİM HEDEFİ");
  /**
   * Kullanıcı elle deneyerek bulmamalı: "769,98'e inersen %12,8" yazısı
   * tek bakışta görünmeli. Hedef, alt dilimin ÜST sınırıdır — bir kuruş
   * daha inmek gereksiz kayıptır.
   */
  const oneri = birAltDilim(RONDO, 1999);
  kontrol("öneri üretilir", oneri !== null);
  kontrol("hedef fiyat 769,98", oneri?.hedefFiyat === 769.98);
  kontrol("  ...hedef dilim 2", oneri?.dilim.sira === 2);
  kontrol("  ...hedef oran %12,8", oneri?.dilim.oran === 12.8);

  /** Zincir: her dilimden bir alttakine. */
  kontrol("2. dilimden 3'e → 701,28", birAltDilim(RONDO, 750)?.hedefFiyat === 701.28);
  kontrol("3. dilimden 4'e → 641,08", birAltDilim(RONDO, 660)?.hedefFiyat === 641.08);

  /**
   * EN UCUZ DİLİMDE ÖNERİ YOK. "Daha da in" demek anlamsız olurdu ve
   * uydurma bir hedef fiyat üretmek zorunda kalırdık.
   */
  kontrol("en ucuz dilimde öneri YOK", birAltDilim(RONDO, 100) === null);
  kontrol("boş dilim listesinde öneri YOK", birAltDilim([], 1999) === null);
}

// --- 5) DİLİM VERİSİ YOK — BEYAN ŞART ---------------------------------------
{
  console.log("\n5) DİLİM VERİSİ YOK");
  /**
   * ⚠ Tek oranla hesaplamak yanlış değil; SESSİZCE yapmak yanlış.
   * Beyansız bir tahmin, dilim bilgisi varmış gibi okunur ve kullanıcı
   * olmayan bir kesinliğe dayanarak fiyat değiştirir.
   */
  const s = simulasyonKur(temel({ dilimler: null, tekOran: 15 }));
  kontrol("tek oranla hesaplanır", s.komisyonOrani === 15);
  kontrol("kaynak TEK_ORAN", s.oranKaynagi === "TEK_ORAN");
  kontrol("dilim null", s.dilim === null);
  kontrol("DILIM_YOK BEYAN edilir", s.beyanlar.some((b) => b.tur === "DILIM_YOK"));
  kontrol("NET yine hesaplanır", s.net2 !== null);

  /** Ne dilim ne oran varsa NET üretilmez — uydurma sayı yok. */
  const oransiz = simulasyonKur(temel({ dilimler: null, tekOran: null }));
  kontrol("oran da yoksa NET null", oransiz.net2 === null);
  kontrol("  ...ORAN_YOK beyan edilir", oransiz.beyanlar.some((b) => b.tur === "ORAN_YOK"));
}

// --- 6) PENCERE BİLİNCİ ------------------------------------------------------
{
  console.log("\n6) PENCERE BİTMİŞ TARİFE");
  /**
   * Engellemek yanlış olurdu — eski tarife de fikir verir. Ama beyan
   * etmeden göstermek, kullanıcıya BAYAT bir sayıyla fiyat değiştirtir.
   */
  const s = simulasyonKur(temel({ pencereBitis: new Date("2026-08-18T04:59:00Z") }));
  kontrol("simülasyon YİNE yapılır", s.net2 !== null);
  kontrol("PENCERE_BITTI beyan edilir", s.beyanlar.some((b) => b.tur === "PENCERE_BITTI"));
  kontrol(
    "  ...bitiş tarihi bildirilir",
    s.beyanlar.some((b) => b.tur === "PENCERE_BITTI" && b.bitis.getUTCDate() === 18),
  );

  /** Geçerli pencerede uyarı YOK — her satırda uyaran araç okunmaz olur. */
  const gecerli = simulasyonKur(temel());
  kontrol("geçerli pencerede uyarı YOK", !gecerli.beyanlar.some((b) => b.tur === "PENCERE_BITTI"));
}

// --- 7) MALİYETSİZ ÜRÜN ------------------------------------------------------
{
  console.log("\n7) MALİYET YOK");
  const s = simulasyonKur(temel({ birimMaliyet: null }));
  kontrol("NET hesaplanamaz", s.net1 === null && s.net2 === null);
  kontrol("MALIYET_YOK beyan edilir", s.beyanlar.some((b) => b.tur === "MALIYET_YOK"));
  /** Dilim yine de çözülür: hangi orana düştüğü maliyetten bağımsızdır. */
  kontrol("dilim yine de çözülür", s.dilim?.sira === 1);
  kontrol("  ...oran yine bildirilir", s.komisyonOrani === 18);
}

// --- 8) ADET ÖLÇEKLENMESİ ----------------------------------------------------
{
  console.log("\n8) ADET");
  /**
   * ⚠ TEST VERİSİ AYRIMI GÖSTERMELİ — üçüncü kez aynı tuzağa düştüm.
   *
   * İlk yazılışta 1.000 TL × 3 = 3.000 kullanmıştım; ikisi de 1. dilimde
   * olduğu için "dilim ciroda çözülsün" mutasyonu YEŞİL kaldı. Kural
   * doğruydu ama test onu KORUMUYORDU.
   *
   * 700 TL seçildi: BİRİM fiyat 3. dilimde (641,09–701,28), ama 3 adetlik
   * CİRO 2.100 TL, yani 1. dilimde. İkisi artık farklı cevap veriyor.
   */
  const tek = simulasyonKur(temel({ hedefFiyat: 700, adet: 1 }));
  const uc = simulasyonKur(temel({ hedefFiyat: 700, adet: 3 }));
  kontrol("ciro adetle çarpılır", uc.ciro === 2100);

  /**
   * ⚠ DİLİM BİRİM FİYATA GÖRE ÇÖZÜLÜR, ciroya göre DEĞİL. Kanal fiyatı
   * ürün BAŞINA ilan ediyor; ciroya bakılsaydı 3 adetlik sipariş yanlış
   * dilime düşer ve komisyon %11,1 yerine %18 hesaplanırdı.
   */
  kontrol("birim fiyat 700 → 3. dilim", tek.dilim?.sira === 3);
  kontrol("3 adette de 3. dilim (ciro 2.100 olsa bile)", uc.dilim?.sira === 3, uc.dilim?.sira);
  kontrol("  ...oran %11,1 kalır", uc.komisyonOrani === 11.1);
  kontrol("  ...ciro dilimi olan %18 DEĞİL", uc.komisyonOrani !== 18);
}

// --- 9) YÖN DÜRÜSTLÜĞÜ — İNMEK HER ZAMAN KAZANDIRMAZ ------------------------
{
  console.log("\n9) İKİ YÖN");
  /**
   * ⚠ MİMAR ŞARTI 19.08.2026: araç iki yönü de dürüst göstermeli.
   * Manuel Rondo kazandıran bir örnek ama HER ÜRÜN ÖYLE DEĞİL. Yalnız
   * kazancı gösteren bir araç "her zaman in" aracı sanılır ve kullanıcı
   * zarar eden bir indirimi güvenle yapar.
   *
   * Kazandırmayan vaka: dilimler arası oran farkı KÜÇÜK, fiyat farkı
   * BÜYÜK. Aşağıda 1. dilim %18, 2. dilim %17,5 — yarım puan kazanç,
   * ama fiyat 1.999'dan 769,98'e düşüyor.
   */
  const darDilimler = [
    { sira: 1, altLimit: 769.99, ustLimit: null, oran: 18 },
    { sira: 2, altLimit: 701.29, ustLimit: 769.98, oran: 17.5 },
    { sira: 3, altLimit: 641.09, ustLimit: 701.28, oran: 17 },
    { sira: 4, altLimit: null, ustLimit: 641.08, oran: 16.5 },
  ];

  const simdi = simulasyonKur(temel({ hedefFiyat: 1999, dilimler: darDilimler }));
  const oneri = birAltDilim(darDilimler, 1999)!;
  const inince = simulasyonKur(
    temel({ hedefFiyat: oneri.hedefFiyat, dilimler: darDilimler }),
  );

  kontrol("öneri yine üretilir", oneri.hedefFiyat === 769.98);
  kontrol("  ...ama NET-2 AZALIR", inince.net2! < simdi.net2!, {
    simdi: simdi.net2,
    inince: inince.net2,
  });
  kontrol(
    "  ...yani araç 'inme' demeli",
    inince.net2! - simdi.net2! < 0,
  );

  /** Karşı vaka: geniş oran farkı → inmek kazandırır (Manuel Rondo). */
  const genisSimdi = simulasyonKur(temel({ hedefFiyat: 769.99 }));
  const genisInince = simulasyonKur(temel({ hedefFiyat: 769.98 }));
  kontrol("geniş farkta NET-2 ARTAR", genisInince.net2! > genisSimdi.net2!);

  /**
   * İKİ VAKA AYNI KODDAN GEÇTİ ve zıt sonuç verdi — aracın yönü
   * VERİDEN okuduğunun kanıtı. Tek yönlü test bunu gösteremezdi.
   */
  kontrol(
    "aynı motor iki zıt sonuç üretti",
    inince.net2! - simdi.net2! < 0 && genisInince.net2! - genisSimdi.net2! > 0,
  );
}

// --- 10) EKRAN BAĞLI MI — kaynak taranır ------------------------------------
{
  console.log("\n10) EKRAN BAĞLARI");
  /**
   * Değer testi göremez: motor doğru çalışsa da ekran onu çağırmıyorsa,
   * ya da beyanları basmıyorsa kullanıcı hiçbirini görmez.
   */
  const ekran = readFileSync("src/app/kart/[variantId]/fiyat-dene.tsx", "utf8");

  kontrol("kart motoru ÇAĞIRIYOR", /simulasyonKur\(/.test(ekran));
  kontrol("bir alt dilim ÇAĞRILIYOR", /birAltDilim\(/.test(ekran));

  /** ⚠ BEYANLAR EKRANDA YAŞAMALI — dördü de karşılığını bulmalı. */
  for (const b of ["DILIM_YOK", "ORAN_YOK", "MALIYET_YOK", "PENCERE_BITTI"]) {
    kontrol(`  beyan ${b} ekranda karşılanıyor`, ekran.includes(b));
  }
  kontrol("beyanlar listeleniyor", /s\.beyanlar\.map/.test(ekran));

  /** ⚠ İKİ YÖN: hem kazanç hem kayıp metni bağlı olmalı. */
  /** ⚠ Beş hükmün beşi de ekranda karşılığını bulmalı. */
  for (const h of [
    "yonKaraGecer",
    "yonKarArtar",
    "yonZararAzalir",
    "yonZararaGecer",
    "yonKotulesir",
  ]) {
    kontrol(`  hüküm ${h} ekranda karşılanıyor`, ekran.includes(h));
  }
  kontrol("hüküm saf katmandan geliyor", /yonHukmu\(/.test(ekran));
  kontrol("renk de saf katmandan", /yonRengi\(/.test(ekran));

  /** MOBİL: sayısal klavye ve kuruş kabulü. */
  kontrol('inputMode="decimal"', /inputMode="decimal"/.test(ekran));
  kontrol("  ...tam sayıya zorlamıyor", !/inputMode="numeric"/.test(ekran));

  /** SİMÜLASYON KAYIT DEĞİL — ekran hiçbir yazma eylemi çağırmamalı. */
  kontrol(
    "ekran hiçbir şey YAZMIYOR",
    !/prisma\.|Action\(|fetch\(/.test(ekran),
  );
}

// --- 11) ORAN KAZANCI — "aynı oran" vakası ----------------------------------
{
  console.log("\n11) ALT DİLİMDE ORAN AYNI");
  /**
   * ⚠ CANLI BULGU 19.08.2026, LEGO kartında görüldü ve ölçüldü:
   * stoklu 30 üründen **8'inde** 1. ve 2. dilimin oranı AYNI.
   *
   * O ürünlerde inmek komisyon kazandırmaz, yalnız ciro kaybettirir —
   * ve bu "kâr azaldı"dan FARKLI bir sebeptir. Yalnız kırmızı rakam
   * gösterseydik kullanıcı "neden azaldı" diye düşünüp dilim yapısına
   * bakmayı akıl etmezdi.
   */
  const ayniOran: TarifeDilimi[] = [
    { sira: 1, altLimit: 2500, ustLimit: null, oran: 8.5 },
    { sira: 2, altLimit: 1500, ustLimit: 2034.79, oran: 8.5 },
    { sira: 3, altLimit: null, ustLimit: 1499.99, oran: 8 },
  ];
  const o = birAltDilim(ayniOran, 2500)!;
  kontrol("öneri yine üretilir", o.hedefFiyat === 2034.79);
  kontrol("oran kazancı SIFIR", o.oranKazanci === 0);
  /** Gerçek kazançlı vakada pozitif olmalı — sayaç ölü değil. */
  kontrol("Manuel Rondo'da kazanç POZİTİF", birAltDilim(RONDO, 1999)!.oranKazanci === 5.2);

  /** Alt dilim daha PAHALI olabilir mi — kural kendini savunsun. */
  const tersOran: TarifeDilimi[] = [
    { sira: 1, altLimit: 2500, ustLimit: null, oran: 8 },
    { sira: 2, altLimit: null, ustLimit: 2499.99, oran: 12 },
  ];
  kontrol("alt dilim pahalıysa kazanç EKSİ", birAltDilim(tersOran, 3000)!.oranKazanci === -4);

  /** Sıfır kazançta NET-2 mutlaka azalır: ciro düşer, oran aynı kalır. */
  const simdi = simulasyonKur(temel({ hedefFiyat: 2500, dilimler: ayniOran }));
  const inince = simulasyonKur(temel({ hedefFiyat: 2034.79, dilimler: ayniOran }));
  kontrol("aynı oranda inmek NET-2'yi AZALTIR", inince.net2! < simdi.net2!);
  kontrol("  ...komisyon oranı değişmedi", simdi.komisyonOrani === inince.komisyonOrani);

  /** Ekran sebebi yazıyor mu — değer testi göremez. */
  const ekran = readFileSync("src/app/kart/[variantId]/fiyat-dene.tsx", "utf8");
  kontrol("ekran 'oran aynı' sebebini yazıyor", /deneOranAyni/.test(ekran));
  kontrol("  ...ve 'alt dilim daha pahalı' halini", /deneOranYuksek/.test(ekran));
  kontrol(
    "  ...koşul oranKazanci'ndan geliyor",
    /oneri\.oranKazanci <= 0/.test(ekran),
  );
}

// --- 12) YÖN HÜKMÜ — VARIŞ NOKTASI ------------------------------------------
{
  console.log("\n12) YÖN HÜKMÜ (varış noktası)");
  /**
   * ⚠ CANLI TESTTE YANILDI — mimar bulgusu 19.08.2026.
   *
   * Yön satırı NET-2 zaten NEGATİFKEN de yeşil "ARTAR — kazandırıyor"
   * diyordu. Yeşil + "kazandırıyor" **"kâra geçer" diye okunuyor**; oysa
   * ürün hâlâ zararda, sadece daha az zararda. Yön doğruydu, VARIŞ
   * NOKTASI beyansızdı.
   */
  kontrol("zarardan kâra → KARA_GECER", yonHukmu(-50, 30).tur === "KARA_GECER");
  kontrol("  ...rengi yeşil", yonRengi(yonHukmu(-50, 30)) === "olumlu");

  /**
   * ⚠ ASIL VAKA: iyileşiyor ama HÂLÂ ZARARDA. Yeşil OLMAZ.
   */
  const halaZarar = yonHukmu(-500, -150);
  kontrol("zarardan az zarara → ZARAR_AZALIR", halaZarar.tur === "ZARAR_AZALIR");
  kontrol("  ...rengi AMBER, yeşil DEĞİL", yonRengi(halaZarar) === "uyari");
  kontrol("  ...varış noktası taşınıyor", halaZarar.sonuc === -150);
  kontrol("  ...fark de taşınıyor", halaZarar.fark === 350);

  kontrol("kârdan daha çok kâra → KAR_ARTAR", yonHukmu(100, 250).tur === "KAR_ARTAR");
  kontrol("  ...rengi yeşil", yonRengi(yonHukmu(100, 250)) === "olumlu");

  /** Kârdan zarara düşmek, "biraz azaldı"dan başka bir şeydir. */
  const dusus = yonHukmu(80, -20);
  kontrol("kârdan zarara → ZARARA_GECER", dusus.tur === "ZARARA_GECER");
  kontrol("  ...rengi kırmızı", yonRengi(dusus) === "olumsuz");

  kontrol("zarardan daha çok zarara → KOTULESIR", yonHukmu(-100, -300).tur === "KOTULESIR");

  /**
   * ⚠ SIFIR KÂR SAYILMAZ. Tam sıfıra gelmek "kâra geçmek" değil,
   * başabaştır; yeşil demek olmayan bir kazancı müjdelemek olurdu.
   */
  const basabas = yonHukmu(-100, 0);
  kontrol("sıfıra gelmek KÂRA GEÇMEK değil", basabas.tur === "ZARAR_AZALIR");
  kontrol("  ...ve yeşil DEĞİL", yonRengi(basabas) !== "olumlu");

  /** Fark kuruşa yuvarlanır — kayan nokta tozu ekrana çıkmasın. */
  kontrol("fark kuruşa yuvarlanır", yonHukmu(0.1, 0.3).fark === 0.2);
}

// --- 13) BAŞABAŞ NOKTASI -----------------------------------------------------
{
  console.log("\n13) BAŞABAŞ NOKTASI");
  /**
   * ⚠ ARANAN DEĞER FORMÜLDEN DEĞİL, MOTORDAN GELİYOR — ve test de
   * formülü tekrar etmiyor: bulunan fiyatta NET-2'nin gerçekten sıfırın
   * üstünde, BİR KURUŞ ALTINDA ise altında olduğu ölçülüyor. Beklenen
   * rakamı elle yazsaydık, kâr motoru değişince test onunla birlikte
   * kaymaz, YANLIŞ rakamı savunurdu.
   */
  const b = basabasFiyati(temel({ hedefFiyat: 1125, birimMaliyet: 900 }));
  kontrol("başabaş bulunuyor", b.fiyat !== null, b);

  if (b.fiyat !== null) {
    const ustunde = simulasyonKur(temel({ hedefFiyat: b.fiyat, birimMaliyet: 900 })).net2;
    const altinda = simulasyonKur(
      temel({ hedefFiyat: b.fiyat - 0.01, birimMaliyet: 900 }),
    ).net2;
    kontrol("  ...başabaşta NET-2 zarar DEĞİL", (ustunde ?? -1) >= 0, ustunde);
    /** BİR KURUŞ ALTI ZARAR: sınır gerçekten sınır mı, ölçülüyor. */
    kontrol("  ...bir kuruş altı ZARAR", (altinda ?? 1) < 0, altinda);
    /** Kuruşa YUKARI yuvarlanır — aşağı yuvarlamak başabaşın altı demekti. */
    kontrol(
      "  ...kuruşa yuvarlı",
      Math.abs(b.fiyat * 100 - Math.round(b.fiyat * 100)) < 1e-9,
      b.fiyat,
    );
    /** Fiyat hangi dilimdeyse başabaş da o dilimde aranır. */
    kontrol("  ...bulunduğu dilim beyan ediliyor", b.dilimSira !== null, b);
  }

  /**
   * ⚠ HER PAZARYERİ İÇİN AYRI RAKAM — kullanıcı teyidi 19.08.2026.
   * Aynı ürün, aynı maliyet; tek fark kanalın sipariş başına kesintisi.
   * Başabaş DEĞİŞMEK ZORUNDA: değişmiyorsa kesintiler hesaba girmiyordur.
   */
  const kesintisiz = basabasFiyati(temel({ hedefFiyat: 1125, birimMaliyet: 900 }));
  const kesintili = basabasFiyati(
    temel({
      hedefFiyat: 1125,
      birimMaliyet: 900,
      /** Gerçek şekil: HB'nin sipariş başına 12,60 TL hizmet bedeli. */
      siparisKesintileri: [
        { code: "SERVICE_FEE", basis: "FIXED" as const, amount: 12.6 },
      ],
    }),
  );
  kontrol(
    "kanal kesintisi başabaşı YUKARI taşır",
    (kesintili.fiyat ?? 0) > (kesintisiz.fiyat ?? 0),
    { kesintisiz: kesintisiz.fiyat, kesintili: kesintili.fiyat },
  );

  /**
   * ⚠ DİLİMİN TAMAMI KÂRDA — KÖK YOK, AMA SESSİZ DE KALINMAZ.
   * Maliyet çok düşükken 1. dilimde hiçbir fiyat zarar etmiyor;
   * "başabaş bulunamadı" demek kullanıcıyı boşlukta bırakırdı.
   */
  const hepKar = basabasFiyati(temel({ hedefFiyat: 1999, birimMaliyet: 10 }));
  kontrol("dilim boyu kâr → fiyat yok", hepKar.fiyat === null, hepKar);
  kontrol("  ...ama 'hep KÂR' deniyor", hepKar.dilimHep === "KAR", hepKar);

  /** Simetrisi: maliyet dilimin tavanını aşıyorsa dilim boyu zarar. */
  const hepZarar = basabasFiyati(temel({ hedefFiyat: 660, birimMaliyet: 5000 }));
  kontrol("dilim boyu zarar → fiyat yok", hepZarar.fiyat === null, hepZarar);
  kontrol("  ...ve 'hep ZARAR' deniyor", hepZarar.dilimHep === "ZARAR", hepZarar);

  /** Maliyet bilinmiyorsa başabaş UYDURULMAZ. */
  const maliyetsiz = basabasFiyati(temel({ birimMaliyet: null }));
  kontrol("maliyet yoksa başabaş YOK", maliyetsiz.fiyat === null, maliyetsiz);
  kontrol("  ...ve hüküm de verilmez", maliyetsiz.dilimHep === null, maliyetsiz);

  /** Dilimsiz (tek oran) ürün de cevapsız kalmaz. */
  const dilimsiz = basabasFiyati(
    temel({ hedefFiyat: 1125, birimMaliyet: 900, dilimler: null }),
  );
  kontrol("dilimsiz üründe de başabaş var", dilimsiz.fiyat !== null, dilimsiz);
  kontrol("  ...dilim sırası null", dilimsiz.dilimSira === null, dilimsiz);
}

// --- 14) EKRAN — BAŞABAŞ VE BEKLEME GÖRÜNÜYOR MU -----------------------------
{
  console.log("\n14) EKRAN (başabaş + bekleme)");
  /**
   * ⚠ DEĞER TESTİ BUNU GÖREMEZ. `basabasFiyati` kusursuz çalışsa da
   * ekran onu çağırmıyorsa kullanıcı için YOK hükmündedir — bu paketin
   * tekrar eden dersi ("kaydedilen ≠ görünen").
   */
  const ekran = readFileSync("src/app/kart/[variantId]/fiyat-dene.tsx", "utf8");
  kontrol("ekran basabasFiyati'nı çağırıyor", /basabasFiyati\(girdi\)/.test(ekran));
  kontrol("  ...KANAL KUTUSUNUN içinde (zeminler.map sonrası)",
    ekran.indexOf("zeminler.map") < ekran.indexOf("basabasFiyati(girdi)"));
  /**
   * ⚠ ANAHTARIN DOSYADA OLMASI YETMEZ — KÖR MUTASYON BUNU GÖSTERDİ.
   * Render koşulunu `{false ? (` yapan mutasyon YEŞİL kaldı: `deneBasabas`
   * hâlâ dosyadaydı, sadece hiç çizilmiyordu. Kontrol artık KOŞULUN
   * kendisine bakıyor — satır gerçekten hesabın sonucuna bağlı mı?
   */
  kontrol("  ...fiyatı ekrana basıyor", /deneBasabas"/.test(ekran));
  kontrol(
    "  ...ve render KOŞULU hesaba bağlı (sabite değil)",
    /basabas !== null && basabas\.fiyat !== null \? \(/.test(ekran),
  );
  kontrol("  ...kök yoksa hep-kâr/hep-zarar söylüyor",
    /deneBasabasHepKar/.test(ekran) && /deneBasabasHepZarar/.test(ekran));

  /** Bekleme: ürünün özelliği — kanal kutusunda TEKRARLANMAZ (Kural #12). */
  kontrol("bekleme satırı var", /deneBekleme/.test(ekran));
  kontrol("  ...kanal kutusunun DIŞINDA, bir kez",
    ekran.indexOf("deneBekleme") < ekran.indexOf("zeminler.map"));
  kontrol("  ...yaş bandına göre renkleniyor", /YAS_BANDI_RENGI\[yasBandi\]/.test(ekran));
  kontrol("  ...stok yoksa AYRI cümle", /deneStokYok/.test(ekran));

  /** Yaş ikinci kez hesaplanmıyor — kartın üstündeki kutuyla aynı kaynak. */
  const sayfa = readFileSync("src/app/kart/[variantId]/page.tsx", "utf8");
  kontrol("yaş kart verisinden geçiriliyor",
    /yasGun=\{veri\.yasGun\}/.test(sayfa) && /yasBandi=\{veri\.yasBandi\}/.test(sayfa));

  /** Sözlükten geliyor mu — koda gömülü metin yasak. */
  const tr = JSON.parse(readFileSync("messages/tr.json", "utf8")) as {
    UrunKarti: Record<string, string>;
  };
  for (const anahtar of [
    "deneBasabas",
    "deneBasabasHepKar",
    "deneBasabasHepZarar",
    "deneBekleme",
    "deneStokYok",
  ]) {
    kontrol(`  sözlük: ${anahtar}`, typeof tr.UrunKarti[anahtar] === "string" && tr.UrunKarti[anahtar] !== "");
  }
}

console.log("");
console.log("=".repeat(70));
if (kalan === 0) console.log(`TÜM KONTROLLER GEÇTİ (${gecen})`);
else {
  console.log(`${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrolden)`);
  process.exitCode = 1;
}
console.log("");
