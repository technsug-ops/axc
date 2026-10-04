import { readFileSync } from "node:fs";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";
import { spawnSync } from "node:child_process";

/**
 * ============================================================================
 *  KART PARTİ PANELİ — MUTASYON HARNESS'İ (K115)
 * ----------------------------------------------------------------------------
 *      npm run kart-partileri-mutasyon:kontrol
 *
 *  ⛔ NİYE: bu gövde kartta PARA basıyor ve iki yönde de sessizce bozulabilir:
 *    − eksik toplarsa  → kullanıcı elindeki malı olduğundan AZ sanır
 *    + eksiği gizlerse → eksik bir rakam TAM görünür ve sorgulanmaz
 * ============================================================================
 */

const BEKCI = "scripts/kart-partileri-dogrula.ts";
const BEKCI_BASLIGI = "KART PARTİ PANELİ BEKÇİSİ";
const GOVDE = "src/lib/kart-partileri.ts";
const STOK = "src/app/stok/[variantId]/page.tsx";
const KART = "src/app/kart/[variantId]/page.tsx";

type Mutasyon = {
  ad: string;
  yon: "KALDIRAN" | "FAZLADAN" | "ZARARSIZ";
  /** Varsayılan GOVDE (04.10.2026: stok sayfası bağı için çok dosya). */
  dosya?: string;
  bul: string;
  koy: string;
  bozdugu: string;
};

const MUTASYONLAR: Mutasyon[] = [
  {
    ad: "ZARARSIZ — yorum değişikliği",
    yon: "ZARARSIZ",
    bul: "KART PARTİ PANELİ — SAF HESAP (K115, 31.08.2026)",
    koy: "KART PARTİ PANELİ — SAF HESAP (K115)",
    bozdugu: "hiçbir şey — YEŞİL kalmalı (harness sağlaması)",
  },
  {
    ad: "ORTALAMA BİLİNMEYEN ADEDİ PAYDAYA KATIYOR",
    yon: "FAZLADAN",
    bul: "  const olculenAdet = olculen.reduce((s, p) => s + p.kalanAdet, 0);",
    koy: "  const olculenAdet = toplam.adet;",
    bozdugu: "maliyeti bilinmeyen adet ortalamayı sahte düşürür; kalan mal ucuz görünür",
  },
  {
    ad: "TEK BİRİM LİRAYA YUVARLANIYOR (kuruş farkı yutuluyor)",
    yon: "FAZLADAN",
    bul: "Math.round(p.birimMaliyet * 100)",
    koy: "Math.round(p.birimMaliyet)",
    bozdugu: "100,00 ve 100,40'lık iki parti 'tek fiyat' sanılır",
  },
  {
    ad: "TEK BİRİM HİÇ ÇIKMIYOR",
    yon: "KALDIRAN",
    bul: "kuruslar.size === 1",
    koy: "kuruslar.size === 0",
    bozdugu: "tek partili üründe bile 'ortalama' yazar; kullanıcı kesin rakamı göremez",
  },
  {
    ad: "MALİYET BİLİNMİYORSA ORTALAMA SIFIR",
    yon: "FAZLADAN",
    bul: "    ortalama: olculenAdet > 0 ? toplam.tutar / olculenAdet : null,",
    koy: "    ortalama: olculenAdet > 0 ? toplam.tutar / olculenAdet : 0,",
    bozdugu: "'bilmiyorum' yerine '₺0' yazar (varsayılan alanın anlamından türetilir)",
  },
  {
    ad: "PARA BİRİMİ SEÇİMİNDE MALİYETSİZ PARTİ SAYILIYOR",
    yon: "FAZLADAN",
    bul: "if (p.paraBirimi && p.birimMaliyet !== null)",
    koy: "if (p.paraBirimi)",
    bozdugu: "maliyeti olmayan partiler birimi belirler, ölçülebilen tutar dışarıda kalır",
  },
  {
    ad: "STOK SAYFASI İZİN SORMUYOR (maliyet herkese)",
    yon: "FAZLADAN",
    dosya: STOK,
    bul: '  const maliyetGorur = await izinVarMi("urun.gor");',
    koy: "  const maliyetGorur = true;",
    bozdugu: "yalnız stok.gor izni olan kişi maliyeti görür",
  },
  {
    ad: "STOK SAYFASI YANLIŞ İZİN (stok.gor)",
    yon: "FAZLADAN",
    dosya: STOK,
    bul: '  const maliyetGorur = await izinVarMi("urun.gor");',
    koy: '  const maliyetGorur = await izinVarMi("stok.gor");',
    bozdugu: "kartı göremeyen kişi maliyeti görür ve bağlantı 404'e gider",
  },
  {
    ad: "BAĞLANTI ÇAPASIZ (kartın başına iner)",
    yon: "KALDIRAN",
    dosya: STOK,
    bul: "href={`/kart/${varyant.id}#${KART_PARTI_CAPASI}`}",
    koy: "href={`/kart/${varyant.id}`}",
    bozdugu: "kullanıcı partileri yine aşağıda arar",
  },
  {
    ad: "KARTTA ÇAPA YOK",
    yon: "KALDIRAN",
    dosya: KART,
    bul: " ikon={Layers} id={KART_PARTI_CAPASI}>",
    koy: " ikon={Layers}>",
    bozdugu: "bağlantının hedefi yok — sayfanın başına düşer",
  },
  {
    ad: "İZİNSİZ DAL MALİYET ÇİZİYOR",
    yon: "FAZLADAN",
    dosya: STOK,
    bul: '<CardContent className="text-3xl font-semibold">{stok}</CardContent>',
    koy: '<CardContent className="text-3xl font-semibold">{stok} {bicim.para(kalan.tutar, kalanPara)}</CardContent>',
    bozdugu: "maliyet izni olmayan kişi kalan tutarı görür",
  },
  {
    ad: "ÖLÇÜLEMEYEN PARTİ SESSİZCE ATLANIYOR — sayaç artmıyor",
    yon: "KALDIRAN",
    bul: "      olculemeyen += 1;",
    koy: "",
    bozdugu:
      "eksik bir tutar TAM gorunur; ekran 'N parti girmedi' diyemez ve kimse sorgulamaz",
  },
  {
    ad: "ADET DE ÖLÇÜLEMEYENDEN DÜŞÜYOR",
    yon: "KALDIRAN",
    bul: "    adet += p.kalanAdet;",
    koy: "",
    bozdugu:
      "elde duran mal yok sayilir; adet para birimi tasimaz, eksik gosterilmesinin sebebi yok",
  },
  {
    ad: "MALİYETİ BİLİNMEYEN PARTİ SIFIR SAYILIYOR",
    yon: "FAZLADAN",
    bul: "  return p.birimMaliyet !== null && (p.paraBirimi ?? para) === para;", /* 04.10 çapası taşındı */
    koy: "  return (p.paraBirimi ?? para) === para;",
    bozdugu:
      "null maliyet 0 gibi toplanir — 'olctum sifir cikti' ile 'bilmiyorum' karisir (anayasa: varsayilan deger alanin anlamindan turetilir)",
  },
  {
    ad: "PARA BİRİMİ SÜZGECİ KALKTI — KUR ÇEVRİLİYORMUŞ GİBİ TOPLUYOR",
    yon: "FAZLADAN",
    bul: "  return p.birimMaliyet !== null && (p.paraBirimi ?? para) === para;",
    koy: "  return p.birimMaliyet !== null;",
    bozdugu:
      "EUR ile TRY ayni kefeye girer; kur cevirisi anayasa geregi yapilmaz ama rakam yapilmis gibi cikar",
  },
  {
    ad: "BİRİMİ YAZILMAMIŞ KAYIT DIŞARI ATILIYOR",
    yon: "FAZLADAN",
    bul: "  return p.birimMaliyet !== null && (p.paraBirimi ?? para) === para;",
    koy: "  return p.birimMaliyet !== null && p.paraBirimi === para;",
    bozdugu:
      "olculebilir bir tutar sebepsiz kaybolur; bilinmeyen olan MALIYET, birim degil",
  },
  {
    ad: "TUTAR ADETLE ÇARPILMIYOR — birim fiyat toplanıyor",
    yon: "KALDIRAN",
    bul: "    tutar += p.kalanAdet * p.birimMaliyet;",
    koy: "    tutar += p.birimMaliyet;",
    bozdugu:
      "3 adet x 100 = 100 gorunur; kartta duran mal degeri buyuk oranda yanlis olur",
  },
  {
    ad: "BOŞ LİSTEDE DE SIRADAKİ ROZETİ ÇIKIYOR",
    yon: "FAZLADAN",
    bul: "  return partiSayisi > 0 ? 0 : -1;",
    koy: "  return 0;",
    bozdugu:
      "parti yokken 'siradaki' rozeti bir satira baglanmaya calisir; olmayan bir parti isaretlenir",
  },
  {
    ad: "SIRADAKİ ROZETİ HİÇ ÇIKMIYOR",
    yon: "KALDIRAN",
    bul: "  return partiSayisi > 0 ? 0 : -1;",
    koy: "  return -1;",
    bozdugu:
      "kullanici hangi partinin tuketilecegini tarihlerden TAHMIN etmek zorunda kalir",
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


console.log("");
console.log("KART PARTİ PANELİ — MUTASYON TURU");
console.log("");

let yakalanan = 0;
const kacan: string[] = [];
const bozuk: string[] = [];

for (const m of MUTASYONLAR) {
  const dosya = m.dosya ?? GOVDE;
  const asil = readFileSync(dosya, "utf8");
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
    dayanikliYaz(dosya, mutant);
    if (readFileSync(dosya, "utf8") !== mutant || mutant === asil) {
      bozuk.push(m.ad + "\n       mutasyon diske UYGULANMADI");
      continue;
    }
    sonuc = bekciyiKostur();
  } finally {
    dayanikliYaz(dosya, asil);
  }

  const isaret = m.yon === "KALDIRAN" ? "-" : m.yon === "FAZLADAN" ? "+" : "o";
  if (m.yon === "ZARARSIZ") {
    if (sonuc.kod === 0 && sonuc.ciktiVar) { yakalanan++; console.log("  OK  " + isaret + " " + m.ad); }
    else kacan.push(m.ad + "\n       zararsız mutasyon KIRMIZI yandı ya da bekçi çöktü — harness/bekçi güvenilmez");
  } else if (sonuc.kod !== 0 && sonuc.ciktiVar) {
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
  console.log("  OK  kart parti paneli İKİ YÖNDEN de sınandı ve kırmızı yandığı GÖRÜLDÜ\n");
}
