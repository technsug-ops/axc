import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import {
  DONEM_ISRAR_SEBEPLERI,
  donemAnahtari,
  donemIsrariniCevir,
  donemKorumasi,
} from "../src/lib/donem-korumasi";
import { betikDonemKarari, donemIstisnaIzi } from "../src/lib/donem-kapisi";
import { israrGecerliMi } from "../src/lib/sayim-korumasi";

/**
 * ============================================================================
 *  DÖNEM KORUMASI BEKÇİSİ (K108, 31.08.2026)
 * ----------------------------------------------------------------------------
 *  ⭐ ÖLÇÜTLERİN ÇOĞU SAF GÖVDEYİ ÇAĞIRIYOR — desen aranmıyor. Kaynak taraması
 *  yalnız BAĞLANTI için: bir gövdenin çağrıldığını saf test gösteremez.
 *
 *  ⛔ VE EN ÖNEMLİ ÖLÇÜT "İMPORT VAR ÇAĞRI YOK" — sayım korumasındaki ders.
 *  Bir dosyanın kapıyı İÇERİ ALMASI, onu ÇAĞIRDIĞINI göstermez; içeri alıp
 *  hiç çağırmayan bir yol "korunuyor" görünür ve sessizce açık kalır.
 * ============================================================================
 */

const BOLUM_SAYISI = 5;
const kosanBolumler: string[] = [];
let gecen = 0;
let kalan = 0;

function kontrol(ad: string, sonuc: boolean) {
  if (sonuc) {
    gecen += 1;
    console.log(`  OK    ${ad}`);
  } else {
    kalan += 1;
    console.log(`  HATA  ${ad}`);
  }
}

/** Yorumları siler — bir yasağı ANLATAN yorum, onu ÇİĞNEMİŞ sayılmaz. */
function yorumsuz(kod: string): string {
  const blok = new RegExp("/" + String.fromCharCode(92) + "*[^]*?" + String.fromCharCode(92) + "*/", "g");
  const satir = new RegExp("//[^" + String.fromCharCode(92) + "n]*", "g");
  return kod.replace(blok, "").replace(satir, "");
}

function dosyalar(kok: string): string[] {
  const cikti: string[] = [];
  for (const g of readdirSync(kok, { withFileTypes: true })) {
    const yol = join(kok, g.name);
    if (g.isDirectory()) cikti.push(...dosyalar(yol));
    else if (/\.tsx?$/.test(g.name)) cikti.push(yol);
  }
  return cikti;
}

console.log("");
console.log("DÖNEM KORUMASI BEKÇİSİ (K108)");

// ═══════════════════════════════════════════════════════════════════════
console.log("");
console.log("§1 SAF KURAL — kapalı dönem duraksatır, açık dönem serbest");
// ═══════════════════════════════════════════════════════════════════════
{
  const kapali = new Set([donemAnahtari(2026, 7)]);

  kontrol(
    "kapalı döneme yazım DURAKSIYOR",
    donemKorumasi({ isTarihi: { yil: 2026, ay: 7 }, kapaliDonemler: kapali })
      .sonuc === "DURAKSA",
  );
  kontrol(
    "açık döneme yazım SERBEST",
    donemKorumasi({ isTarihi: { yil: 2026, ay: 8 }, kapaliDonemler: kapali })
      .sonuc === "SERBEST",
  );
  /**
   * ⛔ EN KRİTİK ÖLÇÜT — İLK KURULUM. Hiçbir dönem kapatılmamışken sistem
   * KİLİTLENMEZ; kilitlenseydi yeni kurulan her firma ilk günden çalışamazdı.
   * Bu ölçüt bozulursa arıza SESSİZ olur: her yazım ısrar ister ve kimse
   * niye olduğunu anlamaz.
   */
  kontrol(
    "AÇIK DÖNEM YOKKEN (boş küme) her şey SERBEST — ilk kurulum",
    donemKorumasi({
      isTarihi: { yil: 2026, ay: 7 },
      kapaliDonemler: new Set(),
    }).sonuc === "SERBEST",
  );
  /**
   * ⚠ ANAHTAR BİÇİMİ TEK GÖVDEDEN. İki yerde iki biçim (`2026-7` ve
   * `2026-08`) olsaydı küme karşılaştırması sessizce boş döner ve kapı HİÇ
   * yanmazdı — en pahalı yalancı yeşil.
   */
  kontrol("anahtar sıfır dolgulu (2026-07)", donemAnahtari(2026, 7) === "2026-07");
  kontrol(
    "  ...ve iki haneli ay bozulmuyor",
    donemAnahtari(2026, 12) === "2026-12",
  );
  kosanBolumler.push("saf kural");
}

// ═══════════════════════════════════════════════════════════════════════
console.log("");
console.log("§2 ISRAR — sayım gövdesi yeniden kullanılıyor, kopya YOK");
// ═══════════════════════════════════════════════════════════════════════
{
  const g = (o: boolean, s: (typeof DONEM_ISRAR_SEBEPLERI)[number] | null, a: string) =>
    israrGecerliMi(donemIsrariniCevir({ onaylandi: o, sebep: s, aciklama: a }));

  kontrol("onaysız ısrar geçersiz", !g(false, "GEC_GIRILEN_KAYIT", "").gecerli);
  kontrol("sebepsiz ısrar geçersiz", !g(true, null, "").gecerli);
  /**
   * ⚠ `DIGER` KAPALI LİSTENİN KAÇAK DELİĞİ — açıklama zorunlu. Olmasaydı
   * herkes "Diğer" seçip hiçbir şey yazmaz ve sebep kaydı işlevsizleşirdi.
   */
  kontrol("DIGER seçilip açıklama yazılmazsa geçersiz", !g(true, "DIGER", "  ").gecerli);
  kontrol("DIGER + açıklama GEÇERLİ", g(true, "DIGER", "beyan düzeltilecek").gecerli);
  kontrol("kapalı listeden sebep + onay GEÇERLİ", g(true, "MUHASEBECI_ONAYLADI", "").gecerli);
  kosanBolumler.push("ısrar");
}

// ═══════════════════════════════════════════════════════════════════════
console.log("");
console.log("§3 BETİK YOLU — sormaz, ATLAR ve RAPORLAR");
// ═══════════════════════════════════════════════════════════════════════
{
  const kapali = new Set([donemAnahtari(2026, 7)]);
  kontrol(
    "kapalı döneme düşen satır ATLANIYOR",
    betikDonemKarari({
      isTarihi: new Date(Date.UTC(2026, 6, 15)),
      kapaliDonemler: kapali,
    }).islem === "ATLA",
  );
  kontrol(
    "açık döneme düşen satır YAZILIYOR",
    betikDonemKarari({
      isTarihi: new Date(Date.UTC(2026, 7, 15)),
      kapaliDonemler: kapali,
    }).islem === "YAZ",
  );
  /**
   * ⚠ İZ BAYRAĞI ADIYLA SINANIYOR: rapor `uyariyaRagmen` alanını SAYIYOR.
   * Adı değişirse rapor sessizce 0 gösterir — muhasebeci "hiç istisna yok"
   * sanır. Bu ölçüt tam o sessizliği kapatıyor.
   */
  const iz = JSON.parse(
    donemIstisnaIzi({
      yol: "/test",
      donem: "2026-07",
      isTarihi: new Date(Date.UTC(2026, 6, 15)),
      israr: { onaylandi: true, sebep: "DIGER", aciklama: "x" },
    }),
  ) as Record<string, unknown>;
  kontrol("iz `uyariyaRagmen` bayrağını taşıyor", iz.uyariyaRagmen === true);
  kontrol("iz DÖNEMİ taşıyor (rapor bununla sayıyor)", iz.donem === "2026-07");
  kontrol("iz SEBEBİ taşıyor", iz.sebep === "DIGER");
  kosanBolumler.push("betik yolu");
}

// ═══════════════════════════════════════════════════════════════════════
console.log("");
console.log("§4 BAĞLANTI — beş yolun her biri kapıyı ÇAĞIRIYOR mu");
// ═══════════════════════════════════════════════════════════════════════
{
  /**
   * ⛔ İMPORT VAR ÇAĞRI YOK — sayım korumasındaki ders. Bir dosyanın kapıyı
   * İÇERİ ALMASI onu ÇAĞIRDIĞINI göstermez; içeri alıp hiç çağırmayan bir
   * yol "korunuyor" görünür ve sessizce açık kalır. Her yol AYRI sınanıyor.
   */
  const YOLLAR: [string, string, "EKRAN" | "BETIK"][] = [
    ["satış", "src/lib/satis.ts", "EKRAN"],
    ["mal kabul", "src/app/alimlar/[id]/mal-kabul/actions.ts", "EKRAN"],
    ["stok düzeltme", "src/app/stok/duzeltme-actions.ts", "EKRAN"],
    ["iade", "src/lib/iade.ts", "EKRAN"],
    ["içe aktarma", "src/lib/ice-aktarma/yaz.ts", "BETIK"],
  ];
  for (const [ad, yol, tur] of YOLLAR) {
    const kod = yorumsuz(readFileSync(yol, "utf8"));
    const cagri = tur === "EKRAN" ? "donemKapisi(" : "betikDonemKarari(";
    kontrol(`${ad}: kapıyı İÇERİ ALIYOR`, kod.includes("donem-kapisi"));
    kontrol(`  ...${ad}: ve GERÇEKTEN ÇAĞIRIYOR (${cagri})`, kod.includes(cagri));
  }
  /**
   * ⚠ İÇE AKTARMA SORU SORMAZ: `donemKapisi` (soran yol) orada KULLANILMAZ.
   * Kullanılsaydı toplu bir yazım kullanıcıya soru sorar ve soracak kimse
   * olmadığı için hata fırlatıp bütün aktarımı düşürürdü.
   */
  const aktarma = yorumsuz(readFileSync("src/lib/ice-aktarma/yaz.ts", "utf8"));
  kontrol(
    "içe aktarma SORAN kapıyı çağırmıyor (soracak kimse yok)",
    !aktarma.includes("donemKapisi("),
  );
  /**
   * ⛔ SÜZGEÇ HESAPLANIP KULLANILMAZSA KAPI YOK HÜKMÜNDEDİR. İçe aktarmada
   * `betikDonemKarari` çağrılıyor olabilir ve sonucu HİÇ kullanılmayabilir —
   * o hâlde bekçi yeşil yanar, kapalı döneme toplu yazım sessizce geçer.
   * Ölçüt çağrıya değil, SONUCUN YAZIMA BAĞLANDIĞINA bakıyor.
   */
  kontrol(
    "içe aktarma SÜZÜLMÜŞ listeyi yazıyor (ham planı değil)",
    /data: yazilacakHareketler\.map/.test(aktarma) &&
      !/data: plan\.acilisHareketleri\.map/.test(aktarma),
  );
  /**
   * ⚠ VE ATLANAN SATIR RAPORLANIYOR. Sessizce atlanan satır, atlanmamış
   * satırdan tehlikelidir: kullanıcı hepsinin yazıldığını sanır.
   */
  kontrol(
    "  ...ve ATLANAN satırlar sonuca yazılıyor",
    /donemAtlananlar,/.test(aktarma),
  );
  /**
   * ⚠ SAYI PLANDAN DEĞİL YAZILANDAN: plan sayısını basmak, atlanan satırları
   * yazılmış gibi göstermek olurdu.
   */
  kontrol(
    "  ...ve sonuç GERÇEKTEN YAZILAN sayıyı basıyor",
    /hareket: yazilacakHareketler\.length/.test(aktarma),
  );
  kosanBolumler.push("bağlantı");
}

// ═══════════════════════════════════════════════════════════════════════
console.log("");
console.log("§5 EKRAN — kapatma kuralları ve rapor kapsamı");
// ═══════════════════════════════════════════════════════════════════════
{
  const eylem = yorumsuz(
    readFileSync("src/app/ayarlar/donemler/eylemler.ts", "utf8"),
  );
  /**
   * ⛔ GELECEK VE BUGÜNKÜ DÖNEM KAPATILAMAZ. Bitmemiş bir ayı kapatmak, o ay
   * boyunca yapılacak HER kaydı duraksatmak demektir; operatör her satışta
   * ısrar kutusu görür ve kutu anlamını yitirir.
   */
  kontrol(
    "gelecek/bugünkü dönem KAPATILAMIYOR",
    /yil \* 12 \+ ay >= bu\.yil \* 12 \+ bu\.ay/.test(eylem),
  );
  kontrol("kapatma izin İSTİYOR", /yetkiIste\(IZIN\)/.test(eylem));
  /**
   * ⚠ KAPANIŞ SİLİNMEZ, DURUMU ÇEVRİLİR — "bu dönem bir ara kapalıydı"
   * bilgisi, o dönemde uyarıya rağmen yazılmış kayıtları açıklayan tek şey.
   */
  kontrol("yeniden açma satırı SİLMİYOR", !/muhasebeDonemi\.delete/.test(eylem));

  const rapor = yorumsuz(readFileSync("src/lib/donem-raporu.ts", "utf8"));
  /**
   * ⛔ RAPOR KENDİ HESABINI YAZMAZ — envanteri mevcut gövdeden alır.
   * Kendi hesabını yazsaydı bu sayfa envanter ekranından farklı bir rakam
   * gösterir ve hangisinin doğru olduğu sorulamazdı.
   */
  kontrol(
    "rapor envanteri MEVCUT gövdeden alıyor",
    /envanterVerisi\(bit\)/.test(rapor),
  );
  /**
   * ⛔ SAYFALANMIŞ KÜMEDEN TOPLAMA YASAK (K61 dersi). `take`/`skip` bir
   * toplam sorgusunda görünürse rakam SAYFANIN toplamına düşer ve ekran
   * yalan söyler.
   */
  kontrol(
    "rapor sayfalanmış kümeden toplamıyor (take/skip YOK)",
    !/\btake:\s*\d/.test(rapor) && !/\bskip:/.test(rapor),
  );
  /** ⚠ İPTALLER DIŞARIDA — sayıya katmak kaybı/kazancı abartmak olurdu. */
  kontrol("rapor iptalleri eliyor", /iptalTarihi: null/.test(rapor));
  /**
   * ⛔ `Settlement.period*` İLE KARIŞTIRMA YASAĞI — o PAZARYERİNİN ödeme
   * dönemi, bizim beyan dönemimiz DEĞİL. Rapor onu okusaydı kanalın
   * takvimine göre bir "muhasebe dönemi" uydurulmuş olurdu.
   */
  kontrol(
    "rapor `Settlement.period*` OKUMUYOR (başka bir şeyin dönemi)",
    !/periodStart|periodEnd/.test(rapor),
  );
  const ekran = yorumsuz(
    readFileSync("src/app/ayarlar/donemler/[donem]/page.tsx", "utf8"),
  );
  /** ⚠ HER RAKAM KAPSAMIYLA — "N satış üstünden" yazılmadan belge olmaz. */
  kontrol("rapor ekranı KAPSAMI yazıyor", /t\("kapsam"/.test(ekran));
  /** ⚠ AÇIK DÖNEM RAPORU KAPALI GİBİ GÖRÜNMEZ. */
  kontrol(
    "açık dönem şerhi çiziliyor",
    /!r\.kapaliMi \?/.test(ekran) && /acikDonemSerhi/.test(ekran),
  );
  kontrol(
    "  ...ve ölü dal değil",
    !/\{\s*false\s*[?&]/.test(ekran),
  );
  kosanBolumler.push("ekran");
}

// ═══════════════════════════════════════════════════════════════════════
console.log("");
console.log("=".repeat(70));
if (kosanBolumler.length !== BOLUM_SAYISI) {
  console.log(
    `KOŞUM YARIM KALDI — ${kosanBolumler.length}/${BOLUM_SAYISI} bölüm. SONUÇ GEÇERSİZ.`,
  );
  process.exit(1);
}
if (kalan === 0) {
  console.log(`TÜM KONTROLLER GEÇTİ (${gecen} ölçüt · ${BOLUM_SAYISI} bölüm)`);
} else {
  console.log(`${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrolden)`);
  process.exit(1);
}
console.log("");
