import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

/**
 * ============================================================================
 *  KART PARTİ PANELİ — MUTASYON HARNESS'İ (K115)
 * ----------------------------------------------------------------------------
 *      npm run kart-partileri-mutasyon:kontrol
 *
 *  ⛔ NİYE: bu gövde kartta PARA basıyor ve iki yönde de sessizce bozulabilir:
 *    − eksik toplarsa  → kullanıcı elindeki malı olduğundan AZ sanır
 *    + eksiği gizlerse → eksik bir rakam TAM görünür ve sorgulanmaz
 * ============================================================================
 */

const BEKCI = "scripts/kart-partileri-dogrula.ts";
const BEKCI_BASLIGI = "KART PARTİ PANELİ BEKÇİSİ";
const GOVDE = "src/lib/kart-partileri.ts";

type Mutasyon = {
  ad: string;
  yon: "KALDIRAN" | "FAZLADAN";
  bul: string;
  koy: string;
  bozdugu: string;
};

const MUTASYONLAR: Mutasyon[] = [
  {
    ad: "ÖLÇÜLEMEYEN PARTİ SESSİZCE ATLANIYOR — sayaç artmıyor",
    yon: "KALDIRAN",
    bul: "      olculemeyen += 1;",
    koy: "",
    bozdugu:
      "eksik bir tutar TAM gorunur; ekran 'N parti girmedi' diyemez ve kimse sorgulamaz",
  },
  {
    ad: "ADET DE ÖLÇÜLEMEYENDEN DÜŞÜYOR",
    yon: "KALDIRAN",
    bul: "    adet += p.kalanAdet;",
    koy: "",
    bozdugu:
      "elde duran mal yok sayilir; adet para birimi tasimaz, eksik gosterilmesinin sebebi yok",
  },
  {
    ad: "MALİYETİ BİLİNMEYEN PARTİ SIFIR SAYILIYOR",
    yon: "FAZLADAN",
    bul: "    if (p.birimMaliyet === null || !birimUyuyor) {",
    koy: "    if (!birimUyuyor) {",
    bozdugu:
      "null maliyet 0 gibi toplanir — 'olctum sifir cikti' ile 'bilmiyorum' karisir (anayasa: varsayilan deger alanin anlamindan turetilir)",
  },
  {
    ad: "PARA BİRİMİ SÜZGECİ KALKTI — KUR ÇEVRİLİYORMUŞ GİBİ TOPLUYOR",
    yon: "FAZLADAN",
    bul: "    const birimUyuyor = (p.paraBirimi ?? para) === para;",
    koy: "    const birimUyuyor = true;",
    bozdugu:
      "EUR ile TRY ayni kefeye girer; kur cevirisi anayasa geregi yapilmaz ama rakam yapilmis gibi cikar",
  },
  {
    ad: "BİRİMİ YAZILMAMIŞ KAYIT DIŞARI ATILIYOR",
    yon: "FAZLADAN",
    bul: "    const birimUyuyor = (p.paraBirimi ?? para) === para;",
    koy: "    const birimUyuyor = p.paraBirimi === para;",
    bozdugu:
      "olculebilir bir tutar sebepsiz kaybolur; bilinmeyen olan MALIYET, birim degil",
  },
  {
    ad: "TUTAR ADETLE ÇARPILMIYOR — birim fiyat toplanıyor",
    yon: "KALDIRAN",
    bul: "    tutar += p.kalanAdet * p.birimMaliyet;",
    koy: "    tutar += p.birimMaliyet;",
    bozdugu:
      "3 adet x 100 = 100 gorunur; kartta duran mal degeri buyuk oranda yanlis olur",
  },
  {
    ad: "BOŞ LİSTEDE DE SIRADAKİ ROZETİ ÇIKIYOR",
    yon: "FAZLADAN",
    bul: "  return partiSayisi > 0 ? 0 : -1;",
    koy: "  return 0;",
    bozdugu:
      "parti yokken 'siradaki' rozeti bir satira baglanmaya calisir; olmayan bir parti isaretlenir",
  },
  {
    ad: "SIRADAKİ ROZETİ HİÇ ÇIKMIYOR",
    yon: "KALDIRAN",
    bul: "  return partiSayisi > 0 ? 0 : -1;",
    koy: "  return -1;",
    bozdugu:
      "kullanici hangi partinin tuketilecegini tarihlerden TAHMIN etmek zorunda kalir",
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

function desenNormalle(kaynak: string, desen: string): string {
  return kaynak.includes("\r\n") ? desen.split("\n").join("\r\n") : desen;
}

console.log("");
console.log("KART PARTİ PANELİ — MUTASYON TURU");
console.log("");

let yakalanan = 0;
const kacan: string[] = [];
const bozuk: string[] = [];

for (const m of MUTASYONLAR) {
  const asil = readFileSync(GOVDE, "utf8");
  const bul = desenNormalle(asil, m.bul);
  const koy = desenNormalle(asil, m.koy);

  const adet = asil.split(bul).length - 1;
  if (adet !== 1) {
    bozuk.push(m.ad + "\n       desen " + adet + " kez geçiyor (1 olmalı)");
    continue;
  }

  const mutant = asil.replace(bul, koy);
  let sonuc: { kod: number; ciktiVar: boolean };
  try {
    writeFileSync(GOVDE, mutant, "utf8");
    if (readFileSync(GOVDE, "utf8") !== mutant || mutant === asil) {
      bozuk.push(m.ad + "\n       mutasyon diske UYGULANMADI");
      continue;
    }
    sonuc = bekciyiKostur();
  } finally {
    writeFileSync(GOVDE, asil, "utf8");
  }

  const isaret = m.yon === "KALDIRAN" ? "-" : "+";
  if (sonuc.kod !== 0 && sonuc.ciktiVar) {
    yakalanan++;
    console.log("  OK  " + isaret + " " + m.ad);
  } else if (sonuc.kod !== 0) {
    bozuk.push(m.ad + "\n       bekçi ÇÖKTÜ (başlık basılmadı) — ölçüm geçersiz");
  } else {
    kacan.push(m.ad + "\n       KORUMASIZ: " + m.bozdugu);
  }
}

console.log("");
if (kacan.length) {
  console.log("  KAÇAN MUTASYONLAR — bekçi bunları GÖRMEDİ:\n");
  for (const k of kacan) console.log("  X  " + k);
  console.log("");
}
if (bozuk.length) {
  console.log("  HARNESS HATASI:\n");
  for (const b of bozuk) console.log("  !! " + b);
  console.log("");
}

const toplam = MUTASYONLAR.length;
const kaldiran = MUTASYONLAR.filter((m) => m.yon === "KALDIRAN").length;
console.log(
  "  " + yakalanan + "/" + toplam + " mutasyon yakalandı" +
    "   (- kaldıran " + kaldiran + " · + fazladan " + (toplam - kaldiran) + ")",
);
if (kacan.length || bozuk.length) {
  console.log("\n  Kaçan ya da ölçülemeyen mutasyon var — bekçi eksik.\n");
  process.exitCode = 1;
} else {
  console.log("  OK  kart parti paneli İKİ YÖNDEN de sınandı ve kırmızı yandığı GÖRÜLDÜ\n");
}
