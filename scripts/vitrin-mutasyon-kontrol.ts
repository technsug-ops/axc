import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  "RAFTA VAR, VİTRİNDE YOK" — ŞERH VE DÖKÜM · MUTASYON HARNESS'İ (K244)
 * ----------------------------------------------------------------------------
 *      npm run vitrin-mutasyon:kontrol
 *
 *  ⛔ NİYE DOĞDU: `vitrin:dogrula` 127 ölçüt taşıyor ve HİÇBİRİ mutasyonla
 *  sınanmamıştı. K244'te döküm panelden `/kanal-listeleme`ye taşındı; taşıma
 *  sırasında iki ölçüt eskidi ve KIRMIZI yandı — yani bekçi canlıydı. Ama
 *  "kırmızı yanabiliyor" ile "aradığı davranışı ölçüyor" aynı şey değildir.
 *
 *  ⚠ KAPSAM DAR VE BUNU SÖYLÜYOR: bu harness K244 ölçütlerini sınar (şerh ·
 *  döküm · ortak ölçüt). Kalan ölçütler hâlâ mutasyonsuz ve panoda açık
 *  kalem olarak duruyor.
 * ============================================================================
 */

const BEKCI = "scripts/vitrin-dogrula.ts";
const BEKCI_BASLIGI = "ölçüt geçti";
const PANEL = "src/app/page.tsx";
const KANAL = "src/app/kanal-listeleme/page.tsx";
const GOVDE = "src/lib/panel/vitrin-serhi.ts";
const KUTU = "src/app/vitrin-kutusu.tsx";
const SERH = "src/app/vitrin-serhi.tsx";

type Mutasyon = {
  ad: string;
  yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN";
  dosya: string;
  bul: string;
  koy: string;
  bozdugu: string;
};

const MUTASYONLAR: Mutasyon[] = [
  {
    ad: "ZARARSIZ - yalniz yorum degisti (harness saglamasi)",
    yon: "ZARARSIZ",
    dosya: GOVDE,
    bul: "/** Kanalların TOPLAM satılamaz ürün adedi. */",
    koy: "/** adet. */",
    bozdugu: "hicbir sey - bu mutasyon YESIL kalmali",
  },
  {
    /* K244: kullanici "bu bolum Kanal Listeleme sekmesine alinabilir,
       panelde sadece kucuk bir uyari olur" dedi. */
    ad: "DOKUM PANELE GERI GELDI (Ilke #13 cignendi)",
    yon: "FAZLADAN",
    dosya: PANEL,
    bul: "            <VitrinSerhi veri={vitrin} />",
    koy: "            <VitrinKutusu veri={vitrin} />",
    bozdugu:
      "panel yine kanal basina bir kart cizer; 11 kanal hedefinde ozet ekrani dokum ekranina doner",
  },
  {
    ad: "SERHE VERI GITMIYOR (bos cizilir)",
    yon: "KALDIRAN",
    dosya: PANEL,
    bul: "            <VitrinSerhi veri={vitrin} />",
    koy: "            <VitrinSerhi veri={[]} />",
    bozdugu:
      "serh her zaman bos gorunur; rafta yatan sermaye panelde HIC yazmaz",
  },
  {
    ad: "DOKUM KANAL LISTELEMEDEN KALKTI (hic bir yerde cizilmez)",
    yon: "KALDIRAN",
    dosya: KANAL,
    bul: "      <VitrinKutusu veri={await vitrinKutusunuTopla()} />",
    koy: "      {null}",
    bozdugu:
      "panelden kaldirilan dokum yeni evine hic varmaz - tasima sirasinda kaybolan ekran",
  },
  {
    ad: "KUTU KENDI OLCUTUNU KURDU (iki yerde iki olcut)",
    yon: "KALDIRAN",
    dosya: KUTU,
    bul: "        const sorunVar = kanalSorunluMu(k);",
    koy: "        const sorunVar = k.sonKosumBasarisiz;",
    bozdugu:
      "panel 'taze' derken kutu 'bayat' diyebilir; iki ekran ayni kanal icin farkli hukum verir",
  },
  {
    ad: "IZ YOKLUGU SORUN SAYILMIYOR",
    yon: "KALDIRAN",
    dosya: GOVDE,
    bul: "  return k.sonKosumBasarisiz || bayat || k.kosumIziYok;",
    koy: "  return k.sonKosumBasarisiz || bayat;",
    bozdugu:
      "hic olculmemis kanal 'temiz' gorunur - 'bos sonuc ile temiz sonucu ayirt edemeyen denetim'",
  },
  {
    ad: "BOSLUK KOVALARI TOPLAMA GIRDI",
    yon: "FAZLADAN",
    dosya: GOVDE,
    bul: "    adet += k.toplamAdet;",
    koy: "    adet += k.toplamAdet + k.kaydiYokAdet;",
    bozdugu:
      "defterin bilmedigi urunler zarar gibi raporlanir; olcum 9 varyantin 4'unun aslinda kanalda OLDUGUNU gostermisti",
  },
  {
    ad: "SIFIRDA DA BAGLANTI CIZILIYOR (Ilke #2)",
    yon: "FAZLADAN",
    dosya: SERH,
    bul: "      {temiz && !s.dikkatGerek ? null : (",
    koy: "      {false ? null : (",
    bozdugu:
      "acilacak liste yokken tiklanabilir gorunur; kullanici bos ekrana gider",
  },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, {
    shell: true,
    encoding: "utf8",
    maxBuffer: 40 * 1024 * 1024,
  });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return {
    kod: r.status ?? 1,
    ciktiVar: cikti.includes(BEKCI_BASLIGI) || cikti.includes("BAŞARISIZ"),
  };
}

console.log("");
console.log("VITRIN - SERH VE DOKUM - MUTASYON TURU");
console.log("");

/**
 * ⛔ TABAN YEŞİL Mİ — MUTASYONDAN ÖNCE (K243'te ölçüldü).
 * Kırmızı bir bekçi HER mutasyonu "yakalandı" gösterir ve tur kusursuz
 * görünür.
 */
{
  const t = bekciyiKostur();
  if (t.kod !== 0 || !t.ciktiVar) {
    console.log(
      `  ⛔ TABAN KIRMIZI — ${BEKCI} mutasyonsuz hâlde geçmiyor (çıkış ${t.kod}).`,
    );
    console.log("     Mutasyon ölçümü GEÇERSİZ olurdu.");
    process.exit(1);
  }
}

let yakalanan = 0;
const kacan: string[] = [];
const bozuk: string[] = [];

for (const m of MUTASYONLAR) {
  const asil = readFileSync(m.dosya, "utf8");
  const bul = desenNormalle(asil, m.bul);
  const koy = desenNormalle(asil, m.koy);

  const adet = asil.split(bul).length - 1;
  if (adet !== 1) {
    bozuk.push(`${m.ad}\n       desen ${m.dosya} icinde ${adet} kez geciyor (1 olmali)`);
    continue;
  }

  const mutant = asil.replace(bul, koy);
  let sonuc: { kod: number; ciktiVar: boolean };
  try {
    dayanikliYaz(m.dosya, mutant);
    if (readFileSync(m.dosya, "utf8") !== mutant || mutant === asil) {
      bozuk.push(`${m.ad}\n       mutasyon diske UYGULANMADI`);
      continue;
    }
    sonuc = bekciyiKostur();
  } finally {
    /* git checkout DEGIL: dosya commit edilmemis olabilir. */
    dayanikliYaz(m.dosya, asil);
    if (readFileSync(m.dosya, "utf8") !== asil) {
      bozuk.push(`${m.ad}\n       GERI ALMA BASARISIZ - dosya mutasyonlu kaldi`);
    }
  }

  const isaret = m.yon === "ZARARSIZ" ? "o" : m.yon === "KALDIRAN" ? "-" : "+";
  if (m.yon === "ZARARSIZ") {
    if (sonuc.kod === 0 && sonuc.ciktiVar) {
      yakalanan++;
      console.log(`  OK  ${isaret} ${m.ad}`);
    } else if (!sonuc.ciktiVar) {
      bozuk.push(`${m.ad}\n       bekci COKTU - olcum gecersiz`);
    } else {
      kacan.push(`${m.ad}\n       YALANCI KIRMIZI: zararsiz degisiklik bekciyi kirmizi yakti`);
    }
    continue;
  }

  if (sonuc.kod !== 0 && sonuc.ciktiVar) {
    yakalanan++;
    console.log(`  OK  ${isaret} ${m.ad}`);
  } else if (sonuc.kod !== 0) {
    bozuk.push(`${m.ad}\n       bekci COKTU - olcum gecersiz`);
  } else {
    kacan.push(`${m.ad}\n       KORUMASIZ: ${m.bozdugu}`);
  }
}

console.log("");
if (kacan.length) {
  console.log("  KACAN MUTASYONLAR - bekci bunlari GORMEDI:\n");
  for (const k of kacan) console.log("  X  " + k);
  console.log("");
}
if (bozuk.length) {
  console.log("  HARNESS HATASI - mutasyon olculemedi:\n");
  for (const b of bozuk) console.log("  !! " + b);
  console.log("");
}

console.log(`  ${yakalanan}/${MUTASYONLAR.length} mutasyon beklendigi gibi davrandi`);
if (kacan.length || bozuk.length) {
  console.log("\n  Kacan ya da olculemeyen mutasyon var - bekci eksik.\n");
  process.exitCode = 1;
} else {
  console.log("\n  OK  Serh ve dokum UC YONDEN sinandi, kirmizi yandigi GORULDU.\n");
}
