import {
  kalanMaliyetOzeti,
  partilerinParaBirimi,
  partiToplami,
  siradakiPartiSirasi,
} from "../src/lib/kart-partileri";
import { kaynakOku } from "./kaynak-oku";

/**
 * ============================================================================
 *  KART PARTİ PANELİ BEKÇİSİ (K115, 31.08.2026)
 * ----------------------------------------------------------------------------
 *      npm run kart-partileri:dogrula
 *
 *  ⛔ NİYE: bu gövde kartta PARA basıyor. İki yönde de pahalı —
 *    · eksik toplarsa   → kullanıcı elindeki malı olduğundan az sanır
 *    · eksiği gizlerse  → eksik bir rakam TAM görünür ve sorgulanmaz
 *
 *  ⭐ KAYNAK TARAMASI YOK — saf gövde ÇAĞRILIP değeri ölçülüyor.
 * ============================================================================
 */

const BOLUM_SAYISI = 7;
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

console.log("\nKART PARTİ PANELİ BEKÇİSİ");
console.log("=".repeat(60));

// --- 1) TOPLAM — TEMİZ HÂL --------------------------------------------
console.log("\n1) toplam — hepsi ölçülebilir");
{
  yakin(
    "boş liste",
    partiToplami([], "TRY"),
    { adet: 0, tutar: 0, olculemeyen: 0 },
  );
  yakin(
    "tek parti",
    partiToplami([{ kalanAdet: 3, birimMaliyet: 100, paraBirimi: "TRY" }], "TRY"),
    { adet: 3, tutar: 300, olculemeyen: 0 },
  );
  /**
   * ⚠ ÖRNEK VERİ AYRIMI GÖSTERİYOR: iki partinin ADEDİ de MALİYETİ de
   * farklı. Aynı olsaydı "adet × maliyet" yerine "adet + maliyet" yazan bir
   * mutasyon bile aynı sayıyı üretebilirdi.
   */
  yakin(
    "iki parti — farklı adet, farklı maliyet",
    partiToplami(
      [
        { kalanAdet: 2, birimMaliyet: 100, paraBirimi: "TRY" },
        { kalanAdet: 5, birimMaliyet: 30, paraBirimi: "TRY" },
      ],
      "TRY",
    ),
    { adet: 7, tutar: 350, olculemeyen: 0 },
  );
  /** Birimi yazılmamış eski kayıt SEÇİLEN birim sayılır — tutara girer. */
  yakin(
    "para birimi null → seçilen birim sayılır",
    partiToplami([{ kalanAdet: 2, birimMaliyet: 50, paraBirimi: null }], "TRY"),
    { adet: 2, tutar: 100, olculemeyen: 0 },
  );
}
kosanBolumler.push("temiz toplam");

// --- 2) ÖLÇÜLEMEYEN — ADET GİRER, TUTAR GİRMEZ ------------------------
console.log("\n2) ölçülemeyen parti — adet girer, tutar girmez");
{
  /**
   * ⛔ ASIL KURAL: maliyeti bilinmeyen parti tutara GİRMEZ ama ADEDİ girer.
   * Adedi de düşürmek, elde duran malı yok saymak olurdu.
   */
  yakin(
    "maliyeti bilinmeyen — adet girer, tutar girmez, sayılır",
    partiToplami(
      [
        { kalanAdet: 2, birimMaliyet: 100, paraBirimi: "TRY" },
        { kalanAdet: 5, birimMaliyet: null, paraBirimi: "TRY" },
      ],
      "TRY",
    ),
    { adet: 7, tutar: 200, olculemeyen: 1 },
  );
  /**
   * ⚠ KUR ÇEVRİLMEZ (anayasa: para birimi VERİDEN gelir). EUR partisi
   * tutara girmez ve dışarıda kaldığı SAYILIR.
   */
  yakin(
    "başka para birimi — çevrilmez, sayılır",
    partiToplami(
      [
        { kalanAdet: 2, birimMaliyet: 100, paraBirimi: "TRY" },
        { kalanAdet: 4, birimMaliyet: 10, paraBirimi: "EUR" },
      ],
      "TRY",
    ),
    { adet: 6, tutar: 200, olculemeyen: 1 },
  );
  yakin(
    "iki sebep birden — ikisi de sayılır",
    partiToplami(
      [
        { kalanAdet: 1, birimMaliyet: 100, paraBirimi: "TRY" },
        { kalanAdet: 2, birimMaliyet: null, paraBirimi: "TRY" },
        { kalanAdet: 3, birimMaliyet: 10, paraBirimi: "EUR" },
      ],
      "TRY",
    ),
    { adet: 6, tutar: 100, olculemeyen: 2 },
  );
  /**
   * ⚠ HİÇBİRİ ÖLÇÜLEMİYORSA TUTAR SIFIR AMA "SIFIR TL MAL VAR" DEMEK
   * DEĞİL — `olculemeyen` o cümleyi kurmayı engelleyen tek şey.
   */
  yakin(
    "hepsi ölçülemez → tutar 0 ama olculemeyen dolu",
    partiToplami(
      [
        { kalanAdet: 2, birimMaliyet: null, paraBirimi: "TRY" },
        { kalanAdet: 3, birimMaliyet: null, paraBirimi: null },
      ],
      "TRY",
    ),
    { adet: 5, tutar: 0, olculemeyen: 2 },
  );
}
kosanBolumler.push("ölçülemeyen");

// --- 3) SEÇİLEN BİRİM EUR OLDUĞUNDA -----------------------------------
console.log("\n3) seçilen birim EUR — süzgeç ters yönde de çalışır");
{
  /**
   * ⚠ AYRIMIN İKİ YAKASI: üstteki bölümde EUR dışarıda kalıyordu. Yalnız o
   * yazılsaydı "EUR hep elenir" diye kodlanmış bir mutasyon YEŞİL kalırdı.
   */
  yakin(
    "EUR seçiliyken TRY elenir, EUR girer",
    partiToplami(
      [
        { kalanAdet: 2, birimMaliyet: 100, paraBirimi: "TRY" },
        { kalanAdet: 4, birimMaliyet: 10, paraBirimi: "EUR" },
      ],
      "EUR",
    ),
    { adet: 6, tutar: 40, olculemeyen: 1 },
  );
}
kosanBolumler.push("ters yön");

// --- 4) SIRADAKİ ROZETİ ------------------------------------------------
console.log("\n4) sıradaki rozeti");
{
  yakin("boş listede rozet YOK", siradakiPartiSirasi(0), -1);
  yakin("tek partide ilk satır", siradakiPartiSirasi(1), 0);
  yakin("çok partide yine ilk satır", siradakiPartiSirasi(5), 0);
}
kosanBolumler.push("sıradaki");

// --- 5) KALAN STOĞUN MALİYET ÖZETİ (stok sayfası, 04.10.2026) ----------
console.log("\n5) kalan maliyet özeti — stok sayfasındaki «Mevcut stok» kutusu");
{
  const T = "TRY" as const;
  yakin("tek parti → birim maliyet o partinin", kalanMaliyetOzeti([{ kalanAdet: 2, birimMaliyet: 1069.49, paraBirimi: T }], T),
    { adet: 2, tutar: 2138.98, olculemeyen: 0, partiSayisi: 1, olculenAdet: 2, tekBirim: 1069.49, ortalama: 1069.49 });
  yakin("iki parti AYNI fiyat → yine tek birim", kalanMaliyetOzeti([{ kalanAdet: 1, birimMaliyet: 100, paraBirimi: T }, { kalanAdet: 2, birimMaliyet: 100, paraBirimi: T }], T).tekBirim, 100);
  yakin("iki parti FARKLI fiyat → tek birim YOK, adet ağırlıklı ortalama (1×100 + 3×200)/4 = 175",
    kalanMaliyetOzeti([{ kalanAdet: 1, birimMaliyet: 100, paraBirimi: T }, { kalanAdet: 3, birimMaliyet: 200, paraBirimi: T }], T),
    { adet: 4, tutar: 700, olculemeyen: 0, partiSayisi: 2, olculenAdet: 4, tekBirim: null, ortalama: 175 });
  yakin("kuruş farkı da FARKTIR (100,00 ↔ 100,01 → tek birim yok)",
    kalanMaliyetOzeti([{ kalanAdet: 1, birimMaliyet: 100, paraBirimi: T }, { kalanAdet: 1, birimMaliyet: 100.01, paraBirimi: T }], T).tekBirim, null);
  yakin("maliyeti BİLİNMEYEN adet paydaya GİRMEZ (ortalama 200, 120 değil) ve sayılır",
    kalanMaliyetOzeti([{ kalanAdet: 2, birimMaliyet: null, paraBirimi: null }, { kalanAdet: 3, birimMaliyet: 200, paraBirimi: T }], T),
    { adet: 5, tutar: 600, olculemeyen: 1, partiSayisi: 2, olculenAdet: 3, tekBirim: 200, ortalama: 200 });
  yakin("BAŞKA para birimindeki parti ortalamaya girmez (kur çevrilmez)",
    kalanMaliyetOzeti([{ kalanAdet: 1, birimMaliyet: 100, paraBirimi: "EUR" }, { kalanAdet: 1, birimMaliyet: 200, paraBirimi: T }], T),
    { adet: 2, tutar: 200, olculemeyen: 1, partiSayisi: 2, olculenAdet: 1, tekBirim: 200, ortalama: 200 });
  yakin("hepsi bilinmiyorsa ortalama ve tek birim YOK (sıfır uydurulmaz)",
    kalanMaliyetOzeti([{ kalanAdet: 2, birimMaliyet: null, paraBirimi: null }], T),
    { adet: 2, tutar: 0, olculemeyen: 1, partiSayisi: 1, olculenAdet: 0, tekBirim: null, ortalama: null });
  yakin("açık parti yok", kalanMaliyetOzeti([], T),
    { adet: 0, tutar: 0, olculemeyen: 0, partiSayisi: 0, olculenAdet: 0, tekBirim: null, ortalama: null });
}
kosanBolumler.push("kalan özeti");

// --- 6) ÖZETİN PARA BİRİMİ ------------------------------------------------
console.log("\n6) özetin para birimi");
{
  yakin("parti yoksa TRY", partilerinParaBirimi([]), "TRY");
  yakin("en çok geçen birim", partilerinParaBirimi([
    { kalanAdet: 1, birimMaliyet: 1, paraBirimi: "EUR" }, { kalanAdet: 1, birimMaliyet: 1, paraBirimi: "EUR" }, { kalanAdet: 1, birimMaliyet: 1, paraBirimi: "TRY" }]), "EUR");
  yakin("maliyeti bilinmeyen partinin birimi SAYILMAZ", partilerinParaBirimi([
    { kalanAdet: 1, birimMaliyet: null, paraBirimi: "EUR" }, { kalanAdet: 1, birimMaliyet: null, paraBirimi: "EUR" }, { kalanAdet: 1, birimMaliyet: 5, paraBirimi: "TRY" }]), "TRY");
}
kosanBolumler.push("para birimi");

// --- 7) STOK SAYFASI BAĞI (kaynak — kullanım bloğu) ------------------------
console.log("\n7) stok sayfası: bağlantı + izin kapısı");
{
  const yorumsuz = (k: string) => k.replace(/\/\*[\s\S]*?\*\//g, "").split("\n").filter((x) => !x.trim().startsWith("//")).join("\n");
  const stok = yorumsuz(kaynakOku("src/app/stok/[variantId]/page.tsx"));
  const kart = yorumsuz(kaynakOku("src/app/kart/[variantId]/page.tsx"));
  yakin("maliyet izni urun.gor'dan okunur (kartla aynı izin)", stok.includes('const maliyetGorur = await izinVarMi("urun.gor");'), true);
  yakin("partiler YALNIZ izin varsa okunur", stok.includes("maliyetGorur ? acikPartilerToplu(prisma, [variantId]) : Promise.resolve(null)"), true);
  yakin("özet kartın gövdesinden: kalanMaliyetOzeti(partiler, kalanPara)", stok.includes("const kalan = kalanMaliyetOzeti(partiler, kalanPara);"), true);
  yakin("izinli dal: kutu kartın parti çapasına bağlanır",
    /\{maliyetGorur \? \(\s*<Link\s+href=\{`\/kart\/\$\{varyant\.id\}#\$\{KART_PARTI_CAPASI\}`\}/.test(stok), true);
  const dalBas = stok.indexOf("{maliyetGorur ? (");
  /* Dış dalın «değilse» kolu: izinli dal `</Link>` ile biter — içteki üçlülere takılmamak için oradan aranır. */
  const linkSonu = dalBas >= 0 ? stok.indexOf("</Link>", dalBas) : -1;
  const izinsizBas = linkSonu >= 0 ? stok.indexOf(") : (", linkSonu) : -1;
  const izinsizSon = izinsizBas >= 0 ? stok.indexOf("</Card>", izinsizBas) : -1;
  const izinsizDal = izinsizBas >= 0 && izinsizSon > izinsizBas ? stok.slice(izinsizBas, izinsizSon) : "";
  yakin("izinsiz dal bulundu ve stok rakamını çizer", izinsizDal.includes('{t("mevcutStok")}') && izinsizDal.includes("{stok}"), true);
  yakin("izinsiz dal: maliyet ÇİZİLMEZ, bağlantı YOK", !/kalan\.|<Link|bicim\.para/.test(izinsizDal), true);
  yakin("kartın parti bölümü çapayı taşır", /<Bolum baslik=\{t\("partiBaslik"\)\} ikon=\{Layers\} id=\{KART_PARTI_CAPASI\}>/.test(kart), true);
  yakin("Bolum çapayı section'a yazar", kart.includes('<section id={id} className="scroll-mt-20 space-y-2">'), true);
}
kosanBolumler.push("stok bağı");

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
