import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

/**
 * ============================================================================
 *  SİMÜLASYON — MUTASYON HARNESS'İ (K105, 30.08.2026)
 * ----------------------------------------------------------------------------
 *      npm run simulasyon-mutasyon:kontrol
 *
 *  ⚠ KAPSAM BEYAN EDİLİYOR: bu harness `simulasyon:dogrula`nın TAMAMINI
 *  değil, **K105 kargo kapısını** sınıyor. 181 ölçütün tamamı için mutasyon
 *  yazmak ayrı bir iştir ve bugün açılmadı — burada "her şey sınandı" diye
 *  bir iddia YOK.
 *
 *  ⛔ NİYE BU KAPI: kural bir GİDERİ zorunlu kılıyor. Kapı sessizce
 *  gevşerse ekran yine iyimser bir NET basar ve fiyat kararı ondan verilir —
 *  yani kaçış PARAYLA ölçülür.
 *
 *  Üç kapı (öteki harness'lerle aynı gövde):
 *    ① desen kaynakta TAM BİR KEZ geçmeli
 *    ② mutasyon diskten okunarak UYGULANDIĞI doğrulanır
 *    ③ hüküm ÇIKIŞ KODUNDAN — bekçinin başlığı yoksa "ÇÖKTÜ"
 * ============================================================================
 */

const BEKCI = "scripts/simulasyon-dogrula.ts";
/**
 * CAPA BEKCININ ACILIS BASLIGI — K105 BOLUMUNUNKI DEGIL.
 *
 * ⚠ NIYE DEGISTI (30.08.2026): "kapi SIFIRI da reddediyor" mutasyonu bekciyi
 * K105 bolumune VARMADAN cokerttiyor — daha onceki bir senaryo kargosuz
 * (`0`) girdiyle kosuyor ve mutant onu bos donduruyor. Harness haklı olarak
 * "baslik basilmadi -> olcum gecersiz" dedi.
 *
 * Kapinin isi "bekci gercekten KOSTU mu" sorusunu cevaplamak; bunun dogru
 * isareti ACILIS satiridir. Kosum ortasinda mutasyon yuzunden cikan bir
 * cokme ZATEN kirmizidir ve gecerli bir yakalamadir.
 */
const BEKCI_BASLIGI = "1) DIŞ KAYNAK KIYASI";

const KURAL = "src/lib/simulasyon/karsilastir.ts";
const EKRAN = "src/app/simulasyon/deneme.tsx";

type Mutasyon = {
  ad: string;
  yon: "KALDIRAN" | "FAZLADAN";
  dosya: string;
  bul: string;
  koy: string;
  bozdugu: string;
};

const MUTASYONLAR: Mutasyon[] = [
  {
    ad: "kargo kapisi kaldirildi (bos kargo yine sessizce gecer)",
    yon: "KALDIRAN",
    dosya: KURAL,
    bul: '  if (girdi.kargoUcreti === null || !Number.isFinite(girdi.kargoUcreti)) {\n    return "KARGO";\n  }',
    koy: "",
    bozdugu:
      "unutulan kargo yine sessizce sifir sayilir ve NET oldugundan YUKSEK cikar",
  },
  {
    ad: "kapi SIFIRI da reddediyor (mesru kargosuz satis kilitlenir)",
    yon: "FAZLADAN",
    dosya: KURAL,
    bul: "  if (girdi.kargoUcreti < 0) return \"KARGO\";",
    koy: "  if (girdi.kargoUcreti <= 0) return \"KARGO\";",
    bozdugu:
      "elden satis / alici odemeli gibi mesru kargosuz senaryo HIC hesaplanamaz — duzeltme, duzelttiginden buyuk hasar verir",
  },
  {
    ad: "negatif kargo kabul ediliyor",
    yon: "KALDIRAN",
    dosya: KURAL,
    bul: "  if (girdi.kargoUcreti < 0) return \"KARGO\";",
    koy: "",
    bozdugu: "eksi kargo NET'i ARTIRIR — olmayan bir gelir gibi davranir",
  },
  {
    ad: "sira bozuldu: kargo fiyattan ONCE soyleniyor",
    yon: "FAZLADAN",
    dosya: KURAL,
    bul: '  if (!fiyatVar) return "FIYAT";',
    koy: '  if (girdi.kargoUcreti === null) return "KARGO";\n  if (!fiyatVar) return "FIYAT";',
    bozdugu:
      "bos formda ekran once kargo ister; kullanici doldurma sirasinda ileri geri gezdirilir",
  },
  {
    ad: "ekrandaki uyari OLU DALA alindi (desen dosyada kalir)",
    yon: "KALDIRAN",
    dosya: EKRAN,
    bul: "          {kargoEksik ? (",
    koy: "          {false ? (",
    bozdugu:
      "uyari HIC cizilmez ama sozluk anahtari dosyada durur — deponun en sik yalanci yesili",
  },
  {
    ad: "bos durum kargoyu ayri anlatmiyor (tek genel cumle)",
    yon: "KALDIRAN",
    dosya: EKRAN,
    bul: '            {sebep === "KARGO" ? t("bosKargoBaslik") : t("bosBaslik")}',
    koy: "            {t(\"bosBaslik\")}",
    bozdugu:
      "formu doldurup kargoyu atlayan kullanici 'henuz hesaplanmadi' okur ve 'ama ben doldurdum' der",
  },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, {
    shell: true,
    encoding: "utf8",
    maxBuffer: 40 * 1024 * 1024,
  });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

/** Satır sonlarını hedef dosyanın biçimine uydurur (depoda CRLF de var). */
function desenNormalle(kaynak: string, desen: string): string {
  return kaynak.includes("\r\n") ? desen.split("\n").join("\r\n") : desen;
}

console.log("");
console.log("SİMÜLASYON — K105 KARGO KAPISI MUTASYON TURU");
console.log("");

let yakalanan = 0;
const kacan: string[] = [];
const bozuk: string[] = [];

for (const m of MUTASYONLAR) {
  const asil = readFileSync(m.dosya, "utf8");
  const bul = desenNormalle(asil, m.bul);
  const koy = desenNormalle(asil, m.koy);

  const adet = asil.split(bul).length - 1;
  if (adet !== 1) {
    bozuk.push(
      m.ad + "\n       desen " + m.dosya + " içinde " + adet + " kez geçiyor (1 olmalı)",
    );
    continue;
  }

  const mutant = asil.replace(bul, koy);
  let sonuc: { kod: number; ciktiVar: boolean };
  try {
    writeFileSync(m.dosya, mutant, "utf8");
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
  console.log("  ✓  K105 kapısı İKİ YÖNDEN de sınandı ve kırmızı yandığı GÖRÜLDÜ\n");
}
