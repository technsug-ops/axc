import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

/**
 * ============================================================================
 *  TOPLU KARGO — MUTASYON HARNESS'İ (K60)
 * ----------------------------------------------------------------------------
 *      npm run toplu-kargo-mutasyon:kontrol
 *
 *  ⛔ YENİ BEKÇİ, KENDİ KÖRLÜĞÜNÜ SINAYAN MUTASYONLA GELİR. `toplu-kargo:dogrula`
 *  KAYNAK TARIYOR — yani deponun en sık yalancı-yeşil sınıfının tam içinde.
 *  Her ölçütün aradığı davranış tek tek bozulur ve kırmızı yandığı GÖRÜLÜR.
 *
 *  Üç kapı (`sayim-mutasyon-kontrol.ts` ile aynı gövde):
 *    ① desen kaynakta TAM BİR KEZ geçmeli
 *    ② mutasyon diskten yeniden okunarak uygulandığı doğrulanır
 *    ③ hüküm ÇIKIŞ KODUNDAN — ve bekçinin başlığı çıktıda yoksa "ÇÖKTÜ"
 * ============================================================================
 */

const BEKCI = "scripts/toplu-kargo-dogrula.ts";
const BEKCI_BASLIGI = "TOPLU KARGO BEKÇİSİ";

type Mutasyon = {
  ad: string;
  yon: "KALDIRAN" | "FAZLADAN";
  dosya: string;
  bul: string;
  koy: string;
  bozdugu: string;
};

const MUTASYONLAR: Mutasyon[] = [
  // ── ① SUNUCU KAPISI ───────────────────────────────────────────────────────
  {
    ad: "sunucu koşulundan importKaynak elemesi silindi",
    yon: "KALDIRAN",
    dosya: "src/app/satislar/actions.ts",
    bul: "      importKaynak: null,\n    },\n    data: { shippedAt: gun },",
    koy: "    },\n    data: { shippedAt: gun },",
    bozdugu: "toplu işlem içe aktarılmış siparişe sistemin BİLMEDİĞİ bir tarih yazar (5601 satırlık vaka)",
  },
  {
    ad: "sunucu koşulu importKaynak DOLU olanları hedef alıyor",
    yon: "FAZLADAN",
    dosya: "src/app/satislar/actions.ts",
    bul: "      importKaynak: null,\n    },\n    data: { shippedAt: gun },",
    koy: "      importKaynak: { not: null },\n    },\n    data: { shippedAt: gun },",
    bozdugu: "kapı ters çevrilmiş — tam olarak yasaklanan küme yazılır",
  },
  {
    ad: "zaten işaretli olanlar da yeniden yazılıyor",
    yon: "FAZLADAN",
    dosya: "src/app/satislar/actions.ts",
    bul: "      shippedAt: null,\n      iptalTarihi: null,\n      /**",
    koy: "      iptalTarihi: null,\n      /**",
    bozdugu: "gerçek kargo tarihleri bugüne kayar — panelin 'hangi gün kargoladım' sayacı bozulur",
  },

  // ── ② EKRAN KÜMESİ ────────────────────────────────────────────────────────
  {
    ad: "ekran kümesi içe aktarılmışı elemiyor",
    yon: "KALDIRAN",
    dosya: "src/app/satislar/page.tsx",
    bul: "                s.iptalTarihi === null &&\n                s.importKaynak === null,",
    koy: "                s.iptalTarihi === null,",
    bozdugu: "düğmede yazan sayı, gerçekten işlenecek sayıdan büyük olur — kullanıcı yanlış rakama onay verir",
  },
  {
    ad: "elenen sayı düğmeye hiç geçmiyor",
    yon: "KALDIRAN",
    dosya: "src/app/satislar/page.tsx",
    bul: "          iceAktarilanSayisi={",
    koy: "          gorunmezSayi={",
    bozdugu: "elenen küme SESSİZCE eleniyor — 5192 görüp 12 yazan düğmenin farkı açıklanmıyor",
  },

  // ── ③ ONAY METNİ ──────────────────────────────────────────────────────────
  {
    ad: "onay metninden TARİH parametresi çıkarıldı",
    yon: "KALDIRAN",
    dosya: "src/app/satislar/toplu-kargo.tsx",
    bul: 't("topluKargoAciklama", { sayi, tarih: bugun })',
    koy: 't("topluKargoAciklama", { sayi })',
    bozdugu: "metin hangi tarihin yazılacağını söyleyemez — 'bugünün tarihiyle' bir ayrıntı sanılır",
  },
  {
    ad: "tarih tarayıcının saatinden kuruluyor",
    yon: "FAZLADAN",
    dosya: "src/app/satislar/toplu-kargo.tsx",
    bul: '    timeZone: "Europe/Istanbul",\n    day: "2-digit",',
    koy: '    day: "2-digit",',
    bozdugu: "Almanya'da gece yarısından sonra onay metni, sunucunun yazacağından FARKLI gün gösterir",
  },
  {
    ad: "elenen küme uyarısı çizilmiyor (koşul öldürüldü)",
    yon: "KALDIRAN",
    dosya: "src/app/satislar/toplu-kargo.tsx",
    bul: "            {iceAktarilanSayisi > 0 ? (",
    koy: "            {false ? (",
    bozdugu: "anahtar dosyada kalır ama dal HİÇ çizilmez — klasik yalancı yeşil",
  },
  {
    ad: "sözlükten risk cümlesi silindi",
    yon: "KALDIRAN",
    dosya: "messages/tr.json",
    bul: "⛔ Bu tarih gerçek kargo tarihi değilse veri bozulur. ",
    koy: "",
    bozdugu: "metin ne olacağını söyler ama NİYE tehlikeli olduğunu söylemez",
  },
];

type Sonuc = { kod: number; ciktiVar: boolean };

function bekciyiKostur(): Sonuc {
  /** ⚠ Komut TEK METİN — dizi + shell DEP0190 üretir (bkz. canli-migrate.ts). */
  const r = spawnSync("npx tsx " + BEKCI, {
    encoding: "utf8",
    shell: true,
    windowsHide: true,
  });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("\nTOPLU KARGO MUTASYON HARNESS'İ (K60)\n");

const temiz = bekciyiKostur();
if (temiz.kod !== 0 || !temiz.ciktiVar) {
  console.log("  ⛔ BOZULMAMIŞ HÂLDE BEKÇİ YEŞİL DEĞİL (kod " + temiz.kod + ").");
  console.log("     Mutasyon ölçümü anlamsız olurdu.\n");
  process.exit(1);
}
console.log("  ✓  zemin: bozulmamış hâlde bekçi yeşil\n");

let yakalanan = 0;
const kacan: string[] = [];
const bozuk: string[] = [];

/**
 * ⛔ SATIR SONU KAPISI — DESENİ YAMAMAK DEĞİL, EŞLEŞMEYİ NORMALLEŞTİRMEK.
 *
 * Vaka (27.08.2026): `src/app/satislar/actions.ts` **CRLF**, ötekiler LF.
 * Çok satırlı desenler `\n` arıyordu ve o dosyada **0 kez** eşleşti. Harness
 * üçüncü kapısı sayesinde bunu "yakalandı" diye RAPORLAMADI — `desen 0 kez
 * geçiyor` deyip HARNESS HATASI saydı. O kapı olmasaydı üç mutasyon sessizce
 * yeşil görünürdü.
 *
 * ⚠ ÇARE TEK TEK YAMA DEĞİL: desen, dosyanın KENDİ satır sonuna çevrilir.
 * Yoksa yarın eklenen dördüncü desen aynı tuzağa düşer.
 * _(Anayasa: "metni okuyan kontrol, metnin geliş biçiminden bağımsız okur —
 * düzeltme okuma kapısını kurmaktır".)_
 */
function desenNormalle(kaynak: string, desen: string): string {
  return kaynak.includes("\r\n") ? desen.replaceAll("\n", "\r\n") : desen;
}

for (const m of MUTASYONLAR) {
  const asil = readFileSync(m.dosya, "utf8");
  const bul = desenNormalle(asil, m.bul);
  const koy = desenNormalle(asil, m.koy);

  const adet = asil.split(bul).length - 1;
  if (adet !== 1) {
    bozuk.push(m.ad + "\n       desen " + m.dosya + " içinde " + adet + " kez geçiyor (1 olmalı)");
    continue;
  }

  const mutant = asil.replace(bul, koy);
  let sonuc: Sonuc;
  try {
    writeFileSync(m.dosya, mutant, "utf8");
    /**
     * ⚠ ÖLÇÜT 30.08.2026'DA SIKILAŞTIRILDI: "diskteki metin ASILDAN farklı"
     * yerine "diskteki metin BEKLENENE eşit". Eskisi kısmi/bozuk bir yazımı
     * da "uygulandı" sayardı. Üç harness'in üçünde de aynı kapı olsun diye
     * burada da değiştirildi — iki yerde iki farklı ölçüt olmaz.
     */
    const diskten = readFileSync(m.dosya, "utf8");
    if (diskten !== mutant || mutant === asil) {
      bozuk.push(m.ad + "\n       mutasyon diske UYGULANMADI");
      continue;
    }
    sonuc = bekciyiKostur();
  } finally {
    writeFileSync(m.dosya, asil, "utf8");
  }

  const isaret = m.yon === "KALDIRAN" ? "−" : "+";
  if (sonuc.kod !== 0 && sonuc.ciktiVar) {
    yakalanan++;
    console.log("  ✓  " + isaret + " " + m.ad);
  } else if (sonuc.kod !== 0) {
    bozuk.push(m.ad + "\n       bekçi ÇÖKTÜ (başlık basılmadı) — ölçüm geçersiz");
  } else {
    kacan.push(m.ad + "\n       KORUMASIZ: " + m.bozdugu);
  }
}

console.log("");
if (kacan.length) {
  console.log("  KAÇAN MUTASYONLAR — bekçi bunları GÖRMEDİ:\n");
  for (const k of kacan) console.log("  ✗  " + k);
  console.log("");
}
if (bozuk.length) {
  console.log("  HARNESS HATASI — mutasyon ölçülemedi:\n");
  for (const b of bozuk) console.log("  ⛔ " + b);
  console.log("");
}

const toplam = MUTASYONLAR.length;
const kaldiran = MUTASYONLAR.filter((m) => m.yon === "KALDIRAN").length;
console.log(
  "  " + yakalanan + "/" + toplam + " mutasyon yakalandı" +
  "   (− kaldıran " + kaldiran + " · + fazladan " + (toplam - kaldiran) + ")",
);
if (kacan.length || bozuk.length) {
  console.log("\n  ⛔ Kaçan ya da ölçülemeyen mutasyon var — bekçi eksik.\n");
  process.exitCode = 1;
} else {
  console.log("  ✓  her ölçüt sınandı ve kırmızı yandığı GÖRÜLDÜ\n");
}
