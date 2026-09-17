import { tutarBelirteclerineAyir, tutarCoz } from "../src/lib/kargo-tarife-pdf/deger";
import { desiDizisiniDogrula, monotonlukUyarilari } from "../src/lib/kargo-tarife-pdf/dogrulama";
import { sutunlaraEsle } from "../src/lib/kargo-tarife-pdf/sutun-esleme";
import { etkinTarihiCoz } from "../src/lib/kargo-tarife-pdf/pdf-oku";

/**
 * ============================================================================
 *  KARGO TARİFESİ PDF AYRIŞTIRMA BEKÇİSİ (K202, 17.09.2026)
 * ----------------------------------------------------------------------------
 *      npm run kargo-tarife-pdf:dogrula
 *
 *  ⭐ SAF HESAP KATMANI — DEĞER TESTİ, KAYNAK TARAMASI YOK. Bu dört gövde
 *  (`deger.ts`, `sutun-esleme.ts`, `dogrulama.ts`, `etkinTarihiCoz`) PDF'e
 *  hiç dokunmuyor; doğrudan çağrılıp ÇIKTISI sınanıyor.
 *
 *  ⛔ pdfjs-dist'in KENDİSİ (gerçek PDF okuma) burada sınanmıyor — bu bekçi
 *  saf katmanı sınar. Uçtan uca doğrulama GERÇEK PDF ile yapıldı: 4501
 *  satırın TAMAMI (45.071 değer), dünkü elle doğrulanmış CSV ile BİREBİR
 *  karşılaştırıldı — 0 fark (bkz. teslim raporu).
 * ============================================================================
 */

let gecen = 0;
let hata = 0;
function kontrol(ad: string, kosul: boolean, ipucu?: unknown) {
  if (kosul) {
    gecen++;
    console.log("  OK    " + ad);
  } else {
    hata++;
    console.log("  HATA  " + ad);
    if (ipucu !== undefined) console.log("        ", ipucu);
  }
}

console.log("\nKARGO TARİFESİ PDF AYRIŞTIRMA BEKÇİSİ (K202)\n");

/* ═══ ① DEĞER ÇÖZME ═══════════════════════════════════════════════════ */
console.log("  ── DEĞER ÇÖZME (tutarCoz)");
kontrol("₺89,92 → 89.92", tutarCoz("₺89,92") === 89.92);
kontrol("₺1.898,63 → 1898.63 (binlik nokta)", tutarCoz("₺1.898,63") === 1898.63);
kontrol("₺48.443,89 → 48443.89 (iki binlik nokta)", tutarCoz("₺48.443,89") === 48443.89);
kontrol("boş dize → null", tutarCoz("") === null);
kontrol("sayı olmayan dize → null", tutarCoz("₺abc") === null);
kontrol("₺ işaretsiz de çözer (baştaki ₺ opsiyonel)", tutarCoz("100,50") === 100.5);

console.log("\n  ── BİRLEŞİK HÜCRE AYIRMA (tutarBelirteclerineAyir)");
kontrol(
  "tek değer → tek parça",
  JSON.stringify(tutarBelirteclerineAyir("₺89,92")) === JSON.stringify(["₺89,92"]),
);
kontrol(
  "iki birleşik değer → iki parça (K202 canlı vakası)",
  JSON.stringify(tutarBelirteclerineAyir("₺30.897,42 ₺100.031,96")) ===
    JSON.stringify(["₺30.897,42", "₺100.031,96"]),
);
kontrol(
  "üç birleşik değer de genelleşir (bugün görülmedi ama kilitlenmedi)",
  tutarBelirteclerineAyir("₺1,00 ₺2,00 ₺3,00").length === 3,
);
kontrol(
  "₺ olmayan dize → OLDUĞU GİBİ tek parça geçer (sessizce silinmez; tutarCoz sonra GECERSIZ_DEGER'e düşürür)",
  JSON.stringify(tutarBelirteclerineAyir("Desi")) === JSON.stringify(["Desi"]),
);

/* ═══ ② SÜTUN EŞLEME — KONUMLA, SIRA NUMARASIYLA DEĞİL ═══════════════ */
console.log("\n  ── SÜTUN EŞLEME (sutunlaraEsle)");
const SUTUNLAR = [
  { ad: "Aras Kargo", x: 100 },
  { ad: "DHL", x: 140 },
  { ad: "hepsiJET", x: 180 },
  { ad: "Kolay Gelsin", x: 220 },
];
kontrol(
  "hepsi doluysa sırayla eşleşir",
  (() => {
    const s = sutunlaraEsle(SUTUNLAR, [
      { x: 100, tutar: 1 },
      { x: 140, tutar: 2 },
      { x: 180, tutar: 3 },
      { x: 220, tutar: 4 },
    ]);
    return (
      s.tamam &&
      s.eslesenler.map((e) => e.ad).join(",") === "Aras Kargo,DHL,hepsiJET,Kolay Gelsin"
    );
  })(),
);
/**
 * ⭐ EN KRİTİK ÖLÇÜT — ARADA BİR SÜTUN EKSİKSE KOMŞUYA KAYMAZ. Bu, dünkü
 * `pdftotext -table` hatasının (hepsiJET boşsa tüm sayfa bir sütun kayardı)
 * TAM TERSİNİN sınandığı yer.
 */
kontrol(
  "ORTADAKİ bir sütun eksikse (hepsiJET boş) komşu sütuna KAYMAZ",
  (() => {
    const s = sutunlaraEsle(SUTUNLAR, [
      { x: 100, tutar: 1 }, // Aras Kargo
      { x: 141, tutar: 2 }, // DHL (küçük x sapması — gerçek PDF gibi)
      { x: 219, tutar: 4 }, // Kolay Gelsin — hepsiJET YOK
    ]);
    return (
      s.tamam &&
      s.eslesenler.length === 3 &&
      s.eslesenler[0]!.ad === "Aras Kargo" &&
      s.eslesenler[1]!.ad === "DHL" &&
      s.eslesenler[2]!.ad === "Kolay Gelsin"
    );
  })(),
);
kontrol(
  "İLK sütun eksikse de doğru eşleşir (yalnız sondan değil, baştan da)",
  (() => {
    const s = sutunlaraEsle(SUTUNLAR, [
      { x: 141, tutar: 2 },
      { x: 181, tutar: 3 },
    ]);
    return s.tamam && s.eslesenler[0]!.ad === "DHL" && s.eslesenler[1]!.ad === "hepsiJET";
  })(),
);
kontrol(
  "belirteç sayısı sütun sayısını AŞARSA hata döner (uydurulmaz)",
  (() => {
    const s = sutunlaraEsle(
      [{ ad: "Tek", x: 100 }],
      [
        { x: 100, tutar: 1 },
        { x: 101, tutar: 2 },
      ],
    );
    return !s.tamam && s.kod === "SUTUN_YETERSIZ";
  })(),
);

/* ═══ ③ DESİ DİZİSİ DOĞRULAMA ═════════════════════════════════════════ */
console.log("\n  ── DESİ DİZİSİ DOĞRULAMA");
kontrol("ardışık dizi (0,1,2,3) → tamam", desiDizisiniDogrula([0, 1, 2, 3]).tamam === true);
kontrol(
  "mükerrer desi yakalanır",
  (() => {
    const r = desiDizisiniDogrula([0, 1, 1, 2]);
    return !r.tamam && r.kod === "MUKERRER_DESI";
  })(),
);
kontrol(
  "sıra bozuksa (küçülüyor) yakalanır — boşluk kontrolüne TAKILMADAN önce",
  (() => {
    const r = desiDizisiniDogrula([0, 1, 2, 1]);
    return !r.tamam && r.kod === "SIRA_BOZUK";
  })(),
);
kontrol(
  "boşluk (gap) yakalanır",
  (() => {
    const r = desiDizisiniDogrula([0, 1, 3, 4]);
    return !r.tamam && r.kod === "DESI_BOSLUGU";
  })(),
);

/* ═══ ④ MONOTONLUK UYARISI — ENGELLEMEZ, BİLGİ VERİR ═════════════════ */
console.log("\n  ── MONOTONLUK UYARISI (soft, engellemez)");
kontrol(
  "artan fiyat → uyarı YOK",
  monotonlukUyarilari([
    { desi: 0, degerler: [{ ad: "Aras Kargo", tutar: 10 }] },
    { desi: 1, degerler: [{ ad: "Aras Kargo", tutar: 12 }] },
  ]).length === 0,
);
kontrol(
  "düşen fiyat → uyarı ÜRETİR (engellemez, yalnız bildirir)",
  monotonlukUyarilari([
    { desi: 0, degerler: [{ ad: "Aras Kargo", tutar: 12 }] },
    { desi: 1, degerler: [{ ad: "Aras Kargo", tutar: 10 }] },
  ]).length === 1,
);

/* ═══ ⑤ ETKİN TARİH ÇÖZME ═════════════════════════════════════════════ */
console.log("\n  ── ETKİN TARİH ÇÖZME (PDF'in kendi beyanı)");
kontrol(
  "'10 Eylül 2026 itibariyle geçerli olacaktır.' → 2026-09-10",
  etkinTarihiCoz("10 Eylül 2026 itibariyle geçerli olacaktır. KDV Hariçtir.")?.toISOString() ===
    "2026-09-10T00:00:00.000Z",
);
kontrol(
  "tek haneli gün de çözer (5 Ocak 2027)",
  etkinTarihiCoz("5 Ocak 2027 itibariyle geçerli.")?.toISOString() === "2027-01-05T00:00:00.000Z",
);
kontrol("tarih içermeyen metin → null", etkinTarihiCoz("Desi Aras Kargo DHL") === null);
kontrol("bilinmeyen ay adı → null (uydurulmaz)", etkinTarihiCoz("10 Mart2 2026 geçerli") === null);

console.log(
  "\n" + (hata === 0 ? "TÜM KONTROLLER GEÇTİ" : "BAŞARISIZ") + ` (${gecen}/${gecen + hata})\n`,
);
process.exit(hata === 0 ? 0 : 1);
