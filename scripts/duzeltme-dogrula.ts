import { readFileSync } from "node:fs";
/**
 * ============================================================================
 *  STOK DÜZELTME DOĞRULAMA
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run duzeltme:dogrula
 *
 *  DÖRT BÖLÜM:
 *  1) GİRDİ DENETİMİ — eksi adet, sıfır, zorunlu açıklama, para birimsiz tutar.
 *  2) DÖNEM ETKİSİ — fire ile sayım farkı AYRI sayılıyor mu, maliyeti
 *     bilinmeyen hareket sıfır sayılmıyor mu.
 *  3) RAPORA ETKİSİ — düzeltme GERÇEK NET'ten düşüyor ama NET-2'ye
 *     KARIŞMIYOR mu. Bu, kararın kendisidir: düzeltme bir satış değildir.
 *  4) KOMİSYON BANDI — hakedişten fiilen ödenen oran; uyarı eşiği gerçekten
 *     yanlış tuşu yakalıyor mu.
 * ============================================================================
 */

import { gunDegeri, pencereOlustur } from "../src/lib/donem";
import { raporHesapla } from "../src/lib/rapor";
import { bantDisiMi, komisyonBandi } from "../src/lib/komisyon-bandi";

/**
 * ⚠ ŞEMA SATIR SONUNDAN BAĞIMSIZ OKUNUR (24.08.2026).
 *
 * `npx prisma format` dosyayı CRLF'e çevirdi ve enum ayrıştıran kontrol
 * SESSİZCE 0 değer buldu: `split("
")` sonrası satırlar `` ile
 * bitiyor, `/\/\/.*$/` deseni `$`i bulamadığı için yorum SİLİNMİYOR ve
 * `^[A-Z_]+$` testi düşüyor.
 *
 * Kontrol yanlış değildi — okuduğu METİN değişmişti. Windows'ta çalışan
 * her checkout'ta aynı tuzak var; bu yüzden düzeltme tek satırda değil,
 * OKUMA KAPISINDA yapılıyor.
 */
function semaMetni(): string {
  return readFileSync("prisma/schema.prisma", "utf8")
    .split("\r\n")
    .join("\n");
}
import {
  duzeltmeOzeti,
  duzeltmeyiDogrula,
  hareketMiktari,
} from "../src/lib/stok-duzeltme";

let basarisiz = 0;
let calisan = 0;

function kontrol(ad: string, kosul: boolean, ayrinti?: unknown) {
  calisan++;
  if (kosul) console.log(`  OK    ${ad}`);
  else {
    basarisiz++;
    console.log(`  HATA  ${ad}`);
    if (ayrinti !== undefined) console.log("        ", ayrinti);
  }
}

function yakin(ad: string, gelen: number, beklenen: number, tol = 0.005) {
  const fark = Math.abs(gelen - beklenen);
  calisan++;
  if (fark <= tol) {
    console.log(
      `  OK    ${ad.padEnd(44)} ${gelen.toFixed(2).padStart(10)}  (beklenen ${beklenen.toFixed(2)})`,
    );
  } else {
    basarisiz++;
    console.log(
      `  HATA  ${ad.padEnd(44)} ${gelen.toFixed(2).padStart(10)}  (beklenen ${beklenen.toFixed(2)}, FARK ${fark.toFixed(2)})`,
    );
  }
}

const gun = (y: number, a: number, g: number) => gunDegeri({ yil: y, ay: a, gun: g });

// ===========================================================================
console.log("\n1) GİRDİ DENETİMİ");
// ===========================================================================
{
  const temel = {
    adet: 3,
    yon: "EKSI" as const,
    birimMaliyet: null,
    paraBirimi: null,
    aciklamaZorunlu: false,
    aciklama: "",
  };

  kontrol("geçerli girdi hatasız", duzeltmeyiDogrula(temel).length === 0);

  kontrol(
    "sıfır adet reddedilir",
    duzeltmeyiDogrula({ ...temel, adet: 0 }).includes("ADET_SIFIR"),
  );
  // EKSİ ADET AYRI BİR HATA: yön zaten ayrı seçiliyor. "-5" + EKSİ yön
  // "iki kere eksi" tuzağıdır; stok yanlışlıkla ARTARDI.
  kontrol(
    "eksi adet reddedilir (yön ayrı seçiliyor)",
    duzeltmeyiDogrula({ ...temel, adet: -5 }).includes("ADET_TAM_SAYI_DEGIL"),
  );
  kontrol(
    "kesirli adet reddedilir",
    duzeltmeyiDogrula({ ...temel, adet: 2.5 }).includes("ADET_TAM_SAYI_DEGIL"),
  );

  kontrol(
    "zorunlu açıklama boşsa reddedilir",
    duzeltmeyiDogrula({ ...temel, aciklamaZorunlu: true }).includes(
      "ACIKLAMA_ZORUNLU",
    ),
  );
  kontrol(
    "  ...dolu olunca geçer",
    duzeltmeyiDogrula({
      ...temel,
      aciklamaZorunlu: true,
      aciklama: "kutu ezildi",
    }).length === 0,
  );
  kontrol(
    "  ...yalnız boşluk sayılmaz",
    duzeltmeyiDogrula({
      ...temel,
      aciklamaZorunlu: true,
      aciklama: "   ",
    }).includes("ACIKLAMA_ZORUNLU"),
  );

  kontrol(
    "eksi maliyet reddedilir",
    duzeltmeyiDogrula({
      ...temel,
      yon: "ARTI",
      birimMaliyet: -10,
      paraBirimi: "TRY",
    }).includes("MALIYET_NEGATIF"),
  );
  // Tutar + para birimi BİRLİKTE olur (anayasa).
  kontrol(
    "para birimsiz tutar reddedilir",
    duzeltmeyiDogrula({
      ...temel,
      yon: "ARTI",
      birimMaliyet: 100,
      paraBirimi: null,
    }).includes("MALIYET_PARA_BIRIMSIZ"),
  );
  kontrol(
    "maliyet BOŞ bırakılabilir (NO_COST parti)",
    duzeltmeyiDogrula({ ...temel, yon: "ARTI" }).length === 0,
  );

  kontrol("EKSİ yön -> negatif miktar", hareketMiktari({ adet: 4, yon: "EKSI" }) === -4);
  kontrol("ARTI yön -> pozitif miktar", hareketMiktari({ adet: 4, yon: "ARTI" }) === 4);
}

// ===========================================================================
console.log("\n2) DÖNEM ETKİSİ — fire ve sayım farkı AYRI");
// ===========================================================================
{
  const ozet = duzeltmeOzeti([
    { tarih: gun(2026, 8, 5), miktar: -3, birimMaliyet: 100, paraBirimi: "TRY", tip: "ADJUSTMENT" },
    { tarih: gun(2026, 8, 6), miktar: -2, birimMaliyet: 50, paraBirimi: "TRY", tip: "COUNT_CORRECTION" },
  ])[0];

  yakin("fire zararı (3 × 100)", ozet.fireZarari, 300);
  yakin("sayım zararı (2 × 50)", ozet.sayimZarari, 100);
  yakin("toplam", ozet.toplamZarar, 400);
  kontrol(
    "iki tip AYRI sayılıyor (tek kefeye konmadı)",
    ozet.fireZarari !== ozet.toplamZarar,
    `fire ${ozet.fireZarari} · toplam ${ozet.toplamZarar}`,
  );
  kontrol("fire adedi 3", ozet.fireAdedi === 3);
  kontrol("sayım adedi 2", ozet.sayimAdedi === 2);

  // ARTI yön zararı AZALTIR: mal bedava gelmedi, önceki bir eksilme döndü.
  const fazla = duzeltmeOzeti([
    { tarih: gun(2026, 8, 5), miktar: -3, birimMaliyet: 100, paraBirimi: "TRY", tip: "ADJUSTMENT" },
    { tarih: gun(2026, 8, 7), miktar: 1, birimMaliyet: 100, paraBirimi: "TRY", tip: "ADJUSTMENT" },
  ])[0];
  yakin("sayım fazlası zararı azaltır (300 - 100)", fazla.fireZarari, 200);

  // MALİYETİ BİLİNMEYEN SIFIR SAYILMAZ.
  const bilinmeyen = duzeltmeOzeti([
    { tarih: gun(2026, 8, 5), miktar: -3, birimMaliyet: 100, paraBirimi: "TRY", tip: "ADJUSTMENT" },
    { tarih: gun(2026, 8, 8), miktar: -7, birimMaliyet: null, paraBirimi: null, tip: "ADJUSTMENT" },
  ])[0];
  yakin("bilinen kısım tutarlı", bilinmeyen.fireZarari, 300);
  kontrol(
    "maliyeti bilinmeyen 7 adet AYRICA sayıldı",
    bilinmeyen.degeriBilinmeyenAdet === 7,
    bilinmeyen.degeriBilinmeyenAdet,
  );
  kontrol(
    "  ...sıfır maliyetle toplama KATILMADI",
    Math.abs(bilinmeyen.fireZarari - 300) < 0.01,
  );

  // Para birimleri karışmaz.
  const ikiPara = duzeltmeOzeti([
    { tarih: gun(2026, 8, 5), miktar: -1, birimMaliyet: 100, paraBirimi: "TRY", tip: "ADJUSTMENT" },
    { tarih: gun(2026, 8, 5), miktar: -1, birimMaliyet: 40, paraBirimi: "EUR", tip: "ADJUSTMENT" },
  ]);
  kontrol("TRY ve EUR ayrı blok", ikiPara.length === 2, ikiPara.length);
}

// ===========================================================================
console.log("\n3) RAPORA ETKİSİ — GERÇEK NET'ten düşer, NET-2'ye KARIŞMAZ");
// ===========================================================================
{
  const an = new Date("2026-08-12T09:00:00Z");
  const pencere = pencereOlustur("BU_AY", an);

  const ortakGirdi = {
    satislar: [
      {
        id: "s1",
        kod: null,
        tarih: gun(2026, 8, 5),
        gelir: 1000,
        net1: 300,
        net2: 250,
        paraBirimi: "TRY" as const,
        durum: "CALCULATED" as const,
      },
    ],
    iadeler: [],
    giderler: [],
  };

  const duzeltmesiz = raporHesapla(pencere, ortakGirdi).paraBirimleri[0];
  const duzeltmeli = raporHesapla(pencere, {
    ...ortakGirdi,
    duzeltmeler: [
      {
        tarih: gun(2026, 8, 6),
        miktar: -2,
        birimMaliyet: 40,
        paraBirimi: "TRY",
        tip: "ADJUSTMENT",
        iadeKaynakliMi: false,
      },
    ],
  }).paraBirimleri[0];

  yakin("düzeltmesiz GERÇEK NET", duzeltmesiz.gercekNet, 250);
  yakin("düzeltmeli GERÇEK NET (250 - 80)", duzeltmeli.gercekNet, 170);
  yakin("düzeltme zararı", duzeltmeli.duzeltmeZarari, 80);

  // ASIL İDDİA: kâr rakamlarına DOKUNMADI.
  yakin("NET-2 DEĞİŞMEDİ", duzeltmeli.brutNet2, duzeltmesiz.brutNet2);
  yakin("NET-1 DEĞİŞMEDİ", duzeltmeli.satisNet1, duzeltmesiz.satisNet1);
  yakin("satış geliri DEĞİŞMEDİ", duzeltmeli.satisGeliri, duzeltmesiz.satisGeliri);

  // GİDER TABLOSUNA YAZILMAZ: gider toplamı da dokunulmamış olmalı.
  yakin("gider toplamı DEĞİŞMEDİ", duzeltmeli.giderNetDusen, duzeltmesiz.giderNetDusen);
  kontrol(
    "  ...gider kategorisi açılmadı (çift kayıt yok)",
    duzeltmeli.kategoriler.length === duzeltmesiz.kategoriler.length,
    `${duzeltmesiz.kategoriler.length} -> ${duzeltmeli.kategoriler.length}`,
  );

  // Pencere dışı düzeltme sayılmaz.
  const disarda = raporHesapla(pencere, {
    ...ortakGirdi,
    duzeltmeler: [
      {
        tarih: gun(2026, 7, 20),
        miktar: -5,
        birimMaliyet: 100,
        paraBirimi: "TRY",
        tip: "ADJUSTMENT",
        iadeKaynakliMi: false,
      },
    ],
  }).paraBirimleri[0];
  yakin("geçen ayın düzeltmesi girmedi", disarda.duzeltmeZarari, 0);

  /**
   * ════════════════════════════════════════════════════════════════════
   *  İADEDEN DOĞAN DÜZELTME ÇİFT SAYILMAZ (16.08.2026)
   * --------------------------------------------------------------------
   *  İade işlenirken stok defterine ADJUSTMENT yazılıyor (hasarlı mal
   *  stoğa girmiyor). O paranın etkisi İADENİN NET-2'sinde ZATEN var.
   *  Fire toplamına da eklenince aynı lira iki kez sayılıyordu. Canlı
   *  ölçüm (08.2026): iade kaynaklı net etki −1.327,99, GERÇEK NET
   *  ₺4.255,82 görünüyordu; doğrusu ₺2.927,83. Yön hareketin işaretine
   *  bağlıdır — "hep yüksek gösterir" diye hatırlanmamalı.
   *
   *  Bu kusur neden görülmedi: her iki taraf da tek başına doğruydu.
   *  İade motoru doğru hesaplıyor, fire toplamı doğru topluyordu. Hata
   *  ARALARINDAKİ boşluktaydı ve iki testin de kapsamı dışındaydı.
   * ════════════════════════════════════════════════════════════════════
   */
  const iadeKaynakli = raporHesapla(pencere, {
    ...ortakGirdi,
    duzeltmeler: [
      {
        tarih: gun(2026, 8, 6),
        miktar: -2,
        birimMaliyet: 40,
        paraBirimi: "TRY",
        tip: "ADJUSTMENT",
        iadeKaynakliMi: true,
      },
    ],
  }).paraBirimleri[0];
  yakin("iadeden doğan düzeltme fireye GİRMEZ", iadeKaynakli.fireZarari, 0);
  yakin("  ...düzeltme toplamına da girmez", iadeKaynakli.duzeltmeZarari, 0);
  yakin(
    "  ...GERÇEK NET düşmez (para iadenin NET-2'sinde sayıldı)",
    iadeKaynakli.gercekNet,
    duzeltmesiz.gercekNet,
  );
  kontrol(
    "  ...elle girilen aynı düzeltme HÂLÂ sayılıyor (kural fazla süpürmüyor)",
    Math.abs(duzeltmeli.fireZarari - 80) < 0.005,
    duzeltmeli.fireZarari,
  );

  /**
   * ════════════════════════════════════════════════════════════════════
   *  KAYIP VE KAZANÇ AYRI SATIR — BİRİ DİĞERİNİ GÖTÜRMEZ (16.08.2026)
   * --------------------------------------------------------------------
   *  Tek alanda toplanıyorlardı. ₺500 fire ile ₺500 fazla çıkan mal aynı
   *  dönemde olunca net sıfır çıkıyor, ekranda "düzeltme yok" yazıyordu:
   *  İKİ GERÇEK OLAY birden görünmez oluyordu. Net etki doğruydu — ama
   *  doğru bir toplam, olmamış gibi gösterilen iki olayı telafi etmez.
   * ════════════════════════════════════════════════════════════════════
   */
  const kayipKazanc = raporHesapla(pencere, {
    ...ortakGirdi,
    duzeltmeler: [
      { tarih: gun(2026, 8, 6), miktar: -5, birimMaliyet: 100, paraBirimi: "TRY", tip: "ADJUSTMENT", iadeKaynakliMi: false },
      { tarih: gun(2026, 8, 7), miktar: 5, birimMaliyet: 100, paraBirimi: "TRY", tip: "ADJUSTMENT", iadeKaynakliMi: false },
      { tarih: gun(2026, 8, 8), miktar: -3, birimMaliyet: 20, paraBirimi: "TRY", tip: "COUNT_CORRECTION", iadeKaynakliMi: false },
      { tarih: gun(2026, 8, 9), miktar: 1, birimMaliyet: 20, paraBirimi: "TRY", tip: "COUNT_CORRECTION", iadeKaynakliMi: false },
    ],
  }).paraBirimleri[0];
  yakin("fire KAYBI ayrı duruyor", kayipKazanc.fireZarari, 500);
  yakin("fire KAZANCI ayrı duruyor", kayipKazanc.fireKazanci, 500);
  yakin("  ...adetler de ayrı", kayipKazanc.fireAdedi, 5);
  yakin("  ...kazanç adedi ayrı", kayipKazanc.fireKazancAdedi, 5);
  yakin("sayım KAYBI ayrı duruyor", kayipKazanc.sayimZarari, 60);
  yakin("sayım KAZANCI ayrı duruyor", kayipKazanc.sayimKazanci, 20);
  kontrol(
    "kayıp ve kazanç birbirini GİZLEMİYOR (ikisi de sıfırdan büyük)",
    kayipKazanc.fireZarari > 0 && kayipKazanc.fireKazanci > 0,
  );
  yakin(
    "net etki DEĞİŞMEDİ (kayıp − kazanç = 500 − 500 + 60 − 20)",
    kayipKazanc.duzeltmeZarari,
    40,
  );

  /** Tam denkleşen dönemde bile olaylar kaybolmaz. */
  const denk = raporHesapla(pencere, {
    ...ortakGirdi,
    duzeltmeler: [
      { tarih: gun(2026, 8, 6), miktar: -5, birimMaliyet: 100, paraBirimi: "TRY", tip: "ADJUSTMENT", iadeKaynakliMi: false },
      { tarih: gun(2026, 8, 7), miktar: 5, birimMaliyet: 100, paraBirimi: "TRY", tip: "ADJUSTMENT", iadeKaynakliMi: false },
    ],
  }).paraBirimleri[0];
  yakin("denk dönemde net sıfır", denk.duzeltmeZarari, 0);
  kontrol(
    "  ...ama olaylar HÂLÂ kayıtlı (ekran kutusu çizilir)",
    denk.fireZarari === 500 && denk.fireKazanci === 500,
    `${denk.fireZarari} / ${denk.fireKazanci}`,
  );

  /** EKRAN BAĞI — kutu net'e değil, hareketin varlığına bakıyor. */
  const raporEkrani = readFileSync("src/app/rapor/page.tsx", "utf8");
  kontrol(
    "ekran kutusu NET'e değil hareketin VARLIĞINA bakıyor",
    raporEkrani.includes("b.fireZarari > 0 ||") &&
      raporEkrani.includes("b.fireKazanci > 0 ||"),
  );
  kontrol(
    "  ...kazanç kendi kutusunda gösteriliyor",
    raporEkrani.includes('t("fireKazanci")') &&
      raporEkrani.includes('t("sayimKazanci")'),
  );
  kontrol(
    "  ...eski 'net sıfırsa kutuyu gizle' koşulu kalmamış",
    !raporEkrani.includes("b.duzeltmeZarari !== 0 || b.duzeltmeBilinmeyenAdet"),
  );
  kontrol(
    "  ...net kazançta formül '− −₺X' yazmıyor",
    raporEkrani.includes("b.duzeltmeZarari < 0"),
  );
}


// ===========================================================================
console.log("\n4) KOMİSYON BANDI — hakedişten fiilen ödenen oran");
// ===========================================================================
{
  const kalem = (siparisNo: string, kod: string, tutar: number, hesap = "h1") => ({
    channelAccountId: hesap,
    siparisNo,
    kod,
    tutar,
  });

  // Üç sipariş: %20, %10, %30
  const bant = komisyonBandi([
    kalem("A", "SIPARIS_TUTARI", 1000),
    kalem("A", "KOMISYON", -200),
    kalem("B", "SIPARIS_TUTARI", 1000),
    kalem("B", "KOMISYON", -100),
    kalem("C", "SIPARIS_TUTARI", 1000),
    kalem("C", "KOMISYON", -300),
  ])[0];

  yakin("en düşük %10", bant.enDusuk, 10);
  yakin("en yüksek %30", bant.enYuksek, 30);
  yakin("medyan %20", bant.medyan, 20);
  kontrol("3 sipariş sayıldı", bant.siparisSayisi === 3, bant.siparisSayisi);
  kontrol(
    "kesinti NEGATİF gelse de oran pozitif",
    bant.enDusuk > 0 && bant.enYuksek > 0,
  );

  // MEDYAN, ORTALAMA DEĞİL: tek uç değer ortalamayı çeker, medyanı çekmez.
  const uclu = komisyonBandi([
    kalem("A", "SIPARIS_TUTARI", 1000),
    kalem("A", "KOMISYON", 200),
    kalem("B", "SIPARIS_TUTARI", 1000),
    kalem("B", "KOMISYON", 200),
    kalem("C", "SIPARIS_TUTARI", 1000),
    kalem("C", "KOMISYON", 900),
  ])[0];
  yakin("uç değer medyanı bozmaz (%20)", uclu.medyan, 20);
  kontrol(
    "  ...ortalama olsaydı ~%43 çıkardı",
    Math.abs(uclu.medyan - 43.3) > 5,
    uclu.medyan,
  );

  // EKSİK VERİ: yalnız komisyonu ya da yalnız tutarı olan sipariş sayılmaz.
  const eksik = komisyonBandi([
    kalem("A", "SIPARIS_TUTARI", 1000),
    kalem("A", "KOMISYON", 200),
    kalem("B", "KOMISYON", 150), // tutarı yok
    kalem("C", "SIPARIS_TUTARI", 900), // komisyonu yok
    kalem("D", "SIPARIS_TUTARI", 1000),
    kalem("D", "KOMISYON", 220),
    kalem("E", "SIPARIS_TUTARI", 1000),
    kalem("E", "KOMISYON", 180),
  ])[0];
  kontrol(
    "yarım siparişler sayılmadı (3 gözlem)",
    eksik.siparisSayisi === 3,
    eksik.siparisSayisi,
  );

  // AZ GÖZLEMDEN BANT ÇIKMAZ.
  const azgozlem = komisyonBandi([
    kalem("A", "SIPARIS_TUTARI", 1000),
    kalem("A", "KOMISYON", 200),
    kalem("B", "SIPARIS_TUTARI", 1000),
    kalem("B", "KOMISYON", 200),
  ]);
  kontrol("2 siparişten bant üretilmez", azgozlem.length === 0, azgozlem.length);

  // KANAL HESAPLARI KARIŞMAZ.
  const ikiHesap = komisyonBandi([
    kalem("A", "SIPARIS_TUTARI", 1000, "h1"),
    kalem("A", "KOMISYON", 200, "h1"),
    kalem("B", "SIPARIS_TUTARI", 1000, "h1"),
    kalem("B", "KOMISYON", 200, "h1"),
    kalem("C", "SIPARIS_TUTARI", 1000, "h1"),
    kalem("C", "KOMISYON", 200, "h1"),
    kalem("D", "SIPARIS_TUTARI", 1000, "h2"),
    kalem("D", "KOMISYON", 50, "h2"),
    kalem("E", "SIPARIS_TUTARI", 1000, "h2"),
    kalem("E", "KOMISYON", 50, "h2"),
    kalem("F", "SIPARIS_TUTARI", 1000, "h2"),
    kalem("F", "KOMISYON", 50, "h2"),
  ]);
  kontrol("iki hesap iki ayrı bant", ikiHesap.length === 2, ikiHesap.length);
  const h2 = ikiHesap.find((b) => b.channelAccountId === "h2")!;
  yakin("ikinci hesabın medyanı %5", h2.medyan, 5);

  // --- UYARI EŞİĞİ: geniş bant hiçbir şeyi yakalamaz, bu yüzden dilim ---
  const genis = komisyonBandi(
    Array.from({ length: 20 }, (_, i) => [
      kalem(`S${i}`, "SIPARIS_TUTARI", 1000),
      // 18 tanesi %18-22 bandında, 2 tanesi uçta (%2 ve %60)
      kalem(`S${i}`, "KOMISYON", i === 0 ? 20 : i === 19 ? 600 : 180 + i * 2),
    ]).flat(),
  )[0];
  kontrol(
    "görülen bant uç değerleri İÇERİR",
    genis.enDusuk < 5 && genis.enYuksek > 50,
    `%${genis.enDusuk.toFixed(1)} – %${genis.enYuksek.toFixed(1)}`,
  );
  kontrol(
    "uyarı aralığı DAR (uç değerler dışarıda)",
    genis.uyariAlt > 10 && genis.uyariUst < 40,
    `%${genis.uyariAlt.toFixed(1)} – %${genis.uyariUst.toFixed(1)}`,
  );
  kontrol("%2 girilirse UYARIR", bantDisiMi(2, genis));
  kontrol("%60 girilirse UYARIR", bantDisiMi(60, genis));
  kontrol("%20 girilirse SUSAR", !bantDisiMi(20, genis));
  kontrol(
    "  ...görülen bant kullanılsaydı %2 bile SUSARDI",
    2 >= genis.enDusuk,
    `görülen alt sınır %${genis.enDusuk.toFixed(2)}`,
  );
}

// ===========================================================================
console.log("\n5) NEDEN YÖNÜ — ANLAMSIZ BİLEŞİM KURULAMAZ");
// ===========================================================================
{
  /**
   * ════════════════════════════════════════════════════════════════════
   *  "STOĞA EKLE" LİSTESİNDE FİRE GÖRÜNÜYORDU (16.08.2026)
   * --------------------------------------------------------------------
   *  Kullanıcı sordu: "artıda neden girmek sağlıklı mı?" Cevap EVET —
   *  yoktan mal belirmesi eksilmesinden DAHA şüphelidir; hayalet envanter
   *  ve sahte kâr sisteme bu kapıdan girer.
   *
   *  Ama liste yönü hiç sormuyordu: "Stoğa ekle" seçiliyken "Fire",
   *  "Hasar / kırılma", "Kayıp" seçilebiliyordu. Zararsız da değildi —
   *  rapor o kaydı FİRE KAZANCI satırına yazar ve ekran kendini yalanlar.
   *
   *  Süzgeç görünürlük değil GEÇERLİLİK meselesi.
   * ════════════════════════════════════════════════════════════════════
   */
  const seed = readFileSync("prisma/seed-stok-duzeltme.ts", "utf8");
  const form = readFileSync(
    "src/app/stok/[variantId]/duzeltme-formu.tsx",
    "utf8",
  );
  const varyantSayfasi = readFileSync(
    "src/app/stok/[variantId]/page.tsx",
    "utf8",
  );
  const sema = semaMetni();

  const yonu = (ad: string) => {
    const yer = seed.indexOf(`name: "${ad}"`);
    if (yer === -1) return null;
    const m = seed.slice(yer, yer + 260).match(/yon: "(EKSI|ARTI|HER_IKISI)"/);
    return m ? m[1] : null;
  };

  kontrol("şemada yön alanı var", sema.includes("yon DuzeltmeYonu"));
  kontrol(
    "  ...varsayılanı HER_IKISI (migration hiçbir satırı kısıtlamaz)",
    sema.includes("yon DuzeltmeYonu @default(HER_IKISI)"),
  );

  kontrol("Fire yalnız EKSİ yönde", yonu("Fire") === "EKSI", yonu("Fire"));
  kontrol("Hasar / kırılma yalnız EKSİ", yonu("Hasar / kırılma") === "EKSI");
  kontrol("Kayıp yalnız EKSİ yönde", yonu("Kayıp") === "EKSI");
  kontrol("Sayım farkı İKİ yönde geçerli", yonu("Sayım farkı") === "HER_IKISI");
  kontrol("Diğer İKİ yönde geçerli", yonu("Diğer") === "HER_IKISI");

  /** ARTI yönde seçilecek EN AZ BİR neden olmalı — yoksa form çıkmaza döner. */
  const artiNedenler = [
    "Kayıp mal bulundu",
    "Tedarikçi fazla gönderdi",
    "Numune / hediye giriş",
    "Yanlış varyanttan aktarıldı",
  ];
  for (const ad of artiNedenler) {
    kontrol(`"${ad}" ARTI yönde tanımlı`, yonu(ad) === "ARTI", yonu(ad));
  }
  const aktarimYeri = seed.indexOf('name: "Yanlış varyanttan aktarıldı"');
  kontrol(
    "  ...varyant aktarımı AÇIKLAMA istiyor (karşı kayıt bulunabilsin)",
    aktarimYeri !== -1 &&
      seed.slice(aktarimYeri, aktarimYeri + 260).includes("requiresNote: true"),
  );

  kontrol(
    "form nedenleri YÖNE göre süzüyor",
    form.includes("const uygunNedenler"),
  );
  kontrol(
    "  ...HER_IKISI iki yönde de kalıyor",
    form.includes('n.yon === "HER_IKISI" || n.yon === yon'),
  );
  kontrol(
    "  ...listede SÜZÜLMÜŞ küme çiziliyor (ham liste değil)",
    form.includes("{uygunNedenler.map(") && !form.includes("{nedenler.map("),
  );
  kontrol(
    "  ...yön değişince uygunsuz seçim düşüyor",
    form.includes("const gecerliNedenId") &&
      form.includes("value={gecerliNedenId}"),
  );
  kontrol(
    "  ...forma yön bilgisi GERÇEKTEN geçiyor",
    varyantSayfasi.includes("yon: n.yon"),
  );

  /**
   * SEED VAR OLANI GÜNCELLEMELİ. `update: {}` bırakılsaydı canlıdaki üç
   * neden HER_IKISI varsayılanında kalır ve süzgeç HİÇBİR ŞEYİ süzmezdi:
   * kod doğru olur, ekran eski davranışta kalırdı.
   */
  kontrol(
    "seed mevcut nedenlerin YÖNÜNÜ güncelliyor",
    seed.includes("update: { yon: n.yon }"),
  );

  /**
   * ════════════════════════════════════════════════════════════════════
   *  YÖNÜ YÖNETECEK EKRAN VAR MI (16.08.2026)
   * --------------------------------------------------------------------
   *  Alan şemaya eklendiğinde ayarlar ekranı UNUTULMUŞTU: kullanıcının
   *  açtığı her neden sonsuza dek HER_IKISI kalıyordu ve "stoğa ekle"
   *  listesinde anlamsız seçenekler yeniden birikiyordu. Yani az önce
   *  kapatılan kapı ayarlardan tekrar açılıyordu.
   *
   *  Canlıda örneği vardı: kullanıcının eklediği "Nakliye hasarı" nedeni.
   *  Anlamı eksi yön, ama kimse öyle işaretleyemiyordu.
   *
   *  "Kullanıcıya 'şunu tanımla' diyorsam, onu tanımlayacak EKRAN var mı?"
   * ════════════════════════════════════════════════════════════════════
   */
  const nedenFormu = readFileSync(
    "src/app/ayarlar/duzeltme-nedenleri/neden-formu.tsx",
    "utf8",
  );
  const nedenSatiri = readFileSync(
    "src/app/ayarlar/duzeltme-nedenleri/neden-satiri.tsx",
    "utf8",
  );
  const nedenEylem = readFileSync(
    "src/app/ayarlar/duzeltme-nedenleri/actions.ts",
    "utf8",
  );
  const nedenSayfasi = readFileSync(
    "src/app/ayarlar/duzeltme-nedenleri/page.tsx",
    "utf8",
  );
  const trSozluk2 = JSON.parse(readFileSync("messages/tr.json", "utf8")) as { Stok?: Record<string, string> };
  const trSozluk = JSON.parse(readFileSync("messages/tr.json", "utf8")) as {
    DuzeltmeNedeni?: Record<string, string>;
  };

  kontrol(
    "YENİ neden formunda yön seçimi var",
    nedenFormu.includes('name="yon"'),
  );
  kontrol(
    "  ...varsayılanı HER_IKISI, düşünmeden geçen kısıtlanmıyor",
    nedenFormu.includes('useState<"EKSI" | "ARTI" | "HER_IKISI">("HER_IKISI")'),
  );
  kontrol(
    "MEVCUT neden satırında yön düzenlenebiliyor",
    nedenSatiri.includes('name="yon"'),
  );
  /**
   * YÖN TİP GİBİ KİLİTLENMEZ. Tip geçmiş raporu oynatır — dünkü fire bugün
   * sayım farkı olurdu. Yön yalnız seçim listesini süzer; yazılmış
   * kayıtların anlamına dokunmaz, o yüzden sonradan düzeltilebilmeli.
   */
  kontrol(
    "  ...yön hareket görmüş nedende de değiştirilebiliyor",
    !nedenSatiri.includes("yonKilitli"),
  );
  kontrol(
    "sunucu yönü DOĞRULUYOR (istek elle kurulabilir)",
    nedenEylem.includes('z.enum(["EKSI", "ARTI", "HER_IKISI"]'),
  );
  kontrol(
    "  ...ekleme ve güncelleme yollarının İKİSİNDE de yazılıyor",
    (nedenEylem.match(/yon: cozum\.data\.yon/g) ?? []).length === 2,
  );
  kontrol(
    "sayfa yönü satıra GERÇEKTEN geçiriyor",
    nedenSayfasi.includes("yon: n.yon"),
  );
  kontrol(
    "yön metinleri sözlükte DOLU",
    ["yonEtiketi", "yonEksi", "yonArti", "yonHerIkisi", "yonNotu"].every(
      (k) => (trSozluk.DuzeltmeNedeni?.[k] ?? "").length > 0,
    ),
  );

  /**
   * SUNUCU DA DOĞRULAR — ekran süzgeci yalnız GÖRÜNÜRLÜKTÜR. İstek elle
   * kurulabilir, eski sekme açık kalabilir, kullanıcı neden seçtikten
   * sonra yönü değiştirebilir. Süzgeç bir GÜVENLİK değil kolaylıktır.
   */
  const duzeltmeEylemi = readFileSync("src/app/stok/duzeltme-actions.ts", "utf8");
  kontrol(
    "sunucu neden-yön uyumunu DOĞRULUYOR",
    duzeltmeEylemi.includes(`neden.yon !== "HER_IKISI" && neden.yon !== yon`),
  );
  kontrol(
    "  ...uyumsuzlukta TÜRKÇE hata dönüyor (sessiz kayıt yok)",
    duzeltmeEylemi.includes(`t("nedenYonUyumsuz")`) &&
      (trSozluk2.Stok?.nedenYonUyumsuz ?? "").length > 0,
  );
}


console.log("\n" + "=".repeat(70));
if (basarisiz === 0) console.log(`TÜM KONTROLLER GEÇTİ (${calisan})`);
else {
  console.log(`${basarisiz} KONTROL BAŞARISIZ (${calisan} kontrolden)`);
  process.exitCode = 1;
}
console.log("");
