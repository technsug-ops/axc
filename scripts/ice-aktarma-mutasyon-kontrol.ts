import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  İÇE AKTARMA — GERİ DOLDURMA SEÇİMİ · MUTASYON HARNESS'İ (K243, 23.09.2026)
 * ----------------------------------------------------------------------------
 *      npm run ice-aktarma-mutasyon:kontrol
 *
 *  ⛔ NİYE DOĞDU: `ice-aktarma:dogrula` 463 ölçüt taşıyor ve HİÇBİRİ
 *  mutasyonla sınanmamıştı — yani hepsi "yeşil" diyordu, kaçı gerçekten
 *  ısırıyor bilinmiyordu. Bu harness o boşluğun ilk parçasını kapatıyor:
 *  K243'te eklenen geri doldurma ölçütleri.
 *
 *  ⚠ KAPSAM DAR VE BUNU SÖYLÜYOR: bu harness bekçinin TAMAMINI değil, K243
 *  ölçütlerini sınar. Geri kalan 461 ölçüt hâlâ mutasyonsuz ve bu panoda
 *  açık kalem olarak duruyor. _(Anayasa: "boş sonuç ile temiz sonucu ayırt
 *  edemeyen denetim, denetim değildir" — kapsam ekranda yazar.)_
 * ============================================================================
 */

const BEKCI = "scripts/ice-aktarma-dogrula.ts";
const BEKCI_BASLIGI = "TÜM KONTROLLER GEÇTİ";
const HB = "scripts/canli-hb-ice-aktar.ts";
const N11 = "scripts/canli-n11-ice-aktar.ts";

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
    dosya: HB,
    bul: "   * \u26a0 `AND` TA\u015eIYICI: karde\u015f `OR`lar\u0131 yan yana koymak birini \u00f6tekine",
    koy: "   * \u26a0 AND tasiyici.",
    bozdugu: "hicbir sey - bu mutasyon YESIL kalmali",
  },
  {
    /* Kullanici 23.09'da bir siparis detayinda kargo firmasinin bos
       oldugunu gordu. Olcum: 53 HB satisinda kod DOLU, firma BOS. */
    ad: "SECIM YINE TEK ALANA DUSTU (kor nokta geri geldi)",
    yon: "KALDIRAN",
    dosya: HB,
    bul: "        { OR: [{ shipmentCode: null }, { kanalKargoFirmasi: null }] },",
    koy: "        { shipmentCode: null },",
    bozdugu:
      "kodu bir kez yazilmis siparis bir daha SECILMEZ ve kargo firmasi sonsuza kadar bos kalir",
  },
  {
    ad: "IKI YAZMA TEK SORGUDA BIRLESTI (oburunu ezer)",
    yon: "FAZLADAN",
    dosya: HB,
    bul: "      where: { code: no, channelAccountId: hesap.id, kanalKargoFirmasi: null },",
    koy: "      where: { code: no, channelAccountId: hesap.id },",
    bozdugu:
      "zaten dolu bir kargo firmasi haksiz yere ezilir - kanal bir tur sonra baska bir firma soylerse defterdeki dogru deger gider",
  },
  {
    ad: "BOS CEKIM YINE HESAP HATASI (K264 dali kapali)",
    yon: "KALDIRAN",
    dosya: N11,
    bul:
      "  if (paketler.length === 0) {",
    koy:
      "  if (paketler.length === -1) {",
    bozdugu:
      "kanal 0 paket dondurunce damga yazilmaz, panel 'zamanlayiciyi kontrol edin' der - 24.09 vakasi geri gelir",
  },
  {
    ad: "BOS CEKIM DAMGA YAZMIYOR",
    yon: "KALDIRAN",
    dosya: N11,
    bul:
      "      await prisma.auditLog.create({\n        data: {\n          action: \"N11_SIPARIS_ICE_AKTARMA\",\n          targetType: \"ChannelAccount\",\n          targetId: hesapBos.id,",
    koy:
      "      await Promise.resolve({\n        data: {\n          action: \"N11_SIPARIS_ICE_AKTARMA_YOK\",\n          targetType: \"ChannelAccount\",\n          targetId: hesapBos.id,",
    bozdugu:
      "dal var ama iz yok - panel yine 'kosmadi' der",
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
    ciktiVar: cikti.includes(BEKCI_BASLIGI) || cikti.includes("BA\u015eARISIZ"),
  };
}

console.log("");
console.log("ICE AKTARMA - GERI DOLDURMA SECIMI - MUTASYON TURU");
console.log("");

/**
 * ⛔ TABAN YEŞİL Mİ — MUTASYONDAN ÖNCE (K243).
 * Kırmızı bir bekçi HER mutasyonu "yakalandı" gösterir ve tur kusursuz
 * görünür. Bu tam olarak aynı gün `stok-siralama`da yaşandı.
 */
{
  const t = bekciyiKostur();
  if (t.kod !== 0 || !t.ciktiVar) {
    console.log(
      `  \u26d4 TABAN KIRMIZI \u2014 ${BEKCI} mutasyonsuz h\u00e2lde ge\u00e7miyor (\u00e7\u0131k\u0131\u015f ${t.kod}).`,
    );
    console.log("     Mutasyon \u00f6l\u00e7\u00fcm\u00fc GE\u00c7ERS\u0130Z olurdu.");
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
  console.log("\n  OK  Geri doldurma secimi UC YONDEN sinandi, kirmizi yandigi GORULDU.\n");
}
