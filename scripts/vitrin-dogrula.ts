import { readFileSync, readdirSync } from "node:fs";
import {
  ENGELLI_DURUMLAR,
  SATIR_DURUMLARI,
  VITRIN_SATIRLARI,
  kanalKaydiYokKosulu,
  vitrinAdresi,
  vitrinKosulu,
  vitrinSatiriCoz,
} from "../src/lib/vitrin-kutusu";
import { listelemeDurumu, kanalAdedi, satisaEngel, engelGrubu } from "../src/lib/kanal-listeleme";

/**
 * ============================================================================
 *  VİTRİN KUTUSU BEKÇİSİ (K121④, 01.09.2026)
 * ----------------------------------------------------------------------------
 *      npm run vitrin:dogrula
 *
 *  ⛔ NİYE: bu kutu PARA gösteriyor (₺249.636) ve iki yönde de sessizce
 *  bozulabilir — fazla gösterirse olmayan bir kayıp bildirir, eksik
 *  gösterirse rafta yatan sermaye görünmez kalır.
 *
 *  ⭐ ÇOĞU ÖLÇÜT SAF GÖVDE ÇAĞIRIYOR; kaynak taraması yalnız gövdeye
 *  taşınamayan iki şey için (yazma metodu yokluğu · yasak kelime).
 * ============================================================================
 */

const BOLUM_SAYISI = 5;
const kosanBolumler: string[] = [];
let gecen = 0;
let kalan = 0;

function yakin(ad: string, olculen: unknown, beklenen: unknown) {
  const a = JSON.stringify(olculen);
  const b = JSON.stringify(beklenen);
  if (a === b) gecen += 1;
  else {
    kalan += 1;
    console.log(`  HATA  ${ad}`);
    console.log(`      beklenen: ${b}`);
    console.log(`      ölçülen : ${a}`);
  }
}
const dogru = (ad: string, k: boolean) => yakin(ad, k, true);

console.log("\nVİTRİN KUTUSU BEKÇİSİ");
console.log("=".repeat(60));

// --- 1) SINIFLAMA ÖNCELİĞİ D→C→B→A, TEK GÖVDEDE --------------------------
console.log("\n1) sınıflama önceliği — en kısıtlayıcı kazanır");
{
  /**
   * ⛔ ÖRNEK VERİ AYRIMI GÖSTERİYOR: her kurgu BİRDEN ÇOK bayrak taşıyor.
   * Tek bayraklı örneklerle sıra hiç sınanmazdı — hangi dalın kazandığı
   * ancak çakışmada görünür.
   */
  yakin(
    "arşivli VE stoksuz → PASIF (arşiv kazanır)",
    listelemeDurumu({ archived: true, approved: true, onSale: true, quantity: 0 }),
    "PASIF",
  );
  yakin(
    "onaysız VE stoksuz → ONAY_BEKLIYOR",
    listelemeDurumu({ approved: false, quantity: 0, onSale: false }),
    "ONAY_BEKLIYOR",
  );
  yakin(
    "reddedildi ama onaylı görünüyor → ONAY_BEKLIYOR",
    listelemeDurumu({ approved: true, rejected: true, quantity: 5, onSale: true }),
    "ONAY_BEKLIYOR",
  );
  yakin(
    "kilitli → PASIF",
    listelemeDurumu({ locked: true, approved: true, quantity: 5, onSale: true }),
    "PASIF",
  );
  yakin(
    "kara listede → PASIF",
    listelemeDurumu({ blacklisted: true, approved: true, quantity: 5, onSale: true }),
    "PASIF",
  );
  yakin(
    "onaylı · arşivsiz · adet 0 → STOKSUZ",
    listelemeDurumu({ approved: true, quantity: 0, onSale: true }),
    "STOKSUZ",
  );
  /**
   * ⚠ `onSale` SON KAPI ve AYRI SINANIYOR: adedi olan ama vitrine
   * çıkarılmamış ürün de satılamaz. Bu kapı olmasaydı 1 ürün yanlışlıkla
   * "açık" sayılırdı (ölçüldü, 01.09.2026).
   */
  yakin(
    "adet VAR ama onSale false → STOKSUZ",
    listelemeDurumu({ approved: true, quantity: 5, onSale: false }),
    "STOKSUZ",
  );
  yakin(
    "hepsi tamam → ACIK",
    listelemeDurumu({ approved: true, quantity: 5, onSale: true }),
    "ACIK",
  );
  /** ⛔ ADET OKUNAMADIYSA HÜKÜM YOK — 0 sayılıp STOKSUZ denmez. */
  yakin(
    "adet alanı yok → BILINMIYOR",
    listelemeDurumu({ approved: true, onSale: true }),
    "BILINMIYOR",
  );
  yakin("adet null → null", kanalAdedi(null), null);
  yakin("adet 0 → 0 (yok DEĞİL)", kanalAdedi(0), 0);
}
kosanBolumler.push("sınıflama");

// --- 2) ENGEL VE GRUPLAMA -----------------------------------------------
console.log("\n2) engel ölçütü ve satır eşlemesi");
{
  /** ⛔ BILINMIYOR ENGEL DE DEĞİL AÇIK DA DEĞİL — sayıya girmez. */
  yakin("BILINMIYOR engel sayılmaz", satisaEngel("BILINMIYOR"), false);
  yakin("ACIK engel değil", satisaEngel("ACIK"), false);
  for (const d of ENGELLI_DURUMLAR) {
    dogru(`${d} engel sayılır`, satisaEngel(d));
  }
  yakin("STOKSUZ → STOK_KAPALI", engelGrubu("STOKSUZ"), "STOK_KAPALI");
  yakin("PASIF → PASIF", engelGrubu("PASIF"), "PASIF");
  /** ⚠ ONAY_BEKLIYOR pasifle AYNI satırda — yapılacak iş aynı. */
  yakin("ONAY_BEKLIYOR → PASIF satırı", engelGrubu("ONAY_BEKLIYOR"), "PASIF");
  yakin("YOK → LISTELENMEMIS", engelGrubu("YOK"), "LISTELENMEMIS");
  yakin("BILINMIYOR grubu yok", engelGrubu("BILINMIYOR"), null);
  yakin("ACIK grubu yok", engelGrubu("ACIK"), null);
}
kosanBolumler.push("engel");

// --- 3) SATIRLAR ENGELLİ DURUMLARI TAM KAPSIYOR --------------------------
console.log("\n3) satır toplamı = hepsi koşulu (küme düzeyinde)");
{
  /**
   * ⛔ ASIL DEĞİŞMEZ: üç satırın kapsadığı durumlar, "hepsi" koşulunun
   * kapsadığı durumlarla BİREBİR aynı olmalı. Ayrışsalardı kutuda satır
   * toplamı ile başlıktaki toplam çelişirdi — ve fark ancak biri elle
   * toplayınca görülürdü.
   */
  const satirlardan = new Set(
    VITRIN_SATIRLARI.flatMap((s) => [...SATIR_DURUMLARI[s]]),
  );
  const hepsinden = new Set<string>([...ENGELLI_DURUMLAR]);
  yakin(
    "satırların kapsadığı durum kümesi = engelli durumlar",
    [...satirlardan].sort(),
    [...hepsinden].sort(),
  );
  /** ⚠ VE HİÇBİR DURUM İKİ SATIRDA OLAMAZ — yoksa toplam şişer. */
  const tumu = VITRIN_SATIRLARI.flatMap((s) => [...SATIR_DURUMLARI[s]]);
  yakin("hiçbir durum iki satırda değil", tumu.length, satirlardan.size);
  /** ⛔ KAYIT_YOK SAYILAN SATIRLARDA OLMAMALI — toplama girmiyor. */
  dogru(
    "KAYIT_YOK sayılan satırlarda YOK",
    !(VITRIN_SATIRLARI as readonly string[]).includes("KAYIT_YOK"),
  );
  yakin("KAYIT_YOK adresten çözülüyor", vitrinSatiriCoz("KAYIT_YOK"), "KAYIT_YOK");
  yakin("tanınmayan değer hepsiye düşer", vitrinSatiriCoz("saçma"), undefined);
  yakin("adres gövdeden üretiliyor", vitrinAdresi("PASIF"), "/stok?vitrin=PASIF");
  yakin("satırsız adres hepsi", vitrinAdresi(), "/stok?vitrin=hepsi");
}
kosanBolumler.push("satır kapsamı");

// --- 4) KOŞUL GÖVDESİ — KAYIT_YOK SAYIYA GİRMİYOR ------------------------
console.log("\n4) koşul gövdesi — kanal kaydı yok sayıya girmez");
{
  const k = vitrinKosulu({ kanalHesabiId: "h1", variantIdleri: ["v1"] });
  const metin = JSON.stringify(k);
  /**
   * ⛔ `none` KOŞULU SAYILAN SORGUDA OLMAMALI. İlk yazımda vardı ve kutu
   * 23 yerine 32 gösterdi; ölçüldü — kaydı olmayan 9 varyantın 4'ü aslında
   * kanalda VAR ve satışa açık.
   */
  dogru("sayılan koşulda `none` YOK", !metin.includes('"none"'));
  dogru("sayılan koşulda `some` VAR", metin.includes('"some"'));
  const ky = JSON.stringify(kanalKaydiYokKosulu({ kanalHesabiId: "h1", variantIdleri: ["v1"] }));
  dogru("kayıt-yok koşulu `none` kullanıyor", ky.includes('"none"'));
  dogru("kayıt-yok koşulu durum SÜZMÜYOR", !ky.includes("listelemeDurumu"));
}
kosanBolumler.push("koşul gövdesi");

// --- 5) TY İSTEMCİSİNDE YAZMA YOK ---------------------------------------
console.log("\n5) pazaryerine yazma yolu YOK");
{
  /**
   * ⛔ KAPSAM DIŞI ŞARTININ KOŞAN KARŞILIĞI (kullanıcı şartı 01.09.2026):
   * stok senkronu yok. Bu ölçüt kaynağa bakmak ZORUNDA — "bir metodun
   * OLMADIĞI" saf gövde çağrısıyla ölçülemez.
   *
   * ⚠ YORUMSUZ KODDA ARANIR: bir yasağı ANLATAN yorum, o yasağı çiğnemiş
   * sayılmaz. _(Anayasa: yeni ölçüt yorumsuz kodda arar.)_
   */
  const yorumsuz = (m: string) =>
    m.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

  const istemci = yorumsuz(readFileSync("scripts/ty/istemci.ts", "utf8"));
  for (const fiil of ['"POST"', '"PUT"', '"PATCH"', '"DELETE"']) {
    dogru(`istemcide ${fiil} YOK`, !istemci.includes(fiil));
  }
  dogru("istemcide apiPost/apiPut gibi bir gövde YOK", !/export async function api(Post|Put|Patch|Delete)/i.test(istemci));

  /** Yazma gövdesi de pazaryerine hiçbir şey göndermemeli. */
  const yazici = yorumsuz(readFileSync("src/lib/kanal-listeleme-yaz.ts", "utf8"));
  dogru("yazıcıda fetch YOK", !/\bfetch\s*\(/.test(yazici));
  dogru("yazıcıda apigw adresi YOK", !yazici.includes("apigw."));
  /** ⛔ VE YALNIZ ÜÇ ALAN YAZILIR — dördüncüsü sızarsa başka kaynakla çakışır. */
  const yazilanAlanlar = [...yazici.matchAll(/data:\s*\{([^}]*)\}/g)]
    .flatMap((m) => [...m[1]!.matchAll(/(\w+):/g)].map((x) => x[1]!));
  const izinli = new Set(["listelemeDurumu", "kanalAdet", "kanalOlcumAt"]);
  const fazla = [...new Set(yazilanAlanlar)].filter((a) => !izinli.has(a));
  yakin("yalnız üç alan yazılıyor", fazla, []);
}
kosanBolumler.push("yazma yok");

console.log("\n" + "=".repeat(60));
if (kosanBolumler.length !== BOLUM_SAYISI) {
  console.log(
    `KOŞUM YARIM KALDI — ${kosanBolumler.length}/${BOLUM_SAYISI} bölüm. Sonuç GEÇERSİZ.`,
  );
  process.exit(1);
}
if (kalan === 0) {
  console.log(`OK  ${gecen}/${gecen} ölçüt geçti (${BOLUM_SAYISI} bölüm)`);
  process.exit(0);
}
console.log(`${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrolden)`);
process.exit(1);
