import { fifoDagit, partileriOncele, type Parti } from "../src/lib/stok";

/**
 * ============================================================================
 *  PARTİ SEÇİMİ BEKÇİSİ — SPESİFİK BELİRLEME (K110, 31.08.2026)
 * ----------------------------------------------------------------------------
 *      npm run parti-secimi:dogrula
 *
 *  ⭐ KAYNAK TARAMASI YOK. `partileriOncele` saf bir gövde; bekçi onu ÇAĞIRIP
 *  DEĞERİNİ ölçüyor. Anayasa: _"saf hesap katmanı, desen tarayan bekçiye
 *  muhtaç olmaz"_ — desen yanlış yerde bulunamaz, çünkü desen aranmıyor.
 *
 *  ⚠ VE ZİNCİR BİRLİKTE SINANIR. Ölçütlerin çoğu `partileriOncele`nin
 *  çıktısını `fifoDagit`e VERİYOR. İki gövde ayrı ayrı doğru olup aradaki
 *  bağ yanlış olabilir — 28.08'de `kar:dogrula` tam bunu kaçırmıştı (motor
 *  elden `null` ile besleniyordu, canlıda `0` geliyordu).
 * ============================================================================
 */

const BOLUM_SAYISI = 6;
const kosanBolumler: string[] = [];

let gecen = 0;
let kalan = 0;

function yakin(ad: string, olculen: unknown, beklenen: unknown) {
  const a = JSON.stringify(olculen);
  const b = JSON.stringify(beklenen);
  if (a === b) {
    gecen += 1;
  } else {
    kalan += 1;
    console.log(`  X ${ad}`);
    console.log(`      beklenen: ${b}`);
    console.log(`      olculen : ${a}`);
  }
}

function dogru(ad: string, kosul: boolean) {
  yakin(ad, kosul, true);
}

/**
 * Parti kurucu — maliyetler AYRI, yoksa ayrımın iki yakası görünmez.
 *
 * ⚠ `girenAdet` ile `kalanAdet` AYRI VERİLİR ve bu bir düzeltmedir. İlk
 * yazımda kurucu `girenAdet: kalanAdet` yazıyordu; ikisi eşit olunca
 * "`secilenKalan` giren adedi mi kalan adedi mi döndürüyor" sorusunu HİÇBİR
 * girdi ayırt edemiyordu ve o mutasyon KAÇTI. Kaçan mutasyon bekçinin değil
 * ÖRNEĞİN kusuruydu (anayasa: "mutasyon kaçıyorsa önce test verisi
 * sorgulanır"). Kısmen tüketilmiş parti gerçek hayatta kuraldır.
 */
function parti(
  id: string,
  gun: number,
  girenAdet: number,
  kalanAdet: number,
  maliyet: string,
): Parti {
  return {
    hareketId: id,
    occurredAt: new Date(Date.UTC(2026, 7, gun)),
    girenAdet,
    kalanAdet,
    birimMaliyet: maliyet,
    birimMaliyetParaBirimi: "TRY",
    locationId: null,
  };
}

/**
 * ⚠ ÖRNEK VERİ AYRIMIN İKİ YAKASINI GÖSTERİR (anayasa kuralı). Üç partinin
 * maliyeti de FARKLI: eşit olsalardı "seçim onurlandı mı" ölçütü, seçim hiç
 * çalışmasa bile aynı maliyeti bulur ve YEŞİL kalırdı.
 */
const P1 = parti("m1", 1, 2, 2, "100.00"); // en eski — FIFO bunu seçer
/**
 * ⭐ KISMEN TÜKETİLMİŞ: 5 girdi, 3 kaldı. `secilenKalan` 3 demeli — 5 derse
 * yetersiz seçim uyarısı hiç çıkmaz ve operatör eksiği göremez.
 */
const P2 = parti("m2", 5, 5, 3, "180.00"); // ortadaki — testlerde SEÇİLEN
const P3 = parti("m3", 9, 6, 4, "250.00"); // o da kısmen tüketilmiş
const LISTE = [P1, P2, P3];

console.log("PARTİ SEÇİMİ BEKÇİSİ");
console.log("=".repeat(60));

// --- 1) SEÇİM YOKSA HİÇBİR ŞEY DEĞİŞMEZ ---------------------------------
console.log("\n1) seçim yok -> FIFO bozulmuyor");
{
  for (const bos of [null, ""]) {
    const s = partileriOncele(LISTE, bos);
    yakin(
      `seçim ${JSON.stringify(bos)} -> liste AYNEN`,
      s.partiler.map((p) => p.hareketId),
      ["m1", "m2", "m3"],
    );
    yakin(`seçim ${JSON.stringify(bos)} -> uygulanmadı`, s.secimUygulandi, false);
    yakin(`seçim ${JSON.stringify(bos)} -> kalan null`, s.secilenKalan, null);
  }
  /** ZİNCİR: seçimsiz dağıtım EN ESKİ partiden düşmeli — bugünkü davranış. */
  const d = fifoDagit(partileriOncele(LISTE, null).partiler, 2);
  dogru("seçimsiz dağıtım yeterli", d.yeterliMi);
  if (d.yeterliMi) {
    yakin("seçimsiz -> en eskiden düşüyor", d.dagitim[0].parti.hareketId, "m1");
    yakin("seçimsiz -> maliyet en eskinin", d.dagitim[0].parti.birimMaliyet, "100.00");
  }
}
kosanBolumler.push("seçim yok");

// --- 2) SEÇİM ONURLANIYOR -----------------------------------------------
console.log("\n2) seçim onurlanıyor");
{
  const s = partileriOncele(LISTE, "m2");
  yakin("seçilen BAŞA alındı", s.partiler[0].hareketId, "m2");
  yakin("uygulandı bayrağı", s.secimUygulandi, true);
  yakin("seçilenin kalanı", s.secilenKalan, 3);

  /** ZİNCİR: asıl hüküm burada — maliyet SEÇİLEN partininki mi? */
  const d = fifoDagit(s.partiler, 2);
  dogru("seçimli dağıtım yeterli", d.yeterliMi);
  if (d.yeterliMi) {
    yakin("seçilen partiden düşüyor", d.dagitim[0].parti.hareketId, "m2");
    yakin("MALİYET seçilenin", d.dagitim[0].parti.birimMaliyet, "180.00");
    yakin("tek partiden karşılandı", d.dagitim.length, 1);
  }
}
kosanBolumler.push("seçim onurlanıyor");

// --- 3) KALANLARIN SIRASI KORUNUYOR -------------------------------------
console.log("\n3) kalanların FIFO sırası bozulmuyor");
{
  const s = partileriOncele(LISTE, "m3");
  yakin(
    "seçilen başta, kalanlar FIFO sırasında",
    s.partiler.map((p) => p.hareketId),
    ["m3", "m1", "m2"],
  );
  /**
   * ⚠ BU ÖLÇÜT NİYE VAR: liste yeniden sıralansaydı (ör. maliyete göre)
   * seçimin KAPSAMADIĞI adet yanlış partiden tamamlanırdı. Seçilen 4 adet
   * taşıyor, 6 isteniyor -> kalan 2 EN ESKİDEN (m1) gelmeli.
   */
  const d = fifoDagit(s.partiler, 6);
  dogru("aşan dağıtım yeterli", d.yeterliMi);
  if (d.yeterliMi) {
    yakin(
      "kalan adet EN ESKİ partiden tamamlanıyor",
      d.dagitim.map((x) => [x.parti.hareketId, x.adet]),
      [
        ["m3", 4],
        ["m1", 2],
      ],
    );
  }
}
kosanBolumler.push("sıra korunuyor");

// --- 4) BULUNAMAYAN SEÇİM SESSİZ GEÇMİYOR -------------------------------
console.log("\n4) bulunamayan seçim bildiriliyor");
{
  const s = partileriOncele(LISTE, "YOK-BOYLE-BIR-PARTI");
  yakin("uygulanmadı bayrağı", s.secimUygulandi, false);
  yakin("kalan null", s.secilenKalan, null);
  yakin(
    "liste bozulmadı — FIFO'ya düşüyor",
    s.partiler.map((p) => p.hareketId),
    ["m1", "m2", "m3"],
  );
  /**
   * ⚠ AYRIM: "seçim yok" ile "seçim bulunamadı" AYNI listeyi döndürüyor.
   * Ekran ikisini `secilenPartiId !== null && !secimUygulandi` ile ayırıyor;
   * ölçüt bu sözleşmeyi SABİTLİYOR.
   */
  dogru("seçim vardı ama uygulanmadı -> ekran ayırt edebilir", !s.secimUygulandi);
}
kosanBolumler.push("bulunamayan seçim");

// --- 5) YETERSİZ SEÇİM — FIFO TAMAMLIYOR --------------------------------
console.log("\n5) yetersiz seçimde FIFO tamamlıyor");
{
  const s = partileriOncele(LISTE, "m2");
  yakin("seçilende 3 var", s.secilenKalan, 3);
  const d = fifoDagit(s.partiler, 5);
  dogru("dağıtım yeterli", d.yeterliMi);
  if (d.yeterliMi) {
    yakin(
      "3 seçilenden + 2 en eskiden",
      d.dagitim.map((x) => [x.parti.hareketId, x.adet]),
      [
        ["m2", 3],
        ["m1", 2],
      ],
    );
    /** ⚠ İKİ FARKLI MALİYET TAŞINIYOR — tek maliyete düşerse kâr yanlış olur. */
    yakin(
      "her pay KENDİ maliyetini taşıyor",
      d.dagitim.map((x) => x.parti.birimMaliyet),
      ["180.00", "100.00"],
    );
  }
}
kosanBolumler.push("yetersiz seçim");

// --- 6) GİRDİ DİZİSİ DEĞİŞTİRİLMİYOR ------------------------------------
console.log("\n6) girdi dizisi değiştirilmiyor");
{
  const once = LISTE.map((p) => p.hareketId);
  partileriOncele(LISTE, "m3");
  partileriOncele(LISTE, "m2");
  yakin(
    "çağrılardan sonra girdi aynı",
    LISTE.map((p) => p.hareketId),
    once,
  );
  /** Aynı listeyi birden çok kalem kullanıyor; bozulsa ikinci kalem kayardı. */
  yakin(
    "kalan adetler bozulmadı",
    LISTE.map((p) => p.kalanAdet),
    [2, 3, 4],
  );
}
kosanBolumler.push("girdi korunuyor");

// === ÖZET ===============================================================
/**
 * ⚠ SAYAÇ, SIRA DEĞİL (anayasa 30.08.2026): bir blok koşmazsa bekçi "geçti"
 * DEMEZ, GEÇERSİZ der. Yeni ölçüt dosyanın sonuna eklenip özetin altında
 * kalırsa sonucu kimse okumaz.
 */
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
