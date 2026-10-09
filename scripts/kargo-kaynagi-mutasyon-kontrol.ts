import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  KARGO KAYNAK SIRASI — MUTASYON HARNESS'İ (K201)
 * ----------------------------------------------------------------------------
 *      npm run kargo-kaynagi-mutasyon:kontrol
 *
 *  ⛔ KORUDUĞU ŞEY: bir sıranın TERSİNE dönmesi. Sıra bozulduğunda hiçbir
 *  şey hata vermez — NET yine bir rakam basar, yalnız yanlış kaynaktan.
 *  En pahalı hâli: tahmin, kanalın FİİLEN kestiği tutarı ezer ve defter
 *  kendi hesabını gerçeğe tercih eder.
 * ============================================================================
 */

const BEKCI = "scripts/kargo-kaynagi-dogrula.ts";
const BEKCI_BASLIGI = "KARGO KAYNAK SIRASI BEKÇİSİ";
const GOVDE = "src/lib/kargo-kaynagi.ts";
const N11 = "scripts/canli-n11-ice-aktar.ts";
/** K243: desi ve kanal firmasi EKRANDA gorunmuyordu (veri defterde vardi). */
const SATIS_DETAY = "src/app/satislar/[id]/page.tsx";
/** K326-② (09.10.2026): kâr tazelemenin desisi — `kar:dogrula` sınar. */
const KAR_YENIDEN = "src/lib/kar-yeniden.ts";
const KAR_BEKCI = { yol: "scripts/kar-dogrula.ts", baslik: "BİRİM TESTLERİ — oran birimi" };

type Mutasyon = {
  ad: string;
  /** ZARARSIZ (K326-②'de eklendi): harness'in iki yön sağlaması — YEŞİL kalmalı. */
  yon: "KALDIRAN" | "FAZLADAN" | "ZARARSIZ";
  /** Verilmezse kargo kaynağı bekçisi koşar. */
  bekci?: { yol: string; baslik: string };
  dosya: string;
  bul: string;
  koy: string;
  bozdugu: string;
};

const MUTASYONLAR: Mutasyon[] = [
  {
    ad: "TUTAR SIRASI TERSİNE DÖNDÜ — tahmin gerçeği eziyor",
    yon: "FAZLADAN",
    dosya: GOVDE,
    bul: "  if (satis.cargoAmount !== null) {",
    koy: "  if (satis.cargoAmount !== null && satis.tahminiKargo === null) {",
    bozdugu:
      "kanalin FIILEN kestigi tutar dururken defter KENDI tahminini kullanir",
  },
  {
    ad: "SIFIR TUTAR 'YOK' SAYILIYOR",
    yon: "KALDIRAN",
    dosya: GOVDE,
    bul: "  if (satis.cargoAmount !== null) {",
    koy: "  if (satis.cargoAmount !== null && satis.cargoAmount > 0) {",
    bozdugu:
      "kargosu BEDAVA olan gonderi 'bilinmiyor'a duser ve tahmine kayar — olculmus sifir kaybolur",
  },
  {
    ad: "ÜRÜNE-ÖZEL BASAMAK KALKTI — hepsi küresele düşüyor",
    yon: "KALDIRAN",
    dosya: GOVDE,
    bul: "  if (satis.cargoDesi !== null && satis.cargoDesi > 0) {",
    koy: "  if (false) {",
    bozdugu:
      "urun ayrimi kaybolur; 1 desilik de 19 desilik de ayni kuresel sayiyla hesaplanir",
  },
  {
    /**
     * ⛔ EN SESSİZ BOZULMA: sabit kayar, hiçbir davranış testi görmez.
     * Yalnız "ölçülen ortanca" ölçütü yakalar — ve o ölçüt olmasaydı
     * metodoloji kararı sessizce çevrilebilirdi.
     */
    ad: "KÜRESEL SAYI ORTALAMAYA DÖNDÜ (3 → 4)",
    yon: "FAZLADAN",
    dosya: GOVDE,
    bul: "export const KURESEL_DESI_ORTANCASI = 3;",
    koy: "export const KURESEL_DESI_ORTANCASI = 4;",
    bozdugu:
      "kuyruklu dagilimin ortalamasi kullanilir; tek 19 desilik gonderi her tahmini sisirir",
  },
  {
    ad: "TAHMİNİ ETİKETİ DÜŞTÜ — tahmin gerçek gibi görünür",
    yon: "KALDIRAN",
    dosya: GOVDE,
    bul: '  return s.kaynak === "TAHMINI";',
    koy: "  return false;",
    bozdugu:
      "tahmini rakam ekranda etiketsiz cikar; sistem bilmedigi seyi biliyormus gibi sunar",
  },
  {
    ad: "N11 TAHMİN YAZMAYI BIRAKTI (taban düşer)",
    yon: "KALDIRAN",
    dosya: N11,
    bul: '        (veri as { tahminiKargo?: number }).tahminiKargo = hesap.tutar;',
    koy: "        void hesap;",
    bozdugu:
      "N11 satislari kargoyu HIC gormez ve NET oldugundan YUKSEK cikar — sessizce",
  },
  {
    /**
     * ⛔ HALİL'İN ŞARTI: tahmin `cargoAmount`a DOKUNMAZ. Dokunan bir
     * mutasyon kırmızı yanmadıkça bu bir beyandır, koruma değil.
     */
    ad: "N11 DEFTERDEKİ KARGO TUTARINA DOKUNUYOR",
    yon: "FAZLADAN",
    dosya: N11,
    bul: '        (veri as { tahminiKargo?: number }).tahminiKargo = hesap.tutar;',
    koy:
      '        (veri as { tahminiKargo?: number }).tahminiKargo = hesap.tutar;\n' +
      "        (veri as { cargoAmount?: number }).cargoAmount = hesap.tutar;",
    bozdugu:
      "ice aktarma GERCEKLESEN kesinti alanini yazmaya baslar; tahmin gercegi ezer",
  },
  {
    /* K243, 23.09.2026 - kullanici ekran goruntusu: HB siparisi
       4328856038 detayinda 'Kargo firmasi secilmedi' yaziyor ve desi
       HIC gorunmuyordu. Olcum: kanalKargoDesi=5, kanalKargoFirmasi=hepsiJET.
       Veri defterde VARDI - kusur gosterimdeydi. */
    ad: "DESI YINE FIRMA SECIMINE BAGLANDI",
    yon: "KALDIRAN",
    dosya: SATIS_DETAY,
    bul: "    ...(desiGosterim.kaynak === \"KURESEL\"",
    koy: "    ...(satis.cargoCarrier === null || desiGosterim.kaynak === \"KURESEL\"",
    bozdugu:
      "firma secili degilse desi yine kaybolur - kullanicinin bildirdigi arizanin ta kendisi",
  },
  {
    ad: "KANALIN FIRMASI EKRANDAN KALKTI",
    yon: "KALDIRAN",
    dosya: SATIS_DETAY,
    bul: "            etiket: t(\"kanalKargoFirmasiEtiketi\"),",
    koy: "            etiket: t(\"kargoFirmasi\"),",
    bozdugu:
      "bizim secimimiz ile kanalin firmasi ayni etikete duser; ikisi ayristiginda fark GORUNMEZ olur",
  },
  {
    ad: "BOS FIRMA DA SATIR ACIYOR",
    yon: "FAZLADAN",
    dosya: SATIS_DETAY,
    bul: "    ...(satis.kanalKargoFirmasi === null || satis.kanalKargoFirmasi === \"\"",
    koy: "    ...(false",
    bozdugu:
      "kanal bir sey soylemedigi halde bos satir cizilir; okuyan bizim bakmadigimizi saniyor",
  },
  /* K307, 29.09.2026 - satis 11653860726: Kargo -106,75 dusulmus dururken
     "Kargo girilmedi - dusulmeden hesaplandi" yaziyordu. */
  {
    ad: "K307 ESKI OLCUT GERI GELDI - tahmin varken 'dusulmedi' diyor",
    yon: "FAZLADAN",
    dosya: GOVDE,
    bul: '  if (!siparisKesintileri.some((k) => k.code === "KARGO")) return "DUSULMEDI";',
    koy: '  if (cargoAmount === null) return "DUSULMEDI";',
    bozdugu:
      "kargo NET'ten dusulmus dururken ekran 'dusulmeden hesaplandi' der - kullanicinin bildirdigi ariza",
  },
  {
    ad: "K307 TAHMINI AYRIMI KALKTI - tahmin gerceklesen gibi gorunur",
    yon: "KALDIRAN",
    dosya: GOVDE,
    bul: '  return cargoAmount === null ? "TAHMINI" : "GERCEKLESEN";',
    koy: '  return "GERCEKLESEN";',
    bozdugu: "tarife tahmini kanalin kestigi tutar gibi etiketsiz gorunur",
  },
  {
    ad: "K307 UYARI HIC CIKMIYOR",
    yon: "KALDIRAN",
    dosya: "src/components/kar-blogu.tsx",
    bul: '        {veri.kargoDurumu === "DUSULMEDI" ? (',
    koy: "        {false ? (",
    bozdugu: "kargo gercekten dusulmemisken kar oldugundan YUKSEK gorunur ve ekran susar",
  },
  {
    ad: "K307 KDV TABANI ETIKETI DUSTU",
    yon: "KALDIRAN",
    dosya: "src/components/kar-blogu.tsx",
    bul: '                        ({t("kargoKdvDahilEki")}',
    koy: "                        (",
    bozdugu: "kargo rakami tabansiz kalir; KDV dahil mi haric mi sorusu yeniden dogar",
  },
  /* ═══ K326-② (09.10.2026) — kayda ürün tahmini, hesaba üç basamak ═══ */
  {
    ad: "ZARARSIZ - tazelemeDesileri yorumu degisti",
    yon: "ZARARSIZ",
    dosya: GOVDE,
    bul: " *  KÂR TAZELENİRKEN İKİ AYRI DESİ — KAYDA YAZILAN ≠ HESAPTA KULLANILAN (K326-②)",
    koy: " *  KÂR TAZELENİRKEN İKİ AYRI DESİ — KAYDA YAZILAN ≠ HESAPTA KULLANILAN (K326-②) ·",
    bozdugu: "-",
  },
  {
    ad: "ZARARSIZ - satisKarTazele yorumu degisti",
    yon: "ZARARSIZ",
    dosya: KAR_YENIDEN,
    bekci: KAR_BEKCI,
    bul: "   * (`tazelemeDesileri`, saf gövde, değer testli).",
    koy: "   * (`tazelemeDesileri`, saf gövde, değer testli) ·",
    bozdugu: "-",
  },
  {
    ad: "K326 KAYDA YINE HESAP DESISI YAZILIYOR (kuresel 3 / tartim tahmini eziyor)",
    yon: "FAZLADAN",
    dosya: GOVDE,
    bul: "  return { kayit, hesap: secim.desi, kaynak: secim.kaynak };",
    koy: "  return { kayit: secim.desi, hesap: secim.desi, kaynak: secim.kaynak };",
    bozdugu: "urun karti 2 iken kayitta 3 (kuresel) ya da 6 (tartim) yazar - Halil'in bildirdigi ariza",
  },
  {
    ad: "K326 URUN DESISI HIC KULLANILMIYOR",
    yon: "KALDIRAN",
    dosya: GOVDE,
    bul: "      : urunDesisi !== null && urunDesisi > 0",
    koy: "      : false",
    bozdugu: "tahmini olmayan yeni siparis kuresel ortancaya duser; urun karti hic okunmaz",
  },
  {
    ad: "K326 KART KAYITTAKI TAHMINI EZIYOR",
    yon: "FAZLADAN",
    dosya: GOVDE,
    bul: "    satis.cargoDesi !== null && satis.cargoDesi > 0\n      ? satis.cargoDesi",
    koy: "    urunDesisi !== null && urunDesisi > 0\n      ? urunDesisi",
    bozdugu: "kullanicinin ekranda girdigi desi her kar tazelemesinde urun kartiyla ezilir",
  },
  {
    ad: "K326 HESAP TARTIMI ATLIYOR (hesap = kayit)",
    yon: "KALDIRAN",
    dosya: GOVDE,
    bul: "  const secim = desiSecimi({ kanalKargoDesi: satis.kanalKargoDesi, cargoDesi: kayit });",
    koy: "  const secim = desiSecimi({ kanalKargoDesi: null, cargoDesi: kayit });",
    bozdugu: "kanal gercek desiyi bildirdigi halde NET urun tahminiyle hesaplanir",
  },
  {
    ad: "K326 satisKarTazele KAYDA HESAP DESISINI YAZIYOR",
    yon: "FAZLADAN",
    dosya: KAR_YENIDEN,
    bekci: KAR_BEKCI,
    bul: "    cargoDesi: desi.kayit,",
    koy: "    cargoDesi: desi.hesap,",
    bozdugu: "tartim ya da kuresel ortanca yine urun tahmini alanina yazilir",
  },
  {
    ad: "K326 satisKarTazele URUN KARTINI OKUMUYOR",
    yon: "KALDIRAN",
    dosya: KAR_YENIDEN,
    bekci: KAR_BEKCI,
    bul: "    urunDesisiToplami(\n      satis.items.map((k) => ({",
    koy: "    ((_x: unknown) => null)(\n      satis.items.map((k) => ({",
    bozdugu: "yeni sipariste urun karti okunmaz, kayit bos kalir, hesap kuresele duser",
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
console.log("KARGO KAYNAK SIRASI — MUTASYON TURU");
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
    bozuk.push(m.ad + "\n       desen " + adet + " kez geçiyor (1 olmalı) — " + m.dosya);
    continue;
  }

  const mutant = asil.replace(bul, koy);
  let sonuc: { kod: number; ciktiVar: boolean };
  try {
    dayanikliYaz(m.dosya, mutant);
    if (readFileSync(m.dosya, "utf8") !== mutant || mutant === asil) {
      bozuk.push(m.ad + "\n       mutasyon diske UYGULANMADI");
      continue;
    }
    sonuc = bekciyiKostur(m);
  } finally {
    dayanikliYaz(m.dosya, asil);
  }

  if (m.yon === "ZARARSIZ") {
    if (sonuc.kod === 0 && sonuc.ciktiVar) {
      yakalanan++;
      console.log("  OK  = " + m.ad + " (yeşil kaldı)");
    } else {
      bozuk.push(m.ad + "\n       zararsız mutasyon KIRMIZI yandı — yalancı kırmızı");
    }
    continue;
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
const zararsiz = MUTASYONLAR.filter((m) => m.yon === "ZARARSIZ").length;
console.log(
  "  " +
    yakalanan +
    "/" +
    toplam +
    " mutasyon yakalandı   (- kaldıran " +
    kaldiran +
    " · + fazladan " +
    (toplam - kaldiran - zararsiz) +
    " · = zararsız " +
    zararsiz +
    ")",
);
if (kacan.length || bozuk.length) {
  console.log("\n  Kaçan ya da ölçülemeyen mutasyon var — bekçi eksik.\n");
  process.exitCode = 1;
} else {
  console.log("  OK  kaynak sıraları İKİ YÖNDEN de sınandı ve kırmızı yandığı GÖRÜLDÜ\n");
}
