/**
 * ============================================================================
 *  DEPO OKUMASI BEKÇİSİ (K34a)
 * ----------------------------------------------------------------------------
 *  Bu ekranın SÖZÜ şudur: uyarı yok, kapı yok, engel yok — yalnız bilgi ve
 *  ölçüm. Söz kolayca bozulur: bir "dikkat" rozeti, bir kırmızı sınıf, bir
 *  zorunlu alan ve ekran sessizce kontrol katmanına döner. Bekçi o sözü
 *  koşulur hâle getirir.
 *
 *  ⚠ ÖLÇÜTLER MÜMKÜN OLAN HER YERDE DAVRANIŞTIR: saf fonksiyonlar İTHAL
 *  EDİLİP ÇAĞRILIYOR, metin araması yalnız ekran/kablolama için kullanılıyor
 *  ve orada da kullanım bloğuna daraltılıyor.
 * ============================================================================
 */
import { readFileSync } from "node:fs";

import { bulunanAlan, kaydiOku, kaydiYaz } from "../src/lib/okuma/kayit";
import {
  OKUMA_KOVALARI,
  bosSayim,
  eslestirilebilirMi,
  eylemKovasi,
  hukumluOkuma,
  ilkKova,
  kovaEylemi,
  kovaYuzdesi,
  kovalariSay,
  toplamOkuma,
} from "../src/lib/okuma/kova";
import { haftaAnahtari, pazartesiBasi } from "../src/lib/okuma/rapor";

/**
 * ⚠ ŞEMA SATIR SONUNDAN BAĞIMSIZ OKUNUR (24.08.2026).
 *
 * `npx prisma format` dosyayı CRLF'e çevirdi ve enum ayrıştıran kontrol
 * SESSİZCE 0 değer buldu: `split("
")` sonrası satırlar `
` ile
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
  PAKETLENDI_EYLEMI,
  PAKETLEME_GERI_ALINDI_EYLEMI,
  hazirlananSiparisler,
  hazirlaniyorMu,
} from "../src/lib/okuma/paketleme";

let calisan = 0;
let basarisiz = 0;
const kosanBolumler: string[] = [];
const BOLUM_SAYISI = 8;

function kontrol(ad: string, kosul: boolean, ayrinti?: unknown) {
  calisan += 1;
  if (kosul) {
    console.log(`  OK    ${ad}`);
  } else {
    basarisiz += 1;
    console.log(`  HATA  ${ad}`);
    if (ayrinti !== undefined) console.log("        ", ayrinti);
  }
}

const okuyucu = readFileSync("src/app/okut/okuyucu.tsx", "utf8");

/**
 * ⚠ DESEN YORUMDA DEĞİL KODDA ARANIR — bu bekçi ilk koşumunda kendi kurduğu
 * tuzağa düştü. "`onClick={okut}` yazılamaz" diye UYARAN bir JSX yorumu, o
 * deseni birebir içerdiği için kontrolü kırmızı yaktı: kod doğruydu,
 * eşleşen şey açıklamaydı.
 *
 * Aynı sınıf hata aynı gün yetki bekçisinde de çıktı (`"use server"` bir
 * yorumda geçince dosya action modülü sanıldı). Anayasa: _"kaynak tarayan
 * kontrol, deseni dosyada değil KULLANIM BLOĞUNDA arar."_
 *
 * ⚠ VE BU İKİ YÖNLÜ BİR RİSKTİR: yorum yüzünden YANLIŞ KIRMIZI yanabildiği
 * gibi, silinen bir kodun deseni yorumda kalınca YANLIŞ YEŞİL de yanardı.
 */
function yorumsuz(kaynak: string): string {
  return kaynak
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*/g, "$1");
}

const okuyucuKod = yorumsuz(okuyucu);
const eylemler = readFileSync("src/app/okut/actions.ts", "utf8");
const sayfa = readFileSync("src/app/okut/page.tsx", "utf8");

// ===========================================================================
console.log("\n1) KOVA KURALLARI — DÖRT KOVA, ÜÇÜ OKUMADAN DOĞAR");
// ===========================================================================
{
  kontrol("dört kova tanımlı", OKUMA_KOVALARI.length === 4, OKUMA_KOVALARI);

  kontrol(
    "tanınan kod + açık sipariş → ACIK_SIPARISTE_VAR",
    ilkKova({ bulunduMu: true, acikSiparisVar: true }) === "ACIK_SIPARISTE_VAR",
  );
  kontrol(
    "tanınan kod + açık sipariş YOK → ACIK_SIPARISTE_YOK",
    ilkKova({ bulunduMu: true, acikSiparisVar: false }) === "ACIK_SIPARISTE_YOK",
  );
  kontrol(
    "tanınmayan kod → BILINMEYEN",
    ilkKova({ bulunduMu: false, acikSiparisVar: false }) === "BILINMEYEN",
  );
  /**
   * ⚠ ÖRNEK VERİ AYRIMIN İKİ YAKASINI GÖSTERİR: bulunamamış bir kodun
   * "açık siparişi var" hâli anlamsızdır ve yine BILINMEYEN olmalıdır.
   * Bu satır olmasaydı `bulunduMu` kontrolünü silen bir mutasyon yeşil
   * kalırdı.
   */
  kontrol(
    "  ...bulunamayan kod, sipariş bilgisinden ETKİLENMEZ",
    ilkKova({ bulunduMu: false, acikSiparisVar: true }) === "BILINMEYEN",
  );

  /**
   * ⚠ ESLESTIRILDI OKUMADAN DOĞAMAZ. Kod tanınmadığında elimizdeki tek
   * bilgi kodun kendisidir; malın katalogda başka bir barkodla durup
   * durmadığını yalnız kutuyu elinde tutan kişi söyleyebilir.
   */
  const tumGirdiler = [true, false].flatMap((b) =>
    [true, false].map((a) => ilkKova({ bulunduMu: b, acikSiparisVar: a })),
  );
  kontrol(
    "hiçbir okuma kendiliğinden ESLESTIRILDI üretmiyor",
    !tumGirdiler.includes("ESLESTIRILDI"),
    tumGirdiler,
  );

  kontrol(
    "yalnız BILINMEYEN eşleştirilebilir (tek yön)",
    eslestirilebilirMi("BILINMEYEN") &&
      OKUMA_KOVALARI.filter((k) => k !== "BILINMEYEN").every(
        (k) => !eslestirilebilirMi(k),
      ),
  );

  /** Eylem adı ↔ kova gidiş-dönüş; sayım bunun üstünde duruyor. */
  kontrol(
    "kova ↔ eylem adı gidiş-dönüş",
    OKUMA_KOVALARI.every((k) => eylemKovasi(kovaEylemi(k)) === k),
  );
  kontrol(
    "  ...yabancı eylem kovaya çevrilmiyor",
    eylemKovasi("SATIS_IPTAL") === null && eylemKovasi("OKUMA_") === null,
  );

  kosanBolumler.push("kova-kurallari");
}

// ===========================================================================
console.log("\n2) SAYIM VE PAYDA — 'BULUNAMADI' TEK RAKAMA İNMEZ");
// ===========================================================================
{
  const sayim = kovalariSay([
    kovaEylemi("ACIK_SIPARISTE_VAR"),
    kovaEylemi("ACIK_SIPARISTE_VAR"),
    kovaEylemi("ACIK_SIPARISTE_YOK"),
    kovaEylemi("ESLESTIRILDI"),
    "SATIS_IPTAL",
  ]);
  kontrol(
    "sayım yalnız okuma eylemlerini topluyor",
    sayim.ACIK_SIPARISTE_VAR === 2 &&
      sayim.ACIK_SIPARISTE_YOK === 1 &&
      sayim.ESLESTIRILDI === 1 &&
      sayim.BILINMEYEN === 0,
    sayim,
  );

  /**
   * ⚠ PAYDA TOPLAM OKUMADIR — BILINMEYEN DAHİL.
   *
   * Örnek AYRIMI GÖSTERECEK şekilde seçildi: 3 hükümlü + 1 BILINMEYEN.
   * Payda toplam (4) ise ACIK_SIPARISTE_VAR %50; payda hükümlü (3) olsaydı
   * %66,7 çıkardı. İkisi farklı sayılar olmasaydı, paydayı değiştiren bir
   * mutasyon yeşil kalırdı.
   */
  const karisik = kovalariSay([
    kovaEylemi("ACIK_SIPARISTE_VAR"),
    kovaEylemi("ACIK_SIPARISTE_VAR"),
    kovaEylemi("ACIK_SIPARISTE_YOK"),
    kovaEylemi("BILINMEYEN"),
  ]);
  kontrol("toplam okuma = 4", toplamOkuma(karisik) === 4);
  kontrol("hükümlü okuma = 3 (BILINMEYEN hariç)", hukumluOkuma(karisik) === 3);
  kontrol(
    "yüzde paydası TOPLAM okuma (BILINMEYEN dahil)",
    kovaYuzdesi(karisik, "ACIK_SIPARISTE_VAR") === 50,
    kovaYuzdesi(karisik, "ACIK_SIPARISTE_VAR"),
  );
  kontrol(
    "  ...BILINMEYEN'in kendi payı da ölçülüyor",
    kovaYuzdesi(karisik, "BILINMEYEN") === 25,
  );
  kontrol("boş sayımda yüzde YOK (sıfıra bölünmüyor)", kovaYuzdesi(bosSayim(), "BILINMEYEN") === null);

  /**
   * ⚠ EKRAN DÖRT KOVAYI DA BASAR. Mimar talimatı ⑤: _"tek 'bulunamadı'
   * rakamı BASMA"_. Ölçüt elle sayım değil: sayfa kova listesinin ÜSTÜNDEN
   * geçiyor mu — yarın beşinci kova eklense o da bedava basılır.
   */
  /**
   * ⚠ SAYIM DEĞİL, HER BLOK AYRI AYRI — VE BU MUTASYONLA ÖĞRENİLDİ.
   *
   * İlk hâli _"sayfada `OKUMA_KOVALARI.map` en az İKİ kez geçiyor mu"_ diye
   * soruyordu. Desen sayfada ÜÇ yerde geçiyor (başlık · gövde · toplam);
   * başlığı elle yazılmış sütunlara çeviren mutasyon sayıyı 2'ye düşürdü ve
   * kontrol YEŞİL KALDI. Tablo başlığında dört kova yazarken gövdesinde
   * ikisinin bulunduğu bir rapor, tam olarak mimarın yasakladığı şeydir.
   *
   * Anayasa: _"aynı desen birden çok yerde geçiyorsa HER YERİ AYRI AYRI
   * sına"_. Ölçüt artık üç bloğa ayrı ayrı bakıyor.
   */
  const tabloBlogu = (bas: string, son: string) =>
    sayfa.slice(sayfa.indexOf(bas), sayfa.indexOf(son));
  const bloklar: [string, string][] = [
    ["başlık", tabloBlogu("<thead>", "</thead>")],
    ["gövde", tabloBlogu("<tbody>", "</tbody>")],
    ["toplam", tabloBlogu("<tfoot>", "</tfoot>")],
  ];
  for (const [ad, blok] of bloklar) {
    kontrol(`tablonun ${ad} bloğu kesilebildi`, blok.length > 0);
    kontrol(
      `  ...${ad} kovaları LİSTEDEN geziyor (elle sütun yok)`,
      /OKUMA_KOVALARI\.map/.test(blok),
    );
  }
  kontrol(
    "  ...ekranda 'bulunamadı' diye TEK bir toplam rakamı yok",
    !/bulunamadiToplam|toplamBulunamadi/.test(sayfa),
  );

  kosanBolumler.push("sayim-ve-payda");
}

// ===========================================================================
console.log("\n3) HANGİ ALANDA BULUNDU — SIRA RASTGELE DEĞİL");
// ===========================================================================
{
  const varyant = {
    sku: "SKU-1",
    companySku: "F-1",
    barcode: "869000",
    channelSkus: [{ channelSku: "TY-1" }],
  };
  kontrol("barkoddan bulundu", bulunanAlan("869000", varyant) === "barcode");
  kontrol("Firma SKU'dan bulundu", bulunanAlan("F-1", varyant) === "companySku");
  kontrol("sistem SKU'sundan bulundu", bulunanAlan("SKU-1", varyant) === "sku");
  kontrol("Kanal SKU'dan bulundu", bulunanAlan("TY-1", varyant) === "channelSku");
  kontrol("eşleşme yoksa null", bulunanAlan("YOK", varyant) === null);

  /**
   * ⚠ AYRIMI GÖSTEREN ÖRNEK: aynı değer İKİ rolde birden duruyor. Sıra
   * sabit olmasaydı aynı okuma iki koşumda iki farklı alana yazılırdı ve
   * "kaç okuma Firma SKU'dan bulundu" sorusu anlamını kaybederdi.
   * Tek rollü bir örnekle sınansaydı, sırayı bozan mutasyon yeşil kalırdı.
   */
  const cakisan = {
    sku: "X",
    companySku: "869000",
    barcode: "869000",
    channelSkus: [{ channelSku: "869000" }],
  };
  kontrol(
    "aynı değer iki roldeyse BARKOD kazanır (sıra sabit)",
    bulunanAlan("869000", cakisan) === "barcode",
    bulunanAlan("869000", cakisan),
  );

  kosanBolumler.push("alan-cozumu");
}

// ===========================================================================
console.log("\n4) KAYIT ŞEKLİ — YAPILANDIRILMIŞ, SERBEST METİN DEĞİL");
// ===========================================================================
{
  const yazi = kaydiYaz({
    kod: "869000",
    alan: "barcode",
    varyantId: "v1",
    sebep: null,
  });
  const geri = kaydiOku(yazi);
  kontrol(
    "gidiş-dönüş bozulmuyor",
    geri?.kod === "869000" && geri?.alan === "barcode" && geri?.varyantId === "v1",
    geri,
  );

  /**
   * ⚠ SEBEP ALANI AÇIK AMA BOŞ — mimar kararı ②. Kullanıcıya sorulmuyor,
   * seçtirilmiyor. Alan ŞİMDİ açıldı ki doldurma kararı verildiği gün eski
   * kayıtlar da aynı şekli taşısın; yoksa göç "temiz migration" değil
   * "yeniden yazım" olurdu.
   */
  kontrol("sebep her kayıtta boş", geri?.sebep === null);
  kontrol(
    "  ...ekran sebep SORMUYOR (seçtirilecek alan yok)",
    !/sebep/i.test(okuyucuKod),
  );

  /**
   * ⚠ ÇÖZÜLEMEYEN İZ RAPORU DÜŞÜRMEZ. Bozuk bir satır yüzünden haftalık
   * özet patlarsa, bir tek kayıt bütün ölçümü görünmez yapar.
   */
  kontrol("bozuk JSON null döner (patlamaz)", kaydiOku("{bozuk") === null);
  kontrol("boş detail null döner", kaydiOku(null) === null);
  kontrol(
    "tanınmayan alan adı null'a düşer (uydurulmaz)",
    kaydiOku('{"kod":"1","alan":"uydurma"}')?.alan === null,
  );

  /**
   * ⚠ `detail` CÜMLEYLE YAZILAMAZ. Bugün oraya metin yazmak kolaydır ve
   * yarın "kaç okuma Firma SKU'dan bulundu" sorusu metin ayrıştırmaya
   * kalırdı — eski kayıtlar da ayrıştırılamazdı.
   */
  const izBloku = eylemler.slice(
    eylemler.indexOf("async function iziYaz("),
    eylemler.length,
  );
  kontrol("iziYaz bloğu kesilebildi", izBloku.length > 0);
  kontrol(
    "  ...detail yalnız kaydiYaz'dan geçiyor",
    /detail: kaydiYaz\(/.test(izBloku),
  );
  kontrol(
    "  ...detail'e serbest metin birleştirilmiyor",
    !/detail:[^,]*[`+]/.test(izBloku),
  );

  kosanBolumler.push("kayit-sekli");
}

// ===========================================================================
console.log("\n5) HAFTA KOVALAMASI — SAAT DİLİMİ KAYMASI");
// ===========================================================================
{
  /**
   * ⚠ BU BÖLÜMÜN TAMAMI TEK BİR HATA İÇİN VAR ve o hata bu depoda daha önce
   * yaşandı (komisyon denetimi, 20.08.2026): değerler makul kalır, yalnız
   * YANLIŞ KOVAYA düşer ve hiçbir iç kontrol kırmızı yanmaz.
   *
   * `2026-08-16T21:30:00Z` = İstanbul'da 17 Ağustos PAZARTESİ 00:30.
   * Doğru hafta 17 Ağustos'ta başlar. UTC'ye göre kesilseydi 16 Ağustos
   * PAZAR olurdu ve okuma BİR ÖNCEKİ haftaya yazılırdı.
   */
  kontrol(
    "İstanbul'da Pazartesi 00:30 olan an, O haftaya düşüyor",
    haftaAnahtari(new Date("2026-08-16T21:30:00Z")) === "2026-08-17",
    haftaAnahtari(new Date("2026-08-16T21:30:00Z")),
  );
  /** Ayrımın öteki yakası: gerçekten önceki haftaya ait bir an. */
  kontrol(
    "  ...İstanbul'da Pazar 23:00 olan an ÖNCEKİ haftada kalıyor",
    haftaAnahtari(new Date("2026-08-16T20:00:00Z")) === "2026-08-10",
    haftaAnahtari(new Date("2026-08-16T20:00:00Z")),
  );
  kontrol(
    "hafta Pazartesi başlıyor",
    pazartesiBasi(new Date(Date.UTC(2026, 7, 20))).toISOString().slice(0, 10) ===
      "2026-08-17",
  );
  kontrol(
    "  ...Pazar, kendinden önceki Pazartesi'ye bağlanıyor",
    pazartesiBasi(new Date(Date.UTC(2026, 7, 23))).toISOString().slice(0, 10) ===
      "2026-08-17",
  );

  kosanBolumler.push("hafta-kovalamasi");
}

// ===========================================================================
console.log("\n6) UYARISIZLIK SÖZÜ — VE KAMERA");
// ===========================================================================
{
  /**
   * ⚠ SÖZ ŞUYDU: _"UYARI YOK · ONAY KAPISI YOK · İSTİSNA KAYDI YOK ·
   * HİÇBİR ŞEY ENGELLENMEZ."_ Kapsam DOSYANIN TAMAMI ve bu bilerek: kural
   * ekranın bir bölümü için değil, ekranın kendisi için geçerli.
   */
  const uyariDesenleri = [
    "destructive",
    "text-red",
    "bg-red",
    "AlertTriangle",
    "AlertCircle",
    "<Alert",
    "AlertDialog",
  ];
  const bulunanUyarilar = uyariDesenleri.filter((d) => okuyucuKod.includes(d));
  kontrol(
    "okutma ekranında uyarı dili/rengi YOK",
    bulunanUyarilar.length === 0,
    bulunanUyarilar,
  );
  kontrol(
    "  ...zorunlu alan yok (kapı değil)",
    !/\brequired\b/.test(okuyucuKod),
  );
  /**
   * ⚠ "Bulunamadı" satırı NÖTR sınıfta olmalı. Koşul ve sonuç AYNI desende
   * aranıyor: yalnız `text-muted-foreground` arasaydık, dosyanın başka
   * yerindeki bir kullanım mutasyonu ayakta tutardı.
   */
  kontrol(
    "  ...'bulunamadı' satırı nötr sınıfta",
    /className="text-sm text-muted-foreground">\s*\{t\("bulunamadi"\)\}/.test(
      okuyucuKod,
    ),
  );
  /** Teklif, talep değil: atlanabilir olduğu METİNDE yazıyor. */
  const teklif = readFileSync("messages/tr.json", "utf8");
  kontrol(
    "  ...'biliyorsan göster' metni atlanabilir olduğunu söylüyor",
    /"gosterTeklifi": "[^"]*[Aa]tla/.test(teklif),
  );

  /**
   * KAMERA — İlke #7. Ölçüt tersten: kod arayan kutu ORTAK bileşeni
   * kullanmak zorunda, çıplak `<input>` kalamaz.
   */
  kontrol("okutma kutusu ortak bileşeni kullanıyor", /<BarkodGirisi/.test(okuyucuKod));
  kontrol("  ...çıplak input yok", !/<[Ii]nput\b/.test(okuyucuKod));
  kontrol(
    "  ...ürün gösterme kutusunda DA kamera var",
    (okuyucuKod.match(/<BarkodGirisi/g) ?? []).length >= 2,
  );

  /**
   * ⚠ BAYAT DURUM TUZAĞI — fiyat denemesinde yaşandı: kamera `setKod`
   * çağırıp hemen aramayı tetikleyince arama HÂLÂ ESKİ kodu kullanıyordu.
   */
  kontrol(
    "okunan kod PARAMETRE olarak geçiyor",
    /const okut = \(okunan\?: string\)/.test(okuyucuKod) &&
      /onOkundu=\{\(okunan\) => okut\(okunan\)\}/.test(okuyucuKod),
  );
  kontrol(
    "  ...düğme tıklama olayını kod sanmıyor",
    !/onClick=\{okut\}/.test(okuyucuKod),
  );

  /**
   * ⚠ ŞEMA DEĞİŞMEDİ VE DEĞİŞMEMELİ. Karar: iz `AuditLog`ta yaşar
   * (merdiven birinci basamak). Biri yarın "kendi tablosu olsun" derse
   * burası kırmızı yanar ve karar yeniden konuşulur.
   */
  const sema = semaMetni();
  kontrol(
    "okuma için yeni model/enum AÇILMADI (AuditLog taşıyor)",
    !/model Okuma|enum Okuma/.test(sema),
  );
  kontrol(
    "  ...iz gerçekten AuditLog'a yazılıyor",
    /prisma\.auditLog\.create\(/.test(eylemler),
  );

  kosanBolumler.push("uyarisizlik-ve-kamera");
}

// ===========================================================================
console.log("\n7) SİPARİŞSİZ OKUMADA SADE EKRAN (İŞ 1)");
// ===========================================================================
/**
 * Mimar kararı 23.08.2026: siparişe konu olmayan ürün okutulduğunda tam ürün
 * kartı DÖKÜLMESİN — büyük tek mesaj, altında küçük tek satır, kalan detay
 * "Detay" ile açılsın.
 *
 * ⚠ VE RENK NÖTR KALSIN. Defter %72 eksikken "siparişte yok" çoğunlukla
 * "satış girilmemiş" demektir. Kırmızı gösterilseydi kullanıcı iki haftada
 * okumadan geçmeyi öğrenir ve işaret GERÇEK yanlış üründe görünmez olurdu.
 *
 * ⚠ ÖLÇÜM DEĞİŞMEDİ. Sadeleşen ekran; kova hâlâ `ACIK_SIPARISTE_YOK`.
 */
{
  kontrol(
    "sipariş yokken BÜYÜK tek mesaj basılıyor",
    /text-lg font-medium">\s*\{t\("siparistteYokBaslik"\)\}/.test(okuyucuKod),
  );
  /**
   * ⚠ ANAHTAR DEĞİL, DEĞER ARANIR — MUTASYONLA ÖĞRENİLDİ.
   *
   * İlk hâli `alan:` anahtarının varlığına bakıyordu. `alan: ""` yapan bir
   * mutasyon YEŞİL KALDI: anahtar duruyordu, taşıdığı bilgi yok olmuştu.
   * Anayasa: _"deseni dosyada değil KULLANIM bloğunda ara"_ — ve burada
   * blok, çağrının kendisi.
   */
  const tanindiBloku = okuyucuKod.slice(
    okuyucuKod.indexOf('t("tanindi"'),
    okuyucuKod.indexOf('{detayAcik ?'),
  );
  kontrol("tanındı çağrısı kesilebildi", tanindiBloku.length > 0);
  /**
   * ⚠ ÖLÇÜT ESKİDİ, KOD DEĞİL (24.08.2026). K41① ile gönderi numarası
   * eklenince `sonuc.urun` artık `null` olabiliyor (kod bir SATIŞ kimliği
   * olabilir) ve dereference `sonuc.urun?.urunAdi ?? ""` oldu. Davranış
   * aynı — ürün varsa adı VERİLİYOR; değişen tek şey erişim biçimi.
   *
   * Bekçi kırmızı yandı ve HAKLIYDI: sessiz kalmadı. Ölçüt güncellendi,
   * bekçi SUSTURULMADI — niyet hâlâ "sabit metin değil, gerçek ad".
   */
  kontrol(
    "  ...ÜRÜN ADI gerçekten veriliyor",
    /ad: sonuc\.urun\??\.urunAdi/.test(tanindiBloku),
  );
  kontrol(
    "  ...HANGİ ALAN gerçekten veriliyor (etiket sözlüğünden)",
    /alan: [\s\S]{0,40}alanAdi\[/.test(tanindiBloku),
  );
  /**
   * ⚠ KALAN DETAY GİZLİ BAŞLAR. Koşul hem sipariş varlığını hem açma
   * düğmesini içeriyor: yalnız `detayAcik` aransaydı, siparişli durumda
   * kartı kapatan bir mutasyon yeşil kalırdı.
   */
  kontrol(
    "  ...kalan detay siparişsizken GİZLİ, 'Detay' ile açılıyor",
    /\{siparisVar \|\| detayAcik \? \(/.test(okuyucuKod),
  );
  kontrol(
    "  ...açma düğmesi var ve durumu değiştiriyor",
    /setDetayAcik\(\(o\) => !o\)/.test(okuyucuKod),
  );
  /**
   * ⚠ SADELEŞME ÖLÇÜMÜ BOZMAZ. Kova kuralı değişmedi: tanınan ama açık
   * siparişi olmayan kod hâlâ `ACIK_SIPARISTE_YOK`.
   */
  kontrol(
    "kova kuralı DEĞİŞMEDİ (ekran sadeleşti, ölçüm değil)",
    ilkKova({ bulunduMu: true, acikSiparisVar: false }) === "ACIK_SIPARISTE_YOK",
  );

  kosanBolumler.push("sade-ekran");
}

// ===========================================================================
// ===========================================================================
//  K41① — GÖNDERİ NUMARASINDAN BULUNAN SİPARİŞ EKRANA ÇİZİLİYOR MU
// ===========================================================================
{
  /**
   * ⚠ CANLIDA ÇIKAN HATA — 24.08.2026, testin 4. adımı düştü.
   *
   * Gönderi numarası okutulunca `barkoduOkut` siparişi BULUYOR ama ekran
   * çizmiyordu: dış koşul her şeyi `sonuc.urun`a sarmıştı ve kod bir SATIŞ
   * kimliğiyse `urun` boş kalıyor. Kullanıcı "bu kod dört alanın hiçbirinde
   * bulunamadı" görüyordu — sipariş elde olmasına rağmen.
   *
   * ⚠ SUNUCU DOĞRUYDU, EKRAN YANLIŞTI. Bu yüzden kontrol sorguya değil
   * ÇİZİME bakıyor: "bulundu" hükmü iki kaynaktan da geliyor mu.
   */
  const ekran = readFileSync("src/app/okut/okuyucu.tsx", "utf8");
  const ekranKodu = ekran.replace(/\{?\/\*[\s\S]*?\*\/\}?/g, " ");

  kontrol(
    "sonuç bloğu ÜRÜN YOKKEN de çiziliyor (sipariş varsa)",
    /\{sonuc\.urun \|\| siparisVar \?/.test(ekranKodu),
  );
  /**
   * ⚠ ÜÇ DAL AYRI: ürün+sipariş · yalnız sipariş · yalnız ürün.
   * Orta dal olmadan gönderi numarası okuması boş bir kutu çizerdi.
   */
  kontrol(
    "  ...yalnız SİPARİŞ bulunduğunda kendi dalı var",
    /\{siparisVar && sonuc\.urun \?[\s\S]{0,900}\) : siparisVar \? \(/.test(
      ekranKodu,
    ),
  );
  const siparisDali = ekranKodu.slice(
    ekranKodu.indexOf(") : siparisVar ? ("),
    ekranKodu.indexOf(") : siparisVar ? (") + 700,
  );
  kontrol("  ...sipariş dalı kesilebildi", siparisDali.length > 100);
  kontrol(
    "  ...'sipariş bulundu' EKRANDA yazıyor",
    /t\("siparisBulundu"\)/.test(siparisDali),
  );
  /**
   * ⚠ HANGİ ALANDAN BULUNDUĞU SÖYLENİR. Kullanıcı kodun neden eşleştiğini
   * bilmezse yanlış kutuyu paketleyebilir.
   */
  kontrol(
    "  ...ve HANGİ ALANDAN bulunduğu söyleniyor",
    /t\("siparisBulunduAlan"[\s\S]{0,120}alanAdi\[/.test(siparisDali),
  );
  /**
   * ⚠ ÜRÜN KİMLİĞİ SATIRLARI ÜRÜNE BAĞLI KALMALI. Gönderi numarasından
   * gelen okumada varyant YOKTUR; boş SKU/barkod satırı, olmayan bir
   * bilgiyi varmış gibi sunardı.
   */
  kontrol(
    "SKU/Firma SKU satırları ÜRÜN varsa çiziliyor",
    /\{sonuc\.urun \?\s*\(\s*<>[\s\S]{0,400}alanSku/.test(ekranKodu),
  );
  kontrol(
    "  ...barkod satırı da ürüne bağlı (opsiyonel erişim)",
    /sonuc\.urun\?\.barcode/.test(ekranKodu),
  );

  /**
   * ⚠ "BULUNAMADI" MESAJI BEŞİNCİ ALANI DA SAYIYOR. Dört alan yazan bir
   * cümle, gönderi numarasının aranmadığını söylerdi — metin sahip olmadığı
   * anlamı iddia etmiş olurdu.
   */
  const sozluk = JSON.parse(readFileSync("messages/tr.json", "utf8")) as {
    Okuma: Record<string, string>;
  };
  kontrol(
    "'bulunamadı' metni gönderi numarasını da sayıyor",
    /gönderi numarası/.test(sozluk.Okuma.bulunamadi),
    sozluk.Okuma.bulunamadi,
  );
  kontrol(
    "  ...ve artık 'dört alan' demiyor",
    !/dört alan/.test(sozluk.Okuma.bulunamadi),
  );
}

console.log("\n8) PAKETLEME İZİ (İŞ 2)");
// ===========================================================================
/**
 * "Paketlendi" tuşu siparişi `HAZIRLANIYOR` izine geçirir.
 *
 * ⚠ ŞEMA DEĞİŞMEDİ — K34a ile AYNI MERDİVEN BASAMAĞI: iz `AuditLog`ta,
 * ekrandaki işaret ondan TÜRETİLİYOR. Yeni durum sütunu açılmadı.
 *
 * ⚠ SİLME YOK: geri alma ikinci bir kayıt yazar, ilkini silmez.
 */
{
  const an = (dk: number) => new Date(Date.UTC(2026, 7, 23, 10, dk));
  const P = PAKETLENDI_EYLEMI;
  const G = PAKETLEME_GERI_ALINDI_EYLEMI;

  kontrol("iz yoksa hazırlanmıyor", !hazirlaniyorMu([]));
  kontrol("paketlendi izi varsa hazırlanıyor", hazirlaniyorMu([{ action: P, createdAt: an(1) }]));
  kontrol(
    "geri alınmışsa hazırlanmıyor",
    !hazirlaniyorMu([
      { action: P, createdAt: an(1) },
      { action: G, createdAt: an(2) },
    ]),
  );
  kontrol(
    "geri alınıp TEKRAR işaretlenmişse hazırlanıyor",
    hazirlaniyorMu([
      { action: P, createdAt: an(1) },
      { action: G, createdAt: an(2) },
      { action: P, createdAt: an(3) },
    ]),
  );
  /**
   * ⚠ AYRIMI GÖSTEREN ÖRNEK — SIRASI BOZUK GİRDİ. Uygulama "dizinin SON
   * elemanını al" diye yazılsaydı yukarıdaki testlerin hepsi geçer, bu
   * kırılırdı. Veritabanı sırasız dönebilir; ölçüt ZAMAN DAMGASI olmalı.
   */
  kontrol(
    "sıralama zaman damgasından, dizi sırasından DEĞİL",
    !hazirlaniyorMu([
      { action: G, createdAt: an(2) },
      { action: P, createdAt: an(1) },
    ]),
  );
  /**
   * ⚠ EŞİT ZAMANDA "GERİ ALINDI" KAZANIR — ve bu bir risk kararıdır:
   * yanlışlıkla "hazırlanıyor" göstermek birinin paketi hazır sanıp
   * ATLAMASINA yol açabilir; tersi en fazla bir kez fazladan baktırır.
   */
  kontrol(
    "eşit zaman damgasında GERİ ALMA kazanır (güvenli yön)",
    !hazirlaniyorMu([
      { action: P, createdAt: an(5) },
      { action: G, createdAt: an(5) },
    ]),
  );
  /**
   * ⚠ ÖRNEK AYRIMIN İKİ YAKASINI GÖSTERMELİ — MUTASYONLA ÖĞRENİLDİ.
   *
   * İlk hâli tek başına bir `SATIS_IPTAL` izi veriyordu ve cevabı `false`
   * bekliyordu. Yabancı eylemi SAYAN bir mutasyon yine `false` döndürüyordu
   * (çünkü "SATIS_IPTAL" zaten `PAKETLENDI` değil) — test YEŞİL KALDI.
   *
   * Ayrımı gösteren örnek şu: paketlendi izi VAR ve yabancı eylem ondan
   * DAHA YENİ. Doğru davranış yabancıyı yok sayıp "hazırlanıyor" demek;
   * sayan bir uygulama onu en yeni sanıp "hazırlanmıyor" derdi.
   */
  kontrol(
    "yabancı eylem izi karıştırmıyor (daha yeni olsa bile)",
    hazirlaniyorMu([
      { action: P, createdAt: an(1) },
      { action: "SATIS_IPTAL", createdAt: an(9) },
    ]),
  );
  kontrol(
    "  ...tek başına yabancı eylem hazırlanıyor demek değil",
    !hazirlaniyorMu([{ action: "SATIS_IPTAL", createdAt: an(9) }]),
  );

  /** Satış başına gruplama — üç sipariş tek sorgudan çözülür. */
  const kume = hazirlananSiparisler([
    { action: P, createdAt: an(1), targetId: "a" },
    { action: P, createdAt: an(1), targetId: "b" },
    { action: G, createdAt: an(2), targetId: "b" },
    { action: P, createdAt: an(1), targetId: null },
  ]);
  kontrol(
    "gruplama satış başına doğru çözüyor",
    kume.has("a") && !kume.has("b") && kume.size === 1,
    [...kume],
  );

  /**
   * ⚠ TUŞ SATIRIN YANINDA, OKUMANIN DEĞİL. Barkod ÜRÜNÜ söyler, SİPARİŞİ
   * söylemez: aynı ürün üç açık siparişte geçiyorsa hangisine paketlendiğini
   * yalnız kullanıcı bilir. Ölçüt, işaretin `saleId` ile çağrılması.
   */
  const siparisBloku = okuyucuKod.slice(
    okuyucuKod.indexOf("sonuc.siparisler.map"),
    okuyucuKod.indexOf("{paketNotu ?"),
  );
  kontrol("sipariş satırı bloğu kesilebildi", siparisBloku.length > 0);
  kontrol(
    "  ...tuş HER SATIRDA ve satırın siparişine bağlı",
    /onClick=\{\(\) => paketle\(s\)\}/.test(siparisBloku),
  );
  kontrol(
    "  ...hazırlanıyor işareti SUNUCUDAN gelen izden okunuyor",
    /s\.hazirlaniyor/.test(siparisBloku),
  );
  kontrol(
    "paketleme çağrısı satışa bağlanıyor (okumaya değil)",
    /paketlendiIsaretle\(siparis\.saleId/.test(okuyucuKod) &&
      /paketlemeyiGeriAl\(siparis\.saleId\)/.test(okuyucuKod),
  );

  /**
   * ⚠ KAPI DEĞİL. Tuş bir kontrol değil bir izdir; hiçbir akış
   * engellenmiyor, hiçbir uyarı çıkmıyor. (Uyarı dili yasağı 6. bölümde
   * dosyanın tamamı için zaten sınanıyor.)
   */
  kontrol(
    "paketleme bir KAPI değil (zorunlu alan yok)",
    !/\brequired\b/.test(okuyucuKod),
  );

  const paketEylem = readFileSync("src/app/okut/actions.ts", "utf8");
  kontrol(
    "iz AuditLog'a yazılıyor, satışa bağlı",
    /targetType: "Sale"/.test(paketEylem),
  );
  /**
   * ⚠ SİLME YOK. Geri alma, ilk kaydı silmek yerine TERS kayıt yazar.
   * `deleteMany`/`delete` görünürse ledger ilkesi çiğnenmiş demektir.
   */
  kontrol(
    "  ...geri alma SİLMİYOR, ters kayıt yazıyor",
    /paketlemeIziYaz\(PAKETLEME_GERI_ALINDI_EYLEMI/.test(paketEylem) &&
      !/auditLog\.delete/.test(paketEylem),
  );
  /** Detay yapılandırılmış — K34a ④ ile aynı kural. */
  kontrol(
    "  ...detail yapılandırılmış (serbest metin değil)",
    /detail: okuma \? JSON\.stringify\(okuma\) : null/.test(paketEylem),
  );

  /**
   * ⚠ ŞEMA DEĞİŞMEDİ. Karar: paketleme durumu `AuditLog`ta yaşar. Biri
   * yarın `Sale`'e bir durum sütunu eklerse burası kırmızı yanar.
   */
  const semaPaket = semaMetni();
  kontrol(
    "paketleme için yeni model/enum/sütun AÇILMADI",
    !/model Paketleme|enum Paketleme|hazirlaniyor\s+Boolean/.test(semaPaket),
  );

  kosanBolumler.push("paketleme-izi");
}

if (kosanBolumler.length !== BOLUM_SAYISI) {
  console.log(
    `KOŞUM YARIM KALDI — sonuç GEÇERSİZ (${kosanBolumler.length}/${BOLUM_SAYISI})`,
  );
  process.exit(1);
} else if (basarisiz === 0) {
  console.log(`\nTÜM KONTROLLER GEÇTİ (${calisan})`);
  process.exit(0);
} else {
  console.log(`\n${basarisiz} KONTROL BAŞARISIZ (${calisan} kontrol içinde)`);
  process.exit(1);
}
