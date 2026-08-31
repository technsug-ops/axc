import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

/**
 * ============================================================================
 *  MALİYET YÖNTEMİ — MUTASYON HARNESS'İ (K115②)
 * ----------------------------------------------------------------------------
 *      npm run maliyet-yontemi-mutasyon:kontrol
 *
 *  ⛔ NİYE: `hareketliOrtalama` bugün HİÇ ÇAĞRILMIYOR. Bağlandığı gün doğru
 *  sanılacak ve o gün kimse bu satırları okumayacak — sınanmamış bir motor,
 *  ilk kullanıldığı anda güvenilir görünür.
 *
 *  ⚠ İKİ GÖVDE BİRDEN: motor (`maliyet-yontemi.ts`) ve değişim kapısı
 *  (`maliyet-yontemi-kapisi.ts`). Tek gövdeye bağlı bir harness, ötekini
 *  serbest bırakırdı.
 * ============================================================================
 */

const BEKCI = "scripts/maliyet-yontemi-dogrula.ts";
const BEKCI_BASLIGI = "MALİYET YÖNTEMİ BEKÇİSİ";
const MOTOR = "src/lib/maliyet-yontemi.ts";
const KAPI = "src/lib/maliyet-yontemi-kapisi.ts";

type Mutasyon = {
  ad: string;
  yon: "KALDIRAN" | "FAZLADAN";
  dosya: string;
  bul: string;
  koy: string;
  bozdugu: string;
};

const MUTASYONLAR: Mutasyon[] = [
  // ═══ MOTOR — AĞIRLIK ═════════════════════════════════════════════
  {
    ad: "AĞIRLIK SİLİNDİ — basit ortalamaya döndü",
    yon: "KALDIRAN",
    dosya: MOTOR,
    bul: "      deger += birim * h.quantityDelta;",
    koy: "      deger += birim;",
    bozdugu:
      "2x100 + 8x50 icin 60 yerine 75 uretir; cok adetli alimlarda maliyet sistematik olarak YANLIS",
  },
  {
    ad: "ADET SAYILMIYOR — her giriş 1 adet sayılıyor",
    yon: "KALDIRAN",
    dosya: MOTOR,
    bul: "      adet += h.quantityDelta;",
    koy: "      adet += 1;",
    bozdugu:
      "havuz adedi ledger adedinden ayrisir; motor kendi adedini uydurmus olur",
  },

  // ═══ MOTOR — ÇIKIŞ ═══════════════════════════════════════════════
  {
    ad: "ÇIKIŞ ORTALAMAYI OYNATIYOR",
    yon: "FAZLADAN",
    dosya: MOTOR,
    bul: "      if (adet > 0) deger -= (deger / adet) * cikan;",
    koy: "      if (adet > 0) deger -= cikan;",
    bozdugu:
      "satis yaptikca maliyet kayar; yontemin TANIMI cikisin ortalamayi degistirmemesidir",
  },
  /**
   * ⛔ BURADA BİR MUTASYON YOK — VE NİYE OLMADIĞI ÖLÇÜLDÜ.
   * `if (adet === 0) deger = 0;` satırını silen bir mutasyon yazıldı ve
   * YEŞİL kaldı. Sebep bekçi eksikliği DEĞİL: 200+ kurgu tarandı (iki farklı
   * maliyetli giriş × sekiz kısmi çıkış deseni) ve kalıntı üreten TEK BİR
   * kurgu bile bulunamadı — IEEE754 bu işlemde tur atışını tam yapıyor.
   * Yani satır savunma amaçlı ve BUGÜN TETİKLENEMİYOR.
   *
   * Sahte bir mutasyon yazıp "12/12" demek, testi değil raporu düzeltmek
   * olurdu. Satır korumasızdır ve öyle yazar.
   * _(Anayasa: tetiklenemeyen yol "geçti" sayılmaz.)_
   */
  {
    ad: "STOKTAN FAZLA ÇIKIŞ ADEDİ EKSİYE DÜŞÜRÜYOR",
    yon: "FAZLADAN",
    dosya: MOTOR,
    bul: "      const cikan = Math.min(adet, -h.quantityDelta);",
    koy: "      const cikan = -h.quantityDelta;",
    bozdugu:
      "negatif adet dogar; havuz adedi = ledger adedi degismezi kirilir",
  },

  // ═══ MOTOR — BİLİNMEYEN MALİYET ═════════════════════════════════
  {
    ad: "BİLİNMEYEN MALİYET SIFIR SAYILIYOR",
    yon: "KALDIRAN",
    dosya: MOTOR,
    bul: "      if (h.birimMaliyet === null) return { durum: \"MALIYET_EKSIK\" };",
    koy: "      if (h.birimMaliyet === null) continue;",
    bozdugu:
      "'bilmiyorum' sessizce 'bedava' olur; ortalama duser ve kar YUKSEK gorunur",
  },
  {
    ad: "OKUNAMAYAN MALİYET NaN OLARAK TAŞINIYOR",
    yon: "KALDIRAN",
    dosya: MOTOR,
    bul: "      if (!Number.isFinite(birim)) return { durum: \"MALIYET_EKSIK\" };",
    koy: "",
    bozdugu:
      "bozuk deger NaN uretir; NaN >= 0 FALSE oldugu icin havuz maliyeti degismezi de coker",
  },
  {
    ad: "STOK YOKKEN SIFIR MALİYET DÖNÜYOR",
    yon: "FAZLADAN",
    dosya: MOTOR,
    bul: "  if (adet <= 0) return { durum: \"STOK_YOK\" };",
    koy: "  if (adet < 0) return { durum: \"STOK_YOK\" };",
    bozdugu:
      "adet 0 iken 0/0 = NaN maliyet dondurur; tanimsiz bir ortalama HESAPLANDI diye damgalanir",
  },

  // ═══ KAPI — YÖNTEM DEĞİŞİMİ ═════════════════════════════════════
  {
    ad: "AYNI DEĞERE 'DEĞİŞTİR' DENİNCE DE UYARI ÇIKIYOR",
    yon: "FAZLADAN",
    dosya: KAPI,
    bul: "  if (g.eski === g.yeni) return { sonuc: \"DEGISIKLIK_YOK\" };",
    koy: "",
    bozdugu:
      "hicbir sey degismeden onay kutusu istenir; her seferinde cikan uyari okunmaz olur",
  },
  {
    ad: "İLK KURULUM DA DURAKSATIYOR",
    yon: "FAZLADAN",
    dosya: KAPI,
    bul: "  if (g.toplamHareket === 0) return { sonuc: \"SERBEST\", sebep: \"ILK_KURULUM\" };",
    koy: "",
    bozdugu:
      "bolunecek gecmis yokken 'gecmisini boluyorsun' denir; ilk kurulumda anlamsiz kapi",
  },
  {
    ad: "AĞIRLIK AYRIMI KALKTI — hep SINIRDA",
    yon: "KALDIRAN",
    dosya: KAPI,
    bul: "  if (g.cariDonemHareketi > 0) {",
    koy: "  if (false) {",
    bozdugu:
      "ay ortasinda yontem degistiren kullaniciya 'sinirdasin' denir; uyari yanlis sey soyler",
  },
  {
    ad: "DEFTER AÇIKKEN DE SERBEST BIRAKIYOR",
    yon: "KALDIRAN",
    dosya: KAPI,
    bul: "  return { sonuc: \"DURAKSA\", agirlik: \"SINIRDA\", etkilenen: g.toplamHareket };",
    koy: "  return { sonuc: \"SERBEST\", sebep: \"ILK_KURULUM\" };",
    bozdugu:
      "10780 hareketlik defter varken uyarisiz yontem degistirilir; iki kuralla yazilmis defter dogar",
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
console.log("MALİYET YÖNTEMİ — MUTASYON TURU");
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
    bozuk.push(m.ad + "\n       desen " + adet + " kez geçiyor (1 olmalı)");
    continue;
  }

  const mutant = asil.replace(bul, koy);
  let sonuc: { kod: number; ciktiVar: boolean };
  try {
    writeFileSync(m.dosya, mutant, "utf8");
    if (readFileSync(m.dosya, "utf8") !== mutant || mutant === asil) {
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
  console.log("  OK  maliyet yöntemi İKİ YÖNDEN de sınandı ve kırmızı yandığı GÖRÜLDÜ\n");
}
