import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  VARSAYILAN DÖNEM ADRESE YAZILMAZ — MUTASYON HARNESS'İ (K367, 02.11.2026)
 * ----------------------------------------------------------------------------
 *      npm run donem-varsayilani-mutasyon:kontrol
 *
 *  ⚠ KAPSAM BEYAN EDİLİYOR: bu harness `suzgec:dogrula`nın ölçütlerinin
 *  TAMAMINI değil, yalnız **K367 kapısını** sınıyor — varsayılan dönemin
 *  adrese yazılmaması. Gerisi ayrı bir iştir ve bugün açılmadı.
 *
 *  ⛔ NİYE BU: kullanıcı 02.11.2026'da bildirdi — telefonda panel «Bu ay»
 *  açılıyor, oysa `PANEL_VARSAYILAN_PENCERE` 21.08.2026'dan beri «BUGUN».
 *  Ölçüldü: kodda `/` adresine `pencere=BU_AY` YAZAN hiçbir yol yok
 *  (yönlendirme · ara katman · çerez · menü bağlantısı · servis çalışanı ·
 *  liste hafızası). Kusur şuydu: sabit dönemli ekranda o parametreyi
 *  KALDIRACAK yol da yoktu — rozet çizilmiyor, «Temizle» dönemi ellemiyor.
 *  Bir kez yazılan dönem adreste kalıyor ve telefon uygulamayı kaldığı
 *  adresten açınca o dönem VARSAYILAN GİBİ görünüyordu.
 *
 *  Tam da mutasyonsuz bir bekçinin körleşeceği yer: ekran çalışmaya devam
 *  eder, yalnız açılış dönemi sessizce başka bir şey olur.
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
 *  ⚠ ÇAPALARDA TERS BÖLÜ YOK — BİLEREK: bu kalemin ölçütleri ilk yazımda
 *  betikle üretildi, çift ters bölü teke indi ve desendeki kelime sınırı
 *  BACKSPACE karakterine döndü. Desen hiçbir şeyle eşleşmezdi, yani ölçüt
 *  HER KOŞUMDA YEŞİL yanardı. Çapalar düz dize; satır sonu gereken yerde
 *  `String.fromCharCode(10)`. _(Anayasa: "görünmez karakter, bekçiyi
 *  sessizce işlevsiz yapar".)_
 * ============================================================================
 */

const BEKCI = "scripts/suzgec-dogrula.ts";
/**
 * ⚠ ÇAPA BEKÇİNİN AÇILIŞ SATIRI — K367 bölümününki DEĞİL. Kapının işi
 * "bekçi gerçekten KOŞTU mu" sorusunu cevaplamak; koşum ortasında mutasyon
 * yüzünden çıkan bir çökme ZATEN kırmızıdır ve geçerli bir yakalamadır.
 * _(Aynı düzeltme `donem-mutasyon-kontrol.ts`te de yapıldı.)_
 */
const BEKCI_BASLIGI = "1) ADRES KURMA";

const KURAL = "src/lib/suzgec.ts";
const CUBUK = "src/components/suzgec-cubugu.tsx";
const PANEL = "src/app/page.tsx";

const SATIR = String.fromCharCode(10);

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
    /**
     * ⚠ BU SENARYO HARNESS'İ SINIYOR, KODU DEĞİL. Yalnız gerçek bozmalar
     * denenirse hiçbir şeyi koşmayan bir harness kusursuz görünür — 21.09'da
     * tam bu oldu ve beş sonuç geçersizdi (yalancı kırmızı).
     */
    ad: "ZARARSIZ — yalnizca yorum degisti",
    yon: "ZARARSIZ",
    dosya: KURAL,
    bul: " *  VARSAYILAN DONEM ADRESE YAZILMAZ (kullanici karari 02.11.2026, K367)",
    koy: " *  VARSAYILAN DONEM ADRESE YAZILMAZ (kullanici karari 02.11.2026 - K367)",
    bozdugu: "(zararsiz olmali — kirmizi yanarsa harness kusurlu)",
  },
  {
    ad: "VARSAYILAN ARTIK SILINMIYOR — hep adrese yaziliyor",
    yon: "KALDIRAN",
    dosya: KURAL,
    bul: "  const varsayilanMi = secilen === varsayilan;",
    koy: "  const varsayilanMi = false;",
    bozdugu:
      "«Bugun»e basmak adresi `/?pencere=BUGUN` yapar; sabit donemli ekranda o parametre bir daha SILINEMEZ ve telefon kaldigi adresten acinca donem orada kalir",
  },
  {
    ad: "DONEM HER ZAMAN SILINIYOR (yanlis yanma)",
    yon: "FAZLADAN",
    dosya: KURAL,
    bul: "  const varsayilanMi = secilen === varsayilan;",
    koy: "  const varsayilanMi = true;",
    bozdugu:
      "hangi donem secilse adres bos kalir — kullanici «Bu ay»a basar, ekran varsayilani gosterir ve HICBIR hata cikmaz",
  },
  {
    ad: "PANEL varsayilani cubuga GECIRMIYOR",
    yon: "KALDIRAN",
    dosya: PANEL,
    bul: "          varsayilanPencere={PANEL_VARSAYILAN_PENCERE}",
    koy: "",
    bozdugu:
      "saf kural dogru calisir ama panele BAGLANMAZ; adres yine temizlenemez — «dogru davranisin gorunmezligi de yalanci yesildir»",
  },
  {
    /**
     * ⚠ ÇAPA EN DERİN GİRİNTİLİ ÇAĞRI — VE SEBEBİ ÖLÇÜLDÜ. Üç düğmenin
     * çağrısı aynı metin, yalnız girintileri farklı (16 · 18 · 20 boşluk) ve
     * KISA girintili çapa UZUN olanın içinde alt dize olarak geçiyor:
     *     16 boşluk -> 3 kez · 18 boşluk -> 2 kez · 20 boşluk -> 1 kez
     * Yani yalnız masaüstü düğmesinin (20 boşluk) çapası tekildir.
     * _(Anayasa: "önce deseni say".)_
     *
     * ⚠ VE ÇAPA TEK SATIRLIK DÜZ DİZE: ilk yazımda kapanış satırını da
     * taşıyordu (`+ String.fromCharCode(10) +`) ve `mutasyon-capa:dogrula`
     * KIRMIZI yandı — çapayı AST'den çözemedi ve «ÖLÇÜLEMEDİ» dedi, «temiz»
     * demedi. Bekçi doğru davrandı; düzeltilen çapa oldu.
     */
    ad: "BIR DUGME CIPLAK KOSULA GERI DONDU (desen yasagi)",
    yon: "FAZLADAN",
    dosya: CUBUK,
    bul: "                    git(donemDegisikligi(p, varsayilanPencere));",
    koy: '                    git({ pencere: p, baslangic: "", bitis: "" });',
    bozdugu:
      "telefon cipleri varsayilani sormaz; dosya listesi tutan bir olcut yarin eklenen DORDUNCU dugmeyi de kacirirdi",
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
console.log("VARSAYILAN DÖNEM ADRESE YAZILMAZ — K367 MUTASYON TURU");
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
    sonuc = bekciyiKostur();
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
  console.log("  ✓  K367 kapısı ÜÇ YÖNDEN de sınandı ve kırmızı yandığı GÖRÜLDÜ");
  console.log("");
}
