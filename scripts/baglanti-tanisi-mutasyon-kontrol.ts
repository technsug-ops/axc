import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

/**
 * ============================================================================
 *  BAĞLANTI TANISI — MUTASYON HARNESS'İ
 * ----------------------------------------------------------------------------
 *      npm run baglanti-tanisi-mutasyon:kontrol
 *
 *  ⛔ NİYE ZORUNLU: bu gövde YALNIZ KESİNTİDE çalışır. Sağlıklı günlerde
 *  bozulduğunu kimse fark etmez — ve tam gerektiği anda yanlış yöne gönderir.
 *  Bir teşhis aracının en kötü hâli susmak değil, YANLIŞ SÖYLEMEKTİR.
 *
 *  ⚠ İKİ YÖN AYRI:
 *    − KALDIRAN : bir sınıf hiç tanınmaz olur → kesinti görünmez
 *    + FAZLADAN : olmayan bir sebep uydurulur → yanlış işe koşulur
 * ============================================================================
 */

const BEKCI = "scripts/baglanti-tanisi-dogrula.ts";
const BEKCI_BASLIGI = "BAĞLANTI TANISI BEKÇİSİ";
const GOVDE = "scripts/tani-hukmu.ts";

type Mutasyon = {
  ad: string;
  yon: "KALDIRAN" | "FAZLADAN";
  bul: string;
  koy: string;
  bozdugu: string;
};

const MUTASYONLAR: Mutasyon[] = [
  {
    ad: "ÖLÇÜM YOKKEN 'SAĞLIKLI' DİYOR — en tehlikeli yalancı yeşil",
    yon: "FAZLADAN",
    bul: '  if (g.olcumler.length === 0) return { sinif: "OLCUM_YOK" };',
    koy: '  if (g.olcumler.length === 0) return { sinif: "SAGLIKLI", enYavasSn: 0, kotaYakin: false };',
    bozdugu:
      "hic olcum kosmadan 'sorun yok' der; kesintide aracı kosturan kisi baska yere bakar",
  },
  {
    ad: "KOTA KONTROLÜ DÜŞTÜ — dolu kota hiç görünmez",
    yon: "KALDIRAN",
    bul: '  if (g.acikBaglanti !== null && g.kota !== null && g.kota > 0 && g.acikBaglanti >= g.kota) {\n    return { sinif: "KOTA_DOLU", acik: g.acikBaglanti, kota: g.kota };\n  }',
    koy: "",
    bozdugu:
      "kota dolu bir kesinti 'el sikismasi' saniir; sunucu suclanir, oysa cozum havuz ayarindadir",
  },
  {
    /**
     * ⚠ İLK YAZIMDA BU MUTASYON KAÇTI — VE KUSUR BEKÇİDE DEĞİL BENDEYDİ.
     * Kota kontrolünü el sıkışmasından SONRA ekliyor ama ÖNCEKİNİ yerinde
     * bırakıyordum; sıra hiç değişmiyordu, yani mutasyon aslında hiçbir
     * davranışı bozmuyordu. Şimdi el sıkışması kontrolü kotanın ÖNÜNE
     * taşınıyor — sıra gerçekten terse dönüyor.
     * _(Anayasa: "mutasyon harness'inin kendisi de kusurlu olabilir".)_
     */
    ad: "SIRA BOZULDU — kota, el sıkışmasından SONRA sınanıyor",
    yon: "FAZLADAN",
    bul: '  if (g.acikBaglanti !== null && g.kota !== null && g.kota > 0 && g.acikBaglanti >= g.kota) {\n    return { sinif: "KOTA_DOLU", acik: g.acikBaglanti, kota: g.kota };\n  }',
    koy: '  const _za = dusen.filter((o) => Math.abs(o.sure - TABAN.cokusSuresiSn) < 1.5);\n  const _sc = temiz.filter((o) => o.sure < TABAN.sicakLambdaSn * 3);\n  if (_za.length > 0 && _sc.length > 0) {\n    return { sinif: "EL_SIKISMASI", sicak: _sc.length, zamanAsimi: _za.length };\n  }\n  if (g.acikBaglanti !== null && g.kota !== null && g.kota > 0 && g.acikBaglanti >= g.kota) {\n    return { sinif: "KOTA_DOLU", acik: g.acikBaglanti, kota: g.kota };\n  }',
    bozdugu:
      "kesin bir sayi (kota) yerine bir cikarim (el sikismasi) one geciyor — dolu kota 'sunucu hatasi' saniir",
  },
  {
    ad: "SICAK YANIT ŞARTI KALKTI — her kesinti 'el sıkışması' oluyor",
    yon: "FAZLADAN",
    bul: "  if (zamanAsimi.length > 0 && sicak.length > 0) {",
    koy: "  if (zamanAsimi.length > 0) {",
    bozdugu:
      "tam kesinti de 'el sikismasi' diye raporlanir; oysa imzanin ozu SICAK baglantinin CALISMASI",
  },
  {
    ad: "PENCERE ÇOK GENİŞ (±5 sn)",
    yon: "FAZLADAN",
    bul: "    (o) => Math.abs(o.sure - TABAN.cokusSuresiSn) < 1.5,",
    koy: "    (o) => Math.abs(o.sure - TABAN.cokusSuresiSn) < 5,",
    bozdugu:
      "yavas ama BASKA sebeple dusen yanitlar zaman asimi sanilir; imza genisleyip anlamsizlasir",
  },
  {
    ad: "PENCERE ÇOK DAR (±0,1 sn)",
    yon: "KALDIRAN",
    bul: "    (o) => Math.abs(o.sure - TABAN.cokusSuresiSn) < 1.5,",
    koy: "    (o) => Math.abs(o.sure - TABAN.cokusSuresiSn) < 0.1,",
    bozdugu:
      "gercek kesinti (10,22 · 10,36 · 10,44) imzanin disina duser ve TANINMADI olur",
  },
  {
    ad: "TANINMAYAN TABLOYA SEBEP UYDURUYOR",
    yon: "FAZLADAN",
    bul: '  return { sinif: "TANINMADI", dusen: dusen.length, temiz: temiz.length };',
    koy: '  return { sinif: "EL_SIKISMASI", sicak: temiz.length, zamanAsimi: dusen.length };',
    bozdugu:
      "bilinmeyen bir tabloya bilinen bir sebep yakistirilir — kesintide en pahali yanlis",
  },
  {
    ad: "KOTA YAKINLIĞI UYARISI SUSTURULDU",
    yon: "KALDIRAN",
    bul: "        ? g.acikBaglanti > g.kota * 0.6",
    koy: "        ? false",
    bozdugu:
      "kotanin %80'indeyken 'saglikli' denir; yuk altinda dusecegi hic soylenmez",
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
console.log("BAĞLANTI TANISI — MUTASYON TURU");
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
  console.log("  OK  hüküm gövdesi İKİ YÖNDEN de sınandı ve kırmızı yandığı GÖRÜLDÜ\n");
}
