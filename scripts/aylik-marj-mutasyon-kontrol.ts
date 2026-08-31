import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

/**
 * ============================================================================
 *  AYLIK MARJ — MUTASYON HARNESS'İ (K117)
 * ----------------------------------------------------------------------------
 *      npm run aylik-marj-mutasyon:kontrol
 *
 *  ⛔ NİYE: yüzdeler en sinsi rakamlardır. Payda yanlış olsa bile sonuç
 *  "makul" görünür — %31 yerine %25 yazan bir panel kimseyi rahatsız etmez
 *  ve haftalarca öyle kalır.
 * ============================================================================
 */

const BEKCI = "scripts/aylik-marj-dogrula.ts";
const BEKCI_BASLIGI = "AYLIK MARJ BEKÇİSİ";
const GOVDE = "src/lib/panel.ts";

type Mutasyon = {
  ad: string;
  yon: "KALDIRAN" | "FAZLADAN";
  bul: string;
  koy: string;
  bozdugu: string;
};

const MUTASYONLAR: Mutasyon[] = [
  {
    ad: "İADE PAYDADAN DÜŞÜLMÜYOR — brüt ciroya bölüyor",
    yon: "KALDIRAN",
    bul: "  const netCiro = nokta.hesaplananGelir - nokta.hesaplananIadeTutari;",
    koy: "  const netCiro = nokta.hesaplananGelir;",
    bozdugu:
      "ekrandaki 'net ciro' sutununu bolen kullanici BASKA bir sayi bulur; marj sistematik olarak DUSUK cikar",
  },
  {
    ad: "SIFIR PAYDADA HÜKÜM VERİYOR",
    yon: "FAZLADAN",
    bul: "  if (netCiro <= 0) return null;",
    koy: "",
    bozdugu:
      "satisi olmayan ay 0/0 = NaN uretir; grafikte tanimsiz bir nokta cizilir",
  },
  {
    ad: "NEGATİF PAYDAYLA BÖLÜYOR — zararı kâr gösterir",
    yon: "FAZLADAN",
    bul: "  if (netCiro <= 0) return null;",
    koy: "  if (netCiro === 0) return null;",
    bozdugu:
      "iadesi satisindan buyuk ayda bolum ISARETI TERS cevirir: −100/(−300) = +%33, ZARAR KAR gibi gorunur",
  },
  {
    ad: "YÜZDEYE ÇEVİRMİYOR — kesir dönüyor",
    yon: "KALDIRAN",
    bul: "  return (nokta.net2 / netCiro) * 100;",
    koy: "  return nokta.net2 / netCiro;",
    bozdugu:
      "bicim.yuzde girdiyi yuzde bekliyor; %25 yerine ekranda %0,3 yazar",
  },
  {
    ad: "PAY NET-2 DEĞİL CİRO OLDU",
    yon: "FAZLADAN",
    bul: "  return (nokta.net2 / netCiro) * 100;",
    koy: "  return (nokta.hesaplananGelir / netCiro) * 100;",
    bozdugu:
      "marj her ay ~%100 cikar; kullanici karliligi oldugundan cok yuksek sanir",
  },
  {
    ad: "PAYDA HESAPLANMAYAN CİROYU DA ALIYOR",
    yon: "FAZLADAN",
    bul: "      nokta.hesaplananGelir += satis.gelir;",
    koy: "",
    bozdugu:
      "payda hep 0 kalir ve marj HIC hesaplanmaz; sekme bos gorunur (sessiz kayip)",
  },
  {
    ad: "PAY VE PAYDA AYRI DALLARA BÖLÜNDÜ",
    yon: "FAZLADAN",
    bul: "    if (hesaplandi(satis.durum, satis.net2)) {\n      nokta.net2 += satis.net2;\n      nokta.hesaplananGelir += satis.gelir;\n    } else nokta.hesaplanamayanAdet++;",
    koy: "    if (hesaplandi(satis.durum, satis.net2)) nokta.net2 += satis.net2;\n    else nokta.hesaplanamayanAdet++;\n    nokta.hesaplananGelir += satis.gelir;",
    bozdugu:
      "kari hesaplanamayan satis paydayi buyutur, payi buyutmez — marj SESSIZCE duser (K117'nin onlemek icin yazildigi hatanin ta kendisi)",
  },
  {
    ad: "İADE PAYDASI HESAPLANAMAYANLARI DA SAYIYOR",
    yon: "FAZLADAN",
    bul: "    if (hesaplandi(iade.durum, iade.net2)) {\n      nokta.net2 += iade.net2;\n      nokta.hesaplananIadeTutari += iade.iadeTutari;\n    } else nokta.hesaplanamayanIadeAdedi++;",
    koy: "    if (hesaplandi(iade.durum, iade.net2)) nokta.net2 += iade.net2;\n    else nokta.hesaplanamayanIadeAdedi++;\n    nokta.hesaplananIadeTutari += iade.iadeTutari;",
    bozdugu:
      "paydadan payinda karsiligi olmayan bir dusus yapilir; marj bu sefer YUKARI kayar",
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
console.log("AYLIK MARJ — MUTASYON TURU");
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
  console.log("  OK  aylık marj İKİ YÖNDEN de sınandı ve kırmızı yandığı GÖRÜLDÜ\n");
}
