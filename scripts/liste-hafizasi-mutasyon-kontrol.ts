import {
  readFileSync,
  writeFileSync,
  unlinkSync,
  mkdirSync,
  rmSync,
} from "node:fs";
import { dirname } from "node:path";
import { spawnSync } from "node:child_process";

/**
 * ============================================================================
 *  LİSTE HAFIZASI — MUTASYON HARNESS'İ (K104-②)
 * ----------------------------------------------------------------------------
 *      npm run liste-hafizasi-mutasyon:kontrol
 *
 *  ⛔ Bu bekçi bir DESEN YASAĞI kuruyor ve yasakların en sinsi kusuru
 *  "hiçbir şeyi kapsamamak"tır: liste boş dönerse ölçüt sessizce yeşil
 *  yanar. Bu yüzden mutasyonların bir kısmı **yeni bir dosya YARATIYOR** —
 *  yani hiçbir listeye eklenmemiş, bekçinin adını bile bilmediği bir ekran
 *  yakalanıyor mu diye.
 *
 *  ⚠ İKİ YÖN AYRI SINANIR: davranışı KALDIRAN ve FAZLADAN yapan.
 * ============================================================================
 */

const BEKCI = "scripts/liste-hafizasi-dogrula.ts";
const BEKCI_BASLIGI = "LİSTE HAFIZASI BEKÇİSİ";

type Mutasyon = {
  ad: string;
  yon: "KALDIRAN" | "FAZLADAN";
  dosya: string;
  /** Var olan dosyada değişiklik; yeni dosya için `null`. */
  bul: string | null;
  koy: string;
  bozdugu: string;
};

const GOVDE = "src/lib/liste-hafizasi.ts";
const BILESEN = "src/components/liste-hafizasi-bilesenleri.tsx";
const SATIS_DETAY = "src/app/satislar/[id]/page.tsx";
const SATIS_LISTE = "src/app/satislar/page.tsx";
/** ⚠ Hiçbir listeye eklenmemiş YENİ bir ekran — yasağın kapsamı sınanıyor. */
const YENI_EKRAN = "src/app/satislar/deneme-mutasyon/page.tsx";

const MUTASYONLAR: Mutasyon[] = [
  {
    ad: "adres olcutu kaldirildi (depodan gelen deger dogrudan hedef olur)",
    yon: "KALDIRAN",
    dosya: GOVDE,
    bul: "  if (!deger.startsWith(temel)) return null;",
    koy: "",
    bozdugu:
      "depoya yazilmis `//baska-site.com` gibi bir deger kullaniciyi DISARI tasir",
  },
  /**
   * NOT: "protokolsuz mutlak adres kapisi kaldirildi" mutasyonu KALDIRILDI —
   * cunku bir BOSLUK degil, REDUNDANS gosterdi. Olculdu: o kapiyi kaldiran
   * senaryoda hicbir girdi farkli sonuc vermiyor; `kalan` olcutu onu zaten
   * kapsiyor. Kapinin kendisi silindi (bkz. lib/liste-hafizasi.ts), yani
   * artik bozulacak bir davranis yok.
   * Mutasyon "kactigi icin" degil, OLCTUGU SEY ORTADAN KALKTIGI icin dustu.
   */
  {
    ad: "onek benzeri BASKA rota kabul ediliyor",
    yon: "FAZLADAN",
    dosya: GOVDE,
    bul: '  if (kalan !== "" && !kalan.startsWith("?")) return null;',
    koy: "",
    bozdugu:
      "`/satislar-baska` gibi yalniz ONEKI ayni olan bir rota, satislar hafizasindan donulur",
  },
  {
    ad: "depolama hatasi YUTULMUYOR (ekran komple duser)",
    yon: "FAZLADAN",
    dosya: GOVDE,
    bul: "  try {\n    const deger = window.sessionStorage.getItem(ONEK + temel);\n    return deger === null ? null : guvenliAdres(temel, deger);\n  } catch {\n    return null;\n  }",
    koy: "  const deger = window.sessionStorage.getItem(ONEK + temel);\n  return deger === null ? null : guvenliAdres(temel, deger);",
    bozdugu:
      "gizli sekmede ya da site verisi engelliyken DETAY SAYFASI komple cizilemez",
  },
  {
    ad: "sunucu goruntusu hatirlanan adresi donduruyor (hidrasyon uyusmazligi)",
    yon: "FAZLADAN",
    dosya: BILESEN,
    /**
     * ⚠ ÇAPA K133'TE ESKİDİ — davranış AYNI, şekil değişti. Sunucu
     * görüntüsü artık `JSON.stringify({ h: href, e: null })`; korunan
     * değişmez yine "sunucu görüntüsü DEPOYA DOKUNMAZ".
     */
    bul: "    () => JSON.stringify({ h: href, e: null }),",
    koy: "    () => JSON.stringify({ h: hatirlananSonListe()?.adres ?? href, e: null }),",
    bozdugu:
      "sunucuda `sessionStorage` YOK; sunucu goruntusu istemciden farkli olur ve React uyari basar",
  },
  {
    ad: "satis detayi yine SABIT href ile donuyor",
    yon: "KALDIRAN",
    dosya: SATIS_DETAY,
    bul: '<ListeyeDon href="/satislar">',
    koy: '<GeriBaglanti href="/satislar">',
    bozdugu:
      "13 suzgecle kurulmus bir listeden bir satisa girip donunce hepsi kaybolur",
  },
  {
    ad: "satis listesi kaydediciyi cizmiyor",
    yon: "KALDIRAN",
    dosya: SATIS_LISTE,
    /** ⚠ ÇAPA K133'TE ESKİDİ: kaydedici artık `etiket` de alıyor. */
    bul: '<ListeyiHatirla temel="/satislar" etiket={tBaslik("satislar")} />',
    koy: "",
    bozdugu:
      "hatirlanacak adres HIC yazilmaz; ozellik VARMIS GIBI gorunur ama duz listeye duser",
  },
  {
    /**
     * ⛔ EN ONEMLI MUTASYON: hicbir listeye eklenmemis, bekcinin adini bile
     * bilmedigi YENI bir ekran. Yasak gercekten DESENE bagliysa yakalanir;
     * dosya listesine bagli olsaydi sessizce yesil kalirdi.
     */
    ad: "YENI bir ekran suzgecli listeye sabit href ile donuyor",
    yon: "FAZLADAN",
    dosya: YENI_EKRAN,
    bul: null,
    koy:
      'import { GeriBaglanti } from "@/components/baglanti";\n\n' +
      "export default function DenemeMutasyon() {\n" +
      '  return <GeriBaglanti href="/satislar">Satislar</GeriBaglanti>;\n' +
      "}\n",
    bozdugu:
      "yasak DESENE degil DOSYA LISTESINE bagli demektir; yarin eklenen her ekran kacar",
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
console.log("LİSTE HAFIZASI — MUTASYON TURU");
console.log("");

let yakalanan = 0;
const kacan: string[] = [];
const bozuk: string[] = [];

for (const m of MUTASYONLAR) {
  let sonuc: { kod: number; ciktiVar: boolean };

  if (m.bul === null) {
    /**
     * YENİ DOSYA — yasağın kapsamı sınanıyor, var olan bir satır değil.
     *
     * ⚠ DİZİNİ DE HARNESS KURAR. İlk yazımda dizin elle açılmıştı ve
     * harness onsuz çalışmıyordu: bekçi turunda "mutasyon uygulanmadı"
     * diye düşer, sebebi de kimse anlamazdı. Kurulan her şey `finally`
     * içinde siliniyor.
     */
    const dizin = dirname(m.dosya);
    try {
      mkdirSync(dizin, { recursive: true });
      writeFileSync(m.dosya, m.koy, "utf8");
      const diskten = readFileSync(m.dosya, "utf8");
      if (diskten !== m.koy) {
        bozuk.push(m.ad + "\n       mutasyon diske UYGULANMADI");
        continue;
      }
      sonuc = bekciyiKostur();
    } finally {
      try {
        unlinkSync(m.dosya);
        /** ⚠ DİZİN DE SİLİNİR — `page.tsx`siz boş bir klasör depoyu kirletir. */
        rmSync(dizin, { recursive: true, force: true });
      } catch {
        bozuk.push(m.ad + "\n       ⛔ DENEME DOSYASI SİLİNEMEDİ: " + m.dosya);
      }
    }
  } else {
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
  console.log("  ✓  her ölçüt İKİ YÖNDEN de sınandı ve kırmızı yandığı GÖRÜLDÜ\n");
}
