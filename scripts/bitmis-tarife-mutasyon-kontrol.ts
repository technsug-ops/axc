import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  BİTMİŞ TARİFE/TEKLİF PENCERESİ — MUTASYON HARNESS'İ (K368, 02.11.2026)
 * ----------------------------------------------------------------------------
 *      npm run bitmis-tarife-mutasyon:kontrol
 *
 *  ⚠ KAPSAM BEYAN EDİLİYOR: bu harness üç bekçinin ölçütlerinin TAMAMINI
 *  değil, yalnız **K368 kapısını** sınıyor — vadesi dolmuş bir tarife/teklif
 *  penceresinin dilimlerinin oran kaynağı OLMAMASI, bunun BEYAN EDİLMESİ ve
 *  beyanın EKRANA ULAŞMASI. Gerisi ayrı bir iştir ve bugün açılmadı.
 *
 *  ⛔ NİYE BU: kullanıcı 02.11.2026'da bildirdi — LEGO 76334'te «Fiyatla»
 *  penceresi komisyonu %9,1 hesaplıyor, Hepsiburada'da oran %18. Ölçüldü
 *  (`scripts/canli-hb-komisyon-olcum.ts`): defterdeki dilimler kanalın
 *  **21–25 Ekim** teklifinden geliyordu (≥2.849,01 → %18 · 2.706,01–2.849 →
 *  %14,1 · 2.564,01–2.706 → %11,3 · ≤2.564 → %9,1) ve 2 Kasım'da Buybox
 *  fiyatı 2.184,99 en alt dilime düşüyordu. Kullanıcı teyidi: _«teklifler
 *  çarşambadan çarşambaya yenileniyor, bu haftaki tekliflerde 9,1 yok.»_
 *
 *  ⚠ VE HATA SESSİZDİ: komisyon farkı tek başına ~₺233 (KDV dahil), yani
 *  ekranda görünen kârın neredeyse tamamı — ama hiçbir uyarı yoktu. Aynı
 *  zemin OTOMATİK fiyatlamayı da besliyor (`buybox-otomatik.ts`), yani
 *  «en az marj %14» kuralı yanlış oranın üstünde çalışıyordu. Tam da
 *  mutasyonsuz bir bekçinin körleşeceği yer: ekran çalışır, yalnız rakam
 *  sessizce yanlış olur.
 *
 *  Üç kapı (öteki harness'lerle aynı gövde):
 *    ① desen kaynakta TAM BİR KEZ geçmeli — yoksa «ÖLÇÜLEMEDİ», «geçti» değil
 *    ② mutasyon diskten okunarak UYGULANDIĞI doğrulanır
 *    ③ hüküm ÇIKIŞ KODUNDAN — bekçinin başlığı basılmadıysa «ÇÖKTÜ»
 *
 *  ⚠ VE ÜÇ YÖN BİRDEN: ZARARSIZ bir mutasyon YEŞİL vermeli (yoksa hiçbir şeyi
 *  koşmayan bir harness «mükemmel» görünür), KALDIRAN ve FAZLADAN kırmızı.
 *  _(Anayasa: "her harness iki yönde sağlama ister, teslimden önce".)_
 *
 *  ⚠ MUTASYON BAŞINA BEKÇİ AYRI: kural üç katmanda yaşıyor (saf eşleşme ·
 *  motor beyanı · ekran çizimi) ve her katmanın kendi bekçisi var. Tek bir
 *  bekçi koşturan bir harness, öteki iki katmanın mutasyonlarını «kaçtı»
 *  diye raporlardı — ölçüm geçersiz olurdu.
 *
 *  ⚠ ÇAPALARDA TERS BÖLÜ YOK — BİLEREK: bu depoda betikle yazılan desenlerde
 *  çift ters bölü teke iniyor ve kelime sınırı BACKSPACE karakterine dönüyor;
 *  desen hiçbir şeyle eşleşmez ve ölçüt HER KOŞUMDA YEŞİL yanar. Çapalar düz
 *  dize; ters tırnak gereken yerde `String.fromCharCode(96)`.
 *  _(Anayasa: "görünmez karakter, bekçiyi sessizce işlevsiz yapar".)_
 * ============================================================================
 */

const ESLESME = "src/lib/komisyon/tarife-eslesme.ts";
const MOTOR = "src/lib/fiyatlama/simulasyon.ts";
const PENCERE = "src/app/rapor/buybox/fiyat-penceresi.tsx";

const TARIFE_BEKCISI = "scripts/tarife-dogrula.ts";
const MOTOR_BEKCISI = "scripts/simulasyon-dogrula.ts";
const PENCERE_BEKCISI = "scripts/buybox-fiyat-dogrula.ts";

/** Bekçinin GERÇEKTEN koştuğunu gösteren açılış satırları (çökme ≠ yakalama). */
const BASLIK: Record<string, string> = {
  [TARIFE_BEKCISI]: "KOMİSYON TARİFESİ — DOĞRULAMA",
  [MOTOR_BEKCISI]: "1) DIŞ KAYNAK KIYASI",
  [PENCERE_BEKCISI]: "maliyet — rafta duran partilerin EN DÜŞÜĞÜ",
};

const SATIR = String.fromCharCode(10);

type Mutasyon = {
  ad: string;
  yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN";
  dosya: string;
  bekci: string;
  bul: string;
  koy: string;
  bozdugu: string;
};

const MUTASYONLAR: Mutasyon[] = [
  {
    /**
     * ⚠ BU SENARYO HARNESS'İ SINIYOR, KODU DEĞİL. Yalnız gerçek bozmalar
     * denenirse hiçbir şeyi koşmayan bir harness kusursuz görünür — 21.09'da
     * tam bu oldu ve beş sonuç geçersizdi (yalancı kırmızı).
     */
    ad: "ZARARSIZ — yalnizca yorum degisti",
    yon: "ZARARSIZ",
    dosya: ESLESME,
    bekci: TARIFE_BEKCISI,
    bul: " * ⛔ KAPSAMAYAN ADAY KALEM VERMEZ (K368, 02.11.2026) — VE BU, ÇEVRİLMİŞ BİR",
    koy: " * ⛔ KAPSAMAYAN ADAY KALEM VERMEZ (K368, 02.11.2026) — CEVRILMIS BIR",
    bozdugu: "hicbir sey — harness'in kendi sagalamasi",
  },
  {
    ad: "BITMIS PENCERE YINE DILIM VERIYOR (kendi tarihi OLMAYAN kalem · TY/eski)",
    yon: "KALDIRAN",
    dosya: ESLESME,
    bekci: TARIFE_BEKCISI,
    bul: "      kalemler: kapsiyor ? [...kalemler] : [],",
    koy: "      kalemler: [...kalemler],",
    bozdugu:
      "vadesi dolmus haftalik tarifenin indirimli dilimi yine oran kaynagi olur; LEGO vakasinin ta kendisi",
  },
  {
    ad: "BITMIS TEKLIF YINE DILIM VERIYOR (kendi tarihi OLAN kalem · HB/N11)",
    yon: "KALDIRAN",
    dosya: ESLESME,
    bekci: TARIFE_BEKCISI,
    bul: "    : { kapsiyor: false, kalemler: [], bitis: enGec(kendi) };",
    koy: "    : { kapsiyor: false, kalemler: [...kalemler], bitis: enGec(kendi) };",
    bozdugu:
      "urun basina tarihli teklifte (28.10 sonrasi yuklemeler) bitmis teklif yine komisyon belirler",
  },
  {
    ad: "KAPSAYAN aday da kalem VERMIYOR (kural kapsamin disina tasti)",
    yon: "FAZLADAN",
    dosya: ESLESME,
    bekci: TARIFE_BEKCISI,
    bul: "      kalemler: kapsiyor ? [...kalemler] : [],",
    koy: "      kalemler: [],",
    bozdugu:
      "gecerli tarifenin dilimleri de dusurdu; «bir dilim asagi insem» denemesi butun urunlerde olur",
  },
  {
    ad: "MOTOR bitmis pencereyi SOYLEMIYOR (beyan dustu)",
    yon: "KALDIRAN",
    dosya: MOTOR,
    bekci: MOTOR_BEKCISI,
    /**
     * ⚠ ÇAPA TEK DÜZ DİZE — BİRLEŞTİRİLMİŞ İFADE DEĞİL. İlk yazımda çok
     * satırlı çapa `+ SATIR +` ile kuruluyordu; `mutasyon-capa:dogrula`
     * (AST ile okuyor) onu ÇÖZEMEDİ ve «ÖLÇÜLEMEDİ» dedi — doğru davranış,
     * çünkü çözülemeyen bir çapa yarın sessizce kayabilir.
     */
    bul: '      beyanlar.push({ tur: "PENCERE_BITTI", bitis: girdi.pencereBitis });',
    koy: "      /* K368 mutasyonu: beyan dustu */",
    bozdugu:
      "oran dogru hesaplanir ama NIYE dilim kullanilmadigi hic yazilmaz — eski sessizligin tekrari",
  },
  {
    ad: "MOTOR her dilimsiz urune «pencere bitti» diyor (yanlis yanma)",
    yon: "FAZLADAN",
    dosya: MOTOR,
    bekci: MOTOR_BEKCISI,
    bul: '      beyanlar.push({ tur: "DILIM_YOK" });',
    koy:
      '      beyanlar.push({ tur: "PENCERE_BITTI", bitis: girdi.pencereBitis ?? girdi.bugun });',
    bozdugu:
      "tarifesi HIC olmayan urun de «penceresi bitti» der; kullanici olmayan bir tarifeyi yenilemeye calisir",
  },
  {
    ad: "PENCERE beyanlari CIZMIYOR (metin bosa cikti)",
    yon: "KALDIRAN",
    dosya: PENCERE,
    bekci: PENCERE_BEKCISI,
    bul: "{tb(`beyan_${b.tur}`)}",
    koy: '{""}',
    bozdugu:
      "motor «pencere bitti» der, ekran susar — K368 oncesindeki durumun ta kendisi",
  },
  {
    ad: "PENCERE beyan dali OLU (kosul oldurulmus)",
    yon: "KALDIRAN",
    dosya: PENCERE,
    bekci: PENCERE_BEKCISI,
    bul:
      '{(girilen?.beyanlar ?? []).filter((b) => b.tur !== "MALIYET_YOK" && b.tur !== "FIYAT_YOK").length > 0 ? (',
    koy: "{false ? (",
    bozdugu:
      "desen dosyada kalir ama dal hic cizilmez — bu deponun en sik yalanci yesili",
  },
];

function bekciyiKostur(bekci: string): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + bekci, {
    shell: true,
    encoding: "utf8",
    maxBuffer: 40 * 1024 * 1024,
  });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BASLIK[bekci] ?? "") };
}

console.log("");
console.log("BİTMİŞ TARİFE/TEKLİF PENCERESİ — K368 MUTASYON TURU");
console.log("");

let beklendigiGibi = 0;
const kacan: string[] = [];
const bozuk: string[] = [];

for (const m of MUTASYONLAR) {
  const asil = readFileSync(m.dosya, "utf8");
  const bul = desenNormalle(asil, m.bul);
  const koy = desenNormalle(asil, m.koy);

  const adet = asil.split(bul).length - 1;
  if (adet !== 1) {
    bozuk.push(
      m.ad +
        SATIR +
        "       desen " +
        m.dosya +
        " içinde " +
        adet +
        " kez geçiyor (1 olmalı)",
    );
    continue;
  }

  const mutant = asil.replace(bul, koy);
  let sonuc: { kod: number; ciktiVar: boolean };
  try {
    dayanikliYaz(m.dosya, mutant);
    const diskten = readFileSync(m.dosya, "utf8");
    if (diskten !== mutant || mutant === asil) {
      bozuk.push(m.ad + SATIR + "       mutasyon diske UYGULANMADI");
      continue;
    }
    sonuc = bekciyiKostur(m.bekci);
  } finally {
    /**
     * ⚠ GERİ ALMA DA BİR YAZIMDIR — ve doğrulanır. 02.09'da iki kez bozuldu:
     * biri dosyayı MUTANT bıraktı, öteki `git checkout` ile commit edilmemiş
     * çalışmayı sildi. Burada kopya geri yazılıyor ve tuttuğu ölçülüyor.
     */
    dayanikliYaz(m.dosya, asil);
    if (readFileSync(m.dosya, "utf8") !== asil) {
      bozuk.push(m.ad + SATIR + "       GERİ ALMA TUTMADI — dosya mutant kaldı");
    }
  }

  const isaret = m.yon === "ZARARSIZ" ? "=" : m.yon === "KALDIRAN" ? "−" : "+";

  if (m.yon === "ZARARSIZ") {
    if (sonuc.kod === 0) {
      beklendigiGibi++;
      console.log("  ✓  " + isaret + " " + m.ad + "  (yeşil — doğru)");
    } else {
      bozuk.push(
        m.ad +
          SATIR +
          "       ZARARSIZ mutasyon KIRMIZI yandı — harness ya da bekçi kusurlu",
      );
    }
    continue;
  }

  if (sonuc.kod !== 0 && sonuc.ciktiVar) {
    beklendigiGibi++;
    console.log("  ✓  " + isaret + " " + m.ad);
  } else if (sonuc.kod !== 0) {
    bozuk.push(
      m.ad + SATIR + "       bekçi ÇÖKTÜ (başlık basılmadı) — ölçüm geçersiz",
    );
  } else {
    kacan.push(m.ad + SATIR + "       KORUMASIZ: " + m.bozdugu);
  }
}

console.log("");
if (kacan.length) {
  console.log("  KAÇAN MUTASYONLAR — bekçi bunları GÖRMEDİ:");
  console.log("");
  for (const k of kacan) console.log("  ✗  " + k);
  console.log("");
}
if (bozuk.length) {
  console.log("  HARNESS HATASI — mutasyon ölçülemedi:");
  console.log("");
  for (const b of bozuk) console.log("  ⛔ " + b);
  console.log("");
}

const toplam = MUTASYONLAR.length;
const zararsiz = MUTASYONLAR.filter((m) => m.yon === "ZARARSIZ").length;
const kaldiran = MUTASYONLAR.filter((m) => m.yon === "KALDIRAN").length;
console.log(
  "  " +
    beklendigiGibi +
    "/" +
    toplam +
    " senaryo beklendiği gibi" +
    "   (= zararsız " +
    zararsiz +
    " · − kaldıran " +
    kaldiran +
    " · + fazladan " +
    (toplam - zararsiz - kaldiran) +
    ")",
);
if (kacan.length || bozuk.length) {
  console.log("");
  console.log("  ⛔ Kaçan ya da ölçülemeyen mutasyon var — bekçi eksik.");
  console.log("");
  process.exitCode = 1;
} else {
  console.log("  ✓  K368 kapısı ÜÇ KATMANDA da sınandı ve kırmızı yandığı GÖRÜLDÜ");
  console.log("");
}
