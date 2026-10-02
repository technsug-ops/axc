import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  AKTARILAN SİPARİŞ (K314) — MUTASYON HARNESS'İ (02.10.2026)
 * ----------------------------------------------------------------------------
 *      npm run aktarilan-siparis-mutasyon:kontrol
 *
 *  Bekçi: `fifo-sinir:dogrula`. Her mutasyon iki yönden biri: davranışı
 *  KALDIRAN (aktarılan sipariş yine «stok yok» der / hareket 23.09'a yazılır)
 *  ya da FAZLADAN yapan (Excel/ilk çekim/normal sipariş de kayar → 29.08
 *  arızası geri gelir). Zararsız yorum değişikliği YEŞİL kalmalı.
 * ============================================================================
 */

const BEKCI = "scripts/fifo-sinir-dogrula.ts";
const BEKCI_BASLIGI = "FIFO SINIRI — DESEN YASAĞI";
const STOK = "src/lib/stok.ts";
const CEKIRDEK = "src/lib/onay-cekirdegi.ts";
const KUYRUK = "src/lib/onay-kuyrugu.ts";
const ONIZLEME = "src/app/satislar/actions.ts";
const DUZENLEME = "src/lib/satis-duzenleme-veri.ts";
const SATIS = "src/lib/satis.ts";

type Mutasyon = { ad: string; yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN"; dosya: string; bul: string; koy: string; bozdugu: string };

const MUTASYONLAR: Mutasyon[] = [
  { ad: "ZARARSIZ - yorum", yon: "ZARARSIZ", dosya: STOK,
    bul: "Kayıt − satış farkı bunu aşarsa aktarılmış sayılır", koy: "Fark bunu aşarsa aktarılmış sayılır",
    bozdugu: "hicbir sey - YESIL kalmali" },
  { ad: "KAYNAK KAPISI YOK", yon: "FAZLADAN", dosya: STOK,
    bul: "  if (s.importKaynak === null || !KANAL_CEKIM_KAYNAKLARI.includes(s.importKaynak)) {\n    return false;\n  }\n  if (ilkCekimAni === null) return false;",
    koy: "  if (ilkCekimAni === null) return false;",
    bozdugu: "Excel/elle girilen eski satis bugunku partiyi yer (29.08 arizasi)" },
  { ad: "ILK CEKIM GUNU KAPISI YOK", yon: "FAZLADAN", dosya: STOK,
    bul: "  if (isGunuSonu(s.createdAt).getTime() <= isGunuSonu(ilkCekimAni).getTime()) {\n    return false;\n  }",
    koy: "",
    bozdugu: "baglanti gunu toplu cekilen 438 gecmis siparis bugunku partiyi yer" },
  { ad: "ESIK YOK", yon: "FAZLADAN", dosya: STOK,
    bul: "  return s.createdAt.getTime() - s.soldAt.getTime() > AKTARIM_ESIGI_MS;",
    koy: "  return s.createdAt.getTime() > s.soldAt.getTime();",
    bozdugu: "her normal siparis aktarilan sayilir" },
  { ad: "AKTARIM HIC YOK", yon: "KALDIRAN", dosya: STOK,
    bul: "  return s.createdAt.getTime() - s.soldAt.getTime() > AKTARIM_ESIGI_MS;",
    koy: "  return false;",
    bozdugu: "aktarilan siparis yine «stok yok» der (olculen vaka)" },
  { ad: "HAREKET TARIHI SOLDAT", yon: "KALDIRAN", dosya: STOK,
    bul: "{ aktarilan, sinir: isGunuSonu(s.createdAt), hareketTarihi: s.createdAt }",
    koy: "{ aktarilan, sinir: isGunuSonu(s.createdAt), hareketTarihi: s.soldAt }",
    bozdugu: "28.09'da giren mal 23.09'da cikar; gecmis gunun stogu -1" },
  { ad: "SINIR UTC GUNU", yon: "KALDIRAN", dosya: STOK,
    bul: "  return gunSonu(gunDegeri(isTakvimGunu(an)));",
    koy: "  return gunSonu(an);",
    bozdugu: "TR gece yarisindan sonra dusen sipariste sinir bir gun erken" },
  { ad: "CEKIRDEK ESKI SINIR", yon: "KALDIRAN", dosya: CEKIRDEK,
    bul: "(await acikPartiler(tx, k.variantId, stokZamani.sinir));",
    koy: "(await acikPartiler(tx, k.variantId, gunSonu(satis.soldAt)));",
    bozdugu: "onay aktarilan siparise yine «stok yok» der" },
  { ad: "CEKIRDEK SINIR GUN BASI", yon: "KALDIRAN", dosya: CEKIRDEK,
    bul: "(await acikPartiler(tx, k.variantId, stokZamani.sinir));",
    koy: "(await acikPartiler(tx, k.variantId, satis.soldAt));",
    bozdugu: "ayni gun alinan mal disarida kalir (%48,72)" },
  { ad: "CEKIRDEK HAREKET SOLDAT", yon: "KALDIRAN", dosya: CEKIRDEK,
    bul: "          occurredAt: stokZamani.hareketTarihi,",
    koy: "          occurredAt: satis.soldAt,",
    bozdugu: "stok cikisi 23.09'a yazilir" },
  { ad: "CEKIRDEK SAYIM SOLDAT", yon: "KALDIRAN", dosya: CEKIRDEK,
    bul: "      hareketIsTarihi: stokZamani.hareketTarihi,",
    koy: "      hareketIsTarihi: satis.soldAt,",
    bozdugu: "sayim korumasi yanlis gune bakar" },
  { ad: "KUYRUK ESKI SINIR", yon: "KALDIRAN", dosya: KUYRUK,
    bul: "  const { sinir } = await satisStokZamani(db, satis);",
    koy: "  const sinir = gunSonu(satis.soldAt);",
    bozdugu: "otomatik onay ile elle onay ayrisir" },
  { ad: "ONIZLEME ESKI SINIR", yon: "KALDIRAN", dosya: ONIZLEME,
    bul: "(await acikPartiler(prisma, k.variantId, sinir));",
    koy: "(await acikPartiler(prisma, k.variantId, gunSonu(satis.soldAt)));",
    bozdugu: "onay diyalogu «0/1» der, yazim gecerdi" },
  { ad: "DUZENLEME ESKI SINIR", yon: "KALDIRAN", dosya: DUZENLEME,
    bul: "      sinir,\n    );\n    stokPlani = adetPlani(",
    koy: "      gunSonu(once!.soldAt),\n    );\n    stokPlani = adetPlani(",
    bozdugu: "aktarilan sipariste adet artisi stok bulamaz" },
  { ad: "YENI SATIS BEYANI YOK", yon: "KALDIRAN", dosya: SATIS,
    bul: "       * YENİ SATIŞ: kayıt şu an oluşuyor",
    koy: "       * Kayıt şu an oluşuyor",
    bozdugu: "beyansiz ciplak gunSonu(soldAt) desen yasagindan kacar" },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, { shell: true, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("\nAKTARILAN SİPARİŞ (K314) — MUTASYON TURU\n");

let dogru = 0;
const yanlis: string[] = [];
const bozuk: string[] = [];

for (const m of MUTASYONLAR) {
  const asil = readFileSync(m.dosya, "utf8");
  const bul = desenNormalle(asil, m.bul);
  const koy = desenNormalle(asil, m.koy);
  const adet = asil.split(bul).length - 1;
  if (adet !== 1) {
    bozuk.push(`${m.ad}\n       desen ${adet} kez geçiyor (1 olmalı) — ${m.dosya}`);
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
    dayanikliYaz(m.dosya, asil);
  }
  const isaret = m.yon === "KALDIRAN" ? "-" : m.yon === "FAZLADAN" ? "+" : "o";
  if (!sonuc.ciktiVar) {
    bozuk.push(`${m.ad}\n       bekçi ÇÖKTÜ (başlık basılmadı) — ölçüm geçersiz`);
  } else if ((m.yon === "ZARARSIZ") === (sonuc.kod === 0)) {
    dogru++;
    console.log(`  OK  ${isaret} ${m.ad}`);
  } else {
    yanlis.push(m.yon === "ZARARSIZ" ? `${m.ad}\n       zararsız mutasyon KIRMIZI yandı — bekçi yalancı kırmızı üretiyor` : `${m.ad}\n       KORUMASIZ: ${m.bozdugu}`);
  }
}

console.log("");
for (const k of yanlis) console.log("  X  " + k);
for (const b of bozuk) console.log("  !! " + b);
console.log(`\n  ${dogru}/${MUTASYONLAR.length} mutasyon beklendiği gibi davrandı`);
if (yanlis.length || bozuk.length) {
  console.log("\n  Beklenmeyen ya da ölçülemeyen mutasyon var — bekçi eksik.\n");
  process.exitCode = 1;
} else {
  console.log("  OK  Aktarılan sipariş İKİ YÖNDEN sınandı, zararsız yeşil kaldı\n");
}
