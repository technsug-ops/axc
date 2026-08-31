import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

/**
 * ============================================================================
 *  PARTİ SEÇİMİ — MUTASYON HARNESS'İ (K110, 31.08.2026)
 * ----------------------------------------------------------------------------
 *      npm run parti-secimi-mutasyon:kontrol
 *
 *  ⛔ NİYE ZORUNLU: bu paketin bozulma biçimi SESSİZDİR. Seçim çalışmayı
 *  bırakırsa ekran aynen çizilir, kayıt aynen düşer, hiçbir hata çıkmaz —
 *  yalnız maliyet yanlış partiden gelir ve NET sessizce kayar. Canlıda
 *  ölçüldü: 41 varyantta maliyet farkı var, en büyüğü %36.
 *
 *  ⚠ İKİ YÖN AYRI SINANIR (anayasa):
 *    − KALDIRAN : seçim uygulanmaz olur → özellik sessizce düşer
 *    + FAZLADAN : seçim olmaması gereken yerde uygulanır → FIFO bozulur
 *
 *  Üç kapı (öteki harness'lerle aynı gövde):
 *    1) desen kaynakta TAM BİR KEZ geçmeli
 *    2) mutasyon diskten okunarak UYGULANDIĞI doğrulanır
 *    3) hüküm ÇIKIŞ KODUNDAN — bekçinin başlığı yoksa "ÇÖKTÜ"
 * ============================================================================
 */

const BEKCI = "scripts/parti-secimi-dogrula.ts";
/** Bekçi GERÇEKTEN koştu mu — açılış satırı. */
const BEKCI_BASLIGI = "PARTİ SEÇİMİ BEKÇİSİ";

const KURAL = "src/lib/stok.ts";

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
    ad: "SEÇİM HİÇ UYGULANMIYOR — her zaman FIFO",
    yon: "KALDIRAN",
    dosya: KURAL,
    bul: "  const secilen = partiler.find((p) => p.hareketId === secilenHareketId);",
    koy: "  const secilen = undefined as Parti | undefined;",
    bozdugu:
      "operator partiyi secer, defter EN ESKIYI duser; ekranda hicbir sey degismez ve NET sessizce kayar",
  },
  {
    ad: "SEÇİLEN BAŞA ALINMIYOR (liste olduğu gibi dönüyor)",
    yon: "KALDIRAN",
    dosya: KURAL,
    bul: "    partiler: [secilen, ...partiler.filter((p) => p.hareketId !== secilenHareketId)],",
    koy: "    partiler,",
    bozdugu:
      "bayrak 'uygulandi' der ama dagitim yine FIFO'dan yapar — en yaniltici hal, ekran dogru gorunur",
  },
  {
    ad: "UYGULANDI BAYRAĞI SÖNÜK — ekran uyaramaz",
    yon: "KALDIRAN",
    dosya: KURAL,
    bul: "    secimUygulandi: true,",
    koy: "    secimUygulandi: false,",
    bozdugu:
      "secim uygulandi ama ekran 'uygulanmadi' sanir; yetersiz secim uyarisi da hic cikmaz",
  },
  {
    ad: "SEÇİLEN KALAN ADEDİ YANLIŞ (giren adet veriliyor)",
    yon: "FAZLADAN",
    dosya: KURAL,
    bul: "    secilenKalan: secilen.kalanAdet,",
    koy: "    secilenKalan: secilen.girenAdet,",
    bozdugu:
      "kismen tuketilmis partide 'yeterli' sanilir; yetersiz secim uyarisi CIKMAZ ve operator eksigi gormez",
  },
  {
    /**
     * ⚠ ÖNCE BAŞKA BİR MUTASYON YAZILMIŞTI VE KAÇTI: `=== ""` kapısını SİLEN
     * senaryo. Ölçüldü ve o kapının DAVRANIŞ için gereksiz olduğu görüldü —
     * `find()` boş dizeyi zaten bulamaz ve aynı "bulunamadı" dalına düşer,
     * yani hiçbir girdi ikisini ayırmıyor. Kapı bir KISA DEVRE, ölçüt değil.
     * Anlamsız mutasyon GERÇEK riskle değiştirildi: koşulu TERS çevirmek.
     * O hâlde GERÇEK bir seçim de "seçim yok" sayılır ve özellik tamamen
     * ölür — üstelik sessizce.
     * _(Aynı düzeltme `donem-mutasyon-kontrol.ts`te `size === 0` için de
     * yapılmıştı; desen aynı.)_
     */
    ad: "SEÇİM KAPISI TERS ÇEVRİLDİ — gerçek seçim 'seçim yok' sayılıyor",
    yon: "FAZLADAN",
    dosya: KURAL,
    bul: '  if (secilenHareketId === null || secilenHareketId === "") {',
    koy: '  if (secilenHareketId !== null && secilenHareketId !== "") {',
    bozdugu:
      "operator parti secer, govde onu 'secim yok' sayip FIFO'ya duser — ozellik tamamen olur ve hicbir ekran uyarmaz",
  },
  {
    ad: "KALANLAR YENİDEN SIRALANIYOR (FIFO sırası bozuluyor)",
    yon: "FAZLADAN",
    dosya: KURAL,
    bul: "    partiler: [secilen, ...partiler.filter((p) => p.hareketId !== secilenHareketId)],",
    koy: "    partiler: [secilen, ...partiler.filter((p) => p.hareketId !== secilenHareketId).slice().reverse()],",
    bozdugu:
      "secimin KAPSAMADIGI adet en eskiden degil EN YENIDEN tamamlanir — kismi secimde maliyet yanlis",
  },
  {
    ad: "GİRDİ DİZİSİ DEĞİŞTİRİLİYOR (yerinde sıralama)",
    yon: "FAZLADAN",
    dosya: KURAL,
    bul: "  const secilen = partiler.find((p) => p.hareketId === secilenHareketId);",
    koy: "  partiler.sort((a, b) => (a.hareketId === secilenHareketId ? -1 : b.hareketId === secilenHareketId ? 1 : 0));\n  const secilen = partiler.find((p) => p.hareketId === secilenHareketId);",
    bozdugu:
      "ayni liste birden cok kalem icin kullaniliyor; girdi bozulursa IKINCI kalem yanlis partiden duser",
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
console.log("PARTİ SEÇİMİ — K110 MUTASYON TURU");
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
      m.ad +
        "\n       desen " +
        m.dosya +
        " içinde " +
        adet +
        " kez geçiyor (1 olmalı)",
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
    bozuk.push(
      m.ad + "\n       bekçi ÇÖKTÜ (başlık basılmadı) — ölçüm geçersiz",
    );
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
  "  " +
    yakalanan +
    "/" +
    toplam +
    " mutasyon yakalandı" +
    "   (- kaldıran " +
    kaldiran +
    " · + fazladan " +
    (toplam - kaldiran) +
    ")",
);
if (kacan.length || bozuk.length) {
  console.log("\n  Kaçan ya da ölçülemeyen mutasyon var — bekçi eksik.\n");
  process.exitCode = 1;
} else {
  console.log(
    "  OK  K110 parti seçimi İKİ YÖNDEN de sınandı ve kırmızı yandığı GÖRÜLDÜ\n",
  );
}
