import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

/**
 * ============================================================================
 *  MAL KABUL — MUTASYON HARNESS'İ (K112a, 31.08.2026)
 * ----------------------------------------------------------------------------
 *      npm run mal-kabul-mutasyon:kontrol
 *
 *  ⛔ NİYE ZORUNLU: bu paketin bozulma biçimi SESSİZDİR. Tarih ekseni
 *  sipariş gününe geri dönerse ekran çalışmaya devam eder, grafik nokta
 *  koyar, sayı bir şey gösterir — yalnız BAŞKA BİR GÜNÜ anlatır. Ölçüldü:
 *  1973 alımın 1931'inde (%97,9) iki tarih farklı, ortanca 3 gün.
 *
 *  ⚠ İKİ YÖN AYRI SINANIR:
 *    − KALDIRAN : kabul ekseni düşer → eski (yanlış) davranışa dönülür
 *    + FAZLADAN : rozet tutamayacağı sözü verir · beyansız istisna açılır
 * ============================================================================
 */

const BEKCI = "scripts/mal-kabul-dogrula.ts";
const BEKCI_BASLIGI = "MAL KABUL BEKÇİSİ";

const KURAL = "src/lib/panel/kabul-sayimi.ts";
const GOREV = "src/lib/panel/gorev-verisi.ts";
const TAKVIM = "src/lib/panel/takvim-verisi.ts";
const PANEL = "src/app/page.tsx";
const SOZLUK = "messages/tr.json";

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
    ad: "EKSEN SİPARİŞ GÜNÜNE DÖNDÜ — vakanın kendisi",
    yon: "KALDIRAN",
    dosya: KURAL,
    bul: "    receivedAt: { gte: pencere.baslangic, lt: pencere.bitisHaric },",
    koy: "    purchasedAt: { gte: pencere.baslangic, lt: pencere.bitisHaric },",
    bozdugu:
      "panel yine SIPARIS gununu sayar; 1931 kayit yanlis gune yazilir ve ekran normal gorunur",
  },
  {
    ad: "ARALIK KAPANDI (`lt` → `lte`)",
    yon: "FAZLADAN",
    dosya: KURAL,
    bul: "    receivedAt: { gte: pencere.baslangic, lt: pencere.bitisHaric },",
    koy: "    receivedAt: { gte: pencere.baslangic, lte: pencere.bitisHaric },",
    bozdugu:
      "ertesi gunun ilk ani iceri girer; ay sonu sayimi bir sonraki ayin ilk kaydini yutar",
  },
  {
    ad: "BOŞ KABUL TARİHİ BİR GÜNE UYDURULUYOR",
    yon: "FAZLADAN",
    dosya: KURAL,
    bul: "  return kayit.receivedAt;",
    koy: "  return kayit.receivedAt ?? new Date(0);",
    bozdugu:
      "kabul edilmemis siparis bir gune yazilir — olmamis bir kabul olmus gorunur",
  },
  {
    ad: "GÖREV GÖVDESİ KURALI ATLIYOR (çıplak purchasedAt)",
    yon: "KALDIRAN",
    dosya: GOREV,
    bul: "    where: kabulKosulu(pencere),",
    koy: "    where: { purchasedAt: { gte: pencere.baslangic, lt: pencere.bitisHaric } },",
    bozdugu:
      "tek govde kurali delinir; ikinci bir eksen dogar ve sayi ile liste ayrisir",
  },
  {
    ad: "GRAFİK GÜNÜ SİPARİŞ TARİHİNE DÜŞÜYOR",
    yon: "KALDIRAN",
    dosya: GOREV,
    bul: "        tarih: a.receivedAt!,",
    koy: "        tarih: new Date(),",
    bozdugu:
      "seri butun noktalari BUGUNE yigar; kutu dogru, grafik yanlis olur ve ikisi ayrisir",
  },
  {
    ad: "PANEL KARTI ESKİ LİSTEYE GERİ BAĞLANDI",
    yon: "KALDIRAN",
    dosya: PANEL,
    bul: '                          "/mal-kabul",',
    koy: '                          "/alimlar",',
    bozdugu:
      "sayi KABUL tarihli, liste SIPARIS tarihli olur — tiklayinca baska bir kume acilir (Ilke #16)",
  },
  {
    ad: "KART TAKVİMİ İSTİSNASI BEYANSIZ KALDI",
    yon: "FAZLADAN",
    dosya: TAKVIM,
    bul: "     * ═══ BEYANLI İSTİSNA — KART BORCU SIPARIS GUNUNDE DOGAR ═══════════",
    koy: "     * ═══ (beyan silindi) ═══",
    bozdugu:
      "gerekcesiz bir `purchasedAt` kullanimi gecerli sayilir; muafiyet bedava olur",
  },
  {
    ad: "ROZET TUTAMAYACAĞI SÖZÜ VERİYOR (`Satışta`)",
    yon: "FAZLADAN",
    dosya: SOZLUK,
    bul: '"kodVar": "Kod var"',
    koy: '"kodVar": "Satışta"',
    bozdugu:
      "sistem pazaryerinin listeleme durumunu BILMIYOR; rozet tutamayacagi bir soz verir",
  },
  {
    ad: "ON DOLDURMA ZINCIRI KOPTU — form prop'u kullanmiyor",
    yon: "KALDIRAN",
    dosya: "src/app/kanal-sku/yeni-esleme.tsx",
    bul: "useState<VaryantSonucu | null>(onDolu)",
    koy: "useState<VaryantSonucu | null>(null)",
    bozdugu:
      "prop tasiniyor ama kullanilmiyor; form BOS acilir, hicbir hata cikmaz ve kimse sebebini bilmez",
  },
  {
    ad: "ROZET URUN KIMLIGINI TASIMIYOR",
    yon: "KALDIRAN",
    dosya: "src/app/mal-kabul/page.tsx",
    bul: "&ekle=${s.varyant.id}",
    koy: "",
    bozdugu:
      "kullanici kanal-SKU ekranina bos formla duser ve az once gordugu urunu yeniden aramak zorunda kalir",
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
console.log("MAL KABUL — K112a MUTASYON TURU");
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
  console.log("  HARNESS HATASI — mutasyon ölçülemedi:\n");
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
  console.log("  OK  K112a İKİ YÖNDEN de sınandı ve kırmızı yandığı GÖRÜLDÜ\n");
}
