import { readFileSync } from "node:fs";

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
/**
 * ============================================================================
 *  TAZMİNAT DOĞRULAMA
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run tazminat:dogrula
 *
 *  Veritabanına GİTMEZ. Üç bölüm:
 *  1) AÇIK/KAPALI — hangi durum alacak sayılır.
 *  2) TOPLAM — para birimleri toplanmaz, ayrı durur.
 *  3) KALAN ADET — aynı hasar iki kez talep edilemez.
 * ============================================================================
 */

import {
  acikAlacakToplami,
  acikMi,
  kalanTalepEdilebilirAdet,
  karsiTarafAdi,
  karsiTarafGecerliMi,
  varsayilanTalepTutari,
  tazminatTahsilTarihi,
  tazminatTahsilTarihleri,
  TAZMINAT_TAHSIL_EDILDI_EYLEMI,
  TAZMINAT_TAHSILI_GERI_ALINDI_EYLEMI,
  type TazminatKaydi,
} from "../src/lib/tazminat";

let basarisiz = 0;
let calisan = 0;
const BOLUM_SAYISI = 5;
const kosanBolumler: string[] = [];

function kontrol(ad: string, kosul: boolean, ayrinti?: unknown) {
  calisan++;
  if (kosul) {
    console.log(`  OK    ${ad}`);
  } else {
    basarisiz++;
    console.log(`  HATA  ${ad}`);
    if (ayrinti !== undefined) console.log("        ", ayrinti);
  }
}

// ===========================================================================
console.log("\n1) AÇIK / KAPALI");
// ===========================================================================
{
  kontrol("OPEN açık", acikMi("OPEN"));
  kontrol("CLAIMED açık", acikMi("CLAIMED"));
  // Tedarikçi kabul etti ama parayı göndermedi — HÂLÂ ALACAK.
  kontrol("ACCEPTED açık (para henüz gelmedi)", acikMi("ACCEPTED"));
  kontrol("REJECTED kapalı", !acikMi("REJECTED"));
  kontrol("SETTLED kapalı", !acikMi("SETTLED"));
  kosanBolumler.push("durum");
}

// ===========================================================================
console.log("\n2) TOPLAM — para birimleri toplanmaz");
// ===========================================================================
{
  const kayitlar: TazminatKaydi[] = [
    { durum: "OPEN", tutar: 100, paraBirimi: "TRY" },
    { durum: "CLAIMED", tutar: 250, paraBirimi: "TRY" },
    { durum: "ACCEPTED", tutar: 50, paraBirimi: "EUR" },
    { durum: "REJECTED", tutar: 999, paraBirimi: "TRY" },
    { durum: "SETTLED", tutar: 888, paraBirimi: "EUR" },
  ];
  const toplam = acikAlacakToplami(kayitlar);

  kontrol("iki para birimi ayrı satır", toplam.length === 2, toplam);
  kontrol(
    "TRY = 350 (reddedilen girmez)",
    toplam.find((t) => t.paraBirimi === "TRY")?.tutar === 350,
    toplam,
  );
  kontrol(
    "EUR = 50 (kapanan girmez)",
    toplam.find((t) => t.paraBirimi === "EUR")?.tutar === 50,
    toplam,
  );
  kontrol("kayıt yoksa boş liste", acikAlacakToplami([]).length === 0);
  // Hepsi kapalıysa toplam satırı hiç üretilmez — sıfır göstermek yanlış
  // olurdu, "alacak yok" ile "hesaplanamadı" ayrı şeyler.
  kontrol(
    "hepsi kapalıysa satır yok",
    acikAlacakToplami([
      { durum: "SETTLED", tutar: 10, paraBirimi: "TRY" },
      { durum: "REJECTED", tutar: 20, paraBirimi: "TRY" },
    ]).length === 0,
  );
  kosanBolumler.push("toplam");
}

// ===========================================================================
console.log("\n3) KALAN ADET — aynı hasar iki kez talep edilemez");
// ===========================================================================
{
  kontrol("3 hasar, talep yok -> 3", kalanTalepEdilebilirAdet(3, []) === 3);
  kontrol("3 hasar, 1 talep -> 2", kalanTalepEdilebilirAdet(3, [1]) === 2);
  kontrol("3 hasar, 1+2 talep -> 0", kalanTalepEdilebilirAdet(3, [1, 2]) === 0);
  // Reddedilen talep de düşülür: yeniden görüşülecekse o kayıt açılır,
  // ikinci bir kayıt değil.
  kontrol("fazla talep negatife düşmez", kalanTalepEdilebilirAdet(2, [5]) === 0);
  kontrol("hasar yoksa 0", kalanTalepEdilebilirAdet(0, []) === 0);

  // KAYAN NOKTA TUZAĞI: 3 * 149.9 === 449.70000000000005
  // Decimal alanına o hâliyle yazılmasın diye tutar METİN olarak,
  // alanın kesinliğine yuvarlanmış döner.
  kontrol(
    "3 × 149,90 -> 449.7000 (kayan nokta artığı yok)",
    varsayilanTalepTutari(3, 149.9) === "449.7000",
    varsayilanTalepTutari(3, 149.9),
  );
  kontrol("adet 0 -> 0.0000", varsayilanTalepTutari(0, 149.9) === "0.0000");
  kontrol(
    "kuruşlu maliyet korunur",
    varsayilanTalepTutari(7, 12.3456) === "86.4192",
    varsayilanTalepTutari(7, 12.3456),
  );
  kosanBolumler.push("adet");
}


// ===========================================================================
console.log("\n4) KARŞI TARAF — ÜÇ TÜRDEN BİRİ, AMA EN AZ BİRİ");
// ===========================================================================
/**
 * 23.08.2026: `supplierId` ZORUNLULUKTAN ÇIKTI çünkü karşı taraf kargo
 * şirketi de olabiliyor (docs/iade-sureci.md §12.1 — iade 10 günde
 * ulaşmazsa pazaryeri onaylıyor, tazmin kargodan istenir).
 *
 * ⚠ ZORUNLULUK KALKINCA BİR KAPI AÇILDI: üç alanın da boş olduğu bir kayıt
 * artık YAZILABİLİR ve öyle bir kayıt ANLAMSIZDIR — kimden alacaklı
 * olduğumuzu söylemeyen bir alacak, alacak değildir. Prisma "en az biri
 * dolu" kısıtını ifade edemiyor; kural uygulama katmanında ve burada
 * sınanıyor.
 */
{
  kontrol(
    "tedarikçi dolu → geçerli",
    karsiTarafGecerliMi({ supplierId: "s1", carrierId: null }),
  );
  kontrol(
    "kargo dolu → geçerli",
    karsiTarafGecerliMi({ supplierId: null, carrierId: "c1" }),
  );
  kontrol(
    "ikisi de dolu → geçerli (çelişki değil, kural en AZ biri)",
    karsiTarafGecerliMi({ supplierId: "s1", carrierId: "c1" }),
  );
  /** ⚠ ASIL KONTROL BU — kapı burada kapanıyor. */
  kontrol(
    "İKİSİ DE BOŞ → GEÇERSİZ",
    !karsiTarafGecerliMi({ supplierId: null, carrierId: null }),
  );
  /**
   * ⚠ BOŞ DİZE DE BOŞTUR. Form gönderiminde seçilmemiş bir alan `""`
   * gelir, `null` değil; `!= null` ile yazılmış bir kontrol onu DOLU
   * sayardı ve kapı sessizce açık kalırdı.
   */
  kontrol(
    "  ...boş dize de boş sayılıyor (form tuzağı)",
    !karsiTarafGecerliMi({ supplierId: "", carrierId: "" }),
  );
  kontrol(
    "  ...alanlar hiç verilmemişse de geçersiz",
    !karsiTarafGecerliMi({}),
  );

  /** Ekranda görünen ad tek gövdeden çözülüyor — iki yerde iki ölçüt olmasın. */
  kontrol(
    "karşı taraf adı: tedarikçi",
    karsiTarafAdi({ supplier: { name: "Trendyol" }, carrier: null }) === "Trendyol",
  );
  kontrol(
    "  ...kargo",
    karsiTarafAdi({ supplier: null, carrier: { name: "Aras" } }) === "Aras",
  );
  /**
   * ⚠ "—" DÖNMÜYOR, `null` DÖNÜYOR. Çağıran taraf ne yazacağına kendi
   * karar versin: adsız satır yazılmaz (İlke #14) ve sessiz bir tire,
   * bozuk veriyi normal gösterir.
   */
  kontrol(
    "  ...ikisi de yoksa null (çağıran karar verir)",
    karsiTarafAdi({ supplier: null, carrier: null }) === null,
  );

  // ── ŞEMA ↔ KURAL BAĞI ────────────────────────────────────────────────
  const sema = semaMetni();
  const blok = sema.slice(
    sema.indexOf("model Compensation {"),
    sema.indexOf("\n}", sema.indexOf("model Compensation {")),
  );
  kontrol("Compensation bloğu kesilebildi", blok.length > 0);
  kontrol(
    "supplierId artık NULLABLE",
    /supplierId\s+String\?/.test(blok),
  );
  kontrol("kargo karşı tarafı var", /carrierId\s+String\?/.test(blok));
  kontrol(
    "  ...`CargoCarrier`e bağlı, Supplier'a DEĞİL",
    /carrier\s+CargoCarrier\?/.test(blok),
  );
  kontrol(
    "iade BİLDİRİMİNE bağlanabiliyor",
    /returnNoticeId\s+String\?/.test(blok),
  );
  /**
   * ⚠ `returnItemId` KALDIRILMADI. İkisi ayrı soruya cevap veriyor:
   * biri "iade işlendi, kalemi hasarlı", öteki "iade hiç gelmedi ama
   * alacak doğdu". Birini ötekinin yerine koymak, kargoda kaybolan
   * iadeyi hiç kaydedememek olurdu.
   */
  kontrol(
    "  ...ve `returnItemId` YERİNDE DURUYOR (ikisi ayrı soru)",
    /returnItemId\s+String\?/.test(blok),
  );

  /**
   * ⚠ KARGO FİRMALARI `Supplier` OLARAK AÇILMAMIŞ OLMALI. Aynı varlığın
   * iki kimliği bir gün ayrışır — Soundcore vakası (`194645027819` vs
   * `194644037819`). Tedarikçi seed'inde kargo firması adı geçmemeli.
   */
  const seed = readFileSync("prisma/seed.ts", "utf8");
  const kargoAdlari = ["ARAS", "YURTICI", "HEPSIJET", "SURAT", "HOROZ"];
  const seedTedarikci = seed.slice(
    seed.indexOf("supplier"),
    seed.indexOf("supplier") + 4000,
  );
  kontrol(
    "kargo firmaları tedarikçi olarak AÇILMAMIŞ",
    !kargoAdlari.some((k) => new RegExp(`code:\\s*"${k}"`).test(seedTedarikci)),
  );

  /**
   * ════════════════════════════════════════════════════════════════════
   *  KURAL YAZILDI MI DEĞİL — KAPIYA TAKILDI MI
   * --------------------------------------------------------------------
   *  ⚠ 23.08.2026'DA TAM BU TUZAĞA DÜŞÜLDÜ. `karsiTarafGecerliMi` yazıldı,
   *  saf fonksiyon olarak sınandı ve yukarıdaki altı kontrol YEŞİL yandı —
   *  ama fonksiyon HİÇBİR YERDEN ÇAĞRILMIYORDU. Yani kural vardı, kapı
   *  yoktu; karşı tarafsız kayıt yine yazılabilirdi.
   *
   *  Deponun dersi: _"düzeltme yolu, tüm okuyuculara ulaştığı ÖLÇÜLMEDEN
   *  'var' sayılmaz."_ Saf mantığı sınamak yetmez, ÇAĞRILDIĞI da sınanır.
   * ════════════════════════════════════════════════════════════════════
   */
  const eylem = readFileSync("src/app/tazminat/actions.ts", "utf8");
  kontrol(
    "kural KAPIYA takılı (action gerçekten çağırıyor)",
    /if\s*\(!karsiTarafGecerliMi\(/.test(eylem),
  );
  /**
   * ⚠ ÇAĞRI, YAZMADAN ÖNCE OLMALI. Sonra çağrılsaydı kayıt zaten
   * yazılmış olurdu ve kontrol hiçbir şeyi engellemezdi.
   */
  const kapiYeri = eylem.indexOf("karsiTarafGecerliMi(");
  const yazmaYeri = eylem.indexOf("prisma.compensation.create(");
  kontrol(
    "  ...ve YAZMADAN ÖNCE çağrılıyor",
    kapiYeri !== -1 && yazmaYeri !== -1 && kapiYeri < yazmaYeri,
    { kapiYeri, yazmaYeri },
  );
  /** Sessiz düşmez: kullanıcı NEDEN açılamadığını görür (İlke #5). */
  const sozlukT = JSON.parse(readFileSync("messages/tr.json", "utf8")) as {
    Tazminat?: Record<string, string>;
  };
  /**
   * ⚠ "UZUNLUK > 20" BİR ÖLÇÜT DEĞİL — MUTASYON GEÇTİ. İlk yazımda mesajın
   * uzunluğuna bakılıyordu; metni "Hata…" ile başlatan mutasyon o eşiği
   * rahatça aştı ve kontrol yeşil kaldı. Uzunluk, açıklayıcılığın vekili
   * olamaz.
   *
   * Doğru ölçüt İÇERİK: mesaj (a) NEYİN eksik olduğunu adıyla söylemeli,
   * (b) NE YAPILACAĞINI söylemeli. İlke #5'in istediği tam olarak bu ikisi.
   */
  const sebepMetni = sozlukT.Tazminat?.karsiTarafYokHata ?? "";
  kontrol(
    "  ...sebep ekranda yazıyor (sessiz başarısızlık yok)",
    /karsiTarafYokHata/.test(eylem),
  );
  kontrol(
    "  ...mesaj NEYİN eksik olduğunu söylüyor",
    /tedarikçi/i.test(sebepMetni),
  );
  kontrol(
    "  ...ve NE YAPILACAĞINI söylüyor",
    /(girip|ekleyip|tanımlay|deneyin)/i.test(sebepMetni),
  );

  kosanBolumler.push("karsi-taraf");
}

console.log("\n5) TAHSİLAT İZİ — PAKETLEME İZİYLE AYNI DESEN (K209)");
{
  const T = TAZMINAT_TAHSIL_EDILDI_EYLEMI;
  const G = TAZMINAT_TAHSILI_GERI_ALINDI_EYLEMI;
  const an = (dk: number) => new Date(2026, 8, 11, 10, dk);

  kontrol("iz yoksa tahsil edilmemiş", tazminatTahsilTarihi([]) === null);

  kontrol(
    "tahsil izi varsa TARİHİNİ döner",
    tazminatTahsilTarihi([{ action: T, createdAt: an(1), targetId: "a" }])
      ?.getTime() === an(1).getTime(),
  );

  kontrol(
    "geri alınmışsa tahsil edilmemiş (null)",
    tazminatTahsilTarihi([
      { action: T, createdAt: an(1), targetId: "a" },
      { action: G, createdAt: an(2), targetId: "a" },
    ]) === null,
  );

  kontrol(
    "geri alınıp TEKRAR tahsil edilmişse en yeni tarih döner",
    tazminatTahsilTarihi([
      { action: T, createdAt: an(1), targetId: "a" },
      { action: G, createdAt: an(2), targetId: "a" },
      { action: T, createdAt: an(3), targetId: "a" },
    ])?.getTime() === an(3).getTime(),
  );

  kontrol(
    "sıralama zaman damgasından, dizi sırasından DEĞİL",
    tazminatTahsilTarihi([
      { action: G, createdAt: an(5), targetId: "a" },
      { action: T, createdAt: an(1), targetId: "a" },
    ]) === null,
  );

  /**
   * ⚠ EŞİT ZAMAN DAMGASINDA GERİ ALMA KAZANIR — paketleme izi ile aynı
   * risk gerekçesi: yanlışlıkla "tahsil edildi" saymak GERÇEK NET'i şişirir.
   */
  kontrol(
    "eşit zaman damgasında GERİ ALMA kazanır (güvenli yön)",
    tazminatTahsilTarihi([
      { action: T, createdAt: an(1), targetId: "a" },
      { action: G, createdAt: an(1), targetId: "a" },
    ]) === null,
  );

  kontrol(
    "yabancı eylem izi karıştırmıyor (daha yeni olsa bile)",
    tazminatTahsilTarihi([
      { action: T, createdAt: an(1), targetId: "a" },
      { action: "DURUM_DEGISTIRILDI", createdAt: an(9), targetId: "a" },
    ])?.getTime() === an(1).getTime(),
  );

  /** Satış başına gruplama (paketlemedeki `hazirlananSiparisler` deseni). */
  const harita = tazminatTahsilTarihleri([
    { action: T, createdAt: an(1), targetId: "a" },
    { action: T, createdAt: an(1), targetId: "b" },
    { action: G, createdAt: an(2), targetId: "b" },
    { action: T, createdAt: an(1), targetId: null },
  ]);
  kontrol(
    "gruplama talep başına doğru çözüyor",
    harita.has("a") && !harita.has("b") && harita.size === 1,
    [...harita.keys()],
  );

  /**
   * ════════════════════════════════════════════════════════════════════
   *  KURAL YAZILDI MI DEĞİL — İZ GERÇEKTEN YAZILIYOR MU
   * --------------------------------------------------------------------
   *  23.08.2026'daki `karsiTarafGecerliMi` dersinin aynısı: saf fonksiyon
   *  doğru olabilir ama hiçbir yerden çağrılmıyor olabilir. `updatedAt`e
   *  güvenmek yerine (K208 not düzenlemesiyle KİRLENİR) SETTLED sınırını
   *  geçerken gerçekten `izYaz` çağrıldığı kaynaktan doğrulanır.
   * ════════════════════════════════════════════════════════════════════
   */
  const eylem = readFileSync("src/app/tazminat/actions.ts", "utf8");
  const durumBloku = eylem.slice(
    eylem.indexOf("export async function tazminatDurumDegistir"),
  );

  /**
   * ⚠ "DESEN VAR MI" YETMEZ — `if (false && <beklenen koşul>)` gibi bir
   * mutasyon deseni AYAKTA BIRAKIR ve eski gevşek kontrol (yalnız `indexOf`
   * sırası) bunu YEŞİL geçirirdi — bizzat denenip görüldü. Koşul metni TAM
   * EŞLEŞTİRİLİR: en yakın `if (…) {`in içeriği bire bir beklenenle
   * karşılaştırılır, "içeriyor mu" değil "AYNI MI" sorulur.
   */
  function ifKosuluOncesinde(metin: string, isaret: string): string | null {
    const isaretYeri = metin.indexOf(isaret);
    if (isaretYeri === -1) return null;
    const sonIfYeri = metin.slice(0, isaretYeri).lastIndexOf("if (");
    if (sonIfYeri === -1) return null;
    const kosulEslesme = /^if\s*\(([^)]*)\)\s*\{/.exec(metin.slice(sonIfYeri));
    return kosulEslesme?.[1]?.replace(/\s+/g, " ").trim() ?? null;
  }

  const tahsilKosul = ifKosuluOncesinde(
    durumBloku,
    "TAZMINAT_TAHSIL_EDILDI_EYLEMI",
  );
  kontrol(
    "SETTLED'e YENİ giren geçişte tahsilat izi yazılıyor",
    tahsilKosul === 'kayit.status !== "SETTLED" && yeni === "SETTLED"',
    tahsilKosul,
  );

  const geriAlKosul = ifKosuluOncesinde(
    durumBloku,
    "TAZMINAT_TAHSILI_GERI_ALINDI_EYLEMI",
  );
  kontrol(
    "  ...SETTLED'DEN ÇIKAN geçişte GERİ ALMA izi yazılıyor",
    geriAlKosul === 'kayit.status === "SETTLED" && yeni !== "SETTLED"',
    geriAlKosul,
  );
  kontrol(
    "  ...iz `Compensation`a bağlı, `Sale`ye DEĞİL (karışmasın)",
    /targetType: "Compensation"/.test(durumBloku),
  );

  /**
   * ⚠ `/rapor` SAYFASI GERÇEKTEN OKUYOR MU — kural yazılıp da hiç
   * çağrılmayan `hazirlaniyorMu` dersinin aynısı. Kaynak `/rapor/page.tsx`
   * hem izi sorguluyor hem `girdi.tazminatlar`a bağlıyor mu.
   */
  const raporSayfa = readFileSync("src/app/rapor/page.tsx", "utf8");
  kontrol(
    "/rapor tahsilat izini SORGULUYOR (TÜM geçmiş, tarih süzgeçsiz)",
    /TAZMINAT_TAHSILAT_EYLEMLERI/.test(raporSayfa) &&
      /tazminatTahsilTarihleri\(/.test(raporSayfa),
  );
  kontrol(
    "  ...ve sonucu `girdi.tazminatlar`a BAĞLIYOR (kopmuyor)",
    /tazminatlar\s*[,}]/.test(
      raporSayfa.slice(
        raporSayfa.indexOf("const girdi = {"),
        raporSayfa.indexOf("const girdi = {") + 200,
      ),
    ),
  );

  kosanBolumler.push("tahsilat-izi");
}

// ===========================================================================
console.log("");
if (kosanBolumler.length !== BOLUM_SAYISI) {
  console.log(
    `KOŞUM YARIM KALDI — sonuç GEÇERSİZ (${kosanBolumler.length}/${BOLUM_SAYISI})`,
  );
  process.exit(1);
} else if (basarisiz === 0) {
  console.log(`TÜM KONTROLLER GEÇTİ (${calisan})`);
  process.exit(0);
} else {
  console.log(`${basarisiz} KONTROL BAŞARISIZ (${calisan} kontrol içinde)`);
  process.exit(1);
}
