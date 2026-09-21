import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  KAMPANYA DOSYASI TANIMA + KANAL YETENEĞİ — MUTASYON HARNESS'İ (K226)
 * ----------------------------------------------------------------------------
 *      npm run teklif-tanima-mutasyon:kontrol
 *
 *  ⛔ NİYE ZORUNLU — BU YARA İKİ KEZ AÇILDI:
 *    ① 02.09 HB "Avantajlı Teklifler" tarife sanıldı; tanıma o gün yazıldı.
 *    ② 21.09 N11'in AYNI CİNS dosyası tanımadan KAÇTI — çünkü tanıma yalnız
 *       HB'nin şeklini biliyordu (ölçüldü: `teklifDosyasiMi = false`).
 *
 *  Bu dosya tarife olarak yüklenirse sistem BUGÜNKÜ fiyata indirimli oranı
 *  uygular: komisyon olduğundan düşük, kâr olduğundan YÜKSEK görünür ve rakam
 *  tamamen makul durur. Sessiz bozulma — mutasyonsuz bekçinin körleşeceği yer.
 *
 *  ⚠ İKİ YÖN AYRI SINANIR: yakalamayı KALDIRAN mutasyon (kampanya dosyası
 *  sızar) ve FAZLADAN yakalayan mutasyon (gerçek tarife reddedilir).
 * ============================================================================
 */

const BEKCI = "scripts/tarife-dogrula.ts";
const BEKCI_BASLIGI = "KOMİSYON TARİFESİ — DOĞRULAMA";

const OKUYUCU = "src/lib/komisyon/tarife-okuyucu.ts";
const YETENEK = "src/lib/komisyon/kanal-yetenegi.ts";

type Mutasyon = {
  ad: string;
  yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN";
  dosya: string;
  bul: string;
  koy: string;
  bozdugu: string;
  /**
   * Bu mutasyonu YAKALAMASI beklenen bekçi. Varsayılan tarife bekçisi;
   * komisyon yolundaki bağ ayrı bir bekçide ölçülüyor ve o bağı bozan
   * mutasyon tarife bekçisini kırmızı yakmaz — yanlış bekçiye bakan bir
   * harness, korumasız bir bağı "yakalandı" diye raporlardı.
   */
  bekci?: { yol: string; baslik: string };
};

const KOMISYON_BEKCISI = {
  yol: "scripts/komisyon-dogrula.ts",
  baslik: "KOMİSYON",
};

const MUTASYONLAR: Mutasyon[] = [
  {
    ad: "ZARARSIZ — yalnız yorum değişti (harness sağlaması)",
    yon: "ZARARSIZ",
    dosya: OKUYUCU,
    bul: "/** `teklif 1` · `1. teklif üst limit` — numaralı teklif işareti. */",
    koy: "/** teklif 1 - 1. teklif ust limit : numarali teklif isareti. */",
    bozdugu: "hiçbir şey — bu mutasyon YEŞİL kalmalı",
  },
  {
    ad: "TARAMA TAVANI ESKİ HÂLİNE DÖNDÜ (yalnız ilk 2 satır)",
    yon: "KALDIRAN",
    dosya: OKUYUCU,
    bul: "const BASLIK_TARAMA_TAVANI = 20;",
    koy: "const BASLIK_TARAMA_TAVANI = 2;",
    bozdugu:
      "21.09 arizasinin kendisi: N11 dosyasinda basliklar 11. satirda ve tanima onu HIC goremez",
  },
  {
    ad: "TEK SATIRLI ŞEKİL (N11) DALI DÜŞTÜ",
    yon: "KALDIRAN",
    dosya: OKUYUCU,
    bul: '    if (satir.some((b) => NUMARALI_TEKLIF.test(b) && b.includes("komisyon"))) {\n      return true;\n    }',
    koy: "    // dal kaldirildi",
    bozdugu:
      "N11 sekli tanınmaz; kampanya dosyasi 'sutun eksik' diye reddedilir ve KULLANICI nereye gidecegini yine bilemez",
  },
  {
    ad: "İKİ SATIRLI ŞEKİL (HB) DALI DÜŞTÜ",
    yon: "KALDIRAN",
    dosya: OKUYUCU,
    bul: "    if (ustFiyat && komisyon) return true;",
    koy: "    // dal kaldirildi",
    bozdugu:
      "HB 'Avantajli Teklifler' dosyasi tanınmaz; 02.09'da kapatilan yara yeniden acilir",
  },
  {
    ad: "'TEKLİF' ŞARTI GEVŞEDİ — limit+komisyon yeter sayıldı",
    yon: "FAZLADAN",
    dosya: OKUYUCU,
    bul: '    if (!satir.some((b) => NUMARALI_TEKLIF.test(b))) continue;',
    koy: '    if (!satir.some((b) => b.includes("limit") || b.includes("komisyon"))) continue;',
    bozdugu:
      "Trendyol'un GERCEK dilimli tarifesi kampanya sayilir ve gecerli bir yukleme reddedilir — yanlis yanma",
  },
  {
    ad: "TARİFE OKUYUCUSU BEYANI BOŞALDI",
    yon: "KALDIRAN",
    dosya: YETENEK,
    bul: 'export const DILIMLI_TARIFE_OKUYUCUSU_OLAN: readonly KomisyonPlatformu[] = [\n  "TRENDYOL",\n];',
    koy: "export const DILIMLI_TARIFE_OKUYUCUSU_OLAN: readonly KomisyonPlatformu[] = [];",
    bozdugu:
      "Trendyol karti da 'dilimli tarife yok' der; calisan tek yol ekrandan kaybolur ve kimse sebebini goremez",
  },
  {
    ad: "BEYANA HEPSIBURADA EKLENDİ — tutulamayan söz",
    yon: "FAZLADAN",
    dosya: YETENEK,
    bul: '  "TRENDYOL",\n];',
    koy: '  "TRENDYOL",\n  "HEPSIBURADA",\n];',
    bozdugu:
      "ekran HB icin dilimli tarife kutusu acar; okuyucu YOK, yuklenen her dosya 'sutun eksik' ile duser — ekran tutamayacagi bir soz verir",
  },
  {
    ad: "EKSİK TÜR LİSTEDEN DÜŞÜRÜLDÜ (sıfır satır gizlendi)",
    yon: "KALDIRAN",
    dosya: YETENEK,
    bul: '      : { tur: "DILIMLI_TARIFE", durum: "YOK", sebep: "OKUYUCU_YOK" },',
    koy: '      : ({ tur: "GUNCEL_ORAN", durum: "VAR" } as TurDurumu),',
    bozdugu:
      "desteklenmeyen tur ekranda HIC gorunmez; 'baktim yok' ile 'boyle bir sey hic yok' ayni gorunur",
  },
  {
    ad: "KOMİSYON YOLUNDA TANIMA DÜŞTÜ — bağ koptu",
    yon: "KALDIRAN",
    dosya: "src/lib/komisyon/yukle.ts",
    bul: "    if (teklifDosyasiMi(sayfalar ?? [])) {\n      return { durum: \"HATA\", hatalar: [{ kod: \"TEKLIF_DOSYASI\" }] };\n    }\n",
    koy: "",
    bozdugu:
      "kampanya dosyasi oteki kutuya birakilinca 'urun listesine benzemiyor' denir; operator elindeki dosyanin NE oldugunu ogrenemez",
    bekci: KOMISYON_BEKCISI,
  },
  {
    ad: "SIRA BOZULDU — tanıma genel cevaptan SONRA",
    yon: "FAZLADAN",
    dosya: "src/lib/komisyon/yukle.ts",
    bul: "    if (teklifDosyasiMi(sayfalar ?? [])) {\n      return { durum: \"HATA\", hatalar: [{ kod: \"TEKLIF_DOSYASI\" }] };\n    }\n    return {\n      durum: \"HATA\",\n      hatalar: [{ kod: \"TANINMAYAN_DOSYA\", sayfalar: tanima.sayfalar }],\n    };",
    koy: "    return {\n      durum: \"HATA\",\n      hatalar: [{ kod: \"TANINMAYAN_DOSYA\", sayfalar: tanima.sayfalar }],\n    };\n    if (teklifDosyasiMi(sayfalar ?? [])) {\n      return { durum: \"HATA\", hatalar: [{ kod: \"TEKLIF_DOSYASI\" }] };\n    }",
    bozdugu:
      "tanima ERISILEMEZ olur: genel cevap once donuyor ve kampanya dosyasi hic taninmiyor",
    bekci: KOMISYON_BEKCISI,
  },
  {
    ad: "N11 ETIKETI SOZLUKTEN SILINDI - canli kusurun kendisi",
    yon: "KALDIRAN",
    dosya: "messages/tr.json",
    bul: "    \"platformN11\": \"N11\",\n",
    koy: "",
    bozdugu:
      "onizlemede kanal adi BOS basilir; next-intl patlamaz, sessizce bos yazar - kusur GORUNMEDEN yasar (bir ay boyle kaldi)",
    bekci: KOMISYON_BEKCISI,
  },
  {
    ad: "NEREDEN INDIRILIR yazisindan N11 cikarildi",
    yon: "KALDIRAN",
    dosya: "messages/tr.json",
    bul: " · N11 satıcı panelinde toplu ürün dökümü",
    koy: " · BAŞKA satıcı panelinde toplu ürün dökümü",
    bozdugu:
      "ekranda N11 destekleniyor GORUNUR ama operatorun 'bunu nereden indirecegim' sorusu cevapsiz kalir - teslim edilemeyen bir soz",
    bekci: KOMISYON_BEKCISI,
  },
  {
    ad: "EKRAN TIPI CIPLAK BIRLIGE GERI DONDU",
    yon: "KALDIRAN",
    dosya: "src/app/kanal-sku/komisyon-aktar/yukleyici.tsx",
    bul: "  platform: KomisyonPlatformu;",
    koy: "  platform: \"TRENDYOL\" | \"HEPSIBURADA\";",
    bozdugu:
      "dorduncu platform eklendiginde TypeScript SUSAR ve ayni kusur yeniden dogar; liste elle bakim ister",
    bekci: KOMISYON_BEKCISI,
  },
];

function bekciyiKostur(m: Mutasyon): { kod: number; ciktiVar: boolean } {
  const yol = m.bekci?.yol ?? BEKCI;
  const baslik = m.bekci?.baslik ?? BEKCI_BASLIGI;
  const r = spawnSync("npx tsx " + yol, {
    shell: true,
    encoding: "utf8",
    maxBuffer: 40 * 1024 * 1024,
  });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(baslik) };
}

console.log("");
console.log("KAMPANYA TANIMA + KANAL YETENEĞİ — K226 MUTASYON TURU");
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
      `${m.ad}\n       desen ${m.dosya} içinde ${adet} kez geçiyor (1 olmalı)`,
    );
    continue;
  }

  const mutant = asil.replace(bul, koy);
  let sonuc: { kod: number; ciktiVar: boolean };
  try {
    writeFileSync(m.dosya, mutant, "utf8");
    const diskten = readFileSync(m.dosya, "utf8");
    if (diskten !== mutant || mutant === asil) {
      bozuk.push(`${m.ad}\n       mutasyon diske UYGULANMADI`);
      continue;
    }
    sonuc = bekciyiKostur(m);
  } finally {
    /** ⛔ `git checkout` DEĞİL: dosya commit edilmemiş olabilir. */
    writeFileSync(m.dosya, asil, "utf8");
    if (readFileSync(m.dosya, "utf8") !== asil) {
      bozuk.push(`${m.ad}\n       ⛔ GERİ ALMA BAŞARISIZ — dosya mutasyonlu kaldı`);
    }
  }

  const isaret = m.yon === "ZARARSIZ" ? "○" : m.yon === "KALDIRAN" ? "-" : "+";

  if (m.yon === "ZARARSIZ") {
    if (sonuc.kod === 0 && sonuc.ciktiVar) {
      yakalanan++;
      console.log(`  OK  ${isaret} ${m.ad}`);
    } else if (!sonuc.ciktiVar) {
      bozuk.push(`${m.ad}\n       bekçi ÇÖKTÜ (başlık basılmadı) — ölçüm geçersiz`);
    } else {
      kacan.push(
        `${m.ad}\n       YALANCI KIRMIZI: zararsız değişiklik bekçiyi kırmızı yaktı`,
      );
    }
    continue;
  }

  if (sonuc.kod !== 0 && sonuc.ciktiVar) {
    yakalanan++;
    console.log(`  OK  ${isaret} ${m.ad}`);
  } else if (sonuc.kod !== 0) {
    bozuk.push(`${m.ad}\n       bekçi ÇÖKTÜ (başlık basılmadı) — ölçüm geçersiz`);
  } else {
    kacan.push(`${m.ad}\n       KORUMASIZ: ${m.bozdugu}`);
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
console.log(`  ${yakalanan}/${toplam} mutasyon beklendiği gibi davrandı`);
if (kacan.length || bozuk.length) {
  console.log("\n  Kaçan ya da ölçülemeyen mutasyon var — bekçi eksik.\n");
  process.exitCode = 1;
} else {
  console.log("\n  OK  Tanıma ve yetenek İKİ YÖNDEN sınandı, kırmızı yandığı GÖRÜLDÜ.\n");
}
