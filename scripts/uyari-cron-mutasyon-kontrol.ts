import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  UYARI ÇANI + CRON ROTALARI — MUTASYON HARNESS'I (K269, 25.09.2026)
 * ----------------------------------------------------------------------------
 *      npm run uyari-cron-mutasyon:kontrol
 *
 *  K264 ve K266 `uyari:dogrula` ile `cron-yollari:dogrula`ya 11 ölçüt ekledi;
 *  ikisinin de harness'i yoktu. 24.09'da ELLE bir tur koşuldu (10/10) ama elle
 *  tur bir seferliktir — REGRESYONDA KIRMIZI YANMAZ. Bu dosya o turun kalıcı
 *  hâli (Python betiğinden birebir): bekçi turuna girer, her push'ta koşar.
 *
 *  Her mutasyon kendi bekçisini koşturur (üç bekçi: uyari · cron-yollari ·
 *  ice-aktarma). ÜÇ YÖN: zararsız (yeşil kalmalı) · kaldıran · fazladan.
 *  Deseni SAYAR (1 değilse ÖLÇÜLEMEDİ), diske yazıldığını doğrular, geri almayı
 *  kopyadan yapar (git checkout DEĞİL) ve geri yazıldığını doğrular. Bekçinin
 *  ÇÖKMESİ «ısırdı» sayılmaz — çıktıda sonuç satırı aranır.
 * ============================================================================
 */

const TURLER = "src/lib/uyari/turler.ts";
const TOPLA = "src/lib/uyari/topla.ts";
const SERIT = "src/lib/panel/bugun-ne-yapmaliyim.ts";
const TY_ROTA = "src/app/api/cron/ty-cekim/route.ts";
const TY_HAKEDIS = "src/app/api/cron/ty-hakedis-cekim/route.ts";
const N11_ROTA = "src/app/api/cron/n11-cekim/route.ts";

type Mutasyon = {
  ad: string;
  yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN";
  bekci: "uyari:dogrula" | "cron-yollari:dogrula" | "ice-aktarma:dogrula";
  dosya: string;
  bul: string;
  koy: string;
  bozdugu: string;
};

const MUTASYONLAR: Mutasyon[] = [
  {
    ad: "ZARARSIZ - uyari yorumu degisti (harness saglamasi)",
    yon: "ZARARSIZ",
    bekci: "uyari:dogrula",
    dosya: TURLER,
    bul: "  // ── K266 (24.09.2026): ŞERİTTEN ÇANA — günün işi değil, bakım uyarısı ──",
    koy: "  // K266 notu.",
    bozdugu: "hicbir sey - YESIL kalmali",
  },
  {
    ad: "ORANSIZ SKU CANDAN DUSTU (anahtar yok)",
    yon: "KALDIRAN",
    bekci: "uyari:dogrula",
    dosya: TURLER,
    bul: '  "oransizKanalSku",\n  "tarifePenceresi",\n] as const;',
    koy: '  "tarifePenceresi",\n] as const;',
    bozdugu: "oransiz SKU hicbir yerde gorunmez - seritten cikti, cana girmedi",
  },
  {
    ad: "TOPLAYICI ORANSIZ SKU'YU BESLEMIYOR",
    yon: "KALDIRAN",
    bekci: "uyari:dogrula",
    dosya: TOPLA,
    bul: "    oransizKanalSku: { sayi: gorevSayilari.oransizKanalSku },",
    koy: "    oransizKanalSku: { sayi: 0 },",
    bozdugu: "anahtar var, olcum hep 0 - can sessiz kalir",
  },
  {
    ad: "TARIFE SAYISI BAYRAK DEGIL, KAPSAMSIZ KANAL ADEDI",
    yon: "FAZLADAN",
    bekci: "uyari:dogrula",
    dosya: TOPLA,
    bul: "    tarifePenceresi: { sayi: tarifeUyarisiVarMi(tarifeKapsam) ? 1 : 0 },",
    koy: "    tarifePenceresi: { sayi: tarifeKapsam.kapsamsizKanal },",
    bozdugu: "pencere YAKLASIRKEN kapsamsiz 0'dir - uyari susar",
  },
  {
    ad: "IKI YERDE IKI TANIM (anahtarlar serite GERI GELDI)",
    yon: "FAZLADAN",
    bekci: "uyari:dogrula",
    dosya: SERIT,
    bul: '  "karHesaplanamayan",\n] as const;',
    koy: '  "karHesaplanamayan",\n  "oransizKanalSku",\n  "tarifePenceresi",\n] as const;',
    bozdugu: "ayni is hem seritte hem canda - kullanicinin kaldirdigi satirlar geri gelir",
  },
  {
    ad: "CAN ADRESI OLMAYAN EKRANA GIDIYOR",
    yon: "KALDIRAN",
    bekci: "uyari:dogrula",
    dosya: TURLER,
    bul: '  tarifePenceresi: "/ayarlar/komisyon",',
    koy: '  tarifePenceresi: "/ayarlar/tarife-yukle",',
    bozdugu: "uyari 404'e goturur",
  },
  {
    ad: "ZARARSIZ - cron yorumu degisti (harness saglamasi)",
    yon: "ZARARSIZ",
    bekci: "cron-yollari:dogrula",
    dosya: TY_ROTA,
    bul: "  /* K264: «atlandı» 200 DEĞİL 503 — cron-job.org'un yeşili «çekim koştu» demek",
    koy: "  /* K264 notu: atlandi -> 503.",
    bozdugu: "hicbir sey - YESIL kalmali",
  },
  {
    ad: "TY ROTASI ATLANDI'DA YINE 200 DONUYOR",
    yon: "KALDIRAN",
    bekci: "cron-yollari:dogrula",
    dosya: TY_ROTA,
    bul: '  return NextResponse.json(ozet, { status: "atlandi" in ozet ? 503 : 200 });',
    koy: "  return NextResponse.json(ozet);",
    bozdugu: "kimlik/hesap arizasinda zamanlayici YESIL gorur - 24.09 N11 vakasi TY'de",
  },
  {
    ad: "TY HAKEDIS ROTASI DUSEN SAYMIYOR",
    yon: "KALDIRAN",
    bekci: "cron-yollari:dogrula",
    dosya: TY_HAKEDIS,
    bul: "  return NextResponse.json({ hakedis, kargo, dusen }, { status: dusen > 0 ? 503 : 200 });",
    koy: "  return NextResponse.json({ hakedis, kargo, dusen });",
    bozdugu: "iki isten biri atlansa bile 200 - kacan hakedis cekimi gorunmez",
  },
  {
    ad: "N11 ROTASI 503 DALINI KAYBETTI",
    yon: "KALDIRAN",
    bekci: "ice-aktarma:dogrula",
    dosya: N11_ROTA,
    bul: '  return NextResponse.json(ozet, { status: "atlandi" in ozet ? 503 : 200 });',
    koy: "  return NextResponse.json(ozet);",
    bozdugu: "bos cekim dali yazilsa bile kimlik/hesap arizasi 200 doner",
  },
];

/** Bekçi GERÇEKTEN koştu mu — sonuç satırı yoksa çöktü (ısırdı sayılmaz). */
function bekciyiKostur(bekci: string): { kod: number; calisti: boolean; kuyruk: string } {
  const r = spawnSync(`npm run -s ${bekci}`, { shell: true, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  const calisti = /KONTROL|GEÇTİ|BAŞARISIZ|ölçüt geçti/.test(cikti);
  return { kod: r.status ?? 1, calisti, kuyruk: cikti.trim().slice(-220) };
}

console.log("");
console.log("UYARI CANI + CRON ROTALARI - MUTASYON TURU (K269)");
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
    bozuk.push(`${m.ad}\n       desen ${m.dosya} icinde ${adet} kez geciyor (1 olmali) - OLCULEMEDI`);
    continue;
  }
  const mutant = asil.replace(bul, koy);
  let sonuc: { kod: number; calisti: boolean; kuyruk: string };
  try {
    dayanikliYaz(m.dosya, mutant);
    if (readFileSync(m.dosya, "utf8") !== mutant || mutant === asil) {
      bozuk.push(`${m.ad}\n       mutasyon diske UYGULANMADI`);
      continue;
    }
    sonuc = bekciyiKostur(m.bekci);
  } finally {
    /* git checkout DEGIL: dosya commit edilmemis olabilir. */
    dayanikliYaz(m.dosya, asil);
    if (readFileSync(m.dosya, "utf8") !== asil) {
      bozuk.push(`${m.ad}\n       GERI ALMA BASARISIZ - dosya mutasyonlu kaldi`);
    }
  }
  const isaret = m.yon === "ZARARSIZ" ? "o" : m.yon === "KALDIRAN" ? "-" : "+";
  if (!sonuc.calisti) {
    bozuk.push(`${m.ad}\n       bekci COKTU (${m.bekci}) - olcum gecersiz: ${sonuc.kuyruk}`);
    continue;
  }
  if (m.yon === "ZARARSIZ") {
    if (sonuc.kod === 0) {
      yakalanan++;
      console.log(`  OK  ${isaret} ${m.ad}`);
    } else {
      kacan.push(`${m.ad}\n       YALANCI KIRMIZI: zararsiz degisiklik ${m.bekci}'yi kirmizi yakti`);
    }
    continue;
  }
  if (sonuc.kod !== 0) {
    yakalanan++;
    console.log(`  OK  ${isaret} ${m.ad}`);
  } else {
    kacan.push(`${m.ad}\n       KORUMASIZ (${m.bekci}): ${m.bozdugu}`);
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
  console.log("\n  OK  Uyari cani ve cron rotalari UC YONDEN sinandi, kirmizi yandigi GORULDU.\n");
}
