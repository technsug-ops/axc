import { readFileSync } from "node:fs";

import {
  CEKIRDEK,
  KALEM_DEGIL,
  SATIR_KIMLIGI,
  cakismaCaresi,
  kalemMi,
  sonrakiKodlar,
} from "./pano-kimlik";

/**
 * ============================================================================
 *  PANO BEKÇİSİ — KİMLİK TEKİLDİR (K10)
 * ----------------------------------------------------------------------------
 *  ⚠ NİYE VAR: pano kodları ELLE veriliyordu ve **dört kez** çakıştı.
 *  20.08'de iki satır birden `H6`; 24.08'de iki satır birden `K42`;
 *  25.08'de gelen komut `K42-RAF` adını taşıyordu — `K42` çoktan başka bir
 *  kaleme aitti; ve aynı gün ölçüldü ki `K41` **üç ayrı işi** birden
 *  adlandırıyor. _"K41'e bak"_ demek üç satırdan hangisi belirsizdi.
 *
 *  Anayasa: _"kimlik TEKİLDİR. Aciliyet ayrı bir sütunda ya da metinde
 *  yaşar, kodun içinde değil. Aynı kimliği ikinci kez kullanmak, panoyu
 *  taranamaz hâle getirir."_
 *
 *  ⚠ ÖLÇÜT ELLE TUTULAN LİSTE DEĞİL, DESEN YASAĞI (23.08 dersi). Burada
 *  hiçbir kod listesi yok: kimlikler dosyaların KENDİSİNDEN okunuyor. Yarın
 *  açılan kalem de kendiliğinden taranır; kimsenin listeye eklemeyi
 *  hatırlaması gerekmez.
 *
 *  ⚠ İŞARET KİMLİĞİN PARÇASI DEĞİLDİR — bu yüzden kimlik NORMALLEŞTİRİLİR.
 *  `H10♻` · `K41①` · `K42-RAF` üçü de sırasıyla `H10` · `K41` · `K42`dir;
 *  süs (simge, ok, açıklama eki) kimliği çoğaltmaz. Normalleştirme
 *  olmasaydı `K42-RAF` temiz görünür ve bekçi tam da yakalaması gereken
 *  vakayı kaçırırdı.
 *
 *  ⚠ KÜÇÜK HARF SONEKİ KİMLİĞİN PARÇASIDIR, SÜS DEĞİL. Depoda zaten
 *  kullanılan bir düzen: `K34a` · `K36a` · `K36b` · `K48b` · `K14t`.
 *  Bunlar ayrı kalemler ve ayrı sayılırlar.
 *
 *  ⚠ ÇAKIŞMA **DOSYA İÇİNDE** ARANIR, DOSYALAR ARASINDA DEĞİL. Bir kalemin
 *  kapanmış parçası arşivde, açık kalanı panoda durabilir (`K18` · `K6` bugün
 *  tam olarak öyle) — bu bir hata değil, kalemin iki hâli. Hata, **aynı
 *  dosyada iki AYRI işin aynı kodu taşımasıdır.**
 * ============================================================================
 */

const DOSYALAR = ["BEKLEYENLER.md", "ARSIV.md"];

/**
 * KOD GİBİ GÖRÜNEN AMA KALEM OLMAYAN SATIR BAŞLIKLARI — ADIYLA BEYAN.
 *
 * ⚠ NİYE LİSTE VAR: yapı ölçütü DENENDİ ve YETMEDİ. _"Kalem satırının ikinci
 * hücresi kalındır"_ hipotezi ölçüldü — 50 satır uyuyor ama **10 GERÇEK
 * KALEM uymuyor** (emojiyle başlayanlar: `A3` · `K24` · `K26` · `H22` ·
 * `K27` …). O ölçütle gerçek kalemler elenirdi. Kalan tek dürüst yol,
 * istisnayı ADIYLA beyan etmek — `yetki-bekci.ts` düzeni: beyan edilmeyen
 * sapma HATA sayılır.
 *
 * ⚠ VE BEYAN ÇÜRÜMEZ: her satırın dosyada hâlâ bulunduğu 1b'de sınanıyor.
 */


type Kayit = { dosya: string; satir: number; ham: string };

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

/** Bir dosyanın satır kimliklerini çekirdeğe indirger. */
function kimlikleriOku(dosya: string): Map<string, Kayit[]> {
  const harita = new Map<string, Kayit[]>();
  const satirlar = readFileSync(dosya, "utf8").split(/\r?\n/);

  satirlar.forEach((satir, i) => {
    const m = satir.match(SATIR_KIMLIGI);
    if (!m) return;
    /**
     * ⚠ `H12/H13` GİBİ ÇİFT ETİKET İKİ KİMLİK SAYILIR. Tek parça saysaydık
     * `H13` başka bir satırda yeniden kullanılabilir ve görünmezdi.
     */
    for (const parca of m[1].split("/")) {
      const c = parca.trim().match(CEKIRDEK);
      /**
       * ⚠ KOD GİBİ DURMAYAN ETİKET KİMLİK DEĞİLDİR. Arşivde tablo satırları
       * betimleyici başlık da taşıyor ("Başabaş", "Fiorino…"); onları kimlik
       * saymak, olmayan bir çakışma üretirdi.
       */
      if (!c) continue;
      /** ⚠ BEYAN EDİLMİŞ İSTİSNA — kimlik sayılmaz, ama beyanı 1b'de sınanır. */
      if (!kalemMi(dosya, parca)) continue;
      const cekirdek = c[1] + c[2] + c[3];
      if (!harita.has(cekirdek)) harita.set(cekirdek, []);
      harita.get(cekirdek)!.push({ dosya, satir: i + 1, ham: parca.trim() });
    }
  });

  return harita;
}

console.log("\n1) KİMLİK TEKİLLİĞİ — dosya içinde çakışma YOK");

const tumu = new Map<string, Kayit[]>();

/**
 * ⛔ ÖNERİ ÖNCE HESAPLANIR — ÇAKIŞMA MESAJINDA KULLANILSIN DİYE.
 * Eski hâlde sıradaki boş kod bölüm 2'de, yani HATADAN SONRA yazılıyordu;
 * kırmızı yanan kişi çareyi aşağıda aramak zorundaydı. Bekçi yalnız "hayır"
 * demez, "ne yap" der.
 */
const tumKimlikler: string[] = [];
for (const dosya of DOSYALAR) {
  for (const k of kimlikleriOku(dosya).keys()) tumKimlikler.push(k);
}
const SONRAKI = sonrakiKodlar(tumKimlikler);

for (const dosya of DOSYALAR) {
  const harita = kimlikleriOku(dosya);

  /**
   * ⚠ ÖLÇÜM BOŞ ÇIKARSA BU BİR HÜKÜM DEĞİL, OKUYAMAMADIR. Desen bozulur ya
   * da dosya adı değişirse harita boşalır ve "hiç çakışma yok" YEŞİL yanar —
   * kontrolün en tehlikeli yalancı yeşili. (Anayasa: _"boş sonuç ile temiz
   * sonucu ayırt edemeyen denetim, denetim değildir."_)
   */
  kontrol(`  ${dosya} okundu ve kimlik bulundu`, harita.size > 0, harita.size);

  const cakisanlar = [...harita].filter(([, y]) => y.length > 1);
  kontrol(
    `  ${dosya} — çakışma yok`,
    cakisanlar.length === 0,
    cakisanlar.map(
      ([k, y]) =>
        `${y.map((x) => `${x.ham}@${x.satir}`).join(", ")} → ${cakismaCaresi(k, SONRAKI)}`,
    ),
  );

  for (const [k, y] of harita) {
    if (!tumu.has(k)) tumu.set(k, []);
    tumu.get(k)!.push(...y);
  }
}

// --- 1b) BEYAN ÇÜRÜMEDİ Mİ ------------------------------------------------
/**
 * ⚠ BAKIMI UNUTULAN LİSTE, KORUDUĞUNU SANDIĞI ŞEYİ KORUMAZ. Beyan edilen
 * satır dosyadan kalkarsa liste sessizce eskir; o yüzden beyanın kendisi
 * de sınanıyor.
 */
console.log("\n1b) İSTİSNA BEYANI ÇÜRÜMEDİ Mİ");
for (const x of KALEM_DEGIL) {
  const bulundu = readFileSync(x.dosya, "utf8")
    .split(/\r?\n/)
    .some((l) => {
      const m = l.match(SATIR_KIMLIGI);
      return m !== null && m[1].trim() === x.ham;
    });
  kontrol(`  ${x.dosya} → ${x.ham} beyanı hâlâ geçerli`, bulundu, x.sebep);
}

// --- 2) SIRADAKİ BOŞ KOD --------------------------------------------------
/**
 * ⚠ BEKÇİ YALNIZ "HAYIR" DEMEZ, "ŞUNU KULLAN" DER. Kod ataması mekanik
 * yapılmazsa çakışma tekrar eder: insan bir sonraki boş kodu gözüyle arar,
 * ve o göz dört kez yanıldı.
 */
console.log("\n2) SIRADAKİ BOŞ KOD");

/**
 * ⛔ AYNI GÖVDE — `npm run pano:sonraki` de bunu çağırıyor. İki yerde iki
 * hesap olsaydı bekçinin önerdiği kod ile komutun verdiği kod bir gün
 * ayrışırdı; o gün ikisine de güvenilmezdi.
 */
kontrol("en az bir önek bulundu", SONRAKI.size > 0, [...SONRAKI.keys()]);
for (const [onek, kod] of SONRAKI) {
  console.log(`     ${onek}  →  SIRADAKİ ${kod}`);
}

// --- 3) KOD ATAMA GÖVDESİ — DEĞER TESTİ ---------------------------------
console.log("\n3) kod atama gövdesi");
{
  /**
   * ⛔ NİYE DEĞER TESTİ: bölüm 2 sıradaki kodu EKRANA BASIYOR ama basılanın
   * DOĞRU olduğunu sınamıyordu. Yanlış bir öneri, çakışmayı çözmek yerine
   * bir sonraki turda yenisini üretirdi.
   * _(Anayasa: saf hesap katmanı desen tarayan bekçiye muhtaç olmaz —
   * gövde ÇAĞRILIR, değeri ölçülür.)_
   */
  /**
   * ⚠ SIRA BİLEREK BOZUK: en büyük kod dizinin SONUNDA DEĞİL.
   * İlk yazımda `["K1","K127",…]` idi ve "en büyük yerine SONUNCUYU al"
   * mutasyonu YEŞİL geçti — çünkü o veride sonuncu zaten en büyüktü.
   * Kaçan mutasyon bekçinin değil, ÖRNEK VERİNİN kusuruydu.
   * _(Anayasa: örnek veri ayrımın iki yakasını göstermeli.)_
   */
  const m = sonrakiKodlar(["K127", "K1", "K90", "H3", "H1", "A3", "A1"]);
  kontrol("K önekinin sıradakisi", m.get("K") === "K128", m.get("K"));
  kontrol("H önekinin sıradakisi", m.get("H") === "H4", m.get("H"));
  kontrol("A önekinin sıradakisi", m.get("A") === "A4", m.get("A"));
  /**
   * ⛔ BOŞLUK YENİDEN KULLANILMAZ — EN BÜYÜK + 1. `K2` boşsa bile verilmez:
   * eski bir commit mesajında `K2` geçiyorsa, o kodu ikinci bir işe vermek
   * geçmişi yalancı yapar.
   */
  const bosluklu = sonrakiKodlar(["K1", "K5"]);
  kontrol("boşluk YENİDEN KULLANILMIYOR", bosluklu.get("K") === "K6", bosluklu.get("K"));
  /** ⚠ SON EK KİMLİĞİN PARÇASI DEĞİL: `K11a` ile `K11` aynı sayıdır. */
  kontrol("son ek harfi sayıyı bozmuyor", sonrakiKodlar(["K11a"]).get("K") === "K12");
  /**
   * ⛔ BOŞ GİRDİ BOŞ DÖNER — uydurma bir "K1" basmaz. `pano:sonraki` bu
   * boşluğu görüp "okunamadı" diyor; gövde kendiliğinden bir sayı ÜRETİRSE
   * o kapı işlevsiz kalırdı.
   */
  kontrol("boş girdi boş döner", sonrakiKodlar([]).size === 0);
  kontrol("kod olmayan dize atlanır", sonrakiKodlar(["Başabaş"]).size === 0);

  /** ⛔ İSTİSNA DOSYAYA BAĞLI: aynı metin başka dosyada kimlik OLABİLİR. */
  kontrol("beyanlı istisna kimlik sayılmaz", !kalemMi("ARSIV.md", "N11"));
  kontrol("  ...ama yalnız O DOSYADA", kalemMi("BEKLEYENLER.md", "N11"));
  kontrol("gerçek kimlik elenmez", kalemMi("ARSIV.md", "K50"));

  /**
   * ⛔ ÇARE İKİ YOLU DA SÖYLER. Çakışmanın iki sebebi var ve çareleri
   * farklı; mesaj hangisi olduğunu okuyana bırakmaz.
   */
  const care = cakismaCaresi("K50", m);
  kontrol("çare ikinci fazı anlatıyor", care.includes("②"));
  kontrol("çare sıradaki kodu VERİYOR", care.includes("K128"));
}

console.log("");
console.log(`  toplam kimlik: ${tumu.size}`);

console.log("");
console.log("=".repeat(70));
if (kalan === 0) console.log(`TÜM KONTROLLER GEÇTİ (${gecen})`);
else {
  console.log(`${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrolden)`);
  process.exitCode = 1;
}
console.log("");
