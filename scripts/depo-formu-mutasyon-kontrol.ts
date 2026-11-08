import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  DEPO FORMU — FORM SIFIRLAMA MUTASYON HARNESS'İ (K375, 08.11.2026)
 * ----------------------------------------------------------------------------
 *      npm run depo-formu-mutasyon:kontrol
 *
 *  ⛔ NİYE VAR: canlıda depo kurulumu HİÇ ÇALIŞMIYORDU ve `depo:dogrula`
 *  192 ölçütle YEŞİL yanıyordu. Saf kural katmanı kusursuzdu; kopuk olan
 *  kullanıcıya ULAŞAN yoldu — React 19 `<form action={fn}>`i gönderim anında
 *  sıfırlıyor, ikinci düğme de o boş formu okuyordu.
 *  _(Anayasa: "sınanmamış ekran, ekran değildir".)_
 *
 *  Üç kapı (öteki harness'lerle aynı gövde):
 *    ① desen kaynakta TAM BİR KEZ geçmeli
 *    ② mutasyon diskten okunarak UYGULANDIĞI doğrulanır
 *    ③ hüküm ÇIKIŞ KODUNDAN — bekçinin başlığı yoksa "ÇÖKTÜ"
 *
 *  ⛔ VE ZARARSIZ SAĞLAMA ÖNCE KOŞAR: hiçbir şeyi ölçmeyen bir harness her
 *  şeyi kırmızı yakarak "mükemmel" görünebilir (yalancı kırmızı, 21.09.2026).
 * ============================================================================
 */

const BEKCI = "scripts/depo-dogrula.ts";
const BEKCI_BASLIGI = "TARİF DOĞRULAMA";

const EKRAN = "src/app/ayarlar/depo/depo-formu.tsx";
const GOC_EKRAN = "src/app/ayarlar/depo/goc/goc-formu.tsx";
const EYLEM = "src/app/ayarlar/depo/eylemler.ts";
const GOC_EYLEM = "src/app/ayarlar/depo/goc/eylemler.ts";

type Mutasyon = {
  ad: string;
  yon: "KALDIRAN" | "FAZLADAN";
  dosya: string;
  bul: string;
  koy: string;
  bozdugu: string;
};

const MUTASYONLAR: Mutasyon[] = [
  {
    ad: "CANLI HATANIN KENDISI — form yine action={} ile gonderiliyor",
    yon: "FAZLADAN",
    dosya: EKRAN,
    bul: "      onSubmit={(e) => {\n        e.preventDefault();\n        const veri = new FormData(e.currentTarget);\n        basla(async () => setSonuc(await depoOnizle(veri)));\n      }}",
    koy: "      action={(form) => basla(async () => setSonuc(await depoOnizle(form)))}",
    bozdugu:
      "React formu SIFIRLAR; dort alan da bosalir ve ikinci adim bos veri okur — canliya giden hatanin ta kendisi",
  },
  {
    ad: "preventDefault dustu",
    yon: "KALDIRAN",
    dosya: EKRAN,
    bul: "        e.preventDefault();\n",
    koy: "",
    bozdugu:
      "tarayici formu kendi gonderir; sayfa yeniden yuklenir ve onizleme hic cizilmez",
  },
  {
    ad: "ikinci adim onizlemenin tarifini GONDERMIYOR",
    yon: "KALDIRAN",
    dosya: EKRAN,
    bul: "                basla(async () => setSonuc(await depoyuKur(onizleme.tarif)));",
    koy: '                basla(async () => setSonuc(await depoyuKur({ ad: "", kisaltma: "", uniteSayisi: 0, gozSayisi: 0 })));',
    bozdugu:
      "onaylanan sey ekranda GORULEN plan olmaktan cikar; kullanici 24 raf gorur, baska bir sey yazilir",
  },
  {
    ad: "GOC ekrani yine action={} ile gonderiliyor",
    yon: "FAZLADAN",
    dosya: GOC_EKRAN,
    bul: "      onSubmit={(e) => {\n        e.preventDefault();\n        const veri = new FormData(e.currentTarget);\n        basla(async () => setSonuc(await gocuOnizle(veri)));\n      }}",
    koy: "      action={(form) => basla(async () => setSonuc(await gocuOnizle(form)))}",
    bozdugu:
      "butun select'ler varsayilana (tasima yok) doner; ikinci adim hicbir esleme bulamaz ve hicbir raf tasinmaz",
  },
  {
    ad: "GOC ikinci adimi onizlemenin eslemelerini kullanmiyor",
    yon: "KALDIRAN",
    dosya: GOC_EKRAN,
    bul: "                basla(async () => setSonuc(await gocuUygula(onizleme.eslemeler)));",
    koy: "                basla(async () => setSonuc(await gocuUygula([])));",
    bozdugu: "gorulen plan ile uygulanan plan ayrisir",
  },
  {
    ad: "sunucu kapisi geri aciliyor — depoyuKur yine FormData aliyor",
    yon: "FAZLADAN",
    dosya: EYLEM,
    bul: "export async function depoyuKur(ham: BolumTarifi): Promise<DepoSonucu> {",
    koy: "export async function depoyuKur(ham: BolumTarifi | FormData): Promise<DepoSonucu> {",
    bozdugu:
      "ekran er ya da gec formu yeniden okumaya doner ve desen geri gelir",
  },
  {
    ad: "gocuUygula yine FormData aliyor",
    yon: "FAZLADAN",
    dosya: GOC_EYLEM,
    bul: "export async function gocuUygula(eslemeler: Esleme[]): Promise<GocSonucu> {",
    koy: "export async function gocuUygula(eslemeler: Esleme[] | FormData): Promise<GocSonucu> {",
    bozdugu: "ayni desen goc ekraninda geri doner",
  },
  {
    ad: "TABAN BOSALDI — tarama hicbir dosya bulamiyor",
    yon: "KALDIRAN",
    dosya: BEKCI,
    bul: '        else if (yol.endsWith(".tsx")) dosyalar.push(yol.split("\\\\").join("/"));',
    koy: '        else if (yol.endsWith(".YOKTUR")) dosyalar.push(yol.split("\\\\").join("/"));',
    bozdugu:
      "bos kume her kosulu saglar; desen yasagi hicbir sey olcmeden YESIL yanar (every kapisinin tarama hali)",
  },
  {
    ad: "BOLUM HIC KOSMADI — bayrak dusuruldu",
    yon: "KALDIRAN",
    dosya: BEKCI,
    bul: "    k375Kostu = true;",
    koy: "",
    bozdugu:
      "olcut blogu kosmadan ozet 'gecti' der; sonucun okundugunu kimse dogrulamaz",
  },
];

function bekciyiKostur() {
  const r = spawnSync("npx tsx " + BEKCI, {
    shell: true,
    encoding: "utf8",
    maxBuffer: 40 * 1024 * 1024,
  });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("");
console.log("DEPO FORMU — K375 MUTASYON TURU");
console.log("");

let yakalanan = 0;
const kacan: string[] = [];
const bozuk: string[] = [];

/* ── ZARARSIZ SAĞLAMA ÖNCE ───────────────────────────────────────────── */
{
  const asil = readFileSync(EKRAN, "utf8");
  let s: { kod: number; ciktiVar: boolean };
  try {
    dayanikliYaz(
      EKRAN,
      asil.replace(
        "export function DepoFormu()",
        desenNormalle(asil, "/* zararsiz */\nexport function DepoFormu()"),
      ),
    );
    s = bekciyiKostur();
  } finally {
    dayanikliYaz(EKRAN, asil);
  }
  if (s.kod === 0 && s.ciktiVar) {
    console.log("  OK  = ZARARSIZ mutasyon (yorum) YEŞİL kaldı — harness ölçüyor");
  } else {
    bozuk.push(
      "ZARARSIZ SAĞLAMA DÜŞTÜ — harness her şeyi kırmızı yakıyor, sonuçlar GEÇERSİZ",
    );
  }
}

/* ── GERÇEK MUTASYONLAR ──────────────────────────────────────────────── */
for (const m of MUTASYONLAR) {
  const asil = readFileSync(m.dosya, "utf8");
  let sonuc: { kod: number; ciktiVar: boolean } | null = null;

  try {
    const bul = desenNormalle(asil, m.bul);
    const adet = asil.split(bul).length - 1;
    if (adet !== 1) {
      bozuk.push(m.ad + "\n       çapa " + adet + " kez geçiyor (1 olmalı)");
      continue;
    }
    dayanikliYaz(m.dosya, asil.replace(bul, desenNormalle(asil, m.koy)));

    if (readFileSync(m.dosya, "utf8") === asil) {
      bozuk.push(m.ad + "\n       mutasyon diske UYGULANMADI — ölçüm geçersiz");
    } else {
      sonuc = bekciyiKostur();
    }
  } catch (e) {
    bozuk.push(m.ad + "\n       mutasyon kurulamadı: " + (e as Error).message);
  } finally {
    dayanikliYaz(m.dosya, asil);
  }

  if (!sonuc) continue;

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

/* ── GERİ ALMA DOĞRULANIR ────────────────────────────────────────────── */
{
  const son = bekciyiKostur();
  if (son.kod !== 0) {
    bozuk.push(
      "GERİ ALMA EKSİK — tur sonunda bekçi hâlâ KIRMIZI; çalışma ağacı mutasyonlu kalmış olabilir",
    );
  } else {
    console.log("  OK  = tur sonrası bekçi yeniden YEŞİL — geri alma tam");
  }
}

console.log("");
if (kacan.length) {
  console.log("  KAÇAN MUTASYONLAR — bekçi bunları GÖRMEDİ:\n");
  for (const k of kacan) console.log("  X  " + k);
  console.log("");
}
if (bozuk.length) {
  console.log("  ÖLÇÜLEMEYEN MUTASYONLAR — sonuç GEÇERSİZ:\n");
  for (const b of bozuk) console.log("  ?  " + b);
  console.log("");
}

const kaldiran = MUTASYONLAR.filter((m) => m.yon === "KALDIRAN").length;
console.log(
  "  " +
    yakalanan +
    "/" +
    MUTASYONLAR.length +
    " mutasyon yakalandı   (- kaldıran " +
    kaldiran +
    " · + fazladan " +
    (MUTASYONLAR.length - kaldiran) +
    ")",
);

if (kacan.length || bozuk.length) {
  console.log("  ⛔ TUR GEÇERSİZ — düzeltilmeden teslim edilmez.");
  process.exitCode = 1;
} else {
  console.log("  OK  K375 kapısı İKİ YÖNDEN de sınandı ve kırmızı yandığı GÖRÜLDÜ");
}
